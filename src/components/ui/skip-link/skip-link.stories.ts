import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './skip-link';
import type { SkipLink } from './skip-link';

/**
 * ## スキップリンク (Skip Link)
 * 
 * キーボードユーザーやスクリーンリーダー利用者が、反復的なナビゲーション（ヘッダーやサイドバー）を
 * 飛び越え、メインコンテンツへ即座に到達するための特急レーンです。
 * 
 * ### デザイン哲学
 * 
 * - **役割**: アクセシビリティの最優先事項として、ページの最初のインタラクティブ要素として配置されます。
 * - **Distinct Utility**: フォーカス時、コンテキストに埋没することなく、独立した「システム通知」として中央上部に出現します。
 * - **Instant Presence**: 思考の即応性を最優先するため、余韻（Fade）を排除し、フォーカスと同時に物理的に即時表示します。
 * 
 * ### 実装要件
 * 
 * - ページの `<body>` 直下に配置される最初のインタラクティブ要素として実装します。
 * - ターゲット要素（`<main id="main-content">` など）には `tabindex="-1"` を付与し、プログラム的なフォーカス移動を保証します。
 * 
 * ### キーボードナビゲーション
 * 
 * - **Tab**: ページ読み込み後、最初の Tab キー押下でこのリンクにフォーカスが当たります。
 * - **Enter / Space**: ターゲット要素（`#main-content`）へジャンプし、フォーカスを移動します。
 * - **Esc**: ブラウザのデフォルト挙動に委ねます（通常は何も起きない、またはフォーカスを外す）。
 * 
 * ### アクセシビリティ
 * 
 * - **First Tab Stop**: ページ読み込み後、最初の Tab キー押下で必ずこのリンクにフォーカスが当たる構造を維持します。
 * - **Screen Reader Support**: デフォルト状態で `clip-path: inset(50%)` を使用することで、視覚的に非表示でも確実にA11yツリーに残し、スクリーンリーダーが認識可能な状態を保証します。
 * - **Target Element Focus**: スキップ後、ターゲット要素（`#main-content`）にフォーカスが移動します。
 */
