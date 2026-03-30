import type { DirectiveName, MdastNode, VFileLike } from '../types.js';
import {
  normalizePanelPayload,
  normalizeTabPayload,
  normalizeTabsPayload,
} from './normalize-tabs-payload.js';
import type { DirectivePayload } from './payload-types.js';

export const normalizeTabsPayloadByNode = (
  name: DirectiveName,
  attrs: Record<string, string>,
  node: MdastNode,
  file?: VFileLike,
): DirectivePayload | undefined => {
  switch (name) {
    case 'tabs':
      return normalizeTabsPayload(attrs, node, file);
    case 'tab':
      return normalizeTabPayload(attrs);
    case 'panel':
      return normalizePanelPayload();
    default:
      return undefined;
  }
};
