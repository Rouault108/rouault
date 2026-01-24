import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { expect, userEvent, within } from 'storybook/test';
import type { UiModal } from './modal';
import './modal.ts';
import '../button/button.ts';

const meta: Meta<UiModal> = {
  title: 'Components/Modal',
  component: 'ui-modal',
  tags: ['autodocs'],
  argTypes: {
    open: {
      control: { type: 'boolean' },
      description: 'モーダルの開閉状態',
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg', 'xl'],
      description: 'モーダルのサイズ',
    },
    preventBackdropClose: {
      control: { type: 'boolean' },
      description: 'バックドロップクリックでモーダルを閉じることを防ぐ',
    },
    showCloseButton: {
      control: { type: 'boolean' },
      description: 'クローズボタンを表示するかどうか',
    },
  },
};

export default meta;
type Story = StoryObj<UiModal>;

/**
 * 基本的なモーダルダイアログ
 */
export const Default: Story = {
  render: () => html`
    <div>
      <ui-button @click="${() => {
        const modal = document.getElementById('default-modal') as UiModal;
        if (modal) modal.open = true;
      }}">モーダルを開く</ui-button>
      
      <ui-modal id="default-modal">
        <h2 slot="header">モーダルタイトル</h2>
        <p>これは基本的なモーダルダイアログです。Escキーを押すか、外側をクリックして閉じることができます。</p>
      </ui-modal>
    </div>
  `,
};

/**
 * フッター付きモーダル
 */
export const WithFooter: Story = {
  render: () => {
    const openModal = () => {
      const modal = document.getElementById('footer-modal') as UiModal;
      if (modal) modal.open = true;
    };
    const closeModal = () => {
      const modal = document.getElementById('footer-modal') as UiModal;
      if (modal) modal.open = false;
    };
    const confirm = () => {
      const modal = document.getElementById('footer-modal') as UiModal;
      if (modal) modal.open = false;
      alert('確認されました！');
    };

    return html`
    <div>
      <ui-button @click="${openModal}">フッター付きモーダルを開く</ui-button>
      
      <ui-modal id="footer-modal">
        <h2 slot="header">確認</h2>
        <p>この操作を実行してもよろしいですか？</p>
        <div slot="footer" style="display: flex; gap: var(--space-3); justify-content: flex-end;">
          <ui-button variant="outline" @click="${closeModal}">キャンセル</ui-button>
          <ui-button @click="${confirm}">確認</ui-button>
        </div>
      </ui-modal>
    </div>
  `;
  },
};

/**
 * 確認ダイアログ
 */
export const ConfirmationDialog: Story = {
  render: () => {
    const openModal = () => {
      const modal = document.getElementById('confirm-dialog') as UiModal;
      if (modal) modal.open = true;
    };
    const closeModal = () => {
      const modal = document.getElementById('confirm-dialog') as UiModal;
      if (modal) modal.open = false;
    };
    const deleteItem = () => {
      const modal = document.getElementById('confirm-dialog') as UiModal;
      if (modal) modal.open = false;
      alert('削除されました');
    };

    return html`
    <div>
      <ui-button @click="${openModal}">削除確認</ui-button>
      
      <ui-modal id="confirm-dialog" size="sm">
        <h2 slot="header">削除の確認</h2>
        <p>このアイテムを削除してもよろしいですか？この操作は元に戻せません。</p>
        <div slot="footer" style="display: flex; gap: var(--space-3); justify-content: flex-end;">
          <ui-button variant="outline" @click="${closeModal}">キャンセル</ui-button>
          <ui-button variant="danger" @click="${deleteItem}">削除</ui-button>
        </div>
      </ui-modal>
    </div>
  `;
  },
};

/**
 * 大きいサイズのモーダル
 */
export const LargeModal: Story = {
  render: () => html`
    <div>
      <ui-button @click="${() => {
        const modal = document.getElementById('large-modal') as UiModal;
        if (modal) modal.open = true;
      }}">大きいモーダルを開く</ui-button>
      
      <ui-modal id="large-modal" size="lg">
        <h2 slot="header">大きいモーダル</h2>
        <div style="height: 400px;">
          <p>このモーダルは大きいサイズです。</p>
          <p>より多くのコンテンツを表示できます。</p>
          <p style="margin-top: var(--space-8);">スクロール可能なコンテンツもサポートしています。</p>
        </div>
      </ui-modal>
    </div>
  `,
};

