import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { extractSingleStaticCssTemplate } from './support/lit-css-contract.js';
import {
  hasDeclarationForSelector,
  hasDeclarationValueIncluding,
  hasRuleContainingSelectorFragment,
} from './support/css-contract.js';

const sidebarShellCss = extractSingleStaticCssTemplate(
  resolve(process.cwd(), 'src/components/ui/sidebar-shell/sidebar-shell.ts'),
);

describe('ui-sidebar-shell style contract', () => {
  it('keeps note sidebar current styling outside shell slotted rules', () => {
    expect(hasRuleContainingSelectorFragment(sidebarShellCss, "[aria-current='page']", { scope: 'any' })).toBe(false);
    expect(sidebarShellCss).not.toContain('::slotted([aria-current');
  });

  it('keeps shell nav background available as painted test background', () => {
    expect(hasDeclarationValueIncluding(sidebarShellCss, 'nav', 'background', '--bg-surface-1', { scope: 'base' })).toBe(true);
    expect(hasDeclarationForSelector(sidebarShellCss, 'nav', 'background', 'Canvas', { scope: 'forced-colors' })).toBe(true);
  });
});
