# Theme Contract and Document Bootstrap

## Status

- Type: ADR
- Status: Accepted
- Date: 2026-06-23
- Contract: `docs/contracts/theme.md`

## Context

Theme behavior already exists across `theme-manager.ts`, `BaseLayout.11ty.ts`, `theme-chrome-bootstrap.ts`, static header projection, and `tokens.css`. The behavior was observable in implementation and tests, but the contract was not collected in one normative document.

`BaseLayout.11ty.ts` also owned the inline document bootstrap body directly. That duplicated theme constants next to the layout shell and made future drift more likely even though the behavior itself did not need to change.

## Decision

Adopt `docs/contracts/theme.md` as the normative contract for current theme behavior.

Move the document theme bootstrap script body into `src/theme/theme-document-bootstrap.ts`, exported as `buildThemeDocumentBootstrapScript()`. `BaseLayout.11ty.ts` keeps the existing inline script escaping path and calls the helper for the raw script body.

Expose shared constants from `theme-manager.ts`:

- `THEME_PREFERENCE_VALUES`
- `RESOLVED_THEME_VALUES`
- `DEFAULT_THEME_PREFERENCE`
- `DARK_MODE_MEDIA_QUERY`

Derive `ThemePreference` from `THEME_PREFERENCE_VALUES` and derive `ResolvedTheme` from `RESOLVED_THEME_VALUES`. `ResolvedTheme` is not defined as `Exclude<ThemePreference, 'system'>`.

## Accepted Behavior

- Theme preference remains `light | dark | system`.
- Default preference remains `system`.
- Resolved theme remains `light | dark`.
- Storage key remains `rouault-theme-preference`.
- Root attributes remain `data-theme` and `data-resolved-theme`.
- Document bootstrap reads storage, resolves system preference, and applies root attributes and `color-scheme`.
- Document bootstrap does not write storage and does not dispatch theme change events.
- Header theme UI semantics remain owned by `docs/contracts/static-header-contract.md`.
- CSS token values and ownership remain unchanged.

## Rejected Alternatives

- Keep the document bootstrap body in `BaseLayout.11ty.ts`.
  - Rejected because layout would continue owning theme script details and duplicated constants.
- Make document bootstrap call runtime theme manager functions directly.
  - Rejected because the inline script is a small early document bootstrap, not a runtime module loader.
- Derive `ResolvedTheme` by excluding `system` from `ThemePreference`.
  - Rejected because resolved theme has its own value contract: `light | dark`.
- Add a new theme option or broaden resolved theme values.
  - Rejected as out of scope and breaking for current root attribute consumers.
- Move persistence to cookie or server state.
  - Rejected as out of scope and not required by current implementation evidence.

## Counter-Hypotheses

- "The header theme switcher contract should own root theme attributes."
  - Not adopted. Header owns UI semantics and projection; root theme attributes are theme contract state.
- "The document bootstrap should persist normalized storage immediately."
  - Not adopted. Current early bootstrap only applies document root state; runtime theme manager owns persistence.
- "Resolved theme can be inferred forever from preference values."
  - Not adopted. The contract explicitly keeps resolved theme as its own `light | dark` value set.

## Delete / Breaking Change Gate

This change passes as non-breaking because it documents current behavior and moves script body ownership without changing public values, DOM attributes, storage key, event name, theme switcher semantics, CSS token values, or `initTheme()` order.

Deleting or changing any of the following requires a future breaking-change review:

- `THEME_STORAGE_KEY` value.
- `THEME_ATTRIBUTE` / `RESOLVED_THEME_ATTRIBUTE` values.
- `THEME_CHANGE_EVENT` value.
- Theme preference value set.
- Resolved theme value set.
- `data-theme` / `data-resolved-theme` semantics.
- Header theme switcher ARIA semantics.
- CSS token ownership for root theme selectors.

## Acceptance

