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

## 4.3 第3優先: search の責務漏れ是正と search-core の段階分離準備

### 4.3.1 対象

* `src/lib/search/*`
* `src/components/search/search-page.ts`
* `src/components/ui/search-dialog/*`
* `src/data/searchCatalog.ts`
* `src/layouts/NoteLayout.11ty.ts`
* `eleventy.config.ts`
* 必要に応じて新設:
  * `src/lib/search/indexing/*`
  * `src/lib/search/build/*`
  * `src/lib/search/core/*`

### 4.3.2 背景

検索仕様は良い。  
問題は 2 つある。

1. 検索の tokenization と indexing 補助が note 描画側へ漏れていること  
   - note layout が検索前処理に依存すると、検索 tokenizer の変更が note rendering 変更へ波及する
2. `search-core` が将来的に持つべき段階境界に対して、実装上の build helper / candidate 処理 / counts / diagnostics の責務位置がまだ十分に明示されていないこと

したがって、単に helper を移すだけでは不十分である。  
indexing 専用責務を build-time 側へ寄せると同時に、search 仕様書が要求する段階分離へ近づくための準備を行う必要がある。

### 4.3.3 方針

search の core / pipeline / source / UI 分離は維持する。  
ただし、次の 2 点を追加で固定する。

1. indexing 専用 helper と search catalog 生成責務は build-time search module へ寄せる
2. `search-core` は最終的に orchestration を担う中核として扱い、tokenizer 実装詳細、catalog build 詳細、counts / diagnostics の個別処理は段階モジュールへ分離可能な形へ近づける

この段階では全面分解を完了条件にしない。  
しかし少なくとも、「将来どこへ分けるか」がコード上で読める状態までは持っていく。

### 4.3.4 やること

* `tokenizeSearchText` のような indexing 専用 helper を `src/lib/search/indexing/*` へ分離する
* `src/data/searchCatalog.ts` と `src/layouts/NoteLayout.11ty.ts` は indexing helper またはその薄い projection だけを参照する
* Pagefind 用補助テキスト生成、search catalog 用補助テキスト生成、catalog item 正規化補助を build-time search module へ寄せる
* `search-page.ts` と `search-dialog/*` は search-core の公開レスポンス表示に専念する
* `/search-catalog.json` の生成責務は build-time data 側または `src/lib/search/build/*` の専用 build helper 側へ明示的に所属させる
* `eleventy.config.ts` は生成ロジック本体の置き場ではなく、build / serve / middleware / asset copy の orchestration に集中させる
* `eleventy.config.ts` に残すのは「いつ生成するか」「どこへ公開するか」の配線であり、「何をどう生成するか」の実装詳細は外部 module へ退避する
* `search-core` については、少なくとも次の段階境界が将来抽出可能な形へ整理する
  * query preparation
  * source federation
  * candidate validation / merge
  * ranking / sorting
  * counts / diagnostics
* build 後 artifact として、静的出力内に `/search-catalog.json` が存在することを検証手順へ明示的に追加する

### 4.3.5 重要境界

* note page navigation URL の正規化は note navigation domain が所有する
* `DocumentCanonicalUrl` / `SearchStateUrl` / `pathLabel` は search domain が所有する
* search catalog 生成、Pagefind 用補助テキスト生成、indexing tokenization は search domain の build-time 責務として扱う
* 両者は統合しない

### 4.3.6 完了条件

* note layout が検索 tokenizer や query 前処理へ直接依存していない
* search catalog 生成と Pagefind 用補助テキスト生成が build-time indexing helper または build helper に集約されている
* `eleventy.config.ts` が orchestration として読め、search artifact 生成の実装詳細を抱え込んでいない
* search UI が search-core の公開レスポンス表示だけに集中している
* `search-core` の将来分離対象である query / source / merge / rank / counts / diagnostics の境界がコード上で読める
* build 後の静的出力に `/search-catalog.json` が存在することが検証手順に含まれている
* search URL と note navigation URL の正規化責務が明確に分離されている

---

## 4.4 第4優先: `src/data` projection 群の整理

### 4.4.1 対象

- `src/data/notes.ts`
- `src/data/searchCatalog.ts`
- `src/layouts/NoteLayout.11ty.ts`
- `src/data/home.ts`
- `src/data/tagPages.ts`
- `src/data/corpusPages.ts`
- `src/data/corporaOverview.ts`
- 新設:
  - `src/data/projections/note-page-projection.ts`
  - 必要に応じて `src/data/projections/search-catalog-projection.ts`
  - 必要に応じて `src/data/projections/shared-normalizers.ts`

### 4.4.2 背景

