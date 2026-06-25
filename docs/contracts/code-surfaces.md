# Code Surfaces Contract

## 1. Status

- Type: Normative
- Source of truth: Markdown transform pipeline、SSR generator、post-hydrate enhancer、code surface CSS
- Applies to: code block、code group、static copy control、code previewに組み込まれるcode root
- Non-goals: 旧Lit Custom Element API互換、copy state machineの完全復元、Phase 3A〜3Cの単独release-ready判定

## 2. Ownership

### This Layer Owns

- code surfaceの静的HTML正本構造。
- code groupのno-JS baselineとenhanced tabsへの昇格契約。
- no-JS tab controls、no-JS copy controls、printの基本方針。
- SSR generator / enhancer / CSSのDOM・属性所有権。
- 旧`ui-code-block` / `ui-code-group` / `ui-copy-button` APIを提供しないこと。

### This Layer Must Not Own

- Markdown parser全体の安全境界。`docs/contracts/markdown.md`を参照する。
- `ui-code-preview`自身のpreview state、built-in controls、toolbar contract。`docs/design-system/components/code-preview.md`を参照する。
- copy buttonのdetailed enhanced state contract。Phase 6で別途固定する。
- hydration trigger ownership。`docs/contracts/hydration.md`を参照する。

## 3. Public Contract

### Static HTML Authority

code surfaceの正本は、旧Lit Custom Elementではなく静的HTMLです。

- 単独code block rootは`figure[data-code-block-root]`とする。
- code bodyは`pre[data-code-block] > code[data-lang]`を基本構造とする。
- code group rootは`section[data-code-group]`とする。
- copy sourceは`template[data-code-copy-source]`とする。
- copy controlは`button.static-copy-control`とする。

旧`ui-code-block`、`ui-code-group`、`ui-copy-button`はfinal DOMの正本ではありません。これらのtag、property、attribute、custom eventを互換APIとして提供しません。

### Single Code Block

- `figure[data-code-block-root]`はfilename、language、caption、intent、copy control、code bodyを束ねる読書単位です。
- `pre[data-code-block]`はcode bodyのscroll / overflowとsyntax highlightの対象です。
- Shiki token、line number、line highlight、diff add/remove、wrapは静的HTMLとCSSの組み合わせで成立させます。
- overflow accessibilityはenhancerが補助してよいですが、code本文の存在と可読性はJSに依存してはなりません。

### Code Group

code groupはSSR / no-JS時点でstackとして出力し、enhancer実行後にtabs UIへ昇格します。

#### SSR / no-JS

- 全panelを読める状態で出力します。
- `role="tablist"`、`role="tab"`、`role="tabpanel"`は付与しません。
- inactive panelを`hidden`で隠すことを主要方針にしません。
- 各panelはlabelまたはheadingで識別できる必要があります。
- `data-code-group-tab`はenhancer用識別子であり、SSR / no-JS時点のtab semanticsではありません。
- copy sourceは各panel内に維持します。

#### Enhanced

- enhancerはrootに`data-code-group-enhanced="true"`または同等のenhanced stateを付与します。
- enhancerはtablist / tab / tabpanel semantics、keyboard navigation、active panel stateを付与します。
- inactive panelの非表示はenhanced stateとCSS selectorの組み合わせで行います。
- group copy controlが存在する場合、enhancerはactive panelのcopy sourceを参照できる状態へ同期します。

## 4. No-JS Controls

### Tab Controls

- tab controlsはSSR DOMに存在してよいですが、no-JS時点では操作可能UIとして表示しません。
- default CSSではtab controlsを`display: none`相当へ退行させます。
- `inert`、`aria-hidden`、`tabindex="-1"`によるno-JS tab control制御は主要方針にしません。
- enhancer初期化後にのみtab controlsを操作可能UIとして表示します。

### Copy Controls

- copyはJSとClipboard APIに依存するprogressive enhancementです。
- SSR / no-JSではcopy controlを操作可能UIとして表示しない、またはdisabledとします。
- no-JSでもcode本文とcopy sourceの読解を妨げてはなりません。
- success / error / reset state、`data-copy-enhanced`、clipboard fallbackの詳細契約はPhase 6の責務です。

## 5. Print Contract

- printではcode groupの全panelを読める状態にします。
- enhanced stateで隠れているinactive panelもprint mediaでは表示対象に戻します。
- tab controlsやcopy controlsは印刷上の主内容ではありません。
- beforeprint / afterprintによるDOM変更は最後の手段とし、CSSで成立する方針を優先します。

## 6. DOM / Attribute Ownership

### SSR Generator Owned

- stable id。
- `data-code-block-root`、`data-code-block`、`data-code-group`。
- `data-code-group-tab`、`data-code-group-panel`、`data-code-group-value`。
- panel label / heading。
- initial selected valueを表すdata属性。
- `template[data-code-copy-source]`。
- copy target id、status id、`aria-describedby`の参照整合。
- hydration annotation。

### Enhancer Owned

- `data-code-group-enhanced`または同等のenhanced state。
- tabs ARIA semantics。
- active tab / active panel state。
- keyboard navigation。
- active panelとgroup copy targetの同期。
- code block overflow accessibilityの補助状態。

### CSS Owned

- SSR stack表示。
- no-JS tab controls / copy controlsの退行表示。
- enhanced tabsのvisible / hidden state。
- print all panels。
- syntax highlight、line number、highlight、diff、wrap、forced-colors、light / dark表示。
- layout / breakoutの視覚制御。

CSSはfinal DOMの意味状態を再定義しません。CSS state contractとcopy button state contractは混同しません。

## 7. Old Custom Element API Removal

次は提供しません。

- `ui-code-block`
- `ui-code-group`
- `ui-copy-button`
- `selected-value`
- `default-selected-value`
- `activation`
- `ui-code-block-change`
- `copy`
- `copy-error`
- MutationObserverによるruntime code group再構成
- `ui-copy-button`のloading threshold
- 旧`ui-copy-button`の状態アイコン機械

これらは旧Lit component間のruntime契約であり、静的HTML正本化後の読解体験の正本ではありません。

## 8. Phase Boundary

Phase 3A、Phase 3B、Phase 3Cはreview unitです。いずれも単独ではrelease-readyではありません。

- Phase 3A: SSR stack DOM。
- Phase 3B: enhancerによるtabs semantics / active state。
- Phase 3C: visibility / print CSS。

code group SSR stack / enhanced tabs移行のrelease-ready判定は、Phase 3A〜3Cの結合完了後に行います。

## 9. Integration Boundaries

### Markdown

Markdown出力はcode surfaceの静的HTML構造を生成します。詳細なdirective family一覧は`docs/references/markdown-output.md`を参照できますが、code surfaceのDOM / state contractは本書を正本とします。

### Code Preview

`ui-code-preview`はcode rootの公開属性や選択状態を所有しません。previewとcode rootの合成時も、code block / code group / copy / tab contractは本書に従います。

### Hydration

hydration triggerはscheduler / registryが所有します。code surface enhancerはprogressive enhancementとして実行され、旧Custom Elementをregistryへ戻しません。

## 10. Acceptance Criteria

- code surfaceの静的HTML正本構造が存在する。
- code groupはno-JSで全panelを読めるstackとして成立する。
- enhanced tabsはenhancerとCSSの責務として成立する。
- no-JS tab controlsは操作可能UIとして表示されない。
- no-JS copy controlsは操作不能状態を押せるUIとして見せない。
- printでは全panelを読める。
- SSR generator / enhancer / CSSのDOM・属性所有権が分離されている。
- 旧Custom Element APIが復元されていない。
