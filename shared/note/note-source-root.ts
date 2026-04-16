export const NOTE_SOURCE_ROOTS = ['content', 'test/fixtures/content'] as const;

export type NoteSourceRoot = (typeof NOTE_SOURCE_ROOTS)[number];

const normalizePathLike = (value: string): string =>
  value.trim().replace(/\\/gu, '/').replace(/^\.\//u, '').replace(/^\/+|\/+$/gu, '');

export const normalizeNoteSourceRoot = (value: unknown): NoteSourceRoot | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = normalizePathLike(value);
  return NOTE_SOURCE_ROOTS.find((candidate) => candidate === normalized);
};

export interface ResolvedNoteSourceLocation {
  sourceRoot: NoteSourceRoot;
  slug: string;
}

export const resolveNoteSourceLocation = (value: string): ResolvedNoteSourceLocation => {
  const normalized = normalizePathLike(value);

  for (const sourceRoot of NOTE_SOURCE_ROOTS) {
    const prefix = `${sourceRoot}/`;
    if (normalized.startsWith(prefix)) {
      return {
        sourceRoot,
        slug: normalized.slice(prefix.length),
      };
    }
  }

  throw new Error(
    `[note-source-root] Unsupported note source path "${value}". ` +
      `Expected one of: ${NOTE_SOURCE_ROOTS.join(', ')}`,
  );
};
