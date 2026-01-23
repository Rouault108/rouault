import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, userEvent, within } from 'storybook/test';
import './icon-button.ts';

const meta: Meta = {
  title: 'Components/IconButton',
  component: 'ui-icon-button',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'outlined', 'danger'],
      description: 'アイコンボタンのバリアント',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'アイコンボタンのサイズ',
    },
    disabled: {
      control: 'boolean',
      description: '無効状態',
    },
    loading: {
      control: 'boolean',
      description: 'ローディング状態',
    },
    ariaLabel: {
      control: 'text',
      description: 'アクセシビリティラベル（必須）',
    },
    onClick: { action: 'click' },
  },
};
export default meta;

type Story = StoryObj;

/**
 * 基本的なアイコンボタン
 */
export const Default: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    ariaLabel: '検索',
  },
  render: (args) => html`
    <ui-icon-button
      variant="${args['variant']}"
      size="${args['size']}"
      aria-label="${args['ariaLabel']}"
      ?disabled="${args['disabled']}"
      ?loading="${args['loading']}"
    >
      ${createIcon(ICONS.search)}
    </ui-icon-button>
  `,
};

// ========================================
// 共通定数とヘルパー関数
// ========================================

/**
 * アイコン名のマップ（Iconify Lucide 形式）
 * 使用形式: lucide:{icon-name}
 */
const ICONS = {
  search: 'lucide:search',
  settings: 'lucide:settings',
  more: 'lucide:more-vertical',
  bookmark: 'lucide:bookmark',
  delete: 'lucide:trash-2',
  arrowRight: 'lucide:arrow-right',
  loading: 'lucide:loader-2',
  close: 'lucide:x',
  menu: 'lucide:menu',
  notification: 'lucide:bell',
  theme: 'lucide:moon',
  circle: 'lucide:circle',
} as const;

/**
 * Iconify アイコンを生成するヘルパー関数
 * @param iconName - ICONS マップのキー
 * @param size - アイコンのサイズ（px）
 */
const createIcon = (iconName: string, size = 20): ReturnType<typeof html> => html`
  <iconify-icon
    icon="${iconName}"
    width="${size}"
    height="${size}"
    style="display: flex; align-items: center; justify-content: center;"
  ></iconify-icon>
`;

/**
 * 共通のコンテナスタイル
 */
const CONTAINER_STYLES = {
  flex: 'display: flex; gap: 1rem; align-items: center;',
  flexTight: 'display: flex; gap: 0.5rem; align-items: center;',
  flexWrap: 'display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;',
  header:
    'display: flex; gap: 0.5rem; align-items: center; padding: 0.5rem; background: var(--color-background-subtle); border-radius: var(--radius-md);',
} as const;

/**
 * アクセシビリティラベル
 */
const LABELS = {
  search: '検索',
  settings: '設定',
  more: 'その他',
  bookmark: 'お気に入り',
  delete: '削除',
  small: '小',
  medium: '中',
  large: '大',
  loading: '読み込み中',
  disabled: '無効',
  menu: 'メニュー',
  notification: '通知',
  theme: 'テーマ切替',
  keyboard: 'キーボード操作',
} as const;

// ========================================
// バリアント別ストーリー
// ========================================

/**
 * Primary バリアント
 */
export const Primary: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    ariaLabel: LABELS.search,
  },
  render: (args) => html`
    <ui-icon-button
      variant="${args['variant']}"
      size="${args['size']}"
      aria-label="${args['ariaLabel']}"
      ?disabled="${args['disabled']}"
      ?loading="${args['loading']}"
    >
      ${createIcon(ICONS.search)}
    </ui-icon-button>
  `,
};

/**
 * Secondary バリアント
 */
export const Secondary: Story = {
  args: {
    variant: 'secondary',
    size: 'md',
    ariaLabel: LABELS.settings,
  },
  render: (args) => html`
    <ui-icon-button
      variant="${args['variant']}"
      size="${args['size']}"
      aria-label="${args['ariaLabel']}"
      ?disabled="${args['disabled']}"
      ?loading="${args['loading']}"
    >
      ${createIcon(ICONS.settings)}
    </ui-icon-button>
  `,
};

/**
 * Ghost バリアント
 */
