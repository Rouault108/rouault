import { getDirectivePayload } from '../payload/registry.js';
import type { DirectivePayload } from '../payload/payload-types.js';
import type { MdastNode, VFileLike } from '../types.js';
import { adaptCodeBlockOutput } from './adapt-code-block-output.js';
import { adaptDirectiveOutput } from './adapt-directive-output.js';
import { adaptImageOutput } from './adapt-image-output.js';

const adaptNodes = (nodes: MdastNode[], file?: VFileLike): MdastNode[] =>
  nodes.map((node) => adaptOutputTree(node, file));

export const adaptOutputTree = (node: MdastNode, file?: VFileLike): MdastNode => {
  const directivePayload = getDirectivePayload<DirectivePayload>(node);
  if (directivePayload) {
    const binding = adaptDirectiveOutput(directivePayload);
    const nextChildren = binding.children ?? adaptNodes(node.children ?? [], file);
    return {
      type: node.type,
      rouaultDirective: node.rouaultDirective,
      ...(node.position ? { position: node.position } : {}),
      data: {
        hName: binding.hName,
        ...(binding.hProperties ? { hProperties: binding.hProperties } : {}),
      },
      ...(nextChildren ? { children: nextChildren } : {}),
    };
  }

  let nextNode = node;
  if (Array.isArray(node.children)) {
    nextNode = {
      ...node,
      children: adaptNodes(node.children, file),
    };
  }

  if (nextNode.type === 'code') {
    nextNode = adaptCodeBlockOutput(nextNode);
  }

  if (nextNode.type === 'image') {
    nextNode = adaptImageOutput(nextNode);
  }

  return nextNode;
};
