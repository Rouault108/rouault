# Checkbox

## 1. 概要

本書は、`ui-checkbox` の公開契約、状態モデル、アクセシビリティ、視覚契約、および現行実装との差分を整理するものです。

`ui-checkbox` は、**二値選択**または**部分選択状態**を表現するコンポーネントです。単にチェックマークを描画するのではなく、**checked / indeterminate / disabled / required / invalid** の各状態をどのように公開し、フォーム送信およびバリデーションとどのように接続するかを契約として固定します。

Rouault における checkbox は、フォーム UI のための汎用コントロールであると同時に、**本文を読む流れを不必要に乱さないこと**を求めます。したがって、本コンポーネントの契約は、選択可能性の明示、状態遷移の一貫性、フォーム互換性、アクセシビリティを満たしつつ、**「没入して読む」ことのできるデザイン**を崩さない方向で定義します。

---

## 2. 適用範囲

本書は、`ui-checkbox` の次の事項を対象とします。

- 公開契約
- 状態モデル
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 関連契約
- 境界条件
- Storybook 契約
- 現行実装で未対応または未整合の事項

本書は、次の事項を対象としません。

- フォーム全体のバリデーション戦略
- 複数 checkbox 間の選択ロジック全体
- チェック結果に応じた送信先 API の振る舞い
- エラーメッセージ文言の業務定義
- フィールドセット、説明文、補助注記を含む上位フォームレイアウト
- tri-state 親子選択ロジックのアプリケーション固有規約

これらは上位レイヤまたは別コンポーネントの責務です。

---

## 3. 公開契約

### 3.1 公開面

`ui-checkbox` は、`checked`、`indeterminate`、`name`、`value`、`label`、`disabled`、`required`、`invalid`、`errorMessage` を公開入力として扱います。内部実装は Shadow DOM 内の `role="checkbox"` を持つ要素と Form-Associated Custom Element によって構成されますが、利用者は `ui-checkbox` を契約単位として扱います。

`checked` の既定値は `false` です。`indeterminate` の既定値も `false` です。`value` の既定値は `'on'` です。`name` が空文字列である場合、`checked=true` であってもフォーム送信値には参加しません。

`indeterminate` は**プロパティ入力専用**です。HTML 属性としての外部入力は公開契約に含みません。実装はスタイリングのために host 上へ `indeterminate` 属性を同期しますが、これは**導出状態**であり、利用者が外部から与えるための公開入力ではありません。

`checked=true` と `indeterminate=true` の両立は許可しません。`checked` が `true` になった時点で `indeterminate` は解除されます。

`invalid` は外部制御用のエラー状態です。ただし、意味のあるエラー状態として扱うには `errorMessage` と組み合わせて使用しなければなりません（MUST）。`invalid` 単独使用は視覚状態と妥当性状態を不整合にし得るため、正規入力としません。

`label` は可視ラベル用のテキスト入力です。Rich text、HTML、複数行の構造的ラベル、補助アイコン付きラベルは公開契約に含みません。これらが必要な場合は上位ラッパーで構成します。

アクセシブル名の決定は、**可視ラベルがある場合は可視ラベルに一本化**します。したがって、`label` を与える場合、外部 `aria-label` を併用する構成は正規入力に含みません。`label=''` の場合に限り、外部 `aria-label` または `aria-labelledby` を正規入力として扱います。

`aria-describedby` は外部入力を受け付けますが、内部エラーメッセージを持つ場合はそれを**連結**して扱います。外部 `aria-describedby` を内部実装が上書きすることには依存しません。

### 3.2 入力契約

| 名前              | 種別                                     | 必須  | 内容      | 契約                               |
| --------------- | -------------------------------------- | --- | ------- | -------------------------------- |
| `checked`       | property / attribute                   | いいえ | 選択状態    | `true` の場合のみ選択済みとして扱います          |
| `indeterminate` | property                               | いいえ | 中間状態    | プロパティ入力専用です。外部属性入力は公開契約に含みません    |
| `name`          | property / attribute                   | いいえ | フォーム送信名 | 空文字列の場合、送信値に参加しません               |
| `value`         | property / attribute                   | いいえ | フォーム送信値 | 既定値は `'on'` です                   |
| `label`         | property / attribute                   | いいえ | 可視ラベル   | テキストのみを受け付けます                    |
| `disabled`      | property / attribute                   | いいえ | 無効状態    | `true` の場合は操作不可、送信対象外です          |
| `required`      | property / attribute                   | いいえ | 必須状態    | `checked=false` のとき妥当性エラー要因になります |
| `invalid`       | property / attribute                   | いいえ | 外部エラー状態 | `errorMessage` と組み合わせて使用します      |
| `errorMessage`  | property / attribute (`error-message`) | いいえ | エラー文言   | `invalid=true` と併用します            |

