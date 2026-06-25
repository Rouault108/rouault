# Sidebar State Contract

## 1. Status

- Type: Normative
- Source of truth: `layout-sidebar` light DOM、sidebar coordinator、file tree tests
- Applies to: note sidebarのpresentation state、tree state、route / shell projection state
- Non-goals: note URL契約、`_config.json`入力仕様、NavigationEnvelope sidebar schema詳細

## 2. Ownership

### This Layer Owns

- Sidebar stateをpresentation state、tree state、route / shell projection stateに分けること。
- `header[data-layout-header]` enhancerをcommand sender + snapshot consumerとすること。
- `layout-sidebar`をpersistent coordinator hostとすること。
- `ui-sidebar` / `ui-sidebar-shell`を表示・対話部品とすること。
- fixed / overlayの意味論とoverlay layering。
- Sidebar表示におけるbranch label / page node label の使用面。

### This Layer Must Not Own

- `_config.json.label`の入力仕様。正本は`docs/contracts/content-config.md`。
- breadcrumb / directory-index / note identityにおけるlabel消費規則。正本は`docs/contracts/note-navigation.md`。
- `shell.sidebarProjection` payload field詳細。正本は`docs/references/navigation-envelope-schema.md`。

## 3. Public Contract

### Inputs

- `layout-sidebar` light DOMのnav subtree。
- `NavigationEnvelope.shell.sidebarProjection`。
- User command from header / sidebar controls。

### Outputs

- Sidebar presentation state。
- Tree expanded state。
- Selected page node表示。

### Events

- Headerはcommandを送信し、sidebarのsnapshotを消費する。
- Sidebar componentはroute stateをrouter coreへ押し戻さない。

### DOM Contract

- app shell上の`layout-sidebar` hostは1つだけである。
- `NoteLayout`は`layout-sidebar`を出力しない。
- route遷移ではhost identityを維持し、server-first nav subtreeを更新する。
- note sidebarの正本は`layout-sidebar`のlight DOM nav subtreeである。
- `source-id`はnote sidebarのpublic contractではない。

## 4. State Model

### Durable State

- Tree state。
- Route / shell projection state。

### Ephemeral State

- Overlay open / closed。
- Focus and transient interaction state。

### Derived State

- Structural expanded ids。
- Selected id。
- Fixed / overlay mode。

### Forbidden Coupling

- overlay stateとtree expanded stateを混在させてはならない。
- `TreeNode.id`と表示labelを混同してはならない。
- Sidebar hostをrouteごとに再生成してはならない。

## 5. Failure Semantics

- projectionが欠落した場合、server-first nav subtreeを優先してno-JS navigationを維持する。
- selected idが解決できない場合、tree全体を壊さずselected表示だけを省略する。

## 6. Integration Boundaries

### Build-time

- nav subtreeとshell projectionを生成する。

### SSR

- server-first navigationを出力する。

### Client Runtime

- `layout-sidebar`がcoordinator hostとしてstateを保持する。

### Hydration

- Hydration triggerはsidebar componentではなくscheduler / registryが所有する。

### Tests

- Host identity、nav subtree更新、overlay/tree state分離をbrowser/e2e で検証する。

## 7. Acceptance Criteria

- Sidebar hostがapp shell上に1つだけ存在する。
- route遷移でhost identityが維持される。
- presentation state、tree state、route projection stateが分離されている。
- labelの入力仕様、breadcrumb消費規則、sidebar表示規則が別文書で分離されている。
