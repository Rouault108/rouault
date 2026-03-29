import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './input';
import type { Input } from './input';
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

const getHost = (canvasElement: Element, selector = 'ui-input'): Input => {
  const host = canvasElement.querySelector<Input>(selector);
  if (!host) {
    throw new Error(`"${selector}" が見つかりません`);
  }

  return host;
};

const getInternalInput = (host: Input): HTMLInputElement => {
  const input = host.shadowRoot?.querySelector<HTMLInputElement>('input');
  if (!input) {
    throw new Error('Shadow Root 内に input 要素が見つかりません');
  }

  return input;
};

const getLabel = (host: Input): HTMLLabelElement => {
  const label = host.shadowRoot?.querySelector<HTMLLabelElement>('label');
  if (!label) {
    throw new Error('Shadow Root 内に label 要素が見つかりません');
  }

  return label;
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
      description: 'FormData のキー',
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
      description: 'Enter キーラベルのヒント',
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
      description: '外部説明要素の ID 群',
      table: { type: { summary: 'string' }, defaultValue: { summary: "''" } },
    },
  },
};

export default meta;
type Story = StoryObj<InputStoryArgs>;

export const Default: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  args: {
    label: 'メールアドレス',
    type: 'email',
    name: 'email',
    placeholder: 'example@example.com',
    autocomplete: 'email',
  },
  render: renderInput,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    await host.updateComplete;

    const input = getInternalInput(host);
    const label = getLabel(host);

    if (label.textContent.trim() !== 'メールアドレス') {
      throw new Error('label 要素がアクセシブル名の正準ソースとして存在する必要があります');
    }

    if (input.type !== 'email') {
      throw new Error(`type="email" を期待していましたが、実際には "${input.type}" でした`);
    }

    if (input.hasAttribute('aria-label')) {
      throw new Error('通常構成では aria-label に依存しません');
    }
  },
};

export const WithHelpText: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  args: {
    label: 'パスワード',
    type: 'password',
    helpText: '8文字以上で入力してください',
  },
  render: renderInput,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    await host.updateComplete;

    const input = getInternalInput(host);
    const help = host.shadowRoot?.querySelector<HTMLElement>('.help-text');
    if (!help) {
      throw new Error('helpText がある場合、補助文言が表示される必要があります');
    }

    if (input.getAttribute('aria-describedby') !== help.id) {
      throw new Error('非エラー時の aria-describedby は help 要素を参照する必要があります');
    }
  },
};

export const ExternalErrorState: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  args: {
    label: 'ユーザー名',
    value: 'ab',
    error: true,
    errorMessage: 'ユーザー名は3文字以上で入力してください',
    helpText: 'この補助文言はエラー時に非表示になります',
  },
  render: renderInput,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    await host.updateComplete;

    const input = getInternalInput(host);
    const error = host.shadowRoot?.querySelector<HTMLElement>('.error-message');
    const help = host.shadowRoot?.querySelector('.help-text');

    if (input.getAttribute('aria-invalid') !== 'true') {
      throw new Error('外部強制エラー時は aria-invalid="true" である必要があります');
    }

    if (error?.textContent.trim() !== 'ユーザー名は3文字以上で入力してください') {
      throw new Error('外部強制エラー文言が表示されていません');
    }

    if (help) {
      throw new Error('エラー時は helpText を同時表示しません');
    }

    if (input.getAttribute('aria-describedby') !== error.id) {
      throw new Error('エラー時の aria-describedby は error 要素を参照する必要があります');
    }
  },
};

export const NativeValidationState: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  args: {
    label: 'メールアドレス',
    type: 'email',
    value: 'invalid-address',
  },
  render: renderInput,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    await host.updateComplete;

    if (host.checkValidity()) {
      throw new Error('不正な email 値は invalid である必要があります');
    }

    await host.updateComplete;

    const input = getInternalInput(host);
    if (input.getAttribute('aria-invalid') !== 'true') {
      throw new Error('ネイティブ妥当性エラー時も aria-invalid="true" を期待します');
    }

    const error = host.shadowRoot?.querySelector<HTMLElement>('.error-message');
    if (!error?.textContent.trim()) {
      throw new Error('ネイティブ妥当性エラー文言が表示される必要があります');
    }
  },
};

