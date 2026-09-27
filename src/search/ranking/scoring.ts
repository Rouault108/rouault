import { normalizeSearchQuery } from '../../../shared/search/query-preprocessor.js';
import type {
  CatalogCandidate,
  CatalogFeatureScores,
  SearchFieldKind,
  SearchMode,
  SearchReason,
} from '../../../shared/search/search-types.js';

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
  candidate: CatalogCandidate,
  queryTokens: readonly string[],
  normalizedQuery: string,
  nowUtcMs: number,
): CatalogFeatureScores {
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

  const descriptionScore =
    queryTokenCount === 0
      ? 0
      : uniqueQueryTokens.reduce(
          (sum, token) => sum + fieldTokenMatch(token, candidate.fieldTokens.descriptionTokens),
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

  const freshnessScore = buildFreshnessScore(candidate.date.epochMs, nowUtcMs);
  const matchEvidenceScore = Math.max(
    titleExactScore,
    titlePrefixScore,
    titleTokenCoverageScore,
    descriptionScore,
    pathScore,
    keywordScore,
  );

  return {
    titleExactScore,
    titlePrefixScore,
    titleTokenCoverageScore: clampScore(titleTokenCoverageScore),
    descriptionScore: clampScore(descriptionScore),
    pathScore: clampScore(pathScore),
    keywordScore: clampScore(keywordScore),
    freshnessScore,
    matchEvidenceScore,
  };
}

export function computeMatchedTokens(
  candidate: CatalogCandidate,
  queryTokens: readonly string[],
): string[] {
  const matched = new Set<string>();

  for (const token of queryTokens) {
    const normalizedToken = token.toLocaleLowerCase('ja');
    if (
      fieldTokenMatch(normalizedToken, candidate.fieldTokens.titleTokens) > 0 ||
      fieldTokenMatch(normalizedToken, candidate.fieldTokens.descriptionTokens) > 0 ||
      fieldTokenMatch(normalizedToken, candidate.fieldTokens.pathTokens) > 0 ||
      fieldTokenMatch(normalizedToken, candidate.fieldTokens.keywordTokens) > 0
    ) {
      matched.add(token);
    }
  }

  return [...matched];
}

export function computeMatchedFields(
  candidate: CatalogCandidate,
  queryTokens: readonly string[],
  selectedTags: readonly string[],
): SearchFieldKind[] {
  const matchedFields: SearchFieldKind[] = [];

  for (const token of queryTokens) {
    const normalizedToken = token.toLocaleLowerCase('ja');

    if (fieldTokenMatch(normalizedToken, candidate.fieldTokens.titleTokens) > 0) {
      matchedFields.push('title');
    }
    if (fieldTokenMatch(normalizedToken, candidate.fieldTokens.descriptionTokens) > 0) {
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
  candidate: CatalogCandidate,
  queryTokens: readonly string[],
  selectedTags: readonly string[],
): SearchReason[] {
  const reasons: SearchReason[] = [];
  const { featureScores } = candidate;

  const source = 'catalog' as const;

  if (featureScores.titleExactScore > 0) {
    reasons.push({ kind: 'title-exact', tokens: [...queryTokens], source });
  } else if (featureScores.titlePrefixScore > 0) {
    reasons.push({ kind: 'title-prefix', tokens: [...queryTokens], source });
  } else if (featureScores.titleTokenCoverageScore > 0) {
    reasons.push({
      kind: 'title-token-coverage',
      tokens: [...computeMatchedTokens(candidate, queryTokens)],
      source,
    });
  }

  if (featureScores.descriptionScore > 0) {
    // 採用済みCatalog reason互換。descriptionの照合であり、本文取得の証拠ではない。
    reasons.push({
      kind: 'body-match',
      tokens: [...computeMatchedTokens(candidate, queryTokens)],
      source,
    });
  }

  if (featureScores.pathScore > 0) {
    reasons.push({
      kind: 'path-match',
      tokens: [...computeMatchedTokens(candidate, queryTokens)],
      source,
    });
  }

  if (featureScores.keywordScore > 0) {
    reasons.push({
      kind: 'keyword-match',
      tokens: [...computeMatchedTokens(candidate, queryTokens)],
      source,
    });
  }

  if (selectedTags.length > 0) {
    reasons.push({ kind: 'tag-filter-match', tokens: [...selectedTags] });
  }

  if (candidate.snippet !== null) {
    reasons.push({ kind: 'catalog-fallback', source: 'catalog' });
  }

  return reasons;
}

export function computeSearchScore(featureScores: CatalogFeatureScores, mode: SearchMode): number {
  // Catalog単独の既存数値を保持する定数項。source間の信頼度評価やtie-breakには使わない。
  const weights =
    mode === 'navigate'
      ? {
          titleExact: 3,
          titlePrefix: 2,
          titleCoverage: 1.5,
          description: 0.8,
          path: 1.8,
          keyword: 1.2,
          freshness: 0.1,
          catalogBase: 0.6 * 0.8,
        }
      : {
          titleExact: 2,
          titlePrefix: 1.2,
          titleCoverage: 1.8,
          description: 1.8,
          path: 0.8,
          keyword: 0.8,
          freshness: 0.4,
          catalogBase: 0.6 * 0.6,
        };

  return (
    featureScores.titleExactScore * weights.titleExact +
    featureScores.titlePrefixScore * weights.titlePrefix +
    featureScores.titleTokenCoverageScore * weights.titleCoverage +
    featureScores.descriptionScore * weights.description +
    featureScores.pathScore * weights.path +
    featureScores.keywordScore * weights.keyword +
    featureScores.freshnessScore * weights.freshness +
    weights.catalogBase
  );
}
