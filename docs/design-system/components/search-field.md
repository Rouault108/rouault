# Search Field

## 概要

本書は、`ui-search-field` の公開契約、状態モデル、アクセシビリティ、視覚契約、および関連する境界条件を整理するものです。

`ui-search-field` は、primitive 単体としては**検索専用の自己管理型 input primitive** です。
ただし、`ui-search-dialog` など上位コンポーネントが controlled な query を所有する場合、本コンポーネントはその**表示面および操作面**として接続してよいものとします。

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
- 現行実装で未対応の事項

一方で、本書は次の事項を扱いません。

- 検索アルゴリズム自体
- 検索候補の取得、整形、ランキング
- suggestion listbox / popup の描画
- URL 同期や検索結果一覧の制御
- 入力値の debounce、正規化、トリミング、履歴管理
- フォーム送信、検索実行、サーバー問い合わせの上位制御
- 意味付き独自イベント（`query-change`、`query-commit` など）
- Form Associated Custom Element としてのフォーム統合
- `clear()` とは別の値更新専用派生 API
- slot やトークンによるアイコン差し替え面
- エラー表示、履歴候補、検索結果件数、live region の提示そのもの

これらは上位レイヤまたは別コンポーネントの責務です。

ただし、外部説明ノードとの関連付け、およびネイティブ input が本来持つ入力ヒント属性の反映は、`ui-search-field` の責務を壊さない範囲の公開契約として扱います。

---

## 公開契約

`ui-search-field` は、`label`、`hideLabel`、`name`、`placeholder`、`value`、`autocomplete`、`disabled`、`readonly`、`clearable`、`clearButtonLabel`、`inputRole`、`inputAriaControls`、`inputAriaExpanded`、`inputAriaAutocomplete`、`inputAriaActivedescendant`、`inputAriaBusy`、`inputAriaDescribedby`、`enterKeyHint`、`inputMode`、`spellcheck`、`autocapitalize` を公開入力として扱います。また、`clearButtonVisible` を**公開読み取り状態**として扱います。内部実装は検索アイコン、`<input type="search">`、clear button を持つ複合構造ですが、利用者は `ui-search-field` を契約単位として扱います。

本書では契約強度を次の 4 段階で扱います。

- **必須**: 利用者が満たさなければならない入力です。
- **保証**: 利用者が依存してよい安定挙動です。
- **許容**: 値は受け取りますが、意味の妥当性は利用者責務です。
- **契約外**: 実装上は反映され得ますが、意味や将来互換を保証しません。

### 入力契約

| 名前                        | 種別                                        | 必須   | 内容                              | 契約                                                                 |
| --------------------------- | ------------------------------------------- | ------ | --------------------------------- | -------------------------------------------------------------------- |
| `label`                     | property / attribute                        | はい   | ラベル文字列                      | 空文字は契約違反です                                                 |
| `hideLabel`                 | property / attribute (`hide-label`)         | いいえ | ラベルの視覚非表示                | `true` の場合もアクセシブル名は維持します                            |
| `name`                      | property / attribute                        | いいえ | 内部 input の name                | 文字列をそのまま内部 input に反映します。フォーム参加は保証しません  |
| `placeholder`               | property / attribute                        | いいえ | プレースホルダー                  | 補助文言であり、ラベルの代替にはしません                             |
| `value`                     | property / attribute                        | いいえ | 入力値                            | 自己管理型の現在値です。property 代入は無音で反映します              |
| `autocomplete`              | property / attribute                        | いいえ | 自動補完ヒント                    | 既定値は `off` です                                                  |
| `disabled`                  | property / attribute                        | いいえ | 不活性状態                        | `true` の場合、入力と clear を禁止します                             |
| `readonly`                  | property / attribute                        | いいえ | 読み取り専用状態                  | `true` の場合、編集と clear を禁止します                             |
| `clearable`                 | property / attribute                        | いいえ | clear 機能の有効化                | 既定値は `true` です                                                 |
| `clearButtonLabel`          | property / attribute (`clear-button-label`) | いいえ | clear button のアクセシブル名     | 既定値は `検索をクリア` です                                         |
| `inputRole`                 | property のみ                               | いいえ | 内部 input の role                | 主用途は `combobox` です                                             |
| `inputAriaControls`         | property のみ                               | いいえ | 関連 popup / listbox ID           | 内部 input の `aria-controls` に反映します                           |
| `inputAriaExpanded`         | property のみ                               | いいえ | 展開状態                          | `true` / `false` / 空文字を受理します                                |
| `inputAriaAutocomplete`     | property のみ                               | いいえ | 補完方式                          | `list` / `both` / `inline` / `none` / 空文字を受理します             |
| `inputAriaActivedescendant` | property のみ                               | いいえ | 現在アクティブな候補 ID           | 内部 input の `aria-activedescendant` に反映します                   |
| `inputAriaBusy`             | property のみ                               | いいえ | 候補更新中状態                    | `true` / `false` / 空文字を受理します                                |
| `inputAriaDescribedby`      | property のみ                               | いいえ | 外部説明ノード ID 群              | 内部 input の `aria-describedby` に反映します。説明文自体は描画しません |
| `enterKeyHint`              | property / attribute (`enterkeyhint`)       | いいえ | 仮想キーボードの Enter 表示ヒント | 内部 input の `enterkeyhint` に反映します                            |
| `inputMode`                 | property / attribute (`inputmode`)          | いいえ | 入力モードヒント                  | 内部 input の `inputmode` に反映します                               |
| `spellcheck`                | property / attribute                        | いいえ | スペルチェック可否                | 内部 input の `spellcheck` に反映します                              |
| `autocapitalize`            | property / attribute                        | いいえ | 自動大文字化ヒント                | 内部 input の `autocapitalize` に反映します                          |

