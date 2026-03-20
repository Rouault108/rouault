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
- 新規で追加を検討する価値がある機能
- 現行実装で未対応の事項

一方で、本書は次の事項を扱いません。

- LaTeX 記法そのものの教育的説明
- 数式意味論そのものの妥当性判定
- KaTeX の全構文仕様
- Markdown から `ui-math` へ変換する上位変換規則
- 数式番号付け、参照、相互リンクの完全仕様
- 数式エディタ UI や補完 UI
- サーバー側プリレンダリング全体の方針

これらは上位レイヤまたは別契約の責務です。

---

## 公開契約

`ui-math` は、`latex`、`block`、`primary`、`aria-label`、`error-message`、`show-error-source` を公開入力として扱います。スロットは既定スロットのみを持ち、**SSR 数式専用入力** として扱います。内部実装は LitElement と KaTeX による描画ですが、利用者は `ui-math` を契約単位として扱います。

`latex` は slot 未指定時のランタイム描画入力です。`block` の既定値は `false`、`primary` の既定値は `false`、`aria-label` の既定値は空文字、`error-message` の既定値は空文字、`show-error-source` の既定値は `false` です。

表示優先順位は、**`error-message` → slot → `latex` → runtime 構文エラー → no-op** です。`error-message` は入力ソースではなく、**表示状態を上書きする入力** として扱います。既定スロットと `latex` を併用した場合、slot を優先します。`latex` に構文エラーが含まれていても、slot に正規入力が存在する場合は slot 表示を優先し、ランタイムエラー UI は表示しません。

`primary` は公開入力名としては維持しますが、契約上の意味は **ランドマーク制御フラグ** です。`block=true` かつ `primary=true` の display 数式のみ、横スクロール領域に `role="region"` と固定ラベルを付与します。`primary` は視覚的主役や論理的優先度を表しません。`inline` 数式では `primary=true` を与えても region にはなりません。

`aria-label` は数式全体の手動読み上げテキストですが、本書ではこれを単独の文字列入力としてではなく、**読み上げモードを切り替える入力** として扱います。既定は `mathml` モードであり、ランタイム MathML を公開します。空白以外の `aria-label` を与えた場合は `label` モードへ切り替わり、数式ロール要素にその値を反映し、ランタイム描画時の MathML は `aria-hidden="true"` に切り替わります。空白のみの `aria-label` は無効として扱い、`mathml` モードのままとします。

`error-message` は静的エラーまたは上位レイヤ注入エラーの表示用です。本書ではエラーを発生時点ではなく **意味分類** で扱います。`error-message` により表示されるエラーは `external` 系のエラーとして扱い、数式描画は行わずエラー UI を優先します。`error-message` が明示指定されている場合、そのエラーは `author-invalid` ではなく `external` であり、動的 alert にはしません。

`external` は単独の箱ではなく、**予約済み下位分類を持つ上位分類** として扱います。下位分類は `build-failed`、`data-missing`、`runtime-failed`、`upstream-invalid`、`unspecified` です。現行の公開入力面では `error-message` のみが存在するため、明示的な下位分類が与えられない場合は `external/unspecified` とみなします。将来 `error-kind` 等の明示入力を追加する場合は、この語彙と互換でなければなりません（MUST）。

`external` の下位分類は、**表示骨格は共通としつつ、見出し文言、補助説明、推奨される補助情報、および視覚トーンのみを差し替える** 契約とします。下位分類ごとにエラー UI のレイアウト構造を分岐させてはなりません（MUST NOT）。

`show-error-source` は、エラー時に入力ソース詳細を開示してよいかを制御する opt-in 入力です。既定値は `false` です。`true` の場合に限り、かつ入力ソースが存在する場合に限り、`details` / `summary` によるソース開示を許可します。エラー分類、`role="alert"` の有無、視覚トーンは `show-error-source` の値によって変化しません。

### 入力契約

