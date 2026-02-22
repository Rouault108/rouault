import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './dialog';
import { type UiDialog, type UiDialogOpenedDetail } from './dialog';

const wait = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

const waitFrame = async (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

const flush = async (host: UiDialog): Promise<void> => {
  await host.updateComplete;
  await waitFrame();
  await host.updateComplete;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const waitForEvent = <T extends Event>(target: EventTarget, eventName: string, timeoutMs = 3000): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${eventName} の待機がタイムアウトしました`));
    }, timeoutMs);

    const listener: EventListener = (event) => {
      window.clearTimeout(timer);
      resolve(event as T);
    };

    target.addEventListener(eventName, listener, { once: true });
  });

const ensureNoEvent = async (
  target: EventTarget,
  eventName: string,
  action: () => void | Promise<void>,
  waitMs = 220,
): Promise<void> => {
  let listener!: EventListener;
  const eventPromise = new Promise<never>((_, reject) => {
    listener = () => {
      target.removeEventListener(eventName, listener);
      reject(new Error(`${eventName} が重複発火しました`));
    };
    target.addEventListener(eventName, listener);
  });

  const timeoutPromise = wait(waitMs);
  await action();
  await Promise.race([eventPromise, timeoutPromise]);
  target.removeEventListener(eventName, listener);
};

const getHost = (canvasElement: Element, id: string): UiDialog => {
  const host = canvasElement.querySelector<UiDialog>(`#${id}`);
  if (!host) throw new Error(`#${id} が見つかりません`);
  return host;
};

const getNativeDialog = (host: UiDialog): HTMLDialogElement => {
  const dialog = host.shadowRoot?.querySelector<HTMLDialogElement>('dialog');
  if (!dialog) throw new Error('dialog 要素が見つかりません');
  return dialog;
};

const meta: Meta<UiDialog> = {
  title: 'Components/Dialog',
  component: 'ui-dialog',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
重要な判断を要求するモーダル/ダイアログです。

- \`modal=true\`: \`showModal()\`、Focus Trap、\`aria-modal="true"\`
- \`modal=false\`: \`show()\`、Esc/背景クリックで手動クローズ
- Enter/Exit アニメーション完了後に \`ui-dialog-opened\` / \`ui-dialog-closed\` を発火
- Esc/非モーダル背景クリック時は \`ui-dialog-cancel\` を発火
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<UiDialog>;

/**
 * 意味のある組み合わせ:
 * - modal=true（重要な意思決定）
 * - title/description/actions を揃えた基本構成
 */
export const ModalCriticalDecision: Story = {
  render: () => html`
    <div style="padding: 2rem; min-height: 18rem;">
      <button id="modal-trigger" type="button">ダイアログを開く</button>

      <ui-dialog id="dialog-modal" title-id="modal-title" description-id="modal-description">
        <h2 slot="title" id="modal-title">変更を保存しますか？</h2>
        <p id="modal-description">現在の設定変更を保存して画面を閉じます。</p>

        <div slot="actions" style="display: flex; gap: 8px; justify-content: flex-end;">
          <button id="modal-cancel" type="button">キャンセル</button>
          <button id="modal-confirm" type="button">保存して閉じる</button>
        </div>
      </ui-dialog>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'dialog-modal');
    const trigger = canvasElement.querySelector<HTMLButtonElement>('#modal-trigger');
    const cancelButton = canvasElement.querySelector<HTMLButtonElement>('#modal-cancel');
    assert(!!trigger, '#modal-trigger が見つかりません');
    assert(!!cancelButton, '#modal-cancel が見つかりません');
    await flush(host);
    const overflowBeforeOpen = document.body.style.overflow;
    const gutterBeforeOpen = document.body.style.scrollbarGutter;

    trigger.focus();

    const openedPromise = waitForEvent<CustomEvent<UiDialogOpenedDetail>>(host, 'ui-dialog-opened');
    host.open(trigger);
    const openedEvent = await openedPromise;
    await flush(host);

    const dialog = getNativeDialog(host);
    assert(host.opened, 'opened=true になっていません');
    assert(dialog.open, 'native dialog が開いていません');
    assert(dialog.getAttribute('aria-modal') === 'true', 'modal=true なのに aria-modal が設定されていません');
    assert(dialog.getAttribute('aria-labelledby') === 'modal-title', 'aria-labelledby が不正です');
    assert(dialog.getAttribute('aria-describedby') === 'modal-description', 'aria-describedby が不正です');
    assert(openedEvent.detail.trigger === trigger, 'opened event の trigger が不正です');
    assert(document.activeElement === cancelButton, '初期フォーカスが最初の actions 要素に移動していません');
    assert(document.body.style.overflow === 'hidden', 'ダイアログ表示中に body スクロールがロックされていません');
    assert(document.body.style.scrollbarGutter === 'stable', 'scrollbar-gutter: stable が設定されていません');

    const closedPromise = waitForEvent(host, 'ui-dialog-closed');
    host.close();
    await closedPromise;
    await flush(host);

    assert(!host.opened, 'close() 後に opened=false になっていません');
    assert(!dialog.open, 'close() 後に native dialog が閉じていません');
    assert(document.activeElement === trigger, 'close() 後にトリガーへフォーカス返却されていません');
    assert(document.body.style.overflow === overflowBeforeOpen, 'close() 後の overflow 復元に失敗しています');
    assert(document.body.style.scrollbarGutter === gutterBeforeOpen, 'close() 後の scrollbar-gutter 復元に失敗しています');
  },
};

