# Legacy UI Checkbox Contract

この文書は廃止済みの旧 `ui-checkbox` custom element 契約に関する履歴資料であり、Rouault の現行実装契約ではありません。現行契約は `docs/contracts/static-checkbox.md` と `docs/design-system/components/checkbox.md` の native checkbox / task-list static markup を正本とします。

## 旧契約の範囲

旧 `ui-checkbox` は、二値選択または部分選択状態を表現する Lit custom element として扱われていた。公開入力には `checked`、`indeterminate`、`name`、`value`、`label`、`disabled`、`required`、`invalid`、`errorMessage` が含まれ、内部実装は Shadow DOM と Form-Associated Custom Element を前提としていた。

旧契約では、ユーザー操作に由来する `input` / `change` event、`focus()`、`blur()`、`checkValidity()`、`reportValidity()` などの custom element method、ElementInternals によるフォーム参加と妥当性、`::part(control)` / `::part(label)` などの style extension surface を扱っていた。

## 現行契約ではない事項

次の事項は履歴上の説明であり、現行 API として扱わない。

- `<ui-checkbox>` custom element
- `@customElement('ui-checkbox')`
- `customElements.define('ui-checkbox', ...)`
- Shadow DOM 内部構造
- Form-Associated Custom Element と ElementInternals
- `checked` / `indeterminate` などを `ui-checkbox` property API として扱う契約
- `input` / `change` を `ui-checkbox` の custom event として再定義する契約
- `focus()` / `blur()` / `checkValidity()` / `reportValidity()` を `ui-checkbox` method として公開する契約

現行実装へ戻す必要がある場合でも、この文書を根拠に旧 custom element を復活させてはならない。必要な責務は native checkbox、静的 HTML、変換層、または既存の静的 CSS contract に分離して扱う。
