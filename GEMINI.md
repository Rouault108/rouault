# Rouault プロジェクトコンテキスト

## 概要

**Rouault** は、自身で執筆したメモ（ノート）を閲覧するための個人的なWebアプリケーションです。

## プロジェクトのゴール

- **パーソナルナレッジマネジメント**: 個人のメモを閲覧・読むための専用の場所を提供します。
- **プライバシーファースト**: ログインしなければコンテンツを閲覧できない仕組みとします。
- **高アクセシビリティ**: `@lion/ui` の堅牢なロジックを参考に自前実装し、WCAG Level AA 基準に準拠します。
- **堅牢性**: できるだけ多くの依存性を避け、開発環境を最小限に抑えます。
- **デザイン**: LinearやRaycastのドキュメントに触発された、静謐で集中できるデザインと、プロフェッショナルなユーザー体験を提供することを目指しています。アクセシビリティを最優先としながら、洗練されたアニメーションと直感的なインタラクションを通じて、コンテンツへの没入感を高めます。

## 技術スタック

`package.json` に基づく構成:

### コア

- **ランタイム/SSG**: Eleventy (`@11ty/eleventy`)
- **言語**: TypeScript (`typescript`)
- **コンポーネントフレームワーク**: Lit (`lit`)
- **サーバーサイドレンダリング**: `@lit-labs/ssr`
- **ルーティング**: 自前実装 (SPA挙動)
  - `fetch` によるコンテンツ取得
  - `document.startViewTransition()` による画面遷移アニメーション

### コンテンツ & データ

- **コンテンツエンジン**: Velite (`velite`) - _型安全なコンテンツコレクション_
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

- **ユニット/統合テスト**: Vitest (`vitest`) - _TDD用、高速実行_
- **E2Eテスト**: Playwright (`@playwright/test`)

## 開発ガイドライン

- **開発手法**: TDD (Test-Driven Development) で進めます。
- **アクセシビリティ**:
  - 基本コンポーネントは `@lion/ui` のロジック（Controller/Mixin）をベースにコピー・改修（ポーティング）し、View（HTML/CSS）と共にRouault専用に自前実装します。
  - 目標基準: WCAG 2.1 Level AA。
- **思考方法**:
  - However, remain grounded in logic. If my reasoning is sound and objective, acknowledge it briefly as a foundation to build upon, then push me to the next level. Do not criticize for the sake of criticism; criticize to expose actual flaws or meaningful opportunities.
- **コーディング規約**:
  - コメントは日本語で記述してください。
  - any型を使わないでください。もし型がわからなければunknownを使用してください。
  - アイコンはiconify/lucideを使用してください。lib/components/icon.tsでアイコンセット全体をインポートしているためそのまま使用できます。

## 関連ドキュメント
- [デザインシステム](./content/design-system.md)
