# Preview Sandbox

## 目的

本書は、`ui-preview-sandbox`の公開契約を定義します。

`ui-preview-sandbox`は、author suppliedなHTML / CSS / JSを`srcdoc`を用いたsandboxed iframeに封じ込めて描画するpreview用コンポーネントです。本コンポーネントの目的は、任意入力をそのままホストDOMに混在させず、**限定的なsanitization**、**明示的なcapability制御**、**破壊的再構築を最小化した単純なライフサイクル**の上でpreviewを提供することです。

本書は、現行実装の説明ではなく、**長期的に維持しやすい契約の基準**を示します。現行実装が本書と一致しない場合は、本書を優先して設計を判断します。

## static-first 境界

`ui-preview-sandbox`はstateful allowlist componentとして維持します。sandbox iframe、payload activation、height synchronization、script capability、内部lifecycleはcomponentが所有し、静的HTML化対象にはしません。

note SSRではhostと公開Light DOMの`template[data-preview-kind]` fallbackを保持します。hostと公開Light DOM子孫はnote static output検査対象ですが、内部Shadow DOMとdeclarative shadowroot templateはnon-allowlisted Custom Element検査から除外します。

---

## 設計原則

`ui-preview-sandbox`は、次の原則に従います。

- preview内容はhost DOMに直接展開しません
- author inputの安全境界はsanitizer単体ではなくsandbox iframeで確保します
- helper機構とauthor機構は分離します
- preview内stateの永続化には依存しません
- capabilityはopt-inで追加します
- 上位UIと統合しても責務境界を曖昧にしません
- 破壊的再構築はpayloadとcapabilityの変更に限定します
- 利用者に見える挙動はdeterministicに定義します

---

## 適用範囲

本書は、次の事項を対象とします。

- 公開入力契約
- payload入力モデル
- activation / script / network / sanitization / rebuild / height / interactionの各policy
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 統合契約
- 境界条件
- 開発時診断方針
- 現行実装からの移行課題

本書は、次の事項を対象外とします。

- preview内コードの妥当性保証
- 任意の危険入力を完全に無害化する保証
- アプリケーション全体のCSP、network、権限管理
- `ui-code-preview`側のviewport UI、theme UI、code表示UI
- preview内stateの永続化
- 大規模アプリケーション実行基盤としての性能保証
- `networkPolicy`のような外部到達性切替機能
- `renderMode`のような利用意図モード
- `previewState`のような外部観測可能な状態公開
- `themeMode` / `documentLang`のようなpreview文書環境の可変化
- `sandboxProfile`のような抽象profile API
- `errorMode`のような失敗表示戦略の切替

---

## 公開契約

`ui-preview-sandbox`は、`iframeTitle`、`height`、`baseUrl`、`allowJs`、`allowForms`、`allowDownloads`、`allowPointerLock`、`allowPopups`を公開入力として扱います。preview内容は、**直下子の`template[data-preview-kind]`** から受け取ります。

### 入力契約

