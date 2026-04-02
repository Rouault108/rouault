import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './article-header';
import type { ArticleHeader } from './article-header';

const meta: Meta<ArticleHeader> = {
  title: 'Components/Article Header',
  component: 'ui-article-header',
  tags: ['autodocs'],
  argTypes: {
    heading: {
      control: 'text',
      description: '記事タイトル',
    },
    published: {
      control: 'text',
      description: '公開日 (`YYYY-MM-DD`)',
    },
    created: {
      control: 'text',
      description: '作成日 (`YYYY-MM-DD`)',
    },
    updatedDate: {
      control: 'text',
      description:
        '更新日 (`YYYY-MM-DD`)。HTML属性は `updated`。LitElement の `updated()` との衝突回避のためプロパティ名は `updatedDate`',
    },
    tags: {
      control: 'object',
      description: 'タグ配列（property only）',
    },
    readingTime: {
      control: 'number',
      description: '読了時間（分）',
    },
    status: {
      control: 'select',
      options: ['', 'draft', 'archived', 'wip', 'deprecated'],
      description: 'ステータス',
    },
    source: {
      control: 'text',
      description: '出典URL',
    },
    license: {
      control: 'text',
      description: 'ライセンス名',
    },
  },
  parameters: {
    docs: {
      description: {
        component: `
記事タイトル・日付・タグ・ステータス・出典情報をまとめて提示するヘッダーです。

- tag-click event / property-only tags / normalization / strict date / source sanitization は Storybook の合否にせず、browser / SSR 側で検査します
- Storybook には representative state と manual review 用 story を残します
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<ArticleHeader>;

interface ArticleHeaderStoryArgs {
  heading?: string;
  published?: string;
  created?: string;
  updatedDate?: string;
  tags?: string[];
  readingTime?: number | null;
  status?: '' | 'draft' | 'archived' | 'wip' | 'deprecated';
  source?: string;
  license?: string;
};

const renderArticleHeader = (args: ArticleHeaderStoryArgs, id?: string) => {
  const tags = Array.isArray(args.tags) ? args.tags : [];
  const status = args.status ?? '';
  const readingTime = args.readingTime ?? null;

  return html`
    <ui-article-header
      ?data-has-id=${Boolean(id)}
      id=${id ?? ''}
      heading="${args.heading ?? ''}"
      updated="${args.updatedDate ?? ''}"
      published="${args.published ?? ''}"
      created="${args.created ?? ''}"
      status="${status}"
      source="${args.source ?? ''}"
      license="${args.license ?? ''}"
      .tags=${tags}
      .readingTime=${readingTime}
    ></ui-article-header>
  `;
};

export const CompleteState: Story = {
  args: {
    heading: 'バッハ《マタイ受難曲》の構造美',
    updatedDate: '2026-02-12',
    published: '2025-12-01',
    created: '2025-11-20',
    tags: ['音楽', 'バッハ', '宗教音楽'],
    readingTime: 8,
    status: 'wip',
    source: 'https://example.com/original',
    license: 'CC BY 4.0',
  },
  render: (args) => renderArticleHeader(args, 'complete-state'),
};

export const PublishedFallback: Story = {
  args: {
    heading: '公開日のみで表示するケース',
    published: '2026-01-10',
    created: '2026-01-02',
    updatedDate: '',
    tags: ['設計'],
    readingTime: null,
    status: '',
    source: '',
    license: '',
  },
  render: (args) => renderArticleHeader(args, 'published-fallback'),
  parameters: {
    docs: {
      description: {
        story: '公開日フォールバックの最終 DOM 契約は SSR 側で検査し、この story は表示見本として残しています。',
      },
    },
  },
};

export const StatusStateMatrix: Story = {
  render: () => html`
    <style>
      .matrix {
        display: grid;
        gap: 1rem;
      }
    </style>
    <div class="matrix">
      <ui-article-header heading="下書き記事" published="2026-01-01" status="draft"></ui-article-header>
      <ui-article-header heading="アーカイブ記事" published="2026-01-01" status="archived"></ui-article-header>
      <ui-article-header heading="作業中記事" published="2026-01-01" status="wip"></ui-article-header>
      <ui-article-header heading="非推奨記事" published="2026-01-01" status="deprecated"></ui-article-header>
    </div>
  `,
};

export const HeadingOnlyBoundary: Story = {
  render: () => html`
    <ui-article-header heading="見出しのみの最小構成"></ui-article-header>
  `,
  parameters: {
    docs: {
      description: {
        story: '最小構成の表示例です。metadata の有無は Storybook ではなく SSR 側の契約で判定します。',
      },
    },
  },
};

export const AccessibilityMediaContracts: Story = {
  tags: ['manual-only'],
  render: () => html`
    <ui-article-header heading="A11yメディア契約確認" published="2026-02-21" .tags=${['検証']}></ui-article-header>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'touch / reduced-motion / forced-colors の CSS 構造契約は test/ssr/css-structure-contracts.test.ts へ移送済みです。この story は手動確認専用です。',
      },
    },
  },
};

export const DarkModeTokenContract: Story = {
  tags: ['manual-only'],
  render: () => html`
    <ui-article-header heading="ダークモードトークン契約" published="2026-02-22" .tags=${['theme']}></ui-article-header>
  `,
  parameters: {
    docs: {
      description: {
        story:
          'semantic token 参照の CSS 構造契約は test/ssr/css-structure-contracts.test.ts で検査します。この story は手動確認専用です。',
      },
    },
  },
};
