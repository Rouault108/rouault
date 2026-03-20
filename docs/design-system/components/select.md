# Select

## 文書の位置付け

本書は、`ui-select` を **固定された選択肢集合から 1 件を選択する単一選択コンポーネント** として定義する契約書です。

本書では、現行実装への追従よりも、**設計の明快さ、長期保守性、意味論の一貫性** を優先します。そのため、現行の `select.ts` および `select.stories.ts` に存在する公開面のうち、長期契約として不適切なものはそのまま踏襲せず、**将来にわたって安定して維持しやすい契約** へ再構成します。

`ui-select` は自由入力を受け付ける部品ではありません。したがって、本コンポーネントは **combobox ではなく select-only widget** として扱い、Trigger と popup listbox から構成される選択 UI として定義します。

Rouault における select は、フォーム入力要素であると同時に、**本文、注記、補助説明の読書リズムを乱しすぎない静かな UI** であることを求めます。したがって、本契約は、入力可能性・エラー・選択状態を十分に伝えつつ、本文より強く主張しない視覚設計を前提とします。

---

## 設計方針

### この契約で固定する設計判断

本書では、次の事項を長期契約として固定します。

- `ui-select` は **単一選択専用** です。複数選択は対象外です。
- `ui-select` は **自由入力不可** です。検索入力や候補フィルタリングは責務に含めません。
- Trigger は **button**、popup は **listbox** とします。
- 選択値は `` とし、`null` を未選択の唯一の表現とします。
- option の `value` は **一意な非空文字列** とします。
- `options` と整合しない値は保持せず、``** に正規化** します。
- 開閉状態は **内部管理** とし、外部からの完全制御対象にはしません。
- `readonly` は採用しません。非変更表示が必要な場合は別コンポーネントで扱います。
- フォーム送信では、**未選択時は送信値を持ちません**。
- エラー状態は `error` と `errorMessage` の組で表し、許可する組み合わせを固定します。

これにより、値モデル、状態遷移、ARIA、フォーム意味論の基準を単純化します。

### 適用範囲

本書は、`ui-select` の次の事項を対象とします。

- 公開契約
- 状態モデル
- DOM / Accessibility
- Visual Contract
- フォーム契約
- ポップアップ契約
- 境界条件
- Storybook 契約
- 現行実装との差分

一方、本書は次の事項を扱いません。

- 非同期候補取得
- 候補フィルタリング
- 仮想スクロール
- 複数選択
- オプショングループ
- 自由記述入力
- サーバーサイド検索
- モバイル OS ネイティブ picker への委譲
- 画面全体のフォームレイアウト

これらは上位レイヤまたは別コンポーネントの責務です。

---

## 公開契約

### 正式な公開入力

| 名前             | 種別                                     | 必須  | 型                         | 既定値        | 内容         |
| -------------- | -------------------------------------- | --- | ------------------------- | ---------- | ---------- |
| `label`        | property / attribute                   | はい  | `string`                  | なし         | 入力ラベル      |
| `name`         | property / attribute                   | いいえ | `string`                  | なし         | フォーム送信名    |
| `value`        | property / attribute                   | いいえ | `string \| null`          | `null`     | 選択値        |
| `placeholder`  | property / attribute                   | いいえ | `string`                  | `''`       | 未選択時表示     |
| `helpText`     | property / attribute (`help-text`)     | いいえ | `string`                  | `''`       | 非エラー時の補助説明 |
| `error`        | property / attribute                   | いいえ | `boolean`                 | `false`    | エラー状態      |
| `errorMessage` | property / attribute (`error-message`) | いいえ | `string`                  | `''`       | エラー説明      |
| `disabled`     | property / attribute                   | いいえ | `boolean`                 | `false`    | 操作無効化      |
| `required`     | property / attribute                   | いいえ | `boolean`                 | `false`    | 選択必須       |
| `variant`      | property / attribute                   | いいえ | `'filled' \| 'outline'`   | `'filled'` | 外観バリアント    |
| `options`      | property                               | はい  | `readonly SelectOption[]` | なし         | 選択肢配列      |

### `SelectOption` 契約

| 名前         | 型         | 必須  | 契約       |
| ---------- | --------- | --- | -------- |
| `value`    | `string`  | はい  | 一意な非空文字列 |
| `label`    | `string`  | はい  | 表示ラベル    |
| `disabled` | `boolean` | いいえ | 選択不可     |

### 値モデル契約

`value` は ``** または **``** のいずれか** でなければなりません。

