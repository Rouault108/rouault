# Header Theme Quiet Trigger

## Status / ID

- Type: Decision Record
- Decision Record ID: ADR-HEADER-THEME-QUIET-TRIGGER-001
- Request ID: REQ-HEADER-THEME-QUIET-TRIGGER-001
- Decision ID: D-HEADER-THEME-QUIET-TRIGGER-001
- Gate ID: G-HEADER-THEME-QUIET-TRIGGER-001
- R段階 / Aレベル: R3 / A0
- Status: Accepted
- Contract source of truth: `docs/contracts/static-header-contract.md`
- Change IDs:
  - CH-HEADER-THEME-QUIET-ADR-001
  - CH-HEADER-THEME-QUIET-DOCS-INDEX-001
  - CH-HEADER-THEME-QUIET-CSS-001
  - CH-HEADER-THEME-QUIET-TEST-001
  - CH-HEADER-THEME-QUIET-CONTRACT-001

このADRは判断記録であり、Theme triggerの現行仕様は`docs/contracts/static-header-contract.md`を正本とする。

## R / A Classification

R3:

- ヘッダーUIの視覚階層を変更するUX仕様判断である。
- static header visual contractを更新する。
- Decision Recordと反対仮説レビューが必要である。

A0:

- private/restricted Evidenceを扱わない。
- 通常のdiff、契約テスト、手動視覚確認で検証できる。
- A1/A2のEvidence保全要件は不要である。

## Context

Theme triggerは低頻度のpreference option群へのdisclosure triggerである。読書中のdiscovery affordanceであるsearchや、閲覧文脈を示すcorpusより強く見える必要はないため、visible labelを比較できるresting stateでの視覚階層を調整する。DOM、ARIA、interaction、state synchronizationは維持する。

## Evidence

- E-HEADER-THEME-QUIET-001: Theme triggerはicon、text、chevronを持ち、Search triggerはiconとlabelを持つ。Theme/Corpusはdetails root内にtriggerとpanelを持ち、panel item、selected state、open-state chevron rotationはtop-level content toneと分離されている。
- E-HEADER-THEME-QUIET-002: 現行通常色はheader root、top-level control共通record、menu item共通recordが`--fg-default`、search iconが`--fg-muted`、search labelが`--fg-subtle`であり、exact forced-colorsではsearch iconとlabelが`CanvasText`である。
- E-HEADER-THEME-QUIET-003: `--_header-control-font-weight`はheader rootが`var(--font-medium, 500)`として1件所有し、top-level controlとmenu itemの共通recordはfont ownershipを持つ。Theme/Corpus panelのnormal、selected、current stateは既知のfont-weight recordで表現される。
- E-HEADER-THEME-QUIET-004: foreground/font semantic tokenはglobal token層が所有し、`layout-header.css`は再定義しない。Static icon paintはshared `.static-icon`の`currentColor`経路が所有し、`layout-header.css`はfill/strokeを宣言しない。
- E-HEADER-THEME-QUIET-005: 既存test infrastructureにはPostCSSとselector list分割・正規化helperがある。新しい専用testでは必要最小限のlocal helperだけを同file内へ実装し、production CSSのdirect declaration recordを列挙する。汎用support moduleやselector意味解析器は不要である。
- E-HEADER-THEME-QUIET-006: hit targetは44pxで、top-level controlは`::after`でhit targetを拡張する。hover/active background、focus-visible outline、forced-colorsのfocus outlineとcontrol borderはcontent colorから分離されている。
- E-HEADER-THEME-QUIET-007: light、dark、icon-only、minimum-density、open、forced-colorsの最終視認性はV-HEADER-THEME-QUIET-004〜V-HEADER-THEME-QUIET-008で確認する。
- E-HEADER-THEME-QUIET-008: Corpusはnavigation disclosureと内部文書linkで閲覧文脈を扱い、Searchはfallback anchor兼hydrated dialog launcherであり、Themeはpreference option群を開閉するdisclosure triggerである。使用頻度のanalytics実測は主張せず、Themeを低頻度のpreference option群へのtriggerとして扱うことを本Decisionのproduct premiseとする。

`960px`、`640px`、`400px`は手動Verificationの代表観測条件であり、公開visual contractの名称や固定境界にはしない。

## Decision