| 名前                  | 種別                   | 必須  | 内容                 | 契約                                                                          |
| ------------------- | -------------------- | --- | ------------------ | --------------------------------------------------------------------------- |
| `latex`             | property             | いいえ | ランタイム描画用 LaTeX 文字列 | slot に正規入力がない場合にのみ使用します                                                     |
| `block`             | property / attribute | いいえ | display mode       | `true` の場合は別行数式として描画します                                                     |
| `primary`           | property / attribute | いいえ | ランドマーク制御フラグ        | 公開入力名は維持しますが、契約上は `block=true` のときのみ region ランドマーク付与に使用します                  |
| `aria-label`        | attribute            | いいえ | 手動読み上げテキスト         | 空白以外を指定した場合は `label` 読み上げモードへ切り替え、数式ロール要素へ反映します                             |
| `error-message`     | attribute            | いいえ | 外部注入エラーメッセージ       | 表示状態を上書きし、既定では `external/unspecified` として数式を描画せずエラー UI を表示します               |
| `show-error-source` | property / attribute | いいえ | エラー時ソース開示フラグ       | `true` の場合に限り、入力ソースが存在すれば `details` / `summary` による開示を許可します。既定値は `false` です |
| `id`                | global attribute     | いいえ | アンカー識別子            | 公開アンカー対象はホスト要素です                                                            |

### スロット契約

| 名前     | 種別   | 位置づけ | 内容                                |
| ------ | ---- | ---- | --------------------------------- |
| 既定スロット | slot | 正規入力 | SSR 済み数式や手組み MathML + 可視表現を受け取ります |

既定スロットは、**SSR 数式専用入力** です。受け入れる正規形は、MathML と可視表現の組み合わせ、または KaTeX 等により生成された SSR 数式出力です。空白テキストのみは入力なしとみなします。

slot に正規入力がある場合、`latex`、ランタイム KaTeX 描画、ランタイム構文エラーは表示に寄与しません。slot は runtime 入力より優先されます。ただし、`error-message` が明示されている場合はエラー UI を優先します。

### slot 入力の正規形

slot 入力は自由入力ではなく、**SSR 数式専用入力** として扱います。正規形は、MathML と可視表現を 1 組として持つ構成、または SSR により生成された単一の数式表現です。

`aria-label` を指定しない場合、slot 入力は **MathML をアクセシビリティツリーへ公開し、可視表現側を必要に応じて **``** にする** 構成を正規形とします。`aria-label` を指定する場合、slot 側は ``** モードに整形済みの SSR 数式** を入力しなければなりません（MUST）。このとき、手動ラベルを受け持つ要素にアクセシブル名を持たせ、MathML は入力側で `aria-hidden="true"` にしなければなりません（MUST）。`ui-math` は slotted DOM を走査して `aria-hidden` やアクセシブル名を自動補正しません。

装飾専用要素、空要素、あるいは数式意味論を持たない wrapper のみを slot に与えてはなりません（MUST NOT）。正規形を満たさない slot 入力は非対応入力として扱います。

### slot 入力の受理境界

slot の受理境界は、DOM ノードの存在ではなく、**SSR 数式としての正規形を満たしているか** によって定義します。実装上の内部判定が今後どのように変化しても、任意要素ノードを与えれば slot 優先が成立することを公開契約には含めません。

したがって、slot を使用する場合、入力側は正規形を満たす SSR 数式のみを与えなければなりません（MUST）。正規形を満たさない入力を与えた場合の振る舞いは未定義です。

### slot 読み上げモード正規化契約

slot 側の読み上げモード正規化は、`ui-math` 自身では行いません。`mathml` モードと `label` モードのどちらを成立させるかは、**slotted SSR 出力の生成側責務** です。

`ui-math` は slot 内容を意味的に解析して読み上げモードへ変換したり、MathML に `aria-hidden` を付け替えたり、手動ラベルを自動注入したりしません。これは Shadow DOM 内から slotted DOM を再解釈して暗黙に書き換える設計を避け、入力契約と責務分界を安定化させるためです。

したがって、slot を用いる入力系は、`mathml` モード用 SSR と `label` モード用 SSR の 2 正規形を生成できなければなりません（MUST）。`ui-math` はその切替結果を受け取る器であり、正規化器ではありません。

### 属性反映契約

