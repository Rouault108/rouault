import { expect } from '@open-wc/testing';

import { enhanceSearchDialog } from '../../src/client/post-hydrate/search-dialog-enhancer.js';
import {
  SEARCH_DIALOG_STATUS_EMPTY_MESSAGE,
  SEARCH_DIALOG_STATUS_IDLE_MESSAGE,
  SEARCH_DIALOG_STATUS_LOADING_MESSAGE,
  createSearchDialogResultsStatusMessage,
} from '../../src/search/search-dialog-constants.js';
import { dispatchSearchDialogEvent } from '../../src/search/search-dialog-events.js';
import type { SearchDialogItem } from '../../src/search/search-dialog-types.js';

const appendDialogFixture = (): HTMLDialogElement => {
  const dialog = document.createElement('dialog');
  dialog.id = 'global-search-dialog';
  dialog.dataset['searchDialogRoot'] = '';
  dialog.innerHTML = `
    <div data-search-dialog-form>
      <div data-search-dialog-field>
        <input data-search-dialog-input>
        <button type="button" data-search-dialog-clear hidden><svg><path></path></svg></button>
      </div>
      <button type="button" data-search-dialog-close>close</button>
    </div>
    <p data-search-dialog-status></p>
    <div data-search-dialog-loading hidden></div>
    <section data-search-dialog-empty hidden></section>
    <section data-search-dialog-error hidden><p data-search-dialog-error-message></p></section>
    <section data-search-dialog-unavailable hidden><p data-search-dialog-unavailable-message></p></section>
    <ul data-search-dialog-results hidden></ul>
  `;
  document.body.append(dialog);
  return dialog;
};

const flushOperations = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

const waitForNativeClose = async (dialog: HTMLDialogElement, close: () => void): Promise<void> => {
  const closeEvent = new Promise<void>((resolve) => {
    dialog.addEventListener('close', () => resolve(), { once: true });
  });
  close();
  await closeEvent;
  await flushOperations();
};

const createResultItem = (index: number): SearchDialogItem => ({
  id: `/notes/result-${index.toString()}/`,
  title: `Result ${index.toString()}`,
  renderHref: `/notes/result-${index.toString()}/`,
  canonicalPathname: `/notes/result-${index.toString()}/`,
});

const waitForCloseCompletion = async (dialog: HTMLDialogElement): Promise<void> => {
  for (let attempt = 0; attempt < 20 && (dialog.open || dialog.hasAttribute('data-closing')); attempt += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, 20));
  }
  await flushOperations();
};

