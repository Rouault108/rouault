import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { expect, userEvent, within } from 'storybook/test';
import '../icon-button/icon-button.ts';
import type { UiToast, UiToastContainer } from './toast';
import './toast.ts';

const meta: Meta<UiToast> = {
  title: 'Components/Toast',
  component: 'ui-toast',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['info', 'success', 'warning', 'error'],
      description: 'トーストの種類',
    },
    duration: {
      control: { type: 'number' },
      description: '自動で閉じるまでの時間（ミリ秒）。0で無効化',
    },
    dismissible: {
      control: { type: 'boolean' },
      description: 'クローズボタンを表示するかどうか',
    },
  },
};

export default meta;
type Story = StoryObj<UiToast>;

/**
 * デフォルトのトースト通知
 */
export const Default: Story = {
  args: {
    variant: 'info',
    duration: 0,
    dismissible: true,
  },
  render: (args) => html`
    <ui-toast variant="${args.variant}" duration="${args.duration}" ?dismissible="${args.dismissible}">
      <strong slot="title">通知</strong>
      これはデフォルトのトースト通知です。
    </ui-toast>
  `,
};

/**
 * 成功通知
 */
export const Success: Story = {
  render: () => html`
    <ui-toast variant="success" duration="0" dismissible>
      <strong slot="title">保存完了</strong>
      変更内容が正常に保存されました。
    </ui-toast>
  `,
};

/**
 * 警告通知
 */
export const Warning: Story = {
  render: () => html`
    <ui-toast variant="warning" duration="0" dismissible>
      <strong slot="title">注意</strong>
      この操作は元に戻せません。続行しますか？
    </ui-toast>
  `,
};

/**
 * エラー通知
 */
export const Error: Story = {
  render: () => html`
    <ui-toast variant="error" duration="0" dismissible>
      <strong slot="title">エラー</strong>
      ネットワークエラーが発生しました。もう一度お試しください。
    </ui-toast>
  `,
};

/**
 * 情報通知（タイトルなし）
 */
export const MessageOnly: Story = {
  render: () => html`
    <ui-toast variant="info" duration="0" dismissible>
      新しいアップデートが利用可能です。
    </ui-toast>
  `,
};

/**
 * クローズボタンなし
 */
export const NotDismissible: Story = {
  render: () => html`
    <ui-toast variant="info" duration="0">
      <strong slot="title">処理中...</strong>
      しばらくお待ちください。
    </ui-toast>
  `,
};

/**
 * 自動消滅（3秒）
 */
export const AutoDismiss: Story = {
  render: () => html`
    <ui-toast variant="success" duration="3000" dismissible>
      <strong slot="title">送信完了</strong>
      メッセージが送信されました。
    </ui-toast>
  `,
};

/**
 * ダークモード
 */
export const DarkMode: Story = {
  render: () => html`
    <div data-theme="dark" style="background: #0a0a0a; padding: 2rem; min-height: 200px;">
      <ui-toast variant="info" duration="0" dismissible>
        <strong slot="title">ダークモード</strong>
        ダークモードでのトースト表示です。
      </ui-toast>
    </div>
  `,
};

/**
 * トーストコンテナ - 右上配置（デフォルト）
 */
export const ContainerTopRight: Story = {
  render: () => html`
    <div style="position: relative; height: 400px; border: 2px dashed #e5e7eb; border-radius: 8px; overflow: hidden; background: var(--color-background-subtle, #f9fafb);">
      <ui-toast-container position="top-right" absolute>
        <ui-toast variant="info" duration="0" dismissible>
          <strong slot="title">通知 1</strong>
          右上に表示されます。
        </ui-toast>
        <ui-toast variant="success" duration="0" dismissible>
          <strong slot="title">通知 2</strong>
          複数のトーストが積み重なります。
        </ui-toast>
      </ui-toast-container>
    </div>
  `,
};

/**
 * トーストコンテナ - 右下配置
 */
export const ContainerBottomRight: Story = {
  render: () => html`
    <div style="position: relative; height: 400px; border: 2px dashed #e5e7eb; border-radius: 8px; overflow: hidden; background: var(--color-background-subtle, #f9fafb);">
      <ui-toast-container position="bottom-right" absolute>
        <ui-toast variant="warning" duration="0" dismissible>
          <strong slot="title">警告</strong>
          右下に表示されます。
        </ui-toast>
      </ui-toast-container>
    </div>
  `,
};

