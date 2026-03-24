import type { Meta, StoryObj } from '@storybook/web-components';
import { html, type TemplateResult } from 'lit';
import '../list-item/list-item';
import './list';
import type { ColumnDef, List, ListItemData } from './list';

type SortDirection = 'asc' | 'desc' | null;

interface StoryItem extends ListItemData {
  title: string;
  date: string;
  tags: string;
}

interface ListStoryArgs {
  columns: ColumnDef[];
  items: StoryItem[];
  currentRowId: string | null;
  currentColumnId: string | null;
  sortKey: string | null;
  sortDirection: SortDirection;
  totalRowCount: number | null;
  rowIndexOffset: number;
  showActions: boolean;
}

const columns: ColumnDef[] = [
  { id: 'title', label: 'タイトル', width: '1fr', lead: true, defaultAction: true },
  { id: 'date', label: '日付', width: '120px', sortable: true, hideOnMobile: true },
  { id: 'tags', label: 'タグ', width: '160px', hideOnMobile: true },
];

const items: StoryItem[] = [
  { id: 'n-1', href: '/notes/1', title: '初期ノート', date: '2026-01-03', tags: 'lit' },
  { id: 'n-2', href: '/notes/2', title: 'アクセシビリティ検証', date: '2026-01-08', tags: 'a11y' },
  { id: 'n-3', href: '/notes/3', title: '設計メモ', date: '2026-01-16', tags: 'design' },
  { id: 'n-4', href: '/notes/4', title: '検索戦略', date: '2026-01-18', tags: 'search' },
  { id: 'n-5', href: '/notes/5', title: '運用ノート', date: '2026-01-27', tags: 'ops' },
];

const firstItem = items[0];
if (!firstItem) {
  throw new Error('list stories: 初期データが不足しています');
}

const buildRows = (rows: StoryItem[]): TemplateResult[] => {
  return rows.map(
    (item) => html`
      <ui-list-item row-id="${item.id}">
        <a slot="title" href="${item.href ?? '#'}">${item.title}</a>
        <time slot="date" datetime="${item.date}">${item.date}</time>
        <span slot="tags">${item.tags}</span>
        <span slot="mobile-supplement">・ ${item.date}</span>
        <button slot="actions" type="button" aria-label="操作">
          <iconify-icon icon="lucide:more-horizontal" aria-hidden="true"></iconify-icon>
        </button>
      </ui-list-item>
    `,
  );
};

const renderList = (args: Partial<ListStoryArgs> = {}): TemplateResult => {
  const resolvedColumns = args.columns ?? columns;
  const resolvedItems = args.items ?? items;

  return html`
    <ui-list
      .columns="${resolvedColumns}"
      .items="${resolvedItems}"
      .currentRowId="${args.currentRowId ?? null}"
      .currentColumnId="${args.currentColumnId ?? null}"
      .sortKey="${args.sortKey ?? null}"
      .sortDirection="${args.sortDirection ?? null}"
      .totalRowCount="${args.totalRowCount ?? null}"
      .rowIndexOffset="${args.rowIndexOffset ?? 0}"
      .showActions="${args.showActions ?? true}"
    >
      ${buildRows(resolvedItems)}
    </ui-list>
  `;
};

const meta: Meta<List> = {
  title: 'Components/List',
  component: 'ui-list',
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<List>;

export const Default: Story = {
  render: () => renderList(),
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    if (!list) throw new Error('ui-list が見つかりません');
    await list.updateComplete;

    const grid = list.shadowRoot?.querySelector('[role="grid"]');
    if (!grid) throw new Error('grid が見つかりません');

    const headers = list.shadowRoot?.querySelectorAll('[role="columnheader"]');
    if (headers?.length !== 4) {
      throw new Error(`columnheader 数が不正です: ${String(headers?.length)}`);
    }

    const rowHosts = list.querySelectorAll('ui-list-item');
    if (rowHosts.length !== 5) throw new Error(`行数が不正です: ${String(rowHosts.length)}`);
    if (rowHosts[0]?.getAttribute('row-id') !== 'n-1') {
      throw new Error('先頭行の row-id が同期されていません');
    }

    const firstCell = rowHosts[0].shadowRoot?.querySelector('[role="gridcell"][data-column-id="title"]');
    if (!firstCell) throw new Error('先頭セルが描画されていません');
  },
};

export const Empty: Story = {
  render: () => renderList({ items: [] }),
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    if (!list) throw new Error('ui-list が見つかりません');
    await list.updateComplete;

    const status = list.shadowRoot?.querySelector('[role="status"]');
    if (!status) throw new Error('空状態メッセージが見つかりません');
    if (status.getAttribute('aria-live') !== 'polite') {
      throw new Error('空状態の aria-live が不正です');
    }

    const pagination = list.shadowRoot?.querySelector('ui-pagination');
    if (pagination) throw new Error('空状態で pagination は表示されません');
  },
};

