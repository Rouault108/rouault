import { describe, expect, it } from 'vitest';
import {
  SidebarNavHtmlInvariantError,
  validateSidebarNavHtmlInvariant,
} from '../../build/navigation/validate-sidebar-nav-html-invariant.js';
import {
  createSidebarGroupId,
  createSidebarGroupIdPrefixFromSidebarIdentity,
} from '../../shared/navigation/sidebar-group-id.js';
import type { SidebarNavRow } from '../../shared/navigation/navigation-types.js';

const rows: SidebarNavRow[] = [
  {
    id: 'root',
    label: 'Root',
    kind: 'branch',
    href: null,
    depth: 0,
    isCurrent: false,
    hasCurrentDescendant: true,
    isInitiallyExpanded: true,
    showsCurrentPathIndicator: true,
    children: [
      {
        id: 'root/child',
        label: 'Child',
        kind: 'leaf',
        href: '/root/child/',
        depth: 1,
        isCurrent: true,
        hasCurrentDescendant: false,
        isInitiallyExpanded: false,
        showsCurrentPathIndicator: false,
        children: [],
      },
    ],
  },
];

const rootGroupId = createSidebarGroupId(
  createSidebarGroupIdPrefixFromSidebarIdentity('note-navigation', 'note-primary'),
  'root',
);
const validNavHtml = `<nav data-sidebar-nav aria-label="ノートナビゲーション" data-sidebar-id="note-primary" data-topology-revision="rev-1"><ul><li data-node-id="root" data-node-kind="branch" data-node-depth="0" data-current-branch="true" data-current-path-indicator="true"><button type="button" data-sidebar-nav-control data-sidebar-nav-branch-control aria-expanded="true" aria-controls="${rootGroupId}"><span data-sidebar-nav-label>Root</span></button><ul id="${rootGroupId}"><li data-node-id="root/child" data-node-kind="leaf" data-node-depth="1"><a data-sidebar-nav-control data-sidebar-nav-link href="/root/child/" aria-current="page"><span data-sidebar-nav-label>Child</span></a></li></ul></li></ul></nav>`;

describe('sidebar nav html invariant', () => {
  it('present sidebar の navHtml と sidebarRows の構造一致を検証すること', () => {
    expect(() =>
      validateSidebarNavHtmlInvariant({
        sidebarPresent: true,
        navHtml: validNavHtml,
        selectedId: 'root/child',
        sidebarId: 'note-primary',
        stateScopeId: 'note-navigation',
        initialExpandedIds: ['root'],
        topologyRevision: 'rev-1',
        sidebarRows: rows,
        sourceLabel: 'test',
      }),
    ).not.to.throw();
  });

  it('present sidebar の空 navHtml を拒否すること', () => {
    expect(() =>
      validateSidebarNavHtmlInvariant({
        sidebarPresent: true,
        navHtml: '   ',
        selectedId: null,
        sidebarId: 'note-primary',
        stateScopeId: 'note-navigation',
        initialExpandedIds: [],
        topologyRevision: 'rev-1',
        sourceLabel: 'test',
      }),
    ).to.throw(SidebarNavHtmlInvariantError);
  });

  it('selectedId と aria-current の不一致を拒否すること', () => {
    expect(() =>
      validateSidebarNavHtmlInvariant({
        sidebarPresent: true,
        navHtml: validNavHtml.replace('root/child', 'other'),
        selectedId: 'root/child',
        sidebarId: 'note-primary',
        stateScopeId: 'note-navigation',
        initialExpandedIds: ['root'],
        topologyRevision: 'rev-1',
        sidebarRows: rows,
        sourceLabel: 'test',
      }),
    ).to.throw(SidebarNavHtmlInvariantError);
  });

  it('data-node-kind の不正値を leaf fallback せず拒否すること', () => {
    expect(() =>
      validateSidebarNavHtmlInvariant({
        sidebarPresent: true,
        navHtml: validNavHtml.replace('data-node-kind="leaf"', 'data-node-kind="unknown"'),
        selectedId: 'root/child',
        sidebarId: 'note-primary',
        stateScopeId: 'note-navigation',
        initialExpandedIds: ['root'],
        topologyRevision: 'rev-1',
        sidebarRows: rows,
        sourceLabel: 'test',
      }),
    ).to.throw(SidebarNavHtmlInvariantError);
  });

  it('current marker 属性値は true だけを許可すること', () => {
    expect(() =>
      validateSidebarNavHtmlInvariant({
        sidebarPresent: true,
        navHtml: validNavHtml.replace('data-current-branch="true"', 'data-current-branch="false"'),
        selectedId: 'root/child',
        sidebarId: 'note-primary',
        stateScopeId: 'note-navigation',
        initialExpandedIds: ['root'],
        topologyRevision: 'rev-1',
        sidebarRows: rows,
        sourceLabel: 'test',
      }),
    ).to.throw(SidebarNavHtmlInvariantError);

    expect(() =>
      validateSidebarNavHtmlInvariant({
        sidebarPresent: true,
        navHtml: validNavHtml.replace(
          'data-current-path-indicator="true"',
          'data-current-path-indicator="false"',
        ),
        selectedId: 'root/child',
        sidebarId: 'note-primary',
        stateScopeId: 'note-navigation',
        initialExpandedIds: ['root'],
        topologyRevision: 'rev-1',
        sidebarRows: rows,
        sourceLabel: 'test',
      }),
    ).to.throw(SidebarNavHtmlInvariantError);
  });

  it('sidebarRows がなくても DOM の depth と current marker false negative を検出すること', () => {
    expect(() =>
      validateSidebarNavHtmlInvariant({
        sidebarPresent: true,
        navHtml: validNavHtml.replace('data-node-depth="1"', 'data-node-depth="3"'),
        selectedId: 'root/child',
        sidebarId: 'note-primary',
        stateScopeId: 'note-navigation',
        initialExpandedIds: ['root'],
        topologyRevision: 'rev-1',
        sourceLabel: 'test',
      }),
    ).to.throw(SidebarNavHtmlInvariantError);

    expect(() =>
      validateSidebarNavHtmlInvariant({
        sidebarPresent: true,
        navHtml: validNavHtml.replace(' data-current-branch="true"', ''),
        selectedId: 'root/child',
        sidebarId: 'note-primary',
        stateScopeId: 'note-navigation',
        initialExpandedIds: ['root'],
        topologyRevision: 'rev-1',
        sourceLabel: 'test',
      }),
    ).to.throw(SidebarNavHtmlInvariantError);
  });

});
