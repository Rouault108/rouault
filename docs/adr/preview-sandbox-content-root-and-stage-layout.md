# Preview sandbox content root and stage layout

- Status: Accepted
- Date: 2026-07-18
- Decision ID: `D-PREVIEW-SANDBOX-CONTENT-ROOT-STAGE-001`

## Context

`ui-preview-sandbox`は、Markdownから受け取ったHTML／CSS／JSをsandbox iframe内で表示する。

現行構造ではauthor HTMLが`body`直下へ挿入されるため、単体UIを観察しやすい位置へ置くだけのCSSも`preview-css`へ記述する必要がある。このCSSは展示環境の都合であり、読者へ提示したいUI実装そのものではない。

また、author contentとiframe document shellが同じ`body`をlayout ownerとして共有すると、UI実装と展示用layoutが混在し、body-direct依存がauthoring contractへ入り込み、高さ同期とauthor layoutが干渉しやすい。

Rouaultでは、コンテンツ資産の純度、明確な責務境界、単一source of truth、static-firstを優先する。

## Decision

### Public layout contract

`ui-preview-sandbox`へ`content-layout`を追加する。

```ts
type PreviewSandboxContentLayout = 'stage' | 'flow';
```

- 既定値は`stage`
- `stage`はauthor content全体を観察用の1つの展示単位として扱う
- `flow`はauthor contentをblock-start／inline-startから通常フローで表示する
- Markdownの列挙外値はbuild error
- runtimeの列挙外値はproperty自体を書き換えず、srcdoc、build signature、layout判定で実効値を`stage`へ正規化する
- `contentLayout`は現行の公開string propertyと同様にproperty／attribute reflectionを行う
- Markdown未指定時はfinal hostへ既定属性を冗長出力しない
- hydration後はreflectionによりruntime DOMへ`content-layout="stage"`が現れてよい

`content-layout`はauthor contentの配置だけを扱う。theme、capability、activation、background、document language、error handling、device chromeなどを束ねるprofile APIにはしない。

### Permanent content root

author HTMLは`body`直下へ挿入せず、sandboxが生成する予約mount element配下へ挿入する。

```html
<body data-preview-content-layout="stage">
  <ui-preview-content-root>
    <!-- sanitized author HTML -->
  </ui-preview-content-root>
</body>
```

sandboxが生成する正規content rootは、author JS実行前のsrcdocで`body`の直接子として正確に1個だけ存在する`ui-preview-content-root`とする。tag名だけでは正規rootと判定しない。payload内に同名要素が存在しても、`body`直下でなければ正規rootではない。

```css
body > ui-preview-content-root
```

`data-preview-content-root`のような第2identityは追加しない。

`ui-preview-content-root`はpreview文書内の予約要素であり、Rouaultアプリケーション側のCustom Elementとして登録しない。sandbox自身はShadow DOMやlandmark roleを追加しない。

author HTML／CSS／JSから予約rootへ依存することは非対応とする。特に、author JSによる予約rootのCustom Element登録、Shadow DOM追加、削除、置換、body外への移動は契約対象外であり、sandboxは監視・復旧しない。

body-direct経路は削除し、legacy mode、fallback、compatibility shim、自動判定を残さない。

### Ownership

sandboxは次の構造を所有する。

- `html`のviewport participation
- document-levelのscroll到達性
- `body`のstage／flow layout
- `body > ui-preview-content-root`のmount participation
- safe overflowと高さ同期に必要な構造

author CSSは次を所有する。

- payload subtreeのcomponent layout
- author supplied wrapperのlayout
- payloadの色、typography、spacing
- shell構造を壊さない`html`／`body`の背景色や前景色

author CSSから予約rootや`html`／`body`の構造的display、alignment、sizing、overflow ownershipへ依存することは非対応とする。配置を説明する場合は`content-layout="flow"`とauthor supplied wrapperを使用する。

### Cascade

stylesheetの順序は次とする。

1. sandbox base style
2. author CSS
3. sandbox structural guard style

structural guardは`html`、`body[data-preview-content-layout]`、`body > ui-preview-content-root`の必要最小限の構造だけを保護する。

payload descendantの色、typography、spacing、component layoutは上書きしない。authorが予約selectorや`!important`を使って意図的にshellを改変した後まで復旧を保証しない。

### Stage behavior

`stage`ではcontent root全体を1つの展示単位として扱う。

- 小さいcontentは縦横中央に置く
- rootは小さいcontentに対してintrinsic／shrink-to-fit相当になる
- rootの使用幅は利用可能inline sizeを超えない
- rootを全幅化して`text-align`で中央配置しない
- rootをflex／grid containerにしてpayload siblingの通常フローを変えない
- oversized軸ではstart側へ安全に退行する
- block-start／inline-start側を負方向へ欠落させない
- overflow ownerはiframe documentとする
- 固定viewportでoverflowする場合、iframe documentのscrollを許容する
- start側とinline-end／block-endの終端までdocument scrollで到達できる
- `body > ui-preview-content-root`およびauthor supplied wrapperへsandbox都合の追加scroll containerを作らない

具体的なCSS方式は、この結果を満たす範囲で選択する。

### Flow behavior

- block-start／inline-startから表示する
- stage中央配置を適用しない
- rootは通常の利用可能inline sizeへ参加する
- author contentの通常block flowを維持する

### Runtime rebuild

正規化済み`content-layout`の実効値をsrcdoc build signatureへ含める。

- 実効値が変わる場合だけ破壊的再構築する
- 同じ実効値では再構築しない
- layout専用postMessage、DOM patch、旧srcdoc維持経路は追加しない

### Source of truth

値域、型、既定値、判定、正規化は次で一元管理する。

```text
shared/preview-sandbox/content-layout.ts
```

build-timeとruntimeで同じ定義を参照する。

## Consequences

### Positive

- 単体UIへ展示専用の中央配置CSSを記述しなくてよい
- 表示コードがUI実装の本質へ集中する
- iframe document shellとauthor contentのownerが分離される
- body-direct依存をauthoring contractから除去できる
- `stage`と`flow`の使い分けが明示的になる
- 外側`preview-align`とiframe内部layoutを独立して保守できる

### Costs

- iframe DOM構造はbreaking changeになる
- body-direct selector、body layout、`document.body`参照を使用する既存例は移行が必要になる
- author CSSが`html`／`body`の構造を全面的に所有する現行契約は終了する
- oversized contentと高さ同期を実ブラウザで確認する必要がある

## Compatibility and migration

- 単体UI展示は属性未指定の`stage`
- 通常フローや配置例は`content-layout="flow"`
- body layoutはauthor supplied wrapperへ移す
- body-direct selectorと`document.body`由来のcontent参照はauthor supplied selectorへ移す
- 背景色や前景色など非構造的なshell CSSは維持できる
- 旧body-direct modeは残さない
- deprecation期間は設けず、実装、test、docs、exampleを原子的に移行する

## Rejected alternatives

### Author CSSへ中央配置CSSを記述する

展示環境とUI実装が同じコード面へ混在するため棄却した。

### `flow`を既定値にする

典型的な単体UIへ展示専用指定を繰り返し要求するため棄却した。

### `preview-align`をiframe内部へ伝播する

外側frame layoutと内側content layoutを結合するため棄却した。

### 非表示のsetup CSS payloadを追加する

表示CSSと実行CSSのsource of truthが分裂するため棄却した。

### payloadからlayoutを自動推測する

authoring contractが非決定的になるため棄却した。

### 旧body-direct経路を残す

恒久fallbackと新旧並行経路になるため棄却した。
