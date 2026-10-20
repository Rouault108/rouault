import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();

const extractDocumentedPluginOrder = (section: string): string[] => {
  const pluginOrderLinePattern = /^\d+\.\s+`([^`]+)`$/u;

  return section
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => pluginOrderLinePattern.test(line))
    .map((line) => {
      const matched = pluginOrderLinePattern.exec(line);
      const pluginName = matched?.[1];

      if (pluginName === undefined) {
        throw new Error(`Invalid plugin order line: ${line}`);
      }

      return pluginName;
    });
};

describe('markdown plugin order', () => {
  it('コンパイラのplugin順序が文書と一致すること', () => {
    const source = readFileSync(
      path.resolve(projectRoot, 'build/content/content-compiler.ts'),
      'utf8',
    );
    const doc = readFileSync(path.resolve(projectRoot, 'docs/contracts/markdown.md'), 'utf8');
    const section = doc.split('### Build-time')[1]?.split('### SSR')[0] ?? '';
    const documented = extractDocumentedPluginOrder(section);
    const actual = [...source.matchAll(/\.use\((\w+)/gu)].map((match) => match[1]);
    expect(actual).toEqual(['remarkParse', ...documented]);
  });

  it('Markdown Contract の plugin 順序記述が契約上の順序と一致すること', () => {
    const source = readFileSync(path.resolve(projectRoot, 'docs/contracts/markdown.md'), 'utf8');

    const section = source.split('### Build-time')[1]?.split('### SSR')[0]?.trim();

    if (section === undefined) {
      throw new Error('Markdown Contract の Build-time section が見つかりません');
    }

    expect(section).toContain('build/content/content-compiler.ts');
    expect(section).toContain('Markdown transform pipeline');
    expect(section).toContain('rehypeResolveNoteSourceLinks');
    expect(extractDocumentedPluginOrder(section)).toEqual([
      'remarkMath',
      'remarkGfm',
      'remarkExpandExampleIncludes',
      'remarkRemovePureComments',
      'remarkDisallowRawHtml',
      'remarkRouaultDirectives',
      'remarkCollectSourceLinks',
      'remarkLinkCards',
      'remarkRehype',
      'rehypeCodeMeta',
      'rehypeRaw',
      'rehypeKatex',
      'rehypeRouaultComponents',
      'rehypeHeadingIds',
      'rehypePreviewSandbox',
      'rehypeShikiCodeBlocks',
      'rehypeStaticCodeGroups',
      'rehypeResolveNoteSourceLinks',
      'rehypeAnnotateLinkKinds',
      'rehypeInlineCodeTranslateNo',
      'rehypeOrderedListContracts',
      'rehypeDisallowDangerousProps',
    ]);
  });
});
