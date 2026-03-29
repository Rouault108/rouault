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
 * - **Enter**: ターゲット要素（`#main-content`）へジャンプし、フォーカスを移動します。
 * - **Space**: ネイティブリンクでは挙動が保証されません。
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
<ui-skip-link href="#content" label="コンテンツへ移動"></ui-skip-link>
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
            // color-contrast は原則有効。HiddenByDefault ストーリーのみ個別に無効化する。
            id: 'color-contrast',
            enabled: true,
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

const focusByKeyboard = (element: HTMLElement): void => {
  // キーボード操作由来のフォーカスとして扱わせ、:focus-visible の表示を安定させる
  const doc = element.ownerDocument;
  doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
  element.focus();
};

/**
 * デフォルトのスキップリンク。
 *
 * **操作方法**: Tab キーを押してスキップリンクにフォーカスを当ててください。
 * 中央上部に即座に表示されます。
 */
export const Default: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
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
        <p>
          ここがメインコンテンツです。スキップリンクを使用すると、ナビゲーションをスキップしてここに直接ジャンプできます。
        </p>
        <p>
          Tab キーを押してスキップリンクにフォーカスを当て、Enter
          キーを押すとこのコンテンツにフォーカスが移動します。
        </p>
      </main>
    </div>
  `,
  play: ({ canvasElement }) => {
    // テスト: コンポーネントが正しくレンダリングされていること
    const skipLink = canvasElement.querySelector('ui-skip-link');
    if (!skipLink) {
      throw new Error('ui-skip-link が見つかりません');
    }

    // テスト: Shadow DOM内のアンカー要素が存在すること
    const anchor = skipLink.shadowRoot?.querySelector('a');
    if (!anchor) {
      throw new Error('Shadow Root 内にアンカー要素が見つかりません');
    }

    // テスト: 正しいhref属性が設定されていること
    const href = anchor.getAttribute('href');
    if (href !== '#main-content') {
      throw new Error(
        `href が "#main-content" であることを期待していましたが、実際には "${href ?? 'null'}" でした`,
      );
    }

    // テスト: 正しいテキストコンテンツが設定されていること
    // Note: アンカー要素はテキストコンテンツを持つため、aria-labelは冗長であり設定されない
    const anchorText = anchor.textContent.trim();
    if (anchorText !== 'メインコンテンツへスキップ') {
      throw new Error(
        `テキストコンテンツが "メインコンテンツへスキップ" であることを期待していましたが、実際には "${anchorText}" でした`,
      );
    }

    // テスト: ターゲット要素が存在し、tabindex="-1"が設定されていること
    const mainContent = canvasElement.querySelector('#main-content');
    if (!mainContent) {
      throw new Error('メインコンテンツのターゲット要素が見つかりません');
    }
    const tabindex = mainContent.getAttribute('tabindex');
    if (tabindex !== '-1') {
      throw new Error(
        `メインコンテンツの tabindex が "-1" であることを期待していましたが、実際には "${tabindex ?? 'null'}" でした`,
      );
    }
  },
};

/**
 * 初期状態（非表示）の検証。
 *
 * フォーカス前は視覚的に非表示であり、A11yツリーに残る実装であることを確認します。
 */
export const HiddenByDefault: Story = {
  parameters: {
    rouaultContractKind: 'interaction-contract',
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: false,
          },
        ],
      },
    },
  },
  args: {
    href: '#main-content',
    label: 'メインコンテンツへスキップ',
  },
  render: (args) => html`
    <div>
      <ui-skip-link href="${args.href}" label="${args.label}" id="hidden-skip-link"></ui-skip-link>
      <main id="main-content" tabindex="-1">
        <h2>メインコンテンツ</h2>
      </main>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const skipLink = canvasElement.querySelector<SkipLink>('#hidden-skip-link');
    if (!skipLink) {
      throw new Error('ui-skip-link が見つかりません');
    }

    await skipLink.updateComplete;

    const anchor = skipLink.shadowRoot?.querySelector('a');
    if (!anchor) {
      throw new Error('Shadow Root 内にアンカー要素が見つかりません');
    }

    const computedStyle = window.getComputedStyle(anchor);
    if (computedStyle.opacity !== '0') {
      throw new Error(
        `デフォルト状態: opacity が "0" であることを期待していましたが、実際には "${computedStyle.opacity}" でした`,
      );
    }
    if (computedStyle.clipPath === 'none') {
      throw new Error(
        'デフォルト状態: 要素を非表示にするための clip-path を期待していましたが、"none" でした',
      );
    }
  },
};