- `null` は未選択を表す唯一の値です。
- `''` は未選択値として使いません。
- `options` に存在しない値は無効です。
- `options` 更新によって現在値が無効化された場合、値は `null` に正規化されます。
- 数値やオブジェクトを `value` に使ってはなりません。

この契約により、未選択値、フォーム送信値、表示状態を一貫させます。

### エラー表現契約

`error` と `errorMessage` の許可組み合わせは次のとおりです。

| `error` | `errorMessage` | 契約       |
| ------- | -------------- | -------- |
| `false` | 空              | 通常状態     |
| `false` | 非空             | 契約違反     |
| `true`  | 非空             | 正常なエラー状態 |
| `true`  | 空              | 契約違反     |

`helpText` は `error=false` の場合にのみ表示します。`helpText` と `errorMessage` は同時表示しません。

### 開閉状態契約

開閉状態は内部管理です。利用者は開閉状態を **監視** できますが、**所有** はしません。

- `opened` は読み取り専用の公開状態です。
- `opened` を外部入力として制御してはなりません。
- 外部から開閉を指示する場合は公開メソッドを使います。
- popup の生成・破棄、focus 遷移、outside interaction の処理はコンポーネント内部責務です。

### 非採用の公開入力

長期契約としては、次を採用しません。

- `modelValue`
- `readonly`
- 外部制御用 `opened`
- 数値 `value`

これらは現行実装との互換のために残り得ますが、新しい正式契約の公開面には含めません。

---

## 公開イベント

### 正式イベント

| 名前             | 型             | detail                                                                                                                                       | 発火条件        | 契約                                 |
| -------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------- |
| `value-change` | `CustomEvent` | `{ value: string \| null, previousValue: string \| null, reason: 'selection' \| 'options-change' \| 'reset' \| 'programmatic' }`             | 値が変化したとき    | `bubbles: true` / `composed: true` |
| `open-change`  | `CustomEvent` | `{ opened: boolean, reason: 'trigger' \| 'keyboard' \| 'selection' \| 'escape' \| 'outside-pointer' \| 'outside-scroll' \| 'programmatic' }` | 開閉状態が変化したとき | `bubbles: true` / `composed: true` |

### イベント契約

- `value-change` は **値が実際に変わった場合のみ** 発火します。
- 同値再選択では `value-change` を発火しません。
- `options` 更新により値が `null` に正規化された場合は `reason: 'options-change'` で発火します。
- form reset により値が初期値へ戻った場合は `reason: 'reset'` で発火します。
- `open-change` は open / close の両方で発火します。
- `input`、`change`、`focus`、`blur` の独自再送出は正式契約に含めません。

ネイティブイベント名と意味を混同しないため、値変更イベントは `value-change` を正式名称とします。

---

## 公開メソッド

| 名前                 | 契約                            |
| ------------------ | ----------------------------- |
| `focus(options?)`  | Trigger へフォーカスを移します           |
| `blur()`           | Trigger からフォーカスを外します          |
| `open()`           | popup を開きます                   |
| `close()`          | popup を閉じます                   |
| `toggle()`         | popup の開閉を反転します               |
| `checkValidity()`  | 現在値と `required` に基づいて妥当性を返します |
| `reportValidity()` | 妥当性を報告します                     |
| `reset()`          | 値を初期値へ戻します                    |

`open()`、`close()`、`toggle()` は開閉の唯一の命令面です。利用者は `opened` を直接書き換えるのではなく、これらを使います。

---

## 属性反映契約

| property       | attribute       | reflect | 備考                            |
| -------------- | --------------- | ------- | ----------------------------- |
| `label`        | `label`         | あり      | 必須                            |
| `name`         | `name`          | あり      | フォーム送信名                       |
| `value`        | `value`         | あり      | `null` は attribute 未設定として扱います |
| `placeholder`  | `placeholder`   | あり      | 未選択時のみ表示                      |
| `helpText`     | `help-text`     | あり      | 非エラー時のみ表示                     |
| `error`        | `error`         | あり      | boolean attribute             |
| `errorMessage` | `error-message` | あり      | `error=true` のときのみ意味を持ちます     |
| `disabled`     | `disabled`      | あり      | boolean attribute             |
| `required`     | `required`      | あり      | boolean attribute             |
| `variant`      | `variant`       | あり      | `filled` / `outline`          |
| `options`      | なし              | なし      | property 専用                   |
| `opened`       | `opened`        | あり      | 読み取り専用状態                      |

---

## 状態モデル

### 基本状態

