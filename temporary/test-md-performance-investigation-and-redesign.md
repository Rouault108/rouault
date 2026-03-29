# `content/testing/test.md` 表示負荷の調査レポートと再設計案

## 概要

`pnpm dev` で `content/testing/test.md` を開いた際の重さを調査した結果、主因はサーバー応答ではなく、ブラウザ側で同時に起動される複数の重量級要素でした。

このページは通常の読書ページではなく、画像、`code-preview`、`preview-sandbox`、`code-group`、`translation`、`tabs`、`toc` など、note 系コンポーネントの総合テストページとして振る舞っています。そのため、開発時の未バンドル ESM 配信と相まって、初回表示時の体感負荷が大きくなっています。

本ドキュメントでは、調査方法、調査結果、原因整理、その原因を踏まえた再設計方針と実装計画をまとめます。

## 実装状況メモ（2026-03-29）

本再設計案に基づき、次は実装済みです。

- `content/testing/test.md` と `content/testing/tabs-test.md` を廃止し、`markdown-basic` / `media` / `code` / `interactive` / `sandbox` へ分割
- `kind` + `testingArea` の metadata 契約を導入し、`testing` を breadcrumb only / search・home・tags・corpora・Pagefind 既定除外へ変更
- `::example-include{ref="..."}` と `examples/snippets/**` / `examples/media/**` / `examples/manifests/testing-examples.ts` を導入
- `testing/sandbox` だけが `preview-sandbox` / `allow-js="true"` を許可する build-time 契約を実装
- Storybook 側も tabs / translation / preview-sandbox で shared example source を参照する構成へ更新

この文書の後半にある再設計方針と実装計画は、実装完了後の設計根拠として保持します。現行挙動の正本はコードと `docs/markdown/**` の仕様文書を優先します。

## 調査対象

- 対象コンテンツ: `content/testing/test.md`
- 対象環境: `pnpm dev`
- 観点:
  - HTML 応答自体が重いのか
  - 外部リソースの転送が重いのか
  - note ページ用の hydrate / dynamic import が重いのか
  - 特定コンポーネントの初期化が重いのか

## 調査方法

### 1. コンテンツ構造の確認

`content/testing/test.md` を確認し、どの記法・コンポーネントが含まれているかを洗い出した。

特に確認した要素は以下。

- リモート画像
- `code-group`
- `code-preview`
- `preview-sandbox`
- `translation`
- `tabs`
- `link-card`
- `toc` に影響する見出し構造

### 2. note ページのクライアント起動経路の確認

以下の実装を追跡し、note ページ表示時にどのようにコンポーネントがロードされるかを確認した。

- `src/client.ts`
- `src/client/component-loader.ts`
- `src/client/component-manifest.ts`

確認ポイントは以下。

- 初回表示時に DOM 全体を走査しているか
- 存在するカスタム要素をまとめて dynamic import しているか
- note ページ特有のコンポーネントが何か

### 3. 開発サーバー実測

`pnpm dev` を起動し、対象ページに対して以下を計測した。

- HTML のレスポンスサイズ
- HTML の TTFB / total time
- 生成 HTML に含まれるカスタム要素数
- dev サーバー経由で配信される主要モジュールのサイズ

### 4. 外部アセット実測

`test.md` で使われている Unsplash 画像について、`curl` で以下を計測した。

- `content-length`
- `time_starttransfer`
- `time_total`
- `size_download`

### 5. 重量級コンポーネントの内部挙動確認

以下のファイルを読み、接続時の observer / event listener / iframe 初期化の有無を確認した。

- `src/components/ui/preview-sandbox/preview-sandbox.ts`
- `src/components/ui/codeblock/codeblock.ts`
- `src/components/ui/code-group/code-group.ts`
- `src/components/layout/layout-toc.ts`
- `src/components/ui/translation/translation.ts`
- `src/components/ui/image/image.ts`
- `src/components/ui/card/card.ts`

## 調査結果

### 1. サーバー応答そのものは軽い

実測結果:

| 項目 | 値 |
| --- | --- |
| HTML サイズ | `42,907 bytes` |
| TTFB | `約 35ms` |
| total time | `約 35ms` |

この結果から、重さの主因は HTML 生成やサーバー応答そのものではないと判断できる。

### 2. `test.md` は通常の note より明らかに重い構成

このページには以下が同時に含まれている。

- `ui-image` x2
- `ui-code-block` x10
- `ui-code-group` x3
- `ui-code-preview` x2
- `ui-preview-sandbox` x1
- `ui-translation` x2
- `ui-card` x2
- `ui-tabs` x1
- `layout-toc` x1
- `layout-sidebar` x1
- `ui-highlight` x2
- `ui-blockquote` x2

つまりこのページは、読むための静かな note ではなく、複数の interactive / observer-heavy / import-heavy コンポーネントを一気に起動する「総合試験ページ」になっている。

### 3. 画像転送量が大きい

#### 本文画像

本文内の同一 Unsplash 画像 URL を実測したところ、以下だった。

| 項目 | 値 |
| --- | --- |
| `content-length` | `632,721 bytes` |
| `time_starttransfer` | `0.595s` |
| `time_total` | `0.769s` |

しかも 2 枚目の画像は `loading="eager"` 指定になっているため、初期表示時に強制的に読み込まれる。

#### link-card 用画像

`ui-card` に渡されている画像 URL はクエリなしの元画像 URL であり、実測値は以下だった。

| 項目 | 値 |
| --- | --- |
| `content-length` | `2,090,047 bytes` |
| `time_starttransfer` | `0.091s` |
| `time_total` | `1.539s` |

`loading="lazy"` ではあるが、レイアウトや viewport によっては早い段階でリクエストされ、本文画像よりさらに重い。

### 4. クライアント側が「ページに存在する全カスタム要素」を一括 hydrate している

`src/client.ts` は起動時に `ensureComponentsForRoot(document)` を呼び出す。

`src/client/component-loader.ts` は DOM 全体を `querySelectorAll()` で走査し、見つかったカスタム要素すべてに対して dynamic import を実行する。

この方式自体は分かりやすいが、`test.md` のように種類の多いページでは以下の問題を起こす。

- 初回表示で import 本数が増える
- 開発時は Vite が未バンドル ESM を個別配信するため、本番より不利
- 「今すぐ必要ない」要素まで初回表示でロードする

### 5. 主要モジュールの dev 配信サイズが大きい

dev サーバー経由で実測した主要 module のサイズは以下だった。

| モジュール | サイズ |
| --- | ---: |
| `ui-code-group` | `95,958 bytes` |
| `ui-code-preview` | `92,821 bytes` |
| `ui-code-block` | `88,137 bytes` |
| `ui-translation` | `73,428 bytes` |
| `ui-preview-sandbox` | `71,722 bytes` |
| `ui-image` | `59,527 bytes` |
| `layout-toc` | `56,762 bytes` |
| `ui-tabs` | `55,578 bytes` |
| `ui-article-header` | `41,870 bytes` |
| `layout-sidebar` | `32,196 bytes` |

上記 10 本だけで `約 668KB`。さらに `ui-icon`、`ui-card`、`ui-highlight`、`ui-info-box`、`ui-details`、依存モジュール群が続く。

これは本番バンドルではある程度緩和されるが、`pnpm dev` の体感には直接効く。

### 6. 初期化コストの高いコンポーネントが多い

#### `ui-preview-sandbox`

- `connectedCallback()` で `MutationObserver` を張る
- `window.message` listener を張る
- 既定で `activation-policy="eager"`
- `allow-js="true"` の場合、iframe 内 JS も即座に起動する

つまり「見えたら起動」ではなく、「接続された時点で起動」している。

#### `ui-code-block`

- `ResizeObserver`
- `MutationObserver`
- document style injection

このページでは `ui-code-block` が 10 個あるため、接続時コストが蓄積する。

#### `ui-code-group`

- subtree を対象に `MutationObserver`
- header tool width 用 `ResizeObserver`
- light DOM を再構成する compose 処理

このページでは 3 個存在する。

#### `layout-toc`

- `scroll` listener
- `hashchange` listener
- `ui-tab-change` listener
- `MutationObserver`
- `requestAnimationFrame()` 経由の可視見出し再計算

見出し数自体は多くないが、tabs と組み合わさると処理経路が増える。

#### `ui-translation`

- `resize` listener
- `scroll` listener
- document-level style injection
- popover positioning 用 `requestAnimationFrame()`

2 個程度では致命傷ではないが、このページの「全部入り」構成では積み上がる。

## 原因整理

重さの原因は 1 つではなく、以下の複合である。

### 原因 A: リモート画像の転送量が大きい

- 本文画像が約 `633KB`
- link-card 画像が約 `2.09MB`
- しかも本文 2 枚目は `eager`

### 原因 B: 読書ページなのに interactive コンポーネントが多すぎる

- `code-preview`
- `preview-sandbox`
- `code-group`
- `translation`
- `tabs`

これらは「読むだけ」のページに対しては重い部類であり、テストページに集約されすぎている。

### 原因 C: hydration 戦略が一括すぎる

- DOM に存在するカスタム要素を全部検出
- 全部まとめて dynamic import
- 優先度の概念がない

### 原因 D: component 単位の初期化が eager すぎる

- sandbox iframe が eager
- observer の attach が接続直後
- static rendering で済む要素まで JS を起動

### 原因 E: `test.md` の役割定義が曖昧

このページは次の性質を同時に持ってしまっている。

- note の見た目確認
- Markdown 記法の総合テスト
- interactive component の実演
- authoring / contract テスト

本来は別の場に分離すべき責務が混在している。

## 再設計の基本方針

再設計では「重いものを速くする」だけではなく、「そもそも読書ページで起動させるべきものを減らす」ことを優先する。

