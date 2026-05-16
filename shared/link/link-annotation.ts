import type { RuntimeEnvironment } from '../runtime/runtime-environment.js';
import type { SiteUrlContext } from '../site/site-url-context.js';
import { isPathnameInsideBasePath } from '../site/site-url-context.js';
import { applyBasePathToRenderHref, normalizeCurrentUrlForLinkClassification, normalizeRouaultUrl, stripBasePathFromPathname, type CurrentDocumentClassificationContext } from '../url/normalize-rouault-url.js';
import { detectUnsafeHref } from './unsafe-href-detector.js';
import { LinkClassificationContractError } from './link-classification-error.js';
import type { LinkKind, SafeLinkKind } from './link-kind.js';
import type { LinkSurface } from './link-surface.js';
import { parseRelTokens } from './rel-tokens.js';

export type RouterInterceptionPolicy = 'intercept' | 'passthrough' | 'block';

export interface LinkClassificationDiagnostic {
  readonly reason: 'dev-test-missing-manifest-fallback';
  readonly pathname: string;
}

export type RouteClassificationMode =
  | {
      readonly kind: 'manifest-loaded';
      readonly isInternalDocumentPathname: (normalizedPathnameWithoutBasePath: string) => boolean;
    }
  | {
      readonly kind: 'dev-test-missing-manifest-fallback';
      readonly runtimeEnvironment: Exclude<RuntimeEnvironment, 'production'>;
      readonly currentDocumentIsInternalDocument?: boolean;
      readonly recordDiagnostic: (diagnostic: LinkClassificationDiagnostic) => void;
    };

export type ResolvedLinkAnnotation =
  | {
      readonly isUnsafe: false;
      readonly rawHref: string;
      readonly sanitizedHref: string;
      readonly renderHref: string;
      readonly kind: SafeLinkKind;
      readonly surface: LinkSurface;
      readonly routerInterceptionPolicy: RouterInterceptionPolicy;
      readonly isExternalWeb: boolean;
      readonly shouldRenderExternalIndicator: boolean;
    }
  | {
      readonly isUnsafe: true;
      readonly rawHref: string;
      readonly sanitizedHref: string;
      readonly kind: 'unsafe';
      readonly surface: LinkSurface;
      readonly routerInterceptionPolicy: 'block';
      readonly isExternalWeb: false;
      readonly shouldRenderExternalIndicator: false;
    };

export interface ClassifyLinkOptions {
  readonly siteUrlContext: SiteUrlContext;
  readonly currentUrl?: string;
  readonly routeClassificationMode: RouteClassificationMode;
  readonly surface?: LinkSurface;
  readonly isInternalResourcePathname?: (pathname: string) => boolean;
  readonly runtimeEnvironment?: RuntimeEnvironment;
  readonly target?: '_blank' | '_self';
  readonly rel?: string;
  readonly noRouter?: boolean;
  readonly download?: boolean | string;
}

export const createManifestLoadedRouteClassificationMode = (options: {
  readonly isInternalDocumentPathname: (normalizedPathnameWithoutBasePath: string) => boolean;
}): RouteClassificationMode => ({ kind: 'manifest-loaded', ...options });

export const createDevTestMissingManifestFallbackMode = (options: {
  readonly runtimeEnvironment: Exclude<RuntimeEnvironment, 'production'>;
  readonly currentDocumentIsInternalDocument?: boolean;
  readonly recordDiagnostic: (diagnostic: LinkClassificationDiagnostic) => void;
}): RouteClassificationMode => ({
  kind: 'dev-test-missing-manifest-fallback',
  runtimeEnvironment: options.runtimeEnvironment,
  currentDocumentIsInternalDocument: options.currentDocumentIsInternalDocument,
  recordDiagnostic: options.recordDiagnostic,
});

export const assertRouteClassificationModeAllowed = (options: {
  readonly mode: RouteClassificationMode;
  readonly runtimeEnvironment: RuntimeEnvironment;
}): void => {
  if (options.runtimeEnvironment === 'production' && options.mode.kind !== 'manifest-loaded') {
    throw new LinkClassificationContractError('invalid-route-classification-mode', 'production runtime cannot use dev/test route classification fallback.');
  }
};

