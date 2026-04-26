import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { hasDeclarationForSelector } from './support/css-contract.js';

const tokensCss = readFileSync(resolve(process.cwd(), 'src/assets/css/tokens.css'), 'utf8');
const foundationsDocs = readFileSync(
  resolve(process.cwd(), 'docs/design-system/foundations.md'),
  'utf8',
);
const accessibilityDocs = readFileSync(
  resolve(process.cwd(), 'docs/design-system/accessibility.md'),
  'utf8',
);

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

  it('defines compact line-height and touch target minimum tokens consistently with docs', () => {
    expect(
      hasDeclarationForSelector(tokensCss, ':root', '--line-height-snug', '1.35', {
        scope: 'screen',
      }),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(tokensCss, ':root', '--control-min-touch', '24px', {
        scope: 'screen',
      }),
    ).toBe(true);

    expect(foundationsDocs).toContain('`--line-height-snug`');
    expect(foundationsDocs).toContain('`1.35`');
    expect(accessibilityDocs).toContain('最低 24×24px、推奨 44×44px');
    expect(accessibilityDocs).toContain('| `--control-min-touch` | 24px |');
  });

  it('does not point token and accessibility docs at a missing design-system index', () => {
    expect(tokensCss).not.toContain('docs/design-system/index.md');
    expect(accessibilityDocs).not.toContain('`index.md`');
  });
});
