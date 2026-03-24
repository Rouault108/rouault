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
title: 'メモのタイトル'
description: '一覧や検索で使う短い説明'
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
title: 'Router 設計メモ'
description: 'ルーティングの責務分割とイベント境界を整理するメモ'
date: 2026-03-14
genre:
  - architecture
  - router
---
```

### 書ける項目

| 項目          | 必須 | 内容                                   |
| ------------- | ---- | -------------------------------------- |
| `title`       | 必須 | ノートタイトル                         |
| `description` | 任意 | 一覧、検索、OG などで使う短い説明      |
| `date`        | 任意 | 作成日。`YYYY-MM-DD` の ISO 日付で書く |
| `updated`     | 任意 | 更新日。`YYYY-MM-DD` の ISO 日付で書く |
| `genre`       | 任意 | 分類用の文字列配列                     |
| `sidebarIcon` | 任意 | サイドバーで使うアイコン名             |
| `cover`       | 任意 | カバー画像のパスまたは URL             |
| `license`     | 任意 | ライセンス名                           |
| `licenseNote` | 任意 | ライセンスに関する補足                 |
| `status`      | 任意 | 公開状態                               |

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
_イタリック_
`inline code`
[リンク](https://example.com)
![画像の代替テキスト](/assets/images/example.jpg 'キャプション')
```

外部リンクを 1 行だけ書いた段落は、自動でリンクカードになる。

```markdown
https://example.com/article
```

タイトル・説明・画像を著者が明示したい場合は `::link-card` を使う。

```markdown
::link-card{url="https://example.com/article" title="任意タイトル" description="任意説明" image="https://cdn.example.com/card.png"}
```

画像の拡大を無効化したい場合は、画像記法の直後に属性ブロックを書く。

```markdown
![画像の代替テキスト](/assets/images/example.jpg 'キャプション'){zoomable="false"}
```

他のオプションは以下

```markdown
![画像の代替テキスト](/assets/images/example.jpg 'キャプション'){loading="eager" width="1200" height="800"}
```

補足:

- キャプションは標準 Markdown と同じく `()` 内のタイトル文字列に書く
- `loading` は `lazy` または `eager`
- `width` / `height` は 1 以上の整数
- `zoomable` の既定値は `true`
- Markdown の属性ブロックでは `zoomable="true"` / `zoomable="false"` と書く
- `zoomable="false"` を指定した場合、出力される `ui-image` は静的モードになり、Lightbox を持たない
- 自動リンクカード化の対象は「単独段落の外部 URL 1 件だけ」
- 本文中の通常リンクや複数リンク段落はそのまま残る
- `::link-card` の `url` は必須、`title` / `description` / `image` は任意
- 解決順序は `著者指定 > OGP > Twitter Card > oEmbed > URL フォールバック`
- 取得失敗時はビルド継続のまま画像なしカードになる

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
::callout{kind="warning" heading="注意"}
この操作は元に戻せません。
::
```

| 属性            | 内容                 | 値                                            |
| --------------- | -------------------- | --------------------------------------------- |
| `kind`          | 種別                 | `note`, `tip`, `success`, `warning`, `danger` |
| `heading`       | 可視見出し           | 任意の文字列                                  |
| `label`         | 見出しなし時のラベル | 任意の文字列                                  |
| `icon`          | アイコン名           | 任意の文字列                                  |
| `heading-level` | 見出しレベル         | `1` から `6`                                  |

補足:

- `heading` がない場合のみ `label` がアクセシブル名に使われる

### Code Group

複数のコード例を並べる。

````markdown
::code-group{aria-label="実装比較"}

```ts filename="valid.ts" group-key="valid" tab-label="正しい例"
const value = 1;
```

```ts filename="invalid.ts" group-key="invalid" tab-label="誤り例"
const value = '1';
```

::
````

| 属性         | 内容                       | 値           |
| ------------ | -------------------------- | ------------ |
| `aria-label` | 全体の説明ラベル           | 任意の文字列 |
| `group-key`  | 各コード例の安定識別子     | 任意の文字列 |
| `tab-label`  | 各コード例の可視タブラベル | 任意の文字列 |
| `copy-label` | コピー文脈ラベル           | 任意の文字列 |
| `filename`   | 各コードブロックの補助情報 | 任意の文字列 |

補足:

- `group-key` は `ui-code-group` 配下では必須
- タブラベルは `tab-label > filename > lang` の順で解決
- コピー文脈は `copy-label > filename > lang > tab-label` の順で解決
- fenced code meta では `copyable` / `copy-mode` / `wrap` / `highlight-lines` / `layout` / `intent` / `show-line-numbers` も利用可能

### Code Preview

プレビュー領域とコードをセットで見せる。

````markdown
::code-preview{heading="ボタン例" controls="theme surface viewport" preview-theme="light" preview-surface="surface" preview-viewport="tablet" preview-padding="compact" preview-align="center"}
::preview
ここにプレビュー内容を書く
::

```html
<button>例</button>
```

::
````

| 属性               | 内容                           | 値                                          |
| ------------------ | ------------------------------ | ------------------------------------------- |
| `heading`          | code preview 全体の見出し      | 任意の文字列                                |
| `controls`         | built-in showcase controls     | 空白区切りで `theme`, `surface`, `viewport` |
| `preview-padding`  | プレビュー余白                 | `normal`, `compact`, `none`                 |
| `preview-align`    | プレビュー配置                 | `center`, `start`, `stretch`                |
| `preview-theme`    | プレビュー専用テーマ           | `page`, `light`, `dark`                     |
| `preview-surface`  | プレビュー専用の面コンテキスト | `surface`, `canvas`, `muted`                |
| `preview-viewport` | プレビュー専用のビューポート幅 | `full`, `tablet`, `mobile`                  |

補足:

- `::preview` は必須
- built-in controls は `controls` 指定時のみ表示
- `preview-theme` / `preview-surface` / `preview-viewport` は controls 未指定でも静的指定として有効

Sandbox preview を使う場合:

````markdown
::code-preview{heading="ボタン例" controls="viewport"}
::preview-sandbox{iframe-title="ボタンの sandbox" allow-js="true" height="160"}

```preview-html filename="button.html"
<button class="demo-button">押す</button>
```

```preview-css filename="button.css"
.demo-button { padding: 0.75rem 1rem; }
```

```preview-js filename="button.js"
document.querySelector('.demo-button')?.addEventListener('click', () => {
  document.querySelector('.demo-button')?.toggleAttribute('data-active');
});
```

::
::
````

- `::preview-sandbox` は `::code-preview` の直下でのみ使用可能
- `preview-html` は必須かつ 1 個のみ
- `preview-css` / `preview-js` は任意で、それぞれ 1 個まで
- `preview-js` を使う場合は `allow-js="true"` が必須
- `allow-js` は author supplied JavaScript の注入可否を表す。iframe 内 helper script の不存在は保証しない
- `preview-sandbox` 使用時は手書きの `::preview` / code block を併用しない
- code area は sandbox source から自動生成される

### Details

開閉可能な補足領域。

```markdown
::details{summary="補足情報" open="true" variant="bordered"}
ここに詳細を書く
::
```

| 属性         | 内容                | 値                    |
| ------------ | ------------------- | --------------------- |
| `aria-label` | icon-only 時のアクセシブル名 | 任意の文字列 |
| `summary`    | トグル見出し        | 任意の文字列          |
| `open`       | 初期状態を開く      | 真偽値                |
| `variant`    | 外観                | `default`, `bordered` |
| `region`     | landmark として扱う | 真偽値                |

補足:

- 通常利用では `summary` が必須
- icon-only 利用では `aria-label` が必須
- `summary` と `aria-label` は同時指定できない

### Info Box

独立した情報ブロック。

```markdown
::info-box{heading="作品情報" icon="book" heading-level="3" landmark="true" variant="filled" density="compact"}
ここに説明を書く
::
```

| 属性            | 内容                     | 値                  |
| --------------- | ------------------------ | ------------------- |
| `heading`       | 見出し                   | 任意の文字列        |
| `icon`          | アイコン名               | 任意の文字列        |
| `heading-level` | 見出しレベル             | `1` から `6`        |
| `landmark`      | 独立 landmark として扱う | 真偽値              |
| `variant`       | 外観                     | `default`, `filled` |
| `density`       | 視覚密度                 | `comfortable`, `compact` |

### Link Card

リンクカードを明示的に埋め込む。

```markdown
::link-card{url="https://example.com/article" title="任意タイトル" description="任意説明" image="https://cdn.example.com/card.png"}
```

| 属性          | 内容     | 値                    |
| ------------- | -------- | --------------------- |
| `url`         | 遷移先   | 外部 `http/https` URL |
| `title`       | 見出し   | 任意の文字列          |
| `description` | 補足説明 | 任意の文字列          |
| `image`       | 右側画像 | 任意の URL            |

### Score

譜例やスコア表示用の埋め込み。

```markdown
::score{src="/scores/example.svg" label="譜例" caption="譜例1" loading="lazy"}
::
```

| 属性           | 内容               | 値              |
| -------------- | ------------------ | --------------- |
| `src`          | 譜例データ参照先   | `http:` / `https:` / `data:` に解決できるパスまたは URL |
| `caption`      | キャプション       | 任意の文字列    |
| `label`        | 完全なアクセシブル名 | 任意の文字列 |
| `description`  | 補助説明           | 任意の文字列    |
| `aspect-ratio` | アスペクト比ヒント | 任意の文字列    |
| `loading`      | 読み込み方針       | `lazy`, `eager` |
| `primary`      | 主要譜例フラグ     | 真偽値          |

補足:

- `label` を省略または空文字にした場合、アクセシブル名は `楽譜` になります
- `caption` は視覚キャプション専用で、アクセシブル名には自動連結されません
- `src` 未指定は error ではなく idle 扱いです

### Tabs

タブ UI を構成する。

```markdown
::tabs{url-sync="true" default-selected-value="overview" orientation="horizontal"}
::tab{value="overview"}
概要
::
::panel

