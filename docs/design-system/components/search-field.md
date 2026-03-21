# Search Field

## 概要

本書は、`ui-search-field` の公開契約、状態モデル、アクセシビリティ、視覚契約、および関連する境界条件を整理するものです。

`ui-search-field` は、**検索専用の自己管理型 input primitive** です。単に `type="search"` の入力欄を描画するのではなく、**検索アイコンを含む入力面の構成**、**clear 操作を許可する条件**、**限定的な Combobox 用 ARIA 受け皿の範囲**、**公開状態・公開イベント・公開メソッドの安定面**を公開契約として固定します。

また、高さ、余白、フォーカス表示、モーション抑制、高コントラスト対応は、場当たり的な画面ごとの差し込みではなく、**トークン契約と状態契約**によって成立させます。

Rouault における search field は、検索導線でありながら、**本文の読書リズムを不必要に破壊しないこと**を求めます。したがって、本コンポーネントの契約は、検索開始点としての認知しやすさと、**「没入して読む」ことのできるデザイン**の維持を両立する方向で定義します。

---

## 適用範囲

本書は、`ui-search-field` の次の事項を対象とします。

- 公開契約
- 状態モデル
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 関連契約
- 境界条件
- Storybook 契約
- 新規で追加を検討する価値がある機能
- 現行実装で未対応の事項

一方で、本書は次の事項を扱いません。

- 検索アルゴリズム自体
- 検索候補の取得、整形、ランキング
- suggestion listbox / popup の描画
- URL 同期や検索結果一覧の制御
- 入力値の debounce、正規化、トリミング、履歴管理
- フォーム送信、検索実行、サーバー問い合わせの上位制御
- エラー表示、補助説明文、履歴候補、ショートカットヒントの提示

これらは上位レイヤまたは別コンポーネントの責務です。

---

## 公開契約

`ui-search-field` は、`label`、`hideLabel`、`name`、`placeholder`、`value`、`autocomplete`、`disabled`、`readonly`、`clearable`、`clearButtonLabel`、`inputRole`、`inputAriaControls`、`inputAriaExpanded`、`inputAriaAutocomplete`、`inputAriaActivedescendant`、`inputAriaBusy` を公開入力として扱います。また、`clearButtonVisible` を**公開読み取り状態**として扱います。内部実装は検索アイコン、`<input type="search">`、clear button を持つ複合構造ですが、利用者は `ui-search-field` を契約単位として扱います。

`label` は必須です。実装上は未指定時に開発時警告を出すにとどまりますが、公開契約としては**必須入力**です。`hideLabel=true` はラベルの単なる非表示ではなく、**視覚的に隠しつつアクセシブル名を維持する状態**として扱います。

`value` は、**自己管理型の現在値**です。内部 input からの変更時には `ui-search-field` 自身の `value` が更新され、`input` または `change` が再送出されます。`clear()` による消去も `value` を空文字へ更新し、`input` を再送出します。

`value` は**生入力を保持する公開値**として扱います。本コンポーネントは `value` に対して trim、debounce、正規化、全角半角統一、case folding、検索語分割を行いません。これらの変換は上位レイヤの責務です。

利用者が `value` property を直接代入した場合、本コンポーネントはそれを**静かな状態更新**として扱います。すなわち、property 代入それ自体では `input` も `change` も発火しません。イベント発火はユーザー操作、または `clear()` のような公開操作に結び付く場合に限ります。

`inputRole` および各種 `inputAria*` は、検索候補 UI と組み合わせる場合の**限定的な Combobox 用 ARIA 受け皿**です。これらは内部 input にそのまま反映するための公開面であり、`ui-search-field` 自身が listbox や popup を描画するわけではありません。本コンポーネントは Combobox 本体ではなく、**検索入力本体に限定的な ARIA adapter を付与できる primitive**として扱います。

### 入力契約

