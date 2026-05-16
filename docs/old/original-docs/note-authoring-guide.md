この文書は現行契約の正本ではない。現行契約は docs/contracts/、Design System 契約は docs/design-system/ を参照する。

---

# ノート記述ガイド

## この文書の位置づけ

この文書は、Rouaultでノートを書く人のための実用ガイドです。ここでは「著者がどう書くか」に絞って説明します。

実装上・仕様上の正本は次にあります。

- `docs/markdown-overview.md`
- `docs/markdown-authoring-specification.md`
- `docs/markdown-output-contract.md`
- `docs/markdown-safety-and-test-policy.md`
- `velite.config.ts`

この文書と正本文書が衝突する場合は、正本文書を優先してください。

---

## 1. まず押さえる方針

1. 基本的に本文は標準的なMarkdownで書く
2. 補足UIが必要なときだけRouault独自ディレクティブを使う
3. 生HTMLは書かない（書いてもエラーとなる）
4. frontmatterには必要なメタデータだけを書く
5. 迷ったら簡潔な書き方を選ぶ
6. 属性の完全一覧や厳密な受理規則は `docs/markdown-authoring-specification.md`を参照する
7. Rouaultのディレクティブは独自parserを正本とし、`remark-directive` AST互換は前提にしない

---

## 2. 基本のファイル構成

1つのノートは、frontmatter と本文で構成します。

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

## 3. Frontmatterの書き方

frontmatterはファイル先頭の`---`で囲まれた領域に書きます。YAML形式で記述してください。

### 3.1 最低限の項目

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

### 3.2 書ける項目と許容値

| 項目                     | 必須     | 許容値                                                                                                             | 主な制約・補足                                                                                       |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `title`                  | 必須     | YAML 文字列                                                                                                        | 実質的なタイトルです。空文字運用は避けます。本文の先頭見出しと揃えると管理しやすくなります。         |
| `description`            | 任意     | YAML 文字列                                                                                                        | 一覧、検索、メタ説明に使われます。1文程度の短い要約を推奨します。                                    |
| `date`                   | 任意     | `YYYY-MM-DD` 形式の ISO 日付                                                                                       | 初出日です。`2026-03-14`のように書きます。                                                           |
| `updated`                | 任意     | `YYYY-MM-DD` 形式の ISO 日付                                                                                       | 更新日です。`date`と同じ形式だけを書きます。                                                         |
| `genre`                  | 任意     | 文字列配列                                                                                                         | 分類用です。検索UIではタグとして扱われます。空文字や重複は避けます。                                 |
| `sidebarIcon`            | 任意     | `file-text` のような bare icon 名                                                                                  | `lucide:`接頭辞は使えません。`none`も使えます。省略時は `_config.json`側の設定を継承します。         |
| `cover`                  | 任意     | `content/_assets/...` または `examples/media/...` 配下のローカル画像パス                                           | 現行実装では外部URLは使えません。manifestに存在しない画像はbuildで失敗する場合があります。           |
| `source`                 | 任意     | 文字列                                                                                                             | 記事ヘッダーでの表示対象は `http:` / `https:`の単一URLのみです。                                     |
| `license`                | 任意     | 文字列                                                                                                             | 表示用のライセンス名です。前後空白のみの値は意味を持ちません。                                       |
| `licenseNote`            | 任意     | 文字列                                                                                                             | ライセンス補足です。構造化データではなく単純な文字列だけを書きます。                                 |
| `status`                 | 任意     | `draft` / `archived` / `wip` / `deprecated`                                                                        | `draft` は公開ノート集合から除外されます。省略時は通常公開扱いです。                                 |
| `kind`                   | 任意     | `reader` / `testing` / `demo`                                                                                      | 省略時は `reader`として扱われます。公開面を変える項目です。                                          |
| `chromeProfile`          | 任意     | `reader` / `plain`                                                                                                 | note shell の構成です。`kind: reader` の既定値は `reader`、`kind: testing` の既定値は `plain` です。 |
| `testingArea`            | 条件付き | `index` / `markdown-basic` / `media` / `code` / `interactive` / `sandbox` / `layout` / `navigation` / `typography` | `kind: testing` のときだけ必須です。`kind` が `testing` 以外なら書けません。                         |
| `hydrationBudgetProfile` | 任意     | `reader-shell-canary` / `testing-interactive-canary` / `testing-sandbox-canary` / `testing-code-canary`            | hydration budget を明示したい canary note 専用です。通常ノートでは不要です。                         |

### 3.3 各項目の書き方