| 名前               | 種別                                        | 既定値               | 内容                    | 契約                                                                                                                                           |
| ------------------ | ------------------------------------------- | -------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `iframeTitle`      | property / attribute (`iframe-title`)       | `""`                 | iframeのアクセシブル名 | 空文字または空白のみの場合は`プレビュー sandbox`を用います                                                                                   |
| `height`           | property / attribute                        | `160`                | previewの基準高さ      | `heightMode="fixed"`では固定高さ、`auto` / `bounded-auto`では最小初期高さ兼fallback高さとして扱います。有限正数以外は`160`に正規化します |
| `maxHeight`        | property / attribute (`max-height`)         | 未指定               | previewの上限高さ      | `heightMode="bounded-auto"`の場合だけ意味を持ちます。有限正数でなければ未指定として扱います                                                   |
| `baseUrl`          | property / attribute (`base-url`)           | 埋め込み元文書のURL | 相対URLの解決基準     | 絶対URLでなければなりません。無効値は埋め込み元文書のURLに正規化します                                                                     |
| `allowJs`          | property / attribute (`allow-js`)           | `false`              | author JSの注入可否    | `true`の場合のみ`js` payloadを有効入力として扱います                                                                                        |
| `activationPolicy` | property / attribute (`activation-policy`)  | `visible`            | 初回構築タイミング      | `eager` / `visible` / `manual`だけを受け付けます。無効値は`visible`に正規化します                                                           |
| `heightMode`       | property / attribute (`height-mode`)        | `auto`               | 高さ解決方式            | `fixed` / `auto` / `bounded-auto`だけを受け付けます。無効値は`auto`に正規化します                                                           |
| `allowForms`       | property / attribute (`allow-forms`)        | `false`              | form capability         | sandbox tokenに`allow-forms`を追加します                                                                                                    |
| `allowDownloads`   | property / attribute (`allow-downloads`)    | `false`              | download capability     | sandbox tokenに`allow-downloads`を追加します                                                                                                |
| `allowPointerLock` | property / attribute (`allow-pointer-lock`) | `false`              | pointer lock capability | sandbox tokenに`allow-pointer-lock`を追加します                                                                                             |
| `allowPopups`      | property / attribute (`allow-popups`)       | `false`              | popup capability        | sandbox tokenに`allow-popups`を追加します                                                                                                   |

### 入力文法契約

- `height` propertyはnumberを受け付けます
- `height` attributeは数値文字列だけを受け付けます
- `height="160px"`のようなCSS lengthは無効です
- 無効な`height`入力は`160`に正規化します
- `maxHeight` propertyはnumberを受け付けます
- `maxHeight` attributeは数値文字列だけを受け付けます
- `maxHeight="480px"`のようなCSS lengthは無効です
- 無効な`maxHeight`入力は未指定として扱います
- `baseUrl`はabsolute URL文字列または`URL`相当値を受け付けます
- 無効な`baseUrl`入力は埋め込み元文書のURLに正規化します
- `activationPolicy`は`eager` / `visible` / `manual`だけを受け付けます
- 無効な`activationPolicy`入力は`visible`に正規化します
- `heightMode`は`fixed` / `auto` / `bounded-auto`だけを受け付けます
- 無効な`heightMode`入力は`auto`に正規化します
- boolean公開属性は、属性が存在すれば`true`、存在しなければ`false`として扱います

### 既定仕様

次の事項は公開入力ではなく、固定仕様です。

- preview文書の既定言語は`ja`です
- preview文書の既定`color-scheme`は`light`です
- `base`要素による基準URLの差し替えは許可しません

これらの既定値は、**Rouaultにおけるreading-first previewの既定**として固定するものです。これは汎用sandboxコンポーネント一般の普遍既定を主張するものではありません。

### 非公開事項

本コンポーネントは、次を公開しません。

- 公開メソッド
- 公開イベント
- preview内DOMへの操作API
- 親ウィンドウとの双方向通信API
- `::part(...)`
- helper scriptの実装詳細
- 内部messageの形式
- 内部instance識別子

公開しない内部詳細には依存しません。

また、note種別ごとの掲載可否は本コンポーネント自身の公開APIではありません。`kind: reader`のnoteで本コンポーネントを禁止するかどうかは、build / layout側の統合契約で扱います。

---

## Policy モデル

`ui-preview-sandbox`は、次のpolicyを持つコンポーネントとして扱います。ここでいうpolicyは、長期保守のために先に固定する設計判断です。

### Payload Policy

- payloadは **直下子の`template[data-preview-kind]`** だけを受け付けます
- kindは`html` / `css` / `js`だけを受け付けます
- 各kindは **0個または1個**だけを許可します
- 同一kindの複数定義は **契約違反**です
- `template[data-preview-kind]`以外の **直下子要素ノード** は **契約違反**です
- 直下子の空白テキストノードとコメントノードは無視します
- payload以外のdescendantノードは描画入力として扱いません

### Script Policy

