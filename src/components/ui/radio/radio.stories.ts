import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, userEvent, within } from 'storybook/test';
import './radio.ts';

const meta: Meta = {
  title: 'Components/Radio',
  component: 'ui-radio',
  tags: ['autodocs'],
  argTypes: {
    checked: {
      control: 'boolean',
      description: '選択状態',
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
      description: 'ラジオボタンのサイズ',
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
      description: 'グループ識別用のname属性',
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
  option1: 'オプション 1',
  option2: 'オプション 2',
  option3: 'オプション 3',
  small: '小サイズ',
  medium: '中サイズ',
  large: '大サイズ',
} as const;

// ========================================
// 基本ストーリー
// ========================================

/**
 * 基本的なラジオボタン
 */
export const Default: Story = {
  args: {
    label: LABELS.option1,
    checked: false,
    size: 'md',
    name: 'default-radio',
    value: 'option-1',
  },
  render: (args) => html`
    <ui-radio
      ?checked="${args['checked']}"
      ?disabled="${args['disabled']}"
      ?invalid="${args['invalid']}"
      size="${args['size']}"
      value="${args['value'] || 'radio-value'}"
      name="${args['name'] || 'radio-name'}"
    >
      ${args['label']}
    </ui-radio>
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
    label: LABELS.small,
    name: 'size-demo',
    value: 'small',
  },
  render: (args) => html`
    <ui-radio
      size="${args['size']}"
      name="${args['name']}"
      value="${args['value']}"
    >
      ${args['label']}
    </ui-radio>
  `,
};

/**
 * Medium サイズ
 */
export const Medium: Story = {
  args: {
    size: 'md',
    label: LABELS.medium,
    name: 'size-demo',
    value: 'medium',
  },
  render: (args) => html`
    <ui-radio
      size="${args['size']}"
      name="${args['name']}"
      value="${args['value']}"
    >
      ${args['label']}
    </ui-radio>
  `,
};

/**
 * Large サイズ
 */
export const Large: Story = {
  args: {
    size: 'lg',
    label: LABELS.large,
    name: 'size-demo',
    value: 'large',
  },
  render: (args) => html`
    <ui-radio
      size="${args['size']}"
      name="${args['name']}"
      value="${args['value']}"
    >
      ${args['label']}
    </ui-radio>
  `,
};

/**
 * 全サイズのショーケース
 */
export const AllSizes: Story = {
  render: () => html`
    <div style="${CONTAINER_STYLES.vertical}">
      <ui-radio size="sm" name="all-sizes" value="sm" checked>
        Small - ${LABELS.option1}
      </ui-radio>
      <ui-radio size="md" name="all-sizes" value="md">
        Medium - ${LABELS.option2}
      </ui-radio>
      <ui-radio size="lg" name="all-sizes" value="lg">
        Large - ${LABELS.option3}
      </ui-radio>
    </div>
  `,
};

// ========================================
// 状態バリエーション
// ========================================

/**
 * 選択済み状態
 */
export const Checked: Story = {
  args: {
    label: LABELS.option1,
    checked: true,
    name: 'checked-demo',
    value: 'checked',
  },
  render: (args) => html`
    <ui-radio
      ?checked="${args['checked']}"
      name="${args['name']}"
      value="${args['value']}"
    >
      ${args['label']}
    </ui-radio>
  `,
};

/**
 * 無効状態
 */
export const Disabled: Story = {
  render: () => html`
    <div style="${CONTAINER_STYLES.vertical}">
      <ui-radio disabled name="disabled-demo" value="unchecked">
        Unchecked & Disabled
      </ui-radio>
      <ui-radio disabled checked name="disabled-demo" value="checked">
        Checked & Disabled
      </ui-radio>
    </div>
  `,
};

/**
 * エラー状態
 */
export const Invalid: Story = {
  args: {
    label: '必須選択項目',
    invalid: true,
    name: 'invalid-demo',
    value: 'invalid',
  },
  render: (args) => html`
    <ui-radio
      ?invalid="${args['invalid']}"
      name="${args['name']}"
      value="${args['value']}"
    >
      ${args['label']}
    </ui-radio>
  `,
};

/**
 * 全状態のショーケース
 */
export const AllStates: Story = {
  render: () => html`
    <div style="${CONTAINER_STYLES.vertical}">
      <ui-radio name="states" value="unchecked">Unchecked</ui-radio>
      <ui-radio name="states" value="checked" checked>Checked</ui-radio>
      <ui-radio name="states" value="disabled" disabled>Disabled</ui-radio>
      <ui-radio name="states" value="disabled-checked" checked disabled>Checked & Disabled</ui-radio>
      <ui-radio name="states" value="invalid" invalid>Invalid</ui-radio>
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
        <legend style="font-weight: var(--font-semibold); padding: 0 var(--space-2);">通知設定</legend>
        <div style="${CONTAINER_STYLES.vertical}">
          <ui-radio name="notification" value="all" checked>
            すべての通知を受け取る
          </ui-radio>
          <ui-radio name="notification" value="important">
            重要な通知のみ
          </ui-radio>
          <ui-radio name="notification" value="none">
            通知を受け取らない
          </ui-radio>
        </div>
      </fieldset>
    </form>
  `,
};

/**
 * グループ選択の例
 */
export const GroupSelection: Story = {
  render: () => html`
    <div style="${CONTAINER_STYLES.vertical}">
      <div>
        <strong>配送方法を選択:</strong>
      </div>
      <div style="margin-left: var(--space-4); ${CONTAINER_STYLES.vertical}">
        <ui-radio name="shipping" value="standard" checked>
          通常配送（送料無料）
        </ui-radio>
        <ui-radio name="shipping" value="express">
          お急ぎ便（¥500）
        </ui-radio>
        <ui-radio name="shipping" value="overnight">
          翌日配送（¥1,000）
        </ui-radio>
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
      <ui-radio name="dark-demo" value="option1">オプション 1</ui-radio>
      <ui-radio name="dark-demo" value="option2" checked>オプション 2</ui-radio>
      <ui-radio name="dark-demo" value="option3" disabled>オプション 3（無効）</ui-radio>
      <ui-radio name="dark-demo" value="option4" invalid>オプション 4（エラー）</ui-radio>
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
    label: 'テストラジオボタン',
  },
  render: (args) => html`
    <ui-radio data-testid="basic-radio" name="test" value="test">
      ${args['label']}
    </ui-radio>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const radio = canvas.getByTestId('basic-radio') as HTMLElement;

    // ラジオボタンが正しくレンダリングされている
    await expect(radio).toBeInTheDocument();
    
    // ラベルテキストが表示されている
    await expect(radio.textContent?.trim()).toBe('テストラジオボタン');
  },
};

/**
 * BDD: 選択状態の切り替え
 */
export const BDD_ToggleChecked: Story = {
  tags: ['test'],
  render: () => html`
    <div style="${CONTAINER_STYLES.vertical}">
      <ui-radio data-testid="radio-1" name="toggle-test" value="1">
        ラジオ 1
      </ui-radio>
      <ui-radio data-testid="radio-2" name="toggle-test" value="2">
        ラジオ 2
      </ui-radio>
    </div>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const radio1 = canvas.getByTestId('radio-1') as HTMLElement;
    const radio2 = canvas.getByTestId('radio-2') as HTMLElement;

    // 初期状態はどちらも未選択
    await expect(radio1).not.toHaveAttribute('checked');
    await expect(radio2).not.toHaveAttribute('checked');

    // ラジオ1をクリックして選択
    await userEvent.click(radio1);
    await expect(radio1).toHaveAttribute('checked');
    await expect(radio2).not.toHaveAttribute('checked');

    // ラジオ2をクリックすると、ラジオ1は自動的に非選択になる
    await userEvent.click(radio2);
    await expect(radio1).not.toHaveAttribute('checked');
    await expect(radio2).toHaveAttribute('checked');
  },
};

