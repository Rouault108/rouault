# Toc コンポーネント契約書

## 1. 概要

本書は、`ui-toc`、`layout-toc`、`layout-toc-controller`、`TocActiveTracker`、`layout-toc-runtime-store`、`layout-toc-mobile-controller`の責務分担を定義します。

static-first再設計後の`ui-toc`は純粋なviewです。見出し抽出、現在地追跡、header側へのruntime state共有、mobile panel開閉は別レイヤで扱います。

## 2. 責務分担

### 2.2 `layout-toc-controller`

- SSR済みdesktop TOC navを取得する
- `source-id` / `capabilities-json`をdecodeする
- trackerを接続する
- header向けruntime snapshotをpublishする
- mobile panel用clone navを生成する

### 2.4 `layout-toc-runtime-store`

- `layout-toc-controller`が算出したruntime snapshotを静的header enhancerへ共有する
- `ready` / `hasVisibleHeadings` / `activeId`を伝える

### 2.5 `layout-toc-mobile-controller`

- mobile panelのopen / close / toggleを管理する
- return focus targetを保持する
- TOC内容そのものは保持しない

### 2.6 mobile TOC UX contract

mobile TOCを有効にするページでは、次を満たすこと。

- `max-width: 639px`ではdesktop TOCを隠す
- 640px未満で隠すdesktop TOCはSSR静的navの`[data-layout-toc-nav]`を指し、`layout-toc-controller`が生成する`[data-layout-toc-mobile-panel]`と`[data-layout-toc-mobile-nav]`は対象に含めない
- 旧fixed summary barは描画しない
- `header[data-layout-header]`内にtriggerを描画する
- triggerはmobile TOC panelを開閉する導線として扱う
- triggerの可視文言は固定の`目次`とし、399px以下ではicon-onlyへ縮退する
- trigger押下で`layout-toc-controller`のmobile panelがheader直下から開く
- panelはheaderを覆わない
- mobile panel headerは視覚上close buttonのみを持つ最小ヘッダーとする
- 現在見出し把握はactive item強調で成立させる
- `ui-toc`自身のnavigation labelは`目次`とする
- close後にtriggerへfocus returnできる

---

## 3. データ契約

### 3.1 `Heading`

| 名前              | 型                                     | 必須   | 内容           |
| ----------------- | -------------------------------------- | ------ | -------------- |
| `id`              | `string`                               | はい   | 見出しID      |
| `text`            | `string`                               | はい   | 表示ラベル     |
| `level`           | `number`                               | はい   | 見出しレベル   |
| `scopeSelections` | `{ scopeId: string; value: string }[]` | いいえ | tab scope条件 |

### 3.2 `TocCapabilities`

| 名前             | 型        | 内容                                      |
| ---------------- | --------- | ----------------------------------------- |
| `activeTracking` | `boolean` | 現在地追跡を有効化するか                  |
| `dynamicScopes`  | `boolean` | tab scope連動が必要か                    |
| `mobilePanel`    | `boolean` | mobile TOC interactive surfaceを要するか |

build-timeで決定し、`layout-toc-controller[capabilities-json]`へ渡します。
`mobilePanel`はmobile TOC panelのinteractive capabilityを表し、旧summary barの再導入根拠にはしてはなりません。

---

## 4. `ui-toc` 公開契約

### 4.1 入力

| 名前          | 種別                                  | 契約                                                                |
| ------------- | ------------------------------------- | ------------------------------------------------------------------- |
| `headers`     | property                              | 描画対象見出し。唯一のソース                                        |
| `activeId`    | property / attribute (`active-id`)    | 現在アクティブな見出しID                                           |
| `densityTier` | property / attribute (`density-tier`) | `compact` / `comfortable` / `expanded`の視覚密度。意味論は変えない |

### 4.2 イベント

| 名前                   | detail                  | 契約                     |
| ---------------------- | ----------------------- | ------------------------ | ------------------------------------------------------------------------------ |
| `ui-toc-active-change` | `{ id, source: 'scroll' | 'click', index, total }` | `ui-toc`からの現在地通知。現実装で`ui-toc`自身が発火するのはclick起因のみ |

### 4.3 DOM / Accessibility

