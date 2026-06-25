# Markdown Authoring Syntax Reference

## Status

この文書はRouaultの現行compilerが受理・処理するMarkdown入力記法のReferenceである。

- Request: `REQ-MD-AUTHORING-SYNTAX-REFERENCE-001`
- Decision: `D-MD-AUTHORING-SYNTAX-REFERENCE-001`
- Scope: compiler-supported authoring syntax

## Scope

この文書はMarkdown入力記法全体を扱う。Rouault directiveだけでなく、CommonMark / GFMの処理カテゴリ、math、fenced code block meta、table authoring extension、表セル改行エスケープ、auto link-card transform、禁止構文を含む。

この文書は安全境界、final DOM、CSS、ランタイム挙動を再定義しない。

## Source of Truth

入力記法の実装上の正本はMarkdown transform pipelineと次の実装である。

- directive名とkind: `build/remark/directives/types.ts`, `build/remark/directives/grammar/directive-grammar.ts`
- directive属性: `build/remark/directives/grammar/attribute-schemas.ts`
- directive構造制約: `build/remark/directives/grammar/structural-rules.ts`
- 値域、既定値、正規化: `build/remark/directives/payload/**`, `build/remark/directives/validator/**`
- 出力adapter: `build/remark/directives/output/**`, `build/rehype/rouault-components.ts`
- fenced code block meta: `build/remark/directives/payload/payload-types.ts`, `build/remark/directives/output/adapt-code-block-output.ts`, `build/rehype/shiki-code-blocks.ts`
- auto link-card transform: `build/remark/remark-link-cards.ts`, `test/ssr/remark-link-cards.test.ts`

## Relation to Contract / Guide / Output Reference

- `docs/contracts/markdown.md`はMarkdownの安全境界、pipeline、出力責務の正本である。
- `docs/guides/markdown-authoring.md`は日常執筆向けGuideであり、網羅表を所有しない。
- `docs/references/markdown-output.md`はfinal DOMと出力詳細を扱い、入力記法一覧を所有しない。
- この文書の`Rouault Directive Inventory table`の`Authoring status`は文書分類であり、parser契約や受理条件を新たに定義しない。

## Markdown Syntax Inventory

RouaultのMarkdown入力記法は、次のカテゴリとして扱う。

- CommonMark / GFM
- Math
- Fenced Code Block Meta Syntax
- Rouault Directive Inventory
- Table Authoring Extension
- Table Cell Break Escape
- Auto Link Card Transform
- Prohibited Syntax

### CommonMark / GFM

RouaultはCommonMark / GFMの外部標準をこの文書で再定義・網羅しない。Markdown pipelineでは標準的なblock / inline、GFM表、task list、footnoteなどが処理対象になる。

Rouault固有の注意点は次の通りである。

- raw HTMLは標準Markdownとして存在してもRouaultでは禁止される。
- GFM表はstatic table surfaceへ正規化される。
- task list、footnote、tableなどの出力詳細は`docs/references/markdown-output.md`を参照する。
- 安全境界は`docs/contracts/markdown.md`を参照する。

### Math

MathはRouaultのMarkdown pipelineで処理対象となるカテゴリである。この文書はmath構文そのものの外部標準やKaTeX仕様を網羅しない。

出力詳細は`docs/references/markdown-output.md`、安全境界は`docs/contracts/markdown.md`を参照する。

### Fenced Code Block Meta Syntax

Fenced code blockはlanguageに続けてmetaを書ける。standalone fenced code metaはMarkdown入力拡張として扱われ、build-timeにcode block payloadと出力補助情報へ正規化される。

例はMarkdown文書として壊れないよう、外側に4連以上のbacktick fenceを使う。

````md
```ts filename="sample.ts" label="サンプル" copyable="false" show-line-numbers="true" highlight-lines="1,3-4"
const sample = 1;
```
````

#### Meta Key Inventory

`Meta Key Inventory table`はこのsection内の最初のMarkdown表である。

| Key | Authoring key | Source / Notes |
|---|---|---|
| filename | true | `payload-types.ts`, `adapt-code-block-output.ts`, `shiki-code-blocks.ts` |
| label | true | 確認先は`payload-types.ts`, `adapt-code-block-output.ts`, `shiki-code-blocks.ts`。意味・表示面・優先関係はこの表で定義しない。 |
| group-key | true | `payload-types.ts`, `adapt-code-block-output.ts`, `shiki-code-blocks.ts` |
| tab-label | true | 確認先は`payload-types.ts`, `adapt-code-block-output.ts`, `shiki-code-blocks.ts`。意味・表示面・優先関係はこの表で定義しない。 |
| copy-label | true | 確認先は`payload-types.ts`, `adapt-code-block-output.ts`, `shiki-code-blocks.ts`。意味・表示面・優先関係はこの表で定義しない。 |
| copyable | true | `payload-types.ts`, `adapt-code-block-output.ts`, `shiki-code-blocks.ts` |
| intent | true | `payload-types.ts`, `adapt-code-block-output.ts`, `shiki-code-blocks.ts` |
| show-line-numbers | true | `payload-types.ts`, `adapt-code-block-output.ts`, `shiki-code-blocks.ts` |
| copy-mode | true | `payload-types.ts`, `adapt-code-block-output.ts`, `shiki-code-blocks.ts` |
| wrap | true | `payload-types.ts`, `adapt-code-block-output.ts`, `shiki-code-blocks.ts` |
| highlight-lines | true | `payload-types.ts`, `adapt-code-block-output.ts`, `shiki-code-blocks.ts` |
| layout | true | `payload-types.ts`, `adapt-code-block-output.ts`, `shiki-code-blocks.ts` |

