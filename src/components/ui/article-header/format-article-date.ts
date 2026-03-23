const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const formatArticleDate = (value: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return '';
  }

  return ISO_DATE_PATTERN.test(normalized) ? normalized : '';
};
