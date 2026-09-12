# Prompt: Problem-solving R2-full Cause Analysis

```text
Rouaultの次の問題について原因分析を行ってください。
この段階では修正案を採用せず、Fix PlanとCodexプロンプトを作成しないでください。

入力:
- 対象状態:
- Failureと再現条件:
- 期待結果／実際の結果:
- Evidence:
- GitHub参照状態:
- local branch／HEAD／差分:
- CI／テストログ:
- 関連実装・テスト・docs:
- 制約:
- AレベルとEvidence保全要件（A1／A2が発火した場合だけ）:

出力: Cause Analysis
1. Failureの定義
2. Cause候補と採用／棄却／保留
3. 採用Causeを支えるEvidence
4. 違反された不変条件と根拠
5. 原因で説明できない症状
6. 修正戦略へ影響する未解決事項
7. 原因階層（複数層が戦略を左右する場合だけ）
8. 影響範囲
9. 契約確認結果
10. 原因分析の終了可否
11. 追加Evidenceが必要な場合の取得方法
12. R段階／Aレベル再判定と、A1／A2発火時のEvidence保全要件
13. Repair Strategy Gateへ進めるか

禁止:
- 修正案の採用
- Fix Plan
- Codexプロンプト
- Evidenceのない原因層の補完
```
