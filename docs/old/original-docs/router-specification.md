この文書は現行契約の正本ではない。現行契約は docs/contracts/、Design System 契約は docs/design-system/ を参照する。

---

# router

## 文書の位置付け

本仕様書は、Rouault における **専用 router の新規実装仕様** を定義します。ここで定義する API、責務境界、イベント、後処理はすべて **移行完了後の正規構成** を前提とします。

本仕様書は、実装者・レビューア・利用側コンポーネントが共有する **唯一の契約文書** です。実装上の便宜や一時的な段階設計は本仕様書に含めません。

## 概要

`router` は、Rouault における SPA ナビゲーションを司る **Rouault 専用 router core** です。責務は、内部リンクの横取り、履歴同期、URL 正規化、文書取得、`NavigationEnvelope` の決定、`<main>` 本文・`document.title`・`meta[name="description"]`・履歴 state の確定反映、および遷移結果通知に限定します。

本 router は、汎用ルーティング基盤ではありません。ただし同時に、**特定 shell コンポーネントの属性形式、描画後 DOM 後処理、読み上げ通知、個別 UI 状態最適化を router core の必須責務に含めません**。それらは必要に応じて adapter / controller に委譲します。

この仕様書が定義する中心概念は次の 4 点です。

1. route 経路と fetch 経路を `NavigationEnvelope` へ正規化して同一に扱うこと
2. durable commit point を **本文・shell・文書メタデータ・履歴 state が整合して確定した時点** として明示すること
3. 描画後後処理の失敗を、router core の commit 失敗と機械的に同一視しないこと
4. hydration planning は envelope に含めても、trigger 正本は scheduler / registry に残すこと

## 目的

- **MPA 的な URL / 履歴 / 文書メタデータ / shell 整合** を保ちつつ、本文更新を SPA として行うこと
- route 経路と fetch 経路の差を loader 内部へ閉じ込め、公開契約では `NavigationEnvelope` と `NavigationResult` に統一すること
- router core の責務を **URL・文書・shell・履歴・結果通知の commit 規則** に絞り、描画後後処理との時間的・構造的結合を下げること
- 遷移結果を `outcome` と `renderedKind` で分離して観測可能にし、`not-found` / `error` 表示時の意味論を明確化すること
- 高頻度遷移、latest-wins、post-commit failure を含む場合でも、利用側が安定して分岐できる結果モデルを提供すること

## 対象外

- 汎用的な動的ルートパラメータ DSL
- ネストルーター
- 汎用 redirect DSL
- 汎用 head 管理基盤
- データフェッチキャッシュ戦略
- SSR 本体の生成責務
- 特定 shell コンポーネントの内部属性形式の標準化
- 特定 query parameter 名に固定された state-only 最適化規則
- フォーカス移動、スクロール復帰、読み上げ通知の唯一の実装方式

## 設計原則

### 1. Rouault 専用であることを隠さない

汎用化のための抽象化を優先せず、Rouault 固有要件を公開契約に明示します。

### 2. route 経路と fetch 経路を同一モデルで扱う

最終的な反映単位は、HTML 文字列ではなく `` とします。これにより、head / shell / content の反映規則を一本化します。

### 3. 遷移完了は outcome で定義する

遷移 API は、成功・中止・上書き・失敗を ``として返します。呼び出し側は Promise 解決の有無ではなく`outcome` を観測します。

### 4. 生成と起動を分離する

`Router` の構築は副作用を伴ってはなりません。`document click` / `popstate` 監視、`aria-live` リージョン追加、初期遷移開始は `` によってのみ開始します。

### 5. 外部描画統合と shell 統合は 2 相 commit とする

router 外部へ本文描画または shell 更新を委譲する場合は、単発 callback ではなく **prepare / commit / rollback** を持つ 2 相 adapter によって統合します。これにより、router 管理下状態と外部描画状態、および shell 状態の分裂を抑制します。

### 6. 公開 API は完成形のみを露出する

公開 API は、新規実装として採用する契約だけで構成します。内部の段階設計や暫定構成は公開契約へ持ち込みません。

## 用語

### navigation URL

遷移要求およびブラウザ表示に用いる正規化済み URL です。Rouault では、`wtr-session-id` を除去した pathname + search + hash を指します。pathname は通常ルート `/` を除き末尾 `/` を持ちませんが、検索仕様の例外として `/about/`、`/corpora/`、`/corpora/<slug>/`、`/search/`、`/tags/<tag>/` は trailing slash を保持します。

### fetch target URL

ネットワーク取得に用いる URL です。hash は含みません。静的出力物の都合で pathname 末尾 `/` を補うことがあります。

### full navigation

本文取得・head 更新・shell 更新・outlet 更新を伴う通常遷移です。

### state-only navigation

本文取得を伴わず URL state だけを更新する遷移です。Rouault では、これは **primary tab の切替に限定された特殊遷移** を指します。

### feature-local URL state

特定機能が所有する URL 状態です。Rouault では、検索結果ページにおける `q`、`tag`、`tagMode`、`sort` のように、**文書遷移そのものではないが URL に反映される状態**を指します。

feature-local URL state の意味論、復元、履歴更新、`popstate` 再同期は、その機能の仕様書と実装が単一に所有しなければなりません。router core はこれを汎用的に解釈してはなりません。

### NavigationEnvelope

router が反映対象として扱う統一遷移表現です。route 経路でも fetch 経路でも最終的にこの形へ正規化します。

### NavigationOutcome

個々の遷移要求の結果です。`completed` / `cancelled` / `superseded` / `failed` を取ります。

### NavigationErrorReason

遷移要求が異常系を伴った際の安定識別子です。`'auth' | 'forbidden' | 'timeout' | 'network' | 'server' | 'service-unavailable' | 'unexpected' | 'destroyed' | 'not-started'` を取ります。

## 全体構成

