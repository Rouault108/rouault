# Preview Sandbox

本書は人間承認済みfull Lit removal v14の該当component契約を反映する。durable document DOMはbuild-time、interactionとephemeral stateはplain controllerが所有する。最初の起動はHydrationSchedulerだけが所有する。

実装入口: `build/rehype/native-preview-sandbox.ts` / `src/client/post-hydrate/preview-sandbox-enhancer.ts`。移行Decisionは[full Lit removal](../adr/full-lit-removal.md)を参照する。

## Input → native metadata mapping

現行`ui-preview-sandbox`の公開入力を、native rootへ次のように投影する。これらは**build-owned immutable controller input**であり、旧custom-element attribute/property APIの互換surfaceではない。

| 旧入力               | native metadata                                            | normalization / 意味                                      |
| -------------------- | ---------------------------------------------------------- | --------------------------------------------------------- |
| `iframe-title`       | `data-sandbox-iframe-title`                                | trim後空なら既存既定「プレビュー sandbox」                |
| `height`             | `data-sandbox-height`                                      | 有限正数の数値文字列。無効値は既存既定`160`               |
| `max-height`         | `data-sandbox-max-height`                                  | 有限正数のみ。無効／未指定は属性自体を出力しない          |
| `base-url`           | `data-sandbox-base-url`                                    | absolute URLへ正規化。無効値は埋め込み元文書URLへfallback |
| `allow-js`           | `data-sandbox-allow-js`                                    | canonical boolean presence metadata                       |
| `activation-policy`  | `data-activation-policy="eager \| visible \| manual"`      | 無効値は`visible`。hydration trigger mappingの入力        |
| `height-mode`        | `data-sandbox-height-mode="fixed \| auto \| bounded-auto"` | 無効値は`auto`                                            |
| `content-layout`     | `data-sandbox-content-layout="stage \| flow"`              | 列挙外は実効`stage`としてcanonicalize                     |
| `allow-forms`        | `data-sandbox-allow-forms`                                 | canonical boolean presence metadata                       |
| `allow-downloads`    | `data-sandbox-allow-downloads`                             | 同上                                                      |
| `allow-pointer-lock` | `data-sandbox-allow-pointer-lock`                          | 同上                                                      |
| `allow-popups`       | `data-sandbox-allow-popups`                                | 同上                                                      |

`allow-*`、`allow-js`、base URL、height/content policyの正規化は現行component lifecycleからbuild adapterへ移す。controllerはcanonical metadataだけを読む。raw author inputや列挙外値をruntimeで再解釈しない。表中のfallback/canonicalizationはaccepted intermediate dataおよびtest/UI-check用structured renderer inputに対するnative renderer contractであり、authoring directive validationを緩めるものではない。現行authoring validatorがrejectする値はlowering前に引き続きrejectし、旧component direct property/attribute APIだけのruntime fallbackは互換surfaceとして移植しない。

## Static output

```html
<div
  data-preview-sandbox-root
  data-sandbox-iframe-title="プレビュー sandbox"
  data-sandbox-height="160"
  data-sandbox-base-url="https://example.invalid/current-note/"
  data-activation-policy="visible"
  data-sandbox-height-mode="auto"
  data-sandbox-content-layout="stage"
  data-hydration-key="preview-sandbox-enhancer"
  data-hydration-capability="sandboxed"
  data-hydration-trigger="visible"
  ...
>
  <div data-preview-sandbox-placeholder>...</div>
  <template data-preview-kind="html">...</template>
  <template data-preview-kind="css">...</template>
  <template data-preview-kind="js">...</template>
</div>
```

上の例は`data-activation-policy="visible"`のvariantであり、hydration projectionは`data-hydration-capability="sandboxed"` / `data-hydration-trigger="visible"`となる。`eager` / `manual`ではcapabilityは`sandboxed`のまま、[Preview Sandbox](preview-sandbox.md)のmappingに従ってtriggerだけを`initial` / `interaction`へ変更する。

falseのboolean capability metadataは原則として属性を出力しない。`max-height`も未指定／無効時は出力しない。これによりpresence semanticsを一意にする。

## Runtime owner

plain sandbox controllerが、schedulerによる起動許可後に次を所有する。