### 公開状態

| 名前 | 種別 | 契約 |
| --- | --- | --- |
| `clearButtonVisible` | readonly property | `clearable && !disabled && !readonly && value.length > 0` のときのみ `true` です。保証するのは **clear 操作が視覚的かつ操作的に利用可能であること** であり、内部 button ノードの保持方法は公開しません。 |

### 公開メソッド

| 名前 | 種別 | 契約 |
| --- | --- | --- |
| `focus(options?)` | method | 内部 input にフォーカスを委譲します。 |
| `blur()` | method | 内部 input からフォーカスを外します。 |
| `select()` | method | 内部 input の全選択を行います。 |
| `setSelectionRange(start, end, direction?)` | method | 内部 input の選択範囲を設定します。 |
| `clear()` | method | 編集可能時のみ `value` を空文字へ更新し、内部 input に同期し、`input` を 1 回通知し、内部 input へ再フォーカスします。`disabled=true` または `readonly=true` の場合は no-op です。 |
| `focusClearButton()` | method | `clearButtonVisible === true` のときのみ clear button にフォーカスします。それ以外は no-op です。 |

これらのメソッドは、**接続済みかつ描画済みのインスタンス**に対して呼び出すことを前提とします。未接続状態に対する待機・再試行・独自例外吸収は契約に含めません。

### イベント契約

`ui-search-field` が公開するイベントは、内部 input のネイティブイベント転送ではありません。**ホスト要素から新たに通知する host notification** です。利用者が依存してよいのは、**イベント種別**と**発火時点で同期済みの `ui-search-field.value`** に限ります。`InputEvent.data`、`inputType`、`isComposing`、詳細な `composedPath()`、元の `target` などの保持は保証しません。

| 名前 | 発火条件 | bubbles | composed | 契約 |
| --- | --- | --- | --- | --- |
| `input` | 内部 input の入力時、または `clear()` 実行時 | あり | あり | `value` 同期後にホスト要素から通知します。 |
| `change` | 内部 input の `change` 時 | あり | あり | `value` 同期後にホスト要素から通知します。 |
| `focus` | 内部 input が focus した時 | なし | なし | ホスト要素から通知します。ネイティブ `focus` の完全転送ではありません。 |
| `blur` | 内部 input が blur した時 | なし | なし | ホスト要素から通知します。ネイティブ `blur` の完全転送ではありません。 |

`clear()` は `input` を通知しますが、`change` は通知しません。

### 属性反映契約

公開入力のうち、`label`、`hideLabel`、`name`、`placeholder`、`value`、`autocomplete`、`disabled`、`readonly`、`clearable`、`clearButtonLabel`、`enterKeyHint`、`inputMode`、`spellcheck`、`autocapitalize` は property と attribute の両面から入力できます。ただし、`inputRole` および各種 `inputAria*` は **property 専用**です。

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
| `inputAriaDescribedby`      | なし                 | なし    | property のみ                      |
| `enterKeyHint`              | `enterkeyhint`       | なし    | 内部 input に反映します            |
| `inputMode`                 | `inputmode`          | なし    | 内部 input に反映します            |
| `spellcheck`                | `spellcheck`         | なし    | 内部 input に反映します            |
| `autocapitalize`            | `autocapitalize`     | なし    | 内部 input に反映します            |

