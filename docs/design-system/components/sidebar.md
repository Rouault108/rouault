# Sidebar

## 概要

`ui-sidebar`は`ui-sidebar-shell`と`ui-file-tree`を束ねるsidebar hostです。
責務は、sidebarという公開面に必要な最小限の統合に限定します。

Rouaultのnote sidebar正本は`layout-sidebar`配下のserver-first light DOM navigationです。
したがって`ui-sidebar`はnote sidebarのcorrectnessを所有せず、汎用sidebar hostとして扱います。

担うもの:

- shellへのstate / mode反映
- file treeへのitems / selected / expandedの反映
- shell eventとtree eventの再送出
- `heading`と`header-actions`によるoverlay補助ヘッダー

担わないもの:

- mode自動判定
- localStorage永続化
- route遷移との結合
- tree expanded stateのsource of truth
- overlay stateのsource of truth

state ownershipの正本は [`docs/contracts/sidebar-state.md`](../../contracts/sidebar-state.md) です。

## 公開入力

| 名前                | 公開面                               | 既定値           | 内容                         |
| ------------------- | ------------------------------------ | ---------------- | ---------------------------- |
| `state`             | property / attribute (`data-state`)  | `expanded`       | shellへ渡す開閉状態         |
| `mode`              | property / attribute                 | `fixed`          | shellへ渡す表示モード       |
| `items`             | property                             | `[]`             | file tree項目               |
| `loading`           | property / attribute                 | `false`          | file tree読み込み状態       |
| `selectedId`        | property / attribute (`selected-id`) | `null`           | 現在選択中の項目ID          |
| `expandedIds`       | property                             | `new Set()`      | 展開中branchのID集合     |
| `density`           | property / attribute                 | `normal`         | file tree密度               |
| `variant`           | property / attribute                 | `default`        | file tree見た目             |
| `heading`           | property / attribute                 | `ナビゲーション` | overlay補助ヘッダーの見出し |
| `returnFocusTarget` | property                             | `null`           | shellへ渡すfocus return先 |

`fixedBreakpoint`、`focusedId`、`headingLevel`、`label`、`closable`、`mode="auto"`は現行契約に含めません。

## スロット

| 名前             | 内容                           |
| ---------------- | ------------------------------ |
| `header-actions` | overlayヘッダー右側の補助操作 |

- `header-actions`がある場合に限りoverlay補助ヘッダーを描画します
- `header-actions`が無い場合、`heading`だけではヘッダーを描画しません

## 公開メソッド

| 名前               | 契約                                |
| ------------------ | ----------------------------------- |
| `expand(trigger?)` | `state`を`expanded`に更新する    |
| `collapse()`       | `state`を`collapsed`に更新する   |
| `toggle(trigger?)` | 現在stateに応じて開閉を切り替える |

## 公開イベント

| 名前                       | detail             | bubbles | composed | 内容                         |
| -------------------------- | ------------------ | ------- | -------- | ---------------------------- |
| `ui-sidebar-state-change`  | `{ state, mode }`  | `false` | `false`  | shell state-changeの再送出  |
| `ui-sidebar-request-close` | `{ reason }`       | `true`  | `true`   | shell close requestの再送出 |
| `ui-sidebar-select`        | `{ id }`           | `true`  | `true`   | tree選択通知                |
| `ui-sidebar-toggle`        | `{ id, expanded }` | `true`  | `true`   | tree展開変更通知            |
| `ui-sidebar-active-change` | `{ id }`           | `true`  | `true`   | tree active item変更通知    |

`ui-sidebar-mode-change`、`ui-sidebar-expand`、`ui-sidebar-focus-change`は現行契約に含めません。

## 責務境界

- `ui-sidebar`はstateのsource of truthではありません
- overlay stateは上位のpresentation storeが所有します
- tree expanded stateは上位またはadapter層が所有します
- `ui-sidebar`はshellとtreeのthin wrapperとして扱います

## テスト正本

- browser contract:
  [`test/browser/sidebar.browser.test.ts`](../../../test/browser/sidebar.browser.test.ts)
- shell連携:
  [`test/browser/sidebar-shell.browser.test.ts`](../../../test/browser/sidebar-shell.browser.test.ts)
- Storybook docs:
  [`src/components/ui/sidebar/sidebar.stories.ts`](../../../src/components/ui/sidebar/sidebar.stories.ts)

Storybookはdocs / smoke / manual-onlyに限定し、契約の正本にはしません。