- canonical native metadataの初回読込
- iframe activation
- srcdoc generation
- limited sanitization
- sandbox capability token生成
- iframe creation/destruction
- payload template MutationObserver
- message token validation
- height synchronization

## Metadata / mutation boundary

- root metadataはcontroller attach時に一度読み、以後immutable inputとして扱う。旧property assignmentやroot attribute mutationを監視してrebuildする互換経路は作らない。
- `template[data-preview-kind]`のpayload内容だけは、固定commitの再構築contractを維持する範囲でMutationObserver対象にできる。root metadata mutationとpayload mutationを同じinput channelとして扱わない。
- build/test/UI-checkが異なるcapability条件を必要とする場合はrenderer入力から別rootを生成する。実行中rootへ旧custom-element propertyを模した書換えを行わない。
- iframeの`sandbox` tokenは、helper script実行に必要なbaseline `allow-scripts`を維持する。optional tokenは`data-sandbox-allow-forms` / `data-sandbox-allow-downloads` / `data-sandbox-allow-pointer-lock` / `data-sandbox-allow-popups`のpresenceだけから決定する。`data-sandbox-allow-js`は`allow-scripts` tokenの有無を切り替える入力ではなく、srcdocへauthor JSを含めて評価するかを制御するpolicyである。DOM外の第二のcapability source of truthを作らない。
- `base-url`はcanonical metadataからsrcdoc生成時のURL解決に使用し、payload内`<base>`で上書きさせない既存policyを維持する。

## Trigger ownership

- `eager → initial`、`visible → visible`、`manual → interaction`のmappingはbuild-time注釈が定め、schedulerのみが初回起動を判定する。
- sandbox controllerは独自のIntersectionObserver、connected callbackによる起動、scheduler外の手動起動経路を持たない。起動許可後のpayload更新・再構築・高さ計測はcontrollerが所有する。
- manual rootにはstatic native buttonを用意する。既存schedulerのinteraction判定はclickとEnter/Spaceだけを対象とするため、その契約を維持する。focus/pointerdownをmanual activationへ拡張せず、追加の二段階確認も導入しない。no-JS時はpayloadをinertに保持し、実行できない状態の説明を読めるようにする。
- UI-checkも注釈付きrootを共通scheduler/registryで起動する。旧componentの注釈なし独立起動fallbackは移植しない。
- payload変更用MutationObserverとiframe内の高さ計測は初回起動判定とは別責務である。signal abort時はobserver、message listener、iframeを破棄し、遅延messageを受理しない。

## Security / behavior preservation

- helper scriptとauthor JSの分離
- dangerous element / URL policy
- author JSは`allow-js`時だけ評価
- manual-only capabilityとactivation policyの既存validation
- `fixed` / `auto` / `bounded-auto` height semantics
- `stage` / `flow` content layout
- rebuild signature / disposable preview model
- iframe message source + token検証

を維持する。native化を理由にsandbox token、URL解決、sanitization、message validationを弱めない。

## Important

runtime iframe生成は許可する。

これはdocument semanticsのruntime renderではなく、sandbox capabilityのoperational DOMである。

## Payload契約

### 入力形

`[data-preview-sandbox-root]`は次のpayloadを受け付けます。

| kind   | 内容          | 入力形                                                 |
| ------ | ------------- | ------------------------------------------------------ |
| `html` | body fragment | `template`の内容をHTML fragmentとして扱います          |
| `css`  | style text    | `template.content.textContent`をCSS textとして扱います |
| `js`   | script text   | `template.content.textContent`をJS textとして扱います  |

### 配置契約

payload用templateは、**native rootの直下子**でなければなりません。descendant探索には依存しません。

```text
<div data-preview-sandbox-root>
  <template data-preview-kind="html">…</template>
  <template data-preview-kind="css">…</template>
  <template data-preview-kind="js">…</template>
</div>
```

### 一意性契約

同一kindのtemplateを複数定義してはなりません。複数定義は契約違反です。

### `html`契約

`html` payloadは、**preview文書の`body > ui-preview-content-root`直下へ挿入されるfragment**です。HTML document全体を渡す入力ではありません。`head`、`meta`、`base`、`script`を`html` payload側で制御してはなりません。

`html` payloadは、template contentをfragmentとして直列化した結果を扱います。入力文字列の字面を保持する契約は持ちません。正規形はparser round-trip後のfragmentです。