- Top-level theme icon/text/chevronは通常色で`--fg-subtle`を使う。
- toneはopen/closedに依存しない。
- forced-colorsでは`CanvasText`を使う。
- visible labelを比較できるresting stateでcorpus trigger > search trigger > theme triggerを目標にする。
- Theme triggerはsearch triggerより低い視覚強度を目標にする。
- Theme triggerは低頻度のpreference option群へのdisclosure triggerとして扱う。
- Phase BはCSS、新しい専用SSR CSS契約テスト、現行contractの3ファイルに限定する。
- testはselector意味解析ではなくdirect declaration record whitelistを正本とする。

## Rejected Alternatives

- 現状維持: Themeの視覚主張を下げる目的を満たさないため棄却する。
- searchと同等の視覚強度: preference option群へのTheme導線よりsearch discoveryを優先するため棄却する。
- visible label削除: Desktop/compactで静かに意味を示すlabelを維持するため棄却する。
- opacityによる弱化: 子要素全体のpaintへ波及させずsemantic colorでtoneを表すため棄却する。
- selector family / protected selector analyzer: selector engine相当の責務をtest層へ持ち込むため棄却する。
- functional pseudo-classの意味分類: DOM matchingを完全に扱わなければfalse negativeが残るため棄却する。
- 汎用media/cascade analyzer: 現行の小さなdirect declaration record閉集合には完全whitelistの方が単純でfail-closedなため棄却する。

## Deferred Alternatives

- 保留案なし。
- light/dark/icon-only/minimum-density/open/forced-colors評価はVerificationであり、仕様判断の保留ではない。

## Counter-Hypothesis Review

1. Themeは現在状態を示すためcorpus同等でよい。
   - Rejected: corpus側はnavigation disclosureと内部文書linkで閲覧文脈を扱い、theme側はpreference option群へのdisclosure triggerである。
   - Supporting Evidence: E-HEADER-THEME-QUIET-001、E-HEADER-THEME-QUIET-003、E-HEADER-THEME-QUIET-008。
2. `--fg-subtle`では操作対象として認識しにくい。
   - Rejected as Decision: hit target、label、icon、hover、focus-visibleを維持し、forced-colorsでは`CanvasText`を使う。
   - Supporting Evidence: E-HEADER-THEME-QUIET-001、E-HEADER-THEME-QUIET-004、E-HEADER-THEME-QUIET-006。
   - Final visual confirmation: E-HEADER-THEME-QUIET-007、V-HEADER-THEME-QUIET-004〜V-HEADER-THEME-QUIET-008。
3. Searchと同等で十分である。
   - Rejected: searchはfallback anchorとhydrated dialog launcherを兼ねるdiscovery affordanceであり、preference option群への導線であるthemeより優先する。
   - Supporting Evidence: E-HEADER-THEME-QUIET-001、E-HEADER-THEME-QUIET-002、E-HEADER-THEME-QUIET-004、E-HEADER-THEME-QUIET-008。
   - Final visual confirmation: V-HEADER-THEME-QUIET-004〜V-HEADER-THEME-QUIET-005。
4. selector意味解析器を導入した方が回帰を広く防げる。
   - Rejected: DOM matchingを完全に扱わなければfalse negativeが残る。declaration record whitelistの方が小さく、fail-closedである。
   - Supporting Evidence: E-HEADER-THEME-QUIET-002〜E-HEADER-THEME-QUIET-005。

## Contract Impact

- `static-header-contract.md`へtheme triggerのquiet toneを追加する。
- 通常色はT1〜T3で`--fg-subtle`、forced-colorsは`CanvasText`とする。
- toneはopen/closedに依存しない。
- `layout-header.css`はfill/strokeを所有しない。
- ADRは判断記録、`static-header-contract.md`は現行仕様の正本とする。

## Compatibility Impact

- URL / routing: 影響なし。
- DOM / ARIA: 影響なし。
- CSS custom property: 追加・削除・名称変更なし。
- custom event: 影響なし。
- data / persistence / import-export: 影響なし。
- keyboard / focus / hit target: 変更なし。
- responsive breakpoint: 変更なし。

## Delete / Migration / Deprecation

- Delete: なし。
- Breaking change: なし。
- Migration: 不要。
- Migration失敗時: 該当なし。
- Deprecation: 不要。

## Rouault Contract Impact

低頻度のpreference option群へのdisclosure triggerの視覚主張を抑え、閲覧文脈とsearch discoveryを相対的に優先する。Rouaultの「没入して読む」体験を補強する。

