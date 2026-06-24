# Markdown Contract

## 1. Status

- Type: Normative
- Source of truth: Markdown transform pipeline、remark/rehype adapters、SSR tests
- Applies to: Markdown 入力、parser、output DOM、safety boundary、hydration directive
- Non-goals: component 別 DOM 詳細表、authoring example の網羅、Permanent URL hash 詳細

## 2. Ownership

### This Layer Owns

- Author input / parser / output DOM / safety boundary の責務境界。
- raw HTML、dangerous URL、dangerous props、arbitrary style injection の禁止。
- note 本文の最終 DOM が static-first であること。
- no-JS baseline を破壊しないこと。
- Hydration directive が build-time 注釈を正本とすること。

### This Layer Must Not Own

- Component 別 DOM 詳細表。`docs/references/markdown-output.md` を参照する。
- 執筆者向け説明。`docs/guides/markdown-authoring.md` と `docs/guides/note-authoring.md` を参照する。
- Markdown 入力記法の網羅表。`docs/references/markdown-authoring-syntax.md` を参照する。
- Permanent URL hash 生成規則。`docs/contracts/permanent-url.md` を参照する。

## 3. Public Contract

### Inputs

- Markdown 本文。
- Frontmatter。
- 許可された独自 directive と属性。

### Outputs

- Static-first な note 本文 DOM。
- 許可済み component / HTML structure。
- Build-time hydration annotation。

### Events

- N/A

- Markdown renderer は raw HTML を本文 DOM へそのまま通してはならない。
- `javascript:` などの dangerous URL scheme を許可してはならない。
- `on*`、`srcdoc`、許可外 `style` などの dangerous props を許可してはならない。
- Component 化は semantic HTML と no-JS baseline を壊してはならない。
- Hydration directive は runtime rescue ではなく build-time contract とする。

### Article Header Source Link Contract

Frontmatter の `source` は、note page の article header metadata surface link として出力される。

`article-header__source-link` の `data-link-kind` は、出典 UI であっても link classifier の結果に従う。

- external origin の source は `data-link-kind="external-web"` とし、`data-external="true"` を出力する。
- same-origin かつ internal document route の source は `data-link-kind="internal-document"` とする。
- same-origin かつ internal document route ではない source は `data-link-kind="internal-resource"` とする。
- unsafe source は link 化しない。
- `data-link-surface="metadata"` は常に維持する。
- `target="_blank"` と `rel="noopener noreferrer"` は全分類で維持する。
- `internal-document` に分類されても、article header source link は出典参照であり、app-router interception ではなく passthrough navigation として扱う。

`data-external="true"` と `aria-label="出典（外部サイト、新しいタブで開く）"` は `external-web` のときだけ使う。  
`internal-document` / `internal-resource` の場合は `data-external` を出さず、`aria-label="出典（新しいタブで開く）"` を使う。

classification context を持たない raw render / story / unit test 用の fallback は、`renderArticleHeaderHtml()` の raw fallback mode に限定する。NoteLayout 経由の final note page HTML では、source link を分類済み mode で描画し、raw fallback を使ってはならない。

### Static Card Surface Contract

Markdown output 層の card surface は、旧 `ui-card` custom element の復活ではなく named static surface として扱う。`ui-card` は static-first deletion target であり、本文 DOM を Web Component lifecycle や runtime click delegation へ再依存させないため、最終 HTML に復活させてはならない。

- generic `.card` surface は現行 contract として作らない。
- 旧 `ui-card` の `variant` system と `clickable` attribute contract は復活させない。
- 現行の named card surfaces は `result-card`、`link-card`、`syntax-card` である。
- `result-card` は検索・一覧 UI の surface であり、全面リンク面は native `<a>` に委ねる。Markdown output 層は詳細 layout を所有しない。
- `link-card` は Markdown directive / auto link-card 由来の static surface であり、build transform と CSS で成立させる。
- `syntax-card` は Markdown directive 由来のコード説明 surface であり、本文 heading ではなくカード内部 label を持つ。

