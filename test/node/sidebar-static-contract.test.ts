import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = process.cwd();
const readSource = (path: string): string => readFileSync(join(rootDir, path), 'utf8');

describe('sidebar static source contract', () => {
  it('NoteLayout は sidebar host と presentation state owner を持ち込まないこと', () => {
    const source = readSource('src/layouts/NoteLayout.11ty.ts');

    expect(source).not.toContain('<layout-sidebar');
    expect(source).not.toContain('layout-sidebar-controller');
    expect(source).not.toContain('layout-sidebar-shell-adapter');
    expect(source).not.toContain('data-app-shell-sidebar-host');
    expect(source).not.toContain('data-app-shell-sidebar-overlay-layer');
    expect(source).not.toMatch(/サイドバー\s*\+\s*本文\s*\+\s*TOC/u);
  });

  it('ui-sidebar-shell は app 固有 state owner へ戻らないこと', () => {
    const source = readSource('src/components/ui/sidebar-shell/sidebar-shell.ts');

    expect(source).not.toContain('localStorage');
    expect(source).not.toMatch(/matchMedia\(['"`]\(min-width/u);
    expect(source).not.toContain('fixedBreakpoint');
    expect(source).not.toContain('app-router');
    expect(source).not.toContain('ShellAdapter');
    expect(source).not.toContain('sidebarId');
  });

  it('layout-sidebar-surface は bridge に留まり state owner にならないこと', () => {
    const source = readSource('src/components/layout/layout-sidebar-surface.ts');

    expect(source).not.toContain('localStorage');
    expect(source).not.toContain('matchMedia');
    expect(source).not.toContain('layoutSidebarController');
    expect(source).not.toContain('app-router');
    expect(source).not.toContain('ShellAdapter');
  });

  it('production component cleanup で layoutSidebarController.reset(id) を使わないこと', () => {
    const files = [
      'src/components/layout/layout-header.ts',
      'src/components/layout/layout-sidebar.ts',
    ];

    for (const file of files) {
      const source = readSource(file);
      expect(source).not.toMatch(/layoutSidebarController\.reset\s*\(/u);
    }
  });
});
