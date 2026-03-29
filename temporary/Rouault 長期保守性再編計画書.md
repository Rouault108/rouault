# Rouault 長期保守性再編計画書

## 0. 要約

本計画は、Rouault の長期保守性を改善するために、責務分散・ownership の混線・URL 意味論の混同・build-time と render-time の境界漏れ・契約文書と実装のずれ・test taxonomy の曖昧さを段階的に解消するための再編計画である。

本計画は、着手前に契約文書と実装の差分棚卸しを必須工程として行い、その結果を踏まえて、note navigation domain、app-router 周辺の shell 統合、search の indexing 補助と build-time 生成責務、`src/data` projection 群、Storybook / test taxonomy、Markdown 変換系の metadata / parser core / validation context の順に再編する。

本計画の基本方針は次の 3 点である。

1. 既に良い ownership を持つ core は壊さない
2. ownership の統合と物理統合を混同しない
3. 契約文書と実装の差分を未棚卸しのまま再設計に着手しない

---

## 1. 目的

本計画の目的は、Rouault 全体について次を達成することである。

1. 着手前に契約文書と実装の差分を棚卸しし、各再編の判断基準を固定する
2. note navigation に属する ownership を 1 つの domain に集約する
3. router core と shell 統合層の責務境界を明確化する
4. search の core / pipeline / source / UI 分離を維持したまま、indexing 補助の責務漏れを解消する
5. `src/data` に散り始めた source normalization・intrinsic enrichment・page-specific projection の境界を整理する
6. Storybook と test の既存 taxonomy を正規化し、living spec としての役割を明示化する
7. Markdown 変換系は ownership を維持したまま、metadata / parser core / validation context を分離し、その後に parser 本体だけを将来置換対象として切り出す

---

## 2. 非目的

本計画は次を目的としない。

### 2.1 巨大 util への物理統合

ownership の統合は、単一の巨大 util へ全規則を押し込むことを意味しない。  
特に、note page navigation URL と search の `DocumentCanonicalUrl` / `SearchStateUrl` を 1 個の巨大 URL 正規化 util に統合しない。

### 2.2 良い ownership を持つ core の破壊

`src/lib/router/*` の router core や、search の core / pipeline / source 分離のように、既に良い ownership を持つ箇所は維持する。  
本計画は、広範な全面作り直しではなく、責務漏れと統合層の置き場所の修正を優先する。

### 2.3 UI コンポーネントへの意味論再配置

UI コンポーネントを意味論の source of truth にしない。  
ただし、DOM 境界で外部入力を受けるコンポーネントは defensive validation / defensive parse を持ってよい。

### 2.4 Markdown の全面再設計先行

Markdown 変換系は今すぐ全面再設計しない。  
ownership を維持したまま、shared / registry / validation を整理し、その後に parser 本体だけを将来置換対象として扱う。

---

## 3. 固定する設計原則

### 3.1 ownership の統合と物理統合は別概念とする

論理的に同じ domain に属する責務は同じ ownership に集約する。  
ただし、実装上それらを単一ファイル・単一 util へ押し込むことは必須ではない。

### 3.2 URL family を混同しない

次の URL family は別概念として維持する。

- note page navigation URL
- fetch target URL
- search の `DocumentCanonicalUrl`
- search の `SearchStateUrl`

名前が似ていても、意味論・ownership・利用地点を統合しない。

### 3.3 build-time と render-time の境界を守る

source normalization、projection、indexing 補助、検索カタログ生成など build-time で確定すべきものは build-time へ寄せる。  
UI は表示と操作へ集中し、前処理や意味論を抱え込まない。

### 3.4 仕様書が先、実装が後

大きな意味論変更は仕様書を先に更新し、その後に実装とテストを追従させる。  
実装先行で仕様を既成事実化しない。

### 3.5 既存の良い分解を壊さない

再編の目的は「全部を作り直すこと」ではなく、「現在すでに良い分解を持つ部分を守りながら、境界漏れだけを塞ぐこと」である。

---

## 4.1 最優先: note navigation domain の ownership 集約

### 4.1.1 対象

- `src/data/notes.ts`
- `src/layouts/NoteLayout.11ty.ts`
- `lib/content/build-sidebar-tree.ts`
- `lib/content/build-breadcrumbs.ts`
- `lib/content/navigation-labels.ts`
- `src/components/layout/layout-sidebar.ts`
- `src/components/ui/file-tree/file-tree.ts`
- `src/lib/trailing-slash-rewrite.ts`
- 新設:
- `lib/content/navigation/**`

### 4.1.2 背景

Rouault では、`rawSlug` / `slug` / `permalink` / `TreeNode.id` / breadcrumb / trailing slash の責務分担は契約上かなり明示されている。

しかし現行計画の書き方では、
- `src/data/notes.ts`
- note navigation domain
- `NoteLayout.11ty.ts`
の 3 者のうち、どこが source normalization を持ち、どこが navigation rule を持ち、どこが page 用 view model を持つのかがまだ粗い。

この粗さを残したまま ownership 集約を進めると、`notes.ts` から view model が再肥大化するか、逆に note-navigation 側へ page projection が流入する。

### 4.1.3 方針

note navigation domain は、**note page navigation に固有の純粋規則**だけを所有する。

ここでいう純粋規則とは、少なくとも次を指す。

- `slug` / `permalink` / `directory-index` の navigation 意味論
- sidebar node identity
- directory label resolution
- breadcrumb generation
- sidebar tree generation
- note page navigation URL normalization
- current note に対応する selected node の導出

一方で、note-navigation domain は次を所有しない。

- source note の読込
- cover / toc / search 補助メタの生成
- page レイアウト専用の最終 view model 組み立て
- DOM コンポーネント固有の defensive parse 以外の UI 意味論

### 4.1.4 想定構成

```text
lib/content/navigation/
normalize-note-path.ts
sidebar-node-id.ts
build-sidebar-tree.ts
build-breadcrumbs.ts
resolve-navigation-label.ts
resolve-sidebar-root.ts
normalize-note-navigation-url.ts
build-note-navigation-model.ts
types.ts
index.ts
```

補足:

* note navigation domain は build-time content logic として `lib/content/**` 配下に置く
* `src/lib/**` は client runtime 側の実装を主対象とし、note page navigation の build-time 規則を新規配置しない
* 既存の `lib/content/build-sidebar-tree.ts`、`lib/content/build-breadcrumbs.ts`、`lib/content/navigation-labels.ts` は段階的に `lib/content/navigation/**` へ統合する

### 4.1.5 やること

* `src/data/notes.ts` は source normalization、metadata 正規化、公開ルート衝突検査、note intrinsic data の確定に集中する
* `_config.json` に由来する `sidebar.scope` などの source configuration 継承解決は `src/data/notes.ts` 側に残す
* sidebar / breadcrumb / selectedId / directory label 解決 / note page navigation URL normalization は `lib/content/navigation/**` へ集約する
* `resolveSidebarRoot` は raw config を読まず、`src/data/notes.ts` が正規化済みで渡す sidebar scope 情報だけを入力として扱う
* `build-note-navigation-model.ts` を新設し、navigation domain の公開 entrypoint とする
* `NoteLayout.11ty.ts` は `build-note-navigation-model(...)` の結果を受け取り、描画用 view model の利用に集中する
* `layout-sidebar.ts` は meaning source から外し、DOM 境界の defensive validation のみを残す
* `TreeNode.id` は navigation domain の内部安定識別子として扱い、公開 URL や search 識別子と混同しない

### 4.1.6 やらないこと

* search 側の `DocumentCanonicalUrl` / `SearchStateUrl` を note navigation 側へ吸収しない
* `src/data/notes.ts` を sidebar / breadcrumb view model の SoT にしない
* 単一巨大 URL 正規化 util を SoT にしない
* note-navigation domain に page-specific projection を持ち込まない

### 4.1.7 完了条件

* `slug` / `permalink` / `TreeNode.id` / 表示ラベルの役割分担がコード上でも分離されている
* breadcrumb / sidebar のラベル解決規則が単一 source of truth に収束している
* `src/data/notes.ts` は navigation view model を直接返さない
* `NoteLayout.11ty.ts` は navigation rule を再実装していない
* trailing slash 補完が note page navigation URL の canonical form を書き換えていない

---

## 4.2 第2優先: router core は維持しつつ、app 固有 glue を core から退避する

### 4.2.1 対象

* `src/lib/router.ts`
* `src/lib/router/*`
* `src/components/app/app-router.ts`
* `src/components/app/controllers/app-router-content-controller.ts`
* `src/components/app/controllers/app-router-post-render-controller.ts`
* `src/lib/controllers/router-controller.ts`
* `src/lib/tabs/primary-tab-navigation-policy.ts`
* `src/lib/tabs/url-state.ts`
* 新設:
  * `src/components/app/shell/layout-header-shell-adapter.ts`
  * `src/components/app/navigation/primary-tab-navigation-policy.ts`

### 4.2.2 背景

router core 自体はかなり良く分解されている。  
問題は 2 層に分かれる。

