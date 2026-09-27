import type { SiteUrlContext } from '../site/site-url-context.js';
import type { SearchArtifactUrlResolver } from './search-artifact-url.js';
import type { SearchCatalogItem } from './search-catalog.js';
import { loadSearchCatalog as loadSearchCatalogImpl } from './search-catalog.js';
import type { SearchJsonParseDiagnosticSink } from './search-diagnostics.js';

export type SearchCatalogLoadFailureCode = 'catalog-fetch-failed' | 'catalog-normalize-failed';

export interface SearchFetchResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly type: Response['type'];
  readonly redirected: boolean;
  readonly headers: Pick<Headers, 'get'>;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

export type SearchCatalogFetcher = (
  url: string,
  init: {
    readonly redirect: 'manual';
    readonly credentials: 'same-origin';
    readonly signal?: AbortSignal;
  },
) => Promise<SearchFetchResponse>;

export interface LoadSearchCatalogOptions {
  readonly artifactUrlResolver: SearchArtifactUrlResolver;
  readonly siteUrlContext: SiteUrlContext;
  readonly isInternalDocumentPathname: (normalizedPathnameWithoutBasePath: string) => boolean;
  readonly diagnostics?: SearchJsonParseDiagnosticSink;
  readonly signal?: AbortSignal;
}

export interface TestLoadSearchCatalogOptions extends LoadSearchCatalogOptions {
  readonly runtimeEnvironment: 'test';
  readonly testOnlyFetcher?: SearchCatalogFetcher;
}

export type LoadSearchCatalog = (
  options: LoadSearchCatalogOptions | TestLoadSearchCatalogOptions,
) => Promise<readonly SearchCatalogItem[]>;

export const loadSearchCatalog: LoadSearchCatalog = (options) => loadSearchCatalogImpl(options);