最小状態は、`label` と `options` を持ち、`value=null`、`opened=false`、`disabled=false`、`required=false`、`error=false`、`variant='filled'` の状態です。

### 選択状態

`value` が `options[].value` のいずれかと一致する場合、その option が選択済みです。Trigger には対応する `label` を表示します。

### 未選択状態

`value=null` の場合、未選択状態です。Trigger は `placeholder` を表示します。`placeholder` が空の場合は空表示を許容しますが、視覚上の判別可能性は維持しなければなりません。

### 無効値正規化状態

`options` 更新や初期値投入によって `value` が `options` と整合しない場合、コンポーネントはその値を保持せず `null` に正規化します。

### 開閉状態

- `opened=false` のとき popup は存在しません。
- `opened=true` のとき listbox は overlay layer に生成されます。
- open 時、active option は現在値があればその項目、なければ先頭の有効 option に初期化します。
- close 時、focus は Trigger に戻します。

### Active option 状態

開いている間、listbox は active option を 1 件だけ持ちます。

- active option は DOM focus の代替ではなく、listbox 内部の選択移動状態です。
- disabled option は active option 候補から除外します。
- Arrow キー移動は循環します。

### Disabled 状態

`disabled=true` の場合、Trigger は操作不能です。

- フォーカス不可
- open 不可
- 値変更不可
- FormData 不参加

### Required 状態

`required=true` かつ `value=null` の場合、不正状態です。

- `checkValidity()` は `false` を返します。
- `reportValidity()` は不正状態を通知します。
- `error` は視覚状態の制御であり、妥当性判定そのものとは別責務です。

### エラー状態

`error=true` かつ `errorMessage` が非空のとき、視覚的エラー状態です。

- `helpText` は表示しません。
- `aria-invalid="true"` を付与します。
- `errorMessage` を live region として公開します。

### Variant 状態

| 値         | 意味        |
| --------- | --------- |
| `filled`  | 既定の面を持つ入力 |
| `outline` | 境界中心の軽量入力 |

---

## DOM / Accessibility

### 意味論

`ui-select` は **button + listbox** パターンを採用します。

```text
<ui-select>
  #shadow-root
    <label id="label-id" for="trigger-id">…</label>
    <button
      id="trigger-id"
      type="button"
      aria-labelledby="label-id trigger-text-id"
      aria-haspopup="listbox"
      aria-expanded="…"
      aria-controls="listbox-id"
    >
      <span id="trigger-text-id">…</span>
      <iconify-icon />
    </button>
    [div.help-text]
    [div.error-message]

  <overlay-root>
    <div id="listbox-id" role="listbox" tabindex="-1" aria-labelledby="label-id">
      <div role="option" aria-selected="…">…</div>
      …
    </div>
  </overlay-root>
</ui-select>
```

### Accessibility 契約

- Trigger は `button` です。
- popup は `role="listbox"` です。
- option は `role="option"` を持ちます。
- Trigger のアクセシブル名は **label 要素** から決定します。
- `aria-label` をアクセシブル名の主経路として使いません。
- open 中は Trigger が `aria-expanded="true"` を持ちます。
- open 時、listbox に focus を移します。
- close 時、Trigger に focus を戻します。
- `error=true` の場合、Trigger は `aria-invalid="true"` を持ちます。
- `helpText` と `errorMessage` は `aria-describedby` の参照先を排他的に切り替えます。
- `errorMessage` 要素は `role="status"` と `aria-live="polite"` を持ちます。
- disabled option は `aria-disabled="true"` を持ちます。

### キーボード操作契約

| キー          | 振る舞い                                      |
| ----------- | ----------------------------------------- |
| `Enter`     | close 中なら open、open 中なら active option を選択 |
| `Space`     | close 中なら open、open 中なら active option を選択 |
| `ArrowDown` | close 中なら open、open 中なら次の有効 option へ      |
| `ArrowUp`   | close 中なら open、open 中なら前の有効 option へ      |
| `Home`      | open 中に先頭有効 option へ                      |
| `End`       | open 中に末尾有効 option へ                      |
| `Escape`    | open 中なら close                            |
| `Tab`       | popup を閉じて通常の focus 遷移を許可                 |
| 印字可能文字      | type-ahead により前方一致移動                      |

### Type-ahead 契約

Type-ahead は **候補ジャンプ補助** であり、検索入力ではありません。

- 1 秒以内の入力は同一バッファとして扱います。
- 一致規則は `label` の大小文字を無視した前方一致です。
- Unicode 正規化、全角半角正規化、かな漢字変換、ロケール依存照合は契約しません。

