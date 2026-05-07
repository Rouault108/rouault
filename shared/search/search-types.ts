export type SearchMode = 'navigate' | 'explore';

export type SearchSourceKind = 'pagefind' | 'catalog';

export type SearchReturnToReadingEventName = 'rouault-search:return-to-reading';

export type SearchDialogEventName =
  | 'rouault-search:open'
  | 'rouault-search:close'
  | SearchReturnToReadingEventName;

export type SearchImportBoundaryRuleId =
  | 'search-dialog-no-router-core-import'
  | 'search-return-to-reading-via-adapter';

export type SearchFieldKind = 'title' | 'description' | 'body' | 'path' | 'keyword' | 'tag';

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

export type DocumentCanonicalUrl = string;

export type SearchStateUrl = string;

export type SearchRankingProfileId = 'rouault-search-v1';

export type SearchTokenizerPolicyId = 'ja-word-v1' | 'generic-whitespace-v1';

export type SearchCountMap = Record<string, number>;

export interface SearchState {
  q: string;
  tags: string[];
  tagMode: SearchTagMode;
  sort: SearchSortMode;
}

export interface SearchDialogEventContract {
  readonly eventName: SearchDialogEventName;
  readonly routeId: string | null;
}

export interface SearchReturnToReadingEventDetail extends SearchDialogEventContract {
  readonly eventName: SearchReturnToReadingEventName;
  readonly url: string;
  readonly canonicalUrl: DocumentCanonicalUrl;
  readonly title: string;
  readonly query: string;
  readonly selectionMethod: 'keyboard' | 'pointer';
}

export interface SearchIndexTypeContract {
  readonly candidateUrl: DocumentCanonicalUrl;
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

export interface SearchFeatureScores {
  titleExactScore: number;
  titlePrefixScore: number;
  titleTokenCoverageScore: number;
  bodyScore: number;
  pathScore: number;
  keywordScore: number;
  freshnessScore: number;
  sourceReliabilityScore: number;
  matchEvidenceScore: number;
}

export interface SearchFieldTokens {
  titleTokens: string[];
  bodyTokens: string[];
  pathTokens: string[];
  keywordTokens: string[];
}

export interface SearchCandidate {
  canonicalUrl: DocumentCanonicalUrl;
  url: string;
  pathLabel: string;
  title: string;
  description: string;
  date: SearchDateValue;
  tags: string[];
  snippet: SearchSnippet | null;
  matchedSources: SearchSourceKind[];
  matchedFields: SearchFieldKind[];
  matchedTokens: string[];
  featureScores: SearchFeatureScores;
  fieldTokens: SearchFieldTokens;
}

export interface SearchSourceCapabilities {
  providesBodyEvidence: boolean;
  providesCountMap: boolean;
  supportsTagPrefilter: boolean;
  supportsNativeAndSemantics: boolean;
  supportsNativeDateDescSort: boolean;
}

export interface SearchSourceBatch {
  source: SearchSourceKind;
  status: 'active' | 'failed';
  failure?: SearchFailureKind;
  capabilities: SearchSourceCapabilities;
  candidates: SearchCandidate[];
  countMap?: SearchCountMap | null;
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
  canonicalUrl: DocumentCanonicalUrl;
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
