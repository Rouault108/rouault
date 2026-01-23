import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, userEvent, within } from 'storybook/test';
import './textarea.ts';

const meta: Meta = {
  title: 'Components/UiTextarea',
  component: 'ui-textarea',
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'ラベルテキスト',
    },
    placeholder: {
      control: 'text',
      description: 'プレースホルダー',
    },
    disabled: {
      control: 'boolean',
      description: '無効状態',
    },
    invalid: {
      control: 'boolean',
      description: 'バリデーションエラー状態',
    },
    resize: {
      control: 'select',
      options: ['none', 'vertical', 'horizontal', 'both'],
      description: 'リサイズ方向',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'テキストエリアのサイズ',
    },
    variant: {
      control: 'select',
      options: ['outlined', 'filled', 'standard'],
      description: 'スタイルバリアント',
    },
    rows: {
      control: 'number',
      description: '行数（初期の高さ）',
    },
    name: {
      control: 'text',
      description: 'フォームフィールド名',
    },
    onInput: { action: 'input' },
  },
};
export default meta;

type Story = StoryObj;

// ========================================
// 共通定数
// ========================================

/**
 * 共通のコンテナスタイル
 */
const CONTAINER_STYLES = {
  flex: 'display: flex; gap: 1rem; align-items: flex-start; flex-wrap: wrap;',
  vertical: 'display: flex; flex-direction: column; gap: 1.5rem;',
} as const;

// ========================================
// 基本ストーリー
// ========================================

/**
 * 基本的なテキストエリア
 */
export const Default: Story = {
  args: {
    label: 'メモ',
    placeholder: 'ここに入力してください...',
    size: 'md',
    variant: 'outlined',
    resize: 'vertical',
    rows: 4,
    name: 'memo',
  },
  render: (args) => html`
    <ui-textarea
      label="${args['label']}"
      placeholder="${args['placeholder'] || ''}"
      ?disabled="${args['disabled']}"
      ?invalid="${args['invalid']}"
      size="${args['size']}"
      variant="${args['variant']}"
      resize="${args['resize']}"
      rows="${args['rows'] || 4}"
      name="${args['name'] || 'textarea-name'}"
    ></ui-textarea>
  `,
};

// ========================================
// バリアントバリエーション
// ========================================

/**
 * Outlined バリアント
 */
export const Outlined: Story = {
  args: {
    label: 'コメント',
    placeholder: 'Outlined バリアント',
    variant: 'outlined',
    name: 'comment-outlined',
  },
  render: (args) => html`
    <ui-textarea
      label="${args['label']}"
      placeholder="${args['placeholder']}"
      variant="${args['variant']}"
      name="${args['name']}"
    ></ui-textarea>
  `,
};

/**
 * Filled バリアント
 */
export const Filled: Story = {
  args: {
    label: 'コメント',
    placeholder: 'Filled バリアント',
    variant: 'filled',
    name: 'comment-filled',
  },
  render: (args) => html`
    <ui-textarea
      label="${args['label']}"
      placeholder="${args['placeholder']}"
      variant="${args['variant']}"
      name="${args['name']}"
    ></ui-textarea>
  `,
};

/**
 * Standard バリアント
 */
export const Standard: Story = {
  args: {
    label: 'コメント',
    placeholder: 'Standard バリアント',
    variant: 'standard',
    name: 'comment-standard',
  },
  render: (args) => html`
    <ui-textarea
      label="${args['label']}"
      placeholder="${args['placeholder']}"
      variant="${args['variant']}"
      name="${args['name']}"
    ></ui-textarea>
  `,
};

/**
 * 全バリアントのショーケース
 */
export const AllVariants: Story = {
  render: () => html`
    <div style="${CONTAINER_STYLES.vertical}">
      <ui-textarea label="Outlined" placeholder="Outlined バリアント" variant="outlined" name="variant-outlined"></ui-textarea>
      <ui-textarea label="Filled" placeholder="Filled バリアント" variant="filled" name="variant-filled"></ui-textarea>
      <ui-textarea label="Standard" placeholder="Standard バリアント" variant="standard" name="variant-standard"></ui-textarea>
    </div>
  `,
};

// ========================================
// サイズバリエーション
// ========================================

/**
 * Small サイズ
 */
export const Small: Story = {
  args: {
    label: 'メモ (Small)',
    size: 'sm',
    name: 'size-sm',
  },
  render: (args) => html`
    <ui-textarea
      label="${args['label']}"
      size="${args['size']}"
      name="${args['name']}"
    ></ui-textarea>
  `,
};

