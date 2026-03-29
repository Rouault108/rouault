# Markdown Authoring Specification

## 概要

本書は、Rouault における Markdown authoring grammar の正本です。

本書は、著者が記述できる構文、ディレクティブ、属性、値域、バリデーション規則、および authoring 起点の既知制約を定義します。出力 DOM の詳細契約および最終安全検査は本書の対象外とし、別文書で所有します。

---

## 1. 文書の目的

本書の目的は、Rouault における著者入力契約について次を固定することです。

- 著者入力が依拠する基本方針
- 受理されるブロックディレクティブ
- 受理されるインライン拡張
- 各属性の許可一覧と値域
- metadata cache を用いた link-card 解決規則
- remark 段階の validation 規則
- authoring 起点の既知制約

---

## 2. 適用範囲

本書は、remark 層で解釈される authoring input に適用します。

対象:

- Markdown 本文
- Rouault 独自ディレクティブ
- インライン拡張記法
- 画像属性ブロック
- link-card metadata 補完
- authoring 入力に対する build-time validation

非対象:

- rehype 後の最終出力 DOM 契約
- 危険属性の最終出力検査
- Web Components の Shadow DOM 実装詳細
- CSS、トークン、表示外観そのもの

---

## 3. 基本方針

### 3.1 CommonMark 優先

著者入力はできる限り CommonMark ベースに寄せます。Rouault 固有 UI は独自ディレクティブで明示的に導入します。

### 3.2 生 HTML の禁止

著者入力として raw HTML を許可しません。著者は Markdown 構文または Rouault ディレクティブのみを用いなければなりません。

### 3.3 未知入力の即時拒否

未対応ディレクティブ、未対応属性、重複属性、不正値は build-time で即時エラーにします。暗黙の無視や best effort 解釈は行いません。

### 3.4 authoring と output の分離

著者入力で許可される記法と、最終出力 DOM の形は分離して扱います。本書は authoring grammar の正本であり、出力 DOM 正規化の正本ではありません。

### 3.5 folded paragraph 対応

ブロックディレクティブの開始行と終端行は、独立 paragraph として存在してもよく、単一 text node に畳まれた 1 paragraph 内の独立行として存在してもよいものとします。ただし、これは authoring 互換のための実装制約であり、一般的な directive AST 互換を意味しません。

---

## 4. authoring 基本制約

### 4.1 Markdown 本文

- 通常本文は CommonMark を基底とします。
- 数式は `remarkMath` が受理する記法を前提としてよいものとします。
- raw HTML は authoring として禁止します。

### 4.2 独自ディレクティブ

- Rouault 固有 UI は `::directive{...}` 記法により導入します。
- ブロックディレクティブは paragraph テキストとして解釈されます。
- leaf directive と block directive を混同してはなりません。
- 属性は明示列挙されたものだけを許可します。

### 4.3 属性の一般規則

- 属性名は仕様に列挙されたものだけを許可します。
- 重複属性はエラーとします。
- enum、boolean、integer は規定値域の外を許可しません。
- boolean は意味論がある場合にだけ受理します。
- integer は意味論上有効な範囲に限定します。
- 値の無い属性を truthy shorthand として勝手に解釈してはなりません。

---

## 5. ブロックディレクティブ仕様

### 5.1 一覧

| 入力 | 出力ノード | 許可属性 / 補足 |
| --- | --- | --- |
| `::callout` | `ui-callout` | `kind` / `heading` / `label` / `icon` / `heading-level` |
| `::code-group` | `ui-code-group` | `aria-label`。内包 `code` メタは `filename` / `group-key` / `tab-label` / `copy-label` / `copyable` / `copy-mode` / `wrap` / `highlight-lines` / `layout` |
| `::code-preview` | `ui-code-preview` | `heading` / `controls` / `preview-padding` / `preview-align` / `preview-theme` / `preview-surface` / `preview-viewport` |
| `::preview-sandbox` | `ui-preview-sandbox` | `title` / `allow-js` / `height`。`code-preview` 直下専用。内部は `preview-html` / `preview-css` / `preview-js` fenced code のみ |
| `::details` | `ui-details` | `summary` または `aria-label` 必須。両立不可。`open` / `variant` / `region` |
| `::info-box` | `ui-info-box` | `heading` / `icon` / `heading-level` / `landmark` / `variant` / `density` |
| `::link-card` | `ui-card` | leaf directive。`url` 必須。`title` / `description` / `image` / `site-name`。終端 `::` は不要 |
| `::score` | `ui-score` | `src` / `caption` / `label` / `description` / `aspect-ratio` / `loading` / `primary` |
| `::tabs` | `ui-tabs` | `selected-value` / `default-selected-value` / `orientation` / `automatic-activation` / `url-sync` |
| `::translation` | `ui-translation` | `original` / `translated` / `lang` / `target-lang` / `render-mode` / `open` |
| `::preview` | `div[slot=preview]` | 属性なし |
| `::toolbar` | `div[slot=toolbar]` | 内部 / 互換用。著者向け公開文法では非推奨 |
| `::tab` | `div[slot=tab]` | `value` |
| `::panel` | `div[slot=panel]` | 属性なし |

