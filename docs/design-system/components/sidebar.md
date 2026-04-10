# Sidebar

## 概要

`ui-sidebar` は `ui-sidebar-shell` と `ui-file-tree` を束ねる sidebar host です。
責務は、sidebar という公開面に必要な最小限の統合に限定します。

担うもの:

- shell への state / mode 反映
- file tree への items / selected / expanded の反映
- shell event と tree event の再送出
- `heading` と `header-actions` による overlay 補助ヘッダー

担わないもの:

- mode 自動判定
- localStorage 永続化
- route 遷移との結合
- tree expanded state の source of truth
- overlay state の source of truth

state ownership の正本は
[`docs/sidebar-state-specification.md`](/Users/ruo/Desktop/Programing/rouault/docs/sidebar-state-specification.md)
です。

## 公開入力

| 名前 | 公開面 | 既定値 | 内容 |
| --- | --- | --- | --- |
| `state` | property / attribute (`data-state`) | `expanded` | shell へ渡す開閉状態 |
| `mode` | property / attribute | `fixed` | shell へ渡す表示モード |
| `items` | property | `[]` | file tree 項目 |
| `loading` | property / attribute | `false` | file tree 読み込み状態 |
| `selectedId` | property / attribute (`selected-id`) | `null` | 現在選択中の項目 ID |
| `expandedIds` | property | `new Set()` | 展開中 branch の ID 集合 |
| `density` | property / attribute | `normal` | file tree 密度 |
| `variant` | property / attribute | `default` | file tree 見た目 |
| `heading` | property / attribute | `ナビゲーション` | overlay 補助ヘッダーの見出し |
| `returnFocusTarget` | property | `null` | shell へ渡す focus return 先 |

`fixedBreakpoint`、`focusedId`、`headingLevel`、`label`、`closable`、`mode="auto"` は現行契約に含めません。

## スロット

| 名前 | 内容 |
| --- | --- |
| `header-actions` | overlay ヘッダー右側の補助操作 |

- `header-actions` がある場合に限り overlay 補助ヘッダーを描画します
- `header-actions` が無い場合、`heading` だけではヘッダーを描画しません

## 公開メソッド

| 名前 | 契約 |
| --- | --- |
| `expand(trigger?)` | `state` を `expanded` に更新する |
| `collapse()` | `state` を `collapsed` に更新する |
| `toggle(trigger?)` | 現在 state に応じて開閉を切り替える |

## 公開イベント

| 名前 | detail | bubbles | composed | 内容 |
| --- | --- | --- | --- | --- |
| `ui-sidebar-state-change` | `{ state, mode }` | `false` | `false` | shell state-change の再送出 |
| `ui-sidebar-request-close` | `{ reason }` | `true` | `true` | shell close request の再送出 |
| `ui-sidebar-select` | `{ id }` | `true` | `true` | tree 選択通知 |
| `ui-sidebar-toggle` | `{ id, expanded }` | `true` | `true` | tree 展開変更通知 |
| `ui-sidebar-active-change` | `{ id }` | `true` | `true` | tree active item 変更通知 |

`ui-sidebar-mode-change`、`ui-sidebar-expand`、`ui-sidebar-focus-change` は現行契約に含めません。

## 責務境界

- `ui-sidebar` は state の source of truth ではありません
- overlay state は上位の presentation store が所有します
- tree expanded state は上位または adapter 層が所有します
- `ui-sidebar` は shell と tree の thin wrapper として扱います

## テスト正本

- browser contract:
  [`test/browser/sidebar.browser.test.ts`](/Users/ruo/Desktop/Programing/rouault/test/browser/sidebar.browser.test.ts)
- shell 連携:
  [`test/browser/sidebar-shell.browser.test.ts`](/Users/ruo/Desktop/Programing/rouault/test/browser/sidebar-shell.browser.test.ts)
- Storybook docs:
  [`src/components/ui/sidebar/sidebar.stories.ts`](/Users/ruo/Desktop/Programing/rouault/src/components/ui/sidebar/sidebar.stories.ts)

Storybook は docs / smoke / manual-only に限定し、契約の正本にはしません。
