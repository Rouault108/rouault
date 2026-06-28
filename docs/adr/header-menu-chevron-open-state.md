# Header Menu Chevron Open State Decision Record

## Status

- Decision Record ID: ADR-HEADER-MENU-CHEVRON-OPEN-STATE-001
- Request ID: REQ-HEADER-MENU-CHEVRON-OPEN-STATE-001
- Decision ID: D-HEADER-MENU-CHEVRON-OPEN-STATE-001
- Gate ID: G-HEADER-MENU-CHEVRON-OPEN-STATE-001
- R段階 / Aレベル: R3 / A0
- Status: Accepted
- Date: 2026-06-28
- Contract source of truth: `docs/contracts/static-header-contract.md`

この文書はDecision Recordである。現行contractの正本は`docs/contracts/static-header-contract.md`である。

## Decision

Header corpus dropdownとtheme dropdownのchevronは、`details[data-header-menu]`のopen stateを示すdisclosure open-state indicatorとして扱う。

CSS visual state sourceは`details[open]`である。Corpus menuがopenのときは`.corpus-trigger-icon`だけを180度rotateし、Theme menuがopenのときは`.theme-trigger-chevron`だけを180度rotateする。既存の`aria-expanded`同期、DOM構造、keyboard behavior、hydration behaviorは変更しない。

## Reasons

Chevron rotationを採用する理由は、dropdownがopenであることをheader内の小さな状態表示として伝えつつ、読書環境を乱す強いmotionやsurface変更を避けられるためである。完全にstaticなchevronでは、open / closed stateの視覚的な差分がtrigger surfaceやmenu panelの存在だけに依存し、disclosureとしての状態確認が弱い。

Trigger-wide motionを採用しない理由は、header control全体の縮小、移動、跳ねなどが本文への集中を妨げるためである。今回の状態表示はchevronだけに限定し、trigger root、label、current / selected state、menu itemへtransform behaviorを波及させない。

`:active` transformを復元しない理由は、`docs/adr/header-control-active-transform-removal.md`で採用したactive transform removalの判断を維持するためである。Chevron rotationは押下中のfeedbackではなく、open stateの持続的なdisclosure indicatorである。

## Rejected Alternatives

- Chevronを完全にstaticのままにする案。Open / closed stateの視覚的な差分が弱いため採用しない。
- Trigger root全体をrotate、scale、translateする案。Header control全体のmotionが読書環境のノイズになるため採用しない。
- `.theme-trigger-icon`、trigger label、current / selected state、menu itemへtransformを広げる案。Disclosure stateの責務がchevron以外へ漏れるため採用しない。
- `:active` transformを復元する案。Active transform removalの既存Decision Recordと衝突し、pressed feedbackとopen-state indicatorを混同するため採用しない。

## Relationship To Active Transform Removal

`header-control-active-transform-removal.md`は、header top-level controlsとmenu panel itemsの`:active` transformを廃止し、active stateを非motion surface feedbackにする判断を記録している。

このDecision Recordはその判断を上書きしない。Open-state chevron rotationは`:active` feedbackではなく、`details[open]`をsource of truthにするdisclosure stateの表示である。`--_header-control-transition`へtransformを戻さず、`:active` selectorへtransformを戻さない。

## Reduced Motion

Reduced motion環境では、既存のheader-wide transition duration reductionに従う。Chevronのopen / closed state自体は変化してよいが、transition durationは`@media (prefers-reduced-motion: reduce)`内のheader-wide ruleで短縮される。

## Delete / Breaking Change Gate

Delete / Breaking Change Gateはchecked and passedとする。

- No deletion.
- No breaking change.
- No DOM structure change.
- No ARIA semantics change.
- No URL / routing change.
- No data contract change.
- No migration / deprecation.

既存の`aria-expanded`同期は変更しない。Theme persistence、hydration behavior、keyboard behavior、current / selected stateも変更しない。

## Rollback Policy

Pre-merge rollback:

- Remove the chevron-specific transform transition and open-state rotate rule from `src/assets/css/layout-header.css`.
- Remove the header chevron open-state contract test from `test/ssr/static-css-contracts.test.ts`.
- Remove the static header contract addition from `docs/contracts/static-header-contract.md`.
- Delete `docs/adr/header-menu-chevron-open-state.md`.
- Remove the ADR entry from `docs/README.md`.
- Do not touch DOM, ARIA, keyboard, hydration, theme persistence, or current / selected state.

Post-merge rollback:

- Remove the chevron-specific CSS and tests.
- Revert the contract addition.
- Update `docs/README.md` according to the project ADR policy.
- Do not simply delete the ADR unless the project ADR policy allows it. Prefer marking it `Superseded` or `Reverted`; if deleting it, document the reason in the rollback diff or a follow-up ADR.
- Do not touch DOM, ARIA, keyboard, hydration, theme persistence, or current / selected state.

## Out Of Scope

- Header-external details behavior.
- `static-choice-menu` behavior.
- Search page UI.
- Theme option item design.
- Corpus item design.
- Pressed / active animation.
- DOM restructuring.
- ARIA synchronization changes.
- Keyboard interaction changes.
- Hydration changes.
- Theme persistence changes.
- Search trigger, TOC trigger, and sidebar toggle behavior.

## Acceptance And Verification

- A-HEADER-CHEVRON-001: Corpus menu open state rotates only `.corpus-trigger-icon` by 180 degrees.
- A-HEADER-CHEVRON-002: Theme menu open state rotates only `.theme-trigger-chevron` by 180 degrees.
- A-HEADER-CHEVRON-003: Trigger root, label, `.theme-trigger-icon`, and menu items do not receive direct `transform` declarations.
- A-HEADER-CHEVRON-004: `:active` transform is not restored.
- A-HEADER-CHEVRON-005: `--_header-control-transition` does not include `transform`.
- A-HEADER-CHEVRON-006: Reduced-motion environments use the existing header-wide transition duration reduction.
- A-HEADER-CHEVRON-007: DOM, ARIA, keyboard, routing, hydration, and theme persistence are unchanged.
- A-HEADER-CHEVRON-008: Contract and ADR describe this as an open-state indicator, not active / pressed feedback.
- A-HEADER-CHEVRON-009: CSS contract tests are limited to `layout-header.css` header chevron behavior.
- A-HEADER-CHEVRON-010: This ADR records the Decision Record, rejected alternatives, Gate result, and rollback policy.

Verification:

- `pnpm run test:ssr -- test/ssr/static-css-contracts.test.ts`
- `pnpm run lint`
- `pnpm run typecheck`
- Diff review confirms only the allowed files changed.
