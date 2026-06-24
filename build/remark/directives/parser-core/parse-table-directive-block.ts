import type { DirectiveMarker, MdastNode, VFileLike } from '../types.js';
import { toError } from '../shared/errors.js';
import { isEndMarker } from './parse-directive-line.js';

export interface ParsedTableDirectiveBlock {
  readonly children: MdastNode[];
  readonly nextIndex: number;
}

const isWhitespaceTextNode = (node: MdastNode): boolean =>
  node.type === 'text' && typeof node.value === 'string' && node.value.trim().length === 0;

const hasMeaningfulInlineNode = (node: MdastNode): boolean => {
  if (node.type === 'text') {
    return typeof node.value === 'string' && node.value.trim().length > 0;
  }

  return true;
};

const isEmptyTableCell = (cell: MdastNode): boolean =>
  cell.type === 'tableCell' && (cell.children ?? []).every((child) => isWhitespaceTextNode(child));

const isClosingMarkerCell = (cell: MdastNode): boolean => {
  if (cell.type !== 'tableCell') {
    return false;
  }

  const meaningfulChildren = (cell.children ?? []).filter((child) => !isWhitespaceTextNode(child));
  if (meaningfulChildren.length !== 1) {
    return false;
  }

  const [onlyChild] = meaningfulChildren;
  return (
    onlyChild?.type === 'text' &&
    typeof onlyChild.value === 'string' &&
    onlyChild.value === '::'
  );
};

const isClosingMarkerRow = (row: MdastNode): boolean => {
  if (row.type !== 'tableRow') {
    return false;
  }

  const cells = row.children ?? [];
  const [firstCell, ...remainingCells] = cells;
  if (!firstCell) {
    return false;
  }

  return isClosingMarkerCell(firstCell) && remainingCells.every((cell) => isEmptyTableCell(cell));
};

const isMeaningfulTableRow = (row: MdastNode): boolean => {
  if (row.type !== 'tableRow') {
    return true;
  }

  return (row.children ?? []).some((cell) =>
    (cell.children ?? []).some((child) => hasMeaningfulInlineNode(child)),
  );
};

const removeClosingMarkerRow = (
  tableNode: MdastNode,
  markerRowIndex: number,
): MdastNode => ({
  ...tableNode,
  children: (tableNode.children ?? []).filter((_, index) => index !== markerRowIndex),
});

const recoverAbsorbedClosingMarker = (
  tableNode: MdastNode,
  file: VFileLike | undefined,
): MdastNode | null => {
  const rows = tableNode.children ?? [];
  const markerRowIndex = rows.findIndex((row) => isClosingMarkerRow(row));

  if (markerRowIndex < 0) {
    return null;
  }

  const laterMeaningfulRow = rows.slice(markerRowIndex + 1).find((row) => isMeaningfulTableRow(row));
  if (laterMeaningfulRow) {
    throw toError(
      file,
      laterMeaningfulRow,
      'table ディレクティブの終端 "::" の後に table row が続いています',
    );
  }

  return removeClosingMarkerRow(tableNode, markerRowIndex);
};

export const parseTableDirectiveBlock = (
  nodes: MdastNode[],
  startIndex: number,
  marker: DirectiveMarker,
  file?: VFileLike,
): ParsedTableDirectiveBlock => {
  const children: MdastNode[] = [];

  for (let cursor = startIndex + 1; cursor < nodes.length; cursor += 1) {
    const current = nodes[cursor];
    if (!current) {
      continue;
    }

    if (isEndMarker(current)) {
      return {
        children,
        nextIndex: cursor + 1,
      };
    }

    if (current.type === 'table') {
      const recoveredTable = recoverAbsorbedClosingMarker(current, file);
      if (recoveredTable) {
        return {
          children: [...children, recoveredTable],
          nextIndex: cursor + 1,
        };
      }
    }

    children.push(current);
  }

  throw toError(file, marker.node, 'table ディレクティブの終端 "::" が見つかりません');
};