const meta: Meta<SkipLink> = {
  title: 'Components/Skip Link',
  component: 'ui-skip-link',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
スキップリンクは、キーボードユーザーやスクリーンリーダー利用者がメインコンテンツへ即座に到達するためのコンポーネントです。

## 使用方法

\`\`\`html
<!-- デフォルト -->
<ui-skip-link></ui-skip-link>

<!-- カスタムターゲット -->
<ui-skip-link target="#content" label="コンテンツへ移動"></ui-skip-link>
\`\`\`

## 注意事項

- ページの \`<body>\` 直下に配置される最初のインタラクティブ要素として実装してください。
- ターゲット要素（\`<main id="main-content">\` など）には \`tabindex="-1"\` を付与してください。
        `,
      },
    },
    a11y: {
      config: {
        rules: [
          {
            // スキップリンクは視覚的に非表示のため、color-contrast ルールを無効化
            id: 'color-contrast',
            enabled: false,
          },
        ],
      },
    },
  },
  argTypes: {
    href: {
      control: 'text',
      description: 'スキップ先のIDセレクタ',
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

/**
 * デフォルトのスキップリンク。
 * 
 * **操作方法**: Tab キーを押してスキップリンクにフォーカスを当ててください。
 * 中央上部に即座に表示されます。
 */
export const Default: Story = {
  args: {
    href: '#main-content',
    label: 'メインコンテンツへスキップ',
  },
  render: (args) => html`
    <style>
      /* デモ用のスタイル */
      .demo-container {
        min-height: 400px;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .demo-header {
        background: var(--bg-surface-2, #f5f5f5);
        padding: 1rem;
        border-radius: var(--radius-md, 6px);
      }

      .demo-nav {
        background: var(--bg-surface-2, #f5f5f5);
        padding: 1rem;
        border-radius: var(--radius-md, 6px);
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
        border-radius: var(--radius-md, 6px);
        flex: 1;
      }
    </style>

    <div class="demo-container">
      <!-- Skip Link: 最初のインタラクティブ要素 -->
      <ui-skip-link href="${args.href}" label="${args.label}"></ui-skip-link>

      <!-- Header -->
      <div class="demo-header">
        <h1>サイトヘッダー</h1>
      </div>

      <!-- Navigation -->
      <nav class="demo-nav">
        <h2>ナビゲーション</h2>
        <a href="#link1">リンク 1</a>
        <a href="#link2">リンク 2</a>
        <a href="#link3">リンク 3</a>
        <a href="#link4">リンク 4</a>
        <a href="#link5">リンク 5</a>
      </nav>

      <!-- Main Content: ターゲット要素 -->
      <main id="main-content" tabindex="-1" class="demo-main">
        <h2>メインコンテンツ</h2>
        <p>ここがメインコンテンツです。スキップリンクを使用すると、ナビゲーションをスキップしてここに直接ジャンプできます。</p>
        <p>Tab キーを押してスキップリンクにフォーカスを当て、Enter キーを押すとこのコンテンツにフォーカスが移動します。</p>
      </main>
    </div>
  `,
  play: async ({ canvasElement }) => {
    // テスト: コンポーネントが正しくレンダリングされていること
    const skipLink = canvasElement.querySelector('ui-skip-link');
    if (!skipLink) {
      throw new Error('Skip link component not found');
    }

    // テスト: Shadow DOM内のアンカー要素が存在すること
    const anchor = skipLink.shadowRoot?.querySelector('a');
    if (!anchor) {
      throw new Error('Anchor element not found in shadow root');
    }

    // テスト: 正しいhref属性が設定されていること
    if (anchor.getAttribute('href') !== '#main-content') {
      throw new Error(`Expected href to be '#main-content', got '${anchor.getAttribute('href')}'`);
    }

    // テスト: 正しいaria-label属性が設定されていること
    if (anchor.getAttribute('aria-label') !== 'メインコンテンツへスキップ') {
      throw new Error(`Expected aria-label to be 'メインコンテンツへスキップ', got '${anchor.getAttribute('aria-label')}'`);
    }

    // テスト: ターゲット要素が存在し、tabindex="-1"が設定されていること
    const mainContent = canvasElement.querySelector('#main-content');
    if (!mainContent) {
      throw new Error('Main content target element not found');
    }
    if (mainContent.getAttribute('tabindex') !== '-1') {
      throw new Error(`Expected main content tabindex to be '-1', got '${mainContent.getAttribute('tabindex')}'`);
    }

    console.log('✅ All tests passed for Default story');
  },
};

/**
 * カスタムターゲットとラベルを持つスキップリンク。
 * 
 * 異なるIDセレクタとラベルテキストを指定できます。
 */
export const CustomTarget: Story = {
  args: {
    href: '#custom-content',
    label: 'カスタムコンテンツへスキップ',
  },
  render: (args) => html`
    <style>
      .demo-container {
        min-height: 400px;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .demo-sidebar {
        background: var(--bg-surface-2, #f5f5f5);
        padding: 1rem;
        border-radius: var(--radius-md, 6px);
      }

      .demo-content {
        background: var(--bg-default, #fff);
        padding: 2rem;
        border: 1px solid var(--border-default, #e0e0e0);
        border-radius: var(--radius-md, 6px);
        flex: 1;
      }
    </style>

    <div class="demo-container">
      <!-- Skip Link with custom target -->
      <ui-skip-link href="${args.href}" label="${args.label}"></ui-skip-link>

      <!-- Sidebar -->
      <aside class="demo-sidebar">
        <h2>サイドバー</h2>
        <p>サイドバーのコンテンツ</p>
      </aside>

      <!-- Custom Content: カスタムターゲット -->
      <div id="custom-content" tabindex="-1" class="demo-content">
        <h2>カスタムコンテンツ</h2>
        <p>カスタムIDを持つコンテンツ領域です。</p>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    // テスト: カスタムターゲットが正しく設定されていること
    const skipLink = canvasElement.querySelector('ui-skip-link');
    if (!skipLink) {
      throw new Error('Skip link component not found');
    }

    const anchor = skipLink.shadowRoot?.querySelector('a');
    if (!anchor) {
      throw new Error('Anchor element not found in shadow root');
    }

    // テスト: カスタムhref属性が正しく設定されていること
    if (anchor.getAttribute('href') !== '#custom-content') {
      throw new Error(`Expected href to be '#custom-content', got '${anchor.getAttribute('href')}'`);
    }

    // テスト: カスタムラベルが正しく設定されていること
    if (anchor.getAttribute('aria-label') !== 'カスタムコンテンツへスキップ') {
      throw new Error(`Expected aria-label to be 'カスタムコンテンツへスキップ', got '${anchor.getAttribute('aria-label')}'`);
    }

    // テスト: カスタムターゲット要素が存在すること
    const customContent = canvasElement.querySelector('#custom-content');
    if (!customContent) {
      throw new Error('Custom content target element not found');
    }

    console.log('✅ All tests passed for CustomTarget story');
  },
};

/**
 * フォーカス状態のデモ。
 * 
 * スキップリンクが自動的にフォーカスされた状態で表示されます。
 * これにより、フォーカス時のスタイルを確認できます。
 */
export const Focused: Story = {
  args: {
    href: '#main-content',
    label: 'メインコンテンツへスキップ',
  },
  render: (args) => html`
    <style>
      .demo-container {
        min-height: 200px;
        padding: 2rem;
      }

      .demo-info {
        margin-top: 4rem;
        padding: 1rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
      }
    </style>

    <div class="demo-container">
      <!-- フォーカス済みのSkip Link -->
      <ui-skip-link
        href="${args.href}"
        label="${args.label}"
        id="focused-skip-link"
      ></ui-skip-link>

      <div class="demo-info">
        <p><strong>注意</strong>: このストーリーでは、スキップリンクが自動的にフォーカスされています。</p>
        <p>中央上部に表示されているスキップリンクを確認できます。</p>
      </div>

      <!-- Main Content -->
      <main id="main-content" tabindex="-1">
        <h2>メインコンテンツ</h2>
        <p>コンテンツ領域</p>
      </main>
    </div>
  `,
  play: async ({ canvasElement }) => {
    // テスト: コンポーネントのスタイル検証
    const skipLink = canvasElement.querySelector('#focused-skip-link') as SkipLink;
    if (!skipLink) {
      throw new Error('Focused skip link component not found');
    }

    // コンポーネントのupdateCompleteを待つ
    await skipLink.updateComplete;

    const anchor = skipLink.shadowRoot?.querySelector('a');
    if (!anchor) {
      throw new Error('Anchor element not found in shadow root');
    }

    // フォーカスを当てる
    anchor.focus();
    // 次のフレームを待つ（スタイル適用のため）
    await new Promise(resolve => setTimeout(resolve, 0));

    const computedStyle = window.getComputedStyle(anchor);

    // テスト: position が fixed であること
    if (computedStyle.position !== 'fixed') {
      throw new Error(`Expected position to be 'fixed', got '${computedStyle.position}'`);
    }

    // テスト: フォーカス状態の検証 - opacity が 1 であること
    if (computedStyle.opacity !== '1') {
      throw new Error(`Focus: Expected opacity to be '1', got '${computedStyle.opacity}'`);
    }

    // テスト: フォーカス状態の検証 - clip-path が none であること
    if (computedStyle.clipPath !== 'none') {
      throw new Error(`Focus: Expected clip-path to be 'none', got '${computedStyle.clipPath}'`);
    }

    // テスト: フォーカス状態の検証 - transform が中央配置であること
    // Note: transform の値はブラウザによって異なるため、'translateX(-50%)' または 'matrix' を含むことを確認
    const hasTransform = computedStyle.transform.includes('matrix') || computedStyle.transform === 'translateX(-50%)';
    if (!hasTransform && computedStyle.transform === 'none') {
      throw new Error(`Focus: Expected transform to include translation, got '${computedStyle.transform}'`);
    }

    console.log('✅ All tests passed for Focused story');
  },
};
