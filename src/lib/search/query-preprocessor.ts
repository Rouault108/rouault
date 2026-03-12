import { normalizeSearchQuery } from './search-url.js';

export interface PreparedSearchQuery {
  rawQuery: string;
  segmentedQuery: string;
  tokens: string[];
}

export interface TokenizedSearchText {
  rawText: string;
  segmentedText: string;
  tokens: string[];
}

interface SegmentLike {
  segment: string;
  isWordLike?: boolean;
}

interface SegmenterLike {
  segment(input: string): Iterable<SegmentLike>;
}

type SegmenterFactory = () => SegmenterLike | null;

function createDefaultSegmenter(): SegmenterLike | null {
  if (typeof Intl === 'undefined' || typeof Intl.Segmenter !== 'function') {
    return null;
  }

  return new Intl.Segmenter('ja', { granularity: 'word' });
}

function dedupeTokens(values: readonly string[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const token = normalizeSearchQuery(value);
    if (token.length === 0) {
      continue;
    }

    const normalizedKey = token.toLocaleLowerCase('ja');
    if (seen.has(normalizedKey)) {
      continue;
    }

    seen.add(normalizedKey);
    result.push(token);
  }

  return result;
}

function fallbackTokens(rawQuery: string): string[] {
  return dedupeTokens(rawQuery.split(' '));
}

export function tokenizeSearchText(
  value: string,
  createSegmenter: SegmenterFactory = createDefaultSegmenter,
): TokenizedSearchText {
  const rawText = normalizeSearchQuery(value);
  if (rawText.length === 0) {
    return {
      rawText: '',
      segmentedText: '',
      tokens: [],
    };
  }

  const segmenter = createSegmenter();
  if (!segmenter) {
    const tokens = fallbackTokens(rawText);
    return {
      rawText,
      segmentedText: rawText,
      tokens,
    };
  }

  const tokens = dedupeTokens(
    Array.from(segmenter.segment(rawText)).flatMap((segment) => {
      const normalized = normalizeSearchQuery(segment.segment);
      if (normalized.length === 0) {
        return [];
      }

      if (segment.isWordLike === false) {
        return [];
      }

      return [normalized];
    }),
  );

  if (tokens.length === 0) {
    const fallback = fallbackTokens(rawText);
    return {
      rawText,
      segmentedText: rawText,
      tokens: fallback,
    };
  }

  return {
    rawText,
    segmentedText: tokens.join(' '),
    tokens,
  };
}

export function prepareSearchQuery(
  query: string,
  createSegmenter: SegmenterFactory = createDefaultSegmenter,
): PreparedSearchQuery {
  const tokenized = tokenizeSearchText(query, createSegmenter);
  return {
    rawQuery: tokenized.rawText,
    segmentedQuery: tokenized.segmentedText,
    tokens: tokenized.tokens,
  };
}
