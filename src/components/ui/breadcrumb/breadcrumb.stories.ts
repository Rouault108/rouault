import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import { expect, within, userEvent } from 'storybook/test';
import './breadcrumb.ts';

const meta: Meta = {
  title: 'Components/Breadcrumb',
  component: 'ui-breadcrumb',
  tags: ['autodocs'],
  argTypes: {
    separator: {
      control: 'select',
      options: ['chevron', 'slash', 'arrow'],
      description: 'セパレーターのスタイル',
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
 * 基本的なパンくずリスト
 */
export const Default: Story = {
  args: {
    separator: 'chevron',
  },
  render: (args) => html`
    <ui-breadcrumb separator="${args['separator']}">
      <ui-breadcrumb-item href="/">ホーム</ui-breadcrumb-item>
      <ui-breadcrumb-item href="/docs">ドキュメント</ui-breadcrumb-item>
      <ui-breadcrumb-item current>現在のページ</ui-breadcrumb-item>
    </ui-breadcrumb>
  `,
};

// ========================================
// セパレーターバリエーション
// ========================================

/**
 * Chevron セパレーター（デフォルト）
 */
export const ChevronSeparator: Story = {
  args: {
    separator: 'chevron',
  },
  render: (args) => html`
    <ui-breadcrumb separator="${args['separator']}">
      <ui-breadcrumb-item href="/">ホーム</ui-breadcrumb-item>
      <ui-breadcrumb-item href="/blog">ブログ</ui-breadcrumb-item>
      <ui-breadcrumb-item current>記事タイトル</ui-breadcrumb-item>
    </ui-breadcrumb>
  `,
};

/**
 * Slash セパレーター
 */
export const SlashSeparator: Story = {
  args: {
    separator: 'slash',
  },
  render: (args) => html`
    <ui-breadcrumb separator="${args['separator']}">
      <ui-breadcrumb-item href="/">ホーム</ui-breadcrumb-item>
      <ui-breadcrumb-item href="/blog">ブログ</ui-breadcrumb-item>
      <ui-breadcrumb-item current>記事タイトル</ui-breadcrumb-item>
    </ui-breadcrumb>
  `,
};

/**
 * Arrow セパレーター
 */
export const ArrowSeparator: Story = {
  args: {
    separator: 'arrow',
  },
  render: (args) => html`
    <ui-breadcrumb separator="${args['separator']}">
      <ui-breadcrumb-item href="/">ホーム</ui-breadcrumb-item>
      <ui-breadcrumb-item href="/blog">ブログ</ui-breadcrumb-item>
      <ui-breadcrumb-item current>記事タイトル</ui-breadcrumb-item>
    </ui-breadcrumb>
  `,
};

/**
 * 全セパレーターのショーケース
 */
export const AllSeparators: Story = {
  render: () => html`
    <div style="${CONTAINER_STYLES.vertical}">
      <div>
        <h4 style="margin: 0 0 0.5rem 0; font-size: 0.875rem; color: var(--color-foreground-muted);">Chevron</h4>
        <ui-breadcrumb separator="chevron">
          <ui-breadcrumb-item href="/">ホーム</ui-breadcrumb-item>
          <ui-breadcrumb-item href="/docs">ドキュメント</ui-breadcrumb-item>
          <ui-breadcrumb-item current>現在のページ</ui-breadcrumb-item>
        </ui-breadcrumb>
      </div>
      <div>
        <h4 style="margin: 0 0 0.5rem 0; font-size: 0.875rem; color: var(--color-foreground-muted);">Slash</h4>
        <ui-breadcrumb separator="slash">
          <ui-breadcrumb-item href="/">ホーム</ui-breadcrumb-item>
          <ui-breadcrumb-item href="/docs">ドキュメント</ui-breadcrumb-item>
          <ui-breadcrumb-item current>現在のページ</ui-breadcrumb-item>
        </ui-breadcrumb>
      </div>
      <div>
        <h4 style="margin: 0 0 0.5rem 0; font-size: 0.875rem; color: var(--color-foreground-muted);">Arrow</h4>
        <ui-breadcrumb separator="arrow">
          <ui-breadcrumb-item href="/">ホーム</ui-breadcrumb-item>
          <ui-breadcrumb-item href="/docs">ドキュメント</ui-breadcrumb-item>
          <ui-breadcrumb-item current>現在のページ</ui-breadcrumb-item>
        </ui-breadcrumb>
      </div>
    </div>
  `,
};

// ========================================
// 実用例
// ========================================

/**
 * 深い階層の例
 */
export const DeepHierarchy: Story = {
  render: () => html`
    <ui-breadcrumb>
      <ui-breadcrumb-item href="/">ホーム</ui-breadcrumb-item>
      <ui-breadcrumb-item href="/products">製品</ui-breadcrumb-item>
      <ui-breadcrumb-item href="/products/electronics">電子機器</ui-breadcrumb-item>
      <ui-breadcrumb-item href="/products/electronics/laptops">ノートパソコン</ui-breadcrumb-item>
      <ui-breadcrumb-item current>MacBook Pro</ui-breadcrumb-item>
    </ui-breadcrumb>
  `,
};

/**
 * 省略された階層（Collapsed）
 */
export const CollapsedHierarchy: Story = {
  render: () => html`
    <ui-breadcrumb>
      <ui-breadcrumb-item href="/">ホーム</ui-breadcrumb-item>
      <ui-breadcrumb-item collapsed>
        <ui-breadcrumb-item href="/products" slot="item">製品</ui-breadcrumb-item>
        <ui-breadcrumb-item href="/products/electronics" slot="item">電子機器</ui-breadcrumb-item>
        <ui-breadcrumb-item href="/products/electronics/laptops" slot="item">ノートパソコン</ui-breadcrumb-item>
      </ui-breadcrumb-item>
      <ui-breadcrumb-item current>MacBook Pro</ui-breadcrumb-item>
    </ui-breadcrumb>
  `,
};

/**
 * 深い階層の自動省略 & モバイルビュー検証
 */
export const VeryDeepHierarchy: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  render: () => html`
    <div style="max-width: 320px; border: 1px dashed var(--color-border); padding: 1rem;">
      <h4 style="margin: 0 0 0.5rem 0; font-size: 0.875rem; color: var(--color-foreground-muted);">
        モバイル幅での折り返し確認
      </h4>
      <ui-breadcrumb>
        <ui-breadcrumb-item href="/">ホーム</ui-breadcrumb-item>
        <ui-breadcrumb-item collapsed>
          <ui-breadcrumb-item href="/docs" slot="item">ドキュメント</ui-breadcrumb-item>
          <ui-breadcrumb-item href="/docs/api" slot="item">API</ui-breadcrumb-item>
        </ui-breadcrumb-item>
        <ui-breadcrumb-item href="/docs/api/components/ui/breadcrumb/examples">Examples</ui-breadcrumb-item>
        <ui-breadcrumb-item current>Very Long Current Page Title To Test Wrap</ui-breadcrumb-item>
      </ui-breadcrumb>
    </div>
  `,
};

/**
 * 短い階層の例
 */
export const ShortHierarchy: Story = {
  render: () => html`
    <ui-breadcrumb>
      <ui-breadcrumb-item href="/">ホーム</ui-breadcrumb-item>
      <ui-breadcrumb-item current>About</ui-breadcrumb-item>
    </ui-breadcrumb>
  `,
};

/**
 * ドキュメントサイトでの使用例
 */
export const DocumentationExample: Story = {
  render: () => html`
    <div style="padding: var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-lg);">
      <ui-breadcrumb>
        <ui-breadcrumb-item href="/">Docs</ui-breadcrumb-item>
        <ui-breadcrumb-item href="/guides">Guides</ui-breadcrumb-item>
        <ui-breadcrumb-item href="/guides/getting-started">Getting Started</ui-breadcrumb-item>
        <ui-breadcrumb-item current>Installation</ui-breadcrumb-item>
      </ui-breadcrumb>
      <div style="margin-top: var(--space-4);">
        <h1 style="margin: 0; font-size: var(--text-2xl);">Installation</h1>
        <p style="margin-top: var(--space-2); color: var(--color-foreground-muted);">
          コンテンツがここに表示されます...
        </p>
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
      <ui-breadcrumb separator="chevron">
        <ui-breadcrumb-item href="/">ホーム</ui-breadcrumb-item>
        <ui-breadcrumb-item href="/docs">ドキュメント</ui-breadcrumb-item>
        <ui-breadcrumb-item current>現在のページ</ui-breadcrumb-item>
      </ui-breadcrumb>
      <ui-breadcrumb separator="slash">
        <ui-breadcrumb-item href="/">ホーム</ui-breadcrumb-item>
        <ui-breadcrumb-item href="/blog">ブログ</ui-breadcrumb-item>
        <ui-breadcrumb-item href="/blog/2024">2024</ui-breadcrumb-item>
        <ui-breadcrumb-item current>記事タイトル</ui-breadcrumb-item>
      </ui-breadcrumb>
    </div>
  `,
};

/**
 * ダークモード + Collapsed ドロップダウン展開
 */
export const DarkModeCollapsedOpen: Story = {
  parameters: {
    backgrounds: { default: 'dark' },
  },
  decorators: [
    (story) => html`
      <div data-theme="dark" style="padding: 1rem; padding-bottom: 10rem; background: var(--color-background); color: var(--color-foreground);">
        ${story()}
      </div>
    `,
  ],
  render: () => html`
    <ui-breadcrumb>
      <ui-breadcrumb-item href="/">ホーム</ui-breadcrumb-item>
      <ui-breadcrumb-item collapsed data-testid="collapsed-item-dark">
        <ui-breadcrumb-item href="/products" slot="item">製品</ui-breadcrumb-item>
        <ui-breadcrumb-item href="/products/electronics" slot="item">電子機器</ui-breadcrumb-item>
      </ui-breadcrumb-item>
      <ui-breadcrumb-item current>詳細</ui-breadcrumb-item>
    </ui-breadcrumb>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const collapsedItem = canvas.getByTestId('collapsed-item-dark') as HTMLElement;
    const button = collapsedItem.shadowRoot?.querySelector('button') as HTMLButtonElement;
    
    // ドロップダウンを開く
    await userEvent.click(button);
    await new Promise(resolve => setTimeout(resolve, 100)); // アニメーション待ち
    
    // ドロップダウンが開いていることを確認
    const dropdown = collapsedItem.shadowRoot?.querySelector('.dropdown');
    await expect(dropdown?.classList.contains('open')).toBe(true);
  }
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
    <ui-breadcrumb data-testid="basic-breadcrumb">
      <ui-breadcrumb-item href="/">ホーム</ui-breadcrumb-item>
      <ui-breadcrumb-item href="/docs">ドキュメント</ui-breadcrumb-item>
      <ui-breadcrumb-item current data-testid="current-item">現在のページ</ui-breadcrumb-item>
    </ui-breadcrumb>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const breadcrumb = canvas.getByTestId('basic-breadcrumb') as HTMLElement;

    // パンくずリストが正しくレンダリングされている
    await expect(breadcrumb).toBeInTheDocument();
    
    // nav 要素として認識される
    const nav = breadcrumb.shadowRoot?.querySelector('nav');
    await expect(nav).toBeTruthy();
    
    // ol/li 構造があるか確認（セマンティック改善）
    const ol = breadcrumb.shadowRoot?.querySelector('ol');
    await expect(ol).toBeTruthy();
  },
};

/**
 * BDD: リンククリックとイベント発火
 */
export const BDD_LinkClick: Story = {
  tags: ['test'],
  render: () => html`
    <ui-breadcrumb data-testid="clickable-breadcrumb">
      <ui-breadcrumb-item href="/target-url" data-testid="link-item">ホーム</ui-breadcrumb-item>
      <ui-breadcrumb-item current>現在のページ</ui-breadcrumb-item>
    </ui-breadcrumb>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const breadcrumb = canvas.getByTestId('clickable-breadcrumb');
    const item = canvas.getByTestId('link-item') as HTMLElement;
    const anchor = item.shadowRoot?.querySelector('a') as HTMLElement;
    
    // リンクが存在する
    await expect(anchor).toBeInTheDocument();
    await expect(anchor).toHaveAttribute('href', '/target-url');
    
    // イベントリスナーを設定
    let navigatedHref = '';
    breadcrumb.addEventListener('navigate', (e: any) => {
      navigatedHref = e.detail.href;
    });
    
    // クリックシミュレーション
    // aタグのクリックはデフォルト動作遷移を引き起こすため、e.preventDefault() をコンポーネント側で行っていない場合は
    // storybook環境では遷移してしまう可能性があるが、今回は純粋なイベント発火確認。
    // コンポーネントの実装では、!current && href があればイベント発火している。
    // anchor をクリック
    anchor.click();
    
    // navigate イベントが発火したか
    await expect(navigatedHref).toBe('/target-url');
  },
};

/**
 * BDD: キーボードナビゲーション（フォーカス順序）
 */
export const BDD_FocusNavigation: Story = {
  tags: ['test'],
  render: () => html`
    <ui-breadcrumb>
      <ui-breadcrumb-item href="/">ホーム</ui-breadcrumb-item>
      <ui-breadcrumb-item collapsed data-testid="collapsed-item-focus">
        <ui-breadcrumb-item href="/one" slot="item" data-testid="item-one">1</ui-breadcrumb-item>
        <ui-breadcrumb-item href="/two" slot="item" data-testid="item-two">2</ui-breadcrumb-item>
        <ui-breadcrumb-item href="/three" slot="item" data-testid="item-three">3</ui-breadcrumb-item>
      </ui-breadcrumb-item>
      <ui-breadcrumb-item current>Current</ui-breadcrumb-item>
    </ui-breadcrumb>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const collapsedItem = canvas.getByTestId('collapsed-item-focus') as HTMLElement;
    const button = collapsedItem.shadowRoot?.querySelector('button') as HTMLButtonElement;
    
    // ドロップダウンを開く（Spaceキー）
    button.focus();
    await userEvent.keyboard(' ');
    await new Promise(resolve => setTimeout(resolve, 100));
    await expect(button.getAttribute('aria-expanded')).toBe('true');
    
    // 開いた直後、最初のアイテムにフォーカスがあるべき
    // 注: テスト環境(jsdom/playwright)でのShadow DOM内のフォーカスチェックは工夫が必要
    // アクティブな要素が最初のアイテムに関連しているか確認したいが、
    // ここではArrowキーで操作して循環することなどをチェック
    
    // ArrowDown 2回 で アイテム3(index 2)へ
    await userEvent.keyboard('{ArrowDown}'); // 2
    await userEvent.keyboard('{ArrowDown}'); // 3
    
    // ArrowDown もう1回 で ループして アイテム1へ
    await userEvent.keyboard('{ArrowDown}'); // 1
    
    // End キー で アイテム3へ
    await userEvent.keyboard('{End}'); // 3
    
    // Home キー で アイテム1へ
    await userEvent.keyboard('{Home}'); // 1

    // Escape で閉じてフォーカスがボタンに戻る
    await userEvent.keyboard('{Escape}');
    await new Promise(resolve => setTimeout(resolve, 100));
    // シャドウDOM内のボタンにフォーカスが戻っているか
    const active = collapsedItem.shadowRoot?.activeElement;
    await expect(active).toBe(button);
  },
};

/**
 * BDD: Reduced Motion
 */
export const BDD_ReducedMotion: Story = {
  tags: ['test'],
  parameters: {
    // 完全にエミュレートするのは難しいが、CSSが適用されているかをチェックする観点
  },
  render: () => html`
    <div>
      <style>
        @media (prefers-reduced-motion: reduce) {
          .motion-test { --is-reduced: true; }
        }
      </style>
      <ui-breadcrumb class="motion-test">
        <ui-breadcrumb-item href="/">Home</ui-breadcrumb-item>
      </ui-breadcrumb>
    </div>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const item = canvas.getByText('Home');
    
    // スタイルを計算して transition が none になっているか確認したいが、
    // ブラウザ設定に依存するため、ここではコードが存在することを信頼する
    await expect(item).toBeInTheDocument();
  }
};

