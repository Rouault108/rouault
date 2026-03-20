# Radio

## 概要

本書は、`ui-radio` および `ui-radio-group` の公開契約、状態モデル、アクセシビリティ、視覚契約を整理するものです。

`ui-radio` は、**同一グループ内で排他的な選択を成立させる単一選択コンポーネント**です。単に丸い選択 UI を描画するのではなく、**どの要素が選択状態を持つか**、**同一 **``** を持つ要素群をどの範囲でグループと見なすか**、**フォーム送信値をいつ持つか**、**キーボード移動と roving tabindex をどのように同期するか**を公開契約として固定します。

一方、`ui-radio-group` は選択状態そのものを保持するコンポーネントではありません。`role="radiogroup"` の付与、グループラベルの付与、`required` 時の妥当性判定、グループ単位のエラーメッセージ表示を担うコンテナです。排他選択の実体は `ui-radio` 側にあり、`ui-radio-group` はそれを意味論と検証の両面から補助します。

Rouault における radio は、読みの流れを壊す強い UI ではなく、**比較、選択、確定のための静かな判断装置**として振る舞う必要があります。したがって本契約では、選択の明瞭さ、フォーカスの追跡可能性、エラー時の説明可能性を維持しつつ、**「没入して読む」ことのできるデザイン**を損なわないことを重視します。

---

## 適用範囲

本書は、`ui-radio` および `ui-radio-group` の次の事項を対象とします。

- 公開契約
- 状態モデル
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 関連契約
- 境界条件
- Storybook 契約
- 契約が不明瞭な点
- 新規で追加を検討する価値がある機能
- 固定済みだが現行実装または検証へ未反映の事項

一方、本書は次の事項を扱いません。

- どの選択肢集合を radio で表現すべきかという画面設計判断
- 選択肢文言そのもののライティング規約
- グループ単位の業務バリデーションロジックの生成
- ラベルと補助説明文のレイアウト全体設計
- 送信先 API や保存結果の通知設計
- フォーム全体の送信・取消フロー

これらは上位レイヤまたは別コンポーネントの責務です。

---

## 公開契約

### 公開入力

`ui-radio` は、`checked`、`name`、`value`、`label`、`disabled`、`invalid`、`errorMessage` を公開入力として扱います。`ui-radio-group` は、`label`、`required`、`invalid`、`errorMessage` を公開入力として扱います。

`ui-radio-group` は ``** を公開入力として持ちません**。単一選択グループの排他境界とフォーム送信名は、常に各 `ui-radio` の `name` によって定義します。

`ui-radio` は Form-Associated Custom Element として実装されており、`checked === true`、`disabled === false`、`name !== ''` のときにのみフォーム値を持ちます。`ui-radio-group` 自体はフォーム関連付けを持たず、送信値を持ちません。

`ui-radio` の排他制御は、`ui-radio-group` への所属ではなく、**同一 **``** を持つ **``** 群の探索**によって成立します。したがって、`ui-radio-group` を用いない `div[role="radiogroup"]` 構成でも、同一 `name` であれば排他選択は成立します。逆に、`ui-radio-group` 内に置かれていても `name` が揃っていなければ単一グループとしては扱いません。

このため、`name` の真実源は常に `ui-radio` 側にあります。`ui-radio-group` は意味論上のグループを表しますが、排他境界を上書きする設定入力は持ちません。

### 入力契約（`ui-radio`）

| 名前             | 種別                                     | 必須  | 内容            | 契約                                     |
| -------------- | -------------------------------------- | --- | ------------- | -------------------------------------- |
| `checked`      | property / attribute                   | いいえ | 選択状態          | `true` のとき選択状態です                       |
| `name`         | property / attribute                   | いいえ | フォーム名・グループ識別子 | 同一 `name` の `ui-radio` 群が排他的に扱われます     |
| `value`        | property / attribute                   | いいえ | フォーム送信値       | 既定値は `on` です                           |
| `label`        | property / attribute                   | いいえ | 可視ラベル         | 空文字列の場合、内部ラベル要素は描画しません                 |
| `disabled`     | property / attribute                   | いいえ | 無効状態          | `true` の場合、選択不可・フォーム送信除外です             |
| `invalid`      | property / attribute                   | いいえ | エラー状態         | `errorMessage` と組み合わせて使用する前提です         |
| `errorMessage` | property / attribute (`error-message`) | いいえ | エラー文言         | `invalid=true` かつ非空文字列の場合に表示と妥当性へ反映します |

### 入力契約（`ui-radio-group`）

| 名前             | 種別                                     | 必須  | 内容        | 契約                                          |
| -------------- | -------------------------------------- | --- | --------- | ------------------------------------------- |
| `label`        | property / attribute                   | いいえ | グループラベル   | 非空時は `radiogroup` の `aria-label` として使用します   |
| `required`     | property / attribute                   | いいえ | 必須選択      | `true` の場合、配下の `ui-radio` から 1 つ以上の選択を要求します |
| `invalid`      | property / attribute                   | いいえ | グループエラー状態 | `errorMessage` と組み合わせてエラー表示に使用します           |
| `errorMessage` | property / attribute (`error-message`) | いいえ | グループエラー文言 | `invalid=true` かつ非空文字列の場合に表示します             |

### 作者入力エラー通知契約

`ui-radio-group` 配下の `name` 不一致や空 `name` の混在は、**作者入力エラー**として扱います。この種別は利用者入力エラーではないため、`required` 妥当性、`invalid` 表示、フォーム送信エラーとは切り離して扱います。

通知方式は、設計判断として次のように固定します。

- **本番実行時に例外を throw しません。**
- **利用者向け UI エラーとして表示しません。**
- **子要素の **``** を自動補完・自動修正しません。**
- **開発時に限り診断警告を出します。**

開発時診断は、作者が構造不整合に気付くための補助であり、実行継続を前提とします。したがって、この警告は recovery を要求する fatal error ではなく、**契約違反を明示する non-fatal diagnostic** として扱います。

### `name` 所有契約

`name` は `ui-radio-group` ではなく、各 `ui-radio` が所有する公開入力です。これは次の設計判断を意味します。

- 排他制御の境界は `ui-radio-group` ではなく `ui-radio.name` で決まります。
- フォーム送信名も `ui-radio.name` で決まります。
- `ui-radio-group` は `name` の不足補完、暗黙継承、自動上書きを行いません。
- 単一選択グループとして公開する場合、作者は配下 `ui-radio` に同一の非空 `name` を明示しなければなりません（MUST）。