| 要素                   | 主責務                                                                            |
| ---------------------- | --------------------------------------------------------------------------------- |
| `Router`               | 公開 API、ライフサイクル、依存関係の組み立て                                      |
| Link Interceptor       | `document click` / `popstate` 監視と内部遷移化                                    |
| Location Adapter       | URL 正規化、履歴 state 生成、navigation URL と fetch target URL の差分吸収        |
| Navigation Queue       | latest-wins の直列化制御                                                          |
| Navigation Runner      | 1 回の遷移実行、outcome 確定、イベント通知                                        |
| Before Navigate Hooks  | 遷移前フック登録・実行                                                            |
| Route Registry         | document route 登録とマッチング                                                   |
| Content Loader         | fetch / route 実行と `NavigationEnvelope` 決定                                    |
| Content Committer      | title / meta description / content / shell / history の durable commit を担当する |
| Shell Adapter          | shell projection の 2 相 commit 統合を担う任意 adapter                            |
| URL State Policy       | state-only navigation 判定を担う任意統合                                          |
| Post Commit Controller | 描画後後処理を担う任意統合                                                        |

### 構成原則

- `Router` は shell 具体実装へ直接依存してはなりません。
- `Router` は描画後 DOM 後処理の具体手順を内蔵必須責務としては持ちません。
- `Shell Adapter`、`URL State Policy`、`Post Commit Controller` は **任意統合** です。
- durable commit の成立条件は `Content Committer` が担当する範囲で定義し、**shell を含み、post-commit 後処理は含みません**。
- `Shell Adapter` が提供される場合、その失敗は durable commit failure として扱わなければなりません。
- shell projection snapshot は router core 自身の具体属性依存ではなく、SSR が確定した shell 契約の受け渡し面です。`HeaderShellProjection.tocPresence` はこの snapshot 契約の一部として扱います。

## 公開 API

## `new Router(outlet, options?)`

`outlet` を本文反映先とする router を構築します。**コンストラクタは副作用を持ってはなりません。** 生成直後は未開始状態であり、リンク横取り・履歴監視・初期遷移は始まっていません。

### インスタンス所有権

- `Router` は **document 単位の単一所有コンポーネント** です。
- 同一 `Document` / `Window` に対して、**同時に 2 個以上の live **``** を存在させてはなりません**。
- 既存の live `Router` が `destroy()` されていない状態で 2 個目の `Router` を生成しようとした場合、コンストラクタは `RouterOwnershipError` を送出しなければなりません。
- `destroy()` 完了後は所有権が解放され、新しい `Router` を生成できます。

### `RouterOptions`

```ts
interface ContentUpdatePayload {
  html: string;
  renderedKind: 'page' | 'not-found' | 'error';
  navigationUrl: string;
}

interface PreparedContentUpdate {
  commit(): void | Promise<void>;
  rollback(): void | Promise<void>;
}

interface ContentUpdateAdapter {
  prepare(update: ContentUpdatePayload): PreparedContentUpdate | Promise<PreparedContentUpdate>;
}

interface ShellUpdatePayload {
  shell: DocumentShellSnapshot | null;
  navigationUrl: string;
}

interface PreparedShellUpdate {
  commit(): void | Promise<void>;
  rollback(): void | Promise<void>;
}

interface ShellAdapter {
  prepare?(update: ShellUpdatePayload): PreparedShellUpdate | Promise<PreparedShellUpdate>;
}

type UrlStateNavigationDecision =
  | { kind: 'full' }
  | {
      kind: 'state-only';
      scrollToHash?: boolean;
    };

interface UrlStateNavigationPolicy {
  evaluate(context: {
    currentUrl: string;
    requestedUrl: string;
    normalizedUrl: string;
    historyMode: HistoryMode;
  }): UrlStateNavigationDecision | Promise<UrlStateNavigationDecision>;
}

interface PostCommitController {
  run(context: {
    outlet: HTMLElement;
    previousUrl: string | null;
    url: string;
    isInitial: boolean;
    stateOnly: boolean;
    renderedKind: 'page' | 'not-found' | 'error' | null;
  }): void | Promise<void>;
}

interface RouterOptions {
  contentAdapter?: ContentUpdateAdapter;
  shellAdapter?: ShellAdapter;
  urlStateNavigationPolicy?: UrlStateNavigationPolicy;
  postCommitController?: PostCommitController;
  skipInitialNavigation?: boolean;
  navigationTimeoutMs?: number | null;
}
```

| 項目                       | 既定        | 意味                                                                                                  |
| -------------------------- | ----------- | ----------------------------------------------------------------------------------------------------- |
| `contentAdapter`           | `undefined` | 本文描画を外側へ委譲する 2 相 adapter です。未指定時、router は outlet を直接更新します。             |
| `shellAdapter`             | `undefined` | shell projection の 2 相 commit 統合を行う任意 adapter です。未指定時、shell commit は行いません。    |
| `urlStateNavigationPolicy` | `undefined` | state-only navigation 判定を行う任意 policy です。未指定時、すべて full navigation とします。         |
| `postCommitController`     | `undefined` | 描画後後処理を行う任意 controller です。未指定時、router core は後処理を行いません。                  |
| `skipInitialNavigation`    | `false`     | `start()` 時の初回 `historyMode: 'none'` 遷移を抑止します。SSR 初期本文を保持する統合構成で用います。 |
| `navigationTimeoutMs`      | `null`      | 1 件の navigation の上限時間です。`null` は timeout 無効を意味します。                                |

## ライフサイクル API

### `start()`

```ts
start(): Promise<NavigationResult | null>
```

#### 契約

- `start()` が router の起動点です。
- 初回 `start()` は次を実行します。
  1. リンクインターセプタを attach する
  2. `popstate` 監視を開始する
  3. 必要に応じて `aria-live` リージョンを attach する
  4. `skipInitialNavigation` が `false` なら初期遷移を開始する
- `skipInitialNavigation = true` の場合、`start()` は `null` を返します。
- `skipInitialNavigation = false` の場合、`start()` は初期遷移の `NavigationResult` を返します。
- `start()` は冪等です。既に開始済みの instance に対する 2 回目以降の呼び出しは no-op とし、`null` を返します。
- `destroy()` 後の `start()` は `RouterDestroyedError` を同期送出してはなりません。実装は no-op としなければなりません。

