import type { NormalizeNotePathInput, NormalizedNotePath } from './types.js';

const trimSlashes = (value: string): string => value.trim().replace(/^\/+|\/+$/gu, '');

export const normalizeNotePath = ({
  requestedSlug,
  hasLeaf,
  hasDirectoryIndex,
}: NormalizeNotePathInput): NormalizedNotePath => {
  const normalized = trimSlashes(requestedSlug);

  if (normalized.length === 0) {
    throw new Error('Empty slug is not allowed.');
  }

  if (normalized === 'index') {
    throw new Error(
      'content/index.md は未対応です。必要ならルートノート用の別仕様を定義してください。',
    );
  }

  if (hasLeaf && hasDirectoryIndex) {
    throw new Error(
      `Ambiguous note source for "${normalized}". ` +
        `Both "${normalized}.md" and "${normalized}/index.md" exist.`,
    );
  }

  if (hasDirectoryIndex) {
    return {
      rawSlug: `${normalized}/index`,
      slug: normalized,
      permalink: `/notes/${normalized}`,
      kind: 'directory-index',
      directoryPath: normalized,
    };
  }

  return {
    rawSlug: normalized,
    slug: normalized,
    permalink: `/notes/${normalized}`,
    kind: 'leaf',
  };
};
