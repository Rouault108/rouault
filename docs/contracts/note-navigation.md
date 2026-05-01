# Note Navigation Contract

## 1. Status

- Type: Normative
- Source of truth: note projection、breadcrumb builder、sidebar tree builder、route tests
- Applies to: `rawSlug`、`slug`、`permalink`、note page navigation URL、fetch target URL、`directory-index`、breadcrumb、label consumption
- Non-goals: Permanent URL、search canonicalization、sidebar presentation state、`_config.json` input schema

## 2. Ownership

### This Layer Owns

- Note identity と公開 navigation URL の意味論。
- `directory-index` の URL 対応と path 衝突禁止。
- Breadcrumb の階層表現、リンク可否、label consumption。
- note page navigation URL と fetch target URL の境界。

### This Layer Must Not Own

- `_config.json` の固定入力仕様。正本は `docs/contracts/content-config.md`。
- Sidebar presentation / tree state。正本は `docs/contracts/sidebar-state.md`。
- Search の `DocumentCanonicalUrl` / `SearchStateUrl`。正本は `docs/contracts/search.md`。
- Permanent URL / `/archives/{hash}` / hash 生成規則。正本は `docs/contracts/permanent-url.md`。

## 3. Public Contract

### Inputs

- Source file path。
- Note frontmatter。
- Directory `_config.json` から解決された label。
- Note collection の path topology。

### Outputs

- `rawSlug`: ソースファイル実体を識別する内部キー。
- `slug`: 公開 route の canonical key。
- `permalink`: `slug` から導出される note page navigation URL。
- Breadcrumb projection。
- Sidebar tree が参照する note identity。

### Events

- N/A

### DOM / URL / State Contract

- `rawSlug` は UI 表示、公開 URL、breadcrumb、検索結果の基準にしてはならない。
- `slug` は先頭末尾の `/` を除去した正規化済み path である。
- `directory-index` の場合、`slug` は `rawSlug` から末尾 `/index` を除去したものとする。
- `permalink` は `/notes/${slug}` 形式で、末尾スラッシュを含めない。
- note page navigation URL の canonical form は末尾スラッシュなしである。
- history 更新、breadcrumb、sidebar href、note page 間比較には note page navigation URL を使う。
- 表示層に trailing slash 付き note page URL を混在させてはならない。
- note page navigation URL と `DocumentCanonicalUrl` を混同してはならない。
- note page navigation URL と fetch target URL を混同してはならない。
- 静的 HTML の `index.html` 解決に必要な trailing slash 補完は fetch target 解決層だけが行う。

## 4. State Model

### Durable State

- `rawSlug`
- `slug`
- `permalink`
- Directory label
- Page title
- Breadcrumb projection

### Ephemeral State

- N/A

### Derived State

- note page navigation URL。
- fetch target URL。
- Breadcrumb link availability。

### Forbidden Coupling

- `permalink` と表示 label を混同してはならない。
- directory label と page title を混同してはならない。
- trailing slash 補完を `permalink` の canonical 定義へ逆流させてはならない。

## 5. Failure Semantics

- `slug` は公開 route 空間で一意でなければならない。
- `content/<slug>.md` と `content/<slug>/index.md` の併存を禁止する。
- `content/<slug>.md` と `content/<slug>/**` の併存を禁止する。
- Path 衝突は build 時または note collection 構築時にエラーとして拒否する。
- 存在しない directory URL を breadcrumb link として合成してはならない。

## 6. Integration Boundaries

### Build-time

- Note collection は identity、URL、breadcrumb に必要な projection を生成する。

### SSR

- Breadcrumb と sidebar href は canonical note page navigation URL を出力する。

### Client Runtime

- Router は note page navigation URL を history 更新に使い、fetch target URL は取得直前に導出する。

### Hydration

- N/A

### Tests

- URL、breadcrumb、directory-index、path 衝突の検証は `docs/contracts/testing-taxonomy.md` に従う。

## 7. Acceptance Criteria

- `rawSlug`、`slug`、`permalink` の役割が分離されている。
- `directory-index` が routable な directory page として扱われる。
- Breadcrumb の中間 crumb は対応する `directory-index` が存在する場合だけリンクを持つ。
- `directory-index` が現在位置の場合、breadcrumb は当該 directory crumb で終わり、page title crumb を追加しない。
- Directory label は `_config.json.label` を source of truth とし、page title と混同しない。
