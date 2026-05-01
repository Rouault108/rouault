# Router Document Contract

## 1. Status

- Type: Normative
- Source of truth: SSR 出力、`app-router`、router document helpers、対応する SSR/browser tests
- Applies to: SSR 初期表示と client navigation が共有する本文 DOM 境界
- Non-goals: router 遷移意味論、hydration trigger、sidebar state、shell projection の詳細説明

## 2. Ownership

### This Layer Owns

- `main#main-content` を本文到達先とする DOM 境界。
- `app-router` の light DOM 内に本文 boundary が存在すること。
- announcement region の存在と router document event の公開面。
- `getContentRoot()` が返す本文 root。
- skip link / focus manager が到達する本文 anchor。

### This Layer Must Not Own

- `NavigationOutcome` などの遷移意味論。
- `NavigationEnvelope` schema 詳細。
- hydration trigger。
- sidebar / breadcrumb / shell projection の state ownership。

## 3. Public Contract

### Inputs

- SSR によって生成された初期 HTML。
- client navigation で取得された `NavigationEnvelope.document`。

### Outputs

- `main#main-content` を持つ本文 DOM。
- `app-router:content-dom-replaced` event。
- `app-router:navigation-committed` event。
- `getContentRoot()` の安定した本文 root。

### Events

- `app-router:content-dom-replaced` は本文 DOM 差し替えが完了したことを通知する。
- `app-router:navigation-committed` は router document と shell commit が観測可能になったことを通知する。
- これらの event は hydration trigger の正本ではない。

### DOM / URL / State Contract

- SSR 初期表示と client navigation は同じ本文 boundary を使う。
- `main#main-content` は skip link の到達先であり、document replacement 後も維持される。
- announcement region は本文差し替えと分離して存在する。
- `app-router` は本文 light DOM を保持し、本文 root を shadow DOM 内だけに閉じ込めてはならない。

## 4. State Model

### Durable State

- 現在の本文 DOM。
- document metadata。

### Ephemeral State

- DOM replacement 中の一時状態。

### Derived State

- focus manager が使用する本文到達先。

### Forbidden Coupling

- router document boundary は router core の遷移意味論に混ぜてはならない。
- content replacement event を hydration trigger 正本として扱ってはならない。

## 5. Failure Semantics

- 本文 root が見つからない場合、client navigation は安全に縮退しなければならない。
- announcement region の欠落は document boundary の欠落と同一視しないが、accessibility regression として扱う。

## 6. Integration Boundaries

### Build-time

- SSR layout は `main#main-content`、`app-router`、announcement region を出力する。

### SSR

- no-JS baseline で本文が読める HTML を先に成立させる。

### Client Runtime

- router document helper は本文 root を特定し、router core は helper 経由で差し替える。

### Hydration

- Hydration は scheduler / registry の契約に従う。

### Tests

- DOM boundary、event、skip link 到達先は SSR/browser tests で固定する。

## 7. Acceptance Criteria

- SSR 初期表示と client navigation で `main#main-content` が維持される。
- `app-router` light DOM に本文 subtree が存在する。
- `app-router:content-dom-replaced` と `app-router:navigation-committed` が観測できる。
- `getContentRoot()` が本文 root を返す。
