import type { SearchTokenizerPolicyId } from '../search-types.js';

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

export type SegmenterFactory = (locale: string) => SegmenterLike | null;

const ASCII_UPPERCASE_PATTERN = /[A-Z]/g;
const JAPANESE_TEXT_PATTERN = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;

function lowerAscii(value: string): string {
  return value.replace(ASCII_UPPERCASE_PATTERN, (character) => character.toLowerCase());
}

export function normalizeSearchText(value: string): string {
  return lowerAscii(value.normalize('NFKC')).replace(/\s+/g, ' ').trim();
}

export function createDefaultSegmenter(locale: string): SegmenterLike | null {
  if (typeof Intl === 'undefined' || typeof Intl.Segmenter !== 'function') {
    return null;
  }

  return new Intl.Segmenter(locale, { granularity: 'word' });
}

export function detectTokenizerPolicy(
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

export function dedupeSearchTokens(values: readonly string[]): string[] {
  const deduped: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const normalized = normalizeSearchText(value);
    if (normalized.length === 0 || seen.has(normalized)) {
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

  return dedupeSearchTokens(normalizedText.split(' '));
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
    const normalized = normalizeSearchText(segment.segment);
    if (normalized.length === 0 || segment.isWordLike === false) {
      return [];
    }

    return [normalized];
  });

  const deduped = dedupeSearchTokens(tokens);
  return deduped.length > 0 ? deduped : tokenizeWithWhitespace(normalizedText);
}

export function tokenizeNormalizedSearchText(
  normalizedText: string,
  tokenizerPolicyId: SearchTokenizerPolicyId,
  createSegmenter: SegmenterFactory = createDefaultSegmenter,
): TokenizedSearchText {
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

export function tokenizeSearchText(
  value: string,
  createSegmenter: SegmenterFactory = createDefaultSegmenter,
  tokenizerPolicyId?: SearchTokenizerPolicyId,
): TokenizedSearchText {
  const normalizedText = normalizeSearchText(value);
  const resolvedTokenizerPolicyId =
    tokenizerPolicyId ?? detectTokenizerPolicy(normalizedText, createSegmenter);

  return tokenizeNormalizedSearchText(normalizedText, resolvedTokenizerPolicyId, createSegmenter);
}
