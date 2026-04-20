# Icon

## 文書の目的

本書は、Rouault における現行のアイコン契約を、実装に合わせて整理するものです。

本書が扱うのは次の 3 点です。

- どのアイコン資産を正規ルートとして使うか
- `ui-icon` が何を責務として持つか
- `ui-icon` を使う場面と inline SVG を使う場面の境界

本書は理想論ではなく、**現在のコードベースで成立している契約**を正本として記述します。

---

## 現行戦略の要約

Rouault の現行アイコン戦略は次のとおりです。

1. **標準アイコンは Lucide に統一する**
   - 利用可能な名前は `shared/icons/icons-catalog.ts` を正本とします。
   - 実体は生成済み subset を `iconify-icon` へ登録して使います。

2. **再利用する glyph は `ui-icon` に集約する**
   - `ui-icon` は `iconify-icon` を内部で使う薄いラッパーです。
   - 利用側は `name` を与えるだけでよい構造にします。

3. **`ui-icon` は glyph renderer + 最小限の a11y 反映に責務を限定する**
   - 親レイアウトの hide/show 判断は持ちません。
   - breakpoint ごとの UI policy も持ちません。
   - host presentation は CSS で与えます。

4. **固定 glyph や局所的な装飾は inline SVG を使ってよい**
   - あるコンポーネントにしか存在しない glyph は inline SVG の方が単純です。
   - たとえば control 専用の固定マークはこの対象です。

---

## 資産レイヤー

### 1. アイコン名カタログ

`shared/icons/icons-catalog.ts` は、プロジェクトで許可するアイコン名の単一ソースです。

- `IconName` はここから導出されます。
- 実装側はこの型を正規入力として使います。
- このカタログにない名前は、原則としてプロダクト内で使用しません。

### 2. 生成済み subset

Lucide の必要分だけを抽出した生成物を登録して利用します。

- subset は自動生成物です
- 手編集しません
- カタログ変更後は再生成します

### 3. 登録層

`src/icons/register.ts` は `iconify-icon` への登録を 1 回だけ行う副作用層です。

- 利用者が直接触る API ではありません
- `ui-icon` はここを import して glyph 解決に必要な登録を済ませます

---

## `ui-icon` の公開契約

`src/components/ui/icon/icon.ts` が `ui-icon` の実装本体です。

### 入力

`ui-icon` が公開入力として受け付けるのは次だけです。

- `name`
- `aria-label`

**`icon` 属性はサポートしません。**
`name` が唯一の正規入力です。

### 解釈

- `name` が未指定または空文字なら、`ui-icon` は表示しません
- `name` が非空なら、内部 glyph に `lucide:${name}` を設定します
- `aria-label` があれば semantic icon として扱います
- `aria-label` がなければ decorative icon として扱います

---

## empty / invalid state の契約

`name` が未指定または空文字のとき、`ui-icon` は host に empty state を反映します。  
`name` が非空でも `shared/icons/icons-catalog.ts` に存在しない場合、`ui-icon` は invalid state を反映します。

### 観測可能状態

実装は host に次のいずれかを反映します。

- `data-icon-state="empty"`
- `data-icon-state="invalid"`

### 表示

empty state では host は CSS により非表示になります。

```css
:host([hidden]),
:host([data-icon-state='empty']) {
  display: none;
}
```

### a11y cleanup

empty state では、単に非表示にするだけではなく、意味を持つ画像として露出しないように正規化します。

* host から `role` を外します
* glyph から `icon` を外します
* glyph に `aria-hidden="true"` を付けます
* glyph の `aria-label` を外します

---

## host presentation の契約

`ui-icon` の host presentation は CSS で与えます。

```css
:host {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  flex: 0 0 auto;
}
```

### 重要

* JS から host の `style.display` を直書きしません
* JS から `align-items` / `justify-content` / `line-height` を直書きしません
* host の inline / block size は固定しません

したがって、サイズ責務は利用側コンポーネントで持てます。

---

## アクセシビリティ

### semantic icon

`aria-label` がある場合、`ui-icon` は意味を持つ画像として扱います。

* host に `role="img"` を付けます
* glyph に `aria-hidden="false"` を付けます
* glyph に `aria-label` を付けます

### decorative icon

`aria-label` がない場合、`ui-icon` は装飾目的として扱います。

* host に `role` は付けません
* glyph は `aria-hidden="true"` です
* glyph に `aria-label` は付きません

---

## 責務と非責務

### `ui-icon` が担当すること

* `name` を glyph 名として内部 glyph に反映すること
* decorative / semantic の a11y state を反映すること
* host の最小標準 presentation を提供すること
* empty state を reflected state として表すこと

### `ui-icon` が担当しないこと

* parent layout の制御
* responsive hide/show の主導
* ornament の要否判断
* breakpoint ごとの affordance policy
* parent 側の render omission 判断

---

## 例

```html
<ui-icon name="calendar-clock"></ui-icon>
<ui-icon name="link" aria-label="固定リンク"></ui-icon>
```

---

## 使い分け

### `ui-icon` を使う場面

次のようなケースでは `ui-icon` を使います。

* ナビゲーション
* 状態表示
* ボタン内部の補助 glyph
* 一覧や見出しの補助
* 複数箇所で再利用する icon

### inline SVG を使う場面

次のようなケースでは inline SVG を使ってよいです。

* あるコンポーネントにしか存在しない固定 glyph
* 外部登録を経由せず閉じた描画にしたい場合
* geometry を強く制御したい control glyph

---

## 運用ルール

| 項目           | ルール                                |
| ------------ | ---------------------------------- |
| 正規入力         | `name` のみを使う                       |
| 非推奨ではなく非対応   | `icon` 属性はサポートしない                  |
| semantic 化   | 意味を持たせる場合だけ `aria-label` を与える      |
| 非表示          | `name` が無い場合は empty state として描画しない |
| presentation | host presentation は CSS で与える       |
| サイズ          | `ui-icon` 自身は固定しない。利用側で必要に応じて与える   |
| 再利用 glyph    | `ui-icon` に集約する                    |
| 固定 glyph     | inline SVG を検討してよい                 |

---

## 親コンポーネント側の原則

`ui-icon` は empty / invalid を吸収して collapse できます。  
ただし、親コンポーネントが optional な icon を持つ場合は、**`<ui-icon>` を常に描画して吸収させるのではなく、親側で render omission する** ことを原則とします。

推奨形は次です。

```ts
${icon ? html`<ui-icon name=${icon}></ui-icon>` : nothing}
```

この原則により、親が可視性責務を持ち、`ui-icon` は glyph renderer としての責務に留まります。

---

## 既知の境界

* `ui-icon` は現時点では `HTMLElement` ベースの custom element です
* 本契約は LitElement 化を前提にしません
* 実装詳細ではなく、観測可能な DOM / a11y / CSS 契約を優先します
