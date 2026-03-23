# Syntax Field

## 文書の目的

本書は、`ui-syntax-field` の公開契約、状態モデル、アクセシビリティ、視覚契約、および現行実装との差分を整理するためのコンポーネント契約書です。

`ui-syntax-field` は、親の `<dl>` と組み合わせて、構文項目の **Name / Required / Type / Default / Description** を一貫した形式で表示するコンポーネントです。単に用語と説明を並べるのではなく、**属性情報をどの順序で提示するか**、**必須・型・既定値をどの条件で表示するか**、**説明文を Light DOM 上でどのように扱うか** を公開契約として固定します。

本コンポーネントは Shadow DOM を持たず、Light DOM 上に `dt` / `dd` を描画します。そのため、`<dl>` との意味論的な接続、document への style 注入、説明文ノードの扱い、媒体別レイアウトは、いずれも契約上の重要事項です。

Rouault における syntax field は、仕様情報を静かに読ませるための構成要素です。強い装飾や過剰な対話性ではなく、**読み手が構造を無理なく把握できること** を優先します。したがって、本契約は情報の序列化と、「没入して読む」体験の維持を両立する方向で定義します。

---

## 適用範囲

本書は、`ui-syntax-field` の次の事項を対象とします。

- 責務範囲
- 公開契約
- 状態モデル
- DOM / Accessibility
- Visual Contract
- 環境別の振る舞い
- 関連契約
- 参照契約
- 境界条件
- Storybook 契約
- 未対応事項

一方で、本書は次の事項を扱いません。

- 親 `<dl>` 全体の余白設計や行間設計
- 複数 field 間の並び順ルール
- syntax card や syntax section など上位コンポーネントのレイアウト責務
- 型文字列そのものの妥当性検証
- `defaultValue` のパースや評価
- 説明文マークアップの内容妥当性検証
- field 単体のコピー機能
- field 単体の折りたたみ / 展開
- field 単体のバリデーション / 警告表示
- field 単位のアンカー参照点生成、フラグメント ID の一意性管理、パーマリンク生成
- 説明文の property ベース API や二重入力経路
- 文言ローカライズ、実行時ラベル差し替え、ロケール別表記切り替え
- `defaultValue` 以外の補助概念（既定例、推奨例など）の表現
- `Visual Contract` に列挙した公開トークン以外の追加 style hook、`data-*`、内部 selector の公開 API 化
- 内部実装の方式選定そのもの

これらは上位レイヤ、データ生成側、または別コンポーネント / 別設計文書の責務として扱います。

---

## 公開契約

`ui-syntax-field` は、`name`、`fieldType`、`required`、`defaultValue` を公開入力として扱います。**説明文の唯一の正本は、ホスト直下の既定 Light DOM 子ノードです。** 内部実装は Light DOM 上の `.field-wrapper`、`dt.field-term`、`dd.field-description` を用いますが、利用者は `ui-syntax-field` を契約単位として扱います。

`name` の既定値は空文字です。`fieldType` の既定値は空文字です。`required` の既定値は `false` です。`defaultValue` の既定値は空文字です。

`name` は公開上は必須入力として扱います。実装上は空文字でも描画を継続しますが、公開契約としては、構文項目名を欠いた field を正規入力とはみなしません。利用者は `name` を必ず与えなければなりません（MUST）。

`fieldType` と `defaultValue` は、空文字または空白のみの文字列を受け取った場合、未指定として扱います。したがって、利用者は空白だけの値で表示領域を確保できることを期待してはなりません（MUST NOT）。

`required=true` の場合、当該 field は **仕様上省略不可** であることを意味します。必須表示は `.field-required` 要素として描画し、その表示文言と `aria-label` は常に「必須」で固定します。`aria-required` は使用しません。

`defaultValue` は、**field が省略された場合に採用される仕様上の既定値** を意味します。したがって、`required=true` と trim 後に空でない `defaultValue` は意味論上両立しません。利用者はこの組み合わせを与えてはなりません（MUST NOT）。

### 入力契約

