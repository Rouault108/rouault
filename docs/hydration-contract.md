# Hydration Contract

## 1. 目的

本書は、Rouault における hydration timing と ownership を固定するための仕様です。

対象は
[`src/client.ts`](../src/client.ts),
[`src/client/hydration/scheduler.ts`](../src/client/hydration/scheduler.ts),
[`src/client/hydration/registry.ts`](../src/client/hydration/registry.ts)
および hydration 対象 component です。

## 2. source of truth

hydration trigger の決定は scheduler / registry が正本です。

- trigger の判定は `data-hydration-scope` / `data-hydration-capability` / `data-hydration-trigger`
- 起動順は scheduler が決定する
- component 自身が connected 時に hydration timing を自己決定しない
- router の `NavigationEnvelope.hydrationPlan` は route 由来 planning 情報であり、trigger 正本ではない

## 3. 実装規則

### 3.1 `src/client.ts`

[`src/client.ts`](../src/client.ts)
は bootstrap と scheduler 呼び出しだけを持ちます。

- 初期 SSR 本文の hydration は `bootstrapClient()` の初期 content hydration で行う
- SPA 遷移後本文の hydration は `app-router:navigation-committed` を契機に行う
- `app-router:content-dom-replaced` は本文 DOM 差し替え通知であり、hydration trigger の正本として使ってはならない
- state-only navigation は本文 DOM 差し替えを伴わないため、content hydration trigger にしてはならない
- `app-router:content-rendered` は廃止済みイベント名である。実装コード、テスト、hydration trigger として復活させてはならない
- `app-router:content-rendered` という旧イベント名は、廃止済み名称の説明として仕様書に記載してよいが、実行時イベントとして発火してはならない

持ってはいけない責務:

- component ごとの manual `activateHydration()` 呼び出し
- SSR/client 差分の個別自己修復

### 3.2 `registry.ts`

[`src/client/hydration/registry.ts`](../src/client/hydration/registry.ts)
は hydration contract の正本です。

- plain DOM enhancer は registry entry の `activate` で起動する
- component 固有の起動が必要なら、generic な element method 依存ではなく registry 側で明示する
- `layout-sidebar` は manual activation を不要とする
- `layout-toc-controller` は registry が timing を決めて起動する

### 3.3 component 側

component は hydration timing を自己決定しません。

許容される責務:

- hydrate 後に必要な controller 接続
- visible / interaction 後に必要な enhancer 起動

許容されない責務:

- connected 時の自動起動
- scheduler を迂回した独自 trigger 判定

## 4. SSR / client DOM

- SSR/client DOM 差分は reset で隠蔽しない
- workaround が残る場合でも、scheduler 主導の contract を壊してはならない

## 5. テスト責務

- registry / planner / state machine は `test/node/**`
- custom element の hydration observable behavior は `test/browser/**`
- SSR 出力 shape は `test/ssr/**`
- route 遷移後の統合動作は `test/e2e/**`

## 6. 受け入れ条件

次を満たすとき、本 contract は守られているとみなします。

1. `src/client.ts` が component 個別の manual activation を持たない
2. `layout-sidebar` が manual activation を要求しない
3. `layout-toc-controller` の起動 timing を scheduler / registry が決定する
4. hydration 後の observable behavior が browser test で固定される
