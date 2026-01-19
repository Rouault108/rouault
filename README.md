# Rouault

自身の執筆したメモ（ノート/コンテンツ）を閲覧するための、プライバシー重視型パーソナルWebアプリケーション。
「閲覧」に特化しており、ログイン認証（Cloudflare Access）を前提としたセキュアな環境で、自身のナレッジベースにアクセスすることができます。

## 🚀 プロジェクトのゴール

- **パーソナルナレッジマネジメント**: コンテンツを読むことに集中できる、専用の場所を提供。
- **プライバシーファースト**: 認証なしではコンテンツにアクセスできない設計。
- **高アクセシビリティ**: WCAG 2.1 Level AA 準拠を目標とし、`@lion/ui` を採用。
- **堅牢性**: 依存関係を最小限に抑え、シンプルかつ堅牢なアーキテクチャを維持。

## 🛠 技術スタック

- **SSG / ランタイム**: [Eleventy](https://www.11ty.dev/)
- **コンポーネント**: [Lit](https://lit.dev/) + [@lion/ui](https://lion-web.netlify.app/)
- **言語**: TypeScript
- **コンテンツ管理**: [Velite](https://velite.js.org/) (Markdown/YamL)
- **検索**: [Pagefind](https://pagefind.app/)
- **ルーティング**: Custom Router (SPA + View Transitions API)
- **テスト**: [Web Test Runner](https://modern-web.dev/docs/test-runner/overview/) (Unit), [Playwright](https://playwright.dev/) (E2E)

## 📂 プロジェクト構造

```plaintext
Rouault/
├── content/                 # コンテンツソース (Markdown/MDX)
├── src/                     # アプリケーションソースコード
│   ├── assets/              # 静的アセット (CSS, Images)
│   ├── components/          # Webコンポーネント (Lit)
│   ├── layouts/             # Eleventyレイアウトテンプレート
│   ├── lib/                 # コアロジック (Router, ErrorHandlerなど)
│   ├── types/               # TypeScript型定義
│   └── client.ts            # クライアントサイドエントリーポイント
├── test/                    # テストコード
│   ├── e2e/                 # E2Eテスト (Playwright)
│   └── unit/                # ユニットテスト
├── dist/                    # ビルド出力先 (Git管理外)
├── eleventy.config.js       # Eleventy設定
├── eslint.config.js         # ESLint設定
├── playwright.config.ts     # Playwright設定
├── velite.config.ts         # Veliteコンテンツスキーマ設定
└── web-test-runner.config.mjs # ユニットテスト設定
```

## 💻 開発ガイド

### 前提条件

- Node.js (v22以上推奨)
- pnpm (パッケージマネージャ)

### セットアップ

```bash
pnpm install
```

### 開発サーバーの起動

Eleventyのサーバーを立ち上げ、変更を監視します。

```bash
pnpm dev
```

### ビルド

本番用のファイルを `dist` ディレクトリに出力します。Pagefindのインデックス生成も行われます。

```bash
pnpm build
```

### テスト

#### ユニットテスト

Web Test Runner を使用してブラウザベースのユニットテストを実行します。

```bash
pnpm test
```

#### E2Eテスト

Playwright を使用してE2Eテストを実行します。

```bash
pnpm test:e2e
```

### Lint & Format

コードの品質チェックとフォーマットを行います。

```bash
# リント実行
pnpm lint

# 自動修正とフォーマット
pnpm lint:fix
```

## 📝 アクセシビリティ

本プロジェクトは **WCAG 2.1 Level AA** への準拠を目指しています。
主要なUIコンポーネントには `@lion/ui` を使用し、スクリーンリーダー対応（aria-liveなど）やキーボードナビゲーションを考慮した実装を行っています。
