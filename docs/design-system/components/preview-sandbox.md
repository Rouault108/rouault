# Preview Sandbox

## 目的

本書は、`ui-preview-sandbox` の公開契約を定義します。

`ui-preview-sandbox` は、author supplied な HTML / CSS / JS を `srcdoc` を用いた sandboxed iframe に封じ込めて描画する preview 用コンポーネントです。本コンポーネントの目的は、任意入力をそのままホスト DOM に混在させず、**限定的な sanitization**、**明示的な capability 制御**、**破壊的再構築を最小化した単純なライフサイクル**の上で preview を提供することです。

本書は、現行実装の説明ではなく、**長期的に維持しやすい契約の基準**を示します。現行実装が本書と一致しない場合は、本書を優先して設計を判断します。

## static-first 境界

`ui-preview-sandbox` は stateful allowlist component として維持します。sandbox iframe、payload activation、height synchronization、script capability、内部 lifecycle は component が所有し、静的 HTML 化対象にはしません。

note SSR では host と公開 Light DOM の `template[data-preview-kind]` fallback を保持します。host と公開 Light DOM 子孫は note static output 検査対象ですが、内部 Shadow DOM と declarative shadowroot template は non-allowlisted Custom Element 検査から除外します。

---

## 設計原則

`ui-preview-sandbox` は、次の原則に従います。

- preview 内容は host DOM に直接展開しません
- author input の安全境界は sanitizer 単体ではなく sandbox iframe で確保します
- helper 機構と author 機構は分離します
- preview 内 state の永続化には依存しません
- capability は opt-in で追加します
- 上位 UI と統合しても責務境界を曖昧にしません
- 破壊的再構築は payload と capability の変更に限定します
- 利用者に見える挙動は deterministic に定義します

---

## 適用範囲

本書は、次の事項を対象とします。

- 公開入力契約
- payload 入力モデル
- activation / script / network / sanitization / rebuild / height / interaction の各 policy
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 統合契約
- 境界条件
- 開発時診断方針
- 現行実装からの移行課題

本書は、次の事項を対象外とします。

- preview 内コードの妥当性保証
- 任意の危険入力を完全に無害化する保証
- アプリケーション全体の CSP、network、権限管理
- `ui-code-preview` 側の viewport UI、theme UI、code 表示 UI
- preview 内 state の永続化
- 大規模アプリケーション実行基盤としての性能保証
- `networkPolicy` のような外部到達性切替機能
- `renderMode` のような利用意図モード
- `previewState` のような外部観測可能な状態公開
- `themeMode` / `documentLang` のような preview 文書環境の可変化
- `sandboxProfile` のような抽象 profile API
- `errorMode` のような失敗表示戦略の切替

---

## 公開契約

`ui-preview-sandbox` は、`iframeTitle`、`height`、`baseUrl`、`allowJs`、`allowForms`、`allowDownloads`、`allowPointerLock`、`allowPopups` を公開入力として扱います。preview 内容は、**直下子の `template[data-preview-kind]`** から受け取ります。

### 入力契約

| 名前               | 種別                                        | 既定値               | 内容                    | 契約                                                                                                                                           |
| ------------------ | ------------------------------------------- | -------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `iframeTitle`      | property / attribute (`iframe-title`)       | `""`                 | iframe のアクセシブル名 | 空文字または空白のみの場合は `プレビュー sandbox` を用います                                                                                   |
| `height`           | property / attribute                        | `160`                | preview の基準高さ      | `heightMode="fixed"` では固定高さ、`auto` / `bounded-auto` では最小初期高さ兼 fallback 高さとして扱います。有限正数以外は `160` に正規化します |
| `maxHeight`        | property / attribute (`max-height`)         | 未指定               | preview の上限高さ      | `heightMode="bounded-auto"` の場合だけ意味を持ちます。有限正数でなければ未指定として扱います                                                   |
| `baseUrl`          | property / attribute (`base-url`)           | 埋め込み元文書の URL | 相対 URL の解決基準     | 絶対 URL でなければなりません。無効値は埋め込み元文書の URL に正規化します                                                                     |
| `allowJs`          | property / attribute (`allow-js`)           | `false`              | author JS の注入可否    | `true` の場合のみ `js` payload を有効入力として扱います                                                                                        |
| `activationPolicy` | property / attribute (`activation-policy`)  | `visible`            | 初回構築タイミング      | `eager` / `visible` / `manual` だけを受け付けます。無効値は `visible` に正規化します                                                           |
| `heightMode`       | property / attribute (`height-mode`)        | `auto`               | 高さ解決方式            | `fixed` / `auto` / `bounded-auto` だけを受け付けます。無効値は `auto` に正規化します                                                           |
| `allowForms`       | property / attribute (`allow-forms`)        | `false`              | form capability         | sandbox token に `allow-forms` を追加します                                                                                                    |
| `allowDownloads`   | property / attribute (`allow-downloads`)    | `false`              | download capability     | sandbox token に `allow-downloads` を追加します                                                                                                |
| `allowPointerLock` | property / attribute (`allow-pointer-lock`) | `false`              | pointer lock capability | sandbox token に `allow-pointer-lock` を追加します                                                                                             |
| `allowPopups`      | property / attribute (`allow-popups`)       | `false`              | popup capability        | sandbox token に `allow-popups` を追加します                                                                                                   |