/**
 * 意味のある組み合わせ:
 * - modal=false（軽量通知）
 * - Esc と背景クリックの両方で閉じる
 */
export const NonModalLightweightInfo: Story = {
  render: () => html`
    <div style="padding: 2rem; min-height: 18rem;">
      <button id="non-modal-trigger" type="button">非モーダルを開く</button>

      <ui-dialog id="dialog-non-modal" .modal=${false} title-id="info-title">
        <h2 slot="title" id="info-title">お知らせ</h2>
        <p>このダイアログは Focus Trap を持たず、Esc または背景クリックで閉じます。</p>

        <div slot="actions" style="display: flex; gap: 8px; justify-content: flex-end;">
          <button id="non-modal-action" type="button">了解</button>
        </div>
      </ui-dialog>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'dialog-non-modal');
    const trigger = canvasElement.querySelector<HTMLButtonElement>('#non-modal-trigger');
    assert(!!trigger, '#non-modal-trigger が見つかりません');
    await flush(host);

    const openedPromise = waitForEvent(host, 'ui-dialog-opened');
    host.open(trigger);
    await openedPromise;
    await flush(host);

    const dialog = getNativeDialog(host);
    assert(dialog.open, '非モーダルが開いていません');
    assert(dialog.getAttribute('aria-modal') === null, 'modal=false なのに aria-modal が存在します');

    const cancelByEscPromise = waitForEvent(host, 'ui-dialog-cancel');
    const closedByEscPromise = waitForEvent(host, 'ui-dialog-closed');
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }));
    await cancelByEscPromise;
    await closedByEscPromise;
    await flush(host);

    assert(!dialog.open, 'Esc 後にダイアログが閉じていません');
    assert(document.activeElement === trigger, 'Esc クローズ後にトリガーへフォーカス返却されていません');

    const reopenedPromise = waitForEvent(host, 'ui-dialog-opened');
    host.open(trigger);
    await reopenedPromise;
    await flush(host);
    assert(dialog.open, '再オープンに失敗しました');

    const cancelByClickPromise = waitForEvent(host, 'ui-dialog-cancel');
    const closedByClickPromise = waitForEvent(host, 'ui-dialog-closed');
    dialog.click();
    await cancelByClickPromise;
    await closedByClickPromise;
    await flush(host);

    assert(!dialog.open, '背景クリック後にダイアログが閉じていません');
  },
};

/**
 * 境界条件:
 * - open() の trigger 省略時に activeElement を自動採用
 * - 多重 open()/close() でイベントが重複しない
 */
export const TriggerFallbackAndReentrancySafety: Story = {
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
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'dialog-fallback');
    const trigger = canvasElement.querySelector<HTMLButtonElement>('#fallback-trigger');
    assert(!!trigger, '#fallback-trigger が見つかりません');
    await flush(host);

    let openedCount = 0;
    let closedCount = 0;
    const openedListener = (): void => {
      openedCount += 1;
    };
    const closedListener = (): void => {
      closedCount += 1;
    };

    host.addEventListener('ui-dialog-opened', openedListener);
    host.addEventListener('ui-dialog-closed', closedListener);

    trigger.focus();

    const openedPromise = waitForEvent(host, 'ui-dialog-opened');
    host.open();
    await openedPromise;
    await flush(host);

    const dialog = getNativeDialog(host);
    assert(dialog.open, 'open() で開いていません');
    assert(openedCount === 1, 'open イベント回数が不正です');

    await ensureNoEvent(host, 'ui-dialog-opened', () => {
      host.open();
    });
    await flush(host);

    const closedPromise = waitForEvent(host, 'ui-dialog-closed');
    host.close();
    await closedPromise;
    await flush(host);
    assert(closedCount === 1, 'close イベント回数が不正です');
    assert(document.activeElement === trigger, 'trigger 省略時のフォーカス返却先が activeElement になっていません');

    await ensureNoEvent(host, 'ui-dialog-closed', () => {
      host.close();
    });
    await flush(host);

    host.removeEventListener('ui-dialog-opened', openedListener);
    host.removeEventListener('ui-dialog-closed', closedListener);
  },
};

/**
 * 境界条件:
 * - aria-labelledby / aria-describedby は未指定時に属性ごと省略
 * - 後からIDを設定した場合のみ属性が反映
 */
export const AriaIdOptionality: Story = {
  render: () => html`
    <div style="padding: 2rem; min-height: 18rem;">
      <button id="aria-trigger" type="button">ARIAテストを開く</button>

      <ui-dialog id="dialog-aria-ids">
        <h2 slot="title" id="aria-title">ARIA ID の省略テスト</h2>
        <p id="aria-description">未指定時は aria 属性が出力されないことを確認します。</p>

        <div slot="actions" style="display: flex; gap: 8px; justify-content: flex-end;">
          <button type="button">OK</button>
        </div>
      </ui-dialog>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'dialog-aria-ids');
    const trigger = canvasElement.querySelector<HTMLButtonElement>('#aria-trigger');
    assert(!!trigger, '#aria-trigger が見つかりません');
    await flush(host);

    const firstOpenPromise = waitForEvent(host, 'ui-dialog-opened');
    host.open(trigger);
    await firstOpenPromise;
    await flush(host);

    const dialog = getNativeDialog(host);
    assert(dialog.getAttribute('aria-labelledby') === null, 'titleId 未指定なのに aria-labelledby が存在します');
    assert(dialog.getAttribute('aria-describedby') === null, 'descriptionId 未指定なのに aria-describedby が存在します');

    const firstClosePromise = waitForEvent(host, 'ui-dialog-closed');
    host.close();
    await firstClosePromise;
    await flush(host);

    host.titleId = 'aria-title';
    host.descriptionId = 'aria-description';
    await flush(host);

    const secondOpenPromise = waitForEvent(host, 'ui-dialog-opened');
    host.open(trigger);
    await secondOpenPromise;
    await flush(host);

    assert(dialog.getAttribute('aria-labelledby') === 'aria-title', 'titleId 指定後に aria-labelledby が反映されません');
    assert(dialog.getAttribute('aria-describedby') === 'aria-description', 'descriptionId 指定後に aria-describedby が反映されません');

    const secondClosePromise = waitForEvent(host, 'ui-dialog-closed');
    host.close();
    await secondClosePromise;
    await flush(host);
  },
};