`data-shiki-meta`はauthoring meta keyではない。元のcode fence metaが出力側補助情報として保持される場合の詳細は`docs/references/markdown-output.md`と`build/remark/directives/output/adapt-code-block-output.ts`を参照する。

### Rouault Directive Inventory

`Rouault Directive Inventory table`はこのsection内の最初のMarkdown表である。

表記規則:

- separatorは全列`---`とする。
- なしは`none`と書く。
- booleanは`true` / `false`と書く。
- 複数値はbacktick付きcomma区切りで書く。
- `Max occurrences within parent`未指定は`none`と書く。
- attributesなしは`none`と書く。
- `Parent restriction: none`はstructural rule上の親制約未指定を意味し、任意文脈での推奨やtop-level専用を意味しない。
- `Value / normalization source`は値域・既定値・正規化の完全転記欄ではなく、確認先を示す欄である。
- 文書表記と実装値の比較では、`none`を未指定または空配列と同義に扱い、backtickを除去し、comma区切り値をtrimし、数値欄は`none`または10進数文字列として扱う。

| Directive | Kind | Allows children | Authoring status | Parent restriction | Required fenced code languages | Mutual exclusion | Max occurrences within parent | Attributes | Value / normalization source |
|---|---|---|---|---|---|---|---|---|---|
| callout | container | true | recommended-top-level | none | none | none | none | `kind`, `heading`, `label`, `icon`, `heading-level` | `build/remark/directives/payload/normalize-surface-payload.ts`, `build/remark/directives/validator/**` |
| code-group | container | true | recommended-top-level | none | none | none | none | `aria-label` | `build/remark/directives/payload/normalize-surface-payload.ts`, `build/remark/directives/output/**` |
| code-preview | container | true | recommended-top-level | none | none | none | none | `heading`, `controls`, `preview-padding`, `preview-align`, `preview-theme`, `preview-surface`, `preview-viewport` | `build/remark/directives/payload/normalize-preview-payload.ts`, `build/remark/directives/validator/**` |
| preview-sandbox | container | true | specialized-child-only | `code-preview` | `preview-html`, `preview-css`, `preview-js` | `preview` | 1 | `iframe-title`, `base-url`, `allow-js`, `activation-policy`, `height-mode`, `allow-forms`, `allow-downloads`, `allow-pointer-lock`, `allow-popups`, `height`, `max-height` | `build/remark/directives/payload/normalize-preview-payload.ts`, `build/remark/directives/validator/**` |
| details | container | true | recommended-top-level | none | none | none | none | `summary`, `open` | `build/remark/directives/payload/normalize-surface-payload.ts`, `build/remark/directives/validator/**` |
| info-box | container | true | recommended-top-level | none | none | none | none | `heading`, `icon`, `heading-level`, `landmark`, `variant`, `density` | `build/remark/directives/payload/normalize-surface-payload.ts`, `build/remark/directives/validator/**` |
| link-card | leaf | false | recommended-top-level | none | none | none | none | `url`, `title`, `description`, `image`, `site-name` | `build/remark/directives/payload/normalize-surface-payload.ts`, `build/remark/remark-link-cards.ts` |
| score | container | true | recommended-top-level | none | none | none | none | `src`, `label`, `description`, `aspect-ratio`, `primary` | `build/remark/directives/payload/normalize-surface-payload.ts`, `build/remark/directives/validator/**` |
| table | container | true | recommended-top-level | none | none | none | none | `column-widths` | `build/remark/directives/payload/normalize-table-payload.ts`, `docs/contracts/markdown.md` |
| tabs | container | true | recommended-top-level | none | none | none | none | `selected-value`, `default-selected-value`, `orientation`, `automatic-activation`, `url-sync` | `build/remark/directives/payload/normalize-tabs-payload.ts`, `build/remark/directives/validator/**` |
| translation | container | true | recommended-top-level | none | none | none | none | `original`, `translated`, `lang`, `target-lang` | `build/remark/directives/payload/normalize-translation-payload.ts`, `build/remark/directives/validator/**` |
| translation-overlay | container | true | top-level-supported | none | none | none | none | `original`, `translated`, `lang`, `target-lang`, `surface` | `build/remark/directives/payload/normalize-translation-payload.ts`, `build/remark/directives/validator/**` |
| preview | container | true | child-only | `code-preview` | none | `preview-sandbox` | 1 | none | `build/remark/directives/payload/normalize-preview-payload.ts`, `build/remark/directives/validator/**` |
| toolbar | container | true | child-only | `code-preview` | none | none | 1 | none | `build/remark/directives/payload/normalize-preview-payload.ts`, `build/remark/directives/validator/**` |
| tab | container | true | child-only | `tabs` | none | none | none | `value` | `build/remark/directives/payload/normalize-tabs-payload.ts`, `build/remark/directives/validator/**` |
| panel | container | true | child-only | `tabs` | none | none | none | none | `build/remark/directives/payload/normalize-tabs-payload.ts`, `build/remark/directives/validator/**` |
| syntax-card | container | true | recommended-top-level | none | none | none | none | `kind`, `name`, `lang`, `heading-level` | `build/remark/directives/payload/normalize-syntax-payload.ts`, `build/remark/directives/output/adapt-syntax-output.ts` |
| syntax-signature | container | true | child-only | `syntax-card` | none | none | 1 | none | `build/remark/directives/payload/normalize-syntax-payload.ts`, `build/remark/directives/validator/**` |
| syntax-section | container | true | child-only | `syntax-card` | none | none | none | `label` | `build/remark/directives/payload/normalize-syntax-payload.ts`, `build/remark/directives/validator/**` |
| syntax-fields | container | true | child-only | `syntax-section` | none | none | none | none | `build/remark/directives/payload/normalize-syntax-payload.ts`, `build/remark/directives/validator/**` |
| syntax-field | container | true | child-only | `syntax-fields` | none | none | none | `name`, `type`, `required`, `default` | `build/remark/directives/payload/normalize-syntax-payload.ts`, `build/remark/directives/validator/**` |

