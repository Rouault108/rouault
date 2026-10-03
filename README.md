# Rouault

Rouaultは個人的なノートを静かに読むためのWebアプリケーションです。  
一般的なドキュメントサイトやナレッジベースではなく、Markdownで蓄積した内容を**落ち着いて通読すること**を優先して設計しています。

現行実装は、Eleventyによる静的生成を基盤とし、文書の意味構造を表す静的HTMLと、必要な箇所だけに操作機能を加える軽量なJavaScript処理（plain enhancer）、MiniSearchとSuzumeを使うWorker検索、VeliteとMarkdown変換パイプラインによるコンテンツ管理を組み合わせています。

## このリポジトリの正本

READMEはリポジトリ全体の入口文書です。  
実装事実は`package.json`、設定、実装、テストを、作業規約は[AGENTS.md](AGENTS.md)を参照してください。\
機能契約は`docs/contracts/`を正本とします。  
デザインシステムの契約は`docs/design-system/`を正本とします。\
文書体系と現行文書の完全な一覧は[docs/README.md](docs/README.md)を参照してください。\
型・詳細スキーマ・詳細表・棚卸しは`docs/references/`を参照してください。\
執筆・実装・運用案内は`docs/guides/`を参照してください。  
設計判断の経緯は`docs/adr/`を参照してください。  
`docs/old/`と`docs/temporary/`は現行契約の正本ではありません。

## 何を目指すプロダクトか

Rouaultは次を中核とする個人向け読書アプリです。

- Markdownノートを静かに通読できること
- サイドバーと目次（TOC）から文書内外を移動できること
- MiniSearch / SuzumeによるWorker検索で全文検索できること
- JavaScriptが無効でも情報構造と主要導線が成立すること
- 必要な対話部分だけに段階的に機能を追加すること

JavaScriptなしで保証する基本機能（no-JS baseline）は、本文、静的な情報構造、通常リンクによる主要導線を対象とします。検索・動的なフィルタ処理にはJavaScriptが必要です。
Catalog fallbackは、JavaScriptの実行中に字句検索（lexical / Worker検索）が失敗した場合に、Catalog検索へ切り替える障害時の経路です。

個別機能の仕様や表現形式はREADMEへ逐次列挙せず、対応する`docs/contracts/`、`docs/design-system/`、`docs/guides/`を正本とします。

## 技術スタック

- 静的サイト生成（SSG）: Eleventy
- UI: 文書の意味構造を表す静的HTMLを基本とし、必要な対話部分にplain enhancerを使用
- 言語: TypeScript
- ビルド時SSR: Eleventyと、ノートを標準のHTML要素へ変換する処理（native note lowering）
- コンテンツ処理: Velite + Markdown変換パイプライン
- 検索: MiniSearch / Suzume（Worker）、障害時のみCatalog fallback
- コードハイライト: Shiki
- 数式: KaTeX
- テスト: Vitest（Node / SSR / Browser Mode）/ Playwright

## 現行構成

```text
.
├─ .github/                   # CI、リリース、リポジトリ運用の自動化
├─ build/                     # ビルド時専用処理: コンテンツ、ナビゲーション、データ投影、検索、remark / rehypeなど
├─ content/                   # ノート本文、メタデータ（frontmatter）、関連アセット
├─ docs/                      # 契約、デザインシステム、ガイド、設計判断記録（ADR）、参照資料
├─ examples/                  # 執筆、メディア、マニフェストの例
├─ external-action-snapshots/ # 外部GitHub Actionの参照設定を監査するための記録
├─ scripts/                   # コード生成、ビルド、CI、コンテンツ同期、デプロイ補助
├─ shared/                    # ビルド時と実行時で共有するドメインロジック
├─ src/                       # テンプレート、ルーター、クライアント、部品、レイアウト、検索、テーマ
├─ test/                      # node / browser / ssr / e2e
├─ tools/                     # ui-checkなどの開発ツール
├─ types/                     # リポジトリ全体で使う型の補助
└─ package.json
```

## 代表的な入口

ページ生成入口:

- `src/index.11ty.ts`
- `src/notes.11ty.ts`
- `src/search.11ty.ts`
- `src/about.11ty.ts`
- `src/corpora.11ty.ts`
- `src/corpora-index.11ty.ts`
- `src/tags.11ty.ts`
- `src/404.11ty.ts`