### `destroy()`

```ts
destroy(): void
```

#### 契約

- `destroy()` は冪等です。2 回目以降の呼び出しは no-op です。
- 初回 `destroy()` は次を保証します。
  - `document click` / `popstate` の監視を解除する
  - イベントリスナを全消去する
  - `BeforeNavigateHook` を全消去する
  - 再初期化フックを全消去する
  - queue を dispose する
  - 内部 `aria-live` リージョンを破棄する
  - 以後の新規遷移要求を受け付けない
- 実装可能な範囲で実行中 fetch を abort すべきです。ただし、既に完了した DOM 更新の巻き戻しは契約に含みません。

### `destroy()` 後の `navigate()`

- `destroy()` 後の `navigate()` は、同期例外を送出してはなりません。
- `destroy()` 後の `navigate()` は、`outcome = 'failed'`、`committed = false`、`source = 'none'`、`snapshotKind = null` を持つ `NavigationResult` を返さなければなりません。
- `error` には `RouterDestroyedError` を、`errorReason` には `'destroyed'` を設定しなければなりません。
- この場合、hook・イベント・DOM 更新・履歴更新は一切発生してはなりません。

## ナビゲーション API

### `navigate(request)`

```ts
type HistoryMode = 'none' | 'push' | 'replace';

type NavigationOutcome = 'completed' | 'cancelled' | 'superseded' | 'failed';

type NavigationErrorReason =
  | 'auth'
  | 'forbidden'
  | 'timeout'
  | 'network'
  | 'server'
  | 'service-unavailable'
  | 'unexpected'
  | 'destroyed'
  | 'not-started';

interface NavigationIssue {
  code: 'post-commit-failed';
  error?: Error;
}

interface NavigateRequest {
  url: string;
  historyMode?: HistoryMode;
  state?: Record<string, unknown>;
}

interface NavigationResult {
  outcome: NavigationOutcome;
  requestedUrl: string;
  normalizedUrl: string;
  historyMode: HistoryMode;
  stateOnly: boolean;
  committed: boolean;
  degraded: boolean;
  issues: NavigationIssue[];
  source: 'document-route' | 'fetch' | 'state-only' | 'none';
  renderedKind: 'page' | 'not-found' | 'error' | null;
  error?: Error;
  errorReason?: NavigationErrorReason;
}
```

#### 契約

- `navigate()` は **当該要求自身の結果** を返します。
- `navigate()` は started 状態でのみ通常動作します。
- `start()` 前の `navigate()` は、同期例外を送出してはなりません。
- `start()` 前の `navigate()` は、`outcome = 'failed'`、`committed = false`、`degraded = false`、`issues = []`、`source = 'none'`、`renderedKind = null` の結果を返し、`error` に `RouterNotStartedError`、`errorReason` に `'not-started'` を設定しなければなりません。
- `completed` は、**durable commit point に到達したこと** を意味します。これは「正常文書であったこと」を意味しません。
- `cancelled` は、`BeforeNavigateHook` により中止されたことを意味します。
- `superseded` は、latest-wins により後続要求へ上書きされたことを意味します。
- `failed` は、durable commit point に到達しなかったことを意味します。
- `not-found` または `error` 表示を正常に commit できた場合、`outcome` は `completed` です。
- `renderedKind` は、その要求が最終的に commit した表示種別を表します。
- `degraded` は、durable commit 自体は成立したが、**post-commit 後処理** の一部に失敗があったことを表します。
- `issues` は、`degraded = true` の原因となった post-commit failure を列挙します。

### `NavigationResult.committed` の定義

`committed` は、この要求が **router core の durable commit point に到達したか** を表します。

- `committed = true` となるのは次の場合のみです。
  - full navigation で title / meta description / content / shell / history の commit が完了した場合
  - state-only navigation で URL state 更新が確定した場合

- `committed = false` となるのは次の場合です。
  - `cancelled`
  - `superseded`
  - durable commit 前に終了した `failed`

### `renderedKind` / `error` / `errorReason` の関係

- `renderedKind = 'page'` かつ正常遷移であれば `error` / `errorReason` は設定しません。
- `renderedKind = 'not-found'` で `completed` の場合、`error` / `errorReason` は通常設定しません。
- `renderedKind = 'error'` で `completed` の場合、`errorReason` は必須です。`error` は原因となった基底例外を可能な限り設定します。
- `renderedKind = null` の場合、いかなる表示も commit されていません。`failed` であるなら `errorReason` は必須です。

### `outcome` と `committed` の対応

| outcome      | committed | 意味                                                  |
| ------------ | --------- | ----------------------------------------------------- |
| `completed`  | `true`    | durable commit が成立した                             |
| `cancelled`  | `false`   | hook により中止された                                 |
| `superseded` | `false`   | 後続要求に上書きされ、durable commit に到達しなかった |
| `failed`     | `false`   | durable commit に到達しなかった                       |

### `degraded` の定義

- `degraded = true` となるのは、`completed` のうち、post-commit 後処理に失敗した場合のみです。
- `degraded = false` となるのは、post-commit failure が存在しない場合です。
- `failed` / `cancelled` / `superseded` では `degraded = false` とします。

### `source` と `committed` の整合

- `source = 'document-route'` / `'fetch'` / `'state-only'` のとき、`completed` であれば `committed` は必ず `true` です。
- `source = 'none'` は、commit 経路に入らず終了した要求にのみ用います。したがって `committed` は常に `false` です。

### `navigate()` の戻り値と `after:navigate` の役割分担

- `navigate()` の戻り値は、**その呼び出し自身** の完了結果を受け取るための API です。
- `after:navigate` は、router が処理した **すべての遷移要求** を外部が受動的に観測するためのイベントです。
- `after:navigate` は、durable commit と `postCommitController.run()` の実行後に発火します。
- imperative call の呼び出し元は、自身の遷移完了判定に `after:navigate` を使ってはなりません。必ず `navigate()` の戻り値を用います。
- `after:navigate` は、リンク横取り、`popstate`、他コンポーネント起点の遷移も含めた横断的観測のためにのみ用います。

