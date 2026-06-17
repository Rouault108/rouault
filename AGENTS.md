# AGENTS.md

## 位置づけ

この文書は、Rouault における **開発時の判断基準と作業規約** をまとめた運用文書です。READMEの再掲や詳細仕様書の代替ではありません。

- READMEは **初見者向けの入口文書** です。
- `docs/`は **仕様・契約・設計判断** の所在です。
- `package.json`、設定ファイル、テスト、実装コードは **現在の実装事実** の所在です。
- `temporary/`、`docs/old/`、`docs/temporary/`は、特に断りがない限り **履歴資料** として扱います。
- `dist/`、`.generated/`、`.velite/`、`content/_generated/`、`playwright-report/`、`test-results/`は生成物として扱い、実装判断の正本にしないでください。

README・AGENTS・実装の内容が衝突した場合は、次の優先順位で解釈してください。

1. 実行可能な設定と実装  
   （`package.json`、`*.config.*`、`build/`、`src/`、`shared/`、`content/`、`scripts/`、`types/`）
2. テストで明示された契約  
   （`test/node`、`test/browser`、`test/ssr`、`test/e2e`、`test/storybook`）
3. `docs/`の仕様文書
4. README
5. `temporary/`、`docs/old/`、`docs/temporary/`

---

## プロジェクト概要

**Rouault**は、個人的なノートを閲覧するための専用 Webアプリケーションです。  
主目的は、一般的なドキュメントサイトを作ることではなく、**「没入して読む」ことに適した静かなUIを構築すること** にあります。

現行実装は、Eleventyを基盤とする静的生成、Litによる UI、build-time SSR、client hydration、Markdownベースのノート管理、Pagefindによる検索を中核に構成されています。

Rouaultを実装・修正する際は、常に次の問いを優先してください。

- この変更は本文への集中を妨げないか。
- この変更は責務境界を壊さないか。
- この変更はコンテンツ資産を表示都合で汚染していないか。
- この変更は static-first / no-JS baselineを弱めていないか。
- この変更はアクセシビリティ契約を弱めていないか。

---

## プロジェクトの主要原則

### 1. 長期保守性優先

Rouaultでは、長期保守性、責務境界、static-first契約を、既存実装との互換性や最小差分より優先してください。

- 小さな差分で済ませるために、責務境界を曖昧にしないでください。
- 既存実装を温存するために、重複実装・暫定adapter・例外的分岐を恒久化しないでください。
- 変更が大きくなる場合でも、契約、テスト、文書が整合する設計を優先してください。
- ただし、方針外の変更、根拠のない削除、テスト回避、仕様不明な暫定対応は禁止します。

### 2. 読書体験優先

Rouaultは「読むための UI」です。  
装飾、動的挙動、強い存在感を持つインタラクションは、それが本文理解に寄与する場合に限って導入してください。

- 本文領域では、不要な枠線・色面・影・過剰なアニメーションを避けます。
- ナビゲーションや補助情報は、本文の主従関係を壊さない範囲で明確に表現します。
- UIの静けさ、予測可能性、可読性を、演出的な派手さより優先します。

### 3. コンテンツ資産優先

Markdownと関連メタデータは長期保持される資産です。  
表示都合を理由に、資産側へ一時的回避策を持ち込まないでください。

- 表示ロジックは変換層・投影層・UI層で吸収します。
- authoring 規約を増やす前に、既存のparser / transformer / adapterで解決できないかを検討します。
- 一時的な表現都合をfrontmatterや本文記法へ直書きして恒久化しないでください。

### 4. 責務境界優先

Rouaultは長期保守性のためにownership boundaryを重視します。  
特に次の境界を混在させないでください。

- `router`とview state
- `search`とUI state
- Markdown parser coreとoutput adapter
- content schemaとpage projection
- layout shellとfeature-specific component
- build-time contractとruntime fallback
- hydration planningとhydration trigger ownership

単に「動く」実装よりも、**どの層が何を所有するかが明確な実装** を優先します。

### 5. static-first 優先

現行のRouaultは、**SSG + build-time SSR + client hydration**を基本戦略とします。

- まず静的に成立するHTMLを優先してください。
- JSがなくても成立すべき情報構造を先に整えてください。
- インタラクティブ性が必要な箇所だけhydrationします。
- request-time SSRを前提にした設計へ安易に寄せないでください。

### 6. 依存追加抑制

依存はコストです。新規ライブラリ導入時は次を満たす場合に限って検討してください。

