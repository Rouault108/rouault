# Prompt: ChatGPT 機能変更の完了判定

```text
Rouaultの機能変更について、Change Plan、Decision Record、Delete / Breaking Change Gate、実装diff、テスト結果、CI結果、手動確認結果をもとに完了判定してください。
テスト結果だけで完了扱いにせず、Request / Decision / Change / Acceptance / Verification の対応を確認してください。

入力:
- Request ID:
- Decision ID:
- Change ID:
- Acceptance ID:
- Verification ID:
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
- rollback方針:
- deprecation方針:
- migration失敗時の扱い:
- out-of-scope:
- 未検証項目:
- コミットメッセージ案:

確認対象:
- RequestとDecisionが対応しているか
- DecisionとChangeが対応しているか
- ChangeとAcceptanceが対応しているか
- AcceptanceとVerificationが対応しているか
- Change Plan外へ逸脱していないか
- 変更禁止範囲に触れていないか
- R段階 / Aレベルに応じた必須成果物が揃っているか
- R3以上の場合、Decision Recordが存在し、Changeと対応しているか
- R3以上の場合、反対仮説レビューが残っているか
- 削除・破壊的変更の場合、Delete / Breaking Change Gateが完了しているか
- A1/A2の場合、Evidence保全要件が満たされているか
- Decision Record / Delete / Breaking Change Gate / A1/A2 Evidence保全要件が不要な場合、その不要理由が記録され、R段階 / Aレベル / 実diff / 契約影響と矛盾していないか
- Rouault契約を壊していないか
- 没入して読む体験、読書体験、視線移動、スクロール、URL共有、タブ状態、フォーカス、キーボード操作、レスポンシブ性が確認済みか
- 互換性、削除、移行、アクセシビリティ、URL、UX影響が処理済みまたはout-of-scopeに記録されているか
- rollback方針が記録されているか
- deprecation方針が必要な場合に記録されているか
- migration失敗時の扱いが必要な場合に記録されているか
- 手動確認項目が完了しているか、未実施理由が記録されているか
- 未検証項目が完了条件に残っていないか
- コミットメッセージに採用判断と変更意図が反映されているか

出力:
1. 結論: complete / not complete / re-investigate / escalate
2. 完了条件ごとの判定
3. Request / Decision / Change / Acceptance / Verification の対応
4. Decision Record確認
5. Delete / Breaking Change Gate確認
6. R段階 / Aレベル確認
7. A1/A2 Evidence保全確認
8. 不要理由確認
9. rollback / deprecation / migration失敗時の扱い
10. 手動確認結果
11. 未完了項目
12. out-of-scopeの妥当性
13. 追加検証の要否
14. R段階またはAレベルを上げる必要の有無
15. 最終コミットメッセージ案
16. 次に行うべきこと
```
