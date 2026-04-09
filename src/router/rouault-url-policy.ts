import type { UrlPolicy } from './url-policy.js';

const CORPORA_ROOT_PATH = '/corpora';
const ABOUT_ROOT_PATH = '/about';

export class RouaultUrlPolicy implements UrlPolicy {
  normalizePathname(pathname: string): string {
    if (pathname === '/') {
      return pathname;
    }

    if (pathname === '/search/' || pathname === '/search') {
      return '/search';
    }

    if (pathname === ABOUT_ROOT_PATH) {
      return '/about/';
    }

    if (pathname.startsWith('/about/')) {
      return pathname.endsWith('/') ? pathname : `${pathname}/`;
    }

    if (pathname === CORPORA_ROOT_PATH) {
      return '/corpora/';
    }

    if (pathname.startsWith('/corpora/')) {
      return pathname.endsWith('/') ? pathname : `${pathname}/`;
    }

    if (/^\/tags\/[^/]+\/$/u.test(pathname)) {
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
