# Static Checkbox Contract

Static checkbox は、旧 `ui-checkbox` custom element を復活させず、HTML 標準の `<input type="checkbox">` と Markdown task list 由来の静的 markup に責務を縮退するための契約である。

## 現行契約

### Native checkbox

通常の UI で checkbox が必要な場合は、native `<input type="checkbox">` を使用する。`checked`、`disabled`、`required`、`name`、`value`、`id`、`aria-*`、`label for`、フォーム送信、妥当性、`input` / `change` event は HTML 標準の checkbox 契約に従う。

Rouault 固有の責務は、静的 HTML で意味構造を成立させること、関連する label を維持すること、CSS で読書面に合う視覚表現を与えることに限る。checkbox の状態、フォーム参加、妥当性、イベント順序を custom element API として再定義しない。

### Task-list static markup

Markdown task list は、build-time の Markdown 変換で静的 task-list markup へ投影する。出力は native checkbox を含む通常の HTML として成立させる。

task list の checkbox は本文に属する静的 surface である。本文表示のための class や data attribute は使えるが、hydration trigger、custom element definition、runtime component API を契約に含めない。

## 旧契約

旧 `ui-checkbox` custom element 契約は docs/old に隔離する。現行契約では Shadow DOM、Form-Associated Custom Element、property API、custom event、custom method を `ui-checkbox` の公開仕様として扱わない。