- `title`
  YAML文字列で書きます。必須です。実装上の識別子ではなく表示用の題名なので、`slug`の代わりにはしません。

- `description`
  YAML文字列で書きます。本文冒頭の貼り付けではなく、一覧や検索で見分けやすい短い要約にします。

- `date`
  `YYYY-MM-DD`形式だけを書きます。日時や`03/14/2026`のような別形式は書きません。

- `updated`
  `date`と同じく`YYYY-MM-DD`形式です。大きな更新を追跡したいときだけ追加します。

- `genre`
  YAML配列で書きます。各要素は文字列です。

  ```yaml
  genre:
    - architecture
    - router
  ```

- `sidebarIcon`
  bare icon名を書きます。たとえば`file-text`、`book-open`、`music`のように書きます。`lucide:file-text`のようなprefix付き値は使えません。消したい場合は`none`を使えます。

- `cover`
  ローカル画像パスだけを書きます。通常ノートでは `content/_assets/...` 配下の画像を使います。

  ```yaml
  cover: 'content/_assets/covers/router-overview.png'
  ```

- `source`
  単一の出典URLを文字列で書きます。現行UIで安定して扱う前提は`http:` / `https:`のみです。

- `license`
  表示用の短い文字列を書きます。たとえば `CC BY 4.0` のように書きます。

- `licenseNote`
  補足説明を文字列で書きます。リンク先やラベルを分離した構造は持てません。

- `status`
  記事状態が必要なときだけ書きます。使える値は`draft` / `archived` / `wip` / `deprecated`だけです。
  - `draft`: 公開ノート集合から除外されます
  - `archived`: 公開はするがアーカイブ扱いです
  - `wip`: 作業中ノートとして表示します
  - `deprecated`: 非推奨ノートとして表示します

- `kind`
  公開面と authoring policy を切り替える項目です。
  - `reader`: 通常ノートです。省略時の既定値です
  - `testing`: テスト用ノートです。`testingArea` が必須になります
  - `demo`: デモ用ノートです。通常の読者向け面には載せません

- `chromeProfile`
  note shell を切り替える項目です。
  - `reader`: reader shell を使います
  - `plain`: sidebar を持たない簡素な shell を使います
    testing note でも reader shell の契約を検証したい場合は `chromeProfile: 'reader'` を指定します。

- `testingArea`
  `kind: testing` のときだけ書きます。許可値は `index` / `markdown-basic` / `media` / `code` / `interactive` / `sandbox` / `layout` / `navigation` / `typography` です。

- `hydrationBudgetProfile`
  canary noteでhydration budgetを固定したいときだけ書きます。通常ノートでは省略します。
  - `reader-shell-canary`
  - `testing-interactive-canary`
  - `testing-sandbox-canary`
  - `testing-code-canary`

testing用ノートの最小例:

```yaml
---
title: 'Interactive'
description: 'tabs と translation の確認用ページ'
date: 2026-03-29
kind: 'testing'
testingArea: 'interactive'
---
```

reader shell を使う testing fixture の例:

```yaml
---
title: 'Reader Shell Canary'
description: 'sidebar と TOC を検証する fixture'
date: 2026-03-31
kind: 'testing'
testingArea: 'layout'
chromeProfile: 'reader'
---
```

### 3.4 書かない項目

次は通常、frontmatterに書きません。

- `slug`
- `content`
- `excerpt`
- `toc`
- `permalink`

これらはシステム側で決まる前提です。

### 3.5 Frontmatterの注意

- 日付は `2026-03-14` のように書く
- `genre` は YAML 配列で書く
- `testingArea` は `kind: testing` のときだけ書く
- reader shell が必要な testing note では `chromeProfile: 'reader'` を明示する
- `cover` はローカル画像パスだけを書く
- `sidebarIcon` はbare icon名で書き、`lucide:`接頭辞を付けない
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
- shared testing mediaを使うときだけ`examples/media/...`を使える

### 4.3.1 Shared Example Include

shared example sourceを本文へ展開したいときに使います。現状は主に`testing`ノートで使います。

```markdown
::example-include{ref="interactive/tabs-url-sync"}
```

覚えておくこと:

- `ref` は登録済みlogical idだけ使える
- pathを直接書かない
- 未登録の`ref`や`..`を含む参照はbuild-time errorになる

### 4.4 自動リンクカード

外部リンクを1行だけ書いた段落は、自動でリンクカードになります。

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
> 2行目
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

## 5. Rouault独自ブロックの使い方

標準Markdownだけでは足りないときに、Rouault独自ディレクティブを使います。これはRouault固有parserを正本とする契約です。