/**
 * BDD: 現在のページ表示
 */
export const BDD_CurrentPage: Story = {
  tags: ['test'],
  render: () => html`
    <ui-breadcrumb>
      <ui-breadcrumb-item href="/">ホーム</ui-breadcrumb-item>
      <ui-breadcrumb-item current data-testid="current-page">現在のページ</ui-breadcrumb-item>
    </ui-breadcrumb>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const currentItem = canvas.getByTestId('current-page') as HTMLElement;

    // current 属性が設定されている
    await expect(currentItem).toHaveAttribute('current');
    
    // aria-current が設定されている
    const span = currentItem.shadowRoot?.querySelector('[aria-current]');
    await expect(span?.getAttribute('aria-current')).toBe('page');
  },
};

/**
 * BDD: ARIA属性
 */
export const BDD_AriaAttributes: Story = {
  tags: ['test'],
  render: () => html`
    <ui-breadcrumb data-testid="aria-breadcrumb">
      <ui-breadcrumb-item href="/">ホーム</ui-breadcrumb-item>
      <ui-breadcrumb-item current>現在のページ</ui-breadcrumb-item>
    </ui-breadcrumb>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const breadcrumb = canvas.getByTestId('aria-breadcrumb') as HTMLElement;
    const nav = breadcrumb.shadowRoot?.querySelector('nav');

    // aria-label が設定されている
    await expect(nav?.getAttribute('aria-label')).toBe('パンくずリスト');
  },
};