ビルド時の処理入口:

- `eleventy.config.ts`: 静的ページ生成と開発サーバーの設定
- `velite.config.ts`: コンテンツのスキーマとMarkdown変換パイプライン
- `build/rehype/native-note-lowering.ts`: ノートのUIを標準のHTML要素による静的HTMLへ変換するビルド時の処理

クライアント / アプリ入口:

- `src/client.ts`
- `src/router/router.ts`
- `src/search/search-core.ts`
- `src/client/hydration/scheduler.ts` / `src/client/hydration/registry.ts`: enhancerと、引き続き使用しているLit非依存のカスタム要素の起動管理
- `src/client/post-hydrate/`: 操作への応答を担うplain enhancer群

## 開発環境

### 必要条件

- Node.js 24.x
- pnpm 11.x

`.node-version`、`package.json`の`engines`、`packageManager`を基準にしています。

### セットアップ

```powershell
pnpm install
```

### 開発サーバー

```powershell
pnpm dev
```

## よく使うコマンド

```powershell
pnpm build                  # 通常ビルド
pnpm build:production       # 本番条件のビルドと成果物の検証（要 ROUAULT_SITE_ORIGIN）
pnpm build:client           # クライアント用の配信ファイルのみ生成
pnpm build:images           # 画像生成

pnpm ui:check               # UI確認用のサンドボックスを起動
pnpm ui:screenshot          # UI確認用のスクリーンショットを生成・検証

pnpm test:node              # 純粋ロジック / ポリシー / パーサー / データ投影の補助処理
pnpm test:browser           # plain enhancer / Lit非依存のカスタム要素の、ブラウザーで観測できる動作契約
pnpm test:ssr               # ビルド時の処理 / 最終DOM / 静的成果物 / CSS構造
pnpm test:e2e               # アプリの共通枠 / JavaScriptなしの基本機能 / ルーター / 検索 / 主要導線
pnpm test                   # test:node + test:ssr + test:browser
pnpm test:extended          # e2e:production + e2e:dev

pnpm lint                   # ESLint
pnpm lint:fix               # ESLintの自動修正 + Prettierによる整形・書き込み
pnpm format                 # Prettierによる整形・書き込み
pnpm typecheck              # アプリとNode.js用コードの型チェック
pnpm validate:note-links    # ノート原稿内のリンク検証
pnpm check                  # lint + typecheck + test + ノートのリンク検証 + 本番コード・検索のインポート境界検証
pnpm verify                 # check + リンク契約の受け入れ検証 + test:extended

pnpm notes:stamp-updated    # ノートの更新日時（updated）を更新
pnpm sync:link-cards        # リンクカードのメタデータを同期
```

`package.json`の`scripts`をコマンド構成の正本とします。

## ビルドの流れ

通常ビルドは概ね次の順で進みます。

1. クライアント用の配信ファイルを生成する
2. 画像生成を行う
3. Eleventyで静的ページを生成する
4. ナビゲーション用の成果物を出力する
5. 検索用の成果物を出力する

本番条件でのビルド入口は`pnpm build:production`です。`dist/`を再生成し、本番向けの環境で通常ビルドを実行して、生成後にCSS、フォント、サイトURL、HTML、検索用の成果物の検証を実行します。

- `ROUAULT_SITE_ORIGIN`は必須です。公開先の`http:`または`https:`の絶対オリジンを指定し、認証情報、クエリ、フラグメント、`/`以外のパスを含めないでください。
- `ROUAULT_BASE_PATH`は任意です。ルート配信では未設定または空文字、サブパス配信では実際の配信パスを使います。
- `ROUAULT_BUILD_LABEL`は任意です。

本番ビルドの人間向け診断ラベルは、実装上、次の優先順位で解決されます。

1. 明示された`ROUAULT_BUILD_LABEL`
2. `GITHUB_SHA`の先頭7文字
3. どちらもない場合は`production local`

PowerShellでは、必須のオリジンと任意のラベルを次のように指定できます。`https://example.com`は実際の公開先オリジンへ置き換えてください。この例は`ROUAULT_BASE_PATH`の既存値を変更しません。

