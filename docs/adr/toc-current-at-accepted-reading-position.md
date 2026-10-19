# 受理済み読書位置におけるTOC現在地の同期

日付: 2026-10-18。対象baseline: `78dd121f39996d4ec6681cea7d69432a8f7fd614`。

## 問題と採用判断

通常のSPA遷移と文書を入れ替えるBack/Forward では、本文の位置適用後もTOCの初期化が先頭を公開し、次のviewport更新まで現在地が遅れていた。mobile cloneとruntimeにも途中状態が伝わっていた。

位置の所有者は`ReadingPositionController`のままとする。PostRenderが同期callbackを注入し、raw XYの受理後・verified geometry判定前、通常移動のtop受理後、遅延位置補正の受理後にTOCの同期を要求する。XYが既に一致していても初回同期を行う。元の固定receiptを渡し、現状から新たなreceiptを構築しない。ReadingはTOC実装をimportしない。

## TOCの一回の処理

`readTocViewportSnapshot`がvisible headings・active ID・geometry witnessを一緒に算出する。初期化、通常tracker、同期処理はこの候補選択を共有する。witnessは可視見出しすべてのelement identity、rect、activation offsetを含み、候補の前後にある見出しの変化も検出する。duplicate ID、本文外のID、sourceと本文の不整合はnullとし、正当な見出しゼロと区別する。`activeTracking=false`にviewport追跡を追加しない。

`syncTocAtReadingPosition`は以下を実行する。

1. 元receiptによるmain/root・epoch・intent・entry/exact URL・shell・address/displayed bindingの所有権を確認する。TOC owner、source、controller、nav、内側のcontent rootのidentityと一意性も確認する。不正sourceを空配列へ正規化しない。
2. 既存の独立track判定を共有し、本文との幾何学的独立性を確認する。desktopは宣言済みの独立grid track・sticky・高さ予約・overflow、640px未満は閉じたmobile panelと非占有TOCを要求する。640〜1023pxは未証明としてskipする。この条件でraw XY復元は止めない。
3. 位置/rangeとsnapshotを採り、既存DOM writerでvisibility・current・densityを一度適用する。書いた属性と`is-active` tokenだけをjournalに記録する。書込中も元ownerと捕捉済みnodeを確認する。
4. 同じsnapshotを一度再計算し、候補・可視集合・隣接rect・offset・実XY/range・構造の安定性を照合する。TOCはスクロールも収束ループも行わない。

結果は`accepted`、`skipped`、`rejected-before`、`rejected-after`、`superseded`。mainの`data-toc-position-sync`に記録し、本文位置の`data-reading-position-prepaint`と分離する。rawの過去の成功を、TOC書込後の現在位置の成功証明へ転用しない。

## 例外と巻き戻し

apply・verify・rollbackの例外はTOC境界で捕捉する。Reading外側のcatchに伝播してcandidateを失わせない。同期transaction自体はruntime stateをpublishしない。

不成立時のrollbackは、同じownerが維持され、自分の書いた値が残り、元のnodeが残る属性/tokenだけを一度戻す。新root、新link、他処理の属性・class tokenには触れない。属性ごとのrollback例外も隔離する。rollback後の実XY/range を読み、Readingもcallback後に再照合する。変化していれば同じ既存位置jobで補正し、途中位置をsettledとしない。rollback成功は初回TOC同期成功として数えない。

## 遅延初期化と再更新

controllerはtrackerの最初の確定snapshotを採用してからmobile clone/購読を構築し、最初のruntime snapshotをpublishする。先頭の仮設定をpublishしない。遅延moduleの待機中にユーザーがスクロールした場合は、その時点のviewportを読む。

tracker start、controller microtask/rAF、0ms/120ms、通常refreshとscroll更新もvisible/current を一括確定する。同じ組の再書込・再公開を抑制する。hash reveal、programmatic/hash holdは既存規則を維持する。

tabsのWeakMap adapterを小さな`tabs-selection` primitiveへ抽出した。enhanced controllerの選択値だけを読み、未enhance時は全panelを候補とする。DOM attributeからenhanced selectionを捏造せず、interaction moduleのeager importを避ける。

## 適用範囲と非保証

hashless full commitが同期処理の対象。通常遷移とBack/Forward の初回表示を検証する。hash、state-only、直アクセス、reload、BFCacheは既存の位置所有者・native規則を維持し、この同期処理の全経路保証へ広げない。SSRへ無条件の先頭currentを追加せず、CSSのweight/line clampの見た目も変更しない。

currentのweight/line clampがTOC内の高さを変えるため、本文/rangeの独立性と見出しwitnessを書込後にも検査する。判定不成立は遅延初期化へ縮退する。同期処理時間やlayoutの中断、8ms/16ms 内の完了は保証しない。計測と実施範囲は検証記録に記載する。

reduced motionの全称`transition-duration: 0.01ms`は、transition未指定要素の既定`transition-property: all`により初回railを補間していた。linkとその疑似要素に`transition-property: none`を明示し、既存のTOC no-motion契約を守る。色・weight・line clampの値や配置は変更しない。
