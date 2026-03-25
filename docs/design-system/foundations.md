# Foundations

## 概要

この文書は、Rouault の `tokens.css` に定義されているデザイントークンを、**Color / Typography / Motion / Accessibility** を中核とする foundation 文書として再構成したものです。

単なる変数一覧を示すのではなく、次の点を明確にすることを目的とします。

1. **公開される設計語彙は何か**
2. **各トークンがどの責務を持つか**
3. **実装者がどの粒度で参照すべきか**
4. **light / dark / reduced-motion / forced-colors を含め、どこまでを foundation 契約として扱うか**
5. **foundation・pattern・application 固有値の境界をどこで引くか**

本書では token を次の 4 層で扱います。

1. **Primitive Tokens**  
   生の設計値です。色相、彩度、明度差、spacing、duration、easing など、他の層の基礎になる値を置きます。

2. **Semantic Foundation Tokens**  
   UI の役割を表す token です。背景、前景、境界、状態、フォーカス、elevation など、コンポーネントが原則として参照する公開語彙を置きます。

3. **Pattern / Recipe Tokens**  
   単一値ではなく、用途ごとに束ねた設計済みの token 群または規約です。motion pattern、reading heading scale、view transition などをここに含めます。

4. **Application / Shell Constants**  
   製品構造やアプリケーション shell に依存する値です。header 高さ、sidebar 幅、aside 幅、breakpoint、z-index などをここで管理します。

本書では foundation の独立章として **Color / Typography / Motion / Accessibility** を置き、これらを支える横断章として **Token Architecture** を先頭に、製品構造依存の値を扱う章として **Application / Shell Constants** を末尾に置きます。

## 目次

