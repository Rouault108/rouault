# Rouault

**Rouault** は、個人的なノートを閲覧するための専用 Web アプリケーションです。  
一般的なドキュメントサイトではなく、**「没入して読む」こと** を主眼に、静かで予測可能な読書体験を提供することを目指しています。

Eleventy と Lit を基盤に、Markdown で管理されたノートを、サイドバー・本文・目次を中心とする読書向け UI で表示します。  
検索、テーマ切替、コード表示、対訳表示、楽譜表示など、ノートの内容に応じた表現拡張も段階的に整備しています。

> この README は **プロジェクトの入口文書** です。  
> 厳密な仕様、設計判断、実装契約、テスト方針は `docs/` 以下の文書を参照してください。

---

## これは何か

Rouault は、次のような用途を想定したアプリケーションです。

- 個人用ノートの集積と閲覧
- 学術・人文・技術メモの横断的な読書
- Markdown ベースの長期的なコンテンツ運用
- 読書体験を優先した UI の構築
- Web Components / SSG / client hydration を前提とした設計検証

単なる「Markdown を表示するサイト」ではなく、**読むための構造・見通し・静けさ** を重視した専用アプリケーションとして設計しています。

---

## 主な特徴

### 1. 読書向けの画面構成

Rouault は、ノート本文を中心に据えつつ、周辺情報を過不足なく扱える構成を採用しています。

- サイドバー: ノート階層や一覧への移動
- メイン: ノート本文
- 目次（TOC）: 現在のノート内の見出し移動

デスクトップでは 3 カラム、狭い画面では 2 カラムまたは 1 カラムへ段階的に縮退します。

### 2. Markdown ベースのノート管理

ノート本文は Markdown を基盤に管理します。  
加えて、通常の Markdown を超える表現も段階的に扱います。

- コードブロック
- 数式
- テーブル
- 引用
- 脚注
- 画像・メディア
- 対訳表示
- 楽譜表示

### 3. 検索と絞り込み

Pagefind を利用した全文検索を備えています。  
タグや語句を組み合わせて、ノートを絞り込めます。

### 4. テーマと可読性

ライト / ダークテーマに対応し、読書時の視認性と静かな画面印象を重視しています。

### 5. 長期保守性を意識した分離

Rouault では、見た目だけでなく、将来の修正容易性も重要視しています。

- UI コンポーネントの分離
- Markdown 変換系の責務整理
- router / search / content projection の境界整理
- browser / node / SSR / E2E / Storybook のテスト責務分離

---

## 目指していること

Rouault の設計では、次の原則を重視しています。

### 読書体験を優先する

操作の派手さよりも、本文に集中できることを優先します。

### 予測可能であること

UI の振る舞いは一貫して理解できるべきであり、意外性よりも安定性を重視します。

### アクセシビリティを損なわないこと

キーボード操作、見出し構造、コントラスト、ランドマークなど、基本的なアクセシビリティ要件を保ちます。

### Markdown を中心に据えること

コンテンツは長期的に扱えるプレーンな資産として保持し、表示側の都合で本文資産を壊さない方針を取ります。

### 長期保守性を優先すること

暫定的な実装を積み重ねるのではなく、責務境界を明確にし、拡張時に破綻しにくい構成を目指します。

---

## 技術スタック

| 区分             | 採用技術                                          |
| ---------------- | ------------------------------------------------- |
| SSG              | Eleventy                                          |
| UI               | Lit                                               |
| 言語             | TypeScript                                        |
| コンテンツ       | Markdown / Velite                                 |
| 検索             | Pagefind                                          |
| コードハイライト | Shiki                                             |
| アイコン         | Iconify / Lucide                                  |
| テスト           | Web Test Runner / Vitest / Storybook / Playwright |
| Lint / Format    | ESLint / Prettier                                 |

---

## クイックスタート

### 前提条件

- Node.js 22 以上
- pnpm

### セットアップ

```bash
pnpm install
```

### 開発サーバー起動

```bash
pnpm dev
```

### 主なコマンド

```bash
pnpm build              # 本番ビルド
pnpm test               # node + ssr + browser + storybook metadata
pnpm test:node          # pure logic / policy / parser / transform
pnpm test:browser       # custom element / shadow DOM / interaction
pnpm test:ssr           # SSR / build-time / CSS structure 契約
pnpm test:storybook     # Storybook metadata + smoke
pnpm test:e2e           # 実ページ統合の最終確認
pnpm storybook          # Storybook 起動
pnpm lint               # ESLint
pnpm lint:fix           # ESLint + Prettier による整形
```

---

## ディレクトリ構成

