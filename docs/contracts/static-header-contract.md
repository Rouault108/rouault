# Static Header Contract

## 1. Status

- Type: Normative
- Decision ID: D-STATIC-HEADER-AS-AUTHORITATIVE-CONTRACT
- Source of truth: static HTML header projection, post-hydrate static controllers, header CSS, header E2E contracts
- Applies to: static HTML header, corpus switcher, theme switcher, search trigger, TOC trigger, no-JS fallback, hydrated header behavior
- Non-goals: Lit island restoration, legacy `ui-*` component restoration, router semantics, Pagefind ranking, TOC controller redesign, sidebar controller redesign, UI system redesign

## 2. Decision Record

### D-STATIC-HEADER-AS-AUTHORITATIVE-CONTRACT

Rouaultは静的HTML版ヘッダーを今後の正とする。旧Lit版ヘッダーと`ui-button`、`ui-dropdown`、`ui-search-trigger`などの旧`ui-*` componentは、復元対象ではなく、保持すべき契約の参照元として扱う。

静的HTML版を正とする理由は次の通り。

- Static-first / no-JS baselineと整合し、JS無効時にもheaderの主要導線が意味を持つ。
- Search triggerは`/search/`へのfallback link、TOC triggerは`#static-toc`へのfallback linkとして成立できる。
- Header全体をLit islandに戻さなくても、hydrated後に必要な操作契約、状態同期、アクセシビリティ契約はpost-hydrate層で補正できる。
- 現在の課題は静的HTML版であること自体ではなく、旧Lit版が暗黙に持っていたgeometry、visual density、keyboard、focus、ARIA、state sync contractが明文化されていないことにある。

Lit island復活は採用しない。復活させると、静的HTML化で得たno-JS baselineとhydration分離の利点が後退し、headerの責務がcomponent-local lifecycleに戻りやすくなる。このphaseの目的は旧Lit実装の復元ではなく、静的HTML版として保持すべき契約を明文化することである。

`ui-button`、`ui-dropdown`、`ui-search-trigger`をheaderへ再導入しない。旧UI systemへの依存を戻すと、静的HTML構造、fallback link、post-hydrate controllerの責務境界が曖昧になるためである。

`role="menu"`、`role="menuitem"`、roving tabindexは採用しない。Corpusはnavigation disclosure、themeはtheme option button groupとして扱う方が現行静的HTML構造と意味論に合う。Menu roleを採用する場合はitem role、roving tabindex、activation semanticsを一体で揃える必要があり、今回の静的disclosure方針およびnative link / buttonの意味論と衝突する。

### D-STATIC-SEARCH-TRIGGER-ANCHOR-FALLBACK-AS-AUTHORITATIVE

Header search triggerは、旧`ui-search-trigger`の完全復元ではなく、静的HTML headerにおけるanchor fallbackを正本とする。

- No-JS時は`/search/`へのlinkとして機能する。
- JS enabled時は`data-search-dialog-trigger`を起点にsearch dialog triggerとして機能する。
- 旧`ui-search-trigger` custom element APIは復元しない。
- Header search triggerから`open-search-dialog` custom eventを発火する保証は復元しない。
- Search triggerはbutton化しない。
- Space activationは旧button由来のlegacy behaviorであり、静的anchor fallback contractでは復元しない。

この決定は、Search triggerをTOC triggerと同じfallback link系のheader controlとして扱い、corpus linkと同様にnative link semanticsを優先するためのものである。No-JS baselineとJS enabled behaviorの意味論的一貫性は、Enter、click、search shortcutを正のactivation経路とする方が明確である。

採用しない案は次の通り。

- 旧`ui-search-trigger` custom elementを復元する案。
- Search triggerをbutton化する案。
- Header search triggerから`open-search-dialog` custom eventを発火する保証を復元する案。
- Space activationを復元する案。

