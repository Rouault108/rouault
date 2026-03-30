# Markdown Output Contract

## 概要

本書は、Rouault の Markdown 変換後に成立しなければならない出力 DOM 契約の正本です。

本書は、rehype 以降の HAST 正規化、Web Components への収束、最終 DOM 不変条件、および preview-sandbox の出力契約を定義します。authoring grammar は本書の対象外です。

---

## 1. 文書の目的

本書の目的は、Markdown 変換後の出力について次を固定することです。

- 見出し ID の補完規則
- 標準 HTML から Rouault コンポーネントへの正規化規則
- note ページにおける hydration directive の build-time 注釈規則
- 本文リンクの出力属性注釈契約
- footnote の出力契約
- preview-sandbox の出力契約
- インラインコードと順序付きリストに対する補助契約
- 最終 HAST に対する不変条件

---

## 2. 適用範囲

本書は、rehype 層以降の出力表現に適用します。

対象:

- 見出し要素
- 本文リンク (`a[href]` ただし `.heading-anchor` を除く)
- `pre[data-code-block] > code[data-lang]`
- `section[data-code-group]`
- `blockquote`
- `table`
- `hr`
- task list
- `mark`
- `img` / `figure`
- note ページにおける `data-hydration-*` 注釈
- footnote
- `ui-code-preview > ui-preview-sandbox`
- inline code
- `ol` / `li`

非対象:

- 著者入力としてどの構文を書くか
- raw HTML の authoring 禁止規則
- metadata cache の更新戦略
- 安全規約の詳細な禁止一覧そのもの

---

## 3. 基本原則

### 3.1 標準 HTML から契約済み DOM へ正規化する

Markdown 由来の標準 HTML は、そのまま表示都合に流さず、Rouault の契約済み DOM へ正規化します。

### 3.2 意味論を優先する

見た目だけを理由に標準要素の意味論を失ってはなりません。正規化は見た目の置換ではなく、意味を保持した収束でなければなりません。

### 3.3 build-time で DOM 契約を確定する

表示時の推測や実行時補修に依存せず、build-time で DOM 契約を確定します。

### 3.4 component 境界を明示する

どの HTML がどの Rouault コンポーネントへ収束するかを固定し、曖昧な二重解釈を許しません。

---

## 4. 見出し ID 契約

### 4.1 ID 補完

`h1` から `h6` に `id` が無い場合、見出しテキストから slug を生成し `id` を補完しなければなりません。

### 4.2 重複時の規則

重複する slug が生じる場合、`-2`、`-3` のような suffix を付与して一意化しなければなりません。

### 4.3 空 slug

見出しテキストから有効な slug が生成できない場合、`section` にフォールバックしなければなりません。

### 4.4 不変条件

- 補完された `id` は文書内で一意でなければなりません。
- 出力 DOM 上の見出しは、リンク可能な安定 ID を持つことが望まれます。
- 同一文書からの再ビルドで不要に ID を揺らしてはなりません。

---

## 5. 標準 HTML 要素の正規化契約

### 5.1 一覧

