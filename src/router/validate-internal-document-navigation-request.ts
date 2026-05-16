import { detectUnsafeHref } from '../../shared/link/unsafe-href-detector.js';
import type { SiteUrlContext } from '../../shared/site/site-url-context.js';
import { isPathnameInsideBasePath } from '../../shared/site/site-url-context.js';
import {
  normalizeRouaultUrl,
  stripBasePathFromPathname,
} from '../../shared/url/normalize-rouault-url.js';
import type { InternalDocumentRouteManifestState } from './internal-document-route-manifest-loader.js';
import { toInternalDocumentNormalizedUrl, type InternalDocumentNormalizedUrl } from './internal-document-normalized-url.js';

export type NavigationValidationFailureReason =
  | 'disallowed-url'
  | 'route-manifest-unavailable'
  | 'route-manifest-invalid'
  | 'route-manifest-stale';

export type InternalDocumentNavigationValidationResult =
  | { readonly ok: true; readonly normalizedUrl: InternalDocumentNormalizedUrl }
  | { readonly ok: false; readonly reason: NavigationValidationFailureReason };

const reasonFor = (state: InternalDocumentRouteManifestState): NavigationValidationFailureReason =>
  state.status === 'invalid'
    ? 'route-manifest-invalid'
    : state.status === 'stale'
      ? 'route-manifest-stale'
      : 'route-manifest-unavailable';

export const validateInternalDocumentNavigationRequest = (options: {
  readonly requestedUrl: string;
  readonly currentUrl: string;
  readonly siteUrlContext: SiteUrlContext;
  readonly routeManifestState: InternalDocumentRouteManifestState;
}): InternalDocumentNavigationValidationResult => {
  const unsafe = detectUnsafeHref(options.requestedUrl);
  if (!unsafe.ok) return { ok: false, reason: 'disallowed-url' };

  let url: URL;
  try {
    url = normalizeRouaultUrl(new URL(options.requestedUrl, options.currentUrl));
  } catch {
    return { ok: false, reason: 'disallowed-url' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { ok: false, reason: 'disallowed-url' };
  if (url.username.length > 0 || url.password.length > 0) return { ok: false, reason: 'disallowed-url' };
  if (url.origin !== options.siteUrlContext.siteOrigin) return { ok: false, reason: 'disallowed-url' };
  if (!isPathnameInsideBasePath(url.pathname, options.siteUrlContext.basePath)) return { ok: false, reason: 'disallowed-url' };
  if (options.routeManifestState.status !== 'loaded') return { ok: false, reason: reasonFor(options.routeManifestState) };

  const pathname = stripBasePathFromPathname(url.pathname, options.siteUrlContext.basePath);
  if (!options.routeManifestState.routeSet.has(pathname)) return { ok: false, reason: 'disallowed-url' };

  return { ok: true, normalizedUrl: toInternalDocumentNormalizedUrl(`${url.pathname}${url.search}${url.hash}`) };
};
