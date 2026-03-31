# Rouault 移行計画書

## note 本文コンポーネントを「静的 DOM 正本 + enhancer」へ再編する計画（改訂版）

**対象リポジトリ**: `rouault.zip` 展開内容  
**判断基準**: 現行実装、Markdown 出力契約、directive 出力契約、SSR / hydration 経路、note hydration budget  
**時点**: （UTC+09:00）2026年03月31日現在

---

## 0. 要約

### 0.1 移行対象【高】

note 本文経路について、次を **static-first 化の対象** とします。

- `ui-divider`
- `ui-highlight`
- `ui-blockquote`
- `ui-table`
- `ui-info-box`
- `ui-callout`
- `ui-image`（**静的図版本体 + lightbox enhancer** に分離）
- `ui-footnote`（**静的参照リンク + footnote popover enhancer** に分離）

> ただし、ここでいう「移行」は **note 本文の出力経路から外す** ことを意味します。  
> コンポーネント実装そのものを直ちに全リポジトリから削除することまでは意味しません。`ui-highlight` などは search dialog 等の非 note 面で引き続き利用され得ます。

### 0.2 非対象【高】

次は **note 本文で widget として残すべき対象** です。

- `ui-tabs`
- `ui-details`
- `ui-checkbox`
- `ui-code-preview`
- `ui-preview-sandbox`
- `ui-translation`（overlay 側）

### 0.3 保留【中】

- `ui-score`

`ui-score` は文書プリミティブ寄りに見える一方で、現状は lazy load、外部 SVG 読み込み、skeleton、overflow fade を抱えています。  
本文プリミティブ群の static-first 化を終えてから、**本当に static-first に寄せるべきか**を別件として再評価するのが妥当です。

---

## 1. 調査結果

## 1.1 現在の note 本文は、なお広く `ui-*` を SSR / hydration 対象にしています【事実】【高】

**根拠の所在**  
- `build/ssr/target-definitions.ts`
- `src/client/hydration/registry.ts`
- `src/client/hydration/planner.ts`
- `src/client/hydration/scheduler.ts`

**確認内容**  
現状の note 向け SSR / hydration 対象には、少なくとも次が残っています。

- `ui-callout`
- `ui-checkbox`
- `ui-code-preview`
- `ui-preview-sandbox`
- `ui-table`
- `ui-blockquote`
- `ui-details`
- `ui-divider`
- `ui-footnote`
- `ui-highlight`
- `ui-image`
- `ui-info-box`
- `ui-score`
- `ui-tabs`
- `ui-translation`

また hydration planner は、`data-hydration-capability` / `data-hydration-trigger` / `data-hydration-key` を読む正規経路を持つ一方で、`HYDRATION_FALLBACK_SELECTOR` による **tag 名 fallback scan** も温存しています。

**分析**  
Rouault の hydration はすでに **directive / key ベースの正規経路**を持っています。  
問題は「その仕組みがない」ことではなく、**note 本文の相当部分がまだ `ui-*` 前提で registry・SSR・fallback scan に接続されたまま残っている**ことです。

したがって、本件の主題は「hydration の仕組みを新設すること」ではありません。  
**note 本文を legacy tag 依存から外し、静的 DOM + enhancer に寄せていくこと**です。

---

## 1.2 `code-block` / `code-group` は、すでに「静的正本 + enhancer」の参照実装になっています【事実】【高】

**根拠の所在**  
- `build/rehype/static-code-groups.ts`
- `build/rehype/shiki-code-blocks.ts`
- `docs/markdown/markdown-output-contract.md`
- `build/projections/note-hydration-profile.ts`

**確認内容**

- standalone code block は `pre[data-code-block]` を正本にし、必要時のみ `data-hydration-key="code-block-enhancer"` を付与します。
- code group は `section[data-code-group]` を正本にし、`data-hydration-key="code-group-enhancer"` を付与します。
- hydration budget でも `code-block-enhancer` / preview 系 canary がすでに前提化されています。

**分析**  
Rouault にはすでに、次の実用的な参照実装があります。

```text
authoring / directive
  ↓
build-time で静的 DOM 正本へ変換
  ↓
必要な root にだけ data-hydration-key を付与
  ↓
post-hydrate enhancer が局所的に振る舞う
```

