import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { userEvent } from 'storybook/test';
import './copy-button';
import type { CopyButton } from './copy-button';

/**
 * ## コピーボタン (Copy Button)
 * 
 * 「コピー」というアクションとその結果（成功・失敗）を自己完結して提供する機能特化型コンポーネントです。
 * 
 * ### デザイン哲学
 * 
 * - **役割**: クリップボード操作を完全に自己完結的に処理
 * - **No Noise**: 通常時は ghost ボタンとして振る舞い、視覚的な主張を抑制
 * - **No Tooltip**: "Copy" アイコンの普遍性を信頼し、ツールチップは不要
 * - **Digital Tactility**: 成功時のアイコン切り替えと微細な発光で、確実な手応えを提供
 * - **Robustness**: 失敗時には明確なエラーフィードバック
 * 
 * ### 技術的特徴
 * 
 * - **State Machine**: Idle → Success (2000ms) / Error (3000ms) → Idle
 * - **Layout Stability**: アイコン切り替え時のガタつき防止
 * - **Focus Stability**: フォーカスリングが親ボタンに保持される
 * - **Self-Contained Feedback**: role="status" による支援技術への通知
 * - **Flash Effect**: 成功/失敗時の背景フラッシュ
 * - **Hit Area**: 視覚サイズ 24px / ヒット領域 44px
 * 
 * ### 使用上の注意
 * 
 * - **label は必須**: aria-label のベースとなるため、必ず設定してください
 * - **value**: クリップボードに書き込むテキストを設定してください
 * - **サイズ**: デフォルトは sm (24px) です
 */
const meta: Meta<CopyButton> = {
  title: 'Components/Copy Button',
  component: 'ui-copy-button',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
コピーボタンコンポーネントは、クリップボード操作を自己完結的に処理します。

## 使用方法

\`\`\`html
<!-- 基本的な使用 -->
<ui-copy-button
  value="コピーするテキスト"
  label="コードをコピー"
></ui-copy-button>

<!-- カスタムラベル -->
<ui-copy-button
  value="https://example.com"
  label="URLをコピー"
></ui-copy-button>
\`\`\`

## デザイン原則

- **No Tooltip**: アイコンの普遍性を信頼し、ホバー時のツールチップは表示しません
- **Flash Feedback**: 成功時は緑、失敗時は赤の背景フラッシュで状態を伝達
- **Icon Swap**: Copy → Check (成功) / AlertTriangle (失敗)
- **Timer Rationale**:
  - Success (2000ms): 成功は予期された結果であり、短い確認で十分
  - Error (3000ms): 失敗は予期せぬ結果のため、代替手段を検討する時間を確保

## アクセシビリティ

- **Self-Contained**: 外部のトースト通知に依存せず、内部で完結
- **Screen Reader**: role="status" による非視覚的フィードバック
- **Dynamic Label**: 状態に応じて aria-label が自動更新
- **Motion Reduction**: prefers-reduced-motion 環境では即時完了
- **Forced Colors**: ハイコントラストモードに対応
        `,
      },
    },
  },
  argTypes: {
    value: {
      control: 'text',
      description: 'クリップボードに書き込むテキスト',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: '' },
      },
    },
    label: {
      control: 'text',
      description: 'aria-label のベースとなるテキスト（必須）',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: '' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<CopyButton>;

/**
 * デフォルトのコピーボタン。
 * 
 * コードブロック内などで使用する標準的なコピーボタンです。
 */
export const Default: Story = {
  args: {
    value: 'コピーされるテキスト',
    label: 'コードをコピー',
  },
  render: (args) => html`
    <ui-copy-button
      value="${args.value}"
      label="${args.label}"
    ></ui-copy-button>
  `,
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector('ui-copy-button');
    if (!button) {
      throw new Error('Copy button component not found');
    }

    await button.updateComplete;

    // テスト: label 属性が設定されていること
    if (!button.label) {
      throw new Error('label attribute is required');
    }

    // テスト: value 属性が設定されていること
    if (!button.value) {
      throw new Error('value attribute is required');
    }

    console.log('✅ All tests passed for Default story');
  },
};

/**
 * コードブロック内での使用例。
 * 
 * 実際のコードブロックと組み合わせた使用例です。
 */
