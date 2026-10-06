# Full Lit Removal

## Status

Decision accepted by the human-approved `rouault-full-lit-removal-migration-plan-v14-final-approved.md`. 2026-10-06に、従来未記録だった手動確認について利用者から確認済みの報告を受領した。報告範囲と既存の自動検証の対応は下記「Manual Verification Record」に記録する。この追記は手動確認の記録更新であり、承認済み計画全体の完了適合性判定を代替しない。

## Decision

note UIのdurable document DOMはbuild-timeでsemantic static HTMLとして生成する。runtime JavaScriptはplain enhancer/controllerとしてinteractionとephemeral operational stateを所有する。Tabs、Translation、Code Preview、Preview Sandbox、Videoと親内部controlsのLit custom element、Lit SSR、note DSD、Lit client hydrate supportを撤去する。非Lit shell custom elementは維持する。

HydrationSchedulerを唯一の初回起動ownerとする。routerの文書commit/rollback、URL ownership、searchのMiniSearch/Suzume Worker normal pathとCatalog failure fallbackを維持する。native final DOMを既存search projectionへ適合させる。

Tabs labelはnon-interactiveに限定する。既存directive validatorがMarkdown link等をbuild-time errorとしてrejectし、text/emphasis/strong/inline codeを保持する。native lowererは防御的assertionだけを持ち、silent textification、抽出、分離、自動修復を行わない。

## Supersession

- [Translation disclosure fallback](translation-light-dom-disclosure-fallback.md)のhostとfallback→button/dialog置換を、同一details/summaryのcanonical DOMへ変更する。
- [Tabs owned hash recovery](tabs-owned-hash-url-recovery.md)のURL優先順位とhistory semanticsを維持し、host/panel認識schemaをnative data selectorへ移す。
- [Preview visible by default](preview-sandbox-visible-by-default.md)の既定visibleとcapability policyを維持し、起動ownerをschedulerへ集約する。
- [Preview content root/stage layout](preview-sandbox-content-root-and-stage-layout.md)のiframe内security/layout境界は維持する。外側Lit hostはnative rootへ移行する。

過去ADRの本文は当時の判断Evidenceとして保持する。旧custom element API、slot/part、Lit lifecycleを現行公開契約として扱わない。未実装のTabs二相event/detail.source、Videoの新しいpublic API/role/naming等を本移行で実装しない。

## Current Contracts

- [Tabs](../contracts/tabs.md)
- [Translation](../contracts/translation.md)
- [Code Preview](../contracts/code-preview.md)
- [Preview Sandbox](../contracts/preview-sandbox.md)
- [Video](../contracts/video.md)
- [Native note controls](../contracts/note-controls.md)
- [Hydration](../contracts/hydration.md)
- [Markdown](../contracts/markdown.md)

compatibility shim、old/new parallel runtime、新規author raw HTML、content migration、search foundation変更は採用しない。

## Manual Verification Record

### 対象と確認済みの範囲

