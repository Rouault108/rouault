import type { MdastNode, VFileLike } from './types.js';
import { parseDirectiveNodes } from './parser-core/parse-directive-nodes.js';
import { buildNotePolicyContext } from './policy/build-note-policy-context.js';
import { normalizeDirectivePayloadTree } from './payload/registry.js';
import { adaptOutputTree } from './output/adapt-output-tree.js';
import { validateDirectiveTree } from './validator/validate-directive.js';

/**
 * Rouault独自ディレクティブを MDAST に展開する。
 */
export function remarkRouaultDirectives() {
  return (tree: unknown, file?: VFileLike) => {
    if (!tree || typeof tree !== 'object') {
      return;
    }

    const root = tree as { children?: MdastNode[] };
    if (!Array.isArray(root.children)) {
      return;
    }

    const policyContext = buildNotePolicyContext(file);
    const parsedChildren = parseDirectiveNodes(root.children, file);
    const payloadChildren = normalizeDirectivePayloadTree(parsedChildren, file);
    validateDirectiveTree(payloadChildren, policyContext, file);
    root.children = payloadChildren.map((node: MdastNode) => adaptOutputTree(node, file));
  };
}
