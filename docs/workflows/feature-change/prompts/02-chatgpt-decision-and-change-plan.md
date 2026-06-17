# Prompt: ChatGPT 採用仕様とChange Plan

```text
Rouaultの機能変更について、以下の変更要求、Evidence、現行実装情報から採用仕様を整理し、Decision Record要否、Delete / Breaking Change Gate要否、Change Planを作成してください。

条件:
- 仕様を断定しすぎない
- Request / Decision / Change / Acceptance / Verification の対応を保つ
- 採用、棄却、保留を分ける
- 反対仮説を明示する
- 変更対象ファイルを明示する
- 変更してよい範囲と禁止範囲を分ける
- R段階 / AレベルをChange Planへ伝播させる
- R1 mini / R2-lite standard / R3 full の運用モードを明示する
- R3以上ではDecision Recordを作成する
- 削除、破壊的変更、移行、非推奨化、契約変更ではDelete / Breaking Change Gateを作成する
- A1/A2ではEvidence保全要件を明示する
- Decision Record、Delete / Breaking Change Gate、A1/A2 Evidence保全要件が不要な場合は、省略せず不要理由を明示する
- Rouault契約影響を確認する
- URL / routing / DOM / CSS custom property / custom event / data contract / アクセシビリティ / UX 影響を確認する
- 没入して読む体験、読書体験、視線移動、スクロール、URL共有、タブ状態、フォーカス、キーボード操作、レスポンシブ性への影響を確認する
- 削除または移行がある場合は、互換性、移行、ロールバックを明示する
- Codexへ渡せる粒度にする
- Codexへ設計判断、仕様変更、契約変更、削除判断、移行判断、アクセシビリティ意味変更を委ねない

入力:
- Request ID:
- 変更要求:
- 変更種別:
- R段階:
- Aレベル:
- R/A判定理由:
- 運用モード候補: R1 mini / R2-lite standard / R3 full
- 削除・破壊的変更・移行・契約変更の有無:
- Evidence:
- 現行仕様:
- 現行実装:
- 現行テスト:
- 関連docs / contracts / ADR:
- 制約:
- out-of-scope候補:

出力:
1. 採用Decision ID
2. R段階 / Aレベルの再判定
3. R/A判定理由
4. 運用モード: R1 mini / R2-lite standard / R3 full
5. 採用仕様
6. 棄却案と理由
7. 保留案と不足情報
8. 反対仮説
9. 反対仮説を退けるEvidence
10. 互換性影響
11. URL / routing 影響
12. DOM / CSS custom property / custom event 影響
13. data contract / persistence / import-export 影響
14. アクセシビリティ影響
15. UX / reading experience 影響
16. Rouault固有契約影響
17. 削除・移行・非推奨化の扱い
18. R3 Decision Record要否
19. R3以上の場合のDecision Record
20. Delete / Breaking Change Gate要否
21. Delete / Breaking Change Gate
22. A1/A2の場合のEvidence保全要件
23. Decision Record / Delete / Breaking Change Gate / A1/A2 Evidence保全要件が不要な場合の不要理由
24. Change Plan
25. 変更対象ファイル
26. 変更してよい範囲
27. 変更してはいけない範囲
28. Acceptance ID
29. Verification ID
30. テストコマンド
31. 手動確認項目
32. out-of-scope
33. ロールバック方針
34. Codexへ渡す場合のプロンプト案
35. 実装後の精査観点

不要理由の記録形式:
- Decision Record: 必要 / 不要。不要の場合の理由:
- Delete / Breaking Change Gate: 必要 / 不要。不要の場合の理由:
- A1/A2 Evidence保全要件: 必要 / 不要。不要の場合の理由:

Decision Record必須項目:
- Decision Record ID
- 対象Request ID
- R段階 / Aレベル
- R/A判定理由
- 採用仕様
- 棄却案
- 保留案
- 反対仮説
- 反対仮説を退けるEvidence
- 契約影響
- 削除・移行・非推奨化の扱い
- 互換性影響
- Rouault固有契約影響
- rollback方針
- Acceptance ID
- Verification ID
- 未解決事項
- out-of-scope

Delete / Breaking Change Gate必須項目:
- Gate ID
- 対象Request ID
- 対象Decision ID
- 対象契約
- 削除または破壊的変更の理由
- 参照検索Evidence
- 既存テスト影響
- URL / routing 影響
- DOM / CSS custom property / custom event 影響
- data contract / persistence / import-export 影響
- アクセシビリティ属性または意味への影響
- Rouault固有契約への影響
- 代替手段
- deprecation要否
- migration要否
- migration失敗時の扱い
- rollback可能性
- Acceptance ID
- Verification ID
- Gate通過可否
```