| property          | attribute       | reflect | 備考                          |
| ----------------- | --------------- | ------- | --------------------------- |
| `block`           | `block`         | あり      | boolean attribute として扱います   |
| `primary`         | `primary`       | あり      | boolean attribute として扱います   |
| `accessibleLabel` | `aria-label`    | なし      | 公開入力名は `aria-label` として扱います |
| `errorMessage`    | `error-message` | なし      | 静的エラー表示用です                  |
| `latex`           | なし              | なし      | property 専用です               |

### 列挙外値・無効値の扱い

`block`、`primary`、`show-error-source` は boolean 入力です。`aria-label` と `error-message` は文字列入力です。空白のみの `aria-label` は無効とみなし、指定なしと同等に扱います。したがって、空白のみの `aria-label` は `label` モードを成立させません。

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

`error-message` が明示されている場合、数式描画は行わずエラー UI を表示します。この状態は上位レイヤ、ビルド工程、データ取得、または上流整形で注入された ``** 系エラー** を表します。`external` エラーでは `role="alert"` を既定で付与しません。

`external` は次の予約済み下位分類を持ちます。

- `build-failed`: ビルド時の変換、SSR、または事前生成処理に失敗した状態です。
- `data-missing`: 数式ソース自体が欠落している、または参照先が解決不能である状態です。
- `runtime-failed`: 実行時に描画前提が満たされず、上位レイヤが失敗を注入した状態です。
- `upstream-invalid`: 上流整形済みデータが契約違反であると判定された状態です。
- `unspecified`: 現行公開入力面で具体的下位分類を表現できない場合の既定値です。

現時点では `error-message` 単独入力のため、下位分類が明示されない限り `external/unspecified` として扱います。

`external` の下位分類は状態意味を持ちますが、レイアウト骨格そのものは変更しません。差分は **見出し文言、補助説明、補助情報の有無、視覚トーン** に限定します。これにより、外部要因によるエラーであっても、読解フローを過度に乱さずに原因の粒度だけを提示します。

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
- `label` モード: 空白以外の `aria-label` を与えた場合に成立します。数式ロール要素へ手動ラベルを反映し、ランタイム KaTeX の MathML は `aria-hidden="true"` に切り替わります。

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
- `author-invalid` エラーのみ `role="alert"` を付与します。`external` エラーは下位分類にかかわらず既定で `alert` にしません。
- エラーソース開示は `show-error-source=true` の場合に限る opt-in です。
- overflow する display 数式のみフォーカス可能です。

本コンポーネントで重要なのは、**見た目として KaTeX が描けていることではなく、数式としての読み上げ経路とスクロール可能領域の意味づけが破綻しないこと** です。

### MathML 公開契約

ランタイム描画は KaTeX の `htmlAndMathml` を使用します。MathML 部分は視覚的には 1 px 退避で非表示化しつつ、`mathml` モードではアクセシビリティツリーに公開します。

`label` モードでは、ランタイム描画された `<math>` 要素へ `aria-hidden="true"` を付与します。これは MathML の自動読み上げよりも、利用者が指定した手動読み上げテキストを優先するためです。

slot 入力側の MathML については、`ui-math` 自身は強制的に `aria-hidden` を切り替えません。slot 側で与える SSR 出力は、選択された読み上げモードに対応したアクセシビリティ状態を満たしていなければなりません（MUST）。`ui-math` は slotted DOM に対する読み上げモードの自動正規化器としては振る舞いません。

### 公開 DOM 状態への依存契約

本コンポーネントは、Shadow DOM 内に `.math-inline`、`.math-display`、`.math-content`、`.math-error` などの要素、および `data-scroll` 属性を持ちます。ただし、これらの class 名や内部属性値は **観測補助のための内部 detail** として扱います。

利用者は、これらの内部 class 名、DOM 階層、`data-scroll` 値、内部 `tabindex` の有無に直接依存してはなりません。公開契約として依存してよいのは、**inline / block の見た目の違い、overflow 時のみフォーカス可能であること、primary block のみ region になること、エラー時に数式ロールが併存しないこと** です。

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

### `external` 下位分類ごとの表示契約

`external` の下位分類は、**共通レイアウト骨格を維持したまま、文言・補助情報・トーンのみを差し替える** 契約とします。下位分類ごとの表示差分は次のとおりです。

