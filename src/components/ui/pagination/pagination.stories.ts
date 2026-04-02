import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './pagination';
import type { Pagination } from './pagination';

type PaginationMode = 'regular' | 'compact';

interface StoryArgs {
  current: number;
  total: number;
  mode: PaginationMode;
}

const defaultHref = (page: number): string => `?page=${String(page)}`;

function renderPagination(args: StoryArgs, id = 'pagination'): ReturnType<typeof html> {
  return html`
    <ui-pagination
      id="${id}"
      current="${args.current}"
      total="${args.total}"
      mode="${args.mode}"
      .getHref="${defaultHref}"
    ></ui-pagination>
  `;
}

const meta: Meta<Pagination> = {
  title: 'Components/Pagination',
  component: 'ui-pagination',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
pagination の **表示見本** です。

この story ファイルは **docs / smoke / 手動確認** に限定します。  
threshold / ellipsis / current page semantics / compact edge handling / href generation の合否は Storybook で判定しません。

browser contract は別途 \
\`test/browser/pagination.browser.test.ts\` 側へ移してください。
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<Pagination>;

export const Default: Story = {
  tags: ['smoke'],
  parameters: {
    docs: {
      description: {
        story: 'regular mode の代表表示用 smoke story です。',
      },
    },
  },
  render: () => renderPagination({ current: 4, total: 12, mode: 'regular' }),
};

export const RegularRepresentativeExamples: Story = {
  parameters: {
    docs: {
      description: {
        story: '開始付近 / 中間 / 終端付近の regular 表示を比較する docs story です。',
      },
    },
  },
  render: () => html`
    <div style="display: grid; gap: 16px;">
      ${renderPagination({ current: 1, total: 8, mode: 'regular' }, 'page-1')}
      ${renderPagination({ current: 4, total: 12, mode: 'regular' }, 'page-4')}
      ${renderPagination({ current: 11, total: 12, mode: 'regular' }, 'page-11')}
    </div>
  `,
};

export const CompactMode: Story = {
  parameters: {
    docs: {
      description: {
        story: 'compact mode の代表表示用 smoke story です。',
      },
    },
  },
  render: () => renderPagination({ current: 4, total: 12, mode: 'compact' }, 'compact-pagination'),
};

export const ManualLayoutReview: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story: `
手動確認用 story です。

確認内容:
- regular / compact のレイアウト差
- 長いページ列での ellipsis の視覚印象
- 前後ナビゲーションの配置

threshold / current semantics / href generation の合否は browser test 側へ移してください。
        `,
      },
    },
  },
  render: () => html`
    <div style="display: grid; gap: 16px;">
      ${renderPagination({ current: 7, total: 24, mode: 'regular' }, 'manual-regular')}
      ${renderPagination({ current: 7, total: 24, mode: 'compact' }, 'manual-compact')}
    </div>
  `,
};