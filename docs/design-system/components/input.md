# Input

## 概要

本書は、`ui-input` の公開契約、状態モデル、アクセシビリティ、および視覚契約を整理するものです。

`ui-input` は、単に文字列を受け取るフォーム部品ではありません。Rouault においては、**入力可能領域を静かに明示しつつ、読書や執筆の集中を不必要に遮らないこと**、**エラーや補助情報を入力位置の近傍で解決すること**、**Shadow DOM 配下でもフォーム送信と妥当性判定へ正しく参加すること**を公開契約として固定します。

また、`label`、`type`、`helpText`、`errorMessage`、`required`、`disabled`、`readonly` は、それぞれ独立の装飾指定ではなく、**意味・状態・フォーム参加・アクセシビリティ**に関わる契約です。見た目の入力欄を描画することではなく、**入力の意味と境界条件を安定して扱えること**を優先します。

Rouault における input は、読書の合間に現れる操作部品であり、本文より強く主張してはなりません。そのため本コンポーネントの契約は、**入力可能性の明示**と、**「没入して読む」ことのできるデザイン**の維持を両立する方向で定義します。

---

## 適用範囲

本書は、`ui-input` の次の事項を対象とします。

- 公開契約
- 状態モデル
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 関連契約
- 境界条件
- Storybook 契約
- 現行実装で未対応または未強制の事項

一方で、本書は次の事項を扱いません。

- 複数フィールドをまたぐフォーム全体の検証設計
- どの画面でどの入力項目を必須にするかというプロダクト判断
- エラーメッセージ文言の業務設計
- サーバーサイド検証や API 応答の解釈
- `textarea`、`search`、`select`、`checkbox`、`radio`、`date` など別系統コントロールの仕様
- 入力補完候補 UI やマスク入力 UI など上位機能

これらは上位レイヤまたは別コンポーネントの責務です。

---

## 公開契約

`ui-input` は、`label`、`hideLabel`、`variant`、`type`、`name`、`placeholder`、`value`、`defaultValue`、`helpText`、`errorMessage`、`error`、`disabled`、`readonly`、`required`、`requiredIndicator`、`pattern`、`minlength`、`maxlength`、`autocomplete` を公開入力として扱います。スロットは公開しません。利用者は Shadow DOM 内部の `<input>` を直接契約対象とせず、`ui-input` を契約単位として扱います。

`label` は公開契約上必須です。視覚的にラベルを隠す場合でも、`hide-label` を用いて**対応付けられた label 要素を維持したまま視覚だけを隠す**運用を行います。アクセシブル名の正準ソースは label 要素であり、ラベルなし運用や `aria-label` 依存運用には寄せません。

`value` は**現在値**です。`defaultValue` は**初期値および reset 復元値**です。両者は異なる役割を持ち、`value` の更新は `defaultValue` を変更しません。`ui-input` は**自己保持型の単一行入力**であり、通常のユーザー入力では内部状態として現在値を更新します。

`variant` の既定値は `filled` です。`type` の既定値は `text` です。`error` は**外部から与える強制エラー状態**であり、`errorMessage` と組で扱います。`error=true` の場合、`errorMessage` には**空でない文言**を与えなければなりません（MUST）。`error=true` かつ `errorMessage=''` は契約違反です。この場合、コンポーネントは開発時警告を出し、**外部強制エラー状態としては扱いません**。ネイティブバリデーション起因の invalid はこれとは別系統です。

`helpText` と `errorMessage` は同時表示しません。エラー状態ではエラーメッセージを優先し、補助テキストは表示から除外します。これは、入力近傍で**いま最も重要な情報を一つだけ読ませる**ための契約です。

`required` は**意味状態**です。`requiredIndicator` は**視覚表現**です。必須性の意味と表示は分離し、`required=true` であっても表示方法は `requiredIndicator` により切り替えます。

`ui-input` は text-like な単一行入力のみを対象とします。`number` は本契約に含めません。数値入力を正式に扱う場合は、`min` / `max` / `step` / `valueAsNumber` を備えた別契約、または別コンポーネントとして定義します。

### 入力契約

| 名前 | 種別 | 必須 | 内容 | 契約 |
| --- | --- | --- | --- | --- |
| `label` | property / attribute | はい | 入力項目のラベル | 空文字列は契約違反です。`hide-label` 使用時も必須です |
| `hideLabel` | property / attribute (`hide-label`) | いいえ | ラベルの視覚的非表示 | 対応付けられた label 要素は維持します |
| `variant` | property / attribute | いいえ | 外観種別 | `filled` / `outline`。既定値は `filled` です。列挙外値は契約違反であり、`filled` に正規化します |
| `type` | property / attribute | いいえ | ネイティブ入力種別 | `text` / `email` / `password` / `tel` / `url`。既定値は `text` です。列挙外値は契約違反であり、`text` に正規化します |
| `name` | property / attribute | いいえ | フォーム送信名 | FormData 参加時のキーです |
| `placeholder` | property / attribute | いいえ | ヒント文字列 | ラベルの代替にはしません |
| `value` | property | いいえ | 現在値 | 文字列として扱います |
| `defaultValue` | property / attribute (`default-value`) | いいえ | 初期値 | reset 時の復元元です |
| `helpText` | property / attribute (`help-text`) | いいえ | 補助説明 | 非エラー時のみ表示します |
| `errorMessage` | property / attribute (`error-message`) | いいえ | エラー文言 | `error=true` の場合は空でない文言が必須です |
| `error` | property / attribute | いいえ | 強制エラー状態 | `true` の場合、`errorMessage` と組で外部エラー状態を構成します。`errorMessage` が空の場合は契約違反として警告し、外部エラー状態に入りません |
| `disabled` | property / attribute | いいえ | 不活性状態 | `true` の場合、フォーム値へ参加せず、エラー状態も吸収します |
| `readonly` | property / attribute | いいえ | 読み取り専用 | フォーカス、選択、コピーは可能です |
| `required` | property / attribute | いいえ | 必須入力 | ネイティブ妥当性へ参加します |
| `requiredIndicator` | property / attribute (`required-indicator`) | いいえ | 必須表示方式 | `text` / `asterisk` / `none`。既定値は `text` です |
| `pattern` | property / attribute | いいえ | 正規表現パターン | ネイティブ妥当性へ参加します |
| `minlength` | property / attribute | いいえ | 最小文字数 | 数値で指定します |
| `maxlength` | property / attribute | いいえ | 最大文字数 | 数値で指定します |
| `autocomplete` | property / attribute | いいえ | 自動補完ヒント | ネイティブ input へ委譲します |

