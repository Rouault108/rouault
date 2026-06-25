# Sidebar Shell

## 概要

`ui-sidebar-shell`はRouault内部で使うsidebar surface primitiveです。
汎用public componentとしての拡張性より、現在の責務境界を明確に保つことを優先します。

このcomponentが担うのは次だけです。

- `fixed` / `overlay`の表示面の切替
- overlay時のscrim
- Escape / scrim clickによるclose request
- overlay展開時の初期focus
- overlay格納時のfocus return
- 表示面のinert / visibility / animation coordination

このcomponentが担わないもの:

- mode自動判定
- breakpoint監視
- localStorage永続化
- router連携
- hydration timingの自己決定
- state source of truth

sidebar stateのownershipは [`docs/contracts/sidebar-state.md`](../../contracts/sidebar-state.md) を正本とします。

## 公開入力

| 名前                | 公開面                              | 既定値     | 内容                               |
| ------------------- | ----------------------------------- | ---------- | ---------------------------------- |
| `state`             | property / attribute (`data-state`) | `expanded` | 表示状態。`expanded` / `collapsed` |
| `mode`              | property / attribute                | `fixed`    | 表示モード。`fixed` / `overlay`    |
| `returnFocusTarget` | property                            | `null`     | overlay格納時にfocusを戻す対象  |

`mode="auto"`、`fixedBreakpoint`、永続化関連入力は現行契約に含めません。

## スロット

| 名前         | 内容                     |
| ------------ | ------------------------ |
| 既定スロット | ナビゲーション本文       |
| `header`     | overlay時の補助ヘッダー |

- `header`はoverlay時にだけ表示対象です
- fixed時は`header`を描画対象に含めません

## 公開メソッド

| 名前                 | 契約                                |
| -------------------- | ----------------------------------- |
| `expand(trigger?)`   | `state`を`expanded`へ更新する    |
| `collapse(trigger?)` | `state`を`collapsed`へ更新する   |
| `toggle(trigger?)`   | 現在stateに応じて開閉を切り替える |

- `trigger`はfocus return候補の記録に使います
- stateが変わらないno-opでは追加のstate-changeを発火しません

## 公開イベント

| 名前                       | detail            | bubbles | composed | 内容                           |
| -------------------------- | ----------------- | ------- | -------- | ------------------------------ |
| `ui-sidebar-state-change`  | `{ state, mode }` | `false` | `false`  | shell内stateが確定したこと  |
| `ui-sidebar-request-close` | `{ reason }`      | `false` | `false`  | 利用者操作によるclose request |

`reason`は`scrim`または`escape`です。

`ui-sidebar-state-settled`、`ui-sidebar-state-request-accepted`、`resolved-mode-change`などのeventは現行契約に含めません。

## DOM / Accessibility

- ルートは`nav`を持ち、`aria-label`は内部既定値で与えます
- collapsed時は`nav.inert = true`と`visibility: hidden`を併用します
- overlay展開時は最初のfocusable要素へ移動します
- overlay格納時は`returnFocusTarget`が有効ならそこへ戻します
- fixed時はscrimを表示しません

## テスト正本

- browser contract:
  [`test/browser/sidebar-shell.browser.test.ts`](../../../test/browser/sidebar-shell.browser.test.ts)
- Storybook docs:
  [`src/components/ui/sidebar-shell/sidebar-shell.stories.ts`](../../../src/components/ui/sidebar-shell/sidebar-shell.stories.ts)

Storybookは表示見本に限定し、契約の正本にはしません。