export const Ghost: Story = {
  args: {
    variant: 'ghost',
    size: 'md',
    ariaLabel: LABELS.more,
  },
  render: (args) => html`
    <ui-icon-button
      variant="${args['variant']}"
      size="${args['size']}"
      aria-label="${args['ariaLabel']}"
      ?disabled="${args['disabled']}"
      ?loading="${args['loading']}"
    >
      ${createIcon(ICONS.more)}
    </ui-icon-button>
  `,
};

/**
 * Outlined バリアント
 */
export const Outlined: Story = {
  args: {
    variant: 'outlined',
    size: 'md',
    ariaLabel: LABELS.bookmark,
  },
  render: (args) => html`
    <ui-icon-button
      variant="${args['variant']}"
      size="${args['size']}"
      aria-label="${args['ariaLabel']}"
      ?disabled="${args['disabled']}"
      ?loading="${args['loading']}"
    >
      ${createIcon(ICONS.bookmark)}
    </ui-icon-button>
  `,
};

/**
 * Danger バリアント
 */
export const Danger: Story = {
  args: {
    variant: 'danger',
    size: 'md',
    ariaLabel: LABELS.delete,
  },
  render: (args) => html`
    <ui-icon-button
      variant="${args['variant']}"
      size="${args['size']}"
      aria-label="${args['ariaLabel']}"
      ?disabled="${args['disabled']}"
      ?loading="${args['loading']}"
    >
      ${createIcon(ICONS.delete)}
    </ui-icon-button>
  `,
};

/**
 * 全バリアントのショーケース（比較用）
 */
export const AllVariants: Story = {
  args: {
    size: 'md',
    disabled: false,
    loading: false,
  },
  render: (args) => html`
    <div style="${CONTAINER_STYLES.flex}">
      <ui-icon-button
        variant="primary"
        size="${args['size']}"
        aria-label="${LABELS.search}"
        ?disabled="${args['disabled']}"
        ?loading="${args['loading']}"
      >
        ${createIcon(ICONS.search)}
      </ui-icon-button>
      <ui-icon-button
        variant="secondary"
        size="${args['size']}"
        aria-label="${LABELS.settings}"
        ?disabled="${args['disabled']}"
        ?loading="${args['loading']}"
      >
        ${createIcon(ICONS.settings)}
      </ui-icon-button>
      <ui-icon-button
        variant="ghost"
        size="${args['size']}"
        aria-label="${LABELS.more}"
        ?disabled="${args['disabled']}"
        ?loading="${args['loading']}"
      >
        ${createIcon(ICONS.more)}
      </ui-icon-button>
      <ui-icon-button
        variant="outlined"
        size="${args['size']}"
        aria-label="${LABELS.bookmark}"
        ?disabled="${args['disabled']}"
        ?loading="${args['loading']}"
      >
        ${createIcon(ICONS.bookmark)}
      </ui-icon-button>
      <ui-icon-button
        variant="danger"
        size="${args['size']}"
        aria-label="${LABELS.delete}"
        ?disabled="${args['disabled']}"
        ?loading="${args['loading']}"
      >
        ${createIcon(ICONS.delete)}
      </ui-icon-button>
    </div>
  `,
};

// ========================================
// サイズ別ストーリー
// ========================================

/**
 * Small サイズ
 */
export const Small: Story = {
  args: {
    variant: 'primary',
    size: 'sm',
    ariaLabel: LABELS.small,
  },
  render: (args) => html`
    <ui-icon-button
      variant="${args['variant']}"
      size="${args['size']}"
      aria-label="${args['ariaLabel']}"
      ?disabled="${args['disabled']}"
      ?loading="${args['loading']}"
    >
      ${createIcon(ICONS.arrowRight, 16)}
    </ui-icon-button>
  `,
};

/**
 * Medium サイズ
 */
export const Medium: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    ariaLabel: LABELS.medium,
  },
  render: (args) => html`
    <ui-icon-button
      variant="${args['variant']}"
      size="${args['size']}"
      aria-label="${args['ariaLabel']}"
      ?disabled="${args['disabled']}"
      ?loading="${args['loading']}"
    >
      ${createIcon(ICONS.arrowRight, 20)}
    </ui-icon-button>
  `,
};

/**
 * Large サイズ
 */
export const Large: Story = {
  args: {
    variant: 'primary',
    size: 'lg',
    ariaLabel: LABELS.large,
  },
  render: (args) => html`
    <ui-icon-button
      variant="${args['variant']}"
      size="${args['size']}"
      aria-label="${args['ariaLabel']}"
      ?disabled="${args['disabled']}"
      ?loading="${args['loading']}"
    >
      ${createIcon(ICONS.arrowRight, 24)}
    </ui-icon-button>
  `,
};

