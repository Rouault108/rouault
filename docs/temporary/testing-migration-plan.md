# Rouault テスト移行計画書

- 文書名: Rouault テスト移行計画書
- 版: 2.0
- 状態: 提案
- 対象: Rouault
- 作成日: 2026年04月01日（UTC+09:00）
- 関連文書:
  - `docs/testing-taxonomy.md`
  - `docs/markdown/markdown-output-contract.md`
  - `docs/markdown/markdown-safety-and-test-policy.md`

## 1. 目的

本計画書は、Rouault におけるテスト責務を **final DOM 正本 / browser behavior / app integration / docs** に分解し、Storybook を「契約の主戦場」から外して、各契約を最も適切な層へ再配置するための方針、移行順序、完了条件を定義します。

本計画の主目的は次のとおりです。

- Storybook 依存を縮小し、失敗原因を責務単位で局所化する。
- static-first / final DOM 正本という設計方針と、テストの検査面を一致させる。
- build-time / SSR / browser unit / E2E / docs の責務を重複なく分離する。
- 長期保守性、CI の安定性、実行時間、変更追従性を改善する。

## 2. 現状認識

Rouault はすでに複数のテストレイヤを持っていますが、責務境界はまだ設計方針と完全には一致していません。

### 2.1 現在の主要実行系

現状の主要実行系は次のとおりです。

- `test`
  - `test:unit`
  - `test:ssr`
  - `test:storybook`
- `test:e2e`

加えて、`test:storybook` は metadata validation と Storybook runtime を同時に実行しています。

### 2.2 現在の主な不整合

現状には次の不整合があります。

1. Storybook が docs / catalog / manual QA に加え、契約検査の主戦場として使われている。
2. `test/unit/**` が browser unit 専用ではなく、pure function、URL、normalization、parser 補助、router policy、browser DOM テストを混在させている。
3. `src/**/*.stories.ts` に `play` を伴う contract 的 story が広く分散している。
4. `docs/testing-taxonomy.md` が `test:storybook` を living spec として扱っている。
5. `test/storybook/**` が note-contract story の存在や preview order まで固定しており、縮退後 Storybook の責務と整合しない。
6. note contract は一部すでに `test/ssr/**` や browser 側テストへ寄り始めているが、Storybook 側に重複が残っている。
7. CSS 契約のうち「ルールの存在」と「描画結果」が Storybook 上で混在している。

### 2.3 本計画が前提とする判断

本計画では、次を設計上の前提とします。

- **note 本文の正本は final DOM である**
- **Storybook は仕様を決める場所ではなく、仕様を見せる場所である**
- **browser behavior は browser unit または E2E で観測する**
- **build-time / SSR / Markdown 変換契約は Node 側で検証する**
- **Storybook metadata test は残すが、runtime 契約の大量実行は縮退させる**

## 3. 基本方針

### 3.1 Storybook を仕様の正本から外す

Storybook は次の責務に限定します。

- docs
- visual catalog
- manual QA
- 少数の smoke
- story metadata / import boundary の検査

Storybook は **contract test harness** ではなく、**UI ドキュメント面**として扱います。

### 3.2 正本に最も近い層で検査する

- build-time / Markdown transform / final DOM / hydration budget は Node 側で検査する。
- shadow DOM / keyboard / pointer / focus / event / enhancer behavior は browser unit で検査する。
- app shell / router / no-JS baseline / note 読書フローは E2E で検査する。

### 3.3 `test/unit/**` を browser unit と同一視しない

現状の `test/unit/**` は browser unit 専用の置き場ではありません。  
したがって、本計画では **新しい責務境界を導入し、段階的にディレクトリも一致させます。**

目標状態では次を採用します。

- `test/node/**`
  - pure function、normalization、URL、policy、parser、domain rule
- `test/browser/**`
  - browser unit、custom element、enhancer、DOM interaction
- `test/ssr/**`
  - build-time transform、projection、serialization、final DOM、CSS structure
- `test/e2e/**`
  - app-level integration
- `test/storybook/**`
  - story metadata、import boundary、smoke allowlist の妥当性

