import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './skip-link';
import type { SkipLink } from './skip-link';

const meta: Meta<SkipLink> = {
  title: 'Components/Skip Link',
  component: 'ui-skip-link',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
スキップリンクは、キーボードユーザーやスクリーンリーダー利用者が反復的なナビゲーションを飛び越え、
本文へ直接移動するためのコンポーネントです。

この story ファイルは **docs / 手動確認** に限定します。  
shadow DOM 内の anchor 反映、click による focus 移動、focus() 委譲などの browser contract は
\`test/browser/helpers/skip-link.browser.test.ts\` を正本として検査します。
        `,
      },
    },
  },
  argTypes: {
    href: {
      control: 'text',
      description: 'スキップ先の ID セレクタ',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: '#main-content' },
      },
    },
    label: {
      control: 'text',
      description: '表示ラベル',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'メインコンテンツへスキップ' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<SkipLink>;

const renderDemo = ({
  href,
  label,
  mainId,
  heading,
  body,
}: {
  href: string;
  label: string;
  mainId: string;
  heading: string;
  body: string;
}) => html`
  <style>
    .demo-container {
      min-height: 420px;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .demo-header,
    .demo-nav,
    .demo-main,
    .demo-note {
      border-radius: var(--radius-md, 6px);
    }

    .demo-header,
    .demo-nav,
    .demo-note {
      background: var(--bg-surface-2, #f5f5f5);
      padding: 1rem;
    }

    .demo-nav a {
      display: block;
      padding: 0.5rem;
      margin-bottom: 0.5rem;
      background: var(--bg-default, #fff);
      border-radius: var(--radius-sm, 4px);
      text-decoration: none;
      color: var(--fg-default, #000);
    }

    .demo-main {
      background: var(--bg-default, #fff);
      padding: 2rem;
      border: 1px solid var(--border-default, #e0e0e0);
      flex: 1;
    }

    .label-grid {
      display: grid;
      gap: 2rem;
    }

    .label-case {
      min-height: 120px;
    }
  </style>

  <div class="demo-container">
    <ui-skip-link href="${href}" label="${label}"></ui-skip-link>

    <div class="demo-header">
      <h1>サイトヘッダー</h1>
      <p>スキップリンクはページ先頭の最初の操作要素として置いてください。</p>
    </div>

    <nav class="demo-nav" aria-label="サンプルナビゲーション">
      <h2>ナビゲーション</h2>
      <a href="#link-1">リンク 1</a>
      <a href="#link-2">リンク 2</a>
      <a href="#link-3">リンク 3</a>
    </nav>

    <main id="${mainId}" tabindex="-1" class="demo-main">
      <h2>${heading}</h2>
      <p>${body}</p>
    </main>
  </div>
`;

export const Default: Story = {
  args: {
    href: '#main-content',
    label: 'メインコンテンツへスキップ',
  },
  render: (args) =>
    renderDemo({
      href: args.href,
      label: args.label,
      mainId: 'main-content',
      heading: 'メインコンテンツ',
      body: 'Tab でスキップリンクへ移動し、Enter で本文へジャンプする基本例です。',
    }),
};

export const CustomTarget: Story = {
  args: {
    href: '#content',
    label: '本文へ移動',
  },
  parameters: {
    docs: {
      description: {
        story: 'href と label を変えた利用例です。属性反映そのものの合否は browser test 側で判定します。',
      },
    },
  },
  render: (args) =>
    renderDemo({
      href: args.href,
      label: args.label,
      mainId: 'content',
      heading: '本文',
      body: 'スキップ先を #content に変更した例です。',
    }),
};

export const FocusAppearanceManual: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story: `
この story は **手動確認専用** です。

確認内容:
- 最初の Tab でスキップリンクへ到達できること
- focus 時に視覚的に表示されること
- Enter でターゲット要素へ移動すること

挙動の合否は \`test/browser/helpers/skip-link.browser.test.ts\` を正本とします。
        `,
      },
    },
  },
  render: () =>
    renderDemo({
      href: '#focus-target',
      label: 'メインコンテンツへスキップ',
      mainId: 'focus-target',
      heading: 'フォーカス確認用コンテンツ',
      body: 'この story では focus appearance を手で確認します。',
    }),
};

export const LabelBoundariesManual: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story: `
短いラベルと長いラベルを並べた手動確認用 story です。  
テキストの反映自体は browser test 側で検査し、ここでは視覚確認だけを行います。
        `,
      },
    },
  },
  render: () => html`
    <style>
      .demo-container {
        display: grid;
        gap: 2rem;
        min-height: 320px;
      }

      .label-case {
        min-height: 120px;
      }
    </style>

    <div class="demo-container">
      <section class="label-case">
        <ui-skip-link href="#short-label-content" label="移動"></ui-skip-link>
        <main id="short-label-content" tabindex="-1">
          <h2>短いラベル</h2>
          <p>短いラベルの見た目です。</p>
        </main>
      </section>

      <section class="label-case">
        <ui-skip-link
          href="#long-label-content"
          label="メインコンテンツ（記事本文と補足情報を含む領域）へスキップして、ナビゲーションを省略する"
        ></ui-skip-link>
        <main id="long-label-content" tabindex="-1">
          <h2>長いラベル</h2>
          <p>長いラベルの見た目です。</p>
        </main>
      </section>
    </div>
  `,
};

export const MissingTargetWarningManual: Story = {
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story: `
存在しないターゲットを指定したときの DX 確認用 story です。

期待される確認内容:
- コンポーネント自体は描画されること
- 開発中は console warning を確認できること

warning の有無は Storybook の合否条件にしません。
        `,
      },
    },
  },
  render: () => html`
    <style>
      .demo-container {
        min-height: 220px;
        padding: 2rem;
      }

      .demo-note {
        margin-top: 4rem;
        padding: 1rem;
        border-radius: var(--radius-md, 6px);
        background: var(--bg-surface-2, #f5f5f5);
        border-left: 4px solid var(--danger, #dc2626);
      }
    </style>

    <div class="demo-container">
      <ui-skip-link
        href="#non-existent-target"
        label="存在しないターゲットへスキップ"
      ></ui-skip-link>

      <div class="demo-note">
        <p><strong>手動確認用</strong></p>
        <p>この story では意図的にターゲットを配置していません。</p>
        <p>必要に応じてブラウザの console warning を確認してください。</p>
      </div>
    </div>
  `,
};