# Prompt: Feature-change R1 Mini Brief

```text
Rouaultの次の変更要求について、R1 Mini Briefを作成してください。
DecisionとChange Plan、Codex限定実装条件を一つの成果物へ圧縮してください。

R1条件:
- 採用仕様が確定済み
- 一責務内の小規模変更
- 公開・永続契約、owner、source of truthを変更しない
- 実質的な複数案がない

入力:
- 対象状態:
- Request:
- 採用仕様:
- Evidence:
- 現行実装・テスト・docs:
- 制約:
- AレベルとEvidence保全要件（A1／A2が発火した場合だけ）:

出力: Mini Brief
1. 対象状態
2. Requestと採用Decision
3. 対象ファイルと対象箇所
4. 変更理由
5. 変更してよい範囲／変更してはいけない範囲
6. 実際に影響する契約
7. owner変更なし
8. source of truth変更なし
9. Request→Decision→Change→Acceptance→Verificationの対応
10. Verificationの観測対象、判定基準、必要環境
11. 既知の場合だけ推奨コマンド
12. 発火する場合だけ手動確認
13. out-of-scope
14. AレベルとEvidence保全要件（A1／A2が発火した場合だけ）
15. Codexへ渡す限定実装条件

R1条件を満たさない場合は、R2-lite／R2-full／R3への昇格理由を示してください。

禁止:
- 存在しない棄却案、保留案、反対仮説を作る
- 発火しないDecision Record、Gate、rollbackを含む長いN/A一覧
- Optional改善による範囲拡張
```
