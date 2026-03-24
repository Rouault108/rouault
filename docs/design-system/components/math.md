# Math

## 概要

本書は、`ui-math` の公開契約、状態モデル、アクセシビリティ、および視覚契約を定義するものです。

`ui-math` は、インライン数式と別行数式を統一的に扱うコンポーネントです。単に KaTeX を描画するのではなく、**`error-message` / slot / ランタイム入力（`latex`）の優先順位**、**空入力時の no-op 契約**、**display 数式における横スクロール責務**、**MathML 公開と手動ラベル優先を切り替える読み上げモード**、**意味分類に基づくエラー契約**、**明示 opt-in によるエラーソース開示契約**、**構文エラー時の退避 UI** を公開契約として固定します。

また、`block` / `inline` の差異、`primary` を **ランドマーク制御フラグ** として扱うこと、強制色・印刷時のフォールバックは、場当たり的な分岐ではなく、**状態契約と環境契約** によって成立させます。

Rouault における math は、本文の読解を中断させずに式を提示するためのコンポーネントです。したがって本コンポーネントの契約は、式そのものの可読性だけでなく、**「没入して読む」ことのできるデザイン** を保ちながら、複雑数式、長い display 数式、補助説明、エラー時の劣化表示まで秩序立てて扱う方向で定義します。

---

## 適用範囲

本書は、`ui-math` の次の事項を対象とします。

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

- LaTeX 記法そのものの教育的説明
- 数式意味論そのものの妥当性判定
- KaTeX の全構文仕様
- Markdown から `ui-math` へ変換する上位変換規則
- 数式番号付け、参照、相互リンクの完全仕様
- 数式エディタ UI や補完 UI
- サーバー側プリレンダリング全体の方針
- `ui-math` 単体における式番号・式参照機能
- 数式ソース / MathML / plain text のコピー UI
- touch 環境向け overflow hint UI
- slot 側 DOM の自動補正や自動修復
- `external` 下位分類ごとに骨格から分岐する別 UI
- `focus()`、`scrollToStart()`、`scrollToEnd()` などの公開 imperative API

これらは上位レイヤまたは別契約の責務です。

本書は、公開契約として採用する内容のみを本文に含めます。未確定論点を別節へ保留する構成は採りません。したがって、採用しない拡張案や別契約へ分離すべき機能は、本節の非対象一覧に明示し、現行利用者が依存してよい契約とは明確に区別します。

---

## 公開契約

`ui-math` は、`latex`、`block`、`primary`、`speech-mode`、`aria-label`、`error-message`、`error-kind`、`error-code`、`show-error-source` を公開入力として扱います。スロットは既定スロットのみを持ち、**SSR 数式専用入力** として扱います。内部実装は LitElement と KaTeX による描画ですが、利用者は `ui-math` を契約単位として扱います。

`latex` は slot 未指定時のランタイム描画入力です。`block` の既定値は `false`、`primary` の既定値は `false`、`speech-mode` の既定値は `mathml`、`aria-label` の既定値は空文字、`error-message` の既定値は空文字、`error-kind` の既定値は `unspecified`、`error-code` の既定値は空文字、`show-error-source` の既定値は `false` です。

表示優先順位は、**`error-message` → slot → `latex` → runtime 構文エラー → no-op** です。`error-message` は入力ソースではなく、**表示状態を上書きする入力** として扱います。既定スロットと `latex` を併用した場合、slot を優先します。`latex` に構文エラーが含まれていても、slot に正規入力が存在する場合は slot 表示を優先し、ランタイムエラー UI は表示しません。

`primary` は互換性のため公開入力名として維持しますが、契約上の意味は **display 数式に対するランドマーク付与フラグ** に限定します。`primary=true` は `block=true` の場合にのみ意味を持ち、このときに限り横スクロール領域へ `role="region"` と固定ラベルを付与します。`primary` は視覚的主役、論理的優先度、意味上の主従関係、強調度を表しません。`block=false` の場合、`primary` は表示、意味ロール、アクセシブル名、エラー分類のいずれにも影響しません。したがって利用者は `primary` を「重要な数式」を示す一般目的フラグとして解釈してはなりません（MUST NOT）。

`speech-mode` は、数式の主要な読み上げ経路を指定する公開入力です。`speech-mode="mathml"` は MathML を主要な読み上げ経路とし、`speech-mode="label"` は手動ラベルを主要な読み上げ経路とします。`label` を指定した場合、`aria-label` は空白以外の文字列でなければなりません（MUST）。`mathml` を指定した場合、`aria-label` は補助的に存在しても読み上げモードを変更しません。

`aria-label` は数式全体の手動読み上げテキストです。公開契約上、手動ラベル文字列の入力面は `aria-label` を正とし、新たな `label-text` 入力は導入しません。後方互換のため、`speech-mode` が未指定で `aria-label` に空白以外の値がある場合は、`speech-mode="label"` が指定されたものとして扱います。空白のみの `aria-label` は無効として扱い、`speech-mode` が未指定であれば `mathml` モードのままとします。

`error-message` は、数式内容とは独立にエラー UI を強制表示するための公開入力です。`error-message` が空白以外の場合、`ui-math` は数式描画を行わず、`external` エラー UI を表示します。この入力は入力ソースそのものではなく、**表示状態を上書きする入力** として扱います。

`error-kind` は、`external` エラーの下位分類を表す機械可読入力です。`error-message` が空白以外の場合にのみ意味を持ち、`build-failed`、`data-missing`、`runtime-failed`、`upstream-invalid`、`unspecified` のいずれかを取ります。`error-message` が空白の場合、`error-kind` と `error-code` は表示状態に影響しません。

`error-code` は、`external` エラーに付随する補助的な診断識別子です。これは表示骨格を決定する主キーではなく、ログ、補助説明、開発時診断のための補助情報として扱います。`error-code` の有無は `role="alert"` の有無やランドマーク契約に影響しません。

`show-error-source` は、エラー時に入力ソース詳細を開示してよいかを制御する独立した opt-in 入力です。既定値は `false` です。`true` の場合に限り、かつ入力ソースが存在する場合に限り、`details` / `summary` によるソース開示を許可します。エラー分類、`role="alert"` の有無、視覚トーンは `show-error-source` の値によって変化しません。

表示優先順位は、**`error-message` → slot → `latex` → runtime 構文エラー → no-op** です。`error-message` は入力ソースではなく、**表示状態を上書きする入力** として扱います。既定スロットと `latex` を併用した場合、slot を優先します。`latex` に構文エラーが含まれていても、slot に正規入力が存在する場合は slot 表示を優先し、ランタイムエラー UI は表示しません。

