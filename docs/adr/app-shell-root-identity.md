# App shell root identity

## Status

- Type: Decision Record
- Status: `Accepted`
- Contract source of truth: `docs/contracts/app-shell-root.md`
- Decision Record ID: `DR-APP-SHELL-ROOT-IDENTITY-001`
- Request ID: `REQ-APP-SHELL-ROOT-IDENTITY-001`
- Decision ID: `D-APP-SHELL-ROOT-IDENTITY-001`
- Gate ID: `G-APP-SHELL-ROOT-LEGACY-HOOK-001`
- R段階／Aレベル: `R3 / A0`
- Baseline commit: `2fa47db76ec7926ef1cef522aff6e0abfa898a69`

このADRはapp shell root identityの採用理由、棄却案、互換性、削除判断、migration、rollbackを記録する。

実装後のexactなapp shell root契約は`docs/contracts/app-shell-root.md`を正本とする。このADRは現在契約を再定義しない。

## Request

現行のproduction app shell root表現を整理する。

```html
<div id="app" class="app-root">
```

目的:

- `#app`がクライアントSPAのmount pointを示すという誤解を除く。
- outer app shellと`router-document-host`の責務を名称上も分離する。
- runtime structural hookとCSS presentation hookを分離する。
- static-first構造に適した語彙へ統一する。

## R段階／Aレベル

### R3

- production DOM selectorを変更する。
- CSS selectorを変更する。
- 既存structural hookとpresentation hookを削除する。
- リポジトリ外のCSSまたはscriptへ互換性影響があり得る。
- Delete／Breaking Change Gateの対象となる。

### A0

- 本タスクはローカルCodexがローカルworking treeへ実装する。
- 実装後の正本Evidenceは、Codexが提出するdiff、test結果、manual verification結果である。
- ユーザーがdiffをChatGPTへ提示し、ChatGPTがその場で精査する。
- SHA-256、snapshot JSON、Evidence manifest、外部保存用control artifactは使用しない。

## Decision

### `D-APP-SHELL-ROOT-IDENTITY-001`

```diff
- <div id="app" class="app-root" ...>
+ <div class="app-shell-root" data-app-shell-root ...>
```

採用事項:

- `data-app-shell-root`をstructural／runtime hookとする。
- `.app-shell-root`をpresentation hookとする。
- hydration scopeをroot lookupへ流用しない。
- production app shell root elementは`id`属性を持たない。
- 旧hookと新hookを並行維持しない。
- sidebar overlay helperの既存fallback semanticsを変更しない。
- exactな現在契約は`docs/contracts/app-shell-root.md`へ集約する。

## Responsibility Boundary

app shell root Contractは次を所有する。

- production app shell root identity
- structural hookとpresentation hookの分離
- production rootの単一性
- app shell rootの主要DOM containment

次は既存Contractが所有する。

- `main#main-content`のidentityと本文境界
  - `docs/contracts/router-document.md`
- hydration triggerとscopeの意味
  - `docs/contracts/hydration.md`
- sidebar state
  - `docs/contracts/sidebar-state.md`
- route由来のshell snapshot
  - navigation shell関連Contract


## Compatibility Decision

GitHub最新`main`の現行実装調査と対象語彙検索により、削除対象hookのactive ownerをChange PlanのTarget Filesへ特定した。実装後はFinal Reference Searchで旧hookのactive usageが残らないことを確認する。

- `#app`へのfragment linkまたは文書化されたURL
- `app`をIDREF tokenとして参照するARIA relationship
- `app`をID-reference tokenとして参照するHTML relationship
- history state、persistence、navigation payload、import-export形式
- public extension API

ただし、現行production rootの`id="app"`はWeb Platform上のfragment targetを形成している。これを削除するため、外部bookmark、手入力URLまたはrepository外文書に存在する未文書化fragment URL`...#app`はtargetを失う。この互換性破壊を明示的に受け入れる。

文書化されたroute、router history contract、skip linkの`#main-content`は変更しない。

リポジトリ外の独自CSSまたはscriptが`#app`または`.app-root`へ依存している場合も破壊される。

次は導入しない。

- `#app`redirectまたは代替fragment target
- compatibility shim
- 旧新selectorの並行維持
- fallback selector
- deprecation期間

## Rejected Alternatives

### `id="app-shell"`へrenameする

fragment、ARIA参照または外部integration用のIDとして必要ではなく、runtime lookupだけが目的であるため棄却する。

### Hydration scopeをroot selectorへ流用する

hydration ownershipとlayout shell identityを結合するため棄却する。

### `.app-shell-root`だけを使用する

runtime lookupがpresentation classへ依存するため棄却する。

### `[data-app-shell-root]`をCSS selectorにも使用する

