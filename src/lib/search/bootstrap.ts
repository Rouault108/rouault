import type { UiSearchDialogItem } from '../../components/ui/search-dialog/search-dialog.js';
import { navigateToUrl } from './navigation.js';
import type { SearchAdapter } from './pagefind-search.js';
import {
  getSearchCatalog,
  mergeSearchDialogItems,
  searchSearchCatalog,
  type SearchDialogItem,
} from './search-catalog.js';

interface SearchDialogElement extends HTMLElement {
  open(trigger?: HTMLElement): void;
  searcher?: (query: string) => Promise<readonly UiSearchDialogItem[]> | readonly UiSearchDialogItem[];
}

let initialized = false;
let pagefindAdapterPromise: Promise<SearchAdapter> | null = null;

async function getPagefindSearchAdapter(): Promise<SearchAdapter> {
  pagefindAdapterPromise ??= import('./pagefind-search.js').then(
    (module) => module.pagefindSearchAdapter,
  );

  return pagefindAdapterPromise;
}

export function initSearch(): void {
  if (initialized || typeof document === 'undefined') {
    return;
  }

  initialized = true;

  const dialog = document.querySelector<SearchDialogElement>('#global-search-dialog');
  if (!dialog) {
    return;
  }

  dialog.searcher = async (query: string): Promise<UiSearchDialogItem[]> => {
    const pagefindPromise = getPagefindSearchAdapter().then((pagefindSearchAdapter) =>
      pagefindSearchAdapter.search(query, [], 'relevance'),
    );
    const catalogPromise = getSearchCatalog();

    const [pagefindResult, catalogResult] = await Promise.allSettled([
      pagefindPromise,
      catalogPromise,
    ]);

    const pagefindItems: SearchDialogItem[] =
      pagefindResult.status === 'fulfilled'
        ? pagefindResult.value.items.map((item) => ({
            title: item.title,
            url: item.url,
            path: item.path,
            description: item.description,
            date: item.date,
            pagefindBacked: true,
          }))
        : [];
    const catalogItems =
      catalogResult.status === 'fulfilled'
        ? searchSearchCatalog(catalogResult.value, query)
        : [];

    if (pagefindResult.status === 'rejected' && catalogItems.length === 0) {
      throw pagefindResult.reason;
    }

    return mergeSearchDialogItems(pagefindItems, catalogItems, query);
  };

  document.addEventListener('open-search-dialog', (event) => {
    const trigger = event.target instanceof HTMLElement ? event.target : undefined;
    dialog.open(trigger);
  });

  dialog.addEventListener('ui-search-dialog-selected', (event) => {
    const customEvent = event as CustomEvent<{ url?: string }>;
    const url = customEvent.detail.url;
    if (typeof url !== 'string' || url.length === 0) {
      return;
    }

    void navigateToUrl(url);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() !== 'k') {
      return;
    }

    if (!event.metaKey && !event.ctrlKey) {
      return;
    }

    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
      return;
    }

    event.preventDefault();
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    dialog.open(trigger);
  });
}
