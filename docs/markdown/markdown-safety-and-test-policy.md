# Markdown Safety and Test Policy

## 概要

本書は、Rouault の Markdown 変換系における safety policy、trust boundary、既知制約の分類、および test policy の正本です。

本書は、何を危険入力とみなすか、どの段階で拒否するか、どの制約が設計上固定でどの制約が暫定実装か、どのテスト群が意味論を固定しているかを定義します。

---

## 1. 文書の目的

本書の目的は、Markdown 変換系について次を固定することです。

- safety 原則
- trust boundary
- 危険入力の禁止規則
- 既知制約の分類
- test policy
- テスト固定範囲
- 改訂時の運用規則

---

## 2. 適用範囲

本書は、Markdown 変換系全体に適用します。

対象:

- remark 段階の早期拒否
- rehype 段階の危険属性検査
- preview-sandbox の trust boundary
- 既知制約の分類
- テストによる契約固定

非対象:

- authoring grammar の詳細な属性一覧
- output component の詳細構造そのもの
- 個別 UI のアクセシビリティ要求一般

---

## 3. Safety 原則

### 3.1 raw HTML を許可しない

著者入力として raw HTML を許可してはなりません。これは危険入力の遮断だけでなく、契約外 DOM の混入防止も目的とします。

### 3.2 build-time rejection を優先する

危険入力や契約違反入力は、実行時に救済せず、build-time で拒否することを原則とします。

### 3.3 許可リスト方式

属性、URL scheme、style などは、原則として許可リスト方式で扱います。禁止リストだけに依存してはなりません。

### 3.4 trust boundary の明示

author input、generated intermediate representation、compiler-generated output、runtime helper を区別して扱わなければなりません。

### 3.5 最終出力不変条件

「著者入力では防いだはず」という前提だけに依存せず、最終 HAST でも危険状態が残っていないことを検査しなければなりません。

---

## 4. Trust Boundary

### 4.1 author input

著者が Markdown として記述する入力です。

規則:

- raw HTML を含めてはなりません。
- 契約外属性を含めてはなりません。
- preview-sandbox においても author が iframe `srcdoc` を直接供給する経路を持ってはなりません。

### 4.2 generated intermediate representation

remark から rehype に渡る中間表現です。

規則:

- authoring grammar から compiler 内部表現へ変換された段階であり、まだ最終 DOM ではありません。
- 互換入力吸収や正規化途中状態が存在してもよいですが、最終出力へ持ち越してはなりません。

### 4.3 compiler-generated output

コンパイラが safety policy に基づいて生成する出力です。

規則:

- compiler-generated output は author input と同一に扱ってはなりません。
- ただし、無制限に免責されるわけではなく、本書の trust boundary 契約に従わなければなりません。
- preview-sandbox の iframe `srcdoc` は、この区分に属します。

### 4.4 runtime helper

表示時に必要な platform helper script や補助ロジックです。

規則:

- author supplied JavaScript と混同してはなりません。
- helper の存在有無は author input の許可範囲を拡張する理由になりません。

---

## 5. 危険入力禁止規則

### 5.1 `on*` 属性

出力 DOM に `on*` 属性を残してはなりません。

### 5.2 `srcdoc`

規則:

- author input としての `srcdoc` は常に禁止します。
- 出力 DOM に `srcdoc` を残してよいのは、preview-sandbox が compiler-generated iframe を構成する場合に限ります。
- この例外は preview-sandbox 契約に明示された範囲へ限定します。

### 5.3 危険 URL scheme

少なくとも次の危険 URL は禁止します。

- `javascript:`
- `vbscript:`
- `data:`

規則:

- これらを UI へそのまま流してはなりません。
- `href`、`src`、類似属性において同様に適用します。

### 5.4 許可外 `style`

規則:

- 許可されていない `style` は禁止します。
- Markdown 変換系は arbitrary style injection を許可してはなりません。

### 5.5 許可例外

許可される例外は次に限定します。

