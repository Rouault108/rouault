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

const readMergedNodeClassList = (node: HastNode | undefined): string[] => [
  ...getClassList(node?.properties?.['className']),
  ...getClassList(node?.properties?.['class']),
];

const readNodeClassList = readMergedNodeClassList;

const getDirectNewlineOnlyTextNodes = (node: HastNode | undefined): HastNode[] =>
  (node?.children ?? []).filter(
    (child) =>
      child.type === 'text' &&
      typeof child.value === 'string' &&
      /^\n+$/u.test(child.value),
  );

const readTextContent = (node: HastNode | undefined): string => {
  if (!node) {
    return '';
  }

  if (node.type === 'text') {
    return typeof node.value === 'string' ? node.value : '';
  }

  return (node.children ?? []).map((child) => readTextContent(child)).join('');
};

const getDirectLineElements = (codeNode: HastNode | undefined): HastNode[] =>
  (codeNode?.children ?? []).filter(
    (child) =>
      child.type === 'element' &&
      child.tagName === 'span' &&
      readMergedNodeClassList(child).includes('line'),
  );

const getLineElements = getDirectLineElements;

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

const EXPECTED_CANDIDATE_SHIKI_COLOR_REPLACEMENTS = {
  'github-light': {
    '#d73a49': '#8f4a52',
    '#6f42c1': '#67527c',
    '#005cc5': '#4f6578',
    '#032f62': '#3f5f66',
    '#e36209': '#7a5b47',
    '#6a737d': '#646a71',
  },
  'github-dark': {
    '#f97583': '#d08b90',
    '#b392f0': '#b7a0cf',
    '#79b8ff': '#9bb0c2',
    '#9ecbff': '#9ab1b4',
    '#ffab70': '#c3a087',
    '#6a737d': '#8b949e',
  },
} as const;

const SHIKI_SOURCE_INVENTORY_FIXTURES = [
  {
    language: 'typescript',
    lang: 'tsx',
    source: [
      '// rouault inventory comment',
      'export async function readNote<T extends string>(path: URL): Promise<T> {',
      "  const response = await fetch(path, { method: 'GET' });",
      '  if (!response.ok) throw new Error("failed");',
      '  return (await response.text()) as T;',
      '}',
      'const preview = <article data-kind="note">Rouault</article>;',
    ].join('\n'),
  },
  {
    language: 'c',
    lang: 'c',
    source: [
      '#include <stdio.h>',
      '// rouault inventory comment',
      'int main(int argc, char **argv) {',
      '  const char *message = argc > 1 ? argv[1] : "note";',
      '  printf("%s\\n", message);',
      '  return 0;',
      '}',
    ].join('\n'),
  },
  {
    language: 'json',
    lang: 'json',
    source: [
      '{',
      '  "name": "rouault",',
      '  "enabled": true,',
      '  "count": 3,',
      '  "fallback": null',
      '}',
    ].join('\n'),
  },
  {
    language: 'shell',
    lang: 'shellscript',
    source: [
      '#!/usr/bin/env bash',
      '# rouault inventory comment',
      'set -euo pipefail',
      'name="${1:-note}"',
      'if [[ -n "$name" ]]; then',
      "  printf '%s\\n' \"$name\"",
      'fi',
    ].join('\n'),
  },
  {
    language: 'csharp',
    lang: 'csharp',
    source: [
      '// rouault inventory comment',
      'namespace Quiet.Space {',
      '  public interface Reader<T> { T Read(); }',
      '  public sealed class NoteReader : Reader<string> {',
      '    public string Read() => "note";',
      '  }',
      '}',
    ].join('\n'),
  },
] as const;

type CandidateThemeName = keyof typeof EXPECTED_CANDIDATE_SHIKI_COLOR_REPLACEMENTS;

const CANDIDATE_THEME_FOREGROUND_PROPERTIES = {
  'github-light': 'color',
  'github-dark': '--shiki-dark',
} as const satisfies Record<CandidateThemeName, 'color' | '--shiki-dark'>;

const tokenForegroundInventory = (
  node: HastNode,
  property: 'color' | '--shiki-dark',
): string[] =>
  collectStyledTokenSpans(node)
    .map((span) => {
      const style = span.properties?.['style'];
      return typeof style === 'string'
        ? parseStyleDeclarations(style).get(property)?.toLowerCase()
        : undefined;
    })
    .filter((value): value is string => typeof value === 'string');