/**
 * BDD: 無効状態のクリック防止
 */
export const BDD_DisabledClick: Story = {
  tags: ['test'],
  render: () => html`
    <ui-radio data-testid="disabled-radio" name="disabled-test" value="disabled" disabled>
      無効なラジオボタン
    </ui-radio>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const radio = canvas.getByTestId('disabled-radio') as HTMLElement;

    // disabled 属性が設定されている
    await expect(radio).toHaveAttribute('disabled');

    // 初期状態は未選択
    await expect(radio).not.toHaveAttribute('checked');

    // クリックしても状態が変わらない
    await userEvent.click(radio);
    await expect(radio).not.toHaveAttribute('checked');
  },
};

/**
 * BDD: グループ動作の検証
 */
export const BDD_GroupBehavior: Story = {
  tags: ['test'],
  render: () => html`
    <div style="${CONTAINER_STYLES.vertical}">
      <ui-radio data-testid="group-radio-1" name="group-test" value="1" checked>
        オプション 1
      </ui-radio>
      <ui-radio data-testid="group-radio-2" name="group-test" value="2">
        オプション 2
      </ui-radio>
      <ui-radio data-testid="group-radio-3" name="group-test" value="3">
        オプション 3
      </ui-radio>
    </div>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const radio1 = canvas.getByTestId('group-radio-1') as HTMLElement;
    const radio2 = canvas.getByTestId('group-radio-2') as HTMLElement;
    const radio3 = canvas.getByTestId('group-radio-3') as HTMLElement;

    // 初期状態: radio1のみ選択
    await expect(radio1).toHaveAttribute('checked');
    await expect(radio2).not.toHaveAttribute('checked');
    await expect(radio3).not.toHaveAttribute('checked');

    // radio2をクリック
    await userEvent.click(radio2);
    await expect(radio1).not.toHaveAttribute('checked');
    await expect(radio2).toHaveAttribute('checked');
    await expect(radio3).not.toHaveAttribute('checked');

    // radio3をクリック
    await userEvent.click(radio3);
    await expect(radio1).not.toHaveAttribute('checked');
    await expect(radio2).not.toHaveAttribute('checked');
    await expect(radio3).toHaveAttribute('checked');
  },
};

