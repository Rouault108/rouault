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
- 固定済みだが現行実装または検証へ未反映の事項
- 将来拡張時の不変条件

一方、本書は次の事項を扱いません。

- どの選択肢集合を radio で表現すべきかという画面設計判断
- 選択肢文言そのもののライティング規約
- グループ単位の業務バリデーションロジックの生成
- ラベルと補助説明文のレイアウト全体設計
- 送信先 API や保存結果の通知設計
- フォーム全体の送信・取消フロー
- `Home` / `End` キー対応のような文脈依存の操作性拡張
- `fieldset` / `legend` 相当の内部構造のような実装構造深化
- 単なる視覚 variation の追加
- `ui-radio-group` を値保持コンポーネントへ昇格させる設計
- `ui-radio-group` に `value` や `name` の真実源を持たせる設計
- radio に解除可能選択や複数選択を持ち込む設計

これらは上位レイヤ、別コンポーネント、または将来別文書で扱う事項です。

---

## 公開契約

### 公開入力

`ui-radio` は、`checked`、`name`、`value`、`label`、`disabled`、`invalid`、`errorMessage` を公開入力として扱います。`ui-radio-group` は、`label`、`required`、`invalid`、`errorMessage` を公開入力として扱います。

`ui-radio-group` は ``** を公開入力として持ちません**。単一選択グループの排他境界とフォーム送信名は、常に各 `ui-radio`の`name` によって定義します。

`ui-radio` は Form-Associated Custom Element として実装されており、`checked === true`、`disabled === false`、`name !== ''` のときにのみフォーム値を持ちます。`ui-radio-group` 自体はフォーム関連付けを持たず、送信値を持ちません。

`ui-radio` の排他制御は、`ui-radio-group` への所属ではなく、**同一 **`** を持つ **`** 群の探索**によって成立します。したがって、`ui-radio-group` を用いない `div[role="radiogroup"]` 構成でも、同一 `name` であれば排他選択は成立します。逆に、`ui-radio-group` 内に置かれていても `name` が揃っていなければ単一グループとしては扱いません。

このため、`name` の真実源は常に `ui-radio` 側にあります。`ui-radio-group` は意味論上のグループを表しますが、排他境界を上書きする設定入力は持ちません。

### 入力契約（`ui-radio`）

| 名前           | 種別                                   | 必須   | 内容                       | 契約                                                                                                    |
| -------------- | -------------------------------------- | ------ | -------------------------- | ------------------------------------------------------------------------------------------------------- |
| `checked`      | property / attribute                   | いいえ | 選択状態                   | `true` のとき選択状態です                                                                               |
| `name`         | property / attribute                   | いいえ | フォーム名・グループ識別子 | 同一 `name` の `ui-radio` 群が排他的に扱われます                                                        |
| `value`        | property / attribute                   | いいえ | フォーム送信値             | 既定値は `on` です                                                                                      |
| `label`        | property / attribute                   | いいえ | アクセシビリティラベル     | 非空時は `radiogroup` の `aria-label` として使用します。可視見出しはこの入力だけでは描画しません        |
| `disabled`     | property / attribute                   | いいえ | 無効状態                   | `true` の場合、選択不可・フォーム送信除外です                                                           |
| `invalid`      | property / attribute                   | いいえ | エラー状態                 | `true` の場合、`ui-radio` は invalid 状態です。視覚メッセージの表示は `errorMessage` の有無で決まります |
| `errorMessage` | property / attribute (`error-message`) | いいえ | エラー文言                 | `invalid=true` かつ非空文字列の場合に表示と妥当性へ反映します                                           |

### 入力契約（`ui-radio-group`）

