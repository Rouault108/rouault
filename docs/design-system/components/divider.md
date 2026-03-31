# Divider

## 概要

本書は、Rouault における divider の長期的な公開契約を定義するものです。

note 本文における divider の正本は、**静的な `hr[data-divider-variant]`** です。  
`ui-divider` は non-note 面または互換用途で残り得ますが、note 本文の最終 DOM 契約としては採用しません。

divider の責務は、本文またはレイアウトの流れに**控えめな区切り**を与えることです。対話状態、独自キーボード操作、独自 ARIA ロールは持ちません。意味論はネイティブ `hr` によって成立させます。

---

## 適用範囲

本書は、次の事項を対象とします。

- note 本文における divider の最終 DOM 契約
- `data-divider-variant` の値契約
- 視覚契約
- Accessibility 契約
- 互換経路の扱い

本書は次の事項を対象外とします。

- 編集上どこに区切りを入れるべきかという判断
- ページ全体の余白設計
- 縦方向 separator
- interactive separator
- `ui-divider` の内部実装詳細

---

## 設計判断

長期保守性の観点から、note 本文で `ui-divider` を通して `hr` を出す構造は採りません。  
本文経路では、**build-time で `hr[data-divider-variant]` を直接出力する**方針を採ります。

これにより、次を満たします。

- 最終 DOM が単純になる
- prose CSS を custom element selector へ依存させない
- hydration 対象から外せる
- SSR / build / runtime の責務境界が明確になる

---

## 公開契約

### 正規出力

note 本文の正規出力は次です。

```html
<hr data-divider-variant="section" />
```

または

```html
<hr data-divider-variant="layout" />
```

### 入力契約

| 名前        | 種別            | 必須  | 内容        | 契約                                     |
| --------- | ------------- | --- | --------- | -------------------------------------- |
| `variant` | build-time 由来 | いいえ | 区切り線の用途種別 | `section` / `layout`。既定値は `section` です |

### 値契約

`data-divider-variant` は `section` または `layout` を受理します。
列挙外値は note 本文では **`section` へ正規化**してよいものとします。

### 最終 DOM 契約

* note 本文の最終 DOM では、divider の主体は常に `hr` です。
* note 本文の最終 DOM に `ui-divider` を残してはなりません。
* `hr` に `role` や `tabindex` を付与してはなりません。
* `data-divider-variant` は視覚識別と文書契約のための公開属性です。

---

## DOM / Accessibility

divider はネイティブ `hr` の意味論に依存します。
したがって、追加の ARIA ロールや対話属性は不要です。

### Accessibility 契約

* divider はネイティブ `hr` により区切りを表現します。
* 独自の操作対象ではありません。
* 支援技術に対して過剰な状態公開を行ってはなりません。

---

## Visual Contract

divider は、本文の読書リズムを壊さない**静かな境界**として描画します。

視覚契約は次のとおりです。

* 見出しや callout より強く主張しないこと
* 本文フロー内で過度な高さを取らないこと
* 色や線の強度は本文より控えめであること
* `section` / `layout` の意味分類は保持してよいが、差分は控えめでよい

---

## note 本文と互換経路

`ui-divider` 実装は non-note 面で残り得ます。
ただし、note 本文については次を固定します。

* build-time で `hr[data-divider-variant]` を正本として出力する
* prose CSS は `hr[data-divider-variant]` を対象にする
* note hydration では divider を数えない
