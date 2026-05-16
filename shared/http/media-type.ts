export interface ParsedMediaType {
  readonly type: string;
  readonly subtype: string;
  readonly parameters: ReadonlyMap<string, string>;
}

export type MediaTypeParseResult =
  | { readonly ok: true; readonly mediaType: ParsedMediaType }
  | { readonly ok: false; readonly reason: 'missing-content-type' | 'invalid-content-type' };

export type JsonContentTypeValidationResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason:
        | 'missing-content-type'
        | 'invalid-content-type'
        | 'wrong-media-type'
        | 'unsupported-charset'
        | 'unknown-parameter';
    };

const TOKEN_PATTERN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/u;

const unquoteParameterValue = (value: string): string | null => {
  if (!value.startsWith('"')) {
    return value;
  }

  if (!value.endsWith('"') || value.length < 2) {
    return null;
  }

  let result = '';
  for (let index = 1; index < value.length - 1; index += 1) {
    const character = value[index];
    if (character === '\\') {
      const escaped = value[index + 1];
      if (escaped === undefined) {
        return null;
      }
      result += escaped;
      index += 1;
      continue;
    }
    result += character;
  }

  return result;
};

export const parseMediaType = (contentType: string | null): MediaTypeParseResult => {
  if (contentType === null || contentType.trim().length === 0) {
    return { ok: false, reason: 'missing-content-type' };
  }

  const parts = contentType.split(';').map((part) => part.trim());
  const fullType = parts[0]?.toLowerCase() ?? '';
  const [type, subtype, extra] = fullType.split('/');
  if (
    extra !== undefined ||
    type === undefined ||
    subtype === undefined ||
    !TOKEN_PATTERN.test(type) ||
    !TOKEN_PATTERN.test(subtype)
  ) {
    return { ok: false, reason: 'invalid-content-type' };
  }

  const parameters = new Map<string, string>();
  for (const rawParameter of parts.slice(1)) {
    if (rawParameter.length === 0) {
      return { ok: false, reason: 'invalid-content-type' };
    }

    const equalsIndex = rawParameter.indexOf('=');
    if (equalsIndex <= 0) {
      return { ok: false, reason: 'invalid-content-type' };
    }

    const parameterName = rawParameter.slice(0, equalsIndex).trim().toLowerCase();
    const rawValue = rawParameter.slice(equalsIndex + 1).trim();
    const value = unquoteParameterValue(rawValue);
    if (!TOKEN_PATTERN.test(parameterName) || value === null) {
      return { ok: false, reason: 'invalid-content-type' };
    }

    parameters.set(parameterName, value.toLowerCase());
  }

  return {
    ok: true,
    mediaType: {
      type,
      subtype,
      parameters,
    },
  };
};

export const validateJsonContentType = (
  contentType: string | null,
): JsonContentTypeValidationResult => {
  const parsed = parseMediaType(contentType);
  if (!parsed.ok) {
    return { ok: false, reason: parsed.reason };
  }

  if (parsed.mediaType.type !== 'application' || parsed.mediaType.subtype !== 'json') {
    return { ok: false, reason: 'wrong-media-type' };
  }

  for (const [name, value] of parsed.mediaType.parameters.entries()) {
    if (name !== 'charset') {
      return { ok: false, reason: 'unknown-parameter' };
    }

    if (value !== 'utf-8') {
      return { ok: false, reason: 'unsupported-charset' };
    }
  }

  return { ok: true };
};
