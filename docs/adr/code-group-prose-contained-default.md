# ADR-CODE-GROUP-PROSE-CONTAINED-001: Keep top-level code groups contained in prose

## Status

Accepted

## Decision Record ID

D-CODE-GROUP-PROSE-CONTAINED-001

## Request ID

REQ-CODE-GROUP-PROSE-CONTAINED-001

## R stage/A level

R3/A0

R3理由:

* code groupの既定visual contractを変更する。
* `.prose` / `.about-prose`直下のcode group layout contractへ影響する。
* CSS contract、code surface contract、既存ADRとの関係を更新する。

A0理由:

* private/restricted Evidenceは扱わない。
* content本文、secret、外部サービスを変更しない。
* CSS、文書、SSR CSS contract testで検証可能である。

## Context

`ADR-CODE-BLOCK-PROSE-CONTAINED-001`では、単独code blockを本文幅内に収め、code groupは比較・切替surfaceとしてmobile / desktopで本文幅からbreakoutする方針を採用した。

その後の読書体験確認では、`.prose` / `.about-prose`直下のcode group外枠が本文幅から張り出すこと自体が、本文の静かな読み筋を乱すケースがあると判断した。code groupは複数panelを扱うsurfaceであるが、長いコード行は各`pre[data-code-block]`内部で横スクロールでき、長いtab列はtablist側で横スクロールできる。top-level surfaceの外枠を既定で広げる必要はない。

## Decision

`.prose` / `.about-prose`直下の`section[data-code-group]`は、既定では本文幅内に収める。

* base defaultとして`--ui-code-group-width: 100%`と`--ui-code-group-margin-inline: 0`を維持する。
* mobile / desktop media queryでは、top-level prose / about-prose code groupの`--ui-code-group-width`と`--ui-code-group-margin-inline`を再定義しない。
* `section[data-code-group]`本体の`inline-size` / `margin-inline`は、引き続き`--ui-code-group-*`と`--ui-code-surface-breakout-*`fallbackを参照する。
* group-owned code block reset、inline code block reset、tabs panel内contained resetは維持する。
* DOM生成、ARIA semantics、enhancer、copy、syntax highlight、routing、data contractは変更しない。

## Supersedes

このdecisionは`ADR-CODE-BLOCK-PROSE-CONTAINED-001`を部分的に上書きする。

上書き対象は同ADRのcode group breakout部分だけである。具体的には、`.prose` / `.about-prose`直下の`section[data-code-group]`がmobile / desktopで本文幅からbreakoutするというdecisionを取り消し、contained defaultへ変更する。

`A-CODE-GROUP-BREAKOUT-001`と`V-CODE-GROUP-BREAKOUT-001`も新decisionにより上書きされる。

単独code blockのcontained decisionは引き続き有効である。単独code block側のAcceptance / Verification IDは引き続き有効である。

## Alternatives considered

### code group breakoutを維持する

棄却する。比較・切替surfaceであることは、top-level外枠を本文幅から広げる理由として十分ではない。長い内容は内部scroll領域で扱うほうが責務が明確である。

### viewport幅に応じた小さいbreakoutだけを残す

棄却する。mobile / desktopで異なる外枠幅を持つと、本文幅内に収める既定contractが曖昧になる。必要な特殊文脈では専用変数でoverrideできる。

### MarkdownやDOM生成でcode groupごとに幅を指定する

棄却する。今回の変更はCSS visual contractであり、content資産やDOM生成へ表示都合を持ち込まない。

## Counter-hypothesis review

反対仮説: code groupは複数panelの比較surfaceであるため、本文幅より少し広いほうが読みやすいのではないか。

回答: 比較surfaceとしての性質はtablist、panel、copy controlのUI構造で表現できる。top-level外枠を広げると、短いcode groupでも本文の左右端から張り出し、読書面の静けさを損なう。長いコード行は`pre[data-code-block]`内部で横スクロールし、長いtab列はtablist側で横スクロールするほうが、overflow責務が明確である。

## Contract impact

Affected contracts:

* `docs/contracts/code-surfaces.md`
* SSR CSS contract
* `.prose` / `.about-prose`直下のcode group visual contract

Unaffected contracts:

* Markdown parser / transformer
* code group enhancer
* copy button behavior
* hydration
* tab semantics
* `data-code-*`属性の意味
* content authoring format

## Compatibility impact

`--ui-code-group-width` / `--ui-code-group-margin-inline`は削除しない。特殊な文脈では引き続きoverrideできる。

ただし、`.prose` / `.about-prose`直下の既定layoutでは、mobile / desktopのbreakout overrideを提供しない。過去に既定breakoutを前提にしていた視覚差分はbreaking visual changeとして扱う。

`--ui-code-surface-breakout-width` / `--ui-code-surface-breakout-margin`はbase rule fallbackとして維持する。

## Rouault-specific impact

* 読書体験: code group外枠が本文幅と揃い、本文への集中を妨げにくくなる。
* static-first: CSSだけで成立し、JSやruntime測定へ依存しない。
* content資産: Markdown本文やfrontmatterへlayout都合を追加しない。
* 責務境界: overflowは`pre[data-code-block]`とtablistが処理し、top-level code group外枠は既定で本文layoutへ従う。
* accessibility: focus-visible、forced-colors、print、copy、enhanced tabsの責務は変更しない。

## Delete/Breaking Change Gate

Delete Gate:

* 削除対象はmobile / desktop media query内のtop-level code group breakout overrideに限定する。
* DOM、公開属性、enhancer、copy state machine、syntax highlightは削除しない。
* `--ui-code-group-*`と`--ui-code-surface-breakout-*`fallbackは削除しない。

Breaking Change Gate:

* 既定visual contractはbreaking changeとして扱う。
* 変更範囲はR3/A0としてcontract、ADR、SSR CSS contract testで固定する。
* 単独code blockのcontained contractは変更しない。

## Rollback

`.prose` / `.about-prose`直下の`section[data-code-group]`に対するmobile / desktop media query overrideを戻し、SSR CSS contract test、contract、ADRの部分上書き記述を旧breakout方針へ戻す。

## Out of scope

* DOM生成
* enhancer
* ARIA
* copy
* syntax highlight
* routing
* data contract
* 単独code block幅仕様
* code preview
* `stateful-note-bridges.css`

## Acceptance ID

A-CODE-GROUP-PROSE-CONTAINED-001

## Verification ID

V-CODE-GROUP-PROSE-CONTAINED-001
