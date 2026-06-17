export type {
  TocCapabilities,
  TocHeading,
  TocScopeSelection,
} from '../../shared/toc/toc-chrome-projection.js';
export {
  hasDynamicTocScopeSelections,
  normalizeTocCapabilities,
  normalizeTocHeading,
  normalizeTocHeadings,
} from '../../shared/toc/toc-normalization.js';
import { parseTocHeadingsJson as parseSharedTocHeadingsJson } from '../../shared/toc/toc-normalization.js';
import type { TocHeading } from '../../shared/toc/toc-chrome-projection.js';

export const parseTocHeadingsJson = (value: string): readonly TocHeading[] | null => {
  const result = parseSharedTocHeadingsJson({
    sourceId: 'legacy-inline-toc',
    serializedSourceText: value,
  });

  if (result.status === 'empty-source') {
    return null;
  }

  if (result.status === 'invalid-json') {
    return [];
  }

  return result.headings;
};
