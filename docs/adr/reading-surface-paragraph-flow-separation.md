# ADR-READING-PARAGRAPH-FLOW-SEPARATION-001: Separate paragraph and block flow spacing on reading surfaces

## Status

Accepted

## Request

Request ID: REQ-READING-PARAGRAPH-FLOW-001

Rouaultの読書面で、段落間余白とblock間余白を分離する。
短文段落が連続した場合の空白感を軽減しつつ、表、図、コード、引用、callout、リストなどのblock遷移余白は維持する。

## R stage / A level

R stage: R3
A level: A0

R3理由:

* Design System pattern contractを変更する。
* `.prose` / `.about-prose`の読書面flow selector契約を追加する。
* CSS token、SSR CSS contract、Design System文書、Markdown authoring guideへ影響する。

A0理由:

* private/restricted Evidenceは扱わない。
* content本文やsecretを変更しない。
* 通常のdiff、テスト、手動確認で十分である。

## Decision

Decision ID: D-READING-PARAGRAPH-FLOW-SEPARATION-001

読書面の汎用block flowである`--reading-flow-space`を維持し、連続段落専用に`--reading-paragraph-space`を追加する。

採用仕様:

* `--reading-flow-space: var(--space-4);`を維持する。
* `--reading-paragraph-space: var(--space-3);`を追加する。
* `.prose` / `.about-prose`直下の`p + p`は`--reading-paragraph-space`を使う。
* `.prose` / `.about-prose`配下の`ui-tabs` panel直下の`p + p`も同じtokenを使う。
* 非段落block遷移は既存の`--reading-flow-space`を維持する。

## Rationale

一律の`--reading-flow-space`は、表、図、コード、引用、callout、リストなどのblock遷移では読みやすい休止を作る。
しかし短文段落が連続する場面では、段落間の休止として相対的に強く見える。

About専用selectorで詰めると、読書面共通の問題をページ固有hackへ閉じ込めてしまう。
そのため、Design System patternとして`p + p`だけを別tokenに分離し、block遷移余白は維持する。

## Rejected alternatives

### Alternative A: Reduce `--reading-flow-space`

棄却する。

理由:

* 表、図、コード、引用、callout、リストなどのblock遷移余白まで詰まる。
* 既存の読書面block rhythmの後方互換性を壊す。

### Alternative B: Add an About-only override

棄却する。

理由:

* About専用hackになり、note本文の短文段落では同じ問題が残る。
* `.prose` / `.about-prose`の読書面共通patternとして扱うほうが責務が明確である。

### Alternative C: Measure paragraph line count with JavaScript

棄却する。

理由:

* static-first / no-JS baselineを弱める。
* 段落の見た目をruntime測定へ依存させる必要がない。

## Contract impact

Affected contracts:

* Design System reading surface flow pattern
* CSS token contract
* SSR CSS contract
* Markdown authoring guideの補足説明

Unaffected contracts:

* Markdown parser / transformer
* About content structure
* router / URL
* ARIA
* hydration
* search
* TOC
* `--reading-body-size`
* `--reading-body-line-height`
* `--reading-measure`

## Acceptance

* A-READING-PARAGRAPH-FLOW-001: `.prose` / `.about-prose`直下の`p + p`が`--reading-paragraph-space`を使う。
* A-READING-PARAGRAPH-FLOW-002: 非段落block遷移は`--reading-flow-space`を維持する。
* A-READING-PARAGRAPH-FLOW-003: `ui-tabs` panel内の`p + p`も同じ契約になる。
* A-READING-PARAGRAPH-FLOW-004: About専用hackを入れない。
* A-READING-PARAGRAPH-FLOW-005: Markdown authoring guideに段落分割の補足を追加する。
* A-READING-PARAGRAPH-FLOW-006: `docs/design-system/pattern-reading-surface.md`を追加する。
* A-READING-PARAGRAPH-FLOW-007: `docs/design-system/patterns.md`から新規pattern文書へ導線を張る。
* A-READING-PARAGRAPH-FLOW-008: `--reading-flow-space`互換性を壊さない。
* A-READING-PARAGRAPH-FLOW-009: `docs/design-system/foundations.md`と`docs/adr/README.md`を変更しない。

## Verification

* V-READING-PARAGRAPH-FLOW-001: CSS contract testで`--reading-paragraph-space`を検証する。
* V-READING-PARAGRAPH-FLOW-002: CSS contract testで直下`p + p` ruleを検証する。
* V-READING-PARAGRAPH-FLOW-003: CSS contract testで`ui-tabs` panel内`p + p` ruleを検証する。
* V-READING-PARAGRAPH-FLOW-004: 既存汎用flow ruleが`--reading-flow-space`を維持することを検証する。
* V-READING-PARAGRAPH-FLOW-005: Japanese/ASCII spacing repository policyを検証する。
* V-READING-PARAGRAPH-FLOW-006: buildを検証する。
* V-READING-PARAGRAPH-FLOW-007: `docs/design-system/patterns.md`と`docs/README.md`から新規Design System pattern文書へ到達できることを確認する。
* V-READING-PARAGRAPH-FLOW-008: Aboutと短文段落ノートを手動確認する。
* V-READING-PARAGRAPH-FLOW-009: `docs/design-system/foundations.md`と`docs/adr/README.md`に差分がないことを確認する。

## Rollback

`--reading-paragraph-space`、直下`p + p` rule、`ui-tabs` panel内`p + p` rule、関連CSS contract test、Design System pattern文書、Markdown authoring guide補足、ADR導線を削除すれば、元の`--reading-flow-space`一律運用へ戻せる。

## Out of scope

* About作者欄のcompact group化
* 本文コピー変更
* Markdown parser変更
* line-height変更
* CSSファイル再編
* 全体flow-space圧縮
* router / URL / ARIA / hydration / search / TOC変更
