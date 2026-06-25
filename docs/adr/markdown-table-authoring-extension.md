# Markdown Table Authoring Extension Decision Record

## Status

- Type: R3 Decision Record
- Date: 2026-06-23
- Decision ID: D-TABLE-AUTHORING-001
- Contract source of truth: `docs/contracts/markdown.md`
- Scope: Markdown table authoring wrapper and table cell break escape

この文書はdecision recordです。現在のcontractを再定義する正本ではありません。現行contractの正本は`docs/contracts/markdown.md`です。DOM詳細参照は`docs/references/markdown-output.md`です。

## Context

- Markdown由来の表はstatic table surfaceであり、interactive data gridではない。
- Markdown本文ではraw HTMLを許可しない。
- 表の列幅は執筆上の意味を持つが、任意CSS値を本文資産へ直接持ち込むとstyle injection経路になりうる。
- 表セル内の意味上の行区切りにはauthoring contractが必要だが、raw HTML、Markdown hard break、汎用inline directiveへ寄せると既存の安全境界と責務境界が曖昧になる。
- `{{...}}`形の記法はMustache / Handlebars / Liquid系の見た目に近く、広く予約すると将来の本文表現やテンプレート説明と衝突しやすい。

## Decision

Markdown table authoring extensionとして、GFM表用の`::table{column-widths="..."}` wrapperと、表セルテキストエスケープの`{{break}}`を採用する。

`::table`はGFM表1個だけを包むauthoring wrapperとする。表以外、複数表、表と段落の混在はbuild errorとする。

`column-widths`は固定トークン列であり、任意CSS値ではない。許可トークンは`auto` / `fit` / `narrow` / `medium` / `wide` / `numeric`とする。空白区切り、順序保持、重複許可とし、comma区切り、未知トークン、空値はbuild errorとする。指定数はtable列数と一致しなければならない。

`column-widths`指定tableでは`colspan` / `rowspan`を許可しない。`numeric`は幅ヒントのみであり、右揃えを暗黙指定しない。右揃えは既存GFM記法`---:`に委ねる。

`{{break}}`はexact tokenだけを表セルテキストエスケープとして特殊扱いする。`{{...}}`全体はRouault構文として予約しない。`{{foo}}` / `{{ break }}` / `{{BREAK}}` / `{{br}}`は通常テキストとして扱い、build errorにしない。

`{{break}}`はplain GFM表セルと`::table`内表セルの両方で有効とする。表セル外のexact `{{break}}`はbuild errorとする。表セル内link / linkReference配下の`{{break}}`はbuild errorとし、emphasis / strong配下の`{{break}}`は許可する。code span / code block内の`{{break}}`は変換対象外とする。

同一text node内のUnicode whitespace隣接と`{{break}}{{break}}`連続はbuild errorとする。text nodeの先頭・末尾であること自体はbuild error条件にしない。text node境界をまたぐwhitespace隣接や`{{break}}{{break}}`連続のsemantic adjacency判定は初期実装では行わない。

`{{break}}`は表セル実質先頭・実質末尾には置けない。`{{break}}`の前後にはmeaningful inline contentが必要である。cell-levelのmeaningful inline content有無検査は、cell実質先頭・実質末尾禁止のための最小検査であり、inline node境界をまたぐsemantic adjacency判定とは別扱いにする。

meaningful inline contentとして数えるnodeは、非空白text、emphasis / strong配下の非空白text、inlineCode、link / linkReference表示テキストに限定する。未列挙inline nodeは、内部に列挙済みnodeとして評価可能な内容を持つ場合だけmeaningfulとする。image / image alt textは初期実装ではmeaningful contentとして数えない。

raw `<br>`、Markdown hard break、`:br[]`は表セル改行契約として採用しない。mdast `break` nodeまたは実装上対応するhard break nodeが表セル配下に存在する場合、remark側でbuild errorとする。mdastで検出できない経路ではfinal contractのmarkerなし`<br>`拒否で防御する。

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

棄却。任意CSS値は本文資産を表示都合で汚染し、style injection経路を広げる。列幅は固定トークンの表示ヒントとして扱う。

### Comma separated `column-widths`

棄却。空白区切りを唯一の形式にし、token countと列順の対応を単純に保つ。

### Implicit alignment from `numeric`

棄却。`numeric`は幅ヒントだけを意味する。右揃えはGFM表のalignment記法`---:`が所有する。

### Reserve all `{{...}}` tokens

棄却。double-brace名前空間を広く予約すると、記事内の説明テキストや将来のテンプレート構文と衝突しやすい。Rouaultが特殊扱いするのはexact `{{break}}`のみとする。

### Raw `<br>` for table cell breaks

棄却。raw HTML禁止契約を弱めるため採用しない。

### Markdown hard break for table cell breaks

棄却。表セル改行の正式記法を`{{break}}`に限定し、hard breakとの二重契約を避ける。

### `:br[]`

棄却。汎用inline directiveのように見えるが、今回必要なのは表セル内に限定されたtext escapeである。

### Row hover affordance

棄却。今回のauthoring extensionはstatic table surfaceの意味論を維持する。row hover affordanceは復活させない。

## Out of scope

- `:br[]`
- raw `<br>`許可
- Markdown hard break採用
- interactive table / sortable table / filterable table
- row hover affordance復活
- exact `{{break}}`以外の`{{...}}` tokenをRouault構文として扱うこと
- 複数inline nodeをまたぐ`{{break}}`のsemantic adjacency判定

## Consequences

- 表の列幅ヒントはauthoring contractとして表現できるが、任意CSS値は本文へ入らない。
- 表セル内改行は`{{break}}`に集約され、raw HTMLとMarkdown hard breakは契約外に残る。
- `{{...}}`名前空間は広く予約されず、exact `{{break}}`以外のtextは通常テキストとして保持される。
- static table surface、raw HTML禁止、interactive data gridではない意味論は維持される。
- 初期実装ではsemantic adjacencyの完全判定を要求せず、同一text node内検査とcell-level meaningful content検査に責務を分ける。

## Verification policy

- docs本文で`{{break}}`を説明するときはcode spanまたはfenced code blockに入れる。
- 未実装の`::table` / `{{break}}`例はfenced code blockに入れる。
- Phase 1 docs先行時点では、未実装構文例を実行されるMarkdownとして置かない。
- docs自身が`{{break}}`によってbuild errorにならないことを確認する。
- row hover affordanceが復活しないことを確認する。
