import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import postcss, { type AtRule, type Declaration, type Rule } from 'postcss';
import selectorParser from 'postcss-selector-parser';
import { describe, expect, it } from 'vitest';

const readResultCardCss = (): string =>
  readFileSync(resolve(process.cwd(), 'src/assets/css/result-card.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//gu,
    '',
  );

const normalizeSelector = (selector: string): string =>
  selector
    .trim()
    .replace(/\s+/gu, ' ')
    .replace(/\s*([>+~(,])\s*/gu, '$1')
    .replace(/\s*\)/gu, ')');

const splitSelectors = (selectorText: string): string[] => {
  const ast = selectorParser().astSync(selectorText);
  const selectors: string[] = [];
  ast.each((selector) => {
    selectors.push(normalizeSelector(selector.toString()));
  });
  return selectors;
};

const ruleMatchesSelector = (rule: Rule, selector: string): boolean => {
  const normalizedSelector = normalizeSelector(selector);
  return splitSelectors(rule.selector).includes(normalizedSelector);
};

const declarationsFromRules = (rules: Rule[], property?: string): Declaration[] => {
  const declarations: Declaration[] = [];
  for (const rule of rules) {
    rule.walkDecls((declaration) => {
      if (property === undefined || declaration.prop === property) {
        declarations.push(declaration);
      }
    });
  }
  return declarations;
};

const rootRules = (css: string, selector: string): Rule[] => {
  const rules: Rule[] = [];
  postcss.parse(css).walkRules((rule: Rule) => {
    if (rule.parent?.type !== 'root' || !ruleMatchesSelector(rule, selector)) {
      return;
    }
    rules.push(rule);
  });
  return rules;
};

const topLevelSupportsRules = (css: string, supportsParams: string, selector: string): Rule[] => {
  const rules: Rule[] = [];
  postcss.parse(css).walkAtRules('supports', (atRule: AtRule) => {
    if (atRule.parent?.type !== 'root' || atRule.params.trim() !== supportsParams) {
      return;
    }

    for (const node of atRule.nodes ?? []) {
      if (node.type === 'rule' && ruleMatchesSelector(node, selector)) {
        rules.push(node);
      }
    }
  });
  return rules;
};

const topLevelMediaRules = (css: string, mediaParams: string, selector: string): Rule[] => {
  const rules: Rule[] = [];
  postcss.parse(css).walkAtRules('media', (atRule: AtRule) => {
    if (atRule.parent?.type !== 'root' || atRule.params.trim() !== mediaParams) {
      return;
    }

    for (const node of atRule.nodes ?? []) {
      if (node.type === 'rule' && ruleMatchesSelector(node, selector)) {
        rules.push(node);
      }
    }
  });
  return rules;
};

const mediaSupportsRules = (
  css: string,
  mediaParams: string,
  supportsParams: string,
  selector: string,
): Rule[] => {
  const rules: Rule[] = [];
  postcss.parse(css).walkAtRules('media', (mediaRule: AtRule) => {
    if (mediaRule.parent?.type !== 'root' || mediaRule.params.trim() !== mediaParams) {
      return;
    }

    for (const node of mediaRule.nodes ?? []) {
      if (
        node.type !== 'atrule' ||
        node.name !== 'supports' ||
        node.params.trim() !== supportsParams
      ) {
        continue;
      }

      for (const supportNode of node.nodes ?? []) {
        if (supportNode.type === 'rule' && ruleMatchesSelector(supportNode, selector)) {
          rules.push(supportNode);
        }
      }
    }
  });
  return rules;
};

const declarationsForSelector = (css: string, selector: string, property?: string): Declaration[] =>
  declarationsFromRules(allMatchingRules(css, selector), property);

const allMatchingRules = (css: string, selector: string): Rule[] => {
  const rules: Rule[] = [];
  postcss.parse(css).walkRules((rule: Rule) => {
    if (ruleMatchesSelector(rule, selector)) {
      rules.push(rule);
    }
  });
  return rules;
};

const declarationValues = (css: string, selector: string, property: string): string[] =>
  declarationsForSelector(css, selector, property).map((declaration) => declaration.value.trim());

const blockForRules = (rules: Rule[]): string =>
  declarationsFromRules(rules)
    .map((declaration) => declaration.toString())
    .join('\n');

const topLevelRuleBlock = (css: string, selector: string): string =>
  blockForRules(rootRules(css, selector));

const supportsRuleBlock = (css: string, supportsParams: string, selector: string): string =>
  blockForRules(topLevelSupportsRules(css, supportsParams, selector));

const mediaRuleBlock = (css: string, mediaParams: string, selector: string): string =>
  blockForRules(topLevelMediaRules(css, mediaParams, selector));

const mediaSupportsRuleBlock = (
  css: string,
  mediaParams: string,
  supportsParams: string,
  selector: string,
): string => blockForRules(mediaSupportsRules(css, mediaParams, supportsParams, selector));

const allRuleBlocks = (css: string, selector: string): string[] =>
  allMatchingRules(css, selector).map((rule) => blockForRules([rule]));

const ruleBlock = (css: string, selector: string): string =>
  blockForRules(allMatchingRules(css, selector));

const mediaBlock = (css: string, params: string): string => {
  let block = '';
  postcss.parse(css).walkAtRules('media', (atRule: AtRule) => {
    if (atRule.params.trim() === params) {
      block += atRule.nodes?.map((node) => node.toString()).join('\n') ?? '';
    }
  });
  return block;
};

describe('result card static CSS contract', () => {
  const focusVisibleSupportsParams = 'selector(.result-card:has(> .result-link:focus-visible))';
  const forcedColorsMediaParams = '(forced-colors: active)';

  it('moves the clickable surface padding from the card to the direct result link', () => {
    const css = readResultCardCss();

    expect(declarationValues(css, '.page-shell .result-card', 'padding')).toEqual([]);
    expect(declarationValues(css, '.page-shell .result-link', 'padding')).toEqual([
      'var(--space-5, 20px)',
    ]);
    expect(ruleBlock(css, '.page-shell .result-link')).toContain('display: grid');
    expect(ruleBlock(css, '.page-shell .result-link')).toContain('box-sizing: border-box');
    expect(ruleBlock(css, '.page-shell .result-link')).toContain('inline-size: 100%');
    expect(ruleBlock(css, '.page-shell .result-link')).toContain('border-radius: inherit');
    expect(ruleBlock(css, '.page-shell .result-link')).toContain('cursor: pointer');
  });

  it('uses result-link focus-visible as the source of truth for result-card focus projection', () => {
    const css = readResultCardCss();

    const disallowedFocusWithinProperties = [
      'outline',
      'outline-offset',
      'animation',
      'border-color',
      'box-shadow',
    ];

    for (const block of allRuleBlocks(css, '.page-shell .result-card:focus-within')) {
      for (const property of disallowedFocusWithinProperties) {
        expect(block, `.result-card:focus-within must not own ${property}`).not.toContain(
          `${property}:`,
        );
      }
    }

    expect(topLevelRuleBlock(css, '.page-shell .result-link:focus-visible')).toContain(
      'outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color)',
    );
    expect(topLevelRuleBlock(css, '.page-shell .result-link:focus-visible')).toContain(
      'outline-offset: calc(0px - var(--focus-ring-offset, 2px))',
    );
    expect(topLevelRuleBlock(css, '.page-shell .result-link:focus-visible')).toContain(
      'animation: var(--animation-focus)',
    );

    expect(
      supportsRuleBlock(
        css,
        focusVisibleSupportsParams,
        '.page-shell .result-card:has(> .result-link:focus-visible)',
      ),
    ).toContain('outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color)');
    expect(
      supportsRuleBlock(
        css,
        focusVisibleSupportsParams,
        '.page-shell .result-card:has(> .result-link:focus-visible)',
      ),
    ).toContain('outline-offset: var(--focus-ring-offset, 2px)');
    expect(
      supportsRuleBlock(
        css,
        focusVisibleSupportsParams,
        '.page-shell .result-card:has(> .result-link:focus-visible)',
      ),
    ).toContain('animation: var(--animation-focus)');

    expect(
      supportsRuleBlock(css, focusVisibleSupportsParams, '.page-shell .result-link:focus-visible'),
    ).toContain('outline: none');
    expect(
      supportsRuleBlock(css, focusVisibleSupportsParams, '.page-shell .result-link:focus-visible'),
    ).toContain('animation: none');

    expect(
      mediaRuleBlock(css, forcedColorsMediaParams, '.page-shell .result-link:focus-visible'),
    ).toContain('outline-color: Highlight');
    expect(
      mediaSupportsRuleBlock(
        css,
        forcedColorsMediaParams,
        focusVisibleSupportsParams,
        '.page-shell .result-card:has(> .result-link:focus-visible)',
      ),
    ).toContain('border-color: Highlight');
    expect(
      mediaSupportsRuleBlock(
        css,
        forcedColorsMediaParams,
        focusVisibleSupportsParams,
        '.page-shell .result-card:has(> .result-link:focus-visible)',
      ),
    ).toContain('outline: var(--focus-ring-width, 2px) solid Highlight');
    expect(
      mediaSupportsRuleBlock(
        css,
        forcedColorsMediaParams,
        focusVisibleSupportsParams,
        '.page-shell .result-card:has(> .result-link:focus-visible)',
      ),
    ).toContain('box-shadow: none');
  });

  it('result-card のフォーカス投影のカスケード順を維持する', () => {
    const css = readResultCardCss();

    const hoverIndex = css.indexOf('.page-shell .result-card:hover');
    const fallbackIndex = css.indexOf('.page-shell .result-link:focus-visible');
    const supportsIndex = css.indexOf(`@supports ${focusVisibleSupportsParams}`);
    const forcedColorsIndex = css.indexOf(`@media ${forcedColorsMediaParams}`);

    expect(hoverIndex, 'hover ルールが存在する').toBeGreaterThanOrEqual(0);
    expect(fallbackIndex, 'fallback focus-visible ルールが存在する').toBeGreaterThanOrEqual(0);
    expect(supportsIndex, ':has() 投影 @supports が存在する').toBeGreaterThanOrEqual(0);
    expect(forcedColorsIndex, 'forced-colors 補正が存在する').toBeGreaterThanOrEqual(0);

    expect(hoverIndex, 'hover ルールは fallback focus-visible より前に置く').toBeLessThan(
      fallbackIndex,
    );
    expect(
      fallbackIndex,
      'fallback focus-visible は :has() 投影より前に置く',
    ).toBeLessThan(supportsIndex);
    expect(supportsIndex, ':has() 投影は forced-colors 補正より前に置く').toBeLessThan(
      forcedColorsIndex,
    );
  });

  it('restores outlined clickable hover treatment without height contracts', () => {
    const css = readResultCardCss();

    expect(ruleBlock(css, '.page-shell .result-card')).toContain('overflow: hidden');
    expect(ruleBlock(css, '.page-shell .result-card')).toContain('transition:');
    expect(ruleBlock(css, '.page-shell .result-card:hover')).toContain(
      'border-color: var(--border-muted)',
    );
    expect(ruleBlock(css, '.page-shell .result-card:hover')).toContain(
      'box-shadow: var(--elevation-md)',
    );

    const heightContractProperties = new Set([
      'block-size',
      'min-block-size',
      'max-block-size',
      'height',
      'min-height',
      'max-height',
    ]);
    const heightContracts: string[] = [];
    postcss.parse(css).walkDecls((declaration) => {
      if (heightContractProperties.has(declaration.prop)) {
        heightContracts.push(declaration.toString());
      }
    });

    expect(heightContracts).toEqual([]);
  });

  it('keeps the mobile result-title density at the legacy static size', () => {
    const css = readResultCardCss();
    const mobile = mediaBlock(css, '(max-width: 768px)');

    expect(ruleBlock(mobile, '.page-shell .result-title')).toContain(
      'font-size: var(--text-base, 14px)',
    );
  });
});
