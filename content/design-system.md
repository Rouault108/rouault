# Rouault デザインシステム

## 概要

RouaultのデザインシステムはVitestやNext.jsドキュメントに触発された、モダンでワクワクするようなユーザー体験を提供することを目指しています。アクセシビリティを最優先としながら、洗練されたアニメーションと直感的なインタラクションを通じて、コンテンツへの没入感を高めます。

### デザイン原則

1. **Accessibility First** — WCAG 2.1 Level AAに準拠し、すべてのユーザーがコンテンツにアクセスできること
2. **Delightful Motion** — 意味のあるアニメーションでインタラクションに生命を与える
3. **Respectful Defaults** — `prefers-reduced-motion`を尊重し、ユーザーの選択を優先する
4. **Progressive Enhancement** — 基本機能は常に動作し、拡張機能は段階的に追加される

### 実装基準 (Accessibility)

- **スクリーンリーダー対応**: 視覚的に情報を隠す場合は `.sr-only` クラスを使用し、`display: none` は使用しない。

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

- **フォーカスリング**: `:focus-visible` には必ず `outline-offset: 2px` を設定し、コンテンツとの分離を明確にする。
- **コントラスト**: テキストと背景のコントラスト比は 4.5:1 以上（大きな文字は 3:1 以上）を確保する。


---

## カラーシステム

カラーモードの切り替えは `prefers-color-scheme` メディアクエリを使用します。

```css
:root {
  --color-background: #ffffff;
  --color-foreground: #111827;
  /* ... その他のライトモード変数 */
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #0a0a0a;
    --color-foreground: #ededed;
    /* ... その他のダークモード変数 */
  }
}
```

### ライトモード

| トークン | 値 | 用途 |
|----------|-----|------|
| `--color-background` | `#ffffff` | ページ背景 |
| `--color-background-subtle` | `#f9fafb` | カード、セクション背景 |
| `--color-foreground` | `#111827` | 本文テキスト |
| `--color-foreground-muted` | `#6b7280` | 補助テキスト |
| `--color-primary` | `#3b82f6` | プライマリアクション、リンク |
| `--color-primary-hover` | `#2563eb` | プライマリホバー状態 |
| `--color-accent` | `#8b5cf6` | アクセント、ハイライト |
| `--color-border` | `#e5e7eb` | ボーダー、区切り線 |
| `--color-border-hover` | `#d1d5db` | ホバー時のボーダー |

### ダークモード

| トークン | 値 | 用途 |
|----------|-----|------|
| `--color-background` | `#0a0a0a` | ページ背景 |
| `--color-background-subtle` | `#171717` | カード、セクション背景 |
| `--color-foreground` | `#ededed` | 本文テキスト |
| `--color-foreground-muted` | `#a1a1aa` | 補助テキスト |
| `--color-primary` | `#60a5fa` | プライマリアクション、リンク |
| `--color-primary-hover` | `#93c5fd` | プライマリホバー状態 |
| `--color-accent` | `#a78bfa` | アクセント、ハイライト |
| `--color-border` | `#27272a` | ボーダー、区切り線 |
| `--color-border-hover` | `#3f3f46` | ホバー時のボーダー |

### セマンティックカラー（状態色）

| トークン（役割） | 色相 (Hue) | 用途 |
|------------------|------------|------|
| `--color-success` | 緑 (142) | 完了、成功、有効 |
| `--color-warning` | 黄 (48) | 注意、非推奨、処理中 |
| `--color-error` | 赤 (0) | エラー、削除、危険 |
| `--color-info` | 青 (217) | 情報通知、ヒント |

### リンクスタイル

| 状態 | スタイル |
|------|----------|
| **Default** | `color: var(--color-primary); text-decoration: none;` |
| **Hover** | `color: var(--color-primary-hover); text-decoration: underline;` |
| **Focus** | `outline: 2px solid var(--color-primary); outline-offset: 2px;` |

### グラデーション

```css
/* ヒーローセクション用 */
--gradient-hero: linear-gradient(135deg, var(--color-primary), var(--color-accent));

/* テキストグラデーション */
--gradient-text: linear-gradient(90deg, #3b82f6, #8b5cf6);

/* 背景グロー効果 */
--glow-primary: radial-gradient(ellipse at center, rgba(59, 130, 246, 0.15), transparent 70%);
```

### ダークモード表現（Elevation Tones）

ダークモードでは影が見えにくいため、背景色の明度で「高さ（Elevation）」を表現します。

| トークン | 明度 | 用途 |
|----------|-----|------|
| `--bg-surface-0` | `#0a0a0a` | アプリ背景（最下層） |
| `--bg-surface-1` | `#171717` | カード、サイドバー |
| `--bg-surface-2` | `#262626` | ドロップダウン、ポップオーバー |
| `--bg-surface-3` | `#404040` | モーダル、強調表示 |

