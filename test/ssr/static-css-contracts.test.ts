import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postcss, { type AtRule, type Declaration, type Rule } from 'postcss';
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

const ruleBlock = (css: string, selector: string): string => {
  const blocks: string[] = [];
  const normalizedSelector = normalizeAttributeQuoteStyle(normalizeSelector(selector));
  postcss.parse(css).walkRules((rule: Rule) => {
    if (splitSelectors(rule.selector).includes(normalizedSelector)) {
      blocks.push(rule.nodes?.map((node) => node.toString()).join('\n') ?? '');
    }
  });
  return blocks.join('\n');
};

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

const declarationValuesForSelector = (css: string, selector: string, property: string): string[] =>
  declarationsForSelector(css, selector, property).map((declaration) => declaration.value.trim());

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
  /\bapp-router\b/u,
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

  it('keeps root viewport gutter stable while dialog open states only own body scroll lock', () => {
    const mainCss = readCss('main.css');
    const dialogStateCss = readCss('dialog-state.css');
    const bodyOpenStateSelectors = [
      "body[data-ui-dialog-open]",
      "body[data-ui-search-dialog-open]",
    ] as const;

    expect(declarationValuesForSelector(mainCss, 'html', 'scrollbar-gutter')).toContain('stable');

    for (const selector of bodyOpenStateSelectors) {
      expect(declarationValuesForSelector(dialogStateCss, selector, 'overflow')).toContain(
        'hidden',
      );
      expect(lacksDeclarationProperty(dialogStateCss, selector, 'scrollbar-gutter')).toBe(true);
    }
  });

  it('router shell keeps desktop fixed-sidebar note frame outer gutter contract', () => {
    const css = readCss('router-shell.css');
    const selector = "app-router[data-sidebar-presence='present']";

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
    ]);
    expect(css).not.to.contain('layout-header-query-frame');
    expect(css).not.to.match(/(^|[,{]\s*)layout-header(?:[.#[:\s,{>+~]|$)/u);
    expect(css).not.to.match(/(^|[,{]\s*)ui-header(?:[.#[:\s,{>+~]|$)/u);
    expect(css.match(/container-name:\s*layout-header-shell/gu) ?? []).toHaveLength(1);

    expectRuleToDeclare(css, 'header[data-layout-header] .toc-trigger', ['display: none']);
    expectRuleToDeclare(
      css,
      "header[data-layout-header][data-sidebar-mode='fixed'] .sidebar-toggle",
      ['display: none'],
    );

    expectRuleToDeclare(css, 'header[data-layout-header] .search-trigger', [
      'border: var(--border-width, 1px) solid var(--border-default)',
      'background: var(--bg-control-muted)',
    ]);
    expectRuleToDeclare(css, 'header[data-layout-header] .search-trigger__icon', [
      'color: var(--fg-muted)',
    ]);
    expectRuleToDeclare(css, 'header[data-layout-header] .search-trigger__placeholder', [
      'color: var(--fg-subtle)',
    ]);

    const reducedMotion = atRuleBlock(css, '@media (prefers-reduced-motion: reduce)');
    const reducedMotionActiveSelectors = [
      'header[data-layout-header] .sidebar-toggle:active',
      'header[data-layout-header] .toc-trigger:active',
      'header[data-layout-header] .search-trigger:active',
      'header[data-layout-header] [data-header-menu] > [data-header-menu-trigger]:active',
      'header[data-layout-header] [data-header-menu-item]:active',
    ] as const;

    for (const selector of reducedMotionActiveSelectors) {
      expectRuleToDeclare(reducedMotion, selector, ['transform: none']);
    }

    const forcedColors = atRuleBlock(css, '@media (forced-colors: active)');
    expectRuleToDeclare(forcedColors, 'header[data-layout-header] .search-trigger', [
      'background: Canvas',
      'border-color: ButtonText',
    ]);
    expectRuleToDeclare(forcedColors, 'header[data-layout-header] .search-trigger:active', [
      'background: ButtonFace',
    ]);
    expectRuleToDeclare(forcedColors, 'header[data-layout-header] .search-trigger__icon', [
      'color: CanvasText',
    ]);
    expectRuleToDeclare(forcedColors, 'header[data-layout-header] .search-trigger__placeholder', [
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
    expectRuleToDeclare(css, '.sort-select', [
      'appearance: none',
      'cursor: pointer',
      'display: block',
      'font: inherit',
      'overflow: hidden',
      'text-align: start',
      'text-overflow: ellipsis',
      'white-space: nowrap',
    ]);
    expectRuleToDeclare(css, '.tag-mode-select', [
      'appearance: none',
      'cursor: pointer',
      'display: block',
      'font: inherit',
      'overflow: hidden',
      'text-align: start',
      'text-overflow: ellipsis',
      'white-space: nowrap',
    ]);
    expectRuleToDeclare(css, '.search-input-clear', ['cursor: pointer']);
    expectRuleToDeclare(css, '.filter-search-field__clear', ['cursor: pointer']);
    expectRuleToDeclare(css, '.sort-select:disabled', ['cursor: not-allowed']);
    expectRuleToDeclare(css, '.tag-mode-select:disabled', ['cursor: not-allowed']);
    expectRuleToDeclare(css, '.sort-select__chevron', ['pointer-events: none']);
    expectRuleToDeclare(css, '.tag-mode-select__chevron', ['pointer-events: none']);
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
      '.line::before',
      '.line.highlighted',
      '.line.ui-explicit-highlight',
      '.line.diff.add',
      '.line.diff.remove',
    ]);
    expectSelectorPresence(staticCopyButton, ['.static-copy-control']);
    expectSelectorPresence(codeSurfaces, ['.static-copy-control']);

    expectSelectorMatchingRuleToDeclare(
      codeSurfaces,
      'code block scroll surface',
      (selector) => selector.includes('pre[data-code-block]'),
      ['overflow-x: auto', 'overflow-y: hidden', 'white-space: pre'],
    );

    expectSelectorMatchingRuleToDeclare(
      codeSurfaces,
      'Shiki dark system theme',
      (selector) =>
        selector.includes(":root:not([data-theme='light'])") &&
        selector.includes('pre[data-code-block]') &&
        selector.includes('.shiki'),
      ['background-color: var(--shiki-dark-bg', 'color: var(--shiki-dark'],
    );
    expectSelectorMatchingRuleToDeclare(
      codeSurfaces,
      'Shiki explicit dark theme',
      (selector) =>
        selector.includes(":root[data-theme='dark']") &&
        selector.includes('pre[data-code-block]') &&
        selector.includes('.shiki'),
      ['background-color: var(--shiki-dark-bg', 'color: var(--shiki-dark'],
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
        selector.includes("[data-code-line-numbers='true']") && selector.includes('.line::before'),
      [
        'counter-increment: ui-code-block-line',
        'content: counter(ui-code-block-line)',
        'user-select: none',
        'pointer-events: none',
      ],
    );

    expectSelectorMatchingRuleToDeclare(
      codeSurfaces,
      'highlighted code line',
      (selector) =>
        selector.includes('pre[data-code-block]') &&
        (selector.includes('.line.highlighted') ||
          selector.includes('.line.ui-explicit-highlight')),
      ['background:'],
    );
    expectSelectorMatchingRuleToDeclare(
      codeSurfaces,
      'diff added code line',
      (selector) =>
        selector.includes('pre[data-code-block]') && selector.includes('.line.diff.add'),
      ['background:'],
    );
    expectSelectorMatchingRuleToDeclare(
      codeSurfaces,
      'diff removed code line',
      (selector) =>
        selector.includes('pre[data-code-block]') && selector.includes('.line.diff.remove'),
      ['background:'],
    );

    const forcedColors = atRuleBlock(codeSurfaces, '@media (forced-colors: active)');
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

  it('code surface CSS separates top-level breakout from inline and group-owned layouts', () => {
    const codeSurfaces = readCss('code-surfaces.css');
    const bridge = readCss('stateful-note-bridges.css');

    expectRuleToDeclare(codeSurfaces, '[data-code-block-root]', [
      'inline-size: var(',
      '--ui-code-block-breakout-width',
      '--ui-code-surface-breakout-width',
      'margin-inline: var(',
      '--ui-code-block-breakout-margin',
      '--ui-code-surface-breakout-margin',
      'max-inline-size: none',
    ]);
    expectRuleToDeclare(codeSurfaces, 'section[data-code-group]', [
      'inline-size: var(--ui-code-group-width, var(--ui-code-surface-breakout-width, 100%))',
      'margin-inline: var(--ui-code-group-margin-inline, var(--ui-code-surface-breakout-margin, 0))',
      'max-inline-size: none',
    ]);

    expectSelectorMatchingRuleToDeclare(
      codeSurfaces,
      'top-level code surface breakout defaults',
      (selector) =>
        selector.includes(':is(.prose,.about-prose)') &&
        selector.includes('figure[data-code-block-root]') &&
        selector.includes('section[data-code-group]'),
      ['--ui-code-surface-breakout-width: 100%', '--ui-code-surface-breakout-margin: 0'],
    );

    const mobileCodeSurfaceLayout = atRuleBlock(codeSurfaces, '@media (max-width: 767px)');
    expectSelectorMatchingRuleToDeclare(
      mobileCodeSurfaceLayout,
      'mobile top-level code surface breakout',
      (selector) =>
        selector.includes(':is(.prose,.about-prose)') &&
        selector.includes('figure[data-code-block-root]') &&
        selector.includes('section[data-code-group]'),
      ['--ui-code-surface-breakout-width: calc(100% + var(--space-8))'],
    );

    const desktopCodeSurfaceLayout = atRuleBlock(codeSurfaces, '@media (min-width: 768px)');
    expectSelectorMatchingRuleToDeclare(
      desktopCodeSurfaceLayout,
      'desktop top-level code surface breakout',
      (selector) =>
        selector.includes(':is(.prose,.about-prose)') &&
        selector.includes('figure[data-code-block-root]') &&
        selector.includes('section[data-code-group]'),
      ['--ui-code-surface-breakout-width: calc(100% + var(--space-16))'],
    );

    expectSelectorMatchingRuleToDeclare(
      codeSurfaces,
      'inline code block root layout reset',
      (selector) =>
        selector.includes('figure[data-code-block-root]:has') &&
        selector.includes("pre[data-code-block][data-code-layout='inline']"),
      ['--ui-code-surface-breakout-width: 100%', '--ui-code-surface-breakout-margin: 0'],
    );
    expectRuleToDeclare(codeSurfaces, "[data-code-block-root][data-code-group-owned='true']", [
      'inline-size: 100%',
      'max-inline-size: 100%',
      'margin-inline: 0',
    ]);

    expectSelectorMatchingRuleToDeclare(
      bridge,
      'prose bridge code surface variable handoff',
      (selector) =>
        selector.includes('.prose') &&
        selector.includes('section[data-code-group]') &&
        selector.includes('[data-code-block-root]'),
      ['--ui-code-surface-breakout-width: 100%', '--ui-code-surface-breakout-margin: 0'],
    );
    expect(
      ruleBlocksForSelectorsMatching(bridge, (selector) =>
        selector.includes('[data-code-block-root]'),
      ),
    ).not.toMatch(/(?:^|\n)\s*(?:width|inline-size|margin-inline):/u);

    expectSelectorMatchingRuleToDeclare(
      bridge,
      'legacy prose pre media breakout excludes static code blocks',
      (selector) => selector.includes('.prose>pre:not([data-code-block])'),
      ['width: calc(100% + var('],
    );
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
      ['display: flex'],
    );
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
    const legacyInactiveSelectors = allRuleSelectors(css).filter((selector) =>
      selector.includes("[data-code-group-inactive='true']"),
    );
    expect(legacyInactiveSelectors).toEqual([]);

    const codeGroupPanelHiddenSelectors = allRuleSelectors(css).filter((selector) =>
      selector.includes('[data-code-group-panel][hidden]'),
    );
    expect(codeGroupPanelHiddenSelectors).toEqual([]);

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
    expectRuleToDeclare(print, 'section[data-code-group] .code-group-stack-label', [
      'display: block !important',
    ]);
  });

  it('details, syntax, score, empty state, and corpora CSS expose static contracts', () => {
    const details = readCss('details-block.css');
    expectRuleToDeclare(details, '.details-block__chevron.static-icon', [
      'inline-size:',
      'block-size:',
      'transition:',
    ]);
    expectRuleToDeclare(details, '.details-block__chevron.static-icon > svg', [
      'inline-size: 100%',
      'block-size: 100%',
    ]);
    expect(details).to.contain('.details-block__summary::marker');
    expect(details).to.contain('.details-block__summary::-webkit-details-marker');
    expect(details).to.contain(
      '.details-block[open] > .details-block__summary .details-block__chevron',
    );
    expect(details).not.to.contain("data-variant='bordered'");

    const lists = readCss('lists.css');
    expectRuleToDeclare(lists, 'ol[data-list]', ['counter-reset:']);
    expectRuleToDeclare(lists, 'ol[data-list] > li', ['counter-increment:']);
    expectRuleToDeclare(lists, 'ol[data-list] > li[data-ol-has-value]', ['counter-set:']);

    const syntax = readCss('syntax.css');
    expectRuleToDeclare(syntax, '.syntax-card', [
      'margin-inline: var(',
      '--syntax-card-breakout-margin',
      '--ui-syntax-card-breakout-margin',
      'width: var(--syntax-card-breakout-width, var(--ui-syntax-card-breakout-width, 100%))',
    ]);
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
    expectRuleToDeclare(syntax, '.syntax-field__required', ['border:', 'color:']);
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
    expectRuleToDeclare(corpora, '.corpora-overview__corpus-grid', ['grid-template-columns:']);
    expectRuleToDeclare(corpora, '.corpus-page .empty-hint[data-empty-state]', ['min-block-size:']);
    expect(corpora).not.to.match(/\.result-(card|link|title|meta|excerpt)\s*\{/u);
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