| 名前           | 種別                             | 必須   | 内容           | 契約                                                                                                            |
| -------------- | -------------------------------- | ------ | -------------- | --------------------------------------------------------------------------------------------------------------- |
| `name`         | property / attribute             | はい   | フィールド名   | trim 後の文字列を表示します。空文字は非推奨ではなく契約違反です                                                 |
| `fieldType`    | property / attribute (`type`)    | いいえ | 型定義         | 空文字・空白のみは未指定として扱います                                                                          |
| `required`     | property / attribute             | いいえ | 省略不可フラグ | `true` の場合のみ `.field-required[aria-label="必須"]` を描画します。意味は「仕様上省略不可」です               |
| `defaultValue` | property / attribute (`default`) | いいえ | 省略時既定値   | 空文字・空白のみは未指定として扱います。trim 後に空でない場合、field 省略時に採用される仕様上の既定値を表します |

`required=true` と trim 後に空でない `defaultValue` は契約違反です。実装が描画を継続しても、公開契約上の正規入力とはみなしません。

### 子ノード契約

| 名前         | 種別               | 位置づけ | 内容                                               |
| ------------ | ------------------ | -------- | -------------------------------------------------- |
| 既定子ノード | Light DOM children | 正規入力 | 説明文として `dd.field-description` に反映されます |

説明文は slot ではなく、ホスト要素の既定子ノードをそのまま受け取ります。テキストノード、インライン要素、強調要素などのマークアップは保持されます。

利用者は、説明文を slot 契約として扱ってはなりません（MUST NOT）。本コンポーネントは Shadow DOM を持たず、子ノードは Light DOM 上で扱われます。

### 説明文正本契約

説明文の唯一の正本は、**その時点でホスト直下に存在する既定子ノード集合** です。`ui-syntax-field` は、description 用 property、attribute、slot 名、内部キャッシュ配列を公開正本として扱いません。

したがって、利用者は説明文を変更したい場合、ホスト直下の子ノードを変更するべきです（SHOULD）。`description` property のような別経路を前提としてはなりません（MUST NOT）。

### 説明文内容契約

説明文として受理する入力は、ホスト直下に置かれた既定子ノードです。テキストノード、`<strong>`、`<em>`、`<code>`、`<a>` などのインライン要素は正規入力として扱います。`<p>`、`<ul>`、`<ol>`、`<pre>` を含む flow content 相当の要素も正規入力として扱います。

ただし、本コンポーネントが保証するのは **説明文ノードを保持して `dd.field-description` に反映すること** までです。説明文内部の段落間余白、リスト字下げ、コードブロック整形など、要素種別ごとの詳細な読み物スタイルまでは契約に含めません。

コメントノードや空白のみのテキストノードは存在し得ますが、表示上の意味は保証しません。利用者は、説明文の意味表現を可視テキストまたは意味のある要素で与えるべきです（SHOULD）。

### 説明文再配置契約

`ui-syntax-field` は、ホスト直下の既定子ノード集合から説明文表示を導出し、それを `dd.field-description` として描画します。描画時にノードの物理位置が変わること自体は許容されますが、**表示内容は常に現在のホスト子ノード集合に従う** 必要があります。

再配置はテキスト化ではなくノード単位で行うため、説明文内のインライン構造は保持されます。ただし、実装はノード同一性の保持までは公開契約としません。利用者は、初期子ノードがホスト直下に残存し続けることや、同一 `Node` インスタンスが永続的に再利用されることを前提として DOM を参照してはなりません（MUST NOT）。

### 属性反映契約

公開入力のうち、`name`、`fieldType`、`required`、`defaultValue` は property と attribute の両面から操作できます。`fieldType` の HTML 属性名は `type`、`defaultValue` の HTML 属性名は `default` です。

| property       | attribute  | reflect | 備考                             |
| -------------- | ---------- | ------- | -------------------------------- |
| `name`         | `name`     | なし    | trim 後の文字列を表示します      |
| `fieldType`    | `type`     | なし    | 空白のみは未指定として扱います   |
| `required`     | `required` | なし    | boolean attribute として扱います |
| `defaultValue` | `default`  | なし    | 空白のみは未指定として扱います   |

