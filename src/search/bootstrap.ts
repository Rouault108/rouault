import type {
  UiSearchDialogItem,
  UiSearchDialogCloseReason,
  UiSearchDialogSearchContext,
  UiSearchDialogSelectedDetail,
} from './search-dialog-types.js';
import {
  dispatchSearchReturnToReading,
  handleSearchReturnToReadingEvent,
} from './navigation.js';
import { createSearchCore, type SearchCore } from './search-core.js';
import { searchReturnToReadingEventName } from './search-navigation-events.js';
import type { SiteUrlContext } from '../../shared/site/site-url-context.js';
import type { RuntimeEnvironment } from '../../shared/runtime/runtime-environment.js';
import type { LoadedInternalDocumentRouteManifestState } from '../router/internal-document-route-manifest-loader.js';
import { buildSearchResultRenderHref } from './normalize-search-result-url.js';
import { createSearchArtifactUrlResolver } from '../../shared/search/search-artifact-url.js';
import { createSearchCanonicalPathname } from '../../shared/search/document-url.js';
import { createSearchEventDiagnosticSink } from '../../shared/search/search-diagnostics.js';
import {
  getSearchBootstrapUnavailableMessage,
  type SearchBootstrapUnavailableReason,
} from '../../shared/search/search-unavailable-reason.js';
import { BODY_SEARCH_DIALOG_OPEN_ATTRIBUTE } from './search-dialog-constants.js';

interface SearchDialogRootElement extends HTMLElement {
  close?(): void;
  showModal?(): void;
  open?: boolean;
}

let initialized = false;
let bootstrapListenerController: AbortController | null = null;
let initializedSearchCore: SearchCore | null = null;
let initializedSearchRoutePredicate: ((pathname: string) => boolean) | null = null;
let initializedSearchBootstrapState: SearchBootstrapState | null = null;
let activeSearchDialogTrigger: HTMLElement | null = null;
let closePipelineState:
  | {
      readonly reason: UiSearchDialogCloseReason;
      readonly timeoutId: number | undefined;
    }
  | null = null;

export type SearchBootstrapState =
  | {
      readonly status: 'ready';
      readonly searchCore: SearchCore;
      readonly isInternalDocumentPathname: (pathname: string) => boolean;
    }
  | { readonly status: 'unavailable'; readonly reason: SearchBootstrapUnavailableReason };

export type SearchBootstrapResult =
  | { readonly status: 'ready'; readonly searchCore: SearchCore }
  | { readonly status: 'unavailable'; readonly reason: SearchBootstrapUnavailableReason };

export interface InitSearchOptions {
  readonly runtimeEnvironment: RuntimeEnvironment;
  readonly siteUrlContext: SiteUrlContext;
  readonly routeManifestState: LoadedInternalDocumentRouteManifestState;
  readonly controller?: SearchCore;
}

export interface InitSearchUnavailableOptions {
  readonly runtimeEnvironment: RuntimeEnvironment;
  readonly siteUrlContext?: SiteUrlContext;
  readonly reason: SearchBootstrapUnavailableReason;
}

export class SearchBootstrapInitializationError extends Error {
  override readonly name = 'SearchBootstrapInitializationError';
}

const createRuntimeSearchCore = (options: {
  readonly runtimeEnvironment: RuntimeEnvironment;
  readonly siteUrlContext: SiteUrlContext;
  readonly isInternalDocumentPathname: (pathname: string) => boolean;
}): SearchCore =>
  createSearchCore({
    runtimeEnvironment: options.runtimeEnvironment,
    siteUrlContext: options.siteUrlContext,
    isInternalDocumentPathname: options.isInternalDocumentPathname,
    artifactUrlResolver: createSearchArtifactUrlResolver({ siteUrlContext: options.siteUrlContext }),
  });

export const getInitializedSearchBootstrapState = (): SearchBootstrapState | null =>
  initializedSearchBootstrapState;

export const getInitializedSearchCore = (): SearchCore | null =>
  initializedSearchBootstrapState?.status === 'ready'
    ? initializedSearchBootstrapState.searchCore
    : initializedSearchCore;

