import { execSync } from 'node:child_process';

import { requireBuildIdInput } from '../../shared/navigation/build-id-contract.js';

export const DEFAULT_BUILD_ID = 'local';

const resolveGitShortShaRaw = (): string | undefined => {
  try {
    return execSync('git rev-parse --short HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return undefined;
  }
};

export const resolveGitShortSha = (): string | undefined => resolveGitShortShaRaw();

export const resolveBuildId = (explicit?: string | undefined): string =>
  requireBuildIdInput(explicit ?? process.env['ROUAULT_BUILD_ID'] ?? resolveGitShortShaRaw() ?? DEFAULT_BUILD_ID);
