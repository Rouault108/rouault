import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/ui/search-dialog/search-dialog.js';
import type { UiSearchDialog } from '../../src/components/ui/search-dialog/search-dialog.js';
import type {
  UiSearchDialogCloseRequestedDetail,
  UiSearchDialogItem,
  UiSearchDialogQueryChangedDetail,
  UiSearchDialogSearchResult,
  UiSearchDialogSelectedDetail,
} from '../../src/components/ui/search-dialog/search-dialog.types.js';
import { BODY_SEARCH_DIALOG_OPEN_ATTRIBUTE } from '../../src/components/ui/search-dialog/search-dialog.constants.js';
import { nextAnimationFrame, waitForLitUpdate, waitMs } from './helpers/wait-for-lit.js';

interface SearchFieldLike extends HTMLElement {
  value: string;
}

interface OpenRequestedDetail {
  trigger: HTMLElement | null;
}

const FIXTURE_ITEMS: UiSearchDialogItem[] = [
  {
    id: 'alpha',
    title: 'Alpha Guide',
    url: '/docs/alpha',
    path: '/docs/alpha',
    keywords: ['guide', 'entry'],
  },
  {
    id: 'beta',
    title: 'Beta Reference',
    url: '/docs/beta',
    path: '/docs/beta',
    keywords: ['reference', 'api'],
  },
  {
    id: 'gamma',
    title: 'Gamma Notes',
    url: '/notes/gamma',
    path: '/notes/gamma',
    keywords: ['notes', 'memo'],
  },
  {
    id: 'delta',
    title: 'Delta API',
    url: '/api/delta',
    path: '/api/delta',
    keywords: ['schema'],
  },
];

const createVirtualizedItems = (total = 160): UiSearchDialogItem[] =>
  Array.from({ length: total }, (_, index) => ({
    id: `virtual-${String(index + 1)}`,
    title: `Virtual Item ${String(index + 1)}`,
    url: `/virtual/${String(index + 1)}`,
    path: `/virtual/${String(index + 1)}`,
    keywords: [`keyword-${String(index + 1)}`],
  }));

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const getDialog = (root: ParentNode): UiSearchDialog =>
  expectPresent(root.querySelector<UiSearchDialog>('ui-search-dialog'), 'ui-search-dialog');

const getTrigger = (root: ParentNode): HTMLButtonElement =>
  expectPresent(root.querySelector<HTMLButtonElement>('[data-testid="trigger"]'), 'trigger');

const getNativeDialog = (dialog: UiSearchDialog): HTMLDialogElement =>
  expectPresent(dialog.shadowRoot?.querySelector<HTMLDialogElement>('dialog'), 'nativeDialog');

const getSearchField = (dialog: UiSearchDialog): SearchFieldLike =>
  expectPresent(
    dialog.shadowRoot?.querySelector<SearchFieldLike>('ui-search-field'),
    'ui-search-field',
  );

const getSearchInput = (dialog: UiSearchDialog): HTMLInputElement =>
  expectPresent(
    getSearchField(dialog).shadowRoot?.querySelector<HTMLInputElement>('input'),
    'search input',
  );

const getCloseButton = (dialog: UiSearchDialog): HTMLButtonElement =>
  expectPresent(
    dialog.shadowRoot?.querySelector<HTMLButtonElement>('.close-button'),
    'closeButton',
  );

const getResultItems = (dialog: UiSearchDialog): HTMLElement[] =>
  Array.from(dialog.shadowRoot?.querySelectorAll<HTMLElement>('.result-item') ?? []);

const waitUntil = async (
  predicate: () => boolean,
  timeoutMs = 2000,
  intervalMs = 20,
  message = 'condition not met',
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await waitMs(intervalMs);
  }

  throw new Error(message);
};

const attachControlledContract = (dialog: UiSearchDialog): void => {
  dialog.addEventListener('ui-search-dialog-open-requested', () => {
    dialog.opened = true;
  });

  dialog.addEventListener('ui-search-dialog-close-requested', () => {
    dialog.opened = false;
  });

  dialog.addEventListener('ui-search-dialog-query-changed', (event) => {
    const customEvent = event as CustomEvent<UiSearchDialogQueryChangedDetail>;
    dialog.query = customEvent.detail.query;
  });
};

const requestOpen = async (root: ParentNode): Promise<UiSearchDialog> => {
  const dialog = getDialog(root);
  attachControlledContract(dialog);
  dialog.requestOpen(getTrigger(root));

  await waitUntil(() => dialog.opened === true, 1500, 20, 'dialog did not open');
  await waitForLitUpdate(dialog);
  await nextAnimationFrame();

  return dialog;
};

const setQuery = async (dialog: UiSearchDialog, value: string): Promise<void> => {
  const searchField = getSearchField(dialog);
  searchField.value = value;
  searchField.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  await waitForLitUpdate(dialog);
};

const waitForResults = async (dialog: UiSearchDialog): Promise<void> => {
  await waitUntil(
    () => getResultItems(dialog).length > 0,
    2500,
    25,
    'search results did not appear',
  );
};