1. `app-router.ts` が layout-header 固有の属性 JSON 解釈や shell adapter 相当の処理を抱えていること
2. `src/lib/router.ts` 側にも、primary tab 向け policy や app 固有の default glue が残り、core package の公開面に app 固有都合がにじんでいること

したがって、修正対象は `app-router.ts` だけではない。  
router core の公開面から app 固有 glue を退避し、core・任意統合・app 具体実装の境界を揃える必要がある。

### 4.2.3 方針

router core は純粋な core のまま維持する。  
ただし、`app-router.ts` を薄くするだけでは不十分であり、`src/lib/router.ts` に残る app 固有 export、primary tab 向け glue、URL state policy の既定配線も app 側へ退避する。

core が所有するのは、あくまで次に限る。

* navigation queue
* document route / fetch の統一
* durable commit
* outcome / issue / degraded の結果モデル
* shell adapter / URL state policy / post-commit controller を受け入れるための抽象境界

一方で次は core が所有しない。

* layout-header 固有の属性 JSON 解釈
* primary tab 固有の URL state policy の具体実装
* app shell 前提の default adapter / default policy 配線

### 4.2.4 やること

* `src/components/app/app-router.ts` は router 起動、`<main>` 反映、最小限のアプリ統合だけに縮小する
* `src/components/app/shell/layout-header-shell-adapter.ts` を新設し、`layout-header` 向け shell adapter を移す
* `src/components/app/navigation/primary-tab-navigation-policy.ts` を新設し、primary tab 向け URL state policy の具体実装を app 側へ移す
* `parseBreadcrumbs`、`parseCorpora`、`createLayoutHeaderShellAdapter` のような layout-header 固有処理を app-router から外す
* `src/lib/router.ts` から app 固有 default export / default glue を除去し、core の公開面を router 契約に必要な抽象境界へ寄せる
* `src/lib/tabs/primary-tab-navigation-policy.ts` と `src/lib/tabs/url-state.ts` は、core に残すべき抽象と app 側へ退避すべき具体実装を分離する
* router core は shell 具体実装や primary tab 具体挙動への直接依存を持たないまま維持する

### 4.2.5 完了条件

* `app-router.ts` が layout-header 固有 adapter の実装詳細を持っていない
* `src/lib/router.ts` の公開面が app 固有 default glue を含まず、core 抽象として読める
* primary tab 向け URL state policy の具体実装が app 側へ退避している
* shell adapter / URL state policy / post-commit 統合が app 側の任意統合として明示されている
* router core から shell 具体実装依存および app 固有挙動依存が除去されている
* router の unit / ssr 境界テストが core と統合層を区別している

---

## 4.3 第3優先: search の責務漏れ是正と search-core の段階分離本格実施

### 4.3.1 対象

- `src/lib/search/search-core.ts`
- `src/lib/search/query-preprocessor.ts`
- `src/lib/search/document-url.ts`
- `src/lib/search/search-url.ts`
- `src/lib/search/navigation.ts`
- `src/lib/search/diagnostics.ts`
- `src/lib/search/search-snippet.ts`
- `src/lib/search/search-types.ts`
- `src/lib/search/search-catalog.ts`
- `src/lib/search/pagefind-search.ts`
- `src/lib/search/ranking/*`
- `src/lib/search/tokenization/*`
- `src/lib/search/sources/*`
- `src/lib/search/bootstrap.ts`
- `src/components/search/search-page.ts`
- `src/components/ui/search-dialog/search-dialog.types.ts`
- 必要最小限で `src/components/ui/search-dialog/search-dialog.ts`
- `src/data/searchCatalog.ts`
- `src/layouts/NoteLayout.11ty.ts`
- `src/tags.11ty.ts`
- 必要に応じて `src/search.11ty.ts`
- `eleventy.config.ts`
- 新設:
  - `src/lib/search/build/*`
  - `src/lib/search/indexing/*`
  - `src/lib/search/core/*`
  - `src/lib/search/core/stages/*`

補足:

* `src/components/ui/search-dialog/*` 全体は search domain の再設計対象ではない
* search dialog は汎用 UI component として維持し、search 側の対象は `searcher` 入出力契約と接続面に限定する
* UI internals の selection model、virtualizer、highlight などを search domain 側へ吸収しない

### 4.3.2 背景

検索仕様は、`search-core` を中心に次の 6 段階を持つ構成を要求している。

1. query preparation
2. source federation
3. candidate validation
4. candidate merge
5. ranking and sorting
6. counts and diagnostics

また仕様上、検索ダイアログと検索結果ページは同一 `search-core` を利用し、`search-core` は上記 6 段階を順にオーケストレーションする中核であって、個別 tokenizer 実装、source ごとの API 解釈詳細、候補統合詳細、ランキング詳細、件数算出詳細、診断生成詳細を 1 モジュールへ抱え込んではならない。

しかし現行実装では、少なくとも次の問題が残っている。

1. indexing 専用 tokenization と Pagefind 補助テキスト生成が `NoteLayout.11ty.ts` 側へ漏れている
2. search catalog 生成責務が `src/data/searchCatalog.ts` と `eleventy.config.ts` に分散している
3. `/search-catalog.json` が開発時供給と本番時静的生成で別 ownership になっており、本番生成責務が弱い
4. `search-core` が orchestration を超えて merge / rank / counts / diagnostics の実装詳細を抱えている
5. `pagefind-search.ts` のような facade が UI 入口ごとの API 面を増やしている
6. `src/lib/search/search-catalog.ts` が catalog load / normalize に加え dialog item 変換を抱え、source loader と UI adapter の境界をまたいでいる
7. `src/tags.11ty.ts` が explore 初期レスポンスを手組みしており、検索レスポンス構成責務が search domain の外へ漏れている
8. query 側 tokenization と field / indexing 側 tokenization の境界が不十分である

この状態は、検索仕様が要求する責務分離に対して部分準拠ではあるが、長期保守性の観点では未完である。

### 4.3.3 方針

search domain は、**build-time artifact、query pipeline、indexing kernel、source adapter、core stage pipeline、UI adapter** の 6 領域へ再編する。

ただし、これは検索仕様に定義された 3 層構成を内部実装上さらに分解するものであり、仕様上の ownership を変更することを意味しない。

ここで固定する基本原則は次のとおりとする。

1. `search-core` は 6 段階の統括と `SearchResponse` 構成だけを持つ
2. `query-preparation` は tokenizer policy 選択を引き続き所有する
3. `indexing/*` は query 側と field 側で共有される tokenization kernel を所有する
4. `build/*` は `/search-catalog.json`、Pagefind 補助テキスト、`/search` および `/tags/<tag>/` の静的初期 state / response を含む build-time artifact の生成本体を単一に所有する
5. `pagefind-source` と `catalog-source` は、検索仕様が source に割り当てている source-local 正規化責務および source-local 契約検証責務を所有する
6. `candidate-validation` stage は、source module が返した正規化済み `SearchSourceBatch` に対する**source 横断の共通不変条件**だけを担い、source-local 契約違反の解釈本体を再所有しない
7. UI は `SearchResponse` の表示と操作に集中し、検索意味論を持たない
8. `eleventy.config.ts` は build-time artifact 生成の本体を持たず、配線だけを持つ
9. `src/data/searchCatalog.ts` は search domain の build helper を呼ぶ薄い bridge に縮小するか、不要なら削除する
10. `/search` と `/tags/<tag>/` の初期 payload は template ごとに手組みせず、search domain の公開 build helper からのみ生成する

その上で、`search-core` は次の責務だけを持つ薄い統括層へ縮小する。

- 検索要求の受理
- mode ごとの差異注入
- 6 段階の順次実行
- failures / diagnostics の集約
- 最終 `SearchResponse` の構成

一方、次は `search-core` が所有しない。

- tokenizer 実装の本体
- Pagefind 補助テキスト生成
- `/search-catalog.json` 生成
- `/search` および `/tags/<tag>/` の静的初期 payload 生成
- 個別 source API 形式の解釈詳細
- source-local 正規化詳細
- source-local 契約違反の解釈本体
- ranking / sorting の個別アルゴリズム
- counts / diagnostics の個別アルゴリズム
- UI ごとの facade
- DOM 操作および URL state 表示ロジック

### 4.3.4 想定構成

```text
src/lib/search/
  build/
    build-search-catalog.ts
    build-pagefind-document-data.ts
    build-static-explore-response.ts
    emit-search-artifacts.ts

  indexing/
    tokenize-text.ts
    field-tokenizers.ts
    catalog-keywords.ts
    pagefind-aux-text.ts

  core/
    search-core.ts
    profiles.ts
    stage-types.ts
    stages/
      query-preparation.ts
      source-federation.ts
      candidate-validation.ts
      candidate-merge.ts
      ranking-and-sorting.ts
      counts-and-diagnostics.ts

  sources/
    pagefind-source.ts
    catalog-source.ts
    source-types.ts

  document-url.ts
  search-url.ts
  navigation.ts
  search-snippet.ts
  search-types.ts
```

補足:

