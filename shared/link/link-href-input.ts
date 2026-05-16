export interface SanitizedLinkHrefInput {
  readonly rawHref: string;
  readonly trimmedHref: string;
}

export type LinkHrefInputValidationReason =
  | 'missing-href'
  | 'non-string-href'
  | 'empty-href'
  | 'control-character'
  | 'malformed-percent-encoding'
  | 'invalid-utf8'
  | 'encoded-dangerous-segment';

export type LinkHrefAttributeValidationResult =
  | {
      readonly ok: true;
      readonly input: SanitizedLinkHrefInput;
    }
  | {
      readonly ok: false;
      readonly reason: LinkHrefInputValidationReason;
    };

interface RawHrefComponents {
  readonly path: string;
  readonly query: string;
  readonly hash: string;
}

const ASCII_CONTROL_RE = /[\u0000-\u001f\u007f]/u;
const MALFORMED_PERCENT_RE = /%(?![0-9A-Fa-f]{2})/u;
const SCHEME_RE = /^[A-Za-z][A-Za-z0-9+.-]*:/u;

const splitAtFirst = (
  value: string,
  delimiters: readonly string[],
): readonly [before: string, delimiter: string, after: string] => {
  let selectedIndex = -1;
  let selectedDelimiter = '';

  for (const delimiter of delimiters) {
    const index = value.indexOf(delimiter);
    if (index >= 0 && (selectedIndex < 0 || index < selectedIndex)) {
      selectedIndex = index;
      selectedDelimiter = delimiter;
    }
  }

  if (selectedIndex < 0) {
    return [value, '', ''];
  }

  return [
    value.slice(0, selectedIndex),
    selectedDelimiter,
    value.slice(selectedIndex + selectedDelimiter.length),
  ];
};

const stripScheme = (value: string): string => {
  const match = SCHEME_RE.exec(value);
  return match === null ? value : value.slice(match[0].length);
};

const parseRawHrefComponents = (href: string): RawHrefComponents => {
  const withoutScheme = stripScheme(href);
  let afterAuthority = withoutScheme;

  if (afterAuthority.startsWith('//')) {
    const authorityAndRest = afterAuthority.slice(2);
    const [, delimiter, rest] = splitAtFirst(authorityAndRest, ['/', '?', '#']);
    afterAuthority = delimiter === '' ? '' : `${delimiter}${rest}`;
  }

  const [pathAndQuery, hashDelimiter, hash] = splitAtFirst(afterAuthority, ['#']);
  const [path, queryDelimiter, query] = splitAtFirst(pathAndQuery, ['?']);

  return {
    path,
    query: queryDelimiter === '' ? '' : query,
    hash: hashDelimiter === '' ? '' : hash,
  };
};

const hasMalformedPercentEncoding = (value: string): boolean => MALFORMED_PERCENT_RE.test(value);

const canDecodeUtf8 = (value: string): boolean => {
  try {
    decodeURIComponent(value);
    return true;
  } catch {
    return false;
  }
};

const hasInvalidUtf8 = (value: string): boolean =>
  value.includes('%') && !canDecodeUtf8(value);

const isDangerousDecodedPathSegment = (rawSegment: string, decodedSegment: string): boolean => {
  if (!rawSegment.includes('%')) {
    return false;
  }

  return (
    decodedSegment === '.' ||
    decodedSegment === '..' ||
    decodedSegment.includes('/') ||
    decodedSegment.includes('\\') ||
    ASCII_CONTROL_RE.test(decodedSegment)
  );
};

const hasEncodedDangerousPathSegment = (path: string): boolean => {
  for (const segment of path.split('/')) {
    if (!segment.includes('%')) {
      continue;
    }

    try {
      const decodedSegment = decodeURIComponent(segment);
      if (isDangerousDecodedPathSegment(segment, decodedSegment)) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
};

export const validateLinkHrefAttribute = (
  value: unknown,
): LinkHrefAttributeValidationResult => {
  if (value === null || value === undefined) {
    return { ok: false, reason: 'missing-href' };
  }

  if (typeof value !== 'string') {
    return { ok: false, reason: 'non-string-href' };
  }

  const trimmedHref = value.trim();
  if (value.length === 0 || trimmedHref.length === 0) {
    return { ok: false, reason: 'empty-href' };
  }

  if (ASCII_CONTROL_RE.test(value)) {
    return { ok: false, reason: 'control-character' };
  }

  if (hasMalformedPercentEncoding(value)) {
    return { ok: false, reason: 'malformed-percent-encoding' };
  }

  const components = parseRawHrefComponents(trimmedHref);
  if (
    hasInvalidUtf8(components.path) ||
    hasInvalidUtf8(components.query) ||
    hasInvalidUtf8(components.hash)
  ) {
    return { ok: false, reason: 'invalid-utf8' };
  }

  if (hasEncodedDangerousPathSegment(components.path)) {
    return { ok: false, reason: 'encoded-dangerous-segment' };
  }

  return {
    ok: true,
    input: {
      rawHref: value,
      trimmedHref,
    },
  };
};
