# Rouault 契約草案: note 正規化 / sidebar / breadcrumb

## 対象

- `src/data/notes.ts`
- `src/components/layout/layout-sidebar.ts`
- `src/components/ui/file-tree/file-tree.ts`
- 関連する breadcrumb 生成部
- 周辺実装:
  - `lib/content/build-sidebar-tree.ts`
  - `lib/content/build-breadcrumbs.ts`
  - `src/layouts/NoteLayout.11ty.ts`
  - `src/lib/router.ts`
  - `docs/router-specification.md`
  - `src/lib/trailing-slash-rewrite.ts`
  - `src/lib/search/normalize-search-result-url.ts`

---

## 1. 目的

本契約は、Rouault における note のパス正規化、sidebar 構築、breadcrumb 構築、および trailing slash 正規化の責務分担を明確化することを目的とする。

特に、次の論点を先に固定する。

- `rawSlug` と `slug` の役割分担
- `directory-index` の意味
- sidebar ノード ID の生成規則
- ディレクトリ行の振る舞い
- breadcrumb におけるディレクトリ crumb のリンク可否
- trailing slash 正規化の責務位置

---

## 2. 用語定義

### 2.1 `rawSlug`

ソースファイル実体を識別する内部キー。

### 2.2 `slug`

公開 URL・ルーティング・breadcrumb・sidebar 選択状態の基準となる正規化済みキー。

### 2.3 `permalink`

`slug` から導出される、note page 用の navigation URL。
本契約における `permalink` は note page に対する canonical URL を指し、`docs/search-specification.md` における `DocumentCanonicalUrl` および `SearchStateUrl` とは別概念とする。

### 2.4 `TreeNode.id`

sidebar UI の内部状態管理に用いる stable ID。

---

## 3. Note path normalization 契約

### 3.1 `rawSlug` の役割

1. `rawSlug` は内部用識別子であり、ソースファイル実体を表す。
2. `rawSlug` は UI 表示、公開 URL、breadcrumb、検索結果の基準として用いてはならない。
3. `directory-index` の場合のみ `rawSlug` は `/<dir>/index` 形式を取りうる。

### 3.2 `slug` の役割

1. `slug` は公開ルートの canonical key とする。
2. `slug` は先頭末尾の `/` を除去した正規化済み path とする。
3. `directory-index` の場合、`slug` は `rawSlug` から末尾 `/index` を除去したものとする。
4. 公開ナビゲーションは `slug` を基準に構築しなければならない。

### 3.3 `permalink`

1. `permalink` は `slug` から導出される canonical URL とする。
2. `permalink` は `/notes/${slug}` 形式とする。
3. `permalink` は末尾スラッシュを含めない。

### 3.4 一意性

1. `slug` は公開ルート空間で一意でなければならない。
2. ルーティング上の衝突判定は `slug` 単位で行う。

---

## 4. `directory-index` 契約

### 4.1 定義

1. `content/<dir>/index.md` は `directory-index` として扱う。
2. `directory-index` は、あるディレクトリ自体を表す note ページ実体である。
3. `directory-index` は通常 note と同様に routable なページである。

### 4.2 URL 対応

1. `directory-index` の公開 URL は、そのディレクトリ path 自体とする。
2. 例: `content/testing/index.md` は `/notes/testing` に対応する。

### 4.3 設計上の意味

1. 子 note を持つ path そのものをページ化したい場合、`directory-index` を用いる。
2. ディレクトリ自体のページ化は `directory-index` を唯一の正規手段とする。

### 4.4 禁止事項

1. `content/<slug>.md` と `content/<slug>/index.md` の併存を禁止する。
2. `content/<slug>.md` と `content/<slug>/**` の併存も禁止する。
   - 理由: sidebar 構築上、leaf note と directory container の ID 空間が衝突しうるため。
3. 実装は、上記の path 衝突を build 時または note collection 構築時に検出し、エラーとして拒否しなければならない。

---

## 5. Sidebar node identity 契約

### 5.1 ID 生成規則

1. ディレクトリコンテナノードの ID は `directoryPath` とする。
2. 通常 note ノードの ID は `slug` とする。
3. `directory-index` ノードの ID は `${directoryPath}/__index__` とする。

### 5.2 性質

1. `TreeNode.id` は stable でなければならない。
2. `TreeNode.id` は URL ではなく、sidebar UI 状態管理キーである。
3. `TreeNode.id` は trailing slash を含まない。
4. `TreeNode.id` は sidebar UI の内部実装詳細であり、公開 URL、authoring 契約、検索結果識別子、外部連携 API の安定識別子として扱ってはならない。
5. 外部に公開してよい識別子は `slug` および `permalink` に限る。

### 5.3 予約語

1. `__index__` は sidebar 内部予約接尾辞とする。
2. ユーザーコンテンツの slug 空間において、`__index__` を意味的に衝突しうる形で使用してはならない。

