import type { MdastNode, VFileLike } from '../types.js';
import { getDirectiveDescriptor } from '../grammar/directive-grammar.js';
import { normalizeCodeBlockPayload } from './normalize-code-block-payload.js';
import { attachImagePayloads } from './normalize-image-payload.js';
import { assertAllowedAttributes } from './normalize-helpers.js';
import { normalizePreviewPayload } from './normalize-preview-registry.js';
import { normalizeSurfacePayload } from './normalize-surface-registry.js';
import { normalizeSyntaxPayloadByNode } from './normalize-syntax-payload.js';
import { normalizeTabsPayloadByNode } from './normalize-tabs-registry.js';
import { normalizeTranslationPayloadByNode } from './normalize-translation-registry.js';
import type { DirectivePayload } from './payload-types.js';

const normalizeDirectivePayload = (
  node: MdastNode,
  file?: VFileLike,
): DirectivePayload | undefined => {
  const directiveState = node.rouaultDirective;
  if (!directiveState) {
    return undefined;
  }

  const descriptor = getDirectiveDescriptor(directiveState.name);
  assertAllowedAttributes(
    directiveState.rawAttributes,
    descriptor.attributeSchema.allowedKeys,
    node,
    file,
    directiveState.name,
  );

  return (
    normalizeSurfacePayload(directiveState.name, directiveState.rawAttributes, node, file) ??
    normalizePreviewPayload(directiveState.name, directiveState.rawAttributes, node, file) ??
    normalizeTabsPayloadByNode(directiveState.name, directiveState.rawAttributes, node, file) ??
    normalizeTranslationPayloadByNode(
      directiveState.name,
      directiveState.rawAttributes,
      node.children ?? [],
      node,
      file,
    ) ??
    normalizeSyntaxPayloadByNode(directiveState.name, directiveState.rawAttributes, node, file)
  );
};

const normalizeNodePayload = (node: MdastNode, file?: VFileLike): void => {
  if (node.rouaultDirective) {
    node.rouaultDirective.payload = normalizeDirectivePayload(node, file);
  }

  if (node.type === 'code') {
    node.rouaultCodeBlockPayload = normalizeCodeBlockPayload(node, file);
  }
};

export const normalizeDirectivePayloadTree = (
  nodes: MdastNode[],
  file?: VFileLike,
): MdastNode[] => {
  for (const node of nodes) {
    normalizeNodePayload(node, file);
    if (Array.isArray(node.children)) {
      node.children = normalizeDirectivePayloadTree(node.children, file);
    }
  }

  return attachImagePayloads(nodes, file);
};

export const getDirectivePayload = <TPayload extends DirectivePayload>(
  node: MdastNode,
): TPayload | undefined => node.rouaultDirective?.payload as TPayload | undefined;
