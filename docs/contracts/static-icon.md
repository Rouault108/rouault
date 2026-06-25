# Static Icon Contract

## 位置づけ

Static iconは、旧`ui-icon` custom elementを復活させずに、静的HTMLとしてアイコンを出力するための契約である。

正本のstatic SVG rendererは`shared/icons/render-static-icon-html.ts`の`renderStaticIconHtml()`とする。このrendererは`iconify-icon`要素を出力せず、`<span>` wrapperとinline `<svg>`だけを返す。

## Decorative Icon

既存互換の呼び出し`renderStaticIconHtml(name, className)`はdecorative iconとして扱う。

- wrapperは`aria-hidden="true"`を持つ。
- wrapperは`role="img"`と`aria-label`を持たない。
- `className`は空白区切りで正規化し、空classを除去する。
- `static-icon` classが指定されていない場合は補完し、重複させない。

`label`を指定しないoptions呼び出しもdecorative iconとして扱う。`label`が`undefined`、`null`、空文字列、空白のみの場合もsemantic iconにはしない。

## Semantic Icon

Semantic iconはoptions呼び出しで非空の`label`を指定した場合だけ出力する。

```ts
renderStaticIconHtml('search', {
  className: 'search-trigger__icon',
  label: 'Search notes',
});
```

この場合、wrapperは`role="img"`とtrim済みlabelの`aria-label`を持つ。wrapperは`aria-hidden="true"`を持たない。

`label`判定は`typeof label === 'string' ? label.trim() : ''`に統一する。`undefined`や`null`を文字列化してsemantic labelとして扱ってはならない。

## SVG Contract

Decorative iconとsemantic iconのどちらでも、内側の`<svg>`は`aria-hidden="true"`と`focusable="false"`を維持する。

`className`、`label`、`data-icon`に出力する属性値はHTML属性escapeする。少なくとも`&`、`<`、`>`、`"`をescape対象に含める。

## Legacy Runtime

Static icon rendererは`ui-icon` custom elementを生成しない。`<ui-icon>`の復活、`customElements.define('ui-icon', ...)`の追加、`@customElement('ui-icon')`の追加は、この契約の対象外であり禁止する。

Static icon rendererは`iconify-icon`要素も生成しない。runtime icon componentに責務を戻さず、静的HTMLとして完結する。
