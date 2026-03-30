# `content/testing/test.md` 再設計後に残る未解決問題一覧

## 0. 本書の目的

本書は、`content/testing/test.md` 廃止後の Rouault において、**長期保守性の観点からまだ解消されていない問題だけ**をテーマ別に列挙するための文書です。

本書は、再設計案そのものを提案する文書ではありません。採用済みの設計や実装済みの変更を再説明することも目的としません。扱うのは、次のいずれかに該当する事項だけです。

1. 実装と仕様文書のあいだに不整合がある問題
2. 仕様文書自身の正本境界が曖昧な問題
3. 暫定実装のまま残っており、今後どこかで設計判断が必要な問題
4. 採用済みアーキテクチャを実装が部分的に破っている問題
5. 診断機構は存在するが、受け入れ基準や運用規約が未固定な問題

本書は「将来やるかもしれない改善案の候補集」ではありません。各問題について、**現在何が未解決で、何を決めれば完了とみなせるか**を曖昧さなく明示します。

---

## 1. この文書自身の扱い

### 1.1 本書は「再設計案」ではなく「未解決問題一覧」として扱う

#### 現在の状態

- `content/testing/test.md` の分割、`kind + testingArea` 導入、`example-include`、`testing/sandbox` での `preview-sandbox` 許可、Storybook との shared example source は、すでに採用済みです。
- 一方で、旧文書は「調査結果」「再設計の基本方針」「実装順序の提案」を同居させており、**採用済み事項、歴史的な検討経緯、未解決事項**が同じ文体で混在していました。
- その構成では、読者が「何が現行の正本か」「何が過去の提案か」「何が未解決か」を一読で判断できません。

#### 未解決の問題

この文書種別の役割が曖昧なままだと、将来の更新で次の混線が再発します。

- 実装済みの決定事項を、未採用の設計案として誤読する
- 過去の計画を、現行契約として引用してしまう
- 未解決事項の追跡が、背景説明の中へ埋没する

#### 本書で固定すること

- 本書は、**未解決問題の一覧**だけを所有します。
- 採用済みの公開契約は、本書ではなく各 SoT 文書またはコードを正とします。
- 履歴説明や採用済み設計の背景説明は、本書の主目的にしません。

#### 完了条件

次の 3 点を同時に満たした時点で、この問題は解消とみなします。

1. 本書に採用済みアーキテクチャの長い再説明が残っていないこと
2. 各未解決問題に対して、所有文書または所有実装が明示されていること
3. 本書を読んだだけで「未解決事項だけ」が一覧できること

#### 関連 SoT / 実装

- `docs/markdown/markdown-overview.md`
- `docs/markdown/markdown-authoring-specification.md`
- `docs/markdown/markdown-output-contract.md`
- `docs/markdown/markdown-safety-and-test-policy.md`

---

## 2. 文書正本の整合性に関する未解決問題

### 2.1 `tabs` の build-time 検証範囲と recoverable 挙動の位置づけが SoT 間で不整合のまま残っている

#### 現在の状態

- `docs/markdown/markdown-safety-and-test-policy.md` は、`tabs` について次を build-time で検証すると記述しています。
  - `tab` / `panel` の個数整合
  - `tab.value` の一意性
  - `selected-value` / `default-selected-value` の参照整合
- `lib/remark/directives/validator/validate-structure.ts` の実装も、実際にこれらを検証しています。
- しかし `docs/markdown/markdown-authoring-specification.md` の 10.2 には、`tabs` は slot 属性付与までを担い、**個数整合までは検証しない**という記述が残っています。
- さらに `docs/design-system/components/tabs.md` には、`tab` 数と `panel` 数が不一致でも `min(tab 数, panel 数)` 件で**回復的に動作する runtime 契約**が記述されています。
- `docs/markdown/note-authoring-guide.md` も `tabs` の運用上の注意を説明していますが、**build-time rejection の責務境界**までは authoritative に固定していません。

#### 未解決の問題

現在は、**同じ `tabs` 契約について、文書ごとに異なる責務境界が記述されている**状態です。

曖昧なのは単に「どの文言を採るか」ではありません。曖昧なのは、次のどこを正本とみなすかです。

