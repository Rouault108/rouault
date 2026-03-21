# router

## 文書の位置付け

本仕様書は、Rouault における **専用 router の新規実装仕様** を定義します。ここで定義する API、責務境界、イベント、後処理はすべて **移行完了後の正規構成** を前提とします。

本仕様書は、実装者・レビューア・利用側コンポーネントが共有する **唯一の契約文書** です。実装上の便宜や一時的な段階設計は本仕様書に含めません。

## 概要

`router` は、Rouault における SPA ナビゲーションを司る **Rouault 専用 router** です。内部リンクの横取り、履歴同期、URL 正規化、文書取得、`<main>` 差し替え、`document.title` / `meta[name="description"]` / `layout-header` 同期、再初期化フック、フォーカス移動、スクロール復帰、読み上げ通知までを一連の遷移処理として扱います。

本 router は、汎用ルーティング基盤ではありません。Rouault 固有の URL 形、shell 同期、`app-router` 連携、アクセシビリティ後処理を前提とした **アプリケーション・ナビゲーション層** です。

## 目的

- **MPA 的な URL / 履歴 / 文書メタデータ整合** を保ちつつ、本文更新を SPA として行うこと
- **Rouault 固有の shell 同期** を router の既定責務として扱うこと
- **アクセシビリティ後処理** を遷移契約に含めること
- ``** 連携時と単体利用時の責務境界** を明確にすること
- **遷移結果を outcome として観測可能** にし、高頻度遷移時の意味論を安定化すること

## 対象外

- 汎用的な動的ルートパラメータ DSL
- ネストルーター
- 汎用 redirect / guard DSL
- データフェッチキャッシュ戦略
- 汎用 head 管理基盤
- SSR 本体の生成責務

## 設計原則

### 1. Rouault 専用であることを隠さない

汎用化のための抽象化を優先せず、Rouault 固有要件を公開契約に明示します。

### 2. route 経路と fetch 経路を同一モデルで扱う

最終的な反映単位は、HTML 文字列ではなく `` とします。これにより、head / shell / content の反映規則を一本化します。

### 3. 遷移完了は outcome で定義する

遷移 API は、成功・中止・上書き・失敗を `` として返します。呼び出し側は Promise 解決の有無ではなく `outcome` を観測します。

### 4. 生成と起動を分離する

`Router` の構築は副作用を伴ってはなりません。`document click` / `popstate` 監視、`aria-live` リージョン追加、初期遷移開始は `` によってのみ開始します。

### 5. 外部描画統合は 2 相 commit とする

router 外部へ本文描画を委譲する場合は、単発 callback ではなく **prepare / commit / rollback** を持つ 2 相 adapter によって統合します。これにより、router 管理下状態と外部描画状態の分裂を抑制します。

### 6. 公開 API は完成形のみを露出する

公開 API は、新規実装として採用する契約だけで構成します。内部の段階設計や暫定構成は公開契約へ持ち込みません。

## 用語

### navigation URL

遷移要求およびブラウザ表示に用いる正規化済み URL です。Rouault では、ルート `/` を除き末尾 `/` を持たず、`wtr-session-id` を除去した pathname + search + hash を指します。

### fetch target URL

ネットワーク取得に用いる URL です。hash は含みません。静的出力物の都合で pathname 末尾 `/` を補うことがあります。

### full navigation

本文取得・head 更新・shell 更新・outlet 更新を伴う通常遷移です。

### state-only navigation

本文取得を伴わず URL state だけを更新する遷移です。Rouault では、これは **primary tab の切替に限定された特殊遷移** を指します。

### DocumentSnapshot

router が反映対象として扱う統一文書表現です。route 経路でも fetch 経路でも最終的にこの形へ正規化します。

### NavigationOutcome

個々の遷移要求の結果です。`completed` / `cancelled` / `superseded` / `failed` を取ります。

### NavigationErrorReason

遷移要求が異常系を伴った際の安定識別子です。`'auth' | 'forbidden' | 'timeout' | 'network' | 'server' | 'service-unavailable' | 'unexpected' | 'destroyed' | 'not-started'` を取ります。

