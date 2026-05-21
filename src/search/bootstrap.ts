import type {
  UiSearchDialogItem,
  UiSearchDialogSearcher,
  UiSearchDialogSelectedDetail,
} from '../components/ui/search-dialog/search-dialog.types.js';
import {
  dispatchSearchReturnToReading,
  handleSearchReturnToReadingEvent,
} from './navigation.js';
import { createSearchCore, type SearchCore } from './search-core.js';
import { searchReturnToReadingEventName } from './search-dialog-events.js';
import type { InteractionModality } from '../components/ui/search-dialog/internals/interaction-modality.js';
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

interface SearchDialogElement extends HTMLElement {
  opened?: boolean;
  query?: string;
  captureOpenModality?(modality?: InteractionModality): void;
  requestOpen?(trigger?: HTMLElement): void;
  close?(): void;
  showModal?(): void;
  open?: boolean;
  searcher?: UiSearchDialogSearcher | null | undefined;
  searchUnavailable?: boolean;
  searchUnavailableReason?: SearchBootstrapUnavailableReason | '';
}

let initialized = false;
let bootstrapListenerController: AbortController | null = null;
let initializedDialog: SearchDialogElement | null = null;
let previousSearcher: SearchDialogElement['searcher'] = undefined;
let initializedSearchCore: SearchCore | null = null;
let initializedSearchRoutePredicate: ((pathname: string) => boolean) | null = null;
let initializedSearchBootstrapState: SearchBootstrapState | null = null;
let hadSearcherProperty = false;
let hadOwnSearcherProperty = false;

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
};

const requestSearchDialogOpen = (
  dialog: SearchDialogElement,
  trigger?: HTMLElement,
  modality?: InteractionModality,
): void => {
  dialog.captureOpenModality?.(modality);
  if (typeof dialog.requestOpen === 'function') {
    dialog.requestOpen(trigger);
  } else if (typeof dialog.showModal === 'function') {
    if (dialog.open !== true) {
      dialog.showModal();
    }
  } else {
    dialog.setAttribute('open', '');
  }
  dialog.opened = true;
  syncSearchTriggerExpanded(true);
  dialog.querySelector<HTMLInputElement>('[data-search-dialog-input]')?.focus();
};

const requestSearchDialogClose = (dialog: SearchDialogElement): void => {
  if (typeof dialog.close === 'function') {
    dialog.close();
  } else {
    dialog.removeAttribute('open');
  }
  dialog.opened = false;
  syncSearchTriggerExpanded(false);
};