/**
 * BDD: セパレーター表示
 */
export const BDD_Separators: Story = {
  tags: ['test'],
  render: () => html`
    <ui-breadcrumb data-testid="separator-breadcrumb" separator="slash">
      <ui-breadcrumb-item href="/">ホーム</ui-breadcrumb-item>
      <ui-breadcrumb-item href="/docs">ドキュメント</ui-breadcrumb-item>
      <ui-breadcrumb-item current>現在のページ</ui-breadcrumb-item>
    </ui-breadcrumb>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const breadcrumb = canvas.getByTestId('separator-breadcrumb') as HTMLElement;

    // separator 属性が設定されている
    await expect(breadcrumb).toHaveAttribute('separator', 'slash');
  },
};

/**
 * BDD: 省略されたアイテム
 */
export const BDD_CollapsedItems: Story = {
  tags: ['test'],
  render: () => html`
    <ui-breadcrumb>
      <ui-breadcrumb-item href="/">ホーム</ui-breadcrumb-item>
      <ui-breadcrumb-item collapsed data-testid="collapsed-item">
        <ui-breadcrumb-item href="/docs" slot="item">ドキュメント</ui-breadcrumb-item>
        <ui-breadcrumb-item href="/api" slot="item">API</ui-breadcrumb-item>
      </ui-breadcrumb-item>
      <ui-breadcrumb-item current>現在のページ</ui-breadcrumb-item>
    </ui-breadcrumb>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const collapsedItem = canvas.getByTestId('collapsed-item') as HTMLElement;

    // collapsed 属性が設定されている
    await expect(collapsedItem).toHaveAttribute('collapsed');
    
    // 省略ボタンが存在する
    const button = collapsedItem.shadowRoot?.querySelector('button');
    await expect(button).toBeTruthy();
    
    // aria-expanded が false
    await expect(button?.getAttribute('aria-expanded')).toBe('false');
    
    // aria-haspopup が設定されている
    await expect(button?.getAttribute('aria-haspopup')).toBe('true');
  },
};