反対仮説として、「旧`ui-search-trigger`は内部的にbuttonだったため、検索トリガーはSpace activationを復元すべきである」という見方がある。この仮説は採用しない。現行正本は静的HTML版headerであり、旧`ui-search-trigger` APIは復元対象外である。Search triggerは検索ページへのfallback linkを持つため、anchor semanticsを優先する。Space activationはbutton-like shimでありlink semanticsとは異なるため、No-JS baselineとJS enabled behaviorの意味論的一貫性を保つには、Enter、click、shortcutを正とする方が明確である。Space activationを将来採用する場合は、別requestのR3 fullで扱う。

## 3. Ownership

### This Layer Owns

- Headerを静的HTMLとして出力し、no-JS fallbackとhydrated behaviorを分離すること。
- 旧Lit版から保持するcontractと、意図的に復元しないlegacy APIを区別すること。
- Corpus switcherをnavigation disclosureとして定義すること。
- Theme switcherをtheme option button groupとして定義すること。
- Search triggerとTOC triggerをfallback linkとhydrated triggerの二重contractとして定義すること。
- Headerの実装責務をHTML projection、CSS、post-hydrate controllers、E2E testsに分けること。

### This Layer Must Not Own

- Router URL正規化。正本は`docs/contracts/router.md`と`docs/contracts/note-navigation.md`。
- Search ranking、Pagefind index、search source integration。正本は`docs/contracts/search.md`。
- TOC controllerの基本state machine。正本は`docs/contracts/reading-chrome.md`。
- Sidebar controllerの基本state machine。正本は`docs/contracts/sidebar-state.md`。
- Hydration triggerの正本。正本は`docs/contracts/hydration.md`。
- 旧Lit componentsのAPI互換保証。

## 4. Preserved Contracts / 保持する契約

旧Lit版は復元対象ではないが、次のcontractは静的HTML版へ保持・移植する。

| Contract                      | Static header policy                                                                                                                                                                                                                                                                                                                                                     | Primary responsibility                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Header geometry               | Header shell height、alignment、responsive insetを静的CSS contractとして保持する。                                                                                                                                                                                                                                                                                    | `src/assets/css/layout-header.css`                                                        |
| Header glass surface          | Headerのtranslucent glass表現はsidebar overlay stateによって解除しない。`data-overlay-sidebar-open`はstackingのみを所有し、background / background-color / backdrop-filter / -webkit-backdrop-filterを宣言しない。forced-colorsなどアクセシビリティmedia queryによるbase header surfaceの上書きは別契約として扱い、overlay-open stateの責務には含めない。 | `src/assets/css/layout-header.css` / `test/ssr/static-css-contracts.test.ts`              |
| Sidebar inset / TOC inset     | Sidebar / TOC presenceに応じたheader center領域のinsetを保持する。                                                                                                                                                                                                                                                                                                  | `src/assets/css/layout-header.css`                                                        |
| Desktop header corpus offset  | Desktop headerでは、corpus switcherはnote layout / sidebar enabledの有無に依存せず、primary start offsetによってinline-start位置を統一する。                                                                                                                                                                                                                      | `src/assets/css/layout-header.css`                                                        |
| Button-like visual behavior   | Typography、outline主体のfocus-visible、hover、active、touch targetをheader controlsに移植する。Focus-visibleはbox-shadowによる二重リングを必須契約にしない。                                                                                                                                                                                                    | `src/assets/css/layout-header.css`                                                        |
| Search trigger density        | 静的anchor fallbackとしてのvisual densityを静的CSSとE2Eで固定する。旧`ui-search-trigger` API互換は保持しない。                                                                                                                                                                                                                                                 | `src/assets/css/layout-header.css` / `test/e2e/static-header-migration.spec.ts`           |
| Search trigger ARIA           | Dialog triggerとして必要なARIA seedとhydrated同期を保持する。                                                                                                                                                                                                                                                                                                       | `src/layouts/layout-header-html.ts` / `src/client/post-hydrate/search-dialog-enhancer.ts` |
| Disclosure keyboard and focus | Escape close、focus return、Arrow openなどをstatic disclosure enhancementとして保持する。                                                                                                                                                                                                                                                                             | `src/client/post-hydrate/static-header-menu-controller.ts`                                |
| Header state sync             | Sidebar、theme、TOC、searchの表示状態同期をpost-hydrate層で保持する。                                                                                                                                                                                                                                                                                                 | `src/client/post-hydrate/layout-header-enhancer.ts` and related bridges                   |
| No-JS fallback                | Search、TOC、corpus navigationのfallbackを静的HTMLで保持する。                                                                                                                                                                                                                                                                                                      | `src/layouts/layout-header-html.ts` / E2E                                                 |

