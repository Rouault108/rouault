# Static-first / No-JS Baseline Contract

## 位置づけ

Normativeな横断契約。static-firstの設計原則と、JavaScriptが利用できない場合の保証範囲を別に定義する。Search固有のpage capability、request outcome、SSR surfaceの正本は[Search Contract](search.md)。

## Static-first

公開コンテンツ、canonical URL、主要情報構造、build projection、検索corpusの正本はbuild-time static artifactsに置く。client JavaScriptによるMiniSearch / Suzumeの計算は許容する。client runtimeを公開コンテンツの唯一のsource of truthにしない。

## No-JS baseline

JavaScriptなしでも公開本文の読解、通常anchorでの到達、主要navigation、tag / corpusによる静的探索、`/search/`からの意味のある静的探索経路を保証する。

任意query全文検索、analyzer、ranking、snippet、複合filter、runtime sort、search dialog、SPA navigationのfeature parityは要求しない。request-time serviceや外部検索sourceをNo-JS parityのために導入しない。

## Enhancement境界

JS必須capabilityが成立する前や初期化不能時には、実行不能controlを操作可能UIとして提示しない。視覚表示、sequential keyboard focus、支援技術への露出を同じ能力境界へ合わせる。visibleなままtab順だけから外す方式では満たさない。通常anchorは利用可能に保つ。

enhancementやrequestの失敗で取得済みSSR baselineを破壊しない。元の静的集合と現在queryの評価済み結果を区別する。具体的なSearchの状態遷移とbaseline identityは[Search Contract](search.md)に委ねる。

## Surface ownership

最近の更新は[Home](home.md)、corpus索引は[Corpus](corpus.md)、tag identity / route existence / count / orderingはTag projectionが所有する。Searchは静的tag navigationへの投影とcorpus索引へのlinkだけを所有し、これらの集合やpublication policyを再計算しない。render hrefは既存Site URL helperが所有する。
