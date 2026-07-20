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
- 既存のcode line height / static HTML authority契約を満たすため、静的出力HTMLでは`pre[data-code-block] > code[data-lang]`直下にShiki由来のnewline-only整形用text nodeを残しません。
- ソース上の空行は削除せず、空の`.line`要素として保持します。
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
- filename / intentを持たずcaption mainが生成されない単独code blockでcopy controlが生成される場合、copy controlのみをoverlay captionとして表示します。
- overlay copy controlのblock方向位置は`--ui-code-copy-overlay-block-start`で制御します。
- Rouault既定token下では、overlay copy controlの中心を1行目code line box中心へ合わせます。glyphの濃色ピクセル中心へのpixel-perfect合わせは保証しません。
- overlay copy controlは、keyboard focus outlineが欠けないblock-startクリアランスを保持します。
- overlay copy button shellがfinal DOMに存在するstandalone code blockでは、横スクロール終端で末尾文字列がcopy button下に潜らないようにinline-end終端clearanceを予約します。
- inline-end終端clearanceの適用条件は`:has(> .code-surface-caption > .code-surface-copy-button-shell)`で固定します。
- copy buttonがないoverlay root、`data-code-group-owned='true'` root、filename / intent付きcaption layoutにはinline-end終端clearanceを適用しません。

### Shiki Theme Policy

Rouaultのcode surfaceは、本文中のコードブロックが本文より過度に前景化しないように、Shiki theme policyをRouault側で所有します。

- paletteとordered TextMate scope ruleの正本は`build/rehype/shiki-theme-definition.ts`です。
- compiled themeの正本は`build/rehype/shiki-themes.ts`です。
- theme名は`rouault-light` / `rouault-dark`です。外部bundled themeをforeground ownerとして使用しません。
- 従来のGitHub bundled theme＋partial replacement経路は終了し、foregroundの正本をRouault custom dual themeのclosed paletteへ一本化します。
- `codeToHast`は`themes`でlight / darkのdual theme出力を維持します。theme単数指定へ退行してはなりません。
- `defaultColor`は指定しません。Shikiのdual theme出力形式と`--shiki-dark` / `--shiki-dark-bg`を維持します。
- themeの`fg`は`base`、`bg`はShiki安全fallbackとしてlight `#f2f2f2`、dark `#020202`を使用します。
- fallback backgroundは最終表示backgroundのownerではありません。final computed `pre.shiki` backgroundはcode surface CSSによりtransparentを維持します。
- themeからfont style、font weight、text decorationを付与しません。
- `pre.shiki span`などへcanonical foregroundをCSSで再マッピングしません。

canonical foreground paletteは次に固定します。値はlowercase six-digit hexとし、同一theme内でbaseを含めて一意でなければなりません。

| Slot      | Light     | Dark      | Owner role                                                       |
| --------- | --------- | --------- | ---------------------------------------------------------------- |
| `base`    | `#2a2e33` | `#d9dfe5` | plain text、variable、parameter、punctuation、operator、fallback |
| `subdued` | `#5f6469` | `#9a9fa5` | comment、documentation                                           |
| `red`     | `#764b47` | `#c1908c` | control keyword、declaration、modifier、invalid                  |
| `amber`   | `#6c5330` | `#b59a75` | numeric／language constant                                       |
| `green`   | `#3f6246` | `#84a98b` | string、regexp                                                   |
| `blue`    | `#3e5b79` | `#82a2c3` | function、property、tag、attribute                               |
| `purple`  | `#604f73` | `#a795bd` | type、class、interface、namespace                                |

ordered TextMate ruleは次に固定します。Shiki / TextMate標準のscope selector解決を使用し、Rouault独自classifier、semantic parser、precedence resolverを追加しません。未一致scopeは`base`へfallbackします。`meta.function-call`は過剰着色を避けるため使用しません。

| Order | Rule ID           | Slot      | Scope                                                                                                                                                                         |
| ----: | ----------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    10 | `comment-subdued` | `subdued` | `comment`, `punctuation.definition.comment`, `meta.documentation`                                                                                                             |
|    20 | `string-green`    | `green`   | `string`, `string.regexp`                                                                                                                                                     |
|    30 | `constant-amber`  | `amber`   | `constant.numeric`, `constant.language`, `constant.character`, `constant.other`, `variable.language`, `support.constant`                                                      |
|    40 | `keyword-red`     | `red`     | `keyword.control`, `keyword.declaration`, `keyword.other`, `storage.type`, `storage.modifier`, `invalid`                                                                      |
|    50 | `callable-blue`   | `blue`    | `entity.name.function`, `support.function`, `variable.function`                                                                                                               |
|    60 | `property-blue`   | `blue`    | `entity.other.attribute-name`, `support.type.property-name`, `meta.object-literal.key`, `entity.name.tag`                                                                     |
|    70 | `type-purple`     | `purple`  | `keyword.type`, `storage.type.built-in.primitive`, `entity.name.type`, `entity.name.class`, `entity.name.interface`, `entity.name.namespace`, `support.type`, `support.class` |
|    80 | `operator-base`   | `base`    | `keyword.operator`                                                                                                                                                            |

