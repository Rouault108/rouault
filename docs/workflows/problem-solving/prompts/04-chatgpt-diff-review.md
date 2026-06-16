# Prompt: ChatGPT 実装差分精査

```text
Codex実装後の差分を精査してください。

確認対象:
- Fix Planに対応しているか
- Fix Plan外の変更がないか
- 変更禁止範囲に触れていないか
- Failure / Cause / Change / Success / Verification が対応しているか
- テスト・検証が成功条件に対応しているか
- R段階を上げる必要がある実diffがないか
- Rouault固有契約を壊していないか

入力:
- Fix Plan:
- git diff:
- テスト結果:
- CI結果:

出力:
1. 結論: accept / request changes / re-investigate
2. 問題点
3. Fix Plan外変更
4. 未実装確認
5. 追加検証の要否
6. 完了判定可否
7. コミットメッセージ案
```
