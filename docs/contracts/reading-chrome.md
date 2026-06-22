# Reading Chrome Contract

## 1. Status

- Type: Normative
- Source of truth: note page projection、TOC owner validation、hydration scheduler / registry、search return-to-reading integration、production artifact validators
- Applies to: note reading chrome、fixed sidebar note frame geometry、TOC owner / source / trigger boundary、mobile TOC panel、desktop TOC sync、search result return-to-reading、diagnostics、density tier、documentation audit
- Non-goals: router URL 意味論の再定義、検索 ranking 詳細、component 固有 visual token の全列挙、authoring 記法の追加

## 2. Ownership

### This Layer Owns

- 読書中に本文外へ置く補助 chrome の責務境界。
- TOC owner、TOC source、desktop nav、mobile panel clone、header trigger の接続条件。
- Build-time owner validation と runtime hydration lifecycle の分離。
- Reading chrome に関係する diagnostics を、表示仕様ではなく契約違反の観測面として扱うこと。
- TOC density tier を見出し量から導出し、意味論を変えずに読書面の密度だけへ反映すること。
- Desktop fixed sidebar 表示時の note frame outer gutter。left sidebar、main、desktop TOC を含む note frame が viewport edge に接しないための最小外側余白を所有する。

### This Layer Must Not Own

- Navigation URL、fetch target URL、history commit。正本は `docs/contracts/router.md` と `docs/contracts/note-navigation.md`。
- Hydration trigger の正本。正本は `docs/contracts/hydration.md`。
- `NavigationEnvelope` schema の詳細。正本は `docs/references/navigation-envelope-schema.md`。
- 検索 ranking、source 統合、diagnostics aggregation の詳細。正本は `docs/contracts/search.md` と `docs/references/search-ranking-and-diagnostics.md`。
- Component 単体の visual token 詳細。正本は `docs/design-system/components/`。
- Header geometry。static header の幅・配置契約は reading chrome note frame geometry とは別契約として扱う。
- Sidebar state persistence。tree state、overlay state、保存先、復元条件は `docs/contracts/sidebar-state.md` を正本とする。

## 3. Public Contract

### Inputs

- Note page projection が生成する TOC presence、TOC headings、runtime id、owner candidate、shell trigger projection。
- SSR が出力する desktop TOC nav、TOC JSON source、hydration marker。
- Scheduler / registry が所有する hydration target。
- Search dialog の selection event から変換される return-to-reading request。

### Outputs

- Static-first で読める note HTML。
- Hydration 後に同期された desktop nav、mobile panel nav、header trigger state。
- `ready`、`hasVisibleHeadings`、`activeId` を含む header 向け runtime snapshot。
- Build-time / runtime / production artifact validation で観測できる diagnostics。

### Events

- Reading chrome は router event を hydration trigger の正本にしない。
- Search result selection は検索 UI からの選択通知であり、navigation adapter が return-to-reading request へ橋渡しする。

### DOM / URL / State Contract

- Note page では SSR の desktop TOC nav を正本とし、mobile panel は runtime clone として扱う。
- Header trigger は TOC content owner にならない。trigger は open / close の導線であり、TOC headings を保持しない。
- TOC owner candidate が未確定または不正な場合、interactive trigger を有効な reading chrome として見せない。
- Hydration marker は build-time / runtime 接続点であり、visual variant として使わない。
- Desktop nav と mobile panel nav は同じ visible headings と active id から current DOM を同期する。
- Density tier は `compact`、`comfortable`、`expanded` の視覚密度であり、heading identity、URL、active state の意味を変えない。
- TOC density tier は表示密度を調整するが、階層だけを理由に見出しラベルを 1 行省略してはならない。
- `compact` density は余白を詰めるための契約であり、見出し情報を過剰に欠落させる契約ではない。
- Desktop TOC nav、static-first mobile panel clone、Lit `ui-toc` は同じ label wrapping contract を共有する。
- SSR `.layout-toc` と Lit `ui-toc` は、同じ `--toc-item-inactive-max-lines` / `--toc-item-active-max-lines` contract に従う。
- `data-heading-depth` は階層インデントなどの構造表現に使うが、label wrapping を 1 行化する根拠として使ってはならない。
- Mobile panel の DOM contract hook は `[data-layout-toc-mobile-panel]` であり、CSS styling hook は `.layout-toc-mobile-panel` である。DOM / test lookup は `[data-layout-toc-mobile-panel]` を正本とし、`.layout-toc-mobile-panel` を正本 DOM selector として扱わない。
- Search の return-to-reading は router core の import boundary を壊さず、検索 UI は router を直接所有しない。