/**
 * Medium サイズ
 */
export const Medium: Story = {
  args: {
    label: 'メモ (Medium)',
    size: 'md',
    name: 'size-md',
  },
  render: (args) => html`
    <ui-textarea
      label="${args['label']}"
      size="${args['size']}"
      name="${args['name']}"
    ></ui-textarea>
  `,
};

/**
 * Large サイズ
 */
export const Large: Story = {
  args: {
    label: 'メモ (Large)',
    size: 'lg',
    name: 'size-lg',
  },
  render: (args) => html`
    <ui-textarea
      label="${args['label']}"
      size="${args['size']}"
      name="${args['name']}"
    ></ui-textarea>
  `,
};

/**
 * 全サイズのショーケース
 */
export const AllSizes: Story = {
  render: () => html`
    <div style="${CONTAINER_STYLES.vertical}">
      <ui-textarea label="Small" size="sm" name="all-sizes-sm" rows="3"></ui-textarea>
      <ui-textarea label="Medium" size="md" name="all-sizes-md" rows="4"></ui-textarea>
      <ui-textarea label="Large" size="lg" name="all-sizes-lg" rows="5"></ui-textarea>
    </div>
  `,
};

// ========================================
// リサイズバリエーション
// ========================================

/**
 * リサイズなし
 */
export const ResizeNone: Story = {
  args: {
    label: 'リサイズ不可',
    resize: 'none',
    name: 'resize-none',
  },
  render: (args) => html`
    <ui-textarea
      label="${args['label']}"
      resize="${args['resize']}"
      name="${args['name']}"
    ></ui-textarea>
  `,
};

/**
 * 垂直リサイズ
 */
export const ResizeVertical: Story = {
  args: {
    label: '垂直リサイズ可能',
    resize: 'vertical',
    name: 'resize-vertical',
  },
  render: (args) => html`
    <ui-textarea
      label="${args['label']}"
      resize="${args['resize']}"
      name="${args['name']}"
    ></ui-textarea>
  `,
};

/**
 * 全リサイズのショーケース
 */
export const AllResizeOptions: Story = {
  render: () => html`
    <div style="${CONTAINER_STYLES.vertical}">
      <ui-textarea label="リサイズ不可" resize="none" name="resize-showcase-none"></ui-textarea>
      <ui-textarea label="垂直リサイズ" resize="vertical" name="resize-showcase-vertical"></ui-textarea>
      <ui-textarea label="水平リサイズ" resize="horizontal" name="resize-showcase-horizontal"></ui-textarea>
      <ui-textarea label="両方向リサイズ" resize="both" name="resize-showcase-both"></ui-textarea>
    </div>
  `,
};

// ========================================
// 状態バリエーション
// ========================================

/**
 * 無効状態
 */
export const Disabled: Story = {
  args: {
    label: '無効なテキストエリア',
    disabled: true,
    name: 'disabled-textarea',
  },
  render: (args) => html`
    <ui-textarea
      label="${args['label']}"
      ?disabled="${args['disabled']}"
      name="${args['name']}"
      value="編集できません"
    ></ui-textarea>
  `,
};

/**
 * エラー状態
 */
export const Invalid: Story = {
  args: {
    label: 'コメント（必須）',
    invalid: true,
    name: 'invalid-textarea',
  },
  render: (args) => html`
    <ui-textarea
      label="${args['label']}"
      ?invalid="${args['invalid']}"
      name="${args['name']}"
    ></ui-textarea>
  `,
};

/**
 * 全状態のショーケース
 */
export const AllStates: Story = {
  render: () => html`
    <div style="${CONTAINER_STYLES.vertical}">
      <ui-textarea label="通常" name="state-normal"></ui-textarea>
      <ui-textarea label="無効" disabled name="state-disabled" value="無効な状態"></ui-textarea>
      <ui-textarea label="エラー" invalid name="state-invalid"></ui-textarea>
    </div>
  `,
};

// ========================================
// 実用例
// ========================================

/**
 * フォームでの使用例
 */
export const FormExample: Story = {
  render: () => html`
    <form style="max-width: 600px;">
      <fieldset style="border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-4);">
        <legend style="font-weight: var(--font-semibold); padding: 0 var(--space-2);">フィードバック</legend>
        <div style="${CONTAINER_STYLES.vertical}">
          <ui-textarea
            label="コメント"
            placeholder="ご意見をお聞かせください..."
            name="feedback"
            rows="5"
            variant="outlined"
          ></ui-textarea>
          <ui-textarea
            label="改善提案"
            placeholder="改善したい点があればご記入ください..."
            name="suggestions"
            rows="4"
            variant="filled"
          ></ui-textarea>
        </div>
      </fieldset>
    </form>
  `,
};