describe('search-dialog-enhancer', () => {
  afterEach(() => {
    document.body.replaceChildren();
    enhanceSearchDialog(document);
  });

  it('open-request を受けて static dialog DOM を開き、legacy open event は listen しないこと', async () => {
    const dialog = appendDialogFixture();
    const trigger = document.createElement('button');
    trigger.dataset['searchDialogTrigger'] = '';
    document.body.append(trigger);

    enhanceSearchDialog(document);

    document.dispatchEvent(new CustomEvent('open-search-dialog', { bubbles: true, composed: true }));
    expect(dialog.open).to.equal(false);

    dispatchSearchDialogEvent('search-dialog:open-request', { trigger, modality: 'keyboard' });
    await flushOperations();
    expect(dialog.open).to.equal(true);
    expect(trigger.getAttribute('aria-expanded')).to.equal('true');
  });

  it('input / state / selection を static dialog event flow に同期すること', async () => {
    const dialog = appendDialogFixture();
    const input = dialog.querySelector<HTMLInputElement>('[data-search-dialog-input]');
    const selected: unknown[] = [];
    const queries: unknown[] = [];

    document.addEventListener('search-dialog:query-change', (event) => {
      queries.push((event as CustomEvent).detail);
    });
    document.addEventListener('search-dialog:selected', (event) => {
      selected.push((event as CustomEvent).detail);
    });

    enhanceSearchDialog(document);
    dispatchSearchDialogEvent('search-dialog:open-request', { trigger: null, modality: undefined });
    await flushOperations();
    input?.focus();
    if (input) {
      input.value = 'router';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    expect(queries).to.deep.equal([{ query: 'router' }]);

    dispatchSearchDialogEvent('search-dialog:loading-change', { loading: true });
    expect(dialog.querySelector<HTMLElement>('[data-search-dialog-loading]')?.hidden).to.equal(false);

    dispatchSearchDialogEvent('search-dialog:results-change', {
      query: 'router',
      items: [
        {
          id: '/notes/router/',
          title: 'Router 設計メモ',
          renderHref: '/notes/router/',
          canonicalPathname: '/notes/router/',
          path: 'notes / router',
        },
      ],
    });
    expect(dialog.querySelector<HTMLElement>('[data-search-dialog-loading]')?.hidden).to.equal(true);
    expect(dialog.querySelector('[role="option"]')?.textContent).to.contain('Router 設計メモ');

    dialog.querySelector<HTMLElement>('[role="option"]')?.click();
    expect(selected).to.have.length(1);
    expect((selected[0] as { id?: string }).id).to.equal('/notes/router/');
  });

  it('clear / close button 内の svg click を button 操作として扱うこと', async () => {
    const dialog = appendDialogFixture();
    const input = dialog.querySelector<HTMLInputElement>('[data-search-dialog-input]');
    const closeRequests: unknown[] = [];
    const queries: unknown[] = [];
    document.addEventListener('search-dialog:close-request', (event) => {
      closeRequests.push((event as CustomEvent).detail);
    }, { once: true });
    document.addEventListener('search-dialog:query-change', (event) => {
      queries.push((event as CustomEvent).detail);
    });
    enhanceSearchDialog(document);
    dispatchSearchDialogEvent('search-dialog:open-request', { trigger: null, modality: undefined });
    await flushOperations();
    if (input) {
      input.value = 'router';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    dialog.querySelector('[data-search-dialog-clear] svg')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true }),
    );
    expect(input?.value).to.equal('');
    expect(queries.at(-1)).to.deep.equal({ query: '' });
    dialog.querySelector('[data-search-dialog-close]')?.replaceChildren(
      document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
    );
    dialog.querySelector('[data-search-dialog-close] svg')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true }),
    );
    expect(closeRequests).to.deep.equal([{ reason: 'close-button' }]);
  });

  it('close 操作は close-request に集約し、focus-return は close pipeline 完了後に一度だけ通知すること', async () => {
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({
        matches: query.includes('prefers-reduced-motion') ? false : originalMatchMedia.call(window, query).matches,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
    const dialog = appendDialogFixture();
    const trigger = document.createElement('button');
    trigger.dataset['searchDialogTrigger'] = '';
    document.body.append(trigger);
    const closeRequests: unknown[] = [];
    const focusReturns: unknown[] = [];

    document.addEventListener('search-dialog:close-request', (event) => {
      closeRequests.push((event as CustomEvent).detail);
    });
    document.addEventListener('search-dialog:focus-return', (event) => {
      focusReturns.push((event as CustomEvent).detail);
    });

    enhanceSearchDialog(document);
    dispatchSearchDialogEvent('search-dialog:open-request', { trigger, modality: 'pointer' });
    await flushOperations();
    dialog.querySelector<HTMLButtonElement>('[data-search-dialog-close]')?.click();
    await waitForCloseCompletion(dialog);

    expect(closeRequests).to.deep.equal([{ reason: 'close-button' }]);
    expect(dialog.open).to.equal(false);
    expect(dialog.hasAttribute('data-closing')).to.equal(false);
    expect(focusReturns).to.deep.equal([{ reason: 'close-button' }]);

    dispatchSearchDialogEvent('search-dialog:close-request', { reason: 'programmatic' });
    expect(focusReturns).to.deep.equal([{ reason: 'close-button' }]);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: originalMatchMedia,
    });
  });

  it('duplicate open-request は non-empty query の再検索を重複 dispatch しないこと', async () => {
    const dialog = appendDialogFixture();
    const input = dialog.querySelector<HTMLInputElement>('[data-search-dialog-input]');
    const queries: unknown[] = [];
    document.addEventListener('search-dialog:query-change', (event) => {
      queries.push((event as CustomEvent).detail);
    });
    if (input) input.value = ' router ';
    enhanceSearchDialog(document);
    dispatchSearchDialogEvent('search-dialog:open-request', { trigger: null, modality: 'keyboard' });
    await flushOperations();
    dispatchSearchDialogEvent('search-dialog:open-request', { trigger: null, modality: 'keyboard' });
    await flushOperations();
    expect(queries).to.deep.equal([{ query: ' router ' }]);
  });

  it('stale enhancer abort は新 controller と trigger binding を破棄しないこと', async () => {
    const dialog = appendDialogFixture();
    const trigger = document.createElement('button');
    trigger.dataset['searchDialogTrigger'] = '';
    document.body.append(trigger);
    const first = new AbortController();
    const second = new AbortController();
    const opens: unknown[] = [];
    document.addEventListener('search-dialog:open-request', (event) => {
      opens.push((event as CustomEvent).detail);
    });
    enhanceSearchDialog(document, first.signal);
    enhanceSearchDialog(document, second.signal);
    first.abort();
    trigger.click();
    await flushOperations();
    expect(opens).to.have.length(1);
    expect(dialog.open).to.equal(true);
  });

  it('non-dialog / disconnected root は enhance せず、dispose は body lock と open state を cleanup すること', async () => {
    const invalid = document.createElement('div');
    invalid.dataset['searchDialogRoot'] = '';
    document.body.append(invalid);
    enhanceSearchDialog(document);
    dispatchSearchDialogEvent('search-dialog:open-request', { trigger: null, modality: undefined });
    await flushOperations();
    expect(invalid.hasAttribute('open')).to.equal(false);

    const disconnected = document.createElement('dialog');
    disconnected.dataset['searchDialogRoot'] = '';
    enhanceSearchDialog(disconnected);
    dispatchSearchDialogEvent('search-dialog:open-request', { trigger: null, modality: undefined });
    await flushOperations();
    expect(disconnected.open).to.equal(false);

    invalid.remove();
    const dialog = appendDialogFixture();
    const signal = new AbortController();
    enhanceSearchDialog(document, signal.signal);
    dispatchSearchDialogEvent('search-dialog:open-request', { trigger: null, modality: undefined });
    await flushOperations();
    expect(document.body.hasAttribute('data-ui-search-dialog-open')).to.equal(true);
    signal.abort();
    expect(dialog.open).to.equal(false);
    expect(document.body.hasAttribute('data-ui-search-dialog-open')).to.equal(false);
  });

  it('stale rows と raw query を selection に使わず trimmed current query を dispatch すること', async () => {
    const dialog = appendDialogFixture();
    const input = dialog.querySelector<HTMLInputElement>('[data-search-dialog-input]');
    const selected: unknown[] = [];
    document.addEventListener('search-dialog:selected', (event) => {
      selected.push((event as CustomEvent).detail);
    });
    enhanceSearchDialog(document);
    if (input) {
      input.value = ' router ';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    dispatchSearchDialogEvent('search-dialog:results-change', {
      query: 'router',
      items: [{
        id: '/notes/router/',
        title: 'Router',
        renderHref: '/notes/router/',
        canonicalPathname: '/notes/router/',
      }],
    });
    dialog.querySelector<HTMLElement>('[role="option"]')?.click();
    expect((selected[0] as { query?: string }).query).to.equal('router');
    if (input) {
      input.value = 'next';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    dialog.querySelector<HTMLElement>('[role="option"]')?.click();
    expect(selected).to.have.length(1);
  });

  it('external native close は新規 completion として cleanup し、既に closed の close event は軽い同期だけ行うこと', async () => {
    const dialog = appendDialogFixture();
    const trigger = document.createElement('button');
    trigger.dataset['searchDialogTrigger'] = '';
    document.body.append(trigger);
    const focusReturns: unknown[] = [];
    document.addEventListener('search-dialog:focus-return', (event) => {
      focusReturns.push((event as CustomEvent).detail);
    });
    enhanceSearchDialog(document);
    dispatchSearchDialogEvent('search-dialog:open-request', { trigger, modality: 'pointer' });
    await flushOperations();

    await waitForNativeClose(dialog, () => dialog.close());

    expect(document.body.hasAttribute('data-ui-search-dialog-open')).to.equal(false);
    expect(trigger.getAttribute('aria-expanded')).to.equal('false');
    expect(focusReturns).to.deep.equal([{ reason: 'programmatic' }]);

    dialog.setAttribute('data-closing', 'true');
    trigger.setAttribute('aria-expanded', 'true');
    dialog.dispatchEvent(new Event('close'));

    expect(dialog.hasAttribute('data-closing')).to.equal(false);
    expect(trigger.getAttribute('aria-expanded')).to.equal('false');
    expect(focusReturns).to.deep.equal([{ reason: 'programmatic' }]);
  });

  it('close completion guard は close operation ごとに reset され、再 open 後の external native close も cleanup すること', async () => {
    const dialog = appendDialogFixture();
    const trigger = document.createElement('button');
    trigger.dataset['searchDialogTrigger'] = '';
    document.body.append(trigger);
    const focusReturns: unknown[] = [];
    document.addEventListener('search-dialog:focus-return', (event) => {
      focusReturns.push((event as CustomEvent).detail);
    });
    enhanceSearchDialog(document);

    dispatchSearchDialogEvent('search-dialog:open-request', { trigger, modality: 'keyboard' });
    await flushOperations();
    dispatchSearchDialogEvent('search-dialog:close-request', { reason: 'programmatic' });
    await waitForCloseCompletion(dialog);

    dispatchSearchDialogEvent('search-dialog:open-request', { trigger, modality: 'pointer' });
    await flushOperations();
    await waitForNativeClose(dialog, () => dialog.close());

    expect(document.body.hasAttribute('data-ui-search-dialog-open')).to.equal(false);
    expect(trigger.getAttribute('aria-expanded')).to.equal('false');
    expect(focusReturns).to.deep.equal([
      { reason: 'programmatic' },
      { reason: 'programmatic' },
    ]);
  });

  it('dispose 中と dispose 後の native close / pending completion は focus-return を発生させないこと', async () => {
    const dialog = appendDialogFixture();
    const trigger = document.createElement('button');
    trigger.dataset['searchDialogTrigger'] = '';
    document.body.append(trigger);
    const focusReturns: unknown[] = [];
    document.addEventListener('search-dialog:focus-return', (event) => {
      focusReturns.push((event as CustomEvent).detail);
    });
    const signal = new AbortController();
    enhanceSearchDialog(document, signal.signal);
    dispatchSearchDialogEvent('search-dialog:open-request', { trigger, modality: 'keyboard' });
    await flushOperations();
    dispatchSearchDialogEvent('search-dialog:close-request', { reason: 'programmatic' });

    signal.abort();
    dialog.dispatchEvent(new Event('close'));
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    await flushOperations();

    expect(dialog.open).to.equal(false);
    expect(dialog.hasAttribute('open')).to.equal(false);
    expect(dialog.hasAttribute('data-closing')).to.equal(false);
    expect(document.body.hasAttribute('data-ui-search-dialog-open')).to.equal(false);
    expect(trigger.getAttribute('aria-expanded')).to.equal('false');
    expect(focusReturns).to.deep.equal([]);
  });

  it('virtualization は visible range spacer と range 外 active option の aria-activedescendant を同期すること', () => {
    const dialog = appendDialogFixture();
    const input = dialog.querySelector<HTMLInputElement>('[data-search-dialog-input]');
    const results = dialog.querySelector<HTMLUListElement>('[data-search-dialog-results]');
    if (!input || !results) throw new Error('search dialog fixture is invalid');
    Object.defineProperty(results, 'clientHeight', { configurable: true, value: 96 });
    enhanceSearchDialog(document);
    dispatchSearchDialogEvent('search-dialog:query-change', { query: 'result' });
    dispatchSearchDialogEvent('search-dialog:results-change', {
      query: 'result',
      items: Array.from({ length: 150 }, (_, index) => createResultItem(index)),
    });

    expect(results.querySelectorAll('[role="option"]')).to.have.length.lessThan(150);
    expect(results.querySelector('.search-dialog__virtual-spacer[role="presentation"][aria-hidden="true"]')).to
      .not.equal(null);

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));

    expect(input.getAttribute('aria-activedescendant')).to.equal('search-option-/notes/result-149/');
    expect(results.contains(document.getElementById('search-option-/notes/result-149/'))).to.equal(true);
    expect(results.querySelector<HTMLElement>('.search-dialog__virtual-spacer')?.style.blockSize).to
      .not.equal('0px');

    for (let index = 0; index < 70; index += 1) {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    }
    const spacers = [...results.querySelectorAll<HTMLElement>('.search-dialog__virtual-spacer')];
    expect(spacers).to.have.length(2);
    expect(spacers.every((spacer) => spacer.getAttribute('role') === 'presentation')).to.equal(true);
    expect(spacers.every((spacer) => spacer.getAttribute('aria-hidden') === 'true')).to.equal(true);
    expect(spacers.every((spacer) => spacer.style.blockSize.endsWith('px'))).to.equal(true);
  });

  it('live region は exact text と unavailable 優先順位を維持し、query change で旧 count を消すこと', () => {
    const dialog = appendDialogFixture();
    const liveRegion = dialog.querySelector<HTMLElement>('[data-search-dialog-status]');
    if (!liveRegion) throw new Error('search dialog fixture is invalid');
    enhanceSearchDialog(document);

    expect(liveRegion.textContent).to.equal(SEARCH_DIALOG_STATUS_IDLE_MESSAGE);
    dispatchSearchDialogEvent('search-dialog:loading-change', { loading: true });
    expect(liveRegion.textContent).to.equal(SEARCH_DIALOG_STATUS_LOADING_MESSAGE);
    dispatchSearchDialogEvent('search-dialog:results-change', {
      query: '',
      items: [],
    });
    dispatchSearchDialogEvent('search-dialog:query-change', { query: 'router' });
    dispatchSearchDialogEvent('search-dialog:results-change', {
      query: 'router',
      items: [createResultItem(0), createResultItem(1)],
    });
    expect(liveRegion.textContent).to.equal(createSearchDialogResultsStatusMessage(2));

    dispatchSearchDialogEvent('search-dialog:query-change', { query: 'next' });
    expect(liveRegion.textContent).to.equal(SEARCH_DIALOG_STATUS_IDLE_MESSAGE);
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
});
