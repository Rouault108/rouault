import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { expect, within, userEvent } from 'storybook/test';
import type { UiList } from './list';
import './list.ts';

const meta: Meta<UiList> = {
  title: 'Components/List',
  component: 'ui-list',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'bordered', 'card', 'simple', 'bullet'],
      description: 'リストのスタイルバリアント',
    },
    hoverable: {
      control: { type: 'boolean' },
      description: '項目ホバー効果を有効にするか',
    },
    compact: {
      control: { type: 'boolean' },
      description: 'コンパクトモード（パディング削減）',
    },
    selectable: {
      control: { type: 'boolean' },
      description: '項目選択機能を有効にするか',
    },
    divider: {
      control: { type: 'boolean' },
      description: '項目間に区切り線を表示するか',
    },
  },
};

export default meta;
type Story = StoryObj<UiList>;

/**
 * デフォルト: シンプルなリスト
 */
export const Default: Story = {
  render: () => html`
    <ui-list>
      <ul>
        <li>First item</li>
        <li>Second item</li>
        <li>Third item</li>
        <li>Fourth item</li>
      </ul>
    </ui-list>
  `,
};

/**
 * ボーダーバリアント
 */
export const Bordered: Story = {
  render: () => html`
    <ui-list variant="bordered">
      <ul>
        <li>Dashboard</li>
        <li>Projects</li>
        <li>Team</li>
        <li>Settings</li>
      </ul>
    </ui-list>
  `,
};

/**
 * カードバリアント
 */
export const Card: Story = {
  render: () => html`
    <ui-list variant="card">
      <ul>
        <li>Card item 1</li>
        <li>Card item 2</li>
        <li>Card item 3</li>
      </ul>
    </ui-list>
  `,
};

/**
 * シンプルバリアント（ボーダーなし）
 */
export const Simple: Story = {
  render: () => html`
    <ui-list variant="simple" hoverable>
      <ul>
        <li>Clean item</li>
        <li>Minimal design</li>
        <li>No borders</li>
      </ul>
    </ui-list>
  `,
};

/**
 * バレット付き（文書用）
 */
export const Bullet: Story = {
  render: () => html`
    <ui-list variant="bullet">
      <ul>
        <li>Documentation item 1</li>
        <li>Documentation item 2</li>
        <li>Documentation item 3</li>
      </ul>
    </ui-list>
  `,
};

/**
 * 区切り線付き
 */
export const WithDivider: Story = {
  render: () => html`
    <ui-list divider hoverable>
      <ul>
        <li>Item with divider 1</li>
        <li>Item with divider 2</li>
        <li>Item with divider 3</li>
        <li>Item with divider 4</li>
      </ul>
    </ui-list>
  `,
};

/**
 * ネストされたバレットリスト
 */
export const NestedBulletList: Story = {
  render: () => html`
    <ui-list variant="bullet">
      <ul>
        <li>Parent item 1
          <ul style="margin-left: 1.5rem; margin-top: 0.25rem;">
            <li>Nested item 1-1</li>
            <li>Nested item 1-2</li>
          </ul>
        </li>
        <li>Parent item 2
          <ul style="margin-left: 1.5rem; margin-top: 0.25rem;">
            <li>Nested item 2-1</li>
            <li>Nested item 2-2</li>
          </ul>
        </li>
        <li>Parent item 3</li>
      </ul>
    </ui-list>
  `,
};

/**
 * ホバー効果付き
 */
export const Hoverable: Story = {
  render: () => html`
    <ui-list hoverable>
      <ul>
        <li>Hover over me</li>
        <li>Hover effect enabled</li>
        <li>Interactive items</li>
      </ul>
    </ui-list>
  `,
};

/**
 * コンパクトモード
 */
export const Compact: Story = {
  render: () => html`
    <ui-list compact hoverable>
      <ul>
        <li>Compact item 1</li>
        <li>Compact item 2</li>
        <li>Compact item 3</li>
        <li>Compact item 4</li>
        <li>Compact item 5</li>
      </ul>
    </ui-list>
  `,
};

/**
 * アイコン付きリスト
 */
export const WithIcons: Story = {
  render: () => html`
    <ui-list hoverable>
      <ul>
        <li>
          <iconify-icon icon="lucide:home" style="margin-right: 0.75rem;"></iconify-icon>
          Home
        </li>
        <li>
          <iconify-icon icon="lucide:folder" style="margin-right: 0.75rem;"></iconify-icon>
          Projects
        </li>
        <li>
          <iconify-icon icon="lucide:users" style="margin-right: 0.75rem;"></iconify-icon>
          Team
        </li>
        <li>
          <iconify-icon icon="lucide:settings" style="margin-right: 0.75rem;"></iconify-icon>
          Settings
        </li>
      </ul>
    </ui-list>
  `,
};

/**
 * 説明文付きリスト
 */
export const WithDescription: Story = {
  render: () => html`
    <ui-list hoverable>
      <ul>
        <li>
          <div style="display: flex; flex-direction: column; gap: 0.25rem;">
            <strong>Linear Issue #123</strong>
            <span style="font-size: 0.875rem; color: var(--color-foreground-muted, #6b7280);">
              Fix navigation bug in sidebar component
            </span>
          </div>
        </li>
        <li>
          <div style="display: flex; flex-direction: column; gap: 0.25rem;">
            <strong>Linear Issue #124</strong>
            <span style="font-size: 0.875rem; color: var(--color-foreground-muted, #6b7280);">
              Add dark mode support to table component
            </span>
          </div>
        </li>
        <li>
          <div style="display: flex; flex-direction: column; gap: 0.25rem;">
            <strong>Linear Issue #125</strong>
            <span style="font-size: 0.875rem; color: var(--color-foreground-muted, #6b7280);">
              Implement keyboard navigation
            </span>
          </div>
        </li>
      </ul>
    </ui-list>
  `,
};

