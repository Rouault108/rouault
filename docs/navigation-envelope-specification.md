# Navigation Envelope

## 文書の位置付け

本書は、Rouault の client navigation における新しい正規契約を定義します。
router core の正規入力は `NavigationEnvelope` のみです。

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

sidebar projection は server nav subtree を正本として、少なくとも次を表現できなければなりません。

- `selectedId`
- `structuralExpandedIds`
- `topologyRevision`
- `navHtml`
- `sidebarId`
- `stateScopeId`
- `heading`
- `fixedBreakpoint`
- `presentation`

### `hydrationPlan`

- route 由来の hydration planning 情報だけを持ちます
- trigger の正本は scheduler / registry のまま維持します

## 互換方針

- document route も fetch 経路も `NavigationEnvelope` を直接返します
- fetch 経路は `index.router.json` の JSON `NavigationEnvelope` のみを受理します
- fetched HTML の `layout-header` / `layout-sidebar` 属性形式は router protocol ではありません
- ただし build で抽出された `navHtml` は `NavigationEnvelope.shellProjection.sidebar` の正規 payload として扱います

## buildId 整合

- SSR HTML は `meta[name="rouault-build-id"]` に current buildId を保持します
- fetched `NavigationEnvelope.buildId` と current buildId が不一致な場合、router は error envelope へ縮退します
- buildId 不整合時に fetched envelope を正規経路として commit してはなりません
