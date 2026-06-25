# Input

## 概要

本書は、`ui-input`の公開契約、状態モデル、アクセシビリティ、および視覚契約を整理するものです。

`ui-input`は、単に文字列を受け取るフォーム部品ではありません。Rouaultにおいては、**入力可能領域を静かに明示しつつ、読書や執筆の集中を不必要に遮らないこと**、**エラーや補助情報を入力位置の近傍で解決すること**、**Shadow DOM配下でもフォーム送信と妥当性判定へ正しく参加すること**を公開契約として固定します。

また、`label`、`type`、`helpText`、`errorMessage`、`required`、`disabled`、`readonly`は、それぞれ独立の装飾指定ではなく、**意味・状態・フォーム参加・アクセシビリティ**に関わる契約です。見た目の入力欄を描画することではなく、**入力の意味と境界条件を安定して扱えること**を優先します。

Rouaultにおけるinputは、読書の合間に現れる操作部品であり、本文より強く主張してはなりません。そのため本コンポーネントの契約は、**入力可能性の明示**と、**「没入して読む」ことのできるデザイン**の維持を両立する方向で定義します。

---

## 適用範囲

## 適用範囲

本書は、`ui-input`の次の事項を対象とします。

- 公開契約
- 状態モデル
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 関連契約
- 境界条件
- Storybook契約
- 現行実装で未対応または未強制の事項

一方で、本書は次の事項を扱いません。

- 複数フィールドをまたぐフォーム全体の検証設計
- どの画面でどの入力項目を必須にするかというプロダクト判断
- エラーメッセージ文言の業務設計
- サーバーサイド検証やAPI応答の解釈
- `textarea`、`search`、`select`、`checkbox`、`radio`、`date`など別系統コントロールの仕様
- 入力補完候補UI、候補パネル、combobox、マスク入力、clearable、パスワード表示切替など、入力意味または状態機械を拡張する上位機能
- `prefix` / `suffix`のような固定装飾要素を含む複合入力レイアウト
- 数値入力仕様、検索専用挙動、独自ARIAパターンを伴う入力

これらは上位レイヤ、派生コンポーネント、または別コンポーネントの責務です。

なお、`ui-input`に新しい入力補助属性や説明連携面を追加する場合でも、**自己保持型のtext-like単一行入力**という中心線を崩してはなりません。値モデル、アクセシブル名の正準ソース、エラーモデル、状態機械の単純さを維持できる範囲のみを本書の対象とします。

---

## 本書の記法

本書では、次の3層を区別して記述します。

- **公開契約**: 利用者が依存してよい外部仕様です。
- **既定動作**: 現行の推奨挙動です。中核契約を崩さない範囲で変更余地があります。
- **実装選択**: 実装方法の一例です。公開契約には含みません。

とくに、内部IDの生成方法、attribute書き戻しの有無、live regionの細かな設定値などは、明示しない限り実装選択として扱います。

---

## 公開契約

`ui-input`は、`label`、`hideLabel`、`variant`、`type`、`name`、`placeholder`、`value`、`defaultValue`、`helpText`、`errorMessage`、`error`、`disabled`、`readonly`、`required`、`requiredIndicator`、`pattern`、`minlength`、`maxlength`、`autocomplete`、`inputmode`、`enterkeyhint`、`autocapitalize`、`spellcheck`、`describedBy`を公開入力として扱います。スロットは公開しません。利用者はShadow DOM内部の`<input>`を直接契約対象とせず、`ui-input`を契約単位として扱います。

ここで`inputmode`、`enterkeyhint`、`autocapitalize`、`spellcheck`は、**入力意図と入力補助をネイティブinputへそのまま委譲する軽量pass-through属性**です。これらは値モデル、妥当性モデル、イベント契約を変更しません。`describedBy`は、内部`helpText` / `errorMessage`とは別に、外部説明要素との関連付けを可能にする **説明専用API** です。アクセシブル名の責務には侵入しません。

`label`は公開契約上必須です。視覚的にラベルを隠す場合でも、`hide-label`を用いて**対応付けられたlabel要素を維持したまま視覚だけを隠す**運用を行います。アクセシブル名の正準ソースはlabel要素であり、ラベルなし運用や`aria-label`依存運用には寄せません。

`value`は**現在値**です。`defaultValue`は**初期値およびreset復元値**です。両者は異なる役割を持ち、`value`の更新は`defaultValue`を変更しません。`ui-input`は**自己保持型の単一行入力**であり、通常のユーザー入力では内部状態として現在値を更新します。

`variant`の既定値は`filled`です。`type`の既定値は`text`です。`error`は**外部から与える強制エラー状態**であり、`errorMessage`と組で扱います。`error=true`の場合、`errorMessage`には**空でない文言**を与えなければなりません（MUST）。`error=true`かつ`errorMessage=''`は契約違反です。この場合、コンポーネントは開発時警告を出し、**外部強制エラー状態としては扱いません**。ネイティブバリデーション起因のinvalidはこれとは別系統です。

`helpText`と`errorMessage`は同時表示しません。エラー状態ではエラーメッセージを優先し、補助テキストは表示から除外します。これは、入力近傍で**いま最も重要な情報を一つだけ読ませる**ための契約です。

`required`は**意味状態**です。`requiredIndicator`は**視覚表現**です。必須性の意味と表示は分離し、`required=true`であっても表示方法は`requiredIndicator`により切り替えます。

`ui-input`はtext-likeな単一行入力のみを対象とします。`number`は本契約に含めません。数値入力を正式に扱う場合は、`min` / `max` / `step` / `valueAsNumber`を備えた別契約、または別コンポーネントとして定義します。

### 入力契約

### 入力契約