- sandbox iframeには、**baseline capabilityとして`allow-scripts`を含めます**
- baseline `allow-scripts`はhelper scriptのために存在します
- `allowJs`は **author JSの注入可否だけ**を制御します
- `allowJs=false`の場合でもhelper scriptは成立します
- `allowJs=true`は **trusted author code execution** を意味します
- ここでいう`trusted`とは、**本コンポーネントの利用者およびその入力経路の管理者が、当該previewに供給するCSS / JS payloadを信頼済み入力として扱う**ことを意味します
- `html` payloadは`allowJs`の値にかかわらず非特権入力として扱い、完全sanitizer相当の保証は行いません
- author JSはiframe内DOM書き換え、内部状態保持、network access、`parent.postMessage()`を行えます
- author JSには親DOM参照権限、same-origin権限、永続ストレージ権限を与えません
- author JSはclassic scriptとして扱います
- author JSは破壊的再構築1回につき1回だけ評価します
- author JSの評価失敗はpreview外へ再送しません
- helper scriptとauthor JSは障害分離して扱います

### Sanitization Policy

- `html` payloadには限定的sanitizationを適用します
- `css` payloadと`js` payloadには限定的な閉じタグ保護だけを適用します
- 本コンポーネントは完全sanitizerではありません
- 安全境界の本体はsandbox iframeです

### Network Policy

- 本コンポーネントは **trusted demo mode** として動作します
- previewは **network-freeを保証しません**
- 相対URLは`baseUrl`を基準に解決します
- 許可されたURLは文書中に保持され得ます
- CSS / HTML / JSは外部リソースアクセスを発生させ得ます
- **network accessの抑止、到達性の遮断、取得結果の制御は本コンポーネントの責務ではありません**
- URL allowlistは **構文上の許可規則**であり、取得・遷移・起動の成功保証ではありません
- 一方で、`javascript:`、`vbscript:`、`data:`およびそれらを難読化した危険URLは、**安全上の理由から禁止**します
- したがって、本節は **危険なURLの禁止** と **network-free非保証** を併記するものであり、後者は前者を弱めるものではありません

### Rebuild Policy

- preview文書は差分更新しません
- 有効入力の変更だけが再構築判定に参加します
- payload変更、`allowJs`変更、capability変更は **破壊的再構築**です
- `iframeTitle`変更、`height` / `maxHeight` / `heightMode`の変更、表示高さ更新は **非破壊更新**です
- `activationPolicy`は **初回構築タイミングだけ**を制御し、構築済みpreviewの再構築判定には参加しません
- preview内stateの継続利用には依存しません

### Activation Policy

- `activationPolicy="eager"`の場合、previewは接続後に初回構築します
- `activationPolicy="visible"`の場合、previewはviewport近傍に達した時点で初回構築します
- `activationPolicy="manual"`の場合、previewは利用者または上位UIからの明示的な活性化までは初回構築しません
- noteページではbuild-timeのhydration directiveにより、`ui-preview-sandbox`自体の活性化がさらに遅延されてよいものとします。この場合`activationPolicy`はcomponentがhydrateされた後の初回構築条件として評価します
- activationは **初回構築の開始条件**であり、構築後の挙動、capability、network、sanitizationの意味を変更しません
- 未活性状態ではpreview文書は未構築であってよく、その間の高さは`height`を用います
- 未活性状態のhostはplaceholderのみを描画してよく、iframeを先に生成してはなりません
- 一度構築したpreviewは、以後`activationPolicy`の違いによって自動破棄しません

### Height Policy

- `height`はpreviewの基準高さです
- `heightMode="fixed"`の場合、解決済み高さは常に`resolvedHeight = height`です
- `heightMode="auto"`の場合、`height`は最小初期高さ兼fallback高さとして働き、解決済み高さは`resolvedHeight = max(height, measuredHeight)`です
- `heightMode="bounded-auto"`の場合、`height`は最小初期高さ兼fallback高さとして働き、`maxHeight`が有効なら`resolvedHeight = min(max(height, measuredHeight), maxHeight)`を用います
- `heightMode="bounded-auto"`かつ`maxHeight`が未指定または無効な場合は、`auto`と同じ扱いに縮退してよいものとします
- `fixed`以外では、helper scriptが有効な場合にpreviewは内容高へ自動追従します
- 自動追従は **増加・縮小の両方**に追従します
- ただし`auto`と`bounded-auto`では、`height`を下限として維持します
- 解決済み高さは常に整数pxの切り上げ値です
- 高さ計測はbest effortです
- 高さ計測に失敗した場合は`resolvedHeight = height`を用います
- 初回描画完了後に少なくとも1回計測します
- DOM / layout変化後には再計測します
- 高頻度変化に対する再計測はcoalesceしてよく、更新頻度の抑制を許可します
- 再計測と再描画は遅延してよいものとします
- ただし最終的には整合した見た目へ収束しなければなりません

