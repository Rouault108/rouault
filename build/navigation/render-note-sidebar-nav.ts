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

const renderRows = (rows: readonly SidebarNavRow[]): string => {
  if (rows.length === 0) {
    return '';
  }

  return `<ul>${rows.map((row) => renderRow(row)).join('')}</ul>`;
};

const renderRow = (row: SidebarNavRow): string => {
  const baseAttributes = [
    `data-node-id="${escapeHtml(row.id)}"`,
    `data-node-kind="${escapeHtml(row.kind)}"`,
    `data-node-depth="${String(row.depth)}"`,
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

  const expanded = row.isStructuralExpanded;
  const groupId = `sidebar-group-${row.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  return [
    `<li ${baseAttributes}>`,
    `<button type="button" data-sidebar-nav-control data-sidebar-nav-branch-control aria-expanded="${expanded ? 'true' : 'false'}" aria-controls="${escapeHtml(groupId)}">`,
    `<span data-sidebar-nav-label>${escapeHtml(row.label)}</span>`,
    renderDisclosureIcon(),
    `</button>`,
    `<ul id="${escapeHtml(groupId)}"${expanded ? '' : ' hidden'}>${row.children.map((child) => renderRow(child)).join('')}</ul>`,
    `</li>`,
  ].join('');
};

export const renderNoteSidebarNav = (
  rows: readonly SidebarNavRow[],
  options: {
    ariaLabel?: string;
    topologyRevision: string;
  },
): string => {
  const ariaLabel = options.ariaLabel?.trim() || 'ノートナビゲーション';
  return `<nav data-sidebar-nav aria-label="${escapeHtml(ariaLabel)}" data-topology-revision="${escapeHtml(options.topologyRevision)}">${renderRows(rows)}</nav>`;
};