- 既存実装では保守負債が大きすぎる
- Web標準や既存依存では代替困難である
- 導入対象が長期的に保守されている
- 導入により責務境界が明確になる

単なる実装短縮のためだけに依存を増やさないでください。

---

## 現行アーキテクチャの大枠

### 基盤

- SSG: Eleventy
- UI: Lit
- 言語: TypeScript
- ビルド時 SSR: `@lit-labs/ssr`
- 検索: Pagefind
- コードハイライト: Shiki
- 数式: KaTeX
- コンテンツ処理: Velite + Markdown変換パイプライン
- テスト: Vitest / Web Test Runner / Playwright / Storybook

### 実行環境

- Node.js: 24.x
- pnpm: 10.x
- package manager: `pnpm@10.33.0`

`.node-version`、`package.json` の `engines`、`packageManager` を基準にしてください。

### シェル / OS 前提

Windowsネイティブ環境で作業する場合は、PowerShell構文を前提にしてください。WSL、Git Bash、POSIX shell、GNU coreutilsを使う前提でコマンドを組み立てないでください。

- 環境変数は `$env:NAME` を使ってください。
- ファイル検索は `Get-ChildItem`、テキスト検索は `Select-String` を優先してください。
- パスは空白・日本語を含む可能性を前提に、必ず適切に引用してください。
- `/tmp`、`/dev/null`、`chmod`、`rm -rf`、`grep`、`sed`、`awk`、`xargs` を暗黙に使わないでください。
- shell固有処理を書く前に、`pnpm` scriptsなどリポジトリに定義済みの入口を優先してください。

### 中心契約

#### router

- router coreの正規入力は `NavigationEnvelope`のみです。
- routerは URL正規化、文書取得、本文・shell・文書メタデータ・履歴stateのcommitに責務を限定します。
- shellの描画後後処理や各UIの一時状態をrouter coreに背負わせないでください。
- fetch経路とdocument routeの差はloader / envelope側へ閉じ込めてください。

#### hydration

- hydration triggerの正本はscheduler / registryです。
- componentがconnected時にhydration timingを自己決定してはいけません。
- route由来の `hydrationPlan` はplanning情報であり、triggerの正本ではありません。

#### sidebar

- note sidebarはserver-first navigationを前提とします。
- sidebar の正本は`layout-sidebar`のlight DOMにあるnav subtreeです。
- presentation stateとtree stateは分離してください。
- app shell上のsidebar hostは1実体だけに保ってください。
- `layout-sidebar-surface` はoverlay表示のsurfaceであり、state ownerにしないでください。

#### permanent URL

- Permanent URL と `/archives/{hash}` の契約は `docs/contracts/permanent-url.md` を正本にしてください。
- hash生成規則をUI都合で変えないでください。
- note navigation、search、Markdown出力がPermanent URLへ依存する場合は、それぞれの契約文書との整合を確認してください。

### 主なコード配置

- `build/` : build-time専用処理。content / navigation / projections / search / ssr / remark / rehype
- `content/` : ノート本文、frontmatter、関連アセット
- `examples/` : authoring / media / manifest 用の例示資産
- `shared/` : build-time / runtime共有ドメインロジック
- `shared/navigation/` : `NavigationEnvelope` などbuild-time / runtime共有のnavigation契約
- `shared/search/` : 検索データモデルなど共有検索ロジック
- `src/components/` : UIコンポーネント
- `src/router/` : router core、navigation commit、head / history / route coordination
- `src/search/` : 検索 core、ranking、source adapter、bootstrap、navigation、diagnostics、snippet整形
- `src/client/` : hydration scheduler / registry / post-hydrate coordination
- `src/layout/` / `src/layouts/` : layout-level helper と Eleventy layout / page shell
- `src/data/` : page projection / data shaping
- `src/article-header/` : article header の共有契約
- `src/icons/` / `src/generated/` : icon登録と生成済みicon subset
- `src/theme/` : テーマ切替と状態
- `src/toc/` : TOC 公開入口
- `src/assets/` / `src/styles/` : CSS、静的UI資産、design token利用箇所
- `src/testing/` / `src/stories/` : テスト・Storybook補助
- `test/` : node / browser / ssr / e2e / storybook
- `scripts/` : codegen、build補助、CI補助、content同期補助
- `docs/` : 契約・仕様・設計資料

### 優先して参照すべき文書