設計原則は以下。

1. 読書ページの主役は本文であり、interactive demo は従属物にする。
2. 初回表示で必要ない JS は起動しない。
3. リモート大画像を 読書用ノート に直接置かない。
4. 「テストページ」と「実際の note」を別の責務として設計する。
5. note 用 UI は `critical`、`deferred`、`on-demand` に分けて読み込む。

## 詳細な再設計方法

## 1. メディア設計の再設計

本章では、note 本文で扱う画像およびカード用画像について、読書性能、authoring 体験、配信運用、将来移行性を同時に満たすための再設計方針を定義する。

ここで優先するのは、単に「画像を軽くすること」ではない。長期保守性の観点から、次を固定する。

1. author が書く参照先と、reader に配信される URL を分離する  
2. メディア原本の source of truth を単一化する  
3. 配信基盤固有の都合を authoring 契約へ持ち込まない  
4. build-time で画像方針を確定し、runtime の裁量を減らす  
5. 画像変換・配信・HTML 解決の責務境界を明確にする  

### 1-1. 本文画像をリモート直参照からローカル原本管理へ移行する

現状の問題:

- 外部 CDN の応答時間と可用性に依存する
- サイズ制御が著者側の URL クエリ任せになっている
- 同一画像でもノートごとに最適化方針が揺れる
- 画像の配信都合が authoring へ漏れている

再設計:

- note 本文および frontmatter から参照する画像原本は、原則として `content/_assets` に統一する
- `src/assets` はアプリケーション実装資産用とし、note 本文用原本の正規配置としては扱わない
- author は常にローカル source path を記述し、配信用 URL を意識しない
- build は source path を入力として、最適化済み派生画像と最終 HTML を生成する
- 配信用 URL の解決は build の責務とし、Markdown / frontmatter の元テキスト自体は変更しない

この方針を採る理由:

- note 本文資産の ownership が content 側に固定される
- authoring と app shell 実装資産が混在しない
- build 系統や配信基盤を差し替えても source asset と本文を不変に保ちやすい
- frontmatter の `cover` と本文画像を同一パイプラインへ統合しやすい

推奨ディレクトリ構成:

```text
content/
  _assets/
    testing/
      test-hero.jpg
      test-card.jpg
  testing/
    test.md

.generated/
  media/
    image-manifest.json

scripts/
  build-images.ts
  upload-media-assets.ts
```

期待効果:

- 初回表示の転送量削減
- authoring 契約の明確化
- 画像配信基盤の移行容易性向上
- 画像方針の一貫化

### 1-1-A. 配信基盤は抽象化し、本文設計へ埋め込まない

本設計で固定するべきなのは、特定ベンダー名ではなく次の抽象構造である。

1. ローカル原本を source of truth とする
2. production build で派生画像を生成する
3. 派生画像だけを object storage / CDN に配置する
4. manifest resolver が final HTML に配信用 URL を解決する

この章では object storage / CDN の存在を前提にしてよいが、R2、S3、Cloudflare Images などの具体実装は下位実装または運用文書が所有するものとする。

理由:

- ベンダー差し替えを仕様改訂ではなく実装差し替えとして扱いやすくなる
- 本文設計と運用基盤の時間軸を分離できる
- 将来の storage migration を resolver 境界へ閉じ込められる

### 1-1-B. 画像 manifest を正規カタログとして契約化する

manifest は単なる補助 JSON ではなく、画像原本と配信用派生画像の対応を表す正規カタログとする。

manifest の責務:

- source path と派生画像群の対応を保持する
- HTML 解決に必要な metadata を保持する
- build / upload / resolver 間の唯一の受け渡し形式になる
- 配信基盤差し替え時の移行点になる

manifest は少なくとも次を持たなければならない。

- `schemaVersion`
- `generatorVersion`
- `variantSetVersion`
- 原本相対パス
- content hash
- width / height
- placeholder 情報
- variant ごとの派生出力情報

  - format
  - media type
  - byte size
  - URL または object key

例:

```json
{
  "schemaVersion": 1,
  "generatorVersion": "1.0.0",
  "variantSetVersion": "reading-v1",
  "items": {
    "content/_assets/testing/test-hero.jpg": {
      "hash": "a1b2c3d4",
      "width": 2232,
      "height": 1488,
      "placeholder": {
        "kind": "dominant-color",
        "value": "oklch(0.82 0.03 95)"
      },
      "variants": {
        "thumb": {
          "outputs": [
            {
              "format": "avif",
              "mediaType": "image/avif",
              "byteSize": 14231,
              "url": "https://media.example.com/images/a1b2c3d4/thumb.avif"
            },
            {
              "format": "webp",
              "mediaType": "image/webp",
              "byteSize": 21884,
              "url": "https://media.example.com/images/a1b2c3d4/thumb.webp"
            },
            {
              "format": "jpeg",
              "mediaType": "image/jpeg",
              "byteSize": 40211,
              "url": "https://media.example.com/images/a1b2c3d4/thumb.jpg"
            }
          ]
        },
        "reading": {
          "outputs": [
            {
              "format": "avif",
              "mediaType": "image/avif",
              "byteSize": 52214,
              "url": "https://media.example.com/images/a1b2c3d4/reading.avif"
            },
            {
              "format": "webp",
              "mediaType": "image/webp",
              "byteSize": 78110,
              "url": "https://media.example.com/images/a1b2c3d4/reading.webp"
            },
            {
              "format": "jpeg",
              "mediaType": "image/jpeg",
              "byteSize": 131402,
              "url": "https://media.example.com/images/a1b2c3d4/reading.jpg"
            }
          ]
        },
        "full": {
          "outputs": [
            {
              "format": "avif",
              "mediaType": "image/avif",
              "byteSize": 118220,
              "url": "https://media.example.com/images/a1b2c3d4/full.avif"
            },
            {
              "format": "webp",
              "mediaType": "image/webp",
              "byteSize": 174321,
              "url": "https://media.example.com/images/a1b2c3d4/full.webp"
            },
            {
              "format": "jpeg",
              "mediaType": "image/jpeg",
              "byteSize": 301224,
              "url": "https://media.example.com/images/a1b2c3d4/full.jpg"
            }
          ]
        }
      }
    }
  }
}
```

追加規則:

- manifest schema は versioned contract とする
- resolver は schema version 不一致や必須 field 欠落を build-time error にしなければならない
- manifest の欠損や不整合を runtime で best effort 補修してはならない
- variant 名は寸法ではなく用途名で固定する
- variant の内部寸法・品質を変更しても、variant 名の意味を壊してはならない

### 1-1-C. variant 設計はデザイン意図で固定する

variant はピクセル値ではなく用途で定義する。

- `thumb`

  - 一覧、カード、小さな埋め込み向け
- `reading`

  - 本文カラム幅向けの標準画像
- `full`

  - 拡大表示、高解像度表示向け

この命名にする理由:

- 表示幅や圧縮品質の見直しを authoring 契約から切り離せる
- レイアウト変更やテーマ変更が起きても API の意味を維持しやすい
- 将来の art direction 追加にも拡張しやすい

### 1-1-D. URL 解決の責務を resolver に閉じ込める

author は source path を書き、build は manifest resolver を通じて final HTML に配信用 URL を反映する。

この責務分離を崩してはならない。

- authoring 層

  - source path を記述する
- image build 層

  - 原本から派生画像を生成する
- manifest 層

  - 原本と派生画像の対応を保持する
- resolver 層

  - source path から `src` / `srcset` / `sizes` / `width` / `height` を導出する
- output 層

  - 最終 DOM を確定する

禁止事項:

- 配信用 URL を author に直接書かせること
- Markdown の生テキストを build 後 URL で上書きすること
- resolver を通さず個別テンプレートで ad hoc に画像 URL を組み立てること

### 1-1-E. `ui-image` は source 単位ではなく picture 契約へ寄せる

長期的には `ui-image` の入力契約を単一 `src` 前提から脱却させ、`picture` 相当の構造を扱える形へ寄せる。

必要な情報:

- fallback `src`
- `srcset`
- `sizes`
- `width`
- `height`
- placeholder
- 形式別 source 群

最終 HTML は少なくとも次の意味論へ収束できることが望ましい。

```html
<picture>
  <source type="image/avif" srcset="..." sizes="..." />
  <source type="image/webp" srcset="..." sizes="..." />
  <img
    src="..."
    srcset="..."
    sizes="..."
    width="1200"
    height="800"
    loading="lazy"
    decoding="async"
    alt="..."
  />
</picture>
```

### 1-1-F. build / deploy / GC の責務を分離する

長期保守性を考えると、画像処理の各段階は次のように分離する。

- local dev

  - 原本画像をそのまま使える
  - object storage への接続を必須にしない
- production build

  - 派生画像生成
  - manifest 生成
  - final HTML 用の URL 解決
- deploy pipeline

  - 派生画像 upload
  - HTML / Pages deploy
- background GC

  - 参照されなくなった旧 hash 資産の遅延削除

追加規則:

- hash ベース key を採用し、上書き更新を前提にしない
- deploy と同時に旧資産を即削除してはならない
- GC は manifest 非参照状態を複数 deploy 期間確認した後に行う

### 1-1-G. 失敗時の縮退を build-time 契約として定義する

配信資産の生成または upload に失敗したときの扱いを明示しなければならない。

推奨方針:

- production build では fail closed を基本とする
- manifest 契約違反、variant 欠落、upload 未完了のまま final HTML を生成してはならない
- local dev では fail open を許し、ローカル原本への縮退を認めてよい
- ただし、この縮退は開発補助であり、本番契約ではない

理由:

- production での静かな画像欠落を防げる
- build failure と deploy failure の切り分けがしやすい
- local dev の機動性を保ちつつ、本番品質を厳格化できる

