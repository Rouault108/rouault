import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, userEvent, within } from 'storybook/test';
import './icon-button.ts';

const meta: Meta = {
  title: 'Components/UiIconButton',
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
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="11" cy="11" r="8"></circle>
        <path d="m21 21-4.35-4.35"></path>
      </svg>
    </ui-icon-button>
  `,
};

/**
 * バリアント（Primary, Secondary, Ghost, Danger）
 */
export const Variants: Story = {
  render: () => html`
    <div style="display: flex; gap: 1rem; align-items: center;">
      <ui-icon-button variant="primary" aria-label="検索">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
      </ui-icon-button>
      <ui-icon-button variant="secondary" aria-label="設定">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
        </svg>
      </ui-icon-button>
      <ui-icon-button variant="ghost" aria-label="その他">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="1"></circle>
          <circle cx="12" cy="5" r="1"></circle>
          <circle cx="12" cy="19" r="1"></circle>
        </svg>
      </ui-icon-button>
      <ui-icon-button variant="outlined" aria-label="お気に入り">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
      </ui-icon-button>
      <ui-icon-button variant="danger" aria-label="削除">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
        </svg>
      </ui-icon-button>
    </div>
  `,
};

/**
 * サイズバリエーション
 */
export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; gap: 1rem; align-items: center;">
      <ui-icon-button size="sm" aria-label="小">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 12h14M12 5l7 7-7 7"></path>
        </svg>
      </ui-icon-button>
      <ui-icon-button size="md" aria-label="中">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 12h14M12 5l7 7-7 7"></path>
        </svg>
      </ui-icon-button>
      <ui-icon-button size="lg" aria-label="大">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 12h14M12 5l7 7-7 7"></path>
        </svg>
      </ui-icon-button>
    </div>
  `,
};

/**
 * ローディング状態
 */
export const Loading: Story = {
  render: () => html`
    <div style="display: flex; gap: 1rem; align-items: center;">
      <ui-icon-button loading aria-label="読み込み中">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
        </svg>
      </ui-icon-button>
      <ui-icon-button variant="secondary" loading aria-label="読み込み中">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
        </svg>
      </ui-icon-button>
    </div>
  `,
};

/**
 * 無効状態
 */
export const Disabled: Story = {
  render: () => html`
    <div style="display: flex; gap: 1rem; align-items: center;">
      <ui-icon-button disabled aria-label="無効">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="m4.93 4.93 14.14 14.14"></path>
        </svg>
      </ui-icon-button>
      <ui-icon-button variant="secondary" disabled aria-label="無効">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="m4.93 4.93 14.14 14.14"></path>
        </svg>
      </ui-icon-button>
    </div>
  `,
};

/**
 * 実際の使用例（ヘッダー）
 */
export const RealWorldExample: Story = {
  render: () => html`
    <div style="display: flex; gap: 0.5rem; align-items: center; padding: 0.5rem; background: var(--color-background-subtle); border-radius: var(--radius-md);">
      <ui-icon-button variant="ghost" aria-label="メニュー">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="4" x2="20" y1="12" y2="12"></line>
          <line x1="4" x2="20" y1="6" y2="6"></line>
          <line x1="4" x2="20" y1="18" y2="18"></line>
        </svg>
      </ui-icon-button>
      <ui-icon-button variant="ghost" aria-label="検索">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
      </ui-icon-button>
      <ui-icon-button variant="ghost" aria-label="通知">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
        </svg>
      </ui-icon-button>
      <ui-icon-button variant="ghost" aria-label="テーマ切替">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      </ui-icon-button>
    </div>
  `,
};

/**
 * BDD: 基本的なレンダリング
 */
export const BDD_BasicRendering: Story = {
  tags: ['test'],
  render: () => html`
    <ui-icon-button data-testid="basic-icon-button" aria-label="テストボタン">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
      </svg>
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
  render: () => html`
    <ui-icon-button data-testid="clickable-button" aria-label="クリック可能">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
      </svg>
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
  render: () => html`
    <ui-icon-button data-testid="disabled-button" disabled aria-label="無効">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
      </svg>
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
  render: () => html`
    <ui-icon-button data-testid="loading-button" loading aria-label="読み込み中">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
      </svg>
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
  render: () => html`
    <ui-icon-button data-testid="a11y-button" aria-label="アクセシブルボタン">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
      </svg>
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
  render: () => html`
    <ui-icon-button data-testid="keyboard-button" aria-label="キーボード操作">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
      </svg>
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

/**
 * フォーカス状態
 */
export const Focus: Story = {
  render: () => html`
    <div style="display: flex; gap: 1rem; align-items: center;">
      <p style="margin-bottom: 0.5rem; color: var(--color-foreground-muted); font-size: 13px;">
        Tab キーでフォーカスを移動してください：
      </p>
      <ui-icon-button aria-label="検索">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
      </ui-icon-button>
      <ui-icon-button variant="secondary" aria-label="設定">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      </ui-icon-button>
      <ui-icon-button variant="outlined" aria-label="お気に入り">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
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
    (story) => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('data-theme', 'dark');
      wrapper.style.padding = '1rem';
      wrapper.innerHTML = story() as string;
      return wrapper;
    },
  ],
  render: () => html`
    <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
      <ui-icon-button variant="primary" aria-label="検索">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
      </ui-icon-button>
      <ui-icon-button variant="secondary" aria-label="設定">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      </ui-icon-button>
      <ui-icon-button variant="ghost" aria-label="その他">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="1"></circle>
        </svg>
      </ui-icon-button>
      <ui-icon-button variant="outlined" aria-label="お気に入り">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
      </ui-icon-button>
      <ui-icon-button variant="danger" aria-label="削除">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
        </svg>
      </ui-icon-button>
    </div>
  `,
};