| 名前                | 種別                                        | 必須   | 内容                 | 契約                                                                                                                                        |
| ------------------- | ------------------------------------------- | ------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `label`             | property / attribute                        | はい   | 入力項目のラベル     | 空文字列は契約違反です。`hide-label`使用時も必須です                                                                                       |
| `hideLabel`         | property / attribute (`hide-label`)         | いいえ | ラベルの視覚的非表示 | 対応付けられたlabel要素は維持します                                                                                                       |
| `variant`           | property / attribute                        | いいえ | 外観種別             | `filled` / `outline`。既定値は`filled`です。列挙外値は契約違反であり、`filled`に正規化します                                             |
| `type`              | property / attribute                        | いいえ | ネイティブ入力種別   | `text` / `email` / `password` / `tel` / `url`。既定値は`text`です。列挙外値は契約違反であり、`text`に正規化します                        |
| `name`              | property / attribute                        | いいえ | フォーム送信名       | FormData参加時のキーです                                                                                                                   |
| `placeholder`       | property / attribute                        | いいえ | ヒント文字列         | ラベルの代替にはしません                                                                                                                    |
| `value`             | property                                    | いいえ | 現在値               | 文字列として扱います                                                                                                                        |
| `defaultValue`      | property / attribute (`default-value`)      | いいえ | 初期値               | reset時の復元元です                                                                                                                        |
| `helpText`          | property / attribute (`help-text`)          | いいえ | 補助説明             | 非エラー時のみ表示します                                                                                                                    |
| `errorMessage`      | property / attribute (`error-message`)      | いいえ | エラー文言           | `error=true`の場合は空でない文言が必須です                                                                                                 |
| `error`             | property / attribute                        | いいえ | 強制エラー状態       | `true`の場合、`errorMessage`と組で外部エラー状態を構成します。`errorMessage`が空の場合は契約違反として警告し、外部エラー状態に入りません |
| `disabled`          | property / attribute                        | いいえ | 不活性状態           | `true`の場合、フォーム値へ参加しません                                                                                                     |
| `readonly`          | property / attribute                        | いいえ | 読み取り専用         | フォーカス、選択、コピーは可能です                                                                                                          |
| `required`          | property / attribute                        | いいえ | 必須入力             | ネイティブ妥当性へ参加します                                                                                                                |
| `requiredIndicator` | property / attribute (`required-indicator`) | いいえ | 必須表示方式         | `text` / `asterisk` / `none`。既定値は`text`です                                                                                          |
| `pattern`           | property / attribute                        | いいえ | 正規表現パターン     | ネイティブ妥当性へ参加します                                                                                                                |
| `minlength`         | property / attribute                        | いいえ | 最小文字数           | 数値で指定します                                                                                                                            |
| `maxlength`         | property / attribute                        | いいえ | 最大文字数           | 数値で指定します                                                                                                                            |
| `autocomplete`      | property / attribute                        | いいえ | 自動補完ヒント       | ネイティブinputへ委譲します                                                                                                               |
| `inputmode`         | property / attribute                        | いいえ | 入力モードヒント     | ネイティブinputへそのまま委譲します。値モデル、妥当性モデル、イベント契約を変更しません                                                   |
| `enterkeyhint`      | property / attribute                        | いいえ | Enterキー表示ヒント | ネイティブinputへそのまま委譲します。送信契約そのものは変更しません                                                                       |
| `autocapitalize`    | property / attribute                        | いいえ | 自動大文字化ヒント   | ネイティブinputへそのまま委譲します。コンポーネント側で既定値を暗黙設定しません                                                           |
| `spellcheck`        | property / attribute                        | いいえ | スペルチェック指定   | ネイティブinputへそのまま委譲します。コンポーネント側で既定値を暗黙設定しません                                                           |
| `describedBy`       | property / attribute (`described-by`)       | いいえ | 外部説明要素ID群   | 説明専用APIです。アクセシブル名には関与しません。内部`helpText` / `errorMessage`と結合して`aria-describedby`を構成できます            |

### スロット契約

`ui-input`は公開スロットを持ちません。入力UIの構造はコンポーネント内部で固定し、利用側がラベル、エラー文言、補助文言、入力本体を自由配置する設計は採りません。

これは、**ラベルと入力欄の対応付け**、**`aria-describedby`の切り替え**、**エラー時の一貫したレイアウト**を崩さないためです。

### 公開メソッド

`ui-input`は、内部inputをShadow DOMの外から扱うため、次の公開メソッドを持ちます。

| 名前               | 種別   | 契約                                                     |
| ------------------ | ------ | -------------------------------------------------------- |
| `focus(options?)`  | method | 内部inputにフォーカスを委譲します                      |
| `blur()`           | method | 内部inputからフォーカスを外します                      |
| `select()`         | method | 内部inputのテキスト選択を行います                      |
| `checkValidity()`  | method | 現在値と設定値を基に妥当性を評価します                   |
| `reportValidity()` | method | 妥当性を評価し、必要に応じてブラウザ標準の報告を行います |

これらはShadow DOM内部実装を利用側に露出させないための公開面です。利用者は内部の`<input>`を直接探索せず、これらの公開メソッドを使用します。

### 公開面の方針

`ui-input`は **narrow façade** を採ります。したがって、HTMLInputElement互換APIを無制限には公開しません。一方で、フォーム統合と妥当性確認に必要な最小限の観測面は公開契約に含めます。

既定の公開面は、少なくとも次を中心に構成します。

- 現在値としての`value`
- 初期値およびreset復元値としての`defaultValue`
- フォーカスおよび選択のための公開メソッド
- 妥当性確認のための`checkValidity()` / `reportValidity()`
- label / help / errorの表示契約
- `error` / `errorMessage`による外部強制エラーの指定面

一方で、`valueAsNumber`のように本コンポーネントの対象外である型依存APIや、内部実装を強く露出させるAPIは既定の契約面に含めません。

また、`validity`、`validationMessage`、`setCustomValidity()`などの妥当性関連APIについては、**現時点では包括公開を前提にしません**。ただし、フォーム統合や上位レイヤとの接続で必要になった場合に追加できるよう、公開面を閉じ切った前提では記述しません。

利用者は、`ui-input`を単なる見た目のwrapperではなく、**値・妥当性・説明・エラー・フォーム参加をまとめて扱う公開単位**として利用します。

### プログラム更新契約

`value`、`defaultValue`、`required`、`pattern`、`minlength`、`maxlength`、`type`などのproperty更新は、内部input、FormData参加状態、および妥当性状態へ同期します。

一方で、**programmatic updateはユーザー入力の代替ではありません**。property代入やattribute更新によって`input` / `change`を新たに発火させることは公開契約に含みません。利用者は、値同期とイベント通知を同一視してはなりません。

### 属性反映契約

公開入力のうち、`label`、`hideLabel`、`variant`、`type`、`name`、`placeholder`、`defaultValue`、`helpText`、`errorMessage`、`error`、`disabled`、`readonly`、`required`、`requiredIndicator`、`pattern`、`minlength`、`maxlength`、`autocomplete`、`inputmode`、`enterkeyhint`、`autocapitalize`、`spellcheck`、`describedBy`はpropertyとattributeの両面から操作できます。`value`はpropertyとして扱うことを基本とし、反射属性ではありません。

