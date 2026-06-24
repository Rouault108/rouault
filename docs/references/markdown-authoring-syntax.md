# Markdown Authoring Syntax Reference

## Status

この文書は Rouault の現行 compiler が受理・処理する Markdown 入力記法の Reference である。

- Request: `REQ-MD-AUTHORING-SYNTAX-REFERENCE-001`
- Decision: `D-MD-AUTHORING-SYNTAX-REFERENCE-001`
- Scope: compiler-supported authoring syntax

## Scope

この文書は Markdown 入力記法全体を扱う。Rouault directive だけでなく、CommonMark / GFM の処理カテゴリ、math、fenced code block meta、table authoring extension、table cell break escape、auto link-card transform、禁止構文を含む。

この文書は安全境界、final DOM、CSS、runtime 挙動を再定義しない。

## Source of Truth

入力記法の実装上の正本は Markdown transform pipeline と次の実装である。

- directive 名と kind: `build/remark/directives/types.ts`, `build/remark/directives/grammar/directive-grammar.ts`
- directive 属性: `build/remark/directives/grammar/attribute-schemas.ts`
- directive 構造制約: `build/remark/directives/grammar/structural-rules.ts`
- 値域、既定値、正規化: `build/remark/directives/payload/**`, `build/remark/directives/validator/**`
- 出力 adapter: `build/remark/directives/output/**`, `build/rehype/rouault-components.ts`
- fenced code block meta: `build/remark/directives/payload/payload-types.ts`, `build/remark/directives/output/adapt-code-block-output.ts`, `build/rehype/shiki-code-blocks.ts`
- auto link-card transform: `build/remark/remark-link-cards.ts`, `test/ssr/remark-link-cards.test.ts`

## Relation to Contract / Guide / Output Reference

- `docs/contracts/markdown.md` は Markdown の安全境界、pipeline、出力責務の正本である。
- `docs/guides/markdown-authoring.md` は日常執筆向け Guide であり、網羅表を所有しない。
- `docs/references/markdown-output.md` は final DOM と出力詳細を扱い、入力記法一覧を所有しない。
- この文書の `Rouault Directive Inventory table` の `Authoring status` は文書分類であり、parser 契約や受理条件を新たに定義しない。

## Markdown Syntax Inventory

Rouault の Markdown 入力記法は、次のカテゴリとして扱う。

- CommonMark / GFM
- Math
- Fenced Code Block Meta Syntax
- Rouault Directive Inventory
- Table Authoring Extension
- Table Cell Break Escape
- Auto Link Card Transform
- Prohibited Syntax

### CommonMark / GFM

Rouault は CommonMark / GFM の外部標準をこの文書で再定義・網羅しない。Markdown pipeline では標準的な block / inline、GFM table、task list、footnote などが処理対象になる。

Rouault 固有の注意点は次の通りである。

- raw HTML は標準 Markdown として存在しても Rouault では禁止される。
- GFM table は static table surface へ正規化される。
- task list、footnote、table などの出力詳細は `docs/references/markdown-output.md` を参照する。
- 安全境界は `docs/contracts/markdown.md` を参照する。

### Math

Math は Rouault の Markdown pipeline で処理対象となるカテゴリである。この文書は math 構文そのものの外部標準や KaTeX 仕様を網羅しない。

出力詳細は `docs/references/markdown-output.md`、安全境界は `docs/contracts/markdown.md` を参照する。

### Fenced Code Block Meta Syntax

Fenced code block は language に続けて meta を書ける。standalone fenced code meta は Markdown 入力拡張として扱われ、build-time に code block payload と出力補助情報へ正規化される。

例は Markdown 文書として壊れないよう、外側に4連以上の backtick fence を使う。

````md
```ts filename="sample.ts" label="サンプル" copyable="false" show-line-numbers="true" highlight-lines="1,3-4"
const sample = 1;
```
````

#### Meta Key Inventory

`Meta Key Inventory table` はこの section 内の最初の Markdown 表である。

| Key | Authoring key | Source / Notes |
|---|---|---|
| filename | true | `payload-types.ts`, `adapt-code-block-output.ts`, `shiki-code-blocks.ts` |
| label | true | 確認先は `payload-types.ts`, `adapt-code-block-output.ts`, `shiki-code-blocks.ts`。意味・表示面・優先関係はこの表で定義しない。 |
| group-key | true | `payload-types.ts`, `adapt-code-block-output.ts`, `shiki-code-blocks.ts` |
| tab-label | true | 確認先は `payload-types.ts`, `adapt-code-block-output.ts`, `shiki-code-blocks.ts`。意味・表示面・優先関係はこの表で定義しない。 |
| copy-label | true | 確認先は `payload-types.ts`, `adapt-code-block-output.ts`, `shiki-code-blocks.ts`。意味・表示面・優先関係はこの表で定義しない。 |
| copyable | true | `payload-types.ts`, `adapt-code-block-output.ts`, `shiki-code-blocks.ts` |
| intent | true | `payload-types.ts`, `adapt-code-block-output.ts`, `shiki-code-blocks.ts` |
| show-line-numbers | true | `payload-types.ts`, `adapt-code-block-output.ts`, `shiki-code-blocks.ts` |
| copy-mode | true | `payload-types.ts`, `adapt-code-block-output.ts`, `shiki-code-blocks.ts` |
| wrap | true | `payload-types.ts`, `adapt-code-block-output.ts`, `shiki-code-blocks.ts` |
| highlight-lines | true | `payload-types.ts`, `adapt-code-block-output.ts`, `shiki-code-blocks.ts` |
| layout | true | `payload-types.ts`, `adapt-code-block-output.ts`, `shiki-code-blocks.ts` |

