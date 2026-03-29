import { loadCatalogSourceBatch } from '../../sources/catalog-source.js';
import {
  loadPagefindSourceBatch,
  type PagefindApi,
  type PagefindLoader,
} from '../../sources/pagefind-source.js';
import type { SearchCatalogItem } from '../../search-catalog.js';
import type { SourceFederationStageOutput, QueryPreparationStageOutput } from '../stage-types.js';

export type LoadSearchCatalog = () => Promise<readonly SearchCatalogItem[]>;

export interface RunSourceFederationStageInput extends QueryPreparationStageOutput {
  loadPagefind: PagefindLoader;
  loadSearchCatalog: LoadSearchCatalog;
}

export async function runSourceFederationStage(
  input: RunSourceFederationStageInput,
): Promise<SourceFederationStageOutput> {
  const [pagefindBatch, catalogBatch] = await Promise.all([
    loadPagefindSourceBatch({
      loadPagefind: input.loadPagefind,
      request: input.request,
      preparedQuery: input.preparedQuery,
      diagnostics: input.diagnostics,
    }),
    loadCatalogSourceBatch({
      loadSearchCatalog: input.loadSearchCatalog,
      diagnostics: input.diagnostics,
    }),
  ]);

  return {
    ...input,
    batches: [pagefindBatch, catalogBatch],
  };
}

export type { PagefindApi, PagefindLoader };