export const WithCodeBlock: Story = {
  render: () => html`
    <style>
      .code-block-demo {
        position: relative;
        background: var(--bg-surface-2, #f5f5f5);
        border: 1px solid var(--border-default, #e0e0e0);
        border-radius: var(--radius-md, 6px);
        padding: 1rem;
        font-family: 'Monaco', 'Courier New', monospace;
        font-size: 13px;
        max-width: 500px;
      }

      .code-block-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
      }

      .code-block-lang {
        font-size: 12px;
        color: var(--fg-muted, #666);
        font-weight: var(--font-medium, 500);
      }

      .code-block-content {
        margin: 0;
        overflow-x: auto;
      }

      code {
        color: var(--fg-default, #333);
      }
    </style>

    <div class="code-block-demo">
      <div class="code-block-header">
        <span class="code-block-lang">TypeScript</span>
        <ui-copy-button
          value="const greeting = 'Hello, World!';
console.log(greeting);"
          label="コードをコピー"
        ></ui-copy-button>
      </div>
      <pre class="code-block-content"><code>const greeting = 'Hello, World!';
console.log(greeting);</code></pre>
    </div>
  `,
};

/**
 * URL コピーの例。
 * 
 * URL を共有するためのコピーボタンの使用例です。
 */
export const URLCopy: Story = {
  args: {
    value: 'https://example.com/article/design-system',
    label: 'URLをコピー',
  },
  render: (args) => html`
    <style>
      .url-copy-demo {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
        max-width: 400px;
      }

      .url-text {
        flex: 1;
        font-size: 13px;
        color: var(--fg-muted, #666);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    </style>

    <div class="url-copy-demo">
      <span class="url-text">${args.value}</span>
      <ui-copy-button
        value="${args.value}"
        label="${args.label}"
      ></ui-copy-button>
    </div>
  `,
};

/**
 * 成功状態のシミュレーション。
 * 
 * コピー成功時の視覚的フィードバックを確認できます。
 * アイコンが Check に変わり、緑色の背景フラッシュが表示されます。
 */
export const SuccessState: Story = {
  args: {
    value: 'コピー成功のテスト',
    label: 'コピー',
  },
  render: (args) => html`
    <style>
      .success-demo {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .success-info {
        padding: 1rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
        font-size: 13px;
      }
    </style>

    <div class="success-demo">
      <div class="success-info">
        <strong>操作</strong>: ボタンをクリックしてコピー成功時の視覚的フィードバックを確認してください。
        <br><br>
        <strong>期待される動作</strong>:
        <ul style="margin: 0.5rem 0 0 1rem; padding: 0;">
          <li>アイコンが Check (✓) に変わる</li>
          <li>アイコンの色が緑 (--success) になる</li>
          <li>背景が緑色にフラッシュする</li>
          <li>2秒後に元の状態に戻る</li>
        </ul>
      </div>

      <ui-copy-button
        value="${args.value}"
        label="${args.label}"
      ></ui-copy-button>
    </div>
  `,
};

/**
 * エラー状態のシミュレーション（手動）。
 * 
 * Clipboard API が利用できない環境や権限が拒否された場合のエラーフィードバックを確認できます。
 * 
 * **注意**: この Story は自動的にエラー状態をシミュレートできません。
 * エラー状態を確認するには、ブラウザの開発者ツールでクリップボード API をブロックしてください。
 */
export const ErrorState: Story = {
  args: {
    value: 'エラーテスト',
    label: 'コピー',
  },
  render: (args) => html`
    <style>
      .error-demo {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .error-info {
        padding: 1rem;
        background: var(--bg-danger-subtle, #fee);
        border: 1px solid var(--border-danger, #fcc);
        border-radius: var(--radius-md, 6px);
        font-size: 13px;
      }
    </style>

    <div class="error-demo">
      <div class="error-info">
        <strong>エラー状態のテスト</strong>
        <br><br>
        エラー状態を確認するには、ブラウザの開発者ツールで Clipboard API をブロックするか、
        HTTPS 以外の環境でテストしてください。
        <br><br>
        <strong>期待される動作</strong>:
        <ul style="margin: 0.5rem 0 0 1rem; padding: 0;">
          <li>アイコンが AlertTriangle (⚠) に変わる</li>
          <li>アイコンの色が赤 (--danger) になる</li>
          <li>背景が赤色にフラッシュする</li>
          <li>3秒後に元の状態に戻る</li>
        </ul>
      </div>

      <ui-copy-button
        value="${args.value}"
        label="${args.label}"
      ></ui-copy-button>
    </div>
  `,
};

