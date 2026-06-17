# Static Kbd Contract

## 位置づけ

Static kbd は、旧 `ui-kbd` custom element を復活させず、標準の `<kbd>` に責務を委譲するための契約である。キーボード入力やショートカット表記は、本文や UI 文脈で必要な最小単位の native HTML として出力する。

## 現行契約

現行契約では `<kbd>` をそのまま使う。複合ショートカットを表す場合も、文脈側が必要な文字列や複数の `<kbd>` を直接構成する。

最小例:

```html
<kbd>Ctrl</kbd>
```

`<kbd>` は意味要素であり、旧 runtime component の hydration、manifest 登録、custom element 定義を必要としない。

## 旧契約

旧 `ui-kbd` は、tokens、component-level composite shortcut rendering、key reading normalization、sr-only reading support、slot fallback のような component API を持つ前提で扱われていた。これらは現行契約として維持しない。

`ui-kbd[tokens]`、`tokens property`、`customElements.define('ui-kbd', ...)`、`@customElement('ui-kbd')` は復活させない。

## 今回追加しないもの

次は追加しない。

- `src/layouts/kbd-html.ts`
- `renderStaticKbdHtml`
- `ui-kbd[tokens]`
- `tokens property`
- `component-level composite shortcut rendering`
- `key reading normalization`
- `sr-only reading support`
- `slot fallback`

必要になった場合は、native `<kbd>` で足りない具体的な利用箇所を確認し、旧 custom element API 互換ではなく現行の静的 HTML 契約として別件で定義する。
