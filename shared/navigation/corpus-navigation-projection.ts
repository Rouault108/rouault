export interface CorpusNavigationItem {
  readonly key: string;
  readonly label: string;
  readonly href: string;
}

export interface CorpusNavigationProjectionPayload {
  readonly schemaVersion: 1;
  readonly source: 'corpus-navigation-projection';
  readonly items: readonly CorpusNavigationItem[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeItem = (value: unknown): CorpusNavigationItem | null => {
  if (!isRecord(value)) {
    return null;
  }

  const key = typeof value['key'] === 'string' ? value['key'].trim() : '';
  const label = typeof value['label'] === 'string' ? value['label'].trim() : '';
  const href = typeof value['href'] === 'string' ? value['href'].trim() : '';

  if (key.length === 0 || label.length === 0 || href.length === 0) {
    return null;
  }

  return { key, label, href };
};

export const createCorpusNavigationProjectionPayload = (
  items: readonly CorpusNavigationItem[],
): CorpusNavigationProjectionPayload => ({
  schemaVersion: 1,
  source: 'corpus-navigation-projection',
  items: items.map((item) => ({
    key: item.key.trim(),
    label: item.label.trim(),
    href: item.href.trim(),
  })),
});

export const parseCorpusNavigationProjectionPayload = (
  value: unknown,
): CorpusNavigationProjectionPayload | null => {
  if (!isRecord(value)) {
    return null;
  }

  if (value['schemaVersion'] !== 1 || value['source'] !== 'corpus-navigation-projection') {
    return null;
  }

  const rawItems = value['items'];
  if (!Array.isArray(rawItems)) {
    return null;
  }

  const items: CorpusNavigationItem[] = [];
  for (const rawItem of rawItems) {
    const item = normalizeItem(rawItem);
    if (item === null) {
      return null;
    }
    items.push(item);
  }

  return createCorpusNavigationProjectionPayload(items);
};

export const EMPTY_CORPUS_NAVIGATION_PROJECTION_PAYLOAD: CorpusNavigationProjectionPayload =
  createCorpusNavigationProjectionPayload([]);
