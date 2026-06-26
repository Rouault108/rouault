# Rouault Patterns

この文書はDesign Systemの横断UI patternを定義する正本である。
URL、routing、search、note identity、Permanent URLの意味論は機能Contractを正本とし、本書はUI patternとしての扱いだけを説明する。
Reading chromeの機能契約は`docs/contracts/reading-chrome.md`を正本とし、詳細patternは`docs/design-system/pattern-reading-chrome.md`と`docs/design-system/pattern-reading-block-intrusion.md`に分離する。

## 1. Status

- Type: Normative for Design System patterns
- Source of truth: Design System components、layout patterns、browser/e2e tests
- Applies to: link classification、selected/current/active/focused、overlay、URL-aware UI controls、Permanent URL UI
- Non-goals: router/search/note/permanent URLの機能契約再定義、component固有の全属性定義

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

今回の下線サリエンス採用値は`oklch(from var(--fg-muted) l c h / 0.65)`である。将来値を変更する場合は、CSS、CSS contract test、必要に応じて本節を同時に更新する。`text-underline-offset`などの下線メトリクスはDesign System側で調整可能な実装値であり、Home Contractは具体値を所有しない。CSS内での物理的なrule順序は、読みやすさのための配置方針に留める。契約としてはselector限定、primary系token非使用、`:visited`の所有property制限、surface隔離を重視する。

### Block Link Surface

Block Linkは、遷移先を持つ面全体をnative `<a>`として表すpatternである。`result-card`では`article.result-card > a.result-link`を正規構造とし、カード全面のリンク面を`a.result-link`が所有する。

JSによるcard click delegationは使わない。Ctrl / Meta / Shift click、右クリック、コンテキストメニュー、focusは`<a>`のブラウザ標準動作に委ねる。card外形のhover / focus表示はCSS patternの責務であり、リンクの意味論を上書きしない。

#### result-card hover surface

result-cardのhoverは、カードを物理的に浮上させる状態ではない。
現行result-cardでは、elevation shadowやtransformを使わず、`--bg-hover`を`--bg-surface-2`へ重ねた背景の微差で操作可能性を示す。
hover時に境界線を`--border-muted`へ弱めない。
この方針はresult-cardに限定し、`link-card.css`、`card-link.css`、`syntax.css`、Markdown link-cardへ一般化しない。

#### result-card focus projection

result-cardは、一覧・検索結果で使うblock link surfaceであり、`article.result-card > a.result-link`を正規構造とする。

この契約はresult-cardに限定する。`card-link.css` / `link-card.css` / Markdown link-cardの現行focus contractを変更済みとみなしてはならない。

result-cardのfocus表示では、ポインター click由来の`:focus-within`と、キーボード由来の`:focus-visible`を混同しない。

カード外形へfocus ringを投影する場合は、`.result-link:focus-visible`をsource of truthとする。

`:has()`対応環境では、`.result-card:has(> .result-link:focus-visible)`に外周focus ringを投影する。

`:has()`非対応環境では、`.result-link:focus-visible`のfallback outlineを残し、キーボードfocus visibleを不可視にしない。

### Corpus Index Row

Corpus Index Rowは、`/corpora/`overviewで公開コーパスを静かに列挙するための索引行patternであり、Block Link Surfaceとは別分類である。

行全体はnative `<a>`だが、カード面ではない。titleは主ラベルであり、通常時からごく弱い中立色下線を持つ。通常時のtitle下線は`fg-muted`由来の0.30 alpha相当に抑え、thicknessは`0.04em`、underline offsetは`0.2em`を基準にする。hoverはtitle装飾の軽微な強調に限定する。

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
