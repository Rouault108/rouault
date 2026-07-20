import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { toHtml } from 'hast-util-to-html';
import { describe, expect, it } from 'vitest';
import { codeToHast, codeToTokensWithThemes, type ThemedTokenWithVariants } from 'shiki';

import { rehypeShikiCodeBlocks } from '../../build/rehype/shiki-code-blocks.js';
import { normalizeCodeLineStates } from '../../build/rehype/code-line-state.js';
import { ROUAULT_SHIKI_THEMES } from '../../build/rehype/shiki-themes.js';
import {
  type PaletteSlot,
  ROUAULT_SYNTAX_PALETTES,
  ROUAULT_SYNTAX_PALETTE_SLOTS,
  ROUAULT_SYNTAX_RULES,
  ROUAULT_SYNTAX_THEME_BACKGROUNDS,
  ROUAULT_SYNTAX_THEME_NAMES,
  validateRouaultSyntaxThemeDefinition,
} from '../../build/rehype/shiki-theme-definition.js';

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
      child.type === 'text' && typeof child.value === 'string' && /^\n+$/u.test(child.value),
  );

const readTextContent = (node: HastNode | undefined): string => {
  if (!node) {
    return '';
  }

  if (node.type === 'text') {
    return typeof node.value === 'string' ? node.value : '';
  }

  const children = node.tagName === 'template' ? node.content?.children : node.children;
  return (children ?? []).map((child) => readTextContent(child)).join('');
};

const sha256 = (value: string): string => createHash('sha256').update(value, 'utf8').digest('hex');

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

  return [
    ...ownMatches,
    ...(node.children ?? []).flatMap((child) => collectStyledTokenSpans(child)),
  ];
};

interface TokenExpectation {
  readonly fragment: string;
  readonly occurrence?: number;
  readonly offsetWithinFragment?: number;
  readonly slot: PaletteSlot;
}

interface CanonicalFixture {
  readonly language: string;
  readonly lang: 'tsx' | 'c' | 'json' | 'shellscript' | 'csharp';
  readonly source: string;
  readonly expectations: readonly TokenExpectation[];
}

