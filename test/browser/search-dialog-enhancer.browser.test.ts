import { afterEach, describe, expect, it } from 'vitest';

import { enhanceSearchDialog } from '../../src/client/post-hydrate/search-dialog-enhancer.js';
import {
  SEARCH_DIALOG_LOADING_INDICATOR_DELAY_MS,
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

const openSearchDialogForTest = async (): Promise<void> => {
  dispatchSearchDialogEvent('search-dialog:open-request', {
    trigger: null,
    modality: undefined,
  });
  await flushOperations();
};

const waitForLoadingIndicatorDelay = async (): Promise<void> => {
  await new Promise((resolve) =>
    window.setTimeout(resolve, SEARCH_DIALOG_LOADING_INDICATOR_DELAY_MS + 50),
  );
  await flushOperations();
};

const waitForAnimationFrame = async (): Promise<void> => {
  await new Promise((resolve) => window.requestAnimationFrame(resolve));
  await flushOperations();
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

const installMockScrollTop = (element: HTMLElement): void => {
  let scrollTop = 0;
  Object.defineProperty(element, 'scrollTop', {
    configurable: true,
    get: () => scrollTop,
    set: (nextScrollTop: number) => {
      scrollTop = nextScrollTop;
    },
  });
};

const waitForCloseCompletion = async (dialog: HTMLDialogElement): Promise<void> => {
  for (
    let attempt = 0;
    attempt < 20 && (dialog.open || dialog.hasAttribute('data-closing'));
    attempt += 1
  ) {
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
    const trigger = document.createElement('a');
    trigger.href = '/search/';
    trigger.dataset['searchDialogTrigger'] = '';
    document.body.append(trigger);

    enhanceSearchDialog(document);

    document.dispatchEvent(
      new CustomEvent('open-search-dialog', { bubbles: true, composed: true }),
    );
    expect(dialog.open).to.equal(false);

    dispatchSearchDialogEvent('search-dialog:open-request', { trigger, modality: 'keyboard' });
    await flushOperations();
    expect(dialog.open).to.equal(true);
    expect(trigger.getAttribute('aria-expanded')).to.equal('true');
  });

  it('置換後の search link も delegation で開き、受付成功時だけ default を抑止すること', () => {
    const dialog = appendDialogFixture();
    enhanceSearchDialog(document);
    const trigger = document.createElement('a');
    trigger.href = '/search/';
    trigger.dataset['searchDialogTrigger'] = '';
    trigger.dataset['noRouter'] = '';
    document.body.append(trigger);
    const accepted = trigger.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    );
    expect(accepted).to.equal(false);
    expect(dialog.open).to.equal(true);

    document.body.replaceChildren();
    const fallback = document.createElement('a');
    fallback.href = '#search-fallback';
    fallback.dataset['searchDialogTrigger'] = '';
    document.body.append(fallback);
    enhanceSearchDialog(document);
    expect(
      fallback.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })),
    ).to.equal(true);
  });

  it('runtime unavailable では data-no-router 付き search link の通常遷移を抑止しないこと', () => {
    const dialog = appendDialogFixture();
    enhanceSearchDialog(document);
    dispatchSearchDialogEvent('search-dialog:unavailable', { message: 'unavailable' });
    const trigger = document.createElement('a');
    trigger.href = '#search-fallback';
    trigger.dataset['searchDialogTrigger'] = '';
    trigger.dataset['noRouter'] = '';
    document.body.append(trigger);
    let openRequestCount = 0;
    document.addEventListener('search-dialog:open-request', () => {
      openRequestCount += 1;
    });

    const accepted = trigger.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    );

    expect(accepted).to.equal(true);
    expect(dialog.open).to.equal(false);
    expect(openRequestCount).to.equal(0);
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
    expect(dialog.querySelector<HTMLElement>('[data-search-dialog-loading]')?.hidden).to.equal(
      true,
    );

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
    expect(dialog.querySelector<HTMLElement>('[data-search-dialog-loading]')?.hidden).to.equal(
      true,
    );
    const option = dialog.querySelector<HTMLElement>('[role="option"]');
    expect(option?.textContent).to.contain('Router 設計メモ');
    expect(option?.dataset['itemId']).to.equal('/notes/router/');

    option?.click();
    expect(selected).to.have.length(1);
    expect((selected[0] as { id?: string }).id).to.equal('/notes/router/');
  });

  it('clear / close button 内の svg click を button 操作として扱うこと', async () => {
    const dialog = appendDialogFixture();
    const input = dialog.querySelector<HTMLInputElement>('[data-search-dialog-input]');
    const closeRequests: unknown[] = [];
    const queries: unknown[] = [];
    document.addEventListener(
      'search-dialog:close-request',
      (event) => {
        closeRequests.push((event as CustomEvent).detail);
      },
      { once: true },
    );
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
    dialog
      .querySelector('[data-search-dialog-clear] svg')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(input?.value).to.equal('');
    expect(queries.at(-1)).to.deep.equal({ query: '' });
    dialog
      .querySelector('[data-search-dialog-close]')
      ?.replaceChildren(document.createElementNS('http://www.w3.org/2000/svg', 'svg'));
    dialog
      .querySelector('[data-search-dialog-close] svg')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(closeRequests).to.deep.equal([{ reason: 'close-button' }]);
  });

  it('close 操作は close-request に集約し、focus-return は close pipeline 完了後に一度だけ通知すること', async () => {
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({
        matches: query.includes('prefers-reduced-motion')
          ? false
          : originalMatchMedia.call(window, query).matches,
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
    dispatchSearchDialogEvent('search-dialog:open-request', {
      trigger: null,
      modality: 'keyboard',
    });
    await flushOperations();
    dispatchSearchDialogEvent('search-dialog:open-request', {
      trigger: null,
      modality: 'keyboard',
    });
    await flushOperations();
    expect(queries).to.deep.equal([{ query: ' router ' }]);
  });

  it('close-request 直後の open-request は破棄し、close 完了後に自動 reopen しないこと', async () => {
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
    dispatchSearchDialogEvent('search-dialog:open-request', { trigger, modality: 'pointer' });
    await waitForCloseCompletion(dialog);

    expect(dialog.open).to.equal(false);
    expect(document.body.hasAttribute('data-ui-search-dialog-open')).to.equal(false);
    expect(focusReturns).to.deep.equal([{ reason: 'programmatic' }]);
  });

  it('data-closing 中の open-request は破棄し、close completion 後の通常 reopen は成功すること', async () => {
    const dialog = appendDialogFixture();
    const trigger = document.createElement('button');
    trigger.dataset['searchDialogTrigger'] = '';
    document.body.append(trigger);
    enhanceSearchDialog(document);
    dispatchSearchDialogEvent('search-dialog:open-request', { trigger, modality: 'keyboard' });
    await flushOperations();

    const animation = dialog.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 60 });
    dispatchSearchDialogEvent('search-dialog:close-request', { reason: 'programmatic' });
    await flushOperations();
    expect(dialog.hasAttribute('data-closing')).to.equal(true);
    dispatchSearchDialogEvent('search-dialog:open-request', { trigger, modality: 'pointer' });
    await animation.finished;
    await waitForCloseCompletion(dialog);
    expect(dialog.open).to.equal(false);

    dispatchSearchDialogEvent('search-dialog:open-request', { trigger, modality: 'pointer' });
    await flushOperations();
    expect(dialog.open).to.equal(true);
  });

  it('duplicate Escape close-request を抑止しても次回 Escape close が stuck しないこと', async () => {
    const dialog = appendDialogFixture();
    enhanceSearchDialog(document);
    dispatchSearchDialogEvent('search-dialog:open-request', {
      trigger: null,
      modality: 'keyboard',
    });
    await flushOperations();

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    dispatchSearchDialogEvent('search-dialog:close-request', { reason: 'escape' });
    await waitForCloseCompletion(dialog);
    expect(dialog.open).to.equal(false);

    dispatchSearchDialogEvent('search-dialog:open-request', {
      trigger: null,
      modality: 'keyboard',
    });
    await flushOperations();
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await waitForCloseCompletion(dialog);
    expect(dialog.open).to.equal(false);
  });

  it('closed dialog の no-op close-request は直後の通常 open-request を阻害しないこと', async () => {
    const dialog = appendDialogFixture();
    enhanceSearchDialog(document);

    dispatchSearchDialogEvent('search-dialog:close-request', { reason: 'programmatic' });
    dispatchSearchDialogEvent('search-dialog:open-request', {
      trigger: null,
      modality: 'keyboard',
    });
    await flushOperations();

    expect(dialog.open).to.equal(true);
  });

  it('stale enhancer abort は新 controller と trigger binding を破棄しないこと', async () => {
    const dialog = appendDialogFixture();
    const trigger = document.createElement('a');
    trigger.href = '/search/';
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
    expect(opens).to.have.length(0);
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
      items: [
        {
          id: '/notes/router/',
          title: 'Router',
          renderHref: '/notes/router/',
          canonicalPathname: '/notes/router/',
        },
      ],
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
    expect(focusReturns).to.deep.equal([{ reason: 'programmatic' }, { reason: 'programmatic' }]);
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

  it('100件以下の結果では scroll しても上端へ戻らないこと', async () => {
    const dialog = appendDialogFixture();
    const input = dialog.querySelector<HTMLInputElement>('[data-search-dialog-input]');
    const results = dialog.querySelector<HTMLUListElement>('[data-search-dialog-results]');
    if (!input || !results) throw new Error('search dialog fixture is invalid');
    Object.defineProperty(results, 'clientHeight', { configurable: true, value: 96 });
    installMockScrollTop(results);
    results.style.blockSize = '96px';
    results.style.overflow = 'auto';
    enhanceSearchDialog(document);
    dispatchSearchDialogEvent('search-dialog:query-change', { query: 'result' });
    dispatchSearchDialogEvent('search-dialog:results-change', {
      query: 'result',
      items: Array.from({ length: 100 }, (_, index) => createResultItem(index)),
    });
    await waitForAnimationFrame();

    results.scrollTop = 240;
    results.dispatchEvent(new Event('scroll'));

    expect(results.scrollTop).to.equal(240);
    expect(input.getAttribute('aria-activedescendant')).to.equal('search-option-/notes/result-0/');
  });

  it('non-virtualized keyboard navigation は active option を viewport 内へ scroll し、focus を input に保つこと', async () => {
    const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

    try {
      const dialog = appendDialogFixture();
      const input = dialog.querySelector<HTMLInputElement>('[data-search-dialog-input]');
      const results = dialog.querySelector<HTMLUListElement>('[data-search-dialog-results]');
      if (!input || !results) throw new Error('search dialog fixture is invalid');
      Object.defineProperty(results, 'clientHeight', { configurable: true, value: 96 });
      installMockScrollTop(results);
      HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect(): DOMRect {
        if (this === results) return new DOMRect(0, 0, 320, 96);
        if (this instanceof HTMLElement && this.getAttribute('role') === 'option') {
          const index = Number(this.dataset['index'] ?? '0');
          const top = index * 32 - results.scrollTop;
          return new DOMRect(0, top, 320, 32);
        }
        return originalGetBoundingClientRect.call(this);
      };
      enhanceSearchDialog(document);
      dispatchSearchDialogEvent('search-dialog:open-request', {
        trigger: null,
        modality: 'keyboard',
      });
      await flushOperations();
      dispatchSearchDialogEvent('search-dialog:query-change', { query: 'result' });
      dispatchSearchDialogEvent('search-dialog:results-change', {
        query: 'result',
        items: Array.from({ length: 12 }, (_, index) => createResultItem(index)),
      });
      await waitForAnimationFrame();

      input.focus();
      expect(document.activeElement).to.equal(input);

      for (let count = 0; count < 4; count += 1) {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        expect(document.activeElement).to.equal(input);
      }

      expect(input.getAttribute('aria-activedescendant')).to.equal(
        'search-option-/notes/result-4/',
      );
      expect(
        results.querySelector<HTMLElement>('[aria-selected="true"]')?.dataset['index'],
      ).to.equal('4');
      expect(results.scrollTop).to.equal(64);

      for (let count = 0; count < 3; count += 1) {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
        expect(document.activeElement).to.equal(input);
      }

      expect(input.getAttribute('aria-activedescendant')).to.equal(
        'search-option-/notes/result-1/',
      );
      expect(
        results.querySelector<HTMLElement>('[aria-selected="true"]')?.dataset['index'],
      ).to.equal('1');
      expect(results.scrollTop).to.equal(32);
      expect(results.querySelectorAll('[role="option"]')).to.have.length(12);
      expect(results.querySelector('.search-dialog__virtual-spacer')).to.equal(null);
    } finally {
      HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    }
  });

  it('virtualized passive scroll は旧 active 位置へ戻さず active と aria を解除すること', async () => {
    const dialog = appendDialogFixture();
    const input = dialog.querySelector<HTMLInputElement>('[data-search-dialog-input]');
    const results = dialog.querySelector<HTMLUListElement>('[data-search-dialog-results]');
    if (!input || !results) throw new Error('search dialog fixture is invalid');
    Object.defineProperty(results, 'clientHeight', { configurable: true, value: 96 });
    installMockScrollTop(results);
    enhanceSearchDialog(document);
    dispatchSearchDialogEvent('search-dialog:query-change', { query: 'result' });
    dispatchSearchDialogEvent('search-dialog:results-change', {
      query: 'result',
      items: Array.from({ length: 150 }, (_, index) => createResultItem(index)),
    });
    await waitForAnimationFrame();

    expect(results.querySelectorAll('[role="option"]')).to.have.length.lessThan(150);
    expect(
      results.querySelector(
        '.search-dialog__virtual-spacer[role="presentation"][aria-hidden="true"]',
      ),
    ).to.not.equal(null);

    results.scrollTop = 2400;
    results.dispatchEvent(new Event('scroll'));

    expect(results.scrollTop).to.equal(2400);
    expect(input.hasAttribute('aria-activedescendant')).to.equal(false);
    expect(results.querySelector('[aria-selected="true"]')).to.equal(null);
    expect(results.querySelector('[data-active="true"]')).to.equal(null);
  });

  it('active なし Enter は選択せず、passive scroll 後の ArrowDown/ArrowUp は視覚 viewport から再開すること', async () => {
    const dialog = appendDialogFixture();
    const input = dialog.querySelector<HTMLInputElement>('[data-search-dialog-input]');
    const results = dialog.querySelector<HTMLUListElement>('[data-search-dialog-results]');
    if (!input || !results) throw new Error('search dialog fixture is invalid');
    const selected: unknown[] = [];
    document.addEventListener('search-dialog:selected', (event) => {
      selected.push((event as CustomEvent).detail);
    });
    Object.defineProperty(results, 'clientHeight', { configurable: true, value: 96 });
    installMockScrollTop(results);
    enhanceSearchDialog(document);
    dispatchSearchDialogEvent('search-dialog:query-change', { query: 'result' });
    dispatchSearchDialogEvent('search-dialog:results-change', {
      query: 'result',
      items: Array.from({ length: 150 }, (_, index) => createResultItem(index)),
    });
    await waitForAnimationFrame();

    results.scrollTop = 2400;
    results.dispatchEvent(new Event('scroll'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(selected).to.deep.equal([]);

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(input.getAttribute('aria-activedescendant')).to.equal('search-option-/notes/result-50/');
    await waitForAnimationFrame();

    results.scrollTop = 2496;
    results.dispatchEvent(new Event('scroll'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(input.getAttribute('aria-activedescendant')).to.equal('search-option-/notes/result-53/');
  });

  it('keyboard navigation は active option を DOM に保持し、内部 scroll event を passive 扱いしないこと', async () => {
    const dialog = appendDialogFixture();
    const input = dialog.querySelector<HTMLInputElement>('[data-search-dialog-input]');
    const results = dialog.querySelector<HTMLUListElement>('[data-search-dialog-results]');
    if (!input || !results) throw new Error('search dialog fixture is invalid');
    Object.defineProperty(results, 'clientHeight', { configurable: true, value: 96 });
    installMockScrollTop(results);
    enhanceSearchDialog(document);
    dispatchSearchDialogEvent('search-dialog:query-change', { query: 'result' });
    dispatchSearchDialogEvent('search-dialog:results-change', {
      query: 'result',
      items: Array.from({ length: 150 }, (_, index) => createResultItem(index)),
    });
    await waitForAnimationFrame();

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(results.scrollTop).to.be.greaterThan(0);

    results.scrollTop = 0;
    results.dispatchEvent(new Event('scroll'));

    expect(input.getAttribute('aria-activedescendant')).to.equal(
      'search-option-/notes/result-149/',
    );
    expect(results.contains(document.getElementById('search-option-/notes/result-149/'))).to.equal(
      true,
    );
    expect(results.scrollTop).to.equal(0);
    expect(
      results.querySelector<HTMLElement>('.search-dialog__virtual-spacer')?.style.blockSize,
    ).to.not.equal('0px');
  });

  it('query 変更と results-change は scroll を reset し、旧 active と同じ ID が残っても先頭へ初期化すること', async () => {
    const dialog = appendDialogFixture();
    const input = dialog.querySelector<HTMLInputElement>('[data-search-dialog-input]');
    const results = dialog.querySelector<HTMLUListElement>('[data-search-dialog-results]');
    if (!input || !results) throw new Error('search dialog fixture is invalid');
    Object.defineProperty(results, 'clientHeight', { configurable: true, value: 96 });
    installMockScrollTop(results);
    enhanceSearchDialog(document);
    dispatchSearchDialogEvent('search-dialog:query-change', { query: 'result' });
    dispatchSearchDialogEvent('search-dialog:results-change', {
      query: 'result',
      items: Array.from({ length: 150 }, (_, index) => createResultItem(index)),
    });
    await waitForAnimationFrame();

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    results.scrollTop = 2400;
    results.dispatchEvent(new Event('scroll'));
    expect(results.scrollTop).to.equal(2400);

    dispatchSearchDialogEvent('search-dialog:query-change', { query: '' });
    expect(results.scrollTop).to.equal(0);

    dispatchSearchDialogEvent('search-dialog:query-change', { query: 'result' });
    dispatchSearchDialogEvent('search-dialog:results-change', {
      query: 'result',
      items: [createResultItem(10), createResultItem(1), createResultItem(2)],
    });
    expect(input.getAttribute('aria-activedescendant')).to.equal('search-option-/notes/result-10/');
  });

  it('passive scroll で range が不変なら virtual rows を再構築しないこと', async () => {
    const dialog = appendDialogFixture();
    const results = dialog.querySelector<HTMLUListElement>('[data-search-dialog-results]');
    if (!results) throw new Error('search dialog fixture is invalid');
    Object.defineProperty(results, 'clientHeight', { configurable: true, value: 96 });
    installMockScrollTop(results);
    enhanceSearchDialog(document);
    dispatchSearchDialogEvent('search-dialog:query-change', { query: 'result' });
    dispatchSearchDialogEvent('search-dialog:results-change', {
      query: 'result',
      items: Array.from({ length: 150 }, (_, index) => createResultItem(index)),
    });
    await waitForAnimationFrame();

    const originalReplaceChildren = results.replaceChildren.bind(results);
    let replaceChildrenCount = 0;
    results.replaceChildren = (...nodes: (Node | string)[]) => {
      replaceChildrenCount += 1;
      originalReplaceChildren(...nodes);
    };

    results.scrollTop = 10;
    results.dispatchEvent(new Event('scroll'));

    expect(replaceChildrenCount).to.equal(0);
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
