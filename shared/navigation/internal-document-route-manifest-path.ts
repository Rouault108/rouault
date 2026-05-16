import type { SiteUrlContext } from '../site/site-url-context.js';

export const INTERNAL_DOCUMENT_ROUTE_MANIFEST_VERSION = 1 as const;
export const INTERNAL_DOCUMENT_ROUTE_MANIFEST_PATHNAME = '/assets/internal-document-routes.json';

const applyBasePath = (basePath: string, pathname: string): string => {
  if (basePath.length === 0) {
    return pathname;
  }

  return `${basePath}${pathname}`;
};

export const resolveInternalDocumentRouteManifestPathname = (
  siteUrlContext: SiteUrlContext,
): string => applyBasePath(siteUrlContext.basePath, INTERNAL_DOCUMENT_ROUTE_MANIFEST_PATHNAME);

export const resolveInternalDocumentRouteManifestUrl = (options: {
  readonly siteUrlContext: SiteUrlContext;
  readonly buildId: string;
}): string => {
  const pathname = resolveInternalDocumentRouteManifestPathname(options.siteUrlContext);
  return `${pathname}?buildId=${encodeURIComponent(options.buildId)}`;
};
