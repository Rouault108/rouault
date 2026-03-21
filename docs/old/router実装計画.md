# router

## 概要

`router` は、Rouault における SPA ナビゲーションを司る**専用 router**です。内部リンクの横取り、履歴同期、コンテンツ取得、`<main>` 差し替え、`document.title` / `meta[name="description"]` / `layout-header` の同期、再初期化フック、フォーカス移動、スクロール復帰、読み上げ通知までを一連の遷移処理としてまとめます。

本コンポーネントは、汎用ルーティング基盤ではなく、**Rouault 固有の URL 正規化、shell 同期、**``** 統合、アクセシビリティ後処理を前提に設計されたアプリケーション・ナビゲーション層**です。したがって、汎用 router に典型的な動的パラメータ解決、ネストルーティング、汎用 route context、汎用 head 管理を包括的に提供することは目的としません。

本仕様は、`router.ts` を公開ファサードとし、`content-loader.ts`、`content-committer.ts`、`location-adapter.ts`、`navigation-queue.ts`、`navigation-runner.ts` ほか周辺モジュールの現行実装を統合した振る舞いを記述します。

## 目的

- **MPA 的な URL / 履歴 / 文書メタデータの整合**を保ちながら、本文更新を SPA として行うこと。
- **Rouault 固有の shell 同期**（`layout-header` のパンくず・`note-layout`）を継続させること。
- **アクセシビリティ上必要な後処理**（フォーカス、`aria-live`、スクロール復帰）を遷移の既定動作として提供すること。
- **Lit ベースの **``** 統合**と、単体 `Router` 利用の両方を支えられること。

## スコープ

### 対象

- 内部リンククリックのインターセプト
- `history.pushState` / `history.replaceState` / `popstate` との同期
- ルートハンドラによる仮想ルート解決
- HTML フェッチと `<main>` 抽出
- head / shell / outlet へのコミット
- イベント通知
- 再初期化フック実行
- フォーカス移動、先頭スクロール、ページ読み込み通知
- primary tab 差分のみの state-only navigation

### 対象外

- 汎用的な動的パラメータルーティング
- データフェッチのキャッシュ戦略
- プリフェッチ
- ネストルーター
- ガード／リダイレクト DSL
- SSR 本体の生成責務

## 設計上の位置付け

`Router` は単一巨大クラスではなく、次の責務分割を前提とします。

| モジュール                              | 主責務                                              |
| ---------------------------------- | ------------------------------------------------ |
| `router.ts`                        | 公開 API、依存関係の組み立て、初期化と破棄                          |
| `browser-link-interceptor.ts`      | `document click` / `popstate` の監視と内部遷移化          |
| `location-adapter.ts`              | URL 正規化、履歴 state 生成、表示 URL と取得 URL の差分吸収         |
| `navigation-queue.ts`              | ナビゲーション直列化と latest-wins の pending 集約             |
| `navigation-runner.ts`             | 1 回の遷移実行、イベント発火、View Transition 統合               |
| `route-registry.ts`                | 仮想ルート登録とハンドラ実行                                   |
| `content-loader.ts`                | route handler 実行、フェッチ、HTML 解析、エラーページ生成           |
| `content-committer.ts`             | head / shell / outlet への反映                       |
| `head-manager.ts`                  | `document.title` と `meta[name="description"]` 管理 |
| `shell-synchronizer.ts`            | `layout-header` 属性同期                             |
| `reinitialize-hook-registry.ts`    | 再初期化フック登録・実行                                     |
| `focus-manager.ts`                 | 遷移後フォーカス移動                                       |
| `router-announcer.ts`              | `aria-live` リージョンの生成と読み上げ通知                      |
| `standalone-navigation-effects.ts` | 単体 `Router` 利用時の後処理一式                            |
| `router-event-bus.ts`              | ルーター内イベント購読・通知                                   |

## 公開 API

## `new Router(outlet, options?)`

`outlet` を遷移先本文の反映先とする `Router` を構築します。コンストラクタは初期化副作用を持ち、生成直後に次を行います。

