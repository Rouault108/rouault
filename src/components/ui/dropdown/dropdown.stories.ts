import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, userEvent, within } from 'storybook/test';
import './dropdown.ts';

const meta: Meta = {
  title: 'Components/Dropdown',
  component: 'ui-dropdown',
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'ラベルテキスト',
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
      description: 'ドロップダウンのサイズ',
    },
    variant: {
      control: 'select',
      options: ['outlined', 'filled', 'standard'],
      description: 'スタイルバリアント',
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
  vertical: 'display: flex; flex-direction: column; gap: 1.5rem;',
} as const;

/**
 * サンプルオプション
 */
const OPTIONS = {
  countries: [
    { value: '', label: '国を選択してください' },
    { value: 'jp', label: '日本' },
    { value: 'us', label: 'アメリカ' },
    { value: 'uk', label: 'イギリス' },
    { value: 'fr', label: 'フランス' },
    { value: 'de', label: 'ドイツ' },
  ],
  priorities: [
    { value: 'low', label: '低' },
    { value: 'medium', label: '中' },
    { value: 'high', label: '高' },
    { value: 'urgent', label: '緊急' },
  ],
  sizes: [
    { value: 'xs', label: 'XS' },
    { value: 's', label: 'S' },
    { value: 'm', label: 'M' },
    { value: 'l', label: 'L' },
    { value: 'xl', label: 'XL' },
  ],
} as const;

// ========================================
// 基本ストーリー
// ========================================

/**
 * 基本的なドロップダウン
 */
export const Default: Story = {
  args: {
    label: '国',
    size: 'md',
    variant: 'outlined',
    name: 'country',
  },
  render: (args) => html`
    <ui-dropdown
      label="${args['label']}"
      ?disabled="${args['disabled']}"
      ?invalid="${args['invalid']}"
      size="${args['size']}"
      variant="${args['variant']}"
      name="${args['name'] || 'dropdown-name'}"
    >
      ${OPTIONS.countries.map(
        (opt) => html`<option value="${opt.value}">${opt.label}</option>`
      )}
    </ui-dropdown>
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
    label: '優先度',
    variant: 'outlined',
    name: 'priority-outlined',
  },
  render: (args) => html`
    <ui-dropdown
      label="${args['label']}"
      variant="${args['variant']}"
      name="${args['name']}"
    >
      ${OPTIONS.priorities.map(
        (opt) => html`<option value="${opt.value}">${opt.label}</option>`
      )}
    </ui-dropdown>
  `,
};

/**
 * Filled バリアント
 */
export const Filled: Story = {
  args: {
    label: '優先度',
    variant: 'filled',
    name: 'priority-filled',
  },
  render: (args) => html`
    <ui-dropdown
      label="${args['label']}"
      variant="${args['variant']}"
      name="${args['name']}"
    >
      ${OPTIONS.priorities.map(
        (opt) => html`<option value="${opt.value}">${opt.label}</option>`
      )}
    </ui-dropdown>
  `,
};

/**
 * Standard バリアント
 */
export const Standard: Story = {
  args: {
    label: '優先度',
    variant: 'standard',
    name: 'priority-standard',
  },
  render: (args) => html`
    <ui-dropdown
      label="${args['label']}"
      variant="${args['variant']}"
      name="${args['name']}"
    >
      ${OPTIONS.priorities.map(
        (opt) => html`<option value="${opt.value}">${opt.label}</option>`
      )}
    </ui-dropdown>
  `,
};

/**
 * 全バリアントのショーケース
 */
export const AllVariants: Story = {
  render: () => html`
    <div style="${CONTAINER_STYLES.vertical}">
      <ui-dropdown label="Outlined" variant="outlined" name="variant-outlined">
        ${OPTIONS.priorities.map(
          (opt) => html`<option value="${opt.value}">${opt.label}</option>`
        )}
      </ui-dropdown>
      <ui-dropdown label="Filled" variant="filled" name="variant-filled">
        ${OPTIONS.priorities.map(
          (opt) => html`<option value="${opt.value}">${opt.label}</option>`
        )}
      </ui-dropdown>
      <ui-dropdown label="Standard" variant="standard" name="variant-standard">
        ${OPTIONS.priorities.map(
          (opt) => html`<option value="${opt.value}">${opt.label}</option>`
        )}
      </ui-dropdown>
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
    label: 'サイズ',
    size: 'sm',
    name: 'size-sm',
  },
  render: (args) => html`
    <ui-dropdown
      label="${args['label']}"
      size="${args['size']}"
      name="${args['name']}"
    >
      ${OPTIONS.sizes.map(
        (opt) => html`<option value="${opt.value}">${opt.label}</option>`
      )}
    </ui-dropdown>
  `,
};

