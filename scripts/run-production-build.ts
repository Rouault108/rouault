import { rm } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

import { resolveProductionBuildMetadata } from '../build/metadata/build-metadata.js';
import { resolveProductionSiteUrlContext } from '../build/site/site-url-context.js';
import { assertProductionCssArtifacts } from './assert-production-css-artifacts.js';
import { assertProductionSearchArtifacts } from './assert-production-search-artifacts.js';
import { assertProductionSiteUrlContext } from './assert-production-site-url-context.js';

const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const distDir = path.resolve(process.cwd(), 'dist');

if (process.env['ROUAULT_SKIP_PAGEFIND'] === '1') {
  console.error(
    '[production-build] ROUAULT_SKIP_PAGEFIND=1 is not allowed for production builds.',
  );
  process.exit(1);
}

await rm(distDir, { recursive: true, force: true });

const resolveEntrypointBuildLabel = (): string => {
  const explicitLabel = process.env['ROUAULT_BUILD_LABEL']?.trim();
  if (explicitLabel !== undefined && explicitLabel.length > 0) {
    return explicitLabel;
  }

  const githubSha = process.env['GITHUB_SHA']?.trim();
  if (githubSha !== undefined && githubSha.length > 0) {
    return githubSha.slice(0, 7);
  }

  return 'production local';
};

process.env['ROUAULT_BUILD_LABEL'] = resolveEntrypointBuildLabel();

const buildMetadata = resolveProductionBuildMetadata();
const siteUrlContext = (() => {
  try {
    return resolveProductionSiteUrlContext({
      siteOrigin: process.env['ROUAULT_SITE_ORIGIN'],
      basePath: process.env['ROUAULT_BASE_PATH'],
    });
  } catch (error) {
    console.error(
      '[production-build] invalid production site URL context:',
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
})();

const env: NodeJS.ProcessEnv = {
  ...process.env,
  ROUAULT_MEDIA_STRICT: '1',
};

env['ROUAULT_BUILD_ID'] = buildMetadata.buildId;
env['ROUAULT_BUILD_LABEL'] = buildMetadata.buildLabel;
env['ROUAULT_GENERATED_AT'] = buildMetadata.generatedAt;
env['ROUAULT_SITE_ORIGIN'] = siteUrlContext.siteOrigin;
env['ROUAULT_BASE_PATH'] = siteUrlContext.basePath;

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
  await assertProductionSiteUrlContext();
  await assertProductionSearchArtifacts();
} catch (error) {
  console.error(
    '[production-build] production artifact assertion failed:',
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
}
