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

全ページのBack/Forwardを候補にし、ページ名・URL prefix・移動方向によるallowlistを持たない。候補になることと、演出が実際に適用されることは異なる。正常な別文書traverseの復帰先entry自身について、保存時の検証済みshell profileと現在のprofile、exact URL・entry ID・本文版・使用字体・viewport・main/本文要素/読書アンカー/rangeの実幾何を照合する。離脱元と復帰先でsidebar、TOC、本文幅が変わっても、復帰先の保存時配置が再現されていればよい。hash/queryを含むfull traverseも保存座標優先とし、URLからそれらを捨てない。

同じReadingPositionJobが、固定のNavigationCommitReceiptとbinding/root/entry/URL/epoch/shell/intentを再照合し、最初のawaitより前に保存座標を適用する。実座標と読書アンカーが±2 CSS pxで一致した場合だけ`historyPresentationEligibility=ready`とする。これは位置証明でありAnimationがactiveであることを意味しない。content readinessと最大5秒のsettledは同じjobが継続し、表示の成否でcandidate/restoring状態を早期解放しない。後から復元できただけの経路を、最初の表示位置まで証明済みとしてreadyにしない。

本文はmain全体から判定し、見出し数、固定ID、単一proseを要求しない。見出しがなければparagraph等の近傍要素を、IDとrootからのelement pathで識別する。複数proseや静的discoveryページも同じ判定を使う。TOCのactive weight差を比較から外す場合、desktopでは独立2列grid、宣言された実track、sticky列、固定高さ予約とoverflow制約を要求する。computed `--note-toc-track`は正のpxまたは`clamp(rem, vw, rem)`をrootのcomputed font-sizeとviewportのCSS pxで解決して実第2trackと照合し、DPRは掛けない。未解決・未知の式・非正/非有限値・逆転clampは許可しない。640 CSS px未満では、既知TOCがstatic配置・高さ0・全子孫の実boxが0で、shellが正の単一grid trackを持つ場合だけ許可する。body配下のTOC panelもすべてhidden/inert/aria-hiddenかつ実boxが0であることを確認する。640〜1023 CSS pxのTOC配置は独立性を未証明として縮退する。TOCがないページへこれらの条件を課さない。

| 条件                                                                          | 共通判定と縮退                                                                                                                     |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 静的本文・既知のnote-static-surface（tableなし）                              | 本文/使用font/全幾何が一致した場合に先行復元候補                                                                                   |
| 画像                                                                          | 読込完了、natural寸法、正のwidth/height属性と実used boxがあり、未知enhancerがないものだけ候補。pending/broken/寸法未確定は演出なし |
| font                                                                          | 使用するfontと実文字列のloadを確認。loading/未知の切替は演出なし。後発loadingはactive演出を取消                                    |
| code/tabs/search結果/preview/video/広域enhancer                               | 実mutation scopeを安全と証明していないため演出なし。triggerが画面下でもroot全体を検査し、既存の準備・位置安定化を継続              |
| 進行中・pending/paused animation、SMIL、未知custom element/初期化             | 幾何の安全未証明として演出なし。検証済み独立TOCのlinkにあるcolor単独のCSS transitionだけは本文幾何を変えないため許可               |
| sourceとdestinationの配置変更                                                 | destination entryの保存profileと実DOMの一致で判定。幅や位置は補間しない                                                            |
| viewport/font/内容版の変化、range不足、証跡欠落                               | 演出なしで既存復元へ。仮clampをreadyとは扱わない                                                                                   |
| 同一文書/state-only、初期/reload、BFCache、error/not-found、document fallback | 新しい履歴演出なし。既存の座標/hash/native規則とfocus契約を維持                                                                    |
| reduced motion、WAAPI未対応/失敗、hidden、UA演出true/情報未提供               | appの演出なし。証明済み座標の先行適用と通常settledは妨げない                                                                       |

演出なしの縮退では復元途中の可視ジャンプがないことまでは保証しない。本文の非表示、inert、入力遮蔽、無期限待機でそれを隠さない。未知の動的ページを後からfadeするだけで成功とは判定しない。

