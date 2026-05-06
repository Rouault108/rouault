import { normalizeTocRuntimeId } from './toc-runtime-id.js';

export const resolveTocRuntimeId = (
  tocRuntimeId: string,
  sourceId: string,
  contentRootId: string,
  fallback = 'page-toc',
): string => {
  const explicitRuntimeId = normalizeTocRuntimeId(tocRuntimeId);
  if (explicitRuntimeId !== null) {
    return explicitRuntimeId;
  }

  const normalizedSourceId = sourceId.trim();
  if (normalizedSourceId.length > 0) {
    return normalizedSourceId;
  }

  const normalizedContentRootId = contentRootId.trim();
  if (normalizedContentRootId.length > 0) {
    return normalizedContentRootId;
  }

  return fallback;
};
