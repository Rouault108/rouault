# Testing Taxonomy Contract

## 1. Status

- Type: Normative
- Source of truth: `package.json` scripts、`test/**`、test runner config
- Applies to: test placement、contract verification layer、fixture policy
- Non-goals: 機能別の詳細 test plan、Storybook を contract test harness にすること

## 2. Ownership

### This Layer Owns

- `test/node/**`、`test/browser/**`、`test/ssr/**`、`test/e2e/**`、`test/storybook/**` の責務境界。
- Storybook は contract test harness ではないこと。
- CSS 構造契約と computed style 検証の分離。
- Production import boundary と production CSS artifact assertion の配置。
- 新規テスト追加時の判断順。
- Fixture note の基本方針。

### This Layer Must Not Own

- 個別機能の public contract。
- Accessibility 要求事項そのもの。正本は `docs/design-system/accessibility.md`。
- Component 文書の固有契約。

## 3. Public Contract

### Inputs

- 実装変更。
- Contract / Reference / Guide 変更。
- Fixture 変更。

### Outputs

- 適切な test layer への配置。

### Events

- N/A

### DOM / URL / State Contract

- `test/node/**` は pure function、normalization、URL/path policy、parser、projection helper、state machine を担当する。
- `test/browser/**` は custom element、enhancer、keyboard / pointer / focus、ARIA、shadow DOM を担当する。
- `test/ssr/**` は build-time / final DOM / static artifact / CSS structure を担当する。
- `test/e2e/**` は app shell integration、no-JS baseline、router/history/search、主要導線を担当する。
- `pnpm test:e2e:dev` は Eleventy dev server 上の開発時専用経路に限定した smoke を担当する。production build / preview で固定する final DOM や横断的な router 挙動を重複検証してはならない。
- `test/storybook/**` は docs / smoke / metadata に限定する。
- Production import-boundary / CSS artifact / search import-boundary scripts は node-level verification として扱い、読書 chrome の runtime UI 挙動は browser / e2e で固定する。

## 4. State Model

### Durable State

- Test directory taxonomy。
- Fixture policy。

### Ephemeral State

- N/A

### Derived State

- 変更に対応する検証レイヤ。

### Forbidden Coupling

- `test/unit/**` と `src/**/*.test.ts` は使わない。
- Storybook を component/browser 契約の主戦場にしてはならない。
- Story 名や並び順を契約正本にしてはならない。

## 5. Failure Semantics

- Contract 変更に対して検証レイヤが存在しない場合、変更の受け入れ条件が不完全である。
- Fixture note を publication surface として使う場合、SSR artifact と no-JS baseline を壊してはならない。
- Production artifact assertion が失敗した場合、生成物ではなく source CSS / build integration を修正する。

## 6. Integration Boundaries

### Build-time

- Markdown、projection、NavigationEnvelope schema、Permanent URL hash は node/ssr tests で固定する。

### SSR

- Final DOM、selector / hook / token 参照、hydration budget を固定する。
- Reading chrome の static DOM、hydration marker、TOC density selector、production CSS 到達性を固定する。

### Client Runtime

- Observable behavior は browser/e2e tests で固定する。
- Desktop nav / mobile panel current sync、search return-to-reading event bridge、focus return は browser / e2e で固定する。

### Hydration

- Hydration trigger と scheduler-owned behavior は browser/e2e tests で固定する。

### Tests

- N/A

## 7. Acceptance Criteria

- 新規テストは保証したい contract に応じて配置されている。
- Markdown safety / output fixture の更新先が明確である。
- Design System 契約変更時の検証レイヤが明確である。
- NavigationEnvelope schema 変更時の検証レイヤが明確である。
- Permanent URL hash 生成規則変更時の検証レイヤが明確である。
