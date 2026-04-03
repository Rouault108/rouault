import { execSync } from 'node:child_process';

import { normalizeBuildLabel } from './build-label.js';

export { normalizeBuildLabel } from './build-label.js';

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

export const resolveGitShortSha = (): string | undefined =>
  normalizeBuildLabel(resolveGitShortShaRaw());

export const resolveBuildLabel = (explicit?: string | undefined): string | undefined =>
  normalizeBuildLabel(explicit) ??
  normalizeBuildLabel(process.env['ROUAULT_BUILD_LABEL']) ??
  resolveGitShortSha();