1. KaTeX 配下の style
2. ordered list 契約で使う CSS カスタムプロパティ
   - `--ui-ol-counter-reset`
   - `--ui-ol-counter-step`
   - `--ui-ol-counter-set`

### 5.6 静的 `<mark>`

最終 HAST に静的 `<mark>` が残っていた場合はエラーとしなければなりません。

規則:

- 著者入力由来の raw `<mark>` は前段で既に拒否されている前提ですが、それだけで十分としてはなりません。
- 最終出力不変条件としても検査しなければなりません。

---

## 6. preview-sandbox の Trust Boundary

### 6.1 author supplied JavaScript

`allow-js` は author supplied JavaScript の注入可否だけを表します。

規則:

- `allow-js=false` の場合、author supplied JavaScript を注入してはなりません。
- `allow-js=false` を platform helper script の抑止と解釈してはなりません。

### 6.2 platform helper script

規則:

- 高さ同期等のための helper script は platform helper として扱います。
- これは author supplied JavaScript とは別概念です。
- helper の有無を author input の安全性緩和理由に使ってはなりません。

### 6.3 compiler-generated `srcdoc`

規則:

- compiler-generated iframe `srcdoc` は preview-sandbox 出力契約に従う限り許可します。
- author input として任意 `srcdoc` を持ち込める経路を作ってはなりません。
- safety policy で `srcdoc` を禁止していることと矛盾しないよう、例外の ownership を preview-sandbox 節へ限定しなければなりません。

---

## 7. 既知制約の分類

本章では、既知制約を「設計上固定」「暫定実装」「将来置換候補」に分類します。

### 7.1 設計上固定する制約

#### 7.1.1 raw HTML 禁止

raw HTML 禁止は設計原則であり、暫定制約ではありません。

#### 7.1.2 build-time rejection 優先

危険入力や契約違反入力を build-time で拒否する方針は設計上固定します。

#### 7.1.3 `tabs.url-sync`

`?tab=` 同期を URL 状態として持つこと自体は設計判断として維持してよいものとします。ただし、複数タブ系統対応は別論点です。

### 7.2 暫定実装上の制約

#### 7.2.1 `translation`

`translation` は block children を保持せず、1 段落目と 2 段落目のプレーンテキスト相当を `original` / `translated` へ昇格したあと `children: []` になります。

#### 7.2.2 `tabs`

`tabs` は `tab` / `panel` の個数整合まで検証しません。

#### 7.2.3 `code-preview` + `preview-sandbox`

`preview-sandbox` 利用時は、手書き `::preview` と手書き code area を禁止し、自動生成へ固定します。

#### 7.2.4 `tabs.url-sync` の単一系統想定

現在はページ主タブ 1 系統のみを想定し、複数 query key は導入していません。

### 7.3 将来置換候補の技術負債

#### 7.3.1 custom directive parser

ブロックディレクティブは paragraph テキストを自前解析しているため、micromark / `remark-directive` ベースの一般的な directive AST とは互換ではありません。

これは単なる制約ではなく、将来の置換候補として扱います。

評価:

- エコシステム互換性が弱い
- editor support と parser 合流性が弱い
- authoring grammar の正当性検証を内製ロジックへ寄せすぎる

### 7.4 分類運用規則

- 制約を列挙するだけでなく、設計固定か暫定か置換候補かを明示しなければなりません。
- 暫定実装の制約を、設計原則であるかのように記述してはなりません。
- 将来置換候補は、既知制約一覧の末尾に埋めず独立して扱うべきです。

---

## 8. Test Policy

### 8.1 テストは仕様固定の手段である

テストは実装確認だけでなく、意味論固定の手段です。仕様変更を伴う実装変更は、対応テストの更新を伴わなければなりません。

### 8.2 先にテスト、後で文書追従

戦略更新時は、先にテストを増やし、そのあと文書を追従させることを原則とします。

### 8.3 fixture と unit の責務分離