今後の移行は、これと同じ方針にそろえるべきです。
すなわち、**note 本文の意味論と見た目の基底は build-time で固定し、runtime は局所的な操作補助だけを担当する**という方針です。

---

## 1.3 すでに「static-first に寄る圧力」を受けているコンポーネントがあります【事実】【高】

### `ui-divider`

**根拠の所在**

* `src/components/ui/divider/divider.ts`
* `docs/design-system/components/divider.md`

**確認内容**

* `createRenderRoot()` は `this` を返します。
* 実体はホスト直下の `hr` です。
* `.prose hr`、`ui-divider > hr`、`hr[data-divider-variant="layout"]` へ文書スコープ CSS を与えています。

**分析**
これは note 本文に限れば、もはや **custom element を通して native 要素を出しているだけ**です。
しかも文書スコープ CSS 契約まで同居しており、責務境界が曖昧です。
note 本文については、`hr[data-divider-variant]` を正本にするのが自然です。

---

### `ui-highlight`

**根拠の所在**

* `src/components/ui/highlight/highlight.ts`

**確認内容**

* `createRenderRoot()` は `this` です。
* 実体はホスト直下の `mark` です。
* document style 注入を持っています。
* ただし `ui-highlight` 自体は search dialog など non-note 面でも利用されています。

**分析**
note 本文経路では `mark[data-current-match]` へ落とすのが妥当です。
ただし、**コンポーネント実装全体を即削除する話ではない**点は明確に分けるべきです。

---

### `ui-table`

**根拠の所在**

* `src/components/ui/table/table.ts`
* `docs/markdown/markdown-output-contract.md`
* `src/assets/css/main.css`

**確認内容**

* descendant styling の都合から Shadow DOM 利益が弱く、document CSS に寄っています。
* `.prose > ui-table` 依存の CSS が残っています。
* `caption` 由来のラベル補完も build-time で解ける部分が大きいです。

**分析**
`ui-table` は **widget ではなく文書レイアウト付き native table** として扱う方が整います。
note 本文では `div[data-table-root] > table` を正本にすべきです。

---

### `ui-info-box`

**根拠の所在**

* `src/components/ui/info-box/info-box.ts`
* `docs/design-system/components/info-box.md`

**確認内容**

* 設計文書上も静的コンテナ寄りです。
* note 本文で必要になる主責務は、見出し、アイコン、variant、density、landmark の静的表現です。
* 現実装は MutationObserver を持ちますが、note 本文では build-time で確定できる内容が大半です。

**分析**
note 本文では static-first 化しやすい対象です。
`section[data-info-box]` を正本とし、内容空判定や見出しレベル解決は build-time 側へ寄せるべきです。

---

### `ui-blockquote`

**根拠の所在**

* `src/components/ui/blockquote/blockquote.ts`
* `docs/markdown/markdown-output-contract.md`

**確認内容**

* 出力は実質 `blockquote` または `figure > blockquote + figcaption` です。
* 公開イベントや外部制御 API はありません。

**分析**
完全に静的化向きです。
note 本文では `ui-blockquote` を経由する意味は薄く、`blockquote` / `figure` を正本にしてよいです。

---

### `ui-callout`

**根拠の所在**

* `src/components/ui/callout/callout.ts`
* `build/remark/directives/output/adapt-directive-output.ts`
* `docs/markdown/markdown-authoring-specification.md`

**確認内容**

* directive 出力は `adapt-directive-output.ts` 側で直接 `ui-callout` を生成しています。
* 他方で HTML 正規化経路には `build/rehype/rouault-components.ts` もあります。
* つまり `ui-callout` は **複数 build 経路から note 本文へ入り得ます**。

**分析**
`ui-callout` の static-first 化では、`build/rehype/rouault-components.ts` だけでなく、**`build/remark/directives/output/adapt-directive-output.ts` も同時に直す必要があります**。
ここを落とすと、directive 経路だけ旧 `ui-callout` のまま残ります。

---

### `ui-image`

**根拠の所在**

* `src/components/ui/image/image.ts`
* `build/rehype/rouault-components.ts`
* `build/ssr/target-adapters.ts`
* `docs/design-system/components/image.md`
* `docs/markdown/markdown-output-contract.md`

**確認内容**

