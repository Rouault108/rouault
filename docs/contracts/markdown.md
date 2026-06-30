# Markdown Contract

## 1. Status

- Type: Normative
- Source of truth: Markdown transform pipeline、remark/rehype adapters、SSR tests
- Applies to: Markdown入力、parser、output DOM、safety boundary、hydration directive
- Non-goals: component別DOM詳細表、執筆例の網羅、Permanent URL hash詳細

## 2. Ownership

### This Layer Owns

- Author input / parser / output DOM / safety boundaryの責務境界。
- raw HTML、dangerous URL、dangerous props、arbitrary style injectionの禁止。
- note本文の最終DOMがstatic-firstであること。
- no-JS baselineを破壊しないこと。
- Hydration directiveがbuild-time注釈を正本とすること。

### This Layer Must Not Own

- Component別DOM詳細表。`docs/references/markdown-output.md`を参照する。
- 執筆者向け説明。`docs/guides/markdown-authoring.md`と`docs/guides/note-authoring.md`を参照する。
- Markdown入力記法の網羅表。`docs/references/markdown-authoring-syntax.md`を参照する。
- Permanent URL hash生成規則。`docs/contracts/permanent-url.md`を参照する。

## 3. Public Contract

### Inputs

- Markdown本文。
- Frontmatter。
- 許可された独自ディレクティブと属性。

### Outputs

- Static-firstなnote本文DOM。
- 許可済みcomponent / HTML structure。
- Build-time hydration annotation。

### Events

- N/A

- Markdown rendererはraw HTMLを本文DOMへそのまま通してはならない。
- `javascript:`などのdangerous URL schemeを許可してはならない。
- `on*`、`srcdoc`、許可外`style`などのdangerous propsを許可してはならない。
- Component化はsemantic HTMLとno-JS baselineを壊してはならない。
- Hydration directiveはruntime rescueではなくbuild-time contractとする。

### Article Header Source Link Contract

Frontmatterの`source`は、note pageのarticle header metadata surface linkとして出力される。

`article-header__source-link`の`data-link-kind`は、出典UIであってもlink classifierの結果に従う。

- external originのsourceは`data-link-kind="external-web"`とし、`data-external="true"`を出力する。
- same-originかつinternal document routeのsourceは`data-link-kind="internal-document"`とする。
- same-originかつinternal document routeではないsourceは`data-link-kind="internal-resource"`とする。
- unsafe sourceはlink化しない。
- `data-link-surface="metadata"`は常に維持する。
- `target="_blank"`と`rel="noopener noreferrer"`は全分類で維持する。
- `internal-document`に分類されても、article header source linkは出典参照であり、app-router interceptionではなくpassthrough navigationとして扱う。

`data-external="true"`と`aria-label="出典（外部サイト、新しいタブで開く）"`は`external-web`のときだけ使う。  
`internal-document` / `internal-resource`の場合は`data-external`を出さず、`aria-label="出典（新しいタブで開く）"`を使う。

classification contextを持たないraw render / story / unit test用のfallbackは、`renderArticleHeaderHtml()`のraw fallback modeに限定する。NoteLayout経由のfinal note page HTMLでは、source linkを分類済みmodeで描画し、raw fallbackを使ってはならない。

### Static Card Surface Contract

Markdown出力層のcard surfaceは、旧`ui-card` custom elementの復活ではなくnamed static surfaceとして扱う。`ui-card`はstatic-first deletion targetであり、本文DOMをWeb Component lifecycleやruntime click delegationへ再依存させないため、最終HTMLに復活させてはならない。

- generic `.card` surfaceは現行contractとして作らない。
- 旧`ui-card`の`variant` systemと`clickable` attribute contractは復活させない。
- 現行のnamed card surfacesは`result-card`、`link-card`、`syntax-card`である。
- `result-card`は検索・一覧UIのsurfaceであり、全面リンク面はnative `<a>`に委ねる。Markdown出力層は詳細layoutを所有しない。
- `link-card`はMarkdown directive / auto link-card由来のstatic surfaceであり、build transformとCSSで成立させる。
- `syntax-card`はMarkdown directive由来のコード説明surfaceであり、本文headingではなくカード内部labelを持つ。

