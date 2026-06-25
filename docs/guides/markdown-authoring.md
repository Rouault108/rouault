# Markdown Authoring Guide

この文書は日常執筆向けの短いGuideである。Markdown入力記法の網羅表は`docs/references/markdown-authoring-syntax.md`、Markdown出力・安全性の正本は`docs/contracts/markdown.md`、出力詳細は`docs/references/markdown-output.md`を参照する。日本語表記は`docs/guides/japanese-writing-style.md`を参照する。

## 基本方針

- CommonMarkを優先する。
- 生HTMLは書かない。
- 独自directiveは許可された名前と属性だけを使う。
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

`preview-sandbox`は`code-preview` family内の特殊childとして扱う。これは非推奨化、削除、受理条件変更ではなく、現行実装上の親子制約に合わせた説明位置の整理である。

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

代表的なfenced code block metaはcode fenceのlanguageに続けて書く。

````md
```ts filename="sample.ts" copyable="false" show-line-numbers="true" highlight-lines="1,3-4"
const sample = 1;
```
````

meta keyの網羅表は`docs/references/markdown-authoring-syntax.md`を参照する。`data-shiki-meta`はauthoring meta keyではない。

## 表

通常のGFM tableを使う。Markdown由来の表はstatic table surfaceであり、interactive table、sortable table、filterable table、row actionではない。

列幅ヒントが必要な場合は、GFM tableを1個だけ`::table{column-widths="..."}`で包む。

`::table`の開始marker、GFM table、終端`::`の間へworkaroundとして空行を追加する必要はない。表以外の段落や複数の表をwrapper内へ混ぜるとbuild errorになる。

```md
::table{column-widths="fit wide numeric"}
| 項目 | 説明 | 点数 |
|:---|:---|---:|
| 可読性 | 1行目{{break}}2行目 | 5 |
| 保守性 | 将来変更しやすいか | 4 |
::
```

`column-widths`で使えるtokenは`auto` / `fit` / `narrow` / `medium` / `wide` / `numeric`だけである。tokenは空白区切りで書き、列数と同じ数を指定する。任意CSS値、comma区切り、空値は使わない。`numeric`は幅ヒントであり、右揃えはGFM tableの`---:`で指定する。

table cell内の意味上の行区切りは`{{break}}`を使う。plain GFM tableでも`::table`内tableでも有効である。

```md
| 項目 | 説明 |
|---|---|
| A | 1行目{{break}}2行目 |
```

`{{break}}`はexact tokenだけが特殊扱いされる。`{{foo}}` / `{{ break }}` / `{{BREAK}}` / `{{br}}`は通常テキストであり、table cell breakではない。

`{{break}}`はtable cellの実質先頭・実質末尾には置けない。前後に意味のあるinline contentが必要である。`{{break}}`の同一text node内の直前・直後へ空白を置かず、連続して書かない。

```md
| A | 1行目{{break}}**2行目** |
| A | **1行目**{{break}}2行目 |
| A | `code`{{break}}説明 |
| A | [リンク](https://example.com){{break}}説明 |
```

raw `<br>`、Markdown hard break、`:br[]`はtable cell breakとして使わない。

## 注意

- `on*`属性、`srcdoc`、危険URL scheme、許可外`style`は使わない。
- Hydrationを期待して本文の意味が成立する書き方にしない。
- 出力DOMの詳細に依存する場合は`docs/references/markdown-output.md`を確認する。
- 入力記法の網羅表が必要な場合は`docs/references/markdown-authoring-syntax.md`を確認する。