この契約により、`name` の真実源は常に 1 つに保たれます。`ui-radio-group` を導入しても、`ui-radio.name` と別の設定源が増えません。

### スロット契約

| 対象               | 名前     | 種別   | 位置づけ | 内容                      |
| ---------------- | ------ | ---- | ---- | ----------------------- |
| `ui-radio`       | なし     | -    | -    | `ui-radio` はスロットを公開しません |
| `ui-radio-group` | 既定スロット | slot | 正規入力 | 配下の `ui-radio` 群を受け取ります |

`ui-radio-group` の既定スロットは、原則として `ui-radio` を受け取ることを想定します。任意要素を配置すること自体は技術的に可能ですが、グループ妥当性判定は `querySelectorAll('ui-radio')` に依存しているため、選択項目として扱われるのは `ui-radio` のみです。

また、`ui-radio-group` の `required` 判定対象は **直下子要素に限定されません**。light DOM 配下のすべての `ui-radio` descendant を対象とし、ラッパー要素を 1 段以上挟んでいても検証対象に含みます。したがって、グループ境界を設計する際は、見た目上の入れ子ではなく、**どの **``** が同じ **``** の descendant であるか** を基準に扱います。

### 公開メソッド

#### `ui-radio`

| 名前                 | 種別     | 契約                            |
| ------------------ | ------ | ----------------------------- |
| `focus(options?)`  | method | 内部 `.control` 要素にフォーカスを委譲します  |
| `blur()`           | method | 内部 `.control` 要素からフォーカスを外します  |
| `checkValidity()`  | method | `ElementInternals` の妥当性を返します  |
| `reportValidity()` | method | `ElementInternals` の妥当性を報告します |

#### `ui-radio-group`

| 名前                 | 種別     | 契約                                                                                               |
| ------------------ | ------ | ------------------------------------------------------------------------------------------------ |
| `checkValidity()`  | method | `required` 条件に基づき、配下の `ui-radio` に選択があるかを返します                                                    |
| `reportValidity()` | method | グループ妥当性を評価し、`invalid` と `errorMessage` を同期します。`errorMessage` が空のときのみ既定文言を補い、妥当化後は既定文言に限って自動解除します |

### イベント契約

`ui-radio` は、**ユーザー操作によって未選択から選択へ変化したときのみ** `change` と `input` を発火します。既に選択済みの radio を再度操作した場合、または `disabled=true` の場合、これらのイベントは発火しません。

`checked` の programmatic な変更、すなわち外部からの property 代入や attribute 操作は、`change` / `input` の発火条件に含みません。イベントは `_select()` を通過したユーザー起点の選択操作でのみ発火します。

`ui-radio` がグループ内の他要素を未選択へ変更した場合、未選択化された側は `change` / `input` を発火しません。イベントの起点は、常に新たに選択された `ui-radio` のみです。

`ui-radio-group` は独自のカスタムイベントを公開しません。`required=true` の場合、配下からバブルしてきた `change` を受けて内部的に `reportValidity()` を行います。

`reportValidity()` は、`errorMessage` が空の場合にのみ既定文言 `いずれか1つを選択してください。` を補います。利用者が独自文言を与えている場合、その文言は妥当化後も自動では消去しません。

### 属性反映契約

#### `ui-radio`

| property       | attribute       | reflect | 備考                        |
| -------------- | --------------- | ------- | ------------------------- |
| `checked`      | `checked`       | あり      | boolean attribute として扱います |
| `name`         | `name`          | あり      | グループ識別に使用します              |
| `value`        | `value`         | あり      | 既定値は `on` です              |
| `label`        | `label`         | あり      | 可視ラベルを表します                |
| `disabled`     | `disabled`      | あり      | boolean attribute として扱います |
| `invalid`      | `invalid`       | あり      | boolean attribute として扱います |
| `errorMessage` | `error-message` | あり      | エラーメッセージを表します             |

#### `ui-radio-group`

| property       | attribute       | reflect | 備考                        |
| -------------- | --------------- | ------- | ------------------------- |
| `label`        | `label`         | なし      | グループラベルです                 |
| `required`     | `required`      | あり      | boolean attribute として扱います |
| `invalid`      | `invalid`       | あり      | boolean attribute として扱います |
| `errorMessage` | `error-message` | なし      | グループエラーメッセージです            |

### グループ化契約

`ui-radio` のグループメンバー探索は、次の規則に従います。

1. `name === ''` の場合、その `ui-radio` 単体を 1 要素グループとして扱います。
2. `closest('form')` が存在する場合、そのフォーム内の同一 `name` の `ui-radio` 群をグループとして扱います。
3. フォーム祖先が存在しない場合、同一 root（`Document` または `ShadowRoot`）内の同一 `name` の `ui-radio` 群をグループとして扱います。

したがって、**同一 **``** であっても root が異なる場合は同一グループになりません**。また、`ui-radio-group` はこの探索範囲を変更しません。

### 責務範囲

`ui-radio` の責務範囲には、内部コントロールの描画、選択状態の保持、同一 `name` グループの排他制御、roving tabindex、キーボード移動、フォーム値同期、ARIA 属性反映、エラーメッセージ表示を含みます。

`ui-radio-group` の責務範囲には、`radiogroup` の意味付け、グループラベルの供給、`required` 妥当性判定、グループエラーメッセージ表示を含みます。

一方、`ui-radio-group` は選択状態のソースオブトゥルースではありません。配下 `ui-radio` の選択値の一元公開、`name` の保持、説明文レイアウトの組み立て、フォーム送信結果の生成は責務に含みません。

ただし、次の 2 点は **構造整合契約** として固定します。

- 同一 `ui-radio-group` を構成する `ui-radio` は、原則として単一の非空 `name` を共有します。
- 同一グループ内で `checked=true` は高々 1 要素までに正規化します。

これらは `ui-radio-group` が値の所有者になることを意味しません。あくまで、**意味論上 1 つの単一選択グループとして文書化された構造が、実行時の排他境界とも一致すること** を保証するための契約です。

---

## 状態モデル

`ui-radio` の主要状態は、**選択されているか、操作可能か、エラー状態か、フォーム値を持つか** によって読み分けます。`ui-radio-group` の主要状態は、``** 条件を満たしているか、グループエラーを露出しているか** によって読み分けます。

### 1. 基本状態

最小状態は、`checked=false`、`disabled=false`、`invalid=false`、`label` が任意、`name` が任意の状態です。この状態では未選択の radio として描画されます。

### 2. 選択状態

