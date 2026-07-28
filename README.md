# Rouault

Rouaultは個人的なノートを静かに読むためのWebアプリケーションです。  
一般的なドキュメントサイトやナレッジベースではなく、Markdownで蓄積した内容を**落ち着いて通読すること**を優先して設計しています。

現行実装は、Eleventyによる静的生成を基盤とし、semanticな静的HTMLをbaselineに、build-time SSR、必要箇所に限定したLitによるclient hydration、Pagefindによる検索、VeliteとMarkdown変換パイプラインによるコンテンツ管理を組み合わせています。

## このリポジトリの正本

READMEはリポジトリ全体の入口文書です。  
機能契約は`docs/contracts/`を正本とします。  
Design System契約は`docs/design-system/`を正本とします。  
文書体系と現行文書の完全な一覧は`docs/README.md`を参照してください。  
型・詳細schema・詳細表・棚卸しは`docs/references/`を参照してください。  
執筆・実装・運用案内は`docs/guides/`を参照してください。  
設計判断の経緯は`docs/adr/`を参照してください。  
`docs/old/`と`docs/temporary/`は現行契約の正本ではありません。

## 何を目指すプロダクトか

Rouaultは次を中核とする個人向け読書アプリです。

- Markdownノートを静かに通読できること
- サイドバーとTOCから文書内外を移動できること
- Pagefindで全文検索できること
- no-JSでも情報構造と主要導線が成立すること
- 必要な対話部分だけを段階的にenhanceすること

個別機能の仕様や表現形式はREADMEへ逐次列挙せず、対応する`docs/contracts/`、`docs/design-system/`、`docs/guides/`を正本とします。

## 技術スタック

- SSG: Eleventy
- UI: semanticな静的HTMLをbaselineとし、必要な対話部分にLitを使用
- 言語: TypeScript
- ビルド時SSR: `@lit-labs/ssr`
- コンテンツ処理: Velite + Markdown変換パイプライン
- 検索: Pagefind
- コードハイライト: Shiki
- 数式: KaTeX
- テスト: Vitest（Node / SSR / Browser Mode）/ Playwright / Storybook

## 現行構成

```text
.
├─ .github/                   # CI、release、repository automation
├─ .storybook/                # Storybook設定
├─ build/                     # build-time専用処理: content / navigation / projections / search / ssr / remark / rehype
├─ content/                   # ノート本文、frontmatter、関連アセット
├─ docs/                      # 契約、Design System、guide、ADR、reference
├─ examples/                  # authoring / media / manifestの例示資産
├─ external-action-snapshots/ # 外部GitHub Action bindingの監査用snapshot
├─ scripts/                   # codegen、build、CI、content同期、deployment補助
├─ shared/                    # build-time / runtime共有ドメインロジック
├─ src/                       # テンプレート、router、client、components、layout、search、theme
├─ test/                      # node / browser / ssr / e2e / storybook
├─ tools/                     # ui-checkなどの開発ツール
├─ types/                     # repository-wideな型補助
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

クライアント / アプリ入口:

- `src/client.ts`
- `src/router/router.ts`
- `src/search/search-core.ts`

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
pnpm build:production       # production条件と成果物assertionを含むビルド入口
pnpm build:client           # client bundleのみ生成
pnpm build:images           # 画像生成

pnpm ui:check               # UI確認用sandboxを起動
pnpm ui:screenshot          # UI確認用screenshotを生成・検証
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
pnpm lint:fix               # ESLint auto-fix + Prettier write
pnpm format                 # Prettier write
pnpm typecheck              # app + nodeの型チェック
pnpm validate:note-links    # note source link validation
pnpm check                  # lint + typecheck + test + note link検証 + production/search import boundary検証
pnpm verify                 # check + link contract acceptance + test:extended

pnpm notes:stamp-updated    # noteのupdated metadataを更新
pnpm sync:link-cards        # link card metadataを同期
```

`package.json`の`scripts`をコマンド構成の正本とします。

## ビルドの流れ

通常ビルドは概ね次の順で進みます。

1. client bundleを生成する
2. 画像生成を行う
3. Eleventyで静的ページを生成する
4. Lit SSRを適用する
5. navigation artifactを出力する
6. search artifactを出力する
7. Pagefind indexを生成する

production条件つきのビルド入口は`pnpm build:production`です。通常ビルドに加えて、production向け環境を設定し、生成後にCSS、font、site URL、HTML、search artifactのassertionを実行します。

production buildの人間向け診断ラベルは、実装上、次の優先順位で解決されます。

1. 明示された`ROUAULT_BUILD_LABEL`
2. `GITHUB_SHA`の先頭7文字
3. どちらもない場合は`production local`

したがって、ローカル実行時の`ROUAULT_BUILD_LABEL`指定は必須ではありません。特定の由来を明示したい場合は、PowerShellで次のように指定できます。

```powershell
$env:ROUAULT_BUILD_LABEL = git rev-parse --short HEAD
pnpm build:production
Remove-Item Env:ROUAULT_BUILD_LABEL
```

deployment全体の手順は`docs/guides/operations/deployment.md`を参照してください。build labelの解決順序については、`scripts/run-production-build.ts`を実装事実の正本とします。

## テスト方針

Rouaultは**何を保証するか**でテストの置き場を分けています。

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

詳細は`docs/contracts/testing-taxonomy.md`を参照してください。
Browser runner、browser selection、fixture lifecycleを含むtesting harnessのowner境界も同Contractを正本とします。

## 現在の設計上の要点

- semanticな静的HTMLとno-JS baselineを先に成立させ、Litは必要な対話部分に限定します
- routerの正規入力は`NavigationEnvelope`です
- hydration triggerの正本はscheduler / registryです
- sidebarはserver-first navigationを前提にし、light DOMのnav subtreeを正本とします
- URLは共有可能で再構成可能な状態だけを担います
- Storybookは仕様決定の場ではなく、docs / visual catalog / smokeに限定します

## 文書体系

- `docs/README.md`: 文書分類、正本ルール、現行文書の完全な一覧
- `docs/contracts/`: 機能契約の正本。個別Contractの完全な一覧は`docs/README.md`を参照
- `docs/design-system/`: Design System契約
- `docs/references/`: 型、詳細schema、詳細表、棚卸し
- `docs/guides/`: 執筆・実装・運用案内
- `docs/architecture/`: 現行architecture snapshot
- `docs/adr/`: 設計判断の経緯
- `docs/old/` / `docs/temporary/`: 現行契約ではない履歴資料

READMEでは個別機能やContractの完全な一覧を重複管理しません。現行の文書目録は`docs/README.md`を正本とします。

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