### 3.4 ルールの存在と結果を分ける

CSS / media / token 契約は、次のように分離します。

#### Node 側で検査するもの

- selector の存在
- public hook の存在
- custom property の参照
- `@media print` の定義存在
- `@media (forced-colors: active)` の定義存在
- CSS text / static styles / 生成物の構造

#### Browser / E2E 側で検査するもの

- computed style の結果
- focus 表示結果
- 実際の表示非表示
- interaction に伴う class / attribute / DOM state の変化
- 必要最小限の媒体 outcome

### 3.5 縮退は先に効かせる

Storybook runtime の全件実行を長く維持したまま契約移送を進めるのは非効率です。  
したがって、本計画では **Storybook runtime の縮小を早期に行い、その後に契約を段階移送します。**

## 4. 目標状態

## 4.1 テストレイヤの最終責務

### `test/node/**`

責務:

- pure function
- normalization
- URL / path / router policy
- parser helper
- domain rule
- projection 補助
- browser 実体を必要としないロジック

### `test/browser/**`

責務:

- custom element の public DOM contract
- shadow DOM
- keyboard / focus / pointer
- fallback / degraded state
- emitted event
- enhancer behavior
- aria / state transition
- copy / tab / panel などの browser behavior

### `test/ssr/**`

責務:

- Markdown / rehype / remark / build-time transform
- note final DOM contract
- serialization
- hydration budget
- page projection
- CSS structure contract
- no legacy runtime path の確認
- static artifact shape

### `test/e2e/**`

責務:

- app shell integration
- no-JS baseline
- router / history / search
- note 読書フロー
- 主要 UX の最終確認
- 必要最小限の媒体 outcome

### `test/storybook/**`

責務:

- story metadata validation
- import boundary
- smoke story allowlist の妥当性
- Storybook を docs 面として維持するための最小限検査

### Storybook 本体

責務:

- docs
- visual catalog
- representative story
- manual QA
- 少数の smoke runtime

## 4.2 Story taxonomy の最終方針

現行の `parameters.rouaultContractKind` による **`visual / interaction-contract / boundary-contract`** の全件分類は採用しません。

代わりに、Storybook 側の分類は次のように縮小します。

### 必須概念

- **docs story**
  - 通常の表示・説明・catalog 用 story
- **smoke story**
  - CI で runtime 実行する限定 story
- **manual-only story**
  - 手動確認専用で runtime 契約には含めない story

### 運用原則

- Storybook で実行する runtime story は **明示 allowlist** に限定する。
- すべての story に契約種別を強制しない。
- `interaction-contract` や `boundary-contract` を taxonomy の中心にしない。
- Story の有無や preview order を契約の正本にしない。

## 5. 移行対象分類

### 5.1 即時対象

以下は Storybook の contract harness 性を強めているため、優先的に縮退または移送します。

- `src/stories/note-contracts/static-primitives.stories.ts`
- `src/stories/note-contracts/enhancers.stories.ts`
- `test/storybook/story-taxonomy.test.ts`
- `test/storybook/story-discovery.test.ts`
- `docs/testing-taxonomy.md`
- `package.json`
- `vitest.config.ts`
- `web-test-runner.config.mjs`

### 5.2 優先移送対象

以下は browser contract / interaction contract を多く抱えやすく、Storybook から browser unit へ移す優先度が高い対象です。

1. tabs
2. copy-button
3. code-block
4. code-group
5. dropdown
6. sidebar / sidebar-shell
7. tooltip
8. video
9. skip-link
10. details
11. breadcrumbs
12. file-tree

### 5.3 CSS 契約の優先移送対象

以下は Storybook で持ちやすいが、本来は Node で構造検査すべき契約です。

- print rules
- forced-colors rules
- reduced-motion rule existence
- public token / custom property 参照
- selector / hook の存在
- legacy custom element 不在

### 5.4 Storybook に残す対象

以下は Storybook に残します。

- foundations
- theme / token / spacing / typography の見本
- representative component stories
- layouts
- manual review 用 story
- 少数の smoke story

## 6. 非目標

本計画は次を目的としません。