`checked=true` の場合、その `ui-radio` は選択状態です。選択状態ではリング型の視覚差分を持ち、`aria-checked="true"` を持ちます。グループ内で新たにこの状態へ遷移したとき、同一グループ内の他の選択済み radio は未選択化されます。

### 3. 未選択状態

`checked=false` の場合、未選択状態です。`aria-checked="false"` を持ちます。未選択状態でもフォーカス対象にはなり得ますが、roving tabindex によりグループ内で `tabindex="0"` を持つのは 1 要素に限定されます。

### 4. 無効状態

`disabled=true` の場合、その `ui-radio` は選択不可です。クリックやキーボード操作で状態変化せず、`aria-disabled="true"` を持ち、フォーム送信値も持ちません。グループ内キーボード移動ではスキップ対象です。

### 5. エラー状態

`ui-radio` のエラー状態は、`invalid=true` かつ `errorMessage` が非空であるときに成立します。このとき、内部コントロールは `aria-invalid="true"` を持ち、エラーメッセージ要素が描画され、`aria-describedby` にエラー要素 ID が加わります。

`invalid=true` でも `errorMessage=''` の場合、実装上はエラー表示も `aria-invalid` も出力されません。したがって、公開契約としては ``** は **``** と組み合わせて使用する状態入力** として扱います。

### 6. グループ妥当性状態

`ui-radio-group` で `required=false` の場合、常に妥当です。`required=true` の場合、配下の `ui-radio` のうち ``** かつ **``** の要素が 1 つ以上存在すること** を妥当条件とします。

`reportValidity()` を呼んだ結果、妥当でない場合は `invalid=true` となり、`errorMessage` が空であれば既定メッセージ `いずれか1つを選択してください。` を設定します。妥当になった後、そのメッセージが既定文言であった場合に限り空文字列へ戻します。

### 7. フォーム状態

`ui-radio` は Form-Associated Custom Element として、次の条件をすべて満たすときにのみフォーム値を持ちます。

- `checked === true`
- `disabled === false`
- `name !== ''`

これ以外の場合、フォーム値は `null` です。したがって、**選択済みでも **``** であれば送信されません**。また、`name=''` の場合も送信されません。

### 8. フォーカス状態と roving tabindex

roving tabindex はグループ単位で次のように決まります。

- グループ内に `checked=true` かつ `disabled=false` の radio がある場合、その radio のみ `tabindex="0"` です。
- 上記がない場合、最初の `disabled=false` の radio のみ `tabindex="0"` です。
- それ以外は `tabindex="-1"` です。

これは、tab 移動でグループ内の 1 要素だけに進入し、その後の移動を矢印キーに委ねるための契約です。

### 9. キーボード移動状態

`ui-radio` は `ArrowDown` / `ArrowRight` で次の有効要素へ、`ArrowUp` / `ArrowLeft` で前の有効要素へ移動し、**移動先を即時選択** します。末尾から先頭、先頭から末尾への循環も成立します。`Space` は現在要素を選択しますが、既に選択済みであれば状態変化しません。

---

## DOM / Accessibility

`ui-radio` のルートは `:host` です。Shadow DOM 内部に `.wrapper`、`.control`、任意の `.label`、任意の `.error-message` を持ちます。

```text
<ui-radio>
  #shadow-root
    <div class="wrapper">
      <span class="control" part="control" role="radio"></span>
      [label.label part="label"]
    </div>
    [span.error-message]
</ui-radio>
```

`ui-radio-group` のルートも `:host` です。Shadow DOM 内部に `role="radiogroup"` を持つ `.group`、既定スロット、任意の `.error-message` を持ちます。

```text
<ui-radio-group>
  #shadow-root
    <div class="group" role="radiogroup">
      <slot></slot>
    </div>
    [span.error-message]
</ui-radio-group>
```

### Accessibility 契約（`ui-radio`）

アクセシビリティ上の重要点は次のとおりです。

- 対話主体は内部 `.control` 要素であり、`role="radio"` を持ちます。
- 選択状態は `aria-checked` に反映します。
- 無効状態は `aria-disabled` に反映します。
- エラー状態は `aria-invalid` と `aria-describedby` に反映します。
- `label` がある場合、`.control` は内部ラベル要素を主たる名前源として参照します。
- `label` がない場合、外部 `aria-labelledby` を優先し、それもない場合に `aria-label` を使います。
- `label` がない構成では、利用側は `aria-label` または `aria-labelledby` を外部から与えなければなりません（MUST）。
- 外部 `aria-describedby` が与えられている場合、内部エラー ID と結合して `.control` に反映します。

`ui-radio` はネイティブ `<input type="radio">` ではなく、`role="radio"` を持つカスタムコントロールです。したがって、アクセシビリティは **ARIA 属性反映とキーボード操作の正規化** によって成立します。

アクセシブル名の優先順位は、実装契約として **内部 **``** → 外部 **``** → 外部 **`` と解釈します。`label` を与える構成では、可視ラベルを主たる名前源として扱い、外部ラベル属性は補助的な入力としてのみ扱います。

### Accessibility 契約（`ui-radio-group`）

`ui-radio-group` は、Shadow DOM 内の `.group` に `role="radiogroup"` を与えます。`label` は **アクセシビリティラベル専用入力** であり、既定では可視見出しを描画しません。可視見出しが必要な場合は、外部見出し要素と `aria-labelledby` の組み合わせ、または将来の専用公開面で扱います。

ラベル付けの優先順位は次のとおりです。

1. `label` が非空の場合、`aria-label=label`
2. `label` が空で、外部 `aria-label` がある場合、`aria-label`
3. `label` が空で、外部 `aria-labelledby` がある場合、`aria-labelledby`

`invalid=true` かつ `errorMessage` が非空の場合、`.group` に `aria-invalid="true"` と `aria-describedby=<errorId>` を与え、エラーメッセージは `aria-live="polite"` で表示します。

`ui-radio` 側のエラーメッセージは `role="status"` と `aria-live="polite"` を併用します。一方、`ui-radio-group` 側のエラーメッセージは `aria-live="polite"` のみを持ち、`role="status"` は付与しません。したがって、個別 error message と group error message ではライブリージョン実装が一致しません。

### ラベル契約

`ui-radio` の `label` は可視ラベルであり、内部 `<label>` 要素として描画されます。ただし、ネイティブ form control への `for` 連携ではなく、クリック時に `focus()` と選択処理を手動実行する方式です。したがって、利用者は内部ラベルを **クリック可能な補助面** として扱えますが、内部 DOM の詳細には依存しません。

