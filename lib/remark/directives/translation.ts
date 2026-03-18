import type { DirectiveHandler, MdastNode, VFileLike } from './types';
import { TRANSLATION_RENDER_MODES } from './shared/constants';
import { getNodeTextContent } from './shared/ast';
import { assertAllowedAttributes, pickOptional } from './shared/attributes';
import { parseBooleanAttribute } from './shared/attribute-parsers';
import { toError } from './shared/errors';

export const applyTranslationAttributes = (
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  const allowedKeys = new Set([
    'original',
    'translated',
    'lang',
    'target-lang',
    'render-mode',
    'open',
  ]);
  assertAllowedAttributes(attrs, allowedKeys, node, file, 'translation');

  const original = pickOptional(attrs['original']);
  if (original) {
    result['original'] = original;
  }

  const translated = pickOptional(attrs['translated']);
  if (translated) {
    result['translated'] = translated;
  }

  const lang = pickOptional(attrs['lang']);
  if (lang) {
    result['lang'] = lang;
  }

  const targetLang = pickOptional(attrs['target-lang']);
  if (targetLang) {
    result['target-lang'] = targetLang;
  }

  const renderMode = pickOptional(attrs['render-mode'])?.toLowerCase();
  if (renderMode) {
    if (!TRANSLATION_RENDER_MODES.has(renderMode)) {
      throw toError(
        file,
        node,
        'translation の render-mode は popover/drawer/interlinear のみ指定可能です',
      );
    }
    result['render-mode'] = renderMode;
  }

  const open = parseBooleanAttribute(attrs['open'], node, file, 'translation', 'open');
  if (open === true) {
    result['open'] = true;
  }

  return result;
};

export const translationHandler: DirectiveHandler = {
  name: 'translation',
  toNode(marker, children, attrs, file) {
    const props = applyTranslationAttributes(attrs, marker.node, file);

    const textBlocks = children
      .map((item) => getNodeTextContent(item).trim())
      .filter((item) => item.length > 0);

    if (props['original'] === undefined && textBlocks[0] !== undefined) {
      props['original'] = textBlocks[0];
    }

    if (props['translated'] === undefined && textBlocks[1] !== undefined) {
      props['translated'] = textBlocks[1];
    }

    return {
      type: 'rouaultDirectiveTranslation',
      data: {
        hName: 'ui-translation',
        hProperties: props,
      },
      children: [],
    };
  },
};