const CANONICAL_FIXTURES = [
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
    expectations: [
      { fragment: '// rouault inventory comment', slot: 'subdued' },
      ...['export', 'async', 'function', 'const', 'return', 'throw', 'as'].map((fragment) => ({
        fragment,
        slot: 'red' as const,
      })),
      { fragment: 'readNote', slot: 'blue' },
      { fragment: 'fetch', slot: 'blue' },
      { fragment: 'text', slot: 'blue' },
      { fragment: 'string', slot: 'purple' },
      { fragment: 'URL', slot: 'purple' },
      { fragment: 'Promise', slot: 'purple' },
      { fragment: '<T', offsetWithinFragment: 1, slot: 'purple' },
      { fragment: 'Error', slot: 'blue' },
      { fragment: "'GET'", offsetWithinFragment: 1, slot: 'green' },
      { fragment: '"failed"', offsetWithinFragment: 1, slot: 'green' },
      { fragment: '"note"', offsetWithinFragment: 1, slot: 'green' },
      { fragment: 'new', slot: 'base' },
      { fragment: 'path', slot: 'base' },
      { fragment: 'response', slot: 'base' },
      { fragment: '(', slot: 'base' },
      { fragment: '=', slot: 'base' },
    ],
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
    expectations: [
      { fragment: '// rouault inventory comment', slot: 'subdued' },
      { fragment: 'int', slot: 'purple' },
      { fragment: 'char', slot: 'purple' },
      { fragment: 'main', slot: 'blue' },
      { fragment: 'printf', slot: 'blue' },
      { fragment: '"note"', offsetWithinFragment: 1, slot: 'green' },
      { fragment: '"%s\\n"', slot: 'green' },
      { fragment: '0', slot: 'amber' },
      { fragment: '1', slot: 'amber' },
      { fragment: '%s', slot: 'amber' },
      { fragment: '\\n', slot: 'amber' },
      ...['argc', 'argv', 'message'].map((fragment) => ({ fragment, slot: 'base' as const })),
      { fragment: '(', slot: 'base' },
      { fragment: '>', occurrence: 2, slot: 'base' },
    ],
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
    expectations: [
      ...['"name"', '"enabled"', '"count"', '"fallback"'].map((fragment) => ({
        fragment,
        offsetWithinFragment: 1,
        slot: 'blue' as const,
      })),
      { fragment: '"rouault"', offsetWithinFragment: 1, slot: 'green' },
      { fragment: 'true', slot: 'amber' },
      { fragment: 'null', slot: 'amber' },
      { fragment: '3', slot: 'amber' },
      { fragment: '{', slot: 'base' },
      { fragment: ',', slot: 'base' },
      { fragment: ':', slot: 'base' },
    ],
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
      '  printf \'%s\\n\' "$name"',
      'fi',
    ].join('\n'),
    expectations: [
      { fragment: '#!/usr/bin/env bash', slot: 'subdued' },
      { fragment: '# rouault inventory comment', slot: 'subdued' },
      ...['if', 'then', 'fi'].map((fragment) => ({ fragment, slot: 'red' as const })),
      { fragment: 'set', slot: 'blue' },
      { fragment: 'printf', slot: 'blue' },
      { fragment: '-euo', slot: 'amber' },
      { fragment: 'note', slot: 'green' },
      { fragment: '%s', slot: 'green' },
      { fragment: '=', slot: 'base' },
      { fragment: ':-', slot: 'base' },
      { fragment: '[[', slot: 'base' },
    ],
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
    expectations: [
      { fragment: '// rouault inventory comment', slot: 'subdued' },
      ...['namespace', 'public', 'interface', 'sealed', 'class'].map((fragment) => ({
        fragment,
        slot: 'red' as const,
      })),
      ...['Quiet', 'Space', 'Reader', 'NoteReader', 'string'].map((fragment) => ({
        fragment,
        slot: 'purple' as const,
      })),
      { fragment: 'Read()', slot: 'blue' },
      { fragment: '"note"', offsetWithinFragment: 1, slot: 'green' },
      { fragment: '<T', offsetWithinFragment: 1, slot: 'purple' },
      { fragment: '{', slot: 'base' },
      { fragment: '=>', slot: 'base' },
    ],
  },
] as const satisfies readonly CanonicalFixture[];

const THEMES = ['light', 'dark'] as const;
type ThemeKey = (typeof THEMES)[number];

const foregroundToSlot = (theme: ThemeKey, foreground: string | undefined): PaletteSlot | null => {
  if (!foreground) {
    return null;
  }
  const normalized = foreground.toLowerCase();
  const match = Object.entries(ROUAULT_SYNTAX_PALETTES[theme]).find(
    ([, value]) => value === normalized,
  );
  return (match?.[0] as PaletteSlot | undefined) ?? null;
};

const offsetForExpectation = (source: string, expectation: TokenExpectation): number => {
  let offset = -1;
  let searchFrom = 0;
  const occurrence = expectation.occurrence ?? 1;
  for (let index = 0; index < occurrence; index += 1) {
    offset = source.indexOf(expectation.fragment, searchFrom);
    if (offset < 0) {
      throw new Error(
        `Canonical fixture fragment is missing: ${JSON.stringify(expectation.fragment)} occurrence ${occurrence.toString()}`,
      );
    }
    searchFrom = offset + expectation.fragment.length;
  }
  return offset + (expectation.offsetWithinFragment ?? 0);
};

const tokenAtOffset = (
  tokens: readonly ThemedTokenWithVariants[],
  offset: number,
): ThemedTokenWithVariants | undefined =>
  tokens.find((token) => token.offset <= offset && offset < token.offset + token.content.length);

const flattenTokens = (
  lines: readonly (readonly ThemedTokenWithVariants[])[],
): ThemedTokenWithVariants[] => lines.flatMap((line) => [...line]);

const tokenScopeStack = (token: ThemedTokenWithVariants | undefined): string[] =>
  token?.explanation?.flatMap((explanation) =>
    explanation.scopes.map((scope) => scope.scopeName),
  ) ?? [];

