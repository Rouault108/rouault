export interface SearchCatalogItem {
  title: string;
  url: string;
  path: string;
  description?: string;
  date?: string;
  keywords?: readonly string[];
  tags?: readonly string[];
}

export class SearchCatalogLoadError extends Error {
  constructor(
    readonly code: 'catalog-fetch-failed' | 'catalog-normalize-failed',
    message: string,
  ) {
    super(message);
    this.name = 'SearchCatalogLoadError';
  }
}

type SearchCatalogFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

let searchCatalogItems: readonly SearchCatalogItem[] | null = null;
let searchCatalogPromise: Promise<readonly SearchCatalogItem[]> | null = null;
let searchCatalogCacheGeneration = 0;

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = new Map<string, string>();

  for (const item of value) {
    if (typeof item !== 'string') {
      continue;
    }

    const stringValue = item.trim();
    if (stringValue.length === 0) {
      continue;
    }

    const key = stringValue.toLocaleLowerCase('ja');
    if (!normalized.has(key)) {
      normalized.set(key, stringValue);
    }
  }

  return [...normalized.values()];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeCatalogPayload(payload: unknown): SearchCatalogItem[] {
  if (!Array.isArray(payload)) {
    throw new SearchCatalogLoadError(
      'catalog-normalize-failed',
      '検索カタログのトップレベルは配列である必要があります。',
    );
  }

  return payload.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }

    return [
      {
        title: normalizeString(entry['title']),
        url: normalizeString(entry['url']),
        path: normalizeString(entry['path']),
        description: normalizeString(entry['description']),
        date: normalizeString(entry['date']),
        keywords: normalizeStringArray(entry['keywords']),
        tags: normalizeStringArray(entry['tags'] ?? entry['genres']),
      } satisfies SearchCatalogItem,
    ];
  });
}

export async function loadSearchCatalog(
  fetcher: SearchCatalogFetcher = fetch,
): Promise<readonly SearchCatalogItem[]> {
  let response: Response;

  try {
    response = await fetcher('/search-catalog.json');
  } catch (error: unknown) {
    throw new SearchCatalogLoadError(
      'catalog-fetch-failed',
      error instanceof Error ? error.message : '検索カタログの取得に失敗しました。',
    );
  }

  if (!response.ok) {
    throw new SearchCatalogLoadError(
      'catalog-fetch-failed',
      `検索カタログの読み込みに失敗しました: ${response.status.toString()}`,
    );
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch (error: unknown) {
    throw new SearchCatalogLoadError(
      'catalog-normalize-failed',
      error instanceof Error ? error.message : '検索カタログ JSON の解析に失敗しました。',
    );
  }

  return normalizeCatalogPayload(payload);
}

export async function getSearchCatalog(): Promise<readonly SearchCatalogItem[]> {
  if (searchCatalogItems !== null) {
    return searchCatalogItems;
  }

  if (searchCatalogPromise !== null) {
    return searchCatalogPromise;
  }

  const generation = searchCatalogCacheGeneration;

  searchCatalogPromise = loadSearchCatalog()
    .then((items) => {
      if (generation === searchCatalogCacheGeneration) {
        searchCatalogItems = items;
        searchCatalogPromise = null;
      }

      return items;
    })
    .catch((error: unknown) => {
      if (generation === searchCatalogCacheGeneration) {
        searchCatalogPromise = null;
      }

      throw error;
    });

  return searchCatalogPromise;
}

export function resetSearchCatalogCache(): void {
  searchCatalogCacheGeneration += 1;
  searchCatalogItems = null;
  searchCatalogPromise = null;
}