| 名前                        | 種別                                        | 必須   | 内容                          | 契約                                                                |
| --------------------------- | ------------------------------------------- | ------ | ----------------------------- | ------------------------------------------------------------------- |
| `label`                     | property / attribute                        | はい   | ラベル文字列                  | 空文字は契約違反です                                                |
| `hideLabel`                 | property / attribute (`hide-label`)         | いいえ | ラベルの視覚非表示            | `true` の場合もアクセシブル名は維持します                           |
| `name`                      | property / attribute                        | いいえ | 内部 input の name            | 文字列をそのまま内部 input に反映します。フォーム参加は保証しません |
| `placeholder`               | property / attribute                        | いいえ | プレースホルダー              | 補助文言であり、ラベルの代替にはしません                            |
| `value`                     | property / attribute                        | いいえ | 入力値                        | 自己管理型の現在値です。property 代入は無音で反映します             |
| `autocomplete`              | property / attribute                        | いいえ | 自動補完ヒント                | 既定値は `off` です                                                 |
| `disabled`                  | property / attribute                        | いいえ | 不活性状態                    | `true` の場合、入力と clear を禁止します                            |
| `readonly`                  | property / attribute                        | いいえ | 読み取り専用状態              | `true` の場合、編集と clear を禁止します                            |
| `clearable`                 | property / attribute                        | いいえ | clear 機能の有効化            | 既定値は `true` です                                                |
| `clearButtonLabel`          | property / attribute (`clear-button-label`) | いいえ | clear button のアクセシブル名 | 既定値は `検索をクリア` です                                        |
| `inputRole`                 | property のみ                               | いいえ | 内部 input の role            | 主用途は `combobox` です                                            |
| `inputAriaControls`         | property のみ                               | いいえ | 関連 popup / listbox ID       | 内部 input の `aria-controls` に反映します                          |
| `inputAriaExpanded`         | property のみ                               | いいえ | 展開状態                      | `true` / `false` / 空文字を受理します                               |
| `inputAriaAutocomplete`     | property のみ                               | いいえ | 補完方式                      | `list` / `both` / `inline` / `none` / 空文字を受理します            |
| `inputAriaActivedescendant` | property のみ                               | いいえ | 現在アクティブな候補 ID       | 内部 input の `aria-activedescendant` に反映します                  |
| `inputAriaBusy`             | property のみ                               | いいえ | 候補更新中状態                | `true` / `false` / 空文字を受理します                               |

### 公開状態

`ui-search-field` は、利用者が Shadow DOM 内部構造へ依存せずに状態を読めるよう、次の派生状態を公開します。

| 名前                 | 種別              | 契約                                                                                   |
| -------------------- | ----------------- | -------------------------------------------------------------------------------------- |
| `clearButtonVisible` | readonly property | `clearable && !disabled && !readonly && value.length > 0` を満たすときのみ `true` です |

`clearButtonVisible` は DOM 実装の詳細を公開するものではありません。保証するのは、**clear 操作が視覚的かつ操作的に利用可能かどうか**であり、内部 button ノードの常時存在や `hidden` 属性の使い方までは公開契約に含めません。

### 公開メソッド

`ui-search-field` は、内部 input または clear button への主要操作を Shadow DOM 外へ公開するため、次の公開メソッドを持ちます。

| 名前                                        | 種別   | 契約                                                                                  |
| ------------------------------------------- | ------ | ------------------------------------------------------------------------------------- |
| `focus(options?)`                           | method | 内部 input にフォーカスを委譲します                                                   |
| `blur()`                                    | method | 内部 input からフォーカスを外します                                                   |
| `select()`                                  | method | 内部 input の全選択を行います                                                         |
| `setSelectionRange(start, end, direction?)` | method | 内部 input の選択範囲を設定します                                                     |
| `clear(options?)`                           | method | 編集可能時のみ `value` を空文字へ更新し、`input` を再送出し、入力へ再フォーカスします |
| `focusClearButton()`                        | method | clear button が可視のときのみ clear button にフォーカスを移します                     |

これらは Shadow DOM 内部探索へ依存させないための公開面です。利用者は内部 input や内部 button を直接取得せず、まずこれらの公開メソッドを利用します。

これらのメソッドは、**接続済みかつ描画済みのコンポーネントに対して呼び出す**ことを前提とします。本コンポーネントは未接続状態や利用側のライフサイクル不整合を吸収するための待機・再試行機構を持ちません。`select()` および `setSelectionRange()` は内部 input へ直接委譲する公開面であり、選択可能状態の管理や独自例外制御を追加しません。`focusClearButton()` は clear button 非表示時には no-op です。

### イベント契約

`ui-search-field` は内部 input のイベントをそのまま露出するのではなく、必要なイベントをホスト要素から再送出します。

再送出されるイベントは、**元のネイティブイベントをそのまま転送するものではなく、ホスト要素から新たに生成されるイベント**です。したがって、利用者は `InputEvent.data`、`inputType`、`isComposing`、詳細な `composedPath()`、元の `target` など、ネイティブイベント固有の付随情報に依存しません。利用者が依存してよいのは、イベント種別と、発火時点で同期済みの `ui-search-field.value` です。

| 名前     | 発火条件                                     | bubbles | composed | 契約                         |
| -------- | -------------------------------------------- | ------- | -------- | ---------------------------- |
| `input`  | 内部 input の入力時、または `clear()` 実行時 | あり    | あり     | `value` 更新後に再送出します |
| `change` | 内部 input の change 時                      | あり    | あり     | `value` 更新後に再送出します |
| `focus`  | 内部 input が focus した時                   | なし    | なし     | ホスト要素から再送出します   |
| `blur`   | 内部 input が blur した時                    | なし    | なし     | ホスト要素から再送出します   |

