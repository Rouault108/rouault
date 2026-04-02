import { normalizeSearchQuery } from '../query-preprocessor.js';
import type {
  SearchCandidate,
  SearchFeatureScores,
  SearchFieldKind,
  SearchMode,
  SearchReason,
  SearchSourceKind,
} from '../search-types.js';

const SOURCE_RELIABILITY: Record<SearchSourceKind, number> = {
  pagefind: 1,
  catalog: 0.6,
};

const DAY_MS = 86_400_000;
const FRESHNESS_WINDOW_DAYS = 3650;

function fieldTokenMatch(queryToken: string, fieldTokens: readonly string[]): number {
  if (fieldTokens.some((token) => token === queryToken)) {
    return 1;
  }

  if (fieldTokens.some((token) => token.startsWith(queryToken))) {
    return 0.75;
  }

  if (queryToken.length >= 2 && fieldTokens.some((token) => token.includes(queryToken))) {
    return 0.4;
  }

  return 0;
}

function clampScore(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

function uniqueMatchedFields(fields: readonly SearchFieldKind[]): SearchFieldKind[] {
  return [...new Set(fields)];
}

function uniqueTokens(tokens: readonly string[]): string[] {
  return [...new Set(tokens)];
}

function buildFreshnessScore(epochMs: number | null, nowUtcMs: number): number {
  if (epochMs === null) {
    return 0;
  }

  const ageDays = Math.floor((nowUtcMs - epochMs) / DAY_MS);
  return clampScore(1 - ageDays / FRESHNESS_WINDOW_DAYS);
}

export function extractFeatureScores(
  candidate: SearchCandidate,
  queryTokens: readonly string[],
  normalizedQuery: string,
  nowUtcMs: number,
): SearchFeatureScores {
  const normalizedTitle = normalizeSearchQuery(candidate.title);
  const titleExactScore = normalizedQuery.length > 0 && normalizedTitle === normalizedQuery ? 1 : 0;
  const titlePrefixScore =
    normalizedQuery.length > 0 && normalizedTitle.startsWith(normalizedQuery) ? 1 : 0;

  const uniqueQueryTokens = uniqueTokens(queryTokens);
  const queryTokenCount = uniqueQueryTokens.length;

  const titleTokenCoverageScore =
    queryTokenCount === 0
      ? 0
      : uniqueQueryTokens.filter(
          (token) => fieldTokenMatch(token, candidate.fieldTokens.titleTokens) > 0,
        ).length / queryTokenCount;

  const bodyScore =
    queryTokenCount === 0
      ? 0
      : uniqueQueryTokens.reduce(
          (sum, token) => sum + fieldTokenMatch(token, candidate.fieldTokens.bodyTokens),
          0,
        ) / queryTokenCount;

  const pathScore =
    queryTokenCount === 0
      ? 0
      : uniqueQueryTokens.reduce(
          (sum, token) => sum + fieldTokenMatch(token, candidate.fieldTokens.pathTokens),
          0,
        ) / queryTokenCount;

  const keywordScore =
    queryTokenCount === 0
      ? 0
      : uniqueQueryTokens.reduce(
          (sum, token) => sum + fieldTokenMatch(token, candidate.fieldTokens.keywordTokens),
          0,
        ) / queryTokenCount;

  const sourceReliabilityScore = Math.max(
    ...candidate.matchedSources.map((source) => SOURCE_RELIABILITY[source]),
    0,
  );
  const freshnessScore = buildFreshnessScore(candidate.date.epochMs, nowUtcMs);
  const matchEvidenceScore = Math.max(
    titleExactScore,
    titlePrefixScore,
    titleTokenCoverageScore,
    bodyScore,
    pathScore,
    keywordScore,
  );

  return {
    titleExactScore,
    titlePrefixScore,
    titleTokenCoverageScore: clampScore(titleTokenCoverageScore),
    bodyScore: clampScore(bodyScore),
    pathScore: clampScore(pathScore),
    keywordScore: clampScore(keywordScore),
    freshnessScore,
    sourceReliabilityScore,
    matchEvidenceScore,
  };
}

export function computeMatchedTokens(
  candidate: SearchCandidate,
  queryTokens: readonly string[],
): string[] {
  const matched = new Set<string>();

  for (const token of queryTokens) {
    const normalizedToken = token.toLocaleLowerCase('ja');
    if (
      fieldTokenMatch(normalizedToken, candidate.fieldTokens.titleTokens) > 0 ||
      fieldTokenMatch(normalizedToken, candidate.fieldTokens.bodyTokens) > 0 ||
      fieldTokenMatch(normalizedToken, candidate.fieldTokens.pathTokens) > 0 ||
      fieldTokenMatch(normalizedToken, candidate.fieldTokens.keywordTokens) > 0
    ) {
      matched.add(token);
    }
  }

  return [...matched];
}

export function computeMatchedFields(
  candidate: SearchCandidate,
  queryTokens: readonly string[],
  selectedTags: readonly string[],
): SearchFieldKind[] {
  const matchedFields: SearchFieldKind[] = [];

  for (const token of queryTokens) {
    const normalizedToken = token.toLocaleLowerCase('ja');

    if (fieldTokenMatch(normalizedToken, candidate.fieldTokens.titleTokens) > 0) {
      matchedFields.push('title');
    }
    if (fieldTokenMatch(normalizedToken, candidate.fieldTokens.bodyTokens) > 0) {
      matchedFields.push('body');
    }
    if (fieldTokenMatch(normalizedToken, candidate.fieldTokens.pathTokens) > 0) {
      matchedFields.push('path');
    }
    if (fieldTokenMatch(normalizedToken, candidate.fieldTokens.keywordTokens) > 0) {
      matchedFields.push('keyword');
    }
  }

  if (selectedTags.length > 0) {
    matchedFields.push('tag');
  }

  return uniqueMatchedFields(matchedFields);
}

export function computeReasons(
  candidate: SearchCandidate,
  queryTokens: readonly string[],
  selectedTags: readonly string[],
): SearchReason[] {
  const reasons: SearchReason[] = [];
  const { featureScores } = candidate;

  const source = candidate.matchedSources[0];

  if (featureScores.titleExactScore > 0) {
    reasons.push({ kind: 'title-exact', tokens: [...queryTokens], ...(source ? { source } : {}) });
  } else if (featureScores.titlePrefixScore > 0) {
    reasons.push({ kind: 'title-prefix', tokens: [...queryTokens], ...(source ? { source } : {}) });
  } else if (featureScores.titleTokenCoverageScore > 0) {
    reasons.push({
      kind: 'title-token-coverage',
      tokens: [...computeMatchedTokens(candidate, queryTokens)],
      ...(source ? { source } : {}),
    });
  }

  if (featureScores.bodyScore > 0) {
    reasons.push({
      kind: 'body-match',
      tokens: [...computeMatchedTokens(candidate, queryTokens)],
      ...(source ? { source } : {}),
    });
  }

  if (featureScores.pathScore > 0) {
    reasons.push({
      kind: 'path-match',
      tokens: [...computeMatchedTokens(candidate, queryTokens)],
      ...(source ? { source } : {}),
    });
  }

  if (featureScores.keywordScore > 0) {
    reasons.push({
      kind: 'keyword-match',
      tokens: [...computeMatchedTokens(candidate, queryTokens)],
      ...(source ? { source } : {}),
    });
  }

  if (selectedTags.length > 0) {
    reasons.push({ kind: 'tag-filter-match', tokens: [...selectedTags] });
  }

  if (
    candidate.matchedSources.includes('catalog') &&
    !candidate.matchedSources.includes('pagefind') &&
    candidate.snippet !== null
  ) {
    reasons.push({ kind: 'catalog-fallback', source: 'catalog' });
  }

  return reasons;
}

export function computeSearchScore(featureScores: SearchFeatureScores, mode: SearchMode): number {
  const weights =
    mode === 'navigate'
      ? {
          titleExact: 3,
          titlePrefix: 2,
          titleCoverage: 1.5,
          body: 0.8,
          path: 1.8,
          keyword: 1.2,
          freshness: 0.1,
          sourceReliability: 0.8,
        }
      : {
          titleExact: 2,
          titlePrefix: 1.2,
          titleCoverage: 1.8,
          body: 1.8,
          path: 0.8,
          keyword: 0.8,
          freshness: 0.4,
          sourceReliability: 0.6,
        };

  return (
    featureScores.titleExactScore * weights.titleExact +
    featureScores.titlePrefixScore * weights.titlePrefix +
    featureScores.titleTokenCoverageScore * weights.titleCoverage +
    featureScores.bodyScore * weights.body +
    featureScores.pathScore * weights.path +
    featureScores.keywordScore * weights.keyword +
    featureScores.freshnessScore * weights.freshness +
    featureScores.sourceReliabilityScore * weights.sourceReliability
  );
}
