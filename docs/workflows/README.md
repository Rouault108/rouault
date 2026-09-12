# Rouault開発ワークフロー

このディレクトリは、Rouaultの問題解決と機能変更における判断、計画、限定実装、完了適合性精査の正本です。

## 入口

| 主題 | 入口 |
|---|---|
| 問題、回帰、CIエラー、テスト失敗、期待結果との差 | `problem-solving/quick-start.md` |
| 機能追加、仕様変更、UI／UX変更、削除、移行、契約変更 | `feature-change/quick-start.md` |

混在する場合は、最初に既存Failureの原因をproblem-solvingで確定します。既存仕様・契約・責務境界内で回復できないと判定した場合だけ、Handoff Recordを作成してfeature-changeへ移行します。

## 共通正本

- 比例性、R段階、Aレベル、成果物発火条件、精査重大度: `proportionality-and-review.md`
- 分析・精査の実行面、read-only境界、Evidenceの利用条件: [分析・精査の実行面](analysis-and-review-surfaces.md)
- GitHub参照状態、local working tree、Codex実装規則: `source-state-and-codex.md`
- R4段階実行overlay／A1／A2の例外・保全運用: `audited-mode.md`
- 計画精査、Codex限定実装、通常完了適合性精査、R4完了overlay: `shared/prompts/`

## 基本原則

```text
論理的なGateは維持する。
成果物の数と項目数は、確認済みの変更リスクへ比例させる。
```

- R0は許可範囲を限定して直接修正し、対象状態とdiffだけを確認する。対象箇所へ既存差分が重なり帰属不明ならR1へ昇格する
- ChatとWorkはChatGPT分析・精査責務の異なる実行面であり、R段階、Aレベル、Gate、成果物、精査の意味を変更しない
- 原因またはDecisionが確定する前に実装しない
- 計画精査を変更妥当性の中心とし、実装開始前に承認済み計画を固定する
- Codexへ仕様判断、契約変更、owner、source of truth、削除、移行を委ねない
- R1／R2-liteではmode別の単一成果物を使う
- R3成果物とR4 overlayは、それぞれの肯定的な発火条件がある場合だけ作る
- 通常実装は既存差分と今回範囲が交差または帰属不明の場合だけ必要な開始差分基準を取得し、R4ではPhaseごとに追跡する
- R4の非最終Phaseは`phase-complete`、基本計画全体は`complete`として区別する
- 実装後はtracked差分とuntracked fileを含む実装後変更集合、最終構造、Verification、完了可否を一つの完了適合性精査で確認する
- indexのstaged／unstaged境界を既存状態として保持し、明示的依頼なしに変更しない
- 新Evidenceまたは重大な見落としがない限り、実装後に計画精査を再実行しない
- 完了報告は計画項目、実装、Verificationを追跡できる最小限でよい
- テスト通過だけを完了根拠にしない
- 人間が最終的な採否、commit、merge、公開を判断する
