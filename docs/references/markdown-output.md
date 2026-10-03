# Markdown Output Reference

この文書はMarkdown出力の詳細表である。安全境界と出力責務の正本は`docs/contracts/markdown.md`とする。
入力記法の網羅表は`docs/references/markdown-authoring-syntax.md`を参照する。
この文書はfinal DOMと出力詳細を扱い、入力記法一覧を所有しない。

## Standard Element Normalization

- headings: heading idをbuild-timeに補完し、重複時は安定したsuffixを付ける。
- `pre > code`: `pre[data-code-block] > code[data-lang]`へ正規化する。
- `blockquote`: 静的blockquoteとして出力し、必要なUI wrapperはbuild-timeで確定する。
- `table`: `div[data-table-root="true"][role="region"][tabindex="0"] > table`へ正規化する。`data-table-root`は横スクロール可能なstatic table rootであり、行クリック、行選択、行navigation、row hover affordanceを意味しない。セル内のlink / buttonなど、実際の操作要素だけが操作可能面として振る舞う。
- `::table{column-widths="..."}`: GFM表1個だけを包むauthoring wrapperとして扱い、final DOMではstatic table surfaceへ正規化する。`column-widths`がある場合だけ`colgroup`を出力し、各`col`には固定トークン由来の列幅属性を付与する。中間source markerはfinal DOMに残さない。
- `{{break}}`: 表セルテキストエスケープとして、final DOMではmarker付きの表セル改行へ正規化する。表セル内のmarkerなし`<br>`はdefensive final contract errorとする。
- `hr`: section dividerとして識別できる属性を付与する。
- task list: no-JS baselineを維持した上でcheckbox表現へ変換する。
- `img` / `figure`: `figure[data-image]`を基本構造とする。`zoomable=true`では`figure[data-image][data-image-zoomable="true"] > div[data-image-preview-frame] > img + button[data-image-zoom-trigger][hidden]`を出力し、buttonは画像面全体を覆うenhancer用triggerである。`img`はbutton外に置く。captionがある場合は`figcaption`をfigure最後のdirect childに置く。`zoomable=false`では`figure[data-image][data-image-zoomable="false"] > img`だけを本文画像surfaceとし、preview frame、trigger、lightbox hydration key、dialogは出力しない。
- 本文link: 安全なURL検証と注釈属性を経て出力する。

## Directive Families

- `::callout`
- `::code-group`
- `::code-preview`
- `::preview-sandbox`
- `::details`
- `::info-box`
- `::link-card`
- `::score`
- `::tabs`
- `::translation`
- `::translation-overlay`
- `::syntax-card`
- `::table`

各directiveの入力記法は`docs/references/markdown-authoring-syntax.md`を参照し、最終DOMは`docs/contracts/markdown.md`のsafety boundaryを満たす。

### `::code-group`

`::code-group`は、final DOMで`section[data-code-group]`へ正規化する。SSR / no-JSでは全panelをstackとして読める状態で出力し、hydration後にcode group enhancerがtabs UIへ昇格する。

```html
<section
  data-code-group="true"
  data-code-group-id="code-group-1"
  data-code-group-selected="valid"
  data-code-group-sync-scope="package-manager"
  data-hydration-key="code-group-enhancer"
  data-hydration-capability="interactive"
  data-hydration-trigger="visible"
>
  <div class="code-group-header" data-code-group-controls="true">
    <div class="code-group-tablist">
      <button
        id="code-group-1-tab-valid"
        type="button"
        data-code-group-tab="true"
        data-code-group-key="valid"
        data-code-group-panel-id="code-group-1-panel-valid"
      >
        正しい例
      </button>
      <button
        id="code-group-1-tab-invalid"
        type="button"
        data-code-group-tab="true"
        data-code-group-key="invalid"
        data-code-group-panel-id="code-group-1-panel-invalid"
      >
        誤り例
      </button>
    </div>
    <div class="code-group-header-tools">
      <button
        type="button"
        data-copy-button="true"
        data-code-group-copy="true"
        data-copy-target-id="code-group-1-copy-source-0"
        aria-describedby="code-group-1-copy-source-0-copy-status"
      ></button>
      <span id="code-group-1-copy-source-0-copy-status" data-copy-status="true"></span>
    </div>
  </div>
  <section
    id="code-group-1-panel-valid"
    data-code-group-panel="valid"
    data-code-group-panel-active="true"
    data-code-copy-source-id="code-group-1-copy-source-0"
  >
    <template id="code-group-1-copy-source-0" data-code-copy-source="true">...</template>
    <p class="code-group-stack-label">正しい例</p>
    <figure data-code-block-root="true" data-code-group-owned="true">...</figure>
  </section>
  <section
    id="code-group-1-panel-invalid"
    data-code-group-panel="invalid"
    data-code-group-panel-active="false"
    data-code-copy-source-id="code-group-1-copy-source-1"
  >
    <template id="code-group-1-copy-source-1" data-code-copy-source="true">...</template>
    <p class="code-group-stack-label">誤り例</p>
    <figure data-code-block-root="true" data-code-group-owned="true">...</figure>
  </section>
</section>
```

