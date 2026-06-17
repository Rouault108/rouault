export type { OptionalBuildIdValidationResult } from './build-id-contract.js';
export {
  isBuildIdString,
  normalizeBuildId,
  requireBuildIdInput,
  validateOptionalBuildIdInput,
} from './build-id-contract.js';
export type { OptionalGeneratedAtValidationResult } from './generated-at-contract.js';
export {
  isGeneratedAtString,
  normalizeGeneratedAt,
  requireGeneratedAtInput,
  validateOptionalGeneratedAtInput,
} from './generated-at-contract.js';

import { requireBuildIdInput } from './build-id-contract.js';
import { requireGeneratedAtInput } from './generated-at-contract.js';

export interface RouterBuildMetadata {
  readonly buildId: string;
  readonly generatedAt: string;
}

export const normalizeRouterBuildMetadata = (value: {
  readonly buildId: unknown;
  readonly generatedAt: unknown;
}): RouterBuildMetadata => ({
  buildId: requireBuildIdInput(value.buildId),
  generatedAt: requireGeneratedAtInput(value.generatedAt),
});
