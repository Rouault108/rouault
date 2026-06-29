# Link Card Static Reference Surface Decision Record

## Status

- Type: R3 Decision Record
- Date: 2026-06-29
- Request ID: REQ-LINK-CARD-STATIC-REFERENCE-SURFACE-001
- Change ID: CH-LINK-CARD-HOVER-STATIC-001
- Contract source of truth: `docs/contracts/markdown.md`
- Scope: Phase1 Markdown link-card hover surface

この文書はdecision recordです。現在のcontractを再定義する正本ではありません。現行contractの正本は`docs/contracts/markdown.md`です。

## Context

Markdown link-cardは、Markdown directive / auto link-card由来の本文内参照面である。
本文の読書体験では、cardがhoverで物理的に浮上すると、本文内の参照情報よりも操作面としての存在感が強くなる。

旧実装ではhover時に`transform: translateY(-1px)`とelevation shadowを使い、`prefers-reduced-motion`でhover transformを補正していた。
しかし、link-cardをstatic reference surfaceとして扱う場合、hover affordanceは操作可能性を示す静かな背景差分で足りる。

## Decision

Phase1では、Markdown link-cardのhover contractだけを変更する。

`.link-card:not(.link-card--invalid):hover`は、`--bg-hover`を`--bg-surface-2`へ重ねたbackground差分と`border-color: var(--border-default)`を使う。
hover blockは`transform`を所有しない。
hover blockは`--elevation-*`と`--border-strong`を使わない。
hover blockは`box-shadow: none`を明示する。

`.link-card`本体の`transition`は`box-shadow`と`transform`を対象にしない。

invalid link-cardは引き続きhover対象外である。

DOM構造、Markdown directive構文、auto link-card生成仕様、metadata同期、`data-link-surface="card"`契約、ARIA属性、router、hydration、client enhancer、画像プレビューは変更しない。

## Planned Follow-up

focus-visible projectionは後続Phaseで検討する。
Phase1時点では、focus-visible projection、`:focus-within`契約、forced-colorsのfocus分離を現行契約として先取りしない。

## Consequences

Markdown link-cardは、hover時にも本文内のstatic reference surfaceとして静かに振る舞う。
物理的浮上がなくなるため、読書中の視覚ノイズと操作面としての過剰な強調を抑えられる。

hover transitionから`box-shadow`と`transform`を外すため、旧hover transform向けのreduced-motion補正は不要になる。