`primary` は互換性のため公開入力名として維持しますが、契約上の意味は **display 数式に対するランドマーク付与フラグ** に限定します。`primary=true` は `block=true` の場合にのみ意味を持ち、このときに限り横スクロール領域へ `role="region"` と固定ラベルを付与します。`primary` は視覚的主役、論理的優先度、意味上の主従関係、強調度を表しません。`block=false` の場合、`primary` は表示、意味ロール、アクセシブル名、エラー分類のいずれにも影響しません。したがって利用者は `primary` を「重要な数式」を示す一般目的フラグとして解釈してはなりません（MUST NOT）。

`aria-label` は数式全体の手動読み上げテキストですが、本書ではこれを単独の文字列入力としてではなく、**読み上げモードを切り替える入力** として扱います。既定は `mathml` モードであり、ランタイム MathML を公開します。空白以外の `aria-label` を与えた場合は `label` モードへ切り替わり、数式ロール要素にその値を反映し、ランタイム描画時の MathML は `aria-hidden="true"` に切り替わります。空白のみの `aria-label` は無効として扱い、`mathml` モードのままとします。

`error-message` は、数式内容とは独立にエラー UI を強制表示するための公開入力です。`error-message` が空白以外の場合、`ui-math` は数式描画を行わず、`external` エラー UI を表示します。この入力は入力ソースそのものではなく、**表示状態を上書きする入力** として扱います。

現時点の公開入力面では、`external` エラーの下位分類を利用者が明示指定することはできません。したがって、利用者が依存してよい公開契約は、`error-message` が `external` エラー表示を成立させること、数式描画を抑止すること、既定では動的 `alert` にしないことの 3 点です。

`external` の詳細原因は、ビルド失敗、データ欠落、実行時失敗、上流整形不正などであり得ますが、これらは現時点では公開入力契約ではなく、内部または上位レイヤの分類語彙として扱います。将来これらを公開契約へ昇格させる場合は、明示入力を追加したうえで本書を改訂しなければなりません（MUST）。

`show-error-source` は、エラー時に入力ソース詳細を開示してよいかを制御する独立した opt-in 入力です。既定値は `false` です。`true` の場合に限り、かつ入力ソースが存在する場合に限り、`details` / `summary` によるソース開示を許可します。エラー分類、`role="alert"` の有無、視覚トーンは `show-error-source` の値によって変化しません。

### 入力契約

| 名前                | 種別                 | 必須   | 内容                              | 契約                                                                                                              |
| ------------------- | -------------------- | ------ | --------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `latex`             | property             | いいえ | ランタイム描画用 LaTeX 文字列     | slot に正規入力がない場合にのみ使用します                                                                         |
| `block`             | property / attribute | いいえ | display mode                      | `true` の場合は別行数式として描画します                                                                           |
| `primary`           | property / attribute | いいえ | ランドマーク付与フラグ            | 互換性のため公開入力名は `primary` としますが、契約上は `block=true` の場合に region ランドマークを付与するかどうかだけを表します |
| `speech-mode`       | property / attribute | いいえ | 読み上げモード                    | `mathml` または `label` を取ります。既定値は `mathml` です                                                       |
| `aria-label`        | attribute            | いいえ | 手動読み上げテキスト              | `speech-mode="label"` の場合に主要ラベルとして使います。`speech-mode` 未指定時は後方互換入力としてモード切替も担います |
| `error-message`     | attribute            | いいえ | 外部注入エラーメッセージ          | 表示状態を上書きし、数式を描画せず `external` エラー UI を表示します                                              |
| `error-kind`        | property / attribute | いいえ | `external` 下位分類               | `build-failed` / `data-missing` / `runtime-failed` / `upstream-invalid` / `unspecified` のいずれかを取ります    |
| `error-code`        | attribute            | いいえ | 外部エラー補助コード              | 診断補助情報です。表示骨格の主キーではありません                                                                  |
| `show-error-source` | property / attribute | いいえ | エラー時ソース開示フラグ          | `true` の場合に限り、入力ソースが存在すれば `details` / `summary` による開示を許可します。既定値は `false` です   |
| `id`                | global attribute     | いいえ | アンカー識別子                    | 公開アンカー対象はホスト要素です                                                                                  |

### スロット契約

| 名前         | 種別 | 位置づけ | 内容                                                 |
| ------------ | ---- | -------- | ---------------------------------------------------- |
| 既定スロット | slot | 正規入力 | SSR 済み数式や手組み MathML + 可視表現を受け取ります |

既定スロットは、**SSR 数式専用入力** です。受け入れる正規形は、MathML と可視表現の組み合わせ、または KaTeX 等により生成された SSR 数式出力です。空白テキストのみは入力なしとみなします。

slot に正規入力がある場合、`latex`、ランタイム KaTeX 描画、ランタイム構文エラーは表示に寄与しません。slot は runtime 入力より優先されます。ただし、`error-message` が明示されている場合はエラー UI を優先します。

### slot 入力の正規形

slot 入力は自由入力ではなく、**1 スロットにつき 1 個の数式を表す SSR 済み入力** として扱います。正規入力は次のいずれかです。

1. 単一の SSR 数式ルート要素を持ち、その内部に **可視表現** と **MathML** の両方を含む入力
2. 同一 wrapper 内に、同一数式を表す **可視表現要素** と **`<math>` 要素** を 1 組だけ含む入力

次は正規入力ではありません。

- 空白テキストのみ
- 装飾専用 wrapper のみ
- 可視表現だけで MathML を欠く入力
- MathML だけで可視表現を欠く入力
- 複数の独立した数式を 1 つの slot に混在させた入力
- 数式意味論を持たない要素だけからなる入力

`aria-label` が未指定または空白のみの場合、slot 入力は `mathml` モード用の正規形でなければなりません（MUST）。この場合、MathML はアクセシビリティツリーに公開されていなければなりません（MUST）。

`aria-label` が空白以外の場合、slot 入力は `label` モード用の正規形でなければなりません（MUST）。この場合、数式全体を表す要素が非空のアクセシブル名を持ち、slot 内の `<math>` 要素は `aria-hidden="true"` でなければなりません（MUST）。

### slot 入力の受理境界

slot の受理境界は、ノードが存在することではなく、上記の正規形を満たしていることです。任意の要素ノードを与えれば slot 優先が成立する、という解釈は公開契約に含めません。

