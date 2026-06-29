# DR-CODE-GROUP-EMBEDDED-SURFACE-001: Treat group-owned code blocks as embedded code surface bodies

## Status

Accepted

## Decision Record ID

DR-CODE-GROUP-EMBEDDED-SURFACE-001

## R stage/A level

R3/A0

R3理由:

* code groupのvisual contractとdesign-system contractを変更する。
* code block surfaceとcode group surfaceのownership boundaryを固定する。
* CSS contract、code surface contract、Design System patternを同時に更新する。

A0理由:

* private / restricted Evidenceは扱わない。
* content本文、secret、外部サービスを変更しない。
* CSS、文書、SSR CSS contract testで検証可能である。

## Context

現状のcode groupは、外側の`section[data-code-group]`がsurfaceを持ち、内部の`[data-code-block-root][data-code-group-owned='true']`も通常code blockのsurfaceを受ける。そのため、読書面では「code groupの中に独立したcode block cardが入っている」ように見える。

Rouaultのcode groupは、複数panelを1つのcode surface内で切り替えるための局所UIである。通常の本文構造切替で使う`ui-tabs`とは、no-JS stack、print all panels、copy source同期、code body overflowの契約が異なる。

## Decision

* outer surface ownershipを`section[data-code-group]`へ集約する。
* `section[data-code-group]`がborder、background、radius、overflow clippingを所有する。
* group-owned code blockはsemantic / code body wrapperとし、独立surfaceとして見せない。
* group-owned rootはsurface視覚、余白、overflow clipping、root-level focus shadowを持たない。
* code group tabsは`ui-tabs`へ統合しない。
* enhanced状態ではheaderとcode bodyを1つのsurface内の上下領域として表示する。
* header / body dividerはforced-colorsでも視認可能にし、`box-shadow`だけへ依存させない。
* DOM、Markdown構文、ARIA enhancer、copy同期、URL、routingは変更しない。

## Alternatives considered

### `ui-tabs`へ統合する

通常tabs componentへ寄せる案。

### 通常tabsと完全に視覚統一する

実装は分けたまま、selected / hover / focusなどの見た目だけを通常`ui-tabs`へ揃える案。

### 文書だけ更新する

CSSを変更せず、group-owned code blockが独立cardに見える現状を契約文書で追認する案。

## Counter-hypothesis review

反対仮説: 内側code blockを独立cardのまま残したほうがpanel境界が明確ではないか。

回答: 境界はouter surface、header / body divider、stack label、panel dividerで示せる。内側cardを重ねると、読書面では二重surfaceが過剰になり、code groupが1つの局所surfaceであることが弱くなる。

反対仮説: 通常`ui-tabs`と統一したほうが保守性が高いのではないか。

回答: code groupはno-JSで全panelをstack表示し、printでも全panelを表示し、active panelのcopy source同期を持つ。通常`ui-tabs`とは契約が異なるため、統一すると責務境界が曖昧になる。

反対仮説: header / body dividerを`box-shadow`だけで実装しても十分ではないか。

回答: forced-colorsでは`box-shadow`だけのdividerが視認不能になる可能性がある。dividerはforced-colorsでもborder fallbackを持つ必要がある。

## Why rejected

* 読書面で二重surfaceが過剰である。
* no-JS / print / copy同期契約が通常`ui-tabs`とは異なる。
* forced-colorsで`box-shadow`だけのdividerは視認不能になる可能性がある。
* 文書だけの更新では、実際のvisual contractと契約が一致しない。

## Compatibility impact

DOM、Markdown構文、ARIA enhancer、copy同期、URL、routingは不変である。

通常`ui-tabs`のCSS、実装、component contractは変更しない。code group tabsはEmbedded Code Tabsとして扱い、Content Tabsとは同一componentでも同一visual variantでもない。

visual compatibilityとしては、group-owned code blockのborder、background、radius、root-level focus shadow、overflow clippingが消え、outer code group surfaceへ集約される。

## Acceptance / Verification

Acceptance:

* A-CODE-GROUP-SINGLE-SURFACE-001
* A-CODE-GROUP-NOJS-STACK-001
* A-CODE-GROUP-PRINT-001
* A-CODE-GROUP-TABS-VARIANT-001
* A-CODE-GROUP-CAPTION-NONREGRESSION-001
* A-CODE-GROUP-FORCED-COLORS-001
* A-CODE-GROUP-HEADER-DIVIDER-001
* A-CODE-GROUP-HEADER-DIVIDER-FORCED-COLORS-001
* A-CODE-GROUP-OVERFLOW-OWNERSHIP-001
* A-CODE-GROUP-RESET-SCOPE-001
* A-CODE-GROUP-NONREGRESSION-001

Verification:

* `pnpm run test:ssr -- test/ssr/static-css-contracts.test.ts`
* `pnpm run test:ssr -- test/ssr/rehype-static-code-groups.test.ts`
* `pnpm run test:browser -- test/browser/code-group-enhancer.browser.test.ts`
* `pnpm run test:browser -- test/browser/code-preview.browser.test.ts`

## Rollback

group-owned code block rootのvisual resetとroot-level focus shadow抑止を戻し、`section[data-code-group]`のheader / panel divider追加を戻す。あわせて`docs/contracts/code-surfaces.md`、`docs/design-system/patterns.md`、SSR CSS contract test、本ADRの登録を戻す。

Rollback時もDOM、Markdown構文、ARIA enhancer、copy同期、URL、routing、通常`ui-tabs`は変更しない。

## Out of scope

* DOM変更
* enhancer変更
* `ui-tabs`変更
* `docs/design-system/components/tabs.md`変更
* Markdown構文変更
* URL同期追加
* token体系新設
