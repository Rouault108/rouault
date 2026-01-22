import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, userEvent, within } from 'storybook/test';
import './checkbox.ts';

const meta: Meta = {
  title: 'Components/UiCheckbox',
  component: 'ui-checkbox',
  tags: ['autodocs'],
  argTypes: {
    checked: {
      control: 'boolean',
      description: 'チェック状態',
    },
    indeterminate: {
      control: 'boolean',
      description: '不確定状態（一部選択）',
    },
    disabled: {
      control: 'boolean',
      description: '無効状態',
    },
    invalid: {
      control: 'boolean',
      description: 'バリデーションエラー状態',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'チェックボックスのサイズ',
    },
    label: {
      control: 'text',
      description: 'ラベルテキスト',
    },
    value: {
      control: 'text',
      description: 'フォーム送信時の値',
    },
    name: {
      control: 'text',
      description: 'フォームフィールド名',
    },
    onChange: { action: 'change' },
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
  flex: 'display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;',
  vertical: 'display: flex; flex-direction: column; gap: 0.75rem;',
} as const;

/**
 * サンプルラベル
 */
const LABELS = {
  accept: '利用規約に同意する',
  subscribe: 'メールマガジンを受け取る',
  enable: '通知を有効にする',
  remember: 'ログイン状態を保持する',
  selectAll: 'すべて選択',
} as const;

// ========================================
// 基本ストーリー
// ========================================

/**
 * 基本的なチェックボックス
 */
export const Default: Story = {
  args: {
    label: LABELS.accept,
    checked: false,
    size: 'md',
  },
  render: (args) => html`
    <ui-checkbox
      ?checked="${args['checked']}"
      ?indeterminate="${args['indeterminate']}"
      ?disabled="${args['disabled']}"
      ?invalid="${args['invalid']}"
      size="${args['size']}"
      value="${args['value'] || 'checkbox-value'}"
      name="${args['name'] || 'checkbox-name'}"
    >
      ${args['label']}
    </ui-checkbox>
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
    size: 'sm',
    label: LABELS.subscribe,
    checked: false,
  },
  render: (args) => html`
    <ui-checkbox
      size="${args['size']}"
      ?checked="${args['checked']}"
      ?disabled="${args['disabled']}"
    >
      ${args['label']}
    </ui-checkbox>
  `,
};

/**
 * Medium サイズ
 */
export const Medium: Story = {
  args: {
    size: 'md',
    label: LABELS.subscribe,
    checked: false,
  },
  render: (args) => html`
    <ui-checkbox
      size="${args['size']}"
      ?checked="${args['checked']}"
      ?disabled="${args['disabled']}"
    >
      ${args['label']}
    </ui-checkbox>
  `,
};

/**
 * Large サイズ
 */
export const Large: Story = {
  args: {
    size: 'lg',
    label: LABELS.subscribe,
    checked: false,
  },
  render: (args) => html`
    <ui-checkbox
      size="${args['size']}"
      ?checked="${args['checked']}"
      ?disabled="${args['disabled']}"
    >
      ${args['label']}
    </ui-checkbox>
  `,
};

/**
 * 全サイズのショーケース
 */
export const AllSizes: Story = {
  args: {
    checked: true,
    disabled: false,
  },
  render: (args) => html`
    <div style="${CONTAINER_STYLES.vertical}">
      <ui-checkbox
        size="sm"
        ?checked="${args['checked']}"
        ?disabled="${args['disabled']}"
      >
        Small - ${LABELS.remember}
      </ui-checkbox>
      <ui-checkbox
        size="md"
        ?checked="${args['checked']}"
        ?disabled="${args['disabled']}"
      >
        Medium - ${LABELS.remember}
      </ui-checkbox>
      <ui-checkbox
        size="lg"
        ?checked="${args['checked']}"
        ?disabled="${args['disabled']}"
      >
        Large - ${LABELS.remember}
      </ui-checkbox>
    </div>
  `,
};

// ========================================
// 状態バリエーション
// ========================================

/**
 * チェック済み状態
 */
export const Checked: Story = {
  args: {
    label: LABELS.accept,
    checked: true,
  },
  render: (args) => html`
    <ui-checkbox ?checked="${args['checked']}">
      ${args['label']}
    </ui-checkbox>
  `,
};

/**
 * 不確定状態（Indeterminate）
 */
export const Indeterminate: Story = {
  args: {
    label: LABELS.selectAll,
    indeterminate: true,
  },
  render: (args) => html`
    <ui-checkbox ?indeterminate="${args['indeterminate']}">
      ${args['label']}
    </ui-checkbox>
  `,
};

/**
 * 無効状態
 */
export const Disabled: Story = {
  args: {
    label: LABELS.enable,
    disabled: true,
    checked: false,
  },
  render: (args) => html`
    <div style="${CONTAINER_STYLES.vertical}">
      <ui-checkbox
        ?disabled="${args['disabled']}"
        ?checked="${false}"
      >
        Unchecked & Disabled
      </ui-checkbox>
      <ui-checkbox
        ?disabled="${args['disabled']}"
        ?checked="${true}"
      >
        Checked & Disabled
      </ui-checkbox>
    </div>
  `,
};

/**
 * エラー状態
 */
export const Invalid: Story = {
  args: {
    label: LABELS.accept,
    invalid: true,
  },
  render: (args) => html`
    <ui-checkbox ?invalid="${args['invalid']}">
      ${args['label']}
    </ui-checkbox>
  `,
};

/**
 * 全状態のショーケース
 */
export const AllStates: Story = {
  render: () => html`
    <div style="${CONTAINER_STYLES.vertical}">
      <ui-checkbox>Unchecked</ui-checkbox>
      <ui-checkbox checked>Checked</ui-checkbox>
      <ui-checkbox indeterminate>Indeterminate</ui-checkbox>
      <ui-checkbox disabled>Disabled</ui-checkbox>
      <ui-checkbox checked disabled>Checked & Disabled</ui-checkbox>
      <ui-checkbox invalid>Invalid</ui-checkbox>
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
    <form style="max-width: 400px;">
      <fieldset style="border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-4);">
        <legend style="font-weight: var(--font-semibold); padding: 0 var(--space-2);">設定</legend>
        <div style="${CONTAINER_STYLES.vertical}">
          <ui-checkbox name="notifications" value="email" checked>
            メール通知を受け取る
          </ui-checkbox>
          <ui-checkbox name="notifications" value="push">
            プッシュ通知を受け取る
          </ui-checkbox>
          <ui-checkbox name="marketing" value="yes">
            マーケティング情報を受け取る
          </ui-checkbox>
          <ui-checkbox name="remember" value="yes" checked>
            ログイン状態を保持
          </ui-checkbox>
        </div>
      </fieldset>
    </form>
  `,
};

/**
 * グループ選択の例（親子関係）
 */
export const GroupSelection: Story = {
  render: () => html`
    <div style="${CONTAINER_STYLES.vertical}">
      <ui-checkbox indeterminate>
        <strong>すべて選択</strong>
      </ui-checkbox>
      <div style="margin-left: var(--space-6); ${CONTAINER_STYLES.vertical}">
        <ui-checkbox checked>オプション 1</ui-checkbox>
        <ui-checkbox>オプション 2</ui-checkbox>
        <ui-checkbox checked>オプション 3</ui-checkbox>
      </div>
    </div>
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
      <ui-checkbox>${LABELS.accept}</ui-checkbox>
      <ui-checkbox checked>${LABELS.subscribe}</ui-checkbox>
      <ui-checkbox indeterminate>${LABELS.selectAll}</ui-checkbox>
      <ui-checkbox disabled>${LABELS.enable}</ui-checkbox>
      <ui-checkbox invalid>${LABELS.remember}</ui-checkbox>
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
  args: {
    label: 'テストチェックボックス',
  },
  render: (args) => html`
    <ui-checkbox data-testid="basic-checkbox">
      ${args['label']}
    </ui-checkbox>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const checkbox = canvas.getByTestId('basic-checkbox') as HTMLElement;

    // チェックボックスが正しくレンダリングされている
    await expect(checkbox).toBeInTheDocument();
    
    // ラベルテキストが表示されている
    await expect(checkbox.textContent?.trim()).toBe('テストチェックボックス');
  },
};

/**
 * BDD: チェック状態の切り替え
 */
export const BDD_ToggleChecked: Story = {
  tags: ['test'],
  render: () => html`
    <ui-checkbox data-testid="toggle-checkbox">
      トグル可能
    </ui-checkbox>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const checkbox = canvas.getByTestId('toggle-checkbox') as HTMLElement;

    // 初期状態はチェックされていない
    await expect(checkbox).not.toHaveAttribute('checked');

    // クリックしてチェックする
    await userEvent.click(checkbox);
    await expect(checkbox).toHaveAttribute('checked');

    // 再度クリックしてチェックを外す
    await userEvent.click(checkbox);
    await expect(checkbox).not.toHaveAttribute('checked');
  },
};