- A-THEME-001: `docs/contracts/theme.md`が追加され、theme preference、storage、root attribute、resolved theme、SSR bootstrap、system theme、CSS token ownership、header projectionが契約として読めること。
- A-THEME-002: `docs/contracts/static-header-contract.md`が、theme switcher UI semanticsとtheme contract本体の責務境界を明示していること。
- A-THEME-003: `docs/README.md`の正本Contract一覧に`docs/contracts/theme.md`が登録されていること。
- A-THEME-004: `docs/adr/theme-contract-and-document-bootstrap.md`が採用仕様、棄却案、反対仮説、Delete / Breaking Change Gateのnon-breaking passage、rollback方針を記録していること。
- A-THEME-005: `docs/README.md`のADR一覧に`docs/adr/theme-contract-and-document-bootstrap.md`が登録されていること。
- A-THEME-006: ADRは`docs/contracts/theme.md`を上書きせず、根拠を現行実装・既存テスト・既存docsから確認できる範囲に限定していること。
- A-THEME-007: `theme-manager.ts`がtheme preference値集合、resolved theme値集合、`ThemePreference`型、`ResolvedTheme`型、既定preference、dark mode media queryをshared source of truthとして定義していること。
- A-THEME-007a: `ResolvedTheme`は`Exclude<ThemePreference, 'system'>`ではなく、`RESOLVED_THEME_VALUES = ['light', 'dark']`から導出されていること。
- A-THEME-008: `theme-manager.ts`の既存関数がshared constantsと矛盾していないこと。
- A-THEME-009: `BaseLayout.11ty.ts`がtheme bootstrap script bodyを直接所有せず、`src/theme/theme-document-bootstrap.ts`の`buildThemeDocumentBootstrapScript()`を使っていること。
- A-THEME-010: `theme-document-bootstrap.ts`が`theme-manager.ts`のconstantsを参照し、runtime関数をinline scriptから直接呼ぶ設計にしていないこと。
- A-THEME-011: `theme-document-bootstrap.ts`がconstantsを`JSON.stringify()`でscript文字列へ埋め込み、HTML escape済み文字列を返していないこと。
- A-THEME-012: SSR出力でdocument theme bootstrapがstylesheetより前、かつclient module scriptより前に出力されること。
- A-THEME-013: SSR contract testが`<script>` blockを列挙し、theme document bootstrap scriptを`THEME_STORAGE_KEY` literalを含むscriptとして特定し、theme chrome bootstrapと混同していないこと。
- A-THEME-014: document bootstrapのsemantic parity testが、iframeでdocument rootと`matchMedia` stubを分離しつつ、共有localStorage keyの元値を保存・復元していること。
- A-THEME-015: document bootstrapはstorageを読み取るだけで、保存・event発火を行わないこと。
- A-THEME-016: 既存のランタイム挙動、DOM属性名、storage key、theme switcher表示、CSS token ownershipが変わらないこと。

## Verification

- V-THEME-001: `pnpm run typecheck`
- V-THEME-002: `pnpm run test:ssr -- base-layout.test.ts`
- V-THEME-003: `pnpm run test:ssr -- static-header-parse5-validator.test.ts`
- V-THEME-004: `pnpm run test:ssr -- tokens-css-contract.test.ts`
- V-THEME-005: `pnpm run test:browser`

## Out of Scope

- 新theme option追加。
- Theme UIデザイン変更。
- CSS token値変更。
- Cookie / server persistenceへの移行。
- `data-theme` / `data-resolved-theme`の名前変更。
- Theme switcherのARIA pattern変更。
- e2e大規模追加。
- OS theme変更時のUX変更。
- user preference import/export 対応。
- theme-chrome-bootstrapの再設計。
- `initTheme()`ランタイム挙動変更。

## Rollback

Rollback is local:

- Restore the previous inline bootstrap body in `BaseLayout.11ty.ts`.
- Remove `src/theme/theme-document-bootstrap.ts`.
- Keep or revert the exported constants depending on whether downstream code has adopted them.
- Remove the new contract and ADR entries from `docs/README.md`.

No content migration, storage migration, CSS token migration, or URL migration is required.
