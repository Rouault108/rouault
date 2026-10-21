# Reading Position Contract

## Status and ownership

Normative。通常リンクは先頭、明示見出しリンクは見出し、Back/Forwardは履歴entryの最後のroot viewport位置へ戻る。router coreはscroll/focusを所有しない。`ReadingPositionController`をpost-render ownerの配下に置く。

## Identity and state

`src/navigation/history-entry.ts`の共通writerをrouter、TOC/hash、tabs、searchが使う。`history.state.__rouaultHistoryEntry = { version: 1, id }`のIDはopaqueであり、pushでは必ず新ID、replaceではcurrent entryのIDを維持する。同一URLのpushも別ID。router pushのstate省略は空record、replace省略はcurrent state、明示stateはそのrecordを採る。featureはcurrent stateを採る。他fieldを保持し、既存`__routerUrl`は実URLに合わせる。

null/undefinedは識別可能。primitive、array、Date、未知version/不正shapeの予約fieldは包み直さず保全して未管理へ縮退する。本来のHistory API失敗はrollback対象であり、stateを捨てて再試行しない。observer例外は成功History APIを失敗に戻さない。

native fragmentはbrowser生成stateを採用し、離脱元stateを複製しない。未識別hash entryの補記はreplaceのみでentryを増やさない。native push/replaceの一般的な判別と旧ID継続は保証しない。観測はcapture側で一元分類し、popstate後のhashchangeで二重採用しない。

## Positions and precedence

保存は同一runtimeのメモリだけ。sessionStorageによる独自reload復元（提案P）は採用しない。root viewportの有限非負x/yをCSS pxでentry IDとexact URLへ結び付ける。URLだけをkeyにしない。sidebar、dialog、code/table railのscroll、last focus、semantic anchorは対象外。

passive scroll、History API直前、最初の本文mutation直前、pagehideで現在の読書位置を採る。popstateでは離脱entryをcontrollerが保持し、その直前sampleを使う。未表示の中間entryへ旧文書の座標を書かない。traverse候補は受理時に凍結し、clampや初期tabsの正当な同entry normalizationでは座標を置換しない。

明示見出しの目標は、見出しのdocument座標から同documentのroot scroll-padding-topと見出しscroll-margin-topのcomputed値の和を引き、rootの到達範囲へclampする。ReadingとTOCは小さなCSS読取primitiveを共有し、TOC側の遅延再scrollで直アクセスを補正しない。保存XYの候補を持つtraverseとnative採用のreload/history初期表示は、このhash目標で上書きしない。

新規link/APIはhash/topへ進み、以前の同URLの座標を流用しない。traverseは保存座標をhashより優先する。管理entryでrecord欠落/不正/URL不一致ならhash、なければ先頭。state-onlyの新規hash不存在は現在位置を保持する。error/not-foundは先頭と既存a11y処理を用い、成功文書のrecordをerror座標で消さない。

## Epoch, readiness and cancellation

本文childrenのcommit/rollback再生成前にhostが単調contentEpochを進める。root、URL、shellCommitIdが同じでも旧epochは再利用しない。client readinessはepoch別のpending/settled/unavailable/invalidated状態。初期SSR、成功full commit、成功rollbackだけが一度hydrateされ、state-onlyは同epochの準備を引き継ぐ。旧epochのmodule await/TOC activation内側await/ready通知を破棄する。

post-commitはjobを予約して戻り、hydration-readyをawaitしない。jobは現epochの初期準備、復元位置より上の寸法未確定画像、loading fontを待ち、rangeと目標が連続2frame安定して実座標が±2 CSS pxなら完了。5秒を上限に到達範囲へclampして打ち切る。将来のvisible/interaction enhancementやSearch Worker結果へ追従しない。

成功full commitの通常hashなしnavigationは、履歴成功・管理entryのbinding採用後、本人取消・復元候補がなくcurrentなjobに限り、最初の準備待ちより前にroot先頭を適用する。最初の適用だけではsettledとせず、同じjobで上記の準備後の安定化と取消を維持する。initial/native/traverse、state-only、error/not-found、hashあり（対象不存在も含む）はこの先行適用の対象にしない。

