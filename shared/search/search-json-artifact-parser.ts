import { createSearchCanonicalPathname, derivePathLabel } from './document-url.js';
import {
  createSearchDiagnosticCandidateRef,
  type SearchJsonParseDiagnosticSink,
} from './search-diagnostics.js';
import type { SearchCatalogItem } from './search-catalog.js';
import type {
  SearchCountMap,
  SearchDateValue,
  SearchDiagnosticIssueCode,
  SearchDiagnosticSeverity,
  SearchDiagnosticStage,
  SearchFailureKind,
  SearchDiagnostics,
  SearchReason,
  SearchSnippet,
  SearchSourceKind,
  StaticExploreSearchResponse,
  StaticExploreSearchResultItem,
} from './search-types.js';
import type { SiteUrlContext } from '../site/site-url-context.js';

const normalizeString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const normalizeStringArray = (value: unknown): string[] => {
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
};

const normalizeRequiredStringArray = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalized = new Map<string, string>();
  for (const item of value) {
    if (typeof item !== 'string') {
      return null;
    }
    const stringValue = item.trim();
    if (stringValue.length === 0) {
      return null;
    }
    const key = stringValue.toLocaleLowerCase('ja');
    if (normalized.has(key)) {
      return null;
    }
    normalized.set(key, stringValue);
  }
  return [...normalized.values()];
};

