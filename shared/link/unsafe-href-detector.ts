import {
  validateLinkHrefAttribute,
  type LinkHrefInputValidationReason,
} from './link-href-input.js';

export const WEB_LINK_PROTOCOLS: ReadonlySet<string> = new Set(['http:', 'https:']);
export const EXTERNAL_ACTION_PROTOCOLS: ReadonlySet<string> = new Set(['mailto:', 'tel:']);
export const UNSAFE_LINK_PROTOCOLS: ReadonlySet<string> = new Set([
  'javascript:',
  'data:',
  'vbscript:',
]);

export type UnsafeHrefReason =
  | LinkHrefInputValidationReason
  | 'unsafe-scheme'
  | 'unknown-scheme'
  | 'url-with-credentials';

export type UnsafeHrefDetectionResult =
  | {
      readonly ok: true;
    }
  | {
      readonly ok: false;
      readonly reason: UnsafeHrefReason;
    };

const SCHEME_RE = /^([A-Za-z][A-Za-z0-9+.-]*):/u;
const CREDENTIALS_IN_AUTHORITY_RE = /^(?:[^/?#]*@)/u;
const URL_BASE_FOR_PROTOCOL_RELATIVE = 'https://rouault.invalid';

const detectWebUrlCredentials = (href: string): boolean => {
  try {
    const parsed = href.startsWith('//')
      ? new URL(href, URL_BASE_FOR_PROTOCOL_RELATIVE)
      : new URL(href);
    return parsed.username.length > 0 || parsed.password.length > 0;
  } catch {
    return false;
  }
};

const hasProtocolRelativeCredentials = (href: string): boolean => {
  if (!href.startsWith('//')) {
    return false;
  }

  const authorityAndRest = href.slice(2);
  const authorityEndIndex = authorityAndRest.search(/[/?#]/u);
  const authority =
    authorityEndIndex < 0 ? authorityAndRest : authorityAndRest.slice(0, authorityEndIndex);
  return CREDENTIALS_IN_AUTHORITY_RE.test(authority);
};

export const detectUnsafeHref = (value: unknown): UnsafeHrefDetectionResult => {
  const validation = validateLinkHrefAttribute(value);
  if (validation.ok === false) {
    return { ok: false, reason: validation.reason };
  }

  const href = validation.input.trimmedHref;

  if (hasProtocolRelativeCredentials(href)) {
    return { ok: false, reason: 'url-with-credentials' };
  }

  const schemeMatch = SCHEME_RE.exec(href);
  if (schemeMatch === null) {
    return { ok: true };
  }

  const protocol = `${schemeMatch[1]?.toLowerCase() ?? ''}:`;

  if (UNSAFE_LINK_PROTOCOLS.has(protocol)) {
    return { ok: false, reason: 'unsafe-scheme' };
  }

  if (WEB_LINK_PROTOCOLS.has(protocol)) {
    if (detectWebUrlCredentials(href)) {
      return { ok: false, reason: 'url-with-credentials' };
    }
    return { ok: true };
  }

  if (EXTERNAL_ACTION_PROTOCOLS.has(protocol)) {
    return { ok: true };
  }

  return { ok: false, reason: 'unknown-scheme' };
};