ここは設計破綻ではない。
ただし、現行計画の書き方では `src/data/notes.ts` を source normalization の入口と呼ぶだけで、次の 3 層の区別が明文化されていない。

1. source normalization
2. note intrinsic enrichment
3. page-specific projection

この 3 層を分けて書かないと、`notes.ts` が再び page 専用派生値を抱え込むか、逆に page projection 側が source 読込や正規化へ逆流する。

### 4.4.3 方針

`src/data/notes.ts` は **source normalization と note intrinsic enrichment の入口** に固定する。
page ごとの派生値は `src/data/projections/*` が所有する。

ここでいう note intrinsic enrichment とは、少なくとも次を指す。

- note metadata の正規化
- 公開ルート衝突検査
- note kind / content kind の確定
- toc / cover など note 実体に内在する build-time 派生値の確定

一方、次は projection が所有する。

- home 用一覧派生
- tag / corpus 一覧派生
- search catalog 用派生
- note page レイアウト用の最終 view model 組み立て

### 4.4.4 想定構成

```text
src/data/
  notes.ts
  searchCatalog.ts
  home.ts
  tagPages.ts
  corpusPages.ts
  corporaOverview.ts
  projections/
    note-page-projection.ts
    search-catalog-projection.ts
    shared-normalizers.ts
```

補足:

* 第1段階では `note-page-projection.ts` を最優先とする
* `home.ts` / `tagPages.ts` / `corpusPages.ts` / `corporaOverview.ts` は、ownership の再肥大化が確認された場合にのみ追加で projection 化する

### 4.4.5 やること

* `notes.ts` は source normalization、intrinsic enrichment、公開ルート衝突検査に集中する
* まず `note-page-projection.ts` を新設し、note intrinsic data と note navigation domain の結果から `NoteLayout.11ty.ts` 用 view model を組み立てる
* `search-catalog-projection.ts` は必要になった場合にのみ導入し、search domain の indexing helper との接続だけを持つ
* `shared-normalizers.ts` は文字列・配列・日付の共通 normalizer に限定し、navigation rule や search rule を持ち込まない
* `home.ts` / `tagPages.ts` / `corpusPages.ts` / `corporaOverview.ts` は直ちに物理移動対象とせず、責務肥大化が確認された時点で projection 化する

### 4.4.6 完了条件

* source normalization、intrinsic enrichment、page-specific projection が文書上もコード上も分離されている
* `notes.ts` が page-specific projection を直接返さない
* `note-page-projection.ts` が `NoteLayout.11ty.ts` 用の明示的な build-time projection として読める
* projection 層が source 読込や route collision 検査を再実装していない
* `home.ts` / `tagPages.ts` / `corpusPages.ts` / `corporaOverview.ts` については、不要な物理再編を行わずに ownership 境界を維持できている

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
- `custom-elements.json`
- `package.json`

### 4.5.2 背景

Rouault にはすでに `test:unit` / `test:ssr` / `test:storybook` / `test:e2e` が存在し、Storybook 側にも `Boundary` 系 story や `play-fn` を持つ story が存在する。
したがって問題は taxonomy の不存在ではない。

問題は、既存の story / test が
- visual confirmation
- interaction contract
- boundary contract
- browser integration
のどれを固定しているのかが命名・配置・運用規則として正規化されていないことである。

### 4.5.3 方針

新しい taxonomy をゼロから導入するのではなく、**既存 Storybook / test taxonomy を metadata 主体で正規化する**。

Story は少なくとも次の 3 種へ分類する。

1. Visual Story
2. Interaction Contract Story
3. Boundary Contract Story

ただし、この分類を title 文字列へ機械的に埋め込むことは必須としない。  
title は人間のナビゲーション用ラベルとして扱い、taxonomy の source of truth は story metadata に置く。

taxonomy は、少なくとも次のいずれかで表現する。

- `tags`
- `parameters`
- project 独自の `parameters.rouaultContractKind`

この分類は、story を増やすためではなく、**既存 story の役割を機械可読かつ人間可読にするため**に使う。

### 4.5.4 正規化規則

#### Visual Story

- 見た目確認
- token / density / theme 差分確認
- `play` 関数は原則持たない
- taxonomy は `tags` または `parameters` で `visual` として明示する
- title は既存の domain / component 表現を維持してよい

#### Interaction Contract Story

- keyboard / pointer / focus / event 契約確認
- `play` 関数により検証する
- taxonomy は `tags` または `parameters` で `interaction-contract` として明示する
- title は既存の component / feature ナビゲーションを優先し、無理に `Interaction` を強制しない

