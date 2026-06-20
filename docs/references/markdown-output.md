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

### `::link-card`

`::link-card` と auto link-card は、final DOM で static `article.link-card[data-link-card="true"]` へ正規化する。valid link-card は `a.link-card__link` をリンク面とし、invalid link-card は anchor を出力せず `link-card__invalid` surface として表示する。

- title は `p.link-card__title` として出力する。
- description が存在する場合は `p.link-card__description` として出力し、`data-text-truncated="true"` または `"false"` を付与する。
- description は build transform で 140 文字を上限に、140 文字を超える場合だけ `value.slice(0, 139).trimEnd() + '…'` 相当へ切り詰める。
- `data-line-overflowed` は final DOM に出力しない。
- link-card link は card surface のリンク注釈として扱い、prose link へ降格しない。

### `::syntax-card` family

`::syntax-card` は、final DOM で `section.syntax-card[data-syntax-card="true"]` へ正規化する。カード名は `p.syntax-card__name` として出力し、root の `aria-labelledby` はこの label の id を参照する。

`::syntax-section` は `section.syntax-section[data-syntax-section="true"]` へ正規化する。section label は `p.syntax-section__heading` として出力し、section の `aria-labelledby` はこの label の id を参照する。

- `syntax-card__name` と `syntax-section__heading` は DOM heading ではなくカード内部 label である。
- `heading-level` は入力互換属性として受理されるが、final DOM の `h2`〜`h6` 生成には使わない。
- final DOM に `heading-level` / `data-heading-level` は残さない。
- `data-syntax-card` subtree は heading id、heading permalink、TOC の対象外である。

## Hydration Directive

- note ページの hydration directive は build-time annotation として出力する。
- Hydration budget は SSR artifact と client scheduler の境界で検証する。

## Final HAST Invariants

- 静的検索 highlight 用の一時 `<mark>` を最終本文 DOM に残さない。
- Component 化後も semantic fallback を失わない。
- `preview-sandbox` の `srcdoc` は compiler-generated output として扱い、author supplied HTML ではない。

---

## Footnote output contract

Markdown 由来の脚注は static-first DOM へ正規化します。

- footnote definition ID は `fn-*` 形式です。
- `user-content-fn-*` は入力互換として `fn-*` へ正規化されます。
- `user-content-fnref-*` は definition ID でも canonical ref id でもありません。legacy backref として除去され、実際の ref instance 集合から canonical `fn-*-ref-N` backref が再生成されます。
- `data-footnote-ref` / `data-footnote-backref` は最終 HTML で `"true"` 固定です。
- false 相当 marker、role-only marker、class marker は最終 HTML に残りません。
- endnotes 内の `h2#footnote-label` は構造見出しであり、TOC と heading permalink の対象外です。
