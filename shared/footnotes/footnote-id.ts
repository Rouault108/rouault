export type FootnoteRefHrefParseResult =
  | { kind: 'none' }
  | { kind: 'canonical'; footnoteId: string }
  | { kind: 'invalid'; reason: 'decode-failed' | 'reserved-backref-shape' | 'invalid-id' };

export type FootnoteBackrefParseResult =
  | { kind: 'none' }
  | { kind: 'canonical'; footnoteId: string; instance: number }
  | { kind: 'legacy-user-content-fnref'; legacyId: string }
  | { kind: 'invalid'; reason: 'decode-failed' | 'invalid-instance' | 'invalid-base' };

const CANONICAL_DECIMAL_PATTERN = /^[1-9]\d*$/u;
const RESERVED_REF_SUFFIX_PATTERN = /^fn-.+-ref(?:-.+|-)?$/u;
const USER_CONTENT_FN_PREFIX = 'user-content-fn-';
const USER_CONTENT_FNREF_PREFIX = 'user-content-fnref-';

const hasInvalidCodePoint = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if ((code >= 0x00 && code <= 0x1f) || (code >= 0x7f && code <= 0x9f)) {
      return true;
    }
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        return true;
      }
      index += 1;
      continue;
    }
    if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
};

const isAllowedIdChar = (value: string): boolean => {
  if (value === '_' || value === '-') {
    return true;
  }
  return /^[\p{Letter}\p{Number}\p{Mark}]$/u.test(value);
};

const normalizeBody = (value: string): string => {
  let result = '';
  for (const char of value) {
    result += isAllowedIdChar(char) ? char : '-';
  }
  return result.replace(/-+/gu, '-').replace(/^-+|-+$/gu, '');
};

const isReservedBackrefLikeId = (value: string): boolean => RESERVED_REF_SUFFIX_PATTERN.test(value);

const isBackrefLikeFragmentBody = (value: string): boolean =>
  RESERVED_REF_SUFFIX_PATTERN.test(value) ||
  value.startsWith(USER_CONTENT_FNREF_PREFIX) ||
  value.startsWith('fnref-');

const isFootnoteLikeFragmentBody = (value: string): boolean =>
  value.startsWith('fn-') ||
  value.startsWith(USER_CONTENT_FN_PREFIX) ||
  value.startsWith(USER_CONTENT_FNREF_PREFIX) ||
  value.startsWith('fnref-');

export const canonicalizeFootnoteId = (rawId: string): string | null => {
  if (typeof rawId !== 'string') {
    return null;
  }

  const trimmed = rawId.trim();
  if (trimmed.length === 0 || trimmed.startsWith('#')) {
    return null;
  }

  let normalized: string;
  try {
    normalized = trimmed.normalize('NFKC');
  } catch {
    return null;
  }

  if (normalized.length === 0 || hasInvalidCodePoint(normalized)) {
    return null;
  }

  if (normalized.startsWith(USER_CONTENT_FNREF_PREFIX) || normalized.startsWith('fnref-')) {
    return null;
  }

  if (normalized.startsWith(USER_CONTENT_FN_PREFIX)) {
    normalized = `fn-${normalized.slice(USER_CONTENT_FN_PREFIX.length)}`;
  } else if (!normalized.startsWith('fn-')) {
    normalized = `fn-${normalized}`;
  }

  const body = normalizeBody(normalized.slice(3));
  if (body.length === 0) {
    return null;
  }

  const canonical = `fn-${body}`;
  if (isReservedBackrefLikeId(canonical)) {
    return null;
  }

  return canonical;
};

export const canonicalizeFootnoteFragment = (fragmentWithHash: string): string | null => {
  if (typeof fragmentWithHash !== 'string') {
    return null;
  }

  const trimmed = fragmentWithHash.trim();
  if (!trimmed.startsWith('#')) {
    return null;
  }

  const fragmentBodyEncoded = trimmed.slice(1);
  let fragmentBodyDecoded: string;
  try {
    fragmentBodyDecoded = decodeURIComponent(fragmentBodyEncoded);
  } catch {
    return null;
  }

  return canonicalizeFootnoteId(fragmentBodyDecoded);
};

export const canonicalizeFootnoteLabel = (label: string): string | null =>
  canonicalizeFootnoteId(label);

export const assertCanonicalFootnoteId = (rawId: string, context: string): string => {
  const canonical = canonicalizeFootnoteId(rawId);
  if (canonical === null) {
    throw new Error(`${context}: invalid footnote id "${rawId}"`);
  }
  return canonical;
};