本コンポーネントは property の attribute 反映を契約に含みません。利用者は reflect 挙動に依存してはなりません（MUST NOT）。

### 公開イベント契約

`ui-syntax-field` は公開イベントを持ちません。`name`、`fieldType`、`required`、`defaultValue`、および説明文ノードの変化に応じて、利用側が購読すべき独自イベントは送出しません。

利用者は、本コンポーネントに `change`、`input`、`update`、`rendered` などの独自イベントが存在することを期待してはなりません（MUST NOT）。必要な再描画や状態管理は、利用側のデータ更新責務として扱います。

### 公開メソッド契約

`ui-syntax-field` は、利用者が依存してよい公開メソッドを持ちません。説明文追従、style 注入、媒体別適応は内部実装として自動的に行われます。

利用者は、`refresh()`、`relayout()`、`syncDescription()` のような再計算 API の存在を期待してはなりません（MUST NOT）。

### 公開 DOM 契約

`ui-syntax-field` は Light DOM で動作し、`shadowRoot` を持ちません。公開契約として固定するのは、**用語と説明が `dt` / `dd` で表現されること**、および host が `display: contents` として親 `<dl>` 構造に溶け込むことです。

現行実装では host 配下に項目ラッパーと、その中に term 側要素と description 側要素を描画します。ただし、ラッパー要素の class 名、補助要素の class 名、内部要素の細かな分割方法は公開 DOM API に含めません。利用者は class 名や子孫 selector の固定に依存してはなりません（MUST NOT）。

DOM 依存を許容するのは、Light DOM であること、`dt` と `dd` の意味論が維持されること、説明文表示面が 1 つ存在することまでです。

### 要素順序契約

`dt.field-term` 内の要素順序は次のとおりです。

1. `.field-name`
2. `.field-required`
3. `.field-type`
4. `.field-default`

ただし、`required`、`fieldType`、`defaultValue` が未指定または非表示条件に該当する場合、その要素は省略されます。表示される要素はこの順序を崩してはなりません（MUST NOT）。

### 責務範囲

本コンポーネントは 1 件の syntax field を表示する責務を持ちます。責務範囲には、フィールド名の表示、必須・型・既定値の条件付き表示、説明文子ノードの保持と反映、Light DOM 上での `dt` / `dd` 構造の維持、style の一意注入、および当該 1 件の読みやすさを保つための最小限の媒体別スタイルの適用を含みます。

一方で、親 `<dl>` の存在保証、複数 field 間の列幅統制、syntax card や syntax section 全体のレイアウト、文脈見出しや群構造の管理、説明文内容の妥当性、型システムとの整合性、既定値の意味解釈を超える業務ロジック、外部データ変更に応じた全文再構成は責務に含めません。

利用者は、本コンポーネントを「1 件の仕様項目を表示する単位」として扱うべきであり、群全体の版面設計や情報編成までを本コンポーネント単体に期待してはなりません（SHOULD NOT）。

---

## 状態モデル

`ui-syntax-field` の主要状態は、見た目の種類ではなく、**どの補助情報を持つか**、**説明文がどのような子ノード集合として与えられるか**、**媒体条件に応じてどう配置されるか** によって読み分けます。

### 基本状態

最小状態は、`name` と説明文のみを持ち、`required=false`、`fieldType=''`、`defaultValue=''` の状態です。この状態では `.field-name` と `.field-description` のみを描画します。

### 必須状態

`required=true` の場合、`.field-required` を描画します。表示文言と `aria-label` は常に「必須」です。必須状態は意味表示であり、対話コントロールの `aria-required` には置き換えません。

### 型表示状態

`fieldType` が trim 後に空でない場合、`.field-type` を描画します。`fieldType` が空白のみの場合は未指定と同義です。

### 既定値表示状態

