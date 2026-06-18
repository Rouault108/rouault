# Static Header Contract

## 1. Status

- Type: Normative
- Request ID: R-STATIC-HEADER-LIT-CONTRACT-COMPLETION
- Decision ID: D-STATIC-HEADER-AS-AUTHORITATIVE-CONTRACT
- Planning source: `static-header-contract-completion-plan-updated-v3.md` is the sole plan source for this contract phase.
- Source of truth: static HTML header projection, post-hydrate static controllers, header CSS, header E2E contracts
- Applies to: static HTML header, corpus switcher, theme switcher, search trigger, TOC trigger, no-JS fallback, hydrated header behavior
- Non-goals: Lit island restoration, legacy `ui-*` component restoration, router semantics, Pagefind ranking, TOC controller redesign, sidebar controller redesign, UI system redesign

## 2. Decision Record

### D-STATIC-HEADER-AS-AUTHORITATIVE-CONTRACT

Rouault は静的 HTML 版ヘッダーを今後の正とする。旧 Lit 版ヘッダーと `ui-button`、`ui-dropdown`、`ui-search-trigger` などの旧 `ui-*` component は、復元対象ではなく、保持すべき契約の参照元として扱う。

静的 HTML 版を正とする理由は次の通り。

- Static-first / no-JS baseline と整合し、JS 無効時にも header の主要導線が意味を持つ。
- Search trigger は `/search/` への fallback link、TOC trigger は `#static-toc` への fallback link として成立できる。
- Header 全体を Lit island に戻さなくても、hydrated 後に必要な操作契約、状態同期、アクセシビリティ契約は post-hydrate 層で補正できる。
- 現在の課題は静的 HTML 版であること自体ではなく、旧 Lit 版が暗黙に持っていた geometry、visual density、keyboard、focus、ARIA、state sync contract が明文化されていないことにある。

Lit island 復活は採用しない。復活させると、静的 HTML 化で得た no-JS baseline と hydration 分離の利点が後退し、header の責務が component-local lifecycle に戻りやすくなる。この phase の目的は旧 Lit 実装の復元ではなく、静的 HTML 版として保持すべき契約を明文化することである。

`ui-button`、`ui-dropdown`、`ui-search-trigger` を header へ再導入しない。旧 UI system への依存を戻すと、静的 HTML 構造、fallback link、post-hydrate controller の責務境界が曖昧になるためである。

`role="menu"`、`role="menuitem"`、roving tabindex は採用しない。Corpus は navigation disclosure、theme は theme option button group として扱う方が現行静的 HTML 構造と意味論に合う。Menu role を採用する場合は item role、roving tabindex、activation semantics を一体で揃える必要があり、今回の静的 disclosure 方針および native link / button の意味論と衝突する。

## 3. Ownership

### This Layer Owns

- Header を静的 HTML として出力し、no-JS fallback と hydrated behavior を分離すること。
- 旧 Lit 版から保持する contract と、意図的に復元しない legacy API を区別すること。
- Corpus switcher を navigation disclosure として定義すること。
- Theme switcher を theme option button group として定義すること。
- Search trigger と TOC trigger を fallback link と hydrated trigger の二重 contract として定義すること。
- Header の実装責務を HTML projection、CSS、post-hydrate controllers、E2E tests に分けること。

### This Layer Must Not Own

- Router URL 正規化。正本は `docs/contracts/router.md` と `docs/contracts/note-navigation.md`。
- Search ranking、Pagefind index、search source integration。正本は `docs/contracts/search.md`。
- TOC controller の基本 state machine。正本は `docs/contracts/reading-chrome.md`。
- Sidebar controller の基本 state machine。正本は `docs/contracts/sidebar-state.md`。
- Hydration trigger の正本。正本は `docs/contracts/hydration.md`。
- 旧 Lit components の API 互換保証。

## 4. Preserved Contracts / 保持する契約

旧 Lit 版は復元対象ではないが、次の contract は静的 HTML 版へ保持・移植する。