export const parseFootnoteRefHref = (href: string): FootnoteRefHrefParseResult => {
  if (typeof href !== 'string' || !href.trim().startsWith('#')) {
    return { kind: 'none' };
  }

  const fragmentBodyEncoded = href.trim().slice(1);
  let fragmentBodyDecoded: string;
  try {
    fragmentBodyDecoded = decodeURIComponent(fragmentBodyEncoded);
  } catch {
    return isFootnoteLikeFragmentBody(fragmentBodyEncoded)
      ? { kind: 'invalid', reason: 'decode-failed' }
      : { kind: 'none' };
  }

  if (
    isBackrefLikeFragmentBody(fragmentBodyEncoded) ||
    isBackrefLikeFragmentBody(fragmentBodyDecoded)
  ) {
    return { kind: 'invalid', reason: 'reserved-backref-shape' };
  }

  if (
    fragmentBodyEncoded.startsWith('fn-') ||
    fragmentBodyEncoded.startsWith(USER_CONTENT_FN_PREFIX) ||
    fragmentBodyDecoded.startsWith('fn-') ||
    fragmentBodyDecoded.startsWith(USER_CONTENT_FN_PREFIX)
  ) {
    const footnoteId = canonicalizeFootnoteId(fragmentBodyDecoded);
    return footnoteId === null
      ? { kind: 'invalid', reason: 'invalid-id' }
      : { kind: 'canonical', footnoteId };
  }

  return { kind: 'none' };
};

export const resolveFootnoteRefIdFromHref = (href: string): string | null => {
  const parsed = parseFootnoteRefHref(href);
  return parsed.kind === 'canonical' ? parsed.footnoteId : null;
};

export const parseFootnoteBackrefHref = (href: string): FootnoteBackrefParseResult => {
  if (typeof href !== 'string' || !href.trim().startsWith('#')) {
    return { kind: 'none' };
  }

  const fragmentBodyEncoded = href.trim().slice(1);
  const backrefLikeBeforeDecode =
    RESERVED_REF_SUFFIX_PATTERN.test(fragmentBodyEncoded) ||
    fragmentBodyEncoded.startsWith(USER_CONTENT_FNREF_PREFIX);

  let fragmentBodyDecoded: string;
  try {
    fragmentBodyDecoded = decodeURIComponent(fragmentBodyEncoded);
  } catch {
    return backrefLikeBeforeDecode
      ? { kind: 'invalid', reason: 'decode-failed' }
      : { kind: 'none' };
  }

  if (fragmentBodyDecoded.startsWith(USER_CONTENT_FNREF_PREFIX)) {
    return { kind: 'legacy-user-content-fnref', legacyId: fragmentBodyDecoded };
  }

  if (!fragmentBodyDecoded.startsWith('fn-')) {
    return { kind: 'none' };
  }

  const matched = /^(.*)-ref-(.*)$/u.exec(fragmentBodyDecoded);
  if (!matched) {
    return { kind: 'none' };
  }

  const base = matched[1] ?? '';
  const instanceText = matched[2] ?? '';
  if (!CANONICAL_DECIMAL_PATTERN.test(instanceText)) {
    return { kind: 'invalid', reason: 'invalid-instance' };
  }

  const footnoteId = canonicalizeFootnoteId(base);
  if (footnoteId === null) {
    return { kind: 'invalid', reason: 'invalid-base' };
  }

  return { kind: 'canonical', footnoteId, instance: Number.parseInt(instanceText, 10) };
};

export const isFootnoteBackrefHref = (href: string): boolean => {
  const parsed = parseFootnoteBackrefHref(href);
  return parsed.kind === 'canonical' || parsed.kind === 'legacy-user-content-fnref';
};

export const isLegacyUserContentFootnoteBackrefHref = (href: string): boolean =>
  parseFootnoteBackrefHref(href).kind === 'legacy-user-content-fnref';

export const createFootnoteRefId = (footnoteId: string, instance: number): string => {
  if (canonicalizeFootnoteId(footnoteId) !== footnoteId) {
    throw new Error(`invalid canonical footnote id: ${footnoteId}`);
  }
  if (!Number.isInteger(instance) || !Number.isFinite(instance) || instance < 1) {
    throw new Error(`invalid footnote ref instance: ${String(instance)}`);
  }
  return `${footnoteId}-ref-${String(instance)}`;
};
