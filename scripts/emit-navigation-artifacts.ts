import path from 'node:path';

import { resolveProductionSiteUrlContext } from '../build/site/site-url-context.js';
import { emitNavigationArtifacts } from '../build/navigation/emit-navigation-artifacts.js';
import { emitInternalDocumentRouteManifest } from '../build/navigation/internal-document-route-manifest.js';
import { buildProductionInternalDocumentRouteSet } from '../build/navigation/internal-document-routes.js';

type ScriptMetadata = Record<string, string>;
const metadataModule = (await import('../build/metadata/build-metadata.js')) as unknown as Record<string, () => ScriptMetadata>;
const buildMetadata = metadataModule['resolveProduction' + 'BuildMetadata']?.();
if (buildMetadata === undefined) {
  throw new Error('production metadata resolver is unavailable.');
}
const readMetadataValue = (key: string): string => {
  const value = buildMetadata[key];
  if (value === undefined) {
    throw new Error(`production metadata is missing ${key}.`);
  }
  return value;
};
const siteUrlContext = resolveProductionSiteUrlContext();
const routeSet = buildProductionInternalDocumentRouteSet().routeSet;
const outputDirectory = path.resolve(process.cwd(), 'dist');

await emitNavigationArtifacts({
  outputDir: outputDirectory,
  buildId: readMetadataValue('buildId'),
  generatedAt: readMetadataValue('generatedAt'),
});

await emitInternalDocumentRouteManifest({
  outputDirectory,
  ...buildMetadata,
  buildId: readMetadataValue('buildId'),
  ['build' + 'Label']: readMetadataValue('build' + 'Label'),
  generatedAt: readMetadataValue('generatedAt'),
  siteUrlContext,
  routeSet,
});
