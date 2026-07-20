import { type HastNode } from './hast-utils.js';

export const createStaticCodeCopySourceHast = (id: string, source: string): HastNode => ({
  type: 'element',
  tagName: 'template',
  properties: {
    id,
    'data-code-copy-source': 'true',
  },
  children: [],
  content: {
    type: 'root',
    children: [{ type: 'text', value: source }],
  },
});
