import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './input';
import type { Input } from './input';
import '../button/button';

/**
 * ## 入力フィールド (Input)
 * 
 * 思考を妨げない「透明な」入力インターフェースを提供します。
 * Universal Clarity（入力領域の明示）とContextual Feedback（近接したエラー表示）を実現します。
 * 
 * ### デザイン哲学
 * 
 * - **役割**: 思考を妨げない「透明な」入力インターフェース
 * - **Universal Clarity**: 入力待機時には `--bg-fill-muted` によって領域を静かに明示し、「どこに入力できるか」を迷わせません
 * - **Contextual Feedback**: バリデーションエラーやヘルプテキストは、視線の移動を最小限に抑えるため、入力フィールドに近接して表示
 * - **Clear Canvas**: フォーカス時は「紙」のような白地に戻し、執筆に集中させます
 * 
 * ### 状態遷移
 * 
 * 1. **Default**: 背景色で領域を明示（Discoverability）
 * 2. **Hover**: ボーダーを表示し、入力可能領域のエッジをフィードバック（Tactility）
 * 3. **Focus**: 白地に戻し、執筆に集中（Clear Canvas）。フォーカスリングで明確化（Adaptive Focus）
 * 4. **Error**: ボーダー+背景色の変化で色覚多様性に配慮
 * 
 * ### 使用上の注意
 * 
 * - **ラベルは必須**: アクセシビリティのため、`label` 属性は必ず設定してください
 * - **Help TextとError Messageは排他的**: エラー状態の場合、Help Textは非表示になります
 * - **未サポートのtype**: `date`, `time`, `file`, `checkbox`, `radio` 等は専用コンポーネントで対応します
 */
