# Navigation Envelope

## 文書の位置付け

本書は、Rouault の client navigation における新しい正規契約を定義します。
`DocumentSnapshot` は互換層として残りますが、router core の正規入力は
`NavigationEnvelope` とします。

## 中心契約

`NavigationEnvelope` は次を束ねる単一正本です。

- `document`
- `shellProjection`
- `hydrationPlan`
- `schemaVersion`
- `buildId`
- `generatedAt`

## ownership

### `document`

- 本文 HTML
- 文書 title
- meta description
- `page | not-found | error`
- announced title

### `shellProjection`

- header の route 由来値
- sidebar の route 由来値

component の open / closed、media query 由来 mode、focus などの一時状態は含みません。

### `hydrationPlan`

- route 由来の hydration planning 情報だけを持ちます
- trigger の正本は scheduler / registry のまま維持します

## 互換方針

- document route が旧 `DocumentSnapshot` を返す間は adapter で envelope へ変換します
- fetch 経路は `index.router.json` の JSON `NavigationEnvelope` のみを受理します
- fetched HTML の `layout-header` / `layout-sidebar` 属性形式は router protocol ではありません

## buildId 整合

- SSR HTML は `meta[name="rouault-build-id"]` に current buildId を保持します
- fetched `NavigationEnvelope.buildId` と current buildId が不一致な場合、router は error snapshot へ縮退します
- buildId 不整合時に fetched envelope を正規経路として commit してはなりません
