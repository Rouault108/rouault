# Textarea

## 概要

本書は、`ui-textarea` の公開契約、状態モデル、アクセシビリティ、および視覚契約を整理するものです。

`ui-textarea` は、複数行テキスト入力のためのコンポーネントです。単に `<textarea>` をラップするのではなく、**入力中の思考をスクロール操作で中断させないこと**、**ラベル・補助テキスト・エラー表示を一体の入力契約として扱うこと**、**フォーム関連付けとバリデーションを Shadow DOM 境界越しに成立させること**を公開契約として固定します。

Rouault における textarea は、UI 上の入力欄であるだけでなく、**本文、メモ、説明文を継続的に書くための場**でもあります。したがって、本コンポーネントの契約は、入力可能性の明示と、**「没入して読む」「没入して書く」ことのできるデザイン**の維持を両立する方向で定義します。

---

## 適用範囲

本書は、`ui-textarea` の次の事項を対象とします。

- 公開契約
- 状態モデル
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 関連契約
- 境界条件
- Storybook 契約
- 現行実装で未対応または未固定の事項

一方で、本書は次の事項を扱いません。

- フォーム全体の入力順序や送信フロー設計
- 入力内容の意味的妥当性判定
- 文字数制限や入力補完ポリシーの設計全体
- Markdown プレビューや保存処理など上位機能
- IME 制御、辞書制御、校正支援などエディタ機能
- 上位レイヤのレイアウト責務

これらは上位レイヤまたは別コンポーネントの責務です。

---

## 公開契約

`ui-textarea` は、`label`、`hideLabel`、`name`、`placeholder`、`value`、`defaultValue`、`helpText`、`errorMessage`、`error`、`disabled`、`readonly`、`required`、`variant`、`rows`、`maxRows`、`autoGrow`、`resize` を公開入力として扱います。内部実装はネイティブ `<textarea>` ですが、利用者は `ui-textarea` を契約単位として扱います。

`label` は **空文字・空白のみを含めて不可** の必須入力です。名前付けの正規経路は、内部 textarea と関連付いた label 要素です。

`value` は現在値、`defaultValue` は初期値かつ reset 基準値です。`value` が与えられている場合、現在値の正本は常に `value` です。`defaultValue` は現在値の代替ではなく、初期化と reset のためだけに用います。

`variant` の既定値は `default` です。`rows` の既定値は `3` です。`autoGrow` の既定値は `true` です。`resize` の既定値は `none` です。

`rows` は正の整数として扱い、`1` 未満は `1` に正規化します。`maxRows` は未指定でなければ `rows` 以上の正の整数として扱い、`rows` より小さい場合は `rows` に正規化します。

`autoGrow=true` の場合、入力内容に応じて高さを即時更新し、`rows` を最小高さとして維持します。`maxRows` が指定されている場合は、その上限を超えた時点で内部スクロールへ移行します。さらに、**内容変更だけでなく、幅変化、`variant` 変更、解決後のタイポグラフィ変化によって高さが変わり得る場合にも再計測する** ことを契約に含めます。`autoGrow=false` の場合のみ、`resize="vertical"` による手動リサイズを正規運用として扱います。

`error` は強制 invalid 状態です。`error=true` の場合、内部バリデーション結果よりも強制 invalid が優先されます。可視エラーメッセージは `errorMessage` によってのみ供給し、ネイティブ `validationMessage` を UI 文言の正規ソースには用いません。

### 入力契約

| 名前 | 種別 | 必須 | 内容 | 契約 |
| --- | --- | --- | --- | --- |
| `label` | property / attribute | はい | 入力欄のラベル | 空文字・空白のみは不可です |
| `hideLabel` | property / attribute (`hide-label`) | いいえ | ラベルの視覚非表示 | 視覚的にのみ隠し、名前付け自体は維持します |
| `name` | property / attribute | いいえ | フォーム送信名 | 未指定時は送信対象に含めません |
| `placeholder` | property / attribute | いいえ | プレースホルダー | 補助的ヒントであり、ラベル代替にはしません |
| `value` | property | いいえ | 現在値 | 現在値の正本です。外部からの代入でも内部値と高さ再計算は同期しますが、`input` / `change` は自動発火しません |
| `defaultValue` | property / attribute (`default-value`) | いいえ | 初期値 | 初期表示値かつ reset 基準値です |
| `helpText` | property / attribute (`help-text`) | いいえ | 補助テキスト | 入力意図や制約を示す常設説明です |
| `errorMessage` | property / attribute (`error-message`) | いいえ | エラーメッセージ | 可視エラー文言です。UI 文言の唯一の正規ソースです |
| `error` | property / attribute | いいえ | 強制 invalid 状態 | `true` の場合、ネイティブ validity より優先します |
| `disabled` | property / attribute | いいえ | 操作無効 | 非操作・非検証・非送信として扱います |
| `readonly` | property / attribute | いいえ | 読み取り専用 | 非編集だが可フォーカス・可送信として扱います |
| `required` | property / attribute | いいえ | 必須入力 | 公開検証面として正規に依存できる native validity です |
| `variant` | property / attribute | いいえ | タイポグラフィモード | `default` / `prose`。表示密度と可読性だけを切り替えます |
| `rows` | property / attribute | いいえ | 最小表示行数 | 正の整数として扱い、`1` 未満は `1` に正規化します |
| `maxRows` | property / attribute (`max-rows`) | いいえ | 自動伸長時の最大行数 | 未指定でなければ `rows` 以上に正規化します |
| `autoGrow` | property / attribute (`auto-grow`) | いいえ | 自動高さ拡張 | 既定値は `true` です |
| `resize` | property / attribute | いいえ | 手動リサイズ方向 | `none` / `vertical`。実効性があるのは `autoGrow=false` 時のみです |

