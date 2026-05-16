import { requireBuildIdInput } from './build-id-contract.js';
import { requireBuildLabelInput } from './build-label-contract.js';
import { requireGeneratedAtInput } from './generated-at-contract.js';
import {
  createInternalDocumentRouteSet,
  type InternalDocumentRouteSet,
} from './internal-document-route-set.js';
import { INTERNAL_DOCUMENT_ROUTE_MANIFEST_VERSION } from './internal-document-route-manifest-path.js';
import { createSiteUrlContext, type SiteUrlContext } from '../site/site-url-context.js';


export interface InternalDocumentRouteManifest {
  readonly version: typeof INTERNAL_DOCUMENT_ROUTE_MANIFEST_VERSION;
  readonly buildId: string;
  readonly buildLabel: string;
  readonly generatedAt: string;
  readonly siteOrigin: string;
  readonly basePath: string;
  readonly routes: readonly string[];
}

export type InternalDocumentRouteManifestContractErrorReason =
  | 'invalid-manifest-schema'
  | 'invalid-manifest-version'
  | 'invalid-manifest-build-metadata'
  | 'invalid-manifest-site-url-context'
  | 'invalid-manifest-routes';

export class InternalDocumentRouteManifestContractError extends Error {
  override readonly name = 'InternalDocumentRouteManifestContractError';
  readonly reason: InternalDocumentRouteManifestContractErrorReason;

  constructor(reason: InternalDocumentRouteManifestContractErrorReason, message: string) {
    super(message);
    this.reason = reason;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const fail = (
  reason: InternalDocumentRouteManifestContractErrorReason,
  message: string,
): never => {
  throw new InternalDocumentRouteManifestContractError(reason, message);
};

const requireManifestVersion = (value: unknown): typeof INTERNAL_DOCUMENT_ROUTE_MANIFEST_VERSION => {
  if (value !== INTERNAL_DOCUMENT_ROUTE_MANIFEST_VERSION) {
    fail('invalid-manifest-version', 'Internal document route manifest version is invalid.');
  }
  return INTERNAL_DOCUMENT_ROUTE_MANIFEST_VERSION;
};

const requireRoutes = (value: unknown): readonly string[] => {
  if (!Array.isArray(value) || !value.every((route): route is string => typeof route === 'string')) {
    return fail('invalid-manifest-routes', 'Internal document route manifest routes must be strings.');
  }
  const routes: string[] = value;

  return createInternalDocumentRouteSet(routes).routes;
};

export const createInternalDocumentRouteManifest = (options: {
  readonly buildId: unknown;
  readonly buildLabel: unknown;
  readonly generatedAt: unknown;
  readonly siteUrlContext: SiteUrlContext;
  readonly routeSet: InternalDocumentRouteSet;
}): InternalDocumentRouteManifest => {
  const siteUrlContext = createSiteUrlContext({
    siteOrigin: options.siteUrlContext.siteOrigin,
    basePath: options.siteUrlContext.basePath,
  });

  return {
    version: INTERNAL_DOCUMENT_ROUTE_MANIFEST_VERSION,
    buildId: requireBuildIdInput(options.buildId, 'manifest.buildId'),
    buildLabel: requireBuildLabelInput(options.buildLabel, 'manifest.buildLabel'),
    generatedAt: requireGeneratedAtInput(options.generatedAt, 'manifest.generatedAt'),
    siteOrigin: siteUrlContext.siteOrigin,
    basePath: siteUrlContext.basePath,
    routes: createInternalDocumentRouteSet(options.routeSet.routes).routes,
  };
};

export const parseInternalDocumentRouteManifest = (
  value: unknown,
): InternalDocumentRouteManifest => {
  if (!isRecord(value)) {
    fail('invalid-manifest-schema', 'Internal document route manifest must be an object.');
  }

  const version = requireManifestVersion(value['version']);
  const siteUrlContext = (() => {
    try {
      return createSiteUrlContext({
        siteOrigin: value['siteOrigin'],
        basePath: value['basePath'],
      });
    } catch {
      fail('invalid-manifest-site-url-context', 'Internal document route manifest site URL context is invalid.');
    }
  })();

  try {
    return {
      version,
      buildId: requireBuildIdInput(value['buildId'], 'manifest.buildId'),
      buildLabel: requireBuildLabelInput(value['buildLabel'], 'manifest.buildLabel'),
      generatedAt: requireGeneratedAtInput(value['generatedAt'], 'manifest.generatedAt'),
      siteOrigin: siteUrlContext.siteOrigin,
      basePath: siteUrlContext.basePath,
      routes: requireRoutes(value['routes']),
    };
  } catch (error) {
    if (error instanceof InternalDocumentRouteManifestContractError) {
      throw error;
    }

    fail('invalid-manifest-build-metadata', 'Internal document route manifest build metadata is invalid.');
  }
};

export const toInternalDocumentRouteSet = (
  manifest: InternalDocumentRouteManifest,
): InternalDocumentRouteSet => createInternalDocumentRouteSet(manifest.routes);

export const assertInternalDocumentRouteManifestMatches = (options: {
  readonly manifest: InternalDocumentRouteManifest;
  readonly expectedBuildId: string;
  readonly expectedVersion: number;
  readonly expectedSiteUrlContext: SiteUrlContext;
}): 'ok' | 'stale' => {
  if (options.expectedVersion !== INTERNAL_DOCUMENT_ROUTE_MANIFEST_VERSION) {
    fail('invalid-manifest-version', 'Internal document route manifest expected version is invalid.');
  }

  if (options.manifest.version !== INTERNAL_DOCUMENT_ROUTE_MANIFEST_VERSION) {
    fail('invalid-manifest-version', 'Internal document route manifest version mismatch.');
  }

  const expectedSiteUrlContext = createSiteUrlContext({
    siteOrigin: options.expectedSiteUrlContext.siteOrigin,
    basePath: options.expectedSiteUrlContext.basePath,
  });
  if (
    options.manifest.siteOrigin !== expectedSiteUrlContext.siteOrigin ||
    options.manifest.basePath !== expectedSiteUrlContext.basePath
  ) {
    fail('invalid-manifest-site-url-context', 'Internal document route manifest site URL context mismatch.');
  }

  return options.manifest.buildId === options.expectedBuildId ? 'ok' : 'stale';
};