export const getInitializedSearchRoutePredicate = (): ((pathname: string) => boolean) | null =>
  initializedSearchBootstrapState?.status === 'ready'
    ? initializedSearchBootstrapState.isInternalDocumentPathname
    : initializedSearchRoutePredicate;

const assertSearchBootstrapNotInitialized = (): void => {
  if (initialized) {
    throw new SearchBootstrapInitializationError('Search bootstrap was already initialized.');
  }
};

const readOpenSearchDialogTrigger = (event: Event): HTMLElement | undefined => {
  const detail = event instanceof CustomEvent ? (event.detail as unknown) : null;
  if (
    detail !== null &&
    typeof detail === 'object' &&
    'trigger' in detail &&
    detail.trigger instanceof HTMLElement
  ) {
    return detail.trigger;
  }

  return event.target instanceof HTMLElement ? event.target : undefined;
};

const syncSearchTriggerExpanded = (expanded: boolean): void => {
  for (const trigger of document.querySelectorAll<HTMLElement>('[data-search-dialog-trigger]')) {
    trigger.setAttribute('aria-expanded', String(expanded));
  }
  if (activeSearchDialogTrigger?.isConnected === true) {
    activeSearchDialogTrigger.setAttribute('aria-expanded', String(expanded));
  }
};

const requestSearchDialogOpen = (
  dialog: SearchDialogRootElement,
  trigger?: HTMLElement,
): void => {
  if (trigger instanceof HTMLElement) {
    activeSearchDialogTrigger = trigger;
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
  dialog.querySelector<HTMLInputElement>('[data-search-dialog-input]')?.focus();
};

const dispatchSearchDialogFocusReturn = (
  reason: UiSearchDialogCloseReason,
): void => {
  document.dispatchEvent(
    new CustomEvent('search-dialog:focus-return', {
      detail: { reason },
      bubbles: false,
      composed: false,
      cancelable: false,
    }),
  );
};

const completeSearchDialogClose = (
  dialog: SearchDialogRootElement,
  reason: UiSearchDialogCloseReason,
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
    dispatchSearchDialogFocusReturn(reason);
  }
  activeSearchDialogTrigger = null;
  closePipelineState = null;
};

const requestSearchDialogClose = (
  dialog: SearchDialogRootElement,
  options: { reason?: UiSearchDialogCloseReason } = {},
): void => {
  if (!dialog.open && !dialog.hasAttribute('open')) {
    return;
  }
  if (closePipelineState !== null || dialog.hasAttribute('data-closing')) {
    return;
  }

  const reason = options.reason ?? 'programmatic';
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
  closePipelineState = { reason, timeoutId };
  if (prefersReducedMotion) {
    finish();
    return;
  }
  dialog.addEventListener('animationend', finish, { once: true });
};

const isTextEditingSearchShortcutTarget = (
  target: EventTarget | null,
  dialog: SearchDialogRootElement,
): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const isTextEditingTarget =
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement;
  if (!isTextEditingTarget) {
    return false;
  }

  return !(dialog.open !== true && dialog.contains(target));
};

const setSearchDialogStatus = (dialog: SearchDialogRootElement, message: string): void => {
  const status =
    dialog.querySelector<HTMLElement>('[data-search-dialog-status]') ??
    dialog.querySelector<HTMLElement>('[data-search-dialog-live]');
  if (status) {
    status.textContent = message;
  }
};

const setElementHidden = (element: Element | null, hidden: boolean): void => {
  if (element instanceof HTMLElement) {
    element.hidden = hidden;
  }
};

const getSearchDialogInput = (dialog: SearchDialogRootElement): HTMLInputElement | null =>
  dialog.querySelector<HTMLInputElement>('[data-search-dialog-input]');

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

const setSearchDialogState = (
  dialog: SearchDialogRootElement,
  state: 'idle' | 'loading' | 'results' | 'empty' | 'error' | 'unavailable',
  message?: string,
): void => {
  const input = getSearchDialogInput(dialog);
  setElementHidden(dialog.querySelector('[data-search-dialog-loading]'), state !== 'loading');
  setElementHidden(dialog.querySelector('[data-search-dialog-empty]'), state !== 'empty');
  setElementHidden(dialog.querySelector('[data-search-dialog-error]'), state !== 'error');
  setElementHidden(dialog.querySelector('[data-search-dialog-unavailable]'), state !== 'unavailable');
  input?.setAttribute('aria-expanded', state === 'results' || state === 'empty' || state === 'loading' ? 'true' : 'false');
  input?.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
  if (state === 'error') {
    const error = dialog.querySelector<HTMLElement>('[data-search-dialog-error-message]');
    if (error && message) error.textContent = message;
  }
  if (state === 'unavailable') {
    const unavailable = dialog.querySelector<HTMLElement>('[data-search-dialog-unavailable-message]');
    if (unavailable && message) unavailable.textContent = message;
  }
};