1. リンクインターセプタを attach します。
2. 必要に応じて `aria-live` リージョンを attach します。
3. `skipInitialNavigation` に応じて初期ナビゲーションを開始、または省略します。

### `RouterOptions`

| 項目                      | 型                                         | 既定          | 意味                                                                         |
| ----------------------- | ----------------------------------------- | ----------- | -------------------------------------------------------------------------- |
| `onContentUpdate`       | `(html: string) => void \| Promise<void>` | `undefined` | outlet への直接 `innerHTML` 代入を行わず、外側へ本文更新を委譲します。指定時は標準後処理を `Router` 側で実行しません。 |
| `skipInitialNavigation` | `boolean`                                 | `false`     | 初回ロード時の `historyMode: 'none'` 遷移を抑止します。SSR 済み本文をそのまま使う `app-router` で用います。 |
| `skipAriaLiveRegion`    | `boolean`                                 | `false`     | `Router` 自身が `document.body` に `aria-live` リージョンを追加しないようにします。              |

### メソッド

| メソッド                           | 役割                                                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `setTimeout(ms)`               | フェッチタイムアウトを設定します。`0` 以下はタイムアウト無効です。                                                                                                         |
| `destroy()`                    | 監視解除、イベント購読消去、フック消去、queue dispose、`aria-live` 破棄を行います。破棄後の遷移要求は無視されます。                                                                      |
| `on(event, callback)`          | ルーターイベントを購読します。                                                                                                                             |
| `off(event, callback)`         | ルーターイベント購読を解除します。                                                                                                                           |
| `isNavigating()`               | 現在フルナビゲーション実行中かを返します。                                                                                                                       |
| `navigate(path, state?)`       | 内部遷移を要求します。`historyMode` は常に `'push'` です。**現行契約では Promise が「当該要求の実行完了」を厳密には保証しません。**                                                        |
| `addReinitializeHook(hook)`    | 遷移後再初期化フックを登録します。                                                                                                                           |
| `removeReinitializeHook(hook)` | 再初期化フックを解除します。                                                                                                                              |
| `runReinitializeHooks()`       | 登録済み再初期化フックを即時実行します。                                                                                                                        |
| `addRoute(pattern, handler)`   | 仮想ルートを登録します。handler が文字列 HTML を返した場合、フェッチを行いません。**legacy API と位置付け、将来的には route context と document snapshot を返す専用契約へ移行します。**                 |
| `getParams()`                  | 現在 URL から限定的な params を返します。**現状では **``** と **``** 専用**です。一般的な route params API ではありません。**legacy API と位置付け、将来的には廃止または専用 URL parser へ分離します。** |
| `getQuery()`                   | 現在 URL の query を key-value で返します。`wtr-session-id` は除外されます。                                                                                  |
| `getCurrentPath()`             | 現在 URL の pathname を返します。                                                                                                                    |
| `getHistory()`                 | ルーターが記録したナビゲーション履歴のコピーを返します。                                                                                                                |

## ルーティングモデル

## URL 正規化

`LocationAdapter` は URL を次のように正規化します。

- `wtr-session-id` query を除去します。
- ルート `/` を除き、末尾 `/` を除去します。
- 表示 URL は canonical 形（例: `/docs/example`）にそろえます。
- 取得 URL はディレクトリ風 path で末尾 `/` を補うことがあります（例: fetch 対象は `/docs/example/`）。
- hash は保持します。

### 正規化例

| 入力                                   | 表示 URL               | 取得 URL                |
| ------------------------------------ | -------------------- | --------------------- |
| `/docs/example/`                     | `/docs/example`      | `/docs/example/`      |
| `/search/?q=test&wtr-session-id=abc` | `/search?q=test`     | `/search/?q=test`     |
| `/notes/a#section-1`                 | `/notes/a#section-1` | `/notes/a/#section-1` |

## ルート解決順序

