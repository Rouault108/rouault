# Details Block Static Prose Disclosure

## Status

- Type: R2-lite ADR
- Date: 2026-06-30
- Failure ID: F-DETAILS-STATIC-PROSE-DISCLOSURE-001
- Cause ID: C-DETAILS-CHEVRON-ORDER-FLEX-PUSH-001
- Additional Cause ID: C-DETAILS-OPEN-BODY-BORDER-PANEL-SALIENCE-001
- Scope: Markdown `::details` final DOM order and `details-block` CSS visual contract

この文書はR2-liteの設計背景記録であり、R3 Decision Recordではない。現在の契約正本は`docs/contracts/markdown.md`、final DOM詳細は`docs/references/markdown-output.md`を参照する。

## Context

static-first移行後、`::details`由来の`details.details-block`はnative `details/summary`を維持した一方で、summary内のchevronがsummary textの後に置かれ、summary contentのflex伸長によって右端へ押し出されていた。

またopen時のbody `border-top`により、default detailsが本文中の補足ではなくpanel surfaceに見えやすくなっていた。

## Decision

- `::details`は本文内prose disclosureとして扱う。
- native `details/summary`は維持する。
- chevronはsummary textの左に置く。
- body indentはsummary text開始位置に従属させる。
- 旧`ui-details` custom elementは復活させない。
- bordered variant、region、JS animationは今回の範囲外とする。

## Consequences

短いsummaryでもchevronが右端へ押し出されず、本文中の補足として静かに読める。JSなしでもnative `details/summary`として開閉できる。

この変更は`details-block`に閉じ、translation fallback、header menu、static choice menuなど他の`details/summary` UIのchevron方針へ波及させない。

## Rollback

問題が出た場合は、`toStaticDetails()`のsummary子要素順、`details-block.css`のleft chevron向けCSS、対応するテストとdocs/ADRを同じ単位で戻す。