/**
 * Medium サイズ
 */
export const Medium: Story = {
  args: {
    label: 'サイズ',
    size: 'md',
    name: 'size-md',
  },
  render: (args) => html`
    <ui-dropdown
      label="${args['label']}"
      size="${args['size']}"
      name="${args['name']}"
    >
      ${OPTIONS.sizes.map(
        (opt) => html`<option value="${opt.value}">${opt.label}</option>`
      )}
    </ui-dropdown>
  `,
};

/**
 * Large サイズ
 */
export const Large: Story = {
  args: {
    label: 'サイズ',
    size: 'lg',
    name: 'size-lg',
  },
  render: (args) => html`
    <ui-dropdown
      label="${args['label']}"
      size="${args['size']}"
      name="${args['name']}"
    >
      ${OPTIONS.sizes.map(
        (opt) => html`<option value="${opt.value}">${opt.label}</option>`
      )}
    </ui-dropdown>
  `,
};

/**
 * 全サイズのショーケース
 */
export const AllSizes: Story = {
  render: () => html`
    <div style="${CONTAINER_STYLES.vertical}">
      <ui-dropdown label="Small" size="sm" name="all-sizes-sm">
        ${OPTIONS.countries.map(
          (opt) => html`<option value="${opt.value}">${opt.label}</option>`
        )}
      </ui-dropdown>
      <ui-dropdown label="Medium" size="md" name="all-sizes-md">
        ${OPTIONS.countries.map(
          (opt) => html`<option value="${opt.value}">${opt.label}</option>`
        )}
      </ui-dropdown>
      <ui-dropdown label="Large" size="lg" name="all-sizes-lg">
        ${OPTIONS.countries.map(
          (opt) => html`<option value="${opt.value}">${opt.label}</option>`
        )}
      </ui-dropdown>
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
    label: '無効なドロップダウン',
    disabled: true,
    name: 'disabled-dropdown',
  },
  render: (args) => html`
    <ui-dropdown
      label="${args['label']}"
      ?disabled="${args['disabled']}"
      name="${args['name']}"
    >
      ${OPTIONS.countries.map(
        (opt) => html`<option value="${opt.value}">${opt.label}</option>`
      )}
    </ui-dropdown>
  `,
};

/**
 * エラー状態
 */
export const Invalid: Story = {
  args: {
    label: '国（必須）',
    invalid: true,
    name: 'invalid-dropdown',
  },
  render: (args) => html`
    <ui-dropdown
      label="${args['label']}"
      ?invalid="${args['invalid']}"
      name="${args['name']}"
    >
      ${OPTIONS.countries.map(
        (opt) => html`<option value="${opt.value}">${opt.label}</option>`
      )}
    </ui-dropdown>
  `,
};

/**
 * 全状態のショーケース
 */
export const AllStates: Story = {
  render: () => html`
    <div style="${CONTAINER_STYLES.vertical}">
      <ui-dropdown label="通常" name="state-normal">
        ${OPTIONS.priorities.map(
          (opt) => html`<option value="${opt.value}">${opt.label}</option>`
        )}
      </ui-dropdown>
      <ui-dropdown label="無効" disabled name="state-disabled">
        ${OPTIONS.priorities.map(
          (opt) => html`<option value="${opt.value}">${opt.label}</option>`
        )}
      </ui-dropdown>
      <ui-dropdown label="エラー" invalid name="state-invalid">
        ${OPTIONS.priorities.map(
          (opt) => html`<option value="${opt.value}">${opt.label}</option>`
        )}
      </ui-dropdown>
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
        <legend style="font-weight: var(--font-semibold); padding: 0 var(--space-2);">ユーザー情報</legend>
        <div style="${CONTAINER_STYLES.vertical}">
          <ui-dropdown label="国" name="country" variant="outlined">
            ${OPTIONS.countries.map(
              (opt) => html`<option value="${opt.value}">${opt.label}</option>`
            )}
          </ui-dropdown>
          <ui-dropdown label="優先度" name="priority" variant="outlined">
            ${OPTIONS.priorities.map(
              (opt) => html`<option value="${opt.value}">${opt.label}</option>`
            )}
          </ui-dropdown>
          <ui-dropdown label="サイズ" name="size" variant="outlined">
            ${OPTIONS.sizes.map(
              (opt) => html`<option value="${opt.value}">${opt.label}</option>`
            )}
          </ui-dropdown>
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
      <ui-dropdown label="Outlined" variant="outlined" name="dark-outlined">
        ${OPTIONS.countries.map(
          (opt) => html`<option value="${opt.value}">${opt.label}</option>`
        )}
      </ui-dropdown>
      <ui-dropdown label="Filled" variant="filled" name="dark-filled">
        ${OPTIONS.priorities.map(
          (opt) => html`<option value="${opt.value}">${opt.label}</option>`
        )}
      </ui-dropdown>
      <ui-dropdown label="Standard" variant="standard" name="dark-standard">
        ${OPTIONS.sizes.map(
          (opt) => html`<option value="${opt.value}">${opt.label}</option>`
        )}
      </ui-dropdown>
      <ui-dropdown label="Disabled" disabled name="dark-disabled">
        ${OPTIONS.countries.map(
          (opt) => html`<option value="${opt.value}">${opt.label}</option>`
        )}
      </ui-dropdown>
      <ui-dropdown label="Invalid" invalid name="dark-invalid">
        ${OPTIONS.countries.map(
          (opt) => html`<option value="${opt.value}">${opt.label}</option>`
        )}
      </ui-dropdown>
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
    <ui-dropdown data-testid="basic-dropdown" label="テストドロップダウン" name="test">
      <option value="">選択してください</option>
      <option value="opt1">オプション 1</option>
      <option value="opt2">オプション 2</option>
    </ui-dropdown>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const dropdown = canvas.getByTestId('basic-dropdown') as HTMLElement;

    // ドロップダウンが正しくレンダリングされている
    await expect(dropdown).toBeInTheDocument();
    
    // ラベルが表示されている
    const label = dropdown.shadowRoot?.querySelector('.label');
    await expect(label?.textContent?.trim()).toBe('テストドロップダウン');
  },
};

