import { addFailure, finalizeDiagnostics } from '../diagnostics.js';
import { createDefaultPagefindLoader } from '../sources/pagefind-source.js';
import { getSearchCatalog, type SearchCatalogItem } from '../../../shared/search/search-catalog.js';
import type { SearchRequest, SearchResponse } from '../../../shared/search/search-types.js';
import {
  runSourceFederationStage,
  type LoadSearchCatalog,
  type PagefindApi,
  type PagefindLoader,
} from './stages/source-federation.js';
import { runCandidateMergeStage } from './stages/candidate-merge.js';
import { buildEmptySearchResponse, runCountsAndDiagnosticsStage } from './stages/counts-and-diagnostics.js';
import { runCandidateValidationStage } from './stages/candidate-validation.js';
import { runQueryPreparationStage } from './stages/query-preparation.js';
import { runRankingAndSortingStage } from './stages/ranking-and-sorting.js';

export interface SearchCoreDependencies {
  loadPagefind?: PagefindLoader;
  loadSearchCatalog?: LoadSearchCatalog;
  now?: () => number;
}

export interface SearchCore {
  search(request: SearchRequest): Promise<SearchResponse>;
}

export function createSearchCore(dependencies: SearchCoreDependencies = {}): SearchCore {
  const loadPagefind = dependencies.loadPagefind ?? createDefaultPagefindLoader();
  const loadSearchCatalog = dependencies.loadSearchCatalog ?? getSearchCatalog;
  const now = dependencies.now ?? (() => Date.now());

  let pagefindPromise: Promise<PagefindApi> | null = null;

  const memoizedPagefindLoader: PagefindLoader = async () => {
    pagefindPromise ??= loadPagefind();
    return pagefindPromise;
  };

  return {
    async search(request: SearchRequest): Promise<SearchResponse> {
      const queryPreparation = runQueryPreparationStage({
        request,
        nowUtcMs: now(),
      });

      if (
        queryPreparation.preparedQuery.normalizedQuery.length === 0 &&
        queryPreparation.request.tags.length === 0
      ) {
        return buildEmptySearchResponse(
          queryPreparation.request,
          finalizeDiagnostics(queryPreparation.diagnostics, []),
        );
      }

      const sourceFederation = await runSourceFederationStage({
        ...queryPreparation,
        loadPagefind: memoizedPagefindLoader,
        loadSearchCatalog,
      });
      const candidateValidation = runCandidateValidationStage(sourceFederation);

      if (candidateValidation.activeBatches.length === 0) {
        addFailure(candidateValidation.diagnostics, 'all-sources-failed');
        return buildEmptySearchResponse(
          candidateValidation.request,
          finalizeDiagnostics(candidateValidation.diagnostics, candidateValidation.batches),
        );
      }

      const candidateMerge = runCandidateMergeStage(candidateValidation);
      const rankingAndSorting = runRankingAndSortingStage(candidateMerge);
      const countsAndDiagnostics = runCountsAndDiagnosticsStage(rankingAndSorting);

      return countsAndDiagnostics.response;
    },
  };
}

export const searchCore = createSearchCore();

export type { PagefindApi, PagefindLoader, SearchCatalogItem };
