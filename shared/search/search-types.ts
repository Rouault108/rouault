export type SearchMode = 'navigate' | 'explore';

export type SearchSourceKind = 'lexical' | 'catalog';

export type SearchReturnToReadingEventName = 'rouault-search:return-to-reading';

export type SearchImportBoundaryRuleId =
  | 'search-dialog-no-router-core-import'
  | 'search-return-to-reading-via-adapter';

export type SearchFieldKind = 'title' | 'description' | 'body' | 'path' | 'keyword' | 'tag';

export type SearchTagMode = 'or' | 'and';

export type SearchSortMode = 'relevance' | 'date-desc';

export type SearchFailureKind =
  | import('./lexical-protocol.js').WorkerFailureKind
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
  | 'lexical-snippet-unavailable'
  | 'source-failed';

import type { SearchCanonicalPathname, SearchRenderHref } from './document-url.js';
export type { SearchCanonicalPathname, SearchRenderHref } from './document-url.js';

export type SearchStateUrl = string;

export type SearchRankingProfileId = 'rouault-search-v3';

export type SearchTokenizerPolicyId = 'ja-word-v1' | 'generic-whitespace-v1';

export type SearchCountMap = Record<string, number>;

export interface SearchState {
  q: string;
  tags: string[];
  tagMode: SearchTagMode;
  sort: SearchSortMode;
}

export interface SearchDialogEventContract {
  readonly eventName: SearchReturnToReadingEventName;
}

export interface SearchIndexTypeContract {
  readonly canonicalPathname: SearchCanonicalPathname;
  readonly stateUrl: SearchStateUrl | null;
  readonly snippetIsStructured: true;
}

export interface SearchImportBoundaryContract {
  readonly edgeId: SearchImportBoundaryRuleId;
  readonly forbidsDirectRouterImport: true;
  readonly adapterEventName: SearchReturnToReadingEventName;
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

export interface CatalogFeatureScores {
  titleExactScore: number;
  titlePrefixScore: number;
  titleTokenCoverageScore: number;
  descriptionScore: number;
  pathScore: number;
  keywordScore: number;
  freshnessScore: number;

  matchEvidenceScore: number;
}

export interface CatalogCandidate {
  canonicalPathname: SearchCanonicalPathname;
  pathLabel: string;
  title: string;
  description: string;
  date: SearchDateValue;
  tags: string[];
  snippet: SearchSnippet | null;
  matchedFields: SearchFieldKind[];
  matchedTokens: string[];
  featureScores: CatalogFeatureScores;
  fieldTokens: CatalogFieldTokens;
}

/** 本文やpassageを持たないCatalog metadata専用の照合列。 */
export interface CatalogFieldTokens {
  titleTokens: string[];
  descriptionTokens: string[];
  pathTokens: string[];
  keywordTokens: string[];
}

export interface CatalogBatch {
  source: 'catalog';
  status: 'active' | 'failed';
  failure?: SearchFailureKind;

  candidates: CatalogCandidate[];
}

export interface SearchDiagnosticIssue {
  code: SearchDiagnosticIssueCode;
  severity: SearchDiagnosticSeverity;
  stage: SearchDiagnosticStage;
  source?: SearchSourceKind;
  artifactSource?: 'search-catalog-json' | 'static-explore-response-json';
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
  canonicalPathname: SearchCanonicalPathname;
  renderHref: SearchRenderHref;
  pathLabel: string;
  title: string;
  description: string;
  date: SearchDateValue;
  tags: string[];
  snippet: SearchSnippet | null;
  reasons: SearchReason[];
}

export interface StaticExploreSearchResultItem {
  canonicalPathname: SearchCanonicalPathname;
  pathLabel: string;
  title: string;
  description: string;
  date: SearchDateValue;
  tags: string[];
  snippet: SearchSnippet | null;
  reasons: SearchReason[];
}

export interface StaticExploreSearchResponse {
  mode: 'explore';
  items: StaticExploreSearchResultItem[];
  total: number;
  rankingProfileId: SearchRankingProfileId;
  diagnostics: SearchDiagnostics;
  tagCounts: SearchCountMap;
  allTagCounts: SearchCountMap;
}

export interface SearchResponseBase {
  items: SearchResultItem[];
  total: number;
  rankingProfileId: SearchRankingProfileId;
  diagnostics: SearchDiagnostics;
}

export interface ExploreSearchResponse extends SearchResponseBase {
  mode: 'explore';
  tagCounts: SearchCountMap;
  allTagCounts: SearchCountMap;
}

export interface NavigateSearchResponse extends SearchResponseBase {
  mode: 'navigate';
}

export type SearchResponse = ExploreSearchResponse | NavigateSearchResponse;

export interface SearchRequest extends SearchState {
  mode: SearchMode;
}