### 入力文法契約

- `height` property は number を受け付けます
- `height` attribute は数値文字列だけを受け付けます
- `height="160px"` のような CSS length は無効です
- 無効な `height` 入力は `160` に正規化します
- `maxHeight` property は number を受け付けます
- `maxHeight` attribute は数値文字列だけを受け付けます
- `maxHeight="480px"` のような CSS length は無効です
- 無効な `maxHeight` 入力は未指定として扱います
- `baseUrl` は absolute URL 文字列または `URL` 相当値を受け付けます
- 無効な `baseUrl` 入力は埋め込み元文書の URL に正規化します
- `activationPolicy` は `eager` / `visible` / `manual` だけを受け付けます
- 無効な `activationPolicy` 入力は `visible` に正規化します
- `heightMode` は `fixed` / `auto` / `bounded-auto` だけを受け付けます
- 無効な `heightMode` 入力は `auto` に正規化します
- boolean 公開属性は、属性が存在すれば `true`、存在しなければ `false` として扱います

### 既定仕様

次の事項は公開入力ではなく、固定仕様です。

- preview 文書の既定言語は `ja` です
- preview 文書の既定 `color-scheme` は `light` です
- `base` 要素による基準 URL の差し替えは許可しません

これらの既定値は、**Rouault における reading-first preview の既定**として固定するものです。これは汎用 sandbox コンポーネント一般の普遍既定を主張するものではありません。

### 非公開事項

本コンポーネントは、次を公開しません。

- 公開メソッド
- 公開イベント
- preview 内 DOM への操作 API
- 親ウィンドウとの双方向通信 API
- `::part(...)`
- helper script の実装詳細
- 内部 message の形式
- 内部 instance 識別子

公開しない内部詳細には依存しません。

また、note 種別ごとの掲載可否は本コンポーネント自身の公開 API ではありません。`kind: reader` の note で本コンポーネントを禁止するかどうかは、build / layout 側の統合契約で扱います。

---

## Policy モデル

`ui-preview-sandbox` は、次の policy を持つコンポーネントとして扱います。ここでいう policy は、長期保守のために先に固定する設計判断です。

### Payload Policy

- payload は **直下子の `template[data-preview-kind]`** だけを受け付けます
- kind は `html` / `css` / `js` だけを受け付けます
- 各 kind は **0 個または 1 個**だけを許可します
- 同一 kind の複数定義は **契約違反**です
- `template[data-preview-kind]` 以外の **直下子要素ノード** は **契約違反**です
- 直下子の空白テキストノードとコメントノードは無視します
- payload 以外の descendant ノードは描画入力として扱いません

### Script Policy

- sandbox iframe には、**baseline capability として `allow-scripts` を含めます**
- baseline `allow-scripts` は helper script のために存在します
- `allowJs` は **author JS の注入可否だけ**を制御します
- `allowJs=false` の場合でも helper script は成立します
- `allowJs=true` は **trusted author code execution** を意味します
- ここでいう `trusted` とは、**本コンポーネントの利用者およびその入力経路の管理者が、当該 preview に供給する CSS / JS payload を信頼済み入力として扱う**ことを意味します
- `html` payload は `allowJs` の値にかかわらず非特権入力として扱い、完全 sanitizer 相当の保証は行いません
- author JS は iframe 内 DOM 書き換え、内部状態保持、network access、`parent.postMessage()` を行えます
- author JS には親 DOM 参照権限、same-origin 権限、永続ストレージ権限を与えません
- author JS は classic script として扱います
- author JS は破壊的再構築 1 回につき 1 回だけ評価します
- author JS の評価失敗は preview 外へ再送しません
- helper script と author JS は障害分離して扱います

