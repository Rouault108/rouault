import { describe, expect, it } from 'vitest';
import { toHtml } from 'hast-util-to-html';

import { rehypeStaticCodeGroups } from '../../build/rehype/static-code-groups.js';

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  content?: {
    type: 'root';
    children: HastNode[];
  };
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
    'data-code-copy-source': `const ${key} = true;`,
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
          properties: {
            'data-code-group-source': 'true',
            'aria-label': '実装比較',
            'data-code-group-sync-scope': 'package-manager',
          },
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
    expect(group?.properties?.['data-code-group-source']).toBeUndefined();
    expect(group?.properties?.['aria-label']).toBe('実装比較');
    expect(group?.properties?.['data-code-group-sync-scope']).toBe('package-manager');
    expect(group?.properties?.['data-code-group-label']).toBe('実装比較');
    expect(group?.properties?.['data-hydration-key']).toBe('code-group-enhancer');
    expect(group?.properties?.['data-hydration-capability']).toBe('interactive');
    expect(group?.properties?.['data-hydration-trigger']).toBe('visible');

    const header = group?.children?.[0];
    expect(header?.tagName).toBe('div');
    expect(header?.properties?.['className']).toEqual(['code-group-header']);
    expect(header?.properties?.['data-code-group-controls']).toBe('true');

    const tabList = header?.children?.[0];
    expect(tabList?.tagName).toBe('div');
    expect(tabList?.properties?.['className']).toEqual(['code-group-tablist']);
    expect(tabList?.properties?.['role']).toBeUndefined();
    expect(tabList?.properties?.['aria-label']).toBeUndefined();

    const firstTab = tabList?.children?.[0];
    expect(firstTab?.tagName).toBe('button');
    expect(firstTab?.properties?.['data-code-group-tab']).toBe('true');
    expect(firstTab?.properties?.['data-code-group-key']).toBe('valid');
    expect(firstTab?.properties?.['role']).toBeUndefined();
    expect(firstTab?.properties?.['aria-selected']).toBeUndefined();
    expect(firstTab?.properties?.['data-selected']).toBeUndefined();
    expect(firstTab?.properties?.['tabindex']).toBeUndefined();
    expect(firstTab?.properties?.['aria-controls']).toBeUndefined();
    expect(firstTab?.properties?.['data-code-group-panel-id']).toEqual(expect.any(String));

    const headerTools = header?.children?.[1];
    expect(headerTools?.tagName).toBe('div');
    expect(headerTools?.properties?.['className']).toEqual(['code-group-header-tools']);

    const button = headerTools?.children?.[0];
    expect(button?.tagName).toBe('button');
    expect(button?.properties?.['data-code-group-copy']).toBe('true');
    expect(button?.properties?.['disabled']).toBe(true);
    expect(button?.properties?.['data-copy-disabled-reason']).toBe('no-js');
    const selectedCopySourceId = button?.properties?.['data-copy-target-id'];
    expect(selectedCopySourceId).toMatch(
      /^note:code-groups-[a-z0-9]+-code-group-1-copy-source-0$/u,
    );
    expect(button?.properties?.['aria-describedby']).toBe(
      `${String(selectedCopySourceId)}-copy-status`,
    );
    const copyStatus = headerTools?.children?.[1];
    expect(copyStatus?.tagName).toBe('span');
    expect(copyStatus?.properties?.['id']).toBe(button?.properties?.['aria-describedby']);
    expect(copyStatus?.properties?.['data-copy-status']).toBe('true');

    const firstPanel = group?.children?.[1];
    const secondPanel = group?.children?.[2];
    expect(firstPanel?.tagName).toBe('section');
    expect(firstPanel?.properties?.['data-code-group-panel']).toBe('valid');
    expect(firstPanel?.properties?.['data-code-group-panel-active']).toBe('true');
    expect(typeof firstPanel?.properties?.['data-code-group-panel-active']).toBe('string');
    expect(firstPanel?.properties?.['role']).toBeUndefined();
    expect(firstPanel?.properties?.['aria-labelledby']).toBeUndefined();
    expect(firstPanel?.properties?.['id']).toBe(firstTab?.properties?.['data-code-group-panel-id']);
    expect(firstPanel?.properties?.['hidden']).toBeUndefined();
    expect(firstPanel?.properties?.['data-code-group-inactive']).toBeUndefined();
    expect(firstPanel?.properties?.['data-code-copy-source-id']).toEqual(expect.any(String));
    expect(firstPanel?.children?.[0]?.tagName).toBe('template');
    expect(firstPanel?.children?.[0]?.properties?.['id']).toBe(
      firstPanel?.properties?.['data-code-copy-source-id'],
    );
    expect(firstPanel?.children?.[0]?.properties?.['data-code-copy-source']).toBe('true');
    expect(firstPanel?.children?.[0]?.children).toEqual([]);
    expect(firstPanel?.children?.[0]?.content?.type).toBe('root');
    expect(firstPanel?.children?.[0]?.content?.children?.[0]?.value).toBe(
      'const valid = true;',
    );
    const firstCopySourceHtml = toHtml(
      firstPanel?.children?.[0] as unknown as Parameters<typeof toHtml>[0],
    );
    expect(firstCopySourceHtml).toContain('>const valid = true;</template>');
    expect(firstPanel?.children?.[1]?.tagName).toBe('p');
    expect(firstPanel?.children?.[1]?.properties?.['className']).toEqual([
      'code-group-stack-label',
    ]);
    expect(firstPanel?.children?.[1]?.children?.[0]?.value).toBe('正しい例');
    expect(firstPanel?.children?.[2]?.tagName).toBe('figure');
    expect(firstPanel?.children?.[2]?.properties?.['data-code-block-root']).toBe('true');
    expect(firstPanel?.children?.[2]?.properties?.['data-code-group-owned']).toBe('true');
    expect(firstPanel?.children?.[2]?.properties?.['data-code-group-source']).toBeUndefined();

    expect(secondPanel?.tagName).toBe('section');
    expect(secondPanel?.properties?.['data-code-group-panel']).toBe('invalid');
    expect(secondPanel?.properties?.['data-code-group-panel-active']).toBe('false');
    expect(typeof secondPanel?.properties?.['data-code-group-panel-active']).toBe('string');
    expect(secondPanel?.properties?.['data-code-group-inactive']).toBeUndefined();
    expect(secondPanel?.properties?.['hidden']).toBeUndefined();
    expect(secondPanel?.properties?.['role']).toBeUndefined();
    expect(secondPanel?.properties?.['aria-labelledby']).toBeUndefined();
    expect(secondPanel?.properties?.['data-code-copy-source-id']).toEqual(expect.any(String));
    expect(secondPanel?.children?.[0]?.properties?.['id']).toBe(
      secondPanel?.properties?.['data-code-copy-source-id'],
    );
    expect(secondPanel?.children?.[0]?.properties?.['data-code-copy-source']).toBe('true');
    expect(secondPanel?.children?.[0]?.children).toEqual([]);
    expect(secondPanel?.children?.[0]?.content?.type).toBe('root');
    expect(secondPanel?.children?.[0]?.content?.children?.[0]?.value).toBe(
      'const invalid = true;',
    );
    const secondCopySourceHtml = toHtml(
      secondPanel?.children?.[0] as unknown as Parameters<typeof toHtml>[0],
    );
    expect(secondCopySourceHtml).toContain('>const invalid = true;</template>');
    expect(secondPanel?.children?.[1]?.children?.[0]?.value).toBe('誤り例');

    const html = toHtml(group as unknown as Parameters<typeof toHtml>[0]);
    expect(html).toContain('data-code-group-panel-active="true"');
    expect(html).toContain('data-code-group-panel-active="false"');
    expect(html).toContain('data-code-group-sync-scope="package-manager"');
    expect(html).not.toContain('data-code-group-panel-active=""');
    expect(html).not.toMatch(/\sdata-code-group-panel-active(?:\s|>)/u);
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
    expect(
      first?.children?.find((child) => child.tagName === 'template')?.properties?.[
        'data-code-copy-source'
      ],
    ).toBe('true');
    expect(
      first?.children?.find((child) => child.tagName === 'pre')?.properties?.['data-code-block'],
    ).toBe(true);
  });
});
