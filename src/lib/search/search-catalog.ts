import type { UiSearchDialogItem } from '../../components/ui/search-dialog/search-dialog.js';
import {
  prepareSearchQuery,
  tokenizeSearchText,
  type PreparedSearchQuery,
} from './query-preprocessor.js';

export interface SearchCatalogItem {
  title: string;
  url: string;
  path: string;
  description?: string;
  date?: string;
  keywords?: readonly string[];
  genres?: readonly string[];
}

export interface SearchDialogItem extends UiSearchDialogItem {
  description?: string;
  date?: string;
  pagefindBacked?: boolean;
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

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function dedupeStrings(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalizeString(value);
    if (normalized.length === 0) {
      continue;
    }

    const key = normalized.toLocaleLowerCase('ja');
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function isSearchCatalogRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeCatalogItems(payload: unknown): SearchCatalogItem[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.flatMap((entry) => {
    if (!isSearchCatalogRecord(entry)) {
      return [];
    }

    const title = normalizeString(entry['title']);
    const url = normalizeString(entry['url']);
    const path = normalizeString(entry['path']);
    if (title.length === 0 || url.length === 0 || path.length === 0) {
      return [];
    }

    return [
      {
        title,
        url,
        path,
        description: normalizeString(entry['description']),
        date: normalizeString(entry['date']),
        keywords: normalizeStringArray(entry['keywords']),
        genres: normalizeStringArray(entry['genres']),
      } satisfies SearchCatalogItem,
    ];
  });
}

function splitPathTerms(path: string): string[] {
  const decodedPath = (() => {
    try {
      return decodeURIComponent(path);
    } catch {
      return path;
    }
  })();

  return dedupeStrings(
    decodedPath
      .split(/[/?#&=._:-]+/u)
      .flatMap((segment) => segment.split('-'))
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0),
  );
}

function toSearchableContext(item: Pick<SearchCatalogItem, 'title' | 'path' | 'keywords' | 'description'>): {
  title: string;
  description: string;
  path: string;
  keywordString: string;
  terms: string[];
} {
  const keywords = normalizeStringArray(item.keywords);
  const titleTerms = tokenizeSearchText(item.title).tokens;
  const descriptionTerms = tokenizeSearchText(normalizeString(item.description)).tokens;

  return {
    title: item.title.toLocaleLowerCase('ja'),
    description: normalizeString(item.description).toLocaleLowerCase('ja'),
    path: item.path.toLocaleLowerCase('ja'),
    keywordString: keywords.map((keyword) => keyword.toLocaleLowerCase('ja')).join(' '),
    terms: dedupeStrings([...keywords, ...splitPathTerms(item.path), ...titleTerms, ...descriptionTerms]).map(
      (term) => term.toLocaleLowerCase('ja'),
    ),
  };
}

function matchesPreparedQuery(item: SearchCatalogItem, preparedQuery: PreparedSearchQuery): boolean {
  const normalizedQuery = preparedQuery.rawQuery.toLocaleLowerCase('ja');
  if (normalizedQuery.length === 0) {
    return false;
  }

  const context = toSearchableContext(item);
  const matchesSubstring =
    context.title.includes(normalizedQuery) ||
    context.path.includes(normalizedQuery) ||
    context.description.includes(normalizedQuery) ||
    context.keywordString.includes(normalizedQuery);
  const tokens = preparedQuery.tokens.map((token) => token.toLocaleLowerCase('ja'));
  const matchesAllTokens =
    tokens.length > 0 &&
    tokens.every(
      (token) =>
        context.title.includes(token) ||
        context.path.includes(token) ||
        context.description.includes(token) ||
        context.keywordString.includes(token),
    );
  const matchesExactToken = tokens.some((token) => context.terms.includes(token));

  return matchesSubstring || matchesAllTokens || matchesExactToken;
}

function toDialogItem(item: SearchCatalogItem): SearchDialogItem {
  return {
    title: item.title,
    url: item.url,
    path: item.path,
    ...(typeof item.description === 'string' && item.description.length > 0
      ? { description: item.description }
      : {}),
    ...(typeof item.date === 'string' && item.date.length > 0 ? { date: item.date } : {}),
    ...(Array.isArray(item.keywords) && item.keywords.length > 0 ? { keywords: item.keywords } : {}),
  };
}

function normalizeDateForSort(value: string | undefined): string {
  return normalizeString(value) || '0000-00-00';
}

function getDialogItemRank(item: SearchDialogItem, preparedQuery: PreparedSearchQuery): number {
  const rawQuery = preparedQuery.rawQuery.toLocaleLowerCase('ja');
  const tokens = preparedQuery.tokens.map((token) => token.toLocaleLowerCase('ja'));
  const title = item.title.toLocaleLowerCase('ja');
  const description = normalizeString(item.description).toLocaleLowerCase('ja');
  const path = normalizeString(item.path).toLocaleLowerCase('ja');
  const keywordString = normalizeStringArray(item.keywords)
    .map((keyword) => keyword.toLocaleLowerCase('ja'))
    .join(' ');
  const exactTerms = dedupeStrings([
    ...normalizeStringArray(item.keywords),
    ...splitPathTerms(path),
    ...tokenizeSearchText(item.title).tokens,
    ...tokenizeSearchText(normalizeString(item.description)).tokens,
  ]).map((term) => term.toLocaleLowerCase('ja'));

  if (title === rawQuery) {
    return 0;
  }

  if (title.startsWith(rawQuery)) {
    return 1;
  }

  if (tokens.length > 0 && tokens.every((token) => title.includes(token))) {
    return 2;
  }

  if (tokens.some((token) => exactTerms.includes(token))) {
    return 3;
  }

  if (
    tokens.length > 0 &&
    tokens.every(
      (token) =>
        title.includes(token) ||
        path.includes(token) ||
        description.includes(token) ||
        keywordString.includes(token),
    )
  ) {
    return 4;
  }

  if (item.pagefindBacked) {
    return 5;
  }

  if (title.includes(rawQuery) || path.includes(rawQuery)) {
    return 6;
  }

  if (description.includes(rawQuery) || keywordString.includes(rawQuery)) {
    return 7;
  }

  return 8;
}

function compareDialogItems(left: SearchDialogItem, right: SearchDialogItem, preparedQuery: PreparedSearchQuery): number {
  const leftRank = getDialogItemRank(left, preparedQuery);
  const rightRank = getDialogItemRank(right, preparedQuery);

  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  const dateComparison = normalizeDateForSort(right.date).localeCompare(
    normalizeDateForSort(left.date),
    'ja',
  );
  if (dateComparison !== 0) {
    return dateComparison;
  }

  const titleComparison = left.title.localeCompare(right.title, 'ja');
  if (titleComparison !== 0) {
    return titleComparison;
  }

  return (left.path ?? '').localeCompare(right.path ?? '', 'ja');
}

function normalizeDialogItem(item: SearchDialogItem): SearchDialogItem | null {
  const title = normalizeString(item.title);
  const url = normalizeString(item.url);
  if (title.length === 0 || url.length === 0) {
    return null;
  }

  const normalized: SearchDialogItem = {
    title,
    url,
  };
  const path = normalizeString(item.path);
  const description = normalizeString(item.description);
  const date = normalizeString(item.date);
  const keywords = dedupeStrings(normalizeStringArray(item.keywords));

  if (path.length > 0) {
    normalized.path = path;
  }
  if (description.length > 0) {
    normalized.description = description;
  }
  if (date.length > 0) {
    normalized.date = date;
  }
  if (keywords.length > 0) {
    normalized.keywords = keywords;
  }
  if (item.pagefindBacked) {
    normalized.pagefindBacked = true;
  }

  return normalized;
}

function mergeDialogItem(existing: SearchDialogItem, incoming: SearchDialogItem): SearchDialogItem {
  const mergedKeywords = dedupeStrings([
    ...normalizeStringArray(existing.keywords),
    ...normalizeStringArray(incoming.keywords),
  ]);
  const existingDate = normalizeString(existing.date);
  const incomingDate = normalizeString(incoming.date);
  const mergedDate =
    normalizeDateForSort(existingDate) >= normalizeDateForSort(incomingDate)
      ? existingDate
      : incomingDate;
  const existingDescription = normalizeString(existing.description);
  const incomingDescription = normalizeString(incoming.description);
  const mergedDescription =
    existingDescription.length >= incomingDescription.length ? existingDescription : incomingDescription;

  return {
    title: existing.title,
    url: existing.url,
    ...(normalizeString(existing.path).length > 0 || normalizeString(incoming.path).length > 0
      ? { path: normalizeString(existing.path) || normalizeString(incoming.path) }
      : {}),
    ...(mergedDescription.length > 0 ? { description: mergedDescription } : {}),
    ...(mergedDate.length > 0 ? { date: mergedDate } : {}),
    ...(mergedKeywords.length > 0 ? { keywords: mergedKeywords } : {}),
    ...(existing.pagefindBacked || incoming.pagefindBacked ? { pagefindBacked: true } : {}),
  };
}

export async function loadSearchCatalog(fetcher: SearchCatalogFetcher = fetch): Promise<readonly SearchCatalogItem[]> {
  const response = await fetcher('/search-catalog.json');
  if (!response.ok) {
    throw new Error(`検索カタログの読み込みに失敗しました: ${response.status.toString()}`);
  }

  const payload: unknown = await response.json();
  return normalizeCatalogItems(payload);
}

export async function getSearchCatalog(): Promise<readonly SearchCatalogItem[]> {
  searchCatalogPromise ??= loadSearchCatalog();
  return searchCatalogPromise;
}

export function resetSearchCatalogCache(): void {
  searchCatalogPromise = null;
}

export function searchSearchCatalog(
  items: readonly SearchCatalogItem[],
  query: string,
): SearchDialogItem[] {
  const preparedQuery = prepareSearchQuery(query);
  if (preparedQuery.rawQuery.length === 0) {
    return [];
  }

  return items.filter((item) => matchesPreparedQuery(item, preparedQuery)).map(toDialogItem);
}

export function mergeSearchDialogItems(
  primaryItems: readonly SearchDialogItem[],
  secondaryItems: readonly SearchDialogItem[],
  query: string,
): UiSearchDialogItem[] {
  const preparedQuery = prepareSearchQuery(query);
  if (preparedQuery.rawQuery.length === 0) {
    return [];
  }

  const mergedByUrl = new Map<string, SearchDialogItem>();
  for (const item of [...primaryItems, ...secondaryItems]) {
    const normalizedItem = normalizeDialogItem(item);
    if (!normalizedItem) {
      continue;
    }

    const existing = mergedByUrl.get(normalizedItem.url);
    mergedByUrl.set(
      normalizedItem.url,
      existing ? mergeDialogItem(existing, normalizedItem) : normalizedItem,
    );
  }

  return [...mergedByUrl.values()]
    .sort((left, right) => compareDialogItems(left, right, preparedQuery))
    .map((item) => ({
      title: item.title,
      url: item.url,
      ...(typeof item.path === 'string' && item.path.length > 0 ? { path: item.path } : {}),
      ...(Array.isArray(item.keywords) && item.keywords.length > 0 ? { keywords: item.keywords } : {}),
    }));
}
