# Search Data Model Reference

この文書は検索データモデルの詳細参照である。検索意味論の正本は `docs/contracts/search.md` とする。

## Core Types

- `SearchCandidate`: source から得られる検索候補。document identity、title、url、canonicalUrl、snippet、source metadata を持つ。
- `SearchResponse`: query に対する最終応答。results、counts、diagnostics、degraded state を持つ。
- `SearchSnippet`: UI へ渡せる安全な構造化 snippet。生 HTML ではない。
- `SearchCountMap`: tag、source、filter に対応する件数情報。
- `DocumentCanonicalUrl`: document 重複判定と結果識別に使う canonical URL。
- `SearchStateUrl`: 検索画面の query / filter / mode state を表す URL。
- `SearchDiagnostic`: source 欠落、URL 正規化失敗、不正候補、縮退状態を記録する診断情報。

## Notes

- `DocumentCanonicalUrl` は note page navigation URL ではない。
- `SearchStateUrl` は document identity ではない。
- Snippet は text segment と match segment の構造として扱い、HTML string を信頼境界として渡さない。