### 列挙値契約

| 名前 | 受理値 | 既定値 | 契約 |
| --- | --- | --- | --- |
| `variant` | `default` / `prose` | `default` | 表示密度・行間・余白の切替に用います |
| `resize` | `none` / `vertical` | `none` | `autoGrow=false` 時のみ `vertical` を正規運用とします |

列挙外文字列を属性として与えること自体は技術的には可能ですが、公開契約には含めません。利用者は列挙外値に依存してはなりません（MUST NOT）。

### 不正値・無効値契約

`variant` と `resize` は列挙型入力として扱います。列挙外値は未サポートであり、描画結果や内部 class の付き方は公開契約に含めません。

`rows` と `maxRows` は寛容に受理してそのまま通すのではなく、**公開境界で正規化する** 契約です。`rows < 1` は `1` に、`maxRows < rows` は `rows` に正規化します。不正値の補正後も意味が不明な場合、その値には依存してはなりません。

### 公開メソッド

`ui-textarea` は、Shadow DOM 内部の textarea を外部から安全に操作するため、次の公開メソッドを持ちます。

| 名前 | 種別 | 契約 |
| --- | --- | --- |
| `focus(options?)` | method | 内部 textarea にフォーカスを委譲します |
| `blur()` | method | 内部 textarea からフォーカスを外します |
| `select()` | method | 内部 textarea のテキストを選択します |
| `checkValidity()` | method | 現在の公開検証面を同期したうえで真偽値を返します |
| `reportValidity()` | method | 現在の公開検証面を同期したうえで検証結果を報告します |

### フォーム関連付け契約

`ui-textarea` は Form Associated Custom Element として実装されます。したがって、`value` は内部 textarea の値であると同時に、フォーム送信値としても扱います。

| 条件 | 振る舞い |
| --- | --- |
| `name` 未指定 | 送信対象に含めません |
| 通常入力 | `value` をフォーム値として保持します |
| `formResetCallback()` | `defaultValue` に戻します |
| `formDisabledCallback(true)` | コンポーネント全体を無効化します |
| `formStateRestoreCallback(state)` | 文字列 state のみを復元対象の現在値として `value` に反映します。`File` / `FormData` / `null` は無視します |

### 値所有権と reset 基準値契約

`ui-textarea` は、内部 textarea の値、公開 property `value`、および Form Associated Custom Element としての送信値を同一の論理値として扱います。したがって、**値の正本は常に `value` であり、内部 DOM のみを書き換えて状態を成立させることは公開契約に含みません。**

`defaultValue` は初期値かつ reset 基準値です。`value` と `defaultValue` は役割が異なり、前者は現在値、後者は reset 基準を表します。ユーザー入力時は、内部 textarea の変更に追従して `value` が更新され、必要に応じて `input` / `change` が発火します。一方、外部から `value` を代入した場合は、内部 textarea とフォーム値および Auto Grow の高さ再計算は同期されますが、**ユーザー操作ではないため `input` / `change` は自動発火しません。**

### 属性反映契約

公開入力のうち、`label`、`hideLabel`、`name`、`placeholder`、`defaultValue`、`helpText`、`errorMessage`、`error`、`disabled`、`readonly`、`required`、`variant`、`rows`、`maxRows`、`autoGrow`、`resize` は reflect されます。`value` は reflect されません。

