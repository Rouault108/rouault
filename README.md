# Rouault

Rouault は、個人的なノートを読むための静かな Web アプリケーションです。  
一般的なドキュメントサイトではなく、Markdown で蓄積した内容を「落ち着いて通読する」ことを優先して設計しています。

現行実装は、Eleventy を基盤とした静的生成、Lit による UI、build-time SSR、クライアント hydration、Markdown 中心のコンテンツ管理を組み合わせています。  
検索、テーマ切り替え、サイドバー、TOC、コード表示、画像、音楽、対訳などの表示面は、本文の読みやすさを損なわない範囲で整理しています。

仕様や設計判断は README ではなく `docs/` を正本とします。特にテスト責務は `docs/testing-taxonomy.md`、router は `docs/router-specification.md`、検索は `docs/search-specification.md` を参照してください。

## 何をしているか

Rouault は、次の用途を想定した個人向け読書アプリです。

- Markdown ノートの閲覧
- サイドバーと TOC を使ったノート内外の移動
- Pagefind を使った全文検索
- コード、画像、脚注、数式、音楽、対訳などの表現
- build-time SSR と hydration を前提にした静的配信

コンテンツは `content/` に置き、表示ロジックと変換ロジックは `build/`、共有ドメインロジックは `shared/`、UI は `src/` に分けています。

## 技術スタック

- SSG: Eleventy
- UI: Lit
- 言語: TypeScript
- コンテンツ処理: Velite + Markdown 変換パイプライン
- 検索: Pagefind
- コードハイライト: Shiki
- 数式: KaTeX
- テスト: Vitest / Web Test Runner / Playwright / Storybook

## 現行の構成

```text
.
├─ build/      # content / navigation / projection / search / SSR / remark / rehype
├─ content/    # ノート本文、frontmatter、関連アセット
├─ docs/       # 仕様、設計、契約、テスト方針
├─ shared/     # build-time と runtime で共有するドメインロジック
├─ src/        # アプリケーション本体、UI、controller、layout、client
├─ test/       # node / browser / ssr / storybook / e2e
├─ *.config.*  # Eleventy / Vite / Vitest / Playwright / Web Test Runner / ESLint など
└─ package.json
```

主な入口は次のとおりです。

- `src/index.11ty.ts`
- `src/notes.11ty.ts`
- `src/search.11ty.ts`
- `src/about.11ty.ts`
- `src/corpora.11ty.ts`
- `src/tags.11ty.ts`
- `src/client.ts`
- `src/router/router.ts`
- `src/search/search-core.ts`

## 開発環境

### 必要条件

- Node.js 24.x
- pnpm 10.x

`.node-version` と `package.json` の `engines` を基準にしています。

### セットアップ

```bash
pnpm install
```

### 開発サーバー

```bash
pnpm dev
```

### よく使うコマンド

```bash
pnpm build                  # 本番ビルド
pnpm build:production       # production 条件をまとめたビルド入口
pnpm build:client           # client bundle のみ生成
pnpm build:images           # 画像生成
pnpm storybook              # Storybook 起動
pnpm storybook:build        # Storybook 静的ビルド
pnpm test:node              # node 側の pure logic / policy / parser / transform
pnpm test:ssr               # SSR / build-time / static contract
pnpm test:browser           # browser contract
pnpm test:storybook         # Storybook metadata + smoke
pnpm test:e2e               # Playwright による統合確認
pnpm test                   # node + ssr + browser + storybook metadata
pnpm test:extended          # storybook smoke + e2e
pnpm check                  # lint + typecheck + test
pnpm ci                     # check + test:extended
pnpm lint                   # ESLint
pnpm lint:fix               # ESLint + Prettier
pnpm typecheck              # app + node の型チェック
```

## テスト方針

Rouault では、テストの置き場を責務で分けています。

- `test/node/`: pure logic、URL / path policy、parser helper、data shaping
- `test/browser/`: custom element、shadow DOM、focus、keyboard、pointer、public DOM contract
- `test/ssr/`: Markdown 変換、build-time contract、static artifact、CSS structure
- `test/e2e/`: app shell、no-JS baseline、router、search、主要導線
- `test/storybook/`: Storybook の metadata、import boundary、smoke

詳細は `docs/testing-taxonomy.md` を参照してください。

## ドキュメント

重要な参照先は次のとおりです。

- `docs/router-specification.md`
- `docs/search-specification.md`
- `docs/testing-taxonomy.md`
- `docs/notes_sidebar_breadcrumb_contract.md`
- `docs/content-config-syntax.md`
- `docs/corpus-specification.md`
- `docs/markdown/markdown-overview.md`
- `docs/markdown/markdown-authoring-specification.md`
- `docs/markdown/note-authoring-guide.md`
- `docs/markdown/markdown-output-contract.md`
- `docs/markdown/markdown-safety-and-test-policy.md`
- `docs/design-system/foundations.md`
- `docs/design-system/accessibility.md`
- `docs/design-system/patterns.md`
- `docs/design-system/components/`

## 開発の考え方

- 本文の読みやすさを優先する
- 表示上の都合をコンテンツ資産へ逆流させない
- router / search / markdown / projection の責務を混在させない
- 一時的な回避策を恒久仕様にしない
- まず静的に成立する HTML を優先し、必要な部分だけを hydration する

## ライセンス

ISC