### スロット契約

`ui-input` は公開スロットを持ちません。入力 UI の構造はコンポーネント内部で固定し、利用側がラベル、エラー文言、補助文言、入力本体を自由配置する設計は採りません。

これは、**ラベルと入力欄の対応付け**、**`aria-describedby` の切り替え**、**エラー時の一貫したレイアウト**を崩さないためです。

### 公開メソッド

`ui-input` は、内部 input を Shadow DOM の外から扱うため、次の公開メソッドを持ちます。

| 名前 | 種別 | 契約 |
| --- | --- | --- |
| `focus(options?)` | method | 内部 input にフォーカスを委譲します |
| `blur()` | method | 内部 input からフォーカスを外します |
| `select()` | method | 内部 input のテキスト選択を行います |
| `checkValidity()` | method | 現在値と設定値を基に妥当性を評価します |
| `reportValidity()` | method | 妥当性を評価し、必要に応じてブラウザ標準の報告を行います |

これらは Shadow DOM 内部実装を利用側に露出させないための公開面です。利用者は内部の `<input>` を直接探索せず、これらの公開メソッドを使用します。

### 公開面の方針

`ui-input` は **minimal façade** を採ります。したがって、`setCustomValidity()`、`validity`、`validationMessage`、`labels`、`valueAsNumber` などの HTMLInputElement 互換 API を包括的に公開しません。利用者は、公開 `value`、`checkValidity()`、`reportValidity()`、および label / help / error の契約を通じて利用します。

### プログラム更新契約

`value`、`defaultValue`、`required`、`pattern`、`minlength`、`maxlength`、`type` などの property 更新は、内部 input、FormData 参加状態、および妥当性状態へ同期します。

一方で、**programmatic update はユーザー入力の代替ではありません**。property 代入や attribute 更新によって `input` / `change` を新たに発火させることは公開契約に含みません。利用者は、値同期とイベント通知を同一視してはなりません。

### 属性反映契約

公開入力のうち、`label`、`hideLabel`、`variant`、`type`、`name`、`placeholder`、`defaultValue`、`helpText`、`errorMessage`、`error`、`disabled`、`readonly`、`required`、`requiredIndicator`、`pattern`、`minlength`、`maxlength`、`autocomplete` は property と attribute の両面から操作できます。`value` は property として扱うことを基本とし、反射属性ではありません。

| property | attribute | reflect | 備考 |
| --- | --- | --- | --- |
| `label` | `label` | あり | 必須契約です |
| `hideLabel` | `hide-label` | あり | boolean attribute として扱います |
| `variant` | `variant` | あり | `filled` / `outline` を正規入力とします。列挙外値は `filled` に正規化し、canonical な値を attribute にも再反映します |
| `type` | `type` | あり | 非対応値は `text` に正規化し、canonical な値を attribute にも再反映します |
| `name` | `name` | あり | FormData キーに使用します |
| `placeholder` | `placeholder` | あり | 補助ヒントです |
| `value` | `value` | なし | 現在値を表す property です |
| `defaultValue` | `default-value` | あり | 初期値および reset 復元値です |
| `helpText` | `help-text` | あり | 非エラー時のみ表示します |
| `errorMessage` | `error-message` | あり | 強制エラー文言です |
| `error` | `error` | あり | boolean attribute として扱います |
| `disabled` | `disabled` | あり | boolean attribute として扱います |
| `readonly` | `readonly` | あり | boolean attribute として扱います |
| `required` | `required` | あり | boolean attribute として扱います |
| `requiredIndicator` | `required-indicator` | あり | `text` / `asterisk` / `none` を正規入力とします |
| `pattern` | `pattern` | あり | ネイティブ input に委譲します |
| `minlength` | `minlength` | あり | 数値として扱います |
| `maxlength` | `maxlength` | あり | 数値として扱います |
| `autocomplete` | `autocomplete` | あり | ネイティブ input に委譲します |

### 列挙外値・無効値の扱い

`variant` は `filled` と `outline` のみを正規入力とします。`type` は `text`、`email`、`password`、`tel`、`url` のみを正規入力とします。`requiredIndicator` は `text`、`asterisk`、`none` のみを正規入力とします。

`type` に列挙外値を与えた場合、`ui-input` は開発時警告を出し、**`text` に正規化します**。正規化後は、**内部状態だけでなく `type` attribute にも canonical な値として `text` を再反映します**。したがって、DOM 上に列挙外値を残しません。利用者はこの正規化を**例外処理の代替**として使うべきではなく、正規値のみを渡さなければなりません（MUST）。

`variant` に列挙外値を与えた場合も、`ui-input` は開発時警告を出し、**`filled` に正規化します**。正規化後は、**内部状態だけでなく `variant` attribute にも canonical な値として `filled` を再反映します**。したがって、DOM 上に列挙外値を残しません。利用者は列挙外値による暗黙スタイル差に依存してはなりません（MUST NOT）。

`requiredIndicator` に列挙外値を与えた場合、`ui-input` は開発時警告を出し、`text` に正規化します。意味状態である `required` はこの正規化の影響を受けません。

正規化は単なる寛容動作ではなく、**公開契約の自己修復**です。canonicalization 後の DOM・property・内部状態は同一値へ収束させます。列挙外値を許容する拡張面は設けません。

