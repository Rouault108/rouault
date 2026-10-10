import { afterEach, describe, expect, it } from 'vitest';

import { enhanceSearchDialog } from '../../src/client/post-hydrate/search-dialog-enhancer.js';
import { dispatchSearchDialogEvent } from '../../src/search/search-dialog-events.js';
import {
  appendDialogFixture,
  flushOperations,
  waitForCloseCompletion,
  waitForNativeClose,
} from './helpers/search-dialog-test-fixture.js';

describe('search-dialog lifecycle', () => {
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
});
