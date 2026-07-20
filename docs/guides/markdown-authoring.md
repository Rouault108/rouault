# Markdown Authoring Guide

この文書は日常執筆向けの短いGuideである。Markdown入力記法の網羅表は`docs/references/markdown-authoring-syntax.md`、Markdown出力・安全性の正本は`docs/contracts/markdown.md`、出力詳細は`docs/references/markdown-output.md`を参照する。日本語表記は`docs/guides/japanese-writing-style.md`を参照する。

## 基本方針

- CommonMarkを優先する。
- 生HTMLは書かない。
- 独自ディレクティブは許可された名前と属性だけを使う。
- 表示都合のために本文資産へ一時的な回避策を書かない。

## 段落分割

意味上の段落は通常どおり空行で分ける。短い段落が連続しても、読書面ではDesign Systemの`p + p`余白が適用されるため、表示都合だけを理由に段落を結合したり、余分な改行やHTMLを入れたりしない。

表、図、コード、引用、callout、リストなどへ移るblock間余白は別の読書面patternが扱う。このGuideは書き方の補足であり、余白contractの正本は`docs/design-system/pattern-reading-surface.md`である。

## 使える主なブロック

- `::callout`
- `::code-group`
- `::code-preview`
- `::details`
- `::info-box`
- `::link-card`
- `::score`
- `::tabs`
- `::translation`
- `::translation-overlay`
- `::syntax-card`
- `::table`

`preview-sandbox`は`code-preview` family内の特殊childとして扱う。これは非推奨化、削除、受理条件変更ではなく、現行実装上の親子制約に合わせた説明位置の整理である。

通常の軽量なHTML/CSS中心previewは、`activation-policy`未指定でviewport到達時に自動表示される。旧来のクリック待ちにしたい場合は`activation-policy="manual"`を明示する。`allow-js`単独ではmanualにならないが、manual時のbutton文言は「プレビューを実行」になる。`allow-forms`、`allow-downloads`、`allow-pointer-lock`、`allow-popups`はmanual-only capabilityであり、未指定時は`activation-policy="manual"`へ正規化され、`visible` / `eager`との併用はbuild errorになる。

単体button、input、badgeなどは`content-layout`未指定の`stage`を使う。展示用の中央配置CSSを`preview-css`へ加える必要はない。通常の文書フローや配置そのものを示す例は`content-layout="flow"`を明示し、必要な配置は`preview-html`内のauthor supplied wrapperと`preview-css`へ記述する。`preview-css`から`body`や予約要素`ui-preview-content-root`をlayout ownerとして扱わない。

### `::translation` / `::translation-overlay`

常時本文として読ませたい対訳は`::translation`を使う。必要時だけ開く短い訳注は`::translation-overlay`を使う。

```md
::translation-overlay{lang="fr" target-lang="ja" surface="drawer" original="Je pense, donc je suis." translated="我思う、ゆえに我あり。"}
::

::translation{lang="fr" target-lang="ja"}
Je pense, donc je suis.

我思う、ゆえに我あり。
::
```

`translation` familyが保持する意味内容は`original` / `translated`のplain-text 2片だけである。強調、リンク、脚注、ruby、辞書UI、複数段落の対応関係はこのfamilyへ入れない。`translation-overlay`はJS無効でもnative `summary`から訳文を開いて読めるfallbackを出力する。

`translation-overlay`で使えるsurfaceは`popover` / `drawer`だけである。`open`はMarkdown属性ではない。

### `::callout`

`::callout`は、本文中の短い読書注記surfaceとして使う。通知カード、操作面、長い構造化情報の置き場ではない。作品情報、属性一覧、複数項目のまとまった説明は`::info-box`へ分ける。

kindの使い分けは次を基準にする。

| kind      | 用途                                                        |
| --------- | ----------------------------------------------------------- |
| `note`    | 中立的な補足、前提、余談。`heading="補助情報"`の標準。      |
| `tip`     | 読み方や実践上の助言、ヒント。単なる補助情報には使わない。  |
| `success` | 確認済み、成立、完了など、検証済みの短い注記。              |
| `warning` | 制約、誤読防止、注意。可視headingを強く推奨する。           |
| `danger`  | 重大危険、破壊的操作、強い警告。可視headingを強く推奨する。 |

```md
::callout{kind="note" heading="補助情報"}
読書面とinteraction面を分離したうえで表示契約を確認します。
::
```

`warning` / `danger`は色だけに頼らず、`heading`で何に注意すべきかを明示する。長い手順、定義リスト、複数の関連情報をまとめる場合は`::callout`を伸ばさず、`::info-box`、`::details`、通常の見出しと本文へ分ける。

````md
::code-preview{heading="Preview"}
:::preview-sandbox

```preview-html
<p>Hello</p>
```

:::
::
````

通常フローを示す場合は、次のように`flow`を明示する。

````md
::code-preview{heading="通常フローの例"}
:::preview-sandbox{content-layout="flow"}