1. 実装
2. Markdown authoring / safety SoT
3. component 契約
4. author 向け guide

この曖昧さは単なる文書表現の問題ではありません。`tabs` の構造違反を

- authoring error として build-time で拒否するのか
- component 側の recoverable runtime 挙動として扱うのか

という**責務境界そのもの**に関わります。

#### 本書で固定すること

- この問題の本質は、`tabs` の仕様が未定なのではなく、**正本どうしが build-time rejection と recoverable runtime の位置づけを一致させていないこと**です。
- したがって必要なのは説明追加ではなく、**authoring / safety / component contract / author guide の一本化**です。

#### 完了条件

次の 5 点を同時に満たした時点で、この問題は解消とみなします。

1. `docs/markdown/markdown-authoring-specification.md` の `tabs` 記述が、実装と同じ build-time 検証範囲を記述していること
2. `docs/markdown/markdown-safety-and-test-policy.md` と矛盾しないこと
3. `docs/design-system/components/tabs.md` が recoverable runtime 挙動を**authoring 正規契約の代替**として読めないこと
4. `docs/markdown/note-authoring-guide.md` が上記 3 文書と矛盾しない運用記述へ揃っていること
5. 対応 fixture / unit test / Storybook 上の検証対象が文書に明示されていること

#### 関連 SoT / 実装

- `docs/markdown/markdown-authoring-specification.md`
- `docs/markdown/markdown-safety-and-test-policy.md`
- `docs/design-system/components/tabs.md`
- `docs/markdown/note-authoring-guide.md`
- `lib/remark/directives/validator/validate-structure.ts`
- `test/unit/remark-rouault-directives.test.ts`

---

## 3. Markdown 基盤に関する設計固定事項

### 3.1 custom directive parser は Rouault 固有 grammar の正本として恒久採用する

#### 現在の状態

- Rouault の block directive は、paragraph text を自前解析する独自 parser で受理しています。
- 現行実装は、開始 marker / 終端 marker / folded paragraph 互換 / 属性解析 / ネスト終端探索を、Rouault 専用の parser core によって処理しています。
- したがって現行の Markdown 基盤は、一般的な `micromark` / `remark-directive` ベースの directive AST を中核契約として採用していません。

#### 本書で固定すること

- Rouault は、custom directive parser を**将来置換候補ではなく設計固定**として採用します。
- Rouault の directive grammar は、一般的な directive AST 互換よりも、**authoring 契約・build-time validation・静的出力契約との一体性**を優先します。
- したがって、Rouault の directive は Markdown エコシステム一般との parser 互換を目的としません。
- editor support・lint・fixture・test・authoring guide は、今後すべて **Rouault 固有 grammar** を正本として構成しなければなりません。

#### 設計固定の意味

この決定は、単に「今の実装を当面維持する」という意味ではありません。意味するのは次の 4 点です。

1. block directive の受理規則は Rouault 独自 parser core が所有すること
2. block directive が独立 paragraph として存在する場合と、単一 paragraph 内の改行列として畳まれる場合の両方を、Rouault grammar の正式互換として扱うこと
3. `remark-directive` AST 互換を提供しないことを、制約ではなく設計選択として明示すること
4. 周辺機能は「いつか標準 parser へ寄せる前提」ではなく、「独自 parser を正本とする前提」で整備すること

#### 非目標

次の事項は、この契約の非目標として明示します。

- 一般的な `remark-directive` AST 互換の提供
- 外部 Markdown tooling との parser レベルの透過的相互運用
- directive grammar の意味論を汎用 Markdown 拡張へ還元すること
- 標準系 parser へ将来移行することを前提にした互換維持

#### 保守上の要求

独自 parser を恒久採用する以上、次の責務を Rouault 側で負います。

1. authoring grammar の authoritative source を SoT に明記すること
2. parser core の受理規則と fixture 群を 1 対 1 で対応づけること
3. editor support / lint / diagnostics を独自 grammar 前提で整備すること
4. directive を追加するたびに、grammar・payload・validator・output adapter・fixture を同時に更新すること
5. 外部エコシステム非互換を「既知制約」ではなく「設計固定」として説明すること

