# Code Surfaces Contract

## 1. Status

- Type: Normative
- Source of truth: Markdown transform pipeline、SSR generator、post-hydrate enhancer、code surface CSS
- Applies to: code block、code group、static copy control、code previewに組み込まれるcode root
- Non-goals: 旧Lit Custom Element API互換、copy state machineの完全復元、Phase 3A〜3Cの単独release-ready判定

## 2. Ownership

### This Layer Owns

- code surfaceの静的HTML正本構造。
- code groupのno-JS baselineとenhanced tabsへの昇格契約。
- no-JS tab controls、no-JS copy controls、printの基本方針。
- SSR generator / enhancer / CSSのDOM・属性所有権。
- 旧`ui-code-block` / `ui-code-group` / `ui-copy-button` APIを提供しないこと。

### This Layer Must Not Own

- Markdown parser全体の安全境界。`docs/contracts/markdown.md`を参照する。
- `ui-code-preview`自身のpreview state、built-in controls、toolbar contract。`docs/design-system/components/code-preview.md`を参照する。
- copy buttonのdetailed enhanced state contract。Phase 6で別途固定する。
- hydration trigger ownership。`docs/contracts/hydration.md`を参照する。

## 3. Public Contract

### Static HTML Authority

code surfaceの正本は、旧Lit Custom Elementではなく静的HTMLです。

- 単独code block rootは`figure[data-code-block-root]`とする。
- code bodyは`pre[data-code-block] > code[data-lang]`を基本構造とする。
- code group rootは`section[data-code-group]`とする。
- copy sourceは`template[data-code-copy-source]`とする。
- copy controlは`button[data-copy-button]`とする。

旧`ui-code-block`、`ui-code-group`、`ui-copy-button`はfinal DOMの正本ではありません。これらのtag、property、attribute、custom eventを互換APIとして提供しません。

### Single Code Block

- `figure[data-code-block-root]`はfilename、language、caption、intent、copy control、code bodyを束ねる読書単位です。
- `pre[data-code-block]`はcode bodyのscroll / overflowとsyntax highlightの対象です。
- Shiki token、line number、line highlight、diff add/remove、wrapは静的HTMLとCSSの組み合わせで成立させます。
- overflow accessibilityはenhancerが補助してよいですが、code本文の存在と可読性はJSに依存してはなりません。
- 単独code blockは本文中の読書単位です。`.prose` / `.about-prose`直下の`figure[data-code-block-root]`は本文幅に収めます。
- 長いコード行は外枠を広げず、`pre[data-code-block]`内部の横スクロールで処理します。
- 単独code blockのtop-level layoutは`--ui-code-block-breakout-width` / `--ui-code-block-breakout-margin`で制御します。
- caption mainを持たない単独code blockでは、copy controlはoverlay captionとして表示します。
- overlay copy controlのblock方向位置は`--ui-code-copy-overlay-block-start`で制御します。
- overlay copy controlは、first code lineの視覚中心に近づけつつ、keyboard focus outlineが欠けないblock-startクリアランスを保持します。

### Code Group

code groupはSSR / no-JS時点でstackとして出力し、enhancer実行後にtabs UIへ昇格します。

code groupは比較・切替・複数panelを扱うsurfaceです。ただし、`.prose` / `.about-prose`直下の`section[data-code-group]`は既定では本文幅内に収めます。top-level surface自体を本文幅から広げず、長いコード行は`pre[data-code-block]`内部の横スクロールで処理します。長いtab列はtablist側の横スクロールで処理します。code groupのtop-level layoutは`--ui-code-group-width` / `--ui-code-group-margin-inline`で制御します。

`section[data-code-group]`はcode groupのouter surfaceを所有します。border、background、radius、overflow clippingは`section[data-code-group]`の責務であり、group-owned code block rootへ重ねて持たせません。

`[data-code-block-root][data-code-group-owned='true']`は独立したcode block cardではなく、code group内部のsemantic / code body wrapperです。このrootは`margin-block`、`margin-inline`、overflow clipping、border、background、radius、box-shadow、root-level focus shadowを持ちません。focus-visible自体は`pre[data-code-block]`側で維持し、抑止対象はroot側の二重surface ringに限定します。

group-owned rootでは、`box-sizing`や`position: relative`など視覚surfaceを作らないgeneric root性質を過剰にresetしません。reset対象はsurface視覚、余白、overflow clippingに限定します。