したがって、slot を使用する場合、入力側は正規形を満たす SSR 数式のみを与えなければなりません（MUST）。正規形を満たさない入力は非対応入力であり、公開契約の対象外です。

### slot 読み上げモード正規化契約

slot 側の読み上げモード正規化は入力側責務です。`ui-math` は slotted DOM を走査して MathML の公開状態、`aria-hidden`、アクセシブル名を自動補正しません。

したがって、slot を供給する側は `mathml` モード用 SSR と `label` モード用 SSR の両方を生成できなければなりません（MUST）。`ui-math` はその結果を受け取る器であり、slot 入力の正規化器ではありません。

### 属性反映契約

| property          | attribute           | reflect | 備考                                                |
| ----------------- | ------------------- | ------- | --------------------------------------------------- |
| `block`           | `block`             | あり    | boolean attribute として扱います                    |
| `primary`         | `primary`           | あり    | boolean attribute として扱います                    |
| `speechMode`      | `speech-mode`       | なし    | 列挙外値は `mathml` として扱います                  |
| `accessibleLabel` | `aria-label`        | なし    | 公開入力名は `aria-label` として扱います            |
| `errorMessage`    | `error-message`     | なし    | `external` エラー表示用です                         |
| `errorKind`       | `error-kind`        | なし    | 列挙外値は `unspecified` として扱います             |
| `errorCode`       | `error-code`        | なし    | 診断補助情報です                                    |
| `showErrorSource` | `show-error-source` | なし    | boolean attribute として扱います。既定値は `false`  |
| `latex`           | なし                | なし    | property 専用です                                   |

### 列挙外値・無効値の扱い

`block`、`primary`、`show-error-source` は boolean 入力です。`aria-label`、`error-message`、`error-code` は文字列入力です。`speech-mode` は `mathml | label`、`error-kind` は `build-failed | data-missing | runtime-failed | upstream-invalid | unspecified` の列挙入力です。

空白のみの `aria-label` は無効とみなし、指定なしと同等に扱います。したがって、`speech-mode` が未指定で `aria-label` が空白のみの場合、`label` モードは成立しません。

`speech-mode` に列挙外値が与えられた場合は無効とみなし、`mathml` として扱います。`error-kind` に列挙外値が与えられた場合は無効とみなし、`unspecified` として扱います。

`speech-mode="label"` かつ `aria-label` が空または空白のみの場合は、入力不整合として `author-invalid` ではなく **`external/upstream-invalid` 相当の契約違反入力** とみなすのではなく、公開契約上は **`label` モードが成立しない無効入力** として `mathml` モードへフォールバックします。`ui-math` はこの不整合だけでエラー UI を強制表示しません。

`latex` は任意文字列を受け取りますが、次は正規入力ではありません。

- `$$...$$` を含む入力
- KaTeX が解釈できない構文エラー入力

とくに `latex` には **デリミタを含めてはなりません（MUST NOT）**。`ui-math` は式本体のみを受け取ります。`$$` を含む場合は構文エラーとして扱います。

### 責務範囲

責務範囲には、inline / display 描画、slot と runtime の優先順位制御、display 数式の横スクロール、overflow 状態に応じたフェード表現、ランタイム KaTeX 描画、MathML 公開状態の切り替え、エラー UI 表示を含みます。

一方で、式番号、式参照、コピー機能、折りたたみ、ズーム、エディタ補助、数式意味解析は責務に含めません。

---

## 状態モデル

`ui-math` の主要状態は、見た目の種別ではなく、**slot を使うか、runtime を使うか、display か inline か、エラーか、スクロール可能か、読み上げモードが何か** によって読み分けます。

### 1. 基本状態

最小状態は、`block=false` で、slot に正規形の SSR 数式内容を持つか、または `latex` に有効な式を与えた状態です。この状態では通常の inline 数式として描画します。

### 2. slot 優先状態

既定スロットに正規形の SSR 数式があり、かつ `error-message` が明示されていない場合、`ui-math` は slot 表示を優先します。このとき `latex` が与えられていても runtime 描画は行いません。`latex` に構文エラーがあっても、slot が正規入力であればランタイムエラー UI は表示しません。

### 3. runtime 描画状態

slot に正規入力がなく、`error-message` もなく、`latex` が空でない場合、KaTeX により runtime 描画を行います。出力形式は `htmlAndMathml` です。

`block=false` では inline KaTeX、`block=true` では display KaTeX を生成します。

### 4. `external` エラー状態

`error-message` が明示されている場合、数式描画は行わず `external` エラー UI を表示します。この状態は、上位レイヤ、ビルド工程、データ取得、または上流整形に由来する**外部起因の失敗**を表します。`external` エラーでは `role="alert"` を既定で付与しません。

現時点の公開入力面では、`external` の下位分類は観測可能ではありません。したがって利用者が依存してよいのは、`error-message` が `external` エラー表示を強制すること、数式ロールと併存しないこと、既定では動的 alert にしないことの 3 点です。

### 5. `author-invalid` エラー状態

slot が空で `latex` があり、かつ構文検証に失敗した場合、`author-invalid` エラー UI を表示します。`$$` を含む場合、または KaTeX の `ParseError` が発生した場合は `author-invalid` として扱います。

`author-invalid` エラーでは `role="alert"` を付与します。入力ソース詳細は、`show-error-source=true` かつ入力ソースが存在する場合に限り、`details` / `summary` で展開表示できます。

### 6. inline 状態

`block=false` の場合、ルートは inline 数式です。内部コンテナは `role="math"` を持ちます。`primary=true` でも region ランドマークは付与しません。

### 7. block 状態

`block=true` の場合、ルートは display 数式です。内部に横スクロール可能な `.math-display` を持ち、その内側の `.math-content` が `role="math"` を持ちます。

### 8. landmark block 状態

`block=true` かつ `primary=true` の場合、`.math-display` はランドマーク化された display 数式となり、`role="region"` と固定ラベル `数式（横スクロール可能）` を持ちます。`primary` は視覚差分や意味上の主従関係を表しません。

### 9. overflow 状態

display 数式では、内容幅がコンテナ幅を超える場合に横スクロール可能状態へ遷移します。このとき内部状態は `start` / `middle` / `end` のいずれかを取り、フェードマスクの向きを切り替えます。

非 overflow 時は `data-scroll="none"` とし、キーボードフォーカス用 `tabindex` を付与しません。

overflow 時は `tabindex="0"` を付与し、キーボードでスクロール領域へ到達可能にします。

