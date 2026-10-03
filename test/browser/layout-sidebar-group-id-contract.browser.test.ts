import { describe, expect, it } from 'vitest';
import { fixture } from './harness/browser-fixture.js';

import { renderNoteSidebarNav } from '../../build/navigation/render-note-sidebar-nav.js';
import {
  createSidebarGroupIdPrefixFromSidebarIdentity,
  parseSidebarGroupId,
} from '../../shared/navigation/sidebar-group-id.js';
import type { SidebarNavRow } from '../../shared/navigation/navigation-types.js';

const rows: readonly SidebarNavRow[] = [
  {
    id: 'music',
    label: 'Music',
    kind: 'branch',
    depth: 0,
    isCurrent: false,
    hasCurrentDescendant: false,
    showsCurrentPathIndicator: false,
    isInitiallyExpanded: true,
    children: [
      {
        id: 'music/mozart',
        label: 'Mozart',
        kind: 'leaf',
        href: '/notes/music/mozart',
        depth: 1,
        isCurrent: false,
        hasCurrentDescendant: false,
        showsCurrentPathIndicator: false,
        isInitiallyExpanded: false,
        children: [],
      },
    ],
  },
];

const collectUlIds = (root: ParentNode): string[] =>
  [...root.querySelectorAll<HTMLUListElement>('ul[id]')].map((element) => element.id);

const renderMarkup = (sidebarId: string): string =>
  renderNoteSidebarNav(rows, {
    sidebarId,
    topologyRevision: 'topology:groups',
    groupIdPrefix: createSidebarGroupIdPrefixFromSidebarIdentity('note-navigation', sidebarId),
  });

const expectUniqueControlledGroups = (root: ParentNode): string[] => {
  const ids = collectUlIds(root);
  expect(ids.length).to.be.greaterThan(0);
  expect(new Set(ids).size).to.equal(ids.length);

  const branches = root.querySelectorAll('details[data-sidebar-nav-branch]');
  expect(branches.length).to.equal(ids.length);
  for (const branch of branches) {
    const summary = branch.querySelector(':scope > summary');
    const group = branch.querySelector(':scope > ul');
    expect(summary).to.be.instanceOf(HTMLElement);
    expect(group).to.be.instanceOf(HTMLUListElement);
    expect(group?.id).to.be.oneOf(ids);
    expect(summary?.hasAttribute('aria-expanded')).to.equal(false);
  }

  return ids;
};

describe('layout-sidebar group id browser contract', () => {
  it('同一 rowId でも stateScopeId / sidebarId ごとに document-wide に一意な ul[id] を生成すること', async () => {
    const primaryMarkup = renderMarkup('note-primary');
    const secondaryMarkup = renderMarkup('note-secondary');

    const wrapper = await fixture<HTMLDivElement>(`
      <div data-app-shell-sidebar-overlay-layer>
        <section data-app-shell-sidebar-host>${primaryMarkup}</section>
        <section data-app-shell-sidebar-host>${secondaryMarkup}</section>
      </div>
    `);

    const ids = expectUniqueControlledGroups(wrapper);
    const parsed = ids.map((id) => parseSidebarGroupId(id));
    expect(parsed.every((item) => item !== null)).to.equal(true);
    expect(parsed.map((item) => item?.sidebarId)).to.deep.equal(['note-primary', 'note-secondary']);
  });
});