| 下位分類               | 見出しの性格 | 補助説明                       | 推奨補助情報              | 視覚トーン  |
| ------------------ | ------ | -------------------------- | ------------------- | ------ |
| `build-failed`     | 生成失敗   | ビルドまたは事前生成で描画不能になったことを示します | ビルド工程名、失敗時点、再生成の必要性 | danger |
| `data-missing`     | 欠落     | 数式ソースまたは参照先が存在しないことを示します   | 欠落対象、参照名、復旧待ち可否     | muted  |
| `runtime-failed`   | 実行時失敗  | 実行時条件が満たされず描画できないことを示します   | 実行環境差分、再試行可否        | danger |
| `upstream-invalid` | 上流契約違反 | 上流整形済み入力が契約違反であることを示します    | 上流入力種別、契約違反の所在      | danger |
| `unspecified`      | 外部エラー  | 外部要因で描画不能であることのみを示します      | なし、または最小限の説明        | muted  |

ここでいう `danger` は、致命性や注意喚起を示す視覚トーンであり、`role="alert"` を意味しません。`muted` は、本文の読解を過度に中断しないための抑制されたトーンです。

長期的には、`data-missing` と `unspecified` は **欠落・保留系の外部状態** として抑制的に表示し、`build-failed`、`runtime-failed`、`upstream-invalid` は **失敗・契約違反系の外部状態** として danger トーンを用いる方がよいです。ただし、いずれも同一コンポーネントのエラーボックス骨格を保ち、分類ごとに全く別の UI パターンへ分岐させてはなりません（MUST NOT）。

### フォーカス表示

overflow する display 数式のみ `:focus-visible` によるアウトラインを持ちます。非 overflow の display 数式、および inline 数式はスクロールのためのフォーカス対象ではありません。

### 参照トークン

本コンポーネントは、主として次のトークンに依存します。

| 用途              | トークン                           |
| --------------- | ------------------------------ |
| 通常文字色           | `--fg-default`                 |
| 控えめ文字色          | `--fg-muted`                   |
| 危険境界線           | `--border-danger`              |
| 危険背景            | `--bg-danger-subtle`           |
| 危険文字色           | `--fg-danger`                  |
| 補助背景            | `--bg-fill-muted`              |
| フォーカス幅          | `--focus-ring-width`           |
| フォーカス色          | `--focus-ring-color`           |
| フォーカスオフセット      | `--focus-ring-offset`          |
| フォーカスアニメーション    | `--animation-focus`            |
| スクロールバー幅        | `--scrollbar-width`            |
| スクロールバー hover 色 | `--scrollbar-thumb-hover`      |
| 余白              | `--space-*`                    |
| 角丸              | `--radius-*`                   |
| 数式倍率            | `--text-math-scale`            |
| フェード幅           | `--space-4` または `--fade-width` |

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

### id / アンカー契約

公開アンカー対象はホスト要素の `id` のみです。利用者は `ui-math#...` をアンカーとして扱ってよく、内部スクロール領域の `id` には依存してはなりません。

内部 `id` ミラーが実装上存在しても、それは公開契約ではなく観測補助または内部 detail として扱います。

### 読み上げモード契約

本コンポーネントの読み上げ戦略は、`mathml` モードと `label` モードの 2 状態で定義します。

- `mathml` モード: 既定モードです。MathML を主要な読み上げ経路とします。
- `label` モード: 空白以外の `aria-label` を与えた場合に成立します。手動ラベルを主要な読み上げ経路とし、ランタイム MathML は公開しません。

現在の公開入力は `aria-label` のみですが、公開契約上は `aria-label` を単なる補助文字列ではなく、`label` モードへの切替入力として扱います。将来、明示的な読み上げモード入力を追加する場合でも、この 2 状態モデルとの後方互換を維持しなければなりません（MUST）。

slot を用いる場合、読み上げモードの正規化は slotted SSR の生成側責務です。`ui-math` は slot 側 DOM を自動補正せず、入力済みのモードをそのまま受け取ります。この方針により、runtime 経路と slot 経路の責務境界を明確に保ちます。

