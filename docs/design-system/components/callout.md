# Callout

## 概要

本書は、Rouault における callout の長期的な公開契約を定義するものです。

note 本文における callout の正本は、**`aside[data-callout][data-callout-kind]`** です。  
`ui-callout` は互換入力または non-note 面で残り得ますが、note 本文の最終 DOM 契約としては採用しません。

callout の責務は、本文フローの中で、注意・補足・警告・成功などの**意味トーンを持つ補助ブロック**を静的に提示することです。  
callout は widget ではありません。独自状態機械、開閉、dismiss、キーボード操作、hydration 前提の振る舞いは持ちません。

---

## 適用範囲

本書は次を対象とします。

- note 本文における callout の最終 DOM 契約
- `data-callout-kind` の値契約
- heading / label / icon / heading-level の静的正規化契約
- Accessibility 契約
- 視覚契約
- 互換経路の扱い

本書は次を対象外とします。

- dismiss / collapse / toast のような一時 UI
- 通知センターやアプリケーション alert system
- action button を伴う複合 widget
- icon registry の内部実装
- `ui-callout` の内部実装詳細

---

## 設計判断

長期保守性の観点から、note 本文で `ui-callout` を最終 DOM に残す構造は採りません。  
本文経路では、**build-time で `aside[data-callout][data-callout-kind]` を直接出力する**方針を採ります。

これにより、次を満たします。

- callout の意味トーンが最終 DOM で直接読める
- prose CSS が custom element selector に依存しない
- hydration 対象から外せる
- directive 経路と HTML 正規化経路を同じ最終 DOM に収束できる
- icon / heading / body の ownership を静的 DOM 側へ寄せられる

---

## 公開契約

### 正規出力

最小形は次です。

```html
<aside data-callout="true" data-callout-kind="info">
  <div data-callout-body>
    <p>本文</p>
  </div>
</aside>
```

heading を持つ正規形は次です。

```html
<aside data-callout="true" data-callout-kind="warning" aria-labelledby="callout-heading-1">
  <div data-callout-header>
    <span data-callout-icon aria-hidden="true">
      <!-- inline SVG or equivalent static icon -->
    </span>
    <div id="callout-heading-1" role="heading" aria-level="3">注意</div>
  </div>
  <div data-callout-body>
    <p>本文</p>
  </div>
</aside>
```

### 入力契約

| 名前            | 種別            | 必須   | 内容               | 契約                                                            |
| --------------- | --------------- | ------ | ------------------ | --------------------------------------------------------------- |
| `kind`          | build-time 入力 | いいえ | 意味トーン         | `data-callout-kind` へ正規化します。既定値は `info` です        |
| `heading`       | build-time 入力 | いいえ | 見出し文字列       | 非空なら header を構成してよい                                  |
| `label`         | 互換入力        | いいえ | heading の互換入力 | `heading` と同義として扱ってよい                                |
| `icon`          | build-time 入力 | いいえ | 補助アイコン       | header がある場合に限り描画へ参加してよい                       |
| `heading-level` | build-time 入力 | いいえ | 見出し階層         | `1`-`6` の有効整数なら heading role / aria-level を付与してよい |
| `title`         | 旧互換入力      | いいえ | legacy heading 値  | `heading` へ吸収してよい                                        |

### kind 値契約

`data-callout-kind` は次の列挙値を受理します。

- `info`
- `note`
- `tip`
- `warning`
- `caution`
- `danger`
- `success`

列挙外値は、note 本文では **`info` へ正規化**してよいものとします。

### 最終 DOM 契約

- note 本文の正規 root は `aside[data-callout][data-callout-kind]` です。
- body は常に静的コンテナとして保持しなければなりません。
- heading がある場合のみ header を構成してよいものとします。
- icon は補助情報であり、本文意味論の主体ではありません。
- note 本文の最終 DOM に `ui-callout` を残してはなりません。

---

## 構造契約

### body

- 本文内容は `data-callout-body` を持つ静的コンテナ内へ保持します。
- 段落、リスト、コードブロック、引用など、通常の prose 内容を含んでよいものとします。
- 本文内容を header 側へ混在させてはなりません。

### header

- heading が存在する場合のみ `data-callout-header` を構成してよいものとします。
- header は heading と icon を含んでよいものとします。
- heading がない場合、header 全体を省略してよいものとします。

### heading

- heading が存在する場合、`role="heading"` と `aria-level` を付与してよいものとします。
- `heading-level` が無効または欠落している場合、既定の見出し階層を実装で選んでよいですが、本文階層を破壊しないことを優先します。
- `aria-labelledby` は heading 要素を参照してよいものとします。

### icon

- icon は静的に描画してよいものとします。
- note 本文正本では、icon 供給は runtime 登録に依存しない方式が望まれます。
- icon は `aria-hidden="true"` を付与してよいものとします。

---

## DOM / Accessibility

callout は本文の補助ブロックであり、dialog や alertdialog のような interactive role は持ちません。
主体はあくまで静的な補助セクションです。

### Accessibility 契約

- root は `aside` を使用します。
- heading がある場合は `aria-labelledby` により名前付けしてよいものとします。
- heading がない場合、無理に name を付与しなくてよいものとします。
- icon は装飾目的なら `aria-hidden="true"` としてよいものとします。
- `role="alert"` は既定契約に含めません。
- dismiss や collapse を持たない以上、追加キーボード操作は不要です。

---

## Visual Contract

callout は本文から意味的に一段切り出された補助面として見える必要があります。

視覚契約は次のとおりです。

- kind ごとの差分は、意味トーンとして識別できること
- ただし本文可読性を壊すほど強く主張しないこと
- heading がある場合、body より上位情報として読めること
- icon は heading を補助してよいが、icon の有無だけで意味を伝え切ってはなりません
- 枠線、背景、帯などのスタイルは static selector で制御すること

---

## note 本文と互換経路

`ui-callout` は互換入力として受理してよいですが、note 本文の最終 DOM では採用しません。
本文では、次を固定します。

- `ui-callout` を `aside[data-callout][data-callout-kind]` へ正規化する
- directive 出力経路と HTML 正規化経路を同じ最終 DOM へ収束させる
- prose CSS は `[data-callout]` を対象にする
- note hydration では callout を数えない

---

## 実装上の指針

- kind の既定値は `info` とします。
- heading と body の責務を分離します。
- icon 供給方式は、note 本文正本では static-first を優先します。
- `ui-callout` 固有の runtime ownership を note 本文へ持ち込んではなりません。

---

## 完了条件

本書の契約が満たされたと見なす条件は次です。

- note 最終 DOM に `ui-callout` が現れない
- `aside[data-callout][data-callout-kind]` が正本として文書化されている
- directive 経路と HTML 正規化経路が同じ最終 DOM に収束する
- prose CSS が `ui-callout` ではなく `[data-callout]` を対象にしている