### HSL Color Workflow

コンポーネントの色は純色ではなく、HSL値 (`--h`, `--s`, `--l`) をベースに計算します。これにより、色相を変更するだけで全てのステート（Hover, Activeなど）の濃淡バリエーションが自動生成され、統一感のあるデザインが可能になります。

```css
/* 定義例 */
--h: 220; --s: 90%; --l: 55%;

--bg-default: hsl(var(--h), var(--s), var(--l));
--bg-hover:   hsl(var(--h), var(--s), calc(var(--l) - 5%)); /* 自動計算 */
```

---

## グリッド & レイアウト

レスポンシブかつ整列されたデザインのためのグリッドシステム。

| プロパティ | 値 | 実装例 |
|------------|-----|--------|
| **Columns** | 12カラム | `grid-template-columns: repeat(12, 1fr);` |
| **Gutter (Gap)** | 24px (md以上) | `gap: var(--space-6);` |
| **Margin** | 32px (md以上) | コンテナの左右パディング |

### コンテナサイズ

```css
.container {
  width: 100%;
  max-width: var(--bp-xl); /* 1280px */
  margin-inline: auto;
  padding-inline: var(--space-4);
}

@media (min-width: 768px) {
  .container {
    padding-inline: var(--space-8);
  }
}
```

---

## 質感・テクスチャ（Surfaces）

モダンで奥行きのある質感を表現するためのユーティリティ定義。モード（Light/Dark）に応じて適切な色が適用されるように変数を経由します。

| トークン | 推奨実装 | 用途 |
|----------|----------|------|
| `--glass-panel` | `background: rgba(var(--bg-rgb), 0.8); backdrop-filter: blur(12px);` | スティッキーヘッダー、モーダル背景 |
| `--border-subtle` | `border: 1px solid var(--color-border-transparent);` | 繊細な区切り線（モード依存） |
| `--surface-glow` | `box-shadow: 0 0 80px -20px rgba(var(--primary-rgb), 0.3);` | ヒーローセクションの環境光 |

### ネスト時の角丸の法則 (Nested Radius)

`Inner Radius = Outer Radius - Padding` の法則に従うことで、視覚的に自然な「同心円状の角丸」を実現します。

- **例**: カード(`Radius: 12px`) 内のボタン配置
    - カード Padding: `8px`
    - ボタン Radius: `12px - 8px = 4px`

---

## レイヤー構造（Z-index Scale）

コンテキストスタッキングを制御し、要素の競合を防ぐための厳格なスケール。`z-index: 9999` のようなマジックナンバーは使用しません。

| トークン | 値 | 用途 |
|----------|----|------|
| `--z-negative` | -1 | 背景装飾、グローエフェクト |
| `--z-base` | 0 | 標準コンテンツ |
| `--z-sticky` | 100 | スティッキーヘッダー、ナビゲーション |
| `--z-dropdown` | 200 | ドロップダウンメニュー、ツールチップ |
| `--z-overlay` | 300 | モーダル背景（オーバーレイ） |
| `--z-modal` | 400 | ダイアログ、モーダル本体 |
| `--z-toast` | 500 | 通知トースト |
| `--z-critical` | 900 | システムエラー、緊急アラート |

---

## タイポグラフィ

### フォントファミリー

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
```

### アイコン（Iconography）

明瞭さを保つため、アイコンのストローク幅を統一します。

| プロパティ | 値 |
|------------|----|
| **Stroke Width** | `1.5px` (推奨) または `2px` |
| **Style** | Outline (推奨) |

| トークン | サイズ | 用途 |
|----------|--------|------|
| `--icon-sm` | 16px | インラインアイコン、ボタン内 |
| `--icon-md` | 20px | 標準アイコン |
| `--icon-lg` | 24px | ナビゲーション、カード |
| `--icon-xl` | 32px | 特徴アイコン |

### フォントサイズ

| トークン | サイズ | 行の高さ | 用途 |
|----------|--------|----------|------|
| `--text-xs` | 0.75rem (12px) | 1rem | キャプション、バッジ |
| `--text-sm` | 0.875rem (14px) | 1.25rem | 補助テキスト、メタ情報 |
| `--text-base` | 1rem (16px) | 1.5rem | 本文 |
| `--text-lg` | 1.125rem (18px) | 1.75rem | リード文 |
| `--text-xl` | 1.25rem (20px) | 1.75rem | 小見出し |
| `--text-2xl` | 1.5rem (24px) | 2rem | セクション見出し |
| `--text-3xl` | 1.875rem (30px) | 2.25rem | ページ見出し |
| `--text-4xl` | 2.25rem (36px) | 2.5rem | ヒーロー見出し |
| `--text-5xl` | 3rem (48px) | 1.2 | 特大見出し |

### フォントウェイト

```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

