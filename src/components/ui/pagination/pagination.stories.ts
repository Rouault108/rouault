import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, within } from 'storybook/test';
import { UiPagination } from './pagination';
import './pagination';

const meta: Meta = {
  title: 'Components/UiPagination',
  component: 'ui-pagination',
  tags: ['autodocs'],
  argTypes: {
    currentPage: {
      control: 'number',
      description: '現在のページ番号（1始まり）',
    },
    totalPages: {
      control: 'number',
      description: '総ページ数',
    },
    siblingCount: {
      control: 'number',
      description: '現在のページの両側に表示するページ数',
    },
    variant: {
      control: 'select',
      options: ['default', 'compact'],
      description: 'ページネーションのバリエーション',
    },
    showFirstLast: {
      control: 'boolean',
      description: '最初/最後のページへのボタンを表示',
    },
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
  vertical: 'display: flex; flex-direction: column; gap: 1.5rem; align-items: flex-start;',
} as const;

// ========================================
// 基本ストーリー
// ========================================

/**
 * 基本的なページネーション
 */
export const Default: Story = {
  args: {
    currentPage: 1,
    totalPages: 10,
    siblingCount: 1,
    variant: 'default',
    showFirstLast: false,
  },
  render: (args) => html`
    <ui-pagination
      current-page="${args['currentPage']}"
      total-pages="${args['totalPages']}"
      sibling-count="${args['siblingCount']}"
      variant="${args['variant']}"
      ?show-first-last="${args['showFirstLast']}"
      @page-change="${(e: CustomEvent) => {
        console.log('Page changed to:', e.detail.page);
      }}"
    ></ui-pagination>
  `,
};

/**
 * 中間ページの表示
 */
export const MiddlePage: Story = {
  args: {
    currentPage: 5,
    totalPages: 10,
    siblingCount: 1,
    variant: 'default',
    showFirstLast: false,
  },
  render: (args) => html`
    <ui-pagination
      current-page="${args['currentPage']}"
      total-pages="${args['totalPages']}"
      sibling-count="${args['siblingCount']}"
      variant="${args['variant']}"
      ?show-first-last="${args['showFirstLast']}"
    ></ui-pagination>
  `,
};

/**
 * 最後のページ
 */
export const LastPage: Story = {
  args: {
    currentPage: 10,
    totalPages: 10,
    siblingCount: 1,
    variant: 'default',
    showFirstLast: false,
  },
  render: (args) => html`
    <ui-pagination
      current-page="${args['currentPage']}"
      total-pages="${args['totalPages']}"
      sibling-count="${args['siblingCount']}"
      variant="${args['variant']}"
      ?show-first-last="${args['showFirstLast']}"
    ></ui-pagination>
  `,
};

// ========================================
// バリエーション
// ========================================

/**
 * 最初/最後のページボタン付き
 */
export const WithFirstLast: Story = {
  args: {
    currentPage: 5,
    totalPages: 10,
    siblingCount: 1,
    variant: 'default',
    showFirstLast: true,
  },
  render: (args) => html`
    <ui-pagination
      current-page="${args['currentPage']}"
      total-pages="${args['totalPages']}"
      sibling-count="${args['siblingCount']}"
      variant="${args['variant']}"
      ?show-first-last="${args['showFirstLast']}"
    ></ui-pagination>
  `,
};

/**
 * コンパクトバリアント
 */
export const Compact: Story = {
  args: {
    currentPage: 5,
    totalPages: 10,
    siblingCount: 1,
    variant: 'compact',
    showFirstLast: false,
  },
  render: (args) => html`
    <ui-pagination
      current-page="${args['currentPage']}"
      total-pages="${args['totalPages']}"
      sibling-count="${args['siblingCount']}"
      variant="${args['variant']}"
      ?show-first-last="${args['showFirstLast']}"
    ></ui-pagination>
  `,
};

/**
 * 多くのページ数
 */
export const ManyPages: Story = {
  args: {
    currentPage: 15,
    totalPages: 50,
    siblingCount: 1,
    variant: 'default',
    showFirstLast: true,
  },
  render: (args) => html`
    <ui-pagination
      current-page="${args['currentPage']}"
      total-pages="${args['totalPages']}"
      sibling-count="${args['siblingCount']}"
      variant="${args['variant']}"
      ?show-first-last="${args['showFirstLast']}"
    ></ui-pagination>
  `,
};

/**
 * 少ないページ数（省略なし）
 */
export const FewPages: Story = {
  args: {
    currentPage: 2,
    totalPages: 5,
    siblingCount: 1,
    variant: 'default',
    showFirstLast: false,
  },
  render: (args) => html`
    <ui-pagination
      current-page="${args['currentPage']}"
      total-pages="${args['totalPages']}"
      sibling-count="${args['siblingCount']}"
      variant="${args['variant']}"
      ?show-first-last="${args['showFirstLast']}"
    ></ui-pagination>
  `,
};

/**
 * sibling-count による表示変化
 */
export const SiblingCountVariations: Story = {
  render: () => html`
    <div style="${CONTAINER_STYLES.vertical}">
      <div>
        <h4 style="margin: 0 0 0.5rem 0; font-size: 0.875rem; color: var(--color-foreground-muted);">
          sibling-count = 0
        </h4>
        <ui-pagination
          current-page="5"
          total-pages="10"
          sibling-count="0"
        ></ui-pagination>
      </div>
      <div>
        <h4 style="margin: 0 0 0.5rem 0; font-size: 0.875rem; color: var(--color-foreground-muted);">
          sibling-count = 1 (デフォルト)
        </h4>
        <ui-pagination
          current-page="5"
          total-pages="10"
          sibling-count="1"
        ></ui-pagination>
      </div>
      <div>
        <h4 style="margin: 0 0 0.5rem 0; font-size: 0.875rem; color: var(--color-foreground-muted);">
          sibling-count = 2
        </h4>
        <ui-pagination
          current-page="5"
          total-pages="10"
          sibling-count="2"
        ></ui-pagination>
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
      <ui-pagination
        current-page="1"
        total-pages="10"
        sibling-count="1"
      ></ui-pagination>
      <ui-pagination
        current-page="5"
        total-pages="10"
        sibling-count="1"
        show-first-last
      ></ui-pagination>
      <ui-pagination
        current-page="5"
        total-pages="10"
        sibling-count="1"
        variant="compact"
      ></ui-pagination>
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
    <ui-pagination
      data-testid="pagination"
      current-page="1"
      total-pages="10"
    ></ui-pagination>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const pagination = canvas.getByTestId('pagination') as HTMLElement;

    // ページネーションが正しくレンダリングされている
    await expect(pagination).toBeInTheDocument();
    
    // nav 要素として認識される
    const nav = pagination.shadowRoot?.querySelector('nav');
    await expect(nav).toBeTruthy();
    
    // aria-label が設定されている
    await expect(nav?.getAttribute('aria-label')).toBeTruthy();
  },
};

/**
 * BDD: 現在のページ表示
 */
export const BDD_CurrentPage: Story = {
  tags: ['test'],
  render: () => html`
    <ui-pagination
      data-testid="pagination"
      current-page="3"
      total-pages="10"
    ></ui-pagination>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const pagination = canvas.getByTestId('pagination') as UiPagination;
    await pagination.updateComplete;
    
    // 現在のページボタンが存在し、aria-current が設定されている
    const currentButton = pagination.shadowRoot?.querySelector('[aria-current="page"]');
    await expect(currentButton).toBeTruthy();
    await expect(currentButton?.textContent?.trim()).toBe('3');
  },
};

