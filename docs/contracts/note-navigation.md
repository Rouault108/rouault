# Note Navigation Contract

## 1. Status

- Type: Normative
- Source of truth: note projection、breadcrumb builder、sidebar tree builder、route tests
- Applies to: `rawSlug`、`slug`、`permalink`、note page navigation URL、fetch target URL、`directory-index`、breadcrumb、label consumption
- Non-goals: Permanent URL、search canonicalization、sidebar presentation state、`_config.json` input schema

## 2. Ownership

### This Layer Owns

- Note identityと公開navigation URLの意味論。
- `directory-index`のURL対応とpath衝突禁止。
- Breadcrumbの階層表現、リンク可否、label consumption。
- note page navigation URLとfetch target URLの境界。

### This Layer Must Not Own

- `_config.json`の固定入力仕様。正本は`docs/contracts/content-config.md`。
- Sidebar presentation / tree state。正本は`docs/contracts/sidebar-state.md`。
- Reading chromeのowner / source / trigger境界。正本は`docs/contracts/reading-chrome.md`。
- Searchの`SearchCanonicalPathname` / `SearchStateUrl`。正本は`docs/contracts/search.md`。
- Permanent URL / `/archives/{hash}` / hash生成規則。正本は`docs/contracts/permanent-url.md`。

## 3. Public Contract

### Inputs

- Source file path。
- Note frontmatter。
- Directory `_config.json`から解決されたlabel。
- Note collectionのpath topology。

### Outputs

- `rawSlug`: ソースファイル実体を識別する内部キー。
- `slug`: 公開routeのcanonical key。
- `permalink`: `slug`から導出されるnote page navigation URL。
- Breadcrumb projection。
- Sidebar treeが参照するnote identity。

### Events

- N/A

### DOM / URL / State Contract

- `rawSlug`はUI表示、公開URL、breadcrumb、検索結果の基準にしてはならない。
- `slug`は先頭末尾の`/`を除去した正規化済みpathである。
- `directory-index`の場合、`slug`は`rawSlug`から末尾`/index`を除去したものとする。
- `permalink`は`/notes/${slug}`形式で、末尾スラッシュを含めない。
- note page navigation URLのcanonical formは末尾スラッシュなしである。
- history更新、breadcrumb、sidebar href、note page間比較にはnote page navigation URLを使う。
- 表示層にtrailing slash付きnote page URLを混在させてはならない。
- note page navigation URLと`SearchCanonicalPathname`を混同してはならない。
- note page navigation URLとfetch target URLを混同してはならない。
- 静的HTMLの`index.html`解決に必要なtrailing slash補完はfetch target解決層だけが行う。

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

- `permalink`と表示labelを混同してはならない。
- directory labelとpage titleを混同してはならない。
- trailing slash補完を`permalink`のcanonical定義へ逆流させてはならない。

## 5. Failure Semantics

- `slug`は公開route空間で一意でなければならない。
- `content/<slug>.md`と`content/<slug>/index.md`の併存を禁止する。
- `content/<slug>.md`と`content/<slug>/**`の併存を禁止する。
- Path衝突はbuild時またはnote collection構築時にエラーとして拒否する。
- 存在しないdirectory URLをbreadcrumb linkとして合成してはならない。

## 6. Integration Boundaries

### Build-time

- Note collectionはidentity、URL、breadcrumbに必要なprojectionを生成する。

### SSR

- Breadcrumbとsidebar hrefはcanonical note page navigation URLを出力する。

### Client Runtime

- Routerはnote page navigation URLをhistory更新に使い、fetch target URLは取得直前に導出する。

### Hydration

- Reading chromeのTOC owner / source / trigger markerはbuild-time projectionとruntime hydrationの接続点として扱う。
- Stage 7完了前のTOC reservationはfail-closed skeletonであり、owner validationの完了とはみなさない。
- Headerの`tocPresence`と`tocRuntimeId`はnavigation artifactへ投影するが、interactive triggerの可否はreservation stateと分離する。
- Reading chromeのcurrent DOM、density tier、mobile panel cloneはnote identityやnote page navigation URLの意味を変更しない。

### Tests

- URL、breadcrumb、directory-index、path衝突の検証は`docs/contracts/testing-taxonomy.md`に従う。

## 7. Acceptance Criteria

- `rawSlug`、`slug`、`permalink`の役割が分離されている。
- `directory-index`がroutableなdirectory pageとして扱われる。
- Breadcrumbの中間crumbは対応する`directory-index`が存在する場合だけリンクを持つ。
- `directory-index`が現在位置の場合、breadcrumbは当該directory crumbで終わり、page title crumbを追加しない。
- Directory labelは`_config.json.label`をsource of truthとし、page titleと混同しない。
