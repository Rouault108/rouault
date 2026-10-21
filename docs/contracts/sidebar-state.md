# Sidebar State Contract

## 1. Status

- Type: Normative
- Source of truth: static sidebar DOM、shell adapter、plain enhancer、controller、およびbrowser / E2E契約
- Applies to: note sidebarのprojection、presentation、native navigation、永続化
- Non-goals: URL、content config、NavigationEnvelope schemaの変更

## 2. Ownership

- `BaseLayout`はhiddenを含め正確に1個の`aside[data-layout-sidebar-root]`を出力する。
- shell adapterはcanonical projectionの検証、detached parse、commit、rollbackを所有する。
- `layout-sidebar-controller`はraw overlay state、derived mode、nullable return-focus descriptorを所有する。
- `layout-sidebar-enhancer`はshell-level infrastructureとしてplacement、native / enhanced interaction、generationごとのfallbackを所有する。
- header enhancerはcommand senderであり、header triggerのhidden、ARIA、labelの単独runtime write ownerである。sidebar enhancerは同期表示切替を統括し、同じshellのheader portへ準備・確定・取消を依頼する。controller購読順やMutationObserverの通知順を表示の資格にしない。

## 3. DOMとNo-JS

presentの正本はpersistent root内の`nav[data-sidebar-nav]`1実体であり、absent時は0実体である。mode変更ではrootをsource hostとoverlay layer間で移し、navをclone / serializeしない。route更新は原則としてnav subtreeを交換する。desktopのmanagedな別文書traverseでは、ページ名・方向に依存せず以下の選択属性更新を検査し、成立時に既存nav/linkの実体を保持できる。

rootは名前を持つ`aside[tabindex="-1"]`で、外側の全体開閉用details / summaryを持たない。直下に`a[data-layout-sidebar-main-link]`、その後ろに`div[data-layout-sidebar-surface]`を置き、内部見出しと単一navをsurface内に出力する。補助linkは`href="#main-content"`、`data-link-kind="internal-fragment"`、`data-link-surface="structural"`を持ち、surface交換 / rollbackで交換せず、navのroving / typeahead対象にも含めない。linkは基本表示 / fallbackと固定表示で可視で、focus中に幅だけで消えない。active overlayでは本文導線として公開しない。固定から開overlayへの切替でlinkにfocusがある場合、`:focus` guardで表示を保ち、可視asideへ同期移動して成功確認後に隠す。移動失敗時は基本表示へ戻す。asideのfocus表示を保証する。branchは`details[data-sidebar-nav-branch] > summary + ul`を使う。branchの`open`だけが開閉を表し、重複する`aria-expanded`や子ulの`hidden`を持たない。group idは安定させる。No-JSでは全幅でbranch、通常link、可視の「本文へ」linkを操作できる。本文へは既存main targetとnative fragment navigationを使い、専用JS scrollを追加しない。狭幅fallbackは本文の前に通常flowで配置し、0px trackにしない。

`_config.json.label`の入力は`content-config.md`、branch / page labelの投影は`note-navigation.md`、payload fieldは`../references/navigation-envelope-schema.md`を正本とする。

## 4. Generationとpresentation

共有属性のliteralは`shared/navigation/sidebar-enhancement-contract.ts`が所有する。stateとshell commit IDは同一同期turnで更新する。

| State    | 意味                                                                                      |
| -------- | ----------------------------------------------------------------------------------------- |
| 属性なし | infrastructure未起動、初期化失敗、cleanup後                                               |
| staged   | committed / rollback処理中。native操作だけを公開し、raw overlay stateとdescriptorを保持   |
| dormant  | matching validationが成功したabsent                                                       |
| fallback | validated presentでnative表示を維持                                                       |
| active   | matching validation、同generationのheader port / readiness、未engagedを満たすenhanced表示 |

activeはplacement、backdrop、inert、nav操作とheaderの実効表示を同期準備して最後にpublishする。staged / fallbackではroving tabindexを除去する。native操作またはaside全域のfocus占有はgenerationのengaged latchとなり、同generationでの自動昇格を抑止する。内部のfocus維持は利用者操作と区別し、`isTrusted`だけで判定しない。fallbackで失った所有focusを修復した場合は同generationの再昇格を抑止する。成功した次generationで旧latchを破棄し、rollbackでは旧generationのlatchを維持する。

