import type { MdastNode, VFileLike } from '../types';
import { toError } from './errors';

export const parseAttributes = (
  source: string,
  node: MdastNode,
  file?: VFileLike,
): Record<string, string> => {
  const result: Record<string, string> = {};
  let cursor = 0;
  const attrPattern = /\s*([A-Za-z_][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'}]+))/y;

  while (cursor < source.length) {
    while (cursor < source.length && /\s/.test(source[cursor] ?? '')) {
      cursor += 1;
    }
    if (cursor >= source.length) {
      break;
    }

    attrPattern.lastIndex = cursor;
    const matched = attrPattern.exec(source);
    if (!matched) {
      throw toError(file, node, `ディレクティブ属性の構文が不正です "${source}"`);
    }

    const key = matched[1] ?? '';
    const value = matched[2] ?? matched[3] ?? matched[4] ?? '';
    if (result[key] !== undefined) {
      throw toError(file, node, `ディレクティブ属性 "${key}" が重複しています`);
    }

    result[key] = value;
    cursor = attrPattern.lastIndex;
  }

  return result;
};

export const extractLeadingAttributeBlock = (
  source: string,
  node: MdastNode,
  file: VFileLike | undefined,
  contextName: string,
): { attrsSource: string; rest: string } | null => {
  const leadingWhitespaceMatched = /^\s*/.exec(source);
  const offset = leadingWhitespaceMatched?.[0].length ?? 0;
  if (source[offset] !== '{') {
    return null;
  }

  const closingIndex = source.indexOf('}', offset + 1);
  if (closingIndex < 0) {
    throw toError(file, node, `${contextName}属性の構文が不正です "${source}"`);
  }

  const attrsSource = source.slice(offset + 1, closingIndex);
  const rest = source.slice(closingIndex + 1);
  return { attrsSource, rest };
};

export const pickOptional = (value: string | undefined): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const assertAllowedAttributes = (
  attrs: Record<string, string>,
  allowedKeys: ReadonlySet<string>,
  node: MdastNode,
  file: VFileLike | undefined,
  directiveName: string,
): void => {
  for (const key of Object.keys(attrs)) {
    if (!allowedKeys.has(key)) {
      throw toError(file, node, `${directiveName} 属性 "${key}" は未対応です`);
    }
  }
};