| 名前           | 種別                                   | 必須   | 内容               | 契約                                                                                                          |
| -------------- | -------------------------------------- | ------ | ------------------ | ------------------------------------------------------------------------------------------------------------- |
| `label`        | property / attribute                   | いいえ | グループラベル     | 非空時は `radiogroup` の `aria-label` として使用します                                                        |
| `required`     | property / attribute                   | いいえ | 必須選択           | `true` の場合、配下の `ui-radio` から 1 つ以上の選択を要求します                                              |
| `invalid`      | property / attribute                   | いいえ | グループエラー状態 | `true` の場合、`ui-radio-group` は invalid 状態です。視覚メッセージの表示は `errorMessage` の有無で決まります |
| `errorMessage` | property / attribute (`error-message`) | いいえ | グループエラー文言 | `invalid=true` かつ非空文字列の場合に表示します                                                               |

### 作者入力エラー通知契約

`ui-radio-group` 配下の構造不整合は、**作者入力エラー**として扱います。この種別は利用者入力エラーではないため、`required` 妥当性、`invalid` 表示、フォーム送信エラーとは切り離して扱います。

通知方式は、設計判断として次のように固定します。

- **本番実行時に例外を throw しません。**
- **利用者向け UI エラーとして表示しません。**
- **子要素の `name` や `checked` を暗黙補完・暗黙修正しません。**
- **開発時に限り non-fatal diagnostic として警告します。**

開発時診断の対象には、少なくとも次を含めます。

- `ui-radio-group` 配下の `name` 不一致
- 空 `name` を含む構成
- 同一意味論上の group を外れて同名 radio が存在する構成
- group member 範囲契約に反する構成
- 同一解決グループで初期状態に複数 `checked=true` が存在する構成

開発時診断は、作者が構造不整合に気付くための補助であり、実行継続を前提とします。したがって、この警告は recovery を要求する fatal error ではなく、**契約違反を明示する non-fatal diagnostic** として扱います。

### `name` 所有契約

`name` は `ui-radio-group` ではなく、各 `ui-radio` が所有する公開入力です。これは次の設計判断を意味します。

- 排他制御の境界は `ui-radio-group` ではなく `ui-radio.name` で決まります。
- フォーム送信名も `ui-radio.name` で決まります。
- `ui-radio-group` は `name` の不足補完、暗黙継承、自動上書きを行いません。
- 単一選択グループとして公開する場合、作者は配下 `ui-radio` に同一の非空 `name` を明示しなければなりません（MUST）。

この契約により、`name` の真実源は常に 1 つに保たれます。`ui-radio-group` を導入しても、`ui-radio.name` と別の設定源が増えません。

### スロット契約

| 対象             | 名前         | 種別 | 位置づけ | 内容                                |
| ---------------- | ------------ | ---- | -------- | ----------------------------------- |
| `ui-radio`       | なし         | -    | -        | `ui-radio` はスロットを公開しません |
| `ui-radio-group` | 既定スロット | slot | 正規入力 | 配下の `ui-radio` 群を受け取ります  |

`ui-radio-group` の既定スロットは、原則として `ui-radio` を受け取ることを想定します。任意要素を配置すること自体は技術的に可能ですが、**グループメンバーとして扱われるのは `ui-radio` のみ**です。

`ui-radio-group` のグループメンバーは、**各 `ui-radio` から見て nearest ancestor `ui-radio-group` が当該 group である要素**と定義します。したがって、light DOM 上の descendant であっても、途中に別の `ui-radio-group` を挟む場合、その配下 `ui-radio` は親 group のメンバーに含めません。

`required` 妥当性判定、構造診断、Storybook 契約における group member の定義は、この規則を共有します。**単なる `querySelectorAll('ui-radio')` 相当の全 descendant 探索を公開契約とはしません。**

ラッパー要素を挟むこと自体は許容されます。ラッパーの有無は member 判定を変えませんが、nearest ancestor `ui-radio-group` が変わる入れ子構造は member 境界を変えます。

### 公開メソッド

#### `ui-radio`

| 名前               | 種別   | 契約                                         |
| ------------------ | ------ | -------------------------------------------- |
| `focus(options?)`  | method | 内部 `.control` 要素にフォーカスを委譲します |
| `blur()`           | method | 内部 `.control` 要素からフォーカスを外します |
| `checkValidity()`  | method | `ElementInternals` の妥当性を返します        |
| `reportValidity()` | method | `ElementInternals` の妥当性を報告します      |