| property            | attribute            | reflect | 備考                                                                        |
| ------------------- | -------------------- | ------- | --------------------------------------------------------------------------- |
| `label`             | `label`              | あり    | 必須契約です                                                                |
| `hideLabel`         | `hide-label`         | あり    | boolean attributeとして扱います                                            |
| `variant`           | `variant`            | あり    | `filled` / `outline`を正規入力とします。列挙外値は`filled`に正規化します |
| `type`              | `type`               | あり    | 非対応値は`text`に正規化します                                            |
| `name`              | `name`               | あり    | FormDataキーに使用します                                                   |
| `placeholder`       | `placeholder`        | あり    | 補助ヒントです                                                              |
| `value`             | `value`              | なし    | 現在値を表すpropertyです                                                  |
| `defaultValue`      | `default-value`      | あり    | 初期値およびreset復元値です                                               |
| `helpText`          | `help-text`          | あり    | 非エラー時のみ表示します                                                    |
| `errorMessage`      | `error-message`      | あり    | 強制エラー文言です                                                          |
| `error`             | `error`              | あり    | boolean attributeとして扱います                                            |
| `disabled`          | `disabled`           | あり    | boolean attributeとして扱います                                            |
| `readonly`          | `readonly`           | あり    | boolean attributeとして扱います                                            |
| `required`          | `required`           | あり    | boolean attributeとして扱います                                            |
| `requiredIndicator` | `required-indicator` | あり    | `text` / `asterisk` / `none`を正規入力とします                             |
| `pattern`           | `pattern`            | あり    | ネイティブinputに委譲します                                               |
| `minlength`         | `minlength`          | あり    | 数値として扱います                                                          |
| `maxlength`         | `maxlength`          | あり    | 数値として扱います                                                          |
| `autocomplete`      | `autocomplete`       | あり    | ネイティブinputに委譲します                                               |
| `inputmode`         | `inputmode`          | あり    | ネイティブinputに委譲します                                               |
| `enterkeyhint`      | `enterkeyhint`       | あり    | ネイティブinputに委譲します                                               |
| `autocapitalize`    | `autocapitalize`     | あり    | ネイティブinputに委譲します                                               |
| `spellcheck`        | `spellcheck`         | あり    | ネイティブinputに委譲します                                               |
| `describedBy`       | `described-by`       | あり    | 外部説明要素ID群です。`aria-describedby`の合成に使用します               |

### 列挙外値・無効値の扱い

`variant`は`filled`と`outline`、`type`は`text`、`email`、`password`、`tel`、`url`、`requiredIndicator`は`text`、`asterisk`、`none`を正規入力とします。

列挙外値が与えられた場合、`ui-input`は開発時警告を出したうえで、内部的には次のcanonical値へフォールバックします。

- 非対応`type` → `text`
- 列挙外`variant` → `filled`
- 列挙外`requiredIndicator` → `text`

このフォールバックは、**描画と状態遷移を破綻させないための防御動作**です。利用者は正規値のみを渡すことを前提とし、列挙外値による暗黙挙動に依存してはなりません。

また、canonical値のattributeへの再反映は**許容される実装方式**ですが、本書では必須契約として固定しません。公開契約として重要なのは、**列挙外値が与えられても意味と表示が安定し、正規状態へ収束すること**です。DOM上の属性値を書き戻すかどうかは、実装選択として扱います。

したがって、利用者が依存できるのは次の点です。

- 列挙外値によって例外的な表示モードは成立しないこと
- 内部の意味状態と描画状態は正規値系へ収束すること
- 開発時には品質低下として検知できること

一方で、列挙外値が与えられた直後のattribute文字列そのものまでを外部契約として固定しません。

### 責務範囲

責務範囲には、ラベルの描画、入力本体の描画、補助文言とエラー文言の切り替え、ネイティブ妥当性との同期、ElementInternalsを通じたフォーム参加、キーボード入力とポインター入力の受理、および必要なアクセシビリティ属性の付与を含みます。

一方で、入力マスク、補完候補UI、複数項目の整合チェック、非同期バリデーション、業務エラーコードからの文言生成、送信成功後の制御、数値専用入力の数理仕様は責務に含めません。

---

## 状態モデル

`ui-input`の主要状態は、見た目の種別ではなく、**現在値と初期値の関係**、**入力可能か**、**妥当か**、**外部エラーとネイティブエラーのどちらが優先されるか**、**フォーム参加するか**によって読み分けます。

### 1. 値モデル

`ui-input`は**自己保持型の単一行入力**です。`value`は現在値、`defaultValue`は初期値およびreset復元値です。ユーザー入力は現在値を更新しますが、`defaultValue`を更新しません。

初期化、reset、ブラウザ復元、programmatic updateはそれぞれ異なる契約面です。利用者は、現在値の変更と初期値の変更を同一視してはなりません。

### 2. 基本状態

最小状態は、`label`を持ち、`variant="filled"`、`type="text"`、`disabled=false`、`readonly=false`、`error=false`の状態です。この状態では通常の単一行テキスト入力として振る舞います。`type`の列挙外値は状態として保持せず、`text`へ正規化したうえでcanonical値をattributeに反映します。

### 3. バリアント状態

`variant`は視覚的な入力領域の示し方を切り替えます。列挙外値は状態として保持せず、`filled`へ正規化したうえでcanonical値をattributeに反映します。

| `variant`値 | 意味               | 想定用途                     |
| ------------ | ------------------ | ---------------------------- |
| `filled`     | 面で入力領域を示す | 通常の読書・執筆文脈         |
| `outline`    | 線で入力領域を示す | より軽い境界表現が必要な文脈 |

`variant`は意味や妥当性を変更しません。入力の種類、エラー、必須性、フォーム参加は`variant`と独立です。

### 4. 補助情報状態

`helpText`が存在し、かつエラー状態でない場合、入力欄の近傍に補助文言を表示します。`aria-describedby`は補助文言を参照します。

補助文言は、プレースホルダーの代替ではありません。入力前後を問わず、入力規則や補足説明を安定して提示するために用います。

### 5. 外部強制エラー状態

`error=true`かつ`errorMessage`が空でない場合、`ui-input`は外部強制エラー状態へ移行します。`aria-invalid="true"`を付与し、エラーメッセージを表示し、`aria-describedby`はエラーメッセージを参照します。

このとき、`helpText`は表示しません。**補助説明とエラー通知を同時に読ませない**ことが契約です。

`error=true`かつ`errorMessage=''`は契約違反です。この場合、コンポーネントは開発時警告を出し、**外部強制エラー状態へは移行しません**。外部強制エラーの解消責務は利用者側にあります。ユーザー入力だけで自動解除することを前提にしません。

