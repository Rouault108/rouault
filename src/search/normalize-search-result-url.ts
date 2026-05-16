import type { SiteUrlContext } from '../../shared/site/site-url-context.js';
import { buildSearchRenderHref, type SearchCanonicalPathname, type SearchRenderHref } from '../../shared/search/document-url.js';

export { type SearchCanonicalPathname, type SearchRenderHref };

export const buildSearchResultRenderHref = (options: {
  readonly canonicalPathname: SearchCanonicalPathname;
  readonly siteUrlContext: SiteUrlContext;
}): SearchRenderHref => buildSearchRenderHref({ canonicalPathname: options.canonicalPathname, basePath: options.siteUrlContext.basePath });
