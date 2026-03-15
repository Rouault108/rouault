# メモの記述方法ガイド（著者向け / 2026-03-15）

## この文書の位置づけ

この文書は、Rouault でノートを書く人のための実用ガイドである。実装上の SoT は [`velite.config.ts`](/Users/ruo/Desktop/Programing/Rouault/velite.config.ts) と [`docs/markdown-strategy.md`](/Users/ruo/Desktop/Programing/Rouault/docs/markdown-strategy.md) にあるが、ここでは「著者がどう書くか」に絞ってまとめる。

## まず押さえる方針

1. ふだんの本文は標準的な Markdown で書く
2. 補足 UI が必要なときだけ `::directive` を使う
3. 生 HTML は書かない
4. frontmatter には必要なメタデータだけを書く

## 基本のファイル構成

1 つのメモは、frontmatter と本文で構成する。

```markdown
---
title: "メモのタイトル"
description: "一覧や検索で使う短い説明"
date: 2026-03-14
updated: 2026-03-15
genre:
  - architecture
  - lit
status: wip
sidebarIcon: lucide:file-text
---

# メモのタイトル

本文をここから書く。
```

## Frontmatter の書き方

frontmatter はファイル先頭の `---` で囲まれた領域に書く。YAML 形式で記述する。

### 最低限おすすめの項目

```yaml
---
title: "Router 設計メモ"
description: "ルーティングの責務分割とイベント境界を整理するメモ"
date: 2026-03-14
genre:
  - architecture
  - router
---
```

### 書ける項目

| 項目 | 必須 | 内容 |
|---|---|---|
| `title` | 必須 | ノートタイトル |
| `description` | 任意 | 一覧、検索、OG などで使う短い説明 |
| `date` | 任意 | 作成日。`YYYY-MM-DD` の ISO 日付で書く |
| `updated` | 任意 | 更新日。`YYYY-MM-DD` の ISO 日付で書く |
| `genre` | 任意 | 分類用の文字列配列 |
| `sidebarIcon` | 任意 | サイドバーで使うアイコン名 |
| `cover` | 任意 | カバー画像のパスまたは URL |
| `license` | 任意 | ライセンス名 |
| `licenseNote` | 任意 | ライセンスに関する補足 |
| `status` | 任意 | 公開状態 |

### 各項目の補足

- `title`: 本文の先頭見出しと揃えておくと管理しやすい。
- `description`: 1 文で簡潔に書く。本文冒頭の導入をそのまま入れるより、検索で見分けやすい要約にする。
- `date`: メモの初出日。並び順や表示日付の基準になる。
- `updated`: 後から大きく更新した日。検索のソートにも使われる。
- `genre`: タグに近いが、現状は frontmatter 上の分類フィールドとして扱う。空文字は入れない。
- `sidebarIcon`: `lucide:file-text` のような Iconify 形式の名前を書ける。`file` を指定すると既定のファイルアイコンになる。`none` を指定すると非表示にできる。
- `status`: `draft` `archived` `wip` `deprecated` を使える。`draft` は公開対象から外れる。

### 書かない項目

以下はシステム側で決まるので、通常は frontmatter に書かない。

- `slug`: ファイルパスから自動で決まる
- `content`: 本文から自動生成される
- `excerpt`: 本文から自動生成される
- `toc`: 見出しから自動生成される
- `permalink`: `/notes/...` 形式で自動生成される

### Frontmatter の注意

- 日付は `2026-03-14` のように書く
- `genre` は YAML 配列で書く
- 未定義の項目は追加しない
- 値が無い項目は無理に書かない

悪い例:

```yaml
---
title: Router 設計
date: 03/14/2026
tags: [router, design]
---
```

この例は `date` の形式が不正で、`tags` も未定義である。

## 本文の基本記法

### 見出し

```markdown
# 大見出し
## 中見出し
### 小見出し
```

### 強調とリンク

```markdown
**太字**
*イタリック*
`inline code`
[リンク](https://example.com)
![画像の代替テキスト](/assets/images/example.jpg "キャプション")
```

画像の拡大を無効化したい場合は、画像記法の直後に属性ブロックを書く。

```markdown
![画像の代替テキスト](/assets/images/example.jpg "キャプション"){zoomable="false"}
```

補足:

- 現在サポートしている画像属性は `zoomable` のみ
- 既定値は `true`
- 値は `true` / `false` で書く

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

ブロックディレクティブは、開始行と終了行を分けて書く。

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
- 生 HTML の代わりとして使う

### Callout

補足、注意、警告などの強調ブロック。

```markdown
::callout{kind="warning" title="注意"}
この操作は元に戻せません。
::
```

| 属性 | 内容 | 値 |
|---|---|---|
| `kind` | 種別 | `note`, `tip`, `success`, `warning`, `danger` |
| `variant` | `kind` の別名 | `note`, `tip`, `success`, `warning`, `danger` |
| `title` | 見出し文言 | 任意の文字列 |
| `icon` | アイコン名 | 任意の文字列 |
| `heading-level` | 見出しレベル | `1` から `6` |
| `aria-label` | 補助技術向けラベル | 任意の文字列 |

補足:

- `kind` と `variant` を同時指定する場合は同じ値にする

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

