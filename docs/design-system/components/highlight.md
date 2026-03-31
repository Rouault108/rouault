# Highlight

## 概要

本書は、Rouault における highlight の長期的な公開契約を定義するものです。

note 本文における highlight の正本は、**静的な `mark[data-current-match]`** です。  
`ui-highlight` は non-note 面または互換用途で残り得ますが、note 本文の最終 DOM 契約としては採用しません。

highlight の責務は、本文中の一部文字列を**意味的に mark された箇所**として表現することです。検索 current 状態のような補助状態は `data-current-match` で示しますが、検索 UI 全体の責務までは持ちません。

---

## 適用範囲

本書は次を対象とします。

- note 本文における最終 DOM 契約
- `data-current-match` の状態契約
- Accessibility 契約
- 視覚契約
- 互換経路の扱い

本書は次を対象外とします。

- 検索語抽出アルゴリズム
- 検索ヒット集合の管理
- 検索移動、スクロール同期、検索 UI 全体
- annotation 機能一般
- global search state の ownership
- `ui-highlight` の内部実装詳細

---

## 設計判断

長期保守性の観点から、note 本文で `ui-highlight` を通して `<mark>` を描く構造は採りません。  
本文経路では、**build-time で `mark[data-current-match]` を直接出力する**方針を採ります。

これにより、次を満たします。

- 最終 DOM が単純になる
- CSS が custom element selector に依存しない
- hydration 対象から外せる
- search dialog 等の non-note 面と本文面の責務を分離できる

---

## 公開契約

### 正規出力

note 本文の正規出力は次です。

```html
<mark>検索語</mark>
```

current 状態を持つ場合は次です。

```html
<mark data-current-match="true">検索語</mark>
```

### 入力契約

| 名前                                          | 種別            | 必須  | 内容                | 契約                                            |
| ------------------------------------------- | ------------- | --- | ----------------- | --------------------------------------------- |
| `current-match`                             | build-time 入力 | いいえ | current 検索ヒットかどうか | `data-current-match="true"` へ正規化してよい          |
| `data-current-match`                        | 互換入力          | いいえ | current 検索ヒットかどうか | 正規入力として扱ってよい                                  |
| `current` / `data-current` / `aria-current` | 旧互換入力         | いいえ | legacy current 表現 | note 本文では `data-current-match="true"` へ吸収してよい |

### 最終 DOM 契約

* note 本文の最終 DOM に `ui-highlight` を残してはなりません。
* highlight の意味主体は常にネイティブ `mark` です。
* current 状態は `data-current-match="true"` で表現します。
* current でない場合は `data-current-match` を省略してよいものとします。

---

## DOM / Accessibility

highlight はネイティブ `mark` の意味論に依存します。
追加ロールやキーボード操作は持ちません。

### Accessibility 契約

* current 状態を持っても、独自の操作対象にはしません。
* ARIA の自動付与は必須契約に含めません。
* まず `mark` の意味論を維持することを優先します。

---

## Visual Contract

highlight は本文フローと自然に統合される必要があります。

視覚契約は次のとおりです。

* 通常の highlight は過度に強調しない
* current 状態は非 current 状態と識別可能であること
* ただし、本文読解を阻害する強いアニメーションや点滅に依存しない
* 背景色や下線などの差分は、本文可読性を損なわない範囲に留める

---

## note 本文と互換経路

`ui-highlight` 実装は search dialog 等の non-note 面で残り得ます。
ただし、note 本文については次を固定します。

* build-time で `mark[data-current-match]` を正本として出力する
* prose CSS は `mark[data-current-match]` を対象にする
* note hydration では highlight を数えない

---

## 完了条件

本書の契約が満たされたと見なす条件は次です。

* note 最終 DOM に `ui-highlight` が現れない
* note 本文 CSS が `ui-highlight > mark` に依存しない
* `mark[data-current-match]` が正本として文書化されている