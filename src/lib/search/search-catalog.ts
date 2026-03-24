import type { UiSearchDialogItem } from '../../components/ui/search-dialog/search-dialog.types.js';
import { normalizeDocumentCanonicalUrl } from './document-url.js';
import { prepareSearchQuery, tokenizeSearchText } from './query-preprocessor.js';

export interface SearchCatalogItem {
  title: string;
  url: string;
  path: string;
  description?: string;
  date?: string;
  keywords?: readonly string[];
  tags?: readonly string[];
}

export interface SearchDialogItem extends UiSearchDialogItem {
  description?: string;
  date?: string;
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

let searchCatalogPromise: Promise<readonly SearchCatalogItem[]> | null = null;

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
  searchCatalogPromise ??= loadSearchCatalog();
  return searchCatalogPromise;
}

export function resetSearchCatalogCache(): void {
  searchCatalogPromise = null;
}

function buildCatalogTerms(item: SearchCatalogItem): string[] {
  const pathTokens =
    normalizeDocumentCanonicalUrl(item.path)
      ?.replace(/^\/+|\/+$/g, '')
      .split('/')
      .flatMap((segment) => segment.split('-'))
      .filter((segment) => segment.length > 0) ?? [];

  return [
    ...tokenizeSearchText(item.title).tokens,
    ...tokenizeSearchText(item.description ?? '').tokens,
    ...pathTokens.map((segment) => tokenizeSearchText(segment).tokens).flat(),
    ...normalizeStringArray(item.keywords),
    ...normalizeStringArray(item.tags),
  ].map((term) => term.toLocaleLowerCase('ja'));
}

export function searchSearchCatalog(
  items: readonly SearchCatalogItem[],
  query: string,
): SearchDialogItem[] {
  const preparedQuery = prepareSearchQuery(query);
  if (preparedQuery.tokens.length === 0) {
    return [];
  }

  return items
    .filter((item) => {
      const terms = buildCatalogTerms(item);
      return preparedQuery.tokens.every((token) =>
        terms.some((term) => term.includes(token.toLocaleLowerCase('ja'))),
      );
    })
    .map((item) => {
      const id = normalizeDocumentCanonicalUrl(item.path || item.url) ?? item.url;
      return {
        id,
        title: item.title,
        url: item.url,
        ...(item.path ? { path: item.path } : {}),
        ...(item.description ? { description: item.description } : {}),
        ...(item.date ? { date: item.date } : {}),
        ...(item.keywords && item.keywords.length > 0 ? { keywords: item.keywords } : {}),
      };
    });
}

export function mergeSearchDialogItems(
  primaryItems: readonly SearchDialogItem[],
  secondaryItems: readonly SearchDialogItem[],
  query: string,
): UiSearchDialogItem[] {
  const preparedQuery = prepareSearchQuery(query);
  if (preparedQuery.tokens.length === 0) {
    return [];
  }

  const merged = new Map<string, SearchDialogItem>();

  for (const item of [...primaryItems, ...secondaryItems]) {
    const title = normalizeString(item.title);
    const url = normalizeString(item.url);
    if (title.length === 0 || url.length === 0) {
      continue;
    }

    const canonicalUrl = normalizeDocumentCanonicalUrl(item.canonicalUrl ?? item.path ?? item.url) ?? url;
    const existing = merged.get(canonicalUrl);

    if (!existing) {
      merged.set(canonicalUrl, {
        id: canonicalUrl,
        title,
        url,
        canonicalUrl,
        path: normalizeString(item.path),
        description: normalizeString(item.description),
        date: normalizeString(item.date),
        keywords: normalizeStringArray(item.keywords),
      });
      continue;
    }

    const existingDescription = normalizeString(existing.description);
    const nextDescription = normalizeString(item.description);
    const existingKeywords = normalizeStringArray(existing.keywords);
    const nextKeywords = normalizeStringArray(item.keywords);

    merged.set(canonicalUrl, {
      id: canonicalUrl,
      title: existing.title,
      url: existing.url,
      canonicalUrl,
      path: existing.path || normalizeString(item.path),
      description:
        existingDescription.length >= nextDescription.length ? existingDescription : nextDescription,
      date: normalizeString(existing.date) || normalizeString(item.date),
      keywords: [...new Set([...existingKeywords, ...nextKeywords])],
    });
  }

  return [...merged.values()]
    .sort((left, right) => left.title.localeCompare(right.title, 'ja'))
    .map((item) => {
      const canonicalUrl =
        typeof item.canonicalUrl === 'string' && item.canonicalUrl.length > 0
          ? item.canonicalUrl
          : undefined;

      return {
        id: item.id,
        title: item.title,
        url: item.url,
        ...(canonicalUrl ? { canonicalUrl } : {}),
        ...(item.path ? { path: item.path } : {}),
        ...(item.keywords && item.keywords.length > 0 ? { keywords: item.keywords } : {}),
      };
    });
}
