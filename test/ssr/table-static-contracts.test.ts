import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'vitest';

import { expectCssExcludes, expectCssIncludes } from './css-contract-test-helpers.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const mainCssPath = path.resolve(dirname, '../../src/assets/css/main.css');
const mainCss = readFileSync(mainCssPath, 'utf8');

describe('table static css contracts', () => {
  it('prose 内 table root が breakout / focus-visible / reduced-motion 契約を保持すること', () => {
    expectCssIncludes(mainCss, [
      '.prose > [data-table-root]',
      ':is(.prose, .about-prose) > [data-table-root]',
      ":is(.prose, .about-prose) > ui-tabs > [slot='panel'] > [data-table-root]",
      'max-width: none',
      'width: var(--ui-table-breakout-width, var(--_table-breakout-width-default))',
      'margin-inline: var(--ui-table-breakout-margin, var(--_table-breakout-margin-default))',
      'overflow-x: auto',
      'outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color',
      'animation: var(--animation-focus)',
      '@media (prefers-reduced-motion: reduce)',
      'animation: none',
    ]);
  });

  it('static table root が base / caption / tfoot / multiple tbody / compact density 契約を保持すること', () => {
    expectCssIncludes(mainCss, [
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

  it('align attribute と numeric data の静的 CSS 契約を保持すること', () => {
    expectCssIncludes(mainCss, [
      "[data-table-root] > table th[align='center']",
      "[data-table-root] > table td[align='center']",
      "[data-table-root] > table th[align='right']",
      "[data-table-root] > table td[align='right']",
      "[data-table-root] > table th[align='left']",
      "[data-table-root] > table td[align='left']",
      "font-feature-settings: 'tnum'",
    ]);
  });

  it('hover capability / coarse pointer / forced-colors の静的 CSS 契約を保持すること', () => {
    expectCssIncludes(mainCss, [
      '@media (hover: hover) and (pointer: fine)',
      '[data-table-root] > table tbody tr:hover',
      'background-color: var(--bg-table-ruler',
      '@media (hover: none) and (pointer: coarse)',
      'background-color: transparent',
      'overflow: visible',
      'text-overflow: clip',
      '@media (forced-colors: active)',
      'border-bottom: 1px solid CanvasText',
      'border-top: 2px solid CanvasText',
    ]);
  });

  it('note static table CSS が legacy ui-table selector に依存しないこと', () => {
    expectCssExcludes(mainCss, [
      'ui-table table',
      'ui-table tbody tr:hover',
      'ui-table[density="compact"]',
    ]);
  });
});
