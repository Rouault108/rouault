import type { Meta, StoryObj } from '@storybook/web-components';
import { html, type TemplateResult } from 'lit';
import '../list/list';
import './list-item';
import type { List } from '../list/list';
import type { ListItem } from './list-item';

interface SingleItemModel {
  id: string;
  href: string;
  title: string;
  date: string;
  tags: string;
}

const columns = [
  { id: 'title', label: 'タイトル', width: '1fr', lead: true },
  { id: 'date', label: '日付', width: '120px', hideOnMobile: true },
  { id: 'tags', label: 'タグ', width: '140px', hideOnMobile: true },
];

const item: SingleItemModel = {
  id: 'row-1',
  href: '/notes/row-1',
  title: 'List Item 単体検証',
  date: '2026-02-01',
  tags: 'component',
};

interface InListOptions {
  currentRowId?: string | null;
  currentColumnId?: string | null;
  includeTagsSlot?: boolean;
  showActions?: boolean;
  includeUnknownSlot?: boolean;
}

const renderInList = (options: InListOptions = {}): TemplateResult => {
  return html`
    <ui-list
      .columns="${columns}"
      .showActions="${options.showActions ?? true}"
      .currentRowId="${options.currentRowId ?? null}"
      .currentColumnId="${options.currentColumnId ?? null}"
    >
      <ui-list-item row-id="${item.id}">
        <a slot="title" href="${item.href}">${item.title}</a>
        <time slot="date" datetime="${item.date}">${item.date}</time>
        ${options.includeTagsSlot === false ? null : html`<span slot="tags">${item.tags}</span>`}
        <span slot="mobile-supplement">・ ${item.date}</span>
        <button slot="actions" type="button" aria-label="操作">
          <iconify-icon icon="lucide:more-horizontal" aria-hidden="true"></iconify-icon>
        </button>
        ${options.includeUnknownSlot ? html`<span slot="unknown">ignored</span>` : null}
      </ui-list-item>
    </ui-list>
  `;
};

const meta: Meta<ListItem> = {
  title: 'Components/ListItem',
  component: 'ui-list-item',
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<ListItem>;

export const DefaultInList: Story = {
  render: () => renderInList({ currentRowId: item.id, currentColumnId: 'title' }),
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    const row = canvasElement.querySelector<ListItem>('ui-list-item');
    if (!list || !row) throw new Error('検証対象が見つかりません');
    await list.updateComplete;
    await row.updateComplete;

    if (row.getAttribute('role') !== 'row') throw new Error('row role が設定されていません');
    if (row.getAttribute('aria-selected') !== null) throw new Error('aria-selected は不要です');
    if (row.getAttribute('row-id') !== item.id) throw new Error('row-id が同期されていません');

    const cells = row.shadowRoot?.querySelectorAll('[role="gridcell"]');
    if (cells?.length !== 4) throw new Error(`セル数が不正です: ${String(cells?.length)}`);

    const primaryCell = row.shadowRoot?.querySelector<HTMLElement>('[data-column-id="title"]');
    if (!primaryCell) throw new Error('lead 列セルが見つかりません');
  },
};

export const CurrentColumnProjection: Story = {
  render: () => renderInList({ currentRowId: item.id, currentColumnId: 'date' }),
  play: async ({ canvasElement }) => {
    const row = canvasElement.querySelector<ListItem>('ui-list-item');
    if (!row) throw new Error('ui-list-item が見つかりません');
    await row.updateComplete;

    const currentCell = row.shadowRoot?.querySelector<HTMLElement>('.cell--current');
    if (currentCell?.dataset['columnId'] !== 'date') {
      throw new Error('currentColumnId に一致する data cell へ current が投影されていません');
    }
  },
};

export const EmitsCurrentChangeOnArrow: Story = {
  render: () => renderInList({ currentRowId: item.id, currentColumnId: 'title' }),
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    const row = canvasElement.querySelector<ListItem>('ui-list-item');
    if (!list || !row) throw new Error('検証対象が見つかりません');
    await list.updateComplete;
    await row.updateComplete;

    const events: { rowId: string; columnId: string }[] = [];
    list.addEventListener('ui-current-change', (event) => {
      const detail = (event as CustomEvent<{ rowId: string; columnId: string }>).detail;
      events.push(detail);
      list.currentRowId = detail.rowId;
      list.currentColumnId = detail.columnId;
    });

    const firstCell = row.shadowRoot?.querySelector<HTMLElement>('[data-column-id="title"]');
    if (!firstCell) throw new Error('初期セルが見つかりません');

    firstCell.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }),
    );
    await list.updateComplete;
    await row.updateComplete;

    const last = events[events.length - 1];
    if (last?.rowId !== item.id || last.columnId !== 'date') {
      throw new Error('ArrowRight の ui-current-change detail が不正です');
    }
  },
};

export const EdgeBoundaryStopsByColumnId: Story = {
  render: () => renderInList({ currentRowId: item.id, currentColumnId: 'tags' }),
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    const row = canvasElement.querySelector<ListItem>('ui-list-item');
    if (!list || !row) throw new Error('検証対象が見つかりません');
    await list.updateComplete;
    await row.updateComplete;

    let eventCount = 0;
    list.addEventListener('ui-current-change', () => {
      eventCount += 1;
    });

    const lastDataCell = row.shadowRoot?.querySelector<HTMLElement>('[data-column-id="tags"]');
    if (!lastDataCell) throw new Error('右端 data cell が見つかりません');

    lastDataCell.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }),
    );
    await row.updateComplete;

    if (eventCount !== 0) throw new Error('右端 data cell での ArrowRight は停止すべきです');
  },
};