/**
 * 境界条件:
 * - opened 属性の外部制御で開閉できる
 * - open/close 両イベントが属性駆動でも発火
 */
export const AttributeDrivenOpenState: Story = {
  render: () => html`
    <div style="padding: 2rem; min-height: 18rem;">
      <ui-dialog id="dialog-attribute-driven" title-id="attribute-title" description-id="attribute-description">
        <h2 slot="title" id="attribute-title">属性駆動テスト</h2>
        <p id="attribute-description">opened プロパティを直接変更して開閉します。</p>

        <div slot="actions" style="display: flex; gap: 8px; justify-content: flex-end;">
          <button type="button">確認</button>
        </div>
      </ui-dialog>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'dialog-attribute-driven');
    await flush(host);

    const openPromise = waitForEvent(host, 'ui-dialog-opened');
    host.opened = true;
    await openPromise;
    await flush(host);

    const dialog = getNativeDialog(host);
    assert(host.opened, 'opened=true で開いていません');
    assert(dialog.open, 'opened=true で native dialog が開いていません');

    const closePromise = waitForEvent(host, 'ui-dialog-closed');
    host.opened = false;
    await closePromise;
    await flush(host);

    assert(!host.opened, 'opened=false で閉じていません');
    assert(!dialog.open, 'opened=false で native dialog が閉じていません');
  },
};
