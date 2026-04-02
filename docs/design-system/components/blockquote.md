# Blockquote

## 概要

本書は、Rouault における blockquote の長期的な公開契約を定義するものです。

note 本文における blockquote の正本は、**静的な `blockquote` または `figure > blockquote + figcaption > cite`** です。  
`ui-blockquote` は互換入力または non-note 面で残り得ますが、note 本文の最終 DOM 契約としては採用しません。

blockquote の責務は、**引用本文を意味的に表現すること**です。出典がある場合のみ、それを引用本文の下位に静的な補助情報として配置します。

---

## 適用範囲

本書は次を対象とします。

- note 本文における blockquote の最終 DOM 契約
- 出典有無による構造契約
- `cite` / `lang` / `variant` の正規化契約
- Accessibility 契約
- 互換経路の扱い

本書は次を対象外とします。

- Markdown 記法の解釈規則そのもの
- 引用文の真正性検証
- 引用元 URL の疎通確認
- 翻訳や自動言語判定
- citation system 全体
- `ui-blockquote` の内部実装詳細

---

## 設計判断

長期保守性の観点から、note 本文で `ui-blockquote` を最終 DOM に残す構造は採りません。  
本文経路では、**build-time で `blockquote` または `figure > blockquote + figcaption > cite` を直接出力する**方針を採ります。

これにより、次を満たします。

- 引用の意味構造が最終 DOM で直接読める
- prose CSS が custom element selector に依存しない
- hydration 対象から外せる
- directive 経路と HTML 正規化経路を同じ最終 DOM へ収束できる

---

## 公開契約

### 正規出力

出典なしの最小形は次です。

```html
<blockquote>
  <p>引用本文</p>
</blockquote>
```

出典ありの正規形は次です。

```html
<figure>
  <blockquote cite="https://example.com" lang="fr" data-blockquote-variant="nested">
    <p>引用本文</p>
  </blockquote>
  <figcaption>
    <cite>出典</cite>
  </figcaption>
</figure>
```

### 入力契約

| 名前                       | 種別            | 必須   | 内容                 | 契約                                                        |
| -------------------------- | --------------- | ------ | -------------------- | ----------------------------------------------------------- |
| `source`                   | build-time 入力 | いいえ | プレーンテキスト出典 | 出典がある場合に `figcaption > cite` を構成してよい         |
| `slot="source"` 相当       | 互換入力        | いいえ | リッチ出典内容       | 可視出典として優先してよい                                  |
| `cite`                     | build-time 入力 | いいえ | 引用元 URL           | 非空なら `blockquote[cite]` に正規化してよい                |
| `quote-lang` / `quoteLang` | build-time 入力 | いいえ | 引用本文の言語       | 非空なら `blockquote[lang]` に正規化してよい                |
| `variant`                  | build-time 入力 | いいえ | 表示バリアント       | `default` 以外なら `data-blockquote-variant` を付与してよい |

### 構造契約

- 出典がない場合、最終 DOM は `blockquote` です。
- 出典がある場合、最終 DOM は `figure > blockquote + figcaption > cite` です。
- 引用本文は常に `blockquote` 内に保持しなければなりません。
- 出典は引用本文の補助情報として `figcaption` 側へ置きます。
- note 本文の最終 DOM に `ui-blockquote` を残してはなりません。

---

## DOM / Accessibility

### Accessibility 契約

- 引用本文の主体は常にネイティブ `blockquote` です。
- 出典は `figcaption` / `cite` により補助情報として表現します。
- 追加の interactive role は持ちません。
- 引用言語が分かる場合は `blockquote[lang]` を付与してよいものとします。

---

## Visual Contract

blockquote は本文から静かに分離される必要があります。

視覚契約は次のとおりです。

- 本文と区別できるが、callout ほど強くは主張しない
- 出典は引用本文より従属的に見えること
- `nested` 等の差分があっても、意味論は変えないこと
- 装飾は引用内容の可読性を優先すること

---

## note 本文と互換経路

`ui-blockquote` は互換入力として受理してよいですが、note 本文の最終 DOM では採用しません。
本文では、次を固定します。

- `ui-blockquote` を `blockquote` または `figure > blockquote + figcaption` へ正規化する
- prose CSS は静的要素を対象にする
- note hydration では blockquote を数えない
