# Static Header Contract

## 1. Status

- Type: Normative
- Decision ID: D-STATIC-HEADER-AS-AUTHORITATIVE-CONTRACT
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

### D-STATIC-SEARCH-TRIGGER-ANCHOR-FALLBACK-AS-AUTHORITATIVE

Header search trigger は、旧 `ui-search-trigger` の完全復元ではなく、静的 HTML header における anchor fallback を正本とする。

- No-JS 時は `/search/` への link として機能する。
- JS enabled 時は `data-search-dialog-trigger` を起点に search dialog trigger として機能する。
- 旧 `ui-search-trigger` custom element API は復元しない。
- Header search trigger から `open-search-dialog` custom event を発火する保証は復元しない。
- Search trigger は button 化しない。
- Space activation は旧 button 由来の legacy behavior であり、静的 anchor fallback contract では復元しない。

この決定は、Search trigger を TOC trigger と同じ fallback link 系の header control として扱い、corpus link と同様に native link semantics を優先するためのものである。No-JS baseline と JS enabled behavior の意味論的一貫性は、Enter、click、search shortcut を正の activation 経路とする方が明確である。

採用しない案は次の通り。

- 旧 `ui-search-trigger` custom element を復元する案。
- Search trigger を button 化する案。
- Header search trigger から `open-search-dialog` custom event を発火する保証を復元する案。
- Space activation を復元する案。

反対仮説として、「旧 `ui-search-trigger` は内部的に button だったため、検索トリガーは Space activation を復元すべきである」という見方がある。この仮説は採用しない。現行正本は静的 HTML 版 header であり、旧 `ui-search-trigger` API は復元対象外である。Search trigger は検索ページへの fallback link を持つため、anchor semantics を優先する。Space activation は button-like shim であり link semantics とは異なるため、No-JS baseline と JS enabled behavior の意味論的一貫性を保つには、Enter、click、shortcut を正とする方が明確である。Space activation を将来採用する場合は、別 request の R3 full で扱う。

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
| Button-like visual behavior | Typography、outline 主体の focus-visible、hover、active、touch target を header controls に移植する。Focus-visible は box-shadow による二重リングを必須契約にしない。 | `src/assets/css/layout-header.css` |
| Search trigger density | 静的 anchor fallback としての visual density を静的 CSS と E2E で固定する。旧 `ui-search-trigger` API 互換は保持しない。 | `src/assets/css/layout-header.css` / `test/e2e/static-header-migration.spec.ts` |
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
| Search trigger の button 化 | 採用しない。 | `/search/` fallback link と native link semantics を維持するため。 |
| Search trigger の Space activation | Restore しない。 | Space activation は旧 button 由来の legacy behavior であり、静的 anchor fallback、no-JS baseline、TOC / corpus link との一貫性を優先するため。 |
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
- Corpus menu は content-constrained な幅を持つ。通常サポート viewport では trigger width 以上を保ち、trigger width と viewport containment が衝突する場合は viewport containment を優先する。
- Corpus item の長い label は 1 行で省略される。Default label は不自然に省略しない。
- Current corpus item は `aria-current="page"` を保持する。
- Current corpus item の視覚表現は text emphasis を基本とし、left border marker は採用しない。

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
- JS enabled: `data-search-dialog-trigger` を起点に search dialog trigger として機能する。
- Visible label は `検索...` とする。
- Accessible name は `検索ダイアログを開く` とする。
- `aria-haspopup="dialog"`、`aria-controls`、`aria-expanded` を検証対象にする。
- Header search trigger は `open-search-dialog` custom event 発火を保証しない。
- Header search trigger は旧 `ui-search-trigger` custom element API の復元対象ではない。
- Header search trigger は button ではなく、検索ページへの fallback link を持つ anchor として扱う。
- Activation は native link semantics と dialog enhancement の両立を前提に、Enter、click、search shortcut を正とする。
- Space activation は旧 button 由来の legacy behavior であり、静的 anchor fallback contract では復元しない。
- Space activation を復元しない理由は、anchor semantics、no-JS baseline、TOC trigger / corpus link と同じ link 系 contract との一貫性を保つためである。
- Dialog open、close、focus return、`aria-expanded` 同期は `search-dialog-enhancer.ts` / `search-dialog-dom-controller.ts` の責務である。

### Header Control Visual Contract

Header controls は、corpus trigger、theme trigger、search trigger、TOC trigger、sidebar trigger を含む静的 header 内の操作要素である。

- Hover は内部 icon / text ではなく、control root surface の状態として表現する。
- Theme trigger の root control surface は `[data-header-menu='theme'] > [data-header-menu-trigger]` とする。
- Top-level controls と menu panel 内 item は selector 上分離して扱う。Top-level controls の visual state は `.sidebar-toggle`、`.toc-trigger`、`.search-trigger`、`[data-header-menu] > [data-header-menu-trigger]` を主 selector とし、menu item 共通の visual state は `[data-header-menu-item]` を主 selector とする。
- `summary` は disclosure semantics と UA marker reset のために使う。`summary` から data attribute selector へ移す対象は base control、hover、focus-visible、active、hit target などの visual state contract であり、`summary` の `list-style` reset と `summary::-webkit-details-marker` は summary 固有補正として残す。
- Focus-visible は outline 主体で表現する。
- Focus-visible outline は `--focus-ring-*` token に基づく。
- Focus ring 用 box-shadow による二重リングは必須契約にしない。
- Box-shadow は header control 共通契約として禁止もしない。
- Focus-visible は `:focus-visible` を正とし、`:focus` へ戻さない。
- Forced-colors でも focus-visible outline を識別可能にする。
- Menu panel 内 item の hover、focus-visible、active、hit target は top-level controls の selector 整理後も維持する。
- Corpus menu item は `display: block`、1 行 ellipsis、content-constrained menu width、viewport containment を維持する。
- Current corpus item は `aria-current="page"` と text emphasis を維持し、left border marker / `border-inline-start` は再導入しない。
- Search trigger 固有の hover、focus-visible、active、responsive density、border-color、background state は top-level 共通 selector によって退化させない。
- Top-level trigger の 44px hit target pseudo-element は維持する。
- Header controls の visual contract は本文リンク、検索ダイアログ、sidebar、本文 TOC link へ波及させない。
- この具体化は既存 contract の明確化であり、R3 相当の公開契約変更ではない。

#### Search Trigger Visual Contract

Search trigger は、通常時には input-like に見えるが、本文への没入を妨げない muted control として表現する。

- Icon は muted、placeholder は subtle な視覚強度を基本とする。
- Placeholder は visible label だが、accessible name には参加させない。
- Hover は clickable であることを示すため、background / border の変化を持つ。
- Focus-visible は明確な outline / ring を持つ。
- Active は押下感を持つ。
- Reduced motion では active transform に依存しない。
- Forced-colors では border、background、icon、placeholder が判別可能である。
- Responsive density は regular / compact / icon-only を維持する。
- Icon-only density でも expanded hit area は 44px を下回らない。

### TOC Trigger

TOC trigger は `#static-toc` fallback と mobile TOC panel trigger の二重 contract を持つ。

- No-JS: `#static-toc` への fragment link として機能する。
- JS enabled and TOC runtime ready: mobile TOC panel trigger として機能する。
- Runtime ready 前は、fallback anchor を維持したまま ready ではない状態を表現する。
- `aria-controls` は初期 static TOC root から hydrated 後の mobile panel id へ切り替わる contract として扱う。
- TOC trigger は button 化しない。

## 7. Integration Boundaries

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
