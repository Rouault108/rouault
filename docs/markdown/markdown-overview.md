この文書は現行契約の正本ではない。
Markdown 出力・安全性の正本は `docs/contracts/markdown.md`、詳細表は `docs/references/markdown-output.md`、執筆ガイドは `docs/guides/markdown-authoring.md` を参照する。

# Markdown Overview

## 5. 実装上の Source of Truth

実装上の SoT は、`velite.config.ts` におけるプラグイン順序です。

1. `remarkMath`
2. `remarkGfm`
3. `remarkExpandExampleIncludes`
4. `remarkDisallowRawHtml`
5. `remarkRouaultDirectives`
6. `remarkLinkCards`
7. `remark-rehype`
8. `rehypeKatex`
9. `rehypeRouaultComponents`
10. `rehypeHeadingIds`
11. `rehypePreviewSandbox`
12. `rehypeShikiCodeBlocks`
13. `rehypeStaticCodeGroups`
14. `rehypeAnnotateLinkKinds`
15. `rehypeInlineCodeTranslateNo`
16. `rehypeOrderedListContracts`
17. `rehypeDisallowDangerousProps`

規則:

- authoring grammar に関わる意味論変更は、remark 層の正本と実装順序の双方を整合させなければなりません。
- 出力 DOM に関わる意味論変更は、rehype 層の正本と実装順序の双方を整合させなければなりません。
- 本文リンクの種別注釈は rehype 層で確定し、その詳細な出力属性契約は `docs/markdown/markdown-output-contract.md` を参照しなければなりません。
- 安全規約は後段検査へ押し込むだけでなく、可能なものは前段で早期拒否してよいものとします。
- 実装順序の変更は意味論変更を伴いうるため、単なるリファクタリングとして扱ってはなりません。

## 6. 文書群と ownership

現行の Markdown 契約は `docs/contracts/markdown.md` を正本とする。