### 3.3 属性反映契約

公開入力のうち、`checked`、`name`、`value`、`label`、`disabled`、`required`、`invalid`、`errorMessage` は property と attribute の両面から操作できます。`errorMessage` の HTML 属性名は `error-message` です。

`indeterminate` は property のみを公開入力とします。一方で、実装はスタイリングのため host 上へ `indeterminate` 属性を導出反映します。この属性は**公開 API ではなく内部状態の可視化**です。

| property        | attribute       | reflect | 備考                                             |
| --------------- | --------------- | ------- | ---------------------------------------------- |
| `checked`       | `checked`       | あり      | boolean attribute として扱います                      |
| `indeterminate` | なし（入力不可）        | なし      | property 入力のみです。host の `indeterminate` は導出属性です |
| `name`          | `name`          | あり      | 送信名です                                          |
| `value`         | `value`         | あり      | 既定値は `'on'` です                                 |
| `label`         | `label`         | あり      | テキストラベルです                                      |
| `disabled`      | `disabled`      | あり      | boolean attribute として扱います                      |
| `required`      | `required`      | あり      | boolean attribute として扱います                      |
| `invalid`       | `invalid`       | あり      | 外部エラー状態です                                      |
| `errorMessage`  | `error-message` | あり      | エラー文言です                                        |

### 3.4 公開イベント契約

`ui-checkbox` は、**ユーザー操作による状態変化時にのみ**次のイベントを発火します。

| 名前       | 発火条件                                                        | bubbles | composed | cancelable | 契約           |
| -------- | ----------------------------------------------------------- | ------- | -------- | ---------- | ------------ |
| `input`  | control のクリック、label のクリック、または control 上の Space キーで状態が変化した直後 | あり      | あり       | なし         | 状態更新後の一次通知です |
| `change` | `input` 発火後                                                 | あり      | あり       | なし         | 確定通知です       |

イベント順序は ``** → **`` で固定します。どちらのイベントも、`checked` および `indeterminate` の内部状態、FormData 参加状態、妥当性状態の同期が完了した後に発火します。

プロパティの直接代入による状態変更では、これらのイベントは自動発火しません。利用者は**プログラム変更とユーザー操作を同一視してはなりません**（MUST NOT）。

### 3.5 公開メソッド契約

`ui-checkbox` は、Shadow DOM 内の操作対象を直接探索させないため、次の公開メソッドを持ちます。

| 名前                 | 種別     | 契約                                                                             |
| ------------------ | ------ | ------------------------------------------------------------------------------ |
| `focus(options?)`  | method | `disabled=false` の場合に限り内部 control にフォーカスを委譲します。`disabled=true` の場合は no-op とします |
| `blur()`           | method | 内部 control からフォーカスを外します                                                        |
| `checkValidity()`  | method | 現在の妥当性状態を返します                                                                  |
| `reportValidity()` | method | 妥当性状態をレポートします                                                                  |

### 3.6 フォーム初期値・reset / state restore 契約

`ui-checkbox` は Form-Associated Custom Element として、**フォーム値の復元**と**表示状態の復元**を分けて扱います。

- `form.reset()` 時は、`checked` を初期値へ戻します。
- `form.reset()` 時は、`indeterminate` を常に `false` へ戻します。
- `form.reset()` 時に、`invalid` と `errorMessage` は自動解除しません。これらは外部表示制御として扱います。
- state restore を実装する場合、復元対象は `checked` を最優先とし、`indeterminate` は復元対象に含めません。

したがって、本コンポーネントにおいて reset の対象となるのは主として**フォーム送信値に関わる状態**であり、外部エラー表示や導出的な tri-state 表示は自動復元対象に含めません。

### 3.7 列挙外値・無効値の扱い

本コンポーネントは列挙型 property を持ちませんが、boolean / string の与え方によって不正または非正規状態が生じ得ます。

- `indeterminate=true` と `checked=true` の同時指定は許可しません。`checked=true` が優先され、`indeterminate` は解除されます。
- `invalid=true` かつ `errorMessage=''` は正規運用に含みません。この組み合わせでは visible error を成立させません。
- `label=''` の場合、外部から `aria-label` または `aria-labelledby` を提供しなければなりません（MUST）。
- `label` を与える場合、外部 `aria-label` の併用は正規入力に含みません。可視ラベルをアクセシブル名に優先します。
- `name=''` は許容されますが、フォーム送信値には参加しません。

### 3.8 責務範囲

