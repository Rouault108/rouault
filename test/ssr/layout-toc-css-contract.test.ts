import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  findLastDeclarationRuleOrderForSelector,
  hasDeclarationForAllSelectors,
  hasDeclarationForSelector,
  hasDeclarationValueIncluding,
  hasDeclarationValueIncludingForAllSelectors,
  hasDeclarationValueNotIncludingForAllSelectors,
  lacksDeclarationPropertyForAllSelectors,
} from './support/css-contract.js';

const layoutTocCss = readFileSync(resolve(process.cwd(), 'src/assets/css/layout-toc.css'), 'utf8');

describe('layout toc css contract', () => {
  it('disposed mobile panel state is hidden by the shared CSS artifact', () => {
    expect(
      hasDeclarationForSelector(
        layoutTocCss,
        ".layout-toc-mobile-panel[data-hydration-state='disposed']",
        'display',
        'none',
      ),
    ).toBe(true);
  });

  it('toc links explicitly opt out from underline in screen scope', () => {
    expect(
      hasDeclarationForSelector(layoutTocCss, '.layout-toc__link', 'text-decoration', 'none', {
        scope: 'screen',
      }),
    ).toBe(true);

    expect(
      hasDeclarationForSelector(
        layoutTocCss,
        '.layout-toc__link[href]',
        'text-decoration',
        'none',
        {
          scope: 'screen',
        },
      ),
    ).toBe(true);
  });

  it('keeps toc links without underline on hover and focus-visible in screen scope', () => {
    expect(
      hasDeclarationForAllSelectors(
        layoutTocCss,
        ['.layout-toc__link:hover', '.layout-toc__link:focus-visible'],
        'text-decoration',
        'none',
        { scope: 'screen' },
      ),
    ).toBe(true);
  });

  it('keeps forced-colors toc link without underline', () => {
    expect(
      hasDeclarationForSelector(
        layoutTocCss,
        '.layout-toc__link[href]',
        'text-decoration',
        'none',
        {
          scope: 'forced-colors',
        },
      ),
    ).toBe(true);

    expect(
      hasDeclarationForAllSelectors(
        layoutTocCss,
        ['.layout-toc__link:hover', '.layout-toc__link:focus-visible'],
        'text-decoration',
        'none',
        { scope: 'forced-colors' },
      ),
    ).toBe(true);
  });

  it('uses rail and surface based current visual grammar in screen scope', () => {
    expect(
      hasDeclarationForSelector(
        layoutTocCss,
        '.layout-toc__link::before',
        'box-sizing',
        'border-box',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForAllSelectors(
        layoutTocCss,
        ['.layout-toc__link.is-active::before', ".layout-toc__link[data-active='true']::before"],
        'inset-block',
        'var(--_toc-active-inset-block)',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForAllSelectors(
        layoutTocCss,
        ['.layout-toc__link.is-active::before', ".layout-toc__link[data-active='true']::before"],
        'block-size',
        'auto',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForAllSelectors(
        layoutTocCss,
        ['.layout-toc__link.is-active::before', ".layout-toc__link[data-active='true']::before"],
        'transform',
        'none',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForAllSelectors(
        layoutTocCss,
        ['.layout-toc__link.is-active::before', ".layout-toc__link[data-active='true']::before"],
        'opacity',
        '1',
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueIncluding(
        layoutTocCss,
        '.layout-toc__link',
        '--_toc-active-surface-bleed-inline-start',
        '--toc-item-surface-bleed-inline-start',
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueIncluding(
        layoutTocCss,
        '.layout-toc__link::after',
        'inset-inline-start',
        '--_toc-active-surface-bleed-inline-start',
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueIncludingForAllSelectors(
        layoutTocCss,
        ['.layout-toc__link.is-active::after', ".layout-toc__link[data-active='true']::after"],
        'background-color',
        '--toc-item-active-bg',
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueIncludingForAllSelectors(
        layoutTocCss,
        ['.layout-toc__link:hover::after', '.layout-toc__link:focus-visible::after'],
        'background-color',
        '--toc-item-hover-bg',
      ),
    ).toBe(true);
  });

  it('keeps long label display contract depth based in screen scope', () => {
    const inactiveUpperSelector =
      ".layout-toc__link:not(.is-active):not([data-active='true']) .layout-toc__link-label";
    const inactiveLowerSelector =
      ".layout-toc__link:not(.is-active):not([data-active='true']):is([data-heading-depth='2'],[data-heading-depth='3'],[data-heading-depth='4']) .layout-toc__link-label";
    const activeSelectors = [
      '.layout-toc__link.is-active .layout-toc__link-label',
      ".layout-toc__link[data-active='true'] .layout-toc__link-label",
    ];

    expect(
      hasDeclarationForSelector(layoutTocCss, '.layout-toc__link-label', 'overflow', 'hidden'),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(layoutTocCss, inactiveUpperSelector, 'display', '-webkit-box'),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        layoutTocCss,
        inactiveUpperSelector,
        '-webkit-line-clamp',
        'var(--toc-item-inactive-upper-max-lines, 2)',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        layoutTocCss,
        inactiveUpperSelector,
        'line-clamp',
        'var(--toc-item-inactive-upper-max-lines, 2)',
      ),
    ).toBe(true);
    expect(hasDeclarationForSelector(layoutTocCss, inactiveLowerSelector, 'display', 'block')).toBe(
      true,
    );
    expect(
      hasDeclarationForSelector(layoutTocCss, inactiveLowerSelector, '-webkit-line-clamp', 'unset'),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(layoutTocCss, inactiveLowerSelector, 'line-clamp', 'unset'),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(layoutTocCss, inactiveLowerSelector, 'white-space', 'nowrap'),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(layoutTocCss, inactiveLowerSelector, 'text-overflow', 'ellipsis'),
    ).toBe(true);
    expect(
      hasDeclarationForAllSelectors(
        layoutTocCss,
        activeSelectors,
        '-webkit-line-clamp',
        'var(--toc-item-active-max-lines, 3)',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForAllSelectors(
        layoutTocCss,
        activeSelectors,
        'line-clamp',
        'var(--toc-item-active-max-lines, 3)',
      ),
    ).toBe(true);
    expect(hasDeclarationForAllSelectors(layoutTocCss, activeSelectors, 'overflow', 'hidden')).toBe(
      true,
    );
  });

  it('keeps active font weight and base typography on token fallback recipe', () => {
    expect(
      hasDeclarationValueIncludingForAllSelectors(
        layoutTocCss,
        ['.layout-toc__link.is-active', ".layout-toc__link[data-active='true']"],
        'font-weight',
        '--toc-item-font-weight-active',
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueIncludingForAllSelectors(
        layoutTocCss,
        ['.layout-toc__link.is-active', ".layout-toc__link[data-active='true']"],
        'font-weight',
        '--font-normal',
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueNotIncludingForAllSelectors(
        layoutTocCss,
        ['.layout-toc__link.is-active', ".layout-toc__link[data-active='true']"],
        'font-weight',
        '600',
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueIncluding(
        layoutTocCss,
        '.layout-toc__link',
        'font-size',
        '--toc-item-font-size',
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueIncluding(
        layoutTocCss,
        '.layout-toc__link',
        'line-height',
        '--line-height-normal',
      ),
    ).toBe(true);
  });

  it('keeps focus and background surface responsibilities separated', () => {
    expect(
      hasDeclarationForSelector(
        layoutTocCss,
        '.layout-toc__link',
        'background-color',
        'transparent',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        layoutTocCss,
        '.layout-toc__link:focus-visible',
        'outline-offset',
        'var(--focus-ring-offset, 2px)',
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueIncluding(
        layoutTocCss,
        '.layout-toc__link:focus-visible',
        'border-radius',
        '--radius-sm',
      ),
    ).toBe(true);
    expect(
      lacksDeclarationPropertyForAllSelectors(
        layoutTocCss,
        ['.layout-toc__link:hover', '.layout-toc__link:focus-visible'],
        'background',
      ),
    ).toBe(true);
    expect(
      lacksDeclarationPropertyForAllSelectors(
        layoutTocCss,
        ['.layout-toc__link:hover', '.layout-toc__link:focus-visible'],
        'background-color',
      ),
    ).toBe(true);
  });

  it('keeps active foreground preferred over hover and focus-visible in screen scope', () => {
    for (const activeSelector of [
      '.layout-toc__link.is-active',
      ".layout-toc__link[data-active='true']",
    ]) {
      const activeOrder = findLastDeclarationRuleOrderForSelector(
        layoutTocCss,
        activeSelector,
        'color',
      );

      expect(activeOrder).toBeGreaterThan(
        findLastDeclarationRuleOrderForSelector(layoutTocCss, '.layout-toc__link:hover', 'color'),
      );
      expect(activeOrder).toBeGreaterThan(
        findLastDeclarationRuleOrderForSelector(
          layoutTocCss,
          '.layout-toc__link:focus-visible',
          'color',
        ),
      );
    }
  });

  it('keeps current surface preferred over hover and focus-visible surfaces in screen scope', () => {
    for (const activeSelector of [
      '.layout-toc__link.is-active::after',
      ".layout-toc__link[data-active='true']::after",
    ]) {
      const activeOrder = findLastDeclarationRuleOrderForSelector(
        layoutTocCss,
        activeSelector,
        'background-color',
      );

      expect(activeOrder).toBeGreaterThan(
        findLastDeclarationRuleOrderForSelector(
          layoutTocCss,
          '.layout-toc__link:hover::after',
          'background-color',
        ),
      );
      expect(activeOrder).toBeGreaterThan(
        findLastDeclarationRuleOrderForSelector(
          layoutTocCss,
          '.layout-toc__link:focus-visible::after',
          'background-color',
        ),
      );
    }
  });

  it('uses CanvasText and Highlight for forced-colors current grammar', () => {
    expect(
      hasDeclarationForSelector(layoutTocCss, '.layout-toc__link', 'color', 'CanvasText', {
        scope: 'forced-colors',
      }),
    ).toBe(true);
    expect(
      hasDeclarationForAllSelectors(
        layoutTocCss,
        ['.layout-toc__link.is-active', ".layout-toc__link[data-active='true']"],
        'color',
        'Highlight',
        { scope: 'forced-colors' },
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueNotIncludingForAllSelectors(
        layoutTocCss,
        [
          '.layout-toc__link',
          '.layout-toc__link:hover',
          '.layout-toc__link:focus-visible',
          '.layout-toc__link.is-active',
          ".layout-toc__link[data-active='true']",
        ],
        'color',
        'GrayText',
        { scope: 'forced-colors' },
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueNotIncludingForAllSelectors(
        layoutTocCss,
        [
          '.layout-toc__link',
          '.layout-toc__link:hover',
          '.layout-toc__link:focus-visible',
          '.layout-toc__link.is-active',
          ".layout-toc__link[data-active='true']",
        ],
        'color',
        'LinkText',
        { scope: 'forced-colors' },
      ),
    ).toBe(true);
  });

  it('keeps forced-colors rail border thin and system colored', () => {
    expect(
      hasDeclarationValueIncludingForAllSelectors(
        layoutTocCss,
        ['.layout-toc__link.is-active::before', ".layout-toc__link[data-active='true']::before"],
        'border',
        'var(--border-width, 1px)',
        { scope: 'forced-colors' },
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueIncludingForAllSelectors(
        layoutTocCss,
        ['.layout-toc__link.is-active::before', ".layout-toc__link[data-active='true']::before"],
        'border',
        'Highlight',
        { scope: 'forced-colors' },
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueNotIncludingForAllSelectors(
        layoutTocCss,
        ['.layout-toc__link.is-active::before', ".layout-toc__link[data-active='true']::before"],
        'border',
        '--border-width-thick',
        { scope: 'forced-colors' },
      ),
    ).toBe(true);
  });

  it('removes forced-colors pseudo-element background surfaces', () => {
    expect(
      hasDeclarationForAllSelectors(
        layoutTocCss,
        [
          '.layout-toc__link::after',
          '.layout-toc__link:hover::after',
          '.layout-toc__link:focus-visible::after',
          '.layout-toc__link.is-active::after',
          ".layout-toc__link[data-active='true']::after",
        ],
        'background-color',
        'transparent',
        { scope: 'forced-colors' },
      ),
    ).toBe(true);
  });

  it('keeps active foreground preferred over hover and focus-visible in forced-colors', () => {
    for (const activeSelector of [
      '.layout-toc__link.is-active',
      ".layout-toc__link[data-active='true']",
    ]) {
      const activeOrder = findLastDeclarationRuleOrderForSelector(
        layoutTocCss,
        activeSelector,
        'color',
        { scope: 'forced-colors' },
      );

      expect(activeOrder).toBeGreaterThan(
        findLastDeclarationRuleOrderForSelector(layoutTocCss, '.layout-toc__link:hover', 'color', {
          scope: 'forced-colors',
        }),
      );
      expect(activeOrder).toBeGreaterThan(
        findLastDeclarationRuleOrderForSelector(
          layoutTocCss,
          '.layout-toc__link:focus-visible',
          'color',
          { scope: 'forced-colors' },
        ),
      );
    }
  });
});
