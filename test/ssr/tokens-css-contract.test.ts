import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  hasDeclarationForSelector,
  hasDeclarationValueIncluding,
  lacksDeclarationPropertyForSelector,
} from './support/css-contract.js';

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
  it('defines sidebar active surface through theme-aware surface token', () => {
    expect(
      hasDeclarationForSelector(
        tokensCss,
        ':root',
        '--sidebar-item-active-bg',
        'var(--bg-surface-active)',
        {
          scope: 'base',
        },
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        tokensCss,
        ':root',
        '--sidebar-item-font-weight-current-branch',
        'var(--sidebar-item-font-weight)',
        { scope: 'base' },
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        tokensCss,
        ':root',
        '--sidebar-item-indent-step',
        'var(--space-4)',
        {
          scope: 'base',
        },
      ),
    ).toBe(true);
    expect(
      hasDeclarationValueIncluding(
        tokensCss,
        ':root',
        '--sidebar-item-current-branch-indicator-color',
        'var(--nav-item-indicator-color, var(--primary)) 76%',
        { scope: 'base' },
      ),
    ).toBe(true);
    expect(tokensCss).not.toContain('--accent-soft');
  });

  it('keeps sidebar active surface routed through explicit light / dark / system theme paths', () => {
    expect(
      hasDeclarationForSelector(tokensCss, ':root', '--bg-surface-active', 'var(--bg-active)', {
        scope: 'base',
      }),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        tokensCss,
        ':root',
        '--bg-active',
        'oklch(from var(--primary) l c h / 0.15)',
        { mediaPredicate: (params) => /prefers-color-scheme\s*:\s*dark/u.test(params) },
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        tokensCss,
        ":root[data-theme='dark']",
        '--bg-active',
        'oklch(from var(--primary) l c h / 0.15)',
        { scope: 'base' },
      ),
    ).toBe(true);
    expect(
      hasDeclarationForSelector(
        tokensCss,
        ":root[data-theme='light']",
        '--bg-active',
        'oklch(from var(--primary) l c h / 0.08)',
        { scope: 'base' },
      ),
    ).toBe(true);
    expect(
      lacksDeclarationPropertyForSelector(tokensCss, ":root[data-theme='system']", '--bg-active', {
        scope: 'base',
      }),
    ).toBe(true);
  });
  it('defines the readable TOC token recipe', () => {
    const expectedTokens = [
      ['--note-toc-width', 'clamp(15rem, 18vw, 17rem)'],
      ['--note-frame-outer-gutter', 'clamp(var(--space-4, 16px), 1.5vw, var(--space-6, 24px))'],
      ['--toc-item-rail-offset-inline', '6px'],
      ['--toc-item-rail-gap', '6px'],
      ['--toc-item-padding-inline-end', '6px'],
      ['--toc-item-indent-step', '6px'],
      ['--toc-item-font-weight-active', 'var(--font-medium)'],
      ['--toc-item-inactive-max-lines', '2'],
      ['--toc-item-active-max-lines', '3'],
    ] as const;

    for (const [property, value] of expectedTokens) {
      expect(hasDeclarationForSelector(tokensCss, ':root', property, value)).toBe(true);
    }

    expect(tokensCss).not.toContain('--toc-item-inactive-upper-max-lines');
  });

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
    expect(accessibilityDocs).toMatch(/最低\s*24×24px、推奨\s*44×44px/u);
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