責務範囲には、内部 control の描画、checked / indeterminate / disabled の状態反映、FormData への参加、妥当性状態の管理、control のクリック、label のクリック、control 上の Space キーによる操作、visible error の表示、および必要な ARIA 属性の付与を含みます。

一方で、次の事項は責務に含みません。

- エラーをいつ表示開始するかという UX 制御
- 必須項目の送信前検証タイミング
- 複数 checkbox の親子同期ロジック全体
- 説明文、ヘルプ文、補足注釈のレイアウト
- tri-state 状態の意味付けそのもの

---

## 4. 状態モデル

`ui-checkbox` の主要状態は、見た目ではなく、**選択状態、部分選択状態、操作可能性、妥当性、フォーム参加条件**によって読み分けます。

### 4.1 基本状態

最小状態は、`checked=false`、`indeterminate=false`、`disabled=false`、`required=false`、`invalid=false`、`errorMessage=''` の状態です。この状態では未選択の checkbox として振る舞います。

### 4.2 選択状態

`checked=true` の場合、選択済み状態として扱います。コントロールは選択色で塗りつぶされ、チェックアイコンを表示します。フォーム送信では、`disabled=false` かつ `name!==''` の場合に限り `value` を送信値として持ちます。

### 4.3 中間状態

`indeterminate=true` の場合、部分選択状態として扱います。視覚上は minus アイコンを表示し、ARIA 上は `aria-checked="mixed"` を出力します。

この状態は、**親項目が一部の子項目だけ選択されている**といったケースを表現するためのものです。通常の二値選択では使用しません。

### 4.4 中間状態からの遷移

ユーザー操作によって `indeterminate` 状態を解除する場合、遷移先は `checked=false` です。すなわち、

```text
Indeterminate → Unchecked
```

です。`Indeterminate → Checked` には遷移しません。これは Storybook 上でも固定されている境界条件です。

### 4.5 相互排他状態

`checked=true` に設定されると `indeterminate` は自動的に `false` になります。したがって、**選択済みかつ中間状態**という矛盾状態は持ちません。

### 4.6 無効状態

`disabled=true` の場合、クリックおよびキーボード操作を受け付けません。内部 control は `tabindex="-1"` となり、`aria-disabled="true"` を持ちます。フォーム送信値からも除外されます。公開 `focus()` を呼び出した場合も no-op として扱います。

### 4.7 必須状態

`required=true` かつ `checked=false` の場合、内部妥当性は `valueMissing` になります。これは**送信可能性の制約**であり、見た目のエラー表示を自動開始することを意味しません。

本コンポーネントでは、required 違反と visible error は分離されています。したがって、`required` による妥当性失敗を画面へどの時点で反映するかは上位レイヤが決定します。

### 4.8 外部エラー状態

`invalid=true` かつ `errorMessage` が非空の場合、visible error として扱います。この場合に限り、エラーボーダーとエラーメッセージを表示し、`aria-invalid="true"` を出力します。

`invalid=true` かつ `errorMessage` が空の場合は、公開契約として採用しません。この組み合わせでは visible error を成立させません。

### 4.9 妥当性優先順位

現行実装では、妥当性同期時の優先順位は次のとおりです。

1. `invalid=true` かつ `errorMessage` 非空 → `customError`
2. `required=true` かつ `checked=false` → `valueMissing`
3. それ以外 → valid

したがって、外部エラー状態は required 失敗より優先されます。

### 4.10 フォーム参加状態

フォーム送信値は、次の条件をすべて満たす場合にのみ FormData に含まれます。

- `checked=true`
- `disabled=false`
- `name!==''`

これらのいずれかを満たさない場合、送信値は `null` として扱います。

---

## 5. DOM / Accessibility

ルートは `:host` です。Shadow DOM 内部に `.wrapper`、`.control`、必要に応じた `.label`、必要に応じた `.error-message` を持ちます。

```text
<ui-checkbox>
  #shadow-root
    <div class="wrapper">
      <span class="control" part="control" role="checkbox"></span>
      [label.part="label"]
    </div>
    [span.error-message]
</ui-checkbox>
```

### 5.1 Accessibility 契約

アクセシビリティ上の重要点は次のとおりです。

- 対話主体は Shadow DOM 内の `.control[role="checkbox"]` です。
- `checked=false / true / indeterminate=true` に応じて `aria-checked="false" / "true" / "mixed"` を出力します。
- `disabled=true` の場合、`aria-disabled="true"` を出力します。
- `required=true` の場合、`aria-required="true"` を出力します。
- `invalid=true` かつ `errorMessage` 非空の場合のみ `aria-invalid="true"` を出力します。
- `label` がある場合、内部 control は `aria-labelledby` でそのラベルを参照します。
- `label` がない場合は、外部から `aria-label` または `aria-labelledby` を提供しなければなりません（MUST）。
- `label` がある場合、外部 `aria-label` の併用は正規入力に含みません。アクセシブル名の決定は可視ラベルに一本化します。
- `aria-describedby` は、外部指定に加えてエラーメッセージ ID を必要に応じて連結します。
- `aria-describedby` の外部指定は保持し、内部 error ID は後置連結します。内部実装が外部指定を上書きすることには依存しません。

