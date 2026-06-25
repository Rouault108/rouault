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

この文書は decision record です。現在の contract を再定義する正本ではありません。現行 contract の正本は `docs/contracts/static-header-contract.md` です。

## Context

Static header の corpus dropdown では、current corpus item が navigation 上の現在位置を示す。これまでは `aria-current="page"` と text emphasis が中心で、視覚的な current state が文字の太さに寄りすぎていた。

今回の変更では、意味論の正本を `aria-current="page"` に保ったまま、current corpus item を persistent selected surface と semibold text emphasis で表現する。非 current corpus item は normal weight を baseline とし、medium / bold を既定表示にしない。

## Evidence

- `src/assets/css/layout-header.css`
  - menu item base weight は header control token を継承し、実質的に medium だった。
  - current corpus item は semibold text emphasis を使っていた。
  - persistent selected surface は current corpus item contract として固定されていなかった。
- `docs/contracts/static-header-contract.md`
  - current corpus item は `aria-current="page"` と text emphasis を持つと記述されていた。
  - left border marker は採用されていなかった。
- `src/assets/css/tokens.css`
  - `--bg-surface-active` は active surface token として存在する。
- `test/e2e/static-header-migration.spec.ts`
  - 既存 visual test は font-weight 中心で、selected surface を十分に assert していなかった。
- `test/ssr/static-css-contracts.test.ts`
  - persistent selected surface と CSS order contract は十分に固定されていなかった。

## Decision

Current corpus item の semantic source of truth は `aria-current="page"` とする。

Current corpus item は、persistent selected surface と semibold text emphasis で表現する。Selected surface は `--bg-surface-active` を第一候補 token とし、hover / focus-visible / active で消されない順序に置く。

Non-current corpus item は normal weight を baseline とし、medium / bold を default visual state にしない。

Forced-colors では current corpus item を `background: Highlight` と `color: HighlightText` で識別可能にする。

## Rejected alternatives

- Text emphasis only: current state が文字の太さだけに依存し、視覚契約として弱い。
- Left border marker: 静かな dropdown surface と衝突し、既存 contract でも採用されていない。
- Check icon: 現時点では追加せず、アイコン追加判断を別 request に分離する。
- `aria-selected`: navigation current を表す意味論では `aria-current="page"` が適切である。
- `role="menu"` / `role="menuitem"`: corpus switcher は navigation disclosure であり、menu pattern 全体の採用は現行 contract と衝突する。
- `border-color: Highlight` as a forced-colors requirement: forced-colors の current marker は background / color で固定し、border marker を契約化しない。
- Mandatory order against generic menu item hover / active rules: 今回固定するのは corpus hover / focus-visible / active background との順序だけで、generic menu item rule order は必須契約にしない。

## Counter-hypotheses

Text emphasis only でも十分に見分けられるという仮説は採用しない。非 current item の baseline が medium に寄ると差分が弱く、current state が hover state とも独立しないためである。

Left border marker や check icon の方が明確という仮説は今回採用しない。Static header の corpus dropdown は navigation link 群であり、今回の scope は selected surface の契約化に限定する。

## Review

この判断は R3 / A0 として扱う。意味論、CSS visual state、SSR CSS contract、E2E visual contract、Static Header Contract を同時に更新する。

## Contract impact

- `docs/contracts/static-header-contract.md` は current corpus item の semantic source of truth と visual contract を更新する。
- `src/assets/css/layout-header.css` は non-current normal weight、current selected surface、current semibold、forced-colors current surface を実装する。
- `test/ssr/static-css-contracts.test.ts` は selector-scoped CSS declaration と root-level order を固定する。
- `test/e2e/static-header-migration.spec.ts` は open corpus panel 内の current / non-current visual state を比較する。

## Unresolved

- Check icon addition is deferred.
- Current hover-specific token is deferred.
- Corpus switcher keyboard interaction redesign is out of scope.

## Out of scope

- `src/layouts/layout-header-html.ts` の変更。
- Routing、corpus data model、theme manager、search dialog、TOC、sidebar、icon generation、hydration behavior、keyboard enhancement logic の変更。
- Theme menu redesign。
- Header-wide redesign。

## Delete / Breaking Change Gate

この変更は current corpus item の visual contract を変更するが、DOM role、navigation semantics、routing contract は変更しない。

削除・破壊的変更として扱うべき境界は次の通り。

- `aria-current="page"` を外す変更は不可。
- `aria-selected`、`role="menu"`、`role="menuitem"` を追加する変更は別 request の判断対象とする。
- left border marker / `border-inline-start` を戻す変更は別 request の判断対象とする。
- generic menu item hover / active rule order を必須契約に広げる変更は別 request の判断対象とする。

## Rollback

Rollback する場合は、`src/assets/css/layout-header.css` の current selected surface と non-current normal weight を戻し、`docs/contracts/static-header-contract.md`、`test/ssr/static-css-contracts.test.ts`、`test/e2e/static-header-migration.spec.ts` の対応契約を同時に戻す。また、`docs/adr/corpus-current-selected-surface.md` と `docs/README.md` の登録更新も同時に戻す。

ただし、`aria-current="page"` は semantic source of truth として維持する。
