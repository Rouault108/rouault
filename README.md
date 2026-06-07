# Rouault

Rouaultは個人的なノートを静かに読むための Webアプリケーションです。  
一般的なドキュメントサイトやナレッジベースではなく、Markdownで蓄積した内容を**落ち着いて通読すること**を優先して設計しています。

現行実装は、Eleventyを基盤とする静的生成、LitによるUI、build-time SSR、client hydration、Pagefindによる検索、Markdown中心のコンテンツ管理を組み合わせています。

## このリポジトリの正本

READMEはリポジトリ全体の入口文書です。
機能契約は `docs/contracts/` を正本とします。
Design System 契約は `docs/design-system/` を正本とします。
文書体系の詳細は `docs/README.md` を参照してください。
型・詳細 schema・詳細表・棚卸しは `docs/references/` を参照してください。
執筆・実装・運用案内は `docs/guides/` を参照してください。
設計判断の経緯は `docs/adr/` を参照してください。
`docs/old/` と `docs/temporary/` は現行契約の正本ではありません。

## 何を目指すプロダクトか

Rouaultは次の用途を想定した個人向け読書アプリです。

- Markdownノートの閲覧
- サイドバーとTOCを使った移動
- Pagefindを使った全文検索
- コード、画像、脚注、数式、音楽、対訳などの表現
- no-JS baselineを保った静的配信
- 必要箇所に限定したhydration

## 技術スタック

- SSG: Eleventy
- UI: Lit
- 言語: TypeScript
- ビルド時 SSR: `@lit-labs/ssr`
- コンテンツ処理: Velite + Markdown変換パイプライン
- 検索: Pagefind
- コードハイライト: Shiki
- 数式: KaTeX
- テスト: Vitest / Web Test Runner / Playwright / Storybook

## 現行構成

```text
.
├─ build/      # build-time専用処理: content / navigation / projections / search / ssr / remark / rehype
├─ content/    # ノート本文、frontmatter、関連アセット
├─ docs/       # 仕様、契約、設計判断
├─ shared/     # build-time / runtime共有ドメインロジック
├─ src/        # テンプレート、router、client、components、layout、search、theme
├─ test/       # node / browser / ssr / e2e / storybook
├─ scripts/    # codegen、build補助、CI補助
└─ package.json
```

## 主な入口

ページ生成入口:

- `src/index.11ty.ts`
- `src/notes.11ty.ts`
- `src/search.11ty.ts`
- `src/about.11ty.ts`
- `src/corpora.11ty.ts`
- `src/corpora-index.11ty.ts`
- `src/tags.11ty.ts`
- `src/404.11ty.ts`

クライアント / アプリ入口:

- `src/client.ts`
- `src/router/router.ts`
- `src/search/search-core.ts`

## 開発環境

### 必要条件

- Node.js 24.x
- pnpm 11.x

`.node-version`と `package.json`の `engines`を基準にしています。

### セットアップ

```bash
pnpm install
```

### 開発サーバー

```bash
pnpm dev
```

## よく使うコマンド

```bash
pnpm build                  # 通常ビルド
pnpm build:production       # production条件をまとめたビルド入口
pnpm build:client           # client bundleのみ生成
pnpm build:images           # 画像生成

pnpm storybook              # Storybook起動
pnpm storybook:build        # Storybook静的ビルド

pnpm test:node              # pure logic / policy / parser / projection helper
pnpm test:browser           # custom element / shadow DOM / keyboard / pointer / focus
pnpm test:ssr               # build-time / final DOM / static artifact / CSS structure
pnpm test:e2e               # app shell / no-JS baseline / router / search / 主要導線
pnpm test:storybook:meta    # story metadata / import boundary
pnpm test:storybook:smoke   # Storybook smoke
pnpm test:storybook         # storybook:meta + storybook:smoke

pnpm test                   # test:node + test:ssr + test:browser + test:storybook:meta
pnpm test:extended          # storybook smoke + e2e:production + e2e:dev

pnpm lint                   # ESLint
pnpm lint:fix               # ESLint + Prettier
pnpm typecheck              # app + nodeの型チェック
pnpm check                  # lint + typecheck + test
pnpm verify                     # check + test:extended
```

## ビルドの流れ

通常ビルドは概ね次の順で進みます。

1. client bundleを生成する
2. 画像生成を行う
3. Eleventyで静的ページを生成する
4. Lit SSRの適用を行う
5. navigation artifactを出力する
6. Pagefind indexを生成する

production条件つきのビルド入口は `pnpm build:production`です。

`pnpm build:production` を直接実行する場合は、production build の由来を明示するため `ROUAULT_BUILD_LABEL` を指定してください。

```bash
ROUAULT_BUILD_LABEL="$(git rev-parse --short HEAD)" pnpm build:production
```

詳細は `docs/guides/operations/deployment.md` を参照してください。

## テスト方針

Rouaultは**何を保証するか** でテストの置き場を分けています。

- `test/node/`
  - pure logic
  - normalization
  - URL / path / router policy
  - parser helper
  - browser実体を必要としないhelper

- `test/browser/`
  - custom elementのpublic DOM contract
  - shadow DOM
  - keyboard / pointer / focus
  - aria / state transition
  - enhancer behavior

- `test/ssr/`
  - Markdown / rehype / remark / build-time transform
  - note final DOM contract
  - projection / serialization
  - hydration budget
  - static artifact shape
  - CSS structure contract

- `test/e2e/`
  - app shell integration
  - no-JS baseline
  - router / history / search
  - note読書フロー
  - 主要UXの最終確認

- `test/storybook/`
  - story metadata validation
  - import boundary
  - smoke allowlistの健全性確認

詳細は `docs/contracts/testing-taxonomy.md`を参照してください。

## 現在の設計上の要点

- routerの正規入力は `NavigationEnvelope`です
- hydration triggerの正本は scheduler / registryです
- sidebarは server-first navigationを前提にし、light DOMのnav subtreeを正本とします
- URLは共有可能で再構成可能な状態だけを担います
- Storybookは仕様決定の場ではなく、docs / visual catalog / smokeに限定します

## 文書体系

- `docs/README.md`: 文書分類と正本ルール
- `docs/contracts/`: router / router-document / navigation / hydration / sidebar / note-navigation / permanent-url / search / markdown / corpus / content-config / testing-taxonomy の機能契約
- `docs/design-system/`: Design System契約
- `docs/references/`: 型、詳細schema、詳細表、棚卸し
- `docs/guides/`: 執筆・実装・運用案内
- `docs/adr/`: 設計判断の経緯

## 開発原則

- 本文の読みやすさを最優先する
- 表示都合をコンテンツ資産へ逆流させない
- router / search / markdown / projection / layoutの責務を混在させない
- static-firstを崩さない
- 一時的な回避策を恒久仕様にしない
- Storybookを契約の主戦場にしない

## ライセンス

当サイトの文章は特記がない限り、Creative Commons Attribution 4.0 International License（CC BY 4.0）のもとで利用を許諾します。

ただし、引用部分、第三者著作物、外部サイトのスクリーンショット、ロゴ・商標、埋め込みコンテンツその他個別注記のある素材は、各権利者に権利が帰属し、上記CC BY 4.0の対象外です。

個別の注記がある場合は、当該注記を優先します。
