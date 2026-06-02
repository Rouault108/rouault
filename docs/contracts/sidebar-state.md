# Sidebar State Contract

## 1. Status

- Type: Normative
- Source of truth: `layout-sidebar` light DOM、sidebar coordinator、file tree tests
- Applies to: note sidebar の presentation state、tree state、route / shell projection state
- Non-goals: note URL 契約、`_config.json` 入力仕様、NavigationEnvelope sidebar schema 詳細

## 2. Ownership

### This Layer Owns

- Sidebar state を presentation state、tree state、route / shell projection state に分けること。
- `header[data-layout-header]` enhancer を command sender + snapshot consumer とすること。
- `layout-sidebar` を persistent coordinator host とすること。
- `ui-sidebar` / `ui-sidebar-shell` を表示・対話部品とすること。
- fixed / overlay の意味論と overlay layering。
- Sidebar 表示における branch label / page node label の使用面。

### This Layer Must Not Own

- `_config.json.label` の入力仕様。正本は `docs/contracts/content-config.md`。
- breadcrumb / directory-index / note identity における label 消費規則。正本は `docs/contracts/note-navigation.md`。
- `shell.sidebarProjection` payload field 詳細。正本は `docs/references/navigation-envelope-schema.md`。

## 3. Public Contract

### Inputs

- `layout-sidebar` light DOM の nav subtree。
- `NavigationEnvelope.shell.sidebarProjection`。
- User command from header / sidebar controls。

### Outputs

- Sidebar presentation state。
- Tree expanded state。
- Selected page node 表示。

### Events

- Header は command を送信し、sidebar の snapshot を消費する。
- Sidebar component は route state を router core へ押し戻さない。

### DOM Contract

- app shell 上の `layout-sidebar` host は 1 つだけである。
- `NoteLayout` は `layout-sidebar` を出力しない。
- route 遷移では host identity を維持し、server-first nav subtree を更新する。
- note sidebar の正本は `layout-sidebar` の light DOM nav subtree である。
- `source-id` は note sidebar の public contract ではない。

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

- overlay state と tree expanded state を混在させてはならない。
- `TreeNode.id` と表示 label を混同してはならない。
- Sidebar host を route ごとに再生成してはならない。

## 5. Failure Semantics

- projection が欠落した場合、server-first nav subtree を優先して no-JS navigation を維持する。
- selected id が解決できない場合、tree 全体を壊さず selected 表示だけを省略する。

## 6. Integration Boundaries

### Build-time

- nav subtree と shell projection を生成する。

### SSR

- server-first navigation を出力する。

### Client Runtime

- `layout-sidebar` が coordinator host として state を保持する。

### Hydration

- Hydration trigger は sidebar component ではなく scheduler / registry が所有する。

### Tests

- Host identity、nav subtree 更新、overlay/tree state 分離を browser/e2e で検証する。

## 7. Acceptance Criteria

- Sidebar host が app shell 上に 1 つだけ存在する。
- route 遷移で host identity が維持される。
- presentation state、tree state、route projection state が分離されている。
- label の入力仕様、breadcrumb 消費規則、sidebar 表示規則が別文書で分離されている。
