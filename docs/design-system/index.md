# Rouault デザインシステム

## 概要

Rouaultは、個人的なメモ（ノート）を閲覧するための専用Webアプリケーションで、「没入して読む」ことのできるデザインを目指します。

Linearのドキュメントが証明するように、最高のリーディング体験は**「UIの透明化」**——すなわちコンテンツへの主役交代によってもたらされます。我々は本文エリアにおける装飾的な枠線を最小化しますが、ナビゲーションや独立した情報ブロックにおいては、明確な構造を示すために繊細な枠線を機能的に使用します。

Web標準とアクセシビリティへの準拠はゴールではなくスタートラインです。その強固な基盤の上で、**高い情報のS/N比（Signal-to-Noise Ratio）**を維持し、プロフェッショナルツールの機能性と、読むための「静謐（Serene）」な空間を両立します。

### デザイン原則

1. **没入のための構造 (Structure for Immersion)**
    - UIはコンテンツの従僕である。装飾的な余白ではなく、計算されたタイポグラフィと厳密なスペーシングによって、読むリズムを創出する。ユーザーが意識せずとも、情報の階層が自然と脳に流れ込む「透明な構造」を提供する。

2. **フロー状態の維持 (Flow State)**
    - 思考を分断しない。知覚できないほどのレスポンス（Zero Latency）により、ナビゲーションの負荷を認知限界まで下げる。ツールを操作している時間さえも、思考の一部へと昇華させる。

3. **デジタルの触感 (Digital Tactility)**
   - アニメーションは視覚的な装飾ではなく、操作の実感（Tactility）である。現実の物理法則（慣性や遅延）の模倣は、読書への没入を妨げるノイズとなるため排除する。思考と結果を直結させる「即応性（Snappiness）」を追求し、操作の手応えは、読書のリズムを乱さない最小限の確証（Confirmation）に留める。

4. **普遍的な明瞭さ (Universal Clarity)**
   - アクセシビリティは機能要件ではなく、美学の基礎である。誰にとっても読みやすく、操作しやすく、明確であることこそが、最も美しいデザインである。

---

## インタラクションとナビゲーション

Web標準とアクセシビリティガイドライン（WCAG）に準拠し、すべてのユーザーが直感的に操作できる堅牢なナビゲーションを提供します。予測可能性と操作性を最優先とし、独自の学習コストを強いることはありません。

### キーボードナビゲーション戦略

- **ネイティブフォーカスとタブ順序 (Native Focus & Tab Order)**:
  - ドキュメントの論理構造に従った自然なタブ順序（`Tab` / `Shift + Tab`）を維持する。
  - `tabindex` の乱用を避け、原則としてインタラクティブ要素（`<a>`, `<button>`, `<input>`）のみをフォーカス可能とする。
- **ロービングタブインデックス (Roving Tabindex / Widget Navigation)**:
  - **適用範囲**: `role="grid"`, `role="listbox"`, `role="tablist"` 等の複合ウィジェット内部に限る。
  - **動作**: 項目移動に矢印キー（`↑` `↓` `←` `→`）を使用。
- **フォーカス管理 (Focus Management)**:
  - **Modal (Dialog)**: ユーザーの操作を独占するため、フォーカスを内部に閉じ込める（Focus Trap）。
  - **Dropdown / Popover**: Flow Stateを維持するため、Trapは行わない。`Tab` キーによる脱出（メニューを閉じて次へ移動）を許容する。
  - `Esc` キーは常に「戻る」「閉じる」「キャンセル」として機能し、トリガー元へフォーカスを戻す。
- **視覚的インジケータ (Visual Indicators)**:
  - 現在のフォーカス位置を常に明確にするため、`:focus-visible` スタイルをすべてのインタラクティブ要素に適用する。

---

## 基盤 (Foundations)

### カラーシステム (OKLCH)

Rouaultは、色空間として **OKLCH** を採用します。これは、従来の sRGB (Hex/RGB/HSL) ではなく、人間の視覚特性に基づいた**知覚的均一性 (Perceptual Uniformity)** を持つ最新のカラーモデルです。

#### なぜ OKLCH なのか？

1.  **アクセシビリティと予測可能性 (Accessibility First)**
    -   従来のHSLでは、色相によって「見た目の明るさ」が異なりました（例：数値上の輝度50%でも、黄色は明るく、青は暗く見える）。
    -   OKLCHの `L` (Lightness) は**人間の目が感じる明るさ**と一致します。これにより、`L`値を固定すれば、どの色相を選んでも背景色とのコントラスト比が一定に保たれます。プログラム的なカラーパレット生成において、WCAG基準の遵守が容易になります。

2.  **没入感のある表現 (Wide Gamut Aesthetics)**
    -   sRGBの色域に制限されるHex/RGBとは異なり、OKLCHは **Display P3** などの広色域にネイティブ対応しています。
    -   これにより、深く鮮やかな色（特にシアン、マゼンタ、鮮やかな青）を表現可能となり、Linearのような「発光するような」モダンでプレミアムな質感を実装できます。

#### カラーメンタルモデル

色は `oklch(L C H)` で定義・管理します。

-   **L (Lightness)**: 明るさ。`0%` (黒) 〜 `100%` (白)。
-   **C (Chroma)**: 鮮やかさ。`0` (グレー) 〜 `0.37` (理論最大値)。
    -   `0.01-0.03`: ニュートラルな背景・テキスト
    -   `0.10-0.15`: UIコンポーネント、ブランドカラー
    -   `0.20+`: 強調、アクセント
-   **H (Hue)**: 色相。`0` 〜 `360`。

#### パレット定義戦略

色の宣言は「役割」と「値」を分離し、OKLCHの特性を活かした計算式として定義します。

**ベース設定 & 固定色**

| トークン | 値 | 説明 |
| :--- | :--- | :--- |
| `--chroma-neutral` | `0.01` | 無彩色（グレー）の彩度 |
| `--chroma-subtle` | `0.04` | 微細な彩度（Subtle UI背景用） |
| `--chroma-ui` | `0.12` | UIカラーの彩度 |
| `--chroma-high` | `0.20` | **強調・アクション**。Primary, Dangerなどの最も強い色。 |
| `--focus-ring-width` | `2px` | フォーカスリングの太さ |
| `--focus-ring-offset` | `2px` | フォーカスリングのオフセット |
| `--focus-ring-color` | `var(--primary)` | フォーカスリングの色 |
| `--hue-primary` | `250` | メイン色相 (Deep Indigo: 鎮静と知性) |
| `--hue-base` | `250` | ベース色相 |
| `--white` | `oklch(100% 0 0)` | 純白 |
| `--black` | `oklch(0% 0 0)` | 純黒 |
| `--border-transparent` | `oklch(0% 0 0 / 0)` | 透明 |

**テーマカラー (Light / Dark)**