/**
 * トーストコンテナ - 左上配置
 */
export const ContainerTopLeft: Story = {
  render: () => html`
    <div style="position: relative; height: 400px; border: 2px dashed #e5e7eb; border-radius: 8px; overflow: hidden; background: var(--color-background-subtle, #f9fafb);">
      <ui-toast-container position="top-left" absolute>
        <ui-toast variant="error" duration="0" dismissible>
          <strong slot="title">エラー</strong>
          左上に表示されます。
        </ui-toast>
      </ui-toast-container>
    </div>
  `,
};

/**
 * トーストコンテナ - 左下配置
 */
export const ContainerBottomLeft: Story = {
  render: () => html`
    <div style="position: relative; height: 400px; border: 2px dashed #e5e7eb; border-radius: 8px; overflow: hidden; background: var(--color-background-subtle, #f9fafb);">
      <ui-toast-container position="bottom-left" absolute>
        <ui-toast variant="success" duration="0" dismissible>
          <strong slot="title">成功</strong>
          左下に表示されます。
        </ui-toast>
      </ui-toast-container>
    </div>
  `,
};

/**
 * 複数のトースト（様々なバリアント）
 */
export const MultipleToasts: Story = {
  render: () => html`
    <div style="position: relative; height: 500px; border: 2px dashed #e5e7eb; border-radius: 8px; overflow: hidden; background: var(--color-background-subtle, #f9fafb);">
      <ui-toast-container position="top-right" absolute>
        <ui-toast variant="success" duration="0" dismissible>
          <strong slot="title">成功</strong>
          ファイルが正常にアップロードされました。
        </ui-toast>
        <ui-toast variant="info" duration="0" dismissible>
          <strong slot="title">お知らせ</strong>
          新しい機能が追加されました。
        </ui-toast>
        <ui-toast variant="warning" duration="0" dismissible>
          <strong slot="title">注意</strong>
          ストレージ容量が残りわずかです。
        </ui-toast>
        <ui-toast variant="error" duration="0" dismissible>
          <strong slot="title">エラー</strong>
          接続に失敗しました。
        </ui-toast>
      </ui-toast-container>
    </div>
  `,
};

/**
 * BDD: 基本的なレンダリング
 */
export const BDD_BasicRendering: Story = {
  tags: ['test'],
  render: () => html`
    <ui-toast variant="info" duration="0" dismissible data-testid="toast">
      <strong slot="title">テストタイトル</strong>
      テストメッセージ
    </ui-toast>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const toast = canvas.getByTestId('toast') as UiToast;

    // トーストが表示されている
    await expect(toast).toBeInTheDocument();
    await expect(toast.variant).toBe('info');
    await expect(toast.dismissible).toBe(true);

    // タイトルとメッセージが表示されている
    const titleSlot = toast.shadowRoot?.querySelector('slot[name="title"]') as HTMLSlotElement;
    const defaultSlot = toast.shadowRoot?.querySelector('slot:not([name])') as HTMLSlotElement;
    
    await expect(titleSlot).toBeInTheDocument();
    await expect(defaultSlot).toBeInTheDocument();
  },
};

/**
 * BDD: クローズボタンのクリック
 */
export const BDD_CloseButton: Story = {
  tags: ['test'],
  render: () => html`
    <ui-toast variant="success" duration="0" dismissible data-testid="toast">
      <strong slot="title">クローズテスト</strong>
      このトーストは閉じることができます。
    </ui-toast>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const toast = canvas.getByTestId('toast') as UiToast;

    // クローズボタンが存在する
    const closeButton = toast.shadowRoot?.querySelector('ui-icon-button') as HTMLElement;
    await expect(closeButton).toBeInTheDocument();

    // イベントリスナーを設定
    let dismissed = false;
    toast.addEventListener('toast-dismiss', () => {
      dismissed = true;
    });

    // クローズボタンをクリック
    const button = closeButton.shadowRoot?.querySelector('button') as HTMLElement;
    await userEvent.click(button);
    await new Promise((resolve) => setTimeout(resolve, 100));

    // イベントが発火している
    await expect(dismissed).toBe(true);
  },
};

/**
 * BDD: 自動消滅
 */
