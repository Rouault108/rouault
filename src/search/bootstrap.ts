import type { UiSearchDialogItem } from '../components/ui/search-dialog/search-dialog.types.js';
import { navigateToUrl } from './navigation.js';
import { searchCore } from './search-core.js';

interface SearchDialogElement extends HTMLElement {
  opened: boolean;
  query: string;
  requestOpen(trigger?: HTMLElement): void;
  searcher?: (context: {
    query: string;
    signal: AbortSignal;
  }) =>
    | Promise<{ items: readonly UiSearchDialogItem[] }>
    | { items: readonly UiSearchDialogItem[] };
}

let initialized = false;

export function initSearch(): void {
  if (initialized || typeof document === 'undefined') {
    return;
  }

  initialized = true;

  const dialog = document.querySelector<SearchDialogElement>('#global-search-dialog');
  if (!dialog) {
    return;
  }

  dialog.searcher = async ({ query }): Promise<{ items: UiSearchDialogItem[] }> => {
    const result = await searchCore.search({
      mode: 'navigate',
      q: query,
      tags: [],
      tagMode: 'or',
      sort: 'relevance',
    });

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

  document.addEventListener('open-search-dialog', (event) => {
    const trigger = event.target instanceof HTMLElement ? event.target : undefined;
    dialog.requestOpen(trigger);
  });

  dialog.addEventListener('ui-search-dialog-selected', (event) => {
    const customEvent = event as CustomEvent<{ url?: string }>;
    const url = customEvent.detail.url;
    if (typeof url !== 'string' || url.length === 0) {
      return;
    }

    void navigateToUrl(url);
  });

  dialog.addEventListener('ui-search-dialog-open-requested', () => {
    dialog.opened = true;
  });

  dialog.addEventListener('ui-search-dialog-close-requested', () => {
    dialog.opened = false;
  });

  dialog.addEventListener('ui-search-dialog-query-changed', (event) => {
    const customEvent = event as CustomEvent<{ query?: string }>;
    dialog.query = typeof customEvent.detail.query === 'string' ? customEvent.detail.query : '';
  });

  document.addEventListener('keydown', (event) => {
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
    dialog.requestOpen(trigger);
  });
}