enhanced状態では、header、tab controls、copy control、code bodyを1つのouter surface内の上下領域として表示します。header / body dividerはselected tab下線と重なって過剰な二重線に見えないようにしつつ、forced-colorsでも視認可能でなければなりません。dividerを`box-shadow`だけへ依存させ、forced-colorsで消失する設計は禁止します。

filename / caption付きのgroup-owned code blockでも、captionは独立card headerとして見せません。captionやfilenameはcode group内の補助情報であり、outer surface ownershipを分裂させません。

#### SSR / no-JS

- 全panelを読める状態で出力します。
- `role="tablist"`、`role="tab"`、`role="tabpanel"`は付与しません。
- inactive panelを`hidden`で隠すことを主要方針にしません。
- 各panelはlabelまたはheadingで識別できる必要があります。
- root selected keyは非空の`data-code-group-selected`で表します。
- `data-code-group-sync-scope`は任意のfinal DOM契約属性です。未指定のcode groupは他groupと連動しません。指定する場合は64文字以下で`^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$`に一致するkebab-case識別子だけを許可します。
- tab keyは非空の`data-code-group-key`で表します。
- panel keyはdirect child panelの非空`data-code-group-panel`で表します。
- `data-code-group-tab`はtab marker属性であり、値は`"true"`です。tab keyとして扱いません。
- 各panelは`data-code-group-panel-active="true|false"`を文字列値として持ちます。空属性、boolean由来の単独属性、`"yes"`などは不正です。
- `data-code-group-panel-active="true"`は1件だけで、keyはrootの`data-code-group-selected`と一致します。
- scoped topologyとして、現在のcode group root直下の`.code-group-header[data-code-group-controls="true"]`内tablist直下にある`button[data-code-group-tab]`の`data-code-group-key`集合と、root直下の`section[data-code-group-panel]`集合は一致します。
- tab id、panel id、tabの`data-code-group-panel-id`は非空で、tabの`data-code-group-panel-id`は同じkeyのpanel idと一致します。
- group copy buttonの初期`data-copy-target-id`はactive panelの`data-code-copy-source-id`を指します。
- `data-code-group-value`は現行code group contractでは使いません。旧Custom Element時代の選択値表現としてobsoleteです。
- copy sourceは各panel内に維持します。
- no-JSでは全panel stack表示を維持し、stack labelとpanel dividerでpanel境界を担保します。
- JS有効かつ`@media screen and (scripting: enabled)`対応環境では、enhanced前のinactive panelだけを視覚的に非表示にしてfirst paintのstack flashを抑制します。active panelのstack labelはpre-hydration段階では表示します。
- JS有効だがclient bundleまたはenhancerが失敗した場合、scripting対応環境では初期active panelだけがstack label付きで表示され得ます。これはglobal hydration failure fallbackを導入しない今回Decisionのtrade-offです。

#### Enhanced

- enhancerはrootに`data-code-group-enhanced="true"`または同等のenhanced stateを付与します。
- enhancerはtablist / tab / tabpanel semantics、keyboard navigation、active panel stateを付与します。
- inactive panelの非表示はenhanced stateとCSS selectorの組み合わせで行います。
- group copy controlが存在する場合、enhancerはactive panelのcopy sourceを参照できる状態へ同期します。
- enhancerはtab keyを`data-code-group-key`だけから読み、`data-code-group-tab`をkey fallbackに使いません。
- enhancerのtabs / panels / copy button取得は現在のcode group rootにscopeします。tabsはroot直下header内tablist直下の`button[data-code-group-tab]`、panelsはroot直下の`section[data-code-group-panel]`、copy buttonはroot直下`.code-group-header[data-code-group-controls="true"]`配下`.code-group-header-tools > button[data-code-group-copy][data-copy-button]`だけを対象にします。
- 同期はauthorが`sync-scope`を明示したcode groupだけが対象です。同期範囲は`enhanceCodeGroups(root)`に渡された同一root配下に限定し、`ownerDocument`全体、URL、history、storage、通常`ui-tabs`、`ui-tabs[url-sync]`、TOC、primary tab URL stateへ波及させません。
- 同期はclick、Enter、Spaceによるユーザー選択時だけ発火します。初期hydration、arrow key、Home、End、URL変更、history navigationでは発火しません。
- peer判定は`data-code-group-sync-scope`と`data-code-group-key`の完全一致に基づきます。同期先は`data-code-group-enhanced="true"`のcode groupだけで、同期先に同じkeyのdirect tabとdirect panelの両方がない場合は変更しません。
- 同期先更新はroot selected key、`data-code-group-enhanced` marker、tab selected / active state、roving tabindex、panel active state、group copy targetだけを更新します。focus、scroll、URL、history、storage、custom event dispatchを発生させません。
- nested code groupは親groupのlocal stateに混ぜません。ただしnested code group自体が同一enhance root内で同じsync-scopeを持ちenhanced済みであれば、独立peerとして同期対象になり得ます。

