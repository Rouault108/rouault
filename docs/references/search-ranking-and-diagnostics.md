# Search Ranking and Diagnostics Reference

この文書はrankingとdiagnosticsの詳細参照である。検索責務境界の正本は`docs/contracts/search.md`とする。

## Ranking Profile

- `rouault-search-v1`をranking profileの互換単位とする。
- `navigate`は直接到達性、title/path 一致、source reliabilityを強く見る。
- `explore`は本文一致、tag、関連候補、match evidenceを比較しやすくする。

## Score Fields

- `sourceReliabilityScore`: sourceの信頼度。
- `matchEvidenceScore`: queryと候補の一致根拠。
- `titleScore`: title一致。
- `pathScore`: path / label一致。
- `bodyScore`: 本文一致。
- `tagScore`: tag filterとの一致。
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

Issue codeはUI文言ではない。UIはdiagnosticsを表示材料として扱い、検索意味論を再定義しない。
Return-to-readingに関するissue codeはadapter接続の診断であり、ranking profileやcandidate mergeのscoreへ影響させない。