### Interaction Policy

- 本コンポーネントはreading-first previewです
- text selection、focus、click、iframe内スクロールは正規の対話です
- form、popup、download、pointer lockは明示opt-inの場合だけ試行できます
- autofocusとload時scripted focusは契約対象外です
- 親アプリを変化させる統合的操作は契約対象外です

---

## Payload 契約

### 入力形

`ui-preview-sandbox`は次のpayloadを受け付けます。

| kind   | 内容          | 入力形                                            |
| ------ | ------------- | ------------------------------------------------- |
| `html` | body fragment | `template`の内容をHTML fragmentとして扱います  |
| `css`  | style text    | `template.textContent`をCSS textとして扱います |
| `js`   | script text   | `template.textContent`をJS textとして扱います  |

### 配置契約

payload用templateは、**ホスト要素の直下子**でなければなりません。descendant探索には依存しません。

```text
<ui-preview-sandbox>
  <template data-preview-kind="html">…</template>
  <template data-preview-kind="css">…</template>
  <template data-preview-kind="js">…</template>
</ui-preview-sandbox>
```

### 一意性契約

同一kindのtemplateを複数定義してはなりません。複数定義は契約違反です。

### `html` 契約

`html` payloadは、**preview文書のbodyに挿入されるfragment**です。HTML document全体を渡す入力ではありません。`head`、`meta`、`base`、`script`を`html` payload側で制御してはなりません。

`html` payloadは、template contentをfragmentとして直列化した結果を扱います。入力文字列の字面を保持する契約は持ちません。正規形はparser round-trip後のfragmentです。

parser round-tripに伴うノード構造、空白、コメント、属性順序の変形は許容します。

契約対象はHTML fragmentです。inline SVGはbest effortとします。MathML、declarative shadow DOM、parser特有挙動は契約対象外です。custom elementsは文書に現れてよいものとしますが、upgrade・定義・成功動作は保証しません。

### `css` 契約

`css` payloadはtextとして受け取り、preview文書内の`<style>`に挿入します。CSS payloadは信頼済みdemo CSSとして扱います。外部参照、アニメーション、固定配置、レイアウト変形を本コンポーネント側では制限しません。

### `js` 契約

`js` payloadはtextとして受け取り、`allowJs=true`の場合だけpreview文書内の`<script>`として挿入します。`allowJs=false`の場合、`js` payloadは無視します。

### 正規化契約

payload読み取り時の改行は`\n`に正規化します。利用者は行末コードの差異に依存しません。

---

## Preview 文書構成契約

preview文書は、次の順序で構成します。

1. 文書骨格
2. base style
3. author CSS
4. sanitized HTML
5. helper script
6. author JS

author JSは、sanitized HTMLとauthor CSSが配置された後に評価します。helper scriptはauthor JSより前に配置します。

---

## Sanitization 契約

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

## Capability 契約

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

### 非公開 token

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

### capability の意味

各opt-in capabilityは、成功保証ではなく **試行を許す権限**です。

- `allowForms`はform submitの試行を許可します
- `allowDownloads`はdownloadの試行を許可します
- `allowPointerLock`はpointer lockの試行を許可します
- `allowPopups`はpopupの試行を許可します

成功可否はuser agent、ユーザー操作、権限状態に依存します。

---

## 状態モデル

`ui-preview-sandbox`は、次の状態を持ちます。

### 構成状態

- `iframeTitle`
- `height`
- `maxHeight`
- `baseUrl`
- `allowJs`
- `activationPolicy`
- `heightMode`
- opt-in capability群
- `html` / `css` / `js` payload

### 活性化状態