#### 完了条件

次の 5 点を同時に満たした時点で、この設計固定は完了とみなします。

1. `docs/markdown/markdown-safety-and-test-policy.md` が custom directive parser を「将来置換候補」ではなく設計固定として記述していること
2. `docs/markdown/markdown-authoring-specification.md` が `remark-directive` AST 非互換を制約ではなく正式契約として記述していること
3. parser core が受理する folded paragraph 互換・終端規則・属性規則が SoT に反映されていること
4. editor support・lint・fixture・unit test の前提が独自 parser 採用で統一されていること
5. 新規 directive 追加時に従う更新単位（grammar / payload / validator / output adapter / test）が保守規約として明文化されていること

#### 関連 SoT / 実装

- `docs/markdown/markdown-authoring-specification.md`
- `docs/markdown/markdown-safety-and-test-policy.md`
- `lib/remark/directives/parser-core/parse-directive-nodes.ts`
- `lib/remark/directives/parser-core/parse-directive-line.ts`
- `lib/remark/directives/parser-core/expand-folded-paragraph.ts`
- `lib/remark/directives/parser-core/scan-block-markers.ts`
- `lib/remark/directives/index.ts`
- `test/unit/remark-rouault-directives.test.ts`

---

## 4. authoring 意味論に関する未解決問題

### 4.1 `translation` / `translation-overlay` の本文意味論が暫定仕様のまま残っている

#### 現在の状態

- 現行仕様では、`translation` / `translation-overlay` は block children を最終的に保持しません。
- 子要素から取り出すのは 1 段落目と 2 段落目の**プレーンテキスト相当**であり、`original` / `translated` へ昇格したあと `children: []` になります。
- この制約は `docs/markdown/markdown-safety-and-test-policy.md` で暫定実装として明示されています。
- さらに現行 Rouault では translation は **static-first** であり、`translation` は `div.translation-static[data-translation-kind="static"]` へ、`translation-overlay` は `ui-translation[surface]` へ分岐します。
- したがって、この問題は `ui-translation` 単体の問題ではなく、**remark payload 正規化・出力 adapter・static output contract・overlay component contract** にまたがる問題です。

#### 未解決の問題

未解決なのは、`translation` の UI 種別ではありません。未解決なのは、**translation が保持してよい本文意味論を最終的にどこまで許すか**です。

現状のままだと、次の内容は正規契約として表現できません。

- 原文側に inline markup を持つケース
- 訳文側に脚注・強調・ルビ・リンクなどを含むケース
- 2 段落を超える対応関係
- AST レベルで保持したい対応関係

つまり、今の `translation` は「plain text 2 片の対置」には使えますが、**構造化された bilingual content の正規契約にはなっていません。**

加えて、現状の関連責務は次の 2 系統に分かれています。

1. `translation` を static translation としてどう出力するか
2. `translation-overlay` を overlay component としてどう運用するか

この二系統を分けて扱わないと、問題が overlay 実装の都合に見えてしまい、**static translation 側の契約未確定**が見えなくなります。

#### 本書で固定すること

- この問題は performance 問題ではなく、**authoring 意味論と出力契約の未確定**として扱います。
- `translation` を今のまま使い続ける場合でも、「何を意図的に捨てているのか」を永久に曖昧にしてはなりません。
- とくに static translation の契約を overlay component の副作用として説明してはなりません。

#### 完了条件

次のどちらか一方を採用した時点で、この問題は解消とみなします。

##### 完了条件 A: plain-text translation として固定する場合

1. `translation` / `translation-overlay` は plain-text 2 片のみを扱うと SoT に明記すること
2. block children 受理を互換経路ではなく縮退経路として扱い、将来廃止可否を判断すること
3. static translation と overlay translation の両方で、plain-text 制約を同じ契約として明記すること
4. rich content を扱う場合は別 directive または別 grammar が必要だと明示すること

##### 完了条件 B: 構造化 translation へ拡張する場合