- `docs/README.md`
- `docs/contracts/router.md`
- `docs/contracts/router-document.md`
- `docs/contracts/navigation-envelope.md`
- `docs/contracts/hydration.md`
- `docs/contracts/sidebar-state.md`
- `docs/contracts/note-navigation.md`
- `docs/contracts/permanent-url.md`
- `docs/contracts/search.md`
- `docs/contracts/markdown.md`
- `docs/contracts/corpus.md`
- `docs/contracts/content-config.md`
- `docs/contracts/testing-taxonomy.md`
- `docs/references/navigation-envelope-schema.md`
- `docs/references/search-data-model.md`
- `docs/references/search-ranking-and-diagnostics.md`
- `docs/references/markdown-output.md`
- `docs/references/compatibility.md`
- `docs/guides/markdown-authoring.md`
- `docs/guides/note-authoring.md`
- `docs/guides/content-config.md`
- `docs/guides/corpus.md`
- `docs/guides/operations/`
- `docs/design-system/`
- `docs/architecture/shell-projection.md`

---

## 実装時の判断規則

### UI コンポーネント

- まずsemantic HTMLとa11y contract を定め、その後に見た目を載せてください。
- variantの追加でごまかす前に、責務分割の誤りを疑ってください。
- 一つのUIコンポーネントに、router・search・data shapingまで背負わせないでください。
- 読書用UIは、操作対象の明示と本文の静けさを両立させてください。

### router / URL / navigation

- URLは共有可能で再構成可能な状態だけを担うべきです。
- 一時的UI状態を、無秩序にURLや`history.state`に逃がさないでください。
- router層で吸収すべきことをcomponent側へ漏らさないでください。
- fetch経路とdocument routeの差はloader / envelope側へ閉じ込めてください。

### hydration

- trigger判定はscheduler / registryを正本にしてください。
- component側の自動起動や独自trigger判定を増やさないでください。
- SSR / client DOM差分をresetで隠蔽しないでください。

### sidebar / layout shell

- sidebar hostのDOM実体をrouteごとに再生成しないでください。
- overlay stateとtree expanded stateを混在させないでください。
- layout shellとnote本文内要素の責務を曖昧にしないでください。

### search

- 検索語処理、ランキング、URL状態、表示整形を混在させないでください。
- `search-core`相当の層はUIから独立した再利用可能ロジックとして維持してください。
- 単一ページ要件の都合で検索基盤を歪めないでください。

### Markdown / content pipeline

- parser core、grammar、payload normalization、validation context、output adapterを分離してください。
- 変換順序依存の振る舞いは文書化とテストで固定してください。
- 独自記法を導入する場合は、authoring guide・output contract・safety policyを同時に更新してください。
- Markdown由来のUIをコンポーネント都合で無理に再解釈しないでください。
- content config や corpus の入力仕様は `docs/contracts/` と `docs/guides/` の両方を確認してください。

### data projection

- source dataとpage/view modelの境界を明確にしてください。
- template側のad-hoc整形ではなく、projection層へ責務を集約してください。
- 同じ導出ロジックを複数テンプレートへ重複実装しないでください。

### icons / generated assets

- アイコン追加時は `scripts/generate-icon-subset.ts` と `src/generated/lucide-subset.ts` の生成経路に合わせてください。
- 手作業で生成済みicon subsetを恒久編集しないでください。
- 生成物の差分は、対応する入力やscript変更とセットで扱ってください。

---

## よく使うコマンド

以下はプロジェクトスクリプトです。Windowsネイティブ環境ではPowerShellから実行してください。WSLでリポジトリを開いている場合のみ、WSL内のshellとして扱ってください。

```powershell
pnpm dev                    # Eleventy dev server
pnpm build                  # client / images / Eleventy / Lit SSR / navigation artifacts / Pagefind
pnpm build:production       # production条件をまとめたビルド入口
pnpm build:client           # client bundleのみ生成
pnpm build:images           # 画像生成

pnpm test:node              # pure logic / policy / parser / projection helper
pnpm test:browser           # custom element / enhancer のbrowser-observable contract
pnpm test:ssr               # build-time / final DOM / static artifact / CSS structure
pnpm test:e2e               # app shell / no-JS baseline / router / search / 主要導線
pnpm test:storybook:meta    # story metadata / import boundary
pnpm test:storybook:smoke   # Storybook smoke
pnpm test                   # node + ssr + browser + storybook:meta
pnpm test:extended          # storybook smoke + e2e:production + e2e:dev

pnpm lint                   # ESLint
pnpm typecheck              # app + node の型チェック
pnpm check                  # lint + typecheck + test
pnpm ci                     # check + test:extended
```

通常ビルドは、client bundle、画像生成、Eleventy、Lit SSR、navigation artifact、Pagefind indexの順に進みます。build-time契約を変更する場合は、この順序に依存したテストの有無を確認してください。

