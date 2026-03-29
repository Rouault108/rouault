import type { Meta, StoryObj } from '@storybook/web-components';
import { html, type TemplateResult } from 'lit';
import '../list-item/list-item';
import './list';
import type {
  ColumnDef,
  List,
  PaginationState,
  SortState,
  UiContextRequestDetail,
  UiSortChangeDetail,
} from './list';

interface StoryItem {
  id: string;
  href?: string;
  title: string;
  date: string;
  tags: string;
}

interface ListStoryArgs {
  columns: ColumnDef[];
  items: StoryItem[];
  currentRowId: string | null;
  currentColumnId: string | null;
  sort: SortState | null;
  pagination: PaginationState | null;
  loading: boolean;
  loadingLabel: string | null;
  autoRevealCurrent: boolean;
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
          <ui-icon name="more-horizontal" aria-hidden="true"></ui-icon>
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
      .currentRowId="${args.currentRowId ?? null}"
      .currentColumnId="${args.currentColumnId ?? null}"
      .sort="${args.sort ?? null}"
      .pagination="${args.pagination ?? null}"
      .loading="${args.loading ?? false}"
      .loadingLabel="${args.loadingLabel ?? null}"
      .autoRevealCurrent="${args.autoRevealCurrent ?? false}"
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
  parameters: { rouaultContractKind: 'interaction-contract' },
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

    const firstCell = rowHosts[0].shadowRoot?.querySelector(
      '[role="gridcell"][data-column-id="title"]',
    );
    if (!firstCell) throw new Error('先頭セルが描画されていません');
  },
};

export const Empty: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
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
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => renderList(),
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    if (!list) throw new Error('ui-list が見つかりません');
    await list.updateComplete;

    const sortEvents: UiSortChangeDetail[] = [];
    list.addEventListener('ui-sort-change', (event) => {
      const detail = event.detail;
      sortEvents.push(detail);
      list.sort = { ...detail };
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
  parameters: { rouaultContractKind: 'interaction-contract' },
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
    const firstMetaCell =
      firstRow?.shadowRoot?.querySelector<HTMLElement>('[data-column-id="date"]');
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

export const CellHorizontalNavigation: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
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

    if (list.currentColumnId !== 'date')
      throw new Error('ArrowRight で current 列が移動していません');

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
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => renderList({ currentRowId: 'n-2', currentColumnId: 'title' }),
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    if (!list) throw new Error('ui-list が見つかりません');
    await list.updateComplete;

    const previewRowIds: string[] = [];
    const contextRequests: UiContextRequestDetail[] = [];
    const currentRequests: { rowId: string; columnId: string }[] = [];

    list.addEventListener('ui-preview-request', (event) => {
      previewRowIds.push(event.detail.rowId);
    });
    list.addEventListener('ui-current-change', (event) => {
      currentRequests.push(event.detail);
    });
    list.addEventListener('ui-context-request', (event) => {
      contextRequests.push(event.detail);
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

    if (previewRowIds[0] !== 'n-2') throw new Error('Shift+Space の preview 要求が不正です');
    if (contextRequests.length !== 2) throw new Error('コンテキストメニュー要求回数が不正です');

    const [keyboardContext, pointerContext] = contextRequests;
    if (keyboardContext?.origin !== 'keyboard' || !keyboardContext.anchorRect) {
      throw new Error('Shift+F10 の detail が不正です');
    }
    if (pointerContext?.origin !== 'pointer' || !pointerContext.anchorPoint) {
      throw new Error('contextmenu の detail が不正です');
    }

    if (currentRequests.length < 3) {
      throw new Error('preview/context 前に current 要求が発火していません');
    }
  },
};

export const PaginationContract: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
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
      pagination: { offset: 20, limit: 10, total: 500 },
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
    rouaultContractKind: 'interaction-contract',
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
  parameters: { rouaultContractKind: 'boundary-contract' },
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

export const ControlledCurrent: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => renderList({ currentRowId: 'n-1', currentColumnId: 'title' }),
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    if (!list) throw new Error('ui-list が見つかりません');
    await list.updateComplete;

    let requestCount = 0;
    list.addEventListener('ui-current-change', () => {
      requestCount += 1;
    });

    const row = list.querySelectorAll('ui-list-item')[1];
    const cell = row?.shadowRoot?.querySelector<HTMLElement>('[data-column-id="title"]');
    if (!cell) throw new Error('検証対象セルが見つかりません');

    cell.click();
    await list.updateComplete;

    if (requestCount !== 1) throw new Error('current 要求イベントが発火していません');
    if (list.currentRowId !== 'n-1' || list.currentColumnId !== 'title') {
      throw new Error('外部が state を戻さない限り current は確定してはいけません');
    }
  },
};

export const LoadingState: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () =>
    renderList({ items: [], loading: true, loadingLabel: '検索結果を読み込んでいます' }),
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    if (!list) throw new Error('ui-list が見つかりません');
    await list.updateComplete;

    const status = list.shadowRoot?.querySelector('[role="status"]');
    if (!status) throw new Error('loading 状態メッセージが見つかりません');
    if (!status.textContent.includes('検索結果を読み込んでいます')) {
      throw new Error('loadingLabel が表示されていません');
    }
    if (status.textContent.includes('表示するアイテムがありません')) {
      throw new Error('loading 中に空状態と混同しています');
    }
  },
};

export const RevealCurrent: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => renderList({ currentRowId: 'n-3', currentColumnId: 'title' }),
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    if (!list) throw new Error('ui-list が見つかりません');
    await list.updateComplete;

    let scrollCount = 0;
    const row = list.querySelectorAll('ui-list-item')[2];
    if (!row) throw new Error('current 行が見つかりません');

    const original = row.scrollIntoView.bind(row);
    row.scrollIntoView = ((...args: unknown[]) => {
      scrollCount += 1;
      original(...(args as []));
    }) as typeof row.scrollIntoView;

    list.autoRevealCurrent = true;
    list.currentRowId = 'n-2';
    list.currentColumnId = 'title';
    await list.updateComplete;

    list.currentRowId = 'n-3';
    list.currentColumnId = 'title';
    await list.updateComplete;
    if (scrollCount === 0) {
      throw new Error('autoRevealCurrent による可視範囲復帰が実行されていません');
    }

    scrollCount = 0;
    list.revealCurrent();
    if (scrollCount === 0) {
      throw new Error('revealCurrent() が current 行を可視範囲へ復帰していません');
    }
  },
};

export const ValidationFailures: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <ui-list
      .columns="${[
        { id: 'title', label: 'タイトル', width: '1fr', lead: true, hideOnMobile: true },
        { id: 'title', label: '重複列', width: '120px' },
      ] satisfies ColumnDef[]}"
      current-row-id="broken-row"
      show-actions
    >
      <ui-list-item>
        <span slot="title">invalid row</span>
      </ui-list-item>
    </ui-list>
  `,
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    if (!list) throw new Error('ui-list が見つかりません');

    const warns: string[] = [];
    const originalWarn = console.warn;
    console.warn = (message?: unknown, ...args: unknown[]) => {
      warns.push(String(message));
      originalWarn(message, ...args);
    };

    try {
      list.columns = [...list.columns];
      await list.updateComplete;
    } finally {
      console.warn = originalWarn;
    }

    if (warns.length === 0) {
      throw new Error('構造違反が開発時に検出されていません');
    }
  },
};

export const DarkMode: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
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
