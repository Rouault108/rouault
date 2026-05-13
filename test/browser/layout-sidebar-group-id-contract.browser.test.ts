import { expect, fixture, html } from '@open-wc/testing';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

import { renderNoteSidebarNav } from '../../build/navigation/render-note-sidebar-nav.js';
import { createSidebarGroupIdPrefixFromSidebarIdentity, parseSidebarGroupId } from '../../shared/navigation/sidebar-group-id.js';
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

describe('layout-sidebar group id browser contract', () => {
  it('同一 rowId でも stateScopeId / sidebarId ごとに document-wide に一意な ul[id] を生成すること', async () => {
    const primaryMarkup = renderNoteSidebarNav(rows, {
      sidebarId: 'note-primary',
      topologyRevision: 'topology:groups',
      groupIdPrefix: createSidebarGroupIdPrefixFromSidebarIdentity('note-navigation', 'note-primary'),
    });
    const secondaryMarkup = renderNoteSidebarNav(rows, {
      sidebarId: 'note-secondary',
      topologyRevision: 'topology:groups',
      groupIdPrefix: createSidebarGroupIdPrefixFromSidebarIdentity('note-navigation', 'note-secondary'),
    });

    const wrapper = await fixture<HTMLDivElement>(html`
      <div data-app-shell-sidebar-overlay-layer>
        <section data-app-shell-sidebar-host>${unsafeHTML(primaryMarkup)}</section>
        <section data-app-shell-sidebar-host>${unsafeHTML(secondaryMarkup)}</section>
      </div>
    `);

    const ids = collectUlIds(wrapper);
    expect(ids.length).to.be.greaterThan(0);
    expect(new Set(ids).size).to.equal(ids.length);

    const parsed = ids.map((id) => parseSidebarGroupId(id));
    expect(parsed.every((item) => item !== null)).to.equal(true);
    expect(parsed.map((item) => item?.sidebarId)).to.deep.equal(['note-primary', 'note-secondary']);
  });
});
