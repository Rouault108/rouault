export const ARTICLE_HEADER_TAGS_DATA_ATTRIBUTE = 'data-tags';

export const parseArticleHeaderTagsAdapterValue = (value: string | null | undefined): string[] => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (normalized.length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(normalized) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  } catch {
    return [];
  }
};
