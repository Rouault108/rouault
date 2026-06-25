# Search Data Model Reference

この文書は検索データモデルの詳細参照である。検索意味論の正本は`docs/contracts/search.md`とする。

## Core Types

- `SearchCandidate`: sourceから得られる検索候補。document identity、title、canonicalPathname、snippet、source metadataを持つ。render hrefやlegacy URL fieldは持たない。
- `SearchResponse`: queryに対する最終応答。results、counts、diagnostics、degraded stateを持つ。
- `SearchSnippet`: UIへ渡せる安全な構造化snippet。生HTMLではない。
- `SearchCountMap`: tag、source、filterに対応する件数情報。
- `SearchCanonicalPathname`: document重複判定と結果識別に使うcanonical URL。
- `SearchStateUrl`: 検索画面のquery / filter / mode stateを表すURL。
- `SearchDiagnostic`: source欠落、URL正規化失敗、不正候補、縮退状態を記録する診断情報。
- `ReturnToReadingRequest`: search dialog selectionを読書面への遷移要求としてadapterへ渡すruntime event detail。検索結果identityやranking scoreではない。

## Notes

- `SearchCanonicalPathname`はnote page navigation URLではない。
- `SearchStateUrl`はdocument identityではない。
- Snippetはtext segmentとmatch segmentの構造として扱い、HTML stringを信頼境界として渡さない。
- Return-to-readingはevent detailのruntime遷移先値を扱うが、`SearchCanonicalPathname`や`SearchStateUrl`と同一視しない。
