import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, userEvent, fn } from 'storybook/test';
import './input.ts';

const meta: Meta = {
  title: 'Components/UiInput',
  component: 'ui-input',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['outlined', 'filled', 'standard'],
      description: 'インプットのスタイルバリアント',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'インプットのサイズ',
    },
    label: {
      control: 'text',
      description: 'ラベルテキスト',
    },
    caption: {
      control: 'text',
      description: 'ラベル下の補足説明（キャプション）',
    },
    placeholder: {
      control: 'text',
      description: 'プレースホルダー',
    },
    helpText: {
      control: 'text',
      description: '補足説明テキスト（入力フィールド下）',
    },
    value: {
      control: 'text',
      description: '入力値',
    },
    error: {
      control: 'boolean',
      description: 'エラー状態',
    },
    errorText: {
      control: 'text',
      description: 'エラーメッセージ',
    },
    disabled: {
      control: 'boolean',
      description: '無効状態',
    },
    readonly: {
      control: 'boolean',
      description: '読み取り専用',
    },
    required: {
      control: 'boolean',
      description: '必須項目',
    },
    type: {
      control: 'select',
      options: ['text', 'password', 'email', 'number', 'tel', 'url', 'search'],
      description: 'インプットタイプ',
    },
    onInput: { action: 'input' },
    onChange: { action: 'change' },
    onFocus: { action: 'focus' },
    onBlur: { action: 'blur' },
  },
};
export default meta;

type Story = StoryObj;

/**
 * 基本的なインプット表示 (Outlined)
 */
export const Primary: Story = {
  args: {
    variant: 'outlined',
    size: 'md',
    label: 'メールアドレス',
    placeholder: 'example@example.com',
    type: 'email',
  },
  render: (args) => html`
    <ui-input
      variant="${args['variant']}"
      size="${args['size']}"
      label="${args['label']}"
      placeholder="${args['placeholder']}"
      type="${args['type']}"
    ></ui-input>
  `,
};

/**
 * バリアント（Outlined, Filled, Standard）
 */
export const Variants: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 400px;">
      <ui-input variant="outlined" label="Outlined" placeholder="デフォルトスタイル"></ui-input>
      <ui-input variant="filled" label="Filled" placeholder="背景色で強調"></ui-input>
      <ui-input variant="standard" label="Standard" placeholder="下線のみ"></ui-input>
    </div>
  `,
};

/**
 * サイズバリエーション
 */
export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 400px;">
      <ui-input size="sm" label="Small" placeholder="小さいインプット"></ui-input>
      <ui-input size="md" label="Medium" placeholder="標準サイズ"></ui-input>
      <ui-input size="lg" label="Large" placeholder="大きいインプット"></ui-input>
    </div>
  `,
};

/**
 * 状態（Disabled, Readonly, Error）
 */
export const States: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 400px;">
      <ui-input label="通常" placeholder="入力できます"></ui-input>
      <ui-input label="無効" placeholder="入力できません" disabled></ui-input>
      <ui-input label="読み取り専用" value="変更できません" readonly></ui-input>
      <ui-input label="エラー" placeholder="入力してください" error errorText="この項目は必須です"></ui-input>
    </div>
  `,
};

/**
 * ヘルパーテキスト
 */
export const WithHelperText: Story = {
  args: {
    label: 'パスワード',
    type: 'password',
    helpText: '8文字以上、大文字・小文字・数字を含めてください',
  },
  render: (args) => html`
    <ui-input
      label="${args['label']}"
      type="${args['type']}"
      helperText="${args['helpText']}"
      style="max-width: 400px;"
    ></ui-input>
  `,
};

/**
 * キャプション付き
 */
export const WithCaption: Story = {
  args: {
    label: 'メールアドレス',
    type: 'email',
    caption: '確認メールをお送りしますので正確に入力してください。',
    placeholder: 'example@example.com',
  },
  render: (args) => html`
    <ui-input
      label="${args['label']}"
      caption="${args['caption']}"
      type="${args['type']}"
      placeholder="${args['placeholder']}"
      style="max-width: 400px;"
    ></ui-input>
  `,
};

/**
 * 必須項目
 */
export const Required: Story = {
  args: {
    label: 'ユーザー名',
    placeholder: '必須項目',
    required: true,
  },
  render: (args) => html`
    <ui-input
      label="${args['label']}"
      placeholder="${args['placeholder']}"
      ?required="${args['required']}"
      style="max-width: 400px;"
    ></ui-input>
  `,
};

/**
 * Prefix / Suffix スロット
 */
export const WithPrefixSuffix: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 400px;">
      <ui-input label="検索" placeholder="キーワードを入力">
        <span slot="prefix">🔍</span>
      </ui-input>
      
      <ui-input label="金額" placeholder="0" type="number">
        <span slot="suffix">円</span>
      </ui-input>
      
      <ui-input label="URL" placeholder="https://" type="url">
        <span slot="prefix">🌐</span>
        <span slot="suffix">.com</span>
      </ui-input>
    </div>
  `,
};

/**
 * パスワード入力
 */