- Storybook 自体の撤去
- browser unit で app 全体統合を代替すること
- Node 側で computed style の描画結果まで保証すること
- すべての story を削除すること
- 既存の全 test ファイルを一度に移動すること

## 7. 実施フェーズ

## Phase 0. 正本と責務境界の文書修正

### 目的

縮退後の責務境界を、実装より先に文書上で固定します。

### 対象

- `docs/testing-taxonomy.md`
- 本計画書

### 実施内容

1. `test:storybook` から living spec という位置付けを外す。
2. Storybook を docs / smoke / metadata の場として再定義する。
3. `test/unit/**` を browser unit と断定しない。
4. 目標 taxonomy として `test/node/**` / `test/browser/**` / `test/ssr/**` / `test/e2e/**` / `test/storybook/**` を明文化する。
5. note 本文の契約は `test/ssr/**` と `test/browser/**` を正本とする方針を明記する。
6. CSS 契約を「Node の構造検査」と「browser/E2E の結果検査」に分離して明記する。

### 完了条件

- 文書だけで責務境界の説明が矛盾しない。
- Storybook を契約正本として扱う記述が消えている。
- 新規テスト追加時の判断基準が固定されている。

## Phase 1. 実行境界の再定義と Storybook runtime の早期縮小

### 目的

CI の常設ゲートと拡張ゲートを再編し、Storybook runtime の全件実行を早期に止めます。

### 対象

- `package.json`
- `vitest.config.ts`

### 実施内容

1. スクリプトを次のように再編する。

#### 常設ゲート

- `test:node`
- `test:ssr`
- `test:browser`
- `test:storybook:meta`

#### 拡張ゲート

- `test:storybook:smoke`
- `test:e2e`

#### 集約スクリプト

- `test`
  - `test:node`
  - `test:ssr`
  - `test:browser`
  - `test:storybook:meta`
- `test:extended`
  - `test:storybook:smoke`
  - `test:e2e`

2. 当面の互換のため、`test:unit` は transitional alias とするか、段階的に廃止する。
3. `storybook-runtime` は全 story 実行をやめ、smoke allowlist のみを実行する。
4. `storybook-meta` は維持するが、旧 taxonomy 前提の検査は後続フェーズで更新する。

### 完了条件

- 常設ゲートから Storybook runtime 全件実行が外れている。
- Storybook runtime は明示 allowlist の smoke のみを実行する。
- CI で docs 変更と契約失敗が切り分けられる。

## Phase 2. Storybook taxonomy の縮退と meta test の再設計

### 目的

Storybook の分類体系を、contract taxonomy から docs/smoke taxonomy へ置き換えます。

### 対象

- `docs/testing-taxonomy.md`
- `src/testing/story-taxonomy.ts`
- `test/storybook/story-taxonomy.test.ts`
- `test/storybook/story-discovery.test.ts`
- 必要に応じて `.storybook/preview.ts`

### 実施内容

1. `parameters.rouaultContractKind` の mandatory policy を廃止する。
2. `interaction-contract` と `boundary-contract` を Storybook の主分類から外す。
3. metadata test の関心を次へ変更する。
   - smoke allowlist が空でないこと
   - story import boundary が守られていること
   - docs と smoke の責務が混ざっていないこと
   - Storybook 専用 helper が production の正本を持っていないこと
4. `story-discovery.test.ts` から次を削除する。
   - note-contract story の存在前提
   - Note Contracts を先頭に並べる前提
   - legacy component stories の title 配置を契約として固定する前提
5. preview order は docs 上の都合として扱い、契約の合否から外す。

### 完了条件

- Storybook の taxonomy が docs/smoke 中心へ縮退している。
- note-contract story や preview order が必須前提でなくなっている。
- metadata test が Storybook の新責務と一致している。

## Phase 3. note contract の Storybook 依存除去

### 目的

note 最終 DOM 契約と enhancer 契約を Storybook から外し、既存の SSR / browser テスト群を正本として確定します。

### 対象

- `src/stories/note-contracts/static-primitives.stories.ts`
- `src/stories/note-contracts/enhancers.stories.ts`
- `test/ssr/**`
- `test/browser/**`
- 当面は `test/unit/**` と `src/**/*.test.ts`

