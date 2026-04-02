import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './dialog';
import type { UiDialog } from './dialog';

const getStoryDialogFromSource = (source: EventTarget | null, id: string): UiDialog => {
  if (!(source instanceof HTMLElement)) {
    throw new Error('イベントソースが HTML 要素ではありません');
  }

  const storyRoot = source.closest<HTMLElement>(`[data-dialog-story="${id}"]`);
  const dialog = storyRoot?.querySelector<UiDialog>(`#${id}`);
  if (!dialog) {
    throw new Error(`#${id} が見つかりません`);
  }

  return dialog;
};

const openStoryDialog = (event: Event, id: string): void => {
  const trigger = event.currentTarget;
  if (!(trigger instanceof HTMLElement)) {
    throw new Error('ダイアログトリガーが HTML 要素ではありません');
  }

  const dialog = getStoryDialogFromSource(trigger, id);
  dialog.open(trigger);
};

const closeStoryDialog = (event: Event, id: string): void => {
  const dialog = getStoryDialogFromSource(event.currentTarget, id);
  dialog.close();
};

const meta: Meta<UiDialog> = {
  title: 'Components/Dialog',
  component: 'ui-dialog',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
重要な判断を要求するモーダル / ダイアログです。

- open / close / close-button / Escape / mode switch / scroll lock / focus return の browser contract は \`test/browser/dialog.browser.test.ts\` を正本にします。
- CSS 構造契約は \`test/ssr/css-structure-contracts.test.ts\` を正本にします。
- Storybook には representative display と manual review の面だけを残します。
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<UiDialog>;

const movedToBrowserDocs = (
  story: string,
): Pick<Story, 'tags' | 'parameters'> => ({
  tags: ['manual-only'],
  parameters: {
    docs: {
      description: {
        story,
      },
    },
  },
});

const renderModalCriticalDecision = () => html`
  <div data-dialog-story="dialog-modal" style="padding: 2rem; min-height: 18rem;">
    <button
      id="modal-trigger"
      type="button"
      @click=${(event: Event) => {
        openStoryDialog(event, 'dialog-modal');
      }}
    >
      ダイアログを開く
    </button>

    <ui-dialog id="dialog-modal" title-id="modal-title" description-id="modal-description">
      <h2 slot="title" id="modal-title">変更を保存しますか？</h2>
      <p id="modal-description">現在の設定変更を保存して画面を閉じます。</p>

      <div slot="actions" style="display: flex; gap: 8px; justify-content: flex-end;">
        <button
          id="modal-cancel"
          type="button"
          @click=${(event: Event) => {
            closeStoryDialog(event, 'dialog-modal');
          }}
        >
          キャンセル
        </button>
        <button
          id="modal-confirm"
          type="button"
          @click=${(event: Event) => {
            closeStoryDialog(event, 'dialog-modal');
          }}
        >
          保存して閉じる
        </button>
      </div>
    </ui-dialog>
  </div>
`;

export const ModalCriticalDecision: Story = {
  tags: ['smoke'],
  parameters: {
    docs: {
      description: {
        story:
          '代表表示用の smoke story です。modal surface の見え方だけを残し、open / close / focus / scroll lock の合否は test/browser/dialog.browser.test.ts を正本とします。',
      },
    },
  },
  render: renderModalCriticalDecision,
};

export const ModalCriticalDecisionOpenClose: Story = {
  ...movedToBrowserDocs(
    'modal open / close の aria・focus・scroll lock 契約は test/browser/dialog.browser.test.ts で検査します。',
  ),
  render: renderModalCriticalDecision,
};

export const ModalCriticalDecisionCloseButton: Story = {
  ...movedToBrowserDocs(
    'close button 経路の closed reason と focus return は test/browser/dialog.browser.test.ts で検査します。',
  ),
  render: renderModalCriticalDecision,
};

export const ModalEscCancelSequence: Story = {
  ...movedToBrowserDocs(
    'Esc 時の ui-dialog-cancel -> ui-dialog-closed 順序は test/browser/dialog.browser.test.ts で検査します。',
  ),
  render: () => html`
    <div style="padding: 2rem; min-height: 18rem;">
      <button id="modal-esc-trigger" type="button">Escテストを開く</button>

      <ui-dialog
        id="dialog-modal-esc"
        title-id="modal-esc-title"
        description-id="modal-esc-description"
      >
        <h2 slot="title" id="modal-esc-title">Esc確認</h2>
        <p id="modal-esc-description">Esc でキャンセルイベントが発火して閉じることを確認します。</p>

        <div slot="actions" style="display: flex; gap: 8px; justify-content: flex-end;">
          <button type="button">OK</button>
        </div>
      </ui-dialog>
    </div>
  `,
};

export const NonModalLightweightInfo: Story = {
  ...movedToBrowserDocs(
    'non-modal 時の aria-modal 省略と dialog 外 focus からの Escape は test/browser/dialog.browser.test.ts で検査します。',
  ),
  render: () => html`
    <div style="padding: 2rem; min-height: 18rem;">
      <button id="non-modal-trigger" type="button">非モーダルを開く</button>

      <ui-dialog id="dialog-non-modal" .modal=${false} title-id="info-title">
        <h2 slot="title" id="info-title">お知らせ</h2>
        <p>このダイアログは Focus Trap を持たず、Esc で閉じます。</p>

        <div slot="actions" style="display: flex; gap: 8px; justify-content: flex-end;">
          <button id="non-modal-action" type="button">了解</button>
        </div>
      </ui-dialog>
    </div>
  `,
};

export const NoActionsInitialFocusFallback: Story = {
  ...movedToBrowserDocs(
    'actions 未提供時の初期 focus fallback は test/browser/dialog.browser.test.ts で検査します。',
  ),
  render: () => html`
    <div style="padding: 2rem; min-height: 18rem;">
      <button id="no-actions-trigger" type="button">actionsなしで開く</button>

      <ui-dialog
        id="dialog-no-actions"
        title-id="no-actions-title"
        description-id="no-actions-description"
      >
        <h2 slot="title" id="no-actions-title">初期フォーカス確認</h2>
        <p id="no-actions-description">actions スロット未指定時のフォーカス先を確認します。</p>
      </ui-dialog>
    </div>
  `,
};

export const TriggerFallbackAndReentrancySafety: Story = {
  ...movedToBrowserDocs(
    'trigger 省略時の activeElement 採用と再入安全性は test/browser/dialog.browser.test.ts で検査します。',
  ),
  render: () => html`
    <div style="padding: 2rem; min-height: 18rem;">
      <button id="fallback-trigger" type="button">自動トリガーで開く</button>

      <ui-dialog id="dialog-fallback" title-id="fallback-title">
        <h2 slot="title" id="fallback-title">再入安全性テスト</h2>
        <p>open() / close() の連続呼び出しでイベント重複がないことを確認します。</p>

        <div slot="actions" style="display: flex; gap: 8px; justify-content: flex-end;">
          <button type="button">閉じる準備</button>
        </div>
      </ui-dialog>
    </div>
  `,
};

export const AriaLabelFallback: Story = {
  ...movedToBrowserDocs(
    'aria-labelledby 未使用時の aria-label fallback は test/browser/dialog.browser.test.ts で検査します。',
  ),
  render: () => html`
    <div style="padding: 2rem; min-height: 18rem;">
      <button id="aria-label-trigger" type="button">aria-label で開く</button>

      <ui-dialog id="dialog-aria-label" aria-label="通知ダイアログ">
        <p>title-id を使わない場合でも aria-label によりアクセシブルネームを提供します。</p>

        <div slot="actions" style="display: flex; gap: 8px; justify-content: flex-end;">
          <button type="button">OK</button>
        </div>
      </ui-dialog>
    </div>
  `,
};

export const MultiDialogScrollLockReferenceCount: Story = {
  ...movedToBrowserDocs(
    '複数 dialog 同時 open 時の body scroll lock 参照カウントは test/browser/dialog.browser.test.ts で検査します。',
  ),
  render: () => html`
    <div style="padding: 2rem; min-height: 18rem; display: flex; gap: 12px;">
      <button id="multi-trigger-a" type="button">Aを開く</button>
      <button id="multi-trigger-b" type="button">Bを開く</button>

      <ui-dialog id="dialog-multi-a" title-id="multi-title-a">
        <h2 slot="title" id="multi-title-a">ダイアログA</h2>
        <p>A本文</p>
      </ui-dialog>

      <ui-dialog id="dialog-multi-b" title-id="multi-title-b">
        <h2 slot="title" id="multi-title-b">ダイアログB</h2>
        <p>B本文</p>
      </ui-dialog>
    </div>
  `,
};

export const AttributeDrivenOpenState: Story = {
  ...movedToBrowserDocs(
    'opened 属性の外部同期と attribute-sync close reason は test/browser/dialog.browser.test.ts で検査します。',
  ),
  render: () => html`
    <div style="padding: 2rem; min-height: 18rem;">
      <ui-dialog
        id="dialog-attribute-driven"
        title-id="attribute-title"
        description-id="attribute-description"
      >
        <h2 slot="title" id="attribute-title">属性駆動テスト</h2>
        <p id="attribute-description">opened プロパティを直接変更して開閉します。</p>

        <div slot="actions" style="display: flex; gap: 8px; justify-content: flex-end;">
          <button type="button">確認</button>
        </div>
      </ui-dialog>
    </div>
  `,
};

export const LiveModalModeSwitching: Story = {
  ...movedToBrowserDocs(
    'open 中の modal 切替と ui-dialog-mode-changed は test/browser/dialog.browser.test.ts で検査します。',
  ),
  render: () => html`
    <div style="padding: 2rem; min-height: 18rem;">
      <button id="modal-switch-trigger" type="button">切り替えトリガー</button>

      <ui-dialog
        id="dialog-modal-switch"
        title-id="modal-switch-title"
        description-id="modal-switch-description"
      >
        <h2 slot="title" id="modal-switch-title">モード切り替え確認</h2>
        <p id="modal-switch-description">
          open 中の modal 切り替えで挙動が同期することを確認します。
        </p>

        <div slot="actions" style="display: flex; gap: 8px; justify-content: flex-end;">
          <button type="button">了解</button>
        </div>
      </ui-dialog>
    </div>
  `,
};

export const VisualDarkMode: Story = {
  tags: ['manual-only'],
  render: () => html`
    <div
      style="
        padding: 2rem;
        background: oklch(16% 0.01 250);
        color: oklch(95% 0.01 250);
        --bg-default: oklch(16% 0.01 250);
        --bg-surface-3: oklch(22% 0.02 250);
        --fg-default: oklch(95% 0.01 250);
        --fg-muted: oklch(70% 0.01 250);
        --border-muted: oklch(70% 0.01 250 / 0.25);
      "
    >
      <ui-dialog
        .modal=${false}
        .opened=${true}
        title-id="dark-title"
        description-id="dark-description"
        style="max-width: 640px; margin-inline: auto;"
      >
        <h2 slot="title" id="dark-title">Dark Mode Visual</h2>
        <p id="dark-description">ダークモード相当のトークンで視覚回帰を確認します。</p>
        <div slot="actions" style="display: flex; gap: 8px; justify-content: flex-end;">
          <button type="button">閉じる</button>
        </div>
      </ui-dialog>
    </div>
  `,
};

export const VisualForcedColors: Story = {
  tags: ['manual-only'],
  render: () => html`
    <div
      style="
        padding: 2rem;
        background: Canvas;
        color: CanvasText;
        border: 1px solid CanvasText;
        --bg-default: Canvas;
        --fg-default: CanvasText;
        --border-muted: CanvasText;
        --elevation-xl: none;
      "
    >
      <ui-dialog
        .modal=${false}
        .opened=${true}
        aria-label="Forced Colors Visual"
        style="max-width: 640px; margin-inline: auto;"
      >
        <p>forced-colors 相当の配色で境界と可読性を確認します。</p>
      </ui-dialog>
    </div>
  `,
};

export const VisualReducedMotion: Story = {
  tags: ['manual-only'],
  render: () => html`
    <div style="padding: 2rem; --duration-slower: 0.01ms; --duration-fast: 0.01ms;">
      <ui-dialog
        .modal=${false}
        .opened=${true}
        title-id="reduced-motion-title"
        description-id="reduced-motion-description"
      >
        <h2 slot="title" id="reduced-motion-title">Reduced Motion Visual</h2>
        <p id="reduced-motion-description">アニメーション短縮時の視覚崩れを確認します。</p>
      </ui-dialog>
    </div>
  `,
};