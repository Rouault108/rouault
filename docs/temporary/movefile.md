**結論**

具体化するなら、**`lib/` と `src/lib/` を最終的に廃止し、`build/`・`shared/`・`src/` の3層へ再配置**するのが最も明快です。
また、Rouault の現状では `src/data/` を即時に消すのではなく、**Eleventy adapter 層として薄く残し、中身の projection / loader 本体を `build/` へ移す**のが適切です。これは、元文書の「build-time 系を `build/` ないし `pipeline/` に明示分離する」という方向を、現行実装に合わせて具体化したものです。

【確度: 高】
根拠経路: 一次（`rouault.zip` 実装確認）＋元文書 

---

## 1. 目標ディレクトリ構造

まず、最終形を固定します。

```text
build/
  content/
  markdown/
  navigation/
  projections/
  search/
  media/
  ssr/
  dev/

shared/
  note/
  navigation/
  search/
  link/
  icons/
  media/

src/
  assets/
  components/
  client/
  controllers/
  router/
  search/
  theme/
  toc/
  layouts/
  data/              # Eleventy adapter のみ
  *.11ty.ts
  client.ts

scripts/
test/
docs/
```

### 所有境界

* **`build/`**: Markdown 変換、projection、SSR、検索アーティファクト生成、開発サーバー補助
* **`shared/`**: 環境非依存の型・DTO・純粋関数・正規化ルール
* **`src/`**: runtime UI、client bootstrap、11ty テンプレート、薄い adapter

---

## 2. 現行パス → 目標パス対応表

### 2.1 shared へ切り出すもの

これが最優先です。
**build と runtime が両方使う純粋契約**を先に抜きます。

```text
src/types/note-kind.ts
  -> shared/note/note-kind.ts

src/types/testing-area.ts
  -> shared/note/testing-area.ts

src/types/note-surface-policy.ts
  -> shared/note/note-surface-policy.ts

src/icons/catalog.ts
  -> shared/icons/icon-catalog.ts

lib/shared/link-kind.ts
  -> shared/link/link-kind.ts

src/lib/media/media-source-attributes.ts
  -> shared/media/media-source-attributes.ts
```

### 2.2 navigation の shared / build 分割

現状ここが最も境界を壊しています。
特に `TreeNode` が UI コンポーネント側にあるのが悪いです。

```text
src/components/ui/file-tree/file-tree.ts
  -> shared/navigation/tree-node.ts
     ※ TreeNode / BranchNode / LeafNode 型だけ抽出
     ※ ui-file-tree 本体は src/components/ui/file-tree/file-tree.ts に残す

lib/content/navigation/normalize-note-path.ts
  -> shared/navigation/normalize-note-path.ts

lib/content/navigation/normalize-note-navigation-url.ts
  -> shared/navigation/normalize-note-navigation-url.ts

lib/content/navigation/sidebar-node-id.ts
  -> shared/navigation/sidebar-node-id.ts
```

`lib/content/navigation/types.ts` はそのまま移すのではなく、**分割**します。

```text
lib/content/navigation/types.ts
  -> shared/navigation/navigation-types.ts
     - NormalizedNotePath
     - NoteNavigationKind
     - BreadcrumbItem
     - NoteNavigationEntry
     - NoteNavigationModel
     - SidebarScope など

  + build/navigation/build-note-navigation-model-input.ts
     - build 側専用入力型があればこちらへ
```

build 側に残すものは次です。

```text
lib/content/navigation/build-note-navigation-model.ts
  -> build/navigation/build-note-navigation-model.ts

lib/content/navigation/resolve-navigation-label.ts
  -> build/navigation/resolve-navigation-label.ts

lib/content/navigation/resolve-sidebar-root.ts
  -> build/navigation/resolve-sidebar-root.ts

lib/content/navigation/index.ts
  -> build/navigation/index.ts
```

---

### 2.3 build へ移すもの

#### Markdown / content pipeline

```text
lib/remark/**
  -> build/markdown/remark/**

lib/rehype/**
  -> build/markdown/rehype/**

lib/content/extract-toc-from-html.ts
  -> build/content/extract-toc-from-html.ts

lib/content/ordering.ts
  -> build/content/ordering.ts

lib/content/note-metadata-contracts.ts
  -> build/content/note-metadata-contracts.ts

lib/content/note-content-contracts.ts
  -> build/content/note-content-contracts.ts

lib/media/image-resolver.ts
  -> build/media/image-resolver.ts
```

#### projection / page model

```text
src/data/projections/corpora-overview-projection.ts
  -> build/projections/corpora-overview-projection.ts

src/data/projections/corpus-page-projection.ts
  -> build/projections/corpus-page-projection.ts

src/data/projections/home-page-projection.ts
  -> build/projections/home-page-projection.ts

src/data/projections/note-hydration-profile.ts
  -> build/projections/note-hydration-profile.ts

src/data/projections/note-page-projection.ts
  -> build/projections/note-page-projection.ts

src/data/projections/tag-page-projection.ts
  -> build/projections/tag-page-projection.ts
```

