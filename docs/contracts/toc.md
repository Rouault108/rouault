# TOC契約

## 1. 概要

本書は、`layout-toc-controller`、`TocActiveTracker`、`layout-toc-runtime-store`、`layout-toc-mobile-controller`の責務分担を定義します。

静的navは情報構造を、sourceごとの`TocSourceSession`は現在地追跡・writer・canonical visible/currentを所有する。controllerは後付けのmobile panel・interaction・runtime presentationを所有する。見出し型は`src/toc/toc-headings.ts`の`TocHeading`を参照する。

## 2. 責務分担

### 2.2 `layout-toc-controller`

- SSR済みdesktop TOC navを取得する
- `source-id` / `capabilities-json`をdecodeする
- 同じsource sessionの正規activationを要求し、trackerを作り直さない
- header向けruntime snapshotをpublishする
- mobile panel用clone navを生成する

### 2.4 `layout-toc-runtime-store`

- `TocSourceSession`の確定値とpresentation状態からcontrollerが作るruntime snapshotを静的header enhancerへ共有する
- `ready` / `hasVisibleHeadings` / `activeId`を伝える

### 2.5 `layout-toc-mobile-controller`

- mobile panelのopen / close / toggleを管理する
- return focus targetを保持する
- TOC内容そのものは保持しない

### 2.6 mobile TOC UX contract

mobile TOCを有効にするページでは、次を満たすこと。

- `width < 640px`ではdesktop TOCを隠す
- 640px未満で隠すdesktop TOCはSSR静的navの`[data-layout-toc-nav]`を指し、`layout-toc-controller`が生成する`[data-layout-toc-mobile-panel]`と`[data-layout-toc-mobile-nav]`は対象に含めない
- 旧fixed summary barは描画しない
- `header[data-layout-header]`内にtriggerを描画する
- triggerはmobile TOC panelを開閉する導線として扱う
- triggerの可視文言は固定の`目次`とし、399px以下ではicon-onlyへ縮退する
- trigger押下で`layout-toc-controller`のmobile panelがheader直下から開く
- panelはheaderを覆わない
- mobile panel headerは視覚上close buttonのみを持つ最小ヘッダーとする
- 現在見出し把握はactive item強調で成立させる
- TOC navのnavigation labelは`目次`とする
- close後にtriggerへfocus returnできる

---

## 3. データ契約

### 3.1 `Heading`

| 名前              | 型                                     | 必須   | 内容          |
| ----------------- | -------------------------------------- | ------ | ------------- |
| `id`              | `string`                               | はい   | 見出しID      |
| `text`            | `string`                               | はい   | 表示ラベル    |
| `level`           | `number`                               | はい   | 見出しレベル  |
| `scopeSelections` | `{ scopeId: string; value: string }[]` | いいえ | tab scope条件 |

### 3.2 `TocCapabilities`

| 名前             | 型        | 内容                                     |
| ---------------- | --------- | ---------------------------------------- |
| `activeTracking` | `boolean` | 現在地追跡を有効化するか                 |
| `dynamicScopes`  | `boolean` | tab scope連動が必要か                    |
| `mobilePanel`    | `boolean` | mobile TOC interactive surfaceを要するか |

build-timeで決定し、`layout-toc-controller[capabilities-json]`へ渡します。
`mobilePanel`はmobile TOC panelのinteractive capabilityを表し、旧summary barの再導入根拠にはしてはなりません。

---

## 4. 静的nav

### 4.3 DOM / Accessibility

- ルートは`nav`
- 各項目はネイティブ`<a>`
- アクティブ項目のみ`aria-current="location"`
- 見出しが空なら何も描画しない
- TOCのnavigation landmark labelは全surfaceで`目次`とする
- 対象surfaceはSSR `.layout-toc`、mobile static nav、runtime mobile panel clone navである
- `.layout-toc-col`はレイアウトコンテナであり、ランドマーク名を所有しない
- desktop TOCは視覚見出しを持たず、`nav`のaccessible nameでTOC領域を示す
- 旧モバイル専用ラベルは使わない

### 4.4 Visual current state

TOCの現在地表示は、支援技術向けには`aria-current="location"`、視覚表現ではleft railを主表現とする。現在地を`font-weight`のみに依存して表現してはならない。

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

### 4.5 Native scrollbar

`.layout-toc`と`.layout-toc-mobile-panel`のbase ruleは`scrollbar-width: thin`を指定する。scrollbar-colorをauthor側で指定せず、normal / hover / focus-withinを通してUAの色制御を維持する。transparent / noneやWebKit scrollbar paintingで隠さない。ancestorにもscrollbar-color指定を置かない。link固有のhover / focus-visible / current装飾とは独立した契約とする。