## 全体構成

| 要素                    | 主責務                                                         |
| --------------------- | ----------------------------------------------------------- |
| `Router`              | 公開 API、ライフサイクル、依存関係の組み立て                                    |
| Link Interceptor      | `document click` / `popstate` 監視と内部遷移化                      |
| Location Adapter      | URL 正規化、履歴 state 生成、navigation URL と fetch target URL の差分吸収 |
| Navigation Queue      | latest-wins の直列化制御                                          |
| Navigation Runner     | 1 回の遷移実行、outcome 確定、イベント通知                                  |
| Before Navigate Hooks | 遷移前フック登録・実行                                                 |
| Route Registry        | document route 登録とマッチング                                     |
| Content Loader        | fetch / route 実行と `DocumentSnapshot` 生成                     |
| Content Committer     | snapshot の head / shell / content 反映                        |
| Head Manager          | `document.title` と `meta[name="description"]` の更新           |
| Shell Synchronizer    | `layout-header` への同期                                        |
| Reinitialize Hooks    | 遷移後再初期化フック登録・実行                                             |
| Focus Manager         | 遷移後フォーカス移動                                                  |
| Router Announcer      | `aria-live` リージョンと読み上げ通知                                    |

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
  snapshotKind: 'page' | 'not-found' | 'error';
  navigationUrl: string;
}

interface PreparedContentUpdate {
  commit(): void | Promise<void>;
  rollback(): void | Promise<void>;
}

interface ContentUpdateAdapter {
  prepare(update: ContentUpdatePayload): PreparedContentUpdate | Promise<PreparedContentUpdate>;
}

interface RouterOptions {
  contentAdapter?: ContentUpdateAdapter;
  skipInitialNavigation?: boolean;
  skipAriaLiveRegion?: boolean;
  navigationTimeoutMs?: number | null;
}
```

| 項目                      | 既定          | 意味                                                                              |
| ----------------------- | ----------- | ------------------------------------------------------------------------------- |
| `contentAdapter`        | `undefined` | 本文描画を外側へ委譲する 2 相 adapter です。未指定時、router は outlet を直接更新します。                      |
| `skipInitialNavigation` | `false`     | `start()` 時の初回 `historyMode: 'none'` 遷移を抑止します。SSR 初期本文を保持する `app-router` で用います。 |
| `skipAriaLiveRegion`    | `false`     | router 自身が `document.body` に `aria-live` リージョンを追加しないようにします。                     |
| `navigationTimeoutMs`   | `null`      | 1 件の navigation の上限時間です。`null` は timeout 無効を意味します。                              |

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

type NavigationOutcome =
  | 'completed'
  | 'cancelled'
  | 'superseded'
  | 'failed';

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
  source: 'document-route' | 'fetch' | 'state-only' | 'none';
  snapshotKind: 'page' | 'not-found' | 'error' | null;
  error?: Error;
  errorReason?: NavigationErrorReason;
}
```

#### 契約

- `navigate()` は **当該要求自身の結果** を返します。
- `navigate()` は started 状態でのみ通常動作します。
- `start()` 前の `navigate()` は、同期例外を送出してはなりません。
- `start()` 前の `navigate()` は、`outcome = 'failed'`、`committed = false`、`source = 'none'`、`snapshotKind = null` の結果を返し、`error` に `RouterNotStartedError`、`errorReason` に `'not-started'` を設定しなければなりません。
- `completed` は、当該要求が実行され、必要な反映と後処理まで完了したことを意味します。
- `cancelled` は、`BeforeNavigateHook` により中止されたことを意味します。
- `superseded` は、latest-wins により後続要求へ上書きされたことを意味します。
- `failed` は、遷移要求の実行自体が失敗したことを意味します。
- 異常系に対して `error` snapshot または `not-found` snapshot を正常反映できた場合、`outcome` は `completed` です。

### `NavigationResult.committed` の定義