| トークン | Light Value | Dark Value | 役割 / 説明 |
| :--- | :--- | :--- | :--- |
| **Primary** | | | |
| `--primary` | `oklch(55% var(--chroma-high) var(--hue-primary))` | `oklch(65% 0.12 var(--hue-primary))` | メインアクションカラー |
| `--primary-hover` | `oklch(50% var(--chroma-high) var(--hue-primary))` | `oklch(70% 0.18 var(--hue-primary))` | ホバー時の強調 |
| `--on-primary` | `var(--white)` | `var(--white)` | プライマリ上のテキスト色 |
| **State** | | | |
| `--danger` | `oklch(55% var(--chroma-high) 25)` | `oklch(55% 0.2 25)` | 破壊的アクション (Deep Red) |
| `--on-danger` | `var(--white)` | `var(--white)` | 白文字 (コントラスト確保) |
| `--success` | `oklch(55% 0.18 145)` | `oklch(55% 0.18 145)` | 成功・完了 (Deep Green) |
| `--on-success` | `var(--white)` | `var(--white)` | |
| `--warning` | `oklch(75% 0.16 85)` | `oklch(25% 0.16 85)` | 警告・注意 (Amber) |
| `--on-warning` | `oklch(20% 0.05 85)` | `oklch(85% 0.16 85)` | Light: 黒文字 / Dark: 黄文字 (反転) |
| **Background** | | | |
| `--bg-default` | `oklch(98% 0.01 var(--hue-base))` | `oklch(12% 0.02 var(--hue-base))` | アプリケーション背景 |
| `--bg-surface-1` | `var(--bg-default)` | `var(--bg-default)` | Base Layer (Sidebar, 背景と同化) |
| `--bg-surface-2` | `oklch(100% 0 0)` | `oklch(17% 0.02 var(--hue-base))` | Elevated (Card, Dropdown) |
| `--bg-surface-3` | `oklch(100% 0 0)` | `oklch(22% 0.02 var(--hue-base))` | Highest (Modal) |
| **Fill** | | | |
| `--bg-fill-muted` | `oklch(96% 0.01 var(--hue-base))` | `oklch(9% 0.02 var(--hue-base))` | 入力フォーム、コードブロック背景 |
| **Interaction** | | | |
| `--bg-hover` | `oklch(from var(--fg-default) l c h / 0.05)` | `oklch(from var(--fg-default) l c h / 0.05)` | ホバー (`from --fg-default`) |
| `--bg-active` | `oklch(from var(--primary) l c h / 0.08)` | `oklch(from var(--primary) l c h / 0.15)` | アクティブ (`from --primary`) |
| `--bg-surface-active`| `var(--bg-active)` | `var(--bg-active)` | リスト行選択状態 |
| `--focus-ring-color-subtle` | `oklch(65% 0.12 var(--hue-primary))` | `oklch(53% 0.12 var(--hue-primary))` | **移動中のフォーカス**。3:1コントラスト保証。 |
| `--bg-danger-subtle` | `oklch(96% 0.03 25)` | `oklch(25% 0.05 25)` | エラー背景 |
| **Foreground** | | | |
| `--fg-default` | `oklch(20% 0.03 var(--hue-base))` | `oklch(90% 0.01 var(--hue-base))` | 本文、主要テキスト |
| `--fg-muted` | `oklch(45% 0.02 var(--hue-base))` | `oklch(65% 0.01 var(--hue-base))` | メタデータ、アイコン |
| `--fg-subtle` | `oklch(60% 0.01 var(--hue-base))` | `oklch(50% 0.01 var(--hue-base))` | プレースホルダー |
| `--fg-on-primary` | `var(--on-primary)` | `var(--on-primary)` | |
| **Border** | | | |
| `--border-default` | `oklch(20% 0.03 var(--hue-base) / 0.12)` | `oklch(90% 0.01 var(--hue-base) / 0.12)` | 標準ボーダー |
| `--border-muted` | `oklch(20% 0.03 var(--hue-base) / 0.06)` | `oklch(90% 0.01 var(--hue-base) / 0.06)` | Mutedボーダー |
| `--border-ghost` | `oklch(20% 0.03 var(--hue-base) / 0.04)` | `oklch(90% 0.01 var(--hue-base) / 0.04)` | **Ghostボーダー**。「気配」として機能する構造線。 |
| `--border-danger` | `oklch(72% 0.15 25)` | `oklch(35% 0.1 25)` | エラーボーダー |

#### セマンティック & ジャンル別トークンとDelta補正

基本原則として、ジャンルカラーは `H` (色相) のみを変更し、`L` (明るさ) と `C` (鮮やかさ) を統一することで、**「機械的な一貫性」** を保証します。

ただし、**黄色〜オレンジ域 (Hue: 60-100)** など一部の色相は、同じ明度 `L` であっても視覚的に「暗く」あるいは「濁って（茶色っぽく）」見える特性があります。
Linearのような洗練された質感を維持するため、**Delta（補正値）** を導入してこれを微調整します。

| ジャンル | H (色相) | L補正 (Delta) | 理由 |
|----------|----------|---------------|------|
| 音楽 | `280` (Violet) | `0%` | 基準色。補正なし。 |
| 文学 | `85` (Gold) | `+5%` | 黄色系は暗く見えるため、明度を上げて「輝き」を補う。 |
| 美術 | `340` (Pink) | `0%` | 補正なし。 |
| CS | `230` (Blue) | `0%` | 補正なし。 |

**計算ロジック:**

> $$Color = oklch(calc(BaseL + DeltaL) \ 0.04 \ Hue)$$
> ※ 黄色系など、視覚的に暗く見える色相のみ `DeltaL` (`+5%`) を加算して輝度を補正します。

| トークン | 初期値 | 説明 |
| :--- | :--- | :--- |
| `--delta-l` | `0%` | デフォルトの明度補正値 |

**不透明度 (Opacity Modifiers)**

| トークン | 値 | 説明 |
| :--- | :--- | :--- |
| `--opacity-link-subtle` | `0.4` | 既読リンクや非強調要素の不透明度（コントラスト比低） |
| `--opacity-link` | `0.6` | **標準リンク**。3:1コントラスト保証ライン。 |
| `--opacity-link-touch` | `0.75` | タッチ環境用。発見可能性重視。 |
| `--opacity-disabled` | `0.6` | **無効化状態**。視認性を残しつつ操作不可を伝える。 |
| `--opacity-scrim` | `0.6` | モーダル背景（Backdrop）の遮光度。 |

### タイポグラフィ

#### フォントファミリー

RouaultはLinearをインスピレーション元としていますが、**日本語主体のコンテンツ**という本質的な違いがあります。そのため、欧文フォント（Inter）ではなく、日本語に最適化されたフォント戦略を採用します。

| トークン | 定義 |
| :--- | :--- |
| `--font-sans` | `'Noto Sans JP Variable', 'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic UI', 'Segoe UI', 'Meiryo', sans-serif` |
| `--font-mono` | `'JetBrains Mono', 'Fira Code', 'Consolas', 'Liberation Mono', 'Courier New', monospace` |

**設計意図**

| 項目 | 選択理由 |
|------|----------|
| **Noto Sans JP** | Google開発の高品質な日本語フォント。欧文グリフも含むため和欧混植時の統一感が高い。 |
| **Variable Font** | ウェイト400-900を1ファイルで提供。ファイルサイズとデザイン柔軟性の最適バランス。 |
| **和文優先フォールバック** | システムフォントも日本語対応を優先順位化（Hiragino Sans, Yu Gothic UIなど）。 |

**和欧混植 (Multilingual Typography)**

日本語と英数字が混在するテキストにおいて、視覚的統一感を確保するための調整：

```css
body {
  letter-spacing: 0; /* Noto Sans JPの本来のバランス（静謐さ）を優先 */
}

/* 視認性が必要なUI要素（短いラベル等）のみ明示的に広げる */
.ui-text {
  letter-spacing: 0.02em;
}

h1, h2, h3 {
  letter-spacing: -0.02em; /* 見出しは詰めて密度を高める */
}

.prose {
  letter-spacing: 0; /* 本文は詰めず、自然な可読性を優先 */
}
```

#### 和文メトリクス (Japanese Metrics)

「静謐さ」を深化させるため、和文フォント特有の空白（約物）を制御プロポーショナルメトリクスを活用します。

- **見出し・UIラベル (`"palt"`)**: 文字詰めを有効にし、密度を高めて「塊」としての構造美を強調します。
- **本文 (Default)**: 可読性を維持するため、ベタ組み（標準の字送り）を採用し、心地よいリズムを崩しません。

```css
h1, h2, h3, .ui-label {
  font-feature-settings: "palt";
}
```

#### フォントウェイト (Font Weight)

情報の発見可能性（Discoverability）を色に依存せず確保するため、ウェイトの差異を大胆に使用して構造を定義します。

| トークン | 数値 | 用途 |
|----------|------|------|
| `--font-normal` | `400` | **本文標準**。可読性が最も高いウェイト。 |
| `--font-medium` | `500` | ボタン、UIラベル、短いテキスト。 |
| `--font-semibold` | `600` | サブセクション見出し、強調ラベル。 |
| `--font-bold` | `700` | **主要見出し (H1-H2)**。「静謐さ」の中でも明確なアンカーポイントとして機能させる。 |

