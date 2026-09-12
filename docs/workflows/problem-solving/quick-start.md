# Quick Start: 問題解決

## 1. 入口

次が主題ならproblem-solvingを使います。

- 不具合、回帰
- CIまたはテスト失敗
- 期待結果と実際の結果の差
- intermittent failure
- 原因特定が必要な挙動

「どの仕様へ変えるか」が主題なら`../feature-change/quick-start.md`を使います。

## 2. 対象状態を固定する

`../source-state-and-codex.md`に従い、対象branch、commit、local差分、ZIP、個別ファイルのうち何を正本とするか明示します。

## 3. R段階を選ぶ

`../proportionality-and-review.md`の最も低い適合段階を選びます。

### R0

誤字、コメント、履歴整理だけで、挙動・契約影響がない場合です。計画成果物と計画精査を作らず、対象状態を確認して許可範囲内で直接修正し、修正後のdiffだけを確認します。対象fileまたは編集箇所に既存差分が重なる場合は最小限の開始状態を確認し、帰属を判定できなければR1へ昇格します。挙動または契約への影響が判明した場合もR1以上へ昇格します。

### R1

次を満たす場合です。

- 原因がEvidenceで一意に確定している
- 一責務内の小規模修正
- 既存仕様・契約・owner・source of truthを変更しない
- 実質的な複数案がない

`prompts/r1-mini.md`で、原因、Repair Strategy Check、Fix Plan、Codex条件を一つのMini Briefへ圧縮します。

### R2-lite

次を満たす場合です。

- 複数ファイルまたは複数テスト層にまたがる
- 原因と変更境界が明確
- ownerとsource of truthが一意
- 既存仕様・契約内で不変条件を回復できる

`prompts/r2-lite.md`でRun Cardを作成します。

### R2-full

次のいずれかがある場合です。

- 原因候補が複数ある
- 原因確定に追加Evidenceが必要
- 実質的に異なる修正案が複数ある
- 複数の因果層が修正戦略または再発防止を左右する
- 影響範囲が未確定で、確認結果が修正範囲を変える
- 契約の解釈が未確定、契約間に競合がある、または確認結果が修正戦略、変更範囲、Successを変える

単に既存契約内であることを確認するだけではR2-fullへ上げません。`prompts/r2-full-cause-analysis.md`で原因を確定し、原因確定後に`prompts/r2-full-fix-plan.md`を使います。

### R3

原因は確定したが、次のいずれかを実際に変更する必要がある場合です。

- 仕様または公開・永続契約
- ownerまたはsource of truth
- コンポーネント境界
- URL、routing、データ形式、永続化形式
- アクセシビリティ上の意味
- 削除、移行、非推奨化

problem-solving内でFix Planを作成しません。`prompts/r3-handoff.md`でHandoff Recordを作り、feature-changeへ移行します。

### R4段階実行overlay

R4は独立したR段階ではありません。R1、R2-lite、R2-fullのいずれかで基本計画を作成し、計画精査で承認した後、次の必須条件をすべて満たす場合だけ適用します。

- 一つのdiffとしてレビューできない
- 複数Phaseが独立したSuccessとVerificationを持つ
- Phase間の順序または中間状態を管理する必要がある

全Phaseが既存仕様・契約・owner・source of truth・責務境界内に収まることはproblem-solving継続条件です。`../shared/prompts/r4-phased.md`で全体Phase Mapと現在Phaseの詳細Phase Planを作成し、overlay自体を計画精査します。後続Phaseは前Phase Gateで詳細化できます。各Phaseの実装直前にPhase開始基準を記録し、完了時は現在Phase差分を既存local差分および前Phase差分から分離します。途中で仕様、契約、owner、source of truth、責務境界の変更が必要と判明した場合は、Phase Mapを確定せずR3 Handoffでfeature-changeへ移行します。Evidence保全だけが必要な場合はR4を使わず、A1／A2を基本計画へ重ねます。

## 4. 原因確定条件

原因確定に必要なのは、修正戦略を選べる十分なEvidenceです。すべての不確実性を除去する必要はありません。

最低限:

- Failureと再現条件
- 採用CauseとEvidence
- 棄却または保留した主要Cause
- 違反された不変条件
- 原因で説明できない症状の有無
- 修正範囲を変える未解決事項の有無

原因階層は発火条件がある場合だけ詳細化します。

## 5. Repair Strategy Gate

Fix Planを作る前に次を確認します。

- 既存仕様・契約内で不変条件を回復できる
- 修正が本来のownerに置かれる
- source of truthを増やさない
- 同じ判断、正規化、状態同期を複数層へ複製しない
- 終了条件のないfallback、compatibility shim、新旧並行経路を作らない
- 確認済みのSystemic Causeを無理由で放置しない
- 症状ではなくSuccessを検証できる

実装可能な候補が一つなら複数案比較は不要です。

## 6. 計画精査、実装、完了

R1以上では次の順序を使います。

1. 基本計画の計画精査: `../shared/prompts/chatgpt-plan-review.md`
2. R4 overlayが発火する場合だけ、全体Phase Map／現在Phase Planを作成して計画精査する
3. Codex限定実装: 通常は承認済み基本計画を渡す。R4では基本計画＋全体Phase Map＋現在Phase Plan＋Phase開始基準を渡し、Phase 2以降では既完了Phase結果とGate決定も`../shared/prompts/codex-limited-implementation.md`へ渡す
4. 完了適合性精査: `../shared/prompts/chatgpt-completion-review.md`。R4の場合だけ`../shared/prompts/r4-completion-overlay.md`を併用する
5. 再精査: 前回指摘と更新差分に限定したデルタ精査

計画精査を変更妥当性の中心とします。完了適合性精査は必要な開始差分基準、tracked差分とuntracked fileを含む実装後変更集合、最終構造、Verification、完了可否を一工程で確認し、新Evidenceまたは重大な見落としがない限り計画を再設計しません。dirtyでも既存差分と今回範囲が非交差で帰属が明確ならstatusとpath-level確認に留め、交差または帰属不明の場合だけ必要な開始内容を保持します。indexはユーザーの既存状態として保持し、明示的依頼なしにstage／unstageしません。

独立した最終Gateは、R4 overlayのPhase移行、外部結果が後から確定する場合、独立承認が必要な場合、またはユーザーが明示した場合だけ追加します。R4の非最終Phaseは`phase-complete`、基本計画全体の閉鎖は`complete`として判定し、全体閉鎖時だけ全Phase結果とGate決定を集約します。