* `build/*` は build-time artifact 生成および静的初期レスポンス組み立てを所有する
* `indexing/*` は shared tokenization kernel を所有するが、query 側 policy 選択は所有しない
* `core/stages/*` は検索仕様書の 6 段階を物理モジュールとして表現する
* `sources/*` は raw API payload をそのまま返さず、source-local に正規化された `SearchSourceBatch` を返す
* ただし source は final merged result や UI item を返さない
* UI は `search-core` の公開レスポンス表示に集中し、検索意味論を持たない

### 4.3.5 やること

#### A. indexing kernel の独立

* `tokenizeSearchText` の実装本体を `indexing/*` へ移し、`query-preprocessor.ts` は query 専用 façade として薄くする
* `field-tokenizers.ts` を `indexing/*` 配下の正式モジュールへ移す
* query 側 tokenization と field / indexing 側 tokenization の責務を分離する
* tokenizer policy 選択は `query-preparation` stage が引き続き所有し、shared kernel へ委譲する
* `query-preprocessor.ts` は `prepareSearchQuery(...)` と query 正規化の公開入口に縮小する

#### B. build-time artifact の ownership 回収

* `src/layouts/NoteLayout.11ty.ts` から Pagefind 補助テキスト構築ロジックを除去する
* `src/data/searchCatalog.ts` から keyword 構築本体を除去し、必要なら build helper を呼ぶ薄い bridge に縮小する
* 必要がなければ `src/data/searchCatalog.ts` は削除して `src/lib/search/build/*` へ統合してよい
* `/search-catalog.json` 生成本体を `src/lib/search/build/*` へ移す
* `eleventy.config.ts` は「いつ生成するか」「どこへ出力するか」「開発時にどう配信するか」の配線だけを持つ
* build 後 artifact として `/search-catalog.json` の静的出力存在確認を必須検証対象へ加える
* 開発時 middleware と本番時静的出力で、artifact 生成ロジックが二重実装にならないよう統一する

#### C. source adapter の縮小と正規化責務の固定

* `pagefind-source.ts` は Pagefind モジュールロード、検索実行、結果正規化、件数取得、件数取得可否報告に集中する
* `catalog-source.ts` は catalog fetch、JSON 読込、項目正規化、`path` からの `DocumentCanonicalUrl` 導出、`url` 検証、`path` / `url` 同一文書性検証、補完一致判定に集中する
* `search-specification.md` が source に割り当てている source-local 責務は source module 側へ明示的に残す
* source module は raw API payload も final merged response も返さず、source-local に正規化された `SearchSourceBatch` を返す
* source module は source-local 契約違反の確定、source-local 候補破棄、source 単位 failure の確定を所有する
* `candidate-validation` stage は source module が返した `SearchSourceBatch` に対して、URL family の共通不変条件、stage 帰属、merge 前の共通妥当性確認だけを担う
* source-local 契約違反の判定本体を `candidate-validation` stage へ再実装しない
* `src/lib/search/search-catalog.ts` から dialog item 変換責務を除去し、catalog load / normalize 専用モジュールへ縮小する
* source module から `UiSearchDialogItem` 依存を除去する

#### D. core stage pipeline の本格分離

* `search-core.ts` を 6 段階 pipeline の統括層へ縮小する
* query preparation
* source federation
* candidate validation
* candidate merge
* ranking and sorting
* counts and diagnostics

以上 6 段階を個別 module として新設または再配置する。

* `candidate-validation` stage は source 間で共通の URL family 不変条件、共通妥当性確認、issue / failure の段階帰属を担う
* `candidate-validation` stage は source-local 契約の解釈本体、source-local 候補破棄規則、source ごとの API 形式解釈を担わない
* `candidate-merge` stage は `canonicalUrl` 単位の統合と採用 `url` 決定だけを担う
* `ranking-and-sorting` stage は feature 抽出、score 計算、安定化ソートを所有する
* `counts-and-diagnostics` stage は `explore` 用件数算出、`issues` 集約、`activeSources` 導出、`degraded` 導出を所有する
* `search-core.ts` から merge / score / sort / counts / diagnostics の実装本体を除去する
* 各段階は明示的な input / output / failure boundary を持つ
* 後段は前段の公開出力だけに依存し、前段内部状態へ依存しない
* `navigate` / `explore` の差異は段階ごとの設定値または ranking profile として注入する

#### E. UI adapter の単一化

* `src/components/search/search-page.ts` は `pagefind-search.ts` 経由ではなく `search-core` を直接利用する
* 検索ダイアログと検索結果ページは同一 core API を用いる
* `pagefind-search.ts` の facade は削除する
* `bootstrap.ts` は dialog 起動、dialog searcher 接続、navigation adapter 接続に限定する
* `src/components/ui/search-dialog/search-dialog.ts` は generic UI component として維持し、検索意味論を持ち込まない
* `search-dialog.types.ts` は検索側が依存してよい最小契約とし、検索固有の意味論は `SearchResponse` 側で閉じる

#### F. SSR / 静的初期レスポンス責務の回収

* `src/tags.11ty.ts` から explore 初期レスポンスの手組みロジックを除去する
* タグページ用の初期 `SearchResponse` 構成は `src/lib/search/build/build-static-explore-response.ts` のような search domain 配下の build helper へ移す
* `src/search.11ty.ts` が存在する場合、空検索または初期検索状態に対応する初期 payload も同じ build helper 群から受け取る
* `src/tags.11ty.ts` は tag 固有 input を渡し、結果 JSON を埋め込むだけに縮小する
* `src/search.11ty.ts` は search 固有 input を渡し、結果 JSON を埋め込むだけに縮小する
* `/search` と `/tags/<tag>/` の初期 state / response 生成経路が search domain の公開 build helper に収束するようにする
* template 側が `SearchResponse` 契約を独自再実装しない
* 初期 payload の shape は search domain の build helper と SSR test が単一に固定し、template 側で分岐追加しない

#### G. テスト構造の再編

* stage 単位の unit test を追加する
* build artifact 単位の SSR test を追加する
* `/search-catalog.json` の静的出力と JSON shape を固定する test を追加する
* `src/tags.11ty.ts` で用いる初期 explore response builder の SSR test を追加する
* degraded / failures / issues の導出を stage 境界に沿って固定する
* `search-core` の統合テストと、各 stage の単体テストを分離する
* ranking regression fixture を導入し、並び順変更を明示的に検知できるようにする
* URL 正規化、issue ordering、count map、tag filter の決定性を property-based test または境界値 test で固定する
* legacy facade 由来のテストは削除または統合テストへ移す

### 4.3.6 重要境界

* note page navigation URL の正規化は note navigation domain が所有する
* `DocumentCanonicalUrl` / `SearchStateUrl` / `pathLabel` は search domain が所有する
* search URL state は feature-local URL state として search 側が単一に所有し、router core へ吸収しない
* `/search-catalog.json` 生成、Pagefind 補助テキスト生成、indexing tokenization、`/search` および `/tags/<tag>/` の静的初期 payload 生成は search domain の build-time 責務とする
* `src/data/searchCatalog.ts` は search domain build helper の bridge を超える ownership を持たない
* `query-preparation` は tokenizer policy 選択を所有する
* `indexing/*` は shared tokenization kernel を所有する
* `pagefind-source` / `catalog-source` は source-local 正規化責務と source-local 契約検証責務を持つが、最終 merged result や UI item 構成は持たない
* `candidate-validation` stage は source 横断の共通不変条件だけを扱い、source-local 契約の解釈本体を持たない
* UI component は検索意味論の source of truth にならない
* search dialog component 自体は generic UI として維持し、search domain 再編の都合で内部構造を巻き込まない
* note navigation URL と search URL family は統合しない

### 4.3.7 やらないこと

* note navigation URL と `DocumentCanonicalUrl` / `SearchStateUrl` を統合しない
* router core に search state ownership を移さない
* `eleventy.config.ts` を search artifact 生成本体の置き場にしない
* `search-core` を巨大 util として再編しない
* `pagefind-source` / `catalog-source` の source-local 責務を無理に `candidate-validation` stage へ吸収しない
* UI component に検索意味論を再配置しない
* `src/tags.11ty.ts` や template 側で `SearchResponse` を手組みし続けない
* build-time 責務と runtime 責務を再び混在させない
* search dialog の generic UI internals を search domain の SoT にしない

### 4.3.8 完了条件

* `src/layouts/NoteLayout.11ty.ts` が検索 tokenizer または indexing helper を直接 import していない
* `src/data/searchCatalog.ts` が search domain build helper の薄い bridge に縮小している、または削除されている
* `eleventy.config.ts` が orchestration として読め、artifact 生成本体を抱え込んでいない
* build 後の静的出力に `/search-catalog.json` が存在することが検証手順とテストで固定されている
* `/search` および `/tags/<tag>/` の初期 payload 生成責務が search domain 配下の build helper に収束している
* `pagefind-source.ts` / `catalog-source.ts` が source-local 正規化責務と source-local 契約検証責務だけを持ち、UI item 変換や final merged response 構成を持っていない
* `src/lib/search/search-catalog.ts` から `UiSearchDialogItem` 依存が除去されている
* `search-core.ts` が 6 段階 orchestration だけを持つ
* query / indexing / source / validation / merge / rank / counts / diagnostics の境界がコード上で物理分離されている
* `candidate-validation` stage が source-local 契約違反の解釈本体を再実装していない
* `src/components/search/search-page.ts` と検索ダイアログが同一 core API を利用している
* `pagefind-search.ts` が削除されている
* `src/tags.11ty.ts` と `src/search.11ty.ts` が `SearchResponse` を手組みしていない
* degraded / failures / issues の導出規則が stage 単位テストおよび統合テストで固定されている
* ranking order、URL 正規化、issue ordering、count map の決定性がテストで固定されている
* search URL と note navigation URL の正規化責務が明確に分離されている