---

## フォーム契約

`ui-select` は Form Associated Custom Elements として振る舞います。

### 送信契約

| 条件              | 送信値          |
| --------------- | ------------ |
| `name` 未指定      | FormData 不参加 |
| `disabled=true` | FormData 不参加 |
| `value=null`    | FormData 不参加 |
| `value='x'`     | `name=x` を送信 |

未選択時に空文字列を送るのではなく、**値を持たないフィールド** として扱います。

### 妥当性契約

- `required=true` かつ `value=null` のとき不正です。
- `required=false` のとき `value=null` を許容します。
- `error` は視覚状態であり、バリデーション結果そのものではありません。
- `errorMessage` は妥当性 API の既定文言ではなく、利用者が明示的に与える表示文言です。

### Reset 契約

- form reset 時、`value` は初期値へ戻ります。
- 初期値が `options` と整合しない場合は `null` に正規化します。
- reset に伴う値変化は `value-change` を発火します。

---

## ポップアップ契約

### 所有権

Popup listbox は overlay layer に描画されます。overlay layer は設計上の概念であり、具体的な Portal 先は実装詳細です。ただし、次を契約として固定します。

- popup は host の overflow 制約から独立して表示できます。
- popup は Trigger と同一の `dir`、主要トークン、テーマ文脈を継承します。
- popup の z-index は design system の overlay 階層で管理します。

### 寸法契約

- 最小幅は Trigger 幅以上です。
- 最大幅は 320 px です。
- 最大高さは `calc(var(--control-height-md) * 7.5)` 相当です。
- 高さ超過時は popup 内部で縦スクロールします。

### Close 契約

次の場合、popup は閉じます。

- option 選択
- `Escape`
- `Tab`
- component 外の pointer 操作
- component 外の scroll
- `close()` の呼び出し

次の場合は閉じません。

- popup 自身の内部スクロール
- disabled option への pointer hover
- 単なる active option の移動

---

## Visual Contract

`ui-select` の視覚契約は、**本文より強く主張しない静かな入力面** としての一貫性にあります。

### 情報順位

- ラベルは意味を与える主情報です。
- Trigger は選択状態を示す主要面です。
- Chevron は開閉可能性の補助記号です。
- `helpText` は補助説明です。
- `errorMessage` は `helpText` より優先します。

### Trigger 表現

- `filled` は淡い面を持つ既定入力です。
- `outline` は境界を主とする軽量入力です。
- placeholder は選択済み値より弱い文字色です。
- hover / focus / opened は識別可能でありつつ、過度に強くない差分を持ちます。
- error は danger 系トークンで示します。
- disabled は不透明度とカーソルで非活性を示します。

### Popup 表現

- popup は浮遊層として表示されます。
- active option は面の差分で示します。
- selected option はチェックと文字色で示します。
- disabled option は操作不能であることが視覚的に判別できなければなりません。

### スタイル拡張契約

外部拡張は CSS Custom Properties と `::part(...)` で受けます。

公開する part 名は次のとおりです。

- `trigger`
- `trigger-label`
- `trigger-text`
- `chevron`
- `listbox`
- `option`
- `option-label`
- `option-check`
- `help-text`
- `error-message`

内部 class 名、生成順序、Portal DOM 構造には依存してはなりません。

---

## 環境別の振る舞い

### Reduced Motion

`prefers-reduced-motion: reduce` 環境では、Chevron の回転と popup の出現アニメーションを最小化します。

### Dark Mode

ダークモードでは面境界が消えないよう、popup の影と境界の読みやすさを維持します。

### Forced Colors

`forced-colors: active` 環境では、システムカラーを優先し、面・境界・選択状態が失われないようにします。

### Print

印刷時、popup は出力対象に含めません。Trigger は静的な値表示へ退避します。

---

## 境界条件

### 未選択

`value=null` の場合は placeholder 表示です。`required=false` なら許容し、`required=true` なら不正です。

### 空の `options`

`options=[]` の場合、popup は開きません。Trigger は inert ではなく、必要に応じて disabled 相当の視覚処理または説明文を持つべきです。

### 全 option disabled

有効 option が 1 件もない場合、popup は開きません。

### 単一 option

有効 option が 1 件だけでも選択契約は変わりません。

### 長いラベル

Trigger と option の表示は一貫した省略規則を持ちます。省略の有無で意味が変わってはなりません。

### `options` 更新

`options` 更新時は次を行います。

