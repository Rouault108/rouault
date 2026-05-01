# Markdown Contract

## 1. Status

- Type: Normative
- Source of truth: Markdown transform pipeline、remark/rehype adapters、SSR tests
- Applies to: Markdown 入力、parser、output DOM、safety boundary、hydration directive
- Non-goals: component 別 DOM 詳細表、authoring example の網羅、Permanent URL hash 詳細

## 2. Ownership

### This Layer Owns

- Author input / parser / output DOM / safety boundary の責務境界。
- raw HTML、dangerous URL、dangerous props、arbitrary style injection の禁止。
- note 本文の最終 DOM が static-first であること。
- no-JS baseline を破壊しないこと。
- Hydration directive が build-time 注釈を正本とすること。

### This Layer Must Not Own

- Component 別 DOM 詳細表。`docs/references/markdown-output.md` を参照する。
- 執筆者向け説明。`docs/guides/markdown-authoring.md` と `docs/guides/note-authoring.md` を参照する。
- Permanent URL hash 生成規則。`docs/contracts/permanent-url.md` を参照する。

## 3. Public Contract

### Inputs

- Markdown 本文。
- Frontmatter。
- 許可された独自 directive と属性。

### Outputs

- Static-first な note 本文 DOM。
- 許可済み component / HTML structure。
- Build-time hydration annotation。

### Events

- N/A

### DOM / URL / State Contract

- Markdown renderer は raw HTML を本文 DOM へそのまま通してはならない。
- `javascript:` などの dangerous URL scheme を許可してはならない。
- `on*`、`srcdoc`、許可外 `style` などの dangerous props を許可してはならない。
- Component 化は semantic HTML と no-JS baseline を壊してはならない。
- Hydration directive は runtime rescue ではなく build-time contract とする。

## 4. State Model

### Durable State

- Author source。
- Normalized Markdown / HAST。
- Final HTML。

### Ephemeral State

- Parser intermediate state。

### Derived State

- Heading id。
- Directive output。
- Hydration annotation。

### Forbidden Coupling

- Markdown 出力を component runtime の都合で再解釈してはならない。
- Safety contract を Guide や Reference だけに置いてはならない。

## 5. Failure Semantics

- 危険入力は build-time rejection を優先する。
- 未知 directive や許可外属性は黙って通さず、明示的に拒否または安全に落とす。
- Runtime helper は build-time safety boundary を上書きしてはならない。

## 6. Integration Boundaries

### Build-time

- Parser / transformer / adapter が Markdown を最終 DOM へ正規化する。

### SSR

- Final DOM は JS なしで読める。

### Client Runtime

- Runtime は enhancement のみを行い、本文意味論を再構築しない。

### Hydration

- Content hydration は scheduler / registry が所有する。

### Tests

- Safety、output fixture、hydration budget の更新先は `docs/contracts/testing-taxonomy.md` に従う。

## 7. Acceptance Criteria

- Markdown safety boundary が Contract として存在する。
- raw HTML、dangerous URL、dangerous props、arbitrary style injection が禁止されている。
- no-JS baseline と static-first DOM が維持されている。
- 詳細 DOM mapping は Reference に分離されている。
