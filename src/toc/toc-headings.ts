export interface TocScopeSelection {
  readonly scopeId: string;
  readonly value: string;
}

export interface TocHeading {
  readonly id: string;
  readonly text: string;
  readonly level: number;
  readonly scopeSelections?: readonly TocScopeSelection[];
}

export interface TocCapabilities {
  readonly activeTracking: boolean;
  readonly dynamicScopes: boolean;
  readonly mobilePanel: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const normalizeTocHeading = (value: unknown): TocHeading | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value['id'] === 'string' ? value['id'] : '';
  const text = typeof value['text'] === 'string' ? value['text'].trim() : '';
  const level = typeof value['level'] === 'number' ? Math.trunc(value['level']) : Number.NaN;
  if (id.length === 0 || text.length === 0 || !Number.isFinite(level) || level < 2 || level > 6) {
    return null;
  }

  const scopeSelections = Array.isArray(value['scopeSelections'])
    ? value['scopeSelections']
        .map((selection) => {
          if (!isRecord(selection)) {
            return null;
          }

          const scopeId =
            typeof selection['scopeId'] === 'string' ? selection['scopeId'].trim() : '';
          const selectedValue =
            typeof selection['value'] === 'string' ? selection['value'].trim() : '';
          if (scopeId.length === 0 || selectedValue.length === 0) {
            return null;
          }

          return { scopeId, value: selectedValue };
        })
        .filter((selection): selection is TocScopeSelection => selection !== null)
    : [];

  return {
    id,
    text,
    level,
    ...(scopeSelections.length > 0 ? { scopeSelections } : {}),
  };
};

export const normalizeTocHeadings = (value: unknown): TocHeading[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeTocHeading(item))
    .filter((item): item is TocHeading => item !== null);
};

export const parseTocHeadingsJson = (value: string): TocHeading[] | null => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }

  try {
    return normalizeTocHeadings(JSON.parse(normalized) as unknown);
  } catch {
    return [];
  }
};

export const normalizeTocCapabilities = (value: unknown): TocCapabilities => {
  if (!isRecord(value)) {
    return {
      activeTracking: false,
      dynamicScopes: false,
      mobilePanel: false,
    };
  }

  return {
    activeTracking: value['activeTracking'] === true,
    dynamicScopes: value['dynamicScopes'] === true,
    mobilePanel: value['mobilePanel'] === true,
  };
};

export const hasDynamicTocScopeSelections = (headings: readonly TocHeading[]): boolean =>
  headings.some(
    (heading) => Array.isArray(heading.scopeSelections) && heading.scopeSelections.length > 0,
  );
