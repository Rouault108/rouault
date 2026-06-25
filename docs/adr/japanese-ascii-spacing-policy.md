# 日本語本文における和欧間スペース方針

## メタデータ

- Decision Record ID: DR-JA-ASCII-SPACING-001
- 対象Request ID: REQ-JA-ASCII-SPACING-001
- R段階/Aレベル: R4/A0
- 採用Decision ID: DEC-JA-ASCII-SPACING-001
- Workflow: feature-change

## Evidence

- 現行README、About、Guideなどに「Rouaultは」「Markdownを」「UIはLitとTypeScriptで実装」のようなスペースなし表記が多い。
- 一方で、現行docsには「Markdown入力記法」「CommonMarkを」「生HTML」「Design System契約」などの表記揺れがある。
- JTF系の日本語スタイルでは、半角文字と全角文字の間に半角スペースを入れない方針が成立する。
- MDN日本語翻訳ガイドなど、半角スペースを入れるスタイルも存在するため、これは絶対的な正誤ではなくRouault内スタイル選択である。
- 本変更では本文データの表記方針だけを扱い、CSSによる和欧間アキ調整は扱わない。

外部スタイルガイドはRouault契約の根拠補助であり、Rouault契約そのものを上書きする根拠として扱わない。

- JTF日本語標準スタイルガイド、参照日:2026-06-25
- MDN Web Docs日本語翻訳ガイド、参照日:2026-06-25

## 採用仕様

Rouaultの日本語本文、公開コピー、docs、contentでは、和文中の半角英数字と日本語文字の境界に、原則としてU+0020の半角スペースを入れない。

採用例:

```text
Rouaultは
Markdownを
CommonMarkを
UIはLitとTypeScriptで実装
CC BY 4.0の対象外
Design System契約
Markdown出力層
GFM表
表セル内
```

保持するもの:

```text
英語正式名称の内部スペース
書名・論文名・規格名・製品名の内部スペース
ライセンス名の内部スペース
コード・コマンド・URL・ファイルパス・識別子の内部スペース
引用文の原表記
外部ソース由来の表記
数値と単位の内部スペース
Markdown構文上必要なスペース
Markdown表のpipe delimiter周辺padding space
```

inline code内部は変更しない。ただし、inline code spanと和文助詞・和文説明の境界にある説明用スペースは、Markdown構文を壊さない範囲で削除する。

## 棄却案

### 棄却案1:現状の表記揺れを許容する

棄却理由:README、docs、About、contentで方針が揺れ続け、今後の執筆・レビュー・検査の基準が曖昧になる。

### 棄却案2:英数字と日本語の境界に半角スペースを入れる方針へ変更する

棄却理由:現行実装・現行文体は「Rouaultは」「Markdownを」「UIはLitとTypeScriptで実装」のようなスペースなし表記が主流であり、逆方向の全面移行は文体・既存コンテンツへの影響が大きい。

### 棄却案3:`text-autospace`などCSSで同時に和欧間アキを調整する

棄却理由:今回の主題は本文データと執筆方針の統一であり、表示層のタイポグラフィ変更を混ぜるとChange境界が不明確になる。CSS、font、letter-spacing、line-heightは今回対象外とする。

### 棄却案4:全候補を機械置換でゼロ化する

棄却理由:書名、製品名、ライセンス名、引用、コード例、URL、workflowテンプレート、書誌データを破壊するリスクが高い。例外を残す設計が必要である。

## 反対仮説

### 反対仮説1

和欧間に半角スペースを入れたほうが可読性が高いのではないか。

退ける理由:Rouaultでは本文資産の一貫性と静かな読書体験を優先する。可読性が問題になる場合でも、本文データへU+0020を挿入するのではなく、将来の表示層検討として別Changeで扱う。

### 反対仮説2

全体統一ならすべての半角スペース候補をfail対象にすべきではないか。

退ける理由:`content/library/**`や`docs/workflows/**`には正式名称、書誌表、テンプレート、コード例が多く、初回から全体fail化すると偽陽性が多い。fail対象とreport-only対象を分離する。

### 反対仮説3

`docs/workflows/**`も自然な日本語へ言い換えるべきではないか。

退ける理由:workflow文書はChatGPT/Codex運用の手順正本であり、表記統一のために手順、ID、テンプレート意味を変更してはいけない。workflow Phaseでは言い換えを禁止する。

## 契約影響

- URL/routing/permalink:影響なし
- DOM構造:影響なし
- CSS/typography:影響なし
- Markdown parser/remark/rehype:影響なし
- content schema/frontmatter key:影響なし
- hydration marker/data contract/custom event:影響なし
- アクセシビリティ意味:原則影響なし。ただしaria-label等の表示文言を修正する場合は、意味が変わっていないことを確認する。

## 削除・移行・非推奨化の扱い

Delete / Breaking Change Gateは不要。

理由:削除、破壊的変更、移行、非推奨化、公開契約変更を伴わない。

## 互換性影響

削除、破壊的変更、移行、非推奨化、公開契約変更を伴わない。

## Rouault固有契約影響

Rouaultの日本語本文、公開コピー、docs、contentの本文データの表記方針だけを扱う。CSS、parser、DOM、routing、hydration、data contractには影響しない。

## out-of-scope

```text
text-autospace導入
Typography変更
CSS調整
Markdown parser変更
独自記法変更
URL変更
DOM変更
検索仕様変更
書誌データ正規化
docs/old/**更新
docs/temporary/**更新
docs/workflows/problem-solving/frozen-v85-reference/**更新
docs/workflows/problem-solving/r4-validation/samples/**更新
docs/workflows/problem-solving/r4-validation/schemas/**更新
docs/workflows/problem-solving/r4-validation/tools/**更新
英語表記そのものの全面日本語化
source comment/JSDocの全面整形
formatterによる一括整形
package.json変更
pnpm-lock.yaml変更
npm script追加
検証コマンド由来のPhase対象外生成差分
```

## rollback方針

問題が出た場合は、次の順に切り戻す。

```text
1. Phase9の検査fail化をrevertまたはreport-onlyへ戻す。
2. Phase7のlibrary content変更をrevertする。
3. Phase6のtesting content変更をrevertする。
4. Phase4のworkflows変更をrevertする。
5. Phase3のdesign-system component docs変更をrevertする。
6. Phase2B/5/8の広範囲表記変更をPhase単位でrevertする。
7. Phase2Aのreport-only検査スクリプトをrevertする。
8. Phase1Bの主要入口文書・主要公開コピー変更を必要に応じてrevertする。
9. Phase1Aの表記ガイドとADRだけを残すか、必要に応じて再適用する。
10. CSS、parser、DOM、routing、package.json、pnpm-lock.yaml変更が混入していた場合は即revertする。
11. 検証コマンド由来のPhase対象外生成差分が混入していた場合は即revertする。
```

## Acceptance ID

- AC-JA-ASCII-SPACING-001
- AC-JA-ASCII-SPACING-003
- AC-JA-ASCII-SPACING-005
- AC-JA-ASCII-SPACING-006

## Verification ID

- CH-JA-ASCII-SPACING-001A Verification