### 責務範囲

責務範囲には、内部検索 input の描画、検索アイコンの配置、ラベルの視覚非表示処理、clear button の出し分け、公開状態の提供、入力イベントの再送出、フォーカス委譲、限定的な Combobox 用 ARIA 属性の反映、外部説明ノードとの関連付け、およびネイティブ入力ヒント属性の反映を含みます。

一方で、候補一覧の開閉、候補選択ロジック、検索実行タイミング、検索 API 呼び出し、URL 同期、検索結果面の更新、説明文やエラー文言そのものの描画、意味付き独自イベント、フォーム送信参加、値更新専用の派生 API、slot やアイコン差し替え面は責務に含めません。

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

ルートは `:host` です。Shadow DOM 内部には、**ラベル**、**検索 input**、**検索アイコン**、**clear 操作用 button** が存在します。公開契約が保証するのは役割と意味であり、内部 class 名、ノード数、アイコン実装、`hidden` 属性の有無、絶対配置か否かといった実装方式ではありません。

下記は説明用の概略であり、**参考構造**です。これ自体を公開 DOM 契約とはみなしません。

```text
<ui-search-field>
  #shadow-root
    <label>...</label>
    <container>
      <search-icon aria-hidden="true" />
      <input type="search" />
      <button type="button">clear</button>
    </container>
</ui-search-field>
```

`ui-search-field` は `delegatesFocus: true` を有効にし、ホストへの `focus()` を内部 input へ委譲します。公開メソッドは Shadow DOM 内探索の代替であり、利用者は内部ノードの直接取得に依存しません。

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
- pass-through の対象は `role`、`aria-controls`、`aria-expanded`、`aria-autocomplete`、`aria-activedescendant`、`aria-busy`、`aria-describedby` に限定します。
- `inputAriaDescribedby` は説明関係の接続のみを扱います。説明文、エラー文言、ショートカットヒント自体の描画責務は持ちません。
- `aria-labelledby`、`aria-haspopup`、`aria-owns` など、そのほかの ARIA を本コンポーネントの公開入力としては受け付けません。
- `enterKeyHint`、`inputMode`、`spellcheck`、`autocapitalize` は支援技術を含む入力環境へのヒントとして内部 input に反映されます。
- フォーカス可視表示は input と clear button の `:focus-visible` で扱います。
- `.field::after` と `.clear-button::after` により、最小タッチ領域を補います。

本コンポーネントで重要なのは、**検索 UI を見た目だけで再現することではなく、実体として検索 input と clear 操作を維持すること**です。`div[role="searchbox"]` のような擬似入力には依存しません。

### フォーム関連の注意

`ui-search-field` は Form Associated Custom Element ではありません。したがって、外側フォームへの送信値統合、`FormData` 連携、ネイティブバリデーション参加は公開契約に含めません。

`name` は内部 input へ渡す補助入力であり、フォーム統合の予約面ではありません。将来フォーム参加を導入する場合でも、現行の `name` 契約を自動拡張したものとして扱いません。

---

## Visual Contract

`ui-search-field` の視覚契約は、**検索開始点として即時に認知できること**と、**本文領域の主情報順位を逆転させないこと**の両立にあります。したがって、検証対象は、情報順位、寸法、余白、状態差、フォーカス可視性、環境適応の 6 点です。

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

本文近傍での既定表示は、**低彩度・低装飾・明確なフォーカス可視性**を原則とします。境界線、影、hover 差、アニメーションは状態差の判別に必要な最小限に留め、常時の強調表現には使いません。

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

クエリ正規化、空判定、tokenization、検索実行タイミングの意味論は本コンポーネントの責務ではなく、上位レイヤまたは shared `search-core` に従います。

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
| `inputAriaDescribedby`      | `aria-describedby`      | 外部説明ノード ID 群を参照します   |

利用者は、これらの属性を与えたからといって候補描画やキーボードナビゲーションが自動で成立することを期待しません。

### 説明関連付け契約

`inputAriaDescribedby` は、補助説明、ショートカット案内、補足状態、外部エラー文言などの**説明ノードとの接続面**です。`ui-search-field` は関連付けのみを扱い、説明文そのものの描画責務は持ちません。

### ネイティブ入力ヒント契約

`enterKeyHint`、`inputMode`、`spellcheck`、`autocapitalize` は、検索責務を拡張するための機能ではなく、**ネイティブ `<input>` が本来持つ入力環境ヒントを公開するための pass-through 面**です。これらは内部 input に反映されますが、入力値の正規化、変換、検索確定の意味付けは行いません。