### Sanitization Policy

- `html` payload には限定的 sanitization を適用します
- `css` payload と `js` payload には限定的な閉じタグ保護だけを適用します
- 本コンポーネントは完全 sanitizer ではありません
- 安全境界の本体は sandbox iframe です

### Network Policy

- 本コンポーネントは **trusted demo mode** として動作します
- preview は **network-free を保証しません**
- 相対 URL は `baseUrl` を基準に解決します
- 許可された URL は文書中に保持され得ます
- CSS / HTML / JS は外部リソースアクセスを発生させ得ます
- **network access の抑止、到達性の遮断、取得結果の制御は本コンポーネントの責務ではありません**
- URL allowlist は **構文上の許可規則**であり、取得・遷移・起動の成功保証ではありません
- 一方で、`javascript:`、`vbscript:`、`data:` およびそれらを難読化した危険 URL は、**安全上の理由から禁止**します
- したがって、本節は **危険な URL の禁止** と **network-free 非保証** を併記するものであり、後者は前者を弱めるものではありません

### Rebuild Policy

- preview 文書は差分更新しません
- 有効入力の変更だけが再構築判定に参加します
- payload 変更、`allowJs` 変更、capability 変更は **破壊的再構築**です
- `iframeTitle` 変更、`height` / `maxHeight` / `heightMode` の変更、表示高さ更新は **非破壊更新**です
- `activationPolicy` は **初回構築タイミングだけ**を制御し、構築済み preview の再構築判定には参加しません
- preview 内 state の継続利用には依存しません

### Activation Policy

- `activationPolicy="eager"` の場合、preview は接続後に初回構築します
- `activationPolicy="visible"` の場合、preview は viewport 近傍に達した時点で初回構築します
- `activationPolicy="manual"` の場合、preview は利用者または上位 UI からの明示的な活性化までは初回構築しません
- note ページでは build-time の hydration directive により、`ui-preview-sandbox` 自体の活性化がさらに遅延されてよいものとします。この場合 `activationPolicy` は component が hydrate された後の初回構築条件として評価します
- activation は **初回構築の開始条件**であり、構築後の挙動、capability、network、sanitization の意味を変更しません
- 未活性状態では preview 文書は未構築であってよく、その間の高さは `height` を用います
- 未活性状態の host は placeholder のみを描画してよく、iframe を先に生成してはなりません
- 一度構築した preview は、以後 `activationPolicy` の違いによって自動破棄しません

### Height Policy

- `height` は preview の基準高さです
- `heightMode="fixed"` の場合、解決済み高さは常に `resolvedHeight = height` です
- `heightMode="auto"` の場合、`height` は最小初期高さ兼 fallback 高さとして働き、解決済み高さは `resolvedHeight = max(height, measuredHeight)` です
- `heightMode="bounded-auto"` の場合、`height` は最小初期高さ兼 fallback 高さとして働き、`maxHeight` が有効なら `resolvedHeight = min(max(height, measuredHeight), maxHeight)` を用います
- `heightMode="bounded-auto"` かつ `maxHeight` が未指定または無効な場合は、`auto` と同じ扱いに縮退してよいものとします
- `fixed` 以外では、helper script が有効な場合に preview は内容高へ自動追従します
- 自動追従は **増加・縮小の両方**に追従します
- ただし `auto` と `bounded-auto` では、`height` を下限として維持します
- 解決済み高さは常に整数 px の切り上げ値です
- 高さ計測は best effort です
- 高さ計測に失敗した場合は `resolvedHeight = height` を用います
- 初回描画完了後に少なくとも 1 回計測します
- DOM / layout 変化後には再計測します
- 高頻度変化に対する再計測は coalesce してよく、更新頻度の抑制を許可します
- 再計測と再描画は遅延してよいものとします
- ただし最終的には整合した見た目へ収束しなければなりません

### Interaction Policy

