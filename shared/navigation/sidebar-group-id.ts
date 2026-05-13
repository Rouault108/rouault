import {
  assertValidSidebarId,
  assertValidSidebarStateScopeId,
  normalizeSidebarId,
  normalizeSidebarStateScopeId,
} from './sidebar-identity-contract.js';

const PREFIX = 'sidebar-identity';

export interface ParsedSidebarGroupId {
  readonly stateScopeId: string;
  readonly sidebarId: string;
  readonly rowId: string;
}

export type SidebarGroupIdPrefix = string & { readonly __brand: unique symbol };

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const encodeBase64Url = (value: string): string => {
  const bytes = textEncoder.encode(value);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '');
};

const decodeBase64Url = (value: string): string | null => {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) {
    return null;
  }

  const padded = value.replace(/-/gu, '+').replace(/_/gu, '/').padEnd(
    Math.ceil(value.length / 4) * 4,
    '=',
  );

  try {
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return textDecoder.decode(bytes);
  } catch {
    return null;
  }
};

const parseLengthPrefixedSegments = (value: string, expectedCount: number): string[] | null => {
  const segments: string[] = [];
  let offset = 0;

  for (let index = 0; index < expectedCount; index += 1) {
    const lengthSeparator = value.indexOf('-', offset);
    if (lengthSeparator <= offset) {
      return null;
    }

    const lengthText = value.slice(offset, lengthSeparator);
    if (!/^[1-9][0-9]*$/u.test(lengthText)) {
      return null;
    }

    const length = Number.parseInt(lengthText, 10);
    const segmentStart = lengthSeparator + 1;
    const segmentEnd = segmentStart + length;
    if (segmentEnd > value.length) {
      return null;
    }

    const encoded = value.slice(segmentStart, segmentEnd);
    if (encoded.length !== length) {
      return null;
    }

    segments.push(encoded);
    offset = segmentEnd;

    if (index < expectedCount - 1) {
      if (value[offset] !== '-') {
        return null;
      }
      offset += 1;
    }
  }

  return offset === value.length ? segments : null;
};

const buildLengthPrefixedSegments = (segments: readonly string[]): string =>
  segments.map((segment) => `${String(segment.length)}-${segment}`).join('-');

const parsePrefix = (value: string): { stateScopeId: string; sidebarId: string } | null => {
  const prefix = `${PREFIX}-`;
  if (!value.startsWith(prefix)) {
    return null;
  }

  const segments = parseLengthPrefixedSegments(value.slice(prefix.length), 2);
  if (segments === null) {
    return null;
  }

  const [encodedStateScopeId, encodedSidebarId] = segments;
  if (encodedStateScopeId === undefined || encodedSidebarId === undefined) {
    return null;
  }

  const stateScopeId = decodeBase64Url(encodedStateScopeId);
  const sidebarId = decodeBase64Url(encodedSidebarId);
  if (stateScopeId === null || sidebarId === null) {
    return null;
  }

  if (normalizeSidebarStateScopeId(stateScopeId) !== stateScopeId) {
    return null;
  }

  if (normalizeSidebarId(sidebarId) !== sidebarId) {
    return null;
  }

  return { stateScopeId, sidebarId };
};

export function createSidebarGroupIdPrefixFromSidebarIdentity(
  stateScopeId: string,
  sidebarId: string,
): SidebarGroupIdPrefix {
  const normalizedStateScopeId = assertValidSidebarStateScopeId(stateScopeId);
  const normalizedSidebarId = assertValidSidebarId(sidebarId);
  const body = buildLengthPrefixedSegments([
    encodeBase64Url(normalizedStateScopeId),
    encodeBase64Url(normalizedSidebarId),
  ]);
  return `${PREFIX}-${body}` as SidebarGroupIdPrefix;
}

export function createSidebarGroupId(
  groupIdPrefix: SidebarGroupIdPrefix,
  rowId: string,
): string {
  if (parsePrefix(groupIdPrefix) === null) {
    throw new Error('sidebar group id prefix is invalid.');
  }

  if (typeof rowId !== 'string' || rowId.trim().length === 0) {
    throw new Error('sidebar group id rowId must be a non-empty string.');
  }

  const normalizedRowId = rowId.trim();
  const encodedRowId = encodeBase64Url(normalizedRowId);
  return `${groupIdPrefix}-${String(encodedRowId.length)}-${encodedRowId}`;
}

export function parseSidebarGroupId(groupId: string): ParsedSidebarGroupId | null {
  if (typeof groupId !== 'string') {
    return null;
  }

  const prefix = `${PREFIX}-`;
  if (!groupId.startsWith(prefix)) {
    return null;
  }

  const segments = parseLengthPrefixedSegments(groupId.slice(prefix.length), 3);
  if (segments === null) {
    return null;
  }

  const [encodedStateScopeId, encodedSidebarId, encodedRowId] = segments;
  if (
    encodedStateScopeId === undefined ||
    encodedSidebarId === undefined ||
    encodedRowId === undefined
  ) {
    return null;
  }

  const stateScopeId = decodeBase64Url(encodedStateScopeId);
  const sidebarId = decodeBase64Url(encodedSidebarId);
  const rowId = decodeBase64Url(encodedRowId);
  if (stateScopeId === null || sidebarId === null || rowId === null) {
    return null;
  }

  if (normalizeSidebarStateScopeId(stateScopeId) !== stateScopeId) {
    return null;
  }

  if (normalizeSidebarId(sidebarId) !== sidebarId) {
    return null;
  }

  if (rowId.trim().length === 0) {
    return null;
  }

  const prefixFromDecoded = createSidebarGroupIdPrefixFromSidebarIdentity(stateScopeId, sidebarId);
  const roundTrip = createSidebarGroupId(prefixFromDecoded, rowId);
  return roundTrip === groupId ? { stateScopeId, sidebarId, rowId } : null;
}
