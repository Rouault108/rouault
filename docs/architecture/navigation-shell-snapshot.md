# Navigation Shell Snapshot Architecture

この文書はarchitecture referenceであり、Contractを再定義しない。

## Source of Truth

- NavigationEnvelopeの正規payload契約は`docs/contracts/navigation-envelope.md`。
- NavigationEnvelope詳細schemaは`docs/references/navigation-envelope-schema.md`。
- Sidebar state ownershipは`docs/contracts/sidebar-state.md`。
- Note URL、directory-index、breadcrumbは`docs/contracts/note-navigation.md`。
- Router document boundaryは`docs/contracts/router-document.md`。

## 概要

NavigationEnvelope schema v2の`shell`は、routeによって変わるapp shellのdurable stateをclient navigationで反映するsnapshotである。本文HTMLだけを差し替えると、sidebarとstatic headerのroute由来表示がSSR初期表示とずれるため、document payloadと同じnavigation envelopeに`shell`を含める。

## 含まれる概念

- sidebar projection: selected node、structural expanded ids、server-first nav subtree。
- static header HTML: `header[data-layout-header]`の検証済みHTML。

## 境界

- Shell snapshotはcomponent-local UI stateを運ばない。
- Sidebar overlay open stateはshell snapshotではない。
- Hydration triggerはshell snapshotではない。
- Note URLやbreadcrumbの契約はこの文書で再定義しない。