* `zoomable=false` には hydration を付けない契約があります。
* `ui-image` は本体画像、placeholder、loading / busy、error fallback、caption、zoom trigger、lightbox dialog、focus return、scroll lock を同居させています。
* SSR でも `build/ssr/target-adapters.ts` に専用 adapter を持っています。

**分析**
方向としては「静的本体 + lightbox enhancer」への分離で正しいです。
ただし、分離対象は lightbox 開閉だけでは足りません。
**loading / error / placeholder / trigger / dialog まで含めて、どこまでを静的正本へ落とすかを明示した再設計**が必要です。

---

### `ui-footnote`

**根拠の所在**

* `src/components/ui/footnote/footnote.ts`
* `docs/design-system/components/footnote.md`
* `docs/markdown/markdown-output-contract.md`
* `src/assets/css/main.css`

**確認内容**

* output contract にはすでに `primary reference / secondary reference` に相当するモデルがあり、2 回目以降参照は `shared` / `ref-instance` を使う構造が入っています。
* `ui-footnote` は `ui-popover` 内包型で runtime ownership を持っています。
* footnote 用スタイルは component 側と `main.css` 側にまたがっています。

**分析**
問題は「model がまったくない」ことではありません。
問題は、**build-time model、公開属性、runtime popover ownership、CSS の配置がきれいに収束していない**ことです。
したがって、本件は「model を一から作る」のではなく、**既存 model と runtime ownership を整理し、静的 trigger / static endnotes / enhancer へ寄せる**案件です。

---

## 1.4 static-first に寄せるべきではないコンポーネントも明確です【分析】【高】

### `ui-tabs`

**判断**
非対象です。

**理由**
URL sync、roving focus、selected state、tabpanel 制御が本体だからです。
note 本文の widget として残すべきです。

---

### `ui-details`

**判断**
非対象です。

**理由**
単なる `<details>` 置換ではなく、独自 disclosure、`inert`、開閉通知、視覚契約を含みます。
static-first 化するなら、それは「移行」ではなく **契約変更** になります。

---

### `ui-checkbox`

**判断**
非対象です。

**理由**
form-associated widget だからです。
task list 的に見えても、責務は文書プリミティブではありません。

---

### `ui-code-preview` / `ui-preview-sandbox`

**判断**
非対象です。

**理由**
interactive composition と sandbox isolation が価値の中心です。
これは static-first に寄せる対象ではなく、hydration budget の明示管理対象です。

---

### `ui-translation`

**判断**
部分的に非対象です。

**理由**
translation family 全体としては、すでに

* static translation = `.translation-static`
* overlay translation = `ui-translation`

に分離されています。
したがって、translation については **すでに static-first 化が入っている** とみなすべきです。
今後の作業対象は overlay widget のみです。

---

## 2. 移行方針

## 2.1 基本原則

### 原則A

**note 本文の正本は build-time で固定します。**

### 原則B

**runtime は意味論を所有せず、局所的な対話補助だけを担当します。**

### 原則C

**note 本文の hydration 起点は `data-hydration-key` と directive 属性を正規経路とし、tag 名 fallback は移行中の暫定経路として縮退させます。**

### 原則D

**directive 出力経路と rehype 正規化経路は、同じ最終 DOM 契約へ収束させます。**

### 原則E

**本文 CSS は custom element selector 依存から、意味 selector / `data-*` selector 依存へ移します。**

---

## 2.2 目標アーキテクチャ

```text
authoring syntax / directive
  ↓
remark directive output adapter
  ↓
rehype normalization
  ↓
static note primitive transform
  ↓
native HTML + data-* contract
  ↓
note content contract validation
  ↓
(optional) data-hydration-key
  ↓
enhancer
```

現状の Rouault では、`adapt-directive-output.ts` と `rouault-components.ts` が別々に `ui-*` を出し得ます。
移行後は、**入力経路が異なっても最終 DOM 契約は 1 つ**でなければなりません。

---

## 3. 移行対象一覧

