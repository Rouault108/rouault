# Markdown 変換戦略（実装ベース / 2026-03-15）

## 目的

Rouault の Markdown 戦略は、現在次の 4 点を同時に満たすことを目的とする。

1. 著者入力はできる限り CommonMark ベースに寄せる
2. Rouault 固有の UI は独自ディレクティブで明示的に導入する
3. 最終出力は Rouault の Web Components / 契約済み DOM に正規化する
4. 危険な入力はビルド時に落とし、実行時の裁量を減らす

## SoT

実装上の SoT は [`velite.config.ts`](/Users/ruo/Desktop/Programing/Rouault/velite.config.ts#L46) のプラグイン順序である。

1. `remarkMath`
2. `remarkDisallowRawHtml`
3. `remarkRouaultDirectives`
4. `remarkLinkCards`
5. `remark-rehype`（Velite 内部）
6. `rehypeKatex`
7. `rehypeHeadingIds`
8. `rehypePreviewSandbox`
9. `rehypeShikiCodeBlocks`
10. `rehypeRouaultComponents`
11. `rehypeInlineCodeTranslateNo`
12. `rehypeOrderedListContracts`
13. `rehypeDisallowDangerousProps`
14. `rehypeDisallowStaticMark`

remark 層では「著者入力の制約付けと独自構文の展開」を行い、rehype 層では「出力 DOM の正規化と安全性の最終検査」を行う。

## remark 層

### 1. 生 HTML を禁止する

[`lib/remark/disallow-raw-html.ts`](/Users/ruo/Desktop/Programing/Rouault/lib/remark/disallow-raw-html.ts#L17) は MDAST の `html` ノードを検出した時点でビルドエラーにする。著者入力は Markdown 構文か Rouault ディレクティブに限定する。

### 2. ブロックディレクティブを独自ノードへ展開する

[`lib/remark/rouault-directives.ts`](/Users/ruo/Desktop/Programing/Rouault/lib/remark/rouault-directives.ts#L1142) は、段落テキストとして書かれた `::directive{...}` 記法を解析し、`data.hName` / `data.hProperties` を持つノードへ変換する。

| 入力                | 出力                 | 許可属性 / 補足                                                                                                                                             |
| ------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `::callout`         | `ui-callout`         | `kind` / `heading` / `label` / `icon` / `heading-level`                                                                                                     |
| `::code-group`      | `ui-code-group`      | `aria-label`。内包 `code` のメタは `filename` / `group-key` / `tab-label` / `copy-label` / `copyable` / `copy-mode` / `wrap` / `highlight-lines` / `layout` |
| `::code-preview`    | `ui-code-preview`    | `heading` / `controls` / `preview-padding` / `preview-align` / `preview-theme` / `preview-surface` / `preview-viewport`                                     |
| `::preview-sandbox` | `ui-preview-sandbox` | `title` / `allow-js` / `height`。`code-preview` 直下専用、内部は `preview-html/css/js` fenced code のみ。`allow-js` は author script 許可のみを表す         |
| `::details`         | `ui-details`         | `summary` または `aria-label` 必須。両立不可。`open` / `variant` / `region`                                                                                 |
| `::info-box`        | `ui-info-box`        | `heading` / `icon` / `heading-level` / `landmark` / `variant`                                                                                               |
| `::link-card`       | `ui-card`            | leaf directive。`url` 必須、`title` / `description` / `image`。終端 `::` は不要                                                                             |
| `::score`           | `ui-score`           | `src` / `caption` / `label` / `description` / `aspect-ratio` / `loading` / `primary`                                                                        |
| `::tabs`            | `ui-tabs`            | `selected-value` / `default-selected-value` / `orientation` / `automatic-activation` / `url-sync`                                                           |
| `::translation`     | `ui-translation`     | `original` / `translated` / `lang` / `target-lang` / `render-mode` / `open`                                                                                 |
| `::preview`         | `div[slot=preview]`  | 属性なし                                                                                                                                                    |
| `::toolbar`         | `div[slot=toolbar]`  | 内部 / 互換用。著者向け公開文法では非推奨                                                                                                                   |
| `::tab`             | `div[slot=tab]`      | `value`                                                                                                                                                     |
| `::panel`           | `div[slot=panel]`    | 属性なし                                                                                                                                                    |

補足:

- `callout.kind` は `note|tip|success|warning|danger`
- `code-group` 内 `intent` は `neutral|valid|invalid`
- `details.variant` は `default|bordered`
- `info-box.variant` は `default|filled`
- `score.loading` は `lazy|eager`
- `tabs.orientation` は `horizontal|vertical`
- `code-preview.preview-padding` は `normal|compact|none`
- `code-preview.preview-align` は `center|start|stretch`
- `code-preview.controls` は空白区切りで `theme|surface|viewport`
- `code-preview.preview-theme` は `page|light|dark`
- `code-preview.preview-surface` は `surface|canvas|muted`
- `code-preview.preview-viewport` は `full|tablet|mobile`
- `preview-sandbox.height` は正の整数
- `preview-sandbox.allow-js` は author supplied JavaScript の注入許可のみを表す
- `preview-sandbox` 内の `code.lang` は `preview-html|preview-css|preview-js`
- `translation.render-mode` は `popover|drawer|interlinear`
- `link-card.url` は後段で `http/https` 絶対 URL として検証する

### 2.5. リンクカードを build-time で解決する

[`lib/remark/remark-link-cards.ts`](/Users/ruo/Desktop/Programing/Rouault/lib/remark/remark-link-cards.ts) は次を担当する。

1. `::link-card{...}` を最終的な `ui-card[card-kind="link"]` に解決する
2. 「単独段落の外部リンク 1 件だけ」を自動リンクカード化する
3. 取得メタデータを `著者指定 > OGP > Twitter Card > oEmbed > URL フォールバック` の順でマージする
4. 取得失敗時は warning を残しつつ画像なしカードへフォールバックする

最終出力の主要属性は `href` / `card-kind="link"` / `card-title` / `description` / `image-src` / `site-name` である。`clickable` は generic カード専用入力のため、link-card 解決結果には含めない。

### 3. インライン記法を展開する

同ファイルは通常テキスト中の簡易記法も処理する。

| 入力                                | 出力           | 補足                                                 |
| ----------------------------------- | -------------- | ---------------------------------------------------- | ----------------------- |
| `:emoji[text]{aria-label="..."}`    | `span`         | `label` か `aria-label` があれば `role="img"` を付与 |
| `:subscript[text]` / `~text~`       | `sub`          | 属性なし                                             |
| `:superscript[text]` / `^text^`     | `sup`          | 属性なし                                             |
| `:highlight[text]{origin="search"}` | `ui-highlight` | `origin` は `search                                  | user`、`current` を許可 |
| `==text==`                          | `ui-highlight` | 常に `origin="user"`                                 |
| `:sparkles:` など                   | 絵文字文字列   | 内蔵 shortcodes のみ置換                             |

内蔵 shortcodes は `smile`, `grin`, `joy`, `thinking`, `sparkles`, `warning`, `fire`, `heart`, `check`, `x`, `memo`, `book`, `music`, `bulb`。

また、標準画像記法の直後に置かれた属性ブロック `![alt](src "caption"){...}` を検出し、対応する `img` の `data.hProperties` に転写する。現在サポートするのは `loading` / `width` / `height` / `zoomable` であり、キャプションは標準 Markdown の title 文字列を使う。

### 4. バリデーション方針

remark 段階では次を即時エラーにする。

1. 未対応ディレクティブ
2. 未対応属性
3. 重複属性
4. enum / boolean / integer の不正値
5. ディレクティブ終端 `::` の欠落

また、開始マーカーは「単一テキスト子だけを持つ paragraph」として解析する。実装上は次の 2 パターンをサポートする。

```markdown
::callout{kind="tip" heading="補足"}
本文
::
```

```text
"::callout{kind=\"tip\" heading=\"補足\"}\n本文\n::"
```

後者は、MDAST 上で 1 つの paragraph の単一 text node に畳まれていても処理できる folded paragraph 対応を指す。

## rehype 層

### 1. 見出し ID を補完する

[`lib/rehype/rehype-heading-ids.ts`](/Users/ruo/Desktop/Programing/Rouault/lib/rehype/rehype-heading-ids.ts#L65) は `h1` から `h6` に `id` が無い場合、見出しテキストから slug を生成する。重複時は `-2`, `-3` を付け、空 slug は `section` にフォールバックする。

### 2. 標準 HTML 要素を Rouault コンポーネントへ正規化する

[`lib/rehype/rouault-components.ts`](/Users/ruo/Desktop/Programing/Rouault/lib/rehype/rouault-components.ts#L699) が担当する。

| 入力 HAST                     | 出力                                              | 補足                                                                                                                                                                                    |
| ----------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pre > code`                  | `ui-code-block`                                   | `language-*` から `lang` を推論。`filename` / `group-key` / `tab-label` / `copy-label` / `copyable` / `intent` / `copy-mode` / `wrap` / `highlight-lines` / `layout` はホスト属性へ昇格 |
| `blockquote`                  | `ui-blockquote`                                   | 子要素は維持                                                                                                                                                                            |
| `table`                       | `ui-table > table`                                | `caption` があればホストに `aria-label` を補完                                                                                                                                          |
| `hr`                          | `ui-divider > hr[data-divider-variant="section"]` | Markdown 由来の区切りは本文文脈として `section` 扱いに正規化し、見た目と意味論を分離                                                                                                    |
| `li` + `input[type=checkbox]` | `ui-checkbox`                                     | task list のラベルを抽出し、後続のネストリストは維持                                                                                                                                    |
| `mark`                        | `ui-highlight`                                    | `origin` / `data-origin`、`current` / `data-current` / `aria-current` を吸収                                                                                                            |
| `img`                         | `ui-image`                                        | `src` / `alt` / `title` / `loading` / `zoomable` / `width` / `height` を正規化                                                                                                          |
| `figure(img + figcaption)`    | `ui-image`                                        | `figcaption` を `caption` に統合                                                                                                                                                        |
| footnote 参照 / 定義          | `ui-footnote` + `section[role=doc-endnotes]`      | 参照回数、backref、`user-content-` 接頭辞を正規化し、trigger/backlink を `{refId}-ref-{refInstance}` で接続                                                                        |

脚注については、最初の参照だけが本文ノードを内包する primary reference となり、2 回目以降の参照は `shared` と `ref-instance` だけを持つ secondary reference になる。endnotes 側の backlink 群は各 `refInstance` に対応する `#${refId}-ref-${refInstance}` を出力する。

### 2.5. preview-sandbox source を inert payload へ展開する

[`lib/rehype/preview-sandbox.ts`](/Users/ruo/Desktop/Programing/Rouault/lib/rehype/preview-sandbox.ts) は `ui-code-preview > ui-preview-sandbox` を検出し、内部の `preview-html` / `preview-css` / `preview-js` fenced code を次へ変換する。

1. `template[data-preview-kind]` の inert payload
2. 高さ同期用 helper script を含む iframe `srcdoc`
3. 表示用の code area（1件なら単体 code block、複数なら `ui-code-group`）

この変換は `rehypeShikiCodeBlocks` より前に実行し、後続の Shiki と `rehypeRouaultComponents` に通常の code block として流す。

### 3. インラインコードと順序付きリストの契約を付与する

[`lib/rehype/inline-code-translate-no.ts`](/Users/ruo/Desktop/Programing/Rouault/lib/rehype/inline-code-translate-no.ts#L3) は `pre > code` 以外の `code` に `translate="no"` を付与する。

[`lib/rehype/ordered-list-contracts.ts`](/Users/ruo/Desktop/Programing/Rouault/lib/rehype/ordered-list-contracts.ts#L9) は `ol` / `li` に対して次を build-time で付与する。

1. `data-marker-digits="3"` の自動判定
2. `start` / `reversed` / `li[value]` を CSS カウンター変数へ転写
3. `role="list"` / `role="listitem"` の補強
4. `data-ol-has-value` の付与

許可される style は `--ui-ol-counter-reset` / `--ui-ol-counter-step` / `--ui-ol-counter-set` のみで、この契約は後段の安全性検査とも整合している。

### 4. 危険属性と静的ハイライトを禁止する

[`lib/rehype/disallow-dangerous-props.ts`](/Users/ruo/Desktop/Programing/Rouault/lib/rehype/disallow-dangerous-props.ts#L96) は次を禁止する。

1. `on*` 属性
2. `srcdoc`
3. `javascript:` / `vbscript:` / `data:` などの危険 URL
4. 許可外の `style`

例外は 2 つだけである。

1. KaTeX 配下の style
2. ordered list 契約で使う CSS カスタムプロパティ

[`lib/rehype/disallow-static-mark.ts`](/Users/ruo/Desktop/Programing/Rouault/lib/rehype/disallow-static-mark.ts#L3) は最終 HAST に静的 `<mark>` が残っていた場合にエラーにする。著者入力由来の raw `<mark>` は remark 段階で既に止まるため、これは「最終出力の不変条件」を守るためのガードである。

## 現在の制約

1. `translation` は block children を保持しない。子要素から拾うのは 1 段落目と 2 段落目のプレーンテキスト相当で、最終的には `original` / `translated` 属性へ昇格したあと `children: []` になる。
2. `tabs` は slot 属性を付けるところまでで、`tab/panel` の個数整合までは検証しない。
3. `preview-sandbox.allow-js=false` は author supplied JavaScript を注入しないことだけを意味する。platform helper script の有無とは独立である。
4. `code-preview` で `preview-sandbox` を使う場合、手書き `::preview` と手書き code area は禁止し、自動生成に固定する。
5. ブロックディレクティブは paragraph テキストを自前解析しているため、micromark / `remark-directive` ベースの一般的な directive AST とは互換ではない。開始行と終端行は、独立した paragraph か、単一 text node に畳まれた 1 paragraph 内の独立行として存在する必要がある。
6. `tabs.url-sync` は `?tab=` 同期を有効にする。現在はページの主タブ 1 系統のみを想定し、複数の query key は導入していない。

## テストで固定している範囲

現状の仕様は次の単体テスト群で固定している。

1. [`test/unit/remark-disallow-raw-html.test.ts`](/Users/ruo/Desktop/Programing/Rouault/test/unit/remark-disallow-raw-html.test.ts)
2. [`test/unit/remark-rouault-directives.test.ts`](/Users/ruo/Desktop/Programing/Rouault/test/unit/remark-rouault-directives.test.ts)
3. [`test/unit/rehype-heading-ids.test.ts`](/Users/ruo/Desktop/Programing/Rouault/test/unit/rehype-heading-ids.test.ts)
4. [`test/unit/rehype-rouault-components.test.ts`](/Users/ruo/Desktop/Programing/Rouault/test/unit/rehype-rouault-components.test.ts)
5. [`test/unit/rehype-disallow-dangerous-props.test.ts`](/Users/ruo/Desktop/Programing/Rouault/test/unit/rehype-disallow-dangerous-props.test.ts)

今後この戦略を更新する場合は、先にテストを増やし、そのあと文書を追従させる。
