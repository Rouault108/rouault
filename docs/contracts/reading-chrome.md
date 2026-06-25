# Reading Chrome Contract

## 1. Status

- Type: Normative
- Source of truth: note page projection、TOC owner validation、hydration scheduler / registry、search return-to-reading integration、production artifact validators
- Applies to: note reading chrome、fixed sidebar note frame geometry、TOC owner / source / trigger boundary、mobile TOC panel、desktop TOC sync、search result return-to-reading、diagnostics、density tier、documentation audit
- Non-goals: router URL意味論の再定義、検索ranking詳細、component固有visual tokenの全列挙、authoring記法の追加

## 2. Ownership

### This Layer Owns

- 読書中に本文外へ置く補助chromeの責務境界。
- TOC owner、TOC source、desktop nav、mobile panel clone、header triggerの接続条件。
- Build-time owner validationとruntime hydration lifecycleの分離。
- Reading chromeに関係するdiagnosticsを、表示仕様ではなく契約違反の観測面として扱うこと。
- TOC density tierを見出し量から導出し、意味論を変えずに読書面の密度だけへ反映すること。
- Desktop fixed sidebar表示時のnote frame outer gutter。left sidebar、main、desktop TOCを含むnote frameがviewport edgeに接しないための最小外側余白を所有する。

### This Layer Must Not Own

- Navigation URL、fetch target URL、history commit。正本は`docs/contracts/router.md`と`docs/contracts/note-navigation.md`。
- Hydration triggerの正本。正本は`docs/contracts/hydration.md`。
- `NavigationEnvelope` schemaの詳細。正本は`docs/references/navigation-envelope-schema.md`。
- 検索ranking、source統合、diagnostics aggregationの詳細。正本は`docs/contracts/search.md`と`docs/references/search-ranking-and-diagnostics.md`。
- Component単体のvisual token詳細。正本は`docs/design-system/components/`。
- Header geometry。static headerの幅・配置契約はreading chrome note frame geometryとは別契約として扱う。
- Sidebar state persistence。tree state、overlay state、保存先、復元条件は`docs/contracts/sidebar-state.md`を正本とする。

## 3. Public Contract

### Inputs

- Note page projectionが生成するTOC presence、TOC headings、runtime id、owner candidate、shell trigger projection。
- SSRが出力するdesktop TOC nav、TOC JSON source、hydration marker。
- Scheduler / registryが所有するhydration target。
- Search dialogのselection eventから変換されるreturn-to-reading request。

### Outputs

- Static-firstで読めるnote HTML。
- Hydration後に同期されたdesktop nav、mobile panel nav、header trigger state。
- `ready`、`hasVisibleHeadings`、`activeId`を含むheader向けruntime snapshot。
- Build-time / runtime / production artifact validationで観測できるdiagnostics。

### Events

- Reading chromeはrouter eventをhydration triggerの正本にしない。
- Search result selectionは検索UIからの選択通知であり、navigation adapterがreturn-to-reading requestへ橋渡しする。

### DOM / URL / State Contract

- Note pageではSSRのdesktop TOC navを正本とし、mobile panelはruntime cloneとして扱う。
- Header triggerはTOC content ownerにならない。triggerはopen / closeの導線であり、TOC headingsを保持しない。
- TOC owner candidateが未確定または不正な場合、interactive triggerを有効なreading chromeとして見せない。
- Hydration markerはbuild-time / runtime接続点であり、visual variantとして使わない。
- Desktop navとmobile panel navは同じvisible headingsとactive idからcurrent DOMを同期する。
- Density tierは`compact`、`comfortable`、`expanded`の視覚密度であり、heading identity、URL、active stateの意味を変えない。
- TOC density tierは表示密度を調整するが、階層だけを理由に見出しラベルを1行省略してはならない。
- `compact` densityは余白を詰めるための契約であり、見出し情報を過剰に欠落させる契約ではない。
- Desktop TOC nav、static-first mobile panel clone、Lit `ui-toc`は同じlabel wrapping contractを共有する。
- SSR `.layout-toc`とLit `ui-toc`は、同じ`--toc-item-inactive-max-lines` / `--toc-item-active-max-lines` contractに従う。
- `data-heading-depth`は階層インデントなどの構造表現に使うが、label wrappingを1行化する根拠として使ってはならない。
- Mobile panelのDOM contract hookは`[data-layout-toc-mobile-panel]`であり、CSS styling hookは`.layout-toc-mobile-panel`である。DOM / test lookupは`[data-layout-toc-mobile-panel]`を正本とし、`.layout-toc-mobile-panel`を正本DOM selectorとして扱わない。
- Searchのreturn-to-readingはrouter coreのimport boundaryを壊さず、検索UIはrouterを直接所有しない。