### 6. ネイティブバリデーション状態

`required`、`pattern`、`minlength`、`maxlength`、`type`によりネイティブ妥当性が不成立となる場合、`ui-input`は内部inputの妥当性をElementInternalsへ同期し、ネイティブエラー状態として扱います。

この状態ではnative invalidが成立し、エラー文言にはブラウザ由来の`validationMessage`、または内部既定文言を用います。ネイティブエラーは外部強制エラーとは別系統であり、値更新に応じて再評価されます。

外部強制エラーとネイティブエラーが競合する場合、**表示文言とcustom errorの優先順位は外部強制エラー側**とします。

### 7. 必須状態

`required=true`の場合、ネイティブinputに`required`を委譲します。これは**意味状態**です。必須表示の仕方は`requiredIndicator`が担います。

| `requiredIndicator`値 | 表示契約                         |
| ---------------------- | -------------------------------- |
| `text`                 | ラベル近傍に文言で必須を示します |
| `asterisk`             | ラベル近傍に記号で必須を示します |
| `none`                 | 追加表示を行いません             |

利用者は、`required`を視覚表現の指定として扱ってはなりません。`required=true`であっても、表示形式は`requiredIndicator`によって決まります。

### 8. 読み取り専用状態

`readonly=true`の場合、入力値の編集はできませんが、フォーカス、選択、コピーは可能です。FormDataにも参加します。readonlyはdisabledと異なり、**編集不能だが、内容確認と参照は継続できる状態**です。

| 観点          | `readonly=true`の契約                                     |
| ------------- | ---------------------------------------------------------- |
| フォーカス    | 可能です                                                   |
| テキスト選択  | 可能です                                                   |
| FormData参加 | 維持します                                                 |
| Enter送信    | 既定契約には含めません。必要な場合は上位レイヤで定義します |
| エラー表示    | 許容します                                                 |

本書におけるreadonlyは、**編集を止める状態**であって、送信操作まで積極的に意味付ける状態ではありません。関連フォームが存在しても、readonly上のEnterを送信契約の一部として固定しません。

Enterキーによる送信を必要とする文脈では、上位レイヤが明示的にその挙動を設計します。これにより、確認用フィールド、参照専用フィールド、一時固定フィールドなどを安全に扱えます。

### 9. 不活性状態

`disabled=true`の場合、内部inputは無効化され、ユーザー操作を受け付けません。ElementInternalsへのフォーム値も`null`とし、FormDataに参加しません。

disabled状態では、少なくとも次を満たします。

- ユーザー入力を受け付けないこと
- FormDataに参加しないこと
- ネイティブ操作対象として扱われないこと

外部強制エラー、ネイティブエラー、`aria-invalid`、custom error、エラーメッセージ表示との関係については、**既定では抑止側に寄せます**。ただし、無効化された入力の理由説明や、直前状態の参照を要する文脈を考慮し、**disabledと説明表示を常に排他的とすることまでは固定しません**。

したがって、利用者が依存できる公開契約は次のとおりです。

- disabledは操作不能とフォーム非参加を意味すること
- 既定表示ではinvalid状態を前景化しないこと
- disabled時の説明表示や補助説明の残し方には実装裁量があること

また、`fieldset[disabled]`由来の無効化は`formDisabledCallback()`を通じて反映します。したがって、`ui-input`はホスト属性だけでなく、**フォーム文脈由来のdisabled** も受理します。

### 10. フォーカス状態

ホストは`delegatesFocus: true`を有効にしており、ホストへのフォーカス要求は内部inputに委譲されます。フォーカス時は背景を白地へ戻し、`focus-visible`では明示的なフォーカスリングを表示します。

これは入力可能性の確認ではなく、**いま文字を入れる位置がどこか**を静かに明確化するための契約です。

### 11. フォーム状態

`ui-input`はForm Associated Custom Elementです。`name`を持つ場合、現在値はFormDataへ参加します。`disabled`の場合は参加しません。`readonly`の場合は参加します。

フォームリセット時は`defaultValue`へ戻ります。ブラウザ復元時は文字列状態を現在値として復元します。

---

## DOM / Accessibility

ルートは`:host`です。Shadow DOM内部に、ラベル、単一のネイティブ`<input>`、補助文言またはエラー文言を持ちます。

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

- 対話主体はネイティブ`<input>`です。
- `label`は公開契約上必須です。
- アクセシブル名の正準ソースは、対応付けられたlabel要素です。
- `hide-label`は視覚的非表示のみを意味し、アクセシブル名は失いません。
- `aria-label`は既定の契約面に含めません。label要素が存在する通常構成では使用しません。
- 外部説明が指定される場合、`describedBy`は説明専用APIとして扱い、アクセシブル名には関与させません。
- `helpText`が表示される場合、`aria-describedby`は外部説明ID群の後ろに内部help要素IDを連結できます。
- エラー状態で`errorMessage`が表示される場合、`aria-describedby`は外部説明ID群の後ろに内部error要素IDを連結できます。
- ID結合順は **外部説明ID → 内部help / error ID** の順で固定します。
- disabled状態では、既定では`aria-invalid`を立てません。
- エラーメッセージは、少なくとも説明対象として関連付けられます。
- live regionの強さや`role`の固定値は、本書では一律に規定しません。
- ラベルクリックは`for`属性により内部inputへフォーカスを移します。

本コンポーネントで重要なのは、**ラベル、入力欄、説明文、エラー文の関係をDOM上で一貫して維持すること**です。placeholderのみで意味を伝える構成や、`aria-label`のみへ依存する構成は採りません。

外部説明連携を導入しても、アクセシブル名の正準ソースはlabel要素から変更しません。また、`helpText`と`errorMessage`の相互排他契約も維持します。説明面を開いても、名前計算とエラー切替の中心線は変えません。

### ID 安定性契約

`ui-input`は、label / input / help / errorの対応付けを、同一インスタンスの存続中に一貫して維持しなければなりません。したがって、`for`、`aria-describedby`、および関連要素間の参照関係は、再描画や軽微な状態更新によって崩れてはなりません。

本書が固定するのは、**関連付け結果の安定性**です。内部IDの生成方法、採番規則、再利用戦略そのものは公開契約に含めません。

利用者は、内部ID値そのものを外部契約として利用してはなりませんが、**再レンダーや状態切替の前後で関連付けが維持されること**には依存できます。

### イベント契約

