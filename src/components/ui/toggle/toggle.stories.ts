import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, userEvent, within } from 'storybook/test';
import './toggle.ts';

const meta: Meta = {
  title: 'Components/Toggle',
  component: 'ui-toggle',
  tags: ['autodocs'],
  argTypes: {
    checked: {
      control: 'boolean',
      description: 'オン/オフ状態',
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
      description: 'トグルスイッチのサイズ',
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
  notifications: '通知を有効にする',
  darkMode: 'ダークモード',
  autoSave: '自動保存',
  analytics: '分析データを送信',
  experimental: '実験的機能を有効化',
} as const;

// ========================================
// 基本ストーリー
// ========================================

/**
 * 基本的なトグルスイッチ
 */
export const Default: Story = {
  args: {
    label: LABELS.notifications,
    checked: false,
    size: 'md',
    name: 'default-toggle',
    value: 'on',
  },
  render: (args) => html`
    <ui-toggle
      ?checked="${args['checked']}"
      ?disabled="${args['disabled']}"
      ?invalid="${args['invalid']}"
      size="${args['size']}"
      value="${args['value'] || 'toggle-value'}"
      name="${args['name'] || 'toggle-name'}"
    >
      ${args['label']}
    </ui-toggle>
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
    label: LABELS.autoSave,
    name: 'size-demo',
    value: 'small',
  },
  render: (args) => html`
    <ui-toggle
      size="${args['size']}"
      name="${args['name']}"
      value="${args['value']}"
    >
      ${args['label']}
    </ui-toggle>
  `,
};

/**
 * Medium サイズ
 */
export const Medium: Story = {
  args: {
    size: 'md',
    label: LABELS.autoSave,
    name: 'size-demo',
    value: 'medium',
  },
  render: (args) => html`
    <ui-toggle
      size="${args['size']}"
      name="${args['name']}"
      value="${args['value']}"
    >
      ${args['label']}
    </ui-toggle>
  `,
};

/**
 * Large サイズ
 */
export const Large: Story = {
  args: {
    size: 'lg',
    label: LABELS.autoSave,
    name: 'size-demo',
    value: 'large',
  },
  render: (args) => html`
    <ui-toggle
      size="${args['size']}"
      name="${args['name']}"
      value="${args['value']}"
    >
      ${args['label']}
    </ui-toggle>
  `,
};

/**
 * 全サイズのショーケース
 */
export const AllSizes: Story = {
  render: () => html`
    <div style="${CONTAINER_STYLES.vertical}">
      <ui-toggle size="sm" name="all-sizes" value="sm" checked>
        Small - ${LABELS.darkMode}
      </ui-toggle>
      <ui-toggle size="md" name="all-sizes" value="md">
        Medium - ${LABELS.darkMode}
      </ui-toggle>
      <ui-toggle size="lg" name="all-sizes" value="lg">
        Large - ${LABELS.darkMode}
      </ui-toggle>
    </div>
  `,
};

// ========================================
// 状態バリエーション
// ========================================

/**
 * オン状態
 */
export const Checked: Story = {
  args: {
    label: LABELS.notifications,
    checked: true,
    name: 'checked-demo',
    value: 'on',
  },
  render: (args) => html`
    <ui-toggle
      ?checked="${args['checked']}"
      name="${args['name']}"
      value="${args['value']}"
    >
      ${args['label']}
    </ui-toggle>
  `,
};

/**
 * 無効状態
 */
export const Disabled: Story = {
  render: () => html`
    <div style="${CONTAINER_STYLES.vertical}">
      <ui-toggle disabled name="disabled-demo" value="off">
        Off & Disabled
      </ui-toggle>
      <ui-toggle disabled checked name="disabled-demo" value="on">
        On & Disabled
      </ui-toggle>
    </div>
  `,
};

/**
 * エラー状態
 */
export const Invalid: Story = {
  args: {
    label: '必須設定項目',
    invalid: true,
    name: 'invalid-demo',
    value: 'invalid',
  },
  render: (args) => html`
    <ui-toggle
      ?invalid="${args['invalid']}"
      name="${args['name']}"
      value="${args['value']}"
    >
      ${args['label']}
    </ui-toggle>
  `,
};

/**
 * 全状態のショーケース
 */
export const AllStates: Story = {
  render: () => html`
    <div style="${CONTAINER_STYLES.vertical}">
      <ui-toggle name="states" value="off">Off</ui-toggle>
      <ui-toggle name="states" value="on" checked>On</ui-toggle>
      <ui-toggle name="states" value="disabled" disabled>Disabled</ui-toggle>
      <ui-toggle name="states" value="disabled-on" checked disabled>On & Disabled</ui-toggle>
      <ui-toggle name="states" value="invalid" invalid>Invalid</ui-toggle>
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
        <legend style="font-weight: var(--font-semibold); padding: 0 var(--space-2);">プライバシー設定</legend>
        <div style="${CONTAINER_STYLES.vertical}">
          <ui-toggle name="notifications" value="yes" checked>
            プッシュ通知を受け取る
          </ui-toggle>
          <ui-toggle name="analytics" value="yes">
            匿名の分析データを送信
          </ui-toggle>
          <ui-toggle name="marketing" value="yes">
            マーケティングメールを受け取る
          </ui-toggle>
          <ui-toggle name="location" value="yes" checked>
            位置情報を共有
          </ui-toggle>
        </div>
      </fieldset>
    </form>
  `,
};

/**
 * 設定パネルの例
 */
export const SettingsPanel: Story = {
  render: () => html`
    <div style="${CONTAINER_STYLES.vertical}">
      <div>
        <strong>アプリケーション設定</strong>
      </div>
      <div style="margin-left: var(--space-4); ${CONTAINER_STYLES.vertical}">
        <ui-toggle name="dark-mode" value="yes" checked>
          ${LABELS.darkMode}
        </ui-toggle>
        <ui-toggle name="auto-save" value="yes" checked>
          ${LABELS.autoSave}
        </ui-toggle>
        <ui-toggle name="experimental" value="yes">
          ${LABELS.experimental}
        </ui-toggle>
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
      <ui-toggle name="dark-demo" value="option1">オフ</ui-toggle>
      <ui-toggle name="dark-demo" value="option2" checked>オン</ui-toggle>
      <ui-toggle name="dark-demo" value="option3" disabled>無効</ui-toggle>
      <ui-toggle name="dark-demo" value="option4" invalid>エラー</ui-toggle>
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
    label: 'テストトグル',
  },
  render: (args) => html`
    <ui-toggle data-testid="basic-toggle" name="test" value="test">
      ${args['label']}
    </ui-toggle>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const toggle = canvas.getByTestId('basic-toggle') as HTMLElement;

    // トグルが正しくレンダリングされている
    await expect(toggle).toBeInTheDocument();
    
    // ラベルテキストが表示されている
    await expect(toggle.textContent?.trim()).toBe('テストトグル');
  },
};

/**
 * BDD: オン/オフ状態の切り替え
 */
export const BDD_ToggleState: Story = {
  tags: ['test'],
  render: () => html`
    <ui-toggle data-testid="toggle-switch" name="toggle-test" value="test">
      トグル可能
    </ui-toggle>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const toggle = canvas.getByTestId('toggle-switch') as HTMLElement;

    // 初期状態はオフ
    await expect(toggle).not.toHaveAttribute('checked');

    // クリックしてオン
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute('checked');

    // 再度クリックしてオフ
    await userEvent.click(toggle);
    await expect(toggle).not.toHaveAttribute('checked');
  },
};

