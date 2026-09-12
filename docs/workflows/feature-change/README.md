# Feature-change workflow

機能追加、機能変更、機能削除、仕様変更、UI／UX変更、URL／routing変更、データ形式変更、owner／source of truth変更、アクセシビリティ上の意味変更、契約変更、移行、非推奨化、必要な構造変更を扱います。

入口は`quick-start.md`です。

| R段階 | prompt | 成果物 |
|---|---|---|
| R0 | なし | 限定直接修正＋対象状態とdiffの確認 |
| R1 | `prompts/r1-mini.md` | Mini Brief |
| R2-lite | `prompts/r2-lite.md` | Run Card |
| R2-full | `prompts/r2-full.md` | Decision Analysis＋Change Plan |
| R3 | `prompts/r3-full.md` | Decision Record＋Change Plan |
R1以上の基本計画作成後は、`../shared/prompts/`の計画精査、Codex限定実装、完了適合性精査を使用します。一括レビュー不能な場合だけ、承認済み基本計画へ`../shared/prompts/r4-phased.md`のR4段階実行overlayを適用し、完了時に`../shared/prompts/r4-completion-overlay.md`を併用します。計画精査を変更妥当性の中心とし、実装後は承認済み計画への適合性と完了可否だけを一工程で確認します。
