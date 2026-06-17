import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { hasDeclarationTokenForAllSelectors } from './support/css-contract.js';

const mainCss = readFileSync(resolve(process.cwd(), 'src/assets/css/main.css'), 'utf8');
const linkPrimitivesCss = readFileSync(
  resolve(process.cwd(), 'src/assets/css/link-primitives.css'),
  'utf8',
);

describe('prose link css contract', () => {
  it('keeps prose and link-text links underlined explicitly in screen scope', () => {
    expect(
      hasDeclarationTokenForAllSelectors(
        linkPrimitivesCss,
        [
          '.link-text[href]',
          `:is(.prose, .about-prose) a[href]:not(
            :where(
              [data-link-surface='card'],
              .heading-anchor
            )
          )`,
        ],
        'text-decoration',
        'underline',
        { scope: 'screen' },
      ),
    ).toBe(true);
  });

  it('keeps link code readability rule', () => {
    expect(mainCss).toMatch(/a\s*>\s*code\s*\{[^{}]*color:\s*var\(--fg-default\)/u);
  });

  it('keeps footnote-specific selectors out of link primitives', () => {
    expect(linkPrimitivesCss).not.toContain('ui-footnote');
    expect(linkPrimitivesCss).not.toContain('data-footnote-ref');
    expect(linkPrimitivesCss).not.toContain('data-footnote-backref');
    expect(linkPrimitivesCss).not.toContain('data-footnote-popover');
  });
});
