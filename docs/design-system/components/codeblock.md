# Code Block

## 概要

本書は、`ui-code-block` の公開契約、状態モデル、アクセシビリティ、視覚契約、および長期的な移行方針を整理するものです。

`ui-code-block` は、単に `pre/code` を囲う装飾コンポーネントではありません。**コード本文の表示、文脈メタデータ、コピー操作、横スクロール時のアクセシビリティ、Shiki 由来の行構造との整合**を、1つの公開契約として扱います。

また、本コンポーネントは Shadow DOM 内だけで完結しません。slotted な `pre/code` に対して `part`、`aria-*`、行ラッパー、スクロール関連属性を付与し、さらに document head へスタイルを注入して表示を成立させます。したがって、契約は**ホスト属性だけでなく、スロット入力構造と document 全体への副作用**まで含めて定義する必要があります。

Rouault における code block は、読書を中断させるノイズであってはなりません。一方で、コード例としての意味状態、コピー導線、長い行の可読性、印刷時や高コントラスト時の成立性は維持する必要があります。したがって、本コンポーネントの契約は、**読むための静けさ**と、**参照・比較・複写のための操作性**を両立する方向で定義します。

---

## 1. 適用範囲

本書は、`ui-code-block` の次の事項を対象とします。

- 公開契約
- 互換 API 契約
- スロット入力契約
- 状態モデル
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 関連契約
- 境界条件
- Storybook 契約
- 契約が不明瞭な箇所と長期的な明確化方針
- 将来の正式契約として採用する追加機能
- 現行実装で未対応または注意が必要な事項

一方で、本書は次の事項を扱いません。

- シンタックスハイライト自体の生成
- Shiki テーマ定義そのもの
- コピー完了トーストや通知文言の上位設計
- code group 全体のタブ切替制御
- Markdown パーサが `ui-code-block` をどのように出力するかという上位変換規則
- コード例の正誤判定ロジックそのもの
- 実行環境の起動やサンドボックス制御

これらは上位レイヤまたは別コンポーネントの責務です。

---

## 2. 公開契約

`ui-code-block` は、`filename`、`lang`、`label`、`intent`、`showLineNumbers`、`initialCode` に加え、`**、**`**、**`**、**` を主要な公開入力として扱います。既存利用との互換のために、`headless` と `embedded` も受理します。さらに、既定スロットからコード本体を受け取り、公開メソッド `getCodeContent()` を提供します。