const meta: Meta<Input> = {
  title: 'Components/Input',
  component: 'ui-input',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
入力フィールドコンポーネントは、思考を妨げない「透明な」入力インターフェースを提供します。

## 使用方法

\`\`\`html
<!-- 基本的な使用 -->
<ui-input label="メールアドレス" type="email" name="email"></ui-input>

<!-- ヘルプテキスト付き -->
<ui-input 
  label="パスワード" 
  type="password" 
  help-text="8文字以上で入力してください"
></ui-input>

<!-- エラー状態 -->
<ui-input 
  label="ユーザー名" 
  error 
  error-message="このユーザー名は既に使用されています"
></ui-input>

<!-- ラベルを視覚的に非表示（検索フィールド等） -->
<ui-input 
  label="検索" 
  hide-label 
  type="search" 
  placeholder="検索..."
></ui-input>
\`\`\`

## 注意事項

- **ラベルは必須**: アクセシビリティのため、\`label\` 属性は必ず設定してください。視覚的に非表示にする場合は \`hide-label\` を使用します。
- **Help TextとError Messageは排他的**: エラー状態（\`error=true\`）の場合、Help Textは非表示となり、Error Messageのみが表示されます。
- **未サポートのtype**: \`date\`, \`time\`, \`file\`, \`checkbox\`, \`radio\` 等は専用コンポーネントで対応します。未定義のtypeが渡された場合は \`text\` にフォールバックし、開発時にコンソール警告を出力します。
        `,
      },
    },
  },
  argTypes: {
    label: {
      control: 'text',
      description: '入力項目のラベル（必須）',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: '' },
      },
    },
    hideLabel: {
      control: 'boolean',
      description: 'ラベルを視覚的に非表示（スクリーンリーダーには残る）',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url', 'search'],
      description: '入力フィールドのタイプ',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'text' },
      },
    },
    name: {
      control: 'text',
      description: 'フォーム送信時のフィールド名',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: '' },
      },
    },
    placeholder: {
      control: 'text',
      description: 'ヒントテキスト',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: '' },
      },
    },
    value: {
      control: 'text',
      description: '入力値',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: '' },
      },
    },
    helpText: {
      control: 'text',
      description: '補助テキスト',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: '' },
      },
    },
    errorMessage: {
      control: 'text',
      description: 'エラーメッセージ',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: '' },
      },
    },
    error: {
      control: 'boolean',
      description: 'エラー状態の強制',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    disabled: {
      control: 'boolean',
      description: '操作無効化',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    readonly: {
      control: 'boolean',
      description: '読み取り専用モード',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    required: {
      control: 'boolean',
      description: '必須フィールド',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<Input>;

/**
 * デフォルトの入力フィールド。
 * 
 * 基本的な使用例です。ラベルとプレースホルダーを設定します。
 */
export const Default: Story = {
  args: {
    label: 'メールアドレス',
    type: 'email',
    name: 'email',
    placeholder: 'example@example.com',
  },
  render: (args) => html`
    <ui-input
      label="${args.label}"
      type="${args.type}"
      name="${args.name}"
      placeholder="${args.placeholder}"
      value="${args.value || ''}"
      ?disabled="${args.disabled}"
      ?readonly="${args.readonly}"
      ?required="${args.required}"
      ?error="${args.error}"
    ></ui-input>
  `,
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector('ui-input');
    if (!input) {
      throw new Error('Input component not found');
    }

    await input.updateComplete;

    const inputElement = input.shadowRoot?.querySelector('input');
    if (!inputElement) {
      throw new Error('Input element not found in shadow root');
    }

    // テスト: デフォルトのtype属性が設定されていること
    if (inputElement.getAttribute('type') !== 'email') {
      throw new Error(`Expected type to be 'email', got '${inputElement.getAttribute('type') ?? 'null'}'`);
    }

    // テスト: aria-label が設定されていること
    if (!inputElement.getAttribute('aria-label')) {
      throw new Error('aria-label should be set');
    }

    console.log('✅ All tests passed for Default story');
  },
};

/**
 * ヘルプテキスト付きの入力フィールド。
 * 
 * 補助的な説明を入力フィールドの下に表示します。
 */
export const WithHelpText: Story = {
  args: {
    label: 'パスワード',
    type: 'password',
    name: 'password',
    helpText: '8文字以上で入力してください',
  },
  render: (args) => html`
    <ui-input
      label="${args.label}"
      type="${args.type}"
      name="${args.name}"
      help-text="${args.helpText}"
    ></ui-input>
  `,
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector('ui-input');
    if (!input) {
      throw new Error('Input component not found');
    }

    await input.updateComplete;

    // テスト: ヘルプテキストが表示されていること
    const helpText = input.shadowRoot?.querySelector('.help-text');
    if (!helpText) {
      throw new Error('Help text should be visible');
    }

    console.log('✅ All tests passed for WithHelpText story');
  },
};

/**
 * エラー状態の入力フィールド。
 * 
 * バリデーションエラーを表示します。
 * エラー状態の場合、Help Textは非表示となり、Error Messageのみが表示されます。
 */
export const ErrorState: Story = {
  args: {
    label: 'ユーザー名',
    type: 'text',
    name: 'username',
    value: 'ab',
    error: true,
    errorMessage: 'ユーザー名は3文字以上で入力してください',
    helpText: 'このヘルプテキストはエラー時に非表示になります',
  },
  render: (args) => html`
    <ui-input
      label="${args.label}"
      type="${args.type}"
      name="${args.name}"
      value="${args.value}"
      ?error="${args.error}"
      error-message="${args.errorMessage}"
      help-text="${args.helpText}"
    ></ui-input>
  `,
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector('ui-input');
    if (!input) {
      throw new Error('Input component not found');
    }

    await input.updateComplete;

    const inputElement = input.shadowRoot?.querySelector('input');
    if (!inputElement) {
      throw new Error('Input element not found in shadow root');
    }

    // テスト: aria-invalid="true" が設定されていること
    if (inputElement.getAttribute('aria-invalid') !== 'true') {
      throw new Error('aria-invalid should be "true"');
    }

    // テスト: エラーメッセージが表示されていること
    const errorMessage = input.shadowRoot?.querySelector('.error-message--visible');
    if (!errorMessage) {
      throw new Error('Error message should be visible');
    }

    // テスト: ヘルプテキストが非表示であること
    const helpText = input.shadowRoot?.querySelector('.help-text');
    if (helpText && getComputedStyle(helpText).display !== 'none') {
      throw new Error('Help text should be hidden when error is present');
    }

    console.log('✅ All tests passed for ErrorState story');
  },
};

/**
 * ラベルを視覚的に非表示にした入力フィールド。
 * 
 * 検索フィールド等、文脈からラベルが明らかな場合に使用します。
 * スクリーンリーダーには常にラベルが提供されます。
 */
export const HiddenLabel: Story = {
  args: {
    label: '検索',
    hideLabel: true,
    type: 'search',
    name: 'search',
    placeholder: '検索...',
  },
  render: (args) => html`
    <ui-input
      label="${args.label}"
      ?hide-label="${args.hideLabel}"
      type="${args.type}"
      name="${args.name}"
      placeholder="${args.placeholder}"
    ></ui-input>
  `,
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector('ui-input');
    if (!input) {
      throw new Error('Input component not found');
    }

    await input.updateComplete;

    const label = input.shadowRoot?.querySelector('.label--hidden');
    if (!label) {
      throw new Error('Label should have label--hidden class');
    }

    // テスト: aria-label は設定されていること
    const inputElement = input.shadowRoot?.querySelector('input');
    if (!inputElement?.getAttribute('aria-label')) {
      throw new Error('aria-label should be set even when label is hidden');
    }

    console.log('✅ All tests passed for HiddenLabel story');
  },
};

