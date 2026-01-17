# Rouault プロジェクトコンテキスト

## 概要
**Rouault** は、自身で執筆したメモ（ノート）を閲覧するための個人的なWebアプリケーションです。
プライバシーを確保するため、コンテンツへのアクセスにはログイン（アカウント認証）を必須とします。

## プロジェクトのゴール
- **パーソナルナレッジマネジメント**: 個人のメモを閲覧・読むための専用の場所を提供します。
- **プライバシーファースト**: ログインしなければコンテンツを閲覧できない仕組みとします。
- **高アクセシビリティ**: `@lion/ui` のデフォルトを活用し、WCAG Level AA 基準に準拠します。

## 技術スタック
`package.json` に基づく構成:

### コア
- **ランタイム/SSG**: Eleventy (`@11ty/eleventy`)
- **言語**: TypeScript (`typescript`)
- **コンポーネントフレームワーク**: Lit (`lit`)
- **コンポーネントライブラリ**: Lion (`@lion/ui`) - *アクセシビリティ重視*
- **サーバーサイドレンダリング**: `@lit-labs/ssr`
- **ルーティング**: 自前実装 (SPA挙動)
  - `fetch` によるコンテンツ取得
  - `document.startViewTransition()` による画面遷移アニメーション

### コンテンツ & データ
- **コンテンツエンジン**: Velite (`velite`) - *型安全なコンテンツコレクション*
- **データソース**: Markdownファイル
- **検索**: Pagefind (`pagefind`)
- **シンタックスハイライト**: PrismJS (`prismjs`)
- **Markdown処理**: 
  - `remark-gfm` (GitHub Flavored Markdown)
  - `remark-math` & `rehype-katex` (数式サポート)
  - `remark-emoji` (絵文字)
  - `remark-supersub` (上付き・下付き文字)

### ツール
- **リンター/フォーマッター**: Biome (`@biomejs/biome`)
- **コンパイラ**: esbuild (`esbuild`)
- **UI開発**: Storybook (`storybook`)

### インフラストラクチャ
- **ホスティング**: Cloudflare Pages
- **認証**: Cloudflare Access (Zero Trust)
    - アプリケーション外（エッジ）で認証を行うため、実装コストを最小化。

### テスト
- **ユニット/統合テスト**: Vitest (`vitest`) - *TDD用、高速実行*
- **E2Eテスト**: Playwright (`@playwright/test`)

## 開発ガイドライン
- **開発手法**: TDD (Test-Driven Development) で進めます。
- **アクセシビリティ**: 
  - 基本コンポーネントに `@lion/ui` を使用します。
  - 目標基準: WCAG 2.1 Level AA。