---

## スペーシング

### 基本単位: 4px

| トークン | 値 | 用途 |
|----------|-----|------|
| `--space-1` | 0.25rem (4px) | 最小間隔 |
| `--space-2` | 0.5rem (8px) | タイトな間隔 |
| `--space-3` | 0.75rem (12px) | コンパクトな間隔 |
| `--space-4` | 1rem (16px) | 標準間隔 |
| `--space-5` | 1.25rem (20px) | やや広い間隔 |
| `--space-6` | 1.5rem (24px) | 広い間隔 |
| `--space-8` | 2rem (32px) | セクション間 |
| `--space-10` | 2.5rem (40px) | 大きなセクション間 |
| `--space-12` | 3rem (48px) | ページセクション間 |
| `--space-16` | 4rem (64px) | ヒーローセクション |
| `--space-20` | 5rem (80px) | 特大スペース |

---

## 角丸（Border Radius）

| トークン | 値 | 用途 |
|----------|-----|------|
| `--radius-sm` | 0.25rem (4px) | 小さな要素、タグ |
| `--radius-md` | 0.375rem (6px) | ボタン、入力フィールド |
| `--radius-lg` | 0.5rem (8px) | カード |
| `--radius-xl` | 0.75rem (12px) | モーダル、大きなカード |
| `--radius-2xl` | 1rem (16px) | ヒーローカード |
| `--radius-full` | 9999px | ピル型ボタン、アバター |

---

## シャドウ

| トークン | 値 | 用途 |
|----------|-----|------|
| `--shadow-sm` | `0 1px 2px rgba(0, 0, 0, 0.05)` | 微細な浮遊感 |
| `--shadow-md` | `0 4px 6px -1px rgba(0, 0, 0, 0.1)` | カード、ボタン |
| `--shadow-lg` | `0 10px 15px -3px rgba(0, 0, 0, 0.1)` | ドロップダウン |
| `--shadow-xl` | `0 20px 25px -5px rgba(0, 0, 0, 0.1)` | モーダル |
| `--shadow-glow` | `0 0 40px rgba(59, 130, 246, 0.3)` | グロー効果 |

**ダークモードでの注意**: ダークモードでは `rgba(0,0,0,...)` ベースの影は視認しにくいため、**Elevation Tones（背景色の明度差）** で高さを表現し、シャドウは補助的に使用するか省略します。

---

## モーション（アニメーション）

### 基本原則

1. **目的を持ったモーション** — すべてのアニメーションには意味がある
2. **自然な動き** — イージングを活用し、機械的な動きを避ける
3. **アクセシビリティ最優先** — `prefers-reduced-motion`を常に尊重

### Timing（持続時間）

| トークン | 値 | 用途 |
|----------|-----|------|
| `--duration-instant` | 0ms | モーション無効時 |
| `--duration-fast` | 100ms | マイクロインタラクション |
| `--duration-normal` | 200ms | 標準トランジション |
| `--duration-slow` | 300ms | 複雑なトランジション |
| `--duration-slower` | 500ms | ページ遷移、モーダル |

### Easing（イージング）

| トークン | 値 | 用途 |
|----------|-----|------|
| `--ease-out` | `cubic-bezier(0.33, 1, 0.68, 1)` | 要素の出現 |
| `--ease-in` | `cubic-bezier(0.32, 0, 0.67, 0)` | 要素の退場 |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | 状態変化 |
| `--ease-bounce` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | 楽しいインタラクション |
| `--ease-spring` | `cubic-bezier(0.175, 0.885, 0.32, 1.275)` | 弾むような動き |

### prefers-reduced-motion 対応

```css
/* 基本設定 */
:root {
  --motion-duration: var(--duration-normal);
  --motion-easing: var(--ease-out);
}

/* モーション軽減設定 */
@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-duration: 0ms;
    --motion-easing: linear;
  }

  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### アニメーション例

#### ボタンホバー

```css
.button {
  transition: 
    transform var(--motion-duration) var(--ease-out),
    box-shadow var(--motion-duration) var(--ease-out),
    background-color var(--motion-duration) var(--ease-out);
}

.button:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.button:active {
  transform: translateY(0);
}
```

#### カード出現

```css
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card {
  animation: fade-in-up var(--duration-slow) var(--ease-out) both;
}