/**
 * 小さいサイズのモーダル
 */
export const SmallModal: Story = {
  render: () => html`
    <div>
      <ui-button @click="${() => {
        const modal = document.getElementById('small-modal') as UiModal;
        if (modal) modal.open = true;
      }}">小さいモーダルを開く</ui-button>
      
      <ui-modal id="small-modal" size="sm">
        <h2 slot="header">通知</h2>
        <p>処理が完了しました。</p>
      </ui-modal>
    </div>
  `,
};

/**
 * クローズボタンなし
 */
export const NoCloseButton: Story = {
  render: () => html`
    <div>
      <ui-button @click="${() => {
        const modal = document.getElementById('no-close-modal') as UiModal;
        if (modal) modal.open = true;
      }}">クローズボタンなし</ui-button>
      
      <ui-modal id="no-close-modal" .showCloseButton="${false}">
        <h2 slot="header">重要な通知</h2>
        <p>この通知は必ず確認してください。</p>
        <div slot="footer">
          <ui-button @click="${() => {
            const modal = document.getElementById('no-close-modal') as UiModal;
            if (modal) modal.open = false;
          }}">確認しました</ui-button>
        </div>
      </ui-modal>
    </div>
  `,
};

/**
 * バックドロップクリックで閉じない
 */
export const PreventBackdropClose: Story = {
  render: () => html`
    <div>
      <ui-button @click="${() => {
        const modal = document.getElementById('prevent-close-modal') as UiModal;
        if (modal) modal.open = true;
      }}">バックドロップクリックで閉じない</ui-button>
      
      <ui-modal id="prevent-close-modal" .preventBackdropClose="${true}">
        <h2 slot="header">フォーム入力</h2>
        <p>外側をクリックしても閉じません。ボタンまたはEscキーで閉じてください。</p>
        <div slot="footer">
          <ui-button @click="${() => {
            const modal = document.getElementById('prevent-close-modal') as UiModal;
            if (modal) modal.open = false;
          }}">閉じる</ui-button>
        </div>
      </ui-modal>
    </div>
  `,
};

/**
 * 画像のみの表示
 */
export const ImageContent: Story = {
  render: () => html`
    <div>
      <ui-button @click="${() => {
        const modal = document.getElementById('image-modal') as UiModal;
        if (modal) modal.open = true;
      }}">画像を表示</ui-button>
      
      <ui-modal id="image-modal" size="lg">
        <img 
          src="https://placehold.co/800x500/e2e8f0/1e293b?text=Image+Preview" 
          alt="Preview" 
          style="width: 100%; height: auto; border-radius: var(--radius-lg, 0.5rem); display: block;" 
        />
      </ui-modal>
    </div>
  `,
};

/**
 * ダークモード
 */
export const DarkMode: Story = {
  render: () => html`
    <div data-theme="dark" style="background: #0a0a0a; padding: 2rem; min-height: 400px;">
      <ui-button @click="${() => {
        const modal = document.getElementById('dark-modal') as UiModal;
        if (modal) modal.open = true;
      }}">ダークモードモーダル</ui-button>
      
      <ui-modal id="dark-modal">
        <h2 slot="header">ダークモード</h2>
        <p>ダークモードでのモーダル表示です。</p>
        <div slot="footer">
          <ui-button @click="${() => {
            const modal = document.getElementById('dark-modal') as UiModal;
            if (modal) modal.open = false;
          }}">閉じる</ui-button>
        </div>
      </ui-modal>
    </div>
  `,
};

/**
 * BDD: 基本的な開閉動作
 */