1. `RouteRegistry.execute(url)` を試行します。
2. 一致する handler が **文字列 HTML** を返した場合、その結果を採用します。
3. handler が一致しない、または文字列を返さない場合、HTML を fetch します。
4. fetch 結果から `<main>` の `innerHTML` を抽出します。
5. `<main>` が得られない場合は 404 相当として扱います。

### `addRoute(pattern, handler)` の契約

- `pattern` が文字列で `*` を含まない場合は **完全一致**です。
- `pattern` が文字列で `*` を含む場合は、`*` を `.*` に変換した正規表現として扱います。
- `pattern` が `RegExp` の場合はそのまま `test(url)` します。
- `handler` の返り値は **文字列のときのみ有効**です。
- `handler` には route params や URL オブジェクトは渡しません。

## リンクインターセプト仕様

`BrowserLinkInterceptor` は `document click` を監視し、次を満たすリンクのみ内部遷移へ変換します。

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
- 現在ページと pathname+search が同一で、hash だけ違うケースではない

### インターセプトしないもの

- 外部リンク
- 同一ページ内 hash ジャンプ
- `target="_blank"` 等を持つリンク
- ダウンロードリンク
- `data-no-router` 指定リンク
- 非 HTTP(S) スキーム
- `destroy()` 後の全リンク

`popstate` は常に `historyMode: 'none'` の遷移要求へ変換します。

## ナビゲーション実行仕様

## 実行の流れ

フルナビゲーションでは、おおむね次の順で処理します。

1. URL を正規化します。
2. `before:navigate` を cancelable として発火します。
3. primary tab 差分のみの遷移か判定します。
4. state-only navigation でなければ `loading:start` を発火します。
5. 必要に応じて `pushState` / `replaceState` を行います。
6. route handler または fetch によりコンテンツをロードします。
7. `ContentCommitter` が head / shell / outlet へ反映します。
8. 履歴配列更新、`route:change`、`content:load`、後処理を行います。
9. `loading:end`、`after:navigate` を発火します。

### `before:navigate` のキャンセル

- いずれかの listener が `false` を返した場合、その遷移は中止します。
- listener 実行中に例外が発生した場合、当該遷移は中止します。
- `before:navigate` で中止された場合、`loading:start` 以降は発火しません。

## state-only navigation

primary tab の差分のみであると判定された場合、フルナビゲーションは行いません。代わりに次を行います。

- 必要に応じて `pushState` / `replaceState`
- `ui-url-state-change` の dispatch
- hash がある場合、2 回の `requestAnimationFrame` 後に対応要素へスクロール
- fetch / head 更新 / 本文差し替え / `loading:start` / `content:load` は行わない
- `after:navigate` は発火する
- 履歴配列には URL を積む

## 直列化と pending 集約

`NavigationQueue` は、同時に 1 件だけ実行し、待機中は **最新 1 件のみ保持**します。

- 実行中に新しい遷移要求が来た場合、待機スロットへ保存します。
- さらに新しい要求が来た場合、以前の待機要求は破棄し、その `Promise` は **実行されないまま resolve** されます。
- したがって、`navigate()` の返り値は「その要求が実際に実行された」ことを常に保証しません。**後続要求に上書きされる場合があります。**
- `dispose()` 後は新規要求を即時 resolve し、待機中要求も実行せず解放します。

これは「高速連打時に最後の状態へ追従する」ための latest-wins 設計です。

## コンテンツロード仕様

## フェッチ成功時

フェッチが成功し、HTML から `<main>` を抽出できた場合、`LoadResult.kind = 'page'` とします。

このとき保持する情報は次のとおりです。

- `html`: 遷移先 `<main>` の `innerHTML`
- `title`: 遷移先 `document.title`
- `metaDescription`: `meta[name="description"]` の content。未定義なら `null`
- `document`: 解析済み `Document`

## route handler 成功時

`LoadResult.kind = 'handler'` とし、本文 HTML のみを返します。この経路では `ContentCommitter` は **head / shell を更新しません**。戻り値として現在の `document.title` をそのまま扱います。

## エラー・例外時

### HTTP ステータス

