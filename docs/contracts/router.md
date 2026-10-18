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
- URL分類の意味論。正本は`docs/contracts/url-policy.md`とする。

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
- URL分類の意味論は`docs/contracts/url-policy.md`を参照する。
- state-only navigationはdocument fetchとcontent hydration triggerを発生させない。
- feature-local URL stateは各featureが所有し、router coreは意味を解釈しない。
- Search return-to-readingはrouterの公開navigation adapterへ接続されるが、search UIやreading chrome stateはrouter coreのdurable stateではない。
- fetch target URLは取得直前にのみ導出する。
- Routerはnavigation requestの正規化とfetch target導出を扱う。
- 静的HTMLの`index.html`解決に必要なtrailing slash補完はfetch target解決層の責務である。
- trailing slash補完はnote page navigation URLのcanonical定義を書き換えない。
- generated document routeSetはroute presence判定用であり、note permalinkのcanonicalを定義しない。
- `GeneratedDocumentRouteSet`はURL意味分類ではなく、静的生成済みrouteのpresence判定集合である。
- `resolveRouaultContentPath()`はfetch target pathを導出する関数であり、公開canonicalを定義しない。
- internal document navigation validationは、basePath除去後の`pathname`だけでroute manifest掲載有無を判定し、`known-route`または`missing-route-candidate`としてrouter queueからdocument loaderへ引き継ぐ。query/hashはroute presence判定に使わない。
- `?tab=`と`#hash`の矛盾はRouterのNot Found責務ではない。有効pathでroute presenceが成立する場合、tabsなどのfeature-local URL state ownerが回復し、必要に応じて`replaceState`で正規化する。
- manifest非掲載でもinternal document navigationとして許可される`missing-route-candidate`はSPA遷移候補である。ただしdefault internal resource pathは従来どおり`disallowed-url`として拒否する。
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
- 例外として、`missing-route-candidate`のfetch artifactがHTTP 404を返した場合は、stale artifactではなくnot-foundとして扱い、`error-fallback` sourceのnot-found envelopeをSPA commitする。この場合もnot-foundに渡すURLはquery/hashを含むnormalized URLである。
- `known-route`のfetch artifact HTTP 404は、引き続き`fetch-navigation-envelope-http-status`のdocument navigation fallbackであり、not-found envelopeをSPA commitしない。
- `missing-route-candidate`であっても、`schemaVersion`不一致、`buildId`不一致、invalid content-type、invalid JSON、構造不正NavigationEnvelope、HTTP 404以外のstatus errorをnot-foundへ寄せない。
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

## Reading position integration

History entryの識別・cause・取消signalをpost-renderへ渡す。共通writerのstate保全を使い、本人feature intentで未commit requestを失効する。durable後の取消はcommitted:trueを維持する。scroll/focus/announcementはcoreへ移さない。 詳細は[Reading Position Contract](reading-position.md)。

## Content transition integration

通常`navigation`のfull commitで、前後ともhashなし・正常結果かつroute manifest掲載済みの移動に適用する。両端の`app-shell:validated`／取得・検証済みenvelopeから既知shellを判定し、配置一致は別の情報として扱う。`readContentTransitionShell`はshell schema、canonical header DOM、`layout-header` class、sidebar flagとprojectionの有無・ID整合、有限正数breakpoint、TOC不在時のtrigger非予約を検証する。note profileはsidebarあり／なし、TOCあり／なしを許容する。page profileはsidebarなし、TOCあり／なしを許容する（memo等のreading pageも含む）。note以外のsidebar profileや未知class・不正・不整合profileへは拡張しない。

対象は現在のBaseLayoutを使う公開note、`/tags/{tag}/`、`/search/`、`/corpora/`と個別corpus、`/`、`/about/`、`/memos/`と公開memoなどの既知ページ。note↔tag/search/corpora、sidebar・TOCの有無や本文列幅が変わる組を含め、両端が既知profileなら通常移動を許容する。route manifestのpresenceとshell検証が判定の正本であり、URL prefixから配置を推測しない。`layoutKey`は同配置かを比較する情報であって、演出可否の安全性検証の代替にしない。