> **Note (Japanese Typography Strategy):**
> 日本語フォントは欧文に比べて視覚的な線幅が太く見える特性があります。そのため、安易に `Medium (500)` を多用すると画面全体が重くなり、ノイズとなります。
> 「大胆なウェイト差」戦略とは、基本を `Normal (400)` に厳格に保ちつつ、強調すべき構造（見出し等）には躊躇なく `Bold (700)` を使用することで、**中間の迷いを排した明確なコントラスト**を作り出すことを意味します。

#### 12px以下のテキストとアクセシビリティ (Small Text Rule)

12px (`--text-xs`) 以下のテキストを使用する場合は、可読性を物理的に担保するため、以下のいずれかの補正を**必須**とします。

1. **Weight Boost**: ウェイトを一段階上げる（例: `400` → `500`）。
2. **Tracking Boost**: 字間を広げる（`--tracking-wide`）。
3. **High Contrast**: 色を `--fg-muted` ではなく `--fg-default` に格上げする。

> **設計意図:** 物理的なレンダリング特性として、細い線の文字は消失しやすいため、デザイナーや実装者の感覚に頼らずルールで視認性を保証します。



#### フォントサイズ：高密度設計 (High Density)

| トークン | サイズ | 行の高さ | 用途 |
|----------|--------|----------|------|
| `--text-2xs` | 0.6875rem (11px) | 1rem | 極小ラベル |
| `--text-xs` | 0.75rem (12px) | 1rem | キャプション、バッジ |
| `--text-sm` | 0.8125rem (13px) | 1.25rem | 補助テキスト、メタ情報 |
| `--text-base` | 0.875rem (14px) | 1.5rem | **UI本文（App Default）** |
| `--text-lg` | 1rem (16px) | 1.5rem | **記事本文（Prose Body）** |
| `--text-xl` | 1.125rem (18px) | 1.75rem | 小見出し, リード文（Abstract） |
| `--text-2xl` | 1.5rem (24px) | 2rem | セクション見出し |
| `--text-3xl` | 1.875rem (30px) | 2.25rem | ページ見出し |
| `--text-4xl` | 2.25rem (36px) | 2.5rem | ヒーロー見出し |
| `--text-5xl` | 3rem (48px) | 3.6rem | 特大見出し |

#### 見出しスケール (Heading Scale)

| レベル | サイズトークン | ウェイト | 用途 |
|--------|----------------|----------|------|
| H1 | `--text-4xl` (36px) | 700 (Bold) | メモタイトル |
| H2 | `--text-2xl` (24px) | 600 (SemiBold) | メモ内セクション |
| H3 | `--text-xl` (18px) | 600 (SemiBold) | サブセクション |
| H4 | `--text-base` (14px) | 600 (SemiBold) | 小見出し |
| 本文(Content) | `--text-lg` (16px) | 400 (Regular) | **記事・メモ本文** |
| 本文(UI) | `--text-base` (14px) | 400 (Regular) | UI要素、リスト、設定 |
| 補助 | `--text-xs` (12px) | 400 (Regular) | 日時、メタデータ |

#### 字詰め (Tracking)

「静謐で集中できるデザイン」を実現するため、文字の密度を細かく制御します。大きな文字は引き締めてプロフェッショナルな印象を与え、小さな文字は広げて可読性を確保します。

| トークン | 値 | 用途 |
|----------|-----|------|
| `--tracking-tighter` | `-0.05em` | 特大見出し、ヒーローセクション。密度を高め、視覚的なインパクトを与える。 |
| `--tracking-tight` | `-0.025em` | 見出し（H1-H3）。文字を引き締めることで「塊感」を出し、プロフェッショナルな印象を作る。 |
| `--tracking-normal` | `0em` | 本文。可読性を最優先し、標準の間隔を維持。 |
| `--tracking-wide` | `0.025em` | 小さなUIテキスト（`--text-xs`以下）。潰れを防ぎ可読性を確保。 |
| `--tracking-wider` | `0.05em` | 大文字（ALL CAPS）のラベル、バッジ。視認性を高める。 |

#### 行の高さ (Line Height)

日本語の読みやすさとリズムを考慮し、用途に応じた厳密な行間を設定します。

| トークン | 値 | 用途 |
|----------|-----|------|
| `--line-height-none` | `1` | アイコン、バッジ、特定のUIコンポーネント |
| `--line-height-tight` | `1.25` | 見出し（タイトル）。文字サイズが大きいため、行間を詰めて「塊」として認識させる。 |
| `--line-height-normal` | `1.5` | UIテキスト、短い説明文。標準的なリズム。 |
| `--line-height-relaxed` | `1.75` | **記事本文**。長文を読む際、行の移動をスムーズにするための十分な余白。 |

#### 本文幅 (Prose Width)

記事本文や長文コンテンツの可読性を確保するため、テキストの最大幅を制限します。

| セレクタ | プロパティ | 値 | 目的 |
| :--- | :--- | :--- | :--- |
| `.prose` | `font-size` | `var(--text-lg)` (16px) | 読むためのサイズ（UIの14pxとは区別） |
| | `line-height` | `var(--line-height-relaxed)` | ゆったりとした行間で没入感を高める |
| | `max-width` | `var(--width-reading)` | 最適行長（約65文字）への制限 |
| | `margin-inline`| `auto` | 中央揃え |
| **Media Elements** | | | |
| `img`, `pre`, `table` | `max-width` | `none` | テキスト幅の制限を解除し、視覚的変化を作る |
| (Mobile) | `width` | `calc(100% + var(--space-8))` | コンテナより広く |
| | `margin-inline` | `calc(-1 * var(--space-4))` | 左右 `-16px` マージンではみ出させる |
| (Desktop) | `width` | `calc(100% + var(--space-16))` | さらに広く強調 |
| | `margin-inline` | `calc(-1 * var(--space-8))` | 左右 `-32px` マージンではみ出させる |

> **設計意図:** `var(--width-reading)`（約65文字幅）は可読性研究に基づく最適な行長。「コンテンツへの没入感」を高める重要な要素。画像やコードブロックは親コンテナまで拡張し、視覚的な変化を提供。

### アイコン

視認性と洗練を両立するため、ストローク幅は厳密に統一します。

| プロパティ | 定義 | 理由 |
|------------|----|------|
| **Stroke Width** | `1.5px` | Lucide の標準。高解像度ディスプレイにおける「静謐さ」を担保する唯一の太さ。 |
| **Style** | Outline | 塗りつぶし（Solid）は認知負荷が高いため、アクティブ状態などの明確なフィードバックが必要な場合のみ使用する。 |

| トークン | サイズ | 用途 |
|----------|--------|------|
| `--icon-xs` | 12px | テキストライン内の補足、メタデータ |
| `--icon-sm` | 14px | 小さなボタン、密度情報の高いリスト |
| `--icon-base`| 16px | **標準サイズ**。本文、標準ボタン |
| `--icon-md` | 20px | 大きなボタン、入力フィールド装飾 |
| `--icon-lg` | 24px | グローバルナビゲーション、独立したアクション |
| `--icon-xl` | 32px | エンプティステート、強調表示 |

### UIコントロールサイズ (Control Dimensions)

ボタン、入力フォーム、セレクトボックスなどのインタラクティブな要素の高さを統一し、垂直方向のリズムを整えます。

| トークン | 高さ | 用途 |
|----------|------|------|
| `--control-height-2xs` | `16px` | **Badge**: テキスト行内 (`1rem`) に収まるバッジサイズ |
| `--control-height-xs` | `20px` | **High Density**: タグ、超高密度なメタデータ表示（閲覧専用推奨） |
| `--control-height-sm` | `24px` | **Content Actions**: コンテンツ内部（コードブロック、リスト）の操作、高密度ツールバー |
| `--control-height-md` | `32px` | **Standard**: 全ての主要な入力フォーム、ナビゲーションボタン、検索バー |
| `--control-height-lg` | `40px` | *Deprecated*: 原則として使用しない。特別に強調が必要な場合のみ例外的に許可。 |
| `--control-min-touch` | `44px` | **Accessibility**: クリック・タップ可能な領域の最小サイズ（疑似要素で確保）。 |