| ステータス | 扱い            |
| ----- | ------------- |
| `401` | 認証エラーページ      |
| `403` | 権限エラーページ      |
| `404` | not-found ページ |
| `500` | サーバーエラーページ    |
| `503` | サービス利用不可ページ   |
| その他   | 汎用エラーページ      |

### 例外

- `AbortError` / `TimeoutError` はタイムアウトエラーページに変換します。
- `fetch` を含む `TypeError` はネットワークエラーページに変換します。
- その他の例外は汎用エラーページに変換します。

### タイトル規約

- 通常ページは遷移先文書の `title` をそのまま使います。
- エラーページ / not-found ページは `"{ページタイトル} - Rouault"` 形式です。

## コミット仕様

## `ContentCommitter.commit(result)`

`LoadResult` に応じて反映範囲が異なります。

| kind        | head 更新                          | shell 更新             | outlet 更新 |
| ----------- | -------------------------------- | -------------------- | --------- |
| `handler`   | しない                              | しない                  | する        |
| `page`      | `title` / `meta description` を更新 | `layout-header` を同期  | する        |
| `not-found` | `title` / `meta description` を更新 | `layout-header` をクリア | する        |
| `error`     | `title` / `meta description` を更新 | `layout-header` をクリア | する        |

### shell 同期の範囲

`shell-synchronizer.ts` が同期するのは ``** の次の属性のみ**です。

- `breadcrumbs-json`
- `note-layout`

それ以外の shell 状態は router の責務外です。

### `onContentUpdate` 指定時

`onContentUpdate` がある場合、`ContentCommitter` は `outlet.innerHTML` を直接変更せず callback に `html` を渡します。`Router` は callback 完了を待機できます。

## 後処理仕様

## 単体 `Router` 利用時

`onContentUpdate` 未指定時は `StandaloneNavigationEffects` が有効であり、本文反映後に次を実行します。

1. 再初期化フック実行
2. `window.scrollTo({ top: 0, left: 0, behavior: 'instant' })`
3. outlet 内の `h1, h2` へフォーカス。見つからない場合は outlet 自身へフォーカス
4. `aria-live="polite"` で「ページが読み込まれました」を通知

### フォーカス規則

- 見出し要素へ移動する際、`tabindex` がなければ `-1` を付与します。
- `focus({ preventScroll: true })` を使用します。
- 見出しがなければ outlet へフォーカスします。

## `app-router` 統合時

`onContentUpdate` を利用する `app-router` では、上記後処理を `Router` が実施しません。代わりに外側コントローラ群が担当します。

- `AppRouterContentController`: SSR 初期本文を吸い上げ、以降の本文更新を state 化
- `AppRouterPostRenderController`: Lit 更新完了後に再初期化フック、先頭スクロール、フォーカス移動を実行
- `AppRouterAnnouncementController`: `content:load` を受けて外部の `aria-live` を更新

この分離により、Lit の描画完了前に DOM 後処理を走らせないようにしています。

## イベント契約

| イベント名             | 発火タイミング                              | 引数              | 備考                                    |
| ----------------- | ------------------------------------ | --------------- | ------------------------------------- |
| `before:navigate` | 遷移開始直前                               | `normalizedUrl` | cancelable。`false` 返却で中止              |
| `loading:start`   | フルナビゲーション開始                          | なし              | state-only navigation では発火しません        |
| `loading:end`     | フルナビゲーション終了                          | なし              | 成否にかかわらず finally で発火します               |
| `route:change`    | 初回以外の本文更新完了後                         | `url`           | フルナビゲーション時のみ                          |
| `content:load`    | 本文更新完了後                              | `url`           | フルナビゲーション時のみ                          |
| `after:navigate`  | 遷移処理終了時                              | `normalizedUrl` | state-only / フルの両方で発火します              |
| `error`           | イベント listener 例外時、または transition 失敗時 | `Error`         | `before:navigate` listener 例外時も流入し得ます |

### イベント順序

フルナビゲーション成功時の標準順序は次のとおりです。

```text
before:navigate
loading:start
route:change      （初回以外）
content:load
loading:end
after:navigate
```