#### `ui-radio-group`

| 名前               | 種別   | 契約                                                                                                                                                    |
| ------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `checkValidity()`  | method | `required` 条件に基づき、配下の `ui-radio` に選択があるかを返します                                                                                     |
| `reportValidity()` | method | グループ妥当性を評価し、`invalid` と `errorMessage` を同期します。`errorMessage` が空のときのみ既定文言を補い、妥当化後は既定文言に限って自動解除します |

### イベント契約

`ui-radio` は、**ユーザー操作によって未選択から選択へ変化したときのみ** `change` と `input` を発火します。既に選択済みの radio を再度操作した場合、または `disabled=true` の場合、これらのイベントは発火しません。

`checked` の programmatic な変更、すなわち外部からの property 代入や attribute 操作は、`change` / `input` の発火条件に含みません。イベントは `_select()` を通過したユーザー起点の選択操作でのみ発火します。

`ui-radio` がグループ内の他要素を未選択へ変更した場合、未選択化された側は `change` / `input` を発火しません。イベントの起点は、常に新たに選択された `ui-radio` のみです。

`ui-radio-group` は独自のカスタムイベントを公開しません。`required=true` の場合、配下からバブルしてきた `change` を受けて内部的に `reportValidity()` を行います。

`reportValidity()` は、`errorMessage` が空の場合にのみ既定文言 `いずれか1つを選択してください。` を補います。利用者が独自文言を与えている場合、その文言は妥当化後も自動では消去しません。

### 属性反映契約

#### `ui-radio`

| property       | attribute       | reflect | 備考                             |
| -------------- | --------------- | ------- | -------------------------------- |
| `checked`      | `checked`       | あり    | boolean attribute として扱います |
| `name`         | `name`          | あり    | グループ識別に使用します         |
| `value`        | `value`         | あり    | 既定値は `on` です               |
| `label`        | `label`         | あり    | 可視ラベルを表します             |
| `disabled`     | `disabled`      | あり    | boolean attribute として扱います |
| `invalid`      | `invalid`       | あり    | boolean attribute として扱います |
| `errorMessage` | `error-message` | あり    | エラーメッセージを表します       |

#### `ui-radio-group`

| property       | attribute       | reflect | 備考                             |
| -------------- | --------------- | ------- | -------------------------------- |
| `label`        | `label`         | なし    | グループラベルです               |
| `required`     | `required`      | あり    | boolean attribute として扱います |
| `invalid`      | `invalid`       | あり    | boolean attribute として扱います |
| `errorMessage` | `error-message` | なし    | グループエラーメッセージです     |

### グループ化契約

`ui-radio` のグループメンバー探索は、次の規則に従います。

1. `name === ''` の場合、その `ui-radio` 単体を 1 要素グループとして扱います。
2. `closest('form')` が存在する場合、そのフォーム内の同一 `name` の `ui-radio` 群をグループとして扱います。
3. フォーム祖先が存在しない場合、同一 root（`Document` または `ShadowRoot`）内の同一 `name` の `ui-radio` 群をグループとして扱います。

したがって、**同一 **``** であっても root が異なる場合は同一グループになりません**。また、`ui-radio-group` はこの探索範囲を変更しません。

### 責務範囲

`ui-radio` の責務範囲には、内部コントロールの描画、選択状態の保持、同一 `name` グループの排他制御、roving tabindex、キーボード移動、フォーム値同期、ARIA 属性反映、エラーメッセージ表示を含みます。

`ui-radio-group` の責務範囲には、`radiogroup` の意味付け、グループラベルの供給、`required` 妥当性判定、グループエラーメッセージ表示を含みます。

また、**選択肢群全体に属する補助的情報は `ui-radio-group` 側の責務** とします。したがって、可視見出し、通常説明、補助文、必須理由、orientation のような **group 全体にかかる意味論** を公開する場合、その所属先は `ui-radio-group` 側とし、`ui-radio` 単体へ分散させません。

