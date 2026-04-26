# Toc コンポーネント契約書

## 1. 概要

本書は、`ui-toc`、`layout-toc`、`layout-toc-controller`、`TocActiveTracker`、`layout-toc-runtime-store`、`layout-toc-mobile-controller` の責務分担を定義します。

static-first 再設計後の `ui-toc` は純粋な view です。見出し抽出、現在地追跡、header 側への runtime state 共有、mobile panel 開閉は別レイヤで扱います。

## 2. 責務分担

### 2.2 `layout-toc-controller`

- SSR 済み desktop TOC nav を取得する
- `source-id` / `capabilities-json` を decode する
- tracker を接続する
- header 向け runtime snapshot を publish する
- mobile panel 用 clone nav を生成する

### 2.4 `layout-toc-runtime-store`

- `layout-toc-controller` が算出した runtime snapshot を `layout-header` へ共有する
- `ready` / `hasVisibleHeadings` / `activeId` を伝える

### 2.5 `layout-toc-mobile-controller`

- mobile panel の open / close / toggle を管理する
- return focus target を保持する
- TOC 内容そのものは保持しない

### 2.6 mobile TOC UX contract

mobile TOC を有効にするページでは、次を満たすこと。

- `max-width: 639px` では desktop TOC を隠す
- 旧 fixed summary bar は描画しない
- `layout-header` 内に trigger を描画する
- trigger は mobile TOC panel を開閉する導線として扱う
- trigger の可視文言は固定の `目次` とし、399px 以下では icon-only へ縮退する
- trigger 押下で `layout-toc-controller` の mobile panel が header 直下から開く
- panel は header を覆わない
- mobile panel header は視覚上 close button のみを持つ最小ヘッダーとする
- 現在見出し把握は active item 強調で成立させる
- `ui-toc` 自身の navigation label は `目次` とする
- close 後に trigger へ focus return できる

---

## 3. データ契約

### 3.1 `Heading`

| 名前              | 型                                     | 必須   | 内容           |
| ----------------- | -------------------------------------- | ------ | -------------- |
| `id`              | `string`                               | はい   | 見出し ID      |
| `text`            | `string`                               | はい   | 表示ラベル     |
| `level`           | `number`                               | はい   | 見出しレベル   |
| `scopeSelections` | `{ scopeId: string; value: string }[]` | いいえ | tab scope 条件 |

### 3.2 `TocCapabilities`

| 名前             | 型        | 内容                                      |
| ---------------- | --------- | ----------------------------------------- |
| `activeTracking` | `boolean` | 現在地追跡を有効化するか                  |
| `dynamicScopes`  | `boolean` | tab scope 連動が必要か                    |
| `mobilePanel`    | `boolean` | mobile TOC interactive surface を要するか |

build-time で決定し、`layout-toc-controller[capabilities-json]` へ渡します。
`mobilePanel` は mobile TOC panel の interactive capability を表し、旧 summary bar の再導入根拠にはしてはなりません。

---

## 4. `ui-toc` 公開契約

### 4.1 入力

| 名前       | 種別                               | 契約                         |
| ---------- | ---------------------------------- | ---------------------------- |
| `headers`  | property                           | 描画対象見出し。唯一のソース |
| `activeId` | property / attribute (`active-id`) | 現在アクティブな見出し ID    |

### 4.2 イベント

| 名前                   | detail                  | 契約                     |
| ---------------------- | ----------------------- | ------------------------ | ------------------------------------------------------------------------------ |
| `ui-toc-active-change` | `{ id, source: 'scroll' | 'click', index, total }` | `ui-toc` からの現在地通知。現実装で `ui-toc` 自身が発火するのは click 起因のみ |

### 4.3 DOM / Accessibility

- ルートは `nav`
- 各項目はネイティブ `<a>`
- アクティブ項目のみ `aria-current="location"`
- 見出しが空なら何も描画しない

### 4.4 Visual current state

TOC の現在地表示は、支援技術向けには `aria-current="location"`、視覚表現では left rail を主表現とする。現在地を `font-weight` のみに依存して表現してはならない。

`ui-toc` と SSR `.layout-toc` は同一実装ではない。`ui-toc` は Lit による interactive view であり、`.layout-toc` は SSR HTML に適用される static CSS 実装である。両者は selector grammar ではなく、同じ `--toc-*` token recipe と current visual grammar を共有する。

- `ui-toc` は `.is-active` を current selector の正本とする
- SSR `.layout-toc` は runtime / test / 互換のため `.is-active` と `[data-active='true']` の両方を受ける

視覚契約:

