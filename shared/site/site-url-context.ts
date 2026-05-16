export interface SiteUrlContext {
  readonly siteOrigin: string;
  readonly basePath: string;
}

export const DEFAULT_SITE_URL_CONTEXT: SiteUrlContext = {
  siteOrigin: 'https://rouault.invalid',
  basePath: '',
};

export type SiteUrlContextContractErrorReason = 'invalid-site-origin' | 'invalid-base-path';

export class SiteUrlContextContractError extends Error {
  override readonly name = 'SiteUrlContextContractError';
  readonly reason: SiteUrlContextContractErrorReason;

  constructor(reason: SiteUrlContextContractErrorReason, message: string) {
    super(message);
    this.reason = reason;
  }
}

export interface CreateSiteUrlContextInput {
  readonly siteOrigin: unknown;
  readonly basePath?: unknown;
}

const WHITESPACE_RE = /\s/u;
const BASE_PATH_FORBIDDEN_CHARS_RE = /[?#\\]/u;

const fail = (reason: SiteUrlContextContractErrorReason, message: string): never => {
  throw new SiteUrlContextContractError(reason, message);
};

export const normalizeSiteOrigin = (value: unknown): string => {
  if (typeof value !== 'string') {
    return fail('invalid-site-origin', 'siteOrigin must be a string.');
  }
  const siteOrigin = value;

  if (siteOrigin.length === 0 || siteOrigin !== siteOrigin.trim()) {
    fail('invalid-site-origin', 'siteOrigin must be a non-empty absolute origin.');
  }

  let parsed: URL;
  try {
    parsed = new URL(siteOrigin);
  } catch {
    return fail('invalid-site-origin', 'siteOrigin must be a valid absolute URL.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    fail('invalid-site-origin', 'siteOrigin must use http or https.');
  }

  if (parsed.username.length > 0 || parsed.password.length > 0) {
    fail('invalid-site-origin', 'siteOrigin must not include credentials.');
  }

  if (parsed.search.length > 0 || parsed.hash.length > 0) {
    fail('invalid-site-origin', 'siteOrigin must not include query or hash.');
  }

  if (parsed.pathname !== '/') {
    fail('invalid-site-origin', 'siteOrigin must not include a non-root path.');
  }

  return parsed.origin;
};

const validateBasePathSegment = (segment: string): void => {
  if (segment.length === 0) {
    fail('invalid-base-path', 'basePath must not contain empty path segments.');
  }

  if (segment === '.' || segment === '..') {
    fail('invalid-base-path', 'basePath must not contain dot segments.');
  }
};

export const normalizeBasePath = (value: unknown): string => {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value !== 'string') {
    return fail('invalid-base-path', 'basePath must be a string.');
  }
  const basePath = value;

  if (basePath.length === 0 || basePath === '/') {
    return '';
  }

  if (basePath !== basePath.trim() || WHITESPACE_RE.test(basePath) || hasAsciiControlCharacter(basePath)) {
    fail('invalid-base-path', 'basePath must not include whitespace or control characters.');
  }

  if (!basePath.startsWith('/')) {
    fail('invalid-base-path', 'basePath must be empty or start with a slash.');
  }

  if (basePath.includes('//')) {
    fail('invalid-base-path', 'basePath must not contain duplicate slashes.');
  }

  if (BASE_PATH_FORBIDDEN_CHARS_RE.test(basePath)) {
    fail('invalid-base-path', 'basePath must not contain query, hash, or backslash characters.');
  }

  if (basePath.includes('%')) {
    fail('invalid-base-path', 'basePath must not contain percent-encoded characters.');
  }

  const normalized = basePath.endsWith('/') ? basePath.slice(0, -1) : value;
  const segments = normalized.slice(1).split('/');
  for (const segment of segments) {
    validateBasePathSegment(segment);
  }

  return normalized;
};

export const createSiteUrlContext = (input: CreateSiteUrlContextInput): SiteUrlContext => ({
  siteOrigin: normalizeSiteOrigin(input.siteOrigin),
  basePath: normalizeBasePath(input.basePath),
});

export const isPathnameInsideBasePath = (pathname: string, basePath: string): boolean => {
  const normalizedBasePath = normalizeBasePath(basePath);
  if (normalizedBasePath.length === 0) {
    return pathname.startsWith('/');
  }

  return pathname === normalizedBasePath || pathname.startsWith(`${normalizedBasePath}/`);
};
import { hasAsciiControlCharacter } from '../string/ascii-control.js';