---

## 4.4 第4優先: `src/data` projection 群の一括是正

### 4.4.1 対象

- `src/data/notes.ts`
- `src/layouts/NoteLayout.11ty.ts`
- `src/data/home.ts`
- `src/data/tagPages.ts`
- `src/data/corpusPages.ts`
- `src/data/corporaOverview.ts`
- 必要に応じて新設:
  - `src/data/projections/note-page-projection.ts`
  - `src/data/projections/home-page-projection.ts`
  - `src/data/projections/tag-page-projection.ts`
  - `src/data/projections/corpus-page-projection.ts`
  - `src/data/projections/corpora-overview-projection.ts`

補足:

* `src/data/searchCatalog.ts` は本節の projection ownership へ含めない
* search catalog の build-time projection および emit は search domain が所有する
* 本節は `src/data` に残すべき責務と、page-specific projection として切り出すべき責務を一括で確定する
* 本節では、projection 間 shared helper を初手から常設前提にしない
* 共有 helper の抽出は、複数 projection に同一の**表示専用**規則が現れた場合にのみ許可する

### 4.4.2 背景

ここは設計破綻ではない。  
ただし、現行構成では `src/data/notes.ts` を source normalization の入口と呼ぶだけで、次の 3 層が物理構成としてはまだ分離し切れていない。

1. source normalization
2. note intrinsic enrichment
3. page-specific projection

この区別を文書上だけでなくコード上でも一括で固定しない限り、次の再流入が起きやすい。

- `notes.ts` への page 専用派生値の再流入
- `home.ts` / `tagPages.ts` / `corpusPages.ts` / `corporaOverview.ts` ごとの独自正規化再実装
- `NoteLayout.11ty.ts` への view model 組み立て責務の残留
- projection helper を口実とした新しい巨大 util の再形成
- note navigation domain や search domain が所有すべき意味論の projection 層への横滑り

漸進導入は局所的には安全であるが、長期保守性の観点では ownership の確定が遅れ、最終形がコード構成へ反映されるまでの期間が長くなる。  
本節では、`src/data` の責務境界をこの段階で一括確定し、暫定構成を残さないことを優先する。

### 4.4.3 方針

`src/data/notes.ts` は **source normalization と note intrinsic enrichment の単一入口** に固定する。  
page ごとの派生値は **すべて** `src/data/projections/*` が所有する。

ここでいう source normalization と note intrinsic enrichment とは、少なくとも次を指す。

- note metadata の正規化
- `rawSlug` / `slug` / `permalink` の確定
- 公開ルート衝突検査
- note kind / content kind の確定
- testingArea / sidebarRoot / sidebar icon context の確定
- toc / cover など note 実体に内在する build-time 派生値の確定
- reader-facing / search / home / tags / corpora など surface policy に基づく可視性判定の基礎データ確定

一方、次は page-specific projection が所有する。

- note page レイアウト用の最終 view model 組み立て
- home 用一覧派生
- tag page 用一覧派生
- corpus page 用一覧派生
- corpora overview 用派生
- summary、date label、display list item など page / screen 固有の build-time 派生

ただし、page-specific projection は他 domain の ownership を再所有しない。  
特に、次は projection 層が所有しない。

- sidebar tree / breadcrumb / selected node / directory label 解決
- note page navigation URL normalization
- `DocumentCanonicalUrl` / `SearchStateUrl` / search 用 `pathLabel`
- Pagefind 補助テキスト生成
- `/search-catalog.json` 生成
- `SearchResponse` 構成
- route collision 検査
- source file 読込
- source configuration 継承解決

本節では「必要に応じて projection を増やす」という方針を取らない。  
長期保守性の観点から、**現時点で page-specific projection と認識できるものは一度に物理分離する**。

また、本節では search catalog 用 projection を `src/data` 側に持ち込まない。  
search catalog は検索仕様に従う search domain の build-time artifact であり、`src/data` projection 群の ownership へ再流入させない。

### 4.4.4 想定構成

```text
src/data/
  notes.ts
  home.ts
  tagPages.ts
  corpusPages.ts
  corporaOverview.ts
  projections/
    note-page-projection.ts
    home-page-projection.ts
    tag-page-projection.ts
    corpus-page-projection.ts
    corpora-overview-projection.ts
```

構成原則:

* `notes.ts` は source normalization / intrinsic enrichment のみを所有する
* `notes.ts` は stable な公開型として `IntrinsicNote`、`IntrinsicNotesCollection`、必要最小限の intrinsic 関連型だけを外部公開する
* page-specific projection は `notes.ts` の内部 shape ではなく、公開された intrinsic 型だけを入力に取る
* 各 projection は `ProjectionInput` / `ProjectionOutput` を明示し、暗黙的な構造共有を禁止する
* `home-page-projection.ts`、`tag-page-projection.ts`、`corpus-page-projection.ts` は **leaf projection** とする
* `corpora-overview-projection.ts` は **composition projection** とし、leaf projection の公開出力のみを合成してよい
* leaf projection 同士は相互 import してはならない
* `home.ts` / `tagPages.ts` / `corpusPages.ts` / `corporaOverview.ts` は、最終的に projection entrypoint を呼ぶ薄い bridge としてのみ存在してよい
* bridge を残す意味がない場合、同一変更で削除して import 側も projection entrypoint へ切り替える
* projection 間 shared helper は原則として新設しない
* 共有 helper が必要になった場合も、文字列整形・日付整形・配列整形などの**表示専用 helper** に限り、責務別に小さく抽出する
* shared helper に source normalization、navigation rule、search rule、surface policy、route collision 検査を持ち込まない
* search catalog 系 helper はこの構成へ含めない

### 4.4.5 やること

* `notes.ts` は source normalization、intrinsic enrichment、公開ルート衝突検査に集中する

* `notes.ts` から page-specific projection を返さない

* `notes.ts` は projection 層が依存してよい stable 公開型だけを明示し、内部都合の補助 shape を外部へ露出しない

* `note-page-projection.ts` を新設し、`IntrinsicNote`、note navigation domain の公開結果、必要最小限の layout input を受けて `NoteLayout.11ty.ts` 用 view model を組み立てる

* `note-page-projection.ts` は sidebar tree / breadcrumb / selected node / note page navigation URL normalization を自前計算しない

* `note-page-projection.ts` は Pagefind 補助テキストや検索 build-time artifact を生成しない

* `note-page-projection.ts` は 4.1 の navigation domain および 4.3 の search domain の公開結果を**受け取って合成するだけ**に留める

* `home-page-projection.ts` を新設し、home 一覧に必要な summary / date label / genre / 表示用一覧項目を build-time projection として組み立てる

* `home-page-projection.ts` は note intrinsic data の再正規化、surface policy の再判定、navigation label 解決の再実装を持たない

* `tag-page-projection.ts` を新設し、tag 単位の note grouping と表示順決定を projection 層へ移す

* `tag-page-projection.ts` は tag page 表示用の domain data を返すが、`SearchResponse`、`DocumentCanonicalUrl`、`SearchStateUrl`、diagnostics、search count map を構成しない

* `/tags/<tag>/` の初期検索 payload 構成は search domain が所有し、`tag-page-projection.ts` はその ownership を再取得しない

* `corpus-page-projection.ts` を新設し、corpus key 導出、label 解決、一覧生成、navigation item 生成を projection 層へ移す

* `corpus-page-projection.ts` は corpus page 専用の表示派生のみを持ち、他 projection の helper 的中継点にならない

* `corpora-overview-projection.ts` を新設し、overview 集約値と recent notes 組み立てを projection 層へ移す

* `corpora-overview-projection.ts` は composition projection とし、leaf projection の公開出力または `IntrinsicNotesCollection` を合成してよい

* `corpora-overview-projection.ts` は leaf projection の内部 helper や内部型へ直接依存しない

* `home.ts` / `tagPages.ts` / `corpusPages.ts` / `corporaOverview.ts` は projection entrypoint を呼ぶ薄い bridge に縮小するか、不要なら削除する

* `NoteLayout.11ty.ts` は `note-page-projection.ts` が返す view model の利用に集中し、独自の view model 組み立てを持たない

* `NoteLayout.11ty.ts` は note navigation rule や検索 build-time artifact 生成を再実装しない

* projection 間で同一の表示専用規則が 2 か所以上に現れた場合のみ、shared helper を新設してよい

* その場合も shared helper は責務別に小分けし、`shared-projection-helpers.ts` のような雑多な単一ファイルを SoT にしない

