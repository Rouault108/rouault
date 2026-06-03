import { spawnSync } from 'node:child_process';
import process from 'node:process';

import { resolveDevelopmentBuildMetadata } from '../build/metadata/build-metadata.js';

const commandName = (command: string): string =>
  process.platform === 'win32' ? `${command}.cmd` : command;

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

const steps: readonly (readonly [string, readonly string[]])[] = [
  ['pnpm', ['run', 'build:client']],
  ['pnpm', ['run', 'build:images']],
  ['tsx', ['./node_modules/@11ty/eleventy/cmd.cjs', '--config=eleventy.config.ts']],
  ['tsx', ['scripts/apply-lit-ssr.ts']],
  ['tsx', ['scripts/emit-navigation-artifacts.ts']],
  ['tsx', ['scripts/emit-search-artifacts.ts']],
  ['tsx', ['scripts/build-pagefind.ts']],
];

for (const [command, args] of steps) {
  const result = spawnSync(commandName(command), [...args], {
    env,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error('[build] build step could not be started:', result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
