# Markdown Parser Ownership Migration Decision Record

## Status

- Type: R3 Decision Record
- Date: 2026-06-24
- Decision ID: D-MARKDOWN-PARSER-OWNERSHIP-001
- Contract source of truth: `docs/contracts/markdown.md`
- Scope: Rouault-owned Markdown directive boundary recovery

この文書はdecision recordです。現在のcontractを再定義する正本ではありません。現行contractの正本は`docs/contracts/markdown.md`です。

## Context

- Rouault directive markerはRouault-owned syntax boundaryであり、偶発的なpost-GFM mdast shapeに従属させるとauthoring contractが不安定になる。
- 現行production pipelineは`remarkMath`、`remarkGfm`、`remarkExpandExampleIncludes`、`remarkDisallowRawHtml`、`remarkRouaultDirectives`、`remarkLinkCards`の順である。
- `::table ... ::`はGFM表1個だけを包むRouault table wrapperである。
- `remark-gfm`はblank lineなしのclosing `::`をtable row / table cell側へ吸収する場合がある。

## Decision

Phase 1では`table` directiveに限定してTier 1 post-GFM recovery islandを導入する。これはtrue pre-GFM source parser ownershipではない。

`remarkRouaultDirectives`はpost-GFM mdastから`::table` wrapper boundaryを回復し、recovered closing `::`だけをtable payloadから除去する。authorsは`::table` wrapper markerの周囲にblank linesをworkaroundとして追加する必要はない。

recoveryはtable-specificとし、非table directiveのparser migrationは今回のscope外に置く。runtime、final HTML、rehype normalizationはlost parser boundaryをrepairしない。

## Consequences

- production plugin orderは維持される。
- valid `::table` wrapperはGFM表child 1個として既存validatorへ渡される。
- malformed wrapperはmeaningful non-table childのsilent dropによってvalid化しない。
- column-widths token validationは`normalizeTablePayload()`が所有し、column count validationは既存rehype table normalization側が所有する。

## Out of scope

- true pre-GFM source parser ownership
- non-table directive migration
- runtime / final HTML / rehype normalizationによるparser boundary repair
- content Markdownへのblank-line workaround