`link-card`のdescriptionはbuild transformで必要に応じて切り詰め、切り詰め有無を`data-text-truncated`で示す。旧runtime line overflow detectionに基づく`data-line-overflowed`は復活させない。表示上の行数制御はCSSの責務であり、Markdown final DOMにruntime overflow stateを残さない。

Markdown link-cardは本文内のstatic reference surfaceである。hover affordanceは`--bg-hover`を`--bg-surface-2`へ重ねた背景差分に限定し、elevation shadowやtransformによる物理的浮上を使わない。invalid link-cardは引き続きhover対象外である。

Markdown link-cardのfocus表示は、native anchorである`.link-card__link:focus-visible`を正本とする。CSSは`:has()`対応環境で`.link-card:has(> .link-card__link:focus-visible)`へfocus ringを投影してよい。`:has()`非対応環境では`.link-card__link:focus-visible`のfallback outlineでキーボードfocus visibleを担保する。ポインターclick由来の`:focus-within`をMarkdown link-cardの外周focus ring正本にしてはならない。このfocus-visible projection契約は`link-card.css`に限定し、`card-link.css`や`syntax.css`へ一般化しない。

`syntax-card__name`と`syntax-section__heading`はheadingではなくlabelとして出力する。`heading-level`は入力互換属性として受理されるが、static-first outputでは`h2`〜`h6`のDOM heading生成に使わない。final DOMに`heading-level` / `data-heading-level`を残してはならない。`syntax-card` subtreeは本文heading id、heading permalink、TOCの対象外である。

`syntax-card`の通常表示におけるCSS visual contractでは、root外枠をカード単位の境界として扱う。`header`、`signature`、`kind`などの内部罫線は補助区切りであり、root外枠より控えめな視覚強度に留める。この視覚階層はfield rowのinteractive affordanceやrow hoverを意味しない。空コンテンツ時は、既存のsignature下罫線除去とcontent非表示の縮退契約を維持する。forced-colors契約は別途CSS上の既存指定を維持する。

`syntax-field`は、構文カード内の静的説明行であり、row action、row selection、row navigationを意味しない。`syntax-field:hover`によるrow-level背景変更は標準契約に含めない。field内部にlink / buttonなどの実操作要素が存在する場合は、その要素自体のinteractive契約に従う。`syntax-card`全体のhover / focus-withinによるcopy action表示は、field row hoverとは別契約として維持する。

### Static Callout Surface Contract

`::callout`はstatic-firstな短い読書注記surfaceとして出力する。操作surface、runtime-dependent component、dangerous props、raw HTMLの抜け道として扱ってはならない。

`::callout`の入力記法、kind値、final DOM、aria契約はMarkdown transform pipelineが所有する。詳細DOM mappingは`docs/references/markdown-output.md`、kind別の意味と視覚強度は`docs/design-system/components/callout.md`、author向け使い分けは`docs/guides/markdown-authoring.md`を参照する。

### Static Table Surface Contract

Markdown出力層の`table`は、scrollable static table surfaceとして扱う。`data-table-root`は横スクロール可能な表領域とfocusable regionを示すための属性であり、row action、row selection、row navigation、interactive data gridを意味しない。

- Markdown tableの行全体をクリック可能面として扱ってはならない。
- Markdown tableの`tr:hover`によるrow-level背景変更は標準契約に含めない。
- 表rootの`tabindex="0"`は横スクロール領域へのキーボード到達性のためであり、行単位の操作性を意味しない。
- セル内のlink / buttonなどのnative interactive elementは、それぞれの要素契約に従って操作可能面として振る舞う。
- クリック可能な一覧や行操作UIは、Markdown tableへ後付けせず、専用のlist / card / interactive surfaceとして設計する。

