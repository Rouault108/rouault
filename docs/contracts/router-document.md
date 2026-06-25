# Router Document Contract

## 1. Status

- Type: Normative
- Source of truth: SSR出力、`app-router`、router document helpers、対応するSSR/browser tests
- Applies to: SSR初期表示とclient navigationが共有する本文DOM境界
- Non-goals: router遷移意味論、hydration trigger、sidebar state、shell projectionの詳細説明

## 2. Ownership

### This Layer Owns

- `main#main-content`を本文到達先とするDOM境界。
- `app-router`のlight DOM内に本文boundaryが存在すること。
- announcement regionの存在とrouter document eventの公開面。
- `getContentRoot()`が返す本文root。
- skip link / focus managerが到達する本文anchor。

### This Layer Must Not Own

- `NavigationOutcome`などの遷移意味論。
- `NavigationEnvelope` schema詳細。
- hydration trigger。
- sidebar / breadcrumb / shell projectionのstate ownership。

## 3. Public Contract

### Inputs

- SSRによって生成された初期HTML。
- client navigationで取得された`NavigationEnvelope.document`。

### Outputs

- `main#main-content`を持つ本文DOM。
- `app-router:content-dom-replaced` event。
- `app-router:navigation-committed` event。
- `getContentRoot()`の安定した本文root。

### Events

- `app-router:content-dom-replaced`は本文DOM差し替えが完了したことを通知する。
- `app-router:navigation-committed`はrouter documentとshell commitが観測可能になったことを通知する。
- これらのeventはhydration triggerの正本ではない。

### DOM / URL / State Contract

- SSR初期表示とclient navigationは同じ本文boundaryを使う。
- `main#main-content`はskip linkの到達先であり、document replacement後も維持される。
- announcement regionは本文差し替えと分離して存在する。
- `app-router`は本文light DOMを保持し、本文rootをshadow DOM内だけに閉じ込めてはならない。

## 4. State Model

### Durable State

- 現在の本文DOM。
- document metadata。

### Ephemeral State

- DOM replacement中の一時状態。

### Derived State

- focus managerが使用する本文到達先。

### Forbidden Coupling

- router document boundaryはrouter coreの遷移意味論に混ぜてはならない。
- content replacement eventをhydration trigger正本として扱ってはならない。

## 5. Failure Semantics

- 本文rootが見つからない場合、client navigationは安全に縮退しなければならない。
- announcement regionの欠落はdocument boundaryの欠落と同一視しないが、accessibility regressionとして扱う。

## 6. Integration Boundaries

### Build-time

- SSR layoutは`main#main-content`、`app-router`、announcement regionを出力する。

### SSR

- no-JS baselineで本文が読めるHTMLを先に成立させる。

### Client Runtime

- router document helperは本文rootを特定し、router coreはhelper経由で差し替える。

### Hydration

- Hydrationはscheduler / registryの契約に従う。

### Tests

- DOM boundary、event、skip link到達先はSSR/browser testsで固定する。

## 7. Acceptance Criteria

- SSR初期表示とclient navigationで`main#main-content`が維持される。
- `app-router` light DOMに本文subtreeが存在する。
- `app-router:content-dom-replaced`と`app-router:navigation-committed`が観測できる。
- `getContentRoot()`が本文rootを返す。