- 記録日: 2026-10-06（JST）。手動操作の実施日時そのものは未提示。
- 文書照合の基準: `main`の[`b670825b81504378f9e2dfc9f96a2c9aee2d8fe9`](https://github.com/Rouault108/rouault/commit/b670825b81504378f9e2dfc9f96a2c9aee2d8fe9)。これは文書・テストの調査基準であり、利用者が操作した環境のbuild SHAを独立に確認したものではない。
- 実装時の履歴: [`df53c45d531e57a5869caf95f0d1d60b027cbe58`](https://github.com/Rouault108/rouault/commit/df53c45d531e57a5869caf95f0d1d60b027cbe58)はsection 25のphysical mobile、real fullscreen、interactive forced-colors / reduced-motionをpassedとして記録していなかった。当時のcommit messageは変更しない。
- 利用者報告: 上記の未記録手動項目について「手動確認済み」との報告を受領した。physical mobile、real fullscreen、interactive forced-colors、interactive reduced-motionを**利用者による確認済み**として記録する。今回、記録者が再操作して合格を判定したという意味ではない。
- 証拠の粒度: 今回受領したのは利用者の完了報告。端末名、OS / browser version、対象URL / build SHA、個別の観測結果、画像・動画は未提示であり、推測して補わない。下表の確認方法は既存報告の操作内容を再現した記録ではなく、今後の再確認時に必要な最小手順である。
- 承認済みv14計画のsection 25全文は今回のリポジトリ内資料には含まれない。ここではcommitに明記された項目と現行契約・テストを照合し、section 25全項目や移行全体を包括的に合格と判定しない。

### 既存Evidenceの再利用

基準SHAの[CI run 37318804571](https://github.com/Rouault108/rouault/actions/runs/37318804571)は全14 jobがsuccessであり、`test-browser`、`test-ssr`、`test-e2e-production`、`test-e2e-dev`の実行stepもsuccessを確認した。job成功から未assertの挙動、実機操作、全テストcaseの無条件実行を推定しない。診断保存等のskipped stepをテスト合格の根拠にはしない。

以下の分類は確認責務の区分であり、同じ項目を三重に実施する指示ではない。自動テストがassertする範囲は既存の該当SHAの結果を再利用し、手動確認は実際の操作感・視認性・OS統合という残余だけに限定する。今回の文書変更ではアプリケーションやテストを変更せず、手動操作や`pnpm ui:screenshot`も新規実行していない。

| 区分・対象                                    | 既存Evidenceで裏づけられる範囲と限界                                                                                                                                                                                                                                                                                                                                                                                                 | 最小の確認方法                                                                                                                                                                           | 保存する証拠                                                                                                                      |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 既存自動検証: Tabs / Translationの状態・focus | [`tabs.browser.test.ts`](../../test/browser/tabs.browser.test.ts)はroving tabindex、manual / automatic activation、方向キー、URL/hash同期をassert。[`translation.browser.test.ts`](../../test/browser/translation.browser.test.ts)は同一DOM維持、Escape時の起点focus復帰、outside pointer、single-open、abortをassert。実OS設定下の視認性は別範囲。                                                                                  | 該当SHAのbrowser結果とassertを照合。通常状態の同じキー操作を手動で網羅し直さない。                                                                                                       | SHA、CI run / job、対象test名・結果。新しいスクリーンショットは不要。                                                             |
| 既存自動検証: no-JS / native DOM / 統合       | [`native-build-output.test.ts`](../../test/ssr/native-build-output.test.ts)、[`native-note-baseline.spec.ts`](../../test/e2e/native-note-baseline.spec.ts)、[`translation-no-js.spec.ts`](../../test/e2e/translation-no-js.spec.ts)、[`toc-tabs.spec.ts`](../../test/e2e/toc-tabs.spec.ts)が各assertの範囲でstatic本文、disclosure、native media、preview、URL / TOC統合を裏づける。390px viewportのassertは実機操作の証拠ではない。 | 該当SSR / E2E結果を再利用。DOM存在や既存no-JSシナリオを手動で重複確認しない。                                                                                                            | SHA、実行project、CI run / job、対象test名・結果。                                                                                |
| 既存自動検証・review画像: 環境別表示          | [`video-style-contract.test.ts`](../../test/ssr/video-style-contract.test.ts)等のSSRはCSS宣言をassertする。[`ui:screenshot`](../../tools/ui-check/README.md)はlight / dark、390×844 viewport、forced-colors、reduced-motion、printのreview画像を収集するが、合格判定やpixel baselineではない。静止画だけではmotion抑制を証明できない。今回、基準SHAに対応する保存画像の所在・内容は未確認。                                          | 同じSHAの画像が保存されている場合だけ該当表示をレビューする。画像未取得を取得済みと扱わない。CSSの存在確認はSSRを再利用する。                                                            | 画像を使う場合はSHA、撮影条件、画像名、レビューした状態と所見。`.generated/ui-check/`は一時出力先なので必要な画像は別途保持する。 |
| インタラクティブ確認: forced-colors           | 通常条件のキー操作はbrowser、CSS system colorはSSR、静止状態はreview画像に分担する。focus / selected / openが重なった瞬間の識別性はこれらだけでは確定しない。利用者による確認済み報告を受領。                                                                                                                                                                                                                                        | forced-colors有効で代表Tabsをキー移動・選択し、Translationを開閉、Video controls / 字幕の文字・境界・focusが識別できることを確認。既存状態機械の全ケースを再実施しない。                 | 設定条件、対象SHA / URL、選択とfocusが重なる画像、開閉の短い観測メモ。実OS確認とは条件を区別する。                                |
| インタラクティブ確認: reduced-motion          | CSS ruleや静止画は遷移中の見え方を保証しない。利用者による確認済み報告を受領。                                                                                                                                                                                                                                                                                                                                                       | reduce有効でTabs切替、Translation開閉、Videoのloading表示など実際に到達できる遷移を代表1往復確認。不要な動きの抑制と操作完了を確認し、動画本編の停止を要求しない。                       | 対象SHA / URL、設定、操作前後と遷移の短い動画または具体的観測記録。未到達状態は未確認と記す。                                     |
| 実機必須: physical mobile                     | viewport縮小や合成pointerイベントは端末のtouch、画面回転、browser chromeを代替しない。利用者による確認済み報告を受領。                                                                                                                                                                                                                                                                                                               | 実端末で代表の生成ノートを開き、Tabs選択、Translation開閉、Videoの再生・seek・長押し解除とスクロールを確認。縦横切替時の見切れ・操作不能を確認する。自動検証済みの全組合せは反復しない。 | 端末、OS / browser、対象SHA / URL、向き、操作と結果。問題があれば画像・動画を添える。                                             |
| browser / OS機能必須: real fullscreen         | [`video.browser.test.ts`](../../test/browser/video.browser.test.ts)のfullscreen testは`requestFullscreen`、`exitFullscreen`、`fullscreenElement`をmockし、要求先・ラベル・状態同期を確認する。実際の全画面遷移やnative UIの確認ではない。利用者による確認済み報告を受領。                                                                                                                                                            | 実際の画面を持つbrowserでVideoを全画面化し、controls / 字幕、終了操作、通常画面への復帰を1往復確認。API非対応環境は対応有無とfallbackを記し、対応環境の成功と混同しない。                | OS / browser、対象SHA / URL、全画面の種類、入る・出る操作と結果、必要な画像・動画。                                               |
| OS設定の伝達: forced-colors / reduced-motion  | browserのmedia emulationはCSS応答の確認に使えるが、実OS設定からbrowserへの伝達の証拠ではない。上記報告から特定OSでの確認条件は推定しない。                                                                                                                                                                                                                                                                                           | 実OSで設定を有効にした際の確認が必要な場合のみ、対応browserでmedia queryの有効化と上記の代表操作を同じセッションで確認する。既にその条件で確認済みなら別の手動試験を追加しない。         | OS設定名、browser、media query状態、代表操作結果。emulationとの区別。                                                             |

### 再確認・証拠保存の扱い

- 今回受領した確認済み報告は再実施待ちに戻さない。詳細証拠が未提示であることと、利用者が未確認であることは区別する。
- 保存すべき証拠の共通項目は、対象commit / build、URLまたはfixture、日時・timezone、環境、操作、期待結果と観測結果、結果（pass / fail / 未確認 / 非対応）、関連CIまたは画像・動画の参照。今回未提示の値を後付けで作らない。
- 同一SHA・同一条件で既存Evidenceが有効な項目は再利用する。関連実装、CSS、browser / OS、fixture、契約が変わった場合にだけ影響する範囲を再確認する。
- workbenchはshell / routerを起動しない。shell、sidebar、TOC、URL連動Tabsの残余確認は実際の生成ページを使い、fixture URLは[`note-fixtures.ts`](../../test/e2e/support/note-fixtures.ts)から解決する。
- この記録は現在の挙動を定義する新しいContractやCI gateではない。v14全体の完了適合性を判断する際は、承認済み計画全文と必要な残りのEvidenceを別途照合する。
