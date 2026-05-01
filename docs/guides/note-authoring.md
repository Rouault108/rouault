# Note Authoring Guide

この文書はノート執筆者向けの Guide である。Note URL、permalink、directory-index の正本は `docs/contracts/note-navigation.md` とする。

## 基本

- ノートは `content/` 配下の Markdown と frontmatter で管理する。
- 本文は JS なしでも読める形で成立させる。
- ファイル配置は note identity と URL に影響するため、directory-index の扱いを確認する。

## Frontmatter

- `title` は page title として扱われる。
- 更新日などの metadata は表示・検索・archive hash の契約と衝突しない範囲で使う。
- 表示 label を URL や slug の代わりに使わない。

## Directory Index

- `content/<dir>/index.md` はそのディレクトリ自体を表す note page である。
- URL は `/notes/<dir>` のように末尾スラッシュなしで扱う。
- Directory label は `_config.json.label` を使う。設定方法は `docs/guides/content-config.md` を参照する。

## Markdown

- Markdown の書き方は `docs/guides/markdown-authoring.md` を参照する。
- 出力・安全性の正本は `docs/contracts/markdown.md` とする。

## Permanent URL

- Permanent URL は内容固定参照であり、通常の note page navigation URL ではない。
- 詳細は `docs/contracts/permanent-url.md` を参照する。
