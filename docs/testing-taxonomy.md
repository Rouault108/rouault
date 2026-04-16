# Rouault テスト分類と責務境界

## 1. 目的

本書は、Rouault におけるテストの**正本**、**責務境界**、**配置規則**、および**新規テスト追加時の判断基準**を定義します。

本書の目的は次のとおりです。

- static-first / final DOM 正本という設計方針と、テストの検査面を一致させる。
- Storybook を契約の主戦場から外し、docs / smoke / metadata の面へ限定する。
- build-time / SSR / browser behavior / app integration の責務を重複なく分離する。
- failure がどの層の failure かを明確に説明できる状態を維持する。
- 新規テストの置き場判断を固定し、長期保守性を高める。

## 2. 設計前提

Rouault では、次の設計前提を採用します。

1. **note 本文の正本は final DOM です。**
2. **Storybook は仕様を決める場所ではなく、仕様を見せる場所です。**
3. **browser behavior は browser unit または E2E で観測します。**
4. **build-time / SSR / Markdown transform / final DOM 契約は Node 側で検証します。**
5. **CSS 契約は「構造の存在」と「表示結果」を分離して扱います。**
6. **`test/unit/**`は使用しません。テストは`test/node/**`/`test/browser/**`/`test/ssr/**`/`test/e2e/**`/`test/storybook/**` にのみ置きます。**

## 3. テストレイヤの正本

### 3.1 `test/node/**`

責務:

- pure function
- normalization
- URL / path / router policy
- parser helper
- domain rule
- projection 補助
- browser 実体を必要としない helper / utility

ここで検査するもの:

- 入出力の正規化
- 例外 / 境界条件
- router / URL policy
- parser / tokenizer / domain logic
- browser API なしで成立する仕様

ここで検査しないもの:

- shadow DOM
- focus / keyboard / pointer
- custom element の描画結果
- final DOM artifact
- app 全体統合

### 3.2 `test/browser/**`

責務:

- custom element の public DOM contract
- shadow DOM
- keyboard / pointer / focus
- aria / state transition
- fallback / degraded state
- enhancer behavior
- copy / tab / panel / popover などの browser behavior
- emitted event と公開 API の観測

ここで検査するもの:

- custom element の observable behavior
- enhancer が付与する DOM / attribute / event
- keyboard navigation
- focus movement
- pointer interaction
- state transition
- accessible name / role / state の変化
- fallback / degraded state の公開面

ここで検査しないもの:

- Story 構成や title の並び
- preview order
- CSS rule text の存在
- app 全体の統合導線

### 3.3 `test/ssr/**`

責務:

- Markdown / rehype / remark / build-time transform
- note final DOM contract
- projection / serialization
- hydration budget
- static artifact shape
- CSS structure contract
- no legacy runtime path の確認

ここで検査するもの:

- final DOM selector の存在
- legacy custom element の不在
- prose / endnotes / footnote / image surface の shape
- markdown output contract
- projection / serialization
- hydration budget
- selector / hook / token 参照の存在
- TOC absent 時の DOM 正規化
- `@media print` / `@media (forced-colors: active)` / reduced-motion rule の存在

ここで検査しないもの:

- computed style の最終結果
- 実ブラウザ上の focus 表示結果
- pointer / keyboard interaction
- app shell 統合

### 3.4 `test/e2e/**`

責務:

- app shell integration
- no-JS baseline
- router / history / search
- note 読書フロー
- 主要 UX の最終確認
- 必要最小限の媒体 outcome

ここで検査するもの:

- ページ全体の統合挙動
- no-JS baseline の破綻有無
- 主要導線の end-to-end 成立
- TOC present / absent fixture と SPA 遷移の shell 同期
- 壊れた場合の影響が大きい媒体 outcome

ここで検査しないもの:

- pure function の細粒度境界
- component 単体の全 interaction 網羅
- Storybook taxonomy

### 3.5 `test/storybook/**`

責務:

- story metadata validation
- import boundary
- smoke story allowlist の妥当性
- Storybook を docs 面として維持するための最小限検査

ここで検査するもの:

- story metadata の整合
- Storybook 専用 helper の境界
- smoke allowlist の空振り防止
- docs / smoke / manual-only の役割混線防止

ここで検査しないもの:

- note 最終 DOM 契約の主判定
- browser behavior の主判定
- CSS 構造契約の主判定
- preview order や title 配置を合否基準にすること

## 4. Storybook の位置付け

Storybook は **docs / visual catalog / manual QA / 少数の smoke** のために維持します。  
Storybook は **contract test harness** ではありません。

### 4.1 Storybook に残すもの

- representative display
- docs
- visual catalog
- foundations
- layouts
- manual QA 用 story
- 明示 allowlist に載る smoke story

### 4.2 Storybook から外すもの

- note 最終 DOM 契約の主判定
- interaction-heavy contract の主判定
- boundary-heavy contract の主判定
- CSS text / rule existence の主判定
- preview order や story title を使った契約固定

## 5. Story taxonomy

Rouault の Storybook taxonomy は、**契約種別**ではなく**運用上の役割**で扱います。  
`parameters.rouaultContractKind` は Storybook taxonomy の正本ではありません。

Story の role は **Storybook tags** により解決します。  
`autodocs` などの Storybook 標準タグは、この role 判定とは独立です。

### 5.1 docs story

通常の表示・説明・catalog 用 story です。  
主目的は**見せること**です。

`smoke` / `manual-only` のいずれも付かない story は、既定で docs story とみなします。

### 5.2 smoke story

CI で runtime 実行する限定 story です。  
主目的は**docs 面の最低限の健全性確認**です。

smoke story は `smoke` tag で明示します。  
smoke story には、runtime 上で観測する内容に対応した `play` を原則として持たせます。

