# Rouault Patterns

## 概要

本書は、Rouault における**横断的な実装パターン**を整理するものです。対象は主に次の5領域です。

1. **Link分類**
2. **selected / current / active / focused の使い分け**
3. **Overlay の設計**
4. **URL同期**
5. **恒久的リンク**

本書は理想論ではなく、**現状実装で既に採用されている契約と、その運用上の読み方**を明文化することを目的とします。

## 目次

1. [Link分類](#1-link分類)
   - [基本原則](#11-基本原則)
   - [Text Link](#12-text-link)
   - [Control Link](#13-control-link)
   - [既存バリアント](#14-既存バリアント)
   - [Sidebar 専用の扱い](#15-sidebar-専用の扱い)
   - [current 表示と Link の関係](#16-current-表示と-link-の関係)
   - [Block Link](#17-block-link)
   - [Router との境界](#18-router-との境界)
2. [selected / current / active / focused の使い分け](#2-selected--current--active--focused-の使い分け)
   - [基本整理](#21-基本整理)
   - [Tabs](#22-tabs)
   - [TOC](#23-toc)
   - [Breadcrumbs](#24-breadcrumbs)
   - [Sidebar / File Tree](#25-sidebar--file-tree)
   - [Control Link 系の current](#26-control-link-系の-current)
   - [active と focused を混同しない](#27-active-と-focused-を混同しない)
   - [実務ルール](#28-実務ルール)
3. [Overlay パターン](#3-overlay-パターン)
   - [Overlay の分類](#31-overlay-の分類)
   - [共通契約](#32-共通契約)
   - [Dialog](#33-dialog)
   - [Search Dialog](#34-search-dialog)
   - [Popover](#35-popover)
   - [Sidebar Overlay](#36-sidebar-overlay)
   - [Z-index 階層](#37-z-index-階層)
   - [実務ルール](#38-実務ルール)
4. [URL同期](#4-url同期)
   - [基本原則](#41-基本原則)
   - [Tabs の URL同期](#42-tabs-の-url同期)
   - [Primary tab only navigation](#43-primary-tab-only-navigation)
   - [Search page の URL同期](#44-search-page-の-url同期)
   - [検索結果 URL の正規化](#45-検索結果-url-の正規化)
   - [Router の URL正規化](#46-router-の-url正規化)
   - [Router が介入しないリンク](#47-router-が介入しないリンク)
   - [実務ルール](#48-実務ルール)
5. [恒久的リンク](#5-恒久的リンク)
   - [基本原則](#51-基本原則)
   - [Canonical URL と Permanent URL の役割分担](#52-canonical-url-と-permanent-url-の役割分担)
   - [URL同期との違い](#53-url同期との違い)
   - [ハッシュ契約](#54-ハッシュ契約)
   - [衝突と再利用](#55-衝突と再利用)
   - [UI 契約](#56-ui-契約)
   - [Router との関係](#57-router-との関係)
   - [実務ルール](#58-実務ルール)
6. [横断ルール](#6-横断ルール)
   - [Link分類と selected / current を混ぜない](#61-link分類と-selected--current-を混ぜない)
   - [Overlay は「開くこと」より「閉じたあと」を先に決める](#62-overlay-は開くことより閉じたあとを先に決める)
   - [URL同期は source of truth を1つにする](#63-url同期は-source-of-truth-を1つにする)
7. [実装チェックリスト](#7-実装チェックリスト)
   - [新しいリンクを追加するとき](#71-新しいリンクを追加するとき)
   - [新しい current 状態を追加するとき](#72-新しい-current-状態を追加するとき)
   - [新しい Overlay を追加するとき](#73-新しい-overlay-を追加するとき)
   - [新しい URL同期を追加するとき](#74-新しい-url同期を追加するとき)
   - [恒久的リンクを扱うとき](#75-恒久的リンクを扱うとき)

---

## 対象範囲

本書の整理は、主に次の実装を基準とします。

- `src/styles/contracts/link-styles.ts`
- `src/assets/css/main.css`
- `src/components/ui/tabs/*`
- `src/lib/tabs/*`
- `src/components/ui/sidebar-shell/sidebar-shell.ts`
- `src/components/ui/sidebar/sidebar.ts`
- `src/components/ui/file-tree/file-tree.ts`
- `src/components/ui/tree-item/tree-item.ts`
- `src/components/ui/toc/toc.ts`
- `src/components/ui/breadcrumbs/breadcrumbs.ts`
- `src/components/ui/dialog/dialog.ts`
- `src/components/ui/dialog/dialog-helpers.ts`
- `src/components/ui/popover/popover.ts`
- `src/components/ui/search-dialog/*`
- `src/components/search/search-page.ts`
- `src/lib/router/browser-link-interceptor.ts`
- `src/lib/router/location-adapter.ts`
- `src/lib/search/search-url.ts`
- `src/lib/search/document-url.ts`
- `lib/content/build-sidebar-tree.ts`
- `lib/content/build-breadcrumbs.ts`

---

## 1. Link分類

### 1.1 基本原則

Rouault では、リンクを「`a` 要素であるかどうか」ではなく、**何のためのリンクか**で分類します。

中心となる分類は、次の2系統です。

| 分類             | 主用途                     | 代表クラス                      | 非色シグナル                          | 主な適用先                             |
| ---------------- | -------------------------- | ------------------------------- | ------------------------------------- | -------------------------------------- |
| **Text Link**    | 読み物中の本文リンク       | `.link-text` / `.prose a[href]` | **常時下線**                          | 記事本文、本文内タグ、本文内参照       |
| **Control Link** | UI構造内の移動・操作リンク | `.link-control` / `.ui-link`    | 行構造、配置、current表示、focus ring | サイドバー、カード、補助ナビゲーション |

Rouault の要点は、**本文リンクとUIリンクを同じ見た目にしない**ことです。本文リンクは読む流れを壊さないことを優先し、UIリンクは構造内の操作対象であることを優先します。

### 1.2 Text Link

Text Link は、次の契約を持ちます。

| 項目     | 契約                                                  |
| -------- | ----------------------------------------------------- |
| 基本色   | `var(--fg-default)`                                   |
| 識別手段 | **常時下線**                                          |
| hover    | テキスト色と下線色を `primary-hover` に寄せる         |
| focus    | テキスト色は維持し、`focus-visible` リングで示す      |
| visited  | 既読色で分岐しない                                    |
| touch    | 発見可能性を優先し、テキスト自体も `primary` に寄せる |

現状では `.prose a[href]:not(.heading-anchor)` も同契約で扱われます。つまり、本文中では明示クラスがなくても Text Link 契約が自動適用されます。

### 1.3 Control Link

Control Link は**構造型リンク**です。常時下線は必須ではありません。

| 項目     | 契約                           |
| -------- | ------------------------------ |
| 基本色   | `var(--fg-default)`            |
| 基本装飾 | 下線なし                       |
| hover    | `primary` に変化し、下線を追加 |
| active   | `scale(var(--scale-pressed))`  |
| focus    | `focus-visible` リング         |
| visited  | 既読色で分岐しない             |

Control Link では、色以外の識別を**各コンポーネント側**で担保します。具体的には、次のような要素です。

- 行全体の形
- アイコン
- current 表示
- 枠線やインジケータ
- 配置コンテキスト

### 1.4 既存バリアント

現状の CSS では、Control Link 系に対してさらに次の運用バリアントがあります。

| バリアント | クラス                       | 用途                               |
| ---------- | ---------------------------- | ---------------------------------- |
| **Nav**    | `.ui-link` / `.link-control` | 標準のナビゲーションリンク         |
| **Action** | `.link-action`               | 作成、編集など操作誘導が強いリンク |
| **Subtle** | `.link-subtle`               | 日付、補助情報、メタデータ         |

`link-action` は初期状態から `primary` 系で表示されます。`link-subtle` は `fg-muted` を基準とし、hover で前景化します。

### 1.5 Sidebar 専用の扱い

`.sidebar` 配下の `ui-link` / `link-control` は、標準色ではなく **`fg-muted` 基準**になります。これはサイドバー全体のノイズを下げるための調整です。

一方で、現在地は `aria-current="page"` または `.is-active` により `primary` 化され、左インジケータが追加されます。

### 1.6 current 表示と Link の関係

Rouault では、**「現在地のリンク」**を単なる hover 色ではなく、別パターンとして扱います。

Control Link 系で current を表す条件は、次のとおりです。

- `aria-current="page"`
- `.is-active`

このとき現状の CSS では、次の表現が入ります。

- `color: var(--primary)`
- `font-weight: var(--font-medium)`
- `border-inline-start` による物理インジケータ
- `padding-inline-start` による余白補正

つまり Rouault では、**current は色だけでなく物理的な左インジケータを持つ**ことが基準です。

### 1.7 Block Link

Rouault には `card-link` による **Stretched Link** パターンがあります。

これはリンク自体ではなく、`::after` でクリック領域を面に広げるパターンです。

| 項目       | 契約                                        |
| ---------- | ------------------------------------------- |
| 適用先     | カード全体をクリック領域化したい場合        |
| 必須条件   | 親コンテナに `position: relative`           |
| focus 表示 | リンク自身ではなく親カードに委譲            |
| 注意       | 内部の別リンクやボタンは z-index 調整が必要 |

したがって、Rouault の Block Link は「面リンク」であっても、**フォーカスの責務はカード側に持たせる**設計です。

### 1.8 Router との境界

リンクが内部遷移として扱われるのは、`browser-link-interceptor.ts` の条件を満たす場合だけです。

router の公開契約そのものは `docs/router-specification.md` を正とし、本書では UI パターンに関係する境界だけを要約します。

内部遷移の対象は概ね次のとおりです。

- 同一 origin
- `http:` / `https:`
- `target` なし
- `download` なし
- `rel="external"` なし
- `data-no-router` なし

逆に、**同一ページ内の hash 移動のみ**で、`pathname + search` が同一の場合は、ルータが介入せずネイティブ挙動を維持します。これは TOC や見出しアンカーとの整合に重要です。

---

## 2. selected / current / active / focused の使い分け

### 2.1 基本整理

Rouault では、`selected` / `current` / `active` / `focused` は同義ではありません。

| 用語         | 意味                                 | 代表的な表現                                          |
| ------------ | ------------------------------------ | ----------------------------------------------------- |
| **selected** | ウィジェット内部で選択されている項目 | `aria-selected`, `selectedValue`, `TreeNode.selected` |
| **current**  | ナビゲーション上の現在地             | `aria-current="page"`, `aria-current="location"`      |
| **active**   | 現在注目中、または現在基準となる要素 | `activeId`, `_activeIndex`, active panel              |
| **focused**  | キーボードフォーカスが実際にある要素 | `tabindex=0`, DOM focus                               |

この4つは分離して扱う必要があります。

### 2.2 Tabs

Tabs は、**selected の典型**です。

現状の `ui-tabs` は、次の状態を持ちます。

| 状態               | 実装                                        |
| ------------------ | ------------------------------------------- |
| 公開選択値         | `selected-value`                            |
| 初期値             | `default-selected-value`                    |
| 内部選択位置       | `activeIndex`                               |
| 内部フォーカス位置 | `focusedIndex`                              |
| DOM表現            | `role="tab"` + `aria-selected` + `tabindex` |

解決順序は次のとおりです。

1. URL 由来の値
2. `selected-value`
3. `default-selected-value`（初回のみ）
4. 現在の `activeIndex`
5. fallback

ここで重要なのは、Tabs では**current ではなく selected を使う**ことです。Tabs はページ現在地ではなく、1つの composite widget の内部選択だからです。

### 2.3 TOC

TOC は、**current の典型**です。

`ui-toc` は `activeId` を持ちますが、描画上は次のように出し分けています。

- 現在の見出しリンクに `aria-current="location"`
- 状態源として `_activeIdSource = 'scroll' | 'click'`
- CSS クラスとして `.is-active`, `.is-scroll`, `.is-click`

つまり TOC の `activeId` は内部状態名ですが、**アクセシビリティ意味論としては current(location)** に落としています。

### 2.4 Breadcrumbs

Breadcrumbs は、最後の項目を current として扱います。

現状実装では、最後の要素はリンクではなく、次の形になります。

- `<span class="breadcrumb-node breadcrumb-current" aria-current="page">...`

中間項目は `href` がある場合だけリンクです。したがって Breadcrumbs では、**current は非リンクの終端要素**として表現されます。

また、視覚トークンは `.breadcrumb-node` に集約し、

- link: `<a class="breadcrumb-node breadcrumb-link" href="...">...`
- non-link intermediate: `<span class="breadcrumb-node breadcrumb-static">...`

のように role ごとの差分を上乗せします。

### 2.5 Sidebar / File Tree

Sidebar は少し特殊で、**見た目上の現在地**を `selected` で持ちます。

`build-sidebar-tree.ts` では、現在ノートを次のようにマーキングします。

- leaf note: `id = slug`
- directory-index: `id = ${directoryPath}/__index__`
- 現在ノード: `selected: true`

`ui-file-tree` / `ui-tree-item` 側では、この `selected` が `aria-selected` と同期されます。

同時に、**キーボードフォーカス位置**は `activeId` で別管理です。

| 概念           | Sidebar / File Tree での表現 |
| -------------- | ---------------------------- |
| 現在ページ     | `TreeNode.selected = true`   |
| フォーカス位置 | `activeId`                   |
| 展開状態       | `expanded`                   |

したがって Sidebar Tree では、「現在ページ」と「現在フォーカスされている行」は分離されています。

### 2.6 Control Link 系の current

通常のナビゲーションリンクでは、current は `aria-current="page"` で表します。

一方で Tree では、widget 選択モデルの都合により `aria-selected` が使われています。これは現状実装としては整合していますが、**Rouault 全体では current の表現が単一ではない**ことを意味します。

実装上は、次のように整理すると読みやすくなります。

- **ページナビゲーション一般**: `aria-current`
- **composite widget の内部選択**: `aria-selected`
- **tree 型ナビゲーション**: 現状は `selected` ベース

### 2.7 active と focused を混同しない

Rouault では、`active` が DOM focus を意味しない箇所が多くあります。

例:

- `ui-tabs`: `activeIndex` は選択中、`focusedIndex` は roving tabindex の現在位置
- `ui-toc`: `activeId` は現在見出しであり、DOM focus とは別
- `ui-file-tree`: `activeId` は tree 内の現在フォーカス対象IDであり、`selected` は現在ページ

したがって、**active を CSS の見た目名として使う場合でも、意味論は別途決める**必要があります。

### 2.8 実務ルール

新規実装では、次の判断基準を採用します。

| 問い                               | 採用すべき表現               |
| ---------------------------------- | ---------------------------- |
| これは widget 内の選択か           | `selected` / `aria-selected` |
| これはページや現在位置か           | `current` / `aria-current`   |
| これは内部アルゴリズム上の基準IDか | `activeId` / `activeIndex`   |
| これは実際の DOM focus か          | `tabindex`, `.focus()`       |

---

## 3. Overlay パターン

### 3.1 Overlay の分類

Rouault には Overlay が1種類ではなく、少なくとも次の4系統があります。

| 種別                 | 主実装                             | モーダル性                     | 主用途                      |
| -------------------- | ---------------------------------- | ------------------------------ | --------------------------- |
| **Dialog**           | `ui-dialog`                        | modal / non-modal 切替可       | 確認、設定、入力            |
| **Search Dialog**    | `ui-search-dialog`                 | modal                          | グローバル検索              |
| **Popover**          | `ui-popover`                       | non-modal                      | 補助情報、軽量な詳細表示    |
| **Sidebar Overlay**  | `ui-sidebar-shell[mode="overlay"]` | 画面上は半モーダル             | モバイルナビゲーション      |
| **TOC Mobile Panel** | `layout-toc` + `layout-header`        | non-modal / page-local overlay | mobile 見出しナビゲーション |

TOC の mobile UI は、header 内 trigger と、header 直下から開く page-local overlay panel の組で扱います。
旧 summary bar は採用しません。

### 3.2 共通契約

Overlay 系の現状実装には、次の共通パターンがあります。

#### 3.2.1 Trigger capture

開く直前にトリガー要素を記録し、閉じたときにそこへ戻します。

- `captureTrigger(...)`
- `restoreTriggerFocus(...)`

これは `ui-dialog` と `ui-search-dialog` で共通 helper 化されています。Sidebar Overlay も同じ考え方で `_triggerElement` を保持します。

#### 3.2.2 開閉を逐次実行する

Dialog / Sidebar では、`_operation: Promise<void>` による**逐次実行キュー**を持ちます。

これは、次のような競合を防ぐためです。

- 開きながら閉じる
- close animation 中の再 open
- modal モード切替中の競合

Rouault の Overlay は、**状態変更を同期的に見せても、内部では逐次化して破綻を防ぐ**方針です。

#### 3.2.3 アニメーション完了後に確定イベントを出す

`ui-dialog-opened` や `ui-dialog-closed`、Sidebar の state change などは、視覚状態の切替と整合する位置で発火されます。

つまり Rouault の Overlay イベントは、**属性変化の瞬間ではなく、UI として成立した時点**に寄せています。

### 3.3 Dialog

`ui-dialog` は Native `<dialog>` をラップします。

| 項目             | 現状契約                               |
| ---------------- | -------------------------------------- |
| 開く             | `showModal()` または `show()`          |
| 閉じる           | close animation 後に `dialog.close()`  |
| accessible name  | `title-id` または `aria-label` が必須  |
| body scroll lock | `data-ui-dialog-open`                  |
| focus return     | トリガーへ戻す                         |
| Escape           | modal / non-modal の条件に応じて close |

特に重要なのは、Rouault では Dialog が**常に body scroll lock と trigger focus return を伴う**ことです。

### 3.4 Search Dialog

`ui-search-dialog` は `ui-dialog` の単なる見た目違いではなく、**専用の modal Overlay** として設計されています。

| 項目             | 現状契約                               |
| ---------------- | -------------------------------------- |
| 基盤             | Native `<dialog>`                      |
| body scroll lock | `data-ui-search-dialog-open`           |
| 初期フォーカス   | 検索フィールド                         |
| close 手段       | close button / backdrop / cancel / Esc |
| 選択モデル       | listbox + active option                |

Search Dialog は Overlay であると同時に、**検索中の操作文脈**を持つため、focus return と body lock を dialog helper 群で共有しています。

### 3.5 Popover

`ui-popover` は非モーダル Overlay です。

| 項目             | 現状契約                                  |
| ---------------- | ----------------------------------------- |
| API              | Popover API を優先し、未対応時は fallback |
| role             | `dialog`                                  |
| `aria-modal`     | `false`                                   |
| 位置決め         | Floating UI (`computePosition`)           |
| クリック外閉じ   | fallback 時は document listener           |
| body scroll lock | なし                                      |
| focus return     | close 時に trigger へ戻せる               |

Popover は Dialog と違い、**body をロックしない**ことが本質です。また、`aria-haspopup="dialog"` を trigger 側に自動補完します。

### 3.6 Sidebar Overlay

`ui-sidebar-shell` は `mode="fixed" | "overlay"` を持ち、overlay 時には次が有効になります。

- `nav` が fixed 配置される
- `scrim` が表示される
- `z-index: var(--z-modal)`
- collapse 時に trigger へ focus return
- expanded 時に最初の focusable 要素へ focus 移動
- Esc で閉じる

つまり Sidebar Overlay は、**ナビゲーション専用の軽量 modal-like overlay** です。Dialog とは別実装ですが、focus capture / focus return / scrim / close on Esc という意味では近い振る舞いを持ちます。

### 3.7 Z-index 階層

現状トークンは、次の順です。

| Token          |  値 | 用途                |
| -------------- | --: | ------------------- |
| `--z-backdrop` | 200 | scrim / backdrop    |
| `--z-modal`    | 300 | sidebar overlay 等  |
| `--z-popover`  | 400 | popover、浮動トグル |
| `--z-toast`    | 500 | toast               |

設計上の読み方としては、**modal より popover が上**です。これは一般的な慣例と逆転し得ますが、現状トークンとしてはそうなっています。

したがって、新規 Overlay 実装では、トークン階層を前提に**どの Overlay がどれを跨げるか**を先に決める必要があります。

### 3.8 実務ルール

| 要件                                   | 採用すべき Overlay                  |
| -------------------------------------- | ----------------------------------- |
| 操作フローを止める                     | `ui-dialog`                         |
| 検索UI                                 | `ui-search-dialog`                  |
| 補助情報、軽量な詳細                   | `ui-popover`                        |
| モバイルのナビゲーション面             | `ui-sidebar-shell` overlay          |
| モバイルのページ内見出しナビゲーション | `layout-toc` mobile panel |

body scroll lock が必要なら Dialog 系、不要なら Popover 系、という切り分けが基本です。

---

## 4. URL同期

### 4.1 基本原則

Rouault では、URL同期は「何でも URL に書く」のではなく、**再訪・共有・ブラウザの戻る / 進むに価値がある状態だけ**を URL に載せます。

現状の主要パターンは、次のとおりです。

| 状態         | URL 形式      | 主実装              |
| ------------ | ------------- | ------------------- |
| ページ見出し | `#heading-id` | TOC / hash          |
| 主タブ       | `?tab=...`    | `ui-tabs[url-sync]` |
| 検索語       | `?q=...`      | search page         |
| 検索タグ     | `?tag=...`    | search page         |
| 検索ソート   | `?sort=...`   | search page         |

### 4.2 Tabs の URL同期

`ui-tabs[url-sync]` は `?tab=` を使います。

#### 解決優先順位

現状の優先順位は、次のとおりです。

1. **hash 由来**
2. **query 由来**（`?tab=`）
3. `selected-value`
4. `default-selected-value`
5. 現在の active
6. fallback

#### hash 優先の意味

Tabs 内に見出しがあり、その見出しへ `#id` で飛んできた場合は、`filter-visible-headings.ts` を介して**対象見出しを含むタブを先に可視化**します。

つまり Rouault では、**見出し deep link が主タブ選択より強い**設計です。

#### 正規化

hash または既存 `?tab=` から active tab が確定したあとは、`normalizeActiveValue()` により URL を `replaceState` で整えます。

また、状態変更時には `ui-url-state-change` を発火し、Tabs 同士や他の URL 同期要素との整合を取ります。

### 4.3 Primary tab only navigation

`PrimaryTabNavigationPolicy` は、同一ページ内で `?tab=` だけが変わる遷移を**フルページ遷移にしない**ためのポリシーです。

判定条件は概ね次のとおりです。

- 適用範囲は通常 note URL (`/notes/...`) に限定する
- `/archives/{hash}` や `/search` など note 以外の URL では適用しない
- `pathname` が同一
- `tab` 以外の query が同一
- `tab` の値だけが異なる
- `tab` parameter が複数回出現しない

このとき URL を push / replace した上で、必要なら hash 位置へ scroll します。

つまり主タブ切替は、Rouault では**URL を持つがページ遷移ではない状態遷移**として扱われます。

### 4.4 Search page の URL同期

`search-page` は、URL を source of truth として利用します。

また、検索実行そのものは dialog と共通の `search-core` を用います。したがって、ここで扱うのは URL 同期と履歴操作の契約であり、検索意味論そのものは [`docs/search-specification.md`](../search-specification.md) を正本とします。

#### 所有権

検索結果ページにおける `q`、`tag`、`tagMode`、`sort` は、**search-page が所有する feature-local URL state** とします。

この状態の復元、URL 反映、履歴更新、`popstate` 再同期は search-page の責務です。router は検索結果ページそのものへの到達・離脱を扱ってよいものとしますが、検索条件変更を full navigation や generic な state-only navigation として再解釈してはなりません。

#### 読み込み

- `connectedCallback()` で `window.location.href` から状態復元する
- `/search?...` と `/tags/<tag>/` の両入口を受理する
- `popstate` を受けた場合、URL から状態を再構築して再検索する

#### 書き込み

| 操作           | 履歴操作       |
| -------------- | -------------- |
| 検索入力       | `replaceState` |
| タグ切替       | `pushState`    |
| タグ演算子変更 | `pushState`    |
| ソート変更     | `pushState`    |

この差は妥当です。検索入力は文字ごとの中間状態なので戻る履歴を汚しやすく、タグ切替・タグ演算子変更・ソート変更はユーザー意図が明確だからです。

また、`/tags/<tag>/` は **単一タグ既定ビュー専用 URL** です。`q !== ''`、複数タグ、`tagMode !== 'or'`、`sort !== 'relevance'` のいずれかになった時点で、search-page は対応する `/search?...` へ遷移します。

#### 実装指針

History API の直接操作、URL からの状態復元、状態からの URL 再構築は feature ごとに散在させず、検索結果ページ用の薄い URL state helper へ集約するのが望ましいです。

この helper は少なくとも次を担当します。

- URL から `SearchState` を復元する
- `SearchState` から `/search?...` または `/tags/<tag>/` を構築する
- 操作種別に応じて `pushState` / `replaceState` を選択する
- `popstate` 時に search-page へ再同期する

### 4.5 検索結果 URL の正規化

検索結果項目では、次の 3 種類を分離して扱います。

- `canonicalUrl`: 文書識別用。`normalizeDocumentCanonicalUrl()` により query / hash を除去し、末尾 slash ありへ正規化する
- `url`: 実際の遷移先。安全な内部 URL だけを採用する
- `pathLabel`: `canonicalUrl` から導出する表示専用ラベル

したがって Rouault の検索結果表示では、**生の `url` や `canonicalUrl` をそのまま表示せず、常に `pathLabel` を使う**のが正です。

### 4.6 Router の URL正規化

`location-adapter.ts` の役割は、次のとおりです。

| 関数                  | 役割                                                           |
| --------------------- | -------------------------------------------------------------- |
| `normalizeUrl()`      | 比較・履歴更新向け **navigation URL** を作る                   |
| `normalizePathname()` | `/search` を正規化し、`/tags/<tag>/` は保持する                |
| `resolveContentUrl()` | 取得直前のみ **fetch target URL** として trailing slash を補う |
| `stripHash()`         | path + search 単位で比較する                                   |

ここでいう `navigation URL` と `fetch target URL` は、`router-specification.md` の用語定義に従います。

このため Rouault の URL は、**表示・比較では `/search` を slash なし、`/tags/<tag>/` を slash あり、それ以外は通常 slash なし**、取得直前だけ必要に応じて slash 補完ありという二層構造です。

ただし、この節でいう URL 正規化は router が所有する **文書遷移用 URL** の話です。検索結果ページにおける `q`、`tag`、`tagMode`、`sort` の意味論はここに含めず、`search-page` と `search-specification.md` 側の責務とします。

### 4.7 Router が介入しないリンク

`browser-link-interceptor.ts` により、次は SPA 介入対象外です。

- 外部リンク
- `target` あり
- `download` あり
- `rel="external"`
- `data-no-router`
- 同一ページ内 hash 移動のみ

したがって URL同期を設計するときは、**それが router 管理状態なのか、ブラウザネイティブ状態なのか**を区別しなければなりません。

### 4.8 実務ルール

新規機能で URL同期を入れるかどうかは、次で判断します。

| 問い                             | 判断           |
| -------------------------------- | -------------- |
| 共有したい状態か                 | URL へ載せる   |
| 戻る / 進むで復元されるべきか    | URL へ載せる   |
| 一時的な hover / Overlay 開閉か  | URL へ載せない |
| 同一ページ内の主セクション選択か | `?tab=` を優先 |
| 見出し到達点か                   | `#hash` を優先 |
| 検索条件か                       | query string   |

---

## 5. 恒久的リンク

### 5.1 基本原則

Rouault では、URL をすべて同じ意味で扱いません。**現在の閲覧導線を表す URL** と、**ある版の内容を固定して参照する URL** は、別の契約として扱います。

README でも、恒久的リンクはプロジェクトの目的に含まれており、`Canonical URL` と `Permanent URL` を分けて定義しています。前者は最新版の表示・SEO・通常共有のための URL、後者は引用・過去版参照のための URL です。

したがって `patterns.md` でも、恒久的リンクは単なる URL同期の一種ではなく、**版保証のための参照契約**として独立して扱うのが妥当です。

### 5.2 Canonical URL と Permanent URL の役割分担

Rouault における URL の役割分担は、次のとおりです。

| URL 種別          | 形式               | 主な役割                         |
| ----------------- | ------------------ | -------------------------------- |
| **Canonical URL** | `/{slug}`          | 最新版の表示、SEO、通常のシェア  |
| **Permanent URL** | `/archives/{hash}` | 引用、過去版参照、内容固定の参照 |

この分離は README のパーマリンク戦略と一致しています。`Permanent URL` は過去版参照用であり、`robots: noindex` の扱いも想定されています。

実務上は、次のように読むと整理しやすくなります。

- **Canonical URL**: 「今このノートの最新版はどこか」を示す
- **Permanent URL**: 「この内容そのものを再参照したい」を示す

つまり Rouault では、**移動先としての URL** と **引用先としての URL** を意図的に分離します。

#### 用語注記

本書でいう **Canonical URL** は、最新版ノートの通常導線を指します。

これは `search-specification.md` における **`DocumentCanonicalUrl`** とは別概念です。  
`DocumentCanonicalUrl` は検索結果項目の重複統合と同一文書判定のための内部識別契約であり、Rouault 全体の通常導線を指す語として使ってはなりません。

また、router 文脈では `canonical URL` ではなく、`router-specification.md` の定義に従って **`navigation URL`** と **`fetch target URL`** を用います。

### 5.3 URL同期との違い

URL同期が扱うのは、同一ページ内または同一論理ページ上の**状態復元**です。たとえば `?tab=` や `#hash` は、現在の表示状態や到達位置を共有するためのものです。

一方で恒久的リンクが扱うのは、**表示状態ではなく内容の固定**です。

| 観点     | URL同期                             | 恒久的リンク             |
| -------- | ----------------------------------- | ------------------------ |
| 主対象   | 表示状態、到達位置、検索条件        | コンテンツの特定版       |
| 例       | `?tab=...`, `#heading-id`, `?q=...` | `/archives/{hash}`       |
| 主目的   | 再訪、戻る / 進む、共有             | 引用、版保証、過去版参照 |
| 変化単位 | UI state                            | コンテンツ本体           |

したがって、`?tab=` や `#hash` を持つ URL だけでは、引用対象の版保証はできません。**恒久的リンクは URL同期では埋められない責務を持つ**ため、独立した節にする価値があります。

### 5.4 ハッシュ契約

README では、Permanent URL のハッシュについて次の契約が定義されています。

| 項目         | 契約                     |
| ------------ | ------------------------ |
| URL構造      | `/archives/{hash}`       |
| ハッシュ長   | 12文字                   |
| ハッシュ形式 | 小文字の16進数           |
| ハッシュ元   | 正規化後の Markdown 全体 |
| 除外項目     | `updated_at`             |

また、正規化処理として次が明示されています。

1. `updated_at` を除外する
2. 改行コードを `LF` に統一する
3. 末尾空白を除去する
4. ファイル末尾に改行を付与する
5. SHA-256 を計算し、先頭12文字を用いる

これにより Rouault の Permanent URL は、単純なファイルパス固定ではなく、**内容の正規化結果に対する参照**になります。

### 5.5 衝突と再利用

README では、同一内容に戻した場合は既存ハッシュを再利用し、ハッシュ衝突が発生した場合は 16文字へ延長して再計算する方針が示されています。

この方針は、Patterns の観点では次のように読めます。

- **内容が同じなら参照も同じでよい**
- **内容が異なるのに参照が同じことは許容しない**

つまり Permanent URL は、履歴管理のための識別子であると同時に、**内容同一性の契約**でもあります。

### 5.6 UI 契約

README の UI要件では、次の3点が明示されています。

| 要素              | 契約                                               |
| ----------------- | -------------------------------------------------- |
| デフォルト提示URL | Permanent URL を優先し、Canonical URL は補足とする |
| コピー機能        | Permanent URL をワンクリックでコピーできる         |
| アーカイブ警告    | 過去版では「最新版はこちら」を案内する             |

したがって UI 設計では、Permanent URL は隠れた内部概念ではなく、**ユーザーが実際に取得し、共有し、読み分ける URL** として扱う必要があります。

### 5.7 Router との関係

`Canonical URL` と `Permanent URL` の意味論は `patterns.md` 側で定義しますが、router における正規化・履歴・取得規則の正本は `router-specification.md` に置きます。

Rouault において `/archives/{hash}` は、**固定版参照のための通常文書ルート**です。したがって router はこれを full navigation の対象として扱わなければなりません。

追加規則:

- `/archives/{hash}` を `/{slug}` へ自動正規化してはなりません
- `/archives/{hash}` から対応する最新版 URL が導出可能であっても、router が自動 redirect してはなりません
- `/archives/{hash}` 上で「最新版はこちら」を案内する責務は UI または上位統合に属し、router core の必須責務ではありません
- `Permanent URL` は URL 同期の一種ではなく、版保証のための参照契約として扱います

### 5.8 実務ルール

新規実装では、次の判断基準を採用します。

| 問い                           | 判断                     |
| ------------------------------ | ------------------------ |
| 今の表示状態を共有したいか     | URL同期を使う            |
| 内容の版を固定して共有したいか | Permanent URL を使う     |
| SEO や通常導線が主目的か       | Canonical URL を使う     |
| 引用・脚注・外部参照が主目的か | Permanent URL を優先する |

---

## 6. 横断ルール

### 6.1 Link分類と selected / current を混ぜない

次の2つは分けて考える必要があります。

- **link-text / link-control**: 視覚・意味の分類
- **selected / current**: 状態意味論

たとえば current なリンクは通常 `link-control` であり得ますが、`link-control` 自体が current を意味するわけではありません。

### 6.2 Overlay は「開くこと」より「閉じたあと」を先に決める

Rouault の Overlay 実装はどれも、次の問いに先に答えています。

- 誰が trigger か
- 閉じたらどこへ focus を戻すか
- body をロックするか
- Esc の責務は何か
- outside click で閉じるか

新規 Overlay でも、この順で契約を決めるべきです。

### 6.3 URL同期は source of truth を1つにする

- Tabs: URL と `selected-value` の競合を解決順序で制御する
- Search: URL を起点に state を復元する
- Router: `navigation URL` と `fetch target URL` を分離する

加えて、同じ URL 状態を複数の主体が同時に所有してはなりません。

- 文書遷移用 URL は router が所有する
- 検索結果ページの `q`、`tag`、`tagMode`、`sort` は search-page が所有する
- 主タブ切替のような app 固有 state-only 遷移は、router core ではなく policy 実装が所有する

つまり Rouault では、**URL を使うこと**と**router が所有すること**を同一視してはなりません。
