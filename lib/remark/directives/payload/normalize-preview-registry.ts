import type { DirectiveName, MdastNode, VFileLike } from '../types.js';
import {
  normalizeCodePreviewPayload,
  normalizePreviewSandboxPayload,
  normalizePreviewSlotPayload,
  normalizeToolbarSlotPayload,
} from './normalize-preview-payload.js';
import type { DirectivePayload } from './payload-types.js';

export const normalizePreviewPayload = (
  name: DirectiveName,
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): DirectivePayload | undefined => {
  switch (name) {
    case 'code-preview':
      return normalizeCodePreviewPayload(attrs, node, file);
    case 'preview-sandbox':
      return normalizePreviewSandboxPayload(attrs, node, file);
    case 'preview':
      return normalizePreviewSlotPayload();
    case 'toolbar':
      return normalizeToolbarSlotPayload();
    default:
      return undefined;
  }
};
