import type { SearchCanonicalPathname } from './document-url.js';

/** final HTMLから得た表示用原文。正規化済みindex文字列とは分離する。 */
export interface SearchPassage {
  passageId: string;
  canonicalPathname: SearchCanonicalPathname;
  headingPath: readonly string[];
  anchorId: string | null;
  order: number;
  text: string;
}

export interface SearchDocument {
  canonicalPathname: SearchCanonicalPathname;
  title: string;
  description: string;
  body: string;
  pathLabel: string;
  keywords: readonly string[];
  tags: readonly string[];
  date: string;
}
