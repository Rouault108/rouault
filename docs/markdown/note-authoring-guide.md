# ノート記述ガイド

## この文書の位置づけ

この文書は、Rouault でノートを書く人のための実用ガイドです。ここでは「著者がどう書くか」に絞って説明します。

実装上・仕様上の正本は次にあります。

- `docs/markdown-overview.md`
- `docs/markdown-authoring-specification.md`
- `docs/markdown-output-contract.md`
- `docs/markdown-safety-and-test-policy.md`
- `velite.config.ts`

この文書と正本文書が衝突する場合は、正本文書を優先してください。

---

## 1. まず押さえる方針

1. ふだんの本文は標準的な Markdown で書く
2. 補足 UI が必要なときだけ Rouault 独自ディレクティブを使う
3. 生 HTML は書かない
4. frontmatter には必要なメタデータだけを書く
5. 迷ったら簡潔な書き方を選ぶ
6. 属性の完全一覧や厳密な受理規則は `docs/markdown-authoring-specification.md` を参照する
7. Rouault のディレクティブは独自 parser を正本とし、`remark-directive` AST 互換は前提にしない

---

## 2. 基本のファイル構成

1 つのノートは、frontmatter と本文で構成します。

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
sidebarIcon: file-text
---

## メモのタイトル

本文をここから書く。
```

---

## 3. Frontmatter の書き方

frontmatter はファイル先頭の `---` で囲まれた領域に書きます。YAML 形式で記述してください。

### 3.1 最低限おすすめの項目

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

### 3.2 よく使う項目

| 項目          | 目安     | 内容                              |
| ------------- | -------- | --------------------------------- |
| `title`       | 必須     | ノートタイトル                    |
| `description` | 推奨     | 一覧、検索、OG などで使う短い説明 |
| `date`        | 推奨     | 作成日。`YYYY-MM-DD` 形式         |
| `updated`     | 任意     | 更新日。`YYYY-MM-DD` 形式         |
| `genre`       | 任意     | 分類用の文字列配列                |
| `sidebarIcon` | 任意     | サイドバーで使うアイコン名        |
| `cover`       | 任意     | カバー画像のパスまたは URL        |
| `license`     | 任意     | ライセンス名                      |
| `licenseNote` | 任意     | ライセンスに関する補足            |
| `status`      | 任意     | 公開状態                          |
| `kind`        | 任意     | ノートの公開面種別                |
| `testingArea` | 条件付き | `kind: testing` の責務区分        |

### 3.3 各項目の書き方

- `title`
  本文の先頭見出しと揃えておくと管理しやすくなります。

- `description`
  1 文で簡潔に書きます。本文の導入をそのまま貼るより、検索で見分けやすい要約にします。

- `date`
  ノートの初出日です。並び順や表示日付の基準になります。

- `updated`
  後から大きく更新した日です。更新の追跡に使います。

- `genre`
  分類用の配列です。空文字は入れません。

- `sidebarIcon`
  たとえば `file-text` のように書きます。必要なければ省略します。

- `kind`
  通常ノートでは省略して構いません。testing 用ノートだけ `testing` を明示します。

- `testingArea`
  `kind: testing` のときだけ必須です。`index | markdown-basic | media | code | interactive | sandbox` のいずれかを書きます。

- `status`
  状態が明確な場合だけ書きます。迷う場合は省略しても構いません。

testing 用ノートの最小例:

```yaml
---
title: 'Interactive'
description: 'tabs と translation の確認用ページ'
date: 2026-03-29
kind: 'testing'
testingArea: 'interactive'
---
```

### 3.4 書かない項目

次は通常、frontmatter に書きません。

- `slug`
- `content`
- `excerpt`
- `toc`
- `permalink`

これらはシステム側で決まる前提です。

### 3.5 Frontmatter の注意

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

この例は、日付形式が不統一で、未定義項目も含んでいます。

---

## 4. 本文の基本記法

### 4.1 見出し

```markdown
# 大見出し

## 中見出し

