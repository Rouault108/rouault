import type { SiteUrlContext } from '../site/site-url-context.js';
export interface SearchArtifactUrlResolver {
  readonly resolveSearchCatalogUrl: () => string;
}

export interface CreateSearchArtifactUrlResolverOptions {
  readonly siteUrlContext: SiteUrlContext;
}

export const createSearchArtifactUrlResolver = (
  options: CreateSearchArtifactUrlResolverOptions,
): SearchArtifactUrlResolver => {
  const basePath = options.siteUrlContext.basePath;
  const prefix = basePath === '' ? '' : basePath;

  return {
    resolveSearchCatalogUrl: () => `${prefix}/search-catalog.json`,
  };
};

export const resolveSearchCatalogUrl = (siteUrlContext: SiteUrlContext): string =>
  createSearchArtifactUrlResolver({ siteUrlContext }).resolveSearchCatalogUrl();
