# Prompt: Problem-solving R2-lite Run Card

```text
Rouaultの次の問題について、R2-lite Run Cardを作成してください。
原因、Repair Strategy Check、Fix Plan、Codex限定実装条件を単一成果物へ圧縮してください。

R2-lite条件:
- 原因と変更境界が明確
- ownerとsource of truthが一意
- 既存仕様・契約内で不変条件を回復できる
- 複数ファイルまたは複数検証層にまたがるが、一責務としてレビューできる

入力:
- 対象状態:
- Failure／期待結果:
- Evidence:
- 採用Cause:
- 棄却・保留Cause:
- 関連実装・テスト・docs:
- local差分:
- 制約:
- AレベルとEvidence保全要件（A1／A2が発火した場合だけ）:

出力: Run Card
1. 対象状態とEvidence要約
2. Failure→Causeの対応
3. 違反された不変条件
4. Repair Strategy Check
   - Direct Mechanismまたは単一原因
   - Systemic／Escape Causeは修正戦略を左右する場合だけ
   - 修正を所有する責務
   - owner／source of truthの確認
   - problem-solving継続可否
5. 採用修正戦略
6. 対象ファイルと対象箇所
7. 変更理由
8. 変更してよい範囲／変更してはいけない範囲
9. 実際に影響する契約
10. Failure→Cause→Change→Success→Verificationの対応表
11. Verificationの観測対象、判定基準、必要環境、検証層
12. 既知の場合だけ推奨コマンド
13. 自動検証できない場合だけ手動確認
14. out-of-scope
15. AレベルとEvidence保全要件（A1／A2が発火した場合だけ）
16. Codexへ渡す限定実装条件

次の場合はR2-fullへ昇格してください。
- ownerを一意に決められない
- source of truthが複数または移動候補
- 実質的に異なる修正案が複数ある
- 原因追加調査が修正範囲を変える

禁止:
- Option A／B／Cの形式的作成
- 発火しないrollback、反対仮説、Gateの列挙
- 長いN/A一覧
```
