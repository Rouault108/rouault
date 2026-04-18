# Sidebar State Specification

## 1. 目的

本書は、Rouault の note sidebar における state ownership と DOM 契約を固定するための仕様です。

2026-04 の移行以降、note sidebar の正本は `layout-sidebar` の light DOM に置かれる
server-first navigation とします。note sidebar は `items-json` に依存せず、
server nav subtree を唯一正本とします。

対象は `layout-header` / `layout-sidebar` / `ui-sidebar` / `ui-sidebar-shell` と、
それらを接続する presentation store です。

## 2. source of truth

Rouault の sidebar state は 1 系統ではなく、次の 3 系統に分離します。

### 2.1 presentation state

presentation state の source of truth は
[`src/components/layout/layout-sidebar-controller.ts`](../src/components/layout/layout-sidebar-controller.ts)
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
[`src/components/layout/layout-sidebar-tree-state.ts`](../src/components/layout/layout-sidebar-tree-state.ts)
です。

この state が所有するもの:

- 手動操作で確定した `expandedIds`
- tree 展開状態の永続化

この state の内部原則:

- persisted state の scope は `sidebarId + stateScopeId`
- note sidebar の初回 HTML は server-first nav を正本とする
- route 由来の祖先展開は `initial-expanded-ids` として受け取り、保存済み state が存在しない初回だけ seed として使う
- current path の表示は `data-current-branch="true"` で表し、expanded state と混同しない

## 3. ownership boundary

### 3.1 `layout-header`

[`src/components/layout/layout-header.ts`](../src/components/layout/layout-header.ts)
は command sender + snapshot consumer です。

持ってよい責務:

- sidebar toggle の dispatch
- store snapshot に基づく toggle 表示

持ってはいけない責務:

- viewport 判定
- `matchMedia` fallback
- sidebar state の独自推定

### 3.2 `layout-sidebar`

[`src/components/layout/layout-sidebar.ts`](../src/components/layout/layout-sidebar.ts)
は persistent coordinator host です。

持ってよい責務:

- server nav light DOM の保持と route ごとの差し替え
- `state-scope-id` に基づく tree state の読み書き
- 保存済み state が無い場合に限った `initial-expanded-ids` の seed 適用
- `data-current-branch` を含む server nav subtree の差し替え
- presentation store snapshot の反映

持ってはいけない責務:

- overlay state の ownership
- breakpoint 判定ロジック
- header 相当の open / close policy の決定
- `selectedId` 変更時の localStorage 再読込

### 3.3 `ui-sidebar` / `ui-sidebar-shell`

[`src/components/ui/sidebar/sidebar.ts`](../src/components/ui/sidebar/sidebar.ts)
と
[`src/components/ui/sidebar-shell/sidebar-shell.ts`](../src/components/ui/sidebar-shell/sidebar-shell.ts)
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

app shell 上の sidebar host は 1 実体だけです。

- persistent host は `BaseLayout` / `app-router` 直下に 1 個だけ配置する
- `NoteLayout` は本文と TOC のみを描画し、`<layout-sidebar>` を本文内へ出力しない
- fixed / overlay の二重 custom element を出力しない
- `.layout-sidebar-col` は DOM 上に常に 1 本だけ存在する

note sidebar の public DOM 契約は次を正本とします。

- `layout-sidebar` host の恒久 identity
- host 内 light DOM の server-first nav 実体
- `state-scope-id`
- `selected-id`
- `initial-expanded-ids`
- `topology-revision`
- `sidebar-id`
- `heading`（optional。未指定時は visible heading を描画しない）
- `fixed-breakpoint`
- `presentation`

`source-id` は note sidebar の public contract に含めません。

補足:

- note sidebar では `heading` を省略してよい。省略時、landmark 名は `aria-label` 側を正本とし、visible heading は描画しない
- `heading` は表示用オプションであり、navigation artifact / shell projection では `null` を許容する
- DOM attribute 境界では `null` / `undefined` を attribute absence として扱い、component 内部では必要に応じて空文字へ正規化する
- note 間遷移では `state-scope-id="note-navigation"` を維持する
- route 遷移では host を再生成せず、必要時のみ nav subtree と route 由来属性を更新する
- sidebar host の DOM 実体は app shell 上で再生成しない

### 6.1 overlay layering 契約

狭幅 viewport で note sidebar が `overlay` mode の場合、sidebar surface は本文カラムより前面に描画されなければならない。

この契約で固定する事項:

- overlay sidebar surface は `main#main-content` より前面に出る
- overlay scrim は本文および補助カラムより前面に出る
- overlay surface / scrim の重なり順は、sidebar shell 単体の `z-index` だけに依存してはならない
- overlay surface を保持する host 側の stacking context も含めて、本文より前面になることを保証しなければならない
- narrow viewport で `.layout-sidebar-col` を 0px track へ畳む場合でも、overlay surface の前面表示契約は維持されなければならない

禁止事項:

- overlay sidebar surface が `main#main-content` の内容に視覚的に貫通されること
- sticky / transform / containing block の副作用により、overlay surface が viewport overlay として振る舞わなくなること
- mobile overlay の成立を偶然の DOM 順序に依存させること

## 7. 受け入れ条件

次を満たすとき、本仕様は守られているとみなします。

1. header toggle が presentation store 経由でのみ sidebar を開閉する
2. `layout-header` が viewport 判定を持たない
3. `layout-sidebar` が overlay state を所有しない
4. tree expanded state が別責務として維持される
5. SSR 出力に sidebar host が 1 個だけ存在する
6. narrow viewport で sidebar が `overlay` mode のとき、sidebar surface と scrim が `main#main-content` より前面に描画される
7. mobile で sidebar を開いたとき、本文見出し・本文ブロック・TOC が overlay sidebar surface の上に視覚的に重ならない