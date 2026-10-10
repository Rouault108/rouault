# Tabs

本書は人間承認済みfull Lit removal v14の該当component契約を反映する。durable document DOMはbuild-time、interactionとephemeral stateはplain controllerが所有する。最初の起動はHydrationSchedulerだけが所有する。

実装入口: `build/rehype/native-tabs.ts` / `src/client/post-hydrate/tabs-enhancer.ts`。移行Decisionは[full Lit removal](../adr/full-lit-removal.md)を参照する。

## Source input

既存の`::tabs` / `::tab` / `::panel` directiveを維持する。`ui-tabs`は内部中間HASTの表現であり、Markdown raw HTMLとしての受理は追加しない。

ただしv14では、native baselineでtab label自身をpanelへのfragment anchorにする契約と整合させるため、`::tab`の**label contentはnon-interactiveでなければならない**というauthoring制約を明示する。現行validatorが受理していたMarkdown link等のinteractive descendantはbuild-time errorとする。これは`::tabs` / `::tab` / `::panel` directive自体の廃止やsyntax変更ではなく、従来のTabs正規契約に合わせて受理範囲を局所的に狭めるbreaking validationである。

- text、emphasis、strong、inline code等の**非interactiveなlabel表現**は内容を保持してよい。plain textへの強制変換はしない。
- Markdown link / link referenceその他、最終的にinteractive descendantを生成するauthoring構造をtab label内へ置くことは禁止する。
- authoring側で静的に識別できる禁止構造は既存directive validation ownerでrejectする。policyの正本は本節と`build/remark/directives/validator/validate-structure.ts`系の既存validator境界に置き、native lowererへ別の受理policyを作らない。
- native lowererは防御的contract assertionとして、anchor化直前のlabel subtreeにinteractive descendantが残っていればfail-fastしてよい。ただし、その場でtext化、link抽出、隣接linkへの分離、nested controlの削除を行ってはならない。
- current contentにはこの禁止形の使用がないことを人間が確認済みであるため、本v14でcontent asset migrationは行わない。実装中に反例が見つかった場合は自動修正せず承認済みv14計画の§26.6の`replan-required`とする。

final HTMLへ`<ui-tabs>`を残さない。

既存authoring属性はnative root metadataへ次のように投影する。これはauthoring syntaxの変更ではなく、build-time output schemaの変更である。

| authoring / 中間入力     | native root metadata               | 意味                                                             |
| ------------------------ | ---------------------------------- | ---------------------------------------------------------------- |
| `selected-value`         | `data-tabs-initial-selected-value` | build時に指定された初期選択要求。runtimeの継続制御入力にはしない |
| `default-selected-value` | `data-tabs-default-selected-value` | 初回選択解決のdefault候補                                        |
| `orientation`            | `data-tabs-orientation`            | `horizontal` / `vertical`                                        |
| `automatic-activation`   | `data-tabs-automatic-activation`   | presence / canonical boolean metadata                            |
| `url-sync`               | `data-tabs-url-sync`               | presence / canonical boolean metadata                            |

`aria-label` / `aria-labelledby`はbuild時にstatic navigation rootへ転写する。enhancer ready後に`[role=tablist]`へなる同一nodeがaccessible nameを保持する。

`data-selected-value`は上記入力とは別物であり、enhance後に`TabsController`が現在選択値を反映する**read-only runtime projection**とする。build時の`selected-value`を`data-selected-value`へ直接投影せず、外部DOM mutationを選択要求として解釈しない。

## Static output

概念例:

```html
<section
  data-tabs-root
  data-toc-scope="..."
  data-tabs-default-selected-value="javascript"
  data-tabs-orientation="horizontal"
  data-hydration-key="tabs-enhancer"
  data-hydration-capability="interactive"
  data-hydration-trigger="initial"
>
  <nav data-tabs-static-nav aria-label="...">
    <a
      id="tabs-...-tab-javascript"
      data-tab
      data-tab-value="javascript"
      href="#tabs-...-panel-javascript"
      >JavaScript</a
    >
    ...
  </nav>

  <section
    id="tabs-...-panel-javascript"
    data-tab-panel
    data-tab-value="javascript"
    aria-labelledby="tabs-...-tab-javascript"
  >
    ...
  </section>
  ...
</section>
```

