# Home Contract

## 1. Status

- Type: Normative
- Source of truth: `build/projections/home-page-projection.ts`、`src/index.11ty.ts`、`src/assets/css/home-page.css`、`test/ssr/home-template.test.ts`、`test/ssr/static-css-contracts.test.ts`
- Applies to: top page route`/`、home hero、home feed、home metadata links
- Non-goals: corpus index、all-notes archive、search result list

## 2. Ownership

### This Layer Owns

- トップページ`/`の導入文脈。
- Rouaultの公開ノートを最近の更新から読み始める入口。
- `HomePageData.notes`を描画する`最近の更新`section。
- `/corpora/`、`/search/`、`/about/`へのmetadata導線。

### This Layer Must Not Own

- Corpus index。正本は`docs/contracts/corpus.md`。
- 全ノート全件一覧。
- 検索結果一覧。正本は`docs/contracts/search.md`。
- `HomePageData.notes`の件数、並び順、上限の決定。正本は`buildHomePageProjection()`。

## 3. Public Contract

### Inputs

- `HomePageData.publicNoteCount`。
- `HomePageData.latestUpdatedDate`。
- `HomePageData.notes`。

### Outputs

- Rouaultの導入hero。
- 最近の更新feed。
- metadata導線。

### DOM/URL/State Contract

- トップページ`/`はRouaultの導入と最近の更新を担う。
- `最近の更新`sectionは`HomePageData.notes`を描画する。
- `HomePageData.notes`の件数、並び順、上限は`buildHomePageProjection()`が所有する。
- metadata導線は`/corpora/`、`/search/`、`/about/`への控えめな内部リンクとして出力する。
- metadata導線は`home-meta-link link-text link-text--muted`を持つ。
- metadata導線は`data-link-kind="internal-document"`と`data-link-surface="metadata"`を持つ。
- metadata導線はCTAbuttonではなく、本文の静けさを妨げないtext linkとして扱う。
- metadata導線の視覚外観はDesign Systemのmetadata muted text link variantが所有する。
- home pageはmetadata導線のhref、順序、文言、存在を所有する。
- home page CSSはmetadata linkの色、下線、focus ringを再所有しない。
- metadata導線は通常時、visited時、touch環境でprimary色へ昇格しない。
- metadata導線は常時下線でリンク識別を担保する。
- home leadは本文用reading measureを直接参照せず、home固有のlead measureを使う。
- home leadは短い導入文として自然な折り返しを優先し、終端の短い語尾だけが孤立しない構造を持つ。
- home leadの組版契約はhome hero内に閉じ、metadata導線、home feed、global reading measureを再所有しない。
- トップページはcorpus index、全ノート全件一覧、検索結果一覧を所有しない。

## 4. Integration Boundaries

### Build-time

- `buildHomePageProjection()`が公開ノート数、最新更新日、home feed項目を構築する。

### SSR

- `src/index.11ty.ts`がstatic HTMLとしてhero、metadata導線、最近の更新feedを出力する。

### Client Runtime

- トップページ固有のclient stateを持たない。

### Tests

- `test/ssr/home-template.test.ts`がhome templateのDOM契約を検証する。
- `test/ssr/static-css-contracts.test.ts`がhome lead CSS契約を検証する。

## 5. Acceptance Criteria

- `/`のh1とleadがRouaultの静かな導入文脈を維持する。
- `最近の更新`sectionが`HomePageData.notes`を描画する。
- feed metaが表示件数と公開ノート数を示す。
- `/corpora/`、`/search/`、`/about/`へのmetadata導線が存在する。
- metadata導線は`home-meta-link link-text link-text--muted`を持つ。
- metadata導線は`data-link-kind="internal-document"`と`data-link-surface="metadata"`を持つ。
- metadata導線は通常時、visited時、touch環境でprimary色へ昇格しない。
- metadata導線は常時下線でリンク識別を担保する。
- home leadがhome固有のlead measureを使い、global reading measureへ直接依存しない。
- home leadの終端意味単位が短い孤立行になりにくい構造を持つ。
- トップページがcorpus index、全ノート全件一覧、検索結果一覧を所有しない。