### Overview Heading

概要の内容
::
::tab{value="details"}
詳細
::
::panel

### Details Heading

詳細の内容
::
::
```

| 属性                     | 内容                        | 値                       |
| ------------------------ | --------------------------- | ------------------------ |
| `selected-value`         | 現在選択値 / 外部制御値     | 任意の文字列             |
| `default-selected-value` | 初期選択値                  | 任意の文字列             |
| `orientation`            | 並び方向                    | `horizontal`, `vertical` |
| `automatic-activation`   | フォーカス移動で自動選択    | 真偽値                   |
| `value`                  | `tab` の識別子              | 任意の文字列             |
| `url-sync`               | 主タブ状態を `?tab=` と同期 | 真偽値                   |

補足:

補足:

- `tab` と `panel` の対応は著者側で崩さない
- `url-sync` はページの主タブ 1 系統のみに付ける
- `url-sync` 有効時、hash が指す見出しが別タブ内にある場合は hash 側が優先される
- `url-sync` のクエリキーは `tab` 固定

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

| 属性          | 内容           | 値                                 |
| ------------- | -------------- | ---------------------------------- |
| `original`    | 原文           | 任意の文字列                       |
| `translated`  | 訳文           | 任意の文字列                       |
| `lang`        | 原文言語コード | 任意の文字列                       |
| `target-lang` | 訳文言語コード | 任意の文字列                       |
| `render-mode` | 表示モード     | `popover`, `drawer`, `interlinear` |
| `open`        | 初期表示を開く | 真偽値                             |

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
:highlight[検索ヒット]{current-match="true"}
```

| 属性            | 内容                     | 値     |
| --------------- | ------------------------ | ------ |
| `current-match` | 現在選択中の検索ヒットか | 真偽値 |

補足:

- `==text==` は `ui-highlight` へ変換されます

### Emoji

```markdown
:emoji[😀]{aria-label="笑顔"}
```

| 属性         | 内容                | 値           |
| ------------ | ------------------- | ------------ |
| `label`      | `aria-label` の別名 | 任意の文字列 |
| `aria-label` | 読み上げラベル      | 任意の文字列 |

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

### `summary` と `aria-label` を同時指定する

```markdown
::details{summary="補足情報" aria-label="補足を開閉"}
本文
::
```

通常利用では可視 summary がアクセシブルネームの主ソースになるため、両方の同時指定はエラーになる。

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