- `isActivated`
- 初回構築前の未活性状態
- 初回構築後の活性状態

`isActivated`は公開状態ではなく、`activationPolicy`に従って内部的に管理します。

### 実行状態

- `measuredHeight`
- `resolvedHeight`
- 破壊的再構築後の新しいpreview文書

### 高さ状態

高さは、次の順で決まります。

1. 未活性状態では`resolvedHeight = height`を用います
2. `heightMode="fixed"`の場合は`resolvedHeight = height`を用います
3. `heightMode="auto"`の場合、helper scriptが計測に成功すれば`resolvedHeight = max(height, measuredHeight)`を用います
4. `heightMode="bounded-auto"`かつ`maxHeight`が有効な場合は`resolvedHeight = min(max(height, measuredHeight), maxHeight)`を用います
5. `heightMode="bounded-auto"`かつ`maxHeight`が未指定または無効な場合は`resolvedHeight = max(height, measuredHeight)`を用います
6. 計測不能時は`resolvedHeight = height`を用います

### 監視状態

契約上の再構築対象は、次の変更に限定します。

- 有効な直下子payload templateの追加・削除・内容変更
- `allowJs`の変更
- opt-in capabilityの変更

次の変更は再構築対象に含めません。

- `iframeTitle`の変更
- `height` / `maxHeight` / `heightMode`の変更
- `activationPolicy`の変更
- 高さ表示値の更新
- payloadに無関係なdescendant変更
- `allowJs=false`のときの`js` payload内容変更

---

## 再構築副作用契約

preview文書は、破壊的再構築時に全体を破棄して再生成します。したがって、再構築後は次の状態を保持しません。

- preview内DOMの実行時変更
- author JSのメモリ上のstate
- form入力値
- preview内スクロール位置
- 動的追加したevent listener
- timer / observer / closure

契約上、`ui-preview-sandbox`はstateful sandboxではなく、**入力から再構成されるdisposable preview**です。

### 破壊的再構築の対象

次の変更は破壊的再構築です。

- 有効payload変更
- `allowJs`変更
- capability変更

### 非破壊更新の対象

次の変更は非破壊更新です。

- `iframeTitle`変更
- 高さ表示値の更新

---

## DOM / Accessibility

ルートは`:host`です。Shadow DOM内部に`.root`と単一の`<iframe>`を持ちます。preview payloadはShadow DOMへ展開せず、`iframe.srcdoc`にシリアライズします。

```text
<ui-preview-sandbox>
  <template data-preview-kind="html">…</template>
  <template data-preview-kind="css">…</template>
  <template data-preview-kind="js">…</template>
  #shadow-root
    <div class="root">
      <iframe title="…" sandbox="…"></iframe>
    </div>
</ui-preview-sandbox>
```

### Accessibility 契約

- 対話主体はShadow DOM内のネイティブ`<iframe>`です
- iframeのアクセシブル名は`iframeTitle`で与えます
- `iframeTitle`が空の場合でも`プレビュー sandbox`を用います
- ホスト要素に追加roleは与えません
- preview内コンテンツの意味論はpayload側の責務です

### 文書言語契約

preview文書は常に`<html lang="ja">`を用います。`lang`は公開入力ではありません。これは **Rouaultの既定運用に合わせた固定仕様**であり、汎用sandboxに対する一般原則を意味しません。

### スタイル拡張契約

外部から保証するスタイル拡張面は次に限定します。

| 公開面                    | 役割                   |
| ------------------------- | ---------------------- |
| `:host`への通常CSS      | 外側レイアウトへの参加 |
| `--ui-preview-sandbox-bg` | iframe背景色の調整    |

内部class名、Shadow DOM構造、属性順序には依存しません。

---

## Visual Contract

`ui-preview-sandbox`は、previewを本文の主役にせず、静かに隔離表示します。

### レイアウト

- `:host`は`display: block`、`inline-size: 100%`です
- `.root`は`inline-size: 100%`です
- `iframe`は`display: block`、`inline-size: 100%`です
- `iframe`の`block-size`は`resolvedHeight`に一致します
- `iframe`の`min-block-size`は`height`に一致します

### 視覚仕様

