# Navigation Envelope Schema Reference

この文書は`NavigationEnvelope`の詳細schemaを記述するReferenceである。
`NavigationEnvelope`がclient navigationの正規payloadであるという契約は`docs/contracts/navigation-envelope.md`を正本とする。

## Top-level Fields

- `schemaVersion`: envelope schemaの互換単位。互換性を破るpayload変更では更新する。
- `buildId`: artifactを生成したbuildの識別子。client側buildIdと不一致の場合は縮退理由になる。
- `generatedAt`: artifact生成時刻。fetch artifact上では必須の診断用metadataであり、routing互換キーではない。
- `document`: 本文commitに必要なpayload。
- `shell`: route由来のdurable shell snapshot。
- `hydrationPlan`: client hydrationのplanning情報。

## `document`

- `url`: documentが対応するURL。
- `title`: document title。
- `description`: head metadataに反映できる説明。
- `html`: router document boundaryに挿入する本文HTML。
- `canonicalPathname`: document metadataとしてのcanonical URL。
- `head`: head更新に必要な最小情報。

本文DOM境界は`docs/contracts/router-document.md`を正本とする。

## `shell`

- `headerHtml`: routeに対応する静的`header[data-layout-header]`のHTML。
- `sidebarProjection`: routeに対応するsidebar projection。sidebarがない場合は`null`。

Shell snapshotはroute由来のdurable shell stateを運ぶ。UI component固有の一時状態は含めない。
Reading chromeのmobile panel open state、current DOM、density tierのruntime再計算結果は`shell`に保存しない。

## `shell.sidebarProjection`

- `selectedId`: 現在routeに対応するselected tree node id。
- `structuralExpandedIds`: route構造上、表示に必要な展開node id。
- `topologyRevision`: nav topologyの更新単位。
- `navHtml`: server-first navigation subtree。
- `sidebarId`: sidebar instanceの識別子。
- `stateScopeId`: presentation / tree stateの保存範囲。
- `heading`: sidebar landmark label。
- `fixedBreakpoint`: fixed / overlay切り替えのbreakpoint情報。
- `presentation`: route由来で初期表示に必要なpresentation hint。

Sidebar state ownershipは`docs/contracts/sidebar-state.md`を正本とする。

## `hydrationPlan`

- `shell`: shell hydrationに必要なplanning情報。
- `content`: content hydrationに必要なplanning情報。
- `islands`: hydration対象componentとtrigger分類。
- Reading chrome islandはplanning情報であり、scheduler / registryのtrigger ownershipを置き換えない。

Hydration triggerの正本は`docs/contracts/hydration.md`とscheduler / registryである。

## Schema Version Rule

Payload fieldの追加、削除、意味変更、互換性を破る型変更を行う場合は`schemaVersion`を更新し、`docs/contracts/navigation-envelope.md`とこのReferenceを同時に確認する。

## Runtime Compatibility Rule

- `schemaVersion`はpayload schema互換キーである。
- `buildId`はartifact世代の互換キーである。
- `generatedAt`はartifact生成時刻の診断用metadataであり、current document側の値と一致する必要はない。
- fetch artifact側`generatedAt`の欠落・不正はNavigationEnvelope contract errorである。
- current document側`generatedAt`の欠落・不正はfetch artifactの`buildId`互換判定を止めない。