1. `original` / `translated` を文字列属性ではなく構造化 child AST として保持する方針を採用すること
2. static translation と overlay translation の両方で、どの構造を許すかを SoT へ明記すること
3. remark payload / output adapter / output contract / component contract を同時に改訂すること
4. a11y contract と test fixture を再定義すること

#### 関連 SoT / 実装

- `docs/markdown/markdown-authoring-specification.md`
- `docs/markdown/markdown-safety-and-test-policy.md`
- `docs/markdown/markdown-output-contract.md`
- `docs/design-system/components/translation.md`
- `lib/remark/directives/payload/normalize-translation-payload.ts`
- `lib/remark/directives/output/adapt-directive-output.ts`
- `test/unit/remark-rouault-directives.test.ts`
- `src/components/ui/translation/translation.ts`
- `src/components/ui/translation/translation-orchestrator.ts`

### 4.2 `tabs.url-sync` の URL 状態モデルは単一主タブ制約を恒久採用する

#### 決定

Rouault における `tabs.url-sync` は、**1 文書につき 1 系統の主タブだけ**に許可する恒久制約として採用します。  
複数 query key を用いた複数系統 URL 同期は採用しません。

#### この決定を採る理由

Rouault の `tabs.url-sync` は、単なる UI 部品の補助機能ではありません。現行実装では次の責務と結合しています。

- `?tab=` を用いた主タブ状態の URL 同期
- primary tab 差分のみを対象とする state-only navigation
- `ui-tabs[url-sync]` を前提にした router policy
- `data-toc-scope` と scopeSelections を用いた TOC 可視見出し制御

この構成において複数系統 URL 同期を許可すると、次の責務境界が一斉に不安定になります。

- query key 命名規則
- tabs scope と URL 状態の対応
- same-document navigation 判定
- deep link と tab state 復元順序
- TOC 側の visible heading 解決規則

Rouault は没入して読むための note application であり、共有 URL が表す状態は最小限でなければなりません。  
そのため URL に昇格させる状態は **ページ主タブ 1 系統のみ**とし、それ以外の tabs は文書内局所状態として扱います。

#### 正式契約

- `url-sync` は、ページ主タブ 1 系統にのみ使用しなければなりません（MUST）。
- 同一文書内で 2 系統目以降の `url-sync` を許可してはなりません（MUST NOT）。
- `url-sync` が表す URL query parameter は `tab` に固定し、名前空間化や複数 key 導入は行いません。
- URL 同期されない tabs は、`selected-value` / `default-selected-value` による局所状態として扱います。
- TOC 連動が必要な場合は、URL 同期ではなく `data-toc-scope` と scopeSelections により扱います。
- 入れ子 tabs や補助的 tabs は、URL 状態を所有してはなりません。

#### build-time / authoring 規約

- 同一文書内に `url-sync` を持つ `tabs` が複数存在する場合は build-time error とします。
- build-time diagnostics は、「`url-sync` は主タブ 1 系統のみ許可される」ことを明示しなければなりません。
- authoring guide は、主タブ以外で `url-sync` を使わないこと、代わりに `selected-value` / `default-selected-value` / `data-toc-scope` を使うことを明示しなければなりません。

#### この決定によって明確になる責務境界

- URL に載る tabs 状態は `?tab=` の 1 系統のみ
- router の state-only navigation 最適化対象は primary tab 差分のみ
- TOC 可視見出し制御は `data-toc-scope` を用いた局所的 scope 解決として扱う
- 複数独立 tabs の状態保存は URL 契約ではなく component 局所状態の責務とする

#### 完了条件

次の 5 点を同時に満たした時点で、この決定は実装・文書の両面で完了とみなします。

1. `url-sync` は 1 文書につき 1 系統のみ許可することを SoT に明記していること
2. 2 系統目以降の `url-sync` を build-time error にしていること
3. TOC・router・authoring guide・component contract の全てが同じ単一主タブ制約を記述していること
4. URL 同期されない tabs の正規経路として、`selected-value` / `default-selected-value` / `data-toc-scope` の使い分けが SoT に明記されていること
5. fixture / unit test / Storybook が、単一主タブ制約と複数 `url-sync` 拒否を検証していること

#### 関連 SoT / 実装

