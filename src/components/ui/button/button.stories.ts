import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, userEvent } from 'storybook/test';
import './button.js';

const meta: Meta = {
  title: 'Components/UiButton',
  component: 'ui-button',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline'],
      description: 'ボタンのスタイルバリアント',
    },
  },
};
export default meta;

type Story = StoryObj;

/**
 * 基本的なボタンの表示
 */
export const Primary: Story = {
  args: {
    variant: 'primary',
  },
  render: (args) => html`<ui-button variant="${args['variant']}">保存する</ui-button>`,
};

/**
 * セカンダリバリアント
 */
export const Secondary: Story = {
  args: {
    variant: 'secondary',
  },
  render: (args) => html`<ui-button variant="${args['variant']}">キャンセル</ui-button>`,
};

/**
 * アウトラインバリアント
 */
export const Outline: Story = {
  args: {
    variant: 'outline',
  },
  render: (args) => html`<ui-button variant="${args['variant']}">詳細を見る</ui-button>`,
};

/**
 * BDD シナリオテスト
 * ボタンが正しく表示され、クリック可能であることを確認
 */
export const BDD_ButtonInteraction: Story = {
  render: () => html`<ui-button>クリックしてください</ui-button>`,
  play: async ({ canvasElement }) => {

    // 1. ui-button 要素を取得
    const uiButton = canvasElement.querySelector('ui-button');
    await expect(uiButton).toBeInTheDocument();

    // 2. Shadow DOM 内の .btn 要素を取得
    const shadowRoot = uiButton?.shadowRoot;
    await expect(shadowRoot).not.toBeNull();

    const btnElement = shadowRoot?.querySelector('.btn');
    await expect(btnElement).toBeInTheDocument();

    // 3. テキストコンテンツを確認
    await expect(btnElement).toHaveTextContent('クリックしてください');

    // 4. クリック操作
    await userEvent.click(uiButton as HTMLElement);

    // クリックイベントが発火したことを確認 (ui-button は LionButton を継承)
    // 実際のビジネスロジックに応じてアサーションを追加
  },
};
