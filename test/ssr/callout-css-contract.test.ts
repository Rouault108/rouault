import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import postcss, { type AtRule, type Declaration, type Rule } from 'postcss';
import selectorParser from 'postcss-selector-parser';
import { describe, expect, it } from 'vitest';

const cssPath = resolve(process.cwd(), 'src/assets/css/callout.css');
const css = readFileSync(cssPath, 'utf8').replace(/\/\*[\s\S]*?\*\//gu, '');
const root = postcss.parse(css);

const readingRootScopes = [
  ':is(.prose,.about-prose)>[data-callout]',
  ":is(.prose,.about-prose)>ui-tabs>[slot='panel']>[data-callout]",
] as const;

const visualDeclarationProperties = [
  'display',
  'align-items',
  'justify-content',
  'gap',
  'padding',
  'padding-block',
  'padding-block-start',
  'padding-block-end',
  'padding-inline',
  'padding-inline-start',
  'padding-inline-end',
  'margin',
  'margin-block',
  'margin-block-start',
  'margin-block-end',
  'margin-inline',
  'margin-inline-start',
  'margin-inline-end',
  'border',
  'border-block',
  'border-inline',
  'border-block-start',
  'border-block-end',
  'border-inline-start',
  'border-inline-end',
  'background',
  'background-color',
  'color',
  'width',
  'height',
  'inline-size',
  'block-size',
  'flex',
  'line-height',
  'font-size',
  'font-weight',
  'stroke-width',
  '--callout-accent-color',
] as const;

const normalizeAttributeQuoteStyle = (selector: string): string =>
  selector.replace(
    /\[([^=\]]+)=(?:"([^"]*)"|'([^']*)')\]/gu,
    (_match, name, doubleValue, singleValue) => {
      const value = typeof doubleValue === 'string' ? doubleValue : singleValue;
      return `[${String(name)}='${String(value)}']`;
    },
  );

const normalizeSelector = (selector: string): string =>
  normalizeAttributeQuoteStyle(
    selector
      .trim()
      .replace(/\s+/gu, ' ')
      .replace(/\s*([>+~(,])\s*/gu, '$1')
      .replace(/\s*\)/gu, ')'),
  );

const splitSelectors = (selectorText: string): string[] => {
  const ast = selectorParser().astSync(selectorText);
  const selectors: string[] = [];
  ast.each((selector) => {
    selectors.push(normalizeSelector(selector.toString()));
  });
  return selectors;
};

const hasCalloutSelector = (selector: string): boolean => selector.includes('[data-callout');

const isScopedCalloutSelector = (selector: string): boolean =>
  readingRootScopes.some(
    (scope) =>
      selector === scope ||
      selector.startsWith(`${scope}[`) ||
      selector.startsWith(`${scope} `) ||
      selector.startsWith(`${scope}>`),
  );

const isVisualDeclaration = (declaration: Declaration): boolean => {
  const prop = declaration.prop;
  if (prop.startsWith('--_callout-')) return true;
  if (prop.startsWith('padding-')) return true;
  if (prop.startsWith('margin-')) return true;
  if (prop.startsWith('border-')) return true;
  if (prop.startsWith('flex-')) return true;
  return visualDeclarationProperties.includes(prop as (typeof visualDeclarationProperties)[number]);
};

const declarationsForSelector = (selector: string, property?: string): Declaration[] => {
  const normalizedSelector = normalizeSelector(selector);
  const declarations: Declaration[] = [];
  root.walkRules((rule: Rule) => {
    if (!splitSelectors(rule.selector).includes(normalizedSelector)) return;
    rule.walkDecls((declaration) => {
      if (property === undefined || declaration.prop === property) {
        declarations.push(declaration);
      }
    });
  });
  return declarations;
};

const declarationValuesForSelector = (selector: string, property: string): string[] =>
  declarationsForSelector(selector, property).map((declaration) => declaration.value.trim());