### 10. 読み上げモード状態

`ui-math` は、アクセシビリティ上の読み上げ戦略として `mathml` モードと `label` モードを持ちます。

- `mathml` モード: 既定モードです。ランタイム KaTeX の MathML を公開し、手動ラベル優先を行いません。
- `label` モード: `speech-mode="label"` が指定された場合、または後方互換として空白以外の `aria-label` が与えられ、かつ `speech-mode` が未指定の場合に成立します。数式ロール要素へ手動ラベルを反映し、ランタイム KaTeX の MathML は `aria-hidden="true"` に切り替わります。

`speech-mode="mathml"` が明示されている場合、`aria-label` は存在しても主要な読み上げ経路を変更しません。`aria-label` は補助的属性として存在し得ますが、MathML 公開を抑制しません。

slot 入力を用いる場合も、公開契約上はこの 2 つの読み上げモードに従うものとします。`ui-math` は slot 側の MathML 公開制御や手動ラベル注入を自動では行いません。読み上げモードに対応した slotted SSR を生成する責務は入力側にあります。

### 11. エラー時のランドマーク失効状態

エラー UI を表示する場合、`primary` はランドマーク制御として機能しません。`block=true` かつ `primary=true` であっても、エラー表示中の `.math-display` は `role="region"` と固定ラベルを持ちません。

この状態では、主題数式としての意味づけよりも、エラー通知と内容確認が優先されます。したがって、`primary` は通常数式表示時にのみ有効です。

### 12. エラーソース開示状態

`show-error-source=true` かつ入力ソースが存在する場合に限り、エラー UI は `details` / `summary` によるソース詳細を表示できます。`show-error-source=false` の場合、`author-invalid` と `external` のいずれであっても、入力ソース詳細は表示しません。

エラーソース開示状態は、エラー分類やアクセシビリティ上の重要度とは独立です。したがって、`show-error-source` を有効にしても `role="alert"` の有無や視覚トーンは変わりません。

---

## DOM / Accessibility

ルートは `:host` です。`block=false` では `.math-inline`、`block=true` では `.math-display` と `.math-content` を持ちます。エラー時は `.math-error` を描画します。

```text
<ui-math>
  #shadow-root
    [span.math-inline role="math"]
      <slot></slot>
      [span.runtime-katex]

    [div.math-display]
      [div.math-content role="math"]
        <slot></slot>
        [span.runtime-katex]

    [div.math-display]
      [div.math-error]
        [details.math-error-details]
```

### Accessibility 契約

アクセシビリティ上の重要点は次のとおりです。

- 数式本体の意味ロールは `role="math"` です。
- `primary=true` の display 数式のみ、スクロール領域に `role="region"` を付与します。`primary` はランドマーク制御のみを表します。
- region ラベルは固定文言 `数式（横スクロール可能）` です。
- `ui-math` は `mathml` / `label` の 2 つの読み上げモードを持ちます。
- `label` モードでは数式ロール要素へ手動ラベルを反映し、ランタイム MathML を `aria-hidden="true"` にします。
- `mathml` モードではランタイム MathML を公開します。
- エラー時は数式ロール要素を同時表示しません。
- `author-invalid` エラーのみ `role="alert"` を付与します。`external` エラーは既定で `alert` にしません。
- エラーソース開示は `show-error-source=true` の場合に限る opt-in です。
- overflow する display 数式のみフォーカス可能です。

overflow 時に `tabindex="0"` を付与することが保証するのは、**フォーカス可能な横スクロール領域であること** までです。Arrow キー、Home、End、PageUp、PageDown 等による具体的なスクロール操作は、公開契約として固定しません。これらの入力に対する実際の挙動は、ユーザーエージェントおよび実行環境の既定挙動に委ねます。

また、本書に記載する固定文言は、現時点では `ui-math` の公開 UI 文言です。とくに region ラベル `数式（横スクロール可能）` は内部既定値ではなく、利用者が依存してよい公開文言として扱います。

本コンポーネントで重要なのは、**見た目として KaTeX が描けていることではなく、数式としての読み上げ経路とスクロール可能領域の意味づけが破綻しないこと** です。

### MathML 公開契約

ランタイム描画は KaTeX の `htmlAndMathml` を使用します。MathML 部分は視覚的には 1 px 退避で非表示化しつつ、`mathml` モードではアクセシビリティツリーに公開します。

`label` モードでは、ランタイム描画された `<math>` 要素へ `aria-hidden="true"` を付与します。これは MathML の自動読み上げよりも、利用者が指定した手動読み上げテキストを優先するためです。

slot 入力側の MathML については、`ui-math` 自身は強制的に `aria-hidden` を切り替えません。slot 側で与える SSR 出力は、選択された読み上げモードに対応したアクセシビリティ状態を満たしていなければなりません（MUST）。`ui-math` は slotted DOM に対する読み上げモードの自動正規化器としては振る舞いません。

### 公開 DOM 状態への依存契約

本コンポーネントは、Shadow DOM 内に `.math-inline`、`.math-display`、`.math-content`、`.math-error` などの要素、および `data-scroll` 属性を持ちます。ただし、これらの class 名、内部属性値、DOM 階層、内部 `tabindex` は **観測補助のための内部 detail** として扱います。

利用者は、これらの内部 class 名、DOM 階層、`data-scroll` 値、内部 `tabindex` の有無に直接依存してはなりません。公開契約として依存してよいのは、**inline / block の見た目の違い、overflow 時のみフォーカス可能であること、primary block のみ region になること、エラー時に数式ロールが併存しないこと** です。

安定したスタイル拡張面は、公開トークンおよびホスト要素に対する外側レイアウト指定のみです。内部 class、Shadow DOM 構造、内部属性、内部要素選択に依存したスタイル上書きは公開契約ではありません。

現時点では `::part(...)` は公開契約に含めません。将来 `::part(...)` を公開する場合は、その時点で対象 part 名、意味、後方互換範囲を別途本書へ追加しなければなりません（MUST）。

Storybook や内部テストでこれらの内部 detail を参照することはありますが、それは検証手段であり、外部利用者向けの安定 API を意味しません。

---

## Visual Contract

`ui-math` の視覚契約は、数式を独立した装飾物として強く主張することではなく、**本文に溶け込む inline 表現** と **長い式を破綻なく読ませる display 表現** を両立することにあります。

### 情報順位