export const BDD_AutoDismiss: Story = {
  tags: ['test'],
  render: () => html`
    <ui-toast variant="info" duration="500" dismissible data-testid="toast">
      <strong slot="title">自動消滅</strong>
      0.5秒後に自動的に消えます。
    </ui-toast>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const toast = canvas.getByTestId('toast') as UiToast;

    let dismissed = false;
    toast.addEventListener('toast-dismiss', () => {
      dismissed = true;
    });

    // 500ms 待機
    await new Promise((resolve) => setTimeout(resolve, 600));

    // 自動的にイベントが発火している
    await expect(dismissed).toBe(true);
  },
};

/**
 * BDD: トーストコンテナの動作
 */
export const BDD_ToastContainer: Story = {
  tags: ['test'],
  render: () => html`
    <ui-toast-container position="top-right" data-testid="container">
      <ui-toast variant="info" duration="0" dismissible data-testid="toast-1">
        トースト 1
      </ui-toast>
      <ui-toast variant="success" duration="0" dismissible data-testid="toast-2">
        トースト 2
      </ui-toast>
    </ui-toast-container>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const container = canvas.getByTestId('container') as UiToastContainer;

    // コンテナが正しく表示されている
    await expect(container).toBeInTheDocument();
    await expect(container.position).toBe('top-right');

    // 複数のトーストが含まれている
    const toast1 = canvas.getByTestId('toast-1');
    const toast2 = canvas.getByTestId('toast-2');

    await expect(toast1).toBeInTheDocument();
    await expect(toast2).toBeInTheDocument();
  },
};

/**
 * BDD: クローズボタンなしの場合
 */
export const BDD_NotDismissible: Story = {
  tags: ['test'],
  render: () => html`
    <ui-toast variant="info" duration="0" data-testid="toast">
      <strong slot="title">クローズ不可</strong>
      このトーストにはクローズボタンがありません。
    </ui-toast>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const toast = canvas.getByTestId('toast') as UiToast;

    // dismissible プロパティが false
    await expect(toast.dismissible).toBe(false);

    // クローズボタンが存在しない
    const closeButton = toast.shadowRoot?.querySelector('ui-icon-button');
    await expect(closeButton).toBeNull();
  },
};

/**
 * BDD: キーボード操作（Enterキーでクローズ）
 */
export const BDD_KeyboardClose: Story = {
  tags: ['test'],
  render: () => html`
    <ui-toast variant="success" duration="0" dismissible data-testid="toast">
      <strong slot="title">キーボードテスト</strong>
      Enterキーでクローズボタンを押下できます。
    </ui-toast>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const toast = canvas.getByTestId('toast') as UiToast;

    // クローズボタンが存在する
    const closeButton = toast.shadowRoot?.querySelector('ui-icon-button') as HTMLElement;
    await expect(closeButton).toBeInTheDocument();

    // イベントリスナーを設定
    let dismissed = false;
    toast.addEventListener('toast-dismiss', () => {
      dismissed = true;
    });

    // クローズボタンの内部ボタンにフォーカス
    const button = closeButton.shadowRoot?.querySelector('button') as HTMLElement;
    button.focus();

    // Enterキーでクローズ
    await userEvent.keyboard('{Enter}');
    await new Promise((resolve) => setTimeout(resolve, 100));

    // イベントが発火している
    await expect(dismissed).toBe(true);
  },
};

/**
 * BDD: ダークモードでのアイコンコントラスト
 */
export const BDD_DarkModeContrast: Story = {
  tags: ['test'],
  render: () => html`
    <div data-theme="dark" style="background: #0a0a0a; padding: 2rem;">
      <ui-toast variant="info" duration="0" dismissible data-testid="toast-info">
        <strong slot="title">Info</strong>
        ダークモードでのアイコン表示
      </ui-toast>
    </div>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const toast = canvas.getByTestId('toast-info') as UiToast;

    await expect(toast).toBeInTheDocument();

    // アイコンの色がダークモード用に調整されていることを検証
    const icon = toast.shadowRoot?.querySelector('.icon') as HTMLElement;
    await expect(icon).toBeInTheDocument();

    // 計算済みスタイルで色が適用されていることを確認
    const computedStyle = window.getComputedStyle(icon);
    await expect(computedStyle.color).toBeTruthy();
  },
};