| property | attribute | reflect | 備考 |
| --- | --- | --- | --- |
| `label` | `label` | あり | 必須契約です |
| `hideLabel` | `hide-label` | あり | boolean attribute です |
| `name` | `name` | あり | フォーム送信名です |
| `placeholder` | `placeholder` | あり | 補助的ヒントです |
| `value` | なし | なし | 現在値であり property ベースで扱います |
| `defaultValue` | `default-value` | あり | 初期値および reset 基準値です |
| `helpText` | `help-text` | あり | 補助テキストです |
| `errorMessage` | `error-message` | あり | 可視エラー文言です |
| `error` | `error` | あり | boolean attribute です |
| `disabled` | `disabled` | あり | boolean attribute です |
| `readonly` | `readonly` | あり | boolean attribute です |
| `required` | `required` | あり | boolean attribute です |
| `variant` | `variant` | あり | `default` / `prose` |
| `rows` | `rows` | あり | 正の整数として扱います |
| `maxRows` | `max-rows` | あり | `rows` 以上に正規化します |
| `autoGrow` | `auto-grow` | あり | 既定値は `true` です |
| `resize` | `resize` | あり | `none` / `vertical` |

### 責務範囲

責務範囲には、内部 textarea の描画、ラベルと説明文の関連付け、自動伸長、補助文とエラー文の表示、フォーム関連付け、公開検証面の同期、および必要なアクセシビリティ属性の付与を含みます。

一方で、文字数制限、サジェスト、Markdown 補完、保存タイミング、差分表示、下書き管理などは責務に含めません。

---

## 状態モデル

`ui-textarea` の主要状態は、見た目の種別ではなく、**入力可能か、説明文を出すか、エラーを出すか、自動伸長するか、フォームに参加するか**によって読み分けます。

### 1. 基本状態

最小状態は、`label` を持ち、`variant="default"`、`rows=3`、`autoGrow=true`、`disabled=false`、`readonly=false`、`error=false` の状態です。この状態では通常の複数行入力欄として機能します。

### 2. バリアント状態

`variant` は入力内容の用途に応じたタイポグラフィ差分です。

| `variant` 値 | 意味 | 想定用途 |
| --- | --- | --- |
| `default` | UI 用の密度優先 | メモ、設定、短い説明文 |
| `prose` | 可読性優先 | 本文、長文、執筆欄 |

`default` は `14px` 相当、標準行間、ややコンパクトな余白を前提とします。`prose` は `16px` 相当、ゆったりした行間、少し大きい余白を前提とします。

### 3. 自動伸長状態

`autoGrow=true` の場合、コンポーネントは次の順序で高さを決定します。

1. 一時的に `height: auto` に戻す
2. `scrollHeight` を採用する
3. `rows` に基づく最小高さを下回らないよう補正する
4. `maxRows` がある場合はその上限を超えた分のみ内部スクロールに切り替える

高さ変化には `transition` を掛けません。これは、入力中のキャレット位置と反応速度を優先するためです。

### 4. 手動リサイズ状態

`autoGrow=false` の場合、自動伸長は行いません。このとき `resize="vertical"` であれば垂直方向の手動リサイズを許可します。`resize="none"` の場合は手動リサイズも行いません。

### 5. 補助説明状態

`helpText` は入力意図や制約を示す常設説明です。`errorMessage` が存在する場合でも排他的には扱わず、両者は併存できます。視覚順・読み上げ順は常に **help → error** です。

### 6. エラー状態

エラー状態は二層あります。

- `error=true` による強制エラー
- ネイティブ validity による内部エラー

強制エラーがある場合、ネイティブ validity よりも強制エラーを優先します。可視メッセージは `errorMessage` を用います。`error=true` かつ `errorMessage=""` の場合でも invalid 状態自体は成立しますが、表示メッセージは出ません。

### 7. 無効・読み取り専用状態

`disabled=true` の場合、内部 textarea は無効化され、編集もフォーカスも受け付けません。

`readonly=true` の場合、編集のみ抑止し、フォーカスや選択は許可します。これは、内容の参照やコピーを妨げないためです。

両者は見た目の弱化という共通点を持ちますが、契約上の意味は異なります。`disabled` は **操作不能な入力要素** であり、フォーム参加や相互作用の対象から外れる方向の状態です。`readonly` は **編集不能だが参照可能な入力要素** であり、内容の閲覧、選択、コピー、フォーカス移動の文脈を維持します。利用者はこの差を UI の見た目だけでなく、フォーム上の意味差として扱う必要があります。

### 8. 必須状態

`required=true` の場合、ネイティブ required として動作します。空値では `checkValidity()` が `false` になります。現行公開契約で正規に利用できるネイティブ検証は、実質的には required が中心です。

---

## DOM / Accessibility

ルートは `:host` です。Shadow DOM 内部にラベル、textarea、本体補助メッセージを持ちます。