### 5.4 展開状態の保存

1. sidebar の展開状態永続化は `TreeNode.id` を基準に行う。
2. 展開状態の保存キー設計は `slug` と `directoryPath` の安定性に依存する。

---

## 6. Sidebar navigation behavior 契約

### 6.1 ディレクトリ行の役割

1. ディレクトリコンテナ行は非リンクとする。
2. ディレクトリコンテナ行は構造提示および開閉状態の担い手である。
3. ディレクトリページへの遷移は、対応する `directory-index` ノードから行う。

### 6.2 ノード種別ごとの振る舞い

- ディレクトリコンテナノード: 構造ノード、非リンク
- `directory-index` ノード: クリック可能なページノード
- 通常 leaf note ノード: クリック可能なページノード

### 6.3 操作上の原則

1. ディレクトリコンテナ行はリンク遷移を行わない。
2. 行クリックで開閉するかどうかは別論点だが、本契約では最低限「非リンクの構造ノード」であることを固定する。

---

## 7. Breadcrumb behavior 契約

### 7.1 基本原則

1. breadcrumb は note path の階層表現である。
2. 最終 crumb は常に現在位置を表し、リンクを持たない。

### 7.2 `Notes` crumb

1. `Notes` crumb は常にルートへのリンクを持つ。

### 7.3 中間ディレクトリ crumb

1. 中間ディレクトリ crumb は、対応する `directory-index` が存在する場合のみリンクを持つ。
2. 対応する `directory-index` が存在しない場合、中間ディレクトリ crumb は plain text とする。
3. breadcrumb にディレクトリを含めることと、必ずクリック可能であることは同義ではない。

### 7.4 一貫性原則

1. breadcrumb のリンク可否は、存在しないディレクトリ URL を合成してはならない。
2. breadcrumb のリンク規則は sidebar のディレクトリページ表現と整合していなければならない。

### 7.5 Navigation label resolution 契約

#### 7.5.1 基本原則

1. sidebar と breadcrumb の表示ラベル解決規則は共有されなければならない。
2. 同一の directory path に対して、sidebar と breadcrumb が異なる source of truth を用いてはならない。
3. path segment 由来ラベルは表示ラベルの最終 source of truth ではなく、フォールバック手段である。
4. 表示ラベルの解決規則は、内部識別子である `slug`、`rawSlug`、`TreeNode.id` の生成規則と独立に定義されなければならない。

#### 7.5.2 通常 note の表示ラベル

1. 通常 note ノードの表示ラベルは `note.title` とする。
2. 通常 note に対応する breadcrumb 最終 crumb の表示ラベルは `note.title` とする。

#### 7.5.3 `directory-index` が存在するディレクトリの表示ラベル

1. あるディレクトリ path に対応する `directory-index` が存在する場合、そのディレクトリを表す表示ラベルの source of truth は当該 `directory-index` の `note.title` とする。
2. sidebar 上の `directory-index` ページノードの表示ラベルは、当該 `directory-index` の `note.title` を用いなければならない。
3. breadcrumb において当該ディレクトリを表す crumb の表示ラベルは、当該 `directory-index` の `note.title` を用いなければならない。
4. 当該 `directory-index` 自身が現在位置である場合、breadcrumb 最終 crumb の表示ラベルも当該 `directory-index` の `note.title` とする。
5. `directory-index` の存在時に path segment 由来ラベルを優先してはならない。

#### 7.5.4 `directory-index` が存在しないディレクトリの表示ラベル

1. 対応する `directory-index` が存在しないディレクトリについては、path segment から導出した正規化ラベルを表示ラベルとして用いてよい。
2. この場合、breadcrumb と sidebar は同一のラベル解決規則を用いなければならない。
3. path segment からのラベル導出規則を複数実装で別々に持ってはならない。

#### 7.5.5 一貫性原則

1. 記事ヘッダー、sidebar 上のページノード、breadcrumb 上の現在位置が同一 note 実体を指す場合、それらの表示ラベルは同一の `note.title` に収束しなければならない。
2. `directory-index` を持つディレクトリについて、記事ヘッダーでは `note.title` を表示しつつ、sidebar または breadcrumb では path segment 由来ラベルを表示することを禁止する。
3. 内部識別子の安定性確保を理由として、表示ラベルの source of truth を path segment に固定してはならない。

---

## 8. Note navigation URL normalization 契約

### 8.1 対象範囲

1. 本章は、note page に対する navigation URL の canonical form を定義する。
2. 本章は `docs/router-specification.md` における navigation URL / fetch target URL の責務境界と整合しなければならない。
3. 本章は `docs/search-specification.md` における `DocumentCanonicalUrl` および `SearchStateUrl` を定義しない。
4. `/search`、`/tags/<tag>/`、`/archives/{hash}` のような非 note route の URL 規則は、本章の対象外とする。

