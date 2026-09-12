# Quick Start: 機能変更

## 1. 入口

次が主題ならfeature-changeを使います。

- 機能追加、変更、削除
- 仕様またはUI／UXの変更
- URL、routing、DOM、CSS custom property、custom eventの契約変更
- データ形式、永続化形式、import-export形式の変更
- owner、source of truth、コンポーネント境界の変更
- アクセシビリティ上の意味変更
- migration、deprecation
- 長期保守性のために必要な構造変更

既存Failureの原因特定が主題なら`../problem-solving/quick-start.md`を使います。

## 2. 対象状態と現行契約を確認する

採用仕様を決める前に、`../source-state-and-codex.md`に従って対象状態を固定し、現行実装、既存テスト、関連docs、実際に影響する契約を確認します。契約を確認しただけで契約変更として扱いません。

Rouaultで契約として評価する主な対象:

- URL、routing、history
- DOM構造、semantic HTML、static HTML
- CSS custom property、selector、hook
- custom event
- データ形式、永続化、import-export
- no-JS baseline、hydration
- アクセシビリティ上の名前・役割・状態・操作
- コンテンツ資産の解釈
- 文書化されたinterface
- 読書体験、視線移動、スクロール、フォーカス、キーボード操作

## 3. R段階を選ぶ

`../proportionality-and-review.md`の最も低い適合段階を選びます。

### R0

誤字、コメント、履歴整理だけで、挙動・契約影響がない場合です。計画成果物と計画精査を作らず、対象状態を確認して許可範囲内で直接修正し、修正後のdiffだけを確認します。対象fileまたは編集箇所に既存差分が重なる場合は最小限の開始状態を確認し、帰属を判定できなければR1へ昇格します。挙動または契約への影響が判明した場合もR1以上へ昇格します。

### R1

- 採用仕様が既に確定
- 一責務、少数ファイル
- 公開・永続契約を変更しない
- owner／source of truthを変更しない
- 実質的な複数案がない

`prompts/r1-mini.md`を使います。

### R2-lite

- 変更意図と境界が明確
- 複数ファイルまたは複数検証層にまたがる
- owner／source of truthが一意
- 契約影響を確認でき、実際の契約変更はない、または内部契約内の限定変更
- 一責務としてレビューできる

`prompts/r2-lite.md`を使います。

### R2-full

- 実質的な複数案がある
- 横断的影響があり、確認結果がDecisionまたは変更範囲を変える
- 契約の解釈が未確定、契約間に競合がある、または確認結果がDecision、変更範囲、Acceptanceを変える
- Decisionの理由をChange Planと分ける必要がある
- ただしR3の肯定的条件は満たさない

単に既存契約内であることを確認するだけではR2-fullへ上げません。`prompts/r2-full.md`を使います。

### R3

次を実際に変更する場合です。

- 公開・永続契約
- ownerまたはsource of truth
- コンポーネント境界
- URL、routing、データ形式、永続化形式
- アクセシビリティ上の意味
- 機能削除、migration、deprecation

`prompts/r3-full.md`を使い、Decision RecordとChange Planを作ります。Delete／Breaking Change Gateは削除、互換性破壊、migration、deprecationがある場合だけ追加します。

### R4段階実行overlay

R4は独立したR段階ではありません。R1、R2-lite、R2-full、R3のいずれかで基本計画を作成し、計画精査で承認した後、一括レビュー不能、複数Phaseの独立したAcceptance／Verification、Phase間の順序または中間状態の管理という必須条件をすべて満たす場合だけ`../shared/prompts/r4-phased.md`を適用します。全体Phase Mapと現在Phaseの詳細Phase Planを承認し、後続Phaseは前Phase Gateで詳細化できます。各Phaseの実装直前にPhase開始基準を記録し、完了時は現在Phase差分を既存local差分および前Phase差分から分離します。Evidence保全だけが必要な場合はR4を使わず、A1／A2を基本計画へ重ねます。

## 4. Codexへ委ねない判断

- 採用仕様
- 契約変更
- owner／source of truth
- 削除、移行、非推奨化
- accessibility semantics
- UX、URL、データ、コンポーネント境界
- compatibility policy

## 5. 計画精査、実装、完了

R1以上では次の順序を使います。

1. 基本計画の計画精査: `../shared/prompts/chatgpt-plan-review.md`
2. R4 overlayが発火する場合だけ、全体Phase Map／現在Phase Planを作成して計画精査する
3. Codex限定実装: 通常は承認済み基本計画を渡す。R4では基本計画＋全体Phase Map＋現在Phase Plan＋Phase開始基準を渡し、Phase 2以降では既完了Phase結果とGate決定も`../shared/prompts/codex-limited-implementation.md`へ渡す
4. 完了適合性精査: `../shared/prompts/chatgpt-completion-review.md`。R4の場合だけ`../shared/prompts/r4-completion-overlay.md`を併用する
5. 再精査: 前回指摘と更新差分に限定したデルタ精査

計画精査を変更妥当性の中心とします。完了適合性精査は必要な開始差分基準、tracked差分とuntracked fileを含む実装後変更集合、最終構造、Verification、完了可否を一工程で確認し、新Evidenceまたは重大な見落としがない限り計画を再設計しません。dirtyでも既存差分と今回範囲が非交差で帰属が明確ならstatusとpath-level確認に留め、交差または帰属不明の場合だけ必要な開始内容を保持します。indexはユーザーの既存状態として保持し、明示的依頼なしにstage／unstageしません。

独立した最終Gateは、R4 overlayのPhase移行、外部結果が後から確定する場合、独立承認が必要な場合、またはユーザーが明示した場合だけ追加します。R4の非最終Phaseは`phase-complete`、基本計画全体の閉鎖は`complete`として判定し、全体閉鎖時だけ全Phase結果とGate決定を集約します。