キーボード操作の公開契約は `.control` にのみあります。内部ラベル要素の `keydown` ハンドラは実装補助に過ぎず、ラベル自体をキーボード起動面または独立フォーカス面として公開しません。

### ポインターヒット領域契約

選択操作の起動面は、公開契約として **内部 **``** と内部ラベル要素** に限定します。`.wrapper` 全域や行全体の余白クリックは保証しません。したがって、利用側は行全体が常に起動面である前提に依存しません。

### タッチターゲット契約

`.control::before` によってコントロール周辺へ最低タッチターゲットを付加します。**本コンポーネント単体の公開契約として保証する最小操作領域は **``** です。** これは視覚サイズ 16px のまま操作領域を拡張するための契約です。

44×44 px 級のより大きいタッチターゲットが必要な文脈では、上位レイアウトまたは行全体の起動面設計で補います。本コンポーネント単体が常に 44×44 px を保証する契約は採りません。

### 公開 part

`ui-radio` は次の `part` を公開します。

| part 名    | 役割             |
| --------- | -------------- |
| `control` | ラジオ本体の視覚コントロール |
| `label`   | 可視ラベル          |

`ui-radio-group` は `part` を公開しません。

---

## Visual Contract

`ui-radio` の視覚契約は、**未選択時の静かな存在感** と **選択時の明瞭なリング表示** の差によって成立します。

### 情報順位

- 未選択状態は、淡い背景と細い境界線で静かに存在します。
- 選択状態は、4px のリングと中心穴によって即座に識別できます。
- 無効状態は、不透明度低下によって操作不能を示します。
- エラー状態は、境界線色とエラーメッセージ色を danger 系に切り替えて示します。

本文近傍では、選択中であることは明瞭でなければなりませんが、常時強い発光や過度なモーションには依存しません。radio は、判断のための UI であって、本文より視覚的に大きな主張を行う要素ではありません。

### 形状と寸法

- コントロールの視覚寸法は 16×16 px です。
- 角丸は完全な円形です。
- 選択時は 4px の border を持つドーナツ状のリングになります。
- ラベルとの間隔は `--space-2` に従います。

### 状態差分

- 未選択時は `--bg-fill-muted` と `--border-muted` を使います。
- hover 時は `--border-default` を使って境界線のみを強めます。
- 選択時は `--primary` のリングと `--bg-default` の中心を使います。
- `invalid` 時は `--border-danger` を優先します。
- `disabled` 時は `.wrapper` 全体の opacity を低下させます。

### フォーカス表示

フォーカスリングは `.control:focus-visible` に対する `outline` と `outline-offset` で描画します。エラー状態では、フォーカスリング色も danger 系へ切り替わります。

### エラーメッセージ表示

エラーメッセージはコントロール行の下に独立行として表示します。本文テキストと混ざらないよう、補助テキスト相当のサイズで danger 系色を使用します。

### `ui-radio-group` の見え方

`ui-radio-group` は選択 UI を直接持ちません。視覚上の責務は、**配下項目の縦積み間隔** と **グループエラーの表示位置** に限定します。グループ見出し自体の描画は持たず、`label` はアクセシビリティラベルとしてのみ機能します。

したがって、現在の公開契約では `ui-radio-group` 単体で可視見出しを自己完結させません。可視見出しが必要な場合は、外部見出しと `aria-labelledby` を組み合わせて構成します。

### 参照トークン

本コンポーネントは、主として次のトークンに依存します。

#### `ui-radio`

| 用途        | トークン                                                                                      |
| --------- | ----------------------------------------------------------------------------------------- |
| 選択リング色    | `--primary`                                                                               |
| 選択時中心背景   | `--bg-default`                                                                            |
| 未選択背景     | `--bg-fill-muted`                                                                         |
| 未選択境界線    | `--border-muted`                                                                          |
| hover 境界線 | `--border-default`                                                                        |
| 既定境界線幅    | `--border-width`                                                                          |
| コントロール円形化 | `--radius-full`                                                                           |
| エラー境界線    | `--border-danger`                                                                         |
| ラベル文字色    | `--fg-default`                                                                            |
| エラー文字色    | `--fg-danger`                                                                             |
| 無効不透明度    | `--opacity-disabled`                                                                      |
| 押下スケール    | `--scale-pressed`                                                                         |
| フォーカスリング  | `--focus-ring-width` / `--focus-ring-color` / `--focus-ring-offset` / `--animation-focus` |
| タッチターゲット  | `--control-min-touch`                                                                     |
| 文字サイズ     | `--text-base` / `--text-sm`                                                               |
| スペーシング    | `--space-1` / `--space-2`                                                                 |
| 行間        | `--line-height-normal`                                                                    |

#### `ui-radio-group`

| 用途       | トークン                   |
| -------- | ---------------------- |
| 項目間隔     | `--space-2`            |
| エラー上余白   | `--space-1`            |
| エラー文字色   | `--fg-danger`          |
| エラー文字サイズ | `--text-sm`            |
| エラー行間    | `--line-height-normal` |

---

## 環境別の振る舞い

### Reduced Motion

`prefers-reduced-motion: reduce` 環境では、`.control` の transition 時間を極小化します。状態変化は維持しますが、モーションによる強調は抑制します。

### Forced Colors

`forced-colors: active` 環境では、システムカラーを優先します。未選択時は `CanvasText` 境界線と `Canvas` 背景、選択時は `Highlight` 背景と `CanvasText` 境界線を用います。フォーカスリングは `CanvasText` に固定され、box-shadow には依存しません。

### Dark Mode

コンポーネント自身は `prefers-color-scheme` を直接持ちません。ダークテーマでの見え方は、利用側がトークンを差し替えることで成立させます。したがって、暗色環境でのコントラスト責務は、コンポーネント固有のメディアクエリではなく **テーマトークン契約** にあります。

---

## 関連契約

### 選択・排他制御契約

`ui-radio` の選択処理は `_select()` に集約されます。これは次の順序で動作します。

1. `disabled=true` または `checked=true` の場合は何もしません。
2. 同一グループ内で `checked=true` の他要素を `false` にします。
3. 自身を `checked=true` にします。
4. フォーム値と妥当性を同期します。
5. roving tabindex を更新します。
6. `change` と `input` を発火します。

このため、radio は **解除操作を持たず、常に選択操作のみを持つ** コンポーネントです。

### キーボード契約

`ArrowDown` / `ArrowRight` は次要素、`ArrowUp` / `ArrowLeft` は前要素へ移動し、移動先を即時選択します。循環移動を行うため、末尾から先頭、先頭から末尾への移動が可能です。`Space` は現在要素の選択に使用します。

