# Problem-solving workflow

問題、回帰、CIエラー、テスト失敗、期待結果と実際の結果の差、原因特定が主題の場合に使用します。

入口は`quick-start.md`です。R段階に応じ、次のpromptを使います。

| R段階 | prompt | 成果物 |
|---|---|---|
| R0 | なし | 限定直接修正＋対象状態とdiffの確認 |
| R1 | `prompts/r1-mini.md` | Mini Brief |
| R2-lite | `prompts/r2-lite.md` | Run Card |
| R2-full | `prompts/r2-full-cause-analysis.md`→`prompts/r2-full-fix-plan.md` | Cause Analysis＋Fix Plan |
| R3 | `prompts/r3-handoff.md` | Handoff Record |
R1以上の基本計画作成後は、`../shared/prompts/`の計画精査、Codex限定実装、完了適合性精査を使用します。一括レビュー不能な場合だけ、承認済み基本計画へ`../shared/prompts/r4-phased.md`のR4段階実行overlayを適用し、完了時に`../shared/prompts/r4-completion-overlay.md`を併用します。計画精査を変更妥当性の中心とし、実装後は承認済み計画への適合性と完了可否だけを一工程で確認します。
