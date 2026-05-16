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

interface SearchDialogElement extends HTMLElement {
  opened: boolean;
  query: string;
  captureOpenModality(modality?: InteractionModality): void;
  requestOpen(trigger?: HTMLElement): void;
  searcher?: UiSearchDialogSearcher | null | undefined;
}

let initialized = false;
let bootstrapListenerController: AbortController | null = null;
let initializedDialog: SearchDialogElement | null = null;
let previousSearcher: SearchDialogElement['searcher'] = undefined;
let initializedSearchCore: SearchCore | null = null;
let initializedSearchRoutePredicate: ((pathname: string) => boolean) | null = null;
let hadSearcherProperty = false;
let hadOwnSearcherProperty = false;

export type SearchBootstrapUnavailableReason =
  | 'route-manifest-unavailable'
  | 'route-manifest-invalid'
  | 'route-manifest-stale'
  | 'search-runtime-unavailable';

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

export const getInitializedSearchCore = (): SearchCore | null => initializedSearchCore;

export const getInitializedSearchRoutePredicate = (): ((pathname: string) => boolean) | null =>
  initializedSearchRoutePredicate;

const assertSearchBootstrapNotInitialized = (): void => {
  if (initialized) {
    throw new SearchBootstrapInitializationError('Search bootstrap was already initialized.');
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
    return { status: 'ready', searchCore: controller };
  }

  initialized = true;
  initializedSearchCore = controller;
  initializedSearchRoutePredicate = isInternalDocumentPathname;
  initializedDialog = dialog;
  hadSearcherProperty = 'searcher' in dialog;
  hadOwnSearcherProperty = Object.prototype.hasOwnProperty.call(dialog, 'searcher');
  previousSearcher = hadSearcherProperty ? dialog.searcher : undefined;
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

  const onOpenSearchDialog = (event: Event): void => {
    const trigger = event.target instanceof HTMLElement ? event.target : undefined;
    dialog.captureOpenModality();
    dialog.requestOpen(trigger);
  };

  const onSelected = (event: Event): void => {
    const customEvent = event as CustomEvent<UiSearchDialogSelectedDetail>;
    const { renderHref: selectedRenderHref, canonicalPathname, title, query, selectionMethod, item } = customEvent.detail;
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
    dialog.opened = true;
  };

  const onCloseRequested = (): void => {
    searchEventDiagnostics.clear();
    dialog.opened = false;
  };

  const onQueryChanged = (event: Event): void => {
    const customEvent = event as CustomEvent<{ query?: string }>;
    dialog.query = typeof customEvent.detail.query === 'string' ? customEvent.detail.query : '';
  };

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key.toLowerCase() !== 'k') {
      return;
    }

    if (!event.metaKey && !event.ctrlKey) {
      return;
    }

    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement)
    ) {
      return;
    }

    event.preventDefault();
    const trigger =
      document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    dialog.captureOpenModality('keyboard');
    dialog.requestOpen(trigger);
  };

  document.addEventListener('open-search-dialog', onOpenSearchDialog, { signal });
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
  initializedDialog = dialog;
  if (!dialog) {
    return { status: 'unavailable', reason: options.reason };
  }

  hadSearcherProperty = 'searcher' in dialog;
  hadOwnSearcherProperty = Object.prototype.hasOwnProperty.call(dialog, 'searcher');
  previousSearcher = hadSearcherProperty ? dialog.searcher : undefined;
  dialog.searcher = null;
  return { status: 'unavailable', reason: options.reason };
}

export function resetSearchBootstrapForTest(): void {
  bootstrapListenerController?.abort();
  bootstrapListenerController = null;

  if (initializedDialog) {
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
  previousSearcher = undefined;
  hadSearcherProperty = false;
  hadOwnSearcherProperty = false;
  initialized = false;
}