- inline 数式は本文行間に自然に収まることを優先します。
- display 数式は独立した読解対象として中央寄せしつつ、過度な囲みや装飾は持ちません。
- overflow する display 数式は、スクロール可能性を淡いフェードで示します。
- エラー状態は通常状態より強い警告色を持ちますが、本文全体を侵食するほど強くは主張しません。

### レイアウト

`inline` では `:host` は inline 表示です。`.math-inline` は `display: inline` で、`font-size: calc(1em * var(--text-math-scale, 1))` に従います。

`block` では `:host` は block 表示です。`.math-display` は上下マージンと上下パディングを持ち、中央寄せしつつ横スクロールを許可します。内部 `.math-content` は `display: inline-block` と `min-width: max-content` を持ち、式の幅を保持します。

### 視覚仕様

- 数式色は `color: inherit` に従います。
- KaTeX 出力とその主要なトークンクラスは文字色を継承します。
- display 数式は thin scrollbar を持ちます。
- overflow 状態に応じて左右いずれか、または両側にフェードマスクを適用します。
- 非 overflow 時はマスクを適用しません。
- エラー UI は danger 系の境界線、背景、文字色を使います。

### エラー表示

エラー UI は `.math-error` を単位とし、アイコン、見出し、補助説明を表示します。入力ソース詳細は既定では表示しません。

`show-error-source=true` かつ入力ソースが存在する場合に限り、`details` / `summary` により入力ソース詳細を表示できます。`author-invalid` エラーでも、`external` エラーでも、ソース開示はこの opt-in 条件に従います。

したがって、`error-message` の指定や `author-invalid` であること自体は、ソース開示の許可を意味しません。ソース開示の要否は、エラー分類とは独立した明示入力で制御します。

`external` エラーは、`error-kind` により下位分類されます。下位分類ごとの差分は、**共通レイアウト骨格を維持したまま、文言・補助情報・視覚トーンのみを差し替える** 契約とします。分類ごとに骨格から別 UI パターンへ分岐させてはなりません（MUST NOT）。

| `error-kind`        | 見出しの性格 | 補助説明                                             | 推奨補助情報                           | 視覚トーン |
| ------------------- | ------------ | ---------------------------------------------------- | -------------------------------------- | ---------- |
| `build-failed`      | 生成失敗     | ビルドまたは事前生成で描画不能になったことを示します | ビルド工程名、失敗時点、再生成の必要性 | danger     |
| `data-missing`      | 欠落         | 数式ソースまたは参照先が存在しないことを示します     | 欠落対象、参照名、復旧待ち可否         | muted      |
| `runtime-failed`    | 実行時失敗   | 実行時条件が満たされず描画できないことを示します     | 実行環境差分、再試行可否               | danger     |
| `upstream-invalid`  | 上流契約違反 | 上流整形済み入力が契約違反であることを示します       | 上流入力種別、契約違反の所在           | danger     |
| `unspecified`       | 外部エラー   | 外部要因で描画不能であることのみを示します           | なし、または最小限の説明               | muted      |

ここでいう `danger` は、致命性や注意喚起を示す視覚トーンであり、`role="alert"` を意味しません。`muted` は、本文の読解を過度に中断しないための抑制されたトーンです。

`external` エラーでは、`data-missing` と `unspecified` を **欠落・保留系の外部状態** として抑制的に表示し、`build-failed`、`runtime-failed`、`upstream-invalid` を **失敗・契約違反系の外部状態** として danger トーンで表示します。ただし、いずれも同一コンポーネントのエラーボックス骨格を保ちます。

`error-code` は視覚骨格を変えません。必要に応じて補助説明や診断表示へ露出してよいですが、露出有無は `show-error-source` と独立です。

### `external` 下位分類ごとの表示契約

`external` の下位分類は、**共通レイアウト骨格を維持したまま、文言・補助情報・トーンのみを差し替える** 契約とします。下位分類ごとの表示差分は次のとおりです。

| 下位分類           | 見出しの性格 | 補助説明                                             | 推奨補助情報                           | 視覚トーン |
| ------------------ | ------------ | ---------------------------------------------------- | -------------------------------------- | ---------- |
| `build-failed`     | 生成失敗     | ビルドまたは事前生成で描画不能になったことを示します | ビルド工程名、失敗時点、再生成の必要性 | danger     |
| `data-missing`     | 欠落         | 数式ソースまたは参照先が存在しないことを示します     | 欠落対象、参照名、復旧待ち可否         | muted      |
| `runtime-failed`   | 実行時失敗   | 実行時条件が満たされず描画できないことを示します     | 実行環境差分、再試行可否               | danger     |
| `upstream-invalid` | 上流契約違反 | 上流整形済み入力が契約違反であることを示します       | 上流入力種別、契約違反の所在           | danger     |
| `unspecified`      | 外部エラー   | 外部要因で描画不能であることのみを示します           | なし、または最小限の説明               | muted      |

ここでいう `danger` は、致命性や注意喚起を示す視覚トーンであり、`role="alert"` を意味しません。`muted` は、本文の読解を過度に中断しないための抑制されたトーンです。

長期的には、`data-missing` と `unspecified` は **欠落・保留系の外部状態** として抑制的に表示し、`build-failed`、`runtime-failed`、`upstream-invalid` は **失敗・契約違反系の外部状態** として danger トーンを用いる方がよいです。ただし、いずれも同一コンポーネントのエラーボックス骨格を保ち、分類ごとに全く別の UI パターンへ分岐させてはなりません（MUST NOT）。

### フォーカス表示

overflow する display 数式のみ `:focus-visible` によるアウトラインを持ちます。非 overflow の display 数式、および inline 数式はスクロールのためのフォーカス対象ではありません。

### 参照トークン

本コンポーネントは、主として次のトークンに依存します。

| 用途                     | トークン                          |
| ------------------------ | --------------------------------- |
| 通常文字色               | `--fg-default`                    |
| 控えめ文字色             | `--fg-muted`                      |
| 危険境界線               | `--border-danger`                 |
| 危険背景                 | `--bg-danger-subtle`              |
| 危険文字色               | `--fg-danger`                     |
| 補助背景                 | `--bg-fill-muted`                 |
| フォーカス幅             | `--focus-ring-width`              |
| フォーカス色             | `--focus-ring-color`              |
| フォーカスオフセット     | `--focus-ring-offset`             |
| フォーカスアニメーション | `--animation-focus`               |
| スクロールバー幅         | `--scrollbar-width`               |
| スクロールバー hover 色  | `--scrollbar-thumb-hover`         |
| 余白                     | `--space-*`                       |
| 角丸                     | `--radius-*`                      |
| 数式倍率                 | `--text-math-scale`               |
| フェード幅               | `--space-4` または `--fade-width` |

