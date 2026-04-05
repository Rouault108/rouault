import { normalizeDocumentCanonicalUrl } from './document-url.js';

const TESTING_NOTE_ROOT = '/notes/testing/';

export function isSearchVisibleCanonicalUrl(value: string): boolean {
  const canonicalUrl = normalizeDocumentCanonicalUrl(value);
  if (canonicalUrl === null) {
    return false;
  }

  return !canonicalUrl.startsWith(TESTING_NOTE_ROOT);
}