export const Password: Story = {
  args: {
    label: 'パスワード',
    type: 'password',
    placeholder: '8文字以上',
    required: true,
    helpText: '英数字を組み合わせてください',
  },
  render: (args) => html`
    <ui-input
      label="${args['label']}"
      type="${args['type']}"
      placeholder="${args['placeholder']}"
      ?required="${args['required']}"
      help-text="${args['helpText']}"
      style="max-width: 400px;"
    ></ui-input>
  `,
};

/**
 * BDD シナリオテスト: 基本的な入力操作
 */
export const BDD_BasicInput: Story = {
  args: {
    onInput: fn(),
    onChange: fn(),
  },
  render: (args) => html`
    <ui-input
      label="テスト用インプット"
      placeholder="文字を入力してください"
      @input="${args['onInput']}"
      @change="${args['onChange']}"
    ></ui-input>
  `,
  play: async ({ canvasElement, args }) => {
    // 1. 要素の取得
    const input = canvasElement.querySelector('ui-input') as HTMLElement;
    // Shadow DOM 内の native input を取得
    const nativeInput = input?.shadowRoot?.querySelector('.native-input') as HTMLInputElement;
    
    await expect(input).toBeInTheDocument();
    await expect(nativeInput).toBeInTheDocument();
    
    // 2. ラベルの確認
    const label = input?.shadowRoot?.querySelector('label');
    await expect(label).toHaveTextContent('テスト用インプット');
    
    // 3. 入力操作
    await userEvent.type(nativeInput, 'Hello');
    
    // 4. input イベントの発火確認
    await expect(args['onInput']).toHaveBeenCalled();
    
    // 5. 入力値の確認
    await expect(nativeInput.value).toBe('Hello');
    
    // 6. フォーカスを外して change イベント確認
    await userEvent.tab();
    await expect(args['onChange']).toHaveBeenCalled();
  },
};

/**
 * BDD シナリオテスト: エラー状態の検証
 */
export const BDD_ErrorValidation: Story = {
  render: () => html`
    <ui-input
      label="メールアドレス"
      type="email"
      required
      error
      errorText="メールアドレスが必須です"
    ></ui-input>
  `,
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector('ui-input') as HTMLElement;
    const nativeInput = input?.shadowRoot?.querySelector('.native-input') as HTMLInputElement;
    
    // 1. error 属性の確認
    await expect(input.hasAttribute('error')).toBe(true);
    
    // 2. aria-invalid の確認
    await expect(nativeInput.getAttribute('aria-invalid')).toBe('true');
    
    // 3. required 属性の確認
    await expect(nativeInput.hasAttribute('required')).toBe(true);
  },
};

/**
 * BDD シナリオテスト: Disabled 状態
 */
export const BDD_DisabledState: Story = {
  render: () => html`
    <ui-input
      label="無効なインプット"
      placeholder="入力できません"
      disabled
    ></ui-input>
  `,
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector('ui-input') as HTMLElement;
    const nativeInput = input?.shadowRoot?.querySelector('.native-input') as HTMLInputElement;
    
    // 1. disabled 属性の確認
    await expect(input.hasAttribute('disabled')).toBe(true);
    await expect(nativeInput.hasAttribute('disabled')).toBe(true);
    
    // 2. 入力を試みる（入力されないことを確認）
    await userEvent.type(nativeInput, 'Test');
    await expect(nativeInput.value).toBe(''); // 入力されない
  },
};

/**
 * BDD シナリオテスト: Readonly 状態
 */
export const BDD_ReadonlyState: Story = {
  render: () => html`
    <ui-input
      label="読み取り専用インプット"
      value="Test Value"
      readonly
    ></ui-input>
  `,
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector('ui-input') as HTMLElement;
    const nativeInput = input?.shadowRoot?.querySelector('.native-input') as HTMLInputElement;
    
    // 1. readonly 属性の確認
    await expect(input.hasAttribute('readonly')).toBe(true);
    await expect(nativeInput.hasAttribute('readonly')).toBe(true);
    
    // 2. 値が表示されていることを確認
    await expect(nativeInput.value).toBe('Test Value');
    
    // 3. 入力を試みる（入力されないことを確認）
    await userEvent.type(nativeInput, 'New');
    await expect(nativeInput.value).toBe('Test Value'); // 変更されない
  },
};

/**
 * BDD シナリオテスト: フォーカス管理
 */
export const BDD_FocusManagement: Story = {
  args: {
    onFocus: fn(),
    onBlur: fn(),
  },
  render: (args) => html`
    <ui-input
      label="フォーカステスト"
      @focus="${args['onFocus']}"
      @blur="${args['onBlur']}"
    ></ui-input>
  `,
  play: async ({ canvasElement, args }) => {
    const input = canvasElement.querySelector('ui-input') as HTMLElement;
    const nativeInput = input?.shadowRoot?.querySelector('.native-input') as HTMLInputElement;
    
    // 1. フォーカス
    nativeInput.focus();
    await expect(args['onFocus']).toHaveBeenCalledTimes(1);
    
    // 2. ブラー
    nativeInput.blur();
    await expect(args['onBlur']).toHaveBeenCalledTimes(1);
  },
};
