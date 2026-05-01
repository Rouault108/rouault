# Hydration Contract

## 1. Status

- Type: Normative
- Source of truth: `src/client/` の scheduler / registry、hydration tests
- Applies to: shell hydration、content hydration、SPA 遷移後の hydration planning
- Non-goals: router commit、component 固有 DOM 契約、Markdown 出力詳細

## 2. Ownership

### This Layer Owns

- Hydration trigger の正本。
- Hydration scheduler / registry の登録、起動、重複抑止。
- Shell hydration と content hydration の入口。
- SPA 遷移後の content hydration trigger。

### This Layer Must Not Own

- Router durable commit。
- Markdown output contract。
- Component が connected 時に hydration timing を自己決定する仕組み。

## 3. Public Contract

### Inputs

- SSR HTML に付与された build-time hydration annotation。
- `NavigationEnvelope.hydrationPlan` による planning 情報。
- Scheduler / registry に登録された component hydration target。

### Outputs

- shell hydration の実行。
- content hydration の実行。
- 重複 hydration の抑止。

### Events

- `app-router:content-dom-replaced` は hydration の参考 event になりうるが、trigger 正本ではない。

### DOM / URL / State Contract

- `src/client.ts` は bootstrap と scheduler 呼び出しだけを持つ。
- component は hydration timing を自己決定してはならない。
- state-only navigation は content hydration trigger にしてはならない。
- Hydration directive は build-time 注釈を正本とする。

## 4. State Model

### Durable State

- Build-time hydration annotation。
- Registry に登録された hydration target。

### Ephemeral State

- Pending hydration queue。
- Already-hydrated marker。

### Derived State

- Shell hydration plan。
- Content hydration plan。

### Forbidden Coupling

- Router event を hydration trigger 正本にしてはならない。
- Component-local lifecycle に hydration timing を戻してはならない。

## 5. Failure Semantics

- Hydration target が欠落した場合、no-JS baseline を壊さずに縮退する。
- 個別 component hydration の失敗は可能な限り他 target の hydration を止めない。

## 6. Integration Boundaries

### Build-time

- Hydration directive と対象 metadata を付与する。

### SSR

- Hydration なしでも読める HTML を出力する。

### Client Runtime

- Scheduler / registry が trigger と実行を所有する。

### Hydration

- N/A

### Tests

- Observable behavior の検証場所は `docs/contracts/testing-taxonomy.md` に従う。

## 7. Acceptance Criteria

- Hydration trigger の正本が scheduler / registry にある。
- `src/client.ts` が bootstrap 以上の ownership を持たない。
- state-only navigation が content hydration を発火しない。
- component が connected 時に独自 trigger 判定をしない。