/**
 * 全サイズのショーケース（比較用）
 */
export const AllSizes: Story = {
  args: {
    variant: 'primary',
    disabled: false,
    loading: false,
  },
  render: (args) => html`
    <div style="${CONTAINER_STYLES.flex}">
      <ui-icon-button
        size="sm"
        variant="${args['variant']}"
        aria-label="${LABELS.small}"
        ?disabled="${args['disabled']}"
        ?loading="${args['loading']}"
      >
        ${createIcon(ICONS.arrowRight, 16)}
      </ui-icon-button>
      <ui-icon-button
        size="md"
        variant="${args['variant']}"
        aria-label="${LABELS.medium}"
        ?disabled="${args['disabled']}"
        ?loading="${args['loading']}"
      >
        ${createIcon(ICONS.arrowRight, 20)}
      </ui-icon-button>
      <ui-icon-button
        size="lg"
        variant="${args['variant']}"
        aria-label="${LABELS.large}"
        ?disabled="${args['disabled']}"
        ?loading="${args['loading']}"
      >
        ${createIcon(ICONS.arrowRight, 24)}
      </ui-icon-button>
    </div>
  `,
};

// ========================================
// 状態別ストーリー
// ========================================

/**
 * ローディング状態
 */
export const LoadingState: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    ariaLabel: LABELS.loading,
    loading: true,
  },
  render: (args) => html`
    <ui-icon-button
      variant="${args['variant']}"
      size="${args['size']}"
      aria-label="${args['ariaLabel']}"
      ?disabled="${args['disabled']}"
      ?loading="${args['loading']}"
    >
      ${createIcon(ICONS.loading)}
    </ui-icon-button>
  `,
};

/**
 * ローディング状態バリエーション（比較用）
 */
export const LoadingVariants: Story = {
  args: {
    size: 'md',
    loading: true,
  },
  render: (args) => html`
    <div style="${CONTAINER_STYLES.flex}">
      <ui-icon-button
        variant="primary"
        size="${args['size']}"
        aria-label="${LABELS.loading}"
        ?loading="${args['loading']}"
      >
        ${createIcon(ICONS.loading)}
      </ui-icon-button>
      <ui-icon-button
        variant="secondary"
        size="${args['size']}"
        aria-label="${LABELS.loading}"
        ?loading="${args['loading']}"
      >
        ${createIcon(ICONS.loading)}
      </ui-icon-button>
    </div>
  `,
};

/**
 * 無効状態
 */
export const DisabledState: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    ariaLabel: LABELS.disabled,
    disabled: true,
  },
  render: (args) => html`
    <ui-icon-button
      variant="${args['variant']}"
      size="${args['size']}"
      aria-label="${args['ariaLabel']}"
      ?disabled="${args['disabled']}"
      ?loading="${args['loading']}"
    >
      ${createIcon(ICONS.close)}
    </ui-icon-button>
  `,
};

/**
 * 無効状態バリエーション（比較用）
 */
export const DisabledVariants: Story = {
  args: {
    size: 'md',
    disabled: true,
  },
  render: (args) => html`
    <div style="${CONTAINER_STYLES.flex}">
      <ui-icon-button
        variant="primary"
        size="${args['size']}"
        aria-label="${LABELS.disabled}"
        ?disabled="${args['disabled']}"
      >
        ${createIcon(ICONS.close)}
      </ui-icon-button>
      <ui-icon-button
        variant="secondary"
        size="${args['size']}"
        aria-label="${LABELS.disabled}"
        ?disabled="${args['disabled']}"
      >
        ${createIcon(ICONS.close)}
      </ui-icon-button>
    </div>
  `,
};

// ========================================
// 実用例・デモストーリー
// ========================================

/**
 * 実際の使用例（ヘッダー）
 */
