import { loadCatalogSourceBatch } from '../../sources/catalog-source.js';
import { throwIfAborted } from '../../abort.js';
import { loadPagefindSourceBatch } from '../../sources/pagefind-source.js';
import type { PagefindApi, PagefindLoader } from '../../../../shared/search/search-loaders.js';
import type { SearchCatalogItem } from '../../../../shared/search/search-catalog.js';
import type { SiteUrlContext } from '../../../../shared/site/site-url-context.js';
import type { SourceFederationStageOutput, QueryPreparationStageOutput } from '../stage-types.js';
import type { MutableDiagnostics } from '../../diagnostics.js';

export type LoadSearchCatalog = (
  diagnostics: MutableDiagnostics,
) => Promise<readonly SearchCatalogItem[]>;

export interface RunSourceFederationStageInput extends QueryPreparationStageOutput {
  loadPagefind: PagefindLoader;
  loadSearchCatalog: LoadSearchCatalog;
  siteUrlContext: SiteUrlContext;
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
      siteUrlContext: input.siteUrlContext,
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