## 4. No-JS Controls

### Tab Controls

- tab controlsはSSR DOMに存在してよいですが、no-JS時点では操作可能UIとして表示しません。
- default CSSではtab controlsを`display: none`相当へ退行させます。
- `inert`、`aria-hidden`、`tabindex="-1"`によるno-JS tab control制御は主要方針にしません。
- enhancer初期化後にのみtab controlsを操作可能UIとして表示します。

### Copy Controls

- copyはJSとClipboard APIに依存するprogressive enhancementです。
- SSR / no-JSではcopy controlを操作可能UIとして表示しない、またはdisabledとします。
- no-JSでもcode本文とcopy sourceの読解を妨げてはなりません。
- success / error / reset state、`data-copy-enhanced`、clipboard fallbackの詳細契約はPhase 6の責務です。

## 5. Print Contract

- printではcode groupの全panelを読める状態にします。
- enhanced stateで隠れているinactive panelもprint mediaでは表示対象に戻します。
- scripting mediaでpre-hydrationに隠したinactive panelもprint mediaでは表示対象に戻します。
- printではstack labelを表示します。
- printではpanel dividerでpanel境界を担保します。
- tab controlsやcopy controlsは印刷上の主内容ではありません。
- beforeprint / afterprintによるDOM変更は最後の手段とし、CSSで成立する方針を優先します。

## 6. DOM / Attribute Ownership

### SSR Generator Owned

- stable id。
- `data-code-block-root`、`data-code-block`、`data-code-group`。
- `data-code-group-selected`、`data-code-group-tab="true"`、`data-code-group-key`、`data-code-group-panel`。
- `data-code-group-sync-scope`。これはfinal DOM契約属性であり、中間source markerではありません。
- `data-code-group-panel-active="true|false"`。これはSSR initial stateであり、hydration後はenhancerが同じ属性をruntime mutable stateとして同期します。
- panel label / heading。
- `template[data-code-copy-source]`。
- copy target id、status id、`aria-describedby`の参照整合。
- hydration annotation。

### Enhancer Owned

- `data-code-group-enhanced`または同等のenhanced state。
- tabs ARIA semantics。
- active tab / active panel state。
- keyboard navigation。
- active panelとgroup copy targetの同期。
- code block overflow accessibilityの補助状態。

### CSS Owned

- SSR stack表示。
- no-JS tab controls / copy controlsの退行表示。
- enhanced tabsのvisible / hidden state。
- print all panels。
- syntax highlight、line number、highlight、diff、wrap、forced-colors、light / dark表示。
- layout / breakoutの視覚制御。

CSSはfinal DOMの意味状態を再定義しません。CSS state contractとcopy button state contractは混同しません。

### CSS Custom Property Override Semantics

単独code blockとcode groupはlayout責務を分離します。

- 単独code blockを広げたい場合は`--ui-code-block-breakout-width` / `--ui-code-block-breakout-margin`をoverrideします。
- code groupを特殊な文脈で広げたい場合は`--ui-code-group-width` / `--ui-code-group-margin-inline`をoverrideします。
- `.prose` / `.about-prose`直下のcode group既定layoutはcontainedです。既定の本文layoutでは`--ui-code-group-width: 100%`、`--ui-code-group-margin-inline: 0`を使います。
- `--ui-code-surface-breakout-width` / `--ui-code-surface-breakout-margin`は互換用fallbackです。`[data-code-block-root]`と`section[data-code-group]`のbase ruleでは参照を維持しますが、top-level layoutの主制御にはしません。
- code typography、copy control寸法、code body padding、focus outline / offsetを変更する場合は、overlay copy位置tokenとCSS契約テストを同時に更新します。
- `--ui-code-surface-padding`および`--ui-code-block-padding`のようなshorthand相当tokenを、overlay copy位置の`calc()`へ直接入れてはなりません。
- overlay配置のために上書きする場合は、単一長さ値を取る`--ui-code-copy-overlay-code-padding-block-start`、`--ui-code-copy-overlay-center-offset`、`--ui-code-copy-overlay-min-block-start`を使います。
- `--ui-code-copy-overlay-*`は、surface側`[data-code-block-root]`ruleに定義します。layout側ruleには定義しません。

