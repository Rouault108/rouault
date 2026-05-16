# Search Ranking and Diagnostics Reference

この文書は ranking と diagnostics の詳細参照である。検索責務境界の正本は `docs/contracts/search.md` とする。

## Ranking Profile

- `rouault-search-v1` を ranking profile の互換単位とする。
- `navigate` は直接到達性、title/path 一致、source reliability を強く見る。
- `explore` は本文一致、tag、関連候補、match evidence を比較しやすくする。

## Score Fields

- `sourceReliabilityScore`: source の信頼度。
- `matchEvidenceScore`: query と候補の一致根拠。
- `titleScore`: title 一致。
- `pathScore`: path / label 一致。
- `bodyScore`: 本文一致。
- `tagScore`: tag filter との一致。
- `recencyScore`: 必要な場合だけ使う補助特徴量。

## Stage Order

1. query normalization
2. source retrieval
3. candidate validation
4. canonical URL normalization
5. candidate merge
6. score calculation
7. stable sort
8. response shaping
9. diagnostic aggregation

## Diagnostic Issue Codes

- `search-source-pagefind-failed`
- `catalog-unavailable`
- `invalid-candidate`
- `invalid-url`
- `duplicate-candidate`
- `snippet-dropped`
- `source-timeout`
- `degraded-results`
- `return-to-reading-adapter-missing`

Issue code は UI 文言ではない。UI は diagnostics を表示材料として扱い、検索意味論を再定義しない。
Return-to-reading に関する issue code は adapter 接続の診断であり、ranking profile や candidate merge の score へ影響させない。