| Contract | Static header policy | Primary responsibility |
|---|---|---|
| Header geometry | Header shell height、alignment、responsive inset を静的 CSS contract として保持する。 | `src/assets/css/layout-header.css` |
| Sidebar inset / TOC inset | Sidebar / TOC presence に応じた header center 領域の inset を保持する。 | `src/assets/css/layout-header.css` |
| Desktop note layout corpus offset | Desktop note layout で corpus switcher の offset contract を保持する。 | `src/assets/css/layout-header.css` |
| Button-like visual behavior | Typography、focus-visible、hover、active、touch target を header controls に移植する。 | `src/assets/css/layout-header.css` |
| Search trigger density | 旧 `ui-search-trigger` 相当の visual density を静的 CSS と E2E で固定する。 | `src/assets/css/layout-header.css` / `test/e2e/static-header-migration.spec.ts` |
| Search trigger ARIA | Dialog trigger として必要な ARIA seed と hydrated 同期を保持する。 | `src/layouts/layout-header-html.ts` / `src/client/post-hydrate/search-dialog-enhancer.ts` |
| Disclosure keyboard and focus | Escape close、focus return、Arrow open などを static disclosure enhancement として保持する。 | `src/client/post-hydrate/static-header-menu-controller.ts` |
| Header state sync | Sidebar、theme、TOC、search の表示状態同期を post-hydrate 層で保持する。 | `src/client/post-hydrate/layout-header-enhancer.ts` and related bridges |
| No-JS fallback | Search、TOC、corpus navigation の fallback を静的 HTML で保持する。 | `src/layouts/layout-header-html.ts` / E2E |

## 5. Contracts Intentionally Not Restored / 意図的に復元しない契約

次の legacy contract は意図的に復元しない。

| Legacy contract | Policy | Reason |
|---|---|---|
| `layout-header` custom element API | Restore しない。 | 静的 HTML 版を正とするため。 |
| `ui-header-sidebar-toggle` event | Restore しない。 | 現行 header contract の主要経路ではないため。 |
| `ui-search-trigger` custom element API | Restore しない。 | Search trigger は anchor fallback を持つ静的要素として扱うため。 |
| Header search trigger からの `open-search-dialog` custom event 発火保証 | Restore しない。 | Dialog open は static enhancer / DOM controller の責務であり、legacy event 発火を header trigger の contract にしないため。 |
| `ui-dropdown` の完全な menu role contract | Restore しない。 | Corpus は navigation disclosure、theme は button group として扱うため。 |
| `role="menu"` / `role="menuitem"` / roving tabindex | 採用しない。 | 現行構造の意味論、native Tab order、fallback link contract と衝突するため。 |
| Corpus link の Space activation | 原則 restore しない。 | Corpus item は native link として扱い、Enter activation を基本とするため。 |
| TOC trigger の button 化 | Restore しない。 | `#static-toc` fallback link を維持するため。 |
| Search trigger の anchor fallback 廃止 | 廃止しない。 | `/search/` fallback を維持するため。 |

## 6. Public Contract

### Corpus Switcher

Corpus switcher は navigation disclosure である。

- Trigger は disclosure を開閉する導線である。
- Panel 内部は navigation link 群である。
- `role="menu"` と `role="menuitem"` は付与しない。
- Roving tabindex は採用しない。
- Native Tab order を維持する。
- Arrow key、Escape、Home / End、typeahead などの hydrated 操作は menu pattern の全面採用ではなく、disclosure UI の利便性補助として扱う。
- Corpus item は native link として扱い、Space activation を独自に強制しない。

### Theme Switcher

Theme switcher は theme option button group である。

- Trigger は disclosure を開閉する導線である。
- Panel 内部は theme option button 群である。
- 各 option は `aria-pressed` または現行実装と整合する選択状態属性で表現する。
- `role="menu"` と `role="menuitem"` は付与しない。
- Roving tabindex は採用しない。
- Keyboard enhancement は corpus と同等の static disclosure enhancement として扱う。

### Search Trigger

Search trigger は `/search/` fallback と dialog trigger の二重 contract を持つ。

- No-JS: `/search/` への link として機能する。
- JS enabled: search dialog trigger として機能する。
- Visible label は `検索...` とする。
- Accessible name は `検索ダイアログを開く` とする。
- `aria-haspopup="dialog"`、`aria-controls`、`aria-expanded` を検証対象にする。
- Header search trigger は `open-search-dialog` custom event 発火を保証しない。
- Dialog open、close、focus return、`aria-expanded` 同期は `search-dialog-enhancer.ts` / `search-dialog-dom-controller.ts` の責務である。

### TOC Trigger

TOC trigger は `#static-toc` fallback と mobile TOC panel trigger の二重 contract を持つ。

- No-JS: `#static-toc` への fragment link として機能する。
- JS enabled and TOC runtime ready: mobile TOC panel trigger として機能する。
- Runtime ready 前は、fallback anchor を維持したまま ready ではない状態を表現する。
- `aria-controls` は初期 static TOC root から hydrated 後の mobile panel id へ切り替わる contract として扱う。
- TOC trigger は button 化しない。

## 7. Implementation Responsibility Map

