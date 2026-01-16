# Rouault

自身で執筆したメモ（ノート）を閲覧するための個人的なWebアプリケーション。

## プロジェクト構造

```plaintext
Rouault/
├── content/                # ユーザーのメモ（Markdown）の置き場所（Veliteの参照先）
│   └── notes/              # 実際のメモファイル群
├── src/                    # アプリケーションのソースコード
│   ├── assets/             # 静的アセット
│   │   ├── css/            # CSS (main.css, tokens.css)
│   │   └── images/
│   ├── components/         # Litコンポーネント (Atom/Molecule/Organism)
│   │   └── ui/             # Lionをラップした基本UIパーツ
│   ├── layouts/            # 11tyレイアウト (Base, Page, Note)
│   ├── pages/              # 11tyページテンプレート (ルーティング定義)
│   └── lib/                # ユーティリティ関数、カスタムルーターロジック
├── test/                   # テスト関連
│   ├── e2e/                # Playwright テスト
│   └── setup/              # テストセットアップ設定
├── dist/ (or _site)        # ビルド出力先（Git管理外）
├── .eleventy.base.ts       # 11ty設定（TSで記述）
├── velite.config.ts        # Velite設定
├── vitest.config.ts        # Vitest設定
└── playwright.config.ts    # Playwright設定
```