> **Note:** 一般的な `40px` (md) / `48px` (lg) よりも一段階小さいサイズを標準とし、画面上の操作要素の占有率を下げます。

### スペーシングとリズム

すべての余白は「装飾」ではなく、コンテンツの関係性を示す「構造」として機能します。
基本単位を `4px` としますが、適用はタイポグラフィの行送り（Line Height）と同期させ、垂直方向のリズム（Vertical Rhythm）を維持します。

| トークン | 値 | 意味論的用途 (Semantic Usage) |
|----------|-----|------|
| `--space-1` | 0.25rem (4px) | **関連**: 密接に関連する要素間 (アイコンとテキストなど) |
| `--space-2` | 0.5rem (8px) | **グループ**: 論理的にグループ化された要素間 (タグ群、リスト項目) |
| `--space-3` | 0.75rem (12px) | **コンポーネント**: 独立したUI要素の内部余白 (ボタンのパディング) |
| `--space-4` | 1rem (16px) | **標準**: パラグラフ間、入力フォーム間。*ベースライン基本単位* |
| `--space-6` | 1.5rem (24px) | **区分**: 小さなセクションやコンテキストの切り替わり |
| `--space-8` | 2rem (32px) | **ブロック**: 独立した情報ブロック間 |
| `--space-12` | 3rem (48px) | **セクション**: 大きなコンテンツ領域の境界 |
| `--space-16` | 4rem (64px) | **拡張**: コンテナパディングの相殺や、大きなコンポーネント間の余白 |
| `--space-20` | 5rem (80px) | **シーン**: 画面全体の切り替わり、ヒーローエリア |

### 形状 (Shapes)

#### ボーダーシステム (Border System)

境界線は「仕切り」ではなく「構造の暗示」として機能させます。
視覚的なノイズを低減するため、不透明色（Solid Color）ではなく、背景色に馴染む **透過色（Alpha Channel）** を基本とします。

> **Warning (High Contrast Viability):**
> 透過ボーダーは Windows ハイコントラストモード (`forced-colors`) で消失する可能性があります。
> 「線が見えなくても構造が伝わる」よう、**スペーシング（`--space-*`）自体がグルーピングを定義する**設計を徹底してください。

**幅 (Width)**

| トークン | 値 | 用途 |
|----------|-----|------|
| `--border-width` | `1px` | **標準**。UIコンポーネントの境界線（繊細さを維持）。 |
| `--border-width-thick` | `2px` | 強調表示、アクティブなタブの下線。 |

**色 (Colors)**

| トークン | 定義 (Light/Dark参照) | 用途 |
|----------|-----------------------|------|
| `--border-default` | `oklch(L C H / 0.12)` | **標準ボーダー色**。カード、区切り線。 |
| `--border-muted` | `oklch(L C H / 0.08)` | **Ghost**。サイドバーの境界など、空白を暗示するために必要な最小限の色。 |

**セマンティックボーダー (Semantic Borders)**

これらは色と幅を組み合わせたユーティリティ定義です。

| トークン | 定義 | 用途 |
|----------|------|------|
| `--border-subtle` | `border: var(--border-width) solid var(--border-default);` | **標準**。繊細な区切り線。 |
| `--border-style-ghost` | `border: var(--border-width) solid var(--border-ghost);` | **Ghost**。subtleよりもさらに繊細な区切り線。 |
 
#### 角丸 (Border Radius)

選択肢を最小限に絞ることで、迷いをなくし、UI全体に一貫した「Tensor（張力）」を与えます。
`6px` と `8px` のような識別困難な差分を排除し、明確な意図を持って使い分けます。

| トークン | 値 | 用途 |
|----------|-----|------|
| `--radius-sm` | 0.25rem (4px) | 内部要素、タグ、小さなインタラクション要素 |
| `--radius-md` | 0.375rem (6px) | **標準**: ボタン、入力フィールド、カード、ポップオーバー |
| `--radius-xl` | 0.75rem (12px) | モーダル、フローティングパネル |
| `--radius-full` | 9999px | ステータスバッジ、アバター、ピル型ボタン |

#### ネスト時の数理 (Nested Geometry)

「UIの透明化」を実現するため、ネストされた要素の角丸は、視覚的な違和感を数学的に排除します。
以下の公式に従うことで、同心円状の自然な調和（Concentric Corner）を保証します。

> $$R_{inner} = R_{outer} - Padding$$

- **適用例**:
  - 親カード: Radius `12px`
  - パディング: `4px`
  - 子要素: Radius `8px` (`12px - 4px`)

#### 深度表現 (Depth System)

Lightモードでは「影（Shadow）」で、Darkモードでは「明度（Tone）」で高さを表現します。
モードごとの物理法則の違いを理解し、一貫した階層構造を提供します。

**Light Mode: Shadows**
物理的な光と影をシミュレートし、浮遊感を表現します。

| トークン | 値 | 用途 |
|----------|-----|------|
| `--shadow-sm` | `0 1px 2px oklch(0% 0 0 / 0.05)` | 微細な浮遊感 |
| `--shadow-md` | `0 4px 6px -1px oklch(0% 0 0 / 0.1)` | カード、ボタン |
| `--shadow-lg` | `0 10px 15px -3px oklch(0% 0 0 / 0.1)` | ドロップダウン |
| `--shadow-xl` | `0 20px 25px -5px oklch(0% 0 0 / 0.1)` | モーダル |
| `--shadow-glow` | `0 0 8px oklch(55% 0.22 var(--hue-primary) / 0.6)` | **フォーカス、アクティブ状態の強調**（装飾としては使用しない） |

**Dark Mode: Elevation Tones & Surfaces**
闇の中では影が見えにくいため、主に**背景色の明度差**と**境界の発光**で高さを表現します。シャドウは補助的に使用します。

| レイヤー | 背景色トークン (Ref) | 明度イメージ | 用途 |
|----------|----------------------|--------------|------|
| **Base** | `--bg-surface-1` | `L 12%` | Default。サイドバー、カード基底。 |
| **Elevated** | `--bg-surface-2` | `L 17%` | ドロップダウン、ポップオーバー。 |
| **High** | `--bg-surface-3` | `L 22%` | モーダル、ダイアログ。 |

> **Dark Mode Depth Strategy:**
> 低コントラスト環境における階層の識別性を保証するため、Elevatedレイヤー（`surface-2`以上）には、上端に `1px` のハイライト（光源の反射）を付与します。
>
> ```css
> .surface-elevated {
>   background: var(--bg-surface-2);
>   /* 上部に微細な光の反射を加えることで、エッジを立たせる */
>   box-shadow: inset 0 1px 0 0 oklch(100% 0 0 / 0.1); 
> }
> ```



| シャドウトークン (Dark) | 値 | 用途 |
|-------------------------|-----|------|
| `--shadow-dark-sm` | `0 1px 2px oklch(0% 0 0 / 0.3)` | 微細な浮遊感 |
| `--shadow-dark-md` | `0 4px 8px oklch(0% 0 0 / 0.4)` | カード、ボタン |
| `--shadow-dark-lg` | `0 8px 16px oklch(0% 0 0 / 0.5)` | ドロップダウン |
| `--shadow-dark-glow` | `0 0 12px oklch(65% 0.18 var(--hue-primary) / 0.5)` | フォーカス強調 |

### スクロールバー (Scrollbars)

OSやブラウザのデフォルトスタイルを上書きし、「静謐さ」と「操作性」を両立させます。
**「見えないヒットエリア」**の手法を採用し、視覚的には極細（4px）でありながら、物理的には十分な操作領域（12px）を確保することで、フィッツの法則に基づく操作負荷（ノイズ）を排除します。
また、ユーザーが現在位置を見失わないよう、WCAGコントラスト要件を満たす視認性を確保します。