### 責務範囲

責務範囲には、ラベルの描画、入力本体の描画、補助文言とエラー文言の切り替え、ネイティブ妥当性との同期、ElementInternals を通じたフォーム参加、キーボード入力とポインター入力の受理、および必要なアクセシビリティ属性の付与を含みます。

一方で、入力マスク、補完候補 UI、複数項目の整合チェック、非同期バリデーション、業務エラーコードからの文言生成、送信成功後の制御、数値専用入力の数理仕様は責務に含めません。

---

## 状態モデル

`ui-input` の主要状態は、見た目の種別ではなく、**現在値と初期値の関係**、**入力可能か**、**妥当か**、**外部エラーとネイティブエラーのどちらが優先されるか**、**フォーム参加するか**によって読み分けます。

### 1. 値モデル

`ui-input` は**自己保持型の単一行入力**です。`value` は現在値、`defaultValue` は初期値および reset 復元値です。ユーザー入力は現在値を更新しますが、`defaultValue` を更新しません。

初期化、reset、ブラウザ復元、programmatic update はそれぞれ異なる契約面です。利用者は、現在値の変更と初期値の変更を同一視してはなりません。

### 2. 基本状態

最小状態は、`label` を持ち、`variant="filled"`、`type="text"`、`disabled=false`、`readonly=false`、`error=false` の状態です。この状態では通常の単一行テキスト入力として振る舞います。`type` の列挙外値は状態として保持せず、`text` へ正規化したうえで canonical 値を attribute に反映します。

### 3. バリアント状態

`variant` は視覚的な入力領域の示し方を切り替えます。列挙外値は状態として保持せず、`filled` へ正規化したうえで canonical 値を attribute に反映します。

| `variant` 値 | 意味 | 想定用途 |
| --- | --- | --- |
| `filled` | 面で入力領域を示す | 通常の読書・執筆文脈 |
| `outline` | 線で入力領域を示す | より軽い境界表現が必要な文脈 |

`variant` は意味や妥当性を変更しません。入力の種類、エラー、必須性、フォーム参加は `variant` と独立です。

### 4. 補助情報状態

`helpText` が存在し、かつエラー状態でない場合、入力欄の近傍に補助文言を表示します。`aria-describedby` は補助文言を参照します。

補助文言は、プレースホルダーの代替ではありません。入力前後を問わず、入力規則や補足説明を安定して提示するために用います。

### 5. 外部強制エラー状態

`error=true` かつ `errorMessage` が空でない場合、`ui-input` は外部強制エラー状態へ移行します。`aria-invalid="true"` を付与し、エラーメッセージを表示し、`aria-describedby` はエラーメッセージを参照します。

このとき、`helpText` は表示しません。**補助説明とエラー通知を同時に読ませない**ことが契約です。

`error=true` かつ `errorMessage=''` は契約違反です。この場合、コンポーネントは開発時警告を出し、**外部強制エラー状態へは移行しません**。外部強制エラーの解消責務は利用者側にあります。ユーザー入力だけで自動解除することを前提にしません。

### 6. ネイティブバリデーション状態

`required`、`pattern`、`minlength`、`maxlength`、`type` によりネイティブ妥当性が不成立となる場合、`ui-input` は内部 input の妥当性を ElementInternals へ同期し、ネイティブエラー状態として扱います。

この状態では native invalid が成立し、エラー文言にはブラウザ由来の `validationMessage`、または内部既定文言を用います。ネイティブエラーは外部強制エラーとは別系統であり、値更新に応じて再評価されます。

外部強制エラーとネイティブエラーが競合する場合、**表示文言と custom error の優先順位は外部強制エラー側**とします。

### 7. 必須状態

`required=true` の場合、ネイティブ input に `required` を委譲します。これは**意味状態**です。必須表示の仕方は `requiredIndicator` が担います。

| `requiredIndicator` 値 | 表示契約 |
| --- | --- |
| `text` | ラベル近傍に文言で必須を示します |
| `asterisk` | ラベル近傍に記号で必須を示します |
| `none` | 追加表示を行いません |

利用者は、`required` を視覚表現の指定として扱ってはなりません。`required=true` であっても、表示形式は `requiredIndicator` によって決まります。

### 8. 読み取り専用状態

`readonly=true` の場合、入力値の編集はできませんが、フォーカス、選択、コピーは可能です。FormData には参加します。readonly は disabled と異なり、**編集不能だが存在し続ける状態**です。

| 観点 | `readonly=true` の契約 |
| --- | --- |
| フォーカス | 可能です |
| テキスト選択 | 可能です |
| FormData 参加 | 維持します |
| Enter 送信 | 関連フォームがあれば参加します |
| エラー表示 | 許容します |

### 9. 不活性状態

`disabled=true` の場合、内部 input は無効化され、ユーザー操作を受け付けません。ElementInternals へのフォーム値も `null` とし、FormData に参加しません。

さらに、disabled は**吸収状態**です。したがって、外部強制エラー、ネイティブエラー、`aria-invalid`、custom error、エラーメッセージ表示はすべて抑止します。無効化された入力に対してエラー状態を重ねて表現しません。

また、`fieldset[disabled]` 由来の無効化は `formDisabledCallback()` を通じて反映します。したがって、`ui-input` はホスト属性だけでなく、**フォーム文脈由来の disabled** も受理します。

### 10. フォーカス状態

ホストは `delegatesFocus: true` を有効にしており、ホストへのフォーカス要求は内部 input に委譲されます。フォーカス時は背景を白地へ戻し、`focus-visible` では明示的なフォーカスリングを表示します。

これは入力可能性の確認ではなく、**いま文字を入れる位置がどこか**を静かに明確化するための契約です。

### 11. フォーム状態

`ui-input` は Form Associated Custom Element です。`name` を持つ場合、現在値は FormData へ参加します。`disabled` の場合は参加しません。`readonly` の場合は参加します。

