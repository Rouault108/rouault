import type { DirectiveName, MdastNode, VFileLike } from '../types.js';
import {
  normalizeCodePreviewPayload,
  normalizePreviewSandboxPayload,
  normalizePreviewSlotPayload,
  normalizeToolbarSlotPayload,
} from './normalize-preview-payload.js';
import type { DirectivePayload } from './payload-types.js';
import type { NotePolicyContext } from '../policy/note-policy-context.js';

export const normalizePreviewPayload = (
  name: DirectiveName,
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
  policyContext?: NotePolicyContext,
): DirectivePayload | undefined => {
  switch (name) {
    case 'code-preview':
      return normalizeCodePreviewPayload(attrs, node, file);
    case 'preview-sandbox':
      return normalizePreviewSandboxPayload(attrs, node, file, policyContext);
    case 'preview':
      return normalizePreviewSlotPayload();
    case 'toolbar':
      return normalizeToolbarSlotPayload();
    default:
      return undefined;
  }
};
