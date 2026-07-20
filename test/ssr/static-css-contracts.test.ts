import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss, { type AnyNode, type AtRule, type Declaration, type Rule } from 'postcss';
import selectorParser from 'postcss-selector-parser';
import { describe, expect, it } from 'vitest';

const cssDir = resolve(process.cwd(), 'src/assets/css');

const readCss = (fileName: string): string =>
  readFileSync(resolve(cssDir, fileName), 'utf8').replace(/\/\*[\s\S]*?\*\//gu, '');

const normalizeAttributeQuoteStyle = (selector: string): string =>
  selector.replace(
    /\[([^=\]]+)=(?:"([^"]*)"|'([^']*)')\]/gu,
    (_match, name, doubleValue, singleValue) => {
      const value = typeof doubleValue === 'string' ? doubleValue : singleValue;
      return `[${String(name)}='${String(value)}']`;
    },
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
    selectors.push(normalizeAttributeQuoteStyle(normalizeSelector(selector.toString())));
  });
  return selectors;
};

const ruleBlocksForSelector = (css: string, selector: string): string[] => {
  const blocks: string[] = [];
  const normalizedSelector = normalizeAttributeQuoteStyle(normalizeSelector(selector));
  postcss.parse(css).walkRules((rule: Rule) => {
    if (splitSelectors(rule.selector).includes(normalizedSelector)) {
      blocks.push(rule.nodes?.map((node) => node.toString()).join('\n') ?? '');
    }
  });
  return blocks;
};

const ruleBlock = (css: string, selector: string): string =>
  ruleBlocksForSelector(css, selector).join('\n');

const declarationsForSelector = (
  css: string,
  selector: string,
  property?: string,
): Declaration[] => {
  const declarations: Declaration[] = [];
  const normalizedSelector = normalizeAttributeQuoteStyle(normalizeSelector(selector));
  postcss.parse(css).walkRules((rule: Rule) => {
    if (!splitSelectors(rule.selector).includes(normalizedSelector)) return;
    rule.walkDecls((declaration) => {
      if (property === undefined || declaration.prop === property) declarations.push(declaration);
    });
  });
  return declarations;
};

interface SourceOrderedDeclaration {
  readonly ruleIndex: number;
  readonly value: string;
}

interface RuleDeclarationRecord {
  readonly property: string;
  readonly ruleIndex: number;
  readonly value: string;
}

interface SelectorRuleDeclarationRecord {
  readonly selectors: readonly string[];
  readonly value: string;
}

interface SelectorDeclarationLocationRecord {
  readonly mediaParams: readonly string[];
  readonly selector: string;
  readonly value: string;
}

interface SelectorRuleRecord {
  readonly ruleIndex: number;
  readonly selectors: readonly string[];
  readonly block: string;
  readonly declarations: readonly RuleDeclarationRecord[];
}

const rootRuleRecords = (css: string): SelectorRuleRecord[] => {
  const records: SelectorRuleRecord[] = [];
  let ruleIndex = 0;

  postcss.parse(css).walkRules((rule: Rule) => {
    if (rule.parent?.type !== 'root') return;

    records.push({
      ruleIndex,
      selectors: splitSelectors(rule.selector).map((selector) =>
        normalizeAttributeQuoteStyle(normalizeSelector(selector)),
      ),
      block: rule.nodes?.map((node) => node.toString()).join('\n') ?? '',
      declarations:
        rule.nodes
          ?.filter((node): node is Declaration => node.type === 'decl')
          .map((declaration) => ({
            ruleIndex,
            value: declaration.value.trim(),
            property: declaration.prop,
          })) ?? [],
    });
    ruleIndex += 1;
  });

  return records;
};

const rootRuleRecordsForSelector = (css: string, selector: string): SelectorRuleRecord[] => {
  const targetSelector = normalizeAttributeQuoteStyle(normalizeSelector(selector));
  return rootRuleRecords(css).filter((record) => record.selectors.includes(targetSelector));
};

const declarationValuesForRuleRecord = (record: SelectorRuleRecord, property: string): string[] => {
  return record.declarations
    .filter((declaration) => declaration.property === property)
    .map((declaration) => declaration.value);
};

const rootRuleRecordsDeclaring = (
  css: string,
  declarations: readonly { readonly property: string; readonly value: string }[],
): SelectorRuleRecord[] => {
  return rootRuleRecords(css).filter((record) =>
    declarations.every(({ property, value }) =>
      declarationValuesForRuleRecord(record, property).includes(value),
    ),
  );
};

const rootDeclarationRecordsForSelector = (
  css: string,
  selector: string,
  property: string,
): SourceOrderedDeclaration[] => {
  const records: SourceOrderedDeclaration[] = [];
  const targetSelector = normalizeAttributeQuoteStyle(normalizeSelector(selector));
  let ruleIndex = 0;

  postcss.parse(css).walkRules((rule: Rule) => {
    if (rule.parent?.type !== 'root') return;

    const selectors = splitSelectors(rule.selector).map((selector) =>
      normalizeAttributeQuoteStyle(normalizeSelector(selector)),
    );

    if (selectors.includes(targetSelector)) {
      rule.walkDecls(property, (declaration) => {
        records.push({ ruleIndex, value: declaration.value.trim() });
      });
    }

    ruleIndex += 1;
  });

  return records;
};

const declarationRuleRecordsForSelector = (
  css: string,
  selector: string,
  property: string,
  options: { readonly rootOnly?: boolean } = {},
): SelectorRuleDeclarationRecord[] => {
  const records: SelectorRuleDeclarationRecord[] = [];
  const targetSelector = normalizeAttributeQuoteStyle(normalizeSelector(selector));

  postcss.parse(css).walkRules((rule: Rule) => {
    if (options.rootOnly === true && rule.parent?.type !== 'root') return;

    const selectors = splitSelectors(rule.selector).map((selector) =>
      normalizeAttributeQuoteStyle(normalizeSelector(selector)),
    );
    if (!selectors.includes(targetSelector)) return;

    rule.walkDecls(property, (declaration) => {
      records.push({ selectors, value: declaration.value.trim() });
    });
  });

  return records;
};

const declarationValuesForSelector = (css: string, selector: string, property: string): string[] =>
  declarationsForSelector(css, selector, property).map((declaration) => declaration.value.trim());

const declarationsForSelectors = (
  css: string,
  selectors: readonly string[],
  property: string,
): Declaration[] =>
  selectors.flatMap((selector) => declarationsForSelector(css, selector, property));

const declarationValuesForSelectors = (
  css: string,
  selectors: readonly string[],
  property: string,
): string[] =>
  declarationsForSelectors(css, selectors, property).map((declaration) => declaration.value.trim());

const normalizeDeclarationValue = (value: string): string =>
  value
    .trim()
    .replace(/\s+/gu, ' ')
    .replace(/\s*,\s*/gu, ', ')
    .replace(/\(\s+/gu, '(')
    .replace(/\s+\)/gu, ')');

const declarationsForSelectorInMedia = (
  css: string,
  selector: string,
  property: string,
  mediaPredicate: (params: string) => boolean,
): Declaration[] => {
  const declarations: Declaration[] = [];
  const normalizedSelector = normalizeAttributeQuoteStyle(normalizeSelector(selector));
  postcss.parse(css).walkAtRules('media', (atRule: AtRule) => {
    if (!mediaPredicate(atRule.params)) return;
    atRule.walkRules((rule: Rule) => {
      if (!splitSelectors(rule.selector).includes(normalizedSelector)) return;
      rule.walkDecls(property, (declaration) => {
        declarations.push(declaration);
      });
    });
  });
  return declarations;
};

const mediaParamsForRule = (rule: Rule): string[] => {
  const params: string[] = [];
  let parent = rule.parent as AnyNode | undefined;
  while (parent !== undefined) {
    if (parent.type === 'atrule' && parent.name === 'media') params.unshift(parent.params.trim());
    parent = parent.parent as AnyNode | undefined;
  }
  return params;
};

const declarationLocationsForPropertyValue = (
  css: string,
  property: string,
  value: string,
): SelectorDeclarationLocationRecord[] => {
  const records: SelectorDeclarationLocationRecord[] = [];
  const expectedValue = normalizeDeclarationValue(value);

  postcss.parse(css).walkRules((rule: Rule) => {
    if (isInsideKeyframes(rule)) return;
    const selectors = splitSelectors(rule.selector);
    const mediaParams = mediaParamsForRule(rule);

    rule.walkDecls(property, (declaration) => {
      if (normalizeDeclarationValue(declaration.value) !== expectedValue) return;
      for (const selector of selectors) {
        records.push({
          mediaParams,
          selector,
          value: declaration.value.trim(),
        });
      }
    });
  });

  return records;
};