1. 現在値との整合を再評価します。
2. 無効値であれば `null` に正規化します。
3. open 中であれば active option を再計算します。
4. popup 表示中であれば一覧を再描画します。

### 同値再選択

選択結果が同値であれば `value-change` を発火しません。close のみが起こります。

---

## Storybook 契約

各 Story は見本ではなく、**契約確認点** として扱います。少なくとも次を固定します。

| Story                | 固定する契約                                         |
| -------------------- | ---------------------------------------------- |
| `Default`            | button + listbox パターンで成立すること                   |
| `WithValue`          | 選択値に対応する label が Trigger に表示されること              |
| `WithHelpText`       | 通常状態で `helpText` が表示されること                      |
| `ErrorState`         | `error=true` かつ `errorMessage` 非空でエラー表示が成立すること |
| `Disabled`           | open 不可、FormData 不参加であること                      |
| `Required`           | 未選択時に妥当性エラーになること                               |
| `HiddenLabel`        | 視覚非表示でも label がアクセシブル名の source であること           |
| `Typeahead`          | 前方一致と 1 秒バッファが成立すること                           |
| `OptionsUpdate`      | `options` 更新時に値正規化と再描画が成立すること                  |
| `ResetIntegration`   | form reset で初期値へ戻ること                           |
| `EmptyOptions`       | popup を開かず破綻しないこと                              |
| `AllDisabledOptions` | popup を開かず破綻しないこと                              |
| `OpenChangeEvent`    | open / close ごとに `open-change` が発火すること         |
| `ValueChangeEvent`   | 値変更時のみ `value-change` が発火すること                  |
| `DarkMode`           | 暗背景上で視覚破綻しないこと                                 |
| `ForcedColors`       | forced-colors で構造が維持されること                      |
| `ReducedMotion`      | reduced-motion でモーションが抑制されること                  |

---

## 追加を検討する価値が高い機能

本節は、長期契約を前提としたうえで、`ui-select` に **新規で追加を検討する価値がある機能** を整理するものです。ここでいう「価値が高い」とは、見た目の装飾を増やすことではなく、**状態モデル、フォーム意味論、利用者の操作復元性をより明確にすること** を指します。

### 最優先で検討する価値がある機能

#### 1. `defaultValue`

`defaultValue` は、初期値と現在値を分離して扱うための公開入力です。

| 名前             | 種別                   | 型                | 目的                      |
| -------------- | -------------------- | ---------------- | ----------------------- |
| `defaultValue` | property / attribute | `string \| null` | form reset 時に戻る初期値を明示する |

追加価値は次のとおりです。

- form reset の復元先を明示できます。
- 初回描画時の初期値と、その後の programmatic update を区別できます。
- Storybook とテストで reset 契約を安定して検証できます。

採用する場合は、次を契約として固定します。

- `defaultValue` が `options` と整合しない場合は `null` に正規化します。
- `reset()` および form reset は `defaultValue` を復元先とします。
- `value` 未指定かつ `defaultValue` 指定時は、初期表示に `defaultValue` を用います。

#### 2. `clearable`

`clearable` は、選択済み状態から未選択状態へ明示的に戻すための機能です。

| 名前          | 種別                   | 型         | 目的                            |
| ----------- | -------------------- | --------- | ----------------------------- |
| `clearable` | property / attribute | `boolean` | `value` を `null` に戻す UI を提供する |

追加価値は次のとおりです。

- `required=false` の select において、未選択へ戻る操作を UI として保証できます。
- キーボード・ポインター双方で「戻す」操作を明示できます。
- 状態遷移を `null` まで含めて完結できます。

採用する場合は、次を契約として固定します。

- `required=true` の場合、clear は許可しません。
- clear 実行時、`value` は `null` になります。
- clear は `value-change` を `reason: 'clear'` で発火します。
- clear 後の focus は Trigger に戻します。

#### 3. 空状態表示

空状態表示は、`options=[]` または有効 option 不在時に、利用者へ状態を説明するための機能です。

優先度の高い公開面は次のいずれかです。

| 名前               | 種別                   | 型        | 目的               |
| ---------------- | -------------------- | -------- | ---------------- |
| `emptyStateText` | property / attribute | `string` | 候補が存在しないことを短文で示す |
| `empty-state`    | slot                 | slot     | 空状態の説明 UI を差し替える |

長期保守性の観点では、まず `` を優先します。slot は表現自由度が高い反面、責務が増えやすいためです。

採用する場合は、次を契約として固定します。