## 5. Contracts Intentionally Not Restored / 意図的に復元しない契約

次のlegacy contractは意図的に復元しない。

| Legacy contract                                                         | Policy                | Reason                                                                                                                                         |
| ----------------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `layout-header` custom element API                                      | Restoreしない。      | 静的HTML版を正とするため。                                                                                                                   |
| `ui-header-sidebar-toggle` event                                        | Restoreしない。      | 現行header contractの主要経路ではないため。                                                                                                  |
| `ui-search-trigger` custom element API                                  | Restoreしない。      | Search triggerはanchor fallbackを持つ静的要素として扱うため。                                                                               |
| Header search triggerからの`open-search-dialog` custom event発火保証 | Restoreしない。      | Dialog openはstatic enhancer / DOM controllerの責務であり、legacy event発火をheader triggerのcontractにしないため。                    |
| Search triggerのbutton化                                             | 採用しない。          | `/search/` fallback linkとnative link semanticsを維持するため。                                                                             |
| Search triggerのSpace activation                                      | Restoreしない。      | Space activationは旧button由来のlegacy behaviorであり、静的anchor fallback、no-JS baseline、TOC / corpus linkとの一貫性を優先するため。 |
| `ui-dropdown`の完全なmenu role contract                               | Restoreしない。      | Corpusはnavigation disclosure、themeはbutton groupとして扱うため。                                                                        |
| `role="menu"` / `role="menuitem"` / roving tabindex                     | 採用しない。          | 現行構造の意味論、native Tab order、fallback link contractと衝突するため。                                                                    |
| Corpus linkのSpace activation                                         | 原則restoreしない。 | Corpus itemはnative linkとして扱い、Enter activationを基本とするため。                                                                     |
| TOC triggerのbutton化                                                | Restoreしない。      | `#static-toc` fallback linkを維持するため。                                                                                                   |
| Search triggerのanchor fallback廃止                                  | 廃止しない。          | `/search/` fallbackを維持するため。                                                                                                           |

## 6. Public Contract

### Corpus Switcher

Corpus switcherはnavigation disclosureである。

- Triggerはdisclosureを開閉する導線である。
- Panel内部はnavigation link群である。
- `role="menu"`と`role="menuitem"`は付与しない。
- Roving tabindexは採用しない。
- Native Tab orderを維持する。
- Arrow key、Escape、Home / End、typeaheadなどのhydrated操作はmenu patternの全面採用ではなく、disclosure UIの利便性補助として扱う。
- Corpus itemはnative linkとして扱い、Space activationを独自に強制しない。
- Corpus menuはcontent-constrainedな幅を持つ。通常サポートviewportではtrigger width以上を保ち、trigger widthとviewport containmentが衝突する場合はviewport containmentを優先する。
- Corpus itemはindicator + label layoutを持つ。`.corpus-switcher__menu a`の既存ruleは残してよいが、corpus itemの正本layoutは後続の`[data-header-menu='corpus'] [data-header-menu-item]` ruleで定義する。
- Corpus itemの長いlabelは`.corpus-menu-item__label`が所有する1行ellipsisで省略される。Default labelは不自然に省略しない。
- Current corpus itemは`aria-current="page"`をsemantic source of truthとして保持する。
- Current corpus itemの視覚表現はcheck indicatorとsemibold text emphasisの組み合わせで表現する。
- Current / non-current corpus itemは、どちらもlink直下の先頭element childに`.corpus-menu-item__indicator` slotを持つ。Link直下構造の契約は、空白text nodeを除外したelement children基準で解釈する。
- Current corpus itemのindicator slotは`svg[data-icon="check"]`を内包し、non-current corpus itemのindicator slotはcheck iconを表示しない。
- Typeahead / searchable labelの正本は`data-header-menu-text`であり、indicator iconやlabel span構造には依存しない。
- Non-current corpus itemはnormal weightをbaselineとする。
- Current corpus itemの通常状態selectorには、`background`、`color`、`border-inline-start`、`border-inline-start-width`、`border-inline-start-style`、`border-inline-start-color`を宣言しない。
- Persistent selected backgroundは通常状態のcurrent表現に使わない。
- Hover / active / focus-visibleは操作状態としてcurrent状態と分離する。Hover / activeはneutral backgroundを維持する。
- Focus-visibleはoutlineを主表現とする。既存neutral focus surfaceは操作状態として許容するが、selected / current表現とは扱わない。
- Left border marker / `border-inline-start`は再導入しない。
- Forced-colorsではcheck indicatorと`aria-current` semanticsを維持し、current専用background / color / border塗りを契約にしない。
- Forced-colors内のcurrent corpus item専用selectorには、`background`、`color`、`border-inline-start`、`border-inline-start-width`、`border-inline-start-style`、`border-inline-start-color`を宣言しない。
- 現行挙動の契約正本は`docs/contracts/static-header-contract.md`である。`docs/adr/header-corpus-current-indicator.md`は今回のDecision Recordであり、現行contractを置き換えるものではない。

