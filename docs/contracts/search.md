# Search Contract

## 1. Status

- Type: Normative
- Source of truth: `src/search/`、Pagefind integration、search tests
- Applies to: 検索意味論、責務境界、URL状態、縮退diagnostics
- Non-goals: UI componentの視覚表現、詳細型一覧、ranking score詳細

## 2. Ownership

### 採用済み移行計画のStage 1基盤

2026-09-24の明示採用に基づき、`build/search/build-search-projection.ts`と
`project-search-html.ts`にfinal HTML projectionを追加した。公開対象とmetadataは既存の
publication / Catalog projectionを共用し、本文は一意の`data-note-static-surface`から抽出する。
metadata・HTML欠落とcanonical重複はbuild failure、空本文は有効なdocumentとする。
`shared/search/search-projection.ts`は表示用原文のdocument / passage型を所有する。

passageは外側のparagraph / list / blockquote / table / preごとに抽出し、見出しを別metadataにする。
800 Unicode code pointsを上限として改行、空白、hard splitの順に分割し、overlapは設けない。
操作用・明示除外subtreeを除き、画像altと数式TeXは一度だけ採用する。
`shared/search/lexical-analyzer.ts`はSuzume 0.9.11 / S-Nを使う
`rouault-lexical-v3`の正本である。NFKCの原文UTF-16被覆範囲を保持し、ASCII小文字化、
camelCase境界、word出現列と日本語exact 2-gram出現列を生成する。query列だけをdedupeする。
provider側の追加正規化やoffset不整合は失敗とし、別Analyzerへfallbackしない。
WASMは公式配布の固定hashを検証し、Nodeとbrowser Workerで同一bytesを使用する。

`shared/search/lexical-artifacts.ts`はschema 2、MiniSearch 7.2.0、
`rouault-minisearch-index-v1`と既採用profile/provider identityを検証する。
document metadataに本文、passage metadataに原文を複製せず、原文は単一passage storeへ置く。
descriptor / inner index hash、metadata / index / store参照、canonical重複、passage順序を検証する。
`build/search/emit-lexical-foundation.ts`はprojectionからNodeでindexを生成し、
`write-lexical-artifacts.ts`が検証後にcontent-hashed assetsを出力してmanifestを最後に置換する。
SuzumeとMiniSearchのLICENSEも同じ静的資産集合に含める。

`shared/search/suzume-provider-config.json`は採用済みEvidenceのbytesを保存する。
中の隔離比較時点のscope/provenanceは履歴であり、2026-09-24の明示採用により実装入力となった。
このファイルは固定hashのため改行変換・format対象から除外する。
`test/fixtures/search/canonical-v3.json`は採用済み1,867入力の期待値と出典hashを保持する。
`serialized-v2.json`はNode生成indexの固定fixtureで、browser側で再indexしない。

検証入口は通常の`pnpm build`後の`pnpm verify:search-foundation`。
現在のfinal HTMLを読み、`.generated/search-foundation/`だけへ生成して、再生成の決定性とloadを検証する。
Stage 1基盤は実装済みである。production build / runtimeへの接続は未実施であり、
以下のPagefind契約は切替まで有効である。Stage 2のWorker・ranking・response・recovery結合とD1は別途必要となる。

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
- URL分類の横断意味論。正本は`docs/contracts/url-policy.md`。
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
- SearchStateUrl、SearchCanonicalPathname、SearchRenderHrefは分離して扱う。
- SearchCanonicalPathnameは検索結果のdocument重複判定・結果識別用canonicalである。
- SearchCanonicalPathnameはSearchStateUrlではなく、note permalinkでもない。
- どのrouteを検索対象documentとして採用するかは、検索index生成・内部document判定側の責務である。
- `SearchCanonicalPathname`とnote page navigation URLを同一視してはならない。
- SearchRenderHrefは検索結果表示用hrefであり、note permalinkではない。
- SearchRenderHrefはbasePath付きになり得る。
- `/tags/{tag}/`はtag SearchStateUrlとしてのcanonicalであり、`/tags/{tag}`はtag SearchStateUrlのcanonicalではない。
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
- ArrowUp/ArrowDownなどのkeyboard navigationでactive optionを移動した場合だけ、virtualized / non-virtualizedのどちらの結果表示でも、必要に応じてactive optionがresults viewport内に収まるようscrollTopを調整してよい。
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
