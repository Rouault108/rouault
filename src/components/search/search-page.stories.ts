import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './search-page.js';
import type { SearchPage } from './search-page.js';
import { installSearchPageStorySearchMock } from '../../testing/storybook/search-page-story-search-adapter.js';

const ensureSearchMock = (): void => {
  installSearchPageStorySearchMock();
};

const renderSearchPage = (
  id: string,
  options: {
    maxInlineSize?: string;
  } = {},
) => {
  ensureSearchMock();

  return html`
    <div
      style=${[
        'display: grid',
        'gap: var(--space-4, 16px)',
        options.maxInlineSize ? `max-inline-size: ${options.maxInlineSize}` : '',
      ]
        .filter((value) => value.length > 0)
        .join('; ')}
    >
      <search-page id=${id}></search-page>
    </div>
  `;
};

const meta: Meta<SearchPage> = {
  title: 'Search/SearchPage',
  component: 'search-page',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
検索ページの Storybook は **docs / smoke / 手動確認** に限定します。

query 入力、clear、filter panel、selected chip removal、tag reorder などの browser contract は
\`test/browser/search-page.browser.test.ts\` を正本とします。  
実ページ上の検索導線と遷移は \`test/e2e/tag-page.spec.ts\` などの E2E を正本とします。

この story では Storybook 用の検索 mock を使って、見た目と操作面の観察だけを行います。
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<SearchPage>;

export const Default: Story = {
  tags: ['smoke'],
  render: () => renderSearchPage('search-page-default'),
};

export const NarrowPanel: Story = {
  render: () => renderSearchPage('search-page-narrow', { maxInlineSize: '22.5rem' }),
  parameters: {
    docs: {
      description: {
        story: '狭い幅で filter panel と結果カードの見え方を観察するための docs story です。',
      },
    },
  },
};

export const FilterInteractionManual: Story = {
  tags: ['manual-only'],
  render: () => renderSearchPage('search-page-filter-manual', { maxInlineSize: '22.5rem' }),
  parameters: {
    docs: {
      description: {
        story: `
手動確認用 story です。

確認内容:
- filter panel の開閉
- ローカルタグ検索の視認性
- selected tag chip の見え方
- 狭幅での一覧スクロール感

URL 同期や件数更新の合否は \`test/browser/search-page.browser.test.ts\` を正本とします。
        `,
      },
    },
  },
};

export const ReorderObservationManual: Story = {
  tags: ['manual-only'],
  render: () => renderSearchPage('search-page-reorder-manual', { maxInlineSize: '22.5rem' }),
  parameters: {
    docs: {
      description: {
        story: `
selected tag が先頭へ寄る並び替えの観察用 story です。  
checked / data-selected の整合や並び替え回帰の合否は Storybook ではなく
\`test/browser/search-page.browser.test.ts\` を正本とします。
        `,
      },
    },
  },
};