### フォーム非統合契約

`ui-search-field` は検索入力 primitive であり、フォーム参加コンポーネントではありません。したがって、送信値統合、ネイティブバリデーション、`FormData` との一体化は責務外です。将来的にフォーム参加を検討する場合でも、現行の `name` 契約をそのまま拡張すると解釈しません。必要であれば別途明示的に契約を追加します。

### スタイル拡張契約

`ui-search-field` は `::part(...)` を公開していません。公開する拡張面は CSS Custom Properties に限定します。

利用者は `--ui-search-field-*` 系トークンおよび基盤トークンを通じて背景、境界線、影、寸法、色を調整できます。一方で、内部 class 名、Shadow DOM 構造、`.field`、`.icon`、`.clear-button` などの内部実装識別子には依存しません。

本コンポーネントは slot を公開しません。検索アイコンと clear アイコンも現行契約では差し替え面を持ちません。したがって、任意コンテンツの差し込み、内部装飾ノードの交換、内部レイアウトの再編成は公開拡張面に含めません。

### `ui-search-dialog` 統合契約

`ui-search-field` は primitive 単体としては**自己管理型 input** です。ただし、`ui-search-dialog` のような上位コンポーネントが controlled な `query` を所有する場合、`ui-search-field` はその**表示面**として接続してよいものとします。

この統合において、次を固定します。

- 上位コンポーネントは `value` property へ外部状態を再反映できます。
- `value` property 代入は無音反映であり、外部状態同期の妨げになりません。
- ユーザー編集時は、同期済み `value` を伴う `input` event をホストから通知します。
- `focus()` は検索入力への focus 委譲 API として利用できます。
- `focusClearButton()` は `clearButtonVisible === true` の場合のみ利用可能です。
- `clearButtonVisible` は clear 操作の可用性判定に用いてよく、内部 button ノードの存在判定には用いません。

したがって、`ui-search-field` は自己管理型 primitive でありながら、上位の controlled state と接続可能な入力面として利用できます。

---

## 境界条件

### ラベル欠落または空文字

`label` の欠落または空文字は契約違反です。実装が警告のみで描画を継続しても、その状態はサポート対象ではありません。

### `value` の property 直接代入

`value` の property 直接代入は無音更新です。この操作によって `input` または `change` が自動通知されることを期待しません。

### `clear()` の no-op 条件

`disabled=true` または `readonly=true` の場合、`clear()` は no-op です。

### `focusClearButton()` の no-op 条件

`clearButtonVisible === false` の場合、`focusClearButton()` は no-op です。

### ARIA 参照先の不整合

`inputAriaControls` または `inputAriaActivedescendant` に不正な ID を与えること自体は可能ですが、意味妥当性は利用者責務です。本コンポーネントは参照先の実在を検証しません。

### 契約外 ARIA 値

`inputRole`、`inputAriaExpanded`、`inputAriaAutocomplete`、`inputAriaBusy` に契約外の値を与えた場合、値は反映され得ますが、意味や互換性は保証しません。

---

## Storybook 契約

各 Story は見本ではなく、**契約確認点**として扱います。将来変更時には、次の契約を維持します。

| Story                          | 固定する契約                                                                                                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Default`                      | 検索アイコンが存在し、内部 input が `type="search"` であり、初期状態で clear 操作が利用不能であり、アクセシブル名が `label` により決定され、入力高さ・line-height・padding-block の既定が固定されること      |
| `ClearableState`               | 値あり状態で clear button が表示され、クリック時に `value` と内部 input 値が空文字となり、`input` が 1 回だけ再送出され、入力へ再フォーカスされること                                                        |
| `ComboboxAriaAndImperativeApi` | Combobox 用 ARIA が内部 input に反映され、`focus()` と `setSelectionRange()` が機能し、`focusClearButton()` で clear button に到達できること                                                                 |
| `DescriptionAssociation`       | `inputAriaDescribedby` が内部 input の `aria-describedby` に反映され、説明ノードの描画責務を追加しないこと                                                                                                   |
| `NativeInputHints`             | `enterKeyHint`、`inputMode`、`spellcheck`、`autocapitalize` が内部 input に反映され、検索確定ロジックや入力値変換を追加しないこと                                                                             |
| `DisabledAndReadonlyBoundary`  | `readonly` と `disabled` のいずれでも clear button を表示せず、`clear()` が no-op であること                                                                                                                 |
| `SurfaceBorderCustomization`   | CSS Custom Properties による背景・border width・border color の上書きが `.field` に反映されること                                                                                                            |

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