`link-card` の description は build transform で必要に応じて切り詰め、切り詰め有無を `data-text-truncated` で示す。旧 runtime line overflow detection に基づく `data-line-overflowed` は復活させない。表示上の行数制御は CSS の責務であり、Markdown final DOM に runtime overflow state を残さない。

`syntax-card__name` と `syntax-section__heading` は heading ではなく label として出力する。`heading-level` は入力互換属性として受理されるが、static-first output では `h2`〜`h6` の DOM heading 生成に使わない。final DOM に `heading-level` / `data-heading-level` を残してはならない。`syntax-card` subtree は本文 heading id、heading permalink、TOC の対象外である。

### Static Table Surface Contract

Markdown output 層の `table` は、scrollable static table surface として扱う。`data-table-root` は横スクロール可能な表領域と focusable region を示すための属性であり、row action、row selection、row navigation、interactive data grid を意味しない。

- Markdown table の行全体をクリック可能面として扱ってはならない。
- Markdown table の `tr:hover` による row-level 背景変更は標準契約に含めない。
- 表rootの `tabindex="0"` は横スクロール領域へのキーボード到達性のためであり、行単位の操作性を意味しない。
- セル内の link / button などの native interactive element は、それぞれの要素契約に従って操作可能面として振る舞う。
- クリック可能な一覧や行操作UIは、Markdown table へ後付けせず、専用の list / card / interactive surface として設計する。

### Table Authoring Extension Contract

Markdown table authoring extension は、static table surface の契約を弱めない。raw HTML 禁止、interactive data grid ではない意味論、row hover affordance 不在は維持する。

`::table{column-widths="..."}` は GFM table へ列幅ヒントを付与する authoring wrapper である。`::table` は GFM table 1個だけを包む。表以外、複数表、表と段落の混在は build error とする。

`::table ... ::` の wrapper boundary は Rouault-owned syntax boundary であり、偶発的な post-GFM mdast shape に従属しない。現行 Phase 1 は table に限定した Tier 1 post-GFM recovery island であり、true pre-GFM source parser ownership ではない。`remark-gfm` が closing `::` を table row / table cell 側へ吸収した場合でも、remarkRouaultDirectives は recovered closing marker だけを table payload から除去する。authors は `::table` wrapper marker の周囲に blank lines を workaround として追加する必要はない。

runtime、final HTML、rehype normalization は lost parser boundary を repair しない。非 table directive の parser ownership migration はこの table boundary recovery の scope 外である。

`column-widths` は固定トークン列であり、任意CSS値ではない。許可トークンは `auto` / `fit` / `narrow` / `medium` / `wide` / `numeric` とする。

- `column-widths` は空白区切り、順序保持、重複許可とする。
- comma区切り、未知トークン、空値は build error とする。
- `column-widths` の指定数は table列数と一致しなければならない。
- `column-widths` 指定 table では `colspan` / `rowspan` を許可しない。
- `numeric` は幅ヒントだけであり、右揃えを暗黙指定しない。
- 右揃えは既存GFM記法 `---:` に委ねる。

`{{break}}` は table cell text escape である。exact `{{break}}` のみを特殊扱いし、`{{...}}` 全体はRouault構文として予約しない。`{{foo}}` / `{{ break }}` / `{{BREAK}}` / `{{br}}` は通常テキストとして扱い、build error にしない。

- `{{break}}` は plain GFM table cell でも `::table` 内 table cell でも有効とする。
- table cell外の exact `{{break}}` は build error とする。
- table cell内 link / linkReference 配下の `{{break}}` は build error とする。
- table cell内 emphasis / strong 配下の `{{break}}` は許可する。
- code span / code block内の `{{break}}` は変換対象外とする。
- 同一 text node 内の Unicode whitespace 隣接と `{{break}}{{break}}` 連続は build error とする。
- text nodeの先頭・末尾であること自体は build error条件にしない。
- text node境界をまたぐ whitespace隣接や `{{break}}{{break}}` 連続の semantic adjacency 判定は初期実装では行わない。
- `{{break}}` は table cell実質先頭・実質末尾には置けない。
- `{{break}}` の前後には meaningful inline content が必要である。