| トークン | 値 | 役割 |
| :--- | :--- | :--- |
| `--scrollbar-width` | `12px` | **物理幅（ヒットエリア）**。操作容易性を確保するための不可視領域を含むサイズ。 |
| `--scrollbar-track` | `transparent` | **トラック背景**。常に透明とし、コンテンツの上に浮遊させる。 |
| `--scrollbar-thumb` | `var(--fg-subtle)` | **つまみ色**。背景と `3:1` 以上のコントラストを確保し、認知負荷を下げる。 |
| `--scrollbar-thumb-hover` | `var(--fg-muted)` | **ホバー時**。操作意思に対し、より明確なフィードバックを返す。 |

**実装スタイル (Mixin)**

`background-clip: content-box` を使用し、透明なボーダーでパディングを作り出すことで、当たり判定を維持したまま描画領域のみを縮小します。

```css
/* Firefox */
scrollbar-width: thin;
scrollbar-color: var(--scrollbar-thumb) transparent;

/* WebKit / Chromium */
&::-webkit-scrollbar {
  width: var(--scrollbar-width);
  height: var(--scrollbar-width);
}
&::-webkit-scrollbar-track {
  background: transparent;
}
&::-webkit-scrollbar-thumb {
  background-color: var(--scrollbar-thumb);
  border: 4px solid transparent;
  background-clip: content-box;
  border-radius: var(--radius-full);
}
&::-webkit-scrollbar-thumb:hover {
  background-color: var(--scrollbar-thumb-hover);
}
```

#### 質感・テクスチャ (Surfaces)

モダンで奥行きのある質感を表現するための定義です。
単なるブラー（ぼかし）ではなく、エッジに微細なハイライト（光の反射）を加えることで、UIに「物体としての実在感」とプレミアムな質感を与えます。

| トークン | 値 | 説明 |
| :--- | :--- | :--- |
| `--blur-md` | `12px` | **標準ブラー**。コンテンツの可読性を維持しつつ階層を示す最適値。 |
| `--blur-lg` | `24px` | **強ブラー**。モーダル背景など、コンテキストを完全に分離する場合に使用。 |

**実装パターン (Utility Class)**

CSS変数では表現できないリッチな質感を、クラス定義として提供します。

```css
/* Glass Panel: ヘッダー、フローティングパネル用 */
.glass-panel {
  /* 背景: S/N比維持のため高不透明度 (0.85) を基準とする */
  background-color: oklch(from var(--bg-default) l c h / 0.85);
  backdrop-filter: blur(var(--blur-md));
  -webkit-backdrop-filter: blur(var(--blur-md));

  /* Edge Highlight: 1pxの光の反射を表現し、プレミアムな質感を与える */
  box-shadow:
    inset 0 1px 0 0 oklch(100% 0 0 / 0.05), /* 上部の光（ハイライト） */
    inset 0 0 0 1px oklch(100% 0 0 / 0.03); /* 全周の微細な境界 */
}

/* Dark Mode時の調整（より繊細に） */
@media (prefers-color-scheme: dark) {
  .glass-panel {
    box-shadow:
      inset 0 1px 0 0 oklch(100% 0 0 / 0.08),
      inset 0 0 0 1px oklch(100% 0 0 / 0.05);
  }
}
```

### モーション (アニメーション)

#### 基本原則

1. **Snappiness (即応性)** — ユーザーの思考速度に同期する。待たせない。
2. **No Decoration (非装飾)** — モーションは「変化の伝達」のためにのみ存在する。
3. **Respect User (ユーザー尊重)** — `prefers-reduced-motion` を厳密に遵守する。

#### タイミング (Timing)

原則として **「認識できる最速の速度」** を採用します。

| トークン | 値 | 用途 |
|----------|-----|------|
| `--duration-instant` | 0ms | モーション無効時、即時反映が必要なUI |
| `--duration-fast` | 70ms | マイクロインタラクション（ボタン押下、トグル） |
| `--duration-normal` | 150ms | 標準トランジション（ホバー、フェードイン） |
| `--duration-slow` | 200ms | 複雑な変形、リストの並べ替え |
| `--duration-slower` | 300ms | 画面全体に関わる遷移、モーダル表示（これ以上遅くしない） |

#### スケーリング (Scale)

インタラクション時のサイズ変化もトークンで管理し、統一感を保ちます。

| トークン | 値 | 用途 |
|----------|-----|------|
| `--scale-pressed` | 0.96 | **Tactile Signal**: ボタン押下時の確認シグナル。「物理的な沈み込み」の模倣ではなく、入力受領のデジタルなフィードバック。 |
| `--scale-enter` | 0.98 | ドロップダウンやモーダルの出現開始サイズ（浮き出し効果） |
| `--scale-hover-sm` | 1.02 | ボタン、カードなどの大きな要素のホバー強調 |
| `--scale-hover-lg` | 1.1 | アイコン、スライダーつまみなど小さな要素のホバー強調 |
| `--scale-dragging` | 1.15 | スライダーやつまみのドラッグ操作中（ホバーより強く強調） |

#### 画面遷移 (View Transitions)

SPA遷移（View Transitions API）において、ユーザーの「没入」を断絶させないコンテキスト維持のアニメーションを定義します。

| トークン | 値 | 用途 |
|----------|-----|------|
| `--view-transition-fade` | `::view-transition-group(root)` | クロスフェード（標準）。`mix-blend-mode: plus-lighter` を併用し、輝くようなシームレスな遷移を実現。 |
| `--view-transition-slide-to-left` | `transform: translateX(-20px); opacity: 0;` | 階層を深く潜る際の遷移（進む）。 |
| `--view-transition-slide-to-right` | `transform: translateX(20px); opacity: 0;` | 階層を戻る際のアニメーション（戻る）。 |

#### 微細なフィードバック (Tactile Feedback)

操作の瞬間に物理的な手応え（Tactility）を与えるためのマイクロインタラクション定義。

| トークン | 値/キーフレーム | 用途 |
|----------|-----|------|
| `--animation-flash` | `flash var(--duration-fast) var(--ease-out)` | アイテムコピー時や完了アクション時の「発光」。 |
| `@keyframes flash` | `0% { background-color: var(--bg-surface-active); } 100% { background-color: transparent; }` | 一瞬だけハイライトして消える演出。 |

#### イージング (Easing)

物理法則の「模倣」ではなく、人間の認知に寄り添うカーブを選択します。

| トークン | 値 | 用途 | 制限 |
|----------|-----|------|------|
| `--ease-out` | `cubic-bezier(0.33, 1, 0.68, 1)` | 要素の出現 | — |
| `--ease-in` | `cubic-bezier(0.32, 0, 0.67, 1)` | 要素の退場 | — |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | 状態変化 | — |
| `--ease-spring` | `linear(0, 0.009, 0.035 2.1%, 0.141 4.4%, 0.723 12.9%, 0.938 16.7%, 1.017, 1.077, 1.121, 1.149 24.3%, 1.159, 1.163, 1.161, 1.154 29.9%, 1.129 32.8%, 1.051 39.6%, 1.017 43.1%, 0.991, 0.977 51%, 0.974 53.8%, 0.975 57.1%, 0.997 69.8%, 1.003 76.9%, 1.004 83.8%, 1)` | 自然な追従（Overdamped Spring） | **振動禁止** |

> **物理挙動の再定義 (Cognitive Synchronization):**
> アニメーションにおける「自然さ」とは、現実の慣性（遅延）を再現することではなく、**「ユーザーの意図と結果が直結していると感じられること」**です。
> したがって、指やカーソルの動きには即座に追従し、操作終了時には余韻を残さず、最短時間でピタリと収束する（Critically Damped 〜 Overdamped）挙動を徹底します。不要なバウンスや振動はノイズです。

## アクセシビリティ実装基準 (Accessibility Standards)

デザイン原則「普遍的な明瞭さ (Universal Clarity)」に基づき、WCAG 2.1 Level AA への準拠を最低ラインとし、すべてのユーザーに対してRouaultの体験を損なうことなく提供するための技術的保証です。

### 支援技術への配慮 (Assistive Technologies)