`remark-directive`ベースの一般的なdirective AST互換は前提にしません。詳細な受理規則は`docs/markdown-authoring-specification.md`を参照してください。

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
- 生HTMLの代わりとして使います
- 属性の完全一覧は `docs/markdown-authoring-specification.md` を参照してください
- このガイドの例は作法の説明であり、一般的なdirective AST互換の説明ではありません

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
- APIの複数パターン提示

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

- UI部品の見た目をコードと一緒に見せたいとき
- コンポーネントの使用例を短く示したいとき

### 5.4 Sandbox Preview

HTML / CSS / JavaScriptからsandboxを自動生成したい場合に使います。

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
- `preview-sandbox` を使うときは、手書きの`::preview`や通常のcode blockを併用しない
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

- URLをそのまま1行だけ置けばよい
  → 自動リンクカード化
- タイトルや画像を明示したい
  → `::link-card`

### 5.8 Score

譜例やスコア表示用の埋め込みです。

```markdown
::score{src="/media/score/example.svg" label="譜例" caption="譜例1" loading="lazy"}
::
```

使う場面:

- 譜例や図版を専用UIで見せたいとき
- キャプションや説明を併記したいとき

### 5.9 Tabs

タブUIを構成します。

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
- 不整合はbuild-timeで拒否される

### 5.10 Translation

原文と訳文を**plain-textの対**として示します。

正規の書き方:

```markdown
::translation{lang="fr" target-lang="ja" original="Je pense, donc je suis." translated="我思う、ゆえに我あり。"}
::
```

overlayで参照させる正規の書き方:

```markdown
::translation-overlay{lang="fr" target-lang="ja" surface="drawer" original="Je pense, donc je suis." translated="我思う、ゆえに我あり。"}
::
```

本文2段落から拾わせる書き方（縮退入力）:

```markdown
::translation{lang="fr" target-lang="ja"}
Je pense, donc je suis.

我思う、ゆえに我あり。
::
```

注意:

- `translation` / `translation-overlay` が保持するのはplain-textの2片だけです。
- 本文入力を使う場合も、取り出されるのは 1段落目と2段落目のプレーンテキスト相当だけです。
- 強調、脚注、リンク、ルビなどの構造は保持されません。
- richな対訳本文を表現したい場合は、このdirective familyを使わず、別directiveを検討してください。

使い分けの目安:

- 常に原文と訳文を読ませたい
  → `translation`
- クリック時だけ開きたい
  → `translation-overlay`
- 属性へ直接書きたくないplain-text 2片を簡便入力したい
  → `translation`の本文2段落

---

## 6. 親ディレクティブ内で使う記法

次は単独UIではなく、親ディレクティブ内で使う補助記法です。

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

よく使うshortcode:

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

真偽値属性は、実装上は複数の表記を受け付ける場合がありますが、--このガイドでは`true` / `false`に統一--することを勧めます。

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

### 9.1 生HTMLを書く

```markdown
<div>これは不可</div>
```

生HTMLは書きません。

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

### 9.4 enumの値を間違える

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

## 9.7 `syntax-card` の書き方

APIリファレンスや構文メモのように、代表シグネチャと説明節を分けて見せたい場合は`syntax-card` familyを使います。

最小例:

````md
::syntax-card{name="useEffect" kind="Method" lang="ts" heading-level="3"}
::syntax-signature

```ts
function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
```

::

::syntax-section{label="説明"}
React の副作用を宣言します。
::
::
````

fieldを併用する例:

````md
::syntax-card{name="useEffect" kind="Method" lang="ts"}
::syntax-signature

```ts
function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
```

::

::syntax-section{label="パラメータ"}
::syntax-fields
::syntax-field{name="effect" type="() => void | (() => void)" required="true"}
副作用本体。
::

::syntax-field{name="deps" type="readonly unknown[]" default="[]"}
依存配列。
::
::
::
````

注意点:

- `syntax-signature` の中にはfenced code blockを1個だけ書きます。
- signatureのcode fenceに`meta`は書けません。
- `syntax-field` は必ず`syntax-fields`の中に入れます。
- `syntax-card.lang`とsignature fenceの`lang`を両方書く場合は一致していなければなりません。

---

## 10. 書き分けの目安

1. 文章中心なら通常Markdownを使う
2. まずfrontmatterに`title` `description` `date`を書く
3. 注意喚起や補足なら `callout` `details` `info-box`
4. 複数コード比較なら `code-group`
5. UI例とコードを一緒に見せるなら`code-preview`
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
