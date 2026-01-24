import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { expect, userEvent, within } from 'storybook/test';
import type { UiBanner } from './banner';
import './banner.ts';
import '../button/button.ts';

const meta: Meta<UiBanner> = {
  title: 'Components/Banner',
  component: 'ui-banner',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['info', 'success', 'warning', 'error'],
      description: 'バナーの種類',
    },
    dismissible: {
      control: { type: 'boolean' },
      description: '閉じるボタンを表示するか',
    },
    showIcon: {
      control: { type: 'boolean' },
      description: 'アイコンを表示するか',
    },
  },
};

export default meta;
type Story = StoryObj<UiBanner>;

/**
 * 情報バナー（デフォルト）
 */
export const Info: Story = {
  render: () => html`
    <ui-banner variant="info">
      <strong>お知らせ:</strong> システムメンテナンスを1月25日 2:00-4:00に実施します。
    </ui-banner>
  `,
};

/**
 * 成功バナー
 */
export const Success: Story = {
  render: () => html`
    <ui-banner variant="success">
      <strong>成功:</strong> データの保存が完了しました。
    </ui-banner>
  `,
};

/**
 * 警告バナー
 */
export const Warning: Story = {
  render: () => html`
    <ui-banner variant="warning">
      <strong>注意:</strong> このページはアーカイブされています。最新の情報は<a href="#">こちら</a>をご覧ください。
    </ui-banner>
  `,
};

/**
 * エラーバナー
 */
export const Error: Story = {
  render: () => html`
    <ui-banner variant="error">
      データの読み込みに失敗しました。ページを再読み込みしてください。
    </ui-banner>
  `,
};

/**
 * 本文を複数行表示
 */
export const MultiLine: Story = {
  render: () => html`
    <ui-banner variant="info">
      <strong>お知らせ:</strong> システムメンテナンスを1月25日 2:00-4:00に実施します。<br>システムメンテナンスを1月25日 2:00-4:00に実施します。<br>システムメンテナンスを1月25日 2:00-4:00に実施します。<br>システムメンテナンスを1月25日 2:00-4:00に実施します。<br>システムメンテナンスを1月25日 2:00-4:00に実施します。<br>
    </ui-banner>
  `,
};

/**
 * 閉じるボタン付き
 */
export const Dismissible: Story = {
  render: () => html`
    <ui-banner variant="info" dismissible>
      この通知は閉じることができます。
    </ui-banner>
  `,
};

/**
 * アイコンなし
 */
export const WithoutIcon: Story = {
  render: () => html`
    <ui-banner variant="info" .showIcon="${false}">
      アイコンなしのシンプルなバナーです。
    </ui-banner>
  `,
};

/**
 * アクション付きバナー
 */
export const WithAction: Story = {
  render: () => html`
    <ui-banner variant="warning" dismissible>
      <span>新しいバージョンが利用可能です。</span>
      <ui-button slot="action" size="sm" variant="outline" @click="${() => alert('更新を開始')}">
        今すぐ更新
      </ui-button>
    </ui-banner>
  `,
};

/**
 * 複数スタック
 */
export const Multiple: Story = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: var(--space-3);">
      <ui-banner variant="error" dismissible>
        接続エラーが発生しました。
      </ui-banner>
      <ui-banner variant="warning">
        一部の機能が制限されています。
      </ui-banner>
      <ui-banner variant="success" dismissible>
        設定を保存しました。
      </ui-banner>
    </div>
  `,
};

/**
 * ダークモード
 */
export const DarkMode: Story = {
  render: () => html`
    <div data-theme="dark" style="background: #0a0a0a; padding: 2rem; min-height: 200px;">
      <ui-banner variant="info" dismissible>
        この通知は閉じることができます。
      </ui-banner>
    </div>
  `,
};

/**
 * ダークモード（全バリアント）
 */
export const DarkMode_AllVariants: Story = {
  render: () => html`
    <div data-theme="dark" style="background: #0a0a0a; padding: 2rem; display: flex; flex-direction: column; gap: var(--space-3);">
      <ui-banner variant="info" dismissible>
        情報: この通知は閉じることができます。
      </ui-banner>
      <ui-banner variant="success" dismissible>
        成功: データの保存が完了しました。
      </ui-banner>
      <ui-banner variant="warning">
        警告: 一部の機能が制限されています。
      </ui-banner>
      <ui-banner variant="error" dismissible>
        エラー: 接続に失敗しました。
      </ui-banner>
    </div>
  `,
};

/**
 * BDD: 閉じるボタンのクリック
 */
export const BDD_Dismissible: Story = {
  tags: ['test'],
  render: () => html`
    <ui-banner data-testid="dismissible-banner" variant="info" dismissible>
      テスト用バナー
    </ui-banner>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const banner = canvas.getByTestId('dismissible-banner') as UiBanner;

    // 初期状態: バナーが表示されている
    await expect(banner).toBeInTheDocument();

    // 閉じるボタンを探す
    const closeButton = banner.shadowRoot?.querySelector('[aria-label*="閉じる"]') as HTMLElement;
    await expect(closeButton).toBeInTheDocument();

    // クリックして閉じる
    await userEvent.click(closeButton);

    // 少し待機（アニメーションがある場合）
    await new Promise(resolve => setTimeout(resolve, 300));

    // バナーがDOMから削除される、または非表示になる
    // （実装によっては display: none または削除される）
    const isHidden = banner.hasAttribute('hidden') || banner.style.display === 'none';
    await expect(isHidden || !banner.isConnected).toBe(true);
  },
};

/**
 * BDD: ARIA属性の確認
 */
export const BDD_Accessibility: Story = {
  tags: ['test'],
  render: () => html`
    <ui-banner data-testid="a11y-banner" variant="error">
      エラーメッセージ
    </ui-banner>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const banner = canvas.getByTestId('a11y-banner') as UiBanner;

    // role="alert" または "status" が設定されているか
    const role = banner.getAttribute('role');
    await expect(['alert', 'status']).toContain(role);

    // aria-live が設定されているか
    const ariaLive = banner.getAttribute('aria-live');
    await expect(ariaLive).toBeTruthy();
  },
};

/**
 * BDD: イベント発火の確認
 */
export const BDD_CloseEvent: Story = {
  tags: ['test'],
  render: () => html`
    <ui-banner data-testid="event-banner" variant="info" dismissible>
      イベントテスト
    </ui-banner>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const banner = canvas.getByTestId('event-banner') as UiBanner;

    let eventFired = false;
    banner.addEventListener('banner-close', () => {
      eventFired = true;
    });

    const closeButton = banner.shadowRoot?.querySelector('[aria-label*="閉じる"]') as HTMLElement;
    await userEvent.click(closeButton);

    await new Promise(resolve => setTimeout(resolve, 100));
    
    // イベントが発火したか
    await expect(eventFired).toBe(true);
  },
};
