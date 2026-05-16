export interface NoteSourceVFileLike {
  readonly path?: unknown;
  readonly history?: readonly unknown[];
  readonly data?: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeCandidate = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().replace(/\\/gu, '/');
  return normalized.length > 0 ? normalized : undefined;
};

const readDataCandidate = (data: unknown): string | undefined => {
  if (!isRecord(data)) {
    return undefined;
  }

  for (const key of ['sourceFilePath', 'filePath', 'path', 'slug', 'id']) {
    const candidate = normalizeCandidate(data[key]);
    if (candidate !== undefined) {
      return candidate;
    }
  }

  return undefined;
};

export const resolveNoteSourcePathFromVFile = (
  file: NoteSourceVFileLike | undefined,
): string | undefined => {
  const directPath = normalizeCandidate(file?.path);
  if (directPath !== undefined) {
    return directPath;
  }

  const history = file?.history;
  if (Array.isArray(history)) {
    for (let index = history.length - 1; index >= 0; index -= 1) {
      const candidate = normalizeCandidate(history[index]);
      if (candidate !== undefined) {
        return candidate;
      }
    }
  }

  return readDataCandidate(file?.data);
};