/**
 * セクション分けされたリスト
 */
export const WithSections: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div>
        <h3 style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-foreground-muted, #6b7280); margin-bottom: 0.5rem;">
          Navigation
        </h3>
        <ui-list hoverable>
          <ul>
            <li>
              <iconify-icon icon="lucide:home" style="margin-right: 0.75rem;"></iconify-icon>
              Home
            </li>
            <li>
              <iconify-icon icon="lucide:folder" style="margin-right: 0.75rem;"></iconify-icon>
              Projects
            </li>
          </ul>
        </ui-list>
      </div>
      
      <div>
        <h3 style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-foreground-muted, #6b7280); margin-bottom: 0.5rem;">
          Settings
        </h3>
        <ui-list hoverable>
          <ul>
            <li>
              <iconify-icon icon="lucide:user" style="margin-right: 0.75rem;"></iconify-icon>
              Profile
            </li>
            <li>
              <iconify-icon icon="lucide:settings" style="margin-right: 0.75rem;"></iconify-icon>
              Preferences
            </li>
          </ul>
        </ui-list>
      </div>
    </div>
  `,
};

/**
 * 選択可能なリスト
 */
export const Selectable: Story = {
  render: () => html`
    <ui-list selectable hoverable>
      <ul>
        <li data-testid="item-1">Selectable item 1</li>
        <li data-testid="item-2">Selectable item 2</li>
        <li data-testid="item-3">Selectable item 3</li>
        <li data-testid="item-4">Selectable item 4</li>
      </ul>
    </ui-list>
  `,
};

/**
 * 順序付きリスト
 */
export const OrderedList: Story = {
  render: () => html`
    <ui-list>
      <ol>
        <li>First step: Install dependencies</li>
        <li>Second step: Configure settings</li>
        <li>Third step: Run the application</li>
        <li>Fourth step: Deploy to production</li>
      </ol>
    </ui-list>
  `,
};

/**
 * ダークモード表示確認
 */
export const DarkMode: Story = {
  render: () => html`
    <div data-theme="dark" style="background-color: #0a0a0a; padding: 2rem; border-radius: 8px;">
      <ui-list hoverable>
        <ul>
          <li>
            <iconify-icon icon="lucide:sun" style="margin-right: 0.75rem;"></iconify-icon>
            Light Mode
          </li>
          <li>
            <iconify-icon icon="lucide:moon" style="margin-right: 0.75rem;"></iconify-icon>
            Dark Mode
          </li>
          <li>
            <iconify-icon icon="lucide:monitor" style="margin-right: 0.75rem;"></iconify-icon>
            System
          </li>
        </ul>
      </ui-list>
    </div>
  `,
};

/**
 * BDD: バリアント切り替えテスト
 */
export const BDD_VariantSwitch: Story = {
  tags: ['test'],
  render: () => html`
    <ui-list data-testid="list-variant" variant="bordered">
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
      </ul>
    </ui-list>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const list = canvas.getByTestId('list-variant') as UiList;

    await list.updateComplete;

    // variant 属性が正しく反映されているか
    await expect(list.getAttribute('variant')).toBe('bordered');
  },
};

/**
 * BDD: ホバー効果テスト
 */
export const BDD_HoverableItems: Story = {
  tags: ['test'],
  render: () => html`
    <ui-list data-testid="list-hoverable" hoverable>
      <ul>
        <li data-testid="item-1">Item 1</li>
        <li data-testid="item-2">Item 2</li>
      </ul>
    </ui-list>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const list = canvas.getByTestId('list-hoverable') as UiList;

    await list.updateComplete;

    // hoverable 属性が正しく反映されているか
    await expect(list.hasAttribute('hoverable')).toBe(true);
  },
};

/**
 * BDD: 選択機能テスト
 */
export const BDD_SelectionTest: Story = {
  tags: ['test'],
  render: () => html`
    <ui-list data-testid="list-selection" selectable>
      <ul>
        <li data-testid="item-1">Item 1</li>
        <li data-testid="item-2">Item 2</li>
      </ul>
    </ui-list>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const list = canvas.getByTestId('list-selection') as UiList;
    
    await list.updateComplete;
    
    // 項目をクリックして選択状態になるかテスト
    const item1 = canvas.getByTestId('item-1');
    await userEvent.click(item1);
    
    // aria-selected が true になっているか
    await expect(item1.getAttribute('aria-selected')).toBe('true');
    
    // もう一度クリックで解除
    await userEvent.click(item1);
    await expect(item1.hasAttribute('aria-selected')).toBe(false);
  },
};

/**
 * BDD: キーボードナビゲーションテスト
 */
export const BDD_KeyboardNavigation: Story = {
  tags: ['test'],
  render: () => html`
    <ui-list data-testid="list-keyboard" selectable>
      <ul>
        <li data-testid="item-1">Item 1</li>
        <li data-testid="item-2">Item 2</li>
        <li data-testid="item-3">Item 3</li>
      </ul>
    </ui-list>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const list = canvas.getByTestId('list-keyboard') as UiList;
    
    await list.updateComplete;
    
    const item1 = canvas.getByTestId('item-1');
    const item2 = canvas.getByTestId('item-2');
    
    // 最初の項目にフォーカス
    item1.focus();
    
    // ArrowDown でフォーカス移動
    await userEvent.keyboard('{ArrowDown}');
    
    // 2番目の項目にフォーカスが移動しているか確認
    await expect(document.activeElement).toBe(item2);
    
    // Space で選択
    await userEvent.keyboard(' ');
    
    // 選択状態になっているか
    await expect(item2.getAttribute('aria-selected')).toBe('true');
  },
};
