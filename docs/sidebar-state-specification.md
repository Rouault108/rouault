# Sidebar State Specification

## 1. 目的

本書は、Rouault の note sidebar における state ownership と DOM 契約を固定するための仕様です。

対象は `layout-header` / `layout-sidebar` / `ui-sidebar` / `ui-sidebar-shell` と、
それらを接続する presentation store です。

## 2. source of truth

Rouault の sidebar state は 1 系統ではなく、次の 2 系統に分離します。

### 2.1 presentation state

presentation state の source of truth は
[`src/components/layout/layout-sidebar-controller.ts`](/Users/ruo/Desktop/Programing/rouault/src/components/layout/layout-sidebar-controller.ts)
のみです。

この state が所有するもの:

- `mode: 'fixed' | 'overlay'`
- `overlayState: 'expanded' | 'collapsed'`
- `returnFocusTarget`
- breakpoint 監視
- overlay state の永続化
- `open` / `close` / `toggle`

この state が所有しないもの:

- file tree の `expandedIds`
- selected note に応じた ancestor 展開

### 2.2 tree state

tree state の source of truth は
[`src/components/layout/layout-sidebar-tree-state.ts`](/Users/ruo/Desktop/Programing/rouault/src/components/layout/layout-sidebar-tree-state.ts)
です。

この state が所有するもの:

- `expandedIds`
- selected note の ancestor 展開
- tree 展開状態の永続化

## 3. ownership boundary

### 3.1 `layout-header`

[`src/components/layout/layout-header.ts`](/Users/ruo/Desktop/Programing/rouault/src/components/layout/layout-header.ts)
は command sender + snapshot consumer です。

持ってよい責務:

- sidebar toggle の dispatch
- store snapshot に基づく toggle 表示

持ってはいけない責務:

- viewport 判定
- `matchMedia` fallback
- sidebar state の独自推定

### 3.2 `layout-sidebar`

[`src/components/layout/layout-sidebar.ts`](/Users/ruo/Desktop/Programing/rouault/src/components/layout/layout-sidebar.ts)
は render host + data adapter です。

持ってよい責務:

- items 読み込み
- tree state の読み書き
- presentation store snapshot の反映

持ってはいけない責務:

- overlay state の ownership
- breakpoint 判定ロジック
- header 相当の open / close policy の決定

### 3.3 `ui-sidebar` / `ui-sidebar-shell`

[`src/components/ui/sidebar/sidebar.ts`](/Users/ruo/Desktop/Programing/rouault/src/components/ui/sidebar/sidebar.ts)
と
[`src/components/ui/sidebar-shell/sidebar-shell.ts`](/Users/ruo/Desktop/Programing/rouault/src/components/ui/sidebar-shell/sidebar-shell.ts)
は表示・対話部品です。

`ui-sidebar-shell` は Rouault 内部 primitive として扱います。public 汎用部品としての後方互換は優先しません。

## 4. mode / state semantics

- `fixed` mode の見かけ上の state は常に `expanded`
- 実永続化対象は overlay state のみ
- route select 時の collapse policy は overlay のみ
- fixed mode では route select によって collapse しない

## 5. persistence

overlay state の persistence key は 1 つだけです。

- key: `rouault.note-sidebar.overlay-state`

tree expanded state は別 key / 別モジュールで扱います。presentation store に混在させません。

## 6. DOM 契約

NoteLayout 上の sidebar host は 1 実体だけです。

- `NoteLayout` に `<layout-sidebar>` は 1 個だけ出力する
- fixed / overlay の二重 custom element を出力しない
- `.layout-sidebar-col` は DOM 上に常に 1 本だけ存在する

## 7. 受け入れ条件

次を満たすとき、本仕様は守られているとみなします。

1. header toggle が presentation store 経由でのみ sidebar を開閉する
2. `layout-header` が viewport 判定を持たない
3. `layout-sidebar` が overlay state を所有しない
4. tree expanded state が別責務として維持される
5. SSR 出力に sidebar host が 1 個だけ存在する