### 5.2 ラベル契約

`label` は内部 `<label>` 要素として描画されますが、ネイティブ checkbox と label 要素の自動連携には依存していません。ラベルクリック時は、実装が明示的に control へフォーカスを移し、状態トグルを実行します。

したがって、本コンポーネントにおけるラベルは、**視覚ラベル兼クリック領域**であって、独立したキーボード操作主体ではありません。ラベル Enter 起動は公開契約に含みません。

### 5.3 フォーカス契約

キーボードフォーカスは `.control` が受け取ります。`disabled=true` の場合はフォーカス対象外です。可視フォーカスは `:focus-visible` によって表示します。

### 5.4 アクセシブル名の決定

アクセシブル名の決定は、契約上、次の優先順位で固定します。

1. `label` がある場合は内部ラベル参照
2. `label` がない場合は外部 `aria-labelledby`
3. `label` がない場合の外部 `aria-label`

この順序は単なる実装都合ではなく、公開契約です。したがって、可視ラベルがある状態で `aria-label` により別名へ上書きする運用は正規入力に含みません。

### 5.5 `aria-describedby` 合成契約

`aria-describedby` は、外部から渡された ID 群と、内部エラーメッセージの ID を**空白区切りで連結**して構成します。連結順序は、

1. 外部 `aria-describedby`
2. 内部 error ID

の順で固定します。

`invalid=true` かつ `errorMessage` 非空の場合にのみ、内部 error ID を追加します。エラー非表示時は内部 error ID を連結しません。

本コンポーネントは、`aria-describedby` の重複 ID 除去、並べ替え、意味解釈には責務を持ちません。利用者は外部から与える ID 群の整合性を確保しなければなりません（MUST）。

---

## 6. Visual Contract

`ui-checkbox` の視覚契約は、読書面に過剰な強調を持ち込まずに、**選択状態の差だけを明確に見せること**にあります。

### 6.1 情報順位

- 未選択は、淡い背景と境界線によって「選択可能な構造」として静かに存在します。
- 選択済みは、塗り背景とチェックアイコンによって明確に示します。
- 中間状態は、塗り背景と minus アイコンによって、選択済みとは異なる部分状態であることを示します。
- 無効状態は、ラベル行全体の不透明度低下によって操作不能を示します。
- エラー状態は、境界線とエラーメッセージによって示します。

### 6.2 レイアウト

ルートは `inline-flex` です。内部 `.wrapper` も `inline-flex` であり、control と label を横並びに配置します。host は縦方向に並ぶため、エラーメッセージはラベル行の下に配置されます。

### 6.3 寸法契約

- control の視覚サイズは `16px × 16px` です。
- label との間隔は `--space-2` に従います。
- タッチターゲット補助は `.control::before` で確保します。
- 最小タッチ領域は `44px × 44px` を下限とします。

このコンポーネントは、**視覚上の正方形サイズ**と**実際に触れるべき最小領域**を分離します。

### 6.4 視覚仕様

- 未選択時は `--bg-fill-muted` と `--border-muted` を使用します。
- hover 時は `--border-default` によって境界線を強めます。
- checked / indeterminate 時は `--primary` を背景色および境界線色に用います。
- アイコン色は `--on-primary` を用います。
- `invalid=true` かつ `errorMessage` 非空の visible error 時に限り `--border-danger` を境界線に用います。
- エラーメッセージ色は `--fg-danger` を用います。
- disabled 時は `--opacity-disabled` により全体を弱めます。

### 6.5 モーション

押下時は `transform: scale(--scale-pressed)` により短いタクタイル反応を与えます。transition は `background-color`、`border-color`、`transform` に対してのみ定義し、常時アニメーションには依存しません。

### 6.6 フォーカス表示

フォーカスリングは `outline` と `outline-offset` により描画します。エラー状態ではフォーカスリング色も `--border-danger` に切り替わります。

### 6.7 参照トークン

本コンポーネントは、主として次のトークンに依存します。

