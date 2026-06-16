import type { SiteUrlContext } from '../site/site-url-context.js';
import { isPathnameInsideBasePath } from '../site/site-url-context.js';
import { normalizeRouaultPathname, sanitizeRouaultSearchParams } from './rouault-url-policy.js';

export type CurrentDocumentClassificationContext =
  | {
      readonly kind: 'manifest-loaded';
      readonly isInternalDocumentPathname: (normalizedPathnameWithoutBasePath: string) => boolean;
    }
  | {
      readonly kind: 'dev-test-missing-manifest-fallback';
      readonly currentDocumentIsInternalDocument?: boolean;
    };

export const stripBasePathFromPathname = (pathname: string, basePath: string): string => {
  if (basePath.length === 0) return pathname;
  if (pathname === basePath) return '/';
  return pathname.startsWith(`${basePath}/`) ? pathname.slice(basePath.length) : pathname;
};

export const applyBasePathToRenderHref = (options: {
  readonly pathname: string;
  readonly search?: string;
  readonly hash?: string;
  readonly siteUrlContext: SiteUrlContext;
}): string => {
  const pathname = options.pathname.startsWith('/') ? options.pathname : `/${options.pathname}`;
  const basePath = options.siteUrlContext.basePath;
  const publicPathname =
    basePath.length === 0 || pathname === '/' ? `${basePath}${pathname}` : `${basePath}${pathname}`;
  return `${publicPathname}${options.search ?? ''}${options.hash ?? ''}`;
};

export const normalizeRouaultUrl = (url: URL): URL => {
  const normalized = new URL(url.toString());
  sanitizeRouaultSearchParams(normalized);
  normalized.pathname = normalizeRouaultPathname(normalized.pathname);
  return normalized;
};

export const normalizeCurrentUrlForLinkClassification = (options: {
  readonly siteUrlContext: SiteUrlContext;
  readonly currentUrl: string;
  readonly context: CurrentDocumentClassificationContext;
}): URL => {
  const raw =
    options.currentUrl === options.siteUrlContext.siteOrigin
      ? `${options.siteUrlContext.siteOrigin}/`
      : options.currentUrl;
  const current = normalizeRouaultUrl(new URL(raw));
  if (current.origin !== options.siteUrlContext.siteOrigin) {
    throw new Error('invalid-current-url');
  }
  if (!isPathnameInsideBasePath(current.pathname, options.siteUrlContext.basePath)) {
    throw new Error('invalid-current-url');
  }

  const pathnameWithoutBasePath = stripBasePathFromPathname(
    current.pathname,
    options.siteUrlContext.basePath,
  );

  if (options.context.kind === 'manifest-loaded') {
    if (!options.context.isInternalDocumentPathname(pathnameWithoutBasePath)) {
      throw new Error('invalid-current-url');
    }
    return current;
  }

  return current;
};
