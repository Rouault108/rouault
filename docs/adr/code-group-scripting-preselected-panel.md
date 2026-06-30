# Code Group Scripting Preselected Panel

## Status

Accepted.

## Context

code groupのSSR / no-JS baselineは全panelをstack表示する。これはJS無効時の読解性には必要だが、JS有効環境でreload直後のfirst paintに露出すると、「正しい例」「誤り例」など複数panelが一瞬縦積み表示される。

## Decision

SSR generatorは各direct child panelへ`data-code-group-panel-active="true"`または`"false"`を文字列値として出力する。HAST propertiesでもbooleanではなく文字列を使い、空属性化を禁止する。

CSSは`@media screen and (scripting: enabled)`内で、enhanced前のinactive panelだけを非表示にする。active panelの`.code-group-stack-label`はpre-hydration段階では表示したままにする。enhanced後は既存のtabs UIへ昇格し、stack labelは非表示にする。printではenhanced状態やscripting mediaに関係なく全panelとstack labelを表示する。

key contractは、root selected keyを`data-code-group-selected`、tab keyを`data-code-group-key`、panel keyをdirect child panelの`data-code-group-panel`で表す。`data-code-group-tab`は値`"true"`のmarker属性であり、keyではない。`data-code-group-value`は旧Custom Element時代の選択値表現としてobsoleteにする。

enhancerはtab keyを`data-code-group-key`だけから読み、`data-code-group-tab`をfallbackに使わない。tabs、panels、copy buttonの取得は現在のcode group rootにscopeし、nested descendantを親groupのstateに混ぜない。group copy buttonはroot直下`.code-group-header[data-code-group-controls="true"]`配下の`.code-group-header-tools > button[data-code-group-copy][data-copy-button]`だけを対象にする。

## Consequences

JS有効かつ`scripting: enabled`対応環境では、hydration前でもinactive panelの縦積み露出を抑制できる。no-JSでは全panel stack表示を維持する。

JS有効だがclient bundleまたはenhancerが失敗した場合、scripting対応環境では初期active panelのみがstack label付きで表示され得る。今回のRequestではglobal bootstrap、hydration trigger変更、hydration failure fallbackは導入しない。

## Rejected Options

- hydration trigger変更だけで対処する案: first paint前のstack露出を契約として抑制できない。
- SSRから`data-code-group-enhanced="true"`を付ける案: no-JS baselineとSSR非interactive契約を壊す。
- SSR inactive panelへ`hidden`、`aria-hidden`、`inert`を付ける案: static-first読解性と意味論を壊す。
- theme bootstrapやglobal bootstrapへcode group責務を追加する案: ownership boundaryを広げすぎる。
