# Search Contract

## 1. Status

- Type: Normative
- Source of truth: `src/search/`、Pagefind integration、search tests
- Applies to: 検索意味論、責務境界、URL 状態、縮退 diagnostics
- Non-goals: UI component の視覚表現、詳細型一覧、ranking score 詳細

## 2. Ownership

### This Layer Owns

- 検索コア、検索ソース層、UI 層の分離。
- `navigate` / `explore` の意味論。
- Pagefind と catalog の役割分担。
- `canonicalPathname` と `SearchStateUrl` の区別。
- Snippet の安全境界。
- 検索失敗時の縮退運転と diagnostics。

### This Layer Must Not Own

- Note permalink / slug / directory-index。正本は `docs/contracts/note-navigation.md`。
- Permanent URL / `/archives/{hash}` / hash 生成規則。正本は `docs/contracts/permanent-url.md`。
- UI pattern としての検索導線。`docs/design-system/patterns.md` が扱ってよい。
- Reading chrome への return-to-reading UI pattern。正本は `docs/contracts/reading-chrome.md` と Design System pattern docs。

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

- UI events は検索 UI が所有する。検索コアは DOM event を所有しない。
- `search-dialog:selected` は static search dialog の選択通知であり、return-to-reading への橋渡しは navigation adapter が担う。

### DOM / URL / State Contract

- `navigate` は目的地を見つけるための検索 mode である。
- `explore` は結果を比較・探索するための検索 mode である。
- `canonicalPathname` / `SearchCanonicalPathname` は document 重複判定と結果識別に使う。
- `SearchStateUrl` は検索画面の query / filter / mode state を表す。
- `SearchCanonicalPathname` と note page navigation URL を同一視してはならない。
- Snippet は構造化表現であり、生 HTML を UI 境界へ渡してはならない。
- UI は検索 ranking や source 統合の意味論を持たない。
- Search UI は router core を runtime import せず、return-to-reading request を event / adapter 境界で扱う。

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

- Search UI へ検索意味論を移してはならない。
- Permanent URL を通常結果 URL の canonicalization へ混ぜてはならない。
- Search URL state を router core の feature-local state と混同してはならない。
- Search dialog の選択通知を router core ownership へ直接結合してはならない。

## 5. Failure Semantics

- Pagefind が使えない場合、可能なら catalog で縮退する。
- Catalog が欠落した場合、Pagefind の範囲で検索を継続できる。
- 不正候補、URL 正規化失敗、source 欠落は diagnostics として観測可能にする。
- Degraded diagnostics は UI 表示の材料であり、UI は独自に検索意味論を再計算しない。

## 6. Integration Boundaries

### Build-time

- Pagefind index と catalog を生成する。

### SSR

- 検索ページの no-JS 情報構造を維持する。

### Client Runtime

- Search core は source adapter と URL adapter を通して実行される。
- Search bootstrap は dialog selection を return-to-reading request へ変換し、navigation adapter が遷移を実行する。
- Global search dialog は final HTML では static `<dialog data-search-dialog-root>` として表現し、`src/layouts/search-dialog-html.ts` が light DOM shell を所有する。`<form method="dialog">`、`<ui-search-dialog>`、`<ui-search-field>` に依存してはならない。
- Runtime behavior は `src/client/post-hydrate/search-dialog-enhancer.ts` と `src/client/post-hydrate/search-dialog-dom-controller.ts` が所有する。enhancer は static DOM controller の生成と trigger binding に責務を限定する。
- `open-search-dialog` bridge と query debounce / `AbortController` / stale suppression は `src/search/bootstrap.ts` が所有する。
- selection から return-to-reading への変換は bootstrap / navigation adapter 境界で行う。
- trigger の `aria-expanded`、body scroll lock、focus return、native close completion は static DOM controller が所有する。
- unavailable 中は query / input value 同期だけを許可し、loading / results / error の source state を蓄積しない。

#### Static Global Search Dialog Lifecycle

- close は `search-dialog:close-request` に集約する。native `cancel` は `preventDefault()` し、Escape の close-request に正規化する。
- native `close` は close completion の入口である。`completeCloseOnce(source, generation)` は generation 単位で一度だけ focus return、body unlock、trigger の `aria-expanded=false` を実行する。
- `activeCloseGeneration` は controller 起因の native close と外部 native close を区別する。外部 native close も同じ cleanup へ合流する。
- dispose cleanup は user-facing focus-return event を発火させない。
- selection close では trigger へ focus を返さず、必要な場合だけ blur する。
- close pending / closing 中の open-request は破棄する。close 完了後に pending open を再実行してはならない。

#### Static Global Search Dialog State And Events

- event detail 型の正本は `src/search/search-dialog-events.ts` とする。`src/search/search-dialog-types.ts` に戻してはならない。
- live region message の正本は `src/search/search-dialog-constants.ts` の `SEARCH_DIALOG_STATUS_IDLE_MESSAGE`、`SEARCH_DIALOG_STATUS_LOADING_MESSAGE`、`SEARCH_DIALOG_STATUS_ERROR_FALLBACK_MESSAGE`、`SEARCH_DIALOG_STATUS_EMPTY_MESSAGE`、`createSearchDialogResultsStatusMessage` とする。unavailable message は runtime state の `unavailableMessage` を使う。
- query change 時は旧 query の count message を消す。`completedResultsQuery !== current trimmed query` の間は旧 count を live region に出さない。
- results-change は current trimmed query と一致する場合だけ採用する。stale results と stale row は selection に使わない。

#### Static Global Search Dialog DOM

- input は `role="combobox"`、results は `role="listbox"` とする。active option は `aria-activedescendant` で同期し、virtualized list でも active option を DOM に保持する。
- result row は safe DOM rendering で構築し、`innerHTML` を使わない。
- result row は `role="option"`、stable DOM `id`、`data-index`、`data-item-id` を持つ。stable item id の正本 contract は `data-item-id` とする。互換目的の `data-id` は残してよい。
- selection detail は DOM dataset から復元せず、controller state の current `SearchDialogItem` から構築する。
- SVG / path click は button または row の操作として扱う。

### Hydration

- Search UI の hydration trigger は scheduler / registry が所有する。

### Tests

- 詳細型、ranking、diagnostics は Reference を参照し、配置は `docs/contracts/testing-taxonomy.md` に従う。

## 7. Acceptance Criteria

- Search core、source adapter、UI 層が分離されている。
- `canonicalPathname` と `SearchStateUrl` が混同されていない。
- Snippet が生 HTML として UI 境界へ渡されない。
- 検索失敗時に縮退 diagnostics が観測できる。
