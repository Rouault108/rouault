const BUILD_PREFIX_PATTERN = /^build\s+/i;
const GIT_SHA_PATTERN = /^[0-9a-f]{7,40}$/i;

export const normalizeBuildLabel = (value: string | undefined): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  if (BUILD_PREFIX_PATTERN.test(trimmed)) {
    return trimmed;
  }

  if (GIT_SHA_PATTERN.test(trimmed)) {
    return `build ${trimmed.slice(0, 7)}`;
  }

  return trimmed;
};
