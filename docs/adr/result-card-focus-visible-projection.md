# result-card focus-visible projection

## Status

Accepted

## Context

result-cardはarticle.result-card > a.result-linkのnative link構造を使う。
現行CSSでは .result-card:focus-withinが外周focus ringを所有している。
そのため、マウスクリックでa.result-linkがfocusを受けた場合にも、
親result-cardに強いfocus ringが表示される。

この挙動はキーボード利用者には有効だが、
ポインター操作時にはfocus / active / selectedの視覚意味を混同させる。
Rouaultの読書UIでは、クリック後に強い青枠が残ることも視覚ノイズになる。

## Decision

result-cardの外周focus ringは、.result-card:focus-withinではなく、
.result-link:focus-visibleをsource of truthとして表示する。

:has() 対応環境では、
.result-card:has(> .result-link:focus-visible) に外周focus ringを投影する。

:has() 非対応環境では、
.result-link:focus-visibleのfallback outlineを残す。

:has() 対応環境では、
focus outlineとfocus animationの所有者をresult-cardに一本化し、
.result-link:focus-visibleではoutlineとanimationを抑制する。

JSによるinput modality trackingやclick delegationは導入しない。

DOM、URL、routing、data contract、ARIA属性は変更しない。

## Consequences

Tabなどのキーボード操作では、カード単位のfocus位置を明確に示せる。
マウスクリック時には、カード外周の強いfocus ringを抑制できる。
:has() 非対応環境でも、キーボードfocus visibleは不可視にならない。

link-card.cssとcard-link.cssには同種のfocus-within契約が残る。
それらは今回の対象外とし、必要であれば別Requestで統一方針を検討する。