本コンポーネントのコード本文は host property ではなく、\*\*既定スロットに入る \*\*\`\` を正規入力として扱います。したがって、利用者は `ui-code-block` を empty shell として使うのではなく、**1つの論理コードブロックを slotted content として与える**ことを前提にしなければなりません（MUST）。

`intent` の既定値は `neutral` です。列挙外の値は `neutral` にフォールバックします。`showLineNumbers` と `wrap` の既定値は `false` です。`copyMode` の既定値は `auto`、`layout` の既定値は `breakout` です。`highlightLines`、`filename`、`lang`、`label`、`initialCode` の既定値は空文字です。互換入力である `headless` と `embedded` の既定値は `false` ですが、新規利用では主要状態として扱いません。

### 2.1 入力契約

| 名前              | 種別                                       | 必須   | 内容                   | 契約                                                                                                           |
| ----------------- | ------------------------------------------ | ------ | ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| `filename`        | property / attribute                       | いいえ | ヘッダー表示名         | キャプション表示、コピー文言、文脈名の決定に使用します                                                         |
| `lang`            | property / attribute                       | いいえ | 言語識別子             | `data-lang` の生成、言語ラベル生成、A11y 文言生成に使用します                                                  |
| `label`           | property / attribute                       | いいえ | 外部連携用ラベル       | 本コンポーネント単体では表示に使用しません                                                                     |
| `intent`          | property / attribute                       | いいえ | コード例の意味状態     | `neutral` / `valid` / `invalid`                                                                                |
| `showLineNumbers` | property / attribute (`show-line-numbers`) | いいえ | 行番号表示             | true の場合、行番号表示用の行ラッパー整備を試みます                                                            |
| `copyMode`        | property / attribute (`copy-mode`)         | いいえ | コピー操作の表示モード | `auto` / `always` / `hidden`                                                                                   |
| `wrap`            | property / attribute                       | いいえ | 折り返しモード         | true の場合、横スクロール優先ではなく折り返しを優先します                                                      |
| `highlightLines`  | property / attribute (`highlight-lines`)   | いいえ | 強調する論理行範囲     | `1,3-5` のような範囲文字列を受理します                                                                         |
| `layout`          | property / attribute                       | いいえ | レイアウトモード       | `breakout` / `inline`                                                                                          |
| `headless`        | property / attribute                       | いいえ | 互換 shorthand         | 既存利用との互換のために、ヘッダー抑止と外装除去をまとめて要求します。新規利用では主要入力として推奨しません   |
| `embedded`        | property / attribute                       | いいえ | 互換 shorthand         | 既存利用との互換のために、`layout="inline"` 相当の埋め込み表示を要求します。新規利用では `layout` を優先します |
| `initialCode`     | property / attribute (`initial-code`)      | いいえ | コピー初期値           | slot 未同期時のコピー値フォールバックに使用します                                                              |

### 2.2 追加属性契約

`ui-code-block` は typed property に加えて、次の属性を補助入力として受理します。

| 名前               | 位置                      | 内容                 | 契約                                       |
| ------------------ | ------------------------- | -------------------- | ------------------------------------------ |
| `data-wrap="true"` | host または slotted `pre` | 旧来の折り返しモード | `wrap=true` と同義の互換入力として扱います |
| `data-raw`         | slotted `pre`             | 生コード             | コピー値の一次情報として優先使用します     |

`data-wrap` は将来の正式契約では `wrap` に統合します。したがって、`data-wrap` は新規利用向けの正式 API ではなく、**互換入力**として扱います。

### 2.3 属性反映契約

| property          | attribute           | reflect | 備考                                        |
| ----------------- | ------------------- | ------- | ------------------------------------------- |
| `filename`        | `filename`          | あり    | キャプション表示名です                      |
| `lang`            | `lang`              | あり    | 正規化後の `data-lang` も別途付与します     |
| `label`           | `label`             | あり    | 外部連携用です                              |
| `intent`          | `intent`            | あり    | 列挙外値は `neutral` にフォールバックします |
| `showLineNumbers` | `show-line-numbers` | あり    | boolean attribute として扱います            |
| `copyMode`        | `copy-mode`         | あり    | `auto` / `always` / `hidden` を受理します   |
| `wrap`            | `wrap`              | あり    | boolean attribute として扱います            |
| `highlightLines`  | `highlight-lines`   | あり    | 行範囲文字列です                            |
| `layout`          | `layout`            | あり    | `breakout` / `inline` を受理します          |
| `headless`        | `headless`          | あり    | boolean attribute として扱う互換入力です    |
| `embedded`        | `embedded`          | あり    | boolean attribute として扱う互換入力です    |
| `initialCode`     | `initial-code`      | なし    | コピー初期値です                            |

### 2.4 派生属性契約

`lang` は内部で trim と lower-case 正規化を行い、空文字でなければ host に `data-lang` を付与します。`data-lang` の値は `lang` の正規化結果です。

また、slotted `pre` およびその内側の `code` には、それぞれ `part="pre"`、`part="code"` を付与します。これらは Shadow DOM 内部要素ではなく、**slotted content に対する part exposure** です。

### 2.5 言語ラベル契約

`lang` は次の対応表に基づいて人間向け言語ラベルへ変換します。

| 値               | 表示ラベル   |
| ---------------- | ------------ |
| `ts`, `tsx`      | `TypeScript` |
| `js`, `jsx`      | `JavaScript` |
| `css`            | `CSS`        |
| `html`           | `HTML`       |
| `json`           | `JSON`       |
| `md`, `markdown` | `Markdown`   |
| `sh`             | `Shell`      |
| `bash`           | `Bash`       |
| `yml`, `yaml`    | `YAML`       |

対応表に存在しない値は、trim 後の文字列の先頭のみを大文字化して表示します。`lang` が空の場合、言語ラベルは空とします。

### 2.6 列挙外値・無効値の扱い

`intent` は `neutral` / `valid` / `invalid` のみを正規値とし、列挙外値は `neutral` にフォールバックします。

`copyMode` は `auto` / `always` / `hidden` のみを正規値とし、列挙外値は `auto` にフォールバックします。

`layout` は `breakout` / `inline` のみを正規値とし、列挙外値は `breakout` にフォールバックします。

`highlightLines` は `1,3-5` のような論理行範囲文字列のみを正規値とします。解釈できない断片は無視し、解釈可能な範囲のみを採用します。行番号は 1 始まりです。

`lang`、`filename`、`label` は自由文字列を受理します。ただし、`filename` はキャプション表示とコピー文言に直結するため、利用者は人間可読な短い値を与えるべきです（SHOULD）。

### 2.7 `label` の上位連携契約

`label` は `ui-code-block` 単体の表示やアクセシブル名を決める入力ではありません。現行契約において `label` は、**code group、比較表示、外部メタデータ整列などの上位レイヤが参照し得る補助識別子**として扱います。

したがって、次を契約します。

- `label` は本コンポーネント単体では視覚表示に使用しません。
- `label` は `aria-description`、scroll region の `aria-label`、copy button の `label` を決定しません。
- `label` の値が空でも `ui-code-block` 単体契約は成立します。
- `label` の意味解釈は上位コンポーネントの責務であり、`ui-code-block` 自身は意味づけを持ちません。

したがって、利用側は `label` を `filename` の代替や表示ラベルとして流用してはなりません。`label` は**単体表示契約の入力ではなく、外部連携契約の入力**です。

### 2.8 責務範囲

責務範囲には、コード本文周辺のフレーミング、文脈メタデータ表示、コピー値生成、コピー操作の表示制御、横スクロール時のフォーカス可能化、slotted `pre/code` への属性付与、行番号表示補助、宣言的な行強調、折り返しモード切替、レイアウト切替、Shiki 行クラスとの整合、document style 注入を含みます。

一方で、シンタックスハイライト生成、コード比較ロジック、グルーピング制御、折りたたみ、実行環境の起動は責務に含めません。

---

## 3. 互換 API 契約

`headless` と `embedded` は公開面から完全には除去しませんが、**将来の主要 API ではなく互換 API**として扱います。

- 新規の表示制御は `copyMode`、`layout`、将来的には `showHeader` / `showFrame` / `showCopyAction` のような直交状態へ寄せます。
- `embedded` は `layout="inline"` への互換入力です。
- `headless` はヘッダー抑止と外装除去を一括で指示する旧来 shorthand です。
- 新規の契約記述では、`headless` / `embedded` を中心語にせず、`copyMode` / `layout` を中心語にします。

したがって、`headless` / `embedded` は**残すが推奨しない入力**として扱います。

### 3.1 `headless` 分解の中間移行方針

`headless` は将来的に `showHeader` / `showFrame` / `showCopyAction` のような**直交した表示状態**へ分解する方が望ましいです。ただし、現行利用を一挙に破壊しないためには、中間段階の移行方針を先に固定した方がよいです。

中間移行では、次の順序を採ります。

1. **新規契約の主語を \*\***\`\`\***\* から外します。** 契約書、Storybook、新規実装では、`headless` を中心に説明しません。
2. **新しい直交 property を追加します。** 第一段階では少なくとも `showHeader`、`showFrame`、`showCopyAction` を導入し、表示責務を分離します。
3. \`\`\*\* は互換 shorthand として再定義します。\*\* たとえば `headless=true` は「`showHeader=false` かつ `showFrame=false` を要求する shorthand」として扱います。`showCopyAction` については、将来的に独立制御を優先し、`headless` から暗黙に決定しない方がよいです。
4. **優先順位を固定します。** 新しい直交 property と `headless` が同時指定された場合は、`headless` より `showHeader` / `showFrame` / `showCopyAction` を優先します。
5. **最終段階で \*\***\`\`\***\* を非推奨化します。** 契約書上では互換入力として残しつつ、新規利用では使用しない方針を明示します。

この中間移行方針により、現行 shorthand をいきなり除去せずに、**意味状態と表示責務を直交した API へ整理する導線**を確保できます。

### 3.2 分解後の責務イメージ

将来的な責務分解は、少なくとも次のように整理する方がよいです。

| property         | 担当する責務                       | 備考                                                           |
| ---------------- | ---------------------------------- | -------------------------------------------------------------- |
| `showHeader`     | キャプション領域全体の表示有無     | `filename` / `intent` / copy affordance の配置土台を制御します |
| `showFrame`      | 枠線・背景・角丸などの外装         | レイアウトとは分離して扱います                                 |
| `showCopyAction` | copy affordance の存在または露出   | `copyMode` と組み合わせて扱います                              |
| `copyMode`       | copy affordance の露出量           | `auto` / `always` / `hidden`                                   |
| `layout`         | `breakout` / `inline` のレイアウト | 幅とマージンの責務を持ちます                                   |

このとき、`showCopyAction=false` であれば `copyMode` は無効化され、`showCopyAction=true` のときのみ `copyMode` が露出量を決める、という二段階構造にすると契約が明確になります。

### 3.3 現行 shorthand との対応方針

中間移行段階では、現行 shorthand と新しい直交 property の関係を次のように扱う方がよいです。

| 現行入力         | 中間段階での解釈                                                   |
| ---------------- | ------------------------------------------------------------------ |
| `headless=true`  | `showHeader=false` かつ `showFrame=false` を要求する互換 shorthand |
| `headless=false` | 直交 property を指定しない限り既定表示に従う互換 shorthand         |
| `embedded=true`  | `layout="inline"` を要求する互換 shorthand                         |

ここでは、`** を **`\*\* の shorthand にしない\*\*ことが重要です。copy affordance の存在は、ヘッダーや外装とは別責務として独立させた方が、`copyMode` と整合しやすくなります。

### 3.4 契約記述上の原則

中間移行期間の契約記述は、次の原則に従う方がよいです。

- 新規状態の説明は `showHeader` / `showFrame` / `showCopyAction` / `copyMode` / `layout` を主語にします。
- `headless` / `embedded` は、対応表または互換注記としてのみ記載します。
- Storybook でも、新規 Story は直交 property を中心に追加し、`headless` / `embedded` は互換確認 Story に寄せます。

これにより、文書、実装、Storybook の中心語を段階的に切り替えられます。

---

## 4. スロット入力契約

`ui-code-block` は named slot を持たず、既定スロットのみを持ちます。

| 名前         | 種別 | 位置づけ | 内容                                                |
| ------------ | ---- | -------- | --------------------------------------------------- |
| 既定スロット | slot | 正規入力 | `pre` または `pre` を内包する単一要素を受け取ります |

正規入力は `pre` を1つ含む構造です。`slot.assignedElements({ flatten: true })` の走査では、\*\*最初に見つかった \*\*\`\` を対象とします。複数の `pre` を同時に与える構成は公開契約に含めません。利用者は1コンポーネントにつき1つの論理コードブロックを入力しなければなりません（MUST）。

### 4.1 入力失敗時契約

正規入力でない場合、本コンポーネントは原則として**例外送出ではなく縮退動作**を行います。したがって、入力が崩れていても要素自体の接続や描画は継続し得ますが、コードブロックとしての主要契約は部分的に失効します。

次を明示的に契約します。

- `pre` を解決できない場合、`getCodeContent()` は空文字または `initialCode` に基づく縮退値を返し得ます。
- `pre` を解決できない場合、copy 値同期、行番号整備、overflow 時の scroll region 化は保証しません。
- 複数の `pre` が存在する場合は、最初に見つかった1つのみを対象とし、残りの扱いは未定義です。
- text node の直置き、`code` 単独入力、複数の論理コードブロックを1インスタンスへ混在させる構成は正規入力に含めません。
- 契約違反入力に対して console 警告や例外送出を行うことは、現行契約には含めません。

したがって、利用側は「崩れた入力でも最低限は見える」ことに依存してはなりません。**公開契約として成立するのは、**\`\`\*\* を1つ含む正規入力のみ\*\*です。

### 4.2 公開メソッド

`ui-code-block` は次の公開メソッドを持ちます。

| 名前               | 種別   | 契約                                         |
| ------------------ | ------ | -------------------------------------------- |
| `getCodeContent()` | method | コピー用に正規化されたコード文字列を返します |

`getCodeContent()` は次の順序でコード本文を解決します。

1. slotted `pre` の `data-raw` 属性があれば、それを優先します。
2. そうでなければ `code` または `pre` を clone し、行番号要素を除去して `textContent` を返します。
3. 改行は `\n` に正規化します。

この戻り値は、表示用 DOM ではなく**コピー用の純粋なコード本文**として扱います。

---

## 5. 状態モデル

`ui-code-block` の主要状態は、単なる見た目の差分ではなく、**メタデータの有無、意味状態、行番号の要求、copy affordance の露出、レイアウト、横スクロール要否**によって読み分けます。互換入力である `headless` / `embedded` は、主要状態ではなく補助的に解釈します。

### 5.1 基本状態

最小状態は、`intent="neutral"`、`showLineNumbers=false`、`copyMode="auto"`、`layout="breakout"`、`filename=''`、`lang=''` の状態です。この場合でもコピー導線は維持されます。`headless` / `embedded` は、この最小状態の定義には含めません。

### 5.2 意味状態

`intent` はコード例の意味状態を表します。

| `intent` 値 | 意味     | 表示                                        |
| ----------- | -------- | ------------------------------------------- |
| `neutral`   | 中立     | intent ラベルを表示しません                 |
| `valid`     | 正しい例 | `正しい例` ラベルと check icon を表示します |
| `invalid`   | 誤り例   | `誤り例` ラベルと alert icon を表示します   |

`intent` はコードの意味づけであり、構文検証結果そのものではありません。意味の責務は利用側にあります。

### 5.3 キャプション状態

`filename` または `intent != neutral` のいずれかが存在する場合、通常キャプションを表示します。両方とも存在しない場合、キャプションは overlay モードへ移行し、**コピー導線のみを右上に重ねて表示**します。

したがって、キャプションは「表示する / しない」の二値ではなく、**通常表示 / overlay 表示 / CSS による完全非表示**の3状態を持ちます。

### 5.4 ヘッダー表示状態

既定ではヘッダーは表示されます。新規契約では、copy affordance の露出は `copyMode` を中心に制御し、ヘッダー全体の表示は将来的に `showHeader` のような直交状態へ分解する方針です。

現行互換入力として `headless=true` の場合、内部変数 `--_ui-code-block-header-display: none` によりヘッダーを初期抑止します。ただし、公開 CSS 変数 `--ui-code-block-header-display` が与えられた場合はそちらを優先します。

したがって、現行の優先順位は次のとおりです。

1. `--ui-code-block-header-display`
2. `headless`
3. 既定値 `block`

ただし、これは**互換 API を含む現行順位**です。新規契約では `headless` を主要な表示制御として推奨しません。

### 5.5 行番号状態

`showLineNumbers=true` の場合、行番号表示用の整備を行います。

- 既に `.line` 要素が存在する場合は、それを利用します。
- `.line` がなく、かつ対象コンテナに子要素が存在しないプレーンテキスト入力の場合のみ、各行を `.line` でラップします。
- 子要素を含むが `.line` を持たない構造は、Shiki 等のトークン保持を優先し、破壊的再構築を行いません。

したがって、`showLineNumbers=true` は「常に行番号を保証する」契約ではなく、**行番号表示に必要な構造があるか、または安全に構造化できる場合に成立する**契約です。

### 5.6 行強調状態

`highlightLines` が空でない場合、本コンポーネントは指定された**論理行**を強調対象として扱います。行範囲は `1,3-5` のような1始まりの表記で与えます。

- 既存の `.line.highlighted` がある場合、宣言的指定と同等の強調表現として扱います。
- `highlightLines` が与えられた場合、可能であれば対象行へ強調状態を適用します。
- 行構造を安全に解決できない場合、強調は縮退し得ます。

したがって、行強調は視覚装飾ではなく、**読むべき箇所を静かに示す正式契約**です。

### 5.7 互換 shorthand 状態

`embedded=true` は互換 shorthand として `layout="inline"` 相当の埋め込み表示を要求します。現行実装では、さらに `headless` でない場合に root の border と radius を外します。

`headless=true` は互換 shorthand としてヘッダー抑止と外装除去をまとめて要求します。

ただし、これらは主要状態ではありません。新規契約では、**レイアウトは **``**、将来的なヘッダー / フレーム制御は直交 property** で表す方がよいです。

### 5.8 横スクロール状態

slotted `pre` が横方向に overflow する場合のみ、`pre` に `tabindex="0"`、`role="region"`、`aria-label` を付与します。overflow しない場合はこれらを付与しません。

したがって、スクロール領域としてのアクセシビリティは常時ではなく、**必要時のみ起動する条件付き状態**です。

### 5.9 折り返し状態

`wrap=true` の場合、本コンポーネントは横スクロール優先ではなく折り返し表示を優先します。`wrap=false` の場合は既定どおり横スクロールを優先します。

したがって、折り返しは例外的な補助状態ではなく、**明示的に選択可能な正式表示状態**です。

### 5.10 レイアウト状態

`layout="breakout"` の場合、本コンポーネントは本文幅よりやや広い breakout 表示を採ります。`layout="inline"` の場合は親幅内に収めます。

`layout` は新規契約における**主たるレイアウト入力**です。`embedded=true` は互換入力として `layout="inline"` 相当として扱います。

したがって、レイアウトを記述する場合は `embedded` ではなく、**常に \*\***\`\`\***\* を優先して記述する**方がよいです。

### 5.11 コピー値状態

コピー値は `_copyValue` として保持され、通常は `getCodeContent()` の結果に同期します。slot 未同期時や `pre` 未解決時には `initialCode` がフォールバック値として使われます。

`initialCode` は表示コードを決める状態ではなく、**コピー値の初期安全網**です。

---

## 6. DOM / Accessibility

ルートは `:host` です。Shadow DOM 内部に `figure.root`、`figcaption.caption`、`ui-copy-button`、`slot` を持ちます。コード本文の `pre/code` は Shadow DOM 内には存在せず、slotted content として入ります。

```text
<ui-code-block>
  #shadow-root
    <figure class="root" aria-description="...">
      <figcaption class="caption">
        <div class="caption-layout">
          <span class="caption-main">
            <span class="filename">...</span>
            [span.intent]
          </span>
          <span class="copy-button-shell">
            <ui-copy-button></ui-copy-button>
          </span>
        </div>
      </figcaption>
      <slot></slot>
    </figure>
  [light DOM]
    <pre part="pre" aria-description="...">
      <code part="code">...</code>
    </pre>
