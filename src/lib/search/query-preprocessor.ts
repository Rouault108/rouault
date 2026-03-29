import type { SearchTokenizerPolicyId } from './search-types.js';
import {
  createDefaultSegmenter,
  detectTokenizerPolicy,
  normalizeSearchText,
  tokenizeNormalizedSearchText,
  type SegmenterFactory,
} from './indexing/tokenize-text.js';

export interface PreparedSearchQuery {
  inputQuery: string;
  normalizedQuery: string;
  segmentedQuery: string;
  tokens: string[];
  tokenizerPolicyId: SearchTokenizerPolicyId;
}

export function normalizeSearchQuery(value: string): string {
  return normalizeSearchText(value);
}

export function prepareSearchQuery(
  query: string,
  createSegmenter: SegmenterFactory = createDefaultSegmenter,
): PreparedSearchQuery {
  const normalizedQuery = normalizeSearchQuery(query);
  const tokenizerPolicyId = detectTokenizerPolicy(normalizedQuery, createSegmenter);
  const tokenized = tokenizeNormalizedSearchText(
    normalizedQuery,
    tokenizerPolicyId,
    createSegmenter,
  );

  return {
    inputQuery: query,
    normalizedQuery: tokenized.normalizedText,
    segmentedQuery: tokenized.segmentedText,
    tokens: tokenized.tokens,
    tokenizerPolicyId: tokenized.tokenizerPolicyId,
  };
}