本人のwheel/touchmove/scroll key/Tab・Shift+Tab/pointer操作、新navigation、本人のTOC/tabs/search操作（URL no-opを含む）、pagehide/disposeで旧jobを取り消す。取消後にhash/top fallbackやfocus奪取をしない。featureはattach時のsource epochとdisplayed/address bindingをURL読取・projection・書込・await後に検査する。feature writerはtokenをHistory API直前に再照合し、成功API直後に新binding/tokenを採用する。after observerで失効した場合も成功entryを維持し、旧scroll/focus/projectionを続けない。TOC settle、tabs再同期、Search結果もcaptureしたtokenを再照合する。Back待機中の旧本文を根拠に宛先URLを正規化しない。本人feature intentは旧未commit router requestを失効し、automatic initialization/normalizationは現intentを維持する。

## Browser and accessibility

失効結果はfeature writerから呼出し元へ伝える。tabs enhancerは失効後にindicator更新、tab railのscroll、`ui-tab-change`を続けず、URL normalization後の通知も再照合する。TOCの失効clickは既定動作を抑止したまま`owned:false`を返し、mobile panelのcloseとtriggerへのfocus復帰を実行しない。成功したhistory書込や、失効前の正当なprojectionをrollbackしない。

管理entryはmanual、opaque/ID補記失敗は明示auto。reload/back-forward初期表示は明示autoでbrowser位置を尊重し、独自top/hashを実行しない。native initial intentの同期通知もautoを維持し、load後の採用frameが済んでから管理entryをmanualへ戻す。native fragmentはautoでnative actionを保ち、同intentの次frameでmanualへ戻す。fallback/pagehideはflush・取消してautoへ返す。BFCache再開はDOM/epochを再生成せず現viewportを採用する。disposeは自分のmodeが残る場合だけ元値へ戻す。beforeunload listenerを追加しない。

full commitのmain focusはpreventScroll。state-only／same-documentの履歴移動では、読書位置ownerがfocusを変更せず、browser標準動作に任せる。browser自身がfocusを変更する場合も、appによるlast focusの保存・復元を追加しない。座標優先中のTOCはhash holdを再作成せず、activeTracking=trueだけがviewportのcurrentを追跡する。falseを新しいscroll追跡へ変更しない。本人の新しいhash/TOC操作とmobile panelの正当なfocus returnは維持する。

## Approved native-behavior adjustment

2026-10-10承認。設計v3のsame-document Backの「focus保持」は、appがfocusを動かさずbrowser標準動作に任せる方針へ調整した。独自focus保存・復元は追加しない。P保留のreloadは元からnative尊重であり、reload前の座標へ必ず戻るという保証を追加しない。

- A7：同じfixture・履歴URL/state・focus対象のnative対照と比較し、appのfocus/blur呼出しがないことをassertする。full commitのmain focus、管理entryの保存座標±2 CSS px、hashchange／resize／TOC refresh後の座標とcurrentの検証は維持する。
- A8：同じfixture・履歴操作・viewportのnative reload実測位置と±2 CSS pxで比較する。managedのmanual→load時auto→採用後manual、opaqueのload時・採用後auto、state保全、entry数、appのtop/hash scroll呼出しなしをassertする。primitive・array・未知versionは独立caseで実施する。browser名ごとの固定座標、許容幅拡大やskipで通さない。

reloadのnative対照はapp moduleをmode handoffだけのscriptへ置き換える。両者のreload前manual、pagehideでauto、module時点でauto、load後の採用frameでmanagedのみmanualを揃え、同じHTML/CSS・URL/state・viewport・字体/range・前面化条件で実測する。対照にscroll、focus、座標保存・復元を追加しない。JS無効でautoを維持した別modeの対照を、管理entryからのreloadと同等と扱わない。no-JS baselineは独立したA9で引き続き検証する。

試験ではroutingによるHTTP cache無効をapp・全対照で揃える。init時点の継承modeは両者の一致を確認し、browser名による固定値を要求しない。bootの最初の明示auto、load時auto、採用後のmodeを検証する。parse/load中の観測でlayoutを強制せず、mode/readyState/時刻を記録し、座標・字体・rangeはload後に字体loadedを含む安定条件で測る。

## Verification

A1通常/hash移動、A2entry座標復元、A3同URLの別entry、A4state/native互換、A5遅延/epoch、A6本人取消/stale feature、A7focus/TOC、A8native/reload/fallback/clamp、A9既存owner/transaction/SSRをnode/browser/production E2Eで検証する。新E2EはChromium・Firefox・WebKitに明示選択する。BFCacheはpersistedを観測したrunのみ成功判定する。正式環境未実施を互換browserの結果で置き換えない。

