import { normalizeBuildId } from '../../shared/navigation/build-id-contract.js';
import { normalizeBuildLabel } from '../../shared/navigation/build-label-contract.js';
import { normalizeGeneratedAt } from '../../shared/navigation/generated-at-contract.js';

export interface BuildMetadataData {
  buildId: string;
  buildLabel: string;
  generatedAt: string;
}

export interface LoadBuildMetadataDataInput {
  buildId: unknown;
  buildLabel: unknown;
  generatedAt: unknown;
  sourceLabel: string;
}

export const loadBuildMetadataData = (input: LoadBuildMetadataDataInput): BuildMetadataData => {
  try {
    return {
      buildId: normalizeBuildId(input.buildId),
      buildLabel: normalizeBuildLabel(input.buildLabel),
      generatedAt: normalizeGeneratedAt(input.generatedAt),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`[buildMetadata:${input.sourceLabel}] ${message}`);
  }
};