- `options=[]` または有効 option 不在時にのみ意味を持ちます。
- popup を開かない方針を維持する場合、Trigger 近傍の補助説明として出します。
- popup を開く方針へ将来変更する場合でも、empty state は選択不能であることを明示しなければなりません。

#### 4. `options` 更新理由を含む再整合イベント

`options` 更新による値正規化は、利用者から見ると「勝手に値が消えた」ように見えることがあります。これを防ぐため、`value-change` の detail を拡張し、値変化の理由をより透明化する機能には高い価値があります。

推奨する detail 例は次のとおりです。

```ts
{
  value: string | null;
  previousValue: string | null;
  reason: 'selection' | 'options-change' | 'reset' | 'programmatic' | 'clear';
  cause?: 'removed' | 'disabled' | 'replaced';
}
```

追加価値は次のとおりです。

- `options` 更新に伴う値喪失の理由を観測できます。
- ログ、監査、デバッグが容易になります。
- 「削除された」「無効化された」「置換された」を区別できます。

### 条件付きで検討する価値がある機能

#### 5. `hideLabel`

`hideLabel` は、視覚的にはラベルを隠しつつ、アクセシブル名の source としての label を保持するための入力です。

| 名前          | 種別                                  | 型         | 目的              |
| ----------- | ----------------------------------- | --------- | --------------- |
| `hideLabel` | property / attribute (`hide-label`) | `boolean` | label を視覚非表示にする |

これは新機能というより、**長期契約としての正式復帰候補** です。Accessibility 契約の一部として扱う価値があります。

#### 6. `option.description`

説明付き option は、意味の近い候補が並ぶ場面で有用です。

```ts
type SelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}
```

ただし、本文読書を妨げない静かな UI という方針上、常用機能としてはやや強すぎることがあります。そのため、**設定画面や説明負荷の高い選択肢群に限って検討** するのが妥当です。

#### 7. `optionGroup`

候補数が増える場合、グルーピングは認知負荷を下げます。ただし、ARIA、描画、キーボード操作が複雑になるため、基底 `Select` に入れるなら用途が十分にある場合に限ります。

#### 8. Popup 配置ポリシー

例として、次のような公開面です。

- `placement`
- `matchTriggerWidth`
- `strategy`

ただし、これは `Select` 個別機能というより overlay 基盤の責務です。採用する場合は、`Select` に個別 prop を増やすより、**overlay policy を上位で共通化** する方が設計としてきれいです。

### 別コンポーネントへ分離すべき機能

次の機能は価値自体はありますが、基底 `Select` に載せると責務が変質するため、別コンポーネントへ分離した方がよいです。

- searchable select / combobox
- 非同期候補取得と loading state
- 複数選択

### 見送るべき機能

長期契約の一貫性を守るため、次の機能は基底 `Select` へ戻さない方がよいです。

- `readonly` の再導入
- `string | number` への `value` 型の再拡張
- option 全体を自由に差し替えられる無制限テンプレート拡張

### 推奨順位

| 優先度  | 項目                   | 目的                   |
| ---- | -------------------- | -------------------- |
| 最優先  | `defaultValue`       | 初期値と reset 契約の固定     |
| 最優先  | `clearable`          | 未選択へ戻る操作の明示          |
| 最優先  | 空状態表示                | 候補不在の説明責務を明文化        |
| 最優先  | 再整合イベント拡張            | `options` 更新理由の透明化   |
| 条件付き | `hideLabel`          | Accessibility 契約の正式化 |
| 条件付き | `option.description` | 説明負荷の高い候補の補助         |
| 条件付き | `optionGroup`        | 候補群の認知整理             |
| 条件付き | popup 配置ポリシー         | overlay 制御の共通化       |

本コンポーネントに今後追加するべきなのは、派手な機能ではなく、**未選択へ戻す、空状態を説明する、初期値を固定する、候補更新の意味を透明化する** といった、状態機械を完成させる機能です。

---

## 要約

本書の要点は次の 6 点です。

1. `ui-select` は **自由入力ではなく選択専用** です。
2. 値は `` に限定します。
3. 未選択は ``** のみ** で表します。
4. `options` と不整合な値は保持しません。
5. 開閉状態は **内部管理** です。
6. Trigger は **button**、popup は **listbox** です。

この 6 点を守ることで、状態・フォーム・ARIA・視覚契約のねじれを防ぎます。

---

## 現行実装との差分

本節は、現行 `select.ts` / `select.stories.ts` との差分を明示するものです。本書の上位節を長期契約、以下を現行差分として扱います。

### 1. `modelValue` ではなく `value` を正式名とする

