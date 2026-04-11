import path from 'node:path';

import { emitNavigationArtifacts } from '../build/navigation/emit-navigation-artifacts.js';
import { resolveBuildLabel } from '../build/metadata/build-metadata.js';

await emitNavigationArtifacts({
  outputDir: path.resolve(process.cwd(), 'dist'),
  buildId: resolveBuildLabel(),
});