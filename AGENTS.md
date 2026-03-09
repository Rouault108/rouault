# Rouault プロジェクトコンテキスト

## 概要

**Rouault** は、個人的なメモ（ノート）を閲覧するためのLitで作成される専用Webアプリケーションで、「没入して読む」ことのできるデザインを目指します。

## プロジェクトのゴール

- **パーソナルナレッジマネジメント**: 個人のメモを閲覧・読むための専用の場所を提供します。
- **プライバシーファースト**: ログインしなければコンテンツを閲覧できない仕組みとします。
- **高アクセシビリティ**: `@lion/ui` の堅牢なロジックを参考に自前実装し、WCAG Level AA 基準に準拠します。
- **堅牢性**: できるだけ多くの依存性を避け、開発環境を最小限に抑えます。
- **デザイン**: 最高のリーディング体験は**「UIの透明化」**——すなわちコンテンツへの主役交代によってもたらされると定義します。我々は本文エリアにおける装飾的な枠線を最小化しますが、ナビゲーションや独立した情報ブロックにおいては、明確な構造を示すために繊細な枠線を機能的に使用します。

Web標準とアクセシビリティへの準拠はゴールではなくスタートラインです。その強固な基盤の上で、**高い情報のS/N比（Signal-to-Noise Ratio）**を維持し、プロフェッショナルツールの機能性と、読むための「静謐（Serene）」な空間を両立します。

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
- **シンタックスハイライト**: Shiki (`shiki`)
- **Markdown処理**:
  - `remark-gfm` (GitHub Flavored Markdown)
  - `remark-math` & `rehype-katex` (数式サポート)
  - `remark-emoji` (絵文字)
  - `remark-supersub` (上付き・下付き文字)

### ツール

- **リンター/フォーマッター**: Eslint, Prettier
- **コンパイラ**: esbuild (`esbuild`)
- **UI開発**: Storybook (`storybook`)

### インフラストラクチャ

- **ホスティング**: Cloudflare Pages

### テスト

- **ユニットテスト**: Web Test Runner（`pnpm test:unit`）
- **UIテスト**: Storybook、Vitest（`pnpm test:storybook`）
- **E2Eテスト**: Playwright (`@playwright/test`)

## 開発ガイドライン

- **Rule:** In each command, **define → use**. Do **not** escape `$`. Use generic `'path/to/file.ext'`.

1. READ (UTF‑8 no BOM, line‑numbered)

```bash
bash -lc 'powershell -NoLogo -Command "
$OutputEncoding = [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false);
Set-Location -LiteralPath (Convert-Path .);
function Get-Lines { param([string]$Path,[int]$Skip=0,[int]$First=40)
  $enc=[Text.UTF8Encoding]::new($false)
  $text=[IO.File]::ReadAllText($Path,$enc)
  if($text.Length -gt 0 -and $text[0] -eq [char]0xFEFF){ $text=$text.Substring(1) }
  $ls=$text -split \"`r?`n\"
  for($i=$Skip; $i -lt [Math]::Min($Skip+$First,$ls.Length); $i++){ \"{0:D4}: {1}\" -f ($i+1), $ls[$i] }
}
Get-Lines -Path \"path/to/file.ext\" -First 120 -Skip 0
"'
```

2. WRITE (UTF‑8 no BOM, atomic replace, backup)

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
