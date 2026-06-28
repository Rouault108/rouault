# Router Document Navigation Fallback On Stale Fetch Artifacts

## Status

Accepted.

## Context

古いdocumentを開いたまま新しいdeployが行われると、通常内部遷移でfetch artifact由来の`buildId`、`schemaVersion`、contract、HTTP status不整合が発生しうる。これをSPAのerror envelopeとしてcommitすると、ユーザーに「ビルド不整合」やrouter artifact error pageを表示してしまう。

また、`generatedAt`はartifact生成時刻であり、artifact世代やpayload互換性を表す識別子ではない。`generatedAt`不一致だけでclient navigationを拒否すると、互換性とは無関係な時刻差を読書体験へ露出する。

## Decision

- `buildId`はbuild artifact世代の互換キーとする。
- `schemaVersion`はNavigationEnvelope payload schemaの互換キーとする。
- `generatedAt`は診断用metadataとし、routing互換キーにしない。
- fetch artifact由来の`buildId`不一致、`schemaVersion`不一致、NavigationEnvelope contract error、artifact HTTP status errorは、通常内部遷移ではSPA commitせず目的URLへのdocument navigation fallbackへ送る。
- route manifestに存在する`known-route`のfetch artifact HTTP 404は、artifact HTTP status errorとしてdocument navigation fallbackへ送る。
- route manifestに存在しないがinternal document navigationとして許可された`missing-route-candidate`のfetch artifact HTTP 404だけは、stale artifactではなくnot-foundとして扱い、`error-fallback` sourceのnot-found envelopeをSPA commitする。not-foundに渡すURLはquery/hashを含むnormalized URLである。
- `missing-route-candidate`であっても、`schemaVersion`不一致、`buildId`不一致、invalid content-type、invalid JSON、構造不正NavigationEnvelope、HTTP 404以外のstatus errorはnot-foundへ寄せない。
- current document側`buildId`欠落・不正は`current-build-id-invalid`としてfetch artifact由来とは別に分類する。
- 初期navigationで同一URLへのdocument navigation fallbackはreload loopを避け、error fallback envelope commitへ戻す。
- document-route handler例外とdocument-route由来の不正NavigationEnvelopeはstale fetch artifact fallback対象にしない。
- AbortError、TimeoutError、network errorはdocument navigation fallbackへ変換しない。

## Consequences

通常内部遷移でstale fetch artifactに遭遇しても、routerは内部error pageをSPA commitせず、ブラウザのdocument navigationへ縮退する。これにより、新しいHTML、client bundle、router artifactを同じdeploy世代から読み直せる。

`generatedAt`不一致だけではcommitを拒否しない。一方、fetch artifact側`generatedAt`の欠落・不正はNavigationEnvelope contract errorとして扱う。

document-route由来の不正は実装バグとして残り、document navigation fallbackで隠蔽しない。

## Verification

- `test/node/navigation-envelope.test.ts`
- `test/node/error-envelope-factory.test.ts`
- `test/node/location-adapter.test.ts`
- `test/browser/router-stale-fetch-artifact-fallback.browser.test.ts`
