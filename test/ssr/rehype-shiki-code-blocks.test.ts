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
  it('fenced code を静的 code block 構造へ変換し、meta を data 属性へ保持する', async () => {
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
    expect(pre?.properties?.['data-code-block']).toBe(true);
    expect(pre?.properties?.['data-code-language']).toBe('ts');
    expect(pre?.properties?.['data-code-raw']).toBe(
      'const highlighted = 1; // [!code highlight]\nconst added = 2; // [!code ++]',
    );
    expect(pre?.properties?.['data-code-filename']).toBe('sample.ts');
    expect(pre?.properties?.['data-code-label']).toBe('例');
    expect(pre?.properties?.['data-code-intent']).toBe('invalid');
    expect(pre?.properties?.['data-code-line-numbers']).toBe('true');
    expect(pre?.properties?.['data-code-copy-mode']).toBe('always');
    expect(pre?.properties?.['data-code-wrap']).toBe('true');
    expect(pre?.properties?.['data-code-highlight-lines']).toBe('1,3-4');
    expect(pre?.properties?.['data-code-layout']).toBe('inline');

    const code = pre?.children?.find((child) => child.tagName === 'code');
    expect(code?.properties?.['data-lang']).toBe('ts');
    expect(code?.properties?.['filename']).toBeUndefined();
    expect(code?.properties?.['label']).toBeUndefined();
    expect(code?.properties?.['intent']).toBeUndefined();
    expect(code?.properties?.['show-line-numbers']).toBeUndefined();
    expect(code?.properties?.['copy-mode']).toBeUndefined();
    expect(code?.properties?.['wrap']).toBeUndefined();
    expect(code?.properties?.['highlight-lines']).toBeUndefined();
    expect(code?.properties?.['layout']).toBeUndefined();
    expect(code?.properties?.['data-shiki-meta']).toBeUndefined();

    const lines = getLineElements(code);
    expect(lines).toHaveLength(2);
    expect(readNodeClassList(lines[0])).toContain('ui-explicit-highlight');
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
    expect(pre?.properties?.['data-code-language']).toBe('text');
    expect(pre?.properties?.['data-code-raw']).toBe('plain text block');
  });
});
