import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './textarea';
import type { Textarea } from './textarea';

/**
 * ## テキストエリア (Textarea) `<ui-textarea>`
 *
 * 複数行のテキスト入力コンポーネント。
 * ユーザーの思考に合わせて領域が自動的に拡張（Auto Grow）し、
 * スクロール操作による中断を物理的に排除します（Flow State）。
 *
 * ### バリアント
 * - **default**: UI 用（14px, 密度優先）
 * - **prose**: コンテンツ執筆用（16px, 可読性優先）
 *
 * ### 状態
 * Default / Hover / Focus / Error / Disabled / Readonly
 *
 * ### Auto Grow
 * - `auto-grow="true"` (デフォルト): 入力行数に応じて即時拡張（0ms）
 * - `max-rows`: 最大行数を超えた場合のみ内部スクロール
 * - `auto-grow="false"`: 手動リサイズ（`resize="vertical"` を許容）
 */
const meta: Meta<Textarea> = {
  title: 'Components/Textarea',
  component: 'ui-textarea',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
テキストエリアコンポーネントは、複数行のテキスト入力を提供します。
Auto Grow により入力に対して即応（0ms）し、Flow State を実現します。

## 使用方法

\`\`\`html
<!-- 基本的な使用 -->
<ui-textarea label="メモ" name="memo"></ui-textarea>

<!-- Prose バリアント（執筆用） -->
<ui-textarea label="本文" variant="prose" rows="6"></ui-textarea>

<!-- 最大行数制限 -->
<ui-textarea label="説明" max-rows="5"></ui-textarea>

<!-- Auto Grow 無効（手動リサイズ） -->
<ui-textarea label="メモ" auto-grow="false"></ui-textarea>
\`\`\`

## 注意事項

- **ラベルは必須**: アクセシビリティのため \`label\` 属性は必ず設定してください。
- **Auto Grow**: デフォルトで有効。高さ変化は 0ms（即時）です。
- **max-rows**: 超過時のみ内部スクロールが発生します。
- **type プロパティは非対応**: \`<ui-input>\` の \`type\` は Textarea では使用しません。
                `,
      },
    },
  },
  argTypes: {
    label: {
      control: 'text',
      description: '入力項目のラベル（必須）',
      table: { type: { summary: 'string' }, defaultValue: { summary: '' } },
    },
    hideLabel: {
      control: 'boolean',
      description: 'ラベルを視覚的に非表示',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    variant: {
      control: 'select',
      options: ['default', 'prose'],
      description: 'タイポグラフィモード',
      table: { type: { summary: "'default' | 'prose'" }, defaultValue: { summary: "'default'" } },
    },
    rows: {
      control: 'number',
      description: '初期表示行数',
      table: { type: { summary: 'number' }, defaultValue: { summary: '3' } },
    },
    maxRows: {
      control: 'number',
      description: '自動伸長時の最大行数（未指定で無制限）',
      table: { type: { summary: 'number' } },
    },
    autoGrow: {
      control: 'boolean',
      description: '自動高さ拡張',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'true' } },
    },
    resize: {
      control: 'select',
      options: ['none', 'vertical'],
      description: 'CSS resize プロパティ（auto-grow=false 時のみ vertical を許容）',
      table: { type: { summary: "'none' | 'vertical'" }, defaultValue: { summary: "'none'" } },
    },
    placeholder: {
      control: 'text',
      description: 'ヒントテキスト',
      table: { type: { summary: 'string' }, defaultValue: { summary: '' } },
    },
    value: {
      control: 'text',
      description: '入力値',
      table: { type: { summary: 'string' }, defaultValue: { summary: '' } },
    },
    helpText: {
      control: 'text',
      description: '補助テキスト',
      table: { type: { summary: 'string' }, defaultValue: { summary: '' } },
    },
    errorMessage: {
      control: 'text',
      description: 'エラーメッセージ',
      table: { type: { summary: 'string' }, defaultValue: { summary: '' } },
    },
    error: {
      control: 'boolean',
      description: 'エラー状態の強制',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    disabled: {
      control: 'boolean',
      description: '操作無効化',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    readonly: {
      control: 'boolean',
      description: '読み取り専用モード',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    required: {
      control: 'boolean',
      description: '必須入力フラグ',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
  },
};

export default meta;
type Story = StoryObj<Textarea>;

// ──────────────────────────────────────────────
// Default
// ──────────────────────────────────────────────

/**
 * デフォルトのテキストエリア。
 *
 * `variant="default"` (UI 用, 14px) で `rows=3` の初期表示。
 * 入力に応じて高さが即時拡張します（Auto Grow）。
 */
export const Default: Story = {
  args: {
    label: 'メモ',
    name: 'memo',
    placeholder: 'メモを入力してください...',
    rows: 3,
    autoGrow: true,
    variant: 'default',
  },
  render: (args) => html`
    <ui-textarea
      id="default-textarea"
      label="${args.label}"
      name="${args.name}"
      placeholder="${args.placeholder}"
      rows="${args.rows}"
      ?auto-grow="${args.autoGrow}"
      variant="${args.variant}"
    ></ui-textarea>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector<Textarea>('#default-textarea');
    if (!el) throw new Error('ui-textareaが見つかりません');
    await el.updateComplete;

    const ta = el.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea');
    if (!ta) throw new Error('Shadow Root内に textarea が見つかりません');

    // テスト: aria-label が label プロパティと一致する
    if (ta.getAttribute('aria-label') !== 'メモ') {
      throw new Error(`aria-label="メモ" が期待されていましたが、実際には "${ta.getAttribute('aria-label') ?? 'null'}" でした`);
    }

    // テスト: rows 属性が設定されている
    if (ta.rows !== 3) {
      throw new Error(`rows=3 が期待されていましたが、実際には ${String(ta.rows)} でした`);
    }

    // テスト: disabled でない
    if (ta.disabled) throw new Error('textarea が無効化されていることを期待していましたが、有効になっています');

    // テスト: aria-invalid="false"
    if (ta.getAttribute('aria-invalid') !== 'false') {
      throw new Error(`aria-invalid="false" が期待されていましたが、実際には "${ta.getAttribute('aria-invalid') ?? 'null'}" でした`);
    }
  },
};

// ──────────────────────────────────────────────
// バリアント
// ──────────────────────────────────────────────

/**
 * Default バリアント（UI 用）。
 *
 * 14px / line-height 1.5 / padding 8px 12px。
 * UI コンポーネント間の密度を優先します。
 */
export const VariantDefault: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 480px;">
      <div style="font-size: 11px; font-weight: 500; color: oklch(48% 0.01 250); text-transform: uppercase; letter-spacing: 0.05em;">
        variant="default" (UI, 14px)
      </div>
      <ui-textarea
        id="variant-default"
        label="メモ"
        variant="default"
        placeholder="UI 用テキストエリア（14px）"
        rows="3"
      ></ui-textarea>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector<Textarea>('#variant-default');
    if (!el) throw new Error('ui-textareaが見つかりません');
    await el.updateComplete;

    if (el.variant !== 'default') {
      throw new Error(`デフォルトバリアントが期待されていましたが、実際には "${el.variant}" でした`);
    }

    const ta = el.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea');
    if (!ta) throw new Error('textareaが見つかりません');

    // テスト: prose クラスが付いていない
    if (ta.classList.contains('prose')) {
      throw new Error('デフォルトバリアントは"prose"クラスを含むべきではありません');
    }
  },
};

/**
 * Prose バリアント（コンテンツ執筆用）。
 *
 * 16px / line-height 1.75 / padding 12px。
 * 読む体験（`.prose`）との完全な一致を提供します。
 */
export const VariantProse: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 480px;">
      <div style="font-size: 11px; font-weight: 500; color: oklch(48% 0.01 250); text-transform: uppercase; letter-spacing: 0.05em;">
        variant="prose" (Content, 16px)
      </div>
      <ui-textarea
        id="variant-prose"
        label="本文"
        variant="prose"
        placeholder="コンテンツを執筆してください..."
        rows="6"
      ></ui-textarea>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector<Textarea>('#variant-prose');
    if (!el) throw new Error('ui-textareaが見つかりません');
    await el.updateComplete;

    if (el.variant !== 'prose') {
      throw new Error(`Proseバリアントが期待されていましたが、実際には "${el.variant}" でした`);
    }

    const ta = el.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea');
    if (!ta) throw new Error('textareaが見つかりません');

    // テスト: prose クラスが付いている
    if (!ta.classList.contains('prose')) {
      throw new Error('Proseバリアントは"prose" classを含む必要があります');
    }
  },
};

// ──────────────────────────────────────────────
// 状態別ストーリー
// ──────────────────────────────────────────────

/**
 * エラー状態（Default バリアント）。
 *
 * `error` + `error-message` でエラーを表示します。
 * `aria-invalid="true"` が設定され、エラーメッセージが `aria-describedby` で紐付けられます。
 */
export const ErrorState: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 480px;">
      <ui-textarea
        id="error-default"
        label="メモ"
        variant="default"
        error
        error-message="本文を入力してください"
        placeholder="メモを入力..."
        rows="3"
      ></ui-textarea>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector<Textarea>('#error-default');
    if (!el) throw new Error('ui-textareaが見つかりません');
    await el.updateComplete;

    const ta = el.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea');
    if (!ta) throw new Error('textareaが見つかりません');

    // テスト: aria-invalid="true"
    if (ta.getAttribute('aria-invalid') !== 'true') {
      throw new Error(`aria-invalid="true" が期待されていましたが、実際には "${ta.getAttribute('aria-invalid') ?? 'null'}" でした`);
    }

    // テスト: error クラスが付いている
    if (!ta.classList.contains('error')) {
      throw new Error('エラー状態では"error"クラスが付与されるべきです');
    }

    // テスト: エラーメッセージが表示されている
    const errMsg = el.shadowRoot?.querySelector('.error-message--visible');
    if (!errMsg) throw new Error('エラーメッセージが表示されるべきです');
    if (!errMsg.textContent.includes('本文を入力してください')) {
      throw new Error(`"本文を入力してください"というエラーメッセージが表示されるべきですが、実際には "${errMsg.textContent}" でした`);
    }

    // テスト: aria-describedby が設定されている
    const describedBy = ta.getAttribute('aria-describedby');
    if (!describedBy) throw new Error('エラーがある時は aria-describedby が設定されるべきです');
  },
};

/**
 * エラー状態（Prose バリアント）。
 *
 * Prose バリアントでもエラー表示は同様に機能します。
 */
export const ErrorStateProse: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 480px;">
      <ui-textarea
        id="error-prose"
        label="本文"
        variant="prose"
        error
        error-message="本文は必須です"
        rows="4"
      ></ui-textarea>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector<Textarea>('#error-prose');
    if (!el) throw new Error('ui-textareaが見つかりません');
    await el.updateComplete;

    const ta = el.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea');
    if (!ta) throw new Error('textareaが見つかりません');

    if (ta.getAttribute('aria-invalid') !== 'true') {
      throw new Error(`aria-invalid="true" が期待されていましたが、実際には "${ta.getAttribute('aria-invalid') ?? 'null'}" でした`);
    }
    if (!ta.classList.contains('error')) throw new Error('error クラスを持つべきです');
    if (!ta.classList.contains('prose')) throw new Error('prose クラスを持つべきです');
  },
};

/**
 * Disabled 状態。
 *
 * `disabled` 状態では操作不可。フォーカスも不可。
 * `opacity: --opacity-disabled` で薄く表示されます。
 */
export const StateDisabled: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 480px;">
      <ui-textarea
        id="disabled-default"
        label="メモ（無効）"
        variant="default"
        disabled
        value="このテキストは編集できません"
        rows="3"
      ></ui-textarea>
      <ui-textarea
        id="disabled-prose"
        label="本文（無効）"
        variant="prose"
        disabled
        value="Prose バリアントの無効状態"
        rows="3"
      ></ui-textarea>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const elDefault = canvasElement.querySelector<Textarea>('#disabled-default');
    const elProse = canvasElement.querySelector<Textarea>('#disabled-prose');
    if (!elDefault || !elProse) throw new Error('ui-textareaが見つかりません');
    await Promise.all([elDefault.updateComplete, elProse.updateComplete]);

    for (const [id, el] of [['#disabled-default', elDefault], ['#disabled-prose', elProse]] as const) {
      const ta = el.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea');
      if (!ta) throw new Error(`${id}: textareaが見つかりません`);
      if (!ta.disabled) throw new Error(`${id}: textarea が無効化されていることを期待していましたが、有効になっています`);
    }
  },
};

/**
 * Readonly 状態。
 *
 * フォーカス可能だがコピーのみ許可。resize も無効化されます。
 */
export const StateReadonly: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 480px;">
      <ui-textarea
        id="readonly-default"
        label="メモ（読み取り専用）"
        variant="default"
        readonly
        value="このテキストはコピーのみ可能です"
        rows="3"
      ></ui-textarea>
      <ui-textarea
        id="readonly-prose"
        label="本文（読み取り専用）"
        variant="prose"
        readonly
        value="Prose バリアントの読み取り専用状態"
        rows="3"
      ></ui-textarea>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const elDefault = canvasElement.querySelector<Textarea>('#readonly-default');
    const elProse = canvasElement.querySelector<Textarea>('#readonly-prose');
    if (!elDefault || !elProse) throw new Error('ui-textareaが見つかりません');
    await Promise.all([elDefault.updateComplete, elProse.updateComplete]);

    for (const [id, el] of [['#readonly-default', elDefault], ['#readonly-prose', elProse]] as const) {
      const ta = el.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea');
      if (!ta) throw new Error(`${id}: textareaが見つかりません`);
      if (!ta.readOnly) throw new Error(`${id}: textarea が読み取り専用であることを期待していましたが、違います`);
    }
  },
};

/**
 * ヘルプテキスト付き。
 *
 * `help-text` はエラー状態でない場合のみ表示されます。
 * エラー状態になると Help Text は非表示になり、Error Message のみ表示されます。
 */
export const WithHelpText: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 480px;">
      <ui-textarea
        id="help-text-default"
        label="メモ"
        variant="default"
        help-text="Markdown 記法が使用できます"
        rows="3"
      ></ui-textarea>
      <ui-textarea
        id="help-text-prose"
        label="本文"
        variant="prose"
        help-text="本文は Prose バリアントで表示されます（16px）"
        rows="4"
      ></ui-textarea>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const elDefault = canvasElement.querySelector<Textarea>('#help-text-default');
    if (!elDefault) throw new Error('ui-textareaが見つかりません');
    await elDefault.updateComplete;

    const helpText = elDefault.shadowRoot?.querySelector('.help-text');
    if (!helpText) throw new Error('ヘルプテキストが表示されるべきです');
    if (!helpText.textContent.includes('Markdown 記法が使用できます')) {
      throw new Error('ヘルプテキストの内容が一致しません');
    }

    // テスト: エラー状態にすると Help Text が非表示になる
    elDefault.error = true;
    elDefault.errorMessage = 'エラーが発生しました';
    await elDefault.updateComplete;

    const helpTextAfterError = elDefault.shadowRoot?.querySelector('.help-text');
    if (helpTextAfterError) {
      throw new Error('エラーがある時はヘルプテキストが非表示になるべきです');
    }

    const errMsg = elDefault.shadowRoot?.querySelector('.error-message--visible');
    if (!errMsg) throw new Error('エラーが設定されている時はエラーメッセージが表示されるべきです');
  },
};

/**
 * ラベルを視覚的に非表示。
 *
 * `hide-label` を使用すると、ラベルは視覚的に非表示になりますが、
 * スクリーンリーダーには `aria-label` として常に提供されます。
 */
export const HiddenLabel: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 480px;">
      <ui-textarea
        id="hidden-label"
        label="メモ"
        hide-label
        placeholder="ラベルは非表示ですが aria-label は設定されています"
        rows="3"
      ></ui-textarea>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector<Textarea>('#hidden-label');
    if (!el) throw new Error('ui-textareaが見つかりません');
    await el.updateComplete;

    // テスト: label--hidden クラスが付いている
    const label = el.shadowRoot?.querySelector('.label--hidden');
    if (!label) throw new Error('ラベルが label--hidden クラスを持つべきです');

    // テスト: aria-label は設定されている
    const ta = el.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea');
    if (!ta?.getAttribute('aria-label')) {
      throw new Error('ラベルが非表示の時も aria-label が設定されるべきです');
    }
  },
};

// ──────────────────────────────────────────────
// Auto Grow
// ──────────────────────────────────────────────

/**
 * Auto Grow の動作確認。
 *
 * テキストを入力すると高さが即時（0ms）拡張します。
 * `rows=3` が最小高さとして機能します。
 */
export const AutoGrow: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 480px;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0 0); border: 1px solid oklch(90% 0.01 250 / 0.2); border-radius: 6px; font-size: 13px;">
        <strong>操作方法</strong>: テキストを入力すると高さが即時拡張します（Auto Grow）。
      </div>
      <ui-textarea
        id="auto-grow"
        label="Auto Grow テキストエリア"
        auto-grow
        rows="3"
        placeholder="入力すると高さが拡張します..."
      ></ui-textarea>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector<Textarea>('#auto-grow');
    if (!el) throw new Error('ui-textareaが見つかりません');
    await el.updateComplete;

    const ta = el.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea');
    if (!ta) throw new Error('textareaが見つかりません');

    // テスト: 初期高さが rows=3 分確保されている
    const initialHeight = ta.offsetHeight;
    if (initialHeight <= 0) throw new Error('初期の高さが正の数であるべきです');

    // テスト: 値を設定すると高さが拡張する
    el.value = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8';
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 50));

    const expandedHeight = ta.offsetHeight;
    if (expandedHeight <= initialHeight) {
      throw new Error(`高さの拡張を期待していましたが、拡張されていません。初期: ${String(initialHeight)}, 拡張後: ${String(expandedHeight)}`);
    }

    // テスト: 値をクリアすると最小高さ（rows=3）に戻る
    el.value = '';
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 50));

    const collapsedHeight = ta.offsetHeight;
    if (collapsedHeight > expandedHeight) {
      throw new Error('値が空の時は高さが収縮すべきです');
    }
  },
};

/**
 * max-rows による上限制限。
 *
 * `max-rows` を超えた場合のみ内部スクロールが発生します。
 * それ以下では通常の Auto Grow が機能します。
 */
export const MaxRows: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 480px;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0 0); border: 1px solid oklch(90% 0.01 250 / 0.2); border-radius: 6px; font-size: 13px;">
        <strong>操作方法</strong>: 5行を超えると内部スクロールが発生します（max-rows="5"）。
      </div>
      <ui-textarea
        id="max-rows"
        label="最大行数制限（5行）"
        auto-grow
        rows="3"
        max-rows="5"
        placeholder="5行を超えると内部スクロールが発生します..."
      ></ui-textarea>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector<Textarea>('#max-rows');
    if (!el) throw new Error('ui-textareaが見つかりません');
    await el.updateComplete;

    if (el.maxRows !== 5) {
      throw new Error(`maxRows=5 を期待していましたが、実際には ${String(el.maxRows)} でした`);
    }

    const ta = el.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea');
    if (!ta) throw new Error('textareaが見つかりません');

    // テスト: 5行を超えると overflow-scroll クラスが付く
    el.value = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8';
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 50));

    if (!ta.classList.contains('overflow-scroll')) {
      throw new Error('コンテンツが max-rows を超える場合は overflow-scroll クラスを持つべきです');
    }

    // テスト: 5行以内では overflow-scroll クラスが付かない
    el.value = 'Line 1\nLine 2';
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 50));

    if (ta.classList.contains('overflow-scroll')) {
      throw new Error('コンテンツが max-rows 内にある場合は overflow-scroll クラスを持つべきではありません');
    }
  },
};

/**
 * Auto Grow 無効（手動リサイズ）。
 *
 * `auto-grow="false"` + `resize="vertical"` で手動リサイズを許容します。
 */
export const AutoGrowDisabled: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 480px;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>操作方法</strong>: 右下のグリップをドラッグして手動でリサイズできます。
      </div>
      <ui-textarea
        id="auto-grow-disabled"
        label="手動リサイズ"
        .autoGrow="${false}"
        resize="vertical"
        rows="4"
        placeholder="手動でリサイズできます..."
      ></ui-textarea>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector<Textarea>('#auto-grow-disabled');
    if (!el) throw new Error('ui-textareaが見つかりません');
    await el.updateComplete;

    if (el.autoGrow) throw new Error('autoGrow は false であるべきです');
    if (el.resize !== 'vertical') throw new Error(`Expected resize="vertical", got "${el.resize}"`);

    const ta = el.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea');
    if (!ta) throw new Error('textareaが見つかりません');

    // テスト: resize-vertical クラスが付いている
    if (!ta.classList.contains('resize-vertical')) {
      throw new Error('auto-grow=false かつ resize=vertical の時は resize-vertical クラスを持つべきです');
    }
  },
};

// ──────────────────────────────────────────────
// 全状態一覧
// ──────────────────────────────────────────────

/**
 * 全バリアント × 状態の一覧。
 *
 * デザインレビューやビジュアルリグレッションテストに使用します。
 */
export const AllVariantsAndStates: Story = {
  render: () => html`
    <style>
      .showcase {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
        max-width: 900px;
      }
      .showcase-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .showcase-label {
        font-size: 11px;
        font-weight: 500;
        color: oklch(48% 0.01 250);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.25rem;
      }
    </style>

    <div class="showcase">
      <div class="showcase-group">
        <div class="showcase-label">Default / Default</div>
        <ui-textarea id="all-default-default" label="メモ" variant="default" rows="2" placeholder="Default..."></ui-textarea>
      </div>
      <div class="showcase-group">
        <div class="showcase-label">Prose / Default</div>
        <ui-textarea id="all-prose-default" label="本文" variant="prose" rows="2" placeholder="Prose..."></ui-textarea>
      </div>
      <div class="showcase-group">
        <div class="showcase-label">Default / Error</div>
        <ui-textarea id="all-default-error" label="メモ" variant="default" error error-message="エラーが発生しました" rows="2"></ui-textarea>
      </div>
      <div class="showcase-group">
        <div class="showcase-label">Prose / Error</div>
        <ui-textarea id="all-prose-error" label="本文" variant="prose" error error-message="本文は必須です" rows="2"></ui-textarea>
      </div>
      <div class="showcase-group">
        <div class="showcase-label">Default / Disabled</div>
        <ui-textarea id="all-default-disabled" label="メモ" variant="default" disabled value="無効状態" rows="2"></ui-textarea>
      </div>
      <div class="showcase-group">
        <div class="showcase-label">Prose / Disabled</div>
        <ui-textarea id="all-prose-disabled" label="本文" variant="prose" disabled value="無効状態" rows="2"></ui-textarea>
      </div>
      <div class="showcase-group">
        <div class="showcase-label">Default / Readonly</div>
        <ui-textarea id="all-default-readonly" label="メモ" variant="default" readonly value="読み取り専用" rows="2"></ui-textarea>
      </div>
      <div class="showcase-group">
        <div class="showcase-label">Prose / Readonly</div>
        <ui-textarea id="all-prose-readonly" label="本文" variant="prose" readonly value="読み取り専用" rows="2"></ui-textarea>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const elements = canvasElement.querySelectorAll<Textarea>('ui-textarea');
    if (elements.length !== 8) {
      throw new Error(`8つの ui-textarea を期待していましたが、実際には ${String(elements.length)}個でした`);
    }
    await Promise.all([...elements].map((el) => el.updateComplete));

    // テスト: error 状態のものは aria-invalid="true"
    const errorEls = ['#all-default-error', '#all-prose-error'];
    for (const id of errorEls) {
      const el = canvasElement.querySelector<Textarea>(id);
      if (!el) throw new Error(`${id} が見つかりません`);
      const ta = el.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea');
      if (ta?.getAttribute('aria-invalid') !== 'true') {
        throw new Error(`${id}: aria-invalid="true" を期待していましたが false でした`);
      }
    }

    // テスト: disabled 状態のものは disabled
    const disabledEls = ['#all-default-disabled', '#all-prose-disabled'];
    for (const id of disabledEls) {
      const el = canvasElement.querySelector<Textarea>(id);
      if (!el) throw new Error(`${id} が見つかりません`);
      const ta = el.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea');
      if (!ta?.disabled) throw new Error(`${id}: textarea が無効化されていることを期待していましたが、有効になっています`);
    }

    // テスト: readonly 状態のものは readOnly
    const readonlyEls = ['#all-default-readonly', '#all-prose-readonly'];
    for (const id of readonlyEls) {
      const el = canvasElement.querySelector<Textarea>(id);
      if (!el) throw new Error(`${id} が見つかりません`);
      const ta = el.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea');
      if (!ta?.readOnly) throw new Error(`${id}: textarea が読み取り専用であることを期待していましたが、違います`);
    }
  },
};

// ──────────────────────────────────────────────
// インタラクション
// ──────────────────────────────────────────────

/**
 * input / change イベントの発火確認。
 *
 * 入力時に `input` イベント、フォーカスを外した時に `change` イベントが発火します。
 */
export const EventFiring: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <ui-textarea
        id="event-textarea"
        label="イベント確認"
        rows="3"
        placeholder="入力してください..."
      ></ui-textarea>
      <div id="event-log" style="padding: 0.75rem 1rem; background: oklch(97% 0 0); border: 1px solid oklch(90% 0.01 250 / 0.2); border-radius: 6px; font-size: 13px; color: oklch(48% 0.01 250); min-height: 2.5rem;">
        入力するとここに表示されます
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector<Textarea>('#event-textarea');
    if (!el) throw new Error('ui-textareaが見つかりません');
    await el.updateComplete;

    // テスト: input イベントが発火する
    const inputPromise = new Promise<Event>((resolve) => {
      el.addEventListener('input', (e) => { resolve(e); }, { once: true });
    });

    const ta = el.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea');
    if (!ta) throw new Error('textareaが見つかりません');

    ta.value = 'テスト入力';
    ta.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

    const inputEvent = await Promise.race([
      inputPromise,
      new Promise<null>((resolve) => setTimeout(() => { resolve(null); }, 500)),
    ]);

    if (!inputEvent) throw new Error('inputイベントが発火しません');

    // テスト: change イベントが発火する
    const changePromise = new Promise<Event>((resolve) => {
      el.addEventListener('change', (e) => { resolve(e); }, { once: true });
    });

    ta.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

    const changeEvent = await Promise.race([
      changePromise,
      new Promise<null>((resolve) => setTimeout(() => { resolve(null); }, 500)),
    ]);

    if (!changeEvent) throw new Error('changeイベントが発火しません');
  },
};

