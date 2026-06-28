# Corpus Contract

## 1. Status

- Type: Normative
- Source of truth: content projection、corpus route generation、header switcher tests、`build/projections/corpora-overview-projection.ts`、`src/layouts/corpora-overview-html.ts`、`src/corpora-index.11ty.ts`、`test/ssr/corpora-index-template.test.ts`、`test/ssr/corpora-overview-data.test.ts`
- Applies to: corpus定義、URL契約、header corpus switcher、`/corpora/`overview/index route
- Non-goals: corpus作成手順、genre taxonomy、note URL契約

## 2. Ownership

### This Layer Owns

- corpusの定義。
- `corpusKey`の意味。
- `/corpora/{corpusKey}/`のURL契約。
- `/corpora/`がコーパス索引であること。
- corpus一覧の対象と非対象。
- corpora surface対象ノート数としての`noteCount`。
- header corpus switcherの責務境界。

### This Layer Must Not Own

- `_config.json`の入力仕様。正本は`docs/contracts/content-config.md`。
- corpus作成手順。`docs/guides/corpus.md`を参照する。
- note page navigation URL。正本は`docs/contracts/note-navigation.md`。
- URL分類の横断意味論。正本は`docs/contracts/url-policy.md`。
- 最近更新ノート一覧。現行責務は`docs/contracts/home.md`を参照する。
- 全ノート全件一覧。

## 3. Public Contract

### Inputs

- Content directory。
- Directory config。
- Corpus projection source。

### Outputs

- Corpus list。
- Corpora overview route。
- Corpus page route。
- Header switcher projection。

### Events

- Header switcherのUI eventはUI layerが所有する。

### DOM / URL / State Contract

- corpusは閲覧対象のまとまりであり、genreではない。
- `corpusKey`はcorpus routeとswitcher stateのstable keyである。
- `/corpora/`は全ノート一覧ではなく、corpora surface対象ノートをコーパス単位で辿る索引である。
- `/corpora/`の`noteCount`はcorpora surface対象ノート数として扱う。
- `/corpora/`overviewの公開コーパス一覧は`corpus index row`として描画する。
- `/corpora/`overviewは`result-card`を所有しない。
- `/corpora/`overviewの各`corpus index row`は単一の内部文書navigation linkである。
- `/corpora/`overviewの`data-link-surface="navigation"`は、内部文書への索引行リンクであることを示す。
- この`navigation`指定は、header/footer/sidebarのnavigation component契約を再定義しない。
- Corpus contractは最近更新ノート一覧を所有しない。最近更新ノート一覧の現行責務は`docs/contracts/home.md`が扱う。
- Corpus page URLは`/corpora/{corpusKey}/`とする。
- `/corpora/`と`/corpora/{corpusKey}/`はSurface URLであり、slash付きcanonicalである。
- note permalinkのslashless方針をcorpus URLへ適用してはならない。
- Header corpus switcherはcorpus間移動の入口であり、route stateの正本を持たない。

## 4. State Model

### Durable State

- Corpus key。
- Corpus label。
- Corpus route。

### Ephemeral State

- Switcher open state。

### Derived State

- Current corpus。
- Corpus list ordering。

### Forbidden Coupling

- corpusとgenreを同一概念として扱ってはならない。
- Header switcherがrouter stateを独自に再定義してはならない。

## 5. Failure Semantics

- Unknown corpus keyはnot foundまたは安全なfallbackとして扱う。
- 無効なcorpus projectionはbuild-timeで検出する。

## 6. Integration Boundaries

### Build-time

- Corpus projectionとcorpus routeを生成する。
- Corpora overview projectionはcorpora surface対象ノート数と最新更新日をcorpus page projectionから導出する。

### SSR

- Header switcherはno-JS baselineで遷移可能なlinkを持つ。

### Client Runtime

- Switcherは表示と選択操作だけを担う。

### Hydration

- Switcher hydrationはscheduler / registryに従う。

### Tests

- URL契約、overview route、switcher boundaryは`docs/contracts/testing-taxonomy.md`に従って検証する。

## 7. Acceptance Criteria

- Corpus URL契約がGuideだけに置かれていない。
- corpusとgenreが分離されている。
- `/corpora/`が全ノート一覧ではなくコーパス索引として定義されている。
- corpus contractが最近更新ノート一覧と全ノート全件一覧を所有しない。
- Header corpus switcherの責務境界が明確である。