### Theme Switcher

Theme switcherはtheme option button groupである。

- Theme preference、storage key、root attributes、resolved theme、document bootstrap、CSS token ownershipは`docs/contracts/theme.md`を正本とする。
- Static header contractはtheme switcherの静的HTML projection、disclosure、button group semantics、keyboard enhancement、focus、visual densityを所有する。
- Header theme switcherはroot theme stateのsource of truthではない。Root stateは`data-theme` / `data-resolved-theme`とtheme managerが所有する。
- SSR projectionの初期表示は`system`として成立し、document bootstrapとtheme chrome bootstrapによりroot stateとheader chrome表示が同期される。
- Triggerはdisclosureを開閉する導線である。
- Panel内部はtheme option button群である。
- 各optionは`aria-pressed`または現行実装と整合する選択状態属性で表現する。
- `role="menu"`と`role="menuitem"`は付与しない。
- Roving tabindexは採用しない。
- Keyboard enhancementはcorpusと同等のstatic disclosure enhancementとして扱う。
- Theme menuはcontent-constrainedな幅を持つ。通常サポートviewportではtrigger width以上を保ち、short theme option labelに対してgeneric header menuの`12rem` fixed floorへ依存しない。
- Theme menuはviewport containmentを維持する。
- Theme menuのcontent-constrained widthはvisual density / width containment contractであり、theme preference、storage、root attributes、resolved theme、document bootstrapのsource of truthを変更しない。
- Theme menuはcorpus menuと同系統のvisual density / width containmentを採用するが、navigation semantics、link semantics、selected state semanticsは共有しない。
- Theme option itemは折り返しを避ける。ただし、長文theme labelのellipsis設計は今回のcontractに含めない。

### Search Trigger

Search triggerは`/search/` fallbackとdialog triggerの二重contractを持つ。

- No-JS: `/search/`へのlinkとして機能する。
- JS enabled: `data-search-dialog-trigger`を起点にsearch dialog triggerとして機能する。
- Visible labelは`検索...`とする。
- Accessible nameは`検索ダイアログを開く`とする。
- `aria-haspopup="dialog"`、`aria-controls`、`aria-expanded`を検証対象にする。
- Header search triggerは`open-search-dialog` custom event発火を保証しない。
- Header search triggerは旧`ui-search-trigger` custom element APIの復元対象ではない。
- Header search triggerはbuttonではなく、検索ページへのfallback linkを持つanchorとして扱う。
- Activationはnative link semanticsとdialog enhancementの両立を前提に、Enter、click、search shortcutを正とする。
- Space activationは旧button由来のlegacy behaviorであり、静的anchor fallback contractでは復元しない。
- Space activationを復元しない理由は、anchor semantics、no-JS baseline、TOC trigger / corpus linkと同じlink系contractとの一貫性を保つためである。
- Dialog open、close、focus return、`aria-expanded`同期は`search-dialog-enhancer.ts` / `search-dialog-dom-controller.ts`の責務である。

