# Article Header Source Link Classification Decision Record

## Status

- Type: R3 Decision Record
- Date: 2026-06-22
- Failure ID: F-ARTICLE-SOURCE-LINK-KIND-001
- Cause ID: C-ARTICLE-SOURCE-SAME-ORIGIN-KIND-MISMATCH-001
- Decision ID: D-ARTICLE-SOURCE-LINK-CLASSIFIED-001
- Scope: Article header source link annotation

この文書は decision record です。現在の contract を再定義する正本ではありません。

Current contract: `docs/contracts/markdown.md` の `Article Header Source Link Contract` を参照する。

## Context

`article-header__source-link` は、出典 UI であることを理由に `data-link-kind="external-web"` と `data-external="true"` を固定出力していた。

一方、generated page link contract は rendered href と `data-link-kind` が link classifier の結果と一致することを要求する。`ROUAULT_SITE_ORIGIN=https://example.com` の production build では、`https://example.com/article-header-link-decoration` は same-origin URL になり、classifier は internal document route ではない same-origin URL を `internal-resource` と判定する。そのため、固定された `external-web` annotation と分類結果が不一致になった。

## Decision

Article header source link の `data-link-kind` は、出典 UI であっても link classifier に従う。

- external origin は `external-web` とする。
- same-origin かつ internal document route は `internal-document` とする。
- same-origin かつ internal document route ではない URL は `internal-resource` とする。
- unsafe source は link 化しない。
- `data-link-surface="metadata"` は維持する。
- `data-external="true"` は `external-web` のときだけ出力する。

`target="_blank"` と `rel="noopener noreferrer"` は全分類で維持する。`internal-document` に分類されても、article header source link は本文閲覧中の出典参照であり、app-router interception ではなく passthrough navigation として扱う。

`NoteLayout` は `renderArticleHeaderHtml()` を呼ぶ前に source href を分類し、分類済み mode を article header renderer へ渡す。classification context を持たない raw render / story / unit test 用の fallback は、`renderArticleHeaderHtml()` の raw fallback mode に限定する。

## Alternatives considered

### Change the fixture URL

棄却。`test/fixtures/content/e2e/article-header-link-decoration/index.md` の same-origin source は、今回の failure を再現する重要 fixture である。URL 変更は実装不一致を隠すだけになる。

### Add a validator exception for article header source links

棄却。source link だけ classifier と異なる `data-link-kind` を許すと、generated page link contract の一貫性を弱める。

### Post-process full BaseLayout HTML with parse5

棄却。full page HTML を parse5 serialize して返すと、DOCTYPE、head/body、script escape、属性順、metadata、navigation、footer など article header source link 以外へ副作用が広がる。

### Annotate BaseLayout data.content after NoteLayout render

棄却。`BaseLayout` は page shell と generated-page validation の責務を持つ。Article header source link の annotation は article header rendering 前に `NoteLayout` が作る。

## Consequences

- same-origin source は `internal-resource` または `internal-document` として出力され得る。
- external source だけが `data-external="true"` を持つ。
- Article header source link は分類済み metadata link として generated-page validation を通る。
- Raw fallback は classification context を持たない直接 render 用に限定される。

## Rollback

Article header source link mode と `NoteLayout` 側の classification を戻すと、source link は再び `external-web` 固定になる。その場合、`ROUAULT_SITE_ORIGIN=https://example.com` で same-origin source fixture の generated page link contract failure が再発する。
