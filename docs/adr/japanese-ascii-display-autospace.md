# 日本語本文における表示層和欧間アキ方針

## メタデータ

- Decision Record ID: DR-JA-ASCII-DISPLAY-AUTOSPACE-001
- 対象Request ID: REQ-JA-ASCII-DISPLAY-AUTOSPACE-001
- R段階/Aレベル: R3/A0
- 採用Decision ID: DEC-JA-ASCII-DISPLAY-AUTOSPACE-001
- Workflow: feature-change
- 変更種別: change
- 契約影響: non-breaking visual contract addition
- 先行Decision: DR-JA-ASCII-SPACING-001

## Evidence

- 先行ADRは、本文データに和欧間U+0020を入れない方針を採用した。
- 先行ADRでは、text-autospace導入とTypography変更をout-of-scopeにした。
- 現行日本語表記ガイドは、表示上の和欧間アキを本文データではなく表示層の責務としている。
- 現行Reading Surface Flow Patternとstateful-note-bridges.cssでは、ui-tabs panel内の読書本文flowと[data-math]の読書面内breakoutが扱われている。
- main.cssの読書面flow ruleにはui-translationと.translation-staticが含まれる。
- 現行flow契約は、主に.prose/.about-prose直下のui-tabs panelを扱う。
- 本Decisionでは、autospaceの継承制御についてだけ、nested ui-tabsを含む読書面配下のui-tabs全般へ表示契約を広げる。
- これはflow余白契約の拡張ではなく、表示層autospace契約の追加である。
- Rouaultの読書面には「Markdownを」「UIはLitとTypeScriptで実装」のような和欧混在文が存在する。
- 読書面の可読性を改善する場合でも、本文データへU+0020を追加しないほうが既存方針と整合する。
- ui-translationはlight DOMでrenderし、document style上のtrigger/contentを持つため、autospace継承の視覚影響を手動確認する。

## 採用仕様

- 本文データのU+0020禁止方針は維持する。
- 対応ブラウザーではbodyをtext-autospace:no-autospaceで固定する。
- `.prose` / `.about-prose`だけ`text-autospace: ideograph-alpha ideograph-numeric`へopt-inする。
- 読書面配下の`ui-tabs` hostは`no-autospace`へ戻す。
- 読書面配下の`ui-tabs`直下`[slot='panel']`だけ読書本文として再opt-inする。
- この`ui-tabs`契約はflow余白契約の拡張ではなく、autospace継承制御だけの追加契約である。
- `code`、`pre`、`kbd`、`samp`、`.katex`、`[data-math]`、`pre[data-code-block]`、`[data-code-block-root]`、`section[data-code-group]`、`[data-score]`は`no-autospace`へ戻す。
- `.translation-static`と`ui-translation`の表示テキストは読書面内の本文補助要素としてautospace継承を許容する。
- translation trigger / fallback / overlayに過剰な字間変化が見つかった場合、このChange内で場当たり的にscopeを追加せず、完了判定を保留し、別ChangeまたはChange Plan更新で扱う。
- 未対応ブラウザーでは現状表示を許容する。

## 棄却案

### 棄却案1:本文MarkdownへU+0020を追加する

棄却理由:本文データのU+0020禁止方針を破り、copy、search、Markdown資産の長期一貫性を損なう。

### 棄却案2:build時に本文テキストを変換する

棄却理由:Markdown / DOM / search / hydrationに影響し、表示上の調整をcontent pipelineへ持ち込む。

### 棄却案3:body全体をautospaceへopt-inする

棄却理由:読書面以外のUI、trigger、control、navigationまで字間が変化する。

### 棄却案4:letter-spacing / word-spacingで代替する

棄却理由:和欧間・和数字間境界に限定できず、記号的表示やUI全体の字送りを変える。

### 棄却案5:text-autospace:normal / auto / replaceを使う

棄却理由:本Changeの採用仕様では`no-autospace`と`ideograph-alpha ideograph-numeric`だけを扱う。

## 保留案

- translation trigger / fallback / overlayに過剰な字間変化がある場合の個別scope化。
- 非対応ブラウザー向けのpolyfillまたは代替表示。

## 反対仮説

### 反対仮説1

本文データへU+0020を入れたほうが表示互換性が高いのではないか。

退ける理由:Rouaultでは本文資産の表記方針を維持し、表示上の和欧間・和数字間アキだけを読書面CSSの責務とする。

### 反対仮説2

`ui-tabs` hostも読書本文としてautospaceへopt-inすべきではないか。

退ける理由:`ui-tabs` hostは表示容器であり、読書本文として扱う対象は直下`[slot='panel']`に限定する。

### 反対仮説3

translation系要素は個別にscope化しておくべきではないか。

退ける理由:`ui-translation`と`.translation-static`は読書面flow上の本文補助要素であり、現時点では読書面からの継承を許容する。trigger / fallback / overlayに過剰な字間変化が見つかった場合は別ChangeまたはChange Plan更新で扱う。

## R/A判定理由

R3理由:

- 読書面のvisual contractを追加する。
- Design System pattern、SSR CSS contract、Japanese writing guideに影響する。
- Markdown / DOM / search / hydrationは変更しない。

A0理由:

- private / restricted Evidenceは扱わない。
- content本文やsecretを変更しない。
- 通常のdiff、テスト、手動確認で十分である。

## 互換性影響

- 対応ブラウザーでは読書面本文の表示上の和欧間・和数字間アキが変わる。
- 未対応ブラウザーでは現状表示へフォールバックする。
- DOM、Markdown、copy、search、hydrationには影響しない。
- 破壊的変更、移行、非推奨化を伴わない。

## 契約影響