### Header Control Visual Contract

Header controlsは、corpus trigger、theme trigger、search trigger、TOC trigger、sidebar triggerを含む静的header内の操作要素である。

- Hoverは内部icon / textではなく、control root surfaceの状態として表現する。
- Theme triggerのroot control surfaceは`[data-header-menu='theme'] > [data-header-menu-trigger]`とする。
- Top-level controlsとmenu panel内itemはselector上分離して扱う。Top-level controlsのvisual stateは`.sidebar-toggle`、`.toc-trigger`、`.search-trigger`、`[data-header-menu] > [data-header-menu-trigger]`を主selectorとし、menu item共通のvisual stateは`[data-header-menu-item]`を主selectorとする。
- `summary`はdisclosure semanticsとUA marker resetのために使う。`summary`からdata attribute selectorへ移す対象はbase control、hover、focus-visible、active、hit targetなどのvisual state contractであり、`summary`の`list-style` resetと`summary::-webkit-details-marker`はsummary固有補正として残す。
- Focus-visibleはoutline主体で表現する。
- Focus-visible outlineは`--focus-ring-*` tokenに基づく。
- Focus ring用box-shadowによる二重リングは必須契約にしない。
- Box-shadowはheader control共通契約として禁止もしない。
- Focus-visibleは`:focus-visible`を正とし、`:focus`へ戻さない。
- Forced-colorsでもfocus-visible outlineを識別可能にする。
- Menu panel内itemのhover、focus-visible、active、hit targetはtop-level controlsのselector整理後も維持する。
- Corpus menu itemはindicator + label layout、content-constrained menu width、viewport containmentを維持する。`.corpus-menu-item__label`が1行ellipsisの正本であり、anchor自身のellipsisを正本にしない。
- Theme menu panelはcontent-constrained visual densityを持つ。Corpus menuとwidth containmentの考え方は揃えるが、corpus navigation semanticsとtheme button group semanticsは混同しない。
- Current corpus itemは`aria-current="page"`をsemantic source of truthとし、check indicatorとsemibold text emphasisで表現する。
- Current / non-current corpus itemは、どちらもlink直下の先頭element childに`.corpus-menu-item__indicator` slotを持つ。Link直下構造の契約は、空白text nodeを除外したelement children基準で解釈する。
- Current corpus itemのindicator slotは`svg[data-icon="check"]`を内包し、non-current corpus itemのindicator slotはcheck iconを表示しない。
- Typeahead / searchable labelの正本は`data-header-menu-text`であり、indicator iconやlabel span構造には依存しない。
- Current corpus itemの通常状態selectorには、`background`、`color`、`border-inline-start`、`border-inline-start-width`、`border-inline-start-style`、`border-inline-start-color`を宣言しない。
- Persistent selected backgroundは通常状態のcurrent表現に使わない。
- Hover / active / focus-visibleは操作状態としてcurrent状態と分離する。Hover / activeはneutral backgroundを維持し、focus-visibleはoutlineを主表現とする。既存neutral focus surfaceは操作状態として許容するが、selected / current表現とは扱わない。
- Non-current corpus itemはnormal weightをbaselineとし、medium / boldをdefault visual stateにしない。
- Current corpus itemはtext emphasisのみで識別しない。
- Left border marker / `border-inline-start`は再導入しない。
- Forced-colorsではcheck indicatorと`aria-current` semanticsを維持し、current専用background / color / border塗りを契約にしない。
- Forced-colors内のcurrent corpus item専用selectorには、`background`、`color`、`border-inline-start`、`border-inline-start-width`、`border-inline-start-style`、`border-inline-start-color`を宣言しない。
- Search trigger固有のhover、focus-visible、active、responsive density、border-color、background stateはtop-level共通selectorによって退化させない。
- Top-level triggerの44px hit target pseudo-elementは維持する。
- Header controlsのvisual contractは本文リンク、検索ダイアログ、sidebar、本文TOC linkへ波及させない。
- Current corpus indicator contractは`ADR-HEADER-CORPUS-CURRENT-INDICATOR-001`に基づくR3 / A0の公開visual contract変更である。現行挙動の契約正本は引き続き`docs/contracts/static-header-contract.md`であり、新ADRはDecision Recordである。