---

## 環境別の振る舞い

### Forced Colors

`forced-colors: active` 環境では、display 数式のマスクを無効化します。スクロールバー色とエラー色はシステムカラーへフォールバックし、フォーカスリングは `CanvasText` を用います。

### Print

`@media print` では、display 数式の overflow を解除し、マスクを無効化します。display 数式は `page-break-inside: avoid` / `break-inside: avoid` を持ち、印刷時に式が分断されにくいようにします。

### Dark Mode

色は `color: inherit` とトークン差し替えで吸収します。KaTeX 出力は独自色に固定せず、親コンテナの色へ追従しなければなりません（MUST）。

### Resize / Layout Change

display 数式は `ResizeObserver` により overflow 状態を再計測します。コンテナ幅の変化、runtime 描画結果の変化、block 状態の切り替えに応じて、スクロール可否とフェード状態を更新します。

---

## 関連契約

### スクロール契約

`block=true` の display 数式は、内容が横方向にはみ出す場合にのみスクロール対象になります。

- 非 overflow 時は `data-scroll="none"` です。
- overflow 時は `data-scroll="start"` / `"middle"` / `"end"` のいずれかです。
- overflow 時のみ `tabindex="0"` を付与します。
- スクロールイベントに応じて状態を更新します。

このスクロール契約は、display 数式自体を独立したスクロール面として扱うためのものであり、外側レイアウトの水平スクロールに依存しません。

overflow 時に `tabindex="0"` を付与することが保証するのは、**フォーカス可能なスクロール領域であること** までです。Arrow キー、Home、End 等による具体的なスクロール操作は公開契約として固定しません。これらはユーザーエージェント既定挙動に委ねます。

### id / アンカー契約

公開アンカー対象はホスト要素の `id` のみです。利用者は `ui-math#...` をアンカーとして扱ってよく、内部スクロール領域の `id` には依存してはなりません。

内部 `id` ミラーが実装上存在しても、それは公開契約ではなく観測補助または内部 detail として扱います。

### 読み上げモード契約

本コンポーネントの読み上げ戦略は、`speech-mode` により `mathml` モードと `label` モードの 2 状態で定義します。

- `speech-mode="mathml"`: 既定モードです。MathML を主要な読み上げ経路とします。
- `speech-mode="label"`: 手動ラベルを主要な読み上げ経路とし、ランタイム MathML は公開しません。

手動ラベル文字列の公開入力は `aria-label` を正とします。`label-text` のような別名入力は導入しません。したがって、`speech-mode="label"` の場合、`aria-label` は空白以外の文字列でなければなりません（MUST）。

後方互換のため、`speech-mode` が未指定で `aria-label` に空白以外の値がある場合は、`speech-mode="label"` が指定されたものとして扱います。`speech-mode` が明示されている場合は、その値を `aria-label` より優先します。

slot を用いる場合、読み上げモードの正規化は slotted SSR の生成側責務です。`ui-math` は slot 側 DOM を自動補正せず、入力済みのモードをそのまま受け取ります。この方針により、runtime 経路と slot 経路の責務境界を明確に保ちます。

### エラー分類契約

本コンポーネントの公開エラー分類は、次の 2 層で定義します。

- 上位分類
  - `external`: `error-message` により成立する外部起因エラーです。既定では `role="alert"` を持ちません。
  - `author-invalid`: 利用者が与えた `latex` が delimiter 禁止、構文不正、または KaTeX 解釈不能であることに由来するエラーです。`role="alert"` を持ちます。
- `external` 下位分類
  - `build-failed`
  - `data-missing`
  - `runtime-failed`
  - `upstream-invalid`
  - `unspecified`

`external` 下位分類は `error-kind` により明示指定します。`error-message` が空白以外で `error-kind` が未指定または無効な場合は `unspecified` として扱います。

`author-invalid` には公開下位分類を設けません。delimiter 禁止違反、構文不正、KaTeX `ParseError` は、いずれも `author-invalid` として同一骨格で扱います。

ソース開示可否はエラー分類契約に含めません。ソース開示は `show-error-source` による独立した opt-in 契約で制御します。`error-code` は診断補助情報であり、公開エラー分類の主キーではありません。

### エラーソース開示契約

エラー時の入力ソース開示は、`show-error-source` による明示 opt-in 契約です。既定値は `false` とし、`true` の場合に限り、かつ入力ソースが存在する場合に限り、`details` / `summary` によるソース詳細を表示できます。

この契約は `author-invalid` と `external` の両方に適用します。つまり、`author-invalid` であっても既定では raw LaTeX を露出しません。ソース開示の要否は、デバッグ容易性ではなく、公開 UI における情報露出制御を優先して決定します。

将来、エラー分類ごとに既定値を変える設計を導入する場合でも、公開契約としての基本原則は **既定非開示・明示 opt-in** でなければなりません（MUST）。

### runtime 描画契約

runtime 描画は KaTeX `renderToString()` に委譲します。利用するオプションは次のとおりです。

- `displayMode`: `block` に従います。
- `output`: `htmlAndMathml`
- `throwOnError`: `true`
- `strict`: `'warn'`

描画失敗時は例外を吸収し、エラー UI へフォールバックします。描画失敗を例外として外へ再送出しません。

`strict`、`output`、`throwOnError` の変更は、描画結果、エラー種別、アクセシビリティ露出に影響し得ます。これらの変更は内部最適化ではなく、公開挙動に影響し得る変更として扱います。

### slot / runtime 優先順位契約

表示優先順位は次のとおりです。

1. 明示 `error-message`
2. 正規形の slot 入力
3. 有効な `latex` による runtime 描画
4. runtime 構文エラー UI
5. no-op

利用者はこの優先順位に依存してよいです。とくに、slot と runtime を同時に与える場合は slot を正とし、`error-message` は表示状態の上書き入力として扱います。

### 反映タイミング契約

`latex`、`block`、`speech-mode`、`aria-label`、`error-message`、`error-kind`、slot 内容、コンテナ幅の変化は、常に同一同期点で反映されるとは限りません。runtime 描画、overflow 判定、`data-scroll` 更新、`tabindex` 付与、MathML の `aria-hidden` 反映は、更新サイクル、レイアウト確定、`requestAnimationFrame`、または `ResizeObserver` 通知を経て安定します。