`input` と `change` は、受信時点で `ui-search-field.value` が同期済みであることを保証します。`clear()` は `value` 更新、内部 input への同期、`input` の再送出、再フォーカスの順で処理します。

`clear()` は `input` を再送出しますが、`change` は再送出しません。利用者は clear 操作完了の検知を `input` 側で扱います。

`focus` および `blur` もホスト要素から再送出されますが、`focusin` / `focusout` は公開しません。また、これらは内部 input の状態変化をホスト外へ通知するための公開面であり、`relatedTarget` などの詳細情報保持を保証しません。

### 属性反映契約

公開入力のうち、`label`、`hideLabel`、`name`、`placeholder`、`value`、`autocomplete`、`disabled`、`readonly`、`clearable`、`clearButtonLabel` は property と attribute の両面から入力できます。ただし、`inputRole` および各種 `inputAria*` は **property 専用**です。

| property                    | attribute            | reflect | 備考                               |
| --------------------------- | -------------------- | ------- | ---------------------------------- |
| `label`                     | `label`              | なし    | 初期属性入力を受け取ります         |
| `hideLabel`                 | `hide-label`         | なし    | boolean attribute として受理します |
| `name`                      | `name`               | なし    | 内部 input に反映します            |
| `placeholder`               | `placeholder`        | なし    | 内部 input に反映します            |
| `value`                     | `value`              | なし    | 自己管理型の現在値です             |
| `autocomplete`              | `autocomplete`       | なし    | 既定値は `off` です                |
| `disabled`                  | `disabled`           | あり    | boolean attribute として扱います   |
| `readonly`                  | `readonly`           | あり    | boolean attribute として扱います   |
| `clearable`                 | `clearable`          | あり    | boolean attribute として扱います   |
| `clearButtonLabel`          | `clear-button-label` | なし    | clear button のアクセシブル名です  |
| `inputRole`                 | なし                 | なし    | property のみ                      |
| `inputAriaControls`         | なし                 | なし    | property のみ                      |
| `inputAriaExpanded`         | なし                 | なし    | property のみ                      |
| `inputAriaAutocomplete`     | なし                 | なし    | property のみ                      |
| `inputAriaActivedescendant` | なし                 | なし    | property のみ                      |
| `inputAriaBusy`             | なし                 | なし    | property のみ                      |

### 値モデルと状態更新

本コンポーネントは、外部から現在値を読める一方で、内部のユーザー操作に応じて自ら `value` を更新する**自己管理型**のモデルを採用します。利用者は、完全制御コンポーネントとして扱うのではなく、現在値を読む、必要に応じて上書きする、イベントで追従する、という使い方を前提とします。

`value` property の代入は、公開状態を書き換えるための無音操作です。入力イベントの代替にはしません。検索開始、debounce、URL 同期、検索語正規化は、常に上位レイヤが担当します。

### 列挙外値・無効値の扱い

`inputAriaExpanded`、`inputAriaAutocomplete`、`inputAriaBusy` は、公開上は列挙値を契約とします。実装は実行時に値検証を行わないため、列挙外値を与えること自体は可能ですが、アクセシビリティ上の意味は未定義です。利用者は列挙外値に依存しません。

`inputRole` は実装上任意文字列を受理しますが、契約上の主用途は `combobox` です。検索入力以外の役割を付与する用途には用いません。

`autocomplete` は HTML 標準に準拠した文字列を内部 input へそのまま反映します。本コンポーネントは値の正当性を独自検証しません。

`label` 欠落や ARIA 列挙外値のような契約違反入力に対して、本コンポーネントが行う実行時強制は限定的です。`label` 欠落時には開発時警告を出しますが、描画停止や例外送出は行いません。ARIA 列挙外値についても自動補正や拒否は行いません。契約の主たる強制力は、文書契約、Storybook 契約、および開発時検知に置きます。

### 責務範囲

責務範囲には、内部検索 input の描画、検索アイコンの配置、ラベルの視覚非表示処理、clear button の出し分け、公開状態の提供、入力イベントの再送出、フォーカス委譲、限定的な Combobox 用 ARIA 属性の反映を含みます。

一方で、候補一覧の開閉、候補選択ロジック、検索実行タイミング、検索 API 呼び出し、URL 同期、検索結果面の更新、説明文やエラー文言の提示、フォーム送信参加は責務に含めません。

---

## 状態モデル