```preview-html
<div class="stack">
  <p>先頭</p>
  <p>末尾</p>
</div>
```

```preview-css
.stack { display: grid; gap: 1rem; }
```

:::
::
````

## インライン拡張

- highlight
- emoji
- superscript / subscript
- shortcode
- 表セル改行エスケープ

## Fenced code block meta

代表的なfenced code block metaはcode fenceのlanguageに続けて書く。

````md
```ts filename="sample.ts" copyable="false" show-line-numbers="true" highlight-lines="1,3-4"
const sample = 1;
```
````

meta keyの網羅表は`docs/references/markdown-authoring-syntax.md`を参照する。`data-shiki-meta`はauthoring meta keyではない。

### Code line stateの重複と競合

`highlight-lines`とcode内のhighlight notationが同じ行を指す場合は、同一highlightの複数originとして一つの`highlight`へ正規化される。authorは片方へ書き換える必要はない。

一方、同じ行の`highlight + add`、`highlight + remove`、`add + remove`はbuild errorになる。異種stateにsilent precedenceはなく、一方を暗黙に破棄したり複合stateとして表示したりしない。authoring syntax自体は従来どおりであり、競合するannotationのどちらかを意図に合わせて解消する。

## Code group

code groupは既定では互いに連動しない。同じ読書単位の中で、複数のcode groupを同じtab keyへ揃えたい場合だけ`sync-scope`を明示する。

````md
:::code-group{aria-label="Package manager" sync-scope="package-manager"}

```sh group-key="npm" tab-label="npm"
npm install
```

```sh group-key="pnpm" tab-label="pnpm"
pnpm install
```

:::
````

`sync-scope`は64文字以下のlower kebab-case識別子だけを使う。空白だけなら未指定扱いになる。`package-`、`package--manager`、`Package Manager`、`rust_go`、`npm/pnpm`、非ASCII文字は使えない。

## 表

通常のGFM表を使う。Markdown由来の表はstatic table surfaceであり、interactive table、sortable table、filterable table、row actionではない。

列幅ヒントが必要な場合は、GFM表を1個だけ`::table{column-widths="..."}`で包む。

`::table`の開始marker、GFM表、終端`::`の間へworkaroundとして空行を追加する必要はない。表以外の段落や複数の表をwrapper内へ混ぜるとbuild errorになる。

```md
::table{column-widths="fit wide numeric"}
| 項目 | 説明 | 点数 |
|:---|:---|---:|
| 可読性 | 1行目{{break}}2行目 | 5 |
| 保守性 | 将来変更しやすいか | 4 |
::
```

`column-widths`で使えるtokenは`auto` / `fit` / `narrow` / `medium` / `wide` / `numeric`だけである。tokenは空白区切りで書き、列数と同じ数を指定する。任意CSS値、comma区切り、空値は使わない。`numeric`は幅ヒントであり、右揃えはGFM表の`---:`で指定する。

表セル内の意味上の行区切りは`{{break}}`を使う。plain GFM表でも`::table`内tableでも有効である。

```md
| 項目 | 説明                |
| ---- | ------------------- |
| A    | 1行目{{break}}2行目 |
```

`{{break}}`はexact tokenだけが特殊扱いされる。`{{foo}}` / `{{ break }}` / `{{BREAK}}` / `{{br}}`は通常テキストであり、表セル改行ではない。

`{{break}}`は表セルの実質先頭・実質末尾には置けない。前後に意味のあるinline contentが必要である。`{{break}}`の同一text node内の直前・直後へ空白を置かず、連続して書かない。

```md
| A | 1行目{{break}}**2行目** |
| A | **1行目**{{break}}2行目 |
| A | `code`{{break}}説明 |
| A | [リンク](https://example.com){{break}}説明 |
```

raw `<br>`、Markdown hard break、`:br[]`は表セル改行として使わない。

## 画像

通常のMarkdown画像は、本文中の読解対象として静的な`figure[data-image]`へ正規化される。既定では`zoomable=true`として扱われ、enhancer初期化に成功した環境では画像面全体から拡大表示を開ける。

拡大表示にしない画像は`zoomable=false`を指定する。小さな装飾画像、本文の流れの中で拡大操作を期待しない画像、Lightbox対象にしたくない図版に使う。

```md
![本文画像](./image.png '図版キャプション')

![拡大しない画像](./small.png){zoomable=false}
```

`zoomable=false`は画像variantや読み込み状態を変えるための指定ではない。出力ではpreview frame、拡大trigger、Lightbox用hydrationは生成されない。

## 注意

- `on*`属性、`srcdoc`、危険URL scheme、許可外`style`は使わない。
- Hydrationを期待して本文の意味が成立する書き方にしない。
- 出力DOMの詳細に依存する場合は`docs/references/markdown-output.md`を確認する。
- 入力記法の網羅表が必要な場合は`docs/references/markdown-authoring-syntax.md`を確認する。
