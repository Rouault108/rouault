import type { Meta, StoryObj } from '@storybook/web-components';
import { html, type TemplateResult } from 'lit';
import '../list/list';
import './list-item';
import type { ListItem } from './list-item';

const columns = [
  { id: 'title', label: 'タイトル', width: '1fr', lead: true },
  { id: 'date', label: '日付', width: '120px', hideOnMobile: true },
  { id: 'tags', label: 'タグ', width: '140px', hideOnMobile: true },
];

const item = {
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
        <button slot="actions" type="button" aria-label="操作">操作</button>
      </ui-list-item>
    </ui-list>
  `;
};

const meta: Meta<ListItem> = {
  title: 'Components/ListItem',
  component: 'ui-list-item',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
list-item の **表示見本** です。

この story ファイルは **docs / smoke / 手動確認** に限定します。  
current projection / Arrow key / boundary stop / unknown slot handling / mobile supplement の合否は
Storybook では判定しません。

browser contract は別途 \
\`test/browser/list-item.browser.test.ts\` 側へ移してください。
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<ListItem>;

export const DefaultInList: Story = {
  tags: ['smoke'],
  parameters: {
    docs: {
      description: {
        story: '標準 row surface の代表表示用 smoke story です。',
      },
    },
  },
  render: () => renderInList({ currentRowId: item.id, currentColumnId: 'title' }),
};

export const CurrentColumnProjection: Story = {
  parameters: {
    docs: {
      description: {
        story: 'current row / current column の見え方を観察する docs story です。',
      },
    },
  },
  render: () => renderInList({ currentRowId: item.id, currentColumnId: 'date' }),
};

export const MobileSupplement: Story = {
  parameters: {
    docs: {
      description: {
        story: 'mobile supplement と actions slot の共存を確認する docs story です。',
      },
    },
  },
  render: () =>
    renderInList({ currentRowId: item.id, currentColumnId: 'title', showActions: true }),
};

export const StandaloneFallback: Story = {
  parameters: {
    docs: {
      description: {
        story: '親 list なしの fallback surface を見るための smoke story です。',
      },
    },
  },
  render: () => html`
    <ui-list-item row-id="standalone-row">
      <a slot="title" href="/notes/standalone">Standalone fallback</a>
      <time slot="date" datetime="2026-02-01">2026-02-01</time>
      <span slot="tags">fallback</span>
    </ui-list-item>
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
- current row / current column の視覚差
- actions slot を含むときの密度
- standalone fallback surface

Arrow key / current change / unknown slot warning の合否は browser test 側へ移してください。
        `,
      },
    },
  },
  render: () => renderInList({ currentRowId: item.id, currentColumnId: 'tags', showActions: true }),
};
