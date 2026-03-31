# Info Box

## 概要

本書は、Rouault における info-box の長期的な公開契約を定義するものです。

note 本文における info-box の正本は、**`section[data-info-box][data-variant][data-density]`** です。  
`ui-info-box` は互換入力または non-note 面で残り得ますが、note 本文の最終 DOM 契約としては採用しません。

info-box の責務は、**価値中立な参照情報を静的コンテナとして提示すること**です。警告通知や interactive widget の責務は持ちません。

---

## 適用範囲

本書は次を対象とします。

- note 本文における最終 DOM 契約
- heading / icon / heading-level / landmark / variant / density の静的正規化
- 空内容の非描画契約
- Accessibility 契約
- 互換経路の扱い

本書は次を対象外とします。

- dismiss / collapse などのインタラクション
- 警告 / 成功 / エラーの意味トーン体系
- action slot
- rich heading slot
- icon system 全体の供給方式詳細
- `ui-info-box` の内部実装詳細

---

## 設計判断

長期保守性の観点から、note 本文で `ui-info-box` を最終 DOM に残す構造は採りません。  
本文経路では、**build-time で `section[data-info-box]` を直接出力する**方針を採ります。

これにより、次を満たします。

- 文書コンテナとしての意味が最終 DOM で直接読める
- prose CSS が custom element selector に依存しない
- hydration 対象から外せる
- heading / landmark / empty-content 判定を build-time に寄せられる

---

## 公開契約

### 正規出力

```html
<section
  data-info-box="true"
  data-variant="filled"
  data-density="compact"
  role="region"
  aria-labelledby="info-box-heading-1"
>
  <div data-info-box-header>
    <div id="info-box-heading-1" role="heading" aria-level="3">作品情報</div>
  </div>
  <div data-info-box-body>
    <p>内容</p>
  </div>
</section>
````

### 入力契約

| 名前              | 種別            | 必須  | 内容       | 契約                                                           |
| --------------- | ------------- | --- | -------- | ------------------------------------------------------------ |
| `heading`       | build-time 入力 | いいえ | ヘッダー文字列  | 非空なら header を構成してよい                                          |
| `icon`          | build-time 入力 | いいえ | アイコン     | header がある場合のみ描画に参加してよい                                      |
| `heading-level` | build-time 入力 | いいえ | 見出し階層    | `1`-`6` の有効整数なら heading role / aria-level を付与してよい            |
| `landmark`      | build-time 入力 | いいえ | region 化 | heading と heading-level と非空内容が揃う場合のみ `role="region"` を付与してよい |
| `variant`       | build-time 入力 | いいえ | 視覚バリアント  | `default` / `filled`。列挙外値は `default` へ正規化してよい                |
| `density`       | build-time 入力 | いいえ | 視覚密度     | `comfortable` / `compact`。列挙外値は `comfortable` へ正規化してよい       |

### 最終 DOM 契約

* note 本文の正規 root は `section[data-info-box]` です。
* `variant` と `density` は `data-variant` / `data-density` に正規化してよいものとします。
* body は静的コンテナとして保持します。
* heading がある場合のみ header を構成してよいものとします。
* 空内容の場合は非描画としてよいものとします。
* note 本文の最終 DOM に `ui-info-box` を残してはなりません。

---

## DOM / Accessibility

### Landmark 契約

`role="region"` を付与してよいのは、次の条件が全て満たされる場合だけです。

1. heading が存在する
2. heading-level が有効である
3. body が非空である

この場合、heading 要素を `aria-labelledby` で参照してよいものとします。

### Accessibility 契約

* info-box は静的情報コンテナです。
* interactive role を持ってはなりません。
* heading がある場合は、その見出し構造を明確にします。
* landmark は条件付きでのみ公開します。
* 空内容で意味ロールだけが残る状態を作ってはなりません。

---

## Visual Contract

info-box は読書面で静かに情報を切り出すコンテナである必要があります。

視覚契約は次のとおりです。

* callout ほど強く主張しないこと
* heading と body の階層が明確であること
* `filled` は面を持つが、警告バナーのように強すぎないこと
* `density` は空間密度だけを変え、意味は変えないこと

---

## note 本文と互換経路

`ui-info-box` は互換入力として受理してよいですが、note 本文の最終 DOM では採用しません。
本文では、次を固定します。

* `ui-info-box` を `section[data-info-box]` へ正規化する
* prose CSS は `[data-info-box]` を対象にする
* note hydration では info-box を数えない