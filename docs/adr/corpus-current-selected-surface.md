# Corpus Current Selected Surface Decision Record

## Status

- ADR ID: ADR-CORPUS-CURRENT-SELECTED-SURFACE-001
- Request ID: REQ-CORPUS-CURRENT-VISUAL-001
- Decision ID: DEC-CORPUS-CURRENT-VISUAL-001
- Acceptance ID: ACC-CORPUS-CURRENT-VISUAL-001
- Verification ID: VER-CORPUS-CURRENT-VISUAL-001
- R段階 / Aレベル: R3 / A0
- Status: Superseded
- Date: 2026-06-23
- Superseded by: ADR-HEADER-CORPUS-CURRENT-INDICATOR-001
- Superseded date: 2026-06-25
- Contract source of truth: `docs/contracts/static-header-contract.md`

> This decision has been superseded by `docs/adr/header-corpus-current-indicator.md`.
> Historical rationale is retained for review traceability.

この文書はdecision recordです。現在のcontractを再定義する正本ではありません。現行contractの正本は`docs/contracts/static-header-contract.md`です。

## Context

Static headerのcorpus dropdownでは、current corpus itemがnavigation上の現在位置を示す。これまでは`aria-current="page"`とtext emphasisが中心で、視覚的なcurrent stateが文字の太さに寄りすぎていた。

今回の変更では、意味論の正本を`aria-current="page"`に保ったまま、current corpus itemをpersistent selected surfaceとsemibold text emphasisで表現する。非current corpus itemはnormal weightをbaselineとし、medium / boldを既定表示にしない。

## Evidence

- `src/assets/css/layout-header.css`
  - menu item base weightはheader control tokenを継承し、実質的にmediumだった。
  - current corpus itemはsemibold text emphasisを使っていた。
  - persistent selected surfaceはcurrent corpus item contractとして固定されていなかった。
- `docs/contracts/static-header-contract.md`
  - current corpus itemは`aria-current="page"`とtext emphasisを持つと記述されていた。
  - left border markerは採用されていなかった。
- `src/assets/css/tokens.css`
  - `--bg-surface-active`はactive surface tokenとして存在する。
- `test/e2e/static-header-migration.spec.ts`
  - 既存visual testはfont-weight中心で、selected surfaceを十分にassertしていなかった。
- `test/ssr/static-css-contracts.test.ts`
  - persistent selected surfaceとCSS order contractは十分に固定されていなかった。

## Decision

Current corpus itemのsemantic source of truthは`aria-current="page"`とする。

Current corpus itemは、persistent selected surfaceとsemibold text emphasisで表現する。Selected surfaceは`--bg-surface-active`を第一候補tokenとし、hover / focus-visible / activeで消されない順序に置く。

Non-current corpus itemはnormal weightをbaselineとし、medium / boldをdefault visual stateにしない。

Forced-colorsではcurrent corpus itemを`background: Highlight`と`color: HighlightText`で識別可能にする。

## Rejected alternatives

- Text emphasis only: current stateが文字の太さだけに依存し、視覚契約として弱い。
- Left border marker: 静かなdropdown surfaceと衝突し、既存contractでも採用されていない。
- Check icon: 現時点では追加せず、アイコン追加判断を別requestに分離する。
- `aria-selected`: navigation currentを表す意味論では`aria-current="page"`が適切である。
- `role="menu"` / `role="menuitem"`: corpus switcherはnavigation disclosureであり、menu pattern全体の採用は現行contractと衝突する。
- `border-color: Highlight` as a forced-colors requirement: forced-colorsのcurrent markerはbackground / colorで固定し、border markerを契約化しない。
- Mandatory order against generic menu item hover / active rules: 今回固定するのはcorpus hover / focus-visible / active backgroundとの順序だけで、generic menu item rule orderは必須契約にしない。

## Counter-hypotheses

Text emphasis onlyでも十分に見分けられるという仮説は採用しない。非current itemのbaselineがmediumに寄ると差分が弱く、current stateがhover stateとも独立しないためである。

Left border markerやcheck iconの方が明確という仮説は今回採用しない。Static headerのcorpus dropdownはnavigation link群であり、今回のscopeはselected surfaceの契約化に限定する。

## Review

この判断はR3 / A0として扱う。意味論、CSS visual state、SSR CSS contract、E2E visual contract、Static Header Contractを同時に更新する。

## Contract impact

- `docs/contracts/static-header-contract.md`はcurrent corpus itemのsemantic source of truthとvisual contractを更新する。
- `src/assets/css/layout-header.css`はnon-current normal weight、current selected surface、current semibold、forced-colors current surfaceを実装する。
- `test/ssr/static-css-contracts.test.ts`はselector-scoped CSS declarationとroot-level orderを固定する。
- `test/e2e/static-header-migration.spec.ts`はopen corpus panel内のcurrent / non-current visual stateを比較する。

## Unresolved

- Check icon addition is deferred.
- Current hover-specific token is deferred.
- Corpus switcher keyboard interaction redesign is out of scope.

## Out of scope

- `src/layouts/layout-header-html.ts`の変更。
- Routing、corpus data model、theme manager、search dialog、TOC、sidebar、icon generation、hydration behavior、keyboard enhancement logicの変更。
- Theme menu redesign。
- Header-wide redesign。

## Delete / Breaking Change Gate

この変更はcurrent corpus itemのvisual contractを変更するが、DOM role、navigation semantics、routing contractは変更しない。

削除・破壊的変更として扱うべき境界は次の通り。

- `aria-current="page"`を外す変更は不可。
- `aria-selected`、`role="menu"`、`role="menuitem"`を追加する変更は別requestの判断対象とする。
- left border marker / `border-inline-start`を戻す変更は別requestの判断対象とする。
- generic menu item hover / active rule orderを必須契約に広げる変更は別requestの判断対象とする。

## Rollback

Rollbackする場合は、`src/assets/css/layout-header.css`のcurrent selected surfaceとnon-current normal weightを戻し、`docs/contracts/static-header-contract.md`、`test/ssr/static-css-contracts.test.ts`、`test/e2e/static-header-migration.spec.ts`の対応契約を同時に戻す。また、`docs/adr/corpus-current-selected-surface.md`と`docs/README.md`の登録更新も同時に戻す。

ただし、`aria-current="page"`はsemantic source of truthとして維持する。