/* 連続するカードにディレイ */
.card:nth-child(1) { animation-delay: 0ms; }
.card:nth-child(2) { animation-delay: 50ms; }
.card:nth-child(3) { animation-delay: 100ms; }
```

#### グラデーション背景アニメーション

```css
@keyframes gradient-shift {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.hero-background {
  background: var(--gradient-hero);
  background-size: 200% 200%;
  animation: gradient-shift 15s ease infinite;
}

@media (prefers-reduced-motion: reduce) {
  .hero-background {
    animation: none;
    background-size: 100% 100%;
  }
}
```

#### ローディング（Skeleton）

コンテンツ読み込み中のプレースホルダーアニメーション。

```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.skeleton {
  background-color: var(--color-background-subtle);
  border-radius: var(--radius-sm);
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

#### モーダル（出現・消失）

```css
@keyframes modal-enter {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes modal-exit {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.95);
  }
}

.modal[open] {
  animation: modal-enter var(--duration-normal) var(--ease-out);
}

.modal.closing {
  animation: modal-exit var(--duration-fast) var(--ease-in);
}
```

---

## コンポーネントパターン

### ボタン

| バリアント | 用途 |
|------------|------|
| **Primary** | 主要アクション（保存、送信など） |
| **Secondary** | 補助アクション（キャンセルなど） |
| **Outline** | 軽いアクション、テキストと調和 |
| **Ghost** | ナビゲーション、アイコンボタン |

### インタラクティブ要素の状態

| 状態 | 視覚的変化 |
|------|------------|
| **Default** | 基本スタイル |
| **Hover** | 明度変化 + 微細な上昇 + シャドウ強化 |
| **Focus** | アウトライン（2px solid primary） + オフセット |
| **Active** | 押し込み効果（scale または translate） |
| **Disabled** | 低コントラスト + cursor: not-allowed |
| **Loading** | スピナー + 操作無効化 |

### フォーム要素（Inputs）

| 状態 | スタイル |
|------|----------|
| **Default** | `border: 1px solid var(--color-border); background: var(--color-background);` |
| **Hover** | `border-color: var(--color-border-hover);` |
| **Focus** | `border-color: var(--color-primary); outline: 2px solid var(--color-primary); outline-offset: 2px;` |
| **Error** | `border-color: var(--color-error); outline-color: var(--color-error);` |
| **Disabled** | `background: var(--color-background-subtle); opacity: 0.6; cursor: not-allowed;` |

```css
/* プレースホルダー */
::placeholder {
  color: var(--color-foreground-muted);
  opacity: 0.7;
}
```

### フォーカス表示

```css
/* フォーカスリング */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* マウスクリック時はフォーカスリングを非表示 */
:focus:not(:focus-visible) {
  outline: none;
}
```

---

## レスポンシブ

### ブレークポイント

| トークン | 値 | 対象デバイス |
|----------|-----|--------------|
| `--bp-sm` | 640px | スマートフォン（横） |
| `--bp-md` | 768px | タブレット |
| `--bp-lg` | 1024px | ラップトップ |
| `--bp-xl` | 1280px | デスクトップ |
| `--bp-2xl` | 1536px | 大型モニター |

### コンテナ

```css
.container {
  width: 100%;
  max-width: var(--bp-xl);
  margin-inline: auto;
  padding-inline: var(--space-4);
}

@media (min-width: 768px) {
  .container {
    padding-inline: var(--space-8);
  }
}
```

---

## 参照・インスピレーション

- [Vitest Documentation](https://vitest.dev/) — 洗練されたダークモード、グラデーション効果
- [Next.js Documentation](https://nextjs.org/docs) — クリーンなタイポグラフィ、直感的なナビゲーション
- [Tailwind CSS](https://tailwindcss.com/) — 一貫性のあるスペーシング、カラーシステム
- [Linear](https://linear.app/) — 微細なアニメーション、プロダクト感

---

## View Transitions（ページ遷移）

SPAライクな滑らかな画面遷移を実現するためのガイドライン。標準ではクロスフェードを使用し、主要コンテンツには固有のトランジション名を付与します。

```css
/* 基本設定 (main.css) */
@view-transition {
  navigation: auto;
}

/* 個別要素のトランジション */
.product-image {
  view-transition-name: product-image;
}

.page-title {
  view-transition-name: page-title;
}
```

---

## 実装チェックリスト

- [ ] CSS Custom Properties（トークン）を定義
- [ ] ダークモード対応（`prefers-color-scheme`）
- [ ] Elevation Tones（ダークモード）の実装
- [ ] モーション設定（`prefers-reduced-motion`対応済み）
- [ ] フォーカス状態の実装（`:focus-visible`）
- [ ] グリッドシステムの適用
- [ ] ネストされた角丸の法則の遵守
- [ ] レスポンシブレイアウト
- [ ] Lion UI コンポーネントへのスタイル適用
- [ ] View Transitions によるページ遷移アニメーション