`defaultValue` が trim 後に空でない場合、`.field-default` を描画します。表示形式は常に `default: {value}` です。ここでの `defaultValue` は、**field が省略された場合に採用される仕様上の既定値** を表します。

`fieldType` も併せて表示する場合、`.field-default` に `field-default-with-type` を付与し、型表示との間に追加の間隔を与えます。`fieldType` がない状態ではこのクラスを付与しません。

### 複合状態

`fieldType` は `required` と `defaultValue` のいずれとも併存できます。一方で、`required` と `defaultValue` は意味論上の両立を許容しません。

- `required=true` かつ `defaultValue=''` は正規入力です。
- `required=false` かつ `defaultValue` ありは正規入力です。
- `required=true` かつ `defaultValue` ありは契約違反です。実装が描画を継続しても、正規入力とはみなしません。

### 説明文状態

説明文は、ホスト直下の既定子ノード集合から導出されます。説明文表示が正しいかどうかは、内部キャッシュの有無ではなく、**現在のホスト直下子ノード集合と `dd.field-description` の表示内容が整合していること** によって判断します。

### レスポンシブ状態

既定状態では `.field-wrapper` は block レイアウトで描画し、`dt` と `dd` は縦方向に積みます。`min-width: 768px` 以上では `.field-wrapper` を 2 カラム grid に切り替え、左列に `dt`、右列に `dd` を配置します。

### ホバー状態

`hover: hover` を満たす環境では、`.field-wrapper:hover` に淡い背景色を適用します。これは情報を選択可能に見せるためではなく、読み取り位置の局所的な補助です。ホバー状態はクリック可能性を意味しません。

---

## DOM / Accessibility

ルートは `ui-syntax-field` 自身です。Shadow DOM は持たず、Light DOM に次の構造を描画します。

```text
<ui-syntax-field>
  <div class="field-wrapper">
    <dt class="field-term">
      <span class="field-name"></span>
      [span.field-required]
      [span.field-type]
      [span.field-default]
    </dt>
    <dd class="field-description">...</dd>
  </div>
</ui-syntax-field>
```

### Accessibility 契約

アクセシビリティ上の重要点は次のとおりです。

- 用語と説明の意味論は `dt` / `dd` によって表現します。
- `required` の表現は `.field-required[aria-label="必須"]` で行います。
- `aria-required` は使用しません。
- `fieldType` と `defaultValue` は補助情報であり、装飾ではなく可読テキストとして出力します。
- 説明文内のインラインマークアップは保持されます。
- host は `display: contents` として親の `<dl>` 構造に溶け込みます。

本コンポーネントで重要なのは、**カード状の見た目を作ることではなく、定義リストの意味論を壊さずに情報粒度を揃えること** です。そのため、擬似的な list item や独自 role には依存しません。

### Light DOM 契約

`ui-syntax-field` は `createRenderRoot()` でホスト自身を返し、Light DOM 上に描画します。利用者は `shadowRoot` の存在を期待してはなりません（MUST NOT）。

### ホスト箱モデル契約

host である `ui-syntax-field` 自体は `display: contents` として振る舞います。したがって、視覚的な箱、背景、境界線、角丸、余白の主要な適用先は host ではなく `.field-wrapper` です。

利用者は、host 自身に対する `padding`、`border`、`background`、`border-radius`、`overflow` などの指定が、安定して視覚結果に反映されることを期待してはなりません（MUST NOT）。ホスト要素は意味論上の境界であり、箱モデルの公開面ではありません。

### style 注入契約

コンポーネントは document head に `#ui-syntax-field-document-styles` を 1 回だけ注入します。複数インスタンスが存在しても、同一 ID の style 要素は重複注入しません。

利用者はこの style 要素の存在を前提に追加の複製注入を行ってはなりません（MUST NOT）。

---

## Visual Contract

`ui-syntax-field` の視覚契約は、構文情報を **用語・補助情報・説明文** に分けて静かに読ませることにあります。

### 情報順位

