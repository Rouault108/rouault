# Prompt: Codex 機能変更の限定実装

```text
以下のChange Planに限定して実装してください。
設計判断、仕様変更、契約変更、削除判断、移行方針判断、アクセシビリティ意味変更、範囲外リファクタリングは行わないでください。

Change Plan:
- Request ID:
- Decision ID:
- Change ID:
- R段階:
- Aレベル:
- R/A判定理由:
- 運用モード: R1 mini / R2-lite standard / R3 full
- R3以上の必須成果物:
- Decision Record ID:
- Delete / Breaking Change Gate要否:
- Delete / Breaking Change Gate結果:
- A1/A2 Evidence保全要件:
- Decision Record / Delete / Breaking Change Gate / A1/A2 Evidence保全要件が不要な場合の不要理由:
- 採用仕様:
- 対象ファイル:
- 変更してよい範囲:
- 変更してはいけない範囲:
- Acceptance ID:
- Verification ID:
- 実行するテスト:
- Codexが実施する確認:
- Codexが実施しない確認:
- 手動確認項目:
- out-of-scope:
- ロールバック方針:

実装開始前の停止条件:
- R段階 / Aレベルが未記載の場合は実装しない
- R3以上なのにDecision Record IDが未記載の場合は実装しない
- 削除・破壊的変更なのにDelete / Breaking Change Gate結果が未記載の場合は実装しない
- A1/A2なのにEvidence保全要件が未記載の場合は実装しない
- 変更対象ファイル、変更してよい範囲、変更してはいけない範囲が曖昧な場合は実装しない


停止条件に該当する場合:
- 実装しない
- ファイルを変更しない
- どの停止条件に該当したかを列挙する
- 不足している情報を列挙する
- Codexが判断してはいけない事項を明示する
- 実装再開に必要な追加入力だけを報告する

停止時の報告形式:
- 結論: stop
- 該当した停止条件:
  - ...
- 不足情報:
  - ...
- Codexが判断してはいけない事項:
  - ...
- 実装再開に必要な入力:
  - ...

要件:
- Change Plan外の変更をしない
- 便乗変更をしない
- 採用仕様を超えた仕様変更をしない
- 削除対象外の互換性を壊さない
- テスト期待値を安易に変更しない
- URL / routing / DOM / CSS custom property / custom event / data contract / アクセシビリティの契約を変更する場合は、Change Planに明示された範囲に限定する
- generated files / lockfileに触れる場合は明示する
- 実装後、変更ファイル、変更理由、未実施テスト、未実施確認、懸念点を報告する

禁止:
- Decision IDにない仕様判断を追加すること
- 変更禁止範囲に触れること
- out-of-scopeを実装すること
- テストを通すためだけに期待値を変更すること
- 契約変更、削除判断、移行判断を独自に行うこと
- アクセシビリティ意味変更を独自に行うこと
- UX契約、URL契約、データ契約を独自に変更すること
- Rouaultの読書体験、視線移動、スクロール、URL共有、タブ状態、フォーカス、キーボード操作、レスポンシブ性を実装都合で変更すること
```
