# Markdown Table Authoring Extension Decision Record

## Status

- Type: R3 Decision Record
- Date: 2026-06-23
- Decision ID: D-TABLE-AUTHORING-001
- Contract source of truth: `docs/contracts/markdown.md`
- Scope: Markdown table authoring wrapper and table cell break escape

この文書は decision record です。現在の contract を再定義する正本ではありません。現行 contract の正本は `docs/contracts/markdown.md` です。DOM詳細参照は `docs/references/markdown-output.md` です。

## Context

- Markdown由来の表は static table surface であり、interactive data grid ではない。
- Markdown本文では raw HTML を許可しない。
- 表の列幅は執筆上の意味を持つが、任意CSS値を本文資産へ直接持ち込むと style injection 経路になりうる。
- table cell 内の意味上の行区切りには authoring contract が必要だが、raw HTML、Markdown hard break、汎用 inline directive へ寄せると既存の安全境界と責務境界が曖昧になる。
- `{{...}}` 形の記法は Mustache / Handlebars / Liquid 系の見た目に近く、広く予約すると将来の本文表現やテンプレート説明と衝突しやすい。

## Decision

Markdown table authoring extension として、GFM table 用の `::table{column-widths="..."}` wrapper と、table cell text escape の `{{break}}` を採用する。

`::table` は GFM table 1個だけを包む authoring wrapper とする。表以外、複数表、表と段落の混在は build error とする。

`column-widths` は固定トークン列であり、任意CSS値ではない。許可トークンは `auto` / `fit` / `narrow` / `medium` / `wide` / `numeric` とする。空白区切り、順序保持、重複許可とし、comma区切り、未知トークン、空値は build error とする。指定数は table列数と一致しなければならない。

`column-widths` 指定 table では `colspan` / `rowspan` を許可しない。`numeric` は幅ヒントのみであり、右揃えを暗黙指定しない。右揃えは既存GFM記法 `---:` に委ねる。

`{{break}}` は exact token だけを table cell text escape として特殊扱いする。`{{...}}` 全体はRouault構文として予約しない。`{{foo}}` / `{{ break }}` / `{{BREAK}}` / `{{br}}` は通常テキストとして扱い、build error にしない。

`{{break}}` は plain GFM table cell と `::table` 内 table cell の両方で有効とする。table cell外の exact `{{break}}` は build error とする。table cell内 link / linkReference 配下の `{{break}}` は build error とし、emphasis / strong 配下の `{{break}}` は許可する。code span / code block内の `{{break}}` は変換対象外とする。

同一 text node 内の Unicode whitespace 隣接と `{{break}}{{break}}` 連続は build error とする。text node の先頭・末尾であること自体は build error 条件にしない。text node境界をまたぐ whitespace隣接や `{{break}}{{break}}` 連続の semantic adjacency 判定は初期実装では行わない。

`{{break}}` は table cell実質先頭・実質末尾には置けない。`{{break}}` の前後には meaningful inline content が必要である。cell-level の meaningful inline content 有無検査は、cell実質先頭・実質末尾禁止のための最小検査であり、inline node境界をまたぐ semantic adjacency 判定とは別扱いにする。

meaningful inline content として数えるnodeは、非空白text、emphasis / strong配下の非空白text、inlineCode、link / linkReference表示テキストに限定する。未列挙inline nodeは、内部に列挙済みnodeとして評価可能な内容を持つ場合だけ meaningful とする。image / image alt text は初期実装では meaningful content として数えない。

raw `<br>`、Markdown hard break、`:br[]` は table cell break contract として採用しない。mdast `break` node または実装上対応する hard break node が table cell配下に存在する場合、remark側で build error とする。mdastで検出できない経路では final contract の markerなし `<br>` 拒否で防御する。

## Accepted authoring examples

```md
::table{column-widths="fit wide numeric"}
| 項目 | 説明 | 点数 |
|:---|:---|---:|
| 可読性 | 1行目{{break}}2行目 | 5 |
| 保守性 | 将来変更しやすいか | 4 |
::
```

```md
| 項目 | 説明 |
|---|---|
| A | 1行目{{break}}2行目 |
```

```md
| A | **1行目**{{break}}2行目 |
| A | 1行目{{break}}**2行目** |
| A | `code`{{break}}説明 |
| A | [リンク](https://example.com){{break}}説明 |
```

## Rejected alternatives

### Arbitrary CSS values in `column-widths`

棄却。任意CSS値は本文資産を表示都合で汚染し、style injection 経路を広げる。列幅は固定トークンの表示ヒントとして扱う。

### Comma separated `column-widths`

棄却。空白区切りを唯一の形式にし、token count と列順の対応を単純に保つ。

### Implicit alignment from `numeric`

棄却。`numeric` は幅ヒントだけを意味する。右揃えはGFM tableの alignment 記法 `---:` が所有する。

### Reserve all `{{...}}` tokens

棄却。double-brace 名前空間を広く予約すると、記事内の説明テキストや将来のテンプレート構文と衝突しやすい。Rouault が特殊扱いするのは exact `{{break}}` のみとする。

### Raw `<br>` for table cell breaks

棄却。raw HTML 禁止契約を弱めるため採用しない。

### Markdown hard break for table cell breaks

棄却。table cell break の正式記法を `{{break}}` に限定し、hard break との二重契約を避ける。

### `:br[]`

棄却。汎用 inline directive のように見えるが、今回必要なのは table cell 内に限定された text escape である。

### Row hover affordance

棄却。今回の authoring extension は static table surface の意味論を維持する。row hover affordance は復活させない。

## Out of scope

- `:br[]`
- raw `<br>` 許可
- Markdown hard break採用
- interactive table / sortable table / filterable table
- row hover affordance復活
- exact `{{break}}` 以外の `{{...}}` token をRouault構文として扱うこと
- 複数 inline node をまたぐ `{{break}}` の semantic adjacency 判定

## Consequences

- 表の列幅ヒントは authoring contract として表現できるが、任意CSS値は本文へ入らない。
- table cell 内改行は `{{break}}` に集約され、raw HTML と Markdown hard break は契約外に残る。
- `{{...}}` 名前空間は広く予約されず、exact `{{break}}` 以外の text は通常テキストとして保持される。
- static table surface、raw HTML 禁止、interactive data grid ではない意味論は維持される。
- 初期実装では semantic adjacency の完全判定を要求せず、同一 text node 内検査と cell-level meaningful content 検査に責務を分ける。

## Verification policy

- docs本文で `{{break}}` を説明するときは code span または fenced code block に入れる。
- 未実装の `::table` / `{{break}}` 例は fenced code block に入れる。
- Phase 1 docs先行時点では、未実装構文例を実行されるMarkdownとして置かない。
- docs自身が `{{break}}` によって build error にならないことを確認する。
- row hover affordance が復活しないことを確認する。