```text
<ui-textarea>
  #shadow-root
    <label for="..."></label>
    <textarea></textarea>
    [div.help-text]
    [div.error-message]
```

`ui-textarea` は `delegatesFocus: true` を有効にしており、ホストへのフォーカス要求は内部 textarea に委譲されます。公開メソッド `focus()`、`blur()`、`select()` も内部 textarea に委譲されます。

### Accessibility 契約

アクセシビリティ上の重要点は次のとおりです。

- 対話主体はネイティブ `<textarea>` です。
- `label` は必須であり、空文字・空白のみは認めません。
- `hideLabel=true` でもラベル要素自体は DOM 上に残し、視覚的にのみ非表示にします。
- 内部 textarea のアクセシブル名は、関連付いた label 要素によって決定します。
- `placeholder` は名前付けに参加しません。
- エラー時は `aria-invalid="true"` を付与します。
- `aria-describedby` は、`helpText` がある場合は help text の ID を先に、`errorMessage` がある場合は error message の ID を後に連結します。
- エラーメッセージ要素には `aria-live="polite"` を付与します。
- ホストでは `focusin` / `focusout` を観測可能とします。

ここで重要なのは、**プレースホルダーや視覚スタイルではなく、ラベルとネイティブ textarea を中核に契約を組むこと**です。

### アクセシブル名契約

本コンポーネントのアクセシブル名の唯一の正規ソースは `label` です。`placeholder`、`helpText`、`errorMessage` はアクセシブル名の代替として扱いません。

`hideLabel=true` は視覚表現だけを変える契約であり、名前付け契約を変更しません。したがって、ラベルを隠しても **入力欄の意味は常に `label` によって与える** ものとします。

### `aria-describedby` の順序規則

本コンポーネントでは、補助文とエラー文を排他的には扱いません。説明順序は常に **help → error** です。

| 状態 | `aria-describedby` |
| --- | --- |
| `helpText` のみ | help text の ID |
| `errorMessage` のみ | error message の ID |
| `helpText` と `errorMessage` の両方あり | help text の ID と error message の ID をこの順で連結 |
| どちらもなし | 未設定 |

したがって、補助文が入力意図を説明し、エラー文が現在の不整合を説明するという役割分担を維持します。

---

## Visual Contract

`ui-textarea` の視覚契約は、入力欄を過度に主張させず、**書くことを妨げない静かな存在感**として成立させることにあります。

### 情報順位

- ラベルは入力欄の意味を明示します。
- 背景色は入力可能領域を静かに示します。
- フォーカス時は背景を白系へ戻し、執筆対象を前景化します。
- エラー時は境界線と背景差で異常状態を示します。
- `prose` は長文執筆時の可読性を優先します。

### レイアウト

ルートは縦積みの flex コンテナです。`label`、`textarea`、説明文の順に並べます。横幅は `width: 100%` 前提で、コンテナ内で縮小可能です。

### 視覚仕様

- 通常時は muted な背景を持ちます。
- hover 時は border のみ軽く立ち上がります。
- focus 時は背景を通常面へ戻し、outline でフォーカスリングを描画します。
- error 時は danger 系 border と subtle な error 背景を適用します。
- disabled 時は文字色を弱め、操作不可カーソルを示します。
- readonly 時は muted 背景を維持し、編集 UI ではなく参照 UI として見せます。
- `prose` は大きめの文字サイズ、広めの行間、少し厚い余白を持ちます。

### Auto Grow の視覚原則

Auto Grow は装飾ではなく、**入力行為を中断しないための振る舞い契約**です。したがって、高さ変化はアニメーションせず、入力に即応します。`maxRows` 超過時のみ内部スクロールへ切り替えます。

### スクロールバー契約

内部スクロールが必要な場合、細いスクロールバーを表示します。通常時は目立たせず、必要時にのみ操作可能性を示す設計です。

### 参照トークン

本コンポーネントは主として次のトークンに依存します。

| 用途 | トークン |
| --- | --- |
| 通常背景 | `--bg-fill-muted` |
| フォーカス背景 | `--bg-default` |
| エラー背景 | `--bg-danger-subtle` |
| 通常文字色 | `--fg-default` |
| 無効時文字色 | `--fg-subtle` |
| 補助文文字色 | `--fg-muted` |
| エラー文字色 | `--fg-danger` |
| 通常ボーダー色 | `--border-default` |
| エラーボーダー色 | `--border-danger` |
| ボーダー幅 | `--border-width` / `--border-width-thick` |
| 角丸 | `--radius-md` / `--radius-full` |
| フォントウェイト | `--font-medium` |
| 文字間隔 | `--tracking-normal` |
| フォーカスリング | `--focus-ring-width` / `--focus-ring-color` / `--focus-ring-offset` / `--animation-focus` |
| 余白 | `--space-1` / `--space-2` / `--space-3` |
| 文字サイズ | `--text-sm` / `--text-base` / `--text-lg` |
| 行間 | `--line-height-normal` / `--line-height-relaxed` |
| 遷移 | `--duration-fast` / `--ease-out` |
| スクロールバー | `--scrollbar-width` / `--scrollbar-thumb` / `--scrollbar-thumb-hover` |