`ui-search-field` の主要状態は、見た目の差分よりも、**入力可能か、値を持つか、clear を許可するか、Combobox 補助属性を持つか**によって読み分けます。

### 基本状態

最小状態は、`label` を持ち、`hideLabel=false`、`value=""`、`autocomplete="off"`、`disabled=false`、`readonly=false`、`clearable=true` の状態です。この状態では、検索アイコン付きの通常入力欄として振る舞います。

### ラベル状態

`hideLabel=false` の場合、ラベルは可視表示されます。`hideLabel=true` の場合、ラベルは視覚的に隠れますが、DOM から除去されません。したがって、アクセシブル名は維持されます。

### 値状態

`value` は自己管理型の現在値です。ユーザー入力または `clear()` により更新されます。利用者が property を直接代入した場合、その更新は無音で反映されます。

`value` が空文字である場合、clear button は非表示です。`value` が 1 文字以上である場合でも、clear button が表示されるのは `clearable=true`、`disabled=false`、`readonly=false` を同時に満たす場合に限ります。

### clear 可能状態

clear button の表示条件は、次式で固定します。

- `clearable && !disabled && !readonly && value.length > 0`

この条件を満たす場合のみ clear button は可視となり、`focusClearButton()` の対象になります。条件を満たさない場合、公開状態として clear 操作は利用不能です。内部 DOM の保持方法や `hidden` 属性による実装は公開契約に含めません。

### 不活性状態

`disabled=true` の場合、内部 input は `disabled` となり、編集と clear 操作を受け付けません。`clearButtonVisible` は必ず `false` です。

### 読み取り専用状態

`readonly=true` の場合、内部 input は `readOnly` となり、直接編集を受け付けません。さらに、clear 操作も禁止し、`clearButtonVisible` は必ず `false` です。

### Combobox 補助状態

`inputRole="combobox"` と各種 `inputAria*` を与えた場合、内部 input は検索候補 UI と接続される前提の状態になります。ただし、`ui-search-field` 自身が popup や listbox を生成することはありません。したがって、この状態は**意味属性の付与のみを行う補助状態**です。

### フォーカス状態

ホスト要素は `delegatesFocus: true` を有効にしており、ホストへのフォーカス要求は内部 input に委譲されます。clear button への移動は自動ではなく、利用者またはユーザー操作により発生します。

---

## DOM / Accessibility

ルートは `:host` です。Shadow DOM 内部にラベル、field コンテナ、検索アイコン、`<input type="search">`、clear button を持ちます。

```text
<ui-search-field>
  #shadow-root
    <label for="..." class="label [label--hidden]">...</label>
    <div class="field">
      <span class="icon" aria-hidden="true">
        <iconify-icon icon="lucide:search"></iconify-icon>
      </span>
      <input type="search" ... />
      <button class="clear-button" type="button" [hidden]>
        <iconify-icon icon="lucide:circle-x" aria-hidden="true"></iconify-icon>
      </button>
    </div>
</ui-search-field>
```

`ui-search-field` は `delegatesFocus: true` を有効にしており、ホストへの `focus()` は内部 input に到達します。公開メソッド `focus()`、`blur()`、`select()`、`setSelectionRange()`、`clear()` も内部 input または clear button に委譲されます。

### Accessibility 契約

アクセシビリティ上の重要点は次のとおりです。

- 入力主体はネイティブ `<input type="search">` です。
- `label` は必須です。
- `hideLabel=true` の場合も、ラベルは視覚的にのみ隠し、アクセシブル名は維持します。
- アクセシブル名の正は `label` です。
- `hideLabel=true` の場合も、アクセシブル名源は `label` のまま維持します。
- `placeholder` をアクセシブル名源として扱いません。
- `aria-label` の付与有無や付与方法は実装詳細であり、公開契約はアクセシブル名が `label` から決定されることに置きます。
- 検索アイコンは装飾要素であり、`aria-hidden="true"` を持ちます。
- clear button は `aria-label` として `clearButtonLabel` を持ちます。
- Combobox 用 ARIA は内部 input に反映されますが、popup / option 自体の整合性は上位レイヤの責務です。
- pass-through の対象は `role`、`aria-controls`、`aria-expanded`、`aria-autocomplete`、`aria-activedescendant`、`aria-busy` に限定します。
- `aria-describedby`、`aria-labelledby`、`aria-haspopup`、`aria-owns` など、そのほかの ARIA を本コンポーネントの公開入力としては受け付けません。
- フォーカス可視表示は input と clear button の `:focus-visible` で扱います。
- `.field::after` と `.clear-button::after` により、最小タッチ領域を補います。