/**
 * BDD: 無効状態のクリック防止
 */
export const BDD_DisabledClick: Story = {
  tags: ['test'],
  render: () => html`
    <ui-toggle data-testid="disabled-toggle" name="disabled-test" value="disabled" disabled>
      無効なトグル
    </ui-toggle>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const toggle = canvas.getByTestId('disabled-toggle') as HTMLElement;

    // disabled 属性が設定されている
    await expect(toggle).toHaveAttribute('disabled');

    // 初期状態はオフ
    await expect(toggle).not.toHaveAttribute('checked');

    // クリックしても状態が変わらない
    await userEvent.click(toggle);
    await expect(toggle).not.toHaveAttribute('checked');
  },
};

/**
 * BDD: role="switch" の検証
 */
export const BDD_SwitchRole: Story = {
  tags: ['test'],
  render: () => html`
    <ui-toggle data-testid="switch-role-toggle" name="switch-test" value="switch">
      スイッチロール
    </ui-toggle>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const toggle = canvas.getByTestId('switch-role-toggle') as HTMLElement;

    // Shadow Root 内の input 要素を確認
    const input = toggle.shadowRoot?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    await expect(input).toBeInTheDocument();
    
    // role="switch" が設定されている
    await expect(input.getAttribute('role')).toBe('switch');
  },
};

/**
 * BDD: キーボード操作
 */
export const BDD_KeyboardOperation: Story = {
  tags: ['test'],
  render: () => html`
    <ui-toggle data-testid="keyboard-toggle" name="keyboard-test" value="keyboard">
      キーボード操作
    </ui-toggle>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const toggle = canvas.getByTestId('keyboard-toggle') as HTMLElement;

    // Shadow Root 内の input 要素を確認
    const input = toggle.shadowRoot?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    await expect(input).toBeInTheDocument();
    
    // フォーカスを当てる（Shadow DOM 内の input に）
    input.focus();
    
    // input 要素が実際にフォーカスされているか確認
    await expect(document.activeElement).toBe(toggle);
    await expect(toggle.shadowRoot?.activeElement).toBe(input);

    // type が checkbox であることを確認
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
      <ui-toggle
        data-testid="form-toggle"
        name="enabled"
        value="yes"
        checked
      >
        機能を有効化
      </ui-toggle>
    </form>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const toggle = canvas.getByTestId('form-toggle') as HTMLElement;

    // name と value 属性が設定されている
    await expect(toggle).toHaveAttribute('name', 'enabled');
    await expect(toggle).toHaveAttribute('value', 'yes');

    // checked 属性が設定されている
    await expect(toggle).toHaveAttribute('checked');
  },
};
