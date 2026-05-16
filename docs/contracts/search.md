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
- `ui-search-dialog-selected` は選択通知であり、return-to-reading への橋渡しは navigation adapter が担う。

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

### Hydration

- Search UI の hydration trigger は scheduler / registry が所有する。

### Tests

- 詳細型、ranking、diagnostics は Reference を参照し、配置は `docs/contracts/testing-taxonomy.md` に従う。

## 7. Acceptance Criteria

- Search core、source adapter、UI 層が分離されている。
- `canonicalPathname` と `SearchStateUrl` が混同されていない。
- Snippet が生 HTML として UI 境界へ渡されない。
- 検索失敗時に縮退 diagnostics が観測できる。