| コンポーネント         | 判定 | note 本文での移行方式                                                     | 確度 |
| --------------- | -- | ----------------------------------------------------------------- | -- |
| `ui-divider`    | 移行 | `hr[data-divider-variant]`                                        | 高  |
| `ui-highlight`  | 移行 | `mark[data-current-match]`                                        | 高  |
| `ui-blockquote` | 移行 | `blockquote` / `figure > blockquote + figcaption`                 | 高  |
| `ui-table`      | 移行 | `div[data-table-root][role="region"][tabindex="0"] > table`       | 高  |
| `ui-info-box`   | 移行 | `section[data-info-box]`                                          | 高  |
| `ui-callout`    | 移行 | `aside[data-callout][data-callout-kind]`                          | 高  |
| `ui-image`      | 移行 | static `figure/picture` + image lightbox enhancer                 | 高  |
| `ui-footnote`   | 移行 | static footnote ref + static endnotes + footnote popover enhancer | 高  |
| `ui-score`      | 保留 | 後続再評価                                                             | 中  |

---

## 4. 非対象一覧

| コンポーネント              | 判定  | 理由                                | 確度 |
| -------------------- | --- | --------------------------------- | -- |
| `ui-tabs`            | 非対象 | 状態機械、ARIA tabs、URL sync が本体       | 高  |
| `ui-details`         | 非対象 | disclosure state と `inert` が本体    | 高  |
| `ui-checkbox`        | 非対象 | form-associated widget            | 高  |
| `ui-code-preview`    | 非対象 | 複合表示 UI が本体                       | 高  |
| `ui-preview-sandbox` | 非対象 | isolation / activation policy が本体 | 高  |
| `ui-translation`     | 非対象 | family 全体ではすでに static-first 分離済み  | 高  |

---

## 5. フェーズ計画

## Phase 0. 契約と ownership の先行整理

### 目的

実装変更の前に、**note 本文で何が正本で、何が enhancer なのか**を固定します。
ここを曖昧にしたまま DOM を変えると、build / SSR / hydration / CSS / test が別々に崩れます。

### 実施内容

1. `docs/markdown/markdown-output-contract.md` を更新し、移行対象の最終 DOM 正本を native HTML / `data-*` ベースへ書き換えます。
2. `docs/design-system/components/*.md` のうち、note 本文 static-first 化に直接関わる文書を更新します。少なくとも次を対象にします。

   * `divider.md`
   * `footnote.md`
   * `image.md`
   * 必要に応じて `callout.md` / `info-box.md` / `table.md`
3. `build/remark/directives/output/adapt-directive-output.ts` と `build/rehype/rouault-components.ts` の両方で、**同じ最終 DOM 契約に収束する**ことを設計上明文化します。
4. `src/assets/css/main.css` の prose selector から `ui-callout`、`ui-info-box`、`ui-image`、`ui-table`、`ui-footnote` など custom element 前提を外していく方針を定義します。
5. note hydration の完了条件を、`build/projections/note-hydration-profile.ts` と整合する形で定義します。
6. `build/content/note-content-contracts.ts` で、必要なら static root 契約を追加検査できるようにします。

### 提案する命名

* `image-lightbox-enhancer`
* `footnote-popover-enhancer`

### 完了条件

* Markdown 出力契約が **tag 名中心** ではなく **静的 DOM 正本中心**で書かれていること
* directive 出力経路と rehype 正規化経路の **収束先 DOM** が明文化されていること
* note 本文の hydration 起点について、**key 正規経路 / fallback 縮退方針** が記述されていること

---

## Phase 1. 既に薄い wrapper になっている note 本文経路を撤去する

### 対象

* `ui-divider`
* `ui-highlight`

### 理由

この 2 つは note 本文では、すでに **custom element を通して native 要素を描いているだけ**に近いからです。

### 実施内容

1. note 本文の build 出力で

   * `ui-divider` を `hr[data-divider-variant]` に置き換える
   * `ui-highlight` を `mark[data-current-match]` に置き換える
2. `build/rehype/rouault-components.ts` の `hr -> ui-divider`、`mark -> ui-highlight` 変換を note 本文経路で停止します。
3. `src/assets/css/main.css` と document style 契約を見直し、note 本文に必要なスタイルを静的 CSS へ寄せます。
4. `build/ssr/target-definitions.ts` と `src/client/hydration/registry.ts` から、**note 本文向けの `ui-divider` / `ui-highlight` 前提**を外します。
5. ただし、`ui-highlight` などのコンポーネント実装自体は、search dialog 等の non-note 面が残る限り即削除しません。

### 完了条件