| 入力 HAST                     | 出力                                              | 契約                                                                                                                                                                                                               |
| ----------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pre > code`                  | `pre[data-code-block] > code[data-lang]`          | `language-*` から `data-lang` / `data-code-language` を推論し、対象メタ属性を `pre[data-code-block]` の `data-code-*` 属性へ正規化する。note 本文では個々の code block を hydrate せず、必要な場合に限り `code-block-enhancer` 用の build-time 注釈を代表 root に付与する |
| `blockquote`                  | `ui-blockquote`                                   | 子要素は維持する                                                                                                                                                                                                   |
| `table`                       | `ui-table > table`                                | `caption` があればホストに `aria-label` を補完する                                                                                                                                                                 |
| `hr`                          | `ui-divider > hr[data-divider-variant="section"]` | Markdown 由来の区切りを本文文脈の `section` として正規化する                                                                                                                                                       |
| `li` + `input[type=checkbox]` | `ui-checkbox`                                     | task list ラベルを抽出し、後続ネストリストを維持する                                                                                                                                                               |
| `mark`                        | `ui-highlight`                                    | `current-match` / `data-current-match` を正規入力とし、旧属性を互換吸収する                                                                                                                                        |
| `img`                         | `ui-image`                                        | `src` / `alt` / `title` / `loading` / `zoomable` / `width` / `height` を正規化する。`zoomable!="false"` の note 本文では `data-hydration-capability="progressive"` / `data-hydration-trigger="visible"` を付与する |
| `figure(img + figcaption)`    | `ui-image`                                        | `figcaption` を `caption` に統合する。`zoomable!="false"` の note 本文では `data-hydration-capability="progressive"` / `data-hydration-trigger="visible"` を付与する                                               |
| `a[href]`（本文リンク）       | `a[data-link-kind][data-link-surface="prose"]`    | `href` から種別注釈を付与し、外部系では `data-external="true"` を付与する。`.heading-anchor` は対象外とする                                                                                                        |
| footnote 参照 / 定義          | `ui-footnote` + `section[role=doc-endnotes]`      | 参照 ID、backref、接頭辞、backlink を正規化する                                                                                                                                                                    |

### 5.2 `pre > code` → `pre[data-code-block] > code[data-lang]`

規則:

- `language-*` から `lang` を推論しなければなりません。
- `code` 要素には `data-lang` を出力しなければなりません。
- `pre` 要素には `data-code-block` と `data-code-language` を出力しなければなりません。
- 次の属性は `pre[data-code-block]` の `data-code-*` 属性へ正規化してよいものとします。
  - `filename` → `data-code-filename`
  - `group-key` → `data-code-group-key`
  - `tab-label` → `data-code-tab-label`
  - `copy-label` → `data-code-copy-label`
  - `copyable` → `data-code-copyable`
  - `intent` → `data-code-intent`
  - `copy-mode` → `data-code-copy-mode`
  - `wrap` → `data-code-wrap`
  - `highlight-lines` → `data-code-highlight-lines`
  - `layout` → `data-code-layout`
  - `show-line-numbers` → `data-code-line-numbers`
- コード本体の意味を失わないことを優先します。
- note 本文の最終 DOM は `pre[data-code-block] > code[data-lang]` を正本としなければなりません。
- note 本文では code block ごとに個別 hydrate してはなりません。
- standalone code block に対する runtime enhancement が必要な場合、build-time では代表 root にのみ `data-hydration-key="code-block-enhancer"`、`data-hydration-capability="progressive"`、`data-hydration-trigger="post-commit"` を付与してよいものとします。
- `ui-code-block` は互換 adapter として残してよいですが、note 本文の最終 DOM 正本にしてはなりません。

#### 5.2.1 no-JS 契約

- note 本文における code surface の最終 DOM は `pre[data-code-block]` でなければなりません。
- JavaScript 無効時でも、`pre[data-code-block] > code[data-lang]` の読解可能性を失ってはなりません。
- no-JS で保証するのは内容読解可能性、行番号表示、折り返し指定、印刷、forced-colors 下での判読性です。
- copy button、動的 overflow 補助、copy 成功表示などは enhancement として省略されてよいです。
- no-JS 成立に必要な descendant styling は、静的配信 CSS に含まれなければなりません。
- client bundle 配送失敗は no-JS の許容退行ではなく、delivery 契約違反です。

### 5.3 `blockquote` → `ui-blockquote`

規則:

- 子要素を維持しなければなりません。
- 引用の文書構造を破壊してはなりません。

### 5.4 `table` → `ui-table > table`

規則:

- `table` は `ui-table` ホスト内へ保持しなければなりません。
- `caption` が存在する場合、ホストへ `aria-label` を補完してよいものとします。
- 行列構造や `thead` / `tbody` / `tfoot` の意味を失ってはなりません。

### 5.5 `hr` → `ui-divider > hr[data-divider-variant="section"]`

規則:

- Markdown 由来の区切りは本文文脈として `section` 扱いへ正規化します。
- 見た目と意味論を混同してはなりません。

### 5.6 task list → `ui-checkbox`

規則:

- `li` と `input[type=checkbox]` の組は `ui-checkbox` へ正規化します。
- ラベルテキストを抽出しなければなりません。
- 後続ネストリストは維持しなければなりません。
- note 本文の `ui-checkbox` には `data-hydration-capability="interactive"` と `data-hydration-trigger="initial"` を付与しなければなりません。

### 5.7 `mark` → `ui-highlight`

規則:

- 正規入力は `current-match` および `data-current-match` とします。
- 旧 `current` / `data-current` / `aria-current` は互換入力として吸収してよいものとします。
- 最終 HAST に静的 `<mark>` を残してはなりません。

### 5.8 `img` / `figure` → `ui-image`

規則:

- `img` は `ui-image` に正規化しなければなりません。
- source path は manifest resolver を経由し、読者向け最終 HTML には remote 原本 URL を残してはなりません。
- `src` / `srcset` / `sizes` / `sources` / `lightbox-src` / `lightbox-sources` / `alt` / `title` / `loading` / `zoomable` / `width` / `height` / `placeholder` を正規化しなければなりません。
- `zoomable=false` は静的モードとして引き継がなければなりません。
- `zoomable=false` の `ui-image` に hydration directive を付与してはなりません。
- `zoomable!=false` の note 本文画像には `data-hydration-capability="progressive"` と `data-hydration-trigger="visible"` を付与しなければなりません。
- 最終出力は `<picture>` 相当の意味論へ収束しなければなりません。
- `figure(img + figcaption)` は `figcaption` を `caption` に統合して `ui-image` へ収束させなければなりません。

### 5.9 本文リンク → 注釈付き `a`

規則:

- 対象は本文リンク `a[href]` とし、`.heading-anchor` は本契約の対象外とします。
- build-time で `href` を分類し、`data-link-kind` を付与しなければなりません。
- build-time で `data-link-surface="prose"` を付与しなければなりません。
- `data-link-kind` が `external-web` または `external-action` の場合、`data-external="true"` を付与しなければなりません。
- `data-link-kind` の分類値は次に限定します。
  - `internal-document`
  - `internal-fragment`
  - `external-web`
  - `external-action`
  - `unsafe`

分類規則:

- `#...` のみから成る参照は `internal-fragment` としなければなりません。
- scheme を持たない相対 URL またはルート相対 URL は `internal-document` としなければなりません。
- `http:` または `https:` を持つ URL は `external-web` としなければなりません。
- `mailto:` または `tel:` を持つ URL は `external-action` としなければなりません。
- 危険な scheme は `unsafe` として扱わなければなりません。