- `docs/markdown/markdown-authoring-specification.md`
- `docs/markdown/markdown-safety-and-test-policy.md`
- `docs/design-system/components/tabs.md`
- `docs/markdown/note-authoring-guide.md`
- `docs/router-specification.md`
- `docs/design-system/patterns.md`
- `src/components/app/navigation/primary-tab-url-state.ts`
- `src/components/app/navigation/primary-tab-navigation-policy.ts`
- `src/components/app/app-router.ts`
- `src/components/ui/tabs/tabs-url-sync-strategy.ts`
- `src/lib/toc/filter-visible-headings.ts`
- `test/unit/primary-tab-url-state.test.ts`
- `test/unit/primary-tab-navigation-policy.test.ts`
- `test/unit/app-router.test.ts`
- `test/unit/filter-visible-headings.test.ts`

### 4.3 `tabs.url-sync` の ownership boundary は component 境界までに限定し、router / history.state は router が所有する

#### 現在の状態

- `docs/design-system/components/tabs.md` は、`urlSync` が所有するのは `?tab=` とホスト配下ハッシュ解決までであり、**フレームワーク固有の `history.state` 形式までは所有しない**と記述しています。
- しかし現行実装では、`src/components/ui/tabs/tabs.ts` の `createHistoryStateForUrl()` が `history.state` に `__routerUrl` と `__routerPath` を書き込みます。
- `src/lib/router/location-adapter.ts` および `src/lib/url-hash.ts` も同系統の state shape を前提としており、tabs の URL 同期と router 内部 state が事実上結合しています。
- つまり現状は、component 契約では router 固有 state を所有しないとしながら、実装では `ui-tabs` が router 依存の state shape を部分的に生成している状態です。

#### 未解決の問題

未解決なのは、単一主タブか複数系統かという問題ではありません。未解決なのは、**`tabs.url-sync` の ownership boundary をどこまでに限定するかが、文書・実装・router 契約で一致していないこと**です。

このままだと、次の責務境界が曖昧なまま残ります。

- `ui-tabs` が所有する URL 同期
- router が所有する location / history state 正規化
- framework 依存 state shape の進化責任
- tabs 単体利用時に前提としてよい環境条件

とくに問題なのは、`ui-tabs` が router を直接所有していないにもかかわらず、router 固有の `history.state` shape を自前生成していることです。これは、component が application integration の内部表現へ立ち入っている状態であり、長期保守性の観点から境界が不適切です。

#### 本書で固定すること

- この問題は URL 状態モデル一般の話ではなく、**ownership boundary の逸脱**として扱います。
- Rouault では、`tabs.url-sync` の ownership を **component 境界まで**に限定します。
- `ui-tabs` は `?tab=` と hash 解決に関わる URL 同期要求までは所有してよいが、router 固有の `history.state` key / shape / versioning responsibility は所有しません。
- `history.state` の生成・正規化・互換維持は router abstraction 側が所有し、tabs からは opaque に扱える API 越しにのみ利用できるものとします。
- したがって、この問題の解消は router 結合契約の明文化ではなく、**component 境界の回復**によって達成します。

#### 完了条件

次の 5 点を同時に満たした時点で、この問題は解消とみなします。

1. `ui-tabs` が router 固有の `history.state` shape を直接生成しないこと
2. URL 正規化または state 付与が必要な場合、tabs からは opaque な router abstraction を介して行うこと
3. `docs/design-system/components/tabs.md` が、`ui-tabs` の ownership を `?tab=` と hash 解決までに限定した component contract として記述していること
4. `docs/router-specification.md` が、`history.state` の key / shape / 正規化責務を router 側の契約として記述していること
5. router 側の state shape 変更が、tabs 実装変更を必須にしないことを test と実装境界の両方で確認できること

#### 関連 SoT / 実装

- `docs/design-system/components/tabs.md`
- `docs/router-specification.md`
- `src/components/ui/tabs/tabs.ts`
- `src/components/ui/tabs/tabs-url-sync-controller.ts`
- `src/lib/router/location-adapter.ts`
- `src/lib/url-hash.ts`

---

## 5. hydration / runtime に関する未解決問題