</ui-code-block>
```

### 6.1 Accessibility 契約

アクセシビリティ上の重要点は次のとおりです。

- ルート `figure.root` はコードブロック全体の文脈記述として `aria-description` を持ちます。
- slotted `pre` にも同じ `aria-description` を付与します。
- 横スクロールが必要な場合のみ、`pre` は `tabindex="0"`、`role="region"`、`aria-label` を持ちます。
- `aria-label` は `filename` または言語ラベルを用いた文脈名から生成します。
- copy button の `label` も同じ文脈名に基づいて生成します。
- `filename` が省略記号で切れる場合のみ `title` 属性を付与し、冗長な tooltip を避けます。

### 6.2 文脈名契約

文脈名は次の優先順位で決定します。

1. `filename`
2. 言語ラベル
3. `コード`

この文脈名は、copy button のラベルおよびスクロール領域の `aria-label` に使用します。

### 6.3 説明文契約

`aria-description` は次の規則で決定します。

- `intent=neutral` かつ言語ラベルあり: `TypeScript のコード` のような形式
- `intent=neutral` かつ言語ラベルなし: `コード`
- `intent=valid` かつ言語ラベルあり: `TypeScript の正しいコード例`
- `intent=invalid` かつ言語ラベルあり: `TypeScript の誤りコード例`
- 言語ラベルなしの場合: `正しいコード例` / `誤りコード例`

### 6.4 公開 part 契約

`ui-code-block` は Shadow DOM 内部要素を `::part()` で広く公開しません。公開している part は slotted content 側の次の2点です。

| part 名 | 対象           | 役割                       |
| ------- | -------------- | -------------------------- |
| `pre`   | slotted `pre`  | スクロール領域・コード容器 |
| `code`  | slotted `code` | コード本文                 |

Shadow DOM 内部の `.root`、`.caption`、`.intent`、`.copy-button-shell` などの class 名は公開契約に含めません。利用者は内部 class 名に依存してはなりません（MUST NOT）。

---

## 7. Visual Contract

`ui-code-block` の視覚契約は、コードを本文から切り離しつつ、読書の流れを壊さないことにあります。強い装飾で目を奪うのではなく、**枠、背景、行間、キャプション、copy affordance** の秩序によって「参照可能な別層」であることを示します。

### 7.1 レイアウト

host は `display: block` です。`layout="breakout"` の場合、親コンテンツ幅よりわずかに広い breakout 表示を行います。

- 既定幅: `calc(100% + var(--space-8))`
- 既定左右マージン: `var(--space-n4)`
- 768px 以上: `calc(100% + var(--space-16))`、`var(--space-n8)`

`layout="inline"` の場合は、これを無効化して親幅内に収めます。`embedded=true` は互換的に `layout="inline"` と同等に扱います。

### 7.2 外装

通常状態では `.root` に境界線、背景、角丸を適用します。新規契約では、レイアウトは `layout` を中心に読み、外装制御は将来的に `frame` のような直交状態へ分離する方針です。

現行互換入力として `headless=true` の場合は border、background、radius を外し、`overflow: visible` に切り替えます。`embedded=true` かつ `headless=false` の場合、root は border と radius を外します。

したがって、`headless` / `embedded` による外装差分は**互換挙動としては維持するが、新規契約の中心には置かない**方がよいです。

### 7.3 キャプション

キャプションは `filename`、`intent`、copy button を1行に収めます。`filename` は必要時に省略記号を許可し、`intent` は控えめな色と小さな icon で表します。

メタデータがない場合、キャプションは absolute overlay 化し、caption-main を非表示にして copy button のみを右上に配置します。

### 7.4 copy affordance

copy button の表示は `copyMode` に従います。

- `auto`: 通常時は半透明で、hover または focus-within 時に不透明化します。
- `always`: 常時可視状態を維持します。
- `hidden`: copy affordance を視覚的に表示しません。

`touch` の coarse pointer 環境では、`auto` の場合でも常時やや高い不透明度を持ちます。

これは、マウス環境では視覚ノイズを抑え、タッチ環境では discoverability を補うためです。

### 7.5 行表示

slotted `pre` は `white-space: pre`、`overflow-x: auto`、`overflow-y: hidden` を基本とします。`showLineNumbers=true` の場合、`.line::before` による擬似要素で行番号を表示します。

ハイライト行と diff 行は `.line.highlighted`、`.line.diff.add`、`.line.diff.remove` で背景差分を表します。`highlightLines` が与えられた場合も、同じく論理行に対する強調表現として扱います。

### 7.6 折り返し表示

通常のコード表示は横スクロールを優先します。`wrap=true` の場合のみ、`pre-wrap` に切り替えて折り返しを許可します。`data-wrap="true"` は互換入力として同義に扱います。

したがって、折り返しは既定動作ではなく、**利用側が明示的に選択する正式表示モード**です。

### 7.7 フォーカス表示

横スクロール時にフォーカス可能化された `pre` は、`outline` と `outline-offset` によってフォーカスリングを表示します。これは `box-shadow` ベースの装飾ではなく、明示的な focus ring として扱います。

### 7.8 参照トークン

本コンポーネントは、主として次のトークンに依存します。

| 用途             | トークン                                                                               |
| ---------------- | -------------------------------------------------------------------------------------- |
| 背景             | `--bg-default`                                                                         |
| 境界線           | `--border-style-subtle`                                                                |
| 前景             | `--fg-default`                                                                         |
| 補助文字色       | `--fg-muted`, `--fg-subtle`                                                            |
| ハイライト背景   | `--bg-highlight-subtle`                                                                |
| 成功色           | `--success`                                                                            |
| 危険色           | `--danger`                                                                             |
| 角丸             | `--radius-sm`, `--radius-md`                                                           |
| 余白             | `--space-*`                                                                            |
| フォント         | `--font-mono`, `--text-sm`, `--text-xs`                                                |
| 行高             | `--line-height-none`                                                                   |
| アイコンサイズ   | `--icon-sm`                                                                            |
| コントロール高さ | `--control-height-sm`                                                                  |
| フォーカスリング | `--focus-ring-width`, `--focus-ring-color`, `--focus-ring-offset`, `--animation-focus` |
| 遷移時間         | `--duration-normal`, `--duration-instant`                                              |
| イージング       | `--ease-out`                                                                           |
| タッチ時不透明度 | `--opacity-link-touch`                                                                 |

---

## 8. 環境別の振る舞い

### 8.1 Dark Mode

Shiki 出力を含む `pre.shiki` に対し、dark 系 CSS 変数 `--shiki-dark-bg`、`--shiki-dark` を用いて背景色とトークン色を上書きします。`prefers-color-scheme: dark` に加え、`:root[data-theme='dark']` にも対応します。

### 8.2 Forced Colors

`forced-colors: active` 環境では、コメントに italic を付与して色以外の手段でもコメント性を示します。また、copy button shell に境界線を追加します。

### 8.3 Print

印刷時は host の breakout を解除して幅を `100%` に戻します。root は transparent 背景と黒境界線に寄せ、copy button は非表示にします。slotted `pre` は `pre-wrap` と 9pt 相当の文字サイズへ切り替えます。

したがって、印刷時もコード本文は残しますが、**操作 affordance は除去する**という契約です。

---

## 9. 関連契約

### 9.1 document style 注入契約

`ui-code-block` は `connectedCallback()` 時に document head へ `style#ui-code-block-document-styles` を1回だけ注入します。複数インスタンスが存在しても、同一 ID の style が既にあれば再注入しません。