### 1-1-H. 本章と他文書の ownership を明示する

本章はメディアパイプラインの設計原則と責務分離を定義する。

一方で、以下は別文書が正本を持つ。

- author が本文でどの画像パス記法を書けるか

  - Markdown authoring specification
- 最終的な `ui-image` / `picture` / `img` 出力契約

  - Markdown output contract
- 危険 URL、許可属性、build-time rejection の詳細

  - Markdown safety and test policy

したがって、本章だけを更新して authoring や output の意味論変更を既成事実化してはならない。

### 1-2. `loading="eager"` の利用ルールを厳格化する

現状の問題:

- author が簡単に eager を指定できる
- 読書ページにおいて eager は LCP 候補以外ではほぼ不要
- 本文画像の eager 指定が性能予算を壊しやすい

再設計:

- note 本文画像の既定は `loading="lazy"` とする
- `eager` を許可するのは次に限定する

  - ページ先頭の代表画像
  - fold 内にある LCP 候補 1 枚
- それ以外の `eager` 指定は build-time warning または error とする
- `eager` の妥当性判定は author 裁量ではなく build policy が持つ

期待効果:

- 初期リクエスト数の制御
- reader performance の一貫性向上
- note ごとの勝手な eager 乱用防止

### 1-3. link-card 画像は reader 向け派生資産として別管理する

現状の問題:

- カードに元画像 URL をそのまま渡すと過剰サイズになりやすい
- 外部画像の可用性や応答時間に引きずられる
- カード画像の責務が本文画像と混同されやすい

再設計:

- link-card metadata には card 用 thumbnail 情報を持たせる
- 外部画像を利用する場合でも、可能な限り取得・正規化・縮小済み派生画像を使う
- 本文画像パイプラインと同様に、card 用画像も build-time で reader 向けサイズへ落とす
- remote image をそのまま 読者向け最終 HTML に露出する経路は最小化する

追加規則:

- card thumbnail は本文用 `reading` variant と同一視しない
- link-card は `thumb` 相当の専用用途として扱う
- metadata cache と card thumbnail cache は概念上分離してよい

期待効果:

- card 表示のコスト削減
- 外部依存による表示揺れの抑制
- card と本文の画像責務分離

## 2. hydration 戦略の再設計

### 2-1. 目的

本章の目的は、note ページにおける hydration を「初回表示時に存在要素を一括 import する処理」から、責務分離された段階実行モデルへ置き換えることである。

本再設計では、単に初回表示を軽くすることだけを目的としない。長期保守性の観点から、次を同時に満たすことを目的とする。

1. hydration の責務境界を明確化する
2. component 名ではなく capability と trigger に基づいて起動方針を決定できるようにする
3. build-time で hydration 対象と起動契機を明示し、runtime の暗黙推論を減らす
4. keyboard 操作、focus、viewport、明示操作といった起動契機を統一モデルで扱う
5. 遅延 hydrate の成否を診断可能にする
6. component 数と page 種類が増えても loader へ責務が集中しない構成にする

### 2-2. 非目的

本章は次を目的としない。

1. すべての component を一律に遅延 hydrate すること
2. `component-manifest` 1 箇所へ import 情報、優先度、起動契機、例外規則を集約すること
3. `querySelectorAll()` ベースの全走査をより複雑な条件分岐で延命すること
4. runtime の best effort 判定で accessibility 要件を補修すること
5. 個別 component ごとの場当たり的な最適化を hydration 戦略そのものと混同すること

### 2-3. 基本原則

#### 2-3-1. static-first

HTML と CSS だけで成立する表示は、可能な限りそのまま表示可能でなければならない。hydrate は「表示成立の前提」ではなく「追加機能の付与」として扱う。

#### 2-3-2. policy と mechanism の分離

`initial`、`visible`、`interaction` のような起動方針は policy であり、`requestIdleCallback`、`IntersectionObserver`、event listener は mechanism である。両者を同一設定項目へ混在させてはならない。

#### 2-3-3. component 名ではなく capability を基準にする

同一 component でも、属性、slot 構成、表示文脈によって必要な hydration は異なる。したがって、起動方針を component 名に固定してはならない。

#### 2-3-4. build-time explicitness

hydrate 対象、scope、trigger は build-time で明示し、runtime の DOM 全推論に依存してはならない。

#### 2-3-5. accessibility first

viewport 外であることは、keyboard や assistive technology から不要であることを意味しない。focus 到達可能な UI は、visible 判定だけで遅延してはならない。

#### 2-3-6. degraded but observable

遅延 hydrate に失敗しても page 全体を破綻させてはならない。一方で、失敗を無視してもならない。失敗は診断可能でなければならない。

### 2-4. 用語

#### 2-4-1. load

module を取得し評価することを指す。custom element の define 前段階を含んでよい。

#### 2-4-2. upgrade

custom element の定義を有効化し、対象 DOM を custom element として upgrade 可能な状態にすることを指す。

#### 2-4-3. activate

observer、global listener、iframe 生成、測定、再配置など、重い副作用を伴う機能を開始することを指す。

#### 2-4-4. hydration scope

同一の起動方針で扱う DOM 範囲を指す。page 全体を単一 scope とみなしてはならない。

#### 2-4-5. hydration capability

対象 UI が要求する機能段階を表す分類である。component 名ではなく機能特性で定義する。

#### 2-4-6. hydration trigger

`load` / `upgrade` / `activate` をいつ行うかを決める契機である。

### 2-5. capability 分類

本再設計では、component を直接 `critical` / `deferred` / `on-demand` に分類しない。代わりに、対象 DOM を次の capability に分類する。

| capability | 意味 | 典型例 |
| --- | --- | --- |
| `static` | hydrate なしでも読書・閲覧が成立する | 装飾のみの UI、静的画像、静的本文 |
| `progressive` | hydrate により補助機能を付与するが、未起動でも閲覧は成立する | copy 機能付き code block、zoomable image、補助 tooltip |
| `interactive` | 初回操作前までに upgrade が必要だが、activate は遅延できる | toc、sidebar、tabs、軽量 dialog trigger |
| `sandboxed` | iframe、外部計測、重い observer、実行環境を伴う | preview-sandbox、heavy preview、JS 実行デモ |

追加規則:

1. capability は component 名ではなく「その instance の振る舞い」で決定しなければならない
2. 同一 component が複数 capability を取りうることを前提とする
3. capability は import path とは独立に定義しなければならない

### 2-6. trigger 分類

起動契機は次の 4 種に固定する。

| trigger | 意味 | 用途 |
| --- | --- | --- |
| `initial` | router の commit 後ただちに必要 | shell、初回操作前に成立すべき軽量 UI |
| `post-commit` | 初回 commit 後、主表示を阻害しない範囲で順次開始 | progressive enhancement 群 |
| `visible` | viewport 進入、または focus 接近時に開始 | 下方 widget、zoomable media、後段 card 群 |
| `interaction` | 明示操作時に開始 | sandbox、重い preview、開閉で初めて必要になる大型 UI |

追加規則:

1. `visible` は viewport だけでなく keyboard focus 到達可能性を考慮しなければならない
2. `interaction` は click だけでなく keyboard activation を含まなければならない
3. `post-commit` は `requestIdleCallback` そのものではなく抽象 trigger として定義する
4. 実装は trigger を mechanism 名で公開してはならない

### 2-7. 二軸モデル

起動方針は、`capability` と `trigger` の組み合わせで定義する。

例:

- 静的本文画像  
  - capability: `static`
  - trigger: なし

- `zoomable="false"` の `ui-image`  
  - capability: `static`
  - trigger: なし

- ズーム可能な `ui-image`  
  - capability: `progressive`
  - trigger: `visible`

- copy 機能を持つ `ui-code-block`  
  - capability: `progressive`
  - trigger: `post-commit`

- shell 内の toc / sidebar  
  - capability: `interactive`
  - trigger: `initial`

- `allow-js="true"` を含む `preview-sandbox`  
  - capability: `sandboxed`
  - trigger: `interaction`

重要なのは、これらを component 名で固定しないことである。たとえば `ui-image` というタグ名自体に起動方針を埋め込んではならない。

### 2-8. モジュール責務

本再設計では hydration を単一 loader の責務として扱わず、次のモジュールへ分割する。

#### 2-8-1. hydration directive emitter

責務:

- SSR または build-time で hydration 用属性を出力する
- DOM 全体ではなく scope 単位の境界を明示する
- instance ごとの capability / trigger を明示する

非責務:

- runtime の import 実行
- observer attach
- component 内 activate 処理

#### 2-8-2. hydration registry

責務:

- tag 名または contract key と module import path の対応を保持する
- capability ごとに activate adapter の有無を宣言する
- scheduler が参照する正規 registry を提供する

非責務:

- DOM 走査
- trigger 判定
- performance 計測
- page 種類ごとの例外ロジック

追加規則:

- import path の正規表は hydration registry が所有してよい
- 起動契機や page 固有例外まで registry に抱え込んではならない

#### 2-8-3. hydration planner

責務:

- 現在の root 内から hydration directive を読み取る
- scope ごとの hydrate plan を構築する
- `initial` / `post-commit` / `visible` / `interaction` の各 queue に振り分ける

非責務:

- import 実行そのもの
- global observer の長期保持
- component 個別 activate 実装

#### 2-8-4. hydration scheduler

責務:

- queue ごとの実行順序を制御する
- `initial` 完了後に `post-commit` を開始する
- `visible` / `interaction` trigger の購読を管理する
- abort と latest-wins を route 遷移と整合させる

非責務:

- capability 判定
- component DOM の意味解釈
- markup 生成

#### 2-8-5. activation adapter