- ルートは`nav`
- 各項目はネイティブ`<a>`
- アクティブ項目のみ`aria-current="location"`
- 見出しが空なら何も描画しない

### 4.4 Visual current state

TOCの現在地表示は、支援技術向けには`aria-current="location"`、視覚表現ではleft railを主表現とする。現在地を`font-weight`のみに依存して表現してはならない。

`ui-toc`とSSR `.layout-toc`は同一実装ではない。`ui-toc`はLitによるinteractive viewであり、`.layout-toc`はSSR HTMLに適用されるstatic CSS実装である。両者はselector grammarではなく、同じ`--toc-*` token recipeとcurrent visual grammarを共有する。

- `ui-toc`は`.is-active`をcurrent selectorの正本とする
- SSR `.layout-toc`はruntime / test / 互換のため`.is-active`と`[data-active='true']`の両方を受ける

視覚契約:

- 現在地の主表現は細いleft railとする
- active backgroundとforeground changeは補助表現とする
- active font weightは`--toc-item-font-weight-active`を通し、固定の太字へ依存しない
- font-weight fallbackは`var(--font-normal, 400)`を経由する
- line-height fallbackは`var(--line-height-normal, 1.5)`を経由する
- focus-visible radius fallbackは`var(--radius-sm, 4px)`を経由する
- hover / focus / active surfaceのbleedは`--toc-item-surface-bleed-inline-start`を使う
- hoverの識別正本はforeground changeとpointer feedbackとする
- focus-visibleの識別正本はcurrentとは独立したoutlineとする
- active itemにhoverまたはfocus-visibleが重なった場合、current surfaceとactive foregroundを優先する
- 通常表示でもforced-colorsでも、active itemにhover / focus-visibleが重なった場合はactive foregroundを維持する
- TOC linkはnavigation surfaceとして扱い、通常・hover・focus・currentのいずれでも下線を出さない
- density tierは`--toc-item-*` token recipeを切り替えるだけで、見出しID、active state、URLを変更しない

### 4.5 Label wrapping

TOC labelは、階層だけを理由に1行省略してはならない。`data-heading-depth`は構造情報であり、indentや検証用のhookとして残すが、`white-space: nowrap`、`text-overflow: ellipsis`、`line-clamp: unset`の根拠にしてはならない。

inactive itemはdensity tierに応じた最大行数でclampする。compact inactive itemは原則2行、expanded inactive itemは原則3行まで表示する。active itemは現在地把握のためinactive itemより多い行数を許容し、compact active itemは原則3行、expanded active itemは原則4行まで表示する。

`ui-toc`とSSR `.layout-toc`は同じ`--toc-item-inactive-max-lines` / `--toc-item-active-max-lines` token recipeとlabel wrapping contractを共有する。`--toc-item-inactive-upper-max-lines`は廃止済みであり、runtime sourceでは使用してはならない。

mobile panelのDOM / test contract hookは`[data-layout-toc-mobile-panel]`である。mobile panelのCSS styling hookは`.layout-toc-mobile-panel`である。static-first controller panelとlegacy Lit panelは、配置場所が異なっても同じDOM contract hook `[data-layout-toc-mobile-panel]`を持つ。

forced-colors契約:

- inactive itemは`CanvasText`とする
- current itemは`Highlight` foregroundと`Highlight` railで識別する
- inactive itemに`GrayText`や`LinkText`を使わず、dead declarationとしても残さない
- active / hover / focus background surfaceに依存せず、`::after`はtransparentにする
- current rail borderは`var(--border-width, 1px)`を使い、`--border-width-thick`に依存しない
- `--border-width-thick`の禁止はforced-colors rail `border` declarationに限定する

motion契約:

- `.layout-toc`には現時点でtransitionを導入しない
- `ui-toc`のreduced-motionでは`.toc-link`、`.toc-link::before`、`.toc-link::after`のtransitionを短縮する
- `ui-toc`のreduced-motionでは`.toc-link:focus-visible`のanimationを無効化する

CSS contract testの初期制約として、hover / focus-visible surface selectorは明示selectorとして書く。この制約はhelperの単純性のためであり、semantic selector matchingを導入した場合は緩和してよい。

---

## 5. note TOC と hydration