const clearSearchDialogResults = (dialog: SearchDialogRootElement): void => {
  const results = dialog.querySelector<HTMLOListElement>('[data-search-dialog-results]');
  if (results) {
    results.replaceChildren();
  }
};

const appendHighlightedText = (target: HTMLElement, text: string, query: string): void => {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (normalizedQuery.length === 0) {
    target.append(document.createTextNode(text));
    return;
  }
  const lowerText = text.toLocaleLowerCase();
  let cursor = 0;
  let index = lowerText.indexOf(normalizedQuery, cursor);
  while (index >= 0) {
    if (index > cursor) {
      target.append(document.createTextNode(text.slice(cursor, index)));
    }
    const mark = document.createElement('mark');
    mark.textContent = text.slice(index, index + normalizedQuery.length);
    target.append(mark);
    cursor = index + normalizedQuery.length;
    index = lowerText.indexOf(normalizedQuery, cursor);
  }
  if (cursor < text.length) {
    target.append(document.createTextNode(text.slice(cursor)));
  }
};

const renderSearchDialogItems = (
  dialog: SearchDialogRootElement,
  items: readonly UiSearchDialogItem[],
  query: string,
): void => {
  const results = dialog.querySelector<HTMLOListElement>('[data-search-dialog-results]');
  if (!results) {
    return;
  }
  results.replaceChildren();
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
    appendHighlightedText(path, item.path ?? item.canonicalPathname, query);
    row.append(title, path);
    results.append(row);
  });
};

