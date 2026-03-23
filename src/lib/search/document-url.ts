function tryParseUrl(value: string): URL | null {
  try {
    return new URL(value, 'https://rouault.invalid');
  } catch {
    return null;
  }
}

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

export function normalizeDocumentCanonicalUrl(value: string): string | null {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }

  const parsed = tryParseUrl(normalized);
  if (parsed === null) {
    return null;
  }

  const protocol = parsed.protocol;
  if (
    protocol !== 'http:' &&
    protocol !== 'https:' &&
    !(normalized.startsWith('/') || normalized.startsWith('./') || normalized.startsWith('../'))
  ) {
    return null;
  }

  if (parsed.username.length > 0 || parsed.password.length > 0) {
    return null;
  }

  const pathname = normalizeEncodedPathname(parsed.pathname || '/');
  return isDocumentUrlPath(pathname) ? pathname : null;
}

export function derivePathLabel(documentCanonicalUrl: string): string {
  const canonicalUrl = normalizeDocumentCanonicalUrl(documentCanonicalUrl);
  if (canonicalUrl === null || canonicalUrl === '/') {
    return '/';
  }

  const segments = canonicalUrl
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
  | { ok: true; url: string }
  | {
      ok: false;
      code:
        | 'invalid-result-url'
        | 'unsupported-url-scheme'
        | 'cross-origin-url'
        | 'url-with-credentials';
    };

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

  const pathname = parsed.pathname.replace(/\/+/g, '/');
  return {
    ok: true,
    url: `${pathname}${parsed.search}${parsed.hash}`,
  };
}
