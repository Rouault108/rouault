import { tokenizeSearchText } from '../../../shared/search/tokenize-text.js';

function normalizeString(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function buildPagefindAuxText(value: string | undefined): string {
  const normalized = normalizeString(value);
  if (normalized.length === 0) {
    return '';
  }

  const tokenized = tokenizeSearchText(normalized);
  if (
    tokenized.segmentedText.length === 0 ||
    tokenized.segmentedText === tokenized.normalizedText
  ) {
    return '';
  }

  return tokenized.segmentedText;
}