### 5.2 共通規則

- 未対応ディレクティブはエラーとします。
- 未対応属性はエラーとします。
- 終端 `::` が必要な block directive で終端が欠落している場合はエラーとします。
- `::link-card` は leaf directive であり、終端 `::` を要求しません。
- ディレクティブ開始行は単一 text node として解釈可能でなければなりません。

### 5.3 `::callout`

許可属性:

- `kind`
- `heading`
- `label`
- `icon`
- `heading-level`

値域:

- `kind`: `note | tip | success | warning | danger`

規則:

- `heading-level` は見出しレベルを表す数値入力として扱います。
- `heading` と `label` は意味を混同してはなりません。
- `kind` は見た目指定ではなく意味カテゴリとして扱います。

### 5.4 `::code-group`

許可属性:

- `aria-label`

内包 `code` メタ許可属性:

- `filename`
- `group-key`
- `tab-label`
- `copy-label`
- `copyable`
- `copy-mode`
- `wrap`
- `highlight-lines`
- `layout`
- `intent`

値域:

- `intent`: `neutral | valid | invalid`

規則:

- `code-group` 自身はコード群のグルーピングを表します。
- 各 `code` ブロックのメタは後段で `ui-code-block` のホスト属性へ昇格してよいものとします。

### 5.5 `::code-preview`

許可属性:

- `heading`
- `controls`
- `preview-padding`
- `preview-align`
- `preview-theme`
- `preview-surface`
- `preview-viewport`

値域:

- `controls`: 空白区切りで `theme | surface | viewport`
- `preview-padding`: `normal | compact | none`
- `preview-align`: `center | start | stretch`
- `preview-theme`: `page | light | dark`
- `preview-surface`: `surface | canvas | muted`
- `preview-viewport`: `full | tablet | mobile`

規則:

- `code-preview` は preview 表示と code 表示を束ねる authoring 単位です。
- `preview-sandbox` を用いる場合の追加制約は 5.6 に従います。

### 5.6 `::preview-sandbox`

許可属性:

- `title`
- `allow-js`
- `height`

内部許可コード言語:

- `preview-html`
- `preview-css`
- `preview-js`

規則:

- `preview-sandbox` は `code-preview` 直下でのみ許可します。
- `preview-sandbox` の内部には上記 3 種の fenced code だけを置けます。
- `height` は正の整数でなければなりません。
- `allow-js` は author supplied JavaScript の注入許可のみを表します。
- `allow-js=false` は platform helper script の抑止を意味しません。
- `code-preview` で `preview-sandbox` を使う場合、手書き `::preview` と手書き code area を併用してはなりません。

### 5.7 `::details`

許可属性:

- `summary`
- `aria-label`
- `open`
- `variant`
- `region`

値域:

- `variant`: `default | bordered`

規則:

- `summary` または `aria-label` のいずれか一方は必須です。
- `summary` と `aria-label` を同時に指定してはなりません。
- `open` は初期開閉状態を表します。

### 5.8 `::info-box`

許可属性:

- `heading`
- `icon`
- `heading-level`
- `landmark`
- `variant`
- `density`

値域:

- `variant`: `default | filled`
- `density`: `comfortable | compact`

規則:

- `heading` は表示見出しを表します。
- `landmark` はセマンティクス上必要な場合にのみ使います。

### 5.9 `::link-card`

許可属性:

- `url`
- `title`
- `description`
- `image`
- `site-name`

規則:

- `url` は必須です。
- `url` は後段で `http/https` 絶対 URL として検証されます。
- `image` は `/` から始まるルート相対 URL または `http/https` 絶対 URL のみ許可します。
- `link-card` は leaf directive とし、終端 `::` は不要です。
- 最終出力では generic card 用入力である `clickable` を含めてはなりません。