| 用途        | トークン                                                                                      |
| --------- | ----------------------------------------------------------------------------------------- |
| 選択背景・境界線  | `--primary`                                                                               |
| 選択アイコン色   | `--on-primary`                                                                            |
| 未選択背景     | `--bg-fill-muted`                                                                         |
| 未選択境界線    | `--border-muted`                                                                          |
| hover 境界線 | `--border-default`                                                                        |
| エラー境界線    | `--border-danger`                                                                         |
| ラベル色      | `--fg-default`                                                                            |
| エラー文字色    | `--fg-danger`                                                                             |
| 無効不透明度    | `--opacity-disabled`                                                                      |
| 角丸        | `--radius-sm`                                                                             |
| ボーダー幅     | `--border-width`                                                                          |
| 押下スケール    | `--scale-pressed`                                                                         |
| 遷移時間      | `--duration-fast`                                                                         |
| イージング     | `--ease-out`                                                                              |
| フォーカスリング  | `--focus-ring-width` / `--focus-ring-color` / `--focus-ring-offset` / `--animation-focus` |
| 最小タッチ領域   | `--control-min-touch`                                                                     |
| タイポグラフィ   | `--text-base` / `--text-sm` / `--line-height-normal`                                      |
| 余白        | `--space-2`                                                                               |

---

## 7. 環境別の振る舞い

### 7.1 Reduced Motion

`prefers-reduced-motion: reduce` 環境では、transition duration を極小化します。押下アニメーションや色遷移はほぼ瞬時になります。

### 7.2 Forced Colors

`forced-colors: active` 環境では、システムカラーを優先します。

- control は `Canvas` / `CanvasText` を基準に描画します。
- checked / indeterminate は `Highlight` を背景に用います。
- アイコンは `HighlightText` を用います。
- フォーカスリングは `CanvasText` を用います。
- box-shadow には依存しません。

### 7.3 Dark Mode

本コンポーネントは dark mode 専用のメディアクエリを持ちません。ダークテーマ対応はトークン差し替えによって成立させます。

### 7.4 Print

print 専用スタイルは定義していません。印刷時の表示制御は上位レイヤ側で判断します。

---

## 8. 関連契約

### 8.1 ユーザー操作契約

ユーザー操作として正規に扱うのは、次の 3 種です。

- control のクリック
- label のクリック
- control 上での Space キー

このとき、状態遷移後に ``**、ついで **`` を発火します。

Enter キーは control の正規操作には含みません。checkbox は button ではないため、キーボード起動は Space を正規とします。label 自体の Enter 起動も公開契約に含みません。

### 8.2 フォーム関連付け契約

`ui-checkbox` は Form-Associated Custom Element です。したがって、内部にネイティブ `<input type="checkbox">` を持たなくても、FormData に参加できます。

| 条件                                                | 振る舞い                 |
| ------------------------------------------------- | -------------------- |
| `checked=true` かつ `disabled=false` かつ `name!==''` | `value` を送信値として設定します |
| `checked=false`                                   | 送信値は `null` です       |
| `disabled=true`                                   | 送信値は `null` です       |
| `name=''`                                         | 送信値は `null` です       |

同一 `name` を持つ複数の `ui-checkbox` は、**相互排他グループではなく独立した送信単位**として扱います。したがって、同名 checkbox 群に対して単一選択制御や値の集約意味を与えることは本コンポーネントの責務ではありません。

複数要素が同じ `name` を共有する場合でも、各要素はそれぞれ `checked / disabled / name` 条件に基づいて独立に FormData 参加を判定します。radio 的な単一選択保証には依存しません。

### 8.3 妥当性契約

妥当性は `ElementInternals` に同期されます。

| 条件                                  | 妥当性            |
| ----------------------------------- | -------------- |
| `invalid=true` かつ `errorMessage` 非空 | `customError`  |
| `required=true` かつ `checked=false`  | `valueMissing` |
| それ以外                                | valid          |

`checkValidity()` と `reportValidity()` はこの内部状態に従います。

ただし、ここで用いる**内部妥当性メッセージ文字列**は公開契約に含みません。required 違反時に内部でどの文言を `setValidity()` へ渡すか、あるいは UA がどのようにレポートするかには依存しません。可視エラーとして利用者が依存してよい公開面は、`invalid` と `errorMessage` の組み合わせのみです。

したがって、`reportValidity()` の結果としてブラウザが表示するネイティブ UI は視覚契約に含めません。画面上のエラー表現を固定したい場合、上位レイヤは `checkValidity()` の結果を見て `invalid` と `errorMessage` を明示的に制御します。

### 8.4 スタイル拡張契約

外部スタイル拡張は、CSS Custom Properties と `::part(...)` を通じて行います。公開 part は次の 2 つです。

| part 名    | 役割               |
| --------- | ---------------- |
| `control` | 視覚上の checkbox 本体 |
| `label`   | 可視ラベル            |

