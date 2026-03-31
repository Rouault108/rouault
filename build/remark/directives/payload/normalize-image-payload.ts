import type { MdastNode, VFileLike } from '../types.js';
import { IMAGE_LOADING_MODES } from '../shared/constants.js';
import {
  extractLeadingAttributeBlock,
  parseAttributes,
  pickOptional,
} from '../parser-core/parse-attributes.js';
import { toError } from '../shared/errors.js';
import {
  assertAllowedAttributes,
  parseBooleanAttribute,
  parseIntegerMin,
} from './normalize-helpers.js';
import type { ImagePayload } from './payload-types.js';

export const normalizeImagePayload = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): ImagePayload => {
  assertAllowedAttributes(attrs, ['loading', 'width', 'height', 'zoomable'], node, file, 'image');

  const loading = pickOptional(attrs['loading'])?.toLowerCase();
  if (loading && !IMAGE_LOADING_MODES.has(loading)) {
    throw toError(file, node, 'image の loading は lazy/eager のみ指定可能です');
  }

  return {
    ...(loading ? { loading: loading as ImagePayload['loading'] } : {}),
    ...(typeof parseIntegerMin(attrs['width'], node, file, 'image', 'width', 1) === 'number'
      ? { width: parseIntegerMin(attrs['width'], node, file, 'image', 'width', 1) }
      : {}),
    ...(typeof parseIntegerMin(attrs['height'], node, file, 'image', 'height', 1) === 'number'
      ? { height: parseIntegerMin(attrs['height'], node, file, 'image', 'height', 1) }
      : {}),
    ...(typeof parseBooleanAttribute(attrs['zoomable'], node, file, 'image', 'zoomable') === 'boolean'
      ? {
          zoomable: parseBooleanAttribute(attrs['zoomable'], node, file, 'image', 'zoomable'),
        }
      : {}),
  };
};

export const attachImagePayloads = (nodes: MdastNode[], file?: VFileLike): MdastNode[] => {
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

    current.rouaultImagePayload = normalizeImagePayload(
      parseAttributes(extracted.attrsSource, next, file),
      next,
      file,
    );

    if (extracted.rest.trim().length === 0) {
      result.splice(index + 1, 1);
      continue;
    }

    next.value = extracted.rest;
  }

  return result;
};
