const ISO_DATE_PREFIX_PATTERN = /^(\d{4}-\d{2}-\d{2})(?:[T\s].*)?$/;

export const formatArticleDate = (value: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return '';
  }

  const matched = normalized.match(ISO_DATE_PREFIX_PATTERN);
  return matched?.[1] ?? normalized;
};
