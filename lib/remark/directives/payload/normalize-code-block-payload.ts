import type { MdastNode, VFileLike } from '../types.js';
import { pickOptional } from '../parser-core/parse-attributes.js';
import { CODE_BLOCK_INTENTS } from '../shared/constants.js';
import { toError } from '../shared/errors.js';
import { assertAllowedAttributes, parseBooleanAttribute } from './normalize-helpers.js';
import type { CodeBlockPayload } from './payload-types.js';

const CODE_BLOCK_COPY_MODES = ['auto', 'always', 'hidden'] as const;
const CODE_BLOCK_LAYOUTS = ['standalone', 'inline'] as const;

const parseCodeMetaAttributes = (
  source: string | undefined,
  node: MdastNode,
  file?: VFileLike,
): Record<string, string> => {
  if (typeof source !== 'string') {
    return {};
  }

  const attrs: Record<string, string> = {};
  const attrPattern = /\s*([A-Za-z_][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'}]+))/y;
  const highlightMetaPattern = /\s*\{[^}\n]+\}/y;
  let cursor = 0;

  while (cursor < source.length) {
    while (cursor < source.length && /\s/.test(source[cursor] ?? '')) {
      cursor += 1;
    }
    if (cursor >= source.length) {
      break;
    }

    highlightMetaPattern.lastIndex = cursor;
    const highlightMeta = highlightMetaPattern.exec(source);
    if (highlightMeta) {
      cursor = highlightMetaPattern.lastIndex;
      continue;
    }

    attrPattern.lastIndex = cursor;
    const matched = attrPattern.exec(source);
    if (!matched) {
      throw toError(file, node, `code meta の構文が不正です "${source}"`);
    }

    const key = matched[1] ?? '';
    const value = matched[2] ?? matched[3] ?? matched[4] ?? '';
    if (attrs[key] !== undefined) {
      throw toError(file, node, `code meta 属性 "${key}" が重複しています`);
    }

    attrs[key] = value;
    cursor = attrPattern.lastIndex;
  }

  return attrs;
};

export const normalizeCodeBlockPayload = (node: MdastNode, file?: VFileLike): CodeBlockPayload | undefined => {
  if (node.type !== 'code') {
    return undefined;
  }

  const rawMeta = typeof node.meta === 'string' ? node.meta.trim() : '';
  const attrs = parseCodeMetaAttributes(rawMeta, node, file);
  assertAllowedAttributes(
    attrs,
    [
      'filename',
      'label',
      'intent',
      'show-line-numbers',
      'copy-mode',
      'group-key',
      'tab-label',
      'copy-label',
      'copyable',
      'wrap',
      'highlight-lines',
      'layout',
    ],
    node,
    file,
    'code meta',
  );

  const intent = pickOptional(attrs['intent'])?.toLowerCase();
  if (intent && !CODE_BLOCK_INTENTS.has(intent)) {
    throw toError(file, node, 'code meta の intent は neutral/valid/invalid のみ指定可能です');
  }

  const copyMode = pickOptional(attrs['copy-mode'])?.toLowerCase();
  if (copyMode && !CODE_BLOCK_COPY_MODES.includes(copyMode as (typeof CODE_BLOCK_COPY_MODES)[number])) {
    throw toError(file, node, 'code meta の copy-mode は auto/always/hidden のみ指定可能です');
  }

  const layout = pickOptional(attrs['layout'])?.toLowerCase();
  if (layout && !CODE_BLOCK_LAYOUTS.includes(layout as (typeof CODE_BLOCK_LAYOUTS)[number])) {
    throw toError(file, node, 'code meta の layout は standalone/inline のみ指定可能です');
  }

  const payload: CodeBlockPayload = {
    ...(pickOptional(attrs['filename']) ? { filename: pickOptional(attrs['filename']) } : {}),
    ...(pickOptional(attrs['label']) ? { label: pickOptional(attrs['label']) } : {}),
    ...(intent ? { intent: intent as CodeBlockPayload['intent'] } : {}),
    showLineNumbers:
      parseBooleanAttribute(
        attrs['show-line-numbers'],
        node,
        file,
        'code meta',
        'show-line-numbers',
      ) === true,
    ...(copyMode ? { copyMode: copyMode as CodeBlockPayload['copyMode'] } : {}),
    ...(pickOptional(attrs['group-key']) ? { groupKey: pickOptional(attrs['group-key']) } : {}),
    ...(pickOptional(attrs['tab-label']) ? { tabLabel: pickOptional(attrs['tab-label']) } : {}),
    ...(pickOptional(attrs['copy-label']) ? { copyLabel: pickOptional(attrs['copy-label']) } : {}),
    copyable: parseBooleanAttribute(attrs['copyable'], node, file, 'code meta', 'copyable'),
    wrap: parseBooleanAttribute(attrs['wrap'], node, file, 'code meta', 'wrap') === true,
    ...(pickOptional(attrs['highlight-lines'])
      ? { highlightLines: pickOptional(attrs['highlight-lines']) }
      : {}),
    ...(layout ? { layout: layout as CodeBlockPayload['layout'] } : {}),
    ...(rawMeta !== '' ? { rawMeta } : {}),
  };

  return Object.keys(payload).length > 0 ? payload : undefined;
};
