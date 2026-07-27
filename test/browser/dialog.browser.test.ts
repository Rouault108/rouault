import { html } from 'lit/static-html.js';
import { afterEach, describe, expect, it } from 'vitest';
import { fixture } from './harness/browser-fixture.js';
import '../../src/components/ui/dialog/dialog.js';
import type {
  UiDialog,
  UiDialogCancelDetail,
  UiDialogClosedDetail,
  UiDialogModeChangedDetail,
  UiDialogOpenedDetail,
} from '../../src/components/ui/dialog/dialog.js';
import { nextAnimationFrame, waitForLitUpdate } from './harness/browser-test-utilities.js';

const BODY_DIALOG_OPEN_ATTRIBUTE = 'data-ui-dialog-open';

const waitForEvent = <T>(
  target: EventTarget,
  eventName: string,
  timeoutMs = 3000,
): Promise<CustomEvent<T>> =>
  new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${eventName} イベントの待機がタイムアウトしました`));
    }, timeoutMs);

    const listener: EventListener = (event) => {
      window.clearTimeout(timer);
      resolve(event as CustomEvent<T>);
    };

    target.addEventListener(eventName, listener, { once: true });
  });

const flush = async (host: UiDialog): Promise<void> => {
  await waitForLitUpdate(host);
  await nextAnimationFrame();
  await waitForLitUpdate(host);
};

const getNativeDialog = (host: UiDialog): HTMLDialogElement => {
  const dialog = host.shadowRoot?.querySelector<HTMLDialogElement>('dialog');
  if (!dialog) {
    throw new Error('dialog 要素が見つかりません');
  }
  return dialog;
};

const getCloseButton = (host: UiDialog): HTMLElement => {
  const closeButton = host.shadowRoot?.querySelector<HTMLElement>('ui-button.close-button');
  if (!closeButton) {
    throw new Error('.close-button が見つかりません');
  }
  return closeButton;
};

describe('ui-dialog browser contract', () => {
  afterEach(() => {
    document.body.removeAttribute(BODY_DIALOG_OPEN_ATTRIBUTE);
  });

  it('modal open / close の公開 DOM・focus・scroll lock 契約を保持すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <button id="trigger" type="button">開く</button>

        <ui-dialog id="dialog" title-id="modal-title" description-id="modal-description">
          <h2 slot="title" id="modal-title">変更を保存しますか？</h2>
          <p id="modal-description">現在の設定変更を保存して画面を閉じます。</p>

          <div slot="actions" style="display: flex; gap: 8px; justify-content: flex-end;">
            <button id="cancel" type="button">キャンセル</button>
            <button id="confirm" type="button">保存して閉じる</button>
          </div>
        </ui-dialog>
      </div>
    `);

    const host = wrapper.querySelector<UiDialog>('#dialog');
    const trigger = wrapper.querySelector<HTMLButtonElement>('#trigger');
    const cancelButton = wrapper.querySelector<HTMLButtonElement>('#cancel');

    if (!host || !trigger || !cancelButton) {
      throw new Error('テスト対象要素が見つかりません');
    }

    await flush(host);
    trigger.focus();

    const openedPromise = waitForEvent<UiDialogOpenedDetail>(host, 'ui-dialog-opened');
    host.open(trigger);
    const openedEvent = await openedPromise;
    await flush(host);

    const dialog = getNativeDialog(host);

    expect(host.opened).to.equal(true);
    expect(dialog.open).to.equal(true);
    expect(dialog.getAttribute('aria-modal')).to.equal('true');
    expect(dialog.getAttribute('aria-labelledby')).to.equal('modal-title');
    expect(dialog.getAttribute('aria-describedby')).to.equal('modal-description');
    expect(dialog.getAttribute('aria-label')).to.equal(null);
    expect(openedEvent.detail.trigger).to.equal(trigger);
    expect(document.activeElement).to.equal(cancelButton);
    expect(document.body.hasAttribute(BODY_DIALOG_OPEN_ATTRIBUTE)).to.equal(true);

    const closedPromise = waitForEvent<UiDialogClosedDetail>(host, 'ui-dialog-closed');
    host.close();
    const closedEvent = await closedPromise;
    await flush(host);

    expect(host.opened).to.equal(false);
    expect(dialog.open).to.equal(false);
    expect(document.activeElement).to.equal(trigger);
    expect(document.body.hasAttribute(BODY_DIALOG_OPEN_ATTRIBUTE)).to.equal(false);
    expect(closedEvent.detail.reason).to.equal('programmatic');
  });

  it('close button 経路と no-actions 時の初期 focus fallback を保持すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <button id="trigger" type="button">開く</button>

        <ui-dialog id="dialog" title-id="title">
          <h2 slot="title" id="title">初期フォーカス確認</h2>
          <p>actions 未指定時は close button に初期 focus を移します。</p>
        </ui-dialog>
      </div>
    `);

    const host = wrapper.querySelector<UiDialog>('#dialog');
    const trigger = wrapper.querySelector<HTMLButtonElement>('#trigger');

    if (!host || !trigger) {
      throw new Error('テスト対象要素が見つかりません');
    }

    await flush(host);

    const openedPromise = waitForEvent<UiDialogOpenedDetail>(host, 'ui-dialog-opened');
    host.open(trigger);
    await openedPromise;
    await flush(host);

    const closeButton = getCloseButton(host);
    expect(host.shadowRoot?.activeElement).to.equal(closeButton);
    expect(getComputedStyle(closeButton, '::after').pointerEvents).to.equal('none');

    const closedPromise = waitForEvent<UiDialogClosedDetail>(host, 'ui-dialog-closed');
    closeButton.click();
    const closedEvent = await closedPromise;
    await flush(host);

    expect(closedEvent.detail.reason).to.equal('close-button');
    expect(document.activeElement).to.equal(trigger);
  });

  it('non-modal では aria-modal を付けず、dialog 外 focus から Escape で閉じること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <button id="trigger" type="button">非モーダルを開く</button>

        <ui-dialog id="dialog" .modal=${false} title-id="info-title">
          <h2 slot="title" id="info-title">お知らせ</h2>
          <p>このダイアログは Focus Trap を持たず、Esc で閉じます。</p>

          <div slot="actions" style="display: flex; gap: 8px; justify-content: flex-end;">
            <button type="button">了解</button>
          </div>
        </ui-dialog>
      </div>
    `);

    const host = wrapper.querySelector<UiDialog>('#dialog');
    const trigger = wrapper.querySelector<HTMLButtonElement>('#trigger');

    if (!host || !trigger) {
      throw new Error('テスト対象要素が見つかりません');
    }

    await flush(host);

    const openedPromise = waitForEvent<UiDialogOpenedDetail>(host, 'ui-dialog-opened');
    host.open(trigger);
    await openedPromise;
    await flush(host);

    const dialog = getNativeDialog(host);
    expect(dialog.open).to.equal(true);
    expect(dialog.getAttribute('aria-modal')).to.equal(null);

    trigger.focus();
    expect(document.activeElement).to.equal(trigger);

    const cancelPromise = waitForEvent<UiDialogCancelDetail>(host, 'ui-dialog-cancel');
    const closedPromise = waitForEvent<UiDialogClosedDetail>(host, 'ui-dialog-closed');

    trigger.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );

    const cancelEvent = await cancelPromise;
    const closedEvent = await closedPromise;
    await flush(host);

    expect(cancelEvent.detail.reason).to.equal('escape');
    expect(closedEvent.detail.reason).to.equal('cancel-escape');
    expect(dialog.open).to.equal(false);
    expect(document.activeElement).to.equal(trigger);
  });

  it('trigger 省略時は activeElement を採用し、aria-label fallback と attribute-driven close reason を保持すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <button id="trigger" type="button">aria-label で開く</button>

        <ui-dialog id="dialog" aria-label="通知ダイアログ">
          <p>title-id を使わない場合でも aria-label でアクセシブルネームを提供します。</p>

          <div slot="actions" style="display: flex; gap: 8px; justify-content: flex-end;">
            <button type="button">OK</button>
          </div>
        </ui-dialog>
      </div>
    `);

    const host = wrapper.querySelector<UiDialog>('#dialog');
    const trigger = wrapper.querySelector<HTMLButtonElement>('#trigger');

    if (!host || !trigger) {
      throw new Error('テスト対象要素が見つかりません');
    }

    await flush(host);
    trigger.focus();

    const openedPromise = waitForEvent<UiDialogOpenedDetail>(host, 'ui-dialog-opened');
    host.open();
    const openedEvent = await openedPromise;
    await flush(host);

    const dialog = getNativeDialog(host);
    expect(openedEvent.detail.trigger).to.equal(trigger);
    expect(dialog.getAttribute('aria-labelledby')).to.equal(null);
    expect(dialog.getAttribute('aria-label')).to.equal('通知ダイアログ');

    const closedPromise = waitForEvent<UiDialogClosedDetail>(host, 'ui-dialog-closed');
    host.opened = false;
    const closedEvent = await closedPromise;
    await flush(host);

    expect(closedEvent.detail.reason).to.equal('attribute-sync');
    expect(document.activeElement).to.equal(trigger);
  });

  it('複数 dialog 同時 open 時の body scroll lock 参照カウントを保持すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <button id="trigger-a" type="button">A</button>
        <button id="trigger-b" type="button">B</button>

        <ui-dialog id="dialog-a" title-id="title-a">
          <h2 slot="title" id="title-a">ダイアログA</h2>
          <p>A本文</p>
        </ui-dialog>

        <ui-dialog id="dialog-b" title-id="title-b">
          <h2 slot="title" id="title-b">ダイアログB</h2>
          <p>B本文</p>
        </ui-dialog>
      </div>
    `);

    const hostA = wrapper.querySelector<UiDialog>('#dialog-a');
    const hostB = wrapper.querySelector<UiDialog>('#dialog-b');
    const triggerA = wrapper.querySelector<HTMLButtonElement>('#trigger-a');
    const triggerB = wrapper.querySelector<HTMLButtonElement>('#trigger-b');

    if (!hostA || !hostB || !triggerA || !triggerB) {
      throw new Error('テスト対象要素が見つかりません');
    }

    await flush(hostA);
    await flush(hostB);

    const openAPromise = waitForEvent<UiDialogOpenedDetail>(hostA, 'ui-dialog-opened');
    hostA.open(triggerA);
    await openAPromise;
    await flush(hostA);

    expect(document.body.hasAttribute(BODY_DIALOG_OPEN_ATTRIBUTE)).to.equal(true);

    const openBPromise = waitForEvent<UiDialogOpenedDetail>(hostB, 'ui-dialog-opened');
    hostB.open(triggerB);
    await openBPromise;
    await flush(hostB);

    expect(document.body.hasAttribute(BODY_DIALOG_OPEN_ATTRIBUTE)).to.equal(true);

    const closeAPromise = waitForEvent<UiDialogClosedDetail>(hostA, 'ui-dialog-closed');
    hostA.close();
    const closedA = await closeAPromise;
    await flush(hostA);

    expect(closedA.detail.reason).to.equal('programmatic');
    expect(document.body.hasAttribute(BODY_DIALOG_OPEN_ATTRIBUTE)).to.equal(true);

    const closeBPromise = waitForEvent<UiDialogClosedDetail>(hostB, 'ui-dialog-closed');
    hostB.close();
    const closedB = await closeBPromise;
    await flush(hostB);

    expect(closedB.detail.reason).to.equal('programmatic');
    expect(document.body.hasAttribute(BODY_DIALOG_OPEN_ATTRIBUTE)).to.equal(false);
  });

  it('open 中の modal 切替で ui-dialog-mode-changed を発火し、open/close を再発火しないこと', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <button id="trigger" type="button">切り替えトリガー</button>

        <ui-dialog id="dialog" title-id="title" description-id="description">
          <h2 slot="title" id="title">モード切り替え確認</h2>
          <p id="description">open 中の modal 切り替えで挙動が同期することを確認します。</p>

          <div slot="actions" style="display: flex; gap: 8px; justify-content: flex-end;">
            <button type="button">了解</button>
          </div>
        </ui-dialog>
      </div>
    `);

    const host = wrapper.querySelector<UiDialog>('#dialog');
    const trigger = wrapper.querySelector<HTMLButtonElement>('#trigger');

    if (!host || !trigger) {
      throw new Error('テスト対象要素が見つかりません');
    }

    await flush(host);

    const openedPromise = waitForEvent<UiDialogOpenedDetail>(host, 'ui-dialog-opened');
    host.open(trigger);
    await openedPromise;
    await flush(host);

    const dialog = getNativeDialog(host);
    expect(dialog.getAttribute('aria-modal')).to.equal('true');

    let openedCount = 0;
    let closedCount = 0;
    host.addEventListener('ui-dialog-opened', () => {
      openedCount += 1;
    });
    host.addEventListener('ui-dialog-closed', () => {
      closedCount += 1;
    });

    const modeChangedPromise = waitForEvent<UiDialogModeChangedDetail>(
      host,
      'ui-dialog-mode-changed',
    );
    host.modal = false;
    const modeChanged = await modeChangedPromise;
    await flush(host);

    expect(dialog.open).to.equal(true);
    expect(dialog.getAttribute('aria-modal')).to.equal(null);
    expect(modeChanged.detail.previous).to.equal('modal');
    expect(modeChanged.detail.current).to.equal('non-modal');
    expect(openedCount).to.equal(0);
    expect(closedCount).to.equal(0);

    trigger.focus();

    const cancelPromise = waitForEvent<UiDialogCancelDetail>(host, 'ui-dialog-cancel');
    const closedPromise = waitForEvent<UiDialogClosedDetail>(host, 'ui-dialog-closed');
    trigger.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );

    const cancelEvent = await cancelPromise;
    const closedEvent = await closedPromise;
    await flush(host);

    expect(cancelEvent.detail.reason).to.equal('escape');
    expect(closedEvent.detail.reason).to.equal('cancel-escape');
    expect(dialog.open).to.equal(false);
  });
});