const commentTokenForegrounds = (
  node: HastNode,
  property: 'color' | '--shiki-dark',
): string[] =>
  collectStyledTokenSpans(node)
    .filter((span) => readTextContent(span).includes('rouault inventory comment'))
    .flatMap((span) => {
      const style = span.properties?.['style'];
      const foreground =
        typeof style === 'string' ? parseStyleDeclarations(style).get(property) : undefined;
      return foreground ? [foreground.toLowerCase()] : [];
    });

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
  it('Phase 0-A: candidate source inventory と replacement collision を5言語で検証する', async () => {
    const controlRenders = await Promise.all(
      SHIKI_SOURCE_INVENTORY_FIXTURES.map(async (fixture) => ({
        fixture,
        tree: (await codeToHast(fixture.source, {
          lang: fixture.lang,
          themes: ROUAULT_SHIKI_THEMES,
          tabindex: false,
        })) as unknown as HastNode,
      })),
    );

    const evidence = Object.fromEntries(
      (Object.keys(EXPECTED_CANDIDATE_SHIKI_COLOR_REPLACEMENTS) as CandidateThemeName[]).map(
        (theme) => {
          const mapping = EXPECTED_CANDIDATE_SHIKI_COLOR_REPLACEMENTS[theme];
          const property = CANDIDATE_THEME_FOREGROUND_PROPERTIES[theme];
          const fixtureInventory = Object.fromEntries(
            controlRenders.map(({ fixture, tree }) => [
              fixture.language,
              [...new Set(tokenForegroundInventory(tree, property))].sort(),
            ]),
          );
          const controlForegrounds = new Set(Object.values(fixtureInventory).flat());
          const candidateSources = Object.keys(mapping);
          const candidateOutputs = Object.values(mapping);
          const candidateSourceSet = new Set(candidateSources);
          const missingCandidateSources = candidateSources.filter(
            (source) => !controlForegrounds.has(source),
          );
          const mappingTargetForegrounds = new Set(
            [...controlForegrounds].filter((foreground) => !candidateSourceSet.has(foreground)),
          );
          const replacementOutputCollisions = candidateOutputs.filter((output) =>
            mappingTargetForegrounds.has(output),
          );
          const commentSource = mapping['#6a737d'];
          const commentTokenSources = controlRenders.flatMap(({ tree }) =>
            commentTokenForegrounds(tree, property),
          );

          return [
            theme,
            {
              candidateSourceCount: candidateSources.length,
              candidateReplacementOutputCount: candidateOutputs.length,
              uniqueReplacementOutputCount: new Set(candidateOutputs).size,
              missingCandidateSources,
              replacementOutputCollisions,
              commentSourceAppliedToCommentToken:
                typeof commentSource === 'string' && commentTokenSources.includes('#6a737d'),
              commentTokenSources,
              fixtureInventory,
            },
          ];
        },
      ),
    );

    const failures = Object.entries(evidence).flatMap(([theme, themeEvidence]) => {
      const problems: string[] = [];
      if (themeEvidence.candidateSourceCount !== 6) {
        problems.push(`candidate source count=${themeEvidence.candidateSourceCount}`);
      }
      if (themeEvidence.candidateReplacementOutputCount !== 6) {
        problems.push(
          `candidate replacement output count=${themeEvidence.candidateReplacementOutputCount}`,
        );
      }
      if (themeEvidence.uniqueReplacementOutputCount !== 6) {
        problems.push(`unique replacement output count=${themeEvidence.uniqueReplacementOutputCount}`);
      }
      if (themeEvidence.missingCandidateSources.length > 0) {
        problems.push(`missing source=${themeEvidence.missingCandidateSources.join(', ')}`);
      }
      if (themeEvidence.replacementOutputCollisions.length > 0) {
        problems.push(`collision=${themeEvidence.replacementOutputCollisions.join(', ')}`);
      }
      if (!themeEvidence.commentSourceAppliedToCommentToken) {
        problems.push(`comment token source=${themeEvidence.commentTokenSources.join(', ') || 'none'}`);
      }
      return problems.map((problem) => `${theme}: ${problem}`);
    });

    expect(
      failures,
      `Phase 0-A Shiki Source Inventory Gate failed:\n${failures.join('\n')}\nEvidence:\n${JSON.stringify(evidence, null, 2)}`,
    ).toEqual([]);
  });

  it('Phase 0-B: production Shiki mapping は採用candidateと完全一致する', async () => {
    expect(ROUAULT_SHIKI_THEMES).toEqual({
      light: 'github-light',
      dark: 'github-dark',
    });
    expect(ROUAULT_SHIKI_COLOR_REPLACEMENTS).toEqual(
      EXPECTED_CANDIDATE_SHIKI_COLOR_REPLACEMENTS,
    );

    for (const mapping of Object.values(ROUAULT_SHIKI_COLOR_REPLACEMENTS)) {
      expect(Object.keys(mapping).every((source) => source === source.toLowerCase())).toBe(true);
    }

    const candidateRenders = await Promise.all(
      SHIKI_SOURCE_INVENTORY_FIXTURES.map(async (fixture) =>
        codeToHast(fixture.source, {
          lang: fixture.lang,
          themes: ROUAULT_SHIKI_THEMES,
          colorReplacements: ROUAULT_SHIKI_COLOR_REPLACEMENTS,
          tabindex: false,
        }),
      ),
    );

    for (const theme of Object.keys(
      EXPECTED_CANDIDATE_SHIKI_COLOR_REPLACEMENTS,
    ) as CandidateThemeName[]) {
      const property = CANDIDATE_THEME_FOREGROUND_PROPERTIES[theme];
      const foregrounds = new Set(
        candidateRenders.flatMap((tree) =>
          tokenForegroundInventory(tree as unknown as HastNode, property),
        ),
      );
      for (const [source, replacement] of Object.entries(
        EXPECTED_CANDIDATE_SHIKI_COLOR_REPLACEMENTS[theme],
      )) {
        expect(foregrounds.has(source), `${theme} source ${source}`).toBe(false);
        expect(foregrounds.has(replacement), `${theme} replacement ${replacement}`).toBe(true);
      }
    }
  });

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

  it('rehype pipeline経由でも採用candidate全12色を同じpolicyで置換する', async () => {
    const tree: HastNode = {
      type: 'root',
      children: SHIKI_SOURCE_INVENTORY_FIXTURES.map((fixture) =>
        createCodeFence(`language-${fixture.lang}`, fixture.source),
      ),
    };

    await rehypeShikiCodeBlocks()(tree);

    for (const theme of Object.keys(
      EXPECTED_CANDIDATE_SHIKI_COLOR_REPLACEMENTS,
    ) as CandidateThemeName[]) {
      const foregrounds = new Set(
        tokenForegroundInventory(tree, CANDIDATE_THEME_FOREGROUND_PROPERTIES[theme]),
      );
      for (const [source, replacement] of Object.entries(
        EXPECTED_CANDIDATE_SHIKI_COLOR_REPLACEMENTS[theme],
      )) {
        expect(foregrounds.has(source), `${theme} pipeline source ${source}`).toBe(false);
        expect(foregrounds.has(replacement), `${theme} pipeline replacement ${replacement}`).toBe(
          true,
        );
      }
    }
  });

  it('standalone fenced code は Shiki の直下改行 text node を除去し、実ソースの空行とcopy sourceを維持する', async () => {
    const source = [
      'double x = 0.1 + 0.2;',
      'decimal y = 0.1m + 0.2m;',
      '',
      'Console.WriteLine(x); // 二進浮動小数点の丸めの影響を受ける',
      'Console.WriteLine(y); // 十進小数として扱われる',
    ].join('\n');
    const tree: HastNode = {
      type: 'root',
      children: [createCodeFence('language-csharp', source)],
    };

    await rehypeShikiCodeBlocks()(tree);

    const root = tree.children?.[0];
    const pre = findPreElement(root ?? tree);
    const code = pre?.children?.find((child) => child.tagName === 'code');
    expect(pre?.properties?.['data-code-block']).toBe(true);
    expect(code?.properties?.['data-lang']).toBe('csharp');
    expect(getDirectNewlineOnlyTextNodes(code)).toHaveLength(0);

    const lines = getDirectLineElements(code);
    expect(lines).toHaveLength(5);
    expect(readTextContent(lines[2])).toBe('');

    const copySource = root?.children?.find(
      (child) =>
        child.tagName === 'template' && child.properties?.['data-code-copy-source'] === 'true',
    );
    expect(readTextContent(copySource)).toBe(source);
  });

  it('group-key 付き fenced code でも code 直下の Shiki 改行 text node を除去する', async () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        createCodeFence('language-ts', 'const a = 1;\nconst b = 2;', {
          'group-key': 'demo',
          'tab-label': 'TypeScript',
        }),
      ],
    };

    await rehypeShikiCodeBlocks()(tree);

    const pre = tree.children?.[0];
    expect(pre?.tagName).toBe('pre');
    expect(pre?.properties?.['data-code-block']).toBe(true);

    const code = pre?.children?.find((child) => child.tagName === 'code');
    expect(getDirectNewlineOnlyTextNodes(code)).toHaveLength(0);
    expect(getDirectLineElements(code)).toHaveLength(2);
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
