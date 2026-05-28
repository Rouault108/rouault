import {
  dispatchSearchDialogEvent,
  type SearchDialogCloseRequestDetail,
  type SearchDialogOpenRequestDetail,
  type SearchDialogResultsChangeDetail,
  type SearchDialogSelectedDetail,
} from '../../search/search-dialog-events.js';
import { BODY_SEARCH_DIALOG_OPEN_ATTRIBUTE } from '../../search/search-dialog-constants.js';
import {
  resolveSearchDialogItemPath,
  splitSearchDialogHighlightParts,
} from '../../search/search-dialog-highlight.js';
import type { SearchDialogCloseReason, SearchDialogItem } from '../../search/search-dialog-types.js';

interface SearchDialogRootElement extends HTMLElement {
  close?(): void;
  showModal?(): void;
  open?: boolean;
}

interface SearchDialogSession {
  readonly signal: AbortSignal | undefined;
}

const triggerSessions = new WeakMap<HTMLElement, SearchDialogSession>();
const dialogSessions = new WeakMap<SearchDialogRootElement, SearchDialogSession>();

let activeSearchDialogTrigger: HTMLElement | null = null;
let closePipelineState:
  | {
      readonly dialog: SearchDialogRootElement;
      readonly reason: SearchDialogCloseReason;
      readonly timeoutId: number | undefined;
    }
  | null = null;
let latestItems: readonly SearchDialogItem[] = [];
let activeIndex = -1;
let latestQuery = '';

const isDialogOpen = (dialog: SearchDialogRootElement): boolean =>
  dialog.open === true || dialog.hasAttribute('open');

const getSearchDialogInput = (dialog: SearchDialogRootElement): HTMLInputElement | null =>
  dialog.querySelector<HTMLInputElement>('[data-search-dialog-input]');

const setElementHidden = (element: Element | null, hidden: boolean): void => {
  if (element instanceof HTMLElement) {
    element.hidden = hidden;
  }
};

const syncSearchTriggerExpanded = (expanded: boolean): void => {
  for (const trigger of document.querySelectorAll<HTMLElement>('[data-search-dialog-trigger]')) {
    trigger.setAttribute('aria-expanded', String(expanded));
  }
  if (activeSearchDialogTrigger?.isConnected === true) {
    activeSearchDialogTrigger.setAttribute('aria-expanded', String(expanded));
  }
};

const setSearchDialogStatus = (dialog: SearchDialogRootElement, message: string): void => {
  const status =
    dialog.querySelector<HTMLElement>('[data-search-dialog-status]') ??
    dialog.querySelector<HTMLElement>('[data-search-dialog-live]');
  if (status) {
    status.textContent = message;
  }
};

const syncSearchDialogClearButton = (dialog: SearchDialogRootElement): void => {
  const input = getSearchDialogInput(dialog);
  const clear = dialog.querySelector<HTMLButtonElement>('[data-search-dialog-clear]');
  if (clear) {
    clear.hidden = input?.value.length === 0;
  }
};

const resetSearchDialogActiveOption = (dialog: SearchDialogRootElement): void => {
  getSearchDialogInput(dialog)?.removeAttribute('aria-activedescendant');
  for (const option of dialog.querySelectorAll<HTMLElement>('[role="option"]')) {
    option.setAttribute('aria-selected', 'false');
    option.removeAttribute('data-active');
  }
};

const clearSearchDialogResults = (dialog: SearchDialogRootElement): void => {
  dialog.querySelector<HTMLOListElement>('[data-search-dialog-results]')?.replaceChildren();
  latestItems = [];
  activeIndex = -1;
  resetSearchDialogActiveOption(dialog);
};

const setSearchDialogState = (
  dialog: SearchDialogRootElement,
  state: 'idle' | 'loading' | 'results' | 'empty' | 'error' | 'unavailable',
  message?: string,
): void => {
  const input = getSearchDialogInput(dialog);
  setElementHidden(dialog.querySelector('[data-search-dialog-loading]'), state !== 'loading');
  setElementHidden(dialog.querySelector('[data-search-dialog-empty]'), state !== 'empty');
  setElementHidden(dialog.querySelector('[data-search-dialog-error]'), state !== 'error');
  setElementHidden(
    dialog.querySelector('[data-search-dialog-unavailable]'),
    state !== 'unavailable',
  );
  input?.setAttribute(
    'aria-expanded',
    state === 'results' || state === 'empty' || state === 'loading' ? 'true' : 'false',
  );
  input?.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
  if (state === 'error') {
    const error = dialog.querySelector<HTMLElement>('[data-search-dialog-error-message]');
    if (error && message) {
      error.textContent = message;
    }
  }
  if (state === 'unavailable') {
    const unavailable = dialog.querySelector<HTMLElement>(
      '[data-search-dialog-unavailable-message]',
    );
    if (unavailable && message) {
      unavailable.textContent = message;
    }
  }
};