- 本コンポーネントは reading-first preview です
- text selection、focus、click、iframe 内スクロールは正規の対話です
- form、popup、download、pointer lock は明示 opt-in の場合だけ試行できます
- autofocus と load 時 scripted focus は契約対象外です
- 親アプリを変化させる統合的操作は契約対象外です

---

## Payload 契約

### 入力形

`ui-preview-sandbox` は次の payload を受け付けます。

| kind   | 内容          | 入力形                                            |
| ------ | ------------- | ------------------------------------------------- |
| `html` | body fragment | `template` の内容を HTML fragment として扱います  |
| `css`  | style text    | `template.textContent` を CSS text として扱います |
| `js`   | script text   | `template.textContent` を JS text として扱います  |

### 配置契約

payload 用 template は、**ホスト要素の直下子**でなければなりません。descendant 探索には依存しません。

```text
<ui-preview-sandbox>
  <template data-preview-kind="html">…</template>
  <template data-preview-kind="css">…</template>
  <template data-preview-kind="js">…</template>
</ui-preview-sandbox>
```

### 一意性契約

同一 kind の template を複数定義してはなりません。複数定義は契約違反です。

### `html` 契約

`html` payload は、**preview 文書の body に挿入される fragment**です。HTML document 全体を渡す入力ではありません。`head`、`meta`、`base`、`script` を `html` payload 側で制御してはなりません。

`html` payload は、template content を fragment として直列化した結果を扱います。入力文字列の字面を保持する契約は持ちません。正規形は parser round-trip 後の fragment です。

parser round-trip に伴うノード構造、空白、コメント、属性順序の変形は許容します。

契約対象は HTML fragment です。inline SVG は best effort とします。MathML、declarative shadow DOM、parser 特有挙動は契約対象外です。custom elements は文書に現れてよいものとしますが、upgrade・定義・成功動作は保証しません。

### `css` 契約

`css` payload は text として受け取り、preview 文書内の `<style>` に挿入します。CSS payload は信頼済み demo CSS として扱います。外部参照、アニメーション、固定配置、レイアウト変形を本コンポーネント側では制限しません。

### `js` 契約

`js` payload は text として受け取り、`allowJs=true` の場合だけ preview 文書内の `<script>` として挿入します。`allowJs=false` の場合、`js` payload は無視します。

### 正規化契約

payload 読み取り時の改行は `\n` に正規化します。利用者は行末コードの差異に依存しません。

---

## Preview 文書構成契約

preview 文書は、次の順序で構成します。

1. 文書骨格
2. base style
3. author CSS
4. sanitized HTML
5. helper script
6. author JS

author JS は、sanitized HTML と author CSS が配置された後に評価します。helper script は author JS より前に配置します。

---

## Sanitization 契約

`html` payload には限定的 sanitization を適用します。主な除去対象は次のとおりです。

- `script` / `iframe` / `object` / `embed` / `base`
- `meta[http-equiv="refresh"]`
- `on*` 属性
- `srcdoc` 属性
- 危険な URL を持つ `href` / `xlink:href` / `src` / `poster` / `action` / `formaction`
- `javascript:` を含む `style` 属性

URL 属性は次の方針で扱います。

- `href` / `xlink:href` は `http:` / `https:` / `mailto:` / `tel:` を許可します
- `src` / `poster` は `http:` / `https:` を許可します
- `action` / `formaction` は `http:` / `https:` を許可します
- 相対 URL は維持します
- `javascript:` / `vbscript:` / `data:` は拒否します
- 制御文字や空白を混ぜた難読化 URL も拒否対象に含めます

`data:` を許可すると、preview 用途としては便利でも安全境界の説明が複雑になりやすいため、本書では**利便性より安全側を優先して拒否**します。

`css` payload と `js` payload には、同等の sanitization を適用しません。閉じタグ破壊だけを防ぎます。

---

## Capability 契約

sandbox iframe は、baseline と opt-in を分けて扱います。

### Baseline

baseline token は次のとおりです。

- `allow-scripts`

これは helper script のための基準 capability です。author JS のための opt-in ではありません。

### Opt-in

opt-in token は次のとおりです。

- `allow-forms`
- `allow-downloads`
- `allow-pointer-lock`
- `allow-popups`

### 非公開 token

次の token は公開しません。

- `allow-same-origin`
- `allow-modals`
- `allow-top-navigation` 系
- 永続ストレージや親文書同等権限につながる token