/**
 * BDD: 選択状態の変更
 */
export const BDD_SelectOption: Story = {
  tags: ['test'],
  render: () => html`
    <ui-dropdown data-testid="select-dropdown" label="選択テスト" name="select-test">
      <option value="">選択してください</option>
      <option value="opt1">オプション 1</option>
      <option value="opt2">オプション 2</option>
      <option value="opt3">オプション 3</option>
    </ui-dropdown>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const dropdown = canvas.getByTestId('select-dropdown') as HTMLElement;
    const select = dropdown.shadowRoot?.querySelector('select') as HTMLSelectElement;

    // 初期値は空
    await expect(select.value).toBe('');

    // オプション 2 を選択
    await userEvent.selectOptions(select, 'opt2');
    await expect(select.value).toBe('opt2');
  },
};

/**
 * BDD: 無効状態のインタラクション防止
 */
export const BDD_DisabledState: Story = {
  tags: ['test'],
  render: () => html`
    <ui-dropdown data-testid="disabled-dropdown" label="無効なドロップダウン" disabled name="disabled-test">
      <option value="opt1">オプション 1</option>
      <option value="opt2">オプション 2</option>
    </ui-dropdown>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const dropdown = canvas.getByTestId('disabled-dropdown') as HTMLElement;

    // disabled 属性が設定されている
    await expect(dropdown).toHaveAttribute('disabled');

    // Shadow Root 内の select 要素も disabled
    const select = dropdown.shadowRoot?.querySelector('select') as HTMLSelectElement;
    await expect(select.disabled).toBe(true);
  },
};

