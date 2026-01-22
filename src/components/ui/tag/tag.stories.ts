import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, userEvent, within } from 'storybook/test';
import './tag.ts';

const meta: Meta = {
  title: 'Components/UiTag',
  component: 'ui-tag',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['solid', 'outlined', 'subtle'],
      description: 'タグのスタイルバリアント',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'タグのサイズ',
    },
    color: {
      control: 'select',
      options: [
        'music',
        'literature',
        'art',
        'cs',
        'economics',
        'sociology',
        'politics',
        'law',
        'math',
        'default',
      ],
      description: 'タグの色（ジャンル）',
    },
    dismissible: {
      control: 'boolean',
      description: '削除可能（×ボタン表示）',
    },
    disabled: {
      control: 'boolean',
      description: '無効状態',
    },
    href: {
      control: 'text',
      description: 'リンク先URL（指定時はクリック可能）',
    },
    onClick: { action: 'click' },
    onDismiss: { action: 'dismiss' },
  },
};
export default meta;

type Story = StoryObj;

/**
 * 基本的なタグ表示
 */
export const Default: Story = {
  args: {
    variant: 'subtle',
    size: 'md',
    color: 'default',
  },
  render: (args) => html`
    <ui-tag
      variant="${args['variant']}"
      size="${args['size']}"
      color="${args['color']}"
    >
      タグ
    </ui-tag>
  `,
};

/**
 * バリアント（Solid, Outlined, Subtle）
 */
export const Variants: Story = {
  render: () => html`
    <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
      <ui-tag variant="subtle" color="music">Subtle</ui-tag>
      <ui-tag variant="solid" color="music">Solid</ui-tag>
      <ui-tag variant="outlined" color="music">Outlined</ui-tag>
    </div>
  `,
};

/**
 * サイズバリエーション
 */
export const Sizes: Story = {
  render: () => html`
    <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
      <ui-tag size="sm" color="cs">Small</ui-tag>
      <ui-tag size="md" color="cs">Medium</ui-tag>
      <ui-tag size="lg" color="cs">Large</ui-tag>
    </div>
  `,
};

/**
 * ジャンル別カラー
 */
export const GenreColors: Story = {
  render: () => html`
    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; max-width: 600px;">
      <ui-tag color="music">音楽</ui-tag>
      <ui-tag color="literature">文学</ui-tag>
      <ui-tag color="art">美術</ui-tag>
      <ui-tag color="cs">計算機科学</ui-tag>
      <ui-tag color="economics">経済学</ui-tag>
      <ui-tag color="sociology">社会学</ui-tag>
      <ui-tag color="politics">政治学</ui-tag>
      <ui-tag color="law">法学</ui-tag>
      <ui-tag color="math">数学</ui-tag>
      <ui-tag color="default">その他</ui-tag>
    </div>
  `,
};

/**
 * アイコン付き
 */
export const WithIcon: Story = {
  render: () => html`
    <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
      <ui-tag color="music">
        <span slot="prefix">🎵</span>
        クラシック音楽
      </ui-tag>
      <ui-tag color="literature">
        <span slot="prefix">📚</span>
        詩の解説
      </ui-tag>
      <ui-tag color="cs">
        <span slot="prefix">💻</span>
        TypeScript
      </ui-tag>
    </div>
  `,
};

/**
 * 削除可能（Dismissible）
 */
export const Dismissible: Story = {
  render: () => html`
    <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
      <ui-tag color="music" dismissible>クラシック</ui-tag>
      <ui-tag color="literature" dismissible>詩</ui-tag>
      <ui-tag color="cs" dismissible>プログラミング</ui-tag>
    </div>
  `,
};

/**
 * リンク（クリック可能）
 */
export const Clickable: Story = {
  render: () => html`
    <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
      <ui-tag color="music" href="/tags/music">音楽</ui-tag>
      <ui-tag color="literature" href="/tags/literature">文学</ui-tag>
      <ui-tag color="cs" href="/tags/cs">計算機科学</ui-tag>
    </div>
  `,
};

/**
 * 無効状態
 */
export const Disabled: Story = {
  render: () => html`
    <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
      <ui-tag color="music" disabled>無効（Solid）</ui-tag>
      <ui-tag color="music" variant="outlined" disabled>無効（Outlined）</ui-tag>
      <ui-tag color="music" variant="subtle" disabled>無効（Subtle）</ui-tag>
    </div>
  `,
};

/**
 * フォーカス状態（キーボードナビゲーション）
 */
