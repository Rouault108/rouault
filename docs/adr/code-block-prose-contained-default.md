# ADR-CODE-BLOCK-PROSE-CONTAINED-001: Keep top-level single code blocks contained in prose

## Status

Accepted

## Partially superseded by

`ADR-CODE-GROUP-PROSE-CONTAINED-001`は、このADRのcode group breakout部分を上書きする。

上書き対象には`A-CODE-GROUP-BREAKOUT-001`と`V-CODE-GROUP-BREAKOUT-001`を含む。

単独code blockのcontained decisionは引き続き有効である。

## Decision Record ID

D-CODE-BLOCK-CONTAINED-GROUP-BREAKOUT-001

## Request ID

REQ-CODE-BLOCK-PROSE-CONTAINED-001

## R stage / A level

R stage: R3
A level: A0

R3理由:

* code surfaceのCSS visual contractを変更する。
* `.prose` / `.about-prose`直下の単独code blockとcode groupのlayout責務を分離する。
* SSR CSS contractとcode surface contractへ影響する。

A0理由:

* private/restricted Evidenceは扱わない。
* content本文、secret、外部サービスを変更しない。
* 通常のdiff、テスト、手動確認で十分である。

## 背景

`figure[data-code-block-root]`と`section[data-code-group]`は、同じtop-level breakout selectorと`--ui-code-surface-breakout-*`変数で制御されていた。

code groupは比較・切替・複数panelを扱うsurfaceであり、本文幅から少し広げることでpanel全体を見渡しやすくなる。一方、単独code blockは本文中の読書単位であり、外枠が本文領域から左右へ張り出すと本文の静かな読み筋を乱す。長いコード行は外枠のbreakoutではなく、`pre[data-code-block]`内部の横スクロールで処理するほうが責務が明確である。

## 採用仕様

* `.prose` / `.about-prose`直下の`figure[data-code-block-root]`は本文幅100%に収める。
* `.prose` / `.about-prose`直下の`section[data-code-group]`は現行のmobile / desktop breakoutを維持する。
* 単独code blockは`--ui-code-block-breakout-width` / `--ui-code-block-breakout-margin`で制御する。
* code groupは`--ui-code-group-width` / `--ui-code-group-margin-inline`で制御する。
* `--ui-code-surface-breakout-width` / `--ui-code-surface-breakout-margin`はbase ruleの互換fallbackとして保持する。
* `data-code-layout='inline'`のresetではlegacy変数とblock専用変数をどちらも100%へ戻す。
* `[data-code-block-root][data-code-group-owned='true']`のhard resetは維持する。
* DOM構造、Markdown変換仕様、`data-code-*`属性契約は変更しない。

## 棄却案

### 単独code blockとcode groupを同じbreakout selectorに残す

棄却する。読書単位の単独code blockと、比較surfaceのcode groupで視覚責務が異なるため、同じselectorと同じ主制御変数で扱うと契約が曖昧になる。

### 長い単独code blockに合わせて外枠を広げる

棄却する。長い行は`pre[data-code-block]`の横スクロール対象であり、外枠幅の自動拡張は本文幅契約とstatic-first CSS contractを不安定にする。

### Markdown transformでlayout値を追加する

棄却する。今回の問題はCSS visual contractの責務分離で解決できる。DOM構造やMarkdown出力仕様へ表示都合を持ち込まない。

## 保留案

* `layout="wide"`の新設。
* content-awareな自動幅判定。
* code preview仕様変更。
* 個別ノート本文のlayout meta追加。

## 反対仮説

単独code blockもcode groupと同じようにbreakoutしたほうが、コード量が多い記事では可読性が高いのではないか。

## 反対仮説への回答

単独code blockの長い行は`pre[data-code-block]`内部で横スクロールできる。外枠まで広げると、短いcode blockでも本文左端と揃わず、本文領域から張り出して見える。Rouaultの読書体験では、単独code blockは本文中の読書単位として本文幅に収め、比較や切替が必要な複数panelだけをcode group surfaceとしてbreakoutさせるほうが責務境界と視覚契約が明確である。

