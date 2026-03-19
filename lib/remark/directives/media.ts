import type { DirectiveHandler, MdastNode, VFileLike } from './types';
import { SCORE_LOADING_MODES } from './shared/constants';
import { assertAllowedAttributes, pickOptional } from './shared/attributes';
import { parseBooleanAttribute } from './shared/attribute-parsers';
import { toError } from './shared/errors';

export const applyScoreAttributes = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  const allowedKeys = new Set([
    'src',
    'caption',
    'label',
    'description',
    'aspect-ratio',
    'loading',
    'primary',
  ]);
  assertAllowedAttributes(attrs, allowedKeys, node, file, 'score');

  const src = pickOptional(attrs['src']);
  if (src) {
    result['src'] = src;
  }

  const caption = pickOptional(attrs['caption']);
  if (caption) {
    result['caption'] = caption;
  }

  const label = pickOptional(attrs['label']);
  if (label) {
    result['label'] = label;
  }

  const description = pickOptional(attrs['description']);
  if (description) {
    result['description'] = description;
  }

  const aspectRatio = pickOptional(attrs['aspect-ratio']);
  if (aspectRatio) {
    result['aspect-ratio'] = aspectRatio;
  }

  const loading = pickOptional(attrs['loading'])?.toLowerCase();
  if (loading) {
    if (!SCORE_LOADING_MODES.has(loading)) {
      throw toError(file, node, 'score の loading は lazy/eager のみ指定可能です');
    }
    result['loading'] = loading;
  }

  const primary = parseBooleanAttribute(attrs['primary'], node, file, 'score', 'primary');
  if (primary === true) {
    result['primary'] = true;
  }

  return result;
};

export const scoreHandler: DirectiveHandler = {
  name: 'score',
  toNode(marker, children, attrs, file) {
    return {
      type: 'rouaultDirectiveScore',
      data: {
        hName: 'ui-score',
        hProperties: applyScoreAttributes(attrs, marker.node, file),
      },
      children,
    };
  },
};