### 小見出し
```

### 4.2 強調とリンク

```markdown
**太字**
_イタリック_
`inline code`
[リンク](https://example.com)
```

### 4.3 画像

```markdown
![画像の代替テキスト](/assets/images/example.jpg 'キャプション')
```

画像の拡大を無効化したい場合は、直後に属性ブロックを書きます。

```markdown
![画像の代替テキスト](/assets/images/example.jpg 'キャプション'){zoomable="false"}
```

他の例:

```markdown
![画像の代替テキスト](/assets/images/example.jpg 'キャプション'){loading="eager" width="1200" height="800"}
```

迷ったら、次だけ覚えれば十分です。

- キャプションは画像タイトル文字列に書く
- `zoomable` は `true` / `false` で書く
- `loading` は `lazy` または `eager`
- `width` / `height` は整数で書く
- 通常ノートでは `content/_assets/...` を使う
- shared testing media を使うときだけ `examples/media/...` を使える

### 4.3.1 Shared Example Include

shared example source を本文へ展開したいときに使います。現状は主に `testing` ノートで使います。

```markdown
::example-include{ref="interactive/tabs-url-sync"}
```

覚えておくこと:

- `ref` は登録済み logical id だけ使える
- path を直接書かない
- 未登録 `ref` や `..` を含む参照は build-time error になる

### 4.4 自動リンクカード

外部リンクを 1 行だけ書いた段落は、自動でリンクカードになります。

```markdown
https://example.com/article
```

本文中の通常リンクや、複数リンクが混ざった段落はそのまま通常リンクです。

### 4.5 リスト

```markdown
- 箇条書き
- 箇条書き

1. 番号付き
2. 番号付き
```

### 4.6 引用

```markdown
> 引用文
> 2 行目
```

### 4.7 コードブロック

````markdown
```ts
const answer = 42;
```
````

### 4.8 数式

```markdown
インライン数式 $E = mc^2$

$$
\int_0^1 x^2 dx
$$
```

---

## 5. Rouault 独自ブロックの使い方

標準 Markdown だけでは足りないときに、Rouault 独自ディレクティブを使います。これは Rouault 固有 parser を正本とする契約です。

`remark-directive` ベースの一般的な directive AST 互換は前提にしません。詳細な受理規則は `docs/markdown-authoring-specification.md` を参照してください。

基本形:

```markdown
::directive-name{key="value"}
本文
::
```

注意:

- 開始行は `::name{...}` 形式
- 終了行は必ず `::`
- 属性は `key="value"` 形式
- 未対応属性を書くとビルドエラーになります
- 生 HTML の代わりとして使います
- 属性の完全一覧は `docs/markdown-authoring-specification.md` を参照してください
- このガイドの例は作法の説明であり、一般的な directive AST 互換の説明ではありません

### 5.1 Callout

補足、注意、警告などの強調ブロックです。

```markdown
::callout{kind="warning" heading="注意"}
この操作は元に戻せません。
::
```

使い分けの目安:

- 軽い補足: `kind="note"`
- ちょっとした助言: `kind="tip"`
- 良い結果や推奨: `kind="success"`
- 注意喚起: `kind="warning"`
- 強い警告: `kind="danger"`

### 5.2 Code Group

複数のコード例を並べて比較します。

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

使う場面:

- 正しい例 / 誤り例の比較
- 言語別実装の並列表示
- API の複数パターン提示

### 5.3 Code Preview

プレビュー領域とコードをセットで見せます。

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

使う場面:

- UI 部品の見た目をコードと一緒に見せたいとき
- コンポーネントの使用例を短く示したいとき

### 5.4 Sandbox Preview

HTML / CSS / JavaScript から sandbox を自動生成したい場合に使います。

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

この書き方では次を守ってください。

- `::preview-sandbox` は `::code-preview` の直下でのみ使う
- `preview-html` は必須
- `preview-css` / `preview-js` は必要な場合だけ追加する
- `preview-js` を使うときは `allow-js="true"` を付ける
- `preview-sandbox` を使うときは、手書きの `::preview` や通常 code block を併用しない
- 属性名は `title` ではなく `iframe-title` を使う

### 5.5 Details

開閉可能な補足領域です。

```markdown
::details{summary="補足情報" open="true" variant="bordered"}
ここに詳細を書く
::
```

使う場面:

- 初見では読まなくてもよい補足
- 長い注意書き
- 展開式の背景説明

注意:

- 通常利用では `summary` を付ける
- `summary` と `aria-label` は同時指定しない

### 5.6 Info Box

独立した情報ブロックです。

```markdown
::info-box{heading="作品情報" icon="book" heading-level="3" landmark="true" variant="filled" density="compact"}
ここに説明を書く
::
```

使う場面:

- 定義、仕様、作品情報などを一塊で示したいとき
- 周辺情報を本文から少し切り離したいとき

### 5.7 Link Card

リンクカードを明示的に埋め込みます。

最小の書き方:

```markdown
::link-card{url="https://example.com/article"}
```

上書きしたいとき:

```markdown
::link-card{url="https://example.com/article" title="任意タイトル" description="任意説明" image="/assets/link-cards/example.png" site-name="Example"}
```

使い分けの目安:

- URL をそのまま 1 行だけ置けばよい
  → 自動リンクカード化
- タイトルや画像を明示したい
  → `::link-card`

### 5.8 Score

譜例やスコア表示用の埋め込みです。

```markdown
::score{src="/scores/example.svg" label="譜例" caption="譜例1" loading="lazy"}
::
```

使う場面:

- 譜例や図版を専用 UI で見せたいとき
- キャプションや説明を併記したいとき

### 5.9 Tabs

タブ UI を構成します。

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

使う場面:

- 同格の複数説明を切り替えたいとき
- 長い比較を縦に積みたくないとき

注意:

- `tab` と `panel` の対応を崩さない
- `tab` の `value` は重複させない
- `selected-value` / `default-selected-value` は実在する `tab.value` を指す
- `url-sync` は主タブにだけ使う
- 同一文書内で `url-sync` を持つ `tabs` は 1 系統だけにする
- 不整合は build-time で拒否される

### 5.10 Translation

原文と訳文を **plain-text の対**として示します。

正規の書き方:

```markdown
::translation{lang="fr" target-lang="ja" original="Je pense, donc je suis." translated="我思う、ゆえに我あり。"}
::
```

overlay で参照させる正規の書き方:

```markdown
::translation-overlay{lang="fr" target-lang="ja" surface="drawer" original="Je pense, donc je suis." translated="我思う、ゆえに我あり。"}
::
```

本文 2 段落から拾わせる書き方（縮退入力）:

```markdown
::translation{lang="fr" target-lang="ja"}
Je pense, donc je suis.

我思う、ゆえに我あり。
::
```

注意:

- `translation` / `translation-overlay` が保持するのは plain-text 2 片だけです。
- 本文入力を使う場合も、取り出されるのは 1 段落目と 2 段落目のプレーンテキスト相当だけです。
- 強調、脚注、リンク、ルビなどの構造は保持されません。
- rich な対訳本文を表現したい場合は、この directive family を使わず、別 directive を検討してください。

使い分けの目安:

- 常に原文と訳文を読ませたい
  → `translation`
- クリック時だけ開きたい
  → `translation-overlay`
- 属性へ直接書きたくない plain-text 2 片を簡便入力したい
  → `translation` の本文 2 段落

---

## 6. 親ディレクティブ内で使う記法

次は単独 UI ではなく、親ディレクティブ内で使う補助記法です。

### 6.1 Preview

```markdown
::preview
プレビュー内容
::
```

`code-preview` の中で使います。

### 6.2 Tab

```markdown
::tab{value="overview"}
概要
::
```

`tabs` の中で使います。

### 6.3 Panel

```markdown
::panel
ここにタブ本文
::
```

`tabs` の中で使います。

---

## 7. インライン拡張の使い方

### 7.1 Highlight

```markdown
==重要==
:highlight[検索ヒット]{current-match="true"}
```

使い分け:

- 単に強調したい
  → `==重要==`
- 検索ヒットなど状態付きで表したい
  → `:highlight[...]`

### 7.2 Emoji

```markdown
:emoji[😀]{aria-label="笑顔"}
```

読み上げラベルが必要な場合は `aria-label` を付けます。

### 7.3 Superscript / Subscript

```markdown
H~2~O
x^2^

:subscript[2]
:superscript[2]
```

本文では、短く書けるほうを選べば十分です。

### 7.4 Emoji Shortcodes

```markdown
:smile:
:thinking:
:sparkles:
```

よく使う shortcode:

- `smile`
- `thinking`
- `sparkles`
- `warning`
- `fire`
- `heart`
- `check`
- `x`
- `memo`
- `book`

完全一覧は `docs/markdown-authoring-specification.md` を参照してください。

---

## 8. 真偽値の書き方

真偽値属性は、実装上は複数の表記を受け付ける場合がありますが、--このガイドでは `true` / `false` に統一--することを勧めます。

例:

```markdown
::details{summary="補足" open="true"}
...
::
```

```markdown
![画像](/assets/example.jpg){zoomable="false"}
```

迷ったら `true` / `false` を使ってください。

---

## 9. エラーになりやすい書き方

### 9.1 生 HTML を書く

```markdown
<div>これは不可</div>
```

生 HTML は書きません。

### 9.2 未対応属性を書く

```markdown
::callout{color="red"}
本文
::
```

未対応属性はビルドエラーになります。

### 9.3 終端 `::` を閉じ忘れる

```markdown
::callout{kind="note"}
閉じ忘れ
```

終了行が無いとエラーになります。

### 9.4 enum の値を間違える

```markdown
::details{summary="補足" variant="outline"}
本文
::
```

未対応値はエラーになります。

### 9.5 `summary` と `aria-label` を同時指定する

```markdown
::details{summary="補足情報" aria-label="補足を開閉"}
本文
::
```

通常利用では同時指定しません。

### 9.6 `preview-sandbox` で古い属性名を書く

```markdown
::preview-sandbox{title="古い書き方" allow-js="true" height="160"}
```

---

## 10. 書き分けの目安

1. 文章中心なら通常 Markdown を使う
2. まず frontmatter に `title` `description` `date` を書く
3. 注意喚起や補足なら `callout` `details` `info-box`
4. 複数コード比較なら `code-group`
5. UI 例とコードを一緒に見せるなら `code-preview`
6. 構造化された比較なら `tabs`
7. 原文と訳文なら `translation`
8. 単なる外部リンクなら通常リンク、自動カード化で足りなければ `::link-card`
9. 迷ったら、まずは Markdown だけで書けないかを考える

---

## 11. 関連文書

- `docs/markdown-overview.md`
- `docs/markdown-authoring-specification.md`
- `docs/markdown-output-contract.md`
- `docs/markdown-safety-and-test-policy.md`
- `velite.config.ts`

実装の正確な受理規則、出力契約、危険入力の扱いは、必ず上記の正本文書を参照してください。
