# Content Config Contract

## 1. Status

- Type: Normative
- Source of truth: content config loader、schema validation、projection tests
- Applies to: `content/**/_config.json` の入力仕様
- Non-goals: breadcrumb label consumption、sidebar 表示規則、設定例

## 2. Ownership

### This Layer Owns

- `_config.json` の適用範囲。
- 使用可能キーと JSON 上の意味。
- fallback に必要な入力条件。
- unknown key の扱い。
- 実装上の source of truth。

### This Layer Must Not Own

- Note / breadcrumb / directory-index における label 消費規則。正本は `docs/contracts/note-navigation.md`。
- Sidebar 表示における label 使用面。正本は `docs/contracts/sidebar-state.md`。
- Corpus URL 契約。正本は `docs/contracts/corpus.md`。
- 著者向け設定例。`docs/guides/content-config.md` を参照する。

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

- 有効な top-level key は `label`、`order`、`sidebar` である。
- `sidebar` の有効 key は `scope` と `icon` である。
- `label` は directory label の入力値であり、page title ではない。
- `order` は同一 directory 内の並び順 hint であり、子孫へ継承しない。
- `sidebar.scope` は sidebar の表示範囲を制御する。
- `sidebar.icon` は sidebar branch / page 表示で使う icon hint であり、継承規則に従う。

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

- `_config.json.label` の入力仕様、breadcrumb での消費規則、sidebar での表示規則を 1 文書で混在させてはならない。
- Unknown key を複数文書で矛盾して定義してはならない。

## 5. Failure Semantics

- Unknown key は build-time validation で拒否または明示的 diagnostic とする。
- `label` fallback は必要な入力条件が満たされる場合だけ使う。
- 型不一致や無効な `sidebar.scope` は build-time で検出する。

## 6. Integration Boundaries

### Build-time

- Config loader が `_config.json` を読み、projection 層へ渡す。

### SSR

- Projection 済み label / order / sidebar hint を使う。

### Client Runtime

- Client は `_config.json` を直接解釈しない。

### Hydration

- N/A

### Tests

- 入力仕様変更時の検証レイヤは `docs/contracts/testing-taxonomy.md` に従う。

## 7. Acceptance Criteria

- `_config.json` の固定仕様が Contract にある。
- Guide が入力契約を上書きしていない。
- label resolution の責務境界が content-config、note-navigation、sidebar-state に分離されている。