* shared helper は「文字列整形」「日付整形」「配列整形」のような表示専用補助だけを所有し、domain rule の集積場所にしない

* 検索カタログの build-time projection は search domain に残し、`src/data` へ戻さない

### 4.4.6 重要境界

* `slug` / `permalink` / note intrinsic metadata は `notes.ts` が所有する
* sidebar tree / breadcrumb / selected node / directory label / note page navigation URL normalization は note navigation domain が所有する
* `DocumentCanonicalUrl` / `SearchStateUrl` / search 用 `pathLabel` / `SearchResponse` / Pagefind 補助テキスト / `/search-catalog.json` は search domain が所有する
* projection 層は intrinsic data を page family ごとの表示モデルへ変換するが、他 domain の規則本体を所有しない
* `tag-page-projection.ts` は `/tags/<tag>/` の表示補助を返してよいが、検索意味論の source of truth になってはならない
* `NoteLayout.11ty.ts` は projection 利用層であり、projection・navigation・search の SoT になってはならない

### 4.4.7 やらないこと

* `notes.ts` を page 専用 view model の SoT にしない
* `note-page-projection.ts` に navigation rule を再配置しない
* `note-page-projection.ts` に search build-time artifact 生成を再配置しない
* `tag-page-projection.ts` で `SearchResponse` を手組みしない
* projection 層で `DocumentCanonicalUrl` / `SearchStateUrl` の意味論を再定義しない
* `shared-projection-helpers.ts` のような巨大 helper 前提で物理統合しない
* leaf projection 同士を相互依存させない
* `corpora-overview-projection.ts` を leaf projection の内部 helper 集約点にしない
* search catalog 系 projection を `src/data` 配下へ戻さない
* page-specific projection を `NoteLayout.11ty.ts` や各 entry module へ再流入させない

### 4.4.8 完了条件

* source normalization、intrinsic enrichment、page-specific projection が文書上もコード上も分離されている
* `notes.ts` が page-specific projection を直接返さない
* `notes.ts` の公開面が stable な intrinsic 型に限定され、projection が内部 shape に暗黙依存していない
* `note-page-projection.ts` が `NoteLayout.11ty.ts` 用の明示的 build-time projection として読める
* `note-page-projection.ts` が navigation rule と search build-time artifact を再実装していない
* `home-page-projection.ts`、`tag-page-projection.ts`、`corpus-page-projection.ts` がそれぞれ単一 page family の leaf projection module として読める
* `corpora-overview-projection.ts` が composition projection として読め、leaf projection と循環依存していない
* projection 層が source 読込、route collision 検査、note kind 確定、surface policy 確定を再実装していない
* `tag-page-projection.ts` が `SearchResponse`、diagnostics、search URL state を返していない
* `home.ts` / `tagPages.ts` / `corpusPages.ts` / `corporaOverview.ts` が bridge 以上の ownership を持たないか、削除されている
* `NoteLayout.11ty.ts` が page 固有 view model の最終組み立てを再実装していない
* shared helper が存在する場合でも、表示専用 helper に限定され、domain rule の寄せ集めになっていない
* search catalog 系 projection が `src/data` 配下へ再流入していない
* page ごとの表示派生が `src/data/projections/*` に収束し、`src/data/*` の各 entry module が再び独自正規化を抱え込んでいない

---

## 4.5 第5優先: Storybook / test taxonomy の正規化

### 4.5.1 対象

- `.storybook/main.ts`
- `.storybook/preview.ts`
- `src/**/*.stories.ts`
- `src/stories/**`
- `test/unit/**`
- `test/ssr/**`
- `test/e2e/**`
- `package.json`
- 必要に応じて新設:
  - `src/testing/story-taxonomy.ts`
  - `test/storybook/**`
  - `docs/testing-taxonomy.md`

### 4.5.2 背景

Rouault にはすでに `test:unit` / `test:ssr` / `test:storybook` / `test:e2e` が存在する。  
したがって問題は taxonomy の不存在ではない。

問題は、既存の story / test が次のどれを固定しているのかが、単一の source of truth としてコード上に固定されていないことである。

- visual confirmation
- interaction contract
- browser-observable boundary contract
- SSR / build-time contract
- end-to-end integration

現行の 4.5 節は metadata 主体という方向性自体は妥当である。  
しかし、taxonomy の source of truth を `tags` / `parameters` / 独自 parameter の複数候補として残しているため、長期運用では drift が起こりやすい。

また、Boundary Story の定義に SSR / hydration 境界まで含めると、`test/ssr/**` と責務が競合しやすい。  
Storybook は browser 上で観測できる契約の固定に集中し、SSR / build-time / serialization 契約は `test/ssr/**` 側へ明示的に残すべきである。

さらに、taxonomy は文書化だけでは維持できない。  
metadata 欠落、`play` の有無と taxonomy の不整合、Storybook 実行系の空洞化を CI で落とせる構成にしなければ、taxonomy は数か月で再び崩れる。

### 4.5.3 方針

新しい taxonomy を増殖させるのではなく、**既存 Storybook / test taxonomy を単一 metadata source of truth で正規化し、実行系と CI 検証まで含めて固定する**。

Story taxonomy は story export ごとに必ず 1 つ持ち、source of truth は **`parameters.rouaultContractKind` のみ** とする。  
`tags` は Storybook 側の検索・表示補助として用いてよいが、taxonomy 判定の正本にしてはならない。  
title は人間のナビゲーション用ラベルとし、taxonomy 判定に使ってはならない。  
meta export に共通値を置いてもよいが、**最終的な分類結果は named story export ごとに一意に決定できなければならない**。

Story taxonomy は少なくとも次の 3 種に固定する。

1. `visual`
2. `interaction-contract`
3. `boundary-contract`

`play` の有無は taxonomy の source of truth にしてはならない。  
`play` は Storybook / Vitest 実行系における**検証手段の一つ**であって、長寿命の taxonomy metadata としては扱わない。

また、Storybook まわりの shared helper / decorator / mock factory は taxonomy とは別に ownership を固定する。  
これらは **story 実行補助層**であり、production domain rule、SSR contract、build-time transform rule、feature 意味論の source of truth を所有してはならない。

### 4.5.4 Story taxonomy 契約

#### Visual Story

- 見た目確認
- token / density / theme / layout variation 確認
- docs / catalog / usage example の提示
- `parameters.rouaultContractKind = 'visual'`
- `play` は持たなくてよい
- `play` を持つ場合でも、interaction 契約や boundary 契約の唯一の固定手段にしてはならない
- screenshot 的比較や docs 表示のための story はここへ分類する
- ただし visual story も、少なくとも **render 失敗しないこと、docs 構成が壊れていないこと、required args / controls が破綻していないこと**のいずれかを CI で固定しなければならない

#### Interaction Contract Story

- keyboard / pointer / focus / event / state transition 契約確認
- `parameters.rouaultContractKind = 'interaction-contract'`
- 原則として `play` により契約を確認する
- component 単位または feature 局所単位の browser interaction を固定する
- URL、router、SSR、build artifact の意味論はここへ持ち込まない

#### Boundary Contract Story

- forced-colors
- reduced-motion
- no-bubbling
- reentrancy safety
- persistence UI contract
- async degraded state
- 複数 slot / empty / overflow / density など browser 上で観測可能な境界条件
- `parameters.rouaultContractKind = 'boundary-contract'`
- `play` を持ってもよいし、静的構成差だけで固定してもよい
- ただし **SSR / hydration / serialization / build-time transform はここへ含めない**

### 4.5.5 テスト群の役割分担

- `test/unit/**`
  - pure function
  - normalization
  - URL
  - tokenizer
  - projection
  - small domain rule
  - build-time helper の局所ロジック

- `test/ssr/**`
  - SSR / serialization / hydration 契約
  - `DocumentSnapshot`
  - Markdown / build-time 変換
  - template / data bridge
  - static artifact shape
  - Storybook では表現しにくい server-side contract

- `test:storybook`
  - component 単位の `interaction-contract` / `boundary-contract`
  - 必要に応じて `visual` の docs / story 構成妥当性確認
  - browser 上で観測可能な契約の living spec
  - taxonomy 欠落や metadata 不整合の検出対象
  - **実行対象 0 件の成功を許容しない**

- `test/e2e/**`
  - 実ブラウザ上の遷移
  - 検索
  - 主要読書フロー
  - app shell と feature の横断統合
  - Storybook では代替できない multi-page / router / persistence / history 契約

### 4.5.6 重要境界

- Storybook は **browser-observable component / feature-local contract** を固定する
- `test/ssr/**` は **SSR / build-time / serialization contract** を固定する
- `test/e2e/**` は **app 全体の統合結果** を固定する
- title、ファイル名、`Boundary` 文字列、`play-fn` tag は補助シグナルであり、taxonomy の source of truth ではない
- `custom-elements.json` は autodocs の補助入力であり、taxonomy の source of truth ではない
- `play` の有無は taxonomy の source of truth ではない
- `test:storybook` は living spec の実行経路であり、**空の成功経路を常態化させてはならない**
- 既定の `test` と `test:e2e` は別ゲートとして扱い、その違いを文書上で明示する
- Storybook 側の taxonomy は unit / ssr / e2e の責務を代替しない
- `src/testing/**`、`src/stories/shared/**`、decorator、mock factory、render helper は **story 実行補助層**であり、taxonomy 判定、production domain rule、SSR contract、build-time transform rule の source of truth になってはならない
- story は公開 component API、feature public adapter、story 専用 mock adapter に依存してよいが、将来撤去予定の内部 facade や暫定 adapter を固定点にしてはならない