#### 11ty data 本体

ここは **本体を build に移し、`src/data` は adapter に縮退**させます。

```text
src/data/notes.ts
  -> build/data/notes.ts
  -> src/data/notes.ts は re-export adapter に変更

src/data/home.ts
  -> build/data/home.ts
  -> src/data/home.ts は adapter 化

src/data/clientBundle.ts
  -> build/data/client-bundle.ts
  -> src/data/clientBundle.ts は adapter 化

src/data/tagPages.ts
  -> build/data/tag-pages.ts
  -> src/data/tagPages.ts は adapter 化

src/data/corpusPages.ts
  -> build/data/corpus-pages.ts
  -> src/data/corpusPages.ts は adapter 化

src/data/corporaOverview.ts
  -> build/data/corpora-overview.ts
  -> src/data/corporaOverview.ts は adapter 化
```

adapter の姿はこの程度で十分です。

```ts
// src/data/notes.ts
export { loadNotesData } from '../../build/data/notes.js';
```

#### search build 系

```text
src/lib/search/build/build-pagefind-document-data.ts
  -> build/search/build-pagefind-document-data.ts

src/lib/search/build/build-search-catalog.ts
  -> build/search/build-search-catalog.ts

src/lib/search/build/build-static-explore-response.ts
  -> build/search/build-static-explore-response.ts

src/lib/search/build/emit-search-artifacts.ts
  -> build/search/emit-search-artifacts.ts
```

検索 indexing も build/shared に分けます。

```text
src/lib/search/indexing/catalog-keywords.ts
  -> build/search/indexing/catalog-keywords.ts

src/lib/search/indexing/field-tokenizers.ts
  -> build/search/indexing/field-tokenizers.ts

src/lib/search/indexing/pagefind-aux-text.ts
  -> build/search/indexing/pagefind-aux-text.ts

src/lib/search/indexing/tokenize-text.ts
  -> shared/search/tokenize-text.ts
```

#### SSR / dev support

```text
src/ssr/server-entry.ts
  -> build/ssr/server-entry.ts

src/ssr/target-definitions.ts
  -> build/ssr/target-definitions.ts

src/ssr/targets.ts
  -> build/ssr/targets.ts

lib/ssr/html-transform.ts
  -> build/ssr/html-transform.ts

src/lib/dev-static-directory.ts
  -> build/dev/static-directory-middleware.ts

src/lib/trailing-slash-rewrite.ts
  -> shared/navigation/trailing-slash-rewrite.ts
```

`trailing-slash-rewrite` は build 専用ではなく、**URL 正規化ルールそのもの**なので shared です。

---

### 2.4 runtime として `src/` に残すもの

`src/lib/` は generic すぎるので、**feature 名へ解体**します。

```text
src/lib/router.ts
  -> src/router/index.ts

src/lib/router/**
  -> src/router/**

src/lib/controllers/clickable-controller.ts
  -> src/controllers/clickable-controller.ts

src/lib/controllers/router-controller.ts
  -> src/controllers/router-controller.ts

src/lib/theme/theme-manager.ts
  -> src/theme/theme-manager.ts

src/lib/toc/filter-visible-headings.ts
  -> src/toc/filter-visible-headings.ts

src/lib/toc/toc-active-tracker.ts
  -> src/toc/toc-active-tracker.ts

src/lib/toc/toc-mobile-summary-controller.ts
  -> src/toc/toc-mobile-summary-controller.ts
```

検索 runtime は `src/search/` へ寄せます。

```text
src/lib/search/bootstrap.ts
  -> src/search/bootstrap.ts

src/lib/search/core/**
  -> src/search/core/**

src/lib/search/sources/**
  -> src/search/sources/**

src/lib/search/ranking/**
  -> src/search/ranking/**

src/lib/search/navigation.ts
  -> src/search/navigation.ts

src/lib/search/diagnostics.ts
  -> src/search/diagnostics.ts
```

ただし検索の共有契約は `shared/search/` へ移します。

```text
src/lib/search/search-types.ts
  -> shared/search/search-types.ts

src/lib/search/document-url.ts
  -> shared/search/document-url.ts

src/lib/search/query-preprocessor.ts
  -> shared/search/query-preprocessor.ts

src/lib/search/search-url.ts
  -> shared/search/search-url.ts

src/lib/search/search-catalog.ts
  -> shared/search/search-catalog.ts
```

その結果、runtime の `src/search/**` は `shared/search/**` を読む構造になります。

---

## 3. 移行順序

### Phase 0: import 規則を先に決める

まず規則を文書化します。これを先にやらないと、移動中に再汚染します。

**禁止ルール**

* `build/**` は `src/**` を import してはいけない
* `src/**` は `build/**` を import してはいけない
* `shared/**` は `src/**` / `build/**` を import してはいけない
* UI コンポーネントは shared DTO を定義してはいけない

**許可ルール**

* `build/**` → `shared/**`
* `src/**` → `shared/**`
* `src/layouts/*.11ty.ts` や `src/*.11ty.ts` は `build/**` を読んでよい

  * 理由: それらは runtime ではなく build entry だからです