フォームリセット時は `defaultValue` へ戻ります。ブラウザ復元時は文字列状態を現在値として復元します。

---

## DOM / Accessibility

ルートは `:host` です。Shadow DOM 内部に、ラベル、単一のネイティブ `<input>`、補助文言またはエラー文言を持ちます。

```text
<ui-input>
  #shadow-root
    <label for="...">...</label>
    <input ... />
    [div.help-text]
    [div.error-message]
</ui-input>
```

### Accessibility 契約

アクセシビリティ上の重要点は次のとおりです。

- 対話主体はネイティブ `<input>` です。
- `label` は公開契約上必須です。
- アクセシブル名の正準ソースは、対応付けられた label 要素です。
- `hide-label` は視覚的非表示のみを意味し、アクセシブル名は失いません。
- `aria-label` は既定の契約面に含めません。label 要素が存在する通常構成では使用しません。
- `helpText` が表示される場合、`aria-describedby` は help 要素を参照します。
- エラー状態で `errorMessage` が表示される場合、`aria-describedby` は error 要素を参照します。
- disabled 状態では `aria-invalid` を立てません。
- エラーメッセージは `role="status"` と `aria-live="polite"` を持ちます。
- ラベルクリックは `for` 属性により内部 input へフォーカスを移します。

本コンポーネントで重要なのは、**ラベル、入力欄、説明文、エラー文の関係を DOM 上で一貫して維持すること**です。placeholder のみで意味を伝える構成や、`aria-label` のみへ依存する構成は採りません。

### ID 安定性契約

`ui-input` は、label / input / help / error の対応付けに用いる内部 ID をインスタンス単位で生成し、再描画では再生成しません。したがって、同一インスタンス内では `for`、`aria-describedby`、および関連要素間の参照関係は安定します。

利用者は、これらの ID 値そのものを外部契約として利用してはなりませんが、**再レンダーで関連付けが崩れないこと**には依存できます。

### イベント契約

`ui-input` は、内部 input 由来で観測される標準イベントと、ホストから明示的に再送出するイベントを持ちます。

| イベント | 観測面 | bubbles | composed | cancelable | `event.target` の扱い | 契約 |
| --- | --- | --- | --- | --- | --- | --- |
| `input` | host 境界で観測 | はい | はい | いいえ | host として扱います | ユーザー入力により現在値が変化したときに発火します |
| `change` | host 境界で観測 | はい | はい | いいえ | host として扱います | コミット時に発火します |
| `focus` | host 再送出 | いいえ | いいえ | いいえ | host です | 内部 input のフォーカス取得を host から観測可能にします |
| `blur` | host 再送出 | いいえ | いいえ | いいえ | host です | 内部 input のフォーカス喪失を host から観測可能にします |

`input` と `change` は**ユーザー入力由来の変更通知**です。`value` property の書き換えや `defaultValue` の更新は、これらのイベント発火を保証しません。`focus` と `blur` は Shadow DOM を越えて host を監視しやすくするための公開面です。利用者は、イベントの有無を値同期の唯一の根拠にしてはなりません。

---

## Visual Contract

`ui-input` の視覚契約は、入力待機時に領域を静かに示し、入力中は白地へ戻して集中を妨げないことにあります。

### 情報順位

- ラベルは入力欄の意味を先に提示します。
- 入力欄は背景または境界で入力可能性を示します。
- `helpText` は補助情報として控えめに表示します。
- `errorMessage` は最優先の状態通知として補助情報を置き換えます。

本文近傍では、入力欄が常時強く発光したり、過剰な輪郭で主張したりしてはなりません。読書の主役は本文であり、入力欄は**必要なときだけ明確になる**べきです。

### 視覚仕様

- `filled` は淡い背景面で入力領域を示します。
- `outline` は白地と境界線で入力領域を示します。
- hover では境界線を与え、入力可能領域のエッジを明確にします。
- focus では白地へ戻し、視線を内容入力へ集中させます。
- error では背景と境界線の両方を変え、色以外の差分も伴わせます。
- disabled では不透明度低下と muted な前景色で操作不能を示します。
- readonly では編集不能だが読取可能な状態として、disabled より弱い静的表現に保ちます。

### ラベルの扱い

ラベルは input の外に置かれ、入力欄と 1 対 1 で結び付きます。`required=true` は意味状態であり、表示形式は `requiredIndicator` により決まります。したがって、表示ラベルへ常に `（必須）` を固定付加することは契約に含めません。

`hideLabel` は視覚的に見えなくするだけで、DOM から削除しません。これは、視覚上の簡潔さを保ちながら、アクセシブル名の契約を崩さないためです。

### フォーカス表示

フォーカスリングは `outline` と `outline-offset` により描画します。`box-shadow` ベースのフォーカス表現には依存しません。`focus-visible` に限定して表示し、ポインター操作時の不要なノイズを抑えます。

### 参照トークン

本コンポーネントは、主として次のトークンに依存します。

| 用途 | トークン |
| --- | --- |
| デフォルト背景 | `--bg-fill-muted` |
| フォーカス背景 | `--bg-default` |
| エラー背景 | `--bg-danger-subtle` |
| 既定文字色 | `--fg-default` |
| 補助文字色 | `--fg-muted` |
| 無効前景色 | `--fg-subtle` |
| エラー文字色 | `--fg-danger` |
| 既定境界線 | `--border-default` |
| エラー境界線 | `--border-danger` |
| 通常境界線幅 | `--border-width` |
| 強調境界線幅 | `--border-width-thick` |
| 高さ | `--control-height-md` |
| 角丸 | `--radius-md` |
| スペーシング | `--space-1` / `--space-2` |
| 文字サイズ | `--text-sm` / `--text-base` |
| フォントウェイト | `--font-medium` |
| 行間 | `--line-height-normal` |
| 遷移時間 | `--duration-fast` |
| イージング | `--ease-out` |
| フォーカスリング | `--focus-ring-width` / `--focus-ring-color` / `--focus-ring-offset` / `--animation-focus` |
| 無効時不透明度 | `--opacity-disabled` |