export const BDD_OpenClose: Story = {
  tags: ['test'],
  render: () => html`
    <div>
      <ui-button data-testid="open-btn" @click="${() => {
        const modal = document.querySelector('ui-modal[data-testid="modal"]') as UiModal;
        if (modal) modal.open = true;
      }}">開く</ui-button>
      <ui-modal data-testid="modal">
        <h2 slot="header">Test Modal</h2>
        <p>Test content</p>
      </ui-modal>
    </div>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const openBtn = canvas.getByTestId('open-btn') as HTMLElement;
    const modal = canvas.getByTestId('modal') as UiModal;

    // 初期状態は閉じている
    await expect(modal.open).toBe(false);

    // ボタンをクリックしてモーダルを開く
    await userEvent.click(openBtn);
    await new Promise((resolve) => setTimeout(resolve, 100));

    // モーダルが開いている
    await expect(modal.open).toBe(true);

    // モーダルがDOMに表示されている
    const dialog = modal.shadowRoot?.querySelector('[role="dialog"]');
    await expect(dialog).toBeInTheDocument();
  },
};

/**
 * BDD: ESCキーで閉じる
 */
export const BDD_CloseWithEscape: Story = {
  tags: ['test'],
  render: () => html`
    <div>
      <ui-button data-testid="esc-open-btn" @click="${() => {
        const modal = document.querySelector('ui-modal[data-testid="esc-modal"]') as UiModal;
        if (modal) modal.open = true;
      }}">開く</ui-button>
      <ui-modal data-testid="esc-modal" .open="${true}">
        <h2 slot="header">Escape Test</h2>
        <p>Press Escape to close</p>
      </ui-modal>
    </div>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const modal = canvas.getByTestId('esc-modal') as UiModal;

    // 初期状態は開いている
    await expect(modal.open).toBe(true);

    // Escapeキーを押す
    await userEvent.keyboard('{Escape}');
    await new Promise((resolve) => setTimeout(resolve, 300));

    // モーダルが閉じている
    await expect(modal.open).toBe(false);
  },
};

/**
 * BDD: クローズボタンで閉じる
 */
export const BDD_CloseButton: Story = {
  tags: ['test'],
  render: () => html`
    <ui-modal data-testid="close-btn-modal" .open="${true}">
      <h2 slot="header">Close Button Test</h2>
      <p>Click close button</p>
    </ui-modal>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const modal = canvas.getByTestId('close-btn-modal') as UiModal;

    // 初期状態は開いている
    await expect(modal.open).toBe(true);

    // クローズボタンを見つけてクリック
    const closeButton = modal.shadowRoot?.querySelector('[aria-label="閉じる"]') as HTMLElement;
    await expect(closeButton).toBeInTheDocument();

    await userEvent.click(closeButton);
    await new Promise((resolve) => setTimeout(resolve, 300));

    // モーダルが閉じている
    await expect(modal.open).toBe(false);
  },
};

/**
 * BDD: バックドロップクリックで閉じる
 */
export const BDD_BackdropClick: Story = {
  tags: ['test'],
  render: () => html`
    <ui-modal data-testid="backdrop-modal" .open="${true}">
      <h2 slot="header">Backdrop Test</h2>
      <p>Click outside to close</p>
    </ui-modal>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const modal = canvas.getByTestId('backdrop-modal') as UiModal;

    // 初期状態は開いている
    await expect(modal.open).toBe(true);

    // バックドロップをクリック
    const backdrop = modal.shadowRoot?.querySelector('.backdrop') as HTMLElement;
    await expect(backdrop).toBeInTheDocument();

    await userEvent.click(backdrop);
    await new Promise((resolve) => setTimeout(resolve, 300));

    // モーダルが閉じている
    await expect(modal.open).toBe(false);
  },
};

/**
 * BDD: アクセシビリティ属性の確認
 */
export const BDD_Accessibility: Story = {
  tags: ['test'],
  render: () => html`
    <ui-modal data-testid="a11y-modal" .open="${true}">
      <h2 slot="header" id="modal-title">Accessibility Test</h2>
      <p id="modal-desc">Testing ARIA attributes</p>
    </ui-modal>
  `,
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    const modal = canvas.getByTestId('a11y-modal') as UiModal;

    const dialog = modal.shadowRoot?.querySelector('[role="dialog"]') as HTMLElement;
    
    // role="dialog"が設定されている
    await expect(dialog).toBeInTheDocument();
    await expect(dialog.getAttribute('role')).toBe('dialog');

    // aria-modal="true"が設定されている
    await expect(dialog.getAttribute('aria-modal')).toBe('true');

    // aria-labelledbyが設定されている（タイトルスロットがある場合）
    const ariaLabelledBy = dialog.getAttribute('aria-labelledby');
    await expect(ariaLabelledBy).toBeTruthy();
  },
};
