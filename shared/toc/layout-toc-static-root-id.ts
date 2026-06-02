const LAYOUT_TOC_STATIC_ROOT_ID_PREFIX = 'layout-toc-';

export const resolveLayoutTocStaticRootId = (tocRuntimeId: string): string => {
  const normalized = tocRuntimeId.trim();
  if (normalized.length === 0) {
    throw new Error('toc runtime id is required.');
  }
  return `${LAYOUT_TOC_STATIC_ROOT_ID_PREFIX}${normalized}`;
};