## 契約影響

Affected contracts:

* `docs/contracts/code-surfaces.md`
* SSR CSS contract
* `.prose` / `.about-prose`直下のcode surface visual contract

Unaffected contracts:

* Markdown parser / transformer
* code group enhancer
* copy button behavior
* hydration
* tab semantics
* `data-code-*`属性の意味
* content authoring format

## CSS custom property override semantics影響

`--ui-code-surface-breakout-*`は互換fallbackとして残すが、top-level単独code blockとcode groupの主制御にはしない。

今後、単独code blockを広げたい場合は`--ui-code-block-breakout-*`を使う。code groupを広げたい場合は`--ui-code-group-*`を使う。過去にlegacy変数だけで両者をまとめて広げるoverrideを置いていた場合、そのoverrideはbase rule fallbackに限定される。

## Rouault固有契約への影響

* 読書体験: 単独code blockは本文幅に収まり、本文左端との整列を維持する。
* static-first: CSSだけで成立し、JSやruntime測定へ依存しない。
* content資産: Markdown本文やfrontmatterへlayout都合を追加しない。
* 責務境界: top-level code surface layoutは`code-surfaces.css`が所有し、`stateful-note-bridges.css`はnested context補正に限定する。
* accessibility: 長いコード行は`pre[data-code-block]`内部の横スクロールに閉じ込め、外側surfaceの予測可能な幅を保つ。

## Delete/Breaking Change Gate結果

Delete Gate:

* 削除対象はtop-level code surface layout resetの重複所有であり、DOMや公開属性は削除しない。
* `--ui-code-surface-breakout-*`は削除せず、base rule fallbackとして保持する。

Breaking Change Gate:

* CSS custom property override semanticsは変更される。
* 変更範囲はR3/A0としてcontract、ADR、SSR CSS contract testで固定する。
* Markdown出力、hydration、enhancer、content authoringにはbreaking changeを入れない。

## Rollback方針

`figure[data-code-block-root]`と`section[data-code-group]`のtop-level selectorを再統合し、media query内のbreakoutをlegacy `--ui-code-surface-breakout-*`主制御へ戻す。あわせてSSR CSS contract test、contract追記、ADR導線を戻せば、以前の一括breakout運用へ戻せる。

## Acceptance ID

* A-CODE-BLOCK-CONTAINED-001
* A-CODE-GROUP-BREAKOUT-001
* A-CODE-VAR-OWNERSHIP-001
* A-CODE-SURFACE-FALLBACK-001
* A-BRIDGE-OWNERSHIP-001
* A-TABS-PANEL-RESET-001
* A-GROUP-OWNED-ROOT-RESET-001
* A-CODE-PRE-OVERFLOW-001
* A-CODE-SURFACE-DOCS-001

## Verification ID

* V-CODE-BLOCK-CONTAINED-001: SSR CSS contract testでtop-level単独code blockのcontained変数を検証する。
* V-CODE-GROUP-BREAKOUT-001: SSR CSS contract testでcode groupのmobile / desktop breakoutを検証する。
* V-CODE-VAR-OWNERSHIP-001: SSR CSS contract testでblock専用変数とgroup専用変数の主制御を検証する。
* V-CODE-SURFACE-FALLBACK-001: SSR CSS contract testでlegacy fallbackを検証する。
* V-BRIDGE-OWNERSHIP-001: SSR CSS contract testでbridge側のtop-level reset削除を検証する。
* V-TABS-PANEL-RESET-001: SSR CSS contract testでtabs panel内resetを検証する。
* V-GROUP-OWNED-ROOT-RESET-001: SSR CSS contract testでgroup-owned root hard resetを検証する。
* V-CODE-PRE-OVERFLOW-001: 手動確認で長い単独code blockが内部`pre`で横スクロールすることを確認する。
* V-CODE-SURFACE-DOCS-001: contractとADRで幅方針、変数ownership、override semanticsを説明する。
