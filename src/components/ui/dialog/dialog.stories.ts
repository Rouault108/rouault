import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './dialog';
import {
  type UiDialog,
  type UiDialogCancelDetail,
  type UiDialogClosedDetail,
  type UiDialogModeChangedDetail,
  type UiDialogOpenedDetail,
} from './dialog';

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

const hasExpectedCount = (actual: number, expected: number): boolean => actual === expected;

const waitForEvent = <T extends Event>(
  target: EventTarget,
  eventName: string,
  timeoutMs = 3000,
): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${eventName} イベントの待機がタイムアウトしました`));
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
      reject(new Error(`${eventName} イベントが発火しました`));
    };
    target.addEventListener(eventName, listener);
  });

  const timeoutPromise = wait(waitMs);
  await action();
  await Promise.race([eventPromise, timeoutPromise]);
  target.removeEventListener(eventName, listener);
};

const ensureNoEvents = async (
  target: EventTarget,
  eventNames: readonly string[],
  action: () => void | Promise<void>,
  waitMs = 220,
): Promise<void> => {
  const fired: string[] = [];
  const listeners = eventNames.map((eventName) => {
    const listener: EventListener = () => {
      fired.push(eventName);
    };
    target.addEventListener(eventName, listener);
    return { eventName, listener };
  });

  await action();
  await wait(waitMs);

  for (const { eventName, listener } of listeners) {
    target.removeEventListener(eventName, listener);
  }

  assert(fired.length === 0, `発火してはいけないイベントが発火しました: ${fired.join(', ')}`);
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

const getCloseButton = (host: UiDialog): HTMLElement => {
  const closeButton = host.shadowRoot?.querySelector<HTMLElement>('.close-button');
  if (!closeButton) throw new Error('.close-button が見つかりません');
  return closeButton;
};

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

const isShadowElementFocused = (host: UiDialog, element: HTMLElement): boolean =>
  host.shadowRoot?.activeElement === element;

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
- \`modal=false\`: \`show()\`、Esc で手動クローズ（背景クリックでは閉じない）
- Enter/Exit アニメーション完了後に \`ui-dialog-opened\` / \`ui-dialog-closed\` を発火
- \`ui-dialog-closed.detail.reason\` で閉鎖経路を区別
- open 中の \`modal\` 切替では \`ui-dialog-mode-changed\` を発火
- Esc 時は \`ui-dialog-cancel.detail.reason="escape"\` を発火
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
  parameters: { rouaultContractKind: 'visual' },
  render: renderModalCriticalDecision,
};

/**
 * 相互作用テスト:
 * - open()/close() の基本経路
 * - モーダル時の aria/focus/scroll lock
 */
export const ModalCriticalDecisionOpenClose: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: renderModalCriticalDecision,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'dialog-modal');
    const trigger = canvasElement.querySelector<HTMLButtonElement>('#modal-trigger');
    const cancelButton = canvasElement.querySelector<HTMLButtonElement>('#modal-cancel');
    assert(!!trigger, '#modal-trigger が見つかりません');
    assert(!!cancelButton, '#modal-cancel が見つかりません');
    await flush(host);

    trigger.focus();

    const openedPromise = waitForEvent<CustomEvent<UiDialogOpenedDetail>>(host, 'ui-dialog-opened');
    host.open(trigger);
    const openedEvent = await openedPromise;
    await flush(host);

    const dialog = getNativeDialog(host);
    assert(host.opened, 'opened="true" であることを期待していましたが、実際には false でした');
    assert(dialog.open, 'ネイティブの dialog 要素が開いていません');
    assert(
      dialog.getAttribute('aria-modal') === 'true',
      'modal="true" の場合、aria-modal="true" が設定されている必要があります',
    );
    assert(
      dialog.getAttribute('aria-labelledby') === 'modal-title',
      `aria-labelledby="modal-title" を期待していましたが、実際には "${dialog.getAttribute('aria-labelledby') ?? 'null'}" でした`,
    );
    assert(
      dialog.getAttribute('aria-describedby') === 'modal-description',
      `aria-describedby="modal-description" を期待していましたが、実際には "${dialog.getAttribute('aria-describedby') ?? 'null'}" でした`,
    );
    assert(
      dialog.getAttribute('aria-label') === null,
      'aria-labelledby 指定時は aria-label を省略する必要があります',
    );
    assert(openedEvent.detail.trigger === trigger, 'opened イベントのトリガーが不正です');
    assert(
      document.activeElement === cancelButton,
      '初期フォーカスが最初の actions 要素に移動していません',
    );
    assert(
      document.body.hasAttribute('data-ui-dialog-open'),
      'ダイアログ表示中に body 要素に data-ui-dialog-open 属性が付与されていません',
    );

    const closedPromise = waitForEvent<CustomEvent<UiDialogClosedDetail>>(host, 'ui-dialog-closed');
    host.close();
    const closedEvent = await closedPromise;
    await flush(host);

    assert(
      !host.opened,
      'close() 呼び出し後に opened="false" であることを期待していましたが、実際には true でした',
    );
    assert(!dialog.open, 'close() 呼び出し後にネイティブの dialog 要素が閉じていません');
    assert(
      document.activeElement === trigger,
      'close() 後にトリガーへフォーカスが返却されていません',
    );
    assert(
      !document.body.hasAttribute('data-ui-dialog-open'),
      'close() 後に body 要素の data-ui-dialog-open 属性が解除されていません',
    );
    assert(
      closedEvent.detail.reason === 'programmatic',
      `close() の closed reason は "programmatic" である必要がありますが、実際には "${closedEvent.detail.reason}" でした`,
    );
  },
};

/**
 * 相互作用テスト:
 * - trigger の実クリックで開ける
 * - actions ありでも右上の close ボタン実経路で閉じられる
 */
export const ModalCriticalDecisionCloseButton: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
  render: renderModalCriticalDecision,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'dialog-modal');
    const trigger = canvasElement.querySelector<HTMLButtonElement>('#modal-trigger');
    assert(!!trigger, '#modal-trigger が見つかりません');
    await flush(host);

    const openedPromise = waitForEvent<CustomEvent<UiDialogOpenedDetail>>(host, 'ui-dialog-opened');
    trigger.click();
    await openedPromise;
    await flush(host);

    const closeButton = getCloseButton(host);
    const dialog = getNativeDialog(host);
    const closedPromise = waitForEvent<CustomEvent<UiDialogClosedDetail>>(host, 'ui-dialog-closed');
    closeButton.click();
    const closedEvent = await closedPromise;
    await flush(host);

    assert(!host.opened, 'close ボタン押下後に opened="false" である必要があります');
    assert(!dialog.open, 'close ボタン押下後にネイティブの dialog 要素が閉じていません');
    assert(
      document.activeElement === trigger,
      'close ボタン押下後にトリガーへフォーカスが返却されていません',
    );
    assert(
      closedEvent.detail.reason === 'close-button',
      `close ボタン経路の closed reason は "close-button" である必要がありますが、実際には "${closedEvent.detail.reason}" でした`,
    );
  },
};

/**
 * 境界条件:
 * - modal=true の Esc 経路で ui-dialog-cancel が先に発火する
 * - close 後に ui-dialog-closed が続く
 */
export const ModalEscCancelSequence: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
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
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'dialog-modal-esc');
    const trigger = canvasElement.querySelector<HTMLButtonElement>('#modal-esc-trigger');
    assert(!!trigger, '#modal-esc-trigger が見つかりません');
    await flush(host);

    const openedPromise = waitForEvent(host, 'ui-dialog-opened');
    host.open(trigger);
    await openedPromise;
    await flush(host);

    const dialog = getNativeDialog(host);
    const eventOrder: string[] = [];
    host.addEventListener('ui-dialog-cancel', () => {
      eventOrder.push('cancel');
    });
    host.addEventListener('ui-dialog-closed', () => {
      eventOrder.push('closed');
    });

    const cancelPromise = waitForEvent<CustomEvent<UiDialogCancelDetail>>(host, 'ui-dialog-cancel');
    const closedPromise = waitForEvent<CustomEvent<UiDialogClosedDetail>>(host, 'ui-dialog-closed');
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    await cancelPromise;
    const closedEvent = await closedPromise;
    await flush(host);

    assert(eventOrder.join('>') === 'cancel>closed', 'Esc 経路のイベント順序が不正です');
    assert(!dialog.open, 'Esc キー押下後にダイアログが閉じていません');
    assert(
      closedEvent.detail.reason === 'cancel-escape',
      `Esc 経路の closed reason は "cancel-escape" である必要がありますが、実際には "${closedEvent.detail.reason}" でした`,
    );
  },
};

/**
 * 意味のある組み合わせ:
 * - modal=false（軽量通知）
 * - Esc で閉じる
 * - 背景クリックでは閉じない
 */
export const NonModalLightweightInfo: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
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
    assert(dialog.open, '非モーダルダイアログが開いていません');
    assert(
      dialog.getAttribute('aria-modal') === null,
      'modal=false の場合、aria-modal 属性は設定しない必要があります',
    );

    await ensureNoEvents(host, ['ui-dialog-cancel', 'ui-dialog-closed'], () => {
      trigger.click();
    });
    assert(dialog.open, '背景クリックでダイアログが閉じてはいけません');

    trigger.focus();
    assert(
      document.activeElement === trigger,
      '非モーダル検証のため、ダイアログ外へフォーカスを移せていません',
    );

    const cancelByEscPromise = waitForEvent<CustomEvent<UiDialogCancelDetail>>(
      host,
      'ui-dialog-cancel',
    );
    const closedByEscPromise = waitForEvent<CustomEvent<UiDialogClosedDetail>>(
      host,
      'ui-dialog-closed',
    );
    trigger.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }),
    );
    await cancelByEscPromise;
    const closedEvent = await closedByEscPromise;
    await flush(host);

    assert(!dialog.open, 'Esc キー押下後にダイアログが閉じていません');
    assert(
      document.activeElement === trigger,
      'Esc によるクローズ後にトリガーへフォーカスが返却されていません',
    );
    assert(
      closedEvent.detail.reason === 'cancel-escape',
      `非モーダル Esc の closed reason は "cancel-escape" である必要がありますが、実際には "${closedEvent.detail.reason}" でした`,
    );
  },
};

/**
 * 境界条件:
 * - actions 未提供時は close ボタンへ初期フォーカス
 */
export const NoActionsInitialFocusFallback: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
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
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'dialog-no-actions');
    const trigger = canvasElement.querySelector<HTMLButtonElement>('#no-actions-trigger');
    assert(!!trigger, '#no-actions-trigger が見つかりません');
    await flush(host);

    const closeButton = getCloseButton(host);
    for (let count = 0; count < 2; count += 1) {
      const openedPromise = waitForEvent(host, 'ui-dialog-opened');
      host.open(trigger);
      await openedPromise;
      await flush(host);

      assert(
        isShadowElementFocused(host, closeButton),
        'actions 未提供時に close ボタンへ初期フォーカスが移動していません',
      );
      assert(
        getComputedStyle(closeButton, '::after').pointerEvents === 'none',
        'close ボタンのヒットエリア疑似要素が pointer-events を奪ってはいけません',
      );

      const closedPromise = waitForEvent(host, 'ui-dialog-closed');
      closeButton.click();
      await closedPromise;
      await flush(host);

      assert(!host.opened, 'close ボタン押下後に opened="false" である必要があります');
    }
  },
};

/**
 * 境界条件:
 * - open() の trigger 省略時に activeElement を自動採用
 * - 多重 open()/close() でイベントが重複しない
 * - close を open で打ち消した場合は closed を発火せず opened を再通知する
 */
export const TriggerFallbackAndReentrancySafety: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
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
    assert(dialog.open, 'open() 呼び出し後にダイアログが開いていません');
    assert(
      openedCount === 1,
      `opened イベントが 1 回のみ発火することを期待していましたが、実際には ${String(openedCount)} 回でした`,
    );

    await ensureNoEvent(host, 'ui-dialog-opened', () => {
      host.open();
    });
    await flush(host);

    const closedPromise = waitForEvent<CustomEvent<UiDialogClosedDetail>>(host, 'ui-dialog-closed');
    host.close();
    const closedEvent = await closedPromise;
    await flush(host);
    assert(
      closedCount === 1,
      `ui-dialog-closed イベントが 1 回のみ発火することを期待していましたが、実際には ${String(closedCount)} 回でした`,
    );
    assert(
      document.activeElement === trigger,
      'トリガー省略時のフォーカス返却先が activeElement になっていません',
    );
    assert(
      closedEvent.detail.reason === 'programmatic',
      `close() の closed reason は "programmatic" である必要がありますが、実際には "${closedEvent.detail.reason}" でした`,
    );

    const reopenedPromise = waitForEvent(host, 'ui-dialog-opened');
    host.open(trigger);
    await reopenedPromise;
    await flush(host);
    assert(
      hasExpectedCount(openedCount, 2),
      `再オープン後の opened イベントが 2 回であることを期待していましたが、実際には ${String(openedCount)} 回でした`,
    );

    let closedDuringReopen = false;
    const closedDuringReopenListener = (): void => {
      closedDuringReopen = true;
    };
    host.addEventListener('ui-dialog-closed', closedDuringReopenListener);

    const reopenDuringClosePromise = waitForEvent<CustomEvent<UiDialogOpenedDetail>>(
      host,
      'ui-dialog-opened',
    );
    host.close();
    host.open(trigger);
    const reopenDuringCloseEvent = await reopenDuringClosePromise;
    await flush(host);
    host.removeEventListener('ui-dialog-closed', closedDuringReopenListener);

    assert(
      reopenDuringCloseEvent.detail.trigger === trigger,
      'close を打ち消した再 open の trigger が不正です',
    );
    assert(
      !closedDuringReopen,
      'close を open で打ち消した場合に ui-dialog-closed は発火してはいけません',
    );
    assert(
      hasExpectedCount(openedCount, 3),
      `close を打ち消した再 open 後の opened イベントが 3 回であることを期待していましたが、実際には ${String(openedCount)} 回でした`,
    );
    assert(host.opened, 'close 中に再度 open() した場合は開いた状態を維持する必要があります');
    assert(
      dialog.open,
      'close 中に再度 open() した場合にネイティブの dialog 要素が閉じてはいけません',
    );

    const finalClosedPromise = waitForEvent<CustomEvent<UiDialogClosedDetail>>(
      host,
      'ui-dialog-closed',
    );
    host.close();
    const finalClosedEvent = await finalClosedPromise;
    await flush(host);
    assert(
      hasExpectedCount(closedCount, 2),
      `最終クローズ後の ui-dialog-closed イベントが 2 回であることを期待していましたが、実際には ${String(closedCount)} 回でした`,
    );
    assert(
      finalClosedEvent.detail.reason === 'programmatic',
      `最終クローズの closed reason は "programmatic" である必要がありますが、実際には "${finalClosedEvent.detail.reason}" でした`,
    );

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
 * - aria-labelledby 未使用時に aria-label でアクセシブルネームを提供
 */
export const AriaLabelFallback: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
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
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'dialog-aria-label');
    const trigger = canvasElement.querySelector<HTMLButtonElement>('#aria-label-trigger');
    assert(!!trigger, '#aria-label-trigger が見つかりません');
    await flush(host);

    const openedPromise = waitForEvent(host, 'ui-dialog-opened');
    host.open(trigger);
    await openedPromise;
    await flush(host);

    const dialog = getNativeDialog(host);
    assert(
      dialog.getAttribute('aria-labelledby') === null,
      'aria-label 経路では aria-labelledby を省略する必要があります',
    );
    assert(
      dialog.getAttribute('aria-label') === '通知ダイアログ',
      'aria-label が正しく反映されていません',
    );

    const closedPromise = waitForEvent(host, 'ui-dialog-closed');
    host.close();
    await closedPromise;
    await flush(host);
  },
};

/**
 * 境界条件:
 * - 複数ダイアログ同時オープン時の scroll lock 参照カウント
 */
export const MultiDialogScrollLockReferenceCount: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
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
  play: async ({ canvasElement }) => {
    const hostA = getHost(canvasElement, 'dialog-multi-a');
    const hostB = getHost(canvasElement, 'dialog-multi-b');
    const triggerA = canvasElement.querySelector<HTMLButtonElement>('#multi-trigger-a');
    const triggerB = canvasElement.querySelector<HTMLButtonElement>('#multi-trigger-b');
    assert(!!triggerA, '#multi-trigger-a が見つかりません');
    assert(!!triggerB, '#multi-trigger-b が見つかりません');
    await flush(hostA);
    await flush(hostB);

    const openAPromise = waitForEvent(hostA, 'ui-dialog-opened');
    hostA.open(triggerA);
    await openAPromise;
    await flush(hostA);
    assert(
      document.body.hasAttribute('data-ui-dialog-open'),
      '1件目のダイアログオープン後に body 要素にロック属性が付与されていません',
    );

    const openBPromise = waitForEvent(hostB, 'ui-dialog-opened');
    hostB.open(triggerB);
    await openBPromise;
    await flush(hostB);
    assert(
      document.body.hasAttribute('data-ui-dialog-open'),
      '2件目のダイアログオープン後に body 要素のロック属性が失われています',
    );

    const closeAPromise = waitForEvent<CustomEvent<UiDialogClosedDetail>>(
      hostA,
      'ui-dialog-closed',
    );
    hostA.close();
    const closedAEvent = await closeAPromise;
    await flush(hostA);
    assert(
      document.body.hasAttribute('data-ui-dialog-open'),
      '1件だけクローズした段階で body 要素のロック属性を解除してはいけません',
    );
    assert(
      closedAEvent.detail.reason === 'programmatic',
      `A の closed reason は "programmatic" である必要がありますが、実際には "${closedAEvent.detail.reason}" でした`,
    );

    const closeBPromise = waitForEvent<CustomEvent<UiDialogClosedDetail>>(
      hostB,
      'ui-dialog-closed',
    );
    hostB.close();
    const closedBEvent = await closeBPromise;
    await flush(hostB);
    assert(
      !document.body.hasAttribute('data-ui-dialog-open'),
      '最終的なクローズ後に body 要素のロック属性が解除されていません',
    );
    assert(
      closedBEvent.detail.reason === 'programmatic',
      `B の closed reason は "programmatic" である必要がありますが、実際には "${closedBEvent.detail.reason}" でした`,
    );
  },
};

/**
 * 境界条件:
 * - opened 属性の外部制御で開閉できる
 * - open/close 両イベントが属性駆動でも発火
 */
export const AttributeDrivenOpenState: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
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
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'dialog-attribute-driven');
    await flush(host);

    const openPromise = waitForEvent(host, 'ui-dialog-opened');
    host.opened = true;
    await openPromise;
    await flush(host);

    const dialog = getNativeDialog(host);
    assert(host.opened, 'opened="true" 設定後にダイアログが開いていません');
    assert(dialog.open, 'opened="true" 設定後にネイティブの dialog 要素が開いていません');

    const closePromise = waitForEvent<CustomEvent<UiDialogClosedDetail>>(host, 'ui-dialog-closed');
    host.opened = false;
    const closedEvent = await closePromise;
    await flush(host);

    assert(!host.opened, 'opened="false" 設定後にダイアログが閉じていません');
    assert(!dialog.open, 'opened="false" 設定後にネイティブの dialog 要素が閉じていません');
    assert(
      closedEvent.detail.reason === 'attribute-sync',
      `opened=false の closed reason は "attribute-sync" である必要がありますが、実際には "${closedEvent.detail.reason}" でした`,
    );
  },
};

/**
 * 境界条件:
 * - open 中に modal を切り替えてもネイティブ挙動と aria が同期する
 * - modal=true -> false 切り替え後はダイアログ外フォーカスから Esc で閉じられる
 */
export const LiveModalModeSwitching: Story = {
  parameters: { rouaultContractKind: 'interaction-contract' },
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
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'dialog-modal-switch');
    const trigger = canvasElement.querySelector<HTMLButtonElement>('#modal-switch-trigger');
    assert(!!trigger, '#modal-switch-trigger が見つかりません');
    await flush(host);

    const openedPromise = waitForEvent(host, 'ui-dialog-opened');
    host.open(trigger);
    await openedPromise;
    await flush(host);

    const dialog = getNativeDialog(host);
    assert(
      dialog.getAttribute('aria-modal') === 'true',
      '初期状態では aria-modal="true" である必要があります',
    );

    const modeChangedPromise = waitForEvent<CustomEvent<UiDialogModeChangedDetail>>(
      host,
      'ui-dialog-mode-changed',
    );
    let unexpectedOpenOrClose = false;
    const unexpectedListener = (): void => {
      unexpectedOpenOrClose = true;
    };
    host.addEventListener('ui-dialog-opened', unexpectedListener);
    host.addEventListener('ui-dialog-closed', unexpectedListener);

    host.modal = false;
    await flush(host);
    await waitFrame();
    const modeChangedEvent = await modeChangedPromise;
    await flush(host);

    host.removeEventListener('ui-dialog-opened', unexpectedListener);
    host.removeEventListener('ui-dialog-closed', unexpectedListener);

    assert(dialog.open, 'modal=false へ切り替え後もダイアログは開いたままである必要があります');
    assert(
      dialog.getAttribute('aria-modal') === null,
      'modal=false へ切り替え後は aria-modal 属性を除去する必要があります',
    );
    assert(
      modeChangedEvent.detail.previous === 'modal' &&
        modeChangedEvent.detail.current === 'non-modal',
      `mode-changed detail が不正です: ${modeChangedEvent.detail.previous} -> ${modeChangedEvent.detail.current}`,
    );
    assert(
      !unexpectedOpenOrClose,
      'modal 切り替えでは ui-dialog-opened / ui-dialog-closed を再発火してはいけません',
    );

    trigger.focus();
    assert(
      document.activeElement === trigger,
      'modal 切り替え検証のため、ダイアログ外へフォーカスを移せていません',
    );

    const cancelPromise = waitForEvent<CustomEvent<UiDialogCancelDetail>>(host, 'ui-dialog-cancel');
    const closedPromise = waitForEvent<CustomEvent<UiDialogClosedDetail>>(host, 'ui-dialog-closed');
    trigger.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }),
    );
    await cancelPromise;
    const closedEvent = await closedPromise;
    await flush(host);

    assert(
      !dialog.open,
      'modal=false へ切り替え後、外側フォーカスからの Esc で閉じる必要があります',
    );
    assert(
      closedEvent.detail.reason === 'cancel-escape',
      `mode 切り替え後の Esc closed reason は "cancel-escape" である必要がありますが、実際には "${closedEvent.detail.reason}" でした`,
    );
  },
};

/**
 * 表示回帰用:
 * - ダークモード相当トークン
 */
export const VisualDarkMode: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
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

/**
 * 表示回帰用:
 * - Forced Colors 相当トークン
 */
export const VisualForcedColors: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
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

/**
 * 表示回帰用:
 * - Reduced Motion 相当（短時間化）
 */
export const VisualReducedMotion: Story = {
  parameters: { rouaultContractKind: 'boundary-contract' },
  render: () => html`
    <div style="padding: 2rem; --duration-slower: 0.01ms; --duration-fast: 0.01ms;">
      <button id="reduced-motion-trigger" type="button">開く</button>

      <ui-dialog
        id="dialog-reduced-motion"
        title-id="reduced-motion-title"
        description-id="reduced-motion-description"
      >
        <h2 slot="title" id="reduced-motion-title">Reduced Motion Visual</h2>
        <p id="reduced-motion-description">アニメーション短縮時の視覚崩れを確認します。</p>
      </ui-dialog>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'dialog-reduced-motion');
    const trigger = canvasElement.querySelector<HTMLButtonElement>('#reduced-motion-trigger');
    assert(!!trigger, '#reduced-motion-trigger が見つかりません');
    await flush(host);

    const openedPromise = waitForEvent(host, 'ui-dialog-opened');
    host.open(trigger);
    await openedPromise;
    await flush(host);

    const dialog = getNativeDialog(host);
    assert(dialog.open, 'Reduced Motion visual で開けませんでした');

    const closedPromise = waitForEvent(host, 'ui-dialog-closed');
    host.close();
    await closedPromise;
    await flush(host);
  },
};
