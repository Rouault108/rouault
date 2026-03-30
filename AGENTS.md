# AGENTS.md

## 位置づけ

この文書は、Rouault における **開発時の判断基準と作業規約** をまとめた運用文書です。README の再掲や詳細仕様書の代替ではありません。

- README は **初見者向けの入口文書** として扱います。
- `docs/` は **仕様・契約・設計判断** の所在として扱います。
- `package.json`、設定ファイル、テスト、実装コードは **現在の実装事実** の所在として扱います。
- `temporary/` や `docs/old/` は、特に断りがない限り **履歴資料** であり、現行の正本として扱いません。

README・AGENTS・実装の内容が衝突した場合は、次の優先順位で解釈してください。

1. 実行可能な設定と実装（`package.json`、`*.config.*`、`src/`、`lib/`、`scripts/`）
2. テストで明示された契約（`test/ssr`、`test/storybook`、`test/e2e`、`test/unit`）
3. `docs/` の仕様文書
4. README
5. `temporary/`、`docs/old/`

---

## プロジェクト概要

**Rouault** は、個人的なノートを閲覧するための専用 Web アプリケーションです。  
主目的は、一般的なドキュメントサイトを作ることではなく、**「没入して読む」ことに適した静かな UI を構築すること** にあります。

現行実装は、Eleventy を基盤とする静的生成、Lit による UI、ビルド時 SSR、クライアント側 hydration、Markdown ベースのノート管理を中核に構成されています。

Rouault を実装・修正する際は、常に次の問いを優先してください。

- この変更は本文への集中を妨げないか。
- この変更は将来の拡張で責務境界を壊さないか。
- この変更はコンテンツ資産を表示都合で汚染していないか。
- この変更はアクセシビリティ契約を弱めていないか。

---

## プロジェクトの主要原則

### 1. 読書体験優先

Rouault は「読むための UI」です。  
装飾、動的挙動、強い存在感を持つインタラクションは、それが本文理解に寄与する場合に限って導入してください。

- 本文領域では、不要な枠線・色面・影・過剰な操作 affordance を避けます。
- ナビゲーションや補助情報は、本文の主従関係を壊さない範囲で明確に表現します。
- UI の静けさ、予測可能性、可読性を、演出的な派手さより優先します。

### 2. コンテンツ資産優先

Markdown とその関連メタデータは、長期的に保持される資産です。  
表示上の都合を理由に、コンテンツ資産側へ一時的な回避策を持ち込まないでください。

- 表示ロジックは、可能な限り変換層・投影層・UI 層で吸収します。
- authoring 規約を増やす前に、既存の parser / transformer / adapter で解決できないかを検討します。
- 一時的な表現都合を frontmatter や本文記法へ直書きして恒久化しないでください。

### 3. 責務境界優先

Rouault では、長期保守性のために ownership boundary を重視します。  
特に次の境界を混在させないでください。

- `router` と view 状態
- `search` と UI 状態
- Markdown parser core と出力 adapter
- content schema と page projection
- layout shell と feature-specific component
- build-time contract と runtime fallback

単に「動く」実装よりも、**どの層が何を所有するかが明確である実装** を優先します。

### 4. 静的生成優先

現行の Rouault は、**SSG + build-time SSR + client hydration** を基本戦略とします。

- まず静的に成立する HTML を優先してください。
- インタラクティブ性が必要な箇所だけ hydration します。
- request-time SSR を前提にした設計へ安易に寄せないでください。
- クライアント JS が無くても成立すべき情報構造を先に整えます。

### 5. 依存追加抑制

依存はコストです。  
新規ライブラリ導入時は、次を満たす場合に限って検討してください。

- 既存実装では保守負債が大きすぎる
- Web 標準や既存依存では代替困難である
- 導入対象が長期的に保守されている
- 導入で責務境界がかえって明確になる

単なる実装短縮のためだけに依存を増やさないでください。

---

## 現行アーキテクチャの大枠

詳細は各仕様文書を参照してください。ここでは実装判断に必要な最小限のみを記します。

### 基盤

- SSG: Eleventy
- UI: Lit
- 言語: TypeScript
- ビルド時 SSR: `@lit-labs/ssr`
- 検索: Pagefind
- コードハイライト: Shiki
- コンテンツ処理: Velite + Markdown 変換パイプライン