`ui-input`は、内部input由来で観測される標準イベントと、ホストから明示的に再送出するイベントを持ちます。

| イベント | 観測面          | bubbles | composed | cancelable | `event.target`の扱い | 契約                                                    |
| -------- | --------------- | ------- | -------- | ---------- | --------------------- | ------------------------------------------------------- |
| `input`  | host境界で観測 | はい    | はい     | いいえ     | hostとして扱います   | ユーザー入力により現在値が変化したときに発火します      |
| `change` | host境界で観測 | はい    | はい     | いいえ     | hostとして扱います   | コミット時に発火します                                  |
| `focus`  | host再送出     | いいえ  | いいえ   | いいえ     | hostです             | 内部inputのフォーカス取得をhostから観測可能にします |
| `blur`   | host再送出     | いいえ  | いいえ   | いいえ     | hostです             | 内部inputのフォーカス喪失をhostから観測可能にします |

`input`と`change`は**ユーザー入力由来の変更通知**です。`value` propertyの書き換えや`defaultValue`の更新は、これらのイベント発火を保証しません。`focus`と`blur`はShadow DOMを越えてhostを監視しやすくするための公開面です。利用者は、イベントの有無を値同期の唯一の根拠にしてはなりません。

---

## Visual Contract

`ui-input`の視覚契約は、入力待機時に領域を静かに示し、入力中は白地へ戻して集中を妨げないことにあります。

### 情報順位

- ラベルは入力欄の意味を先に提示します。
- 入力欄は背景または境界で入力可能性を示します。
- `helpText`は補助情報として控えめに表示します。
- `errorMessage`は最優先の状態通知として補助情報を置き換えます。

本文近傍では、入力欄が常時強く発光したり、過剰な輪郭で主張したりしてはなりません。読書の主役は本文であり、入力欄は**必要なときだけ明確になる**べきです。

### 視覚仕様

- `filled`は淡い背景面で入力領域を示します。
- `outline`は白地と境界線で入力領域を示します。
- hoverでは境界線を与え、入力可能領域のエッジを明確にします。
- focusでは白地へ戻し、視線を内容入力へ集中させます。
- errorでは背景と境界線の両方を変え、色以外の差分も伴わせます。
- disabledでは不透明度低下とmutedな前景色で操作不能を示します。
- readonlyでは編集不能だが読取可能な状態として、disabledより弱い静的表現に保ちます。

### ラベルの扱い

ラベルはinputの外に置かれ、入力欄と1対1で結び付きます。`required=true`は意味状態であり、表示形式は`requiredIndicator`により決まります。したがって、表示ラベルへ常に`（必須）`を固定付加することは契約に含めません。

`hideLabel`は視覚的に見えなくするだけで、DOMから削除しません。これは、視覚上の簡潔さを保ちながら、アクセシブル名の契約を崩さないためです。

### フォーカス表示

フォーカスリングは`outline`と`outline-offset`により描画します。`box-shadow`ベースのフォーカス表現には依存しません。`focus-visible`に限定して表示し、ポインター操作時の不要なノイズを抑えます。

### 参照トークン

本コンポーネントは、主として次のトークンに依存します。

| 用途             | トークン                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------- |
| デフォルト背景   | `--bg-control-muted`                                                                      |
| フォーカス背景   | `--bg-default`                                                                            |
| エラー背景       | `--bg-danger-subtle`                                                                      |
| 既定文字色       | `--fg-default`                                                                            |
| 補助文字色       | `--fg-muted`                                                                              |
| placeholder色   | `--fg-placeholder`                                                                        |
| 無効前景色       | `--fg-disabled`                                                                           |
| エラー文字色     | `--fg-danger`                                                                             |
| 既定境界線       | `--border-default`                                                                        |
| エラー境界線     | `--border-danger`                                                                         |
| 通常境界線幅     | `--border-width`                                                                          |
| 強調境界線幅     | `--border-width-thick`                                                                    |
| 高さ             | `--control-height-md`                                                                     |
| 角丸             | `--radius-md`                                                                             |
| スペーシング     | `--space-1` / `--space-2`                                                                 |
| 文字サイズ       | `--text-sm` / `--text-base`                                                               |
| フォントウェイト | `--font-medium`                                                                           |
| 行間             | `--line-height-normal`                                                                    |
| 遷移時間         | `--duration-fast`                                                                         |
| イージング       | `--ease-out`                                                                              |
| フォーカスリング | `--focus-ring-width` / `--focus-ring-color` / `--focus-ring-offset` / `--animation-focus` |
| 無効時不透明度   | `--opacity-disabled`                                                                      |

---

## 環境別の振る舞い

### Reduced Motion

`prefers-reduced-motion: reduce`環境では、inputのtransition時間を極小化します。背景色や境界線の変化は保持しますが、アニメーション性には依存しません。

### Forced Colors

`forced-colors: active`環境では、`Canvas`、`CanvasText`、`GrayText`などのシステムカラーを優先します。エラー状態も独自色ではなく、境界線の太さとシステム色で表現します。focus-visibleは高コントラスト輪郭に置き換えます。

### Print

印刷時は背景塗りを除去し、透明背景と実線境界へ切り替えます。errorは境界線色で残し、disabled / readonlyは不透明度差で表現します。

### Dark Mode

明示的な`prefers-color-scheme`分岐は持ちません。ダークモード適応はトークン差し替えで成立させます。したがって、暗色環境での視認性はコンポーネント固有の別実装ではなく、テーマトークン側の責務です。

---

## 関連契約

### フォーム関連付け契約

`ui-input`はForm Associated Custom Elementとして実装されています。したがって、Shadow DOM内部のinputであっても、カスタム要素自体がフォーム参加主体になります。

| 条件                               | 振る舞い                                      |
| ---------------------------------- | --------------------------------------------- |
| `name`あり、`disabled=false`      | FormDataに現在値を含めます                   |
| `disabled=true`                    | FormDataに参加しません                       |
| `readonly=true`                    | FormDataに参加します                         |
| `formResetCallback()`              | `defaultValue`へ戻し、エラー状態も解除します |
| `formDisabledCallback(true)`       | fieldset由来のdisabledを反映します         |
| `formStateRestoreCallback(string)` | ブラウザ復元値を現在値として取り込みます      |

利用者は、フォーム参加の基準を内部inputではなく`ui-input`に対して考えます。

### 初期値および reset 契約

`ui-input`の現在値は`value` propertyで操作できます。`defaultValue`は初期値およびreset復元値です。**フォームreset時の正準復元元は`defaultValue`** です。

