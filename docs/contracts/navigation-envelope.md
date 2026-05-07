# Navigation Envelope Contract

## 1. Status

- Type: Normative
- Source of truth: build-time envelope generation、router loader、`NavigationEnvelope` tests
- Applies to: client navigation の正規 payload
- Non-goals: payload field の詳細一覧、sidebar state ownership、router document DOM boundary

## 2. Ownership

### This Layer Owns

- `NavigationEnvelope` が client navigation の正規 payload であること。
- route 経路と fetch 経路を同じ payload model で扱うこと。
- `document`、`shellProjection`、`hydrationPlan` を主要構造として扱うこと。
- Reading chrome の route 由来 shell projection を durable state として運ぶこと。
- `schemaVersion`、`buildId`、`generatedAt` の互換境界。

### This Layer Must Not Own

- 詳細 schema。`docs/references/navigation-envelope-schema.md` を参照する。
- 本文 DOM boundary。`docs/contracts/router-document.md` を参照する。
- sidebar state ownership。`docs/contracts/sidebar-state.md` を参照する。
- hydration trigger。`docs/contracts/hydration.md` を参照する。

## 3. Public Contract

### Inputs

- Build-time が生成した navigation envelope artifact。
- Client navigation が取得した envelope JSON。

### Outputs

- Router が commit できる document payload。
- App shell が反映できる shell projection。
- Scheduler / registry が参照できる hydration planning 情報。

### Events

- N/A

### DOM / URL / State Contract

- fetched HTML の component 属性形式を router protocol としてはならない。
- `NavigationEnvelope` は document と shell の route 由来 durable state を運ぶ。
- `hydrationPlan` は planning 情報であり、hydration trigger の正本ではない。
- Reading chrome の TOC trigger projection は shell state であり、mobile panel open state や current DOM の ephemeral state ではない。
- `buildId` が一致しない場合、client navigation は安全な document navigation へ縮退する。

## 4. State Model

### Durable State

- `document`
- `shellProjection`
- `schemaVersion`
- `buildId`
- `generatedAt`

### Ephemeral State

- In-flight fetch result

### Derived State

- Hydration planning
- Shell projection application plan
- Reading chrome trigger availability

### Forbidden Coupling

- `shellProjection.sidebar` の詳細 field を sidebar state contract に押し込んではならない。
- Reference は `NavigationEnvelope` が正規 payload であるという Contract を上書きしてはならない。
- Reading chrome の trigger projection を component-local runtime state の保存場所として使ってはならない。

## 5. Failure Semantics

- `schemaVersion` 不一致、`buildId` 不一致、payload 欠損は client navigation の縮退理由である。
- 縮退時も URL と document の整合を優先する。

## 6. Integration Boundaries

### Build-time

- Envelope artifact を生成し、schemaVersion と buildId を付与する。

### SSR

- SSR 初期表示は envelope がなくても no-JS baseline として成立する。

### Client Runtime

- Router は envelope を client navigation の入力として扱う。

### Hydration

- Scheduler / registry は hydration planning を参照できるが、trigger 判断は自分で所有する。

### Tests

- Schema 変更時の検証レイヤは `docs/contracts/testing-taxonomy.md` に従う。

## 7. Acceptance Criteria

- Client navigation が `NavigationEnvelope` を正規 payload として扱う。
- Payload field 詳細は `docs/references/navigation-envelope-schema.md` に分離されている。
- buildId 不一致時に安全に縮退する。
- fetched HTML の component 属性が router protocol になっていない。