### 4.5.7 やること

- 全 story export に `parameters.rouaultContractKind` を必須化する
- meta export に共通値を置く場合でも、named story export 単位で最終分類結果を一意に解決できるようにする
- `tags`、title、ファイル名、`Boundary` 命名、`play-fn` のような既存シグナルは補助情報へ降格し、taxonomy 判定を `parameters.rouaultContractKind` に一本化する
- `src/testing/story-taxonomy.ts` を新設し、`RouaultContractKind`、分類 helper、validation helper を単一定義する
- `play` の有無を taxonomy の代用にしない
- `src/components/ui/**/*.stories.ts` だけでなく `src/stories/**`、layout story、search story、not-found story も同一 taxonomy に含める
- Storybook 用 test を `test/storybook/**` など明示ディレクトリへ寄せ、`test:storybook` が実体を持つ状態へ正規化する
- **`test:storybook` は story export または `test/storybook/**` の少なくとも一方を必ず実行し、実行対象 0 件を失敗として扱う**
- taxonomy 欠落 story を CI で失敗させる
- `interaction-contract` が `play` を持たない場合を検出する lint / test を追加する
- `visual` が interaction 契約や boundary 契約の唯一の固定手段になっている場合を検出する lint / test を追加する
- `boundary-contract` に SSR / hydration / build-time transform を書いている story を禁止し、対応する `test/ssr/**` へ退避する
- visual story についても、render 失敗、docs 崩壊、必須 args / controls 崩壊のいずれかを検出する最低限の CI 固定を追加する
- `src/testing/**` または `src/stories/shared/**` にある decorator、mock factory、render helper の責務を明文化し、production domain rule、SSR contract、build-time transform rule を置かないことを lint / review 観点で固定する
- story が内部 facade、暫定 adapter、将来削除予定 API に直接依存している場合を検出し、公開 component API または story 専用 adapter へ寄せる
- `docs/testing-taxonomy.md` を新設し、story taxonomy と test taxonomy の責務境界、命名規則、例外規則、shared helper / decorator / mock の ownership を文書化する
- `package.json` 上で既定ゲートと拡張ゲートの差を説明可能な状態にする
  - `test`: 常時ゲート
  - `test:e2e`: 拡張統合ゲート
- Storybook を単なる見本帳ではなく、CI で継続実行される living spec として読めるようにする

### 4.5.8 やらないこと

- taxonomy の source of truth を `tags` と `parameters` の二重管理にしない
- title に `Visual` / `Interaction` / `Boundary` を機械的に埋め込む運用を強制しない
- `play` の有無を taxonomy metadata として固定しない
- Storybook に SSR / hydration / build-time transform 契約まで背負わせない
- Storybook を e2e の代替にしない
- `custom-elements.json` を taxonomy 判定の正本にしない
- taxonomy を増やしすぎない
  - `visual`
  - `interaction-contract`
  - `boundary-contract`
  の 3 種から開始し、これを超える細分化は明確な CI 要件がある場合に限る
- metadata だけ定義して、検証手段なしの運用規約に留めない
- decorator、mock factory、render helper を production domain rule の退避先にしない
- story から内部 facade や暫定 adapter を直接固定しない
- `test:storybook` の pass-with-no-tests 相当の逃げ道を完了条件へ持ち込まない

### 4.5.9 完了条件

- 各 named story export が `parameters.rouaultContractKind` により単一に分類されている
- taxonomy 判定に title、ファイル名、`Boundary` 命名、`play-fn` tag を必要としない
- `play` の有無を taxonomy 判定に使っていない
- Storybook と `test:storybook` の間に実体のある実行経路があり、**実行対象 0 件の成功に依存していない**
- `interaction-contract` / `boundary-contract` の story が living spec として継続実行される
- visual story についても最低限の CI 固定があり、単なる手動確認置場になっていない
- `test/unit/**` / `test/ssr/**` / `test:storybook` / `test/e2e/**` の責務境界が文書上もコード上も説明できる
- browser-observable boundary と SSR / build-time boundary が分離されている
- `src/stories/**`、layout story、feature story が UI component story と同じ taxonomy で読める
- `src/testing/**` または `src/stories/shared/**` の helper / decorator / mock が story 実行補助層として読め、production domain rule や SSR contract の隠れた source of truth になっていない
- story が公開 component API、feature public adapter、story 専用 mock adapter のいずれかに依存しており、内部 facade や暫定 adapter を固定点にしていない
- taxonomy 追加や逸脱が CI で検知され、レビュー裁量だけに依存しない

---

## 4.6 第6優先: Markdown 変換系は ownership を維持したまま grammar / parser core / payload / policy context / validator / output adapter を分離する

### 4.6.1 対象

一次対象:

- `velite.config.ts`
- `lib/remark/rouault-directives.ts`
- `lib/remark/directives/index.ts`
- `lib/remark/directives/registry.ts`
- `lib/remark/directives/shared/**`
- `lib/remark/directives/validation/**`
- `docs/markdown/markdown-overview.md`
- `docs/markdown/markdown-authoring-specification.md`
- `docs/markdown/markdown-output-contract.md`
- `docs/markdown/markdown-safety-and-test-policy.md`

整合確認対象:

- `lib/remark/disallow-raw-html.ts`
- `lib/remark/remark-link-cards.ts`
- `lib/remark/expand-example-includes.ts`
- `lib/content/source-note-metadata.ts`
- `lib/content/note-content-contracts.ts`
- `lib/rehype/**`

必要に応じて新設:

- `lib/remark/directives/grammar/**`
- `lib/remark/directives/parser-core/**`
- `lib/remark/directives/payload/**`
- `lib/remark/directives/policy/**`
- `lib/remark/directives/validator/**`
- `lib/remark/directives/output/**`

補足:

- 本ワークストリームの主戦場は `remark` 側の custom directive parser 周辺である
- ただし対象は custom directive parser 本体だけに限定しない
- `remark-link-cards`、code meta 正規化、image attribute 正規化、inline 拡張など、remark 側で `hName` / `hProperties` またはそれに準ずる出力 binding を生成する経路も整合確認対象に含める
- `rehype/**` は出力 DOM 契約の ownership を持つ層として維持し、rehype 全体を再設計主対象にしない
- Markdown 文書群の ownership は維持し、overview を正本化しない
- parser 本体の早期置換は本節の目的ではない
- 本節では、parser を差し替える前提条件として、意味論の source of truth を `payload` と `policy context` に再固定する
- 本節では、名称上の整理ではなく、コード上で実際に維持される 6 層とその一方向依存を固定する

### 4.6.2 背景

Markdown 文書群はすでに ownership が明確である。

- `docs/markdown/markdown-overview.md` は overview、SoT の所在、規範源の優先順位を所有する
- `docs/markdown/markdown-authoring-specification.md` は authoring grammar を所有する
- `docs/markdown/markdown-output-contract.md` は出力 DOM 契約を所有する
- `docs/markdown/markdown-safety-and-test-policy.md` は safety policy、trust boundary、既知制約分類、test policy を所有する

また、custom directive parser は safety policy 文書上すでに将来置換候補として分類されている。

しかし現行実装は、ownership を維持している一方で、内部構造としてはまだ次の問題を抱えている。

1. `directiveMetadata` が grammar descriptor、structural rule、output 寄り情報の境界をまたいでいる
2. directive handler が属性検証、default 解決、payload 確定、`hProperties` 生成を同時に持ち、grammar / payload / output adapter の境界を曖昧にしている
3. validator が `payload` ではなく `node.data.hProperties` 相当の output 用表現へ依存しており、output adapter が暗黙の source of truth になりうる
4. note policy が remark validator 側と `lib/content/note-content-contracts.ts` 側に分散し、preview / preview-sandbox まわりの許可条件が二重所有になりうる
5. validator が `file.path` を介して source metadata を再読込しており、build-time policy context と validation が I/O を伴って結合している
6. `velite.config.ts` の実際の plugin 順序と overview 文書の SoT 記述が drift しうる
7. structural validator と note policy validator と output adapter の順序がコード構造上明確でなく、parser 置換前に意味論固定点を説明しにくい
8. custom directive parser 以外の remark 変換でも出力 binding が個別実装されうるため、directive handler だけを分離しても `hProperties` 依存が別経路から再流入しうる
9. 未使用 validator、旧 shared helper、暫定 adapter が残存すると、新旧 SoT が並立し、将来の改修で誤参照を再発させうる

この状態では、parser 本体を将来置換可能と宣言しても、実際には `shared/**` と `hProperties` と note policy 再読込が hidden coupling として残る。  
長期保守性の観点では、parser 本体の置換前に、**grammar / parser core / payload / policy context / validator / output adapter** の 6 層を明示的に分離し、`payload` と `policy context` を唯一の意味論固定点へ戻す必要がある。