契約:

- TOC presenceはnote page projectionの`tocPresence`で決まり、`headings.length === 0`のときは`absent`とする
- `tocPresence='absent'`のnote pageではTOC DOM、TOC JSON script、`data-hydration-scope="note-toc"`を出力しない
- `tocPresence='present'`の`.layout-toc-col`は`data-toc-hydration="hydrated|static"`を必ず持つ
- note pageではSSRの`<nav class="layout-toc">`を正本にする
- `layout-toc-controller`は`capabilities-json`を持つ
- `activeTracking` / `dynamicScopes` / `mobilePanel`のいずれかがtrueの場合だけhydration directiveを持つ
- static-only TOCはtesting fixture限定で、SSR出力だけで成立させる
- static-only TOCのlinkは`data-toc-link`を持たず、active sync / mobile panelの対象にしない
- SSR層はrequest URLのhashを正本としてcurrent stateを出力しない
- current stateはhydration後の`layout-toc-controller`がvisible headingsとhashを照合して決定する

presenceとhydrationは分離する。

- `absent`: headings 0件。TOC host自体を出さない
- `present-static`: headings 1件以上、testing override由来、interactive capabilityなし。desktop static navとarticle前mobile static navだけで成立
- `present-interactive`: headings 1件以上かつinteractive capabilityあり。SSR nav / TOC JSON source後に`layout-toc-controller`をhydrateする

`toc.shouldHydrate`はcurrent DOM同期の前提であり、scroll trackingの有効化条件そのものではない。

- `activeTracking=true`の場合、scrollによるactive更新を行う
- `dynamicScopes=true`の場合、visible headingsの変化に応じてTOCとcurrent stateを同期する
- `mobilePanel=true`の場合、desktop navとmobile panel cloneのcurrent stateを同期する
- `activeTracking=false`でも、hash、初期visible heading、dynamic scope、mobile panel cloneの整合のためにactive stateが同期される場合がある
- scrollによるactive更新は`activeTracking=true`の場合に限る

hydration後のcurrent DOM契約:

- active id解決とnavごとのcurrent DOM解決は分けて扱う
- visible headingsが空の場合、current stateは存在しない
- active idが空文字列の場合、current stateは存在しない
- hashがvisible headings外であっても、visible headingsが1件以上ある場合は先頭visible headingへfallbackしてよい
- desktop nav / mobile panel navの各nav内にactive id対応linkが存在する場合、そのlinkのみに`.is-active`、`data-active="true"`、`aria-current="location"`を同期する
- active item以外からは`.is-active`、`data-active`、`aria-current`を削除する
- 各nav内にactive id対応linkが存在しない場合、そのnavではcurrent stateを持たない
- mobile panel cloneもcurrent DOM契約の対象であり、open / closeによりstale current stateを残してはならない
- desktop nav、mobile panel nav、`ui-toc`は同じdensity tier語彙を使う。SSR static navでは`data-density-tier`、Lit componentでは`density-tier` attributeを使う。

---

## 6. tabs 連動

build-timeで`ui-tabs[data-toc-scope]`を注釈し、見出し側へ`scopeSelections`を持たせます。

runtime契約:

- `ui-tabs`は`ui-tab-change.detail.scopeId`を発火する
- trackerはtabsの内部DOM構造ではなく`scopeId`とscope snapshot helperを使う
- hidden tab内のhash対象見出しに遷移するときは、対応するtabを先に選択してからTOCを同期する

---

## 7. テスト固定範囲

- `ui-toc`が`activeId`だけで表示を更新すること
- scoped headingがbuild-timeで抽出されること
- `layout-toc-controller`がcapabilityありのときだけhydrateすること
- `tocPresence='absent'`ではTOC DOMとhydration scopeが出ないこと
- mobile TOC triggerが639px以下でのみ現れ、固定ラベル`目次`またはicon-onlyを表示すること
- mobile panel headerが視覚タイトルを持たずclose-onlyであること
- `ui-toc`がnavigation label `目次`を持つこと
- current headingはactive item強調で把握できること
- mobile panelがheaderの直下から開くこと
- close後にtriggerへfocus returnできること
- density tierがCSS structureとbrowser behaviorの両方で固定されていること
