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
  - モーダルやドロップダウンを開いた際は、フォーカスを内部に移動し、閉じるまで閉じ込める（Focus Trap）。
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

```css
:root {
  /* グローバル設定 */
  --chroma-neutral: 0.01;  /* 無彩色にもわずかな色味を持たせ、冷たさを消す */
  --chroma-ui: 0.12;      /* UI要素の標準的な鮮やかさ */
  
  /* ベース色相設定 (Theme Hue) */
  --hue-primary: 265;     /* Deep Violet */
  --hue-base: 265;        /* 背景色にもPrimaryの気配をわずかに混ぜる */
}

/* ライトモード */
:root {
  /* Background: L=99% (Paper White) */
  --color-background: oklch(99% var(--chroma-neutral) var(--hue-base));
  
  /* Foreground: L=20% (Deep Ink) */
  --color-foreground: oklch(20% 0.03 var(--hue-base));

  /* Primary: 視認性の高い L=55% */
  --color-primary:       oklch(55% 0.22 var(--hue-primary));
  --color-primary-hover: oklch(50% 0.22 var(--hue-primary)); /* Lを下げるだけで安全に濃くできる */
}

/* ダークモード */
@media (prefers-color-scheme: dark) {
  :root {
    /* Background: 真っ黒ではなく L=12% 程度の深みのある色 */
    --color-background: oklch(12% 0.02 var(--hue-base));
    
    /* Foreground: まぶしすぎない L=90% */
    --color-foreground: oklch(90% 0.01 var(--hue-base));

    /* Primary: 暗背景で映える L=65% */
    --color-primary:       oklch(65% 0.18 var(--hue-primary));
    --color-primary-hover: oklch(70% 0.18 var(--hue-primary)); /* Lを上げて「発光感」を強める */
  }
}
```

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

```css
:root {
  --delta-l: 0%; /* デフォルト補正値 */
}

.tag-music { 
  --tag-hue: 280; 
}

.tag-literature { 
  --tag-hue: 85; 
  --delta-l: 5%; /* 明るさブースト */
}

.tag {
  /* 基本明度 + 補正値(Delta) で最終色を決定 */
  background: oklch(calc(95% + var(--delta-l)) 0.04 var(--tag-hue));
  color:      oklch(calc(55% + var(--delta-l)) 0.15 var(--tag-hue));
  border:     1px solid oklch(calc(90% + var(--delta-l)) 0.06 var(--tag-hue));
}
```

### タイポグラフィ

#### フォントファミリー

RouaultはLinearをインスピレーション元としていますが、**日本語主体のコンテンツ**という本質的な違いがあります。そのため、欧文フォント（Inter）ではなく、日本語に最適化されたフォント戦略を採用します。

```css
--font-sans: 
  'Noto Sans JP Variable',
  'Noto Sans JP',
  -apple-system,
  BlinkMacSystemFont,
  'Hiragino Sans',
  'Hiragino Kaku Gothic ProN',
  'Yu Gothic UI',
  'Segoe UI',
  'Meiryo',
  sans-serif;

--font-mono: 
  'JetBrains Mono', 
  'Fira Code', 
  'Consolas',
  'Liberation Mono',
  'Courier New',
  monospace;
```

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

#### フォントウェイト (Font Weight)

Variable Font を採用していますが、視覚的一貫性を保つため、使用するウェイトは厳選された4種類に限定します。中間の数値を無秩序に使用することは禁止します。

| トークン | 数値 | 用途 |
|----------|------|------|
| `--font-normal` | `400` | **本文標準**。可読性が最も高いウェイト。 |
| `--font-medium` | `500` | ボタン、UIラベル、強調された本文。 |
| `--font-semibold` | `600` | 小見出し、強調ラベル。 |
| `--font-bold` | `700` | 大見出し、強い強調。 |

> **Note:** 日本語フォントは欧文に比べて「太く見える」傾向があるため、欧文デザイン（Interなど）で `Medium (500)` が使われる箇所でも、日本語では `Normal (400)` が適している場合があります。過度な太字は「ノイズ」となるため、慎重に選択します。

#### フォントサイズ：高密度設計 (High Density)

| トークン | サイズ | 行の高さ | 用途 |
|----------|--------|----------|------|
| `--text-2xs` | 0.6875rem (11px) | 1rem | 極小ラベル |
| `--text-xs` | 0.75rem (12px) | 1rem | キャプション、バッジ |
| `--text-sm` | 0.8125rem (13px) | 1.25rem | 補助テキスト、メタ情報 |
| `--text-base` | 0.875rem (14px) | 1.5rem | **本文（デフォルト）** |
| `--text-lg` | 1rem (16px) | 1.5rem | リード文 |
| `--text-xl` | 1.125rem (18px) | 1.75rem | 小見出し |
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