### 4.6.3 方針

今すぐ parser 本体を置換しない。  
まず ownership を維持したまま、Markdown 変換系の内部を次の 6 層に再分解する。

1. grammar descriptor
2. parser core
3. semantic payload
4. note policy context
5. structural / policy validator
6. output adapter

ここでいう意味は次のとおりとする。

- grammar descriptor:
  - directive 種別
  - leaf / container 区分
  - 開始 / 終端規則
  - folded paragraph 互換条件
  - 許可属性名
  - 属性型、値域、default の定義参照
  - 親子制約、排他制約、出現回数制約の定義参照
  - ただし host tag、slot 名、`hName`、`hProperties` は持たない
  - grammar descriptor は「構文記述」と「payload schema の入口」を所有するが、最終 DOM 形状を所有しない

- parser core:
  - block marker scan
  - paragraph expansion
  - directive line parse
  - inline / attribute parse
  - parser 生入力の構文抽出
  - parser core は構文抽出だけを行い、directive 固有の意味確定や note policy 判定を行わない

- semantic payload:
  - parser 生入力を directive ごとの正規化済み意味表現へ変換する層
  - boolean / enum / integer / list の正規化
  - default 値解決
  - directive 固有 payload の確定
  - payload は validator と output adapter の共通入力である
  - payload は output props の代用品ではなく、逆に output props が payload の派生値でなければならない
  - payload は `hProperties`、slot 名、host tag 名の別名であってはならない

- note policy context:
  - source note metadata
  - content kind
  - testing area 判定
  - preview / sandbox 可否
  - note 単位の build-time policy
  - policy context は immutable な build-time 入力であり、validator の都度 file path から再読込してはならない

- structural / policy validator:
  - grammar と payload と policy context に対する妥当性検査
  - 親子制約、排他制約、出現回数制約
  - note policy 制約
  - trust boundary 上の remark 段階で拒否すべき契約違反
  - validator は `payload` と `policy context` だけを読み、`node.data` / `hProperties` を SoT にしてはならない

- output adapter:
  - `payload` から remark / mdast 側の出力 binding を生成する層
  - host tag、slot、`hName`、`hProperties`、data attributes の構成
  - ここでいう output adapter は **remark 側の output binding** を指し、rehype 側の最終 DOM 契約そのものを所有しない
  - `docs/markdown/markdown-output-contract.md` が所有する最終 DOM 契約を remark 側で再定義してはならない

加えて、6 層の依存方向を次のように固定する。

```text
grammar -> parser core -> payload -> validator
                              -> output adapter

policy context --------------> validator
payload ---------------------> output adapter
```

規則:

* validator から output adapter へ依存してはならない
* output adapter から validator へ依存してはならない
* parser core から policy context へ依存してはならない
* payload は note policy を内包してはならない
* output adapter は note policy 判定を持ってはならない
* rehype 層の最終 DOM 契約を remark 側 output adapter へ再所有させてはならない

### 4.6.4 想定構成

```text
lib/remark/directives/
  grammar/
    directive-kinds.ts
    directive-grammar.ts
    attribute-schemas.ts
    structural-rules.ts

  parser-core/
    scan-block-markers.ts
    expand-folded-paragraph.ts
    parse-directive-line.ts
    parse-inline-attrs.ts
    parse-directive-nodes.ts

  payload/
    payload-types.ts
    normalize-callout-payload.ts
    normalize-code-group-payload.ts
    normalize-code-preview-payload.ts
    normalize-preview-sandbox-payload.ts
    normalize-details-payload.ts
    normalize-info-box-payload.ts
    normalize-link-card-payload.ts
    normalize-score-payload.ts
    normalize-tabs-payload.ts
    normalize-translation-payload.ts

  policy/
    note-policy-context.ts
    build-note-policy-context.ts
    preview-policy.ts
    sandbox-policy.ts

  validator/
    validate-structure.ts
    validate-policy.ts
    validate-directive.ts
    validation-types.ts

  output/
    output-binding-types.ts
    adapt-callout-output.ts
    adapt-code-group-output.ts
    adapt-code-preview-output.ts
    adapt-preview-sandbox-output.ts
    adapt-details-output.ts
    adapt-info-box-output.ts
    adapt-link-card-output.ts
    adapt-score-output.ts
    adapt-tabs-output.ts
    adapt-translation-output.ts

  registry.ts
  index.ts
```

補足:

* `grammar/**` は authoring grammar の受理境界を定義するが、authoring 正本そのものは `docs/markdown/markdown-authoring-specification.md` に残す
* `parser-core/**` は directive 固有意味論を持たず、構文抽出専用とする
* `payload/**` は directive ごとの意味表現を所有し、remark 側の唯一の semantic SoT とする
* `policy/**` は note ごとの build-time policy 入力を明示化し、validator への依存注入点とする
* `validator/**` は `payload` と `policy context` に対する拒否判定を所有する
* `output/**` は remark 側 binding のみを所有し、最終 DOM 契約は ownership として再保持しない
* `remark-link-cards`、image attribute 正規化、code meta 昇格など directive 外の remark 出力経路も、必要に応じてこの `payload -> output binding` の整理方針へ合わせる
* `shared/**` は恒久領域として温存しない
* grammar、payload、policy、validator、output のいずれにも説明不能な helper は残さない

### 4.6.5 やること

#### A. grammar descriptor の独立

* `directiveMetadata` を解体し、少なくとも次を分離する

  * grammar descriptor
  * structural rule
  * payload schema 参照
  * output binding 定義
* grammar descriptor には host tag、slot、`hProperties` を置かない
* 許可属性一覧、値域、default 定義の参照点を grammar 側へ固定する
* 親子制約、排他制約、出現回数制約は grammar と近接配置してよいが、output binding 情報と混在させない
* overview や note-authoring-guide を grammar の正本にしない

#### B. parser core の縮小

* block marker scan、folded paragraph 対応、directive line parse、inline attr parse を parser core へ寄せる
* parser core から directive ごとの default 解決、enum 正規化、policy 判定を除去する
* parser core は directive 種別と raw attrs と raw child structure を返すだけに縮小する
* parser core は `hName`、`hProperties`、slot 名、host tag 名を返さない
* parser core は file path や source metadata を読まない

#### C. payload の SoT 化

* directive ごとの enum / boolean / integer / list 正規化を `payload/**` へ集約する
* default 解決は payload 層が所有する
* output adapter の都合による props 名を payload 型へ混入させない
* validator が読む値と output adapter が読む値を同一 payload 型へ収束させる
* payload 型は directive ごとに明示し、`unknown` な辞書のまま downstream へ流さない
* payload は remark 側の意味表現であり、rehype 後の最終 DOM 契約を代替しない

#### D. policy context の明示入力化

* `lib/content/note-content-contracts.ts` と remark validator の間で二重所有になっている note policy を棚卸しする
* preview、preview-sandbox、testing area、reader-facing 可否など、note 単位の build-time policy を `policy/**` へ寄せる
* validator は `file.path` から source metadata を再読込せず、`buildNotePolicyContext(...)` が供給する `policy context` を受け取る
* `policy context` は immutable な値オブジェクトとして扱う
* note policy の SoT を remark validator 内の ad hoc 条件分岐にしない

#### E. validator の純化

* validator は `payload` と `policy context` と grammar / structural rule を入力とする
* validator から `node.data.hProperties` 依存を除去する
* structural validator と policy validator を明示分離し、合成点だけを `validate-directive.ts` に置く
* validator は output 生成を行わない
* validator は file I/O を行わない
* `invalid because output shape looked wrong` ではなく、`invalid because payload / structure / policy violated contract` と説明できる構造へ変える
* 未使用 validator、旧 validation helper、shadow implementation を同一変更で削除する

#### F. output adapter の限定

* `output/**` は remark 側 output binding だけを所有する
* host tag、slot、`hName`、`hProperties`、data attributes の生成は output adapter だけが行う
* output adapter は validation 判定や policy 判定を持たない
* output adapter は payload を読むが、payload を上書きしない
* output adapter は `docs/markdown/markdown-output-contract.md` の最終 DOM 契約を再定義せず、その契約へ収束するための remark 側 binding を生成するだけにとどめる
* directive 外の remark 変換でも `hName` / `hProperties` を生成する箇所は、同じく binding 層として分離できるかを確認する

#### G. plugin 順序 SoT の固定

* `velite.config.ts` における plugin 順序を実装上の唯一 SoT として維持する
* `docs/markdown/markdown-overview.md` の記述は SoT の要約として整合させる
* plugin 順序の drift 検知を snapshot または manifest ベースで固定し、説明文更新だけに依存しない
* overview 側で先に意味論を導入し、実装順序が追随していない状態を許可しない

#### H. テスト構造の層別化

* grammar fixture:

  * 許可 directive
  * 未許可 directive
  * 許可属性
  * 未許可属性
  * folded paragraph 互換
* payload fixture:

  * enum / boolean / integer / list 正規化
  * default 解決
  * directive ごとの payload shape
