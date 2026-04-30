import { loadCatalogSourceBatch } from '../../sources/catalog-source.js';
import { throwIfAborted } from '../../abort.js';
import {
  loadPagefindSourceBatch,
  type PagefindApi,
  type PagefindLoader,
} from '../../sources/pagefind-source.js';
import type { SearchCatalogItem } from '../../../../shared/search/search-catalog.js';
import type { SourceFederationStageOutput, QueryPreparationStageOutput } from '../stage-types.js';

export type LoadSearchCatalog = () => Promise<readonly SearchCatalogItem[]>;

export interface RunSourceFederationStageInput extends QueryPreparationStageOutput {
  loadPagefind: PagefindLoader;
  loadSearchCatalog: LoadSearchCatalog;
  signal?: AbortSignal | undefined;
}

export async function runSourceFederationStage(
  input: RunSourceFederationStageInput,
): Promise<SourceFederationStageOutput> {
  throwIfAborted(input.signal);

  const [pagefindBatch, catalogBatch] = await Promise.all([
    loadPagefindSourceBatch({
      loadPagefind: input.loadPagefind,
      request: input.request,
      preparedQuery: input.preparedQuery,
      diagnostics: input.diagnostics,
      signal: input.signal,
    }),
    loadCatalogSourceBatch({
      loadSearchCatalog: input.loadSearchCatalog,
      diagnostics: input.diagnostics,
      signal: input.signal,
    }),
  ]);

  throwIfAborted(input.signal);

  return {
    ...input,
    batches: [pagefindBatch, catalogBatch],
  };
}

export type { PagefindApi, PagefindLoader };
