import type { DirectiveMarker, DirectiveName, MdastNode, VFileLike } from '../types';
import { END_PATTERN, START_PATTERN } from './constants';
import { SUPPORTED_DIRECTIVES } from './directive-metadata';
import { toError } from './errors';

export const getDirectiveTextFromNode = (node: MdastNode): string | null => {
  if (node.type === 'text' && typeof node.value === 'string') {
    return node.value;
  }

  if (node.type !== 'link' || typeof node.url !== 'string' || !Array.isArray(node.children)) {
    return null;
  }

  if (typeof node.title === 'string' && node.title.trim().length > 0) {
    return null;
  }

  if (node.children.length !== 1) {
    return null;
  }

  const onlyChild = node.children[0];
  if (onlyChild?.type !== 'text' || typeof onlyChild.value !== 'string') {
    return null;
  }

  const label = onlyChild.value.trim();
  return label === node.url ? node.url : null;
};

export const getParagraphSingleText = (node: MdastNode): string | null => {
  if (node.type !== 'paragraph' || !Array.isArray(node.children) || node.children.length === 0) {
    return null;
  }

  let result = '';
  for (const child of node.children) {
    const segment = getDirectiveTextFromNode(child);
    if (segment === null) {
      return null;
    }
    result += segment;
  }

  return result;
};

export const parseStartLine = (
  source: string,
  node: MdastNode,
  file?: VFileLike,
): DirectiveMarker | null => {
  const matched = START_PATTERN.exec(source.trim());
  if (!matched) {
    return null;
  }

  const rawName = matched[1] ?? '';
  if (!SUPPORTED_DIRECTIVES.has(rawName as DirectiveName)) {
    throw toError(file, node, `未対応のディレクティブ "${rawName}"`);
  }

  return {
    name: rawName as DirectiveName,
    attrsSource: matched[2] ?? '',
    node,
  };
};

export const parseStartMarker = (node: MdastNode, file?: VFileLike): DirectiveMarker | null => {
  const markerText = getParagraphSingleText(node);
  if (markerText === null) {
    return null;
  }

  return parseStartLine(markerText, node, file);
};

export const isEndMarker = (node: MdastNode): boolean => {
  const markerText = getParagraphSingleText(node);
  return markerText !== null && END_PATTERN.test(markerText.trim());
};