parser round-tripに伴うノード構造、空白、コメント、属性順序の変形は許容します。

契約対象はHTML fragmentです。inline SVGはbest effortとします。MathML、declarative shadow DOM、parser特有挙動は契約対象外です。custom elementsは文書に現れてよいものとしますが、upgrade・定義・成功動作は保証しません。

### `css`契約

`css` payloadはtextとして受け取り、preview文書内の`<style>`に挿入します。CSS payloadは信頼済みdemo CSSとして扱います。外部参照、アニメーション、固定配置、レイアウト変形を本コンポーネント側では制限しません。

### `js`契約

`js` payloadはtextとして受け取り、`data-sandbox-allow-js`ありの場合だけpreview文書内の`<script>`として挿入します。`data-sandbox-allow-js`なしの場合、`js` payloadは無視します。

### 正規化契約

payload読み取り時の改行は`\n`に正規化します。利用者は行末コードの差異に依存しません。

---

## Preview文書構成契約

preview文書は、次の順序で構成します。

1. 文書骨格
2. base style
3. author CSS
4. sandbox structural guard style
5. `body[data-preview-content-layout] > ui-preview-content-root`
6. sanitized HTML
7. helper script
8. author JS

author JSは、sanitized HTMLとauthor CSSが配置された後に評価します。helper scriptはauthor JSより前に配置します。

正規content rootはauthor JS実行前に`body`の直接子として正確に1個だけ存在します。payload内の同名nested要素は正規rootではありません。第2identity属性、Custom Element登録、Shadow DOM、landmark role、author JSによるshell改変の監視・復旧は追加しません。

`contentLayout`の値域、型、既定値、type guard、normalizationは`shared/preview-sandbox/content-layout.ts`を単一source of truthとし、build-timeとruntimeが共有します。

---

## Sanitization契約

`html` payloadには限定的sanitizationを適用します。主な除去対象は次のとおりです。

- `script` / `iframe` / `object` / `embed` / `base`
- `meta[http-equiv="refresh"]`
- `on*`属性
- `srcdoc`属性
- 危険なURLを持つ`href` / `xlink:href` / `src` / `poster` / `action` / `formaction`
- `javascript:`を含む`style`属性

URL属性は次の方針で扱います。

- `href` / `xlink:href`は`http:` / `https:` / `mailto:` / `tel:`を許可します
- `src` / `poster`は`http:` / `https:`を許可します
- `action` / `formaction`は`http:` / `https:`を許可します
- 相対URLは維持します
- `javascript:` / `vbscript:` / `data:`は拒否します
- 制御文字や空白を混ぜた難読化URLも拒否対象に含めます

`data:`を許可すると、preview用途としては便利でも安全境界の説明が複雑になりやすいため、本書では**利便性より安全側を優先して拒否**します。

`css` payloadと`js` payloadには、同等のsanitizationを適用しません。閉じタグ破壊だけを防ぎます。

---

## Capability契約

sandbox iframeは、baselineとopt-inを分けて扱います。

### Baseline

baseline tokenは次のとおりです。

- `allow-scripts`

これはhelper scriptのための基準capabilityです。author JSのためのopt-inではありません。

### Opt-in

opt-in tokenは次のとおりです。

- `allow-forms`
- `allow-downloads`
- `allow-pointer-lock`
- `allow-popups`

### 非公開token

次のtokenは公開しません。

- `allow-same-origin`
- `allow-modals`
- `allow-top-navigation`系
- 永続ストレージや親文書同等権限につながるtoken

### 選定原理

新しいsandbox capabilityを追加する場合は、次の条件を満たさなければなりません。

- 読書体験を壊しません
- 親アプリの安全境界を弱めません
- same-origin相当の権限を要求しません
- previewに必須な用途が説明できます

### capabilityの意味

各opt-in capabilityは、成功保証ではなく **試行を許す権限**です。

- `allowForms`はform submitの試行を許可します
- `allowDownloads`はdownloadの試行を許可します
- `allowPointerLock`はpointer lockの試行を許可します
- `allowPopups`はpopupの試行を許可します

成功可否はuser agent、ユーザー操作、権限状態に依存します。

---

## CSS

stylesheet ownerは`src/assets/css/preview-sandbox.css`。placeholderとruntime iframeを同一native rootへ置き、height policyによる余白を維持する。
