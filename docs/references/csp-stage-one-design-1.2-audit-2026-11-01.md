# CSP Stage 1設計1.2の照合と受入条件

2026-11-01に、親が正規取得した新添付Library `libfile_82f44e95e4288191aac40a26d163d868` version 1の提供本文を照合した。
802行の3部は6.2のscript/style境界、9.2の表の途中で連続し、欠落や省略のない第1〜13章として受領した。
親が通知したファイルは`Rouault_CSP_implementation_design_1.2_2026-11-01.md`、SHA-256は`2e9166b7716eb906c8484f40130d9db0004735797afb3f312f0513c6d7647a73`である。
このexecutorにmaterialization機能はなく、consumer-local materializeや原ファイルのbyte SHA検証に成功したとは扱わない。
旧拒否対象の再取得やキャッシュによる補完は行っていない。

検証実装を止める矛盾はなかった。Stage 0全体、限定内部検証、Stage 2、実配信RO、本番enforceのゲートは別である。
最新main `1753a3ff8fd96401a60367702c2abc6cef475b22`を専用枝へ統合し、Vite 8と初期fragment処理を維持する。
本番artifactへのCSP追加、preview runner、collector、browser/container更新はこの実装に含めない。

| 項目                  | 旧条件                                   | 改訂後の検証条件と残る未達                                                               |
| --------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| Worker RO             | 実検索でconnect/WASMのイベント両方を要求 | 実検索の機能と、固定隔離fixtureでの通知を別に評価                                        |
| WebKit connect        | Worker eventのみ                         | 固定版・en-US・単一Worker fixtureのnative consoleと負対照。汎用本番帰属へ一般化しない    |
| WebKit WASM RO        | イベント待ちが失敗                       | 未観測を理由付きunmetとして保持。必須coverageは非ゼロ                                    |
| missing report-to警告 | console空期待が失敗                      | expected policyの警告を実違反と別分類。警告だけを違反にも通知成功にも数えない            |
| negative controls     | 7条件の追加診断                          | 両許可あり/無操作/模倣/不正bytes/中断/遅延と、観測器・artifact欠損を検証                 |
| 証跡                  | 最小attachmentと標準reporter             | assertion/DOM/ソース/stdoutも保存前に制限。実失敗の漏出対照を必須にする                  |
| CI起動                | app=trueの通常E2E内                      | build=trueの独立CSP matrix。記事/配信設定も起動                                          |
| 集約                  | 通常E2E失敗がci-requiredへ伝播           | 通常jobとcsp-requiredを分離し、既存ci-requiredのmerge gateと公開はcoverage successが必須 |

成功は対象能力について機能・観測経路・対照がそろった状態、未達は対照が成立しても必須通知を実証できない状態である。
観測器異常、未知文言、対照不成立、機能退行、SHA/run不一致はfailureであり、既知の未達へ付け替えない。
skip、起動不可、欠損は成功にしない。通常WebKitの成功を専用coverageへ流用しない。
歴史的CI `41254644810` / SHA `7161aa0c`はfailureのまま保持し、新しいexact SHA/runの証拠と分ける。

現在の実装は設計1.2の検証に限定した採用であり、本番RO先行やStage 0全体完了の承認ではない。
固定windowの未観測を永久の非対応とは断定しない。別Safari、ReportingObserver、長時間の高負荷、実Cloudflare配信は未検証である。
previewの初回load後ACTIVATEではDOMContentLoaded/load listenerの後登録が動かない互換性変更を後段で判断する。
人工イベントの再発火や、redirect後のpath prefixを認可境界にする方法は採用しない。

実測結果は専用runの最小artifact、engine別のcoverage理由、通常CIの結果で確認する。
判定器自己試験が成功しても、WebKit WASM ROの実測合格には加算しない。