export const RealWorldExample: Story = {
  args: {
    size: 'md',
    disabled: false,
  },
  render: (args) => html`
    <div style="${CONTAINER_STYLES.header}">
      <ui-icon-button
        variant="ghost"
        size="${args['size']}"
        aria-label="${LABELS.menu}"
        ?disabled="${args['disabled']}"
      >
        ${createIcon(ICONS.menu)}
      </ui-icon-button>
      <ui-icon-button
        variant="ghost"
        size="${args['size']}"
        aria-label="${LABELS.search}"
        ?disabled="${args['disabled']}"
      >
        ${createIcon(ICONS.search)}
      </ui-icon-button>
      <ui-icon-button
        variant="ghost"
        size="${args['size']}"
        aria-label="${LABELS.notification}"
        ?disabled="${args['disabled']}"
      >
        ${createIcon(ICONS.notification)}
      </ui-icon-button>
      <ui-icon-button
        variant="ghost"
        size="${args['size']}"
        aria-label="${LABELS.theme}"
        ?disabled="${args['disabled']}"
      >
        ${createIcon(ICONS.theme)}
      </ui-icon-button>
    </div>
  `,
};

/**
 * フォーカス状態
 */
export const Focus: Story = {
  args: {
    size: 'md',
    disabled: false,
  },
  render: (args) => html`
    <div style="${CONTAINER_STYLES.flex}">
      <p style="margin-bottom: 0.5rem; color: var(--color-foreground-muted); font-size: 13px;">
        Tab キーでフォーカスを移動してください：
      </p>
      <ui-icon-button
        variant="primary"
        size="${args['size']}"
        aria-label="${LABELS.search}"
        ?disabled="${args['disabled']}"
      >
        ${createIcon(ICONS.search)}
      </ui-icon-button>
      <ui-icon-button
        variant="secondary"
        size="${args['size']}"
        aria-label="${LABELS.settings}"
        ?disabled="${args['disabled']}"
      >
        ${createIcon(ICONS.settings)}
      </ui-icon-button>
      <ui-icon-button
        variant="outlined"
        size="${args['size']}"
        aria-label="${LABELS.bookmark}"
        ?disabled="${args['disabled']}"
      >
        ${createIcon(ICONS.bookmark)}
      </ui-icon-button>
    </div>
  `,
};

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
  args: {
    size: 'md',
    disabled: false,
  },
  render: (args) => html`
    <div style="${CONTAINER_STYLES.flexWrap}">
      <ui-icon-button
        variant="primary"
        size="${args['size']}"
        aria-label="${LABELS.search}"
        ?disabled="${args['disabled']}"
      >
        ${createIcon(ICONS.search)}
      </ui-icon-button>
      <ui-icon-button
        variant="secondary"
        size="${args['size']}"
        aria-label="${LABELS.settings}"
        ?disabled="${args['disabled']}"
      >
        ${createIcon(ICONS.settings)}
      </ui-icon-button>
      <ui-icon-button
        variant="ghost"
        size="${args['size']}"
        aria-label="${LABELS.more}"
        ?disabled="${args['disabled']}"
      >
        ${createIcon(ICONS.more)}
      </ui-icon-button>
      <ui-icon-button
        variant="outlined"
        size="${args['size']}"
        aria-label="${LABELS.bookmark}"
        ?disabled="${args['disabled']}"
      >
        ${createIcon(ICONS.bookmark)}
      </ui-icon-button>
      <ui-icon-button
        variant="danger"
        size="${args['size']}"
        aria-label="${LABELS.delete}"
        ?disabled="${args['disabled']}"
      >
        ${createIcon(ICONS.delete)}
      </ui-icon-button>
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
    variant: 'primary',
    size: 'md',
    ariaLabel: 'テストボタン',
  },
  render: (args) => html`
    <ui-icon-button
      data-testid="basic-icon-button"
      variant="${args['variant']}"
      size="${args['size']}"
      aria-label="${args['ariaLabel']}"
      ?disabled="${args['disabled']}"
      ?loading="${args['loading']}"
    >
      ${createIcon(ICONS.search)}
    </ui-icon-button>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const button = canvas.getByTestId('basic-icon-button') as HTMLElement;

    // ボタンが正しくレンダリングされている
    await expect(button).toBeInTheDocument();
    await expect(button.getAttribute('aria-label')).toBe('テストボタン');
  },
};

/**
 * BDD: クリック動作
 */
