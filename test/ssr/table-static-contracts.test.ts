import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { expectCssExcludes, expectCssIncludes } from './css-contract-test-helpers.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const tableCssPath = path.resolve(dirname, '../../src/assets/css/table.css');
const tableCss = readFileSync(tableCssPath, 'utf8');

const extractSelectorPreludeList = (cssText: string): string[] => {
  const selectors: string[] = [];
  const rulePattern = /(^|[{}])\s*([^@{}][^{}]*)\{/gu;

  for (const match of cssText.matchAll(rulePattern)) {
    const selector = match[2]?.trim();
    if (selector) {
      selectors.push(selector);
    }
  }

  return selectors;
};

const splitSelectorPreludeListAtTopLevelComma = (selectorList: string): string[] => {
  const selectors: string[] = [];
  let current = '';
  let parenthesisDepth = 0;
  let bracketDepth = 0;
  let quote: '"' | "'" | null = null;

  for (const character of selectorList) {
    if (quote) {
      current += character;
      if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      current += character;
      continue;
    }

    if (character === '(') {
      parenthesisDepth += 1;
      current += character;
      continue;
    }

    if (character === ')') {
      parenthesisDepth = Math.max(0, parenthesisDepth - 1);
      current += character;
      continue;
    }

    if (character === '[') {
      bracketDepth += 1;
      current += character;
      continue;
    }

    if (character === ']') {
      bracketDepth = Math.max(0, bracketDepth - 1);
      current += character;
      continue;
    }

    if (character === ',' && parenthesisDepth === 0 && bracketDepth === 0) {
      selectors.push(current.trim());
      current = '';
      continue;
    }

    current += character;
  }

  const finalSelector = current.trim();
  if (finalSelector) {
    selectors.push(finalSelector);
  }

  return selectors;
};

const normalizeSelectorWhitespace = (selector: string): string => selector.replace(/\s+/gu, ' ').trim();

const tableScrollbarSelectorScopes = [
  ':is(.prose, .about-prose) > [data-table-root]',
  ":is(.prose, .about-prose) > ui-tabs > [slot='panel'] > [data-table-root]",
  ':is(.prose, .about-prose) > [data-table-scroll-rail]',
  ":is(.prose, .about-prose) > ui-tabs > [slot='panel'] > [data-table-scroll-rail]",
] as const;

const tableScrollbarPseudoPattern =
  /::-(?:webkit-scrollbar|webkit-scrollbar-track|webkit-scrollbar-corner|webkit-scrollbar-thumb|webkit-scrollbar-button)/u;

const bareTableScrollbarSelectorPattern =
  /(?:^|,)\s*::-(?:webkit-scrollbar|webkit-scrollbar-track|webkit-scrollbar-corner|webkit-scrollbar-thumb|webkit-scrollbar-button)(?:\b|:)/u;

const directTableScrollbarPseudoPattern =
  /\[data-table-(?:root|scroll-rail)\]::-(?:webkit-scrollbar|webkit-scrollbar-track|webkit-scrollbar-corner|webkit-scrollbar-thumb|webkit-scrollbar-button)(?:\b|:)/u;

describe('table static css contracts', () => {
  it('prose 内 table root が static scroll container / focus-visible / reduced-motion 契約を保持すること', () => {
    expectCssIncludes(tableCss, [
      ':is(.prose, .about-prose) > [data-table-root]',
      ":is(.prose, .about-prose) > ui-tabs > [slot='panel'] > [data-table-root]",
      'width: 100%',
      'margin-inline: 0',
      'box-sizing: border-box',
      'overflow-x: auto',
      'overflow-y: visible',
      'scrollbar-width: thin',
      'scrollbar-color: var(--_table-scrollbar-thumb) var(--_table-scrollbar-track)',
      '-webkit-text-size-adjust: none',
      'text-size-adjust: none',
      'outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color',
      'animation: var(--animation-focus)',
      '@media (prefers-reduced-motion: reduce)',
      'animation: none',
    ]);
  });

  it('static table root が base / caption / tfoot / multiple tbody / compact density 契約を保持すること', () => {
    expectCssIncludes(tableCss, [
      '[data-table-root] > table',
      'border-collapse: collapse',
      'width: max-content',
      'min-width: 100%',
      '[data-table-root] > table > caption',
      'caption-side: top',
      '[data-table-root] > table tfoot tr:first-child',
      '[data-table-root] > table tbody + tbody',
      "[data-table-root][data-density='compact'] > table th",
      "[data-table-root][data-density='compact'] > table td",
      'font-size: var(--text-sm, 0.8125rem)',
    ]);
  });

  it('horizontal overflow affordance は root layout selector に限定し shadow layer を合成すること', () => {
    expectCssIncludes(tableCss, [
      '--_table-scroll-fade-left-shadow: inset 0 0 0 0 transparent',
      '--_table-scroll-fade-right-shadow: inset 0 0 0 0 transparent',
      '--_table-scroll-fade-color: oklch(from var(--fg-default, oklch(20% 0 0)) l c h / 0.16)',
      'box-shadow:\n    var(--_table-scroll-fade-left-shadow),\n    var(--_table-scroll-fade-right-shadow)',
      ':is(.prose, .about-prose) > [data-table-root][data-fade-left]',
      ":is(.prose, .about-prose) > ui-tabs > [slot='panel'] > [data-table-root][data-fade-left]",
      ':is(.prose, .about-prose) > [data-table-root][data-fade-right]',
      ":is(.prose, .about-prose) > ui-tabs > [slot='panel'] > [data-table-root][data-fade-right]",
      '--_table-scroll-fade-left-shadow: inset 14px 0 14px -14px var(--_table-scroll-fade-color)',
      '--_table-scroll-fade-right-shadow: inset -14px 0 14px -14px var(--_table-scroll-fade-color)',
      '@media (forced-colors: active)',
      '--_table-scroll-fade-left-shadow: inset 2px 0 0 0 CanvasText',
      '--_table-scroll-fade-right-shadow: inset -2px 0 0 0 CanvasText',
    ]);

    expectCssExcludes(tableCss, [
      'inset 18px 0 18px -18px oklch(0% 0 0 / 0.24)',
      'inset -18px 0 18px -18px oklch(0% 0 0 / 0.24)',
    ]);
  });

  it('overflow affordance state selector を裸 selector として公開しないこと', () => {
    const bareOverflowAffordanceStateSelector =
      /^\[data-(?:overflow|fade-left|fade-right)(?:=['"]?true['"]?)?\]$/u;
    const selectors = extractSelectorPreludeList(tableCss);

    for (const selectorList of selectors) {
      for (const selector of splitSelectorPreludeListAtTopLevelComma(selectorList)) {
        expect(selector.trim()).not.toMatch(bareOverflowAffordanceStateSelector);
      }
    }
  });

  it('table root / top rail は thin native scrollbar の視覚契約を保持すること', () => {
    expectCssIncludes(tableCss, [
      ':is(.prose, .about-prose) > [data-table-root]',
      ":is(.prose, .about-prose) > ui-tabs > [slot='panel'] > [data-table-root]",
      ':is(.prose, .about-prose) > [data-table-scroll-rail]',
      ":is(.prose, .about-prose) > ui-tabs > [slot='panel'] > [data-table-scroll-rail]",
      '--_table-scrollbar-size: 8px',
      '--_table-scrollbar-track: transparent',
      '--_table-scrollbar-thumb: color-mix(',
      'var(--scrollbar-thumb, var(--fg-control-affordance, oklch(60% 0 0))) 48%',
      'scrollbar-width: thin',
      'scrollbar-color: var(--_table-scrollbar-thumb) var(--_table-scrollbar-track)',
      '@media (forced-colors: active)',
      'scrollbar-color: auto',
      'background-color: CanvasText',
      'border-color: Canvas',
    ]);
  });

  it('table scrollbar WebKit 補助 selector と宣言は table root / top rail に限定されること', () => {
    expectCssIncludes(tableCss, [
      ':is(.prose, .about-prose) > [data-table-root]::-webkit-scrollbar',
      ":is(.prose, .about-prose) > ui-tabs > [slot='panel'] > [data-table-root]::-webkit-scrollbar",
      'width: var(--_table-scrollbar-size)',
      'height: var(--_table-scrollbar-size)',
      ':is(.prose, .about-prose) > [data-table-root]::-webkit-scrollbar-track',
      ":is(.prose, .about-prose)\n  > ui-tabs\n  > [slot='panel']\n  > [data-table-root]::-webkit-scrollbar-track",
      ':is(.prose, .about-prose) > [data-table-root]::-webkit-scrollbar-corner',
      ":is(.prose, .about-prose)\n  > ui-tabs\n  > [slot='panel']\n  > [data-table-root]::-webkit-scrollbar-corner",
      ':is(.prose, .about-prose) > [data-table-root]::-webkit-scrollbar-thumb',
      ":is(.prose, .about-prose)\n  > ui-tabs\n  > [slot='panel']\n  > [data-table-root]::-webkit-scrollbar-thumb",
      'background-color: var(--_table-scrollbar-track)',
      'background-color: var(--_table-scrollbar-thumb)',
      'background-clip: content-box',
      'border: 2px solid transparent',
      ':is(.prose, .about-prose) > [data-table-scroll-rail]::-webkit-scrollbar',
      ":is(.prose, .about-prose)\n  > ui-tabs\n  > [slot='panel']\n  > [data-table-scroll-rail]::-webkit-scrollbar",
      ':is(.prose, .about-prose) > [data-table-scroll-rail]::-webkit-scrollbar-track',
      ":is(.prose, .about-prose)\n  > ui-tabs\n  > [slot='panel']\n  > [data-table-scroll-rail]::-webkit-scrollbar-track",
      ':is(.prose, .about-prose) > [data-table-scroll-rail]::-webkit-scrollbar-corner',
      ":is(.prose, .about-prose)\n  > ui-tabs\n  > [slot='panel']\n  > [data-table-scroll-rail]::-webkit-scrollbar-corner",
      ':is(.prose, .about-prose) > [data-table-scroll-rail]::-webkit-scrollbar-thumb',
      ":is(.prose, .about-prose)\n  > ui-tabs\n  > [slot='panel']\n  > [data-table-scroll-rail]::-webkit-scrollbar-thumb",
      '[data-table-root]::-webkit-scrollbar-button',
      '[data-table-scroll-rail]::-webkit-scrollbar-button',
      'display: none',
      'inline-size: 0',
      'block-size: 0',
    ]);

    const selectorLists = extractSelectorPreludeList(tableCss).filter((selectorList) =>
      tableScrollbarPseudoPattern.test(selectorList),
    );

    expect(selectorLists.length).toBeGreaterThan(0);

    for (const selectorList of selectorLists) {
      expect(selectorList).not.toMatch(bareTableScrollbarSelectorPattern);

      for (const selector of splitSelectorPreludeListAtTopLevelComma(selectorList)) {
        const normalizedSelector = normalizeSelectorWhitespace(selector);
        const isScopedToTableScrollbar = tableScrollbarSelectorScopes.some((scope) =>
          normalizedSelector.startsWith(`${scope}::-webkit-scrollbar`),
        );

        expect(isScopedToTableScrollbar, normalizedSelector).toBe(true);
        expect(normalizedSelector, normalizedSelector).toMatch(directTableScrollbarPseudoPattern);
        expect(normalizedSelector, normalizedSelector).not.toMatch(
          /\[data-table-(?:root|scroll-rail)\]\s+.+::-/u,
        );
        expect(normalizedSelector).not.toContain('html::-webkit-scrollbar');
        expect(normalizedSelector).not.toContain('body::-webkit-scrollbar');
        expect(normalizedSelector).not.toContain('ui-table');
      }
    }
  });

  it('top scroll rail CSS は prose / about-prose 直下と ui-tabs panel 直下に限定されること', () => {
    expectCssIncludes(tableCss, [
      ':is(.prose, .about-prose) > [data-table-scroll-rail]',
      ":is(.prose, .about-prose) > ui-tabs > [slot='panel'] > [data-table-scroll-rail]",
      'overflow-x: auto',
      'overflow-y: hidden',
      'block-size: 0.875rem',
      'margin-block: var(--space-1, 0.25rem) calc(var(--space-1, 0.25rem) * -1)',
      'scrollbar-width: thin',
      'scrollbar-color: var(--_table-scrollbar-thumb) var(--_table-scrollbar-track)',
      ':is(.prose, .about-prose) > [data-table-scroll-rail] > [data-table-scroll-rail-spacer]',
      ":is(.prose, .about-prose) > ui-tabs > [slot='panel'] > [data-table-scroll-rail] > [data-table-scroll-rail-spacer]",
      'block-size: 1px',
    ]);

    const selectors = extractSelectorPreludeList(tableCss);
    for (const selectorList of selectors) {
      for (const selector of splitSelectorPreludeListAtTopLevelComma(selectorList)) {
        expect(selector.trim()).not.to.equal('[data-table-scroll-rail]');
        expect(selector.trim()).not.to.equal('[data-table-scroll-rail-spacer]');
      }
    }

    expectCssExcludes(tableCss, [
      'ui-table [data-table-scroll-rail]',
    ]);
  });

  it('top scroll rail は focus-visible / reduced-motion / coarse pointer / forced-colors 契約を持つこと', () => {
    expectCssIncludes(tableCss, [
      ':is(.prose, .about-prose) > [data-table-scroll-rail]:focus-visible',
      ":is(.prose, .about-prose) > ui-tabs > [slot='panel'] > [data-table-scroll-rail]:focus-visible",
      'outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color',
      'outline-offset: var(--focus-ring-offset, 2px)',
      'animation: var(--animation-focus)',
      '@media (prefers-reduced-motion: reduce)',
      'animation: none',
      '@media (hover: none) and (pointer: coarse)',
      ':is(.prose, .about-prose) > [data-table-scroll-rail]',
      ":is(.prose, .about-prose) > ui-tabs > [slot='panel'] > [data-table-scroll-rail]",
      'display: none',
      '@media (forced-colors: active)',
      'outline-color: Highlight',
    ]);
  });

  it('column width token ごとの col selector と width declaration を保持すること', () => {
    for (const token of ['auto', 'fit', 'narrow', 'medium', 'wide', 'numeric']) {
      expectCssIncludes(tableCss, [
        `[data-table-root] col[data-table-col-width='${token}']`,
        'width:',
      ]);
    }

    expectCssIncludes(tableCss, [
      "[data-table-root] col[data-table-col-width='auto']",
      'width: auto',
    ]);
  });

  it('align attribute と numeric data の静的 CSS 契約を保持すること', () => {
    expectCssIncludes(tableCss, [
      "[data-table-root] > table th[align='center']",
      "[data-table-root] > table td[align='center']",
      "[data-table-root] > table th[align='right']",
      "[data-table-root] > table td[align='right']",
      "[data-table-root] > table th[align='left']",
      "[data-table-root] > table td[align='left']",
      "font-feature-settings: 'tnum'",
    ]);
  });

  it('static table は row hover affordance を持たないこと', () => {
    expectCssExcludes(tableCss, [
      '[data-table-root] > table tbody tr:hover',
      '[data-table-root] > table tr:hover',
      '[data-table-scroll-rail]:hover',
      '[data-table-root]:hover',
      '::-webkit-scrollbar-thumb:hover',
      'background-color: var(--bg-table-ruler',
      'transition: background-color var(--duration-fast',
    ]);
  });

  it('column width token は inline style や numeric の暗黙 alignment に依存しないこと', () => {
    expectCssExcludes(tableCss, [
      '[data-table-col-width] style',
      '[data-table-col-width="numeric"]',
      "[data-table-col-width='numeric'] { text-align",
      "[data-table-col-width='numeric'] {\n  text-align",
      "[data-table-col-width='numeric'] {\n  font-feature-settings",
    ]);
  });

  it('static table は coarse pointer / forced-colors の静的 CSS 契約を保持すること', () => {
    expectCssIncludes(tableCss, [
      '@media (hover: none) and (pointer: coarse)',
      '[data-table-root] > table td',
      'overflow: visible',
      'text-overflow: clip',
      '@media (forced-colors: active)',
      'border-bottom: 1px solid CanvasText',
      'border-top: 2px solid CanvasText',
    ]);
  });

  it('note static table CSS が legacy ui-table selector に依存しないこと', () => {
    expectCssExcludes(tableCss, [
      'ui-table table',
      'ui-table tbody tr:hover',
      'ui-table[density="compact"]',
      'ui-table [data-table-scroll-rail]',
      'scrollbar-width: none',
      '[data-table-scroll-rail]:hover',
      'body::-webkit-scrollbar',
      'html::-webkit-scrollbar',
      'border: 3px solid transparent',
    ]);
  });
});