本コンポーネントで重要なのは、**検索 UI を見た目だけで再現することではなく、実体として検索 input と clear 操作を維持すること**です。`div[role="searchbox"]` のような擬似入力には依存しません。

### フォーム関連の注意

`ui-search-field` は Form Associated Custom Element ではありません。したがって、外側フォームとの送信値連携は公開契約に含めません。

`name` は内部 input へ反映する公開入力ですが、現行契約では**フォーム参加の予約面ではなく、入力要素へ引き渡すメタデータ**として扱います。`name` を持つことによって、外側フォーム送信、`FormData` 連携、バリデーション参加が自動成立することは保証しません。

---

## Visual Contract

`ui-search-field` の視覚契約は、検索入力としての認知しやすさを維持しながら、**本文や見出しより前に出すぎない静かな入力面**として成立させることにあります。

### 情報順位

- 検索アイコンは入力種別の補助であり、主役ではありません。
- 入力テキストは常に主情報です。
- clear button は値が存在し、かつ編集可能なときにのみ補助操作として現れます。
- ラベルは `hideLabel=true` であっても意味上は残ります。

### レイアウト

ルートは縦方向レイアウトを取り、ラベルと field の間にギャップを持ちます。field は横方向に構成し、検索アイコンを先頭、input を主領域、clear button を末尾に配置します。

### 視覚仕様

- コントロール高の既定値は `--ui-search-field-height` により定義します。既定テーマでは `44px` を採用します。
- input の `height` と `line-height` はコントロール高と一致させます。
- input の `padding-block` は `0` とし、縦方向の文字位置を固定します。
- 入力面の既定背景は muted surface、既定境界線幅は `0px`、既定 border color は transparent です。
- 検索アイコンは左側に絶対配置し、入力本文の開始位置を侵食しません。
- clear button は右側に絶対配置し、入力本文の末尾と重なりません。
- input フォントはグローバルな文字メトリクス補正済みフォントを継承します。

本文近傍では、検索入力は導線として十分に知覚できれば足ります。常時強い境界線、持続的な発光、過度な立体表現には依存しません。

### フォーカス表示

input と clear button のフォーカスリングは `outline` と `outline-offset` で描画します。box-shadow 依存のフォーカス表示にはしません。

### 参照トークン

本コンポーネントのスタイル公開面は二層に分けます。

- **直接公開トークン**: `--ui-search-field-*` 系。`ui-search-field` の契約として利用者が直接上書きしてよい面です。
- **基盤依存トークン**: `--space-*`、`--fg-*`、`--bg-*`、`--icon-*` など。Design Token 基盤側の契約に従う参照先です。

本コンポーネントは、主として次のトークンに依存します。

| 用途              | トークン                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------- |
| 高さ              | `--ui-search-field-height`                                                                |
| 角丸              | `--ui-search-field-radius`                                                                |
| 背景              | `--ui-search-field-bg`                                                                    |
| 境界線幅          | `--ui-search-field-border-width`                                                          |
| 境界線色          | `--ui-search-field-border-color`                                                          |
| 影                | `--ui-search-field-shadow`                                                                |
| 入力文字サイズ    | `--ui-search-field-font-size`                                                             |
| アイコン色        | `--ui-search-field-icon-color`                                                            |
| 間隔              | `--space-*`                                                                               |
| 文字色            | `--fg-default` / `--fg-muted` / `--fg-subtle`                                             |
| hover 背景        | `--bg-hover`                                                                              |
| muted 背景        | `--bg-fill-muted`                                                                         |
| focus ring        | `--focus-ring-width` / `--focus-ring-color` / `--focus-ring-offset` / `--animation-focus` |
| touch target      | `--control-min-touch`                                                                     |
| opacity           | `--opacity-disabled`                                                                      |
| アイコンサイズ    | `--icon-sm` / `--icon-md`                                                                 |
| duration / easing | `--duration-fast` / `--ease-out`                                                          |

---

## 環境別の振る舞い

### Reduced Motion

`prefers-reduced-motion: reduce` 環境では、input と clear button の transition 時間を極小化します。意味差は保持しつつ、動きを抑制します。

### Forced Colors

`forced-colors: active` 環境では、`.field` の背景に `Field`、境界線に `FieldText`、input の文字色に `FieldText`、clear button に `ButtonText` を用います。独自トークンよりシステムカラーを優先します。

### Dark Mode

独自の dark mode 分岐は持ちません。暗色環境での見え方は、参照トークンの差し替えで吸収する前提です。

---

## 関連契約

### 入力・change 契約

`ui-search-field` は独自の検索実行イベントを公開しません。利用者は `input` と `change` を用いて上位ロジックへ接続します。property 代入はイベントの代替ではありません。