### 5.1 `ui-tabs` の hydration ownership と trigger 契約が SoT / build-time 注釈 / bootstrap 実装で不整合のまま残っている

#### 現在の状態

- note ページの hydration は、`data-hydration-capability` / `data-hydration-trigger` と registry / planner / scheduler に基づく段階実行へ移行済みです。
- `src/client/hydration/registry.ts` には `ui-tabs` の loader が定義されています。
- しかし `src/client.ts` では、`./components/ui/tabs/tabs.js` をトップレベルで direct import しています。
- さらに `docs/markdown/markdown-output-contract.md` では、`ui-tabs` は note 本文で `interactive` + `visible` として記述されています。
- 一方で、実際の build-time 注釈を付与する `lib/rehype/rouault-components.ts` の `resolveHydrationDirective()` は、`ui-tabs` に対して `interactive` + `initial` を付与しています。
- 加えて `docs/design-system/components/tabs.md` は、未 hydration 状態では選択タブの境界線を使った視覚フォールバックが成立すると記述していますが、現行の `ui-tabs` 契約は role / `aria-controls` / `aria-labelledby` / `aria-selected` / `tabindex` / `hidden` / `aria-hidden` / `data-panel-active` といった対話成立上重要な属性を component 側で所有しています。
- したがって現状は、`ui-tabs` について **SoT 上は `visible`、build-time 注釈上は `initial`、bootstrap 実装上は eager import** という三重不整合が残っています。

#### 未解決の問題

未解決なのは、単に `src/client.ts` に direct import が残っていることだけではありません。未解決なのは、**`ui-tabs` の hydration ownership と trigger 契約が 1 系統に統一されていないこと**です。

現在のままだと、次の責務境界が曖昧なまま残ります。

- `ui-tabs` の読み込みを hydration scheduler が所有するのか、client bootstrap が所有するのか
- `ui-tabs` を note 本文で `visible` 起動対象として扱うのか、`initial` 起動対象として扱うのか
- hydration diagnostics / budget が測っている対象に、`ui-tabs` の実コストが含まれているとみなしてよいのか
- `ui-tabs` を note 本文 widget の一種として扱うのか、shell-critical な例外コンポーネントとして扱うのか

とくに問題なのは、現行の `ui-tabs` が未 upgrade 状態で完全な tabs 契約を静的に成立させているわけではないにもかかわらず、文書上は `visible` 起動として読めることです。これでは、**未 hydration 時の静的フォールバック**と**hydration 後に成立する完全な対話契約**の境界が曖昧になります。

#### 本書で固定すること

- この問題は performance の局所論ではなく、**hydration ownership と trigger 契約の不整合**として扱います。
- Rouault では、`ui-tabs` の loading ownership を **hydration registry / planner / scheduler の 1 系統**へ統一します。
- ただし、現行の `ui-tabs` 契約を維持する限り、note 本文での `ui-tabs` は `visible` ではなく **`interactive` + `initial`** を正規契約とします。
- つまり解消すべきなのは、「`ui-tabs` を scheduler 管理に寄せること」と、「SoT / build-time 注釈 / bootstrap 実装の trigger 記述を `initial` へ揃えること」です。
- 将来 `ui-tabs` を本当に `visible` 起動へ移す場合は、先に **非 hydration 状態でも selected panel / hidden / ARIA 契約が静的に成立する output contract** を別問題として確立しなければなりません。
- したがって、この問題の解消は `visible` 方針の維持ではなく、**scheduler ownership への一本化と `initial` 契約への正規化**によって達成します。

#### 完了条件

次の 6 点を同時に満たした時点で、この問題は解消とみなします。

1. `src/client.ts` から `./components/ui/tabs/tabs.js` の direct import を除去すること
2. `ui-tabs` の loading ownership を hydration registry / planner / scheduler のみに統一すること
3. `docs/markdown/markdown-output-contract.md` と `lib/rehype/rouault-components.ts` の `ui-tabs` hydration trigger 記述を一致させること
4. 現行の tabs 契約を維持する限り、note 本文の `ui-tabs` を `interactive` + `initial` として SoT に明記すること
5. scheduler 経由で hydrate された `ui-tabs` について、初期選択・ARIA・panel 可視状態・URL 同期が成立することを unit test / integration test で固定すること
6. 将来 `visible` へ移行する場合に必要な前提を、「非 hydration 状態で成立すべき static tabs contract の導入が先である」と SoT に明記すること