- 現在地の主表現は細い left rail とする
- active background と foreground change は補助表現とする
- active font weight は `--toc-item-font-weight-active` を通し、固定の太字へ依存しない
- font-weight fallback は `var(--font-normal, 400)` を経由する
- line-height fallback は `var(--line-height-normal, 1.5)` を経由する
- focus-visible radius fallback は `var(--radius-sm, 4px)` を経由する
- hover / focus / active surface の bleed は `--toc-item-surface-bleed-inline-start` を使う
- hover の識別正本は foreground change と pointer feedback とする
- focus-visible の識別正本は current とは独立した outline とする
- active item に hover または focus-visible が重なった場合、current surface と active foreground を優先する
- 通常表示でも forced-colors でも、active item に hover / focus-visible が重なった場合は active foreground を維持する
- TOC link は navigation surface として扱い、通常・hover・focus・current のいずれでも下線を出さない

forced-colors 契約:

- inactive item は `CanvasText` とする
- current item は `Highlight` foreground と `Highlight` rail で識別する
- inactive item に `GrayText` や `LinkText` を使わず、dead declaration としても残さない
- active / hover / focus background surface に依存せず、`::after` は transparent にする
- current rail border は `var(--border-width, 1px)` を使い、`--border-width-thick` に依存しない
- `--border-width-thick` の禁止は forced-colors rail `border` declaration に限定する

motion 契約:

- `.layout-toc` には現時点で transition を導入しない
- `ui-toc` の reduced-motion では `.toc-link`、`.toc-link::before`、`.toc-link::after` の transition を短縮する
- `ui-toc` の reduced-motion では `.toc-link:focus-visible` の animation を無効化する

CSS contract test の初期制約として、hover / focus-visible surface selector は明示 selector として書く。この制約は helper の単純性のためであり、semantic selector matching を導入した場合は緩和してよい。

---

## 5. note TOC と hydration

契約:

- TOC presence は note page projection の `tocPresence` で決まり、`headings.length === 0` のときは `absent` とする
- `tocPresence='absent'` の note page では TOC DOM、TOC JSON script、`data-hydration-scope="note-toc"` を出力しない
- note page では SSR の `<nav class="layout-toc">` を正本にする
- `layout-toc-controller` は `capabilities-json` を持つ
- `activeTracking` / `dynamicScopes` / `mobilePanel` のいずれかが true の場合だけ hydration directive を持つ
- static-only TOC は SSR 出力だけで成立させる
- SSR 層は request URL の hash を正本として current state を出力しない
- current state は hydration 後の `layout-toc-controller` が visible headings と hash を照合して決定する

presence と hydration は分離する。

- `absent`: headings 0 件。TOC host 自体を出さない
- `present-static`: headings 1 件以上かつ interactive capability なし。SSR のみで成立
- `present-interactive`: headings 1 件以上かつ interactive capability あり。SSR nav 後に `layout-toc-controller` を hydrate する

`toc.shouldHydrate` は current DOM 同期の前提であり、scroll tracking の有効化条件そのものではない。

- `activeTracking=true` の場合、scroll による active 更新を行う
- `dynamicScopes=true` の場合、visible headings の変化に応じて TOC と current state を同期する
- `mobilePanel=true` の場合、desktop nav と mobile panel clone の current state を同期する
- `activeTracking=false` でも、hash、初期 visible heading、dynamic scope、mobile panel clone の整合のために active state が同期される場合がある
- scroll による active 更新は `activeTracking=true` の場合に限る

hydration 後の current DOM 契約:

- active id 解決と nav ごとの current DOM 解決は分けて扱う
- visible headings が空の場合、current state は存在しない
- active id が空文字列の場合、current state は存在しない
- hash が visible headings 外であっても、visible headings が 1 件以上ある場合は先頭 visible heading へ fallback してよい
- desktop nav / mobile panel nav の各 nav 内に active id 対応 link が存在する場合、その link のみに `.is-active`、`data-active="true"`、`aria-current="location"` を同期する
- active item 以外からは `.is-active`、`data-active`、`aria-current` を削除する
- 各 nav 内に active id 対応 link が存在しない場合、その nav では current state を持たない
- mobile panel clone も current DOM 契約の対象であり、open / close により stale current state を残してはならない

---

## 6. tabs 連動

build-time で `ui-tabs[data-toc-scope]` を注釈し、見出し側へ `scopeSelections` を持たせます。

runtime 契約:

- `ui-tabs` は `ui-tab-change.detail.scopeId` を発火する
- tracker は tabs の内部 DOM 構造ではなく `scopeId` と scope snapshot helper を使う
- hidden tab 内の hash 対象見出しに遷移するときは、対応する tab を先に選択してから TOC を同期する

---

## 7. テスト固定範囲

- `ui-toc` が `activeId` だけで表示を更新すること
- scoped heading が build-time で抽出されること
- `layout-toc-controller` が capability ありのときだけ hydrate すること
- `tocPresence='absent'` では TOC DOM と hydration scope が出ないこと
- mobile TOC trigger が 639px 以下でのみ現れ、固定ラベル `目次` または icon-only を表示すること
- mobile panel header が視覚タイトルを持たず close-only であること
- `ui-toc` が navigation label `目次` を持つこと
- current heading は active item 強調で把握できること
- mobile panel が header の直下から開くこと
- close 後に trigger へ focus return できること