/**
 * カスタムターゲットとラベルを持つスキップリンク。
 *
 * 異なるIDセレクタとラベルテキストを指定できます。
 */
export const CustomTarget: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
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
  play: ({ canvasElement }) => {
    // テスト: カスタムターゲットが正しく設定されていること
    const skipLink = canvasElement.querySelector('ui-skip-link');
    if (!skipLink) {
      throw new Error('ui-skip-link が見つかりません');
    }

    const anchor = skipLink.shadowRoot?.querySelector('a');
    if (!anchor) {
      throw new Error('Shadow Root 内にアンカー要素が見つかりません');
    }

    // テスト: カスタムhref属性が正しく設定されていること
    const href = anchor.getAttribute('href');
    if (href !== '#custom-content') {
      throw new Error(
        `href が "#custom-content" であることを期待していましたが、実際には "${href ?? 'null'}" でした`,
      );
    }

    // テスト: カスタムラベルが正しく設定されていること
    // Note: アンカー要素はテキストコンテンツを持つため、aria-labelは冗長であり設定されない
    const anchorText = anchor.textContent.trim();
    if (anchorText !== 'カスタムコンテンツへスキップ') {
      throw new Error(
        `テキストコンテンツが "カスタムコンテンツへスキップ" であることを期待していましたが、実際には "${anchorText}" でした`,
      );
    }

    // テスト: カスタムターゲット要素が存在すること
    const customContent = canvasElement.querySelector('#custom-content');
    if (!customContent) {
      throw new Error('カスタムコンテンツのターゲット要素が見つかりません');
    }
  },
};

/**
 * フォーカス状態のデモ。
 *
 * スキップリンクが自動的にフォーカスされた状態で表示されます。
 * これにより、フォーカス時のスタイルを確認できます。
 */
export const Focused: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
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
      <ui-skip-link href="${args.href}" label="${args.label}" id="focused-skip-link"></ui-skip-link>

      <div class="demo-info">
        <p>
          <strong>注意</strong>:
          このストーリーでは、スキップリンクが自動的にフォーカスされています。
        </p>
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
    const skipLink = canvasElement.querySelector<SkipLink>('#focused-skip-link');
    if (!skipLink) {
      throw new Error('フォーカスされた ui-skip-link が見つかりません');
    }

    // コンポーネントのupdateCompleteを待つ
    await skipLink.updateComplete;

    const anchor = skipLink.shadowRoot?.querySelector('a');
    if (!anchor) {
      throw new Error('Shadow Root 内にアンカー要素が見つかりません');
    }

    // フォーカスを当てる（:focus-visible の検証）
    focusByKeyboard(anchor);
    // 次のフレームを待つ（スタイル適用のため）
    await new Promise((resolve) => setTimeout(resolve, 0));

    const computedStyle = window.getComputedStyle(anchor);

    // テスト: position が fixed であること
    if (computedStyle.position !== 'fixed') {
      throw new Error(
        `position が "fixed" であることを期待していましたが、実際には "${computedStyle.position}" でした`,
      );
    }

    // テスト: フォーカス状態の検証 - opacity が 1 であること
    if (computedStyle.opacity !== '1') {
      throw new Error(
        `フォーカス状態: opacity が "1" であることを期待していましたが、実際には "${computedStyle.opacity}" でした`,
      );
    }

    // テスト: フォーカス状態の検証 - clip-path が none であること
    if (computedStyle.clipPath !== 'none') {
      throw new Error(
        `フォーカス状態: clip-path が "none" であることを期待していましたが、実際には "${computedStyle.clipPath}" でした`,
      );
    }

    // テスト: フォーカス状態の検証 - transform が中央配置であること
    // Note: transform の値はブラウザによって異なるため、'translateX(-50%)' または 'matrix' を含むことを確認
    const hasTransform =
      computedStyle.transform.includes('matrix') ||
      computedStyle.transform === 'translateX(-50%)' ||
      computedStyle.transform === 'translate(-50%, 0px)';
    if (!hasTransform) {
      throw new Error(
        `フォーカス状態: transform が中央配置の変換を含むことを期待していましたが、実際には "${computedStyle.transform}" でした`,
      );
    }
  },
};

