import { pickOptional } from '../parser-core/parse-attributes.js';
import { toError } from '../shared/errors.js';
import type { MdastNode, VFileLike } from '../types.js';
import { parseBooleanAttribute, parseIntegerInRange } from './normalize-helpers.js';
import type {
  DirectivePayload,
  SyntaxCardPayload,
  SyntaxFieldPayload,
  SyntaxFieldsPayload,
  SyntaxSectionPayload,
} from './payload-types.js';

const hasOwn = (attrs: Record<string, string>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(attrs, key);

const normalizeOptionalToken = (value: string | undefined): string | undefined =>
  pickOptional(value);

const normalizeOptionalLang = (value: string | undefined): string | undefined => {
  const normalized = pickOptional(value)?.toLowerCase();
  return normalized && normalized.length > 0 ? normalized : undefined;
};

export const normalizeSyntaxCardPayload = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): SyntaxCardPayload => {
  const name = normalizeOptionalToken(attrs['name']);
  if (!name) {
    throw toError(file, node, 'syntax-card の name は必須です');
  }

  const headingLevel = parseIntegerInRange(
    attrs['heading-level'],
    node,
    file,
    'syntax-card',
    'heading-level',
    2,
    6,
  );

  return {
    kind: 'syntax-card',
    name,
    ...(normalizeOptionalToken(attrs['kind'])
      ? { cardKind: normalizeOptionalToken(attrs['kind']) }
      : {}),
    ...(normalizeOptionalLang(attrs['lang']) ? { lang: normalizeOptionalLang(attrs['lang']) } : {}),
    ...(typeof headingLevel === 'number' ? { headingLevel } : {}),
  };
};

export const normalizeSyntaxSectionPayload = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): SyntaxSectionPayload => {
  const label = normalizeOptionalToken(attrs['label']);
  if (!label) {
    throw toError(file, node, 'syntax-section の label は必須です');
  }

  return {
    kind: 'syntax-section',
    label,
  };
};

export const normalizeSyntaxFieldsPayload = (): SyntaxFieldsPayload => ({
  kind: 'syntax-fields',
});

export const normalizeSyntaxFieldPayload = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): SyntaxFieldPayload => {
  const name = normalizeOptionalToken(attrs['name']);
  if (!name) {
    throw toError(file, node, 'syntax-field の name は必須です');
  }

  if (hasOwn(attrs, 'required') && !normalizeOptionalToken(attrs['required'])) {
    throw toError(file, node, 'syntax-field の required は true/false で指定してください');
  }

  const required =
    parseBooleanAttribute(attrs['required'], node, file, 'syntax-field', 'required') === true;
  const defaultValue = normalizeOptionalToken(attrs['default']);

  if (required && defaultValue) {
    throw toError(file, node, 'syntax-field では required="true" と default を同時指定できません');
  }

  return {
    kind: 'syntax-field',
    name,
    ...(normalizeOptionalToken(attrs['type'])
      ? { type: normalizeOptionalToken(attrs['type']) }
      : {}),
    required,
    ...(defaultValue ? { defaultValue } : {}),
  };
};

export const normalizeSyntaxPayloadByNode = (
  name: string,
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): DirectivePayload | undefined => {
  switch (name) {
    case 'syntax-card':
      return normalizeSyntaxCardPayload(attrs, node, file);
    case 'syntax-section':
      return normalizeSyntaxSectionPayload(attrs, node, file);
    case 'syntax-fields':
      return normalizeSyntaxFieldsPayload();
    case 'syntax-field':
      return normalizeSyntaxFieldPayload(attrs, node, file);
    default:
      return undefined;
  }
};
