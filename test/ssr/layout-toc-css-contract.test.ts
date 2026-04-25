import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  hasDeclarationForAllSelectors,
  hasDeclarationForSelector,
} from './support/css-contract.js';

const layoutTocCss = readFileSync(resolve(process.cwd(), 'src/assets/css/layout-toc.css'), 'utf8');

describe('layout toc css contract', () => {
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
});