## エラー型

router が公開契約として用いるエラー型は次のとおりです。

```ts
class RouterOwnershipError extends Error {
  name: 'RouterOwnershipError';
}

class RouterDestroyedError extends Error {
  name: 'RouterDestroyedError';
}

class RouterNotStartedError extends Error {
  name: 'RouterNotStartedError';
}
```

### `RouterOwnershipError`

- 同一 `Document` / `Window` に対して、既存の live `Router` が存在する状態で新しい `Router` を生成しようとした場合に送出します。
- 送出地点は `new Router(...)` のコンストラクタです。
- このエラーは **構築前提違反** を表します。recover は、既存 `Router` の `destroy()` 完了後に再生成することによってのみ行います。
- `RouterOwnershipError` 送出時、追加の副作用を発生させてはなりません。

### `RouterDestroyedError`

- `destroy()` 完了後の `Router` インスタンスに対して `navigate()` を呼び出した場合に、`NavigationResult.error` へ設定するエラーです。
- `RouterDestroyedError` は **ライフサイクル終了後利用** を表します。
- `destroy()` 後の `navigate()` はこのエラーを結果へ格納しますが、同期例外としては送出しません。
- `RouterDestroyedError` を含む失敗結果では、副作用を一切発生させてはなりません。

### `RouterNotStartedError`

- `start()` 完了前の `Router` インスタンスに対して `navigate()` を呼び出した場合に、`NavigationResult.error` へ設定するエラーです。
- `RouterNotStartedError` は **未開始状態での利用** を表します。
- `start()` 前の `navigate()` はこのエラーを結果へ格納しますが、同期例外としては送出しません。

### エラー型に関する設計原則

- router の公開契約に現れるエラーは、**利用側が分岐に用いてよい安定識別子** でなければなりません。
- 上記 3 種のエラーは `name` を固定しなければなりません。
- 実装は必要に応じて `message` を持てますが、利用側は意味判定に `message` を用いてはなりません。
- `NavigationResult.error` に格納されるエラーは、可能な限り `instanceof` または `name` により判定可能であるべきです。

## ルート登録 API

### `addDocumentRoute(pattern, handler)`

```ts
type RoutePattern = string | RegExp;

interface DocumentRouteContext {
  url: string;
  normalizedUrl: string;
  pathname: string;
  searchParams: URLSearchParams;
  hash: string;
  signal: AbortSignal;
}

interface HeaderShellSnapshot {
  corpora: Array<{
    key: string;
    label: string;
    href: string;
  }>;
  currentCorpusKey: string;
  noteLayout: boolean;
  sidebarEnabled: boolean;
  tocPresence: 'present' | 'absent';
  tocRuntimeId?: string | null;
}

interface DocumentShellSnapshot {
  header: HeaderShellSnapshot;
}

type DocumentRouteHandler = (
  context: DocumentRouteContext,
) => NavigationEnvelope | Promise<NavigationEnvelope>;
```

#### 契約

- `handler` は `NavigationEnvelope` を返します。
- `handler` は `url` / `normalizedUrl` / `pathname` / `searchParams` / `hash` / `signal` を受け取ります。
- route 経路でも fetch 経路と同一の durable commit 規則を適用します。
- `handler` へ渡す `searchParams` は **防御的コピー** です。mutation は router 内部状態へ影響しません。
- `handler` は `AbortSignal` を尊重すべきです。
- `NavigationEnvelope.shellProjection` は **任意** とします。router core はその不在を失敗理由として扱ってはなりません。
- `shellProjection` を返す場合、`DocumentShellSnapshot` は **閉じた意味モデル** とし、任意属性 bag や `Record<string, unknown>` として拡張してはなりません。
- `shellProjection` の拡張は、将来必要になったときに明示的なサブ snapshot 追加として行います。既存フィールドの意味変更や型変更は認めません。
- `NavigationEnvelope.document.renderedKind` は `page` / `not-found` / `error` のいずれかでなければなりません。

### `addDocumentRoute()` の呼び出し時期

- `addDocumentRoute()` は **construct 後から destroy 前まで** 呼び出せます。
- `start()` 前後のどちらでも登録できます。
- 登録は、**登録完了後に route 解決へ入る navigation** にのみ適用されます。
- 実行中 navigation の route 解決結果へ後から影響を与えてはなりません。
- `destroy()` 後の `addDocumentRoute()` は `RouterDestroyedError` を同期送出してよい API です。

`NavigationResult.outcome` は `renderedKind` ではなく **commit 成否** により決まります。したがって `not-found` / `error` envelope であっても、正常に commit できた場合は `outcome = 'completed'` です。

## 補助 API

```ts
interface BeforeNavigateContext {
  currentUrl: string;
  requestedUrl: string;
  normalizedUrl: string;
  historyMode: HistoryMode;
}

type BeforeNavigateHook =
  (
    context: BeforeNavigateContext,
  ) => void | true | false | Promise<void | true | false>;

on<K extends keyof RouterEventMap>(
  event: K,
  callback: (payload: RouterEventMap[K]) => void,
): void

off<K extends keyof RouterEventMap>(
  event: K,
  callback: (payload: RouterEventMap[K]) => void,
): void

isNavigating(): boolean
addBeforeNavigateHook(hook: BeforeNavigateHook): void
removeBeforeNavigateHook(hook: BeforeNavigateHook): void
getSearchParams(): URLSearchParams
getCurrentPath(): string
```

### `BeforeNavigateHook` の契約

