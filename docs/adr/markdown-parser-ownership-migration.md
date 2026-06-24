# Markdown Parser Ownership Migration Decision Record

## Status

- Type: R3 Decision Record
- Date: 2026-06-24
- Decision ID: D-MARKDOWN-PARSER-OWNERSHIP-001
- Contract source of truth: `docs/contracts/markdown.md`
- Scope: Rouault-owned Markdown directive boundary recovery

この文書は decision record です。現在の contract を再定義する正本ではありません。現行 contract の正本は `docs/contracts/markdown.md` です。

## Context

- Rouault directive marker は Rouault-owned syntax boundary であり、偶発的な post-GFM mdast shape に従属させると authoring contract が不安定になる。
- 現行 production pipeline は `remarkMath`、`remarkGfm`、`remarkExpandExampleIncludes`、`remarkDisallowRawHtml`、`remarkRouaultDirectives`、`remarkLinkCards` の順である。
- `::table ... ::` は GFM table 1個だけを包む Rouault table wrapper である。
- `remark-gfm` は blank line なしの closing `::` を table row / table cell 側へ吸収する場合がある。

## Decision

Phase 1 では `table` directive に限定して Tier 1 post-GFM recovery island を導入する。これは true pre-GFM source parser ownership ではない。

`remarkRouaultDirectives` は post-GFM mdast から `::table` wrapper boundary を回復し、recovered closing `::` だけを table payload から除去する。authors は `::table` wrapper marker の周囲に blank lines を workaround として追加する必要はない。

recovery は table-specific とし、非 table directive の parser migration は今回の scope 外に置く。runtime、final HTML、rehype normalization は lost parser boundary を repair しない。

## Consequences

- production plugin order は維持される。
- valid `::table` wrapper は GFM table child 1個として既存 validator へ渡される。
- malformed wrapper は meaningful non-table child の silent drop によって valid 化しない。
- column-widths token validation は `normalizeTablePayload()` が所有し、column count validation は既存 rehype table normalization 側が所有する。

## Out of scope

- true pre-GFM source parser ownership
- non-table directive migration
- runtime / final HTML / rehype normalization による parser boundary repair
- content Markdown への blank-line workaround
