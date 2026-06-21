# Reading Chrome Note Frame Outer Gutter Decision Record

## Status

- Title: Reading Chrome Note Frame Outer Gutter Decision Record
- Type: R3 Decision Record
- Date: 2026-06-21
- Decision ID: D-NOTE-FRAME-MIN-OUTER-GUTTER
- Contract source of truth: `docs/contracts/reading-chrome.md`
- Scope: fixed sidebar note frame の viewport edge に対する最小 outer gutter

この文書は decision record です。現在の contract を再定義する正本ではありません。現行 contract の正本は `docs/contracts/reading-chrome.md` です。

`docs/adr/README.md` は ADR ディレクトリの性格説明であり網羅リストではないため、この ADR 追加では更新しません。

## Context

固定サイドバー表示時の note layout では、1366px〜1394px 付近の中間幅 viewport で left sidebar surface と右側 note frame が viewport edge に接しやすい状態がありました。

この問題は sidebar item padding や TOC item padding の密度ではなく、left sidebar、main、desktop TOC を含む note frame 全体が viewport edge から持つべき外側余白の契約です。Reading chrome は管理画面風に端へ貼り付く surface ではなく、本文読書を補助する静かな frame として扱います。

## Decision

`app-router[data-sidebar-presence='present']` の desktop fixed sidebar layout に、`--note-frame-outer-gutter` を最小 outer gutter として導入します。

- `--note-frame-outer-gutter` は `clamp(var(--space-4, 16px), 1.5vw, var(--space-6, 24px))` とする。
- `app-router[data-sidebar-presence='present']` は viewport 幅から左右の outer gutter を差し引いた幅と `--note-fixed-frame-max-width` の小さい方を使う。
- `margin-inline: auto` により wide viewport では実際の gutter が最小値より大きくなってよい。
- `@media (max-width: 1023px)` では app-router 幅を `100%` へ戻し、fixed sidebar 用 outer gutter を二重適用しない。

この変更は URL、DOM 意味論、ARIA、sidebar state、TOC active tracking、hydration ownership、NavigationEnvelope を変更しません。Header geometry も変更対象ではありません。

## Alternatives considered

### sidebar item padding だけを増やす案

棄却します。項目 padding は sidebar tree の読みやすさと操作密度を調整するための値であり、note frame 全体が viewport edge から離れる契約を表現できません。右 TOC 側の外側余白とも対称になりません。

### `.layout-sidebar-col` に `margin-inline-start` を直接付ける案

棄却します。sidebar column だけを動かすと app-router grid、main、TOC の frame 境界とずれ、left sidebar / main / desktop TOC を含む note frame 全体の契約になりません。

### `--note-fixed-frame-max-width` に `--note-sidebar-main-gap` を含める案

棄却します。`--note-fixed-frame-max-width` は wide viewport の note frame 最大幅契約であり、中間幅 viewport の viewport edge との最小余白を表す token ではありません。既存 token の意味を変えず、outer gutter を別契約として追加します。

### header max-width と note frame max-width を同時に統合する案

棄却します。Header geometry は別契約です。今回の問題は fixed sidebar note frame が viewport edge に接することなので、header と note frame の水平リズム統合は別 Request / Decision として扱います。

## Consequences

- 1366px〜1394px 付近でも fixed sidebar note frame は viewport edge から最小 outer gutter を持つ。
- Wide viewport では既存の `--note-fixed-frame-max-width` による note frame 最大幅契約を維持する。
- Sidebar item padding、TOC item padding、active rail、TOC indent は outer gutter と独立して調整できる。
- 1023px 以下では app-router 自体が viewport 幅に戻り、mobile / overlay 側の余白契約と二重適用しない。

## Counter-hypothesis review

反対仮説は「中間幅の接地感は sidebar item padding の不足であり、frame 幅契約を増やす必要はない」というものです。

この仮説は、右側 edge でも同じ問題が起きること、TOC absent note でも frame 外側余白が必要なこと、項目 padding を増やすと tree density と active surface の役割まで変わることから採用しません。問題は item 内側の密度ではなく、reading chrome frame と viewport edge の関係です。

## Non-goals

- Header geometry の変更。
- `--note-fixed-frame-max-width` の再設計。
- Fixed sidebar breakpoint の再設計。
- TOC 表示条件の変更。
- Sidebar item / TOC item の visual density 再設計。
- Mobile TOC panel UX の変更。
- URL、DOM 意味論、ARIA、sidebar state、TOC active tracking、hydration ownership、NavigationEnvelope の変更。

## Rollback

問題が見つかった場合は、`--note-frame-outer-gutter` の利用を `app-router[data-sidebar-presence='present']` の幅計算から外し、`width: min(100%, var(--note-fixed-frame-max-width, 1440px))` へ戻します。Rollback 時も sidebar item padding や header geometry へ代替変更を混ぜず、別 Decision として再検討します。