/**
 * スキップナビゲーションフロー。
 *
 * スキップリンクをアクティベートした後、ターゲット要素にフォーカスが移動することを確認します。
 * これはアクセシビリティの核心機能です。
 */
export const SkipNavigationFlow: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  args: {
    href: '#main-content',
    label: 'メインコンテンツへスキップ',
  },
  render: (args) => html`
    <style>
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

      .demo-main:focus {
        outline: 2px solid var(--primary, #0066cc);
        outline-offset: 2px;
      }
    </style>

    <div class="demo-container">
      <!-- Skip Link: 最初のインタラクティブ要素 -->
      <ui-skip-link href="${args.href}" label="${args.label}" id="flow-skip-link"></ui-skip-link>

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
        <p>スキップリンクをアクティベートすると、このコンテンツにフォーカスが移動します。</p>
        <p>このストーリーでは、Enter キーを押した後のフォーカス移動を自動的にテストします。</p>
      </main>
    </div>
  `,
  play: async ({ canvasElement }) => {
    // テスト: スキップリンクの存在確認
    const skipLink = canvasElement.querySelector<SkipLink>('#flow-skip-link');
    if (!skipLink) {
      throw new Error('ui-skip-link が見つかりません');
    }

    await skipLink.updateComplete;

    const anchor = skipLink.shadowRoot?.querySelector<HTMLAnchorElement>('a');
    if (!anchor) {
      throw new Error('Shadow Root 内にアンカー要素が見つかりません');
    }

    const mainContent = canvasElement.querySelector<HTMLElement>('#main-content');
    if (!mainContent) {
      throw new Error('メインコンテンツのターゲット要素が見つかりません');
    }

    // テスト: スキップリンクにフォーカスを当てる
    focusByKeyboard(anchor);
    await new Promise((resolve) => setTimeout(resolve, 100));

    // テスト: 現在のフォーカスがスキップリンクにあることを確認
    if (skipLink.shadowRoot?.activeElement !== anchor) {
      throw new Error('スキップリンクにフォーカスが当たっているはずです');
    }

    // テスト: Enter キーを押してスキップを実行
    // Note: Storybook環境ではブラウザのネイティブなリンク挙動が動作するため、
    // 実際のフォーカス移動はブラウザに委ねられます。
    // ここでは、ターゲット要素が正しく設定されていることを確認します。
    const targetId = anchor.getAttribute('href');
    if (targetId !== '#main-content') {
      throw new Error(
        `href が "#main-content" であることを期待していましたが、実際には "${targetId ?? 'null'}" でした`,
      );
    }

    // テスト: ターゲット要素にtabindex="-1"が設定されていることを確認
    if (mainContent.getAttribute('tabindex') !== '-1') {
      throw new Error(
        'プログラムによるフォーカスのため、ターゲット要素には tabindex="-1" が必要です',
      );
    }

    // テスト: ネイティブなリンクのクリックはStorybookのiframe環境でページナビゲーションを引き起こし
    // Vitestブラウザ接続が切断されるため、プログラム的なフォーカス移動でスキップ挙動をシミュレートする
    mainContent.focus();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const activeElement = mainContent.ownerDocument.activeElement;
    if (activeElement !== mainContent) {
      throw new Error('スキップ後、フォーカスが #main-content に移動することを期待していました');
    }
  },
};

/**
 * ダークモードでのスキップリンク。
 *
 * ダークモードでは、スキップリンクは「闇の中の発光体」として機能し、
 * box-shadowを持たないことを確認します（Depth Strategy準拠）。
 */