---

## 環境別の振る舞い

### Reduced Motion

`prefers-reduced-motion: reduce` 環境では、input の transition 時間を極小化します。背景色や境界線の変化は保持しますが、アニメーション性には依存しません。

### Forced Colors

`forced-colors: active` 環境では、`Canvas`、`CanvasText`、`GrayText` などのシステムカラーを優先します。エラー状態も独自色ではなく、境界線の太さとシステム色で表現します。focus-visible は高コントラスト輪郭に置き換えます。

### Print

印刷時は背景塗りを除去し、透明背景と実線境界へ切り替えます。error は境界線色で残し、disabled / readonly は不透明度差で表現します。

### Dark Mode

明示的な `prefers-color-scheme` 分岐は持ちません。ダークモード適応はトークン差し替えで成立させます。したがって、暗色環境での視認性はコンポーネント固有の別実装ではなく、テーマトークン側の責務です。

---

## 関連契約

### フォーム関連付け契約

`ui-input` は Form Associated Custom Element として実装されています。したがって、Shadow DOM 内部の input であっても、カスタム要素自体がフォーム参加主体になります。

| 条件 | 振る舞い |
| --- | --- |
| `name` あり、`disabled=false` | FormData に現在値を含めます |
| `disabled=true` | FormData に参加しません |
| `readonly=true` | FormData に参加します |
| `formResetCallback()` | `defaultValue` へ戻し、エラー状態も解除します |
| `formDisabledCallback(true)` | fieldset 由来の disabled を反映します |
| `formStateRestoreCallback(string)` | ブラウザ復元値を現在値として取り込みます |

利用者は、フォーム参加の基準を内部 input ではなく `ui-input` に対して考えます。

### 初期値および reset 契約

`ui-input` の現在値は `value` property で操作できます。`defaultValue` は初期値および reset 復元値です。**フォーム reset 時の正準復元元は `defaultValue`** です。

利用者は、フォーム reset 後に戻したい既定値を declarative に持たせる場合、`default-value` attribute、または `defaultValue` property で明示します。`value` property は現在値の更新面であり、初期値定義面とは分離します。

### 妥当性同期契約

`ui-input` は、内部 input のネイティブ妥当性と、`error` / `errorMessage` による外部強制エラーを ElementInternals へ同期します。外部強制エラーは、**`error=true` かつ `errorMessage` が空でない場合にのみ成立**します。

| 条件 | 妥当性 API 上の扱い |
| --- | --- |
| `disabled=true` | valid として扱い、エラー状態も抑止します |
| `error=true` かつ `errorMessage` あり | custom error を設定し invalid として扱います |
| `error=true` かつ `errorMessage` なし | 契約違反として警告し、外部強制エラーは成立させません |
| ネイティブ妥当性エラーあり | ElementInternals へ同期し invalid として扱います |
| 強制エラーなし、ネイティブ妥当性 OK | valid として扱います |

この契約により、利用者は `checkValidity()` と `reportValidity()` を `ui-input` に対して呼び出せます。外部強制エラーを使う場合、`errorMessage` を省略してはなりません（MUST NOT）。

### 妥当性 API の公開面

`checkValidity()` は現在状態に基づいて妥当性真偽を返します。`reportValidity()` は同じ評価を行い、必要に応じてブラウザ標準の妥当性報告を委譲します。

利用者は、これらのメソッドを**視覚エラー確認**ではなく、**フォーム妥当性確認**の API として扱います。外部強制エラーを成立させたい場合は、`error` と `errorMessage` を組で渡します。

### Enter キーとフォーム送信契約

内部 input で Enter キーが押され、IME 変換中でなく、関連フォームが存在し、`disabled=false` である場合、`requestSubmit()` を実行します。readonly はこの送信経路を抑止しません。これは、単一行 input とフォーム送信の標準的期待に寄せるための契約です。

ただし、送信の成否、送信先、送信後の状態遷移は上位レイヤの責務です。

### スタイル拡張契約

`ui-input` は `::part(...)` を公開していません。外部スタイル拡張は CSS Custom Properties を通じたテーマ調整を基本とします。内部 class 名、内部 DOM 構造、個別状態 class への依存は公開契約に含みません。

利用者は `.label`、`.help-text`、`.error-message`、`input.error` などの Shadow DOM 内部識別子に依存してはなりません（MUST NOT）。

### 開発時警告契約

開発時には少なくとも次のケースで警告します。

- `label` が空である場合
- `type` が非対応値である場合
- `variant` が非対応値である場合
- `requiredIndicator` が非対応値である場合
- `error=true` にもかかわらず `errorMessage` が空である場合

これらは実行時停止ではなく、品質低下を検知するための補助です。とくに `type`、`variant`、`requiredIndicator` の列挙外値は、警告の後に canonical 値へ正規化し、その canonical 値を対応する attribute に再反映します。本番品質は Storybook、レビュー、テストで補完しなければなりません。

---

## 境界条件

### 1. ラベルあり・通常入力

`label` を持つ通常入力は、最小の正規構成です。placeholder がなくても成立します。

### 2. ラベル非表示

`hideLabel=true` の場合でも、ラベルは DOM 上に残り、対応付けも維持します。視覚的に簡潔に見せたい文脈でのみ使用します。

### 3. 補助文言あり

`helpText` がある場合、非エラー時にのみ表示します。`aria-describedby` は help 要素のみを参照します。

### 4. 外部強制エラーと補助文言の併存

`error=true` かつ `errorMessage` が有効な場合、`helpText` が存在しても表示しません。エラー通知を優先します。

### 5. 強制エラーだが文言なし

`error=true` かつ `errorMessage=''` は契約違反です。コンポーネントは開発時警告を出し、外部強制エラー状態へは入りません。したがって、`aria-invalid`、エラー表示、custom error のいずれにも外部エラーとして依存してはなりません。

### 6. 非対応 type