export const Focus: Story = {
  render: () => html`
    <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
      <p style="margin-bottom: 0.5rem; color: var(--color-foreground-muted); font-size: 13px;">
        Tab キーでフォーカスを移動してください：
      </p>
      <ui-tag color="music" href="/tags/music">音楽</ui-tag>
      <ui-tag color="literature" href="/tags/literature">文学</ui-tag>
      <ui-tag color="cs" href="/tags/cs">計算機科学</ui-tag>
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
      // ダークモードトークンを適用
      const wrapper = document.createElement('div');
      wrapper.setAttribute('data-theme', 'dark');
      wrapper.style.padding = '1rem';
      wrapper.innerHTML = story() as string;
      return wrapper;
    },
  ],
  render: () => html`
    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; max-width: 600px;">
      <ui-tag color="music">音楽</ui-tag>
      <ui-tag color="literature">文学</ui-tag>
      <ui-tag color="art">美術</ui-tag>
      <ui-tag color="cs">計算機科学</ui-tag>
      <ui-tag color="economics">経済学</ui-tag>
      <ui-tag color="sociology">社会学</ui-tag>
      <ui-tag color="politics">政治学</ui-tag>
      <ui-tag color="law">法学</ui-tag>
      <ui-tag color="math">数学</ui-tag>
      <ui-tag color="default">その他</ui-tag>
    </div>
  `,
};

/**
 * 複合例（実際の使用例）
 */
export const RealWorldExample: Story = {
  render: () => html`
    <div style="max-width: 600px;">
      <h3 style="margin-bottom: 1rem;">楽曲分析: くるみ割り人形</h3>
      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;">
        <ui-tag color="music" href="/tags/music">音楽</ui-tag>
        <ui-tag color="music" href="/tags/classical">クラシック</ui-tag>
        <ui-tag color="default" href="/tags/ballet">バレエ</ui-tag>
        <ui-tag color="default" href="/tags/analysis">分析</ui-tag>
      </div>
    </div>
  `,
};

/**
 * BDD: 基本的なタグレンダリング
 */
export const BDD_BasicTag: Story = {
  tags: ['test'],
  render: () => html`
    <ui-tag data-testid="basic-tag" color="music">音楽</ui-tag>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const tag = canvas.getByTestId('basic-tag') as HTMLElement;

    // タグが正しくレンダリングされている
    await expect(tag).toBeInTheDocument();
    await expect(tag.textContent?.trim()).toBe('音楽');
  },
};

/**
 * BDD: クリック可能なタグ
 */
export const BDD_ClickableTag: Story = {
  tags: ['test'],
  render: () => html`
    <ui-tag
      data-testid="clickable-tag"
      color="music"
      href="/tags/music"
    >
      音楽
    </ui-tag>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const tag = canvas.getByTestId('clickable-tag') as HTMLElement;

    // href が設定されている場合、内部に <a> タグがある
    const link = tag.shadowRoot?.querySelector('a');
    await expect(link).toBeInTheDocument();
    await expect(link?.getAttribute('href')).toBe('/tags/music');

    // クリック可能な外観（cursor: pointer）
    const computedStyle = window.getComputedStyle(tag);
    await expect(computedStyle.cursor).toBe('pointer');
  },
};

/**
 * BDD: 削除可能なタグ
 */
export const BDD_DismissibleTag: Story = {
  tags: ['test'],
  render: () => html`
    <ui-tag
      data-testid="dismissible-tag"
      color="music"
      dismissible
    >
      音楽
    </ui-tag>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const tag = canvas.getByTestId('dismissible-tag') as HTMLElement;

    // 削除ボタンが存在する
    const dismissButton = tag.shadowRoot?.querySelector('.dismiss-button');
    await expect(dismissButton).toBeInTheDocument();

    // 削除ボタンをクリックすると dismiss イベントが発火
    let dismissFired = false;
    tag.addEventListener('dismiss', () => {
      dismissFired = true;
    });

    if (dismissButton) {
      await userEvent.click(dismissButton as HTMLElement);
    }

    await expect(dismissFired).toBe(true);
  },
};

/**
 * BDD: 無効状態のタグ
 */
export const BDD_DisabledTag: Story = {
  tags: ['test'],
  render: () => html`
    <ui-tag
      data-testid="disabled-tag"
      color="music"
      disabled
    >
      音楽
    </ui-tag>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const tag = canvas.getByTestId('disabled-tag') as HTMLElement;

    // disabled 属性が設定されている
    await expect(tag.hasAttribute('disabled')).toBe(true);

    // クリック不可の外観（opacity が低い、cursor: not-allowed）
    const computedStyle = window.getComputedStyle(tag);
    await expect(parseFloat(computedStyle.opacity)).toBeLessThan(1);
  },
};

/**
 * BDD: アイコン付きタグ
 */
export const BDD_TagWithIcon: Story = {
  tags: ['test'],
  render: () => html`
    <ui-tag data-testid="icon-tag" color="music">
      <span slot="prefix">🎵</span>
      音楽
    </ui-tag>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const tag = canvas.getByTestId('icon-tag') as HTMLElement;

    // prefix スロットが存在する
    const prefix = tag.querySelector('[slot="prefix"]');
    await expect(prefix).toBeInTheDocument();
    await expect(prefix?.textContent).toBe('🎵');
  },
};