## no-JS baseline

- 全panelを読むことができる。
- tab labelはpanelへの通常fragment linkとして機能し、そのanchor内部に別のinteractive descendantを含まない。
- `role=tab`を事前付与しない。
- panelを`hidden`にしない。

## Enhanced state

enhancer ready後:

- navigation rootを`tablist`へupgrade
- tab linkを`role=tab`へupgrade
- selected tab以外をRoving Tabindex
- panelsを`tabpanel`へupgrade
- selected panel以外を`hidden`
- indicatorはstatic childとして存在させ、位置だけruntime更新
- 正規選択状態とroving focusは`TabsController`が所有する。rootの`data-selected-value`はcontrollerが更新する読取用projectionであり、外部からの属性書換えを選択要求として解釈しない。

## Preserve

- Manual/automatic activation
- orientation
- stable value
- `?tab=`
- hash recovery
- URL history semantics
- `ui-tab-change`
- `scopeId`
- TOC integration

## Remove

- Lit property reflection
- public HTMLElement method API
- dynamic slot topology as public component API
- Shadow DOM
- slot contract
- `tabs.styles.ts`のLit CSSResult

`src/components/ui/tabs/tabs-url-sync-strategy.ts`はLit非依存で、TOC・primary-tab URL state・`router-document-host`がproduction consumerであるため削除対象外とする。移設は本変更の必須条件ではなく、現pathに残してよい。strategy interface、`?tab=`、change event contractを変更しない。

## TOC integration

次をstatic selector contractへ変更する。

- `src/toc/filter-visible-headings.ts`
- `src/toc/toc-active-tracker.ts`
- `build/content/extract-toc-from-html.ts`
- `build/data/notes.ts`からの`prepareTocHtml()`接続
- `docs/contracts/toc.md`
- related node / SSR / browser tests

TOC build-time annotationのownerは既存どおり`build/content/extract-toc-from-html.ts`とし、owner自体を移さない。認識schemaだけを次へ移行する。

```text
ui-tabs                         → [data-tabs-root]
[slot="tab"][value]            → [data-tab][data-tab-value]
[slot="panel"]                 → [data-tab-panel][data-tab-value]
ui-tabs[data-toc-scope]        → [data-tabs-root][data-toc-scope]
```

`prepareTocHtml()`はnative tabs rootごとに既存と同じ`data-toc-scope`補完を行い、各panel配下のheadingへ同じ`TocHeading.scopeSelections`意味を付与する。nested tabsでは外側から内側へselection tupleを積み重ねる既存意味を維持する。scope ID体系、`TocHeading` schema、NavigationEnvelope schemaは変更しない。

`ui-tab-change` eventはTOCがproduction consumerであるため維持する。

## State / integration contract

以下は新規target contractとして本計画で固定する。既存APIの互換shimではない。

