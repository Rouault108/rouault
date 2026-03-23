function tryParseUrl(value: string): URL | null {
  try {
    return new URL(value, 'https://rouault.invalid');
  } catch {
    return null;
  }
}

function encodePathSegments(pathname: string): string {
  const segments = pathname
    .split('/')
    .filter((segment) => segment.length > 0)
    .map((segment) => {
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    });

  return `/${segments.join('/')}`;
}

function normalizePathname(pathname: string): string {
  const collapsed = pathname.replace(/\/+/g, '/');
  const withoutIndex = collapsed.replace(/\/index\.html$/u, '/');
  const encoded = encodePathSegments(withoutIndex);

  if (encoded === '/') {
    return '/';
  }

  return encoded.endsWith('/') ? encoded : `${encoded}/`;
}

function isSearchStatePath(pathname: string): boolean {
  return pathname === '/search' || pathname === '/search/' || pathname.startsWith('/tags/');
}

export function normalizeDocumentCanonicalUrl(value: string): string | null {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }

  const parsed = tryParseUrl(normalized);
  if (parsed === null) {
    return null;
  }

  if (parsed.username.length > 0 || parsed.password.length > 0) {
    return null;
  }

  const pathname = normalizePathname(parsed.pathname || '/');
  if (isSearchStatePath(pathname)) {
    return null;
  }

  return pathname;
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

export function derivePathLabel(documentCanonicalUrl: string): string {
  const trimmed = documentCanonicalUrl.trim();
  if (trimmed === '/') {
    return '/';
  }

  const segments = trimmed
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

  const joinSegments = (items: readonly string[]): string => items.join(' / ');
  const full = joinSegments(segments);
  if (full.length <= 80) {
    return full;
  }

  const abbreviated = joinSegments([...segments.slice(0, 2), '…', ...segments.slice(-2)]);
  if (abbreviated.length <= 80) {
    return abbreviated;
  }

  const shortened = segments.map((segment) => truncateSegment(segment, 12));
  const shortenedJoined = joinSegments([
    ...shortened.slice(0, 2),
    '…',
    ...shortened.slice(-2),
  ]);

  return shortenedJoined.length <= 80 ? shortenedJoined : truncateSegment(shortenedJoined, 80);
}

export type ValidatedResultUrl =
  | { ok: true; url: string }
  | { ok: false; code: 'invalid-result-url' | 'unsupported-url-scheme' | 'cross-origin-url' | 'url-with-credentials' };

export function validateResultUrl(value: string): ValidatedResultUrl {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return { ok: false, code: 'invalid-result-url' };
  }

  const parsed = tryParseUrl(normalized);
  if (parsed === null) {
    return { ok: false, code: 'invalid-result-url' };
  }

  if (parsed.username.length > 0 || parsed.password.length > 0) {
    return { ok: false, code: 'url-with-credentials' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, code: 'unsupported-url-scheme' };
  }

  const currentOrigin =
    typeof window === 'undefined' ? 'https://rouault.invalid' : window.location.origin;

  if (parsed.origin !== 'https://rouault.invalid' && parsed.origin !== currentOrigin) {
    return { ok: false, code: 'cross-origin-url' };
  }

  const path = parsed.pathname.replace(/\/+/g, '/');
  const search = parsed.search;
  const hash = parsed.hash;
  return {
    ok: true,
    url: `${path}${search}${hash}`,
  };
}
