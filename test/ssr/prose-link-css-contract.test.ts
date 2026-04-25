import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { hasDeclarationTokenForAllSelectors } from './support/css-contract.js';

const mainCss = readFileSync(resolve(process.cwd(), 'src/assets/css/main.css'), 'utf8');

describe('prose link css contract', () => {
  it('keeps prose and link-text links underlined explicitly in screen scope', () => {
    expect(
      hasDeclarationTokenForAllSelectors(
        mainCss,
        ['.link-text[href]', ':is(.prose, .about-prose) a[href]:not(.heading-anchor)'],
        'text-decoration',
        'underline',
        { scope: 'screen' },
      ),
    ).toBe(true);
  });

  it('keeps link code readability rule', () => {
    expect(mainCss).toMatch(/a\s*>\s*code\s*\{[^{}]*color:\s*var\(--fg-default\)/u);
  });
});