### 実施内容

1. `static-primitives` が持つ契約を `test/ssr/**` に集約する。
2. `enhancers` が持つ契約を browser unit 側へ集約する。
3. Storybook 側の note-contract stories は削除するか、純粋 docs/smoke に縮退する。
4. 既存の次の系統を正本として整理する。
   - note content contract
   - note static contract rendering
   - hydration budget
   - code-group / enhancer 系 browser contract
5. Storybook 側に残す場合も、契約の主判定は Storybook で行わない。

### `test/ssr/**` に属する代表契約

- final DOM selector の存在
- legacy custom element の不在
- prose / endnotes / footnote / image surface の shape
- markdown output contract
- projection / serialization
- hydration budget

### `test/browser/**` に属する代表契約

- footnote popover enhancer
- dialog / popover 付加
- aria / state transition
- copy interaction
- tab / panel interaction
- pointer / keyboard / focus

### 完了条件

- note contract の合否が Storybook なしで決まる。
- note-contract stories が正本でなくなっている。
- Storybook 側の note-contract 依存が消えている。

## Phase 4. browser contract の系統移送

### 目的

Storybook 上の interaction-heavy contract を browser unit へ移します。

### 対象

- `src/components/ui/**/**/*.stories.ts`
- `src/**/*.test.ts`
- `test/unit/**`
- `test/browser/**`

### 実施内容

優先コンポーネントごとに、次の二分割を行います。

#### Storybook に残すもの

- representative display
- docs
- visual variation
- manual confirmation
- 限定された smoke

#### browser unit に移すもの

- keyboard navigation
- pointer interaction
- focus movement
- event emission
- aria transition
- fallback / degraded state
- shadow DOM contract
- custom element public API
- private method に依存しない observable behavior

### 特記事項

- private method や internal property を直接叩く story は優先的に撤去する。
- browser contract は Story 構成ではなく、公開 DOM / event / state を正本とする。
- `src/**/*.test.ts` は transitional placement とし、新規 browser contract は `test/browser/**` に追加する。

### 完了条件

- interaction-heavy story の `play` が大幅に削減されている。
- browser behavior の主戦場が Storybook ではなく `test/browser/**` になっている。
- Story の追加・改名・並び替えが contract failure に直結しにくくなっている。

## Phase 5. CSS 構造契約の Node 移送

### 目的

CSS 契約のうち、構造として検査すべきものを Storybook runtime から切り離します。

### 対象

- `test/ssr/**`
- CSS contract helper
- `src/components/ui/**/**/*.stories.ts`

### 実施内容

1. CSS 構造検査 helper を Node 側へ集約する。
2. 次を Node 側で検査する。
   - selector の存在
   - `@media print` の存在
   - `@media (forced-colors: active)` の存在
   - public token / custom property 参照
   - print 時に必要な rule の存在
   - reduced-motion rule の存在
3. Storybook の `play` から CSS text / rule existence 検査を撤去する。
4. 実表示 outcome が本当に重要なものだけを browser/E2E に残す。

### 完了条件

- CSS 契約の主戦場が `test/ssr/**` になる。
- Storybook 側の CSS 文字列検査が消える。
- Node と browser/E2E の責務が混線しない。

## Phase 6. test ディレクトリ責務の物理整列

### 目的

文書上の責務境界を、ディレクトリ構造にも反映します。

### 対象

- `test/unit/**`
- `test/browser/**`
- `test/node/**`
- `src/**/*.test.ts`
- `web-test-runner.config.mjs`
- 必要に応じて Node 側 Vitest 設定

### 実施内容

1. `test/node/**` を新設する。
2. `test/browser/**` を新設する。
3. `test/unit/**` の既存ファイルを次の基準で再配置する。

#### `test/node/**` へ移すもの

- pure function
- normalization
- URL / router policy
- parser / tokenizer
- domain rule
- browser 実体不要な helper

#### `test/browser/**` へ移すもの

- DOM interaction
- custom element
- enhancer
- focus / keyboard / pointer
- shadow DOM

