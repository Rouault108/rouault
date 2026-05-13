import { describe, expect, it } from 'vitest';

import { renderNoteSidebarNav } from '../../build/navigation/render-note-sidebar-nav.js';
import { createSidebarGroupIdPrefixFromSidebarIdentity } from '../../shared/navigation/sidebar-group-id.js';
import type { SidebarNavRow } from '../../shared/navigation/navigation-types.js';

const groupIdPrefix = createSidebarGroupIdPrefixFromSidebarIdentity(
  'note-navigation',
  'note-primary',
);

const rows: SidebarNavRow[] = [
  {
    id: 'program',
    label: 'Program',
    kind: 'branch',
    depth: 0,
    isCurrent: false,
    hasCurrentDescendant: true,
    showsCurrentPathIndicator: true,
    isInitiallyExpanded: true,
    children: [
      {
        id: 'program/typescript',
        label: 'TypeScript',
        kind: 'leaf',
        href: '/notes/program/typescript/',
        depth: 1,
        isCurrent: true,
        hasCurrentDescendant: false,
        showsCurrentPathIndicator: false,
        isInitiallyExpanded: false,
        children: [],
      },
    ],
  },
  {
    id: 'math',
    label: 'Math',
    kind: 'branch',
    depth: 0,
    isCurrent: false,
    hasCurrentDescendant: true,
    showsCurrentPathIndicator: false,
    isInitiallyExpanded: false,
    children: [
      {
        id: 'math/algebra',
        label: 'Algebra',
        kind: 'leaf',
        href: '/notes/math/algebra/',
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

describe('renderNoteSidebarNav', () => {
  it('sidebar identity / topologyRevision / group id prefix を explicit option として DOM に反映すること', () => {
    const html = renderNoteSidebarNav(rows, {
      sidebarId: 'note-primary',
      topologyRevision: 'topology:test',
      groupIdPrefix,
    });

    expect(html).toContain('data-sidebar-id="note-primary"');
    expect(html).toContain('data-topology-revision="topology:test"');
    expect(html).toContain('aria-controls="sidebar-identity-');
    expect(html).toContain('id="sidebar-identity-');
  });

  it('current branch と current path indicator を分離し aria-current は leaf link だけに出すこと', () => {
    const html = renderNoteSidebarNav(rows, {
      sidebarId: 'note-primary',
      topologyRevision: 'topology:test',
      groupIdPrefix,
    });

    expect(html.match(/data-current-branch="true"/gu)).toHaveLength(2);
    expect(html.match(/data-current-path-indicator="true"/gu)).toHaveLength(1);
    expect(html.match(/aria-current="page"/gu)).toHaveLength(1);
    expect(html).toContain(
      '<a data-sidebar-nav-control data-sidebar-nav-link href="/notes/program/typescript/" aria-current="page">',
    );
  });

  it('present sidebar の空 row と空 sidebarId を reject すること', () => {
    expect(() =>
      renderNoteSidebarNav([], {
        sidebarId: 'note-primary',
        topologyRevision: 'topology:test',
        groupIdPrefix,
      }),
    ).toThrow(/at least one row/u);

    expect(() =>
      renderNoteSidebarNav(rows, {
        sidebarId: '   ',
        topologyRevision: 'topology:test',
        groupIdPrefix,
      }),
    ).toThrow(/non-empty sidebarId/u);
  });
});