横溢れ表のedge affordanceはruntime enhancementに限定する。`data-overflow` / `data-fade-left` / `data-fade-right`は、`data-table-root`上へ付与される一時的な表示状態であり、Markdown authoring APIではない。これらの属性は列が続く方向を静かに示すためだけに使い、DOM追加、row hover、row click、row selection、row navigation、interactive grid化、sort / filter、sticky header、top scroll rail、列固定、列並べ替えを意味しない。横溢れが解消された場合、runtimeはこれらの状態属性を削除する。

top auxiliary scroll railは、横溢れするMarkdown table rootに対するruntime enhancementであり、Markdown authoring APIではない。PCマウス操作時に表の途中から横位置を変えやすくする補助UIであり、SSR table構造やMarkdown入力記法を変更しないnon-breaking additive changeとして扱う。

- top railはfocus可能な補助scroll regionであり、`role="region"`とaccessible nameを持つ。
- top railは`aria-hidden="true"`を持たない。
- captionあり表ではcaption text由来のaccessible nameを持つ。
- captionなし表では、直後の表の横スクロール補助であることを示すfallback accessible nameを持つ。
- top railはsemantic table subtreeへ挿入せず、`data-table-root`の外側にruntimeで追加する。
- top railは表示される環境ではTab順序に入り、静かな`:focus-visible`表現を持つ。
- coarse pointer環境では、top railは視覚・Tab順序上のノイズにならない。
- キーボード操作の正本は`data-table-root`に残るが、top railでも横scroll操作が可能であり、table rootの横scroll位置と同期する。
- top railはcaptionとtableの視覚的関係を過剰に分断してはならない。
- top railはrow hover、row selection、row navigation、sort / filter、interactive grid化、sticky header、Library wide table viewを意味しない。
- Phase3Bのtop railは、Phase1の`data-overflow` / `data-fade-left` / `data-fade-right` state属性とは別のruntime enhancementである。

R3 Decision RecordとBreaking Change Gateは`docs/adr/table-top-scroll-rail-accessible-region.md`に保存する。

### Details Prose Disclosure Contract

`::details`は本文内のprose disclosureであり、row navigation、settings row、panel surfaceではない。

- final DOMはnative `details` / `summary`を維持し、JSなしでも開閉できなければならない。
- rootは`details.details-block[data-details="true"]`として出力する。
- 旧`ui-details` custom element、旧Lit API、JS animation、bordered variantは復活させない。
- chevronは`summary`直下でsummary textの左に置く。
- 展開本文はsummary text開始位置に視覚的に従属する。
- `data-details-source`とsource-onlyの`summary`属性はfinal DOMに残さない。
- `variant`、`region`、`aria-label`など旧Lit版APIをMarkdown入力属性として復活させない。

### Table Authoring Extension Contract

Markdown table authoring extensionは、static table surfaceの契約を弱めない。raw HTML禁止、interactive data gridではない意味論、row hover affordance不在は維持する。

`::table{column-widths="..."}`はGFM表へ列幅ヒントを付与するauthoring wrapperである。`::table`はGFM表1個だけを包む。表以外、複数表、表と段落の混在はbuild errorとする。

`::table ... ::`のwrapper boundaryはRouault-owned syntax boundaryであり、偶発的なpost-GFM mdast shapeに従属しない。現行Phase 1はtableに限定したTier 1 post-GFM recovery islandであり、true pre-GFM source parser ownershipではない。`remark-gfm`がclosing `::`をtable row / table cell側へ吸収した場合でも、remarkRouaultDirectivesはrecovered closing markerだけをtable payloadから除去する。authorsは`::table` wrapper markerの周囲にblank linesをworkaroundとして追加する必要はない。

runtime、final HTML、rehype normalizationはlost parser boundaryをrepairしない。非table directiveのparser ownership migrationはこのtable boundary recoveryのscope外である。