const isTextEditingSearchShortcutTarget = (
  target: EventTarget | null,
  dialog: SearchDialogElement,
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

const setSearchDialogStatus = (dialog: SearchDialogElement, message: string): void => {
  const status = dialog.querySelector<HTMLElement>('[data-search-dialog-status]');
  if (status) {
    status.textContent = message;
  }
};

const clearSearchDialogResults = (dialog: SearchDialogElement): void => {
  const results = dialog.querySelector<HTMLOListElement>('[data-search-dialog-results]');
  if (results) {
    results.replaceChildren();
  }
};

const renderSearchDialogItems = (
  dialog: SearchDialogElement,
  items: readonly UiSearchDialogItem[],
  query: string,
): void => {
  const results = dialog.querySelector<HTMLOListElement>('[data-search-dialog-results]');
  if (!results) {
    return;
  }
  results.replaceChildren();
  for (const item of items) {
    const row = document.createElement('li');
    const link = document.createElement('a');
    link.href = item.renderHref;
    link.dataset['linkKind'] = 'internal-document';
    link.dataset['linkSurface'] = 'search-dialog';
    link.dataset['canonicalPathname'] = item.canonicalPathname;
    link.dataset['searchQuery'] = query;
    link.textContent = item.title;
    row.append(link);
    results.append(row);
  }
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

  const dialog = document.querySelector<SearchDialogElement>('#global-search-dialog');
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
  initializedDialog = dialog;
  hadSearcherProperty = 'searcher' in dialog;
  hadOwnSearcherProperty = Object.prototype.hasOwnProperty.call(dialog, 'searcher');
  previousSearcher = hadSearcherProperty ? dialog.searcher : undefined;
  dialog.searchUnavailable = false;
  dialog.searchUnavailableReason = '';
  bootstrapListenerController = new AbortController();
  const { signal } = bootstrapListenerController;
  const searchEventDiagnostics = createSearchEventDiagnosticSink();

  dialog.searcher = async ({
    query,
    signal: searchSignal,
  }): Promise<{ items: UiSearchDialogItem[] }> => {
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

  let searchTimerId: number | undefined;
  const runDialogSearch = (query: string): void => {
    if (typeof searchTimerId === 'number') {
      window.clearTimeout(searchTimerId);
    }
    searchTimerId = window.setTimeout(() => {
      const normalizedQuery = query.trim();
      if (normalizedQuery.length === 0) {
        clearSearchDialogResults(dialog);
        setSearchDialogStatus(dialog, 'キーワードを入力して検索できます。');
        return;
      }
      setSearchDialogStatus(dialog, '検索しています...');
      void Promise.resolve(
        dialog.searcher?.({ query: normalizedQuery, signal }) ?? { items: [] },
      )
        .then((result) => {
          renderSearchDialogItems(dialog, result.items, normalizedQuery);
          setSearchDialogStatus(
            dialog,
            result.items.length > 0
              ? `${result.items.length.toString()} 件の結果`
              : '一致するメモが見つかりません。',
          );
        })
        .catch(() => {
          clearSearchDialogResults(dialog);
          setSearchDialogStatus(dialog, '検索の読み込みに失敗しました。');
        });
    }, 150);
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

  const onOpenRequested = (): void => {
    requestSearchDialogOpen(dialog);
  };

  const onCloseRequested = (): void => {
    searchEventDiagnostics.clear();
    requestSearchDialogClose(dialog);
  };

  const onNativeClose = (): void => {
    dialog.opened = false;
    syncSearchTriggerExpanded(false);
  };

  const onQueryChanged = (event: Event): void => {
    const customEvent = event as CustomEvent<{ query?: string }>;
    dialog.query = typeof customEvent.detail.query === 'string' ? customEvent.detail.query : '';
    runDialogSearch(dialog.query);
  };

  const onInput = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    dialog.query = target.value;
    runDialogSearch(target.value);
  };

  const onClick = (event: Event): void => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest('[data-search-dialog-close]')) {
      requestSearchDialogClose(dialog);
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
    requestSearchDialogOpen(dialog, trigger, 'keyboard');
  };

  document.addEventListener('open-search-dialog', onOpenSearchDialog, { signal });
  dialog.addEventListener('input', onInput, { signal });
  dialog.addEventListener('click', onClick, { signal });
  dialog.addEventListener('close', onNativeClose, { signal });
  dialog.addEventListener('ui-search-dialog-selected', onSelected, { signal });
  dialog.addEventListener(searchReturnToReadingEventName, onReturnToReading, { signal });
  dialog.addEventListener('ui-search-dialog-open-requested', onOpenRequested, { signal });
  dialog.addEventListener('ui-search-dialog-close-requested', onCloseRequested, { signal });
  dialog.addEventListener('ui-search-dialog-query-changed', onQueryChanged, { signal });
  document.addEventListener('keydown', onKeydown, { signal });

  return { status: 'ready', searchCore: controller };
}

export function initSearchUnavailable(options: InitSearchUnavailableOptions): SearchBootstrapResult {
  if (typeof document === 'undefined') {
    return { status: 'unavailable', reason: options.reason };
  }
  assertSearchBootstrapNotInitialized();

  const dialog = document.querySelector<SearchDialogElement>('#global-search-dialog');
  initialized = true;
  initializedSearchCore = null;
  initializedSearchRoutePredicate = null;
  initializedSearchBootstrapState = { status: 'unavailable', reason: options.reason };
  initializedDialog = dialog;
  if (!dialog) {
    return { status: 'unavailable', reason: options.reason };
  }

  hadSearcherProperty = 'searcher' in dialog;
  hadOwnSearcherProperty = Object.prototype.hasOwnProperty.call(dialog, 'searcher');
  previousSearcher = hadSearcherProperty ? dialog.searcher : undefined;
  dialog.searcher = null;
  dialog.searchUnavailable = true;
  dialog.searchUnavailableReason = options.reason;
  bootstrapListenerController = new AbortController();
  const { signal } = bootstrapListenerController;

  const onOpenSearchDialog = (event: Event): void => {
    requestSearchDialogOpen(dialog, readOpenSearchDialogTrigger(event));
    setSearchDialogStatus(dialog, getSearchBootstrapUnavailableMessage(options.reason));
  };

  const onOpenRequested = (): void => {
    requestSearchDialogOpen(dialog);
  };

  const onCloseRequested = (): void => {
    requestSearchDialogClose(dialog);
  };

  const onNativeClose = (): void => {
    dialog.opened = false;
    syncSearchTriggerExpanded(false);
  };

  const onQueryChanged = (event: Event): void => {
    const customEvent = event as CustomEvent<{ query?: string }>;
    dialog.query = typeof customEvent.detail.query === 'string' ? customEvent.detail.query : '';
  };

  const onClick = (event: Event): void => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest('[data-search-dialog-close]')) {
      requestSearchDialogClose(dialog);
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
    requestSearchDialogOpen(dialog, trigger, 'keyboard');
    setSearchDialogStatus(dialog, getSearchBootstrapUnavailableMessage(options.reason));
  };

  document.addEventListener('open-search-dialog', onOpenSearchDialog, { signal });
  dialog.addEventListener('click', onClick, { signal });
  dialog.addEventListener('close', onNativeClose, { signal });
  dialog.addEventListener('ui-search-dialog-open-requested', onOpenRequested, { signal });
  dialog.addEventListener('ui-search-dialog-close-requested', onCloseRequested, { signal });
  dialog.addEventListener('ui-search-dialog-query-changed', onQueryChanged, { signal });
  document.addEventListener('keydown', onKeydown, { signal });
  return { status: 'unavailable', reason: options.reason };
}

export function resetSearchBootstrapForTest(): void {
  bootstrapListenerController?.abort();
  bootstrapListenerController = null;

  if (initializedDialog) {
    initializedDialog.searchUnavailable = false;
    initializedDialog.searchUnavailableReason = '';
    if (hadSearcherProperty) {
      initializedDialog.searcher = previousSearcher;

      if (!hadOwnSearcherProperty) {
        delete initializedDialog.searcher;
      }
    } else {
      delete initializedDialog.searcher;
    }
  }

  initializedDialog = null;
  initializedSearchCore = null;
  initializedSearchRoutePredicate = null;
  initializedSearchBootstrapState = null;
  previousSearcher = undefined;
  hadSearcherProperty = false;
  hadOwnSearcherProperty = false;
  initialized = false;
}