`error-message` は現行公開 part に含みません。したがって、エラー文言のスタイリングは公開トークンの範囲で成立させ、内部 `.error-message` class や Shadow DOM 内部構造への依存は公開契約として認めません。

内部 class 名、Shadow DOM 内部構造、アイコン SVG 構造には依存しません。これらは公開契約に含みません。

---

## 9. 境界条件

### 9.1 label なし

`label=''` の場合、コントロールのみを描画します。この場合、外部から `aria-label` または `aria-labelledby` を提供しなければなりません（MUST）。

### 9.2 checked と indeterminate の両立

`checked=true` が設定された場合、`indeterminate` は解除されます。両状態の併存には依存しません。

### 9.3 indeterminate のユーザー解除

`indeterminate=true` の checkbox をユーザーが操作した場合、次状態は `checked=false` です。checked にはなりません。

### 9.4 disabled 時の操作

`disabled=true` の場合、クリックしても状態は変化せず、`input` / `change` も発火しません。公開 `focus()` を呼び出しても no-op とします。

### 9.5 required だが未表示エラー

`required=true` かつ `checked=false` であっても、`invalid` と `errorMessage` を与えない限り、可視エラーは自動表示しません。required は送信可能性制約であって、自動表示契約ではありません。

### 9.6 invalid 単独指定

`invalid=true` かつ `errorMessage=''` は公開契約として採用しません。視覚状態だけが先行し、妥当性と ARIA が一致しないためです。

### 9.7 フォーム送信名なし

`name=''` の場合、`checked=true` でも FormData に参加しません。表示上の checkbox と送信フィールドは一致しません。

### 9.8 プログラム変更

`checked` や `indeterminate` を直接代入しても `change` / `input` は自動発火しません。イベントはユーザー操作起点に限定します。

---

## 10. Storybook 契約

本節では、``** に実在する Story 名のみ**を用います。仮想的な確認項目名は使用しません。追加の契約確認点は、既存 Story の「固定する契約」に内包して記述します。

各 Story は見本ではなく、**契約確認点**として扱います。将来変更時には、次の契約を維持します。

| Story                        | 固定する契約                                                                                                                             |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `Default`                    | 既定状態が未選択であり、`role="checkbox"`、`aria-checked="false"`、`tabindex="0"` を持つこと                                                          |
| `UncheckedNormal`            | 未選択時の基本状態が成立すること                                                                                                                   |
| `CheckedNormal`              | checked 時に `aria-checked="true"` と check icon が成立すること                                                                              |
| `IndeterminateNormal`        | indeterminate 時に `aria-checked="mixed"` と minus icon が成立すること                                                                       |
| `UncheckedDisabled`          | disabled 時に `aria-disabled="true"` かつ `tabindex="-1"` となること                                                                        |
| `CheckedDisabled`            | checked + disabled が両立し、操作不能であること                                                                                                  |
| `IndeterminateDisabled`      | indeterminate + disabled が両立し、操作不能であること                                                                                            |
| `UncheckedInvalid`           | `invalid + errorMessage` により `aria-invalid`、error message、`aria-describedby` が成立すること。visible error はこの組み合わせでのみ成立することの参照 Storyとします  |
| `CheckedInvalid`             | checked 状態でも外部 invalid を重ねられること                                                                                                    |
| `AllStates`                  | 主要状態の一覧が同時描画できること                                                                                                                  |
| `ClickToggle`                | クリックで状態がトグルし、`input`、ついで `change` が発火すること                                                                                          |
| `LabelClickToggle`           | ラベルクリックで状態がトグルすること                                                                                                                 |
| `KeyboardToggle`             | Space キーで状態がトグルすること                                                                                                                |
| `IndeterminateToUnchecked`   | indeterminate からのユーザー遷移先が unchecked であること                                                                                          |
| `CheckedClearsIndeterminate` | `checked=true` により `indeterminate` が自動解除されること                                                                                      |
| `DisabledClickBlocked`       | disabled 時にクリックが無効化され、状態変化もイベント発火も起きないこと                                                                                           |
| `NoLabel`                    | ラベルなし運用では外部 ARIA 名が必要であること。`label` がない場合のアクセシブル名入力経路を確認する Story として扱います                                                            |
| `DarkThemeStates`            | トークン差し替えによるダークテーマ表示が成立すること                                                                                                         |
| `ForcedColorsSimulation`     | forced colors 相当の表示が成立すること                                                                                                         |
| `FormIntegration`            | checked / disabled / name 条件に応じて FormData 参加が切り替わること。同一 `name` を持つ複数 checkbox は相互排他ではなく独立送信単位として扱う契約の参照 Story とします                 |
| `RequiredValidation`         | required と `checkValidity()` の組み合わせが成立すること。required は内部妥当性制約であり、visible error は `invalid + errorMessage` により外部制御することの参照 Story とします |
| `SelectAllPattern`           | 親子 checkbox の tri-state パターン例が成立すること                                                                                               |