/**
 * フォーカス / ブラー イベントの確認。
 */
export const FocusBlurEvents: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <ui-textarea
        id="focus-blur-textarea"
        label="フォーカス確認"
        rows="3"
        placeholder="フォーカスを当ててください..."
      ></ui-textarea>
      <div id="focus-log" style="padding: 0.75rem 1rem; background: oklch(97% 0 0); border: 1px solid oklch(90% 0.01 250 / 0.2); border-radius: 6px; font-size: 13px; color: oklch(48% 0.01 250); min-height: 2.5rem;">
        フォーカス状態: 未フォーカス
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector<Textarea>('#focus-blur-textarea');
    if (!el) throw new Error('ui-textarea not found');
    await el.updateComplete;

    // テスト: focus イベントが発火する
    const focusPromise = new Promise<Event>((resolve) => {
      el.addEventListener('focus', (e) => { resolve(e); }, { once: true });
    });

    el.focus();

    const focusEvent = await Promise.race([
      focusPromise,
      new Promise<null>((resolve) => setTimeout(() => { resolve(null); }, 500)),
    ]);

    if (!focusEvent) throw new Error('focus event was not fired');

    // テスト: blur イベントが発火する
    const blurPromise = new Promise<Event>((resolve) => {
      el.addEventListener('blur', (e) => { resolve(e); }, { once: true });
    });

    el.blur();

    const blurEvent = await Promise.race([
      blurPromise,
      new Promise<null>((resolve) => setTimeout(() => { resolve(null); }, 500)),
    ]);

    if (!blurEvent) throw new Error('blur event was not fired');
  },
};