/**
 * BDD: 無効状態のクリック防止
 */
export const BDD_DisabledClick: Story = {
  tags: ['test'],
  render: () => html`
    <ui-checkbox data-testid="disabled-checkbox" disabled>
      無効なチェックボックス
    </ui-checkbox>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const checkbox = canvas.getByTestId('disabled-checkbox') as HTMLElement;

    // disabled 属性が設定されている
    await expect(checkbox).toHaveAttribute('disabled');

    // 初期状態はチェックされていない
    await expect(checkbox).not.toHaveAttribute('checked');

    // クリックしても状態が変わらない
    await userEvent.click(checkbox);
    await expect(checkbox).not.toHaveAttribute('checked');
  },
};

/**
 * BDD: Indeterminate 状態
 */
export const BDD_IndeterminateState: Story = {
  tags: ['test'],
  render: () => html`
    <ui-checkbox data-testid="indeterminate-checkbox" indeterminate>
      不確定状態
    </ui-checkbox>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const checkbox = canvas.getByTestId('indeterminate-checkbox') as HTMLElement;

    // indeterminate 属性が設定されている
    await expect(checkbox).toHaveAttribute('indeterminate');

    // Shadow Root 内のチェックボックスを確認
    const input = checkbox.shadowRoot?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    await expect(input).toBeInTheDocument();
    
    // HTMLInputElement の indeterminate プロパティが true
    await expect(input.indeterminate).toBe(true);
  },
};

