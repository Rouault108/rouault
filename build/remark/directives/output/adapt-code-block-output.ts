import type { CodeBlockPayload } from '../payload/payload-types.js';
import type { MdastNode } from '../types.js';

const buildCodeBlockProperties = (payload: CodeBlockPayload): Record<string, unknown> => ({
  ...(payload.filename ? { filename: payload.filename } : {}),
  ...(payload.label ? { label: payload.label } : {}),
  ...(payload.groupKey ? { 'group-key': payload.groupKey } : {}),
  ...(payload.tabLabel ? { 'tab-label': payload.tabLabel } : {}),
  ...(payload.copyLabel ? { 'copy-label': payload.copyLabel } : {}),
  ...(payload.intent ? { intent: payload.intent } : {}),
  ...(payload.showLineNumbers ? { 'show-line-numbers': true } : {}),
  ...(payload.copyMode ? { 'copy-mode': payload.copyMode } : {}),
  ...(payload.copyable === false ? { copyable: 'false' } : {}),
  ...(payload.wrap ? { wrap: true } : {}),
  ...(payload.highlightLines ? { 'highlight-lines': payload.highlightLines } : {}),
  ...(payload.layout ? { layout: payload.layout } : {}),
  ...(payload.rawMeta ? { 'data-shiki-meta': payload.rawMeta } : {}),
});

export const adaptCodeBlockOutput = (node: MdastNode): MdastNode => {
  const payload = node.rouaultCodeBlockPayload as CodeBlockPayload | undefined;
  if (!payload) {
    return node;
  }

  const properties = buildCodeBlockProperties(payload);
  if (Object.keys(properties).length === 0) {
    return node;
  }

  return {
    ...node,
    data: {
      ...(node.data ?? {}),
      hProperties: {
        ...(node.data?.hProperties ?? {}),
        ...properties,
      },
    },
  };
};
