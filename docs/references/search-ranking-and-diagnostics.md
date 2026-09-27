# Search Ranking and Diagnostics Reference

意味論の正本は`docs/contracts/search.md`、exact profileは`shared/search/lexical-ranking-profile.json`。

## Ranking Profile

`rouault-search-v3` / `rouault-lexical-v3` / Suzume 0.9.11 S-Nを固定する。
Node生成indexをWorkerがloadし、各channelのMiniSearch順位をRRF60と固定weightで統合する。
navigateはexact title → prefix → others、exploreはexact title → others。explore prefix昇格はない。
main coreはURL検証・Q/F tag counts・AND/OR・date-desc・limit・responseを所有し、lexical再採点を行わない。

## Passage Owners

`rankingBestPassageId`はdocument fusionへの寄与、`snippetPassageId`は表示選択を所有する。
2語以上のexploreでは取得済みpassageの実表示240cp windowに全文が収まる句読点/改行unitを判定する。
全query word canonical exact共起 → 最小unit長 → passage fusion → source order → passage ID。
該当unitなしは従来ranking best、metadata-onlyはdescription/null。snippetからdocument scoreへ逆流しない。
unit surfaceの必要条件が偽ならcanonical解析を省略できるが、substring一致だけで採用してはならない。

## Failure / Diagnostics

最終union型は`shared/search/search-types.ts`、Worker failure subsetは`lexical-protocol.ts`を正本とする。

- `lexical-load-failed` / `lexical-search-failed` / `lexical-worker-failed` / `lexical-timeout` / `lexical-analyzer-unavailable`: Worker終了、単独Catalog fallback。
- `catalog-fetch-failed` / `catalog-normalize-failed`: Catalog失敗。両source不成立は`all-sources-failed`。
- storeのみ失敗は`lexical-snippet-unavailable` issueとdegraded。lexical順位・countsを保持する。
- Abort/staleはfailureへ変換せず結果をcommitしない。

## SearchReason

lexicalではtyped evidenceから確認できるtitle-exact/title-prefix/body-matchと選択済みtag-filter-matchだけを付ける。
証明できないtitle-token-coverage/path-match/keyword-matchは省略する。
`catalog-fallback`はlexical経路では付けず、成功したCatalog fallback itemにだけ付与する。
Catalogの旧metadata照合・score helperはfallback内部に限定し、新profileのfusionと混ぜない。
Catalogのdescription照合は内部型で`descriptionTokens` / `descriptionScore`と表す。
既存Catalog reason builder互換の`body-match`は維持するが、本文取得やlexical passage一致を意味しない。
source間の信頼度比較はなく、従来Catalog scoreの全候補共通加算だけを定数として保持する。

診断issueはUI文言ではない。UIやreturn-to-reading adapterは検索のscoreやsource判断を再定義しない。