- `iframe`のborderは`0`です
- 背景色は`--ui-preview-sandbox-bg`を優先し、未指定時は白を用います
- preview文書は既定で`color-scheme: light`を用います
- これらは **ベーススタイル** であり、最終描画結果はauthor CSSが上書きできます
- reading-firstの視覚契約はhostとiframe枠に適用し、iframe内文書の最終見た目はauthor inputに委ねます

### 高さ追従

自動高さ追従の目的は、iframe内スクロールの常態化ではなく、**内容高に近い表示**です。高さ計測はbest effortであり、失敗時は`resolvedHeight = height`に戻ります。計測に成功した場合でも、**`height`は下限として維持**されます。

---

## 遷移契約

次の遷移規則は、link、form、author JSのいずれから発火しても同じです。

- iframe内自己遷移は許可します
- 親文書へのtop-level navigationは許可しません
- 新規ウィンドウ / タブの試行は`allowPopups=true`の場合だけ許可します
- `mailto:` / `tel:`は構文上許可しますが、成功は保証しません

### form

- `allowForms=true`の場合だけform submitを試行できます
- form submitはiframe内遷移としてのみ扱います
- top-level navigationを伴うsubmitは許可しません
- submitの成功は保証しません

### download / popup / pointer lock

- `allowDownloads=true`の場合だけdownloadを試行できます
- `allowPopups=true`の場合だけpopupを試行できます
- `allowPointerLock=true`の場合だけpointer lockを試行できます
- いずれも成功は保証しません

---

## 親ウィンドウとの境界契約

高さ同期は内部的に`window.postMessage`を用います。本コンポーネントが受理するのは、高さ同期として整合する内部メッセージだけです。

受理条件は次のとおりです。

- `event.source`が当該iframeの`contentWindow`であること
- instance識別子が一致すること
- `height`が有限正数であること

このmessageは公開APIではありません。`srcdoc` iframe内helperとの私的通信として扱います。

`allowJs=true`の場合、author JSは`parent.postMessage()`により任意メッセージを送れます。しかし、本コンポーネントはそれを公開通信面とはみなしません。アプリケーション全体で別の`message` listenerがある場合、その信頼境界は本コンポーネント外で設計します。

---

## 環境別の振る舞い

### Script 実行不能環境

helper scriptが成立しない場合、自動高さ追従は成立しません。`resolvedHeight = height`を用います。

### `DOMParser` 非対応環境

`html` payloadのsanitizationが成立しないため、`html` payloadは **縮退動作として空**として扱います。これは互換性確保よりも安全側の裁定を優先するためです。

### `ResizeObserver` / `MutationObserver`

高さ計測では`ResizeObserver`を優先し、利用不可の場合は代替手段へフォールバックします。計測成功はbest effortです。

### Dark Mode

preview文書はlight baseです。外側アプリケーションのthemeには自動追従しません。

### Print

印刷専用契約は持ちません。印刷挙動はブラウザ依存です。

---

## 統合契約

### `ui-code-preview` との境界

- `ui-code-preview`は外枠UI、操作UI、表示切替を担当します
- `ui-preview-sandbox`はiframe文書生成を担当します
- 上位から渡す情報はdeclarative inputに限定します
- 上位UIの状態変更によって`srcdoc`を不用意に再生成しません

### Storybook 契約

各Storyは見本ではなく契約確認点です。将来変更時には、次を維持します。

| Story                     | 固定する契約                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| `HtmlOnly`                | HTML payloadのみでpreview文書を構成できること                                              |
| `AuthorJsOptIn`           | `allowJs`がauthor JSの注入可否だけを切り替えること                                         |
| `SandboxCapabilityTokens` | opt-in capabilityだけが追加されること                                                        |
| `SanitizationBoundary`    | 危険要素・属性・URLが除去されること                                                          |
| `CodePreviewIntegration`  | 上位UIの状態変更が`srcdoc`を不用意に変えないこと                                          |
| `HeightBehavior`          | baseline helperにより高さ追従が成立し、`height`が最小初期高さ兼fallback高さとして働くこと |
| `NonDestructiveUpdates`   | `iframeTitle`変更と高さ表示値更新が破壊的再構築を起こさないこと                              |

