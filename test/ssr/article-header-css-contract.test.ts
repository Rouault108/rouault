import { resolve } from 'node:path';

import postcss, { type AtRule, type Declaration, type Root, type Rule } from 'postcss';
import selectorParser from 'postcss-selector-parser';
import { describe, expect, it } from 'vitest';

import { normalizeCssDeclarationValue, readCssFile } from './support/css-contract.js';

const cssPath = resolve(process.cwd(), 'src/assets/css/article-header.css');
const { cssText } = readCssFile(cssPath);
const root = postcss.parse(cssText, { from: cssPath });

const baselineSelector = '.article-header__breadcrumbs';
const enhancementSelector =
  '.article-header__breadcrumbs:has(+ .article-header__heading)';
const enhancementSupportsParams =
  'selector(.article-header__breadcrumbs:has(+ .article-header__heading))';

interface SelectorRuleMatch {
  readonly rule: Rule;
  readonly selectors: readonly string[];
}

const normalizeWhitespace = (value: string): string => value.trim().replace(/\s+/gu, ' ');

const normalizeSelector = (selector: string): string =>
  selector
    .trim()
    .replace(/\s+/gu, ' ')
    .replace(/\s*([>+~(,)])\s*/gu, '$1');

const splitNormalizedSelectors = (selectorText: string): string[] => {
  const ast = selectorParser().astSync(selectorText);
  const selectors: string[] = [];
  ast.each((selector) => {
    selectors.push(normalizeSelector(selector.toString()));
  });
  return selectors;
};

const normalizeExactSelector = (selector: string): string => {
  const selectors = splitNormalizedSelectors(selector);
  expect(selectors).toHaveLength(1);
  return selectors[0] ?? '';
};

const collectRulesByExactSelector = (scope: Root, selector: string): SelectorRuleMatch[] => {
  const expectedSelector = normalizeExactSelector(selector);
  const matches: SelectorRuleMatch[] = [];

  scope.walkRules((rule: Rule) => {
    const selectors = splitNormalizedSelectors(rule.selector);
    if (selectors.includes(expectedSelector)) {
      matches.push({ rule, selectors });
    }
  });

  return matches;
};

const directDeclarations = (rule: Rule): Declaration[] =>
  (rule.nodes ?? []).filter((node): node is Declaration => node.type === 'decl');

const directDeclarationsForProperty = (rule: Rule, property: string): Declaration[] =>
  directDeclarations(rule).filter((declaration) => declaration.prop === property);

const isRootLevelRule = (rule: Rule): boolean => rule.parent?.type === 'root';

const isDirectChildRule = (rule: Rule, parent: AtRule): boolean => rule.parent === parent;

const collectMatchingSupports = (scope: Root, params: string): AtRule[] => {
  const expectedParams = normalizeWhitespace(params);
  const matches: AtRule[] = [];

  scope.walkAtRules((atRule: AtRule) => {
    if (atRule.name === 'supports' && normalizeWhitespace(atRule.params) === expectedParams) {
      matches.push(atRule);
    }
  });

  return matches;
};

describe('article header breadcrumb spacing CSS contract', () => {
  it('root baselineだけが8pxのblock marginを所有し、mobile ruleを維持すること', () => {
    const matches = collectRulesByExactSelector(root, baselineSelector);
    const baselineOwners = matches.filter(({ rule, selectors }) => {
      const marginBlockDeclarations = directDeclarationsForProperty(rule, 'margin-block');
      return (
        isRootLevelRule(rule) &&
        selectors.length === 1 &&
        marginBlockDeclarations.length === 1 &&
        normalizeCssDeclarationValue(marginBlockDeclarations[0]?.value ?? '') ===
          '0 var(--space-2, 8px)' &&
        marginBlockDeclarations[0]?.important !== true
      );
    });

    expect(baselineOwners).toHaveLength(1);
    const baselineRule = baselineOwners[0]?.rule;
    expect(baselineRule).toBeDefined();
    if (baselineRule === undefined) return;

    for (const property of ['margin', 'margin-block-end', 'margin-bottom']) {
      expect(directDeclarationsForProperty(baselineRule, property), property).toEqual([]);
    }

    for (const { rule } of matches) {
      if (rule === baselineRule) continue;
      for (const property of ['margin', 'margin-block', 'margin-block-end', 'margin-bottom']) {
        expect(directDeclarationsForProperty(rule, property), `${rule.selector}: ${property}`).toEqual(
          [],
        );
      }
    }

    const mobileRules = matches.filter(({ rule }) => {
      const parent = rule.parent;
      return (
        parent?.type === 'atrule' &&
        parent.name === 'media' &&
        normalizeWhitespace(parent.params) === '(max-width: 639px)' &&
        parent.parent?.type === 'root'
      );
    });

    expect(mobileRules).toHaveLength(1);
  });

  it('headingが直後に続く場合だけroot supports直下で12pxへ拡張すること', () => {
    const supportsMatches = collectMatchingSupports(root, enhancementSupportsParams);
    expect(supportsMatches).toHaveLength(1);
    const supports = supportsMatches[0];
    expect(supports).toBeDefined();
    if (supports === undefined) return;

    expect(supports.name).toBe('supports');
    expect(normalizeWhitespace(supports.params)).toBe(enhancementSupportsParams);
    expect(supports.parent?.type).toBe('root');

    const matches = collectRulesByExactSelector(root, enhancementSelector);
    expect(matches).toHaveLength(1);
    const match = matches[0];
    expect(match).toBeDefined();
    if (match === undefined) return;

    expect(match.selectors).toHaveLength(1);
    expect(isDirectChildRule(match.rule, supports)).toBe(true);

    const directChildRules = (supports.nodes ?? []).filter(
      (node): node is Rule => node.type === 'rule',
    );
    expect(directChildRules).toEqual([match.rule]);

    const marginBlockEndDeclarations = directDeclarationsForProperty(
      match.rule,
      'margin-block-end',
    );
    expect(marginBlockEndDeclarations).toHaveLength(1);
    expect(normalizeCssDeclarationValue(marginBlockEndDeclarations[0]?.value ?? '')).toBe(
      'var(--space-3, 12px)',
    );
    expect(marginBlockEndDeclarations[0]?.important).not.toBe(true);

    for (const property of ['margin', 'margin-block', 'margin-bottom']) {
      expect(directDeclarationsForProperty(match.rule, property), property).toEqual([]);
    }
  });
});