なお、ソース JSDoc には `--opacity-disabled` が現れますが、現行 CSS はこのトークンを実際には参照していません。したがって、**現時点では公開ランタイム契約に含めません。**

---

## 環境別の振る舞い

### Reduced Motion

`prefers-reduced-motion: reduce` 環境では、transition 時間を極小化し、フォーカスアニメーションを停止します。Auto Grow 自体はもともと height transition を持ちません。

### Forced Colors

`forced-colors: active` 環境では、背景・文字・境界線をシステムカラーへフォールバックします。エラー時は独自色ではなく、太い境界線と CanvasText ベースの差分で表現します。disabled 時も opacity に頼らず GrayText を使用します。

### Dark Theme

ダークテーマは専用 media query ではなく、トークン差し替えで成立させます。したがって、暗色対応はコンポーネント固有分岐ではなく、テーマレイヤ側の責務です。

### Print

印刷時は入力内容を可読に保つため、背景を透明化し、境界線は維持します。button のように非表示にはしません。readonly / disabled はやや薄く表示します。

---

## 関連契約

### イベント契約

`ui-textarea` は、入力変更とフォーカス遷移をホストで扱えるようにします。

| イベント | 契約 |
| --- | --- |
| `input` | ユーザー入力に起因する現在値変更時に発生します |
| `change` | ユーザー操作によるコミットタイミングで発生します |
| `focusin` | 内部 textarea がフォーカスを受けたことをホストで観測できます |
| `focusout` | 内部 textarea からフォーカスが外れたことをホストで観測できます |

ここでいうイベントは、**ユーザー操作に起因する状態遷移の通知**です。外部から `value` を代入した場合、内部値同期と高さ再計算は行いますが、`input` / `change` を再送しません。利用者は、プログラム更新の検知に DOM イベントではなく自身の状態管理を用いる必要があります。

### バリデーション契約

バリデーション同期の優先順は次のとおりです。

1. `error=true` の強制 invalid
2. `required` を含む公開検証面による invalid
3. valid

`checkValidity()` と `reportValidity()` は、この公開検証面に対して結果を返します。内部実装が native validity の他項目を参照していても、対応する公開入力が存在しない限り、それらは **公開 API ではなく実装詳細** です。

### 公開バリデーション面の範囲

現行公開契約で正規に依存してよいバリデーション面は、`required` と `error` による強制 invalid を中心とします。`tooShort`、`tooLong`、`badInput` などは、対応する公開入力面が追加されるまでは公開契約へ含めません。

### 補助文とエラー文の役割契約

`helpText` は入力意図や制約を示す常設説明です。`errorMessage` は現在の不整合を示す一時的説明です。両者は併存でき、視覚順・読み上げ順は常に **help → error** とします。

### スタイル拡張契約

`ui-textarea` は `::part` を公開しません。外部スタイル拡張は CSS Custom Properties に限定されます。内部 class 名や Shadow DOM 構造の詳細に依存してはなりません（MUST NOT）。

Storybook や内部テストで class を観測することはありますが、それらは **回帰検知のための観測点** であり、外部利用者向けの公開拡張面ではありません。将来、内部 class 名、DOM の入れ子、スクロール制御 class の付与条件が変わっても、それだけで破壊的変更とは見なしません。

### ネイティブ属性採用契約

textarea が持つすべてのネイティブ属性を自動的に公開することは行いません。追加する属性は whitelist 方式で明示的に採用し、契約書、Storybook、実装を同時に更新します。未公開属性は未サポートです。

---

## 境界条件

### 1. `rows <= 0`

`rows` は `1` に正規化します。

### 2. `maxRows < rows`

`maxRows` は `rows` に正規化します。公開契約上、逆転指定をそのまま意味ある状態として保持しません。

### 3. `label=""` または空白のみ

公開契約違反です。利用者はこの状態に依存してはなりません。

### 4. `error=true` かつ `errorMessage=""`

invalid 状態は成立します。ただし、可視エラー文言は表示されません。可視フィードバックが必要な場合は `errorMessage` を明示的に与える必要があります。