## Delete / Breaking Change Gate

- Gate ID: G-HEADER-THEME-QUIET-TRIGGER-001
- 対象Request: REQ-HEADER-THEME-QUIET-TRIGGER-001
- 対象Decision: D-HEADER-THEME-QUIET-TRIGGER-001
- 対象契約: `docs/contracts/static-header-contract.md`のtop-level header visual contract
- Gate result: Pass
- 削除または破壊的変更の理由: 機能削除・互換性破壊はなく、visual contractの優先度変更だけである。
- 参照検索Evidence: E-HEADER-THEME-QUIET-001〜E-HEADER-THEME-QUIET-008。
- 既存テスト影響: 既存search、Theme/Corpus panel、chevron open-state、top-level control共通契約を維持し、新しいtheme tone recordを追加する。
- URL/routing、DOM、custom event、data/persistence/import-exportへの影響はない。
- CSS custom propertyの追加・削除・名称変更はなく、既存`--fg-subtle`を使う。
- アクセシビリティ属性・意味は変更せず、forced-colorsでは`CanvasText`を使う。
- keyboard、focus、hit target、responsive breakpointは変更しない。
- Delete、Breaking changeはなく、migrationとdeprecationは不要である。
- Rouault固有契約: 低頻度設定の視覚主張を下げ、「没入して読む」体験を補強する。
- 代替手段: 現状維持、search同等tone、label削除、opacity利用、selector意味解析器を棄却する。
- Rollback: Post-mergeではCSS、static CSS test、contractを戻し、ADRとdocs indexは残す。ADRを`Reverted`または`Superseded`へ更新してindex参照を維持する。緊急時は元commit全体をrevertする。
- Acceptance: A-HEADER-THEME-QUIET-001〜A-HEADER-THEME-QUIET-014。
- Verification: V-HEADER-THEME-QUIET-001〜V-HEADER-THEME-QUIET-010。

## Acceptance ID

- A-HEADER-THEME-QUIET-001: Theme3要素の通常色を`--fg-subtle`にする。
- A-HEADER-THEME-QUIET-002: Theme content toneをopen/closed非依存にする。
- A-HEADER-THEME-QUIET-003: Forced-colorsでTheme3要素を`CanvasText`にする。
- A-HEADER-THEME-QUIET-004: Searchの既存color recordを維持する。
- A-HEADER-THEME-QUIET-005: CorpusのN2/FT1/FW1同一Ruleによる既存共通ownerを維持する。
- A-HEADER-THEME-QUIET-006: Theme/Corpus panelのfont/color stateを変更しない。
- A-HEADER-THEME-QUIET-007: 未許可recordを追加せず、`--_header-control-font-weight`のowner/value/important/countを維持し、semantic token再定義、opacity/all/animation/animation-name/-webkit-animation/-webkit-animation-name、keyframes系AtRule、`@property` AtRuleを導入しない。
- A-HEADER-THEME-QUIET-008: Visible-label resting stateでcorpus trigger > search trigger > theme triggerを成立させる。
- A-HEADER-THEME-QUIET-009: Icon-only/minimum-densityでThemeを識別可能にする。
- A-HEADER-THEME-QUIET-010: ADRとstatic header contractのowner関係を明記する。
- A-HEADER-THEME-QUIET-011: Delete / Breaking Change GateのPassを記録する。
- A-HEADER-THEME-QUIET-012: Contractへ運用情報を混入させない。
- A-HEADER-THEME-QUIET-013: Open-stateを含む未許可color recordを追加しない。
- A-HEADER-THEME-QUIET-014: `layout-header.css`でfill/strokeを所有しない。

## Verification ID

- V-HEADER-THEME-QUIET-001: 既存static CSS契約と新しいheader専用SSR契約テスト。
- V-HEADER-THEME-QUIET-002: lintと対象5ファイルのPrettier check。
- V-HEADER-THEME-QUIET-003: typecheck。
- V-HEADER-THEME-QUIET-004: light themeのvisible-label視覚確認。
- V-HEADER-THEME-QUIET-005: dark themeのvisible-label視覚確認。
- V-HEADER-THEME-QUIET-006: icon-only/minimum-density視覚確認。
- V-HEADER-THEME-QUIET-007: theme menu open時のtone確認。
- V-HEADER-THEME-QUIET-008: forced-colors確認。
- V-HEADER-THEME-QUIET-009: ChatGPTによるdiff review。
- V-HEADER-THEME-QUIET-010: Completion Reviewとcommit/CI確認。