一方、`ui-radio-group` は選択状態のソースオブトゥルースではありません。配下 `ui-radio` の選択値の一元公開、`name` の保持、フォーム送信結果の生成は責務に含みません。

同様に、`ui-radio` 自体を rich-content slot 前提の compound component として拡張しません。`ui-radio` は **text-first の静かな単一選択部品** に留め、複雑な説明責務は `ui-radio-group` または上位フォーム項目へ委ねます。

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

`ui-radio` の invalid 状態は、`invalid=true` のときに成立します。このとき、内部コントロールは `aria-invalid="true"` を持ちます。

`errorMessage` が非空である場合、エラーメッセージ要素が描画され、`aria-describedby` にエラー要素 ID が加わります。`errorMessage=''` の場合、**invalid 状態そのものは維持されますが、追加のエラーメッセージ表示は行いません。**

したがって、公開契約としては、**`invalid` は状態の真実源、`errorMessage` は説明文表示の入力**として扱います。

### 6. グループ妥当性状態

`ui-radio-group` で `required=false` の場合、`checkValidity()` / `reportValidity()` における必須選択条件は常に満たされます。`required=true` の場合、**グループメンバーのうち `checked=true` かつ `disabled=false` の要素が 1 つ以上存在すること**を妥当条件とします。

`reportValidity()` を呼んだ結果、妥当でない場合は `invalid=true` となります。`errorMessage` が空であれば既定メッセージ `いずれか1つを選択してください。` を設定します。妥当になった後、そのメッセージが既定文言であった場合に限り空文字列へ戻し、`invalid=false` に戻します。

また、外部から `invalid=true` が与えられた場合、`ui-radio-group` は required 判定とは独立に group invalid 状態を表せます。この場合も、**状態の真実源は `invalid`、説明文表示の入力は `errorMessage`** です。

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
- `invalid=true` の場合、`.control` は `aria-invalid="true"` を持ちます。
- `errorMessage` が非空の場合、エラー要素 ID を `aria-describedby` に加えます。
- 外部 `aria-describedby` が与えられている場合、内部エラー ID と結合して `.control` に反映します。

アクセシブル名の決定規則は次の順序で固定します。

1. `label` が非空の場合、**内部可視ラベルのみ**をアクセシブル名の主たる名前源とします。
2. `label` が空で、外部 `aria-labelledby` がある場合、それを使います。
3. `label` が空で、外部 `aria-label` がある場合、それを使います。

したがって、`label` が非空の構成では、外部 `aria-label` / `aria-labelledby` を**名前源として併用しません**。可視ラベルがある状態で外部ラベル属性を重ねる構成は非推奨です。

`label` が空の構成では、利用側は `aria-label` または `aria-labelledby` を外部から与えなければなりません（MUST）。

`ui-radio` はネイティブ `<input type="radio">` ではなく、`role="radio"` を持つカスタムコントロールです。したがって、アクセシビリティは **ARIA 属性反映とキーボード操作の正規化** によって成立します。

### Accessibility 契約（`ui-radio-group`）

`ui-radio-group` は、Shadow DOM 内の `.group` に `role="radiogroup"` を与えます。`label` は **アクセシビリティラベル専用入力** であり、既定では可視見出しを描画しません。

可視見出し、通常説明、補助文のような **group 全体に属する説明情報** を公開する場合、それらは `label` とは別公開面として扱います。したがって、将来 `ui-radio-group` に可視見出しや通常説明を追加する場合も、`label` の意味論とは混同しません。

アクセシブル名の決定規則は次の順序で固定します。

1. `label` が非空の場合、`aria-label=label`
2. `label` が空で、外部 `aria-labelledby` がある場合、`aria-labelledby`
3. `label` が空で、外部 `aria-label` がある場合、`aria-label`

通常説明の参照は、エラー説明とは別責務です。したがって、将来 group 単位の通常説明を公開する場合も、**通常説明参照とエラー説明参照は別入力として扱い、結合規則を明示しなければなりません。**

`invalid=true` の場合、`.group` は `aria-invalid="true"` を持ちます。`errorMessage` が非空の場合、`.group` はさらに `aria-describedby=<errorId>` を持ち、エラーメッセージは `aria-live="polite"` で表示します。

