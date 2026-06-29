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

result-cardのfocus-visible投影はoutlineを正本とする。
elevation shadowはfocus-visible可視性の要件ではない。
hover elevationを廃止しても、keyboard focus-visibleの可視性はoutline、outline-offset、focus animationで担保する。
`:focus-within`を使ったポインタークリック由来の外周強調は復活させない。

Follow-up: link-card.cssについては、後続ADR `docs/adr/link-card-static-reference-surface.md`でfocus-visible projectionへ移行した。
card-link.cssは引き続き本ADRの対象外である。