/**
 * 複数のコピーボタン。
 * 
 * 同じページに複数のコピーボタンを配置した場合の動作を確認できます。
 */
export const MultipleButtons: Story = {
  render: () => html`
    <style>
      .multiple-demo {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .copy-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
      }

      .copy-item-label {
        flex: 1;
        font-size: 13px;
        color: var(--fg-muted, #666);
      }
    </style>

    <div class="multiple-demo">
      <div class="copy-item">
        <span class="copy-item-label">Email: example@example.com</span>
        <ui-copy-button
          value="example@example.com"
          label="メールアドレスをコピー"
        ></ui-copy-button>
      </div>

      <div class="copy-item">
        <span class="copy-item-label">Phone: +81-3-1234-5678</span>
        <ui-copy-button
          value="+81-3-1234-5678"
          label="電話番号をコピー"
        ></ui-copy-button>
      </div>

      <div class="copy-item">
        <span class="copy-item-label">API Key: sk_test_1234567890</span>
        <ui-copy-button
          value="sk_test_1234567890"
          label="APIキーをコピー"
        ></ui-copy-button>
      </div>
    </div>
  `,
};

/**
 * ダークモードでの表示。
 * 
 * ダークモードでの Flash Effect の視認性を確認できます。
 */
export const DarkMode: Story = {
  args: {
    value: 'ダークモードテスト',
    label: 'コピー',
  },
  render: (args) => html`
    <style>
      .dark-demo {
        background: oklch(12% 0.01 250);
        padding: 2rem;
        border-radius: var(--radius-md, 6px);
      }

      .dark-demo ui-copy-button {
        --bg-surface-2: oklch(16% 0.01 250);
        --fg-muted: oklch(60% 0.01 250);
        --bg-success-subtle: oklch(25% 0.15 160 / 0.15);
        --bg-danger-subtle: oklch(25% 0.2 28 / 0.1);
        --success: oklch(70% 0.15 160);
        --danger: oklch(70% 0.2 28);
      }
    </style>

    <div class="dark-demo">
      <ui-copy-button
        value="${args.value}"
        label="${args.label}"
      ></ui-copy-button>
    </div>
  `,
  parameters: {
    backgrounds: { disable: true },
  },
};

/**
 * Forced Colors Mode のシミュレーション。
 * 
 * ハイコントラストモードでの表示を確認できます。
 * 実際の Forced Colors Mode では、Flash Effect の背景色が消失する可能性があります。
 */
export const ForcedColorsMode: Story = {
  args: {
    value: 'ハイコントラストモードテスト',
    label: 'コピー',
  },
  render: (args) => html`
    <style>
      .forced-colors-demo {
        padding: 1rem;
        background: Canvas;
        color: CanvasText;
      }

      .forced-colors-demo ui-copy-button {
        border: 1px solid CanvasText;
      }

      .forced-colors-info {
        margin-bottom: 1rem;
        padding: 1rem;
        border: 1px solid CanvasText;
        font-size: 13px;
      }
    </style>

    <div class="forced-colors-demo">
      <div class="forced-colors-info">
        <strong>Forced Colors Mode</strong>
        <br><br>
        このモードでは、アイコンの形状変化とボーダーの強調が主な視覚的フィードバックとなります。
        Windows のハイコントラストモードで実際の動作を確認できます。
      </div>

      <ui-copy-button
        value="${args.value}"
        label="${args.label}"
      ></ui-copy-button>
    </div>
  `,
  parameters: {
    backgrounds: { disable: true },
  },
};

/**
 * ❌ ラベル未設定のエラー例。
 * 
 * label 属性が設定されていない場合、開発モードでエラーが出力されます。
 * このストーリーは意図的にアクセシビリティ違反を示すためのものです。
 */