* note 最終 DOM に `ui-divider` / `ui-highlight` が出現しないこと
* note 本文の CSS が `ui-divider > hr` / `ui-highlight > mark` 依存から外れていること
* note 本文 hydration で `ui-divider` / `ui-highlight` を数えないこと

---

## Phase 2. 純粋な本文コンテナを静的化する

### 対象

* `ui-blockquote`
* `ui-table`
* `ui-info-box`
* `ui-callout`

### 理由

これらは **文書の意味構造と装飾が本体**であり、widget 的な状態所有が本質ではないからです。

### 実施内容

#### 2.1 `ui-blockquote`

* 出力を `blockquote` または `figure > blockquote + figcaption` に変更します。
* variant が必要なら `data-blockquote-variant` を付けます。
* note 本文では `ui-blockquote` を経由しません。

#### 2.2 `ui-table`

* 出力を `div[data-table-root][role="region"][tabindex="0"] > table` に変更します。
* `caption` から `aria-label` を build-time で補います。
* `.prose > ui-table` 依存 CSS を `.prose > [data-table-root]` 系へ移します。

#### 2.3 `ui-info-box`

* directive 出力と HTML 正規化の両経路を `section[data-info-box][data-variant][data-density]` へ収束させます。
* `heading-level`、`landmark`、空内容非描画は build-time で解決します。
* `MutationObserver` 前提を note 本文から外します。

#### 2.4 `ui-callout`

* directive 出力と HTML 正規化の両経路を `aside[data-callout][data-callout-kind]` へ収束させます。
* heading は native heading または `role="heading"` のどちらかに統一します。
* icon 供給方式は Phase 0 で先に決めます。

### 変更対象ファイル

* `build/remark/directives/output/adapt-directive-output.ts`
* `build/rehype/rouault-components.ts`
* `docs/markdown/markdown-output-contract.md`
* `src/assets/css/main.css`
* `build/ssr/target-definitions.ts`
* `src/client/hydration/registry.ts`
* 必要に応じて `build/content/note-content-contracts.ts`

### 完了条件

* note 最終 DOM に `ui-blockquote` / `ui-table` / `ui-info-box` / `ui-callout` が出現しないこと
* directive 経路と HTML 経路が同じ最終 DOM に収束すること
* prose CSS が custom element selector 依存から static selector 依存へ移っていること

---

## Phase 3. 「静的本体 + 対話補助」に分解する

### 対象

* `ui-image`
* `ui-footnote`

### 理由

この 2 つは、**本文意味論そのものは静的**でありながら、**補助的な対話機能**を持つからです。
したがって、コンポーネント全体を残すのではなく、**静的本体と enhancer の ownership を分離**するのが適切です。

---

### 3.1 `ui-image`

#### 現状

`ui-image` は、少なくとも次を一体で抱えています。

* 本体画像の意味論
* `picture` / `img` / `figcaption`
* placeholder
* loading / busy
* error fallback
* zoom trigger
* lightbox dialog
* focus return
* scroll lock

さらに SSR 側にも `build/ssr/target-adapters.ts` の専用 adapter が存在します。

#### 目標

note 本文では、次へ分離します。

**静的正本**

* `figure[data-image]`
* `picture > source* + img`
* optional `figcaption`
* optional `button[data-image-zoom-trigger]` または同等の trigger skeleton

**enhancer**

* `data-hydration-key="image-lightbox-enhancer"` を持つ root に対し、lightbox 開閉、focus return、scroll lock、dialog orchestration を追加する

#### 具体方針

1. `zoomable=false` は完全静的にします。
2. `zoomable=true` でも、**画像そのものは JS なしで読める**ことを優先します。
3. `placeholder` / `loading` / `error fallback` のうち、note 本文で runtime ownership が本当に必要なものだけを残します。
   原則として、**読書面では build-time で成立する静的表現を優先**します。
4. `build/rehype/rouault-components.ts` に加え、`build/ssr/target-adapters.ts` も変更対象に含めます。

#### 完了条件

* note 最終 DOM に `ui-image` が出現しないこと
* `zoomable=false` に hydration が付かないこと
* `zoomable=true` でも本体画像と caption が JS なしで成立すること
* lightbox の runtime は `image-lightbox-enhancer` に局所化されること

---

### 3.2 `ui-footnote`

