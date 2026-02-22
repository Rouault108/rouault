import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './search-dialog';
import type {
  UiSearchDialog,
  UiSearchDialogItem,
  UiSearchDialogOpenedDetail,
  UiSearchDialogSelectedDetail,
} from './search-dialog';

const DEBOUNCE_WAIT_MS = 210;

const SEARCH_ITEMS: UiSearchDialogItem[] = [
  { title: 'Router 設計メモ', url: '/notes/router-design', path: '/notes/router-design', keywords: ['navigation'] },
  { title: 'UI コンポーネント運用規約', url: '/notes/ui-guidelines', path: '/notes/ui-guidelines', keywords: ['ui'] },
  { title: 'Lit レンダリング最適化', url: '/notes/lit-performance', path: '/notes/lit-performance', keywords: ['lit'] },
  { title: 'アクセシビリティ監査ログ', url: '/notes/a11y-audit', path: '/notes/a11y-audit', keywords: ['wcag'] },
];

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

const flush = async (host: UiSearchDialog): Promise<void> => {
  await host.updateComplete;
  await waitFrame();
  await host.updateComplete;
};

const settleSearch = async (host: UiSearchDialog): Promise<void> => {
  await wait(DEBOUNCE_WAIT_MS);
  await flush(host);
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
  waitMs = 250,
): Promise<void> => {
  let listener!: EventListener;
  const eventPromise = new Promise<never>((_, reject) => {
    listener = () => {
      target.removeEventListener(eventName, listener);
      reject(new Error(`${eventName} が想定外に発火しました`));
    };
    target.addEventListener(eventName, listener);
  });

  const timeoutPromise = wait(waitMs);
  await action();
  await Promise.race([eventPromise, timeoutPromise]);
  target.removeEventListener(eventName, listener);
};

const getHost = (canvasElement: Element, id: string): UiSearchDialog => {
  const host = canvasElement.querySelector<UiSearchDialog>(`#${id}`);
  if (!host) throw new Error(`#${id} が見つかりません`);
  return host;
};

const getNativeDialog = (host: UiSearchDialog): HTMLDialogElement => {
  const dialog = host.shadowRoot?.querySelector<HTMLDialogElement>('dialog');
  if (!dialog) throw new Error('dialog 要素が見つかりません');
  return dialog;
};

const getInput = (host: UiSearchDialog): HTMLInputElement => {
  const input = host.shadowRoot?.querySelector<HTMLInputElement>('.search-input');
  if (!input) throw new Error('検索 input が見つかりません');
  return input;
};

const getClearButton = (host: UiSearchDialog): HTMLButtonElement => {
  const button = host.shadowRoot?.querySelector<HTMLButtonElement>('.clear-button');
  if (!button) throw new Error('クリアボタンが見つかりません');
  return button;
};

const getResultItems = (host: UiSearchDialog): HTMLLIElement[] =>
  Array.from(host.shadowRoot?.querySelectorAll<HTMLLIElement>('.result-item') ?? []);