### エラー分類契約

本コンポーネントのエラー分類は、発生時点ではなく意味に基づいて定義します。現時点で公開契約として観測可能な上位分類は次の 2 つです。

- `external`: 上位レイヤ、ビルド工程、データ取得、または外部注入に由来するエラーです。既定では `role="alert"` を持ちません。
- `author-invalid`: 利用者が与えた `latex` が delimiter 禁止、構文不正、または KaTeX 解釈不能であることに由来するエラーです。`role="alert"` を持ちます。

`external` は次の予約済み下位分類を持ちます。

- `build-failed`
- `data-missing`
- `runtime-failed`
- `upstream-invalid`
- `unspecified`

現行の公開入力面では `error-message` のみが存在するため、下位分類を明示できない場合は `external/unspecified` を既定とします。将来 `error-kind`、`error-code`、または等価の明示入力を追加する場合は、この語彙と互換でなければなりません（MUST）。

`external` の下位分類は意味上の差分を持ちますが、UI 契約としては **共通のエラーボックス骨格を維持したまま、見出し・補助説明・補助情報・視覚トーンだけを差し替える** ものとします。下位分類の違いによって、全く別のコンポーネントへ分岐することは契約に含めません。

ソース開示可否はエラー分類契約に含めません。ソース開示は `show-error-source` による独立した opt-in 契約で制御します。

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

`latex`、`block`、`aria-label`、slot 内容、コンテナ幅の変化は、常に同一同期点で反映されるとは限りません。runtime 描画、overflow 判定、`data-scroll` 更新、`tabindex` 付与、MathML の `aria-hidden` 反映は、更新サイクル、レイアウト確定、`requestAnimationFrame`、または `ResizeObserver` 通知を経て安定します。

したがって、利用者およびテストは、要素更新直後の瞬間状態ではなく、**更新後に安定した状態** を前提に確認しなければなりません。`ui-math` は即時同期よりも、描画とレイアウトの整合を優先します。

### 公開メソッド非提供契約

`ui-math` は公開 imperative API を持ちません。`focus()`、`scrollToStart()`、`scrollToEnd()`、再計測トリガーなどの公開メソッドは提供しません。

overflow 数式へのフォーカスは内部スクロール領域が担いますが、ホスト要素に対する imperative 制御契約は持ちません。利用者はホスト経由で内部スクロール状態を直接制御できることを期待してはなりません。

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

`block` 切り替え、`latex` 更新、slot 内容更新、またはコンテナ幅変更の直後には、overflow 状態、`data-scroll`、`tabindex` が次フレームまで未確定であることがあります。この一時状態は契約違反ではありません。

### 11. 内部 DOM への依存禁止

`.math-display`、`.math-content`、`.math-error`、`data-scroll`、内部 `tabindex` は外部公開 API ではありません。利用者コードはこれらに依存してはなりません。

---

## Storybook 契約

各 Story は見本ではなく、**契約確認点** として扱います。将来変更時には、次の契約を維持します。

| Story                   | 固定する契約                                                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| `Default`               | `block + primary` の基本 display 数式が region として成立すること                                                             |
| `VariantStateMatrix`    | inline / block / primary / `aria-label` の組み合わせ責務が保たれること                                                        |
| `ErrorStates`           | `external` と `author-invalid` の role 差分、`external` 下位分類ごとのトーン差分、および `show-error-source` による opt-in 開示契約が保たれること |
| `BoundaryConditions`    | `error-message` 優先、slot の runtime 優先、空白 `aria-label` 無効化、inline で region 非付与が保たれること                            |
| `KeyboardInteraction`   | overflow 時のみフォーカス可能となり、スクロール状態が遷移すること                                                                          |
| `IdAnchorContract`      | host 要素の `id` を公開アンカーとして扱えること。内部 id ミラーは公開 API ではないこと                                                          |
| `DarkModeTokenContract` | KaTeX が `color: inherit` により暗色トークンへ追従すること                                                                      |
| `ForcedColorsContract`  | 強制色時のマスク無効化とシステムカラー追従定義が存在すること                                                                                 |

---

## 契約が不明瞭である箇所

