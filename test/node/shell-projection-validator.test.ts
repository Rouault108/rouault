import { describe, expect, it } from 'vitest';

import {
  validateNavigationEnvelopeShellProjection,
  validateRuntimeSidebarProjection,
  normalizeRuntimeSidebarProjectionForPayload,
  ShellProjectionValidationError,
} from '../../shared/navigation/shell-projection-validator.js';
import { createCanonicalAbsentRuntimeSidebarProjection } from '../../shared/navigation/sidebar-shell-projection-contract.js';

const header = {
  corpora: [],
  currentCorpusKey: 'all',
  noteLayout: true,
  sidebarEnabled: true,
  sidebarId: 'note-primary',
  tocPresence: 'absent' as const,
};

const presentSidebar = {
  present: true,
  sidebarId: 'note-primary',
  stateScopeId: 'note-navigation',
  selectedId: null,
  initialExpandedIds: [] as string[],
  topologyRevision: 'topology:test',
  navHtml: '<nav data-sidebar-nav aria-label="ノートナビゲーション"><ul><li data-node-id="a" data-node-kind="leaf" data-node-depth="0"><a data-sidebar-nav-control data-sidebar-nav-link href="/notes/a"><span data-sidebar-nav-label>A</span></a></li></ul></nav>',
  heading: null,
  fixedBreakpoint: 1024,
  presentation: 'auto' as const,
};

describe('shell projection validator', () => {
  it('ShellProjectionValidationError constructor は object API で reason/sourceLabel を保持すること', () => {
    const error = new ShellProjectionValidationError({
      reason: 'invalid-shell',
      sourceLabel: 'shell-test',
    });

    expect(error.reason).toBe('invalid-shell');
    expect(error.sourceLabel).toBe('shell-test');
  });

  it('payload shellProjection.sidebar の present=false を reject すること', () => {
    expect(() =>
      validateNavigationEnvelopeShellProjection({
        header: { ...header, sidebarEnabled: false },
        sidebar: createCanonicalAbsentRuntimeSidebarProjection(),
      }),
    ).toThrow(ShellProjectionValidationError);
  });

  it('payload header/sidebar の sidebarId 整合を検証すること', () => {
    expect(() =>
      validateNavigationEnvelopeShellProjection({
        header,
        sidebar: { ...presentSidebar, sidebarId: 'note-secondary' },
      }),
    ).toThrow(ShellProjectionValidationError);
  });

  it('runtime absent sidebar は canonical object だけを受け入れること', () => {
    expect(validateRuntimeSidebarProjection(createCanonicalAbsentRuntimeSidebarProjection())).toEqual(
      createCanonicalAbsentRuntimeSidebarProjection(),
    );

    expect(() =>
      validateRuntimeSidebarProjection({
        ...createCanonicalAbsentRuntimeSidebarProjection(),
        sidebarId: 'stale-sidebar',
      }),
    ).toThrow(ShellProjectionValidationError);
  });


  it('present sidebar navHtml は validation 後に trim 済み文字列として保持すること', () => {
    const shell = validateNavigationEnvelopeShellProjection({
      header,
      sidebar: {
        ...presentSidebar,
        navHtml: `  ${presentSidebar.navHtml}  `,
      },
    });

    expect(shell?.sidebar?.navHtml).toBe(presentSidebar.navHtml);
  });

  it('runtime absent は payload 変換時に null へ正規化すること', () => {
    expect(normalizeRuntimeSidebarProjectionForPayload(createCanonicalAbsentRuntimeSidebarProjection())).toBeNull();
    expect(normalizeRuntimeSidebarProjectionForPayload(presentSidebar)).toEqual(presentSidebar);
  });

  it('runtime absent canonical object の各 stale field を reject すること', () => {
    const staleCases: [string, Record<string, unknown>][] = [
      ['stateScopeId', { stateScopeId: 'stale-scope' }],
      ['selectedId', { selectedId: 'notes/a' }],
      ['initialExpandedIds', { initialExpandedIds: ['a'] }],
      ['topologyRevision', { topologyRevision: 'topology:stale' }],
      ['navHtml', { navHtml: '<nav data-sidebar-nav></nav>' }],
      ['heading', { heading: 'Stale' }],
      ['fixedBreakpoint', { fixedBreakpoint: 800 }],
      ['presentation', { presentation: 'fixed' }],
    ];

    for (const [label, override] of staleCases) {
      expect(() =>
        validateRuntimeSidebarProjection({
          ...createCanonicalAbsentRuntimeSidebarProjection(),
          ...override,
        }),
      ).toThrow(ShellProjectionValidationError);
    }
  });

  it('ShellProjectionValidationError は reason と sourceLabel を保持すること', () => {
    try {
      validateRuntimeSidebarProjection({
        ...createCanonicalAbsentRuntimeSidebarProjection(),
        navHtml: '<nav data-sidebar-nav></nav>',
      });
      throw new Error('expected validation error');
    } catch (error) {
      expect(error).toBeInstanceOf(ShellProjectionValidationError);
      expect((error as ShellProjectionValidationError).reason).toBe('runtime-absent-non-canonical');
      expect((error as ShellProjectionValidationError).sourceLabel).toBe('shellProjection');
    }
  });

  it('header.sidebarEnabled と sidebar payload の対応を厳密に検証すること', () => {
    expect(() =>
      validateNavigationEnvelopeShellProjection({
        header,
        sidebar: null,
      }),
    ).toThrow(ShellProjectionValidationError);

    expect(() =>
      validateNavigationEnvelopeShellProjection({
        header: { ...header, sidebarEnabled: false },
        sidebar: presentSidebar,
      }),
    ).toThrow(ShellProjectionValidationError);
  });


  it('sidebar disabled header は DEFAULT_SIDEBAR_ID だけを受け入れること', () => {
    expect(
      validateNavigationEnvelopeShellProjection({
        header: { ...header, sidebarEnabled: false, sidebarId: 'note-primary' },
        sidebar: null,
      })?.header.sidebarId,
    ).toBe('note-primary');

    expect(() =>
      validateNavigationEnvelopeShellProjection({
        header: { ...header, sidebarEnabled: false, sidebarId: 'note-secondary' },
        sidebar: null,
      }),
    ).toThrow(ShellProjectionValidationError);
  });

});
