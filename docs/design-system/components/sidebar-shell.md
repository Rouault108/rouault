# Sidebar Shell

## 概要

`ui-sidebar-shell` は Rouault 内部で使う sidebar surface primitive です。
汎用 public component としての拡張性より、現在の責務境界を明確に保つことを優先します。

この component が担うのは次だけです。

- `fixed` / `overlay` の表示面の切替
- overlay 時の scrim
- Escape / scrim click による close request
- overlay 展開時の初期 focus
- overlay 格納時の focus return
- 表示面の inert / visibility / animation coordination

この component が担わないもの:

- mode 自動判定
- breakpoint 監視
- localStorage 永続化
- router 連携
- hydration timing の自己決定
- state source of truth

sidebar state の ownership は
[`docs/sidebar-state-specification.md`](../../sidebar-state-specification.md)
を正本とします。

## 公開入力

| 名前                | 公開面                              | 既定値     | 内容                               |
| ------------------- | ----------------------------------- | ---------- | ---------------------------------- |
| `state`             | property / attribute (`data-state`) | `expanded` | 表示状態。`expanded` / `collapsed` |
| `mode`              | property / attribute                | `fixed`    | 表示モード。`fixed` / `overlay`    |
| `returnFocusTarget` | property                            | `null`     | overlay 格納時に focus を戻す対象  |

`mode="auto"`、`fixedBreakpoint`、永続化関連入力は現行契約に含めません。

## スロット

| 名前         | 内容                     |
| ------------ | ------------------------ |
| 既定スロット | ナビゲーション本文       |
| `header`     | overlay 時の補助ヘッダー |

- `header` は overlay 時にだけ表示対象です
- fixed 時は `header` を描画対象に含めません

## 公開メソッド

| 名前                 | 契約                                |
| -------------------- | ----------------------------------- |
| `expand(trigger?)`   | `state` を `expanded` へ更新する    |
| `collapse(trigger?)` | `state` を `collapsed` へ更新する   |
| `toggle(trigger?)`   | 現在 state に応じて開閉を切り替える |

- `trigger` は focus return 候補の記録に使います
- state が変わらない no-op では追加の state-change を発火しません

## 公開イベント

| 名前                       | detail            | bubbles | composed | 内容                           |
| -------------------------- | ----------------- | ------- | -------- | ------------------------------ |
| `ui-sidebar-state-change`  | `{ state, mode }` | `false` | `false`  | shell 内 state が確定したこと  |
| `ui-sidebar-request-close` | `{ reason }`      | `false` | `false`  | 利用者操作による close request |

`reason` は `scrim` または `escape` です。

`ui-sidebar-state-settled`、`ui-sidebar-state-request-accepted`、`resolved-mode-change` などの event は現行契約に含めません。

## DOM / Accessibility

- ルートは `nav` を持ち、`aria-label` は内部既定値で与えます
- collapsed 時は `nav.inert = true` と `visibility: hidden` を併用します
- overlay 展開時は最初の focusable 要素へ移動します
- overlay 格納時は `returnFocusTarget` が有効ならそこへ戻します
- fixed 時は scrim を表示しません

## テスト正本

- browser contract:
  [`test/browser/sidebar-shell.browser.test.ts`](../../../test/browser/sidebar-shell.browser.test.ts)
- Storybook docs:
  [`src/components/ui/sidebar-shell/sidebar-shell.stories.ts`](../../../src/components/ui/sidebar-shell/sidebar-shell.stories.ts)

Storybook は表示見本に限定し、契約の正本にはしません。
