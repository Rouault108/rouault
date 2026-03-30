import type { MdastNode } from '../types.js';

export const getNodeTextContent = (node: MdastNode): string => {
  if (node.type === 'text') {
    return typeof node.value === 'string' ? node.value : '';
  }

  if (!Array.isArray(node.children)) {
    return '';
  }

  return node.children.map((child) => getNodeTextContent(child)).join('');
};

export const toTextNode = (value: string): MdastNode => ({
  type: 'text',
  value,
});

export const createInlineNode = (
  hName: string,
  text: string,
  hProperties?: Record<string, unknown>,
  nodeType = 'rouaultInlineDirective',
): MdastNode => ({
  type: nodeType,
  data: {
    hName,
    ...(hProperties !== undefined ? { hProperties } : {}),
  },
  children: [toTextNode(text)],
});

export const appendText = (buffer: MdastNode[], value: string): void => {
  if (value.length === 0) {
    return;
  }

  const last = buffer[buffer.length - 1];
  if (last?.type === 'text' && typeof last.value === 'string') {
    last.value += value;
    return;
  }

  buffer.push(toTextNode(value));
};
