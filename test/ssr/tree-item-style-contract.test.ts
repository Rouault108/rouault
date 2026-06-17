import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { extractSingleStaticCssTemplate } from './support/lit-css-contract.js';
import {
  hasAllDeclarationValuesIncludingForSelectorContaining,
  hasDeclarationForSelector,
  hasDeclarationValueIncluding,
  hasNoDeclarationValueIncludingForSelectorContaining,
} from './support/css-contract.js';

const treeItemCss = extractSingleStaticCssTemplate(
  resolve(process.cwd(), 'src/components/ui/tree-item/tree-item.ts'),
);

describe('ui-tree-item style contract', () => {
  it('generates selected surface pseudo-element and routes it through sidebar active surface', () => {
    expect(
      hasDeclarationForSelector(treeItemCss, '.surface::before', 'content', "''", {
        scope: 'base',
      }),
    ).toBe(true);
    expect(
      hasDeclarationValueIncluding(
        treeItemCss,
        ':host',
        '--tree-item-selected-bg',
        '--sidebar-item-active-bg',
        { scope: 'base' },
      ),
    ).toBe(true);
    expect(
      hasAllDeclarationValuesIncludingForSelectorContaining(
        treeItemCss,
        ':host([selected]) .surface::before',
        'background',
        '--tree-item-selected-bg',
        { scope: 'base', selectorKind: 'pseudo-before' },
      ),
    ).toBe(true);
  });

  it('keeps selected branch glyph color chained to active foreground', () => {
    expect(
      hasDeclarationValueIncluding(
        treeItemCss,
        ':host([selected]) .item',
        'color',
        '--sidebar-item-fg-active',
        { scope: 'base' },
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueIncluding(
        treeItemCss,
        ':host([selected]) .current-slot.is-branch',
        'color',
        '--sidebar-item-fg-active',
        { scope: 'base' },
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(treeItemCss, '.expand-glyph', 'color', 'currentColor', {
        scope: 'base',
      }),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(treeItemCss, '.expand-glyph > svg', 'color', 'currentColor', {
        scope: 'base',
      }),
    ).toBe(true);
    expect(
      hasDeclarationValueIncluding(
        treeItemCss,
        ':host([selected]) .item.is-page:hover',
        'color',
        '--sidebar-item-fg-active',
        { scope: 'base' },
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueIncluding(
        treeItemCss,
        ':host([selected]) .item.is-branch:hover',
        'color',
        '--sidebar-item-fg-active',
        { scope: 'base' },
      ),
    ).toBe(true);
  });

  it('keeps indent and label typography aligned with sidebar recipe', () => {
    expect(
      hasDeclarationValueIncluding(
        treeItemCss,
        ':host',
        '--tree-item-indent-step',
        '--tree-indent-step, var(--sidebar-item-indent-step, 16px)',
        { scope: 'base' },
      ),
    ).toBe(true);
    expect(treeItemCss).not.toContain('var(--tree-indent-step, 16px)');
    expect(treeItemCss).not.toContain('font-size: 15px');
    expect(
      hasDeclarationForSelector(treeItemCss, '.label', 'font-size', 'inherit', { scope: 'base' }),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(treeItemCss, '.label', 'line-height', 'inherit', { scope: 'base' }),
    ).toBe(true);
  });

  it('uses forced-colors rules for selected leaf indicator and selected branch glyph', () => {
    expect(
      hasDeclarationForSelector(
        treeItemCss,
        ':host([selected]) .current-slot.is-leaf .current-slot-indicator',
        'background',
        'HighlightText',
        { scope: 'forced-colors' },
      ),
    ).toBe(true);
    for (const selector of [
      ':host([selected]) .current-slot.is-branch',
      ':host([selected]) .current-slot.is-branch .expand-glyph',
      ':host([selected]) .current-slot.is-branch .expand-glyph > svg',
    ] as const) {
      expect(
        hasDeclarationForSelector(treeItemCss, selector, 'color', 'HighlightText', {
          scope: 'forced-colors',
        }),
      ).toBe(true);
      expect(
        hasDeclarationForSelector(treeItemCss, selector, 'forced-color-adjust', 'none', {
          scope: 'forced-colors',
        }),
      ).toBe(true);
    }
  });

  it('uses transition none in reduced-motion and keeps focus ring tokenized', () => {
    expect(
      hasDeclarationForSelector(treeItemCss, '.item:focus-visible', 'animation', 'none', {
        scope: 'reduced-motion',
      }),
    ).toBe(true);
    expect(
      hasNoDeclarationValueIncludingForSelectorContaining(treeItemCss, '.item', '0.01ms', {
        scope: 'reduced-motion',
      }),
    ).toBe(true);
    expect(
      hasDeclarationValueIncluding(
        treeItemCss,
        '.item:focus-visible',
        'outline',
        '--focus-ring-color',
        { scope: 'base' },
      ),
    ).toBe(true);
  });
});
