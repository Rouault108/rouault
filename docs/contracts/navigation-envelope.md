# Navigation Envelope Contract

## 1. Status

- Type: Normative
- Source of truth: build-time envelope generation、router loader、`NavigationEnvelope` tests
- Applies to: client navigationの正規payload
- Non-goals: payload fieldの詳細一覧、sidebar state ownership、router document DOM boundary

## 2. Ownership

### This Layer Owns

- `NavigationEnvelope`がclient navigationの正規payloadであること。
- route経路とfetch経路を同じpayload modelで扱うこと。
- `document`、`shell`、`hydrationPlan`を主要構造として扱うこと。
- Reading chromeのroute由来shell snapshotをdurable stateとして運ぶこと。
- `schemaVersion`と`buildId`の互換境界。
- `generatedAt`をartifact生成時刻の診断用metadataとして扱うこと。

### This Layer Must Not Own

- 詳細schema。`docs/references/navigation-envelope-schema.md`を参照する。
- 本文DOM boundary。`docs/contracts/router-document.md`を参照する。
- sidebar state ownership。`docs/contracts/sidebar-state.md`を参照する。
- hydration trigger。`docs/contracts/hydration.md`を参照する。

## 3. Public Contract

### Inputs

- Build-timeが生成したnavigation envelope artifact。
- Client navigationが取得したenvelope JSON。

### Outputs

- Routerがcommitできるdocument payload。
- App shellが反映できるshell snapshot。
- Scheduler / registryが参照できるhydration planning情報。

### Events

- N/A

### DOM / URL / State Contract

- fetched HTMLのcomponent属性形式をrouter protocolとしてはならない。
- `NavigationEnvelope`はdocumentとshellのroute由来durable stateを運ぶ。
- `hydrationPlan`はplanning情報であり、hydration triggerの正本ではない。
- Reading chromeのTOC trigger projectionはshell stateであり、mobile panel open stateやcurrent DOMのephemeral stateではない。
- `buildId`が一致しない場合、client navigationは安全なdocument navigationへ縮退する。
- `generatedAt`はrouting互換キーではない。current document側`generatedAt`との不一致だけでcommitを拒否しない。
- fetch artifact側`generatedAt`欠落・不正はcontract errorであり、通常内部遷移ではdocument navigation fallbackへ分類する。
- current document側`generatedAt`欠落・不正はfetch artifactの`buildId`互換判定を止めない。

## 4. State Model

### Durable State

- `document`
- `shell`
- `schemaVersion`
- `buildId`
- `generatedAt`

### Ephemeral State

- In-flight fetch result

### Derived State

- Hydration planning
- Shell snapshot application plan
- Reading chrome trigger availability

### Forbidden Coupling

- `shell.sidebarProjection`の詳細fieldをsidebar state contractに押し込んではならない。
- Referenceは`NavigationEnvelope`が正規payloadであるというContractを上書きしてはならない。
- Reading chromeのtrigger projectionをcomponent-local runtime stateの保存場所として使ってはならない。

## 5. Failure Semantics

- fetch artifact由来の`schemaVersion`不一致、`buildId`不一致、payload欠損、artifact HTTP status errorはclient navigationの縮退理由である。
- `schemaVersion`不一致は`fetch-schema-version-mismatch`、`buildId`不一致は`fetch-build-id-mismatch`、その他のfetch artifact不正は`fetch-navigation-envelope-invalid`、artifact HTTP status errorは`fetch-navigation-envelope-http-status`として分類する。
- route manifest非掲載だがinternal document navigationとして許可された`missing-route-candidate`で、fetch artifactがHTTP 404を返した場合だけは、artifact縮退ではなくnot-found envelopeを生成してSPA commitする。
- `known-route`のHTTP 404、`missing-route-candidate`のHTTP 404以外のstatus error、`schemaVersion`不一致、`buildId`不一致、invalid content-type、invalid JSON、構造不正NavigationEnvelopeはnot-found envelopeへ寄せない。
- document-route handler例外とdocument-route由来の不正NavigationEnvelopeはstale fetch artifact fallback対象ではない。
- 縮退時もURLとdocumentの整合を優先する。

## 6. Integration Boundaries

### Build-time

- Envelope artifactを生成し、schemaVersionとbuildIdを付与する。

### SSR

- SSR初期表示はenvelopeがなくてもno-JS baselineとして成立する。

### Client Runtime

- Routerはenvelopeをclient navigationの入力として扱う。

### Hydration

- Scheduler / registryはhydration planningを参照できるが、trigger判断は自分で所有する。

### Tests

- Schema変更時の検証レイヤは`docs/contracts/testing-taxonomy.md`に従う。

## 7. Acceptance Criteria

- Client navigationが`NavigationEnvelope`を正規payloadとして扱う。
- Payload field詳細は`docs/references/navigation-envelope-schema.md`に分離されている。
- buildId不一致時に安全に縮退する。
- fetched HTMLのcomponent属性がrouter protocolになっていない。
