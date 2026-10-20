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

全体Browser suite前の関連9 filesも192 passedだったが、重複のため1,030件へ加算しない。後発のSession試験は24 passedで、位置証明失効後のearly追跡、実shell proof経由の接続・再発行・header交換まで確認した。後発ケースを含む総数は最終CIを正本とする。通常SPA／Back/Forward初回表示の既存production E2Eも14 passedだった。既存hash回帰でnative fragmentをviewport優先にしていた問題を検出し、新しいnative-navigationはfragmentを優先するよう修正した。reloadのstale hash優先順位は維持した。

## Native reloadの対照とCI記録

runtime `8047ccdcb85ae50da3a94867e21d70603e307872`の[既存CI run](https://github.com/Rouault108/rouault/actions/runs/39240023567)では、Node 1,243 passed / 1 skipped、SSR 610 passed、3 engine Browser 3,114 passed、dev E2E 45 passed、Chromium production E2E 307 passed / 1 skippedだった。Firefox productionは189 passed / 1 skipped / 新reload試験3 failed、WebKit productionは206 passed / 8 skipped / 同3 failedで、run全体は失敗だった。deployと公開後確認は対象外でskipされた。

この3件はnative受理後の全frameをreload前の保存Yへ固定しており、[既存Reading契約](../contracts/reading-position.md#approved-native-behavior-adjustment)が保証していない条件だった。Firefoxの最初の失敗frameの保存Yとの差は上部231・中部179（retryでは178も観測）・末尾588 CSS px、WebKitは232・177・586 CSS pxだった。この差だけからUA復元が原因と断定しない。

修正した試験では、既存A8と同じmode handoffだけのnative対照を使う。HTML/CSS、URL/state、viewport/DPR/locale/UA、reduced motion、reload前mode、load時mode、採用後mode、字体/range、HTTP cache条件、前面化、load後geometry probeを揃える。TOCのnative受理以後の各frameでcurrent・viewport oracle・aria/data/class/indicator一致を引き続きassertする。reload後のapp/native双方の追加scroll呼出ゼロ、state/entry数保全、安定後のnative実XYとの既存±2 CSS px比較も要求する。保存Y、app/nativeの実測XY、字体/range/mode、初期frameは比較assert前に診断へ保存し、保存Yへ到達しないrunも値を残す。閾値拡大、browser別固定座標、skipへの置換は行わない。対照追加後のローカルChromium 3件は成功し、保存Y／app実Y／native実Yは上部0/0/0、中部424/424/424、末尾847/847/847だった（当該環境のrange 847）。独立レビューでも初期frame判定の弱化や未解決P1/P2なしを確認した。Firefox/WebKitの原因確定はこの対照で再検証し、最終結果は検証ブランチの最新CI runを正本とする。

## 独立レビュー

別担当がsource/session/tracker、nativeとshell proof、presentation、通知ストアを直接レビューした。stale pendingによる最新入力消失、DOM readback不足、surface登録の例外残留、古いsnapshotでのready確定、再構築失敗/source不正化後のready残留を修正した。最終確認で指摘された、隠した見出しの再表示による古いprogrammatic/hash hold復活と新intentの取消漏れも、candidateを純粋に保った入力境界の取消で修正した。hidden/aria-hidden双方の再現試験を含め関連61件が成功し、最終レビューで未解決P1/P2なしを確認した。

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

[計測JSON](toc-native-source-session-metrics-2026-10-19.json)と[bundle明細](toc-native-source-session-bundle-2026-10-19.json)を正本とする。runtime計測は`5f678c80`、比較baselineは`5b79cced`。その後`39d975ca`で新しいnative fragment操作の優先順位を修正し、その経路をunitとproduction E2Eで再検証した。続いて入力境界の古いhold取消を補正した（holdなしの通常入力は即return）。さらに検証済み字体の同epoch再準備を省いた。上表の経路時間計測はこの三つの補正後に再実施していない。bundle明細は三補正後のbuild7を再集計した。同じChromiumでfresh context各3回、load後に観測する同じrAF/MO oracleとCDP集計を用いた。baselineはNode static server、修正版はVite previewであり、環境・probe費用も含む。

| 観測（3回の中央値）                    |  baseline |    修正版 |
| -------------------------------------- | --------: | --------: |
| direct: load→最初のcurrent             |   104.9ms |   111.7ms |
| reload stale hash: load→最初のcurrent  |    73.9ms |    63.1ms |
| direct: document ScriptDuration        |  32.600ms |  53.227ms |
| reload: document ScriptDuration        |  23.988ms |  32.399ms |
| 通常SPA: document ScriptDuration       |  20.191ms |  36.832ms |
| direct / reload / 通常SPA: LayoutCount | 8 / 9 / 5 | 8 / 8 / 5 |

単一transactionの同期CPU、入力遅延、強制layoutの因果的な内訳は未分離である。数値から全体の高速化や無回帰を主張しない。特にScriptDurationと初期読込量には増加があり、8ms/16msの固定上限や達成保証は設けない。

entry JSは264,058→265,817 raw bytes（+1,759）。clientとrouter hostからのstatic import graphは376,727→402,875（+26,148 raw / +6,682 gzip）。全JSは548,868→563,190（+14,322 raw / +4,222 gzip）。TOC interaction moduleは遅延のままだが、source sessionとtrackerを先に使う費用が初期graphに移った。entry単体や遅延chunkの減少を総削減と扱わない。

実測のdirect/reload各3回と実BFCache中部3回、画面幅変更後の実BFCache1回は、native accepted以後の観測frameで不一致0だった。計測対象build4のBFCache acceptedはpageshowから2.5〜4.9msの観測範囲だった。中間buildには341.5msの外れ値もあり、最初のOS提示frameや全環境での即時採用は保証しない。interaction module未完了のまま離脱する実BFCacheの組合せは未測定で、合成pagehide試験と混同しない。

## 自然演出中の実入力と重複字体準備

`20c60616`の[CI run](https://github.com/Rouault108/rouault/actions/runs/39243242148)は2 attemptとも失敗した。attempt 1はWebKit header earlyの実down時刻101/99/100ms、attempt 2はmain earlyの93/161/121msが条件外だった。attempt 2ではheader/sidebar earlyもflakyだった。90msは自然180ms演出の前半境界であり、製品の入力遅延予算ではない。既存mainのCI成功だけではUA eligible=falseの非入力枝と区別できないため、入力成功の対照とは扱わない。

新しいharnessはBack前にpointerとbrowser内phase監視を準備し、同entry/epochの自然演出からbinding通知した後にtrusted down/upを送る。演出時間の変更、停止・seek、合成DOM入力は使わず、earlyの[0,90)、lateの[90,180)、一度のtrusted down/click、UI効果、位置保全を維持する。browser/Nodeの時刻、event.timeStamp、実animation時刻、longtask対応有無を判定前に証跡へ残す。途中の複数RPCを減らしたが、旧mouse.click自体は一つのclient RPCであり、move/down/upの直列配達が原因とは断定しない。

同じbinding harnessでbaselineを6件、補正前を6件、build7を6件、順次実行した。[入力計測JSON](toc-native-source-session-input-2026-10-19.json)が正本である。baselineは6成功、補正前は5成功・main early 1失敗で、通知からdownまで78.8msの区間に60ms taskが重なった。別のCDP profileではsampleCurrent→restore.finallyの字体再準備とtrackerの処理を観測した。このprofileは失敗runと別であり、60ms全体やWebKit失敗の原因を字体へ帰属させない。

直前の幾何照合が実textと使用字体を検証済みの経路だけ、最終owner/anchor/XY確認後にもfontsがloadedなら同epochの準備を充足する。新しいcache/timerは追加しない。証明不成立とnativeで連結textの準備が残り、verifiedで重複checkが消えることを実呼出しで確認した。Reading対象4件・native 7件・geometry 114件がChromiumで成功し、app/node両typecheckとlintも成功した。独立レビューに未解決P1/P2はない。

build7の最終production回帰は初回frame/native 21成功・BFCache不成立1 skip、tabs 6成功、full Chromiumで実BFCache 1成功だった。app typecheck、対象Prettier、文書spacing policy 4件も成功した。build7は実入力6件すべて成功し、main/header/sidebar earlyのdownは16.7/16.7/33.3msだった。通知→downにlongtaskの重なりはなかった。別profileのmain earlyも成功した。各1runの小標本かつprofile自体の費用もあるため、全体の高速化・入力無回帰・WebKitの解決をこの結果だけから主張しない。最新SHAの既存CI結果で確認する。過去失敗のartifact ZIP取得はredirect先でHTTP 403だったため、取得できたdecoded job logと新しい診断を用いた。証明書回避は行っていない。

## 2026-10-20: 直アクセスhashの停止位置（①のみ）

ユーザーのWindows観察では`/notes/e2e/layout-rich/#11-目的`が固定headerの下へ隠れ、TOCクリックでは見える位置へ止まった。修正対象はこの①のみ。②のhash解除Backは移動前viewportが未確定のため診断・変更せず、③のnative sidebar summaryのreloadちらつきも変更していない。別件scrollbarの`36fbe519`は取り込まず、remoteと一致した検証ブランチ`6292e864`を基点にした。

修正前のこのexecutorで、fresh directはheading上端31.609 CSS px、header下端49px、root padding 48px、heading margin 32pxだった。`window.scrollTo`のstackはReadingの`restore`を示し、`data-router-hash-target=true`とReading settledを確認した。TOC currentは`11-目的`で正しかった。TOCクリックと通常の同文書hashリンクは79.609pxへ止まるため、差はheader用paddingと同じ48pxだった。末尾の`3-まとめ`は3経路とも最大Y=733へclampした。[比較JSON](toc-native-source-session-hash-offset-2026-10-20.json)に実測・経路・試験前提を保存した。ユーザーのLibrary画像をこのexecutorのWindows実測証拠として扱ってはいない。修正後の同じChromium対照ではfresh directの追加scrollTo書込が0件で、正しい79.609pxとcurrentを保持した。

ReadingとTOCが使うCSS読取だけを`src/navigation/heading-scroll-offset.ts`へ共通化した。Readingのhash目標はdocument座標からroot paddingとheading marginの和を引き、既存rangeへclampする。既存TOCの公開parser入口はre-exportで維持した。TOCから後追いscrollは追加せず、CSS、timer、安定化loop、保存candidate優先、native reload/history採用、本人取消の規則は変更していない。

| `#11-目的`の入口               | 修正前heading上端 | 修正後heading上端 | CSS offset |
| ------------------------------ | ----------------: | ----------------: | ---------: |
| fresh direct                   |          31.609px |          79.609px |       80px |
| TOCクリック                    |          79.609px |          79.609px |       80px |
| 通常の同文書hashリンク         |          79.609px |          79.609px |       80px |
| 別文書からの通常SPA hashリンク |            未採取 |          79.609px |       80px |

新規E2Eはmotion両設定で4入口と末尾clampを独立に確認する。期待値はproduction helperを呼ばずcomputed CSSと実rect/rangeから算出し、非clampではrect.topとpadding+margin、末尾では実Y=maxYとclamp後rectをassertする。到着後のdesktop/mobile current、aria-current、data-active、is-activeと位置の維持も確認する。末尾では本人が指定したhash holdを単純な上端viewport oracleで否定しない。

修正前の確定した再現試験はBrowser 1失敗・対照4成功（48px差）、E2Eはfresh directのmotion別2失敗・対照10成功だった。試験作成中のclamp oracle、state-onlyの前提、private method呼出、SPA起点のmobile TOC待機は修正し、製品不具合と区別して比較JSONへ記録した。修正後はNode 1,251成功/既存skip 1、SSR 610成功、Chromium Browser 1,044成功、対象production E2E 19成功（新規16・既存3）。app/node typecheck、note link、production/search import boundaryも成功した。続いて保存XY、reload/native対照、取消、短文化clampと既存の初回TOC表示のproduction回帰は33成功・BFCache不成立1 skipだった。

標準`pnpm check`は既存gitignoredの`tmp/onboarding-browser.config.ts`、`tmp/onboarding-dev.config.ts`、`tmp/onboarding-webkit.config.ts`のparser-project lintエラーで停止した。これらを削除・変更せず、当該artifactを除くlintと後続集約検証を実行した。local Firefoxはpage作成時のuid_map EROFS/子process SIGSEGV、WebKitは6共有library不足で起動不可だった。正式試験の成功にもskipにも数えず、network install、host依存追加、証明書・sandbox回避を行わない。最終SHAのclean checkoutと3 engineは既存CIを正本とする。

Windows実機は未確認であり、ユーザーの現行runが合格したという記録ではない。新しいtabで検証previewのfresh hash URLを開き、通常URLからTOCクリック・通常hashリンクとの停止線を比較する。末尾は80px固定整列を要求せず、到達可能な最大Yへ止まることを確認する。reloadは保存/native viewportを尊重する既存動作として別に確認し、②・③の修正完了と解釈しない。上の10/19性能・bundle値は当時のbuildの記録であり、今回のoffset修正後の再測定値として扱わない。

## 2026-10-20: 承認後のmain統合準備

ユーザーのmain反映承認後、検証済み`b4fab915`のブランチへ最新mainの`36fbe519`をmergeする。mainを古いbranch lineageへ戻さず、共通コンパイラへの移行、memo identity/入力除外の互換修正、native scrollbarとその検証を保持する。②のBack挙動と③のsidebar summaryちらつきの追加実装は含めない。

競合は2件で、`docs/README.md`のReference一覧は双方の参照を連結し、`test/e2e/toc-active-scroll.spec.ts`はmainの完全なscrollbar試験blockと検証ブランチの完全なhash停止位置試験blockを両方残した。mainのLocator/Page importを採用し、試験条件、threshold、skip、retryは変更しない。`docs/contracts/toc.md`は自動mergeで双方の契約を保持した。新しい動作判断を要する競合はなかった。

統合treeのpackage/lock、CI設定、共通コンパイラ・build/scripts、sidebar/TOC CSSはmainと同一、native TOCとReadingのruntime sourceは`b4fab915`と同一であることをdiffで確認した。localのfrozen offline依存同期はworkspace外の既定store pathで失敗し、workspace storeを指定した試行も`rehype-raw@7.0.0`のcache不足で失敗した。後者はoffline指定でもpnpmがregistry metadata照合を試みたため、完全offlineだったとは記録しない。追加のinstallや依存宣言・lock変更は行わず、local typecheck/新コンパイラ試験のmodule欠落と製品の検証失敗を区別する。可能なlocal検査を行い、統合したexact SHAのclean checkoutを既存CIで検証してからmainをfast-forwardする。

Windows実機のfresh hash、履歴位置、scrollbar paint/drag・zoom/forced-colors確認は引き続き未実施であり、本統合やcloud CIから実機合格を推定しない。