describe('ui-search-dialog browser contract', () => {
  it('requestOpen は open-requested を送出するが、自動では opened を変更しないこと', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <button data-testid="trigger" type="button">検索を開く</button>
        <ui-search-dialog .items=${FIXTURE_ITEMS}></ui-search-dialog>
      </div>
    `);

    const dialog = getDialog(wrapper);
    const trigger = getTrigger(wrapper);

    let requestedDetail: OpenRequestedDetail | null = null;
    dialog.addEventListener('ui-search-dialog-open-requested', (event) => {
      requestedDetail = (event as CustomEvent<OpenRequestedDetail>).detail;
    });

    dialog.requestOpen(trigger);
    await waitForLitUpdate(dialog);
    await nextAnimationFrame();

    const detail = expectPresent<OpenRequestedDetail>(requestedDetail, 'open requested detail');
    expect(detail.trigger).to.equal(trigger);
    expect(dialog.opened).to.equal(false);
  });

  it('controlled mode で query-change を送出し、loading 中も入力編集を維持すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <button data-testid="trigger" type="button">検索を開く</button>
        <ui-search-dialog
          .items=${FIXTURE_ITEMS}
          .loading=${true}
          .query=${'alp'}
        ></ui-search-dialog>
      </div>
    `);

    const dialog = await requestOpen(wrapper);
    const queries: string[] = [];

    dialog.addEventListener('ui-search-dialog-query-changed', (event) => {
      queries.push((event as CustomEvent<UiSearchDialogQueryChangedDetail>).detail.query);
    });

    await setQuery(dialog, 'beta');
    await nextAnimationFrame();

    const input = getSearchInput(dialog);
    expect(queries).to.deep.equal(['beta']);
    expect(dialog.query).to.equal('beta');
    expect(input.value).to.equal('beta');
    expect(dialog.shadowRoot?.textContent ?? '').to.contain('検索インデックスを読み込んでいます');
  });

  it('close-button で閉じた後に trigger へフォーカスを戻し、body scroll lock を解除すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <button data-testid="trigger" type="button">検索を開く</button>
        <ui-search-dialog .items=${FIXTURE_ITEMS}></ui-search-dialog>
      </div>
    `);

    const trigger = getTrigger(wrapper);
    const dialog = await requestOpen(wrapper);
    const nativeDialog = getNativeDialog(dialog);

    await waitUntil(() => nativeDialog.open === true, 1500, 20, 'native dialog did not open');
    expect(document.body.hasAttribute(BODY_SEARCH_DIALOG_OPEN_ATTRIBUTE)).to.equal(true);

    const closedPromise = new Promise<void>((resolve) => {
      dialog.addEventListener(
        'ui-search-dialog-closed',
        () => {
          resolve();
        },
        { once: true },
      );
    });

    getCloseButton(dialog).click();
    await closedPromise;
    await nextAnimationFrame();

    expect(dialog.opened).to.equal(false);
    expect(nativeDialog.open).to.equal(false);
    expect(document.body.hasAttribute(BODY_SEARCH_DIALOG_OPEN_ATTRIBUTE)).to.equal(false);
    expect(document.activeElement).to.equal(trigger);
  });

  it('選択時に selected -> close-requested -> closed の順で発火すること', async () => {
    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <button data-testid="trigger" type="button">検索を開く</button>
        <ui-search-dialog .items=${FIXTURE_ITEMS}></ui-search-dialog>
      </div>
    `);

    const dialog = await requestOpen(wrapper);
    const events: string[] = [];
    const selections: UiSearchDialogSelectedDetail[] = [];
    const closeReasons: string[] = [];

    dialog.addEventListener('ui-search-dialog-selected', (event) => {
      events.push('selected');
      selections.push((event as CustomEvent<UiSearchDialogSelectedDetail>).detail);
    });
    dialog.addEventListener('ui-search-dialog-close-requested', (event) => {
      events.push('close-requested');
      closeReasons.push((event as CustomEvent<UiSearchDialogCloseRequestedDetail>).detail.reason);
    });
    dialog.addEventListener('ui-search-dialog-closed', () => {
      events.push('closed');
    });

    await setQuery(dialog, 'alpha');
    await waitForResults(dialog);

    const firstItem = expectPresent(getResultItems(dialog)[0], 'first result item');
    firstItem.click();

    await waitUntil(
      () => events.length === 3 && dialog.opened === false,
      2500,
      25,
      'selection event order did not complete',
    );

    expect(events).to.deep.equal(['selected', 'close-requested', 'closed']);
    expect(selections[0]?.selectionMethod).to.equal('pointer');
    expect(closeReasons).to.deep.equal(['selection']);
  });

  it('virtualized 結果でも aria-activedescendant が実在 option を指すこと', async () => {
    const dialog = await fixture<UiSearchDialog>(html`
      <ui-search-dialog
        .items=${createVirtualizedItems()}
        .opened=${true}
        .query=${'Virtual'}
      ></ui-search-dialog>
    `);

    await waitForLitUpdate(dialog);
    await nextAnimationFrame();
    await waitForResults(dialog);

    const searchField = getSearchField(dialog);
    searchField.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );

    await nextAnimationFrame();

    const input = getSearchInput(dialog);
    const activeId = input.getAttribute('aria-activedescendant');
    expect(activeId).to.not.equal(null);
    expect(dialog.shadowRoot?.getElementById(activeId ?? '')).to.not.equal(null);
  });

  it('searcher error を error state として表示すること', async () => {
    const failingSearcher = async (): Promise<UiSearchDialogSearchResult> => ({
      items: [],
      error: {
        code: 'network-error',
        message: '検索サービスに接続できません',
      },
    });

    const wrapper = await fixture<HTMLDivElement>(html`
      <div>
        <button data-testid="trigger" type="button">検索を開く</button>
        <ui-search-dialog .items=${[]} .searcher=${failingSearcher}></ui-search-dialog>
      </div>
    `);

    const dialog = await requestOpen(wrapper);
    await setQuery(dialog, 'alpha');

    await waitUntil(
      () => (dialog.shadowRoot?.textContent ?? '').includes('検索結果を取得できませんでした'),
      2500,
      25,
      'error state did not appear',
    );

    const text = dialog.shadowRoot?.textContent ?? '';
    expect(text).to.contain('検索結果を取得できませんでした');
    expect(text).to.contain('時間をおいて再度お試しください');
  });
});