---

### Phase 1: shared 抽出

ここでは**挙動を変えません**。

1. `shared/note/*` を作る
2. `shared/icons/icon-catalog.ts` を作る
3. `shared/link/link-kind.ts` を作る
4. `shared/navigation/tree-node.ts` を作る
5. `shared/search/*` を作る
6. 旧パスから新 shared パスを re-export する

例:

```ts
// src/types/note-kind.ts
export * from '../../shared/note/note-kind.js';
```

この段階で、`lib/` 内から `src/types/*` を参照する箇所をすべて `shared/*` に切り替えます。
**最初の達成条件は、`lib/** -> src/**` 依存をゼロにすること**です。

---

### Phase 2: build 層の新設

次に `build/` を作り、build 専用本体を移します。

1. `build/markdown/**`
2. `build/content/**`
3. `build/navigation/**`
4. `build/projections/**`
5. `build/search/**`
6. `build/media/**`
7. `build/ssr/**`
8. `build/dev/**`

この段階でも旧パスは薄い shim を残して構いません。

例:

```ts
// lib/content/navigation/index.ts
export * from '../../../build/navigation/index.js';
```

**達成条件**

* `eleventy.config.ts`
* `scripts/apply-lit-ssr.ts`
* `src/*.11ty.ts`
* `src/layouts/*.11ty.ts`

の import 元が `build/**` / `shared/**` に揃うこと。

---

### Phase 3: `src/data` の adapter 化

ここで `src/data` を build 本体から切り離します。

**やること**

* `src/data/projections/**` を削除
* `src/data/*.ts` は `build/data/*.ts` の re-export だけにする
* `eleventy.config.ts` は最終的に `build/data/*.ts` を直接読む

この段階で、`src/data` は「11ty 互換の窓口」でしかなくなります。
最終的には `src/data` 自体を廃止してもよいですが、先に adapter 化した方が安全です。

---

### Phase 4: `src/lib` の解体

ここで runtime 側の generic `lib` を消します。

**順序**

1. `src/lib/router*` → `src/router/**`
2. `src/lib/search/**` → `src/search/**`
3. `src/lib/theme/**` → `src/theme/**`
4. `src/lib/toc/**` → `src/toc/**`
5. `src/lib/controllers/**` → `src/controllers/**`
6. `src/lib/layout/**` → `src/layout/**`
7. `src/lib/error-handler.ts` / `not-found-page.ts` / `url-hash.ts` は適切な feature へ個別移管

**注意点**

* `src/components/**` からの import を順次更新する
* この段階で `src/lib/` は空に近づく
* 最後に `src/lib/` ディレクトリを削除する

---

### Phase 5: config とテストの正規化

最後に補助系を直します。

#### config

* `tsconfig.json`

  * `include` に `build/**/*`, `shared/**/*`
  * `lib/**/*` を削除
* `tsconfig.node.json`

  * 同上
* Vite alias

  * `@shared`
  * `@build`
  * `@` は `src` のままでもよい

例:

```json
{
  "paths": {
    "@/*": ["./src/*"],
    "@build/*": ["./build/*"],
    "@shared/*": ["./shared/*"]
  }
}
```

#### scripts / tests

* `scripts/apply-lit-ssr.ts`

  * `src/ssr/server-entry.ts` → `build/ssr/server-entry.ts`
* `test/ssr/**`

  * `src/ssr/*` 参照を `build/ssr/*` へ
* `test/unit/**`

  * `src/lib/search/*` 等を新パスへ更新

---

## 4. この再編でまず最初に着手すべきファイル

最初の一手は、次の8個です。

```text
src/types/note-kind.ts
src/types/testing-area.ts
src/types/note-surface-policy.ts
src/icons/catalog.ts
src/components/ui/file-tree/file-tree.ts
lib/content/navigation/types.ts
lib/content/navigation/build-note-navigation-model.ts
eleventy.config.ts
```

理由は単純で、ここを触るだけで

* `lib -> src` 依存
* UI 型の build-time 流入
* `src/data` の build 所有
* `lib/` と `src/lib/` の曖昧さ

の四つに同時に手を入れられるからです。

---

## 5. 完了条件

この再編が終わったと判断してよい条件を明文化します。

### 構造

* ルート直下に `lib/` が存在しない
* `src/lib/` が存在しない
* `build/`・`shared/`・`src/` の3層が成立している

### import

* `build/**` から `src/**` への import がゼロ
* `shared/**` から `src/**` / `build/**` への import がゼロ
* `TreeNode` が `src/components/ui/file-tree/file-tree.ts` ではなく `shared/navigation/tree-node.ts` にある

### 11ty / build

* `eleventy.config.ts` が `build/**` と `shared/**` だけを参照して成立する
* `scripts/apply-lit-ssr.ts` が `build/ssr/server-entry.ts` を使う

### 検証

* `pnpm test`
* `pnpm typecheck:node`
* `pnpm dev`
* `pnpm build`

が通る