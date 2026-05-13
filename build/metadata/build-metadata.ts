import { DEFAULT_BUILD_LABEL, requireBuildLabel, resolveBuildLabel } from './build-label.js';
import { resolveBuildId } from './build-id.js';
import { createBuildGeneratedAtOnce } from './generated-at.js';

export { normalizeBuildLabel, requireBuildLabel, resolveBuildLabel } from './build-label.js';
export { normalizeBuildId, requireBuildIdInput } from '../../shared/navigation/build-id-contract.js';
export { normalizeGeneratedAt, requireGeneratedAtInput } from '../../shared/navigation/generated-at-contract.js';
export { createBuildGeneratedAtOnce, resolveGeneratedAt } from './generated-at.js';
export { resolveBuildId, resolveGitShortSha } from './build-id.js';

export interface ResolvedBuildMetadata {
  readonly buildId: string;
  readonly buildLabel: string;
  readonly generatedAt: string;
}

export interface ResolveBuildMetadataOptions {
  readonly buildId?: string | undefined;
  readonly buildLabel?: string | undefined;
  readonly generatedAt?: string | undefined;
}

export const resolveBuildMetadata = (options: ResolveBuildMetadataOptions = {}): ResolvedBuildMetadata => ({
  buildId: resolveBuildId(options.buildId),
  buildLabel: requireBuildLabel(options.buildLabel),
  generatedAt: createBuildGeneratedAtOnce(options.generatedAt),
});

export const resolveProductionBuildMetadata = resolveBuildMetadata;

export const resolveDevelopmentBuildMetadata = (
  options: ResolveBuildMetadataOptions = {},
): ResolvedBuildMetadata => ({
  buildId: resolveBuildId(options.buildId),
  buildLabel: resolveBuildLabel(options.buildLabel) ?? DEFAULT_BUILD_LABEL,
  generatedAt: createBuildGeneratedAtOnce(options.generatedAt),
});
