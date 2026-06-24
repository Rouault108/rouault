import type { DirectiveMarker, MdastNode, VFileLike } from '../types.js';
import { getDirectiveDescriptor } from '../grammar/directive-grammar.js';
import { toError } from '../shared/errors.js';
import {
  type InlineTransformContext,
  transformInlineTextNode,
  validateTableCellBreakPlacement,
} from '../shared/inline.js';
import {
  expandDirectiveParagraphs,
  tryParseFoldedDirectiveParagraph,
} from './expand-folded-paragraph.js';
import { parseAttributes } from './parse-attributes.js';
import { isEndMarker, parseStartMarker } from './parse-directive-line.js';
import { parseTableDirectiveBlock } from './parse-table-directive-block.js';
import { findClosingDirectiveIndex } from './scan-block-markers.js';

const toParsedDirectiveNode = (
  marker: DirectiveMarker,
  children: MdastNode[],
  attrs: Record<string, string>,
): MdastNode => ({
  type: getDirectiveDescriptor(marker.name).nodeType,
  rouaultDirective: {
    name: marker.name,
    rawAttributes: attrs,
  },
  children,
});

const rootInlineContext: InlineTransformContext = {
  insideTableCell: false,
  insideTableCellLink: false,
};

const toChildInlineContext = (
  node: MdastNode,
  context: InlineTransformContext,
): InlineTransformContext => ({
  insideTableCell: context.insideTableCell || node.type === 'tableCell',
  insideTableCellLink:
    context.insideTableCellLink || node.type === 'link' || node.type === 'linkReference',
});

const validateTableCellHardBreak = (
  node: MdastNode,
  context: InlineTransformContext,
  file?: VFileLike,
): void => {
  if (!context.insideTableCell) {
    return;
  }

  if (node.type === 'break' || node.type === 'hardBreak') {
    throw toError(file, node, 'Markdown hard break は table cell 内では使用できません');
  }
};

const transformChildren = (
  nodes: MdastNode[],
  file?: VFileLike,
  context: InlineTransformContext = rootInlineContext,
): MdastNode[] => {
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
      toParsedDirectiveNode,
    );
    if (foldedDirective) {
      result.push(foldedDirective);
      index += 1;
      continue;
    }

    const marker = parseStartMarker(current, file);
    if (!marker) {
      validateTableCellHardBreak(current, context, file);

      if (Array.isArray(current.children)) {
        current.children = transformChildren(
          current.children,
          file,
          toChildInlineContext(current, context),
        );
        if (current.type === 'tableCell') {
          validateTableCellBreakPlacement(current, file);
        }
      }
      result.push(...transformInlineTextNode(current, file, context));
      index += 1;
      continue;
    }

    const attrs = parseAttributes(marker.attrsSource, marker.node, file);
    if (getDirectiveDescriptor(marker.name).kind === 'leaf') {
      result.push(toParsedDirectiveNode(marker, [], attrs));
      index += 1;
      continue;
    }

    if (marker.name === 'table') {
      const parsedTableBlock = parseTableDirectiveBlock(normalizedNodes, index, marker, file);
      const innerNodes = transformChildren(parsedTableBlock.children, file, context);
      result.push(toParsedDirectiveNode(marker, innerNodes, attrs));
      index = parsedTableBlock.nextIndex;
      continue;
    }

    const closingIndex = findClosingDirectiveIndex(normalizedNodes, index, file);
    if (closingIndex < 0) {
      throw toError(
        file,
        marker.node,
        `ディレクティブ "${marker.name}" の終端 "::" が見つかりません`,
      );
    }

    const innerNodes = transformChildren(
      normalizedNodes.slice(index + 1, closingIndex),
      file,
      context,
    );
    result.push(toParsedDirectiveNode(marker, innerNodes, attrs));
    index = closingIndex + 1;
  }

  return result.filter((node) => !isEndMarker(node));
};

export const parseDirectiveNodes = (nodes: MdastNode[], file?: VFileLike): MdastNode[] =>
  transformChildren(nodes, file);
