# Header Corpus Current Indicator Decision Record

## Status

- ADR ID: ADR-HEADER-CORPUS-CURRENT-INDICATOR-001
- Request ID: REQ-HEADER-CORPUS-CURRENT-INDICATOR-001
- Decision ID: DEC-HEADER-CORPUS-CURRENT-INDICATOR-001
- Breaking Change Gate ID: BCG-HEADER-CORPUS-CURRENT-INDICATOR-001
- Acceptance ID: ACC-HEADER-CORPUS-CURRENT-INDICATOR-001
- Verification ID: VER-HEADER-CORPUS-CURRENT-INDICATOR-001
- R段階 / Aレベル: R3 / A0
- Status: Accepted
- Date: 2026-06-25
- Contract source of truth: `docs/contracts/static-header-contract.md`

この文書はdecision recordです。現在のcontractを再定義する正本ではありません。現行挙動の契約正本は`docs/contracts/static-header-contract.md`です。

## Decision

Corpus menuのcurrent itemは、`aria-current="page"`をsemantic source of truthとして維持し、視覚表現はcheck indicatorとsemiboldを主表現にする。

Current corpus itemの通常状態selectorには、`background`、`color`、`border-inline-start`、`border-inline-start-width`、`border-inline-start-style`、`border-inline-start-color`を宣言しない。Forced-colors内のcurrent corpus item専用selectorにも同じpropertyを宣言しない。

Current / non-currentともlink直下の先頭element childに`.corpus-menu-item__indicator` slotを持つ。Current slotは`svg[data-icon="check"]`を内包し、non-current slotはcheck iconを内包しない。Labelは`.corpus-menu-item__label`が所有し、1行ellipsisの正本とする。Typeahead / searchable labelの正本は`data-header-menu-text`とし、indicator iconやlabel span構造には依存しない。

Hover / activeのneutral backgroundは操作状態として維持する。Focus-visibleはoutlineを主表現とし、既存neutral focus surfaceは操作状態として許容するが、selected / current表現とは扱わない。

## Rejected Alternatives

- Persistent selected surface維持。
- Left border marker復活。
- `aria-selected`導入。
- `role="menu"` / `role="menuitem"`導入。
- Search page native `<select>`のcustom choice menu化。
- Theme menu redesignへの拡張。

## Counter-hypotheses Review

Persistent selected surfaceの方がcurrent stateを強く示せるという仮説は採用しない。今回の採用仕様では、currentの意味論を`aria-current="page"`に置き、視覚表現はcheck indicatorとsemiboldに移す。

Left border markerやforced-colorsのcurrent専用塗りで識別性を補う案は採用しない。今回の採用仕様では、left border markerを再導入せず、forced-colorsでもcurrent専用background / color / border塗りを契約にしない。

Menu pattern全体へ移す案は採用しない。Corpus switcherはnavigation disclosureとして維持し、`aria-selected`、`role="menu"`、`role="menuitem"`、roving tabindexは導入しない。

## Contract Impact

- `docs/contracts/static-header-contract.md`はcurrent corpus itemのsemantic source of truth、indicator + label layout、CSS property禁止範囲、interaction state分離を現行contractとして記述する。
- `src/layouts/layout-header-html.ts`はcorpus link直下をindicator slot + label span構造にする。
- `src/assets/css/layout-header.css`はcorpus itemの正本layoutをgridにし、label ellipsisとindicator slotを定義する。
- `test/ssr/static-css-contracts.test.ts`はselector / rule単位でcurrent通常状態とforced-colors current専用selectorの禁止propertyを検査する。
- `test/e2e/static-header-migration.spec.ts`はcurrent / non-currentのindicator slot、check icon、semibold、SPA遷移後同期を検査する。
- `test/ssr/static-header-parse5-validator.test.ts`と`test/fixtures/static-header-contract-cases.ts`は静的HTML projectionとvalidator許容範囲を検査する。

## Out of Scope

- `src/client/post-hydrate/static-header-menu-controller.ts`の変更。
- `build/navigation/static-header-parse5-validator.ts`の変更。
- `shared/navigation/static-header-contract.ts`の変更。
- Corpus routing / data modelの変更。
- Theme manager / theme persistenceの変更。
- Theme menu redesign。
- Search page native `<select>`のcustom化。
- Search controller、Pagefind、search rankingの変更。
- Lit island復活。
- Sidebar / TOC / search dialogのvisual contract変更。
- Design system全体のdropdown抽象化。
- Focus-visible interaction model再設計。

## Breaking Change Gate

この変更はcurrent corpus itemの公開visual contractをpersistent selected surfaceからcheck indicator + semiboldへ変更するR3 / A0変更として扱う。

`aria-current="page"`はsemantic source of truthとして維持する。`aria-selected`、`role="menu"`、`role="menuitem"`、left border marker、current専用background / color / border塗りは導入しない。

Validator sourceの更新が必要になった場合は、この変更範囲では実装を停止し、変更範囲拡張が必要であることを報告する。

## Rollback

Rollbackする場合は、`src/layouts/layout-header-html.ts`のcorpus item markup、`src/assets/css/layout-header.css`のindicator + label layoutとcurrent selector、`docs/contracts/static-header-contract.md`、このADR、superseded ADR、`docs/README.md`、関連SSR / E2E / fixture testを同時に戻す。

ただし、`aria-current="page"`はsemantic source of truthとして維持する。
