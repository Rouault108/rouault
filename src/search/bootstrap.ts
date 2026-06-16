import type { SearchDialogItem } from './search-dialog-types.js';
import { dispatchSearchReturnToReading, handleSearchReturnToReadingEvent } from './navigation.js';
import { createSearchCore, type SearchCore } from './search-core.js';
import { searchReturnToReadingEventName } from './search-navigation-events.js';
import type { SiteUrlContext } from '../../shared/site/site-url-context.js';
import type { RuntimeEnvironment } from '../../shared/runtime/runtime-environment.js';
import type { LoadedInternalDocumentRouteManifestState } from '../router/internal-document-route-manifest-loader.js';
import { buildSearchResultRenderHref } from './normalize-search-result-url.js';
import { createSearchArtifactUrlResolver } from '../../shared/search/search-artifact-url.js';
import { createSearchCanonicalPathname } from '../../shared/search/document-url.js';
import { createSearchEventDiagnosticSink } from '../../shared/search/search-diagnostics.js';
import { createSearchRouteAllowlistPredicate } from '../../shared/search/search-route-allowlist.js';
import {
  getSearchBootstrapUnavailableMessage,
  type SearchBootstrapUnavailableReason,
} from '../../shared/search/search-unavailable-reason.js';
import {
  dispatchSearchDialogEvent,
  type SearchDialogCloseRequestDetail,
  type SearchDialogOpenRequestDetail,
  type SearchDialogQueryChangeDetail,
  type SearchDialogSelectedDetail,
} from './search-dialog-events.js';
import { SEARCH_DIALOG_STATUS_ERROR_FALLBACK_MESSAGE } from './search-dialog-constants.js';
import { SEARCH_DEBOUNCE_MS } from './search-constants.js';

let initialized = false;
let bootstrapListenerController: AbortController | null = null;
let initializedSearchCore: SearchCore | null = null;
let initializedSearchRoutePredicate: ((pathname: string) => boolean) | null = null;
let initializedSearchBootstrapState: SearchBootstrapState | null = null;
let cleanupSearchQueryRuntime: (() => void) | null = null;

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
    artifactUrlResolver: createSearchArtifactUrlResolver({
      siteUrlContext: options.siteUrlContext,
    }),
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

const readOpenSearchDialogTrigger = (event: Event): HTMLElement | null => {
  const detail = event instanceof CustomEvent ? (event.detail as unknown) : null;
  if (
    detail !== null &&
    typeof detail === 'object' &&
    'trigger' in detail &&
    detail.trigger instanceof HTMLElement
  ) {
    return detail.trigger;
  }

  return event.target instanceof HTMLElement ? event.target : null;
};

const readOpenSearchDialogModality = (event: Event): SearchDialogOpenRequestDetail['modality'] => {
  const detail = event instanceof CustomEvent ? (event.detail as unknown) : null;
  if (
    detail !== null &&
    typeof detail === 'object' &&
    'modality' in detail &&
    (detail.modality === 'keyboard' || detail.modality === 'pointer')
  ) {
    return detail.modality;
  }

  return undefined;
};

const isTextEditingSearchShortcutTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement);

const isSearchDialogSelectionDetail = (detail: unknown): detail is SearchDialogSelectedDetail => {
  if (detail === null || typeof detail !== 'object') {
    return false;
  }
  const candidate = detail as Partial<SearchDialogSelectedDetail>;
  return (
    typeof candidate.renderHref === 'string' &&
    typeof candidate.canonicalPathname === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.query === 'string' &&
    (candidate.selectionMethod === 'keyboard' || candidate.selectionMethod === 'pointer')
  );
};

const dispatchOpenRequest = (detail: SearchDialogOpenRequestDetail): void => {
  dispatchSearchDialogEvent('search-dialog:open-request', detail);
};

const dispatchUnavailableState = (reason: SearchBootstrapUnavailableReason): void => {
  dispatchSearchDialogEvent('search-dialog:unavailable', {
    message: getSearchBootstrapUnavailableMessage(reason),
  });
};

