export interface MediaSourceDescriptor {
  readonly type: string;
  readonly srcset: string;
  readonly sizes?: string;
}

const pickOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const serializeMediaSources = (sources: readonly MediaSourceDescriptor[]): string =>
  JSON.stringify(sources);

export const parseMediaSourcesAttribute = (value: string | null): MediaSourceDescriptor[] => {
  if (value === null || value.trim() === '') {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((entry) => {
      if (!isRecord(entry)) {
        return [];
      }

      const type = pickOptionalString(entry['type']);
      const srcset = pickOptionalString(entry['srcset']);
      const sizes = pickOptionalString(entry['sizes']);

      if (!type || !srcset) {
        return [];
      }

      return [{ type, srcset, ...(sizes ? { sizes } : {}) }];
    });
  } catch {
    return [];
  }
};
