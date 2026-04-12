import type { UrlPolicy } from './url-policy.js';

const TRAILING_SLASH_CANONICAL_PREFIXES = ['/about', '/corpora', '/search'] as const;
const TAG_PAGE_PATH_PATTERN = /^\/tags\/[^/]+\/$/u;

const hasTrailingSlashCanonicalPrefix = (pathname: string): boolean =>
  TRAILING_SLASH_CANONICAL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

export class RouaultUrlPolicy implements UrlPolicy {
  normalizePathname(pathname: string): string {
    if (pathname === '/') {
      return pathname;
    }

    if (hasTrailingSlashCanonicalPrefix(pathname)) {
      return pathname.endsWith('/') ? pathname : `${pathname}/`;
    }

    if (TAG_PAGE_PATH_PATTERN.test(pathname)) {
      return pathname;
    }

    return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  }

  sanitizeSearchParams(url: URL): void {
    url.searchParams.delete('wtr-session-id');
  }

  resolveContentPath(pathname: string): string {
    if (pathname === '/') {
      return pathname;
    }

    const lastSegment = pathname.split('/').pop() ?? '';
    if (!pathname.endsWith('/') && !lastSegment.includes('.')) {
      return `${pathname}/`;
    }

    return pathname;
  }
}