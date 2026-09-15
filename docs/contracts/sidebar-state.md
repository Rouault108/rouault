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
- header enhancerはcommand sender / snapshot consumerであり、header triggerのhidden、ARIA、labelのruntime write ownerである。

## 3. DOMとNo-JS

presentの正本はpersistent root内の`nav[data-sidebar-nav]`1実体であり、absent時は0実体である。mode変更ではrootをsource hostとoverlay layer間で移し、navをclone / serializeしない。route更新だけがnav subtreeを交換する。

rootは初期openの`details[data-layout-sidebar-disclosure]`とnative summaryを持つ。branchは`details[data-sidebar-nav-branch] > summary + ul`を使う。branchの`open`だけが開閉を表し、重複する`aria-expanded`や子ulの`hidden`を持たない。group idは安定させる。No-JSでは全幅でsummary、branch、linkを操作できる。狭幅fallbackは本文の前に通常flowで配置し、0px trackにしない。

`_config.json.label`の入力は`content-config.md`、branch / page labelの投影は`note-navigation.md`、payload fieldは`../references/navigation-envelope-schema.md`を正本とする。

## 4. Generationとpresentation

共有属性のliteralは`shared/navigation/sidebar-enhancement-contract.ts`が所有する。stateとshell commit IDは同一同期turnで更新する。

| State    | 意味                                                                                                |
| -------- | --------------------------------------------------------------------------------------------------- |
| 属性なし | infrastructure未起動、初期化失敗、cleanup後                                                         |
| staged   | committed / rollback処理中。native操作だけを公開し、raw overlay stateとdescriptorを保持             |
| dormant  | matching validationが成功したabsent                                                                 |
| fallback | validated presentでnative表示を維持                                                                 |
| active   | matching validation、同generationのheader readiness、open disclosure、未engagedを満たすenhanced表示 |

activeはsummary、placement、backdrop、inert、nav操作の同期準備を済ませて最後にpublishする。staged / fallbackではroving tabindexを除去する。native操作またはnative surface内focus占有はgenerationのengaged latchとなり、同generationでの自動昇格を抑止する。成功した次generationで旧latchを破棄し、rollbackでは旧generationのlatchを維持する。

activeからfallbackへ縮退するときだけtop-level disclosureをopenへ戻す。hidden triggerや無効化されるsidebar focusはnative summaryへpreventScrollで戻す。有効なnative focusや外部focusは維持する。初期 / staged / 既存fallbackのユーザーの開閉は変更しない。

## 5. Stateと永続化

overlay preferenceとbranch expandedIdsは別storage契約を維持する。projection、initialize、rollback、fallbackの非永続collapseはstorageへ書かない。fallback overrideは同generationの保存済みexpandedより優先し、正常な次generationで失効する。

branch永続化はtrustedかつcancelされていないactivationと一致するnative toggleだけに限定する。detailsごとのepisodeは最初のopen、最後のexpected open、operation ID、generation、sourceを保持し、ToggleEventのoldState / newStateと照合する。mixed-origin、synthetic、未対応toggleは永続化しない。staged中はidentity / generation付きpendingへ保留し、matching最終validation成功時だけflushする。失敗generationのpendingは破棄する。

return-focus descriptorはheader triggerのsidebarId、同documentへ接続中のHTMLElement、またはnullである。header交換後は新headerから再解決する。通常closeはcollapse後にfocus returnを試行してclearする。stable absent / fallbackはsessionを終了するが、rollbackのprovisional fallbackだけではprevious descriptorを破棄しない。nullは保存状態やtriggerなしcommandの正常値であり、初期focusを奪わない。

## 6. Transactionとfailure

canonical snapshotはtransaction内だけで生成し、runtime expanded state / tabindex等を除去する。adapterはprevious canonical projectionとcontrollerのraw overlay state / descriptorを保持する。derived modeやphysical placement、generationを複製しない。generationと最終成功通知はContentCommitter / app shell lifecycleが所有する。

初期化失敗、abort、unexpected disconnectではlistener / observer / subscriptionを解除し、共有state属性を除去する。header readiness喪失はnative fallbackへ収束する。schedulerがactivation timingを所有し、componentによる自己起動を追加しない。

## 7. Verification

- Node / SSR: native nav invariant、root cardinality、projection、hydration budget、SSR target
- Browser: `layout-sidebar-enhancer.browser.test.ts`、controller、shell mutation、native keyboard / persistence
- E2E: `sidebar-pre-hydration-leakage.spec.ts`、`sidebar-scroll.spec.ts`、`static-header-migration.spec.ts`
- UI CheckはPhase3まで比較用のmeta / smoke ownerとして維持する。
