# Markdown 記法ガイド（著者向け / 2026-03-09）

## この文書の位置づけ

この文書は、Rouault でノートを書くときの実用的な記法ガイドである。実装上の SoT は [`lib/remark/rouault-directives.ts`](/Users/ruo/Desktop/Programing/Rouault/lib/remark/rouault-directives.ts) と [`docs/markdown-strategy.md`](/Users/ruo/Desktop/Programing/Rouault/docs/markdown-strategy.md) にあるが、ここでは「どう書くか」に絞ってまとめる。

## 基本方針

1. 通常の文章は標準的な Markdown で書く
2. Rouault 固有 UI が必要なときだけ `::directive` を使う
3. 生 HTML は使わない
4. 属性名や値は allowlist 方式なので、未定義のものは書かない

## まず使う基本記法

### 見出し

```markdown
# 大見出し
## 中見出し
### 小見出し
```

### 強調

```markdown
**太字**
*イタリック*
`inline code`
[リンク](https://example.com)
![画像の代替テキスト](/assets/images/example.jpg "キャプション")
```

### リスト

```markdown
- 箇条書き
- 箇条書き

1. 番号付き
2. 番号付き
```

### 引用

```markdown
> 引用文
> 2 行目
```

### コードブロック

````markdown
```ts
const answer = 42;
```
````

### 数式

```markdown
インライン数式 $E = mc^2$

$$
\int_0^1 x^2 dx
$$
```

## Rouault 独自のブロックディレクティブ

ブロックディレクティブは、開始行と終了行を独立させて書く。

```markdown
::directive-name{key="value"}
本文
::
```

注意:

- 開始行は `::name{...}` 形式
- 終了行は必ず `::`
- 属性は `key="value"` 形式
- 未対応属性を書くとビルドエラーになる
- ネストは可能だが、開始と終了の対応を崩さない

### Callout

補足、注意、警告などの強調ブロック。

```markdown
::callout{kind="warning" title="注意"}
この操作は元に戻せません。
::
```

許可属性:

- `kind`
- `variant`
- `title`
- `icon`
- `heading-level`
- `aria-label`

値の制約:

- `kind` / `variant` は `note | tip | success | warning | danger`
- `kind` と `variant` を同時指定する場合は同じ値にする
- `heading-level` は `1` から `6`

| 属性 | 役割 | 値 |
|---|---|---|
| `kind` | callout の種別を指定する | `note`, `tip`, `success`, `warning`, `danger` |
| `variant` | `kind` の別名。見た目上のバリエーションを指定する | `note`, `tip`, `success`, `warning`, `danger` |
| `title` | callout 見出しの文言 | 任意の文字列 |
| `icon` | コンポーネント側で使うアイコン名 | 任意の文字列 |
| `heading-level` | タイトル見出しレベル | `1` から `6` の整数 |
| `aria-label` | 補助技術向けラベル | 任意の文字列 |

### Code Group

複数のコード例を並べる。

````markdown
::code-group{aria-label="実装比較"}
```ts filename="valid.ts" label="正しい例"
const value = 1;
```
```ts filename="invalid.ts" label="誤り例"
const value = "1";
```
::
````

ディレクティブ属性:

- `aria-label`

内包するコードブロックのメタ属性:

- `filename`
- `label`

| 属性 | 役割 | 値 |
|---|---|---|
| `aria-label` | code group 全体の説明ラベル | 任意の文字列 |
| `filename` | コードブロック名やファイル名表示 | 任意の文字列 |
| `label` | 各コード例の補助ラベル | 任意の文字列 |

### Code Preview

プレビュー領域とコードをセットで見せる。

````markdown
::code-preview{label="ボタン例" preview-padding="compact" preview-align="center"}
::preview
ここにプレビュー内容を書く
::
::toolbar
ここに補助 UI を書く
::
```html
<button>例</button>
```
::
````

許可属性:

- `label`
- `preview-padding`
- `preview-align`

値の制約:

- `preview-padding` は `normal | compact | none`
- `preview-align` は `center | start | stretch`

| 属性 | 役割 | 値 |
|---|---|---|
| `label` | code preview 全体の名前 | 任意の文字列 |
| `preview-padding` | preview スロット内余白の密度 | `normal`, `compact`, `none` |
| `preview-align` | preview 領域内の配置方針 | `center`, `start`, `stretch` |

