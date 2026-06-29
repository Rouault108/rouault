# Link Card Static Reference Surface Decision Record

## Status

- Type: R3 Decision Record
- Date: 2026-06-29
- Request ID: REQ-LINK-CARD-STATIC-REFERENCE-SURFACE-001
- Change ID: CH-LINK-CARD-HOVER-STATIC-001 / CH-LINK-CARD-FOCUS-VISIBLE-PROJECTION-001
- Decision: Accepted
- Contract source of truth: `docs/contracts/markdown.md`
- Scope: Markdown link-card static reference surface and focus-visible projection

この文書はdecision recordです。現在のcontractを再定義する正本ではありません。現行contractの正本は`docs/contracts/markdown.md`です。

## Context

Markdown link-cardは、Markdown directive / auto link-card由来の本文内参照面である。
本文の読書体験では、cardがhoverで物理的に浮上すると、本文内の参照情報よりも操作面としての存在感が強くなる。

旧実装ではhover時に`transform: translateY(-1px)`とelevation shadowを使い、`prefers-reduced-motion`でhover transformを補正していた。
しかし、link-cardをstatic reference surfaceとして扱う場合、hover affordanceは操作可能性を示す静かな背景差分で足りる。

Phase1後もfocus表示は`.link-card:focus-within`を外周focus ringの正本としていた。
この契約では、マウスクリックでnative anchorがfocusを受けた場合にも親`.link-card`に強いfocus ringが表示される。
Markdown link-cardもnative anchorを操作面とするblock link surfaceであり、focus表示の正本はポインターclick由来の`:focus-within`ではなく、キーボードfocus visibleを表す`.link-card__link:focus-visible`へ寄せる必要がある。

## Decision

Phase1では、Markdown link-cardのhover contractだけを変更する。

`.link-card:not(.link-card--invalid):hover`は、`--bg-hover`を`--bg-surface-2`へ重ねたbackground差分と`border-color: var(--border-default)`を使う。
hover blockは`transform`を所有しない。
hover blockは`--elevation-*`と`--border-strong`を使わない。
hover blockは`box-shadow: none`を明示する。

`.link-card`本体の`transition`は`box-shadow`と`transform`を対象にしない。

invalid link-cardは引き続きhover対象外である。

Phase2では、Markdown link-cardのfocus表示を`.link-card:focus-within`から`.link-card__link:focus-visible`へ移行する。
`.link-card__link`は`border-radius: inherit`を持ち、`:has()`非対応環境では`.link-card__link:focus-visible`がfallback outline、outline-offset、focus animationを所有する。

`:has()`対応環境では、`.link-card:has(> .link-card__link:focus-visible)`へ外周focus ringを投影する。
この環境では二重ringを避けるため、`.link-card__link:focus-visible`のoutlineとanimationを抑制する。

forced-colorsではhoverとfocus-visibleを分離する。
hoverはCanvasText outlineで静かな操作可能性を示し、focus-visibleはfallback環境では`.link-card__link:focus-visible`のHighlight outline-color、`:has()`対応環境では親`.link-card:has(> .link-card__link:focus-visible)`のHighlight outlineで示す。

JSによるinput modality trackingは導入しない。

DOM構造、Markdown directive構文、auto link-card生成仕様、metadata同期、`data-link-surface="card"`契約、ARIA属性、router、hydration、client enhancer、画像プレビューは変更しない。
`card-link.css`、`syntax.css`、result-card、検索結果UI、コーパス一覧UIへ一般化しない。

## Consequences

Markdown link-cardは、hover時にも本文内のstatic reference surfaceとして静かに振る舞う。
物理的浮上がなくなるため、読書中の視覚ノイズと操作面としての過剰な強調を抑えられる。

hover transitionから`box-shadow`と`transform`を外すため、旧hover transform向けのreduced-motion補正は不要になる。

focus表示はnative anchorの`:focus-visible`を正本にするため、ポインターclick後focusだけでは親`.link-card`にfocus-visible相当の外周ringを出さない。
`:has()`非対応環境でもfallback outlineが残るため、キーボードfocus visibleは不可視にならない。
`:has()`対応環境では親surfaceのoutlineへ投影され、本文内の参照面としてfocus位置をカード単位で把握できる。