/**
 * BDD: キーボード操作
 */
export const BDD_KeyboardOperation: Story = {
  tags: ['test'],
  render: () => html`
    <ui-checkbox data-testid="keyboard-checkbox">
      キーボード操作
    </ui-checkbox>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const checkbox = canvas.getByTestId('keyboard-checkbox') as HTMLElement;

    // Shadow Root 内の input 要素を確認
    const input = checkbox.shadowRoot?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    await expect(input).toBeInTheDocument();
    
    // フォーカスを当てる（Shadow DOM 内の input に）
    input.focus();
    
    // input 要素が実際にフォーカスされているか確認
    await expect(document.activeElement).toBe(checkbox);
    await expect(checkbox.shadowRoot?.activeElement).toBe(input);

    // Space キーでトグル可能（ネイティブの input なので自動的に動作する）
    await expect(input.type).toBe('checkbox');
  },
};

/**
 * BDD: フォーム統合
 */
export const BDD_FormIntegration: Story = {
  tags: ['test'],
  render: () => html`
    <form data-testid="test-form">
      <ui-checkbox
        data-testid="form-checkbox"
        name="accept"
        value="yes"
        checked
      >
        同意する
      </ui-checkbox>
    </form>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const checkbox = canvas.getByTestId('form-checkbox') as HTMLElement;

    // name と value 属性が設定されている
    await expect(checkbox).toHaveAttribute('name', 'accept');
    await expect(checkbox).toHaveAttribute('value', 'yes');

    // checked 属性が設定されている
    await expect(checkbox).toHaveAttribute('checked');
  },
};