#### 現状

現状には、すでに次の要素があります。

* endnotes を正本とする設計思想
* `shared` / `ref-instance` を使った primary / secondary 相当の build-time model
* `ui-popover` 内包型の runtime ownership
* component 側 CSS と `main.css` 側 CSS の分散

したがって、未整備なのは「脚注モデルがないこと」ではありません。
未整備なのは、**build-time model、公開 API、runtime popover ownership、CSS 配置が単一モデルに収束していないこと**です。

#### 目標

note 本文では、次へ分離します。

**静的正本**

* `a[data-footnote-ref][role="doc-noteref"]`
* `section[role="doc-endnotes"]`

**enhancer**

* `data-hydration-key="footnote-popover-enhancer"` を持つ scope に対し、popover 開閉と active trigger 管理だけを付与する

#### 先行決定が必要な設計事項

* 長期契約上、正規に固定するのは `shared` ではなく **primary reference / secondary reference の役割モデル**です。
* `shared` は現行互換のための暫定表現とみなし、将来的により意味が読める表現へ置換可能なように設計します。

#### 実施順

1. `docs/design-system/components/footnote.md` と `docs/markdown/markdown-output-contract.md` で、役割モデルを整理します。
2. note 本文の trigger を plain link として固定します。
3. popover enhancer は、リンク上に補助 UI を載せるだけに縮退させます。
4. CSS は `ui-footnote` 前提から static root 前提へ移し、分散を解消します。

#### 完了条件

* trigger は常に plain link として存在すること
* JS 無効時でも endnotes へ確実に到達できること
* popover 本文が脚注の正本にならないこと
* note 最終 DOM に `ui-footnote` が出現しないこと

---

## Phase 4. SSR / hydration / Storybook / テストの整理

### 実施内容

1. `build/ssr/target-definitions.ts` から、note 本文で static-first 化した `ui-*` を段階的に外します。
2. `build/ssr/target-adapters.ts` のうち、`ui-image` など専用 adapter を持つ箇所を静的 root 出力に合わせて更新します。
3. `src/client/hydration/registry.ts` では、note 本文向け legacy `ui-*` entry を段階的に縮退させ、enhancer key ベースへ寄せます。
4. `src/client/hydration/planner.ts` / `scheduler.ts` では、note 本文について **fallback scan を最終的に不要化**します。
5. Storybook は

   * static primitive contract
   * enhancer contract
   * non-note widget contract
     に責務を分けます。
6. テストは `ui-*` の存在確認から、**最終 DOM 契約と hydration budget 契約**へ寄せます。
7. `build/projections/note-hydration-profile.ts` の canary と、note projection / contract テストを移行後の予算へ合わせて更新します。

### とくに直撃する箇所

* `build/ssr/target-definitions.ts`
* `build/ssr/target-adapters.ts`
* `src/client/hydration/registry.ts`
* `src/client/hydration/planner.ts`
* `src/client/hydration/scheduler.ts`
* `src/assets/css/main.css`
* `build/content/note-content-contracts.ts`
* `build/projections/note-hydration-profile.ts`

### 完了条件

* note 本文 hydration は、本当に必要な widget / enhancer だけになること
* note 本文では tag 名 fallback scan を使わないこと
* canary note の hydration budget が、移行後の実態に一致していること
* Storybook / browser unit / projection test が最終 DOM 契約を検証していること

---

## 6. 先に決めるべき設計判断

## 6.1 icon 供給方式【高】

`ui-callout` / `ui-info-box` の static-first 化では、icon をどう供給するかを先に決める必要があります。

**推奨**

* build-time inline SVG

**理由**

* note 本文正本が runtime 登録に依存しない
* print / forced-colors 契約を持ち込みやすい
* `ui-icon` を本文正本に残さずに済む

---

## 6.2 footnote role model【高】

`shared` を恒久 API として固定してはなりません。
固定すべきなのは **primary / secondary の役割意味** です。

**推奨**

* build-time model を役割意味ベースで整理し、公開属性は将来置換可能にしておく

---

## 6.3 image enhancer の root 粒度【高】

`ui-image` を個別 hydrate していた設計から移る際、enhancer の粒度を決める必要があります。

**推奨**

* root 単位 enhancer

**理由**