const meta: Meta<UiSearchDialog> = {
  title: 'Components/SearchDialog',
  component: 'ui-search-dialog',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
検索ダイアログ（\`<ui-search-dialog>\`）の状態別 UI と事故が起きやすい境界条件を検証します。
- 状態: 結果あり / ローディング中 / 空状態
- 境界条件: 150ms デバウンス、矢印キーのループ移動、Enter 選択、Esc 終了、再入呼び出し安全性
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<UiSearchDialog>;

/**
 * 意味のある組み合わせ:
 * - 通常表示 + 結果あり
 * - 開閉イベント、フォーカス返却、Combobox ARIA の基本成立
 */
export const ResultsStateWithFocusReturn: Story = {
  render: () => html`
    <div style="padding: 2rem; min-height: 24rem;">
      <button id="results-trigger" type="button">検索を開く</button>
      <ui-search-dialog id="dialog-results" .items=${SEARCH_ITEMS}></ui-search-dialog>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'dialog-results');
    const trigger = canvasElement.querySelector<HTMLButtonElement>('#results-trigger');
    assert(!!trigger, '#results-trigger が見つかりません');
    await flush(host);

    trigger.focus();
    const openedPromise = waitForEvent<CustomEvent<UiSearchDialogOpenedDetail>>(host, 'ui-search-dialog-opened');
    host.open(trigger);
    const openedEvent = await openedPromise;
    await flush(host);

    const dialog = getNativeDialog(host);
    const input = getInput(host);
    assert(dialog.open, 'open() 後に native dialog が開いていません');
    assert(host.opened, 'open() 後に opened=true になっていません');
    assert(dialog.getAttribute('aria-label') === '検索', 'dialog に aria-label="検索" がありません');
    assert(dialog.getAttribute('aria-modal') === 'true', 'dialog に aria-modal="true" がありません');
    assert(openedEvent.detail.trigger === trigger, 'opened イベントの trigger が不正です');
    assert(document.activeElement === input, 'open 後の自動フォーカスが input に移動していません');

    input.value = 'router';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await settleSearch(host);

    const clearButton = getClearButton(host);
    const results = getResultItems(host);
    assert(results.length > 0, '検索結果が表示されていません');
    assert(!clearButton.hidden, 'query 入力後にクリアボタンが表示されていません');
    assert(input.getAttribute('aria-expanded') === 'true', '結果表示中に aria-expanded=true になっていません');

    const closedPromise = waitForEvent(host, 'ui-search-dialog-closed');
    host.close();
    await closedPromise;
    await flush(host);

    assert(!dialog.open, 'close() 後に dialog が閉じていません');
    assert(document.activeElement === trigger, 'close() 後にトリガーへフォーカス返却されていません');
  },
};

/**
 * 意味のある組み合わせ:
 * - loading=true（初回インデックスロード中）
 * - 入力は編集可能で aria-busy=true を維持
 */
export const LoadingStateEditableInput: Story = {
  render: () => html`
    <div style="padding: 2rem; min-height: 24rem;">
      <button id="loading-trigger" type="button">ロード中を開く</button>
      <ui-search-dialog id="dialog-loading" .items=${SEARCH_ITEMS} loading query="rou"></ui-search-dialog>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'dialog-loading');
    const trigger = canvasElement.querySelector<HTMLButtonElement>('#loading-trigger');
    assert(!!trigger, '#loading-trigger が見つかりません');
    await flush(host);

    const openedPromise = waitForEvent(host, 'ui-search-dialog-opened');
    host.open(trigger);
    await openedPromise;
    await flush(host);

    const input = getInput(host);
    const loadingState = host.shadowRoot?.querySelector<HTMLElement>('.loading-state');
    const listbox = host.shadowRoot?.querySelector<HTMLUListElement>('#search-listbox');
    assert(!!loadingState, 'loading-state 要素が見つかりません');
    assert(!!listbox, 'listbox 要素が見つかりません');

    assert(!loadingState.hidden, 'loading=true なのにローディング表示が出ていません');
    assert(input.getAttribute('aria-busy') === 'true', 'loading=true で aria-busy=true になっていません');
    assert(listbox.hidden, 'loading=true で listbox が非表示になっていません');

    input.value = 'router';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await flush(host);
    assert(host.query === 'router', 'loading 中に query 編集が反映されません');

    host.loading = false;
    await settleSearch(host);
    assert(input.getAttribute('aria-busy') === 'false', 'loading=false で aria-busy=false に戻っていません');
    assert(getResultItems(host).length > 0, 'loading 解除後に検索結果が表示されていません');

    const closedPromise = waitForEvent(host, 'ui-search-dialog-closed');
    host.close();
    await closedPromise;
  },
};

/**
 * 意味のある組み合わせ:
 * - query あり + 結果 0 件
 * - 空状態と aria-live 通知の成立
 */
export const EmptyStateWithLiveRegion: Story = {
  render: () => html`
    <div style="padding: 2rem; min-height: 24rem;">
      <button id="empty-trigger" type="button">空状態を開く</button>
      <ui-search-dialog id="dialog-empty" .items=${SEARCH_ITEMS}></ui-search-dialog>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'dialog-empty');
    const trigger = canvasElement.querySelector<HTMLButtonElement>('#empty-trigger');
    assert(!!trigger, '#empty-trigger が見つかりません');
    await flush(host);

    const openedPromise = waitForEvent(host, 'ui-search-dialog-opened');
    host.open(trigger);
    await openedPromise;
    await flush(host);

    const input = getInput(host);
    input.value = 'zzzzzz';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await settleSearch(host);

    const emptyState = host.shadowRoot?.querySelector<HTMLElement>('ui-empty-state.empty-state');
    const listbox = host.shadowRoot?.querySelector<HTMLUListElement>('#search-listbox');
    const liveRegion = host.shadowRoot?.querySelector<HTMLElement>('.sr-only');
    assert(!!emptyState, 'empty-state 要素が見つかりません');
    assert(!!listbox, 'listbox 要素が見つかりません');
    assert(!!liveRegion, 'aria-live 領域が見つかりません');

    assert(!emptyState.hidden, '0 件時に empty-state が表示されていません');
    assert(listbox.hidden, '0 件時に listbox が非表示になっていません');
    assert(liveRegion.textContent.includes('一致する結果がありません'), 'aria-live 通知文言が更新されていません');

    const closedPromise = waitForEvent(host, 'ui-search-dialog-closed');
    host.close();
    await closedPromise;
  },
};

