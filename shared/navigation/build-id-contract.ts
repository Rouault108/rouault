export type OptionalBuildIdValidationResult =
  | { kind: 'missing' }
  | { kind: 'empty' }
  | { kind: 'invalid-type'; value: unknown }
  | { kind: 'too-long'; value: string }
  | { kind: 'invalid-format'; value: string }
  | { kind: 'valid'; value: string };

const BUILD_ID_PATTERN = /^[A-Za-z0-9._:-]+$/u;
const MAX_BUILD_ID_LENGTH = 128;

export const validateOptionalBuildIdInput = (value: unknown): OptionalBuildIdValidationResult => {
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
  if (normalized.length > MAX_BUILD_ID_LENGTH) {
    return { kind: 'too-long', value: normalized };
  }
  if (!BUILD_ID_PATTERN.test(normalized)) {
    return { kind: 'invalid-format', value: normalized };
  }
  return { kind: 'valid', value: normalized };
};

export const normalizeBuildId = (value: unknown): string => {
  const result = validateOptionalBuildIdInput(value);
  if (result.kind !== 'valid') {
    throw new Error(`buildId is invalid: ${result.kind}`);
  }
  return result.value;
};
