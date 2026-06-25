# Static Skeleton Contract

## 位置づけ

Static skeletonは、旧`ui-skeleton` custom elementを復活させずに、静的HTML主体のローディング表現を維持するための縮退契約である。

この契約は次の二つを分けて扱う。

- global `.skeleton` utility
- `ui-file-tree` internal skeleton markup

旧`ui-skeleton`の`variant`、`width`、`height`、`animated` APIは現行contractではない。`@customElement('ui-skeleton')`、`customElements.define('ui-skeleton', ...)`、`<ui-skeleton>`の復活は禁止する。

## Global `.skeleton` Utility

global `.skeleton`は`src/assets/css/utility-surfaces.css`にあるvisual-only CSS utilityである。任意の静的HTMLへloading shimmerの見た目を与えるためのCSS hookであり、意味や状態を所有しない。

`.skeleton` utilityは次を持つ。

- `.skeleton`の背景、角丸、overflow、positionの視覚contract
- `.skeleton::after`のshimmer layer
- `prefers-reduced-motion: reduce`で`.skeleton::after`のanimationを停止するcontract

`.skeleton` utilityは次を持つ契約ではない。

- `role`
- `aria-live`
- `aria-busy`
- `aria-hidden`

したがって、global `.skeleton`を付けたDOMが支援技術から隠されるか、処理中状態として通知されるかは、utility CSSではなくskeleton DOMを出す側の契約で決める。

## `ui-file-tree` Internal Skeleton

`ui-file-tree`はretained Lit componentであり、`loadingStrategy="replace"`かつ`loading=true`の場合に、内部shadow DOMのtree item群をskeleton markupへ置き換える。

このinternal skeleton markupは次を維持する。

- hostは`aria-busy="true"`を持つ。
- skeleton wrapperは`.skeleton[aria-hidden="true"]`を持つ。
- skeleton itemは`.skeleton-item`として5件出力する。
- `ui-tree-item`は出力しない。

`loadingStrategy="retain"`かつ`loading=true`の場合、hostは`aria-busy="true"`を持つが、既存tree itemを維持し、internal `.skeleton`は出力しない。

`aria-hidden="true"`はglobal `.skeleton` utilityの契約ではなく、実際にskeleton DOMを出す側の契約である。現行では`ui-file-tree` internal skeletonがその所有者である。

## 追加しないもの

この縮退契約では次を追加しない。

- `src/layouts/skeleton-html.ts`
- `src/assets/css/skeleton.css`
- 旧`ui-skeleton` custom element
- 旧custom element APIを受ける互換層

現行contractを満たす`src/assets/css/utility-surfaces.css`と`src/components/ui/file-tree/file-tree.ts`は、整理名目では変更しない。