/**
 * 境界条件:
 * - ArrowUp/ArrowDown のループ移動
 * - Enter で selected イベント発火 + close
 */
export const KeyboardLoopAndEnterSelection: Story = {
  render: () => html`
    <div style="padding: 2rem; min-height: 24rem;">
      <button id="keyboard-trigger" type="button">キーボード検証</button>
      <ui-search-dialog id="dialog-keyboard" .items=${SEARCH_ITEMS}></ui-search-dialog>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'dialog-keyboard');
    const trigger = canvasElement.querySelector<HTMLButtonElement>('#keyboard-trigger');
    assert(!!trigger, '#keyboard-trigger が見つかりません');
    await flush(host);

    const openedPromise = waitForEvent(host, 'ui-search-dialog-opened');
    host.open(trigger);
    await openedPromise;
    await flush(host);

    const input = getInput(host);
    input.value = 'ui';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await settleSearch(host);

    const results = getResultItems(host);
    assert(results.length >= 2, '矢印ループ検証に必要な結果件数が不足しています');

    const firstOptionId = results[0]?.id;
    assert(input.getAttribute('aria-activedescendant') === firstOptionId, '初期アクティブ項目が先頭になっていません');

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, composed: true }));
    await flush(host);
    const lastOptionId = results[results.length - 1]?.id;
    assert(
      input.getAttribute('aria-activedescendant') === lastOptionId,
      'ArrowUp で末尾へのループ移動になっていません',
    );

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }));
    await flush(host);
    assert(
      input.getAttribute('aria-activedescendant') === firstOptionId,
      'ArrowDown で先頭へのループ移動になっていません',
    );

    const selectedPromise = waitForEvent<CustomEvent<UiSearchDialogSelectedDetail>>(host, 'ui-search-dialog-selected');
    const closedPromise = waitForEvent(host, 'ui-search-dialog-closed');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
    const selectedEvent = await selectedPromise;
    await closedPromise;
    await flush(host);

    const firstResult = results[0];
    assert(!!firstResult, '先頭結果が取得できません');
    const firstResultTitle = firstResult.querySelector('.item-title')?.textContent ?? '';
    assert(selectedEvent.detail.title === firstResultTitle, 'Enter 選択時の selected detail.title が一致しません');
    assert(!getNativeDialog(host).open, 'Enter 選択後にダイアログが閉じていません');
  },
};

/**
 * 境界条件:
 * - 150ms デバウンスで検索実行回数が抑制されること
 * - クリアボタン押下で query/表示状態がリセットされること
 */
export const DebounceAndClearBoundary: Story = {
  render: () => html`
    <div style="padding: 2rem; min-height: 24rem;">
      <button id="debounce-trigger" type="button">デバウンス検証</button>
      <ui-search-dialog id="dialog-debounce"></ui-search-dialog>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'dialog-debounce');
    const trigger = canvasElement.querySelector<HTMLButtonElement>('#debounce-trigger');
    assert(!!trigger, '#debounce-trigger が見つかりません');
    await flush(host);

    const calls: string[] = [];
    host.searcher = (query) => {
      calls.push(query);
      return SEARCH_ITEMS.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()));
    };

    const openedPromise = waitForEvent(host, 'ui-search-dialog-opened');
    host.open(trigger);
    await openedPromise;
    await flush(host);

    const input = getInput(host);
    input.value = 'r';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await wait(40);
    input.value = 'ro';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await wait(40);
    input.value = 'rou';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await settleSearch(host);

    assert(calls.length === 1, `デバウンス後の検索実行回数が不正です: ${calls.length.toString()}`);
    assert(calls[0] === 'rou', `デバウンス後のクエリが不正です: ${calls[0] ?? 'undefined'}`);

    const clearButton = getClearButton(host);
    assert(!clearButton.hidden, 'query 入力後にクリアボタンが表示されていません');
    clearButton.click();
    await flush(host);

    assert(host.query === '', 'クリア後に query が空になっていません');
    assert(clearButton.hidden, 'クリア後にクリアボタンが hidden に戻っていません');
    assert(getResultItems(host).length === 0, 'クリア後に結果リストが残っています');

    const closedPromise = waitForEvent(host, 'ui-search-dialog-closed');
    host.close();
    await closedPromise;
  },
};

