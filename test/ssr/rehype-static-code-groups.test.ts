import { describe, expect, it } from 'vitest';

import { rehypeStaticCodeGroups } from '../../build/rehype/static-code-groups';

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

const createStaticCodeBlock = (
  key: string,
  label: string,
  language: string,
  filename?: string,
): HastNode => ({
  type: 'element',
  tagName: 'pre',
  properties: {
    'data-code-block': true,
    'data-code-group-key': key,
    'data-code-tab-label': label,
    'data-code-language': language,
    ...(filename ? { 'data-code-filename': filename } : {}),
  },
  children: [
    {
      type: 'element',
      tagName: 'code',
      properties: {
        'data-lang': language,
      },
      children: [{ type: 'text', value: `const ${key} = true;` }],
    },
  ],
});

describe('rehypeStaticCodeGroups', () => {
  it('ui-code-group を native tab structure へ変換すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'ui-code-group',
          properties: { 'aria-label': '実装比較' },
          children: [
            createStaticCodeBlock('valid', '正しい例', 'ts', 'valid.ts'),
            createStaticCodeBlock('invalid', '誤り例', 'ts', 'invalid.ts'),
          ],
        },
      ],
    };

    const createTransform = rehypeStaticCodeGroups as () => (tree: HastNode) => void;
    const transform = createTransform();
    transform(tree);

    const group = tree.children?.[0];
    expect(group?.tagName).toBe('section');
    expect(group?.properties?.['data-code-group']).toBe(true);
    expect(group?.properties?.['aria-label']).toBe('実装比較');
    expect(group?.properties?.['data-hydration-key']).toBe('code-group-enhancer');
    expect(group?.properties?.['data-hydration-capability']).toBe('interactive');
    expect(group?.properties?.['data-hydration-trigger']).toBe('visible');

    const header = group?.children?.[0];
    expect(header?.tagName).toBe('div');
    expect(header?.properties?.['className']).toEqual(['code-group-header']);

    const tabList = header?.children?.[0];
    expect(tabList?.tagName).toBe('div');
    expect(tabList?.properties?.['role']).toBe('tablist');
    expect(tabList?.properties?.['aria-label']).toBe('実装比較');

    const firstTab = tabList?.children?.[0];
    expect(firstTab?.tagName).toBe('button');
    expect(firstTab?.properties?.['role']).toBe('tab');
    expect(firstTab?.properties?.['aria-selected']).toBe('true');

    const copyButton = header?.children?.[1];
    expect(copyButton?.tagName).toBe('button');
    expect(copyButton?.properties?.['data-code-group-copy']).toBe(true);
    expect(copyButton?.properties?.['disabled']).toBe(true);

    const firstPanel = group?.children?.[1];
    const secondPanel = group?.children?.[2];
    expect(firstPanel?.tagName).toBe('section');
    expect(firstPanel?.properties?.['role']).toBe('tabpanel');
    expect(firstPanel?.properties?.['data-code-group-panel']).toBe('valid');
    expect(firstPanel?.children?.[0]?.tagName).toBe('p');
    expect(firstPanel?.children?.[1]?.tagName).toBe('pre');

    expect(secondPanel?.tagName).toBe('section');
    expect(secondPanel?.properties?.['data-code-group-panel']).toBe('invalid');
    expect(secondPanel?.properties?.['data-code-group-inactive']).toBe('true');
  });

  it('child が 1 件だけなら code block をそのまま残すこと', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'ui-code-group',
          properties: { 'aria-label': '単一' },
          children: [createStaticCodeBlock('only', 'Only', 'ts')],
        },
      ],
    };

    const createTransform = rehypeStaticCodeGroups as () => (tree: HastNode) => void;
    const transform = createTransform();
    transform(tree);

    const first = tree.children?.[0];
    expect(first?.tagName).toBe('pre');
    expect(first?.properties?.['data-code-block']).toBe(true);
  });
});
