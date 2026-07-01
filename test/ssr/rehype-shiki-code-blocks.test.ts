import { describe, expect, it } from 'vitest';
import { codeToHast } from 'shiki';

import { rehypeShikiCodeBlocks } from '../../build/rehype/shiki-code-blocks.js';
import {
  ROUAULT_SHIKI_COLOR_REPLACEMENTS,
  ROUAULT_SHIKI_THEMES,
} from '../../build/rehype/shiki-themes.js';

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

const getElementChildren = (node: HastNode | undefined): HastNode[] =>
  (node?.children ?? []).filter((child) => child.type === 'element');

const findDescendant = (
  node: HastNode | undefined,
  predicate: (candidate: HastNode) => boolean,
): HastNode | undefined => {
  if (!node) {
    return undefined;
  }
  for (const child of node.children ?? []) {
    if (predicate(child)) {
      return child;
    }
    const matched = findDescendant(child, predicate);
    if (matched) {
      return matched;
    }
  }
  return undefined;
};

const parseStyleDeclarations = (style: string): Map<string, string> => {
  const declarations = new Map<string, string>();
  for (const declaration of style.split(';')) {
    const separatorIndex = declaration.indexOf(':');
    if (separatorIndex < 0) {
      continue;
    }

    const property = declaration.slice(0, separatorIndex).trim();
    const value = declaration.slice(separatorIndex + 1).trim();
    if (property !== '' && value !== '') {
      declarations.set(property, value);
    }
  }
  return declarations;
};

const collectStyledTokenSpans = (node: HastNode | undefined): HastNode[] => {
  if (!node) {
    return [];
  }

  const ownStyle = typeof node.properties?.['style'] === 'string' ? node.properties['style'] : '';
  const ownDeclarations = parseStyleDeclarations(ownStyle);
  const ownMatches =
    node.type === 'element' &&
    node.tagName === 'span' &&
    (ownDeclarations.has('color') || ownDeclarations.has('--shiki-dark'))
      ? [node]
      : [];

  return [...ownMatches, ...(node.children ?? []).flatMap((child) => collectStyledTokenSpans(child))];
};

const SHIKI_THEME_POLICY_FIXTURE_SOURCE = [
  'namespace Quiet.Space {',
  '  public interface Reader<T> {',
  '    T Read();',
  '  }',
  '  public class NoteReader : Reader<string> {',
  '    public string Read() => "note";',
  '  }',
  '}',
].join('\n');

const renderShikiFixture = async (
  options: { readonly colorReplacements: boolean },
): Promise<HastNode> => {
  return (await codeToHast(SHIKI_THEME_POLICY_FIXTURE_SOURCE, {
    lang: 'csharp',
    themes: ROUAULT_SHIKI_THEMES,
    ...(options.colorReplacements ? { colorReplacements: ROUAULT_SHIKI_COLOR_REPLACEMENTS } : {}),
    tabindex: false,
  })) as unknown as HastNode;
};

const tokenForegrounds = (
  node: HastNode,
  property: 'color' | '--shiki-dark',
): Set<string> => {
  return new Set(
    collectStyledTokenSpans(node)
      .map((span) => {
        const style = span.properties?.['style'];
        return typeof style === 'string'
          ? parseStyleDeclarations(style).get(property)?.toLowerCase()
          : undefined;
      })
      .filter((value): value is string => typeof value === 'string'),
  );
};