- `BeforeNavigateHook` は **制御フック** であり、観測イベントではありません。
- hook は同期・非同期のどちらでも構いません。
- hook は登録順に逐次実行します。
- いずれかの hook が `false` を返した場合、その遷移は `cancelled` です。
- hook が `true` または `void` を返した場合、その hook は遷移を継続させます。
- hook 実行中に例外が発生した場合、または `Promise` が reject した場合、その遷移は `failed` とし、`error` を発火しなければなりません。
- hook 実行は short-circuit です。`false`、例外、reject のいずれかが発生した時点で後続 hook は実行しません。
- hook は副作用を持てますが、router の内部状態を書き換える目的で利用してはなりません。

### query parameter モデル

- query parameter の公開表現には `URLSearchParams` を用います。
- 同名 parameter の重複は保持します。
- parameter の出現順は `URLSearchParams` 上で保持します。
- 空文字列値は保持します。
- primary tab 判定を除き、router は query parameter を勝手に単一値へ潰してはなりません。
- `getSearchParams()` は **常に防御的コピー** を返します。mutation は router 内部状態へ影響しません。

## URL モデル

## 正規化規則

`LocationAdapter` は URL を次のように正規化します。

- `wtr-session-id` query を除去する
- `/search/` と `/search` は表示用 pathname として `/search` に正規化する
- `/tags/<tag>/` は表示用 pathname として trailing slash を保持する
- 上記以外では、ルート `/` を除き表示用 pathname 末尾 `/` を除去する
- navigation URL は pathname + search + hash で表現する
- fetch target URL は pathname + search で表現し、hash を含めない
- fetch target URL は静的出力物取得のため pathname 末尾 `/` を補うことがある

### 例

| 入力                                 | navigation URL           | fetch target URL          |
| ------------------------------------ | ------------------------ | ------------------------- |
| `/docs/example/`                     | `/docs/example`          | `/docs/example/`          |
| `/search/?q=test&wtr-session-id=abc` | `/search?q=test`         | `/search/?q=test`         |
| `/tags/music/`                       | `/tags/music/`           | `/tags/music/`            |
| `/archives/1a2b3c4d5e6f/`            | `/archives/1a2b3c4d5e6f` | `/archives/1a2b3c4d5e6f/` |
| `/notes/a#section-1`                 | `/notes/a#section-1`     | `/notes/a/`               |

### archives ルートの扱い

`/archives/{hash}` は、Rouault における **固定版参照のための通常文書ルート** とします。  
この URL は `patterns.md` における Permanent URL に対応し、router はこれを full navigation の対象として扱わなければなりません。

追加規則:

- `/archives/{hash}` を `/{slug}` へ自動正規化してはなりません
- `/archives/{hash}` から対応する最新版 URL が導出可能であっても、router が自動 redirect してはなりません
- `/archives/{hash}` 上で「最新版はこちら」を案内する責務は UI または上位統合に属し、router core の必須責務ではありません
- `/archives/{hash}` は state-only navigation の対象にしてはなりません

### state-only 判定における query 比較

- state-only navigation の判定では、`tab` を除く query parameter を **順序非依存だが重複数を保持する multiset** として比較します。
- したがって `?tag=a&tag=b` と `?tag=b&tag=a` は等価です。
- ただし `?tag=a&tag=a` と `?tag=a` は非等価です。
- `tab` parameter が複数回出現する URL は primary tab 遷移として扱わず、常に full navigation とします。

## 履歴 state

router は `history.state` に次を保存します。

- `__routerUrl`: 正規化済み navigation URL

この state shape は router core の所有物であり、feature-local な URL 同期ヘルパーは新しい router key を合成してはなりません。ヘルパーは既存の `history.state` を opaque に再利用するか、router 経由の API に委譲します。

`readCurrentUrl()` は、まず `history.state.__routerUrl` を参照します。これが無ければ `window.location` から組み立てます。

## ルート解決

### 解決順序

1. `addDocumentRoute()` 登録ルートを試行する
2. 一致すればその `NavigationEnvelope` を採用する
3. 一致しなければ fetch して `index.router.json` を取得する
4. JSON を decode / validate して `NavigationEnvelope` を得る
5. 不正な payload や build 不整合は `error` envelope へ縮退する

### pattern 契約

- `string` pattern は **正規化後 **``** に対する完全一致** とします。
- `string` pattern において `*` やその他の記号に特別な意味はありません。文字どおりに扱います。
- 部分一致、前方一致、query 条件付き一致などが必要な場合は、明示的に `RegExp` を使用します。
- `RegExp` は正規化後 `pathname` に対して `test()` します。
- route pattern は query と hash を直接マッチ対象にしません。必要であれば handler 内で `searchParams` と `hash` を検査します。

## コンテンツロード

### fetch 経路

fetch 成功時は `index.router.json` を decode / validate し、`NavigationEnvelope` を返します。

- fetch 経路は HTML parse fallback を持ちません。
- router core は fetched HTML から shell を抽出してはなりません。
- shell は `NavigationEnvelope.shellProjection` だけを commit 入力として扱います。
- SSR HTML が持つ current buildId と fetched envelope の `buildId` が不一致な場合、router は `error` envelope へ縮退し、取得した envelope を正規経路として commit してはなりません。

### 開発サーバーにおける router artifact 契約

- 開発サーバーは production と同じ URL 形 `GET /__router/.../index.router.json` を提供しなければなりません。
- 開発時だけ HTML fallback や client 側特例へ切り替えてはなりません。
- 開発サーバーは `dist` 内の HTML 出力から `NavigationEnvelope` を動的生成してよいものとします。
- ただし返却物は production build が生成する router artifact と同一の `schemaVersion` / `buildId` / `document.renderedKind` / `shellProjection` 契約を満たさなければなりません。
- これにより、開発環境と production 環境で router の load 経路を分岐させてはなりません。

### HTTP ステータスと例外