本節は、本文契約へ昇格させなかった残余論点のみを記載します。入力優先順位、空入力 no-op、slot 正規形、`primary` のランドマーク限定解釈、ホスト `id` のみを公開アンカーとする方針、読み上げモード、意味分類に基づくエラー契約、slot 側の読み上げモード正規化を自動で行わない方針、`external` の予約済み下位分類、`external` 下位分類ごとの UI 差分方針、およびエラーソース開示の opt-in 方針は、本書の本文契約として採用済みです。

### 1. キーボード操作の保証範囲

overflow 時に `tabindex="0"` を付与することは、フォーカス可能性を保証しますが、Arrow キーや Home / End による操作まで保証しているわけではありません。「キーボード操作可能」という表現は、過剰に強く読まれ得ます。

長期的には、契約を **フォーカス可能なスクロール領域であること** に限定し、実際のスクロール入力はユーザーエージェント既定挙動に委ねると明示する方がよいです。独自キー操作を保証するなら、別途その仕様を追加する必要があります。

### 2. runtime と SSR の同値性

slot と runtime は同じ `ui-math` に収容されていますが、DOM 構造もアクセシビリティ責務も完全には一致しません。そのため、同じ数式であっても mode により微妙に振る舞いが変わり得ます。

長期的には、DOM 同値ではなく **意味契約の同値性** を定義する方がよいです。少なくとも次は mode をまたいで一致すべきです。

- アクセシブル名の決定規則
- MathML 公開 / 非公開規則
- inline / block の視覚的重み
- エラー時の退避方針

### 3. `latex` 入力文法の境界

`ui-math` がどこまで入力正規化を行い、どこから先を KaTeX の責務とするかが十分に固定されていません。delimiter 禁止と trim 以外の扱いが曖昧なままでは、将来の互換性判定が難しくなります。

長期的には、`latex` の文法境界を独立した契約として定義し、次を明記する方がよいです。

- `ui-math` は delimiter を許容しません
- `ui-math` は最小限の前処理のみ行います
- 構文解釈の主体は KaTeX です
- KaTeX オプションの変更は互換性影響を持ち得ます

### 4. スタイル拡張面

現行設計は CSS Custom Properties と継承色を主な拡張面としていますが、内部 class、Shadow DOM 構造、将来の `::part` 公開計画との関係が明文化されていません。

長期的には、**安定したスタイル拡張面は公開トークンのみ** と固定し、内部 class と Shadow DOM 構造は非公開 detail と明示する方がよいです。`::part` を公開する場合は、その時点で別途契約へ昇格させるべきです。

### 5. 反映完了の観測点

`updateComplete`、`requestAnimationFrame`、`ResizeObserver` をまたいで状態が安定する設計では、利用者がいつ状態を観測してよいかが曖昧になりがちです。

長期的には、次のいずれかを固定する方がよいです。

- `updateComplete` 後さらに 1 frame 待てば安定するとする
- 安定化完了を示す明示イベントを公開する

設計の明快さを優先するなら、後者の明示イベントの方が将来の内部実装変更に強いです。

### 6. ローカライズ方針

`数式（横スクロール可能）`、`数式ソースを表示`、エラーメッセージ接頭辞などの固定文言が、公開 UI 文言なのか内部既定値なのかが曖昧です。

長期的には、文言の責務位置を明文化する必要があります。Rouault を日本語固定とするならその旨を契約に含め、将来ローカライズを許容するなら、文言は上位レイヤまたは文言供給機構から注入する設計に寄せる方がよいです。

---

## 新規で追加を検討する価値がある機能

本節は、現行契約を前提としつつ、**長期的な設計のきれいさ、保守性、統合容易性の観点から追加を検討する価値がある機能** を整理するものです。本節に記載した事項は現行公開契約ではなく、採用する場合は実装、Storybook、契約書を同時に更新しなければなりません（MUST）。

### 最優先で検討する価値がある機能

#### 1. `speech-mode` と `label-text` の分離

現行契約では、`aria-label` が手動ラベル文字列であると同時に、読み上げモード切替入力も兼ねています。この設計は後方互換上は有効ですが、責務が過積載です。