既存寸法、overflow、desktopの`scrollbar-gutter: stable`、padding、overscroll、DOM、ARIA、JavaScriptを維持する。page、table、code、search等のscroll surfaceは対象外。mobileではouter panelとinner `.layout-toc`を別々に測定し、実際のclip ancestorを両方考慮する。innerのoverflow有無だけから構造不良と判断しない。

### 4.6 Label wrapping

TOC labelは、階層だけを理由に1行省略してはならない。`data-heading-depth`は構造情報であり、indentや検証用のhookとして残すが、`white-space: nowrap`、`text-overflow: ellipsis`、`line-clamp: unset`の根拠にしてはならない。

inactive itemはdensity tierに応じた最大行数でclampする。compact inactive itemは原則2行、expanded inactive itemは原則3行まで表示する。active itemは現在地把握のためinactive itemより多い行数を許容し、compact active itemは原則3行、expanded active itemは原則4行まで表示する。

desktop navとmobile panel navは同じ`--toc-item-inactive-max-lines` / `--toc-item-active-max-lines` token recipeとlabel wrapping contractを共有する。`--toc-item-inactive-upper-max-lines`は廃止済みであり、runtime sourceでは使用してはならない。

mobile panelのDOM / test contract hookは`[data-layout-toc-mobile-panel]`である。mobile panelのCSS styling hookは`.layout-toc-mobile-panel`である。controller panelはこのhookを維持する。

forced-colors契約:

- inactive itemは`CanvasText`とする
- current itemは`Highlight` foregroundと`Highlight` railで識別する
- inactive itemに`GrayText`や`LinkText`を使わず、dead declarationとしても残さない
- active / hover / focus background surfaceに依存せず、`::after`はtransparentにする
- current rail borderは`var(--border-width, 1px)`を使い、`--border-width-thick`に依存しない
- `--border-width-thick`の禁止はforced-colors rail `border` declarationに限定する

motion契約:

- `.layout-toc`には現時点でtransitionを導入しない

CSS contract testの初期制約として、hover / focus-visible surface selectorは明示selectorとして書く。この制約はhelperの単純性のためであり、semantic selector matchingを導入した場合は緩和してよい。

---

## 5. note TOCとhydration

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
- current stateは受理済み位置の同期処理、または`layout-toc-controller`がvisible headingsとviewport/hashを照合して決定する

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
- desktop navとmobile panel navは`data-density-tier`を使う。

hydration後のvisible headings同期契約:

- `layout-toc-controller`は、現在のvisible headingsに含まれないTOC itemへ`hidden`と`aria-hidden="true"`を同期する
- 現在のvisible headingsに含まれるTOC itemへは`hidden=false`と`aria-hidden="false"`を同期する
- `.layout-toc`内の`[hidden]`要素は、CSS artifactにより視覚的にも非表示でなければならない
- inactive tab scope由来の見出しはTOC sourceに残るが、現在のvisible headingsに含まれない限りdesktop / mobile TOC navには表示しない
- `.layout-toc` root自体のhidden挙動はこの契約の対象外とする

---

## 6. tabs連動

build-timeで`[data-tabs-root][data-toc-scope]`を注釈し、見出し側へ`scopeSelections`を持たせます。

runtime契約:

- `[data-tabs-root]`は`ui-tab-change.detail.scopeId`を発火する
- trackerはtabsの内部DOM構造ではなく`scopeId`とscope snapshot helperを使う
- hidden tab内のhash対象見出しに遷移するときは、対応するtabを先に選択してからTOCを同期する
- TOCは`?tab=`の正規化を所有しない。hashと`?tab=`の矛盾回復、host-owned hash判定、`replaceState`によるURL正規化は`[data-tabs-root][data-tabs-url-sync]`のfeature-local URL stateとして扱う

---

## 7. テスト固定範囲

- scoped headingがbuild-timeで抽出されること
- `layout-toc-controller`がcapabilityありのときだけhydrateすること
- `tocPresence='absent'`ではTOC DOMとhydration scopeが出ないこと
- mobile TOC triggerが640px未満でのみ現れ、固定ラベル`目次`またはicon-onlyを表示すること
- mobile panel headerが視覚タイトルを持たずclose-onlyであること
- TOC navがnavigation label `目次`を持つこと
- current headingはactive item強調で把握できること
- mobile panelがheaderの直下から開くこと
- close後にtriggerへfocus returnできること
- density tierがCSS structureとbrowser behaviorの両方で固定されていること