### Directive Families

Authoring statusの初期分類は次の方針に従う。これは文書分類であり、parser契約を新たに定義しない。

- `recommended-top-level`: `callout`, `code-group`, `code-preview`, `details`, `info-box`, `link-card`, `score`, `table`, `tabs`, `translation`, `syntax-card`
- `top-level-supported`: `translation-overlay`
- `specialized-child-only`: `preview-sandbox`
- `child-only`: `preview`, `toolbar`, `tab`, `panel`, `syntax-signature`, `syntax-section`, `syntax-fields`, `syntax-field`
- `compatibility-supported`: none

`preview-sandbox`は`code-preview` family内の特殊childとして扱う。この整理は非推奨化、削除、受理条件変更ではない。

### Table Authoring Extension

`::table{column-widths="..."}`はGFM表1個へ列幅ヒントを付与するauthoring wrapperである。`::table`はinteractive table、sortable table、filterable table、row actionを意味しない。

`::table` wrapper markerの周囲へblank line workaroundを追加する必要はない。Rouault-owned syntax boundaryはRouaultのcontract surfaceであり、`remark-gfm`の偶発的なpost-GFM mdast shapeに従属しない。ただし現行実装はtableに限定したTier 1 post-GFM recoveryであり、true pre-GFM source parser ownershipではない。

`column-widths`の値域、列数一致、build error条件は`docs/contracts/markdown.md`と`build/remark/directives/payload/normalize-table-payload.ts`を参照する。

### Table Cell Break Escape

`{{break}}`は表セルテキストエスケープである。plain GFM表セルと`::table`内table cellで処理対象になる。

raw `<br>`、Markdown hard break、`:br[]`は表セル改行として採用しない。詳細な許可位置とbuild error条件は`docs/contracts/markdown.md`と`test/node/remark-rouault-directives.test.ts`を参照する。

### Auto Link Card Transform

`::link-card` directiveとauto link-cardは別経路である。

auto link-cardはMarkdown link / URLなどの入力からbuild-timeにlink-card surfaceへ正規化されるtransformである。この文書は自動化条件や値域を推測で書かない。確認先は`build/remark/remark-link-cards.ts`と`test/ssr/remark-link-cards.test.ts`である。

出力DOM詳細は`docs/references/markdown-output.md`を参照する。

### Prohibited Syntax

Rouaultでは次をMarkdown入力として許可しない。

- raw HTML
- dangerous URL scheme
- dangerous props
- `on*`属性
- author supplied `srcdoc`
- 許可外`style`

禁止の正本は`docs/contracts/markdown.md`とMarkdown transform pipelineのsafety checksである。

## Maintenance Notes

- この文書のdirective名、kind、属性、構造制約は`supportedDirectiveNames`, `directiveGrammar`, `directiveAttributeSchemas`, `directiveStructuralRules`と同期する。
- `Rouault Directive Inventory table`と`Meta Key Inventory table`のparse対象は、それぞれのsection heading境界内の最初のMarkdown表である。
- fenced code block metaの値域を完全表として推測しない。
- auto link-cardの発火条件を推測で断定しない。
- `data-shiki-meta`をauthoring meta keyとして追加しない。
