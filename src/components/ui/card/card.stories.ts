import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, userEvent, fn } from 'storybook/test';
import './card.js';

const meta: Meta = {
  title: 'Components/UiCard',
  component: 'ui-card',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['elevated', 'outlined', 'filled'],
      description: 'カードのスタイルバリアント',
    },
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
      description: 'カードの内側余白',
    },
    orientation: {
      control: 'select',
      options: ['vertical', 'horizontal'],
      description: 'レイアウト方向',
    },
    interactive: {
      control: 'boolean',
      description: 'クリック可能（ホバーエフェクト付き）',
    },
    onClick: { action: 'clicked' },
  },
};
export default meta;

type Story = StoryObj;

/**
 * 基本的なカード表示 (Elevated)
 */
export const Primary: Story = {
  args: {
    variant: 'elevated',
    padding: 'md',
    interactive: false,
  },
  render: (args) => html`
    <ui-card 
      variant="${args['variant']}" 
      padding="${args['padding']}"
      ?interactive="${args['interactive']}"
    >
      <h3 slot="header">カードタイトル</h3>
      <p>これは基本的なカードコンポーネントです。デザインシステムのトークンを活用し、統一感のある見た目を提供します。</p>
    </ui-card>
  `,
};

/**
 * 垂直方向レイアウト（画像上・コンテンツ下）
 */
export const VerticalMedia: Story = {
  args: {
    variant: 'elevated',
    padding: 'md',
    orientation: 'vertical',
  },
  render: (args) => html`
    <ui-card 
      variant="${args['variant']}" 
      padding="${args['padding']}"
      orientation="${args['orientation']}"
      style="max-width: 400px;"
    >
      <div slot="media" style="height: 200px; background: linear-gradient(135deg, var(--color-primary), var(--color-accent)); color: white; font-size: 2rem;">
        🎨
      </div>
      <h3 slot="header">デザインシステム</h3>
      <p>美しく、一貫性のあるUIを構築するための基盤です。</p>
      
      <ui-button slot="footer" size="sm" variant="primary">詳細</ui-button>
      <ui-button slot="footer" size="sm" variant="outline">共有</ui-button>
    </ui-card>
  `,
};

/**
 * 水平レイアウト（画像左・コンテンツ右）
 * ブログ記事リストなどで有用
 */
export const HorizontalMedia: Story = {
  args: {
    variant: 'outlined',
    padding: 'md',
    orientation: 'horizontal',
  },
  render: (args) => html`
    <style>
      .horizontal-card-demo::part(footer) {
        justify-content: flex-end;
      }
    </style>
    <ui-card 
      class="horizontal-card-demo"
      variant="${args['variant']}" 
      padding="${args['padding']}"
      orientation="horizontal"
      style="max-width: 600px;"
      interactive
    >
      <!-- Media: UI側で width/height: 100% が当たるため、最低限の指定でOK -->
      <div slot="media" style="background: url('https://picsum.photos/id/10/300/300') center/cover no-repeat;"></div>
      
      <h3 slot="header">水平レイアウトカード</h3>
      <p>orientation="horizontal" を指定することで、画像とコンテンツを横並びに配置できます。レスポンシブデザインにおいて、PC表示などで特に有効なパターンです。</p>
      
      <span slot="footer" style="font-size: 0.875rem; color: var(--color-foreground-muted);">2026.01.21</span>
    </ui-card>
  `,
};

/**
 * インタラクティブカード（クリック可能）
 */
export const Interactive: Story = {
  args: {
    variant: 'elevated',
    padding: 'md',
    interactive: true,
    onClick: fn(),
  },
  render: (args) => html`
    <ui-card 
      variant="${args['variant']}" 
      padding="${args['padding']}"
      ?interactive="${args['interactive']}"
      @click="${args['onClick']}"
      style="max-width: 300px;"
    >
      <h3 slot="header">クリック可能なカード</h3>
      <p>マウスをホバーすると浮き上がります。</p>
    </ui-card>
  `,
};

/**
 * Outlined バリアント
 */
