import { spawnSync } from 'node:child_process';
import process from 'node:process';

import { resolveBuildLabel } from '../build/metadata/build-metadata.js';

const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

const resolvedBuildLabel = resolveBuildLabel();

const env = {
  ...process.env,
  ROUAULT_MEDIA_STRICT: '1',
};

if (resolvedBuildLabel) {
  env.ROUAULT_BUILD_LABEL = resolvedBuildLabel;
}

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