export function initSearch(options: InitSearchOptions): SearchBootstrapResult {
  if (typeof document === 'undefined') {
    return { status: 'unavailable', reason: 'search-runtime-unavailable' };
  }
  assertSearchBootstrapNotInitialized();

  const loadedRouteSet = options.routeManifestState.routeSet;
  const siteUrlContext = options.siteUrlContext;
  const isInternalDocumentPathname = createSearchRouteAllowlistPredicate(loadedRouteSet);

  const controller =
    options.controller ??
    createRuntimeSearchCore({
      runtimeEnvironment: options.runtimeEnvironment,
      siteUrlContext,
      isInternalDocumentPathname,
    });

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
  let searchTimerId: number | undefined;
  let searchGeneration = 0;
  let activeSearchAbortController: AbortController | null = null;

  const cleanupPendingSearch = (dispatchLoadingChange: boolean): void => {
    searchGeneration += 1;
    if (typeof searchTimerId === 'number') {
      window.clearTimeout(searchTimerId);
      searchTimerId = undefined;
    }
    activeSearchAbortController?.abort();
    activeSearchAbortController = null;
    if (dispatchLoadingChange) {
      dispatchSearchDialogEvent('search-dialog:loading-change', { loading: false });
    }
  };
  cleanupSearchQueryRuntime = () => {
    cleanupPendingSearch(false);
  };

  const runDialogSearch = (query: string): void => {
    cleanupPendingSearch(false);
    const generation = searchGeneration;
    searchTimerId = window.setTimeout(() => {
      searchTimerId = undefined;
      const normalizedQuery = query.trim();
      if (normalizedQuery.length === 0) {
        dispatchSearchDialogEvent('search-dialog:loading-change', { loading: false });
        dispatchSearchDialogEvent('search-dialog:results-change', { query: '', items: [] });
        return;
      }

      const searchAbortController = new AbortController();
      activeSearchAbortController = searchAbortController;
      dispatchSearchDialogEvent('search-dialog:loading-change', { loading: true });
      void controller
        .search(
          {
            mode: 'navigate',
            q: normalizedQuery,
            tags: [],
            tagMode: 'or',
            sort: 'relevance',
          },
          { signal: searchAbortController.signal },
        )
        .then((result) => {
          if (generation !== searchGeneration) {
            return;
          }
          const items: SearchDialogItem[] = result.items.flatMap((item) => {
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
            return [
              {
                id: canonical.canonicalPathname,
                title: item.title,
                renderHref,
                canonicalPathname: canonical.canonicalPathname,
                path: item.pathLabel,
                keywords: item.reasons.flatMap((reason) => reason.tokens ?? []),
              },
            ];
          });
          dispatchSearchDialogEvent('search-dialog:loading-change', { loading: false });
          dispatchSearchDialogEvent('search-dialog:results-change', {
            query: normalizedQuery,
            items,
          });
        })
        .catch((error: unknown) => {
          if (
            generation !== searchGeneration ||
            searchAbortController.signal.aborted ||
            (error instanceof DOMException && error.name === 'AbortError')
          ) {
            return;
          }
          dispatchSearchDialogEvent('search-dialog:loading-change', { loading: false });
          dispatchSearchDialogEvent('search-dialog:error', {
            message: SEARCH_DIALOG_STATUS_ERROR_FALLBACK_MESSAGE,
          });
        })
        .finally(() => {
          if (
            generation === searchGeneration &&
            activeSearchAbortController === searchAbortController
          ) {
            activeSearchAbortController = null;
          }
        });
    }, SEARCH_DEBOUNCE_MS);
  };

  const onOpenSearchDialog = (event: Event): void => {
    dispatchOpenRequest({
      trigger: readOpenSearchDialogTrigger(event),
      modality: readOpenSearchDialogModality(event),
    });
  };

  const onQueryChanged = (event: Event): void => {
    const detail =
      event instanceof CustomEvent ? (event.detail as SearchDialogQueryChangeDetail) : null;
    runDialogSearch(typeof detail?.query === 'string' ? detail.query : '');
  };

  const onSelected = (event: Event): void => {
    const detail = event instanceof CustomEvent ? (event.detail as unknown) : null;
    if (!isSearchDialogSelectionDetail(detail)) {
      return;
    }

    const canonical = createSearchCanonicalPathname({
      pathname: detail.canonicalPathname,
      isInternalDocumentPathname,
    });
    if (!canonical.ok) {
      return;
    }
    const renderHref = buildSearchResultRenderHref({
      canonicalPathname: canonical.canonicalPathname,
      siteUrlContext,
    });
    const dialog =
      document.querySelector<HTMLElement>('[data-search-dialog-root]') ??
      document.querySelector<HTMLElement>('#global-search-dialog');
    dispatchSearchReturnToReading(
      {
        schemaVersion: 1,
        eventName: searchReturnToReadingEventName,
        renderHref,
        canonicalPathname: canonical.canonicalPathname,
        title: detail.title,
        query: detail.query,
        selectionMethod: detail.selectionMethod,
      },
      { target: dialog ?? document },
    );
  };

  const onCloseRequested = (event: Event): void => {
    const detail =
      event instanceof CustomEvent ? (event.detail as SearchDialogCloseRequestDetail) : null;
    if (detail?.reason) cleanupPendingSearch(true);
  };

  const onReturnToReading = (event: Event): void => {
    void handleSearchReturnToReadingEvent(event, {
      siteUrlContext,
      routeManifestState: options.routeManifestState,
      diagnostics: searchEventDiagnostics,
    });
  };

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key.toLowerCase() !== 'k' || (!event.metaKey && !event.ctrlKey)) {
      return;
    }
    if (isTextEditingSearchShortcutTarget(event.target)) {
      return;
    }
    event.preventDefault();
    dispatchOpenRequest({
      trigger: document.activeElement instanceof HTMLElement ? document.activeElement : null,
      modality: 'keyboard',
    });
  };

  document.addEventListener('open-search-dialog', onOpenSearchDialog, { signal });
  document.addEventListener('search-dialog:query-change', onQueryChanged, { signal });
  document.addEventListener('search-dialog:selected', onSelected, { signal });
  document.addEventListener('search-dialog:close-request', onCloseRequested, { signal });
  document.addEventListener(searchReturnToReadingEventName, onReturnToReading, { signal });
  document.addEventListener('keydown', onKeydown, { signal });

  return { status: 'ready', searchCore: controller };
}

