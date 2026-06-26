# Search Contract

## 1. Status

- Type: Normative
- Source of truth: `src/search/`、Pagefind integration、search tests
- Applies to: 検索意味論、責務境界、URL状態、縮退diagnostics
- Non-goals: UI componentの視覚表現、詳細型一覧、ranking score詳細

## 2. Ownership

### This Layer Owns

- 検索コア、検索ソース層、UI層の分離。
- `navigate` / `explore`の意味論。
- Pagefindとcatalogの役割分担。
- `canonicalPathname`と`SearchStateUrl`の区別。
- Snippetの安全境界。
- 検索失敗時の縮退運転とdiagnostics。

### This Layer Must Not Own

- Note permalink / slug / directory-index。正本は`docs/contracts/note-navigation.md`。
- Permanent URL / `/archives/{hash}` / hash生成規則。正本は`docs/contracts/permanent-url.md`。
- UI patternとしての検索導線。`docs/design-system/patterns.md`が扱ってよい。
- Reading chromeへのreturn-to-reading UI pattern。正本は`docs/contracts/reading-chrome.md`とDesign System pattern docs。

## 3. Public Contract

### Inputs

- User query。
- Tag filter。
- Search mode。
- Pagefind source。
- Catalog source。

### Outputs

- `SearchResponse`。
- Safe structured snippets。
- Degraded diagnostics。
- Search state URL。

### Events

- UI eventsは検索UIが所有する。検索コアはDOM eventを所有しない。
- `search-dialog:selected`はstatic search dialogの選択通知であり、return-to-readingへの橋渡しはnavigation adapterが担う。

### DOM / URL / State Contract

- `navigate`は目的地を見つけるための検索modeである。
- `explore`は結果を比較・探索するための検索modeである。
- `canonicalPathname` / `SearchCanonicalPathname`はdocument重複判定と結果識別に使う。
- `SearchStateUrl`は検索画面のquery / filter / mode stateを表す。
- `SearchCanonicalPathname`とnote page navigation URLを同一視してはならない。
- Snippetは構造化表現であり、生HTMLをUI境界へ渡してはならない。
- UIは検索rankingやsource統合の意味論を持たない。
- Search UIはrouter coreをruntime importせず、return-to-reading requestをevent / adapter境界で扱う。

## 4. State Model

### Durable State

- Search index。
- Catalog。
- Search URL state。

### Ephemeral State

- In-flight query。
- Dialog open state。
- UI selection state。

### Derived State

- Tokenized query。
- Candidate merge result。
- Ranked results。
- Diagnostics。

### Forbidden Coupling

- Search UIへ検索意味論を移してはならない。
- Permanent URLを通常結果URLのcanonicalizationへ混ぜてはならない。
- Search URL stateをrouter coreのfeature-local stateと混同してはならない。
- Search dialogの選択通知をrouter core ownershipへ直接結合してはならない。

## 5. Failure Semantics

- Pagefindが使えない場合、可能ならcatalogで縮退する。
- Catalogが欠落した場合、Pagefindの範囲で検索を継続できる。
- 不正候補、URL正規化失敗、source欠落はdiagnosticsとして観測可能にする。
- Degraded diagnosticsはUI表示の材料であり、UIは独自に検索意味論を再計算しない。

## 6. Integration Boundaries

### Build-time

- Pagefind indexとcatalogを生成する。

### SSR

- 検索ページのno-JS情報構造を維持する。

### Client Runtime

- Search coreはsource adapterとURL adapterを通して実行される。
- Search bootstrapはdialog selectionをreturn-to-reading requestへ変換し、navigation adapterが遷移を実行する。
- Global search dialogはfinal HTMLではstatic `<dialog data-search-dialog-root>`として表現し、`src/layouts/search-dialog-html.ts`がlight DOM shellを所有する。`<form method="dialog">`、`<ui-search-dialog>`、`<ui-search-field>`に依存してはならない。
- Runtime behaviorは`src/client/post-hydrate/search-dialog-enhancer.ts`と`src/client/post-hydrate/search-dialog-dom-controller.ts`が所有する。enhancerはstatic DOM controllerの生成とtrigger bindingに責務を限定する。
- `open-search-dialog` bridgeとquery debounce / `AbortController` / stale suppressionは`src/search/bootstrap.ts`が所有する。
- selectionからreturn-to-readingへの変換はbootstrap / navigation adapter境界で行う。
- triggerの`aria-expanded`、body scroll lock、focus return、native close completionはstatic DOM controllerが所有する。
- unavailable中はquery / input value同期だけを許可し、loading / results / errorのsource stateを蓄積しない。

