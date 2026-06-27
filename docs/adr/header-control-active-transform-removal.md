# Header Control Active Transform Removal Decision Record

## Status

- Decision Record ID: ADR-HEADER-ACTIVE-TRANSFORM-REMOVAL-001
- Request ID: REQ-HEADER-ACTIVE-TRANSFORM-REMOVE-001
- Decision ID: D-HEADER-ACTIVE-TRANSFORM-REMOVE-001
- R段階/Aレベル: R3/A0
- Status: Accepted
- Date: 2026-06-27
- Contract source of truth: `docs/contracts/static-header-contract.md`

この文書はDecision Recordである。現行contractの正本は`docs/contracts/static-header-contract.md`である。

## R/A判定理由

Header active transform removalは、ヘッダー操作要素のvisual contractを変更するR3の公開UI判断である。一方でDOM、ARIA、fallback link、keyboard behavior、router、hydrationには触れず、既存の意味論と操作経路を維持するためA0とする。

## 採用仕様

- Header top-level controlsとmenu panel itemsは、`:active`でtransformを使わない。
- Header active stateは、読書空間への視覚ノイズを抑えるため、surface feedbackで表現する。
- 通常色ではneutral surface feedbackを使う。
- forced-colorsではButtonFaceによるsystem surface feedbackを使う。
- ButtonFaceは押下中の一時的なactive feedbackであり、current/selected stateの意味表現ではない。
- Search triggerだけprimary/system active surfaceで特別扱いしない。
- Search trigger専用のactive background ruleは通常色・forced-colorsの双方で残さない。
- Search triggerのborder識別性はactive surface契約とは分離して維持する。
- 押下transformは操作可能性の正本ではない。

## 棄却案

- Header controlsのactive transformを維持する案。読書用headerとして押下時の動きが視覚ノイズになるため採用しない。
- Search triggerだけ強いprimary系active surfaceへ昇格する案。検索だけを押下中に特別扱いするとheader control共通契約から外れるため採用しない。
- forced-colorsでSearch triggerだけButtonFaceを持つ案。system surface feedbackをSearch trigger専用契約に見せるため採用しない。
- reduced-motion内でactive transformを`transform: none`として残す案。active transform自体を廃止するため採用しない。

## 保留案

- Header外のpressed transform見直し。
- Search dialog、search page、static-choice-menu、table、TOCなどheader外surfaceのactive feedback見直し。
- Header controlのhover/focus/current/selected surface体系の追加再設計。

## 反対仮説

- 押下transformがないと操作可能性が弱くなる。
- Search triggerは検索という主要導線なのでactive surfaceを強くすべきである。
- forced-colorsではSearch triggerだけButtonFaceを持つ方が見つけやすい。
- reduced-motion向けに`transform: none`を残す方が安全である。

## 反対仮説を退ける理由

操作可能性はDOM semantics、hit target、border識別性、hover、focus-visible、fallback link、hydrated behaviorの組み合わせで成立する。押下transformは操作可能性の正本ではない。Search triggerは主要導線だが、active feedbackだけを特別扱いするとheader control共通surface契約と読書空間の静けさを崩す。forced-colorsのButtonFaceはsystem surface feedbackとして共通化すべきであり、Search trigger専用状態ではない。active transformを削除するため、reduced-motion専用の`transform: none`は不要である。

## 契約影響

- `src/assets/css/layout-header.css`はheader active transformを廃止し、top-level controlsとmenu panel itemsのactive feedbackをneutral/system surfaceへ統一する。
- `test/ssr/static-css-contracts.test.ts`はactive transform不在、Search trigger専用active background rule不在、forced-colors共通active feedback、focus-visible、44px hit target、Search trigger border識別性を検証する。
- `docs/contracts/static-header-contract.md`はHeader Control Visual ContractとSearch Trigger Visual Contractを更新する。

## Delete/Breaking Change Gate結果

Delete対象は`--_header-control-pressed-scale`、header control transition内のtransform transition、header top-level controlsのactive transform、menu panel itemのactive transform、Search trigger専用active background rule、reduced-motion内のactive transform抑制ruleである。