passive scrollは座標保存だけを行い、幾何証跡は120msの集約と離脱境界で採る。popstateではaddressが先に変わるため、まだ表示中のroot・contentEpoch・displayed entry/URLとmutation/recovery状態を明示的に検証して旧DOMを採る。manual復元を所有中であれば、scroll event未配信の同task離脱も実座標を同期採取する。この座標保存はshell幾何証跡の有無と独立し、autoではUAの先行復元を旧entryへ混ぜないよう最後のsampleを維持する。未知ownerや旧epochでは採取せず、保存candidateを別entryに転用しない。証跡は最大32 entry。表を含まない既存経路は1本文2,000要素/128,000文字まで。表の別admissionと準備条件は次節に従う。超過・evictionは座標台帳を消さず演出なしへ縮退する。

静的本文が表示されている間、contentEpochごとに一度だけ、実際の文字列とcomputed fontを使って未読込字体を非同期に準備する。待機はabortまたは1秒で打ち切り、完了後も同じroot/epochと通常の保存条件を再確認する。commitや位置復元はこれをawaitせず、DOMや座標も変更しない。フォントの準備が間に合わない離脱は通常の演出なし復元へ戻す。

本文の破壊的更新は、旧root/epochの`before-mutation`で離脱座標のcheckpointと位置job/演出の取消、保存抑止を先に確立する。その後、新epochと`mutation: true`を設定して`mutation`を通知し、hydrationの取消・enhancerの後始末へ進む。後始末で検索form等が隠れてrangeが縮んでも、その座標を旧entryへ再保存しない。state-onlyではこのphaseを発生させず、rollback中の半更新DOMも保存しない。

HistoryPresentationCoordinatorは位置を書かず、mainと読書アンカー、固定owner、Animationだけを所有する。opacity 0.82→1、180msで表示し、finishedをnavigationや位置jobの完了条件にしない。新intent、Back/Forward、本人入力、root/anchor破棄、幾何変化、font loading、pagehide、dispose等で取消す。後続位置補正は取消→通常表示→job再照合→scrollの順序を守り、旧finished/旧jobは新sessionを取消さない。フォントの`loading`通知は現在の`document.fonts.status`が`loading`の場合だけ取消理由にし、完了後に遅配された通知で現在のsessionを取消さない。幾何不変のTOC投影だけで一律に取消さない。任意の外部DOM/CSS変更が検出前に一度も見えないという保証は追加しない。

### 静的表の準備と証跡

受理済みfull commitのpost-renderでは、固定receiptと採用済みbindingのroot/epoch/shell/entry/exact URL/intentを前後で照合し、既存`ReadingPositionController.schedule`の直前に表のrail/overflow/spacerを同期準備する。準備側は座標・focus・announcement・historyを書かず、hydration完了やfont downloadを待たない。準備失敗でも現在のownerの通常scheduleを一度実行し、受理済み本文をrollbackしない。途中で失効したownerはscheduleを再開しない。初期SSRはreceiptを捏造せず初期document/epochのownerとして同じ準備を使う。

表のprepared stateはhydration-readyではない。schedulerの既存triggerが同じgeometry/stateをactivationし、初回ResizeObserverは実差分がなければ書き直さない。操作listenerが揃う前のrailだけを非操作・支援技術への非露出状態とし、main/table本体は隠さない。activation時に同じboxを保ったままnative auxiliary regionへ戻す。後続のアプリ所有geometry書込みは、該当ownerの証跡・fadeを失効してから行う。native font/layout変化が検出前に一度も見えない保証は追加しない。

持続する表stateの所有権はcontent epoch/root/shellとactivation leaseに結ぶ。準備中のintent許可とは分離し、同epochのstate-onlyや失敗navigationで表UIを破棄しない。旧abort/queued RO/scroll/resize/echoは新stateのrail/属性/WeakMapを変更しない。清掃は実際に所有するrailだけに限定し、未知の隣接rail一括削除をしない。author IDを保持し、生成IDは同じrootで安定させる。新DOM間の比較では、永続的な生成provenanceと実railの所有を確認したID/aria-controls対だけを論理table序数へ正規化できる。他のIDREF/fragment参照、CSSによるID依存、衝突がある候補は拒否する。author IDや他の参照属性を比較から落とさない。railの既知prepared/active属性差だけを正規化する。