個別 invalid と group invalid は別契約です。`ui-radio-group` は配下 `ui-radio` の個別 invalid を集約しません。

### ラベル契約

`ui-radio` の `label` は可視ラベルであり、内部 `<label>` 要素として描画されます。ただし、ネイティブ form control への `for` 連携ではなく、クリック時に `focus()` と選択処理を手動実行する方式です。したがって、利用者は内部ラベルを **クリック可能な補助面** として扱えますが、内部 DOM の詳細には依存しません。

キーボード操作の公開契約は `.control` にのみあります。内部ラベル要素の `keydown` ハンドラは実装補助に過ぎず、ラベル自体をキーボード起動面または独立フォーカス面として公開しません。

### ポインターヒット領域契約

選択操作の起動面は、公開契約として **`.wrapper` 全体**です。`disabled=true` でない限り、内部 `.control`、内部ラベル要素、およびその間の余白を含む `.wrapper` 内の pointer 操作は、すべて同じ選択処理へ到達しなければなりません。

したがって、利用側は **行全体が押せるように見える領域は、実際に押せる** ことを前提にしてよいです。視覚 affordance と実際の hit target は一致しなければなりません。

一方、キーボード操作の公開契約は引き続き `.control` にあります。`.wrapper` 自体を独立のフォーカス面として公開しません。

### タッチターゲット契約

`.control::before` によってコントロール周辺へ最低タッチターゲットを付加します。**本コンポーネント単体の公開契約として保証する最小操作領域は **``** です。** これは視覚サイズ 16px のまま操作領域を拡張するための契約です。

44×44 px 級のより大きいタッチターゲットが必要な文脈では、上位レイアウトまたは行全体の起動面設計で補います。本コンポーネント単体が常に 44×44 px を保証する契約は採りません。

### 公開 part

`ui-radio` は次の `part` を公開します。

| part 名   | 役割                         |
| --------- | ---------------------------- |
| `control` | ラジオ本体の視覚コントロール |
| `label`   | 可視ラベル                   |

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

| 用途               | トークン                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------- |
| 選択リング色       | `--primary`                                                                               |
| 選択時中心背景     | `--bg-default`                                                                            |
| 未選択背景         | `--bg-fill-muted`                                                                         |
| 未選択境界線       | `--border-muted`                                                                          |
| hover 境界線       | `--border-default`                                                                        |
| 既定境界線幅       | `--border-width`                                                                          |
| コントロール円形化 | `--radius-full`                                                                           |
| エラー境界線       | `--border-danger`                                                                         |
| ラベル文字色       | `--fg-default`                                                                            |
| エラー文字色       | `--fg-danger`                                                                             |
| 無効不透明度       | `--opacity-disabled`                                                                      |
| 押下スケール       | `--scale-pressed`                                                                         |
| フォーカスリング   | `--focus-ring-width` / `--focus-ring-color` / `--focus-ring-offset` / `--animation-focus` |
| タッチターゲット   | `--control-min-touch`                                                                     |
| 文字サイズ         | `--text-base` / `--text-sm`                                                               |
| スペーシング       | `--space-1` / `--space-2`                                                                 |
| 行間               | `--line-height-normal`                                                                    |

#### `ui-radio-group`

| 用途             | トークン               |
| ---------------- | ---------------------- |
| 項目間隔         | `--space-2`            |
| エラー上余白     | `--space-1`            |
| エラー文字色     | `--fg-danger`          |
| エラー文字サイズ | `--text-sm`            |
| エラー行間       | `--line-height-normal` |

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

`ui-radio` の選択処理は、**同一解決グループにおいて常に単一選択へ正規化される** ことを前提にします。ここでいう「解決グループ」とは、グループ化契約で定義した membership 規則に従って求められる集合です。

状態正規化は、ユーザー操作だけでなく、初期マークアップ、upgrade、再接続、programmatic な `checked` 変更、`name` 変更によっても成立しなければなりません。したがって、**どの経路で状態が入っても、最終的な選択結果は同じ** でなければなりません。

