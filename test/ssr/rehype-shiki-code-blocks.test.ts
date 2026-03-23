import { describe, expect, it } from 'vitest';

import { rehypeShikiCodeBlocks } from '../../lib/rehype/shiki-code-blocks.js';

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

const getClassList = (value: unknown): string[] => {
  if (typeof value === 'string') {
    return value.split(/\s+/).filter((item) => item.length > 0);
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  }

  return [];
};

const readNodeClassList = (node: HastNode | undefined): string[] =>
  getClassList(node?.properties?.['className'] ?? node?.properties?.['class']);

const getLineElements = (codeNode: HastNode | undefined): HastNode[] =>
  (codeNode?.children ?? []).filter(
    (child) => child.type === 'element' && child.tagName === 'span',
  );

describe('rehypeShikiCodeBlocks', () => {
  it('fenced code を Shiki の classic 構造へ変換し、meta を保持する', async () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'pre',
          properties: {},
          children: [
            {
              type: 'element',
              tagName: 'code',
              properties: {
                className: ['language-ts'],
                filename: 'sample.ts',
                label: '例',
                intent: 'invalid',
                'show-line-numbers': true,
                'copy-mode': 'always',
                wrap: true,
                'highlight-lines': '1,3-4',
                layout: 'inline',
                'data-shiki-meta': '{1}',
              },
              children: [
                { type: 'text', value: 'const highlighted = 1; // [!code highlight]\n' },
                { type: 'text', value: 'const added = 2; // [!code ++]' },
              ],
            },
          ],
        },
      ],
    };

    await rehypeShikiCodeBlocks()(tree);

    const pre = tree.children?.[0];
    expect(pre?.tagName).toBe('pre');
    expect(readNodeClassList(pre)).toContain('shiki');
    expect(pre?.properties?.['lang']).toBe('ts');
    expect(pre?.properties?.['data-raw']).toBe(
      'const highlighted = 1; // [!code highlight]\nconst added = 2; // [!code ++]',
    );

    const code = pre?.children?.find((child) => child.tagName === 'code');
    expect(code?.properties?.['filename']).toBe('sample.ts');
    expect(code?.properties?.['label']).toBe('例');
    expect(code?.properties?.['intent']).toBe('invalid');
    expect(code?.properties?.['show-line-numbers']).toBe(true);
    expect(code?.properties?.['copy-mode']).toBe('always');
    expect(code?.properties?.['wrap']).toBe(true);
    expect(code?.properties?.['highlight-lines']).toBe('1,3-4');
    expect(code?.properties?.['layout']).toBe('inline');
    expect(code?.properties?.['data-shiki-meta']).toBeUndefined();

    const lines = getLineElements(code);
    expect(lines).toHaveLength(2);
    expect(readNodeClassList(lines[0])).toContain('highlighted');
    expect(readNodeClassList(lines[1])).toContain('diff');
    expect(readNodeClassList(lines[1])).toContain('add');
  });

  it('未知言語は text へフォールバックする', async () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'pre',
          properties: {},
          children: [
            {
              type: 'element',
              tagName: 'code',
              properties: {
                className: ['language-unknownlang'],
              },
              children: [{ type: 'text', value: 'plain text block' }],
            },
          ],
        },
      ],
    };

    await rehypeShikiCodeBlocks()(tree);

    const pre = tree.children?.[0];
    expect(pre?.tagName).toBe('pre');
    expect(readNodeClassList(pre)).toContain('shiki');
    expect(pre?.properties?.['lang']).toBe('text');
    expect(pre?.properties?.['data-raw']).toBe('plain text block');
  });
});
