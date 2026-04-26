import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  findLastDeclarationRuleOrderForSelector,
  hasDeclarationForAllSelectors,
  hasDeclarationForSelector,
  hasDeclarationValueIncluding,
  hasDeclarationValueNotIncludingForAllSelectors,
} from './support/css-contract.js';

const readSourceFile = (sourcePath: string): string =>
  readFileSync(resolve(process.cwd(), sourcePath), 'utf8');

const extractSingleStaticLitCss = (
  sourceText: string,
  componentName: string,
  sourcePath: string,
): string => {
  const matches = Array.from(
    sourceText.matchAll(/static\s+override\s+styles\s*=\s*css`([\s\S]*?)`;/gu),
  );

  if (matches.length !== 1) {
    throw new Error(
      `${componentName} (${sourcePath}) の単一 static css template が一意に見つかりません。` +
        'styles 配列、複数 css template、template interpolation、shared style へ移行した場合は、' +
        'ui-toc style contract の CSS 抽出 helper も同時に更新してください。',
    );
  }

  const cssText = matches[0]?.[1];
  if (typeof cssText !== 'string') {
    throw new Error(`${componentName} (${sourcePath}) の static css template が見つかりません。`);
  }
  if (cssText.includes('${')) {
    throw new Error(
      `${componentName} (${sourcePath}) の static css template に interpolation が含まれています。`,
    );
  }

  return cssText;
};

const tocSourcePath = 'src/components/ui/toc/toc.ts';
const tocCss = extractSingleStaticLitCss(readSourceFile(tocSourcePath), 'ui-toc', tocSourcePath);

describe('ui-toc style contract', () => {
  it('keeps base toc link fallback recipe and underline contract', () => {
    expect(hasDeclarationForSelector(tocCss, '.toc-link', 'text-decoration', 'none')).toBe(true);
    expect(hasDeclarationForSelector(tocCss, '.toc-link::before', 'box-sizing', 'border-box')).toBe(
      true,
    );
    expect(hasDeclarationValueIncluding(tocCss, '.toc-link', 'font-weight', '--font-normal')).toBe(
      true,
    );
    expect(
      hasDeclarationValueIncluding(tocCss, '.toc-link', 'line-height', '--line-height-normal'),
    ).toBe(true);
    expect(
      hasDeclarationValueIncluding(
        tocCss,
        '.toc-link:focus-visible',
        'border-radius',
        '--radius-sm',
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueIncluding(
        tocCss,
        '.toc-link',
        '--_toc-active-surface-bleed-inline-start',
        '--toc-item-surface-bleed-inline-start',
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueIncluding(
        tocCss,
        '.toc-link::after',
        'inset-inline-start',
        '--_toc-active-surface-bleed-inline-start',
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueIncluding(
        tocCss,
        '.toc-link:focus-visible::after',
        'background-color',
        '--toc-item-hover-bg',
      ),
    ).toBe(true);
  });

  it('keeps active foreground and current surface preferred over hover and focus-visible', () => {
    const activeForegroundOrder = findLastDeclarationRuleOrderForSelector(
      tocCss,
      '.toc-link.is-active',
      'color',
    );
    expect(activeForegroundOrder).toBeGreaterThan(
      findLastDeclarationRuleOrderForSelector(tocCss, '.toc-link:hover', 'color'),
    );
    expect(activeForegroundOrder).toBeGreaterThan(
      findLastDeclarationRuleOrderForSelector(tocCss, '.toc-link:focus-visible', 'color'),
    );

    const activeSurfaceOrder = findLastDeclarationRuleOrderForSelector(
      tocCss,
      '.toc-link.is-active::after',
      'background-color',
    );
    expect(activeSurfaceOrder).toBeGreaterThan(
      findLastDeclarationRuleOrderForSelector(tocCss, '.toc-link:hover::after', 'background-color'),
    );
    expect(activeSurfaceOrder).toBeGreaterThan(
      findLastDeclarationRuleOrderForSelector(
        tocCss,
        '.toc-link:focus-visible::after',
        'background-color',
      ),
    );
  });

  it('keeps reduced-motion transition and focus animation contract', () => {
    expect(
      hasDeclarationForAllSelectors(
        tocCss,
        ['.toc-link', '.toc-link::before', '.toc-link::after'],
        'transition-duration',
        '0.01ms',
        { scope: 'reduced-motion' },
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(tocCss, '.toc-link:focus-visible', 'animation', 'none', {
        scope: 'reduced-motion',
      }),
    ).toBe(true);
  });

  it('keeps forced-colors current grammar on system colors', () => {
    expect(
      hasDeclarationForSelector(tocCss, '.toc-link', 'color', 'CanvasText', {
        scope: 'forced-colors',
      }),
    ).toBe(true);
    expect(
      hasDeclarationValueNotIncludingForAllSelectors(
        tocCss,
        ['.toc-link', '.toc-link:hover', '.toc-link:focus-visible', '.toc-link.is-active'],
        'color',
        'GrayText',
        { scope: 'forced-colors' },
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueNotIncludingForAllSelectors(
        tocCss,
        ['.toc-link', '.toc-link:hover', '.toc-link:focus-visible', '.toc-link.is-active'],
        'color',
        'LinkText',
        { scope: 'forced-colors' },
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(tocCss, '.toc-link.is-active', 'color', 'Highlight', {
        scope: 'forced-colors',
      }),
    ).toBe(true);
    expect(
      hasDeclarationValueIncluding(
        tocCss,
        '.toc-link.is-active::before',
        'border',
        'var(--border-width, 1px)',
        { scope: 'forced-colors' },
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueNotIncludingForAllSelectors(
        tocCss,
        ['.toc-link.is-active::before'],
        'border',
        '--border-width-thick',
        { scope: 'forced-colors' },
      ),
    ).toBe(true);
    expect(
      hasDeclarationForAllSelectors(
        tocCss,
        [
          '.toc-link::after',
          '.toc-link:hover::after',
          '.toc-link:focus-visible::after',
          '.toc-link.is-active::after',
        ],
        'background-color',
        'transparent',
        { scope: 'forced-colors' },
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(tocCss, '.toc-link:focus-visible', 'outline-color', 'Highlight', {
        scope: 'forced-colors',
      }),
    ).toBe(true);
  });

  it('keeps forced-colors active foreground preferred over hover and focus-visible', () => {
    const activeOrder = findLastDeclarationRuleOrderForSelector(
      tocCss,
      '.toc-link.is-active',
      'color',
      { scope: 'forced-colors' },
    );

    expect(activeOrder).toBeGreaterThan(
      findLastDeclarationRuleOrderForSelector(tocCss, '.toc-link:hover', 'color', {
        scope: 'forced-colors',
      }),
    );
    expect(activeOrder).toBeGreaterThan(
      findLastDeclarationRuleOrderForSelector(tocCss, '.toc-link:focus-visible', 'color', {
        scope: 'forced-colors',
      }),
    );
  });

  it('keeps active font-weight token fallback contract', () => {
    expect(
      hasDeclarationValueIncluding(
        tocCss,
        '.toc-link.is-active',
        'font-weight',
        '--toc-item-font-weight-active',
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueIncluding(tocCss, '.toc-link.is-active', 'font-weight', '--font-normal'),
    ).toBe(true);
  });
});
