# Note Authoring Guide

この文書はノート執筆者向けのGuideである。Note URL、permalink、directory-indexの正本は`docs/contracts/note-navigation.md`とする。

## 基本

- ノートは`content/`配下のMarkdownとfrontmatterで管理する。
- 本文はJSなしでも読める形で成立させる。
- ファイル配置はnote identityとURLに影響するため、directory-indexの扱いを確認する。

## Frontmatter

- `title`はpage titleとして扱われる。
- `date`は公開日または作成相当日として扱われる。
- `updated`はreader-facingかつ公開対象noteの読者向け公開更新日として扱われる。
- 通常は`pnpm notes:stamp-updated`で`updated`を更新する。
- 現在日以外にしたい場合は`pnpm notes:stamp-updated --date YYYY-MM-DD`を使う。
- build時に`updated`は暗黙補完されない。
- 更新日などのmetadataは表示・検索・archive hashの契約と衝突しない範囲で使う。詳細は`docs/contracts/note-metadata.md`を参照する。
- 表示labelをURLやslugの代わりに使わない。

### Updated Stamp

`pnpm notes:stamp-updated`はMarkdown sourceを書き換えるauthoring commandであり、自動で`git add`しない。commitに含める場合は、stamp後に対象fileを確認し、必要に応じて`git add`する。

draft、testing、demo、fixtureは対象外である。`status: archived`、`status: wip`、`status: deprecated`はdraftではないため対象候補である。deleted fileはstamp/check対象外である。untracked fileは既定対象外であり、対象にしたい場合は先に`git add`する。

renamed content noteはpost-change stateでreader/publicならreader-facing変更として扱う。`kind`変更はpublication-facing metadata変更である。`excludeFromPublicationSurfaces`変更もpublication-facing metadata変更である。

`--check`は今日の日付であることではなく、同一diff内で`updated`が更新されていることを確認する。Phase1の`--check`はworkspace差分検査であり、staged-only commit検査ではない。

`updated`のみの変更と`date`のみの変更は、updated変更要求の対象外である。

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
