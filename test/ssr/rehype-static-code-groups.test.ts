import { describe, expect, it } from 'vitest';

import { rehypeStaticCodeGroups } from '../../build/rehype/static-code-groups.js';

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
  it('code group source を stacked baseline + enhancement 用の静的構造へ変換すること', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'section',
          properties: { 'data-code-group-source': 'true', 'aria-label': '実装比較' },
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
    expect(group?.properties?.['data-code-group-label']).toBe('実装比較');
    expect(group?.properties?.['data-hydration-key']).toBe('code-group-enhancer');
    expect(group?.properties?.['data-hydration-capability']).toBe('interactive');
    expect(group?.properties?.['data-hydration-trigger']).toBe('visible');

    const header = group?.children?.[0];
    expect(header?.tagName).toBe('div');
    expect(header?.properties?.['className']).toEqual(['code-group-header']);

    const tabList = header?.children?.[0];
    expect(tabList?.tagName).toBe('div');
    expect(tabList?.properties?.['className']).toEqual(['code-group-tablist']);
    expect(tabList?.properties?.['role']).toBe('tablist');
    expect(tabList?.properties?.['aria-label']).toBe('実装比較');

    const firstTab = tabList?.children?.[0];
    expect(firstTab?.tagName).toBe('button');
    expect(firstTab?.properties?.['data-code-group-tab']).toBe('true');
    expect(firstTab?.properties?.['data-code-group-key']).toBe('valid');
    expect(firstTab?.properties?.['role']).toBe('tab');
    expect(firstTab?.properties?.['aria-selected']).toBe('true');
    expect(firstTab?.properties?.['data-selected']).toBe('true');
    expect(firstTab?.properties?.['tabindex']).toBe(0);
    expect(firstTab?.properties?.['aria-controls']).toEqual(expect.any(String));

    const headerTools = header?.children?.[1];
    expect(headerTools?.tagName).toBe('div');
    expect(headerTools?.properties?.['className']).toEqual(['code-group-header-tools']);

    const copyButton = headerTools?.children?.[0];
    expect(copyButton?.tagName).toBe('span');
    expect(copyButton?.properties?.['data-copy-control']).toBe('true');
    const button = copyButton?.children?.[0];
    expect(button?.tagName).toBe('button');
    expect(button?.properties?.['data-code-group-copy']).toBe('true');
    const selectedCopySourceId = button?.properties?.['data-copy-target-id'];
    expect(selectedCopySourceId).toMatch(/^note:code-groups-[a-z0-9]+-code-group-1-copy-source-0$/u);
    expect(button?.properties?.['aria-describedby']).toBe(`${String(selectedCopySourceId)}-copy-status`);

    const firstPanel = group?.children?.[1];
    const secondPanel = group?.children?.[2];
    expect(firstPanel?.tagName).toBe('section');
    expect(firstPanel?.properties?.['data-code-group-panel']).toBe('valid');
    expect(firstPanel?.properties?.['role']).toBe('tabpanel');
    expect(firstPanel?.properties?.['aria-labelledby']).toBe(firstTab?.properties?.['id']);
    expect(firstPanel?.properties?.['id']).toBe(firstTab?.properties?.['aria-controls']);
    expect(firstPanel?.children?.[0]?.tagName).toBe('template');
    expect(firstPanel?.children?.[1]?.tagName).toBe('p');
    expect(firstPanel?.children?.[2]?.tagName).toBe('figure');
    expect(firstPanel?.children?.[2]?.properties?.['data-code-block-root']).toBe('true');
    expect(firstPanel?.children?.[2]?.properties?.['data-code-group-owned']).toBe('true');

    expect(secondPanel?.tagName).toBe('section');
    expect(secondPanel?.properties?.['data-code-group-panel']).toBe('invalid');
    expect(secondPanel?.properties?.['data-code-group-inactive']).toBe('true');
    expect(secondPanel?.properties?.['hidden']).toBe(true);
    expect(secondPanel?.properties?.['role']).toBe('tabpanel');
  });

  it('child が 1 件だけなら standalone code block factory 経由の figure に戻すこと', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'section',
          properties: { 'data-code-group-source': 'true', 'aria-label': '単一' },
          children: [createStaticCodeBlock('only', 'Only', 'ts')],
        },
      ],
    };

    const createTransform = rehypeStaticCodeGroups as () => (tree: HastNode) => void;
    const transform = createTransform();
    transform(tree);

    const first = tree.children?.[0];
    expect(first?.tagName).toBe('figure');
    expect(first?.properties?.['data-code-block-root']).toBe('true');
    expect(first?.properties?.['data-hydration-key']).toBe('code-block-enhancer');
    expect(first?.properties?.['data-code-group']).toBeUndefined();
    expect(first?.children?.find((child) => child.tagName === 'template')?.properties?.[
      'data-code-copy-source'
    ]).toBe('true');
    expect(first?.children?.find((child) => child.tagName === 'pre')?.properties?.[
      'data-code-block'
    ]).toBe(true);
  });
});