| 属性 | 内容 | 値 |
|---|---|---|
| `aria-label` | 全体の説明ラベル | 任意の文字列 |
| `filename` | 各コードブロックのファイル名表示 | 任意の文字列 |
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

| 属性 | 内容 | 値 |
|---|---|---|
| `label` | code preview 全体の名前 | 任意の文字列 |
| `preview-padding` | プレビュー余白 | `normal`, `compact`, `none` |
| `preview-align` | プレビュー配置 | `center`, `start`, `stretch` |

補足:

- `::preview` は必須
- `::toolbar` は任意

### Details

開閉可能な補足領域。

```markdown
::details{aria-label="補足を開閉" summary="補足情報" open="true" variant="bordered"}
ここに詳細を書く
::
```

| 属性 | 内容 | 値 |
|---|---|---|
| `aria-label` | アクセシブル名 | 任意の文字列 |
| `summary` | トグル見出し | 任意の文字列 |
| `open` | 初期状態を開く | 真偽値 |
| `variant` | 外観 | `default`, `bordered` |
| `region` | landmark として扱う | 真偽値 |

補足:

- `aria-label` は必須

### Info Box

独立した情報ブロック。

```markdown
::info-box{heading="作品情報" icon="book" heading-level="3" landmark="true" variant="filled"}
ここに説明を書く
::
```

| 属性 | 内容 | 値 |
|---|---|---|
| `heading` | 見出し | 任意の文字列 |
| `icon` | アイコン名 | 任意の文字列 |
| `heading-level` | 見出しレベル | `1` から `6` |
| `landmark` | 独立 landmark として扱う | 真偽値 |
| `variant` | 外観 | `default`, `filled` |

### Score

譜例やスコア表示用の埋め込み。

```markdown
::score{src="/scores/example.svg" label="譜例" caption="譜例1" loading="lazy"}
::
```

| 属性 | 内容 | 値 |
|---|---|---|
| `src` | 譜例データ参照先 | パスまたは URL |
| `caption` | キャプション | 任意の文字列 |
| `label` | 補助ラベル | 任意の文字列 |
| `description` | 補助説明 | 任意の文字列 |
| `aspect-ratio` | アスペクト比ヒント | 任意の文字列 |
| `loading` | 読み込み方針 | `lazy`, `eager` |
| `primary` | 主要譜例フラグ | 真偽値 |

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

| 属性 | 内容 | 値 |
|---|---|---|
| `selected-index` | 初期選択番号 | `0` 以上の整数 |
| `selected-value` | 初期選択値 | 任意の文字列 |
| `orientation` | 並び方向 | `horizontal`, `vertical` |
| `automatic-activation` | フォーカス移動で自動選択 | 真偽値 |
| `value` | `tab` の識別子 | 任意の文字列 |

補足:

- `tab` と `panel` の対応は著者側で崩さない

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

| 属性 | 内容 | 値 |
|---|---|---|
| `original` | 原文 | 任意の文字列 |
| `translated` | 訳文 | 任意の文字列 |
| `lang` | 原文言語コード | 任意の文字列 |
| `target-lang` | 訳文言語コード | 任意の文字列 |
| `render-mode` | 表示モード | `popover`, `drawer`, `interlinear` |
| `open` | 初期表示を開く | 真偽値 |

補足:

- `original` 未指定なら 1 段落目から補完される
- `translated` 未指定なら 2 段落目から補完される

## スロット用ディレクティブ

次の 4 つは単独 UI ではなく、親ディレクティブ内で使う。

### Preview

```markdown
::preview
プレビュー内容
::
```

### Toolbar

```markdown
::toolbar
補助操作
::
```

### Tab

```markdown
::tab{value="overview"}
概要
::
```

### Panel

```markdown
::panel
ここにタブ本文
::
```

## インライン拡張記法

### Highlight

```markdown
==重要==
:highlight[検索ヒット]{origin="search" current="true"}
```

| 属性 | 内容 | 値 |
|---|---|---|
| `origin` | ハイライトの由来 | `search`, `user` |
| `current` | 現在選択中のヒットか | 真偽値 |

補足:

- `==text==` は常に `origin="user"`

### Emoji

```markdown
:emoji[😀]{aria-label="笑顔"}
```

| 属性 | 内容 | 値 |
|---|---|---|
| `label` | `aria-label` の別名 | 任意の文字列 |
| `aria-label` | 読み上げラベル | 任意の文字列 |

### Superscript / Subscript

```markdown
H~2~O
x^2^

:subscript[2]
:superscript[2]
```

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

迷ったら `true` / `false` を使う。

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
2. まず frontmatter に `title` `description` `date` を書く
3. 注意喚起や補足なら `callout` `details` `info-box`
4. 複数コード比較なら `code-group`
5. UI 例とコードを一緒に見せるなら `code-preview`
6. 構造化された比較なら `tabs`
7. 原文と訳文なら `translation`

## 関連文書

- [`docs/markdown-strategy.md`](/Users/ruo/Desktop/Programing/Rouault/docs/markdown-strategy.md)
- [`velite.config.ts`](/Users/ruo/Desktop/Programing/Rouault/velite.config.ts)
- [`lib/remark/rouault-directives.ts`](/Users/ruo/Desktop/Programing/Rouault/lib/remark/rouault-directives.ts)