`committed` は、この要求が **router 管理状態に対する勝者として確定反映されたか** を表します。

- `committed = true` となるのは次の場合のみです。
  - full navigation で head / shell / content の commit が完了した場合
  - state-only navigation で URL state 更新が確定した場合
- `committed = false` となるのは次の場合です。
  - `cancelled`
  - `superseded`
  - commit 前に終了した `failed`

### `snapshotKind` / `error` / `errorReason` の関係

- `snapshotKind = 'page'` かつ正常遷移であれば `error` / `errorReason` は設定しません。
- `snapshotKind = 'not-found'` で `completed` の場合、`error` / `errorReason` は通常設定しません。
- `snapshotKind = 'error'` で `completed` の場合、`errorReason` は必須です。`error` は原因となった基底例外を可能な限り設定します。
- `snapshotKind = null` の場合、いかなる snapshot も commit されていません。`failed` であるなら `errorReason` は必須です。

### `outcome` と `committed` の対応

| outcome      | committed | 意味                  |
| ------------ | --------- | ------------------- |
| `completed`  | `true`    | この要求が最終的に反映された      |
| `cancelled`  | `false`   | hook により中止された       |
| `superseded` | `false`   | 後続要求に上書きされ、反映されなかった |
| `failed`     | `false`   | 反映に到達しなかった          |

### `source` と `committed` の整合

- `source = 'document-route'` / `'fetch'` / `'state-only'` のとき、`completed` であれば `committed` は必ず `true` です。
- `source = 'none'` は、commit 経路に入らず終了した要求にのみ用います。したがって `committed` は常に `false` です。

### `navigate()` の戻り値と `after:navigate` の役割分担

- `navigate()` の戻り値は、**その呼び出し自身** の完了結果を受け取るための API です。
- `after:navigate` は、router が処理した **すべての遷移要求** を外部が受動的に観測するためのイベントです。
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
  breadcrumbs: Array<{
    label: string;
    href?: string;
  }>;
  noteLayout: boolean;
}

interface DocumentShellSnapshot {
  header: HeaderShellSnapshot;
}

type ErrorSnapshotReason =
  | 'auth'
  | 'forbidden'
  | 'timeout'
  | 'network'
  | 'server'
  | 'service-unavailable'
  | 'unexpected';

type DocumentSnapshot =
  | {
      kind: 'page';
      html: string;
      title: string;
      metaDescription: string | null;
      shell: DocumentShellSnapshot;
      announcedTitle?: string | null;
    }
  | {
      kind: 'not-found';
      html: string;
      title: string;
      metaDescription: string;
      shell: DocumentShellSnapshot;
      announcedTitle?: string | null;
    }
  | {
      kind: 'error';
      reason: ErrorSnapshotReason;
      statusCode?: number;
      html: string;
      title: string;
      metaDescription: string;
      shell: DocumentShellSnapshot;
      announcedTitle?: string | null;
    };

type DocumentRouteHandler =
  (context: DocumentRouteContext) => DocumentSnapshot | Promise<DocumentSnapshot>;
