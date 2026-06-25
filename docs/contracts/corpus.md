# Corpus Contract

## 1. Status

- Type: Normative
- Source of truth: content projection、corpus route generation、header switcher tests
- Applies to: corpus定義、URL契約、header corpus switcher
- Non-goals: corpus作成手順、genre taxonomy、note URL契約

## 2. Ownership

### This Layer Owns

- corpusの定義。
- `corpusKey`の意味。
- `/corpora/{corpusKey}/`のURL契約。
- corpus一覧の対象と非対象。
- header corpus switcherの責務境界。

### This Layer Must Not Own

- `_config.json`の入力仕様。正本は`docs/contracts/content-config.md`。
- corpus作成手順。`docs/guides/corpus.md`を参照する。
- note page navigation URL。正本は`docs/contracts/note-navigation.md`。

## 3. Public Contract

### Inputs

- Content directory。
- Directory config。
- Corpus projection source。

### Outputs

- Corpus list。
- Corpus page route。
- Header switcher projection。

### Events

- Header switcherのUI eventはUI layerが所有する。

### DOM / URL / State Contract

- corpusは閲覧対象のまとまりであり、genreではない。
- `corpusKey`はcorpus routeとswitcher stateのstable keyである。
- Corpus page URLは`/corpora/{corpusKey}/`とする。
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

### SSR

- Header switcherはno-JS baselineで遷移可能なlinkを持つ。

### Client Runtime

- Switcherは表示と選択操作だけを担う。

### Hydration

- Switcher hydrationはscheduler / registryに従う。

### Tests

- URL契約とswitcher boundaryは`docs/contracts/testing-taxonomy.md`に従って検証する。

## 7. Acceptance Criteria

- Corpus URL契約がGuideだけに置かれていない。
- corpusとgenreが分離されている。
- Header corpus switcherの責務境界が明確である。