`Tab` / `Shift+Tab` の独自処理は持ちません。グループ進入・離脱は roving tabindex とブラウザ標準に委ねます。

### フォーム関連付け契約

`ui-radio` は FACE として `ElementInternals.setFormValue()` を使用します。フォーム値は単一文字列値であり、`checked=false`、`disabled=true`、`name=''` のいずれかに該当するときは `null` を設定します。

`ui-radio-group` はフォーム送信へ参加しません。したがって、フォーム上で必要なのは `ui-radio` 側の `name` と `value` です。`ui-radio-group` の `label` や `required` は送信 payload を変えません。

このため、`ui-radio-group` に `name` を持たせて送信名の真実源を増やす設計は採りません。送信名の定義、排他境界、送信値の生成は、常に `ui-radio.name` と `ui-radio.value` の組で完結させます。

### 妥当性契約

`ui-radio` の `checkValidity()` / `reportValidity()` は、自身の `invalid` と `errorMessage` にのみ依存します。`required` 検証は `ui-radio` 単体では行いません。

`ui-radio-group` の `checkValidity()` / `reportValidity()` は、light DOM 配下の全 `ui-radio` descendant の選択有無に基づいてグループ妥当性を計算します。ただし、**グループの **``** を各 **``** へ自動伝播しません。これは未定事項ではなく固定方針です。** したがって、グループエラー表示と各 radio の danger border は別契約です。

また、`reportValidity()` が既定文言を補った場合、その文言は妥当化後に自動解除されますが、利用者が与えた独自 `errorMessage` は自動解除しません。

### スタイル拡張契約

外部スタイル拡張の公開面は、`ui-radio` の CSS Custom Properties と `::part(control)` / `::part(label)` に限定します。内部 class 名、内部 DOM 順序、`wrapper` や `error-message` など part 非公開要素への依存は公開契約に含みません。

`ui-radio-group` は `part` を公開しませんが、項目間隔とエラー表示に関する CSS Custom Properties を公開スタイル入力として扱います。少なくとも `--space-2`、`--space-1`、`--fg-danger`、`--text-sm`、`--line-height-normal` は外部テーマ差し替えの対象に含みます。

---

## 境界条件

### 1. `name` なし

`name=''` の `ui-radio` は単体グループとして扱われます。排他制御の相手は存在せず、フォーム送信値も持ちません。

### 2. 未選択グループ

グループ内に `checked=true` の有効 radio が存在しない場合、最初の有効 radio が `tabindex="0"` になります。これにより、tab 進入先が消失しません。

### 3. disabled 要素の混在

グループ内に `disabled=true` の radio が混在していても構いません。disabled 要素は矢印キー移動の対象から除外され、クリックしても選択されず、イベントも発火しません。

### 4. 既に選択済みの要素への再操作

既に `checked=true` の radio をクリックまたは `Space` 操作しても状態は変化せず、`change` / `input` は発火しません。radio に解除はありません。

### 5. `label` なし

`label=''` の場合、内部ラベル要素は描画しません。この場合、外部から `aria-label` または `aria-labelledby` を与えなければなりません（MUST）。可視テキストが隣に存在していても、自動関連付けは行いません。

### 6. `invalid=true` かつ `errorMessage=''`

`ui-radio` でも `ui-radio-group` でも、この組み合わせでは視覚的エラー表示も ARIA 上の invalid 表示も出力されません。契約上は不完全なエラー指定として扱います。

### 7. `checked=true` かつ `disabled=true`

視覚上は選択済みかつ無効な状態を表せますが、フォーム送信値は持ちません。したがって、**見た目上の選択状態とフォーム送信状態は一致しない場合があります**。

### 8. `ui-radio-group` 内の `name` 不一致

同一 `ui-radio-group` 内でも `name` が異なれば、排他制御は別グループとして動作します。現行実装では `ui-radio-group` は `name` の整合性を保証しません。

ただし、長期的な契約としては、**同一 **``** を単一選択グループとして公開する場合、配下 **``** は単一の非空 **``** を共有しなければなりません（MUST）**。この条件を満たさない構成は、利用者入力ではなく作者入力の不整合です。

### 9. `ui-radio-group` 外の同名要素

フォーム祖先または root が同じであれば、`ui-radio-group` の境界を越えて同一 `name` の radio と排他関係になります。したがって、**現行実装では見た目上のグループ境界と排他制御境界は常に一致するとは限りません**。

長期的には、このズレを許容したまま運用するのではなく、**1 つの **``** を 1 つの意味論上の radio group として公開するなら、同名 radio をグループ外へ漏らさない** という作者入力規約まで含めて固定する方がよいです。

---

## Storybook 契約

各 Story は見本ではなく、**契約確認点** として扱います。将来変更時には、次の契約を維持します。

| Story                                 | 固定する契約                                                               |
| ------------------------------------- | -------------------------------------------------------------------- |
| `Default`                             | 既定で未選択であり、`.control` が `role="radio"` と `aria-checked="false"` を持つこと |
| `UncheckedNormal`                     | 未選択状態で `aria-checked="false"` を持つこと                                  |
| `CheckedNormal`                       | 選択状態で `aria-checked="true"` を持つこと                                    |
| `UncheckedDisabled`                   | 無効状態で `aria-disabled="true"` を持つこと                                   |
| `CheckedDisabled`                     | 選択済みかつ無効状態が成立すること                                                    |
| `UncheckedInvalid`                    | エラー状態で `aria-invalid`、`aria-describedby`、エラーメッセージ表示が成立すること           |
| `CheckedInvalid`                      | 選択済みでも外部から invalid を強制できること                                          |
| `RadioGroup`                          | 同一 `name` 群で排他制御と roving tabindex が成立すること                            |
| `GroupWithDisabled`                   | disabled 要素がクリックでも選択されず、イベントも発火しないこと                                 |
| `AllStates`                           | 主要状態一覧を同一画面で確認できること                                                  |
| `ClickSelect`                         | クリックで選択が移動し、旧選択が解除されること                                              |
| `LabelClickSelect`                    | ラベルクリックで選択できること                                                      |
| `ArrowKeyNavigation`                  | 矢印キーで移動先を即時選択できること                                                   |
| `CircularNavigation`                  | 末尾から先頭へ循環移動できること                                                     |
| `ReverseCircularNavigation`           | 先頭から末尾へ循環移動できること                                                     |
| `DisabledClickBlocked`                | disabled 状態ではクリックで変化しないこと                                            |
| `AlreadyCheckedNoEvent`               | 既選択要素の再クリックで `change` が発火しないこと                                       |
| `RovingTabindexNoSelection`           | 未選択グループで最初の有効要素が `tabindex="0"` を持つこと                                |
| `InitialCheckedConflictNormalization` | 初期競合時に単一勝者へ無イベントで正規化されること                                            |
| `ProgrammaticCheckedNormalization`    | programmatic な `checked=true` でも排他制御は成立し、`change` / `input` は発火しないこと |
| `GroupNameMismatchDiagnostic`         | `ui-radio-group` 配下の `name` 不一致が開発時の non-fatal diagnostic として警告されること |
| `CrossGroupSameNameBoundary`          | 別 `ui-radio-group` に跨る同名 radio が構造違反として診断対象になること                     |
| `TouchTargetContract`                 | 最低操作領域が 24px 契約であり、44px を単体保証しないこと                                   |
| `LabelKeyboardNonContract`            | キーボード契約が `.control` に限定され、ラベルには依存しないこと                               |
| `NoLabel`                             | ラベルなしでも `aria-label` を転送して使えること                                      |
| `RequiredGroupValidation`             | `ui-radio-group` が `required` 妥当性を判定できること                            |
| `DarkThemeStates`                     | トークン差し替えで暗色環境でも状態が読めること                                              |
| `ForcedColorsSimulation`              | 強制カラー想定でも選択状態が読めること                                                  |
| `FormIntegration`                     | FACE としてフォーム送信値が統合されること                                              |