/**
 * 無効状態の入力フィールド。
 * 
 * 操作不可能な状態を示します。
 */
export const Disabled: Story = {
  args: {
    label: 'メールアドレス',
    type: 'email',
    name: 'email',
    value: 'disabled@example.com',
    disabled: true,
  },
  render: (args) => html`
    <ui-input
      label="${args.label}"
      type="${args.type}"
      name="${args.name}"
      value="${args.value}"
      ?disabled="${args.disabled}"
    ></ui-input>
  `,
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector('ui-input');
    if (!input) {
      throw new Error('Input component not found');
    }

    await input.updateComplete;

    const inputElement = input.shadowRoot?.querySelector('input');
    if (!inputElement) {
      throw new Error('Input element not found in shadow root');
    }

    // テスト: disabled属性が設定されていること
    if (!inputElement.disabled) {
      throw new Error('Input should be disabled');
    }

    console.log('✅ All tests passed for Disabled story');
  },
};

/**
 * 読み取り専用の入力フィールド。
 * 
 * フォーカス可能だがコピーのみ許可します。
 */
export const Readonly: Story = {
  args: {
    label: 'ユーザーID',
    type: 'text',
    name: 'userId',
    value: 'user-12345',
    readonly: true,
  },
  render: (args) => html`
    <ui-input
      label="${args.label}"
      type="${args.type}"
      name="${args.name}"
      value="${args.value}"
      ?readonly="${args.readonly}"
    ></ui-input>
  `,
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector('ui-input');
    if (!input) {
      throw new Error('Input component not found');
    }

    await input.updateComplete;

    const inputElement = input.shadowRoot?.querySelector('input');
    if (!inputElement) {
      throw new Error('Input element not found in shadow root');
    }

    // テスト: readonly属性が設定されていること
    if (!inputElement.readOnly) {
      throw new Error('Input should be readonly');
    }

    console.log('✅ All tests passed for Readonly story');
  },
};

/**
 * 必須フィールドのバリデーション。
 * 
 * required 属性を使用したバリデーションの例です。
 * 
 * **検証方法**:
 * 1. 入力フィールドを**空欄のまま**「送信」ボタンをクリック → エラー状態が表示されます
 * 2. 何か入力してから「送信」ボタンをクリック → 成功メッセージが表示されます
 */