`column-widths`は固定トークン列であり、任意CSS値ではない。許可トークンは`auto` / `fit` / `narrow` / `medium` / `wide` / `numeric`とする。

- `column-widths`は空白区切り、順序保持、重複許可とする。
- comma区切り、未知トークン、空値はbuild errorとする。
- `column-widths`の指定数はtable列数と一致しなければならない。
- `column-widths`指定tableでは`colspan` / `rowspan`を許可しない。
- `numeric`は幅ヒントだけであり、右揃えを暗黙指定しない。
- 右揃えは既存GFM記法`---:`に委ねる。

`{{break}}`は表セルテキストエスケープである。exact `{{break}}`のみを特殊扱いし、`{{...}}`全体はRouault構文として予約しない。`{{foo}}` / `{{ break }}` / `{{BREAK}}` / `{{br}}`は通常テキストとして扱い、build errorにしない。

- `{{break}}`はplain GFM表セルでも`::table`内table cellでも有効とする。
- 表セル外のexact `{{break}}`はbuild errorとする。
- 表セル内link / linkReference配下の`{{break}}`はbuild errorとする。
- 表セル内emphasis / strong配下の`{{break}}`は許可する。
- code span / code block内の`{{break}}`は変換対象外とする。
- 同一text node内のUnicode whitespace隣接と`{{break}}{{break}}`連続はbuild errorとする。
- text nodeの先頭・末尾であること自体はbuild error条件にしない。
- text node境界をまたぐwhitespace隣接や`{{break}}{{break}}`連続のsemantic adjacency判定は初期実装では行わない。
- `{{break}}`は表セル実質先頭・実質末尾には置けない。
- `{{break}}`の前後にはmeaningful inline contentが必要である。

cell-levelのmeaningful inline content有無検査は、cell実質先頭・実質末尾禁止のための最小検査であり、inline node境界をまたぐsemantic adjacency判定とは別扱いにする。meaningful inline contentとして数えるnodeは、非空白text、emphasis / strong配下の非空白text、inlineCode、link / linkReference表示テキストに限定する。未列挙inline nodeは、内部に列挙済みnodeとして評価可能な内容を持つ場合だけmeaningfulとする。image / image alt textは初期実装ではmeaningful contentとして数えない。

raw `<br>`、Markdown hard break、`:br[]`は表セル改行契約として採用しない。mdast `break` nodeまたは実装上対応するhard break nodeが表セル配下に存在する場合、remark側でbuild errorとする。mdastで検出できない経路ではfinal contractのmarkerなし`<br>`拒否で防御する。

### Translation Output Contract

`translation` familyは、`original` / `translated`のplain-text 2片だけをMarkdown出力契約として扱う。inline markup、脚注、リンク、ruby、辞書UI、rich bilingual contentはこのfamilyへ保持しない。

- `::translation`は`div.translation-static[data-translation-kind="static"]`へ出力し、hydration directiveを持たない。
- `::translation-overlay`はLight DOMの`ui-translation` hostへ出力し、`data-hydration-capability="interactive"` / `data-hydration-trigger="visible"`を持つ。
- `ui-translation` hostは`lang`、`target-lang`、`original`、`translated`、`surface`を保持する。
- SSR / pre-hydrationの`ui-translation` host直下には`details[data-translation-fallback]`を置き、`summary[data-translation-fallback-trigger]`に原文、`[data-translation-fallback-content]`に訳文を置く。
- fallback childには対応する`lang`を付与する。
- fallbackはhydrated UI用の`data-part` selectorを使わず、generic `data-surface`も持たない。
- JS無効またはJS遅延時でも、読者はnative `summary`から訳文へ到達できなければならない。
- hostの`open`属性はcomponent API / Storybook / direct HTML compatibilityの範囲に限る。Markdown `translation-overlay`の入力属性として復活させてはならない。

### Preview Sandbox Output Contract