// ========================================
// ダークモード
// ========================================

/**
 * ダークモード
 */
export const DarkMode: Story = {
  parameters: {
    backgrounds: { default: 'dark' },
  },
  decorators: [
    (story) => html`
      <div data-theme="dark" style="padding: 1rem; background: var(--color-background); color: var(--color-foreground);">
        ${story()}
      </div>
    `,
  ],
  render: () => html`
    <div style="${CONTAINER_STYLES.vertical}">
      <ui-textarea label="Outlined" placeholder="Outlined バリアント" variant="outlined" name="dark-outlined"></ui-textarea>
      <ui-textarea label="Filled" placeholder="Filled バリアント" variant="filled" name="dark-filled"></ui-textarea>
      <ui-textarea label="Standard" placeholder="Standard バリアント" variant="standard" name="dark-standard"></ui-textarea>
      <ui-textarea label="Disabled" disabled name="dark-disabled" value="無効な状態"></ui-textarea>
      <ui-textarea label="Invalid" invalid name="dark-invalid"></ui-textarea>
    </div>
  `,
};

// ========================================
// BDD テストストーリー
// ========================================

/**
 * BDD: 基本的なレンダリング
 */
export const BDD_BasicRendering: Story = {
  tags: ['test'],
  render: () => html`
    <ui-textarea data-testid="basic-textarea" label="テストテキストエリア" name="test"></ui-textarea>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const textarea = canvas.getByTestId('basic-textarea') as HTMLElement;

    // テキストエリアが正しくレンダリングされている
    await expect(textarea).toBeInTheDocument();
    
    // ラベルが表示されている
    const label = textarea.shadowRoot?.querySelector('.label');
    await expect(label?.textContent?.trim()).toBe('テストテキストエリア');
  },
};

/**
 * BDD: テキスト入力
 */
export const BDD_TextInput: Story = {
  tags: ['test'],
  render: () => html`
    <ui-textarea data-testid="input-textarea" label="入力テスト" name="input-test"></ui-textarea>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const textareaElement = canvas.getByTestId('input-textarea') as HTMLElement;
    const textarea = textareaElement.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement;

    // 初期値は空
    await expect(textarea.value).toBe('');

    // テキストを入力
    await userEvent.type(textarea, 'Hello World');
    await expect(textarea.value).toBe('Hello World');
  },
};

/**
 * BDD: 無効状態のインタラクション防止
 */
export const BDD_DisabledState: Story = {
  tags: ['test'],
  render: () => html`
    <ui-textarea data-testid="disabled-textarea" label="無効なテキストエリア" disabled name="disabled-test"></ui-textarea>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const textareaElement = canvas.getByTestId('disabled-textarea') as HTMLElement;

    // disabled 属性が設定されている
    await expect(textareaElement).toHaveAttribute('disabled');

    // Shadow Root 内の textarea 要素も disabled
    const textarea = textareaElement.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement;
    await expect(textarea.disabled).toBe(true);
  },
};

/**
 * BDD: フォーカス状態
 */
export const BDD_FocusState: Story = {
  tags: ['test'],
  render: () => html`
    <ui-textarea data-testid="focus-textarea" label="フォーカステスト" name="focus-test"></ui-textarea>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const textareaElement = canvas.getByTestId('focus-textarea') as HTMLElement;
    const textarea = textareaElement.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement;

    // フォーカスを当てる
    textarea.focus();
    
    // フォーカスされているか確認
    await expect(document.activeElement).toBe(textareaElement);
    await expect(textareaElement.shadowRoot?.activeElement).toBe(textarea);
  },
};

/**
 * BDD: フォーム統合
 */
export const BDD_FormIntegration: Story = {
  tags: ['test'],
  render: () => html`
    <form data-testid="test-form">
      <ui-textarea
        data-testid="form-textarea"
        label="コメント"
        name="comment"
        value="初期値"
      ></ui-textarea>
    </form>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const textareaElement = canvas.getByTestId('form-textarea') as HTMLElement;
    const textarea = textareaElement.shadowRoot?.querySelector('textarea') as HTMLTextAreaElement;

    // name 属性が設定されている
    await expect(textareaElement).toHaveAttribute('name', 'comment');

    // 初期値が反映されている
    await expect(textarea.value).toBe('初期値');
  },
};
