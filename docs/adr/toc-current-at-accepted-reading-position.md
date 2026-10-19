# 受理済み読書位置における TOC 現在地の同期

日付: 2026-10-18。対象 baseline: `78dd121f39996d4ec6681cea7d69432a8f7fd614`。

## 問題と採用判断

通常の SPA 遷移と文書を入れ替える Back/Forward では、本文の位置適用後も TOC の初期化が先頭を公開し、次の viewport 更新まで現在地が遅れていた。mobile clone と runtime にも途中状態が伝わっていた。

位置の所有者は `ReadingPositionController` のままとする。PostRender が同期 callback を注入し、raw XY の受理後・verified geometry 判定前、通常移動の top 受理後、遅延位置補正の受理後に TOC の同期を要求する。XY が既に一致していても初回同期を行う。元の固定 receipt を渡し、現状から新たな receipt を構築しない。Reading は TOC 実装を import しない。

## TOC の一回の処理

`readTocViewportSnapshot` が visible headings・active ID・geometry witness を一緒に算出する。初期化、通常 tracker、同期処理はこの候補選択を共有する。witness は可視見出しすべての element identity、rect、activation offset を含み、候補の前後にある見出しの変化も検出する。duplicate ID、本文外の ID、source と本文の不整合は null とし、正当な見出しゼロと区別する。`activeTracking=false` に viewport 追跡を追加しない。

`syncTocAtReadingPosition` は以下を実行する。

1. 元 receipt による main/root・epoch・intent・entry/exact URL・shell・address/displayed binding の所有権を確認する。TOC owner、source、controller、nav、内側の content root の identity と一意性も確認する。不正 source を空配列へ正規化しない。
2. 既存の独立 track 判定を共有し、本文との幾何学的独立性を確認する。desktop は宣言済みの独立 grid track・sticky・高さ予約・overflow、640px 未満は閉じた mobile panel と非占有 TOC を要求する。640〜1023px は未証明として skip する。この条件で raw XY 復元は止めない。
3. 位置/range と snapshot を採り、既存 DOM writer で visibility・current・density を一度適用する。書いた属性と `is-active` token だけを journal に記録する。書込中も元 owner と捕捉済み node を確認する。
4. 同じ snapshot を一度再計算し、候補・可視集合・隣接 rect・offset・実 XY/range・構造の安定性を照合する。TOC はスクロールも収束ループも行わない。

結果は `accepted`、`skipped`、`rejected-before`、`rejected-after`、`superseded`。main の `data-toc-position-sync` に記録し、本文位置の `data-reading-position-prepaint` と分離する。raw の過去の成功を、TOC 書込後の現在位置の成功証明へ転用しない。

## 例外と巻き戻し

apply・verify・rollback の例外は TOC 境界で捕捉する。Reading 外側の catch に伝播して candidate を失わせない。同期 transaction 自体は runtime state を publish しない。

不成立時の rollback は、同じ owner が維持され、自分の書いた値が残り、元の node が残る属性/token だけを一度戻す。新 root、新 link、他処理の属性・class token には触れない。属性ごとの rollback 例外も隔離する。rollback 後の実 XY/range を読み、Reading も callback 後に再照合する。変化していれば同じ既存位置 job で補正し、途中位置を settled としない。rollback 成功は初回 TOC 同期成功として数えない。

## 遅延初期化と再更新

controller は tracker の最初の確定 snapshot を採用してから mobile clone/購読を構築し、最初の runtime snapshot を publish する。先頭の仮設定を publish しない。遅延 module の待機中にユーザーがスクロールした場合は、その時点の viewport を読む。

tracker start、controller microtask/rAF、0ms/120ms、通常 refresh と scroll 更新も visible/current を一括確定する。同じ組の再書込・再公開を抑制する。hash reveal、programmatic/hash hold は既存規則を維持する。

tabs の WeakMap adapter を小さな `tabs-selection` primitive へ抽出した。enhanced controller の選択値だけを読み、未 enhance 時は全 panel を候補とする。DOM attribute から enhanced selection を捏造せず、interaction module の eager import を避ける。

## 適用範囲と非保証

hashless full commit が同期処理の対象。通常遷移と Back/Forward の初回表示を検証する。hash、state-only、直アクセス、reload、BFCache は既存の位置所有者・native 規則を維持し、この同期処理の全経路保証へ広げない。SSR へ無条件の先頭 current を追加せず、CSS の weight/line clamp の見た目も変更しない。

current の weight/line clamp が TOC 内の高さを変えるため、本文/range の独立性と見出し witness を書込後にも検査する。判定不成立は遅延初期化へ縮退する。同期処理時間や layout の中断、8ms/16ms 内の完了は保証しない。計測と実施範囲は検証記録に記載する。

reduced motion の全称 `transition-duration: 0.01ms` は、transition 未指定要素の既定 `transition-property: all` により初回 rail を補間していた。link とその疑似要素に `transition-property: none` を明示し、既存の TOC no-motion 契約を守る。色・weight・line clamp の値や配置は変更しない。
