# Note Authoring Guide

この文書はノート執筆者向けのGuideである。Note URL、permalink、directory-indexの正本は`docs/contracts/note-navigation.md`とする。

## 基本

- ノートは`content/`配下のMarkdownとfrontmatterで管理する。
- 本文はJSなしでも読める形で成立させる。
- ファイル配置はnote identityとURLに影響するため、directory-indexの扱いを確認する。

## Frontmatter

- `title`はpage titleとして扱われる。
- 更新日などのmetadataは表示・検索・archive hashの契約と衝突しない範囲で使う。
- 表示labelをURLやslugの代わりに使わない。

## Directory Index

- `content/<dir>/index.md`はそのディレクトリ自体を表すnote pageである。
- URLは`/notes/<dir>`のように末尾スラッシュなしで扱う。
- Directory labelは`_config.json.label`を使う。設定方法は`docs/guides/content-config.md`を参照する。

## Markdown

- Markdownの書き方は`docs/guides/markdown-authoring.md`を参照する。
- 日本語表記は`docs/guides/japanese-writing-style.md`を参照する。
- 出力・安全性の正本は`docs/contracts/markdown.md`とする。

## Permanent URL

- Permanent URLは内容固定参照であり、通常のnote page navigation URLではない。
- 詳細は`docs/contracts/permanent-url.md`を参照する。