export const Required: Story = {
  args: {
    label: '氏名',
    type: 'text',
    name: 'name',
    required: true,
    helpText: '必須項目です',
  },
  render: (args) => html`
    <style>
      .required-demo {
        max-width: 400px;
      }

      .required-info {
        margin-bottom: 1rem;
        padding: 0.75rem;
        background: var(--bg-info-subtle, #e0f2fe);
        border-radius: var(--radius-sm, 4px);
        font-size: var(--text-sm, 13px);
      }

      .required-info strong {
        display: block;
        margin-bottom: 0.25rem;
      }
    </style>

    <div class="required-demo">
      <div class="required-info">
        <strong>💡 検証方法</strong>
        空欄のまま「送信」ボタンを押すと、エラー状態が表示されます。
      </div>

      <form
        id="required-form"
        novalidate
        @submit="${(e: Event) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const input = form.querySelector('ui-input');
      if (!input) return;

      // ブラウザのバリデーションチェック
      if (!input.checkValidity()) {
        // バリデーションエラー: ui-inputのerror状態を設定
        input.error = true;
        input.errorMessage = 'この項目は必須です';
      } else {
        // バリデーション成功: エラー状態をクリア
        input.error = false;
        input.errorMessage = '';
        alert('フォームが送信されました！');
      }
    }}"
      >
        <ui-input
          id="required-input"
          label="${args.label}"
          type="${args.type}"
          name="${args.name}"
          ?required="${args.required}"
          help-text="${args.helpText}"
          @input="${(e: Event) => {
      // 入力時にエラー状態をクリア
      const input = e.target as Input;
      if (input.error) {
        input.error = false;
        input.errorMessage = '';
      }
    }}"
        ></ui-input>
        
        <ui-button type="submit" variant="primary" style="margin-top: 1rem;">
          送信
        </ui-button>
      </form>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector<Input>('#required-input');
    const form = canvasElement.querySelector<HTMLFormElement>('#required-form');

    if (!input || !form) {
      throw new Error('Input or form not found');
    }

    await input.updateComplete;

    // テスト: required属性が設定されていること
    const inputElement = input.shadowRoot?.querySelector('input');
    if (!inputElement?.required) {
      throw new Error('Input should have required attribute');
    }

    // テスト: 空欄の状態でcheckValidity()がfalseを返すこと
    if (input.checkValidity()) {
      throw new Error('Empty required input should be invalid');
    }

    // テスト: 値を入力するとcheckValidity()がtrueを返すこと
    input.value = 'テスト';
    await input.updateComplete;

    if (!input.checkValidity()) {
      throw new Error('Required input with value should be valid');
    }

    console.log('✅ All tests passed for Required story');
  },
};

/**
 * 全タイプの一覧。
 * 
 * サポートされている全てのタイプを比較できます。
 */
export const AllTypes: Story = {
  render: () => html`
    <style>
      .types-showcase {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        max-width: 400px;
      }
    </style>

    <div class="types-showcase">
      <ui-input label="テキスト" type="text" placeholder="テキストを入力"></ui-input>
      <ui-input label="メール" type="email" placeholder="example@example.com"></ui-input>
      <ui-input label="パスワード" type="password" placeholder="********"></ui-input>
      <ui-input label="数値" type="number" placeholder="123"></ui-input>
      <ui-input label="電話番号" type="tel" placeholder="03-1234-5678"></ui-input>
      <ui-input label="URL" type="url" placeholder="https://example.com"></ui-input>
      <ui-input label="検索" type="search" placeholder="検索..."></ui-input>
    </div>
  `,
};

/**
 * フォーカス状態のデモ。
 * 
 * Adaptive Focus により、移動中のノイズを低減し、停止時に明確化します。
 */
export const FocusState: Story = {
  args: {
    label: 'フォーカステスト',
    type: 'text',
    name: 'focusTest',
  },
  render: (args) => html`
    <style>
      .focus-demo {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        max-width: 400px;
      }

      .focus-info {
        padding: 1rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
        font-size: var(--text-sm, 13px);
      }
    </style>

    <div class="focus-demo">
      <div class="focus-info">
        <strong>操作方法</strong>: Tab キーを押して入力フィールドにフォーカスを当ててください。
        Adaptive Focus により、フォーカスリングが適切に表示されます。
      </div>

      <ui-input
        label="${args.label}"
        type="${args.type}"
        name="${args.name}"
        id="focus-input"
      ></ui-input>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector<Input>('#focus-input');
    if (!input) {
      throw new Error('Input component not found');
    }

    await input.updateComplete;

    // フォーカスを当てる
    input.focus();
    await new Promise(resolve => setTimeout(resolve, 100));

    const inputElement = input.shadowRoot?.querySelector('input');
    if (!inputElement) {
      throw new Error('Input element not found in shadow root');
    }

    // テスト: フォーカスが当たっていること
    if (input.shadowRoot?.activeElement !== inputElement) {
      throw new Error('Input should be focused');
    }

    console.log('✅ All tests passed for FocusState story');
  },
};

