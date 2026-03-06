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
    size: {
      control: 'inline-radio',
      options: ['sm', 'md'],
      description: 'ボタンサイズ',
      table: {
        type: { summary: "'sm' | 'md'" },
        defaultValue: { summary: 'sm' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<CopyButton>;

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

const getCopyButton = (canvasElement: Element, selector = 'ui-copy-button'): CopyButton => {
  const button = canvasElement.querySelector<CopyButton>(selector);
  if (!button) {
    throw new Error('ui-copy-button が見つかりません');
  }
  return button;
};

const getInnerUiButton = (copyButton: CopyButton): HTMLElement => {
  const uiButton = copyButton.shadowRoot?.querySelector<HTMLElement>('ui-button');
  if (!uiButton) {
    throw new Error('Shadow Root 内に ui-button が見つかりません');
  }
  return uiButton;
};

const withMockedClipboardWrite = async (
  mock: (value: string) => Promise<void>,
  callback: () => Promise<void>,
): Promise<void> => {
  const originalWriteText = navigator.clipboard.writeText.bind(navigator.clipboard);
  navigator.clipboard.writeText = mock;
  try {
    await callback();
  } finally {
    navigator.clipboard.writeText = originalWriteText;
  }
};

/**
 * デフォルトのコピーボタン。
 * 
 * コードブロック内などで使用する標準的なコピーボタンです。
 */
export const Default: Story = {
  args: {
    value: 'コピーされるテキスト',
    label: 'コードをコピー',
    size: 'sm',
  },
  render: (args) => html`
    <ui-copy-button
      value="${args.value}"
      label="${args.label}"
      size="${args.size}"
    ></ui-copy-button>
  `,
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector('ui-copy-button');
    if (!button) {
      throw new Error('ui-copy-button が見つかりません');
    }

    await button.updateComplete;

    // テスト: label 属性が設定されていること
    if (!button.label) {
      throw new Error('label 属性が設定されている必要があります');
    }

    // テスト: value 属性が設定されていること
    if (!button.value) {
      throw new Error('value 属性が設定されている必要があります');
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
    size: 'sm',
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
        size="${args.size}"
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
    size: 'sm',
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
        size="${args.size}"
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
    size: 'sm',
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
        size="${args.size}"
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
    value: 'dark-success',
    label: 'ダークモードコピー',
    size: 'sm',
  },
  render: (args) => html`
    <style>
      .dark-demo {
        background: oklch(12% 0.01 250);
        padding: 2rem;
        border-radius: var(--radius-md, 6px);
        display: flex;
        gap: 1rem;
        align-items: center;
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
        id="dark-success"
        value="${args.value}"
        label="${args.label}"
        size="${args.size}"
      ></ui-copy-button>
      <ui-copy-button
        id="dark-error"
        value="dark-error"
        label="ダークモードエラー"
        size="${args.size}"
      ></ui-copy-button>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const successButton = getCopyButton(canvasElement, '#dark-success');
    const errorButton = getCopyButton(canvasElement, '#dark-error');
    await withMockedClipboardWrite(async (value: string) => {
      if (value === 'dark-error') {
        throw new Error('forced dark mode error');
      }
      return Promise.resolve();
    }, async () => {
      await userEvent.click(getInnerUiButton(successButton));
      await userEvent.click(getInnerUiButton(errorButton));
      await sleep(100);
    });

    if (successButton.getAttribute('state') !== 'success') {
      throw new Error(`ダークモードの成功ボタンが success 状態であることを期待していましたが、実際には "${successButton.getAttribute('state') ?? 'null'}" でした`);
    }
    if (errorButton.getAttribute('state') !== 'error') {
      throw new Error(`ダークモードのエラーボタンが error 状態であることを期待していましたが、実際には "${errorButton.getAttribute('state') ?? 'null'}" でした`);
    }
  },
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
    value: 'forced-success',
    label: 'ハイコントラストコピー',
    size: 'sm',
  },
  render: (args) => html`
    <style>
      .forced-colors-demo {
        padding: 1rem;
        background: Canvas;
        color: CanvasText;
      }

      .forced-colors-actions {
        display: flex;
        gap: 0.75rem;
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

      <div class="forced-colors-actions">
        <ui-copy-button
          id="forced-success"
          value="${args.value}"
          label="${args.label}"
          size="${args.size}"
        ></ui-copy-button>
        <ui-copy-button
          id="forced-error"
          value="forced-error"
          label="ハイコントラストエラー"
          size="${args.size}"
        ></ui-copy-button>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const successButton = getCopyButton(canvasElement, '#forced-success');
    const errorButton = getCopyButton(canvasElement, '#forced-error');
    await withMockedClipboardWrite(async (value: string) => {
      if (value === 'forced-error') {
        throw new Error('forced high contrast error');
      }
      return Promise.resolve();
    }, async () => {
      await userEvent.click(getInnerUiButton(successButton));
      await userEvent.click(getInnerUiButton(errorButton));
      await sleep(100);
    });

    if (successButton.getAttribute('state') !== 'success') {
      throw new Error(`ハイコントラストモードの成功ボタンが success 状態であることを期待していましたが、実際には "${successButton.getAttribute('state') ?? 'null'}" でした`);
    }
    if (errorButton.getAttribute('state') !== 'error') {
      throw new Error(`ハイコントラストモードのエラーボタンが error 状態であることを期待していましたが、実際には "${errorButton.getAttribute('state') ?? 'null'}" でした`);
    }
  },
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
  tags: ['!autodocs'],
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
    const button = getCopyButton(canvasElement);
    await button.updateComplete;

    // テスト: label がないことを確認（これは意図的なエラー例）
    if (button.label) {
      console.warn('This story is designed to show the missing label error');
    }

    // テスト: 本番アクセシビリティ崩壊を防ぐため、aria-label は安全な既定値へフォールバック
    const uiButton = getInnerUiButton(button);
    if (uiButton.getAttribute('aria-label') !== 'コピー') {
      throw new Error(`フォールバックの aria-label が "コピー" であることを期待していましたが、実際には "${uiButton.getAttribute('aria-label') ?? 'null'}" でした`);
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
    size: 'sm',
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
        size="${args.size}"
        @copy="${(e: CustomEvent<{ value: string }>) => {
      const log = document.getElementById('event-log');
      if (log) {
        const item = document.createElement('div');
        item.className = 'event-log-item event-log-success';
        item.textContent = `[${new Date().toLocaleTimeString()}] ✓ Copy success: ${e.detail.value}`;
        log.appendChild(item);
        log.scrollTop = log.scrollHeight;
      }
    }}"
        @copy-error="${(e: CustomEvent<{ error: unknown }>) => {
      const log = document.getElementById('event-log');
      if (log) {
        const item = document.createElement('div');
        item.className = 'event-log-item event-log-error';
        item.textContent = `[${new Date().toLocaleTimeString()}] ✗ Copy error: ${String(e.detail.error)}`;
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
    size: 'sm',
  },
  tags: ['!autodocs'], // ドキュメントから除外
  render: (args) => html`
    <ui-copy-button
      value="${args.value}"
      label="${args.label}"
      size="${args.size}"
    ></ui-copy-button>
  `,
  play: async ({ canvasElement }) => {
    const button = getCopyButton(canvasElement);
    await button.updateComplete;
    const uiButton = getInnerUiButton(button);

    let copyEventCount = 0;
    let copiedValue = '';
    button.addEventListener('copy', (event: Event) => {
      const customEvent = event as CustomEvent<{ value: string }>;
      copyEventCount += 1;
      copiedValue = customEvent.detail.value;
    });

    await withMockedClipboardWrite(async () => Promise.resolve(), async () => {
      await userEvent.click(uiButton);
      await sleep(100);
    });

    if (button.getAttribute('state') !== 'success') {
      throw new Error(`state="success" を期待していましたが、実際には "${button.getAttribute('state') ?? 'null'}" でした`);
    }

    const icon = button.shadowRoot?.querySelector('iconify-icon');
    if (!icon) {
      throw new Error('アイコンが見つかりません');
    }
    if (icon.getAttribute('icon') !== 'lucide:check') {
      throw new Error(`アイコンが "lucide:check" であることを期待していましたが、実際には "${icon.getAttribute('icon') ?? 'null'}" でした`);
    }

    if (!uiButton.getAttribute('aria-label')?.includes('コピーしました')) {
      throw new Error(`aria-label に成功メッセージが含まれていることを期待していましたが、実際には "${uiButton.getAttribute('aria-label') ?? 'null'}" でした`);
    }

    const liveRegion = button.shadowRoot?.querySelector('.sr-only');
    if (!liveRegion) {
      throw new Error('ライブリージョンが見つかりません');
    }
    if (liveRegion.getAttribute('role') !== 'status') {
      throw new Error(`ライブリージョンの role が "status" であることを期待していましたが、実際には "${liveRegion.getAttribute('role') ?? 'null'}" でした`);
    }
    if (liveRegion.getAttribute('aria-live') !== 'polite') {
      throw new Error(`ライブリージョンの aria-live が "polite" であることを期待していましたが、実際には "${liveRegion.getAttribute('aria-live') ?? 'null'}" でした`);
    }
    if (!liveRegion.textContent.includes('コピーしました')) {
      throw new Error(`ライブリージョンのテキストに成功メッセージが含まれていることを期待していましたが、実際には "${liveRegion.textContent}" でした`);
    }

    if (copyEventCount !== 1 || copiedValue !== button.value) {
      throw new Error(`コピーイベントが1回発行され、正しい値がコピーされることを期待していましたが、実際には count: ${String(copyEventCount)}, value: "${copiedValue}" でした`);
    }

    console.log('✅ All tests passed for TestSuccessState story');
  },
};

/**
 * サイズバリアントの比較。
 *
 * sm / md の使い分けとヒットエリアの一貫性を確認できます。
 */
export const SizeVariants: Story = {
  render: () => html`
    <style>
      .size-variants-demo {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
      }
    </style>
    <div class="size-variants-demo">
      <ui-copy-button value="small" label="smサイズをコピー" size="sm"></ui-copy-button>
      <ui-copy-button value="medium" label="mdサイズをコピー" size="md"></ui-copy-button>
    </div>
  `,
};

/**
 * サイズ × 状態の組み合わせ。
 *
 * sm / md の両サイズで Success / Error の状態遷移を同時に確認します。
 */
export const SizeStateMatrix: Story = {
  render: () => html`
    <style>
      .size-state-matrix {
        display: grid;
        grid-template-columns: repeat(2, minmax(180px, 1fr));
        gap: 1rem;
        padding: 1rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
      }

      .size-state-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem;
        background: var(--bg-default, #fff);
        border: 1px solid var(--border-default, #e0e0e0);
        border-radius: var(--radius-sm, 4px);
        font-size: 12px;
      }
    </style>
    <div class="size-state-matrix">
      <div class="size-state-item">
        <span>sm / success</span>
        <ui-copy-button id="matrix-sm-success" value="sm-success" label="sm成功" size="sm"></ui-copy-button>
      </div>
      <div class="size-state-item">
        <span>sm / error</span>
        <ui-copy-button id="matrix-sm-error" value="sm-error" label="sm失敗" size="sm"></ui-copy-button>
      </div>
      <div class="size-state-item">
        <span>md / success</span>
        <ui-copy-button id="matrix-md-success" value="md-success" label="md成功" size="md"></ui-copy-button>
      </div>
      <div class="size-state-item">
        <span>md / error</span>
        <ui-copy-button id="matrix-md-error" value="md-error" label="md失敗" size="md"></ui-copy-button>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const smSuccess = getCopyButton(canvasElement, '#matrix-sm-success');
    const smError = getCopyButton(canvasElement, '#matrix-sm-error');
    const mdSuccess = getCopyButton(canvasElement, '#matrix-md-success');
    const mdError = getCopyButton(canvasElement, '#matrix-md-error');

    await withMockedClipboardWrite(async (value: string) => {
      if (value.includes('error')) {
        throw new Error('forced error');
      }
      return Promise.resolve();
    }, async () => {
      await userEvent.click(getInnerUiButton(smSuccess));
      await userEvent.click(getInnerUiButton(smError));
      await userEvent.click(getInnerUiButton(mdSuccess));
      await userEvent.click(getInnerUiButton(mdError));
      await sleep(100);
    });

    if (smSuccess.getAttribute('state') !== 'success' || mdSuccess.getAttribute('state') !== 'success') {
      throw new Error(`マトリックス内の成功ボタンが success 状態になることを期待していましたが、実際には sm: "${smSuccess.getAttribute('state') ?? 'null'}", md: "${mdSuccess.getAttribute('state') ?? 'null'}" でした`);
    }
    if (smError.getAttribute('state') !== 'error' || mdError.getAttribute('state') !== 'error') {
      throw new Error(`マトリックス内のエラーボタンが error 状態になることを期待していましたが、実際には sm: "${smError.getAttribute('state') ?? 'null'}", md: "${mdError.getAttribute('state') ?? 'null'}" でした`);
    }
  },
};

/**
 * 🧪 自動テスト用ストーリー（エラー状態）
 *
 * Clipboard API 失敗時の state / icon / live region 切り替えを検証します。
 */
export const TestErrorState: Story = {
  args: {
    value: 'テスト用テキスト',
    label: 'コピー',
    size: 'sm',
  },
  tags: ['!autodocs'],
  render: (args) => html`
    <ui-copy-button
      value="${args.value}"
      label="${args.label}"
      size="${args.size}"
    ></ui-copy-button>
  `,
  play: async ({ canvasElement }) => {
    const button = getCopyButton(canvasElement);
    await button.updateComplete;
    const uiButton = getInnerUiButton(button);

    let copyErrorEventCount = 0;
    let failedValue = '';
    button.addEventListener('copy-error', (event: Event) => {
      const customEvent = event as CustomEvent<{ error: unknown; value: string }>;
      copyErrorEventCount += 1;
      failedValue = customEvent.detail.value;
    });

    await withMockedClipboardWrite(async () => Promise.reject(new Error('Clipboard write failed')), async () => {
      await userEvent.click(uiButton);
      await sleep(100);
    });

    if (button.getAttribute('state') !== 'error') {
      throw new Error(`state="error" を期待していましたが、実際には "${button.getAttribute('state') ?? 'null'}" でした`);
    }

    const icon = button.shadowRoot?.querySelector('iconify-icon');
    if (!icon) {
      throw new Error('アイコンが見つかりません');
    }

    if (icon.getAttribute('icon') !== 'lucide:alert-triangle') {
      throw new Error(`アイコンが "lucide:alert-triangle" であることを期待していましたが、実際には "${icon.getAttribute('icon') ?? 'null'}" でした`);
    }

    if (!uiButton.getAttribute('aria-label')?.includes('コピー失敗')) {
      throw new Error(`aria-label にエラーメッセージが含まれていることを期待していましたが、実際には "${uiButton.getAttribute('aria-label') ?? 'null'}" でした`);
    }

    const liveRegion = button.shadowRoot?.querySelector('.sr-only');
    if (!liveRegion) {
      throw new Error('ライブリージョンが見つかりません');
    }

    if (liveRegion.getAttribute('role') !== 'alert') {
      throw new Error(`ライブリージョンの role が "alert" であることを期待していましたが、実際には "${liveRegion.getAttribute('role') ?? 'null'}" でした`);
    }

    if (liveRegion.getAttribute('aria-live') !== 'assertive') {
      throw new Error(`ライブリージョンの aria-live が "assertive" であることを期待していましたが、実際には "${liveRegion.getAttribute('aria-live') ?? 'null'}" でした`);
    }

    if (!liveRegion.textContent.includes('コピー失敗')) {
      throw new Error(`ライブリージョンのテキストにエラーメッセージが含まれていることを期待していましたが、実際には "${liveRegion.textContent}" でした`);
    }

    if (copyErrorEventCount !== 1 || failedValue !== button.value) {
      throw new Error(`コピーエラーイベントが1回発行され、正しい値が設定されることを期待していましたが、実際には count: ${String(copyErrorEventCount)}, value: "${failedValue}" でした`);
    }
  },
};

/**
 * 🧪 自動テスト用ストーリー（タイマー復帰）
 *
 * Success 2000ms / Error 3000ms 後に Idle へ復帰する境界条件を検証します。
 */
export const TestStateTimerReset: Story = {
  tags: ['!autodocs'],
  render: () => html`
    <div style="display: flex; gap: 1rem;">
      <ui-copy-button id="success-btn" value="success" label="成功テスト" size="sm"></ui-copy-button>
      <ui-copy-button id="error-btn" value="error" label="失敗テスト" size="sm"></ui-copy-button>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const successButton = canvasElement.querySelector<CopyButton>('#success-btn');
    const errorButton = canvasElement.querySelector<CopyButton>('#error-btn');
    if (!successButton || !errorButton) {
      throw new Error('ui-copy-button が見つかりません');
    }

    const successUiButton = getInnerUiButton(successButton);
    const errorUiButton = getInnerUiButton(errorButton);

    await withMockedClipboardWrite(async (value: string) => {
      if (value === 'error') {
        throw new Error('forced error');
      }
      return Promise.resolve();
    }, async () => {
      await userEvent.click(successUiButton);
      await sleep(2100);
      if (successButton.getAttribute('state') !== 'idle') {
        throw new Error(`2000ms後に成功状態が idle にリセットされることを期待していましたが、実際には "${successButton.getAttribute('state') ?? 'null'}" でした`);
      }
      if (successUiButton.getAttribute('aria-label') !== '成功テスト') {
        throw new Error(`成功ボタンの aria-label が基本ラベルにリセットされることを期待していましたが、実際には "${successUiButton.getAttribute('aria-label') ?? 'null'}" でした`);
      }

      await userEvent.click(errorUiButton);
      await sleep(3100);
      if (errorButton.getAttribute('state') !== 'idle') {
        throw new Error(`3000ms後にエラー状態が idle にリセットされることを期待していましたが、実際には "${errorButton.getAttribute('state') ?? 'null'}" でした`);
      }
      if (errorUiButton.getAttribute('aria-label') !== '失敗テスト') {
        throw new Error(`エラーボタンの aria-label が基本ラベルにリセットされることを期待していましたが、実際には "${errorUiButton.getAttribute('aria-label') ?? 'null'}" でした`);
      }
    });
  },
};

/**
 * 🧪 自動テスト用ストーリー（連打時の再通知）
 *
 * 同一状態への連続遷移でも aria-label と state が更新されることを確認します。
 */
export const TestRapidClicksReplay: Story = {
  tags: ['!autodocs'],
  args: {
    value: '連打テスト',
    label: 'コピー',
    size: 'sm',
  },
  render: (args) => html`
    <ui-copy-button
      value="${args.value}"
      label="${args.label}"
      size="${args.size}"
    ></ui-copy-button>
  `,
  play: async ({ canvasElement }) => {
    const button = getCopyButton(canvasElement);
    const uiButton = getInnerUiButton(button);
    let copyEventCount = 0;
    button.addEventListener('copy', () => {
      copyEventCount += 1;
    });

    await withMockedClipboardWrite(async () => Promise.resolve(), async () => {
      await userEvent.click(uiButton);
      await sleep(80);
      const firstLabel = uiButton.getAttribute('aria-label');

      await userEvent.click(uiButton);
      await sleep(80);
      const secondLabel = uiButton.getAttribute('aria-label');

      if (button.getAttribute('state') !== 'success') {
        throw new Error(`連打後も success 状態が維持されることを期待していましたが、実際には "${button.getAttribute('state') ?? 'null'}" でした`);
      }

      if (!firstLabel?.includes('コピーしました') || !secondLabel?.includes('コピーしました')) {
        throw new Error(`連打時も aria-label が成功メッセージに更新されることを期待していましたが、実際には first: "${firstLabel ?? 'null'}", second: "${secondLabel ?? 'null'}" でした`);
      }

      if (copyEventCount !== 2) {
        throw new Error(`2連打後にコピーイベントが2回発行されることを期待していましたが、実際には ${String(copyEventCount)}回でした`);
      }
    });
  },
};

/**
 * 自動テスト用ストーリー（遅延時ローディング表示）
 *
 * 非同期処理が --timeout-async-threshold を超えた場合のみ「コピー中」を表示する仕様を検証します。
 */
export const TestLoadingIndicatorThreshold: Story = {
  tags: ['!autodocs'],
  args: {
    value: 'loading-threshold',
    label: 'コピー',
    size: 'sm',
  },
  render: (args) => html`
    <ui-copy-button
      value="${args.value}"
      label="${args.label}"
      size="${args.size}"
      style="--timeout-async-threshold: 10;"
    ></ui-copy-button>
  `,
  play: async ({ canvasElement }) => {
    const button = getCopyButton(canvasElement);
    const uiButton = getInnerUiButton(button);

    await withMockedClipboardWrite(async () => {
      await sleep(80);
      return Promise.resolve();
    }, async () => {
      await userEvent.click(uiButton);
      await sleep(25);

      const loadingIcon = button.shadowRoot?.querySelector('iconify-icon');
      if (loadingIcon?.getAttribute('icon') !== 'lucide:loader-circle') {
        throw new Error(`遅延コピー中にローディングアイコンが表示されることを期待していましたが、実際には "${loadingIcon?.getAttribute('icon') ?? 'null'}" でした`);
      }

      if (!uiButton.getAttribute('aria-label')?.includes('コピー中')) {
        throw new Error(`aria-label にローディングメッセージが含まれていることを期待していましたが、実際には "${uiButton.getAttribute('aria-label') ?? 'null'}" でした`);
      }

      await sleep(100);
    });

    if (button.getAttribute('state') !== 'success') {
      throw new Error(`遅延コピー終了後に success 状態になることを期待していましたが、実際には "${button.getAttribute('state') ?? 'null'}" でした`);
    }
  },
};
