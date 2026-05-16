import { addFailure, finalizeDiagnostics, type MutableDiagnostics } from '../diagnostics.js';
import { throwIfAborted } from '../abort.js';
import { type SearchCatalogItem } from '../../../shared/search/search-catalog.js';
import type { SiteUrlContext } from '../../../shared/site/site-url-context.js';
import {
  createDefaultPagefindLoader,
  loadSearchCatalog,
  type PagefindApi,
  type PagefindLoader,
  type SearchCatalogFetcher,
} from '../../../shared/search/search-loaders.js';
import { createSearchJsonParseDiagnosticSink } from '../../../shared/search/search-diagnostics.js';
import type { SearchArtifactUrlResolver } from '../../../shared/search/search-artifact-url.js';
import type { SearchRequest, SearchResponse } from '../../../shared/search/search-types.js';
import {
  runSourceFederationStage,
} from './stages/source-federation.js';
import { runCandidateMergeStage } from './stages/candidate-merge.js';
import {
  buildEmptySearchResponse,
  runCountsAndDiagnosticsStage,
} from './stages/counts-and-diagnostics.js';
import { runCandidateValidationStage } from './stages/candidate-validation.js';
import { runQueryPreparationStage } from './stages/query-preparation.js';
import { runRankingAndSortingStage } from './stages/ranking-and-sorting.js';

export interface SearchCoreBaseDependencies {
  readonly now?: () => number;
  readonly siteUrlContext: SiteUrlContext;
  readonly isInternalDocumentPathname: (
    normalizedPathnameWithoutBasePath: string,
  ) => boolean;
  readonly artifactUrlResolver: SearchArtifactUrlResolver;
}

export interface ProductionSearchCoreDependencies extends SearchCoreBaseDependencies {
  readonly runtimeEnvironment: 'production' | 'development';
}

export interface TestSearchCoreDependencies extends SearchCoreBaseDependencies {
  readonly runtimeEnvironment: 'test';
  readonly testOnlyLoadPagefind?: PagefindLoader;
  readonly testOnlySearchCatalogFetcher?: SearchCatalogFetcher;
}

export type SearchCoreDependencies =
  | ProductionSearchCoreDependencies
  | TestSearchCoreDependencies;

export interface SearchExecutionOptions {
  signal?: AbortSignal | undefined;
}

export interface SearchCore {
  search(request: SearchRequest, options?: SearchExecutionOptions): Promise<SearchResponse>;
}

export function createSearchCore(
  dependencies: SearchCoreDependencies,
): SearchCore {
  const loadPagefind =
    dependencies.runtimeEnvironment === 'test' && dependencies.testOnlyLoadPagefind
      ? dependencies.testOnlyLoadPagefind
      : createDefaultPagefindLoader({
          runtimeEnvironment: dependencies.runtimeEnvironment,
          artifactUrlResolver: dependencies.artifactUrlResolver,
        });
  const loadSearchCatalogSource = (diagnostics: MutableDiagnostics) =>
    loadSearchCatalog({
      artifactUrlResolver: dependencies.artifactUrlResolver,
      siteUrlContext: dependencies.siteUrlContext,
      isInternalDocumentPathname: dependencies.isInternalDocumentPathname,
      diagnostics: createSearchJsonParseDiagnosticSink(diagnostics),
      ...(dependencies.runtimeEnvironment === 'test'
        ? {
            runtimeEnvironment: 'test' as const,
            ...(dependencies.testOnlySearchCatalogFetcher
              ? { testOnlyFetcher: dependencies.testOnlySearchCatalogFetcher }
              : {}),
          }
        : {}),
    });
  const now = dependencies.now ?? (() => Date.now());

  let pagefindApi: PagefindApi | null = null;
  let pagefindPromise: Promise<PagefindApi> | null = null;

  const memoizedPagefindLoader: PagefindLoader = async () => {
    if (pagefindApi !== null) {
      return pagefindApi;
    }

    pagefindPromise ??= loadPagefind()
      .then((api) => {
        pagefindApi = api;
        return api;
      })
      .catch((error: unknown) => {
        pagefindPromise = null;
        throw error;
      });
    return pagefindPromise;
  };

  return {
    async search(
      request: SearchRequest,
      options: SearchExecutionOptions = {},
    ): Promise<SearchResponse> {
      const { signal } = options;
      throwIfAborted(signal);

      const queryPreparation = runQueryPreparationStage({
        request,
        nowUtcMs: now(),
      });

      throwIfAborted(signal);

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
        loadSearchCatalog: loadSearchCatalogSource,
        siteUrlContext: dependencies.siteUrlContext,
        signal,
      });
      throwIfAborted(signal);

      const candidateValidation = runCandidateValidationStage(sourceFederation);
      throwIfAborted(signal);

      if (candidateValidation.activeBatches.length === 0) {
        addFailure(candidateValidation.diagnostics, 'all-sources-failed');
        return buildEmptySearchResponse(
          candidateValidation.request,
          finalizeDiagnostics(candidateValidation.diagnostics, candidateValidation.batches),
        );
      }

      const candidateMerge = runCandidateMergeStage(candidateValidation);
      throwIfAborted(signal);
      const rankingAndSorting = runRankingAndSortingStage(candidateMerge);
      throwIfAborted(signal);
      const countsAndDiagnostics = runCountsAndDiagnosticsStage(rankingAndSorting, {
        siteUrlContext: dependencies.siteUrlContext,
      });
      throwIfAborted(signal);

      return countsAndDiagnostics.response;
    },
  };
}


export type { PagefindApi, PagefindLoader, SearchCatalogItem };
