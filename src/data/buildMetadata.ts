import { requireBuildIdInput } from '../../shared/navigation/build-id-contract.js';
import { requireBuildLabelInput } from '../../shared/navigation/build-label-contract.js';
import { requireGeneratedAtInput } from '../../shared/navigation/generated-at-contract.js';

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
      buildId: requireBuildIdInput(input.buildId),
      buildLabel: requireBuildLabelInput(input.buildLabel),
      generatedAt: requireGeneratedAtInput(input.generatedAt),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`[buildMetadata:${input.sourceLabel}] ${message}`);
  }
};