export const SortCycle: Story = {
  render: () => renderList(),
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    if (!list) throw new Error('ui-list が見つかりません');
    await list.updateComplete;

    const sortEvents: { key: string | null; direction: SortDirection }[] = [];
    list.addEventListener('ui-sort-change', (event) => {
      const detail = (event as CustomEvent<{ key: string | null; direction: SortDirection }>).detail;
      sortEvents.push(detail);
      list.sortKey = detail.key;
      list.sortDirection = detail.direction;
    });

    const dateHeader = list.shadowRoot?.querySelectorAll<HTMLElement>('[role="columnheader"]')[1];
    if (!dateHeader) throw new Error('日付ヘッダーが見つかりません');

    dateHeader.click();
    dateHeader.click();
    dateHeader.click();

    const [first, second, third] = sortEvents;
    if (first?.key !== 'date' || first.direction !== 'asc') {
      throw new Error('1回目のソート循環が不正です');
    }
    if (second?.key !== 'date' || second.direction !== 'desc') {
      throw new Error('2回目のソート循環が不正です');
    }
    if (third?.key !== null || third.direction !== null) {
      throw new Error('3回目のソート循環が不正です');
    }
  },
};

export const KeyboardRowNavigation: Story = {
  render: () => renderList({ currentRowId: 'n-1', currentColumnId: 'date' }),
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    if (!list) throw new Error('ui-list が見つかりません');
    await list.updateComplete;

    const currentChanges: { rowId: string; columnId: string }[] = [];
    list.addEventListener('ui-current-change', (event) => {
      const detail = (event as CustomEvent<{ rowId: string; columnId: string }>).detail;
      currentChanges.push(detail);
      list.currentRowId = detail.rowId;
      list.currentColumnId = detail.columnId;
    });

    const firstRow = list.querySelectorAll('ui-list-item')[0];
    const firstMetaCell = firstRow?.shadowRoot?.querySelector<HTMLElement>('[data-column-id="date"]');
    if (!firstMetaCell) throw new Error('初期セルが見つかりません');

    firstMetaCell.focus();
    firstMetaCell.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }),
    );
    await list.updateComplete;

    if (list.currentRowId !== 'n-2' || list.currentColumnId !== 'date') {
      throw new Error('ArrowDown で current の行列が更新されていません');
    }

    const last = currentChanges[currentChanges.length - 1];
    if (last?.rowId !== 'n-2' || last.columnId !== 'date') {
      throw new Error('ui-current-change の detail が不正です');
    }
  },
};

export const CurrentColumnNavigation: Story = {
  render: () => renderList({ currentRowId: 'n-1', currentColumnId: 'title' }),
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    if (!list) throw new Error('ui-list が見つかりません');
    await list.updateComplete;

    const changes: { rowId: string; columnId: string }[] = [];
    list.addEventListener('ui-current-change', (event) => {
      const detail = (event as CustomEvent<{ rowId: string; columnId: string }>).detail;
      changes.push(detail);
      list.currentRowId = detail.rowId;
      list.currentColumnId = detail.columnId;
    });

    const row = list.querySelectorAll('ui-list-item')[0];
    const cell0 = row?.shadowRoot?.querySelector<HTMLElement>('[data-column-id="title"]');
    const cell2 = row?.shadowRoot?.querySelector<HTMLElement>('[data-column-id="tags"]');
    if (!cell0 || !cell2) throw new Error('セル境界の準備に失敗しました');

    cell0.focus();
    cell0.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }),
    );
    await list.updateComplete;

    if (list.currentColumnId !== 'date') throw new Error('ArrowRight で current 列が移動していません');

    cell2.focus();
    const before = changes.length;
    cell2.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }),
    );
    await list.updateComplete;

    if (changes.length !== before) throw new Error('右端セルでの ArrowRight は停止すべきです');
  },
};