Breaking Change Gateとして、DOM、ARIA、fallback link、keyboard behavior、router behavior、hydration behavior、focus-visible outline、44px hit target、selected/current surface、corpus current indicator、theme selected state、Search trigger border識別性、`--scale-pressed` global tokenは維持する。

## 互換性影響

押下中の縮小表現はなくなる。構造、意味論、fallback、hydration、keyboard、router、search dialog behaviorは変更しない。

## Rouault固有契約影響

Rouaultのheaderは読書補助UIである。Active feedbackは本文への集中を妨げにくいsurface feedbackへ統一し、current/selected stateの意味表現とは分離する。

## forced-colors判断

forced-colorsではtop-level controlsとmenu panel itemsのactive feedbackをButtonFaceへ共通化する。ButtonFaceは押下中の一時surfaceであり、current/selected stateの意味表現ではない。

## reduced-motion判断

active transform自体を廃止するため、reduced-motionでactive selectorに`transform: none`を要求しない。Reduced motion環境でもactive stateは非motion feedbackで成立する。

## Search trigger専用active rule廃止の判断

Search trigger専用のactive background ruleは通常色・forced-colorsの双方で残さない。Search triggerのactive feedbackはtop-level controls共通selector群の一員としてのみ定義する。

## Search trigger border識別性維持の判断

Search triggerの通常時、hover時、forced-colors時のborder識別性は操作可能要素としての識別性であり、active surface契約とは分離して維持する。

## out-of-scope

- DOM構造変更
- details/summary/nav構造変更
- コーパスドロップダウンのsemantics変更
- テーマドロップダウンのbutton group semantics変更
- 検索トリガーのbutton化
- `/search/` fallback変更
- Space activation復元
- `data-search-dialog-trigger`変更
- `data-no-router`変更
- `aria-haspopup` / `aria-controls` / `aria-expanded`変更
- `open-search-dialog` custom event保証の変更
- search dialog behavior変更
- router挙動変更
- hydration behavior変更
- focus-visible outline弱化
- 44px hit target pseudo-element削除
- selected/current surface変更
- corpus current indicator変更
- theme selected state変更
- Search triggerのborder識別性弱化
- `--scale-pressed`グローバルトークン削除
- header外のpressed transform変更

## rollback方針

Rollbackする場合は、`layout-header.css`のactive transform、Search trigger専用active background、reduced-motion抑制rule、SSR CSS contract、static header contract、docs index、ADRを一括で戻す。ただしDOM、ARIA、fallback、keyboard、router、hydration、selected/current state、Search trigger border識別性は維持する。

## Acceptance ID

- A-HEADER-ACTIVE-TRANSFORM-001: Header top-level controlsは:activeでtransformを使わない。
- A-HEADER-ACTIVE-TRANSFORM-002: Header menu panel itemsは:activeでtransformを使わない。
- A-HEADER-ACTIVE-TRANSFORM-003: Search triggerの:activeは--bg-activeを使わず、header共通のneutral surface feedbackに揃っている。
- A-HEADER-ACTIVE-TRANSFORM-004: Search trigger専用の:active background ruleは、通常色・forced-colorsの双方で残っていない。
- A-HEADER-ACTIVE-TRANSFORM-005: forced-colorsでも、Search triggerだけ特別なactive backgroundを持たず、top-level controlsとmenu panel itemsがButtonFaceによる共通system surface feedbackを持つ。
- A-HEADER-ACTIVE-TRANSFORM-006: ButtonFaceはactive feedbackとして扱われ、current/selected stateの意味表現とは混同されていない。
- A-HEADER-ACTIVE-TRANSFORM-007: Hover、focus-visible、selected/current、44px hit targetの既存契約が維持されている。
- A-HEADER-ACTIVE-TRANSFORM-008: Search triggerの通常時/hover時/forced-colors時のborder識別性が維持されている。
- A-HEADER-ACTIVE-TRANSFORM-009: static-header-contract.mdが、active transform廃止後のHeader Control Visual ContractとSearch Trigger Visual Contractを説明している。
- A-HEADER-ACTIVE-TRANSFORM-010: 新規ADRが、R3/A0判断、採用仕様、棄却案、反対仮説、Delete/Breaking Change Gate、forced-colors判断、Search trigger専用active rule廃止、Search trigger border識別性維持、rollback方針を記録している。
- A-HEADER-ACTIVE-TRANSFORM-011: DOM、ARIA、fallback link、keyboard behavior、hydration behaviorに変更がない。
- A-HEADER-ACTIVE-TRANSFORM-012: --_header-control-pressed-scaleは削除されている。
- A-HEADER-ACTIVE-TRANSFORM-013: src/assets/css/tokens.cssに触れておらず、--scale-pressedグローバルトークンが維持されている。