### 10.1 Storybook 契約の読み方

- **Story 名は **``** の export 名と完全一致**させます。
- 実在しない Story 名を契約表へ追加しません。
- 単独 Story を持たない契約確認点は、既存 Story の説明へ吸収します。
- まだ Story 上で明示確認していない契約は、Storybook 契約ではなく本文の公開契約・境界条件・未整合事項として扱います。
- Storybook は契約本文そのものではなく、契約確認手段として扱います。

---

## 11. 補足

`ui-checkbox` の要点は、チェックマークの見た目ではありません。**二値選択と部分選択を、フォーム送信・妥当性・アクセシビリティと矛盾なく接続すること**にあります。

したがって、今後の変更でも次の 4 点は崩さない方がよいです。

1. `indeterminate` は property 入力専用とし、導出属性と外部入力契約を混同しないこと。
2. `checked` と `indeterminate` の排他を維持すること。
3. ユーザー操作イベントとプログラム変更を分離し続けること。
4. required と visible error を分離し、表示責務を上位へ残すこと。

---

## 12. 将来拡張の原則

本節は現行実装の公開契約ではなく、将来追加を検討する場合の設計指針です。追加機能は checkbox を多機能化するためではなく、**読書の没入を壊さずに意味と運用性を補強する場合に限って**採用します。

### 12.1 最優先で検討する価値がある拡張

#### 12.1.1 補助説明文の公開契約

現行の `ui-checkbox` は `label` と `errorMessage` は持ちますが、通常の補助説明文を持ちません。フォーム UI では、選択肢の意味や注意事項を checkbox の近傍で提示したい場面があります。

この拡張を採用する場合、次を満たします。

- 補助説明文は `errorMessage` と別責務にします。
- `aria-describedby` へ自然に統合できるようにします。
- ラベル、説明文、エラー文の責務を混同しません。
- 本文近傍では視覚ノイズを増やさない配置にします。

#### 12.1.2 name / value / checked の初期値と reset 契約

現行実装は FormData 参加はできますが、フォーム reset に対する初期状態復元契約が弱いです。フォーム部品としての一貫性を高めるには、初期 checked 状態および reset 時の戻り先を明確にする価値があります。

この拡張を採用する場合、次を満たします。

- 初期 checked 状態を reset 基準として明示します。
- `indeterminate` の reset 時扱いを契約化します。
- ネイティブ checkbox と近い期待値を維持します。
- programmatic state と default state を分離します。

### 12.2 条件付きで価値がある拡張

#### 12.2.1 Rich label slot

現行は `label` をテキスト属性に限定しています。リンク、注記、補助アイコンを含むラベルが必要な場面では slot 化の価値があります。ただし、checkbox 単体が過度に複雑になるため、採用は慎重に行います。

この拡張を採用する場合、次を満たします。

- テキスト属性ラベルと slot ラベルの責務を明確に分けます。
- アクセシブル名の決定規則を再定義します。
- ラベル内リンクなどの相互作用衝突を避けます。
- 読書面で過剰な装飾を導入しません。

#### 12.2.2 エラー状態の一元化

現行は `required` による妥当性失敗と `invalid + errorMessage` による visible error が分離されています。運用負荷を下げるために、これらを一元的に扱う API の追加は条件付きで検討価値があります。

この拡張を採用する場合、次を満たします。

- required failure と custom error の責務差を消しません。
- 自動表示と手動表示のどちらを採るかを明示します。
- `aria-invalid` の出し分け規則を明文化します。
- 外部フォームライブラリとの整合を崩しません。

### 12.3 採用しない方針

次の方向は、責務を不必要に肥大化させるため採りません。

- button 的な Enter 起動を checkbox に持ち込むこと
- checkbox 自身へ親子選択ロジック全体を内蔵すること
- ラベル中の複雑なレイアウトを checkbox 単体の責務にすること
- 画面全体のエラー表示戦略を checkbox 側へ持ち込むこと

---

## 13. 現行実装で未対応または未整合の事項

本節は、現行の `checkbox.ts` および `checkbox.stories.ts` を基準として、**契約書内で厳密化しているが、現時点では未実装、未強制、または未整合である事項**を整理するものです。

### 13.1 required 違反時の visible error 自動化

現行実装は `required=true` かつ `checked=false` のとき `ElementInternals` 上は invalid になりますが、visible error と `aria-invalid` は自動では出しません。Storybook でも、required 失敗の可視化は外部ロジックで `invalid` と `errorMessage` を設定しています。