export const DarkMode: Story = {
  args: {
    href: '#main-content',
    label: 'メインコンテンツへスキップ',
  },
  parameters: {
    rouaultContractKind: 'boundary-contract',
    backgrounds: {
      default: 'dark',
    },
    docs: {
      description: {
        story: `
ダークモードでは、スキップリンクは \`box-shadow: none\` となり、背景色自体のコントラストで浮遊感を表現します。
これは \`index.md\` の「Dark Mode Depth Strategy」に基づく設計です。

**検証方法**: フォーカス時に影がないことを確認してください。
        `,
      },
    },
  },
  render: (args) => html`
    <style>
      /* ダークモードのトークン値を明示的にオーバーライド */
      /* Note: Storybook環境では prefers-color-scheme: dark がトリガーされないため、
         トークン値を直接上書きしてダークモードをシミュレートします。 */
      .dark-mode-demo {
        /* ダークモードのトークン値 (tokens.css L436, L405より) */
        --fg-default: oklch(90% 0.01 250);
        --bg-default: oklch(12% 0.02 250);
        --border-on-inverted: oklch(from var(--bg-default) l c h / 0.2);
        --shadow-lg: none; /* ダークモードでは影を削除 */

        min-height: 300px;
        padding: 2rem;
        background: var(--bg-default);
        color: var(--fg-default);
      }

      .demo-info {
        margin-top: 4rem;
        padding: 1rem;
        background: oklch(17% 0.02 250); /* --bg-surface-2 in dark mode */
        border-radius: var(--radius-md, 6px);
        border: 1px solid oklch(90% 0.01 250 / 0.12); /* --border-default in dark mode */
      }

      .demo-info code {
        background: oklch(22% 0.02 250);
      }

      .demo-note {
        margin-top: 1rem;
        padding: 0.75rem;
        background: oklch(22% 0.02 250);
        border-radius: var(--radius-sm, 4px);
        font-size: var(--text-sm, 13px);
        color: oklch(65% 0.01 250); /* --fg-muted in dark mode */
      }
    </style>

    <div class="dark-mode-demo">
      <!-- フォーカス済みのSkip Link -->
      <ui-skip-link
        href="${args.href}"
        label="${args.label}"
        id="dark-mode-skip-link"
      ></ui-skip-link>

      <div class="demo-info">
        <p>
          <strong>ダークモード</strong>:
          このストーリーでは、スキップリンクが自動的にフォーカスされています。
        </p>
        <p>
          スキップリンクは<strong>明るい背景</strong>（白系）に<strong>暗いテキスト</strong>（黒系）で表示され、<br />
          「闇の中の発光体」として浮遊感を表現しています。
        </p>
        <div class="demo-note">
          <strong>技術的な注記</strong>: ダークモードでは <code>box-shadow: none</code> となり、
          背景色自体のコントラストで浮遊感を表現します（Dark Mode Depth Strategy準拠）。
        </div>
      </div>

      <!-- Main Content -->
      <main id="main-content" tabindex="-1">
        <h2>メインコンテンツ</h2>
        <p>コンテンツ領域</p>
      </main>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const skipLink = canvasElement.querySelector<SkipLink>('#dark-mode-skip-link');
    if (!skipLink) {
      throw new Error('ui-skip-link が見つかりません');
    }

    await skipLink.updateComplete;

    const anchor = skipLink.shadowRoot?.querySelector('a');
    if (!anchor) {
      throw new Error('Shadow Root 内にアンカー要素が見つかりません');
    }

    // フォーカスを当てる（:focus-visible の検証）
    focusByKeyboard(anchor);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const computedStyle = window.getComputedStyle(anchor);

    // テスト: フォーカス状態の基本検証
    if (computedStyle.opacity !== '1') {
      throw new Error(
        `フォーカス状態: opacity が "1" であることを期待していましたが、実際には "${computedStyle.opacity}" でした`,
      );
    }

    if (computedStyle.clipPath !== 'none') {
      throw new Error(
        `フォーカス状態: clip-path が "none" であることを期待していましたが、実際には "${computedStyle.clipPath}" でした`,
      );
    }
  },
};

/**
 * 強制カラーモード（Windows高コントラストモード等）でのスキップリンク。
 *
 * forced-colors: active 環境下では、アウトラインが強制的に適用され、
 * システムカラーに準拠することを確認します。
 */
export const ForcedColorsMode: Story = {
  args: {
    href: '#main-content',
    label: 'メインコンテンツへスキップ',
  },
  parameters: {
    rouaultContractKind: 'boundary-contract',
    docs: {
      description: {
        story: `
\`forced-colors: active\` 環境下では、以下のスタイルが適用されます：
- \`outline: 3px solid CanvasText\`
- \`background: Canvas\`
- \`color: CanvasText\`
- \`border-color: CanvasText\`

**検証方法**: 
1. Windows の設定 > アクセシビリティ > ハイコントラスト を有効化
2. または、ブラウザの開発者ツールで \`forced-colors: active\` をエミュレート

これにより、カスタムカラーが失われても視認性が保証されます。
        `,
      },
    },
  },
  render: (args) => html`
    <style>
      /* 強制カラーモードのエミュレーション用スタイル */
      .forced-colors-demo {
        min-height: 300px;
        padding: 2rem;
        /* Note: 実際の forced-colors: active はOSレベルの設定が必要 */
      }

      .demo-info {
        margin-top: 4rem;
        padding: 1rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
      }

      /* 強制カラーモードのシミュレーション（視覚的な参考用） */
      @media (forced-colors: active) {
        .forced-colors-demo {
          background: Canvas;
          color: CanvasText;
        }
      }
    </style>

    <div class="forced-colors-demo">
      <!-- フォーカス済みのSkip Link -->
      <ui-skip-link
        href="${args.href}"
        label="${args.label}"
        id="forced-colors-skip-link"
      ></ui-skip-link>

      <div class="demo-info">
        <p>
          <strong>強制カラーモード</strong>:
          このストーリーでは、スキップリンクが自動的にフォーカスされています。
        </p>
        <p>
          Windows高コントラストモードまたはブラウザの開発者ツールで forced-colors
          をエミュレートして確認してください。
        </p>
        <ul>
          <li>アウトラインが 3px の太さで表示されること</li>
          <li>システムカラー（CanvasText, Canvas）が適用されること</li>
        </ul>
      </div>

      <!-- Main Content -->
      <main id="main-content" tabindex="-1">
        <h2>メインコンテンツ</h2>
        <p>コンテンツ領域</p>
      </main>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const skipLink = canvasElement.querySelector<SkipLink>('#forced-colors-skip-link');
    if (!skipLink) {
      throw new Error('ui-skip-link が見つかりません');
    }

    await skipLink.updateComplete;

    const anchor = skipLink.shadowRoot?.querySelector('a');
    if (!anchor) {
      throw new Error('Shadow Root 内にアンカー要素が見つかりません');
    }

    // フォーカスを当てる（:focus-visible の検証）
    focusByKeyboard(anchor);
    await new Promise((resolve) => setTimeout(resolve, 100));

    // テスト: 基本的なフォーカス状態の確認
    const computedStyle = window.getComputedStyle(anchor);

    if (computedStyle.opacity !== '1') {
      throw new Error(
        `フォーカス状態: opacity が "1" であることを期待していましたが、実際には "${computedStyle.opacity}" でした`,
      );
    }

    // Note: forced-colors: active はOSレベルの設定が必要なため、自動テストでは検証しない。
    // フォーカス時の基本スタイル（opacity, clip-path）のみを確認する。
    if (computedStyle.clipPath !== 'none') {
      throw new Error(
        `フォーカス状態: clip-path が "none" であることを期待していましたが、実際には "${computedStyle.clipPath}" でした`,
      );
    }
  },
};

/**
 * ラベル文言の境界ケース。
 *
 * 極端に短い/長い文言でも表示崩れやテキスト欠落が起きないことを確認します。
 */
export const LabelBoundaries: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <style>
      .demo-container {
        display: grid;
        gap: 3rem;
        min-height: 320px;
        padding: 1rem;
      }

      .demo-section {
        min-height: 120px;
      }
    </style>

    <div class="demo-container">
      <section class="demo-section">
        <ui-skip-link
          href="#short-label-content"
          label="移動"
          id="short-label-skip-link"
        ></ui-skip-link>
        <main id="short-label-content" tabindex="-1">
          <h2>短いラベル</h2>
        </main>
      </section>

      <section class="demo-section">
        <ui-skip-link
          href="#long-label-content"
          label="メインコンテンツ（記事本文と補足情報を含む領域）へスキップして、ナビゲーションを省略する"
          id="long-label-skip-link"
        ></ui-skip-link>
        <main id="long-label-content" tabindex="-1">
          <h2>長いラベル</h2>
        </main>
      </section>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const shortSkipLink = canvasElement.querySelector<SkipLink>('#short-label-skip-link');
    const longSkipLink = canvasElement.querySelector<SkipLink>('#long-label-skip-link');

    if (!shortSkipLink || !longSkipLink) {
      throw new Error('境界ケースのストーリーが正しくレンダリングされていません');
    }

    await Promise.all([shortSkipLink.updateComplete, longSkipLink.updateComplete]);

    const shortAnchor = shortSkipLink.shadowRoot?.querySelector('a');
    const longAnchor = longSkipLink.shadowRoot?.querySelector('a');
    if (!shortAnchor || !longAnchor) {
      throw new Error('Shadow Root 内にアンカー要素が見つかりません');
    }

    if (shortAnchor.textContent.trim() !== '移動') {
      throw new Error('短いラベルのテキストが正しくレンダリングされていません');
    }

    const expectedLongLabel =
      'メインコンテンツ（記事本文と補足情報を含む領域）へスキップして、ナビゲーションを省略する';
    if (longAnchor.textContent.trim() !== expectedLongLabel) {
      throw new Error('長いラベルのテキストが正しくレンダリングされていません');
    }

    focusByKeyboard(longAnchor);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const shortStyle = window.getComputedStyle(shortAnchor);
    if (shortStyle.whiteSpace !== 'nowrap') {
      throw new Error(
        `短いラベルの white-space が 'nowrap' であることを期待していましたが、実際には '${shortStyle.whiteSpace}' でした`,
      );
    }

    const longStyle = window.getComputedStyle(longAnchor);
    if (longStyle.textOverflow !== 'ellipsis') {
      throw new Error(
        `長いラベルの text-overflow が 'ellipsis' であることを期待していましたが、実際には '${longStyle.textOverflow}' でした`,
      );
    }
    if (longStyle.overflow !== 'hidden' && longStyle.overflowX !== 'hidden') {
      throw new Error('長いラベルの overflow が hidden であることを期待していました');
    }
    // Note: アンカーは position: fixed でビューポート幅に依存するため scrollWidth の検証は環境依存となる。
    // CSSプロパティ（text-overflow, overflow）が正しく設定されていることの確認で十分とする。
  },
};

/**
 * 存在しないターゲットへの警告。
 *
 * ターゲット要素が存在しない場合、開発者向けにコンソール警告が出力されることを確認します。
 * これは開発者体験（DX）の向上のための機能です。
 */
export const MissingTargetWarning: Story = {
  args: {
    href: '#non-existent-target',
    label: '存在しないターゲットへスキップ',
  },
  parameters: {
    rouaultContractKind: 'interaction-contract',
    docs: {
      description: {
        story: `