| 事象                          | kind        | reason                | 変換先                      |
| ----------------------------- | ----------- | --------------------- | --------------------------- |
| `401`                         | `error`     | `auth`                | 認証エラー envelope         |
| `403`                         | `error`     | `forbidden`           | 権限エラー envelope         |
| `404`                         | `not-found` | なし                  | not-found envelope          |
| `500`                         | `error`     | `server`              | サーバーエラー envelope     |
| `503`                         | `error`     | `service-unavailable` | サービス利用不可 envelope   |
| `AbortError` / `TimeoutError` | `error`     | `timeout`             | タイムアウト envelope       |
| `fetch` を含む `TypeError`    | `error`     | `network`             | ネットワークエラー envelope |
| その他                        | `error`     | `unexpected`          | 汎用エラー envelope         |

#### 契約

- 表示可能な `error` envelope または `not-found` envelope を組み立てられた場合、遷移 `outcome` は `completed` とします。
- このとき、異常原因が存在するなら `NavigationResult.error` と `NavigationResult.errorReason` を設定すべきです。
- envelope 自体の生成、あるいは durable commit ができなかった場合のみ `failed` とします。

## コミット仕様

router における **durable commit point** は、次が整合した状態として確定した時点です。

1. `document.title`
2. `meta[name="description"]`
3. 本文 content
4. shell
5. 履歴 state

描画後後処理は、durable commit point の成立条件に含めません。

### commit の段階

1. `NavigationEnvelope` を確定する
2. 必要であれば `contentAdapter.prepare()` を行う
3. 必要であれば `shellAdapter.prepare()` を行う
4. title / meta description / content / shell / history を durable commit する
5. 必要であれば `postCommitController.run()` を行う

### durable commit 失敗の扱い

- durable commit 開始前に `prepare()` が失敗した場合、その遷移は `failed` です。
- durable commit 中に失敗した場合、その遷移は `failed` です。
- durable commit 開始前または durable commit 中に失敗し、かつ `PreparedContentUpdate` または `PreparedShellUpdate` が存在する場合、router は `rollback()` を呼び出さなければなりません。
- `rollback()` 自体が失敗した場合、その遷移は引き続き `failed` とし、`errorReason = 'unexpected'` を設定しなければなりません。

### post-commit failure の扱い

- `postCommitController.run()` が失敗した場合、durable commit が成立済みであるなら、その遷移は `completed` のままとします。
- この場合、`degraded = true` とし、`issues` に `code = 'post-commit-failed'` を追加し、`error` イベントを発火しなければなりません。
- この failure に対して、router は **durable commit 済み文書を巻き戻してはなりません**。

### `contentAdapter` 指定時

- router は `outlet.innerHTML` を直接変更しません。
- router は `contentAdapter.prepare()` を呼び出し、`PreparedContentUpdate` を取得します。
- `prepare()` は **外部可視状態を publish してはなりません**。staging のみを行います。
- `PreparedContentUpdate.commit()` は durable content commit の一部として扱います。
- content adapter の commit は、本文 DOM 差し替えの局所 commit であり、navigation 全体の完了を意味しません。
- `content:load` は durable commit 完了後にのみ発火します。

### app shell の本文差し替え通知と遷移完了通知

- app shell が本文 DOM 差し替えを DOM event として公開する場合、そのイベント名は `content-dom-replaced` 相当とし、shell / head / history / post-commit の完了を意味してはなりません。
- hydration や外部の遷移後処理は、本文 DOM 差し替えイベントではなく、`navigation-committed` 相当の安定イベントを契機にしなければなりません。
- `navigation-committed` 相当のイベントは、completed / committed / non-state-only / `renderedKind != null` の遷移でのみ発火してよいものとします。
- durable commit 失敗、rollback、cancelled、superseded、failed の各経路では、`navigation-committed` 相当のイベントを発火してはなりません。
- state-only navigation は URL state の commit であり、本文 DOM 差し替えを伴わないため、本文 hydration trigger にしてはなりません。
- state-only navigation では、本文 DOM 差し替え通知と `navigation-committed` 相当の通知の双方を発火してはなりません。
- `app-router:content-rendered` は廃止済みイベント名です。本文 DOM 差し替え通知と navigation 完了通知を混同するため、実行時イベントとして発火してはなりません。

### `shellAdapter` 指定時

- router は `shellAdapter.prepare()` を呼び出し、`PreparedShellUpdate` を取得します。
- `prepare()` は **外部可視状態を publish してはなりません**。staging または rollback に必要な前状態の捕捉のみを行います。
- `PreparedShellUpdate.commit()` は durable shell commit の一部として扱います。
- `shellAdapter` の失敗は **補助統合失敗ではなく durable commit failure** として扱わなければなりません。

### 本文 HTML の trust boundary

`contentAdapter` は、router における **本文反映の唯一の統合点** とします。

規則:

- router core は、本文を `ContentUpdatePayload.html` として受け渡してよいものとします。
- ただし、runtime で HTML 文字列を DOM へ流し込む sink は、**アプリケーション統合側で単一箇所に限定**しなければなりません。
- router core は、その sink の具体実装方式を規定してはなりません。
- `contentAdapter` またはそれと同等のアプリケーション統合層は、router から受け取った本文を **「DOM へ反映してよい本文」** として受理・commit する唯一の境界でなければなりません。
- 上記境界の外側で、任意の HTML 文字列を ad hoc に DOM へ流し込んではなりません。

入力境界に関する追加規則:

- 上記 sink に流してよい本文は、author input であってはなりません。
- 上記 sink に流してよい本文は、少なくとも次のいずれかに限らなければなりません。
  1. build-time で正規化・検証済みの compiler-generated document content
  2. route handler または fetch loader により取得された後、Rouault の文書契約に照らして妥当と判断された validated document content
- Markdown authoring input、raw HTML、または未検証の外部 HTML を、この境界へ直接流してはなりません。

責務分離:

- author input / compiler-generated output / runtime helper の trust boundary 定義は `docs/markdown-safety-and-test-policy.md` が所有します。
- router 本仕様は、その trust boundary を前提として **本文 commit 境界にどう接続するか** だけを定義します。
- したがって、本節は Markdown safety policy を再定義してはなりません。

実装上の含意:

