import { spawnSync } from 'node:child_process';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { resolveProductionBuildMetadata } from '../build/metadata/build-metadata.js';
import { resolveProductionSiteUrlContext } from '../build/site/site-url-context.js';
import { assertProductionCssArtifacts } from './assert-production-css-artifacts.js';
import { assertProductionSearchArtifacts } from './assert-production-search-artifacts.js';
import { assertProductionSiteUrlContext } from './assert-production-site-url-context.js';
import {
  createPnpmInvocation,
  PRODUCTION_BUILD_PNPM_ARGS,
  RunBuildProcessConfigurationError,
} from './run-build-process.js';

const distDir = path.resolve(process.cwd(), 'dist');

if (process.env['ROUAULT_SKIP_PAGEFIND'] === '1') {
  console.error('[production-build] ROUAULT_SKIP_PAGEFIND=1 is not allowed for production builds.');
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

const entrypointBuildLabel = resolveEntrypointBuildLabel();

const buildMetadata = resolveProductionBuildMetadata({
  buildLabel: entrypointBuildLabel,
});

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
  ROUAULT_BUILD_ID: buildMetadata.buildId,
  ROUAULT_BUILD_LABEL: buildMetadata.buildLabel,
  ROUAULT_GENERATED_AT: buildMetadata.generatedAt,
  ROUAULT_SITE_ORIGIN: siteUrlContext.siteOrigin,
  ROUAULT_BASE_PATH: siteUrlContext.basePath,
};

const formatSpawnDiagnosticValue = (value: unknown): string => {
  try {
    return JSON.stringify([value]).slice(1, -1);
  } catch {
    try {
      return String(value);
    } catch {
      return '<unformattable>';
    }
  }
};

const formatSpawnErrorDiagnostics = (
  error: Error & Partial<NodeJS.ErrnoException>,
): readonly string[] => [
  error.message,
  ...(error.code !== undefined ? [`code=${error.code}`] : []),
  ...(error.errno !== undefined ? [`errno=${String(error.errno)}`] : []),
  ...(error.syscall !== undefined ? [`syscall=${error.syscall}`] : []),
  ...(error.path !== undefined ? [`path=${formatSpawnDiagnosticValue(error.path)}`] : []),
];

const invocation = (() => {
  try {
    return createPnpmInvocation({
      env,
      platform: process.platform,
      nodeExecPath: process.execPath,
      pnpmArgs: PRODUCTION_BUILD_PNPM_ARGS,
    });
  } catch (error) {
    if (error instanceof RunBuildProcessConfigurationError) {
      console.error('[production-build] invalid build process configuration:', error.message);
      process.exit(1);
    }

    throw error;
  }
})();

const result = spawnSync(invocation.command, [...invocation.args], {
  env,
  stdio: 'inherit',
  ...(invocation.windowsVerbatimArguments === true ? { windowsVerbatimArguments: true } : {}),
});

if (result.error) {
  console.error(
    `[production-build] build command could not be started: (${invocation.strategy})`,
    ...formatSpawnErrorDiagnostics(result.error),
  );

  if (invocation.strategy === 'windows-command-processor') {
    console.error(
      '[production-build] Windows fallback uses cmd.exe /d /s /c pnpm ... because npm_execpath did not resolve to a pnpm JavaScript CLI. Ensure pnpm is available through the Windows command processor, or run the build through a Corepack/pnpm environment that exposes npm_execpath.',
    );
  }

  process.exit(1);
}

if (result.status !== 0) {
  console.error(
    `[production-build] build command failed: (${invocation.strategy})`,
    `status=${result.status === null ? 'null' : String(result.status)}`,
    `signal=${result.signal ?? 'null'}`,
  );

  if (invocation.strategy === 'windows-command-processor') {
    console.error(
      '[production-build] This command was launched through the Windows fallback: cmd.exe /d /s /c pnpm ... If the failure says pnpm was not found or not recognized, check the Windows PATH/Corepack shim configuration or run through a pnpm environment that exposes npm_execpath.',
    );
  }

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
