import type { SiteUrlContext } from '../site/site-url-context.js';
import { isPathnameInsideBasePath } from '../site/site-url-context.js';
import { hasAsciiControlCharacter } from '../string/ascii-control.js';
import { stripBasePathFromPathname } from '../url/normalize-rouault-url.js';

declare const SearchCanonicalPathnameBrand: unique symbol;
declare const SearchRenderHrefBrand: unique symbol;

export type SearchCanonicalPathname = string & { readonly [SearchCanonicalPathnameBrand]: true };
export type SearchRenderHref = string & { readonly [SearchRenderHrefBrand]: true };

const ABSOLUTE_OR_PROTOCOL_RELATIVE_URL_RE = /^(?:[A-Za-z][A-Za-z0-9+.-]*:|\/\/)/u;

function normalizeEncodedPathname(pathname: string): string {
  const collapsed = pathname.replace(/\/+/g, '/');
  const withoutIndex = collapsed.replace(/\/index\.html$/u, '/');
  const segments = withoutIndex
    .split('/')
    .filter((segment) => segment.length > 0)
    .map((segment) => {
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    });

  if (segments.length === 0) {
    return '/';
  }

  return `/${segments.join('/')}/`;
}

function isDocumentUrlPath(pathname: string): boolean {
  return !(pathname === '/search/' || pathname === '/search' || pathname.startsWith('/tags/'));
}

function extractCanonicalPathnameInput(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (ABSOLUTE_OR_PROTOCOL_RELATIVE_URL_RE.test(trimmed)) {
    return null;
  }

  if (!trimmed.startsWith('/')) {
    return null;
  }

  if (/[?#\\]/u.test(trimmed) || hasAsciiControlCharacter(trimmed)) {
    return null;
  }

  return trimmed;
}

function truncateSegment(segment: string, maxLength: number): string {
  if (segment.length <= maxLength) {
    return segment;
  }

  if (maxLength <= 1) {
    return segment.slice(0, maxLength);
  }

  return `${segment.slice(0, maxLength - 1)}…`;
}

function joinPathLabelSegments(segments: readonly string[]): string {
  return segments.join(' / ');
}

export function normalizeSearchCanonicalPathname(value: string): SearchCanonicalPathname | null {
  const pathnameInput = extractCanonicalPathnameInput(value);
  if (pathnameInput === null) {
    return null;
  }

  const pathname = normalizeEncodedPathname(pathnameInput);
  return isDocumentUrlPath(pathname) ? (pathname as SearchCanonicalPathname) : null;
}

export function derivePathLabel(documentCanonicalPathname: string): string {
  const canonicalPathname = normalizeSearchCanonicalPathname(documentCanonicalPathname);
  if (canonicalPathname === null || canonicalPathname === '/') {
    return '/';
  }

  const segments = canonicalPathname
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .flatMap((segment) => {
      if (segment.length === 0) {
        return [];
      }

      try {
        return [decodeURIComponent(segment).normalize('NFKC').trim()];
      } catch {
        return [segment.normalize('NFKC').trim()];
      }
    })
    .filter((segment) => segment.length > 0);

  if (segments.length === 0) {
    return '/';
  }

  const full = joinPathLabelSegments(segments);
  if (full.length <= 80) {
    return full;
  }

  const abbreviated = joinPathLabelSegments([...segments.slice(0, 2), '…', ...segments.slice(-2)]);
  if (abbreviated.length <= 80) {
    return abbreviated;
  }

  const shortened = segments.map((segment) => truncateSegment(segment, 12));
  const shortenedLabel = joinPathLabelSegments([
    ...shortened.slice(0, 2),
    '…',
    ...shortened.slice(-2),
  ]);

  return shortenedLabel.length <= 80 ? shortenedLabel : truncateSegment(shortenedLabel, 80);
}

export type ValidatedResultUrl =
  | {
      ok: true;
      canonicalPathname: SearchCanonicalPathname;
      renderHref: SearchRenderHref;
    }
  | {
      ok: false;
      code:
        | 'invalid-result-url'
        | 'unsupported-url-scheme'
        | 'cross-origin-url'
        | 'url-with-credentials';
    };

export function validateSearchResultRenderHref(
  value: string,
  options: { readonly siteUrlContext: SiteUrlContext },
): ValidatedResultUrl {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return { ok: false, code: 'invalid-result-url' };
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized, `${options.siteUrlContext.siteOrigin}${options.siteUrlContext.basePath || '/'}`);
  } catch {
    return { ok: false, code: 'invalid-result-url' };
  }

  if (parsed.username.length > 0 || parsed.password.length > 0) {
    return { ok: false, code: 'url-with-credentials' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, code: 'unsupported-url-scheme' };
  }

  if (parsed.origin !== options.siteUrlContext.siteOrigin) {
    return { ok: false, code: 'cross-origin-url' };
  }

  if (!isPathnameInsideBasePath(parsed.pathname, options.siteUrlContext.basePath)) {
    return { ok: false, code: 'cross-origin-url' };
  }

  const pathnameWithoutBasePath = stripBasePathFromPathname(
    parsed.pathname,
    options.siteUrlContext.basePath,
  );
  const canonicalPathname = normalizeSearchCanonicalPathname(pathnameWithoutBasePath);
  if (canonicalPathname === null) {
    return { ok: false, code: 'invalid-result-url' };
  }

  return {
    ok: true,
    canonicalPathname,
    renderHref: buildSearchRenderHref({
      canonicalPathname,
      basePath: options.siteUrlContext.basePath,
    }),
  };
}

export const createSearchCanonicalPathname = (options: {
  readonly pathname: string;
  readonly isInternalDocumentPathname?: (pathname: string) => boolean;
}): { readonly ok: true; readonly canonicalPathname: SearchCanonicalPathname } | { readonly ok: false; readonly reason: 'invalid-canonical-pathname' } => {
  const normalized = normalizeSearchCanonicalPathname(options.pathname);
  if (normalized === null) return { ok: false, reason: 'invalid-canonical-pathname' };
  if (options.isInternalDocumentPathname && !options.isInternalDocumentPathname(normalized)) return { ok: false, reason: 'invalid-canonical-pathname' };
  return { ok: true, canonicalPathname: normalized as SearchCanonicalPathname };
};

export const buildSearchRenderHref = (options: { readonly canonicalPathname: SearchCanonicalPathname; readonly basePath?: string }): SearchRenderHref => {
  const basePath = options.basePath ?? '';
  return `${basePath}${options.canonicalPathname}` as SearchRenderHref;
};
