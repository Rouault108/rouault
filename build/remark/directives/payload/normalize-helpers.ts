import type { MdastNode, VFileLike } from '../types.js';
import { toError } from '../shared/errors.js';
import { pickOptional } from '../parser-core/parse-attributes.js';

export const assertAllowedAttributes = (
  attrs: Record<string, string>,
  allowedKeys: readonly string[],
  node: MdastNode,
  file: VFileLike | undefined,
  directiveName: string,
): void => {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(attrs)) {
    if (!allowed.has(key)) {
      throw toError(file, node, `${directiveName} 属性 "${key}" は未対応です`);
    }
  }
};

export const parseBooleanAttribute = (
  value: string | undefined,
  node: MdastNode,
  file: VFileLike | undefined,
  directiveName: string,
  key: string,
): boolean | undefined => {
  const normalized = pickOptional(value)?.toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (normalized === 'true' || normalized === '1' || normalized === 'on' || normalized === 'yes') {
    return true;
  }

  if (normalized === 'false' || normalized === '0' || normalized === 'off' || normalized === 'no') {
    return false;
  }

  throw toError(file, node, `${directiveName} の ${key} は true/false で指定してください`);
};

export const parseIntegerInRange = (
  value: string | undefined,
  node: MdastNode,
  file: VFileLike | undefined,
  directiveName: string,
  key: string,
  min: number,
  max: number,
): number | undefined => {
  const normalized = pickOptional(value);
  if (!normalized) {
    return undefined;
  }

  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw toError(
      file,
      node,
      `${directiveName} の ${key} は ${String(min)} から ${String(max)} の整数で指定してください`,
    );
  }

  return parsed;
};

export const parseIntegerMin = (
  value: string | undefined,
  node: MdastNode,
  file: VFileLike | undefined,
  directiveName: string,
  key: string,
  min: number,
): number | undefined => {
  const normalized = pickOptional(value);
  if (!normalized) {
    return undefined;
  }

  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isInteger(parsed) || parsed < min) {
    throw toError(
      file,
      node,
      `${directiveName} の ${key} は ${String(min)} 以上の整数で指定してください`,
    );
  }

  return parsed;
};

export const parseEnumListAttribute = <T extends string>(
  value: string | undefined,
  node: MdastNode,
  file: VFileLike | undefined,
  directiveName: string,
  key: string,
  allowedValues: readonly T[],
): readonly T[] | undefined => {
  const normalized = pickOptional(value)?.toLowerCase();
  if (!normalized) {
    return undefined;
  }

  const tokens = normalized.split(/\s+/);
  const seen = new Set<T>();
  const allowed = new Set(allowedValues);

  for (const token of tokens) {
    if (!allowed.has(token as T)) {
      throw toError(
        file,
        node,
        `${directiveName} の ${key} は ${allowedValues.join('/')} のみ指定可能です`,
      );
    }

    if (seen.has(token as T)) {
      throw toError(file, node, `${directiveName} の ${key} で "${token}" が重複しています`);
    }

    seen.add(token as T);
  }

  return allowedValues.filter((item) => seen.has(item));
};