`type="number"`、`type="date"`、`type="time"`、`type="file"`、`type="checkbox"`、`type="radio"`、`type="search"` などを与えた場合、コンポーネントは警告を出したうえで `text` に正規化し、`type` attribute も `text` へ書き戻します。専用コンポーネントで扱うべき入力種別を `ui-input` に押し込まないことが前提です。

### 7. 列挙外 `variant`

`variant` に列挙外値を与えた場合、コンポーネントは警告を出したうえで `filled` に正規化し、`variant` attribute も `filled` へ書き戻します。したがって、検査時に DOM 上へ列挙外値が残ることを前提にしてはなりません。

### 8. `disabled` とエラー状態

`disabled=true` の場合、FormData に値を含めません。さらに、外部強制エラー、ネイティブエラー、`aria-invalid`、エラー表示はすべて抑止します。利用者は、disabled と error の同時表示を前提にしてはなりません。

### 9. `readonly` の境界

`readonly=true` の場合、FormData には値を含め、フォーカスと選択を許可し、Enter による関連フォーム送信も許容します。`readonly` と `disabled` を同義として扱ってはなりません。

### 10. `minlength` / `maxlength` の境界

プログラム的な値設定ではブラウザが `tooShort` / `tooLong` を自動検知しない場合があるため、実装は文字長を手動確認します。したがって、property 更新でも下限・上限の境界判定は契約として維持されます。

### 11. ラベル欠落

`label=''` は契約違反です。描画継続の有無にかかわらず、アクセシブル名の品質は保証しません。

### 12. フォーム外での単体使用

フォームに属さない `ui-input` も単体入力欄として描画できます。ただし、FormData 参加や Enter 送信は成立しません。

### 13. `required` と表示形式

`required=true` は意味状態です。必須表示の仕方は `requiredIndicator` により決まります。利用者は `required=true` であることと、文言として `（必須）` が表示されることを同一視してはなりません。

---

## Storybook 契約

各 Story は見本ではなく、**公開契約の確認点**として扱います。将来変更時には、次の契約を維持します。

| Story | 固定する契約 |
| --- | --- |
| `Default` | `label`、`type`、label 由来のアクセシブル名の基本契約が成立すること |
| `WithHelpText` | 補助文言表示時に `aria-describedby` が help 要素を参照すること |
| `ExternalErrorState` | 外部強制エラーで `aria-invalid`、エラー文言表示、help 非表示が成立すること |
| `NativeValidationState` | ネイティブ妥当性エラーが invalid として成立すること |
| `HiddenLabel` | `hide-label` 使用時も label 由来のアクセシブル名が失われないこと |
| `Disabled` | disabled 状態で内部 input が不活性になり、エラー状態も吸収すること |
| `Readonly` | readonly 状態で編集不可だが選択・FormData 参加・Enter 送信が維持されること |
| `RequiredMeaningAndPresentation` | `required` の意味状態と `requiredIndicator` の表示状態が分離されていること |
| `SupportedTypes` | サポート対象 type 群のみが描画されること |
| `UnsupportedTypeCanonicalReflection` | 非対応 type が `text` へ正規化され、attribute にも canonical 値を書き戻すこと |
| `VariantCanonicalReflection` | 列挙外 `variant` を `filled` へ正規化し、attribute にも canonical 値を書き戻すこと |
| `FocusState` | 公開 `focus()` が内部 input に到達すること |
| `FormIntegration` | 複数 `ui-input` がフォーム部品として共存できること |
| `DefaultValueReset` | reset 時の復元元が `defaultValue` であること |
| `ProgrammaticUpdateNoUserEvent` | property 更新がユーザー入力イベントの代替にならないこと |
| `FormDataParticipation` | FormData へ現在値が反映されること |
| `StableInternalIds` | 再描画で label / help / error の参照関係が崩れないこと |
| `ErrorWithoutMessage` | `error=true` かつ空の `errorMessage` を契約違反として警告し、外部強制エラーを成立させないこと |
| `DisabledAbsorbsError` | disabled が外部エラー、ネイティブエラー、`aria-invalid`、エラー表示を抑止すること |
| `MinMaxLengthBoundary` | 文字数境界で妥当性が切り替わること |
| `VariantStateMatrix` | 主要状態の組み合わせが共存できること |
| `DarkMode` | トークン差し替えにより暗色背景上でも可視性が保たれること |
| `LabelClickFocusTransfer` | ラベルクリックで内部 input へフォーカス移譲されること |
| `EnterSubmitFromInput` | Enter キーで関連フォーム送信へ橋渡しできること |
| `FormDataDisabledReadonlyBoundary` | disabled / readonly の FormData 参加差分が維持されること |

---

## 補足

`ui-input` の要点は、文字列を保持できること自体ではありません。**ラベル、値モデル、妥当性、補助説明、エラー、フォーム参加を一体として扱い、入力の意味を崩さないこと**にあります。

したがって、今後の変更でも次の 7 点は崩さない方がよいです。

1. 実体は常に単一のネイティブ `<input>` であること。
2. `label` を必須契約として維持し、アクセシブル名の正準ソースを label 要素に固定すること。
3. `value` と `defaultValue` を分離し、現在値と初期値を混同しないこと。
4. `helpText` と `errorMessage` を同時表示しないこと。
5. 外部強制エラーとネイティブエラーを別系統として扱うこと。
6. `disabled` を吸収状態とし、エラー状態を重ねないこと。
7. Form Associated Custom Element としての妥当性同期と FormData 参加を維持すること。

---

## 将来拡張の原則

本節は現行実装の公開契約ではなく、将来追加を検討する場合の設計指針です。追加機能は input を多機能化するためではなく、**自己保持型の text-like 単一行入力**という中心線を崩さずに、入力意図・説明・操作効率を補強する場合に限って採用します。

### 新規で追加を検討する価値がある機能

