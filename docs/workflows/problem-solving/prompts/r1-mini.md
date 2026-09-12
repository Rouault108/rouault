# Prompt: Problem-solving R1 Mini Brief

```text
Rouaultの次の問題について、R1 Mini Briefを作成してください。
原因分析、Repair Strategy Check、Fix Plan、Codex限定実装条件を一つの成果物へ圧縮してください。

R1条件:
- 原因はEvidenceで確定済み
- 一責務内の小規模修正
- 既存仕様・契約・owner・source of truthを変更しない
- 実質的な複数案がない

入力:
- 対象状態:
- 症状／Failure:
- 期待結果:
- Evidence:
- 採用原因:
- 関連実装・テスト・docs:
- 制約:
- AレベルとEvidence保全要件（A1／A2が発火した場合だけ）:

出力: Mini Brief
1. 対象状態
2. Failureと採用Cause
3. 違反された不変条件
4. Repair Strategy Check
   - 修正を所有する責務
   - owner変更なし
   - source of truth変更なし
   - problem-solving継続可否
5. 対象ファイルと対象箇所
6. 変更理由
7. 変更してよい範囲／変更してはいけない範囲
8. 実際に影響する契約
9. Change→Success→Verificationの対応
10. Verificationの観測対象、判定基準、必要環境
11. 既知の場合だけ推奨コマンド
12. 発火する場合だけ手動確認
13. out-of-scope
14. AレベルとEvidence保全要件（A1／A2が発火した場合だけ）
15. Codexへ渡す限定実装条件

R1条件を満たさないEvidenceがある場合は、Mini Briefを無理に作らず、R2-lite／R2-full／R3への昇格理由を示してください。

禁止:
- 存在しない複数案を作る
- 発火しないowner／source of truthの前後比較
- 自明なrollback
- 長いN/A一覧
- Optional改善による範囲拡張
```