### 8.2 Note navigation URL canonical form

1. Rouault の note page navigation URL canonical form は末尾スラッシュなしとする。
2. 例: `/notes/testing` を正とし、`/notes/testing/` は note page navigation URL の canonical form ではない。
3. `permalink` は常にこの canonical form で保持しなければならない。

### 8.3 表示・比較層の責務

1. history 更新、breadcrumb、sidebar href、note page 間の内部比較には note page navigation URL を用いる。
2. 検索結果表示は `docs/search-specification.md` の `url` / `canonicalUrl` / `pathLabel` 契約に従わなければならない。
3. 検索結果表示において、`DocumentCanonicalUrl` を note page navigation URL と同一視してはならない。
4. 表示層に trailing slash 付き note page URL を混在させてはならない。

### 8.4 取得層の責務

1. 静的 HTML の `index.html` 解決のため trailing slash が必要な場合、取得直前の層だけが trailing slash を補ってよい。
2. trailing slash 補完は note page navigation URL の canonical 定義を書き換えるものではない。
3. fetch target URL は `docs/router-specification.md` の責務境界に従って扱わなければならない。

### 8.5 禁止事項

1. data 層で trailing slash 付き `permalink` を保持してはならない。
2. note page navigation URL と fetch target URL を混同してはならない。
3. note page navigation URL と `DocumentCanonicalUrl` を混同してはならない。
4. note page 用の canonicalization 規則と検索用の canonicalization 規則を単一の意味論として統合してはならない。

---

## 9. 実装上の読み替え

本契約に基づく実装上の役割分担は次のとおりである。

- `src/data/notes.ts`
  - `rawSlug` / `slug` / `permalink` の正規化
  - `directory-index` 判定
  - 公開ルート衝突の検査

- `lib/content/build-sidebar-tree.ts`
  - sidebar 構造ノードおよびページノードの構築
  - `TreeNode.id` の生成
  - `directory-index` を sidebar 上のページノードへ写像

- `lib/content/build-breadcrumbs.ts`
  - breadcrumb 構築
  - 中間ディレクトリ crumb のリンク可否判定

- `src/lib/router.ts`
  - クライアント側 pathname 正規化
  - canonical URL ベースの遷移制御
  - 取得直前の trailing slash 補完

- `docs/router-specification.md`
  - router 公開契約の正規仕様
  - navigation URL と fetch target URL の責務境界

- `src/lib/trailing-slash-rewrite.ts`
  - 直接アクセス時の rewrite 補助

- `src/lib/search/normalize-search-result-url.ts`
  - 検索結果 URL の canonicalization

### 9.1 URL ownership boundary

1. note page 用の navigation URL 規則は、本契約および `docs/router-specification.md` が所有する。
2. 検索結果項目の `DocumentCanonicalUrl`、表示用 `pathLabel`、検索状態 URL である `SearchStateUrl` の規則は `docs/search-specification.md` が所有する。
3. URL 正規化の実装は分散していてよいが、各 URL family は単一の契約文書と単一の ownership を持たなければならない。
4. 単一の巨大 URL 正規化ユーティリティへ全規則を集約することは、本契約の要求ではない。
5. 実装の集約を行う場合も、note page navigation URL、fetch target URL、`DocumentCanonicalUrl`、`SearchStateUrl` の意味論を混同してはならない。

---

## 10. 本契約に基づく運用制約

### 10.1 コンテンツ配置制約

1. 同一 path について、leaf note と directory container の二重意味を持たせてはならない。
2. `content/a/b.md` と `content/a/b/c.md` のような構成は禁止する。
3. ディレクトリ自体をページ化したい場合は `content/a/b/index.md` を置く。
4. コンテンツ作者は、path segment、slug、ディレクトリ名、または note 名において `__index__` と意味的に衝突しうる命名をしてはならない。
5. `slug`、`directoryPath`、`permalink`、`TreeNode.id` の識別子契約と、`note.title` および path segment 由来ラベルの表示契約は分離して扱わなければならない。
6. `note.title`、breadcrumb 表示ラベル、sidebar 表示ラベルは表示用であり、公開識別子または内部状態識別子の代替として扱ってはならない。
7. note / directory / breadcrumb の表示ラベル解決規則は `7.5 Navigation label resolution 契約` が所有し、author-facing な詳細な命名ガイドラインは別文書で所有してよい。

### 10.2 ナビゲーション制約

1. sidebar でリンク可能なのはページノードのみとする。
2. breadcrumb の中間 directory crumb は、実在ページがある場合のみリンク可能とする。

### 10.3 URL 制約

1. canonical URL は末尾スラッシュなしで統一する。
2. 取得都合による trailing slash 補完は内部処理に限定する。
