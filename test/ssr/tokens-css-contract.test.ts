import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { hasDeclarationForSelector, hasDeclarationValueIncluding } from './support/css-contract.js';

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

  it('defines accessible control color tokens in every theme scope', () => {
    const lightTokens = [
      ['--fg-subtle', 'oklch(53% 0 0)'],
      ['--fg-placeholder', 'var(--fg-muted)'],
      ['--fg-control-label', 'var(--fg-muted)'],
      ['--fg-control-affordance', 'var(--fg-subtle)'],
      ['--fg-decorative', 'oklch(60% 0 0)'],
      ['--fg-disabled', 'oklch(70% 0 0)'],
      ['--bg-control-muted', 'oklch(95% 0 0)'],
    ] as const;

    for (const [token, value] of lightTokens) {
      expect(hasDeclarationForSelector(tokensCss, ':root', token, value, { scope: 'screen' })).toBe(
        true,
      );
      expect(
        hasDeclarationForSelector(tokensCss, ":root[data-theme='light']", token, value, {
          scope: 'screen',
        }),
      ).toBe(true);
    }

    const darkTokens = [
      ['--fg-subtle', 'oklch(62% 0 0)'],
      ['--fg-placeholder', 'var(--fg-muted)'],
      ['--fg-control-label', 'var(--fg-muted)'],
      ['--fg-control-affordance', 'var(--fg-subtle)'],
      ['--fg-decorative', 'oklch(55% 0 0)'],
      ['--fg-disabled', 'oklch(45% 0 0)'],
      ['--bg-control-muted', 'var(--bg-surface-2)'],
    ] as const;

    for (const [token, value] of darkTokens) {
      expect(hasDeclarationForSelector(tokensCss, ':root', token, value, { scope: 'screen' })).toBe(
        true,
      );
      expect(
        hasDeclarationForSelector(tokensCss, ":root[data-theme='dark']", token, value, {
          scope: 'screen',
        }),
      ).toBe(true);
    }
  });

  it('maps accessible control tokens in forced colors and keeps system theme color-free', () => {
    expect(
      hasDeclarationForSelector(tokensCss, ':root', '--fg-control-label', 'CanvasText', {
        scope: 'forced-colors',
      }),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(tokensCss, ':root', '--fg-disabled', 'GrayText', {
        scope: 'forced-colors',
      }),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(tokensCss, ':root', '--bg-control-muted', 'Canvas', {
        scope: 'forced-colors',
      }),
    ).toBe(true);
    expect(
      hasDeclarationValueIncluding(
        tokensCss,
        ':root',
        '--scrollbar-thumb',
        'var(--fg-control-affordance)',
        {
          scope: 'screen',
        },
      ),
    ).toBe(true);

    const systemThemeBlock = tokensCss.match(/:root\[data-theme='system'\]\s*\{(?<body>[^}]*)\}/u);
    expect(systemThemeBlock?.groups?.['body']).not.toMatch(/--(?:fg|bg|primary|danger|border)-/u);
  });
});
