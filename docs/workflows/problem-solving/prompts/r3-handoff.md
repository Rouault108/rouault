# Prompt: Problem-solving R3 Handoff

```text
確定した原因に対して、既存仕様・契約・owner・source of truth・境界内では修正できないため、feature-changeへのHandoff Recordを作成してください。
problem-solving内のFix PlanとCodexプロンプトは作成しないでください。

入力:
- 対象状態:
- Failure／Cause Analysis:
- Repair Strategy Gate結果:
- 違反された不変条件:
- 現行実装・テスト・docs:
- 変更が必要な仕様／契約／境界:
- 制約:
- AレベルとEvidence保全要件（A1／A2が発火した場合だけ）:

出力: Handoff Record
1. 元Failureと採用Cause
2. 原因階層（発火した層だけ）
3. 違反された不変条件
4. 現在のowner（争点または変更対象の場合）
5. 現在のsource of truth（争点または変更対象の場合）
6. 既存仕様・契約内で修正できない理由
7. feature-changeで判断するRequest
8. 目標owner／source of truth候補（確定している場合だけ）
9. 実際に変更候補となる契約
10. 引き継ぐEvidence
11. 未解決事項
12. out-of-scope
13. AレベルとEvidence保全要件（A1／A2が発火した場合だけ）
14. feature-changeの推奨R段階と使用prompt

禁止:
- 仕様Decisionの確定
- Change Plan
- Codex実装依頼
```