export function initSearch(options: InitSearchOptions): SearchBootstrapResult {
  if (typeof document === 'undefined') {
    return { status: 'unavailable', reason: 'search-runtime-unavailable' };
  }
  assertSearchBootstrapNotInitialized();

  const loadedRouteSet = options.routeManifestState.routeSet;
  const siteUrlContext = options.siteUrlContext;
  const isInternalDocumentPathname = (pathname: string): boolean => loadedRouteSet.has(pathname);

  const controller =
    options.controller ??
    createRuntimeSearchCore({
      runtimeEnvironment: options.runtimeEnvironment,
      siteUrlContext,
      isInternalDocumentPathname,
    });

  const dialog = document.querySelector<SearchDialogRootElement>('#global-search-dialog');
  if (!dialog) {
    initialized = true;
    initializedSearchCore = controller;
    initializedSearchRoutePredicate = isInternalDocumentPathname;
    initializedSearchBootstrapState = {
      status: 'ready',
      searchCore: controller,
      isInternalDocumentPathname,
    };
    return { status: 'ready', searchCore: controller };
  }

  initialized = true;
  initializedSearchCore = controller;
  initializedSearchRoutePredicate = isInternalDocumentPathname;
  initializedSearchBootstrapState = {
    status: 'ready',
    searchCore: controller,
    isInternalDocumentPathname,
  };
  bootstrapListenerController = new AbortController();
  const { signal } = bootstrapListenerController;
  const searchEventDiagnostics = createSearchEventDiagnosticSink();
  let latestItems: readonly UiSearchDialogItem[] = [];
  let activeIndex = -1;
  let searchTimerId: number | undefined;
  let searchGeneration = 0;

  const searcher = async ({
    query,
    signal: searchSignal,
  }: UiSearchDialogSearchContext): Promise<{ items: UiSearchDialogItem[] }> => {
    const result = await controller.search(
      {
        mode: 'navigate',
        q: query,
        tags: [],
        tagMode: 'or',
        sort: 'relevance',
      },
      { signal: searchSignal },
    );

    return {
      items: result.items.flatMap((item) => {
        const canonical = createSearchCanonicalPathname({
          pathname: item.canonicalPathname,
          isInternalDocumentPathname,
        });
        if (!canonical.ok) {
          return [];
        }
        const renderHref = buildSearchResultRenderHref({
          canonicalPathname: canonical.canonicalPathname,
          siteUrlContext,
        });
        return [{
          id: canonical.canonicalPathname,
          title: item.title,
          renderHref,
          canonicalPathname: canonical.canonicalPathname,
          path: item.pathLabel,
          keywords: item.reasons.flatMap((reason) => reason.tokens ?? []),
        }];
      }),
    };
  };

  const setActiveOption = (index: number): void => {
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

  const resetDialogSearch = (): void => {
    searchGeneration += 1;
    if (typeof searchTimerId === 'number') {
      window.clearTimeout(searchTimerId);
      searchTimerId = undefined;
    }
    latestItems = [];
    activeIndex = -1;
    clearSearchDialogResults(dialog);
    resetSearchDialogActiveOption(dialog);
    setSearchDialogState(dialog, 'idle');
    setSearchDialogStatus(dialog, 'キーワードを入力して検索できます。');
    syncSearchDialogClearButton(dialog);
  };

  const runDialogSearch = (query: string): void => {
    searchGeneration += 1;
    const generation = searchGeneration;
    if (typeof searchTimerId === 'number') {
      window.clearTimeout(searchTimerId);
    }
    syncSearchDialogClearButton(dialog);
    searchTimerId = window.setTimeout(() => {
      const normalizedQuery = query.trim();
      if (normalizedQuery.length === 0) {
        resetDialogSearch();
        return;
      }
      latestItems = [];
      activeIndex = -1;
      clearSearchDialogResults(dialog);
      resetSearchDialogActiveOption(dialog);
      setSearchDialogState(dialog, 'loading');
      setSearchDialogStatus(dialog, '検索しています...');
      void Promise.resolve(searcher({ query: normalizedQuery, signal }))
        .then((result) => {
          const currentValue = getSearchDialogInput(dialog)?.value.trim() ?? '';
          if (generation !== searchGeneration || currentValue !== normalizedQuery) {
            return;
          }
          latestItems = result.items;
          renderSearchDialogItems(dialog, result.items, normalizedQuery);
          setSearchDialogState(dialog, result.items.length > 0 ? 'results' : 'empty');
          setSearchDialogStatus(
            dialog,
            result.items.length > 0
              ? `${result.items.length.toString()} 件の結果`
              : '一致するメモが見つかりません。',
          );
        })
        .catch(() => {
          if (generation !== searchGeneration) {
            return;
          }
          clearSearchDialogResults(dialog);
          setSearchDialogState(dialog, 'error', '検索の読み込みに失敗しました。');
          setSearchDialogStatus(dialog, '検索の読み込みに失敗しました。');
        });
    }, 150);
  };

  const selectDialogItem = (
    index: number,
    selectionMethod: UiSearchDialogSelectedDetail['selectionMethod'],
  ): void => {
    const item = latestItems[index];
    if (!item) {
      return;
    }
    document.dispatchEvent(
      new CustomEvent<UiSearchDialogSelectedDetail>('search-dialog:selected', {
        detail: {
          id: item.id,
          renderHref: item.renderHref,
          canonicalPathname: item.canonicalPathname,
          title: item.title,
          query: getSearchDialogInput(dialog)?.value ?? '',
          index,
          item,
          selectionMethod,
        },
        bubbles: false,
        composed: false,
        cancelable: false,
      }),
    );
    requestSearchDialogClose(dialog, { reason: 'selection' });
  };

  const bindSearchDialogFormSubmitGuard = (): void => {
    const form = dialog.querySelector<HTMLFormElement>('[data-search-dialog-form]');
    form?.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();
      },
      { signal },
    );
  };

  const onOpenSearchDialog = (event: Event): void => {
    requestSearchDialogOpen(dialog, readOpenSearchDialogTrigger(event));
  };

  const onSelected = (event: Event): void => {
    const customEvent = event as CustomEvent<UiSearchDialogSelectedDetail>;
    const { renderHref: selectedRenderHref, canonicalPathname, title, query, selectionMethod } = customEvent.detail;
    if (typeof selectedRenderHref !== 'string' || selectedRenderHref.length === 0) {
      return;
    }

    const canonical = createSearchCanonicalPathname({
      pathname: canonicalPathname,
      isInternalDocumentPathname,
    });
    if (!canonical.ok) {
      return;
    }
    const renderHref = buildSearchResultRenderHref({
      canonicalPathname: canonical.canonicalPathname,
      siteUrlContext,
    });
    dispatchSearchReturnToReading(
      {
        schemaVersion: 1,
        eventName: searchReturnToReadingEventName,
        renderHref,
        canonicalPathname: canonical.canonicalPathname,
        title,
        query,
        selectionMethod,
      },
      { target: dialog },
    );
  };

  const onReturnToReading = (event: Event): void => {
    void handleSearchReturnToReadingEvent(event, {
      siteUrlContext,
      routeManifestState: options.routeManifestState,
      diagnostics: searchEventDiagnostics,
    });
  };

  const onOpenRequested = (event: Event): void => {
    requestSearchDialogOpen(dialog, readOpenSearchDialogTrigger(event));
  };

  const onCloseRequested = (event: Event): void => {
    searchEventDiagnostics.clear();
    const detail = event instanceof CustomEvent ? (event.detail as { reason?: unknown }) : {};
    const reason =
      detail.reason === 'selection' ||
      detail.reason === 'escape' ||
      detail.reason === 'backdrop' ||
      detail.reason === 'close-button' ||
      detail.reason === 'programmatic'
        ? detail.reason
        : 'programmatic';
    requestSearchDialogClose(dialog, { reason });
  };

  const onNativeClose = (): void => {
    syncSearchTriggerExpanded(false);
  };

  const onQueryChanged = (event: Event): void => {
    const customEvent = event as CustomEvent<{ query?: string }>;
    runDialogSearch(typeof customEvent.detail.query === 'string' ? customEvent.detail.query : '');
  };

  const onInput = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    runDialogSearch(target.value);
  };

  const onClick = (event: Event): void => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest('[data-search-dialog-close]')) {
      requestSearchDialogClose(dialog, { reason: 'close-button' });
      return;
    }
    if (target instanceof HTMLElement && target.closest('[data-search-dialog-clear]')) {
      const input = getSearchDialogInput(dialog);
      if (input) {
        input.value = '';
        resetDialogSearch();
        input.focus();
        input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      }
      return;
    }
    const option = target instanceof HTMLElement ? target.closest<HTMLElement>('[role="option"]') : null;
    if (option?.dataset['index']) {
      selectDialogItem(Number.parseInt(option.dataset['index'], 10), 'pointer');
    }
  };

  const onDialogKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveOption(activeIndex + 1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveOption(activeIndex - 1);
      return;
    }
    if (event.key === 'Enter') {
      if (activeIndex >= 0) {
        event.preventDefault();
        selectDialogItem(activeIndex, 'keyboard');
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      requestSearchDialogClose(dialog, { reason: 'escape' });
    }
  };

  const onCancel = (event: Event): void => {
    event.preventDefault();
    requestSearchDialogClose(dialog, { reason: 'escape' });
  };

  const onBackdropPointer = (event: MouseEvent): void => {
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
      requestSearchDialogClose(dialog, { reason: 'backdrop' });
    }
  };

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key.toLowerCase() !== 'k') {
      return;
    }

    if (!event.metaKey && !event.ctrlKey) {
      return;
    }

    if (isTextEditingSearchShortcutTarget(event.target, dialog)) {
      return;
    }

    event.preventDefault();
    const trigger =
      document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    requestSearchDialogOpen(dialog, trigger);
  };

  document.addEventListener('open-search-dialog', onOpenSearchDialog, { signal });
  bindSearchDialogFormSubmitGuard();
  dialog.addEventListener('input', onInput, { signal });
  dialog.addEventListener('click', onClick, { signal });
  dialog.addEventListener('keydown', onDialogKeydown, { signal });
  dialog.addEventListener('cancel', onCancel, { signal });
  dialog.addEventListener('pointerdown', onBackdropPointer, { signal });
  dialog.addEventListener('close', onNativeClose, { signal });
  document.addEventListener('search-dialog:selected', onSelected, { signal });
  dialog.addEventListener(searchReturnToReadingEventName, onReturnToReading, { signal });
  document.addEventListener('search-dialog:open-request', onOpenRequested, { signal });
  document.addEventListener('search-dialog:close-request', onCloseRequested, { signal });
  document.addEventListener('search-dialog:query-change', onQueryChanged, { signal });
  document.addEventListener('keydown', onKeydown, { signal });

  return { status: 'ready', searchCore: controller };
}