/**
 * BDD: フォーカス状態
 */
export const BDD_FocusState: Story = {
  tags: ['test'],
  render: () => html`
    <ui-dropdown data-testid="focus-dropdown" label="フォーカステスト" name="focus-test">
      <option value="opt1">オプション 1</option>
      <option value="opt2">オプション 2</option>
    </ui-dropdown>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const dropdown = canvas.getByTestId('focus-dropdown') as HTMLElement;
    const select = dropdown.shadowRoot?.querySelector('select') as HTMLSelectElement;

    // フォーカスを当てる
    select.focus();
    
    // フォーカスされているか確認
    await expect(document.activeElement).toBe(dropdown);
    await expect(dropdown.shadowRoot?.activeElement).toBe(select);
  },
};

/**
 * BDD: フォーム統合
 */
export const BDD_FormIntegration: Story = {
  tags: ['test'],
  render: () => html`
    <form data-testid="test-form">
      <ui-dropdown
        data-testid="form-dropdown"
        label="国"
        name="country"
      >
        <option value="">選択してください</option>
        <option value="jp" selected>日本</option>
        <option value="us">アメリカ</option>
      </ui-dropdown>
    </form>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const dropdown = canvas.getByTestId('form-dropdown') as HTMLElement;
    const select = dropdown.shadowRoot?.querySelector('select') as HTMLSelectElement;

    // name 属性が設定されている
    await expect(dropdown).toHaveAttribute('name', 'country');

    // 選択された値が反映されている
    await expect(select.value).toBe('jp');
  },
};

/**
 * BDD: ダークモードスタイル検証
 */
export const BDD_DarkModeStyles: Story = {
  tags: ['test'],
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
    <ui-dropdown data-testid="dark-dropdown" label="ダークモード" name="dark-test">
      <option value="opt1">オプション 1</option>
      <option value="opt2">オプション 2</option>
    </ui-dropdown>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const dropdown = canvas.getByTestId('dark-dropdown') as HTMLElement;
    const select = dropdown.shadowRoot?.querySelector('select') as HTMLSelectElement;

    // ドロップダウンが正しくレンダリングされている
    await expect(dropdown).toBeInTheDocument();
    await expect(select).toBeInTheDocument();

    // ダークモード用のCSS変数が適用されているかは視覚的に確認
    // (スナップショットテストや視覚回帰テストで検証推奨)
  },
};

/**
 * BDD: prefers-reduced-motion 対応検証
 */
