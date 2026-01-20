import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, userEvent, fn } from 'storybook/test';
import './button.js';

const meta: Meta = {
  title: 'Components/UiButton',
  component: 'ui-button',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost'],
      description: 'ボタンのスタイルバリアント',
    },
    disabled: {
      control: 'boolean',
      description: '無効化状態',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'ボタンのサイズ',
    },
    align: {
      control: 'select',
      options: ['center', 'start', 'between'],
      description: 'コンテンツの配置',
    },
    onClick: { action: 'clicked' },
  },
};
export default meta;

type Story = StoryObj;

/**
 * 基本的なボタンの表示 (Primary)
 */
export const Primary: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    align: 'center',
    disabled: false,
    onClick: fn(),
  },
  render: (args) => html`
    <ui-button 
      variant="${args['variant']}" 
      size="${args['size']}"
      align="${args['align']}"
      ?disabled="${args['disabled']}"
      @click="${args['onClick']}"
    >
      保存する
    </ui-button>
  `,
};

/**
 * Trailing Action (ドロップダウンや幅広ボタン)
 * コンテンツを両端揃え (justify-content: space-between) に配置
 */
export const TrailingAction: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    align: 'between',
  },
  render: (args) => html`
    <div style="width: 300px;">
      <ui-button 
        variant="${args['variant']}" 
        size="${args['size']}" 
        align="${args['align']}" 
        style="width: 100%;"
      >
        <span>Sort</span>
        <svg slot="suffix" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </ui-button>
    </div>
  `,
};

/**
 * サイズバリエーション
 */
export const Sizes: Story = {
  render: (args) => html`
    <div style="display: flex; align-items: center; gap: 1rem;">
      <ui-button variant="${args['variant']}" ?disabled="${args['disabled']}" size="sm">Small</ui-button>
      <ui-button variant="${args['variant']}" ?disabled="${args['disabled']}" size="md">Medium(default)</ui-button>
      <ui-button variant="${args['variant']}" ?disabled="${args['disabled']}" size="lg">Large</ui-button>
    </div>
  `,
};


/**
 * セカンダリバリアント
 */
export const Secondary: Story = {
  args: {
    variant: 'secondary',
    disabled: false,
  },
  render: (args) => html`<ui-button variant="${args['variant']}" size="${args['size'] || 'md'}">キャンセル</ui-button>`,
};

/**
 * アウトラインバリアント
 */
export const Outline: Story = {
  args: {
    variant: 'outline',
    disabled: false,
  },
  render: (args) => html`<ui-button variant="${args['variant']}" size="${args['size'] || 'md'}">詳細を見る</ui-button>`,
};

/**
 * ゴーストバリアント (ナビゲーション用)
 */
export const Ghost: Story = {
  args: {
    variant: 'ghost',
    disabled: false,
  },
  render: (args) => html`<ui-button variant="${args['variant']}" size="${args['size'] || 'md'}">メニュー</ui-button>`,
};

/**
 * 無効化状態 (Disabled)
 */
export const Disabled: Story = {
  args: {
    variant: 'primary',
    disabled: true,
  },
  render: (args) => html`<ui-button variant="${args['variant']}" size="${args['size'] || 'md'}" ?disabled="${args['disabled']}">操作不可</ui-button>`,
};

/**
 * アイコン付きボタン (Prefix/Suffix)
 */
export const WithIcon: Story = {
  args: {
    variant: 'primary',
  },
  render: (args) => html`
    <ui-button variant="${args['variant']}" size="${args['size'] || 'md'}">
      <svg slot="prefix" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
        <polyline points="17 21 17 13 7 13 7 21"></polyline>
        <polyline points="7 3 7 8 15 8"></polyline>
      </svg>
      保存する
    </ui-button>
    
    <ui-button variant="outline" size="${args['size'] || 'md'}" style="margin-left: 1rem;">
      詳細を見る
      <svg slot="suffix" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"></line>
        <polyline points="12 5 19 12 12 19"></polyline>
      </svg>
    </ui-button>
  `,
};

/**
 * BDD シナリオテスト: インタラクション検証
 * - 表示確認
 * - クリックイベントの発火確認
 * - キーボードフォーカスの確認
 */
export const BDD_ButtonInteraction: Story = {
  args: {
    onClick: fn(),
  },
  render: (args) => html`<ui-button @click="${args['onClick']}">クリックテスト</ui-button>`,
  play: async ({ canvasElement, args }) => {
    
    // 1. 要素の取得
    const uiButton = canvasElement.querySelector('ui-button') as HTMLElement;
    if (!uiButton) throw new Error('ui-button not found');

    // 2. 表示確認 (Then)
    await expect(uiButton).toBeInTheDocument();
    await expect(uiButton).toHaveTextContent('クリックテスト');

    // 3. クリック操作 (When)
    await userEvent.click(uiButton as HTMLElement);

    // 4. イベント発火確認 (Then)
    // スパイ関数が呼び出されたかを確認
    await expect(args['onClick']).toHaveBeenCalled();

    // 5. フォーカス確認 (When/Then)
    // ボタンからフォーカスを外すして再フォーカス
    uiButton.blur();
    await expect(uiButton).not.toHaveFocus();
    
    await userEvent.tab();
    await expect(uiButton).toHaveFocus();
  },
};