- grammar 受理可否は unit test または fixture test で固定してよいものとします。
- 出力 DOM 契約は output fixture または構造比較で固定してよいものとします。
- safety は禁止入力 fixture で固定してよいものとします。

### 8.4 決定性

同一入力に対して、出力 DOM、ID、正規化属性、エラー種別が不必要に揺れてはなりません。

---

## 9. 現在固定しているテスト

現状の仕様は、少なくとも次の単体テスト群で固定しているものとします。

1. `test/unit/remark-disallow-raw-html.test.ts`
2. `test/unit/remark-rouault-directives.test.ts`
3. `test/unit/rehype-heading-ids.test.ts`
4. `test/unit/rehype-rouault-components.test.ts`
5. `test/unit/rehype-disallow-dangerous-props.test.ts`

規則:

- これらは現行契約の主要固定点です。
- 仕様変更を行う場合、関係テストを更新せずに文書だけを改訂してはなりません。

---

## 10. 追加すべき固定テスト

### 10.1 link-card metadata resolution

少なくとも次を固定すべきです。

- 著者指定優先
- metadata cache フォールバック
- host 名フォールバック
- 自動 link-card 化条件
- `clickable` 非混入

### 10.2 preview-sandbox trust boundary

少なくとも次を固定すべきです。

- `allow-js=false` で author supplied JavaScript が注入されないこと
- platform helper script の扱い
- compiler-generated `srcdoc` だけが許可されること
- 手書き preview/code area が禁止されること

### 10.3 ordered list contracts

少なくとも次を固定すべきです。

- `data-marker-digits`
- CSS カウンター変数転写
- `role="list"` / `role="listitem"`
- `data-ol-has-value`
- 許可 style 一覧

### 10.4 static mark invariant

少なくとも次を固定すべきです。

- 最終 HAST に静的 `<mark>` が残るとエラーになること
- 互換入力が正規属性へ収束すること

### 10.5 `translation` / `tabs`

少なくとも次を固定すべきです。

- `translation` が children を保持しない現状
- `tabs` が個数整合を検証しない現状
- `tabs.url-sync` が単一系統想定である現状

### 10.6 media manifest / eager policy

少なくとも次を固定すべきです。

- image manifest の schema/version 不一致で build-time error になること
- required variant 欠落で build-time error になること
- production では manifest 欠損を fail-closed にすること
- local dev では `content/_assets` への fail-open を許可すること
- 本文画像の `loading="eager"` が 1 枚を超えると error になること

---

## 11. 仕様変更時の運用規則

### 11.1 safety 変更

危険入力の定義、許可 style、trust boundary の変更は、本書を直接改訂しなければなりません。

### 11.2 既知制約の変更

既知制約の分類変更は、単なるメモ更新ではなく意味論上の運用変更として扱います。

### 11.3 テスト固定範囲の変更

テスト固定範囲の増減は、本書と実テストの双方を更新しなければなりません。

### 11.4 preview-sandbox 例外の変更

`srcdoc` や helper script の扱いを変更する場合は、本書と `docs/markdown-output-contract.md` を同時に改訂しなければなりません。

---

## 12. 他文書との関係

- authoring grammar は `docs/markdown-authoring-specification.md` が所有します。
- 出力 DOM 契約は `docs/markdown-output-contract.md` が所有します。
- 本書は safety、trust boundary、既知制約分類、test policy を所有します。
- アクセシビリティ要求は `docs/accessibility.md` を参照します。

規則:

- 本書は authoring grammar や output contract の詳細正本を兼ねてはなりません。
- ただし、安全上の理由で必要な境界規則は本書に記載してよいものとします。

---

## 13. 改訂規則

- safety policy の意味論変更は本書を直接改訂しなければなりません。
- テストだけを変更して safety policy を既成事実化してはなりません。
- 本書だけを更新して実装やテストを追従させない状態を長期間放置してはなりません。
- 暫定実装の制約を設計上固定へ昇格させる場合は、その理由を分類変更として明記しなければなりません。