// ──────────────────────────────────────────────
// 境界条件（事故が多い）
// ──────────────────────────────────────────────

/**
 * ⚠️ 境界条件: rows=1（最小行数）。
 *
 * `rows=1` でも正常に動作し、Auto Grow が機能します。
 * 1行未満には縮まないことを保証します。
 */
export const BoundaryRows1: Story = {
  parameters: {
    docs: {
      description: {
        story: '⚠️ **境界条件**: `rows=1` でも正常に動作し、Auto Grow が機能します。1行未満には縮まないことを保証します。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>⚠️ 境界条件</strong>: <code>rows=1</code> — 最小行数。入力すると拡張します。
      </div>
      <ui-textarea
        id="boundary-rows-1"
        label="1行テキストエリア"
        rows="1"
        auto-grow
        placeholder="1行から開始..."
      ></ui-textarea>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector<Textarea>('#boundary-rows-1');
    if (!el) throw new Error('ui-textarea not found');
    await el.updateComplete;

    if (el.rows !== 1) throw new Error(`Expected rows=1, got ${String(el.rows)}`);

    const ta = el.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea');
    if (!ta) throw new Error('textarea not found');

    const initialHeight = ta.offsetHeight;
    if (initialHeight <= 0) throw new Error('Initial height should be positive');

    // テスト: 複数行入力で拡張する
    el.value = 'Line 1\nLine 2\nLine 3';
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 50));

    const expandedHeight = ta.offsetHeight;
    if (expandedHeight <= initialHeight) {
      throw new Error(`Expected height to expand from rows=1. Initial: ${String(initialHeight)}, Expanded: ${String(expandedHeight)}`);
    }
  },
};

