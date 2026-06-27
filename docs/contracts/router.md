# Router Contract

## 1. Status

- Type: Normative
- Source of truth: `src/router/`のrouter core、router adapters、対応するrouter tests
- Applies to: client navigation、history commit、route/fetch 経路の統合
- Non-goals: focus、scroll、announcement、component-local UI state、hydration trigger、sidebar presentation state、検索UI state

## 2. Ownership

### This layer owns

- `NavigationEnvelope`を入力とするclient navigationの遷移意味論。
- URL正規化、route解決、document取得、history state、本文・shell・document metadataのdurable commit。
- `start()`、`destroy()`、`navigate()`のlifecycleと、latest-wins / supersededの制御。
- `NavigationResult`、`NavigationOutcome`、`committed`、`degraded`、`issues`の意味。

### This layer must not own

- 本文DOM境界。正本は`docs/contracts/router-document.md`とする。
- `NavigationEnvelope` schema詳細。正本は`docs/references/navigation-envelope-schema.md`とする。
- hydration trigger。正本は`docs/contracts/hydration.md`とscheduler / registryとする。
- sidebar state ownership。正本は`docs/contracts/sidebar-state.md`とする。
- note identity、permalink、breadcrumb、directory-index。正本は`docs/contracts/note-navigation.md`とする。
- Permanent URLのhash生成規則。正本は`docs/contracts/permanent-url.md`とする。
- 検索URL state。正本は`docs/contracts/search.md`とする。
- Reading chromeのowner / trigger / mobile panel / current DOM。正本は`docs/contracts/reading-chrome.md`とする。

## 3. Public Contract

### Inputs

- `new Router(outlet, options?)`は、routerが所有するoutletとadapter群を受け取る。
- `start()`は未開始routerを起動し、リンクinterceptと`popstate`監視を有効にする。
- `destroy()`はrouterを停止し、登録済みlistenerと進行中navigationを終了させる。
- `navigate(request)`はnavigation URL、replace/state、route handler、fetch経路の結果を統合して遷移を試みる。

### Outputs

- `navigate()`は、遷移がdurable commitに到達したかを示す`NavigationResult`を返す。
- `committed`はhistory / document / shellのdurable commitが成立したことを示す。
- `degraded`は主要commitは成立したが、post-commit処理や付随情報に問題があったことを示す。
- `issues`は縮退理由を列挙する。routerはissueをUI表示へ直接変換しない。

### Events

- `before:navigate`はnavigation開始前の観測・キャンセル点である。
- `navigation:busy-change`はnavigation中状態の変化を通知する。
- `after:navigate`は`NavigationResult`が確定した後に通知する。

### DOM / URL / State Contract

- navigation URLは共有可能で再構成可能なroute stateを表す。
- state-only navigationはdocument fetchとcontent hydration triggerを発生させない。
- feature-local URL stateは各featureが所有し、router coreは意味を解釈しない。
- Search return-to-readingはrouterの公開navigation adapterへ接続されるが、search UIやreading chrome stateはrouter coreのdurable stateではない。
- fetch target URLは取得直前にのみ導出する。
- 静的HTMLの`index.html`解決に必要なtrailing slash補完はfetch target解決層の責務である。
- trailing slash補完はnote page navigation URLのcanonical定義を書き換えない。
- document navigation fallbackは、`urlStateNavigationPolicy`評価後のfull navigationにのみ適用する。
- state-only navigationでは`DocumentLoader.load()`も`LocationAdapter.navigateDocument()`も呼ばない。

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
- state-only判定
- `NavigationOutcome`
- degraded issues

### Forbidden Coupling

- router coreはfocus移動、scroll復帰、読み上げ文言、component-local stateを所有してはならない。
- router coreはTOC current DOM、mobile panel open state、search dialog selection stateを所有してはならない。
- router coreはfetched HTMLのcomponent属性形式をrouter protocolとして扱ってはならない。
- router coreは`/archives/{hash}`を通常のnote page navigation URLとして扱ってはならない。

## 5. Failure Semantics

- durable commit前の失敗は`committed: false`として扱う。
- durable commit後の失敗は、可能な限り`committed: true`かつ`degraded: true`として扱う。
- 新しいnavigationが開始された場合、古いnavigationはsupersededとして扱う。
- fetch artifact由来の`buildId`不一致、`schemaVersion`不一致、NavigationEnvelope contract error、artifact HTTP status errorは、通常内部遷移ではSPA commitせず、目的URLへのdocument navigationへ縮退する。
- fetch artifact由来のfallback reasonは`NavigationResult.reason`で表す。`NavigationIssue`はこの分類のために拡張しない。
- current document側`buildId`欠落・不正は`current-build-id-invalid`としてfetch artifact由来とは別に分類し、通常内部遷移ではdocument navigationへ縮退する。
- 初期navigationで同一URLへのdocument navigation fallbackが必要になった場合はreload loopを避け、`LocationAdapter.navigateDocument()`を呼ばずにerror fallback envelopeをcommitする。
- document-route handler例外とdocument-route由来の不正NavigationEnvelopeはstale fetch artifact fallbackで隠蔽せず、既存のerror fallback semanticsを維持する。
- AbortError、TimeoutError、network errorはdocument navigation fallbackへ変換しない。
- document navigation fallback成功時はcontent/shell/history commit、`content:load`、`ui-url-state-change`、post-commit処理を実行しない。

## 6. Integration Boundaries

### Build-time

- Build-timeはroute artifactと`NavigationEnvelope`を生成する。router coreは生成処理を所有しない。

### SSR

- SSR初期表示の本文境界は`docs/contracts/router-document.md`に従う。

### Client Runtime

- `contentAdapter`は本文commit、`shellAdapter`はshell commit、`urlStateNavigationPolicy`はstate-only判定、`postCommitController`はcommit後処理を担う。

### Hydration

- router coreはhydration triggerを所有しない。SPA遷移後のcontent hydration triggerはscheduler / registryが所有する。

### Tests

- 検証レイヤは`docs/contracts/testing-taxonomy.md`の一般分類に従う。

## 7. Acceptance Criteria

- `navigate()`の戻り値と`after:navigate`が同じoutcomeを観測できる。
- durable commit前後のfailure semanticsが区別されている。
- state-only navigationがdocument fetchとcontent hydration triggerを起こさない。
- note page navigation URLとfetch target URLが混同されていない。
- router coreがfocus / scroll / announcement / UI stateを所有していない。
