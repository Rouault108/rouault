import { SEARCH_DIALOG_LOADING_INDICATOR_DELAY_MS } from '../../../src/search/search-dialog-constants.js';
import { dispatchSearchDialogEvent } from '../../../src/search/search-dialog-events.js';
import type { SearchDialogItem } from '../../../src/search/search-dialog-types.js';

export const appendDialogFixture = (): HTMLDialogElement => {
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

export const flushOperations = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

export const openSearchDialogForTest = async (): Promise<void> => {
  dispatchSearchDialogEvent('search-dialog:open-request', {
    trigger: null,
    modality: undefined,
  });
  await flushOperations();
};

export const waitForLoadingIndicatorDelay = async (): Promise<void> => {
  await new Promise((resolve) =>
    window.setTimeout(resolve, SEARCH_DIALOG_LOADING_INDICATOR_DELAY_MS + 50),
  );
  await flushOperations();
};

export const waitForAnimationFrame = async (): Promise<void> => {
  await new Promise((resolve) => window.requestAnimationFrame(resolve));
  await flushOperations();
};

export const waitForNativeClose = async (
  dialog: HTMLDialogElement,
  close: () => void,
): Promise<void> => {
  const closeEvent = new Promise<void>((resolve) => {
    dialog.addEventListener('close', () => resolve(), { once: true });
  });
  close();
  await closeEvent;
  await flushOperations();
};

export const createResultItem = (index: number): SearchDialogItem => ({
  id: `/notes/result-${index.toString()}/`,
  title: `Result ${index.toString()}`,
  renderHref: `/notes/result-${index.toString()}/`,
  canonicalPathname: `/notes/result-${index.toString()}/`,
});

export const installMockScrollTop = (element: HTMLElement): void => {
  let scrollTop = 0;
  Object.defineProperty(element, 'scrollTop', {
    configurable: true,
    get: () => scrollTop,
    set: (nextScrollTop: number) => {
      scrollTop = nextScrollTop;
    },
  });
};

export const waitForCloseCompletion = async (dialog: HTMLDialogElement): Promise<void> => {
  for (
    let attempt = 0;
    attempt < 20 && (dialog.open || dialog.hasAttribute('data-closing'));
    attempt += 1
  ) {
    await new Promise((resolve) => window.setTimeout(resolve, 20));
  }
  await flushOperations();
};
