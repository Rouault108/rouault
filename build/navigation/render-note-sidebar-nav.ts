import {
  createSidebarGroupId,
  type SidebarGroupIdPrefix,
} from '../../shared/navigation/sidebar-group-id.js';
import type { SidebarNavRow } from '../../shared/navigation/navigation-types.js';

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const renderDisclosureIcon = (): string =>
  [
    '<span data-sidebar-nav-disclosure aria-hidden="true">',
    '<svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">',
    '<path d="M6 3.5L10.5 8L6 12.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path>',
    '</svg>',
    '</span>',
  ].join('');

const renderRows = (rows: readonly SidebarNavRow[], groupIdPrefix: SidebarGroupIdPrefix): string => {
  if (rows.length === 0) {
    throw new Error('[navigation] present sidebar nav must contain at least one row.');
  }

  return `<ul>${rows.map((row) => renderRow(row, groupIdPrefix)).join('')}</ul>`;
};

const renderRow = (row: SidebarNavRow, groupIdPrefix: SidebarGroupIdPrefix): string => {
  const baseAttributes = [
    `data-node-id="${escapeHtml(row.id)}"`,
    `data-node-kind="${escapeHtml(row.kind)}"`,
    `data-node-depth="${String(row.depth)}"`,
    ...(row.kind === 'branch' && row.hasCurrentDescendant ? ['data-current-branch="true"'] : []),
    ...(row.kind === 'branch' && row.hasCurrentDescendant && row.showsCurrentPathIndicator
      ? ['data-current-path-indicator="true"']
      : []),
  ].join(' ');

  if (row.kind === 'leaf') {
    const currentAttribute = row.isCurrent ? ' aria-current="page"' : '';
    return [
      `<li ${baseAttributes}>`,
      `<a data-sidebar-nav-control data-sidebar-nav-link href="${escapeHtml(row.href ?? '')}"${currentAttribute}>`,
      `<span data-sidebar-nav-label>${escapeHtml(row.label)}</span>`,
      `</a>`,
      `</li>`,
    ].join('');
  }

  const expanded = row.isInitiallyExpanded;
  const groupId = createSidebarGroupId(groupIdPrefix, row.id);

  return [
    `<li ${baseAttributes}>`,
    `<button type="button" data-sidebar-nav-control data-sidebar-nav-branch-control aria-expanded="${expanded ? 'true' : 'false'}" aria-controls="${escapeHtml(groupId)}">`,
    `<span data-sidebar-nav-label>${escapeHtml(row.label)}</span>`,
    renderDisclosureIcon(),
    `</button>`,
    `<ul id="${escapeHtml(groupId)}"${expanded ? '' : ' hidden'}>${row.children.map((child) => renderRow(child, groupIdPrefix)).join('')}</ul>`,
    `</li>`,
  ].join('');
};

export const renderNoteSidebarNav = (
  rows: readonly SidebarNavRow[],
  options: {
    ariaLabel?: string;
    sidebarId: string;
    topologyRevision: string;
    groupIdPrefix: SidebarGroupIdPrefix;
  },
): string => {
  const ariaLabel = options.ariaLabel?.trim() || 'ノートナビゲーション';
  const sidebarId = options.sidebarId.trim();
  if (sidebarId.length === 0) {
    throw new Error('[navigation] renderNoteSidebarNav requires a non-empty sidebarId.');
  }

  return `<nav data-sidebar-nav aria-label="${escapeHtml(ariaLabel)}" data-sidebar-id="${escapeHtml(sidebarId)}" data-topology-revision="${escapeHtml(options.topologyRevision)}">${renderRows(rows, options.groupIdPrefix)}</nav>`;
};
