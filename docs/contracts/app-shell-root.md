# App Shell Root Contract

## 1. Status

- Type: Normative
- Normative source of truth:この文書
- Structural literal owner:
  - `shared/app-shell/app-shell-root-contract.ts`
- Implementing owners:
  - `src/layouts/BaseLayout.11ty.ts`
  - `src/assets/css/app-shell.css`
  - `src/components/layout/layout-sidebar-overlay-layer.ts`
  - `scripts/assert-production-html-contracts.ts`
- Verification owners:
  - `test/ssr/base-layout.test.ts`
  - `test/ssr/static-css-contracts.test.ts`
  - `test/browser/layout-sidebar-overlay-layer.browser.test.ts`
  - `test/e2e/skip-link.spec.ts`
  - `test/e2e/note-frame-balance.spec.ts`
  - `test/node/production-html-contracts.test.ts`
- Applies to:
  - production documentのapp shell root identity
  - app shell rootの主要DOM containment
- Non-goals:
  - app shell snapshot payload
  - shell commitまたはrollback
  - router document本文境界
  - sidebar state
  - hydration trigger
  - Storybookまたはsynthetic fixtureの構造
  - global search dialogのmount policy

## 2. Ownership

### This Layer Owns

- production app shell root identity
- structural hookとpresentation hookの分離
- production document内のroot単一性
- skip linkとrootの相対位置
- static header、`router-document-host`、sidebar overlay layer、footerのroot内containment
- root identityがSSR時点で存在すること
- runtime lookupが共有structural selectorを使用すること
- final production HTML artifactが同じroot identityを保持すること

### This Layer Must Not Own

- `main#main-content`のidentityまたは本文ownership
- router document replacement semantics
- app shell snapshot payload
- app shell commitまたはrollback
- sidebar state
- sidebar overlay fallback全体
- root欠落または重複時のruntime validation
- hydration trigger
- headerまたはfooter内部DOM
- enhancer markerの正確な配置
- bootstrap scriptの正確な配置
- global search dialogのmountまたはcontainment policy
- search state
- note frame geometry
- no-JS baseline全体
- Storybook fixture policy

`main#main-content`と`router-document-host`の本文境界は`docs/contracts/router-document.md`を正本とする。

## 3. Public Contract

### Structural Hook

production app shell rootは、次のpresence-only structural data attributeを持つ。

これはHTML仕様上のboolean attributeではない。属性の存在だけをstructural identityとして解釈する。

```html
data-app-shell-root
```

structural attribute literalとselectorは次を正本とする。

```ts
APP_SHELL_ROOT_ATTRIBUTE
APP_SHELL_ROOT_SELECTOR
```

runtime lookupは`APP_SHELL_ROOT_SELECTOR`を使用する。

### Presentation Hook

app shell rootは次のclass tokenを持つ。

```css
.app-shell-root
```

CSSは`.app-shell-root`をpresentation hookとして使用する。

`[data-app-shell-root]`をpresentation selectorとして使用してはならない。

### Hydration Integration

app shell rootは次の既存hydration contractを維持する。

```text
data-hydration-marker="reading-shell"
data-hydration-owner-id="app-shell"
data-hydration-scope="app-shell"
```

hydration scopeはroot lookup selectorとして使用してはならない。

### SSR DOM Contract

`BaseLayout`が生成するSSR documentには`[data-app-shell-root]`がちょうど1個存在する。

同じ要素が`app-shell-root`class tokenを持つ。

`[data-app-shell-root]`を持つroot elementは`id`属性を持ってはならない。

SSR documentには次が存在してはならない。

- `id="app"`を持つ要素
- `app-root`class tokenを持つ要素

次の非網羅的なcontainmentを維持する。

- skip linkはapp shell rootより前に存在する。
- app shell rootはstatic headerをcontainする。
- app shell rootは`router-document-host`をcontainする。
- app shell rootはsidebar overlay layerをcontainする。
- app shell rootはfooterをcontainする。

このContractはroot内部の完全な子要素集合、direct-child性、相互順序を契約化しない。

header enhancer marker、theme chrome bootstrap script、global search dialogのexactな配置またはcontainmentは、このContractで固定しない。今回の変更では既存配置をdiff invariantとして維持する。

### Final Production Artifact Contract

`dist/`配下の各生成HTML documentには次が成立する。

- `[data-app-shell-root]`がちょうど1個存在する。
- 同じ要素が`app-shell-root`class tokenを持つ。
- root elementが`id`属性を持たない。
- `id="app"`を持つ要素がdocument内に存在しない。
- `app-root`class tokenを持つ要素が存在しない。
- bare fragment reference`href="#app"`が存在しない。
- ARIA IDREF属性に空白区切りtoken`app`が存在しない。
- HTML ID-reference属性に空白区切りtoken`app`が存在しない。

対象ARIA IDREF属性:

```text
aria-controls
aria-describedby
aria-labelledby
aria-owns
aria-details
aria-errormessage
aria-flowto
aria-activedescendant
```

対象HTML ID-reference属性:

```text
for
form
list
headers
itemref
popovertarget
commandfor
```

ARIA IDREFとHTML ID-referenceのtoken分割はHTML StandardのASCII whitespaceだけをseparatorとする。

```ts
const splitAsciiWhitespaceTokens = (
  value: string,
): readonly string[] =>
  value
    .split(/[\t\n\f\r ]+/u)
    .filter(Boolean);
```