4. `src/**/*.test.ts` は段階的に `test/browser/**` または `test/node/**` へ移す。
5. transitional period では WTR include を広く保つが、最終的には `test/browser/**` 中心へ収束させる。

### 完了条件

- `test/unit/**` が廃止または空に近づいている。
- 新規テストは責務に応じた正しいディレクトリへ配置される。
- WTR と Node テストの対象が名前どおりになっている。

## Phase 7. E2E の最終確認面整理

### 目的

Playwright を「Storybook 不足分の補完」ではなく、「実ページ統合の最終確認面」として確定します。

### 対象

- `test/e2e/**`
- `playwright.config.ts`

### 実施内容

1. no-JS baseline を明示的に固定する。
2. note 読書フローの代表ケースを固定する。
3. app shell / router / search / toc / sidebar など、実ページ統合を担う責務を明文化する。
4. print / forced-colors / reduced-motion は、壊れた際の影響が大きい outcome のみを最終確認する。
5. Storybook を経由せず、実ページ基準で最終確認する。

### 完了条件

- Playwright が統合確認の最終段として成立している。
- Storybook がなくても主要 UX の保全が説明できる。
- E2E が component contract の代替になっていない。

## Phase 8. Storybook の docs/smoke への縮退完了

### 目的

Storybook を設計どおり docs / catalog / manual QA / smoke の面へ収束させます。

### 対象

- `src/components/ui/**/**/*.stories.ts`
- `src/stories/**`
- `test/storybook/**`
- `vitest.config.ts`

### 実施内容

1. Storybook runtime の対象を限定された smoke story に固定する。
2. docs story と smoke story を明確に分ける。
3. interaction-heavy / boundary-heavy contract story を削除または縮退する。
4. foundations と layouts は docs/canvas 面として維持する。
5. Storybook の責務を逸脱する新規 story 契約追加を運用ルールで禁止する。

### 完了条件

- Storybook が docs 面として安定している。
- Storybook runtime の実行時間が大きく短縮されている。
- Story 変更が契約 failure に直接波及しにくい。

## 8. 受け入れ基準

## 8.1 必須条件

次をすべて満たした場合、移行完了とみなします。

1. note 最終 DOM 契約が Storybook 非依存で検証される。
2. enhancer / component browser behavior が `test/browser/**` を主戦場として検証される。
3. pure function / policy / parser 系テストが `test/node/**` を主戦場として検証される。
4. CSS 構造契約が `test/ssr/**` を主戦場として検証される。
5. Playwright が no-JS baseline と主要統合フローの最終確認を担う。
6. Storybook は docs / smoke / metadata に限定される。
7. `test/unit/**` を browser unit とみなす説明が文書から消えている。

## 8.2 運用条件

1. 各 failure がどの責務層の failure か説明できる。
2. story の増減や再配置が contract failure に波及しにくい。
3. preview order や title 配置が合否の正本でない。
4. 新規テスト追加時に置き場の判断がぶれない。
5. Storybook runtime 全件実行を常設ゲートで必要としない。

## 9. 変更対象ファイル

### 文書

- `docs/testing-taxonomy.md`
- 本計画書

### 実行設定

- `package.json`
- `vitest.config.ts`
- `web-test-runner.config.mjs`
- 必要に応じて `playwright.config.ts`

### Storybook taxonomy / meta

- `src/testing/story-taxonomy.ts`
- `test/storybook/story-taxonomy.test.ts`
- `test/storybook/story-discovery.test.ts`
- `test/storybook/story-import-boundaries.test.ts`
- 必要に応じて `.storybook/preview.ts`

### note contract 関連

- `src/stories/note-contracts/static-primitives.stories.ts`
- `src/stories/note-contracts/enhancers.stories.ts`
- `test/ssr/**`
- `test/browser/**`

### ディレクトリ責務再編

- `test/unit/**`
- `test/node/**`
- `test/browser/**`
- `src/**/*.test.ts`

### Story / Component

- `src/components/ui/**/**/*.stories.ts`
- `src/stories/**`

## 10. リスクと対策

### リスク1: 移行中に契約が二重化する

対策:

