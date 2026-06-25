# Testing Taxonomy Contract

## 1. Status

- Type: Normative
- Source of truth: `package.json` scripts、`test/**`、test runner config
- Applies to: test placement、contract verification layer、fixture policy
- Non-goals: 機能別の詳細test plan、Storybookをcontract test harnessにすること

## 2. Ownership

### This Layer Owns

- `test/node/**`、`test/browser/**`、`test/ssr/**`、`test/e2e/**`、`test/storybook/**`の責務境界。
- Storybookはcontract test harnessではないこと。
- CSS構造契約とcomputed style検証の分離。
- Production import boundaryとproduction CSS artifact assertionの配置。
- 新規テスト追加時の判断順。
- Fixture noteの基本方針。

### This Layer Must Not Own

- 個別機能のpublic contract。
- Accessibility要求事項そのもの。正本は`docs/design-system/accessibility.md`。
- Component文書の固有契約。

## 3. Public Contract

### Inputs

- 実装変更。
- Contract / Reference / Guide変更。
- Fixture変更。

### Outputs

- 適切なtest layerへの配置。

### Events

- N/A

### DOM / URL / State Contract

- `test/node/**`はpure function、normalization、URL/path policy、parser、projection helper、state machineを担当する。
- `test/browser/**`はcustom element、enhancer、keyboard / pointer / focus、ARIA、shadow DOMを担当する。
- `test/ssr/**`はbuild-time / final DOM / static artifact / CSS structureを担当する。
- `test/e2e/**`はapp shell integration、no-JS baseline、router/history/search、主要導線を担当する。
- `pnpm test:e2e:dev`はEleventy dev server上の開発時専用経路に限定したsmokeを担当する。production build / previewで固定するfinal DOMや横断的なrouter挙動を重複検証してはならない。
- `test/storybook/**`はdocs / smoke / metadataに限定する。
- Production import-boundary / CSS artifact / search import-boundary scriptsはnode-level verificationとして扱い、読書chromeのruntime UI挙動はbrowser / e2eで固定する。

## 4. State Model

### Durable State

- Test directory taxonomy。
- Fixture policy。

### Ephemeral State

- N/A

### Derived State

- 変更に対応する検証レイヤ。

### Forbidden Coupling

- `test/unit/**`と`src/**/*.test.ts`は使わない。
- Storybookをcomponent/browser 契約の主戦場にしてはならない。
- Story名や並び順を契約正本にしてはならない。

## 5. Failure Semantics

- Contract変更に対して検証レイヤが存在しない場合、変更の受け入れ条件が不完全である。
- Fixture noteをpublication surfaceとして使う場合、SSR artifactとno-JS baselineを壊してはならない。
- Production artifact assertionが失敗した場合、生成物ではなくsource CSS / build integrationを修正する。

## 6. Integration Boundaries

### Build-time

- Markdown、projection、NavigationEnvelope schema、Permanent URL hashはnode/ssr testsで固定する。

### SSR

- Final DOM、selector / hook / token参照、hydration budgetを固定する。
- Reading chromeのstatic DOM、hydration marker、TOC density selector、production CSS到達性を固定する。

### Client Runtime

- Observable behaviorはbrowser/e2e testsで固定する。
- Desktop nav / mobile panel current sync、search return-to-reading event bridge、focus returnはbrowser / e2eで固定する。

### Hydration

- Hydration triggerとscheduler-owned behaviorはbrowser/e2e testsで固定する。

### Tests

- N/A

## 7. Acceptance Criteria

- 新規テストは保証したいcontractに応じて配置されている。
- Markdown safety / output fixtureの更新先が明確である。
- Design System契約変更時の検証レイヤが明確である。
- NavigationEnvelope schema変更時の検証レイヤが明確である。
- Permanent URL hash生成規則変更時の検証レイヤが明確である。