`::preview-sandbox`は`code-preview`直下のspecialized childであり、Markdown出力層は`ui-preview-sandbox` hostとbuild-time hydration directiveを所有する。`build/rehype/preview-sandbox.ts`はsnippet/template変換責務であり、manual-only capability validationの正本ではない。

- 通常previewはreading-firstのため`activation-policy`未指定時にvisibleとして扱う。
- `activation-policy`未指定のdefault visibleでは、SSR/build outputに`activation-policy="visible"`を追加しない。
- authorが`activation-policy="visible"`を明示した場合は属性を維持する。
- client runtimeではLitの`reflect: true`により`activation-policy="visible"`がDOMへ現れる場合がある。このruntime reflectionはSSR/build output契約とは分ける。
- `activation-policy="eager"`はclient hydration sessionのinitial phaseでpreviewを構築する契約であり、SSR時点でiframe `srcdoc`を生成しない。
- hydration directive mappingは、default/explicit visibleが`sandboxed`/`visible`、`eager`が`sandboxed`/`initial`、`manual`が`sandboxed`/`interaction`である。
- `allow-js`単独ではmanualを強制しない。`allow-js`と`activation-policy`未指定、`visible`、`eager`、`manual`の併用は許可する。
- `allow-js`はmanual-only capabilityではないが、manual時の文言を「プレビューを実行」系にする根拠になる。
- `allow-js`はmanual-only capabilityの判定を弱めない。`allow-js`とmanual-only capabilityが併存する場合はmanual-only capabilityの規則を優先する。
- `allow-forms`、`allow-downloads`、`allow-pointer-lock`、`allow-popups`はmanual-only capabilityである。
- manual-only capabilityがあり`activation-policy`未指定なら、build outputに`activation-policy="manual"`を明示し`sandboxed`/`interaction`を出力する。
- manual-only capabilityと`activation-policy="visible"`または`activation-policy="eager"`の併用はbuild errorとする。
- build outputでは`activation-policy="manual"`と`data-hydration-trigger="visible"`または`initial`の組み合わせを出力しない。
- raw HAST/HTML経由の`activation-policy`はexact lowercaseの`visible` / `eager` / `manual`のみ許可する。前後空白、大文字小文字違い、空文字列、列挙外値、文字列以外の値はbuild errorとする。
- raw HAST/HTML経由のboolean属性`allow-js`、`allow-forms`、`allow-downloads`、`allow-pointer-lock`、`allow-popups`は、`true`、空文字列、canonical kebab-case属性名と同一文字列、`"true"`だけをpresenceとして受け付ける。`false` / `null` / `undefined`は無効として削除し、`"false"`、`"0"`、`"off"`、`"no"`、`"1"`、`"on"`、number、object、array、function、symbol、bigintなどはbuild errorとする。
- raw HAST/HTML経由でkebab-caseとcamelCaseの同義属性が併存する場合、同じ意味ならkebab-caseへ正規化し、意味が異なる場合はbuild errorとする。
- `data-hydration-capability` / `data-hydration-trigger`はbuild-ownedであり、入力に旧値やcamelCaseがあっても新契約のkebab-case属性へ上書きする。
- manual UIは準備中表示ではなく操作可能なnative buttonである。focusだけでpreviewを起動してはならない。
- 非manual statusでは「読み込んでいます」という状態表示を支援技術上も消してはならない。
- 旧クリック待ち挙動を維持する場合は`activation-policy="manual"`を明示する。

## 4. State Model

### Durable State

- Author source。
- Normalized Markdown / HAST。
- Final HTML。

### Ephemeral State

- Parser intermediate state。

### Derived State

- Heading id。
- Directive output。
- Hydration annotation。

### Forbidden Coupling

- Markdown出力をcomponent runtimeの都合で再解釈してはならない。
- Safety contractをGuideやReferenceだけに置いてはならない。

## 5. Failure Semantics

- 危険入力はbuild-time rejectionを優先する。
- 未知directiveや許可外属性は黙って通さず、明示的に拒否または安全に落とす。
- Runtime helperはbuild-time safety boundaryを上書きしてはならない。