このため、過去に`--ui-code-surface-breakout-*`だけで単独code blockとcode groupを同時に広げていたoverrideはsemanticsが変わります。今後、単独code blockの幅を変更する場合はblock専用変数を使い、特殊な文脈でcode groupの幅を変更する場合はgroup専用変数を使ってください。

## 7. Old Custom Element API Removal

次は提供しません。

- `ui-code-block`
- `ui-code-group`
- `ui-copy-button`
- `selected-value`
- `default-selected-value`
- `activation`
- `ui-code-block-change`
- `copy`
- `copy-error`
- MutationObserverによるruntime code group再構成
- `ui-copy-button`のloading threshold
- 旧`ui-copy-button`の状態アイコン機械

これらは旧Lit component間のruntime契約であり、静的HTML正本化後の読解体験の正本ではありません。

## 8. Phase Boundary

Phase 3A、Phase 3B、Phase 3Cはreview unitです。いずれも単独ではrelease-readyではありません。

- Phase 3A: SSR stack DOM。
- Phase 3B: enhancerによるtabs semantics / active state。
- Phase 3C: visibility / print CSS。

code group SSR stack / enhanced tabs移行のrelease-ready判定は、Phase 3A〜3Cの結合完了後に行います。

## 9. Integration Boundaries

### Markdown

Markdown出力はcode surfaceの静的HTML構造を生成します。詳細なdirective family一覧は`docs/references/markdown-output.md`を参照できますが、code surfaceのDOM / state contractは本書を正本とします。

### Code Preview

`ui-code-preview`はcode rootの公開属性や選択状態を所有しません。previewとcode rootの合成時も、code block / code group / copy / tab contractは本書に従います。

### Hydration

hydration triggerはscheduler / registryが所有します。code surface enhancerはprogressive enhancementとして実行され、旧Custom Elementをregistryへ戻しません。

## 10. Acceptance Criteria

- code surfaceの静的HTML正本構造が存在する。
- code groupはno-JSで全panelを読めるstackとして成立する。
- enhanced tabsはenhancerとCSSの責務として成立する。
- no-JS tab controlsは操作可能UIとして表示されない。
- no-JS copy controlsは操作不能状態を押せるUIとして見せない。
- printでは全panelを読める。
- SSR generator / enhancer / CSSのDOM・属性所有権が分離されている。
- 旧Custom Element APIが復元されていない。
- A-CODE-GROUP-SINGLE-SURFACE-001: group-owned code block rootは独立surfaceを持たず、`section[data-code-group]`がouter surfaceを所有する。
- A-CODE-GROUP-NOJS-STACK-001: no-JSでは全panel stack表示とpanel dividerで読解境界を維持する。
- A-CODE-GROUP-PRINT-001: printでは全panel表示とpanel dividerで読解境界を維持する。
- A-CODE-GROUP-TABS-VARIANT-001: code group tabsは通常`ui-tabs`へ統合せず、code surface内部の局所切替として扱う。
- A-CODE-GROUP-CAPTION-NONREGRESSION-001: filename / caption付きgroup-owned code blockを独立cardとして見せない。
- A-CODE-GROUP-FORCED-COLORS-001: forced-colorsでselected tab、focus-visible、outer borderの識別性を維持する。
- A-CODE-GROUP-HEADER-DIVIDER-001: enhanced header / body dividerはselected tab下線と過剰な二重線に見えない。
- A-CODE-GROUP-HEADER-DIVIDER-FORCED-COLORS-001: header / body dividerはforced-colorsでも視認可能である。
- A-CODE-GROUP-OVERFLOW-OWNERSHIP-001: overflow clippingはouter code group surfaceが所有し、group-owned rootへ残さない。
- A-CODE-GROUP-RESET-SCOPE-001: group-owned resetはsurface視覚、余白、overflow clippingを超えて過剰化しない。
- A-CODE-GROUP-NONREGRESSION-001: DOM、Markdown構文、ARIA enhancer、copy同期、URL、routing、通常`ui-tabs`は変更しない。