export const MissingLabel: Story = {
  render: () => html`
    <style>
      .missing-label-demo {
        padding: 1rem;
        background: var(--bg-danger-subtle, #fee);
        border: 1px solid var(--border-danger, #fcc);
        border-radius: var(--radius-md, 6px);
      }

      .missing-label-info {
        margin-bottom: 1rem;
        font-size: 13px;
      }
    </style>

    <div class="missing-label-demo">
      <div class="missing-label-info">
        <strong>⚠️ アクセシビリティエラー</strong>
        <br><br>
        このボタンには label 属性が設定されていません。
        開発者コンソールにエラーメッセージが表示されます。
      </div>

      <ui-copy-button value="テスト"></ui-copy-button>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector('ui-copy-button');
    if (!button) {
      throw new Error('Copy button component not found');
    }

    await button.updateComplete;

    // テスト: label がないことを確認（これは意図的なエラー例）
    if (button.label) {
      console.warn('This story is designed to show the missing label error');
    }

    console.log('⚠️ This story demonstrates a missing label error');
  },
};

/**
 * イベントハンドリングの例。
 * 
 * copy と copy-error イベントをキャッチして、カスタムフィードバックを実装する例です。
 */
export const WithEventHandlers: Story = {
  args: {
    value: 'イベントハンドリングテスト',
    label: 'コピー',
  },
  render: (args) => html`
    <style>
      .event-demo {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .event-log {
        padding: 1rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
        font-family: 'Monaco', 'Courier New', monospace;
        font-size: 12px;
        min-height: 100px;
        max-height: 200px;
        overflow-y: auto;
      }

      .event-log-item {
        margin-bottom: 0.25rem;
      }

      .event-log-success {
        color: var(--success, green);
      }

      .event-log-error {
        color: var(--danger, red);
      }
    </style>

    <div class="event-demo">
      <ui-copy-button
        value="${args.value}"
        label="${args.label}"
        @copy="${(e: CustomEvent) => {
          const log = document.getElementById('event-log');
          if (log) {
            const item = document.createElement('div');
            item.className = 'event-log-item event-log-success';
            item.textContent = `[${new Date().toLocaleTimeString()}] ✓ Copy success: ${e.detail.value}`;
            log.appendChild(item);
            log.scrollTop = log.scrollHeight;
          }
        }}"
        @copy-error="${(e: CustomEvent) => {
          const log = document.getElementById('event-log');
          if (log) {
            const item = document.createElement('div');
            item.className = 'event-log-item event-log-error';
            item.textContent = `[${new Date().toLocaleTimeString()}] ✗ Copy error: ${e.detail.error}`;
            log.appendChild(item);
            log.scrollTop = log.scrollHeight;
          }
        }}"
      ></ui-copy-button>

      <div id="event-log" class="event-log">
        <div class="event-log-item" style="color: var(--fg-muted, #666);">
          イベントログ（ボタンをクリックしてください）
        </div>
      </div>
    </div>
  `,
};

/**
 * 🧪 自動テスト用ストーリー（成功状態）
 * 
 * このストーリーは Clipboard API をモックして、成功状態の動作を自動的にテストします。
 * Storybook の iframe 内でも確実に動作するように設計されています。
 * 
 * @internal このストーリーは自動テスト専用です。通常のドキュメントには表示されません。
 */
export const TestSuccessState: Story = {
  args: {
    value: 'テスト用テキスト',
    label: 'コピー',
  },
  tags: ['!autodocs'], // ドキュメントから除外
  render: (args) => html`
    <ui-copy-button
      value="${args.value}"
      label="${args.label}"
    ></ui-copy-button>
  `,
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector('ui-copy-button');
    if (!button) {
      throw new Error('Copy button component not found');
    }

    await button.updateComplete;

    const uiButton = button.shadowRoot?.querySelector('ui-button');
    if (!uiButton) {
      throw new Error('UI button not found in shadow root');
    }

    // Clipboard API をモック（成功を保証）
    const originalWriteText = navigator.clipboard.writeText;
    navigator.clipboard.writeText = async () => {
      return Promise.resolve();
    };

    try {
      // ボタンをクリック
      await userEvent.click(uiButton);
      await new Promise(resolve => setTimeout(resolve, 100));

      // テスト: 成功状態になっていること
      if (button.getAttribute('state') !== 'success') {
        throw new Error('Expected state to be "success"');
      }

      // テスト: アイコンが Check に変わっていること
      const icon = button.shadowRoot?.querySelector('iconify-icon');
      if (!icon) {
        throw new Error('Icon not found');
      }

      if (icon.getAttribute('icon') !== 'lucide:check') {
        throw new Error('Expected icon to be "lucide:check"');
      }

      console.log('✅ All tests passed for TestSuccessState story');
    } finally {
      // モックを元に戻す
      navigator.clipboard.writeText = originalWriteText;
    }
  },
};
