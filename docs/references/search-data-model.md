# Search Data Model Reference

この文書は検索データモデルの詳細参照である。検索意味論の正本は`docs/contracts/search.md`とする。

## Core Types

- `LexicalCandidate`: Workerの採用済みrank順候補。typed evidenceに`rankingBestPassageId`と`snippetPassageId`を独立して保持する。
- `SearchCandidate`: Catalog fallback内のmetadata候補。lexical結果の再採点には使わない。
- `SearchResponse`: queryに対する最終応答。results、counts、diagnostics、degraded stateを持つ。
- `SearchSnippet`: UIへ渡せる安全な構造化snippet。生HTMLではない。
- `SearchCountMap`: tag、source、filterに対応する件数情報。
- `SearchCanonicalPathname`: document重複判定と結果識別に使うcanonical URL。
- `SearchStateUrl`: 検索画面のquery / filter / mode stateを表すURL。
- `SearchDiagnostics`: source欠落、URL正規化失敗、不正候補、縮退状態。sourceは`lexical | catalog`、最終型は`shared/search/search-types.ts`。
- `ReturnToReadingRequest`: search dialog selectionを読書面への遷移要求としてadapterへ渡すruntime event detail。検索結果identityやranking scoreではない。

## Notes

- `SearchCanonicalPathname`はnote page navigation URLではない。
- `SearchStateUrl`はdocument identityではない。
- Snippetはtext segmentとmatch segmentの構造として扱い、HTML stringを信頼境界として渡さない。
- Return-to-readingはevent detailのruntime遷移先値を扱うが、`SearchCanonicalPathname`や`SearchStateUrl`と同一視しない。
