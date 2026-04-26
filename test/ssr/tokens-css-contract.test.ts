import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { hasDeclarationForSelector } from './support/css-contract.js';

const tokensCss = readFileSync(resolve(process.cwd(), 'src/assets/css/tokens.css'), 'utf8');

describe('tokens css contract', () => {
  it('defines toc shared surface bleed token', () => {
    expect(
      hasDeclarationForSelector(
        tokensCss,
        ':root',
        '--toc-item-surface-bleed-inline-start',
        '2px',
        {
          scope: 'screen',
        },
      ),
    ).toBe(true);
  });
});