- `TabsController`の登録・解除はtabs enhancerが所有する。rootとcontrollerの対応はfeature-local module内のWeakMapで管理し、HTMLElementへ旧methodを追加しない。
- feature moduleは`selectTabsValue(root, value, { historyMode })`をTOCへの選択要求入口として公開する。`historyMode`は`none | push | replace`であり、TOC callerは明示する。DOM/URLの変更はcontrollerだけが行う。
- `readTabsSelection(root)`はenhanced済みcontrollerの選択値、または未enhanceを表す`null`を返す。TOCがDOM属性へ書き込んで選択状態を所有することは禁止する。
- 未enhance／起動失敗／破棄済みrootへの選択要求は`not-enhanced`を返し、DOM・URL・focusを変更しない。新たなcontrollerを起動せず、遅延要求queueも作らない。native baselineでは全panelが読めるため、TOCはそのまま見出しへ移動できる。
- 起動後、存在しないvalueには`invalid-value`を返して状態・URL・focusを変えない。既存値には`selected`または`unchanged`を返す。
- source/intentが失効した選択要求は`superseded`を返す。成功したhistory書込は保持し、その操作の後続scrollや変更通知を抑止する。
- TOCのhidden ancestor展開は外側tabsから内側tabsへ要求する。hashからの展開には`historyMode: none`、既存のscope selection適用ではcaller指定のhistoryModeを渡す。
- 初期選択の解決順序とhost-owned hash判定は、固定commitの選択解決実装・`tabs-url-sync-controller.ts`を維持する。`data-toc-scope`とHeadingのscopeSelectionsとの対応を維持し、新しいscope体系やquery名を導入しない。
- URL同期はfeature側だけが所有する。URL-sync無効時と`historyMode: none`では選択要求によるhistory書込をしない。ユーザーのclick／Enter／Space選択はpush、自動activationの矢印移動はreplace、hashとqueryの矛盾回復は既存規則のreplaceを維持する。
- enhanced tab anchorの通常activationはfragment既定遷移を抑止し、controllerへ渡す。EnterとSpaceで選択可能にする。no-JS時は通常のfragment linkとして機能する。tab label subtreeに別のinteractive targetは存在しないことを前提とし、enhancerがnested link/controlを特別扱いするfallbackは作らない。
- TOCは未enhance scopeを「全panel可視」として扱い、候補選択値だけを根拠に見出しを除外しない。起動完了後はscope snapshotを再評価する。再評価は新たな選択変更イベントを偽装せず、既存のTOC mutation観測を`data-tabs-enhanced`／data selectorへ対応させる。

## Event contract

- 発火元は`[data-tabs-root]`自身とし、`document.dispatchEvent()`は使用しない。
- `ui-tab-change`は`bubbles: true`、`composed: true`、`cancelable: false`。
- detailは実装済みの`{ index, value, prevIndex, scopeId }`を維持する。scopeIdはrootの`data-toc-scope`、未設定時は`null`。
- controllerの選択、panelのhidden/ARIA、rootのprojection、当該操作に必要なURL更新を反映した後に発火する。同じvalueの再選択とfocus-only移動では発火しない。
- 初期化は既存同様、選択変更通知を発火させない。以後のURL起点変更とTOC要求で選択が変わった場合は通知する。
- 契約書に記載される`ui-tab-request-change`、detail.source、公開focus methodsなど、固定commitの`tabs.ts`で未実装の公開仕様を今回新規実装しない。移行後契約には既存未対応事項として追跡し、公開API削除との対応を明記する。仕様と実装の差をCodexが独自に解消しない。

## Visual Contract

タブラベルは本文を上回る視覚ノイズを持たず、選択は文字色とindicatorで示す。水平時はnavigationが上、垂直時は左となる。focus-visibleのring clearance、overflow時のactive/focused tabへのscroll、forced-colors時の境界線、reduced-motion時の遷移抑制を維持する。no-JSでは全panelを読む構造とし、enhancement後に選択panelだけを表示する。

public CSS custom propertyの`--ui-tabs-panel-gap`と`--ui-tabs-inline-bleed`は維持する。stylesheet ownerは`src/assets/css/tabs.css`である。

## 既存未対応事項

`ui-tab-request-change`、detail.source、公開focus methods、RTL論理方向の未対応を今回実装しない。旧HTMLElement property/methodとdynamic slot topologyは廃止する。value一意性、orientation validation、accessible name転写はbuild-time契約に従う。

## Reading position integration

URL意味・query選択規則を維持し、共通history writerを使う。本人操作はpanel変更前にintent受理し、初期化/URL同期/normalizationは現intentを維持する。source epochとdisplayed/address整合を即時/microtask/frameの各段階で確認する。 詳細は[Reading Position Contract](reading-position.md)。
