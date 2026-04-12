import type { SidebarNavRow } from '../../shared/navigation/navigation-types.js';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

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
    return `<li ${baseAttributes}><a href="${escapeHtml(row.href ?? '')}"${currentAttribute}>${escapeHtml(row.label)}</a></li>`;
  }

  const expanded = row.isStructuralExpanded;
  const groupId = `sidebar-group-${row.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  return [
    `<li ${baseAttributes}>`,
    `<button type="button" aria-expanded="${expanded ? 'true' : 'false'}" aria-controls="${escapeHtml(groupId)}">${escapeHtml(row.label)}</button>`,
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
