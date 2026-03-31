import type { MdastNode, VFileLike } from '../types.js';
import { getDirectiveDescriptor } from '../grammar/directive-grammar.js';
import { END_PATTERN } from '../shared/constants.js';
import { parseAttributes } from './parse-attributes.js';
import { getParagraphSingleText, parseStartLine } from './parse-directive-line.js';

export const tryParseFoldedDirectiveParagraph = (
  node: MdastNode,
  file: VFileLike | undefined,
  transformChildren: (nodes: MdastNode[], file?: VFileLike) => MdastNode[],
  toDirectiveNode: (
    marker: NonNullable<ReturnType<typeof parseStartLine>>,
    children: MdastNode[],
    attrs: Record<string, string>,
    file?: VFileLike,
  ) => MdastNode,
): MdastNode | null => {
  const rawText = getParagraphSingleText(node);
  if (!rawText?.includes('\n')) {
    return null;
  }

  const lines = rawText.split(/\r?\n/);
  if (lines.length < 3) {
    return null;
  }

  const marker = parseStartLine(lines[0] ?? '', node, file);
  if (!marker) {
    return null;
  }
  if (getDirectiveDescriptor(marker.name).kind === 'leaf') {
    return null;
  }

  const lastLine = (lines[lines.length - 1] ?? '').trim();
  if (!END_PATTERN.test(lastLine)) {
    return null;
  }

  const attrs = parseAttributes(marker.attrsSource, node, file);
  const middleRaw = lines.slice(1, -1).join('\n');
  const chunks = middleRaw
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  const children: MdastNode[] = chunks.map((chunk) => ({
    type: 'paragraph',
    children: [{ type: 'text', value: chunk }],
  }));

  return toDirectiveNode(marker, transformChildren(children, file), attrs, file);
};

export const expandDirectiveParagraph = (node: MdastNode, file?: VFileLike): MdastNode[] | null => {
  const rawText = getParagraphSingleText(node);
  if (!rawText?.includes('\n')) {
    return null;
  }

  const lines = rawText.split(/\r?\n/);
  const hasDirectiveLine = lines.some((line) => {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      return false;
    }

    return parseStartLine(trimmed, node, file) !== null || END_PATTERN.test(trimmed);
  });

  if (!hasDirectiveLine) {
    return null;
  }

  const result: MdastNode[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = (): void => {
    if (paragraphLines.length === 0) {
      return;
    }

    result.push({
      type: 'paragraph',
      children: [{ type: 'text', value: paragraphLines.join('\n') }],
    });
    paragraphLines = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      flushParagraph();
      continue;
    }

    if (parseStartLine(trimmed, node, file) !== null || END_PATTERN.test(trimmed)) {
      flushParagraph();
      result.push({
        type: 'paragraph',
        children: [{ type: 'text', value: trimmed }],
      });
      continue;
    }

    paragraphLines.push(line);
  }

  flushParagraph();
  return result;
};

export const expandDirectiveParagraphs = (nodes: MdastNode[], file?: VFileLike): MdastNode[] => {
  const result: MdastNode[] = [];

  for (const node of nodes) {
    const expanded = expandDirectiveParagraph(node, file);
    if (expanded) {
      result.push(...expanded);
      continue;
    }

    result.push(node);
  }

  return result;
};