- `input` は逐次入力と clear 操作で発火します。
- `input` はホスト要素から新たに生成して再送出するイベントであり、ネイティブ `InputEvent` の詳細 payload を保存しません。
- `change` はネイティブ input の change タイミングに従います。
- `change` もホスト要素から新たに生成して再送出するイベントであり、元イベントの詳細 payload を保存しません。
- clear button クリックは `change` を発火させません。
- `disabled=true` または `readonly=true` の場合、`clear()` は no-op です。

利用者は Enter 押下による検索開始や debounce を、本コンポーネント外で制御します。

### clear 操作契約

clear 操作は、単なる見た目の消去ではなく、**状態更新と再フォーカスを伴う正規操作**です。

- `clear()` は `value` を空文字へ更新します。
- 内部 input の `value` も空文字へ同期します。
- `input` を 1 回だけ再送出します。
- その後、内部 input へフォーカスを戻します。
- `disabled` または `readonly` の場合、何もしません。

### Combobox 統合契約

`ui-search-field` は Combobox と組み合わせるための ARIA 受け皿を持ちますが、popup 表示や option 管理は行いません。公開する受け皿は限定的であり、Combobox に関連する ARIA 一式を包括的に受け入れるものではありません。

本コンポーネントは Combobox を実装するものではなく、**検索入力に対して上位コンポーネントが Combobox 意味論を付与できるようにする adapter 面**を提供するにとどまります。

| 入力                        | 反映先                  | 契約                               |
| --------------------------- | ----------------------- | ---------------------------------- |
| `inputRole`                 | `role`                  | 主用途は `combobox` です           |
| `inputAriaControls`         | `aria-controls`         | popup / listbox の ID を参照します |
| `inputAriaExpanded`         | `aria-expanded`         | 展開状態を外部から与えます         |
| `inputAriaAutocomplete`     | `aria-autocomplete`     | 補完方式を外部から与えます         |
| `inputAriaActivedescendant` | `aria-activedescendant` | 現在候補 ID を外部から与えます     |
| `inputAriaBusy`             | `aria-busy`             | 候補更新中状態を外部から与えます   |

利用者は、これらの属性を与えたからといって候補描画やキーボードナビゲーションが自動で成立することを期待しません。

### フォーム非統合契約

`ui-search-field` は検索入力 primitive であり、フォーム参加コンポーネントではありません。したがって、送信値統合、ネイティブバリデーション、`FormData` との一体化は責務外です。将来的にフォーム参加を検討する場合でも、現行の `name` 契約をそのまま拡張すると解釈しません。必要であれば別途明示的に契約を追加します。

### スタイル拡張契約

`ui-search-field` は `::part(...)` を公開していません。公開する拡張面は CSS Custom Properties に限定します。

利用者は `--ui-search-field-*` 系トークンおよび基盤トークンを通じて背景、境界線、影、寸法、色を調整できます。一方で、内部 class 名、Shadow DOM 構造、`.field`、`.icon`、`.clear-button` などの内部実装識別子には依存しません。

本コンポーネントは slot を公開しません。検索アイコンと clear アイコンも現行契約では差し替え面を持ちません。したがって、任意コンテンツの差し込み、内部装飾ノードの交換、内部レイアウトの再編成は公開拡張面に含めません。

---

## 境界条件

### ラベル欠落

`label` が空文字の場合、実装は接続時に開発時警告を出しますが、描画自体は継続し得ます。公開契約上は契約違反です。

### hide-label

`hideLabel=true` の場合、ラベルは視覚的に隠れますが、削除されません。`placeholder` のみをアクセシブル名源として扱う構成にはしません。

### property 直接代入

利用者が `value` を直接代入した場合、その更新は無音で反映されます。この操作によって `input` または `change` が自動発火することを期待しません。

### 値なし

`value=""` の場合、`clearButtonVisible` は `false` です。`clearable=true` でも clear button は表示しません。

### clearable=false

`clearable=false` の場合、値が存在しても clear button は表示しません。`focusClearButton()` も no-op です。

### readonly と disabled

`readonly=true` または `disabled=true` の場合、値が存在しても clear button は表示しません。`clear()` も no-op です。

### Combobox 属性のみ付与

`inputAriaControls` や `inputAriaExpanded` を与えても、`inputRole` を適切に与えなければ意味論としては不完全です。本コンポーネントは整合性を自動補正しません。

### 無効な参照 ID

`inputAriaControls` や `inputAriaActivedescendant` に存在しない ID を与えること自体は可能ですが、アクセシビリティ上の意味は未定義です。本コンポーネントは参照先の実在を検証しません。

### clear button へのフォーカス移動

`focusClearButton()` は clear button が可視のときのみ動作します。非表示状態では no-op です。