### 5.10 `::score`

許可属性:

- `src`
- `caption`
- `label`
- `description`
- `aspect-ratio`
- `loading`
- `primary`

値域:

- `loading`: `lazy | eager`

規則:

- `src` は対象リソース位置を表します。
- `caption` と `label` は表示責務が異なるため、同義語として扱ってはなりません。

### 5.11 `::tabs`

許可属性:

- `selected-value`
- `default-selected-value`
- `orientation`
- `automatic-activation`
- `url-sync`

値域:

- `orientation`: `horizontal | vertical`

規則:

- `tab` と `panel` の対応は authoring 上重要ですが、現行実装では個数整合まで検証しません。
- `url-sync` は `?tab=` 同期を有効にします。
- 現行運用ではページ主タブ 1 系統のみを想定します。

### 5.12 `::translation`

許可属性:

- `original`
- `translated`
- `lang`
- `target-lang`
- `render-mode`
- `open`

値域:

- `render-mode`: `popover | drawer | interlinear`

規則:

- 子要素からのテキスト昇格は現行制約に従います。
- `translation` の block children は最終的に保持しません。

### 5.13 `::preview`

規則:

- `div[slot=preview]` へ正規化されます。
- `preview-sandbox` 併用時は author 手書きを禁止します。

### 5.14 `::toolbar`

規則:

- 内部 / 互換用スロットです。
- 著者向け公開文法では非推奨とします。
- 新規 authoring では原則として使用してはなりません。

### 5.15 `::tab`

許可属性:

- `value`

規則:

- `tabs` 配下でのみ意味を持ちます。
- `value` は `panel` 対応の識別に用います。

### 5.16 `::panel`

規則:

- `tabs` 配下のパネルスロットを表します。
- 属性は持ちません。

---

## 6. link-card metadata 解決規則

### 6.1 担当

`remarkLinkCards` は次を担当します。

1. `::link-card{...}` を最終的な `ui-card[card-kind="link"]` に解決する
2. 単独段落の外部リンク 1 件だけを自動リンクカード化する
3. 生成済み metadata cache により `title` / `description` / `image` / `site-name` を補完する
4. cache に値が無い場合は URL host 名でフォールバックする
5. remark 段階では外部ネットワーク取得を行わない

### 6.2 metadata 解決順序

各フィールドの解決順序は次のとおりとします。

- `title`: `著者指定 > metadata cache > URL host`
- `description`: `著者指定 > metadata cache`
- `image`: `著者指定 > metadata cache`
- `site-name`: `著者指定 > metadata cache > URL host`

### 6.3 cache の位置

metadata cache の既定位置は `content/_generated/link-card-metadata.json` とします。

規則:

- cache は別スクリプトで更新します。
- `pnpm dev` / `pnpm build` のクリティカルパスに外部取得を含めてはなりません。
- authoring の意味論を外部ネットワーク可用性へ依存させてはなりません。

### 6.4 最終属性

link-card 解決後の主要属性は少なくとも次を持つものとします。

- `href`
- `card-kind="link"`
- `card-title`
- `description`
- `image-src`
- `site-name`

規則:

- generic card 専用入力である `clickable` は link-card 解決結果へ含めてはなりません。

---

## 7. インライン記法仕様

### 7.1 一覧

| 入力 | 出力 | 補足 |
| --- | --- | --- |
| `:emoji[text]{aria-label="..."}` | `span` | `label` または `aria-label` があれば `role="img"` を付与 |
| `:subscript[text]` / `~text~` | `sub` | 属性なし |
| `:superscript[text]` / `^text^` | `sup` | 属性なし |
| `:highlight[text]{current-match="true"}` | `ui-highlight` | `current-match` のみ許可 |
| `==text==` | `ui-highlight` | 追加属性なし |
| `:sparkles:` など | 絵文字文字列 | 内蔵 shortcodes のみ置換 |

### 7.2 emoji

規則:

- `:emoji[text]{...}` は `span` へ展開します。
- `label` または `aria-label` を持つ場合に `role="img"` を付与してよいものとします。
- 無関係な属性は許可しません。

### 7.3 subscript / superscript

規則:

- `:subscript[text]` と `~text~` は `sub` として扱います。
- `:superscript[text]` と `^text^` は `sup` として扱います。
- 追加属性は持ちません。

