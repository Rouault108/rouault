# Prompt: ChatGPT 原因特定と修正方針

```text
Rouaultの問題について、以下のEvidenceと現行実装情報から原因を整理し、修正方針を作成してください。

条件:
- 原因を断定しすぎない
- Failure / Cause / Change / Success / Verification の対応を保つ
- 採用、棄却、保留を分ける
- 修正対象ファイルを明示する
- 変更してよい範囲と禁止範囲を分ける
- Rouault契約影響を確認する
- Codexへ渡せる粒度にする

入力:
- Failure ID:
- Evidence:
- 現行実装:
- 関連docs/contracts:
- 制約:

出力:
1. 採用Cause ID
2. 棄却Cause IDと理由
3. Fix Plan
4. 変更対象ファイル
5. 変更禁止範囲
6. Success ID
7. Verification ID
8. Codexへ渡す場合のプロンプト案
9. 実装後の精査観点
```
