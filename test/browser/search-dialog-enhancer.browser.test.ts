import { expect } from '@open-wc/testing';

import { enhanceSearchDialog } from '../../src/client/post-hydrate/search-dialog-enhancer.js';
import { dispatchSearchDialogEvent } from '../../src/search/search-dialog-events.js';

const appendDialogFixture = (): HTMLDialogElement => {
  const dialog = document.createElement('dialog');
  dialog.id = 'global-search-dialog';
  dialog.dataset['searchDialogRoot'] = '';
  dialog.innerHTML = `
    <form data-search-dialog-form>
      <input data-search-dialog-input>
      <button type="button" data-search-dialog-clear hidden>clear</button>
      <button type="button" data-search-dialog-close>close</button>
    </form>
    <p data-search-dialog-status></p>
    <div data-search-dialog-loading hidden></div>
    <section data-search-dialog-empty hidden></section>
    <section data-search-dialog-error hidden><p data-search-dialog-error-message></p></section>
    <section data-search-dialog-unavailable hidden><p data-search-dialog-unavailable-message></p></section>
    <ol data-search-dialog-results></ol>
  `;
  document.body.append(dialog);
  return dialog;
};

describe('search-dialog-enhancer', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('open-request を受けて static dialog DOM を開き、legacy open event は listen しないこと', () => {
    const dialog = appendDialogFixture();
    const trigger = document.createElement('button');
    trigger.dataset['searchDialogTrigger'] = '';
    document.body.append(trigger);

    enhanceSearchDialog(document);

    document.dispatchEvent(new CustomEvent('open-search-dialog', { bubbles: true, composed: true }));
    expect(dialog.open).to.equal(false);

    dispatchSearchDialogEvent('search-dialog:open-request', { trigger, modality: 'keyboard' });
    expect(dialog.open).to.equal(true);
    expect(trigger.getAttribute('aria-expanded')).to.equal('true');
  });

  it('input / state / selection を static dialog event flow に同期すること', () => {
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

  it('close 操作は close-request に集約し、focus-return は close pipeline 完了後に一度だけ通知すること', () => {
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
    dialog.querySelector<HTMLButtonElement>('[data-search-dialog-close]')?.click();

    expect(closeRequests).to.deep.equal([{ reason: 'close-button' }]);
    expect(dialog.open).to.equal(true);
    expect(dialog.hasAttribute('data-closing')).to.equal(true);
    expect(focusReturns).to.deep.equal([]);

    dialog.dispatchEvent(new AnimationEvent('animationend'));
    expect(dialog.open).to.equal(false);
    expect(focusReturns).to.deep.equal([{ reason: 'close-button' }]);

    dispatchSearchDialogEvent('search-dialog:close-request', { reason: 'programmatic' });
    expect(focusReturns).to.deep.equal([{ reason: 'close-button' }]);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: originalMatchMedia,
    });
  });
});