export const BDD_ReducedMotion: Story = {
  tags: ['test'],
  render: () => html`
    <style>
      @media (prefers-reduced-motion: reduce) {
        .reduced-motion-test * {
          transition-duration: 0.01ms !important;
        }
      }
    </style>
    <div class="reduced-motion-test">
      <ui-dropdown data-testid="reduced-motion-dropdown" label="モーション軽減" name="motion-test">
        <option value="opt1">オプション 1</option>
        <option value="opt2">オプション 2</option>
      </ui-dropdown>
    </div>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const dropdown = canvas.getByTestId('reduced-motion-dropdown') as HTMLElement;
    
    // コンポーネントが正しくレンダリングされている
    await expect(dropdown).toBeInTheDocument();

    // トランジションが無効化されているかは視覚的に確認
    // (Cypressなどでアニメーション時間を検証することも可能)
  },
};

/**
 * BDD: Invalid状態の視覚検証
 */
export const BDD_InvalidState: Story = {
  tags: ['test'],
  render: () => html`
    <ui-dropdown 
      data-testid="invalid-dropdown" 
      label="必須フィールド"
      name="invalid-test"
      invalid
      errorMessage="このフィールドは必須です"
    >
      <option value="">選択してください</option>
      <option value="opt1">オプション 1</option>
      <option value="opt2">オプション 2</option>
    </ui-dropdown>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const dropdown = canvas.getByTestId('invalid-dropdown') as HTMLElement;
    const select = dropdown.shadowRoot?.querySelector('select') as HTMLSelectElement;
    const errorMessage = dropdown.shadowRoot?.querySelector('.error-message');
    const arrowIcon = dropdown.shadowRoot?.querySelector('.arrow-icon');

    // invalid 属性が設定されている
    await expect(dropdown).toHaveAttribute('invalid');

    // aria-invalid が設定されている
    await expect(select.getAttribute('aria-invalid')).toBe('true');

    // エラーメッセージが表示されている
    await expect(errorMessage).toBeInTheDocument();
    await expect(errorMessage?.textContent).toBe('このフィールドは必須です');

    // aria-describedby がエラーメッセージを参照している
    await expect(select.getAttribute('aria-describedby')).toContain('error-message');

    // 矢印アイコンがエラー色になっている（視覚的確認推奨）
    await expect(arrowIcon).toBeInTheDocument();
  },
};

/**
 * BDD: ヘルパーテキスト表示
 */
export const BDD_HelperText: Story = {
  tags: ['test'],
  render: () => html`
    <ui-dropdown 
      data-testid="helper-dropdown" 
      label="国"
      name="helper-test"
      helper="お住まいの国を選択してください"
    >
      <option value="">選択してください</option>
      <option value="jp">日本</option>
      <option value="us">アメリカ</option>
    </ui-dropdown>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const dropdown = canvas.getByTestId('helper-dropdown') as HTMLElement;
    const select = dropdown.shadowRoot?.querySelector('select') as HTMLSelectElement;
    const helperText = dropdown.shadowRoot?.querySelector('.helper-text');

    // ヘルパーテキストが表示されている
    await expect(helperText).toBeInTheDocument();
    await expect(helperText?.textContent).toBe('お住まいの国を選択してください');

    // aria-describedby がヘルパーテキストを参照している
    await expect(select.getAttribute('aria-describedby')).toContain('helper-text');
  },
};

/**
 * BDD: キーボードナビゲーション
 */
export const BDD_KeyboardNavigation: Story = {
  tags: ['test'],
  render: () => html`
    <ui-dropdown data-testid="keyboard-dropdown" label="キーボードテスト" name="keyboard-test">
      <option value="">選択してください</option>
      <option value="opt1">オプション 1</option>
      <option value="opt2">オプション 2</option>
      <option value="opt3">オプション 3</option>
    </ui-dropdown>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const dropdown = canvas.getByTestId('keyboard-dropdown') as HTMLElement;
    const select = dropdown.shadowRoot?.querySelector('select') as HTMLSelectElement;

    // Tabキーでフォーカス
    await userEvent.tab();
    
    // フォーカスされているか確認
    await expect(dropdown.shadowRoot?.activeElement).toBe(select);

    // 初期値は空
    await expect(select.value).toBe('');

    // 矢印キーで選択（下矢印）
    await userEvent.keyboard('{ArrowDown}');
    await expect(select.value).toBe('opt1');

    await userEvent.keyboard('{ArrowDown}');
    await expect(select.value).toBe('opt2');

    // 上矢印で戻る
    await userEvent.keyboard('{ArrowUp}');
    await expect(select.value).toBe('opt1');
  },
};

/**
 * BDD: Optgroup サポート
 */
