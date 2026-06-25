# Checkbox

Rouaultの現行checkbox契約は、旧`ui-checkbox` custom elementではなく、HTML標準の`<input type="checkbox">`とMarkdown task list由来の静的markupを正本とします。

## 現行契約

### Native checkbox

フォームや検索UIでcheckboxを使う場合は、native `<input type="checkbox">`をそのまま使います。`checked`、`disabled`、`required`、`name`、`value`、`id`、`aria-*`、`label for`、`input` / `change` event、フォーム送信、妥当性はHTML標準のcheckbox契約に従います。

Rouault側で担う責務は、静的HTMLとCSSによる読書面に合う見た目、ラベルとの関連付け、focus visible、forced colors、reduced motionを含むアクセシビリティ維持に限ります。checkboxの状態所有、フォーム参加、妥当性、イベント順序を独自component APIとして再定義しません。

### Task-list static markup

Markdown task listは、build-timeのMarkdown変換で静的なtask-list markupへ投影します。出力はtask list item内のnative checkboxと関連class / attributeによって表現します。

task listのcheckboxは本文の一部として読むための静的surfaceです。必要な場合も、hydration triggerやcustom element definitionへ戻さず、静的HTMLと最小限のCSS contractで成立させます。

## 履歴資料

旧`ui-checkbox` custom element契約は廃止済みであり、現行実装契約ではありません。履歴上の参照が必要な場合は [docs/old/design-system/ui-checkbox.md](../../old/design-system/ui-checkbox.md) を参照してください。