Browser contrast Gateはcomputed foregroundをbaseまたはslotへ一意に逆引きし、light / dark × TypeScript / C / JSON / shell / C# × normal / highlight / diff-add / diff-remove × 使用slot × effective backgroundを測定します。全measurementは`4.5:1`以上、使用slotごとの最小値は`5.0:1`以上を要求します。palette外foreground、base coverage欠落、required slot欠落、state background collapseはfailureです。

repository usage smokeは`content/**/*.md`と`examples/snippets/**/*.md`のcode fenceをproductionと同じMarkdown AST parserでinventoryし、`build/rehype/shiki-language.ts`の単一ownerでexact ID、alias、明示的`text`、language省略、unknown fallbackを区別します。unknown explicit languageのsilent text fallback、grammar load error、closed palette外foregroundを許可しません。Evidenceへsource本文、path、excerptを出力しません。

### Code Line State

code line stateの正本は、全`.line` rootへbuild-timeに付与する`data-code-line-state="normal|highlight|add|remove"`です。Shikiの`highlighted`、`diff add`、`diff remove`などのclassは正規化処理への入力Evidenceであり、下流のCSS、E2E、文書契約ではありません。非normal stateを1行以上含む`pre[data-code-block]`だけが`data-code-has-line-state="true"`でmarker railへopt-inし、stateのないblockは従来の密度を維持します。

同一行にある`highlight-lines`とhighlight notationは同じ`highlight`へ正規化します。`highlight + add`、`highlight + remove`、`add + remove`は異種state conflictとしてbuild errorにし、silent precedence、state破棄、複合stateを認めません。diagnostic identifierはdocument source orderの1-based ordinalによる`code-block:<ordinal>`であり、正常DOMへ出力しません。

state-containing blockではnormalを含む全行が同じmarker railを予約します。line numberなしは「state rail、gap、code」、line numberありは「line-number rail、gap、state rail、gap、code」の順に合成します。line numberありのmarkerはscroll開始時にはline-number railとgapの後ろにある自然位置を取り、line-number railがscrollport外へ流れた後にscrollportのinline-startへstickyし、それ以降はscroll終端まで同じviewport位置を維持します。

sticky marker backingはrailだけを覆う不透明なeffective-background backingであり、layout上のcode text rangeが背後を通過してもcode textを視認させません。Visual Acceptanceはmarkerとcode textのDOM rectangle交差ゼロではなく、backing領域でcode textが透過せず、marker、line number、copy controlが視覚的に競合しないことを要求します。backingはmarker rail外へ広げず、state背景との視覚的連続性を維持します。

visual cueはhighlightがdot、addがplus、removeがminusです。いずれもCSS pseudo-elementだけで描画し、markerのDOM text nodeやliteral記号を追加しません。`user-select: none`と`pointer-events: none`を維持し、copy sourceとmanual selectionへmarker文字を混入させません。marker foregroundは全state共通のneutral colorで、normal modeのownerは`var(--fg-default)`です。computed pseudo-element foregroundとeffective line backgroundのnon-text contrastはlight / darkそれぞれで`3.0:1`以上を要求します。

forced-colorsでは`CanvasText` / `Canvas`を使ってdot／plus／minusを維持します。printではstate backgroundを除去してもmonochrome markerを残します。

#### Programmatic Semantics

normalized stateからsemantic DOMを生成する単一ownerは`build/rehype/code-line-state.ts`のline state normalizationです。semantic applicationはstate判定を再実装せず、同じnormalized stateを次の固定contractへ投影します。

| State       | Line root      | Accessible name       | Native wrapper |
| ----------- | -------------- | --------------------- | -------------- |
| `highlight` | `role="group"` | `aria-label="強調行"` | `mark`         |
| `add`       | `role="group"` | `aria-label="追加行"` | `ins`          |
| `remove`    | `role="group"` | `aria-label="削除行"` | `del`          |
| `normal`    | 追加なし       | 追加なし              | 追加なし       |

state付きlineでは、line root直下の単一native wrapperが既存token childrenを元の順序のまま所有します。source text、token element、class、styleは変更しません。normal lineのdescendant DOMは変更しません。normalizationを再実行してもwrapperを二重化せず、異なるstate wrapperを積層しません。`aria-live`、hidden state text、line numberを含むlabel、marker DOM text、正常DOMのdiagnostic identifierは追加しません。semanticsはbuild-timeに生成するため、SSR／no-JS時点で成立します。

UA resetは`pre[data-code-block]`内の対応する`data-code-line-state`直下wrapperだけを対象にします。`mark`のbackgroundはtransparent、`ins` / `del`のtext decorationはnoneとし、color、font、line-heightはline／tokenから継承します。global `mark` / `ins` / `del`、article本文、code surface外へ影響させません。state backgroundとmarker backingのownerはline root、marker shapeのownerはline rootのpseudo-elementのままです。wrapperをlayout、rail、forced-colors、printの新しい装飾ownerにしません。