## 6. Integration Boundaries

### Build-time

- 実装上のsource of truthは`velite.config.ts`におけるプラグイン順序である。
- Markdown transform pipelineは次の順序で成立する。
  1. `remarkMath`
  2. `remarkGfm`
  3. `remarkExpandExampleIncludes`
  4. `remarkDisallowRawHtml`
  5. `remarkRouaultDirectives`
  6. `remarkLinkCards`
  7. `remark-rehype`
  8. `rehypeKatex`
  9. `rehypeRouaultComponents`
  10. `rehypeHeadingIds`
  11. `rehypePreviewSandbox`
  12. `rehypeShikiCodeBlocks`
  13. `rehypeStaticCodeGroups`
  14. `rehypeResolveNoteSourceLinks`
  15. `rehypeAnnotateLinkKinds`
  16. `rehypeInlineCodeTranslateNo`
  17. `rehypeOrderedListContracts`
  18. `rehypeDisallowDangerousProps`
- Parser / transformer / adapterがMarkdownを最終DOMへ正規化する。
- authoring grammarに関わる意味論変更は、remark層の正本と実装順序の双方を整合させる。
- 出力DOMに関わる意味論変更は、rehype層の正本と実装順序の双方を整合させる。
- Markdown本文内の相対`.md`ノートリンクは`rehypeResolveNoteSourceLinks`でnote page navigation URLへ解決してから、本文リンクの種別注釈をrehype層で確定する。詳細な出力属性契約は`docs/references/markdown-output.md`を参照する。
- `zoomable=true`の本文画像は`figure[data-image] > [data-image-preview-frame] > img + button[data-image-zoom-trigger]`のdirect child構造を持つ。`img`はbuttonで包まず、triggerはSSR時点で`hidden`とし、enhancer初期化成功後だけ操作可能化する。
- `zoomable=false`の本文画像は`figure[data-image] > img`を維持し、preview frame、zoom trigger、`image-lightbox-enhancer` hydration key、dialogを生成しない。
- 安全規約は後段検査へ押し込むだけでなく、可能なものは前段で早期拒否してよい。
- 実装順序の変更は意味論変更を伴いうるため、単なるリファクタリングとして扱ってはならない。

### SSR

- Final DOMはJSなしで読める。

### Client Runtime

- Runtimeはenhancementのみを行い、本文意味論を再構築しない。

### Hydration

- Content hydrationはscheduler / registryが所有する。

### Tests

- Safety、output fixture、hydration budgetの更新先は`docs/contracts/testing-taxonomy.md`に従う。

## 7. Acceptance Criteria

- Markdown safety boundaryがContractとして存在する。
- raw HTML、dangerous URL、dangerous props、arbitrary style injectionが禁止されている。
- no-JS baselineとstatic-first DOMが維持されている。
- 詳細DOM mappingはReferenceに分離されている。

---

## Footnote static-first contract

Markdownからnote HTMLへの脚注出力はstatic-first DOMを正本にします。

- `ui-footnote`はnote最終HTMLに残しません。
- 通常リンク注釈と脚注構造リンクを分離します。
- `data-footnote-id`は`fn-*`形式であり、数値限定ではありません。
- `fn-*-ref-*`形状はfootnote definition IDとして禁止します。
- `user-content-fn-*` / `user-content-fnref-*`は最終DOMに残しません。
- footnote ID canonicalizerはbrowser-safe shared helperを正本にします。
- endnotes内の`h2#footnote-label`はpermalink / TOC対象にしません。
- TOC正本は`tocHeadings`に統一します。
- post-HTML normalizer後、`prepareTocHtml()`後、`injectNoteContentProfiles()`後にも最終契約を満たします。
- `validateNoteContentContracts()`のcollection-first化後も、table、callout、image、preview sandboxなど既存の非脚注契約を保持します。
- `rehypeDisallowDangerousProps`後もsafe fragment hrefを持つ脚注構造を維持します。