視覚的なデザインの都合で情報を隠す場合でも、スクリーンリーダー利用者には文脈を伝える義務があります。
「見えない情報」を提供する際は、標準化されたユーティリティクラス（`.sr-only`）を使用し、DOM構造からは削除（`display: none`）しないでください。

### モーション軽減 (Reduced Motion)

ユーザーの OS 設定 (`prefers-reduced-motion`) を尊重することは、不快感や健康被害（発作）を防ぐための必須要件です。
Rouaultでは、CSS変数による制御だけでなく、あらゆるアニメーションを物理的に無効化する堅牢な安全策を講じます。

| トークン | 値 |
| :--- | :--- |
| `--motion-duration` | `0ms` |
| `--motion-easing` | `linear` |

```css
@media (prefers-reduced-motion: reduce) {
  /* サードパーティ製品を含め、すべてのアニメーションを強制停止 */
  *, *::before, *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

### フォーカス・インジケータ (Focus Strategy)

「静謐さ」を優先するあまり、現在地（Focus）を見失わせてはなりません。
一方で、連続移動中（talling）の過剰な点滅は「ノイズ」となります。

Rouaultでは、**時間軸を持ったフォーカス表現（Temporal Focus）**を採用し、移動中は控えめに、停止した瞬間に明確化する挙動を定義します。

**トークン定義**

| トークン | 値 | 説明 |
|----------|-----|------|
| `--focus-ring-width` | `2px` | リングの太さ。 |
| `--focus-ring-offset` | `2px` | コンテンツとリングの距離。 |
| `--focus-ring-color` | `var(--primary)` | 最終的な強調色。 |
| `--focus-ring-color-subtle` | Defined in Colors | **移動中の色**。カラーシステムの `Interaction` セクションで定義。 |

**実装アプローチ:**

1.  **Adaptive Focus (Time-based Intensity)**:
    フォーカスリングは即座に描画されますが（アクセシビリティ必須）、最初は「控えめ（Subtle）」に表示され、数ミリ秒の遅延を経て「最大強度（Primary）」へ変更します。
    素早い移動中はこの変更前にフォーカスが外れるため、結果としてノイズが抑制されます。

    ```css
    /* Adaptive Focus Animation Definition */
    /* 0%〜25% (約50ms) は控えめな色を維持し、その後強く発色させる */
    @keyframes adaptive-focus {
      0%, 25% {
        outline-color: var(--focus-ring-color-subtle);
      }
      100% {
        outline-color: var(--focus-ring-color);
      }
    }

    :root {
      /* アニメーション設定: 200ms (50ms待機 + 150ms遷移) */
      --animation-focus: adaptive-focus 200ms var(--ease-out) forwards;
    }

    :focus-visible {
      outline-style: solid;
      outline-width: var(--focus-ring-width);
      outline-offset: var(--focus-ring-offset);
      
      /* アニメーション適用: フォーカス移動中(短時間)はSubtle色のまま終了する */
      animation: var(--animation-focus);
      
      /* フォールバック (アニメーション非対応環境用) */
      outline-color: var(--focus-ring-color);
    }
    
    /* 減衰モード時: 待機なしで即座に最終色を適用し、認知負荷を下げる */
    @media (prefers-reduced-motion: reduce) {
      :focus-visible {
        animation: none;
        outline-color: var(--focus-ring-color);
      }
    }
    ```
    
    > **Note:** キーボード操作の「フロー」を維持するため、停止した瞬間にだけ強い認知を与えるこの手法は、パイロットの計器デザイン（必要な時だけ光る）に通じます。

2.  **コンポーネント実装 (Shadow DOM):**
    各コンポーネントは Lion UI のロジックをベースに自前実装（ポーティング）されます。
    Shadow DOM 内であっても `:root` で定義された上記トークンを直接参照し、ハードコードを排除します。

### 強制カラーモード (Forced Colors Mode)

Windows ハイコントラストモードなど、OSレベルで色が強制される環境 (`forced-colors: active`) への対応です。
システムパレットによる上書きで情報（背景色やシャドウ）が消失するため、以下の戦略で構造と意味を維持します。

- **構造の維持**: ボーダーやスペーシングにより、背景色が無くても領域を認識可能にする。
- **アイコンの追従**: SVGアイコンは原則として `fill="currentColor"` または `stroke="currentColor"` を使用し、文字色と同じシステムカラーが適用されるようにする。
- **意味の担保**: 選択状態（Active）などを背景色だけで表現せず、ボーダーやアイコン（チェックマーク等）の変化を併用する。

**システムカラー・マッピング (System Color Mapping)**

`:root` 変数そのものをシステムカラーにマッピングすることで、全ての自前コンポーネントが自動的に標準挙動に追従するようにします。

| トークン | システムカラー (SystemMap) |
| :--- | :--- |
| `--border-default` | `CanvasText` |
| `--primary` | `Highlight` |

```css
@media (forced-colors: active) {
  :focus-visible {
    /* box-shadowによる疑似的なリングは消えるため、実線のアウトラインを強制 */
    outline: 3px solid CanvasText;
    box-shadow: none;
  }

  /* ボーダーレスなデザインでも、このモードでは境界線を明確化する */
  .card, .button {
    border: var(--border-width) solid ButtonText;
  }
}
```

---

## アーキテクチャとスタイリング

Rouaultは、`@lion/ui` (Web Components) の堅牢なアクセシビリティロジック（Controller/Mixin）をリファレンスとしつつ、すべてのコードをプロジェクトの管理下に置く **"Logic Porting"** 戦略を採用します。

### Single Source of Truth

すべてのデザイン決定（色、スペース、サイズ）は、CSS Custom Properties (`:root`) として定義され、ここが**唯一の真実**となります。
コンポーネント実装において、`:root` 変数に基づいたゼロベースのスタイリングを行います。

### ロジックのポーティングと完全なる自前実装 (Logic Porting & Full Control)

Lion UI を外部依存（`node_modules`）として利用するのではなく、**「リファレンス実装」**として扱います。
必要なコンポーネントのロジック（TypeScriptコード）をプロジェクト内の `src/lib/ui-core/` 等にコピー（ポーティング）し、Rouault のコードとして管理・保守します。

- **Logic (複製・改修)**: Lion UI のロジックをベースにしつつ、不要な機能（汎用すぎるバリデーション等）を削ぎ落とし、Rouault 専用に最適化します。`private` プロパティの壁に阻まれることなく、ステート管理やフォーカス制御を直接修正できます。
- **View (自前実装)**: 最初から Rouault のデザインシステムに合わせて記述します。

この戦略により、ブラックボックスを完全に排除し、アクセシビリティロジックの品質を維持しながら、コードベースの透明性と制御性を最大化します。

### スタイリング原則

1.  **トークン駆動 (Token-Driven)**:
    - コンポーネントスタイルは全て `:root` で定義された CSS Custom Properties に依存します。ハードコードされた値は使用せず、デザインシステムの変更が即座に全コンポーネントに伝播するようにします。

2.  **完全なカプセル化 (Full Encapsulation)**:
    - Shadow DOM を使用してスタイルを隔離します。コンポーネントは外部コンテキストに依存せず、どこに配置されても正しく表示される自己完結性（Self-contained）を持ちます。

3.  **属性による状態管理 (Attribute-Based State)**:
    - インタラクションによる状態変化（Hover, Focus, Active, Disabled）は、TypeScript ロジックが管理する HTML 属性（Host Attributes）に対してスタイルを定義することで表現します。これにより、ロジックと見た目の責務を明確に分離します。

---

## レイアウトシステム

### レスポンシブ・ブレークポイント

| トークン | 値 | 対象デバイス |
|----------|-----|--------------|
| `--bp-sm` | 640px | スマートフォン（横） |
| `--bp-md` | 768px | タブレット |
| `--bp-lg` | 1024px | ラップトップ |
| `--bp-xl` | 1280px | デスクトップ |
| `--bp-2xl` | 1536px | 大型モニター |

### レイアウト寸法 (Layout Dimensions)

UIの骨格を形成する固定領域のサイズ定義。計算式（`calc`）の基礎値として使用します。

| トークン | 値 | 用途 |
|----------|----|------|
| `--header-height` | `48px` | スティッキーヘッダーの高さ |
| `--sidebar-width` | `240px` | サイドバーの展開時幅 |
| `--width-reading` | `65ch` | **読むための最適幅**（約65文字）。全てのコンテンツエリアの基準。 |

### コンテナ戦略 (Containers)

「読む」ためのコンテナと「探す」ためのコンテナを明確に区別します。

| タイプ | 最大幅 | 用途 |
|--------|--------|------|
| **App Container** | `--bp-xl` (1280px) | ダッシュボード、一覧画面、設定 |
| **Reading Container** | `65ch` + Padding | **記事・メモ詳細**（没入用） |

```css
/* 標準コンテナ */
.container {
  width: 100%;
  max-width: var(--bp-xl);
  margin-inline: auto;
  padding-inline: var(--space-4);
}