### 選定原理

新しい sandbox capability を追加する場合は、次の条件を満たさなければなりません。

- 読書体験を壊しません
- 親アプリの安全境界を弱めません
- same-origin 相当の権限を要求しません
- preview に必須な用途が説明できます

### capability の意味

各 opt-in capability は、成功保証ではなく **試行を許す権限**です。

- `allowForms` は form submit の試行を許可します
- `allowDownloads` は download の試行を許可します
- `allowPointerLock` は pointer lock の試行を許可します
- `allowPopups` は popup の試行を許可します

成功可否は user agent、ユーザー操作、権限状態に依存します。

---

## 状態モデル

`ui-preview-sandbox` は、次の状態を持ちます。

### 構成状態

- `iframeTitle`
- `height`
- `maxHeight`
- `baseUrl`
- `allowJs`
- `activationPolicy`
- `heightMode`
- opt-in capability 群
- `html` / `css` / `js` payload

### 活性化状態

- `isActivated`
- 初回構築前の未活性状態
- 初回構築後の活性状態

`isActivated` は公開状態ではなく、`activationPolicy` に従って内部的に管理します。

### 実行状態

- `measuredHeight`
- `resolvedHeight`
- 破壊的再構築後の新しい preview 文書

### 高さ状態

高さは、次の順で決まります。

1. 未活性状態では `resolvedHeight = height` を用います
2. `heightMode="fixed"` の場合は `resolvedHeight = height` を用います
3. `heightMode="auto"` の場合、helper script が計測に成功すれば `resolvedHeight = max(height, measuredHeight)` を用います
4. `heightMode="bounded-auto"` かつ `maxHeight` が有効な場合は `resolvedHeight = min(max(height, measuredHeight), maxHeight)` を用います
5. `heightMode="bounded-auto"` かつ `maxHeight` が未指定または無効な場合は `resolvedHeight = max(height, measuredHeight)` を用います
6. 計測不能時は `resolvedHeight = height` を用います

### 監視状態

契約上の再構築対象は、次の変更に限定します。

- 有効な直下子 payload template の追加・削除・内容変更
- `allowJs` の変更
- opt-in capability の変更

次の変更は再構築対象に含めません。

- `iframeTitle` の変更
- `height` / `maxHeight` / `heightMode` の変更
- `activationPolicy` の変更
- 高さ表示値の更新
- payload に無関係な descendant 変更
- `allowJs=false` のときの `js` payload 内容変更

---

## 再構築副作用契約

preview 文書は、破壊的再構築時に全体を破棄して再生成します。したがって、再構築後は次の状態を保持しません。

- preview 内 DOM の実行時変更
- author JS のメモリ上の state
- form 入力値
- preview 内スクロール位置
- 動的追加した event listener
- timer / observer / closure

契約上、`ui-preview-sandbox` は stateful sandbox ではなく、**入力から再構成される disposable preview**です。

### 破壊的再構築の対象

次の変更は破壊的再構築です。

- 有効 payload 変更
- `allowJs` 変更
- capability 変更

### 非破壊更新の対象

次の変更は非破壊更新です。

- `iframeTitle` 変更
- 高さ表示値の更新

---

## DOM / Accessibility

ルートは `:host` です。Shadow DOM 内部に `.root` と単一の `<iframe>` を持ちます。preview payload は Shadow DOM へ展開せず、`iframe.srcdoc` にシリアライズします。

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

- 対話主体は Shadow DOM 内のネイティブ `<iframe>` です
- iframe のアクセシブル名は `iframeTitle` で与えます
- `iframeTitle` が空の場合でも `プレビュー sandbox` を用います
- ホスト要素に追加 role は与えません
- preview 内コンテンツの意味論は payload 側の責務です

### 文書言語契約

preview 文書は常に `<html lang="ja">` を用います。`lang` は公開入力ではありません。これは **Rouault の既定運用に合わせた固定仕様**であり、汎用 sandbox に対する一般原則を意味しません。

### スタイル拡張契約

外部から保証するスタイル拡張面は次に限定します。

| 公開面                    | 役割                   |
| ------------------------- | ---------------------- |
| `:host` への通常 CSS      | 外側レイアウトへの参加 |
| `--ui-preview-sandbox-bg` | iframe 背景色の調整    |

内部 class 名、Shadow DOM 構造、属性順序には依存しません。

