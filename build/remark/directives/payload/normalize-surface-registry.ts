import type { DirectiveName, MdastNode, VFileLike } from '../types.js';
import {
  normalizeCalloutPayload,
  normalizeCodeGroupPayload,
  normalizeDetailsPayload,
  normalizeInfoBoxPayload,
  normalizeLinkCardPayload,
  normalizeScorePayload,
} from './normalize-surface-payload.js';
import type { DirectivePayload } from './payload-types.js';
import type { NotePolicyContext } from '../policy/note-policy-context.js';

export const normalizeSurfacePayload = (
  name: DirectiveName,
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
  policyContext?: NotePolicyContext,
): DirectivePayload | undefined => {
  switch (name) {
    case 'callout':
      return normalizeCalloutPayload(attrs, node, file);
    case 'code-group':
      return normalizeCodeGroupPayload(attrs);
    case 'details':
      return normalizeDetailsPayload(attrs, node, file);
    case 'info-box':
      return normalizeInfoBoxPayload(attrs, node, file);
    case 'link-card':
      return normalizeLinkCardPayload(attrs, node, file, policyContext);
    case 'score':
      return normalizeScorePayload(attrs, node, file, policyContext);
    default:
      return undefined;
  }
};