* `code-block-enhancer` / `code-group-enhancer` と整合する
* dialog / focus return の責務が局所で閉じる
* document-global orchestration を増やさずに済む

---

## 7. リスクと対策

## 7.1 CSS 崩れ

**原因**
現状の prose CSS は `ui-callout`、`ui-info-box`、`ui-image`、`ui-table`、`ui-tabs`、`ui-footnote` などの tag selector に依存しています。

**対策**

* 先に selector 置換表を作る
* 一時的に両対応 CSS を敷く
* DOM 切替は CSS 両対応化の後に行う

---

## 7.2 Storybook / test の実装依存

**原因**
コンポーネント存在自体を仕様として扱っている story / test が混ざっています。

**対策**

* static primitive contract を独立 story / test に分ける
* `ui-*` の presence ではなく、最終 DOM と a11y 契約を検証する
* hydration budget もテスト対象に含める

---

## 7.3 移行途中の二重経路

**原因**
directive 経路と HTML 正規化経路が別々に `ui-*` と static DOM を出すと、ownership が二重化します。

**対策**

* `adapt-directive-output.ts` と `rouault-components.ts` を同一フェーズで更新する
* note 本文では新旧出力を長期間併存させない
* legacy adapter は Storybook / non-note 用に限定する

---

## 7.4 hydration budget の見かけ上の破綻

**原因**
移行前提の budget と移行後の budget が食い違うと、canary が誤検知または過検知します。

**対策**

* `build/projections/note-hydration-profile.ts` をフェーズごとに更新する
* static-first 化した対象を budget から順次外す
* fallback scan が残っている間は、その影響を別管理する

---

## 8. 採用順

**推奨順は次です。**

1. `ui-divider`
2. `ui-highlight`
3. `ui-blockquote`
4. `ui-table`
5. `ui-info-box`
6. `ui-callout`
7. `ui-image`
8. `ui-footnote`

**理由**

* 前半ほど状態を持たない純粋プリミティブだからです。
* `ui-callout` は icon 供給方式の先行決定に依存するため、`ui-info-box` より後ろに置きます。
* `ui-image` と `ui-footnote` は ownership 分解が必要なため後段に回します。

---

## 9. 最終到達像

note 本文では、原則として次だけが残る状態を目標とします。

### 静的正本

* `p`, `ul`, `ol`, `dl`
* `pre[data-code-block]`
* `section[data-code-group]`
* `blockquote`
* `figure > blockquote + figcaption`
* `aside[data-callout]`
* `section[data-info-box]`
* `div[data-table-root] > table`
* `hr[data-divider-variant]`
* `mark[data-current-match]`
* `figure[data-image]`
* `a[data-footnote-ref]`
* `section[role="doc-endnotes"]`
* `div.translation-static[data-translation-kind="static"]`

### widget / enhancer

* `ui-tabs`
* `ui-details`
* `ui-checkbox`
* `ui-code-preview`
* `ui-preview-sandbox`
* `ui-translation`
* `code-block-enhancer`
* `code-group-enhancer`
* `image-lightbox-enhancer`
* `footnote-popover-enhancer`

---

## 10. 私の結論

Rouault では、**note 本文プリミティブを `code-block` / `code-group` と同じ static-first 系へ寄せる再編は必要です**。

ただし、それは「全コンポーネントを static-first にする」という意味ではありません。
意味はあくまで、**note 本文の文書プリミティブを build-time 正本へ戻し、runtime の ownership を widget / enhancer へ限定する**ということです。

現状実装を踏まえた第一陣は次です。

* `ui-divider`
* `ui-highlight`
* `ui-blockquote`
* `ui-table`
* `ui-info-box`
* `ui-callout`
* `ui-image`
* `ui-footnote`

逆に、次は残すべきです。

* `ui-tabs`
* `ui-details`
* `ui-checkbox`
* `ui-code-preview`
* `ui-preview-sandbox`
* overlay `ui-translation`

また、本計画の実装上の要点は次の 3 点です。

1. `build/remark/directives/output/adapt-directive-output.ts` と `build/rehype/rouault-components.ts` を同時に直すこと
2. hydration の主題を「新方式導入」ではなく「legacy tag fallback の縮退」として扱うこと
3. `ui-image` / `ui-footnote` を「本体静的化 + runtime ownership 縮小」として分離設計すること