補足規則:

- 本契約は Markdown 出力 DOM に対する注釈契約であり、router による内部遷移判定そのものを再定義してはなりません。
- 同一 origin の絶対 URL を内部遷移として扱うかどうかは `docs/router-specification.md` が所有します。
- `unsafe` は最終許容出力ではありません。安全規約に従い、build-time で拒否または除去されなければなりません。

### 5.9.1 code group の no-JS / enhancement 契約

- note 本文における code group の最終 DOM は `section[data-code-group]` でなければなりません。
- `section[data-code-group]` は、少なくとも `data-code-group-selected` と panel 群を持ち、各 panel は 1 件の `pre[data-code-block]` を保持しなければなりません。
- JavaScript 無効時は stacked fallback で全 code block を読めなければなりません。
- tab selection、keyboard navigation、active item に応じた copy context は hydration 後の enhancement とします。
- `ui-code-group` は互換 adapter として残してよいですが、note 本文の最終 DOM 正本にしてはなりません。

### 5.10 note ページの hydration directive 契約

`NoteLayout` と Markdown 変換経路は、note ページに限り hydration の source of truth を build-time 注釈で確定しなければなりません。client 側はこの注釈を優先して queue を構築し、DOM 全体の推測走査を正規経路にしてはなりません。

note ページの scope は次の 4 つです。

- `data-hydration-scope="note-shell"`
- `data-hydration-scope="note-sidebar"`
- `data-hydration-scope="note-content"`
- `data-hydration-scope="note-toc"`

note 本文の標準マッピングは次のとおりです。