- `contentAdapter.prepare()` は、必要であればアプリケーション統合側の branded type、wrapper、または同等の境界表現へ本文を変換してよいものとします。
- ただし、その表現は router core の公開契約へ持ち込んではなりません。
- `ContentUpdatePayload.html` は引き続き router core の汎用 payload とし、app 固有の trust boundary 表現は adapter 境界の内側に閉じ込めなければなりません。

### `contentAdapter` / `shellAdapter` を採用する理由

- 単発 callback は「外側 state は変わったが router 側は未 commit」という分裂状態を招きやすいです。
- 2 相 adapter により、prepare / commit / rollback を明示して統合境界を強化します。
- adapter 実装が契約を守る限り、外部描画・shell・router 管理下状態は **all-or-nothing に近い振る舞い** を取ります。

## リンクインターセプト

Link Interceptor は `document click` を監視し、次を満たすリンクのみ内部遷移へ変換します。

### インターセプト対象

- 左クリック
- 修飾キーなし
- `a[href]` が解決できる
- `http:` または `https:`
- 同一 origin
- `target` なし
- `download` 属性なし
- `rel="external"` なし
- `data-no-router` なし
- 同一ページ内 hash ジャンプではない

### インターセプトしないもの

- 外部リンク
- 同一ページ内 hash ジャンプ
- `target="_blank"` 等を持つリンク
- ダウンロードリンク
- `data-no-router` 指定リンク
- 非 HTTP(S) スキーム
- `destroy()` 後の全リンク

`popstate` は常に `historyMode: 'none'` の遷移要求へ変換します。

## state-only navigation

### 判定責務

state-only navigation の判定主体は `NavigationRunner` です。`NavigationRunner` は、`urlStateNavigationPolicy` が提供されている場合に限り、その判定結果を用います。

router core は、特定 query parameter 名や特定 UI 機能に固定された state-only 規則を公開契約として持ちません。

- `urlStateNavigationPolicy` 未指定時、すべての遷移は full navigation とします
- `urlStateNavigationPolicy` 指定時、その戻り値が `kind: 'state-only'` の場合にのみ state-only navigation とします
- ある URL 差分を state-only とみなす具体規則は、router 仕様ではなく policy 実装の責務です

### 実行内容

state-only navigation と判定された場合、full navigation を行わず次を実行します。

- 必要に応じて `pushState` / `replaceState`
- `ui-url-state-change` を dispatch する
- `scrollToHash = true` かつ hash がある場合、2 回の `requestAnimationFrame` 後に該当要素へスクロールする
- fetch / title 更新 / meta description 更新 / shell 同期 / 本文差し替え / `content:load` は行わない
- `after:navigate` は発火する
- `NavigationResult.stateOnly = true` とする
- `NavigationResult.source = 'state-only'` とする
- `NavigationResult.renderedKind = null` とする

### feature-local URL state との境界

router core は、文書遷移としての URL を扱います。  
一方、検索結果ページにおける `q`、`tag`、`tagMode`、`sort` のような **feature-local URL state** の生成・解釈・履歴更新は、router core の責務に含めてはなりません。

Rouault において `/search?...` および `/tags/<tag>/` 上での検索条件変更は、同一文書内状態の更新として **検索 UI 側が単独で所有**します。  
router は、検索結果ページそのものへの到達と離脱は扱ってよいものとしますが、検索 UI が所有する状態更新を独自に再解釈して full navigation または state-only navigation へ昇格させてはなりません。

### app 固有最適化の記述場所

Rouault 固有の primary tab 最適化など、特定 URL 差分を state-only とみなす具体規則は、本仕様書ではなく **`urlStateNavigationPolicy` の実装仕様** に記述しなければなりません。

## イベント契約

### `RouterEventMap`

```ts
interface RouterEventMap {
  'navigation:busy-change': {
    isNavigating: boolean;
  };
  'content:load': {
    previousUrl: string | null;
    url: string;
    isInitial: boolean;
  };
  'after:navigate': NavigationResult;
  'ui-url-state-change': {
    previousUrl: string;
    url: string;
  };
  error: {
    error: Error;
    stage: 'before-navigate' | 'load' | 'commit' | 'post-commit';
  };
}
```

### 発火規則

| イベント名               | 発火タイミング                              | payload                           |
| ------------------------ | ------------------------------------------- | --------------------------------- |
| `navigation:busy-change` | `isNavigating()` の値が変化した時           | `{ isNavigating }`                |
| `content:load`           | durable commit 完了後                       | `{ previousUrl, url, isInitial }` |
| `after:navigate`         | 要求単位の結果確定後                        | `NavigationResult`                |
| `ui-url-state-change`    | state-only navigation 確定時                | `{ previousUrl, url }`            |
| `error`                  | hook / load / commit / post-commit の失敗時 | `{ error, stage }`                |

### 順序保証

router は、**同一要求の内部順序** についてのみ次を保証します。

- `after:navigate` は、当該要求の最終 `NavigationResult` が確定した後に 1 回だけ発火します。
- `content:load` が発火する場合、それは同一要求の `after:navigate` より前です。
- `ui-url-state-change` は state-only navigation でのみ発火し、同一要求の `after:navigate` より前です。
- `navigation:busy-change` は `isNavigating()` の値変化と 1 対 1 に対応します。

router は、**異なる要求どうしの完全な全順序** を公開契約として保証しません。利用側は、複数要求にまたがる厳密なイベント順序へ依存してはなりません。

### `navigation:busy-change` の発火規則

- `navigation:busy-change` は `isNavigating()` の返値が変化したときだけ発火します。
- full navigation 開始時、`false → true` の遷移が起きた場合にだけ `{ isNavigating: true }` を発火します。
- full navigation 終了時、保留中・実行中の full navigation が 0 件になった場合にだけ `{ isNavigating: false }` を発火します。
- state-only navigation では発火しません。

### `after:navigate` の発火規則