利用者は、フォームreset後に戻したい既定値をdeclarativeに持たせる場合、`default-value` attribute、または`defaultValue` propertyで明示します。`value` propertyは現在値の更新面であり、初期値定義面とは分離します。

### 軽量入力補助属性契約

`inputmode`、`enterkeyhint`、`autocapitalize`、`spellcheck`は、**値モデルと妥当性モデルを変えない軽量pass-through属性**として扱います。

これらの属性は、次を満たさなければなりません。

- 内部inputへそのまま委譲すること
- `type`と矛盾する独自規則を追加しないこと
- 値モデル、妥当性モデル、イベント契約を変更しないこと
- コンポーネント側で既定値を暗黙設定しないこと
- `variant`やvisual stateに責務を混在させないこと

したがって、これらは **入力意図と入力補助の明示** であり、入力意味や状態機械の拡張ではありません。

### 外部説明連携契約

`describedBy`は、複合フォームやフィールドグループで外部説明要素を関連付けるための **説明専用API** です。

この契約では、次を固定します。

- `describedBy`はアクセシブル名の責務へ侵入しません。
- ID結合順は **外部説明ID → 内部help / error ID** の順とします。
- `helpText`と`errorMessage`の相互排他契約は維持します。
- disabled時に内部error説明を抑止するかどうかは既定動作に従いますが、外部説明連携面そのものは維持できます。

したがって、外部説明連携を導入しても、`ui-input`は「labelによる名前付け」「help / errorによる内部説明切替」という中核契約を崩しません。

### 妥当性同期契約

`ui-input`は、内部inputのネイティブ妥当性と、`error` / `errorMessage`による外部強制エラーをElementInternalsへ同期します。外部強制エラーは、**`error=true`かつ`errorMessage`が空でない場合にのみ成立**します。

| 条件                                  | 妥当性API上の扱い                                  |
| ------------------------------------- | ---------------------------------------------------- |
| `disabled=true`                       | フォーム妥当性上は非参加として扱います               |
| `error=true`かつ`errorMessage`あり | 外部強制エラーとしてinvalid扱いにできます          |
| `error=true`かつ`errorMessage`なし | 契約違反として警告し、外部強制エラーは成立させません |
| ネイティブ妥当性エラーあり            | ネイティブ妥当性結果を同期しinvalidとして扱います  |
| 強制エラーなし、ネイティブ妥当性OK   | validとして扱います                                 |

外部強制エラーとネイティブエラーが競合する場合、**表示上は外部強制エラーを優先してよい**ものとします。ただし、どの情報を公開APIとして追加で観測可能にするかは、本書では閉じ切りません。

この契約により、利用者は`checkValidity()`と`reportValidity()`を`ui-input`に対して呼び出せます。外部強制エラーを使う場合、`errorMessage`を省略してはなりません。

### 妥当性 API の公開面

`checkValidity()`は現在状態に基づいて妥当性真偽を返します。`reportValidity()`は同じ評価を行い、必要に応じてブラウザ標準の妥当性報告を委譲します。

利用者は、これらのメソッドを **フォーム妥当性確認のための最小公開面** として扱います。外部強制エラーを成立させたい場合は、`error`と`errorMessage`を組で渡します。

一方で、妥当性詳細の観測面については、本書では次の方針を採ります。

- `checkValidity()` / `reportValidity()`は公開契約に含めます。
- `validity`、`validationMessage`、`setCustomValidity()`などは、現時点では既定公開面に含めません。
- ただし、将来的にフォームライブラリや複合フォーム統合で必要になった場合に追加できる余地は残します。

したがって、本書は「妥当性APIを最小限に絞る」ことは定めますが、**将来にわたって詳細観測APIを永久に禁じることまでは定めません。**

### Enter キーとフォーム送信契約

内部inputでEnterキーが押され、IME変換中でなく、関連フォームが存在し、`disabled=false`である場合、関連フォーム送信へ橋渡ししてよいものとします。

ただし、この送信経路は **編集可能な単一行入力を既定対象** とします。`readonly=true`の場合に同じ送信挙動を採るかどうかは、本書の固定契約に含めません。確認用フィールドや参照専用フィールドでは、上位レイヤが送信可否を明示的に設計します。

したがって、利用者が依存できるのは次の点です。

- 編集可能な単一行inputはEnterによりフォーム送信へ接続し得ること
- IME変換中はこの送信経路を起動しないこと
- `disabled=true`では送信経路に参加しないこと
- `readonly=true`の送信可否は上位設計に委ねられること

送信の成否、送信先、送信後の状態遷移は上位レイヤの責務です。

### スタイル拡張契約

`ui-input`は`::part(...)`を公開していません。外部スタイル拡張はCSS Custom Propertiesを通じたテーマ調整を基本とします。内部class名、内部DOM構造、個別状態classへの依存は公開契約に含みません。

利用者は`.label`、`.help-text`、`.error-message`、`input.error`などのShadow DOM内部識別子に依存してはなりません（MUST NOT）。

### 開発時警告契約

開発時には少なくとも次のケースで警告します。

- `label`が空である場合
- `type`が非対応値である場合
- `variant`が非対応値である場合
- `requiredIndicator`が非対応値である場合
- `error=true`にもかかわらず`errorMessage`が空である場合

これらは実行時停止ではなく、品質低下を検知するための補助です。とくに`type`、`variant`、`requiredIndicator`の列挙外値は、警告の後にcanonical値へ正規化し、そのcanonical値を対応するattributeに再反映します。本番品質はStorybook、レビュー、テストで補完しなければなりません。

---

## 境界条件

### 1. ラベルあり・通常入力

`label`を持つ通常入力は、最小の正規構成です。placeholderがなくても成立します。

### 2. ラベル非表示

`hideLabel=true`の場合でも、ラベルはDOM上に残り、対応付けも維持します。視覚的に簡潔に見せたい文脈でのみ使用します。

### 3. 補助文言あり

`helpText`がある場合、非エラー時にのみ表示します。`aria-describedby`はhelp要素のみを参照します。

### 4. 外部強制エラーと補助文言の併存

`error=true`かつ`errorMessage`が有効な場合、`helpText`が存在しても表示しません。エラー通知を優先します。

### 5. 強制エラーだが文言なし

`error=true`かつ`errorMessage=''`は契約違反です。コンポーネントは開発時警告を出し、外部強制エラー状態へは入りません。したがって、`aria-invalid`、エラー表示、custom errorのいずれにも外部エラーとして依存してはなりません。

### 6. 非対応 type

