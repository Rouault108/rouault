import { normalizeDocumentCanonicalUrl } from './document-url.js';

export function isSearchVisibleCanonicalUrl(value: string): boolean {
  // 公開面の可否は build-time の publication policy で確定し、URL 接頭辞の特例を持ち込まない。
  return normalizeDocumentCanonicalUrl(value) !== null;
}
