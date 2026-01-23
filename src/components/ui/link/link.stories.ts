import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, userEvent, within } from 'storybook/test';
import './link.ts';

const meta: Meta = {
  title: 'Components/UiLink',
  component: 'ui-link',
  tags: ['autodocs'],
  argTypes: {
    href: {
      control: 'text',
      description: 'リンク先URL',
    },
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'subtle', 'underline'],
      description: 'スタイルバリアント',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'リンクのサイズ',
    },
    external: {
      control: 'boolean',
      description: '外部リンク（新しいタブで開く）',
    },
    disabled: {
      control: 'boolean',
      description: '無効状態',
    },
    onClick: { action: 'click' },
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
  vertical: 'display: flex; flex-direction: column; gap: 1rem; align-items: flex-start;',
} as const;

// ========================================
// 基本ストーリー
// ========================================

/**
 * 基本的なリンク
 */
export const Default: Story = {
  args: {
    href: '#',
    variant: 'primary',
    size: 'md',
  },
  render: (args) => html`
    <ui-link
      href="${args['href']}"
      variant="${args['variant']}"
      size="${args['size']}"
      ?external="${args['external']}"
      ?disabled="${args['disabled']}"
    >
      リンクテキスト
    </ui-link>
  `,
};

// ========================================
// バリアントバリエーション
// ========================================

/**
 * Primary バリアント
 */
export const Primary: Story = {
  args: {
    href: '#',
    variant: 'primary',
  },
  render: (args) => html`
    <ui-link href="${args['href']}" variant="${args['variant']}">
      Primary リンク
    </ui-link>
  `,
};

/**
 * Secondary バリアント
 */
export const Secondary: Story = {
  args: {
    href: '#',
    variant: 'secondary',
  },
  render: (args) => html`
    <ui-link href="${args['href']}" variant="${args['variant']}">
      Secondary リンク
    </ui-link>
  `,
};

/**
 * Subtle バリアント
 */
export const Subtle: Story = {
  args: {
    href: '#',
    variant: 'subtle',
  },
  render: (args) => html`
    <ui-link href="${args['href']}" variant="${args['variant']}">
      Subtle リンク（下線なし）
    </ui-link>
  `,
};

/**
 * Underline バリアント
 */
export const Underline: Story = {
  args: {
    href: '#',
    variant: 'underline',
  },
  render: (args) => html`
    <ui-link href="${args['href']}" variant="${args['variant']}">
      常に下線があるリンク
    </ui-link>
  `,
};

/**
 * 全バリアントのショーケース
 */
export const AllVariants: Story = {
  render: () => html`
    <div style="${CONTAINER_STYLES.vertical}">
      <ui-link href="#" variant="primary">Primary リンク</ui-link>
      <ui-link href="#" variant="secondary">Secondary リンク</ui-link>
      <ui-link href="#" variant="subtle">Subtle リンク</ui-link>
      <ui-link href="#" variant="underline">Underline リンク</ui-link>
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
    href: '#',
    size: 'sm',
  },
  render: (args) => html`
    <ui-link href="${args['href']}" size="${args['size']}">
      Small リンク
    </ui-link>
  `,
};

/**
 * Medium サイズ
 */
export const Medium: Story = {
  args: {
    href: '#',
    size: 'md',
  },
  render: (args) => html`
    <ui-link href="${args['href']}" size="${args['size']}">
      Medium リンク
    </ui-link>
  `,
};

/**
 * Large サイズ
 */
export const Large: Story = {
  args: {
    href: '#',
    size: 'lg',
  },
  render: (args) => html`
    <ui-link href="${args['href']}" size="${args['size']}">
      Large リンク
    </ui-link>
  `,
};

/**
 * 全サイズのショーケース
 */
export const AllSizes: Story = {
  render: () => html`
    <div style="${CONTAINER_STYLES.vertical}">
      <ui-link href="#" size="sm">Small リンク</ui-link>
      <ui-link href="#" size="md">Medium リンク</ui-link>
      <ui-link href="#" size="lg">Large リンク</ui-link>
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
    href: '#',
    disabled: true,
  },
  render: (args) => html`
    <ui-link href="${args['href']}" ?disabled="${args['disabled']}">
      無効なリンク
    </ui-link>
  `,
};

/**
 * 外部リンク
 */
export const External: Story = {
  args: {
    href: 'https://example.com',
    external: true,
  },
  render: (args) => html`
    <ui-link href="${args['href']}" ?external="${args['external']}">
      外部リンク
    </ui-link>
  `,
};

/**
 * 全状態のショーケース
 */
