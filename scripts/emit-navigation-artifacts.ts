import path from 'node:path';

import { resolveBuildId } from '../build/metadata/build-id.js';
import { resolveGeneratedAt } from '../build/metadata/generated-at.js';
import { emitNavigationArtifacts } from '../build/navigation/emit-navigation-artifacts.js';

const generatedAt = resolveGeneratedAt();

if (generatedAt === undefined) {
  throw new Error('ROUAULT_GENERATED_AT is required when emitting navigation artifacts.');
}

await emitNavigationArtifacts({
  outputDir: path.resolve(process.cwd(), 'dist'),
  buildId: resolveBuildId(),
  generatedAt,
});
