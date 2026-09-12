# Prompt: ChatGPT 機能変更の実装差分精査

```text
Codex実装後の差分を精査してください。
テスト結果だけで判断せず、Change Plan、Decision Record、Delete / Breaking Change Gate、R段階 / Aレベルとの対応を確認してください。

確認対象:
- Change Planに対応しているか
- Change Plan外の変更がないか
- 変更禁止範囲に触れていないか
- Request / Decision / Change / Acceptance / Verification が対応しているか
- R段階 / Aレベルに応じた必須成果物が揃っているか
- R3以上の場合、Decision Recordと反対仮説レビューに対応しているか
- 削除・破壊的変更の場合、Delete / Breaking Change Gateに対応しているか
- A1/A2の場合、Evidence保全要件に対応しているか
- Decision Record / Delete / Breaking Change Gate / A1/A2 Evidence保全要件が不要とされた場合、不要理由がChange Planに記録され、実diffと矛盾していないか
- 採用仕様を超えた仕様変更がないか
- 削除対象外の互換性を壊していないか
- テスト・検証が受け入れ条件に対応しているか
- 手動確認項目が未実施の場合、その理由が完了判定に持ち越されているか
- R段階またはAレベルを上げる必要がある実diffがないか
- Rouault固有契約を壊していないか
- 没入して読む体験、読書体験、視線移動、スクロール、URL共有、タブ状態、フォーカス、キーボード操作、レスポンシブ性への副作用がないか
- URL / routing / DOM / CSS custom property / custom event / data contract / アクセシビリティ / UX への副作用がないか
- generated files / lockfileへの変更が妥当か

入力:
- Request ID:
- Decision ID:
- Change ID:
- R段階:
- Aレベル:
- R/A判定理由:
- Decision Record:
- Delete / Breaking Change Gate:
- A1/A2 Evidence保全要件:
- Decision Record / Delete / Breaking Change Gate / A1/A2 Evidence保全要件が不要な場合の不要理由:
- Change Plan:
- git diff:
- テスト結果:
- CI結果:
- 手動確認結果:

出力:
1. 結論: accept / request changes / re-investigate / escalate
2. 問題点
3. Change Plan外変更
4. 変更禁止範囲への接触
5. 未実装確認
6. 採用仕様との対応
7. Decision Recordとの対応
8. Delete / Breaking Change Gateとの対応
9. Acceptance / Verification との対応
10. 互換性・削除・移行・非推奨化の確認
11. URL / routing / DOM / CSS custom property / custom event / data contract / アクセシビリティ / UX 影響
12. Rouault固有契約影響
13. A1/A2 Evidence保全要件との対応
14. 不要理由確認
15. R段階またはAレベルを上げる必要の有無
16. 追加検証の要否
17. 手動確認未実施項目の扱い
18. 完了判定可否
19. コミットメッセージ案
```
