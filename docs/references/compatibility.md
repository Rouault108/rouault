# Compatibility Reference

この文書は互換 API の棚卸し Reference である。現行 Contract を上書きしない。

## 判定基準

- 現行の public contract として維持する必要がある API は該当 Contract に置く。
- 完了済み削除項目は履歴資料として扱う。
- 新たな互換経路を追加する場合は、追加理由、削除条件、検証先を明記する。

## Current Inventory

- Legacy router history path key: current compatibility API ではない。
- `ui-kbd[keys]` / host text: current compatibility API ではない。
- 未分類 link failsafe: current compatibility API ではない。
- `ui-skip-link[href]`: current compatibility API ではない。
- `.status` class: current compatibility API ではない。
- `defer-hydration`: current compatibility API ではない。

## Operational Rule

Compatibility API を新設する場合は、該当 Contract、test、削除予定または維持理由を同時に更新する。