- scrollbar SSRはexact selectorのbase thinと全media scopeのcolor指定 / 非表示 / WebKit paintingの不在、既存overflow / gutterを固定する。
- scrollbar E2Eは既存Chromium / Firefox / WebKit desktop projectsで実行する。長いfixtureのoverflowと独立したwheel / scrollTop末尾到達、全操作面のclip / occlusion、到達後のhash / current / mobile close / focus returnを検証する。短いfixtureは非overflowを検証する。
- current更新はlabelの高さを変え得るため、current ID、scrollHeight、clientHeight、scrollTopがrendering frame間で安定してから末尾距離1 CSS px以内を判定し、geometry測定前にendpointをfocus / hover / clickして自動scrollを起こさない。
- light / dark / `matchMedia`で有効なforced-colorsを記録する。`CSS.supports`は構文対応のみ、computed thin / autoはcascadeの保証でありpaint幅・色・自動非表示の保証ではない。未対応propertyは別記録とし、scroll / link到達検証は省略しない。
- Windows Edgeの実scrollbar drag、keyboard、200% zoom、themes / forced-colors / OS always-show設定とiPhone Safari touchは別途manual確認の対象でありcloudでは未実施。390px幅のdesktop projectはiPhone / touch検証ではない。

Playwright v1.63.0のFirefox headlessは、[Juggler.js](https://github.com/microsoft/playwright/blob/v1.63.0/browser_patches/firefox/juggler/components/Juggler.js#L101-L105)で[hidden-scrollbars.css](https://github.com/microsoft/playwright/blob/v1.63.0/browser_patches/firefox/juggler/content/hidden-scrollbars.css#L5-L7)をAGENT_SHEETとして登録し、`* { scrollbar-width: none !important; }`を適用する。このrunner version・Firefox・実headless fixture値の3条件が一致する環境だけはcomputed `none`を明示的に検証・記録する。実際に配信されたauthor stylesheetのexact surface ruleがthinであり、該当surfaceに他のwidth / color宣言がないこともCSSOMで確認する。全Firefoxへの例外とせず、他環境のthin mismatchを許容しない。scroll、endpoint、link到達、colorの検証は省略しない。これはheadless harnessの制約であり、通常Firefoxや実OSのpaintの保証ではない。

## Native Tabs integration

build-time annotationのownerはextract-toc-from-html.ts/prepareTocHtmlである。direct panelのdata-tab-valueを読み、既存scope IDと外側→内側のscopeSelections tupleを維持する。runtimeはreadTabsSelection/selectTabsValueを使う。未enhance scopeは全panel可視として扱い、hash revealは外側からhistoryMode:noneで要求する。起動は要求せずqueueも作らない。data-tabs-enhanced/data-selected-valueのmutationで再評価し、初期化用の選択eventを偽装しない。

## Reading position integration

coordinate-priority中はactiveTracking=trueだけがviewportからcurrentを同期する。falseへ新規追跡を加えない。通常hash選択は本人intentをDOM変更前に受理する。 詳細は[Reading Position Contract](reading-position.md)。

hashless full commitの位置受理後は、PostRenderからReadingに注入した同期callbackでvisible/current/witness を一括算出する。独立trackと所有権を確認して一度適用・一度検証し、不成立は遅延初期化へ縮退する。本文位置復元の成否とTOC同期結果は分離する。apply/verify/rollback の例外をTOC内で隔離し、同じownerと自分の値が残る属性/tokenだけを一度戻す。

controller/tracker/mobile の最初の公開と、その後の初期再更新も同じ候補計算でvisible/current を一括採用する。先頭仮設定を公開しない。SSRは現在地を決めず、遅延activationは最新viewportで再判定する。設計詳細は [ADR](../adr/toc-current-at-accepted-reading-position.md)、実施範囲は[検証記録](../references/toc-current-position-validation-2026-10-18.md)を参照。

初期の明示見出しが本文準備待ちで初期予約より後に到達する場合、同じ初期対象の実到達を通常のviewport観測で一度同期する。本人のスクロール入力、新しいintent、座標優先への切替、対象の消失・非表示で未完了の同期を取り消す。この同期は本文を再スクロールしない。

## Native位置観測とsource session

Readingの同期分類、実位置受理、検証済みshellに基づくearly接続と通常activationは同じsessionを使う。normal候補の算出・current書込もsessionを通す。pagehideは位置証明だけを失効し、pageshowは新観測を使う。初期followupは個別に一度試行し、presentation再試行で再登録しない。詳細は[設計ADR](../adr/toc-source-session-native-observation.md)と[検証記録](../references/toc-native-source-session-validation-2026-10-19.md)を参照する。
