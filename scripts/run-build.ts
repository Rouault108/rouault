import { spawnSync } from 'node:child_process';
import process from 'node:process';

import { resolveDevelopmentBuildMetadata } from '../build/metadata/build-metadata.js';
import {
  createPnpmInvocation,
  RunBuildProcessConfigurationError,
  RUN_BUILD_STEPS,
} from './run-build-process.js';

const buildMetadata = (() => {
  try {
    return resolveDevelopmentBuildMetadata();
  } catch (error) {
    console.error(
      '[build] invalid build metadata:',
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
})();

const env: NodeJS.ProcessEnv = {
  ...process.env,
  ROUAULT_BUILD_ID: buildMetadata.buildId,
  ROUAULT_BUILD_LABEL: buildMetadata.buildLabel,
  ROUAULT_GENERATED_AT: buildMetadata.generatedAt,
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

for (const step of RUN_BUILD_STEPS) {
  const invocation = (() => {
    try {
      return createPnpmInvocation({
        env,
        platform: process.platform,
        nodeExecPath: process.execPath,
        pnpmArgs: step.pnpmArgs,
      });
    } catch (error) {
      if (error instanceof RunBuildProcessConfigurationError) {
        console.error('[build] invalid build process configuration:', error.message);
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
      `[build] build step could not be started: ${step.label} (${invocation.strategy})`,
      ...formatSpawnErrorDiagnostics(result.error),
    );

    if (invocation.strategy === 'windows-command-processor') {
      console.error(
        '[build] Windows fallback uses cmd.exe /d /s /c pnpm ... because npm_execpath did not resolve to a pnpm JavaScript CLI. Ensure pnpm is available through the Windows command processor, or run the build through a Corepack/pnpm environment that exposes npm_execpath.',
      );
    }

    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(
      `[build] build step failed: ${step.label} (${invocation.strategy})`,
      `status=${result.status === null ? 'null' : String(result.status)}`,
      `signal=${result.signal ?? 'null'}`,
    );

    if (invocation.strategy === 'windows-command-processor') {
      console.error(
        '[build] This step was launched through the Windows fallback: cmd.exe /d /s /c pnpm ... If the failure says pnpm was not found or not recognized, check the Windows PATH/Corepack shim configuration or run through a pnpm environment that exposes npm_execpath.',
      );
    }

    process.exit(result.status ?? 1);
  }
}