`for`は要素により単一IDまたは空白区切りID列として解釈されるため、validatorは対象attribute valueを同じASCII whitespace token semanticsで検査する。Unicode全体の`\s`をseparatorとして使用しない。

final artifact validatorの責務はroot identity、presentation class、legacy hook、bare fragment reference`href="#app"`、legacy ARIA IDREF tokenおよびlegacy HTML ID-reference token不在の検証に限定する。

`./#app`、`?view=compact#app`などbare形式以外のfragment URLは、このvalidatorの検査範囲へ拡張しない。これらを含むsource上の`#app`利用はtracked-file reference searchで検出し、Gateまたはfinal searchで分類する。

static header、router host、overlay layer、footerのcontainmentはSSR test、E2E、diff reviewで検証し、final artifact validatorへ重複実装しない。

この契約は既存の`assertProductionHtmlContracts()`が検証する。別validatorを追加してはならない。


### Runtime Contract

runtime codeはapp shell root lookupに`APP_SHELL_ROOT_SELECTOR`を使用する。

次をroot lookupの正本として使用してはならない。

- `#app`
- `.app-root`
- `.app-shell-root`
- `[data-hydration-scope="app-shell"]`

`.app-shell-root`はpresentation hookであり、runtime lookup hookではない。

### URL / State Contract

app shell root identityを次へ保存してはならない。

- URL
- hash
- history state
- localStorage
- sessionStorage
- navigation payload
- import-export data

## 4. State Model

### Durable State

なし。

app shell root identityは永続化stateではなく、SSRによって各documentへ生成されるstructural identityである。

### Ephemeral State

なし。

このContractはcomponent-local UI stateまたはnavigation中の一時stateを所有しない。

### Derived State

runtime codeが`APP_SHELL_ROOT_SELECTOR`を使って取得する現在document内のroot element。

### Forbidden Coupling

- structural identityをCSS classから導出してはならない。
- structural identityをhydration scopeから導出してはならない。
- root identityをrouter document stateとして扱ってはならない。
- root identityをsidebar stateとして扱ってはならない。
- root identityをURLまたは永続化形式へ保存してはならない。
- `href="#app"`、ARIA IDREF token`app`またはHTML ID-reference token`app`でlegacy rootを参照してはならない。
- 旧hookと新hookを並行維持してはならない。

## 5. Failure Semantics

### Build-time

production HTML artifactがPublic Contractに違反する場合、`assertProductionHtmlContracts()`はproduction buildを失敗させる。

検出対象:

- root欠落
- root重複
- presentation class欠落
- root elementの`id`属性残存
- legacy ID残存
- legacy class token残存
- legacy bare fragment reference残存
- legacy ARIA IDREF token残存
- legacy HTML ID-reference token残存

### Runtime

このContractはroot欠落または重複時の新しいruntime hard failを定義しない。

導入禁止:

- root欠落時のthrow
- root重複時のthrow
- runtime root validator
- compatibility selector
- fallback selector
- 旧hook alias

sidebar overlay helperがroot欠落時に`document.body`へlayerを追加する既存挙動は、このContractの新しいpublic contractではない。

既存compatibility behaviorとして回帰検証する。

## 6. Integration Boundaries

### Build-time / SSR

`src/layouts/BaseLayout.11ty.ts`がproduction documentへrootを1個出力する。

root identityはJavaScript実行前に存在する。

### Final Artifact

`scripts/assert-production-html-contracts.ts`が`dist/`配下の生成HTMLを検証する。

validatorは`APP_SHELL_ROOT_ATTRIBUTE`をshared contractからimportし、structural attribute literalを再定義しない。

presentation class tokenはverification oracleとしてvalidator内でlocal定義してよい。runtimeまたはproduction implementation向けに共有定数化しない。

### CSS

`src/assets/css/app-shell.css`は`.app-shell-root`をpresentation hookとして使用する。

structural data属性をCSS selectorへ使用しない。

### Client Runtime

sidebar overlay helperは共有`APP_SHELL_ROOT_SELECTOR`を使用してrootを探索する。

### Router Document

app shell rootは`router-document-host`をcontainする。

`main#main-content`のidentity、light DOM boundary、skip link到達先としての本文契約は`docs/contracts/router-document.md`を参照する。

### Hydration

既存のhydration marker、owner、scopeを維持する。

root identityとhydration ownershipを同一selectorへ統合しない。

### Storybook

Storybookはdocs／smoke／手動確認用fixtureであり、このContractのproduction structural ownerではない。

Storybook fixtureの変更条件はChange Planで扱い、このContractのpublic surfaceへ昇格しない。

## 7. Acceptance Criteria

- production SSRに`[data-app-shell-root]`が1個だけ存在する。
- 同じ要素が`app-shell-root`class tokenを持つ。
- production app shell rootが`id`属性を持たない。
- production SSRに`id="app"`が存在しない。
- production SSRに`app-root`class tokenが存在しない。
- runtime lookupが`APP_SHELL_ROOT_SELECTOR`を使用する。
- CSSが`.app-shell-root`を使用する。
- CSSが`[data-app-shell-root]`をpresentation selectorに使用しない。
- hydration marker、owner、scopeが維持される。
- skip linkがrootより前に存在する。
- static header、`router-document-host`、sidebar overlay layer、footerがroot内に存在する。
- final production HTML artifactが新root identityを持つ。
- final production HTML artifactに`href="#app"`、ARIA IDREF token`app`またはHTML ID-reference token`app`が存在しない。
- 旧hook alias、compatibility shim、fallback selector、並行selectorを追加しない。
