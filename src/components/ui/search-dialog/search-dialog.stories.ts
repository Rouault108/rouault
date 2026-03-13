import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { userEvent } from 'storybook/test';
import {
  UiSearchDialog as SearchDialogElement,
  type UiSearchDialog,
  type UiSearchDialogItem,
  type UiSearchDialogOpenedDetail,
  type UiSearchDialogSelectedDetail,
} from './search-dialog';
import { SearchField as SearchFieldElement, type SearchField } from '../search-field/search-field';

const DEBOUNCE_WAIT_MS = 210;
const BODY_SEARCH_DIALOG_OPEN_ATTRIBUTE = 'data-ui-search-dialog-open';

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

const getSearchField = (host: UiSearchDialog): SearchField => {
  const field = host.shadowRoot?.querySelector<SearchField>('ui-search-field');
  if (!field) throw new Error('ui-search-field が見つかりません');
  return field;
};

const getInput = (host: UiSearchDialog): HTMLInputElement => {
  const input = getSearchField(host).shadowRoot?.querySelector<HTMLInputElement>('input');
  if (!input) throw new Error('検索 input が見つかりません');
  return input;
};

const getBody = (host: UiSearchDialog): HTMLElement => {
  const body = host.shadowRoot?.querySelector<HTMLElement>('.body');
  if (!body) throw new Error('body 要素が見つかりません');
  return body;
};

const getClearButton = (host: UiSearchDialog): HTMLButtonElement => {
  const button = getSearchField(host).shadowRoot?.querySelector<HTMLButtonElement>('.clear-button');
  if (!button) throw new Error('クリアボタンが見つかりません');
  return button;
};

const getCloseButton = (host: UiSearchDialog): HTMLButtonElement => {
  const button = host.shadowRoot?.querySelector<HTMLButtonElement>('.close-button');
  if (!button) throw new Error('閉じるボタンが見つかりません');
  return button;
};

const getResultItems = (host: UiSearchDialog): HTMLLIElement[] =>
  Array.from(host.shadowRoot?.querySelectorAll<HTMLLIElement>('.result-item') ?? []);

const getHighlightedMarks = (host: UiSearchDialog): HTMLElement[] =>
  Array.from(host.shadowRoot?.querySelectorAll<HTMLElement>('ui-search-highlight > mark') ?? []);

const normalizeText = (value: string | null | undefined): string =>
  (value ?? '').replace(/\s+/g, ' ').trim();

const hasInputFocus = (host: UiSearchDialog, input: HTMLInputElement): boolean => {
  const field = getSearchField(host);
  return host.shadowRoot?.activeElement === field && field.shadowRoot?.activeElement === input;
};

const hasClearButtonFocus = (host: UiSearchDialog, clearButton: HTMLButtonElement): boolean => {
  const field = getSearchField(host);
  return host.shadowRoot?.activeElement === field && field.shadowRoot?.activeElement === clearButton;
};

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
 * - 常時オープン + 結果あり
 * - デザイン確認と手動操作確認のための基準状態
 */
