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
  - `src/lib/trailing-slash-rewrite.ts`
  - `src/lib/search/normalize-search-result-url.ts`

---

# 1. 目的

本契約は、Rouault における note のパス正規化、sidebar 構築、breadcrumb 構築、および trailing slash 正規化の責務分担を明確化することを目的とする。

特に、次の論点を先に固定する。

- `rawSlug` と `slug` の役割分担
- `directory-index` の意味
- sidebar ノード ID の生成規則
- ディレクトリ行の振る舞い
- breadcrumb におけるディレクトリ crumb のリンク可否
- trailing slash 正規化の責務位置

---

# 2. 用語定義

## 2.1 `rawSlug`

ソースファイル実体を識別する内部キー。

## 2.2 `slug`

公開 URL・ルーティング・breadcrumb・sidebar 選択状態の基準となる正規化済みキー。

## 2.3 `permalink`

`slug` から導出される canonical URL。

## 2.4 `TreeNode.id`

sidebar UI の内部状態管理に用いる stable ID。

---

# 3. Note path normalization 契約

## 3.1 `rawSlug` の役割

1. `rawSlug` は内部用識別子であり、ソースファイル実体を表す。
2. `rawSlug` は UI 表示、公開 URL、breadcrumb、検索結果の基準として用いてはならない。
3. `directory-index` の場合のみ `rawSlug` は `/<dir>/index` 形式を取りうる。

## 3.2 `slug` の役割

1. `slug` は公開ルートの canonical key とする。
2. `slug` は先頭末尾の `/` を除去した正規化済み path とする。
3. `directory-index` の場合、`slug` は `rawSlug` から末尾 `/index` を除去したものとする。
4. 公開ナビゲーションは `slug` を基準に構築しなければならない。

## 3.3 `permalink`

1. `permalink` は `slug` から導出される canonical URL とする。
2. `permalink` は `/notes/${slug}` 形式とする。
3. `permalink` は末尾スラッシュを含めない。

## 3.4 一意性

1. `slug` は公開ルート空間で一意でなければならない。
2. ルーティング上の衝突判定は `slug` 単位で行う。

---

# 4. `directory-index` 契約

## 4.1 定義

1. `content/<dir>/index.md` は `directory-index` として扱う。
2. `directory-index` は、あるディレクトリ自体を表す note ページ実体である。
3. `directory-index` は通常 note と同様に routable なページである。

## 4.2 URL 対応

1. `directory-index` の公開 URL は、そのディレクトリ path 自体とする。
2. 例: `content/testing/index.md` は `/notes/testing` に対応する。

## 4.3 設計上の意味

1. 子 note を持つ path そのものをページ化したい場合、`directory-index` を用いる。
2. ディレクトリ自体のページ化は `directory-index` を唯一の正規手段とする。

## 4.4 禁止事項

1. `content/<slug>.md` と `content/<slug>/index.md` の併存を禁止する。
2. `content/<slug>.md` と `content/<slug>/**` の併存も禁止する。
   - 理由: sidebar 構築上、leaf note と directory container の ID 空間が衝突しうるため。

---

# 5. Sidebar node identity 契約

## 5.1 ID 生成規則

1. ディレクトリコンテナノードの ID は `directoryPath` とする。
2. 通常 note ノードの ID は `slug` とする。
3. `directory-index` ノードの ID は `${directoryPath}/__index__` とする。

## 5.2 性質

1. `TreeNode.id` は stable でなければならない。
2. `TreeNode.id` は URL ではなく、sidebar UI 状態管理キーである。
3. `TreeNode.id` は trailing slash を含まない。

## 5.3 予約語

1. `__index__` は sidebar 内部予約接尾辞とする。
2. ユーザーコンテンツの slug 空間において、`__index__` を意味的に衝突しうる形で使用してはならない。

## 5.4 展開状態の保存

1. sidebar の展開状態永続化は `TreeNode.id` を基準に行う。
2. 展開状態の保存キー設計は `slug` と `directoryPath` の安定性に依存する。

---

# 6. Sidebar navigation behavior 契約

## 6.1 ディレクトリ行の役割

1. ディレクトリコンテナ行は非リンクとする。
2. ディレクトリコンテナ行は構造提示および開閉状態の担い手である。
3. ディレクトリページへの遷移は、対応する `directory-index` ノードから行う。

## 6.2 ノード種別ごとの振る舞い

- ディレクトリコンテナノード: 構造ノード、非リンク
- `directory-index` ノード: クリック可能なページノード
- 通常 leaf note ノード: クリック可能なページノード

## 6.3 操作上の原則

1. ディレクトリコンテナ行はリンク遷移を行わない。
2. 行クリックで開閉するかどうかは別論点だが、本契約では最低限「非リンクの構造ノード」であることを固定する。

---

# 7. Breadcrumb behavior 契約

## 7.1 基本原則

1. breadcrumb は note path の階層表現である。
2. 最終 crumb は常に現在位置を表し、リンクを持たない。

## 7.2 `Notes` crumb

1. `Notes` crumb は常にルートへのリンクを持つ。