### 5. `required=true` かつ `errorMessage` 未指定

公開検証面として invalid にはなり得ますが、可視文言は自動生成しません。UI 文言は利用側が供給します。

### 6. `disabled` と `error` の併存

両方とも成立し得ます。ただし、フォーム意味としては `disabled` が優先され、非操作・非検証・非送信として扱います。

### 7. `readonly` と `error` の併存

読み取り専用でもエラー表示は可能です。これは「編集は止めるが、状態は示す」という契約です。

### 8. `autoGrow=false` かつ `resize="none"`

自動伸長も手動リサイズも行いません。固定高の textarea として動作します。

### 9. `autoGrow=true` かつ `resize="vertical"`

`resize` の指定は保持されますが、実際のサイズ制御は Auto Grow が優先します。公開契約上、`vertical` は `autoGrow=false` 時のみに意味を持ちます。

### 10. プログラムによる `value` 更新

外部から `value` を変更した場合でも、高さ再計算とフォーム値同期は行われます。ただし、プログラム更新自体は `input` / `change` イベントを自動発火しません。

### 11. `helpText` と `errorMessage` の同時存在

両方とも成立し、視覚順・読み上げ順は常に **help → error** です。

### 12. 幅変化やタイポグラフィ変化

内容自体が変わらなくても、高さが変わり得る場合は再計測対象です。

---

## Storybook 契約

各 Story は見本ではなく、**公開契約の確認点**として扱います。内部 class や Shadow DOM 詳細の観測は、この節の対象外です。

| Story | 固定する契約 |
| --- | --- |
| `Default` | 既定 `variant` が `default`、`rows=3` であること |
| `VariantDefault` | `default` が表示密度優先モードとして描画されること |
| `VariantProse` | `prose` が長文向け表示モードとして描画されること |
| `ErrorState` | invalid 状態、可視エラーメッセージ、`aria-describedby` による error 参照が成立すること |
| `ErrorStateProse` | `prose` でも error 表示が同様に成立すること |
| `StateDisabled` | disabled 状態で非操作・非送信として扱われること |
| `StateReadonly` | readonly 状態で非編集だが可フォーカス・可送信であること |
| `WithHelpText` | help text が常設説明として描画されること |
| `HelpAndError` | help と error が併存し、順序が help → error であること |
| `HiddenLabel` | 視覚非表示でも label ベースの名前付け契約が維持されること |
| `AutoGrow` | 入力増加で高さが伸び、空に戻すと最小高さへ戻ること |
| `MaxRows` | `maxRows` 超過時のみ内部スクロールへ切り替わること |
| `AutoGrowDisabled` | `autoGrow=false` と `resize="vertical"` の組み合わせが成立すること |
| `AllVariantsAndStates` | variant × state の主要組み合わせが描画できること |
| `EventFiring` | ユーザー操作時に `input` / `change` を外部で観測できること |
| `FocusEvents` | `focus()` により内部 textarea へフォーカスが移り、`focusin` / `focusout` を観測できること |
| `BoundaryRows1` | `rows=1` でも伸長契約が壊れないこと |
| `BoundaryRowsNormalization` | `rows<=0` が `1` に正規化されること |
| `BoundaryMaxRowsNormalization` | `maxRows<rows` が `rows` に正規化されること |
| `BoundaryEmptyLabel` | 空ラベルが契約違反として検知されること |
| `BoundaryErrorWithoutMessage` | メッセージなしでも invalid 状態が成立すること |
| `BoundaryDisabledAndError` | disabled と error の併存時にフォーム意味として disabled が優先されること |
| `BoundaryRequired` | required による invalid が働くこと |
| `BoundaryProgrammaticValue` | プログラム更新でも高さ再計算が行われ、`input` / `change` は自動発火しないこと |
| `LayoutResizeRecalc` | 幅変化やタイポグラフィ変化で再計測が行われること |
| `DarkModePreview` | トークン差し替え環境でもラベル・値・説明構造が維持されること |
| `ForcedColorsPreview` | 強制カラー環境でも error / disabled の構造が維持されること |
| `ReducedMotionPreview` | reduced motion 相当で遷移が短縮されること |
| `PrintPreview` | 印刷時にも内容可読性が維持されること |

---

## 補足

`ui-textarea` の要点は、複数行入力をできること自体ではありません。**書く行為を中断しない高さ制御**、**ラベル・補助文・エラー文の意味秩序**、**Shadow DOM 越しでも崩れないフォーム参加**にあります。

したがって、今後の変更でも次の 4 点は崩さない方がよいです。