---

## 補足

`ui-radio` の要点は、丸い見た目の再現ではありません。**同一 **``** 群の排他制御、roving tabindex、フォーム値同期、ARIA の整合** を 1 つの公開契約として維持することにあります。

今後の変更でも、次の 5 点は崩さない方がよいです。

1. 排他制御の基準は `ui-radio-group` ではなく `name` であること。
2. フォーカス管理は roving tabindex によってグループ単位で成立すること。
3. `label` なしの運用では外部アクセシブル名を必須とすること。
4. `checked` とフォーム値同期の条件を緩めないこと。
5. `ui-radio-group` を選択状態の所有者にしないこと。

---

## 契約が不明瞭な点

本節は、現行の `radio.md`、`radio.ts`、`radio-group.ts`、`radio.stories.ts` を突き合わせたときに、**なお公開契約として一義に読めない箇所** を整理するものです。ここでいう「不明瞭」とは、単に未実装であることではなく、**将来の実装・検証・利用者理解が複数方向へ分岐し得る状態** を指します。

以下では、各論点について **何が曖昧か**、**なぜ長期的に問題になるか**、**どのように明確化すると設計がきれいになるか** を順に示します。

### 1. グループ境界の正準定義

現行契約では、次の 3 つの境界が並立しています。

- `ui-radio` の排他制御境界としての **同一 **``** + form/root**
- `ui-radio-group` の `required` 判定境界としての **同一 group の descendant**
- アクセシビリティ上の ``** 境界**

この 3 者が常に一致するとは限らないため、**「この radio はどのグループに属するのか」** に 1 つの答えを与えにくくなっています。

長期的には、次のいずれかを正準境界として固定する必要があります。

- **構造優先モデル**：`ui-radio-group` が存在する場合、その境界を最優先する
- ``** 優先モデル**：常に `name` + form/root を正準境界とし、`ui-radio-group` は意味論補助に留める

設計のきれいさと保守性を優先するなら、``** を意味論上の正準 group boundary とし、**``** はその内部整合条件として扱う** 方が明瞭です。そうすれば、排他制御、`required` 判定、アクセシビリティの説明を 1 つの境界概念へ寄せられます。

### 2. `checked` の状態遷移モデル

現行実装では、ユーザー起点の `_select()` による選択と、programmatic な `checked` 変更とで、排他正規化の挙動が一致していません。これにより、**同じ **``** でも、どの経路で遷移したかによって意味が変わる** 余地があります。

長期的には、`checked` を **write-through な公開状態** として定義し、次を固定するのがよいです。

- 任意の経路で `checked=true` になった時点で、同一解決グループは単一選択へ正規化する
- 初期マークアップ、property 代入、attribute 変更、再接続でも同じ正規化規則を使う
- `change` / `input` は user-origin のときだけ発火する
- `checked=false` の programmatic 設定だけでは自動補選しない

このように、**状態正規化** と **イベント発火** を分離して定義すると、状態機械が単純になり、検証しやすくなります。

### 3. アクセシブル名の決定規則

現行契約は、`label` を主たる名前源としつつ、外部 `aria-labelledby` や `aria-label` も補助的に扱う方針です。しかし、**可視ラベルがある場合に外部 **``** をどこまで許容するか** は、まだ厳密には固定されていません。

長期的には、アクセシブル名の真実源を単一化する必要があります。推奨は次のとおりです。

- `label` がある場合、アクセシブル名は **可視ラベルだけ** から決定する
- `aria-label` / `aria-labelledby` は、`label` が空のときのフォールバック専用にする
- 可視ラベルがある状態で外部ラベル属性を併用する構成は、契約違反または少なくとも非推奨とする

こうすると、**見えている文言と支援技術が読む文言を意図的に乖離させない** という強い原則を保てます。

### 4. 妥当性の階層と合成規則

現行契約には、少なくとも次の 2 層の妥当性があります。

- `ui-radio` 単体が持つ **個別 invalid**
- `ui-radio-group` が持つ **group **``** invalid**

ただし、この 2 つが同時に成立した場合の **表示優先順位**、**ARIA の出し分け**、**視覚表現の責務分担** は、なお統一規則として十分には閉じていません。

長期的には、妥当性を次のように明確化するのがよいです。

- 個別妥当性は `ui-radio` が所有する
- グループ妥当性は `ui-radio-group` が所有する
- 両者は別種のエラーであり、自動統合しない
- 個別 invalid は当該 radio にのみ、group invalid は radiogroup にのみ反映する
- 同時成立時は、group message は group 直下、individual message は当該 radio 直下に表示する

この定義により、**どのエラーがどの責務層で起きているか** を常に追跡できます。

### 5. 起動面と視覚 affordance の一致

現行契約では、起動面は `.control` と内部ラベルに限定しています。一方、視覚上は `.wrapper` 全体に hover / active / cursor が及ぶため、**行全体が押せるように見えるが、実際にはそうではない** 可能性があります。

長期的には、**視覚 affordance と実際の hit target を一致させる** 必要があります。方向性は 2 つありますが、推奨は前者です。