Storybookはtokenの**集合**を検証し、属性文字列の順序には依存しません。

---

## 境界条件

### payload 不在

- `html`不在時は空bodyとして扱います
- `css`不在時はbase styleのみを適用します
- `js`不在時はauthor JSを挿入しません

### 無効入力

- `height`が不正な場合は`160`に正規化します
- `iframeTitle`が空白のみの場合は`プレビュー sandbox`を用います
- `baseUrl`が不正な場合は埋め込み元文書のURLに正規化します
- 列挙外`data-preview-kind`は無視します

### 契約違反入力

- 同一kindの複数定義は **契約違反**です
- payload templateのdescendant配置は **契約違反**です
- `template[data-preview-kind]`以外の直下子要素は **契約違反**です
- 本コンポーネントは、本番時にはfail-softを優先し、**回復可能な契約違反入力**に対して描画継続を許可します
- 回復規則は次のとおりです
  - 評価対象は **直下子要素だけ**とします
  - kindごとに **DOM順最初の1件**だけを採用します
  - 2件目以降の同一kind templateは無視します
  - descendant配置のtemplateは入力候補に含めません
  - 空白テキストノードとコメントノードは無視します
- これらの回復規則は **契約違反を正当化するものではなく、本番描画を継続するための定義済み回復**です

### 高さ計測不能

自動高さ追従は失敗してよく、その場合は`resolvedHeight = height`を維持します。

---

## 開発時診断方針

本番時はfail-softを優先します。本番時の契約違反入力では、描画可能な最初の正規入力を採用し、描画を継続します。

開発時診断は、構文違反と意味違反に分けます。

### 構文違反

次の構文違反は **必ず警告**します。

- 同一kindの複数定義
- 直下子以外へのpayload配置
- `template[data-preview-kind]`以外の直下子要素
- 不正な公開入力
- `height`のCSS length指定

### 意味違反

次の意味違反は **必ず警告**します。

- `html` payloadに`head` / `meta` / `base` / `script`を含める入力
- `allowJs=false`なのに`js` payloadが存在する入力
- portabilityを期待できないcustom elements依存入力

Storybookと自動テストでは、次の不整合を **失敗として扱います**。

- 契約違反入力の未検出
- Storybook契約との不整合
- token集合契約との不整合

---

## Performance 契約

`ui-preview-sandbox`は、軽量なpreview容器です。大規模アプリケーション実行基盤ではありません。

- 高頻度更新されるpayloadは正規用途に含めません
- 大規模DOM / CSS / JS payloadに対する性能保証は行いません
- 高さ計測の過剰な更新頻度は抑制してよいものとします
- previewの正しさは性能最適化より優先します
- 遅延更新を行う場合でも、最終的に整合した見た目へ収束しなければなりません

---

## 現行実装からの移行課題

本節は、**現行実装を踏まえたときに、契約または追加検討機能として未だ対応していない事項**を列挙するものです。以下には、契約書に既に記載しているが現行実装が未対応のものと、照合の結果として補足が必要になったものを含みます。

### 残課題

- Storybookのsandbox検証を文字列比較からtoken集合比較へ変更します
- `baseUrl`導入後の相対URL解決契約をStorybookまたは自動テストで確認します
- 開発時診断の検出粒度を整理し、構文違反・意味違反・移植性警告を分けて確認できるようにします

---

## 補足

`ui-preview-sandbox`は、何でも流し込めるiframeラッパーではありません。**限定的に信頼したpreview入力を、明示的なpolicyの下で隔離描画するためのコンポーネント**です。

本書の要点は次のとおりです。

1. helper scriptとauthor JSを分離します
2. payload入力モデルを単純化します
3. sanitizationの責務を限定します
4. previewをdisposableに扱います
5. capability追加の判断原理を固定します
6. 破壊的再構築と非破壊更新の境界を固定します
7. trusted demo modeを明示します
8. 高さ、遷移、診断の規則をdeterministicに定義します

これらを崩さない限り、実装詳細を差し替えても契約は維持できます。
