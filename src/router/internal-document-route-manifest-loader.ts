import {
  assertInternalDocumentRouteManifestMatches,
  parseInternalDocumentRouteManifest,
  toInternalDocumentRouteSet,
  type InternalDocumentRouteManifest,
} from '../../shared/navigation/internal-document-route-manifest.js';
import { INTERNAL_DOCUMENT_ROUTE_MANIFEST_VERSION } from '../../shared/navigation/internal-document-route-manifest-path.js';
import type { InternalDocumentRouteSet } from '../../shared/navigation/internal-document-route-set.js';
import {
  createSiteUrlContext,
  isPathnameInsideBasePath,
  type SiteUrlContext,
} from '../../shared/site/site-url-context.js';
import { validateJsonContentType } from '../../shared/http/media-type.js';


export type InternalDocumentRouteManifestFailureReason =
  | 'route-manifest-unavailable'
  | 'route-manifest-invalid'
  | 'route-manifest-stale';

export type InternalDocumentRouteManifestState =
  | {
      readonly status: 'loaded';
      readonly manifest: InternalDocumentRouteManifest;
      readonly routeSet: InternalDocumentRouteSet;
    }
  | {
      readonly status: 'unavailable';
      readonly reason: 'route-manifest-unavailable';
    }
  | {
      readonly status: 'invalid';
      readonly reason: 'route-manifest-invalid';
    }
  | {
      readonly status: 'stale';
      readonly reason: 'route-manifest-stale';
    };

export type LoadedInternalDocumentRouteManifestState = Extract<
  InternalDocumentRouteManifestState,
  { readonly status: 'loaded' }
>;

export interface LoadInternalDocumentRouteManifestOptions {
  readonly manifestUrl: string;
  readonly siteUrlContext: SiteUrlContext;
  readonly buildId: string;
  readonly version: number;
  readonly fetcher?: typeof fetch;
  readonly currentLocation?: Location;
}

const invalidState = (): InternalDocumentRouteManifestState => ({
  status: 'invalid',
  reason: 'route-manifest-invalid',
});

const unavailableState = (): InternalDocumentRouteManifestState => ({
  status: 'unavailable',
  reason: 'route-manifest-unavailable',
});

const staleState = (): InternalDocumentRouteManifestState => ({
  status: 'stale',
  reason: 'route-manifest-stale',
});

const getMetaContent = (document: Document, name: string): string | null =>
  document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content ?? null;

export const readSiteUrlContextFromDocumentMeta = (document: Document): SiteUrlContext | null => {
  try {
    return createSiteUrlContext({
      siteOrigin: getMetaContent(document, 'rouault-site-origin'),
      basePath: getMetaContent(document, 'rouault-base-path') ?? '',
    });
  } catch {
    return null;
  }
};

export const readInternalDocumentRouteManifestMeta = (
  document: Document,
):
  | {
      readonly siteUrlContext: SiteUrlContext;
      readonly manifestUrl: string;
      readonly buildId: string;
      readonly version: number;
    }
  | null => {
  const siteUrlContext = readSiteUrlContextFromDocumentMeta(document);
  const manifestUrl = getMetaContent(document, 'rouault-route-manifest');
  const buildId = getMetaContent(document, 'rouault-route-manifest-build-id');
  const version = Number.parseInt(getMetaContent(document, 'rouault-route-manifest-version') ?? '', 10);

  if (
    siteUrlContext === null ||
    manifestUrl === null ||
    buildId === null ||
    !Number.isInteger(version)
  ) {
    return null;
  }

  return {
    siteUrlContext,
    manifestUrl,
    buildId,
    version,
  };
};

const hasExactlyOneSearchParam = (url: URL, name: string): boolean =>
  url.searchParams.getAll(name).length === 1;

const validateManifestUrl = (options: {
  readonly manifestUrl: string;
  readonly siteUrlContext: SiteUrlContext;
  readonly buildId: string;
  readonly currentLocation?: Location;
}): URL | null => {
  let manifestUrl: URL;
  try {
    manifestUrl = new URL(options.manifestUrl, options.siteUrlContext.siteOrigin);
  } catch {
    return null;
  }

  if (manifestUrl.username.length > 0 || manifestUrl.password.length > 0) {
    return null;
  }

  if (
    !hasExactlyOneSearchParam(manifestUrl, 'buildId') ||
    manifestUrl.searchParams.get('buildId') !== options.buildId
  ) {
    return null;
  }

  const currentOrigin = options.currentLocation?.origin;
  if (currentOrigin !== undefined && currentOrigin !== options.siteUrlContext.siteOrigin) {
    return null;
  }

  const currentPathname = options.currentLocation?.pathname;
  if (
    currentPathname !== undefined &&
    !isPathnameInsideBasePath(currentPathname, options.siteUrlContext.basePath)
  ) {
    return null;
  }

  if (manifestUrl.origin !== options.siteUrlContext.siteOrigin) {
    return null;
  }

  if (!isPathnameInsideBasePath(manifestUrl.pathname, options.siteUrlContext.basePath)) {
    return null;
  }

  return manifestUrl;
};

export const loadInternalDocumentRouteManifest = async (
  options: LoadInternalDocumentRouteManifestOptions,
): Promise<InternalDocumentRouteManifestState> => {
  if (options.version !== INTERNAL_DOCUMENT_ROUTE_MANIFEST_VERSION) {
    return invalidState();
  }

  const manifestUrl = validateManifestUrl({
    manifestUrl: options.manifestUrl,
    siteUrlContext: options.siteUrlContext,
    buildId: options.buildId,
    currentLocation: options.currentLocation,
  });
  if (manifestUrl === null) {
    return invalidState();
  }

  let response: Response;
  try {
    response = await (options.fetcher ?? fetch)(manifestUrl, {
      redirect: 'manual',
      credentials: 'same-origin',
    });
  } catch {
    return unavailableState();
  }

  if (response.type === 'opaqueredirect' || response.redirected || (response.status >= 300 && response.status < 400)) {
    return invalidState();
  }

  if (!response.ok) {
    return unavailableState();
  }

  if (!validateJsonContentType(response.headers.get('content-type')).ok) {
    return invalidState();
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return invalidState();
  }

  let manifest: InternalDocumentRouteManifest;
  try {
    manifest = parseInternalDocumentRouteManifest(json);
    const matchResult = assertInternalDocumentRouteManifestMatches({
      manifest,
      expectedBuildId: options.buildId,
      expectedVersion: options.version,
      expectedSiteUrlContext: options.siteUrlContext,
    });
    if (matchResult === 'stale') {
      return staleState();
    }
  } catch {
    return invalidState();
  }

  return {
    status: 'loaded',
    manifest,
    routeSet: toInternalDocumentRouteSet(manifest),
  };
};

export const loadInternalDocumentRouteManifestFromDocument = async (options: {
  readonly document: Document;
  readonly fetcher?: typeof fetch;
  readonly currentLocation?: Location;
}): Promise<InternalDocumentRouteManifestState> => {
  const meta = readInternalDocumentRouteManifestMeta(options.document);
  if (meta === null) {
    return invalidState();
  }

  return loadInternalDocumentRouteManifest({
    manifestUrl: meta.manifestUrl,
    siteUrlContext: meta.siteUrlContext,
    buildId: meta.buildId,
    version: meta.version,
    ...(options.fetcher !== undefined ? { fetcher: options.fetcher } : {}),
    ...(options.currentLocation !== undefined ? { currentLocation: options.currentLocation } : {}),
  });
};
