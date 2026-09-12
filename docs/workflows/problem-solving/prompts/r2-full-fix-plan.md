# Prompt: Problem-solving R2-full Repair Strategy and Fix Plan

```text
確定したCause Analysisを入力としてRepair Strategy Gateを実施し、problem-solvingを継続できる場合だけFix Planを作成してください。

入力:
- 対象状態:
- Cause Analysis:
- 違反された不変条件:
- 関連実装・テスト・docs:
- 制約:
- AレベルとEvidence保全要件（A1／A2が発火した場合だけ）:
- out-of-scope候補:

出力:
1. Repair Strategy Gate結論
2. 採用修正戦略
3. 実装可能で実質的に異なる候補が複数ある場合だけ比較
4. ownerが原因または争点の場合だけ現在のowner
5. source of truthが原因または争点の場合だけ現在の正本と重複状態
6. ownerまたはsource of truthの変更要否
7. problem-solving継続／feature-change移行

problem-solving継続の場合: Fix Plan
- 対象ファイルと対象箇所
- 変更理由
- 変更してよい範囲／変更してはいけない範囲
- 実際に影響する契約
- Failure→Cause→Change→Success→Verification
- Verificationの観測対象、判定基準、必要環境
- 既知の場合だけ推奨コマンド
- 発火する場合だけ手動確認
- 発火する場合だけrollback
- out-of-scope
- AレベルとEvidence保全要件（A1／A2が発火した場合だけ）
- Codex限定実装条件

feature-change移行の場合:
- owner、source of truth、仕様、契約、責務境界の変更案をFix Planとして確定しない
- Fix Planを作らない
- `r3-handoff.md`でHandoff Recordを作るための入力を整理する

採用禁止:
- 症状地点への例外分岐だけで終わる
- source of truthを増やす
- 本来のowner以外へ責務を追加する
- 同一処理を複数層へ複製する
- 終了条件のないfallback、compatibility shim、新旧並行経路
- 実装詳細だけを固定するテスト
```