補足:

- `::preview` と `::toolbar` はこのブロック内で使う
- `::toolbar` は任意

### Details

開閉可能な補足領域。

```markdown
::details{aria-label="補足を開閉" summary="補足情報" open="true" variant="bordered"}
ここに詳細を書く
::
```

許可属性:

- `aria-label`
- `summary`
- `open`
- `variant`
- `region`

値の制約:

- `aria-label` は必須
- `open` と `region` は真偽値
- `variant` は `default | bordered`

| 属性 | 役割 | 値 |
|---|---|---|
| `aria-label` | 開閉 UI 全体のアクセシブル名。必須 | 任意の文字列 |
| `summary` | トグル見出しの表示文言 | 任意の文字列 |
| `open` | 初期状態を開いたままにする | 真偽値 |
| `variant` | 外観の種類 | `default`, `bordered` |
| `region` | 内容領域を landmark/region として扱いたい場合に使う | 真偽値 |

### Info Box

独立した情報ブロック。

```markdown
::info-box{heading="作品情報" icon="book" heading-level="3" landmark="true" variant="filled"}
ここに説明を書く
::
```

許可属性:

- `heading`
- `icon`
- `heading-level`
- `landmark`
- `variant`

値の制約:

- `heading-level` は `1` から `6`
- `landmark` は真偽値
- `variant` は `default | filled`

| 属性 | 役割 | 値 |
|---|---|---|
| `heading` | info box 見出し | 任意の文字列 |
| `icon` | 見出し横などに出すアイコン名 | 任意の文字列 |
| `heading-level` | 見出しレベル | `1` から `6` の整数 |
| `landmark` | 独立した landmark として扱いたい場合に使う | 真偽値 |
| `variant` | 外観の種類 | `default`, `filled` |

### Score

譜例やスコア表示用の埋め込み。

```markdown
::score{src="/scores/example.svg" label="譜例" caption="譜例1" loading="lazy"}
::
```

許可属性:

- `src`
- `caption`
- `label`
- `description`
- `aspect-ratio`
- `loading`
- `primary`

値の制約:

- `loading` は `lazy | eager`
- `primary` は真偽値

| 属性 | 役割 | 値 |
|---|---|---|
| `src` | 譜例データの参照先 | パスまたは URL 文字列 |
| `caption` | キャプション | 任意の文字列 |
| `label` | 補助ラベル | 任意の文字列 |
| `description` | 補助説明 | 任意の文字列 |
| `aspect-ratio` | アスペクト比ヒント | 任意の文字列 |
| `loading` | 読み込み方針 | `lazy`, `eager` |
| `primary` | 主要な譜例として扱うフラグ | 真偽値 |

### Tabs

タブ UI を構成する。

```markdown
::tabs{selected-index="0" orientation="horizontal"}
::tab{value="overview"}
概要
::
::panel
概要の内容
::
::tab{value="details"}
詳細
::
::panel
詳細の内容
::
::
```

親ディレクティブ属性:

- `selected-index`
- `selected-value`
- `orientation`
- `automatic-activation`

子ディレクティブ:

- `::tab{value="..."}`
- `::panel`

値の制約:

- `selected-index` は `0` 以上の整数
- `orientation` は `horizontal | vertical`
- `automatic-activation` は真偽値

| 属性 | 役割 | 値 |
|---|---|---|
| `selected-index` | 初期選択する tab の番号 | `0` 以上の整数 |
| `selected-value` | 初期選択する tab の値 | 任意の文字列 |
| `orientation` | タブ並び方向 | `horizontal`, `vertical` |
| `automatic-activation` | フォーカス移動で自動選択するか | 真偽値 |
| `value` | `tab` 個別の識別子 | 任意の文字列 |

補足:

- `tab` と `panel` の整合性は、現状は著者側で保つ
- `value` は `selected-value` と対応させる

### Translation

原文と訳文を対で示す。

属性で完結させる書き方:

```markdown
::translation{lang="fr" target-lang="ja" render-mode="drawer" original="Je pense, donc je suis." translated="我思う、ゆえに我あり。"}
::
```

本文から拾わせる書き方:

```markdown
::translation{lang="fr" target-lang="ja"}
Je pense, donc je suis.

我思う、ゆえに我あり。
::
```

許可属性:

- `original`
- `translated`
- `lang`
- `target-lang`
- `render-mode`
- `open`

値の制約:

- `render-mode` は `popover | drawer | interlinear`
- `open` は真偽値

| 属性 | 役割 | 値 |
|---|---|---|
| `original` | 原文テキスト | 任意の文字列 |
| `translated` | 訳文テキスト | 任意の文字列 |
| `lang` | 原文の言語コード | 任意の文字列 |
| `target-lang` | 訳文の言語コード | 任意の文字列 |
| `render-mode` | 表示モード | `popover`, `drawer`, `interlinear` |
| `open` | 初期表示を開いた状態にする | 真偽値 |

補足:

- `original` 未指定なら 1 段落目から補完
- `translated` 未指定なら 2 段落目から補完
- 最終出力では子要素は保持されず、属性へ昇格される

## スロット用ディレクティブ

次の 4 つは単独で意味を持つ UI ではなく、親ディレクティブの内部構造を作るための記法である。

### Preview

```markdown
::preview
プレビュー内容
::
```

属性は使えない。

### Toolbar

```markdown
::toolbar
補助操作
::
```

属性は使えない。

### Tab

```markdown
::tab{value="overview"}
概要
::
```

許可属性:

- `value`

| 属性 | 役割 | 値 |
|---|---|---|
| `value` | tab の識別子。`tabs.selected-value` と対応付ける | 任意の文字列 |

### Panel

```markdown
::panel
ここにタブ本文
::
```

属性は使えない。

## インライン拡張記法

### Highlight

```markdown
==重要==
:highlight[検索ヒット]{origin="search" current="true"}
```

値の制約:

- `origin` は `search | user`
- `current` は真偽値

| 属性 | 役割 | 値 |
|---|---|---|
| `origin` | ハイライトの由来 | `search`, `user` |
| `current` | 現在選択中のヒットかどうか | 真偽値 |

補足:

- `==text==` は常に `origin="user"`

### Emoji

```markdown
:emoji[😀]{aria-label="笑顔"}
```

許可属性:

- `label`
- `aria-label`

| 属性 | 役割 | 値 |
|---|---|---|
| `label` | `aria-label` の別名 | 任意の文字列 |
| `aria-label` | 絵文字の読み上げラベル | 任意の文字列 |

補足:

- `label` も `aria-label` として扱われる
- ラベルがあると `role="img"` が付く

### Superscript / Subscript

```markdown
H~2~O
x^2^

:subscript[2]
:superscript[2]
```

属性は使えない。

### Emoji Shortcodes

次の shortcodes は絵文字へ展開される。

```markdown
:smile:
:thinking:
:sparkles:
```

対応 shortcode:

- `smile`
- `grin`
- `joy`
- `thinking`
- `sparkles`
- `warning`
- `fire`
- `heart`
- `check`
- `x`
- `memo`
- `book`
- `music`
- `bulb`

## 真偽値の書き方

真偽値属性は次を受け付ける。

- 真: `true`, `1`, `on`, `yes`
- 偽: `false`, `0`, `off`, `no`

ただし、実装上は `true` 側だけが最終属性として出力されるケースが多い。迷ったら `true` / `false` を使う。

## エラーになりやすい書き方

### 生 HTML を書く

```markdown
<div>これは不可</div>
```

HTML は禁止されている。

### 未対応属性を書く

```markdown
::callout{color="red"}
本文
::
```

`color` は未対応なのでエラーになる。

### 終端 `::` を閉じ忘れる

```markdown
::callout{kind="note"}
閉じ忘れ
```

終了行が無いとエラーになる。

### enum の値を間違える

```markdown
::details{aria-label="補足" variant="outline"}
本文
::
```

`outline` は未対応なのでエラーになる。

## 書き分けの目安

1. 文章中心なら通常 Markdown を使う
2. 注意喚起や補足なら `callout` / `details` / `info-box`
3. 複数コード比較なら `code-group`
4. UI 例とコードを一緒に見せるなら `code-preview`
5. 構造化された比較なら `tabs`
6. 原文と訳文なら `translation`

## 関連文書

- [`docs/markdown-strategy.md`](/Users/ruo/Desktop/Programing/Rouault/docs/markdown-strategy.md)
- [`lib/remark/rouault-directives.ts`](/Users/ruo/Desktop/Programing/Rouault/lib/remark/rouault-directives.ts)