### 現在の主なコード配置

- `src/components/` : 画面・UI コンポーネント
- `src/lib/` : router、search、theme、toc などのロジック
- `src/data/` : projection / data shaping
- `src/layouts/` : Eleventy レイアウト
- `src/client/` : hydration / post-hydrate 処理
- `src/icons/` : アイコンカタログと登録
- `scripts/` : ビルド補助スクリプト
- `test/` : unit / ssr / storybook / e2e テスト
- `docs/` : 契約・仕様・設計資料

### ドキュメントの主な参照先

- `docs/router-specification.md`
- `docs/search-specification.md`
- `docs/testing-taxonomy.md`
- `docs/notes_sidebar_breadcrumb_contract.md`
- `docs/content-config-syntax.md`
- `docs/corpus-specification.md`
- `docs/markdown/`
- `docs/design-system/`

---

## 実装時の判断規則

### UI コンポーネント

- まず semantic HTML と a11y contract を定め、その後に見た目を載せてください。
- variant の追加でごまかす前に、責務分割の誤りがないかを確認してください。
- 一つの UI コンポーネントに、router・search・data shaping まで背負わせないでください。
- 読書用 UI は、操作対象の明示と本文の静けさを両立させてください。

### router / URL / navigation

- URL は共有可能で再構成可能な状態だけを担うべきです。
- 一時的 UI 状態を、無秩序に `history.state` や URL に逃がさないでください。
- router 層で吸収すべきことを component 側へ漏らさないでください。

### search

- 検索語処理、トークナイズ、ランキング、URL 状態、表示整形を混在させないでください。
- `search-core` 相当の層は UI から独立した再利用可能なロジックとして維持してください。
- 単一ページ要件の都合で検索基盤を歪めないでください。

### Markdown / content pipeline

- parser core、grammar、payload normalization、validation context、output adapter を意識して分離してください。
- 変換順序に依存する振る舞いは、文書化とテストで固定してください。
- 独自記法を導入する場合は、authoring guide・output contract・safety policy を同時に更新してください。
- Markdown 由来の UI をコンポーネント都合で無理に再解釈しないでください。

### data projection

- source data と page/view model の境界を明確にしてください。
- template 側で ad-hoc に整形するのではなく、projection 層に責務を集約してください。
- 同じ導出ロジックを複数テンプレートへ重複実装しないでください。

---

## テスト方針

テストは「何を保証するのか」で置き場所を決めてください。

### `pnpm test:unit`

純粋ロジックや副作用の薄いユーティリティを担当します。

- router の純粋ロジック
- search のロジック
- parser / transformer
- controller 的なロジック
- データ整形

### `pnpm test:ssr`

ビルド時契約と静的成果物の形を担当します。

- SSG 出力契約
- Lit SSR 出力
- Markdown 変換契約
- note/page projection 契約
- build script 契約

### `pnpm test:storybook`

Lit コンポーネントの browser-observable contract を担当します。

- 描画
- interaction
- keyboard 操作
- a11y
- visual / state matrix

Lit の decorator を使うコンポーネントの挙動は、原則としてこちらを優先してください。

### `pnpm test:e2e`

ブラウザ全体で成立する統合契約を担当します。

- 画面遷移
- hydration 後のふるまい
- sidebar / toc / tabs などの協調動作
- 主要導線の破綻検知

### テスト追加時の原則

- バグ修正では、可能なら先に再現テストを追加してください。
- 実装詳細ではなく契約を固定してください。
- Story 名や test 名は、UI 名ではなく保証内容が分かる粒度にしてください。

---

## コーディング規約

### TypeScript

- `any` は使用しないでください。
- 型不明入力には `unknown` を使い、絞り込みで扱ってください。
- 型注釈を削って黙らせるのではなく、契約を明確にしてください。
- 一時しのぎの型アサーションを恒久化しないでください。

### コメントと言語

- コメントは日本語で記述してください。
- コメントは「何をしているか」より「なぜそうしているか」を優先してください。
- 自明な逐語コメントは避けてください。

### アイコン

- アイコンは iconify/lucide を前提とします。
- 利用時は現行のアイコンカタログと登録経路に合わせてください。
- 直に SVG を埋め込むのは、自己完結性や外部依存回避に合理性がある場合に限ります。

### CSS / デザイン