正規化規則は次のとおりです。

1. 同一解決グループで `checked=true` は高々 1 要素までとします。
2. 複数 `checked=true` が競合した場合、公開契約として単一勝者へ無イベントで正規化します。
3. `change` / `input` を発火するのは、ユーザー起点で未選択から選択へ変化した要素のみです。
4. 正規化によって未選択化された側、および programmatic 正規化の過程では `change` / `input` を発火しません。
5. `checked=false` の programmatic 設定だけでは自動補選しません。
6. 正規化時は、`checked`、roving tabindex、フォーム値、妥当性を一体で同期します。

このため、radio は **解除操作を持たず、常に単一選択へ収束する状態機械** として振る舞います。

### キーボード契約

`ArrowDown` / `ArrowRight` は次要素、`ArrowUp` / `ArrowLeft` は前要素へ移動し、移動先を即時選択します。循環移動を行うため、末尾から先頭、先頭から末尾への移動が可能です。`Space` は現在要素の選択に使用します。

`Tab` / `Shift+Tab` の独自処理は持ちません。グループ進入・離脱は roving tabindex とブラウザ標準に委ねます。

現行契約は orientation 非依存です。ただし、将来 `ui-radio-group` が縦横レイアウトの意味論を公開する場合、その公開面は `ui-radio-group` 側に置き、**`aria-orientation`、期待する Arrow キー操作、Storybook 上の検証観点を同時に固定** しなければなりません。

したがって、orientation は単なる見た目の variation ではなく、**group 単位の意味論とアクセシビリティ契約を伴う公開面** としてのみ導入します。

### フォーム関連付け契約

`ui-radio` は FACE として `ElementInternals.setFormValue()` を使用します。フォーム値は単一文字列値であり、`checked=false`、`disabled=true`、`name=''` のいずれかに該当するときは `null` を設定します。

`ui-radio-group` はフォーム送信へ参加しません。したがって、フォーム上で必要なのは `ui-radio` 側の `name` と `value` です。`ui-radio-group` の `label` や `required` は送信 payload を変えません。

このため、`ui-radio-group` に `name` を持たせて送信名の真実源を増やす設計は採りません。送信名の定義、排他境界、送信値の生成は、常に `ui-radio.name` と `ui-radio.value` の組で完結させます。

### 妥当性契約

`ui-radio` の `checkValidity()` / `reportValidity()` は、自身の `invalid` と `errorMessage` にのみ依存します。`required` 検証は `ui-radio` 単体では行いません。

`ui-radio-group` の `checkValidity()` / `reportValidity()` は、light DOM 配下の全 `ui-radio` descendant の選択有無に基づいてグループ妥当性を計算します。ただし、**グループの **`** を各 **`** へ自動伝播しません。これは未定事項ではなく固定方針です。** したがって、グループエラー表示と各 radio の danger border は別契約です。

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

ただし、長期的な契約としては、**同一 **`** を単一選択グループとして公開する場合、配下 **`** は単一の非空 **``** を共有しなければなりません（MUST）**。この条件を満たさない構成は、利用者入力ではなく作者入力の不整合です。

### 9. `ui-radio-group` 外の同名要素

フォーム祖先または root が同じであれば、`ui-radio-group` の境界を越えて同一 `name` の radio と排他関係になります。したがって、**現行実装では見た目上のグループ境界と排他制御境界は常に一致するとは限りません**。

長期的には、このズレを許容したまま運用するのではなく、**1 つの **``** を 1 つの意味論上の radio group として公開するなら、同名 radio をグループ外へ漏らさない** という作者入力規約まで含めて固定する方がよいです。

---

## Storybook 契約

各 Story は見本ではなく、**契約確認点** として扱います。将来変更時には、次の契約を維持します。