したがって、利用者およびテストは、要素更新直後の瞬間状態ではなく、**安定化完了後の状態** を前提に確認しなければなりません（MUST）。`ui-math` は即時同期よりも、描画とレイアウトの整合を優先します。

安定化完了の公開観測点として、本コンポーネントは `math-settled` イベントを提供します。専用イベントが利用できない場合に限り、観測上の代替安定点として **更新完了後さらに 1 frame 経過した時点** を用いてよいものとします。

### 公開イベント契約

本コンポーネントは、安定化完了を観測するための公開イベントとして `math-settled` を提供します。

`math-settled` は、少なくとも次の処理が公開状態として安定した後に発火しなければなりません（MUST）。

- runtime 描画または error UI 反映
- overflow 再計測
- `data-scroll` 更新
- `tabindex` 付与 / 解除
- `speech-mode` に応じた MathML 公開状態の確定

`math-settled` は状態取得用 imperative API の代替ではなく、**安定観測点の通知契約** です。したがって、`focus()`、`scrollToStart()`、`scrollToEnd()` などの公開 imperative API を追加したものとはみなしません。

複数の更新が同一安定サイクルへ畳み込まれる場合、`math-settled` は公開状態が最終的に安定した後に 1 回以上発火すればよく、中間状態ごとの逐次発火は公開契約として要求しません。

### 公開メソッド非提供契約

`ui-math` は公開 imperative API を持ちません。`focus()`、`scrollToStart()`、`scrollToEnd()`、再計測トリガーなどの公開メソッドは提供しません。

overflow 数式へのフォーカスは内部スクロール領域が担いますが、ホスト要素に対する imperative 制御契約は持ちません。利用者はホスト経由で内部スクロール状態を直接制御できることを期待してはなりません。

安定観測については公開メソッドではなく `math-settled` を正とします。したがって、宣言的入力と公開イベントの組で状態同期を行う方針を維持します。

### slot / runtime 意味同値契約

slot 経路と runtime 経路は、DOM 構造の一致を保証するものではありません。公開契約として保証するのは、**意味契約の同値性** です。

したがって、同一内容の数式を slot と runtime のいずれで供給する場合でも、少なくとも次の契約は一致しなければなりません（MUST）。

- アクセシブル名の決定規則
- MathML 公開 / 非公開規則
- inline / block の視覚的重み
- エラー時の退避方針

一方で、内部 DOM 構造、内部 wrapper、内部 class の一致は公開契約に含めません。slot と runtime は、同一 DOM を生成することではなく、同一の意味状態を成立させることを目的とします。

### latex 入力文法契約

`latex` は、slot 未指定時のランタイム描画に用いる **LaTeX 式本体文字列** です。`ui-math` は delimiter を含む完成表記全体を受け取りません。

したがって、`latex` に `$$...$$`、`\\(...\\)`、`\\[...\\]` などの delimiter を含めてはなりません（MUST NOT）。`ui-math` は式本体のみを受け取り、delimiter を自動的に剥がす正規化器としては振る舞いません。

`ui-math` が `latex` に対して行う前処理は、空判定および最小限の文字列境界処理に限ります。包括的な構文解釈、互換補正、記法変換の主体は KaTeX です。

runtime 描画における構文解釈の主体は KaTeX であるため、`strict`、`output`、`throwOnError` などの KaTeX オプション変更は、内部実装差し替えではなく公開挙動に影響し得る変更として扱わなければなりません（MUST）。

### 安定観測点契約

`latex`、`block`、`speech-mode`、`aria-label`、slot 内容、コンテナ幅の変化は、常に単一同期点で完了するとは限りません。runtime 描画、overflow 判定、`data-scroll` 更新、`tabindex` 付与、MathML の `aria-hidden` 反映は、更新サイクル、レイアウト確定、`requestAnimationFrame`、または `ResizeObserver` 通知を経て安定します。

現行公開契約では、安定化完了を観測するための専用イベントとして `math-settled` を提供します。利用者およびテストは、要素更新直後の瞬間状態ではなく、**`math-settled` 発火後の状態** を正規の安定観測点として扱わなければなりません（MUST）。

専用イベントを利用できない場合に限り、観測上の代替安定点として **更新完了後さらに 1 frame 経過した時点** を用いてよいものとします。この契約は、即時同期性よりも描画結果とレイアウト整合性を優先するためのものです。

### 文言契約

本コンポーネントの固定文言は、現時点では Rouault 向け日本語 UI 文言として公開契約に含めます。内部既定値として自由に差し替えてよい文言ではありません。

少なくとも次の文言は、現行契約で利用者が依存してよい公開 UI 文言です。

- `数式（横スクロール可能）`
- `数式ソースを表示`

エラー見出しや補助説明の既定文言も、現時点では日本語 UI 文言として扱います。将来ローカライズを導入する場合は、文言供給機構または上位レイヤからの注入契約を別途追加しなければなりません（MUST）。

現時点では、文言差し替え入力、ロケール入力、i18n 辞書注入は公開契約に含めません。

---

## 境界条件

### 1. slot と `latex` の併用

既定スロットに正規形の SSR 数式がある場合、`latex` は無視されます。`latex` が不正でも slot を表示します。

### 2. 空白のみの `aria-label`

`aria-label="   "` のような入力は無効化されます。この場合、`label` モードは成立せず、`mathml` モードを維持します。数式ロール要素へ `aria-label` は出力せず、MathML も `aria-hidden` にしません。

### 3. `primary=true` の inline 数式

`inline` 数式では `primary=true` を与えても `role="region"` は付与しません。`primary` は display 数式専用のランドマーク制御です。

### 4. 非 overflow display 数式

display 数式であっても overflow しない場合、`tabindex` は付与しません。スクロールコンテナとしてのフォーカス対象にはなりません。

### 5. `$$` を含む `latex`

`latex` に `$$` を含む場合は契約違反入力として扱い、`author-invalid` エラー UI を表示します。`ui-math` は自動的にデリミタを剥がしません。

### 6. `latex` 空文字

slot も `error-message` もなく、`latex` も空文字の場合、runtime 描画は行いません。この場合、`ui-math` は no-op とし、数式ロールもエラー UI も描画しません。

### 7. エラー時の role 競合

エラー UI 表示時は、`role="math"` 要素を同時表示しません。通常数式とエラー UI の二重露出は契約違反です。

### 8. slot 側アクセシビリティ