copy exactnessとmanual selection非回帰は別contractです。copyの単一sourceはdisplay subtreeから独立した`template[data-code-copy-source]`であり、standalone、active code group panel、no-JS group source、code previewのcopy button結果は元sourceと完全一致しなければなりません。display DOMの`textContent`をcopy sourceへ戻しません。

manual selectionはstate label、ARIA補助文字、marker文字を含めません。P-V12-3ではproduction編集前にChromium／Firefox／WebKitの各projectで一時baselineを生成し、同一Phaseの実装後にfixture keyごとのSHA-256、UTF-16 length、line count、`containsStateLabel: false`を比較します。baselineは同一Phase内の一時Evidenceで、repositoryへcommitせず、P-V12-3のChatGPT精査完了まで保持した後に削除できます。Closure Gateや後日の独立監査のEvidenceには使いません。

manual AT smokeの代表stackはNarrator＋EdgeとVoiceOver＋Safariです。state labelがcode内容より先に取得可能で、code内容が欠落・置換・著しく二重読みされず、navigationが不能または著しく反復的でないことを確認します。語調、句読点、native element announcement、OS／browserによる自然な読み上げ差は許容します。重大な二重読み、本文欠落、順序逆転はBlockerであり、automated snapshotでmanual Evidenceを置換しません。P-V12-3後もv12は完了候補であり、`G-V12-CLOSURE`前は完了扱いしません。

### Code Line Height

読書中のcode blockは本文より強く前景化しない行間を使います。

- code bodyのfont sizeは13px（`var(--text-sm, 0.8125rem)`）です。
- font weightは400（`var(--font-normal, 400)`）です。
- line-heightは1.5です。
- `--line-height-code`は`var(--line-height-normal)`を参照します。
- `code-surfaces.css`のcode body ruleは`line-height: var(--line-height-code, 1.5)`を維持します。
- code blockのフォントファミリー、背景、枠線、角丸はこの契約では変更しません。

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
- `--ui-code-copy-overlay-center-offset: 0.390625rem`はspacing tokenではなく、Rouault既定token下の2rem copy button、13px code font-size、1.5 line-heightから導出したcode overlay専用の派生定数です。
- code bodyのblock-start paddingを変更する場合は、overlay copy controlのline box中心合わせを維持するため、`--ui-code-copy-overlay-code-padding-block-start`も同時に更新します。
- code body paddingを変更する場合は、overlay copy controlのblock-start位置tokenだけでなく、inline-end終端clearanceの基準値である`--ui-code-copy-overlay-code-padding-inline-end-base`も確認します。
- `--ui-code-copy-overlay-block-start`はfocus outlineのblock-start clearanceを守る`max()`式を維持します。このため、line box中心一致の保証はRouault既定token下に限定します。
- `--ui-code-copy-overlay-*`は、surface側`[data-code-block-root]`ruleに定義します。layout側ruleには定義しません。
- overlay copy inline-end終端clearanceのための`--ui-code-copy-control-inline-size`、`--ui-code-copy-overlay-code-padding-inline-end-base`、`--ui-code-copy-overlay-inline-end-clearance`、`--ui-code-copy-overlay-code-padding-inline-end`は、surface側`[data-code-block-root]`ruleに定義します。layout側ruleには定義しません。
- overlay clearance用の`padding-inline-end: var(--ui-code-copy-overlay-code-padding-inline-end)`宣言は`@media not print`配下に限定します。print表示には適用しません。
- copy controlのinline-end位置は本文gutterではなく`--ui-code-copy-control-inline-rail`で制御します。
- `--ui-code-copy-control-inline-rail`はcopy controlの配置railであり、code本文側のinline-end clearance全体ではありません。本文側clearanceはbase padding、配置rail、copy control寸法を合成したoverlay clearance tokenで制御します。
- `--ui-code-copy-control-inline-rail`は単独code blockのsurface側`[data-code-block-root]`ruleと、code groupの`section[data-code-group]`base ruleに定義します。
- layout側`[data-code-block-root]`ruleには`--ui-code-copy-control-inline-rail`を定義しません。
- 通常captionは`padding-inline-start`で本文gutter、`padding-inline-end`でcopy control railを参照し、本文余白と補助control位置の責務を分離します。
- overlay captionの`padding: 0` resetは維持してよいものとします。
- `--ui-code-surface-padding`および`--ui-code-block-padding`のようなshorthand相当tokenを、overlay copy位置またはinline-end終端clearanceの`calc()`へ直接入れてはなりません。
- root-levelの`.code-group-header-tools`は`padding-inline` shorthandではなく、`padding-inline-start` / `padding-inline-end`で定義します。
- forced-colors / print media内の`.code-group-header-tools`ruleは、このcopy control rail変更の対象ではありません。
- `--ui-code-copy-control-inline-rail`は既存の`--ui-code-copy-overlay-*`token群とは別のinline-end control railです。

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