---

## テスト方針

テストは **何を保証するか** で置き場所を決めてください。

### `pnpm test:node`

純粋ロジックやbrowser実体不要の仕様を担当します。

- pure function
- normalization
- URL / path / router policy
- parser / transformer
- projection helper
- state machine

### `pnpm test:browser`

custom elementと enhancerのbrowser-observable contractを担当します。

- public DOM contract
- shadow DOM
- keyboard / pointer / focus
- aria / state transition
- component の observable behavior

### `pnpm test:ssr`

build-time / final DOM / static artifact / CSS structureを担当します。

- Markdown transform
- note final DOM contract
- projection / serialization
- hydration budget
- selector / hook / token参照の存在
- CSS structure contract

### `pnpm test:e2e`

app全体で成立する統合契約を担当します。

- app shell integration
- no-JS baseline
- router / history / search
- note読書フロー
- 主要導線の最終確認

### `pnpm test:storybook`

Storybookはdocs / smoke / metadataに限定します。

- `pnpm test:storybook:meta`
  - story metadata
  - import boundary
  - smoke allowlistの妥当性

- `pnpm test:storybook:smoke`
  - docs面の最低限の健全性確認

### テスト追加時の原則

- `test/unit/**`は使用しません。
- `src/**/*.test.ts`は使用しません。
- バグ修正では、可能なら先に再現テストを追加してください。
- 実装詳細ではなく契約を固定してください。
- Storybookをcomponent/browser契約の主戦場にしないでください。
- Story 名や並び順を契約正本にしないでください。

---

## コーディング規約

### TypeScript

- `any`は使用しないでください。
- 型不明入力には`unknown`を使い、絞り込みで扱ってください。
- 型注釈を削って黙らせるのではなく、契約を明確にしてください。
- 一時しのぎの型アサーションを恒久化しないでください。

### コメントと言語

- コメントは日本語で記述してください。
- コメントは「何をしているか」より「なぜそうしているか」を優先してください。
- 自明な逐語コメントは避けてください。

### アイコン

- アイコンはiconify/lucideを前提とします。
- 利用時は現行のアイコンカタログと登録経路に合わせてください。
- 直にSVGを埋め込むのは、自己完結性や外部依存回避に合理性がある場合に限ります。

### CSS / デザイン

- トークン、状態、責務の階層を崩さないでください。
- レイアウト都合の場当たり的な値を増やす前に、既存トークンやcompositionの不足を疑ってください。
- 本文スタイルとUI補助部品の視覚ノイズを同列に扱わないでください。

---

## アクセシビリティ方針

アクセシビリティは後付けではなく、設計の初期条件です。

- 目標基準はWCAG 2.1 Level AAとします。
- semantic HTMLを優先してください。
- ARIAはsemantic HTMLを補うためにのみ使ってください。
- focus visible、キーボード操作、名前・役割・状態の露出を確認してください。
- reduced motion、forced colors、dark modeなどの環境差分を無視しないでください。

`@lion/ui`の発想やロジック構成は参考にして構いませんがRouaultの責務境界とUI原則に合わせて再構成してください。単純コピーを目的にしてはいけません。

---

## 作業手順の原則

### 安全確認

次の操作は、ユーザーが明確な範囲で直接依頼している場合を除き、実行前にリスクを説明して明示的な確認を取ってください。

- ファイルやディレクトリの削除
- Git履歴の書き換え、force push、reset系操作
- 認証情報、secret、token、証明書、環境ファイルの変更
- system-wide設定、PowerShell実行ポリシー、グローバルpackageの変更
- network-dependentなinstallやupgrade
- workspace外のファイル変更

secretらしき値を見つけた場合は、値そのものを出力せず、ファイル名と文脈だけを示してください。

### 変更前

- 関連する`docs/`と既存テストを先に確認してください。
- 同名・類似責務の既存実装がないかを調べてください。
- 新規追加ではなく統合で済む可能性を先に検討してください。

### 変更中

- 一つの変更で責務が増えすぎたら分割してください。
- 影響範囲がrouter / search / markdown / layout / projection / hydration / sidebarのどこに属するかを明示してください。
- 一時的TODOを残す場合は、何が未解決かを具体的に書いてください。

### 変更後

- 最低限、該当レイヤのテストを実行してください。
- 仕様変更を伴うなら、READMEより先に`docs/`を更新してください。
- AGENTSに書くべきか迷う内容は、原則としてAGENTSではなく`docs/`に置いてください。