`type="number"`、`type="date"`、`type="time"`、`type="file"`、`type="checkbox"`、`type="radio"`、`type="search"`などを与えた場合、コンポーネントは警告を出したうえで`text`に正規化し、`type` attributeも`text`へ書き戻します。専用コンポーネントで扱うべき入力種別を`ui-input`に押し込まないことが前提です。

### 7. 列挙外 `variant`

`variant`に列挙外値を与えた場合、コンポーネントは警告を出したうえで`filled`に正規化し、`variant` attributeも`filled`へ書き戻します。したがって、検査時にDOM上へ列挙外値が残ることを前提にしてはなりません。

### 8. `disabled` とエラー状態

`disabled=true`の場合、FormDataに値を含めません。既定表示では、invalid状態を前景化せず、操作不能状態として扱います。

ただし、disabledと説明表示の関係は常に単純ではありません。無効化理由の説明、直前状態の参照、確認画面での表示などを考慮し、外部強制エラー、ネイティブエラー、`aria-invalid`、エラー文言を**常に完全抑止することまでは本書で固定しません**。

利用者は、disabledを「操作不能かつフォーム非参加」の意味として扱い、説明表示の残し方はコンテキストに応じて設計します。

### 9. `readonly` の境界

`readonly=true`の場合、FormDataには値を含め、フォーカスと選択を許可します。`readonly`と`disabled`を同義として扱ってはなりません。

一方で、Enterによる関連フォーム送信はreadonlyの固定契約には含めません。必要な場合は、上位レイヤが明示的に送信挙動を設計します。

### 10. `minlength` / `maxlength` の境界

プログラム的な値設定ではブラウザが`tooShort` / `tooLong`を自動検知しない場合があるため、実装は文字長を手動確認します。したがって、property更新でも下限・上限の境界判定は契約として維持されます。

### 11. ラベル欠落

`label=''`は契約違反です。描画継続の有無にかかわらず、アクセシブル名の品質は保証しません。

### 12. フォーム外での単体使用

フォームに属さない`ui-input`も単体入力欄として描画できます。ただし、FormData参加やEnter送信は成立しません。

### 13. `required` と表示形式

`required=true`は意味状態です。必須表示の仕方は`requiredIndicator`により決まります。利用者は`required=true`であることと、文言として`（必須）`が表示されることを同一視してはなりません。

---

## Storybook 契約

各Storyは見本ではなく、**公開契約の確認点**として扱います。将来変更時には、次の契約を維持します。

| Story                                | 固定する契約                                                                                  |
| ------------------------------------ | --------------------------------------------------------------------------------------------- |
| `Default`                            | `label`、`type`、label由来のアクセシブル名の基本契約が成立すること                           |
| `WithHelpText`                       | 補助文言表示時に`aria-describedby`がhelp要素を参照すること                                |
| `ExternalErrorState`                 | 外部強制エラーで`aria-invalid`、エラー文言表示、help非表示が成立すること                    |
| `NativeValidationState`              | ネイティブ妥当性エラーがinvalidとして成立すること                                           |
| `HiddenLabel`                        | `hide-label`使用時もlabel由来のアクセシブル名が失われないこと                              |
| `Disabled`                           | disabled状態で内部inputが不活性になり、FormDataへ参加しないこと                           |
| `Readonly`                           | readonly状態で編集不可だが選択とFormData参加が維持されること                               |
| `RequiredMeaningAndPresentation`     | `required`の意味状態と`requiredIndicator`の表示状態が分離されていること                    |
| `SupportedTypes`                     | サポート対象type群のみが描画されること                                                      |
| `UnsupportedTypeFallback`            | 非対応typeが`text`系の正規状態へ収束し、描画と意味が破綻しないこと                        |
| `VariantFallback`                    | 列挙外`variant`が正規状態へ収束し、描画と意味が破綻しないこと                               |
| `FocusState`                         | 公開`focus()`が内部inputに到達すること                                                    |
| `FormIntegration`                    | 複数`ui-input`がフォーム部品として共存できること                                            |
| `DefaultValueReset`                  | reset時の復元元が`defaultValue`であること                                                  |
| `ProgrammaticUpdateNoUserEvent`      | property更新がユーザー入力イベントの代替にならないこと                                       |
| `FormDataParticipation`              | FormDataへ現在値が反映されること                                                             |
| `StableInternalIds`                  | 再描画でlabel / help / errorの参照関係が崩れないこと                                        |
| `ErrorWithoutMessage`                | `error=true`かつ空の`errorMessage`を契約違反として警告し、外部強制エラーを成立させないこと |
| `DisabledSuppressesInvalidByDefault` | disabled既定表示ではinvalid状態を前景化しないこと                                          |
| `MinMaxLengthBoundary`               | 文字数境界で妥当性が切り替わること                                                            |
| `VariantStateMatrix`                 | 主要状態の組み合わせが共存できること                                                          |
| `DarkMode`                           | トークン差し替えにより暗色背景上でも可視性が保たれること                                      |
| `LabelClickFocusTransfer`            | ラベルクリックで内部inputへフォーカス移譲されること                                         |
| `EnterSubmitFromInput`               | Enterキーで関連フォーム送信へ橋渡しできること                                                |
| `FormDataDisabledReadonlyBoundary`   | disabled / readonlyのFormData参加差分が維持されること                                      |

---

## 補足

`ui-input`の要点は、文字列を保持できること自体ではありません。**ラベル、値モデル、妥当性、補助説明、エラー、フォーム参加を一体として扱い、入力の意味を崩さないこと**にあります。

したがって、今後の変更でも次の原則を優先的に維持します。

1. 実体は常に単一のネイティブ`<input>`を中心とすること。
2. `label`を必須契約として維持し、アクセシブル名の正準ソースをlabel要素に置くこと。
3. `value`と`defaultValue`を分離し、現在値と初期値を混同しないこと。
4. `helpText`と`errorMessage`を同時表示しないこと。
5. 外部強制エラーとネイティブエラーを別系統として扱うこと。
6. disabledを操作不能およびフォーム非参加の状態として扱うこと。
7. Form Associated Custom Elementとしての妥当性同期とFormData参加を維持すること。
8. 新しいAPIや状態を追加する場合でも、値モデルを変えないこと。
9. アクセシビリティの正準ソースを増やしすぎないこと。アクセシブル名はlabel、説明は`aria-describedby`系という責務分離を維持すること。
10. エラーモデルを混ぜないこと。外部強制エラーとネイティブエラー以外の第三系統を導入しないこと。
11. 状態機械を肥大化させないこと。単一行入力の状態空間に閉じる拡張のみを許容すること。
12. 意味が変わる場合は`ui-input`に入れず、派生コンポーネントまたは別契約へ切り出すこと。

