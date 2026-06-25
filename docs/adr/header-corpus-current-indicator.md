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

この文書は decision record です。現在の contract を再定義する正本ではありません。現行挙動の契約正本は `docs/contracts/static-header-contract.md` です。

## Decision

Corpus menu の current item は、`aria-current="page"` を semantic source of truth として維持し、視覚表現は check indicator と semibold を主表現にする。

Current corpus item の通常状態 selector には、`background`、`color`、`border-inline-start`、`border-inline-start-width`、`border-inline-start-style`、`border-inline-start-color` を宣言しない。Forced-colors 内の current corpus item 専用 selector にも同じ property を宣言しない。

Current / non-current とも link 直下の先頭 element child に `.corpus-menu-item__indicator` slot を持つ。Current slot は `svg[data-icon="check"]` を内包し、non-current slot は check icon を内包しない。Label は `.corpus-menu-item__label` が所有し、1 行 ellipsis の正本とする。Typeahead / searchable label の正本は `data-header-menu-text` とし、indicator icon や label span 構造には依存しない。

Hover / active の neutral background は操作状態として維持する。Focus-visible は outline を主表現とし、既存 neutral focus surface は操作状態として許容するが、selected / current 表現とは扱わない。

## Rejected Alternatives

- Persistent selected surface 維持。
- Left border marker 復活。
- `aria-selected` 導入。
- `role="menu"` / `role="menuitem"` 導入。
- Search page native `<select>` の custom choice menu 化。
- Theme menu redesign への拡張。

## Counter-hypotheses Review

Persistent selected surface の方が current state を強く示せるという仮説は採用しない。今回の採用仕様では、current の意味論を `aria-current="page"` に置き、視覚表現は check indicator と semibold に移す。

Left border marker や forced-colors の current 専用塗りで識別性を補う案は採用しない。今回の採用仕様では、left border marker を再導入せず、forced-colors でも current 専用 background / color / border 塗りを契約にしない。

Menu pattern 全体へ移す案は採用しない。Corpus switcher は navigation disclosure として維持し、`aria-selected`、`role="menu"`、`role="menuitem"`、roving tabindex は導入しない。

## Contract Impact

- `docs/contracts/static-header-contract.md` は current corpus item の semantic source of truth、indicator + label layout、CSS property 禁止範囲、interaction state 分離を現行 contract として記述する。
- `src/layouts/layout-header-html.ts` は corpus link 直下を indicator slot + label span 構造にする。
- `src/assets/css/layout-header.css` は corpus item の正本 layout を grid にし、label ellipsis と indicator slot を定義する。
- `test/ssr/static-css-contracts.test.ts` は selector / rule 単位で current 通常状態と forced-colors current 専用 selector の禁止 property を検査する。
- `test/e2e/static-header-migration.spec.ts` は current / non-current の indicator slot、check icon、semibold、SPA 遷移後同期を検査する。
- `test/ssr/static-header-parse5-validator.test.ts` と `test/fixtures/static-header-contract-cases.ts` は静的 HTML projection と validator 許容範囲を検査する。

## Out of Scope

- `src/client/post-hydrate/static-header-menu-controller.ts` の変更。
- `build/navigation/static-header-parse5-validator.ts` の変更。
- `shared/navigation/static-header-contract.ts` の変更。
- Corpus routing / data model の変更。
- Theme manager / theme persistence の変更。
- Theme menu redesign。
- Search page native `<select>` の custom 化。
- Search controller、Pagefind、search ranking の変更。
- Lit island 復活。
- Sidebar / TOC / search dialog の visual contract 変更。
- Design system 全体の dropdown 抽象化。
- Focus-visible interaction model 再設計。

## Breaking Change Gate

この変更は current corpus item の公開 visual contract を persistent selected surface から check indicator + semibold へ変更する R3 / A0 変更として扱う。

`aria-current="page"` は semantic source of truth として維持する。`aria-selected`、`role="menu"`、`role="menuitem"`、left border marker、current 専用 background / color / border 塗りは導入しない。

Validator source の更新が必要になった場合は、この変更範囲では実装を停止し、変更範囲拡張が必要であることを報告する。

## Rollback

Rollback する場合は、`src/layouts/layout-header-html.ts` の corpus item markup、`src/assets/css/layout-header.css` の indicator + label layout と current selector、`docs/contracts/static-header-contract.md`、この ADR、superseded ADR、`docs/README.md`、関連 SSR / E2E / fixture test を同時に戻す。

ただし、`aria-current="page"` は semantic source of truth として維持する。