表の証跡は全内容・全構造・実使用fontを実DOM/epochへ結び付けて事前準備する。単純gridと証明した表だけ、全行boxと必要な全列境界、root/table/rail/spacer/range/scrollLeftの幾何へ圧縮できる。画面近傍行だけの照合、URLだけのcache利用、保存元font証跡の未検証な新DOMへの転用は禁止する。未配送mutationも確認し、font/style/viewport/内容変更、未知の表やenhancer、未完了の準備は通常復元へ縮退する。

暫定admissionはmain子孫8,192要素、表の合計1,024行/8,192cell、128,000 UTF-16文字、16font/style group、512KiB構造記録。規模以内でも証明成立を意味しない。事前作業4ms/chunkと追加同期準備/判定8msは目標であり、単一layout呼出しを途中停止できるhard capではない。超過判明時に同期保証/fadeを許可しない。通常の座標復元と表UIは維持する。

新DOMへの証跡採用は、監査済み固定CSSのdigest・実CSSOM・順序を照合できる限定profileだけで行う。sourceで全内容・全構造・全使用字体/glyphを非同期に確認し、DOMやobserverを含まない証明を最大32 entryのcheckpointへ保持する。incomingの全構造は更新callback外で準備し、その一回用fragmentを実rootへ移す。固定receipt/bindingへ結合した後、未配送mutationを含めて既知rail/ID準備差だけを許可し、新epochの証跡と監視寿命を発行する。URL/buildIdだけの一致や古いDOMの証跡の丸ごと移植では採用しない。

限定profileは通常の静的表の文字と改行、既知colgroup/col、配置属性を分類する。未知class/style/属性、特殊な継承、span、feature祖先等は対象外。全セルが同じ字体条件に従うことを監査CSSと全構造分類で証明した場合だけ、接続後の少数role照合を使用できる。表外本文の全字体確認は省略しない。祖先のcomputed値・依存token、viewport/media、FontFaceSet/loaded状態を照合し、未知stylesheet、CSSOM変更、未知mutationでは拒否する。監査済みCSS変更は固定inventoryとdigestの明示更新を要し、既存SSR/build検査で差を検出する。未監査のbasePathやdevelopment CSSは通常復元へ縮退する。

証明未完了、内容/字体/geometry不一致、同期予算超過では、表準備後も`unavailable`で通常復元へ進む。このfallbackで最初の可視位置やジャンプなしを保証しない。最終座標の正確さ、準備/activationの幾何安定と、最初の可視位置の改善を分けて検証・報告する。

### 受理と回復の境界

Router/ContentCommitterのimmutable受理記録は[Router Contract](router.md#commit-acceptance-and-recovery)が所有する。binding採用に失敗した内容はcommitted/degradedかつrecoveryRequiredとし、成功通知・新hydration・focus・位置書込を開始しない。ReadingPositionControllerは共有recovery状態を保存前・job実行前・native/BFCache採用前にも検査し、未消費candidateと保存抑止を維持する。回復前の旧bindingと新DOMの座標をどのentryにも保存しない。

この実装の回復方針は、次のcurrent navigationを既存document navigation fallbackへ委譲すること。同entryへの自動binding再構築を試みず、失敗した旧receiptを新entryへ採用しない。fallback失敗やsupersedeでも保存を勝手に再開しない。新document初期化が整合状態を作る。第4版の自動再構築案全体の採用ではない。

sidebarの実体保持は[Sidebar State Contract](sidebar-state.md#6-transactionとfailure)の独立条件で決まる。全ページ候補化は、全surfaceのDOM差替えをまたぐ押下保持や、未知のbranch差分の部分更新を保証しない。
