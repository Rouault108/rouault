import type { MdastNode, VFileLike } from '../types.js';
import { getDirectiveDescriptor } from '../grammar/directive-grammar.js';
import { isEndMarker, parseStartMarker } from './parse-directive-line.js';

export const findClosingDirectiveIndex = (
  nodes: MdastNode[],
  startIndex: number,
  file?: VFileLike,
): number => {
  const startNode = nodes[startIndex];
  if (!startNode) {
    return -1;
  }

  const marker = parseStartMarker(startNode, file);
  if (!marker || getDirectiveDescriptor(marker.name).kind === 'leaf') {
    return startIndex;
  }

  let depth = 0;
  for (let cursor = startIndex + 1; cursor < nodes.length; cursor += 1) {
    const candidate = nodes[cursor];
    if (!candidate) {
      continue;
    }

    const nestedStart = parseStartMarker(candidate, file);
    if (nestedStart && getDirectiveDescriptor(nestedStart.name).kind !== 'leaf') {
      depth += 1;
      continue;
    }

    if (!isEndMarker(candidate)) {
      continue;
    }

    if (depth === 0) {
      return cursor;
    }

    depth -= 1;
  }

  return -1;
};
