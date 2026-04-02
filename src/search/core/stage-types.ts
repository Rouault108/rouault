import type { MutableDiagnostics } from '../diagnostics.js';
import type { PreparedSearchQuery } from '../../../shared/search/query-preprocessor.js';
import type {
  SearchCandidate,
  SearchDiagnostics,
  SearchRequest,
  SearchResponse,
  SearchSourceBatch,
} from '../../../shared/search/search-types.js';

export interface QueryPreparationStageOutput {
  request: SearchRequest;
  preparedQuery: PreparedSearchQuery;
  diagnostics: MutableDiagnostics;
  nowUtcMs: number;
}

export interface SourceFederationStageOutput extends QueryPreparationStageOutput {
  batches: SearchSourceBatch[];
}

export interface CandidateValidationStageOutput extends SourceFederationStageOutput {
  activeBatches: SearchSourceBatch[];
}

export interface CandidateMergeStageOutput extends CandidateValidationStageOutput {
  mergedCandidates: SearchCandidate[];
}

export interface RankingAndSortingStageOutput extends CandidateMergeStageOutput {
  queryMatchedCandidates: SearchCandidate[];
  filteredCandidates: SearchCandidate[];
  sortedCandidates: SearchCandidate[];
}

export interface CountsAndDiagnosticsStageOutput extends RankingAndSortingStageOutput {
  diagnosticsResult: SearchDiagnostics;
  response: SearchResponse;
}