```

#### 契約

- `handler` は `DocumentSnapshot` を返します。
- `handler` は `url` / `normalizedUrl` / `pathname` / `searchParams` / `hash` / `signal` を受け取ります。
- route 経路でも fetch 経路と同一の commit 規則を適用します。
- `handler` へ渡す `searchParams` は **防御的コピー** です。mutation は router 内部状態へ影響しません。
- `handler` は `shell` を必ず返します。変更不要時でも明示値を返します。
- `handler` は `AbortSignal` を尊重すべきです。
- `shell` は **閉じた意味モデル** とし、任意の属性 bag や `Record<string, unknown>` として拡張してはなりません。
- `shell` の拡張は、`header` 直下または将来追加される明示的なサブ snapshot に **加算的に** 行います。既存フィールドの意味変更や型変更は認めません。

### `addDocumentRoute()` の呼び出し時期

- `addDocumentRoute()` は **construct 後から destroy 前まで** 呼び出せます。
- `start()` 前後のどちらでも登録できます。
- 登録は、**登録完了後に route 解決へ入る navigation** にのみ適用されます。
- 実行中 navigation の route 解決結果へ後から影響を与えてはなりません。
- `destroy()` 後の `addDocumentRoute()` は `RouterDestroyedError` を同期送出してよい API です。

### `DocumentSnapshot.kind` ごとの必須差分

#### `kind: 'page'`

- 正常に解決された文書本文を表します。
- 404 画面、権限エラー画面、通信失敗画面を `page` として返してはなりません。
- `metaDescription` は `null` を許容します。
- `html` は遷移先本文そのものを表し、エラー代替 UI であってはなりません。

#### `kind: 'not-found'`

- 文書が存在しない、または `<main>` を含む有効文書として解決できないことを表します。
- `404`、route 未一致、`<main>` 欠落は `not-found` を返します。
- `metaDescription` は必須です。`null` は認めません。
- `html` は not-found 専用 UI を表し、通常文書本文として再利用してはなりません。

#### `kind: 'error'`

- `not-found` 以外の異常系を表します。
- `reason` は必須です。
- `401`、`403`、`500`、`503`、timeout、network error、unexpected exception は `error` を返します。
- `metaDescription` は必須です。`null` は認めません。
- `html` は error 専用 UI を表し、通常文書本文や not-found UI と混用してはなりません。

### `kind` の選択規則

- 正常文書なら `page`
- 存在しない、または本文として成立しないなら `not-found`
- それ以外の異常は `error`

`NavigationResult.outcome` は `kind` ではなく **commit 成否** により決まります。したがって `not-found` / `error` snapshot であっても、正常に commit できた場合は `outcome = 'completed'` です。

## 補助 API

```ts
interface BeforeNavigateContext {
  currentUrl: string;
  requestedUrl: string;
  normalizedUrl: string;
  historyMode: HistoryMode;
}

type BeforeNavigateHook =
  (context: BeforeNavigateContext) => void | true | false;

on<K extends keyof RouterEventMap>(event: K, callback: (payload: RouterEventMap[K]) => void): void
off<K extends keyof RouterEventMap>(event: K, callback: (payload: RouterEventMap[K]) => void): void
isNavigating(): boolean
addBeforeNavigateHook(hook: BeforeNavigateHook): void
removeBeforeNavigateHook(hook: BeforeNavigateHook): void
addReinitializeHook(hook: () => void): void
removeReinitializeHook(hook: () => void): void
runReinitializeHooks(): void
getSearchParams(): URLSearchParams
getCurrentPath(): string
getHistory(): string[]
```

### `BeforeNavigateHook` の契約

- `BeforeNavigateHook` は **制御フック** であり、観測イベントではありません。
- hook は同期関数でなければなりません。`Promise` を返してはなりません。
- hook は登録順に実行します。
- いずれかの hook が `false` を返した場合、その遷移は `cancelled` です。
- hook が `true` または `void` を返した場合、その hook は遷移を継続させます。
- hook 実行中に例外が発生した場合、その遷移は `cancelled` とし、`error` を発火します。
- hook 実行は short-circuit です。`false` または例外が発生した時点で後続 hook は実行しません。
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
- ルート `/` を除き、表示用 pathname 末尾 `/` を除去する
- navigation URL は pathname + search + hash で表現する
- fetch target URL は pathname + search で表現し、hash を含めない
- fetch target URL は静的出力物取得のため pathname 末尾 `/` を補うことがある

### 例

| 入力                                   | navigation URL       | fetch target URL  |
| ------------------------------------ | -------------------- | ----------------- |
| `/docs/example/`                     | `/docs/example`      | `/docs/example/`  |
| `/search/?q=test&wtr-session-id=abc` | `/search?q=test`     | `/search/?q=test` |
| `/notes/a#section-1`                 | `/notes/a#section-1` | `/notes/a/`       |

### state-only 判定における query 比較

