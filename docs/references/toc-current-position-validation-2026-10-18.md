# TOC 初回現在地同期の検証記録

設計: [ADR](../adr/toc-current-at-accepted-reading-position.md)。baseline は `78dd121f39996d4ec6681cea7d69432a8f7fd614`。数値の正本は[計測 JSON](toc-current-position-metrics-2026-10-18.json)。本記録は性能の固定上限や全経路の初回表示保証を追加しない。

## 実装の検証

- Node: 136 files、1,243 passed / 1 skipped。skip は既存テストであり合格数に含めない。
- SSR/CSS: TOC、mobile、static-first 関連の 5 files、31 passed。SSR は無条件の先頭 current を出力しない。
- Browser Chromium: Reading/TOC/filter/header bridge の関連8 files、160 passed（Reading 92、transaction 26 を含む）。transaction は複数 link 途中write、verify、rollback の例外、rollback 後XY/range、隣接rect/offset、owner交代、新link、他処理のclass/属性、invalid/empty/static/duplicate source、activeTracking=false を扱う。
- app/node typecheck は通過。`pnpm lint` は既存・gitignored の `tmp/onboarding-{browser,dev,webkit}.config.ts` が型project外のため失敗した。これらを保存したまま `eslint . --ignore-pattern 'tmp/**'` を実施して通過した。CI設定やignore設定は変更していない。

production E2E の初回表示検証は `history-scroll-restoration.spec.ts` から登録する `support/history-prepaint-toc.ts` が所有する。rAF・posttask と mobile clone 生成時に、本文の独立 oracle、desktop/mobile の aria-current/data-active/class、実際に box を持つ link の rail opacity/width/color を記録する。最初の観測を含む全 sample と120ms以降を照合し、eventual assertion だけにしない。観測自体がlayoutを強制し得るため、OSが実際に提示したframeの証明とは区別する。

production E2E Chromium は新規14件と既存回帰33件が全て通過した。通常SPAの2種類の到着先、上部/中部/末尾のBackとForward、reduced motion両設定、mobile、遅延moduleと途中scroll、TOC skip時のraw XY維持を含む。compactとexpandedの長いラベルはactive/inactiveのline clampとweightを実CSSで確認した。expanded caseは既存long-heading fixtureのsource/navをresponse内で4件に投影し、著作contentやCSSの値は変更していない。

新規E2Eは21個のJSON添付、合計752 sampleを採取した（うち731はrAF/posttask、残りはclone生成観測）。TOC skip caseを初回TOC同期成功へ混ぜない。既存回帰にはtabs enhanced/unenhancedとhidden hash、native対照付きreload、same-document/hash、no-JS、遅延font/image/table rail、A→B→C、abort/recoveryを含む。BFCacheのcaseはrunner上passedだが`pageshow.persisted=false`だったため、BFCache成立の合格とは数えない。

主な再実行入口（既存依存とfixture production buildを使用）:

```sh
ROUAULT_MEMO_FIXTURES=1 ROUAULT_SITE_ORIGIN=http://127.0.0.1:4173 pnpm build:production
ROUAULT_BROWSER_TEST_BROWSERS=chromium pnpm exec vitest run --project browser-chromium test/browser/reading-position.browser.test.ts test/browser/toc-position-sync.browser.test.ts test/browser/toc-active-tracker.browser.test.ts test/browser/toc-navigation-controller.browser.test.ts test/browser/toc-scroll-contract.browser.test.ts test/browser/layout-toc-controller.browser.test.ts test/browser/filter-visible-headings.browser.test.ts test/browser/layout-header-toc-bridge.browser.test.ts
pnpm exec playwright test test/e2e/history-scroll-restoration.spec.ts --project chromium-integration --grep 'TOC currentの最初の新本文frame'
```

## baseline との比較

headless Chromium、1440×1000、reduced motion、初回1回と warm 5回ずつの通常 SPA / Back で比較した。baseline と修正版を別 worktree・別 port で同じfixtureに対して実行した。時刻値はbrowser probeや環境負荷を含む観測値であり、因果的な高速化の主張には使わない。

| 観測                                                             |   baseline |                    修正版 |
| ---------------------------------------------------------------- | ---------: | ------------------------: |
| 通常 SPA の最初の可視観測から正しい indicator まで（warm中央値） |     44.2ms |                       0ms |
| Back の最初の可視観測から正しい indicator まで（warm中央値）     |     51.2ms |                       0ms |
| 通常 SPA / Back の不一致sample数（各5回）                        | 各run 6〜8 |                   全run 0 |
| Reading.schedule 同期区間、通常 SPA（warm中央値）                |      0.2ms |                     6.9ms |
| Reading.schedule 同期区間、Back（warm中央値）                    |      0.3ms |                     1.8ms |
| TOC callback 同期区間、通常 SPA / Back（warm中央値）             |       なし |             1.4ms / 1.5ms |
| 全 JS raw bytes                                                  |    543,204 | 548,868（+5,664、+1.04%） |
| 全 JS gzip bytes                                                 |    159,166 | 161,881（+2,715、+1.71%） |

通常 SPA の修正版 schedule は min 5.4 / max 15.2ms、Back は min 1.3 / max 2.4ms。ここから8ms/16msの制限は作らない。TOC chunk は 34,292→27,625 raw bytes となり、tabs interaction の eager import はなくなった。共有snapshot等は route 側にも含まれるため、TOC chunk単体の減少を全体削減と扱わない。正確なchunkごとの値はJSONを参照する。

別の1回の CDP trace はフレームごとのgeometry probeを外した。Layout event は両方4回、JavaScript stackのある同期Layoutは2→3回。修正版のpositionAccepted内に0.162msの追加Layoutを観測した。baselineには47.15msのLayout外れ値があり、traceの総時間を速度改善の証明にしない。これはapp全体の観測であり、TOCだけのlayout費用ではない。

## 独立レビューと制約

別agentが差分を直接読み、元receipt、通常push/traverseのentry差、所有権、rollback、callback後位置、初期再公開、reduced motionを独立レビューした。初期レビューで見つかった問題を修正し、最終レビューでは修正必須blockerなし。通常pushのentry差は比較計測で発見し、navigationのみ受理する追加回帰テストで固定した。

この環境のFirefox Browser Modeはsession接続timeout、WebKitは必要な共有library不足により起動できなかった。未実行を合格と数えない。実機Safari/iOS、Windowsの実表示・字体・高DPR・BFCache実成立は別確認が必要。BFCacheはpersisted=trueを観測したrunだけを合格とする。hash/直アクセス/reload/BFCacheは既存規則の回帰検証であり、本修正の全経路初回表示保証とは扱わない。