/**
 * BDD: 前へ/次へボタン
 */
export const BDD_PrevNextButtons: Story = {
  tags: ['test'],
  render: () => html`
    <ui-pagination
      data-testid="pagination"
      current-page="5"
      total-pages="10"
    ></ui-pagination>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const pagination = canvas.getByTestId('pagination') as HTMLElement;
    
    // 前へボタンが存在する
    const prevButton = pagination.shadowRoot?.querySelector('[aria-label*="前"]') ||
                       pagination.shadowRoot?.querySelector('[aria-label*="Previous"]');
    await expect(prevButton).toBeTruthy();
    
    // 次へボタンが存在する
    const nextButton = pagination.shadowRoot?.querySelector('[aria-label*="次"]') ||
                       pagination.shadowRoot?.querySelector('[aria-label*="Next"]');
    await expect(nextButton).toBeTruthy();
  },
};

/**
 * BDD: 最初のページでの前へボタン無効化
 */
export const BDD_FirstPagePrevDisabled: Story = {
  tags: ['test'],
  render: () => html`
    <ui-pagination
      data-testid="pagination"
      current-page="1"
      total-pages="10"
    ></ui-pagination>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const pagination = canvas.getByTestId('pagination') as UiPagination;
    await pagination.updateComplete;
    
    // 前へボタンが無効化されている
    const prevButton = pagination.shadowRoot?.querySelector('[aria-label*="前"]') ||
                       pagination.shadowRoot?.querySelector('[aria-label*="Previous"]');
    await expect(prevButton).toHaveAttribute('disabled');
  },
};