- `after:navigate` は、router が受理した各遷移要求について **ちょうど 1 回** 発火します。
- payload は常に、その要求自身の `NavigationResult` です。
- `completed` / `cancelled` / `superseded` / `failed` のいずれでも発火します。
- `after:navigate` は **要求単位の結果通知** であり、本文反映イベントでも busy 状態イベントでもありません。

## 履歴と観測

### `isNavigating()`

- 少なくとも 1 件の full navigation が実行中である間 `true` を返します。
- state-only navigation のみでは `true` にしません。

### 公開しない観測情報

- `getHistory()` は公開 API に含めません。
- commit 完了した遷移列を利用側で保持したい場合は、`after:navigate` を購読し、`result.outcome === 'completed'` のものだけを外側で記録しなければなりません。

## 不変条件

- 内部 URL は常に `LocationAdapter.normalizeUrl()` を通して扱う
- navigation URL と fetch target URL を混同しない
- fetch target URL は hash を含まない
- `navigation:busy-change` は `isNavigating()` の値変化と 1 対 1 に対応する
- `content:load` は durable commit 完了後にのみ 1 回発火する
- `loading:start` / `loading:end` は公開イベントとして定義しない
- `before:navigate` は公開イベントとして定義しない
- 遷移前キャンセルは `BeforeNavigateHook` によってのみ行う
- 同一 `Document` に live `Router` は 1 個までである
- `Router` のコンストラクタは副作用を持たない
- `start()` がリンク監視・初期遷移開始の唯一の起動点である
- `destroy()` は冪等である
- `destroy()` 後、クリックインターセプトは発生しない
- `destroy()` 後の `navigate()` は `RouterDestroyedError` を含む失敗結果を返し、副作用を起こさない
- `start()` 前の `navigate()` は `RouterNotStartedError` を含む失敗結果を返し、副作用を起こさない
- `skipInitialNavigation: true` のとき、`start()` は初回 fetch を行わない
- route 経路と fetch 経路は commit 直前に同一 `NavigationEnvelope` として扱われる
- `BeforeNavigateHook` は同期・非同期のどちらでもよい
- `BeforeNavigateHook` の `false` は `cancelled`、例外または reject は `failed` を意味する
- `NavigationEnvelope.document.renderedKind` は `page` / `not-found` / `error` のいずれか 1 つに一意に分類される
- `NavigationResult.renderedKind` は commit された表示種別を表し、`outcome` と同義ではない
- `completed` と `committed = true` は常に同時に成立する
- `cancelled` / `superseded` / `failed` では `committed = false` である
- `degraded = true` は、durable commit 後の post-commit failure を表す
- `shellAdapter` は任意統合であり、未指定であっても router core は動作しなければならない
- `shellAdapter` が提供される場合、その更新は durable commit の一部として扱われる
- router core は特定 shell コンポーネントの属性形式へ直接依存してはならない
- `postCommitController` は任意統合であり、その失敗は durable commit を巻き戻してはならない
- state-only / full navigation の判定は `urlStateNavigationPolicy` によってのみ最適化される
- query parameter の公開表現は `URLSearchParams` であり、重複 parameter を失ってはならない
- `getSearchParams()` と `DocumentRouteContext.searchParams` は防御的コピーである
- `string` route pattern は正規化後 `pathname` に対する完全一致としてのみ扱う
- `after:navigate` は各遷移要求につき 1 回だけ発火する要求単位イベントである
- imperative call の完了判定には `after:navigate` ではなく `navigate()` の戻り値を用いる

## 最低限の使用例

### 単体 `Router`

```ts
import { Router } from './router.js';

const outlet = document.querySelector('#main-content');
if (!(outlet instanceof HTMLElement)) {
  throw new Error('outlet が必要です');
}

const router = new Router(outlet, {
  skipInitialNavigation: true,
  navigationTimeoutMs: 15000,
});

router.addDocumentRoute('/virtual-route', ({ normalizedUrl }) => {
  return {
    kind: 'page',
    html: `<section><h1>Virtual</h1><p>${normalizedUrl}</p></section>`,
    title: 'Virtual - Rouault',
    metaDescription: 'virtual route',
    shell: {
      header: {
        corpora: [],
        currentCorpusKey: 'all',
        noteLayout: false,
        sidebarEnabled: false,
        tocPresence: 'absent',
        tocRuntimeId: null,
      },
    },
  };
});

await router.start();

const result = await router.navigate({
  url: '/virtual-route',
  historyMode: 'push',
});

if (result.outcome !== 'completed') {
  console.warn('navigation did not complete', result);
}
```

### `app-router` 連携

```ts
const router = new Router(outlet, {
  skipInitialNavigation: true,

  contentAdapter: {
    async prepare({ html }) {
      const previous = currentContent;
      const next = html;

      return {
        async commit() {
          currentContent = next;
          await applyContent(next);
        },
        async rollback() {
          currentContent = previous;
          await applyContent(previous);
        },
      };
    },
  },

  shellAdapter: {
    async prepare({ shell }) {
      const previousShell = readCurrentShellSnapshot();
      const nextShell = shell;

      return {
        async commit() {
          applyShellSnapshot(nextShell);
        },
        async rollback() {
          applyShellSnapshot(previousShell);
        },
      };
    },
  },
});

await router.start();
```

## 保守上の判断基準

- 汎用化のための抽象化より、Rouault 固有要件の明示を優先する
- 公開 API の意味論を内部実装より先に固定する
- route と fetch の差は loader 内部へ閉じ込め、公開契約へ漏らさない
- 生成と起動は分離し、constructor に副作用を持ち込まない
- 外部描画統合は単発 callback ではなく 2 相 commit で扱う
- DOM 後処理の責務位置は、描画の主体に一致させる
- outcome を伴わない曖昧な完了判定を導入しない

## sidebar route-select policy

note 遷移時の sidebar collapse policy は presentation mode に従います。

- overlay mode では note 選択後に collapse してよい
- fixed mode では note 選択後も expanded のまま維持する

この policy は router 自身が sidebar state を所有することを意味しません。
router は route commit を行い、sidebar 側はその結果として route-select を解釈します。
