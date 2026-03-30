import type { NotePolicyContext } from '../policy/note-policy-context.js';
import type { MdastNode, VFileLike } from '../types.js';
import { validatePolicy } from './validate-policy.js';
import {
  validateStructure,
  validateTabsUrlSyncConstraint,
} from './validate-structure.js';

export const validateDirectiveTree = (
  nodes: MdastNode[],
  policyContext: NotePolicyContext,
  file?: VFileLike,
): void => {
  validateStructure(nodes, file);
  validateTabsUrlSyncConstraint(nodes, file);
  validatePolicy(nodes, policyContext, file);
};