1. 実体は常にネイティブ `<textarea>` であること。
2. `label` 必須というアクセシビリティ契約を緩めないこと。
3. Auto Grow を装飾ではなく入力継続性の契約として扱うこと。
4. `helpText` と `errorMessage` の役割と順序を曖昧にしないこと。

---

## 固定した設計方針

本書では、長期保守性を優先して次の方針を正式な契約として採用します。

- `label` は空文字・空白のみを含めて不可の必須入力とする
- アクセシブル名は label ベースで与える
- `value` と `defaultValue` を分離し、reset は `defaultValue` に戻す
- `input` / `change` はユーザー操作時のみ発火させる
- フォーカス遷移は `focusin` / `focusout` で観測可能とする
- 可視エラー文言は `errorMessage` を唯一の正規ソースとする
- `helpText` と `errorMessage` は併存可能とし、順序は help → error とする
- `rows` / `maxRows` は公開境界で正規化する
- Auto Grow は内容変更だけでなくレイアウト変化にも追従する
- `variant` は表示密度と可読性だけを変え、意味や挙動は変えない
- ネイティブ属性の採用は whitelist 方式とする
- 内部 class や Shadow DOM 詳細は公開契約に含めない

---

## 将来拡張の原則

本節は現行実装の公開契約ではなく、将来追加を検討する場合の設計指針です。追加機能は textarea を高機能エディタ化するためではなく、**没入を壊さずに意味と入力継続性を補強する場合に限って**採用します。

優先順位は、**高機能化の派手さ**ではなく、**textarea としての基礎的不足をどれだけきれいに埋められるか**、**上位レイヤへ責務を押し返したまま拡張面を与えられるか**で判断します。

### 最優先で検討する価値がある拡張

#### 1. ネイティブ属性の限定的 whitelist 追加

最優先は、ネイティブ textarea として自然に期待されるが、現行公開面ではまだ不足している属性の限定追加です。候補は `maxlength`、`minlength`、`spellcheck`、`autocapitalize`、`autocomplete`、`inputmode` です。

これは機能を肥大化させる追加ではなく、**textarea としての基礎制御面を補う** ための拡張です。ただし、無制限 pass-through は採らず、あくまで whitelist 方式で個別採用します。

#### 2. キャレット・選択範囲 API

次に価値が高いのは、カーソル位置と選択範囲を安全に扱う公開面です。候補は `selectionStart`、`selectionEnd`、`setSelectionRange()`、`setRangeText()` です。

これはエディタ機能の内蔵ではありません。むしろ、textarea 自体は素の入力欄として保ちつつ、上位レイヤが引用挿入、定型文展開、ショートカット補助を行えるようにするための **最小限で正しい命令的 API** です。

#### 3. IME / 入力意図イベントの公開

日本語入力を含む実利用を重視するなら、`beforeinput`、`compositionstart`、`compositionupdate`、`compositionend` の観測面は優先度が高い拡張です。

これにより、上位レイヤは IME 変換中のショートカット抑止、入力補助の差し込み制御、変換確定前後の状態分離を適切に扱えます。textarea 自体を高機能エディタ化せずに、**入力過程への正しいフック** を与える拡張として価値があります。

### 高優先だが条件付きで検討する価値がある拡張

#### 4. `maxlength` と連動する静かなメタ情報表示

`maxlength` を採用する場合、現在文字数、残り文字数、現在行数などのメタ情報表示には価値があります。ただし、本文体験を阻害しやすいため、常設の主張的 UI としてではなく、**必要時のみ静かに示す補助情報** として設計すべきです。

`helpText` や `errorMessage` と競合する常設情報帯にはせず、役割の違う低優先メタ情報として整理するのが望ましいです。

#### 5. 限定的な `::part` 公開

設計システムとしての拡張性を高める必要がある場合は、`control`、`label`、`help`、`error` などに限って `::part` を公開する価値があります。

ただし、これは安易な外部スタイリング自由化ではありません。目的は、内部 class や Shadow DOM 詳細を公開契約に含めずに、**必要最小限の意図的な拡張点だけを昇格させること** にあります。

### 低優先または上位レイヤで扱うべき拡張

#### 6. `invalid` の視覚状態分離

現行は強制エラーと公開検証面による invalid を同一視覚系で扱います。送信前エラー、送信後エラー、警告と致命的エラーを分ける必要がある場合は状態分離の価値がありますが、状態数を増やしすぎると契約が濁るため、優先度は高くありません。

#### 7. 高度なサイズ戦略

`autosize="block"` のようなレイアウト連動サイズ戦略や、周辺コンテナとの高さ同期は、必要性自体はあり得ます。ただし、textarea 本体へ持ち込むと責務が肥大化しやすいため、基本的には上位レイヤで扱うべきです。

