export const ROUTER_SESSION_SEARCH_PARAM = 'wtr-session-id';

const TRAILING_SLASH_CANONICAL_PREFIXES = ['/about', '/corpora', '/search'] as const;
const TAG_PAGE_PATH_PATTERN = /^\/tags\/[^/]+\/$/u;

const hasTrailingSlashCanonicalPrefix = (pathname: string): boolean =>
  TRAILING_SLASH_CANONICAL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

export const normalizeRouaultPathname = (pathname: string): string => {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (normalized === '/') {
    return normalized;
  }

  if (hasTrailingSlashCanonicalPrefix(normalized)) {
    return normalized.endsWith('/') ? normalized : `${normalized}/`;
  }

  if (TAG_PAGE_PATH_PATTERN.test(normalized)) {
    return normalized;
  }

  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
};

export const sanitizeRouaultSearchParams = (url: URL): void => {
  url.searchParams.delete(ROUTER_SESSION_SEARCH_PARAM);
};

export const resolveRouaultContentPath = (pathname: string): string => {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (normalized === '/') {
    return normalized;
  }

  const lastSegment = normalized.split('/').pop() ?? '';
  if (!normalized.endsWith('/') && !lastSegment.includes('.')) {
    return `${normalized}/`;
  }

  return normalized;
};