### 5.3 manual-only story

手動確認専用 story です。  
runtime 契約には含めません。

manual-only story は `manual-only` tag で明示します。

### 5.4 運用原則

- Storybook で runtime 実行する対象は **`smoke` tag が付いた明示 allowlist** に限定します。
- `manual-only` tag が付いた story は runtime 実行対象へ含めません。
- `smoke` と `manual-only` は同じ story に同居させません。
- すべての story に独自 taxonomy を強制しません。
- `interaction-contract` / `boundary-contract` / `visual` を Storybook taxonomy の中心にしません。
- Story の有無、名前、並び順、preview order を契約正本にしません。

## 6. note 本文の契約ルール

Rouault において、note 本文は特別扱いします。

### 6.1 正本

- note 本文の**最終 DOM 契約**は `test/ssr/**` を正本とします。
- note enhancer / browser behavior は `test/browser/**` を正本とします。
- Storybook は note 契約の正本になりません。

### 6.2 `test/ssr/**` に置くべき note 契約

- final DOM selector の存在
- legacy custom element の不在
- static note surface の shape
- markdown output contract
- hydration budget
- projection / serialization
- TOC absent fixture における TOC host / script / hydration scope の不在

### 6.3 `test/browser/**` に置くべき note 契約

- footnote popover enhancer
- dialog / popover 付加
- aria / state transition
- copy interaction
- tab / panel interaction
- pointer / keyboard / focus
- header reserve の `tocPresence` 切り替え

## 7. CSS / media / token 契約の分離

CSS 契約は、**構造の存在**と**表示結果**を同じ場所で扱いません。

### 7.1 Node / SSR 側で扱うもの

- selector の存在
- public hook の存在
- custom property の参照
- `@media print` の定義存在
- `@media (forced-colors: active)` の定義存在
- reduced-motion rule の存在
- CSS text / static styles / 生成物の構造

### 7.2 browser / E2E 側で扱うもの

- computed style の結果
- focus 表示結果
- 実際の表示 / 非表示
- interaction に伴う class / attribute / DOM state の変化
- 本当に壊れると痛い媒体 outcome

## 8. test ディレクトリの固定ルール

- `test/unit/**` は使用しません。
- `src/**/*.test.ts` は使用しません。
- `test/**` にはテストコードだけを置き、計画書や設計メモは `docs/**` へ置きます。
- browser 実体不要のテストは `test/node/**` に置きます。
- browser behavior のテストは `test/browser/**` に置きます。
- build-time / final DOM / CSS structure のテストは `test/ssr/**` に置きます。
- app 全体統合の最終確認は `test/e2e/**` に置きます。

## 9. 新規テスト追加時の判断順

新規テストを書く前に、次の順で判断します。

1. browser 実体なしで成立するか
2. final DOM / build-time / SSR 契約か
3. browser unit の観測対象か
4. app 全体統合か
5. docs / smoke に留めるべきか

### 9.1 配置規則

- pure logic test → `test/node/**`
- browser behavior test → `test/browser/**`
- build-time / final DOM / CSS structure → `test/ssr/**`
- app integration → `test/e2e/**`
- story metadata → `test/storybook/**`

## 10. 禁止事項

次を禁止します。

- Storybook を仕様決定の場として使うこと
- Storybook の `play` を component/browser 契約の主戦場にすること
- CSS 構造契約を Storybook に追加すること
- preview order や story title を契約正本にすること
- private method / internals に依存した Story 契約を固定すること

## 11. 受け入れ条件

次を満たすとき、本 taxonomy は守られているとみなします。

1. note 最終 DOM 契約が Storybook 非依存で検証される。
2. enhancer / component browser behavior が `test/browser/**` を主戦場として検証される。
3. pure function / policy / parser 系テストが `test/node/**` を主戦場として検証される。
4. CSS 構造契約が `test/ssr/**` を主戦場として検証される。
5. Playwright が no-JS baseline と主要統合フローの最終確認を担う。
6. Storybook は docs / smoke / metadata に限定される。
7. story の増減や並び替えが contract failure に直結しにくい。
8. 新規テスト追加時に置き場判断がぶれない。

## 12. 実装運用上の注記

- taxonomy と実ディレクトリ構造は常に一致させます。
- browser contract は `test/browser/**`、pure logic / policy / parser は `test/node/**` を正本とします。
- E2E は no-JS baseline と主要統合導線の最終確認面に限定します。
- Storybook は docs / smoke / metadata に限定します。

## 13. Sidebar / Hydration の配置規則

sidebar と hydration は、次の責務境界で固定します。

### 13.1 `test/node/**`

- sidebar presentation store state machine
- breakpoint から `fixed` / `overlay` への mode 遷移
- overlay state persistence
- route-select collapse policy

### 13.2 `test/browser/**`

- header toggle から store 経由で sidebar が開閉すること
- scrim click / Escape close
- return focus
- `layout-toc` の hydration 後同期
- component の observable state change
- `layout-toc` の mobile summary bar が hydration 後に `position: fixed` で header 直下へ出ること

### 13.3 `test/ssr/**`

- `NoteLayout` が sidebar host を 1 個だけ出力すること
- overlay 専用 DOM surface が存在しないこと
- hydration hook と scope が stable に出力されること

### 13.4 `test/e2e/**`

- no-JS baseline で閲覧が成立すること
- narrow/mobile で横スクロールが増えないこと
- route 遷移後も sidebar / toc が壊れないこと
- footer を含む長スクロールでも mobile summary bar が footer 直前へ落ちないこと
- mobile TOC panel が summary bar の直下から開くこと

### 13.5 Storybook

- docs / smoke / manual-only に限定する
- hydration timing や private activation API を Story で正当化しない