したがって、**required と visible error の自動連動は未実装**です。

### 13.2 `invalid` 単独指定時の不整合

現行実装は `invalid` 属性があるだけで視覚上はエラー境界線を表示します。しかし、`errorMessage` が空の場合は `setValidity({ customError: true }, ...)` を行わず、`aria-invalid` も出力しません。

したがって、``** 単独では視覚状態と妥当性状態が一致しません**。契約書では visible error を `invalid + errorMessage` に限定しています。

### 13.3 フォーム reset / state restore 契約

現行実装は FormData 参加には対応していますが、`formResetCallback()` や `formStateRestoreCallback()` に相当する復元契約は実装していません。したがって、**契約書で定義した reset / restore 挙動は未実装**です。

### 13.4 イベント順序

現行実装は状態変化時に `change`、ついで `input` を発火しています。一方、契約書では `input`、ついで `change` を正規順序として定義しています。

したがって、**イベント順序は現行実装と契約書で未整合**です。

### 13.5 ラベルのキーボード契約

実装にはラベルに対する Enter キー処理がありますが、契約書ではラベルをクリック領域としてのみ扱い、ラベル Enter 起動を公開契約に含めていません。

したがって、**ラベル Enter 起動は現行実装に残っているが、契約上は採用していない挙動**です。

### 13.6 アクセシブル名入力の競合制御

`label` がある状態でも、外部 `aria-label` を同時に与えられます。現行実装はこの競合を明示的に防いでいません。したがって、**可視ラベル優先は契約上の規律であり、実装上の強制ではありません**。

### 13.7 `focus()` と disabled の関係

現行実装は `disabled=true` でも公開 `focus()` が内部 control の `focus()` をそのまま呼び出します。契約書では no-op と定義しています。

したがって、**disabled 時の **``** 挙動は現行実装と契約書で未整合**です。

### 13.8 `aria-describedby` の重複整理

現行実装は、外部 `aria-describedby` と内部 error ID を連結しますが、重複 ID の除去や順序正規化までは行いません。したがって、``** の整合性確保は利用側責務**です。

### 13.9 タッチターゲット寸法の整合性

実装コメントには 44×44px と読める記述がありますが、既定トークン `--control-min-touch` は `24px` です。契約書では 44×44px を下限として定義しています。

したがって、**タッチターゲット寸法は現行実装と契約書で未整合**です。

### 13.10 Rich label 非対応

現行実装は `label` を string property に限定しており、HTML を含む複合ラベルや補助説明を受け取れません。これは意図的な簡素化でもありますが、**ラベル表現の拡張性は未対応**です。

### 13.11 Storybook controls と `indeterminate`

現行 Storybook では `indeterminate` に control が残っており、利用者からは通常の公開入力に見えます。一方、契約書では property-only の制御状態として定義しています。

したがって、**Storybook controls 上の見え方と契約書の定義が未整合**です。

### 13.12 アクセシブル名の競合入力（`label` なし時）

契約書では、`label=''` の場合のアクセシブル名決定順序を `aria-labelledby`、ついで `aria-label` と定義しています。しかし現行実装は、`label` がない状態で外部 `aria-labelledby` と `aria-label` の両方が与えられた場合、**優先規則を強制せず両方をそのまま control へ設定**します。

したがって、``** なし時のアクセシブル名優先順位は契約上は定義済みでも、実装上は未強制**です。

### 13.13 実装内 JSDoc / コメントの未整合

現行実装の JSDoc および inline comment には、現在の契約と一致しない記述が残っています。たとえば、`@fires input` は「change と同タイミング」と記述され、`willUpdate()` 周辺には `indeterminate` に対して `reflect: true` を前提とした古い説明が残っています。

したがって、**公開契約と実装内ドキュメントが未整合**です。コード利用者が型定義やソースコメントを参照した場合、契約書と異なる理解に至る余地があります。

### 13.14 Reduced Motion の Storybook 契約未カバー

現行実装は `prefers-reduced-motion: reduce` に対応したスタイルを持ち、契約書でも Reduced Motion を環境別の振る舞いとして定義しています。しかし `checkbox.stories.ts` には、Reduced Motion を直接確認する Story が存在しません。

したがって、**Reduced Motion は実装されているが、Storybook 契約としては未カバー**です。

### 13.15 本節の扱い

本節に記載した事項は、現行公開契約として利用者が依存してよいものではありません。これらを採用または修正する場合は、実装、Storybook、契約書の 3 点を同時に更新し、未整合状態を残したまま公開契約へ昇格させません。

