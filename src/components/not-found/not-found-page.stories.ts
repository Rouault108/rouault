import { html } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { buildNotFoundPageMarkup } from './not-found-page.js';

interface StoryArgs {
  requestedPath: string;
}

const renderNotFoundPage = (args: StoryArgs) => html`
  <div style="min-height: 100vh; background: var(--bg-default); color: var(--fg-default);">
    ${unsafeHTML(
      buildNotFoundPageMarkup({
        requestedPath: args.requestedPath,
      }),
    )}
  </div>
`;

const meta = {
  title: 'Components/NotFoundPage',
  component: 'not-found-page',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
not-found-page は Lit custom element ではなく、**静的マークアップ生成関数**
\`buildNotFoundPageMarkup()\` を正本とする 404 fallback です。

基本構造と requestedPath 表示は \`test/ssr/not-found-page.test.ts\`、  
SSR 経由での描画は \`test/ssr/server-entry.test.ts\`、  
CSS 構造契約は \`test/ssr/css-structure-contracts.test.ts\` を正本とします。

この story ファイルは **docs / smoke / 手動確認** に限定します。
        `,
      },
    },
  },
  args: {
    requestedPath: '',
  },
  render: (args: StoryArgs) => renderNotFoundPage(args),
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

export const Default: Story = {
  tags: ['smoke'],
};

export const RequestedPathExample: Story = {
  args: {
    requestedPath: '/notes/missing-entry?tab=outline#section-2',
  },
  parameters: {
    docs: {
      description: {
        story: '要求されたパスがある場合の 404 fallback 表示例です。',
      },
    },
  },
};

export const AccessibilityMediaManual: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story: `
手動確認用 story です。

確認内容:
- 404 fallback の全体レイアウト
- action link の視認性
- mobile 相当でのリンク並び
- forced-colors / reduced-motion を含む見え方

CSS 構造契約の合否は \`test/ssr/css-structure-contracts.test.ts\` を正本とします。
        `,
      },
    },
  },
};