# Hydration Contract

## 1. Status

- Type: Normative
- Source of truth: `src/client/`のscheduler / registry、hydration tests
- Applies to: shell hydration、content hydration、SPA遷移後のhydration planning
- Non-goals: router commit、component固有DOM契約、Markdown出力詳細

## 2. Ownership

### This Layer Owns

- Hydration triggerの正本。
- Hydration scheduler / registryの登録、起動、重複抑止。
- Shell hydrationとcontent hydrationの入口。
- SPA遷移後のcontent hydration trigger。
- Reading chromeのhydration sessionはscheduler / registryのtargetとして扱う。

### This Layer Must Not Own

- Router durable commit。
- Markdown出力契約。
- Componentがconnected時にhydration timingを自己決定する仕組み。

## 3. Public Contract

### Inputs

- SSR HTMLに付与されたbuild-time hydration annotation。
- `NavigationEnvelope.hydrationPlan`によるplanning情報。
- Scheduler / registryに登録されたcomponent hydration target。
- SSRが出力したreading chrome hydration marker。

### Outputs

- shell hydrationの実行。
- content hydrationの実行。
- 重複hydrationの抑止。

### Events

- `app-router:content-dom-replaced`はhydrationの参考eventになりうるが、trigger正本ではない。

### DOM / URL / State Contract

- `src/client.ts`はbootstrapとscheduler呼び出しだけを持つ。
- componentはhydration timingを自己決定してはならない。
- state-only navigationはcontent hydration triggerにしてはならない。
- Hydration directiveはbuild-time注釈を正本とする。
- Reading chromeのowner / source / trigger markerはhydration接続点であり、componentがconnected時に独自trigger判定をしてはならない。

## 4. State Model

### Durable State

- Build-time hydration annotation。
- Registryに登録されたhydration target。

### Ephemeral State

- Pending hydration queue。
- Already-hydrated marker。

### Derived State

- Shell hydration plan。
- Content hydration plan。

### Forbidden Coupling

- Router eventをhydration trigger正本にしてはならない。
- Component-local lifecycleにhydration timingを戻してはならない。
- Reading chromeのmobile panel open stateやcurrent DOM同期をhydration trigger正本にしてはならない。

## 5. Failure Semantics

- Hydration targetが欠落した場合、no-JS baselineを壊さずに縮退する。
- 個別component hydrationの失敗は可能な限り他targetのhydrationを止めない。

## 6. Integration Boundaries

### Build-time

- Hydration directiveと対象metadataを付与する。

### SSR

- Hydrationなしでも読めるHTMLを出力する。

### Client Runtime

- Scheduler / registryがtriggerと実行を所有する。
- `layout-toc-controller`などのreading chrome componentは登録されたtargetとして起動し、起動条件を自分で所有しない。

### Hydration

- N/A

### Tests

- Observable behaviorの検証場所は`docs/contracts/testing-taxonomy.md`に従う。

## 7. Acceptance Criteria

- Hydration triggerの正本がscheduler / registryにある。
- `src/client.ts`がbootstrap以上のownershipを持たない。
- state-only navigationがcontent hydrationを発火しない。
- componentがconnected時に独自trigger判定をしない。
