export type SearchMode = 'navigate' | 'explore';

export type SearchSourceKind = 'pagefind' | 'catalog';

export type SearchTagMode = 'or' | 'and';

export type SearchSortMode = 'relevance' | 'date-desc';

export type SearchFailureKind =
  | 'pagefind-load-failed'
  | 'pagefind-search-failed'
  | 'pagefind-filter-read-failed'
  | 'catalog-fetch-failed'
  | 'catalog-normalize-failed'
  | 'all-sources-failed';

export type SearchDiagnosticSeverity = 'info' | 'warn' | 'error';

export type SearchDiagnosticStage =
  | 'fetch'
  | 'normalize'
  | 'validate'
  | 'merge'
  | 'rank'
  | 'filter'
  | 'navigate';

export type SearchDiagnosticIssueCode =
  | 'invalid-result-url'
  | 'unsupported-url-scheme'
  | 'cross-origin-url'
  | 'url-with-credentials'
  | 'invalid-document-canonical-url'
  | 'catalog-path-url-mismatch'
  | 'invalid-catalog-item'
  | 'source-degraded'
  | 'source-failed';

export interface SearchState {
  q: string;
  tags: string[];
  tagMode: SearchTagMode;
  sort: SearchSortMode;
}

export interface SearchDateValue {
  epochMs: number | null;
  original: string | null;
}

export interface SearchSnippetSegment {
  text: string;
  matched: boolean;
}

export interface SearchSnippet {
  segments: SearchSnippetSegment[];
}

export interface SearchReason {
  kind:
    | 'title-exact'
    | 'title-prefix'
    | 'title-token-coverage'
    | 'body-match'
    | 'path-match'
    | 'keyword-match'
    | 'tag-filter-match'
    | 'catalog-fallback';
  tokens?: string[];
  source?: SearchSourceKind;
}

export interface SearchDiagnosticIssue {
  code: SearchDiagnosticIssueCode;
  severity: SearchDiagnosticSeverity;
  stage: SearchDiagnosticStage;
  source?: SearchSourceKind;
  candidateRef?: string;
  count: number;
}

export interface SearchDiagnostics {
  degraded: boolean;
  activeSources: SearchSourceKind[];
  failures: SearchFailureKind[];
  issues: SearchDiagnosticIssue[];
}

export interface SearchResultItem {
  canonicalUrl: string;
  url: string;
  pathLabel: string;
  title: string;
  description: string;
  date: SearchDateValue;
  tags: string[];
  snippet: SearchSnippet | null;
  reasons: SearchReason[];
}

export interface SearchResponseBase {
  items: SearchResultItem[];
  total: number;
  rankingProfileId: 'rouault-search-v1';
  diagnostics: SearchDiagnostics;
}

export interface ExploreSearchResponse extends SearchResponseBase {
  mode: 'explore';
  tagCounts: Record<string, number>;
  allTagCounts: Record<string, number>;
}

export interface NavigateSearchResponse extends SearchResponseBase {
  mode: 'navigate';
}

export type SearchResponse = ExploreSearchResponse | NavigateSearchResponse;

export interface SearchRequest extends SearchState {
  mode: SearchMode;
}