#### 本文幅 (Prose Width)

記事本文や長文コンテンツの可読性を確保するため、テキストの最大幅を制限します。

```css
.prose {
  font-size: 1rem; /* 16px: 読むためのサイズ（UIの14pxとは区別） */
  line-height: 1.75; /* ゆったりとした行間で没入感を高める */
  max-width: 65ch; /* 最適な可読性のための幅 */
  margin-inline: auto;
}

/* 画像やコードブロックは幅制限を解除 */
.prose img,
.prose pre,
.prose table {
  max-width: none;
  width: calc(100% + var(--space-8));
  margin-inline: calc(-1 * var(--space-4));
}

@media (min-width: 768px) {
  .prose img,
  .prose pre,
  .prose table {
    width: calc(100% + var(--space-16));
    margin-inline: calc(-1 * var(--space-8));
  }
}
```

> **設計意図:** `65ch`（約65文字幅）は可読性研究に基づく最適な行長。「コンテンツへの没入感」を高める重要な要素。画像やコードブロックは親コンテナまで拡張し、視覚的な変化を提供。

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
| `--control-height-sm` | `24px` | 小さなツールバー、フィルタ、密度情報の高い操作部 |
| `--control-height-md` | `32px` | **標準**。一般的な入力フォーム、ボタン |
| `--control-height-lg` | `40px` | ヒーローエリアの検索バー、目立つアクション |

> **Note:** 一般的な `40px` (md) / `48px` (lg) よりも一段階小さい「高密度 (High Density)」な設計を採用しています。

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
| `--space-20` | 5rem (80px) | **シーン**: 画面全体の切り替わり、ヒーローエリア |

### 形状 (Shapes)

#### ボーダー (Borders)

境界線は「仕切り」ではなく「構造の暗示」として機能させます。

| トークン | 値 | 用途 |
|----------|-----|------|
| `--border-width` | `1px` | **標準**。UIコンポーネントの境界線（繊細さを維持）。 |
| `--border-width-thick` | `2px` | 強調表示、アクティブなタブの下線。 |

#### 角丸 (Border Radius)

選択肢を最小限に絞ることで、迷いをなくし、UI全体に一貫した「Tensor（張力）」を与えます。
`6px` と `8px` のような識別困難な差分を排除し、明確な意図を持って使い分けます。

| トークン | 値 | 用途 |
|----------|-----|------|
| `--radius-sm` | 0.25rem (4px) | 内部要素、タグ、小さなインタラクション要素 |
| `--radius-md` | 0.5rem (8px) | **標準**: ボタン、入力フィールド、カード、ポップオーバー |
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

#### シャドウ

**ライトモード**

| トークン | 値 | 用途 |
|----------|-----|------|
| `--shadow-sm` | `0 1px 2px oklch(0% 0 0 / 0.05)` | 微細な浮遊感 |
| `--shadow-md` | `0 4px 6px -1px oklch(0% 0 0 / 0.1)` | カード、ボタン |
| `--shadow-lg` | `0 10px 15px -3px oklch(0% 0 0 / 0.1)` | ドロップダウン |
| `--shadow-xl` | `0 20px 25px -5px oklch(0% 0 0 / 0.1)` | モーダル |
| `--shadow-glow` | `0 0 8px oklch(55% 0.22 var(--hue-primary) / 0.6)` | **フォーカス、アクティブ状態の強調**（装飾としては使用しない） |

**ダークモード**

ダークモードでは影が見えにくいため、主に **Elevation Tones（背景色の明度差）** で高さを表現します。シャドウは補助的に使用します。

| トークン | 値 | 用途 |
|----------|-----|------|
| `--shadow-dark-sm` | `0 1px 2px oklch(0% 0 0 / 0.3)` | 微細な浮遊感 |
| `--shadow-dark-md` | `0 4px 8px oklch(0% 0 0 / 0.4)` | カード、ボタン |
| `--shadow-dark-lg` | `0 8px 16px oklch(0% 0 0 / 0.5)` | ドロップダウン |
| `--shadow-dark-glow` | `0 0 12px oklch(65% 0.18 var(--hue-primary) / 0.5)` | **フォーカス、アクティブ状態の強調** |

#### 質感・テクスチャ (Surfaces)