初期表示、traverse、hash、state-only、error/not-foundとその直後、manifest未掲載route、document fallback、外部リンク、sidebarの枝開閉はnative演出に含めない。rollback後は次のshell検証成功まで通常commitへ縮退する。別所有者によるBack/Forwardの共通履歴表示は[Reading Position Contract](reading-position.md#履歴表示の共通判定)を参照。Routerのcommit callbackへ履歴用Animation待機を追加しない。

`ContentTransitionCoordinator`はAPI対応・reduced motion・表示状態・演出寿命だけを所有する。`commitLoadedSnapshot`は既存ContentCommitterの本文→shell→DOM検証→head→historyから、current URL・binding採用、`content:load`、既存post-commitのfocusと通常先頭位置適用までを一つの更新callbackへ渡す。callback入口でdestroy/abort/最新intentを再照合し、同じexecution signalをContentCommitterの既存checkCurrentへ渡し、transaction・rollback・epochを維持する。履歴確定後の中断はcommit成功とbindingを保ち、後続post-commitを抑止する。hydration-readyや読書位置の安定化jobはawaitしない。

callbackは保存したPromiseで最大一度実行する。APIの同期開始失敗のみ同じcallbackで通常commitへ縮退する。`updateCallbackDone`で更新完了を待つが、`ready`/`finished`の演出失敗を理由に再commit・history再書込・error文書化しない。実commit失敗は既存failure semanticsへ返す。NavigationQueueは`finished`を待たない。

execution abort/timeout、新intent、pointer/wheel/touchmove、scroll key/Tab/Escape/Enter、非表示化、viewport変更、pagehide、reduced-motion変更、destroyで演出をskipする。skipはcallbackを取り消さないため、既存intent検査が古い更新を防ぐ。演出オブジェクトの同一性でcleanupを守り、古いfinishedが新しいmarkerを消さない。

## Commit acceptance and recovery

Full本文更新では、`before-mutation`でReadingPositionControllerが旧表示のcheckpointと保存抑止を確立してから、新contentEpoch/`mutation: true`を設定する。後続の`mutation`通知でhydrationを取り消す。enhancerの後始末もDOMを変えるため、旧contextのままcleanupを先行させない。state-onlyは本文寿命を変えず、このphaseを通らない。

本文→shell→DOM検証→headの順序を維持し、push/replaceは既存History API成功直後、noneはその後の最終intent/signal・exact entry/address照合直後を受理点とする。受理時にcommitId、intentId、entryId、exact URL、contentEpoch、root、shellCommitId、stateOnlyをimmutableなNavigationCommitReceiptへ固定する。受理前の失敗は従来rollback、受理後の失敗はcommitted:true/degradedとして隔離し、error本文再commit・history再書込・確定本文rollbackを行わない。

binding採用は受理記録と現在のroot/epoch/shell/entry/addressを照合する。採用失敗はbinding-adoption-failed/recoveryRequiredで終端化し、共有content contextの回復状態を立て、成功通知・post-commit処理・表示効果へ進めない。receiptは失敗後のcurrent値から再構成しない。state-onlyも独立receiptを持つがepoch/rootは継続し、full文書成功通知やhydrationを再発行しない。

hostのnavigation-committed通知は、固定receiptのroot/epoch/shell、表示bindingとaddress、mutation:false/recovery:falseを確認してcommitId単位で一度だけ発行する。通知・post-commit・cleanupの失敗を受理前失敗へ戻さない。Animation finishedは受理・queue・hydration完了条件ではない。

回復中の次navigationは、通常の離脱保存やcommitに進まず、current intentと宛先を再検査して既存document fallbackへ委譲する。旧receiptによる別entryの採用、mutation:falseだけの強制解除、再commitによる修復は行わない。fallbackの失敗・失効でも保存抑止を解除しない。この方針ではsame-documentを含む次の有効な要求もdocument移動となり、同entry自動再採用は実装しない。

受理済みpost-renderの表準備は[Reading Position Contract](reading-position.md#静的表の準備と証跡)に従う。immutable receiptとbindingの照合後、通常schedule直前で実施し、準備例外をcommit失敗・rollback・error本文再commitへ戻さない。準備失敗でもcurrent ownerは既存位置jobへ進み、失効ownerは後続書込みや予約を行わない。table準備はhydration-readyでもanimation完了でもなく、router queueの待機条件を追加しない。

検証済みenvelopeには、更新callback開始前の任意のincoming準備を追加できる。これは一回用の内容fragmentと構造情報だけを準備し、本文/shell/head/historyやrollback元を捕捉・更新しない。rollback用状態を捕捉する既存adapter.prepareはcallback内に維持する。準備失敗は通常commitへ縮退し、新intent/abortはcommit直前にも再検査する。commitが消費したfragmentは固定receiptとbinding採用後にapp側へ渡し、準備中のsignal寿命から受理済みcontent世代の寿命へ移す。未採用・rollback・失効ticketは再利用しない。
