# Prompt: Feature-change R2-lite Run Card

```text
Rouaultの次の変更要求について、R2-lite Run Cardを作成してください。
Decision Check、Change Plan、Codex限定実装条件を単一成果物へ圧縮してください。

R2-lite条件:
- 変更意図と境界が明確
- ownerとsource of truthが一意
- 一責務としてレビューできる
- R3の契約変更、削除、移行、owner／source of truth変更を伴わない

入力:
- 対象状態:
- Request:
- 採用仕様候補:
- Evidence:
- 現行実装・テスト・docs:
- problem-solving Handoff（該当する場合）:
- 制約:
- AレベルとEvidence保全要件（A1／A2が発火した場合だけ）:

出力: Run Card
1. 対象状態とEvidence要約
2. Requestと採用Decision
3. Decision Check
   - 現行仕様との関係
   - 実際の契約影響
   - owner／source of truthの確認
   - R3へ昇格しない根拠
4. 採用変更
5. 対象ファイルと対象箇所
6. 変更理由
7. 変更してよい範囲／変更してはいけない範囲
8. Request→Decision→Change→Acceptance→Verificationの対応表
9. Verificationの観測対象、判定基準、必要環境、検証層
10. 既知の場合だけ推奨コマンド
11. 自動検証できない場合だけ手動確認
12. out-of-scope
13. AレベルとEvidence保全要件（A1／A2が発火した場合だけ）
14. Codexへ渡す限定実装条件

次の場合はR2-fullまたはR3へ昇格してください。
- 実質的な複数案がある
- 採用Decisionが横断的で、理由を分離する必要がある
- 公開・永続契約、owner、source of truth、境界を変更する
- 削除、migration、deprecationがある

禁止:
- 発火しない棄却案、反対仮説、rollback、Gateの列挙
- 長いN/A一覧
```
