# UI確認ワークベンチ

要求ID: `REQ-UI-CHECK-WORKBENCH-001`

判断ID: `D-UI-CHECK-WORKBENCH-001`

`tools/ui-check/` は、Rouaultの小さなUI断片を素早く目視確認するためのローカル開発環境です。観察、状態の比較、スクリーンショットの収集を補助します。

仕様の正本、契約テスト、CIの受け入れ判定、スクリーンショットの回帰比較基準、`content/testing/` や `test/e2e` の代替としては扱いません。

動作、DOM構造、CSSトークンの契約、アクセシビリティ上の意味、見た目の保証を正式に定める場合は、既存の責務領域である `docs/contracts/`、`docs/design-system/`、`test/ssr`、`test/browser`、`test/e2e` へ移してください。

## 使い方

```powershell
pnpm ui:check
```

`pnpm ui:check` は `codegen:icons`、レンダラー由来のケース生成、静的フォント資産の準備を順に実行し、Viteサーバーを起動します。生成物がないcheckoutでも、このコマンドで閲覧に必要なファイルを準備できます。

次のURLを開きます。

```text
http://127.0.0.1:5174/tools/ui-check/
```

レビュー用のスクリーンショットを収集するには、次を実行します。

```powershell
pnpm ui:screenshot
```

このコマンドもケース生成とフォント準備を行い、専用サーバーを起動します。スクリーンショットとPlaywrightの補助出力は `.generated/ui-check/` に保存されます。これらはレビュー用の生成物であり、リポジトリの正本や契約文書ではありません。

サーバーを起動せず、レンダラー由来のケースだけを生成するには、次を実行します。

```powershell
pnpm run codegen:ui-check-cases
```

## ソースと生成物の配置

- `tools/ui-check/index.html`: ケース一覧。Gitで管理します。
- `tools/ui-check/cases/`: 手書きの5ケース（`article-header.html`、`callout.html`、`details.html`、`table-overflow.html`、`typography.html`）。Gitで管理します。
- `tools/ui-check/codegen-ui-check-cases.ts`、`generated-cases.ts`、`fixtures/`、Vite / Playwright設定と補助コード: 生成元・入力・設定としてGitで管理します。
- `.generated/ui-check/cases/`: 自動生成する7ケース（`code-surface.html`、`code-surface-dark.html`、`search-controls.html`、`footer.html`、`not-found.html`、`reading-interactions.html`、`video.html`）。既存の `.generated/` 除外規則に従い、Gitで管理しません。

生成HTMLを手で修正せず、生成元やfixtureを変更してください。`tools/ui-check/cases/` 全体をGitの除外対象にしないでください。

閲覧URLは手書き・生成のどちらも `/tools/ui-check/cases/<名前>.html` です。Vite設定は生成対象の7件だけを `.generated/ui-check/cases/` から読み、元の閲覧URLでHTML変換を行います。これにより、inline module、相対パスのfixture module、CSSの読み込み、一覧への戻りリンクを維持します。

検索ケースは本番のURL同期処理により表示中のURLが `/search/` に変わるため、一覧への戻りリンクには `/tools/ui-check/` を明示します。

`test/node/ui-check-cases.test.ts` は一時ディレクトリへ実際に生成し、生成元との比較、7件の出力、再生成の同一性と不要な書き換えがないことを確認します。Git管理済みの生成HTMLには依存しません。

## 生成するケース

`search-controls.html` は、`tools/ui-check/codegen-ui-check-cases.ts` が `renderSearchPageHtml()` と `tools/ui-check/fixtures/search-page-fixture.ts` から生成します。本番の検索ページに似せるために生成DOMを直接編集せず、fixtureまたは生成処理を更新してください。

このケースは、目視確認用にフィルターを展開した表示です。`details.filter-details` がちょうど1件存在することを確認してから `open` を追加します。実際の検索ページの初期状態とは異なります。

`code-surface.html` と `code-surface-dark.html` は、本番のコードハイライト・コードグループ・native note変換を使い、JavaScriptなしの表示と機能追加後の観察用表示を生成します。

## 継続して確認する本番UI

`footer.html` と `not-found.html` は、`fixtures/retained-surfaces.ts` が本番のHTMLレンダラーから生成します。フッターは通常、最小、外部リンク付きの状態を含みます。

`reading-interactions.html` と `video.html` は本番のコンポーネントと起動処理を使います。小さなfixtureのエントリーは本番のregistry / schedulerに初回起動を委譲し、アプリ全体のクライアントを読み込んだり、共通枠のhydrationを管理したりしません。

タブでは横向き、初期選択、縦向き、自動選択、アイコン付きの状態を確認できます。翻訳ではポップオーバー、ドロワー、同時に1件だけ開く状態を観察できます。動画ではポスター、字幕、空状態、自動再生・ミュート・ループ、本文内・標準幅の表示を確認できます。プレイヤー内部のボタン一覧を複製せず、実際のコントロールで再生や全画面表示を観察します。

`pnpm ui:screenshot` は、これらのケースについてライト / ダーク、モバイル幅、強制カラー、動きの抑制、印刷時の表示も収集します。画像はレビュー用であり、ピクセル単位の回帰比較基準ではありません。

動作の保証は `test/browser/tabs.browser.test.ts`、`translation.browser.test.ts`、`video.browser.test.ts` と既存のSSR / E2Eテストが担います。生成の整合性は `test/node/ui-check-cases.test.ts` で確認しますが、ワークベンチが動作仕様を所有するわけではありません。

共通枠、サイドバー、目次（TOC）、標準HTMLのスキップリンク、URLと同期するタブは、`content/testing/` と本番E2E fixtureから生成した実際のページで確認します。fixtureのURLはハッシュを複製せず、`test/e2e/support/note-fixtures.ts` で解決してください。Phase 1移行の記録は `docs/temporary/lit-boundary-phase1/` にあります。

## CSSの読み込み

一覧と各ケースは、本番のスタイルシートを直接読み込みます。

```html
<link rel="stylesheet" href="/src/assets/css/main.css" />
```

`ui-check-entry.ts` やmodule scriptを経由してCSSを読み込みません。静的ページのCSS読み込み経路に近づけ、観察時のスタイル未適用表示を減らすためです。

## 責務の境界

- Vite開発サーバーのrootはリポジトリのrootです。入口URLは `/tools/ui-check/` を維持します。
- ケース専用のCSS bundleや個々のコンポーネントCSSは読み込みません。
- ワークベンチは `src/client.ts` をimportせず、router、検索・navigationの生成物、恒久URL、ノート原稿のroot、公開先の仕組みに接続しません。
- `tools/ui-check/**/*.ts` は、ブラウザー用のエントリーとNode向け設定・Playwright補助コードが同居するため、`tsconfig.node.json` に属します。
- TypeScriptのimportには `@` aliasではなく相対パスを使います。相対TypeScript moduleのimportは `.js` 拡張子、Viteのasset importは実際の拡張子を使ってください。
- `tools/ui-check/playwright/screenshot.spec.ts` のassertionは、ワークベンチの表示、リンク、CSS、module読み込みを確認する運用上のsmoke checkです。契約テスト、CIの受け入れ基準、スクリーンショットの回帰比較基準ではありません。