## Content transition boundary

通常の対象navigationでは、既存post-commitのpreventScroll focusと、`ReadingPositionController.schedule`開始時のhashなし先頭適用までをView Transition更新callback内で実行する。新snapshot取得前に反映するが、content readinessと最大5秒の安定化は引き続き非同期jobでありcallbackは待たない。coordinatorはscroll/focus/announcementを複製せず、intent取消・contentEpoch・shellCommitId・entry bindingの所有権を変更しない。演出終了はnavigation完了条件にしない。対象判定と失敗意味論は[Router Contract](router.md#content-transition-integration)を参照。

配置変更を伴う既知note/tag/discovery間でも、履歴成功・binding採用・preventScroll focus・通常先頭適用を同じ更新callback内に保つ。shell配置の変化を理由に別のscroll writerや復元待機を追加しない。HookdeckのWindows Chromeでの履歴fadeに関するユーザー観察と将来目標は[Content navigation motion](../design-system/patterns.md#content-navigation-motion)を参照。

### 履歴表示の共通判定

保存したraw XYの先行適用と、以下の演出判定は別契約とする。正常な同期full traverseでは、受理済みreceiptが本文・shellの同期prepared commitを事前に保証し、built-in hostの同期post-commitから呼ばれた場合だけ、既知table railの幾何準備、preventScroll focus、Readingによる保存XYの適用と実XY/rangeの確認を最初のreadiness待機より前に行う。entry/exact URL/intent/root/epoch/shell/bindingの一致、abortと本人介入、mutation/recoveryの抑止を適用前後で照合する。位置のwriterは同じReading jobだけとし、clampや未成立時も保存candidateを失わず既存の通常復元を継続する。

`data-reading-position-prepaint=applied`は現在DOMで保存XYへ到達したことだけを示す。過去と同じ行の画面位置、後発font/image/任意hydrationによるshift皆無、fadeのreadyを意味しない。raw XYに全表の内容・全font・全行geometryの同一性証明を要求しない。表は幾何準備と操作有効化を分け、準備した同じrailを後のactivationが採用する。main/tableは通常表示と操作を保ち、準備だけのrailは操作面として公開しない。一般のhydration完了・fonts.ready・Animation finishedを同期区間で待たない。8msや16ms以内、native layout途中の中断は保証しない。

通常移動、保存candidateのないhash、state-only、error/not-found、初期/reload、native/BFCache、未知または非同期adapterの経路はこの先行処理の対象外とし、既存の規則を維持する。描画前保証は事後のPromise判定から推定しない。対象のproduction prepared commitとhost処理の同期性を契約として明示し、詳細は[Router Contract](router.md#commit-acceptance-and-recovery)に従う。

全ページのBack/Forwardを候補にし、ページ名・URL prefix・移動方向によるallowlistを持たない。候補になることと、演出が実際に適用されることは異なる。正常な別文書traverseの復帰先entry自身について、保存時の検証済みshell profileと現在のprofile、exact URL・entry ID・本文版・使用字体・viewport・main/本文要素/読書アンカー/rangeの実幾何を照合する。離脱元と復帰先でsidebar、TOC、本文幅が変わっても、復帰先の保存時配置が再現されていればよい。hash/queryを含むfull traverseも保存座標優先とし、URLからそれらを捨てない。

同じReadingPositionJobが、固定のNavigationCommitReceiptとbinding/root/entry/URL/epoch/shell/intentを再照合し、最初のawaitより前に保存座標を適用する。raw XYを既に適用している場合は同じ座標を書き直さない。実座標と読書アンカーが±2 CSS pxで一致した場合だけ`historyPresentationEligibility=ready`とする。これは演出用の位置証明でありAnimationがactiveであることを意味しない。content readinessと最大5秒のsettledは同じjobが継続し、表示の成否でcandidate/restoring状態を早期解放しない。後から復元できただけの経路を、最初の表示位置まで証明済みとしてreadyにしない。

本文はmain全体から判定し、見出し数、固定ID、単一proseを要求しない。見出しがなければparagraph等の近傍要素を、IDとrootからのelement pathで識別する。複数proseや静的discoveryページも同じ判定を使う。TOCのactive weight差を比較から外す場合、desktopでは独立2列grid、宣言された実track、sticky列、固定高さ予約とoverflow制約を要求する。computed `--note-toc-track`は正のpxまたは`clamp(rem, vw, rem)`をrootのcomputed font-sizeとviewportのCSS pxで解決して実第2trackと照合し、DPRは掛けない。未解決・未知の式・非正/非有限値・逆転clampは許可しない。640 CSS px未満では、既知TOCがstatic配置・高さ0・全子孫の実boxが0で、shellが正の単一grid trackを持つ場合だけ許可する。body配下のTOC panelもすべてhidden/inert/aria-hiddenかつ実boxが0であることを確認する。640〜1023 CSS pxのTOC配置は独立性を未証明として縮退する。TOCがないページへこれらの条件を課さない。

| 条件                                                                          | 共通判定と縮退                                                                                                                     |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 静的本文・既知のnote-static-surface（tableなし）                              | 本文/使用font/全幾何が一致した場合に先行復元候補                                                                                   |
| 画像                                                                          | 読込完了、natural寸法、正のwidth/height属性と実used boxがあり、未知enhancerがないものだけ候補。pending/broken/寸法未確定は演出なし |
| font                                                                          | 使用するfontと実文字列のloadを確認。loading/未知の切替は演出なし。後発loadingはactive演出を取消                                    |
| table/code/tabs/search結果/preview/video/広域enhancer                         | 実mutation scopeを安全と証明していないため演出なし。triggerが画面下でもroot全体を検査し、既存の準備・位置安定化を継続              |
| 進行中・pending/paused animation、SMIL、未知custom element/初期化             | 幾何の安全未証明として演出なし。検証済み独立TOCのlinkにあるcolor単独のCSS transitionだけは本文幾何を変えないため許可               |
| sourceとdestinationの配置変更                                                 | destination entryの保存profileと実DOMの一致で判定。幅や位置は補間しない                                                            |
| viewport/font/内容版の変化、range不足、証跡欠落                               | 演出なしで既存復元へ。仮clampをreadyとは扱わない                                                                                   |
| 同一文書/state-only、初期/reload、BFCache、error/not-found、document fallback | 新しい履歴演出なし。既存の座標/hash/native規則とfocus契約を維持                                                                    |
| reduced motion、WAAPI未対応/失敗、hidden、UA演出true/情報未提供               | appの演出なし。証明済み座標の先行適用と通常settledは妨げない                                                                       |

演出なしの縮退では復元途中の可視ジャンプがないことまでは保証しない。本文の非表示、inert、入力遮蔽、無期限待機でそれを隠さない。未知の動的ページを後からfadeするだけで成功とは判定しない。

passive scrollは座標保存だけを行い、幾何証跡は120msの集約と離脱境界で採る。popstateではaddressが先に変わるため、まだ表示中のroot・contentEpoch・displayed entry/URLとmutation/recovery状態を明示的に検証して旧DOMを採る。manual復元を所有中であれば、scroll event未配信の同task離脱も実座標を同期採取する。この座標保存はshell幾何証跡の有無と独立し、autoではUAの先行復元を旧entryへ混ぜないよう最後のsampleを維持する。未知ownerや旧epochでは採取せず、保存candidateを別entryに転用しない。証跡は最大32 entry、1本文2,000要素/128,000文字までとし、超過・evictionは座標台帳を消さず演出なしへ縮退する。

静的本文が表示されている間、contentEpochごとに一度だけ、実際の文字列とcomputed fontを使って未読込字体を非同期に準備する。待機はabortまたは1秒で打ち切り、完了後も同じroot/epochと通常の保存条件を再確認する。commitや位置復元はこれをawaitせず、DOMや座標も変更しない。フォントの準備が間に合わない離脱は通常の演出なし復元へ戻す。

本文の破壊的更新は、旧root/epochの`before-mutation`で離脱座標のcheckpointと位置job/演出の取消、保存抑止を先に確立する。その後、新epochと`mutation: true`を設定して`mutation`を通知し、hydrationの取消・enhancerの後始末へ進む。後始末で検索form等が隠れてrangeが縮んでも、その座標を旧entryへ再保存しない。state-onlyではこのphaseを発生させず、rollback中の半更新DOMも保存しない。

HistoryPresentationCoordinatorは位置を書かず、mainと読書アンカー、固定owner、Animationだけを所有する。opacity 0.82→1、180msで表示し、finishedをnavigationや位置jobの完了条件にしない。新intent、Back/Forward、本人入力、root/anchor破棄、幾何変化、font loading、pagehide、dispose等で取消す。後続位置補正は取消→通常表示→job再照合→scrollの順序を守り、旧finished/旧jobは新sessionを取消さない。フォントの`loading`通知は現在の`document.fonts.status`が`loading`の場合だけ取消理由にし、完了後に遅配された通知で現在のsessionを取消さない。幾何不変のTOC投影だけで一律に取消さない。任意の外部DOM/CSS変更が検出前に一度も見えないという保証は追加しない。

### 受理と回復の境界

Router/ContentCommitterのimmutable受理記録は[Router Contract](router.md#commit-acceptance-and-recovery)が所有する。binding採用に失敗した内容はcommitted/degradedかつrecoveryRequiredとし、成功通知・新hydration・focus・位置書込を開始しない。ReadingPositionControllerは共有recovery状態を保存前・job実行前・native/BFCache採用前にも検査し、未消費candidateと保存抑止を維持する。回復前の旧bindingと新DOMの座標をどのentryにも保存しない。

この実装の回復方針は、次のcurrent navigationを既存document navigation fallbackへ委譲すること。同entryへの自動binding再構築を試みず、失敗した旧receiptを新entryへ採用しない。fallback失敗やsupersedeでも保存を勝手に再開しない。新document初期化が整合状態を作る。第4版の自動再構築案全体の採用ではない。

sidebarの実体保持は[Sidebar State Contract](sidebar-state.md#6-transactionとfailure)の独立条件で決まる。全ページ候補化は、全surfaceのDOM差替えをまたぐ押下保持や、未知のbranch差分の部分更新を保証しない。

## Native位置の観測通知

Readingはnative初期分類と実位置採用を分けてPostRenderへ通知する。通知先の例外は位置処理から隔離し、nativeにcommit receiptを捏造しない。pagehideで位置sequenceと旧load/rAFを失効させ、pageshowは新たに観測する。TOCの検証やrollbackでXYが変わった場合も独自scrollを追加せず、実座標を採り直す。TOCの表示成否と位置復元結果は別に扱う。詳細は[TOC source session ADR](../adr/toc-source-session-native-observation.md)。


### hashを持つ同期full traversalの先行復元

traverse intentで既存のfrozen-or-store選択を一度だけ実行する。schedule前の読取専用qualificationは、現在のhistory entryと元receiptのentry・exact URL、candidateIdと候補の妥当性を使う。離脱元のrenderedIdを使わず、storeを再読込しない。hashの新しい表幾何準備には妥当なcandidateが必要であり、従来のhashなし準備はcandidateなしでも継続する。raw XYの先行適用にはどちらもcandidateが必要となる。

同期区間は、candidate照合→操作を有効化しない表幾何準備→preventScroll focus→owner再照合→range確認→2 CSS px外の場合だけ保存XY適用→TOC通知→owner・XY・range再照合の順とする。hashが古い・存在しない場合も保存XYを優先する。この区間へawait・rAF・timer・新しいloopを追加しない。focus等から同期navigationが起きたら、新ownerを取消し得るscheduleへ進まない。

raw座標への到着（既に整列済みも含む）、TOC通知後に受理した位置、演出用の検証済みgeometryは別々に扱う。appliedと通知済みの証拠は通知後のXY/range照合を通った時だけ確定する。同ownerの座標/range変化やTOC例外は証拠を失効させ、最後に有効だった受理位置を使って通常補正時の再通知を判断する。raw失敗だけでは独立したgeometry検証経路の通知・成功を消さない。ownerを失った場合は新rootのstatusを変更しない。

表幾何準備・前の準備のabort・cleanupを同じ例外境界に置く。同ownerの失敗では受理済み本文とcandidateを保全して既存のreadiness/最大5秒の安定化へ渡す。owner喪失後は新ownerの準備を後始末しない。仮clampをraw成功とせず、初期load・reload・state-only・BFCache・通常link・errorは従来の位置規則を維持する。本人介入と既存deadlineの意味は変更しない。
