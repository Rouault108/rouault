import type { VFileLike } from '../types.js';
import type { NotePolicyContext } from './note-policy-context.js';
import { createNotePolicyContext } from './note-policy-context.js';
import { normalizeTestingArea } from '../../../../shared/note/testing-area.js';

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u;
const TESTING_NOTE_PATH_PATTERN = /(?:^|\/)content\/testing\/([^/]+)\.md$/u;

const pickFrontmatterValue = (frontmatter: string, key: string): string | undefined => {
  const pattern = new RegExp(`^\\s*${key}\\s*:\\s*(.+?)\\s*$`, 'mu');
  const matched = pattern.exec(frontmatter);
  if (!matched?.[1]) {
    return undefined;
  }

  return matched[1].trim().replace(/^['"]|['"]$/gu, '');
};

const inferPolicyContextFromPath = (filePath: string): NotePolicyContext | null => {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const matched = TESTING_NOTE_PATH_PATTERN.exec(normalizedPath);
  if (!matched?.[1]) {
    return null;
  }

  const testingArea = normalizeTestingArea(matched[1]);
  if (!testingArea) {
    return null;
  }

  return createNotePolicyContext('testing', testingArea);
};

export const buildNotePolicyContext = (file: VFileLike | undefined): NotePolicyContext => {
  if (typeof file?.value !== 'string' || file.value.trim().length === 0) {
    return createNotePolicyContext('testing', 'sandbox');
  }

  const frontmatter = FRONTMATTER_PATTERN.exec(file.value)?.[1] ?? '';
  const kind = pickFrontmatterValue(frontmatter, 'kind');
  const testingArea = pickFrontmatterValue(frontmatter, 'testingArea');

  if (kind !== undefined || testingArea !== undefined) {
    return createNotePolicyContext(kind, testingArea);
  }

  return inferPolicyContextFromPath(file.path ?? '') ?? createNotePolicyContext('reader');
};
