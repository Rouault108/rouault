import { describe, expect, it } from 'vitest';

import {
  createSidebarGroupId,
  createSidebarGroupIdPrefixFromSidebarIdentity,
  parseSidebarGroupId,
  type SidebarGroupIdPrefix,
} from '../../shared/navigation/sidebar-group-id.js';

describe('sidebar group id contract', () => {
  it('stateScopeId / sidebarId / rowId を可逆に保持すること', () => {
    const prefix = createSidebarGroupIdPrefixFromSidebarIdentity('note-navigation', 'note-primary');
    const groupId = createSidebarGroupId(prefix, 'music/classical:mozart-requiem');

    expect(parseSidebarGroupId(groupId)).toEqual({
      stateScopeId: 'note-navigation',
      sidebarId: 'note-primary',
      rowId: 'music/classical:mozart-requiem',
    });
  });

  it('delimiter を含む rowId でも identity collision を起こさないこと', () => {
    const firstPrefix = createSidebarGroupIdPrefixFromSidebarIdentity('note-navigation', 'note-primary');
    const secondPrefix = createSidebarGroupIdPrefixFromSidebarIdentity('note-navigation-copy', 'note-primary');

    const firstId = createSidebarGroupId(firstPrefix, 'a-b/c:d');
    const secondId = createSidebarGroupId(secondPrefix, 'a-b/c:d');

    expect(firstId).not.toBe(secondId);
    expect(parseSidebarGroupId(firstId)?.stateScopeId).toBe('note-navigation');
    expect(parseSidebarGroupId(secondId)?.stateScopeId).toBe('note-navigation-copy');
  });

  it('decoded identity を再検証し、tamper された ID を拒否すること', () => {
    const prefix = createSidebarGroupIdPrefixFromSidebarIdentity('note-navigation', 'note-primary');
    const groupId = createSidebarGroupId(prefix, 'music');

    expect(parseSidebarGroupId(groupId.replace(/.$/u, '_'))).toBeNull();
    expect(parseSidebarGroupId('sidebar-identity-3-abc-3-def-3-ghi-extra')).toBeNull();
    expect(parseSidebarGroupId('legacy-sidebar-group-music')).toBeNull();
  });

  it('invalid identity から prefix を作らないこと', () => {
    expect(() => createSidebarGroupIdPrefixFromSidebarIdentity('', 'note-primary')).toThrow();
    expect(() => createSidebarGroupIdPrefixFromSidebarIdentity('note-navigation', '')).toThrow();
    expect(() => createSidebarGroupId(createSidebarGroupIdPrefixFromSidebarIdentity('note-navigation', 'note-primary'), '')).toThrow();
  });

  it('invalid groupIdPrefix では group id を作らないこと', () => {
    expect(() =>
      createSidebarGroupId('sidebar-identity-broken' as SidebarGroupIdPrefix, 'row-id'),
    ).toThrow(/prefix is invalid/u);
  });

  it('browser-safe helper として Buffer / node:buffer に依存しないこと', async () => {
    const source = await import('node:fs/promises').then(({ readFile }) =>
      readFile(new URL('../../shared/navigation/sidebar-group-id.ts', import.meta.url), 'utf8'),
    );

    expect(source).not.toContain('Buffer');
    expect(source).not.toContain('node:buffer');
  });

});
