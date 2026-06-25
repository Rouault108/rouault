import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './input';
import '../button/button';

interface InputStoryArgs {
  label: string;
  hideLabel: boolean;
  variant: 'filled' | 'outline';
  type: 'text' | 'email' | 'password' | 'tel' | 'url';
  name: string;
  placeholder: string;
  value: string;
  defaultValue: string;
  helpText: string;
  errorMessage: string;
  error: boolean;
  disabled: boolean;
  readonly: boolean;
  required: boolean;
  requiredIndicator: 'text' | 'asterisk' | 'none';
  pattern: string;
  minlength: number | undefined;
  maxlength: number | undefined;
  autocomplete: string;
  inputmode: string;
  enterkeyhint: string;
  autocapitalize: string;
  spellcheck: boolean | undefined;
  describedBy: string;
}

const baseArgs: InputStoryArgs = {
  label: 'メールアドレス',
  hideLabel: false,
  variant: 'filled',
  type: 'email',
  name: 'email',
  placeholder: 'example@example.com',
  value: '',
  defaultValue: '',
  helpText: '',
  errorMessage: '',
  error: false,
  disabled: false,
  readonly: false,
  required: false,
  requiredIndicator: 'text',
  pattern: '',
  minlength: undefined,
  maxlength: undefined,
  autocomplete: 'email',
  inputmode: '',
  enterkeyhint: '',
  autocapitalize: '',
  spellcheck: undefined,
  describedBy: '',
};

const renderInput = (args: Partial<InputStoryArgs>) => {
  const merged = { ...baseArgs, ...args };

  if (merged.spellcheck === undefined) {
    return html`
      <ui-input
        .label=${merged.label}
        .hideLabel=${merged.hideLabel}
        .variant=${merged.variant}
        .type=${merged.type}
        .name=${merged.name}
        .placeholder=${merged.placeholder}
        .value=${merged.value}
        .defaultValue=${merged.defaultValue}
        .helpText=${merged.helpText}
        .errorMessage=${merged.errorMessage}
        .error=${merged.error}
        .disabled=${merged.disabled}
        .readonly=${merged.readonly}
        .required=${merged.required}
        .requiredIndicator=${merged.requiredIndicator}
        .pattern=${merged.pattern}
        .minlength=${merged.minlength}
        .maxlength=${merged.maxlength}
        .autocomplete=${merged.autocomplete}
        .inputmode=${merged.inputmode}
        .enterkeyhint=${merged.enterkeyhint}
        .autocapitalize=${merged.autocapitalize}
        .describedBy=${merged.describedBy}
      ></ui-input>
    `;
  }

  return html`
    <ui-input
      .label=${merged.label}
      .hideLabel=${merged.hideLabel}
      .variant=${merged.variant}
      .type=${merged.type}
      .name=${merged.name}
      .placeholder=${merged.placeholder}
      .value=${merged.value}
      .defaultValue=${merged.defaultValue}
      .helpText=${merged.helpText}
      .errorMessage=${merged.errorMessage}
      .error=${merged.error}
      .disabled=${merged.disabled}
      .readonly=${merged.readonly}
      .required=${merged.required}
      .requiredIndicator=${merged.requiredIndicator}
      .pattern=${merged.pattern}
      .minlength=${merged.minlength}
      .maxlength=${merged.maxlength}
      .autocomplete=${merged.autocomplete}
      .inputmode=${merged.inputmode}
      .enterkeyhint=${merged.enterkeyhint}
      .autocapitalize=${merged.autocapitalize}
      .spellcheck=${merged.spellcheck}
      .describedBy=${merged.describedBy}
    ></ui-input>
  `;
};

/**
 * ## Input `<ui-input>`
 *
 * text-like な単一行入力に責務を絞った、Form Associated Custom Element です。
 * `label` をアクセシブル名の正準ソースとし、`defaultValue`、`helpText`、
 * `errorMessage`、`describedBy`、ElementInternals への妥当性同期を公開契約として扱います。
 */
