import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, fn } from 'storybook/test';
import './card.js';
import '../button/button.js';

const meta: Meta = {
  title: 'Components/Card',
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
    href: {
      control: 'text',
      description: 'リンク先URL（指定時は<a>タグとしてレンダリング）',
    },
    target: {
      control: 'select',
      options: ['_self', '_blank', '_parent', '_top'],
      description: 'リンクのターゲット',
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
      <p>マウスをホバーすると浮き上がります。セマンティックなボタンではありません。</p>
    </ui-card>
  `,
};

/**
 * リンクカード (href指定)
 * アクセシビリティに配慮し、カード全体をクリック可能にする場合はこちらを使用
 */
export const Link: Story = {
  args: {
    variant: 'elevated',
    padding: 'md',
    href: 'https://example.com',
    target: '_blank',
  },
  render: (args) => html`
    <ui-card 
      variant="${args['variant']}" 
      padding="${args['padding']}"
      href="${args['href']}"
      target="${args['target']}"
      style="max-width: 300px;"
    >
      <h3 slot="header">リンクカード</h3>
      <p>href属性を指定すると、自動的に&lt;a&gt;タグでラップされ、適切なアクセシビリティが提供されます。</p>
      <div slot="footer" style="color: var(--color-primary);">Read More &rarr;</div>
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
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
      <ui-card variant="elevated" padding="md">
        <h3 slot="header">Elevated</h3>
        <p>ダークモードでは背景色が調整され、浮き上がって見えます。</p>
      </ui-card>
      
      <ui-card variant="outlined" padding="md">
        <h3 slot="header">Outlined</h3>
        <p>ボーダーカラーもダークモード仕様になります。</p>
      </ui-card>
      
      <ui-card variant="filled" padding="md">
        <h3 slot="header">Filled</h3>
        <p>塗りつぶしスタイルです。</p>
      </ui-card>
      
      <ui-card variant="elevated" padding="md" interactive @click="${() => {}}">
        <h3 slot="header">Interactive</h3>
        <p>ホバー時のエフェクトも確認してください。</p>
      </ui-card>
    </div>
  `,
};

/**
 * BDD シナリオテスト: インタラクティブカードのクリック検証
 */
/**
 * BDD シナリオテスト: リンクカードの構造検証
 */
export const BDD_LinkBehavior: Story = {
  args: {
    href: 'https://example.com',
    target: '_blank',
  },
  render: (args) => html`
    <ui-card href="${args['href']}" target="${args['target']}">
      <h3 slot="header">リンクテスト</h3>
      <p>Shadow DOM内のリンク構造をテストします</p>
    </ui-card>
  `,
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector('ui-card') as HTMLElement;
    
    // Shadow DOMへのアクセスが必要なため、test-runner上での動作確認には注意が必要
    // StorybookのinteractionsテストではShadow DOMもクエリ可能
    
    // 1. interactive属性が自動的に付与されているか
    // (card.tsの実装では href があれば interactive の属性反映はないが、スタイルはあたる)
    // 実装: :host([href]) でスタイル制御しているため interactive 属性は必須ではない
    
    // 2. 内部リンクの確認
    if (card.shadowRoot) {
      const link = card.shadowRoot.querySelector('a');
      await expect(link).not.toBeNull();
      await expect(link?.getAttribute('href')).toBe('https://example.com');
      await expect(link?.getAttribute('target')).toBe('_blank');
      await expect(link?.getAttribute('rel')).toContain('noopener');
    }
  },
};

/**
 * BDD シナリオテスト: 非インタラクティブカードのスタイル検証
 */
export const BDD_NonInteractiveCard: Story = {
  render: () => html`
    <ui-card>
      <h3 slot="header">非インタラクティブ</h3>
      <p>ポインターカーソルにならないことを確認します</p>
    </ui-card>
  `,
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector('ui-card') as HTMLElement;
    
    // カーソルのスタイル確認
    const computedStyle = window.getComputedStyle(card);
    await expect(computedStyle.cursor).not.toBe('pointer');

    // role, tabindex がないことの確認
    await expect(card.hasAttribute('role')).toBe(false);
    await expect(card.hasAttribute('tabindex')).toBe(false);
  },
};
