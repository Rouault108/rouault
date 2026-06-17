# Static Skeleton Contract

## 位置づけ

Static skeleton は、旧 `ui-skeleton` custom element を復活させずに、静的 HTML 主体のローディング表現を維持するための縮退契約である。

この契約は次の二つを分けて扱う。

- global `.skeleton` utility
- `ui-file-tree` internal skeleton markup

旧 `ui-skeleton` の `variant`、`width`、`height`、`animated` API は現行 contract ではない。`@customElement('ui-skeleton')`、`customElements.define('ui-skeleton', ...)`、`<ui-skeleton>` の復活は禁止する。

## Global `.skeleton` Utility

global `.skeleton` は `src/assets/css/utility-surfaces.css` にある visual-only CSS utility である。任意の静的 HTML へ loading shimmer の見た目を与えるための CSS hook であり、意味や状態を所有しない。

`.skeleton` utility は次を持つ。

- `.skeleton` の背景、角丸、overflow、position の視覚 contract
- `.skeleton::after` の shimmer layer
- `prefers-reduced-motion: reduce` で `.skeleton::after` の animation を停止する contract

`.skeleton` utility は次を持つ契約ではない。

- `role`
- `aria-live`
- `aria-busy`
- `aria-hidden`

したがって、global `.skeleton` を付けた DOM が支援技術から隠されるか、処理中状態として通知されるかは、utility CSS ではなく skeleton DOM を出す側の契約で決める。

## `ui-file-tree` Internal Skeleton

`ui-file-tree` は retained Lit component であり、`loadingStrategy="replace"` かつ `loading=true` の場合に、内部 shadow DOM の tree item 群を skeleton markup へ置き換える。

この internal skeleton markup は次を維持する。

- host は `aria-busy="true"` を持つ。
- skeleton wrapper は `.skeleton[aria-hidden="true"]` を持つ。
- skeleton item は `.skeleton-item` として 5 件出力する。
- `ui-tree-item` は出力しない。

`loadingStrategy="retain"` かつ `loading=true` の場合、host は `aria-busy="true"` を持つが、既存 tree item を維持し、internal `.skeleton` は出力しない。

`aria-hidden="true"` は global `.skeleton` utility の契約ではなく、実際に skeleton DOM を出す側の契約である。現行では `ui-file-tree` internal skeleton がその所有者である。

## 追加しないもの

この縮退契約では次を追加しない。

- `src/layouts/skeleton-html.ts`
- `src/assets/css/skeleton.css`
- 旧 `ui-skeleton` custom element
- 旧 custom element API を受ける互換層

現行 contract を満たす `src/assets/css/utility-surfaces.css` と `src/components/ui/file-tree/file-tree.ts` は、整理名目では変更しない。