- state-only navigation の判定では、`tab` を除く query parameter を **順序非依存だが重複数を保持する multiset** として比較します。
- したがって `?tag=a&tag=b` と `?tag=b&tag=a` は等価です。
- ただし `?tag=a&tag=a` と `?tag=a` は非等価です。
- `tab` parameter が複数回出現する URL は primary tab 遷移として扱わず、常に full navigation とします。

## 履歴 state

router は `history.state` に次を保存します。

- `__routerUrl`: 正規化済み navigation URL
- `__routerPath`: pathname

`readCurrentUrl()` は、まず `history.state` を参照し、なければ `window.location` から組み立てます。

## ルート解決

### 解決順序

1. `addDocumentRoute()` 登録ルートを試行する
2. 一致すれば `DocumentSnapshot` を採用する
3. 一致しなければ fetch して HTML を取得する
4. HTML から `<main>`、`title`、`meta[name="description"]`、shell 同期情報を抽出する
5. 抽出結果を `DocumentSnapshot` へ正規化する
6. `<main>` を得られなければ `not-found` snapshot とする

### pattern 契約

- `string` pattern は **正規化後 **``** に対する完全一致** とします。
- `string` pattern において `*` やその他の記号に特別な意味はありません。文字どおりに扱います。
- 部分一致、前方一致、query 条件付き一致などが必要な場合は、明示的に `RegExp` を使用します。
- `RegExp` は正規化後 `pathname` に対して `test()` します。
- route pattern は query と hash を直接マッチ対象にしません。必要であれば handler 内で `searchParams` と `hash` を検査します。

## コンテンツロード

## fetch 経路

fetch 成功時は HTML を解析し、少なくとも次を snapshot へ格納します。

- `html`: `<main>` の `innerHTML`
- `title`: 遷移先文書の `title`
- `metaDescription`: `meta[name="description"]` の `content` または `null`
- `shell.header.breadcrumbs`: 遷移先 `layout-header` の `breadcrumbs-json` を parse した配列
- `shell.header.noteLayout`: 遷移先 `layout-header` の `note-layout` 属性有無を boolean 化した値

## HTTP ステータスと例外

| 事象                            | kind        | reason                | 変換先                |
| ----------------------------- | ----------- | --------------------- | ------------------ |
| `401`                         | `error`     | `auth`                | 認証エラー snapshot     |
| `403`                         | `error`     | `forbidden`           | 権限エラー snapshot     |
| `404`                         | `not-found` | なし                    | not-found snapshot |
| `500`                         | `error`     | `server`              | サーバーエラー snapshot   |
| `503`                         | `error`     | `service-unavailable` | サービス利用不可 snapshot  |
| `AbortError` / `TimeoutError` | `error`     | `timeout`             | タイムアウト snapshot    |
| `fetch` を含む `TypeError`       | `error`     | `network`             | ネットワークエラー snapshot |
| その他                           | `error`     | `unexpected`          | 汎用エラー snapshot     |

#### 契約

- 表示可能な `error` snapshot または `not-found` snapshot を組み立てられた場合、遷移 `outcome` は `completed` とします。
- このとき、異常原因が存在するなら `NavigationResult.error` と `NavigationResult.errorReason` を設定すべきです。
- snapshot 自体の生成や commit ができなかった場合のみ `failed` とします。

## コミット仕様

`ContentCommitter` は `DocumentSnapshot` を受け取り、次を一貫して実行します。

1. `document.title` を更新する
2. `meta[name="description"]` を更新する
3. `layout-header` を同期する
4. 本文を更新する
5. 履歴 state を確定する

### shell 同期対象

`shell-synchronizer` は `DocumentShellSnapshot.header` を `layout-header` の公開契約へ写像します。

- `header.breadcrumbs` → `breadcrumbs-json`
- `header.noteLayout` → `note-layout`

それ以外の shell 状態は router の責務外です。

### shell モデルの拡張原則