責務:

- upgrade 後に重い activate を分離して実行する
- component 個別の observer attach、iframe 起動、global listener 開始などを制御する

非責務:

- module import
- registry 管理
- DOM 走査

#### 2-8-6. diagnostics collector

責務:

- plan 件数
- load 成功 / 失敗
- upgrade 成功 / 失敗
- activate 成功 / 失敗
- skipped / aborted / superseded

を集計する。

非責務:

- UI 表示
- retry policy の個別判断

### 2-9. build-time directive 契約

SSR 出力には、少なくとも次の hydration 用属性を許可する。

- `data-hydration-scope`
- `data-hydration-capability`
- `data-hydration-trigger`

例:

```html
<section class="note-shell" data-hydration-scope="note-shell">
  ...
</section>

<ui-code-block
  data-hydration-capability="progressive"
  data-hydration-trigger="post-commit"
></ui-code-block>

<ui-preview-sandbox
  data-hydration-capability="sandboxed"
  data-hydration-trigger="interaction"
></ui-preview-sandbox>
```

追加規則:

1. これらの属性は SSR / build-time 出力側が所有し、client loader が事後的に意味推定してはならない
2. page root 単位だけでなく、section 単位で scope を切らなければならない
3. directive を出力できない instance についてだけ、限定的な fallback 判定を許可してよい
4. fallback 判定を正規経路としてはならない

### 2-10. DOM 走査方針

現行の `querySelectorAll(COMPONENT_SELECTOR)` によるページ全体走査は、正規経路として廃止する。

再設計後の走査方針は次のとおりとする。

1. planner は `data-hydration-scope` 境界ごとに対象を読む
2. planner は `data-hydration-*` を持つ要素だけを対象とする
3. fallback 走査が必要な場合でも、root 全体ではなく当該 scope に限定する
4. 新規 page 種別追加時に selector 定数を膨張させる設計は採らない

### 2-11. route 遷移との統合

hydration は router の commit 後に開始しなければならない。

規則:

1. `initial` queue の開始点は、本文・文書メタデータ・履歴が commit された後とする
2. 遷移中に旧 page の `visible` / `interaction` queue が残っている場合は abort しなければならない
3. 後続遷移により superseded された queue は結果を commit してはならない
4. hydration scheduler は route 遷移ライフサイクルの外で孤立してはならない

### 2-12. accessibility 例外規則

遅延 hydrate は accessibility 要件より優先してはならない。

必須規則:

1. keyboard focus により到達しうる interactive 要素は、focus 到達時点までに upgrade 可能でなければならない
2. `visible` trigger は `IntersectionObserver` だけでなく focus 契機を持たなければならない
3. hydrate 前でも role、name、静的本文、代替テキストは成立していなければならない
4. 未 hydrate 状態を hover 前提 UI で隠してはならない
5. failed 時は静的 fallback を残し、空要素や無反応 UI にしてはならない

### 2-13. component 実装規則

各 component は次のいずれかの実装形態を明示しなければならない。

#### 2-13-1. static-only

hydrate を必要としない。SSR HTML と CSS のみで完結する。

#### 2-13-2. upgrade-light

upgrade は軽量であり、activate を伴わないか、極小である。

#### 2-13-3. upgrade-then-activate

upgrade は軽量だが、observer や iframe などの重い処理は `activate()` 相当の後段へ分離する。

#### 2-13-4. explicit-activation-only

明示操作前に重い処理を開始してはならない。`preview-sandbox` はこれを基本形とする。

追加規則:

1. `connectedCallback()` 内で重い副作用を即時開始する設計は、新規採用してはならない
2. global listener、`ResizeObserver`、`MutationObserver`、iframe 生成は activate 段階へ分離する
3. static rendering で済む機能に hydrate 必須設計を採ってはならない

### 2-14. 診断契約

hydration は観測可能でなければならない。最低限、次の診断情報を持つ。

```ts
type HydrationTrigger = 'initial' | 'post-commit' | 'visible' | 'interaction';
type HydrationCapability = 'static' | 'progressive' | 'interactive' | 'sandboxed';
type HydrationStage = 'planned' | 'loaded' | 'upgraded' | 'activated' | 'skipped' | 'failed' | 'aborted';

interface HydrationIssue {
  code:
    | 'module-load-failed'
    | 'upgrade-failed'
    | 'activation-failed'
    | 'missing-directive'
    | 'fallback-scan-used';
  trigger: HydrationTrigger;
  capability: HydrationCapability;
  count: number;
}

interface HydrationDiagnostics {
  degraded: boolean;
  plannedCount: number;
  loadedCount: number;
  upgradedCount: number;
  activatedCount: number;
  skippedCount: number;
  failedCount: number;
  issues: HydrationIssue[];
}
```

規則:

1. `fallback-scan-used` は常用経路であってはならない
2. `module-load-failed` と `activation-failed` を同一視してはならない
3. component 単位の失敗を page 全体破綻と機械的に同一視してはならない
4. 一方で失敗を握り潰してもならない

### 2-15. 実装フェーズ

#### フェーズ 1: 境界分離

1. 現行 `component-loader` から planning と execution を分離する
2. `component-manifest` を import registry と hydration policy から分離する
3. router commit 後に hydration planner を起動する境界を確立する

完了条件:

* loader が DOM 全走査と `Promise.all` 一括実行の両責務を持たない
* planner / scheduler / executor の 3 分離が成立する

#### フェーズ 2: directive 導入

1. SSR 出力へ `data-hydration-scope` を導入する
2. instance 単位で `data-hydration-capability` / `data-hydration-trigger` を出力する
3. fallback scan は一時互換としてのみ残す

完了条件:

* note page の正規経路で DOM 全体 selector に依存しない
* scope 単位で hydrate plan を構築できる

#### フェーズ 3: trigger 実装

1. `initial` queue
2. `post-commit` queue
3. `visible` queue
4. `interaction` queue

を実装する。

完了条件:

* `preview-sandbox` を初回表示で activate しない
* viewport 外 widget が初回に一括 import されない
* focus 起点の hydrate が成立する

#### フェーズ 4: component 側再設計

1. `ui-code-block` を static-first へ寄せる
2. `ui-code-group` の observer attach を activate へ分離する
3. `ui-translation` の global listener を縮小する
4. `layout-toc` を軽量 upgrade と遅延 activate に分ける
5. `ui-preview-sandbox` を explicit activation 基本形へ変更する

完了条件:

* 重い observer と iframe 起動が `connectedCallback()` 即時開始で残らない

#### フェーズ 5: 計測と受け入れ

1. diagnostics を開発時に可視化する
2. page 単位で hydrate plan と失敗数を比較できるようにする
3. regression test を追加する

### 2-16. 受け入れ基準

再設計完了の受け入れ基準は次のとおりとする。

1. note page の初回 hydrate 対象が `initial` queue に限定されていること
2. `preview-sandbox` が初回表示で activate されないこと
3. `zoomable="false"` の画像が hydrate 不要であること
4. keyboard focus により到達する interactive 要素が未起動のまま操作不能にならないこと
5. route 遷移時に旧 page の遅延 queue が commit されないこと
6. fallback scan 使用時に diagnostics へ記録されること
7. module load 失敗時でも静的本文と読書フローが維持されること

### 2-17. 最終方針

本再設計で優先するのは、「より賢い一括 loader」を作ることではない。優先するのは次の 4 点である。

1. hydrate 判断の source of truth を build-time directive へ移すこと
2. loader の責務を planner / scheduler / executor / diagnostics へ分解すること
3. component 名ではなく capability と trigger で起動方針を扱うこと
4. accessibility と route lifecycle を hydration 契約の中へ組み込むこと

これにより、page 種別、widget、interactive demo が増えても、hydration 戦略を loader の肥大化なしに維持できる構成へ移行する。


## 3. `preview-sandbox` / `code-preview` の再設計

本章では、`preview-sandbox` と `code-preview` を「重いコンポーネント」として局所最適化するのではなく、**読書面・authoring 契約・実行デモ環境の責務を分離する**ための再設計方針を定義する。

ここで優先するのは、単に iframe 起動を遅らせることではない。長期保守性の観点から、次を固定する。

1. `allow-js` と起動タイミングを別契約として扱う  
2. 著者向け記法を不必要に分裂させない  
3. 読書ページと実行デモ環境の責務を分離する  
4. `code-preview` の意味論と実装 profile を分けて設計する  
5. preview 系 UI を static-first に寄せる  

### 3-1. `preview-sandbox` の起動契約を `eager` 前提から外す

現状の問題:

- note に接続された瞬間に iframe が生成される
- `allow-js="true"` の sandbox では author supplied JavaScript まで初回表示時に起動しうる
- 接続時初期化と実行開始が同じ契約に押し込まれている

再設計:

- `preview-sandbox` の既定 `activation-policy` は `visible` とする
- `manual` は opt-in の明示モードとして残す
- `manual` の場合、「プレビューを開く」操作があるまで iframe `srcdoc` を生成しない
- `allow-js` は JavaScript 注入可否だけを表し、起動タイミングの意味を持たせない
- `allow-js=true` の sandbox に対して `manual` を推奨してよいが、意味論として従属させてはならない

理由:

- `allow-js` は trust boundary 側の契約であり、起動戦略の代理変数として使うべきではない
- 実行可否と実行時機を分離することで、将来の最適化や安全性議論を独立に進められる
- 接続時コストを減らしつつ、authoring 契約の意味を崩さずに済む

期待効果:

- 初回表示コストの削減
- iframe / observer / message listener の起動数抑制
- 安全契約と性能契約の混線防止

### 3-2. 読書ページでは「静的プレビュー」、実行環境では「実行プレビュー」に分離する

現状の問題:

- note 本文で live preview を起動している
- 読書ページが UI 実演ページを兼ねている
- 読む責務と試す責務が同じページに混在している

再設計:

- 読書用ノート では静的 preview を既定とする
- interactive demo は Storybook または専用 playground ページへ分離する
- note 側では、必要に応じて次のいずれかを提供する
  - 静的 snapshot
  - 実行環境へのリンク
  - 明示操作で開く軽量 preview
- 「読書面で即 live preview を起動する」ことを標準経路にしない

理由:

- note の主目的は読書であり、実行デモは従属物として扱うべきである
- 実行デモの責務を専用環境へ退避することで、note 側の bundle と hydration を抑えられる
- 今後 control や sandbox 機能が増えても、読書面へ波及しにくくなる

期待効果:

- note 本文の責務明確化
- interactive demo の隔離
- 実演系 UI の肥大化が読者向けページへ伝播しにくくなる

### 3-3. `code-preview` は「別コンポーネント」ではなく「別 profile」として分離する

現状の問題:

- 1 つの `code-preview` に toolbar、surface 切替、viewport 切替、preview、code area が集中している
- 読書用の静的表示と demo 用の高機能表示が同一責務になっている
- このままでは note 用の軽量化と demo 用の拡張性が衝突する

再設計:

- `code-preview` という authoring 上の意味論は 1 つに維持する
- その上で、出力または実装 profile として少なくとも次を分離する
  - `reader`
    - 静的表示中心
    - toolbar なし
    - preview は inert または軽量 DOM に限定
    - hydrate は `deferred` または `on-demand`
  - `demo`
    - Storybook / playground / docs 実演用
    - toolbar、surface 切替、viewport 切替を許可
    - 必要に応じて live preview / sandbox を許可
- 著者向け記法として `reader-code-preview` / `interactive-code-preview` のような別名を新設しない
- profile の差は authoring grammar ではなく、ページ種別または build-time / SSR 側の出力戦略で吸収する

理由:

- authoring 契約を二分すると、文法・出力 DOM・テスト・ガイド文書が同時に分裂する
- `code-preview` の意味論を 1 つに保てば、著者体験と仕様体系の両方を安定させやすい
- 分けるべきなのは「何を表すか」ではなく「どの文脈でどこまで機能を有効にするか」である

期待効果:

- note 用 bundle の削減
- authoring 契約の維持
- 出力 profile ごとの最適化容易性向上
- 将来の toolbar / control 追加による読者向けページへの波及抑制

### 3-4. preview 系の source of truth を単一化する

現状の問題:

- 静的 preview、コード表示、実行 demo を別々に管理すると内容が乖離しやすい
- 読書用 snapshot と実行用 sandbox を手作業で二重管理すると保守負荷が高い

再設計:

- preview 系コンテンツは単一の example source から派生生成する
- 少なくとも次を同一 source から導出できるようにする
  1. note 用静的 preview
  2. code area 表示内容
  3. demo / sandbox 用実行素材
- 画像 snapshot だけを手で差し替える運用を標準にしない

理由:

- source of truth を 1 つに保つ方が、読書面と実行面の表示差異を管理しやすい
- 仕様変更やサンプル更新時の修正箇所を減らせる
- 実装分離をしても内容分裂を起こさない設計にできる

期待効果:

- preview 内容の不整合防止
- 文書更新コストの削減
- demo と note の乖離抑制

### 3-5. `preview-sandbox` は `on-demand` 扱いを標準とする

現状の問題:

- preview 系が読書ページ初回表示の負荷に直接乗っている
- sandbox が「本文の一部」として扱われすぎている

再設計:

- hydration 戦略上、`preview-sandbox` は標準で `on-demand` コンポーネントとして扱う
- `code-preview` の `reader` profile は static-first とし、必要最小限の enhancement のみ許可する
- `demo` profile でも、viewport 外の heavy preview は `visible` または interaction 起点で起動する
- 初回表示で sandbox を必ず起動する設計をやめる

期待効果:

- hydration 負荷の削減
- import 本数の抑制
- interactive preview が本文描画を阻害しにくくなる

## 4. code 系コンポーネントの再設計

本章では、コード表示まわりを **static-first / native-first / build-time-first** で再定義する。

ここで優先するのは、既存コンポーネントを延命することではない。長期保守性の観点から、次を固定する。

1. 読者向け code 表示の source of truth は build-time で確定した静的 DOM とする
2. 読書に必要なコード表示は JavaScript 非依存で成立させる
3. runtime は表示成立ではなく enhancement のみを担う
4. interactive behavior は code 表示本体から分離する
5. code group の構造決定は SSR / build-time 側で完結させる
6. 開発用・デモ用・読書用の責務を同一コンポーネントへ混在させない

### 4-1. 読者向け code block の正規形を `pre[data-code-block]` に再定義する

現状の問題:

- code block 表示のために custom element を必須化している
- 表示成立と操作付与が同一要素に結合している
- instance ごとの observer と接続時初期化が積み上がる
- 読書面に必要な static 表示まで runtime 実装へ依存している

再設計:

- 読者向け code block の正規出力は `pre[data-code-block] > code` とする
- syntax highlight 済み HTML は build-time で確定し、runtime で再構成しない
- `lang`、`filename`、`intent`、`wrap`、`highlight-lines` などは `data-*` 属性または子要素として静的に出力する
- 読書面の正規経路 では `ui-code-block` を正規形として採用しない
- code 表示本体は Web Components ではなく、意味論を持つ標準 HTML を採用する

具体方針:

- `pre[data-code-block]`
  - 読者向け code block のホスト
- `code[data-lang]`
  - 言語情報の保持
- `figcaption` または専用 header 要素
  - `filename` や補助ラベルの表示
- line highlight
  - build-time で class または data 属性として埋め込む

追加規則:

- code block の表示成立に custom element を要求してはならない
- code block の意味論は HTML 標準要素で完結しなければならない
- runtime による subtree 再解釈、再 compose、再 highlight を行ってはならない
- 読書用ノート において、code block の見た目維持を JavaScript に依存させてはならない

期待効果:

- 表示責務が build-time に固定される
- code block 単体のランタイム複雑性がほぼ消える
- observer と custom element 接続コストを排除できる
- DOM 契約が HTML 意味論に近づき、将来の保守と検証が容易になる

### 4-2. `ui-code-block` は 読書面の正規経路 から外し、dev / demo 専用へ縮退する

現状の問題:

- 読書用ノート と dev/demo 用機能が同一コンポーネントに混在している
- copy、overflow、toolbar、監視、再構成が 1 要素へ集中している

再設計:

- `ui-code-block` は 読書面の正規経路 の正規構成から外す
- `ui-code-block` を残す場合でも、それは Storybook、authoring preview、実験 UI、または高度操作が必要な場面だけに限定する
- note 本文では `ui-code-block` を前提にしてはならない

追加規則:

- 読者向け Markdown 出力契約に `ui-code-block` を含めてはならない
- `ui-code-block` を使う場合は、それが dev / demo path であることを明示しなければならない
- 同一の code 表示責務を `pre[data-code-block]` と `ui-code-block` の両方で正規所有してはならない

期待効果:

- note 本文の責務が明確になる
- 読者向け 実装と demo 実装を独立に進化させられる
- 片方の都合で他方が壊れる構造を避けられる

### 4-3. copy と overflow は enhancement として独立させる

現状の問題:

- code 表示本体と操作系が密結合している
- 操作系のために code block 全体が重くなっている

再設計:

- copy と overflow は code 表示本体の責務から分離する
- 必要な場合に限り、静的 DOM に対して enhancer を attach する
- enhancer は code 表示を「成立させる」のではなく、「すでに成立している表示へ操作を足す」だけとする

責務分離:

#### 4-3-A. `code-copy-enhancer`

責務:

- copy button の表示
- copy 操作
- 成功 / 失敗の一時フィードバック
- a11y 上必要なラベルと通知

非責務:

- code 本体の生成
- syntax highlight
- overflow 判定
- code group 統合

#### 4-3-B. `code-overflow-enhancer`

責務:

- overflow 判定
- 横スクロール補助 UI
- 必要最小限の affordance 表示

非責務:

- code 本体の再構成
- copy button 制御
- code group 制御
- 常時監視前提の高コスト初期化

追加規則:

- enhancer は opt-in でなければならない
- enhancer 不在でも読書体験が成立しなければならない
- enhancer は対象要素に局所的に attach し、document-wide な副作用を持ってはならない
- enhancement のために display contract を変更してはならない

期待効果:

- code 表示本体が安定した静的資産になる
- 操作系の不具合が本文表示に波及しにくくなる
- 必要なページだけに最小限の JS を配布できる

### 4-4. `ui-code-group` を廃止し、正規形を SSR 確定の native tab structure に再定義する

現状の問題:

- light DOM 再構成を runtime が担っている
- subtree 監視と compose が 読書面の正規経路 に混入している
- code group の意味構造と interactive behavior が分離されていない

再設計:

- code group の正規形は SSR / build-time で確定した native tab structure とする
- runtime は selected state の切替と keyboard interaction のみを担当する
- `ui-code-group` は 読書面の正規経路 の正規構成から外す
- 読書面の正規経路 において、code block 群の収集・再 compose・内容変化監視を行ってはならない

具体方針:

- `section[data-code-group]`
  - code group 全体のホスト
- `div[role="tablist"]`
  - タブ一覧
- `button[role="tab"]`
  - 各タブ
- `section[role="tabpanel"]`
  - 各パネル
- 初期 selected state、対応 ID、aria 属性は build-time で埋め込む

追加規則:

- tab と panel の対応関係は SSR / build-time で確定しなければならない
- runtime は対応関係を再推論してはならない
- code group に対する subtree 監視を 読書面の正規経路 へ持ち込んではならない
- code group は code 表示本体の ownership を持たず、切替状態だけを所有しなければならない

期待効果:

- compose コストと監視コストを排除できる
- interactive 部分が state machine として単純化する
- a11y 契約を DOM 構造に直接反映できる
- build-time と runtime の責務境界が明確になる

### 4-5. dev / authoring 用の live compose は別 adapter として隔離する

現状の問題:

- authoring preview の都合が production note runtime に流入している
- dev 時に必要な監視と 読者向け runtime の責務が分離されていない

再設計:

- live compose、変更監視、不正構造の即時可視化は dev / authoring 専用 adapter が担う
- production note runtime は compose 済み構造を前提とする
- dev 専用 adapter は 読者向け bundle に常時含めない

責務:

- authoring preview 中の再 compose
- Storybook 上の live editing 補助
- 不正構造の警告
- 開発用の観測性補助

非責務:

- production note の本文表示
- 読者向け runtime の標準責務
- 正規契約の代替

追加規則:

- dev behavior を単なる環境分岐として production 実装へ埋め込んではならない
- dev / authoring の都合を 読者向け DOM 契約へ持ち込んではならない
- production path は常に compose 済み・契約済み DOM を前提としなければならない

期待効果:

- production runtime の単純性を維持できる
- authoring 体験と読書体験を独立に改善できる
- 開発補助が本番実装を汚染しにくくなる

### 4-6. code 系 UI のアクセシビリティ責務は native semantics を基盤に固定する

code 系 UI は軽くするだけでは不十分であり、意味論と操作可能性を native semantics へ寄せて固定しなければならない。

少なくとも次を満たさなければならない。

1. code block 単体は `pre` / `code` の意味論で成立すること
2. code group は `tablist` / `tab` / `tabpanel` の意味論で成立すること
3. keyboard のみで code group の移動と選択が完結すること
4. selected state を色のみに依存させないこと
5. JavaScript 不在でも、少なくとも初期状態の閲覧が成立すること
6. copy button 等の付加操作は本体の意味論を壊さないこと

追加規則:

- ARIA は native semantics の代替ではなく補強として使う
- focus 表示は enhancement の有無にかかわらず明瞭でなければならない
- forced colors と reduced motion を前提に破綻しないこと
- a11y 契約は runtime 最適化を理由に省略してはならない

### 4-7. code 系再設計の正本は「静的出力 + 局所 enhancement + dev 隔離」とする

本章で固定する最終形は次である。

1. 読者向け code block の正規形は `pre[data-code-block] > code`
2. 読者向け code group の正規形は SSR 確定の native tab structure
3. copy / overflow は独立 enhancer
4. live compose と監視は dev / authoring 専用 adapter
5. `ui-code-block` と `ui-code-group` は 読書面の正規経路 の正規構成から外す

この構成を採る理由:

- 表示責務を build-time に固定できる
- runtime を局所的 enhancement に限定できる
- HTML 意味論に近い構造を保てる
- dev/demo の要求と 読者向け 要求を分離できる
- component の延命ではなく、責務境界の明確化によって長期保守性を高められる

## 5. `translation` と `toc` の再設計

### 5-1. 本章の目的

本章の目的は、`translation` および `toc` を、読書ページ上の付加機能として許容される範囲へ再定義し、初回表示時の常時監視・常時再計算・多責務コンポーネント化を解消することである。

本章では、単に既存コンポーネントの内部最適化を行うことを目的としない。長期保守性の観点から、次を固定する。

1. 読書ページにおける正規形を static-first に寄せる
2. runtime の責務を局所的 enhancement に限定する
3. component 内部分岐ではなく構造分離によって複雑性を下げる
4. page ごとの差異は runtime 推論ではなく build-time capability で決定する
5. accessibility 要件を最適化理由で後退させない

### 5-2. 非目的

本章は次を目的としない。

1. 既存 `ui-translation` および `layout-toc` を温存したまま内部条件分岐だけを増やすこと
2. instance 数や見出し数に応じた ad hoc な runtime ヒューリスティックを増やすこと
3. observer や listener の attach 条件を複雑化して component の延命を図ること
4. 読書面と interactive demo の責務を再び混在させること
5. accessibility 上必要な機能を「軽量化」を理由に省略すること

---

### 5-3. `translation` の再設計

#### 5-3-1. 現状の問題認識

現状の `translation` は、複数 instance が個別に `scroll` / `resize` listener、style injection、popover positioning を持つため、instance 数に応じて線形に接続時コストが増加する。

ただし、長期保守性の観点では、問題は listener 数だけではない。`translation` は静的読書補助と overlay UI という異質な責務を 1 コンポーネントへ混在させている。このため、内部最適化だけでは保守負債を十分に解消できない。

#### 5-3-2. 採用方針

`translation` は、単一コンポーネントの mode 分岐として維持しない。今後の正規構成は、次の 2 系統へ分離する。

1. 静的本文系 translation
   - 原文と訳文の関係を、読書本文に埋め込まれる静的構造として表現するもの
2. overlay 系 translation
   - popover または drawer により補助表示を行う、対話的補助 UI として表現するもの

この分離により、`interlinear` を 読者向け の静的構成へ寄せ、`popover` / `drawer` を on-demand な interactive enhancement として局所化する。

#### 5-3-3. 正規構成

##### A. 静的本文系 translation

静的本文系 translation の正規形は、SSR 確定の静的 DOM とする。この系統では、表示成立に JavaScript を要求してはならない。

要求事項:

1. 原文と訳文の関係は build-time で確定しなければならない
2. DOM は本文構造として読めるものでなければならない
3. 読書ページの初回表示で listener / observer / rAF を起動してはならない
4. キーボード操作不能な hover 依存 UI にしてはならない
5. JS 不在でも閲覧可能でなければならない

##### B. overlay 系 translation

overlay 系 translation は、popover / drawer による補助表示を担う。この系統では、表示位置計算、開閉状態、フォーカス復帰、Esc による閉鎖など、overlay 固有の責務だけを持つ。

要求事項:

1. overlay の open / close は明示操作でのみ起動しなければならない
2. 位置決定や再配置は instance ごとではなく document 単位 orchestration に集約しなければならない
3. instance は content semantics を持たず、登録対象として振る舞わなければならない
4. scroll / resize の監視は document ごとに 1 つを上限とする
5. フォーカス復帰、Esc、読み上げ可能な名前計算を保証しなければならない

#### 5-3-4. 実装責務の分離

##### `translation` compiler 層

責務:

- authoring input を解析する
- 静的本文系か overlay 系かを確定する
- 最終出力に必要な静的構造と capability 情報を付与する

非責務:

- runtime での best effort 判定
- viewport を見た出し分け
- scroll / resize 監視

##### `translation` orchestrator 層

責務:

- overlay 系 translation の open instance 群を管理する
- document 単位の scroll / resize を集約する
- 必要時のみ再配置を実行する
- router 遷移時の cleanup を一元管理する

非責務:

- 原文・訳文テキストの意味論保持
- authoring 解釈
- interlinear 表示

##### `translation` view 層

責務:

- compiler が生成した静的 DOM を表示する
- overlay trigger として必要な最小状態だけを持つ

非責務:

- global listener の attach
- runtime mode 判定
- 他 instance の調停

#### 5-3-5. 禁止事項

1. `interlinear`、`popover`、`drawer` を 1 クラスの if 分岐で延命してはならない
2. 各 instance が個別に `scroll` / `resize` を購読してはならない
3. 静的本文系 translation に popover positioning の責務を持ち込んではならない
4. 読書面の意味論を overlay 都合で変更してはならない
5. accessibility 要件を「軽量化」の名目で後退させてはならない

#### 5-3-6. 期待効果

1. instance 数増加時の線形コストを抑制できる
2. 読書面の正規形を static-first に固定できる
3. overlay 由来の複雑性を局所 subsystem へ隔離できる
4. router 遷移、cleanup、テスト設計の責務が明確になる
5. authoring / output / runtime の境界が明瞭になる

---

### 5-4. `toc` の再設計

#### 5-4-1. 現状の問題認識

現状の `toc` は、`scroll`、`hashchange`、`ui-tab-change`、`MutationObserver`、`requestAnimationFrame()` を用いた可視見出し再計算を持ち、tabs を含むページでは処理経路が増加する。

ただし、長期保守性の観点では、「見出し数が少ない」「tabs を含まない」「mobile bar が不要」などの runtime 条件判定を `toc` 自身へ積み増す構成は採らない。これらは component 内ヒューリスティックを増殖させ、将来の差分管理を困難にするためである。

#### 5-4-2. 採用方針

`toc` は単一コンポーネントの多責務構成として維持しない。今後の正規構成は、次の 3 層へ分離する。

1. TOC Static View
   - SSR で確定した見出し一覧を表示する静的ビュー
2. TOC Active Tracker
   - 現在位置に対応する見出し状態だけを更新する enhancer
3. TOC Mobile Summary Controller
   - mobile bar や condensed UI が必要な場合にのみ有効化される補助 controller

この分離により、通常の読書ページでは TOC Static View のみで成立し、active tracking や mobile 補助 UI は capability が付与されたページだけで起動する。

#### 5-4-3. build-time capability 契約

`toc` の挙動は runtime の暗黙推論で決定してはならない。page compiler は各 note に対して、少なくとも次の capability を build-time で確定しなければならない。

- 静的一覧のみでよいか
- active heading tracking が必要か
- tabs 等により見出し集合が動的に切り替わるか
- mobile condensed UI が必要か

TOC UI は、これら capability の明示入力だけを受け取り、DOM 全体を観測して mode を推測してはならない。

#### 5-4-4. 正規構成