* policy matrix:

  * content kind
  * reader / testing
  * preview / sandbox 可否
  * note policy の許可 / 拒否
* validator fixture:

  * 親子制約
  * 排他制約
  * 出現回数制約
  * policy 違反
* output fixture:

  * remark 側 binding の shape
  * `hName` / `hProperties` / slot の決定性
* safety fixture:

  * raw HTML 拒否
  * 危険属性拒否
  * preview-sandbox trust boundary
* architecture test:

  * validator が `node.data.hProperties` を読んでいない
  * validator が file I/O をしていない
  * payload が host tag / slot / `hProperties` を持っていない
  * output adapter だけが `hName` / `hProperties` を生成している
* dead code check:

  * 旧 validator / 旧 metadata / 旧 adapter が参照されていないことを CI で検知する

### 4.6.6 重要境界

* authoring grammar の正本は `docs/markdown/markdown-authoring-specification.md` が持つ
* 最終出力 DOM 契約の正本は `docs/markdown/markdown-output-contract.md` が持つ
* safety policy、trust boundary、既知制約分類、test policy の正本は `docs/markdown/markdown-safety-and-test-policy.md` が持つ
* overview は ownership と SoT の所在を説明するが、個別契約の正本にならない
* remark 側 output adapter は **remark から HAST へ渡す binding** を所有するが、最終 DOM 契約そのものを ownership として持たない
* payload は remark 側意味論の SoT であり、最終 DOM props の別名ではない
* policy context は build-time policy 入力であり、validator 時の file path 再読込で代替してはならない
* validator は output adapter に依存しない
* rehype 層は出力 DOM 契約と最終安全検査の ownership を維持し、remark 側都合で responsibility を逆流させない
* Markdown 文書群は foundations、accessibility、router、search の ownership を再定義しない
* output 寄り属性名を author-facing 契約へ露出しない

### 4.6.7 やらないこと

* parser 本体をこの段階で全面置換しない
* overview を authoring grammar や output DOM 契約の正本にしない
* validator に `node.data.hProperties` を SoT として読ませない
* validator に file path 経由の metadata 再読込を残さない
* payload を host tag / slot / props の別名として設計しない
* output adapter に note policy 判定を持たせない
* rehype 側の最終 DOM 契約を remark 側 output adapter に再所有させない
* `shared/**` を説明不能な総合 util 置場として残さない
* 旧 validator、旧 metadata、暫定 adapter を温存したまま新構成を追加しない
* plugin 順序整合をレビュー裁量だけに依存しない
* directive handler だけを整理して、directive 外 remark 変換の output binding 漏れを放置しない

### 4.6.8 完了条件

* 4.6 節の見出しと本文がともに 6 層モデルで一致しており、説明単位と実装単位がずれていない
* grammar descriptor、structural rule、payload schema 参照、output binding が別型・別ファイルで分離されている
* parser core が directive 固有 payload、note policy、`hProperties` 生成を持っていない
* directive ごとの enum / boolean / integer 正規化と default 解決が `payload/**` に集約されている
* payload 型が host tag、slot、`hName`、`hProperties` を含んでいない
* validator が `payload` と `policy context` だけを読み、`node.data` / `hProperties` に依存していない
* validator が file path から source metadata を再読込していない
* note policy の正本が `policy/**` に明示され、remark validator 側の ad hoc 条件分岐や `lib/content/note-content-contracts.ts` との二重所有になっていない
* output adapter だけが host tag、slot、`hName`、`hProperties` を生成している
* `directiveMetadata` のような総合メタが解体され、grammar / structural rule / payload schema / output binding の責務が説明可能になっている
* `remark-link-cards`、image attribute 正規化、code meta 昇格など directive 外の remark 出力経路についても、少なくとも binding ownership が説明可能になっている
* `velite.config.ts` の plugin 順序と `docs/markdown/markdown-overview.md` の記述が整合している
* plugin 順序 drift が snapshot または manifest で CI 検知され、説明文更新だけに依存していない
* authoring grammar fixture、payload fixture、policy matrix、validator fixture、output fixture、安全 fixture、architecture test が層別に存在している
* shadow validator、旧 metadata、暫定 adapter、未使用 helper が repo から除去されている
* SoT drift が CI で検知され、レビュー裁量だけに依存していない
* parser 本体をまだ置換していなくても、payload と policy context を中心に意味論固定点が説明できる

---

## 5. 実行順序

優先順位は次のとおりとする。

0. 契約・実装差分の棚卸し
1. note navigation domain の ownership 集約
2. router core を維持したまま、app-router と `src/lib/router.ts` から app 固有 glue を退避する
3. search の indexing helper 分離と build-time 生成整理
4. `src/data` における source normalization / intrinsic enrichment / projection の分離
5. Storybook / test taxonomy の正規化
6. Markdown の metadata / parser core / validation context 再設計
7. parser 本体の置換可否評価

理由は次のとおりである。

- 0 が無いと、後続工程の判断基準自体が不安定になる
- 1 から 3 は URL 意味論と画面整合を直接壊しうる中核である
- 4 は build-time data の受け皿を整理する
- 5 は既存運用を living spec として読める状態へ正規化する
- 6 は parser 本体を触る前提条件づくりである
- 7 はその前提条件が揃った後にだけ評価すべきである

---

## 6. 実施単位

各ワークストリームは、次の単位で進める。

### 6.1 仕様更新

意味論を持つ変更は、対応する契約文書を先に更新する。

### 6.2 実装移動

ownership の移動は rename / extract / delegate を基本とし、一度に挙動変更と混ぜない。

### 6.3 テスト固定

挙動変更を伴う場合は、unit / ssr / e2e / story のうち適切な層で先に失敗例または固定例を追加する。

### 6.4 段階完了判定

各ワークストリームは、完了条件を満たすまで次へ進めない。
特に、URL family の混同、UI への意味論再流入、build-time と render-time の責務逆流が残る状態で段階完了とみなさない。

---

## 7. 運用規則

### 7.1 仕様書先行

大規模再設計は仕様書を先に更新し、実装はそれに追従する。
実装のみで意味論を既成事実化しない。

### 7.2 良い core を守る

既に良い ownership を持つ core は壊さない。
直すべきなのは core そのものではなく、統合層・境界漏れ・責務再実装である。

### 7.3 defensive validation を禁止しない

UI コンポーネントは意味論の source of truth ではない。
ただし、`items-json` や `<script>` 由来入力のように DOM 境界で外部入力を受ける場合、defensive validation / defensive parse は維持してよい。

### 7.4 単一巨大 util を作らない

規則の散在を理由に、全 domain を 1 個の巨大 util へ押し込まない。
domain ごとの ownership と意味論を保ったまま、必要な範囲だけ集約する。

---

## 8. 受け入れ基準

本計画の受け入れは、次を満たしたときとする。

1. 着手前の差分棚卸し表が存在し、各差分が doc fix / impl fix / hold のいずれかに分類されている
2. note navigation URL、fetch target URL、`DocumentCanonicalUrl`、`SearchStateUrl` がコードと文書の両方で明確に分離されている
3. `src/data/notes.ts`、navigation domain、page-specific projection の ownership 境界が明文化され、コード上でも追認できる
4. note navigation の物理配置が build-time content logic と整合しており、client runtime 側 `src/lib/**` へ責務が逆流していない
5. app-router が shell adapter の置き場ではなく、最小統合層へ縮小している
6. note layout が検索 tokenizer や indexing 補助へ直接依存していない
7. `eleventy.config.ts` が生成ロジック本体ではなく orchestration として読める
8. `note-page-projection.ts` が導入され、`src/data/notes.ts` が page-specific projection を直接返していない
9. Storybook / test の既存 taxonomy が metadata 主体で正規化され、story の役割が title だけに依存せず判読できる
10. Markdown 変換系が ownership を維持したまま、metadata / parser core / validation context を分離できている
11. Markdown 文書群と `velite.config.ts` の SoT drift が残っていない
12. parser 本体を将来置換対象として扱える前提条件が、文書・コード・テストで整理されている
13. `pnpm build` が通り、静的出力内に `/search-catalog.json`、Pagefind artifact、client bundle が揃っている

---

## 9. 実施後の検証

変更後は少なくとも次を確認する。

* `pnpm test:unit`
* `pnpm test:ssr`
* `pnpm test:storybook`
* `pnpm typecheck:node`
* `pnpm build`

加えて、build 後に少なくとも次の artifact を確認する。

* 静的出力内の `/search-catalog.json`
* Pagefind artifact
* client bundle
* Storybook / test taxonomy の正規化で参照する story metadata がビルド対象から脱落していないこと

`pnpm test:e2e` は、router / search / app shell の横断統合へ影響したワークストリームでは必須とする。

---

## 10. 最終判断基準

本計画における最終判断基準は、短期的な実装容易性ではなく、次の 5 点である。

1. ownership が明確になったか
2. URL family の意味論が混同されていないか
3. build-time / render-time / UI の責務境界が明瞭か
4. 既に良い core を壊していないか
5. 将来の parser 置換や機能追加が、既存の責務境界を壊さずに可能か