```powershell
# https://example.com は例です。実際の公開先オリジンへ置き換えてください。
$previousSiteOrigin = $env:ROUAULT_SITE_ORIGIN
$previousBuildLabel = $env:ROUAULT_BUILD_LABEL
try {
    $env:ROUAULT_SITE_ORIGIN = 'https://example.com'
    # 任意: 成果物の由来を明示したい場合だけ指定します。
    $env:ROUAULT_BUILD_LABEL = git rev-parse --short HEAD
    pnpm build:production
} finally {
    $env:ROUAULT_SITE_ORIGIN = $previousSiteOrigin
    $env:ROUAULT_BUILD_LABEL = $previousBuildLabel
}
```

デプロイ全体の手順は`docs/guides/operations/deployment.md`を参照してください。ビルドラベルの解決順序については、`scripts/run-production-build.ts`を実装事実の正本とします。

## テスト方針

Rouaultは**何を保証するか**でテストの置き場を分けています。

- `test/node/`
  - 純粋ロジック
  - 正規化
  - URL・パス・ルーターのポリシー
  - パーサーの補助処理
  - 実際のブラウザーを必要としない補助処理

- `test/browser/`
  - plain enhancerとLit非依存のカスタム要素の公開DOM契約
  - Shadow DOM
  - キーボード / ポインター / フォーカス
  - ARIA / 状態遷移

- `test/ssr/`
  - Markdown / rehype / remark / ビルド時の変換
  - ノートの最終DOM契約
  - データ投影 / シリアライズ
  - ハイドレーションの予算（hydration budget）
  - 静的成果物の構造
  - CSS構造の契約

- `test/e2e/`
  - アプリの共通枠との統合
  - JavaScriptなしで保証する基本機能
  - ルーター / 履歴 / 検索
  - ノートの読書フロー
  - 主要UXの最終確認

詳細は`docs/contracts/testing-taxonomy.md`を参照してください。
ブラウザーテストの実行基盤、使用ブラウザーの選択、テスト用データ・DOMの準備と後片付けを含む、テスト基盤の責務境界も同契約を正本とします。

## 現在の設計上の要点

- 文書の意味構造を表す静的HTMLとJavaScriptなしの基本機能を先に成立させ、plain enhancerは必要な対話部分に限定します
- ルーターの正規入力は`NavigationEnvelope`です
- ハイドレーションの起動条件はscheduler / registryが管理します
- サイドバーはサーバーが生成したナビゲーションを基本とし、通常のDOM（light DOM）内のnav部分木を正本とします
- URLは共有可能で再構成可能な状態だけを担います

## 文書体系

- [docs/README.md](docs/README.md): 文書分類、正本ルール、現行文書の完全な一覧
- [docs/workflows/README.md](docs/workflows/README.md): 判断・計画・限定実装・精査の共通入口
- `docs/contracts/`: 機能契約の正本。個別契約の完全な一覧は[docs/README.md](docs/README.md)を参照
- `docs/design-system/`: デザインシステムの契約
- `docs/references/`: 型、詳細スキーマ、詳細表、棚卸し
- `docs/guides/`: 執筆・実装・運用案内
- `docs/architecture/`: 現在のアーキテクチャの記録
- `docs/adr/`: 設計判断の経緯
- `docs/old/` / `docs/temporary/`: 現行契約ではない履歴資料

READMEでは個別機能や契約の完全な一覧を重複管理しません。現行の文書目録は[docs/README.md](docs/README.md)を正本とします。

## 開発原則

- 本文の読みやすさを最優先する
- 表示都合をコンテンツ資産へ逆流させない
- ルーター / 検索 / Markdown変換 / データ投影 / レイアウトの責務を混在させない
- 静的成果物を正本とする原則（static-first）を崩さない
- 一時的な回避策を恒久仕様にしない

## ライセンス

当サイトの文章は特記がない限り、Creative Commons Attribution 4.0 International License（CC BY 4.0）のもとで利用を許諾します。

ただし、引用部分、第三者著作物、外部サイトのスクリーンショット、ロゴ・商標、埋め込みコンテンツその他個別注記のある素材は、各権利者に権利が帰属し、上記CC BY 4.0の対象外です。

個別の注記がある場合は、当該注記を優先します。
