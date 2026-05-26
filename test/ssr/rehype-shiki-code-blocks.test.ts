import { describe, expect, it } from 'vitest';

import { rehypeShikiCodeBlocks } from '../../build/rehype/shiki-code-blocks.js';

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

const createCodeFence = (
  languageClassName: string,
  source: string,
  properties: Record<string, unknown> = {},
): HastNode => ({
  type: 'element',
  tagName: 'pre',
  properties: {},
  children: [
    {
      type: 'element',
      tagName: 'code',
      properties: {
        className: [languageClassName],
        ...properties,
      },
      children: [{ type: 'text', value: source }],
    },
  ],
});

describe('rehypeShikiCodeBlocks', () => {
  it('standalone fenced code を静的 code surface 構造へ変換し、meta を data 属性へ保持する', async () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        createCodeFence(
          'language-ts',
          'const highlighted = 1; // [!code highlight]\nconst added = 2; // [!code ++]',
          {
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
        ),
      ],
    };

    await rehypeShikiCodeBlocks()(tree);

    const root = tree.children?.[0];
    expect(root?.tagName).toBe('figure');
    expect(root?.properties?.['data-code-block-root']).toBe('true');
    expect(root?.properties?.['data-hydration-key']).toBe('code-block-enhancer');
    expect(root?.properties?.['data-hydration-capability']).toBe('progressive');
    expect(root?.properties?.['data-hydration-trigger']).toBe('post-commit');

    const header = root?.children?.[0];
    expect(header?.tagName).toBe('div');
    expect(readNodeClassList(header)).toContain('code-surface-caption');
    expect(getClassList(root?.properties?.['className'])).toContain('code-surface-root');

    const copySource = root?.children?.[1];
    expect(copySource?.tagName).toBe('template');
    expect(copySource?.properties?.['data-code-copy-source']).toBe('true');
    expect(copySource?.children?.[0]?.value).toBe(
      'const highlighted = 1; // [!code highlight]\nconst added = 2; // [!code ++]',
    );

    const pre = root?.children?.[2];
    expect(pre?.tagName).toBe('pre');
    expect(readNodeClassList(pre)).toContain('shiki');
    expect(pre?.properties?.['data-code-block']).toBe(true);
    expect(pre?.properties?.['data-code-language']).toBe('ts');
    expect(pre?.properties?.['data-code-raw']).toBeUndefined();
    expect(pre?.properties?.['data-code-copy-source']).toBeUndefined();
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

  it('ページ内最初の standalone code block だけに enhancer 用 hydration root を付与すること', async () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        createCodeFence('language-ts', 'const grouped = 1;', {
          'group-key': 'valid',
          'tab-label': 'TypeScript',
        }),
        createCodeFence('language-js', 'const standalone = 2;'),
        createCodeFence('language-css', 'body { color: red; }'),
      ],
    };

    await rehypeShikiCodeBlocks()(tree);

    const grouped = tree.children?.[0];
    const firstStandalone = tree.children?.[1];
    const secondStandalone = tree.children?.[2];

    expect(grouped?.tagName).toBe('pre');
    expect(grouped?.properties?.['data-hydration-key']).toBeUndefined();

    expect(firstStandalone?.tagName).toBe('figure');
    expect(firstStandalone?.properties?.['data-hydration-key']).toBe('code-block-enhancer');
    expect(firstStandalone?.properties?.['data-hydration-capability']).toBe('progressive');
    expect(firstStandalone?.properties?.['data-hydration-trigger']).toBe('post-commit');

    expect(secondStandalone?.tagName).toBe('figure');
    expect(secondStandalone?.properties?.['data-hydration-key']).toBeUndefined();
    expect(secondStandalone?.properties?.['data-hydration-capability']).toBeUndefined();
    expect(secondStandalone?.properties?.['data-hydration-trigger']).toBeUndefined();
  });

  it('syntax-signature 用の plain pre[data-syntax-signature] は通常 code surface へ変換しないこと', async () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'section',
          properties: {
            'data-syntax-card-source': 'true',
          },
          children: [
            {
              type: 'element',
              tagName: 'pre',
              properties: {
                slot: 'signature',
                'data-syntax-signature': 'true',
              },
              children: [{ type: 'text', value: 'function useEffect(): void' }],
            },
          ],
        },
        createCodeFence('language-ts', 'const standalone = 1;'),
      ],
    };

    await rehypeShikiCodeBlocks()(tree);

    const syntaxCard = tree.children?.[0];
    const signaturePre = syntaxCard?.children?.[0];
    expect(syntaxCard?.tagName).toBe('section');
    expect(syntaxCard?.properties?.['data-syntax-card-source']).toBe('true');
    expect(signaturePre?.tagName).toBe('pre');
    expect(signaturePre?.properties?.['data-syntax-signature']).toBe('true');
    expect(signaturePre?.properties?.['data-code-block']).toBeUndefined();
    expect(readNodeClassList(signaturePre)).not.toContain('shiki');
    expect(signaturePre?.children?.[0]?.value).toBe('function useEffect(): void');

    const standaloneRoot = tree.children?.[1];
    expect(standaloneRoot?.tagName).toBe('figure');
    expect(standaloneRoot?.properties?.['data-code-block-root']).toBe('true');
  });

  it('未知言語は text へフォールバックする', async () => {
    const tree: HastNode = {
      type: 'root',
      children: [createCodeFence('language-unknownlang', 'plain text block')],
    };

    await rehypeShikiCodeBlocks()(tree);

    const root = tree.children?.[0];
    const pre = root?.children?.find((child) => child.tagName === 'pre');
    expect(root?.tagName).toBe('figure');
    expect(pre?.tagName).toBe('pre');
    expect(readNodeClassList(pre)).toContain('shiki');
    expect(pre?.properties?.['data-code-language']).toBe('text');
    expect(pre?.properties?.['data-code-raw']).toBeUndefined();
    const copySource = root?.children?.find((child) => child.tagName === 'template');
    expect(copySource?.properties?.['data-code-copy-source']).toBe('true');
    expect(copySource?.children?.[0]?.value).toBe('plain text block');
  });
});
