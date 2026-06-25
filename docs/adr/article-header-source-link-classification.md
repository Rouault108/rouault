# Article Header Source Link Classification Decision Record

## Status

- Type: R3 Decision Record
- Date: 2026-06-22
- Failure ID: F-ARTICLE-SOURCE-LINK-KIND-001
- Cause ID: C-ARTICLE-SOURCE-SAME-ORIGIN-KIND-MISMATCH-001
- Decision ID: D-ARTICLE-SOURCE-LINK-CLASSIFIED-001
- Scope: Article header source link annotation

この文書はdecision recordです。現在のcontractを再定義する正本ではありません。

Current contract: `docs/contracts/markdown.md`の`Article Header Source Link Contract`を参照する。

## Context

`article-header__source-link`は、出典UIであることを理由に`data-link-kind="external-web"`と`data-external="true"`を固定出力していた。

一方、generated page link contractはrendered hrefと`data-link-kind`がlink classifierの結果と一致することを要求する。`ROUAULT_SITE_ORIGIN=https://example.com`の production build では、`https://example.com/article-header-link-decoration`は same-origin URL になり、classifier は internal document route ではない same-origin URL を`internal-resource`と判定する。そのため、固定された`external-web` annotation と分類結果が不一致になった。

## Decision

Article header source linkの`data-link-kind`は、出典UIであってもlink classifierに従う。

- external originは`external-web`とする。
- same-originかつinternal document routeは`internal-document`とする。
- same-originかつinternal document routeではないURLは`internal-resource`とする。
- unsafe sourceはlink化しない。
- `data-link-surface="metadata"`は維持する。
- `data-external="true"`は`external-web`のときだけ出力する。

`target="_blank"`と`rel="noopener noreferrer"`は全分類で維持する。`internal-document`に分類されても、article header source linkは本文閲覧中の出典参照であり、app-router interceptionではなくpassthrough navigationとして扱う。

`NoteLayout`は`renderArticleHeaderHtml()`を呼ぶ前にsource hrefを分類し、分類済みmodeをarticle header rendererへ渡す。classification contextを持たないraw render / story / unit test用のfallbackは、`renderArticleHeaderHtml()`のraw fallback modeに限定する。

## Alternatives considered

### Change the fixture URL

棄却。`test/fixtures/content/e2e/article-header-link-decoration/index.md`のsame-origin sourceは、今回のfailureを再現する重要fixtureである。URL変更は実装不一致を隠すだけになる。

### Add a validator exception for article header source links

棄却。source linkだけclassifierと異なる`data-link-kind`を許すと、generated page link contractの一貫性を弱める。

### Post-process full BaseLayout HTML with parse5

棄却。full page HTMLをparse5 serializeして返すと、DOCTYPE、head/body、script escape、属性順、metadata、navigation、footerなどarticle header source link以外へ副作用が広がる。

### Annotate BaseLayout data.content after NoteLayout render

棄却。`BaseLayout`はpage shellとgenerated-page validationの責務を持つ。Article header source linkのannotationはarticle header rendering前に`NoteLayout`が作る。

## Consequences

- same-origin sourceは`internal-resource`または`internal-document`として出力され得る。
- external sourceだけが`data-external="true"`を持つ。
- Article header source linkは分類済みmetadata linkとしてgenerated-page validationを通る。
- Raw fallbackはclassification contextを持たない直接render用に限定される。

## Rollback

Article header source link modeと`NoteLayout`側のclassificationを戻すと、source linkは再び`external-web`固定になる。その場合、`ROUAULT_SITE_ORIGIN=https://example.com`で same-origin source fixture の generated page link contract failure が再発する。
