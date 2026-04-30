import { createFieldTokens } from '../../../build/search/indexing/field-tokenizers.js';
import {
  addFailure,
  addIssue,
  createCandidateRef,
  type MutableDiagnostics,
} from '../diagnostics.js';
import { isAbortError, throwIfAborted } from '../abort.js';
import {
  derivePathLabel,
  normalizeDocumentCanonicalUrl,
  validateResultUrl,
} from '../../../shared/search/document-url.js';
import { isSearchVisibleCanonicalUrl } from '../../../shared/search/search-visibility.js';
import { snippetFromDescription } from '../search-snippet.js';
import type {
  SearchCatalogItem,
  SearchCatalogLoadError,
} from '../../../shared/search/search-catalog.js';
import type { SearchCandidate, SearchSourceBatch } from '../../../shared/search/search-types.js';

const catalogCapabilities = {
  providesBodyEvidence: false,
  providesCountMap: false,
  supportsTagPrefilter: false,
  supportsNativeAndSemantics: false,
  supportsNativeDateDescSort: false,
} as const;

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

  return [...normalized.values()].sort((left, right) => left.localeCompare(right, 'ja'));
}

function normalizeDateValue(value: string) {
  const original = value.trim();
  if (original.length === 0) {
    return { epochMs: null, original: null };
  }

  const epochMs = Date.parse(original);
  return {
    epochMs: Number.isFinite(epochMs) ? epochMs : null,
    original,
  };
}

function emptyFeatureScores() {
  return {
    titleExactScore: 0,
    titlePrefixScore: 0,
    titleTokenCoverageScore: 0,
    bodyScore: 0,
    pathScore: 0,
    keywordScore: 0,
    freshnessScore: 0,
    sourceReliabilityScore: 0.6,
    matchEvidenceScore: 0,
  } as const;
}

function handleCatalogFailure(error: unknown, diagnostics: MutableDiagnostics): SearchSourceBatch {
  const failure =
    error instanceof Error &&
    'code' in error &&
    (error as SearchCatalogLoadError & { code?: unknown }).code === 'catalog-normalize-failed'
      ? 'catalog-normalize-failed'
      : 'catalog-fetch-failed';

  addFailure(diagnostics, failure);
  addIssue(diagnostics, {
    code: 'source-failed',
    stage: 'fetch',
    source: 'catalog',
  });

  return {
    source: 'catalog',
    status: 'failed',
    failure,
    capabilities: catalogCapabilities,
    candidates: [],
  };
}

export async function loadCatalogSourceBatch(input: {
  loadSearchCatalog: () => Promise<readonly SearchCatalogItem[]>;
  diagnostics: MutableDiagnostics;
  signal?: AbortSignal | undefined;
}): Promise<SearchSourceBatch> {
  let items: readonly SearchCatalogItem[];

  throwIfAborted(input.signal);

  try {
    items = await input.loadSearchCatalog();
  } catch (error: unknown) {
    if (isAbortError(error)) {
      throw error;
    }

    throwIfAborted(input.signal);

    return handleCatalogFailure(error, input.diagnostics);
  }

  throwIfAborted(input.signal);

  let droppedCount = 0;
  const candidates: SearchCandidate[] = [];

  for (const [index, item] of items.entries()) {
    if (index % 64 === 0) {
      throwIfAborted(input.signal);
    }

    const title = normalizeString(item.title);
    const path = normalizeString(item.path);
    const url = normalizeString(item.url);
    const stableInput = path || url || title || JSON.stringify(item);
    const candidateRef = createCandidateRef('catalog', stableInput);

    if (title.length === 0 || path.length === 0 || url.length === 0) {
      droppedCount += 1;
      addIssue(input.diagnostics, {
        code: 'invalid-catalog-item',
        stage: 'normalize',
        source: 'catalog',
        candidateRef,
      });
      continue;
    }

    const canonicalUrl = normalizeDocumentCanonicalUrl(path);
    if (canonicalUrl === null) {
      droppedCount += 1;
      addIssue(input.diagnostics, {
        code: 'invalid-document-canonical-url',
        stage: 'validate',
        source: 'catalog',
        candidateRef,
      });
      continue;
    }
    if (!isSearchVisibleCanonicalUrl(canonicalUrl)) {
      continue;
    }

    const validatedUrl = validateResultUrl(url);
    if (!validatedUrl.ok) {
      droppedCount += 1;
      addIssue(input.diagnostics, {
        code: validatedUrl.code,
        stage: 'validate',
        source: 'catalog',
        candidateRef,
      });
      continue;
    }

    const normalizedTargetCanonicalUrl = normalizeDocumentCanonicalUrl(validatedUrl.url);
    if (normalizedTargetCanonicalUrl === null) {
      droppedCount += 1;
      addIssue(input.diagnostics, {
        code: 'invalid-document-canonical-url',
        stage: 'validate',
        source: 'catalog',
        candidateRef,
      });
      continue;
    }

    if (normalizedTargetCanonicalUrl !== canonicalUrl) {
      droppedCount += 1;
      addIssue(input.diagnostics, {
        code: 'catalog-path-url-mismatch',
        stage: 'validate',
        source: 'catalog',
        candidateRef,
      });
      continue;
    }

    const description = normalizeString(item.description);
    const tags = normalizeStringArray(item.tags);
    const keywords = normalizeStringArray(item.keywords);

    candidates.push({
      canonicalUrl,
      url: validatedUrl.url,
      pathLabel: derivePathLabel(canonicalUrl),
      title,
      description,
      date: normalizeDateValue(normalizeString(item.date)),
      tags,
      snippet: snippetFromDescription(description),
      matchedSources: ['catalog'],
      matchedFields: [],
      matchedTokens: [],
      featureScores: { ...emptyFeatureScores() },
      fieldTokens: createFieldTokens({
        canonicalUrl,
        title,
        body: description,
        keywords: [...keywords, ...tags],
      }),
    });
  }

  throwIfAborted(input.signal);

  const fetchedCount = items.length;
  const degradedThreshold = Math.max(5, Math.ceil(fetchedCount * 0.05));

  if (fetchedCount >= 20 && droppedCount >= degradedThreshold) {
    addIssue(input.diagnostics, {
      code: 'source-degraded',
      stage: 'validate',
      source: 'catalog',
    });
  }

  return {
    source: 'catalog',
    status: 'active',
    capabilities: catalogCapabilities,
    candidates,
  };
}
