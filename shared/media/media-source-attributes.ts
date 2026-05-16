import { validateDataImageUrl } from './data-image-url.js';
import { parseSrcset, serializeSrcset, type SrcsetCandidate } from './srcset-parser.js';
import { detectUnsafeHref } from '../link/unsafe-href-detector.js';
import type { SiteUrlContext } from '../site/site-url-context.js';
import { isPathnameInsideBasePath } from '../site/site-url-context.js';
import { stripBasePathFromPathname } from '../url/normalize-rouault-url.js';

export interface MediaSourceDescriptor {
  readonly type: string;
  readonly srcset: string;
  readonly sizes?: string;
}

export type MediaUrlSafetyReason =
  | 'empty-media-url'
  | 'unsafe-media-url'
  | 'unsupported-media-scheme'
  | 'invalid-data-image-url'
  | 'invalid-srcset';

export type MediaUrlSafetyResult =
  | {
      readonly ok: true;
      readonly url: string;
    }
  | {
      readonly ok: false;
      readonly reason: MediaUrlSafetyReason;
    };

export interface SanitizeMediaUrlOptions {
  readonly allowDataImage?: boolean;
}

const MEDIA_URL_PROTOCOL_RE = /^([A-Za-z][A-Za-z0-9+.-]*):/u;
const WEB_MEDIA_PROTOCOLS = new Set(['http:', 'https:']);

const pickOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getExplicitProtocol = (value: string): string | null => {
  const match = MEDIA_URL_PROTOCOL_RE.exec(value);
  return match?.[1] === undefined ? null : `${match[1].toLowerCase()}:`;
};

export const validateMediaUrl = (
  value: unknown,
  options: SanitizeMediaUrlOptions = {},
): MediaUrlSafetyResult => {
  if (typeof value !== 'string') {
    return { ok: false, reason: 'empty-media-url' };
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: 'empty-media-url' };
  }

  const protocol = getExplicitProtocol(trimmed);
  if (protocol === 'data:') {
    if (options.allowDataImage === true && validateDataImageUrl(trimmed).ok) {
      return { ok: true, url: trimmed };
    }
    return { ok: false, reason: 'invalid-data-image-url' };
  }

  if (protocol !== null && !WEB_MEDIA_PROTOCOLS.has(protocol)) {
    return { ok: false, reason: 'unsupported-media-scheme' };
  }

  const unsafe = detectUnsafeHref(trimmed);
  if (!unsafe.ok) {
    return { ok: false, reason: 'unsafe-media-url' };
  }

  return { ok: true, url: trimmed };
};

export const sanitizeMediaUrl = (
  value: unknown,
  options: SanitizeMediaUrlOptions = {},
): string | undefined => {
  const result = validateMediaUrl(value, options);
  return result.ok ? result.url : undefined;
};

export const sanitizeImageSource = (value: unknown): string | undefined =>
  sanitizeMediaUrl(value, { allowDataImage: true });

export const sanitizeVideoSource = (value: unknown): string | undefined =>
  sanitizeMediaUrl(value, { allowDataImage: false });

export const sanitizeVideoPoster = (value: unknown): string | undefined =>
  sanitizeMediaUrl(value, { allowDataImage: true });

export const SCORE_MEDIA_PATH_PREFIX = '/media/score/';

export interface SanitizeScoreSourceOptions {
  readonly siteUrlContext: SiteUrlContext;
}

export const sanitizeScoreSource = (
  value: unknown,
  options: SanitizeScoreSourceOptions,
): string | undefined => {
  const sanitized = sanitizeMediaUrl(value, { allowDataImage: false });
  if (sanitized === undefined) {
    return undefined;
  }

  try {
    const resolved = new URL(
      sanitized,
      `${options.siteUrlContext.siteOrigin}${options.siteUrlContext.basePath || '/'}`,
    );
    if (resolved.origin !== options.siteUrlContext.siteOrigin) {
      return undefined;
    }
    if (!isPathnameInsideBasePath(resolved.pathname, options.siteUrlContext.basePath)) {
      return undefined;
    }
    const pathnameWithoutBasePath = stripBasePathFromPathname(
      resolved.pathname,
      options.siteUrlContext.basePath,
    );
    if (!pathnameWithoutBasePath.startsWith(SCORE_MEDIA_PATH_PREFIX)) {
      return undefined;
    }
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return undefined;
  }
};

export const sanitizeImageSrcset = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined;
  }

  const parsed = parseSrcset(value);
  if (!parsed.ok) {
    return undefined;
  }

  const candidates: SrcsetCandidate[] = [];
  for (const candidate of parsed.candidates) {
    const sanitizedUrl = sanitizeImageSource(candidate.url);
    if (sanitizedUrl === undefined) {
      return undefined;
    }
    candidates.push({
      url: sanitizedUrl,
      descriptors: candidate.descriptors,
    });
  }

  return serializeSrcset(candidates);
};

export const sanitizeMediaSources = (
  sources: readonly MediaSourceDescriptor[],
): MediaSourceDescriptor[] =>
  sources.flatMap((source): readonly MediaSourceDescriptor[] => {
    const type = source.type.trim();
    const srcset = sanitizeImageSrcset(source.srcset);
    const sizes = source.sizes?.trim();

    if (type.length === 0 || srcset === undefined) {
      return [];
    }

    return [{ type, srcset, ...(sizes && sizes.length > 0 ? { sizes } : {}) }];
  });

export const serializeMediaSources = (sources: readonly MediaSourceDescriptor[]): string =>
  JSON.stringify(sanitizeMediaSources(sources));

export const parseMediaSourcesAttribute = (value: string | null): MediaSourceDescriptor[] => {
  if (value === null || value.trim() === '') {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return sanitizeMediaSources(
      parsed.flatMap((entry): readonly MediaSourceDescriptor[] => {
        if (!isRecord(entry)) {
          return [];
        }

        const type = pickOptionalString(entry['type']);
        const srcset = pickOptionalString(entry['srcset']);
        const sizes = pickOptionalString(entry['sizes']);

        if (!type || !srcset) {
          return [];
        }

        return [{ type, srcset, ...(sizes ? { sizes } : {}) }];
      }),
    );
  } catch {
    return [];
  }
};