/**
 * BDD: 最後のページでの次へボタン無効化
 */
export const BDD_LastPageNextDisabled: Story = {
  tags: ['test'],
  render: () => html`
    <ui-pagination
      data-testid="pagination"
      current-page="10"
      total-pages="10"
    ></ui-pagination>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const pagination = canvas.getByTestId('pagination') as UiPagination;
    await pagination.updateComplete;
    
    // 次へボタンが無効化されている
    const nextButton = pagination.shadowRoot?.querySelector('[aria-label*="次"]') ||
                       pagination.shadowRoot?.querySelector('[aria-label*="Next"]');
    await expect(nextButton).toHaveAttribute('disabled');
  },
};

/**
 * BDD: ページ変更イベント
 */
export const BDD_PageChange: Story = {
  tags: ['test'],
  render: () => html`
    <ui-pagination
      data-testid="pagination"
      current-page="3"
      total-pages="10"
    ></ui-pagination>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const pagination = canvas.getByTestId('pagination') as HTMLElement;
    
    let eventFired = false;
    let newPage = 0;
    
    pagination.addEventListener('page-change', ((e: CustomEvent) => {
      eventFired = true;
      newPage = e.detail.page;
    }) as EventListener);
    
    // 次へボタンをクリック
    const nextButton = (pagination.shadowRoot?.querySelector('[aria-label*="次"]') ||
                       pagination.shadowRoot?.querySelector('[aria-label*="Next"]')) as HTMLElement;
    nextButton?.click();
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // イベントが発火し、正しいページ番号が渡されている
    await expect(eventFired).toBe(true);
    await expect(newPage).toBe(4);
  },
};

/**
 * BDD: 省略表示
 */
export const BDD_Ellipsis: Story = {
  tags: ['test'],
  render: () => html`
    <ui-pagination
      data-testid="pagination"
      current-page="5"
      total-pages="20"
      sibling-count="1"
    ></ui-pagination>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const pagination = canvas.getByTestId('pagination') as HTMLElement;
    
    // 省略記号（…）が存在する
    const ellipsis = pagination.shadowRoot?.querySelector('.ellipsis');
    await expect(ellipsis).toBeTruthy();
  },
};

/**
 * BDD: 国際化対応
 */
export const BDD_Internationalization: Story = {
  tags: ['test'],
  render: () => html`
    <ui-pagination
      data-testid="pagination"
      current-page="5"
      total-pages="10"
      aria-label="Page navigation"
      prev-label="Previous page"
      next-label="Next page"
    ></ui-pagination>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const pagination = canvas.getByTestId('pagination') as HTMLElement;
    const nav = pagination.shadowRoot?.querySelector('nav');
    
    // カスタム aria-label が適用されている
    await expect(nav?.getAttribute('aria-label')).toBe('Page navigation');
    
    // カスタム前へ/次へラベルが適用されている
    const prevButton = pagination.shadowRoot?.querySelector('[aria-label="Previous page"]');
    const nextButton = pagination.shadowRoot?.querySelector('[aria-label="Next page"]');
    await expect(prevButton).toBeTruthy();
    await expect(nextButton).toBeTruthy();
  },
};