---

## Visual Contract

`ui-preview-sandbox` は、preview を本文の主役にせず、静かに隔離表示します。

### レイアウト

- `:host` は `display: block`、`inline-size: 100%` です
- `.root` は `inline-size: 100%` です
- `iframe` は `display: block`、`inline-size: 100%` です
- `iframe` の `block-size` は `resolvedHeight` に一致します
- `iframe` の `min-block-size` は `height` に一致します

### 視覚仕様

- `iframe` の border は `0` です
- 背景色は `--ui-preview-sandbox-bg` を優先し、未指定時は白を用います
- preview 文書は既定で `color-scheme: light` を用います
- これらは **ベーススタイル** であり、最終描画結果は author CSS が上書きできます
- reading-first の視覚契約は host と iframe 枠に適用し、iframe 内文書の最終見た目は author input に委ねます

### 高さ追従

自動高さ追従の目的は、iframe 内スクロールの常態化ではなく、**内容高に近い表示**です。高さ計測は best effort であり、失敗時は `resolvedHeight = height` に戻ります。計測に成功した場合でも、**`height` は下限として維持**されます。

---

## 遷移契約

次の遷移規則は、link、form、author JS のいずれから発火しても同じです。

- iframe 内自己遷移は許可します
- 親文書への top-level navigation は許可しません
- 新規ウィンドウ / タブの試行は `allowPopups=true` の場合だけ許可します
- `mailto:` / `tel:` は構文上許可しますが、成功は保証しません

### form

- `allowForms=true` の場合だけ form submit を試行できます
- form submit は iframe 内遷移としてのみ扱います
- top-level navigation を伴う submit は許可しません
- submit の成功は保証しません

### download / popup / pointer lock

- `allowDownloads=true` の場合だけ download を試行できます
- `allowPopups=true` の場合だけ popup を試行できます
- `allowPointerLock=true` の場合だけ pointer lock を試行できます
- いずれも成功は保証しません

---

## 親ウィンドウとの境界契約

高さ同期は内部的に `window.postMessage` を用います。本コンポーネントが受理するのは、高さ同期として整合する内部メッセージだけです。

受理条件は次のとおりです。

- `event.source` が当該 iframe の `contentWindow` であること
- instance 識別子が一致すること
- `height` が有限正数であること

この message は公開 API ではありません。`srcdoc` iframe 内 helper との私的通信として扱います。

`allowJs=true` の場合、author JS は `parent.postMessage()` により任意メッセージを送れます。しかし、本コンポーネントはそれを公開通信面とはみなしません。アプリケーション全体で別の `message` listener がある場合、その信頼境界は本コンポーネント外で設計します。

---

## 環境別の振る舞い

### Script 実行不能環境

helper script が成立しない場合、自動高さ追従は成立しません。`resolvedHeight = height` を用います。

### `DOMParser` 非対応環境

`html` payload の sanitization が成立しないため、`html` payload は **縮退動作として空**として扱います。これは互換性確保よりも安全側の裁定を優先するためです。

### `ResizeObserver` / `MutationObserver`

高さ計測では `ResizeObserver` を優先し、利用不可の場合は代替手段へフォールバックします。計測成功は best effort です。

### Dark Mode

preview 文書は light base です。外側アプリケーションの theme には自動追従しません。

### Print

印刷専用契約は持ちません。印刷挙動はブラウザ依存です。

---

## 統合契約

### `ui-code-preview` との境界

- `ui-code-preview` は外枠 UI、操作 UI、表示切替を担当します
- `ui-preview-sandbox` は iframe 文書生成を担当します
- 上位から渡す情報は declarative input に限定します
- 上位 UI の状態変更によって `srcdoc` を不用意に再生成しません

### Storybook 契約

各 Story は見本ではなく契約確認点です。将来変更時には、次を維持します。

| Story                     | 固定する契約                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| `HtmlOnly`                | HTML payload のみで preview 文書を構成できること                                              |
| `AuthorJsOptIn`           | `allowJs` が author JS の注入可否だけを切り替えること                                         |
| `SandboxCapabilityTokens` | opt-in capability だけが追加されること                                                        |
| `SanitizationBoundary`    | 危険要素・属性・URL が除去されること                                                          |
| `CodePreviewIntegration`  | 上位 UI の状態変更が `srcdoc` を不用意に変えないこと                                          |
| `HeightBehavior`          | baseline helper により高さ追従が成立し、`height` が最小初期高さ兼 fallback 高さとして働くこと |
| `NonDestructiveUpdates`   | `iframeTitle` 変更と高さ表示値更新が破壊的再構築を起こさないこと                              |