const ruleBlock = (selector: string, scope: postcss.Container = root): string => {
  const normalizedSelector = normalizeSelector(selector);
  const blocks: string[] = [];
  scope.walkRules((rule: Rule) => {
    if (!splitSelectors(rule.selector).includes(normalizedSelector)) return;
    blocks.push(rule.nodes?.map((node) => node.toString()).join('\n') ?? '');
  });
  return blocks.join('\n');
};

const forcedColorsBlock = (): AtRule => {
  let matched: AtRule | undefined;
  root.walkAtRules('media', (atRule: AtRule) => {
    if (/\bforced-colors\s*:\s*active\b/u.test(atRule.params)) matched = atRule;
  });
  expect(matched, 'forced-colors media block').toBeDefined();
  return matched as AtRule;
};

const selectorsIn = (scope: postcss.Container = root): string[] => {
  const selectors: string[] = [];
  scope.walkRules((rule: Rule) => {
    selectors.push(...splitSelectors(rule.selector));
  });
  return selectors;
};

const rulesWithCalloutVisualDeclarationsOutsideReadingScope = (
  scope: postcss.Container = root,
): string[] => {
  const violations: string[] = [];
  scope.walkRules((rule: Rule) => {
    const selectors = splitSelectors(rule.selector);
    const calloutSelectors = selectors.filter(hasCalloutSelector);
    if (calloutSelectors.length === 0) return;

    const visualDeclarations = (rule.nodes ?? []).filter(
      (node): node is Declaration => node.type === 'decl' && isVisualDeclaration(node),
    );
    if (visualDeclarations.length === 0) return;

    const unscopedSelectors = calloutSelectors.filter(
      (selector) => !isScopedCalloutSelector(selector),
    );
    if (unscopedSelectors.length === 0) return;

    const props = visualDeclarations.map((declaration) => declaration.prop).join(', ');
    violations.push(`${unscopedSelectors.join(', ')} => ${props}`);
  });
  return violations;
};

const kindSelector = (kind: string, panel = false): string =>
  panel
    ? `:is(.prose, .about-prose) > ui-tabs > [slot='panel'] > [data-callout][data-callout-kind='${kind}']`
    : `:is(.prose, .about-prose) > [data-callout][data-callout-kind='${kind}']`;