長期契約では `value` を正式名とし、`modelValue` は互換 alias 扱いとします。

### 2. `string | number` ではなく `string | null` に限定する

数値 coercion と strict equality のねじれを避けるためです。

### 3. `opened` を外部入力ではなく内部状態とする

外部完全制御と内部副作用の競合を避けるためです。

### 4. `readonly` を非採用とする

Select における `readonly` は意味論が曖昧で、状態空間を不必要に増やすためです。

### 5. `role="combobox"` を持つ readonly input ではなく button + listbox を採用する

選択専用部品としての意味論を明確にするためです。

### 6. `change` ではなく `value-change` を正式イベントとする

ネイティブ `change` と payload 付き `CustomEvent` の混同を避けるためです。

### 7. `focus` / `blur` の再送出を正式面に含めない

Focus 系イベントの再生成は順序と意味論を複雑化しやすいためです。

### 8. 未選択時は空文字送信ではなく FormData 不参加とする

未選択を値なし状態として扱う方が、フォーム意味論として明快だからです。

### 9. `options` 不整合値は `null` 正規化を必須とする

表示状態と送信値の不整合を防ぐためです。

### 10. 空 `options` や全 disabled 時は open 不可とする

空の popup を見せるより、状態を静かに説明する方が UX と契約の両面で明快だからです。

---

## 現行実装で未対応となる主な事項

本節は、**本書で定義した長期契約および追加検討機能** に対して、現行 `select.ts` / `select.stories.ts` が未だ対応していない事項を整理するものです。ここでは、単に実装差分を並べるのではなく、**利用者が長期契約として依存できる状態にまだ達していない点** を列挙します。

### A. 長期契約に対して未対応の事項

#### 1. `value` 正式化と `modelValue` 互換整理

現行実装は `modelValue` を正式入力として持ち、公開イベントも `change` です。本書が採用する `value` / `value-change` への移行は未対応です。

#### 2. 値型の `string | null` への単純化

現行実装は `string | number` を受け入れ、未選択を空文字で表します。本書が採用する ``** と **``** による未選択表現** には未対応です。

#### 3. `options` 不整合値の `null` 正規化

現行実装は `modelValue` が `options` と整合しなくても保持し得ます。表示は未選択に見えても、フォーム値には `String(modelValue)` が入るため、本書が要求する **値・表示・送信の一貫した正規化** には未対応です。

#### 4. `label` 必須の実行時強制

現行実装は `label` 未指定時に `console.error` を出力するのみで、描画停止・例外・不正状態化は行いません。したがって、**必須契約の実行時強制** は未対応です。

#### 5. Trigger の button 化

現行実装は `readonly` な `<input role="combobox">` を Trigger に使います。本書が採用する **button + listbox** パターンには未対応です。

#### 6. Listbox への focus 移譲

現行実装は open 中も Trigger に focus を残し、`aria-activedescendant` で active option を表現します。本書が採用する **open 時に listbox へ focus を移し、close 時に Trigger へ戻す** 契約には未対応です。

#### 7. `opened` の内部管理化

現行実装は `opened` を外部入力として公開し、外部から直接書き換えられます。本書が採用する **内部管理 state と **``** / **``** / **``** 命令面** には未対応です。

#### 8. 公開メソッド `open()` / `close()` / `toggle()` / `reset()`

現行実装が正式に持つ公開メソッドは `focus()` / `blur()` / `checkValidity()` / `reportValidity()` のみです。本書で定義した開閉命令面と reset API は未対応です。

#### 9. `required` の実装

現行実装は `required` property を持たず、未選択時妥当性を定義していません。本書の **required 契約と妥当性判定** には未対応です。

#### 10. `checkValidity()` / `reportValidity()` の意味づけ

現行実装は `ElementInternals.checkValidity()` / `reportValidity()` を委譲するだけで、独自制約は設定していません。そのため、本書が想定する **現在値と **``** に基づく妥当性モデル** には未対応です。

#### 11. Form reset 契約

現行実装は `formResetCallback()` を持ちません。本書が要求する **初期値復元と reset に伴う値変化通知** には未対応です。

#### 12. `defaultValue` を起点とする初期値モデル

本書および追加検討機能で重要とした `defaultValue` は未実装です。そのため、**初期値・現在値・reset 復元先の三者分離** には未対応です。

#### 13. 未選択時の FormData 不参加

現行実装は未選択でも `setFormValue(String(this.modelValue))` を呼ぶため、空文字が送信対象になります。本書が採用する **未選択時 **``** 相当** には未対応です。

