import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  hasDeclarationForSelector,
  hasDeclarationForSelectorContaining,
  hasDeclarationForSelectorContainingInMedia,
  hasDeclarationValueIncluding,
  hasDeclarationValueIncludingForSelectorContainingInMedia,
  PROSE_TEXT_LINK_SELECTOR,
} from './support/css-contract.js';

const linkCardCss = readFileSync(resolve(process.cwd(), 'src/assets/css/link-card.css'), 'utf8');
const linkPrimitivesCss = readFileSync(resolve(process.cwd(), 'src/assets/css/link-primitives.css'), 'utf8');
const footnotesCss = readFileSync(resolve(process.cwd(), 'src/assets/css/footnotes.css'), 'utf8');

describe('link-card css contract', () => {
  it('defines static link-card light DOM layout and text contract', () => {
    expect(
      hasDeclarationForSelector(
        linkCardCss,
        ':is(.prose, .about-prose) > [data-link-card]',
        'display',
        'block',
      ),
    ).toBe(true);
    expect(hasDeclarationForSelector(linkCardCss, '.link-card', 'break-inside', 'avoid')).toBe(true);
    expect(
      hasDeclarationValueIncluding(
        linkCardCss,
        '.link-card:focus-within',
        'outline',
        'var(--focus-ring-color)',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(linkCardCss, '.link-card__link', 'cursor', 'pointer'),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(linkCardCss, '.link-card__body', 'min-inline-size', '0'),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(linkCardCss, '.link-card__title', '-webkit-line-clamp', '2'),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(linkCardCss, '.link-card__description', '-webkit-line-clamp', '2'),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(linkCardCss, '.link-card__media', 'object-fit', 'cover'),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        linkCardCss,
        '.link-card__link--no-image',
        'grid-template-columns',
        'minmax(0, 1fr)',
      ),
    ).toBe(true);
  });

  it('keeps responsive, hover, forced-colors, print, and invalid contracts explicit', () => {
    expect(
      hasDeclarationForSelectorContainingInMedia(
        linkCardCss,
        (params) => /max-width:\s*480px/u.test(params),
        '.link-card__media',
        'aspect-ratio',
        '16 / 9',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelectorContainingInMedia(
        linkCardCss,
        (params) => /hover:\s*hover/u.test(params) && /pointer:\s*fine/u.test(params),
        '.link-card:not(.link-card--invalid):hover',
        'transform',
        'translateY(-1px)',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(linkCardCss, '.link-card--invalid', 'border-style', 'dashed'),
    ).toBe(true);
    expect(
      hasDeclarationValueIncludingForSelectorContainingInMedia(
        linkCardCss,
        (params) => /forced-colors:\s*active/u.test(params),
        '.link-card:not(.link-card--invalid):hover',
        'outline',
        'CanvasText',
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelectorContainingInMedia(
        linkCardCss,
        (params) => /\bprint\b/u.test(params),
        '.link-card',
        'transform',
        'none',
      ),
    ).toBe(true);
  });

  it('excludes card surface links from prose and footnote popover text link selectors', () => {
    expect(PROSE_TEXT_LINK_SELECTOR).toContain("[data-link-surface='card']");
    expect(
      hasDeclarationForSelector(linkPrimitivesCss, PROSE_TEXT_LINK_SELECTOR, 'overflow-wrap', 'anywhere', {
        scope: 'screen',
      }),
    ).toBe(true);
    expect(
      hasDeclarationForSelectorContaining(
        footnotesCss,
        "[data-footnote-popover] .footnote-popover-body a[href]:not(:where([data-link-surface='card']",
        'text-decoration',
        'underline',
        { scope: 'screen' },
      ),
    ).toBe(true);
  });
});
