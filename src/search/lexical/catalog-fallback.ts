import { loadCatalogSourceBatch } from '../sources/catalog-source.js';
import { runQueryPreparationStage } from '../core/stages/query-preparation.js';
import { runCandidateValidationStage } from '../core/stages/candidate-validation.js';
import { runCandidateMergeStage } from '../core/stages/candidate-merge.js';
import { runRankingAndSortingStage } from '../core/stages/ranking-and-sorting.js';
import { runCountsAndDiagnosticsStage } from '../core/stages/counts-and-diagnostics.js';
import {
  loadSearchCatalog,
  type SearchCatalogItem,
} from '../../../shared/search/search-catalog.js';
import { createSearchArtifactUrlResolver } from '../../../shared/search/search-artifact-url.js';
import { createSearchJsonParseDiagnosticSink } from '../../../shared/search/search-diagnostics.js';
import type { LexicalContext } from '../../../shared/search/lexical-protocol.js';
import type { SearchRequest, SearchResponse } from '../../../shared/search/search-types.js';
import { finalizeDiagnostics } from '../diagnostics.js';
import { buildEmptySearchResponse } from '../core/stages/counts-and-diagnostics.js';

/** Catalogの既存metadata意味論を単独実行し、Pagefind loaderを生成・起動しない。 */
export function createCatalogFallback(
  context: LexicalContext,
  isInternal: (path: string) => boolean,
  loader?: (signal: AbortSignal) => Promise<readonly SearchCatalogItem[]>,
) {
  const resolver = createSearchArtifactUrlResolver({ siteUrlContext: context });
  return async (request: SearchRequest, signal: AbortSignal): Promise<SearchResponse> => {
    signal.throwIfAborted();
    const preparation = runQueryPreparationStage({ request, nowUtcMs: Date.now() });
    const batch = await loadCatalogSourceBatch({
      diagnostics: preparation.diagnostics,
      signal,
      loadSearchCatalog: async (diagnostics) =>
        loader
          ? loader(signal)
          : loadSearchCatalog({
              artifactUrlResolver: resolver,
              siteUrlContext: context,
              isInternalDocumentPathname: isInternal,
              signal,
              diagnostics: createSearchJsonParseDiagnosticSink(diagnostics),
            }),
    });
    signal.throwIfAborted();
    const validated = runCandidateValidationStage({ ...preparation, batches: [batch] });
    if (!validated.activeBatches.length)
      return buildEmptySearchResponse(
        request,
        finalizeDiagnostics(validated.diagnostics, validated.batches),
      );
    const ranked = runRankingAndSortingStage(runCandidateMergeStage(validated));
    const result = runCountsAndDiagnosticsStage(ranked, { siteUrlContext: context }).response;
    signal.throwIfAborted();
    return result;
  };
}