> 生成物・依存ディレクトリ（`dist/`、`.generated/`、`.velite/`、`node_modules/`、`playwright-report/`、`test-results/` など）は省略しています。

```text
.
├─ build/                    # build-time 専用処理（content / navigation / projections / search / ssr / remark / rehype）
├─ content/                  # ノート本文、frontmatter、関連アセット
├─ docs/                     # 詳細仕様・設計文書
├─ examples/                 # 記法例、マニフェスト例、補助メディア
├─ scripts/                  # 開発・ビルド補助スクリプト
├─ shared/                   # build-time / runtime で共有するドメインロジック
├─ src/                      # アプリケーション本体
│  ├─ assets/                # CSS、画像、動画、その他静的資産
│  ├─ client/                # hydration / post-hydrate
│  ├─ components/            # 画面・UI コンポーネント
│  ├─ controllers/           # controller 層
│  ├─ data/                  # page projection / data shaping
│  ├─ icons/                 # アイコン登録
│  ├─ layout/                # layout 補助ロジック
│  ├─ layouts/               # Eleventy レイアウト
│  ├─ router/                # router 本体
│  ├─ search/                # search 本体
│  ├─ stories/               # Storybook 用 story
│  ├─ styles/                # スタイルと契約
│  ├─ testing/               # テスト補助コード
│  ├─ theme/                 # テーマ管理
│  ├─ toc/                   # TOC 関連
│  └─ types/                 # src 配下の型
├─ test/                     # node / browser / ssr / storybook / e2e
├─ types/                    # グローバル型定義、raw module 宣言
├─ eleventy.config.ts        # Eleventy 設定
├─ playwright.config.ts      # Playwright 設定
├─ velite.config.ts          # Velite 設定
├─ vite.client.config.ts     # client bundle 設定
├─ vitest.config.ts          # Vitest 設定
├─ web-test-runner.config.mjs# browser test 設定
└─ package.json
```

---

## いま何があるか

現時点の Rouault では、主に次の領域を実装・整備しています。

- Eleventy を基盤とした静的サイト生成
- Lit コンポーネントによる UI 構築
- 検索機能の統合
- SSR / hydration 経路の整備
- Markdown 表示基盤の整備
- デザインシステム文書化
- browser / node / SSR / Storybook のテスト分離
- router / search / markdown まわりの責務整理

一方で、次のような領域は継続的に整理・拡張中です。

- Markdown 変換系の契約整理
- 対訳表示の仕様明確化
- 特殊コンテンツ表現の責務分離
- UI コンポーネント群の正規化
- 読書用レイアウトの細部調整
- 長期保守性を前提とした構造再編

---

## ドキュメント案内

詳細は README ではなく、`docs/` 以下を参照してください。ドキュメントも全てを反映できておらず未整理の状態です。適宜修正を加えます。

### 全体設計・基盤

- `docs/content-config-syntax.md`
  コンテンツ設定と構文の基本仕様
- `docs/corpus-specification.md`
  corpus 周辺の仕様
- `docs/router-specification.md`
  ルーター設計と URL 状態モデル
- `docs/search-specification.md`
  検索仕様
- `docs/testing-taxonomy.md`
  テスト責務の整理
- `docs/notes_sidebar_breadcrumb_contract.md`
  ノート / サイドバー / パンくずの契約

### Markdown 関連

- `docs/markdown/markdown-overview.md`
- `docs/markdown/markdown-authoring-specification.md`
- `docs/markdown/note-authoring-guide.md`
- `docs/markdown/markdown-output-contract.md`
- `docs/markdown/markdown-safety-and-test-policy.md`

### デザインシステム

- `docs/design-system/foundations.md`
- `docs/design-system/accessibility.md`
- `docs/design-system/patterns.md`
- `docs/design-system/components/`

---

## 開発上の考え方

Rouault は、機能をただ追加するのではなく、**境界を壊さずに育てること** を重視しています。
そのため、実装時には次の観点を重要視します。

- 表示上の都合をコンテンツ資産へ逆流させない
- router / search / markdown / data projection の責務を混在させない
- コンポーネントの見た目と契約を分離する
- 一時的な回避策を恒久仕様にしない
- 「いま動く」だけでなく「後で壊れにくい」ことを優先する

---

## この README の位置づけ

この README は、次の読者を想定しています。

- 初めてプロジェクトを見る人
- 実装に入る前に全体像を知りたい人
- どこから読めばよいかを把握したい人

そのため、詳細仕様や完了条件、未解決論点の精査は README ではなく `docs/` 側に寄せています。

---

## ライセンス

現時点では整理中です。