長期的には、次のように入力を分離する価値があります。

- `speech-mode="mathml" | "label"`
- `label-text="..."`

これにより、読み上げ戦略そのものと、手動ラベル文字列の責務を切り分けられます。とくに slot / runtime 間の意味同値性を強めたい場合、この分離は有効です。現行の `aria-label` は後方互換入力として残しつつ、内部的に `speech-mode + label-text` へ正規化する設計が最も自然です。

#### 2. `error-kind` / `error-code` の明示入力

本書では `external` の下位分類を契約化していますが、現行入力面では `error-message` しかなく、分類を機械可読に指定できません。

そのため、次のような入力を追加する価値があります。

- `error-kind="build-failed | data-missing | runtime-failed | upstream-invalid | unspecified"`
- `error-code="..."`

これにより、表示分岐、ログ連携、テスト観点、上位レイヤとの責務境界をより明確にできます。とくに `external` の意味分類を UI と実装の双方で整合させるうえで有効です。

#### 3. 安定化完了イベント

現行契約では、overflow 判定、`data-scroll`、`tabindex`、フェード状態は更新サイクルや `ResizeObserver` を経て安定します。これは合理的ですが、利用者から見た観測点は弱いです。

そのため、次のような安定化完了イベントを追加する価値があります。

- `math-settled`
- `layout-settled`

このイベントは、runtime 描画、overflow 再計測、内部状態更新が完了した後に発火する契約とするのが望ましいです。公開 imperative API を増やすよりも、まず安定観測点を与える方が設計としてきれいです。

### 条件付きで検討する価値がある機能

#### 4. 数式番号と参照

Rouault が研究ノートや技術文書の長文読解を強く意識する場合、数式番号と参照機能は価値があります。ただし、これは `ui-math` 単体の責務として追加すべきではありません。

採用する場合は、少なくとも次の責務を分離して設計する必要があります。

- 数式表示
- 番号付与
- 参照解決
- 被参照時ハイライト

したがって、単なる display 数式の装飾機能ではなく、**式参照系の別契約** として導入するなら検討価値があります。

#### 5. コピー機能

エンジニアリング用途や研究用途では、数式ソースや MathML のコピー機能は有用です。たとえば次のような機能です。

- `copy-source`
- `copy-mathml`
- `copy-plain-text`

ただし、常時表示の UI にすると「没入して読む」体験を壊しやすいため、採用する場合は次の制約を設ける方がよいです。

- `block` 数式のみ対象とする
- hover / focus 時のみ露出する
- 既定では無効にし、明示 opt-in とする

#### 6. touch 環境向け overflow hint

現行契約ではフェードにより横スクロール可能性を示していますが、touch 環境ではそれだけでは伝わりにくい場合があります。

そのため、次のような抑制的ヒントを条件付きで検討できます。

- `overflow-hint="auto | always | never"`
- 初回のみの簡潔なヒント文言
- touch 環境限定の affordance

ただし、ヒント UI が数式そのものより前面に出てはなりません。常時表示や強い誘導は、本文読解の没入感を損なうため避ける方がよいです。

### 追加しない方がよい、または優先度が低い機能

#### 7. slot 側 DOM の自動補正

slotted MathML の `aria-hidden` 自動付け替え、label mode への自動変換、不完全 SSR 出力の自動修復などは、一見すると便利ですが、入力責務と表示責務を曖昧にします。

本コンポーネントの現在の設計方針では、slot は正規化済み入力を受け取るだけの器である方がきれいです。したがって、自動補正系機能は追加しない方がよいです。

#### 8. 下位分類ごとに全く異なるエラー UI

`external` の下位分類ごとに、骨格から異なる UI パターンへ分岐させるのは避ける方がよいです。本書で定義したとおり、差分は文言、補助情報、視覚トーンに限定し、エラーボックス骨格は共通のまま保つ方が、保守性と読書体験の一貫性が高くなります。

#### 9. 公開 imperative API の先行追加

`focus()`、`scrollToStart()`、`scrollToEnd()` のような公開 imperative API は、必要性が全くないわけではありませんが、現時点では優先度が高くありません。

