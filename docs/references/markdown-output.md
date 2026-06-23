# Markdown Output Reference

この文書は Markdown 出力の詳細表である。安全境界と出力責務の正本は `docs/contracts/markdown.md` とする。
入力記法の網羅表は `docs/references/markdown-authoring-syntax.md` を参照する。
この文書は final DOM と出力詳細を扱い、入力記法一覧を所有しない。

## Standard Element Normalization

- headings: heading id を build-time に補完し、重複時は安定した suffix を付ける。
- `pre > code`: `pre[data-code-block] > code[data-lang]` へ正規化する。
- `blockquote`: 静的 blockquote として出力し、必要な UI wrapper は build-time で確定する。
- `table`: `div[data-table-root="true"][role="region"][tabindex="0"] > table` へ正規化する。`data-table-root` は横スクロール可能な static table root であり、行クリック、行選択、行 navigation、row hover affordance を意味しない。セル内の link / button など、実際の操作要素だけが操作可能面として振る舞う。
- `::table{column-widths="..."}`: GFM table 1個だけを包む authoring wrapper として扱い、final DOM では static table surface へ正規化する。`column-widths` がある場合だけ `colgroup` を出力し、各 `col` には固定トークン由来の列幅属性を付与する。中間 source marker は final DOM に残さない。
- `{{break}}`: table cell text escape として、final DOM では marker 付きの table cell break へ正規化する。table cell 内の markerなし `<br>` は defensive final contract error とする。
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
- `::table`

各 directive の入力記法は `docs/references/markdown-authoring-syntax.md` を参照し、最終 DOM は `docs/contracts/markdown.md` の safety boundary を満たす。

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

### `::table`

`::table` は、final DOM で通常の Markdown table と同じ static table surface へ正規化する。`::table` 自体は authoring metadata wrapper であり、interactive table、sortable table、filterable table、row action を意味しない。

- `::table` は GFM table 1個だけを包む。
- `column-widths` がない場合は、通常 GFM table の出力契約を維持する。
- `column-widths` がある場合だけ `colgroup` を生成する。
- `column-widths` の token は `auto` / `fit` / `narrow` / `medium` / `wide` / `numeric` に限定する。
- `numeric` は列幅ヒントであり、alignment はGFM tableの alignment から決まる。
- `column-widths` 指定 table に `colspan` / `rowspan` がある場合は build error とする。
- final DOM に `data-table-source` などの中間 marker を残さない。

### Table cell break

`{{break}}` は table cell text escape として、final DOM で marker 付きの `<br>` へ正規化する。marker 付き break は table cell 内の意味上の行区切りであり、raw HTML 許可を意味しない。

- final DOM の table cell break は `br[data-table-cell-break="true"]` として表す。
- raw `<br>`、Markdown hard break、`:br[]` は table cell break contract として扱わない。
- table cell 内の markerなし `<br>` は defensive final contract error とする。
- exact `{{break}}` 以外の `{{...}}` token はこの出力契約の対象外であり、通常テキストとして保持する。

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
