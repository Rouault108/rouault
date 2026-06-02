# Navigation Envelope Schema Reference

この文書は `NavigationEnvelope` の詳細 schema を記述する Reference である。
`NavigationEnvelope` が client navigation の正規 payload であるという契約は `docs/contracts/navigation-envelope.md` を正本とする。

## Top-level Fields

- `schemaVersion`: envelope schema の互換単位。互換性を破る payload 変更では更新する。
- `buildId`: artifact を生成した build の識別子。client 側 buildId と不一致の場合は縮退理由になる。
- `generatedAt`: artifact 生成時刻。表示・診断用であり routing state ではない。
- `document`: 本文 commit に必要な payload。
- `shell`: route 由来の durable shell snapshot。
- `hydrationPlan`: client hydration の planning 情報。

## `document`

- `url`: document が対応する URL。
- `title`: document title。
- `description`: head metadata に反映できる説明。
- `html`: router document boundary に挿入する本文 HTML。
- `canonicalPathname`: document metadata としての canonical URL。
- `head`: head 更新に必要な最小情報。

本文 DOM 境界は `docs/contracts/router-document.md` を正本とする。

## `shell`

- `headerHtml`: route に対応する静的 `header[data-layout-header]` の HTML。
- `sidebarProjection`: route に対応する sidebar projection。sidebar がない場合は `null`。

Shell snapshot は route 由来の durable shell state を運ぶ。UI component 固有の一時状態は含めない。
Reading chrome の mobile panel open state、current DOM、density tier の runtime 再計算結果は `shell` に保存しない。

## `shell.sidebarProjection`

- `selectedId`: 現在 route に対応する selected tree node id。
- `structuralExpandedIds`: route 構造上、表示に必要な展開 node id。
- `topologyRevision`: nav topology の更新単位。
- `navHtml`: server-first navigation subtree。
- `sidebarId`: sidebar instance の識別子。
- `stateScopeId`: presentation / tree state の保存範囲。
- `heading`: sidebar landmark label。
- `fixedBreakpoint`: fixed / overlay 切り替えの breakpoint 情報。
- `presentation`: route 由来で初期表示に必要な presentation hint。

Sidebar state ownership は `docs/contracts/sidebar-state.md` を正本とする。

## `hydrationPlan`

- `shell`: shell hydration に必要な planning 情報。
- `content`: content hydration に必要な planning 情報。
- `islands`: hydration 対象 component と trigger 分類。
- Reading chrome island は planning 情報であり、scheduler / registry の trigger ownership を置き換えない。

Hydration trigger の正本は `docs/contracts/hydration.md` と scheduler / registry である。

## Schema Version Rule

Payload field の追加、削除、意味変更、互換性を破る型変更を行う場合は `schemaVersion` を更新し、`docs/contracts/navigation-envelope.md` とこの Reference を同時に確認する。
