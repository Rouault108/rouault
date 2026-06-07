# Static Icon Contract

## 位置づけ

Static icon は、旧 `ui-icon` custom element を復活させずに、静的 HTML としてアイコンを出力するための契約である。

正本の static SVG renderer は `shared/icons/render-static-icon-html.ts` の `renderStaticIconHtml()` とする。この renderer は `iconify-icon` 要素を出力せず、`<span>` wrapper と inline `<svg>` だけを返す。

## Decorative Icon

既存互換の呼び出し `renderStaticIconHtml(name, className)` は decorative icon として扱う。

- wrapper は `aria-hidden="true"` を持つ。
- wrapper は `role="img"` と `aria-label` を持たない。
- `className` は空白区切りで正規化し、空 class を除去する。
- `static-icon` class が指定されていない場合は補完し、重複させない。

`label` を指定しない options 呼び出しも decorative icon として扱う。`label` が `undefined`、`null`、空文字列、空白のみの場合も semantic icon にはしない。

## Semantic Icon

Semantic icon は options 呼び出しで非空の `label` を明示した場合だけ出力する。

```ts
renderStaticIconHtml('search', {
  className: 'search-trigger__icon',
  label: 'Search notes',
});
```

この場合、wrapper は `role="img"` と trim 済み label の `aria-label` を持つ。wrapper は `aria-hidden="true"` を持たない。

`label` 判定は `typeof label === 'string' ? label.trim() : ''` に統一する。`undefined` や `null` を文字列化して semantic label として扱ってはならない。

## SVG Contract

Decorative icon と semantic icon のどちらでも、内側の `<svg>` は `aria-hidden="true"` と `focusable="false"` を維持する。

`className`、`label`、`data-icon` に出力する属性値は HTML 属性 escape する。少なくとも `&`、`<`、`>`、`"` を escape 対象に含める。

## Legacy Runtime

Static icon renderer は `ui-icon` custom element を生成しない。`<ui-icon>` の復活、`customElements.define('ui-icon', ...)` の追加、`@customElement('ui-icon')` の追加は、この契約の対象外であり禁止する。

Static icon renderer は `iconify-icon` 要素も生成しない。runtime icon component に責務を戻さず、静的 HTML として完結する。