- `.field-name` は最も強い視認性を持つ主情報です。
- `.field-required` は補助的な注意情報です。
- `.field-type` と `.field-default` はメタ情報として控えめに表示します。
- `.field-description` は本文寄りの読み物として扱います。

### レイアウト

既定では縦積みレイアウトとし、狭幅環境での折り返しを許容します。広幅環境では左列を term、右列を description とする 2 カラム grid へ切り替えます。左列幅は `minmax(min-content, 30%)`、右列は残余幅です。

### 視覚仕様

- `.field-name` はモノスペース系フォント、やや強いウェイトで表示します。
- `.field-required` は枠線を持つ小さなバッジとして表示します。
- `.field-type` と `.field-default` はモノスペース系フォントかつ控えめな色で表示します。
- `.field-description` はサンセリフ系本文として表示します。
- ホバー可能環境では `.field-wrapper:hover` に淡い背景を敷きます。

### 説明文の扱い

説明文は `.field-description` に表示されますが、テキスト内容のみへ正規化するのではなく、ノード構造を保持して描画します。したがって、`<strong>` などのインライン要素は失われません。

### 参照トークン

本コンポーネントは、主として次のトークンに依存します。

| 用途               | トークン                      |
| ------------------ | ----------------------------- |
| 既定文字色         | `--fg-default`                |
| 控えめ文字色       | `--fg-muted`                  |
| 警告色             | `--fg-warning`                |
| ホバー背景         | `--bg-hover`                  |
| 既定境界線         | `--border-default`            |
| 角丸               | `--radius-sm` / `--radius-md` |
| 余白               | `--space-*`                   |
| 等幅フォント       | `--font-mono`                 |
| サンセリフフォント | `--font-sans`                 |
| 遷移時間           | `--duration-fast`             |
| イージング         | `--ease-out`                  |

---

## 環境別の振る舞い

### Responsive

`min-width: 768px` 以上では `.field-wrapper` を grid に切り替えます。term 側の gap も広げます。768px 未満では block レイアウトを維持します。

### Hover

`hover: hover` 環境では、ホバー時に背景色、角丸、短い transition を適用します。hover 非対応環境ではこれらに依存しません。

### Reduced Motion

`prefers-reduced-motion: reduce` 環境では、ホバー transition の duration を極小化します。動きそのものを意味表現に使わず、静的レイアウトで読みやすさを維持します。

### Forced Colors

`forced-colors: active` 環境では、ホバー時に背景色ではなく `outline` を用いて状態を表現します。`.field-required` の境界線、`.field-type` と `.field-default` の文字色は `CanvasText` にフォールバックします。

### Print

`@media print` では `.field-wrapper` を grid レイアウトとして固定し、`page-break-inside: avoid` を適用します。背景色、角丸、余白、outline など印刷で不要な装飾は除去します。`ui-syntax-field` 自体は印刷対象から除外せず、情報要素として残します。

---

## 関連契約

### 親 `<dl>` 契約

`ui-syntax-field` は親の `<dl>` と組み合わせて用いることを前提とします。単独で使用しても DOM は描画されますが、意味論としては `<dl>` 配下での利用を正規とします。

本コンポーネントが定義リストとしての意味論を保証するのは、利用者が `ui-syntax-field` を `<dl>` 配下で用い、かつ host の `display: contents` が有効に機能する文脈に限ります。`<dl>` 外での利用や、host が定義リスト構造へ透過しない文脈では、表示は成立しても定義リストとしての意味論までは保証しません。

利用者は `<dl>` 以外の親文脈での意味保証を期待してはなりません（MUST NOT）。

syntax family の合成上、`ui-syntax-card` 配下で `ui-syntax-field` を用いる場合は、`ui-syntax-section` の本文内に `<dl>` を置き、その `<dl>` の直下に `ui-syntax-field` を配置する構成を正規とします。`ui-syntax-card` 直下や `ui-syntax-section` 直下に、`<dl>` を介さず `ui-syntax-field` を直接並べる構成は正規入力ではありません。

### 名称整形契約

`name`、`fieldType`、`defaultValue` は trim 後の文字列で解釈します。先頭末尾の空白は表示に寄与しません。