- **推奨**：`.wrapper` 全体を起動面とし、hover / active / cursor もその契約に一致させる
- 代替：起動面を `.control` とラベルに限定したまま、`.wrapper` 側の cursor / hover / active を縮退させる

Rouault の設計では、過度な主張は避けつつも、**操作できる場所は素直に操作できるように見える** 方が保守しやすいです。

### 6. ラベルモデルの情報量

現行の `ui-radio.label` は string property であり、`ui-radio-group.label` もアクセシビリティラベル用途に限られます。したがって、**複数行説明、補足文、リンク、アイコン混在をどこで受けるか** が、まだ設計原則として十分には明瞭ではありません。

長期的には、次のどちらかを固定する必要があります。

- **推奨**：`ui-radio` は text-only の単純部品に留め、複雑な説明は `ui-radio-group` または上位フォーム項目が持つ
- 代替：`ui-radio` 自体を compound component 化し、label / description / icon を slot で受ける

Rouault の文脈では、`ui-radio` 自体は **静かな単一選択部品** として保ち、複雑な説明責務は外へ逃がした方が、コンポーネント境界がきれいになります。

### 7. 空 `name` の位置づけ

現行実装では、`name=''` の `ui-radio` は単体グループとして動作し、フォーム送信にも参加しません。技術的には成立しますが、**radio を単独要素として正式サポートするのか、作者入力の不整合とみなすのか** がまだ中途半端です。

長期的には、次のどちらかに固定する必要があります。

- **推奨**：`name` 非空を原則 MUST とし、空 `name` は開発時警告対象にする
- 代替：空 `name` を正式サポートし、非送信・非グループ参加の単体選択表示として定義する

保守性を重視するなら、radio を **常に「群の一員」** として扱う方が自然です。単独選択表示が必要なら、radio ではなく別の部品へ切り出す方が責務分離として明快です。

### 8. `ui-radio-group` のメンバー範囲

現行の `required` 判定は、`ui-radio-group` 配下の全 descendant `ui-radio` を対象にします。この規則は単純ですが、将来 group の入れ子や複合フォームを導入すると、**どこまでを member と見なすか** が曖昧になります。

長期的には、少なくとも次を固定する必要があります。

- nested `ui-radio-group` 配下の `ui-radio` は、親 group の member に含めない
- member 判定は単なる `querySelectorAll('ui-radio')` ではなく、**nearest ancestor group** または明示登録規則に基づいて行う
- `required` 判定、グループ診断、Storybook 検証は同じ member 定義を共有する

この整理によって、将来 group 構造が複雑化しても、**親 group が子 group の内部事情を誤って取り込まない** 状態を保てます。

### 本節の扱い

本節は、未実装項目を列挙するための章ではありません。ここで列挙した論点は、**現在の文書でも部分的には触れているが、なお複数解釈が残る契約上の曖昧さ** です。

長期的には、次の順で固定すると全体が整理しやすくなります。

1. グループ境界の正準定義
2. `checked` の状態遷移モデル
3. 妥当性の階層と合成規則
4. アクセシブル名の決定規則
5. 起動面と視覚 affordance の一致
6. ラベルモデルの情報量
7. 空 `name` の位置づけ
8. `ui-radio-group` のメンバー範囲

これらを明文化した後に実装と Storybook を追随させることで、`radio.md` は現在の実装説明書ではなく、**長期的な設計基準書** として安定します。

---

## 新規で追加を検討する価値がある機能

本節は、現行の `ui-radio` / `ui-radio-group` に対して、**新規で追加を検討する価値がある機能** を優先度付きで整理するものです。ここでいう「機能」は、単なる見た目の差分ではなく、**意味論、アクセシビリティ、検証容易性、保守性を高める公開面** を指します。

前提として、radio は単一選択 UI であり、複数選択や解除可能選択のような意味論拡張は採りません。本節で扱うのは、**radio の意味論を壊さずに完成度を上げる機能** だけです。

### 最優先で検討する価値がある機能

#### 1. `ui-radio-group` の可視見出し / 説明 / 補助文の公開面

現行の `ui-radio-group` は、`label` をアクセシビリティラベルとしてのみ扱い、可視見出しや説明文の公開面を持ちません。そのため、選択肢群の意味、補助説明、必須理由を **group の責務として自己完結** させにくい状態です。

長期的には、次のような公開面を追加する価値があります。

- `legend` 相当の可視見出し slot または dedicated property
- `description` / `supporting-text` 相当の補助説明 slot
- 必須表示や説明参照を group 単位で成立させる `aria-labelledby` / `aria-describedby` 連携

追加する場合も、`label` の意味論とは混同しません。`label` はアクセシビリティラベル専用入力として残し、可視見出しは別公開面として扱う方が契約がきれいです。

#### 2. 構造診断機能

現行の `ui-radio-group` は、`name` 不一致、空 `name` の混在、別 group に跨る同名 radio をまだ検出しません。radio は利用頻度の高い基礎部品であるため、**作者入力の構造不整合を早期に可視化する診断機能** には高い価値があります。

長期的には、少なくとも次を開発時の non-fatal diagnostic として追加する価値があります。

- `ui-radio-group` 配下の `name` 不一致
- 空 `name` を含む構成
- 同名 radio が別 `ui-radio-group` に跨る構成
- 将来的に nested group を導入した場合の member 範囲違反

これは利用者向け機能ではありませんが、**誤構成を静かに量産しないための DX 機能** として優先度が高いです。

#### 3. 初期 / programmatic 状態の単一選択正規化

現行の排他制御はユーザー起点の `_select()` に強く寄っており、初期マークアップや programmatic な `checked=true` に対して同じ正規化規則が十分には成立していません。これは新機能というより、**状態機械の完成** に近い機能です。

長期的には、次を追加する価値があります。

- 初期マークアップで複数 `checked` が存在した場合の無イベント正規化
- programmatic な `checked=true` に対する排他制御
- `name` 変更や再接続時の再評価
- roving tabindex とフォーム値同期の一体更新

この追加により、**どの経路で状態が入っても最終状態は同じ** という強い不変条件を持てます。

#### 4. `orientation` 契約

現行のキーボード契約は Arrow キー循環を前提にしていますが、`ui-radio-group` 自体は縦並び / 横並びの意味論を公開していません。そのため、レイアウト意味論とキー操作の関係が利用者にとって読み取りにくい状態です。

長期的には、`ui-radio-group` に `orientation="vertical|horizontal"` を追加し、次を揃える価値があります。