隠す切替は、sidebar ID / generation / 最新mode / root・surface・nav・header実体とfocus所有receiptの取得、資格照合、header ownerによる可視で操作可能なbutton準備、必要focus移動と`activeElement`による成功確認、再照合、placement / inert / backdrop / navと実効表示の確定、の順で同期実行する。通信、await、timer、rAFは挟まない。準備・focus移動・再照合失敗時は可視の基本表示へ縮退する。focusin等の再入は入れ子実行せず、最新要求をまとめて再評価し、取消した準備button上のfocusも保護する。

固定から閉overlayへはaside自身・nav・補助linkを含む隠す面全体のfocusをheader操作口へ先に移す。overlayから固定へはasideを先に可視・操作可にし、消えるheader button上のfocusをasideへ移してからbuttonを隠す。幅だけでheader buttonを先に消すCSSを置かず、SSRのhiddenとheader ownerの更新に従う。1024pxの既定mode境界は維持する。

fallback / 準備取消 / cleanupでは、有効な内部focusと外部focusを維持する。交換・移動・header clear・hidden / inert付与より前に捕捉した、今回失効した所有focusだけを可視asideへ`preventScroll`で戻す。後から`root.contains`で過去の所有権を推定しない。初期bodyだけを理由にfocusを奪わず、不在・休止・切断・文書navigationへの管理引渡しでは取り戻さない。surface/headerの既存DOM交換入口もこの同期窓口へ通知する。

## 5. Stateと永続化

overlay preferenceとbranch expandedIdsは別storage契約を維持する。projection、initialize、rollback、fallbackの非永続collapseはstorageへ書かない。fallback overrideは同generationの保存済みexpandedより優先し、正常な次generationで失効する。

branch永続化はtrustedかつcancelされていないactivationと一致するnative toggleだけに限定する。detailsごとのepisodeは最初のopen、最後のexpected open、operation ID、generation、sourceを保持し、ToggleEventのoldState / newStateと照合する。mixed-origin、synthetic、未対応toggleは永続化しない。staged中はidentity / generation付きpendingへ保留し、matching最終validation成功時だけflushする。失敗generationのpendingは破棄する。

return-focus descriptorはheader triggerのsidebarId、同documentへ接続中のHTMLElement、またはnullである。header交換後は新headerから再解決する。通常close / Escape / backdrop closeでは有効なreturn targetへ戻す。null / 無効の場合は外部focusを奪わず、隠すaside全域にfocusがある時だけ検証済みheader操作口へ移す。必須移動失敗時は隠さずfallbackへ戻し、descriptorは復帰判定後にclearする。stable absent / fallbackはsessionを終了するが、rollbackのprovisional fallbackだけではprevious descriptorを破棄しない。nullは保存状態やtriggerなしcommandの正常値であり、初期focusを奪わない。

## 6. Transactionとfailure

canonical snapshotはtransaction内だけで生成し、runtime expanded state / tabindex等を除去する。adapterはprevious canonical projectionとcontrollerのraw overlay state / descriptorを保持する。derived modeやphysical placement、generationをsnapshot schemaへ複製しない。保存preference、controllerのraw state（fallbackの非永続collapseを含む）、実効表示は分離し、headerは実効表示へ同期する。controller全体を二段階commit基盤にはしない。generationと最終成功通知はContentCommitter / app shell lifecycleが所有する。

共通の選択属性更新は、currentなmanaged intent・旧displayed binding・宛先entry/address・接続root/surface/navをprepare時とcommit直前に照合する。sidebar ID、scope、topology、初期展開、heading、presentation、breakpointとplacementが同じで、唯一のselected leaf、projectionのselectedId、`aria-current="page"`、hrefのdocumentが整合し、その属性だけを除いたcanonical DOMが完全一致する場合だけ適用する。href、text、子順、branch marker、未知属性など他の差は従来の全交換へ戻す。

