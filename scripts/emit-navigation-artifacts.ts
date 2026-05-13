import path from 'node:path';

import { emitNavigationArtifacts } from '../build/navigation/emit-navigation-artifacts.js';
import { resolveProductionBuildMetadata } from '../build/metadata/build-metadata.js';

const buildMetadata = resolveProductionBuildMetadata();

await emitNavigationArtifacts({
  outputDir: path.resolve(process.cwd(), 'dist'),
  buildId: buildMetadata.buildId,
  generatedAt: buildMetadata.generatedAt,
});