## Verification ID

- V-HEADER-ACTIVE-TRANSFORM-001: `pnpm run test:ssr -- test/ssr/static-css-contracts.test.ts`により、active transform廃止、Search trigger専用active background rule不在、forced-colors共通active feedback、focus-visible、44px hit target、Search trigger border識別性契約を検証する。
- V-HEADER-ACTIVE-TRANSFORM-002: `pnpm run lint`と`pnpm run typecheck`により、CSS、テスト、文書変更後の静的整合性を確認する。
- V-HEADER-ACTIVE-TRANSFORM-003: diff reviewにより、変更ファイルが許可5ファイルに限定され、tokens.css、DOM、ARIA、fallback link、hydration behavior、Search trigger border識別性、selected/current surfaceに触れていないことを確認する。
- V-HEADER-ACTIVE-TRANSFORM-004: 手動確認により、コーパスドロップダウン、テーマドロップダウン、検索トグル、header menu itemが押下時に縮小せず、hover/focus/current/selected/forced-colorsの視認性が維持されていることを確認する。

## Acceptance IDとVerification IDの対応表

| Acceptance ID | Verification ID |
| --- | --- |
| A-HEADER-ACTIVE-TRANSFORM-001 | V-HEADER-ACTIVE-TRANSFORM-001, V-HEADER-ACTIVE-TRANSFORM-004 |
| A-HEADER-ACTIVE-TRANSFORM-002 | V-HEADER-ACTIVE-TRANSFORM-001, V-HEADER-ACTIVE-TRANSFORM-004 |
| A-HEADER-ACTIVE-TRANSFORM-003 | V-HEADER-ACTIVE-TRANSFORM-001, V-HEADER-ACTIVE-TRANSFORM-004 |
| A-HEADER-ACTIVE-TRANSFORM-004 | V-HEADER-ACTIVE-TRANSFORM-001, V-HEADER-ACTIVE-TRANSFORM-003 |
| A-HEADER-ACTIVE-TRANSFORM-005 | V-HEADER-ACTIVE-TRANSFORM-001, V-HEADER-ACTIVE-TRANSFORM-004 |
| A-HEADER-ACTIVE-TRANSFORM-006 | V-HEADER-ACTIVE-TRANSFORM-001, V-HEADER-ACTIVE-TRANSFORM-003 |
| A-HEADER-ACTIVE-TRANSFORM-007 | V-HEADER-ACTIVE-TRANSFORM-001, V-HEADER-ACTIVE-TRANSFORM-004 |
| A-HEADER-ACTIVE-TRANSFORM-008 | V-HEADER-ACTIVE-TRANSFORM-001, V-HEADER-ACTIVE-TRANSFORM-003, V-HEADER-ACTIVE-TRANSFORM-004 |
| A-HEADER-ACTIVE-TRANSFORM-009 | V-HEADER-ACTIVE-TRANSFORM-003 |
| A-HEADER-ACTIVE-TRANSFORM-010 | V-HEADER-ACTIVE-TRANSFORM-003 |
| A-HEADER-ACTIVE-TRANSFORM-011 | V-HEADER-ACTIVE-TRANSFORM-003 |
| A-HEADER-ACTIVE-TRANSFORM-012 | V-HEADER-ACTIVE-TRANSFORM-001 |
| A-HEADER-ACTIVE-TRANSFORM-013 | V-HEADER-ACTIVE-TRANSFORM-003 |