export const AllStates: Story = {
  render: () => html`
    <div style="${CONTAINER_STYLES.vertical}">
      <ui-link href="#">通常のリンク</ui-link>
      <ui-link href="https://example.com" external>外部リンク</ui-link>
      <ui-link href="#" disabled>無効なリンク</ui-link>
    </div>
  `,
};

// ========================================
// 実用例
// ========================================

/**
 * ナビゲーションでの使用例
 */
export const NavigationExample: Story = {
  render: () => html`
    <nav style="padding: var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-lg);">
      <div style="${CONTAINER_STYLES.flex}">
        <ui-link href="#home">ホーム</ui-link>
        <ui-link href="#about">About</ui-link>
        <ui-link href="#blog">ブログ</ui-link>
        <ui-link href="https://docs.example.com" external>ドキュメント</ui-link>
      </div>
    </nav>
  `,
};

/**
 * コンテンツ内での使用例
 */
export const ContentExample: Story = {
  render: () => html`
    <div style="max-width: 600px; line-height: 1.6;">
      <p>
        これは段落内の<ui-link href="#" variant="underline">インラインリンク</ui-link>の例です。
        テキストの中に自然に配置され、
        <ui-link href="https://example.com" variant="underline" external>外部サイト</ui-link>
        へのリンクもサポートしています。
      </p>
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
      <ui-link href="#" variant="primary">Primary リンク</ui-link>
      <ui-link href="#" variant="secondary">Secondary リンク</ui-link>
      <ui-link href="#" variant="subtle">Subtle リンク</ui-link>
      <ui-link href="#" variant="underline">Underline リンク</ui-link>
      <ui-link href="https://example.com" external>外部リンク</ui-link>
      <ui-link href="#" disabled>無効なリンク</ui-link>
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
    <ui-link data-testid="basic-link" href="#test">テストリンク</ui-link>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const link = canvas.getByTestId('basic-link') as HTMLElement;

    // リンクが正しくレンダリングされている
    await expect(link).toBeInTheDocument();
    
    // href 属性が設定されている
    const anchor = link.shadowRoot?.querySelector('a') as HTMLAnchorElement;
    await expect(anchor.href).toContain('#test');
  },
};

/**
 * BDD: リンククリック
 */
export const BDD_LinkClick: Story = {
  tags: ['test'],
  render: () => html`
    <ui-link data-testid="clickable-link" href="#clicked">クリック可能リンク</ui-link>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const link = canvas.getByTestId('clickable-link') as HTMLElement;
    const anchor = link.shadowRoot?.querySelector('a') as HTMLAnchorElement;

    // クリック可能
    await userEvent.click(anchor);
    
    // href が設定されている
    await expect(anchor.href).toContain('#clicked');
  },
};

/**
 * BDD: 無効状態のインタラクション防止
 */
export const BDD_DisabledState: Story = {
  tags: ['test'],
  render: () => html`
    <ui-link data-testid="disabled-link" href="#" disabled>無効なリンク</ui-link>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const link = canvas.getByTestId('disabled-link') as HTMLElement;

    // disabled 属性が設定されている
    await expect(link).toHaveAttribute('disabled');

    // Shadow Root 内の a 要素も aria-disabled
    const anchor = link.shadowRoot?.querySelector('a') as HTMLAnchorElement;
    await expect(anchor.getAttribute('aria-disabled')).toBe('true');
  },
};

/**
 * BDD: 外部リンクの属性
 */
export const BDD_ExternalLink: Story = {
  tags: ['test'],
  render: () => html`
    <ui-link data-testid="external-link" href="https://example.com" external>外部リンク</ui-link>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const link = canvas.getByTestId('external-link') as HTMLElement;
    const anchor = link.shadowRoot?.querySelector('a') as HTMLAnchorElement;

    // target="_blank" が設定されている
    await expect(anchor.target).toBe('_blank');

    // rel="noopener noreferrer" が設定されている
    await expect(anchor.rel).toContain('noopener');
    await expect(anchor.rel).toContain('noreferrer');
  },
};

/**
 * BDD: キーボードナビゲーション
 */
export const BDD_KeyboardNavigation: Story = {
  tags: ['test'],
  render: () => html`
    <ui-link data-testid="keyboard-link" href="#keyboard">キーボードリンク</ui-link>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const link = canvas.getByTestId('keyboard-link') as HTMLElement;
    const anchor = link.shadowRoot?.querySelector('a') as HTMLAnchorElement;

    // フォーカス可能
    anchor.focus();
    
    // フォーカスされているか確認
    await expect(document.activeElement).toBe(link);
    await expect(link.shadowRoot?.activeElement).toBe(anchor);
  },
};
