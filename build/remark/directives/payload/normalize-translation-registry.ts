import type { DirectiveName, MdastNode, VFileLike } from '../types.js';
import {
  normalizeTranslationOverlayPayload,
  normalizeTranslationPayload,
} from './normalize-translation-payload.js';
import type { DirectivePayload } from './payload-types.js';

export const normalizeTranslationPayloadByNode = (
  name: DirectiveName,
  attrs: Record<string, string>,
  children: MdastNode[],
  node: MdastNode,
  file?: VFileLike,
): DirectivePayload | undefined => {
  switch (name) {
    case 'translation':
      return normalizeTranslationPayload(attrs, children, node, file);
    case 'translation-overlay':
      return normalizeTranslationOverlayPayload(attrs, children, node, file);
    default:
      return undefined;
  }
};