export const HiddenLabel: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  args: {
    label: 'ユーザーID',
    hideLabel: true,
    placeholder: 'user-id',
  },
  render: renderInput,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    await host.updateComplete;

    const label = getLabel(host);
    const input = getInternalInput(host);

    if (!label.classList.contains('label--hidden')) {
      throw new Error('hideLabel=true の場合も label 要素は残しつつ視覚的に隠す必要があります');
    }

    if (input.hasAttribute('aria-label')) {
      throw new Error('hideLabel=true でも aria-label への切り替えは行いません');
    }
  },
};

export const RequiredIndicatorModes: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <div style="display: grid; gap: 16px; max-width: 420px;">
      ${renderInput({
        label: '必須テキスト',
        required: true,
        requiredIndicator: 'text',
      })}
      ${renderInput({
        label: '必須アスタリスク',
        required: true,
        requiredIndicator: 'asterisk',
      })}
      ${renderInput({
        label: '必須非表示',
        required: true,
        requiredIndicator: 'none',
      })}
    </div>
  `,
  play: async ({ canvasElement }) => {
    const hosts = Array.from(canvasElement.querySelectorAll<Input>('ui-input'));
    if (hosts.length !== 3) {
      throw new Error('requiredIndicator 検証用に 3 つの input が必要です');
    }

    await Promise.all(hosts.map((host) => host.updateComplete));

    const [textHost, asteriskHost, noneHost] = hosts;
    if (!textHost || !asteriskHost || !noneHost) {
      throw new Error('requiredIndicator 検証用の host 解決に失敗しました');
    }

    const textLabel = getLabel(textHost);
    const asteriskLabel = getLabel(asteriskHost);
    const noneLabel = getLabel(noneHost);

    if (!textLabel.textContent.includes('（必須）')) {
      throw new Error('requiredIndicator="text" は文言で必須を示す必要があります');
    }

    if (!asteriskLabel.textContent.includes('*')) {
      throw new Error('requiredIndicator="asterisk" は記号で必須を示す必要があります');
    }

    if (noneLabel.querySelector('.required-indicator')) {
      throw new Error('requiredIndicator="none" は追加表示を行いません');
    }
  },
};

export const ExternalDescriptions: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <div style="display: grid; gap: 8px; max-width: 420px;">
      <p id="email-desc">確認メールを送信します。</p>
      ${renderInput({
        label: 'メールアドレス',
        helpText: '社内共有は行いません',
        describedBy: 'email-desc',
      })}
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    await host.updateComplete;

    const input = getInternalInput(host);
    const help = host.shadowRoot?.querySelector<HTMLElement>('.help-text');
    if (!help) {
      throw new Error('内部 helpText が表示されている必要があります');
    }

    if (input.getAttribute('aria-describedby') !== `email-desc ${help.id}`) {
      throw new Error(
        'aria-describedby は「外部説明 ID → 内部 help ID」の順で連結される必要があります',
      );
    }
  },
};

export const DefaultValueReset: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <form id="reset-form">
      ${renderInput({
        label: '表示名',
        name: 'displayName',
        value: '現在値',
        defaultValue: '初期値',
      })}
      <button type="reset">reset</button>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const form = canvasElement.querySelector<HTMLFormElement>('#reset-form');
    if (!form) {
      throw new Error('reset 検証用の form が見つかりません');
    }

    await host.updateComplete;
    form.reset();
    await host.updateComplete;

    if (host.value !== '初期値') {
      throw new Error(`reset 後は defaultValue に戻る必要があります: ${host.value}`);
    }
  },
};

export const Disabled: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  args: {
    label: 'メールアドレス',
    value: 'disabled@example.com',
    disabled: true,
  },
  render: renderInput,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    await host.updateComplete;

    const input = getInternalInput(host);
    if (!input.disabled) {
      throw new Error('disabled=true は内部 input に委譲される必要があります');
    }

    if (!host.checkValidity()) {
      throw new Error('disabled 状態は妥当性評価の対象外として扱います');
    }
  },
};

export const Readonly: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  args: {
    label: 'ユーザーID',
    value: 'user-12345',
    readonly: true,
  },
  render: renderInput,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    await host.updateComplete;

    const input = getInternalInput(host);
    if (!input.readOnly) {
      throw new Error('readonly=true は内部 input に委譲される必要があります');
    }
  },
};

export const InvalidTypeFallback: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
  render: () => html`<ui-input label="数値のつもり" type="number"></ui-input>`,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    await host.updateComplete;

    const input = getInternalInput(host);
    if (host.getAttribute('type') !== 'text' || input.type !== 'text') {
      throw new Error('非対応 type は text に正規化される必要があります');
    }
  },
};

export const EnterSubmitFromInput: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: () => html`
    <form
      id="submit-form"
      @submit=${(event: Event) => {
        event.preventDefault();
        const output = (event.currentTarget as ParentNode).querySelector<HTMLElement>(
          '#submit-count',
        );
        if (!output) {
          return;
        }

        const count = Number(output.dataset['count'] ?? '0') + 1;
        output.dataset['count'] = String(count);
        output.textContent = String(count);
      }}
    >
      ${renderInput({
        label: '検索語',
        name: 'query',
        enterkeyhint: 'search',
      })}
      <ui-button type="submit">送信</ui-button>
      <output id="submit-count" data-count="0">0</output>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    const output = canvasElement.querySelector<HTMLOutputElement>('#submit-count');
    if (!output) {
      throw new Error('送信回数出力が見つかりません');
    }

    await host.updateComplete;

    const input = getInternalInput(host);
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }),
    );
    await host.updateComplete;

    if (output.textContent !== '1') {
      throw new Error(`Enter で関連フォーム送信へ橋渡しできませんでした: ${output.textContent}`);
    }
  },
};