### 7.4 highlight

規則:

- `:highlight[text]{current-match="true"}` は `ui-highlight` として扱います。
- `current-match` 以外の追加属性を許可しません。
- `==text==` は属性なしの `ui-highlight` として扱います。

### 7.5 shortcodes

内蔵 shortcodes は次に限定します。

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

規則:

- 上記以外の shortcode を暗黙に受理してはなりません。
- shortcode は絵文字文字列へ置換します。

---

## 8. 画像属性ブロック

標準画像記法の直後に置かれた属性ブロック `![alt](src "caption"){...}` を検出し、対応する `img` の `data.hProperties` へ転写します。

### 8.1 サポート属性

- `loading`
- `width`
- `height`
- `zoomable`

### 8.2 規則

- 本文画像の `src` は `content/_assets/...` のローカル source path のみ許可します。
- frontmatter `cover` も `content/_assets/...` のローカル source path のみ許可します。
- キャプションは標準 Markdown の title 文字列を使います。
- `zoomable` は authoring 層では `true` / `false` 文字列で受け取り、後段で `ui-image` の入力へ正規化します。
- `loading` の既定値は `lazy` とし、`eager` は本文先頭の LCP 候補 1 枚に限定します。
- 未対応属性はエラーとします。

---

## 9. バリデーション規則

### 9.1 即時エラー対象

remark 段階では次を即時エラーとします。

1. 未対応ディレクティブ
2. 未対応属性
3. 重複属性
4. enum / boolean / integer の不正値
5. ディレクティブ終端 `::` の欠落

### 9.2 開始マーカーの解釈

開始マーカーは、単一テキスト子だけを持つ paragraph として解析します。

サポート例:

```markdown
::callout{kind="tip" heading="補足"}
本文
::
```

```text
"::callout{kind=\"tip\" heading=\"補足\"}\n本文\n::"
```

規則:

* 後者は folded paragraph 対応を意味します。
* これは一般的な `remark-directive` AST 互換を保証するものではありません。

---

## 10. 既知制約

### 10.1 `translation`

`translation` は block children を保持しません。子要素から拾うのは 1 段落目と 2 段落目のプレーンテキスト相当であり、最終的には `original` / `translated` 属性へ昇格したあと `children: []` になります。

### 10.2 `tabs`

`tabs` は slot 属性を付けるところまでを担い、`tab` / `panel` の個数整合までは検証しません。

### 10.3 `preview-sandbox.allow-js`

`preview-sandbox.allow-js=false` は author supplied JavaScript を注入しないことだけを意味します。platform helper script の有無とは独立です。

### 10.4 `code-preview` と `preview-sandbox`

`code-preview` で `preview-sandbox` を使う場合、手書き `::preview` と手書き code area は禁止し、自動生成へ固定します。

### 10.5 custom directive parser

ブロックディレクティブは paragraph テキストを自前解析しているため、micromark / `remark-directive` ベースの一般的な directive AST とは互換ではありません。

### 10.6 `tabs.url-sync`

`tabs.url-sync` は `?tab=` 同期を有効にします。現在はページ主タブ 1 系統のみを想定し、複数 query key は導入していません。

---

## 11. 非推奨事項

### 11.1 `::toolbar`

`::toolbar` は内部 / 互換用途に限定し、新規 authoring では非推奨とします。

### 11.2 output 寄り属性の authoring 露出

出力 DOM の都合による内部属性名を著者向け契約として露出してはなりません。

### 11.3 実行時救済前提の authoring

build-time で契約違反となる入力を、「実行時にうまく表示されるかもしれない」ことを理由に許可してはなりません。

---

## 12. 他文書との関係

* 出力 DOM 契約は `docs/markdown-output-contract.md` を参照します。
* safety policy と trust boundary は `docs/markdown-safety-and-test-policy.md` を参照します。
* アクセシビリティ要求は `docs/accessibility.md` を参照します。
* 見た目やトークンの契約は `docs/foundations.md` を参照します。

---

## 13. 改訂規則

* 著者が記述できる構文の追加・削除・意味論変更は本書を直接改訂しなければなりません。
* 実装メモやテスト名だけを更新して authoring grammar を既成事実化してはなりません。
* 既知制約が設計上固定か暫定実装かを変える場合は、`docs/markdown-safety-and-test-policy.md` との整合も同時に更新しなければなりません。
