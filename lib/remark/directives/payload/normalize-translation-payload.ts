import type { MdastNode, VFileLike } from '../types.js';
import { getNodeTextContent } from '../shared/ast.js';
import { pickOptional } from '../parser-core/parse-attributes.js';
import { TRANSLATION_OVERLAY_SURFACES } from '../shared/constants.js';
import { toError } from '../shared/errors.js';
import type { TranslationOverlayPayload, TranslationPayload } from './payload-types.js';

const buildTextBlocks = (children: MdastNode[]): string[] =>
  children
    .map((item) => getNodeTextContent(item).trim())
    .filter((item) => item.length > 0);

const resolveTranslationContent = (
  attrs: Record<string, string>,
  children: MdastNode[],
): { original: string; translated: string } => {
  const textBlocks = buildTextBlocks(children);
  return {
    original: pickOptional(attrs['original']) ?? textBlocks[0] ?? '',
    translated: pickOptional(attrs['translated']) ?? textBlocks[1] ?? '',
  };
};

export const normalizeTranslationPayload = (
  attrs: Record<string, string>,
  children: MdastNode[],
  node: MdastNode,
  file?: VFileLike,
): TranslationPayload => {
  const { original, translated } = resolveTranslationContent(attrs, children);
  if (original.length === 0 || translated.length === 0) {
    throw toError(file, node, 'translation には original と translated の両方が必要です');
  }

  return {
    kind: 'translation',
    ...(pickOptional(attrs['lang']) ? { lang: pickOptional(attrs['lang']) } : {}),
    ...(pickOptional(attrs['target-lang'])
      ? { targetLang: pickOptional(attrs['target-lang']) }
      : {}),
    original,
    translated,
  };
};

export const normalizeTranslationOverlayPayload = (
  attrs: Record<string, string>,
  children: MdastNode[],
  node: MdastNode,
  file?: VFileLike,
): TranslationOverlayPayload => {
  const { original, translated } = resolveTranslationContent(attrs, children);
  if (original.length === 0 || translated.length === 0) {
    throw toError(file, node, 'translation-overlay には original と translated の両方が必要です');
  }

  const surface = pickOptional(attrs['surface'])?.toLowerCase() ?? 'popover';
  if (!TRANSLATION_OVERLAY_SURFACES.has(surface)) {
    throw toError(
      file,
      node,
      'translation-overlay の surface は popover/drawer のみ指定可能です',
    );
  }

  return {
    kind: 'translation-overlay',
    ...(pickOptional(attrs['lang']) ? { lang: pickOptional(attrs['lang']) } : {}),
    ...(pickOptional(attrs['target-lang'])
      ? { targetLang: pickOptional(attrs['target-lang']) }
      : {}),
    original,
    translated,
    surface: surface as TranslationOverlayPayload['surface'],
  };
};
