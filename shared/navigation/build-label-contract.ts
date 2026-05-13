export type BuildLabelValidationResult =
  | { kind: 'missing' }
  | { kind: 'empty' }
  | { kind: 'invalid-type'; value: unknown }
  | { kind: 'too-long'; value: string }
  | { kind: 'valid'; value: string };

const MAX_BUILD_LABEL_LENGTH = 256;

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

export const normalizeBuildLabel = (value: unknown): string => {
  const result = validateBuildLabelInput(value);
  if (result.kind !== 'valid') {
    throw new Error(`buildLabel is invalid: ${result.kind}`);
  }
  return result.value;
};

export const normalizeOptionalBuildLabel = (value: unknown): string | undefined => {
  const result = validateBuildLabelInput(value);
  return result.kind === 'valid' ? result.value : undefined;
};
