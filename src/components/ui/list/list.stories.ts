import type { Meta, StoryObj } from '@storybook/web-components';
import { html, type TemplateResult } from 'lit';
import '../list-item/list-item';
import './list';
import type { ColumnDef, List, PaginationState, SortState } from './list';

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

const PAGE_SIZE = 10;

const toPagination = (page: number, pageCount: number): PaginationState => {
  return {
    offset: (page - 1) * PAGE_SIZE,
    limit: PAGE_SIZE,
    total: pageCount * PAGE_SIZE,
  };
};

const buildRows = (rows: StoryItem[]): TemplateResult[] => {
  return rows.map(
    (item) => html`
      <ui-list-item row-id="${item.id}">
        <a slot="title" href="${item.href ?? '#'}">${item.title}</a>
        <time slot="date" datetime="${item.date}">${item.date}</time>
        <span slot="tags">${item.tags}</span>
        <span slot="mobile-supplement">・ ${item.date}</span>
        <button slot="actions" type="button" aria-label="操作">操作</button>
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
  parameters: {
    docs: {
      description: {
        component: `
list の **表示見本** です。

この story ファイルは **docs / smoke / 手動確認** に限定します。  
row / column keyboard navigation / preview-request / context-request / pagination event / mobile projection の合否は
Storybook では判定しません。

browser contract は別途 \
\`test/browser/list.browser.test.ts\` と \
\`test/browser/list-item.browser.test.ts\` 側へ移してください。
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<List>;

export const Default: Story = {
  tags: ['smoke'],
  parameters: {
    docs: {
      description: {
        story: '標準リストの代表表示用 smoke story です。密度と列構成だけを残します。',
      },
    },
  },
  render: () => renderList({ currentRowId: 'n-1', currentColumnId: 'title' }),
};

export const SortAndPaginationSurface: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story:
          'sort 表示と pagination surface の見え方を手で確認するための manual-only story です。並び替え・ページングの合否は `test/browser/list.browser.test.ts` と `test/browser/pagination.browser.test.ts` を正本とします。',
      },
    },
  },
  render: () =>
    renderList({
      currentRowId: 'n-2',
      currentColumnId: 'title',
      sort: { key: 'date', direction: 'desc' },
      pagination: toPagination(2, 8),
    }),
};

export const MobileColumnsAndSupplement: Story = {
  parameters: {
    docs: {
      description: {
        story: 'hideOnMobile 列と mobile-supplement の見え方を観察する docs story です。',
      },
    },
  },
  render: () =>
    renderList({
      currentRowId: 'n-3',
      currentColumnId: 'title',
      showActions: true,
    }),
};

export const LoadingAndBoundarySurface: Story = {
  parameters: {
    docs: {
      description: {
        story: 'loading と単一行境界の見え方だけを残した docs story です。',
      },
    },
  },
  render: () => html`
    <div style="display: grid; gap: 1rem;">
      ${renderList({ loading: true, loadingLabel: '読み込み中…' })}
      ${renderList({
        items: items.slice(0, 1),
        currentRowId: 'n-1',
        currentColumnId: 'title',
      })}
    </div>
  `,
};

export const ManualKeyboardReview: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story: `
手動確認用 story です。

確認内容:
- 行・列のフォーカス密度
- sort indicator の見え方
- pagination surface の配置

keyboard navigation / request event / autoRevealCurrent の合否は browser test 側へ移してください。
        `,
      },
    },
  },
  render: () =>
    renderList({
      currentRowId: 'n-4',
      currentColumnId: 'title',
      sort: { key: 'date', direction: 'asc' },
      pagination: toPagination(3, 10),
      autoRevealCurrent: true,
    }),
};