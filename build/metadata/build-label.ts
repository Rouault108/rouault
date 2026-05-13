import {
  normalizeBuildLabel,
  validateBuildLabelInput,
} from '../../shared/navigation/build-label-contract.js';

export const DEFAULT_BUILD_LABEL = 'build local';

const readBuildLabelSource = (explicit?: unknown): unknown =>
  explicit === undefined ? process.env['ROUAULT_BUILD_LABEL'] : explicit;

export const resolveBuildLabel = (explicit?: unknown): string | undefined => {
  const candidate = readBuildLabelSource(explicit);
  const validation = validateBuildLabelInput(candidate);
  if (validation.kind === 'missing') {
    return undefined;
  }
  if (validation.kind !== 'valid') {
    throw new Error(`buildLabel is invalid: ${validation.kind}`);
  }
  return normalizeBuildLabel(validation.value);
};

export const requireBuildLabel = (explicit?: unknown): string => {
  const label = resolveBuildLabel(explicit);
  if (label === undefined) {
    throw new Error('buildLabel is required.');
  }
  return label;
};

export { normalizeBuildLabel };