- CSS / typography: non-breaking visual contract addition
- URL / routing / permalink:影響なし
- DOM構造:影響なし
- Markdown parser / remark / rehype:影響なし
- content schema / frontmatter key:影響なし
- hydration marker / data contract / custom event:影響なし
- search index:影響なし

## Rouault固有契約影響

- 静かな読書空間:本文データを変更せず、読書面の表示層だけで和欧間・和数字間の視覚的アキを補正するため、読書没入性を改善する。
- 本文データ契約:和欧間アキ目的のU+0020禁止方針を維持する。
- Reading Surface契約:.prose/.about-proseをautospace opt-in境界として扱う。
- ui-tabs契約:flow余白契約は拡張しない。autospace継承制御だけ読書面配下ui-tabs全般へ追加する。
- translation契約:ui-translation/.translation-staticは本文補助要素としてautospace継承を許容する。ただしtrigger/content/fallback/overlayの過剰な視覚変化は完了不可とする。
- 記号的表示契約:code/pre/kbd/samp/KaTeX/[data-math]/code block/code group/scoreはno-autospaceへ戻す。

## 未解決事項

- translation trigger / fallback / overlayに過剰な字間変化が見つかった場合の扱い。
- 対応ブラウザー拡大時の実表示差分の継続確認。

## Delete/Breaking Change Gate

不要。
理由:削除、URL変更、DOM契約破壊、CSS custom property削除、永続化形式変更、移行、非推奨化、アクセシビリティ意味変更を伴わない。

## A1/A2 Evidence保全要件

不要。
理由:A0であり、通常Evidenceで十分である。

## Rollback

問題が出た場合は、次の順に切り戻す。

```text
1. main.cssのtext-autospace @supports blockを削除する。
2. reading-surface-flow-css-contract.test.tsのautospace検査を削除する。
3. docs/guides/japanese-writing-style.mdのautospace表示方針を前方針へ戻す。
4. docs/design-system/pattern-reading-surface.mdのJapanese/ASCII Visual Spacing節を削除する。
5. docs/adr/japanese-ascii-display-autospace.mdを削除する。
```

## Acceptance

- A-JA-ASCII-DISPLAY-AUTOSPACE-001: 本文データのU+0020禁止方針が維持されている。
- A-JA-ASCII-DISPLAY-AUTOSPACE-002: 対応ブラウザーではbodyがno-autospaceへ固定され、.prose/.about-proseだけがideograph-alpha ideograph-numericへopt-inされている。
- A-JA-ASCII-DISPLAY-AUTOSPACE-003: 読書面配下のui-tabs hostはno-autospaceへ戻り、ui-tabs直下[slot='panel']だけ読書本文として再opt-inされている。この契約はflow余白契約の拡張ではなく、autospace継承制御だけの追加契約である。
- A-JA-ASCII-DISPLAY-AUTOSPACE-004: code/pre/kbd/samp/KaTeX/[data-math]/code block/code group/scoreではno-autospaceへ戻されている。
- A-JA-ASCII-DISPLAY-AUTOSPACE-005: 未対応ブラウザーでは現状表示へフォールバックし、DOM・Markdown・検索・hydrationに影響しない。
- A-JA-ASCII-DISPLAY-AUTOSPACE-006: 後続ADR、表記ガイド、Reading Surface PatternがCSS実装と矛盾していない。
- A-JA-ASCII-DISPLAY-AUTOSPACE-007: translation系要素は本文補助要素としてautospace継承を許容しつつ、trigger/fallback/overlayのUI表示に過剰な字間変化がないことを手動確認する。過剰な字間変化が見つかった場合は完了不可とし、別ChangeまたはChange Plan更新で扱う。

## Verification

- V-JA-ASCII-DISPLAY-AUTOSPACE-001
- V-JA-ASCII-DISPLAY-AUTOSPACE-002
- V-JA-ASCII-DISPLAY-AUTOSPACE-003
- V-JA-ASCII-DISPLAY-AUTOSPACE-004
- V-JA-ASCII-DISPLAY-AUTOSPACE-005
- V-JA-ASCII-DISPLAY-AUTOSPACE-006
- V-JA-ASCII-DISPLAY-AUTOSPACE-007
- V-JA-ASCII-DISPLAY-AUTOSPACE-008
- V-JA-ASCII-DISPLAY-AUTOSPACE-009

- `pnpm run test:ssr -- test/ssr/reading-surface-flow-css-contract.test.ts`
- `pnpm run typecheck`
- `pnpm run lint`

Manual Verification:

- 対応ブラウザー判定は次の複合条件で行う。

```js
CSS.supports(
  '(text-autospace: no-autospace) and (text-autospace: ideograph-alpha ideograph-numeric)',
);
```

- または次の2条件が両方trueであることを確認する。

```js
CSS.supports('text-autospace', 'no-autospace') &&
  CSS.supports('text-autospace', 'ideograph-alpha ideograph-numeric');
```

- 非対応ブラウザーでは、現状表示へフォールバックし、DOM / Markdown / copy / search / hydrationに影響しないことだけを確認する。
- 非対応ブラウザーでautospace効果が見えないことをfailure扱いにしない。

## out-of-scope

```text
Markdown本文へのU+0020追加
build時の本文テキスト変換
remark/rehype/velite変更
search index変更
DOM構造変更
hydration marker変更
custom event変更
CSS token追加
package.json/pnpm-lock.yaml変更
body全体autospace opt-in
ui-tabs hostの読書本文扱い
ui-tabs flow余白契約の拡張
translation系要素の個別scope化
text-autospace:normal/auto/replace使用
letter-spacing/word-spacingによる代替
```