- 移した契約は同フェーズ内で Storybook 側から削除する。
- 二重保有期間を短く保つ。
- 「残す理由のない重複」は明示的に削る。

### リスク2: `test/unit/**` 分解が後回しになり、文書と実体が再びずれる

対策:

- Phase 0 で「現状は混在、目標は分離」と明記する。
- Phase 6 を任意ではなく必須フェーズとして扱う。
- 新規テストは移行完了前から `test/node/**` と `test/browser/**` に追加する。

### リスク3: Storybook 縮退で安心感が薄れる

対策:

- representative docs story を残す。
- smoke story は少数維持する。
- manual QA 用 story は削らず、契約正本からだけ外す。

### リスク4: CSS 契約が Node と browser に再分散する

対策:

- 構造検査 helper を `test/ssr/**` 側に集約する。
- outcome 検査は browser/E2E に限定する。
- computed style と rule existence を同じテストで扱わない。

### リスク5: taxonomy 変更で Storybook meta test が一時的に壊れる

対策:

- Phase 2 で taxonomy と meta test を同時に置き換える。
- 旧 taxonomy の削除を後回しにしない。
- preview order 依存と note-contract story 依存を同フェーズで外す。

## 11. 運用ルール

## 11.1 新しいテストを書く前の判断順

1. browser 実体なしで成立するか
2. final DOM / build-time / SSR 契約か
3. browser unit の観測対象か
4. app 全体統合か
5. docs / smoke に留めるべきか

## 11.2 Storybook への追加ルール

- Storybook は仕様決定の場として使わない。
- Storybook の `play` は docs 補助または限定 smoke に限る。
- CSS 構造契約を Storybook に追加しない。
- preview order や story title を契約正本にしない。
- private method / internals への依存を Story で行わない。

## 11.3 note 本文の契約ルール

- note 本文の最終 DOM 契約は `test/ssr/**` を正本とする。
- note enhancer / browser behavior は `test/browser/**` を正本とする。
- Storybook は note 契約の正本にならない。

## 11.4 ディレクトリ配置ルール

- 新規 pure logic test は `test/node/**`
- 新規 browser behavior test は `test/browser/**`
- build-time / final DOM / CSS structure は `test/ssr/**`
- app integration は `test/e2e/**`
- story metadata は `test/storybook/**`

## 12. 優先順位

最優先:

- Phase 0
- Phase 1
- Phase 2
- Phase 3

次点:

- Phase 4
- Phase 5

最後:

- Phase 6
- Phase 7
- Phase 8

理由は次のとおりです。

- まず Storybook を契約正本から外さない限り、以後の移送判断がぶれる。
- 次に runtime 縮小を先に効かせないと、移行期間中のコストが高止まりする。
- note contract と taxonomy を先に直さないと、Storybook 縮退後の運用が不安定になる。
- ディレクトリの物理再編は重要だが、責務境界が決まった後で行う方が安全である。

## 13. 完了判定

本計画は、次の状態に達した時点で完了と判定します。

- Storybook が docs / smoke / metadata の場として機能している。
- note contract の主戦場が `test/ssr/**` と `test/browser/**` に移っている。
- pure logic と browser logic が `test/node/**` と `test/browser/**` に分離されている。
- CSS 契約の構造検査が `test/ssr/**` に集約されている。
- E2E が no-JS baseline と主要統合フローの最終確認として成立している。
- story の変更や並び替えが contract failure に直接波及しにくい。
- 文書、スクリプト、ディレクトリ構成が同じ責務境界を指している。

## 14. 最終判断

Rouault における本移行は、Storybook を削るための作業ではありません。  
本質は、**static-first / final DOM 正本** という設計方針に対して、テスト面の責務境界を一致させることにあります。

したがって、本計画の成功条件は「Storybook が小さくなったこと」ではなく、次を同時に達成することです。

- 正本と検査面が一致していること
- browser contract が browser unit に戻っていること
- final DOM / build-time contract が Node 側で守られていること
- docs 面としての Storybook が軽く、安定し、説明責務に集中していること

Rouault の長期保守性を優先するなら、この再配線は段階的ではあっても必須です。