/**
 * ⚠️ 境界条件: label が空文字列。
 *
 * `label` が空の場合、コンソールエラーが出力されます。
 * アクセシビリティ上の問題があるため、必ずラベルを設定してください。
 */
export const BoundaryEmptyLabel: Story = {
  parameters: {
    docs: {
      description: {
        story: '⚠️ **境界条件**: `label` が空文字列の場合、コンソールエラーが出力されます。アクセシビリティのため必ずラベルを設定してください。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 28 / 0.3); border: 1px solid oklch(80% 0.1 28 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>⚠️ 境界条件</strong>: <code>label=""</code> — コンソールにエラーが出力されます。
      </div>
      <ui-textarea
        id="boundary-empty-label"
        label=""
        rows="3"
        placeholder="ラベルなし（アクセシビリティ問題）"
      ></ui-textarea>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector<Textarea>('#boundary-empty-label');
    if (!el) throw new Error('ui-textarea not found');

    // コンソールエラーが出力されることを確認（テスト環境では警告のみ）
    el.label = '一時ラベル';
    await el.updateComplete;

    const originalError = console.error;
    let errorCalled = false;
    console.error = (...args: unknown[]) => {
      if (String(args[0]).includes('[ui-textarea]')) {
        errorCalled = true;
      }
      originalError(...args);
    };

    try {
      el.label = '';
      await el.updateComplete;
    } finally {
      console.error = originalError;
    }

    // テスト: コンソールエラーが呼ばれたことを確認する
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!errorCalled) {
      throw new Error('Expected console.error to be called when label is empty');
    }
  },
};

/**
 * ⚠️ 境界条件: error=true だが error-message が空。
 *
 * `error=true` でも `error-message` が空の場合、エラーメッセージは表示されません。
 * ただし `aria-invalid="true"` が設定され、`checkValidity()` は `false` を返します。
 */
export const BoundaryErrorWithoutMessage: Story = {
  parameters: {
    docs: {
      description: {
        story: '⚠️ **境界条件**: `error=true` でも `error-message` が空の場合、エラーメッセージは表示されませんが、`aria-invalid="true"` が適用され、`checkValidity()` は `false` になります。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>⚠️ 境界条件</strong>: <code>error=true</code> + <code>error-message=""</code> — メッセージなしエラー。
      </div>
      <ui-textarea
        id="boundary-error-no-msg"
        label="メモ"
        error
        error-message=""
        rows="3"
        placeholder="エラー状態（メッセージなし）"
      ></ui-textarea>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector<Textarea>('#boundary-error-no-msg');
    if (!el) throw new Error('ui-textarea not found');
    await el.updateComplete;

    const ta = el.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea');
    if (!ta) throw new Error('textarea not found');

    // テスト: aria-invalid="true" は設定される
    if (ta.getAttribute('aria-invalid') !== 'true') {
      throw new Error(`Expected aria-invalid="true", got "${ta.getAttribute('aria-invalid') ?? 'null'}"`);
    }

    // テスト: error クラスは付く
    if (!ta.classList.contains('error')) {
      throw new Error('Expected error class even without error-message');
    }

    // テスト: エラーメッセージ要素は表示されない（visible クラスなし）
    const errMsgVisible = el.shadowRoot?.querySelector('.error-message--visible');
    if (errMsgVisible) {
      throw new Error('Error message should not be visible when error-message is empty');
    }

    // テスト: Validity は必ず invalid
    if (el.checkValidity()) {
      throw new Error('checkValidity() should be false when error=true');
    }
  },
};

/**
 * ⚠️ 境界条件: disabled + error の組み合わせ。
 *
 * `disabled` と `error` が同時に設定された場合、
 * disabled スタイルが優先されますが、エラー状態も保持されます。
 */
export const BoundaryDisabledAndError: Story = {
  parameters: {
    docs: {
      description: {
        story: '⚠️ **境界条件**: `disabled` + `error` の同時設定。disabled スタイルが優先されますが、エラー状態も保持されます。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>⚠️ 境界条件</strong>: <code>disabled</code> + <code>error</code> の同時設定。
      </div>
      <ui-textarea
        id="boundary-disabled-error"
        label="メモ"
        disabled
        error
        error-message="エラーがあります"
        value="無効かつエラー状態"
        rows="3"
      ></ui-textarea>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector<Textarea>('#boundary-disabled-error');
    if (!el) throw new Error('ui-textarea not found');
    await el.updateComplete;

    const ta = el.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea');
    if (!ta) throw new Error('textarea not found');

    // テスト: disabled が設定されている
    if (!ta.disabled) throw new Error('Expected textarea to be disabled');

    // テスト: error クラスも付いている
    if (!ta.classList.contains('error')) {
      throw new Error('Expected error class even when disabled');
    }

    // テスト: aria-invalid="true"
    if (ta.getAttribute('aria-invalid') !== 'true') {
      throw new Error(`Expected aria-invalid="true", got "${ta.getAttribute('aria-invalid') ?? 'null'}"`);
    }
  },
};

/**
 * ⚠️ 境界条件: required バリデーション。
 *
 * `required` 属性が設定された状態で空欄の場合、
 * `checkValidity()` が `false` を返します。
 */
export const BoundaryRequired: Story = {
  parameters: {
    docs: {
      description: {
        story: '⚠️ **境界条件**: `required` 属性。空欄の場合 `checkValidity()` が `false` を返します。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>⚠️ 境界条件</strong>: <code>required</code> — 空欄では無効。
      </div>
      <ui-textarea
        id="boundary-required"
        label="必須メモ"
        required
        help-text="必須項目です"
        rows="3"
      ></ui-textarea>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector<Textarea>('#boundary-required');
    if (!el) throw new Error('ui-textarea not found');
    await el.updateComplete;

    const ta = el.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea');
    if (!ta) throw new Error('textarea not found');

    // テスト: required 属性が設定されている
    if (!ta.required) throw new Error('Expected textarea to have required attribute');

    // テスト: 空欄では checkValidity() が false
    el.value = '';
    await el.updateComplete;
    if (el.checkValidity()) {
      throw new Error('Empty required textarea should be invalid');
    }

    // テスト: 値を入力すると checkValidity() が true
    el.value = 'テスト入力';
    await el.updateComplete;
    if (!el.checkValidity()) {
      throw new Error('Required textarea with value should be valid');
    }
  },
};

/**
 * ⚠️ 境界条件: プログラムによる value の変更と Auto Grow。
 *
 * プログラムで `value` を変更した場合も Auto Grow が正しく動作します。
 * これは `updated()` ライフサイクルで `_updateHeight()` を呼び出すことで保証されます。
 */
export const BoundaryProgrammaticValue: Story = {
  parameters: {
    docs: {
      description: {
        story: '⚠️ **境界条件**: プログラムによる `value` 変更時も Auto Grow が正しく動作します。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>⚠️ 境界条件</strong>: プログラムによる <code>value</code> 変更時の Auto Grow。
      </div>
      <ui-textarea
        id="boundary-programmatic"
        label="プログラム変更テスト"
        auto-grow
        rows="3"
      ></ui-textarea>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector<Textarea>('#boundary-programmatic');
    if (!el) throw new Error('ui-textarea not found');
    await el.updateComplete;

    const ta = el.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea');
    if (!ta) throw new Error('textarea not found');

    const initialHeight = ta.offsetHeight;

    // テスト: プログラムで長い値を設定すると高さが拡張する
    el.value = Array.from({ length: 10 }, (_, i) => `Line ${String(i + 1)}`).join('\n');
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 50));

    const expandedHeight = ta.offsetHeight;
    if (expandedHeight <= initialHeight) {
      throw new Error(`Expected height to expand. Initial: ${String(initialHeight)}, Expanded: ${String(expandedHeight)}`);
    }

    // テスト: プログラムで空にすると最小高さに戻る
    el.value = '';
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 50));

    const collapsedHeight = ta.offsetHeight;
    if (collapsedHeight >= expandedHeight) {
      throw new Error('Height should collapse when value is cleared programmatically');
    }
  },
};

/**
 * ⚠️ 境界条件: rows と max-rows の逆転指定。
 *
 * 利用側責務として値はそのまま受け取り、コンポーネントは clamp しません。
 */
export const BoundaryRowsMaxRowsInversion: Story = {
  parameters: {
    docs: {
      description: {
        story: '⚠️ **境界条件**: `rows=6` と `max-rows=3` のような逆転指定も利用側責務として受け入れ、コンポーネント側で clamp しません。',
      },
    },
  },
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 480px;">
      <div style="padding: 0.75rem 1rem; background: oklch(97% 0.01 80 / 0.3); border: 1px solid oklch(80% 0.05 80 / 0.4); border-radius: 6px; font-size: 13px;">
        <strong>⚠️ 境界条件</strong>: <code>rows=6</code> + <code>max-rows=3</code>（逆転指定）
      </div>
      <ui-textarea
        id="boundary-rows-maxrows-inversion"
        label="逆転指定テスト"
        rows="6"
        max-rows="3"
        auto-grow
      ></ui-textarea>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector<Textarea>('#boundary-rows-maxrows-inversion');
    if (!el) throw new Error('ui-textarea not found');
    await el.updateComplete;

    if (el.rows !== 6) throw new Error(`Expected rows=6, got ${String(el.rows)}`);
    if (el.maxRows !== 3) throw new Error(`Expected maxRows=3, got ${String(el.maxRows)}`);
  },
};

/**
 * ダークモード相当トークンでの表示確認。
 */
export const DarkModePreview: Story = {
  parameters: {
    docs: {
      description: {
        story: 'ダークモード相当のトークン上書き環境で表示崩れがないことを確認します。',
      },
    },
  },
  render: () => html`
    <div
      style="
        --bg-fill-muted: oklch(25% 0.01 250);
        --bg-default: oklch(20% 0.01 250);
        --fg-default: oklch(92% 0.01 250);
        --fg-muted: oklch(75% 0.01 250);
        --border-default: oklch(45% 0.01 250);
        --focus-ring-color: oklch(75% 0.12 250);
        background: oklch(17% 0.01 250);
        padding: 1rem;
        border-radius: 8px;
      "
    >
      <ui-textarea
        id="dark-mode-preview"
        label="ダークモード確認"
        help-text="ダークトークン上書き環境"
        rows="3"
        value="Dark mode preview"
      ></ui-textarea>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector<Textarea>('#dark-mode-preview');
    if (!el) throw new Error('ui-textarea not found');
    await el.updateComplete;

    const ta = el.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea');
    if (!ta) throw new Error('textarea not found');
    if (ta.getAttribute('aria-label') !== 'ダークモード確認') {
      throw new Error('aria-label should be set in dark mode preview');
    }
  },
};

/**
 * Forced Colors でのフォールバック確認。
 */
export const ForcedColorsPreview: Story = {
  parameters: {
    docs: {
      description: {
        story: '`@media (forced-colors: active)` のフォールバック定義を前提に、エラー・無効状態の構造が維持されることを確認します。',
      },
    },
  },
  render: () => html`
    <div style="display: grid; gap: 1rem; max-width: 480px;">
      <ui-textarea
        id="forced-colors-error"
        label="強制カラー確認（エラー）"
        error
        error-message="エラー表示"
        rows="3"
      ></ui-textarea>
      <ui-textarea
        id="forced-colors-disabled"
        label="強制カラー確認（無効）"
        disabled
        value="Disabled"
        rows="3"
      ></ui-textarea>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const errorEl = canvasElement.querySelector<Textarea>('#forced-colors-error');
    const disabledEl = canvasElement.querySelector<Textarea>('#forced-colors-disabled');
    if (!errorEl || !disabledEl) throw new Error('ui-textarea not found');
    await Promise.all([errorEl.updateComplete, disabledEl.updateComplete]);

    const errorTa = errorEl.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea');
    const disabledTa = disabledEl.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea');
    if (!errorTa || !disabledTa) throw new Error('textarea not found');

    if (errorTa.getAttribute('aria-invalid') !== 'true') throw new Error('Error textarea should be invalid');
    if (!disabledTa.disabled) throw new Error('Disabled textarea should remain disabled');
  },
};

/**
 * Reduced Motion での遷移短縮確認。
 */
export const ReducedMotionPreview: Story = {
  parameters: {
    docs: {
      description: {
        story: 'reduced motion 相当として `--duration-fast: 0.01ms` と `--animation-focus: none` を適用した表示を確認します。',
      },
    },
  },
  render: () => html`
    <div style="--duration-fast: 0.01ms; --animation-focus: none; max-width: 480px;">
      <ui-textarea
        id="reduced-motion-preview"
        label="Reduced Motion 確認"
        rows="3"
        value="Motion reduced"
      ></ui-textarea>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector<Textarea>('#reduced-motion-preview');
    if (!el) throw new Error('ui-textarea not found');
    await el.updateComplete;

    const ta = el.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea');
    if (!ta) throw new Error('textarea not found');

    const style = getComputedStyle(ta);
    // 0.01ms はブラウザによって "0.01ms" / "0.00001s" / "1e-05s" と表記が異なる
    const isReducedDuration = (v: string) =>
      v.includes('0.01ms') || v.includes('0.00001s') || v.includes('1e-05s');
    if (!isReducedDuration(style.transitionDuration)) {
      throw new Error(`Expected reduced transition duration, got "${style.transitionDuration}"`);
    }
  },
};

/**
 * 印刷時スタイルの確認用ストーリー。
 */
export const PrintPreview: Story = {
  parameters: {
    docs: {
      description: {
        story: '印刷プレビュー時の可読性確認用。背景除去・ボーダー維持・値の可読性を確認します。',
      },
    },
  },
  render: () => html`
    <div style="display: grid; gap: 1rem; max-width: 480px;">
      <ui-textarea
        id="print-preview-default"
        label="印刷確認"
        value="印刷時も読みやすい本文"
        rows="3"
      ></ui-textarea>
      <ui-textarea
        id="print-preview-error"
        label="印刷確認（エラー）"
        error
        error-message="エラー表示"
        value="エラー状態の本文"
        rows="3"
      ></ui-textarea>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const defaultEl = canvasElement.querySelector<Textarea>('#print-preview-default');
    const errorEl = canvasElement.querySelector<Textarea>('#print-preview-error');
    if (!defaultEl || !errorEl) throw new Error('ui-textarea not found');
    await Promise.all([defaultEl.updateComplete, errorEl.updateComplete]);

    const defaultTa = defaultEl.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea');
    const errorTa = errorEl.shadowRoot?.querySelector<HTMLTextAreaElement>('textarea');
    if (!defaultTa || !errorTa) throw new Error('textarea not found');

    if (defaultTa.value !== '印刷時も読みやすい本文') throw new Error('Default print value mismatch');
    if (errorTa.getAttribute('aria-invalid') !== 'true') throw new Error('Error print textarea should be invalid');
  },
};
