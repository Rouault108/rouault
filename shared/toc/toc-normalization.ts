import type { TocCapabilities, TocHeading, TocScopeSelection } from './toc-chrome-projection.js';

export type TocHeadingsJsonParseResult =
  | { readonly status: 'empty-source' }
  | { readonly status: 'invalid-json'; readonly error: unknown }
  | {
      readonly status: 'valid';
      readonly headings: readonly TocHeading[];
      readonly sourceVersion: string;
    };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const createStableHash = (value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

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

export const normalizeTocHeadings = (value: unknown): readonly TocHeading[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeTocHeading(item))
    .filter((item): item is TocHeading => item !== null);
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

export const serializeTocHeadingsForSourceScript = (headings: readonly TocHeading[]): string =>
  JSON.stringify(headings).replace(/</g, '\\u003c');

export const createTocSourceVersion = (input: {
  readonly sourceId: string;
  readonly serializedSourceText: string;
}): string => `${input.sourceId}:${createStableHash(input.serializedSourceText)}`;

export const parseTocHeadingsJson = (input: {
  readonly sourceId: string;
  readonly serializedSourceText: string;
}): TocHeadingsJsonParseResult => {
  if (input.serializedSourceText.trim().length === 0) {
    return { status: 'empty-source' };
  }

  try {
    return {
      status: 'valid',
      headings: normalizeTocHeadings(JSON.parse(input.serializedSourceText) as unknown),
      sourceVersion: createTocSourceVersion(input),
    };
  } catch (error: unknown) {
    return { status: 'invalid-json', error };
  }
};
