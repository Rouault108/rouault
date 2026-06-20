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

### DOM / URL / State Contract

- Markdown renderer は raw HTML を本文 DOM へそのまま通してはならない。
- `javascript:` などの dangerous URL scheme を許可してはならない。
- `on*`、`srcdoc`、許可外 `style` などの dangerous props を許可してはならない。
- Component 化は semantic HTML と no-JS baseline を壊してはならない。
- Hydration directive は runtime rescue ではなく build-time contract とする。

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