本コンポーネントに新規で追加する価値がある機能は存在します。ただし、価値が高いのは機能数を増やすことではなく、**値モデル・アクセシビリティ・妥当性契約を壊さずに入力体験を補強すること**です。

#### 最優先で検討する価値がある機能

1. `inputmode` / `enterkeyhint` / `autocapitalize` / `spellcheck` の pass-through
2. 外部 `aria-describedby` 連携面の公開

#### 条件付きで検討する価値がある機能

1. `autocomplete` 周辺の軽量な入力補助属性の追加
2. `prefix` / `suffix` / 固定装飾要素

#### 追加しない方がよい機能

- clearable
- パスワード表示切替
- search 専用挙動
- combobox / 候補パネル
- 数値入力仕様
- マスク入力

これらは `ui-input` の中心線を変えやすいため、追加する場合は派生コンポーネントまたは別契約として扱います。

### 拡張判断の前提

新しい API や状態を追加する場合は、次の順で評価します。

1. **値モデルを変えないか**  
   `value` / `defaultValue` の分離、文字列値、reset 契約を壊さないことを優先します。
2. **アクセシビリティの正準ソースを増やさないか**  
   アクセシブル名は label、説明は `aria-describedby` 系という責務分離を崩しません。
3. **エラーモデルを混ぜないか**  
   外部強制エラーとネイティブエラーの二系統を増やしません。
4. **状態機械を肥大化させないか**  
   単一行入力の状態空間に閉じる拡張だけを許容します。
5. **派生コンポーネントで吸収すべき責務ではないか**  
   意味が変わる場合は `ui-input` に入れず、別契約へ切り出します。

### 最優先で検討する価値がある拡張

#### 1. `inputmode` / `enterkeyhint` / `autocapitalize` / `spellcheck` の pass-through

モバイルや補助的入力環境では、キーボード種別、Enter キー表示、自動大文字化、スペルチェックを制御する属性の価値が高いです。これらは見た目の追加ではなく、**入力意図と入力補助の明示**です。

この拡張を採用する場合、次を満たします。

- 内部 input へそのまま委譲します。
- `type` と矛盾する独自規則を追加しません。
- 値モデル、妥当性モデル、イベント契約を変更しません。
- スペルチェックや大文字化の既定値をコンポーネント側で暗黙設定しません。
- `variant` や visual state に責務を混在させません。

#### 2. 外部 `aria-describedby` 連携面の公開

現状の `aria-describedby` は内部 help / error 切り替え専用です。複合フォームやフィールドグループでの利用を考えると、**説明の外部連携面**は持つ価値があります。

この拡張を採用する場合、次を満たします。

- 公開面は `describedBy` のような **説明専用 API** とします。
- アクセシブル名の責務へ侵入させません。label 契約とは分離します。
- ID 結合順は **外部説明 ID → 内部 help / error ID** の順で固定します。
- `helpText` と `errorMessage` の相互排他契約は維持します。
- disabled 時は内部 error 説明を抑止し、外部説明だけを残すかどうかを明示します。

### 条件付きで検討する価値がある拡張

#### 3. `autocomplete` 周辺の入力補助属性の拡張

`autocomplete` 以外にも、入力補助のための軽量 pass-through を増やす余地はあります。ただし、追加対象は **ネイティブ input の意味をそのまま通す属性**に限ります。ここでの拡張は、最優先機能として整理した `inputmode` / `enterkeyhint` / `autocapitalize` / `spellcheck` を補完するものとして扱います。

採用してよい属性の条件は次のとおりです。

- 値の型を変えません。
- 妥当性評価規則を独自に増やしません。
- 新しい視覚状態を要求しません。
- HTMLInputElement の既存意味をそのまま流用できます。

#### 4. `prefix` / `suffix` / 固定装飾要素

入力前後に固定記号や軽量装飾を置きたい場合の拡張は検討価値があります。しかし、これは DOM とアクセシビリティの複雑化を招きやすいため、無条件には追加しません。

この拡張を採用する場合、次を満たします。

- 装飾要素は値の一部として扱いません。
- label、補助文言、エラー文言との読み順を崩しません。
- アクセシブル名や説明の計算へ混入させません。
- フォーカス移動、選択範囲、FormData 参加に影響を与えません。

### `ui-input` に入れず、派生コンポーネントへ切り出す基準

次のいずれかに該当する場合は、`ui-input` の拡張ではなく、派生コンポーネントまたは別契約へ切り出します。

#### 1. 値の意味が変わる場合

- 数値入力
- 日付入力
- 検索専用入力
- マスク入力
- トークン入力

これらは文字列一様では扱えず、`value` / `defaultValue` / 妥当性 / 復元契約を変質させます。

#### 2. 追加の状態機械を要求する場合

- clearable
- パスワード表示切替
- 非同期候補表示
- IME や補完候補と連動する入力補助 UI

これらは単一行 input の基本状態に加えて、固有の操作状態を必要とします。

#### 3. Enter 送信やフォーム参加の意味を変える場合

- 検索送信専用入力
- コマンドパレット入力
- サジェスト選択を伴う入力

これらは Enter キー契約を変えるため、`ui-input` に混在させません。

#### 4. 独自のアクセシビリティ契約を要求する場合

- combobox
- listbox 連携入力
- 候補パネル付き入力

これらは label / describedby だけでは完結せず、別の ARIA パターンを前提にします。

### 採用しない方針

次の方向は、input の責務を曖昧にしやすいため採りません。

- `textarea` 相当の複数行入力責務を混在させること
- `number`、`date`、`file`、`search`、`checkbox`、`radio` を同じ契約面へ混在させること
- 業務エラー文言生成や API 応答解釈を内蔵すること
- 複数フィールド整合検証を単体 input に持ち込むこと
- 候補パネル、ポップオーバー、サジェスト一覧を `ui-input` 自体の責務に含めること
- 値の整形・正規化・マスキングを暗黙に行うこと

### 採用時の実装原則

将来拡張を実装する場合でも、次の原則は維持します。