### 文言固定契約

`required` の表示文言および `aria-label` は常に「必須」で固定します。`defaultValue` の表示プレフィックスは常に `default:` 固定です。現行契約には、これらの文言を差し替える公開入力を含みません。

本コンポーネントは Rouault 内の日本語文脈を前提としており、現行契約には文言ローカライズを含みません。利用者は実行時の言語切り替え、ラベル差し替え、ロケール別表記切り替えを期待してはなりません（MUST NOT）。

文言変更が必要になった場合、それは単なる見た目調整ではなく、互換性を伴う契約変更として扱います。

### 説明文ノード追従契約

公開契約として保証するのは、**説明文表示が現在のホスト直下子ノード集合と整合すること** です。追加、削除、置換、テキスト差し替え、属性変更を含む説明文の変化は、次の更新機会までに `dd.field-description` へ反映されなければなりません（MUST）。

どの更新契機で同期するか、`MutationObserver` を使うか、再描画で解決するか、差分更新か全面再構成かは内部実装の責務です。利用者は内部 observer やキャッシュの存在を前提にしてはなりません（MUST NOT）。

### style 公開面契約

現行実装は Shadow DOM を持たず、`::part()` のような明示的 style 公開面も持ちません。外部カスタマイズは、document に注入された CSS とカスタムプロパティの範囲でのみ成立します。

`Visual Contract` の参照トークン表に記載したカスタムプロパティは、本コンポーネントが依存してよい公開テーマ入力として扱います。これらのトークンは、値の差し替えによる配色・余白・フォント・遷移調整の対象です。

一方で、内部 selector、内部 class 名、DOM の探索順、style 要素の内部記述そのものは公開 style API に含みません。利用者は内部 class 名への強い依存を固定化してはなりません（MUST NOT）。

### 内部識別子非公開契約

`.field-wrapper`、`.field-term`、`.field-name`、`.field-required`、`.field-type`、`.field-default`、`.field-description` は、現行実装の説明を読みやすくするために本文中で参照している内部識別子です。これらは公開 DOM API ではなく、将来固定を約束する名称でもありません。

本文中でこれらの名称を挙げるのは、現行実装の構成を説明するためであって、外部からの DOM クエリ、CSS 依存、レイアウト制御の固定を許可するためではありません。利用者は内部識別子の存在や順序を前提にした実装を固定化してはなりません（MUST NOT）。

説明文入力の解釈は、利用者が与えた子ノードの意味内容に基づいて行い、class 名そのものによって説明文ノードを特別扱いしません。説明文内に同名 class が含まれていても、それだけで内部制御対象とはみなしません。

---

## 参照契約

現行公開契約には、field 単位のアンカー入力やフラグメント参照点生成を含めません。`ui-syntax-field` は 1 件の仕様項目を表示する責務を持ちますが、文書内参照の安定化、参照点の一意性管理、パーマリンク生成は上位ナビゲーション層または文書レイアウト層の責務です。

したがって、利用者は `anchor`、`fieldId` などの field 参照専用入力が現行公開 API に存在することを期待してはなりません（MUST NOT）。

視覚的なパーマリンク UI、リンクアイコン、URL 共有導線、重複参照点の解決、採番規則の固定も本コンポーネントの責務ではありません。これらが必要な場合は、`ui-syntax-field` 自体ではなく、その周辺コンテナまたは文書生成側で付与します。

---

## 境界条件

### name のみ

`name` のみを与え、説明文が空の場合でも `.field-name` は描画されます。ただし、仕様情報としては説明欠落状態であり、利用上は推奨しません。

### 任意最小構成

`name` と説明文のみを与えた場合、`.field-required`、`.field-type`、`.field-default` は描画されません。

### 必須 + 型

`required=true` かつ `fieldType` ありの場合、要素順序は `name → required → type` を維持します。

### 任意 + 型 + 既定値

`required=false`、`fieldType` あり、`defaultValue` ありの場合、要素順序は `name → type → default` を維持します。