#### 14. `value-change` / `open-change` の追加

現行実装が正式に発火するのは `change` のみであり、開閉イベントもありません。本書が採用する **理由付き値変更イベントと開閉イベント** には未対応です。

#### 15. `value-change` detail の拡張

現行 `change` は `{ value }` のみを detail に持ちます。`previousValue`、`reason`、`cause` を含む詳細なイベント payload には未対応です。

#### 16. `focus` / `blur` 再送出を正式面から外す整理

現行実装は内部 Trigger の `focus` / `blur` を再送出します。本書はこれを正式契約から外していますが、実装側の整理は未対応です。

#### 17. `error=true` かつ `errorMessage=''` の禁止

本書は `error=true` かつ非空の `errorMessage` の組だけを正規エラー状態としますが、現行実装は **message なしエラー** を許容し、Storybook でもその境界条件を検証しています。したがって、**エラー状態の単純化契約** には未対応です。

#### 18. `readonly` の非採用化

本書は `readonly` を長期契約から外しますが、現行実装と Storybook は `readonly` を正式にサポートしています。したがって、**状態空間の整理** は未対応です。

#### 19. 空 `options` / 全 disabled 時の open 抑止

現行実装は空配列や全 disabled でも open 自体は可能です。本書が採用する **open 不可または空状態説明** には未対応です。

#### 20. `options` 更新時の再描画と再整合

現行実装は open 中の `options` 更新時に listbox の再構築を行いません。本書が要求する **値正規化、active option 再計算、一覧再描画** には未対応です。

#### 21. `::part(...)` の公開

本書は `trigger`、`listbox`、`option` などの `::part(...)` 公開を前提としますが、現行実装は未対応です。

#### 22. Overlay 文脈継承の保証

現行実装は `document.body` 直下へ Portal し、`document.head` にグローバル style を注入します。本書が要求する ``**、主要トークン、テーマ文脈の継承保証** には未対応です。

#### 23. Overlay root の所有権抽象化

本書は overlay layer を設計概念として扱いますが、現行実装は `document.body` 固定です。したがって、**Portal 先の抽象化** には未対応です。

### B. 追加検討機能に対して未対応の事項

#### 24. `defaultValue`

追加候補として最優先に位置付けた `defaultValue` は未実装です。

#### 25. `clearable`

選択済みから未選択へ戻す clear affordance は未実装です。

#### 26. `emptyStateText` / `empty-state`

候補不在を説明する正式な空状態 API は未実装です。

#### 27. `options` 更新理由付き再整合イベント

`reason: 'options-change'` に加え、`cause: 'removed' | 'disabled' | 'replaced'` を持つ詳細イベントは未実装です。

#### 28. `option.description`

二次説明付き option は未実装です。

#### 29. `optionGroup`

グループ化された選択肢の表現と ARIA は未実装です。

#### 30. Popup 配置ポリシー

`placement`、`matchTriggerWidth`、`strategy` のような overlay policy の公開面は未実装です。

### C. 移行時に判断が必要な現行仕様

次の事項は「未対応」というより、**長期契約へ移行する際に明示的に壊すか残すかを決める必要がある現行仕様** です。移行監査上の注意点として整理します。

- `hideLabel` は現行実装でサポート済みです。長期契約へ正式復帰させるか、限定的互換機能に留めるかを決める必要があります。
- `change` は現行の正式イベントです。`value-change` へ移行する場合、互換 alias の維持期間を設計する必要があります。
- `focus` / `blur` の再送出は現行公開面です。削除する場合は移行影響が出ます。
- `error=true` かつ `errorMessage=''` は Storybook で検証済みの現行境界条件です。禁止へ変える場合は Storybook と実装を同時更新する必要があります。
- Portal 用の forced-colors / print style の `document.head` への一括注入は現行仕様です。overlay 基盤へ移す場合は責務分離が必要です。

### D. まとめ

現行実装で未対応の事項として、従来の最終節には次の記述が漏れていました。

- `label` 必須の実行時強制
- `open()` / `close()` / `toggle()` / `reset()` などの公開命令面
- `error=true` かつ message なしの現行許容
- overlay 文脈継承と Portal 先抽象化
- `defaultValue` / `clearable` / `emptyStateText` / 詳細な再整合イベント
- `option.description` / `optionGroup` / popup 配置ポリシー

本節に記載した項目は、契約へ昇格させる場合に **実装・Storybook・契約書を同時に更新** しなければなりません。長期契約だけを先に固定し、現行実装が追随していない状態を放置してはなりません。