一方で、通知戦略、妥当性APIの詳細公開面、disabled時の説明表示、readonly時のEnter挙動などは、**本書で固定しすぎない方が長期保守性に有利**です。これらは中核契約を崩さない範囲で実装または上位設計に裁量を残します。

---

## 現行実装で未対応または未強制の事項

本節は、**公開契約そのもの**ではなく、現行実装との差分を保守上の論点として整理する補助節です。ここに記載する内容は、「本書が志向する契約」と「現行実装で未反映または未強制の点」を対応付けるための監査メモとして扱います。

したがって、本節の各項目は次のように読みます。

- 本書の中核契約として早期に固定したいもの
- 実装追随後に中核契約へ昇格できるもの
- 当面は差分管理にとどめるべきもの

利用者は、本節に列挙された差分をもってShadow DOM内部実装へ依存してはなりません。差分の解消方針は、公開契約の安定性を優先して判断します。

### 1. `label` 必須の実行時強制

公開契約上、`label`は必須です。しかし現行実装は、`label`欠落時にコンソールエラーを出すのみで、描画停止や例外送出は行いません。したがって、**ラベル必須は公開契約としては強いが、実行時強制は弱い**状態です。

### 2. `defaultValue` の独立公開

本契約では、`value`を現在値、`defaultValue`を初期値およびreset復元値として分離します。しかし現行実装はreset復元元として`value` attributeを参照しており、`defaultValue`を独立公開していません。

したがって、**現在値と初期値を分離した値モデルは未実装**です。

### 3. `variant` 列挙値の実行時正規化

本契約では、`variant`の列挙外値は契約違反として扱い、開発時警告の上で`filled`に正規化し、canonical値を`variant` attributeにも再反映する方針を採ります。しかし現行実装は`variant`の列挙外値を明示的には正規化せず、`outline`にだけ明示スタイルがあり、それ以外は事実上`filled`に近い振る舞いになります。

したがって、**`variant`の列挙外値を`filled`へ正規化し、attributeにcanonical値を反映する実行時保証は未実装**です。

### 4. `type` の対象範囲の縮退

本契約では、`type`の対象を`text`、`email`、`password`、`tel`、`url`に限定し、`number`を本契約から外します。しかし現行実装およびStorybookには`number`が含まれています。

したがって、**text-like inputに対象範囲を絞る方針は未反映**です。

### 5. `requiredIndicator` による表示分離

本契約では、`required`を意味状態、`requiredIndicator`を表示状態として分離し、`requiredIndicator`の列挙値は`text` / `asterisk` / `none`とします。しかし現行実装は`requiredIndicator`自体を持たず、可視ラベルへ`（必須）`を直接連結しており、表示形式を独立して切り替えられません。

したがって、**requiredの意味と表示を分離した契約、および`requiredIndicator`の公開入力・正規化・警告契約は未実装**です。

### 6. disabled の吸収状態化

本契約では、`disabled=true`の場合、外部強制エラー、ネイティブエラー、`aria-invalid`、custom error、エラー表示をすべて抑止する方針を採ります。しかし現行実装は、妥当性API上はvalidに戻しても、外部`error`に由来する視覚状態や`aria-invalid`が残り得ます。

したがって、**disabledを吸収状態とする保証は未実装**です。

### 7. アクセシブル名の正準ソースの一本化

本契約では、アクセシブル名の正準ソースをlabel要素に固定し、通常構成では`aria-label`を使いません。しかし現行実装は対応付けられたlabelと`aria-label`の両方を用いています。

したがって、**label一系統へ寄せたアクセシブル名契約は未反映**です。

### 8. `error=true` と `errorMessage` の同時必須性

本契約では、`error=true`の場合は`errorMessage`を必須とし、空文字列は契約違反として警告したうえで外部強制エラー状態を成立させない方針を採ります。しかし現行実装は`error=true`かつ`errorMessage=''`を許容し、`aria-invalid`を立てたまま説明文なしで描画できます。

したがって、**`error=true`と`errorMessage`の同時必須性を実行時に強制する保証は未実装**です。

### 9. 外部説明要素との連携面

現行実装の`aria-describedby`は内部help / error専用です。外部説明ブロックやフォームグループ要素と結びたい場合のpass-throughは未対応です。

したがって、**単体で閉じたinput契約としては明確ですが、複合フォームでの拡張面は未公開**です。

### 10. `inputmode` などモバイル入力ヒント

現行実装は`autocomplete`は持ちますが、`inputmode`、`enterkeyhint`、`autocapitalize`は未対応です。とくにモバイル中心の入力では操作効率に影響します。

### 11. `::part(...)` の未公開

現行実装はCSS Custom Propertiesによるテーマ変更を前提とし、partを公開していません。これは内部構造安定性には寄与しますが、局所的な外観調整面は狭いです。

### 12. Storybook メタデータおよび play テストの旧契約残存

現行の`input.stories.ts`には、改訂後の契約とずれている記述が残っています。具体的には、`type`の選択肢に`number`を含めるcontrols、`defaultValue`と`requiredIndicator`を持たないargTypes、`aria-label`の存在を前提にするplayテスト、`required=true`のときに表示ラベルが必ず`（必須）`になることを期待する検証、`AllTypes`に`number`を含めるStoryなどです。

したがって、**Storybookのcontrols・docs・playテストは新契約へ未追随**です。

### 13. 実装内 JSDoc / 使用例の旧契約残存

現行の`input.ts`先頭JSDocと使用例には、改訂後の契約とずれている記述が残っています。具体的には、`type`に`number`を含む説明、`hideLabel`を`aria-label`反映と結び付ける説明、`defaultValue`や`requiredIndicator`を持たないAPI説明などです。

したがって、**実装ソースに付属する開発者向け契約説明も新契約へ未追随**です。

### 14. Storybook における警告自体の自動検証

`WithoutLabel`や`UnsupportedType`は契約違反例を示しますが、コンソール警告そのものをStorybookテストで厳密に検証しているわけではありません。したがって、**警告発生の有無そのものは契約としてまだ弱い**です。

### 15. 本節の扱い

本節に記載した事項は、現行公開契約として利用者が依存してよいものではありません。これらを採用または厳密化する場合は、実装、Storybook、契約書の3点を同時に更新し、未整合状態を残したまま公開契約へ昇格させません。
