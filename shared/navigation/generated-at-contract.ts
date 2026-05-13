export type OptionalGeneratedAtValidationResult =
  | { kind: 'missing' }
  | { kind: 'empty' }
  | { kind: 'invalid-type'; value: unknown }
  | { kind: 'invalid-format'; value: string }
  | { kind: 'invalid-date'; value: string }
  | { kind: 'non-canonical'; value: string }
  | { kind: 'valid'; value: string };

export type GeneratedAtValidationResult = OptionalGeneratedAtValidationResult;

const GENERATED_AT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

export const isGeneratedAtString = (value: string): boolean => normalizeGeneratedAt(value) !== null;

export const normalizeGeneratedAt = (value: string): string | null => {
  const normalized = value.trim();
  if (!GENERATED_AT_PATTERN.test(normalized)) {
    return null;
  }
  const timestamp = Date.parse(normalized);
  if (!Number.isFinite(timestamp)) {
    return null;
  }
  return new Date(timestamp).toISOString() === normalized ? normalized : null;
};

export const validateOptionalGeneratedAtInput = (
  value: unknown,
): OptionalGeneratedAtValidationResult => {
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
  if (!GENERATED_AT_PATTERN.test(normalized)) {
    return { kind: 'invalid-format', value: normalized };
  }
  const timestamp = Date.parse(normalized);
  if (!Number.isFinite(timestamp)) {
    return { kind: 'invalid-date', value: normalized };
  }
  if (new Date(timestamp).toISOString() !== normalized) {
    return { kind: 'non-canonical', value: normalized };
  }
  return { kind: 'valid', value: normalized };
};

export const requireGeneratedAtInput = (value: unknown, label = 'generatedAt'): string => {
  const result = validateOptionalGeneratedAtInput(value);
  if (result.kind !== 'valid') {
    throw new Error(`${label} is invalid: ${result.kind}`);
  }
  return result.value;
};
