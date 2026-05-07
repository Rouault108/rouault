# Router Contract

## 1. Status

- Type: Normative
- Source of truth: `src/router/` の router core、router adapters、対応する router tests
- Applies to: client navigation、history commit、route/fetch 経路の統合
- Non-goals: focus、scroll、announcement、component-local UI state、hydration trigger、sidebar presentation state、検索 UI state

## 2. Ownership

### This layer owns

- `NavigationEnvelope` を入力とする client navigation の遷移意味論。
- URL 正規化、route 解決、document 取得、history state、本文・shell・document metadata の durable commit。
- `start()`、`destroy()`、`navigate()` の lifecycle と、latest-wins / superseded の制御。
- `NavigationResult`、`NavigationOutcome`、`committed`、`degraded`、`issues` の意味。

### This layer must not own

- 本文 DOM 境界。正本は `docs/contracts/router-document.md` とする。
- `NavigationEnvelope` schema 詳細。正本は `docs/references/navigation-envelope-schema.md` とする。
- hydration trigger。正本は `docs/contracts/hydration.md` と scheduler / registry とする。
- sidebar state ownership。正本は `docs/contracts/sidebar-state.md` とする。
- note identity、permalink、breadcrumb、directory-index。正本は `docs/contracts/note-navigation.md` とする。
- Permanent URL の hash 生成規則。正本は `docs/contracts/permanent-url.md` とする。
- 検索 URL state。正本は `docs/contracts/search.md` とする。
- Reading chrome の owner / trigger / mobile panel / current DOM。正本は `docs/contracts/reading-chrome.md` とする。

## 3. Public Contract

### Inputs

- `new Router(outlet, options?)` は、router が所有する outlet と adapter 群を受け取る。
- `start()` は未開始 router を起動し、リンク intercept と `popstate` 監視を有効にする。
- `destroy()` は router を停止し、登録済み listener と進行中 navigation を終了させる。
- `navigate(request)` は navigation URL、replace/state、route handler、fetch 経路の結果を統合して遷移を試みる。

### Outputs

- `navigate()` は、遷移が durable commit に到達したかを示す `NavigationResult` を返す。
- `committed` は history / document / shell の durable commit が成立したことを示す。
- `degraded` は主要 commit は成立したが、post-commit 処理や付随情報に問題があったことを示す。
- `issues` は縮退理由を列挙する。router は issue を UI 表示へ直接変換しない。

### Events

- `before:navigate` は navigation 開始前の観測・キャンセル点である。
- `navigation:busy-change` は navigation 中状態の変化を通知する。
- `after:navigate` は `NavigationResult` が確定した後に通知する。

### DOM / URL / State Contract

- navigation URL は共有可能で再構成可能な route state を表す。
- state-only navigation は document fetch と content hydration trigger を発生させない。
- feature-local URL state は各 feature が所有し、router core は意味を解釈しない。
- Search return-to-reading は router の公開 navigation adapter へ接続されるが、search UI や reading chrome state は router core の durable state ではない。
- fetch target URL は取得直前にのみ導出する。
- 静的 HTML の `index.html` 解決に必要な trailing slash 補完は fetch target 解決層の責務である。
- trailing slash 補完は note page navigation URL の canonical 定義を書き換えない。

## 4. State Model

### Durable State

- current navigation URL
- `history.state`
- document content
- shell projection
- document metadata

### Ephemeral State

- in-flight navigation
- abort signal
- busy state
- superseded navigation marker

### Derived State

- fetch target URL
- state-only 判定
- `NavigationOutcome`
- degraded issues

### Forbidden Coupling

- router core は focus 移動、scroll 復帰、読み上げ文言、component-local state を所有してはならない。
- router core は TOC current DOM、mobile panel open state、search dialog selection state を所有してはならない。
- router core は fetched HTML の component 属性形式を router protocol として扱ってはならない。
- router core は `/archives/{hash}` を通常の note page navigation URL として扱ってはならない。

## 5. Failure Semantics

- durable commit 前の失敗は `committed: false` として扱う。
- durable commit 後の失敗は、可能な限り `committed: true` かつ `degraded: true` として扱う。
- 新しい navigation が開始された場合、古い navigation は superseded として扱う。
- buildId 不一致や envelope 不整合は、可能なら document navigation へ縮退する。

## 6. Integration Boundaries

### Build-time

- Build-time は route artifact と `NavigationEnvelope` を生成する。router core は生成処理を所有しない。

### SSR

- SSR 初期表示の本文境界は `docs/contracts/router-document.md` に従う。

### Client Runtime

- `contentAdapter` は本文 commit、`shellAdapter` は shell commit、`urlStateNavigationPolicy` は state-only 判定、`postCommitController` は commit 後処理を担う。

### Hydration

- router core は hydration trigger を所有しない。SPA 遷移後の content hydration trigger は scheduler / registry が所有する。

### Tests

- 検証レイヤは `docs/contracts/testing-taxonomy.md` の一般分類に従う。

## 7. Acceptance Criteria

- `navigate()` の戻り値と `after:navigate` が同じ outcome を観測できる。
- durable commit 前後の failure semantics が区別されている。
- state-only navigation が document fetch と content hydration trigger を起こさない。
- note page navigation URL と fetch target URL が混同されていない。
- router core が focus / scroll / announcement / UI state を所有していない。