- `DocumentShellSnapshot` は router が同期責務を持つ **最小の意味モデル** です。
- `layout-header` の内部実装詳細や一時的属性を snapshot へ露出してはなりません。
- 新しい shell 状態が必要になった場合は、まずそれが **文書遷移に伴って決まる安定状態か** を判定します。
- 安定状態である場合のみ、`header` 直下の明示フィールド、または `sidebar` / `toolbar` のような新しいサブ snapshot を追加します。
- 単なる描画都合、アニメーション状態、hover / open 状態、計測値は shell snapshot に含めません。

### `contentAdapter` 指定時

- router は `outlet.innerHTML` を直接変更しません。
- router は `contentAdapter.prepare()` を呼び出し、`PreparedContentUpdate` を取得します。
- `prepare()` は **外部可視状態を publish してはなりません**。staging のみを行います。
- router は `prepare()` 成功後にのみ、router 管理下の commit へ進みます。
- router 管理下の commit と `PreparedContentUpdate.commit()` は **同一 commit 単位** として扱います。
- router 管理下の commit または `PreparedContentUpdate.commit()` のいずれかが失敗した場合、router は自らの pre-commit 状態へ rollback し、`PreparedContentUpdate.rollback()` を呼び出さなければなりません。
- `prepare()` が throw または reject した場合、その遷移は `failed` です。`committed = false` とし、router 管理下の head / shell / content / 履歴に当該 snapshot を反映してはなりません。
- `commit()` または `rollback()` が失敗した場合、その遷移は `failed` です。可能な限り `error` と `errorReason = 'unexpected'` を設定しなければなりません。
- `content:load` は commit 完了後にのみ発火します。

### `contentAdapter` を採用する理由

- 単発 callback は「外側 state は変わったが router 側は未 commit」という分裂状態を招きやすいです。
- 2 相 adapter により、prepare / commit / rollback を明示して統合境界を強化します。
- adapter 実装が契約を守る限り、外部描画と router 管理下状態は **all-or-nothing に近い振る舞い** を取ります。

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

state-only navigation の判定主体は `NavigationRunner` です。`NavigationRunner` は `PrimaryTabNavigationPolicy` へ判定を委譲し、その結果が真である場合にのみ state-only navigation として扱います。

`LocationAdapter` は URL 正規化と履歴書き込みを担当しますが、state-only / full navigation の判定責務は持ちません。

### 判定条件

次のすべてを満たす場合に限り、state-only navigation とします。

- 正規化後 URL の `pathname` が一致する
- `tab` を除く query parameter multiset が順序非依存で一致する
- primary tab 値だけが変化している

ここでの primary tab 値は query parameter `tab` により表現します。空文字列は未指定と同値に扱います。

### 判定しない条件

次のいずれかに該当する場合は full navigation とします。

- `pathname` が異なる
- `tab` 以外の query parameter が 1 つでも異なる
- primary tab 値が同一である
- primary tab 値の差分だけでは説明できない URL 差分がある

### hash の扱い

hash 差分は state-only navigation を妨げません。`pathname` と `tab` / 非 `tab` query の条件を満たす限り、hash が同時に変化していても state-only navigation とします。

### 実行内容

state-only navigation と判定された場合、full navigation を行わず次を実行します。

- 必要に応じて `pushState` / `replaceState`
- `ui-url-state-change` を dispatch する
- hash がある場合、2 回の `requestAnimationFrame` 後に該当要素へスクロールする
- fetch / head 更新 / shell 同期 / 本文差し替え / `content:load` は行わない
- `after:navigate` は発火する
- `NavigationResult.stateOnly = true` とする
- `NavigationResult.source = 'state-only'` とする
- `NavigationResult.snapshotKind = null` とする

## 直列化・中断・latest-wins

### 基本規則

- router は同時に 1 件だけ full navigation を実行する
- 待機中は **最新 1 件のみ保持** する
- 後続要求が来た場合、古い待機要求は `superseded` とする
- 実行中要求についても、可能であれば in-flight fetch を `AbortController` で中断し、latest-wins を適用する
- `navigationTimeoutMs` が非 `null` の場合、timeout は route handler / fetch / snapshot 正規化 / content prepare / content commit を含む 1 件の navigation 実行全体へ適用します