state-only navigation 成功時は次のとおりです。

```text
before:navigate
after:navigate
```

## 履歴と状態保持

## `history.state`

router は履歴 state に次を保存します。

- `__routerUrl`: 正規化済み pathname + search + hash
- `__routerPath`: pathname

`readCurrentUrl()` はまず `history.state` を参照し、なければ `window.location` から組み立てます。

## `getHistory()`

- ルーター内部が遷移完了時に積む URL 配列です。
- `skipInitialNavigation: true` の場合、初期 URL を 1 件目として記録します。
- state-only navigation でも履歴に積みます。
- 破棄済みルーターの新規要求は履歴へ積みません。

## パラメータ・クエリ契約

## `getParams()`

現状の `getParams()` は route registry と無関係であり、次の固定規則のみを実装しています。

- `/posts/{id}` → `{ id }`
- `/posts/{category}/{id}` → `{ category, id }`
- それ以外 → `{}`

したがって、この API を一般的な動的ルート解決器として使ってはなりません。

## `getQuery()`

- 現在 URL の query を `{ [key: string]: string }` で返します。
- `wtr-session-id` は返しません。
- 同名 query の複数値は最後に列挙された値で上書きされます。

## 破棄契約

`destroy()` は次を保証します。

- `document click` / `popstate` の監視を解除する
- イベントリスナを全消去する
- 再初期化フックを全消去する
- queue を dispose する
- 内部 `aria-live` リージョンを破棄する
- 以後の `requestNavigation()` は即時完了し、実行しない

ただし、既に実行中の非同期処理そのものを中断する API ではありません。後続受付を止める契約です。

## 実装上の制約

### 1. route params 抽出は未一般化です

`addRoute()` の pattern と `getParams()` は連動していません。動的ルートを一般化する契約は未整備です。

### 2. handler 経路では head / shell が更新されません

仮想ルートを本格運用する場合、`handler` 側で head 同期戦略を別途持つ必要があります。

### 3. pending 要求の `Promise` は実行されずに resolve され得ます

逐次実行保証ではなく、latest-wins 集約です。呼び出し側が厳密な完了保証を期待すると齟齬が生じます。

### 4. shell 同期対象は `layout-header` の一部属性のみです

ページ全体の shell 一貫性を router 単体で保証する設計ではありません。

### 5. `router-core.ts` は現時点で規範対象外です

`router-core.ts` には `RouterCore` の概念スケッチがありますが、現行の `Router` 実装はそれを利用していません。本仕様の規範対象は、実際に組み込まれている `Router` 系モジュール群です。

## 将来方針

### 基本方針

router は今後、**汎用 router へ拡張するのではなく、Rouault 専用 router として契約を明示的に狭める**方針を取ります。設計上の主眼は次のとおりです。

- 汎用性の仮面を外し、Rouault 固有要件を公開契約に明示する
- route handler / fetch page / error page の結果表現を統一する
- `navigate()` の完了意味を強化し、latest-wins の結果を呼び出し側が判定可能にする
- `getParams()` のような局所的 legacy API を router 本体から段階的に追い出す
- `app-router` 統合を option の意味論として整理し、専用 router の責務境界を明瞭化する

### 将来の到達形

長期的には、公開 API を次の方向へ収束させます。

- `navigateDetailed()` の導入により、`completed` / `cancelled` / `superseded` / `failed` を区別できること
- `addDocumentRoute()` の導入により、route handler が `url` / `query` / 正規化済み URL を受け取り、本文・head・shell を同一契約で返せること
- `getParams()` を廃止するか、Rouault 固有 URL parser へ分離すること
- 文字列イベント API を維持しつつ、型付きイベント契約を併設すること
- fetch 経路と handler 経路を `DocumentSnapshot` 相当の内部モデルへ統一すること

## 移行計画

### 第 1 段階: 非破壊の明確化

既存実装を壊さず、次を先行して行います。