### Desktop Note Frame Geometry

- 固定サイドバー表示時、left sidebar、main、desktop TOC を含む note frame は viewport edge から最小 outer gutter を持つ。
- Outer gutter は `--note-frame-outer-gutter` を最小値契約として使う。wide viewport では中央寄せと max-width により、実際の gutter が `--note-frame-outer-gutter` より大きくなってよい。
- Outer gutter は sidebar item padding や TOC item padding とは別契約である。項目密度や active rail、TOC indent の調整で note frame 外側余白を代替してはならない。
- Outer gutter は sidebar state、TOC active state、URL、hydration ownership、ARIA 意味論を変更しない。
- Header geometry は別契約であり、この note frame outer gutter contract の対象ではない。

### Viewport Scrollbar Gutter

- Reading chrome は classic scrollbar 環境で modal scroll lock により viewport inline-size が変化しても、header、note frame、TOC の inline position を変化させてはならない。
- Root viewport gutter の正本は `src/assets/css/main.css` の `html { scrollbar-gutter: stable; }` とする。
- Dialog open-state CSS は body scroll lock を所有し、viewport gutter 補正を所有しない。
- この contract は検索ダイアログ固有ではなく、reading chrome の位置安定性に属する。

## 4. State Model

### Durable State

- Build-time TOC projection。
- Validated owner candidate。
- Runtime id。
- Navigation envelope の shell projection。
- Search index / catalog に含まれる destination URL。

### Ephemeral State

- Hydration session。
- Mobile panel open state。
- Active heading snapshot。
- Desktop nav / mobile panel clone の current DOM。
- Search dialog open / query / selection state。

### Derived State

- Visible headings。
- Header trigger availability。
- TOC density tier。
- Diagnostics issue list。
- Return-to-reading request。

### Forbidden Coupling

- Router core が TOC current DOM、mobile panel、focus return、search dialog state を所有してはならない。
- Search UI が router core を runtime import してはならない。
- Header trigger が TOC headings の source になってはならない。
- `NavigationEnvelope.hydrationPlan` を hydration trigger 正本として扱ってはならない。
- Density tier を content authoring 規約、URL、search ranking へ逆流させてはならない。

## 5. Failure Semantics

- Owner candidate 不整合は build-time validation で拒否する。
- Runtime source 欠落、duplicate owner、source cleanup failure は diagnostics として観測可能にする。
- Hydration target 欠落時も no-JS baseline の読書構造を壊さない。
- Production CSS artifact に mobile TOC / density selector が到達していない場合は production build gate の失敗として扱う。
- Search return-to-reading adapter が接続できない場合、検索 UI は選択通知までに留まり、検索意味論を再計算しない。

## 6. Integration Boundaries

### Build-time

- Note projection、owner candidate validation、navigation artifact、production CSS artifact assertion を担当する。

### SSR

- No-JS baseline と desktop TOC nav、TOC JSON source、必要な hydration marker を出力する。
- TOC absent note は TOC DOM / TOC JSON source / header TOC identity を出力しない。
- Static TOC present fixture は `data-toc-hydration="static"` の desktop nav と article 前 mobile static nav を出し、controller / JSON source / mobile panel trigger は出力しない。

### Client Runtime

- `layout-toc-controller` と sync helper が desktop nav / mobile panel clone / header snapshot を同期する。
- Search bootstrap は選択 event を return-to-reading request へ橋渡しする。

### Hydration

- Scheduler / registry が hydration trigger と lifecycle を所有し、component-local connected timing へ戻さない。

### Tests

- Placement は `docs/contracts/testing-taxonomy.md` に従う。DOM / CSS structure は SSR、observable runtime は browser / e2e、pure boundary validators は node / script で固定する。

## 7. Acceptance Criteria

- Reading chrome は static-first の本文読書構造を壊さない。
- TOC owner / source / trigger / mobile panel の ownership が分離されている。
- Desktop nav と mobile panel clone が同じ active state と visible headings で同期する。
- Search return-to-reading が検索 UI と router の import boundary を壊さない。
- Production CSS artifact と import-boundary assertion が final validation に含まれている。
- Design System pattern docs は機能 Contract を上書きせず、読書面での見え方と intrusion 判断だけを扱う。
