# Prompt: Feature-change R2-full Decision Analysis and Change Plan

```text
Rouaultの次の変更要求についてDecision Analysisを行い、その後にChange Planを作成してください。
R3の肯定的条件を満たす場合はR3へ昇格し、このpromptで実装計画を確定しないでください。

入力:
- 対象状態:
- Request:
- Evidence:
- 現行仕様・実装・テスト・docs:
- problem-solving Handoff（該当する場合）:
- 候補案:
- 制約:
- AレベルとEvidence保全要件（A1／A2が発火した場合だけ）:

Decision Analysis:
1. Requestの定義
2. 実装可能で実質的に異なる候補だけ比較
3. 採用Decision
4. 棄却案／保留案（存在する場合だけ）
5. 反対仮説（Decisionを左右する場合だけ）
6. 現行契約の確認結果
7. owner／source of truthの確認
8. R3条件の有無

R2-fullを継続できる場合: Change Plan
- 対象ファイルと対象箇所
- 変更理由
- 変更してよい範囲／変更してはいけない範囲
- 実際に影響する契約
- Request→Decision→Change→Acceptance→Verification
- Verificationの観測対象、判定基準、必要環境
- 既知の場合だけ推奨コマンド
- 発火する場合だけ手動確認
- 発火する場合だけrollback
- out-of-scope
- AレベルとEvidence保全要件（A1／A2が発火した場合だけ）
- Codex限定実装条件

R3条件がある場合:
- Change Planを確定しない
- `r3-full.md`へ渡すDecision候補とEvidenceを整理する
```