const resetDialogSearch = (dialog: SearchDialogRootElement): void => {
  latestQuery = '';
  clearSearchDialogResults(dialog);
  setSearchDialogState(dialog, 'idle');
  setSearchDialogStatus(dialog, 'キーワードを入力して検索できます。');
  syncSearchDialogClearButton(dialog);
};

const appendHighlightedText = (target: HTMLElement, text: string, query: string): void => {
  for (const part of splitSearchDialogHighlightParts(text, query)) {
    if (!part.matched) {
      target.append(document.createTextNode(part.text));
      continue;
    }
    const mark = document.createElement('mark');
    mark.dataset['highlight'] = 'true';
    mark.textContent = part.text;
    target.append(mark);
  }
};

const renderSearchDialogItems = (
  dialog: SearchDialogRootElement,
  items: readonly SearchDialogItem[],
  query: string,
): void => {
  const results = dialog.querySelector<HTMLOListElement>('[data-search-dialog-results]');
  if (!results) {
    return;
  }
  results.replaceChildren();
  latestItems = items;
  activeIndex = -1;
  resetSearchDialogActiveOption(dialog);
  items.forEach((item, index) => {
    const row = document.createElement('li');
    row.id = `search-dialog-option-${String(index)}`;
    row.className = 'search-dialog__result';
    row.setAttribute('role', 'option');
    row.setAttribute('aria-selected', 'false');
    row.tabIndex = -1;
    row.dataset['index'] = String(index);
    row.dataset['id'] = item.id;
    row.dataset['renderHref'] = item.renderHref;
    row.dataset['canonicalPathname'] = item.canonicalPathname;
    row.dataset['searchQuery'] = query;

    const title = document.createElement('span');
    title.className = 'search-dialog__result-title';
    appendHighlightedText(title, item.title, query);
    const path = document.createElement('span');
    path.className = 'search-dialog__result-path';
    appendHighlightedText(path, resolveSearchDialogItemPath(item), query);
    row.append(title, path);
    results.append(row);
  });
};

const requestSearchDialogOpen = (
  dialog: SearchDialogRootElement,
  detail: SearchDialogOpenRequestDetail,
): void => {
  if (detail.trigger instanceof HTMLElement) {
    activeSearchDialogTrigger = detail.trigger;
  }
  closePipelineState = null;
  dialog.removeAttribute('data-closing');
  document.body.setAttribute(BODY_SEARCH_DIALOG_OPEN_ATTRIBUTE, '');
  if (typeof dialog.showModal === 'function') {
    if (dialog.open !== true) {
      dialog.showModal();
    }
  } else {
    dialog.setAttribute('open', '');
  }
  syncSearchTriggerExpanded(true);
  getSearchDialogInput(dialog)?.focus();
};

const completeSearchDialogClose = (
  dialog: SearchDialogRootElement,
  reason: SearchDialogCloseReason,
): void => {
  if (typeof dialog.close === 'function' && dialog.open === true) {
    dialog.close();
  } else {
    dialog.removeAttribute('open');
  }
  dialog.removeAttribute('data-closing');
  syncSearchTriggerExpanded(false);
  document.body.removeAttribute(BODY_SEARCH_DIALOG_OPEN_ATTRIBUTE);
  if (reason !== 'selection' && activeSearchDialogTrigger?.isConnected === true) {
    activeSearchDialogTrigger.focus();
  }
  if (reason !== 'selection') {
    dispatchSearchDialogEvent('search-dialog:focus-return', { reason });
  }
  activeSearchDialogTrigger = null;
  closePipelineState = null;
};