export const toCurrentDocumentClassificationContext = (
  mode: RouteClassificationMode,
): CurrentDocumentClassificationContext =>
  mode.kind === 'manifest-loaded'
    ? { kind: 'manifest-loaded', isInternalDocumentPathname: mode.isInternalDocumentPathname }
    : {
        kind: 'dev-test-missing-manifest-fallback',
        currentDocumentIsInternalDocument: mode.currentDocumentIsInternalDocument,
      };

export const isDefaultInternalResourcePathname = (pathname: string): boolean =>
  pathname.startsWith('/assets/') ||
  pathname.startsWith('/static/') ||
  pathname.startsWith('/media/') ||
  pathname.startsWith('/content-assets/') ||
  pathname.startsWith('/example-assets/') ||
  pathname.startsWith('/client-assets/') ||
  pathname.startsWith('/pagefind/') ||
  pathname.startsWith('/__router/') ||
  pathname === '/favicon.ico' ||
  pathname === '/robots.txt' ||
  pathname === '/sitemap.xml' ||
  pathname === '/search-catalog.json' ||
  /\.[^/]+$/u.test(pathname);

const RELATIVE_URL_REQUIRES_CURRENT_URL_RE = /^(?:[?#]|\.{1,2}(?:[/?#]|$)|[^:/?#]+(?:[/?#]|$))/u;
const HAS_EXPLICIT_SCHEME_RE = /^[A-Za-z][A-Za-z0-9+.-]*:/u;

const requiresCurrentUrlForClassification = (href: string): boolean =>
  !href.startsWith('/') && !href.startsWith('//') && !HAS_EXPLICIT_SCHEME_RE.test(href) && RELATIVE_URL_REQUIRES_CURRENT_URL_RE.test(href);

const resolveRouterInterceptionPolicy = (
  kind: LinkKind,
  options: Pick<ClassifyLinkOptions, 'target' | 'rel' | 'noRouter' | 'download'>,
): RouterInterceptionPolicy => {
  if (kind === 'unsafe') return 'block';
  if (kind !== 'internal-document') return 'passthrough';
  if (options.target === '_blank') return 'passthrough';
  if (options.download !== undefined && options.download !== false) return 'passthrough';
  if (options.noRouter === true) return 'passthrough';
  if (parseRelTokens(options.rel).includes('external')) return 'passthrough';
  return 'intercept';
};

const annotation = (options: {
  rawHref: string;
  sanitizedHref: string;
  renderHref?: string;
  kind: LinkKind;
  surface: LinkSurface;
  classificationOptions: Pick<ClassifyLinkOptions, 'target' | 'rel' | 'noRouter' | 'download'>;
}): ResolvedLinkAnnotation => {
  if (options.kind === 'unsafe') {
    return {
      isUnsafe: true,
      rawHref: options.rawHref,
      sanitizedHref: options.sanitizedHref,
      kind: 'unsafe',
      surface: options.surface,
      routerInterceptionPolicy: 'block',
      isExternalWeb: false,
      shouldRenderExternalIndicator: false,
    };
  }
  return {
    isUnsafe: false,
    rawHref: options.rawHref,
    sanitizedHref: options.sanitizedHref,
    renderHref: options.renderHref ?? options.sanitizedHref,
    kind: options.kind,
    surface: options.surface,
    routerInterceptionPolicy: resolveRouterInterceptionPolicy(options.kind, options.classificationOptions),
    isExternalWeb: options.kind === 'external-web',
    shouldRenderExternalIndicator: options.kind === 'external-web',
  };
};

export const classifyLinkHref = (options: ClassifyLinkOptions & { readonly href: string }): ResolvedLinkAnnotation => {
  assertRouteClassificationModeAllowed({
    mode: options.routeClassificationMode,
    runtimeEnvironment: options.runtimeEnvironment ?? 'production',
  });
  const surface = options.surface ?? 'prose';
  const unsafe = detectUnsafeHref(options.href);
  if (!unsafe.ok) return annotation({ rawHref: options.href, sanitizedHref: options.href.trim(), kind: 'unsafe', surface, classificationOptions: options });
  const sanitizedHref = options.href.trim();
  if (!options.currentUrl && requiresCurrentUrlForClassification(sanitizedHref)) {
    throw new LinkClassificationContractError(
      'invalid-relative-url',
      'relative, query-only, and hash-only href values require currentUrl for link classification.',
    );
  }
  const needsCurrentUrl = requiresCurrentUrlForClassification(sanitizedHref);
  let base: URL;
  try {
    base = options.currentUrl && needsCurrentUrl
      ? normalizeCurrentUrlForLinkClassification({ siteUrlContext: options.siteUrlContext, currentUrl: options.currentUrl, context: toCurrentDocumentClassificationContext(options.routeClassificationMode) })
      : new URL(`${options.siteUrlContext.siteOrigin}${options.siteUrlContext.basePath || '/'}`);
  } catch (error) {
    if (error instanceof LinkClassificationContractError) {
      throw error;
    }
    throw new LinkClassificationContractError(
      'invalid-current-url',
      'currentUrl must be a same-origin absolute URL inside SiteUrlContext.basePath.',
    );
  }
  const resolved = normalizeRouaultUrl(new URL(sanitizedHref, base));
  if (resolved.protocol === 'mailto:' || resolved.protocol === 'tel:') return annotation({ rawHref: options.href, sanitizedHref, renderHref: sanitizedHref, kind: 'external-action', surface, classificationOptions: options });
  if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return annotation({ rawHref: options.href, sanitizedHref, kind: 'unsafe', surface, classificationOptions: options });
  if (resolved.origin !== options.siteUrlContext.siteOrigin) return annotation({ rawHref: options.href, sanitizedHref, renderHref: resolved.href, kind: 'external-web', surface, classificationOptions: options });
  if (!isPathnameInsideBasePath(resolved.pathname, options.siteUrlContext.basePath)) return annotation({ rawHref: options.href, sanitizedHref, renderHref: `${resolved.pathname}${resolved.search}${resolved.hash}`, kind: 'internal-resource', surface, classificationOptions: options });
  const pathname = stripBasePathFromPathname(resolved.pathname, options.siteUrlContext.basePath);
  const current = options.currentUrl && needsCurrentUrl ? base : null;
  if (current && resolved.pathname === current.pathname && resolved.search === current.search && resolved.hash.length > 0) {
    const currentPathname = stripBasePathFromPathname(current.pathname, options.siteUrlContext.basePath);
    const currentDocumentIsInternal = options.routeClassificationMode.kind === 'manifest-loaded'
      ? options.routeClassificationMode.isInternalDocumentPathname(currentPathname) &&
        options.routeClassificationMode.isInternalDocumentPathname(pathname)
      : options.routeClassificationMode.currentDocumentIsInternalDocument === true;
    if (currentDocumentIsInternal) {
      return annotation({ rawHref: options.href, sanitizedHref, renderHref: resolved.hash, kind: 'internal-fragment', surface, classificationOptions: options });
    }
  }
  if (options.routeClassificationMode.kind === 'manifest-loaded') {
    if (options.routeClassificationMode.isInternalDocumentPathname(pathname)) {
      return annotation({ rawHref: options.href, sanitizedHref, renderHref: applyBasePathToRenderHref({ pathname, search: resolved.search, hash: resolved.hash, siteUrlContext: options.siteUrlContext }), kind: 'internal-document', surface, classificationOptions: options });
    }
  } else {
    options.routeClassificationMode.recordDiagnostic({ reason: 'dev-test-missing-manifest-fallback', pathname });
  }
  const resource = isDefaultInternalResourcePathname(pathname) || options.isInternalResourcePathname?.(pathname) === true;
  return annotation({ rawHref: options.href, sanitizedHref, renderHref: applyBasePathToRenderHref({ pathname, search: resolved.search, hash: resolved.hash, siteUrlContext: options.siteUrlContext }), kind: resource ? 'internal-resource' : 'internal-resource', surface, classificationOptions: options });
};