| ノード                                   | capability    | trigger       |
| ---------------------------------------- | ------------- | ------------- |
| `layout-sidebar`                         | `interactive` | `initial`     |
| `layout-toc[runtime capability あり]`    | `interactive` | `initial`     |
| `ui-article-header[data-tags]`           | `progressive` | `post-commit` |
| `ui-image[zoomable!="false"]`            | `progressive` | `visible`     |
| `pre[data-code-block][data-hydration-key="code-block-enhancer"]` | `progressive` | `post-commit` |
| `section[data-code-group]`                                        | `interactive` | `visible`     |
| `ui-code-preview[controls あり]`         | `interactive` | `visible`     |
| `ui-code-preview[slot="toolbar" を持つ]` | `interactive` | `visible`     |
| `ui-tabs`                                | `interactive` | `initial`     |
| `ui-translation`                         | `interactive` | `visible`     |
| `ui-preview-sandbox`                     | `sandboxed`   | `interaction` |
| `ui-score`                               | `progressive` | `visible`     |

補足規則:

- `layout-toc` は `capabilities-json` に `activeTracking` / `dynamicScopes` / `mobileSummary` のいずれかがある場合にだけ directive を持ちます。
- `ui-image[zoomable="false"]` には directive を付与してはなりません。
- standalone code block は要素単位で hydrate してはなりません。必要な場合に限り、scope 内の code surface を一括強化する代表 root にだけ `code-block-enhancer` 用 directive を付与しなければなりません。
- `ui-code-preview` は `controls` も `toolbar` もない場合、directive を付与してはなりません。
- `ui-tabs` は note 本文では `data-hydration-capability="interactive"` / `data-hydration-trigger="initial"` を付与しなければなりません。
- static translation は `div.translation-static[data-translation-kind="static"]` として出力し、hydration directive を付与してはなりません。
- overlay translation は `ui-translation[surface]` として出力し、`data-hydration-capability="interactive"` / `data-hydration-trigger="visible"` を付与しなければなりません。
- static translation の子要素は `translation-original` / `translation-translated` の 2 paragraph に固定し、それぞれの本文は plain-text のみを含まなければなりません。
- overlay translation は `ui-translation` の `original` / `translated` 属性へ plain-text を渡す契約であり、構造化 child content を出力してはなりません。
- `translation` family に由来する inline markup・脚注・リンク・ルビ等の構造は、出力契約として保持してはなりません。
- build-time で directive を持たない静的 note UI を hydration 対象として拡張してはなりません。

### 5.10.1 note hydration budget

note ページの hydration budget は build-time の正本として固定し、`buildNotePageProjection()` が超過を拒否しなければなりません。`HydrationScheduler` の dev diagnostic は観測用であり、budget gate の代替ではありません。

現行の全体上限は次のとおりです。

| 項目           | 上限 |
| -------------- | ---- |
| `initial`      | 6    |
| `post-commit`  | 1    |
| `visible`      | 2    |
| `interaction`  | 1    |
| `total`        | 7    |

現在の代表 canary は次の 3 つです。

| canary note                          | initial | post-commit | visible | interaction | total |
| ------------------------------------- | ------- | ----------- | ------- | ----------- | ----- |
| `computer-science/algorithms/sorting` | 3       | 1           | 1       | 0           | 5     |
| `testing/interactive`                | 6       | 0           | 1       | 0           | 7     |
| `testing/sandbox`                    | 0       | 0           | 2       | 1           | 3     |

規則:

- 上限を 1 つでも超えた note は build-time error にしなければなりません。
- 代表 canary の counts は `test/ssr/note-hydration-budget.test.ts` で固定しなければなりません。
- `testing/interactive` は interactive UI canary であり、code-block enhancer など code surface の post-commit hydration を workload へ含めてはなりません。
- build / test / CI は同じ budget へ従わなければなりません。
- 代表 canary が変わる場合は、本文の workload が実際に変わった根拠を伴って本節とテストを同時に改訂しなければなりません。


---

## 6. footnote 契約

### 6.1 構成

footnote は、本文側の `ui-footnote` と endnotes 側の `section[role=doc-endnotes]` に正規化します。

### 6.2 ID 正規化

規則:

- 参照回数を正規化しなければなりません。
- backref を正規化しなければなりません。
- `user-content-` 接頭辞は正規化対象とします。
- trigger / backlink は `{refId}-ref-{refInstance}` で接続しなければなりません。

### 6.3 primary / secondary reference

規則:

- 最初の参照だけが本文ノードを内包する primary reference とします。
- 2 回目以降の参照は `shared` と `ref-instance` だけを持つ secondary reference とします。
- endnotes 側の backlink 群は各 `refInstance` に対応する `#${refId}-ref-${refInstance}` を出力しなければなりません。

---

## 7. preview-sandbox 出力契約

### 7.1 対象

本節は `ui-code-preview > ui-preview-sandbox` を対象とします。

### 7.2 変換内容

`preview-sandbox` は内部の `preview-html` / `preview-css` / `preview-js` fenced code から次を生成しなければなりません。

1. `template[data-preview-kind]` の inert payload
2. 高さ同期用 helper script を含む iframe `srcdoc`
3. 表示用 code area
   - 1 件なら単体 `pre[data-code-block]`
   - 複数なら `section[data-code-group]`

### 7.3 実行順序

この変換は `rehypeShikiCodeBlocks` より前に実行しなければなりません。後続の Shiki と `rehypeRouaultComponents` には通常の code block として流さなければなりません。

### 7.4 trust boundary

規則:

- author input としての `srcdoc` を許可してはなりません。
- compiler-generated output としての iframe `srcdoc` は、本節の契約に従う場合に限り許可されます。
- `preview-sandbox` は authoring から直接任意 iframe 属性を持ち込む経路であってはなりません。
- helper script は platform helper であり、author supplied JavaScript と同一に扱ってはなりません。

### 7.5 code area 自動生成

規則:

- `preview-sandbox` を利用する場合、code area はコンパイラが自動生成しなければなりません。
- author 手書きの preview/code 領域と競合する構成を許可してはなりません。

---

## 8. インラインコード契約

`pre > code` 以外の `code` には `translate="no"` を付与しなければなりません。

規則:

- inline code は機械可読文字列であることが多く、自動翻訳対象にしてはなりません。
- code block と inline code の扱いを混同してはなりません。

---

## 9. 順序付きリスト契約

`ol` / `li` に対して、build-time で次を付与しなければなりません。

1. `data-marker-digits` の自動判定
2. `start` / `reversed` / `li[value]` の CSS カウンター変数への転写
3. `role="list"` / `role="listitem"` の補強
4. `data-ol-has-value` の付与

### 9.1 許可 style

順序付きリスト契約で許可される style は次に限定します。

- `--ui-ol-counter-reset`
- `--ui-ol-counter-step`
- `--ui-ol-counter-set`

規則:

- 上記以外の `style` をこの契約の一部として導入してはなりません。
- この許可一覧は safety policy と整合していなければなりません。

---

## 10. 最終 HAST 不変条件

### 10.1 静的 `<mark>` を残さない

最終 HAST に静的 `<mark>` を残してはなりません。

### 10.2 component 化の収束

契約対象の HTML は、規定の Rouault コンポーネントまたは契約済み DOM へ収束していなければなりません。

### 10.3 出力由来属性の正規名

互換入力を吸収した場合でも、最終出力では正規属性名へ収束していなければなりません。

### 10.4 preview-sandbox の生成物

`preview-sandbox` の生成物は、author input と compiler-generated output の境界を破ってはなりません。

### 10.5 本文リンクの正規注釈

- 本文リンクは、`.heading-anchor` を除き、`data-link-kind` と `data-link-surface="prose"` を持たなければなりません。
- `external-web` および `external-action` と分類された本文リンクは、`data-external="true"` を持たなければなりません。
- 危険な scheme を持つ本文リンクを、最終 HAST に許容形として残してはなりません。

---

## 11. 他文書との関係

- authoring grammar は `docs/markdown-authoring-specification.md` を参照します。
- safety policy と trust boundary の詳細は `docs/markdown-safety-and-test-policy.md` を参照します。
- アクセシビリティ要求は `docs/accessibility.md` を参照します。
- 内部/外部遷移の意味論、同一 origin 判定、router による click interception は `docs/router-specification.md` を参照します。

---

## 12. 改訂規則

- HTML 正規化先の変更は本書を直接改訂しなければなりません。
- component 名、出力属性名、本文リンク分類値、footnote 接続規則、preview-sandbox 出力形の変更は本書の意味論変更として扱います。
- safety policy の変更だけで output contract を暗黙変更してはなりません。