Storybook は token の**集合**を検証し、属性文字列の順序には依存しません。

---

## 境界条件

### payload 不在

- `html` 不在時は空 body として扱います
- `css` 不在時は base style のみを適用します
- `js` 不在時は author JS を挿入しません

### 無効入力

- `height` が不正な場合は `160` に正規化します
- `iframeTitle` が空白のみの場合は `プレビュー sandbox` を用います
- `baseUrl` が不正な場合は埋め込み元文書の URL に正規化します
- 列挙外 `data-preview-kind` は無視します

### 契約違反入力

- 同一 kind の複数定義は **契約違反**です
- payload template の descendant 配置は **契約違反**です
- `template[data-preview-kind]` 以外の直下子要素は **契約違反**です
- 本コンポーネントは、本番時には fail-soft を優先し、**回復可能な契約違反入力**に対して描画継続を許可します
- 回復規則は次のとおりです
  - 評価対象は **直下子要素だけ**とします
  - kind ごとに **DOM 順最初の 1 件**だけを採用します
  - 2 件目以降の同一 kind template は無視します
  - descendant 配置の template は入力候補に含めません
  - 空白テキストノードとコメントノードは無視します
- これらの回復規則は **契約違反を正当化するものではなく、本番描画を継続するための定義済み回復**です

### 高さ計測不能

自動高さ追従は失敗してよく、その場合は `resolvedHeight = height` を維持します。

---

## 開発時診断方針

本番時は fail-soft を優先します。本番時の契約違反入力では、描画可能な最初の正規入力を採用し、描画を継続します。

開発時診断は、構文違反と意味違反に分けます。

### 構文違反

次の構文違反は **必ず警告**します。

- 同一 kind の複数定義
- 直下子以外への payload 配置
- `template[data-preview-kind]` 以外の直下子要素
- 不正な公開入力
- `height` の CSS length 指定

### 意味違反

次の意味違反は **必ず警告**します。

- `html` payload に `head` / `meta` / `base` / `script` を含める入力
- `allowJs=false` なのに `js` payload が存在する入力
- portability を期待できない custom elements 依存入力

Storybook と自動テストでは、次の不整合を **失敗として扱います**。

- 契約違反入力の未検出
- Storybook 契約との不整合
- token 集合契約との不整合

---

## Performance 契約

`ui-preview-sandbox` は、軽量な preview 容器です。大規模アプリケーション実行基盤ではありません。

- 高頻度更新される payload は正規用途に含めません
- 大規模 DOM / CSS / JS payload に対する性能保証は行いません
- 高さ計測の過剰な更新頻度は抑制してよいものとします
- preview の正しさは性能最適化より優先します
- 遅延更新を行う場合でも、最終的に整合した見た目へ収束しなければなりません

---

## 現行実装からの移行課題

本節は、**現行実装を踏まえたときに、契約または追加検討機能として未だ対応していない事項**を列挙するものです。以下には、契約書に既に記載しているが現行実装が未対応のものと、照合の結果として補足が必要になったものを含みます。

### 残課題

- Storybook の sandbox 検証を文字列比較から token 集合比較へ変更します
- `baseUrl` 導入後の相対 URL 解決契約を Storybook または自動テストで確認します
- 開発時診断の検出粒度を整理し、構文違反・意味違反・移植性警告を分けて確認できるようにします

---

## 補足

`ui-preview-sandbox` は、何でも流し込める iframe ラッパーではありません。**限定的に信頼した preview 入力を、明示的な policy の下で隔離描画するためのコンポーネント**です。

本書の要点は次のとおりです。

1. helper script と author JS を分離します
2. payload 入力モデルを単純化します
3. sanitization の責務を限定します
4. preview を disposable に扱います
5. capability 追加の判断原理を固定します
6. 破壊的再構築と非破壊更新の境界を固定します
7. trusted demo mode を明示します
8. 高さ、遷移、診断の規則を deterministic に定義します

これらを崩さない限り、実装詳細を差し替えても契約は維持できます。