このストーリーでは、存在しないターゲット（\`#non-existent-target\`）を指定しています。

**期待される挙動**:
- コンポーネントのマウント時に、コンソールに警告メッセージが出力されます
- 警告メッセージ: \`[ui-skip-link]: Target element with selector '#non-existent-target' not found in the document.\`

**目的**: 開発者が設定ミスに早期に気付けるようにするためのDX改善機能です。
        `,
      },
    },
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
        border-left: 4px solid var(--danger, #dc2626);
      }
    </style>

    <div class="demo-container">
      <!-- 存在しないターゲットを指定したSkip Link -->
      <ui-skip-link
        href="${args.href}"
        label="${args.label}"
        id="missing-target-skip-link"
      ></ui-skip-link>

      <div class="demo-info">
        <p><strong>⚠️ 開発者向け警告テスト</strong></p>
        <p>
          このストーリーでは、存在しないターゲット（<code>#non-existent-target</code>）を指定しています。
        </p>
        <p>
          <strong
            >ブラウザのコンソールを開いて、警告メッセージが出力されていることを確認してください。</strong
          >
        </p>
        <p>期待されるメッセージ:</p>
        <pre><code>[ui-skip-link]: Target element with selector '#non-existent-target' not found in the document.</code></pre>
      </div>

      <!-- 注意: ターゲット要素は意図的に配置していません -->
    </div>
  `,
  play: async ({ canvasElement }) => {
    const skipLink = canvasElement.querySelector<SkipLink>('#missing-target-skip-link');
    if (!skipLink) {
      throw new Error('ui-skip-link が見つかりません');
    }

    await skipLink.updateComplete;

    // テスト: コンポーネントが正しくレンダリングされていること
    const anchor = skipLink.shadowRoot?.querySelector('a');
    if (!anchor) {
      throw new Error('Shadow Root 内にアンカー要素が見つかりません');
    }

    // テスト: href属性が正しく設定されていること
    const href = anchor.getAttribute('href');
    if (href !== '#non-existent-target') {
      throw new Error(
        `href が "#non-existent-target" であることを期待していましたが、実際には "${href ?? 'null'}" でした`,
      );
    }

    // テスト: ターゲット要素が存在しないことを確認
    const target = canvasElement.querySelector('#non-existent-target');
    if (target) {
      throw new Error('このストーリーではターゲット要素が存在してはいけません');
    }
  },
};
