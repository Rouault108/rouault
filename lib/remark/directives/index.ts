import type { DirectiveMarker, MdastNode, VFileLike } from './types';
import { parseAttributes } from './shared/attributes';
import { isEndMarker, parseStartMarker } from './shared/block-markers';
import { normalizeCodeBlockMetaTree } from './shared/code-meta';
import { directiveMetadata } from './shared/directive-metadata';
import { normalizeImageAttributeBlocks } from './shared/image-attributes';
import { transformInlineTextNode } from './shared/inline';
import {
  expandDirectiveParagraphs,
  tryParseFoldedDirectiveParagraph,
} from './shared/paragraph-expansion';
import { toError } from './shared/errors';
import { directiveHandlers } from './registry';
import { validateDirectiveTree } from './validation/tree';

const toDirectiveNode = (
  marker: DirectiveMarker,
  children: MdastNode[],
  attrs: Record<string, string>,
  file?: VFileLike,
): MdastNode => {
  const handler = directiveHandlers[marker.name];
  if (!handler) {
    throw toError(file, marker.node, `未対応のディレクティブ "${marker.name}"`);
  }

  return handler.toNode(marker, children, attrs, file);
};

const transformChildren = (nodes: MdastNode[], file?: VFileLike): MdastNode[] => {
  const normalizedNodes = expandDirectiveParagraphs(nodes, file);
  const result: MdastNode[] = [];
  let index = 0;

  while (index < normalizedNodes.length) {
    const current = normalizedNodes[index];
    if (!current) {
      index += 1;
      continue;
    }

    const foldedDirective = tryParseFoldedDirectiveParagraph(
      current,
      file,
      transformChildren,
      toDirectiveNode,
    );
    if (foldedDirective) {
      result.push(foldedDirective);
      index += 1;
      continue;
    }

    const marker = parseStartMarker(current, file);
    if (!marker) {
      if (Array.isArray(current.children)) {
        current.children = transformChildren(current.children, file);
        current.children = normalizeImageAttributeBlocks(current.children, file);
      }
      result.push(...transformInlineTextNode(current, file));
      index += 1;
      continue;
    }

    if (directiveMetadata[marker.name].kind === 'leaf') {
      const attrs = parseAttributes(marker.attrsSource, marker.node, file);
      result.push(toDirectiveNode(marker, [], attrs, file));
      index += 1;
      continue;
    }

    let depth = 0;
    let closingIndex = -1;
    for (let cursor = index + 1; cursor < normalizedNodes.length; cursor += 1) {
      const candidate = normalizedNodes[cursor];
      if (!candidate) {
        continue;
      }

      const nestedStart = parseStartMarker(candidate, file);
      if (nestedStart && directiveMetadata[nestedStart.name].kind !== 'leaf') {
        depth += 1;
        continue;
      }

      if (!isEndMarker(candidate)) {
        continue;
      }

      if (depth === 0) {
        closingIndex = cursor;
        break;
      }

      depth -= 1;
    }

    if (closingIndex < 0) {
      throw toError(
        file,
        marker.node,
        `ディレクティブ "${marker.name}" の終端 "::" が見つかりません`,
      );
    }

    const innerNodes = transformChildren(normalizedNodes.slice(index + 1, closingIndex), file);
    const attrs = parseAttributes(marker.attrsSource, marker.node, file);
    result.push(toDirectiveNode(marker, innerNodes, attrs, file));
    index = closingIndex + 1;
  }

  return result;
};

/**
 * Rouault独自ディレクティブを MDAST に展開する。
 */
export function remarkRouaultDirectives() {
  return (tree: unknown, file?: VFileLike) => {
    if (!tree || typeof tree !== 'object') {
      return;
    }

    const root = tree as MdastNode;
    if (!Array.isArray(root.children)) {
      return;
    }

    root.children = transformChildren(root.children, file);
    validateDirectiveTree(root.children, file);
    normalizeCodeBlockMetaTree(root.children, file);
  };
}