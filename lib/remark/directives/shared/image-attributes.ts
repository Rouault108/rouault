import type { MdastNode, MdastNodeData, VFileLike } from '../types';
import { IMAGE_LOADING_MODES } from './constants';
import { assertAllowedAttributes, extractLeadingAttributeBlock, parseAttributes, pickOptional } from './attributes';
import { parseBooleanAttribute, parseIntegerMin } from './attribute-parsers';
import { toError } from './errors';

export const applyImageAttributes = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  const allowedKeys = new Set(['loading', 'width', 'height', 'zoomable']);
  assertAllowedAttributes(attrs, allowedKeys, node, file, 'image');

  const loading = pickOptional(attrs['loading'])?.toLowerCase();
  if (loading) {
    if (!IMAGE_LOADING_MODES.has(loading)) {
      throw toError(file, node, 'image の loading は lazy/eager のみ指定可能です');
    }
    result['loading'] = loading;
  }

  const width = parseIntegerMin(attrs['width'], node, file, 'image', 'width', 1);
  if (typeof width === 'number') {
    result['width'] = width;
  }

  const height = parseIntegerMin(attrs['height'], node, file, 'image', 'height', 1);
  if (typeof height === 'number') {
    result['height'] = height;
  }

  const zoomable = parseBooleanAttribute(attrs['zoomable'], node, file, 'image', 'zoomable');
  if (typeof zoomable === 'boolean') {
    result['zoomable'] = zoomable ? 'true' : 'false';
  }

  return result;
};

export const mergeNodeHProperties = (node: MdastNode, properties: Record<string, unknown>): void => {
  if (Object.keys(properties).length === 0) {
    return;
  }

  const nextData: MdastNodeData = { ...(node.data ?? {}) };
  nextData.hProperties = {
    ...(nextData.hProperties ?? {}),
    ...properties,
  };
  node.data = nextData;
};

export const normalizeImageAttributeBlocks = (nodes: MdastNode[], file?: VFileLike): MdastNode[] => {
  const result = [...nodes];

  for (let index = 0; index < result.length; index += 1) {
    const current = result[index];
    const next = result[index + 1];
    if (current?.type !== 'image' || next?.type !== 'text' || typeof next.value !== 'string') {
      continue;
    }

    const extracted = extractLeadingAttributeBlock(next.value, next, file, '画像');
    if (!extracted) {
      continue;
    }

    const attrs = parseAttributes(extracted.attrsSource, next, file);
    mergeNodeHProperties(current, applyImageAttributes(attrs, next, file));

    if (extracted.rest.trim().length === 0) {
      result.splice(index + 1, 1);
      continue;
    }

    next.value = extracted.rest;
  }

  return result;
};