const unquoteCssStringValue = (value: string): string =>
  value.replace(/^(['"])([\s\S]*)\1$/u, '$2');

const lacksDeclarationProperty = (css: string, selector: string, property: string): boolean =>
  declarationsForSelector(css, selector, property).length === 0;

const listSupportsBlocks = (css: string): string[] => {
  const blocks: string[] = [];
  postcss.parse(css).walkAtRules('supports', (atRule: AtRule) => {
    blocks.push(atRule.nodes?.map((node) => node.toString()).join('\n') ?? '');
  });
  return blocks;
};

const isInsideKeyframes = (rule: Rule): boolean =>
  rule.parent?.type === 'atrule' && /keyframes$/u.test(rule.parent.name);

const allRuleSelectors = (css: string): string[] => {
  const selectors: string[] = [];
  postcss.parse(css).walkRules((rule: Rule) => {
    if (isInsideKeyframes(rule)) return;
    selectors.push(...splitSelectors(rule.selector));
  });
  return selectors;
};

const ruleBlocksForSelectorsMatching = (
  css: string,
  predicate: (selector: string) => boolean,
): string => {
  const blocks: string[] = [];
  postcss.parse(css).walkRules((rule: Rule) => {
    if (isInsideKeyframes(rule)) return;
    if (!splitSelectors(rule.selector).some(predicate)) return;
    blocks.push(rule.nodes?.map((node) => node.toString()).join('\n') ?? '');
  });
  return blocks.join('\n');
};

const expectSelectorPresence = (css: string, selectors: readonly string[]): void => {
  const actualSelectors = allRuleSelectors(css);
  for (const selector of selectors) {
    expect(
      actualSelectors.some((actualSelector) => actualSelector.includes(selector)),
      `${selector} selector presence`,
    ).toBe(true);
  }
};

const selectorHasExternalNavMarker = (selectorText: string): boolean => {
  let found = false;
  const ast = selectorParser().astSync(selectorText);
  ast.each((selector) => {
    const normalized = normalizeAttributeQuoteStyle(normalizeSelector(selector.toString()));
    if (!normalized.includes("a[data-external='true']::after")) return;
    found = true;
  });
  return found;
};

const isExternalMarkerSelectorLimitedToNav = (selectorText: string): boolean => {
  let ok = false;
  const ast = selectorParser().astSync(selectorText);
  ast.each((selector) => {
    const normalized = normalizeAttributeQuoteStyle(normalizeSelector(selector.toString()));
    if (!normalized.includes("a[data-external='true']::after")) return;
    const navIndex = selector.nodes.findIndex(
      (node) => node.type === 'class' && node.value === 'ui-footer__nav',
    );
    const anchorIndex = selector.nodes.findIndex(
      (node) => node.type === 'tag' && node.value === 'a',
    );
    if (navIndex < 0 || anchorIndex <= navIndex) return;
    const combinators = selector.nodes
      .slice(navIndex + 1, anchorIndex)
      .filter((node) => node.type === 'combinator');
    if (
      combinators.length > 0 &&
      combinators.every((node) => node.value.trim().length === 0 || node.value === '>') &&
      normalized.startsWith('.ui-footer[data-footer] ')
    ) {
      ok = true;
    }
  });
  return ok;
};

const expectRuleToDeclare = (
  css: string,
  selector: string,
  declarations: readonly string[],
): void => {
  const block = ruleBlock(css, selector);
  expect(block, `${selector} rule`).not.to.equal('');
  for (const declaration of declarations) {
    expect(block, `${selector} declaration ${declaration}`).to.contain(declaration);
  }
};

const expectSelectorMatchingRuleToDeclare = (
  css: string,
  description: string,
  predicate: (selector: string) => boolean,
  declarations: readonly string[],
): void => {
  const block = ruleBlocksForSelectorsMatching(css, predicate);
  expect(block, `${description} rule`).not.to.equal('');
  for (const declaration of declarations) {
    expect(block, `${description} declaration ${declaration}`).to.contain(declaration);
  }
};

const optionalAtRuleBlock = (css: string, atRule: string): string | undefined => {
  const start = css.indexOf(atRule);
  if (start < 0) return undefined;
  const openingBrace = css.indexOf('{', start);
  let depth = 0;
  for (let index = openingBrace; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1;
    if (css[index] !== '}') continue;
    depth -= 1;
    if (depth === 0) return css.slice(openingBrace + 1, index);
  }
  throw new Error(`${atRule} block is not closed`);
};

const atRuleBlock = (css: string, atRule: string): string => {
  const block = optionalAtRuleBlock(css, atRule);
  expect(block, `${atRule} block`).not.toBeUndefined();
  return block ?? '';
};

const mainCssImportRegistry = [
  './fonts.css',
  './tokens.css',
  './static-icons.css',
  './static-copy-button.css',
  './static-checkbox.css',
  './link-primitives.css',
  './card-link.css',
  './utility-surfaces.css',
  './layout-containers.css',
  './stateful-note-bridges.css',
  './translation.css',
  './skip-link.css',
  './dialog-state.css',
  './app-shell.css',
  './router-shell.css',
  './layout-header.css',
  './static-choice-menu.css',
  './layout-sidebar.css',
  './note-shell.css',
  './layout-toc.css',
  './about-shell.css',
  './page-shell.css',
  './home-page.css',
  './result-card.css',
  './not-found-page.css',
  './view-transition.css',
  './article-header.css',
  './search-dialog.css',
  './search-page.css',
  './empty-state.css',
  './page-corpora.css',
  './blockquote.css',
  './callout.css',
  './info-box.css',
  './table.css',
  './footnotes.css',
  './divider.css',
  './highlight.css',
  './details-block.css',
  './link-card.css',
  './image.css',
  './score.css',
  './lists.css',
  './task-list.css',
  './syntax.css',
  './code-surfaces.css',
  './math.css',
  './footer.css',
] as const;

const forbiddenMainCssTokens = [
  '@fontsource/',
  './fonts/',
  'body[data-ui-dialog-open]',
  'body[data-ui-search-dialog-open]',
  '@view-transition',
  '::view-transition-group(*)',
  '@keyframes fade-in',
] as const;

const forbiddenMainCssSelectorPatterns = [
  /\bapp-root\b/u,
  /\bapp-shell-root\b/u,
  /\brouter-document-host\b/u,
  /\.note-shell(?![-_a-zA-Z0-9])/u,
  /header\[data-layout-header\]/u,
  /\.layout-sidebar-overlay-layer(?![-_a-zA-Z0-9])/u,
  /\.layout-sidebar-col(?![-_a-zA-Z0-9])/u,
  /\blayout-sidebar-surface\b/u,
  /\.about-shell(?![-_a-zA-Z0-9])/u,
  /\.page-shell(?![-_a-zA-Z0-9])/u,
  /\.hero(?![-_a-zA-Z0-9])/u,
  /\.eyebrow(?![-_a-zA-Z0-9])/u,
  /\.heading(?![-_a-zA-Z0-9])/u,
  /\.description(?![-_a-zA-Z0-9])/u,
  /\.meta-row(?![-_a-zA-Z0-9])/u,
  /\.home-shell(?![-_a-zA-Z0-9])/u,
  /\.home-content(?![-_a-zA-Z0-9])/u,
  /\.home-hero(?![-_a-zA-Z0-9])/u,
  /\.home-entry(?![-_a-zA-Z0-9])/u,
  /\.home-empty(?![-_a-zA-Z0-9])/u,
  /\.results-section(?![-_a-zA-Z0-9])/u,
  /\.results-list(?![-_a-zA-Z0-9])/u,
  /\.result-card(?![-_a-zA-Z0-9])/u,
  /\.result-link(?![-_a-zA-Z0-9])/u,
  /\.result-title(?![-_a-zA-Z0-9])/u,
  /\.result-path(?![-_a-zA-Z0-9])/u,
  /\.result-meta(?![-_a-zA-Z0-9])/u,
  /\.result-excerpt(?![-_a-zA-Z0-9])/u,
  /\.page-transition(?![-_a-zA-Z0-9])/u,
] as const;

describe('static CSS contracts', () => {
  it('selector AST helper preserves nested and quoted commas while splitting selector lists', () => {
    const selectorFixtures = [
      {
        selector:
          '.ui-footer[data-footer] .ui-footer__site, .ui-footer[data-footer] .ui-footer__nav',
        expected: [
          '.ui-footer[data-footer] .ui-footer__site',
          '.ui-footer[data-footer] .ui-footer__nav',
        ],
      },
      {
        selector:
          '.ui-footer[data-footer] :is(.ui-footer__site, .ui-footer__nav) a[data-external="true"]::after',
        expected: [
          ".ui-footer[data-footer] :is(.ui-footer__site,.ui-footer__nav) a[data-external='true']::after",
        ],
      },
      {
        selector:
          '.ui-footer[data-footer] :where(.ui-footer__site, .ui-footer__nav) a:not([data-link-kind="external-action"], [data-external="false"])',
        expected: [
          ".ui-footer[data-footer] :where(.ui-footer__site,.ui-footer__nav) a:not([data-link-kind='external-action'],[data-external='false'])",
        ],
      },
      {
        selector: '.ui-footer[data-footer] a[data-label=","]::after',
        expected: [".ui-footer[data-footer] a[data-label=',']::after"],
      },
      {
        selector: ".ui-footer[data-footer] a[data-label='\\,']::after",
        expected: [".ui-footer[data-footer] a[data-label='\\,']::after"],
      },
    ];

    for (const fixture of selectorFixtures) {
      expect(splitSelectors(fixture.selector), fixture.selector).toEqual(fixture.expected);
    }
  });

  it('main.css is the fixed import registry plus reset/base/prose surface', () => {
    const css = readCss('main.css');

    const imports = [...css.matchAll(/@import\s+['"]([^'"]+)['"];/gu)].map((match) => match[1]);
    expect(imports).toEqual(mainCssImportRegistry);
    expect(imports.filter((path) => path === './tokens.css')).toHaveLength(1);

    for (const token of forbiddenMainCssTokens) {
      expect(css, token).not.to.contain(token);
    }
    for (const pattern of forbiddenMainCssSelectorPatterns) {
      expect(css, String(pattern)).not.to.match(pattern);
    }
    expect(css).not.to.contain('ui-list-item >');
  });

  it('app shell CSS uses only the presentation class and preserves its declarations', () => {
    const css = readCss('app-shell.css');
    const selectors = allRuleSelectors(css);
    const legacyCompatibilityRules: string[] = [];

    postcss.parse(css).walkRules((rule: Rule) => {
      const ruleSelectors = splitSelectors(rule.selector);
      if (ruleSelectors.includes('.app-root') && ruleSelectors.includes('.app-shell-root')) {
        legacyCompatibilityRules.push(rule.selector);
      }
    });

    expect(selectors).toContain('.app-shell-root');
    expect(declarationValuesForSelector(css, '.app-shell-root', '--note-sidebar-main-gap')).toEqual(
      ['clamp(24px, 2vw, 40px)'],
    );
    expect(declarationValuesForSelector(css, '.app-shell-root', 'min-height')).toEqual(['100vh']);
    expect(declarationValuesForSelector(css, '.app-shell-root', 'display')).toEqual(['flex']);
    expect(declarationValuesForSelector(css, '.app-shell-root', 'flex-direction')).toEqual([
      'column',
    ]);
    expect(selectors).not.toContain('.app-root');
    expect(selectors.some((selector) => selector.includes('[data-app-shell-root]'))).toBe(false);
    expect(legacyCompatibilityRules).toEqual([]);
  });

  it('loads Geist Mono Variable as the project mono font source', () => {
    const fontsCss = readCss('fonts.css');
    const tokensCss = readCss('tokens.css');

    expect(fontsCss).toContain("@import '@fontsource-variable/geist-mono/wght.css';");
    expect(fontsCss).not.toContain('@fontsource/jetbrains-mono');

    const monoFontValues = declarationValuesForSelector(tokensCss, ':root', '--font-mono').map(
      normalizeDeclarationValue,
    );

    expect(monoFontValues).toEqual([
      "'Geist Mono Variable', 'Consolas', 'Liberation Mono', 'Courier New', monospace",
    ]);
  });

  it('translation fallback CSS exposes readable disclosure contracts only for fallback markup', () => {
    const css = readCss('translation.css');

    expectRuleToDeclare(css, 'ui-translation > [data-translation-fallback]', ['margin: 0']);
    expectRuleToDeclare(
      css,
      'ui-translation > [data-translation-fallback] > [data-translation-fallback-trigger]',
      [
        'display: inline',
        'background: transparent',
        'font: inherit',
        'cursor: pointer',
        'list-style: none',
        'text-decoration-line: underline',
      ],
    );
    expectRuleToDeclare(
      css,
      'ui-translation > [data-translation-fallback] > [data-translation-fallback-content]',
      [
        'padding: var(--space-3, 12px) var(--space-4, 16px)',
        'background: var(--bg-surface-1)',
        'color: var(--fg-default)',
        'line-height: var(--line-height-relaxed, 1.75)',
      ],
    );

    const forcedColors = atRuleBlock(css, '@media (forced-colors: active)');
    expectRuleToDeclare(
      forcedColors,
      'ui-translation > [data-translation-fallback] > [data-translation-fallback-trigger]',
      ['color: LinkText'],
    );
    expectRuleToDeclare(
      forcedColors,
      'ui-translation > [data-translation-fallback] > [data-translation-fallback-content]',
      ['background: Canvas', 'color: CanvasText'],
    );

    const print = atRuleBlock(css, '@media print');
    expectRuleToDeclare(print, 'ui-translation > [data-translation-fallback]', ['display: block']);
    expectRuleToDeclare(
      print,
      'ui-translation > [data-translation-fallback] > [data-translation-fallback-content]',
      ['display: block'],
    );

    expect(css).to.contain('.translation-static');
    expect(css).not.to.contain('[data-translation-fallback] [data-part');
    expect(css).not.to.contain('[data-translation-fallback][data-surface');
  });

  it('keeps root viewport gutter stable while dialog open states only own body scroll lock', () => {
    const mainCss = readCss('main.css');
    const dialogStateCss = readCss('dialog-state.css');
    const bodyOpenStateSelectors = [
      'body[data-ui-dialog-open]',
      'body[data-ui-search-dialog-open]',
    ] as const;

    expect(declarationValuesForSelector(mainCss, 'html', 'scrollbar-gutter')).toContain('stable');

    for (const selector of bodyOpenStateSelectors) {
      expect(declarationValuesForSelector(dialogStateCss, selector, 'overflow')).toContain(
        'hidden',
      );
      expect(lacksDeclarationProperty(dialogStateCss, selector, 'scrollbar-gutter')).toBe(true);
    }
  });

  it('about lead keeps natural wrapping while isolating only the terminal keep phrase', () => {
    const css = readCss('about-shell.css');

    expect(declarationValuesForSelector(css, '.about-shell', '--about-lead-measure')).toContain(
      'var(--width-reading, 75ch)',
    );
    expect(declarationValuesForSelector(css, '.about-lead', 'max-width')).toEqual([]);
    expect(
      declarationValuesForSelector(css, '.about-lead', 'max-inline-size').map(
        normalizeDeclarationValue,
      ),
    ).toContain('min(100%, var(--about-lead-measure))');
    expect(declarationValuesForSelector(css, '.about-lead', 'text-wrap')).toContain('pretty');
    expect(declarationValuesForSelector(css, '.about-lead', 'white-space')).toEqual([]);
    expect(declarationValuesForSelector(css, '.about-lead__keep', 'white-space')).toContain(
      'nowrap',
    );
  });

  it('home lead keeps natural wrapping while isolating only the terminal keep phrase', () => {
    const css = readCss('home-page.css');

    expect(declarationValuesForSelector(css, '.home-shell', '--home-lead-measure')).toContain(
      '44em',
    );
    expect(declarationValuesForSelector(css, '.home-lead', 'max-width')).toEqual([]);
    expect(
      declarationValuesForSelector(css, '.home-lead', 'max-inline-size').map(
        normalizeDeclarationValue,
      ),
    ).toContain('min(100%, var(--home-lead-measure))');
    expect(declarationValuesForSelector(css, '.home-lead', 'text-wrap')).toContain('pretty');
    expect(declarationValuesForSelector(css, '.home-lead', 'white-space')).toEqual([]);
    expect(declarationValuesForSelector(css, '.home-lead__keep', 'white-space')).toContain(
      'nowrap',
    );
    expect(ruleBlock(css, '.home-lead')).not.toContain('--reading-measure');
  });

  it('router shell keeps desktop fixed-sidebar note frame outer gutter contract', () => {
    const css = readCss('router-shell.css');
    const selector = "router-document-host[data-sidebar-presence='present']";

    const aliasValues = declarationValuesForSelector(
      css,
      selector,
      '--_note-frame-outer-gutter',
    ).map(normalizeDeclarationValue);
    expect(aliasValues).toContain('var(--note-frame-outer-gutter, 0px)');

    const widthValues = declarationValuesForSelector(css, selector, 'width').map(
      normalizeDeclarationValue,
    );
    expect(widthValues.some((value) => value.startsWith('min('))).toBe(true);
    expect(
      widthValues.some((value) =>
        value.includes(
          'calc(100% - var(--_note-frame-outer-gutter) - var(--_note-frame-outer-gutter))',
        ),
      ),
    ).toBe(true);
    expect(
      widthValues.some((value) => value.includes('var(--note-fixed-frame-max-width, 1440px)')),
    ).toBe(true);

    const mobileWidthValues = declarationsForSelectorInMedia(css, selector, 'width', (params) =>
      /max-width\s*:\s*1023px/u.test(params),
    ).map((declaration) => normalizeDeclarationValue(declaration.value));
    expect(mobileWidthValues).toContain('100%');
  });

  it('utility skeleton CSS exposes visual-only static skeleton contract', () => {
    const css = readCss('utility-surfaces.css');

    expectRuleToDeclare(css, '.skeleton', [
      'background: var(--skeleton-bg)',
      'position: relative',
      'overflow: hidden',
      'border-radius: var(--radius-sm)',
    ]);
    expectRuleToDeclare(css, '.skeleton::after', [
      "content: ''",
      'position: absolute',
      'top: 0',
      'right: 0',
      'bottom: 0',
      'left: 0',
      'background: linear-gradient(90deg, transparent, var(--skeleton-shimmer), transparent)',
      'animation: shimmer 1.5s infinite',
    ]);

    const reducedMotion = atRuleBlock(css, '@media (prefers-reduced-motion: reduce)');
    expectRuleToDeclare(reducedMotion, '.skeleton::after', ['animation: none']);
    expect(existsSync(resolve(cssDir, 'skeleton.css'))).to.equal(false);
  });

  it('layout header CSS keeps sticky and container ownership on the static header root', () => {
    const css = readCss('layout-header.css');

    expectRuleToDeclare(css, 'header[data-layout-header]', [
      'position: sticky',
      'z-index:',
      'container-type: inline-size',
      'container-name: layout-header-shell',
      '--_header-search-trigger-max-inline-size: 9rem',
      '--_header-search-trigger-max-inline-size-compact: 7rem',
    ]);
    expect(
      declarationValuesForSelector(
        css,
        'header[data-layout-header]',
        '--_header-control-pressed-scale',
      ),
    ).toEqual([]);
    expect(
      declarationValuesForSelector(
        css,
        'header[data-layout-header]',
        '--_header-control-transition',
      ).some((value) => /\btransform\b/u.test(value)),
      'header control transition must not include transform',
    ).toBe(false);
    expect(css).not.to.contain('layout-header-query-frame');
    expect(css).not.to.match(/(^|[,{]\s*)layout-header(?:[.#[:\s,{>+~]|$)/u);
    expect(css).not.to.match(/(^|[,{]\s*)ui-header(?:[.#[:\s,{>+~]|$)/u);
    expect(css.match(/container-name:\s*layout-header-shell/gu) ?? []).toHaveLength(1);
    const deprecatedSearchTriggerWidth = `--_header-search-trigger-${'width'}`;
    const deprecatedSearchTriggerCompactWidth = `${deprecatedSearchTriggerWidth}-compact`;
    const deprecatedSearchTriggerSelector = `search-trigger__${'placeholder'}`;
    expect(css).not.toContain(deprecatedSearchTriggerWidth);
    expect(css).not.toContain(deprecatedSearchTriggerCompactWidth);
    expect(css).not.toContain(deprecatedSearchTriggerSelector);

    expectRuleToDeclare(css, 'header[data-layout-header] .toc-trigger', ['display: none']);
    expectRuleToDeclare(
      css,
      "header[data-layout-header][data-sidebar-mode='fixed'] .sidebar-toggle",
      ['display: none'],
    );

    expectRuleToDeclare(css, 'header[data-layout-header] .search-trigger', [
      'inline-size: auto',
      'max-inline-size: min(var(--_header-search-trigger-max-inline-size), 24vi)',
      'border: var(--border-width, 1px) solid transparent',
      'background: transparent',
    ]);
    expectRuleToDeclare(css, 'header[data-layout-header] .search-trigger__icon', [
      'color: var(--fg-muted)',
    ]);
    expectRuleToDeclare(css, 'header[data-layout-header] .search-trigger__label', [
      'color: var(--fg-subtle)',
    ]);
    expectRuleToDeclare(css, 'header[data-layout-header] .search-trigger:hover', [
      'border-color: transparent',
    ]);

    const topLevelActiveSelectors = [
      'header[data-layout-header] .sidebar-toggle:active',
      'header[data-layout-header] .toc-trigger:active',
      'header[data-layout-header] .search-trigger:active',
      'header[data-layout-header] [data-header-menu] > [data-header-menu-trigger]:active',
    ] as const;
    const activeSelectors = [
      ...topLevelActiveSelectors,
      'header[data-layout-header] [data-header-menu-item]:active',
    ] as const;
    const normalizedTopLevelActiveSelectors = topLevelActiveSelectors.map((selector) =>
      normalizeAttributeQuoteStyle(normalizeSelector(selector)),
    );
    const normalizedSearchActiveSelector = normalizeAttributeQuoteStyle(
      normalizeSelector('header[data-layout-header] .search-trigger:active'),
    );
    const rootSearchActiveBackgroundRecords = [
      ...declarationRuleRecordsForSelector(
        css,
        'header[data-layout-header] .search-trigger:active',
        'background',
        { rootOnly: true },
      ),
      ...declarationRuleRecordsForSelector(
        css,
        'header[data-layout-header] .search-trigger:active',
        'background-color',
        { rootOnly: true },
      ),
    ];
    expect(rootSearchActiveBackgroundRecords).toHaveLength(1);
    for (const record of rootSearchActiveBackgroundRecords) {
      expect(record.value, 'search active background must not use --bg-active').not.toContain(
        '--bg-active',
      );
      for (const selector of normalizedTopLevelActiveSelectors) {
        expect(
          record.selectors,
          'search active background must be top-level common rule',
        ).toContain(selector);
      }
    }

    for (const selector of activeSelectors) {
      expect(declarationValuesForSelector(css, selector, 'transform'), selector).toEqual([]);
    }
    expectRuleToDeclare(css, topLevelActiveSelectors[0], [
      'background: var(--bg-hover, color-mix(in srgb, var(--bg-default) 88%, var(--fg-default) 12%))',
    ]);
    for (const selector of topLevelActiveSelectors) {
      const backgroundRecords = declarationRuleRecordsForSelector(css, selector, 'background', {
        rootOnly: true,
      });
      expect(
        backgroundRecords.some((record) =>
          normalizedTopLevelActiveSelectors.every((topLevelSelector) =>
            record.selectors.includes(topLevelSelector),
          ),
        ),
        `${selector} top-level active background rule`,
      ).toBe(true);
    }
    expectRuleToDeclare(css, 'header[data-layout-header] [data-header-menu-item]:active', [
      'background: var(--bg-hover, color-mix(in srgb, var(--bg-default) 88%, var(--fg-default) 12%))',
    ]);

    expectRuleToDeclare(css, 'header[data-layout-header] .corpus-trigger-icon', [
      'pointer-events: none',
      'transform-origin: center',
      'transition: transform var(--duration-fast, 120ms) var(--ease-out, ease-out)',
    ]);
    expectRuleToDeclare(css, 'header[data-layout-header] .theme-trigger-chevron', [
      'pointer-events: none',
      'transform-origin: center',
      'transition: transform var(--duration-fast, 120ms) var(--ease-out, ease-out)',
    ]);
    expectRuleToDeclare(css, 'header[data-layout-header] .corpus-trigger-icon *', [
      'pointer-events: none',
    ]);
    expectRuleToDeclare(css, 'header[data-layout-header] .theme-trigger-chevron *', [
      'pointer-events: none',
    ]);
    const corpusChevronOpenSelector = normalizeSelector(
      "header[data-layout-header] [data-header-menu='corpus'][open] > [data-header-menu-trigger] .corpus-trigger-icon",
    );
    const themeChevronOpenSelector = normalizeSelector(
      "header[data-layout-header] [data-header-menu='theme'][open] > [data-header-menu-trigger] .theme-trigger-chevron",
    );
    expectRuleToDeclare(css, corpusChevronOpenSelector, ['transform: rotate(180deg)']);
    expectRuleToDeclare(css, themeChevronOpenSelector, ['transform: rotate(180deg)']);

    const headerTargetsWithoutDirectTransform = [
      'header[data-layout-header] .theme-trigger-icon',
      'header[data-layout-header] .theme-trigger-main',
      'header[data-layout-header] .corpus-trigger-main',
      'header[data-layout-header] [data-header-menu-trigger]',
      'header[data-layout-header] [data-header-menu-item]',
    ] as const;
    for (const selector of headerTargetsWithoutDirectTransform) {
      expect(declarationValuesForSelector(css, selector, 'transform'), selector).toEqual([]);
    }

    postcss.parse(css).walkRules((rule: Rule) => {
      if (!splitSelectors(rule.selector).some((selector) => selector.includes(':active'))) return;
      expect(
        rule.nodes?.some((node) => node.type === 'decl' && node.prop === 'transform') ?? false,
        `${rule.selector} active rule must not declare transform`,
      ).toBe(false);
    });

    const topLevelFocusVisibleSelectors = [
      'header[data-layout-header] .sidebar-toggle:focus-visible',
      'header[data-layout-header] .toc-trigger:focus-visible',
      'header[data-layout-header] .search-trigger:focus-visible',
      'header[data-layout-header] [data-header-menu] > [data-header-menu-trigger]:focus-visible',
    ] as const;
    for (const selector of topLevelFocusVisibleSelectors) {
      expectRuleToDeclare(css, selector, [
        'outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250))',
        'outline-offset: var(--focus-ring-offset, 2px)',
      ]);
    }
    expectRuleToDeclare(css, 'header[data-layout-header] [data-header-menu-item]:focus-visible', [
      'outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250))',
      'outline-offset: var(--focus-ring-offset, 2px)',
    ]);

    const hitTargetSelectors = [
      'header[data-layout-header] .sidebar-toggle::after',
      'header[data-layout-header] .toc-trigger::after',
      'header[data-layout-header] .search-trigger::after',
      'header[data-layout-header] [data-header-menu] > [data-header-menu-trigger]::after',
      'header[data-layout-header] [data-header-menu-item]::after',
    ] as const;
    for (const selector of hitTargetSelectors) {
      expectRuleToDeclare(css, selector, [
        "content: ''",
        'inset-block: calc((var(--_header-hit-target-size) - 100%) / -2)',
        'inset-inline: calc((var(--_header-hit-target-size) - 100%) / -2)',
      ]);
    }

    const searchFocusVisibleSelector = 'header[data-layout-header] .search-trigger:focus-visible';

    expectRuleToDeclare(css, searchFocusVisibleSelector, [
      'outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250))',
      'outline-offset: var(--focus-ring-offset, 2px)',
      'box-shadow: none',
    ]);
    expect(
      rootDeclarationRecordsForSelector(css, searchFocusVisibleSelector, 'border-color'),
    ).toEqual([]);

    const compactDensity = atRuleBlock(css, '@container layout-header-shell (width < 960px)');
    expectRuleToDeclare(compactDensity, 'header[data-layout-header] .search-trigger', [
      'max-inline-size: min(var(--_header-search-trigger-max-inline-size-compact), 24vi)',
    ]);

    const iconOnlyDensity = atRuleBlock(css, '@container layout-header-shell (width < 640px)');
    expectRuleToDeclare(iconOnlyDensity, 'header[data-layout-header] .search-trigger__label', [
      'display: none',
    ]);

    const minimumDensity = atRuleBlock(css, '@container layout-header-shell (width < 400px)');
    expectRuleToDeclare(minimumDensity, 'header[data-layout-header] .search-trigger__label', [
      'display: none',
    ]);

    const reducedMotion = atRuleBlock(css, '@media (prefers-reduced-motion: reduce)');

    expectRuleToDeclare(reducedMotion, 'header[data-layout-header]', [
      'transition-duration: 0.01ms !important',
    ]);
    expectRuleToDeclare(reducedMotion, 'header[data-layout-header] *', [
      'transition-duration: 0.01ms !important',
    ]);

    for (const selector of activeSelectors) {
      expect(declarationValuesForSelector(reducedMotion, selector, 'transform'), selector).toEqual(
        [],
      );
    }

    const forcedColors = atRuleBlock(css, '@media (forced-colors: active)');
    expectRuleToDeclare(forcedColors, 'header[data-layout-header] .search-trigger', [
      'background: Canvas',
      'border-color: ButtonText',
    ]);
    const forcedColorsSearchActiveBackgroundRecords = [
      ...declarationRuleRecordsForSelector(
        forcedColors,
        'header[data-layout-header] .search-trigger:active',
        'background',
      ),
      ...declarationRuleRecordsForSelector(
        forcedColors,
        'header[data-layout-header] .search-trigger:active',
        'background-color',
      ),
    ];
    expect(forcedColorsSearchActiveBackgroundRecords).toHaveLength(1);
    for (const record of forcedColorsSearchActiveBackgroundRecords) {
      expect(record.value).toBe('ButtonFace');
      for (const selector of normalizedTopLevelActiveSelectors) {
        expect(record.selectors, 'forced-colors active background must be common rule').toContain(
          selector,
        );
      }
      expect(record.selectors, 'forced-colors active background includes menu items').toContain(
        normalizeAttributeQuoteStyle(
          normalizeSelector('header[data-layout-header] [data-header-menu-item]:active'),
        ),
      );
    }
    for (const selector of activeSelectors) {
      expectRuleToDeclare(forcedColors, selector, ['background: ButtonFace']);
    }
    expect(
      forcedColorsSearchActiveBackgroundRecords.every((record) =>
        record.selectors.includes(normalizedSearchActiveSelector),
      ),
    ).toBe(true);
    expectRuleToDeclare(forcedColors, searchFocusVisibleSelector, [
      'outline-color: Highlight',
      'box-shadow: none',
    ]);
    expectRuleToDeclare(forcedColors, 'header[data-layout-header] .search-trigger__icon', [
      'color: CanvasText',
    ]);
    expectRuleToDeclare(forcedColors, 'header[data-layout-header] .search-trigger__label', [
      'color: CanvasText',
    ]);

    const mobileVisibility = atRuleBlock(css, '@media (max-width: 639px)');
    expectRuleToDeclare(
      mobileVisibility,
      "header[data-layout-header] .toc-trigger[data-visible='true']",
      ['display: inline-flex'],
    );

    const tabletVisibility = atRuleBlock(css, '@media (min-width: 640px)');
    expectRuleToDeclare(
      tabletVisibility,
      "header[data-layout-header] .toc-trigger[data-visible='true']",
      ['display: none'],
    );

    const desktopVisibility = atRuleBlock(css, '@media (min-width: 1024px)');
    expectRuleToDeclare(
      desktopVisibility,
      "header[data-layout-header][data-note-layout='true'][data-sidebar-enabled='true'] .sidebar-toggle",
      ['display: none'],
    );

    const containerVisibilityContracts = [
      {
        atRule: '@container layout-header-shell (width < 640px)',
        selector: "header[data-layout-header] .toc-trigger[data-visible='true']",
      },
      {
        atRule: '@container layout-header-shell (width >= 640px)',
        selector: "header[data-layout-header] .toc-trigger[data-visible='true']",
      },
      {
        atRule: '@container layout-header-shell (width >= 1024px)',
        selector:
          "header[data-layout-header][data-note-layout='true'][data-sidebar-enabled='true'] .sidebar-toggle",
      },
    ] as const;

    for (const { atRule, selector } of containerVisibilityContracts) {
      const block = optionalAtRuleBlock(css, atRule);
      if (block === undefined) continue;
      expect(declarationValuesForSelector(block, selector, 'display')).toHaveLength(0);
    }

    const desktopContainer = atRuleBlock(css, '@container layout-header-shell (width >= 1024px)');
    expectRuleToDeclare(desktopContainer, 'header[data-layout-header] .corpus-switcher', [
      '--_header-corpus-inline-start-offset: var(--_header-primary-start-offset)',
    ]);
    expect(
      declarationValuesForSelector(
        desktopContainer,
        "header[data-layout-header][data-note-layout='true'][data-sidebar-enabled='true'] .corpus-switcher",
        '--_header-corpus-inline-start-offset',
      ),
    ).toEqual([]);
  });

  it('static choice menu CSS shares header menu surface tokens and fixes search menu declarations', () => {
    const header = readCss('layout-header.css');
    const css = readCss('static-choice-menu.css');

    const panel = '.static-choice-menu__panel';
    const item = '.static-choice-menu__item';
    const headerPanel = 'header[data-layout-header] .corpus-switcher__menu';
    const headerItem =
      "header[data-layout-header] [data-header-menu='corpus'] [data-header-menu-item]";

    expect(declarationValuesForSelector(css, panel, 'border')).toContain(
      'var(--static-choice-menu-panel-border)',
    );
    expect(
      declarationValuesForSelector(css, '.static-choice-menu', '--static-choice-menu-panel-border'),
    ).toContain('var(--border-width, 1px) solid var(--border-default)');
    expect(declarationValuesForSelector(header, headerPanel, 'border')).toContain(
      'var(--border-width, 1px) solid var(--border-default)',
    );

    expect(declarationValuesForSelector(css, panel, 'border-radius')).toContain(
      'var(--static-choice-menu-panel-radius)',
    );
    expect(
      declarationValuesForSelector(css, '.static-choice-menu', '--static-choice-menu-panel-radius'),
    ).toContain('var(--radius-md, 8px)');
    expect(declarationValuesForSelector(header, headerPanel, 'border-radius')).toContain(
      'var(--radius-md, 8px)',
    );

    expect(declarationValuesForSelector(css, panel, 'background')).toContain(
      'var(--static-choice-menu-panel-background)',
    );
    expect(
      declarationValuesForSelector(
        css,
        '.static-choice-menu',
        '--static-choice-menu-panel-background',
      ),
    ).toContain('var(--bg-default)');
    expect(declarationValuesForSelector(header, headerPanel, 'background')).toContain(
      'var(--bg-default)',
    );

    expect(declarationValuesForSelector(css, panel, 'box-shadow')).toContain(
      'var(--static-choice-menu-panel-shadow)',
    );
    expect(
      declarationValuesForSelector(css, '.static-choice-menu', '--static-choice-menu-panel-shadow'),
    ).toContain('var(--shadow-md)');
    expect(declarationValuesForSelector(header, headerPanel, 'box-shadow')).toContain(
      'var(--shadow-md)',
    );

    expect(declarationValuesForSelector(css, panel, 'padding')).toContain(
      'var(--static-choice-menu-panel-padding)',
    );
    expect(
      declarationValuesForSelector(
        css,
        '.static-choice-menu',
        '--static-choice-menu-panel-padding',
      ),
    ).toContain('var(--space-2, 8px)');
    expect(declarationValuesForSelector(header, headerPanel, 'padding')).toContain(
      'var(--space-2, 8px)',
    );

    expect(declarationValuesForSelector(css, item, 'border-radius')).toContain(
      'var(--static-choice-menu-item-radius)',
    );
    expect(
      declarationValuesForSelector(css, '.static-choice-menu', '--static-choice-menu-item-radius'),
    ).toContain('var(--radius-sm, 4px)');
    expect(declarationValuesForSelector(header, headerItem, 'border-radius')).toContain(
      'var(--radius-sm, 4px)',
    );

    expect(declarationValuesForSelector(css, item, 'padding')).toContain(
      'var(--static-choice-menu-item-padding)',
    );
    expect(
      declarationValuesForSelector(css, '.static-choice-menu', '--static-choice-menu-item-padding'),
    ).toContain('var(--space-2, 8px)');

    expect(
      declarationValuesForSelector(
        css,
        ".static-choice-menu__item[data-selected='true']",
        'background',
      ),
    ).toContain('var(--static-choice-menu-selected-background)');
    expect(
      declarationValuesForSelector(
        css,
        '.static-choice-menu',
        '--static-choice-menu-selected-background',
      ).map(normalizeDeclarationValue),
    ).toContain('var(--bg-surface-active, var(--bg-active, var(--bg-control-muted)))');

    expect(
      declarationValuesForSelector(css, '.static-choice-menu__item:hover', 'background'),
    ).toContain('var(--static-choice-menu-hover-background)');
    expect(
      declarationValuesForSelector(
        css,
        '.static-choice-menu',
        '--static-choice-menu-hover-background',
      ).map(normalizeDeclarationValue),
    ).toContain(
      'var(--bg-hover, color-mix(in srgb, var(--bg-default) 88%, var(--fg-default) 12%))',
    );

    for (const selector of [
      '.static-choice-menu__trigger:focus-visible',
      '.static-choice-menu__item:focus-visible',
    ]) {
      expect(declarationValuesForSelector(css, selector, 'outline')).toContain(
        'var(--static-choice-menu-focus-outline)',
      );
      expect(declarationValuesForSelector(css, selector, 'outline-offset')).toContain(
        'var(--static-choice-menu-focus-outline-offset)',
      );
    }
  });

  it('layout header overlay-open state only owns stacking and does not override glass surface', () => {
    const css = readCss('layout-header.css');
    const overlayOpenSelector = "header[data-layout-header][data-overlay-sidebar-open='true']";

    expectRuleToDeclare(css, overlayOpenSelector, [
      'z-index: var(--z-non-modal-panel, var(--z-modal, 300))',
    ]);

    expect(lacksDeclarationProperty(css, overlayOpenSelector, 'background')).toBe(true);
    expect(lacksDeclarationProperty(css, overlayOpenSelector, 'background-color')).toBe(true);
    expect(lacksDeclarationProperty(css, overlayOpenSelector, 'backdrop-filter')).toBe(true);
    expect(lacksDeclarationProperty(css, overlayOpenSelector, '-webkit-backdrop-filter')).toBe(
      true,
    );
  });

  it('layout header theme menu は専用 override で content-constrained 幅を持つこと', () => {
    const css = readCss('layout-header.css');
    const rootSelector = 'header[data-layout-header]';
    const corpusMenuSelector = 'header[data-layout-header] .corpus-switcher__menu';
    const themeMenuSelector = 'header[data-layout-header] .theme-switcher__menu';
    const themeItemSelector =
      "header[data-layout-header] [data-header-menu='theme'] [data-header-menu-item]";

    expectRuleToDeclare(css, rootSelector, [
      '--_header-theme-menu-viewport-inline-size:',
      '--_header-theme-menu-max-inline-size:',
      '--_header-theme-menu-min-inline-size: min(9rem, var(--_header-theme-menu-max-inline-size))',
    ]);
    expect(ruleBlock(css, rootSelector), `${rootSelector} rule`).not.to.contain(
      '--_header-theme-menu-min-inline-size: min(10rem',
    );

    const themeMenuBlocks = ruleBlocksForSelector(css, themeMenuSelector);
    expect(themeMenuBlocks.length, `${themeMenuSelector} rule count`).toBeGreaterThanOrEqual(2);
    const themeMenuOverrideBlock = themeMenuBlocks[themeMenuBlocks.length - 1] ?? '';
    expect(themeMenuOverrideBlock, `${themeMenuSelector} final override rule`).to.contain(
      'box-sizing: border-box',
    );
    expect(themeMenuOverrideBlock, `${themeMenuSelector} final override rule`).to.contain(
      'inline-size: max-content',
    );
    expect(themeMenuOverrideBlock, `${themeMenuSelector} final override rule`).to.contain(
      'min-inline-size: min(',
    );
    expect(themeMenuOverrideBlock, `${themeMenuSelector} final override rule`).to.contain(
      'max(100%, var(--_header-theme-menu-min-inline-size, 9rem))',
    );
    expect(themeMenuOverrideBlock, `${themeMenuSelector} final override rule`).not.to.contain(
      'var(--_header-theme-menu-min-inline-size, 10rem)',
    );
    expect(themeMenuOverrideBlock, `${themeMenuSelector} final override rule`).to.contain(
      'max-inline-size: var(--_header-theme-menu-max-inline-size)',
    );
    expect(themeMenuOverrideBlock, `${themeMenuSelector} final override rule`).to.contain(
      'inset-inline-end: 0',
    );
    expectRuleToDeclare(css, themeItemSelector, ['white-space: nowrap']);

    const themeMinInlineSizeRecords = rootDeclarationRecordsForSelector(
      css,
      themeMenuSelector,
      'min-inline-size',
    );
    const sharedMinInlineSizeRecord = themeMinInlineSizeRecords.find(
      (record) => record.value === '12rem',
    );
    const finalThemeMinInlineSizeRecord =
      themeMinInlineSizeRecords[themeMinInlineSizeRecords.length - 1];

    expect(
      sharedMinInlineSizeRecord,
      'shared generic theme menu min-inline-size',
    ).not.toBeUndefined();
    expect(finalThemeMinInlineSizeRecord, 'final theme menu min-inline-size').not.toBeUndefined();
    expect(finalThemeMinInlineSizeRecord?.value).not.toBe('12rem');
    expect(finalThemeMinInlineSizeRecord?.ruleIndex).toBeGreaterThan(
      sharedMinInlineSizeRecord?.ruleIndex ?? -1,
    );

    expect(ruleBlock(css, corpusMenuSelector)).not.to.contain('--_header-theme-menu-');
    expect(ruleBlock(css, themeMenuSelector)).not.to.contain('--_header-corpus-menu-');
  });

  it('layout header menu selected/current state uses quiet selected surface without check indicators', () => {
    const css = readCss('layout-header.css');
    const corpusItemSelector =
      "header[data-layout-header] [data-header-menu='corpus'] [data-header-menu-item]";
    const currentCorpusItemSelector = [
      'header[data-layout-header]',
      "[data-header-menu='corpus']",
      "[data-header-menu-item][aria-current='page']",
    ].join(' ');
    const corpusHoverSelector =
      "header[data-layout-header] [data-header-menu='corpus'] [data-header-menu-item]:hover";
    const corpusActiveSelector =
      "header[data-layout-header] [data-header-menu='corpus'] [data-header-menu-item]:active";
    const themeItemSelector =
      "header[data-layout-header] [data-header-menu='theme'] [data-header-menu-item]";
    const selectedThemeItemSelector =
      "header[data-layout-header] [data-header-menu='theme'] [data-header-menu-item][data-selected='true']";
    const menuItemFocusVisibleSelector =
      'header[data-layout-header] [data-header-menu-item]:focus-visible';
    const labelSelector = 'header[data-layout-header] .corpus-menu-item__label';
    const indicatorSelector = 'header[data-layout-header] .corpus-menu-item__indicator';
    const forbiddenCurrentProperties = [
      'border-inline-start',
      'border-inline-start-width',
      'border-inline-start-style',
      'border-inline-start-color',
      'outline',
    ];

    expectRuleToDeclare(css, corpusItemSelector, [
      'align-items: center',
      'font-weight: var(--font-normal, 400)',
    ]);
    expect(ruleBlock(css, corpusItemSelector)).not.to.contain('grid-template-columns: 1em');
    expect(ruleBlock(css, corpusItemSelector)).not.to.contain('grid-template-columns: 1em minmax');
    expect(ruleBlocksForSelector(css, indicatorSelector)).toHaveLength(0);
    expect(css).not.to.contain('corpus-menu-item__indicator--placeholder');
    expectRuleToDeclare(css, currentCorpusItemSelector, [
      'background: var(--_header-menu-selected-background)',
      'font-weight: var(--font-semibold, 600)',
    ]);
    expectRuleToDeclare(css, selectedThemeItemSelector, [
      'background: var(--_header-menu-selected-background)',
      'font-weight: var(--font-semibold, 600)',
    ]);
    expectRuleToDeclare(css, themeItemSelector, [
      'font-weight: var(--font-normal, 400)',
      'white-space: nowrap',
    ]);
    expect(ruleBlock(css, 'header[data-layout-header] [data-header-menu-item]')).not.to.contain(
      'font-weight: var(--font-normal, 400)',
    );
    expectRuleToDeclare(css, labelSelector, [
      'min-inline-size: 0',
      'white-space: nowrap',
      'overflow: hidden',
      'text-overflow: ellipsis',
    ]);

    for (const property of forbiddenCurrentProperties) {
      expect(
        rootDeclarationRecordsForSelector(css, currentCorpusItemSelector, property),
        `${currentCorpusItemSelector} root ${property}`,
      ).toHaveLength(0);
      expect(
        rootDeclarationRecordsForSelector(css, selectedThemeItemSelector, property),
        `${selectedThemeItemSelector} root ${property}`,
      ).toHaveLength(0);
    }

    const forcedColorsCss = atRuleBlock(css, '@media (forced-colors: active)');
    for (const property of forbiddenCurrentProperties) {
      expect(
        lacksDeclarationProperty(forcedColorsCss, currentCorpusItemSelector, property),
        `${currentCorpusItemSelector} forced-colors ${property}`,
      ).toBe(true);
      expect(
        lacksDeclarationProperty(forcedColorsCss, selectedThemeItemSelector, property),
        `${selectedThemeItemSelector} forced-colors ${property}`,
      ).toBe(true);
    }

    const forcedColorsSelectedBackgroundValues = [
      ...declarationValuesForSelector(forcedColorsCss, currentCorpusItemSelector, 'background'),
      ...declarationValuesForSelector(
        forcedColorsCss,
        currentCorpusItemSelector,
        'background-color',
      ),
      ...declarationValuesForSelector(forcedColorsCss, selectedThemeItemSelector, 'background'),
      ...declarationValuesForSelector(
        forcedColorsCss,
        selectedThemeItemSelector,
        'background-color',
      ),
    ].map(normalizeDeclarationValue);

    expect(
      forcedColorsSelectedBackgroundValues.some((value) => /\bHighlight\b/u.test(value)),
      'forced-colors selected/current background must not require Highlight surface',
    ).toBe(false);

    expectRuleToDeclare(css, corpusHoverSelector, ['background: var(--bg-hover']);
    expectRuleToDeclare(css, corpusActiveSelector, ['background: var(--bg-hover']);
    expectRuleToDeclare(css, menuItemFocusVisibleSelector, ['outline:', 'outline-offset:']);
    expect(ruleBlock(css, menuItemFocusVisibleSelector)).not.to.contain('background:');
  });

  it('search dialog CSS contains required layout and state declarations', () => {
    const css = readCss('search-dialog.css');
    expectRuleToDeclare(css, '.search-dialog', [
      'border:',
      'border-radius:',
      'max-block-size:',
      'box-shadow:',
      'grid-template-rows:',
    ]);
    expectRuleToDeclare(css, '.search-dialog__body', ['min-block-size:', 'overflow:']);
    expectRuleToDeclare(css, '.search-dialog__field', [
      'box-sizing: border-box',
      'position: relative',
    ]);
    expectRuleToDeclare(css, '.search-dialog__icon', ['inline-size:', 'block-size:']);
    expectRuleToDeclare(css, '.search-dialog[data-closing]', ['animation:']);
    expectRuleToDeclare(css, '.search-dialog__spinner', [
      'box-sizing: border-box',
      'inline-size:',
      'block-size:',
      'border:',
      'border-block-start-color: transparent',
      'animation: rouault-static-spinner-rotate',
    ]);
    expect(css).not.to.contain('.search-dialog__spinner::before');
    expect(css).to.contain('@keyframes rouault-static-spinner-rotate');
    expectRuleToDeclare(css, '.search-dialog__state-icon', ['inline-size:', 'block-size:']);
    expect(ruleBlock(css, ".search-dialog__result[aria-selected='true']")).to.match(
      /background:|outline:/u,
    );
    expectRuleToDeclare(css, '.search-dialog__virtual-spacer', ['block-size: 0']);
    expectRuleToDeclare(css, '.search-dialog__field::after', ['pointer-events: none']);
    expectRuleToDeclare(css, '.search-dialog__clear::after', ['pointer-events: none']);
    expectRuleToDeclare(css, '.search-dialog__field-icon', ['pointer-events: none']);
    expectRuleToDeclare(css, '.search-dialog__field-icon', [
      'inset-block-start: 50%',
      'transform: translateY(-50%)',
      'inline-size:',
      'block-size:',
    ]);
    expectRuleToDeclare(css, '.search-dialog__field-icon *', ['pointer-events: none']);
    expectRuleToDeclare(css, '.search-dialog__clear-icon', ['pointer-events: none']);
    expectRuleToDeclare(css, '.search-dialog__clear-icon *', ['pointer-events: none']);
    expectRuleToDeclare(css, '.search-dialog__icon', ['pointer-events: none']);
    expectRuleToDeclare(css, '.search-dialog__icon *', ['pointer-events: none']);
    expectRuleToDeclare(css, '.search-dialog__clear', [
      'box-sizing: border-box',
      'position: absolute',
      'inset-block-start: 50%',
      'inline-size: 44px',
      'block-size: 44px',
      'padding: 0',
      'transform: translateY(-50%)',
    ]);
    expect(lacksDeclarationProperty(css, '.search-dialog__clear', 'z-index')).toBe(true);

    const clearBeforeRootBlock = rootRuleRecordsForSelector(css, '.search-dialog__clear::before')
      .map((record) => record.block)
      .join('\n');
    expect(clearBeforeRootBlock).to.contain("content: ''");
    expect(clearBeforeRootBlock).to.contain('position: absolute');
    expect(clearBeforeRootBlock).to.contain('inset: 6px');
    expect(clearBeforeRootBlock).to.contain('z-index: 0');
    expect(clearBeforeRootBlock).to.contain('border-radius: inherit');
    expect(clearBeforeRootBlock).to.contain('background: transparent');
    expect(clearBeforeRootBlock).to.contain('pointer-events: none');

    expect(
      rootDeclarationRecordsForSelector(css, '.search-dialog__clear:hover', 'background').map(
        (record) => record.value,
      ),
    ).toEqual(['transparent']);
    expect(
      rootDeclarationRecordsForSelector(
        css,
        '.search-dialog__clear:hover::before',
        'background',
      ).map((record) => record.value),
    ).toContain('var(--bg-hover, var(--bg-fill-muted))');
    expect(
      rootDeclarationRecordsForSelector(css, '.search-dialog__close:hover', 'background').map(
        (record) => record.value,
      ),
    ).toContain('var(--bg-hover, var(--bg-fill-muted))');

    const clearIconRootBlock = rootRuleRecordsForSelector(css, '.search-dialog__clear-icon')
      .map((record) => record.block)
      .join('\n');
    expect(clearIconRootBlock).to.contain('position: relative');
    expect(clearIconRootBlock).to.contain('z-index: 1');
    expect(lacksDeclarationProperty(css, '.search-dialog__icon', 'position')).toBe(true);
    expect(lacksDeclarationProperty(css, '.search-dialog__icon', 'z-index')).toBe(true);

    const clearAfterRootBlock = rootRuleRecordsForSelector(css, '.search-dialog__clear::after')
      .map((record) => record.block)
      .join('\n');
    expect(clearAfterRootBlock).to.contain("content: ''");
    expect(clearAfterRootBlock).to.contain('position: absolute');
    expect(clearAfterRootBlock).to.contain('inset: calc(var(--space-2) * -1)');
    expect(clearAfterRootBlock).to.contain('pointer-events: none');

    const clearHoverRootRules = rootRuleRecordsForSelector(css, '.search-dialog__clear:hover');
    expect(
      clearHoverRootRules.some((record) =>
        record.selectors.includes('.search-dialog__close:hover'),
      ),
      'clear hover must not share the same root rule with close hover',
    ).toBe(false);

    const clearBeforeRootRules = rootRuleRecordsForSelector(css, '.search-dialog__clear::before');
    expect(
      clearBeforeRootRules.some(
        (record) =>
          record.selectors.includes('.search-dialog__clear::after') ||
          record.selectors.includes('.search-dialog__field::after'),
      ),
      'clear hover visual surface must not share the existing after hit-area rule',
    ).toBe(false);

    const clearHoverBeforeRootRules = rootRuleRecordsForSelector(
      css,
      '.search-dialog__clear:hover::before',
    );
    expect(
      clearHoverBeforeRootRules.some((record) =>
        record.selectors.includes('.search-dialog__close:hover'),
      ),
      'clear hover visual surface must not share the same root rule with close hover',
    ).toBe(false);
    expectRuleToDeclare(css, '.search-dialog [hidden]', ['display: none !important']);
    expectRuleToDeclare(css, '.search-dialog__results', [
      'flex: 1 1 auto',
      'min-block-size: 0',
      'overflow-y: auto',
    ]);
    const inputBlock = ruleBlock(css, '.search-dialog__input');
    expect(inputBlock).to.contain('box-sizing: border-box');
    expect(inputBlock).to.contain('display: block');
    expect(inputBlock).to.contain('inline-size: 100%');
    expect(inputBlock).to.contain('block-size: 44px');
    expect(inputBlock).to.contain('min-block-size: 44px');
    expect(inputBlock).to.contain('margin: 0');
    expect(inputBlock).to.contain('padding-block: 0');
    expect(inputBlock).not.to.match(/var\(--space-5\)(?!,)/u);
    expect(inputBlock).to.contain('padding-inline-start: calc(16px + var(--space-5, 20px))');
    expect(inputBlock).to.contain('padding-inline-end: calc(44px + var(--space-3, 12px))');
    expect(inputBlock).to.contain('font: inherit');
    expect(inputBlock).to.contain('outline: none');
    expect(inputBlock).to.contain('background: transparent');
    expect(inputBlock).to.contain('border: 0');
    expect(inputBlock).to.contain('appearance: none');
    expectRuleToDeclare(css, '.search-dialog__input:focus-visible', ['outline:']);
    const reducedMotion = atRuleBlock(css, '@media (prefers-reduced-motion: reduce)');
    for (const selector of [
      '.search-dialog',
      '.search-dialog[data-closing]',
      '.search-dialog::backdrop',
      '.search-dialog[data-closing]::backdrop',
      '.search-dialog__spinner',
      '.search-dialog__clear',
      '.search-dialog__close',
    ]) {
      expect(reducedMotion).to.contain(selector);
    }
    const forcedColors = atRuleBlock(css, '@media (forced-colors: active)');
    expectRuleToDeclare(forcedColors, '.search-dialog', [
      'color: CanvasText',
      'background: Canvas',
      'border-color: CanvasText',
    ]);
    expectRuleToDeclare(forcedColors, '.search-dialog__field', [
      'background: Field',
      'border-color: FieldText',
    ]);
    expectRuleToDeclare(forcedColors, '.search-dialog__input', ['color: FieldText']);
    expectRuleToDeclare(forcedColors, '.search-dialog__clear', ['color: ButtonText']);
    expectRuleToDeclare(forcedColors, '.search-dialog__close', ['color: ButtonText']);
    expectRuleToDeclare(forcedColors, '.search-dialog__spinner', [
      'color: CanvasText',
      'border-block-start-color: transparent',
    ]);
    expect(css).to.contain('@media print');
    expect(css).to.contain('@media (forced-colors: active)');
    expect(css).to.contain('@media (prefers-reduced-motion: reduce)');
  });

  it('search page CSS maps static lower-level UI recipes', () => {
    const css = readCss('search-page.css');
    const tokens = readCss('tokens.css');
    expect(tokens).toContain('--space-5: 1.25rem;');
    expectRuleToDeclare(css, '.search-controls', ['display: grid']);
    expectRuleToDeclare(css, '.search-input-field', ['border:', 'border-radius:']);
    expectRuleToDeclare(css, '.search-page [hidden]', ['display: none !important']);
    expectRuleToDeclare(css, '.search-input-field::after', ['pointer-events: none']);
    expectRuleToDeclare(css, '.filter-search-field::after', ['pointer-events: none']);
    expectRuleToDeclare(css, '.search-input-clear::after', ['pointer-events: none']);
    expectRuleToDeclare(css, '.filter-search-field__clear::after', ['pointer-events: none']);
    expectRuleToDeclare(css, '.search-input-field__icon', ['pointer-events: none']);
    expectRuleToDeclare(css, '.filter-search-field__icon', ['pointer-events: none']);
    expectRuleToDeclare(css, '.search-input-clear__icon', ['pointer-events: none']);
    expectRuleToDeclare(css, '.filter-search-field__clear-icon', ['pointer-events: none']);
    expect(ruleBlock(css, '.search-input-control')).to.contain(
      'padding-inline-start: calc(16px + var(--space-5, 20px))',
    );
    expect(ruleBlock(css, '.filter-search-control')).to.contain(
      'padding-inline-start: calc(16px + var(--space-5, 20px))',
    );
    expect(css).not.to.match(/var\(--space-5\)(?!,)/u);
    expectRuleToDeclare(css, '.filter-summary', ['grid-template-columns:']);
    expectRuleToDeclare(css, '.filter-summary-main', [
      'align-self: center',
      'font-weight: var(--font-semibold)',
    ]);
    expectRuleToDeclare(css, '.search-choice-field', ['display: grid', 'gap: var(--space-1)']);
    expect(css).not.to.contain('.sort-select');
    expect(css).not.to.contain('.tag-mode-select');
    expectRuleToDeclare(css, '.search-input-clear', ['cursor: pointer']);
    expectRuleToDeclare(css, '.filter-search-field__clear', ['cursor: pointer']);
    expectRuleToDeclare(css, '.filter-details__summary', [
      'position: relative',
      'list-style: none',
    ]);
    expectRuleToDeclare(css, '.filter-details__summary::after', [
      "content: ''",
      'position: absolute',
      'pointer-events: none',
    ]);
    expect(css).to.contain('.filter-details > summary::marker');
    expect(css).to.contain('.filter-details > summary::-webkit-details-marker');
    expectRuleToDeclare(css, '.filter-details__chevron', ['pointer-events: none', 'transition:']);
    expect(css).to.contain(
      '.filter-details[open] > .filter-details__summary .filter-details__chevron',
    );
    expectRuleToDeclare(css, '.filter-list', ['max-block-size:', 'overflow-y:']);
    expectRuleToDeclare(css, '.selected-tag', ['border:', 'border-radius:']);
    expectRuleToDeclare(css, '.selected-tag__remove', [
      'inline-size: 1.75rem',
      'block-size: 1.75rem',
      'cursor: pointer',
    ]);
    expectRuleToDeclare(css, '.selected-tag__remove-icon', ['pointer-events: none']);
    expectRuleToDeclare(css, '.selected-tag__remove-icon *', ['pointer-events: none']);
    expectRuleToDeclare(css, '.filter-option-checkbox__control', [
      'inline-size: 16px',
      'block-size: 16px',
    ]);
    expectRuleToDeclare(css, '.filter-option-checkbox__control', ['pointer-events: none']);
    expectRuleToDeclare(css, '.filter-option-checkbox__icon', ['opacity: 0']);
    expectRuleToDeclare(
      css,
      '.filter-option-checkbox__input:checked + .filter-option-checkbox__control .filter-option-checkbox__icon',
      ['opacity: 1'],
    );
    expectRuleToDeclare(css, ".filter-option[data-selected='true']", [
      'background: var(--bg-accent-muted, var(--bg-fill-muted))',
      'border-color: var(--border-accent, var(--border-default))',
    ]);
    expectRuleToDeclare(css, '.search-page__spinner', [
      'box-sizing: border-box',
      'inline-size:',
      'block-size:',
      'border:',
      'border-block-start-color: transparent',
      'animation: rouault-static-spinner-rotate',
    ]);
    expect(css).not.to.contain('.search-page__spinner::before');
    expect(css).to.contain('@keyframes rouault-static-spinner-rotate');
    expect(css).to.contain('@media (max-width: 640px)');
    expectRuleToDeclare(atRuleBlock(css, '@media (max-width: 640px)'), '.toolbar-row', [
      'align-items: stretch',
    ]);
    expect(css).to.contain('@media (prefers-color-scheme: dark)');
    expectRuleToDeclare(
      atRuleBlock(css, '@media (prefers-color-scheme: dark)'),
      ".filter-option[data-selected='true']",
      [
        'background: var(--bg-fill-muted)',
        'border-color: var(--border-accent, var(--border-default))',
      ],
    );
  });

  it('general code surface CSS exposes semantic static contracts', () => {
    const mainCss = readCss('main.css');
    const tokensCss = readCss('tokens.css');
    const codeSurfaces = readCss('code-surfaces.css');
    const staticCopyButton = readCss('static-copy-button.css');
    const imports = [...mainCss.matchAll(/@import\s+['"]([^'"]+)['"];/gu)].map((match) => match[1]);

    expect(imports.filter((path) => path === './code-surfaces.css')).toHaveLength(1);
    expect(imports.filter((path) => path === './static-copy-button.css')).toHaveLength(1);

    expectSelectorPresence(codeSurfaces, [
      'pre[data-code-block]',
      '[data-code-block-root]',
      'section[data-code-group]',
      '[data-code-group-panel]',
      '.code-surface-caption',
      '.code-surface-copy-button-shell',
      "[data-code-line-numbers='true']",
      "[data-code-has-line-state='true']",
      "[data-code-line-state='highlight']",
      "[data-code-line-state='add']",
      "[data-code-line-state='remove']",
      '.line::before',
      '.line::after',
    ]);
    expectSelectorPresence(staticCopyButton, ['.static-copy-control']);
    expectSelectorPresence(codeSurfaces, ['.static-copy-control']);

    expectSelectorMatchingRuleToDeclare(
      codeSurfaces,
      'code block scroll surface',
      (selector) => selector.includes('pre[data-code-block]'),
      [
        'font-family: var(--font-mono, monospace)',
        'font-size: var(--text-sm, 0.8125rem)',
        'font-weight: var(--font-normal, 400)',
        'line-height: var(--line-height-code, 1.5)',
        'letter-spacing: var(--tracking-normal, 0)',
        'font-style: normal',
        'overflow-x: auto',
        'overflow-y: hidden',
        'white-space: pre',
      ],
    );

    expect(declarationValuesForSelector(tokensCss, ':root', '--line-height-tight')).toContain(
      '1.25',
    );
    expect(declarationValuesForSelector(tokensCss, ':root', '--line-height-snug')).toContain(
      '1.35',
    );
    const lineHeightCodeValues = declarationValuesForSelector(
      tokensCss,
      ':root',
      '--line-height-code',
    ).map(normalizeDeclarationValue);
    expect(lineHeightCodeValues).toContain('var(--line-height-normal)');
    expect(lineHeightCodeValues).not.toContain('var(--line-height-snug)');
    expect(lineHeightCodeValues).not.toContain('var(--line-height-tight)');
    expect(lineHeightCodeValues).not.toContain('1.35');
    for (const value of lineHeightCodeValues) {
      expect(value, '--line-height-code must remain a token alias').not.toMatch(
        /^(?:\d+(?:\.\d+)?|\.\d+)$/u,
      );
    }
    expect(lineHeightCodeValues).not.toContain('1');

    expectSelectorMatchingRuleToDeclare(
      codeSurfaces,
      'Shiki dark system theme',
      (selector) =>
        selector.includes(":root:not([data-theme='light'])") &&
        selector.includes('pre[data-code-block]') &&
        selector.includes('.shiki'),
      ['background-color: transparent !important', 'color: var(--shiki-dark'],
    );
    expectSelectorMatchingRuleToDeclare(
      codeSurfaces,
      'Shiki explicit dark theme',
      (selector) =>
        selector.includes(":root[data-theme='dark']") &&
        selector.includes('pre[data-code-block]') &&
        selector.includes('.shiki'),
      ['background-color: transparent !important', 'color: var(--shiki-dark'],
    );

    expectSelectorMatchingRuleToDeclare(
      codeSurfaces,
      'code line number counter root',
      (selector) =>
        selector.includes("[data-code-line-numbers='true']") && selector.endsWith('code'),
      ['counter-reset: ui-code-block-line'],
    );
    expectSelectorMatchingRuleToDeclare(
      codeSurfaces,
      'code line number marker',
      (selector) =>
        selector.includes("[data-code-line-numbers='true']") && selector.includes('.line::after'),
      [
        'counter-increment: ui-code-block-line',
        'content: counter(ui-code-block-line)',
        'user-select: none',
        'pointer-events: none',
        'width: var(--space-8, 2rem)',
      ],
    );
    expectSelectorMatchingRuleToDeclare(
      codeSurfaces,
      'code line number gutter',
      (selector) =>
        selector.includes("[data-code-line-numbers='true']") &&
        selector.includes('.line') &&
        !selector.includes('::after') &&
        !selector.includes("[data-code-has-line-state='true']"),
      ['padding-inline-start: calc(var(--space-8, 2rem) + var(--space-2, 0.5rem))'],
    );

    expectSelectorMatchingRuleToDeclare(
      codeSurfaces,
      'highlighted code line',
      (selector) =>
        selector.includes('pre[data-code-block]') &&
        selector.includes("[data-code-line-state='highlight']"),
      ['background: color-mix(', 'var(--bg-highlight-subtle, oklch(96% 0.04 65)) 20%'],
    );
    expectSelectorMatchingRuleToDeclare(
      codeSurfaces,
      'diff added code line',
      (selector) =>
        selector.includes('pre[data-code-block]') &&
        selector.includes("[data-code-line-state='add']"),
      ['background: color-mix(', 'var(--bg-success-subtle, oklch(96% 0.04 145)) 50%'],
    );
    expectSelectorMatchingRuleToDeclare(
      codeSurfaces,
      'diff removed code line',
      (selector) =>
        selector.includes('pre[data-code-block]') &&
        selector.includes("[data-code-line-state='remove']"),
      ['background: color-mix(', 'var(--bg-danger-subtle, oklch(96% 0.03 25)) 50%'],
    );
    expect(codeSurfaces).not.toMatch(/\[data-code-line-state='add'\][\s\S]*?var\(--success[,)]/u);
    expect(codeSurfaces).not.toMatch(/\[data-code-line-state='remove'\][\s\S]*?var\(--danger[,)]/u);
    expect(codeSurfaces).not.toMatch(/\.line\.(?:highlighted|ui-explicit-highlight|diff)/u);

    expectSelectorMatchingRuleToDeclare(
      codeSurfaces,
      'state marker rail geometry',
      (selector) =>
        selector.includes("[data-code-has-line-state='true']") &&
        selector.includes('.line::before'),
      [
        "content: ''",
        'display: inline-block',
        'position: sticky',
        'inset-inline-start: 0',
        'inline-size: var(--ui-code-state-marker-rail-size)',
        'block-size: 1lh',
        'color: var(--fg-default',
        'pointer-events: none',
        'user-select: none',
      ],
    );
    expectSelectorMatchingRuleToDeclare(
      codeSurfaces,
      'state line number composition',
      (selector) =>
        selector.includes("[data-code-line-numbers='true'][data-code-has-line-state='true']") &&
        selector.includes('.line'),
      [
        'var(--space-8, 2rem)',
        'var(--ui-code-state-marker-rail-size)',
        'var(--ui-code-state-marker-gap)',
      ],
    );
    for (const state of ['highlight', 'add', 'remove']) {
      expectSelectorMatchingRuleToDeclare(
        codeSurfaces,
        `${state} state marker shape`,
        (selector) =>
          selector.includes(`[data-code-line-state='${state}']::before`) &&
          selector.includes("[data-code-has-line-state='true']"),
        ['background-image:', 'background-color: color-mix('],
      );
    }
    expect(codeSurfaces).not.toContain('font-size: var(--text-lg, 1rem)');
    for (const replacement of [
      '#8f4a52',
      '#67527c',
      '#4f6578',
      '#3f5f66',
      '#7a5b47',
      '#646a71',
      '#d08b90',
      '#b7a0cf',
      '#9bb0c2',
      '#9ab1b4',
      '#c3a087',
      '#8b949e',
    ]) {
      expect(codeSurfaces).not.toContain(replacement);
      expect(mainCss).not.toContain(replacement);
    }

    const forcedColors = atRuleBlock(codeSurfaces, '@media (forced-colors: active)');
    expectSelectorMatchingRuleToDeclare(
      forcedColors,
      'forced-colors state marker',
      (selector) =>
        selector.includes("[data-code-has-line-state='true']") &&
        selector.includes('.line::before'),
      ['color: CanvasText', 'background-color: Canvas', 'forced-color-adjust: none'],
    );
    const print = atRuleBlock(codeSurfaces, '@media print');
    expectSelectorMatchingRuleToDeclare(
      print,
      'print state marker',
      (selector) =>
        selector.includes("[data-code-has-line-state='true']") &&
        selector.includes('.line::before'),
      ['color: currentColor', 'background-color: white'],
    );
    expectSelectorMatchingRuleToDeclare(
      forcedColors,
      'forced-colors code focus',
      (selector) =>
        selector.includes('pre[data-code-block]') && selector.includes(':focus-visible'),
      ['box-shadow:'],
    );
    expectSelectorMatchingRuleToDeclare(
      forcedColors,
      'forced-colors code root focus',
      (selector) =>
        selector.includes('[data-code-block-root]') && selector.includes(':focus-within'),
      ['box-shadow:'],
    );
  });

  it('static copy button CSS exposes progressive enhancement and state contracts', () => {
    const css = readCss('static-copy-button.css');

    expectRuleToDeclare(css, '.static-copy-button', [
      'display: inline-flex',
      'inline-size: 2rem',
      'block-size: 2rem',
      'cursor: default',
    ]);
    expectRuleToDeclare(css, ".static-copy-button[data-copy-enhanced='true']:not(:disabled)", [
      'cursor: pointer',
    ]);
    expectRuleToDeclare(
      css,
      ".static-copy-button[data-copy-enhanced='true']:not(:disabled):hover",
      ['background:', 'border-color:'],
    );
    expectRuleToDeclare(css, '.static-copy-button:disabled', ['cursor: default', 'opacity: 0.45']);
    expectRuleToDeclare(css, ".static-copy-button[data-copy-state='copied']", [
      'color:',
      'background:',
      'border-color:',
    ]);
    expectRuleToDeclare(css, ".static-copy-button[data-copy-state='error']", [
      'color:',
      'background:',
      'border-color:',
    ]);

    const forcedColors = atRuleBlock(css, '@media (forced-colors: active)');
    expectRuleToDeclare(
      forcedColors,
      ".static-copy-button[data-copy-enhanced='true']:not(:disabled)",
      ['border-color: ButtonText'],
    );
    expectRuleToDeclare(forcedColors, ".static-copy-button[data-copy-state='copied']", [
      'border-color: Highlight',
    ]);
    expectRuleToDeclare(forcedColors, ".static-copy-button[data-copy-state='error']", [
      'border-color: Mark',
    ]);
  });

  it('code surface CSS owns overlay copy positioning with semantic surface tokens', () => {
    const css = readCss('code-surfaces.css');
    const staticCopyButton = readCss('static-copy-button.css');
    const overlayTokenProperties = [
      '--ui-code-copy-overlay-code-padding-block-start',
      '--ui-code-copy-overlay-center-offset',
      '--ui-code-copy-overlay-min-block-start',
      '--ui-code-copy-overlay-block-start',
    ] as const;
    expect(overlayTokenProperties).not.toContain('--ui-code-copy-control-inline-rail');

    const codeBlockRootRecords = rootRuleRecordsForSelector(css, '[data-code-block-root]').filter(
      (record) => record.selectors.length === 1,
    );
    const surfaceRootRecord = codeBlockRootRecords.find(
      (record) =>
        record.block.includes('position: relative') && record.block.includes('overflow: hidden'),
    );
    const layoutRootRecord = codeBlockRootRecords.find(
      (record) => record.block.includes('inline-size:') || record.block.includes('margin-inline:'),
    );

    expect(surfaceRootRecord, 'surface root rule').toBeDefined();
    expect(layoutRootRecord, 'layout root rule').toBeDefined();

    for (const property of overlayTokenProperties) {
      expect(
        declarationValuesForRuleRecord(surfaceRootRecord as SelectorRuleRecord, property),
        `${property} surface declaration`,
      ).toHaveLength(1);
      expect(
        declarationValuesForRuleRecord(layoutRootRecord as SelectorRuleRecord, property),
        `${property} layout declaration`,
      ).toEqual([]);
    }

    const overlayCaptionSelector =
      '[data-code-block-root].code-surface-root--overlay > .code-surface-caption';
    const overlayCaptionInsetBlockStart = declarationValuesForSelector(
      css,
      overlayCaptionSelector,
      'inset-block-start',
    ).map(normalizeDeclarationValue);
    expect(overlayCaptionInsetBlockStart).toEqual([
      'var(--ui-code-copy-overlay-block-start, var(--space-1, 4px))',
    ]);
    expect(overlayCaptionInsetBlockStart).not.toContain('var(--space-2, 8px)');

    const overlayBlockStartValue = normalizeDeclarationValue(
      declarationValuesForRuleRecord(
        surfaceRootRecord as SelectorRuleRecord,
        '--ui-code-copy-overlay-block-start',
      )[0] ?? '',
    );
    const overlayCenterOffsetValue = normalizeDeclarationValue(
      declarationValuesForRuleRecord(
        surfaceRootRecord as SelectorRuleRecord,
        '--ui-code-copy-overlay-center-offset',
      )[0] ?? '',
    );
    for (const property of overlayTokenProperties) {
      const normalizedValues = declarationValuesForRuleRecord(
        surfaceRootRecord as SelectorRuleRecord,
        property,
      ).map(normalizeDeclarationValue);
      expect(normalizedValues.join('\n'), `${property} shorthand safety`).not.toContain(
        '--ui-code-surface-padding',
      );
      expect(normalizedValues.join('\n'), `${property} block padding safety`).not.toContain(
        '--ui-code-block-padding',
      );
    }
    expect(overlayCenterOffsetValue).toBe('0.390625rem');
    expect(overlayCenterOffsetValue).not.toBe('var(--space-2, 8px)');
    expect(overlayBlockStartValue).toContain('max(var(--ui-code-copy-overlay-min-block-start)');
    expect(overlayBlockStartValue).toContain(
      'var(--ui-code-copy-overlay-code-padding-block-start)',
    );
    expect(overlayBlockStartValue).toContain('var(--ui-code-copy-overlay-center-offset)');
    expect(overlayBlockStartValue).not.toContain('max(0px');

    const copyFocusBlock = ruleBlock(staticCopyButton, '.static-copy-button:focus-visible');
    expect(copyFocusBlock, 'static copy button focus-visible rule').not.toBe('');
    expect(copyFocusBlock).toContain('outline:');
    expect(copyFocusBlock).toContain('outline-offset:');
  });

  it('code surface CSS aligns copy controls with the inline rail contract', () => {
    const css = readCss('code-surfaces.css');
    const copyControlInlineRailValue = 'var(--space-2, 8px)';
    const copyControlInlineRailReference =
      'var(--ui-code-copy-control-inline-rail, var(--space-2, 8px))';
    const codeBodyPaddingReference =
      'var(--ui-code-surface-padding, var(--ui-code-block-padding, var(--space-3, 12px)))';

    const codeBlockRootRecords = rootRuleRecordsForSelector(css, '[data-code-block-root]').filter(
      (record) => record.selectors.length === 1,
    );
    const surfaceRootRecord = codeBlockRootRecords.find(
      (record) =>
        record.block.includes('position: relative') &&
        record.block.includes('overflow: hidden') &&
        record.block.includes('border:') &&
        record.block.includes('background:') &&
        record.block.includes('border-radius:'),
    );
    const layoutRootRecord = codeBlockRootRecords.find(
      (record) => record.block.includes('inline-size:') || record.block.includes('margin-inline:'),
    );
    expect(surfaceRootRecord, 'code block surface root rule').toBeDefined();
    expect(layoutRootRecord, 'code block layout root rule').toBeDefined();
    if (surfaceRootRecord === undefined || layoutRootRecord === undefined) {
      throw new Error('code block root rules are missing');
    }

    expect(
      declarationValuesForRuleRecord(surfaceRootRecord, '--ui-code-copy-control-inline-rail'),
    ).toEqual([copyControlInlineRailValue]);
    expect(
      declarationValuesForRuleRecord(layoutRootRecord, '--ui-code-copy-control-inline-rail'),
    ).toEqual([]);

    const codeGroupRootRecord = rootRuleRecordsForSelector(css, 'section[data-code-group]').find(
      (record) =>
        record.block.includes('position: relative') &&
        record.block.includes('overflow: hidden') &&
        record.block.includes('border:') &&
        record.block.includes('background:') &&
        record.block.includes('border-radius:'),
    );
    expect(codeGroupRootRecord, 'code group base rule').toBeDefined();
    if (codeGroupRootRecord === undefined) throw new Error('code group base rule is missing');
    expect(
      declarationValuesForRuleRecord(codeGroupRootRecord, '--ui-code-copy-control-inline-rail'),
    ).toEqual([copyControlInlineRailValue]);

    const captionRecord = rootRuleRecordsForSelector(
      css,
      '[data-code-block-root] > .code-surface-caption',
    )[0];
    expect(captionRecord, 'normal caption rule').toBeDefined();
    if (captionRecord === undefined) throw new Error('normal caption rule is missing');
    expect(declarationValuesForRuleRecord(captionRecord, 'padding')).toEqual([]);
    expect(
      declarationValuesForRuleRecord(captionRecord, 'padding-block-start').map(
        normalizeDeclarationValue,
      ),
    ).toEqual(['var(--space-2, 8px)']);
    expect(
      declarationValuesForRuleRecord(captionRecord, 'padding-block-end').map(
        normalizeDeclarationValue,
      ),
    ).toEqual(['0']);
    expect(
      declarationValuesForRuleRecord(captionRecord, 'padding-inline-start').map(
        normalizeDeclarationValue,
      ),
    ).toEqual([codeBodyPaddingReference]);
    expect(
      declarationValuesForRuleRecord(captionRecord, 'padding-inline-end').map(
        normalizeDeclarationValue,
      ),
    ).toEqual([copyControlInlineRailReference]);

    const overlayCaptionSelector =
      '[data-code-block-root].code-surface-root--overlay > .code-surface-caption';
    expect(
      declarationValuesForSelector(css, overlayCaptionSelector, 'inset-inline-end').map(
        normalizeDeclarationValue,
      ),
    ).toEqual([copyControlInlineRailReference]);
    expect(declarationValuesForSelector(css, overlayCaptionSelector, 'padding')).toEqual(['0']);

    const rootHeaderToolsRecords = rootRuleRecordsForSelector(
      css,
      '.code-group-header-tools',
    ).filter((record) => record.selectors.length === 1);
    expect(rootHeaderToolsRecords).toHaveLength(1);
    const [rootHeaderToolsRecord] = rootHeaderToolsRecords;
    if (rootHeaderToolsRecord === undefined) {
      throw new Error('root code group header tools rule is missing');
    }
    expect(
      rootRuleRecordsForSelector(css, '.code-group-header-tools').flatMap((record) =>
        declarationValuesForRuleRecord(record, 'padding-inline'),
      ),
    ).toEqual([]);
    expect(
      declarationValuesForRuleRecord(rootHeaderToolsRecord, 'padding-inline-start').map(
        normalizeDeclarationValue,
      ),
    ).toEqual([copyControlInlineRailReference]);
    const headerToolsPaddingInlineEnd = declarationValuesForRuleRecord(
      rootHeaderToolsRecord,
      'padding-inline-end',
    ).map(normalizeDeclarationValue);
    expect(headerToolsPaddingInlineEnd).toEqual([copyControlInlineRailReference]);
    expect(headerToolsPaddingInlineEnd.join('\n')).not.toContain('--ui-code-surface-padding');
    expect(headerToolsPaddingInlineEnd.join('\n')).not.toContain('--ui-code-block-padding');

    const forcedColors = atRuleBlock(css, '@media (forced-colors: active)');
    const print = atRuleBlock(css, '@media print');
    for (const mediaCss of [forcedColors, print]) {
      expect(
        declarationValuesForSelector(mediaCss, '.code-group-header-tools', 'padding-inline'),
      ).toEqual([]);
      expect(
        declarationValuesForSelector(mediaCss, '.code-group-header-tools', 'padding-inline-start'),
      ).toEqual([]);
      expect(
        declarationValuesForSelector(mediaCss, '.code-group-header-tools', 'padding-inline-end'),
      ).toEqual([]);
    }
  });

  it('code surface CSS reserves overlay copy inline-end clearance only for eligible standalone overlays', () => {
    const css = readCss('code-surfaces.css');
    const staticCopyButton = readCss('static-copy-button.css');
    const overlayClearanceSelector =
      "[data-code-block-root].code-surface-root--overlay:not([data-code-group-owned='true']):has(> .code-surface-caption > .code-surface-copy-button-shell) > pre[data-code-block]";
    const overlayClearanceDeclarationValue = 'var(--ui-code-copy-overlay-code-padding-inline-end)';
    const overlayClearanceTokenProperties = [
      '--ui-code-copy-control-inline-size',
      '--ui-code-copy-overlay-code-padding-inline-end-base',
      '--ui-code-copy-overlay-inline-end-clearance',
      '--ui-code-copy-overlay-code-padding-inline-end',
    ] as const;

    const codeBlockRootRecords = rootRuleRecordsForSelector(css, '[data-code-block-root]').filter(
      (record) => record.selectors.length === 1,
    );
    const surfaceRootRecord = codeBlockRootRecords.find(
      (record) =>
        record.block.includes('position: relative') &&
        record.block.includes('overflow: hidden') &&
        record.block.includes('border:') &&
        record.block.includes('background:') &&
        record.block.includes('border-radius:'),
    );
    const layoutRootRecord = codeBlockRootRecords.find(
      (record) => record.block.includes('inline-size:') || record.block.includes('margin-inline:'),
    );
    expect(surfaceRootRecord, 'code block surface root rule').toBeDefined();
    expect(layoutRootRecord, 'code block layout root rule').toBeDefined();
    if (surfaceRootRecord === undefined || layoutRootRecord === undefined) {
      throw new Error('code block root rules are missing');
    }

    for (const property of overlayClearanceTokenProperties) {
      expect(
        declarationValuesForRuleRecord(surfaceRootRecord, property),
        `${property} surface declaration`,
      ).toHaveLength(1);
      expect(
        declarationValuesForRuleRecord(layoutRootRecord, property),
        `${property} layout declaration`,
      ).toEqual([]);
    }

    expect(
      declarationValuesForRuleRecord(surfaceRootRecord, '--ui-code-copy-control-inline-size').map(
        normalizeDeclarationValue,
      ),
    ).toEqual(['2rem']);
    expect(
      declarationValuesForSelector(staticCopyButton, '.static-copy-button', 'inline-size').map(
        normalizeDeclarationValue,
      ),
    ).toEqual(['2rem']);
    expect(
      declarationValuesForRuleRecord(
        surfaceRootRecord,
        '--ui-code-copy-overlay-code-padding-inline-end-base',
      ).map(normalizeDeclarationValue),
    ).toEqual(['var(--space-3, 12px)']);
    expect(
      declarationValuesForRuleRecord(
        surfaceRootRecord,
        '--ui-code-copy-overlay-inline-end-clearance',
      ).map(normalizeDeclarationValue),
    ).toEqual([
      'calc(var(--ui-code-copy-control-inline-rail) + var(--ui-code-copy-control-inline-size))',
    ]);
    expect(
      declarationValuesForRuleRecord(
        surfaceRootRecord,
        '--ui-code-copy-overlay-code-padding-inline-end',
      ).map(normalizeDeclarationValue),
    ).toEqual([
      'calc(var(--ui-code-copy-overlay-code-padding-inline-end-base) + var(--ui-code-copy-overlay-inline-end-clearance))',
    ]);

    for (const property of [
      '--ui-code-copy-overlay-inline-end-clearance',
      '--ui-code-copy-overlay-code-padding-inline-end',
    ] as const) {
      const normalizedValues = declarationValuesForRuleRecord(surfaceRootRecord, property).map(
        normalizeDeclarationValue,
      );
      expect(
        normalizedValues.join('\n'),
        `${property} surface padding shorthand safety`,
      ).not.toContain('--ui-code-surface-padding');
      expect(
        normalizedValues.join('\n'),
        `${property} block padding shorthand safety`,
      ).not.toContain('--ui-code-block-padding');
    }

    expect(
      declarationsForSelectorInMedia(
        css,
        overlayClearanceSelector,
        'padding-inline-end',
        (params) => normalizeDeclarationValue(params) === 'not print',
      ).map((declaration) => normalizeDeclarationValue(declaration.value)),
    ).toEqual([overlayClearanceDeclarationValue]);

    const overlayClearanceDeclarationLocations = declarationLocationsForPropertyValue(
      css,
      'padding-inline-end',
      overlayClearanceDeclarationValue,
    );
    expect(overlayClearanceDeclarationLocations.length).toBeGreaterThan(0);
    expect(
      overlayClearanceDeclarationLocations.map((record) => ({
        mediaParams: record.mediaParams,
        selector: record.selector,
      })),
    ).toEqual([
      {
        mediaParams: ['not print'],
        selector: normalizeAttributeQuoteStyle(normalizeSelector(overlayClearanceSelector)),
      },
    ]);

    const requiredHasFragment = ':has(>.code-surface-caption>.code-surface-copy-button-shell)';
    const requiredStandaloneFragment = ":not([data-code-group-owned='true'])";
    for (const record of overlayClearanceDeclarationLocations) {
      expect(record.mediaParams, `${record.selector} media scope`).toEqual(['not print']);
      expect(record.selector, `${record.selector} overlay root`).toContain(
        '[data-code-block-root].code-surface-root--overlay',
      );
      expect(record.selector, `${record.selector} copy shell gate`).toContain(requiredHasFragment);
      expect(record.selector, `${record.selector} group-owned exclusion`).toContain(
        requiredStandaloneFragment,
      );
      expect(record.selector, `${record.selector} code body target`).toContain(
        '>pre[data-code-block]',
      );
    }

    const overlayCaptionSelector =
      '[data-code-block-root].code-surface-root--overlay > .code-surface-caption';
    expect(
      declarationValuesForSelector(css, overlayCaptionSelector, 'inset-inline-end').map(
        normalizeDeclarationValue,
      ),
    ).toEqual(['var(--ui-code-copy-control-inline-rail, var(--space-2, 8px))']);
  });

  it('code surface CSS separates top-level breakout from inline and group-owned layouts', () => {
    const codeSurfaces = readCss('code-surfaces.css');
    const bridge = readCss('stateful-note-bridges.css');
    const isTopLevelProseCodeGroupSelector = (selector: string): boolean =>
      selector.includes('>section[data-code-group]') &&
      (selector.includes('.prose>section[data-code-group]') ||
        selector.includes('.about-prose>section[data-code-group]') ||
        (selector.includes(':is(') &&
          selector.includes('.prose') &&
          selector.includes('.about-prose')));

    expectRuleToDeclare(codeSurfaces, '[data-code-block-root]', [
      'inline-size: var(--ui-code-block-breakout-width, var(--ui-code-surface-breakout-width, 100%))',
      'margin-inline: var(--ui-code-block-breakout-margin, var(--ui-code-surface-breakout-margin, 0))',
      'max-inline-size: none',
    ]);
    expectRuleToDeclare(codeSurfaces, 'section[data-code-group]', [
      'inline-size: var(--ui-code-group-width, var(--ui-code-surface-breakout-width, 100%))',
      'margin-inline: var(--ui-code-group-margin-inline, var(--ui-code-surface-breakout-margin, 0))',
      'max-inline-size: none',
    ]);

    expectSelectorMatchingRuleToDeclare(
      codeSurfaces,
      'top-level single code block contained defaults',
      (selector) =>
        selector.includes(':is(.prose,.about-prose)') &&
        selector.includes('>figure[data-code-block-root]') &&
        !selector.includes('section[data-code-group]'),
      ['--ui-code-block-breakout-width: 100%', '--ui-code-block-breakout-margin: 0'],
    );
    expectSelectorMatchingRuleToDeclare(
      codeSurfaces,
      'top-level code group contained base defaults',
      (selector) =>
        selector.includes(':is(.prose,.about-prose)') &&
        selector.includes('>section[data-code-group]') &&
        !selector.includes('figure[data-code-block-root]'),
      ['--ui-code-group-width: 100%', '--ui-code-group-margin-inline: 0'],
    );

    const mobileCodeSurfaceLayout = atRuleBlock(codeSurfaces, '@media (max-width: 767px)');
    const desktopCodeSurfaceLayout = atRuleBlock(codeSurfaces, '@media (min-width: 768px)');

    for (const mediaBlock of [mobileCodeSurfaceLayout, desktopCodeSurfaceLayout]) {
      const topLevelCodeGroupLayoutOverrides = allRuleSelectors(mediaBlock).flatMap((selector) => {
        if (!isTopLevelProseCodeGroupSelector(selector)) return [];
        const block = ruleBlock(mediaBlock, selector);
        return [...block.matchAll(/--ui-code-group-(?:width|margin-inline)\s*:/gu)].map(
          (match) => `${selector} ${String(match[0])}`,
        );
      });
      expect(topLevelCodeGroupLayoutOverrides).toEqual([]);

      const figureSelectorsWithBreakoutDeclarations = allRuleSelectors(mediaBlock).filter(
        (selector) => {
          if (!selector.includes('figure[data-code-block-root]')) return false;
          const block = ruleBlock(mediaBlock, selector);
          return (
            block.includes('calc(100% + var(--space-8))') ||
            block.includes('calc(100% + var(--space-16))')
          );
        },
      );
      expect(figureSelectorsWithBreakoutDeclarations).toEqual([]);
    }

    expectSelectorMatchingRuleToDeclare(
      codeSurfaces,
      'inline code block root layout reset',
      (selector) =>
        selector.includes('figure[data-code-block-root]:has') &&
        selector.includes("pre[data-code-block][data-code-layout='inline']"),
      [
        '--ui-code-block-breakout-width: 100%',
        '--ui-code-block-breakout-margin: 0',
        '--ui-code-surface-breakout-width: 100%',
        '--ui-code-surface-breakout-margin: 0',
      ],
    );
    expectRuleToDeclare(codeSurfaces, "[data-code-block-root][data-code-group-owned='true']", [
      'inline-size: 100%',
      'max-inline-size: 100%',
      'margin-block: 0',
      'margin-inline: 0',
      'overflow: visible',
      'border: 0',
      'background: transparent',
      'border-radius: 0',
      'box-shadow: none',
    ]);
    expectRuleToDeclare(codeSurfaces, '.code-group-tablist', ['overflow-x: auto']);

    expect(
      ruleBlocksForSelectorsMatching(
        bridge,
        (selector) =>
          selector.includes('.prose') &&
          selector.includes('>') &&
          (selector.includes('pre[data-code-block]') ||
            selector.includes('section[data-code-group]') ||
            selector.includes('[data-code-block-root]')) &&
          !selector.includes('ui-tabs'),
      ),
    ).not.toMatch(/--ui-code-(?:surface|block|group)-/u);

    expectSelectorMatchingRuleToDeclare(
      bridge,
      'tabs panel code surface variable reset',
      (selector) =>
        selector.includes("ui-tabs>[slot='panel']") &&
        selector.includes('pre[data-code-block]') &&
        selector.includes('section[data-code-group]') &&
        selector.includes('[data-code-block-root]'),
      [
        '--ui-code-surface-breakout-width: 100%',
        '--ui-code-surface-breakout-margin: 0',
        '--ui-code-block-breakout-width: 100%',
        '--ui-code-block-breakout-margin: 0',
        '--ui-code-group-width: 100%',
        '--ui-code-group-margin-inline: 0',
      ],
    );
    expect(
      ruleBlocksForSelectorsMatching(bridge, (selector) =>
        selector.includes('[data-code-block-root]'),
      ),
    ).not.toMatch(/(?:^|\n)\s*(?:width|inline-size|margin-inline):/u);
    expect(
      ruleBlocksForSelectorsMatching(
        bridge,
        (selector) =>
          selector.includes('pre[data-code-block]') ||
          selector.includes('section[data-code-group]') ||
          selector.includes('[data-code-block-root]'),
      ),
    ).not.toMatch(/(?:^|\n)\s*(?:border|background|border-radius|box-shadow|overflow):/u);

    expectSelectorMatchingRuleToDeclare(
      bridge,
      'legacy prose pre media breakout excludes static code blocks',
      (selector) => selector.includes('.prose>pre:not([data-code-block])'),
      ['width: calc(100% + var('],
    );
    expect(
      ruleBlocksForSelectorsMatching(bridge, (selector) =>
        selector.includes('.prose>pre[data-code-block]'),
      ),
    ).to.equal('');
  });

  it('code surface CSS keeps group-owned code blocks embedded in the outer code group surface', () => {
    const css = readCss('code-surfaces.css');
    const codePreviewSource = readFileSync(
      resolve(process.cwd(), 'src/components/ui/code-preview/code-preview.ts'),
      'utf8',
    );
    const groupOwnedSelector = "[data-code-block-root][data-code-group-owned='true']";
    const groupOwnedFocusWithinSelector =
      "[data-code-block-root][data-code-group-owned='true']:focus-within";
    const groupOwnedFocusVisibleSelector =
      "[data-code-block-root][data-code-group-owned='true']:has(> pre[data-code-block]:focus-visible)";

    const visualResetRecords = rootRuleRecordsForSelector(css, groupOwnedSelector).filter(
      (record) => record.selectors.length === 1,
    );
    expect(visualResetRecords).toHaveLength(1);
    expect(visualResetRecords[0]?.block).toContain('margin-block: 0');
    expect(visualResetRecords[0]?.block).toContain('margin-inline: 0');
    expect(visualResetRecords[0]?.block).toContain('overflow: visible');
    expect(visualResetRecords[0]?.block).toContain('border: 0');
    expect(visualResetRecords[0]?.block).toContain('background: transparent');
    expect(visualResetRecords[0]?.block).toContain('border-radius: 0');
    expect(visualResetRecords[0]?.block).toContain('box-shadow: none');

    const normalSurfaceRecord = rootRuleRecordsForSelector(css, '[data-code-block-root]').find(
      (record) =>
        record.block.includes('border:') &&
        record.block.includes('background:') &&
        record.block.includes('border-radius:') &&
        record.block.includes('overflow: hidden'),
    );
    expect(normalSurfaceRecord, 'normal code block surface rule').toBeDefined();

    const genericFocusRecords = [
      ...rootRuleRecordsForSelector(css, '[data-code-block-root]:focus-within'),
      ...rootRuleRecordsForSelector(
        css,
        '[data-code-block-root]:has(> pre[data-code-block]:focus-visible)',
      ),
    ];
    expect(genericFocusRecords).toHaveLength(2);
    expect(genericFocusRecords.every((record) => record.block.includes('box-shadow:'))).toBe(true);

    const captionRecord = rootRuleRecordsForSelector(
      css,
      '[data-code-block-root] > .code-surface-caption',
    )[0];
    expect(captionRecord, 'caption rule').toBeDefined();
    expect(normalSurfaceRecord?.ruleIndex).toBeLessThan(visualResetRecords[0]?.ruleIndex ?? -1);
    for (const focusRecord of genericFocusRecords) {
      expect(focusRecord.ruleIndex).toBeLessThan(visualResetRecords[0]?.ruleIndex ?? -1);
    }
    expect(visualResetRecords[0]?.ruleIndex).toBeLessThan(captionRecord?.ruleIndex ?? -1);

    expectRuleToDeclare(css, groupOwnedFocusWithinSelector, ['box-shadow: none']);
    expectRuleToDeclare(css, groupOwnedFocusVisibleSelector, ['box-shadow: none']);
    const groupOwnedFocusRecords = [
      ...rootRuleRecordsForSelector(css, groupOwnedFocusWithinSelector),
      ...rootRuleRecordsForSelector(css, groupOwnedFocusVisibleSelector),
    ];
    for (const focusRecord of genericFocusRecords) {
      for (const groupOwnedFocusRecord of groupOwnedFocusRecords) {
        expect(focusRecord.ruleIndex).toBeLessThan(groupOwnedFocusRecord.ruleIndex);
      }
    }

    expectRuleToDeclare(css, '[data-code-block-root]', [
      'overflow: hidden',
      'border: var(--ui-code-block-border, 0)',
      'background: var(--ui-code-block-background, var(--bg-fill-muted, oklch(96% 0 0)))',
      'border-radius: var(--ui-code-block-radius-top, var(--radius-sm, 4px))',
    ]);
    expect(codePreviewSource).toContain('--ui-code-block-radius-top: 0');
    expectRuleToDeclare(css, '[data-code-block-root]:focus-within', ['box-shadow:']);
    expectRuleToDeclare(css, '[data-code-block-root]:has(> pre[data-code-block]:focus-visible)', [
      'box-shadow:',
    ]);

    const forcedColors = atRuleBlock(css, '@media (forced-colors: active)');
    const forcedGenericFocusRecords = [
      ...rootRuleRecordsForSelector(forcedColors, '[data-code-block-root]:focus-within'),
      ...rootRuleRecordsForSelector(
        forcedColors,
        '[data-code-block-root]:has(> pre[data-code-block]:focus-visible)',
      ),
    ];
    const forcedGroupOwnedFocusRecords = [
      ...rootRuleRecordsForSelector(forcedColors, groupOwnedFocusWithinSelector),
      ...rootRuleRecordsForSelector(forcedColors, groupOwnedFocusVisibleSelector),
    ];
    expect(forcedGenericFocusRecords).toHaveLength(2);
    expect(forcedGroupOwnedFocusRecords).toHaveLength(2);
    for (const forcedGroupOwnedFocusRecord of forcedGroupOwnedFocusRecords) {
      expect(forcedGroupOwnedFocusRecord.block).toContain('box-shadow: none');
      for (const forcedGenericFocusRecord of forcedGenericFocusRecords) {
        expect(forcedGenericFocusRecord.ruleIndex).toBeLessThan(
          forcedGroupOwnedFocusRecord.ruleIndex,
        );
      }
    }
  });

  it('code surface CSS keeps code group visibility and print contracts state-based', () => {
    const css = readCss('code-surfaces.css');

    expectRuleToDeclare(css, 'section[data-code-group] > [data-code-group-panel]', [
      'display: block',
    ]);
    expectRuleToDeclare(css, '.code-group-header', ['display: none']);
    expectRuleToDeclare(
      css,
      "section[data-code-group][data-code-group-enhanced='true'] > .code-group-header",
      [
        'display: flex',
        'border-block-end: var(--border-width, 1px) solid',
        'var(--border-muted, oklch(20% 0 0 / 0.06))',
      ],
    );
    expect(
      rootRuleRecordsForSelector(
        css,
        "section[data-code-group][data-code-group-enhanced='true'] > .code-group-header",
      ),
    ).toHaveLength(1);
    expectRuleToDeclare(
      css,
      "section[data-code-group]:not([data-code-group-enhanced='true']) .code-group-tablist",
      ['display: none'],
    );
    expectRuleToDeclare(
      css,
      "section[data-code-group][data-code-group-enhanced='true'] .code-group-tablist",
      ['display: flex'],
    );
    expectRuleToDeclare(
      css,
      "section[data-code-group][data-code-group-enhanced='true'] > [data-code-group-panel][data-code-group-panel-active='false']",
      ['display: none'],
    );
    const scripting = atRuleBlock(css, '@media screen and (scripting: enabled)');
    expectRuleToDeclare(
      scripting,
      "section[data-code-group]:not([data-code-group-enhanced='true']) > [data-code-group-panel][data-code-group-panel-active='false']",
      ['display: none'],
    );
    expect(ruleBlock(scripting, 'section[data-code-group] .code-group-stack-label')).toBe('');
    const legacyInactiveSelectors = allRuleSelectors(css).filter((selector) =>
      selector.includes("[data-code-group-inactive='true']"),
    );
    expect(legacyInactiveSelectors).toEqual([]);

    const codeGroupPanelHiddenSelectors = allRuleSelectors(css).filter((selector) =>
      selector.includes('[data-code-group-panel][hidden]'),
    );
    expect(codeGroupPanelHiddenSelectors).toEqual([]);
    expect(
      declarationValuesForSelector(
        css,
        'section[data-code-group] > [data-code-group-panel] > :where(pre[data-code-block], [data-code-block-root])',
        'padding-top',
      ),
    ).toEqual([]);
    expectRuleToDeclare(
      css,
      "section[data-code-group]:not([data-code-group-enhanced='true']) > [data-code-group-panel] > :where(pre[data-code-block], [data-code-block-root])",
      ['padding-top: var(--space-2, 8px)'],
    );
    expectRuleToDeclare(
      css,
      "section[data-code-group]:not([data-code-group-enhanced='true']) > [data-code-group-panel] + [data-code-group-panel]",
      [
        'border-block-start: var(--border-width, 1px) solid',
        'var(--border-muted, oklch(20% 0 0 / 0.06))',
      ],
    );

    expectRuleToDeclare(css, 'section[data-code-group]', [
      'border: var(--border-width, 1px) solid var(--border-muted, oklch(20% 0 0 / 0.06))',
      'background: var(--bg-fill-muted, oklch(96% 0 0))',
      'border-radius: var(--radius-sm, 4px)',
    ]);
    expectRuleToDeclare(css, '.code-group-header', ['background: transparent']);
    expectRuleToDeclare(css, '.code-group-tablist', ['background: transparent']);
    expectRuleToDeclare(css, '.code-group-header-tools', ['background: transparent']);

    const forcedColors = atRuleBlock(css, '@media (forced-colors: active)');
    expectRuleToDeclare(
      forcedColors,
      "section[data-code-group][data-code-group-enhanced='true'] > .code-group-header",
      ['border-block-end: 1px solid CanvasText'],
    );
    expectRuleToDeclare(
      forcedColors,
      "[data-code-block-root]:not([data-code-group-owned='true'])",
      ['border: 1px solid CanvasText', 'background: Canvas'],
    );
    const print = atRuleBlock(css, '@media print');
    expectRuleToDeclare(print, 'section[data-code-group] > .code-group-header', [
      'display: none !important',
    ]);
    expectRuleToDeclare(print, 'section[data-code-group] > [data-code-group-panel]', [
      'display: block !important',
    ]);
    expectRuleToDeclare(
      print,
      "section[data-code-group][data-code-group-enhanced='true'] > [data-code-group-panel]",
      ['display: block !important'],
    );
    expectRuleToDeclare(
      print,
      'section[data-code-group] > [data-code-group-panel] + [data-code-group-panel]',
      ['border-block-start: var(--border-width, 1px) solid currentColor'],
    );
    expectRuleToDeclare(print, "[data-code-block-root]:not([data-code-group-owned='true'])", [
      'border: var(--border-width, 1px) solid currentColor',
      'background: transparent !important',
    ]);
    expectRuleToDeclare(print, 'section[data-code-group]', [
      'border: var(--border-width, 1px) solid currentColor',
      'background: transparent !important',
    ]);
    expectRuleToDeclare(print, "[data-code-block-root][data-code-group-owned='true']", [
      'border: 0',
      'background: transparent !important',
    ]);
    expectRuleToDeclare(print, 'section[data-code-group] .code-group-stack-label', [
      'display: block !important',
    ]);
  });

  it('details, syntax, score, empty state, and corpora CSS expose static contracts', () => {
    const details = readCss('details-block.css');
    expectRuleToDeclare(details, '.details-block__summary', [
      'display: flex',
      'gap: var(--space-2)',
      'padding: var(--space-2) 0',
      'font-weight: var(--font-medium, 500)',
      'line-height: var(--line-height-normal)',
      'text-align: start',
    ]);
    expect(
      declarationValuesForSelector(details, '.details-block__summary-content', 'flex'),
    ).toEqual(['0 1 auto']);
    expect(ruleBlock(details, '.details-block__summary-content')).not.toContain('flex: 1 1 auto');
    expectRuleToDeclare(details, '.details-block__chevron.static-icon', [
      'inline-size: var(--icon-base, 16px)',
      'block-size: var(--icon-base, 16px)',
      'display: inline-flex',
      'align-self: var(--details-block-icon-align-self, flex-start)',
      'transition: transform var(--duration-fast) var(--ease-out)',
    ]);
    expect(
      declarationValuesForSelector(
        details,
        '.details-block__chevron.static-icon',
        'margin-block-start',
      ).map(normalizeDeclarationValue),
    ).toEqual([
      'var(--details-block-icon-offset-block-start, calc((1em * var(--line-height-normal, 1.5) - var(--icon-base, 16px)) / 2))',
    ]);
    expectRuleToDeclare(details, '.details-block__chevron.static-icon > svg', [
      'inline-size: 100%',
      'block-size: 100%',
    ]);
    expect(
      declarationValuesForSelector(details, '.details-block__body', 'margin-inline-start'),
    ).toEqual(['calc(var(--icon-base, 16px) + var(--space-2))']);
    expect(details).to.contain('.details-block__summary::marker');
    expect(details).to.contain('.details-block__summary::-webkit-details-marker');
    expect(
      declarationValuesForSelector(
        details,
        '.details-block[open] > .details-block__summary .details-block__chevron',
        'transform',
      ),
    ).toEqual(['rotate(90deg)']);
    expect(
      declarationsForSelector(details, '.details-block[open] > .details-block__body', 'border-top'),
    ).toHaveLength(0);
    expect(details).not.to.contain("data-variant='bordered'");

    const lists = readCss('lists.css');
    expectRuleToDeclare(lists, 'ol[data-list]', ['counter-reset:']);
    expectRuleToDeclare(lists, 'ol[data-list] > li', ['counter-increment:']);
    expectRuleToDeclare(lists, 'ol[data-list] > li[data-ol-has-value]', ['counter-set:']);

    const mainCss = readCss('main.css');
    const globalInlineCodeRuleRecords = rootRuleRecordsDeclaring(mainCss, [
      { property: 'font-family', value: 'var(--font-mono)' },
      { property: 'color', value: 'var(--fg-default)' },
      {
        property: 'background',
        value: 'color-mix(in oklab, var(--bg-fill-muted) 62%, var(--bg-default) 38%)',
      },
      { property: 'padding', value: '0.05em 0.25em' },
      { property: 'border-radius', value: '0.2em' },
    ]);
    expect(globalInlineCodeRuleRecords).toHaveLength(1);
    const globalInlineCodeSelectors = globalInlineCodeRuleRecords.flatMap(
      (record) => record.selectors,
    );
    expect(globalInlineCodeSelectors.every((selector) => selector.includes('code'))).toBe(true);
    for (const selector of globalInlineCodeSelectors) {
      expectRuleToDeclare(mainCss, selector, [
        'font-family: var(--font-mono)',
        'font-size: max(var(--text-xs), 0.875em)',
        'font-weight: inherit',
        'line-height: inherit',
        'vertical-align: baseline',
        'color: var(--fg-default)',
        'background: color-mix(in oklab, var(--bg-fill-muted) 62%, var(--bg-default) 38%)',
        'padding: 0.05em 0.25em',
        'border: none',
        'border-radius: 0.2em',
        'overflow-wrap: break-word',
        'box-decoration-break: clone',
        '-webkit-box-decoration-break: clone',
      ]);
    }
    for (const selector of globalInlineCodeSelectors) {
      expect(
        declarationsForSelectorInMedia(
          mainCss,
          selector,
          'outline',
          (params) => params.trim() === '(forced-colors: active)',
        ).map((declaration) => declaration.value.trim()),
      ).toEqual(['var(--border-width) solid CanvasText']);

      const printInlineCodeBackgrounds = declarationsForSelectorInMedia(
        mainCss,
        selector,
        'background',
        (params) => params.trim() === 'print',
      );
      expect(printInlineCodeBackgrounds.map((declaration) => declaration.value.trim())).toEqual([
        '#f5f5f5',
      ]);
      expect(printInlineCodeBackgrounds.every((declaration) => declaration.important)).toBe(true);
      expect(
        declarationsForSelectorInMedia(
          mainCss,
          selector,
          'padding',
          (params) => params.trim() === 'print',
        ).map((declaration) => declaration.value.trim()),
      ).toEqual(['2pt 4pt']);
      expect(
        declarationsForSelectorInMedia(
          mainCss,
          selector,
          'border',
          (params) => params.trim() === 'print',
        ).map((declaration) => declaration.value.trim()),
      ).toEqual(['none']);
      expect(
        declarationsForSelectorInMedia(
          mainCss,
          selector,
          'font-size',
          (params) => params.trim() === 'print',
        ).map((declaration) => declaration.value.trim()),
      ).toEqual(['10pt']);
    }

    const syntax = readCss('syntax.css');
    const syntaxSelectors = allRuleSelectors(syntax);
    const syntaxFieldNameTermSelectors = [
      '.syntax-field__name',
      'code.syntax-field__name',
      '.syntax-card .syntax-field__name',
    ] as const;
    const rootDeclarationValuesForSyntaxFieldName = (property: string): string[] =>
      syntaxFieldNameTermSelectors.flatMap((selector) =>
        declarationRuleRecordsForSelector(syntax, selector, property, { rootOnly: true }).map(
          (record) => record.value,
        ),
      );
    const isSyntaxFieldRowHoverSelector = (selector: string): boolean =>
      selector.split(',').some((selectorPart) => {
        const trimmedSelectorPart = selectorPart.trim();
        const syntaxFieldClassMatch = /(^|[\s>+~])\.syntax-field(?=$|[\s>+~.:[#])/.exec(
          trimmedSelectorPart,
        );

        if (!syntaxFieldClassMatch) {
          return false;
        }

        const syntaxFieldClassPrefix = syntaxFieldClassMatch[1] ?? '';
        const syntaxFieldCompoundSelector =
          trimmedSelectorPart
            .slice(syntaxFieldClassMatch.index + syntaxFieldClassPrefix.length)
            .split(/[\s>+~]/, 1)[0] ?? '';

        return syntaxFieldCompoundSelector.includes(':hover');
      });

    expectRuleToDeclare(syntax, '.syntax-card', [
      'margin-inline: var(',
      '--syntax-card-breakout-margin',
      '--ui-syntax-card-breakout-margin',
      'width: var(--syntax-card-breakout-width, var(--ui-syntax-card-breakout-width, 100%))',
    ]);

    expect(
      declarationRuleRecordsForSelector(syntax, '.syntax-card', 'border', {
        rootOnly: true,
      }).map((record) => record.value),
    ).toEqual(['var(--border-width) solid var(--border-muted)']);
    expect(
      declarationRuleRecordsForSelector(syntax, '.syntax-card', 'border-color', {
        rootOnly: true,
      }).map((record) => record.value),
    ).toEqual([]);
    expect(
      declarationRuleRecordsForSelector(syntax, '.syntax-card__header', 'border-bottom', {
        rootOnly: true,
      }).map((record) => record.value),
    ).toEqual(['0']);
    expect(
      declarationRuleRecordsForSelector(syntax, '.syntax-card__signature', 'border-bottom', {
        rootOnly: true,
      }).map((record) => record.value),
    ).toEqual(['var(--border-width) solid var(--border-ghost)']);
    expect(
      declarationRuleRecordsForSelector(syntax, '.syntax-card__kind', 'border', {
        rootOnly: true,
      }).map((record) => record.value),
    ).toEqual(['0']);
    expect(
      declarationRuleRecordsForSelector(syntax, '.syntax-card__kind', 'font-weight', {
        rootOnly: true,
      }).map((record) => record.value),
    ).toEqual(['var(--font-medium)']);
    expect(
      declarationRuleRecordsForSelector(syntax, '.syntax-card__kind', 'letter-spacing', {
        rootOnly: true,
      }).map((record) => record.value),
    ).toEqual(['0.06em']);
    expect(
      declarationRuleRecordsForSelector(syntax, '.syntax-card__kind', 'padding', {
        rootOnly: true,
      }).map((record) => record.value),
    ).toEqual(['0']);
    expect(
      declarationRuleRecordsForSelector(syntax, '.syntax-card__kind', 'border-radius', {
        rootOnly: true,
      }).map((record) => record.value),
    ).toEqual(['0']);
    expect(
      declarationRuleRecordsForSelector(syntax, '.syntax-card__kind', 'background', {
        rootOnly: true,
      }).map((record) => record.value),
    ).toEqual([]);
    expect(
      declarationRuleRecordsForSelector(syntax, '.syntax-card__kind', 'background-color', {
        rootOnly: true,
      }).map((record) => record.value),
    ).toEqual([]);
    expect(
      declarationRuleRecordsForSelector(syntax, '.syntax-card__content', 'gap', {
        rootOnly: true,
      }).map((record) => record.value),
    ).toEqual(['var(--space-5)']);
    expect(
      declarationRuleRecordsForSelector(syntax, '.syntax-section__heading', 'font-weight', {
        rootOnly: true,
      }).map((record) => record.value),
    ).toEqual(['var(--font-semibold)']);
    expect(
      declarationRuleRecordsForSelector(syntax, '.syntax-section__content > p', 'padding', {
        rootOnly: true,
      }).map((record) => record.value),
    ).toEqual(['0']);
    expect(
      declarationRuleRecordsForSelector(syntax, '.syntax-field__required', 'border', {
        rootOnly: true,
      }).map((record) => record.value),
    ).toEqual(['0']);
    expect(
      declarationRuleRecordsForSelector(syntax, '.syntax-field__required', 'font-family', {
        rootOnly: true,
      }).map((record) => record.value),
    ).toEqual(['var(--font-sans)']);
    expect(ruleBlock(syntax, '.syntax-field__required')).not.toContain('--fg-warning');
    expect(rootDeclarationValuesForSyntaxFieldName('background')).toContain('transparent');
    expect(rootDeclarationValuesForSyntaxFieldName('padding')).toContain('0');
    expect(rootDeclarationValuesForSyntaxFieldName('border-radius')).toContain('0');
    expect(declarationValuesForSelector(syntax, '.syntax-field__name', 'font-family')).toContain(
      'var(--font-mono)',
    );
    expect(declarationValuesForSelector(syntax, '.syntax-field__name', 'font-size')).toContain(
      'var(--text-sm)',
    );
    expect(declarationValuesForSelector(syntax, '.syntax-field__name', 'font-weight')).toContain(
      'var(--font-semibold)',
    );
    expect(declarationValuesForSelector(syntax, '.syntax-field__name', 'line-height')).toContain(
      'normal',
    );
    expect(declarationValuesForSelector(syntax, '.syntax-field__name', 'overflow-wrap')).toContain(
      'break-word',
    );
    for (const property of ['background', 'padding', 'border-radius', 'outline'] as const) {
      expect(declarationsForSelector(syntax, '.syntax-field__term code', property)).toHaveLength(0);
    }
    expect(
      declarationRuleRecordsForSelector(syntax, '.syntax-field__type', 'color', {
        rootOnly: true,
      }).map((record) => record.value),
    ).toEqual(['var(--fg-muted)']);
    expect(
      declarationRuleRecordsForSelector(syntax, '.syntax-field__type', 'font-family', {
        rootOnly: true,
      }).map((record) => record.value),
    ).toEqual(['var(--font-mono)']);
    expect(
      declarationRuleRecordsForSelector(syntax, '.syntax-field__default', 'color', {
        rootOnly: true,
      }).map((record) => record.value),
    ).toEqual(['var(--fg-muted)']);
    expect(
      declarationRuleRecordsForSelector(syntax, '.syntax-field__default', 'font-family', {
        rootOnly: true,
      }).map((record) => record.value),
    ).toEqual(['var(--font-mono)']);
    expect(
      declarationRuleRecordsForSelector(
        syntax,
        ".syntax-card[data-content-empty='true'] .syntax-card__signature",
        'border-bottom',
        { rootOnly: true },
      ).map((record) => record.value),
    ).toEqual(['0']);
    expect(
      declarationRuleRecordsForSelector(
        syntax,
        ".syntax-card[data-content-empty='true'] .syntax-card__content",
        'display',
        { rootOnly: true },
      ).map((record) => record.value),
    ).toEqual(['none']);
    expectRuleToDeclare(syntax, '.syntax-card__name', [
      'margin: 0',
      'min-width: 0',
      'line-height: var(--line-height-normal)',
    ]);
    expectRuleToDeclare(syntax, '.syntax-card__copy-action', [
      'opacity: 0',
      'pointer-events: none',
    ]);
    expectRuleToDeclare(syntax, '.syntax-card:hover .syntax-card__copy-action', [
      'opacity: 1',
      'pointer-events: auto',
    ]);
    expectRuleToDeclare(syntax, '.syntax-card:focus-within .syntax-card__copy-action', [
      'opacity: 1',
      'pointer-events: auto',
    ]);
    expect(syntaxSelectors.some(isSyntaxFieldRowHoverSelector)).toBe(false);
    expect(
      (optionalAtRuleBlock(syntax, '@media (hover: hover)') ?? '')
        .split(',')
        .some(isSyntaxFieldRowHoverSelector),
    ).toBe(false);
    expect(
      (optionalAtRuleBlock(syntax, '@media (prefers-reduced-motion: reduce)') ?? '')
        .split(',')
        .some(isSyntaxFieldRowHoverSelector),
    ).toBe(false);
    const coarsePointerSyntax = atRuleBlock(syntax, '@media (hover: none) and (pointer: coarse)');
    expectRuleToDeclare(coarsePointerSyntax, '.syntax-card__copy-action', [
      'opacity: 1',
      'pointer-events: auto',
    ]);
    expect(allRuleSelectors(syntax)).not.toContain('h2.syntax-card__name');
    expect(allRuleSelectors(syntax)).not.toContain('h3.syntax-section__heading');
    expectRuleToDeclare(syntax, '.syntax-card__signature pre', [
      'margin: 0',
      'background: transparent',
    ]);
    const desktopSyntax = optionalAtRuleBlock(syntax, '@media (min-width: 768px)');
    if (desktopSyntax !== undefined) {
      expect(
        declarationValuesForSelector(desktopSyntax, '.syntax-field', 'grid-template-columns'),
      ).toEqual([]);
    }
    const forcedColorsSyntax = atRuleBlock(syntax, '@media (forced-colors: active)');
    expectRuleToDeclare(forcedColorsSyntax, '.syntax-card', ['border-color: CanvasText']);
    const forcedColorsSyntaxFieldNameOutlines = declarationValuesForSelectors(
      forcedColorsSyntax,
      syntaxFieldNameTermSelectors,
      'outline',
    );
    expect(forcedColorsSyntaxFieldNameOutlines).toContain('0');
    expect(forcedColorsSyntaxFieldNameOutlines.every((value) => value === '0')).toBe(true);
    expect(
      declarationValuesForSelector(forcedColorsSyntax, '.syntax-field__required', 'border-color'),
    ).toEqual([]);
    const printSyntax = atRuleBlock(syntax, '@media print');
    expectRuleToDeclare(printSyntax, '.syntax-field', [
      'display: grid',
      'page-break-inside: avoid',
      'background: transparent',
      'padding: 0',
      'margin: 0',
    ]);
    const printSyntaxFieldNameBackgrounds = declarationsForSelectors(
      printSyntax,
      syntaxFieldNameTermSelectors,
      'background',
    );
    expect(
      printSyntaxFieldNameBackgrounds.map((declaration) => declaration.value.trim()),
    ).toContain('transparent');
    expect(
      printSyntaxFieldNameBackgrounds.every(
        (declaration) => declaration.value.trim() === 'transparent',
      ),
    ).toBe(true);
    expect(printSyntaxFieldNameBackgrounds.every((declaration) => declaration.important)).toBe(
      true,
    );
    const printSyntaxFieldNamePaddings = declarationValuesForSelectors(
      printSyntax,
      syntaxFieldNameTermSelectors,
      'padding',
    );
    expect(printSyntaxFieldNamePaddings).toContain('0');
    expect(printSyntaxFieldNamePaddings.every((value) => value === '0')).toBe(true);
    const printSyntaxFieldNameRadii = declarationValuesForSelectors(
      printSyntax,
      syntaxFieldNameTermSelectors,
      'border-radius',
    );
    expect(printSyntaxFieldNameRadii).toContain('0');
    expect(printSyntaxFieldNameRadii.every((value) => value === '0')).toBe(true);
    const printSyntaxFieldNameOutlines = declarationValuesForSelectors(
      printSyntax,
      syntaxFieldNameTermSelectors,
      'outline',
    );
    expect(printSyntaxFieldNameOutlines).toContain('0');
    expect(printSyntaxFieldNameOutlines.every((value) => value === '0')).toBe(true);
    expect(syntax).to.contain('@media print');

    const score = readCss('score.css');
    expectRuleToDeclare(score, '.score__scroll', ['overflow-x:', 'scrollbar-gutter:', 'border:']);
    expectRuleToDeclare(score, '.score__stage', ['aspect-ratio:']);
    expectRuleToDeclare(score, '.score__stage > svg', ['display: block']);
    expect(score).not.to.contain('score__svg');
    expect(score).not.to.contain('svg-host');
    expect(score).not.to.contain('score__skeleton');
    expect(score).not.to.contain('ui-score-shimmer');
    expect(score).to.contain('@media print');

    const footnotes = readCss('footnotes.css');
    expect(footnotes).not.to.contain('ui-footnote');

    const empty = readCss('empty-state.css');
    expectRuleToDeclare(empty, '.empty-hint__message', ['inline-size: min(100%, 40ch)']);
    expect(empty).to.contain('@keyframes empty-state-enter');

    const corpora = readCss('page-corpora.css');
    const removedCorporaRecentNoteSelectors = [
      '.corpora-overview__recent-list',
      '.corpora-overview__recent-item',
      '.corpora-overview__note-path',
      '.corpora-overview__note-meta',
      '.corpora-overview__genres',
      '.corpora-overview__note-summary',
    ] as const;

    expect(allRuleSelectors(corpora)).not.toContain('.corpora-overview__corpus-grid');
    expectRuleToDeclare(corpora, '.corpora-overview__corpus-index', [
      'display: grid',
      'gap: 0',
      'list-style: none',
    ]);
    expect(ruleBlock(corpora, '.corpora-overview__corpus-index')).not.toContain(
      'border-block-start:',
    );
    expectRuleToDeclare(corpora, '.corpora-overview__corpus-item', ['border-block-end:']);
    expectRuleToDeclare(corpora, '.corpus-index-row', [
      'display: grid',
      'padding-block: var(--space-4)',
      'color: inherit',
      'text-decoration: none',
    ]);
    expectRuleToDeclare(corpora, '.corpus-index-row__title', [
      'text-decoration-line: underline',
      'text-decoration-thickness: 0.04em',
      'text-underline-offset: 0.2em',
      'font-weight: var(--font-semibold, 600)',
    ]);
    expect(atRuleBlock(corpora, '@supports (color: oklch(from white l c h / 0.3))')).toContain(
      'oklch(from var(--fg-muted) l c h / 0.3)',
    );
    expect(corpora).not.toContain('oklch(from var(--fg-muted) l c h / 0.35)');
    expect(corpora).not.toContain('oklch(from var(--fg-muted) l c h / 0.65)');
    expectRuleToDeclare(corpora, '.corpus-index-row__path', [
      'color: var(--fg-muted)',
      'font-size: var(--text-sm)',
    ]);
    expectRuleToDeclare(corpora, '.corpus-index-row__meta', [
      'color: var(--fg-muted)',
      'font-size: var(--text-sm)',
    ]);
    expectRuleToDeclare(corpora, '.corpus-index-row:hover .corpus-index-row__title', [
      'text-decoration-color: currentColor',
    ]);
    expectRuleToDeclare(corpora, '.corpus-index-row:focus-visible', ['outline:']);
    expect(atRuleBlock(corpora, '@media (forced-colors: active)')).toContain(
      'outline-color: Highlight',
    );
    expect(ruleBlock(corpora, '.corpus-index-row__title')).not.toContain(
      '--link-decoration-color-subtle',
    );
    expect(ruleBlock(corpora, '.corpus-index-row__title')).not.toContain('--font-weight-semibold');
    expect(corpora).not.toContain('--link-decoration-color-subtle');
    expect(corpora).not.toContain('--font-weight-semibold');
    const corpusIndexRowHoverBlocks = ruleBlocksForSelectorsMatching(corpora, (selector) =>
      selector.includes('.corpus-index-row:hover'),
    );
    expect(corpusIndexRowHoverBlocks).not.toMatch(/(?:^|\n)\s*background(?:-color)?:/u);
    expect(corpusIndexRowHoverBlocks).not.toMatch(/(?:^|\n)\s*box-shadow:/u);
    expect(corpusIndexRowHoverBlocks).not.toMatch(/(?:^|\n)\s*transform:/u);
    expectRuleToDeclare(corpora, '.corpus-page .empty-hint[data-empty-state]', ['min-block-size:']);
    const ownedResultSelectors = allRuleSelectors(corpora).filter((selector) =>
      /\.result-(?:card|link|title|path|meta|excerpt)(?![-_a-zA-Z0-9])/u.test(selector),
    );
    expect(ownedResultSelectors).toEqual([]);
    for (const selector of removedCorporaRecentNoteSelectors) {
      expect(allRuleSelectors(corpora), selector).not.toContain(selector);
    }
  });

  it('footer CSS restores static footer visual contract', () => {
    const css = readCss('footer.css');

    expectRuleToDeclare(css, '.ui-footer[data-footer]', [
      'box-sizing: border-box',
      'border-block-start:',
      '--_footer-bg:',
      '--_footer-fg:',
      '--_footer-build-opacity:',
      '--_footer-build-fg:',
      '--_footer-separator-gap:',
      '--_footer-link-underline-offset:',
    ]);
    expectRuleToDeclare(css, '.ui-footer[data-footer] .ui-footer__inner', [
      'box-sizing: border-box',
    ]);
    expectRuleToDeclare(css, '.ui-footer[data-footer] .ui-footer__meta', ['display: grid']);
    expectRuleToDeclare(css, '.ui-footer[data-footer] .ui-footer__subline', [
      'display: flex',
      'align-items: baseline',
      'gap: 0',
    ]);
    expectRuleToDeclare(css, '.ui-footer[data-footer] .ui-footer__legal', ['display: inline-flex']);
    expectRuleToDeclare(css, '.ui-footer[data-footer] .ui-footer__nav-list', [
      'display: inline-flex',
    ]);
    expectRuleToDeclare(css, '.ui-footer[data-footer] .ui-footer__build', [
      'color: var(--_footer-build-fg)',
    ]);
    expect(
      lacksDeclarationProperty(css, '.ui-footer[data-footer] .ui-footer__build', 'opacity'),
    ).toBe(true);

    for (const selector of [
      '.ui-footer[data-footer] .ui-footer__build::before',
      '.ui-footer[data-footer] .ui-footer__nav::before',
      '.ui-footer[data-footer] .ui-footer__nav-item + .ui-footer__nav-item::before',
    ]) {
      expect(
        declarationValuesForSelector(css, selector, 'content').map(unquoteCssStringValue),
      ).toContain('·');
    }

    expect(ruleBlock(css, '.ui-footer[data-footer] .ui-footer__nav a')).toContain(
      'overflow-wrap: anywhere',
    );
    expectRuleToDeclare(
      css,
      ".ui-footer[data-footer] .ui-footer__nav [data-link-surface='navigation']",
      ['text-decoration-line: underline', 'text-decoration-color: transparent'],
    );
    expectRuleToDeclare(
      css,
      ".ui-footer[data-footer] .ui-footer__nav [data-link-surface='navigation']:hover",
      ['text-decoration-color: currentColor'],
    );
    expectRuleToDeclare(css, '.ui-footer[data-footer] .ui-footer__site a', [
      'text-decoration-line: none',
    ]);
    expect(css).toContain('@media (forced-colors: active)');
    expect(css).toContain('@media print');
    expect(ruleBlock(atRuleBlock(css, '@media print'), '.ui-footer[data-footer]')).toContain(
      'display: none !important',
    );
    expect(css).not.toContain('--space-5');
    expect(css).not.toContain('--space-7');

    const relativeColorSupportsBlock = listSupportsBlocks(css).find(
      (block) =>
        block.includes('--_footer-build-fg') &&
        block.includes('--footer-build-fg') &&
        block.includes('oklch(from var(--_footer-fg-muted)') &&
        block.includes('var(--_footer-build-opacity)'),
    );
    expect(relativeColorSupportsBlock).toBeDefined();

    const footerSelectors = allRuleSelectors(css).filter((selector) =>
      /\.ui-footer(?:__|[.[#:\s>+~]|$)/u.test(selector),
    );
    expect(footerSelectors.length).toBeGreaterThan(0);
    for (const selector of footerSelectors) {
      expect(selector.startsWith('.ui-footer[data-footer]'), selector).toBe(true);
    }

    const markerFixtures = [
      {
        selector:
          '.ui-footer[data-footer] :is(.ui-footer__site, .ui-footer__nav) a[data-external="true"]::after',
        allowed: false,
      },
      {
        selector: '.ui-footer[data-footer] a[data-label=","]::after',
        allowed: false,
      },
      {
        selector: ".ui-footer[data-footer] a[data-label='\\,']::after",
        allowed: false,
      },
      {
        selector: '.ui-footer[data-footer] .ui-footer__nav a[data-external="true"]::after',
        allowed: true,
      },
      {
        selector: '.ui-footer[data-footer] .ui-footer__nav + a[data-external="true"]::after',
        allowed: false,
      },
    ];
    for (const fixture of markerFixtures) {
      expect(isExternalMarkerSelectorLimitedToNav(fixture.selector), fixture.selector).toBe(
        fixture.allowed,
      );
    }

    const externalMarkerSelectors = allRuleSelectors(css).filter(selectorHasExternalNavMarker);
    expect(externalMarkerSelectors).toEqual([
      ".ui-footer[data-footer] .ui-footer__nav a[data-external='true']::after",
    ]);
    for (const selector of externalMarkerSelectors) {
      expect(isExternalMarkerSelectorLimitedToNav(selector), selector).toBe(true);
      expect(selector).not.toContain('.ui-footer__site');
    }
  });

  it('page shell CSS is split by responsibility', () => {
    const pageShell = readCss('page-shell.css');
    expectRuleToDeclare(pageShell, '.page-shell', ['--page-shell-padding-block-start']);
    expectRuleToDeclare(pageShell, '.page-shell .hero', ['display: grid']);

    const resultCard = readCss('result-card.css');
    expectRuleToDeclare(resultCard, '.page-shell .result-card', ['border:', 'background:']);
    expect(resultCard).not.to.contain('.hero');

    const homePage = readCss('home-page.css');
    expectRuleToDeclare(homePage, '.home-shell', ['--home-shell-padding-block-start']);
    expect(homePage).not.to.match(/\.hero\s*\{/u);
  });
});
