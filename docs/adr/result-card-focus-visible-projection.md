# result-card focus-visible projection

## Status

Accepted

## Context

result-card は article.result-card > a.result-link の native link 構造を使う。
現行 CSS では .result-card:focus-within が外周 focus ring を所有している。
そのため、マウスクリックで a.result-link が focus を受けた場合にも、
親 result-card に強い focus ring が表示される。

この挙動はキーボード利用者には有効だが、
ポインター操作時には focus / active / selected の視覚意味を混同させる。
Rouault の読書 UI では、クリック後に強い青枠が残ることも視覚ノイズになる。

## Decision

result-card の外周 focus ring は、.result-card:focus-within ではなく、
.result-link:focus-visible を source of truth として表示する。

:has() 対応環境では、
.result-card:has(> .result-link:focus-visible) に外周 focus ring を投影する。

:has() 非対応環境では、
.result-link:focus-visible の fallback outline を残す。

:has() 対応環境では、
focus outline と focus animation の所有者を result-card に一本化し、
.result-link:focus-visible では outline と animation を抑制する。

JS による input modality tracking や click delegation は導入しない。

DOM、URL、routing、data contract、ARIA 属性は変更しない。

## Consequences

Tab などのキーボード操作では、カード単位の focus 位置を明確に示せる。
マウスクリック時には、カード外周の強い focus ring を抑制できる。
:has() 非対応環境でも、キーボード focus visible は不可視にならない。

link-card.css と card-link.css には同種の focus-within 契約が残る。
それらは今回の対象外とし、必要であれば別 Request で統一方針を検討する。