- root selected keyは非空の`data-code-group-selected`で表す。
- `sync-scope`を指定した場合だけ、final DOM rootへ`data-code-group-sync-scope`を出力する。値は64文字以下で`^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$`に一致する。空または空白のみの入力は未指定扱いになり、この属性を出力しない。
- tab markerは`data-code-group-tab="true"`であり、tab keyではない。tab keyは非空の`data-code-group-key`で表す。
- panel keyはroot直下panelの非空`data-code-group-panel`で表す。
- `data-code-group-panel-active`は文字列`"true"`または`"false"`で出力する。空属性や単独属性は出力しない。
- `data-code-group-panel-active="true"`は1件だけで、root selected key、selected key対応tab、group copy targetと整合する。
- tab key集合とroot直下のdirect child panel key集合は一致する。
- group copy buttonの`data-copy-target-id`はactive panelの`data-code-copy-source-id`を指す。
- tab id、panel id、`data-code-group-panel-id`は非空で、同じkeyのtabとpanelを結ぶ。
- SSR時点では`hidden`、`aria-hidden`、`inert`、`role="tablist"`、`role="tab"`、`role="tabpanel"`、`aria-selected`、`aria-controls`、`tabindex`を付与しない。
- 同期scopeはenhancerの同一root配下に限定され、通常Tabs（`[data-tabs-root]`）、URL、history、storage、custom eventには接続しない。

### `::callout`

`::callout`は、final DOMで`aside[data-callout="true"][data-callout-kind]`へ正規化する。読書面の短い注記surfaceであり、custom elementやruntime-dependent componentへ変換しない。

- rootは`aside`のまま維持する。
- `data-callout-kind`は`note` / `tip` / `success` / `warning` / `danger`を維持する。
- headingがある場合は、内部labelを生成し、rootの`aria-labelledby`から参照する。
- headingがなくlabelがある場合は、rootへ`aria-label`を付与する。
- content wrapperは`[data-callout-content="true"]`、body wrapperは`[data-callout-body="true"]`として出力する。
- 既定iconはfinal DOM内に生成され、装飾アイコンとして`aria-hidden="true"`を持つ。
- `data-callout-icon-svg`と互換classである`.callout-icon`はCSS互換のため維持される。
- `data-hydration-capability` / `data-hydration-trigger`は出力しない。

### `::link-card`

`::link-card`とauto link-cardは、final DOMでstatic `article.link-card[data-link-card="true"]`へ正規化する。valid link-cardは`a.link-card__link`をリンク面とし、invalid link-cardはanchorを出力せず`link-card__invalid` surfaceとして表示する。

- titleは`p.link-card__title`として出力する。
- descriptionが存在する場合は`p.link-card__description`として出力し、`data-text-truncated="true"`または`"false"`を付与する。
- descriptionはbuild transformで140文字を上限に、140文字を超える場合だけ`value.slice(0, 139).trimEnd() + '…'`相当へ切り詰める。
- `data-line-overflowed`はfinal DOMに出力しない。
- link-card linkはcard surfaceのリンク注釈として扱い、prose linkへ降格しない。

### `::syntax-card` family

`::syntax-card`は、final DOMで`section.syntax-card[data-syntax-card="true"]`へ正規化する。カード名は`p.syntax-card__name`として出力し、rootの`aria-labelledby`はこのlabelのidを参照する。

`::syntax-section`は`section.syntax-section[data-syntax-section="true"]`へ正規化する。section labelは`p.syntax-section__heading`として出力し、sectionの`aria-labelledby`はこのlabelのidを参照する。

- `syntax-card__name`と`syntax-section__heading`はDOM headingではなくカード内部labelである。
- `heading-level`は入力互換属性として受理されるが、final DOMの`h2`〜`h6`生成には使わない。
- final DOMに`heading-level` / `data-heading-level`は残さない。
- `data-syntax-card` subtreeはheading id、heading permalink、TOCの対象外である。
- `::syntax-field`は`dl.syntax-field[data-syntax-field="true"]`へ正規化される。
- 内部は`dt.syntax-field__term`と`dd.syntax-field__description`で構成される。
- `syntax-field`自体はinteractive rowではない。
- `syntax-field`はrow hover affordanceを持たない。

### `::table`

`::table`は、final DOMで通常のMarkdown tableと同じstatic table surfaceへ正規化する。`::table`自体はauthoring metadata wrapperであり、interactive table、sortable table、filterable table、row actionを意味しない。

- `::table`はGFM表1個だけを包む。
- `column-widths`がない場合は、通常GFM表の出力契約を維持する。
- `column-widths`がある場合だけ`colgroup`を生成する。
- `column-widths`のtokenは`auto` / `fit` / `narrow` / `medium` / `wide` / `numeric`に限定する。
- `numeric`は列幅ヒントであり、alignmentはGFM表のalignmentから決まる。
- `column-widths`指定tableに`colspan` / `rowspan`がある場合はbuild errorとする。
- final DOMに`data-table-source`などの中間markerを残さない。