const renderCanonicalTokens = async (
  fixture: CanonicalFixture,
): Promise<ThemedTokenWithVariants[]> =>
  flattenTokens(
    await codeToTokensWithThemes(fixture.source, {
      lang: fixture.lang,
      themes: ROUAULT_SHIKI_THEMES,
      includeExplanation: 'scopeName',
    }),
  );

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

const tokenForegrounds = (node: HastNode, property: 'color' | '--shiki-dark'): Set<string> => {
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
  it('Rouault custom theme definition はclosed paletteとordered scope contractを満たす', () => {
    expect(validateRouaultSyntaxThemeDefinition()).toEqual([]);
    expect(Object.keys(ROUAULT_SYNTAX_PALETTES)).toEqual(['light', 'dark']);
    expect(Object.keys(ROUAULT_SYNTAX_PALETTES.light)).toEqual(ROUAULT_SYNTAX_PALETTE_SLOTS);
    expect(Object.keys(ROUAULT_SYNTAX_PALETTES.dark)).toEqual(ROUAULT_SYNTAX_PALETTE_SLOTS);
    expect(ROUAULT_SYNTAX_RULES.map((rule) => rule.order)).toEqual([
      10, 20, 30, 40, 50, 60, 70, 80,
    ]);
    expect(ROUAULT_SYNTAX_RULES.map((rule) => rule.id)).toEqual([
      'comment-subdued',
      'string-green',
      'constant-amber',
      'keyword-red',
      'callable-blue',
      'property-blue',
      'type-purple',
      'operator-base',
    ]);
    expect(ROUAULT_SYNTAX_RULES.flatMap((rule) => rule.scopes)).not.toContain('meta.function-call');
    expect(
      ROUAULT_SYNTAX_RULES.every(
        (rule) => Object.keys(rule).sort().join(',') === 'id,order,scopes,slot',
      ),
    ).toBe(true);
  });

  it('compiled themes はcanonical name、foreground、fallback backgroundだけを所有する', () => {
    for (const theme of THEMES) {
      const compiled = ROUAULT_SHIKI_THEMES[theme];
      expect(compiled.name).toBe(ROUAULT_SYNTAX_THEME_NAMES[theme]);
      expect(compiled.type).toBe(theme);
      expect(compiled.fg).toBe(ROUAULT_SYNTAX_PALETTES[theme].base);
      expect(compiled.bg).toBe(ROUAULT_SYNTAX_THEME_BACKGROUNDS[theme]);
      expect(compiled.settings).toHaveLength(ROUAULT_SYNTAX_RULES.length);
      expect(
        compiled.settings.map((setting) => setting.settings.foreground?.toLowerCase()),
      ).toEqual(ROUAULT_SYNTAX_RULES.map((rule) => ROUAULT_SYNTAX_PALETTES[theme][rule.slot]));
      expect(
        compiled.settings.every(
          (setting) =>
            setting.settings.fontStyle === undefined &&
            !('fontWeight' in setting.settings) &&
            !('textDecoration' in setting.settings),
        ),
      ).toBe(true);
    }
  });

  it('canonical 5言語のsource offsetは期待palette slotへ解決する', async () => {
    const failures: string[] = [];
    const usedSlots = {
      light: new Set<PaletteSlot>(),
      dark: new Set<PaletteSlot>(),
    };

    for (const fixture of CANONICAL_FIXTURES) {
      const tokens = await renderCanonicalTokens(fixture);
      for (const token of tokens) {
        for (const theme of THEMES) {
          const slot = foregroundToSlot(theme, token.variants[theme]?.color);
          if (slot) usedSlots[theme].add(slot);
        }
      }

      for (const expectation of fixture.expectations) {
        const offset = offsetForExpectation(fixture.source, expectation);
        const token = tokenAtOffset(tokens, offset);
        for (const theme of THEMES) {
          const color = token?.variants[theme]?.color?.toLowerCase();
          const resolvedSlot = foregroundToSlot(theme, color);
          if (resolvedSlot !== expectation.slot) {
            failures.push(
              [
                fixture.language,
                JSON.stringify(expectation.fragment),
                `offset=${offset.toString()}`,
                `theme=${theme}`,
                `scopes=${tokenScopeStack(token).join(' > ') || 'none'}`,
                `resolved=${resolvedSlot ?? 'outside-palette'}`,
                `color=${color ?? 'none'}`,
                `expected=${expectation.slot}`,
              ].join(' | '),
            );
          }
        }
      }
    }

    expect(failures, failures.join('\n')).toEqual([]);
    for (const theme of THEMES) {
      expect([...usedSlots[theme]].sort(), `${theme} required slot coverage`).toEqual(
        [...ROUAULT_SYNTAX_PALETTE_SLOTS].sort(),
      );
    }
  });

  it('dual HAST outputはclosed paletteとcustom theme classだけを使用する', async () => {
    const trees = await Promise.all(
      CANONICAL_FIXTURES.map(async (fixture) =>
        codeToHast(fixture.source, {
          lang: fixture.lang,
          themes: ROUAULT_SHIKI_THEMES,
          tabindex: false,
        }),
      ),
    );

    for (const tree of trees as unknown as HastNode[]) {
      const pre = findPreElement(tree);
      expect(readNodeClassList(pre)).toEqual(
        expect.arrayContaining([
          'shiki',
          'shiki-themes',
          ROUAULT_SYNTAX_THEME_NAMES.light,
          ROUAULT_SYNTAX_THEME_NAMES.dark,
        ]),
      );
      const preDeclarations = parseStyleDeclarations(String(pre?.properties?.['style']));
      expect(preDeclarations.get('color')?.toLowerCase()).toBe(ROUAULT_SYNTAX_PALETTES.light.base);
      expect(preDeclarations.get('--shiki-dark')?.toLowerCase()).toBe(
        ROUAULT_SYNTAX_PALETTES.dark.base,
      );
      expect(preDeclarations.get('background-color')?.toLowerCase()).toBe(
        ROUAULT_SYNTAX_THEME_BACKGROUNDS.light,
      );
      expect(preDeclarations.get('--shiki-dark-bg')?.toLowerCase()).toBe(
        ROUAULT_SYNTAX_THEME_BACKGROUNDS.dark,
      );

      for (const span of collectStyledTokenSpans(tree)) {
        const declarations = parseStyleDeclarations(String(span.properties?.['style']));
        expect(foregroundToSlot('light', declarations.get('color'))).not.toBeNull();
        expect(foregroundToSlot('dark', declarations.get('--shiki-dark'))).not.toBeNull();
        expect(declarations.has('font-style')).toBe(false);
        expect(declarations.has('font-weight')).toBe(false);
        expect(declarations.has('text-decoration')).toBe(false);
      }
    }
  });

  it('production pipelineとfinal CSSはcustom dual foregroundとtransparent background ownerを維持する', async () => {
    const tree: HastNode = {
      type: 'root',
      children: [createCodeFence('language-csharp', SHIKI_THEME_POLICY_FIXTURE_SOURCE)],
    };

    await rehypeShikiCodeBlocks()(tree);
    const pre = findPreElement(tree);
    expect(pre?.properties?.['data-code-language']).toBe('csharp');
    expect(readNodeClassList(pre)).toEqual(
      expect.arrayContaining([ROUAULT_SYNTAX_THEME_NAMES.light, ROUAULT_SYNTAX_THEME_NAMES.dark]),
    );
    expect(tokenForegrounds(tree, 'color').size).toBeGreaterThan(0);

    const css = readFileSync(resolve(process.cwd(), 'src/assets/css/code-surfaces.css'), 'utf8');
    expect(css).toMatch(
      /:where\(pre\[data-code-block\][\s\S]*?background:\s*transparent\s*!important;/u,
    );
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
            'show-line-numbers': '',
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
    expect(copySource?.children).toEqual([]);
    expect(copySource?.content?.type).toBe('root');
    expect(copySource?.content?.children?.[0]?.value).toBe(
      'const highlighted = 1; // [!code highlight]\nconst added = 2; // [!code ++]',
    );
    const copySourceHtml = toHtml(copySource as unknown as Parameters<typeof toHtml>[0]);
    expect(copySourceHtml).toContain(
      '>const highlighted = 1; // [!code highlight]\nconst added = 2; // [!code ++]</template>',
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
    expect(pre?.properties?.['data-code-language']).toBe('typescript');
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
    expect(code?.properties?.['data-lang']).toBe('typescript');
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

  it('全lineを単一stateへ正規化し、stateを持つblockだけをopt-inする', async () => {
    const stateSource = [
      "const normal = 'normal';",
      "const highlighted = 'highlight'; // [!code highlight]",
      "const added = 'add'; // [!code ++]",
      "const removed = 'remove'; // [!code --]",
    ].join('\n');
    const stateTree: HastNode = {
      type: 'root',
      children: [createCodeFence('language-ts', stateSource, { 'highlight-lines': '2' })],
    };
    const normalTree: HastNode = {
      type: 'root',
      children: [createCodeFence('language-ts', "const normal = 'normal';")],
    };

    await rehypeShikiCodeBlocks()(stateTree, { path: 'content/state-fixture.md' });
    await rehypeShikiCodeBlocks()(normalTree, { path: 'content/normal-fixture.md' });

    const statePre = findPreElement(stateTree);
    const stateCode = statePre?.children?.find((child) => child.tagName === 'code');
    expect(
      getLineElements(stateCode).map((line) => line.properties?.['data-code-line-state']),
    ).toEqual(['normal', 'highlight', 'add', 'remove']);
    expect(statePre?.properties?.['data-code-has-line-state']).toBe('true');
    expect(statePre?.properties?.['data-code-block-identifier']).toBeUndefined();

    const stateLines = getLineElements(stateCode);
    const semanticMatrix = [
      { state: 'normal', label: undefined, wrapper: undefined },
      { state: 'highlight', label: '強調行', wrapper: 'mark' },
      { state: 'add', label: '追加行', wrapper: 'ins' },
      { state: 'remove', label: '削除行', wrapper: 'del' },
    ] as const;
    for (const [index, expected] of semanticMatrix.entries()) {
      const line = stateLines[index];
      expect(line?.properties?.['data-code-line-state']).toBe(expected.state);
      expect(line?.properties?.['role']).toBe(expected.state === 'normal' ? undefined : 'group');
      expect(line?.properties?.['aria-label']).toBe(expected.label);

      const elementChildren = getElementChildren(line);
      const semanticWrappers = elementChildren.filter((child) =>
        ['mark', 'ins', 'del'].includes(child.tagName ?? ''),
      );
      if (expected.wrapper === undefined) {
        expect(semanticWrappers).toHaveLength(0);
      } else {
        expect(semanticWrappers).toHaveLength(1);
        expect(semanticWrappers[0]?.tagName).toBe(expected.wrapper);
        expect(
          getElementChildren(semanticWrappers[0]).filter((child) =>
            ['mark', 'ins', 'del'].includes(child.tagName ?? ''),
          ),
        ).toHaveLength(0);
      }
      expect(readTextContent(line)).not.toContain('強調行');
      expect(readTextContent(line)).not.toContain('追加行');
      expect(readTextContent(line)).not.toContain('削除行');
    }

    const stateRoot = stateTree.children?.[0];
    const copySource = stateRoot?.children?.find(
      (child) =>
        child.tagName === 'template' && child.properties?.['data-code-copy-source'] === 'true',
    );
    expect(copySource).toBeDefined();
    expect(findDescendant(statePre, (node) => node === copySource)).toBeUndefined();
    expect(readTextContent(copySource).length).toBe(stateSource.length);
    expect(sha256(readTextContent(copySource))).toBe(sha256(stateSource));

    const normalPre = findPreElement(normalTree);
    const normalCode = normalPre?.children?.find((child) => child.tagName === 'code');
    expect(
      getLineElements(normalCode).map((line) => line.properties?.['data-code-line-state']),
    ).toEqual(['normal']);
    expect(normalPre?.properties?.['data-code-has-line-state']).toBeUndefined();
  });

  it('semantic applicationはtoken subtreeを保ち、再実行でもwrapperを重複・積層しない', () => {
    const tokenChildren: HastNode[] = [
      { type: 'text', value: 'const ' },
      {
        type: 'element',
        tagName: 'span',
        properties: {
          className: ['token', 'identifier'],
          style: 'color: #2a2e33; --shiki-dark: #d9dfe5',
        },
        children: [{ type: 'text', value: 'value' }],
      },
      { type: 'text', value: ' = 1;' },
    ];
    const tokenSourceRoot: HastNode = { type: 'root', children: tokenChildren };
    const createLine = (className: string[]): HastNode => ({
      type: 'element',
      tagName: 'span',
      properties: { className },
      children: structuredClone(tokenChildren),
    });
    const lines = [
      createLine(['line']),
      createLine(['line', 'highlighted']),
      createLine(['line', 'diff', 'add']),
      createLine(['line', 'diff', 'remove']),
    ];
    const originalDigests = lines.map((line) => sha256(JSON.stringify(line.children)));
    const code: HastNode = { type: 'element', tagName: 'code', children: lines };
    const pre: HastNode = { type: 'element', tagName: 'pre', properties: {} };
    const context = {
      blockIdentifier: 'code-block:1' as const,
      language: 'typescript',
      notePath: 'content/semantic-fixture.md',
    };

    normalizeCodeLineStates(code, pre, context);
    const firstSignature = sha256(JSON.stringify(code));
    normalizeCodeLineStates(code, pre, context);
    const secondSignature = sha256(JSON.stringify(code));

    expect(secondSignature).toBe(firstSignature);
    expect(pre.properties?.['data-code-has-line-state']).toBe('true');
    expect(lines[0]?.children).toHaveLength(3);
    for (const [index, line] of lines.entries()) {
      const contentOwner = index === 0 ? line : line.children?.[0];
      expect(sha256(JSON.stringify(contentOwner?.children))).toBe(originalDigests[index]);
      expect(readTextContent(line).length).toBe(readTextContent(tokenSourceRoot).length);
      expect(sha256(readTextContent(line))).toBe(sha256(readTextContent(tokenSourceRoot)));
      expect(line.properties?.['data-code-block-identifier']).toBeUndefined();
    }

    const addLine = lines[2];
    const addWrapper = addLine?.children?.[0];
    expect(addWrapper?.tagName).toBe('ins');
    expect(getElementChildren(addWrapper)).toHaveLength(1);
    expect(getElementChildren(addWrapper)[0]?.tagName).toBe('span');
  });

  it('既存の異種semantic wrapperを正しい単一wrapperへ置換する', () => {
    const line: HastNode = {
      type: 'element',
      tagName: 'span',
      properties: { className: ['line', 'diff', 'add'] },
      children: [
        {
          type: 'element',
          tagName: 'mark',
          children: [{ type: 'text', value: 'value' }],
        },
      ],
    };
    const code: HastNode = { type: 'element', tagName: 'code', children: [line] };
    const pre: HastNode = { type: 'element', tagName: 'pre', properties: {} };

    normalizeCodeLineStates(code, pre, {
      blockIdentifier: 'code-block:1',
      language: 'typescript',
      notePath: 'content/semantic-fixture.md',
    });

    expect(line.children).toHaveLength(1);
    expect(line.children?.[0]?.tagName).toBe('ins');
    expect(line.children?.[0]?.children).toHaveLength(1);
    expect(line.children?.[0]?.children?.[0]?.type).toBe('text');
    expect(
      getElementChildren(line.children?.[0]).filter((child) =>
        ['mark', 'ins', 'del'].includes(child.tagName ?? ''),
      ),
    ).toHaveLength(0);
  });

  it('異種state originをsource orderのblock identifier付きbuild errorにする', async () => {
    const sentinel = 'ROUAULT_PRIVATE_CONFLICT_SENTINEL_7F31';
    const createConflictTree = (
      firstHasFilename: boolean,
      notation: '[!code ++]' | '[!code --]',
    ): HastNode => ({
      type: 'root',
      children: [
        createCodeFence('language-ts', 'const first = 1;', {
          ...(firstHasFilename ? { filename: 'first.ts' } : {}),
        }),
        createCodeFence('language-ts', `${sentinel}; // ${notation}`, {
          filename: 'conflict.ts',
          'highlight-lines': '1',
        }),
      ],
    });

    for (const conflict of [
      { notation: '[!code ++]' as const, states: 'add, highlight', origin: 'diff add' },
      { notation: '[!code --]' as const, states: 'highlight, remove', origin: 'diff remove' },
    ]) {
      for (const firstHasFilename of [false, true]) {
        let errorMessage = '';
        try {
          await rehypeShikiCodeBlocks()(createConflictTree(firstHasFilename, conflict.notation), {
            path: 'content/conflict-fixture.md',
          });
        } catch (error) {
          errorMessage = error instanceof Error ? error.message : String(error);
        }

        expect(errorMessage).toContain('note path: content/conflict-fixture.md');
        expect(errorMessage).toContain('block: code-block:2');
        expect(errorMessage).toContain('filename: conflict.ts');
        expect(errorMessage).toContain('language: typescript');
        expect(errorMessage).toContain('code line: 1');
        expect(errorMessage).toContain(`states: ${conflict.states}`);
        expect(errorMessage).toContain(`origins: ${conflict.origin}, highlight-lines`);
        expect(errorMessage).not.toContain(sentinel);
      }
    }
  });

  it('filenameとfile.pathがないconflictでもordinalとprivacy contractを維持する', async () => {
    const sentinel = 'ROUAULT_PRIVATE_CONFLICT_SENTINEL_7F31';
    const tree: HastNode = {
      type: 'root',
      children: [
        createCodeFence('language-ts', 'const first = 1;', {
          filename: 'first.ts',
        }),
        createCodeFence('language-ts', `${sentinel}; // [!code ++]`, {
          'highlight-lines': '1',
        }),
      ],
    };

    let errorMessage = '';
    try {
      await rehypeShikiCodeBlocks()(tree);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    }

    expect(errorMessage).toContain('note path: <unknown>');
    expect(errorMessage).toContain('block: code-block:2');
    expect(errorMessage).not.toContain('filename:');
    expect(errorMessage).toContain('language: typescript');
    expect(errorMessage).toContain('code line: 1');
    expect(errorMessage).toContain('states: add, highlight');
    expect(errorMessage).toContain('origins: diff add, highlight-lines');
    expect(errorMessage).not.toContain(sentinel);
    expect(errorMessage).not.toContain(`${sentinel}; // [!code ++]`);
  });

  it('addとremoveの複合classもsilent precedenceせずrejectする', () => {
    const line: HastNode = {
      type: 'element',
      tagName: 'span',
      properties: { className: ['line', 'diff', 'add', 'remove'] },
      children: [{ type: 'text', value: 'private source must not be reported' }],
    };
    const code: HastNode = { type: 'element', tagName: 'code', children: [line] };
    const pre: HastNode = { type: 'element', tagName: 'pre', properties: {} };

    expect(() =>
      normalizeCodeLineStates(code, pre, {
        blockIdentifier: 'code-block:1',
        language: 'typescript',
        notePath: 'content/conflict-fixture.md',
      }),
    ).toThrow(/states: add, remove; origins: diff add, diff remove/u);
  });

  it('rehype pipeline経由でも5言語のforegroundをclosed paletteへ閉じる', async () => {
    const tree: HastNode = {
      type: 'root',
      children: CANONICAL_FIXTURES.map((fixture) =>
        createCodeFence(`language-${fixture.lang}`, fixture.source),
      ),
    };

    await rehypeShikiCodeBlocks()(tree);

    for (const span of collectStyledTokenSpans(tree)) {
      const declarations = parseStyleDeclarations(String(span.properties?.['style']));
      for (const theme of THEMES) {
        const property = theme === 'light' ? 'color' : '--shiki-dark';
        expect(
          foregroundToSlot(theme, declarations.get(property)),
          `${theme} pipeline foreground`,
        ).not.toBeNull();
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
    expect(copySource?.children).toEqual([]);
    expect(copySource?.content?.type).toBe('root');
    expect(copySource?.content?.children?.[0]?.value).toBe('plain text block');
    expect(toHtml(copySource as unknown as Parameters<typeof toHtml>[0])).toContain(
      '>plain text block</template>',
    );
  });
});