## 7.3 中間ディレクトリ crumb

1. 中間ディレクトリ crumb は、対応する `directory-index` が存在する場合のみリンクを持つ。
2. 対応する `directory-index` が存在しない場合、中間ディレクトリ crumb は plain text とする。
3. breadcrumb にディレクトリを含めることと、必ずクリック可能であることは同義ではない。

## 7.4 一貫性原則

1. breadcrumb のリンク可否は、存在しないディレクトリ URL を合成してはならない。
2. breadcrumb のリンク規則は sidebar のディレクトリページ表現と整合していなければならない。

---

# 8. Trailing slash normalization 契約

## 8.1 Canonical URL

1. Rouault の note URL canonical form は末尾スラッシュなしとする。
2. 例: `/notes/testing` を正とし、`/notes/testing/` は canonical ではない。

## 8.2 表示・比較層の責務

1. history 更新、breadcrumb、sidebar href、検索結果 URL、内部比較は canonical URL を用いる。
2. 表示層に trailing slash 付き URL を混在させてはならない。

## 8.3 取得層の責務

1. 静的 HTML の `index.html` 解決のため trailing slash が必要な場合、取得直前の層だけが trailing slash を補ってよい。
2. trailing slash 補完は canonical URL 定義を書き換えるものではない。

## 8.4 禁止事項

1. data 層で trailing slash 付き `permalink` を保持してはならない。
2. breadcrumb・sidebar・検索結果ごとに別々の canonicalization 規則を持ってはならない。
3. 取得用 URL と表示用 URL を混同してはならない。

---

# 9. 実装上の読み替え

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

- `src/lib/trailing-slash-rewrite.ts`
  - 直接アクセス時の rewrite 補助

- `src/lib/search/normalize-search-result-url.ts`
  - 検索結果 URL の canonicalization

---

# 10. 本契約に基づく運用制約

## 10.1 コンテンツ配置制約

1. 同一 path について、leaf note と directory container の二重意味を持たせてはならない。
2. `content/a/b.md` と `content/a/b/c.md` のような構成は禁止する。
3. ディレクトリ自体をページ化したい場合は `content/a/b/index.md` を置く。

## 10.2 ナビゲーション制約

1. sidebar でリンク可能なのはページノードのみとする。
2. breadcrumb の中間 directory crumb は、実在ページがある場合のみリンク可能とする。

## 10.3 URL 制約

1. canonical URL は末尾スラッシュなしで統一する。
2. 取得都合による trailing slash 補完は内部処理に限定する。

---

# 11. 未解決論点・矛盾箇所・不明瞭箇所

## 11.1 `directory-index` のタイトルが nav 表示に使われていない

現状では、`directory-index` が存在しても sidebar / breadcrumb のラベルは path segment ベースで構成されやすく、note の `title` を直接使う契約になっていない。

### 要判断

- 現状維持: nav ラベルは常に path segment ベース
- 改善案: `directory-index` がある場合は `note.title` を優先

この論点は、情報設計・国際化・人手で付与したタイトルの反映方針に関わるため、別途明示契約が必要である。

## 11.2 `content/<slug>.md` と `content/<slug>/**` の衝突禁止が暗黙知のまま

実装上は危険だが、明文化されていない。

### 必要措置

- 契約本文へ明記
- 可能であれば `src/data/notes.ts` 側で検出エラー化

## 11.3 `__index__` が内部予約語として未明文化

sidebar 側では事実上予約語であるが、コンテンツ仕様として明文化されていない。

### 必要措置

- コンテンツ命名規則に予約語制約を追加

## 11.4 「ディレクトリ行は開閉専用」という表現の曖昧さ

現状実装に即して正確に述べるなら、「ディレクトリ行は非リンクの構造ノード」である。開閉操作の具体トリガーまでは、この契約では固定していない。

## 11.5 trailing slash 正規化責務が複数箇所に分散している

思想は一貫しているが、実装責務は分散している。

### 改善余地

- URL 正規化規則を単一ユーティリティに集約する余地がある。

---

# 12. 推奨する最終固定方針

現状実装との整合性を優先するなら、次を固定方針とする。

1. `rawSlug` は内部識別子、`slug` は公開識別子とする。
2. ディレクトリのページ化は `directory-index` のみで行う。
3. sidebar のディレクトリ行は非リンクの構造ノードとする。
4. breadcrumb の中間ディレクトリは、`directory-index` がある場合のみリンク可能とする。
5. canonical URL は末尾スラッシュなしとし、取得時のみ内部的に trailing slash を補う。
6. `content/<slug>.md` と `content/<slug>/**` の併存を禁止する。
7. `__index__` を内部予約語として明文化する。

---

# 13. 今後の追加論点

必要であれば、次の契約も続けて文書化する。

- `directory-index` の `title` を sidebar / breadcrumb 表示に反映するか
- breadcrumb 表示ラベルの source of truth をどこに置くか
- sidebar ノード ID を外部公開 API と見なすか、内部実装詳細に留めるか
- URL 正規化ユーティリティの集約方針
- note / directory / breadcrumb の命名規則と禁止パターン
