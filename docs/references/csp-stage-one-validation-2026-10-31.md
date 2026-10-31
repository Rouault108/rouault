# CSP Stage 1隔離検証記録（2026-10-31）

本書は`a3c59ab2`時点の初回候補の履歴である。設計1.1提供後の補正と現行結果は
[設計照合記録](csp-stage-one-design-1.1-audit-2026-10-31.md)を参照する。
以下のstyle/base/frame候補、診断形式、設計本文未取得という記載も初回時点の状態を示す。

基点は`790625bcaff40e940b85dde96db7796a75f2b755`。契約は[Stage 1](../contracts/csp-stage-one.md)。
本記録はローカルproduction条件での検証を示し、本番観測・enforce・全訪問者の観測を示さない。

## 出力と棚卸し

`ROUAULT_SITE_ORIGIN=http://127.0.0.1:4173`、memo fixtures有効でproduction buildを実行した。
74 HTML文書、CSP候補11ルール、CSS資源参照310件を確認。HTML/CSS資源の実効originは同じloopback originのみだった。
style属性5,835件、style要素1件（404）、on属性0件、inert preview payload3件。
production media origin設定は未使用であり、本番の外部media origin検証は別gateである。

2本の実出力hashは次のとおり。

- document bootstrap: `sha256-1EyDUYVeM8lxsnqzU47dLirDNptbWx+/OTacMwiGebA=`
- chrome bootstrap: `sha256-031I+WlzUkRx4O+MjZMGyB84eT5C4HeqDEAyNdUHmFY=`

生成物は`.generated/csp/manifest.json`、`report-only.headers`、`browser-results.json`。
`pnpm verify:csp-stage1`で凍結出力・hash・fragment一致と`dist/_headers`にCSPがないことを確認した。
生成物はGit管理しない。配信用`_headers`・runner・CI workflowは変更していない。

## ローカル結果

| 検証                                                            | 結果                                                    |
| --------------------------------------------------------------- | ------------------------------------------------------- |
| production build / 既存artifact assertions                      | 成功                                                    |
| Node全体                                                        | 148 files、1,374成功、既存skip1                         |
| SSR全体                                                         | 88 files、667成功                                       |
| Chromium component                                              | 72 files、1,164成功                                     |
| CSP Node（最終差分）                                            | 6成功                                                   |
| CSP Chromium / Firefox（最終差分）                              | 各4、合計8成功                                          |
| app / Node型検査                                                | 成功                                                    |
| note link / production import / search import / link acceptance | 成功                                                    |
| lint（既存tmp scratchを除外）                                   | 成功                                                    |
| 通常`pnpm check`                                                | 既存ignored scratchのESLint parsing errorでlint段階停止 |
| CSP WebKit                                                      | 起動環境不足で未検証                                    |

lint停止対象は作業前から存在する`tmp/onboarding-browser.config.ts`、
`tmp/onboarding-dev.config.ts`、`tmp/onboarding-webkit.config.ts`。
これらはtsconfig対象外だがESLintが拾うため、`eslint . --ignore-pattern 'tmp/**'`で他の対象を検査した。
既存scratchとlint設定は変更していない。

Firefoxはexecutor内のread-only `/proc`で初回ページ生成に失敗した。
実行基盤のsandbox外で標準Firefox sandboxを維持した検証では成功した。
WebKitは`libgtk-4.so.1`、`libgraphene-1.0.so.0`、`libharfbuzz-icu.so.0`、
`libmanette-0.2.so.0`、`libhyphen.so.0`、`libGLESv2.so.2`不足で起動しなかった。
browser sandbox無効化やsystem package変更は行っていない。

## ブラウザー観測

Chromium / Firefoxの双方で以下を確認した。

- 実HTTPにReport-Only headerがあり、enforce headerはない。GET / HEADで同じpolicyを返す。
- client moduleを停止してもtheme document / chrome bootstrapがdark stateを適用し、違反eventはない。
- 未知inline scriptは実行を続け、`script-src-elem / inline / report` eventを生成する。
- Worker応答は親policyと重複せず、WASMで検索結果を返す。Catalog requestはなく、通常検索の親event / console違反はない。
- Worker対照fixtureで`wasm-unsafe-eval`と`connect-src blob:`を取り除くと、Worker自身のeventをconsoleへ投影して
  `script-src / wasm-eval / report`と`connect-src / blob / report`を両方観測できる。検索はROとして継続する。
- 404の`style-src-elem / inline / report`と、現行srcdocのinline style/script違反が見える。
  previewボタンのauthor JSはクリック後のbackgroundColor更新まで継続実行する。

WorkerのCSP通知はpage consoleだけでは取得できなかったため、BrowserContext consoleと、
対照fixtureにだけ付加したWorker event listenerで観測した。production Worker本文は変更していない。
外部report送信先は追加していない。

## 未完了ゲート

- Library設計書`libfile_fe2f0fe69ae08191a984cc021ea56448` version0（設計1.1）は、
  読取り・`prepare_materialize`ツール未提供で実ファイル照合未完了。権限拒否ではなく機能未提供である。
- WebKitでのCSP専用検証、production/media originの資源棚卸し、Cloudflare実配信でのheader合成・最終URL・404 fallback確認。
- preview契約変更、DOMContentLoaded/load/readyState fixturesとStage 0採否、既知違反解消、enforce採否。
- GitHub Actionsは既存workflowで別途確認する。CSP専用browser試験は明示実行であり、既存CIへ追加していない。

実行環境が一時切断されたが、再接続後に差分と最終8件成功ログの保持を確認した。
