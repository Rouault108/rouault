# Compatibility Reference

この文書は互換APIの棚卸しReferenceである。現行Contractを上書きしない。

## 判定基準

- 現行のpublic contractとして維持する必要があるAPIは該当Contractに置く。
- 完了済み削除項目は履歴資料として扱う。
- 新たな互換経路を追加する場合は、追加理由、削除条件、検証先を明記する。

## Current Inventory

- Legacy router history path key: current compatibility APIではない。
- `ui-kbd[keys]` / host text: current compatibility APIではない。
- 未分類link failsafe: current compatibility APIではない。
- `ui-skip-link[href]`: current compatibility APIではない。
- `.status` class: current compatibility APIではない。
- `defer-hydration`: current compatibility APIではない。

## Operational Rule

Compatibility APIを新設する場合は、該当Contract、test、削除予定または維持理由を同時に更新する。
