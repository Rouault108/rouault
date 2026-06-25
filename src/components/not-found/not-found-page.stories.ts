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
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
not-found-page は Lit custom element ではなく、**静的マークアップ生成関数**
\`buildNotFoundPageMarkup()\` を正本とする 404 fallback です。

この story は custom element story ではなく、static markup renderer の docs / smoke / 手動確認用です。

正本テスト:
- \`test/ssr/not-found-page.test.ts\`
- \`test/ssr/css-structure-contracts.test.ts\`
- \`test/node/error-handler.test.ts\`
- \`test/node/error-envelope-factory.test.ts\`

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
        story: '要求されたパスがある場合の404 fallback表示例です。',
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
- 404 fallbackの全体レイアウト
- action linkの視認性
- mobile相当でのリンク並び
- forced-colors / reduced-motion を含む見え方

CSS 構造契約の合否は \`test/ssr/css-structure-contracts.test.ts\` を正本とします。
        `,
      },
    },
  },
};