export const BDD_OptgroupSupport: Story = {
  tags: ['test'],
  render: () => html`
    <ui-dropdown data-testid="optgroup-dropdown" label="カテゴリ別" name="optgroup-test">
      <option value="">選択してください</option>
      <optgroup label="果物">
        <option value="apple">りんご</option>
        <option value="banana">バナナ</option>
      </optgroup>
      <optgroup label="野菜">
        <option value="carrot">にんじん</option>
        <option value="potato">じゃがいも</option>
      </optgroup>
    </ui-dropdown>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const dropdown = canvas.getByTestId('optgroup-dropdown') as HTMLElement;
    const select = dropdown.shadowRoot?.querySelector('select') as HTMLSelectElement;

    // optgroup が正しく同期されている
    const optgroups = select.querySelectorAll('optgroup');
    await expect(optgroups.length).toBe(2);
    
    if (optgroups[0] && optgroups[1]) {
      await expect(optgroups[0].label).toBe('果物');
      await expect(optgroups[1].label).toBe('野菜');
    }

    // オプションが正しく配置されている
    const options = select.querySelectorAll('option');
    await expect(options.length).toBeGreaterThan(4); // placeholder + 4 items
  },
};

/**
 * BDD: ハイコントラストモード
 */
export const BDD_HighContrastMode: Story = {
  tags: ['test'],
  parameters: {
    docs: {
      description: {
        story: 'Windows High Contrast Mode での表示を確認します。実際のテストはWindows環境で手動で行う必要があります。',
      },
    },
  },
  render: () => html`
    <style>
      /* ハイコントラストモードをシミュレート */
      @media (forced-colors: active) {
        .high-contrast-test select {
          border: 2px solid ButtonBorder;
        }
      }
    </style>
    <div class="high-contrast-test">
      <ui-dropdown data-testid="high-contrast-dropdown" label="ハイコントラスト" name="contrast-test">
        <option value="opt1">オプション 1</option>
        <option value="opt2">オプション 2</option>
      </ui-dropdown>
    </div>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const dropdown = canvas.getByTestId('high-contrast-dropdown') as HTMLElement;
    
    // コンポーネントが正しくレンダリングされている
    await expect(dropdown).toBeInTheDocument();

    // 実際のハイコントラストモード対応は、Windows環境での手動テストで確認
  },
};

/**
 * BDD: 動的オプション更新
 */
export const BDD_DynamicOptions: Story = {
  tags: ['test'],
  render: () => html`
    <div>
      <ui-dropdown data-testid="dynamic-dropdown" label="動的更新" name="dynamic-test">
        <option value="initial">初期オプション</option>
      </ui-dropdown>
      <button 
        data-testid="add-option-button"
        @click=${(e: Event) => {
          const dropdown = (e.target as HTMLElement).parentElement?.querySelector('ui-dropdown');
          if (dropdown) {
            const newOption = document.createElement('option');
            newOption.value = 'new';
            newOption.textContent = '新しいオプション';
            dropdown.appendChild(newOption);
          }
        }}
      >
        オプション追加
      </button>
    </div>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const dropdown = canvas.getByTestId('dynamic-dropdown') as HTMLElement;
    const select = dropdown.shadowRoot?.querySelector('select') as HTMLSelectElement;
    const addButton = canvas.getByTestId('add-option-button') as HTMLButtonElement;

    // 初期状態: 1つのオプションのみ
    const initialOptions = select.querySelectorAll('option');
    await expect(initialOptions.length).toBe(1);

    // オプションを追加
    await userEvent.click(addButton);

    // 少し待機（slotchangeイベントの処理を待つ）
    await new Promise(resolve => setTimeout(resolve, 100));

    // 新しいオプションが追加されている
    const updatedOptions = select.querySelectorAll('option');
    await expect(updatedOptions.length).toBe(2);
    await expect(updatedOptions[1]?.value).toBe('new');
  },
};