#### Header Responsive Breakpoint Ownership

Static header controlsのpublic visibility contractはviewport-owned breakpointが所有する。`@container layout-header-shell`はheader内部の密度・配置補正に使ってよいが、公開表示境界を所有してはならない。

- TOC trigger visibilityはviewport 640px境界が所有する。
  - `< 640px`: `data-visible="true"`のとき表示する。
  - `>= 640px`: `data-visible="true"`でも非表示にする。
- Sidebar toggleのdesktop fallback visibilityはviewport 1024px境界が所有する。
  - `< 1024px`: sidebar enabledのとき表示可能にする。
  - `>= 1024px`: sidebar enabledのnote pageではno-JS / hydration前でも非表示にする。
- Header container queryはsearch trigger density、trigger padding、center / compact centerの内部配置、corpus offsetなどのheader-internal adjustmentに限定する。
- `@container layout-header-shell`内でTOC trigger / sidebar toggleのpublic visibilityを`display`で所有してはならない。

#### Desktop Header Corpus Offset

Desktop headerでは、corpus switcherはnote layout / sidebar enabledの有無に依存せず、primary start offsetによってinline-start位置を統一する。

- Corpus switcher offsetはdesktop header共通契約である。
- Center start insetはnote layout + sidebar enabled専用契約である。
- Center end insetはnote layout + TOC presence専用契約である。
- Mobile / compact headerの表示条件はこの契約変更の対象外である。

Decision note: D-HEADER-CORPUS-OFFSET-001

Desktop headerのcorpus switcher offsetは、note/sidebar 条件ではなくheader geometryの共通契約として扱う。

棄却案:

- コーパスページだけを特別扱いする案
- non-note pageだけを追加対象にする案
- corpus pageをnote layout扱いにする案
- `@container`内でheader root自身にcustom propertyを宣言する案

境界:

- Corpus switcher offsetはdesktop header共通契約である。
- Center start/end insetは引き続きnote layout専用契約に残す。
- DOM、`data-note-layout`、`data-sidebar-enabled`、menu behaviorは変更しない。

#### Search Trigger Visual Contract

Search triggerは、通常時にはinput-likeに見えるが、本文への没入を妨げないmuted controlとして表現する。

- Iconはmuted、placeholderはsubtleな視覚強度を基本とする。
- Placeholderはvisible labelだが、accessible nameには参加させない。
- Hoverはclickableであることを示すため、background / borderの変化を持つ。
- Focus-visibleは明確なoutline / ringを持つ。
- Activeは押下感を持つ。
- Reduced motionではactive transformに依存しない。
- Forced-colorsではborder、background、icon、placeholderが判別可能である。
- Responsive densityはregular / compact / icon-onlyを維持する。
- Icon-only densityでもexpanded hit areaは44pxを下回らない。

### TOC Trigger

TOC triggerは`#static-toc` fallbackとmobile TOC panel triggerの二重contractを持つ。

- No-JS: `#static-toc`へのfragment linkとして機能する。
- JS enabled and TOC runtime ready: mobile TOC panel triggerとして機能する。
- Runtime ready前は、fallback anchorを維持したままreadyではない状態を表現する。
- `aria-controls`は初期static TOC rootからhydrated後のmobile panel idへ切り替わるcontractとして扱う。
- TOC triggerはbutton化しない。

## 7. Integration Boundaries

### SSR / Static HTML

- Headerはstatic HTMLとして成立しなければならない。
- Search triggerは`/search/` fallback hrefを保持する。
- TOC triggerは`#static-toc` fallback hrefを保持する。
- Corpus navigationはJS無効時にも通常linkとして機能する。

### Client Runtime

- Post-hydrate controllersはstatic DOMにbehaviorを追加する。
- Header search triggerから`open-search-dialog` custom eventが発火されることを前提にしない。
- Search dialog openはsearch dialog enhancer / DOM controllerが所有する。
- Mobile TOC panel toggleはTOC bridgeが所有する。
- Disclosure keyboardとfocus returnはstatic header menu controllerが所有する。
