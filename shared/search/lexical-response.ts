import type {
  SearchDiagnosticIssueCode,
  SearchDiagnosticSeverity,
  SearchDiagnosticStage,
  SearchReason,
  SearchResultItem,
} from './search-types.js';
import type { WorkerFailureKind } from './lexical-protocol.js';

export type LexicalSourceKind = 'lexical' | 'catalog';
export type LexicalFailureKind =
  | WorkerFailureKind
  | 'catalog-fetch-failed'
  | 'catalog-normalize-failed'
  | 'all-sources-failed';
export interface LexicalDiagnosticIssue {
  code: SearchDiagnosticIssueCode | 'lexical-snippet-unavailable';
  severity: SearchDiagnosticSeverity;
  stage: SearchDiagnosticStage;
  source?: LexicalSourceKind;
  count: number;
  artifactSource?: 'search-catalog-json' | 'static-explore-response-json';
  candidateRef?: string;
}
export interface LexicalDiagnostics {
  degraded: boolean;
  activeSources: LexicalSourceKind[];
  failures: LexicalFailureKind[];
  issues: LexicalDiagnosticIssue[];
}
export interface LexicalReason extends Omit<SearchReason, 'source'> {
  source?: LexicalSourceKind;
}
export interface LexicalResultItem extends Omit<SearchResultItem, 'reasons'> {
  reasons: LexicalReason[];
}
interface LexicalResponseBase {
  items: LexicalResultItem[];
  total: number;
  rankingProfileId: 'rouault-search-v3';
  diagnostics: LexicalDiagnostics;
}
export type LexicalSearchResponse =
  | (LexicalResponseBase & { mode: 'navigate' })
  | (LexicalResponseBase & {
      mode: 'explore';
      tagCounts: Record<string, number>;
      allTagCounts: Record<string, number>;
    });
