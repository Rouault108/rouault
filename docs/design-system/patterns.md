# Rouault Patterns

この文書はDesign Systemの横断UI patternを定義する正本である。
URL、routing、search、note identity、Permanent URLの意味論は機能Contractを正本とし、本書はUI patternとしての扱いだけを説明する。
Reading chromeの機能契約は`docs/contracts/reading-chrome.md`を正本とし、詳細patternは`docs/design-system/pattern-reading-chrome.md`と`docs/design-system/pattern-reading-block-intrusion.md`に分離する。
読書面の段落間余白とblock間余白の分離、および`text-autospace`によるJapanese/ASCII visual spacingは`docs/design-system/pattern-reading-surface.md`を正本とする。

## 1. Status

- Type: Normative for Design System patterns
- Source of truth: Design System components、layout patterns、browser/e2e tests
- Applies to: link classification、selected/current/active/focused、overlay、URL-aware UI controls、Permanent URL UI
- Non-goals: router/search/note/permanent URLの機能契約再定義、component固有の全属性定義

## 1.1 Pattern Index

- Reading surface flow: `docs/design-system/pattern-reading-surface.md`
- Reading chrome: `docs/design-system/pattern-reading-chrome.md`
- Reading block intrusion: `docs/design-system/pattern-reading-block-intrusion.md`

Reading surface flowは本文のCSS余白と、`text-autospace`によるJapanese/ASCII visual spacingの継承制御を所有する。Markdown parser / transformer、About本文データ、router、URL、ARIA、hydration、search、TOCの契約を変更しない。

### Content Tabs / Embedded Code Tabs Boundary

Content Tabsの正本は`docs/contracts/tabs.md`であり、最終HTMLは`section[data-tabs-root]`、操作は`tabs-enhancer`が所有する。`ui-tabs`は内部中間HASTの表現であり、`build/rehype/native-tabs.ts`でnative HTMLへ変換する。用途は本文構造、説明コンテンツ、主セクション切替である。

Embedded Code Tabsの正本は`docs/contracts/code-surfaces.md`であり、実装は`section[data-code-group]`と`code-group-enhancer`である。用途はcode surface内部の局所切替である。

両者はselected、hover、focus-visible、forced-colorsの識別性を維持する。ただし、同一componentでも同一visual variantでもない。詳細なcode group surface仕様は本書では再定義せず、`docs/contracts/code-surfaces.md`と対応ADRを参照する。

## 2. Link Classification

- Text Linkは本文・説明文中の遷移を表す。
- Control Linkはbutton-likeな操作導線として扱う。
- Block Linkはcardやresult item全体の遷移導線として扱う。
- Sidebar専用linkは`docs/contracts/sidebar-state.md`とcomponent文書の境界に従う。
- RouterのURL正規化は`docs/contracts/router.md`を正本とし、本書では再定義しない。

### Metadata Muted Text Link

`.link-text.link-text--muted[href][data-link-surface='metadata']`に一致するlinkは、metadata面の補助導線variantである。CTA、Control Link、Block Link、prose本文リンクではなく、prose本文リンクの代替として使わない。このvariantはトップページ専用ではない。同じclass / surfaceの組み合わせを持つ`src/not-found/not-found-page.ts`内のhome-style markupにも、CSS selector上は同じ変更が適用される。

通常時・visited時は控えめな`fg-muted`相当の文字色を維持する。下線はbase ruleで常時残し、リンク識別を色だけに依存させない。ただし、通常時・visited時の下線色は文字色より弱くする。`:visited`ruleは既読差分として`color`と`text-decoration-color`だけを所有し、下線形状はbase ruleへ委ねる。hover / focus-visibleでは文字色と下線色を`fg-default`相当に一段上げ、focus-visibleのfocus ringは弱めない。

touch環境でもprimary色へ昇格しない。metadata面では、発見可能性は常時下線で担保し、色による一次導線化を避ける。forced-colorsでは弱い下線より視認性を優先し、下線色はsystem colorへ合流させる。

このvariantは`data-link-surface="metadata"`を持つlink全体へ適用されるわけではない。article header source linkなど、独自classと独自CSSで視覚外観を所有するmetadata surface linkとは別分類である。また、`src/components/not-found/not-found-page.ts`の正規404 fallback control linkとは別surfaceであり、今回のvariant変更対象ではない。