export const OpenPreview: Story = {
  render: () => html`
    <div style="padding: 2rem; min-height: 24rem;">
      <ui-search-dialog id="dialog-open-preview" .items=${SEARCH_ITEMS} opened query="router"></ui-search-dialog>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'dialog-open-preview');
    await flush(host);

    const dialog = getNativeDialog(host);
    const body = getBody(host);
    const emptyState = host.shadowRoot?.querySelector<HTMLElement>('.empty-state');
    const clearButton = getClearButton(host);
    assert(dialog.open, '初期表示で dialog が開いていません');
    assert(dialog.classList.contains('dialog'), 'native dialog に .dialog class が付与されていません');
    assert(!!emptyState, 'empty-state 要素が見つかりません');
    assert(
      clearButton.parentElement?.classList.contains('field'),
      'clear-button が ui-search-field の .field 内に配置されていません',
    );
    assert(emptyState.hidden, '初回検索完了前に空状態が表示されています');
    assert(getComputedStyle(body).minBlockSize !== '0px', '.body の min-block-size が確保されていません');

    await settleSearch(host);

    const results = getResultItems(host);
    assert(results.length > 0, '初期クエリの検索結果が表示されていません');
    assert(emptyState.hidden, '検索結果表示後も空状態が表示されています');
    assert(body.getBoundingClientRect().height > 0, '.body の高さが結果表示後に失われています');
  },
};

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
    assert(
      input.getAttribute('placeholder') === '検索',
      '検索プレースホルダーが新しい補助文言になっていません',
    );
    assert(openedEvent.detail.trigger === trigger, 'opened イベントの trigger が不正です');
    assert(hasInputFocus(host, input), 'open 後の自動フォーカスが input に移動していません');

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
 * ハイライト契約:
 * - 可視文字列上の一致だけを mark で包む
 * - keywords のみ一致する場合は候補は出すが mark は増えない
 */
export const VisibleMatchHighlighting: Story = {
  render: () => html`
    <div style="padding: 2rem; min-height: 24rem;">
      <button id="highlight-trigger" type="button">ハイライト検証</button>
      <button id="keyword-trigger" type="button">キーワード検証</button>
      <ui-search-dialog id="dialog-highlight" .items=${SEARCH_ITEMS}></ui-search-dialog>
      <ui-search-dialog id="dialog-keyword-only" .items=${SEARCH_ITEMS}></ui-search-dialog>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const visibleMatchHost = getHost(canvasElement, 'dialog-highlight');
    const keywordOnlyHost = getHost(canvasElement, 'dialog-keyword-only');
    const highlightTrigger = canvasElement.querySelector<HTMLButtonElement>('#highlight-trigger');
    const keywordTrigger = canvasElement.querySelector<HTMLButtonElement>('#keyword-trigger');
    assert(!!highlightTrigger, '#highlight-trigger が見つかりません');
    assert(!!keywordTrigger, '#keyword-trigger が見つかりません');
    await flush(visibleMatchHost);
    await flush(keywordOnlyHost);

    const visibleOpenedPromise = waitForEvent(visibleMatchHost, 'ui-search-dialog-opened');
    visibleMatchHost.open(highlightTrigger);
    await visibleOpenedPromise;
    await flush(visibleMatchHost);
    visibleMatchHost.query = 'RoUtEr';
    await settleSearch(visibleMatchHost);

    const visibleMarks = getHighlightedMarks(visibleMatchHost);
    const visibleResults = getResultItems(visibleMatchHost);
    assert(visibleResults.length > 0, '可視一致の検索結果が表示されていません');
    assert(visibleMarks.length >= 2, 'title/path の可視一致が mark でハイライトされていません');
    assert(visibleMarks[0]?.textContent === 'Router', 'title のハイライト mark に前後の不要な空白を含めてはいけません');
    assert(visibleMarks[1]?.textContent === 'router', 'path のハイライト mark に前後の不要な空白を含めてはいけません');
    assert(
      normalizeText(visibleMarks[0].textContent) === 'Router',
      'title のハイライト mark 自体が一致文字列を内包していません',
    );
    assert(
      normalizeText(visibleMarks[1].textContent) === 'router',
      'path のハイライト mark 自体が一致文字列を内包していません',
    );

    const firstTitle = visibleResults[0]?.querySelector('.item-title');
    const firstPath = visibleResults[0]?.querySelector('.item-path');
    const titleText = normalizeText(firstTitle?.textContent);
    const pathText = normalizeText(firstPath?.textContent);
    assert(titleText.includes('Router'), 'title の元文字列の大小文字が保持されていません');
    assert(pathText.includes('/notes/') && pathText.includes('router') && pathText.includes('-design'), 'path の表示文字列が変形しています');
    assert(!!firstTitle?.querySelector('ui-search-highlight > mark'), 'case-insensitive 一致でも title の一致語が mark 化されていません');
    assert(!!firstPath?.querySelector('ui-search-highlight > mark'), 'path の一致語が mark 化されていません');

    const visibleClosedPromise = waitForEvent(visibleMatchHost, 'ui-search-dialog-closed');
    visibleMatchHost.close();
    await visibleClosedPromise;
    await flush(visibleMatchHost);

    const keywordOpenedPromise = waitForEvent(keywordOnlyHost, 'ui-search-dialog-opened');
    keywordOnlyHost.open(keywordTrigger);
    await keywordOpenedPromise;
    await flush(keywordOnlyHost);
    keywordOnlyHost.query = 'navigation';
    await settleSearch(keywordOnlyHost);

    const keywordOnlyMarks = getHighlightedMarks(keywordOnlyHost);
    const keywordOnlyResults = getResultItems(keywordOnlyHost);
    assert(keywordOnlyResults.length > 0, 'keywords のみ一致する結果が表示されていません');
    assert(keywordOnlyMarks.length === 0, 'keywords のみ一致する結果に可視ハイライトが出ています');

    const keywordClosedPromise = waitForEvent(keywordOnlyHost, 'ui-search-dialog-closed');
    keywordOnlyHost.close();
    await keywordClosedPromise;
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
    const body = getBody(host);
    const loadingState = host.shadowRoot?.querySelector<HTMLElement>('.loading-state');
    const listbox = host.shadowRoot?.querySelector<HTMLUListElement>('#search-listbox');
    assert(!!loadingState, 'loading-state 要素が見つかりません');
    assert(!!listbox, 'listbox 要素が見つかりません');

    assert(!loadingState.hidden, 'loading=true なのにローディング表示が出ていません');
    assert(input.getAttribute('aria-busy') === 'true', 'loading=true で aria-busy=true になっていません');
    assert(listbox.hidden, 'loading=true で listbox が非表示になっていません');

    const bodyHeightWhileLoading = body.getBoundingClientRect().height;

    input.value = 'router';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await flush(host);
    assert(host.query === 'router', 'loading 中に query 編集が反映されません');

    host.loading = false;
    await settleSearch(host);
    assert(input.getAttribute('aria-busy') === 'false', 'loading=false で aria-busy=false に戻っていません');
    assert(getResultItems(host).length > 0, 'loading 解除後に検索結果が表示されていません');
    const bodyHeightAfterLoading = body.getBoundingClientRect().height;
    assert(Math.abs(bodyHeightAfterLoading - bodyHeightWhileLoading) <= 1, '.body の高さが loading 解除で変動しています');

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
    const body = getBody(host);
    const bodyHeightBefore = body.getBoundingClientRect().height;
    input.value = 'zzzzzz';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await settleSearch(host);

    const emptyState = host.shadowRoot?.querySelector<HTMLElement>('.empty-state');
    const listbox = host.shadowRoot?.querySelector<HTMLUListElement>('#search-listbox');
    const liveRegion = host.shadowRoot?.querySelector<HTMLElement>('.sr-only');
    const footer = host.shadowRoot?.querySelector<HTMLElement>('.footer');
    const closeButton = getCloseButton(host);
    assert(!!emptyState, 'empty-state 要素が見つかりません');
    assert(!!listbox, 'listbox 要素が見つかりません');
    assert(!!liveRegion, 'aria-live 領域が見つかりません');
    assert(!!footer, 'footer 要素が見つかりません');

    assert(!emptyState.hidden, '0 件時に empty-state が表示されていません');
    assert(listbox.hidden, '0 件時に listbox が非表示になっていません');
    assert(liveRegion.textContent.includes('結果が見つかりません'), 'aria-live 通知文言が更新されていません');
    assert(footer.textContent.includes('Enter'), 'footer に Enter 操作が表示されていません');
    assert(!footer.textContent.includes('Esc'), 'footer に Esc が残っています');
    assert(closeButton.getAttribute('aria-label') === '閉じる', '閉じるボタンの aria-label が不正です');
    const bodyHeightAfter = body.getBoundingClientRect().height;
    assert(Math.abs(bodyHeightAfter - bodyHeightBefore) <= 1, '.body の高さが empty state 表示で変動しています');

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
    input.value = 'i';
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

/**
 * 境界条件:
 * - パネル内クリックでは閉じないこと
 * - backdrop クリックで閉じること
 */
export const BackdropClickClosesDialog: Story = {
  render: () => html`
    <div style="padding: 2rem; min-height: 24rem;">
      <button id="backdrop-trigger" type="button">backdrop検証</button>
      <ui-search-dialog id="dialog-backdrop" .items=${SEARCH_ITEMS}></ui-search-dialog>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'dialog-backdrop');
    const trigger = canvasElement.querySelector<HTMLButtonElement>('#backdrop-trigger');
    assert(!!trigger, '#backdrop-trigger が見つかりません');
    await flush(host);

    trigger.focus();
    const openedPromise = waitForEvent(host, 'ui-search-dialog-opened');
    host.open(trigger);
    await openedPromise;
    await flush(host);

    const dialog = getNativeDialog(host);
    const rect = dialog.getBoundingClientRect();

    await ensureNoEvent(host, 'ui-search-dialog-closed', () => {
      dialog.dispatchEvent(
        new MouseEvent('mousedown', {
          bubbles: true,
          composed: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
        }),
      );
    });
    assert(dialog.open, 'パネル内クリックで dialog が閉じてはいけません');

    const closedPromise = waitForEvent(host, 'ui-search-dialog-closed');
    dialog.dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        composed: true,
        clientX: Math.max(0, rect.left - 8),
        clientY: Math.max(0, rect.top - 8),
      }),
    );
    await closedPromise;
    await flush(host);

    assert(!dialog.open, 'backdrop クリック後に dialog が閉じていません');
    assert(document.activeElement === trigger, 'backdrop クリック後に trigger へフォーカス返却されていません');
  },
};

/**
 * 意味のある組み合わせ:
 * - opened 属性の反映で開閉できること
 * - Scroll Lock 属性の付与/解除が成立すること
 */
export const OpenedAttributeAndScrollLock: Story = {
  render: () => html`
    <div style="padding: 2rem; min-height: 24rem;">
      <button id="attr-trigger" type="button">属性制御を検証</button>
      <ui-search-dialog id="dialog-attr" .items=${SEARCH_ITEMS}></ui-search-dialog>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'dialog-attr');
    const trigger = canvasElement.querySelector<HTMLButtonElement>('#attr-trigger');
    assert(!!trigger, '#attr-trigger が見つかりません');
    await flush(host);

    trigger.focus();
    const openedPromise = waitForEvent(host, 'ui-search-dialog-opened');
    host.opened = true;
    await openedPromise;
    await flush(host);

    assert(getNativeDialog(host).open, 'opened=true で dialog が開いていません');
    assert(document.body.hasAttribute(BODY_SEARCH_DIALOG_OPEN_ATTRIBUTE), '開放中に body 属性が付与されていません');

    const closedPromise = waitForEvent(host, 'ui-search-dialog-closed');
    host.opened = false;
    await closedPromise;
    await flush(host);

    assert(!getNativeDialog(host).open, 'opened=false で dialog が閉じていません');
    assert(!document.body.hasAttribute(BODY_SEARCH_DIALOG_OPEN_ATTRIBUTE), 'close 後に body 属性が解除されていません');
    assert(document.activeElement === trigger, 'opened 属性制御での close 後にフォーカス返却されていません');
  },
};

