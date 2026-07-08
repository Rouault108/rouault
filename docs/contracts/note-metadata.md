# Note Metadata Contract

## 1. Status

- Type: Normative
- Source of truth: Markdown source frontmatter, Velite schema, metadata validators, authoring commands
- Applies to: `content/**/*.md` note frontmatter and authoring-time source mutation
- Non-goals: Permanent URL hash修正、既存content migration、projection/search/layout表示仕様変更

## 2. Metadata Fields

`date`は公開日または作成相当日である。`updated`はreader-facingかつ公開対象noteの読者向け公開更新日である。

`kind`はnoteのcontent kindを表す。未指定はreader-facing noteとして扱う。`testing`と`demo`は読者向け公開更新日の自動stamp対象外である。

`status`はpublication stateを表す。未指定、`archived`、`wip`、`deprecated`は公開対象候補である。`draft`は自動stamp対象外である。

`source`はarticle header metadata surfaceの出典リンクとして扱われる。リンク分類と安全性の詳細は`docs/contracts/markdown.md`のArticle Header Source Link Contractを正本とする。

`license`と`licenseNote`は読者に表示されうるmetadataであり、reader-facing変更として扱う。

`excludeFromPublicationSurfaces: true`はpublication surfaceからの除外を表し、自動stamp対象外にする。`false`または未指定は除外しない。authoring commandのraw判定では、unquoted boolean `true` / `false`だけをbooleanとして扱う。

## 3. Publication Surface Relationship

reader-facingかつ公開対象noteは、`kind`と`status`と`excludeFromPublicationSurfaces`のpost-change stateで判定する。

- `kind`未指定または`reader`はreader-facingである。
- `kind: testing`と`kind: demo`はreader-facing更新stamp対象外である。
- `status`未指定、`archived`、`wip`、`deprecated`は公開対象候補である。
- `status: draft`は公開対象外である。
- `excludeFromPublicationSurfaces: true`は公開対象外である。

未知の`kind`または`status`はinvalid noteであり、authoring commandはreader丸めを使って処理してはならない。

## 4. Updated Contract

`updated`は`YYYY-MM-DD`形式でなければならない。`date`と`updated`が両方ある場合、`updated >= date`でなければならない。

build時に`updated`を生成、補完、暗黙導出してはならない。現在日時、ファイルmtime、Git commit日時、Git履歴から`updated`を導出しない。

`updated`を自動更新する場合は、Markdown sourceを書き換えるauthoring commandとして`pnpm notes:stamp-updated`を使う。このcommandは自動で`git add`しない。

## 5. Stamp Command

`pnpm notes:stamp-updated`は、tracked working tree差分とstaged差分に含まれるreader-facingかつ公開対象noteをpost-change stateで判定し、`updated`を追加または更新する。untracked fileを対象にしたい場合は、先に`git add`する。deleted fileは対象外である。

既定日付はAsia/Tokyoの実行日`YYYY-MM-DD`である。現在日以外を指定する場合は`--date YYYY-MM-DD`を使う。`--date`はstamp日付だけを指定し、対象判定を無効化しない。

`--date`未指定の通常stampでは、同一diff内で`updated`がすでに手動変更されているnoteを上書きしない。added reader/public noteに既存`updated`がある場合は手動指定済みとして扱い、上書きしない。added reader/public noteに`updated`がない場合は追加する。

`--dry-run`はファイルを書き換えず、対象ファイル、現在の`updated`、変更予定値、skip理由を表示する。

`--check`はファイルを書き換えず、post-change stateでreader-facingかつ公開対象noteにreader-facing意味変更がある場合、同一diff内で`updated`が変更されていることを確認する。`updated`が実行日当日であることは要求しない。Phase1の`--check`はworkspace差分検査であり、staged-only commit検査やCI/PR base branch差分検査ではない。

`--files`はGit diffに依存せず、指定ファイルをstampまたはdry-runの対象候補にする。対象判定、日付形式、frontmatter妥当性、対象外条件は通常どおり適用する。Phase1では`--check --files`はunsupportedである。

## 6. Target Exclusions

次は自動stamp対象外である。

- `status: draft`
- `kind: testing`
- `kind: demo`
- `excludeFromPublicationSurfaces: true`
- `content/testing/**/*.md`
- `test/fixtures/content/**/*.md`
- deleted file
- untracked file

path-level対象外fileはfrontmatter parseより先にskipする。

## 7. Reader-Facing Change

reader-facing変更として扱うものは、Markdown本文、`title`、`description`、`genre`、`source`、`license`、`licenseNote`、`cover`、`kind`、`status`、`excludeFromPublicationSurfaces`、content noteのrename、その他読者に表示されるfrontmatter、表示・検索・publication surfaceに影響するmetadataである。

`kind: testing`または`kind: demo`から`kind: reader`または未指定へ変更され、post-change noteがreader/publicならupdated更新対象である。`excludeFromPublicationSurfaces: true`から`false`または未指定への変更で、post-change noteがreader/publicならupdated更新対象である。

`updated`のみ、`date`のみ、`testingArea`のみ、`hydrationBudgetProfile`のみ、`e2eFixtureId`のみ、その他reader-facingな表示・検索・publication surfaceに影響しない内部検証用metadataのみの変更は、updated更新要求の対象外である。

## 8. Known Inconsistency

`docs/contracts/permanent-url.md`には`updated_at`表記があるが、現行frontmatter名は`updated`である。

Permanent URL hash生成実装の所在と実効性が未確認であるため、本Changeでは修正しない。別ChangeでPermanent URL contractを精査する。

このKnown inconsistencyは記録であり、Permanent URL contractを変更しない。Permanent URLの正本は引き続き`docs/contracts/permanent-url.md`である。