- `aria-orientation` の付与
- 期待する Arrow キー操作の説明
- Storybook 上の縦横両方の契約確認
- スタイル側での縦横レイアウト補助

これは見た目の variation ではなく、**レイアウト意味論とアクセシビリティ契約を一致させる機能** です。

### 条件付きで検討する価値がある機能

#### 5. `Home` / `End` キー対応

現行のキーボード契約は Arrow キー循環と `Space` に寄っています。選択肢数が多い文脈では、`Home` で先頭、`End` で末尾へ移動・選択できると操作性が向上します。

ただし、選択肢数が少ない画面では恩恵が限定的です。したがって、これは **選択肢数が多い利用文脈が明確にある場合** に検討するのがよいです。

#### 6. group 単位の通常説明参照 API

エラー時の `aria-describedby` 連携は現行でもありますが、通常時の補助説明を group 単位で参照させる公開面はありません。可視説明 slot を追加しない場合でも、少なくとも次のような API を検討する価値があります。

- 外部説明要素を参照する `aria-describedby` 補助入力
- group description 専用の ID 連携規則
- `required` 説明とエラー説明の優先結合規則

これは、フォーム項目として radio group を再利用しやすくするための機能です。

#### 7. member 判定の明示化

現行の `ui-radio-group` は descendant 全探索で member を解決します。将来、nested group や複雑なラッパー構造を扱う場合は、member 判定をより明示的にする価値があります。

候補は次の 2 方向です。

- nearest ancestor group に基づく membership 解決
- 内部登録方式による explicit member 管理

これは利用者が日常的に触る機能ではありませんが、**複雑なフォーム構造への耐性** を高めます。

### 後回しでよい機能

#### 8. `fieldset` / `legend` 相当の内部構造化

意味論をネイティブにさらに近づけるために、内部で `fieldset` / `legend` 相当を持つ構造拡張は検討余地があります。ただし、これはアクセシビリティ改善のための構造的深化であり、現時点では最優先ではありません。

可視見出し / 説明 / `orientation` / 診断が先に整う方が、利用者価値と保守性の両方で効果が大きいです。

### 採用しない方針

次の方向は、新規機能としても採りません。

- `ui-radio-group` を値保持コンポーネントへ昇格させること
- `ui-radio-group` に `value` や `name` の真実源を持たせること
- `ui-radio` 自体を rich-content slot 前提の compound component にすること
- radio に解除可能選択や複数選択を持ち込むこと
- 単なる視覚 variation の追加を優先すること

### 本節の扱い

本節は、思いつきの機能案を列挙するための章ではありません。ここで挙げた項目は、**意味論、アクセシビリティ、検証性、保守性を高める観点から追加価値があるもの** だけです。

優先順位としては、次の順で進めると全体が整理しやすくなります。

1. `ui-radio-group` の可視見出し / 説明 / 補助文の公開面
2. 構造診断機能
3. 初期 / programmatic 状態の単一選択正規化
4. `orientation` 契約
5. `Home` / `End` キー対応
6. group 単位の通常説明参照 API
7. member 判定の明示化
8. `fieldset` / `legend` 相当の内部構造化

---

## 固定済みだが現行実装または検証へ未反映の事項

### 1. 初期状態での複数 `checked` 競合解決

契約は固定済みです。**同一解決グループでは、初期化完了後に **``** は高々 1 要素でなければなりません。**

ただし現行実装は、初期マークアップで同一グループ内に複数の `checked` が存在する場合の無イベント正規化をまだ実装していません。実装反映時は、次を満たします。

- 初期マークアップ、upgrade、再接続、`name` 変更、`checked` 変更による競合を無イベントで正規化すること。
- 明示的な操作履歴を持たない競合では、tree order で最後に現れる `checked` 要素を勝者とすること。
- 勝者以外の要素を `checked=false` へ同期しても `change` / `input` を発火しないこと。
- roving tabindex とフォーム値同期が正規化後の単一勝者に追随すること。

### 2. `ui-radio-group` と `name` の整合診断

契約は固定済みです。``** 配下で単一選択肢として提示される **``** 群は、単一の非空 **``** を共有しなければなりません（MUST）。**

ただし現行実装は、この不整合を開発時の non-fatal diagnostic として検出する処理をまだ持ちません。実装反映時は、次を満たします。

- `name` 不一致または空 `name` の混在を作者入力エラーとして検出すること。
- 通知方式を開発時警告・本番非例外・利用者向け非表示に保つこと。
- 子要素の `name` を自動補完・自動修正しないこと。
- 同名 radio が別 `ui-radio-group` に跨る構成も構造違反として診断対象に含めること。

### 3. タッチターゲット寸法コメントの整合

契約は固定済みです。**本コンポーネント単体が保証する最小操作領域は 24px であり、44×44 px の単体保証は行いません。**

ただし現行実装には、`.control::before` に関するコメントとして 44×44 px を示唆する記述が残っています。実装反映時は、コメントと契約を一致させ、24px 契約と上位レイアウト責務の分担が読めるようにします。

### 4. 動的構造変更時の group 妥当性再評価

契約上、`ui-radio-group` の `required` 妥当性は **現在配下に存在する有効 **``** 群** に追随する方が自然です。しかし現行実装は、`change` イベント時にのみ `reportValidity()` を行い、`slotchange` 時は `requestUpdate()` のみを行います。したがって、次のような変化では group 妥当性が自動再計算されません。

- 選択済み `ui-radio` の削除
- 選択済み `ui-radio` の `disabled=true` 化
- 未選択から選択済みへの programmatic 変更後の再評価不足
- child 構造の差し替え

実装反映時は、少なくとも `slotchange`、child の `checked` / `disabled` / `name` 変化、再接続で group 妥当性を再評価し、`required` 契約と実状態が乖離しないようにします。

### 5. Storybook の境界検証

契約は固定済みですが、検証 Story がまだ不足しています。少なくとも次の契約確認 Story を追加します。

- `InitialCheckedConflictNormalization`
- `ProgrammaticCheckedNormalization`
- `GroupNameMismatchDiagnostic`
- `CrossGroupSameNameBoundary`
- `TouchTargetContract`
- `LabelKeyboardNonContract`
- `ReducedMotion`
- `GroupValidityAfterSlotMutation`

### 6. 本節の扱い

本節は、契約が未定である事項を列挙するものではありません。**契約は既に固定済みであり、現行実装または Storybook がまだ追随していない差分だけ** を記録します。これらを反映する場合は、実装、Storybook、契約書の 3 点を同時に更新し、再び未固定状態へ戻しません。