### `superseded` の意味

- 当該要求は commit に到達していない
- 当該要求の呼び出し側は、その結果を UI 完了通知として扱ってはならない
- `navigate()` は `outcome: 'superseded'` を返す

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
  error: { error: Error };
}
```

### 発火規則

| イベント名                    | 発火タイミング                   | payload                           |
| ------------------------ | ------------------------- | --------------------------------- |
| `navigation:busy-change` | `isNavigating()` の値が変化した時 | `{ isNavigating }`                |
| `content:load`           | 本文更新完了後                   | `{ previousUrl, url, isInitial }` |
| `after:navigate`         | 要求単位の結果確定後                | `NavigationResult`                |
| `ui-url-state-change`    | state-only navigation 確定時 | `{ previousUrl, url }`            |
| `error`                  | hook 例外、commit 失敗など       | `{ error }`                       |

### `navigation:busy-change` を採用し、`loading:start` / `loading:end` を公開しない理由

- `loading:start` / `loading:end` は、router 内部の実行相を外部へ露出するイベントです。
- latest-wins、abort、待機要求の上書きが入ると、開始・終了の回数と利用側が知りたい「今忙しいか」が一致しない場面が生じます。
- 公開契約として重要なのは、開始回数や終了回数ではなく **現在 full navigation 中かどうか** です。
- そのため公開面では `isNavigating()` と同じ意味を持つ `navigation:busy-change` だけを提供します。

### `after:navigate` を残し、`navigate()` の戻り値へ一本化しない理由

- router は imperative call だけでなく、リンク横取りと `popstate` による遷移も処理します。
- これらの遷移では、外部の購読者が `navigate()` の Promise を保持しているとは限りません。
- したがって、router 外部の観測者には **要求単位の結果通知** が別途必要です。
- `after:navigate` はそのための broadcast であり、呼び出し元に結果を返す `navigate()` とは役割が異なります。

### `content:load` を唯一の本文完了イベントとする理由

- `route:change` と `content:load` を別イベントとして併設すると、両者の差が「初回を含むかどうか」に縮退し、契約が二重化します。
- URL 変化の最終結果は `after:navigate` と `NavigationResult` で観測できます。
- state-only navigation は本文更新を伴わないため、`route:change` という名称は意味論を濁します。
- 本文更新完了という UI 上の重要点は `content:load` だけで十分に表現できます。

### 遷移前キャンセル

- `BeforeNavigateHook` のいずれかが `false` を返した場合、その遷移は `cancelled` です。
- hook 実行中に例外が発生した場合、その遷移は `cancelled` とし、`error` を発火します。
- `cancelled` では `navigation:busy-change` / `content:load` / `ui-url-state-change` は発火しません。
- `cancelled` では結果通知として `after:navigate` のみを発火します。

### `after:navigate` の発火規則

- `after:navigate` は、router が受理した各遷移要求について **ちょうど 1 回** 発火します。
- payload は常に、その要求自身の `NavigationResult` です。
- `completed` / `cancelled` / `superseded` / `failed` のいずれでも発火します。
- `after:navigate` は **要求単位の結果通知** であり、本文反映イベントでも busy 状態イベントでもありません。

### イベント順序

full navigation 成功時の標準順序は次のとおりです。

```text
BeforeNavigateHook 実行
navigation:busy-change(true)
content:load
navigation:busy-change(false)   （isNavigating() が false へ遷移する場合のみ）
after:navigate
```

state-only navigation 成功時の標準順序は次のとおりです。

```text
BeforeNavigateHook 実行
ui-url-state-change
after:navigate
```

full navigation が完了しても、後続 full navigation が連続して busy 状態を維持する場合は `navigation:busy-change(false)` を発火しません。この場合でも `after:navigate` は発火します。

### `navigation:busy-change` の発火規則

- `navigation:busy-change` は ``** の返値が変化したときだけ** 発火します。
- full navigation 開始時、`false → true` の遷移が起きた場合にだけ `{ isNavigating: true }` を発火します。
- full navigation 終了時、保留中・実行中の full navigation が 0 件になった場合にだけ `{ isNavigating: false }` を発火します。
- state-only navigation では発火しません。
- `cancelled` / `superseded` が busy 状態を変化させない場合、追加発火しません。

## 後処理

## 単体 `Router` 利用時

`contentAdapter` 未指定時は、本文反映後に次を実行します。

1. 再初期化フックを実行する
2. `window.scrollTo({ top: 0, left: 0, behavior: 'instant' })` を行う
3. outlet 内の `h1, h2` へフォーカスし、なければ outlet 自身へフォーカスする
4. `aria-live="polite"` で読み上げ通知を行う

### フォーカス規則

- 見出し要素へ移動する際、`tabindex` がなければ `-1` を付与する
- `focus({ preventScroll: true })` を使用する
- 見出しがなければ outlet へフォーカスする

## `app-router` 統合時

`contentAdapter` を利用する `app-router` では、router は本文反映後 DOM に依存する後処理を自ら実行しません。外側コントローラ群が担当します。

- Content Adapter: SSR 初期本文を吸い上げ、以降の本文更新を staging / commit / rollback する
- Post Render Controller: Lit 更新完了後に再初期化フック、先頭スクロール、フォーカス移動を実行する
- Announcement Controller: `content:load` を受けて外部 `aria-live` を更新する

この分離により、Lit の描画完了前に DOM 後処理を走らせないことを保証します。

## 履歴と観測

### `getHistory()`

- router 内部が **commit 完了した full navigation** と **確定した state-only navigation** を積んだ navigation URL 配列を返します。
- `skipInitialNavigation: true` の場合、初期 navigation URL を 1 件目として記録します。
- `superseded` / `cancelled` / `failed` の要求は履歴へ積みません。

### `isNavigating()`

- 少なくとも 1 件の full navigation が実行中である間 `true` を返します。
- state-only navigation のみでは `true` にしません。

## 不変条件

- 内部 URL は常に `LocationAdapter.normalizeUrl()` を通して扱う
- navigation URL と fetch target URL を混同しない
- fetch target URL は hash を含まない
- `navigation:busy-change` は `isNavigating()` の値変化と 1 対 1 に対応する
- `content:load` は full navigation における本文反映完了後にのみ 1 回発火する
- `route:change` という別名イベントは定義しない
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
- `contentAdapter` 未指定時、router は outlet を直接書き換える
- `contentAdapter` 指定時、prepare は外部可視状態を publish しない
- `contentAdapter` 経路では prepare / commit / rollback により 2 相統合を行う
- route 経路と fetch 経路は commit 直前に同一 `DocumentSnapshot` へ正規化される
- state-only / full navigation の判定は `NavigationRunner` から `PrimaryTabNavigationPolicy` への委譲によってのみ行う
- query parameter の公開表現は `URLSearchParams` であり、重複 parameter を失ってはならない
- `getSearchParams()` と `DocumentRouteContext.searchParams` は防御的コピーである
- `string` route pattern は正規化後 `pathname` に対する完全一致としてのみ扱う
- `DocumentShellSnapshot` は閉じた意味モデルであり、任意属性 bag として拡張しない
- `completed` と `committed = true` は常に同時に成立する
- `cancelled` / `superseded` / `failed` では `committed = false` である
- `DocumentSnapshot.kind` は `page` / `not-found` / `error` のいずれか 1 つに一意に分類され、同一 snapshot が複数 kind の意味を兼ねてはならない
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
        breadcrumbs: [],
        noteLayout: false,
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
  skipAriaLiveRegion: true,
  contentAdapter: {
    async prepare({ html }) {
      let previous = currentContent;
      return {
        async commit() {
          setPageContent(html);
          await updateComplete;
        },
        async rollback() {
          setPageContent(previous);
          await updateComplete;
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