/**
 * 境界条件:
 * - Tab で input -> clear button -> close button へ移動できること
 */
export const TabNavigationBetweenInputAndClear: Story = {
  render: () => html`
    <div style="padding: 2rem; min-height: 24rem;">
      <button id="tab-trigger" type="button">Tab検証</button>
      <ui-search-dialog id="dialog-tab" .items=${SEARCH_ITEMS}></ui-search-dialog>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'dialog-tab');
    const trigger = canvasElement.querySelector<HTMLButtonElement>('#tab-trigger');
    assert(!!trigger, '#tab-trigger が見つかりません');
    await flush(host);

    const openedPromise = waitForEvent(host, 'ui-search-dialog-opened');
    host.open(trigger);
    await openedPromise;
    await flush(host);

    const input = getInput(host);
    input.value = 'router';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await settleSearch(host);

    input.focus();
    await waitFrame();
    await userEvent.tab();
    await waitFrame();

    const clearButton = getClearButton(host);
    assert(hasClearButtonFocus(host, clearButton), 'Tab で clear-button へ移動できていません');

    await userEvent.tab();
    await waitFrame();

    const closeButton = getCloseButton(host);
    assert(host.shadowRoot?.activeElement === closeButton, 'Tab で close-button へ移動できていません');

    await userEvent.tab({ shift: true });
    await waitFrame();
    assert(hasClearButtonFocus(host, clearButton), 'Shift+Tab で clear-button へ戻れません');

    await userEvent.tab({ shift: true });
    await waitFrame();
    assert(hasInputFocus(host, input), 'Shift+Tab で input へ戻れません');

    const closedPromise = waitForEvent(host, 'ui-search-dialog-closed');
    host.close();
    await closedPromise;
  },
};

/**
 * ダークモード契約:
 * prefers-color-scheme 分岐に依存せず、トークンで表示できること
 */
export const DarkModeTokenContract: Story = {
  parameters: {
    backgrounds: { default: 'dark' },
  },
  render: () => html`
    <div style="color-scheme: dark; background: oklch(14% 0.01 250); color: oklch(92% 0.01 250); padding: 1rem;">
      <ui-search-dialog id="dialog-dark" .items=${SEARCH_ITEMS} opened query="router"></ui-search-dialog>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'dialog-dark');
    await flush(host);
    await settleSearch(host);

    const cssText = String(SearchDialogElement.styles);
    const mark = getHighlightedMarks(host)[0];
    assert(!cssText.includes('prefers-color-scheme'), 'dark mode は prefers-color-scheme 分岐に依存しないでください');
    assert(cssText.includes('background: var(--bg-surface-3);'), 'panel 背景が --bg-surface-3 契約になっていません');
    assert(!!mark, 'dark mode で検索ハイライトが描画されていません');
    assert(getComputedStyle(mark).boxShadow !== 'none', 'dark mode で線状ハイライトが消失しています');
  },
};

