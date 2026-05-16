import { rm } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

import { resolveProductionBuildMetadata } from '../build/metadata/build-metadata.js';
import { assertProductionCssArtifacts } from './assert-production-css-artifacts.js';
import { DEFAULT_SITE_URL_CONTEXT } from '../shared/site/site-url-context.js';

const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const distDir = path.resolve(process.cwd(), 'dist');

await rm(distDir, { recursive: true, force: true });

const buildMetadata = resolveProductionBuildMetadata();

const env: NodeJS.ProcessEnv = {
  ...process.env,
  ROUAULT_MEDIA_STRICT: '1',
};

env['ROUAULT_BUILD_ID'] = buildMetadata.buildId;
env['ROUAULT_BUILD_LABEL'] = buildMetadata.buildLabel;
env['ROUAULT_GENERATED_AT'] = buildMetadata.generatedAt;
env['ROUAULT_SITE_ORIGIN'] ??= DEFAULT_SITE_URL_CONTEXT.siteOrigin;

const result = spawnSync(command, ['build'], {
  env,
  stdio: 'inherit',
});

if (result.error) {
  console.error('[production-build] build command could not be started:', result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

try {
  await assertProductionCssArtifacts();
} catch (error) {
  console.error(
    '[production-build] production CSS artifact assertion failed:',
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
}