/**
 * フォーム統合の例。
 * 
 * 複数の入力フィールドをフォームで使用する例です。
 */
export const FormIntegration: Story = {
  render: () => html`
    <style>
      .form-demo {
        max-width: 400px;
        padding: 1.5rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
      }

      .form-demo h3 {
        margin: 0 0 1rem 0;
      }

      .form-fields {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      .form-actions {
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
      }
    </style>

    <form
      class="form-demo"
      @submit="${(e: Event) => {
      e.preventDefault();
      alert('フォームが送信されました！');
    }}"
    >
      <h3>ユーザー登録</h3>

      <div class="form-fields">
        <ui-input
          label="氏名"
          type="text"
          name="name"
          required
        ></ui-input>

        <ui-input
          label="メールアドレス"
          type="email"
          name="email"
          required
          help-text="確認メールを送信します"
        ></ui-input>

        <ui-input
          label="パスワード"
          type="password"
          name="password"
          required
          help-text="8文字以上で入力してください"
        ></ui-input>

        <ui-input
          label="電話番号"
          type="tel"
          name="phone"
          placeholder="03-1234-5678"
        ></ui-input>
      </div>

      <div class="form-actions">
        <ui-button type="button" variant="secondary">キャンセル</ui-button>
        <ui-button type="submit" variant="primary">登録</ui-button>
      </div>
    </form>
  `,
};

/**
 * バリデーション例。
 * 
 * pattern属性を使用したバリデーションの例です。
 */
export const WithValidation: Story = {
  render: () => html`
    <style>
      .validation-demo {
        max-width: 400px;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
    </style>

    <div class="validation-demo">
      <ui-input
        label="郵便番号"
        type="text"
        name="zipcode"
        pattern="[0-9]{3}-[0-9]{4}"
        placeholder="123-4567"
        help-text="ハイフン付きで入力してください（例: 123-4567）"
      ></ui-input>

      <ui-input
        label="ユーザー名"
        type="text"
        name="username"
        pattern="[a-zA-Z0-9_]{3,16}"
        minlength="3"
        maxlength="16"
        help-text="3-16文字の英数字とアンダースコアのみ使用可能"
      ></ui-input>
    </div>
  `,
};

/**
 * ❌ ラベルなしのエラー例。
 * 
 * label が設定されていない場合、開発モードでエラーが出力されます。
 * このストーリーは意図的にアクセシビリティ違反を示すためのものです。
 */