| File | Responsibility | Phase 1 status |
|---|---|---|
| `docs/contracts/static-header-contract.md` | 静的ヘッダー契約、Decision Record、保持 / 非復元 contract、実装責務対応表、out-of-scope、rollback 方針。 | New normative document |
| `src/assets/css/layout-header.css` | Header geometry、visual density、button-like control style、responsive rules。 | Out of Phase 1 |
| `src/layouts/layout-header-html.ts` | 静的 HTML 構造、fallback href、ARIA seed、data attributes。 | Out of Phase 1 |
| `src/client/post-hydrate/static-header-menu-controller.ts` | Disclosure open / close、keyboard、focus return、ARIA linkage。 | Out of Phase 1 |
| `src/client/post-hydrate/layout-header-enhancer.ts` | Sidebar / theme / shell commit state sync。 | Out of Phase 1 |
| `src/client/post-hydrate/search-dialog-enhancer.ts` | Search trigger と dialog controller の接続。 | Out of Phase 1 |
| `src/client/post-hydrate/search-dialog-dom-controller.ts` | Search dialog open / close / focus return / ARIA expanded 同期。 | Out of Phase 1 |
| `src/client/post-hydrate/layout-header-toc-bridge.ts` | TOC fallback と hydrated mobile panel toggle の橋渡し。 | Out of Phase 1 |
| `test/e2e/static-header-migration.spec.ts` | Static header regression contract。 | Out of Phase 1 |

## 8. Integration Boundaries

### SSR / Static HTML

- Header は static HTML として成立しなければならない。
- Search trigger は `/search/` fallback href を保持する。
- TOC trigger は `#static-toc` fallback href を保持する。
- Corpus navigation は JS 無効時にも通常 link として機能する。

### Client Runtime

- Post-hydrate controllers は static DOM に behavior を追加する。
- Header search trigger から `open-search-dialog` custom event が発火されることを前提にしない。
- Search dialog open は search dialog enhancer / DOM controller が所有する。
- Mobile TOC panel toggle は TOC bridge が所有する。
- Disclosure keyboard と focus return は static header menu controller が所有する。

### Tests

- Phase 1 は contract-only であり、必須テストはない。
- 後続 phase では `test/e2e/static-header-migration.spec.ts` を中心に、静的 DOM、ARIA、keyboard、fallback、state sync を固定する。

## 9. Out Of Scope

Phase 1 では次を行わない。

- 実装変更。
- テスト変更。
- CSS 変更。
- Post-hydrate controller 変更。
- Router 変更。
- Pagefind 変更。
- TOC controller 変更。
- Sidebar controller 変更。
- 旧 Lit components 変更。
- Header を Lit island として復活させること。
- `ui-button` / `ui-dropdown` / `ui-search-trigger` を再導入すること。
- UI system 全体再設計。
- Visual regression screenshot infrastructure の新規導入。
- Overlay primitive 本体の再設計または改修。
- Corpus data model または corpus 表示仕様の変更。

## 10. Phase Rollback

Phase 1 は contract-only commit とする。問題があれば、`docs/contracts/static-header-contract.md` を追加した commit を単独 revert できる状態に保つ。

後続 phase は Phase 1 の contract を前提にするが、実装 phase の問題で contract の誤りが判明した場合は、実装 rollback とは別 commit でこの contract を訂正する。実装変更、テスト変更、CSS 変更を Phase 1 commit に混ぜてはならない。

## 11. Acceptance Criteria

Acceptance ID: A1-STATIC-HEADER-CONTRACT-DOCUMENTED

- `D-STATIC-HEADER-AS-AUTHORITATIVE-CONTRACT` が存在する。
- 静的 HTML 版を正とする理由が明記されている。
- Lit island 復活を不採用にする理由が明記されている。
- `role="menu"` / `role="menuitem"` / roving tabindex を採用しない理由が明記されている。
- Corpus が navigation disclosure として定義されている。
- Theme が theme option button group として定義されている。
- Search trigger が `/search/` fallback と dialog trigger の二重 contract として定義されている。
- TOC trigger が `#static-toc` fallback と mobile TOC panel trigger の二重 contract として定義されている。
- Header search trigger が `open-search-dialog` custom event 発火を保証しないことが明記されている。
- 実装ファイル責務対応表が存在する。
- Out-of-scope が存在する。
- Phase rollback 方針が存在する。

## 12. Verification

Verification ID: V1-DOC-CONTRACT-REVIEW

- 差分精査で `docs/contracts/static-header-contract.md` のみが追加されていることを確認する。
- A1-STATIC-HEADER-CONTRACT-DOCUMENTED の各項目が文書内に存在することを確認する。
- 実装変更が混入していないことを確認する。
- 実装変更がないため必須テストはない。必要に応じて `pnpm run typecheck:app` を実行する。
