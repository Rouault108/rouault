# Static Select Contract

## 位置づけ

Static selectは、旧`ui-select` custom elementを復活させず、標準の`<select>`に責務を委譲するための契約であった。search pageの`tagMode` / `sort`に対するnative select surfaceは`D-SEARCH-DROPDOWN-UNIFY-001`によりsupersededであり、現行の正本は`docs/contracts/static-choice-menu.md`である。

この契約は、旧custom elementのAPI互換を維持するものではない。選択状態、フォーム送信名、初期selected option、ブラウザ標準のchange eventはnative elementの契約として扱う。

## Superseded 契約

過去のsearch page selectは、次を満たしていた。

- 各`<select>`は`name`を持ち、FormDataから検索状態へ読める。
- 各`<select>`は`id`を持ち、対応する`<label for>`と一致する。
- `id`は既存の`StaticRenderIdContext`から予約し、固定ID、乱数、グローバルcounter、fixture専用IDを使わない。
- 初期状態に対応する`<option selected>`を出力する。
- `readonly`は出力しない。必要な制御不能状態はnative selectの範囲で扱う。

最小例:

```html
<label for="search-page-sort-select">
  <span>Sort</span>
  <select id="search-page-sort-select" name="sort">
    <option value="relevance" selected>Relevance</option>
  </select>
</label>
```

## 現行契約

`renderSearchPageHtml()`はsearch pageの`tagMode` / `sort`用`<select>`を出力しない。`FormData`の`name="tagMode"` / `name="sort"`契約は、`form[data-search-page-form]`内のdisabledではないhidden inputによって維持する。

旧`ui-select`、`role="listbox"` / `role="option"`によるcustom select、native select surfaceは復活させない。

## Native Select Popup Boundary

検索ページにnative `<select>`が存在する場合でも、展開popup内部のoption selected background、hover state、popup shadow、row heightはUA / OS renderingとして扱う。

Rouaultが所有するのは、閉じたselect control、label、spacing、focus-visible、disabled state、form value contractまでである。

Header custom menuとのpopup内visual parityは保証しない。

## 旧契約

旧`ui-select`のcustom listbox、custom event detail、独自property、独自readonly表現は現行契約として維持しない。`<ui-select>`をfinal HTML、SSR target、hydration registry、manifestへ戻してはならない。

## 今回追加しないもの

次のhelper、CSS、抽象contractは追加しない。

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