/**
 * 境界条件:
 * - open() の再入呼び出しで opened イベントが重複しないこと
 * - Esc(cancel) で閉じること
 * - trigger 未指定 open() で activeElement フォールバックが効くこと
 */
export const ReentrancyAndEscCancel: Story = {
  render: () => html`
    <div style="padding: 2rem; min-height: 24rem;">
      <button id="reentry-trigger" type="button">再入検証</button>
      <ui-search-dialog id="dialog-reentry" .items=${SEARCH_ITEMS}></ui-search-dialog>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'dialog-reentry');
    const trigger = canvasElement.querySelector<HTMLButtonElement>('#reentry-trigger');
    assert(!!trigger, '#reentry-trigger が見つかりません');
    await flush(host);

    let openedCount = 0;
    const openedListener = (): void => {
      openedCount += 1;
    };
    host.addEventListener('ui-search-dialog-opened', openedListener);

    trigger.focus();
    const openedPromise = waitForEvent(host, 'ui-search-dialog-opened');
    host.open();
    await openedPromise;
    await flush(host);

    assert(openedCount === 1, `open イベント回数が不正です: ${openedCount.toString()}`);
    await ensureNoEvent(host, 'ui-search-dialog-opened', () => {
      host.open();
    });

    const dialog = getNativeDialog(host);
    const closedPromise = waitForEvent(host, 'ui-search-dialog-closed');
    dialog.dispatchEvent(new Event('cancel', { bubbles: true, cancelable: true }));
    await closedPromise;
    await flush(host);

    assert(!dialog.open, 'Esc(cancel) 後に dialog が閉じていません');
    assert(document.activeElement === trigger, 'Esc(cancel) 後に trigger へフォーカス返却されていません');

    await ensureNoEvent(host, 'ui-search-dialog-closed', () => {
      host.close();
    });

    host.removeEventListener('ui-search-dialog-opened', openedListener);
  },
};
