# Markdown Authoring Guide

この文書は日常執筆向けの短い Guide である。Markdown 入力記法の網羅表は `docs/references/markdown-authoring-syntax.md`、Markdown 出力・安全性の正本は `docs/contracts/markdown.md`、出力詳細は `docs/references/markdown-output.md` を参照する。

## 基本方針

- CommonMark を優先する。
- 生 HTML は書かない。
- 独自 directive は許可された名前と属性だけを使う。
- 表示都合のために本文資産へ一時的な回避策を書かない。

## 使える主なブロック

- `::callout`
- `::code-group`
- `::code-preview`
- `::details`
- `::info-box`
- `::link-card`
- `::score`
- `::tabs`
- `::translation`
- `::syntax-card`
- `::table`

`preview-sandbox` は `code-preview` family 内の特殊 child として扱う。これは非推奨化、削除、受理条件変更ではなく、現行実装上の親子制約に合わせた説明位置の整理である。

````md
::code-preview{heading="Preview"}
:::preview-sandbox
```preview-html
<p>Hello</p>
```
:::
::
````

## インライン拡張

- highlight
- emoji
- superscript / subscript
- shortcode
- table cell break escape

## Fenced code block meta

代表的な fenced code block meta は code fence の language に続けて書く。

````md
```ts filename="sample.ts" copyable="false" show-line-numbers="true" highlight-lines="1,3-4"
const sample = 1;
```
````

meta key の網羅表は `docs/references/markdown-authoring-syntax.md` を参照する。`data-shiki-meta` は authoring meta key ではない。

## 表

通常のGFM table を使う。Markdown由来の表は static table surface であり、interactive table、sortable table、filterable table、row action ではない。

列幅ヒントが必要な場合は、GFM table 1個だけを `::table{column-widths="..."}` で包む。

`::table` の開始 marker、GFM table、終端 `::` の間へ workaround として空行を追加する必要はない。表以外の段落や複数の表を wrapper 内へ混ぜると build error になる。

```md
::table{column-widths="fit wide numeric"}
| 項目 | 説明 | 点数 |
|:---|:---|---:|
| 可読性 | 1行目{{break}}2行目 | 5 |
| 保守性 | 将来変更しやすいか | 4 |
::
```

`column-widths` で使える token は `auto` / `fit` / `narrow` / `medium` / `wide` / `numeric` だけである。token は空白区切りで書き、列数と同じ数を指定する。任意CSS値、comma区切り、空値は使わない。`numeric` は幅ヒントであり、右揃えはGFM tableの `---:` で指定する。

table cell 内の意味上の行区切りは `{{break}}` を使う。plain GFM table でも `::table` 内 table でも有効である。

```md
| 項目 | 説明 |
|---|---|
| A | 1行目{{break}}2行目 |
```

`{{break}}` は exact token だけが特殊扱いされる。`{{foo}}` / `{{ break }}` / `{{BREAK}}` / `{{br}}` は通常テキストであり、table cell break ではない。

`{{break}}` は table cell の実質先頭・実質末尾には置けない。前後に意味のある inline content が必要である。`{{break}}` の同一 text node 内の直前・直後へ空白を置かず、連続して書かない。

```md
| A | 1行目{{break}}**2行目** |
| A | **1行目**{{break}}2行目 |
| A | `code`{{break}}説明 |
| A | [リンク](https://example.com){{break}}説明 |
```

raw `<br>`、Markdown hard break、`:br[]` は table cell break として使わない。

## 注意

- `on*` 属性、`srcdoc`、危険 URL scheme、許可外 `style` は使わない。
- Hydration を期待して本文の意味が成立する書き方にしない。
- 出力 DOM の詳細に依存する場合は `docs/references/markdown-output.md` を確認する。
- 入力記法の網羅表が必要な場合は `docs/references/markdown-authoring-syntax.md` を確認する。
