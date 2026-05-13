export type { OptionalBuildIdValidationResult } from './build-id-contract.js';
export { normalizeBuildId, validateOptionalBuildIdInput } from './build-id-contract.js';
export type { OptionalGeneratedAtValidationResult } from './generated-at-contract.js';
export {
  normalizeGeneratedAt,
  validateOptionalGeneratedAtInput,
} from './generated-at-contract.js';

import { normalizeBuildId } from './build-id-contract.js';
import { normalizeGeneratedAt } from './generated-at-contract.js';

export interface RouterBuildMetadata {
  readonly buildId: string;
  readonly generatedAt: string;
}

export const normalizeRouterBuildMetadata = (value: {
  readonly buildId: unknown;
  readonly generatedAt: unknown;
}): RouterBuildMetadata => ({
  buildId: normalizeBuildId(value.buildId),
  generatedAt: normalizeGeneratedAt(value.generatedAt),
});