### clear button の DOM 実装

公開契約が保証するのは clear 操作の利用可能性であり、clear button ノードの常時存在、`hidden` 属性による実装、内部 class 名には依存しません。

---

## Storybook 契約

各 Story は見本ではなく、**契約確認点**として扱います。将来変更時には、次の契約を維持します。

| Story                          | 固定する契約                                                                                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Default`                      | 検索アイコンが存在し、内部 input が `type="search"` であり、初期状態で clear 操作が利用不能であり、アクセシブル名が `label` により決定され、入力高さ・line-height・padding-block の既定が固定されること |
| `ClearableState`               | 値あり状態で clear button が表示され、クリック時に `value` と内部 input 値が空文字となり、`input` が 1 回だけ再送出され、入力へ再フォーカスされること                                                   |
| `ComboboxAriaAndImperativeApi` | Combobox 用 ARIA が内部 input に反映され、`focus()` と `setSelectionRange()` が機能し、`focusClearButton()` で clear button に到達できること                                                            |
| `DisabledAndReadonlyBoundary`  | `readonly` と `disabled` のいずれでも clear button を表示しないこと                                                                                                                                     |
| `SurfaceBorderCustomization`   | CSS Custom Properties による背景・border width・border color の上書きが `.field` に反映されること                                                                                                       |

---

## 補足

`ui-search-field` の要点は、検索専用 input を華美に演出することではありません。**検索入力として必要な意味、消去、フォーカス、補助属性を安定した公開面として整理し、本文読解を邪魔しない静かな密度で提示すること**にあります。

したがって、今後の変更でも次の 5 点は崩さない方がよいです。

1. 実体は常にネイティブ `<input type="search">` であること。
2. `label` 必須契約を緩めず、アクセシブル名源を `label` に固定すること。
3. `value` を自己管理型の現在値として扱い、property 代入とイベント発火を分離すること。
4. clear 操作を単なる装飾ではなく、`value` 更新と再フォーカスを伴う正規操作として扱うこと。
5. Combobox 支援は限定的な属性受け皿に留め、候補表示責務と混在させないこと。

---

## 新規で追加を検討する価値がある機能

本節は、`ui-search-field` の責務を維持したまま、公開契約の安定性、アクセシビリティ統合、プラットフォーム適応性を高める観点から、**新規で追加を検討する価値がある機能**を整理するものです。

ここでいう「検討する価値がある」とは、単に便利であることではなく、**検索入力 primitive としての責務を壊さず、長期的な保守性を改善すること**を意味します。

### 最優先で検討する価値がある機能

#### 意味付き独自イベント

現行の `input` / `change` は互換的な公開面として有用ですが、元のネイティブイベント詳細を保持しません。したがって、アプリケーション統合用には、意味を明示した独自イベントを別途持つ余地があります。

たとえば、次のようなイベントを追加候補とします。

- `query-change`
- `query-commit`

これらは単なるイベント追加ではなく、**検索語更新**と**検索語確定**を文脈付きで扱うための公開面です。`detail` には少なくとも `value` と `source` を含め、`source` は `user` / `clear` / `programmatic`、または `change` / `enter` / `blur` のように意味単位で設計します。

この機能を追加する場合でも、既存の `input` / `change` を置き換えません。ネイティブ互換面とアプリケーション意味面を分離して共存させます。

#### 外部説明との関連付け API

現行契約では、`aria-describedby` などの説明参照面を公開していません。一方で、検索入力には補助説明、ショートカット案内、補足状態、外部エラー文言との関連付けが必要になる場合があります。

そのため、**説明文自体を描画する責務を持たず、外部説明ノードとの関連付けだけを許可する API**には追加価値があります。

候補は次のいずれかです。

- `inputAriaDescribedby`
- `descriptionIds`

どちらを採る場合でも、責務は「説明文の描画」ではなく「説明関係の接続」に限定します。これにより、検索入力 primitive の責務を維持したままアクセシビリティ統合を強化できます。

#### ネイティブ入力ヒントの pass-through

検索入力では、検索ロジックそのものよりも、IME やモバイルキーボードに対する入力ヒントの有無が体験差として現れます。したがって、ネイティブ `<input>` が持つ入力ヒント面を限定的に公開する価値があります。

候補は次のとおりです。

- `enterKeyHint`
- `inputMode`
- `spellcheck`
- `autocapitalize`

これらは検索責務を拡張するのではなく、**ネイティブ input としての素性をより適切に公開するための追加面**として扱います。

### 条件付きで検討する価値がある機能

#### Form Associated Custom Element 化

将来的に、検索入力を外側フォーム送信や `FormData` と統合したい要件が明確に生じる場合に限り、Form Associated Custom Element 化を検討できます。

ただし、これは `ui-search-field` の責務を大きく変える変更です。現行契約ではフォーム非統合を明示しているため、採用する場合は小規模拡張として扱わず、**責務の再定義を伴う変更**として扱います。

#### `clear()` の派生 API

現行の `clear()` は、値消去、`input` 再送出、再フォーカスを一体化した正規操作です。この設計は妥当ですが、将来的に無音 clear や非フォーカス clear が必要になる可能性はあります。

その場合は、たとえば次のような派生 API を検討できます。

- `resetValue()`
- `setValueSilently()`

ただし、現時点では API 数を増やすよりも、まず意味付きイベント契約を整える方が優先です。

#### アイコン差し替え面

ブランド要件や密度調整のために、検索アイコンまたは clear アイコンの差し替えを求める可能性はあります。その場合は slot または限定的な token 面を検討できます。

ただし、これは視覚契約の安定性を崩しやすく、本文読解の静けさを損ねる可能性があります。したがって、条件付きの検討項目に留めます。

### 追加しない方がよい機能

#### suggestion listbox / popup の内蔵

候補一覧や popup の描画は、検索入力 primitive の責務ではありません。これを内蔵すると、`ui-search-field` は検索入力本体ではなく検索 UI 複合体へ変質します。したがって、この機能は本コンポーネントへ追加しません。

#### loading state / results count / live region の内蔵

検索中表示、件数表示、結果通知の live region は、検索結果面または dialog 側の責務です。`ui-search-field` へ取り込むと、入力 primitive と結果表示責務が混在します。したがって、この機能は本コンポーネントへ追加しません。

#### debounce、Enter 検索、Escape によるキャンセルや clear の内蔵

これらは入力 primitive 単体ではなく、overlay、dialog、候補表示、検索実行戦略と組み合わさって初めて意味が確定する挙動です。したがって、本コンポーネントではなく上位レイヤで扱います。

#### 履歴候補や最近の検索語の内蔵

履歴管理は UI primitive の責務ではなく、アプリケーション状態、保存方針、プライバシー方針に属します。したがって、この機能は本コンポーネントへ追加しません。

### 本節の扱い

本節に記載した機能は、すべて将来の追加候補であり、現時点の公開契約には含めません。採用する場合は、**責務範囲に適合するか**、**既存の公開契約と矛盾しないか**、**Storybook で固定可能か**の 3 点を満たしたうえで追加します。

---

## 現行実装で未対応の事項

本節は、現行の `search-field.ts` および `search-field.stories.ts` を基準として、**周辺機能としてしばしば期待されるが、現時点では公開契約に含めていない事項**を整理するものです。

### suggestion listbox / popup の描画

現行実装は Combobox 用 ARIA の受け皿を持ちますが、候補一覧や popup の描画自体は行いません。

### 候補ナビゲーションのキーボード制御

Arrow key、Enter、Escape による候補移動、決定、閉鎖などのロジックは実装していません。

### search イベントの独自公開

ネイティブ `search` イベントや Enter 押下時の独自検索イベントは公開していません。検索開始契約は上位レイヤの責務です。

### フォーム送信との統合保証

Form Associated Custom Element ではないため、外側フォームとの送信値統合は保証しません。

### ARIA 値と参照先の整合性検証

`inputRole` や各種 `inputAria*` はそのまま反映しますが、値の妥当性や参照先の実在は検証しません。

### 外部説明参照の pass-through

`aria-describedby` に相当する公開入力は持ちません。したがって、外部説明文、補助文、エラー文言、ショートカット案内との関連付けを `ui-search-field` 単体では完結できません。

### ネイティブ入力ヒントの pass-through

`enterkeyhint`、`inputmode`、`spellcheck`、`autocapitalize` など、ネイティブ input の入力ヒント属性を公開入力として受け付けません。

### 意味付き独自イベント

`query-change` や `query-commit` のような、検索語更新・確定を意味単位で通知する独自イベントは公開していません。

### 値更新専用の派生 API

`resetValue()` や `setValueSilently()` のような、`clear()` と異なり再フォーカスや `input` 再送出を伴わない派生 API は公開していません。

### slot / アイコン差し替え面

slot による任意コンテンツ差し込み、または検索アイコン・clear アイコンの差し替え面は公開していません。

### `::part(...)` による外部装飾面

現行実装は `part` を公開していません。内部構造に依存しない外部装飾面は CSS Custom Properties に限定されます。

### 本節の扱い

本節に記載した事項は、現行公開契約として利用者が依存してよいものではありません。これらを採用する場合は、実装、Storybook、契約書の 3 点を同時に更新します。
