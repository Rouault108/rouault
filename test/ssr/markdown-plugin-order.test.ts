import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();

const extractPluginOrder = (source: string, key: 'remarkPlugins' | 'rehypePlugins'): string[] => {
  const pattern = new RegExp(`${key}: \\[(.*?)\\n\\s*\\],`, 'su');
  const matched = pattern.exec(source);
  if (!matched?.[1]) {
    return [];
  }

  return matched[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/,$/u, ''));
};

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
  it('velite.config.ts の plugin 順序が snapshot と一致すること', () => {
    const source = readFileSync(path.resolve(projectRoot, 'velite.config.ts'), 'utf8');

    expect({
      remark: extractPluginOrder(source, 'remarkPlugins'),
      rehype: extractPluginOrder(source, 'rehypePlugins'),
    }).toMatchInlineSnapshot(`
      {
        "rehype": [
          "rehypeKatex",
          "rehypeRouaultComponents",
          "rehypeHeadingIds",
          "rehypePreviewSandbox",
          "rehypeShikiCodeBlocks",
          "rehypeStaticCodeGroups",
          "rehypeResolveNoteSourceLinks",
          "rehypeAnnotateLinkKinds(resolveBuildLinkAnnotationOptions())",
          "rehypeInlineCodeTranslateNo",
          "rehypeOrderedListContracts",
          "rehypeDisallowDangerousProps",
        ],
        "remark": [
          "remarkMath",
          "[remarkGfm, { singleTilde: false }]",
          "remarkExpandExampleIncludes",
          "remarkDisallowRawHtml",
          "remarkRouaultDirectives",
          "remarkLinkCards",
        ],
      }
    `);
  });

  it('Markdown Contract の plugin 順序記述が契約上の順序と一致すること', () => {
    const source = readFileSync(path.resolve(projectRoot, 'docs/contracts/markdown.md'), 'utf8');

    const section = source.split('### Build-time')[1]?.split('### SSR')[0]?.trim();

    if (section === undefined) {
      throw new Error('Markdown Contract の Build-time section が見つかりません');
    }

    expect(section).toContain('velite.config.ts');
    expect(section).toContain('Markdown transform pipeline');
    expect(section).toContain('rehypeResolveNoteSourceLinks');
    expect(extractDocumentedPluginOrder(section)).toEqual([
      'remarkMath',
      'remarkGfm',
      'remarkExpandExampleIncludes',
      'remarkDisallowRawHtml',
      'remarkRouaultDirectives',
      'remarkLinkCards',
      'remark-rehype',
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
