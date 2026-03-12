import { normalizeSearchQuery } from './search-url.js';

export interface PreparedSearchQuery {
  rawQuery: string;
  segmentedQuery: string;
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

export function prepareSearchQuery(
  query: string,
  createSegmenter: SegmenterFactory = createDefaultSegmenter,
): PreparedSearchQuery {
  const rawQuery = normalizeSearchQuery(query);
  if (rawQuery.length === 0) {
    return {
      rawQuery: '',
      segmentedQuery: '',
      tokens: [],
    };
  }

  const segmenter = createSegmenter();
  if (!segmenter) {
    const tokens = fallbackTokens(rawQuery);
    return {
      rawQuery,
      segmentedQuery: rawQuery,
      tokens,
    };
  }

  const tokens = dedupeTokens(
    Array.from(segmenter.segment(rawQuery)).flatMap((segment) => {
      const value = normalizeSearchQuery(segment.segment);
      if (value.length === 0) {
        return [];
      }

      if (segment.isWordLike === false) {
        return [];
      }

      return [value];
    }),
  );

  if (tokens.length === 0) {
    const fallback = fallbackTokens(rawQuery);
    return {
      rawQuery,
      segmentedQuery: rawQuery,
      tokens: fallback,
    };
  }

  return {
    rawQuery,
    segmentedQuery: tokens.join(' '),
    tokens,
  };
}