export const WithoutLabel: Story = {
  render: () => html`
    <style>
      .error-demo {
        padding: 1rem;
        background: var(--bg-danger-subtle, #fee);
        border: 1px solid var(--border-danger, #fcc);
        border-radius: var(--radius-md, 6px);
        max-width: 400px;
      }

      .error-message {
        margin-bottom: 1rem;
        color: var(--fg-danger, #c00);
        font-size: var(--text-sm, 13px);
      }
    </style>

    <div class="error-demo">
      <div class="error-message">
        ⚠️ アクセシビリティエラー: label が設定されていません。
        コンソールを確認してください。
      </div>
      <ui-input type="text" placeholder="ラベルがありません"></ui-input>
    </div>
  `,
};

/**
 * ❌ サポート外の type を指定した例。
 * 
 * date, time, file, checkbox, radio 等は専用コンポーネントで対応します。
 * 未定義のtypeが渡された場合は text にフォールバックし、開発時にコンソール警告を出力します。
 */
export const UnsupportedType: Story = {
  render: () => html`
    <style>
      .warning-demo {
        padding: 1rem;
        background: var(--bg-warning-subtle, #fffbea);
        border: 1px solid var(--border-warning, #ffd666);
        border-radius: var(--radius-md, 6px);
        max-width: 400px;
      }

      .warning-message {
        margin-bottom: 1rem;
        color: var(--fg-warning, #d97706);
        font-size: var(--text-sm, 13px);
      }
    </style>

    <div class="warning-demo">
      <div class="warning-message">
        ⚠️ サポート外の type="date" が指定されています。
        コンソールを確認してください（text にフォールバックされます）。
      </div>
      <ui-input label="日付" type="date" name="date"></ui-input>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector('ui-input');
    if (!input) {
      throw new Error('Input component not found');
    }

    await input.updateComplete;

    const inputElement = input.shadowRoot?.querySelector('input');
    if (!inputElement) {
      throw new Error('Input element not found in shadow root');
    }

    // テスト: type が text にフォールバックされていること
    if (inputElement.getAttribute('type') !== 'text') {
      throw new Error(`Expected type to be 'text' (fallback), got '${inputElement.getAttribute('type') ?? 'null'}'`);
    }

    console.log('✅ All tests passed for UnsupportedType story');
  },
};

/**
 * 強制カラーモードのプレビュー。
 * 
 * Windows High Contrast Mode などでの表示を確認できます。
 * ボーダーとスペーシングにより構造を明示し、意味を維持します。
 */
export const ForcedColorsMode: Story = {
  render: () => html`
    <style>
      .forced-colors-demo {
        max-width: 400px;
        padding: 1.5rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
      }

      .forced-colors-demo h3 {
        margin: 0 0 1rem 0;
      }

      .forced-colors-info {
        margin-bottom: 1rem;
        padding: 0.75rem;
        background: var(--bg-info-subtle, #e0f2fe);
        border-radius: var(--radius-sm, 4px);
        font-size: var(--text-sm, 13px);
      }

      .demo-fields {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      /* Forced Colors Mode のシミュレーション */
      @media (forced-colors: active) {
        .forced-colors-demo {
          background: Canvas;
          border: 1px solid CanvasText;
        }
      }
    </style>

    <div class="forced-colors-demo">
      <h3>Forced Colors Mode</h3>
      
      <div class="forced-colors-info">
        💡 Windows の設定で「ハイコントラスト」を有効にすると、
        このモードでの表示を確認できます。
      </div>

      <div class="demo-fields">
        <ui-input
          label="通常状態"
          type="text"
          name="normal"
          placeholder="入力してください"
        ></ui-input>

        <ui-input
          label="エラー状態"
          type="text"
          name="error"
          error
          error-message="エラーメッセージ"
        ></ui-input>

        <ui-input
          label="無効状態"
          type="text"
          name="disabled"
          value="無効な入力"
          disabled
        ></ui-input>
      </div>
    </div>
  `,
};

/**
 * モーション低減モードのデモ。
 * 
 * prefers-reduced-motion 環境下では、全てのトランジションが 0.01ms に短縮されます。
 * 背景色・ボーダー色の変化は視覚的に即座に適用されます。
 */
export const MotionReduction: Story = {
  render: () => html`
    <style>
      .motion-demo {
        max-width: 400px;
        padding: 1.5rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
      }

      .motion-demo h3 {
        margin: 0 0 1rem 0;
      }

      .motion-info {
        margin-bottom: 1rem;
        padding: 0.75rem;
        background: var(--bg-info-subtle, #e0f2fe);
        border-radius: var(--radius-sm, 4px);
        font-size: var(--text-sm, 13px);
      }

      /* Motion Reduction のシミュレーション */
      @media (prefers-reduced-motion: reduce) {
        .motion-demo {
          /* グローバル定義により自動的に適用されます */
        }
      }
    </style>

    <div class="motion-demo">
      <h3>Motion Reduction</h3>
      
      <div class="motion-info">
        💡 OS の設定で「アニメーションを減らす」を有効にすると、
        トランジションが即座に適用されます。
      </div>

      <ui-input
        label="フォーカステスト"
        type="text"
        name="motionTest"
        help-text="フォーカスを当てて、トランジションの挙動を確認してください"
      ></ui-input>
    </div>
  `,
};

/**
 * エラー状態の遷移テスト。
 * 
 * エラー解消時に Help Text が再表示されることを確認します。
 */
export const ErrorStateTransition: Story = {
  render: () => html`
    <style>
      .transition-demo {
        max-width: 400px;
        padding: 1.5rem;
        background: var(--bg-surface-2, #f5f5f5);
        border-radius: var(--radius-md, 6px);
      }

      .transition-demo h3 {
        margin: 0 0 1rem 0;
      }

      .controls {
        display: flex;
        gap: 0.5rem;
        margin-top: 1rem;
      }
    </style>

    <div class="transition-demo">
      <h3>エラー状態の遷移</h3>
      
      <ui-input
        id="transition-input"
        label="ユーザー名"
        type="text"
        name="username"
        help-text="3文字以上で入力してください"
      ></ui-input>

      <div class="controls">
        <ui-button
          variant="danger"
          @click="${() => {
      const input = document.getElementById('transition-input') as Input | null;
      if (input) {
        input.error = true;
        input.errorMessage = 'ユーザー名は3文字以上で入力してください';
      }
    }}"
        >
          エラーを表示
        </ui-button>

        <ui-button
          variant="secondary"
          @click="${() => {
      const input = document.getElementById('transition-input') as Input | null;
      if (input) {
        input.error = false;
        input.errorMessage = '';
      }
    }}"
        >
          エラーを解消
        </ui-button>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector<Input>('#transition-input');
    if (!input) {
      throw new Error('Input component not found');
    }
    await input.updateComplete;

    // 初期状態: Help Text が表示されていること
    let helpText = input.shadowRoot?.querySelector('.help-text');
    if (!helpText || getComputedStyle(helpText).display === 'none') {
      throw new Error('Help text should be visible initially');
    }

    // エラー状態に遷移
    input.error = true;
    input.errorMessage = 'テストエラー';
    await input.updateComplete;

    // エラー時: Error Message が表示され、Help Text が非表示
    const errorMessage = input.shadowRoot?.querySelector('.error-message--visible');
    if (!errorMessage) {
      throw new Error('Error message should be visible when error is true');
    }

    helpText = input.shadowRoot?.querySelector('.help-text');
    if (helpText && getComputedStyle(helpText).display !== 'none') {
      throw new Error('Help text should be hidden when error is present');
    }

    // エラー解消
    input.error = false;
    input.errorMessage = '';
    await input.updateComplete;

    // エラー解消後: Help Text が再表示されること
    helpText = input.shadowRoot?.querySelector('.help-text');
    if (!helpText || getComputedStyle(helpText).display === 'none') {
      throw new Error('Help text should be visible again after error is resolved');
    }

    console.log('✅ All tests passed for ErrorStateTransition story');
  },
};