1. [Token Architecture](#1-token-architecture)
   - [4 層モデル](#11-4-層モデル)
   - [設計原則](#12-設計原則)
   - [実装契約](#13-実装契約)
2. [Color](#2-color)
   - [Color Philosophy](#21-color-philosophy)
   - [Primitive Color Tokens](#22-primitive-color-tokens)
   - [Semantic Color Tokens](#23-semantic-color-tokens)
   - [Theme Variants](#24-theme-variants)
3. [Typography](#3-typography)
   - [Typography Philosophy](#31-typography-philosophy)
   - [Font Families](#32-font-families)
   - [Weight Scale](#33-weight-scale)
   - [UI Text Scale](#34-ui-text-scale)
   - [Tracking / Line Height](#35-tracking--line-height)
   - [Reading Typography Tokens](#36-reading-typography-tokens)
   - [Reading Typography Recipes](#37-reading-typography-recipes)
4. [Motion](#4-motion)
   - [Motion Philosophy](#41-motion-philosophy)
   - [Duration Scale](#42-duration-scale)
   - [Easing Tokens](#43-easing-tokens)
   - [Motion Scale Tokens](#44-motion-scale-tokens)
   - [Motion Pattern Tokens](#45-motion-pattern-tokens)
   - [Motion Usage Contract](#46-motion-usage-contract)
5. [Accessibility](#5-accessibility)
   - [Accessibility Philosophy](#51-accessibility-philosophy)
   - [Focus System](#52-focus-system)
   - [Reduced Motion](#53-reduced-motion)
   - [Forced Colors](#54-forced-colors)
   - [Theme Contrast](#55-theme-contrast)
   - [Accessibility Usage Contract](#56-accessibility-usage-contract)
6. [Foundation Support Tokens](#6-foundation-support-tokens)
   - [Space Scale](#61-space-scale)
   - [Radius / Border](#62-radius--border)
   - [Elevation](#63-elevation)
7. [Application / Shell Constants](#7-application--shell-constants)
   - [Layout Dimensions](#71-layout-dimensions)
   - [Breakpoints](#72-breakpoints)
   - [Z-index](#73-z-index)

---

## 1. Token Architecture

### 1.1 4 層モデル

Rouault の token は、文書上明示的に **Primitive / Semantic Foundation / Pattern / Recipe / Application / Shell Constants** の 4 層で扱います。

この節は**分類原則を定義するための節**であり、個別トークンの網羅表を置く場所ではありません。ここでは各層の意味と利用規約を示すために代表例のみを記載し、個別トークンの具体値・用途・差分は後続の各章に委ねます。

| 層 | 役割 | 代表例 | 利用規約 |
| --- | --- | --- | --- |
| Primitive Tokens | 生の設計値。色相、彩度、寸法、時間、イージングなどの基礎パラメータ | `--hue-primary`, `--space-4`, `--duration-normal` | foundation / theme 定義で使用し、コンポーネントから直接参照しない |
| Semantic Foundation Tokens | UI の役割を表す値。背景、前景、境界、状態、フォーカス、elevation など | `--bg-default`, `--fg-default`, `--border-default`, `--focus-ring-color` | コンポーネントは原則としてこちらを参照する |
| Pattern / Recipe Tokens | 用途ごとに束ねた設計済み token 群、または再利用可能な規約 | `--animation-focus`, `--view-transition-fade`, `--reading-h2-size` | component pattern や document recipe で参照し、foundation の基礎値とは区別して扱う |
| Application / Shell Constants | 製品構造・画面構成・shell 実装に依存する値 | `--header-height`, `--sidebar-width`, `--aside-width`, `--z-sidebar` | app shell と layout system に限定して参照し、汎用 component token と混同しない |

### 1.2 設計原則

Rouault の token 設計では、**値の共有**よりも**責務の分離**を優先します。  
同じ値を内部的に共有していても、役割が異なるなら別 token として公開します。逆に、用途固有の振る舞いを foundation token に直接持ち込まないようにします。

| 原則 | 内容 |
| --- | --- |
| 層の分離 | Primitive・Semantic Foundation・Pattern / Recipe・Application / Shell を混在させない |
| 意味優先 | 同じ値でも役割が異なれば別 token として扱う |
| foundation 優先 | コンポーネントはまず Semantic Foundation を参照し、Primitive 直参照を避ける |
| pattern の独立 | animation、reading scale、view transition などの用途プリセットは Pattern / Recipe として分離する |
| shell の独立 | header、sidebar、aside、breakpoint、z-index など製品構造依存の値は foundation 本体と分離する |
| 差分吸収 | light / dark / reduced-motion / forced-colors の差分は token で吸収する |

### 1.3 実装契約

| 項目 | 契約 |
| --- | --- |
| 参照優先順位 | コンポーネントは Semantic Foundation Tokens を優先する |
| Primitive 直参照 | foundation / theme / low-level utility に限定する |
| Pattern 参照 | animation や reading scale などの設計済みパターンに限定して使う |
| Shell constants | app shell / responsive layout / navigation 構造に限定して使う |
| 直値 | 色コード、px、ms、cubic-bezier の直書きを避ける |
| 差分吸収 | light / dark / reduced-motion / forced-colors の差分は token で吸収する |
| 命名規約 | foundation token に component 名や具体 widget 名を入れない |

---

## 2. Color

### 2.1 Color Philosophy

Rouault の色設計は、**知覚的一様性、テーマ切替耐性、状態表現の一貫性**を重視しています。色の基礎表現には **OKLCH** を採用し、色相・彩度・明度を独立して調整できる構造を取ります。

| 項目     | 内容                                                        |
| -------- | ----------------------------------------------------------- |
| 色空間   | OKLCH                                                       |
| 狙い     | 知覚的一様性、明度調整の容易さ、light / dark 間の制御容易性 |
| 実装効果 | アクセント色、背景階層、状態色を系統的に設計できる          |

### 2.2 Primitive Color Tokens

#### 2.2.1 Hue / Chroma / Lightness Control

| トークン               | 具体値 | 役割                 | 備考                       |
| ---------------------- | ------ | -------------------- | -------------------------- |
| `--hue-primary`        | `250`  | primary 系色相の基準 | ブランド色・リンク系の軸   |
| `--hue-base`           | `250`  | 全体色相の基準       | UI 全体の色相整合に使用    |
| `--chroma-neutral`     | `0.01` | ニュートラル彩度     | 背景・弱い前景の低彩度基準 |
| `--chroma-subtle`      | `0.02` | 控えめな彩度         | 補助面や弱い境界           |
| `--chroma-ui`          | `0.03` | UI 用彩度            | 面・装飾の穏やかな色味     |
| `--chroma-high`        | `0.16` | 強い彩度             | primary や状態色など       |
| `--delta-l`            | `0.08` | 明度差の基本刻み     | surface 階層の段差         |
| `--delta-l-literature` | `0.04` | 読書面の明度差       | 穏やかな階層差             |

#### 2.2.2 Opacity

| トークン                         | 具体値 | 役割                       | 備考                 |
| -------------------------------- | ------ | -------------------------- | -------------------- |
| `--opacity-link-underline`       | `0.45` | 通常リンク下線の不透明度   | 視認性とノイズの均衡 |
| `--opacity-link-underline-hover` | `0.8`  | hover 時の下線強調         | 状態変化を補助       |
| `--opacity-link-underline-touch` | `0.72` | タッチ環境の下線           | hover 不在を補う     |
| `--opacity-scrim`                | `0.55` | scrim / overlay の不透明度 | モーダル背景の抑制   |
| `--opacity-disabled`             | `0.5`  | 無効状態の不透明度         | disabled の弱化表現  |

### 2.3 Semantic Color Tokens

#### 2.3.1 Brand / Accent

| トークン          | 具体値                 | 役割               | 使用文脈                               |
| ----------------- | ---------------------- | ------------------ | -------------------------------------- |
| `--primary`       | `oklch(0.56 0.16 250)` | 主要アクセント     | primary button, active state, emphasis |
| `--primary-hover` | `oklch(0.51 0.16 250)` | primary の強調状態 | hover / active                         |
| `--on-primary`    | `oklch(0.98 0.01 250)` | primary 上の前景色 | ボタン文字、アイコン                   |

#### 2.3.2 Background / Surface Hierarchy

| トークン              | 具体値                  | 役割           | 階層解釈                       |
| --------------------- | ----------------------- | -------------- | ------------------------------ |
| `--bg-default`        | `oklch(0.99 0.005 250)` | ページ既定背景 | 最下層                         |
| `--bg-surface-1`      | `oklch(0.97 0.01 250)`  | 軽い面分離     | カード、軽量コンテナ           |
| `--bg-surface-2`      | `oklch(0.94 0.012 250)` | 中程度の面分離 | パネル、入力領域               |
| `--bg-surface-3`      | `oklch(0.91 0.014 250)` | 強い面分離     | 浮遊面、強調面                 |
| `--bg-score-paper`    | `oklch(0.965 0.02 95)`  | 紙面風背景     | 読書・楽譜・特殊面             |
| `--bg-fill-muted`     | `oklch(0.95 0.01 250)`  | 弱い fill      | 小さな背景強調                 |
| `--bg-fill-neutral`   | `oklch(0.92 0.01 250)`  | 中立 fill      | neutral button, tag            |
| `--bg-hover`          | `oklch(0.93 0.02 250)`  | hover 背景     | 一時状態                       |
| `--bg-active`         | `oklch(0.89 0.025 250)` | active 背景    | pressed, selected              |
| `--bg-surface-active` | `oklch(0.88 0.03 250)`  | active な面    | 選択された面、アクティブ panel |

#### 2.3.3 Foreground

| トークン       | 具体値                  | 役割           | 使用文脈           |
| -------------- | ----------------------- | -------------- | ------------------ |
| `--fg-default` | `oklch(0.24 0.02 250)`  | 基本文字色     | 本文、主要ラベル   |
| `--fg-muted`   | `oklch(0.42 0.015 250)` | 補助前景       | 補助文、説明       |
| `--fg-subtle`  | `oklch(0.55 0.012 250)` | さらに弱い前景 | メタ情報、二次注記 |
| `--fg-info`    | `oklch(0.42 0.09 250)`  | 情報状態       | info text          |
| `--fg-success` | `oklch(0.46 0.11 150)`  | success 状態   | success text       |
| `--fg-warning` | `oklch(0.45 0.11 85)`   | warning 状態   | caution text       |
| `--fg-danger`  | `oklch(0.48 0.14 27)`   | danger 状態    | error text         |

#### 2.3.4 Border / Decoration

| トークン                        | 具体値                        | 役割           | 使用文脈                |
| ------------------------------- | ----------------------------- | -------------- | ----------------------- |
| `--border-default`              | `oklch(0.85 0.01 250)`        | 標準境界       | 入力、区切り            |
| `--border-muted`                | `oklch(0.9 0.008 250)`        | 弱い境界       | 控えめな区切り          |
| `--border-ghost`                | `oklch(0.92 0.006 250 / 0.7)` | 極薄境界       | subtle UI               |
| `--border-danger`               | `oklch(0.76 0.09 27)`         | danger 境界    | error field             |
| `--border-warning`              | `oklch(0.82 0.08 85)`         | warning 境界   | warning callout         |
| `--border-on-inverted`          | `oklch(0.98 0.01 250 / 0.24)` | 反転面上の境界 | dark / inverted surface |
| `--link-decoration-color`       | `oklch(0.45 0.12 250 / 0.45)` | 通常リンク下線 | 本文リンク              |
| `--link-decoration-color-touch` | `oklch(0.45 0.12 250 / 0.72)` | タッチ用下線   | モバイル本文リンク      |

#### 2.3.5 State Colors

| トークン       | 具体値                 | 役割               | 補助トークン     |
| -------------- | ---------------------- | ------------------ | ---------------- |
| `--danger`     | `oklch(0.58 0.19 27)`  | 破壊的状態         | `--on-danger`    |
| `--on-danger`  | `oklch(0.98 0.01 27)`  | danger 背景上前景  | `--danger` と対  |
| `--success`    | `oklch(0.62 0.14 150)` | 成功状態           | `--on-success`   |
| `--on-success` | `oklch(0.98 0.01 150)` | success 背景上前景 | `--success` と対 |
| `--warning`    | `oklch(0.72 0.15 85)`  | 注意喚起           | `--on-warning`   |
| `--on-warning` | `oklch(0.18 0.02 85)`  | warning 背景上前景 | `--warning` と対 |

### 2.4 Theme Variants

#### 2.4.1 Light / Dark

| トークン           | light 値                | dark 値                 | 設計意図                            |
| ------------------ | ----------------------- | ----------------------- | ----------------------------------- |
| `--bg-default`     | `oklch(0.99 0.005 250)` | `oklch(0.17 0.01 250)`  | 背景極性の反転                      |
| `--bg-surface-1`   | `oklch(0.97 0.01 250)`  | `oklch(0.21 0.012 250)` | 面階層の再構成                      |
| `--fg-default`     | `oklch(0.24 0.02 250)`  | `oklch(0.94 0.01 250)`  | 前景可読性の維持                    |
| `--border-default` | `oklch(0.85 0.01 250)`  | `oklch(0.32 0.015 250)` | 境界の沈み込み防止                  |
| `--primary`        | `oklch(0.56 0.16 250)`  | `oklch(0.72 0.14 250)`  | 暗背景でも primary を認識可能にする |

#### 2.4.2 Color Usage Contract

| 項目       | 契約                                                                |
| ---------- | ------------------------------------------------------------------- |
| 背景指定   | `bg-*` token を使う                                                 |
| 文字色指定 | `fg-*` token を使う                                                 |
| 状態色     | `danger / success / warning / info` を使い、ad hoc な色名を作らない |
| 境界線     | `border-*` token を使う                                             |
| アクセント | primary を基準にし、別アクセントを乱立させない                      |

---

## 3. Typography

### 3.1 Typography Philosophy

Rouault の Typography は、**UI 用の密度管理**と**長文読書面の可読性最適化**を分離して扱います。したがって、単一の font-size scale で全用途を処理せず、通常 UI と reading surface の 2 レイヤーを持ちます。

| 項目         | 内容                                           |
| ------------ | ---------------------------------------------- |
| 基本方針     | UI と長文読書を同一ルールに押し込めない        |
| 実装レイヤー | UI Typography / Reading Typography             |
| 狙い         | 密度、可読性、見出し階層、和文欧文混植の安定化 |

### 3.2 Font Families

| トークン       | 具体値                                          | 役割                | 使用文脈                |
| -------------- | ----------------------------------------------- | ------------------- | ----------------------- |
| `--font-sans`  | `Inter, "Noto Sans JP", system-ui, sans-serif`  | UI と一般本文の基準 | app shell, body, labels |
| `--font-mono`  | `"JetBrains Mono", "SFMono-Regular", monospace` | 等幅表示            | code, numeric UI        |
| `--font-serif` | `"Noto Serif JP", serif`                        | 文芸寄り本文        | 特殊読書面、引用強調    |

### 3.3 Weight Scale

| トークン          | 具体値 | 役割      | 運用指針                     |
| ----------------- | ------ | --------- | ---------------------------- |
| `--font-normal`   | `400`  | 基本文字  | 本文既定                     |
| `--font-medium`   | `500`  | 軽い強調  | ラベル、補助強調             |
| `--font-semibold` | `600`  | UI 見出し | セクション見出し、ボタン強調 |
| `--font-bold`     | `700`  | 強い強調  | 重要見出しに限定             |

### 3.4 UI Text Scale

| トークン      | 具体値 | 役割             | 主な使用箇所               |
| ------------- | ------ | ---------------- | -------------------------- |
| `--text-2xs`  | `11px` | 最小級文字       | 注釈、極小ラベル           |
| `--text-xs`   | `12px` | 小型 UI          | キャプション、メタ情報     |
| `--text-sm`   | `13px` | 補助 UI 本文     | secondary labels           |
| `--text-base` | `14px` | 標準 UI 本文     | app 本文、標準ラベル       |
| `--text-lg`   | `16px` | 強調本文         | 小見出し、強調本文         |
| `--text-xl`   | `18px` | セクション見出し | 大きめラベル、サブタイトル |
| `--text-2xl`  | `24px` | 大見出し         | セクション主要見出し       |
| `--text-3xl`  | `30px` | ページ見出し     | page title                 |
| `--text-4xl`  | `36px` | ヒーロー見出し   | landing header             |
| `--text-5xl`  | `48px` | 特大表示         | 限定的な display text      |

### 3.5 Tracking / Line Height

| トークン                | 具体値     | 役割           | 使用指針        |
| ----------------------- | ---------- | -------------- | --------------- |
| `--tracking-tighter`    | `-0.03em`  | 強く詰める     | display heading |
| `--tracking-tight`      | `-0.015em` | やや詰める     | 見出し          |
| `--tracking-normal`     | `0`        | 標準           | 本文            |
| `--tracking-wide`       | `0.01em`   | やや広げる     | ラベル          |
| `--tracking-wider`      | `0.03em`   | 強いラベル感   | badge, overline |
| `--line-height-none`    | `1`        | 詰まった表示   | 大見出し限定    |
| `--line-height-tight`   | `1.25`     | 密度高め       | 見出し          |
| `--line-height-normal`  | `1.5`      | 標準本文       | UI 本文         |
| `--line-height-relaxed` | `1.75`     | 読みやすさ重視 | 長文、説明文    |

### 3.6 Reading Typography Tokens

#### 3.6.1 Reading Measure / Body

| トークン | 具体値 | 役割 | 備考 |
| --- | --- | --- | --- |
| `--width-reading` | `75ch` | 読書面最大幅 | 行長制御 |
| `--width-reading-fallback` | `46rem` | 代替幅 | `ch` 非依存 |
| `--reading-measure` | `72ch` | 読書面標準 measure | 視線移動抑制 |
| `--reading-body-size` | `clamp(1rem, 0.96rem + 0.18vw, 1.125rem)` | 読書本文サイズ | 画面幅に追従 |
| `--reading-body-line-height` | `1.9` | 読書本文行間 | 長文の可読性を優先 |
| `--reading-flow-space` | `1.4em` | flow 間隔 | 段落・ブロック分離 |

### 3.7 Reading Typography Recipes

#### 3.7.1 Reading Heading Scale

| トークン | 具体値 | 役割 |
| --- | --- | --- |
| `--reading-h2-size` | `clamp(1.5rem, 1.34rem + 0.7vw, 2rem)` | H2 サイズ |
| `--reading-h3-size` | `clamp(1.25rem, 1.16rem + 0.35vw, 1.5rem)` | H3 サイズ |
| `--reading-h4-size` | `1.125rem` | H4 サイズ |
| `--reading-h5-size` | `1rem` | H5 サイズ |
| `--reading-h6-size` | `0.95rem` | H6 サイズ |
| `--reading-h2-weight` | `650` | H2 ウェイト |
| `--reading-h3-weight` | `620` | H3 ウェイト |
| `--reading-h4-weight` | `600` | H4 ウェイト |
| `--reading-h5-weight` | `600` | H5 ウェイト |
| `--reading-h6-weight` | `600` | H6 ウェイト |

#### 3.7.2 Typography Usage Contract

| 文脈 | 使用すべき系統 |
| --- | --- |
| app shell / navigation / controls | UI Typography |
| article body / about prose / long-form docs | Reading Typography Tokens |
| reading article headings | Reading Typography Recipes |
| code / numeric / machine-readable text | Mono Typography |
| display title | UI scale の大見出しを利用し、reading scale と混同しない |

---

## 4. Motion

### 4.1 Motion Philosophy

Rouault の Motion は、装飾ではなく**状態変化の可視化**と**知覚性能の補助**を目的とします。したがって、motion token は単なるアニメーション値ではなく、操作の意味を支える foundation の一部です。

| 項目       | 内容                                               |
| ---------- | -------------------------------------------------- |
| 主目的     | 状態変化の理解、知覚的フィードバック、待機感の緩和 |
| 副作用抑制 | reduced-motion で抑制可能であること                |
| 運用原則   | 小さく、短く、意味を伴うこと                       |

### 4.2 Duration Scale

| トークン             | 具体値  | 役割         | 使用指針                 |
| -------------------- | ------- | ------------ | ------------------------ |
| `--duration-instant` | `0ms`   | 即時反映     | motion 不要時            |
| `--duration-fast`    | `120ms` | 速い応答     | hover, small affordance  |
| `--duration-normal`  | `180ms` | 標準応答     | most transitions         |
| `--duration-slow`    | `260ms` | 大きめの変化 | panel open, content swap |
| `--duration-slower`  | `360ms` | 強い遷移     | page-level transition    |

### 4.3 Easing Tokens

| トークン        | 具体値                           | 役割       | 使用文脈                    |
| --------------- | -------------------------------- | ---------- | --------------------------- |
| `--ease-out`    | `cubic-bezier(0.22, 1, 0.36, 1)` | 自然な減速 | 標準入場、hover 解除        |
| `--ease-in`     | `cubic-bezier(0.55, 0, 1, 0.45)` | 入力・退出 | dismiss, fade-out           |
| `--ease-in-out` | `cubic-bezier(0.45, 0, 0.55, 1)` | 対称変化   | toggle, balanced transition |
| `--ease-spring` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | やや弾性的 | tactile interaction         |

### 4.4 Motion Scale Tokens

| トークン                    | 具体値  | 役割              | 使用文脈                    |
| --------------------------- | ------- | ----------------- | --------------------------- |
| `--scale-pressed`           | `0.985` | 押下縮小          | button press                |
| `--scale-enter`             | `0.985` | 出現前縮小        | enter animation             |
| `--scale-hover-sm`          | `1.01`  | 小さな hover 強調 | small controls              |
| `--scale-hover-lg`          | `1.02`  | 大きな hover 強調 | cards, panels               |
| `--scale-dragging`          | `1.015` | drag 強調         | sortable / drag UI          |
| `--timeout-async-threshold` | `150ms` | loading 表示閾値  | skeleton / spinner 出現判定 |

### 4.5 Motion Pattern Tokens

#### 4.5.1 Focus / Flash / Shimmer

| トークン / 定義             | 具体値                                 | 役割             | 説明                     |
| --------------------------- | -------------------------------------- | ---------------- | ------------------------ |
| `--animation-focus`         | `adaptive-focus 220ms var(--ease-out)` | フォーカス視認性 | 停止時の明瞭化           |
| `--animation-flash`         | `flash 700ms var(--ease-out)`          | 一時強調         | newly updated state      |
| `@keyframes adaptive-focus` | 定義あり                               | focus pattern    | 強調しすぎないフォーカス |
| `@keyframes flash`          | 定義あり                               | flash pattern    | 一時的な注意喚起         |
| `@keyframes shimmer`        | 定義あり                               | loading pattern  | skeleton に使用          |

#### 4.5.2 View Transitions

| トークン                           | 具体値                  | 役割            | 使用文脈             |
| ---------------------------------- | ----------------------- | --------------- | -------------------- |
| `--view-transition-fade`           | `180ms var(--ease-out)` | fade transition | 小規模コンテンツ切替 |
| `--view-transition-slide-to-left`  | `220ms var(--ease-out)` | 左方向スライド  | forward navigation   |
| `--view-transition-slide-to-right` | `220ms var(--ease-out)` | 右方向スライド  | backward navigation  |

### 4.6 Motion Usage Contract

| 項目          | 契約                                                        |
| ------------- | ----------------------------------------------------------- |
| 常用 duration | `fast` または `normal` を中心に使う                         |
| 常用 easing   | `ease-out` または `ease-in-out` を中心に使う                |
| 強い motion   | page / modal / large panel に限定する                       |
| 本文面        | 読書を阻害する過剰な motion を避ける                        |
| loading       | `timeout-async-threshold` 未満では不要な spinner を出さない |

---

## 5. Accessibility

### 5.1 Accessibility Philosophy

Rouault の Accessibility は、後付けの調整ではなく foundation 層に組み込まれています。特に **focus visibility**、**reduced motion**、**forced colors**、**theme contrast** が token / media query ベースで整備されています。

| 項目     | 内容                                                          |
| -------- | ------------------------------------------------------------- |
| 基本方針 | 視認性・操作可能性・環境適応性を foundation に埋め込む        |
| 主対象   | キーボード利用、低視力、高コントラスト環境、motion 感受性     |
| 実装位置 | token と media query で基礎対応し、コンポーネントで増幅しない |

### 5.2 Focus System

| トークン                    | 具体値                         | 役割            | 説明                 |
| --------------------------- | ------------------------------ | --------------- | -------------------- |
| `--focus-ring-width`        | `2px`                          | フォーカス線幅  | 明瞭な可視化         |
| `--focus-ring-offset`       | `2px`                          | リングの離隔    | 要素輪郭との干渉防止 |
| `--focus-ring-radius`       | `calc(var(--radius-md) + 2px)` | リング形状      | 要素半径との整合     |
| `--focus-ring-color`        | `oklch(0.62 0.16 250 / 0.95)`  | 強い focus 色   | 主要 focus visible   |
| `--focus-ring-color-subtle` | `oklch(0.62 0.1 250 / 0.55)`   | 控えめ focus 色 | 軽度な focus 表現    |

#### 5.2.1 Focus Contract

| 項目             | 契約                                               |
| ---------------- | -------------------------------------------------- |
| フォーカス可視化 | `:focus-visible` を前提とし、focus ring を消さない |
| 色指定           | ad hoc な outline 色ではなく focus token を使う    |
| 半径             | 要素形状に合わせて focus-ring-radius を使う        |
| クリッピング     | overflow により ring が切れないようにする          |

### 5.3 Reduced Motion

| 条件                             | 動作                                              | 意図                  |
| -------------------------------- | ------------------------------------------------- | --------------------- |
| `prefers-reduced-motion: reduce` | transition / animation を事実上停止               | motion 感受性への配慮 |
| 対象                             | UI transition, shimmer, flash, focus animation    | 装飾的変化の抑制      |
| 契約                             | motion は無効化されても情報が失われない設計にする | meaning-first         |

### 5.4 Forced Colors

| 条件                    | マッピング                                                       | 意図                          |
| ----------------------- | ---------------------------------------------------------------- | ----------------------------- |
| `forced-colors: active` | `Canvas`, `CanvasText`, `Highlight`, `HighlightText`, `GrayText` | OS の高コントラスト環境に適応 |
| focus / selection       | box-shadow 依存を避け、outline で補助する                        | 強制色環境での可視化維持      |
| disabled                | `GrayText` を使用する                                            | 状態差を維持                  |

### 5.5 Theme Contrast

| 項目         | 実装内容                                    | 意図                   |
| ------------ | ------------------------------------------- | ---------------------- |
| dark theme   | 前景 / 背景 / border / primary を再定義する | 暗背景での可読性確保   |
| state text   | `fg-success` などを専用化する               | 状態色の読みやすさ維持 |
| on-\* tokens | `on-primary`, `on-danger` などを用意する    | 背景上前景の対比を保証 |

### 5.6 Accessibility Usage Contract

| 項目          | 契約                                               |
| ------------- | -------------------------------------------------- |
| コントラスト  | 背景と前景は semantic token の組を用いて確保する   |
| 状態伝達      | 色だけに依存せず、文言・アイコン・境界でも補助する |
| focus         | hover と別に focus-visible を確保する              |
| motion        | reduced-motion 時に意味が欠落しないようにする      |
| forced colors | box-shadow や微妙な色差だけに依存しない            |

---

## 6. Foundation Support Tokens

### 6.1 Space Scale

| トークン     | 具体値 | 役割             |
| ------------ | ------ | ---------------- |
| `--space-1`  | `4px`  | 最小間隔         |
| `--space-2`  | `8px`  | 小間隔           |
| `--space-3`  | `12px` | 小型 UI 余白     |
| `--space-4`  | `16px` | 標準余白         |
| `--space-6`  | `24px` | 中間セクション間 |
| `--space-8`  | `32px` | セクション分離   |
| `--space-12` | `48px` | 大きめの分離     |
| `--space-16` | `64px` | major section    |
| `--space-20` | `80px` | 大画面での分離   |
| `--space-n4` | `-4px` | 微調整用         |
| `--space-n8` | `-8px` | オーバーラップ用 |

### 6.2 Radius / Border

| トークン               | 具体値   | 役割             |
| ---------------------- | -------- | ---------------- |
| `--radius-sm`          | `4px`    | 小型 UI          |
| `--radius-md`          | `6px`    | 標準コントロール |
| `--radius-xl`          | `12px`   | パネル、モーダル |
| `--radius-full`        | `9999px` | pill shape       |
| `--border-width`       | `1px`    | 標準境界         |
| `--border-width-thick` | `2px`    | 強調境界         |

### 6.3 Elevation

| トークン           | 具体値                                                                 | 役割                    |
| ------------------ | ---------------------------------------------------------------------- | ----------------------- |
| `--shadow-sm`      | `0 1px 2px rgb(0 0 0 / 0.06)`                                          | 軽い影                  |
| `--shadow-md`      | `0 8px 24px rgb(0 0 0 / 0.08)`                                         | 標準影                  |
| `--shadow-lg`      | `0 16px 40px rgb(0 0 0 / 0.12)`                                        | 強い影                  |
| `--shadow-xl`      | `0 24px 56px rgb(0 0 0 / 0.16)`                                        | モーダル級の影          |
| `--shadow-glow`    | `0 0 0 1px rgb(99 102 241 / 0.22), 0 10px 30px rgb(99 102 241 / 0.18)` | 発光影                  |
| `--elevation-sm`   | `var(--shadow-sm)`                                                     | semantic elevation 小   |
| `--elevation-md`   | `var(--shadow-md)`                                                     | semantic elevation 中   |
| `--elevation-lg`   | `var(--shadow-lg)`                                                     | semantic elevation 大   |
| `--elevation-xl`   | `var(--shadow-xl)`                                                     | semantic elevation 特大 |
| `--elevation-glow` | `var(--shadow-glow)`                                                   | accent emphasis         |

## 7. Application / Shell Constants

### 7.1 Layout Dimensions

| トークン | 具体値 | 役割 | 利用範囲 |
| --- | --- | --- | --- |
| `--header-height` | `...` | app header の基準高さ | shell layout に限定 |
| `--sidebar-width` | `...` | sidebar 展開幅 | shell / navigation に限定 |
| `--aside-width` | `...` | aside 領域幅 | article + aside layout に限定 |

### 7.2 Breakpoints

| トークン | 具体値 | 役割 | 利用範囲 |
| --- | --- | --- | --- |
| `--breakpoint-sm` | `...` | 小画面境界 | responsive layout に限定 |
| `--breakpoint-md` | `...` | 中画面境界 | responsive layout に限定 |
| `--breakpoint-lg` | `...` | 大画面境界 | responsive layout に限定 |

### 7.3 Z-index

| トークン | 具体値 | 役割 | 利用範囲 |
| --- | --- | --- | --- |
| `--z-base` | `...` | 通常文脈 | 汎用レイヤー |
| `--z-dropdown` | `...` | dropdown / popover | overlay UI |
| `--z-sidebar` | `...` | sidebar 系 | shell に限定 |
| `--z-modal` | `...` | modal / dialog | overlay UI |
| `--z-toast` | `...` | toast 通知 | feedback UI |