const findPreElement = (node: HastNode): HastNode | undefined =>
  findDescendant(node, (child) => child.tagName === 'pre');

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
  it('control render では置換元の github-light/github-dark token foreground が出る', async () => {
    const tree = await renderShikiFixture({ colorReplacements: false });

    const lightForegrounds = tokenForegrounds(tree, 'color');
    const darkForegrounds = tokenForegrounds(tree, '--shiki-dark');

    expect(lightForegrounds.has('#d73a49')).toBe(true);
    expect(lightForegrounds.has('#6f42c1')).toBe(true);
    expect(darkForegrounds.has('#f97583')).toBe(true);
    expect(darkForegrounds.has('#b392f0')).toBe(true);

    const preStyle = findPreElement(tree)?.properties?.['style'];
    expect(typeof preStyle).toBe('string');
    const preDeclarations = parseStyleDeclarations(String(preStyle));
    expect(preDeclarations.has('background-color')).toBe(true);
    expect(preDeclarations.has('--shiki-dark-bg')).toBe(true);
  });

  it('Rouault Shiki theme policy は対象 token foreground だけを静かな採用色へ置換する', async () => {
    const tree = await renderShikiFixture({ colorReplacements: true });
    const lightForegrounds = tokenForegrounds(tree, 'color');
    const darkForegrounds = tokenForegrounds(tree, '--shiki-dark');

    expect(lightForegrounds.has('#d73a49')).toBe(false);
    expect(lightForegrounds.has('#6f42c1')).toBe(false);
    expect(lightForegrounds.has('#8f4a52')).toBe(true);
    expect(lightForegrounds.has('#67527c')).toBe(true);
    expect(darkForegrounds.has('#f97583')).toBe(false);
    expect(darkForegrounds.has('#b392f0')).toBe(false);
    expect(darkForegrounds.has('#d08b90')).toBe(true);
    expect(darkForegrounds.has('#b7a0cf')).toBe(true);

    const preStyle = findPreElement(tree)?.properties?.['style'];
    expect(typeof preStyle).toBe('string');
    const preDeclarations = parseStyleDeclarations(String(preStyle));
    expect(preDeclarations.has('background-color')).toBe(true);
    expect(preDeclarations.has('--shiki-dark-bg')).toBe(true);
  });

  it('rehypeShikiCodeBlocks 経由の実出力にも Rouault Shiki theme policy を適用する', async () => {
    const tree: HastNode = {
      type: 'root',
      children: [createCodeFence('language-csharp', SHIKI_THEME_POLICY_FIXTURE_SOURCE)],
    };

    await rehypeShikiCodeBlocks()(tree);

    const root = tree.children?.[0];
    expect(root?.tagName).toBe('figure');
    expect(root?.properties?.['data-code-block-root']).toBe('true');

    const pre = findPreElement(tree);
    expect(pre?.tagName).toBe('pre');
    expect(readNodeClassList(pre)).toContain('shiki');
    expect(pre?.properties?.['data-code-block']).toBe(true);
    expect(pre?.properties?.['data-code-language']).toBe('csharp');

    const lightForegrounds = tokenForegrounds(tree, 'color');
    const darkForegrounds = tokenForegrounds(tree, '--shiki-dark');

    expect(lightForegrounds.has('#d73a49')).toBe(false);
    expect(lightForegrounds.has('#6f42c1')).toBe(false);
    expect(lightForegrounds.has('#8f4a52')).toBe(true);
    expect(lightForegrounds.has('#67527c')).toBe(true);
    expect(darkForegrounds.has('#f97583')).toBe(false);
    expect(darkForegrounds.has('#b392f0')).toBe(false);
    expect(darkForegrounds.has('#d08b90')).toBe(true);
    expect(darkForegrounds.has('#b7a0cf')).toBe(true);

    const preStyle = pre?.properties?.['style'];
    expect(typeof preStyle).toBe('string');
    const preDeclarations = parseStyleDeclarations(String(preStyle));
    expect(preDeclarations.has('background-color')).toBe(true);
    expect(preDeclarations.has('--shiki-dark-bg')).toBe(true);
  });

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
    expect(copySource?.properties?.['id']).toEqual(expect.any(String));
    expect(copySource?.children?.[0]?.value).toBe(
      'const highlighted = 1; // [!code highlight]\nconst added = 2; // [!code ++]',
    );

    const copyButton = findDescendant(
      header,
      (child) => child.tagName === 'button' && child.properties?.['data-copy-button'] === 'true',
    );
    expect(copyButton?.properties?.['data-copy-target-id']).toBe(copySource?.properties?.['id']);
    expect(copyButton?.properties?.['disabled']).toBe(true);
    expect(copyButton?.properties?.['data-copy-disabled-reason']).toBe('no-js');
    expect(copyButton?.properties?.['aria-describedby']).toBe(
      `${String(copySource?.properties?.['id'])}-copy-status`,
    );
    const copyStatus = findDescendant(
      header,
      (child) =>
        child.tagName === 'span' &&
        child.properties?.['id'] === copyButton?.properties?.['aria-describedby'],
    );
    expect(copyStatus?.properties?.['data-copy-status']).toBe('true');

    const intent = findDescendant(header, (child) =>
      readNodeClassList(child).includes('code-surface-intent'),
    );
    expect(
      intent?.children?.some((child) => child.type === 'text' && child.value === '誤り例'),
    ).toBe(true);
    const intentIcon = findDescendant(
      intent,
      (child) => child.tagName === 'svg' && child.properties?.['data-icon'] === 'triangle-alert',
    );
    expect(intentIcon?.properties?.['aria-hidden']).toBe('true');
    expect(intentIcon?.properties?.['focusable']).toBe('false');
    expect(findDescendant(intent, (child) => child.tagName === 'ui-icon')).toBeUndefined();

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

  it('filename と intent を持たない standalone fenced code は root 直下に overlay copy DOM を維持する', async () => {
    const tree: HastNode = {
      type: 'root',
      children: [createCodeFence('language-csharp', 'Console.WriteLine("Hello, World!");')],
    };

    await rehypeShikiCodeBlocks()(tree);

    const root = tree.children?.[0];
    expect(root?.tagName).toBe('figure');
    expect(root?.properties?.['data-code-block-root']).toBe('true');
    expect(readNodeClassList(root)).toContain('code-surface-root--overlay');

    const rootElementChildren = getElementChildren(root);
    expect(rootElementChildren).toHaveLength(3);

    const caption = rootElementChildren[0];
    expect(caption?.tagName).toBe('div');
    expect(readNodeClassList(caption)).toContain('code-surface-caption');
    expect(
      findDescendant(caption, (child) =>
        readNodeClassList(child).includes('code-surface-copy-button-shell'),
      ),
    ).toBeDefined();
    expect(
      findDescendant(caption, (child) =>
        readNodeClassList(child).includes('code-surface-caption-main'),
      ),
    ).toBeUndefined();

    const copySource = rootElementChildren[1];
    expect(copySource?.tagName).toBe('template');
    expect(copySource?.properties?.['data-code-copy-source']).toBe('true');

    const pre = rootElementChildren[2];
    expect(pre?.tagName).toBe('pre');
    expect(pre?.properties?.['data-code-block']).toBe(true);
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
