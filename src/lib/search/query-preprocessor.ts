import type { SearchTokenizerPolicyId } from './search-types.js';

export interface PreparedSearchQuery {
  inputQuery: string;
  normalizedQuery: string;
  segmentedQuery: string;
  tokens: string[];
  tokenizerPolicyId: SearchTokenizerPolicyId;
}

export interface TokenizedSearchText {
  normalizedText: string;
  segmentedText: string;
  tokens: string[];
  tokenizerPolicyId: SearchTokenizerPolicyId;
}

interface SegmentLike {
  segment: string;
  isWordLike?: boolean;
}

interface SegmenterLike {
  segment(input: string): Iterable<SegmentLike>;
}

type SegmenterFactory = (locale: string) => SegmenterLike | null;

const ASCII_UPPERCASE_PATTERN = /[A-Z]/g;
const JAPANESE_TEXT_PATTERN = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;

function lowerAscii(value: string): string {
  return value.replace(ASCII_UPPERCASE_PATTERN, (character) => character.toLowerCase());
}

export function normalizeSearchQuery(value: string): string {
  return lowerAscii(value.normalize('NFKC')).replace(/\s+/g, ' ').trim();
}

function createDefaultSegmenter(locale: string): SegmenterLike | null {
  if (typeof Intl === 'undefined' || typeof Intl.Segmenter !== 'function') {
    return null;
  }

  return new Intl.Segmenter(locale, { granularity: 'word' });
}

function detectTokenizerPolicy(
  normalizedText: string,
  createSegmenter: SegmenterFactory,
): SearchTokenizerPolicyId {
  if (normalizedText.length === 0) {
    return 'generic-whitespace-v1';
  }

  if (!JAPANESE_TEXT_PATTERN.test(normalizedText)) {
    return 'generic-whitespace-v1';
  }

  return createSegmenter('ja') ? 'ja-word-v1' : 'generic-whitespace-v1';
}

function dedupeTokens(values: readonly string[]): string[] {
  const deduped: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const normalized = normalizeSearchQuery(value);
    if (normalized.length === 0) {
      continue;
    }

    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    deduped.push(normalized);
  }

  return deduped;
}

function tokenizeWithWhitespace(normalizedText: string): string[] {
  if (normalizedText.length === 0) {
    return [];
  }

  return dedupeTokens(normalizedText.split(' '));
}

function tokenizeWithJapaneseSegmenter(
  normalizedText: string,
  createSegmenter: SegmenterFactory,
): string[] {
  const segmenter = createSegmenter('ja');
  if (!segmenter) {
    return tokenizeWithWhitespace(normalizedText);
  }

  const tokens = Array.from(segmenter.segment(normalizedText)).flatMap((segment) => {
    const normalized = normalizeSearchQuery(segment.segment);
    if (normalized.length === 0) {
      return [];
    }

    if (segment.isWordLike === false) {
      return [];
    }

    return [normalized];
  });

  const deduped = dedupeTokens(tokens);
  return deduped.length > 0 ? deduped : tokenizeWithWhitespace(normalizedText);
}

export function tokenizeSearchText(
  value: string,
  createSegmenter: SegmenterFactory = createDefaultSegmenter,
): TokenizedSearchText {
  const normalizedText = normalizeSearchQuery(value);
  const tokenizerPolicyId = detectTokenizerPolicy(normalizedText, createSegmenter);
  const tokens =
    tokenizerPolicyId === 'ja-word-v1'
      ? tokenizeWithJapaneseSegmenter(normalizedText, createSegmenter)
      : tokenizeWithWhitespace(normalizedText);

  return {
    normalizedText,
    segmentedText: tokens.join(' '),
    tokens,
    tokenizerPolicyId,
  };
}

export function prepareSearchQuery(
  query: string,
  createSegmenter: SegmenterFactory = createDefaultSegmenter,
): PreparedSearchQuery {
  const tokenized = tokenizeSearchText(query, createSegmenter);

  return {
    inputQuery: query,
    normalizedQuery: tokenized.normalizedText,
    segmentedQuery: tokenized.segmentedText,
    tokens: tokenized.tokens,
    tokenizerPolicyId: tokenized.tokenizerPolicyId,
  };
}
