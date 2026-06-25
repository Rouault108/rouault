# Static Checkbox Contract

Static checkboxは、旧`ui-checkbox` custom elementを復活させず、HTML標準の`<input type="checkbox">`とMarkdown task list由来の静的markupに責務を縮退するための契約である。

## 現行契約

### Native checkbox

通常のUIでcheckboxが必要な場合は、native `<input type="checkbox">`を使用する。`checked`、`disabled`、`required`、`name`、`value`、`id`、`aria-*`、`label for`、フォーム送信、妥当性、`input` / `change` eventはHTML標準のcheckbox契約に従う。

Rouault固有の責務は、静的HTMLで意味構造を成立させること、関連するlabelを維持すること、CSSで読書面に合う視覚表現を与えることに限る。checkboxの状態、フォーム参加、妥当性、イベント順序をcustom element APIとして再定義しない。

### Task-list static markup

Markdown task listは、build-timeのMarkdown変換で静的task-list markupへ投影する。出力はnative checkboxを含む通常のHTMLとして成立させる。

task listのcheckboxは本文に属する静的surfaceである。本文表示のためのclassやdata attributeは使えるが、hydration trigger、custom element definition、runtime component APIを契約に含めない。

## 旧契約

旧`ui-checkbox` custom element契約はdocs/old に隔離する。現行契約ではShadow DOM、Form-Associated Custom Element、property API、custom event、custom methodを`ui-checkbox`の公開仕様として扱わない。