この style には、slotted `pre/code`、Shiki dark 適応、行番号、forced-colors、print、wrap 表示が定義されます。したがって、本コンポーネントは**Shadow DOM 外の document CSS に依存する公開副作用**を持ちます。

### 9.2 コピー契約

copy button の `value` は `getCodeContent()` の結果を基準に決まります。`data-raw` があればそれを最優先し、なければ DOM から純粋なコード文字列を抽出します。行番号要素は除去します。

利用者は、表示用の行番号や装飾ノードがコピー内容に混入しないことを前提に扱ってよいです。

### 9.3 コピー表示モード契約

`copyMode` は copy affordance の視覚表示を決定します。

- `auto`: 文脈に応じて露出量を制御します。
- `always`: 常時表示します。
- `hidden`: 視覚表示を行いません。

`copyMode="hidden"` であっても、コンポーネント内部にコピー値が存在し得ること自体を否定するものではありません。`copyMode` は**公開 UI の露出契約**です。

### 9.4 コピー同期時点契約

コピー値は常時同期ではなく、**更新サイクルと slot 同期処理を経た後に整合する値**として扱います。したがって、外部コードが `filename`、`lang`、`intent`、`initialCode`、または slotted `pre/code` を変更した直後には、一時的に旧値が観測される可能性があります。