const requestSearchDialogClose = (
  dialog: SearchDialogRootElement,
  detail: SearchDialogCloseRequestDetail,
): void => {
  if (
    !isDialogOpen(dialog) ||
    closePipelineState?.dialog === dialog ||
    dialog.hasAttribute('data-closing')
  ) {
    return;
  }

  const reason = detail.reason;
  dialog.setAttribute('data-closing', 'true');
  syncSearchTriggerExpanded(false);

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finish = (): void => {
    const state = closePipelineState;
    if (state?.timeoutId !== undefined) {
      window.clearTimeout(state.timeoutId);
    }
    completeSearchDialogClose(dialog, state?.reason ?? reason);
  };
  const timeoutId = prefersReducedMotion ? undefined : window.setTimeout(finish, 180);
  closePipelineState = { dialog, reason, timeoutId };
  if (prefersReducedMotion) {
    finish();
    return;
  }
  dialog.addEventListener('animationend', finish, { once: true });
};

const setActiveOption = (dialog: SearchDialogRootElement, index: number): void => {
  const options = [...dialog.querySelectorAll<HTMLElement>('[role="option"]')];
  if (options.length === 0) {
    activeIndex = -1;
    resetSearchDialogActiveOption(dialog);
    return;
  }
  activeIndex = ((index % options.length) + options.length) % options.length;
  for (const [optionIndex, option] of options.entries()) {
    const active = optionIndex === activeIndex;
    option.setAttribute('aria-selected', String(active));
    if (active) {
      option.dataset['active'] = 'true';
      getSearchDialogInput(dialog)?.setAttribute('aria-activedescendant', option.id);
      option.scrollIntoView({ block: 'nearest' });
    } else {
      option.removeAttribute('data-active');
    }
  }
};

const selectDialogItem = (
  dialog: SearchDialogRootElement,
  index: number,
  selectionMethod: SearchDialogSelectedDetail['selectionMethod'],
): void => {
  const item = latestItems[index];
  if (!item) {
    return;
  }
  dispatchSearchDialogEvent('search-dialog:selected', {
    id: item.id,
    renderHref: item.renderHref,
    canonicalPathname: item.canonicalPathname,
    title: item.title,
    query: getSearchDialogInput(dialog)?.value ?? latestQuery,
    index,
    item,
    selectionMethod,
  });
  dispatchSearchDialogEvent('search-dialog:close-request', { reason: 'selection' });
};

const dispatchCloseRequest = (reason: SearchDialogCloseReason): void => {
  dispatchSearchDialogEvent('search-dialog:close-request', { reason });
};