export function initSearchUnavailable(
  options: InitSearchUnavailableOptions,
): SearchBootstrapResult {
  if (typeof document === 'undefined') {
    return { status: 'unavailable', reason: options.reason };
  }
  assertSearchBootstrapNotInitialized();

  initialized = true;
  initializedSearchCore = null;
  initializedSearchRoutePredicate = null;
  initializedSearchBootstrapState = { status: 'unavailable', reason: options.reason };
  bootstrapListenerController = new AbortController();
  const { signal } = bootstrapListenerController;

  const onOpenSearchDialog = (event: Event): void => {
    dispatchOpenRequest({
      trigger: readOpenSearchDialogTrigger(event),
      modality: readOpenSearchDialogModality(event),
    });
  };

  const onOpenRequested = (): void => {
    dispatchUnavailableState(options.reason);
  };

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key.toLowerCase() !== 'k' || (!event.metaKey && !event.ctrlKey)) {
      return;
    }
    if (isTextEditingSearchShortcutTarget(event.target)) {
      return;
    }
    event.preventDefault();
    dispatchOpenRequest({
      trigger: document.activeElement instanceof HTMLElement ? document.activeElement : null,
      modality: 'keyboard',
    });
  };

  document.addEventListener('open-search-dialog', onOpenSearchDialog, { signal });
  document.addEventListener('search-dialog:open-request', onOpenRequested, { signal });
  document.addEventListener('keydown', onKeydown, { signal });
  dispatchUnavailableState(options.reason);
  return { status: 'unavailable', reason: options.reason };
}

export function resetSearchBootstrapForTest(): void {
  cleanupSearchQueryRuntime?.();
  cleanupSearchQueryRuntime = null;
  bootstrapListenerController?.abort();
  bootstrapListenerController = null;
  initializedSearchCore = null;
  initializedSearchRoutePredicate = null;
  initializedSearchBootstrapState = null;
  initialized = false;
}