- 本仕様書と型コメントで、router が Rouault 専用であることを明文化する
- `addRoute()` と `getParams()` を legacy API と位置付ける
- `navigate()` の Promise が厳密な実行完了保証ではないことを明記する

この段階では主として**誤用防止と将来変更のための前提整理**を目的とします。

### 第 2 段階: 新 API の併設

既存 API を残したまま、次の新契約を追加します。

- `navigateDetailed()` を追加し、遷移結果を outcome 付きで返す
- `addDocumentRoute()` を追加し、legacy な文字列返却 handler と並行提供する
- route handler に `url` / `normalizedUrl` / `query` を渡す専用 context を導入する

この段階では**既存呼び出しを壊さずに新規コードの着地点を作る**ことを目的とします。

### 第 3 段階: 内部モデルの統一

新 API の利用が進んだ後、内部実装を段階的に寄せます。

- fetch 経路と handler 経路を `DocumentSnapshot` 相当の内部表現へ統一する
- `ContentCommitter` を snapshot ベースで動かし、head / shell / content の反映規則を一本化する
- `getParams()` の利用箇所を削減し、必要であれば専用 URL parser へ分離する

この段階では**分岐の削減とテスト容易性の向上**を目的とします。

### 第 4 段階: 実行制御の強化

最後に、ナビゲーションの意味論を強化します。

- 新規遷移要求時に in-flight fetch を中断できるようにする
- latest-wins を pending 集約だけでなく実行中ナビゲーションにも適用する
- `after:navigate` や `loading:end` に outcome 情報を載せられるようにする
- 型付きイベント API を整備する

この段階では**高頻度遷移時の一貫性と観測可能性の改善**を目的とします。

### 非推奨候補

次の API / 契約は長期的な非推奨候補とします。

- `getParams()`
- 文字列 HTML だけを返す `addRoute()` handler 契約
- handler 経路では head / shell を更新しないという特殊扱い
- outcome を返さない `navigate()` のみへ依存する呼び出し方

### 保守上の判断基準

今後の変更では、次の判断基準を採用します。

- 汎用性を高めるための抽象化より、Rouault 固有要件の明示を優先する
- 既存 API をすぐ削除せず、併設と段階移行を基本とする
- 公開 API の意味論を内部実装より先に固定する
- `router-core.ts` は実装へ採用しない限り規範対象に含めず、将来的には削除候補とする

## 利用指針

### 単体利用に向くケース

- Lit を介さず、直接 outlet を差し替える構成
- 遷移後副作用を Router 標準動作に任せたいケース

### `app-router` と組み合わせるべきケース

- 本文更新を Lit の再描画に統合したいケース
- SSR 初期本文を保持して hydration 的に遷移へ接続したいケース
- `aria-busy` や announcement をコンポーネント状態と同期したいケース

## 仕様上の不変条件

- 内部 URL は常に `LocationAdapter.normalizeUrl()` を通して扱います。
- フルナビゲーションでは `loading:start` と `loading:end` が対になります。
- `content:load` は本文反映完了後にのみ発火します。
- `destroy()` 後、クリックインターセプトは再び発生しません。
- `skipInitialNavigation: true` のとき、初回 fetch は行いません。
- `onContentUpdate` 指定時、`Router` は outlet を直接書き換えません。

## 最低限の使用例

```ts
import { Router } from './router.js';

const outlet = document.querySelector('#main-content');
if (!(outlet instanceof HTMLElement)) {
  throw new Error('outlet が必要です');
}

const router = new Router(outlet, {
  skipInitialNavigation: true,
});

router.addRoute('/virtual-route', () => {
  return '<section><h1>Virtual</h1></section>';
});

router.on('content:load', (url) => {
  console.log('loaded:', url);
});

await router.navigate('/virtual-route');
```

## `app-router` 連携例

```ts
const router = new Router(outlet, {
  skipInitialNavigation: true,
  skipAriaLiveRegion: true,
  onContentUpdate: async (html) => {
    // Lit state へ流し、描画完了後に外側で再初期化・フォーカス・告知を行います。
    setPageContent(html);
    await updateComplete;
  },
});
```