同じ実node上の`aria-current`とrootの`selected-id`だけを更新し、runtimeのopen、tabindex、inert、style、overlay、focus、storageは既存ownerへ委ねる。成功した差分更新のrollbackも同じnode上で旧選択へ戻し、controller snapshotとgenerationの既存復元は維持する。prepare後の構造変更などで実体保持の条件が失われた場合は既存snapshot交換へ縮退する。入力待機や合成click再送は加えず、main/headerなど別surfaceのDOM差替えをまたぐ操作保証へ拡張しない。

初期化失敗、abort、unexpected disconnectではlistener / observer / subscriptionを解除し、共有state属性を除去する。header readiness喪失はnative fallbackへ収束する。schedulerがactivation timingを所有し、componentによる自己起動を追加しない。

## 7. Native scrollbar

`scrollbar-width: thin`は`[data-sidebar-enhancement-state='active'] [data-layout-sidebar-root][data-mode='fixed']`と`[data-sidebar-enhancement-state='active'] [data-layout-sidebar-root][data-mode='overlay']`のbase ruleだけへ指定する。共通root、inner nav、inactive state、No-JS fallbackへ広げない。色はUAに委ね、transparent / noneやWebKit scrollbar paintingで隠さない。

寸法、overflow、gutter、padding、overscroll、DOM、ARIA、JavaScript、link / current / focus装飾は維持する。本文、table、code、search等は対象外。既存keyboardのArrow / Endは`preventScroll: true`でfocusとroving tabindexを更新するため、Endによる自動scroll到達は保証しない。

## 8. Verification

- Node / SSR: native nav invariant、root cardinality、projection、hydration budget、SSR target
- Browser: `layout-sidebar-enhancer.browser.test.ts`、controller、shell mutation、native keyboard / persistence
- E2E: `sidebar-pre-hydration-leakage.spec.ts`、`sidebar-scroll.spec.ts`、`header-layout-contract.spec.ts`、`header-shell-integration.spec.ts`、`header-no-js.spec.ts`
- UI CheckはPhase3まで比較用のmeta / smoke ownerとして維持する。

- SSRはexact selectorのbase thin指定と、全media scopeでの色指定・非表示scrollbar・WebKit paintingの不在を固定する。
- E2EはChromium desktop projectのfixed / overlayで長いnavのoverflowとwheel / scrollTopの独立した末尾到達、clip ancestor内の全操作面とhit test、navigationを検証する。短いnavは非overflowを検証する。keyboard focus / branch開閉 / return focusとfocus ringは独立したcaseとする。
- `CSS.supports`は構文対応、computed styleはcascadeの検証に限る。light / dark / 実際に`matchMedia`で有効なforced-colorsを記録する。paint幅・色・自動非表示はUA / OSが所有する。
- Windows Edgeの実scrollbar drag、keyboard、200% zoom、theme / forced-colors / OS always-show設定とiPhone Safari touchはcloud E2Eの保証外であり、別途manual確認を要する。狭幅desktop projectをiPhone / touch検証と扱わない。

- `sidebar-scroll/group-02`〜`group-15`の補助fixtureは`chromeProfile: reader`を明示する。`kind: testing`の既定plain profileはsidebar projectionから除外されるため、reader指定で既存16 group fixture本来のoverflowを成立させる。本文やgeometry用CSSは増やさない。480px高の長いcaseは16 groupとそのwrapper branch（計17 branch）、Group01 / Group16 open時の19操作対象を前提として固定し、overflow不足をskipしない。
- 表示中の操作対象はclosed `details`のsummary以外の子孫を除外する。`getClientRects()`だけではclosed details内のtargetを末尾に数えるChromiumがあるため、keyboard / endpointの双方でnative disclosure stateを確認する。

- Static baseline E2Eは通常 / JS・manifest遅延 / manifest失敗 / No-JSの単一nav、外側summary不在、補助linkとbranchの操作保護を確認する。No-JSの390→1023→1024→1440→390でlink focusを維持し、本文scrollとfragmentによるkeyboard focus到達を別assertionで検証する。
- Browserはaside自身 / nav / 補助link / header / 外部 / bodyのfocus、null / 無効return target、header起動順、mode再入・準備取消、header再初期化、surface交換 / rollback / cleanupとstorage非汚染を検証する。DOMのrAF観測と描画captureは別の証拠とし、全物理frameや実Windows / touchをcloudだけで保証しない。