##### A. TOC Static View

要求事項:

1. SSR された見出し一覧だけで閲覧可能でなければならない
2. 初回表示に scroll listener を必須としてはならない
3. hash 遷移だけで最低限の読書導線が成立しなければならない
4. 見出し構造と DOM 順序を破壊してはならない

##### B. TOC Active Tracker

要求事項:

1. active state 更新だけを責務とする
2. 可視見出し再計算は capability が要求する場合に限り起動する
3. tab 連動が必要な場合でも、tabs 実装の詳細を直接知ってはならない
4. 更新契機は抽象化された page event または compiler が付与した scope 情報に限定する
5. active state は色だけでなく、境界・インジケーター等を含めて判読可能でなければならない

##### C. TOC Mobile Summary Controller

要求事項:

1. mobile 用 condensed UI が不要なページでは起動してはならない
2. scroll 監視はこの controller に閉じ込めなければならない
3. TOC Static View や Active Tracker と責務を混在させてはならない
4. target size、focus visibility、Forced Colors を含む accessibility 要件を満たさなければならない

#### 5-4-5. 実装責務の分離

##### TOC compiler 層

責務:

- 見出し一覧を build-time で確定する
- 各 page に必要な TOC capability を付与する
- 静的 anchor 構造を出力する

非責務:

- scroll / resize / mutation の runtime 監視
- active heading 判定
- mobile summary の挙動決定

##### TOC runtime tracker 層

責務:

- active heading の更新
- capability に応じた最小限の再計算
- page event への反応

非責務:

- 見出し一覧そのものの再生成
- tabs 実装詳細の知識
- mobile condensed UI の責務

##### TOC mobile controller 層

責務:

- mobile condensed UI の表示制御
- scroll に応じた summary state 変更

非責務:

- static TOC の構造生成
- active heading アルゴリズムの中核管理

#### 5-4-6. 禁止事項

1. `toc` 単体へ見出し一覧生成、active tracking、mobile bar 制御を再集約してはならない
2. 「見出し数が少ないから簡易モード」等の runtime ヒューリスティックを正規設計にしてはならない
3. tabs の有無を `toc` 自身が DOM から推論してはならない
4. mobile bar 要否を TOC 本体が判断してはならない
5. active state を色のみに依存させてはならない

#### 5-4-7. 期待効果

1. 読書ページごとの runtime overhead を明確に抑制できる
2. TOC の mode 分岐を component 内部条件分岐ではなく構造分離で管理できる
3. tabs、mobile、active tracking の差異を capability 契約へ押し戻せる
4. build-time explicitness を高め、runtime 推論を減らせる
5. TOC の a11y 監査とテスト責務を分離しやすくなる

---

### 5-5. 実装順序

#### フェーズ 1: 契約分離

1. `translation` を静的本文系と overlay 系へ概念分離する
2. `toc` を static view / active tracker / mobile controller へ概念分離する
3. 現行 component の責務を棚卸しし、各責務の帰属先を固定する

#### フェーズ 2: build-time capability 導入

1. note ごとの TOC capability を build-time で確定する
2. `translation` の出力に静的本文系 / overlay 系の区別を反映する
3. runtime 側の mode 推論を削除する

#### フェーズ 3: runtime orchestration 導入

1. overlay 系 translation の document 単位 orchestrator を導入する
2. TOC Active Tracker を static TOC から分離する
3. mobile summary controller を独立させる

#### フェーズ 4: 旧構成の撤去

1. `translation` 内の多態 mode 分岐を縮退させる
2. `toc` に残る多責務実装を撤去する
3. 不要になった observer / listener / style injection を除去する

---

### 5-6. 受け入れ基準

#### `translation`

1. 静的本文系 translation は JavaScript 不在でも閲覧できること
2. overlay 系 translation は instance ごとの `scroll` / `resize` listener を持たないこと
3. open instance の再配置は document 単位 orchestrator が一元管理すること
4. Esc、フォーカス復帰、名前計算が保証されること
5. 読書ページ初回表示で不要な overlay runtime が起動しないこと

#### `toc`

1. static TOC だけで基本閲覧が成立すること
2. active heading tracking は必要ページでのみ有効化されること
3. mobile condensed UI は必要ページでのみ有効化されること
4. TOC 本体が tabs や page 構造を DOM 推論しないこと
5. 選択状態およびフォーカス状態が Forced Colors を含めて判読可能であること

---

### 5-7. 他文書への反映

本章の実装を採用する場合、`translation` の意味論変更は authoring grammar の変更を含みうるため、関連文書を直接改訂しなければならない。overview のみを更新して意味論変更を既成事実化してはならない。

とくに `translation` は現時点で `render-mode: popover | drawer | interlinear` を 1 directive で受理しているため、この再設計を採るなら authoring 契約の分離または再定義が必要である。

## 6. コンテンツ責務の再設計

### 6-1. 目的

本章の目的は、`content/testing/test.md` に集中している複数の責務を分離し、Rouault におけるコンテンツ面の役割を長期的に保守可能な形へ再定義することである。

本再設計では、単に 1 ページを軽量化することだけを目的としない。長期保守性の観点から、次を同時に満たすことを目的とする。

1. 読書体験の評価面と、コンポーネント実験面を分離する
2. Markdown 変換契約の確認面と、isolated component demo 面を分離する
3. サンプルコンテンツの source of truth を単一化する
4. 公開面と許可機能を build-time で固定し、運用裁量を減らす
5. testing 用コンテンツが 読者向け な導線へ混入しないよう、公開面ごとの露出規則を固定する

### 6-2. 非目的

本章は次を目的としない。

1. `test.md` を名前だけ変えて温存すること
2. Storybook を Markdown 変換系の end-to-end 検証の代替にすること
3. content kind を細分化し続けること
4. 同一サンプルを複数箇所へ手書きで複製すること
5. 「重いものを避ける」という運用ルールだけで将来の混在を防ぐこと

### 6-3. 基本原則

#### 6-3-1. 読者向け first

Rouault の主たる成果物は読書ページである。したがって、読書用ノート は常に本文読解を主役とし、demo、sandbox、実験用操作 UI は従属物として扱わなければならない。

#### 6-3-2. ownership first

同じ「確認用コンテンツ」であっても、確認対象が異なるなら ownership を分離しなければならない。Markdown 変換契約、isolated component interaction、読者向け rendering は別責務である。

#### 6-3-3. kind minimalism

content kind の価値は種類数ではなく、公開面と許可機能を build-time で固定できることにある。したがって、kind は最小限に止めなければならない。

#### 6-3-4. single source of truth

コード例、プレビュー例、サンプル画像、サンプル文面は単一の source of truth から供給しなければならない。testing note と Storybook が同じ題材を扱う場合でも、例示内容を別々に手書きしてはならない。

#### 6-3-5. build-time explicitness

コンテンツ種別、許可ディレクティブ、公開面、検索含有、sidebar 含有、index 対象は build-time で確定しなければならない。runtime の推測や運用規約だけで補ってはならない。

### 6-4. content kind 契約

本再設計では、Rouault のコンテンツ種別を次の 3 つへ限定する。

#### 6-4-1. `reader`

目的:
- 実際の読書体験を提供すること
- 読者向け な見た目、可読性、静的 HTML、軽量 enhancement の成立を確認すること

責務:
- 本文読解を中心としたノートを提供する
- note layout、breadcrumb、sidebar、検索結果、メタデータ、本文コンポーネントの 読者向け 契約を確認する
- 本文に意味的に必要な UI のみを含む

非責務:
- 重い sandbox 実演
- isolated component edge case の網羅試験
- コンポーネント API の説明展示
- 実験的 interactive demo の置き場

#### 6-4-2. `testing`

目的:
- Markdown authoring から最終出力 DOM までの end-to-end 契約を確認すること
- build-time 変換、rehype 正規化、読者向け 出力の崩れを検知すること

責務:
- authoring grammar と output contract の通し確認を行う
- 各 Markdown 機能群を責務ごとに分割して確認する
- 静的出力、意味論、最終 DOM、不変条件を確認する

非責務:
- isolated interaction の詳細確認
- Storybook の代替
- 読者向け 導線での公開

#### 6-4-3. `demo`

目的:
- isolated component の interaction、state、edge case、a11y を確認すること

正規配置:
- Storybook
- 必要に応じて専用 demo / playground ページ

責務:
- 1 component または小さな composition 単位で検証する
- controls、states、edge cases、keyboard 操作、a11y を確認する
- note 文脈を前提としない isolated contract を確認する

非責務:
- Markdown 変換系の通し確認
- note path、sidebar、breadcrumb、検索統合の確認
- 読書用ノート の静けさを担保すること

### 6-5. kind ではなく profile として扱うもの

次の概念は content kind にしてはならない。これらは別軸で扱う。

#### 6-5-1. execution profile

- static preview
- visible activation
- manual activation
- sandbox execution
- `allow-js=true`

これらは preview 系 UI の実行プロファイルであり、content kind ではない。

#### 6-5-2. visibility / indexing

- public
- hidden
- indexed
- excluded

これらは公開面制御の属性であり、content kind ではない。

#### 6-5-3. publication state

- draft
- published
- archived

これらは公開状態であり、content kind ではない。

#### 6-5-4. purpose labels

- benchmark
- experiment
- migration
- temporary

これらは運用ラベルまたは補助メタデータであり、content kind ではない。

### 6-6. 配置規則

コンテンツは次のように配置する。

```text
content/
  notes/
    ...
  testing/
    markdown-basic.md
    media.md
    code.md
    interactive.md
    sandbox.md

stories/
  ...
examples/
  markdown/
  preview/
  sandbox/
  media/
```

規則:

