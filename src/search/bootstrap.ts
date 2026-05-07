import type {
  UiSearchDialogItem,
  UiSearchDialogSearcher,
  UiSearchDialogSelectedDetail,
} from '../components/ui/search-dialog/search-dialog.types.js';
import {
  dispatchSearchReturnToReading,
  handleSearchReturnToReadingEvent,
} from './navigation.js';
import { searchCore } from './search-core.js';
import { searchReturnToReadingEventName } from './search-dialog-events.js';
import type { InteractionModality } from '../components/ui/search-dialog/internals/interaction-modality.js';

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
let hadSearcherProperty = false;
let hadOwnSearcherProperty = false;

export function initSearch(): void {
  if (initialized || typeof document === 'undefined') {
    return;
  }

  const dialog = document.querySelector<SearchDialogElement>('#global-search-dialog');
  if (!dialog) {
    return;
  }

  initialized = true;
  initializedDialog = dialog;
  hadSearcherProperty = 'searcher' in dialog;
  hadOwnSearcherProperty = Object.prototype.hasOwnProperty.call(dialog, 'searcher');
  previousSearcher = hadSearcherProperty ? dialog.searcher : undefined;
  bootstrapListenerController = new AbortController();
  const { signal } = bootstrapListenerController;

  dialog.searcher = async ({
    query,
    signal: searchSignal,
  }): Promise<{ items: UiSearchDialogItem[] }> => {
    const result = await searchCore.search(
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
      items: result.items.map((item) => ({
        id: item.canonicalUrl,
        title: item.title,
        url: item.url,
        canonicalUrl: item.canonicalUrl,
        path: item.pathLabel,
        keywords: item.reasons.flatMap((reason) => reason.tokens ?? []),
      })),
    };
  };

  const onOpenSearchDialog = (event: Event): void => {
    const trigger = event.target instanceof HTMLElement ? event.target : undefined;
    dialog.captureOpenModality();
    dialog.requestOpen(trigger);
  };

  const onSelected = (event: Event): void => {
    const customEvent = event as CustomEvent<UiSearchDialogSelectedDetail>;
    const { url, title, query, selectionMethod, item } = customEvent.detail;
    if (typeof url !== 'string' || url.length === 0) {
      return;
    }

    const canonicalUrl = item.canonicalUrl ?? url;
    dispatchSearchReturnToReading(
      {
        eventName: searchReturnToReadingEventName,
        routeId: canonicalUrl,
        url,
        canonicalUrl,
        title,
        query,
        selectionMethod,
      },
      { target: dialog },
    );
  };

  const onReturnToReading = (event: Event): void => {
    void handleSearchReturnToReadingEvent(event);
  };

  const onOpenRequested = (): void => {
    dialog.opened = true;
  };

  const onCloseRequested = (): void => {
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
  previousSearcher = undefined;
  hadSearcherProperty = false;
  hadOwnSearcherProperty = false;
  initialized = false;
}