/* 没入用コンテナ: 視線移動を最適化 */
.container-reading {
  max-width: var(--width-reading);
  width: 100%;
  margin-inline: auto;
  padding-inline: var(--space-4);
}

@media (min-width: 768px) {
  .container, .container-reading {
    padding-inline: var(--space-8);
  }
}
```

### レイヤー構造 (Z-index Scale)

コンテキストスタッキングを制御し、要素の競合を防ぐための厳格なスケール。

| トークン | 値 | 役割・用途 |
|----------|----|------------|
| `--z-negative` | -1 | **Ambient**: 装飾、背景グラフィック。 |
| `--z-base` | 0 | **Content**: 標準コンテンツ、フローに含まれる要素。 |
| `--z-fixed` | 100 | **Layout Frames**: ヘッダー、サイドバーなど画面に常駐する骨格。 |
| `--z-backdrop` | 200 | **Mask**: 集中モードやモーダル用の背景遮断レイヤー。 |
| `--z-modal` | 300 | **Dialog**: ユーザーの操作を独占する対話ウィンドウ。 |
| `--z-popover` | 400 | **Floating**: ドロップダウン、セレクト、ツールチップ。モーダルより上位に浮遊する。 |
| `--z-toast` | 500 | **Notification**: 一時的な通知メッセージ。 |
| `--z-max` | 1000 | **System**: スキップリンク、緊急エラーオーバーレイ、ドラッグ中の要素。 |

### アプリケーションシェル

#### ヘッダー

常に画面上部に固定され、アプリケーションの堅牢な「屋根」として機能します。
背面のコンテンツが透ける場合でも、**ボーダーと厳格なぼかし/透過処理によりUIとしての独立性を常に維持し**、可読性を損なわない設計とします。

| 項目 | 値 |
|------|------|
| **幅 (Width)** | **100%** (Viewport Width) |
| **コンテンツ幅** | 最大 `--bp-xl` (1280px)。画面幅がそれ以下の場合は 100% とします（中央揃え `margin-inline: auto`）。 |
| **レイアウト配置** | Grid Column: `1 / -1` (全幅配置)。サイドバー領域の上部もカバーします。 |
| **高さ** | 48px |
| **背景** | `--glass-panel`<br>原則として「空気感」を維持するために使用しますが、**可読性が最優先**です。文字情報への干渉が少しでも疑われる場合（複雑な背景画像がある場合や、コントラスト比が確保できない場合）は、即座に不透明（Solid / `--bg-default`）へフォールバックし、S/N比を死守します。 |
| **境界線** | `var(--border-width) solid var(--border-subtle)` (構造明示のため常時必須) |
| **Z-index** | `--z-fixed` (100) |
| **Scroll Padding** | アプリケーションの `scroll-padding-top` には、本ヘッダーの高さ + 余白を設定し、アンカー移動時にコンテンツがヘッダーに隠蔽されることを防ぎます。 |
| **State** | スクロール位置による外観の変化（不透明度の切り替え等）は行わない。常に一定のS/N比を維持する。 |
| **レイアウト構成** | **[左]** サイドバートリガー & ロゴ <br> **[中央]** パンくずリスト（Context） <br> **[右]** 検索トリガー & ユーザーメニュー <br> ※ モバイル時はパンくずリストを省略し、タイトルや検索のみにする等、`width` に応じて優先度を制御します。 |

> **Note:** `--glass-panel` が使用できない環境（`backdrop-filter` 非対応）や、アクセシビリティ設定（ハイコントラスト）下では、自動的に不透明な背景色（`--bg-default`）にフォールバックし、可読性をUphold（死守）します。

#### サイドバー

「探索（Navigation）」と「読書（Reading）」の両立をサポートします。
視線移動のノイズとなる「本文のリフロー（位置ズレ）」を制御し、画面サイズに応じた最適な没入環境を提供します。

| 項目 | 値 |
|------|------|
| **幅** | 240px |
| **背景** | `var(--bg-surface-1)` |
| **境界線** | `border-right: var(--border-width) solid var(--border-subtle)` |

**Immersion Strategy (Visibility):**

1.  **Large Screen (`>= xl`): Structural Silence (構造的静寂)**
    *   **Expanded (Default)**: コンテンツの安定性（Stability）を維持するため、サイドバーは物理的に領域を確保します。
        *   **Hierarchical Silence**: 色を薄くするのではなく、**「余白」と「タイポグラフィ」**によって優先順位を制御します。ナビゲーション項目は `--fg-muted` を基準とし、現在地（Active）のみを `--primary` と物理的なボーダー/背景色で強調することで、迷いなく構造を伝えます。マウスオーバーや凝視を強制しません。
    *   **Collapsed (Focus)**: さらに深い没入が必要な場合、サイドバーを格納します。
        *   **Trigger**: ショートカット（`Cmd+B`）またはヘッダー左端の常設ボタン。
        *   **Dynamic Centering (Zen Mode)**: サイドバー格納時、本文コンテナは滑らかなアニメーション（`--ease-spring`）を伴って画面中央へ移動します。
            *   **Overdamped Convergence**: 物理的な「バネ」の模倣は行いません。振動（Bounce）は一切許容せず、**過減衰（Overdamped）による「吸い付くような収束」**を徹底し、原則3「デジタルの触感」を体現します。
            *   **Symmetry & Stability**: 片側に寄った不安定な空白（Negative Space）を排除し、左右対称の安定したレイアウトを提供することで、長時間の読書におけるストレスを軽減します。
            *   サイドバーを閉じる行為を「集中モード（Zen Mode）への移行」と定義し、コンテンツ以外のノイズを視界から排除します。
        *   **Animation**:
            *   Layout Thrashing を避けるため、CSS Gridの `fr` 単位の変化または `transform` を適切に組み合わせ、再描画コストを抑えた遷移を実装します。
            *   Duration: **300ms**（移動距離に応じた自然な遷移）。
2.  **Small Screen (`< xl`): Overlay (オーバーレイ)**
    *   **基本動作**: サイドバーは常に非表示（Collapsed）から始まり、トリガーによってコンテンツの上に重なって（Overlay）表示されます。
    *   **No Pinning**: タブレットサイズでの「ピン留め（常時表示）」はサポートしません。オーバーレイとリフロー（押し出し）の混在はユーザーのメンタルモデルを混乱させるためです。常時表示が必要な場合は、適切な広い画面（Desktop）を利用することを促します。

#### メインコンテンツ (Main Content)

コンテンツ領域は、デバイスサイズに応じた最適な「読むためのスペース」を確保し、ナビゲーション（サイドバー）および目次（TOC）との関係性を厳密に定義します。
Web標準のセマンティックHTML（`<nav>`, `<main>`, `<aside>`）とも一致させます。

| ブレークポイント | 構成 | サイドバー (Nav) | コンテンツ (Main) | TOC / Aside |
|------------------|------|------------------|-------------------|-------------|
| **Mobile** (`< md`) | **Single Column** | Overlay (Sheet) | 流動的(Padding: `--space-4`) | Bottom Sheet |
| **Tablet** (`md` - `xl`) | **Single Column** | Overlay | 流動的(Padding: `--space-8`) | Hidden / Bottom Sheet |
| **Desktop** (`>= xl`) | **Three Columns** | **Fixed** (240px) | **Fluid w/ Max-Width** | **Sticky** (240px) |

**レイアウト戦略:**

1.  **CSS Grid Structure & Semantic Layout**:
    アプリケーションシェルは CSS Grid により堅牢に定義されます。
    
    ```css
    :root {
      --sidebar-width: 240px;
      --aside-width: 240px; /* TOCエリア */
      /* --width-reading (65ch) は Layout Dimensions で定義済み */
    }

    .app-shell {
      display: grid;
      /* Desktop: [Nav] [Content] [TOC] */
      /* minmax(0, 1fr) はGrid内でのコンテンツ溢れ防止に必須 */
      grid-template-columns: 
        var(--sidebar-width) 
        minmax(0, 1fr) 
        var(--aside-width);
      grid-template-rows: var(--header-height) 1fr;
    }
    
    /* 読むための物理的制約 (Physical Constraints for Reading) */
    .main-content {
      width: 100%;
      max-width: var(--width-reading);   /* 最適幅で制限 */
      margin-inline: auto;               /* 中央揃え */
    }

    @media (max-width: 1280px) {
      .app-shell {
        /* Mobile/Tablet: シングルカラム */
        grid-template-columns: 100%;
      }
      /* TOCエリアは隠し、トリガー経由のBottom Sheetで表示する */
      .aside-toc {
        display: none; 
      }
    }
    ```

2.  **スクロール独立性と到達可能性 (Scroll Independence & Reachability)**:
    メインコンテンツのみが Window Scroll (ネイティブスクロール) を使用し、サイドのナビゲーションは Sticky 配置されます。
    
    **重要 (Sidebar Trap Prevention):**
    Sticky 要素は画面の高さより長くなる可能性があるため、**必ず内部スクロールを有効にします**。これを行わない場合、画面外にはみ出した下部のリンクに到達できなくなります。

    ```css
    .sidebar-nav, 
    .aside-toc {
      position: sticky;
      top: var(--header-height);
      /* ヘッダー分を引いた高さまで。これを超えたら内部でスクロール */
      max-height: calc(100vh - var(--header-height));
      overflow-y: auto;
      overscroll-behavior: contain; /* 親へのスクロール連鎖防止 */
    }
    ```

#### 目次 (Table of Contents)

「操作パネル」としての機能を超え、**「周辺視野で無意識に現在地を感じ取れる計器（Indicator）」**として定義します。
「見えない（Low Contrast）」ことではなく、「密度が低い（Low Density）」ことによって静寂（Silence）を作ります。

| 項目 | 値 |
|------|------|
| **幅** | 240px (`--aside-width`) |
| **位置** | コンテンツ右側 (Sticky) |
| **タイポグラフィ** | `--text-xs` (12px) / `--font-medium` (500) |
| **ボーダー** | なし（インジケーターの軌道のみ存在） |

**Visual Silence Strategy:**

1.  **Low Density (Not Low Contrast)**
    *   **WCAG Compliance**: 文字色は `--fg-muted`（WCAG AA準拠）を使用し、**「凝視」しなくても読める状態**を維持します。
    *   **Weight Reduction**: フォントサイズ (`12px`) とウェイト (`400`) を最小化することで「視覚的重み（Visual Weight）」を下げ、メインコンテンツの邪魔をしない「背景」としての地位を確立します。

2.  **Dynamic Focus (No Hardware Dependency)**
    *   マウスホバーやクリックを強制せず、**スクロール位置（Reading Position）に連動して**情報のS/N比を動的に最適化します。
    *   **Active Item**:
        *   色: `--primary` (High Contrast)
        *   装飾: 左端にインジケーターバー (`2px solid var(--primary)`)
        *   役割: **「今ここを読んでいる」という確信**を周辺視野に与える。
    *   **Neighbor & Distant Items**:
        *   色: `--fg-muted` (Mid Contrast)
        *   役割: 文脈の前後関係を示す。隠蔽はせず、常に構造が見える状態を保つ。

3.  **Collapsed State Behavior (Hybrid Zen Logic)**
    *   **Space Awareness**: サイドバー格納時（Zen Mode）であっても、本文コンテナ（中央配置）と画面右端の間に十分な余白（目安: `> 1400px`）がある場合、**TOCは消滅せず、その余白に常駐し続けます。**
    *   **Collision Fallback (Strip Mode)**: 画面幅が狭く（`< 1400px`）、本文とTOCが干渉する場合、TOCは自動的に**「右端のインタラクティブ・ストリップ」**へと変形します。
        *   **Visual**: 幅 `24px` 程度のバーとして右端に常駐し、現在地（Active Indicator）のみを表示します。全体の中での位置関係を示す「スクロールマップ」としての機能を維持します。
        *   **Action**: クリック（またはキーボード操作）によって展開できます。マウスオーバー（ホバー）による展開は採用せず、スクロールバー操作時の誤爆を防ぎます。ただし、インタラクティブ要素であることを示すため、`cursor: pointer` の適用と、クリック時（`:active`）の視覚フィードバックは必須とします。
            *   **Hit Area Requirement**: 視覚的な幅が `24px` であっても、**物理的なヒットエリアは `44px` 以上**を確保します（`::after` 疑似要素や不可視パディングを使用）。これにより、デザイン原則4「普遍的な明瞭さ」に準拠し、タブレット等のタッチ操作におけるユーザビリティを保証します。

---

## 技術実装ガイドライン

### ページ遷移 (View Transitions / Zero Latency)

原則3「Digital Tactility」に基づき、思考を分断しない**即応的な（Snappy）**画面遷移を実現します。物理的な慣性を模倣する緩慢なアニメーションは排除し、ユーザーの認知コンテキストを維持するための最小限のクロスフェードまたは即時置換を用います。

```css
@view-transition {
  navigation: auto;
}

