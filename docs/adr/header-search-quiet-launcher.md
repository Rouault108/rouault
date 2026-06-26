# Header Search Quiet Launcher

## Status

- Type: Decision Record
- Request ID: REQ-HEADER-SEARCH-QUIET-LAUNCHER-001
- Decision ID: D-HEADER-SEARCH-QUIET-LAUNCHER-001
- Gate ID: G-HEADER-SEARCH-QUIET-LAUNCHER-001
- Acceptance ID: A-HEADER-SEARCH-QUIET-LAUNCHER-001
- Verification ID: V-HEADER-SEARCH-QUIET-LAUNCHER-001
- R段階 / Aレベル: R3 / A0

このADRは採用理由、棄却案、反対仮説、Gate結果、rollback方針を記録するDecision Recordである。Search triggerの現在契約は`docs/contracts/static-header-contract.md`を正本とする。

## Decision

Header search triggerを、主要入口としての横長入力欄ではなく、読書体験を阻害しないquiet launcherとして扱う。

採用仕様は次の通り。

- 要素は`<a>`を維持する。
- No-JS fallbackとして`href="/search/"`を維持する。
- JS有効時は`data-search-dialog-trigger`を起点にsearch dialogを開く。
- `data-no-router`、`aria-haspopup="dialog"`、`aria-controls`、`aria-expanded`を維持する。
- Accessible nameは`検索ダイアログを開く`を維持する。
- Visible labelは`検索`とする。
- Label classは`.search-trigger__label`とする。
- Desktop幅はcontent-sizedで、最大`9rem`を上限にする。
- Compact幅はcontent-sizedで、最大`7rem`を上限にする。
- 通常時backgroundとborder colorはtransparentを基本にする。
- Hoverはbackground中心で表現し、通常カラーモードではborder強調を復活させない。
- Focus-visibleは明確なoutlineを維持する。
- Forced-colorsでは操作可能要素の識別性を優先し、`ButtonText` borderを維持する。
- `<640px`ではicon-onlyを維持する。
- `<400px`では最小icon-only密度を維持する。

## Counter-Hypothesis Review

反対仮説として、headerの検索導線は強い発見性を持つべきなので、input-like surfaceと横長幅を維持すべきという見方がある。この仮説は、検索を最重要導線として扱う一般的なドキュメントサイトでは妥当になり得る。

Rouaultでは主目的が「没入して読む」ことであり、header right側のsearch triggerは実入力欄ではない。No-JS時の検索ページlinkと、JS有効時のdialog triggerを兼ねるlauncherであるため、input-likeな見え方は役割を過剰に強く見せる。検索機能そのものの可用性は、fallback link、dialog trigger、accessible name、focus-visible、forced-colors識別性で維持する。

## Rejected Alternatives

### input-like継続

横長入力欄風のsurfaceを維持する案は棄却する。実入力欄ではない要素を入力欄のように見せると、読書中の視覚ノイズが大きく、launcherとしての役割ともずれる。

### fixed-width小型化

固定幅だけを小さくする案は棄却する。入力欄風の余白構造が残り、content-sizedなlauncherという契約にならない。

### 完全icon-only化

常時icon-onlyにする案は棄却する。Desktop / compactではvisible labelを持つことで、検索導線の意味を静かに明示できる。

### `placeholder`語彙維持

`placeholder`語彙を維持する案は棄却する。Search triggerは入力欄ではなくlauncherであり、DOM contractとvalidatorの語彙もlabelへ揃える。

### hover時border強調維持

通常カラーモードでhover時にborderを強調する案は棄却する。hoverはbackground中心で表現し、入力欄風surfaceの復活を避ける。ただしforced-colorsでは識別性を優先し、borderを維持する。

## Contract Impact

- Static header HTML projectionはvisible labelを`検索`に変更する。
- Static header contract定数はlabel classとvisible labelを正本化する。
- Parse5 validatorとDOM validatorは`.search-trigger__label`、`aria-hidden="true"`、label textを検証する。
- Header CSSはcontent-sized幅、transparent surface、background中心hoverへ変更する。
- SSR / browser / E2E testsは新しいlabel語彙とresponsive densityを検証する。
- Search dialog内部、search ranking、Pagefind、router/navigation契約は変更しない。

## Out of Scope

- Search triggerのbutton化。
- `/search/` fallbackの削除または変更。
- `data-search-dialog-trigger`、`data-no-router`、`aria-label="検索ダイアログを開く"`の変更。
- `aria-haspopup`、`aria-controls`、`aria-expanded`契約の変更。
- Space activation、`open-search-dialog` custom event、`ui-search-trigger` custom element APIの復元。
- Search dialog本体、search ranking、Pagefind、index生成、router/navigationの変更。
- Theme switcher、corpus switcher、TOC、sidebar toggleの仕様変更。

## Gate Result

G-HEADER-SEARCH-QUIET-LAUNCHER-001では、検索可用性を維持しつつheader right側の視覚ノイズを下げることを採用条件とした。Fallback link、dialog trigger、accessible name、focus-visible、forced-colors識別性を維持できるため、quiet launcher化を採用する。

## Rollback

Rollbackする場合は、Search triggerのDOM contract、CSS density、validator、fixtures、tests、contract文書を同じ単位で戻す。Search dialog、ranking、router/navigationにはこのADR由来の変更を入れないため、rollback対象にも含めない。