モダンで奥行きのある質感を表現するためのユーティリティ定義。モード（Light/Dark）に応じて適切な色が適用されるように変数を経由します。装飾的なノイズは避け、機能的な区切りや状態を示すために使用します。

| トークン | 推奨実装 | 用途 |
|----------|----------|------|
| `--glass-panel` | `background: oklch(from var(--color-background) l c h / 0.85); backdrop-filter: blur(12px);` | スティッキーヘッダー、モーダル背景（コンテンツの透けすぎを防ぐ） |
| `--border-subtle` | `border: 1px solid var(--color-border-transparent);` | 繊細な区切り線（モード依存） |
| `--surface-active` | `background: oklch(from var(--color-primary) l c h / 0.08);` | 選択済みアイテム、アクティブな行 |

#### ダークモード表現 (Elevation Tones)

ダークモードでは影が見えにくいため、背景色の明度で「高さ（Elevation）」を表現します。

| トークン | 明度 (OKLCH) | 用途 |
|----------|-----|------|
| `--bg-surface-0` | `oklch(12% 0.02 var(--hue-base))` | アプリ背景（最下層） |
| `--bg-surface-1` | `oklch(16% 0.02 var(--hue-base))` | カード、サイドバー |
| `--bg-surface-2` | `oklch(21% 0.02 var(--hue-base))` | ドロップダウン、ポップオーバー |
| `--bg-surface-3` | `oklch(27% 0.02 var(--hue-base))` | モーダル、強調表示 |

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

#### イージング (Easing)

物理法則の「模倣」ではなく、人間の認知に寄り添うカーブを選択します。

| トークン | 値 | 用途 | 制限 |
|----------|-----|------|------|
| `--ease-out` | `cubic-bezier(0.33, 1, 0.68, 1)` | 要素の出現 | — |
| `--ease-in` | `cubic-bezier(0.32, 0, 0.67, 1)` | 要素の退場 | — |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | 状態変化 | — |
| `--ease-bounce` | `cubic-bezier(0.34, 1.3, 0.64, 1)` | 強調インタラクション | **控えめな強調のみ** |
| `--ease-spring` | `linear(0 0%, ...)` | 自然な追従 | **Overdamped必須** |

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

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-duration: 0ms;
    --motion-easing: linear;
  }
  
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
キーボード操作時（`:focus-visible`）には、**実装技術（Shadow DOM内外）を問わず**以下の統一されたフォーカスリングを描画します。

**トークン定義**

| トークン | 値 | 説明 |
|----------|-----|------|
| `--focus-ring-width` | `2px` | リングの太さ。視認性を確保する最小値。 |
| `--focus-ring-offset` | `2px` | コンテンツとリングの距離。同化を防ぐ分離帯。 |
| `--focus-ring-color` | `var(--color-primary)` | **原則**としてプライマリカラーを使用。 |

**実装アプローチ:**

1.  **グローバル要素:**
    `:root` スコープで `:focus-visible` を一括定義します。

    ```css
    :focus-visible {
      outline: var(--focus-ring-width) solid var(--focus-ring-color);
      outline-offset: var(--focus-ring-offset);
    }
    ```

2.  **コンポーネント実装 (Shadow DOM):**
    各コンポーネントは Lion UI のロジックをベースに自前実装（ポーティング）されます。
    Shadow DOM 内であっても `:root` で定義された上記トークンを直接参照し、ハードコードを排除します。

### 強制カラーモード (Forced Colors Mode)

Windows ハイコントラストモードなど、OSレベルで色が強制される環境 (`forced-colors: active`) への対応です。
`box-shadow` や背景色がシステムのパレットで上書きされ消失するため、境界線はOSのシステムカラー（System Colors）を使用して構造を維持します。

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

### システムレベルの強制カラー対応 (Forced Colors)

アクセシビリティ担保のため、Windowsハイコントラストモード等の `forced-colors` 環境下においても、デザインシステムは機能し続けなければなりません。
`:root` 変数そのものをシステムカラーにマッピングすることで、全ての自前コンポーネントが自動的にこれに追従します。

```css
@media (forced-colors: active) {
  :root {
    --color-border: CanvasText;
    --color-primary: Highlight;
  }
  
  :focus-visible {
    /* box-shadowによる疑似的なリングは消えるため、実線のアウトラインを強制 */
    outline: 3px solid CanvasText;
    box-shadow: none;
  }

  /* ボーダーレスなデザインでも、このモードでは境界線を明確化する */
  .card, .button {
    border: 1px solid ButtonText;
  }
}
```

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
  max-width: 65ch; /* 文字サイズに基づく相対幅 */
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