#### Boundary Contract Story

- forced-colors
- reduced-motion
- SSR / hydration 境界
- persistence
- no-bubbling
- reentrancy safety
- `play` 関数または境界条件固定用の明示構成を持つ
- taxonomy は `tags` または `parameters` で `boundary-contract` として明示する
- title は既存の domain / component 体系を優先し、無理に `Boundary` を強制しない

### 4.5.5 テスト群の役割分担

- `test/unit/**`
  - pure function
  - normalization
  - URL
  - tokenizer
  - projection
  - build-time contract

- `test/ssr/**`
  - SSR / serialization / hydration 境界
  - `DocumentSnapshot`
  - Markdown / build-time 変換
  - router 統合境界

- `test:storybook`
  - component 単位の interaction / boundary contract の実行
  - living spec の継続検証

- `test/e2e/**`
  - 実ブラウザ上の遷移
  - 検索
  - 主要読書フロー
  - app shell と feature の横断統合

### 4.5.6 やること

- 既存 story を Visual / Interaction / Boundary のいずれかへ必ず分類する
- title 文字列だけに依存した判定を廃し、story metadata を taxonomy の source of truth とする
- `Boundary` タイトルや `play-fn` のような既存シグナルは、metadata へ吸収できるものから順に正規化する
- story 名、title、tag、parameters、実行系の関係を文書化する
- `src/components/ui/**/*.stories.ts` だけでなく `src/stories/**` や layout / search 系 story も同じ taxonomy へ含める
- 「story で固定すべき契約」と「unit / ssr / e2e で固定すべき契約」を重複させない

### 4.5.7 完了条件

- 各 story が Visual / Interaction / Boundary のいずれかとして metadata 上で判読できる
- Storybook が単なる見本帳ではなく、既存 `test:storybook` と接続した living spec として読める
- unit / ssr / storybook / e2e の責務重複が減っている
- taxonomy が title 強制ではなく、既存 story 運用の機械可読化として説明できる

---

## 4.6 第6優先: Markdown 変換系は ownership を維持したまま metadata / parser core / validation context を分離する

### 4.6.1 対象

- `velite.config.ts`
- `lib/remark/directives/**`
- `lib/rehype/**`
- `docs/markdown/markdown-overview.md`
- `docs/markdown/markdown-authoring-specification.md`
- `docs/markdown/markdown-output-contract.md`
- `docs/markdown/markdown-safety-and-test-policy.md`

### 4.6.2 背景

Markdown 文書群は ownership が明確であり、plugin 順序も SoT として扱われている。
また、custom directive parser は安全規約文書上すでに将来置換候補として分類されている。

したがって、直すべき中心は「registry をさらに分けること」そのものではない。
中心課題は次の 3 点である。

1. metadata が syntax / validation / transform の複数責務を帯びやすいこと
2. parser 本体の責務境界が paragraph expansion・block marker・inline parse などにまたがって強く結合していること
3. validation context と directive-specific validator の境界が実装上見えにくいこと

### 4.6.3 方針

今すぐ parser 本体を置換しない。
まず ownership を維持したまま、次の 3 層を明示化する。

- metadata
- parser core
- validation context

`registry` は最終的に、意味論の source of truth ではなく、metadata・handler・validator を束ねる薄い assembly layer とする。

### 4.6.4 実施順序

1. metadata を分離する
   - grammar metadata
   - validation metadata
   - transform / slot / output metadata

2. parser core を抽出する
   - block marker scan
   - paragraph expansion
   - directive line parse
   - inline / attribute parse

3. validation context を抽出する
   - tree traversal
   - parent / child 制約
   - directive-specific validator 実行
   - 単一 entrypoint

4. registry を薄くする
   - handler registry
   - validator registry
   - registry 自体は意味論を所有しない

5. 文書と実装の整合を取り直す
   - overview
   - authoring
   - output
   - safety
   - `velite.config.ts`

6. その後にだけ、parser 本体を標準 directive AST 系へ置換検討する

### 4.6.5 やらないこと

- Markdown を全体計画の第1優先にしない
- parser 本体を最初に触らない
- overview へ意味論を追記して既成事実化しない
- authoring / output / safety の ownership を崩さない
- `registry.ts` の再分離だけを目標化しない

### 4.6.6 完了条件

- metadata / parser core / validation context の責務境界が明確になっている
- registry が薄い assembly layer として説明できる
- `velite.config.ts` と Markdown 文書群の SoT drift が解消されている
- parser 本体置換の前提条件が文書・コード・テストで整理されている
- parser を差し替えても ownership と build-time rejection 原則が維持できる状態になっている

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