- canonicalization 後の DOM・property・内部状態を同一値へ収束させます。
- label をアクセシブル名の正準ソースとして維持します。
- `value` と `defaultValue` の分離を崩しません。
- disabled を吸収状態として維持します。
- Storybook 契約、開発時警告契約、未対応事項の節を同時に更新します。

---

## 現行実装で未対応または未強制の事項

本節は、現行の `input.ts` および `input.stories.ts` を基準として、**契約書内で望ましいと整理できるが、現時点では未実装、未強制、または未整合である事項**を整理するものです。

### 1. `label` 必須の実行時強制

公開契約上、`label` は必須です。しかし現行実装は、`label` 欠落時にコンソールエラーを出すのみで、描画停止や例外送出は行いません。したがって、**ラベル必須は公開契約としては強いが、実行時強制は弱い**状態です。

### 2. `defaultValue` の独立公開

本契約では、`value` を現在値、`defaultValue` を初期値および reset 復元値として分離します。しかし現行実装は reset 復元元として `value` attribute を参照しており、`defaultValue` を独立公開していません。

したがって、**現在値と初期値を分離した値モデルは未実装**です。

### 3. `variant` 列挙値の実行時正規化

本契約では、`variant` の列挙外値は契約違反として扱い、開発時警告の上で `filled` に正規化し、canonical 値を `variant` attribute にも再反映する方針を採ります。しかし現行実装は `variant` の列挙外値を明示的には正規化せず、`outline` にだけ明示スタイルがあり、それ以外は事実上 `filled` に近い振る舞いになります。

したがって、**`variant` の列挙外値を `filled` へ正規化し、attribute に canonical 値を反映する実行時保証は未実装**です。

### 4. `type` の対象範囲の縮退

本契約では、`type` の対象を `text`、`email`、`password`、`tel`、`url` に限定し、`number` を本契約から外します。しかし現行実装および Storybook には `number` が含まれています。

したがって、**text-like input に対象範囲を絞る方針は未反映**です。

### 5. `requiredIndicator` による表示分離

本契約では、`required` を意味状態、`requiredIndicator` を表示状態として分離し、`requiredIndicator` の列挙値は `text` / `asterisk` / `none` とします。しかし現行実装は `requiredIndicator` 自体を持たず、可視ラベルへ `（必須）` を直接連結しており、表示形式を独立して切り替えられません。

したがって、**required の意味と表示を分離した契約、および `requiredIndicator` の公開入力・正規化・警告契約は未実装**です。

### 6. disabled の吸収状態化

本契約では、`disabled=true` の場合、外部強制エラー、ネイティブエラー、`aria-invalid`、custom error、エラー表示をすべて抑止する方針を採ります。しかし現行実装は、妥当性 API 上は valid に戻しても、外部 `error` に由来する視覚状態や `aria-invalid` が残り得ます。

したがって、**disabled を吸収状態とする保証は未実装**です。

### 7. アクセシブル名の正準ソースの一本化

本契約では、アクセシブル名の正準ソースを label 要素に固定し、通常構成では `aria-label` を使いません。しかし現行実装は対応付けられた label と `aria-label` の両方を用いています。

したがって、**label 一系統へ寄せたアクセシブル名契約は未反映**です。

### 8. `error=true` と `errorMessage` の同時必須性

本契約では、`error=true` の場合は `errorMessage` を必須とし、空文字列は契約違反として警告したうえで外部強制エラー状態を成立させない方針を採ります。しかし現行実装は `error=true` かつ `errorMessage=''` を許容し、`aria-invalid` を立てたまま説明文なしで描画できます。

したがって、**`error=true` と `errorMessage` の同時必須性を実行時に強制する保証は未実装**です。

### 9. 外部説明要素との連携面

現行実装の `aria-describedby` は内部 help / error 専用です。外部説明ブロックやフォームグループ要素と結びたい場合の pass-through は未対応です。

したがって、**単体で閉じた input 契約としては明確ですが、複合フォームでの拡張面は未公開**です。

### 10. `inputmode` などモバイル入力ヒント

現行実装は `autocomplete` は持ちますが、`inputmode`、`enterkeyhint`、`autocapitalize` は未対応です。とくにモバイル中心の入力では操作効率に影響します。

### 11. `::part(...)` の未公開

現行実装は CSS Custom Properties によるテーマ変更を前提とし、part を公開していません。これは内部構造安定性には寄与しますが、局所的な外観調整面は狭いです。

### 12. Storybook メタデータおよび play テストの旧契約残存

現行の `input.stories.ts` には、改訂後の契約とずれている記述が残っています。具体的には、`type` の選択肢に `number` を含める controls、`defaultValue` と `requiredIndicator` を持たない argTypes、`aria-label` の存在を前提にする play テスト、`required=true` のときに表示ラベルが必ず `（必須）` になることを期待する検証、`AllTypes` に `number` を含める Story などです。

したがって、**Storybook の controls・docs・play テストは新契約へ未追随**です。

### 13. 実装内 JSDoc / 使用例の旧契約残存

現行の `input.ts` 先頭 JSDoc と使用例には、改訂後の契約とずれている記述が残っています。具体的には、`type` に `number` を含む説明、`hideLabel` を `aria-label` 反映と結び付ける説明、`defaultValue` や `requiredIndicator` を持たない API 説明などです。

したがって、**実装ソースに付属する開発者向け契約説明も新契約へ未追随**です。

### 14. Storybook における警告自体の自動検証

`WithoutLabel` や `UnsupportedType` は契約違反例を示しますが、コンソール警告そのものを Storybook テストで厳密に検証しているわけではありません。したがって、**警告発生の有無そのものは契約としてまだ弱い**です。

### 15. 本節の扱い

本節に記載した事項は、現行公開契約として利用者が依存してよいものではありません。これらを採用または厳密化する場合は、実装、Storybook、契約書の 3 点を同時に更新し、未整合状態を残したまま公開契約へ昇格させません。

