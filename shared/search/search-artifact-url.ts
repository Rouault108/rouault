import type { SiteUrlContext } from '../site/site-url-context.js';
import { hasAsciiControlCharacter } from '../string/ascii-control.js';

const withTrailingSlash = (value: string): string => value.replace(/\/?$/u, '/');
const ASSET_UNSAFE_RE = /[?#\\]/u;
const SCHEME_RE = /^[A-Za-z][A-Za-z0-9+.-]*:/u;

const normalizePagefindAssetPath = (assetPath: string): string => {
  const trimmed = assetPath.trim();
  if (trimmed.length === 0 || trimmed.startsWith('/') || trimmed.startsWith('//')) {
    throw new Error('Pagefind asset path must be a non-empty relative path.');
  }
  if (SCHEME_RE.test(trimmed) || trimmed.startsWith('pagefind/')) {
    throw new Error('Pagefind asset path must be relative to /pagefind/.');
  }
  if (
    ASSET_UNSAFE_RE.test(trimmed) ||
    hasAsciiControlCharacter(trimmed) ||
    trimmed.includes('%2f') ||
    trimmed.includes('%2F') ||
    trimmed.includes('%5c') ||
    trimmed.includes('%5C')
  ) {
    throw new Error('Pagefind asset path contains unsafe characters.');
  }
  const segments = trimmed.split('/');
  if (segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')) {
    throw new Error('Pagefind asset path must not contain dot or empty segments.');
  }
  return segments.join('/');
};

export interface SearchArtifactUrlResolver {
  readonly resolveSearchCatalogUrl: () => string;
  readonly resolvePagefindBaseUrl: () => string;
  readonly resolvePagefindAssetUrl: (assetPath: string) => string;
}

export interface CreateSearchArtifactUrlResolverOptions {
  readonly siteUrlContext: SiteUrlContext;
}

export const createSearchArtifactUrlResolver = (
  options: CreateSearchArtifactUrlResolverOptions,
): SearchArtifactUrlResolver => {
  const basePath = options.siteUrlContext.basePath;
  const prefix = basePath === '' ? '' : basePath;
  const pagefindBaseUrl = `${prefix}/pagefind/`;

  return {
    resolveSearchCatalogUrl: () => `${prefix}/search-catalog.json`,
    resolvePagefindBaseUrl: () => pagefindBaseUrl,
    resolvePagefindAssetUrl: (assetPath: string) => {
      const normalizedAssetPath = normalizePagefindAssetPath(assetPath);
      return `${withTrailingSlash(pagefindBaseUrl)}${normalizedAssetPath}`;
    },
  };
};

export const resolveSearchCatalogUrl = (siteUrlContext: SiteUrlContext): string =>
  createSearchArtifactUrlResolver({ siteUrlContext }).resolveSearchCatalogUrl();

export const resolvePagefindBaseUrl = (siteUrlContext: SiteUrlContext): string =>
  createSearchArtifactUrlResolver({ siteUrlContext }).resolvePagefindBaseUrl();

export const resolvePagefindModuleUrl = (resolver: SearchArtifactUrlResolver): string =>
  resolver.resolvePagefindAssetUrl('pagefind.js');
