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
          "rehypeHeadingIds",
          "rehypePreviewSandbox",
          "rehypeShikiCodeBlocks",
          "rehypeStaticCodeGroups",
          "rehypeRouaultComponents",
          "rehypeAnnotateLinkKinds()",
          "rehypeInlineCodeTranslateNo",
          "rehypeOrderedListContracts",
          "rehypeDisallowDangerousProps",
          "rehypeDisallowStaticMark",
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

  it('overview 文書の plugin 順序記述が snapshot と一致すること', () => {
    const source = readFileSync(
      path.resolve(projectRoot, 'docs/markdown/markdown-overview.md'),
      'utf8',
    );

    const section = source
      .split('## 5. 実装上の Source of Truth')[1]
      ?.split('## 6. 文書群と ownership')[0]
      ?.trim();

    expect(section).toMatchInlineSnapshot(`
      "実装上の SoT は、\`velite.config.ts\` におけるプラグイン順序です。

      1. \`remarkMath\`
      2. \`remarkGfm\`
      3. \`remarkExpandExampleIncludes\`
      4. \`remarkDisallowRawHtml\`
      5. \`remarkRouaultDirectives\`
      6. \`remarkLinkCards\`
      7. \`remark-rehype\`
      8. \`rehypeKatex\`
      9. \`rehypeHeadingIds\`
      10. \`rehypePreviewSandbox\`
      11. \`rehypeShikiCodeBlocks\`
      12. \`rehypeStaticCodeGroups\`
      13. \`rehypeRouaultComponents\`
      14. \`rehypeAnnotateLinkKinds\`
      15. \`rehypeInlineCodeTranslateNo\`
      16. \`rehypeOrderedListContracts\`
      17. \`rehypeDisallowDangerousProps\`

      規則:

      - authoring grammar に関わる意味論変更は、remark 層の正本と実装順序の双方を整合させなければなりません。
      - 出力 DOM に関わる意味論変更は、rehype 層の正本と実装順序の双方を整合させなければなりません。
      - 本文リンクの種別注釈は rehype 層で確定し、その詳細な出力属性契約は \`docs/markdown/markdown-output-contract.md\` を参照しなければなりません。
      - 安全規約は後段検査へ押し込むだけでなく、可能なものは前段で早期拒否してよいものとします。
      - 実装順序の変更は意味論変更を伴いうるため、単なるリファクタリングとして扱ってはなりません。"
    `);
  });
});
