import { expect } from '@open-wc/testing';

import {
  createSidebarGroupId,
  createSidebarGroupIdPrefixFromSidebarIdentity,
  parseSidebarGroupId,
} from '../../shared/navigation/sidebar-group-id.js';

describe('sidebar group id browser runtime contract', () => {
  it('browser runtime で prefix / group id / parse が Node Buffer なしに可逆動作すること', () => {
    expect((globalThis as { Buffer?: unknown }).Buffer).to.equal(undefined);

    const prefix = createSidebarGroupIdPrefixFromSidebarIdentity('note-navigation', 'note-primary');
    const groupId = createSidebarGroupId(prefix, 'music/classical:mozart-requiem');

    expect(parseSidebarGroupId(groupId)).to.deep.equal({
      stateScopeId: 'note-navigation',
      sidebarId: 'note-primary',
      rowId: 'music/classical:mozart-requiem',
    });
  });
});
