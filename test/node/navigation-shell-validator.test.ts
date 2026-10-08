import { describe, expect, it } from 'vitest';
import { DEFAULT_SIDEBAR_ID } from '../../shared/navigation/sidebar-shell-defaults.js';
import {
  validateNavigationEnvelopeShell,
  validateRuntimeSidebarProjection,
} from '../../shared/navigation/navigation-shell-validator.js';
import { createCanonicalAbsentRuntimeSidebarProjection } from '../../shared/navigation/sidebar-shell-projection-contract.js';

describe('navigation shell validator', () => {
  it('headerHtml と sidebarProjection を schema v2 shell として検証すること', () => {
    const shell = validateNavigationEnvelopeShell({
      headerHtml: '<header class="layout-header" data-layout-header="true"></header>',
      sidebarProjection: null,
      footerCopyrightText: '© Example',
    });

    expect(shell.headerHtml).toContain('data-layout-header');
    expect(shell.sidebarProjection).toBeNull();
    expect(shell.footerCopyrightText).toBe('© Example');
  });

  it('footerCopyrightText は省略可能だが空文字を拒否すること', () => {
    expect(
      validateNavigationEnvelopeShell({
        headerHtml: '<header class="layout-header" data-layout-header="true"></header>',
        sidebarProjection: null,
      }).footerCopyrightText,
    ).toBeUndefined();
    expect(() =>
      validateNavigationEnvelopeShell({
        headerHtml: '<header class="layout-header" data-layout-header="true"></header>',
        sidebarProjection: null,
        footerCopyrightText: '   ',
      }),
    ).toThrow(/invalid-footer-copyright-text/u);
  });

  it('空の headerHtml を拒否すること', () => {
    expect(() =>
      validateNavigationEnvelopeShell({
        headerHtml: '',
        sidebarProjection: null,
      }),
    ).toThrow(/invalid-header-html/u);
  });

  it('absent runtime sidebar は canonical 値だけを受け取ること', () => {
    expect(
      validateRuntimeSidebarProjection(createCanonicalAbsentRuntimeSidebarProjection()),
    ).toEqual({
      ...createCanonicalAbsentRuntimeSidebarProjection(),
      sidebarId: DEFAULT_SIDEBAR_ID,
    });
  });
});
