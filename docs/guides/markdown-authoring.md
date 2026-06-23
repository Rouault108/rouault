# Markdown Authoring Guide

この文書は Markdown 執筆者向けの Guide である。Markdown 出力・安全性の正本は `docs/contracts/markdown.md`、出力詳細は `docs/references/markdown-output.md` とする。

## 基本方針

- CommonMark を優先する。
- 生 HTML は書かない。
- 独自 directive は許可された名前と属性だけを使う。
- 表示都合のために本文資産へ一時的な回避策を書かない。

## 使える主なブロック

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

## インライン拡張

- highlight
- emoji
- superscript / subscript
- shortcode
- table cell break escape

## 表

通常のGFM table を使う。Markdown由来の表は static table surface であり、interactive table、sortable table、filterable table、row action ではない。

列幅ヒントが必要な場合は、GFM table 1個だけを `::table{column-widths="..."}` で包む。

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
