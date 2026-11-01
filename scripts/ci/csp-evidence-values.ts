// 診断schemaの外へ生値や任意文字列を通さない。
export const evidenceObject = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('invalid-evidence');
  return value as Record<string, unknown>;
};
export const evidenceKeys = (value: Record<string, unknown>, expected: readonly string[]) => {
  if (Object.keys(value).sort().join(',') !== [...expected].sort().join(','))
    throw new Error('invalid-evidence');
};
export const evidenceDigest = (value: unknown): string => {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/u.test(value))
    throw new Error('invalid-evidence');
  return value;
};
export const evidenceFlag = (value: unknown): boolean => {
  if (typeof value !== 'boolean') throw new Error('invalid-evidence');
  return value;
};
export const evidenceEnum = <T extends string>(value: unknown, values: readonly T[]): T => {
  if (typeof value !== 'string' || !values.includes(value as T))
    throw new Error('invalid-evidence');
  return value as T;
};
export const evidenceSequence = (value: unknown, maximum = 100): unknown[] => {
  if (!Array.isArray(value) || value.length > maximum) throw new Error('invalid-evidence');
  return value;
};
