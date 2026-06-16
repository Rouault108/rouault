import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  assertInternalDocumentRouteManifestMatches,
  createInternalDocumentRouteManifest,
  parseInternalDocumentRouteManifest,
  type InternalDocumentRouteManifest,
} from '../../shared/navigation/internal-document-route-manifest.js';
import { resolveInternalDocumentRouteManifestPathname } from '../../shared/navigation/internal-document-route-manifest-path.js';
import type { InternalDocumentRouteSet } from '../../shared/navigation/internal-document-route-set.js';
import type { SiteUrlContext } from '../../shared/site/site-url-context.js';

export interface BuildInternalDocumentRouteManifestOptions {
  readonly buildId: string;
  readonly buildLabel: string;
  readonly generatedAt: string;
  readonly siteUrlContext: SiteUrlContext;
  readonly routeSet: InternalDocumentRouteSet;
}

export const buildInternalDocumentRouteManifest = (
  options: BuildInternalDocumentRouteManifestOptions,
): InternalDocumentRouteManifest => createInternalDocumentRouteManifest(options);

export const renderInternalDocumentRouteManifest = (
  options: BuildInternalDocumentRouteManifestOptions,
): string => {
  const manifest = buildInternalDocumentRouteManifest(options);
  const restoredManifest = parseInternalDocumentRouteManifest(JSON.parse(JSON.stringify(manifest)));
  const matchResult = assertInternalDocumentRouteManifestMatches({
    manifest: restoredManifest,
    expectedBuildId: options.buildId,
    expectedVersion: manifest.version,
    expectedSiteUrlContext: options.siteUrlContext,
  });

  if (matchResult !== 'ok') {
    throw new Error('[internal-document-route-manifest] round-trip manifest is stale.');
  }

  const restoredRoutes = restoredManifest.routes.join('\n');
  const sourceRoutes = manifest.routes.join('\n');
  if (restoredRoutes !== sourceRoutes) {
    throw new Error('[internal-document-route-manifest] round-trip route set mismatch.');
  }

  return `${JSON.stringify(manifest, null, 2)}\n`;
};

export const emitInternalDocumentRouteManifest = async (
  options: BuildInternalDocumentRouteManifestOptions & {
    readonly outputDirectory: string;
  },
): Promise<void> => {
  const publicPathname = resolveInternalDocumentRouteManifestPathname(options.siteUrlContext);
  const outputPathname =
    options.siteUrlContext.basePath.length > 0
      ? publicPathname.slice(options.siteUrlContext.basePath.length)
      : publicPathname;
  const manifestFilePath = path.join(
    options.outputDirectory,
    ...outputPathname.split('/').filter((segment) => segment.length > 0),
  );

  await mkdir(path.dirname(manifestFilePath), { recursive: true });
  await writeFile(manifestFilePath, renderInternalDocumentRouteManifest(options), 'utf-8');
};
