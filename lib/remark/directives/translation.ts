import type { DirectiveHandler, MdastNode, VFileLike } from './types';
import { getNodeTextContent } from './shared/ast';
import { assertAllowedAttributes, pickOptional } from './shared/attributes';
import { TRANSLATION_OVERLAY_SURFACES } from './shared/constants';
import { toError } from './shared/errors';

type TranslationOverlaySurface = 'popover' | 'drawer';

const buildTextBlocks = (children: MdastNode[]): string[] =>
  children
    .map((item) => getNodeTextContent(item).trim())
    .filter((item) => item.length > 0);

const createTranslationParagraph = (
  text: string,
  className: string,
  lang: string | undefined,
): MdastNode => ({
  type: 'paragraph',
  data: {
    hProperties: {
      className: [className],
      ...(lang ? { lang } : {}),
    },
  },
  children: [{ type: 'text', value: text }],
});

const resolveTranslationContent = (
  attrs: Record<string, string>,
  children: MdastNode[],
): { original: string; translated: string } => {
  const textBlocks = buildTextBlocks(children);
  const original = pickOptional(attrs['original']) ?? textBlocks[0] ?? '';
  const translated = pickOptional(attrs['translated']) ?? textBlocks[1] ?? '';

  return { original, translated };
};

const resolveStaticTranslationInput = (
  attrs: Record<string, string>,
  children: MdastNode[],
  node: MdastNode,
  file?: VFileLike,
): { lang?: string; targetLang?: string; original: string; translated: string } => {
  const allowedKeys = new Set(['original', 'translated', 'lang', 'target-lang']);
  assertAllowedAttributes(attrs, allowedKeys, node, file, 'translation');

  const lang = pickOptional(attrs['lang']);
  const targetLang = pickOptional(attrs['target-lang']);
  const { original, translated } = resolveTranslationContent(attrs, children);

  if (original.length === 0 || translated.length === 0) {
    throw toError(file, node, 'translation には original と translated の両方が必要です');
  }

  return { lang, targetLang, original, translated };
};

const resolveOverlayTranslationInput = (
  attrs: Record<string, string>,
  children: MdastNode[],
  node: MdastNode,
  file?: VFileLike,
): {
  lang?: string;
  targetLang?: string;
  original: string;
  translated: string;
  surface: TranslationOverlaySurface;
} => {
  const allowedKeys = new Set(['original', 'translated', 'lang', 'target-lang', 'surface']);
  assertAllowedAttributes(attrs, allowedKeys, node, file, 'translation-overlay');

  const lang = pickOptional(attrs['lang']);
  const targetLang = pickOptional(attrs['target-lang']);
  const { original, translated } = resolveTranslationContent(attrs, children);

  if (original.length === 0 || translated.length === 0) {
    throw toError(file, node, 'translation-overlay には original と translated の両方が必要です');
  }

  const surfaceValue = pickOptional(attrs['surface'])?.toLowerCase() ?? 'popover';
  if (!TRANSLATION_OVERLAY_SURFACES.has(surfaceValue)) {
    throw toError(
      file,
      node,
      'translation-overlay の surface は popover/drawer のみ指定可能です',
    );
  }

  return {
    lang,
    targetLang,
    original,
    translated,
    surface: surfaceValue as TranslationOverlaySurface,
  };
};

export const translationHandler: DirectiveHandler = {
  name: 'translation',
  toNode(marker, children, attrs, file) {
    const { lang, targetLang, original, translated } = resolveStaticTranslationInput(
      attrs,
      children,
      marker.node,
      file,
    );

    return {
      type: 'rouaultDirectiveTranslation',
      data: {
        hName: 'div',
        hProperties: {
          className: ['translation-static'],
          'data-translation-kind': 'static',
        },
      },
      children: [
        createTranslationParagraph(original, 'translation-original', lang),
        createTranslationParagraph(translated, 'translation-translated', targetLang),
      ],
    };
  },
};

export const translationOverlayHandler: DirectiveHandler = {
  name: 'translation-overlay',
  toNode(marker, children, attrs, file) {
    const { lang, targetLang, original, translated, surface } = resolveOverlayTranslationInput(
      attrs,
      children,
      marker.node,
      file,
    );

    return {
      type: 'rouaultDirectiveTranslationOverlay',
      data: {
        hName: 'ui-translation',
        hProperties: {
          ...(lang ? { lang } : {}),
          ...(targetLang ? { 'target-lang': targetLang } : {}),
          original,
          translated,
          surface,
        },
      },
      children: [],
    };
  },
};
