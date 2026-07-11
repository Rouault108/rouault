import { resolve } from 'node:path';

import postcss, { type AnyNode, type AtRule, type Declaration, type Rule } from 'postcss';
import { describe, expect, it } from 'vitest';

import {
  findLastDeclarationRuleOrderForSelector,
  hasDeclarationForSelector,
  listCssFiles,
  normalizeCssDeclarationValue,
  readCssFile,
} from './support/css-contract.js';

const cssDir = resolve(process.cwd(), 'src/assets/css');
const { cssText: tokensCss } = readCssFile(resolve(cssDir, 'tokens.css'));
const { cssText: mainCss } = readCssFile(resolve(cssDir, 'main.css'));
const { cssText: bridgeCss } = readCssFile(resolve(cssDir, 'stateful-note-bridges.css'));

const targetAutospaceSupports =
  '(text-autospace: no-autospace) and (text-autospace: ideograph-alpha ideograph-numeric)';

interface SupportsBlockRecord {
  readonly filePath: string;
  readonly atRule: AtRule;
}

const normalizeWhitespace = (value: string): string => value.trim().replace(/\s+/gu, ' ');

const normalizeAttributeQuoteStyle = (selector: string): string =>
  selector.replace(
    /\[([^=\]]+)=(?:"([^"]*)"|'([^']*)')\]/gu,
    (_match, name, doubleValue, singleValue) => {
      const value = typeof doubleValue === 'string' ? doubleValue : singleValue;
      return `[${String(name)}='${String(value)}']`;
    },
  );

const normalizeSelectorText = (selector: string): string =>
  normalizeAttributeQuoteStyle(normalizeWhitespace(selector));

const isTargetAutospaceSupports = (atRule: AtRule): boolean =>
  atRule.name.toLowerCase() === 'supports' &&
  normalizeWhitespace(atRule.params) === targetAutospaceSupports;

const autospaceSupportsBlocks = (): SupportsBlockRecord[] => {
  const records: SupportsBlockRecord[] = [];

  for (const filePath of listCssFiles()) {
    const { cssText } = readCssFile(filePath);
    postcss.parse(cssText).walkAtRules('supports', (atRule: AtRule) => {
      if (isTargetAutospaceSupports(atRule)) {
        records.push({ filePath, atRule });
      }
    });
  }

  return records;
};

const targetAutospaceSupportsBlock = (): SupportsBlockRecord => {
  const records = autospaceSupportsBlocks();
  if (records.length !== 1) {
    throw new Error(`target text-autospace @supports count: ${records.length}`);
  }
  return records[0] as SupportsBlockRecord;
};

const hasTargetSupportsAncestor = (declaration: Declaration): boolean => {
  let parent: AnyNode | undefined = declaration.parent;

  while (parent !== undefined) {
    if (parent.type === 'atrule' && isTargetAutospaceSupports(parent as AtRule)) {
      return true;
    }
    parent = parent.parent;
  }

  return false;
};

const rulesWithDeclarationInTargetSupports = (
  property: string,
  expectedValue: string,
): Rule[] => {
  const { atRule } = targetAutospaceSupportsBlock();
  const expected = normalizeCssDeclarationValue(expectedValue);
  const rules: Rule[] = [];

  atRule.walkRules((rule: Rule) => {
    let matched = false;
    rule.walkDecls(property, (declaration: Declaration) => {
      if (normalizeCssDeclarationValue(declaration.value) === expected) {
        matched = true;
      }
    });
    if (matched) {
      rules.push(rule);
    }
  });

  return rules;
};

const supportsRuleHasDeclarationForSelectorFragments = (
  selectorFragments: readonly string[],
  property: string,
  expectedValue: string,
): boolean => {
  const normalizedFragments = selectorFragments.map(normalizeSelectorText);

  return rulesWithDeclarationInTargetSupports(property, expectedValue).some((rule) => {
    const selector = normalizeSelectorText(rule.selector);
    return normalizedFragments.every((fragment) => selector.includes(fragment));
  });
};

const surfaceFlowSelector = `:is(.prose, .about-prose)
  > *
  + :where(
    p,
    ul,
    ol,
    dl,
    pre,
    table,
    figure,
    blockquote,
    [data-callout],
    pre[data-code-block],
    section[data-code-group],
    [data-code-block-root],
    [data-link-card],
    [data-details],
    [data-info-box],
    [data-image],
    ui-video,
    [data-score],
    [data-table-root],
    ui-tabs,
    ui-translation,
    .translation-static
  )`;

const panelFlowSelector = `:is(.prose, .about-prose)
  > ui-tabs
  > [slot='panel']
  > *
  + :where(
    p,
    ul,
    ol,
    dl,
    pre,
    table,
    figure,
    blockquote,
    [data-callout],
    pre[data-code-block],
    section[data-code-group],
    [data-code-block-root],
    [data-link-card],
    [data-details],
    [data-info-box],
    [data-image],
    ui-video,
    [data-score],
    [data-table-root],
    ui-tabs,
    ui-translation
  )`;