describe('callout CSS contract', () => {
  it('読書面scope外の data-callout selector へ表示declarationを漏らさないこと', () => {
    expect(rulesWithCalloutVisualDeclarationsOutsideReadingScope()).toEqual([]);
  });

  it('root layoutと互換accent aliasを読書面scopeに閉じて維持すること', () => {
    const rootSelector = ':is(.prose, .about-prose) > [data-callout]';
    expect(declarationValuesForSelector(rootSelector, 'display')).toContain('flex');
    expect(declarationValuesForSelector(rootSelector, 'background')).toContain(
      'var(--_callout-bg)',
    );
    expect(declarationValuesForSelector(rootSelector, 'border-inline-start')).toContain(
      'var(--_callout-rule-width) solid var(--_callout-rule-color)',
    );
    expect(declarationValuesForSelector(rootSelector, '--callout-accent-color')).toContain(
      'var(--_callout-accent-color)',
    );
  });

  it('icon互換selectorを scope 付きで維持すること', () => {
    const selectors = selectorsIn();
    expect(selectors).toContain(':is(.prose,.about-prose)>[data-callout]>.callout-icon');
    expect(selectors).toContain(
      ':is(.prose,.about-prose)>[data-callout]>[data-callout-icon-svg]',
    );
    expect(selectors).toContain(
      ":is(.prose,.about-prose)>ui-tabs>[slot='panel']>[data-callout]>.callout-icon",
    );
    expect(selectors).toContain(
      ":is(.prose,.about-prose)>ui-tabs>[slot='panel']>[data-callout]>[data-callout-icon-svg]",
    );
  });

  it('note/tip/danger の読書注記proxy条件を固定すること', () => {
    expect(declarationValuesForSelector(kindSelector('note'), '--_callout-bg')).toContain(
      'var(--bg-note-subtle)',
    );
    expect(ruleBlock(kindSelector('note'))).not.toContain('--bg-tip-subtle');
    expect(ruleBlock(kindSelector('note'))).not.toContain('--bg-warning-subtle');
    expect(ruleBlock(kindSelector('note'))).not.toContain('--bg-danger-subtle');

    expect(declarationValuesForSelector(kindSelector('tip'), '--_callout-bg')).toContain(
      'var(--bg-info-subtle)',
    );
    expect(declarationValuesForSelector(kindSelector('tip'), '--_callout-rule-color')).toContain(
      'var(--border-info-subtle)',
    );
    expect(ruleBlock(kindSelector('tip'))).not.toContain('--_callout-bg: var(--bg-tip-subtle)');
    expect(ruleBlock(kindSelector('tip'))).not.toContain('--_callout-rule-color: var(--fg-info)');

    expect(declarationValuesForSelector(kindSelector('danger'), '--_callout-rule-width')).toContain(
      'calc(var(--border-width-thick, 2px) * 2)',
    );
    for (const kind of ['note', 'tip', 'success', 'warning']) {
      expect(declarationValuesForSelector(kindSelector(kind), '--_callout-rule-width')).toEqual([]);
      expect(
        declarationValuesForSelector(kindSelector(kind, true), '--_callout-rule-width'),
      ).toEqual([]);
    }
  });

  it('rootの操作surface化と内部focus-visible禁止を追加しないこと', () => {
    expect(css).not.toMatch(
      /\[data-callout[^\{]*(?::hover|:active|:focus|:focus-within|:focus-visible)/u,
    );
    expect(css).not.toMatch(/box-shadow\s*:/u);
    expect(css).not.toMatch(/transition\s*:/u);
    expect(css).not.toMatch(/animation\s*:/u);
    expect(css).not.toMatch(
      /\[data-callout[^\{]*(?:a|button)[^\{]*:focus-visible[^\{]*\{[^}]*outline\s*:\s*(?:0|none)/u,
    );
    expect(css).not.toMatch(
      /\[data-callout[^\{]*(?:a|button)[^\{]*:focus-visible[^\{]*\{[^}]*box-shadow\s*:\s*none/u,
    );
  });

  it('note/tipのiconをCSSで非表示にしないこと', () => {
    const noteTipIconBlocks = selectorsIn()
      .filter(
        (selector) =>
          selector.includes('.callout-icon') || selector.includes('[data-callout-icon-svg]'),
      )
      .map((selector) => ruleBlock(selector))
      .join('\n');

    expect(noteTipIconBlocks).not.toMatch(/display\s*:\s*none/u);
  });

  it('forced-colors内でも読書面scope、左線、danger識別を維持すること', () => {
    const forcedColors = forcedColorsBlock();
    expect(rulesWithCalloutVisualDeclarationsOutsideReadingScope(forcedColors)).toEqual([]);

    const forcedRootSelector = ':is(.prose, .about-prose) > [data-callout]';
    const forcedDangerSelector = kindSelector('danger');
    const rootBlock = ruleBlock(forcedRootSelector, forcedColors);
    const dangerBlock = ruleBlock(forcedDangerSelector, forcedColors);

    expect(rootBlock).toContain('border: var(--border-width, 1px) solid var(--border-default)');
    expect(rootBlock).toContain(
      'border-inline-start: var(--border-width-thick, 2px) solid var(--primary)',
    );
    expect(rootBlock).toContain('background: Canvas');
    expect(rootBlock).toContain('color: CanvasText');
    expect(dangerBlock).toContain(
      'border-inline-start-width: calc(var(--border-width-thick, 2px) * 2)',
    );
    expect(dangerBlock).toContain('border-inline-start-color: var(--danger)');
  });
});