| Story                                 | 固定する契約                                                                              |
| ------------------------------------- | ----------------------------------------------------------------------------------------- |
| `Default`                             | 既定で未選択であり、`.control` が `role="radio"` と `aria-checked="false"` を持つこと     |
| `UncheckedNormal`                     | 未選択状態で `aria-checked="false"` を持つこと                                            |
| `CheckedNormal`                       | 選択状態で `aria-checked="true"` を持つこと                                               |
| `UncheckedDisabled`                   | 無効状態で `aria-disabled="true"` を持つこと                                              |
| `CheckedDisabled`                     | 選択済みかつ無効状態が成立すること                                                        |
| `UncheckedInvalid`                    | エラー状態で `aria-invalid`、`aria-describedby`、エラーメッセージ表示が成立すること       |
| `CheckedInvalid`                      | 選択済みでも外部から invalid を強制できること                                             |
| `RadioGroup`                          | 同一 `name` 群で排他制御と roving tabindex が成立すること                                 |
| `GroupWithDisabled`                   | disabled 要素がクリックでも選択されず、イベントも発火しないこと                           |
| `AllStates`                           | 主要状態一覧を同一画面で確認できること                                                    |
| `ClickSelect`                         | クリックで選択が移動し、旧選択が解除されること                                            |
| `LabelClickSelect`                    | ラベルクリックで選択できること                                                            |
| `ArrowKeyNavigation`                  | 矢印キーで移動先を即時選択できること                                                      |
| `CircularNavigation`                  | 末尾から先頭へ循環移動できること                                                          |
| `ReverseCircularNavigation`           | 先頭から末尾へ循環移動できること                                                          |
| `DisabledClickBlocked`                | disabled 状態ではクリックで変化しないこと                                                 |
| `AlreadyCheckedNoEvent`               | 既選択要素の再クリックで `change` が発火しないこと                                        |
| `RovingTabindexNoSelection`           | 未選択グループで最初の有効要素が `tabindex="0"` を持つこと                                |
| `InitialCheckedConflictNormalization` | 初期競合時に単一勝者へ無イベントで正規化されること                                        |
| `ProgrammaticCheckedNormalization`    | programmatic な `checked=true` でも排他制御は成立し、`change` / `input` は発火しないこと  |
| `GroupNameMismatchDiagnostic`         | `ui-radio-group` 配下の `name` 不一致が開発時の non-fatal diagnostic として警告されること |
| `CrossGroupSameNameBoundary`          | 別 `ui-radio-group` に跨る同名 radio が構造違反として診断対象になること                   |
| `TouchTargetContract`                 | 最低操作領域が 24px 契約であり、44px を単体保証しないこと                                 |
| `LabelKeyboardNonContract`            | キーボード契約が `.control` に限定され、ラベルには依存しないこと                          |
| `NoLabel`                             | ラベルなしでも `aria-label` を転送して使えること                                          |
| `RequiredGroupValidation`             | `ui-radio-group` が `required` 妥当性を判定できること                                     |
| `DarkThemeStates`                     | トークン差し替えで暗色環境でも状態が読めること                                            |
| `ForcedColorsSimulation`              | 強制カラー想定でも選択状態が読めること                                                    |
| `FormIntegration`                     | FACE としてフォーム送信値が統合されること                                                 |

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

## 固定済みだが現行実装または検証へ未反映の事項

本更新で、少なくとも次の差分は実装と Storybook へ反映済みです。

- 初期競合、再接続、`name` / `checked` 変更時の単一勝者への無イベント正規化
- `ui-radio-group` 配下の `name` 不一致、空 `name`、別 group に跨る同名 radio の開発時診断
- `.control::before` の 24px タッチターゲット契約へのコメント整合
- `slotchange`、child の `checked` / `disabled` / `name` 変化、DOM 追加削除に追随する group 妥当性再評価
- `InitialCheckedConflictNormalization`、`ProgrammaticCheckedNormalization`、`GroupNameMismatchDiagnostic`、`CrossGroupSameNameBoundary`、`GroupValidityAfterSlotMutation` を含む Storybook 契約

したがって、現時点で本節に列挙すべき未反映事項はありません。今後差分が再発した場合に限り、**契約は固定済みだが実装または検証が未追随である事項だけ** をここへ再掲します。