slot に投入する MathML / 可視 HTML のアクセシビリティ状態は入力側責務です。`ui-math` は slot 内容を検査して自動修正しません。読み上げモードの正規化も slot 側では入力責務であり、`ui-math` は slotted DOM を自動変換しません。

### 9. エラー時の `primary` 無効化

`block=true` かつ `primary=true` であっても、`external` または `author-invalid` を表示している間は `.math-display` に `role="region"` を付与しません。エラー時に主題数式ランドマークは成立しません。

### 10. 反映直後の一時状態

`block` 切り替え、`latex` 更新、`speech-mode` 更新、`aria-label` 更新、`error-message` 更新、`error-kind` 更新、slot 内容更新、またはコンテナ幅変更の直後には、overflow 状態、`data-scroll`、`tabindex`、MathML の公開状態が次の安定点まで未確定であることがあります。この一時状態は契約違反ではありません。

現行公開契約における安定観測点は、`math-settled` 発火後の状態です。専用イベントを観測しない場合に限り、要素更新完了後さらに 1 frame 経過した時点を代替観測点として用いてよいものとします。

### 11. 内部 DOM への依存禁止

`.math-display`、`.math-content`、`.math-error`、`data-scroll`、内部 `tabindex` は外部公開 API ではありません。利用者コードはこれらに依存してはなりません。

---

## Storybook 契約

各 Story は見本ではなく、**契約確認点** として扱います。将来変更時には、次の契約を維持します。

| Story                    | 固定する契約                                                                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `Default`                | `block + primary` の基本 display 数式が region として成立すること                                                                            |
| `VariantStateMatrix`     | inline / block / primary / `speech-mode` / `aria-label` の組み合わせ責務が保たれること                                                       |
| `ErrorStates`            | `external` と `author-invalid` の role 差分、および `show-error-source` による opt-in 開示契約が保たれること                                 |
| `ErrorKindMatrix`        | `error-kind` ごとに共通骨格を維持したまま、文言・補助情報・トーン差分のみが変化すること                                                       |
| `BoundaryConditions`     | `error-message` 優先、slot の runtime 優先、空白 `aria-label` 無効化、`speech-mode` 列挙外値のフォールバック、inline で region 非付与が保たれること |
| `KeyboardInteraction`    | overflow 時のみフォーカス可能であること、およびスクロール状態が安定後に遷移すること                                                          |
| `SettledEventContract`   | 公開状態の安定化後に `math-settled` が発火すること                                                                                            |
| `IdAnchorContract`       | host 要素の `id` を公開アンカーとして扱えること。内部 id ミラーは公開 API ではないこと                                                       |
| `DarkModeTokenContract`  | KaTeX が `color: inherit` により暗色トークンへ追従すること                                                                                   |
| `ForcedColorsContract`   | 強制色時のマスク無効化とシステムカラー追従定義が存在すること                                                                                 |

`KeyboardInteraction` は独自キー操作を固定する Story ではありません。overflow 時のみフォーカス可能であること、およびフォーカス可能性が安定後に成立することを確認する Story として扱います。

`SettledEventContract` は、公開 imperative API の代替を検証する Story ではありません。安定観測点として `math-settled` を利用できることを確認する Story として扱います。

---

## 補足

`ui-math` の要点は、数式を描けること自体にはありません。**slot ベースの安定した出力と、runtime 入力の安全な劣化表示を両立しつつ、長い display 数式でも読解を破綻させないこと** にあります。

したがって、今後の変更でも次の 4 点は崩さない方がよいです。

1. `error-message` を表示状態の上書き入力として扱い、その優先順位を曖昧にしないこと。
2. slot が runtime より常に優先されること。
3. display 数式のスクロール責務をコンポーネント内で閉じること。
4. `aria-label` 指定時の MathML 公開優先順位と、構文エラー時の退避 UI を曖昧にしないこと。

---

## 現行実装で未対応の事項

本節は、現行の `math.ts` および `math.stories.ts` を基準として、**契約書内で長期的には明確化または拡張余地があるが、現時点では未実装、未固定、または入力側責務に残っている事項** を整理するものです。

### 1. slot 側 MathML の自動制御

現行実装は、ランタイム描画された MathML に対してのみ `aria-hidden` の切り替えを行います。slot 側の MathML は自動制御しません。

そのため、SSR 出力における読み上げモードの適用と MathML 公開優先順位は、**入力側が正しく構成していることを前提** としています。slot 側アクセシビリティの自動正規化は未対応であり、本書でもそれを行わない方針を採用しています。

### 2. `primary` の意味拡張

現行の `primary` は、display 数式に region ランドマークを付与する用途に限定されています。主題数式としてのスタイル差分、目次連携、番号参照、ハイライト連携などは持ちません。

したがって、`primary` は現時点では **アクセシビリティ上のランドマーク補助に限定された状態** です。

### 3. 数式番号・参照契約

現行実装は host 要素の `id` を公開アンカーとして扱いますが、式番号、ラベル、`eqref` 的参照、被参照時ハイライトなどは扱いません。アンカー可能性はあるものの、**参照体系としての契約は未定義** です。

### 4. ランタイム入力の正規化

現行実装は `latex.trim()` を行いますが、デリミタ除去、改行正規化、危険記法の細かな分類、author-invalid 下位コード化は行いません。`$$` を含む場合も単純にエラー化します。

したがって、runtime 入力正規化は **最小限の前処理にとどまり、包括的な正規化契約には達していません**。

### 5. slot 正規形と受理境界の実行時強制

本書では、slot は SSR 数式専用入力であり、正規形を満たす入力だけを受理対象とします。しかし現行実装の slot 判定は、空白以外のテキストノードまたは任意要素ノードの存在に基づいています。

そのため、装飾 wrapper や正規形を満たさない任意要素であっても slot 優先が成立し得る状態が残っています。**slot 正規形と受理境界の契約は、現行実装では実行時に強制されていません。**

### 6. 公開メソッド

現行実装は公開メソッドを持ちません。overflow 数式へのフォーカスは内部コンテナが担いますが、ホスト経由で `focus()` などを提供する契約にはなっていません。

### 7. part / スタイル拡張面

現行実装は `::part(...)` を公開していません。外部テーマ調整は主に CSS Custom Properties と継承色に依存します。Shadow DOM 内部構造への詳細なスタイル拡張面は未公開です。

### 8. 本節の扱い

本節に記載した事項は、現行公開契約として利用者が依存してよいものではありません。これらを採用する場合は、実装、Storybook、契約書の 3 点を同時に更新し、未対応状態を残したまま公開契約へ昇格させません。
