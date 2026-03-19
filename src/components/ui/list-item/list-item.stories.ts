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
  { id: 'title', label: 'タイトル', width: '1fr', primary: true },
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
  activeRow?: string | null;
  activeCellIndex?: number;
  includeTagsSlot?: boolean;
}

const renderInList = (options: InListOptions = {}): TemplateResult => {
  return html`
    <ui-list
      .columns="${columns}"
      .items="${[item]}"
      .activeRow="${options.activeRow ?? null}"
      .activeCellIndex="${options.activeCellIndex ?? 0}"
    >
      <ui-list-item item-id="${item.id}" href="${item.href}">
        <a slot="title" href="${item.href}">${item.title}</a>
        <time slot="date" datetime="${item.date}">${item.date}</time>
        ${options.includeTagsSlot === false ? null : html`<span slot="tags">${item.tags}</span>`}
        <span slot="mobile-supplement">・ ${item.date}</span>
        <button slot="actions" type="button" aria-label="操作">
          <iconify-icon icon="lucide:more-horizontal" aria-hidden="true"></iconify-icon>
        </button>
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
  render: () => renderInList({ activeRow: item.id }),
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    const row = canvasElement.querySelector<ListItem>('ui-list-item');
    if (!list || !row) throw new Error('検証対象が見つかりません');
    await list.updateComplete;
    await row.updateComplete;

    if (row.getAttribute('role') !== 'row') throw new Error('row role が設定されていません');
    if (row.getAttribute('aria-selected') !== 'true') throw new Error('aria-selected が不正です');
    if (row.getAttribute('data-item-id') !== item.id)
      throw new Error('data-item-id 同期が不正です');

    const cells = row.shadowRoot?.querySelectorAll('[role="gridcell"]');
    if (cells?.length !== 4) throw new Error(`セル数が不正です: ${String(cells?.length)}`);

    const primaryLink = row.querySelector<HTMLAnchorElement>('a[slot="title"]');
    if (!primaryLink) throw new Error('primary link が見つかりません');

    const primaryLinkStyle = getComputedStyle(primaryLink);
    if (primaryLinkStyle.textDecorationLine.includes('underline')) {
      throw new Error('primary link に下線が残っています');
    }
  },
};

export const ActiveCellIndexFocus: Story = {
  render: () => renderInList({ activeRow: item.id, activeCellIndex: 1 }),
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    const row = canvasElement.querySelector<ListItem>('ui-list-item');
    if (!list || !row) throw new Error('検証対象が見つかりません');
    await list.updateComplete;
    await row.updateComplete;

    const focused = row.shadowRoot?.activeElement as HTMLElement | null;
    if (focused?.dataset['colIndex'] !== '1') {
      throw new Error('active-cell-index で対象セルにフォーカスしていません');
    }
  },
};

export const EmitsActiveChangeOnArrow: Story = {
  render: () => renderInList({ activeRow: item.id, activeCellIndex: 0 }),
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    const row = canvasElement.querySelector<ListItem>('ui-list-item');
    if (!list || !row) throw new Error('検証対象が見つかりません');
    await list.updateComplete;
    await row.updateComplete;

    const events: { rowId: string; colIndex: number }[] = [];
    list.addEventListener('ui-active-change', (event) => {
      events.push((event as CustomEvent<{ rowId: string; colIndex: number }>).detail);
    });

    const firstCell = row.shadowRoot?.querySelector<HTMLElement>('.cell[data-col-index="0"]');
    if (!firstCell) throw new Error('初期セルが見つかりません');

    firstCell.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }),
    );
    await list.updateComplete;

    const last = events[events.length - 1];
    if (last?.rowId !== item.id || last.colIndex !== 1) {
      throw new Error('ArrowRight の ui-active-change detail が不正です');
    }
  },
};

export const EdgeBoundaryStops: Story = {
  render: () => renderInList({ activeRow: item.id, activeCellIndex: 3 }),
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector<List>('ui-list');
    const row = canvasElement.querySelector<ListItem>('ui-list-item');
    if (!list || !row) throw new Error('検証対象が見つかりません');
    await list.updateComplete;
    await row.updateComplete;

    let eventCount = 0;
    list.addEventListener('ui-active-change', () => {
      eventCount += 1;
    });

    const actionCell = row.shadowRoot?.querySelector<HTMLElement>('.cell[data-col-index="3"]');
    if (!actionCell) throw new Error('右端セルが見つかりません');

    actionCell.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }),
    );
    await list.updateComplete;

    if (eventCount !== 0) throw new Error('右端セルでの ArrowRight は停止すべきです');
  },
};

export const MissingSlotBoundary: Story = {
  render: () => renderInList({ activeRow: item.id, includeTagsSlot: false }),
  play: async ({ canvasElement }) => {
    const row = canvasElement.querySelector<ListItem>('ui-list-item');
    if (!row) throw new Error('ui-list-item が見つかりません');
    await row.updateComplete;

    const cells = row.shadowRoot?.querySelectorAll<HTMLElement>('[role="gridcell"]');
    if (cells?.length !== 4) throw new Error('欠落スロット時のセル構造が崩れています');

    const tagsCell = row.shadowRoot?.querySelector<HTMLElement>('.cell[data-col-index="2"]');
    if (!tagsCell) throw new Error('tags列セルが見つかりません');
    if ((tagsCell.textContent || '').trim().length !== 0) {
      throw new Error('未提供スロットは空セルであるべきです');
    }
  },
};

export const MobileSupplement: Story = {
  render: () => renderInList({ activeRow: item.id }),
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
      throw new Error('mobile-supplement が統合表示されていません');
    }
  },
};

export const StandaloneFallback: Story = {
  render: () => html`
    <ui-list-item item-id="fallback" active active-cell-index="0">
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

    const firstCell = row.shadowRoot?.querySelector<HTMLElement>('.cell[data-col-index="0"]');
    const actionCell = row.shadowRoot?.querySelector<HTMLElement>('.cell[data-col-index="1"]');
    if (!firstCell || !actionCell) throw new Error('フォールバックセルのインデックスが不正です');
  },
};

export const DarkMode: Story = {
  render: () => html`
    <div
      style="
        --bg-default: #0f1115;
        --bg-surface-active: rgba(120, 160, 255, 0.2);
        --bg-hover: rgba(255, 255, 255, 0.08);
        --fg-default: #e7ebf3;
        --fg-muted: #b8c0d4;
        --border-default: #2a3140;
        --primary: #8aa3ff;
        background: #0b0d12;
        padding: 16px;
        color: #e7ebf3;
      "
    >
      ${renderInList({ activeRow: item.id })}
    </div>
  `,
};