公開契約としては、少なくとも次を満たします。

- Lit の更新完了後、および slot change 処理完了後には、copy button の `value` と `getCodeContent()` は同一のコピーソースに整合します。
- `data-raw` が存在する場合、同期後の copy 値は表示 DOM ではなく `data-raw` を優先します。
- `initialCode` は slot 未解決時のフォールバックであり、slot 解決後の最終ソースを恒久的に固定するものではありません。
- 外部コードは、変更直後の中間状態を前提に copy 値を読み取ってはなりません。

したがって、copy 値の観測点は「変更直後」ではなく、**更新完了後の安定状態**に置かなければなりません。

### 9.5 スロット同期契約

slot change のたびに次を行います。

- `pre` / `code` への part 付与
- `aria-description` の同期
- 必要時の行ラッパー整備
- 行強調状態の再解決
- 横スクロール状態の再計算
- コピー値の再計算

また、対象 `pre` には `ResizeObserver` を設定し、幅変化に応じて横スクロール状態を再計算します。

### 9.6 Light DOM 変異契約

`ui-code-block` は slotted content を読み取るだけではなく、**light DOM 上の \*\***\`\`\***\* に対して属性付与と限定的な構造整備を行います**。したがって、本コンポーネントは light DOM に対して完全非破壊ではありません。

公開契約としては次を満たします。

- `pre` には `part="pre"`、必要に応じて `aria-description`、`tabindex`、`role`、`aria-label` を付与し得ます。
- `code` には `part="code"` を付与し得ます。
- `showLineNumbers=true` かつ安全に整備可能な場合のみ、プレーンテキスト入力を `.line` 単位へ構造化し得ます。
- 既存のトークン構造や `.line` 構造を持つ markup に対しては、それを優先し、破壊的再構築を行いません。
- コード本文の意味内容を書き換える正規化は行いません。変更対象は、表示、操作、アクセシビリティに関わる属性および補助構造に限ります。

したがって、利用側は「slot に渡した DOM が入力時のまま一切変化しない」ことを前提にしてはなりません。一方で、**コードの意味内容そのものは変えない**ことを前提に扱ってよいです。

### 9.7 スタイル拡張契約

利用者は主として CSS Custom Properties により拡張します。とくに次の変数は公開面として重要です。

- `--ui-code-block-breakout-width`
- `--ui-code-block-breakout-margin`
- `--ui-code-block-header-display`
- `--ui-code-block-padding`
- `--ui-code-block-radius-top`
- `--ui-code-block-radius-bottom`

内部 class 名への直接依存は公開契約に含めません。

### 9.8 公開スタイル面の境界契約

`ui-code-block` は内部 Shadow DOM class 名を公開しませんが、表示成立のために**light DOM 側の特定構造と属性**を事実上理解します。どこまでを公開面として固定するかを次のとおり明示します。

公開面として扱うものは次のとおりです。

- slotted `pre` と `code`
- `part="pre"` と `part="code"`
- `wrap` および互換入力としての `data-wrap="true"`
- `data-raw`
- 行単位構造としての `.line`
- 差分・強調を表す `.line.highlighted`、`.line.diff.add`、`.line.diff.remove`
- 宣言的強調入力としての `highlight-lines`
- レイアウト入力としての `layout`
- Shiki 出力に由来する `pre.shiki`

一方で、次は公開契約に含めません。

- Shadow DOM 内部の class 名
- caption 内部の要素順序や wrapper の細部
- Storybook 検証用に一時参照している内部 selector

したがって、利用側は `.line` や `data-wrap` のような**表示入力として明示した面**には依存できますが、Shadow DOM 内部の構造詳細には依存してはなりません。

### 9.9 互換 shorthand 契約

`headless` と `embedded` は、既存利用を壊さないために維持する互換 shorthand です。

- `embedded` は `layout` より優先される主状態ではなく、`layout` へ寄せるための互換入力です。
- `headless` は header を消すための旧来 shorthand ですが、`--ui-code-block-header-display` により上書きできます。
- したがって、利用者は `headless=true` を与えたから常に copy button が非表示になると断定してはなりません。**親文脈による表示再有効化が可能**です。
- 新規の契約記述や新規実装では、`headless` / `embedded` を中心に設計しない方がよいです。

長期的には、`headless` / `embedded` は互換入力に留め、主要状態は `copyMode` / `layout` および将来の直交 property に寄せる方が保守しやすいです。

---

## 10. 境界条件

### 10.1 不正な `intent`

列挙外の `intent` は `neutral` にフォールバックします。`valid` / `invalid` 前提の表示や A11y 文言には依存しません。

### 10.2 `filename` なし、`lang` あり

キャプションの `filename` 欄は空ですが、コピー文言やスクロール領域の文脈名には言語ラベルを使用します。

### 10.3 `filename` なし、`lang` なし

文脈名は `コード` になります。`aria-description` も `コード`、copy button label も `コードをコピー` になります。

### 10.4 メタデータなし

`filename=''` かつ `intent='neutral'` の場合、通常キャプションではなく overlay copy button のみを表示します。ただし、`copyMode='hidden'` の場合は copy affordance 自体を視覚表示しません。

### 10.5 `initialCode` のみあり

slot 未同期または `pre` 未解決時でも copy button は `initialCode` を値として保持できます。ただし、表示本文は `initialCode` から生成しません。

### 10.6 `showLineNumbers=true` でも `.line` を生成できない入力

子要素を含むが `.line` を持たない複雑な markup では、破壊的再構築を避けるため `.line` を生成しません。この場合、行番号表示は成立しないことがあります。

### 10.7 `data-raw` と表示本文の不一致

`data-raw` が存在する場合、コピー値は `data-raw` を優先します。利用者は表示テキストと `data-raw` の不一致を作るべきではありません（SHOULD NOT）。

### 10.8 横スクロール不要な短いコード

overflow しない場合、`pre` は `tabindex`、`role`、`aria-label` を持ちません。常時 focusable な scroll region としては扱いません。

### 10.9 `headless` と `embedded` の併存

両方が true の場合、互換 shorthand 同士の組み合わせとして解釈し、breakout は解除され、root は `headless` 側の外装除去が優先されます。

ただし、新規契約ではこの組み合わせを中心に設計せず、`layout` と将来の直交 property へ置き換える方がよいです。

### 10.10 `highlightLines` に無効な範囲が含まれる場合

無効な断片は無視し、解釈可能な範囲のみを採用します。範囲全体を解釈できない場合、行強調は適用しません。

### 10.11 `copyMode='hidden'`

copy affordance は視覚表示しませんが、コード本文や copy 値の内部整合契約を破棄するものではありません。

### 10.12 `layout='inline'`

親幅内に収め、breakout 用の負マージンを適用しません。

---

## 11. Storybook 契約

各 Story は見本ではなく、**契約確認点**として扱います。将来変更時には、次の契約を維持します。

| Story                                | 固定する契約                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| `Default`                            | `data-lang`、`aria-description`、基本枠、コピー値同期が成立すること            |
| `IntentStates`                       | `neutral` / `valid` / `invalid` の表示差分と A11y 文言差分が成立すること       |
| `HeaderDisplayPriority`              | `--ui-code-block-header-display` が `headless` より優先すること                |
| `FocusWithinInstantVisibility`       | focus-within 時に copy button が即時可視化されること                           |
| `ShowLineNumbers`                    | プレーンテキスト入力で `.line` 生成と行番号表示が成立すること                  |
| `ShikiHighlightedLines`              | Shiki の `.line`、highlight、diff、`data-raw` コピー優先が成立すること         |
| `DeclaredHighlightLines`             | `highlight-lines` により論理行の強調が宣言的に適用されること                   |
| `OverflowScrollableArea`             | overflow 時のみ `tabindex="0"`、`role="region"`、`aria-label` が付与されること |
| `WrappedContentException`            | `wrap` または互換入力 `data-wrap="true"` で折り返しに切り替わること            |
| `CopyModeStates`                     | `copy-mode` の `auto` / `always` / `hidden` が視覚露出に反映されること         |
| `LayoutModes`                        | `layout="breakout"` / `layout="inline"` の差分が成立すること                   |
| `DarkTokenAdaptation`                | トークン差し替えで背景、境界線、前景が追従すること                             |
| `MediaStyleContracts`                | print / forced-colors 契約が CSS に定義されていること                          |
| `TouchCoarsePointerVisibility`       | coarse pointer 環境で copy button の視認性が上がること                         |
| `BoundaryFallbacksAndCopyExtraction` | 不正 `intent` のフォールバックとコピー純度が成立すること                       |
| `NoMetadataOverlay`                  | メタデータなし時に overlay copy button モードへ移行すること                    |

---

## 12. 補足

`ui-code-block` の要点は、コード片を飾ることではありません。**コードを読む、比較する、コピーする、長い行を辿る**という行為を、本文の没入を壊さずに成立させることにあります。

したがって、今後の変更でも次の点は崩さない方がよいです。

1. コード本文は slotted `pre/code` を一次情報とすること。
2. コピー値は表示装飾から独立した純粋なコードとして得られること。
3. 横スクロール時のみ追加のアクセシビリティ属性を起動すること。
4. `copyMode` と `layout` を主要な公開状態として維持し、`headless` / `embedded` は互換 shorthand としてのみ扱うこと。
5. document style 注入という副作用を暗黙仕様にせず、明示契約として扱うこと。

---

## 13. 契約が不明瞭な箇所と長期的な明確化方針

本節は、現行実装の挙動そのものを追認するための節ではありません。**長期的な保守性、責務分離、契約の一貫性**の観点から、現時点で曖昧さが残っている箇所を明示し、将来的にどのような契約へ整理するのが望ましいかを定義します。

### 13.1 コード本文の一次情報が単一ではありません

現行契約では、表示は slotted `pre/code`、コピーは `data-raw` 優先、初期フォールバックは `initialCode` というように、コード本文の情報源が複数に分かれています。

この構造は短期的には便利ですが、長期的には「表示されている内容」と「コピーされる内容」と「初期値として保持される内容」が分離しやすく、設計上の真実源が曖昧になります。

長期的には、**コード本文の正本を1つに固定する**方がよいです。設計案としては次のいずれかに寄せます。

- slotted `pre/code` を唯一の正本とし、コピーもそこからのみ生成します。
- 逆に、文字列 property を唯一の正本とし、slotted `pre/code` は表示用ビューとして扱います。

Rouault 全体の保守性を考えると、将来的には**文字列正本 + 表示ビュー分離**の方が拡張しやすいです。

### 13.2 正規入力の形が十分に固定されていません

現行契約では「`pre` を1つ含む構造」と定義していますが、`pre` 単独、ラッパ要素配下の `pre`、複数 `pre`、`code` 単独、text node 直置きなどの境界が十分に整理されていません。

長期的には、**受理する入力形を1つに絞る**方がよいです。最もきれいなのは次の契約です。

- 正規入力は `<pre><code>...</code></pre>` のみとします。
- それ以外は公開契約外とします。
- 非正規入力に対しては、少なくとも開発時に検知できる形を用意します。

これにより、slot 探索規則、copy 抽出規則、行番号整備規則がすべて単純になります。

### 13.3 `label` の意味が単体契約として弱いです

`label` は公開入力ですが、単体表示、アクセシブル名、コピー文言のいずれにも使用していません。現状では、上位レイヤが参照し得る補助識別子に留まっています。

この状態は、**公開 API が存在するにもかかわらず意味が未確定**であることを意味します。長期的には次のどちらかへ寄せるべきです。

- `ui-code-block` 単体契約から `label` を削除し、上位の code group 契約へ移します。
- `label` を「比較表示・グルーピング用の安定キー」として厳密に定義します。

設計のきれいさを優先するなら、**単体コンポーネントからは削除し、上位レイヤの契約へ移す**方が自然です。

### 13.4 `lang` が複数の役割を兼ねています

現行の `lang` は、機械可読な識別子、表示ラベルの生成素材、`data-lang` の生成元、`aria-description` の素材という複数の役割を持っています。

この構造では、`ts` のような構文識別子と `TypeScript` のような表示ラベルが同一入力に折り畳まれており、**構文識別と表示表現の責務が分離されていません**。

長期的には次のように分ける方がよいです。

- `syntax` または `codeLanguage`: 機械可読識別子
- `languageLabel`: 表示専用ラベル

少なくとも、将来の契約では**構文識別子と表示ラベルを同一視しない**ことを明示した方がよいです。

### 13.5 `intent` の語彙が検証結果と意味状態の間で揺れています

`valid` / `invalid` という語は強く、構文検証や実行可否を連想させます。一方、実際の契約は教育的、説明的な意味状態に留まっています。

このままでは、利用側が「`invalid` は本当に誤ったコードである」と誤読しやすくなります。

長期的には、**検証結果を想起させない語彙へ改名**した方がよいです。たとえば、`good-example` / `bad-example`、`recommended` / `caution`、`do` / `dont` のような語彙の方が契約意図に近いです。

少なくとも契約書上では、`intent` は**構文真偽ではなく、教材的意味付け**であることをより強く固定する必要があります。

### 13.6 `headless` は互換 shorthand として後退させる方がよいです

`headless` はヘッダー表示抑止だけでなく、枠線、背景、角丸、overflow の扱いにも影響し、さらに CSS 変数で上書きできます。これは1つの boolean に対して責務が多すぎます。

長期的には、状態を次のように直交分解した方がよいです。

- `showHeader`
- `showFrame`
- `showCopyAction`
- `layout`

この分解により、「ヘッダーは消したいが copy は残したい」「枠だけ消したい」といった要求を自然に扱えます。\`\`\*\* という包括的な状態は、長期的には廃止対象\*\*と考える方がよいです。

ただし、実際の移行では一段階で削除せず、`** を **`\*\* かつ `` は独立状態として先に分離する\*\*方が安全です。

### 13.7 `embedded` は `layout` へ寄せ、互換 shorthand に留める方がよいです

`embedded` は breakout を無効化するだけでなく、枠線や角丸の除去にも影響します。名前から想像される責務より広く、レイアウトと外装が混ざっています。

長期的には、次のように分離した方がよいです。

- `layout = breakout | inline`
- `frame = framed | frameless`

これにより、「埋め込みだが枠あり」「breakout だが枠なし」といった状態を、暗黙規則なしで表現できます。

### 13.8 overlay 判定基準が意味メタデータと視覚メタデータを分けていません

現行契約では、`filename` と `intent` がない場合に overlay モードへ移行します。一方で、`lang` は文脈名や `aria-description` の素材には使われますが、キャプション表示の主因にはなりません。

これは、**意味メタデータとしての \*\***\`\`\***\* と、視覚ヘッダーを構成するメタデータとが分離されていない**ことを示しています。

長期的には、少なくとも次の2層へ分ける方がよいです。

- semantic metadata
- visual header metadata

overlay 判定は「ヘッダーに表示すべき視覚メタデータがあるか」で定義し、`lang` をヘッダーへ出すか出さないかも別契約として明示します。

### 13.9 行番号の基準単位が十分に固定されていません

現行契約は `.line` 構造に依存して行番号を表示しますが、論理行、視覚行、折り返し後の行の関係が十分に定義されていません。

長期的には、**行番号は論理行のみを対象とする**ことを契約として固定した方がよいです。その上で、wrap 後の視覚的な複数行は行番号契約の対象外とします。

また、`.line` を公開入力として維持するなら、それは「行表現アダプタ契約」であると明確に位置づける必要があります。

### 13.10 Shiki 依存境界が半公開のままです

`pre.shiki`、`.line.highlighted`、`.line.diff.add`、`.line.diff.remove` などは現行表示の成立に重要ですが、これらを正式公開契約とするのか、内部協約とするのかがまだ揺れています。

長期的には、次のどちらかへ寄せるべきです。

- Shiki 互換の light DOM 形状を正式に公開します。
- `ui-code-block` 自体はハイライタ非依存とし、Shiki 用アダプタを別コンポーネントまたは別契約に分離します。

設計のきれいさを優先するなら、**Shiki 依存は adapter 層へ分離**した方がよいです。

### 13.11 document style 注入の責務境界が強すぎます

現行実装では、`connectedCallback()` 時に document head へ style を注入します。これは簡便ですが、単体コンポーネントが document 全体へ副作用を持つ構造です。

長期的には次のいずれかへ寄せた方がよいです。

- document style 注入を廃止し、外部 CSS 配布へ移行します。
- `installCodeBlockStyles(document)` のような明示 API に分離します。

最も保守しやすいのは、**コンポーネント本体が document head を直接変更しない**設計です。

### 13.12 A11y 契約で name と description の役割分担が弱いです

現行契約では、`aria-description` を root と `pre` に付与し、overflow 時のみ `role="region"` と `aria-label` を付与します。しかし、名前、説明、領域化の役割分担を概念としてはまだ十分に分離していません。

長期的には、A11y 契約を次の3つに分けた方がよいです。

- code block の固有名
- code block の説明
- scroll region としての追加属性

これにより、「overflow しないコードにどの程度の名前付けが必要か」「copy button の label はどの命名規則に従うか」が一貫します。

### 13.13 copy action が UI として存在する一方で、公開イベント契約がありません

copy button は常に描画されますが、`ui-code-block` 自身は copy 成功、失敗、実行完了をイベントとして公開していません。

この状態では、copy は**見えている機能であるにもかかわらず、親側から観測可能な契約を持たない**ことになります。

長期的には次のどちらかへ寄せた方がよいです。

- copy は完全に内部機能とし、親側は一切関知しない契約とします。
- `copy` / `copy-success` / `copy-error` のようなイベントを正式公開します。

拡張性を優先するなら、**copy action はイベント公開した方がよい**です。

### 13.14 property と CSS 変数の優先順位が設計原則として整理されていません

現行契約では、`headless` のような状態を property で持ちつつ、最終的な表示可否は CSS 変数でも上書きできます。これは柔軟ですが、状態と見た目の責務境界が曖昧になります。

長期的には、次の原則へ寄せた方がよいです。

- 意味状態は property で表します。
- 寸法、余白、色などの調整は CSS 変数で表します。
- 表示有無のような本質状態は CSS 変数へ逃がしません。

この原則を明文化すると、将来の API 追加時にも状態モデルが濁りにくくなります。

### 13.15 breakout が単体既定としては強すぎます

現行の `ui-code-block` は既定で breakout 表示を持ち、親コンテンツ幅より広く表示されます。Rouault 全体では意図に沿いますが、単体コンポーネントとしてはレイアウト主張が強いです。

長期的には、単体の既定を **inline-safe** に寄せ、強いレイアウトは opt-in にした方がよいです。たとえば、`layout="breakout"` を明示指定時のみ breakout する設計の方が再利用性は高いです。

---

## 14. 将来の正式契約として採用する追加機能

本節は、追加検討事項のうち、将来案ではなく**正式契約として採用する方針**を示します。これらは「あると便利」な補助ではなく、`ui-code-block` の公開面として独立に扱うべき機能です。

### 14.1 copy を公開 UI 契約として独立させます

copy は常設 UI でありながら、従来は露出量を明示的に制御する正式入力を欠いていました。将来契約では `copyMode` を正式入力とし、copy affordance の露出を `auto` / `always` / `hidden` で制御します。

これにより、静かな本文文脈、教材文脈、補助コード文脈で、copy 操作の視覚ノイズを明示的に調整できます。

### 14.2 `wrap` を互換属性ではなく正式入力へ昇格します

折り返しは従来 `data-wrap="true"` による暗黙入力でした。将来契約では `wrap` を正式な boolean property / attribute とし、`data-wrap` は互換入力としてのみ扱います。

これにより、折り返しはスタイル偶然性ではなく、**表示モードとして明示的に選択する契約**になります。

### 14.3 行強調を宣言的入力として扱います

行強調は従来 `.line.highlighted` 等の light DOM 形状に依存していました。将来契約では `highlightLines` を正式入力とし、論理行範囲を宣言的に指定できるようにします。

これにより、強調はハイライタ依存の副産物ではなく、**コード読解を支える独立契約**になります。

### 14.4 レイアウトを `layout` として明示化します

従来の breakout / embedded は暗黙規則と互換状態に依存していました。将来契約では `layout="breakout" | "inline"` を正式入力とし、レイアウト責務を明示化します。`embedded` は互換入力として残しますが、契約記述の主語にはしません。

これにより、本文より広く見せるか、親幅内に収めるかを、単体 API としてきれいに表現できます。

また、`headless` 分解の中間移行では、`layout` は `showHeader` / `showFrame` / `showCopyAction` と並ぶ**直交状態の一部**として扱う方がよいです。レイアウトは表示有無ではなく、幅と配置の責務に限定します。

---

## 15. 現行実装で未対応または注意が必要な事項

### 15.1 `label` の役割は本コンポーネント単体では完結していません

`label` は公開 property として存在しますが、現行 `ui-code-block` の描画や A11y 文言では使用していません。したがって、`label` は現時点では**外部連携のための補助メタデータ**であり、単体の視覚契約には寄与しません。

### 15.2 `showLineNumbers` は複雑な markup に対して完全保証ではありません

`.line` を持たないが子要素を含む構造では、破壊的再構築を避けるため行ラッパーを生成しません。そのため、`showLineNumbers=true` はあくまで**安全に成立できる入力に対する契約**です。

### 15.3 `wrap` / `highlightLines` / `copyMode` / `layout` は将来契約として追加済みですが、現行実装では未対応です

本書では `wrap`、`highlightLines`、`copyMode`、`layout` を正式契約として昇格させましたが、現行実装はまだ `data-wrap`、内部 copy affordance、既存 `.line.highlighted`、`embedded`、`headless` などの従来構造に依存しています。

したがって、現行コードは**契約書が目指す将来契約にはまだ追随していません**。実装移行時には、公開 property、Storybook、CSS、互換処理を同時に更新する必要があります。

### 15.4 Storybook / autodocs は契約書にまだ追随していません

現行の `codeblock.stories.ts` は、argTypes と docs 説明が主として従来契約を前提にしており、`copyMode`、`wrap`、`highlightLines`、`layout` を controls / autodocs 上の正式入力としてまだ公開していません。加えて、`embedded` や `initialCode` のような現行入力も argTypes 上では十分に露出していません。

また、本書の Storybook 契約に追加した `DeclaredHighlightLines`、`CopyModeStates`、`LayoutModes` などの確認点は、現行 `codeblock.stories.ts` にはまだ対応する Story として実装されていません。

したがって、現行 Storybook は**契約書が記述する将来契約および一部の現行公開面を完全には反映していません**。実装移行時には、コンポーネント本体だけでなく argTypes、docs 説明、Story 名、play function の確認点も同時に更新する必要があります。

### 15.5 `showHeader` / `showFrame` / `showCopyAction` は移行方針としては記載済みですが、現行 API では未提供です

本書では `headless` 分解の中間移行方針として `showHeader`、`showFrame`、`showCopyAction` を導入候補として記載していますが、現行の `ui-code-block` にはこれらの property / attribute は存在しません。

したがって、これらは**文書上の移行方針であり、現行実装の公開 API ではありません**。利用側は現時点でこれらの入力を使用できず、Storybook でも検証対象になっていません。

実装移行時には、少なくとも次を同時に行う必要があります。

- property / attribute の追加
- `headless` との優先順位定義
- render / style / state model の更新
- Storybook 契約の新規 Story 追加

### 15.6 document style 注入はグローバル副作用です

スタイルは component instance ごとではなく document 単位で注入されます。複数アプリ、SSR、外部 style 管理との関係は、現行実装では強く抽象化されていません。

### 15.7 `initialCode` は表示ソースではありません

`initialCode` を与えても表示本文は生成されません。表示とコピーの情報源が分かれる余地があるため、通常は slotted `pre` と `initialCode` を一致させるべきです。

### 15.8 header 非表示は絶対契約ではありません

`headless=true` でも、親側が `--ui-code-block-header-display: block` を与えれば caption と copy button を再表示できます。したがって、`headless` を「常に copy button が存在しない状態」とみなしてはなりません。

### 15.9 内部 class 名依存は避ける必要があります

Storybook では検証のため `.caption` や `.intent` を参照していますが、利用側の公開契約としては内部 class 名を固定していません。外部コードはこれらに依存すべきではありません。

### 15.10 本節の扱い

本節に記載した事項は、現行公開契約の限界または注意点です。これらを改善する場合は、**実装、Storybook、契約書の3点を同時に更新**し、暗黙挙動を残したまま公開契約へ昇格させない方がよいです。