export const PreviewAndContextRequests: Story = {
  render: () => renderList({ currentRowId: 'n-2', currentColumnId: 'title' }),
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    if (!list) throw new Error('ui-list が見つかりません');
    await list.updateComplete;

    let previewRowId: string | null = null;
    const contextRowIds: string[] = [];

    list.addEventListener('ui-preview-request', (event) => {
      previewRowId = (event as CustomEvent<{ rowId: string }>).detail.rowId;
    });
    list.addEventListener('ui-context-request', (event) => {
      contextRowIds.push((event as CustomEvent<{ rowId: string }>).detail.rowId);
    });

    const row = list.querySelectorAll('ui-list-item')[1];
    const cell = row?.shadowRoot?.querySelector<HTMLElement>('[data-column-id="title"]');
    if (!cell) throw new Error('検証対象セルが見つかりません');

    cell.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', shiftKey: true, bubbles: true, composed: true }),
    );
    cell.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'F10', shiftKey: true, bubbles: true, composed: true }),
    );
    cell.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, composed: true, button: 2 }));
    await list.updateComplete;

    if (previewRowId !== 'n-2') throw new Error('Shift+Space の preview 要求が不正です');
    if (contextRowIds.length !== 2 || contextRowIds[0] !== 'n-2' || contextRowIds[1] !== 'n-2') {
      throw new Error('コンテキストメニュー要求が不正です');
    }
  },
};

export const PaginationAria: Story = {
  render: () => {
    const pagedItems: StoryItem[] = Array.from({ length: 10 }, (_, index) => {
      const id = `p-${String(index + 21)}`;
      return {
        id,
        href: `/notes/${String(index + 21)}`,
        title: `ページング項目 ${String(index + 21)}`,
        date: '2026-01-01',
        tags: 'pagination',
      };
    });

    return renderList({
      items: pagedItems,
      totalRowCount: 500,
      rowIndexOffset: 20,
    });
  },
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    if (!list) throw new Error('ui-list が見つかりません');
    await list.updateComplete;

    const grid = list.shadowRoot?.querySelector('[role="grid"]');
    if (grid?.getAttribute('aria-rowcount') !== '500') {
      throw new Error('aria-rowcount が総件数を示していません');
    }

    const firstRow = list.querySelector('ui-list-item');
    if (firstRow?.getAttribute('aria-rowindex') !== '22') {
      throw new Error('ページング時の aria-rowindex が不正です');
    }

    const pagination = list.shadowRoot?.querySelector('ui-pagination');
    if (!pagination) throw new Error('pagination が表示されていません');
  },
};

export const MobileColumnsAndSupplement: Story = {
  render: () => renderList({ currentRowId: 'n-1', currentColumnId: 'title' }),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    if (!list) throw new Error('ui-list が見つかりません');
    await list.updateComplete;

    const mobileList = list as unknown as { _isMobile: boolean; requestUpdate: () => void };
    mobileList._isMobile = true;
    mobileList.requestUpdate();
    await list.updateComplete;

    const headers = list.shadowRoot?.querySelectorAll('[role="columnheader"]');
    if (headers?.length !== 2) {
      throw new Error(`モバイル時のヘッダー数が不正です: ${String(headers?.length)}`);
    }

    const firstRow = list.querySelector('ui-list-item');
    await firstRow?.updateComplete;
    const cells = firstRow?.shadowRoot?.querySelectorAll('[role="gridcell"]');
    if (cells?.length !== 2) throw new Error('モバイル時に非表示列がDOM抑制されていません');

    const supplementSlot = firstRow?.shadowRoot?.querySelector<HTMLSlotElement>(
      '.mobile-supplement slot[name="mobile-supplement"]',
    );
    const assigned = supplementSlot?.assignedElements({ flatten: true }) ?? [];
    if (assigned.length === 0) {
      throw new Error('mobile-supplement が表示されていません');
    }
  },
};

export const SingleRowBoundary: Story = {
  render: () => renderList({ items: [firstItem], currentRowId: 'n-1', currentColumnId: 'title' }),
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    if (!list) throw new Error('ui-list が見つかりません');
    await list.updateComplete;

    let currentChangeCount = 0;
    list.addEventListener('ui-current-change', () => {
      currentChangeCount += 1;
    });

    const row = list.querySelector('ui-list-item');
    const cell = row?.shadowRoot?.querySelector<HTMLElement>('[data-column-id="title"]');
    if (!cell) throw new Error('検証対象セルが見つかりません');

    cell.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }),
    );
    await list.updateComplete;

    if (currentChangeCount !== 0) throw new Error('単一行で ArrowDown による遷移は発生しません');
  },
};

export const DarkMode: Story = {
  render: () => html`
    <div
      style="
        --bg-default: #0f1115;
        --bg-surface-active: rgba(120, 160, 255, 0.2);
        --bg-hover: rgba(255, 255, 255, 0.08);
        --bg-subtle: rgba(255, 255, 255, 0.05);
        --fg-default: #e7ebf3;
        --fg-muted: #b8c0d4;
        --border-default: #2a3140;
        --primary: #8aa3ff;
        background: #0b0d12;
        padding: 16px;
        color: #e7ebf3;
      "
    >
      ${renderList({ currentRowId: 'n-2', currentColumnId: 'title' })}
    </div>
  `,
};