structural hookとpresentation hookの責務を分離できないため棄却する。

### `reading-shell-root`を使用する

home、search、corpus、not-foundを含む全ページ共通shellに対して責務範囲が狭すぎるため棄却する。

### Sidebar overlay fallbackを同時に削除する

root identity変更とは別のfailure semantics変更であるため棄却する。

## Held Alternatives

なし。

sidebar overlay ownershipのstrict化、`body` fallback廃止、root runtime validator導入は、本Decisionの保留案ではなく別Request候補とする。

## Counter-Hypothesis Review

### Counter-hypothesis

`#app.app-root`は内部selectorにすぎず、一般的で短いため変更コストに見合わない。

### Result

棄却する。

- `#app`はクライアントSPAのmount rootを示唆する。
- RouaultのrootはSSR時点で存在する。
- rootは`router-document-host`より外側のshellである。
- structural、presentation、hydrationの各hookを分離できる。
- 旧名称をtestが固定しており、放置すると曖昧な語彙が恒久化する。

## Contract Impact

変更する:

- production app shell root DOM identity
- app shell root CSS class
- runtime app shell root lookup
- SSR、browser、E2E、production artifact verification
- Storybook visual wrapper class

変更しない:

- 文書化されたURL、routing、history
- `NavigationEnvelope`
- router document replacement
- app shell commitまたはrollback
- hydration trigger ownership
- sidebar state
- persistence形式
- sidebar overlay fallback semantics
- note frame geometry
- no-JS時の情報構造
- accessibility landmark、focus、ARIA

## Rouault-specific Contract Impact

変更する:

- app shell root identity
- app shell root presentation selector
- sidebar overlay helperのroot lookup
- production HTML artifact contract

変更しない:

- router document contract
- hydration contract
- sidebar state contract
- app shell commit／rollback contract
- reading chrome geometry
- static header内部契約

## Delete / Migration / Deprecation

- Deprecation期間:設けない
- Compatibility shim:追加しない
- 旧新selectorの並行維持:行わない
- URL migration:不要。未文書化fragment`#app`のredirect、aliasまたは代替targetは提供しない
- Data migration:不要
- Persistence migration:不要
- Import-export migration:不要
- Deployment migration:全ページ再build

旧HTMLと新CSSまたは新client bundleを混在配信しない。

## Gate Result

- Gate ID: `G-APP-SHELL-ROOT-LEGACY-HOOK-001`
- Result: `Pass`
- Human approval: `Approved`

Decision Record、Normative Contract、Delete／Breaking Change Gate、Change Planの承認に基づき、旧hookを原子的に削除する。

## Rollback

変更全体を同一単位でrevertし、production artifactを再buildする。

```text
[data-app-shell-root].app-shell-root
  ↓
#app.app-root
```

rollback用aliasまたは並行selectorは追加しない。

## Acceptance ID

- `A-APP-SHELL-ROOT-001`
- `A-APP-SHELL-ROOT-002`
- `A-APP-SHELL-ROOT-003`
- `A-APP-SHELL-ROOT-004`
- `A-APP-SHELL-ROOT-005`
- `A-APP-SHELL-ROOT-006`
- `A-APP-SHELL-ROOT-007`
- `A-APP-SHELL-ROOT-008`
- `A-APP-SHELL-ROOT-009`
- `A-APP-SHELL-ROOT-010`
- `A-APP-SHELL-ROOT-011`
- `A-APP-SHELL-ROOT-012`
- `A-APP-SHELL-ROOT-013`
- `A-APP-SHELL-ROOT-014`
- `A-APP-SHELL-ROOT-015`
- `A-APP-SHELL-ROOT-DOCS-001`

## Verification ID

- `V-APP-SHELL-ROOT-SEARCH-FINAL-001`
- `V-APP-SHELL-ROOT-DOCS-001`
- `V-APP-SHELL-ROOT-SSR-001`
- `V-APP-SHELL-ROOT-CSS-001`
- `V-APP-SHELL-ROOT-BROWSER-001`
- `V-APP-SHELL-ROOT-E2E-SKIP-001`
- `V-APP-SHELL-ROOT-E2E-FRAME-001`
- `V-APP-SHELL-ROOT-STORY-001`
- `V-APP-SHELL-ROOT-PRODUCTION-001`
- `V-APP-SHELL-ROOT-DIFF-001`

## Unresolved Matters

なし。

## Out of Scope

- sidebar overlay ownershipのstrict化
- `body` fallbackの削除
- root欠落または重複時のruntime validator
- app shell event rename
- hydration marker rename
- `reading-shell`語彙整理
- component directory rename
- router document host変更
- global search dialogのmount policy変更
- layout geometry変更