- トークン、状態、責務の階層を崩さないでください。
- レイアウト都合の場当たり的な値を増やす前に、既存トークンや composition の不足を疑ってください。
- 本文スタイルと UI 補助部品の視覚ノイズを同列に扱わないでください。

---

## アクセシビリティ方針

アクセシビリティは後付けではなく、設計の初期条件です。

- 目標基準は WCAG 2.1 Level AA とします。
- semantic HTML を優先してください。
- ARIA は semantic HTML を補うためにのみ使ってください。
- focus visible、キーボード操作、名前・役割・状態の露出を確認してください。
- reduced motion、forced colors、dark mode などの環境差分を無視しないでください。

`@lion/ui` の発想やロジック構成は参考にして構いませんが、Rouault の責務境界と UI 原則に合わせて再構成してください。単純コピーを目的にしてはいけません。

---

## 作業手順の原則

### 変更前

- 関連する `docs/` と既存テストを先に確認してください。
- 同名・類似責務の既存実装がないかを調べてください。
- 新規追加ではなく統合で済む可能性を先に検討してください。

### 変更中

- 一つの変更で責務が増えすぎたら分割してください。
- 影響範囲が router / search / markdown / layout / projection のどこに属するかを明示してください。
- 一時的 TODO を残す場合は、何が未解決かを具体的に書いてください。

### 変更後

- 最低限、該当レイヤのテストを実行してください。
- 仕様変更を伴うなら、README ではなく `docs/` を更新してください。
- AGENTS に書くべきか迷う内容は、原則として AGENTS ではなく `docs/` に置いてください。

---

## コマンド運用規約

- 各コマンドは **define → use** の順で書いてください。
- `$` の不要なエスケープは避けてください。
- パスは汎用的な `'path/to/file.ext'` 形式で示してください。
- ファイルは UTF-8（BOM なし）を前提としてください。
- OS 固有コマンドを示す場合は、その前提を明記してください。

### READ 例（UTF-8 / 行番号付き）

```bash
bash -lc 'powershell -NoLogo -Command "
$OutputEncoding = [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false);
Set-Location -LiteralPath (Convert-Path .);
function Get-Lines { param([string]$Path,[int]$Skip=0,[int]$First=40)
  $enc=[Text.UTF8Encoding]::new($false)
  $text=[IO.File]::ReadAllText($Path,$enc)
  if($text.Length -gt 0 -and $text[0] -eq [char]0xFEFF){ $text=$text.Substring(1) }
  $ls=$text -split "`r?`n"
  for($i=$Skip; $i -lt [Math]::Min($Skip+$First,$ls.Length); $i++){ "{0:D4}: {1}" -f ($i+1), $ls[$i] }
}
Get-Lines -Path "path/to/file.ext" -First 120 -Skip 0
"'
```

### WRITE 例（UTF-8 / BOM なし / atomic replace）

```bash
bash -lc 'powershell -NoLogo -Command "
$OutputEncoding = [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false);
Set-Location -LiteralPath (Convert-Path .);
function Write-Utf8NoBom { param([string]$Path,[string]$Content)
  $dir = Split-Path -Parent $Path
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
  $tmp = [IO.Path]::GetTempFileName()
  try {
    $enc = [Text.UTF8Encoding]::new($false)
    [IO.File]::WriteAllText($tmp,$Content,$enc)
    Move-Item $tmp $Path -Force
  }
  finally {
    if (Test-Path $tmp) {
      Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    }
  }
}
$file = "path/to/your_file.ext"
$enc  = [Text.UTF8Encoding]::new($false)
$old  = (Test-Path $file) ? ([IO.File]::ReadAllText($file,$enc)) : ''
Write-Utf8NoBom -Path $file -Content ($old+"`nYOUR_TEXT_HERE`n")
"'
```

---

## この文書に書かないこと

長期保守性のため、次の情報は AGENTS に詳細を書き込みすぎないでください。

- 頻繁に変わる完了状況一覧
- 一時的な実装計画の詳細フェーズ
- 未確定の将来機能を既定事実のように書くこと
- README や `docs/` にある仕様の全面再掲
- 実装とすぐ乖離するファイル一覧の細目

AGENTS は「変わりにくい判断原則」を保持する場所です。  
変わりやすい事実は、実装・テスト・仕様書へ寄せてください。