const meta: Meta<InputStoryArgs> = {
  title: 'Components/Input',
  component: 'ui-input',
  tags: ['autodocs'],
  args: baseArgs,
  parameters: {
    docs: {
      description: {
        component: `
\`ui-input\` は text-like な単一行入力のみを対象にします。\`label\` は必須、\`helpText\` と \`errorMessage\` は相互排他、\`defaultValue\` は reset 復元元、\`describedBy\` は外部説明連携専用 API です。

## 使用方法

\`\`\`html
<ui-input
  label="メールアドレス"
  type="email"
  name="email"
  autocomplete="email"
></ui-input>

<ui-input
  label="ユーザー名"
  required
  required-indicator="asterisk"
  help-text="3文字以上で入力してください"
></ui-input>

<ui-input
  label="パスワード"
  type="password"
  error
  error-message="8文字以上で入力してください"
></ui-input>
\`\`\`

## 注意事項

- \`label\` は必須です。視覚的に隠す場合も \`hide-label\` を使用し、label 要素は維持します。
- \`type\` は \`text\` / \`email\` / \`password\` / \`tel\` / \`url\` のみをサポートします。
- \`error=true\` の場合、\`error-message\` は空にできません。空文字列は契約違反として警告し、強制エラーには入りません。
- \`described-by\` は外部説明要素 ID を前置し、内部 help / error の ID は後ろへ連結されます。
        `,
      },
    },
  },
  argTypes: {
    label: {
      control: 'text',
      description: '入力項目のラベル（必須）',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
    },
    hideLabel: {
      control: 'boolean',
      description: 'ラベルを視覚的に非表示',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    variant: {
      control: 'select',
      options: ['filled', 'outline'],
      description: '入力領域の視覚バリアント',
      table: { type: { summary: "'filled' | 'outline'" }, defaultValue: { summary: "'filled'" } },
    },
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'tel', 'url'],
      description: 'text-like な input type',
      table: {
        type: { summary: "'text' | 'email' | 'password' | 'tel' | 'url'" },
        defaultValue: { summary: "'text'" },
      },
    },
    name: {
      control: 'text',
      description: 'FormDataのキー',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
    },
    placeholder: {
      control: 'text',
      description: '補助ヒント',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
    },
    value: {
      control: 'text',
      description: '現在値',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
    },
    defaultValue: {
      control: 'text',
      description: '初期値および reset 復元値',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
    },
    helpText: {
      control: 'text',
      description: '非エラー時のみ表示する補助文言',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
    },
    errorMessage: {
      control: 'text',
      description: '外部強制エラー文言',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
    },
    error: {
      control: 'boolean',
      description: '外部強制エラー状態',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    disabled: {
      control: 'boolean',
      description: '操作不能かつ FormData 非参加',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    readonly: {
      control: 'boolean',
      description: '編集不能だがフォーカスと FormData 参加は維持',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    required: {
      control: 'boolean',
      description: '必須の意味状態',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    requiredIndicator: {
      control: 'select',
      options: ['text', 'asterisk', 'none'],
      description: '必須表示の視覚形式',
      table: {
        type: { summary: "'text' | 'asterisk' | 'none'" },
        defaultValue: { summary: "'text'" },
      },
    },
    pattern: {
      control: 'text',
      description: 'ネイティブ input に委譲する pattern',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
    },
    minlength: {
      control: 'number',
      description: '最小文字数',
      table: { type: { summary: 'number | undefined' } },
    },
    maxlength: {
      control: 'number',
      description: '最大文字数',
      table: { type: { summary: 'number | undefined' } },
    },
    autocomplete: {
      control: 'text',
      description: 'ネイティブ input に委譲する autocomplete',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
    },
    inputmode: {
      control: 'text',
      description: 'モバイル入力ヒント',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
    },
    enterkeyhint: {
      control: 'text',
      description: 'Enterキーラベルのヒント',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
    },
    autocapitalize: {
      control: 'text',
      description: '自動大文字化ヒント',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
    },
    spellcheck: {
      control: 'boolean',
      description: 'スペルチェック委譲。未指定も許容',
      table: { type: { summary: 'boolean | undefined' } },
    },
    describedBy: {
      control: 'text',
      description: '外部説明要素のID群',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
    },
  },
};

export default meta;
type Story = StoryObj<InputStoryArgs>;

export const Default: Story = {
  args: {
    label: 'メールアドレス',
    type: 'email',
    name: 'email',
    placeholder: 'example@example.com',
    autocomplete: 'email',
  },
  render: renderInput,
};

export const Playground: Story = {
  args: baseArgs,
  render: renderInput,
};
