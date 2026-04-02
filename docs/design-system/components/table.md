# Table

## 概要

本書は、Rouault における table の長期的な公開契約を定義するものです。

note 本文における table の正本は、**`div[data-table-root][role="region"][tabindex="0"] > table`** です。  
`ui-table` は互換入力または non-note 面で残り得ますが、note 本文の最終 DOM 契約としては採用しません。

table の責務は、**ネイティブ table の意味論を壊さずに、読書面での横スクロール可能な閲覧面を提供すること**です。data grid 化やアプリケーション widget 化は行いません。

---

## 適用範囲

本書は次を対象とします。

- note 本文における最終 DOM 契約
- table wrapper のアクセシビリティ契約
- `caption` からの `aria-label` 補完契約
- 密度属性の静的正規化
- 互換経路の扱い

本書は次を対象外とします。

- ソート、フィルター、ページネーション
- data grid 的な操作モデル
- sticky header / sticky column
- CSV export 等のアプリケーション機能
- 表データの取得や集計
- `ui-table` の内部実装詳細

---

## 設計判断

長期保守性の観点から、note 本文で `ui-table` を最終 DOM に残す構造は採りません。  
本文経路では、**build-time で `div[data-table-root] > table` を直接出力する**方針を採ります。

これにより、次を満たします。

- table の意味主体をネイティブ要素に残せる
- prose CSS が custom element selector に依存しない
- hydration 対象から外せる
- caption / aria-label / breakout の責務を静的 root に集約できる

---

## 公開契約

### 正規出力

```html
<div data-table-root="true" role="region" tabindex="0" aria-label="売上データ">
  <table>
    <caption>
      売上データ
    </caption>
    <tbody>
      <tr>
        <td>...</td>
      </tr>
    </tbody>
  </table>
</div>
```

### 入力契約

| 名前         | 種別            | 必須   | 内容             | 契約                                                             |
| ------------ | --------------- | ------ | ---------------- | ---------------------------------------------------------------- |
| `table`      | build-time 入力 | はい   | ネイティブ table | 意味主体は常に `table` とします                                  |
| `caption`    | table 内要素    | いいえ | 表の題名         | wrapper root の `aria-label` 補完に利用してよい                  |
| `density`    | 互換入力        | いいえ | 密度指定         | `compact` の場合 `data-density="compact"` を root に付与してよい |
| `aria-label` | 互換入力        | いいえ | 明示ラベル       | 存在する場合は caption より優先してよい                          |

### 最終 DOM 契約

- note 本文の最終 DOM は `div[data-table-root][role="region"][tabindex="0"] > table` です。
- row / column / header の意味論は常にネイティブ `table` 側に残します。
- `thead` / `tbody` / `tfoot` / `caption` / `th` / `td` の意味を失ってはなりません。
- note 本文の最終 DOM に `ui-table` を残してはなりません。

### ラベル補完契約

- 明示 `aria-label` がある場合はそれを優先してよいものとします。
- 明示値がない場合、`caption` のテキストから `aria-label` を補完してよいものとします。
- それもない場合は、実装上のフォールバック名を与えてよいですが、明示名または caption がある方が望ましいです。

---

## DOM / Accessibility

table の意味主体はネイティブ `table` です。
wrapper root は閲覧補助のための静的 root として扱います。

### Accessibility 契約

- wrapper root は `role="region"` を持ちます。
- wrapper root は `tabindex="0"` を持ち、キーボードで到達可能です。
- wrapper root にはアクセシブルネームを与えます。
- `caption` は table 本体の題名であり、wrapper root のラベル補完にも利用してよいものとします。
- 独自の data grid role へ変換してはなりません。

---

## Visual Contract

table は本文の流れを過度に壊さず、比較対象を読み比べられることを重視します。

視覚契約は次のとおりです。

- 横スクロール可能な閲覧面であること
- 線や背景は控えめであること
- 表の構造が一目で追えること
- 本文カラムとの関係は prose 側の static selector で制御すること

---

## note 本文と互換経路

`ui-table` は互換入力として受理してよいですが、note 本文の最終 DOM では採用しません。
本文では、次を固定します。

- `ui-table` を `div[data-table-root] > table` へ正規化する
- prose CSS は `[data-table-root]` を対象にする
- note hydration では table を数えない
