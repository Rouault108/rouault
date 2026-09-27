import { createLexicalSearchCore, type LexicalSearchPort } from '../lexical/search-core.js';
import type { SiteUrlContext } from '../../../shared/site/site-url-context.js';
import type { SearchArtifactUrlResolver } from '../../../shared/search/search-artifact-url.js';
import type { SearchRequest, SearchResponse } from '../../../shared/search/search-types.js';

interface SearchCoreBaseDependencies {
  readonly siteUrlContext: SiteUrlContext;
  readonly isInternalDocumentPathname: (pathname: string) => boolean;
  readonly artifactUrlResolver: SearchArtifactUrlResolver;
}
export type SearchCoreDependencies = SearchCoreBaseDependencies &
  (
    | { readonly runtimeEnvironment: 'production' | 'development' }
    | {
        readonly runtimeEnvironment: 'test';
        readonly testOnlyClient?: LexicalSearchPort;
        readonly testOnlyCatalog?: (
          request: SearchRequest,
          signal: AbortSignal,
        ) => Promise<SearchResponse>;
      }
  );
export interface SearchExecutionOptions {
  signal?: AbortSignal | undefined;
}
export interface SearchCore {
  search(request: SearchRequest, options?: SearchExecutionOptions): Promise<SearchResponse>;
  dispose?(): void;
}

/** 正常経路の意味論はWorkerが所有し、Catalogはlexical failure時だけ起動する。 */
export function createSearchCore(dependencies: SearchCoreDependencies): SearchCore {
  return createLexicalSearchCore({
    context: dependencies.siteUrlContext,
    isInternalDocumentPathname: dependencies.isInternalDocumentPathname,
    ...(dependencies.runtimeEnvironment === 'test' && dependencies.testOnlyClient
      ? { client: dependencies.testOnlyClient }
      : {}),
    ...(dependencies.runtimeEnvironment === 'test' && dependencies.testOnlyCatalog
      ? { catalog: dependencies.testOnlyCatalog }
      : {}),
  });
}