#### 関連 SoT / 実装

- `docs/markdown/markdown-output-contract.md`
- `docs/design-system/components/tabs.md`
- `src/client.ts`
- `src/client/hydration/registry.ts`
- `src/client/hydration/scheduler.ts`
- `lib/rehype/rouault-components.ts`
- `src/components/ui/tabs/tabs.ts`

### 5.2 hydration diagnostics は存在するが、note ページの受け入れ基準が未固定である

#### 現在の状態

- `src/client/hydration/diagnostics.ts` と `src/client/hydration/scheduler.ts` は、`HydrationDiagnostics` を集計し、`app-router:hydration-diagnostics` を dispatch します。
- degraded 時は localhost で warning も出ます。
- しかし現行 repo には、note ページについて次を authoritative に定めた文書がありません。
  - 初回 hydrate 対象件数の上限
  - trigger ごとの件数予算
  - initial / post-commit / visible / interaction の配分基準
  - CI で落とすべき閾値
  - regression 判定の正式手順

#### 未解決の問題

未解決なのは diagnostics の有無ではありません。未解決なのは、**どの状態を「劣化」とみなして開発上拒否するかが未固定であること**です。

このままだと、diagnostics は観測情報として存在しても、保守上の拘束力を持ちません。つまり、

- warning は出るが失敗にはならない
- 数値は取れるが比較基準がない
- 「以前より重い」を機械的に判定できない

という状態が続きます。

#### 本書で固定すること

- note ページの hydration / performance は、観測できるだけでは不十分です。
- **受け入れ基準と failure 条件**が別途必要です。

#### 完了条件

次の 5 点を同時に満たした時点で、この問題は解消とみなします。

1. note ページ向けの performance / hydration budget を SoT に記述すること
2. `degraded` のみではなく、閾値超過を build / test / CI の失敗条件へ接続すること
3. どのメトリクスを commit gate に使うかを固定すること
4. dev 診断と CI 診断の役割分担を明示すること
5. representative な reader note / testing note に対する回帰検知経路を固定すること

#### 関連 SoT / 実装

- `src/client/hydration/diagnostics.ts`
- `src/client/hydration/scheduler.ts`
- `test/unit/hydration-scheduler.test.ts`
- `docs/router-specification.md`

---

## 6. この文書に含めない事項

次の事項は、現時点では本書の未解決問題一覧には含めません。

1. すでに実装済みで、SoT と実装の整合が取れている事項
   - `content/testing` の分割
   - `kind + testingArea`
   - `example-include`
   - `preview-sandbox` の `testing/sandbox` 制約
   - code 系の static-first 化
   - TOC / translation orchestrator の導入そのもの

2. 将来拡張の候補ではあるが、現時点で repo 内に「問題として残っている」とまでは言えない事項
   - 画像配信基盤の外部 object storage 化
   - CDN ベンダー差し替え
   - demo 環境の追加展開形態

3. 既存の設計方針として明確に reject 済みの事項
   - raw HTML 許可
   - build-time rejection の放棄
   - `reader` での sandbox 実行常態化

---

## 7. 優先順位

長期保守性の観点からの優先順位は、次の順で固定します。

1. **custom directive parser の置換方針決定**
2. **SoT 文書間の不整合解消（とくに `tabs` の build-time rejection と recoverable runtime の位置づけ）**
3. **`translation` の本文意味論の最終決定**
4. **`tabs.url-sync` の単一系統制約を恒久化するか、複数系統へ拡張するかの決定**
5. **`tabs.url-sync` の ownership boundary を component / router / history.state のどこまでに限定するかの決定**
6. **`ui-tabs` の hydration ownership 一本化**
7. **hydration / performance budget の SoT 化と CI 接続**

この順序を崩して周辺改善だけを先行すると、基盤と契約の曖昧さを温存したまま局所最適化だけが進むため、長期保守性は改善しません。