const didNormalizeRequiredStringArray = (value: unknown, normalized: readonly string[]): boolean =>
  Array.isArray(value) &&
  value.some((item, index) => typeof item === 'string' && item !== normalized[index]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const candidateRefForIndex = (index: number) => {
  const candidateRef = createSearchDiagnosticCandidateRef(`item-${index.toString()}`);
  return candidateRef !== undefined ? { candidateRef } : {};
};

const emptyDiagnostics = (): SearchDiagnostics => ({
  degraded: false,
  activeSources: ['catalog'],
  failures: [],
  issues: [],
});

const validateDate = (value: unknown): SearchDateValue | null => {
  if (!isRecord(value)) {
    return null;
  }
  const rawEpochMs = value['epochMs'];
  const epochMs =
    rawEpochMs === null
      ? null
      : typeof rawEpochMs === 'number' && Number.isFinite(rawEpochMs)
        ? rawEpochMs
        : undefined;
  if (epochMs === undefined) {
    return null;
  }
  const rawOriginal = value['original'];
  const original =
    rawOriginal === null
      ? null
      : typeof rawOriginal === 'string' && rawOriginal.trim().length > 0
        ? rawOriginal.trim()
        : undefined;
  if (original === undefined) {
    return null;
  }
  return { epochMs, original };
};

const validateSnippet = (value: unknown): SearchSnippet | null | undefined => {
  if (value === null || value === undefined) {
    return null;
  }
  if (!isRecord(value) || !Array.isArray(value['segments'])) {
    return undefined;
  }

  const segments: SearchSnippet['segments'] = [];
  for (const segment of value['segments']) {
    if (
      !isRecord(segment) ||
      typeof segment['text'] !== 'string' ||
      typeof segment['matched'] !== 'boolean'
    ) {
      return undefined;
    }
    segments.push({ text: segment['text'], matched: segment['matched'] });
  }

  return { segments };
};

const SEARCH_REASON_KINDS = [
  'title-exact',
  'title-prefix',
  'title-token-coverage',
  'body-match',
  'path-match',
  'keyword-match',
  'tag-filter-match',
  'catalog-fallback',
] as const satisfies readonly SearchReason['kind'][];

const isSearchReasonKind = (value: unknown): value is SearchReason['kind'] =>
  typeof value === 'string' && (SEARCH_REASON_KINDS as readonly string[]).includes(value);

const validateReasons = (value: unknown): SearchReason[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const reasons: SearchReason[] = [];
  for (const reason of value) {
    if (!isRecord(reason) || typeof reason['kind'] !== 'string') {
      return null;
    }
    if (!isSearchReasonKind(reason['kind'])) {
      return null;
    }
    const tokens =
      reason['tokens'] === undefined ? undefined : normalizeRequiredStringArray(reason['tokens']);
    if (tokens === null) {
      return null;
    }
    const source = reason['source'];
    if (source !== undefined && source !== 'catalog' && source !== 'pagefind') {
      return null;
    }
    reasons.push({
      kind: reason['kind'],
      ...(tokens !== undefined ? { tokens } : {}),
      ...(source === 'catalog' || source === 'pagefind' ? { source } : {}),
    });
  }

  return reasons;
};

const buildCountMapFromItems = (
  items: readonly StaticExploreSearchResultItem[],
): SearchCountMap => {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const tag of item.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return Object.fromEntries(
    [...counts.entries()].sort((left, right) => left[0].localeCompare(right[0], 'ja')),
  );
};

const SEARCH_DIAGNOSTIC_ISSUE_CODES = [
  'invalid-result-url',
  'unsupported-url-scheme',
  'cross-origin-url',
  'url-with-credentials',
  'invalid-document-canonical-url',
  'catalog-path-url-mismatch',
  'invalid-catalog-item',
  'source-degraded',
  'source-failed',
] as const satisfies readonly SearchDiagnosticIssueCode[];

const SEARCH_DIAGNOSTIC_SEVERITIES = [
  'info',
  'warn',
  'error',
] as const satisfies readonly SearchDiagnosticSeverity[];

const SEARCH_DIAGNOSTIC_STAGES = [
  'fetch',
  'normalize',
  'validate',
  'merge',
  'rank',
  'filter',
  'navigate',
] as const satisfies readonly SearchDiagnosticStage[];

const SEARCH_SOURCE_KINDS = ['pagefind', 'catalog'] as const satisfies readonly SearchSourceKind[];

const SEARCH_FAILURE_KINDS = [
  'pagefind-load-failed',
  'pagefind-search-failed',
  'pagefind-filter-read-failed',
  'catalog-fetch-failed',
  'catalog-normalize-failed',
  'all-sources-failed',
] as const satisfies readonly SearchFailureKind[];

const SEARCH_ARTIFACT_DIAGNOSTIC_SOURCES = [
  'search-catalog-json',
  'static-explore-response-json',
] as const;

const isOneOf = <Value extends string>(value: unknown, choices: readonly Value[]): value is Value =>
  typeof value === 'string' && (choices as readonly string[]).includes(value);

const validateSearchDiagnostics = (value: unknown): SearchDiagnostics | null => {
  if (!isRecord(value)) {
    return null;
  }
  if (typeof value['degraded'] !== 'boolean') {
    return null;
  }
  if (
    !Array.isArray(value['activeSources']) ||
    !Array.isArray(value['failures']) ||
    !Array.isArray(value['issues'])
  ) {
    return null;
  }

  const activeSources: SearchSourceKind[] = [];
  for (const source of value['activeSources']) {
    if (!isOneOf(source, SEARCH_SOURCE_KINDS)) {
      return null;
    }
    activeSources.push(source);
  }

  const failures: SearchFailureKind[] = [];
  for (const failure of value['failures']) {
    if (!isOneOf(failure, SEARCH_FAILURE_KINDS)) {
      return null;
    }
    failures.push(failure);
  }

  const issues: SearchDiagnostics['issues'] = [];
  for (const issue of value['issues']) {
    if (!isRecord(issue)) {
      return null;
    }
    if (
      !isOneOf(issue['code'], SEARCH_DIAGNOSTIC_ISSUE_CODES) ||
      !isOneOf(issue['severity'], SEARCH_DIAGNOSTIC_SEVERITIES) ||
      !isOneOf(issue['stage'], SEARCH_DIAGNOSTIC_STAGES) ||
      !Number.isInteger(issue['count']) ||
      typeof issue['count'] !== 'number' ||
      issue['count'] <= 0
    ) {
      return null;
    }
    const source = issue['source'];
    if (source !== undefined && !isOneOf(source, SEARCH_SOURCE_KINDS)) {
      return null;
    }
    const artifactSource = issue['artifactSource'];
    if (
      artifactSource !== undefined &&
      !isOneOf(artifactSource, SEARCH_ARTIFACT_DIAGNOSTIC_SOURCES)
    ) {
      return null;
    }
    const candidateRef = issue['candidateRef'];
    if (candidateRef !== undefined && typeof candidateRef !== 'string') {
      return null;
    }
    issues.push({
      code: issue['code'],
      severity: issue['severity'],
      stage: issue['stage'],
      ...(source !== undefined ? { source } : {}),
      ...(artifactSource !== undefined ? { artifactSource } : {}),
      ...(candidateRef !== undefined ? { candidateRef } : {}),
      count: issue['count'],
    });
  }

  return {
    degraded: value['degraded'],
    activeSources,
    failures,
    issues,
  };
};

const validateCountMap = (value: unknown): SearchCountMap | null => {
  if (!isRecord(value) || Array.isArray(value)) {
    return null;
  }

  const normalizedKeys = new Set<string>();
  const entries: [string, number][] = [];
  for (const [key, count] of Object.entries(value)) {
    const normalizedKey = key.trim();
    if (
      normalizedKey.length === 0 ||
      normalizedKey !== key ||
      normalizedKeys.has(normalizedKey.toLocaleLowerCase('ja')) ||
      typeof count !== 'number' ||
      !Number.isFinite(count) ||
      count < 0 ||
      !Number.isInteger(count)
    ) {
      return null;
    }
    normalizedKeys.add(normalizedKey.toLocaleLowerCase('ja'));
    entries.push([key, count]);
  }
  return Object.fromEntries(entries);
};

const STATIC_EXPLORE_INVALID_ITEM_FIELDS = [
  'renderHref',
  'canonicalPathname',
  'title',
  'pathLabel',
  'description',
  'tags',
  'date',
  'snippet',
  'reasons',
] as const;

export type StaticExploreInvalidItemField = (typeof STATIC_EXPLORE_INVALID_ITEM_FIELDS)[number];

export interface StaticExploreParseMetadata {
  readonly droppedItemCount: number;
  readonly rawTotalMatchedAcceptedItems: boolean;
  readonly usedLegacyTotalFallback: boolean;
  readonly usedLegacyCountMapFallback: boolean;
  readonly normalizedFromInvalidItemFields: readonly StaticExploreInvalidItemField[];
}

export type ParseStaticExploreSearchResponseFailureReason =
  | 'invalid-static-response-schema'
  | 'invalid-static-response-count-map'
  | 'invalid-static-response-total'
  | 'invalid-static-response-ranking-profile'
  | 'invalid-static-response-diagnostics';

const normalizeInvalidItemFields = (
  fields: ReadonlySet<StaticExploreInvalidItemField>,
): StaticExploreInvalidItemField[] =>
  STATIC_EXPLORE_INVALID_ITEM_FIELDS.filter((field) => fields.has(field));

export type ParseSearchCatalogJsonResult =
  | {
      readonly ok: true;
      readonly items: readonly SearchCatalogItem[];
      readonly droppedItemCount: number;
    }
  | { readonly ok: false; readonly reason: 'invalid-search-catalog-schema' };

export type ParseStaticExploreSearchResponseResult =
  | {
      readonly ok: true;
      readonly response: StaticExploreSearchResponse;
      readonly metadata: StaticExploreParseMetadata;
    }
  | { readonly ok: false; readonly reason: ParseStaticExploreSearchResponseFailureReason };

export const parseSearchCatalogJson = (options: {
  readonly value: unknown;
  readonly siteUrlContext: SiteUrlContext;
  readonly isInternalDocumentPathname: (normalizedPathnameWithoutBasePath: string) => boolean;
  readonly diagnostics: SearchJsonParseDiagnosticSink;
}): ParseSearchCatalogJsonResult => {
  if (!Array.isArray(options.value)) {
    options.diagnostics.addIssue({
      code: 'invalid-search-catalog-schema',
      artifactSource: 'search-catalog-json',
    });
    return { ok: false, reason: 'invalid-search-catalog-schema' };
  }

  const items: SearchCatalogItem[] = [];
  let droppedItemCount = 0;

  for (const [index, entry] of options.value.entries()) {
    if (!isRecord(entry)) {
      droppedItemCount += 1;
      options.diagnostics.addIssue({
        code: 'invalid-catalog-item',
        artifactSource: 'search-catalog-json',
        ...candidateRefForIndex(index),
      });
      continue;
    }

    const canonical = createSearchCanonicalPathname({
      pathname: normalizeString(entry['canonicalPathname']),
      isInternalDocumentPathname: options.isInternalDocumentPathname,
    });
    if (!canonical.ok) {
      droppedItemCount += 1;
      options.diagnostics.addIssue({
        code: 'allowlist-miss',
        artifactSource: 'search-catalog-json',
        ...candidateRefForIndex(index),
      });
      continue;
    }

    items.push({
      title: normalizeString(entry['title']),
      canonicalPathname: canonical.canonicalPathname,
      description: normalizeString(entry['description']),
      date: normalizeString(entry['date']),
      keywords: normalizeStringArray(entry['keywords']),
      tags: normalizeStringArray(entry['tags'] ?? entry['genres']),
    });
  }

  options.diagnostics.addSummary({
    code: 'search-json-dropped-items',
    artifactSource: 'search-catalog-json',
    droppedItemCount,
  });

  return { ok: true, items, droppedItemCount };
};

export const parseStaticExploreSearchResponseJson = (options: {
  readonly value: unknown;
  readonly isInternalDocumentPathname: (normalizedPathnameWithoutBasePath: string) => boolean;
  readonly diagnostics: SearchJsonParseDiagnosticSink;
}): ParseStaticExploreSearchResponseResult => {
  if (!isRecord(options.value) || options.value['mode'] !== 'explore') {
    options.diagnostics.addIssue({
      code: 'invalid-static-response-schema',
      artifactSource: 'static-explore-response-json',
    });
    return { ok: false, reason: 'invalid-static-response-schema' };
  }

  const rawItems = options.value['items'];
  if (!Array.isArray(rawItems)) {
    options.diagnostics.addIssue({
      code: 'invalid-static-response-schema',
      artifactSource: 'static-explore-response-json',
    });
    return { ok: false, reason: 'invalid-static-response-schema' };
  }

  const rawTotal = options.value['total'];
  if (
    rawTotal !== undefined &&
    (!Number.isInteger(rawTotal) || typeof rawTotal !== 'number' || rawTotal < 0)
  ) {
    options.diagnostics.addIssue({
      code: 'invalid-static-response-schema',
      artifactSource: 'static-explore-response-json',
    });
    return { ok: false, reason: 'invalid-static-response-total' };
  }

  if (options.value['rankingProfileId'] !== 'rouault-search-v1') {
    options.diagnostics.addIssue({
      code: 'invalid-static-response-schema',
      artifactSource: 'static-explore-response-json',
    });
    return { ok: false, reason: 'invalid-static-response-ranking-profile' };
  }

  const rawDiagnostics = options.value['diagnostics'];
  const diagnostics =
    rawDiagnostics === undefined ? emptyDiagnostics() : validateSearchDiagnostics(rawDiagnostics);
  if (diagnostics === null) {
    options.diagnostics.addIssue({
      code: 'invalid-static-response-schema',
      artifactSource: 'static-explore-response-json',
    });
    return { ok: false, reason: 'invalid-static-response-diagnostics' };
  }

  const hasTagCounts = Object.hasOwn(options.value, 'tagCounts');
  const hasAllTagCounts = Object.hasOwn(options.value, 'allTagCounts');
  const rawTagCounts = hasTagCounts ? validateCountMap(options.value['tagCounts']) : null;
  const rawAllTagCounts = hasAllTagCounts ? validateCountMap(options.value['allTagCounts']) : null;
  if ((hasTagCounts && rawTagCounts === null) || (hasAllTagCounts && rawAllTagCounts === null)) {
    options.diagnostics.addIssue({
      code: 'invalid-static-response-schema',
      artifactSource: 'static-explore-response-json',
    });
    return { ok: false, reason: 'invalid-static-response-count-map' };
  }

  const items: StaticExploreSearchResultItem[] = [];
  let droppedItemCount = 0;
  const invalidItemFields = new Set<StaticExploreInvalidItemField>();

  for (const [index, item] of rawItems.entries()) {
    if (!isRecord(item)) {
      droppedItemCount += 1;
      invalidItemFields.add('canonicalPathname');
      options.diagnostics.addIssue({
        code: 'invalid-catalog-item',
        artifactSource: 'static-explore-response-json',
        ...candidateRefForIndex(index),
      });
      continue;
    }

    if ('renderHref' in item) {
      droppedItemCount += 1;
      invalidItemFields.add('renderHref');
      options.diagnostics.addIssue({
        code: 'invalid-catalog-item',
        artifactSource: 'static-explore-response-json',
        ...candidateRefForIndex(index),
      });
      continue;
    }

    const canonical = createSearchCanonicalPathname({
      pathname: normalizeString(item['canonicalPathname']),
      isInternalDocumentPathname: options.isInternalDocumentPathname,
    });
    if (!canonical.ok) {
      droppedItemCount += 1;
      invalidItemFields.add('canonicalPathname');
      options.diagnostics.addIssue({
        code: 'allowlist-miss',
        artifactSource: 'static-explore-response-json',
        ...candidateRefForIndex(index),
      });
      continue;
    }

    const title = typeof item['title'] === 'string' ? item['title'].trim() : '';
    if (title.length === 0) {
      droppedItemCount += 1;
      invalidItemFields.add('title');
      options.diagnostics.addIssue({
        code: 'invalid-catalog-item',
        artifactSource: 'static-explore-response-json',
        ...candidateRefForIndex(index),
      });
      continue;
    }

    if (typeof item['pathLabel'] !== 'string') {
      droppedItemCount += 1;
      invalidItemFields.add('pathLabel');
      options.diagnostics.addIssue({
        code: 'invalid-catalog-item',
        artifactSource: 'static-explore-response-json',
        ...candidateRefForIndex(index),
      });
      continue;
    }
    const pathLabel =
      item['pathLabel'].trim().length > 0
        ? item['pathLabel'].trim()
        : derivePathLabel(canonical.canonicalPathname);
    if (item['pathLabel'].trim().length === 0) {
      invalidItemFields.add('pathLabel');
    }

    if (typeof item['description'] !== 'string') {
      droppedItemCount += 1;
      invalidItemFields.add('description');
      options.diagnostics.addIssue({
        code: 'invalid-catalog-item',
        artifactSource: 'static-explore-response-json',
        ...candidateRefForIndex(index),
      });
      continue;
    }

    const tags = normalizeRequiredStringArray(item['tags']);
    if (tags === null) {
      droppedItemCount += 1;
      invalidItemFields.add('tags');
      options.diagnostics.addIssue({
        code: 'invalid-catalog-item',
        artifactSource: 'static-explore-response-json',
        ...candidateRefForIndex(index),
      });
      continue;
    }
    if (didNormalizeRequiredStringArray(item['tags'], tags)) {
      invalidItemFields.add('tags');
    }

    const date =
      item['date'] === undefined ? { epochMs: null, original: null } : validateDate(item['date']);
    if (item['date'] === undefined) {
      invalidItemFields.add('date');
    }
    if (date === null) {
      droppedItemCount += 1;
      invalidItemFields.add('date');
      options.diagnostics.addIssue({
        code: 'invalid-catalog-item',
        artifactSource: 'static-explore-response-json',
        ...candidateRefForIndex(index),
      });
      continue;
    }

    const snippet = validateSnippet(item['snippet']);
    if (snippet === undefined) {
      droppedItemCount += 1;
      invalidItemFields.add('snippet');
      options.diagnostics.addIssue({
        code: 'invalid-catalog-item',
        artifactSource: 'static-explore-response-json',
        ...candidateRefForIndex(index),
      });
      continue;
    }

    const reasons = item['reasons'] === undefined ? [] : validateReasons(item['reasons']);
    if (item['reasons'] === undefined) {
      invalidItemFields.add('reasons');
    }
    if (reasons === null) {
      droppedItemCount += 1;
      invalidItemFields.add('reasons');
      options.diagnostics.addIssue({
        code: 'invalid-catalog-item',
        artifactSource: 'static-explore-response-json',
        ...candidateRefForIndex(index),
      });
      continue;
    }

    items.push({
      canonicalPathname: canonical.canonicalPathname,
      pathLabel,
      title,
      description: item['description'].trim(),
      date,
      tags,
      snippet,
      reasons,
    });
  }

  options.diagnostics.addSummary({
    code: 'search-json-dropped-items',
    artifactSource: 'static-explore-response-json',
    droppedItemCount,
  });

  const normalizedInvalidItemFields = normalizeInvalidItemFields(invalidItemFields);
  const shouldUseRawCountMaps =
    hasTagCounts && hasAllTagCounts && droppedItemCount === 0 && !invalidItemFields.has('tags');
  const fallbackCountMap = buildCountMapFromItems(items);
  const usedLegacyCountMapFallback = !hasTagCounts || !hasAllTagCounts;
  const response: StaticExploreSearchResponse = {
    mode: 'explore',
    items,
    total: items.length,
    rankingProfileId: 'rouault-search-v1',
    tagCounts: shouldUseRawCountMaps ? (rawTagCounts ?? fallbackCountMap) : fallbackCountMap,
    allTagCounts: shouldUseRawCountMaps ? (rawAllTagCounts ?? fallbackCountMap) : fallbackCountMap,
    diagnostics,
  };

  return {
    ok: true,
    response,
    metadata: {
      droppedItemCount,
      rawTotalMatchedAcceptedItems: rawTotal === undefined ? true : rawTotal === items.length,
      usedLegacyTotalFallback: rawTotal === undefined,
      usedLegacyCountMapFallback,
      normalizedFromInvalidItemFields: normalizedInvalidItemFields,
    },
  };
};