export function initSearchUnavailable(options: InitSearchUnavailableOptions): SearchBootstrapResult {
  if (typeof document === 'undefined') {
    return { status: 'unavailable', reason: options.reason };
  }
  assertSearchBootstrapNotInitialized();

  const dialog = document.querySelector<SearchDialogRootElement>('#global-search-dialog');
  initialized = true;
  initializedSearchCore = null;
  initializedSearchRoutePredicate = null;
  initializedSearchBootstrapState = { status: 'unavailable', reason: options.reason };
  if (!dialog) {
    return { status: 'unavailable', reason: options.reason };
  }

  bootstrapListenerController = new AbortController();
  const { signal } = bootstrapListenerController;
  const unavailableMessage = getSearchBootstrapUnavailableMessage(options.reason);
  const bindSearchDialogFormSubmitGuard = (): void => {
    const form = dialog.querySelector<HTMLFormElement>('[data-search-dialog-form]');
    form?.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();
      },
      { signal },
    );
  };
  const syncUnavailableClearButton = (): void => {
    syncSearchDialogClearButton(dialog);
    resetSearchDialogActiveOption(dialog);
  };

  const onOpenSearchDialog = (event: Event): void => {
    requestSearchDialogOpen(dialog, readOpenSearchDialogTrigger(event));
    setSearchDialogState(dialog, 'unavailable', unavailableMessage);
    setSearchDialogStatus(dialog, unavailableMessage);
  };

  const onOpenRequested = (event: Event): void => {
    requestSearchDialogOpen(dialog, readOpenSearchDialogTrigger(event));
  };

  const onCloseRequested = (): void => {
    requestSearchDialogClose(dialog, { reason: 'programmatic' });
  };

  const onNativeClose = (): void => {
    syncSearchTriggerExpanded(false);
  };

  const onQueryChanged = (): void => {
    syncUnavailableClearButton();
  };

  const onClick = (event: Event): void => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest('[data-search-dialog-close]')) {
      requestSearchDialogClose(dialog, { reason: 'close-button' });
      return;
    }
    if (target instanceof HTMLElement && target.closest('[data-search-dialog-clear]')) {
      const input = getSearchDialogInput(dialog);
      if (input) {
        input.value = '';
        clearSearchDialogResults(dialog);
        syncUnavailableClearButton();
        setSearchDialogState(dialog, 'unavailable', unavailableMessage);
        input.focus();
      }
    }
  };

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key.toLowerCase() !== 'k' || (!event.metaKey && !event.ctrlKey)) {
      return;
    }

    if (isTextEditingSearchShortcutTarget(event.target, dialog)) {
      return;
    }

    event.preventDefault();
    const trigger =
      document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    requestSearchDialogOpen(dialog, trigger);
    setSearchDialogState(dialog, 'unavailable', unavailableMessage);
    setSearchDialogStatus(dialog, unavailableMessage);
  };

  document.addEventListener('open-search-dialog', onOpenSearchDialog, { signal });
  bindSearchDialogFormSubmitGuard();
  dialog.addEventListener('click', onClick, { signal });
  dialog.addEventListener('close', onNativeClose, { signal });
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    requestSearchDialogClose(dialog, { reason: 'escape' });
  }, { signal });
  document.addEventListener('search-dialog:open-request', onOpenRequested, { signal });
  document.addEventListener('search-dialog:close-request', onCloseRequested, { signal });
  document.addEventListener('search-dialog:query-change', onQueryChanged, { signal });
  document.addEventListener('keydown', onKeydown, { signal });
  return { status: 'unavailable', reason: options.reason };
}

export function resetSearchBootstrapForTest(): void {
  bootstrapListenerController?.abort();
  bootstrapListenerController = null;

  initializedSearchCore = null;
  initializedSearchRoutePredicate = null;
  initializedSearchBootstrapState = null;
  initialized = false;
}
