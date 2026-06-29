import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import postcss, { type Rule } from 'postcss';
import selectorParser from 'postcss-selector-parser';
import { describe, expect, it } from 'vitest';

import {
  hasDeclarationForSelector,
  hasDeclarationPropertyForSelector,
} from './support/css-contract.js';

const cssText = readFileSync(resolve(process.cwd(), 'src/assets/css/image.css'), 'utf8');

const splitSelectors = (selectorText: string): string[] => {
  const ast = selectorParser().astSync(selectorText);
  const selectors: string[] = [];
  ast.each((selector) => {
    selectors.push(
      selector
        .toString()
        .trim()
        .replace(/\s+/gu, ' ')
        .replace(/\s*([>+~(),])\s*/gu, '$1'),
    );
  });
  return selectors;
};

const collectSelectors = (): string[] => {
  const selectors: string[] = [];
  postcss.parse(cssText).walkRules((rule: Rule) => {
    selectors.push(...splitSelectors(rule.selector));
  });
  return selectors;
};

const isForbiddenBroadImageSelector = (selector: string): boolean => {
  if (!selector.startsWith('figure[data-image]')) {
    return false;
  }
  if (
    selector.includes('dialog[data-image-lightbox-dialog]') ||
    selector.includes('[data-image-zoom-trigger]') ||
    selector.includes('.image-lightbox-image')
  ) {
    return false;
  }
  return (
    selector === 'figure[data-image] img' ||
    selector.includes(' :where(img)') ||
    selector.includes(' :is(img)') ||
    selector.includes(' * img')
  );
};

describe('image css contract', () => {
  it('本文画像 surface style は direct child 構造だけへ適用すること', () => {
    expect(
      hasDeclarationForSelector(cssText, 'figure[data-image] > img', 'width', '100%'),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        cssText,
        'figure[data-image] > [data-image-preview-frame] > img',
        'width',
        '100%',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        cssText,
        'figure[data-image] > [data-image-preview-frame] > img',
        'height',
        'auto',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        cssText,
        'figure[data-image] > [data-image-preview-frame] > img',
        'max-width',
        '100%',
      ),
    ).toBe(true);
    expect(
      hasDeclarationPropertyForSelector(
        cssText,
        'figure[data-image] > [data-image-preview-frame] > img',
        'border',
      ),
    ).toBe(true);
    expect(
      hasDeclarationPropertyForSelector(
        cssText,
        'figure[data-image] > [data-image-preview-frame] > img',
        'border-radius',
      ),
    ).toBe(true);
    expect(
      hasDeclarationPropertyForSelector(
        cssText,
        'figure[data-image] > [data-image-preview-frame] > img',
        'background',
      ),
    ).toBe(true);
  });

  it('Lightbox 内 img へ届き得る本文画像用 descendant selector を持たないこと', () => {
    const forbidden = collectSelectors().filter(isForbiddenBroadImageSelector);

    expect(forbidden).toEqual([]);
    expect(collectSelectors()).toContain('figure[data-image] dialog[data-image-lightbox-dialog]');
    expect(collectSelectors()).toContain('figure[data-image] [data-image-zoom-trigger]');
    expect(collectSelectors()).toContain('.image-lightbox-image');
  });

  it('preview frame と overlay trigger の表示契約を持つこと', () => {
    expect(
      hasDeclarationForSelector(
        cssText,
        'figure[data-image] > [data-image-preview-frame]',
        'position',
        'relative',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        cssText,
        'figure[data-image] [data-image-zoom-trigger]',
        'appearance',
        'none',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        cssText,
        'figure[data-image] [data-image-zoom-trigger]',
        '-webkit-appearance',
        'none',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        cssText,
        'figure[data-image] [data-image-zoom-trigger]',
        'inset',
        '0',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        cssText,
        'figure[data-image] [data-image-zoom-trigger]',
        'background',
        'transparent',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        cssText,
        'figure[data-image] [data-image-zoom-trigger][hidden]',
        'display',
        'none',
      ),
    ).toBe(true);
    expect(
      hasDeclarationPropertyForSelector(
        cssText,
        'figure[data-image] [data-image-zoom-trigger]:focus-visible',
        'outline',
      ),
    ).toBe(true);
    expect(
      hasDeclarationPropertyForSelector(
        cssText,
        'figure[data-image] [data-image-zoom-trigger]:hover',
        'background',
      ),
    ).toBe(true);
  });

  it('右上 affordance は icon 側へ配置し、print / forced-colors に対応すること', () => {
    const iconSelector =
      'figure[data-image] [data-image-zoom-trigger] .image-zoom-trigger__icon';

    expect(hasDeclarationForSelector(cssText, iconSelector, 'position', 'absolute')).toBe(true);
    expect(hasDeclarationPropertyForSelector(cssText, iconSelector, 'inset-block-start')).toBe(
      true,
    );
    expect(hasDeclarationPropertyForSelector(cssText, iconSelector, 'inset-inline-end')).toBe(true);
    expect(hasDeclarationForSelector(cssText, iconSelector, 'inline-size', '2.25rem')).toBe(true);
    expect(hasDeclarationForSelector(cssText, iconSelector, 'block-size', '2.25rem')).toBe(true);
    expect(cssText).toContain('@media (forced-colors: active)');
    expect(cssText).toContain('@media print');
    expect(cssText).toContain('figure[data-image] [data-image-zoom-trigger],');
    expect(cssText).toContain('figure[data-image] dialog[data-image-lightbox-dialog],');
  });
});