まずは `math-settled` のような観測可能イベントや、入力契約の明確化を先行させる方がよいです。宣言的契約が十分に固まる前に imperative API を増やすと、責務が散りやすくなります。

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

現行実装は display 数式に `id` ミラーを持ちますが、式番号、ラベル、`eqref` 的参照、被参照時ハイライトなどは扱いません。アンカー可能性はあるものの、**参照体系としての契約は未定義** です。

### 4. ランタイム入力の正規化

現行実装は `latex.trim()` を行いますが、デリミタ除去、改行正規化、危険記法の細かな分類、エラーコード化は行いません。`$$` を含む場合も単純にエラー化します。

したがって、runtime 入力正規化は **最小限の前処理にとどまり、包括的な正規化契約には達していません**。

### 5. 空入力 no-op の未実装

本書では、slot も `latex` も `error-message` も与えられない場合、`ui-math` は no-op とし、数式ロールもエラー UI も描画しない契約を採用しています。しかし現行実装は、空入力であっても inline なら `.math-inline[role="math"]`、block なら `.math-content[role="math"]` を描画し得ます。

したがって、**空入力 no-op 契約は現行実装では未達成** です。

### 6. slot 正規形と受理境界の実行時強制

本書では、slot は SSR 数式専用入力であり、正規形を満たす入力だけを受理対象とします。しかし現行実装の slot 判定は、空白以外のテキストノードまたは任意要素ノードの存在に基づいています。

そのため、装飾 wrapper や正規形を満たさない任意要素であっても slot 優先が成立し得る状態が残っています。**slot 正規形と受理境界の契約は、現行実装では実行時に強制されていません。**

### 7. エラー分類の詳細化

現行実装の `author-invalid` エラーは、`$$` 混入、KaTeX `ParseError`、その他例外をメッセージ文字列としてまとめて扱います。`external` も本書では予約済み下位分類と UI 差分方針を定義しましたが、実装上はまだ構造化された下位分類を持ちません。機械可読な `error-kind`、エラーコード、ログ連携用フックはありません。

### 8. `external` 下位分類ごとの UI 差分

本書では、`external` の下位分類に応じて danger / muted の視覚トーンや補助情報の差分を持たせる契約を採用しました。しかし現行実装の `.math-error` は単一の danger 系スタイルに固定されており、`data-missing` や `unspecified` に対する抑制的トーン分岐は存在しません。

したがって、``** 下位分類ごとの UI 差分契約は現行実装では未達成** です。

### 9. エラーソース開示の opt-in 制御

本書では `show-error-source` による既定非開示・明示 opt-in 契約を採用しましたが、現行実装はまだその独立入力を持ちません。現行実装は入力ソースが存在する場合、エラー UI に `details` / `summary` を常時描画し得ます。

したがって、現行実装は契約上想定する情報露出制御に到達していません。

### 10. Storybook 契約の未追随

本書の契約は、`show-error-source` による既定非開示、host `id` を公開アンカーとする方針、`external` 下位分類ごとのトーン差分などを含むように更新されています。しかし現行 `math.stories.ts` はまだこれらに追随していません。

とくに次は未追随です。

- `ErrorStates` は runtime エラーで常に `details` / `summary` が表示されることを前提にしています。
- `ErrorStates` は `external` 下位分類ごとの UI 差分を検証していません。
- `IdAnchorContract` は内部 display コンテナへの `id` ミラーを直接検証しています。

したがって、**Storybook 契約は本文契約に対して未同期** です。

### 11. 公開メソッド

現行実装は公開メソッドを持ちません。overflow 数式へのフォーカスは内部コンテナが担いますが、ホスト経由で `focus()` などを提供する契約にはなっていません。

### 12. part / スタイル拡張面

現行実装は `::part(...)` を公開していません。外部テーマ調整は主に CSS Custom Properties と継承色に依存します。Shadow DOM 内部構造への詳細なスタイル拡張面は未公開です。

### 13. 本節の扱い

本節に記載した事項は、現行公開契約として利用者が依存してよいものではありません。これらを採用する場合は、実装、Storybook、契約書の 3 点を同時に更新し、未対応状態を残したまま公開契約へ昇格させません。