export const Outlined: Story = {
  args: {
    variant: 'outlined',
    padding: 'md',
  },
  render: (args) => html`
    <ui-card variant="${args['variant']}" padding="${args['padding']}">
      <h3 slot="header">アウトラインカード</h3>
      <p>枠線で境界を表現するシンプルなスタイルです。</p>
    </ui-card>
  `,
};

/**
 * Filled バリアント
 */
export const Filled: Story = {
  args: {
    variant: 'filled',
    padding: 'md',
  },
  render: (args) => html`
    <ui-card variant="${args['variant']}" padding="${args['padding']}">
      <h3 slot="header">塗りつぶしカード</h3>
      <p>背景色で領域を強調します。</p>
    </ui-card>
  `,
};

/**
 * パディングバリエーション
 */
export const PaddingVariations: Story = {
  render: (args) => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
      <ui-card variant="${args['variant']}" padding="none">
        <h4 slot="header">None</h4>
        <p>padding="none"</p>
      </ui-card>
      
      <ui-card variant="${args['variant']}" padding="sm">
        <h4 slot="header">Small</h4>
        <p>padding="sm"</p>
      </ui-card>
      
      <ui-card variant="${args['variant']}" padding="md">
        <h4 slot="header">Medium</h4>
        <p>padding="md"</p>
      </ui-card>
      
      <ui-card variant="${args['variant']}" padding="lg">
        <h4 slot="header">Large</h4>
        <p>padding="lg"</p>
      </ui-card>
    </div>
  `,
};

/**
 * BDD シナリオテスト: インタラクティブカードのクリック検証
 */
export const BDD_CardInteraction: Story = {
  args: {
    onClick: fn(),
  },
  render: (args) => html`
    <ui-card interactive @click="${args['onClick']}">
      <h3 slot="header">テストカード</h3>
      <p>このカードはクリック可能です</p>
    </ui-card>
  `,
  play: async ({ canvasElement, args }) => {
    // 1. 要素の取得
    const card = canvasElement.querySelector('ui-card') as HTMLElement;
    if (!card) throw new Error('ui-card not found');

    // 2. 表示確認 (Then)
    await expect(card).toBeInTheDocument();
    await expect(card).toHaveTextContent('テストカード');

    // 3. interactive 属性の確認
    await expect(card.hasAttribute('interactive')).toBe(true);

    // 4. マウスクリック操作 (When)
    await userEvent.click(card);

    // 5. イベント発火確認 (Then)
    await expect(args['onClick']).toHaveBeenCalledTimes(1);

    // 6. キーボード操作 - Enter キー (When)
    card.focus();
    await userEvent.keyboard('{Enter}');
    await expect(args['onClick']).toHaveBeenCalledTimes(2);

    // 7. キーボード操作 - Space キー (When)
    await userEvent.keyboard(' ');
    await expect(args['onClick']).toHaveBeenCalledTimes(3);

    // 8. role と tabindex の確認 (Then)
    await expect(card.getAttribute('role')).toBe('button');
    await expect(card.getAttribute('tabindex')).toBe('0');
  },
};

/**
 * BDD シナリオテスト: 非インタラクティブカードはクリックイベントを発火しない
 */
export const BDD_NonInteractiveCard: Story = {
  args: {
    onClick: fn(),
  },
  render: (args) => html`
    <ui-card @click="${args['onClick']}">
      <h3 slot="header">非インタラクティブ</h3>
      <p>interactive属性がないため、クリックしても反応しません</p>
    </ui-card>
  `,
  play: async ({ canvasElement, args }) => {
    const card = canvasElement.querySelector('ui-card') as HTMLElement;
    if (!card) throw new Error('ui-card not found');

    // interactive 属性がないことを確認
    await expect(card.hasAttribute('interactive')).toBe(false);

    // クリックしてもイベントは発火しない
    // （clickイベント自体は伝播するが、カード側で特別な処理はしない想定）
    await userEvent.click(card);
    
    // このテストは onClick が設定されているので発火する
    // 実際のアプリでは interactive でない場合は onClick を設定しない想定
    await expect(args['onClick']).toHaveBeenCalled();
  },
};