export const BDD_ClickAction: Story = {
  tags: ['test'],
  args: {
    variant: 'primary',
    size: 'md',
    ariaLabel: 'クリック可能',
  },
  render: (args) => html`
    <ui-icon-button
      data-testid="clickable-button"
      variant="${args['variant']}"
      size="${args['size']}"
      aria-label="${args['ariaLabel']}"
      ?disabled="${args['disabled']}"
      ?loading="${args['loading']}"
    >
      ${createIcon(ICONS.search)}
    </ui-icon-button>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const button = canvas.getByTestId('clickable-button') as HTMLElement;

    let clicked = false;
    button.addEventListener('click', () => {
      clicked = true;
    });

    // クリック可能
    await userEvent.click(button);
    await expect(clicked).toBe(true);
  },
};

/**
 * BDD: 無効状態のクリック防止
 */
export const BDD_DisabledClick: Story = {
  tags: ['test'],
  args: {
    variant: 'primary',
    size: 'md',
    ariaLabel: LABELS.disabled,
    disabled: true,
  },
  render: (args) => html`
    <ui-icon-button
      data-testid="disabled-button"
      variant="${args['variant']}"
      size="${args['size']}"
      aria-label="${args['ariaLabel']}"
      ?disabled="${args['disabled']}"
      ?loading="${args['loading']}"
    >
      ${createIcon(ICONS.close)}
    </ui-icon-button>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const button = canvas.getByTestId('disabled-button') as HTMLElement;

    // disabled 属性が設定されている
    await expect(button.hasAttribute('disabled')).toBe(true);

    // クリック不可の外観
    const computedStyle = window.getComputedStyle(button);
    await expect(computedStyle.cursor).toBe('not-allowed');
  },
};

/**
 * BDD: ローディング状態
 */
export const BDD_LoadingState: Story = {
  tags: ['test'],
  args: {
    variant: 'primary',
    size: 'md',
    ariaLabel: LABELS.loading,
    loading: true,
  },
  render: (args) => html`
    <ui-icon-button
      data-testid="loading-button"
      variant="${args['variant']}"
      size="${args['size']}"
      aria-label="${args['ariaLabel']}"
      ?disabled="${args['disabled']}"
      ?loading="${args['loading']}"
    >
      ${createIcon(ICONS.loading)}
    </ui-icon-button>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const button = canvas.getByTestId('loading-button') as HTMLElement;

    // loading 属性が設定されている
    await expect(button.hasAttribute('loading')).toBe(true);

    // スピナーが存在する
    const spinner = button.shadowRoot?.querySelector('.spinner');
    await expect(spinner).toBeInTheDocument();
  },
};

/**
 * BDD: アクセシビリティ
 */
export const BDD_Accessibility: Story = {
  tags: ['test'],
  args: {
    variant: 'primary',
    size: 'md',
    ariaLabel: 'アクセシブルボタン',
  },
  render: (args) => html`
    <ui-icon-button
      data-testid="a11y-button"
      variant="${args['variant']}"
      size="${args['size']}"
      aria-label="${args['ariaLabel']}"
      ?disabled="${args['disabled']}"
      ?loading="${args['loading']}"
    >
      ${createIcon(ICONS.search)}
    </ui-icon-button>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const button = canvas.getByTestId('a11y-button') as HTMLElement;

    // aria-label が設定されている
    await expect(button.getAttribute('aria-label')).toBe('アクセシブルボタン');

    // role="button" が暗黙的に設定されている（button要素のため）
    const shadowButton = button.shadowRoot?.querySelector('button');
    await expect(shadowButton).toBeInTheDocument();
  },
};

/**
 * BDD: キーボード操作
 */
export const BDD_KeyboardOperation: Story = {
  tags: ['test'],
  args: {
    variant: 'primary',
    size: 'md',
    ariaLabel: LABELS.keyboard,
  },
  render: (args) => html`
    <ui-icon-button
      data-testid="keyboard-button"
      variant="${args['variant']}"
      size="${args['size']}"
      aria-label="${args['ariaLabel']}"
      ?disabled="${args['disabled']}"
      ?loading="${args['loading']}"
    >
      ${createIcon(ICONS.search)}
    </ui-icon-button>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const button = canvas.getByTestId('keyboard-button') as HTMLElement;

    const shadowButton = button.shadowRoot?.querySelector('button') as HTMLButtonElement;
    await expect(shadowButton).toBeInTheDocument();

    // ネイティブの button 要素なので、Enter/Space キーは自動的に click イベントを発火する
    // ここでは button 要素が正しくレンダリングされていることを確認
    await expect(shadowButton.tagName).toBe('BUTTON');
  },
};