| トークン | 値 | 用途 |
|----------|----|------|
| `--z-negative` | -1 | **アンビエント背景** (State Indication)。純粋な装飾は排除する。 |
| `--z-base` | 0 | 標準コンテンツ |
| `--z-sticky` | 100 | スティッキーヘッダー、ナビゲーション |
| `--z-dropdown` | 200 | ドロップダウンメニュー、ツールチップ |
| `--z-overlay` | 300 | モーダル背景（オーバーレイ） |
| `--z-modal` | 400 | ダイアログ、モーダル本体 |
| `--z-toast` | 500 | 通知トースト |
| `--z-critical` | 900 | システムエラー、緊急アラート |
| `--z-skip-link` | 1000 | キーボードナビゲーション用スキップリンク（最上位） |

### アプリケーションシェル

#### ヘッダー

高さや配置だけでなく、背面のコンテンツによるノイズ（S/N比の低下）を徹底して排除します。

| 項目 | 値 |
|------|------|
| **高さ** | 48px |
| **背景** | `--glass-panel` |
| **境界線** | `1px solid var(--border-subtle)` (視認性確保のため必須) |
| **Z-index** | `--z-sticky` (100) |

> **Note:** コンテンツが裏にスクロールされた際は、背景の不透明度を上げるか、境界線を明確にすることで、文字の可読性を最優先します（Universal Clarity）。

#### サイドバー

「探索（Navigation）」と「読書（Reading）」のモード切替をサポートします。
視線移動のノイズとなる「本文のリフロー（位置ズレ）」を徹底して防ぐため、画面サイズに応じた戦略を採用します。

| 項目 | 値 |
|------|------|
| **幅** | 240px |
| **背景** | `--bg-surface-1` (ダーク) / `--color-background` (ライト) |
| **境界線** | `border-right: 1px solid var(--border-subtle)` (ライトモード時の構造明示) |

**Focus Mode Strategy:**

1.  **Large Screen (`>= xl`): Dimming (減光)**
    *   サイドバーの領域（幅）は維持したまま、不透明度を `opacity: 0.05` 程度まで下げて視界から消します。
    *   **理由**: 本文の位置を1ピクセルも動かさないため。マウスオーバーで即座に復帰させます。
2.  **Small Screen (`< xl`): Overlay (オーバーレイ)**
    *   サイドバーは完全に隠れ、呼び出し時はコンテンツの上に重なって（Overlay）表示されます。
    *   **理由**: 限られた画面幅を有効活用するため。本文を押し出すリフローは行いません。

---

## 技術実装ガイドライン

### ページ遷移 (View Transitions)

SPAライクな滑らかな画面遷移を実現するためのガイドライン。

```css
@view-transition {
  navigation: auto;
}
```

### 段階的機能強化 (Progressive Enhancement)

デザイン原則4に基づき、基本機能は常に動作し、拡張機能は対応ブラウザでのみ適用されます。JavaScript無効時や古いブラウザでもコンテンツは閲覧可能です。

#### 機能検出フォールバック例

```css
/* backdrop-filter のフォールバック */
.glass-panel {
  background: var(--color-background); /* フォールバック */
}

@supports (backdrop-filter: blur(12px)) {
  .glass-panel {
    background: rgba(var(--bg-rgb), 0.8);
    backdrop-filter: blur(12px);
  }
}
```

#### JavaScript無効時の対応

- **コンテンツ**: サーバーサイドレンダリング（SSR/SSG）により、JavaScript無効でもコンテンツは表示される。
- **ナビゲーション**: 標準の `<a>` リンクを使用し、JS無効時も遷移可能。

```html
<noscript>
  <style>
    .js-only { display: none !important; }
  </style>
  <p class="noscript-notice">検索・フィルタ機能にはJavaScriptが必要です。</p>
</noscript>
```

### 実装チェックリスト

- [ ] コントラスト比 4.5:1 以上を確保
- [ ] フォーカス状態の実装（`:focus-visible`）
- [ ] スクリーンリーダー対応（`.sr-only`、ARIA属性）
- [ ] CSS Custom Properties（トークン）を定義
- [ ] ダークモード対応（`prefers-color-scheme`）
- [ ] トランジション/アニメーションの実装
- [ ] Lion UI コンポーネントへのスタイル適用

---

## 参照・インスピレーション

- [Linear](https://linear.app/) — **主要インスピレーション**: 高密度・プロフェッショナルデザイン
- [Raycast](https://raycast.com/) — **主要インスピレーション**: コンパクトなUI
- [Vitest Documentation](https://vitest.dev/) — 洗練されたダークモード
