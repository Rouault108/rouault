import type { SearchCanonicalPathname } from './document-url.js';
import { validateJsonContentType } from '../http/media-type.js';
import type {
  LoadSearchCatalogOptions,
  SearchCatalogFetcher,
  TestLoadSearchCatalogOptions,
} from './search-loaders.js';
import { createSearchJsonParseDiagnosticSink } from './search-diagnostics.js';
import { parseSearchCatalogJson } from './search-json-artifact-parser.js';

export interface SearchCatalogItem {
  title: string;
  canonicalPathname: SearchCanonicalPathname;
  description?: string;
  date?: string;
  keywords?: readonly string[];
  tags?: readonly string[];
}

export class SearchCatalogLoadError extends Error {
  constructor(
    readonly code: 'catalog-fetch-failed' | 'catalog-normalize-failed',
    message: string,
  ) {
    super(message);
    this.name = 'SearchCatalogLoadError';
  }
}

const defaultSearchCatalogFetcher: SearchCatalogFetcher = async (url, init) => fetch(url, init);

const isTestLoadSearchCatalogOptions = (
  options: LoadSearchCatalogOptions | TestLoadSearchCatalogOptions,
): options is TestLoadSearchCatalogOptions =>
  'runtimeEnvironment' in options && options.runtimeEnvironment === 'test';

export async function loadSearchCatalog(
  options: LoadSearchCatalogOptions | TestLoadSearchCatalogOptions,
): Promise<readonly SearchCatalogItem[]> {
  const fetcher =
    isTestLoadSearchCatalogOptions(options) && options.testOnlyFetcher
      ? options.testOnlyFetcher
      : defaultSearchCatalogFetcher;
  const url = options.artifactUrlResolver.resolveSearchCatalogUrl();
  let response;

  try {
    response = await fetcher(url, {
      credentials: 'same-origin',
      redirect: 'manual',
      ...(options.signal ? { signal: options.signal } : {}),
    });
  } catch (error: unknown) {
    options.diagnostics?.addIssue({
      code: 'invalid-search-catalog-schema',
      artifactSource: 'search-catalog-json',
    });
    throw new SearchCatalogLoadError(
      'catalog-fetch-failed',
      error instanceof Error ? error.message : '検索カタログの取得に失敗しました。',
    );
  }

  if (response.type === 'opaqueredirect' || response.redirected || !response.ok) {
    options.diagnostics?.addIssue({
      code: 'invalid-search-catalog-schema',
      artifactSource: 'search-catalog-json',
    });
    throw new SearchCatalogLoadError(
      'catalog-fetch-failed',
      `検索カタログの読み込みに失敗しました: ${response.status.toString()}`,
    );
  }

  const contentType = validateJsonContentType(response.headers.get('content-type'));
  if (!contentType.ok) {
    options.diagnostics?.addIssue({
      code: 'invalid-search-catalog-schema',
      artifactSource: 'search-catalog-json',
    });
    throw new SearchCatalogLoadError(
      'catalog-fetch-failed',
      '検索カタログの Content-Type が不正です。',
    );
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch (error: unknown) {
    options.diagnostics?.addIssue({ code: 'invalid-json', artifactSource: 'search-catalog-json' });
    throw new SearchCatalogLoadError(
      'catalog-normalize-failed',
      error instanceof Error ? error.message : '検索カタログ JSON の解析に失敗しました。',
    );
  }

  const diagnostics = options.diagnostics ?? createSearchJsonParseDiagnosticSink({ issues: [] });
  const parsed = parseSearchCatalogJson({
    value: payload,
    siteUrlContext: options.siteUrlContext,
    diagnostics,
    isInternalDocumentPathname: options.isInternalDocumentPathname,
  });
  if (!parsed.ok) {
    throw new SearchCatalogLoadError(
      'catalog-normalize-failed',
      '検索カタログ JSON の schema が不正です。',
    );
  }
  return parsed.items;
}

export async function loadSearchCatalogFromDefaultSource(
  options: LoadSearchCatalogOptions | TestLoadSearchCatalogOptions,
): Promise<readonly SearchCatalogItem[]> {
  return loadSearchCatalog(options);
}

export function resetSearchCatalogCache(): void {
  // Search catalog caching was removed from the production module-level boundary.
}