export const MissingSlotBoundary: Story = {
  render: () => renderInList({ currentRowId: item.id, currentColumnId: 'title', includeTagsSlot: false }),
  play: async ({ canvasElement }) => {
    const row = canvasElement.querySelector<ListItem>('ui-list-item');
    if (!row) throw new Error('ui-list-item が見つかりません');
    await row.updateComplete;

    const cells = row.shadowRoot?.querySelectorAll<HTMLElement>('[role="gridcell"]');
    if (cells?.length !== 4) throw new Error('欠落スロット時のセル構造が崩れています');

    const tagsCell = row.shadowRoot?.querySelector<HTMLElement>('[data-column-id="tags"]');
    if (!tagsCell) throw new Error('tags 列セルが見つかりません');
    if ((tagsCell.textContent || '').trim().length !== 0) {
      throw new Error('未提供スロットは空セルであるべきです');
    }
  },
};

export const HiddenCurrentColumnBoundary: Story = {
  render: () => renderInList({ currentRowId: item.id, currentColumnId: 'date' }),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    const row = canvasElement.querySelector<ListItem>('ui-list-item');
    if (!list || !row) throw new Error('検証対象が見つかりません');
    await list.updateComplete;

    const mobileList = list as unknown as { _isMobile: boolean; requestUpdate: () => void };
    mobileList._isMobile = true;
    mobileList.requestUpdate();
    await list.updateComplete;
    await row.updateComplete;

    const currentCell = row.shadowRoot?.querySelector('.cell--current');
    if (currentCell) {
      throw new Error('非表示列が currentColumnId のとき、子は勝手に別列へ current を移してはいけません');
    }
  },
};

export const ActionRegionExcludedFromCurrent: Story = {
  render: () => renderInList({ currentRowId: item.id, currentColumnId: 'title' }),
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    const row = canvasElement.querySelector<ListItem>('ui-list-item');
    if (!list || !row) throw new Error('検証対象が見つかりません');
    await list.updateComplete;
    await row.updateComplete;

    let eventCount = 0;
    list.addEventListener('ui-current-change', () => {
      eventCount += 1;
    });

    const actionButton = row.querySelector<HTMLButtonElement>('button[slot="actions"]');
    if (!actionButton) throw new Error('actions button が見つかりません');

    actionButton.click();
    await row.updateComplete;

    if (eventCount !== 0) throw new Error('actions 領域は current 列モデルに参加しません');
  },
};

export const UnknownSlotIgnoredWithWarning: Story = {
  render: () => renderInList({ currentRowId: item.id, currentColumnId: 'title', includeUnknownSlot: true }),
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    const row = canvasElement.querySelector<ListItem>('ui-list-item');
    if (!list || !row) throw new Error('ui-list-item が見つかりません');

    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (message?: unknown) => {
      warnings.push(String(message));
    };

    try {
      list.columns = [...columns];
      await list.updateComplete;
      row.requestListContext();
      await row.updateComplete;
    } finally {
      console.warn = originalWarn;
    }

    if (!warnings.some((message) => message.includes('未知の slot'))) {
      throw new Error('未知 slot の警告が出ていません');
    }
  },
};

export const MobileSupplement: Story = {
  render: () => renderInList({ currentRowId: item.id, currentColumnId: 'title' }),
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    const row = canvasElement.querySelector<ListItem>('ui-list-item');
    if (!list || !row) throw new Error('検証対象が見つかりません');
    await list.updateComplete;

    const mobileList = list as unknown as { _isMobile: boolean; requestUpdate: () => void };
    mobileList._isMobile = true;
    mobileList.requestUpdate();
    await list.updateComplete;
    await row.updateComplete;

    const cells = row.shadowRoot?.querySelectorAll('[role="gridcell"]');
    if (cells?.length !== 2) throw new Error('モバイル時に非表示列がDOM抑制されていません');

    const supplementSlot = row.shadowRoot?.querySelector<HTMLSlotElement>(
      '.mobile-supplement slot[name="mobile-supplement"]',
    );
    const assigned = supplementSlot?.assignedElements({ flatten: true }) ?? [];
    if (assigned.length === 0) {
      throw new Error('mobile-supplement が lead 領域へ再掲されていません');
    }
  },
};

export const StandaloneFallback: Story = {
  render: () => html`
    <ui-list-item row-id="fallback" current current-column-id="__default__">
      <span>コンテキスト未接続時のフォールバック</span>
      <button slot="actions" type="button" aria-label="操作">...</button>
    </ui-list-item>
  `,
  play: async ({ canvasElement }) => {
    const row = canvasElement.querySelector<ListItem>('ui-list-item');
    if (!row) throw new Error('ui-list-item が見つかりません');
    await row.updateComplete;

    const cells = row.shadowRoot?.querySelectorAll('[role="gridcell"]');
    if (cells?.length !== 2) throw new Error('フォールバック構造が不正です');

    const firstCell = row.shadowRoot?.querySelector<HTMLElement>('[data-column-id="__default__"]');
    if (!firstCell) throw new Error('フォールバック data cell が見つかりません');
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
      ${renderInList({ currentRowId: item.id, currentColumnId: 'title' })}
    </div>
  `,
};