### 必須 + 既定値

`required=true` かつ trim 後に空でない `defaultValue` は契約違反です。実装が表示を継続しても、正規入力としては扱いません。

### 空白境界

`name`、`fieldType`、`defaultValue` に先頭末尾空白が含まれても trim 後に解釈します。`fieldType` と `defaultValue` が空白のみの場合は未指定として扱います。

### インライン HTML

説明文に `<strong>` などのインライン HTML を含む場合でも、`dd.field-description` 内に保持されます。

### 複数インスタンス

同一 document に複数の `ui-syntax-field` が存在しても、`#ui-syntax-field-document-styles` は 1 つだけ存在する必要があります。

### 動的説明追加

初回描画後にホストへ説明ノードを追加した場合、それらは `dd.field-description` に追従表示されます。

### 説明文未指定

説明文が空であっても、`dt` / `dd` の対を維持するため、`dd.field-description` 自体は描画されます。ただし、この状態は情報欠落を伴うため、仕様記述としては推奨しません。

### `aria-required` 不使用

`required=true` であっても、host に `aria-required` を付与してはなりません。必須表現は可視バッジと `aria-label` によって表現します。

---

## Storybook 契約

各 Story は見本ではなく、**契約確認点** として扱います。将来変更時には、次の契約を維持します。

| Story                               | 固定する契約                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `RequiredWithTypeAndDefault`        | 現行実装が `required`、`type`、`default` の併用を描画できることを示すが、**公開契約上は非正規入力であること** |
| `OptionalMinimalField`              | 任意最小構成で余計なメタ情報を描画しないこと                                                                  |
| `WhitespaceBoundary`                | 空白のみの `type` / `default` は非表示となり、trim 済み `name` を表示すること                                 |
| `MixedVariantsInDescriptionList`    | 複数 field を `<dl>` 内で並べても各項目が独立した `dt` / `dd` ペアを持つこと                                  |
| `LightDomAndStyleInjectionContract` | Light DOM で動作し、document style が重複注入されないこと                                                     |
| `ResponsiveAndMediaContracts`       | 768px 境界、hover、reduced-motion、forced-colors、print の各契約が CSS に含まれること                         |
| `DarkModeTokenContract`             | 色指定がセマンティックトークン参照に依存していること                                                          |
| `DynamicDescriptionUpdate`          | 初回描画後に追加された説明ノードが `dd` に追従すること                                                        |

---

## 補足

`ui-syntax-field` の要点は、単にラベルと説明を並べることではありません。**定義リストの意味論を維持しながら、構文情報の粒度と順序を固定し、実装詳細を利用側へ過度に漏らさないこと** にあります。

したがって、今後の変更でも次の 5 点は崩さない方がよいです。

1. 実体は Light DOM 上の `dt` / `dd` 構造であること。
2. `required` 表現は `aria-required` ではなく `.field-required[aria-label="必須"]` を維持すること。
3. `type` と `default` は空白のみ入力を非表示として扱うこと。
4. `required` は省略不可、`defaultValue` は省略時既定値であり、両者は同時に正規入力にならないこと。
5. 説明文子ノードの保持と反映を壊さないこと。

---

## 現行実装で未対応の事項

本節は、現行の `syntax-field.ts` および `syntax-field.stories.ts` を基準として、**契約上は明示しておくべきだが、現時点では未強制、未公開、または未整合である事項** を整理するものです。

### 1. `name` 必須の実行時強制

公開契約上は `name` を必須入力として扱うのが妥当ですが、現行実装は空文字でも描画を継続します。したがって、`name` 欠落に対する実行時強制は未実装です。

### 2. 親 `<dl>` の実行時保証

`ui-syntax-field` は `<dl>` 配下で使う前提ですが、現行実装は親要素種別を検証しません。したがって、意味論上の正しい親文脈は文書契約にとどまり、実行時保証は未実装です。

### 3. style 公開面の固定

