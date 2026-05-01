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

## インライン拡張

- highlight
- emoji
- superscript / subscript
- shortcode

## 注意

- `on*` 属性、`srcdoc`、危険 URL scheme、許可外 `style` は使わない。
- Hydration を期待して本文の意味が成立する書き方にしない。
- 出力 DOM の詳細に依存する場合は `docs/references/markdown-output.md` を確認する。
