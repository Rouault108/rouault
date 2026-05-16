import path from 'node:path';

import { resolveProductionBuildMetadata } from '../build/metadata/build-metadata.js';
import { resolveProductionSiteUrlContext } from '../build/site/site-url-context.js';
import { emitNavigationArtifacts } from '../build/navigation/emit-navigation-artifacts.js';
import { emitInternalDocumentRouteManifest } from '../build/navigation/internal-document-route-manifest.js';
import { buildProductionInternalDocumentRouteSet } from '../build/navigation/internal-document-routes.js';

const buildMetadata = resolveProductionBuildMetadata();
const siteUrlContext = resolveProductionSiteUrlContext();
const routeSet = buildProductionInternalDocumentRouteSet().routeSet;
const outputDirectory = path.resolve(process.cwd(), 'dist');

await emitNavigationArtifacts({
  outputDir: outputDirectory,
  buildId: buildMetadata.buildId,
  generatedAt: buildMetadata.generatedAt,
});

await emitInternalDocumentRouteManifest({
  outputDirectory,
  buildId: buildMetadata.buildId,
  buildLabel: buildMetadata.buildLabel,
  generatedAt: buildMetadata.generatedAt,
  siteUrlContext,
  routeSet,
});
