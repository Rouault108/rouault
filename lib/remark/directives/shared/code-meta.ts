import type { MdastNode, VFileLike } from '../types';
import { CODE_BLOCK_INTENTS } from './constants';
import { assertAllowedAttributes, pickOptional } from './attributes';
import { parseBooleanAttribute } from './attribute-parsers';
import { toError } from './errors';

const CODE_BLOCK_COPY_MODES = new Set(['auto', 'always', 'hidden']);
const CODE_BLOCK_LAYOUTS = new Set(['standalone', 'inline']);

export interface ParsedCodeMeta {
  readonly attrs: Record<string, string>;
  readonly raw: string;
}

export const parseCodeMeta = (
  source: string | undefined,
  node: MdastNode,
  file?: VFileLike,
): ParsedCodeMeta => {
  if (typeof source !== 'string') {
    return { attrs: {}, raw: '' };
  }

  const attrs: Record<string, string> = {};
  const raw = source.trim();
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

  return { attrs, raw };
};

export const normalizeCodeBlockMeta = (node: MdastNode, file?: VFileLike): void => {
  if (node.type !== 'code') {
    return;
  }

  const { attrs, raw } = parseCodeMeta(node.meta, node, file);
  const properties: Record<string, unknown> = {};
  const allowedKeys = new Set([
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
  ]);
  assertAllowedAttributes(attrs, allowedKeys, node, file, 'code meta');

  const filename = pickOptional(attrs['filename']);
  if (filename) {
    properties['filename'] = filename;
  }

  const label = pickOptional(attrs['label']);
  if (label) {
    properties['label'] = label;
  }

  const groupKey = pickOptional(attrs['group-key']);
  if (groupKey) {
    properties['group-key'] = groupKey;
  }

  const tabLabel = pickOptional(attrs['tab-label']);
  if (tabLabel) {
    properties['tab-label'] = tabLabel;
  }

  const copyLabel = pickOptional(attrs['copy-label']);
  if (copyLabel) {
    properties['copy-label'] = copyLabel;
  }

  const intent = pickOptional(attrs['intent'])?.toLowerCase();
  if (intent) {
    if (!CODE_BLOCK_INTENTS.has(intent)) {
      throw toError(file, node, 'code meta の intent は neutral/valid/invalid のみ指定可能です');
    }
    properties['intent'] = intent;
  }

  const showLineNumbers = parseBooleanAttribute(
    attrs['show-line-numbers'],
    node,
    file,
    'code meta',
    'show-line-numbers',
  );
  if (showLineNumbers === true) {
    properties['show-line-numbers'] = true;
  }

  const copyMode = pickOptional(attrs['copy-mode'])?.toLowerCase();
  if (copyMode) {
    if (!CODE_BLOCK_COPY_MODES.has(copyMode)) {
      throw toError(file, node, 'code meta の copy-mode は auto/always/hidden のみ指定可能です');
    }
    properties['copy-mode'] = copyMode;
  }

  const copyable = parseBooleanAttribute(attrs['copyable'], node, file, 'code meta', 'copyable');
  if (copyable === false) {
    properties['copyable'] = 'false';
  }

  const wrap = parseBooleanAttribute(attrs['wrap'], node, file, 'code meta', 'wrap');
  if (wrap === true) {
    properties['wrap'] = true;
  }

  const highlightLines = pickOptional(attrs['highlight-lines']);
  if (highlightLines) {
    properties['highlight-lines'] = highlightLines;
  }

  const layout = pickOptional(attrs['layout'])?.toLowerCase();
  if (layout) {
    if (!CODE_BLOCK_LAYOUTS.has(layout)) {
      throw toError(file, node, 'code meta の layout は standalone/inline のみ指定可能です');
    }
    properties['layout'] = layout;
  }

  if (raw !== '') {
    properties['data-shiki-meta'] = raw;
  }

  if (Object.keys(properties).length === 0) {
    return;
  }

  const data = node.data ?? {};
  const currentProperties = data.hProperties ?? {};
  data.hProperties = { ...currentProperties, ...properties };
  node.data = data;
};

export const normalizeCodeBlockMetaTree = (nodes: MdastNode[], file?: VFileLike): void => {
  for (const node of nodes) {
    normalizeCodeBlockMeta(node, file);
    if (Array.isArray(node.children)) {
      normalizeCodeBlockMetaTree(node.children, file);
    }
  }
};