const bindSearchDialog = (
  dialog: SearchDialogRootElement,
  signal: AbortSignal | undefined,
): void => {
  const listenerOptions = signal ? { signal } : undefined;

  dialog.querySelector<HTMLFormElement>('[data-search-dialog-form]')?.addEventListener(
    'submit',
    (event) => {
      event.preventDefault();
    },
    listenerOptions,
  );

  dialog.addEventListener(
    'input',
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }
      latestQuery = target.value;
      syncSearchDialogClearButton(dialog);
      dispatchSearchDialogEvent('search-dialog:query-change', { query: target.value });
    },
    listenerOptions,
  );

  dialog.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('[data-search-dialog-close]')) {
        dispatchCloseRequest('close-button');
        return;
      }
      if (target instanceof HTMLElement && target.closest('[data-search-dialog-clear]')) {
        const input = getSearchDialogInput(dialog);
        if (input) {
          input.value = '';
          resetDialogSearch(dialog);
          input.focus();
          dispatchSearchDialogEvent('search-dialog:query-change', { query: '' });
        }
        return;
      }
      const option =
        target instanceof HTMLElement ? target.closest<HTMLElement>('[role="option"]') : null;
      if (option?.dataset['index']) {
        selectDialogItem(dialog, Number.parseInt(option.dataset['index'], 10), 'pointer');
      }
    },
    listenerOptions,
  );

  dialog.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveOption(dialog, activeIndex + 1);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveOption(dialog, activeIndex - 1);
        return;
      }
      if (event.key === 'Enter') {
        if (activeIndex >= 0) {
          event.preventDefault();
          selectDialogItem(dialog, activeIndex, 'keyboard');
        }
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        dispatchCloseRequest('escape');
      }
    },
    listenerOptions,
  );

  dialog.addEventListener(
    'cancel',
    (event) => {
      event.preventDefault();
      dispatchCloseRequest('escape');
    },
    listenerOptions,
  );

  dialog.addEventListener(
    'pointerdown',
    (event) => {
      if (event.target !== dialog) {
        return;
      }
      const rect = dialog.getBoundingClientRect();
      const outside =
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom;
      if (outside) {
        dispatchCloseRequest('backdrop');
      }
    },
    listenerOptions,
  );

  dialog.addEventListener(
    'close',
    () => {
      syncSearchTriggerExpanded(false);
    },
    listenerOptions,
  );

  document.addEventListener(
    'search-dialog:open-request',
    (event) => {
      requestSearchDialogOpen(dialog, (event as CustomEvent<SearchDialogOpenRequestDetail>).detail);
    },
    listenerOptions,
  );
  document.addEventListener(
    'search-dialog:close-request',
    (event) => {
      requestSearchDialogClose(
        dialog,
        (event as CustomEvent<SearchDialogCloseRequestDetail>).detail,
      );
    },
    listenerOptions,
  );
  document.addEventListener(
    'search-dialog:loading-change',
    (event) => {
      const detail = (event as CustomEvent<{ loading: boolean }>).detail;
      if (detail.loading) {
        clearSearchDialogResults(dialog);
        setSearchDialogState(dialog, 'loading');
        setSearchDialogStatus(dialog, '検索しています...');
      } else {
        setSearchDialogState(dialog, 'idle');
      }
    },
    listenerOptions,
  );
  document.addEventListener(
    'search-dialog:results-change',
    (event) => {
      const detail = (event as CustomEvent<SearchDialogResultsChangeDetail>).detail;
      latestQuery = detail.query;
      renderSearchDialogItems(dialog, detail.items, detail.query);
      setSearchDialogState(dialog, detail.items.length > 0 ? 'results' : 'empty');
      setSearchDialogStatus(
        dialog,
        detail.items.length > 0
          ? `${detail.items.length.toString()} 件の結果`
          : '一致するメモが見つかりません。',
      );
    },
    listenerOptions,
  );
  document.addEventListener(
    'search-dialog:unavailable',
    (event) => {
      const detail = (event as CustomEvent<{ message: string }>).detail;
      clearSearchDialogResults(dialog);
      setSearchDialogState(dialog, 'unavailable', detail.message);
      setSearchDialogStatus(dialog, detail.message);
      syncSearchDialogClearButton(dialog);
    },
    listenerOptions,
  );
  document.addEventListener(
    'search-dialog:error',
    (event) => {
      const detail = (event as CustomEvent<{ message: string }>).detail;
      clearSearchDialogResults(dialog);
      setSearchDialogState(dialog, 'error', detail.message);
      setSearchDialogStatus(dialog, detail.message);
    },
    listenerOptions,
  );
};

export const enhanceSearchDialog = (root: ParentNode = document, signal?: AbortSignal): void => {
  if (signal?.aborted === true) {
    return;
  }
  const options = signal ? { signal } : undefined;
  for (const trigger of root.querySelectorAll<HTMLElement>('[data-search-dialog-trigger]')) {
    const existing = triggerSessions.get(trigger);
    if (existing && existing.signal?.aborted !== true) {
      continue;
    }
    if (existing?.signal?.aborted === true) {
      triggerSessions.delete(trigger);
    }
    trigger.addEventListener(
      'click',
      () => {
        dispatchSearchDialogEvent('search-dialog:open-request', {
          trigger,
          modality: undefined,
        });
      },
      options,
    );
    triggerSessions.set(trigger, { signal });
    signal?.addEventListener(
      'abort',
      () => {
        triggerSessions.delete(trigger);
      },
      { once: true },
    );
  }

  const dialog = root.querySelector<SearchDialogRootElement>('[data-search-dialog-root]');
  if (!dialog) {
    return;
  }
  const existing = dialogSessions.get(dialog);
  if (existing && existing.signal?.aborted !== true) {
    return;
  }
  if (existing?.signal?.aborted === true) {
    dialogSessions.delete(dialog);
  }
  dialogSessions.set(dialog, { signal });
  signal?.addEventListener(
    'abort',
    () => {
      dialogSessions.delete(dialog);
    },
    { once: true },
  );
  bindSearchDialog(dialog, signal);
};
