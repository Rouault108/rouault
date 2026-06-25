# Content Config Contract

## 1. Status

- Type: Normative
- Source of truth: content config loader、schema validation、projection tests
- Applies to: `content/**/_config.json`の入力仕様
- Non-goals: breadcrumb label consumption、sidebar表示規則、設定例

## 2. Ownership

### This Layer Owns

- `_config.json`の適用範囲。
- 使用可能キーとJSON上の意味。
- fallbackに必要な入力条件。
- unknown keyの扱い。
- 実装上のsource of truth。

### This Layer Must Not Own

- Note / breadcrumb / directory-indexにおけるlabel消費規則。正本は`docs/contracts/note-navigation.md`。
- Sidebar表示におけるlabel使用面。正本は`docs/contracts/sidebar-state.md`。
- Corpus URL契約。正本は`docs/contracts/corpus.md`。
- 著者向け設定例。`docs/guides/content-config.md`を参照する。

## 3. Public Contract

### Inputs

- `content/**/_config.json`。

### Outputs

- Directory label。
- Ordering hint。
- Sidebar scope。
- Sidebar icon。

### Events

- N/A

### DOM / URL / State Contract

- 有効なtop-level keyは`label`、`order`、`sidebar`である。
- `sidebar`の有効keyは`scope`と`icon`である。
- `label`はdirectory labelの入力値であり、page titleではない。
- `order`は同一directory内の並び順hintであり、子孫へ継承しない。
- `sidebar.scope`はsidebarの表示範囲を制御する。
- `sidebar.icon`はsidebar branch / page表示で使うicon hintであり、継承規則に従う。

## 4. State Model

### Durable State

- Parsed config。
- Validated config。

### Ephemeral State

- N/A

### Derived State

- Directory label fallback。
- Effective sidebar icon。
- Local ordering。

### Forbidden Coupling

- `_config.json.label`の入力仕様、breadcrumbでの消費規則、sidebarでの表示規則を1文書で混在させてはならない。
- Unknown keyを複数文書で矛盾して定義してはならない。

## 5. Failure Semantics

- Unknown keyはbuild-time validationで拒否または明示的diagnosticとする。
- `label` fallbackは必要な入力条件が満たされる場合だけ使う。
- 型不一致や無効な`sidebar.scope`はbuild-timeで検出する。

## 6. Integration Boundaries

### Build-time

- Config loaderが`_config.json`を読み、projection層へ渡す。

### SSR

- Projection済みlabel / order / sidebar hintを使う。

### Client Runtime

- Clientは`_config.json`を直接解釈しない。

### Hydration

- N/A

### Tests

- 入力仕様変更時の検証レイヤは`docs/contracts/testing-taxonomy.md`に従う。

## 7. Acceptance Criteria

- `_config.json`の固定仕様がContractにある。
- Guideが入力契約を上書きしていない。
- label resolutionの責務境界がcontent-config、note-navigation、sidebar-stateに分離されている。
