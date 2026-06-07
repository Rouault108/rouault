# Static Select Contract

## 位置づけ

Static select は、旧 `ui-select` custom element を復活させず、標準の `<select>` に責務を委譲するための契約である。現行の適用対象は search page の静的 HTML surface に限定する。

この契約は、旧 custom element の API 互換を維持するものではない。選択状態、フォーム送信名、初期 selected option、ブラウザ標準の change event は native element の契約として扱う。

## 現行契約

`renderSearchPageHtml()` が search page の select を出力するときは、次を満たす。

- 各 `<select>` は `name` を持ち、FormData から検索状態へ読める。
- 各 `<select>` は `id` を持ち、対応する `<label for>` と一致する。
- `id` は既存の `StaticRenderIdContext` から予約し、固定 ID、乱数、グローバル counter、fixture 専用 ID を使わない。
- 初期状態に対応する `<option selected>` を出力する。
- `readonly` は出力しない。必要な制御不能状態は native select の範囲で扱う。

最小例:

```html
<label for="search-page-sort-select">
  <span>Sort</span>
  <select id="search-page-sort-select" name="sort">
    <option value="relevance" selected>Relevance</option>
  </select>
</label>
```

## 旧契約

旧 `ui-select` の custom listbox、custom event detail、独自 property、独自 readonly 表現は現行契約として維持しない。`<ui-select>` を final HTML、SSR target、hydration registry、manifest へ戻してはならない。

## 今回追加しないもの

次の helper、CSS、抽象 contract は追加しない。

- `src/layouts/form-control-html.ts`
- `src/layouts/select-html.ts`
- `src/layouts/static-select-html.ts`
- `src/assets/css/select.css`
- `docs/contracts/static-form-controls.md`
- `renderStaticSelectHtml`
- `renderStaticFormControlHtml`
- `renderSelectHtml`
- `renderStaticNativeSelectHtml`

必要になった場合は、具体的な利用箇所と責務境界を別件で定義してから追加する。