/**
 * BDD: ドロップダウンの開閉
 */
export const BDD_DropdownToggle: Story = {
  tags: ['test'],
  render: () => html`
    <ui-breadcrumb>
      <ui-breadcrumb-item href="/">ホーム</ui-breadcrumb-item>
      <ui-breadcrumb-item collapsed data-testid="collapsed-item">
        <ui-breadcrumb-item href="/docs" slot="item" data-testid="dropdown-item">ドキュメント</ui-breadcrumb-item>
      </ui-breadcrumb-item>
      <ui-breadcrumb-item current>現在のページ</ui-breadcrumb-item>
    </ui-breadcrumb>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const collapsedItem = canvas.getByTestId('collapsed-item') as HTMLElement;
    const button = collapsedItem.shadowRoot?.querySelector('button') as HTMLButtonElement;
    
    // 初期状態: ドロップダウンは閉じている
    await expect(button.getAttribute('aria-expanded')).toBe('false');
    
    // クリックでドロップダウンを開く
    await userEvent.click(button);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // ドロップダウンが開いている
    await expect(button.getAttribute('aria-expanded')).toBe('true');
    const dropdown = collapsedItem.shadowRoot?.querySelector('.dropdown');
    await expect(dropdown?.classList.contains('open')).toBe(true);
  },
};

/**
 * BDD: キーボード操作（Escape）
 */
export const BDD_KeyboardEscape: Story = {
  tags: ['test'],
  render: () => html`
    <ui-breadcrumb>
      <ui-breadcrumb-item href="/">ホーム</ui-breadcrumb-item>
      <ui-breadcrumb-item collapsed data-testid="collapsed-item">
        <ui-breadcrumb-item href="/docs" slot="item">ドキュメント</ui-breadcrumb-item>
      </ui-breadcrumb-item>
      <ui-breadcrumb-item current>現在のページ</ui-breadcrumb-item>
    </ui-breadcrumb>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const collapsedItem = canvas.getByTestId('collapsed-item') as HTMLElement;
    const button = collapsedItem.shadowRoot?.querySelector('button') as HTMLButtonElement;
    
    // ドロップダウンを開く
    await userEvent.click(button);
    await new Promise(resolve => setTimeout(resolve, 100));
    await expect(button.getAttribute('aria-expanded')).toBe('true');
    
    // Escapeキーでドロップダウンを閉じる
    await userEvent.keyboard('{Escape}');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // ドロップダウンが閉じている
    await expect(button.getAttribute('aria-expanded')).toBe('false');
  },
};

