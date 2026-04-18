const VALID_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

const normalizeText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export const normalizeNoteDate = (value: string | null | undefined): string | null => {
  const normalized = normalizeText(value);
  if (normalized.length === 0) {
    return null;
  }

  if (VALID_DAY_PATTERN.test(normalized)) {
    return normalized;
  }

  const isoDatePrefix = normalized.match(/^(\d{4}-\d{2}-\d{2})T/u)?.[1];
  if (isoDatePrefix !== undefined) {
    return isoDatePrefix;
  }

  const timestamp = Date.parse(normalized);
  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return new Date(timestamp).toISOString().slice(0, 10);
};