## Acceptance / Verification対応表

| Acceptance               | Verification                                                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| A-HEADER-THEME-QUIET-001 | V-HEADER-THEME-QUIET-001, V-HEADER-THEME-QUIET-010                                                                               |
| A-HEADER-THEME-QUIET-002 | V-HEADER-THEME-QUIET-001, V-HEADER-THEME-QUIET-007, V-HEADER-THEME-QUIET-010                                                     |
| A-HEADER-THEME-QUIET-003 | V-HEADER-THEME-QUIET-001, V-HEADER-THEME-QUIET-008, V-HEADER-THEME-QUIET-010                                                     |
| A-HEADER-THEME-QUIET-004 | V-HEADER-THEME-QUIET-001, V-HEADER-THEME-QUIET-004, V-HEADER-THEME-QUIET-005, V-HEADER-THEME-QUIET-009, V-HEADER-THEME-QUIET-010 |
| A-HEADER-THEME-QUIET-005 | V-HEADER-THEME-QUIET-001, V-HEADER-THEME-QUIET-004, V-HEADER-THEME-QUIET-005, V-HEADER-THEME-QUIET-009, V-HEADER-THEME-QUIET-010 |
| A-HEADER-THEME-QUIET-006 | V-HEADER-THEME-QUIET-001, V-HEADER-THEME-QUIET-009, V-HEADER-THEME-QUIET-010                                                     |
| A-HEADER-THEME-QUIET-007 | V-HEADER-THEME-QUIET-001, V-HEADER-THEME-QUIET-009, V-HEADER-THEME-QUIET-010                                                     |
| A-HEADER-THEME-QUIET-008 | V-HEADER-THEME-QUIET-004, V-HEADER-THEME-QUIET-005, V-HEADER-THEME-QUIET-010                                                     |
| A-HEADER-THEME-QUIET-009 | V-HEADER-THEME-QUIET-006, V-HEADER-THEME-QUIET-010                                                                               |
| A-HEADER-THEME-QUIET-010 | V-HEADER-THEME-QUIET-009, V-HEADER-THEME-QUIET-010                                                                               |
| A-HEADER-THEME-QUIET-011 | V-HEADER-THEME-QUIET-009, V-HEADER-THEME-QUIET-010                                                                               |
| A-HEADER-THEME-QUIET-012 | V-HEADER-THEME-QUIET-009, V-HEADER-THEME-QUIET-010                                                                               |
| A-HEADER-THEME-QUIET-013 | V-HEADER-THEME-QUIET-001, V-HEADER-THEME-QUIET-007, V-HEADER-THEME-QUIET-009, V-HEADER-THEME-QUIET-010                           |
| A-HEADER-THEME-QUIET-014 | V-HEADER-THEME-QUIET-001, V-HEADER-THEME-QUIET-009, V-HEADER-THEME-QUIET-010                                                     |

具体的なコマンド、manual fixture、実行境界はChange Planを正本とし、このADRへ複製しない。

## Unresolved Decision Items

- なし。

## Pending Implementation Verification

- V-HEADER-THEME-QUIET-004〜V-HEADER-THEME-QUIET-008の手動視覚確認。
- V-HEADER-THEME-QUIET-009のChatGPT差分精査。
- V-HEADER-THEME-QUIET-010のCompletion Review。
- 適用対象CIがある場合の結果。

## Out of Scope

- Theme switcher DOM変更。
- Theme label削除。
- Theme panel item再設計。
- Theme persistence/bootstrap/state同期変更。
- Search trigger再設計。
- Corpus trigger弱化。
- Header全体のinformation architecture変更。
- selector意味解析器、media/cascade analyzerの導入。

## Rollback Policy

Pre-merge:

- ADR、docs index、CSS、test、contractの5ファイルを取り消す。

Post-merge推奨:

- CSS、test、contractを戻す。
- ADRとdocs indexは残す。
- ADRを`Reverted`または`Superseded`へ更新する。
- docs indexのADR参照を維持する。
- rollback commitまたは追随commitへADR IDと理由を記録する。

緊急:

- 元commit全体をgit revertし、revert commitへADR IDと理由を記録する。
