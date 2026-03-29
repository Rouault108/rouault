import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { normalizeNoteContentKind, type NoteContentKind } from '../../src/types/note-kind.js';
import { normalizeTestingArea, type TestingArea } from '../../src/types/testing-area.js';

export interface SourceNoteMetadata {
  readonly kind: NoteContentKind;
  readonly testingArea?: TestingArea;
}

const metadataCache = new Map<string, SourceNoteMetadata>();

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u;

const pickFrontmatterValue = (frontmatter: string, key: string): string | undefined => {
  const pattern = new RegExp(`^\\s*${key}\\s*:\\s*(.+?)\\s*$`, 'mu');
  const matched = pattern.exec(frontmatter);
  if (!matched?.[1]) {
    return undefined;
  }

  return matched[1].trim().replace(/^['"]|['"]$/g, '');
};

const buildDefaultMetadata = (): SourceNoteMetadata => ({
  kind: 'reader',
});

export const readSourceNoteMetadata = (filePath: string | undefined): SourceNoteMetadata => {
  if (typeof filePath !== 'string' || filePath.trim().length === 0) {
    return buildDefaultMetadata();
  }

  const normalizedPath = path.resolve(filePath);
  const cached = metadataCache.get(normalizedPath);
  if (cached) {
    return cached;
  }

  if (!existsSync(normalizedPath)) {
    return buildDefaultMetadata();
  }

  const source = readFileSync(normalizedPath, 'utf8');
  const frontmatter = FRONTMATTER_PATTERN.exec(source)?.[1] ?? '';
  const metadata: SourceNoteMetadata = {
    kind: normalizeNoteContentKind(pickFrontmatterValue(frontmatter, 'kind')),
    testingArea: normalizeTestingArea(pickFrontmatterValue(frontmatter, 'testingArea')),
  };

  metadataCache.set(normalizedPath, metadata);
  return metadata;
};