今回の下線サリエンス採用値は、Relative Color Syntax対応環境（`@supports (color: oklch(from white l c h / 0.65))`）では`oklch(from var(--fg-muted) l c h / 0.65)`である。非対応環境では既存の`var(--fg-subtle, var(--fg-muted))`をfallbackとして使う。実装は`src/assets/css/link-primitives.css`を参照する。将来値を変更する場合は、CSS、CSS contract test、必要に応じて本節を同時に更新する。`text-underline-offset`などの下線メトリクスはDesign System側で調整可能な実装値であり、Home Contractは具体値を所有しない。CSS内での物理的なrule順序は、読みやすさのための配置方針に留める。契約としてはselector限定、primary系token非使用、`:visited`の所有property制限、surface隔離を重視する。

### Block Link Surface

Block Linkは、遷移先を持つ面全体をnative `<a>`として表すpatternである。`result-card`では`article.result-card > a.result-link`を正規構造とし、カード全面のリンク面を`a.result-link`が所有する。

JSによるcard click delegationは使わない。Ctrl / Meta / Shift click、右クリック、コンテキストメニュー、focusは`<a>`のブラウザ標準動作に委ねる。card外形のhover / focus表示はCSS patternの責務であり、リンクの意味論を上書きしない。

#### result-card hover surface

result-cardのhoverは、カードを物理的に浮上させる状態ではない。
現行result-cardでは、elevation shadowやtransformを使わず、`--bg-hover`を`--bg-surface-2`へ重ねた背景の微差で操作可能性を示す。
hover時に境界線を`--border-muted`へ弱めない。
Markdown link-cardも本文内のstatic reference surfaceとして、hover affordanceにelevation shadowやtransformによる物理的浮上を使わない。ただし、result-cardとMarkdown link-cardは同一componentではなく、それぞれのCSSとMarkdown契約で扱う。
この方針はresult-cardとMarkdown link-cardのhover surfaceに限定し、`card-link.css`、`syntax.css`へ一般化しない。

#### Block link focus-visible projection

result-cardは、一覧・検索結果で使うblock link surfaceであり、`article.result-card > a.result-link`を正規構造とする。
Markdown link-cardは、本文内参照として使うblock link surfaceであり、`.link-card > .link-card__link`のnative anchorを正規の操作面とする。

result-cardとMarkdown link-cardは別componentであり、それぞれ`result-card.css`と`link-card.css`でfocus表示を所有する。
この契約は`card-link.css` / `syntax.css`へ一般化しない。`card-link.css`のfocus contractを変更済みとみなしてはならない。

Block Link Surfaceのfocus表示では、ポインター click由来の`:focus-within`と、キーボード由来の`:focus-visible`を混同しない。

カード外形へfocus ringを投影する場合は、native anchorの`:focus-visible`をsource of truthとする。
result-cardでは`.result-link:focus-visible`、Markdown link-cardでは`.link-card__link:focus-visible`を正本とする。

`:has()`対応環境では、親surfaceへ外周focus ringを投影する。
result-cardでは`.result-card:has(> .result-link:focus-visible)`、Markdown link-cardでは`.link-card:has(> .link-card__link:focus-visible)`が投影先である。

`:has()`非対応環境では、native anchorのfallback outlineを残し、キーボードfocus visibleを不可視にしない。

### Corpus Index Row

Corpus Index Rowは、`/corpora/`overviewで公開コーパスを静かに列挙するための索引行patternであり、Block Link Surfaceとは別分類である。

行全体はnative `<a>`だが、カード面ではない。titleは主ラベルであり、通常時からごく弱い中立色下線を持つ。通常時のtitle下線は、Relative Color Syntax対応環境（`@supports (color: oklch(from white l c h / 0.3))`）では`fg-muted`由来の0.30 alpha相当に抑える。非対応環境では既存の`var(--fg-subtle, var(--fg-muted))`をfallbackとして使う。実装は`src/assets/css/page-corpora.css`を参照する。thicknessは`0.04em`、underline offsetは`0.2em`を基準にする。hoverはtitle装飾の軽微な強調に限定する。

Corpus Index Rowのroot listは先頭borderを持たない。section説明文から最初のrowへ自然に流し、row間の分離は各itemのend borderで担う。

row全体のbackground hover、shadow、transform、elevationは禁止する。`focus-visible`はrow linkに明確に出す。

`padding-inline`は必須仕様ではない。視覚確認でfocus outlineが窮屈、またはタップ領域が不足すると判断した場合だけ、focus/touch安定化のための最小inline paddingを許容する。

## 3. Selected / Current / Active / Focused

- `selected`はwidget内の選択状態を表す。
- `current`は現在位置または現在routeとの対応を表す。
- `active`は押下中または一時的な操作状態を表す。
- `focused`はfocusを受けている状態を表す。
- これらを視覚都合で混同してはならない。

## 4. Overlay Pattern

- Overlayは閉じ方、focus return、background interaction、escape behaviorを先に定義する。
- Dialog、search dialog、popover、sidebar overlayは同じz-index語彙を共有するが、component固有動作はcomponent文書へ置く。
- Accessibility要求事項は`docs/design-system/accessibility.md`を正本とする。

