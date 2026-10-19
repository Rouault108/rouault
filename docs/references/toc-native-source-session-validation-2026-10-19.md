# Native TOC source sessionの検証記録

baselineは`5b79cced2392842ff3c9c7a6d6f0e81d517df1f8`。公開済みSPA／履歴修正の検証結果を今回の実装済み根拠には使わず、[新設計ADR](../adr/toc-source-session-native-observation.md)に対応する試験を追加した。

## ローカル検証

- Node: 136 files、1,243 passed / 1 skipped。既存skipを合格へ含めない。
- SSR: 84 files、610 passed。初回実行はfixture buildの生成済みmemosと通常sourceの不一致で1件失敗し、通常content codegen後に全件再実行して成功した。実装やテスト条件の回避は行っていない。
- Browser Chromium: 71 files、1,030 passed。新規store/session/native/shell proofと既存Reading/controller/header/tracker/transactionの全体回帰を含む。
- app/node typecheck、production import boundary、ESLint（既存gitignoredの`tmp/**`を除く）は成功。CI・依存・ignore設定は変更していない。
- 新規production E2E: Chromium通常runnerで7 passed / 1 skipped。direct module遅延と途中scrollをmotion両設定、stale hashを持つreload上部/中部/末尾、direct fragment、合成pagehide後の通常観測を検証した。BFCache不成立のcaseはskipし、成立成功へ混ぜない。full Chromiumを別起動した実BFCache試験は1 passed（persisted=true）。

受入試験は次を含む。

- 登録前の副作用なし、接続中のregistry再入、earlyからpresentationまで同じtracker。
- 通知中のA→B→C、strict非downgrade、新sequence後の旧callback、pagehide後の通常viewport再読。
- 個別subscriber・即時replay・診断の例外隔離、登録別cleanup、古い外側通知の停止、同semantic stateの再通知抑止。
- 初期refresh、個別followup登録の例外、予約flagの回復、再activationでtimerを再登録しないこと。
- 途中write/verify/rollback例外、他処理の属性保持、DOM readback、rollback後XY変化、surface接続例外後の再試行。
- mobile link検証前の非公開、古いsnapshotでreadyにしないこと、再構築失敗/source不正化時のready=false、新ownerを旧leaseが上書きしないこと、同runtime IDのheader再接続replay。

全体Browser suite前の関連9 filesも192 passedだったが、重複のため1,030件へ加算しない。後発のSession試験は20 passedで、位置証明失効後のearly追跡、実shell proof経由の接続・再発行・header交換まで確認した。後発ケースを含む総数は最終CIを正本とする。通常SPA／Back/Forward初回表示の既存production E2Eも14 passedだった。既存hash回帰でnative fragmentをviewport優先にしていた問題を検出し、新しいnative-navigationはfragmentを優先するよう修正した。reloadのstale hash優先順位は維持した。

## 独立レビュー

別担当がsource/session/tracker、nativeとshell proof、presentation、通知ストアを直接レビューした。stale pendingによる最新入力消失、DOM readback不足、surface登録の例外残留、古いsnapshotでのready確定、再構築失敗/source不正化後のready残留を修正し、最終レビューで未解決P1/P2なしを確認した。

## 実施上の制約

ローカルFirefoxはbrowser session timeout／content process異常終了、WebKitはOS共有library不足で起動できず、実行0件を成功にもskipにも数えていない。OS依存追加や証明書設定変更は行っていない。既存CIの正式な3 engine環境で結果を確認する。

rAF/MOのgeometry観測はlayoutを強制し得る。Reading起動前のOS提示frame、実機Safari/iOS・高DPR・任意後発layoutの保証とは区別する。BFCacheは`pageshow.persisted=true`のrunだけを実成立とする。native採用の前後、またはmodule遅延中に離脱する全組合せの初回表示保証を主張しない。

## 再実行入口

```sh
pnpm run test:node
pnpm run test:ssr
ROUAULT_BROWSER_TEST_BROWSERS=chromium pnpm exec vitest run --project browser-chromium
pnpm exec playwright test history-scroll-restoration.spec.ts --project chromium-integration --grep 'native TOC source session' --reporter=line
```

production E2Eは既存のfixture build/server入口を使う。生成物を変更するunit suiteとproduction計測を同じdistで同時実行しない。

## 性能とbundle

[計測JSON](toc-native-source-session-metrics-2026-10-19.json)と[bundle明細](toc-native-source-session-bundle-2026-10-19.json)を正本とする。runtime計測は`5f678c80`、比較baselineは`5b79cced`。その後`39d975ca`で新しいnative fragment操作の優先順位を修正し、その経路をunitとproduction E2Eで再検証した。時間計測はこの補正後に再実施していない。bundle明細は補正後のbuild5を再集計した。同じChromiumでfresh context各3回、load後に観測する同じrAF/MO oracleとCDP集計を用いた。baselineはNode static server、修正版はVite previewであり、環境・probe費用も含む。

| 観測（3回の中央値）                    |  baseline |    修正版 |
| -------------------------------------- | --------: | --------: |
| direct: load→最初のcurrent             |   104.9ms |   111.7ms |
| reload stale hash: load→最初のcurrent  |    73.9ms |    63.1ms |
| direct: document ScriptDuration        |  32.600ms |  53.227ms |
| reload: document ScriptDuration        |  23.988ms |  32.399ms |
| 通常SPA: document ScriptDuration       |  20.191ms |  36.832ms |
| direct / reload / 通常SPA: LayoutCount | 8 / 9 / 5 | 8 / 8 / 5 |

単一transactionの同期CPU、入力遅延、強制layoutの因果的な内訳は未分離である。数値から全体の高速化や無回帰を主張しない。特にScriptDurationと初期読込量には増加があり、8ms/16msの固定上限や達成保証は設けない。

entry JSは264,058→265,817 raw bytes（+1,759）。clientとrouter hostからのstatic import graphは376,727→401,880（+25,153 raw / +6,456 gzip）。全JSは548,868→562,195（+13,327 raw / +3,999 gzip）。TOC interaction moduleは遅延のままだが、source sessionとtrackerを先に使う費用が初期graphに移った。entry単体や遅延chunkの減少を総削減と扱わない。

実測のdirect/reload各3回と実BFCache中部3回、画面幅変更後の実BFCache1回は、native accepted以後の観測frameで不一致0だった。最終実装のBFCache acceptedはpageshowから2.5〜4.9msの観測範囲だった。中間buildには341.5msの外れ値もあり、最初のOS提示frameや全環境での即時採用は保証しない。interaction module未完了のまま離脱する実BFCacheの組合せは未測定で、合成pagehide試験と混同しない。
