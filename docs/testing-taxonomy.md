# Testing Taxonomy

Rouault の testing taxonomy は、`test/unit/**`、`test/ssr/**`、`test:storybook`、`test/e2e/**` の責務境界を重複なく保つための運用基準です。

## Story Taxonomy

- Story taxonomy の正本は `parameters.rouaultContractKind` のみです。
- 許可する値は `visual`、`interaction-contract`、`boundary-contract` の 3 種だけです。
- `tags`、title、ファイル名、`Boundary` 命名、`play` の有無は補助情報であり、taxonomy 判定には使いません。

### `visual`

- foundations、token/theme/layout variation、docs/catalog、render smoke を固定します。
- `play` は任意です。
- docs と controls が壊れていないこと、render に失敗しないことを `test:storybook` で継続確認します。

### `interaction-contract`

- keyboard、pointer、focus、event、state transition を固定します。
- `play` を必須とします。
- router、SSR、build-time transform、multi-page integration は持ち込みません。

### `boundary-contract`

- forced-colors、reduced-motion、empty、overflow、invalid fallback、degraded state、persistence UI など、browser 上で観測できる境界条件を固定します。
- `play` は任意です。
- SSR、hydration、serialization、build-time transform は含めません。

## Test Taxonomy

- `test/unit/**`
  - pure function、normalization、URL、tokenizer、projection、局所 domain rule を検証します。
- `test/ssr/**`
  - SSR、serialization、hydration、Markdown/build-time 変換、static artifact shape を検証します。
- `test:storybook`
  - browser-observable contract の living spec です。
  - story runtime と metadata validation の両方を実行し、0 件成功を許容しません。
- `test/e2e/**`
  - app shell、router、history、search、主要読書フローの横断統合を検証します。

## Ownership

- `src/stories/shared/**` は presentation helper 専用です。
- `src/testing/storybook/**` は story 実行専用 adapter、mock、fixture を置く場所です。
- 上記 helper 層は taxonomy 判定、production domain rule、SSR contract、build-time transform rule の source of truth を持ってはいけません。
- story は公開 component API、feature public adapter、story 専用 mock adapter に依存します。内部 facade、暫定 adapter、`internals` への直接依存は禁止です。

## CI Rules

- 各 named story export は `parameters.rouaultContractKind` により一意に分類されていなければなりません。
- `interaction-contract` が `play` を持たない場合は失敗します。
- story から `lib/**`、`src/data/**`、`scripts/**`、`test/**`、`**/internal/**`、`**/internals/**`、`**/facade/**` への直接依存は禁止です。
- `test` は常時ゲート、`test:e2e` は拡張統合ゲートです。両者を同一の gate とみなしません。
