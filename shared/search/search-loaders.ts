import type { SiteUrlContext } from '../site/site-url-context.js';
import { resolvePagefindModuleUrl, type SearchArtifactUrlResolver } from './search-artifact-url.js';
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

export type PagefindFilterExpression = string | readonly string[] | Record<string, unknown>;

export interface PagefindSearchOptions {
  readonly filters?: Record<string, PagefindFilterExpression>;
  readonly sort?: Record<string, 'asc' | 'desc'>;
}

export interface PagefindFragmentData {
  readonly url: string;
  readonly excerpt?: string;
  readonly meta?: Record<string, string>;
  readonly raw_content?: string;
}

export interface PagefindSearchResult {
  data(): Promise<PagefindFragmentData>;
}

export interface PagefindSearchResponse {
  readonly results: readonly PagefindSearchResult[];
  readonly unfilteredResultCount: number;
}

export interface PagefindApi {
  readonly filters: () => Promise<Record<string, Record<string, number>>>;
  readonly search: (
    query: string | null,
    options?: PagefindSearchOptions,
  ) => Promise<PagefindSearchResponse>;
  readonly options?: (options: { readonly basePath: string }) => Promise<void> | void;
}

export type PagefindLoader = () => Promise<PagefindApi>;

export interface ProductionPagefindLoaderDependencies {
  readonly runtimeEnvironment: 'production' | 'development';
  readonly artifactUrlResolver: SearchArtifactUrlResolver;
}

export interface TestPagefindLoaderDependencies {
  readonly runtimeEnvironment: 'test';
  readonly artifactUrlResolver: SearchArtifactUrlResolver;
  readonly testOnlyFetchModule?: (
    moduleUrl: string,
    init: {
      readonly redirect: 'manual';
      readonly credentials: 'same-origin';
    },
  ) => Promise<SearchFetchResponse>;
  readonly testOnlyImportModule?: (moduleUrl: string) => Promise<unknown>;
  readonly testOnlyCreateModuleUrl?: (moduleSource: string) => string;
  readonly testOnlyRevokeModuleUrl?: (moduleUrl: string) => void;
}

export type DefaultPagefindLoaderDependencies =
  | ProductionPagefindLoaderDependencies
  | TestPagefindLoaderDependencies;

export type LoadSearchCatalog = (
  options: LoadSearchCatalogOptions | TestLoadSearchCatalogOptions,
) => Promise<readonly SearchCatalogItem[]>;

export const loadSearchCatalog: LoadSearchCatalog = (options) => loadSearchCatalogImpl(options);

const defaultPagefindModuleFetcher = async (
  moduleUrl: string,
  init: { readonly redirect: 'manual'; readonly credentials: 'same-origin' },
): Promise<SearchFetchResponse> => fetch(moduleUrl, init);

const createPagefindModuleUrl = (moduleSource: string): string => {
  const blob = new Blob([moduleSource], { type: 'text/javascript' });
  return URL.createObjectURL(blob);
};

const importPagefindModule = (moduleUrl: string): Promise<unknown> =>
  import(/* @vite-ignore */ moduleUrl);

const assertJavaScriptContentType = (contentType: string | null): void => {
  const normalized = contentType?.split(';')[0]?.trim().toLowerCase() ?? '';
  if (
    ![
      'text/javascript',
      'application/javascript',
      'text/ecmascript',
      'application/ecmascript',
    ].includes(normalized)
  ) {
    throw new Error('Pagefind module の Content-Type が不正です。');
  }
};

const isPagefindModule = (value: unknown): value is PagefindApi => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<PagefindApi>;
  return typeof candidate.filters === 'function' && typeof candidate.search === 'function';
};

export const createDefaultPagefindLoader = (
  dependencies: DefaultPagefindLoaderDependencies,
): PagefindLoader => {
  const fetchModule =
    dependencies.runtimeEnvironment === 'test' && dependencies.testOnlyFetchModule
      ? dependencies.testOnlyFetchModule
      : defaultPagefindModuleFetcher;
  const importModule =
    dependencies.runtimeEnvironment === 'test' && dependencies.testOnlyImportModule
      ? dependencies.testOnlyImportModule
      : importPagefindModule;
  const createModuleUrl =
    dependencies.runtimeEnvironment === 'test' && dependencies.testOnlyCreateModuleUrl
      ? dependencies.testOnlyCreateModuleUrl
      : createPagefindModuleUrl;
  const revokeModuleUrl =
    dependencies.runtimeEnvironment === 'test' && dependencies.testOnlyRevokeModuleUrl
      ? dependencies.testOnlyRevokeModuleUrl
      : (moduleUrl: string): void => {
          URL.revokeObjectURL(moduleUrl);
        };

  return async (): Promise<PagefindApi> => {
    const pagefindBaseUrl = dependencies.artifactUrlResolver.resolvePagefindBaseUrl();
    const response = await fetchModule(resolvePagefindModuleUrl(dependencies.artifactUrlResolver), {
      redirect: 'manual',
      credentials: 'same-origin',
    });
    if (response.type === 'opaqueredirect' || response.redirected || !response.ok) {
      throw new Error(`Pagefind module の読み込みに失敗しました: ${response.status.toString()}`);
    }
    assertJavaScriptContentType(response.headers.get('content-type'));

    const moduleSource = await response.text();
    const moduleUrl = createModuleUrl(moduleSource);
    try {
      const imported = await importModule(moduleUrl);
      if (!isPagefindModule(imported)) {
        throw new Error('Pagefind module shape is invalid.');
      }
      if (typeof imported.options === 'function') {
        await imported.options({ basePath: pagefindBaseUrl });
      }
      return {
        filters: imported.filters,
        search: imported.search,
        ...(imported.options ? { options: imported.options } : {}),
      };
    } finally {
      revokeModuleUrl(moduleUrl);
    }
  };
};
