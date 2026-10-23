import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { hasDeclarationForSelector } from './support/css-contract.js';

const css = readFileSync('src/assets/css/layout-sidebar.css', 'utf8');

describe('sidebar overlay stacking scope', () => {
  it('uses the existing active direct-overlay parent and local child levels', () => {
    for (const [selector, value] of [
      [
        "[data-sidebar-enhancement-state='active'] .layout-sidebar-overlay-layer:has(> [data-layout-sidebar-root][data-mode='overlay'])",
        'var(--z-blocking-layer, 200)',
      ],
      [
        "[data-sidebar-enhancement-state='active'] [data-layout-sidebar-root][data-mode='overlay']",
        '1',
      ],
      ['[data-layout-sidebar-backdrop]', '0'],
    ] as const) {
      expect(hasDeclarationForSelector(css, selector, 'z-index', value, { scope: 'base' })).toBe(
        true,
      );
    }
    expect(css).not.toContain('--z-overlay');
  });
});