export const FormDataDisabledReadonlyBoundary: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
  render: () => html`
    <form id="boundary-form">
      ${renderInput({
        label: '通常入力',
        name: 'active',
        value: 'active-value',
      })}
      ${renderInput({
        label: '無効入力',
        name: 'disabledField',
        value: 'disabled-value',
        disabled: true,
      })}
      ${renderInput({
        label: '読み取り専用',
        name: 'readonlyField',
        value: 'readonly-value',
        readonly: true,
      })}
    </form>
  `,
  play: ({ canvasElement }) => {
    const form = canvasElement.querySelector<HTMLFormElement>('#boundary-form');
    if (!form) {
      throw new Error('boundary 検証用の form が見つかりません');
    }

    const formData = new FormData(form);
    if (formData.get('active') !== 'active-value') {
      throw new Error('通常入力は FormData に参加する必要があります');
    }

    if (formData.has('disabledField')) {
      throw new Error('disabled な input は FormData に参加してはいけません');
    }

    if (formData.get('readonlyField') !== 'readonly-value') {
      throw new Error('readonly な input は FormData に参加する必要があります');
    }
  },
};

export const PassThroughHints: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  args: {
    label: '電話番号',
    type: 'tel',
    inputmode: 'tel',
    enterkeyhint: 'next',
    autocapitalize: 'off',
    spellcheck: false,
  },
  render: renderInput,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement);
    await host.updateComplete;

    const input = getInternalInput(host);
    if (input.getAttribute('inputmode') !== 'tel') {
      throw new Error('inputmode は内部 input へ委譲される必要があります');
    }

    if (input.getAttribute('enterkeyhint') !== 'next') {
      throw new Error('enterkeyhint は内部 input へ委譲される必要があります');
    }

    if (input.getAttribute('spellcheck') !== 'false') {
      throw new Error('spellcheck=false は属性値 false として委譲される必要があります');
    }
  },
};

export const Playground: Story = {
  parameters: { rouaultContractKind: 'visual' },
  args: baseArgs,
  render: renderInput,
};
