# Markdown Output Reference

この文書は Markdown 出力の詳細表である。安全境界と出力責務の正本は `docs/contracts/markdown.md` とする。

## Standard Element Normalization

- headings: heading id を build-time に補完し、重複時は安定した suffix を付ける。
- `pre > code`: `pre[data-code-block] > code[data-lang]` へ正規化する。
- `blockquote`: 静的 blockquote として出力し、必要な UI wrapper は build-time で確定する。
- `table`: `div[data-table-root] > table` へ正規化する。
- `hr`: section divider として識別できる属性を付与する。
- task list: no-JS baseline を維持した上で checkbox 表現へ変換する。
- `img` / `figure`: `figure[data-image]` を基本構造とする。
- 本文 link: 安全な URL 検証と注釈属性を経て出力する。

## Directive Families

- `::callout`
- `::code-group`
- `::code-preview`
- `::preview-sandbox`
- `::details`
- `::info-box`
- `::link-card`
- `::score`
- `::tabs`
- `::translation`
- `::syntax-card`

各 directive は authoring guide の入力仕様に従い、最終 DOM は `docs/contracts/markdown.md` の safety boundary を満たす。

## Hydration Directive

- note ページの hydration directive は build-time annotation として出力する。
- Hydration budget は SSR artifact と client scheduler の境界で検証する。

## Final HAST Invariants

- 静的検索 highlight 用の一時 `<mark>` を最終本文 DOM に残さない。
- Component 化後も semantic fallback を失わない。
- `preview-sandbox` の `srcdoc` は compiler-generated output として扱い、author supplied HTML ではない。
