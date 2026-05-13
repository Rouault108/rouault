export type BuildLabelValidationResult =
  | { kind: 'missing' }
  | { kind: 'empty' }
  | { kind: 'invalid-type'; value: unknown }
  | { kind: 'too-long'; value: string }
  | { kind: 'valid'; value: string };

const MAX_BUILD_LABEL_LENGTH = 256;

export const isBuildLabelString = (value: string): boolean => {
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= MAX_BUILD_LABEL_LENGTH;
};

export const normalizeBuildLabel = (value: string): string | null => {
  const normalized = value.trim();
  return isBuildLabelString(normalized) ? normalized : null;
};

export const validateBuildLabelInput = (value: unknown): BuildLabelValidationResult => {
  if (value === undefined || value === null) {
    return { kind: 'missing' };
  }
  if (typeof value !== 'string') {
    return { kind: 'invalid-type', value };
  }
  const normalized = value.trim();
  if (normalized.length === 0) {
    return { kind: 'empty' };
  }
  if (normalized.length > MAX_BUILD_LABEL_LENGTH) {
    return { kind: 'too-long', value: normalized };
  }
  return { kind: 'valid', value: normalized };
};

export const requireBuildLabelInput = (value: unknown, label = 'buildLabel'): string => {
  const result = validateBuildLabelInput(value);
  if (result.kind !== 'valid') {
    throw new Error(`${label} is invalid: ${result.kind}`);
  }
  return result.value;
};

export const normalizeOptionalBuildLabel = (value: unknown): string | undefined => {
  const result = validateBuildLabelInput(value);
  return result.kind === 'valid' ? result.value : undefined;
};
