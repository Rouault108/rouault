import type { MutableDiagnostics } from '../diagnostics.js';
import type { PreparedSearchQuery } from '../../../shared/search/query-preprocessor.js';
import type {
  CatalogCandidate,
  SearchDiagnostics,
  SearchDialogEventContract,
  SearchRequest,
  SearchResponse,
  CatalogBatch,
} from '../../../shared/search/search-types.js';

export interface QueryPreparationStageOutput {
  request: SearchRequest;
  preparedQuery: PreparedSearchQuery;
  diagnostics: MutableDiagnostics;
  nowUtcMs: number;
}

export interface CatalogLoadStageOutput extends QueryPreparationStageOutput {
  batches: CatalogBatch[];
}

export interface CandidateValidationStageOutput extends CatalogLoadStageOutput {
  activeBatches: CatalogBatch[];
}

export interface CandidateMergeStageOutput extends CandidateValidationStageOutput {
  mergedCandidates: CatalogCandidate[];
}

export interface RankingAndSortingStageOutput extends CandidateMergeStageOutput {
  queryMatchedCandidates: CatalogCandidate[];
  filteredCandidates: CatalogCandidate[];
  sortedCandidates: CatalogCandidate[];
}

export interface CountsAndDiagnosticsStageOutput extends RankingAndSortingStageOutput {
  diagnosticsResult: SearchDiagnostics;
  response: SearchResponse;
}

export interface SearchStageEventAudit {
  readonly events: readonly SearchDialogEventContract[];
}