/**
 * スタイル契約:
 * reduced-motion / forced-colors / print / トークン命名を保持すること
 */
export const StyleContractCoverage: Story = {
  render: () => html`
    <div style="padding: 2rem;">
      <ui-search-dialog id="dialog-contract" .items=${SEARCH_ITEMS}></ui-search-dialog>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const host = getHost(canvasElement, 'dialog-contract');
    await flush(host);

    const cssText = String(SearchDialogElement.styles);
    const searchFieldCssText = String(SearchFieldElement.styles);
    assert(cssText.includes('@media (prefers-reduced-motion: reduce)'), 'Reduced Motion 契約が不足しています');
    assert(cssText.includes('animation-duration: 0.01ms !important;'), 'Reduced Motion の 0.01ms 短縮が不足しています');
    assert(cssText.includes('@media (forced-colors: active)'), 'Forced Colors 契約が不足しています');
    assert(cssText.includes('CanvasText'), 'Forced Colors の境界色契約が不足しています');
    assert(cssText.includes('@media print'), 'Print 契約が不足しています');
    assert(searchFieldCssText.includes('::-webkit-search-cancel-button'), 'ネイティブ search cancel UI 抑止が不足しています');
    assert(cssText.includes('.dialog {'), 'native dialog shell class が不足しています');
    assert(cssText.includes('--ui-search-dialog-backdrop'), 'コンポーネントローカルトークンが不足しています');
    assert(cssText.includes('--ui-search-dialog-body-min-height'), 'body min height 公開トークンが不足しています');
    assert(cssText.includes('--ui-search-dialog-max-width'), 'パブリックトークン定義が不足しています');
    assert(!/(^|[\s}])dialog(?=(\[|::backdrop|\s*\{))/m.test(cssText), 'native dialog 直指定セレクタは使用しないでください');
    assert(!cssText.includes('--search-dialog-'), 'トークン命名規則違反（--search-dialog-*）があります');
  },
};
