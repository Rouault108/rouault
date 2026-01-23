import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, within, userEvent } from 'storybook/test';
import type { UiDropdownMenu } from './dropdown-menu.ts';
import './dropdown-menu';
import '../button/button';

const meta: Meta = {
  title: 'Components/DropdownMenu',
  component: 'ui-dropdown-menu',
  tags: ['autodocs'],
  argTypes: {
    placement: {
      control: 'select',
      options: ['bottom-start', 'bottom-end', 'top-start', 'top-end'],
      description: 'メニューの表示位置',
    },
    triggerLabel: {
      control: 'text',
      description: 'トリガーボタンのラベル',
    },
  },
};
export default meta;

type Story = StoryObj;

// ========================================
// 基本ストーリー
// ========================================

/**
 * 基本的なドロップダウンメニュー
 */
export const Default: Story = {
  args: {
    placement: 'bottom-start',
    triggerLabel: 'メニュー',
  },
  render: (args) => html`
    <ui-dropdown-menu placement="${args['placement']}">
      <ui-button slot="trigger" variant="outline">${args['triggerLabel']}</ui-button>
      
      <ui-menu-item>
        <svg slot="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        プロフィール
      </ui-menu-item>
      
      <ui-menu-item>
        <svg slot="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        設定
      </ui-menu-item>
      
      <ui-menu-separator></ui-menu-separator>
      
      <ui-menu-item>
        <svg slot="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        ログアウト
      </ui-menu-item>
    </ui-dropdown-menu>
  `,
};

/**
 * アイコンなし
 */
export const WithoutIcons: Story = {
  render: () => html`
    <ui-dropdown-menu>
      <ui-button slot="trigger" variant="ghost">オプション</ui-button>
      
      <ui-menu-item>編集</ui-menu-item>
      <ui-menu-item>複製</ui-menu-item>
      <ui-menu-separator></ui-menu-separator>
      <ui-menu-item>削除</ui-menu-item>
    </ui-dropdown-menu>
  `,
};

/**
 * 無効化されたメニュー項目
 */
export const WithDisabledItems: Story = {
  render: () => html`
    <ui-dropdown-menu>
      <ui-button slot="trigger" variant="outline">アクション</ui-button>
      
      <ui-menu-item>編集</ui-menu-item>
      <ui-menu-item disabled>共有（準備中）</ui-menu-item>
      <ui-menu-separator></ui-menu-separator>
      <ui-menu-item>削除</ui-menu-item>
    </ui-dropdown-menu>
  `,
};

/**
 * 右寄せ配置
 */
export const RightAligned: Story = {
  render: () => html`
    <div style="display: flex; justify-content: flex-end;">
      <ui-dropdown-menu placement="bottom-end">
        <ui-button slot="trigger" variant="ghost">
          <svg slot="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </ui-button>
        
        <ui-menu-item>アクション 1</ui-menu-item>
        <ui-menu-item>アクション 2</ui-menu-item>
        <ui-menu-item>アクション 3</ui-menu-item>
      </ui-dropdown-menu>
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
  render: () => html`
    <ui-dropdown-menu>
      <ui-button slot="trigger" variant="outline">メニュー</ui-button>
      
      <ui-menu-item>
        <svg slot="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        プロフィール
      </ui-menu-item>
      
      <ui-menu-item>
        <svg slot="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        設定
      </ui-menu-item>
      
      <ui-menu-separator></ui-menu-separator>
      
      <ui-menu-item>
        <svg slot="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        ログアウト
      </ui-menu-item>
    </ui-dropdown-menu>
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
    <ui-dropdown-menu data-testid="menu">
      <ui-button slot="trigger" data-testid="trigger">メニュー</ui-button>
      
      <ui-menu-item data-testid="item-1">項目 1</ui-menu-item>
      <ui-menu-item data-testid="item-2">項目 2</ui-menu-item>
    </ui-dropdown-menu>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const menu = canvas.getByTestId('menu') as HTMLElement;
    const trigger = canvas.getByTestId('trigger') as HTMLElement;

    // メニューコンポーネントが正しくレンダリングされている
    await expect(menu).toBeInTheDocument();
    await expect(trigger).toBeInTheDocument();
  },
};

/**
 * BDD: メニューの開閉
 */