describe('reading surface flow CSS contract', () => {
  it('defines paragraph space without changing generic block flow space', () => {
    expect(
      hasDeclarationForSelector(tokensCss, ':root', '--reading-flow-space', 'var(--space-4)', {
        scope: 'base',
      }),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(tokensCss, ':root', '--reading-paragraph-space', 'var(--space-3)', {
        scope: 'base',
      }),
    ).toBe(true);
  });

  it('keeps direct reading-surface p + p tighter than generic block flow', () => {
    const paragraphSelector = ':is(.prose, .about-prose) > p + p';

    expect(
      hasDeclarationForSelector(
        mainCss,
        surfaceFlowSelector,
        'margin-block-start',
        'var(--reading-flow-space)',
        { scope: 'base' },
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        mainCss,
        paragraphSelector,
        'margin-block-start',
        'var(--reading-paragraph-space)',
        { scope: 'base' },
      ),
    ).toBe(true);
    expect(
      findLastDeclarationRuleOrderForSelector(mainCss, paragraphSelector, 'margin-block-start', {
        scope: 'base',
      }),
    ).toBeGreaterThan(
      findLastDeclarationRuleOrderForSelector(mainCss, surfaceFlowSelector, 'margin-block-start', {
        scope: 'base',
      }),
    );
  });

  it('keeps ui-tabs panel p + p on the same paragraph contract', () => {
    const panelParagraphSelector =
      ":is(.prose, .about-prose) > ui-tabs > [slot='panel'] > p + p";

    expect(
      hasDeclarationForSelector(
        bridgeCss,
        panelFlowSelector,
        'margin-block-start',
        'var(--reading-flow-space)',
        { scope: 'base' },
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        bridgeCss,
        panelParagraphSelector,
        'margin-block-start',
        'var(--reading-paragraph-space)',
        { scope: 'base' },
      ),
    ).toBe(true);
    expect(
      findLastDeclarationRuleOrderForSelector(
        bridgeCss,
        panelParagraphSelector,
        'margin-block-start',
        { scope: 'base' },
      ),
    ).toBeGreaterThan(
      findLastDeclarationRuleOrderForSelector(bridgeCss, panelFlowSelector, 'margin-block-start', {
        scope: 'base',
      }),
    );
  });

  it('guards the Japanese/ASCII visual autospace contract in a single supports block', () => {
    const records = autospaceSupportsBlocks();

    expect(records).toHaveLength(1);
    expect(records[0]?.filePath).toBe(resolve(cssDir, 'main.css'));
  });

  it('keeps text-autospace declarations inside the target supports block only', () => {
    const violations: string[] = [];

    for (const filePath of listCssFiles()) {
      const { cssText } = readCssFile(filePath);
      postcss.parse(cssText).walkDecls('text-autospace', (declaration: Declaration) => {
        if (!hasTargetSupportsAncestor(declaration)) {
          violations.push(`${filePath}: ${declaration.toString()}`);
        }
      });
    }

    expect(violations).toEqual([]);
  });

  it('does not use spacing fallback declarations inside the autospace supports block', () => {
    const { atRule } = targetAutospaceSupportsBlock();
    const forbiddenDeclarations: string[] = [];

    atRule.walkDecls((declaration: Declaration) => {
      if (declaration.prop === 'letter-spacing' || declaration.prop === 'word-spacing') {
        forbiddenDeclarations.push(declaration.toString());
      }
      if (
        declaration.prop === 'text-autospace' &&
        ['normal', 'auto', 'replace'].includes(normalizeCssDeclarationValue(declaration.value))
      ) {
        forbiddenDeclarations.push(declaration.toString());
      }
    });

    expect(forbiddenDeclarations).toEqual([]);
  });

  it('opts reading prose into Japanese/ASCII autospace while keeping the document default fixed', () => {
    expect(
      supportsRuleHasDeclarationForSelectorFragments(
        ['body'],
        'text-autospace',
        'no-autospace',
      ),
    ).toBe(true);
    expect(
      supportsRuleHasDeclarationForSelectorFragments(
        [':is(.prose, .about-prose)'],
        'text-autospace',
        'ideograph-alpha ideograph-numeric',
      ),
    ).toBe(true);
  });

  it('keeps ui-tabs hosts out of autospace and re-opens only panel reading text', () => {
    expect(
      supportsRuleHasDeclarationForSelectorFragments(
        [':is(.prose, .about-prose)', ':where(ui-tabs)'],
        'text-autospace',
        'no-autospace',
      ),
    ).toBe(true);

    const panelAutospaceRules = rulesWithDeclarationInTargetSupports(
      'text-autospace',
      'ideograph-alpha ideograph-numeric',
    ).filter((rule) => normalizeSelectorText(rule.selector).includes("ui-tabs > [slot='panel']"));

    expect(panelAutospaceRules.length).toBeGreaterThan(0);
    expect(
      panelAutospaceRules.some((rule) =>
        normalizeSelectorText(rule.selector).includes(
          ":is(.prose, .about-prose) ui-tabs > [slot='panel']",
        ),
      ),
    ).toBe(true);
    expect(
      panelAutospaceRules.every(
        (rule) =>
          !normalizeSelectorText(rule.selector).includes(
            ":is(.prose, .about-prose) > ui-tabs > [slot='panel']",
          ),
      ),
    ).toBe(true);
  });

  it('keeps symbolic reading surfaces out of Japanese/ASCII autospace', () => {
    const exclusionRule = rulesWithDeclarationInTargetSupports(
      'text-autospace',
      'no-autospace',
    ).find((rule) => normalizeSelectorText(rule.selector).includes('[data-score]'));

    expect(exclusionRule).toBeDefined();

    const selector = normalizeSelectorText(exclusionRule?.selector ?? '');
    const excludedFragments = [
      'pre',
      'pre *',
      'code',
      'code *',
      'kbd',
      'kbd *',
      'samp',
      'samp *',
      '.katex',
      '.katex *',
      '[data-math]',
      '[data-math] *',
      'pre[data-code-block]',
      'pre[data-code-block] *',
      '[data-code-block-root]',
      '[data-code-block-root] *',
      'section[data-code-group]',
      'section[data-code-group] *',
      '[data-score]',
      '[data-score] *',
    ];

    for (const fragment of excludedFragments) {
      expect(selector).toContain(fragment);
    }
  });
});