::view-transition-group(*) {
  /* 思考の速度を妨げない短時間を厳守 */
  animation-duration: 0.2s;
  animation-timing-function: cubic-bezier(0, 0, 0.2, 1); /* Linearに近いOut */
}
```

### 段階的機能強化と普遍的な明瞭さ (Progressive Enhancement)

原則4に基づき、JavaScriptや高度なCSS（`backdrop-filter`等）が利用できない環境こそが、このアプリケーションの基礎（Baseline）です。機能の有無にかかわらず、原則1「没入のための構造」である**タイポグラフィとスペーシングのリズムは常に完璧に維持されなければなりません。**

#### 視覚効果の意図的フォールバック

Glassmorphismは「背後の気配」を残すことでフローを維持する機能的装飾です。非対応ブラウザでは、不透明色で可読性を担保しつつ、ボーダー等で明確なレイヤー階層を示します。

```css
.glass-panel {
  /* Baseline: 明確な境界線による構造化 */
  background: var(--bg-default);
  border: 1px solid var(--border-subtle);
}

@supports (backdrop-filter: blur(12px)) {
  .glass-panel {
    /* Enhanced: 背後のコンテキストを感じさせる透過性 */
    background: rgba(var(--bg-rgb), 0.8);
    backdrop-filter: blur(12px);
    /* 境界線は光の反射表現へと役割を変える */
    border-color: var(--border-ghost);
  }
}
```

#### JavaScript無効時の対応

- **コンテンツ**: サーバーサイドレンダリング（SSR/SSG）により、JavaScript無効時でも**コンテンツの表示と読書体験**は完全に損なわれません。
- **ナビゲーション**: 標準の `<a>` リンクを使用し、基本機能による遷移を保証します。

```html
<noscript>
  <style>
    .js-only { display: none !important; }
  </style>
  <p class="noscript-notice">検索・フィルタ機能にはJavaScriptが必要です。</p>
</noscript>
```

---

## 参照・インスピレーション

- [Linear](https://linear.app/) — **主要インスピレーション**: 高密度・プロフェッショナルデザイン
- [Raycast](https://raycast.com/) — **主要インスピレーション**: コンパクトなUI
- [Vitest Documentation](https://vitest.dev/) — 洗練されたダークモード