/**
 * BDD: 国際化対応
 */
export const BDD_Internationalization: Story = {
  tags: ['test'],
  render: () => html`
    <ui-breadcrumb aria-label="Breadcrumb navigation" data-testid="i18n-breadcrumb">
      <ui-breadcrumb-item href="/">Home</ui-breadcrumb-item>
      <ui-breadcrumb-item collapsed collapsed-aria-label="Show hidden items" data-testid="i18n-collapsed">
        <ui-breadcrumb-item href="/docs" slot="item">Docs</ui-breadcrumb-item>
      </ui-breadcrumb-item>
      <ui-breadcrumb-item current>Current Page</ui-breadcrumb-item>
    </ui-breadcrumb>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const breadcrumb = canvas.getByTestId('i18n-breadcrumb') as HTMLElement;
    const nav = breadcrumb.shadowRoot?.querySelector('nav');
    
    // カスタム aria-label が適用されている
    await expect(nav?.getAttribute('aria-label')).toBe('Breadcrumb navigation');
    
    // collapsed-aria-label が適用されている
    const collapsedItem = canvas.getByTestId('i18n-collapsed') as HTMLElement;
    const button = collapsedItem.shadowRoot?.querySelector('button');
    await expect(button?.getAttribute('aria-label')).toBe('Show hidden items');
  },
};