cell-level の meaningful inline content 有無検査は、cell実質先頭・実質末尾禁止のための最小検査であり、inline node境界をまたぐ semantic adjacency 判定とは別扱いにする。meaningful inline content として数えるnodeは、非空白text、emphasis / strong配下の非空白text、inlineCode、link / linkReference表示テキストに限定する。未列挙inline nodeは、内部に列挙済みnodeとして評価可能な内容を持つ場合だけ meaningful とする。image / image alt text は初期実装では meaningful content として数えない。

raw `<br>`、Markdown hard break、`:br[]` は table cell break contract として採用しない。mdast `break` node または実装上対応する hard break node が table cell配下に存在する場合、remark側で build error とする。mdastで検出できない経路では final contract の markerなし `<br>` 拒否で防御する。

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

- Markdown 出力を component runtime の都合で再解釈してはならない。
- Safety contract を Guide や Reference だけに置いてはならない。

## 5. Failure Semantics

- 危険入力は build-time rejection を優先する。
- 未知 directive や許可外属性は黙って通さず、明示的に拒否または安全に落とす。
- Runtime helper は build-time safety boundary を上書きしてはならない。

## 6. Integration Boundaries

### Build-time

- 実装上の source of truth は `velite.config.ts` におけるプラグイン順序である。
- Markdown transform pipeline は次の順序で成立する。
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
- Parser / transformer / adapter が Markdown を最終 DOM へ正規化する。
- authoring grammar に関わる意味論変更は、remark 層の正本と実装順序の双方を整合させる。
- 出力 DOM に関わる意味論変更は、rehype 層の正本と実装順序の双方を整合させる。
- Markdown本文内の相対 `.md` ノートリンクは `rehypeResolveNoteSourceLinks` で note page navigation URL へ解決してから、本文リンクの種別注釈を rehype 層で確定する。詳細な出力属性契約は `docs/references/markdown-output.md` を参照する。
- 安全規約は後段検査へ押し込むだけでなく、可能なものは前段で早期拒否してよい。
- 実装順序の変更は意味論変更を伴いうるため、単なるリファクタリングとして扱ってはならない。

### SSR

- Final DOM は JS なしで読める。

### Client Runtime

- Runtime は enhancement のみを行い、本文意味論を再構築しない。

### Hydration

- Content hydration は scheduler / registry が所有する。

### Tests

- Safety、output fixture、hydration budget の更新先は `docs/contracts/testing-taxonomy.md` に従う。

## 7. Acceptance Criteria

- Markdown safety boundary が Contract として存在する。
- raw HTML、dangerous URL、dangerous props、arbitrary style injection が禁止されている。
- no-JS baseline と static-first DOM が維持されている。
- 詳細 DOM mapping は Reference に分離されている。

---

## Footnote static-first contract

Markdown から note HTML への脚注出力は static-first DOM を正本にします。

- `ui-footnote` は note 最終 HTML に残しません。
- 通常リンク注釈と脚注構造リンクを分離します。
- `data-footnote-id` は `fn-*` 形式であり、数値限定ではありません。
- `fn-*-ref-*` 形状は footnote definition ID として禁止します。
- `user-content-fn-*` / `user-content-fnref-*` は最終 DOM に残しません。
- footnote ID canonicalizer は browser-safe shared helper を正本にします。
- endnotes 内の `h2#footnote-label` は permalink / TOC 対象にしません。
- TOC 正本は `tocHeadings` に統一します。
- post-HTML normalizer 後、`prepareTocHtml()` 後、`injectNoteContentProfiles()` 後にも最終契約を満たします。
- `validateNoteContentContracts()` の collection-first 化後も、table、callout、image、preview sandbox など既存の非脚注契約を保持します。
- `rehypeDisallowDangerousProps` 後も safe fragment href を持つ脚注構造を維持します。