#### Static Global Search Dialog Lifecycle

- closeは`search-dialog:close-request`に集約する。native `cancel`は`preventDefault()`し、Escapeのclose-requestに正規化する。
- native `close`はclose completionの入口である。`completeCloseOnce(source, generation)`はgeneration単位で一度だけfocus return、body unlock、triggerの`aria-expanded=false`を実行する。
- `activeCloseGeneration`はcontroller起因のnative closeと外部native closeを区別する。外部native closeも同じcleanupへ合流する。
- dispose cleanupはuser-facing focus-return eventを発火させない。
- selection closeではtriggerへfocusを返さず、必要な場合だけblurする。
- close pending / closing中のopen-requestは破棄する。close完了後にpending openを再実行してはならない。

#### Static Global Search Dialog State And Events

- event detail型の正本は`src/search/search-dialog-events.ts`とする。`src/search/search-dialog-types.ts`に戻してはならない。
- live region messageの正本は`src/search/search-dialog-constants.ts`の`SEARCH_DIALOG_STATUS_IDLE_MESSAGE`、`SEARCH_DIALOG_STATUS_LOADING_MESSAGE`、`SEARCH_DIALOG_STATUS_ERROR_FALLBACK_MESSAGE`、`SEARCH_DIALOG_STATUS_EMPTY_MESSAGE`、`createSearchDialogResultsStatusMessage`とする。unavailable messageはruntime stateの`unavailableMessage`を使う。
- query change時は旧queryのcount messageを消す。`completedResultsQuery !== current trimmed query`の間は旧countをlive regionに出さない。
- results-changeはcurrent trimmed queryと一致する場合だけ採用する。stale resultsとstale rowはselectionに使わない。

#### Static Global Search Dialog DOM

- inputは`role="combobox"`、resultsは`role="listbox"`とする。
- `aria-activedescendant`を設定する場合、その参照先optionはDOM上に存在しなければならない。
- virtualized listのpassive scroll中は`scrollTop`をviewport正本とし、active optionは仮想化描画範囲を強制的に引き戻してはならない。
- virtualized listのpassive scrollによりactive optionが現在の視覚viewport外へ出た場合、controllerはactive状態を解除し、`aria-activedescendant`を外す。
- ArrowUp/ArrowDownなどのkeyboard navigationでactive optionを移動した場合だけ、必要に応じてactive optionをviewport内へscroll into viewしてよい。
- active解除後のArrowDown/ArrowUpは現在の視覚viewport内の候補から再開する。
- activeがない状態でEnterを押しても、先頭候補を暗黙選択してはならない。
- result rowはsafe DOM renderingで構築し、`innerHTML`を使わない。
- result rowは`role="option"`、stable DOM `id`、`data-index`、`data-item-id`を持つ。stable item idの正本contractは`data-item-id`とする。互換目的の`data-id`は残してよい。
- selection detailはDOM datasetから復元せず、controller stateのcurrent `SearchDialogItem`から構築する。
- SVG / path clickはbuttonまたはrowの操作として扱う。

### Hydration

- Search UIのhydration triggerはscheduler / registryが所有する。

### Tests

- 詳細型、ranking、diagnosticsはReferenceを参照し、配置は`docs/contracts/testing-taxonomy.md`に従う。

## 7. Acceptance Criteria

- Search core、source adapter、UI層が分離されている。
- `canonicalPathname`と`SearchStateUrl`が混同されていない。
- Snippetが生HTMLとしてUI境界へ渡されない。
- 検索失敗時に縮退diagnosticsが観測できる。