/**
 * BDD: キーボード操作
 */
export const BDD_KeyboardOperation: Story = {
  tags: ['test'],
  render: () => html`
    <ui-radio data-testid="keyboard-radio" name="keyboard-test" value="keyboard">
      キーボード操作
    </ui-radio>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const radio = canvas.getByTestId('keyboard-radio') as HTMLElement;

    // Shadow Root 内の input 要素を確認
    const input = radio.shadowRoot?.querySelector('input[type="radio"]') as HTMLInputElement;
    await expect(input).toBeInTheDocument();
    
    // フォーカスを当てる（Shadow DOM 内の input に）
    input.focus();
    
    // input 要素が実際にフォーカスされているか確認
    await expect(document.activeElement).toBe(radio);
    await expect(radio.shadowRoot?.activeElement).toBe(input);

    // type が radio であることを確認
    await expect(input.type).toBe('radio');
  },
};

/**
 * BDD: フォーム統合
 */
export const BDD_FormIntegration: Story = {
  tags: ['test'],
  render: () => html`
    <form data-testid="test-form">
      <ui-radio
        data-testid="form-radio"
        name="agreement"
        value="yes"
        checked
      >
        同意する
      </ui-radio>
    </form>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const radio = canvas.getByTestId('form-radio') as HTMLElement;

    // name と value 属性が設定されている
    await expect(radio).toHaveAttribute('name', 'agreement');
    await expect(radio).toHaveAttribute('value', 'yes');

    // checked 属性が設定されている
    await expect(radio).toHaveAttribute('checked');
  },
};
