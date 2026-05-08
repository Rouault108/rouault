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
          "rehypeAnnotateLinkKinds()",
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

  it('Markdown Contract の plugin 順序記述が snapshot と一致すること', () => {
    const source = readFileSync(path.resolve(projectRoot, 'docs/contracts/markdown.md'), 'utf8');

    const section = source.split('### Build-time')[1]?.split('### SSR')[0]?.trim();

    expect(section).toMatchInlineSnapshot(`
      "- 実装上の source of truth は \`velite.config.ts\` におけるプラグイン順序である。
      - Markdown transform pipeline は次の順序で成立する。
        1. \`remarkMath\`
        2. \`remarkGfm\`
        3. \`remarkExpandExampleIncludes\`
        4. \`remarkDisallowRawHtml\`
        5. \`remarkRouaultDirectives\`
        6. \`remarkLinkCards\`
        7. \`remark-rehype\`
        8. \`rehypeKatex\`
        9. \`rehypeRouaultComponents\`
        10. \`rehypeHeadingIds\`
        11. \`rehypePreviewSandbox\`
        12. \`rehypeShikiCodeBlocks\`
        13. \`rehypeStaticCodeGroups\`
        14. \`rehypeResolveNoteSourceLinks\`
        15. \`rehypeAnnotateLinkKinds\`
        16. \`rehypeInlineCodeTranslateNo\`
        17. \`rehypeOrderedListContracts\`
        18. \`rehypeDisallowDangerousProps\`
      - Parser / transformer / adapter が Markdown を最終 DOM へ正規化する。
      - authoring grammar に関わる意味論変更は、remark 層の正本と実装順序の双方を整合させる。
      - 出力 DOM に関わる意味論変更は、rehype 層の正本と実装順序の双方を整合させる。
      - Markdown本文内の相対 \`.md\` ノートリンクは \`rehypeResolveNoteSourceLinks\` で note page navigation URL へ解決してから、本文リンクの種別注釈を rehype 層で確定する。詳細な出力属性契約は \`docs/references/markdown-output.md\` を参照する。
      - 安全規約は後段検査へ押し込むだけでなく、可能なものは前段で早期拒否してよい。
      - 実装順序の変更は意味論変更を伴いうるため、単なるリファクタリングとして扱ってはならない。"
    `);
  });
});