1. `content/notes/**` は `reader` 専用とする
2. `content/testing/**` は `testing` 専用とする
3. isolated component demo は `demo` とし、Storybook を正規配置とする
4. サンプル資産は `examples/**` のような単一ディレクトリへ集約し、note と Storybook から共用する
5. `content/testing/test.md` のような総合試験ページは新規に増やしてはならない

### 6-7. testing note の分割方針

testing note は機能群ごとに分離し、1 ページで過剰な種類数を持たせてはならない。

最小構成は次を正規形とする。

- `content/testing/markdown-basic.md`

  - 見出し、段落、強調、リスト、blockquote、table、footnote、inline code
- `content/testing/media.md`

  - `ui-image`、figure、caption、link-card
- `content/testing/code.md`

  - `ui-code-block`、`ui-code-group`
- `content/testing/interactive.md`

  - `tabs`、`translation`、`details`
- `content/testing/sandbox.md`

  - `code-preview`、`preview-sandbox`

追加規則:

1. 1 testing note は 1 つの主題だけを持たなければならない
2. sandbox 系と media 系を同一ページへ混在させてはならない
3. `allow-js="true"` を含む例は `sandbox.md` または `demo` へ限定する
4. testing note は「何が壊れたか」を切り分けやすい粒度で分割しなければならない

### 6-8. 公開面規則

各 kind の公開面は次のとおり固定する。

| kind      | 直接 URL              | sidebar | breadcrumb | 検索      | ホーム / 新着 | 読者向け 推奨 |
| --------- | ------------------- | ------- | ---------- | ------- | -------- | ---------------- |
| `reader`  | 許可                  | 含む      | 含む         | 含む      | 含む       | はい               |
| `testing` | 許可してよい              | 既定で含めない | 必要最小限      | 既定で含めない | 含めない     | いいえ              |
| `demo`    | Storybook または限定 URL | 対象外     | 対象外        | 対象外     | 対象外      | いいえ              |

追加規則:

1. `testing` を 読者向け 導線へ含める場合は、明示的 opt-in を要求しなければならない
2. opt-in がない `testing` は、sidebar、検索カタログ、ホーム、新着から除外しなければならない
3. 「URL を持つこと」と「読者向け に露出すること」を実装上分離しなければならない
4. 露出判定を path 文字列判定へ散在させてはならない。単一の content metadata と build pipeline が所有しなければならない

### 6-9. directive 許可ポリシー

許可ポリシーは kind ごとに固定する。ただし、`sandbox` は kind ではなく、特定 directive と execution profile の組み合わせとして扱う。

#### 6-9-1. `reader` で許可するもの

- 標準 Markdown
- image / figure
- blockquote
- table
- footnote
- `callout`
- `details`
- `info-box`
- `code-group`
- `translation`
- `tabs`
- 意味的に必要な軽量コンポーネント

#### 6-9-2. `reader` で既定禁止とするもの

- `preview-sandbox`
- `allow-js="true"` を伴う preview
- sandbox iframe を前提とする demo
- interactive controls を主目的とする component 実演

#### 6-9-3. `testing` で許可するもの

- 対象機能群の確認に必要な directive
- output contract を確認するための最小構成
- sandbox 系は `sandbox.md` に限定して許可する

#### 6-9-4. `demo` で許可するもの

- isolated state 切替
- edge case
- control panel
- visual regression 用状態列挙
- detailed a11y interaction
- sandbox 実行
- `allow-js="true"` を伴う preview

追加規則:

1. kind ごとの許可ポリシー違反は build-time error にしなければならない
2. `reader` における `preview-sandbox` は warning ではなく error とする
3. `allow-js` は trust boundary の契約であり、kind の代理変数として使ってはならない
4. 起動タイミングは kind ではなく execution profile が所有しなければならない

### 6-10. サンプル source of truth の再設計

例示コンテンツは、次の単位で単一 source から供給する。

- Markdown 断片
- コード断片
- preview HTML / CSS / JS
- サンプル画像
- link-card metadata

推奨構成:

```text
examples/
  snippets/
    code/
    markdown/
    sandbox/
  media/
    ...
  manifests/
    examples.json
```

規則:

1. `testing` と `demo` は、同じ例を別々に手書きしてはならない
2. 例の本文、コード、画像、説明文は、可能な限り shared example source から生成または注入する
3. 「同じコンポーネントの例」が note 側と Storybook 側で意味論的にズレることを禁止する
4. サンプル更新時に複数箇所の手修正を要求する構成を採ってはならない

### 6-11. build-time enforcement

本再設計は運用ルールではなく build-time 契約として実装する。

最低限必要な enforcement は次のとおりとする。

1. content kind の明示

   - `reader`
   - `testing`
   - `demo`

2. kind ごとの許可 directive 検証

   - 禁止 directive の出現を build error にする

3. 公開面制御

   - sidebar 生成
   - breadcrumb 補助生成
   - search catalog 生成
   - home / new entries 生成
   - Pagefind 含有判定

4. 実行プロファイル制御

   - `preview-sandbox` の可否
   - `allow-js="true"` の可否
   - activation policy の許可範囲

5. 重いコンテンツの拒否

   - `reader` での sandbox 実行を禁止する
   - `reader` での `allow-js="true"` を禁止する
   - 重い remote asset を `reader` note へ直接持ち込む経路を縮小する

6. テスト対象分割の強制

   - 1 `testing` note に定義された component 種類数上限を設けてよい
   - 上限超過時は warning ではなく error とする

### 6-12. 実装順序

#### フェーズ 1: 責務分離の先行実装

1. `content/testing/test.md` を廃止する
2. `markdown-basic.md`、`media.md`、`code.md`、`interactive.md`、`sandbox.md` を新設する
3. `testing` を sidebar、検索、ホーム、新着から既定除外する
4. `demo` の正規配置を Storybook と明文化する

#### フェーズ 2: content kind 導入

1. content metadata に `kind` を導入する
2. build pipeline で `kind` ごとの surface policy を適用する
3. Pagefind / search catalog / sidebar tree 生成側に除外規則を実装する

#### フェーズ 3: directive policy / execution profile 導入

1. `kind` ごとの許可 directive 行列を定義する
2. `reader` における sandbox 系 directive を build-time error に　する
3. `allow-js="true"` の出現箇所を `testing` の sandbox ページと `demo` に限定する
4. activation policy を kind とは別契約として定義する

#### フェーズ 4: example source 統合

1. 共有 examples ディレクトリを導入する
2. `testing` と Storybook の例示内容を共通 source へ移す
3. 重複記述を削除する
4. 例示更新手順を単一路線へ統一する

### 6-13. 完了条件

本章の再設計は、次を満たした時点で完了とみなす。

1. `content/testing/test.md` が存在しない
2. `testing` note が主題ごとに分割されている
3. `reader` note に sandbox 実行が混在していない
4. `testing` が既定で sidebar / search / home / 新着へ露出しない
5. `demo` が isolated component demo の正規配置として機能している
6. shared example source が導入され、重複した手書き例が排除されている
7. content kind と directive policy の build-time validation が実装されている
8. execution profile が content kind と分離されている

### 6-14. 期待効果

本再設計により、次の効果を期待する。

1. 単一ページへの過剰集約を防止できる
2. 問題発生時の切り分け単位が明確になる
3. 読書用ノート の静けさを維持できる
4. testing 用コンテンツの混入により検索、sidebar、一覧が汚染されることを防げる
5. Storybook と testing note の責務競合を防げる
6. サンプル更新時の重複修正コストを削減できる
7. 今後 component 種類が増えても、content kind を増殖させずに運用できる

## 実装順序の提案

### フェーズ 1: 即効性の高い施策

1. `test.md` の本文画像から `loading="eager"` を除去する
2. link-card 画像 URL をサムネイル向けに縮小する
3. `preview-sandbox` の既定 activation を `visible` に変える
4. `allow-js="true"` sandbox を `manual` に変更する
5. `test.md` を複数ページへ分割する

### フェーズ 2: hydration 戦略の改善

1. component manifest に priority を導入する
2. `ensureComponentsForRoot()` を wave-based にする
3. viewport / interaction ベースの遅延 hydrate を導入する

### フェーズ 3: コンポーネント内部の軽量化

1. `ui-code-block` を static-first へ寄せる
2. `ui-code-group` の compose / observer を縮小する
3. `ui-translation` の global orchestrator 化
4. `layout-toc` のモード分岐

### フェーズ 4: アセットパイプラインの整備

1. 画像ローカル管理
2. 派生サイズ生成
3. link-card thumbnail キャッシュ
4. authoring guideline の明文化

## 検証方法

再設計後は以下の指標で比較する。

### 計測指標

- HTML response size
- initial JS module count
- initial JS transfer size
- image transfer size
- first contentful paint
- largest contentful paint
- hydration 完了までの時間
- main thread long task の有無

### 最低限の目標値

- `test.md` 相当ページの初回表示で `2MB` 級画像を読まない
- `preview-sandbox` を初回表示で起動しない
- note ページの初回 hydrate 対象を critical component のみに絞る
- testing note 1 ページあたりの component 種類数を大幅に減らす

## 最終結論

今回の重さは、単純に「1 つのコンポーネントが遅い」のではなく、以下の設計が重なって起きている。

- リモート画像が大きい
- test note に heavy widget が集中している
- hydration が一括で行われる
- interactive demo が読書ページに混ざっている

したがって、最も重要なのは局所最適化ではなく、以下の順で再設計すること。

1. コンテンツ責務の分離
2. 画像方針の見直し
3. hydrate 優先度設計
4. sandbox / code 系 UI の static-first 化

この順序で進めれば、`pnpm dev` 上の体感だけでなく、Rouault が目指す「読むための静謐な空間」という設計目標にも整合する。