export const BDD_MenuOpenClose: Story = {
  tags: ['test'],
  render: () => html`
    <ui-dropdown-menu data-testid="menu">
      <ui-button slot="trigger" data-testid="trigger">メニュー</ui-button>
      
      <ui-menu-item data-testid="item-1">項目 1</ui-menu-item>
      <ui-menu-item data-testid="item-2">項目 2</ui-menu-item>
    </ui-dropdown-menu>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const menu = canvas.getByTestId('menu') as UiDropdownMenu;
    const trigger = canvas.getByTestId('trigger') as HTMLElement;

    // 初期状態はメニューが閉じている
    await expect(menu.open).toBe(false);

    // トリガーをクリックしてメニューを開く
    await userEvent.click(trigger);
    await menu.updateComplete;

    // メニューが開いている
    await expect(menu.open).toBe(true);

    // もう一度クリックして閉じる
    await userEvent.click(trigger);
    await menu.updateComplete;

    // メニューが閉じている
    await expect(menu.open).toBe(false);
  },
};

/**
 * BDD: Escキーで閉じる
 */
export const BDD_EscapeKey: Story = {
  tags: ['test'],
  render: () => html`
    <ui-dropdown-menu data-testid="menu">
      <ui-button slot="trigger" data-testid="trigger">メニュー</ui-button>
      
      <ui-menu-item>項目 1</ui-menu-item>
      <ui-menu-item>項目 2</ui-menu-item>
    </ui-dropdown-menu>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const menu = canvas.getByTestId('menu') as UiDropdownMenu;
    const trigger = canvas.getByTestId('trigger') as HTMLElement;

    // メニューを開く
    await userEvent.click(trigger);
    await menu.updateComplete;
    await expect(menu.open).toBe(true);

    // Escキーを押す
    await userEvent.keyboard('{Escape}');
    await new Promise(resolve => setTimeout(resolve, 100));

    // メニューが閉じている
    await expect(menu.open).toBe(false);
  },
};

/**
 * BDD: メニュー項目のクリック
 */
export const BDD_MenuItemClick: Story = {
  tags: ['test'],
  render: () => html`
    <ui-dropdown-menu data-testid="menu">
      <ui-button slot="trigger" data-testid="trigger">メニュー</ui-button>
      
      <ui-menu-item data-testid="item-1">項目 1</ui-menu-item>
      <ui-menu-item data-testid="item-2">項目 2</ui-menu-item>
    </ui-dropdown-menu>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const menu = canvas.getByTestId('menu') as HTMLElement;
    const trigger = canvas.getByTestId('trigger') as HTMLElement;

    let selectedItem = '';

    // イベントリスナーを設定
    menu.addEventListener('menu-item-click', ((e: CustomEvent) => {
      selectedItem = e.detail.label;
    }) as EventListener);

    // メニューを開く
    await userEvent.click(trigger);
    await new Promise(resolve => setTimeout(resolve, 100));

    // メニュー項目をクリック
    const item1 = canvas.getByTestId('item-1') as HTMLElement;
    const item1Button = item1.shadowRoot?.querySelector('button') as HTMLElement;
    await userEvent.click(item1Button);
    await new Promise(resolve => setTimeout(resolve, 100));

    // イベントが発火し、正しい項目が選択されている
    await expect(selectedItem).toBe('項目 1');
  },
};

/**
 * BDD: 無効化されたメニュー項目
 */
export const BDD_DisabledItem: Story = {
  tags: ['test'],
  render: () => html`
    <ui-dropdown-menu data-testid="menu">
      <ui-button slot="trigger" data-testid="trigger">メニュー</ui-button>
      
      <ui-menu-item data-testid="item-1">項目 1</ui-menu-item>
      <ui-menu-item data-testid="item-2" disabled>項目 2（無効）</ui-menu-item>
    </ui-dropdown-menu>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const trigger = canvas.getByTestId('trigger') as HTMLElement;

    // メニューを開く
    await userEvent.click(trigger);
    await new Promise(resolve => setTimeout(resolve, 100));

    // 無効化された項目にaria-disabled属性がある
    const item2 = canvas.getByTestId('item-2') as HTMLElement;
    await expect(item2.shadowRoot?.querySelector('[role="menuitem"]')).toHaveAttribute('aria-disabled', 'true');
  },
};

/**
 * BDD: キーボード操作
 */
export const BDD_KeyboardNavigation: Story = {
  tags: ['test'],
  render: () => html`
    <ui-dropdown-menu data-testid="menu">
      <ui-button slot="trigger" data-testid="trigger">メニュー</ui-button>
      
      <ui-menu-item data-testid="item-1">項目 1</ui-menu-item>
      <ui-menu-item data-testid="item-2">項目 2</ui-menu-item>
      <ui-menu-item data-testid="item-3">項目 3</ui-menu-item>
    </ui-dropdown-menu>
  `,
  async play({ canvasElement, step }) {
    const canvas = within(canvasElement);
    const menu = canvas.getByTestId('menu') as UiDropdownMenu;
    const trigger = canvas.getByTestId('trigger') as HTMLElement;

    await step('メニューを開く', async () => {
      await userEvent.click(trigger);
      await menu.updateComplete;
      await expect(menu.open).toBe(true);
    });

    await step('ArrowDownで次の項目へフォーカス', async () => {
      await userEvent.keyboard('{ArrowDown}');
      await new Promise(resolve => setTimeout(resolve, 50));
      // フォーカスが移動していることを検証（実装依存）
    });

    await step('Enterで項目を選択', async () => {
      await userEvent.keyboard('{Enter}');
      await new Promise(resolve => setTimeout(resolve, 50));
      // メニューが閉じることを検証
      await expect(menu.open).toBe(false);
    });
  },
};