## 5. URL-aware UI

- URL同期はsource of truthを1つにする。
- TabsなどのUI stateをURLに出す場合、共有可能で再構成可能な状態だけに限る。
- Search pageのURL stateは`docs/contracts/search.md`を正本とする。
- Note page navigation URL、permalink、directory-index、breadcrumbは`docs/contracts/note-navigation.md`を正本とする。
- Router document boundaryは`docs/contracts/router-document.md`を正本とする。

## 6. Permanent URL UI

- Permanent URLの意味論、`/archives/{hash}`、hash生成規則、版保証は`docs/contracts/permanent-url.md`を正本とする。
- 本書はPermanent URLをUI上で提示、コピー、最新版案内するpatternだけを扱う。
- Copy UIは成功・失敗状態を支援技術へ通知できるようにする。
- `/archives/{hash}`を通常note page navigation URLとして見せてはならない。

## 7. Acceptance Criteria

- Patternsがcomponent固有契約を過剰に再定義していない。
- Accessibility要求事項を上書きしていない。
- Router / search / note-navigation / permanent-urlの契約を上書きしていない。

## 8. Reading Chrome Reservation

- Reading chromeのTOC triggerは、本文より強い視覚要素にしない。
- 予約状態とinteractive状態は分離し、未確定のTOC ownerを操作可能UIとして見せない。
- Hydration markerはbuild-time / runtimeの接続点を示す属性であり、見た目のvariantとして扱わない。
- Reading chromeの配置・密度・侵入度は専用pattern文書を参照し、本書では機能Contractを再定義しない。

## Content navigation motion

通常移動の目的は、既知のnote・tag・discovery等の本文切替を短いopacity変化で和らげること。`main#main-content`だけをnamed snapshotにし、root/header/sidebar/footer/背景をfadeしない。既定groupの位置・サイズ補間、scale、blurを使わない。旧snapshotは表示せず、新本文はopacity 0.82から1へ変えるため、透明な瞬間と新旧の文字の重なりを作らない。演出中のsnapshotはpointer操作を遮らず、介入時は効果を止める。

初期候補150〜200msから180ms（`--duration-content-transition`）を採用する。これは他サイトの測定値ではない。適用範囲・対象外・commit順序は[Router Contract](../contracts/router.md#content-transition-integration)を正本とし、両端が検証済みの既知shellなら、幅・列構成が変わる組にも同じ表示効果を適用する。shellのレイアウト変更自体は即時commitし、位置や寸法を補間しない。未知・不正profileは既存の通常commitへ縮退する。cross-documentの`navigation:auto`はopt-inしない。API非対応とreduced motionでは通常表示を保つ。

設計背景として、ユーザーはWindows ChromeでHookdeckの履歴移動が正確な位置復元とfadeを両立していると報告している。最終的な目標はその読書体験の連続性である。この観察はユーザーの実測報告であり、本実装によるHookdeckの仕様・時間・方式の測定結果ではない。通常移動の拡張と、次段落の履歴表示は、適用条件と所有者を分けて扱う。

履歴移動は[共通の履歴表示判定](../contracts/reading-position.md#履歴表示の共通判定)として全ページのBack/Forwardを候補にする。復元後のlive mainだけに同じopacityを適用し、snapshotをcaptureしない。DOM差替え後の最初の可視フレームから保存位置が合う経路だけを対象とし、本文を非表示・inertにしたり入力遮蔽を追加したりしない。通常移動のnative演出は引き続き別の所有者で維持する。演出可否はページ名ではなく、復帰先entryの保存時と現在の本文・字体・配置・アンカーの証明で決める。未確定の動的内容は演出なしで正確な復元を優先する。

この共通判定でもTOC幅は`--note-toc-width`の可変幅を維持する。幾何検証は宣言された実track幅へ追従し、狭いdesktopでの240pxをwide viewportへ固定条件として持ち込まない。位置や幅を補間する演出は追加しない。

静的表の履歴復元では、受理済みcommitの位置job直前にrailのフローを準備し、後続activationが同じboxを採用する。準備中のrailだけを非操作状態にし、main/tableは常に通常表示・操作可能に保つ。監査済み静的CSSと単純表の限定契約で、保存元の全文/字体証明、incoming全構造、受理した実DOMと必要geometryを結合できる場合だけ先行復元候補にする。証跡不足や同期予算を満たさない経路ではfadeを有効化しない。通常復元で最終位置が一致しても、最初の可視位置が正しかったとは扱わない。詳細は[静的表の準備と証跡](../contracts/reading-position.md#静的表の準備と証跡)を参照。
