import { normalizeBuildLabel } from '../../build/metadata/build-label.js';

export interface BuildMetadataData {
  buildLabel?: string;
}

declare const __ROUAULT_BUILD_LABEL__: string | undefined;

const readRuntimeBuildLabel = (): string | undefined => {
  const defineBuildLabel =
    typeof __ROUAULT_BUILD_LABEL__ === 'string' ? __ROUAULT_BUILD_LABEL__ : undefined;
  if (defineBuildLabel) {
    return defineBuildLabel;
  }

  if (typeof process !== 'undefined' && typeof process.env === 'object') {
    const envBuildLabel = process.env['ROUAULT_BUILD_LABEL'];
    if (typeof envBuildLabel === 'string') {
      return envBuildLabel;
    }
  }

  return undefined;
};

export const loadBuildMetadataData = (buildLabel?: string): BuildMetadataData => {
  const normalizedBuildLabel = normalizeBuildLabel(buildLabel ?? readRuntimeBuildLabel());

  return normalizedBuildLabel ? { buildLabel: normalizedBuildLabel } : {};
};
