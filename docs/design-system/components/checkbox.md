# Checkbox

Rouault の現行 checkbox 契約は、旧 `ui-checkbox` custom element ではなく、HTML 標準の `<input type="checkbox">` と Markdown task list 由来の静的 markup を正本とします。

## 現行契約

### Native checkbox

フォームや検索 UI で checkbox を使う場合は、native `<input type="checkbox">` をそのまま使います。`checked`、`disabled`、`required`、`name`、`value`、`id`、`aria-*`、`label for`、`input` / `change` event、フォーム送信、妥当性は HTML 標準の checkbox 契約に従います。

Rouault 側で担う責務は、静的 HTML と CSS による読書面に合う見た目、ラベルとの関連付け、focus visible、forced colors、reduced motion を含むアクセシビリティ維持に限ります。checkbox の状態所有、フォーム参加、妥当性、イベント順序を独自 component API として再定義しません。

### Task-list static markup

Markdown task list は、build-time の Markdown 変換で静的な task-list markup へ投影します。出力は task list item 内の native checkbox と関連 class / attribute によって表現します。

task list の checkbox は本文の一部として読むための静的 surface です。必要な場合も、hydration trigger や custom element definition へ戻さず、静的 HTML と最小限の CSS contract で成立させます。

## 履歴資料

旧 `ui-checkbox` custom element 契約は廃止済みであり、現行実装契約ではありません。履歴上の参照が必要な場合は [docs/old/design-system/ui-checkbox.md](../../old/design-system/ui-checkbox.md) を参照してください。
