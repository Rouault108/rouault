# Corpus Contract

## 1. Status

- Type: Normative
- Source of truth: content projection、corpus route generation、header switcher tests
- Applies to: corpus 定義、URL 契約、header corpus switcher
- Non-goals: corpus 作成手順、genre taxonomy、note URL 契約

## 2. Ownership

### This Layer Owns

- corpus の定義。
- `corpusKey` の意味。
- `/corpora/{corpusKey}/` の URL 契約。
- corpus 一覧の対象と非対象。
- header corpus switcher の責務境界。

### This Layer Must Not Own

- `_config.json` の入力仕様。正本は `docs/contracts/content-config.md`。
- corpus 作成手順。`docs/guides/corpus.md` を参照する。
- note page navigation URL。正本は `docs/contracts/note-navigation.md`。

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

- Header switcher の UI event は UI layer が所有する。

### DOM / URL / State Contract

- corpus は閲覧対象のまとまりであり、genre ではない。
- `corpusKey` は corpus route と switcher state の stable key である。
- Corpus page URL は `/corpora/{corpusKey}/` とする。
- Header corpus switcher は corpus 間移動の入口であり、route state の正本を持たない。

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

- corpus と genre を同一概念として扱ってはならない。
- Header switcher が router state を独自に再定義してはならない。

## 5. Failure Semantics

- Unknown corpus key は not found または安全な fallback として扱う。
- 無効な corpus projection は build-time で検出する。

## 6. Integration Boundaries

### Build-time

- Corpus projection と corpus route を生成する。

### SSR

- Header switcher は no-JS baseline で遷移可能な link を持つ。

### Client Runtime

- Switcher は表示と選択操作だけを担う。

### Hydration

- Switcher hydration は scheduler / registry に従う。

### Tests

- URL 契約と switcher boundary は `docs/contracts/testing-taxonomy.md` に従って検証する。

## 7. Acceptance Criteria

- Corpus URL 契約が Guide だけに置かれていない。
- corpus と genre が分離されている。
- Header corpus switcher の責務境界が明確である。