### 採用しない方針

次の方向は、責務を濁しやすいため採りません。

- WYSIWYG エディタ機能を持ち込むこと
- Markdown プレビューを内蔵すること
- 保存、同期、履歴管理を textarea に持ち込むこと
- レイアウト責務として full height / full viewport を持ち込むこと
- 補助文・エラー文・カウンタをすべて同時常設し、入力欄下を情報過多にすること

### 優先順位の要約

実装コストと契約価値のバランスを踏まえた優先順位は、次のとおりです。

1. ネイティブ属性の限定的 whitelist 追加
2. キャレット・選択範囲 API
3. IME / 入力意図イベントの公開
4. `maxlength` と連動する静かなメタ情報表示
5. 限定的な `::part` 公開

なお、`defaultValue` の実装整合、`helpText` と `errorMessage` の併存、`focusin` / `focusout` への整理などは、新規機能というより **既存契約の実装整合** に属します。したがって、新規機能追加より先に整合させる価値があります。

---

## 現行実装との差分

本節は、現行の `textarea.ts` および `textarea.stories.ts` と、本書で固定した契約との差分を整理するものです。以下は、**契約としては固定したが、現行実装では未対応または未整合** の主要項目です。

### 1. `label` 必須の実行時強制

現行実装は `label` 未指定時に `console.error` を出すにとどまり、空文字・空白のみを厳格に契約違反として扱っていません。

### 2. アクセシブル名の決定経路

現行実装は内部 textarea に `aria-label` を直接与える構成を含みます。本書では label ベースの名前付けを正規経路として固定しました。

### 3. `defaultValue` の公開面

本書では `value` と `defaultValue` を分離し、reset を `defaultValue` 基準へ固定しましたが、現行実装は接続時点の `value` を初期値として退避する方式です。

### 4. フォーカスイベントの公開面

本書ではホスト側のフォーカス遷移観測を `focusin` / `focusout` として固定しましたが、現行 Storybook と実装は `focus` / `blur` の再送出に依存する箇所があります。

### 5. 可視エラー文言の出所

本書では `errorMessage` を可視 UI 文言の唯一の正規ソースとしましたが、現行実装は native validity message を可視文言へ流用し得ます。

### 6. `helpText` と `errorMessage` の併存

本書では help と error の併存、および help → error の順序を固定しましたが、現行実装は両者を排他的に扱います。

### 7. `rows` と `maxRows` の正規化

本書では `rows < 1` および `maxRows < rows` を公開境界で正規化する契約ですが、現行実装はそのまま受理します。

### 8. Auto Grow の再計測条件

本書では内容変更に加えて幅変化やタイポグラフィ変化も再計測対象に含めましたが、現行実装はその範囲を十分には保証していません。

### 9. Storybook の役割分離

本書では公開契約 Story と内部回帰検知を分ける方針ですが、現行 Storybook には両者が混在しています。

### 10. ネイティブ属性 whitelist

本書ではネイティブ属性の採用を whitelist 方式として固定しましたが、現行公開面はその方針を明文化した状態にはなっていません。

### 11. `formStateRestoreCallback()` の復元単位

現行実装は `formStateRestoreCallback(state)` で **文字列 state のみ** を復元対象とし、`File` / `FormData` / `null` は無視します。本書ではこの点を契約へ取り込みましたが、現行 Storybook ではまだ直接検証されていません。

### 12. スタイルトークン記述のずれ

現行ソースには `--opacity-disabled` が JSDoc 上の公開トークン候補として現れますが、実装 CSS はこのトークンを消費していません。逆に、`--tracking-normal`、`--radius-full`、`--border-width`、`--border-width-thick`、`--font-medium` は実装で参照されているため、契約書側で明示しておく必要があります。

### 13. Storybook 内の旧前提

現行 Storybook には、固定済み契約とずれる旧前提がまだ残っています。主なものは次のとおりです。

- `WithHelpText`: help と error を排他的に扱う前提
- `FocusBlurEvents`: `focus` / `blur` の再送出を前提とする構成
- `BoundaryRowsMaxRowsInversion`: `rows` と `maxRows` の逆転指定をそのまま受理する前提
- `Default` / `DarkModePreview`: `aria-label` の直接付与を公開前提とみなす確認

したがって、現行実装との差分はコンポーネント本体だけでなく、**Storybook 側の確認観点にも残っている** と整理する必要があります。

### 本節の扱い

本節に記載した差分は、実装を否定するためのものではありません。契約、実装、Storybook を今後整合させるための差分一覧です。これらを解消する際は、契約書、実装、Storybook の 3 点を同時に更新し、どれか一つだけを先行させないことが重要です。

