# Reading Chrome Note Frame Outer Gutter Decision Record

## Status

- Title: Reading Chrome Note Frame Outer Gutter Decision Record
- Type: R3 Decision Record
- Date: 2026-06-21
- Decision ID: D-NOTE-FRAME-MIN-OUTER-GUTTER
- Contract source of truth: `docs/contracts/reading-chrome.md`
- Scope: fixed sidebar note frameのviewport edgeに対する最小outer gutter

この文書はdecision recordです。現在のcontractを再定義する正本ではありません。現行contractの正本は`docs/contracts/reading-chrome.md`です。

`docs/adr/README.md`はADRディレクトリの性格説明であり網羅リストではないため、このADR追加では更新しません。

## Context

固定サイドバー表示時のnote layoutでは、1366px〜1394px付近の中間幅viewportでleft sidebar surfaceと右側note frameがviewport edgeに接しやすい状態がありました。

この問題はsidebar item paddingやTOC item paddingの密度ではなく、left sidebar、main、desktop TOCを含むnote frame全体がviewport edgeから持つべき外側余白の契約です。Reading chromeは管理画面風に端へ貼り付くsurfaceではなく、本文読書を補助する静かなframeとして扱います。

## Decision

`router-document-host[data-sidebar-presence='present']`のdesktop fixed sidebar layoutに、`--note-frame-outer-gutter`を最小outer gutterとして導入します。

- `--note-frame-outer-gutter`は`clamp(var(--space-4, 16px), 1.5vw, var(--space-6, 24px))`とする。
- `router-document-host[data-sidebar-presence='present']`はviewport幅から左右のouter gutterを差し引いた幅と`--note-fixed-frame-max-width`の小さい方を使う。
- `margin-inline: auto`によりwide viewportでは実際のgutterが最小値より大きくなってよい。
- `@media (max-width: 1023px)`ではrouter-document-host幅を`100%`へ戻し、fixed sidebar用outer gutterを二重適用しない。

この変更はURL、DOM意味論、ARIA、sidebar state、TOC active tracking、hydration ownership、NavigationEnvelopeを変更しません。Header geometryも変更対象ではありません。

## Alternatives considered

### sidebar item padding だけを増やす案

棄却します。項目paddingはsidebar treeの読みやすさと操作密度を調整するための値であり、note frame全体がviewport edgeから離れる契約を表現できません。右TOC側の外側余白とも対称になりません。

### `.layout-sidebar-col` に `margin-inline-start` を直接付ける案

棄却します。sidebar columnだけを動かすとrouter-document-host grid、main、TOCのframe境界とずれ、left sidebar / main / desktop TOCを含むnote frame全体の契約になりません。

### `--note-fixed-frame-max-width` に `--note-sidebar-main-gap` を含める案

棄却します。`--note-fixed-frame-max-width`はwide viewportのnote frame最大幅契約であり、中間幅viewportのviewport edgeとの最小余白を表すtokenではありません。既存tokenの意味を変えず、outer gutterを別契約として追加します。

### header max-width と note frame max-width を同時に統合する案

棄却します。Header geometryは別契約です。今回の問題はfixed sidebar note frameがviewport edgeに接することなので、headerとnote frameの水平リズム統合は別Request / Decisionとして扱います。

## Consequences

- 1366px〜1394px付近でもfixed sidebar note frameはviewport edgeから最小outer gutterを持つ。
- Wide viewportでは既存の`--note-fixed-frame-max-width`によるnote frame最大幅契約を維持する。
- Sidebar item padding、TOC item padding、active rail、TOC indentはouter gutterと独立して調整できる。
- 1023px以下ではrouter-document-host自体がviewport幅に戻り、mobile / overlay側の余白契約と二重適用しない。

## Counter-hypothesis review

反対仮説は「中間幅の接地感はsidebar item paddingの不足であり、frame幅契約を増やす必要はない」というものです。

この仮説は、右側edgeでも同じ問題が起きること、TOC absent noteでもframe外側余白が必要なこと、項目paddingを増やすとtree densityとactive surfaceの役割まで変わることから採用しません。問題はitem内側の密度ではなく、reading chrome frameとviewport edgeの関係です。

## Non-goals

- Header geometryの変更。
- `--note-fixed-frame-max-width`の再設計。
- Fixed sidebar breakpointの再設計。
- TOC表示条件の変更。
- Sidebar item / TOC itemのvisual density再設計。
- Mobile TOC panel UXの変更。
- URL、DOM意味論、ARIA、sidebar state、TOC active tracking、hydration ownership、NavigationEnvelopeの変更。

## Rollback

問題が見つかった場合は、`--note-frame-outer-gutter`の利用を`router-document-host[data-sidebar-presence='present']`の幅計算から外し、`width: min(100%, var(--note-fixed-frame-max-width, 1440px))`へ戻します。Rollback時もsidebar item paddingやheader geometryへ代替変更を混ぜず、別Decisionとして再検討します。
