import type { VFileLike } from '../types.js';
import type { NotePolicyContext } from './note-policy-context.js';
import { createNotePolicyContext } from './note-policy-context.js';

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u;

const pickFrontmatterValue = (frontmatter: string, key: string): string | undefined => {
  const pattern = new RegExp(`^\\s*${key}\\s*:\\s*(.+?)\\s*$`, 'mu');
  const matched = pattern.exec(frontmatter);
  if (!matched?.[1]) {
    return undefined;
  }

  return matched[1].trim().replace(/^['"]|['"]$/gu, '');
};

export const buildNotePolicyContext = (file: VFileLike | undefined): NotePolicyContext => {
  if (typeof file?.value !== 'string' || file.value.trim().length === 0) {
    return createNotePolicyContext('testing', 'sandbox');
  }

  const frontmatter = FRONTMATTER_PATTERN.exec(file.value)?.[1] ?? '';
  return createNotePolicyContext(
    pickFrontmatterValue(frontmatter, 'kind'),
    pickFrontmatterValue(frontmatter, 'testingArea'),
  );
};