現行実装は Light DOM と document 注入 CSS を採用しており、内部 class 名が実質的な拡張面になっています。しかし、これらの class 名を安定した公開 API として明示固定しているわけではありません。したがって、**外部 style 拡張面は未整理** です。

### 4. 説明文正本の単一化と完全追従

本書では、説明文の唯一の正本をホスト直下の既定子ノード集合と固定します。しかし現行実装は、初回捕捉した説明ノード集合と childList 追加追従を組み合わせており、削除、置換、属性変化、深い subtree 変化、テキスト差し替えまでを現在の正本として再評価しません。したがって、**説明文正本の単一化と現在集合への完全追従は未対応** です。

### 5. `required` / `defaultValue` の意味関係の実行時強制

本書では、`required=true` と trim 後に空でない `defaultValue` を契約違反と固定します。しかし現行実装はこの関係を強制せず、両方を同時に描画できます。したがって、**required と defaultValue の相互排他は未実装** です。

### 6. ローカライズ可能性

`required` バッジの文言および `default:` プレフィックスは現行実装で固定文字列です。多言語切り替えやラベル差し替えの公開入力はありません。したがって、文言ローカライズは未対応です。

### 7. テーマ拡張の明示 API

トークン参照は存在しますが、Light DOM + document CSS 注入という構造上、`::part()` のような明示的テーマ拡張面はありません。したがって、**style 拡張の公式な境界は未明確** です。

### 8. Storybook による未確認事項

現行 Storybook は主として構造、境界値、媒体別 CSS、動的追加を検証しています。一方で、`name` 欠落時の扱い、親 `<dl>` 不在時の扱い、削除や置換を含む説明文更新、外部 CSS 拡張の安定性は確認対象に含まれていません。

加えて、次の正方向ケースも現時点では明示的に固定されていません。

- `type` あり + `default` ありのときに `.field-default-with-type` が確実に付与されること
- 説明文未指定でも `dd.field-description` 自体は常に描画されること
- disconnect / reconnect をまたいだあとも説明文契約が維持されること

### 9. 再接続時の説明文再捕捉

現行実装では、説明文の初回捕捉は `_didCaptureDescription` により 1 回だけ行われます。そのため、いったん disconnect した後に外部で子ノード構成が変化し、再接続した場合でも、初期説明文の再捕捉は自動では行われません。したがって、**再接続時の説明文正規化は未対応** です。

### 10. document style の寿命管理

現行実装は document head に style 要素を 1 回だけ注入しますが、最後の `ui-syntax-field` が破棄されたあとも当該 style を除去しません。したがって、**style 注入の寿命は document 単位で固定され、インスタンス寿命とは連動していません**。これは現行動作としては合理的ですが、明示的な破棄契約や所有権モデルは未整備です。

### 11. style ID 衝突時の内容検証

現行実装は `#ui-syntax-field-document-styles` という ID の存在のみを見て重複注入を抑止します。すでに同一 ID の style 要素が存在する場合、その内容が `ui-syntax-field` 自身の期待する CSS と一致するかどうかは検証しません。したがって、**同一 ID を第三者が先に占有した場合の内容整合性保証は未対応** です。

### 12. 非ブラウザ環境の契約固定

現行実装は `document` や `MutationObserver` が存在しない環境では、style 注入や説明文追従を黙ってスキップします。これは防御的実装としては成立していますが、**非ブラウザ環境でどこまでを成立条件とみなすか** は公開契約として明示固定されていません。

### 13. field 単位参照入力の将来拡張

field 単位の安定参照入力は、将来的な拡張候補としてはあり得ますが、現行公開契約には含めません。採用する場合は、実装、Storybook、契約書の 3 点を同時に更新し、公開入力・一意性責務・生成位置・重複時の扱いをまとめて固定する必要があります。

したがって、現時点で利用者が依存してよい field 単位参照入力は存在しません。

### 14. 本節の扱い

本節に記載した事項は、現行公開契約として利用者が依存してよいものではありません。これらを採用または厳密化する場合は、実装、Storybook、契約書の 3 点を同時に更新し、未対応状態を残したまま公開契約へ昇格させません。
