export type LinkKind =
  | 'internal-document'
  | 'internal-fragment'
  | 'external-web'
  | 'external-action'
  | 'unsafe';

export interface ClassifyLinkOptions {
  siteOrigin?: string;
  currentUrl?: string;
}

const WEB_PROTOCOLS = new Set(['http:', 'https:']);
const ACTION_PROTOCOLS = new Set(['mailto:', 'tel:']);
const UNSAFE_PROTOCOLS = new Set(['javascript:', 'data:', 'vbscript:']);
const SCHEME_PATTERN = /^[A-Za-z][A-Za-z\d+.-]*:/u;
const FALLBACK_ORIGIN = 'https://rouault.invalid';

const normalizeOptionalText = (value: string | undefined): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const tryCreateUrl = (input: string, base?: string): URL | null => {
  try {
    return base ? new URL(input, base) : new URL(input);
  } catch {
    return null;
  }
};

const resolveBaseUrl = (options: ClassifyLinkOptions): URL => {
  const currentUrl = normalizeOptionalText(options.currentUrl);
  const siteOrigin = normalizeOptionalText(options.siteOrigin);

  const fromCurrent = currentUrl ? tryCreateUrl(currentUrl, siteOrigin ?? FALLBACK_ORIGIN) : null;
  if (fromCurrent) {
    return fromCurrent;
  }

  const fromOrigin = siteOrigin ? tryCreateUrl('/', siteOrigin) : null;
  if (fromOrigin) {
    return fromOrigin;
  }

  return new URL(FALLBACK_ORIGIN);
};

export const classifyLinkHref = (
  href: string,
  options: ClassifyLinkOptions = {},
): LinkKind => {
  const trimmed = href.trim();

  if (trimmed.length === 0) {
    return 'unsafe';
  }

  if (trimmed.startsWith('#')) {
    return 'internal-fragment';
  }

  if (!SCHEME_PATTERN.test(trimmed)) {
    return 'internal-document';
  }

  const baseUrl = resolveBaseUrl(options);
  const resolved = tryCreateUrl(trimmed, baseUrl.toString());

  if (!resolved) {
    return 'unsafe';
  }

  if (UNSAFE_PROTOCOLS.has(resolved.protocol)) {
    return 'unsafe';
  }

  if (ACTION_PROTOCOLS.has(resolved.protocol)) {
    return 'external-action';
  }

  if (WEB_PROTOCOLS.has(resolved.protocol)) {
    const siteOrigin = normalizeOptionalText(options.siteOrigin);
    if (!siteOrigin) {
      return 'external-web';
    }

    const siteUrl = tryCreateUrl('/', siteOrigin);
    if (!siteUrl) {
      return 'external-web';
    }

    if (resolved.origin !== siteUrl.origin) {
      return 'external-web';
    }

    const currentUrl = normalizeOptionalText(options.currentUrl);
    if (currentUrl) {
      const current = tryCreateUrl(currentUrl, siteUrl.toString());
      if (
        resolved.pathname === current?.pathname &&
        resolved.search === current.search &&
        resolved.hash
      ) {
        return 'internal-fragment';
      }
    }

    return 'internal-document';
  }

  return 'external-action';
};

export const isExternalLinkKind = (kind: LinkKind): boolean =>
  kind === 'external-web' || kind === 'external-action';

export const isRoutableLinkKind = (kind: LinkKind): boolean => kind === 'internal-document';