`data-shiki-meta` は authoring meta key ではない。元の code fence meta が出力側補助情報として保持される場合の詳細は `docs/references/markdown-output.md` と `build/remark/directives/output/adapt-code-block-output.ts` を参照する。

### Rouault Directive Inventory

`Rouault Directive Inventory table` はこの section 内の最初の Markdown 表である。

表記規則:

- separator は全列 `---` とする。
- なしは `none` と書く。
- boolean は `true` / `false` と書く。
- 複数値は backtick 付き comma 区切りで書く。
- `Max occurrences within parent` 未指定は `none` と書く。
- attributes なしは `none` と書く。
- `Parent restriction: none` は structural rule 上の親制約未指定を意味し、任意文脈での推奨や top-level 専用を意味しない。
- `Value / normalization source` は値域・既定値・正規化の完全転記欄ではなく、確認先を示す欄である。
- 文書表記と実装値の比較では、`none` を未指定または空配列と同義に扱い、backtick を除去し、comma 区切り値を trim し、数値欄は `none` または10進数文字列として扱う。

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

Authoring status の初期分類は次の方針に従う。これは文書分類であり、parser 契約を新たに定義しない。

- `recommended-top-level`: `callout`, `code-group`, `code-preview`, `details`, `info-box`, `link-card`, `score`, `table`, `tabs`, `translation`, `syntax-card`
- `top-level-supported`: `translation-overlay`
- `specialized-child-only`: `preview-sandbox`
- `child-only`: `preview`, `toolbar`, `tab`, `panel`, `syntax-signature`, `syntax-section`, `syntax-fields`, `syntax-field`
- `compatibility-supported`: none

`preview-sandbox` は `code-preview` family 内の特殊 child として扱う。この整理は非推奨化、削除、受理条件変更ではない。

### Table Authoring Extension

`::table{column-widths="..."}` は GFM table 1個へ列幅ヒントを付与する authoring wrapper である。`::table` は interactive table、sortable table、filterable table、row action を意味しない。

`::table` wrapper marker の周囲へ blank line workaround を追加する必要はない。Rouault-owned syntax boundary は Rouault の contract surface であり、`remark-gfm` の偶発的な post-GFM mdast shape に従属しない。ただし現行実装は table に限定した Tier 1 post-GFM recovery であり、true pre-GFM source parser ownership ではない。

`column-widths` の値域、列数一致、build error 条件は `docs/contracts/markdown.md` と `build/remark/directives/payload/normalize-table-payload.ts` を参照する。

### Table Cell Break Escape

`{{break}}` は table cell text escape である。plain GFM table cell と `::table` 内 table cell で処理対象になる。

raw `<br>`、Markdown hard break、`:br[]` は table cell break として採用しない。詳細な許可位置と build error 条件は `docs/contracts/markdown.md` と `test/node/remark-rouault-directives.test.ts` を参照する。

### Auto Link Card Transform

`::link-card` directive と auto link-card は別経路である。

auto link-card は Markdown link / URL などの入力から build-time に link-card surface へ正規化される transform である。この文書は自動化条件や値域を推測で書かない。確認先は `build/remark/remark-link-cards.ts` と `test/ssr/remark-link-cards.test.ts` である。

出力 DOM 詳細は `docs/references/markdown-output.md` を参照する。

### Prohibited Syntax

Rouault では次を Markdown 入力として許可しない。

- raw HTML
- dangerous URL scheme
- dangerous props
- `on*` 属性
- author supplied `srcdoc`
- 許可外 `style`

禁止の正本は `docs/contracts/markdown.md` と Markdown transform pipeline の safety checks である。

## Maintenance Notes

- この文書の directive 名、kind、属性、構造制約は `supportedDirectiveNames`, `directiveGrammar`, `directiveAttributeSchemas`, `directiveStructuralRules` と同期する。
- `Rouault Directive Inventory table` と `Meta Key Inventory table` の parse 対象は、それぞれの section heading 境界内の最初の Markdown 表である。
- fenced code block meta の値域を完全表として推測しない。
- auto link-card の発火条件を推測で断定しない。
- `data-shiki-meta` を authoring meta key として追加しない。