### Desktop Note Frame Geometry

- 固定サイドバー表示時、left sidebar、main、desktop TOCを含むnote frameはviewport edgeから最小outer gutterを持つ。
- Outer gutterは`--note-frame-outer-gutter`を最小値契約として使う。wide viewportでは中央寄せとmax-widthにより、実際のgutterが`--note-frame-outer-gutter`より大きくなってよい。
- Outer gutterはsidebar item paddingやTOC item paddingとは別契約である。項目密度やactive rail、TOC indentの調整でnote frame外側余白を代替してはならない。
- Outer gutterはsidebar state、TOC active state、URL、hydration ownership、ARIA意味論を変更しない。
- Header geometryは別契約であり、このnote frame outer gutter contractの対象ではない。

### Viewport Scrollbar Gutter

- Reading chromeはclassic scrollbar環境でmodal scroll lockによりviewport inline-sizeが変化しても、header、note frame、TOCのinline positionを変化させてはならない。
- Root viewport gutterの正本は`src/assets/css/main.css`の`html { scrollbar-gutter: stable; }`とする。
- Dialog open-state CSSはbody scroll lockを所有し、viewport gutter補正を所有しない。
- このcontractは検索ダイアログ固有ではなく、reading chromeの位置安定性に属する。

## 4. State Model

### Durable State

- Build-time TOC projection。
- Validated owner candidate。
- Runtime id。
- Navigation envelopeのshell projection。
- Search index / catalogに含まれるdestination URL。

### Ephemeral State

- Hydration session。
- Mobile panel open state。
- Active heading snapshot。
- Desktop nav / mobile panel cloneのcurrent DOM。
- Search dialog open / query / selection state。

### Derived State

- Visible headings。
- Header trigger availability。
- TOC density tier。
- Diagnostics issue list。
- Return-to-reading request。

### Forbidden Coupling

- Router coreがTOC current DOM、mobile panel、focus return、search dialog stateを所有してはならない。
- Search UIがrouter coreをruntime importしてはならない。
- Header triggerがTOC headingsのsourceになってはならない。
- `NavigationEnvelope.hydrationPlan`をhydration trigger正本として扱ってはならない。
- Density tierをcontent authoring規約、URL、search rankingへ逆流させてはならない。

## 5. Failure Semantics

- Owner candidate不整合はbuild-time validationで拒否する。
- Runtime source欠落、duplicate owner、source cleanup failureはdiagnosticsとして観測可能にする。
- Hydration target欠落時もno-JS baselineの読書構造を壊さない。
- Production CSS artifactにmobile TOC / density selectorが到達していない場合はproduction build gateの失敗として扱う。
- Search return-to-reading adapterが接続できない場合、検索UIは選択通知までに留まり、検索意味論を再計算しない。

## 6. Integration Boundaries

### Build-time

- Note projection、owner candidate validation、navigation artifact、production CSS artifact assertionを担当する。

### SSR

- No-JS baselineとdesktop TOC nav、TOC JSON source、必要なhydration markerを出力する。
- TOC absent noteはTOC DOM / TOC JSON source / header TOC identityを出力しない。
- Static TOC present fixtureは`data-toc-hydration="static"`のdesktop navとarticle前mobile static navを出し、controller / JSON source / mobile panel triggerは出力しない。

### Client Runtime

- `layout-toc-controller`とsync helperがdesktop nav / mobile panel clone / header snapshotを同期する。
- Search bootstrapは選択eventをreturn-to-reading requestへ橋渡しする。

### Hydration

- Scheduler / registryがhydration triggerとlifecycleを所有し、component-local connected timingへ戻さない。

### Tests

- Placementは`docs/contracts/testing-taxonomy.md`に従う。DOM / CSS structureはSSR、observable runtimeはbrowser / e2e、pure boundary validatorsはnode / scriptで固定する。

## 7. Acceptance Criteria

- Reading chromeはstatic-firstの本文読書構造を壊さない。
- TOC owner / source / trigger / mobile panelのownershipが分離されている。
- Desktop navとmobile panel cloneが同じactive stateとvisible headingsで同期する。
- Search return-to-readingが検索UIとrouterのimport boundaryを壊さない。
- Production CSS artifactとimport-boundary assertionがfinal validationに含まれている。
- Design System pattern docsは機能Contractを上書きせず、読書面での見え方とintrusion判断だけを扱う。