### `::details`

`::details`は、本文内prose disclosureとしてnative `details` / `summary`へ正規化する。row navigation、settings row、panel surfaceではない。

```html
<details class="details-block" data-details="true">
  <summary class="details-block__summary">
    <span class="details-block__chevron static-icon" aria-hidden="true">...</span>
    <span class="details-block__summary-content">補足情報</span>
  </summary>
  <div class="details-block__body">...</div>
</details>
```

- chevronはsummary textの左に置く。
- body indentはsummary text開始位置に従属する。
- native `details` / `summary`を維持し、旧`ui-details` custom elementは復活させない。
- `data-details-source`とsource-onlyの`summary`属性はfinal DOMに残さない。
- bordered variant、region、JS animationはこの出力契約の範囲外であり、復活させない。

### Table cell break

`{{break}}`は表セルテキストエスケープとして、final DOMでmarker付きの`<br>`へ正規化する。marker付きbreakは表セル内の意味上の行区切りであり、raw HTML許可を意味しない。

- final DOMの表セル改行は`br[data-table-cell-break="true"]`として表す。
- raw `<br>`、Markdown hard break、`:br[]`は表セル改行契約として扱わない。
- 表セル内のmarkerなし`<br>`はdefensive final contract errorとする。
- exact `{{break}}`以外の`{{...}}` tokenはこの出力契約の対象外であり、通常テキストとして保持する。

### Native note output

| 中間HAST           | final document root               | capability / trigger              |
| ------------------ | --------------------------------- | --------------------------------- |
| ui-tabs            | section[data-tabs-root]           | interactive / initial             |
| ui-translation     | details[data-translation-overlay] | interactive / visible             |
| ui-code-preview    | figure[data-code-preview-root]    | conditional interactive / visible |
| ui-preview-sandbox | div[data-preview-sandbox-root]    | sandboxed / activation mapping    |
| ui-video           | figure[data-video-root]           | interactive / visible             |

Tabsはnav内のformattingを保持したfragment anchorと全panelを生成する。no-JS時にrole=tab/hiddenを付けない。labelにinteractive descendantを含むauthoring inputはbuild errorである。Translationは同一details/summaryを使用し、空訳文は原文spanとなる。

Code Previewはcanonical preview metadataとheader/surface/codeをbuild時に生成する。canonicalized controlsがnon-empty、または元rootのdirect child elementにslot=toolbarが存在する場合だけhydration注釈を付ける。toolbarのdescendant検索やcontent非空判定を追加しない。reader/testing/demoのprofile mappingとpermission ownerは[Markdown](../contracts/markdown.md)に従う。

Preview Sandboxはcanonical data-sandbox-\* metadata、no-JS placeholder、direct child inert templateを出力する。eager/visible/manualはinitial/visible/interactionに写す。iframe/srcdocはscheduler許可後のoperational DOMである。allow-jsはauthor JSの評価policyであり、helper用baseline allow-scriptsを切り替えない。

Videoはnative video controls、source/track、caption、hidden custom controlsとlive regionを出力する。同一mediaのstateを採用してatomicにenhanceし、失敗/abort時はnative controlsを戻す。

DOMとmetadataの詳細は[Tabs](../contracts/tabs.md)、[Translation](../contracts/translation.md)、[Code Preview](../contracts/code-preview.md)、[Preview Sandbox](../contracts/preview-sandbox.md)、[Video](../contracts/video.md)を参照する。

## Hydration Directive

build-time annotationとregistryを正本とし、HydrationSchedulerだけが初回起動を所有する。visibleは既存のviewport近傍/focusin/IntersectionObserver非対応policyを維持する。featureに独自の初回observerを置かない。

## Final HAST Invariants

- 静的検索highlight用の一時`<mark>`を最終本文DOMに残さない。
- native lowering後もsemantic no-JS baselineを失わない。stateful note custom elementとnote DSDをfinal HTMLへ残さない。
- `preview-sandbox`の`srcdoc`はcompiler-generated outputとして扱い、author supplied HTMLではない。

---

## Footnote output contract

Markdown由来の脚注はstatic-first DOMへ正規化します。

- footnote definition IDは`fn-*`形式です。
- `user-content-fn-*`は入力互換として`fn-*`へ正規化されます。
- `user-content-fnref-*`はdefinition IDでもcanonical ref idでもありません。legacy backrefとして除去され、実際のref instance集合からcanonical `fn-*-ref-N` backrefが再生成されます。
- `data-footnote-ref` / `data-footnote-backref`は最終HTMLで`"true"`固定です。
- false相当marker、role-only marker、class markerは最終HTMLに残りません。
- endnotes内の`h2#footnote-label`は構造見出しであり、TOCとheading permalinkの対象外です。
