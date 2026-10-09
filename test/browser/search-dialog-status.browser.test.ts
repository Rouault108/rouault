import { afterEach, describe, expect, it } from 'vitest';

import { enhanceSearchDialog } from '../../src/client/post-hydrate/search-dialog-enhancer.js';
import { dispatchSearchDialogEvent } from '../../src/search/search-dialog-events.js';
import {
  SEARCH_DIALOG_STATUS_EMPTY_MESSAGE,
  SEARCH_DIALOG_STATUS_IDLE_MESSAGE,
  SEARCH_DIALOG_STATUS_LOADING_MESSAGE,
  createSearchDialogResultsStatusMessage,
} from '../../src/search/search-dialog-constants.js';
import {
  appendDialogFixture,
  createResultItem,
  flushOperations,
  openSearchDialogForTest,
  waitForCloseCompletion,
  waitForLoadingIndicatorDelay,
} from './helpers/search-dialog-test-fixture.js';

describe('search-dialog status', () => {
  afterEach(() => {
    document.body.replaceChildren();
    enhanceSearchDialog(document);
  });

  it('live region は exact text と unavailable 優先順位を維持し、query change で旧 count を消すこと', () => {
    const dialog = appendDialogFixture();
    const liveRegion = dialog.querySelector<HTMLElement>('[data-search-dialog-status]');
    if (!liveRegion) throw new Error('search dialog fixture is invalid');
    enhanceSearchDialog(document);

    expect(liveRegion.textContent).to.equal(SEARCH_DIALOG_STATUS_IDLE_MESSAGE);
    dispatchSearchDialogEvent('search-dialog:query-change', { query: 'initial' });
    dispatchSearchDialogEvent('search-dialog:loading-change', { loading: true });
    expect(liveRegion.textContent).to.equal('');
    expect(liveRegion.textContent).to.not.equal(SEARCH_DIALOG_STATUS_LOADING_MESSAGE);
    expect(liveRegion.textContent).to.not.equal(SEARCH_DIALOG_STATUS_IDLE_MESSAGE);
    dispatchSearchDialogEvent('search-dialog:results-change', {
      query: 'initial',
      items: [],
    });
    dispatchSearchDialogEvent('search-dialog:query-change', { query: 'router' });
    dispatchSearchDialogEvent('search-dialog:results-change', {
      query: 'router',
      items: [createResultItem(0), createResultItem(1)],
    });
    expect(liveRegion.textContent).to.equal(createSearchDialogResultsStatusMessage(2));

    dispatchSearchDialogEvent('search-dialog:query-change', { query: 'next' });
    expect(liveRegion.textContent).to.equal('');
    expect(liveRegion.textContent).to.not.equal(SEARCH_DIALOG_STATUS_IDLE_MESSAGE);
    dispatchSearchDialogEvent('search-dialog:results-change', { query: 'next', items: [] });
    expect(liveRegion.textContent).to.equal(SEARCH_DIALOG_STATUS_EMPTY_MESSAGE);
    dispatchSearchDialogEvent('search-dialog:error', { message: 'exact error' });
    expect(liveRegion.textContent).to.equal('exact error');

    dispatchSearchDialogEvent('search-dialog:unavailable', { message: 'exact unavailable' });
    dispatchSearchDialogEvent('search-dialog:loading-change', { loading: true });
    dispatchSearchDialogEvent('search-dialog:results-change', {
      query: 'next',
      items: [createResultItem(2)],
    });
    dispatchSearchDialogEvent('search-dialog:error', { message: 'hidden error' });
    expect(liveRegion.textContent).to.equal('exact unavailable');
  });

  it('loading indicator は loading-change true 直後は隠し、遅延後にまだ loading なら表示すること', async () => {
    const dialog = appendDialogFixture();
    const input = dialog.querySelector<HTMLInputElement>('[data-search-dialog-input]');
    const loading = dialog.querySelector<HTMLElement>('[data-search-dialog-loading]');
    const liveRegion = dialog.querySelector<HTMLElement>('[data-search-dialog-status]');
    enhanceSearchDialog(document);
    await openSearchDialogForTest();

    dispatchSearchDialogEvent('search-dialog:query-change', { query: 'router' });
    dispatchSearchDialogEvent('search-dialog:loading-change', { loading: true });

    expect(loading?.hidden).to.equal(true);
    expect(input?.getAttribute('aria-busy')).to.equal('true');
    expect(liveRegion?.textContent).to.equal('');
    expect(liveRegion?.textContent).to.not.equal(SEARCH_DIALOG_STATUS_LOADING_MESSAGE);
    expect(liveRegion?.textContent).to.not.equal(SEARCH_DIALOG_STATUS_IDLE_MESSAGE);

    await waitForLoadingIndicatorDelay();

    expect(loading?.hidden).to.equal(false);
    expect(liveRegion?.textContent).to.equal(SEARCH_DIALOG_STATUS_LOADING_MESSAGE);
  });

  it('delay 前に結果・error・unavailable が来た場合は loading indicator を表示しないこと', async () => {
    for (const mode of ['results', 'error', 'unavailable'] as const) {
      document.body.replaceChildren();
      enhanceSearchDialog(document);
      const dialog = appendDialogFixture();
      const loading = dialog.querySelector<HTMLElement>('[data-search-dialog-loading]');
      enhanceSearchDialog(document);
      await openSearchDialogForTest();

      dispatchSearchDialogEvent('search-dialog:query-change', { query: mode });
      dispatchSearchDialogEvent('search-dialog:loading-change', { loading: true });

      if (mode === 'results') {
        dispatchSearchDialogEvent('search-dialog:results-change', {
          query: mode,
          items: [createResultItem(1)],
        });
      } else if (mode === 'error') {
        dispatchSearchDialogEvent('search-dialog:error', { message: 'exact error' });
      } else {
        dispatchSearchDialogEvent('search-dialog:unavailable', { message: 'exact unavailable' });
      }

      await waitForLoadingIndicatorDelay();

      expect(loading?.hidden).to.equal(true);
      if (mode === 'results') {
        expect(dialog.querySelector<HTMLElement>('[role="option"]')?.textContent).to.contain(
          'Result 1',
        );
      } else {
        expect(dialog.querySelector<HTMLElement>(`[data-search-dialog-${mode}]`)?.hidden).to.equal(
          false,
        );
      }
    }
  });

  it('loading-change false が results-change より先でも非空 query の live region を idle に戻さないこと', async () => {
    const dialog = appendDialogFixture();
    const liveRegion = dialog.querySelector<HTMLElement>('[data-search-dialog-status]');
    enhanceSearchDialog(document);
    await openSearchDialogForTest();

    dispatchSearchDialogEvent('search-dialog:query-change', { query: 'router' });
    dispatchSearchDialogEvent('search-dialog:loading-change', { loading: true });
    dispatchSearchDialogEvent('search-dialog:loading-change', { loading: false });

    expect(liveRegion?.textContent).to.equal('');
    expect(liveRegion?.textContent).to.not.equal(SEARCH_DIALOG_STATUS_IDLE_MESSAGE);
  });

  it('同一 query 再検索で loading-change false が先に来ても旧結果 DOM と旧件数を復帰しないこと', async () => {
    const dialog = appendDialogFixture();
    const liveRegion = dialog.querySelector<HTMLElement>('[data-search-dialog-status]');
    enhanceSearchDialog(document);
    await openSearchDialogForTest();

    dispatchSearchDialogEvent('search-dialog:query-change', { query: 'router' });
    dispatchSearchDialogEvent('search-dialog:results-change', {
      query: 'router',
      items: [createResultItem(1)],
    });
    expect(dialog.querySelector<HTMLElement>('[role="option"]')?.textContent).to.contain(
      'Result 1',
    );
    expect(liveRegion?.textContent).to.equal(createSearchDialogResultsStatusMessage(1));

    dispatchSearchDialogEvent('search-dialog:loading-change', { loading: true });
    expect(dialog.querySelector<HTMLElement>('[role="option"]')).to.equal(null);
    expect(liveRegion?.textContent).to.equal('');

    dispatchSearchDialogEvent('search-dialog:loading-change', { loading: false });
    expect(dialog.querySelector<HTMLElement>('[role="option"]')).to.equal(null);
    expect(liveRegion?.textContent).to.equal('');

    dispatchSearchDialogEvent('search-dialog:results-change', {
      query: 'router',
      items: [createResultItem(2)],
    });
    expect(dialog.querySelector<HTMLElement>('[role="option"]')?.textContent).to.contain(
      'Result 2',
    );
  });

  it('query-change は古い loading timer を破棄し、新しい loading-change true で再予約すること', async () => {
    const dialog = appendDialogFixture();
    const loading = dialog.querySelector<HTMLElement>('[data-search-dialog-loading]');
    enhanceSearchDialog(document);
    await openSearchDialogForTest();

    dispatchSearchDialogEvent('search-dialog:query-change', { query: 'router' });
    dispatchSearchDialogEvent('search-dialog:loading-change', { loading: true });
    dispatchSearchDialogEvent('search-dialog:query-change', { query: 'next' });

    await waitForLoadingIndicatorDelay();

    expect(loading?.hidden).to.equal(true);

    dispatchSearchDialogEvent('search-dialog:loading-change', { loading: true });

    await waitForLoadingIndicatorDelay();

    expect(loading?.hidden).to.equal(false);
  });

  it('stale results-change は現在 query の loading timer を破棄しないこと', async () => {
    const dialog = appendDialogFixture();
    const loading = dialog.querySelector<HTMLElement>('[data-search-dialog-loading]');
    enhanceSearchDialog(document);
    await openSearchDialogForTest();

    dispatchSearchDialogEvent('search-dialog:query-change', { query: 'current' });
    dispatchSearchDialogEvent('search-dialog:loading-change', { loading: true });
    dispatchSearchDialogEvent('search-dialog:results-change', {
      query: 'stale',
      items: [createResultItem(1)],
    });

    await waitForLoadingIndicatorDelay();

    expect(loading?.hidden).to.equal(false);
    expect(dialog.querySelector<HTMLElement>('[role="option"]')).to.equal(null);
  });

  it('clearQuery は pending timer と表示済み loading DOM を即時に破棄すること', async () => {
    const dialog = appendDialogFixture();
    const input = dialog.querySelector<HTMLInputElement>('[data-search-dialog-input]');
    const clear = dialog.querySelector<HTMLButtonElement>('[data-search-dialog-clear]');
    const loading = dialog.querySelector<HTMLElement>('[data-search-dialog-loading]');
    const liveRegion = dialog.querySelector<HTMLElement>('[data-search-dialog-status]');
    enhanceSearchDialog(document);
    await openSearchDialogForTest();

    if (input) {
      input.value = 'router';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    dispatchSearchDialogEvent('search-dialog:loading-change', { loading: true });

    await waitForLoadingIndicatorDelay();

    expect(loading?.hidden).to.equal(false);
    expect(input?.getAttribute('aria-busy')).to.equal('true');

    clear?.click();

    expect(input?.value).to.equal('');
    expect(loading?.hidden).to.equal(true);
    expect(input?.getAttribute('aria-busy')).to.equal('false');
    expect(liveRegion?.textContent).to.equal(SEARCH_DIALOG_STATUS_IDLE_MESSAGE);

    await waitForLoadingIndicatorDelay();

    expect(loading?.hidden).to.equal(true);
    expect(input?.getAttribute('aria-busy')).to.equal('false');
  });

  it('close / dispose 後に timer が DOM を更新せず loading state を残さないこと', async () => {
    const dialog = appendDialogFixture();
    const loading = dialog.querySelector<HTMLElement>('[data-search-dialog-loading]');
    const signal = new AbortController();
    enhanceSearchDialog(document, signal.signal);
    await openSearchDialogForTest();

    const animation = dialog.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600 });
    dispatchSearchDialogEvent('search-dialog:query-change', { query: 'router' });
    dispatchSearchDialogEvent('search-dialog:loading-change', { loading: true });
    dispatchSearchDialogEvent('search-dialog:close-request', { reason: 'programmatic' });

    await waitForLoadingIndicatorDelay();

    expect(loading?.hidden).to.equal(true);

    await animation.finished;
    await waitForCloseCompletion(dialog);

    dispatchSearchDialogEvent('search-dialog:open-request', { trigger: null, modality: undefined });
    await flushOperations();
    dispatchSearchDialogEvent('search-dialog:loading-change', { loading: true });
    await waitForLoadingIndicatorDelay();
    expect(loading?.hidden).to.equal(false);

    signal.abort();
    expect(loading?.hidden).to.equal(true);
    expect(dialog.dataset['searchDialogState']).to.not.equal('loading');

    await waitForLoadingIndicatorDelay();

    expect(loading?.hidden).to.equal(true);
    expect(dialog.dataset['searchDialogState']).to.not.equal('loading');
  });

  it('loading 表示後に close / 再 open しても前回の loading DOM が残らないこと', async () => {
    const dialog = appendDialogFixture();
    const loading = dialog.querySelector<HTMLElement>('[data-search-dialog-loading]');
    enhanceSearchDialog(document);
    await openSearchDialogForTest();

    dispatchSearchDialogEvent('search-dialog:query-change', { query: 'router' });
    dispatchSearchDialogEvent('search-dialog:loading-change', { loading: true });
    await waitForLoadingIndicatorDelay();
    expect(loading?.hidden).to.equal(false);

    dispatchSearchDialogEvent('search-dialog:close-request', { reason: 'programmatic' });
    await waitForCloseCompletion(dialog);

    await openSearchDialogForTest();

    expect(loading?.hidden).to.equal(true);
    expect(dialog.dataset['searchDialogState']).to.not.equal('loading');
  });

  it('空 query の loading-change true は loading として維持せず raw input を破壊しないこと', async () => {
    const dialog = appendDialogFixture();
    const input = dialog.querySelector<HTMLInputElement>('[data-search-dialog-input]');
    const loading = dialog.querySelector<HTMLElement>('[data-search-dialog-loading]');
    const liveRegion = dialog.querySelector<HTMLElement>('[data-search-dialog-status]');
    enhanceSearchDialog(document);
    await openSearchDialogForTest();

    if (input) {
      input.value = '   ';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    dispatchSearchDialogEvent('search-dialog:loading-change', { loading: true });

    expect(input?.value).to.equal('   ');
    expect(input?.getAttribute('aria-busy')).to.equal('false');
    expect(loading?.hidden).to.equal(true);
    expect(liveRegion?.textContent).to.equal(SEARCH_DIALOG_STATUS_IDLE_MESSAGE);

    await waitForLoadingIndicatorDelay();

    expect(input?.value).to.equal('   ');
    expect(input?.getAttribute('aria-busy')).to.equal('false');
    expect(loading?.hidden).to.equal(true);
    expect(liveRegion?.textContent).to.equal(SEARCH_DIALOG_STATUS_IDLE_MESSAGE);
  });

  it('検索中に query-change で空 query へ戻った場合は非検索状態へ収束すること', async () => {
    const dialog = appendDialogFixture();
    const input = dialog.querySelector<HTMLInputElement>('[data-search-dialog-input]');
    const loading = dialog.querySelector<HTMLElement>('[data-search-dialog-loading]');
    const liveRegion = dialog.querySelector<HTMLElement>('[data-search-dialog-status]');
    enhanceSearchDialog(document);
    await openSearchDialogForTest();

    dispatchSearchDialogEvent('search-dialog:query-change', { query: 'router' });
    dispatchSearchDialogEvent('search-dialog:loading-change', { loading: true });
    expect(input?.getAttribute('aria-busy')).to.equal('true');
    expect(liveRegion?.textContent).to.equal('');

    if (input) {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    expect(input?.value).to.equal('');
    expect(input?.getAttribute('aria-busy')).to.equal('false');
    expect(loading?.hidden).to.equal(true);
    expect(liveRegion?.textContent).to.equal(SEARCH_DIALOG_STATUS_IDLE_MESSAGE);

    await waitForLoadingIndicatorDelay();

    expect(input?.getAttribute('aria-busy')).to.equal('false');
    expect(loading?.hidden).to.equal(true);
    expect(liveRegion?.textContent).to.equal(SEARCH_DIALOG_STATUS_IDLE_MESSAGE);
  });
});
