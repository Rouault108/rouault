# Markdown 変換戦略（実装ベース / 2026-03-02）

## 目的

Rouault の Markdown 戦略は、現在以下の3点を同時に満たす方針で運用する。

1. 著者入力は CommonMark ベースに寄せる
2. 最終出力は `ui-*` Web Components に寄せる
3. 安全性のため生HTMLを禁止する

## 現在の変換アーキテクチャ

実装上の SoT は `velite.config.ts` のプラグイン順序である。

1. `remarkMath`
2. `remarkDisallowRawHtml`
3. `remarkRouaultDirectives`
4. `remark-rehype`（Velite 内部）
5. `rehypeKatex`
6. `rehypeRouaultComponents`
7. `rehypeInlineCodeTranslateNo`
8. `rehypeOrderedListContracts`
9. `rehypeDisallowStaticMark`

この順序で、入力制約（remark）と最終DOM正規化（rehype）を分離している。

## 現在対応している入力仕様

### A. CommonMark の標準構文

| 入力 | 最終出力 |
|---|---|
| Fenced Code Block | `<ui-code-block lang="..."><pre><code>...</code></pre></ui-code-block>` |
| Blockquote (`>`) | `<ui-blockquote>...</ui-blockquote>` |
| Table | `<ui-table><table>...</table></ui-table>` |
| Horizontal Rule (`---`) | `<ui-divider><hr /></ui-divider>` |
| Inline Code | `<code translate="no">...</code>` |

### B. 独自ディレクティブ

#### 1) Callout

```markdown
::callout{kind="warning" title="注意"}
本文
::
```

許可属性:

- `kind` / `variant`（`note|tip|success|warning|danger`）
- `title`
- `icon`
- `heading-level`（`1..6`）
- `aria-label`

出力:

- `<ui-callout ...>...</ui-callout>`

#### 2) Code Group

````markdown
::code-group{aria-label="比較"}
```ts title="a.ts" intent="valid"
const a = 1;
```
```ts filename="b.ts" label="誤り例" intent="invalid"
const b = 2;
```
::
````

許可属性:

- `aria-label`

内包コードフェンスで許可するメタ:

- `title`
- `filename`
- `label`
- `intent`（`neutral|valid|invalid`）

出力:

- `<ui-code-group ...>...</ui-code-group>`
- 内部コードは `ui-code-block` に正規化される

## セーフティ戦略（現行）

1. 生HTML禁止  
`remarkDisallowRawHtml` が `html` ノードを検出するとビルドエラーにする。

2. 静的 `<mark>` 禁止  
`rehypeDisallowStaticMark` が著者入力由来の `<mark>` を検出するとビルドエラーにする。

3. 未対応ディレクティブ禁止  
`remarkRouaultDirectives` が未知ディレクティブ・未知属性を検出した場合にビルドエラーにする。

## 既知のギャップ（現実装）

1. `code-group` 内コードメタの最終反映先  
現在は `title/filename/label/intent` が内側の `<code>` 属性として出力される。  
`ui-code-block` ホスト属性としての移送は未完了。

2. 属性allowlistの最終段検証  
`rehypeDisallowDangerousProps` は未実装。

3. 独自構文の対応範囲  
`callout` / `code-group` 以外（`ui-image` / `ui-video` / `ui-kbd` / `ui-file-tree` 等）は未対応。

## 実装ベースの次フェーズ

1. `code-group` メタを `ui-code-block` ホストへ昇格  
`rehypeRouaultComponents` で `pre>code` 変換時に既知メタをホスト属性へ移す。

2. `rehypeDisallowDangerousProps` 追加  
`on*`、危険属性、不要な `style` をallowlist方式で禁止する。

3. 独自ディレクティブの段階拡張  
優先度は `image/video` -> `kbd` -> `file-tree`。

## テスト運用方針

1. 単体テストで remark/rehype の AST 変換を固定化
2. ネガティブケース（未知構文/未知属性/終端不足）を必須化
3. Eleventy + Velite の実ビルドで `.velite` 出力をスモーク確認

補足: `pnpm test:unit` は Playwright ブラウザ実体が必要。未導入環境では `pnpm lint` + 実ビルド確認を最低ラインとする。
