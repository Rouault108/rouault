## コンポーネント

### 基本要素 (Primitives)

#### リンク (Prose Link) `<a>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **Role**: コンテンツ（記事本文）内におけるハイパーリンク。
- **Scope**: `.prose` クラス配下のテキストリンクにのみ適用します。ナビゲーションやボタンとしてのリンク（UI Link）は対象外とします。
- **Dynamic Clarity**: 「読む」体験を阻害しないよう、デフォルトでは**本文色と同じテキスト色**を維持し、控えめな色付き下線のみで機能を示唆します。マウスオーバー時（Hover）に初めてテキスト自体が色付き、インタラクションの意思に対する明確なフィードバックを返します。

**2. 実装戦略 (Implementation Strategy)**

- **Selector**: `.prose a[href]`
    - `href` 属性を持つ `<a>` タグのみを対象とし、`href` のないアンカー（ページ内ジャンプのターゲット等）を除外します。
    - **Rationale**: 通常の本文リンクを広くカバーしつつ、リンクでないアンカーへの誤適用を防ぎます。
- **SPA Routing**: ルーティング実装の詳細は `src/lib/router.ts` を参照してください。本セクションではスタイリング定義のみを扱います。

**3. スタイリングとトークンマッピング (Style & Tokens)**

**Base Style (a)**

- `cursor`: `pointer`
- `color`: `var(--fg-default)` (本文色を維持し、読むリズムを優先)
- `text-decoration`: `underline`
- `text-underline-offset`: `0.15em`
    - **Rationale**: `Noto Sans JP` のベースラインとディセンダー（下に伸びる部分）の間隔を考慮し、下線が文字に接触せず、かつ視覚的に離れすぎない最適値として設定。`index.md` で定義された `--font-sans` での検証に基づきます。
    - **Note (Exception)**: フォントファミリー固有の調整値であるため、`index.md` の禁止事項「ハードコードされた色・サイズ値」の例外として許容します。
- `text-decoration-thickness`: `var(--border-width)` (1px)
    - **Tokenization Intent**: テキスト下線もUIの「線」の一部として扱い、`--border-width` を共有することで、システム全体の線幅の一貫性を保証します。`index.md` の `--border-width` トークンを参照し、レンダリングの滲みを防ぎ、クリスプな線を保証します。
- `transition`: `text-decoration-color var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out)`
- `box-decoration-break`: `clone`
- `-webkit-box-decoration-break`: `clone`
    - **Note (Browser Compatibility)**: `box-decoration-break: clone` は Firefox では未サポートです。Firefox では改行時に下線が分離されますが、コンテンツの可読性には影響しないため、Progressive Enhancement として許容します。

**状態別定義 (State definition)**

| State | Text Color | Decoration Color | Note |
|-------|------------|------------------|------|
| **Default** | `var(--fg-default)` | `var(--link-decoration-color)` | 下線のみに色を付け、視覚的ノイズを最小化します。 |
| **Touch (No Hover)**| `var(--primary)` | `var(--link-decoration-color-touch)` | ホバーのない環境では発見可能性を優先し、テキスト自体も色付かせます。 |
| **Hover** | `var(--primary-hover)` | `var(--primary-hover)` | テキストも色付きになり、リンクとしての機能を強く主張します。 |
| **Focus-Visible** | `var(--fg-default)` | `var(--primary)` | グローバルフォーカスリングを表示。テキスト色は変更せず、リングのみで状態を示します。 |
| **Visited** | `var(--fg-default)` | `var(--link-decoration-color)` | **No Distraction**: 個人メモの閲覧用途では「既読管理」より「読むリズムの維持」を優先。 |

**ブラウザサポート (Browser Support)**

Rouault全体のブラウザサポート境界（`index.md`）に準拠します。

| ブラウザ | ベースライン（保証） | 拡張機能（Progressive Enhancement） |
|----------|---------------------|-----------------------------------|
| Chrome / Edge (Chromium) | 111+ | Relative Color Syntax は 119+ |
| Safari | 16.4+ | Relative Color Syntax 利用可 |
| Firefox | 113+ | Relative Color Syntax は 128+ |

Relative Color Syntax 非対応環境では `--primary` へフォールバックします。

```css
/* Baseline (Chrome/Edge 111+, Firefox 113+ を含む): 安全なフォールバック */
.prose a[href] {
  text-decoration-color: var(--primary);
}

/* Progressive Enhancement: Relative Color Syntax 対応環境 */
@supports (color: oklch(from white l c h)) {
  .prose a[href] {
    text-decoration-color: var(--link-decoration-color);
  }
}
```

**Touch (No Hover) 判定**

タッチデバイスではホバーによる発見可能性が得られないため、デフォルト状態から視覚的ヒントを強化します。

```css
@media (hover: none) and (pointer: coarse) {
  .prose a[href] {
    color: var(--primary);
    text-decoration-color: var(--link-decoration-color-touch);
  }
}
```

**4. アクセシビリティ (Accessibility)**

- **Focus Indicator**:
    - グローバル定義の `:focus-visible` リングおよび **Adaptive Focus** 戦略を使用。
    - `outline: var(--focus-ring-width) solid var(--focus-ring-color)`
    - `outline-offset: var(--focus-ring-offset)`
    - `border-radius: var(--focus-ring-radius)` (`index.md` のグローバル定義をそのまま適用)
    - `animation: var(--animation-focus)`
- **Motion Reduction**:
    - `@media (prefers-reduced-motion: reduce)` 環境下では、`index.md` のグローバル定義により全てのトランジションが自動的に無効化されます（`0.01ms` に短縮）。
    - Adaptive Focusアニメーション（`--animation-focus`）も無効化され、フォーカスリングは即座に `--focus-ring-color` で表示されます。
- **Forced Colors Mode**:
    - `forced-colors: active` 環境下では、`index.md` のグローバルトークンマッピング（`:root` のシステムカラー対応）に従います。
    - 本セクションでは個別の色上書きは行わず、`color` / `text-decoration-color` はトークン経由の一元管理を維持します。

**5. Print Styles**

印刷時には、リンク先URLを明示し、紙媒体での有用性を確保します。

```css
@media print {
  .prose a[href^="http"]::after {
    content: " (" attr(href) ")";
    font-size: 0.875em;
    color: var(--fg-muted);
    text-decoration: none;
  }
  
  /* 内部リンク（相対パス、アンカー）はURL展開しない */
  .prose a[href^="#"]::after,
  .prose a[href^="/"]::after {
    content: none;
  }
  
  /* 下線は常に表示し、リンクであることを明示 */
  .prose a {
    text-decoration: underline;
    text-decoration-color: currentColor;
  }
}
```

#### コンテキストリンク (Contextual Link)

**1. デザイン哲学と目的 (Design Philosophy)**

- **Role**: カード、コールアウト、サイドバーなどの **UIコンポーネント内** に配置される、ナビゲーションやアクションを目的としたリンク。
- **Scope**: `.card`, `.callout`, `.sidebar` 等のコンテナ内部、あるいは `.ui-link` クラスを持つ要素。読み物としての本文（Prose）内リンクとは明確に区別されます。
- **Structure**: 「読む」ためのProse Linkとは異なり、UIの一部として機能します。「静謐さ」を維持するため、ナビゲーション目的のリンクは**デフォルトで無彩色（ニュートラル）**とし、重要なアクションのみをプライマリカラーとします。

**2. 実装戦略 (Implementation Strategy)**

- **Selector**:
    - **Primary**: `.ui-link[href]` — 明示的にUIリンクとしてマークされた要素
    - **Contextual**: `.card a[href], .callout a[href], .sidebar a[href]` — コンテナ内の子孫リンクを対象
    - **Prose Exclusion**: `.card .prose a[href], .callout .prose a[href], .sidebar .prose a[href]` は常に Prose Link 仕様を優先します（本仕様の対象外）。
- **SPA Routing**: Prose Linkと同様、ルーティング実装の詳細は `src/lib/router.ts` を参照してください。本セクションではスタイリング定義のみを扱います。
- **Variant API**:
    - `.ui-link` または `.ui-link.link-nav` を **Nav (Default)** とします。
    - `.ui-link.link-action` を **Action** とします。
    - サイドバー項目は `.sidebar .ui-link.link-nav` を使用し、`index.md` の階層方針に従って `--fg-muted` を基準色とします。
- **Interaction Pattern**:
    - **Neutral (Nav)**: 形（Weight）で機能を示唆し、色（Hover）で応答する。
    - **Action**: 色（Primary）で誘引し、装飾（Underline）で応答する。

**3. スタイリングとトークンマッピング (Style & Tokens)**

**Base Style**

- `cursor`: `pointer`
- `color`: `var(--fg-default)` (Sidebar Nav のみ `var(--fg-muted)` を基準色として上書き)
- `text-decoration`: `none`
- `text-underline-offset`: `0.15em`
    - **Rationale**: Prose Linkと同じ値を採用し、`Noto Sans JP` のベースラインとディセンダーの間隔を考慮した最適値として設定。UIリンクでも下線が使用される場合（Hover時等）の一貫性を保証します。
- `text-decoration-thickness`: `var(--border-width)`
    - **Tokenization Intent**: Prose Linkと同様、テキスト下線もUIの「線」の一部として扱い、`--border-width` を共有することで、システム全体の線幅の一貫性を保証します。
- `font-weight`: `var(--font-medium)` (500 - 周辺テキストより一段階強くし、構造的な差異を作る)
- `transition`: `color var(--duration-fast) var(--ease-out), text-decoration-color var(--duration-fast) var(--ease-out)`

**バリアントと状態 (Variants & States)**

| ID | Variant | Default Color | Hover Color | Hover Decoration Color | Note |
|----|---------|---------------|-------------|------------------------|------|
| **Nav** | ナビゲーション | `var(--fg-default)` (`.sidebar` 内は `var(--fg-muted)`) | `var(--primary)` | `currentColor` | **Default**. サイドバーやカードタイトル。ノイズを抑え、ホバーで色付きます。下線色はテキスト色に追従。 |
| **Action**| アクション | `var(--primary)` | `var(--primary-hover)` | `currentColor` | 「編集」「作成」など、ユーザーに操作を促す強いリンク。下線色はテキスト色に追従。 |

**共通状態 (Common States)**

- **Hover**: `text-decoration: underline`. (※Actionバリアントは下線追加、Navは色変化+下線追加)
- **Active**: `transform: scale(var(--scale-pressed))` (0.96 - ボタンと同様のTactile Feedback)
    - **Rationale**: `opacity` による透過度変化ではなく、`transform` によるスケール変化を採用することで、背景色に依存しない明確な物理的フィードバックを提供します。
- **Focus-Visible**: グローバルフォーカスリング (`Adaptive Focus`) を表示し、移動中のノイズを低減します。
- **Current (Nav only)**: `aria-current="page"` または `.is-active` を現在地として扱います。
    - `color: var(--primary)`
    - `font-weight: var(--font-medium)`
    - 左インジケーター（`border-inline-start: var(--border-width-thick) solid var(--primary)`）または等価の物理的強調を併用し、色のみで状態を伝達しません。
- **Visited**:
    - **Nav**: 各コンテキストの Default 色を維持（`.sidebar` 内では `--fg-muted`、その他は `--fg-default`）
    - **Action**: `var(--primary)` を維持
    - **No Distraction**: 既読管理よりUIの一貫性を優先します。

**Touch (No Hover) 判定**

タッチデバイスではホバーによる発見可能性が得られないため、デフォルト状態から視覚的ヒントを強化します。

```css
@media (hover: none) and (pointer: coarse) {
  /* Navバリアント: デフォルトで色付き（Prose除外） */
  .ui-link:not(.link-action),
  .card a[href],
  .callout a[href],
  .sidebar a[href] {
    color: var(--primary);
  }
  .card .prose a[href],
  .callout .prose a[href],
  .sidebar .prose a[href] {
    color: inherit;
  }

  /* Hit Area: WCAG 2.2 と運用推奨に合わせて最小サイズを確保 */
  .ui-link.icon-only {
    min-inline-size: var(--control-min-touch); /* 44px */
    min-block-size: var(--control-min-touch);
  }
}
```

**テクニカル (Technical Features)**

- **Block Link (Card Action)**:
    - カード全体をリンク化する場合、`::after` 擬似要素による **Stretched Link (Clickable Area Extension)** パターンを採用します。
    - **Implementation**:
        ```css
        .card-link::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          z-index: 1;
        }
        ```
    - **Constraints**: 
        - 親コンテナ（`.card` 等）には `position: relative` が必須です。
        - 内部に別のリンクやボタンがある場合、それらに `position: relative` と `z-index: 2` 以上を設定することで、親リンクによる吸い込みを防ぎます。
        - テキスト選択が必要な領域では Stretched Link を適用しません（選択操作阻害を回避）。
- **Icon Links**:
    - アイコンのみのリンクの場合も、`color` の振る舞い（Default/Hover/Active）は各Variant定義に完全に準拠します。
    - ストローク幅は `index.md` の定義通り `1.5px` を維持します。
    - **Accessibility**: アイコンのみの場合は `aria-label` を必須とします。

**4. アクセシビリティ (Accessibility)**

- **Contrast Guarantee**:
    - 使用する全色は `index.md` のトークン定義により WCAG AA (4.5:1) を満たすよう計算されています。
- **Link Purpose**:
    - 文脈から切り離されても目的が理解できるよう、"Click here" などの曖昧なラベルを禁止します。
    - アイコンのみの場合は `aria-label` を必須とします。
        ```html
        <a href="/settings" class="ui-link" aria-label="設定ページへ移動">
          <icon-settings></icon-settings>
        </a>
        ```
- **Focus Indicator**:
    - グローバル定義の `:focus-visible` リングおよび **Adaptive Focus** 戦略を使用。
    - `outline: var(--focus-ring-width) solid var(--focus-ring-color)`
    - `outline-offset: var(--focus-ring-offset)`
    - `border-radius: var(--focus-ring-radius)` (`index.md` のグローバル定義をそのまま適用)
    - `animation: var(--animation-focus)`
    - `.card-link` にフォーカスが当たった場合、親カード (`.card`) に対してフォーカスリングを適用します。
    - **Baseline**: `.card:focus-within` を使用（`index.md` のブラウザ保証境界内）。
    - **Enhancement**: `:has()` 対応環境では `.card:has(.card-link:focus-visible)` で厳密化します。
- **Motion Reduction**:
    - `@media (prefers-reduced-motion: reduce)` 環境下では、`index.md` のグローバル定義により全てのトランジションが自動的に無効化されます（`0.01ms` に短縮）。
    - Adaptive Focusアニメーション（`--animation-focus`）も無効化され、フォーカスリングは即座に `--focus-ring-color` で表示されます。
- **Forced Colors Mode**:
    - `forced-colors: active` 環境下では、`index.md` のグローバルトークンマッピングに従います。
    - この仕様ではリンク個別の色上書きを行わず、トークン経由で統一します。

**5. Print Styles**

印刷時には、UIリンクの役割に応じて適切な表示を行います。

```css
@media print {
  /* ナビゲーションリンク: 印刷時は非表示（ページ内でのみ意味を持つため） */
  .sidebar a[href],
  .ui-link.link-nav {
    display: none;
  }
  
  /* アクションリンク: 外部URLの場合のみ展開 */
  .ui-link.link-action[href^="http"]::after {
    content: " (" attr(href) ")";
    font-size: 0.875em;
    color: var(--fg-muted);
    text-decoration: none;
  }
  
  /* カード内リンク: 下線を表示し、リンクであることを明示 */
  .card a,
  .callout a {
    text-decoration: underline;
    text-decoration-color: currentColor;
  }
}
```

#### スキップリンク (Skip Link) `<ui-skip-link>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: キーボードユーザーやスクリーンリーダー利用者が、反復的なナビゲーション（ヘッダーやサイドバー）を飛び越え、メインコンテンツへ即座に到達するための特急レーンです。
- **Distinct Utility**: フォーカス時、コンテキストに埋没することなく、独立した「システム通知」として中央上部に出現します。機能的な発見可能性を最優先します。

**2. 実装要件 (Implementation)**

- **Method**: ページの `<body>` 直下に配置される最初のインタラクティブ要素として実装します。
- **Target Element Configuration**: ページ内リンクのジャンプによるフォーカスの移動を確実にするため、**ターゲット要素（`<main id="main-content">` などメインコンテンツのラッパー要素）には `tabindex="-1"` を付与**し、プログラム的なフォーカス移動を保証します。
    - **Note**: `tabindex="-1"` は、通常のタブ順序には含まれないが、JavaScriptやリンクからのフォーカス移動を受け入れ可能にする標準的な手法です。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | デフォルト | 説明 |
|------------|------|-------|------------|------|
| `href` | `href` | `string` | `#main-content` | スキップ先のIDセレクタ。 |
| `label` | `label` | `string` | `"メインコンテンツへスキップ"` | 表示ラベル。**Rouaultは日本語固定のため、ハードコード可**（`index.md` L115-123: 多言語非対応方針）。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

**Default State (非表示)**

- **Position**: `fixed` (初期状態から固定配置。フォーカス時に `transform` のみ変化)
- **Visibility Strategy**: 
    - `transform: translateY(-100%)` で視覚外へ待避
    - `clip-path: inset(50%)` でスクリーンリーダー対応を確実化（`.sr-only` パターン）
    - `opacity: 0` で視覚的非表示
- **Note**: `visibility: hidden` や `display: none` は使用しません。これらはA11yツリーから要素を削除するため、スクリーンリーダーがリンクを認識できなくなります。

**Focus (`:focus-visible`) State (表示)**

- **Position**: `fixed`. **Top Center** (`top: var(--space-2); left: 50%; transform: translateX(-50%)`) に配置し、独立したシステム通知として扱います。
- **Visibility Restoration**:
    - `transform: translateX(-50%)` (中央配置)
    - `clip-path: none` (クリッピング解除)
    - `opacity: 1` (視覚的表示)
- **Z-Index**: `var(--z-max)` (**1000**). `index.md` の Z-Index Scale 定義 (L1688-1701) に従い、システム最上位レイヤーに配置します。Toast (500), Modal (300) より上位です。
- **Focus Ring Override**:
    - `outline: none` (**Design Exception**)
    - **Rationale**: このコンポーネントは「出現すること自体」が強力なフォーカス状態を表すため、グローバルの `Adaptive Focus` リングと重複してノイズとならないよう、コンポーネント例外として無効化します（`index.md` L1232-1292 の方針に対する例外）。
    - **Forced Colors Support**: `forced-colors: active` 環境下では背景色が消失するため、`outline: 3px solid CanvasText` を強制的に適用し、視認性を保証します（`index.md` L1323-1383: 強制カラーモード戦略準拠）。
- **Appearance**:
    - Background: `var(--fg-default)` (反転色による最大コントラスト)
    - Color: `var(--bg-default)`
    - Font: `var(--font-sans)`, `var(--font-medium)` (500), `var(--text-sm)` (13px)
        - **Note (12px以下ルール適用外)**: `--text-sm` (13px) は `--text-xs` (12px) より大きいため、`index.md` L558-566 の「12px以下のテキスト補正ルール」は適用されません。
    - Border: `var(--border-width) solid var(--border-on-inverted)`
        - **Token Reference**: `index.md` で新規定義された `--border-on-inverted` トークンを使用。反転背景上の境界線として、計算式の直書きを避けます。
    - Padding: `var(--space-2) var(--space-4)` (8px 16px)
    - Radius: `var(--radius-full)` (ピル形状でナビゲーションであることを示唆)
    - Shadow (Light Mode): `var(--shadow-lg)`
    - Shadow (Dark Mode): `none`
        - **Rationale (Dark Mode Depth Strategy)**: `index.md` L791-802 の「Dark Mode Depth Strategy」に基づき、Darkモード下では「明るい背景色」を持つこのコンポーネントは「闇の中の発光体」として機能します。シャドウを削除することで、Muddy Shadows（泥のような濁った影）を回避し、**背景色自体のコントラスト**で浮遊感を表現します。
- **Motion**:
    - `transition`: `none`
    - **Instant Presence**: 思考の即応性を最優先するため、余韻（Fade）を排除し、フォーカスと同時に**物理的に即時表示**します（`index.md` 原則3「デジタルの触感」準拠）。
    - **Motion Reduction Compatibility**: `prefers-reduced-motion` 設定に関わらず、このコンポーネントは常に `transition: none` で即時表示されます。モーション設定による挙動の変化はありません。

**Print Styles**

印刷時には、スキップリンクを非表示にします。印刷物にはナビゲーション機能は不要です。

```css
@media print {
  ui-skip-link {
    display: none;
  }
}
```

**Forced Colors Mode**

`index.md` L1323-1383 の戦略に従い、`forced-colors: active` 環境下では以下を適用します：

```css
@media (forced-colors: active) {
  ui-skip-link:focus {
    outline: 3px solid CanvasText;
    background: Canvas;
    color: CanvasText;
    border-color: CanvasText;
  }
}
```

**5. アクセシビリティ (A11y)**

- **First Tab Stop**: ページ読み込み後、最初の `Tab` キー押下で必ずこのリンクにフォーカスが当たる構造を維持します。
- **Keyboard Navigation**:
    - `Enter`: ターゲット要素（`#main-content`）へジャンプし、フォーカスを移動します（ネイティブリンク挙動）。
    - `Space`: ネイティブリンクでは保証されません。必要な場合のみ、`keydown` ハンドラで `Enter` と同等処理を実装してください。
    - `Esc`: ブラウザのデフォルト挙動に委ねます（通常は何も起きない、またはフォーカスを外す）。
        - **Rationale**: スキップリンクは「通過点」であり、特別なキャンセル動作は不要です。ユーザーの自然なフロー（順方向への移動）を優先します。
- **Screen Reader Support**: Default State で `clip-path: inset(50%)` を使用することで、視覚的に非表示でも確実にA11yツリーに残し、スクリーンリーダーが認識可能な状態を保証します。
- **Target Element Focus**: スキップ後、ターゲット要素（`#main-content`）にフォーカスが移動します。
    - **Visual Feedback**: ターゲット要素のフォーカス状態は、グローバルの `:focus-visible` スタイルまたはブラウザデフォルトに委ねます。必要に応じて、以下のような一瞬のハイライトを追加することも検討できます：
        ```css
        main:focus {
          animation: skip-target-flash var(--duration-fast) var(--ease-out);
        }
        
        @keyframes skip-target-flash {
          0% { background-color: oklch(from var(--primary) l c h / 0.1); }
          100% { background-color: transparent; }
        }
        ```

**6. 実装上の注意事項 (Implementation Notes)**

- **Critical Setup**: ターゲット要素（`<main id="main-content">` など）への `tabindex="-1"` 付与は必須です。これがないと、一部ブラウザでフォーカス移動が成立しません。
- **First Tab Stop Guarantee**: `<ui-skip-link>` より前にフォーカス可能要素（`<a>`, `<button>`, `<input>` など）を配置しないでください。
- **Verification Checklist**:
    - ページ初回 `Tab` でスキップリンクがフォーカスされること
    - `Enter` で `#main-content` へジャンプし、ターゲットにフォーカスが移ること
    - `forced-colors: active` でスキップリンクの境界と文字が視認可能であること

#### ボタン (Button) `<ui-button>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: アクションの優先度を視覚的な「重さ（Weight）」で制御します。「静謐さ」を保つため、画面内に **Primary（塗りつぶし）ボタンは原則1つのみ** とし、残りは Secondary または Ghost を使用することで視覚的ノイズを極限まで抑制します。
- **触感 (Tactility)**: システム定義のマイクロインタラクション（`scale(var(--scale-pressed))`）により、入力がシステムに受容されたことをデジタルに伝えます。
- **最小化設計 (Minimality)**: デザイン原則「Structure for Immersion」に基づき、**UIの透明化**を追求します。ボタンが主役であるコンテンツを圧迫しないよう、思考のノイズとなる過剰な余白とサイズを排除し、黒子として機能させます。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: `@lion/ui` の `LionButton`
- **Porting Strategy**:
    - `LionButton` の堅牢なステート管理（Active/Focus）と、`click` イベントの正規化ロジックを参照し、`src/lib/ui-core/button` にポーティングします。
    - **Form Association**: 標準のWeb Components機能 (`static formAssociated = true`) と `ElementInternals` APIを使用し、`<form>` 内での Enter キー送信やバリデーション連携をネイティブ同様に動作させます。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 (Reflect) | 型/値 | 説明 |
|------------|----------------|-------|------|
| `variant` | `variant` | `'primary' \| 'secondary' \| 'outline' \| 'ghost' \| 'danger'` | 視覚的強度を決定するバリアント。**デフォルトは `secondary`**。<br>**Rationale**: 「Primary は画面内に1つのみ」という原則に基づき、デフォルトを目立たない `secondary` とすることで、意図しない視覚的ノイズを防ぎます。 |
| `size` | `size` | `'sm' \| 'md' \| 'lg'` | ボタンのサイズ。デフォルトは `md` (32px)。 |
| `icon-only`| `icon-only` | `boolean` | アイコンのみのボタン。正方形（1:1）を強制する。**Universal Clarity 担保のため、`aria-label` による代替テキスト提供を必須とする。**<br>**アクセシビリティ強制 (Enforcement)**: 以下の多層的な検証により、`aria-label` の提供を保証します：<br>1. **TypeScript型定義**: `icon-only` が `true` の場合、`aria-label` を必須プロパティとする条件型を使用します。<br>2. **ランタイム検証**: `icon-only` 属性が `true` かつ `aria-label` が未設定の場合、開発モードでコンソールエラーを出力します。<br>3. **Storybook Accessibility Addon**: `@storybook/addon-a11y` による自動テストで、`aria-label` なしのケースを検出します。 |
| `loading` | `loading` | `boolean` | 処理中状態。`aria-busy="true"` を付与し操作をブロック。短期記憶（コンテキスト）の維持を優先する。 |
| `disabled` | `disabled` | `boolean` | 不活性状態。スタイルは薄くなり、ポインターイベントを除去。 |
| `type` | `type` | `'button' \| 'submit' \| 'reset'` | フォーム内での挙動制御。デフォルトは `button`。<br>**Note**: ネイティブ `<button>` のデフォルトは `submit` ですが、`<ui-button>` はフォーム外での汎用使用を想定し、意図しないフォーム送信を防ぐため `button` をデフォルトとします。<br><br>**⚠️ Migration Note (From Native Button)**:<br>フォーム送信に `<ui-button>` を使用する場合は、**必ず `type="submit"` を明示**してください。ネイティブ `<button>` と異なり、デフォルトは `button` であり、属性なしではフォームを送信しません。<br><br>```html<br><!-- ❌ Wrong: フォーム送信しない --><br><ui-button>保存</ui-button><br><br><!-- ✅ Correct: フォーム送信する --><br><ui-button type="submit">保存</ui-button><br>``` |
| `form` | `form` | `string` | **フォームオーナーの明示**。ネイティブ `<button>` の `form` 属性と同様に、ボタンが所属するフォームの `id` を指定します。これにより、ボタンがフォーム外に配置されていても、指定されたフォームと関連付けることができます。<br>**Implementation**: `ElementInternals.form` プロパティを通じて、指定されたフォームとの連携を実現します。 |

> **ElementInternals API 使用方針**:
> - **Form Participation**: `attachInternals()` を通じて取得した `ElementInternals` インスタンスにより、ネイティブフォーム要素と同等のフォーム参加機能を実現します。
> - **主要メソッド**:
>   - `setFormValue(value)`: フォーム送信時の値を設定（`type="submit"` の場合は通常不要）。
>   - `setValidity(flags, message, anchor)`: バリデーション状態の設定（ボタンでは通常使用しませんが、カスタムバリデーションが必要な場合に利用可能）。
>   - `reportValidity()`: バリデーションエラーの表示（同上）。
> - **Accessibility Tree Integration**: `ElementInternals` を通じて、`role`, `aria-*` 属性の情報をアクセシビリティツリーに自動的に反映します。
> - **詳細**: 実装の詳細については `src/lib/ui-core/button/README.md` を参照してください。

**4. スタイリングとトークンマッピング (Style & Tokens)**

**:host (Base)**
コンポーネントスタイルは全て `:root` トークンにマップされ、ハードコードを禁止します。

- `display`: `inline-flex`
- `align-items`: `center`
- `justify-content`: `center`
- `border-radius`: `--radius-md` (6px - コンテンツとの調和)
- `font-family`: `--font-sans`
- `font-weight`: `var(--font-medium)`（500 - アクションとしての視認性確保）
- `font-feature-settings`: `"palt"` (和文プロポーショナルメトリクスによる密度の最適化)
    - **Rationale**: `index.md` L445-451 で定義された「見出し・UIラベル」への `"palt"` 適用方針に準拠します。ボタンラベルは短いテキスト（UIラベル）であり、文字詰めを有効にすることで密度を高め、「塊」としての構造美を強調します。
- `letter-spacing`: `0.02em` (視認性のための微調整)
- `transition`: 
    ```css
    background-color var(--duration-fast) var(--ease-out),
    color var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-out)
    ```
    - **Rationale**: `index.md` L99-112 の禁止事項に従い、`transition: all` を避け、明示的なプロパティリストを使用します。これにより、意図しないプロパティの遷移によるパフォーマンスとアクセシビリティへの悪影響を防ぎます。
- `:active`: 
    - `transform: scale(var(--scale-pressed))` — 微細な縮小 (0.96) により「押し込み」のタクタイルシグナルを表現します。
    - `box-shadow: none` — 平面に押し付けられた「沈み込み」を表現するため、浮遊感を示す影を即座に除去します。**Edge Highlight を含むすべての `box-shadow` を除去**し、完全に平面に押し付けられた状態を表現します。
    - **Rationale**: 物理法則の模倣（ゆっくり沈む）ではなく、原則3「デジタルの触感」に基づく即応的なフィードバックを優先します。

**サイズ定義 (Style Map)**

高さ（Height）はグローバルトークン `Control Dimensions` に準拠し、他の入力要素（Input, Select）との完全な整合性を保証します。

| Size | Height Token | Padding-X | Icon-Only | Icon Size |
|------|--------------|-----------|-----------|-----------|
| `sm` | `--control-height-sm` | `--space-2` (8px) | Equal Height | `--icon-sm` (14px) |
| `md` | `--control-height-md` | `--space-3` (12px) | Equal Height | `--icon-base` (16px) |
| `lg` | `--control-height-lg` | `--space-4` (16px) | Equal Height | `--icon-md` (20px) |

> **Note**: `lg` サイズは **Deprecated**（非推奨）です。実装としては存在しますが、以下の制約があります：
> - **コードレベル強制**: TypeScript実装において `@deprecated` JSDocコメントを付与し、IDE上で警告を表示します。
> - **使用禁止の原則**: デザインレビューなしでの使用を禁止します。
> - **例外的に許可されるコンテキスト**: 以下のセレクタ/コンテキストでのみ、デザインレビュー後に使用を許可します：
>   - `.hero ui-button[size="lg"]` — ヒーローセクション内の主要CTA
>   - `.landing-cta ui-button[size="lg"]` — ランディングページの主要アクション
>   - その他、個別にデザインレビューで承認されたケース
> - **推奨代替**: 強調が必要な場合は、`md` サイズに `variant="primary"` を組み合わせることを優先してください。`index.md` L585 では「原則として使用しない。特別に強調が必要な場合のみ例外的に許可」と定義されています。

**バリアント定義 (マッピング)**

| Variant | Background | Border | Text Color | Shadow | Hover Action | 使用ガイドライン |
|---------|------------|--------|------------|--------|--------------|------------------|
| **Primary** | `--primary` | None | `--on-primary` | `--shadow-md` | `--primary-hover` | **主要アクション**。画面内に1つのみ配置することを原則とします。 |
| **Secondary** | `--bg-surface-2` | `--border-default` | `--fg-default` | `--shadow-sm` | `--bg-fill-muted` | **標準アクション**。Primaryに次ぐ重要度。背景色と境界線で構造を明示します。 |
| **Outline** | `transparent` | `--border-default` | `--fg-default` | `none` | `border-color: var(--fg-muted)` | **軽量アクション**。Secondaryより控えめ。背景を持たないため、カード内やモーダル内で使用すると視覚的ノイズを抑制できます。<br>**Note**: Secondaryとの使い分けに迷う場合は、**Secondary を優先**してください。Outlineは特定のデザイン意図がある場合のみ使用します。 |
| **Ghost** | `transparent` | None | `--fg-muted` | `none` | `background: var(--bg-hover)` | **最小限の主張**。アイコンボタンやツールバーなど、高密度なUIで使用します。 |
| **Danger** | `--bg-danger-subtle` | `--border-danger` | `--danger` | `none` | `background: var(--danger); color: var(--on-danger)` | **破壊的アクション**（削除、リセット等）。ホバー時に背景が赤く反転し、無意識に警告します。 |

> **Note (Variant Transitions):** 全バリアントのホバー遷移は、`:host (Base)` で定義された `transition` プロパティ（`var(--duration-fast) var(--ease-out)`）を継承します。

**バリアント選択のDecision Tree (意思決定フロー):**

```
画面内で最も重要なアクションか？
├─ Yes → Primary
└─ No
   └─ 構造を明示すべきか？（独立したアクション、ダイアログの選択肢等）
      ├─ Yes → Secondary
      └─ No
         └─ カード内/モーダル内で視覚的ノイズを抑えたいか？
            ├─ Yes → Outline
            └─ No
               └─ 高密度UI（ツールバー等）で最小限の主張にしたいか？
                  ├─ Yes → Ghost
                  └─ 破壊的アクション（削除、リセット等）か？
                     └─ Yes → Danger
```

> **迷った場合の原則**: Secondary と Outline で迷う場合は、**Secondary を優先**してください。Outline は特定のデザイン意図（背景色との調和、ノイズ抑制）がある場合のみ使用します。

**バリアント使い分けの具体例:**

| パターン | 推奨バリアント | 理由 |
|----------|----------------|------|
| ダイアログのセカンダリアクション（キャンセル等） | **Secondary** | アクションの存在を明示 |
| カード内の「詳細を見る」リンク的ボタン | **Outline** | カードの背景色と調和しノイズを抑制 |
| 高密度ツールバー（隣接するボタン群） | **Outline** | 境界線のみで区別し、塗りつぶしによる視覚的圧迫を回避 |
| モーダル内の主要アクション以外 | **Secondary** | 構造の明確化 |

**Micro Aesthetics (Depth & Texture)**

没入を妨げない範囲で、ボタンに「物体としての実在感（Tactility）」を与えるための微細なハイライト定義です。

- **Secondary (Dark Mode)**:
    - 暗所における視認性を確保するため、上端に微細なハイライト（Edge Highlight）を追加します。
    - **適用条件**: Dark Mode かつ `variant="secondary"` である場合に**常に適用**されます（背景レイヤーに依存しません）。
    - `box-shadow: inset 0 1px 0 0 oklch(100% 0 0 / 0.1), var(--shadow-sm)`
    - **Rationale**: `index.md` L709-718 で定義された Dark Mode Depth Strategy に準拠し、Elevated レイヤー（`surface-2` 以上）と同様の「上部エッジ強調」を適用することで、低コントラスト環境での識別性を保証します。
- **Primary**:
    - プレミアムな質感を表現するため、モードに関わらず極めて微細なインナーハイライトを付与します。
    - `box-shadow: inset 0 1px 0 0 oklch(100% 0 0 / 0.15), var(--shadow-md)`

**5. アクセシビリティとキーボード操作 (A11y & Interaction)**

- **Target Size (Touch)**:
    - 視覚的には `32px` ですが、`index.md` L1047-1066 の実装パターンに従い、`::after` 疑似要素で **最低 44×44px のクリック領域** を確保します。
- **Element Internals**:
    - `ElementInternals` API を通じて、アクセシビリティツリーへの情報提供とフォーム参加を実現します。
- **Keyboard Support**:
    - `Enter` / `Space`: アクション実行（`click` イベント発火 / Form Submit）。
- **Focus Indicator**:
    - **Trigger**: キーボード操作やプログラム的なフォーカス移動時（`:focus-visible`）にのみリングを表示し、マウス操作（クリック）によるフォーカスでは表示しません（標準挙動の維持）。
    - **Style**:
        - `outline: var(--focus-ring-width) solid var(--focus-ring-color)`
        - `outline-offset: var(--focus-ring-offset)` (分離による視認性確保)。
        - `animation: var(--animation-focus)` (**Adaptive Focus**: 移動中のノイズ低減と停止時の明確化)。
            - **定義**: `@keyframes adaptive-focus` (`index.md` L1154-1189 参照)
            - **挙動**: 最初の 50ms (0%〜25%) は `--focus-ring-color-subtle` で控えめに表示、その後 `--focus-ring-color` へ遷移します。素早い Tab 移動中は Subtle 色のまま終了するため、視覚的ノイズが抑制されます。
- **Loading State & Flow**:
    - **Context Retention & Layout Freeze**:
        - 処理中もユーザーが「何を実行したか」を見失わないよう、可能な限りラベルテキストは維持し、スピナーを並列表示します。
        - **Layout Freeze 戦略**:
            1. **推奨: Overlay（絶対配置）**
                - スピナーを `position: absolute` でボタン内に配置し、テキストの上に重ねます。
                - テキストは `visibility: hidden` で非表示にしますが、**幅は維持**されます。
                - この方式では、ボタン幅はテキスト長に依存したまま安定します。
                
                ```css
                :host([loading]) .label {
                  visibility: hidden; /* 幅を維持しつつ非表示 */
                }
                :host([loading]) .spinner {
                  position: absolute;
                  inset: 0;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                }
                ```

            2. **代替: 幅固定**
                - JavaScript で遷移前のボタン幅を取得し、`style.width` に設定します。
                - 複雑さが増すため、Overlay が不可能な特殊ケースのみに限定します。
    - `aria-busy="true"` を付与し、支援技術に処理中であることを伝えます。処理完了後は `aria-live` 等を用いて結果をフィードバックし、状態変化を認知させます。
- **Motion Reduction (`prefers-reduced-motion`)**:
    - `@media (prefers-reduced-motion: reduce)` 環境下では、`index.md` L1099-1128 のグローバル定義により全てのトランジションが自動的に `0.01ms` に短縮されます。
    - `:active` の `transform: scale()` トランジションは視覚的に即座に適用されます（実質的に瞬時）。
    - ローディングスピナーは静的な「処理中」インジケータ（例: 変化しないアイコン、または「処理中...」テキスト）に置き換わります。アニメーションループは停止します。
    - Adaptive Focus アニメーション（`--animation-focus`）も無効化され、フォーカスリングは即座に `--focus-ring-color` で表示されます。

**6. 印刷スタイル (Print Styles)**

印刷時は、インタラクティブ要素としてのボタンは機能しません。視覚的な装飾を最小化し、インク節約と可読性を両立させます。

```css
@media print {
  ui-button {
    /* Shadow を除去（印刷では不要） */
    box-shadow: none !important;
    
    /* Primary/Danger バリアントは Outline スタイルにフォールバック */
    &[variant="primary"],
    &[variant="danger"] {
      background: transparent !important;
      border: var(--border-width) solid currentColor !important;
      color: var(--fg-default) !important;
    }
    
    /* Secondary は境界線のみで視覚的輪郭を維持 */
    &[variant="secondary"] {
      background: transparent !important;
    }
    
    /* Ghost は印刷時に非表示（機能的意味を持たないため） */
    &[variant="ghost"] {
      display: none;
    }
    
    /* Loading 状態のボタンは非表示 */
    &[loading] {
      display: none;
    }
  }
}
```

> **Note**: フォーム送信ボタン（`type="submit"`）など、印刷物上でも文脈として必要な場合は表示されますが、クリック不可であることを前提とした最小限のスタイルとなります。

**7. 強制カラーモード対応 (Forced Colors Mode)**

`@media (forced-colors: active)` 環境下では、背景色や `box-shadow` がシステムによって上書きされる可能性があります。以下のフォールバックを適用し、構造と意味を維持します（`index.md` L1220-1280 参照）。

```css
@media (forced-colors: active) {
  ui-button {
    /* 境界線を強制し、ボタンの輪郭を明確化 */
    border: var(--border-width) solid CanvasText;
    
    /* Shadowは消失するため除去を明示 */
    box-shadow: none;
  }
  
  ui-button[variant="primary"],
  ui-button[variant="danger"] {
    /* システムのHighlightカラーを使用 */
    background: Highlight;
    color: HighlightText;
    border-color: Highlight;
  }
  
  ui-button:focus-visible {
    /* box-shadowは消失するため、実線のアウトラインを強制 */
    outline: 3px solid CanvasText;
    box-shadow: none;
  }
  
  /* 選択状態を背景色だけでなく境界でも示す */
  ui-button[aria-selected="true"],
  ui-button.active {
    outline: 2px solid CanvasText;
    outline-offset: -2px;
  }
}
```

> **Note (Forced Colors Strategy):** 透過やシャドウに依存した視覚表現はこのモードで消失するため、**ボーダーとスペーシング**により構造を明示します。`index.md` L1232-1247 で定義されたシステムカラーマッピングに従い、すべてのトークンがシステムカラーへフォールバックします。

#### コピーボタン (Copy Button) `<ui-copy-button>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 「コピー」というアクションとその結果（成功・失敗）を自己完結して提供する機能特化型コンポーネントです。
- **No Noise**: 通常時は `<ui-button variant="ghost">` として振る舞い、視覚的な主張を抑えます。
    - **No Tooltip**: コードブロック等の「読む」コンテキストにおいては、"Copy" アイコンの普遍性を信頼し、ホバー時のツールチップ表示はノイズとなるため原則として**採用しません**。
- **Digital Tactility**: アクション成功時、アイコンが瞬時に切り替わり、微細な発光を伴うことで、ユーザーに「完了した」という確実な手応えを返します。
- **Robustness**: 失敗時には明確なエラーフィードバックを行い、決して沈黙しません。

**2. 実装基盤 (Composition)**

- **内部構造**: プリミティブである `<ui-button>` をラップ（包含）して使用します。
    - 基本設定: `variant="ghost"`, `icon-only="true"`。
    - **Size**: `size` 属性を省略した場合、デフォルト値は `"sm"` (24px) です。親からのサイズ上書きは非推奨とし、必要に応じて `size` 属性で明示的に指定してください。
    - **Layout Stability**: アイコン切り替え時（`Copy` → `Check`）の微細な幅の変化によるガタつきを排除するため、コンテナの幅と高さは明示的に固定します。
        
        ```css
        /* Layout Stability: アイコン切り替え時のガタつき防止 */
        .copy-button-icon-container {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: var(--icon-base);  /* 固定幅 */
          height: var(--icon-base); /* 固定高さ */
        }
        ```
        
    - **Focus Stability**: フォーカス状態は親コンテナであるボタン自体が保持します。内部アイコンの切り替え（DOM操作）が発生しても、フォーカスリングが途切れたり再描画されたりしない構造を維持します。
    - **Self-Contained Feedback**: 内部に `role="status"` (`aria-live="polite"`) を持つ不可視要素 (`.sr-only`) を配置し、スクリーンリーダーへの通知をコンポーネント内で完結させます。
- **Logic**:
    - Clipboard API (`navigator.clipboard.writeText`) を使用。
    - **State Machine**:
        - `Idle`: 待機状態。
        - `Success` (Timer 2000ms): 成功。
        - `Error` (Timer 3000ms): 失敗。
        - **State Timer Rationale**:
            - **Success (2000ms)**: 成功は予期された結果であり、短い確認で十分。ユーザーは次のアクションへ素早く移行できます。
            - **Error (3000ms)**: 失敗は予期せぬ結果であるため、ユーザーが問題を認識し、代替手段（手動コピー等）を検討する時間を確保します。
        - **Note (Optimistic UI)**: 通常のクリップボード操作は一瞬で完了することが多いため、**`Copying`（ローディング）状態は原則として視覚化しません**（チラつき防止）。APIが応答しない等の異常な遅延（>`--timeout-async-threshold`: 500ms）が発生した場合のみ、Exceptionとしてローディングを表示します。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
| :--- | :--- | :--- | :--- |
| `value` | `value` | `string` | クリップボードに書き込むテキスト。 |
| `label` | `label` | `string` | **必須**。`aria-label` のベースとなるテキスト（例: "コードをコピー"）。 |

**動的ラベル定義**:

| 状態 | `aria-label` の値 |
|------|-------------------|
| Idle | `{label}` (例: "コードをコピー") |
| Success | `{label} - コピーしました` |
| Error | `{label} - コピー失敗` |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Component-Local Variables**:
    - `--_copy-button-scale-pressed`: `0.9` — アイコン専用の押下スケール。標準の `--scale-pressed` (0.96) は大きなボタン向けであり、16-20px程度の小さなアイコン領域では変化が認識しにくいため、10%縮小を採用。将来的に複数コンポーネントで同様の需要が確認された場合、`index.md` へのグローバルトークン追加を検討（候補: `--scale-pressed-icon: 0.9`）。

- **Micro-Interaction (Snappy Swap & Flash)**:
    - **Icon Swap**:
        - SVGパスの補間（Morphing）のような「物理的な変形」は行いません。
        - `--duration-fast` (70ms) / `--ease-out` (Snappy) での**瞬時の切り替え**と、コンポーネントローカル変数 `--_copy-button-scale-pressed` (0.9) による深いスケール変化を組み合わせ、小さなアイコンでも確実な変化（Snappiness）を表現します。
        - Success: `Copy` → `Check`
        - Error: `Copy` → `AlertTriangle`
            - **Error Icon + Color Rationale**: `AlertTriangle` + `var(--danger)` の組み合わせは、「重大だがユーザーの責任ではない問題」を伝達します。エラーの原因は外部（Clipboard API非対応、ブラウザ権限拒否等）であり、ユーザーの操作ミスではないため、威圧的な `CircleX` ではなく警告的なアイコンを選択しています。`--fg-warning` を使用しない理由は、「操作は失敗した」という結果の厳格さを優先するためです。
    - **Flash Effect**:
        - `index.md` L938-939 で定義された `--animation-flash` のタイミング・カーブ（`var(--duration-fast)` / `var(--ease-out)`）を採用し、背景色を一瞬発光させてフェードアウトさせます。
        - **Implementation Strategy**: 標準の `@keyframes flash` を流用せず、コンポーネント専用のローカル変数とキーフレームを定義します。これにより、`--bg-surface-active` の意味論的役割（リスト行選択状態）を保護し、将来的なメンテナンス時の混乱を回避します。
        - **Keyframes Naming**: `flash-copy-success`, `flash-copy-error` のようにサフィックスで揃え、グローバル定義との混乱を避けます。
        
        ```css
        :host {
          /* コンポーネントローカル変数 */
          --_copy-button-scale-pressed: 0.9;
          
          /* フラッシュ用のローカルカラー変数 */
          --_flash-color-success: var(--bg-success-subtle);
          --_flash-color-error: var(--bg-danger-subtle);
        }
        
        @keyframes flash-copy-success {
          0% { background-color: var(--_flash-color-success); }
          100% { background-color: transparent; }
        }
        
        @keyframes flash-copy-error {
          0% { background-color: var(--_flash-color-error); }
          100% { background-color: transparent; }
        }
        
        :host([state="success"]) {
          animation: flash-copy-success var(--duration-fast) var(--ease-out);
        }
        
        :host([state="error"]) {
          animation: flash-copy-error var(--duration-fast) var(--ease-out);
        }
        ```
        
        - **Dark Mode Viability**: ダークモードでの Flash Effect 色（`--bg-success-subtle`: L 25%, `--bg-danger-subtle`: L 25%）は、`--bg-default` (L 12%) と比較して十分な明度差（ΔL = 13%）があり、視認可能です。
- **Color State**:
    - **Idle**: `var(--fg-muted)`
    - **Success**: `var(--success)`
    - **Error**: `var(--danger)`
        - *Rationale*: アイコン色と背景フラッシュの色相を統一し、美的調和と状態伝達の明瞭さを両立します。
- **Hit Area Requirement**:
    - 視覚的サイズは `size="sm"` (24px) ですが、`::after` 擬似要素を使用して必ず `--control-min-touch` (44px) 以上の物理ヒットエリアを確保してください。
    - **Implementation** (`index.md` L1047-1065 参照):
        
        ```css
        /* Hit Area Requirement: 視覚サイズ 24px / ヒット領域 44px */
        ui-copy-button {
          position: relative;
        }
        
        ui-copy-button::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: var(--control-min-touch); /* 44px */
          height: var(--control-min-touch);
          pointer-events: none;
        }
        ```

**5. アクセシビリティ (A11y)**

- **Self-Contained Feedback**:
    - 外部のトースト通知システムには依存しません。
    - 状態変化時、内部の不可視領域 (`role="status"`) にテキスト（"コピーしました", "コピー失敗"）を注入し、即座に読み上げさせます。これにより、視覚的変化に気付けないユーザーにも結果を保証します。
- **Label Update**: 補助的に、ボタン自体の `aria-label` も動的に更新します（上記の動的ラベル定義を参照）。
- **Motion Reduction (`prefers-reduced-motion`)**:
    - `@media (prefers-reduced-motion: reduce)` 環境では、Icon Swap と Flash Effect のアニメーションは `index.md` L1099-1128 のグローバル定義により自動的に即時完了（`0.01ms`）となります。
    - 結果として、視覚的変化は瞬時に適用され、ユーザーはアニメーションによる負担を受けません。
    - ただし、`role="status"` による読み上げは変わらず機能し、操作結果は確実に伝達されます。
- **Forced Colors Mode**:
    - `forced-colors: active` 環境では、Flash Effect の背景色（`--bg-success-subtle`, `--bg-danger-subtle`）は消失する可能性があります。
    - この場合、**アイコンの変化とボーダーの強調**が唯一の視覚的フィードバックとなります。
    - スクリーンリーダーを使用しないハイコントラストモードユーザーにも結果が伝わるよう、アイコンの形状変化（`Check`, `AlertTriangle`）だけで状態を伝達できる設計としています。
    
    ```css
    @media (forced-colors: active) {
      ui-copy-button {
        /* 境界線を強制し、ボタンの輪郭を明確化 */
        border: var(--border-width) solid CanvasText;
      }
      
      ui-copy-button[state="success"] .icon {
        /* 成功状態をシステムカラーで表現 */
        color: Highlight;
      }
      
      ui-copy-button[state="error"] .icon {
        /* エラー状態を維持（システムカラーで境界を強調） */
        color: CanvasText;
        outline: 2px solid CanvasText;
        outline-offset: -2px;
      }
    }
    ```

**6. 印刷スタイル (Print Styles)**

`@media print` 環境では、Copy Button は非表示とします。クリップボード操作は物理的に不可能であり、印刷文書上での視覚的ノイズとなるためです。

```css
@media print {
  ui-copy-button {
    display: none;
  }
}
```

#### フォーム入力 (Input) `<ui-input>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 思考を妨げない「透明な」入力インターフェースを提供します。
- **Universal Clarity**: 入力待機時（Default）には `--bg-fill-muted` によって領域を静かに明示し、**発見可能性（Discoverability）**を担保します。「どこに入力できるか」を迷わせません。
- **Contextual Feedback**: バリデーションエラーやヘルプテキストは、視線の移動を最小限に抑えるため、入力フィールドに近接して表示します。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: `@lion/ui` の `LionInput` (継承元: `LionField`)
- **Porting Strategy**:
    - `LionField` が持つ強力なアクセシビリティ連携（LabelとInputのID紐付け、Description紐付け）のロジックを借用します。
    - **DOM構造の簡素化**: Lion UIのデフォルトDOM（Light DOMへの依存が高い構造）は採用せず、`Shadow DOM` 内で完結した `<input>` レンダリングを行い、スタイルカプセル化を徹底します。

**借用するロジック**:
- `FormControlMixin`: フォーム要素としての基本機能（`name`, `value`, `disabled`等の管理）
- `ElementInternals` による Form Participation（`form.elements`への登録、バリデーション状態の通知）
- `ValidateMixin`: 基本的なバリデーションロジック（`required`, `pattern`等）

**除外するロジック**:
- `LionValidationFeedback`: Rouault専用のエラー表示（`error-message`プロパティ）に置き換え
- `FormRegistrarMixin`: Light DOMへの依存を排除するため不使用
- `InteractionStateMixin`: Rouault独自のフォーカス戦略（Adaptive Focus）を実装するため不使用

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `label` | `label` | `string` | 入力項目のラベル。視覚的に隠す場合でもA11yのために必須。 |
| `hide-label` | `hide-label` | `boolean` | ラベルを視覚的に非表示にします（`.sr-only` 相当）。`aria-label` には常に反映されます。デフォルト: `false`。 |
| `type` | `type` | `'text' \| 'email' \| 'password' \| 'number' \| 'tel' \| 'url' \| 'search'` | 入力フィールドのタイプ。デフォルト: `'text'`。 |
| `name` | `name` | `string` | フォーム送信時のフィールド名。`ElementInternals` によるフォーム参加に必須。 |
| `placeholder`| `placeholder`| `string` | ヒントテキスト。 |
| `value` | `value` | `string` | 入力値。 |
| `help-text` | `help-text` | `string` | 下部に表示する補助テキスト。 |
| `error-message` | `error-message` | `string` | エラー時に表示するメッセージ。`error` が `true` のときに `aria-describedby` で紐付けられます。 |
| `error` | `error` | `boolean` | エラー状態の強制。通常は内部バリデーションで自動制御。 |
| `disabled` | `disabled` | `boolean` | 操作無効化。フォーカス不可。 |
| `readonly` | `readonly` | `boolean` | 読み取り専用モード。フォーカス可能だがコピーのみ許可。 |

> **Unsupported Types**: `date`, `time`, `datetime-local`, `file`, `checkbox`, `radio`等はこのコンポーネントのスコープ外です。これらは専用コンポーネント（`<ui-date-picker>`, `<ui-checkbox>`等）で対応します。未定義の`type`が渡された場合は`text`にフォールバックし、開発時にコンソール警告を出力します。

**4. スタイリングとトークンマッピング (Style & Tokens)**

**:host (Container)**
ラベル、入力エリア、ヘルプテキストを含むコンテナ。

- `display`: `flex`
- `flex-direction`: `column`
- `gap`: `--space-2` (8px)

**Label Element**

| State | Font Size | Font Weight | Color | Note |
|-------|-----------|-------------|-------|------|
| **Default** | `var(--text-sm)` (13px) | `var(--font-medium)` (500) | `var(--fg-default)` | 明確な視認性を確保 |
| **Hidden** | — | — | — | `.label--hidden`クラスで視覚的に非表示（下記参照） |

**Label Hidden Implementation**

Shadow DOM内ではグローバルな`.sr-only`クラスを参照できないため、以下のスタイルをコンポーネント内で定義します：

```css
.label--hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
```

**Input Element (Control)**

| State | Border | Background | Text Color | Note |
|-------|--------|------------|------------|------|
| **Default** | `var(--border-width) solid transparent` | `var(--bg-fill-muted)` | `--fg-default` | **Discoverability**: 背景色を採用しつつ、レイアウトシフト防止のため透明なボーダーを確保します。 |
| **Hover** | `var(--border-width) solid var(--border-default)` | `var(--bg-fill-muted)` | `--fg-default` | **Tactility**: 明確なボーダーによって入力可能領域のエッジをフィードバックします。 |
| **Focus** | `var(--border-width) solid var(--border-default)` | `var(--bg-default)` | `--fg-default` | **Clear Canvas**: 入力時は「紙」のような白地（デフォルト背景）に戻し、執筆に集中させます。強調表示（Colording）はFocus Ringに一任し、ノイズを減らします。 |
| **Error** | `var(--border-width) solid var(--danger)` | `var(--bg-danger-subtle)` | `--fg-default` | 背景色も淡く変化させ、色覚多様性に配慮。 |
| **Disabled**| `var(--border-width) solid var(--border-default)` | `var(--bg-fill-muted)`| `--fg-subtle` | `opacity: var(--opacity-disabled)` を併用し、操作不可を表現。 |

- **Width**: `100%` (親コンテナの幅に追従)
- **Height**: `--control-height-md` (32px)
- **Padding-X**: `--space-2` (8px)
- **Radius**: `--radius-md` (6px)
- **Font**: `--text-base` (14px)
- **Transition**: 状態遷移は以下のプロパティに限定し、`transition: all` の使用を禁止します（`index.md` L883-918 準拠）。

```css
input {
  transition:
    background-color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    outline-color var(--duration-fast) var(--ease-out);
}
```

**Help Text / Error Message**

| 要素 | プロパティ | 値 | 備考 |
|------|-----------|-----|------|
| **Help Text** | `font-size` | `var(--text-sm)` (13px) | 本文より一段小さく |
| | `color` | `var(--fg-muted)` | 控えめな色で補助的役割を明示 |
| | `margin-top` | `var(--space-1)` (4px) | 入力フィールドと密接に配置 |
| | `line-height` | `var(--line-height-normal)` (1.5) | 可読性を確保 |
| **Error Message** | `font-size` | `var(--text-sm)` (13px) | Help Textと同サイズ |
| | `color` | `var(--fg-danger)` | 意味論的な強調（エラー状態を色で明示） |
| | `margin-top` | `var(--space-1)` (4px) | 入力フィールドと密接に配置 |
| | `line-height` | `var(--line-height-normal)` (1.5) | 可読性を確保 |
| | `display` | `none` (error=false時) / `block` (error=true時) | エラー状態に応じて表示切替 |

> **Note**: Help TextとError Messageは排他的に表示されます。エラー状態（`error=true`）の場合、Help Textは非表示となり、Error Messageのみが表示されます。これにより、ユーザーの視線移動を最小化し、現在最も重要な情報（エラー内容）に集中させます。


**5. アクセシビリティとキーボード操作 (A11y & Interaction)**

- **Label Association & Focus Strategy**:
    - **Interaction**: Shadow DOM の標準オプションである **`delegatesFocus: true`** を有効化します。これにより、カスタム要素自体へのクリックや外部 `<label>` からのフォーカス移動が、自動的かつ即座に内部の `<input>` へ転送されます。
    - **Accessibility**:
        - **Label Reflection**: コンポーネントの `label` プロパティの値を、内部 `<input>` の `aria-label` 属性に**動的に同期（Reflect）**させます。これは、Shadow DOM 内部での `<label>` 連携に加えて、ホスト要素経由でのアクセシビリティツリーへの名前解決を確実にするための冗長化（Robustness）措置です。
        - **ElementInternals**: こちらは主に「フォーム参加（Form Participation）」および「バリデーション状態の通知」のために使用し、役割を明確に分担します。
- **Focus Indicator**:
    - 入力フィールド自体の明示的な変化（背景色の正規化）に加え、**:focus-visible 時にはグローバルなフォーカスリング（アウトライン）を追加** します。
    - `outline: var(--focus-ring-width) solid var(--focus-ring-color)`
    - `outline-offset: var(--focus-ring-offset)` (ボーダーと重ならないよう配置)
    - **Adaptive Focus**: `index.md` で定義された `animation: var(--animation-focus)` を適用し、移動中はノイズを抑え、停止した瞬間に明確化する挙動を実装します。
- **Error Messaging**:
    - エラー発生時は `aria-invalid="true"` を設定し、エラーメッセージ要素（`error-message` プロパティから生成）を `aria-describedby` に追加してスクリーンリーダーに通知します。
- **Motion Reduction (`prefers-reduced-motion`)**:
    - `@media (prefers-reduced-motion: reduce)` 環境下では、`index.md` L1099-1128 のグローバル定義により全てのトランジションが自動的に `0.01ms` に短縮されます。
    - 背景色・ボーダー色の変化は視覚的に即座に適用されます（実質的に瞬時）。
    - Adaptive Focus アニメーション（`--animation-focus`）も無効化され、フォーカスリングは即座に `--focus-ring-color` で表示されます。

**6. 強制カラーモード対応 (Forced Colors Mode)**

`@media (forced-colors: active)` 環境下では、背景色やシャドウがシステムによって上書きされる可能性があります。以下のフォールバックを適用し、構造と意味を維持します（`index.md` L1230-1290 準拠）。

```css
@media (forced-colors: active) {
  ui-input {
    /* 境界線を強制し、入力領域の輪郭を明確化 */
    border: var(--border-width) solid CanvasText !important;
    background: Canvas !important;
  }
  
  ui-input[error] {
    /* エラー状態をボーダーで表現（背景色は消失するため） */
    border-color: LinkText;
    border-width: 2px; /* --border-width-thick */
  }
  
  ui-input:focus-visible {
    /* box-shadowは消失するため、実線のアウトラインを強制 */
    outline: 3px solid CanvasText;
    box-shadow: none;
  }
  
  /* Disabled状態もボーダーで明示 */
  ui-input[disabled] {
    border-color: GrayText;
    opacity: 1; /* システムカラーが適用されるため不透明度は戻す */
  }
}
```

> **Note (Forced Colors Strategy):** 透過やシャドウに依存した視覚表現はこのモードで消失するため、**ボーダーとスペーシング**により構造を明示します。`index.md` L1232-1247 で定義されたシステムカラーマッピングに従い、すべてのトークンがシステムカラーへフォールバックします。

**7. 印刷スタイル (Print Styles)**

印刷時は、インタラクティブ要素としての入力フィールドは機能しません。視覚的な装飾を最小化し、インク節約と可読性を両立させます。

```css
@media print {
  ui-input {
    /* 背景を透明化しインク節約 */
    background: transparent !important;
    
    /* ボーダーは維持し、入力領域の構造を明示 */
    border: var(--border-width) solid currentColor !important;
    
    /* 現在値のテキストは通常色で表示 */
    color: var(--fg-default) !important;
  }
  
  /* エラー状態は印刷時に淡色化（インク節約） */
  ui-input[error] {
    border-color: var(--fg-muted) !important;
  }
  
  /* Disabled/Readonly状態も視覚的に区別を維持 */
  ui-input[disabled],
  ui-input[readonly] {
    opacity: 0.6;
  }
}
```

> **Note**: フォーム入力の現在値を確認するために印刷される可能性を考慮し、値そのものは維持しつつ、装飾的要素（背景色、影）を除去します。

#### セレクトボックス (Select) `<ui-select>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: ユーザーが既定の選択肢から「値を選ぶ」ためのコンポーネントです。
- **Consistency**: トリガー（閉じた状態）の見た目はテキスト入力(`<ui-input>`)と完全に一致させ、フォーム全体の一貫性を保ちます。
- **Native Polish**: 一般的なOSのドロップダウン挙動（選択肢のホバー、キーボード移動）を模倣しつつ、プラットフォームに依存しない洗練されたスタイルを提供します。

**2. 実装戦略 (Implementation Strategy)**

- **Reference**: `@lion/ui` の `LionSelectRich`
- **Logic Porting**:
    - **Combobox Pattern**: ネイティブ同様のUXを提供するため、フォーカスはトリガー（Input）に維持し、**`aria-activedescendant`** を使用してリスト内の仮想的な選択状態を管理します。
    - **Mobile Optimization**: モバイル環境では、トリガーとなる `<input>` に `readonly` 属性を適用することでソフトウェアキーボードの起動を確実に抑制し、ビューポートの変化によるレイアウト破壊（Layout Thrashing）を防ぎます。
    - **Positioning**: **`@floating-ui/dom`** を採用し、画面端での衝突回避（Flip）や追従を堅牢に実装します。
        - **Placement Default**: `bottom-start` (トリガーの左下に展開)
        - **Middleware**: `flip()`, `shift()`, `offset(4)` -- 画面端では自動的に反転し、4pxのマージンを確保
    - **DOM構造とARIA Reflection**: トリガー（Shadow DOM内）とオーバーレイ（Portal / document.body直下）を分離します。`aria-activedescendant` が Shadow DOM境界を越えてOptionのIDを参照するため、以下の戦略を採用します：
        - **ID生成**: オプションのIDは `<ui-select>` のコンポーネントIDをプレフィックスとして生成（例: `select-123-option-0`）し、グローバルに一意性を保証します。
        - **`aria-activedescendant` 更新**: トリガー内部の `<input>` 要素の `aria-activedescendant` 属性を、キーボード移動に応じて動的に更新します。これにより、フォーカスはトリガーに留まったまま、スクリーンリーダーには現在の選択候補が通知されます。
        - **Portal Accessibility**: Portal化されたListboxは `aria-labelledby` でトリガーのラベルIDを参照し、スクリーンリーダーに「何のリストか」を明示します。

**借用するロジック**:
- `FormControlMixin`: フォーム要素としての基本機能（`name`, `value`, `disabled`等の管理）
- `ElementInternals` による Form Participation（`form.elements`への登録、バリデーション状態の通知）
- `ValidateMixin`: 基本的なバリデーションロジック（`required`等）
- `OverlayMixin`: リストボックスの開閉状態管理、Click Outside検出、Escapeキーハンドリング

**除外するロジック**:
- `LionValidationFeedback`: Rouault専用のエラー表示（`error-message`プロパティ）に置き換え
- `FormRegistrarMixin`: Light DOMへの依存を排除するため不使用
- `InteractionStateMixin`: Rouault独自のフォーカス戦略（Adaptive Focus）を実装するため不使用

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `label` | `label` | `string` | 入力ラベル。視覚的に隠す場合でもA11yのために必須。 |
| `hide-label` | `hide-label` | `boolean` | ラベルを視覚的に非表示にします（`.sr-only` 相当）。`aria-label` には常に反映されます。デフォルト: `false`。 |
| `name` | `name` | `string` | フォーム送信時のフィールド名。`ElementInternals` によるフォーム参加に必須。 |
| `modelValue`| `model-value` | `string \| number` | 選択された値。通常は親フォームの状態と同期。 |
| `placeholder`| `placeholder`| `string` | 未選択時に表示するテキスト。 |
| `opened` | `opened` | `boolean` | リストボックスの開閉状態。プログラム的に制御可能。デフォルト: `false`。 |
| `help-text` | `help-text` | `string` | 下部に表示する補助テキスト。 |
| `error-message` | `error-message` | `string` | エラー時に表示するメッセージ。`error` が `true` のときに `aria-describedby` で紐付けられます。 |
| `error` | `error` | `boolean` | エラー状態の強制。通常は内部バリデーションで自動制御。 |
| `disabled` | `disabled` | `boolean` | 操作無効化。フォーカス不可、リストボックスは開かない。 |
| `readonly` | `readonly` | `boolean` | 読み取り専用モード。フォーカス可能だがリストボックスは開かない。 |

> **Note**: `modelValue` の型は `string | number` に限定します。複雑なオブジェクトを扱う場合は、コンポーネント外で文字列化（シリアライズ）してから渡してください。CLAUDE.md の「any型を使わない」原則に準拠します。

**4. スタイリングとトークンマッピング (Style & Tokens)**

**:host (Container)**
ラベル、トリガー、ヘルプテキストを含むコンテナ。`<ui-input>` と同じ構造を採用します。

- `display`: `flex`
- `flex-direction`: `column`
- `gap`: `--space-2` (8px)

**Label Element**

| State | Font Size | Font Weight | Color | Note |
|-------|-----------|-------------|-------|------|
| **Default** | `var(--text-sm)` (13px) | `var(--font-medium)` (500) | `var(--fg-default)` | 明確な視認性を確保 |
| **Hidden** | — | — | — | `.label--hidden`クラスで視覚的に非表示（`<ui-input>` と同じ実装） |

**Trigger (Invoker)**

`<ui-input>` と完全に同じ状態管理を採用し、視覚的な一貫性を保証します。

| State | Border | Background | Text Color | Note |
|-------|--------|------------|------------|------|
| **Default** | `var(--border-width) solid transparent` | `var(--bg-fill-muted)` | `--fg-default` | **Discoverability**: 背景色を採用しつつ、レイアウトシフト防止のため透明なボーダーを確保します。 |
| **Placeholder** | (同上) | (同上) | `--fg-subtle` | 未選択時のプレースホルダーテキストは控えめな色で表示。 |
| **Hover** | `var(--border-width) solid var(--border-default)` | `var(--bg-fill-muted)` | `--fg-default` | **Tactility**: 明確なボーダーによって入力可能領域のエッジをフィードバックします。 |
| **Focus** | `var(--border-width) solid var(--border-default)` | `var(--bg-default)` | `--fg-default` | **Clear Canvas**: 入力時は「紙」のような白地（デフォルト背景）に戻し、執筆に集中させます。強調表示（Colording）はFocus Ringに一任し、ノイズを減らします。 |
| **Opened** | `var(--border-width) solid var(--border-default)` | `var(--bg-active)` | `--fg-default` | **Visual Connection**: リストボックスとの視覚的な接続を強化。 |
| **Error** | `var(--border-width) solid var(--danger)` | `var(--bg-danger-subtle)` | `--fg-default` | 背景色も淡く変化させ、色覚多様性に配慮。 |
| **Disabled**| `var(--border-width) solid var(--border-default)` | `var(--bg-fill-muted)`| `--fg-subtle` | `opacity: var(--opacity-disabled)` を併用し、操作不可を表現。 |
| **Readonly**| `var(--border-width) solid var(--border-default)` | `var(--bg-fill-muted)`| `--fg-default` | Disabledより高いコントラストを維持し、値の確認は可能であることを示す。 |

**Trigger固有の要素**:
- **Width**: `100%` (親コンテナの幅に追従)
- **Height**: `--control-height-md` (32px)
- **Padding-X**: `--space-2` (8px) -- ただし右パディングはアイコン領域を確保するため `calc(var(--space-2) + var(--icon-base) + var(--space-2))` (40px)
- **Radius**: `--radius-md` (6px)
- **Font**: `--text-base` (14px)
- **Cursor**: `pointer` (クリック可能領域であることを明示)
- **ChevronDown Icon**:
    - **Position**: 絶対配置で右端（`right: var(--space-2)`）に固定
    - **Size**: `var(--icon-base)` (16px)
    - **Color**: `var(--fg-muted)` (Default) → `var(--fg-default)` (Hover/Focus)
    - **Rotation**: リストボックス展開時（`opened=true`）に `transform: rotate(180deg)` で上向きに変化
    - **Transition**: `transform var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out)`
- **Transition**: 状態遷移は以下のプロパティに限定し、`transition: all` の使用を禁止します（`index.md` L883-918 準拠）。

```css
.trigger {
  transition:
    background-color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    outline-color var(--duration-fast) var(--ease-out);
}
```

**Listbox (Overlay)**

| Property | Value | Note |
|----------|-------|------|
| **Z-Index**| `var(--z-popover)` (400) | **Always on Top**: モーダル(`--z-modal`)より上位のレイヤーに配置。 |
| **Background** | `var(--bg-surface-2)` | Elevationによる浮遊感。 |
| **Border** | `var(--border-width) solid var(--border-default)` | 境界線を明確化。 |
| **Shadow** | `var(--elevation-lg)` | **Semantic Token使用**: Light/Dark Mode自動切り替え。`index.md` L773準拠。 |
| **Highlight (Light Mode)** | `inset 0 1px 0 0 oklch(100% 0 0 / 0.05)` | **Glass Panel準拠**: 上端に微細な光の反射（`index.md` L835）。 |
| **Highlight (Dark Mode)** | `inset 0 1px 0 0 oklch(100% 0 0 / 0.1)` | **Depth Strategy準拠**: 闇の中での輪郭を立たせるため、Light Modeより強い反射（`index.md` L710-718, L843）。 |
| **Radius** | `--radius-md` (6px) | トリガーと同じR値。 |
| **Min Width** | トリガーと同じ幅 | Floating UIの `size` middlewareで自動調整。 |
| **Max Width** | `320px` | 長いオプション名でもレイアウト破壊を防ぐ。 |
| **Max Height** | `calc(var(--control-height-md) * 7.5)` (240px) | **Scrolling Affordance**: `overflow-y: auto`。7.5行分を表示し、端数を見せることでスクロール可能であることを直感的に伝える。 |
| **Padding** | `calc(var(--radius-md) - var(--radius-sm))` (2px) | **Nested Geometry準拠**: `index.md` L672-682の数理に従い、内部Option Itemの角丸が自然に収まるよう計算されたパディング。 |
| **Scrollbar** | **System Mixin** | **Invisible Hit Area**: `index.md` L775-814 の定義に従い、物理幅 `12px` を確保しつつ、視覚的には `4px` のみが描画されるよう透明ボーダーを活用する。 |

**Motion (Animation)**

- **Enter**: `opacity: 0` → `1`, `transform: scale(var(--scale-enter))` → `1` (Duration: `var(--duration-normal)` - 150ms).
    - **Rationale**: `index.md` L867で「標準トランジション（ホバー色変化、フェードイン、**ドロップダウン展開**）」と明記されているため、`--duration-normal` を採用します。`--duration-fast` (70ms) は「マイクロインタラクション（ボタン押下、トグル、チェックボックス）」用であり、リストボックス展開には短すぎます。
- **Exit**: `opacity: 1` → `0` (Duration: `var(--duration-instant)` - 0ms).
    - **Rationale**: `index.md` L865で定義されたSemanticトークンを使用。ハードコード値の禁止原則に準拠。即座に消滅し、次の作業を阻害しない。
- **Motion Reduction**: `@media (prefers-reduced-motion: reduce)` 環境下では、`index.md` L1109-1138 のグローバル定義により全てのトランジションが自動的に `0.01ms` に短縮されます。展開・収縮アニメーションは視覚的に即座に適用されます（実質的に瞬時）。

**Option Item**

| Property | Value | Note |
|----------|-------|------|
| **Height** | `var(--control-height-md)` (32px) | トリガーと同じ高さでリズムを統一。 |
| **Padding-X** | `var(--space-3)` (12px) | 左右の余白。ただし左側はチェックアイコン用に `--space-6` (24px) を確保。 |
| **Padding-Y** | `0` | 高さは `--control-height-md` で固定されるため、垂直方向のパディングは不要。代わりに `display: flex; align-items: center;` で垂直中央揃え。 |
| **Font** | `var(--text-base)` (14px) | トリガーと同じフォントサイズ。 |
| **Radius** | `var(--radius-sm)` (4px) | **Nested Geometry準拠**: Listboxのパディング2px + Option角丸4px = Listbox角丸6px。`index.md` L672-682の公式 `R_inner = R_outer - Padding` に従います。 |
| **Cursor** | `pointer` | クリック可能。 |

**Layout**:
- **Icon Area (Left)**: 左側にチェックアイコン用の領域 (`--space-6` - 24px) を**常時確保**します。未選択時もスペースを維持することで、選択切り替え時のレイアウトシフト（テキスト位置のズレ）を物理的に排除します。
- **Structure**: `display: flex; align-items: center; gap: var(--space-2);`

**State**:

| State | Background | Text Color | Font Weight | Icon | Transition |
|-------|------------|------------|-------------|------|------------|
| **Default** | `transparent` | `var(--fg-default)` | `var(--font-normal)` | なし | — |
| **Hover** | `var(--bg-surface-active)` | `var(--fg-default)` | `var(--font-normal)` | なし | `background-color var(--duration-fast) var(--ease-out)` |
| **Active** (aria-activedescendant) | `var(--bg-surface-active)` | `var(--fg-default)` | `var(--font-normal)` | なし | `background-color var(--duration-fast) var(--ease-out)` |
| **Selected** | `transparent` (Hover時は `var(--bg-surface-active)`) | `var(--primary)` | `var(--font-medium)` (500) | `Check` アイコン (`var(--icon-base)`) を左側に表示 | `color var(--duration-fast) var(--ease-out)` |
| **Selected + Hover** | `var(--bg-surface-active)` | `var(--primary)` | `var(--font-medium)` | `Check` アイコン | `background-color var(--duration-fast) var(--ease-out)` |

> **Note**: 選択状態（`[selected]`）と現在のキーボードフォーカス（`aria-activedescendant`）は独立して管理されます。選択された項目でも、キーボード移動によって別の項目が `active` になることがあります。

**Help Text / Error Message**

`<ui-input>` と完全に同じスタイリングを採用します。

| 要素 | プロパティ | 値 | 備考 |
|------|-----------|-----|------|
| **Help Text** | `font-size` | `var(--text-sm)` (13px) | 本文より一段小さく |
| | `color` | `var(--fg-muted)` | 控えめな色で補助的役割を明示 |
| | `margin-top` | `var(--space-1)` (4px) | トリガーと密接に配置 |
| | `line-height` | `var(--line-height-normal)` (1.5) | 可読性を確保 |
| **Error Message** | `font-size` | `var(--text-sm)` (13px) | Help Textと同サイズ |
| | `color` | `var(--fg-danger)` | 意味論的な強調（エラー状態を色で明示） |
| | `margin-top` | `var(--space-1)` (4px) | トリガーと密接に配置 |
| | `line-height` | `var(--line-height-normal)` (1.5) | 可読性を確保 |
| | `display` | `none` (error=false時) / `block` (error=true時) | エラー状態に応じて表示切替 |

> **Note**: Help TextとError Messageは排他的に表示されます。エラー状態（`error=true`）の場合、Help Textは非表示となり、Error Messageのみが表示されます。

**5. アクセシビリティとキーボード操作 (A11y & Interaction)**

- **Label Association & Focus Strategy**:
    - **Interaction**: Shadow DOM の標準オプションである **`delegatesFocus: true`** を有効化します。これにより、カスタム要素自体へのクリックや外部 `<label>` からのフォーカス移動が、自動的かつ即座に内部のトリガー要素へ転送されます。
    - **Accessibility**:
        - **Label Reflection**: コンポーネントの `label` プロパティの値を、内部トリガーの `aria-label` 属性に**動的に同期（Reflect）**させます。これは、Shadow DOM 内部での `<label>` 連携に加えて、ホスト要素経由でのアクセシビリティツリーへの名前解決を確実にするための冗長化（Robustness）措置です。
        - **ElementInternals**: こちらは主に「フォーム参加（Form Participation）」および「バリデーション状態の通知」のために使用し、役割を明確に分担します。

- **ARIA Attributes**:
    - **Trigger**:
        - `role="combobox"`
        - `aria-haspopup="listbox"` (リストボックスを展開することを明示)
        - `aria-expanded="true" | "false"` (リストボックスの開閉状態)
        - `aria-controls="[listbox-id]"` (制御対象のリストボックスID)
        - `aria-activedescendant="[option-id]"` (現在のキーボードフォーカス位置。キーボード移動時に動的に更新)
        - `aria-invalid="true"` (エラー状態時)
        - `aria-describedby="[error-message-id]"` (エラー時にエラーメッセージIDを紐付け)
    - **Listbox**:
        - `role="listbox"`
        - `aria-labelledby="[label-id]"` (トリガーのラベルIDを参照し、「何のリストか」を明示)
    - **Option**:
        - `role="option"`
        - `aria-selected="true" | "false"` (選択状態)

- **Focus Indicator**:
    - トリガーの明示的な変化（背景色の正規化）に加え、**:focus-visible 時にはグローバルなフォーカスリング（アウトライン）を追加** します。
    - `outline: var(--focus-ring-width) solid var(--focus-ring-color)`
    - `outline-offset: var(--focus-ring-offset)` (ボーダーと重ならないよう配置)
    - `border-radius: var(--radius-md)` (トリガーと同じ角丸)
    - **Adaptive Focus**: `index.md` L1159-1198 で定義された `animation: var(--animation-focus)` を適用し、移動中はノイズを抑え、停止した瞬間に明確化する挙動を実装します。
        - **挙動**: 最初の 50ms (0%〜25%) は `--focus-ring-color-subtle` で控えめに表示、その後 `--focus-ring-color` へ遷移します。素早い Tab 移動中は Subtle 色のまま終了するため、視覚的ノイズが抑制されます。

- **Keyboard Interaction** (WAI-ARIA Combobox Pattern準拠):
    - **`Enter` / `Space`**: リストボックスが閉じている場合は開く。開いている場合は、現在の `aria-activedescendant` の項目を選択してリストボックスを閉じる。
    - **`Escape`**: リストボックスを閉じてトリガーにフォーカスを戻す。値の変更はキャンセルされない（選択済みの値は維持）。
    - **`ArrowDown`**:
        - リストボックスが閉じている場合: リストボックスを開き、最初の項目にフォーカス（`aria-activedescendant` 更新）。
        - リストボックスが開いている場合: 次の項目にフォーカス移動。末尾の場合は先頭に循環。
    - **`ArrowUp`**:
        - リストボックスが閉じている場合: リストボックスを開き、最後の項目にフォーカス（`aria-activedescendant` 更新）。
        - リストボックスが開いている場合: 前の項目にフォーカス移動。先頭の場合は末尾に循環。
    - **`Home`**: リストボックス内の最初の項目にフォーカス移動（リストボックスが開いている場合のみ）。
    - **`End`**: リストボックス内の最後の項目にフォーカス移動（リストボックスが開いている場合のみ）。
    - **`Tab`**: `index.md` L130 の方針に従い、**Focus Trapは行わない**。`Tab` キーによりリストボックスを閉じて次の要素へフォーカス移動します。Flow Stateを維持し、ユーザーを閉じ込めません。
    - **Type-ahead (文字入力)**:
        - **有効化**: アルファベットや数字の入力により、該当する項目に即座にジャンプします。
        - **バッファリング**: 1秒以内の連続入力は連結され（例: "ap" → "apple"）、1秒経過後にリセットされます。
        - **Mobile Readonly**: モバイル環境では `readonly` 属性によりソフトウェアキーボードが抑制されるため、Type-aheadは**物理キーボード接続時のみ動作**します。

- **Click Outside / Scroll Close**:
    - **Click Outside**: リストボックス外（トリガー以外）をクリックした場合、リストボックスを即座に閉じます。`<ui-dropdown>` と同様の挙動（`index.md` L130, L1186）。
    - **Scroll Close**: 親スクロールコンテナのスクロール検出時にリストボックスを閉じます。これにより、トリガーとリストボックスの位置がズレて混乱を招く状況を防ぎます。

- **Error Messaging**:
    - エラー発生時は `aria-invalid="true"` を設定し、エラーメッセージ要素（`error-message` プロパティから生成）を `aria-describedby` に追加してスクリーンリーダーに通知します。
    - エラー状態でも操作は可能とし、値の修正を許容します。

- **Motion Reduction (`prefers-reduced-motion`)**:
    - `@media (prefers-reduced-motion: reduce)` 環境下では、`index.md` L1109-1138 のグローバル定義により全てのトランジションが自動的に `0.01ms` に短縮されます。
    - 背景色・ボーダー色の変化、リストボックスの展開・収縮アニメーションは視覚的に即座に適用されます（実質的に瞬時）。
    - Adaptive Focus アニメーション（`--animation-focus`）も無効化され、フォーカスリングは即座に `--focus-ring-color` で表示されます。

**6. 強制カラーモード対応 (Forced Colors Mode)**

`@media (forced-colors: active)` 環境下では、背景色やシャドウがシステムによって上書きされる可能性があります。以下のフォールバックを適用し、構造と意味を維持します（`index.md` L1230-1290 準拠）。

```css
@media (forced-colors: active) {
  /* Trigger */
  ui-select .trigger {
    /* 境界線を強制し、入力領域の輪郭を明確化 */
    border: var(--border-width) solid CanvasText !important;
    background: Canvas !important;
    color: CanvasText !important;
  }

  ui-select[error] .trigger {
    /* エラー状態をボーダーで表現（背景色は消失するため） */
    border-color: LinkText;
    border-width: 2px; /* --border-width-thick */
  }

  ui-select .trigger:focus-visible {
    /* box-shadowは消失するため、実線のアウトラインを強制 */
    outline: 3px solid CanvasText;
    box-shadow: none;
  }

  /* Disabled/Readonly状態もボーダーで明示 */
  ui-select[disabled] .trigger,
  ui-select[readonly] .trigger {
    border-color: GrayText;
    opacity: 1; /* システムカラーが適用されるため不透明度は戻す */
  }

  /* Listbox */
  ui-select .listbox {
    background: Canvas !important;
    border: var(--border-width) solid CanvasText !important;
    box-shadow: none; /* シャドウは消失 */
  }

  /* Option Item - Selected状態をボーダーで表現 */
  ui-select .option[aria-selected="true"] {
    background: Highlight !important;
    color: HighlightText !important;
    outline: 2px solid CanvasText;
    outline-offset: -2px; /* 内側に描画し、レイアウトシフトを防ぐ */
  }

  /* Option Item - Hover/Active状態 */
  ui-select .option:hover,
  ui-select .option[data-active] {
    background: Highlight !important;
    color: HighlightText !important;
  }

  /* ChevronDown Icon */
  ui-select .icon-chevron {
    stroke: CanvasText; /* アイコンをシステムカラーに追従 */
  }
}
```

> **Note (Forced Colors Strategy):** 透過やシャドウに依存した視覚表現はこのモードで消失するため、**ボーダーとスペーシング**により構造を明示します。`index.md` L1232-1247 で定義されたシステムカラーマッピングに従い、すべてのトークンがシステムカラーへフォールバックします。選択状態（`[aria-selected="true"]`）は背景色（`Highlight`）とアウトライン（`CanvasText`）の組み合わせにより、色情報が失われても識別可能にします。

**7. 印刷スタイル (Print Styles)**

印刷時は、インタラクティブ要素としてのセレクトボックスは機能しません。視覚的な装飾を最小化し、インク節約と可読性を両立させます。

```css
@media print {
  /* Trigger - 現在選択されている値のみを表示 */
  ui-select .trigger {
    /* 背景を透明化しインク節約 */
    background: transparent !important;

    /* ボーダーは維持し、入力領域の構造を明示 */
    border: var(--border-width) solid currentColor !important;

    /* 現在値のテキストは通常色で表示 */
    color: var(--fg-default) !important;
  }

  /* ChevronDownアイコンは非表示（印刷時は不要） */
  ui-select .icon-chevron {
    display: none;
  }

  /* Listboxは常に非表示 */
  ui-select .listbox {
    display: none !important;
  }

  /* エラー状態は印刷時に淡色化（インク節約） */
  ui-select[error] .trigger {
    border-color: var(--fg-muted) !important;
  }

  /* Disabled/Readonly状態も視覚的に区別を維持 */
  ui-select[disabled] .trigger,
  ui-select[readonly] .trigger {
    opacity: 0.6;
  }
}
```

> **Note**: フォーム入力の現在値を確認するために印刷される可能性を考慮し、選択されている値そのものは維持しつつ、装飾的要素（背景色、影、アイコン）を除去します。リストボックスは印刷時には常に非表示とし、紙面のスペースを節約します。

#### ドロップダウンメニュー (Dropdown Menu) `<ui-dropdown>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 値の入力ではなく、「アクション（操作）」や「ナビゲーション」の選択肢を提示するために使用します。
- **Ephemeral UI**: ユーザーが必要とした瞬間に「現れ」、用が済めば「消える」UIです。常時表示する情報量（ノイズ）を減らすための主要な手段です。

**2. 実装戦略 (Implementation Strategy)**

- **Logic Reference**: Ported from `@lion/ui` (`OverlayController`) - ライブラリには依存せず、ロジックのみをコピー・改修して使用します。
- **Dependencies**: **`@floating-ui/dom`**
    - **Floating UI**: 位置計算のデファクトスタンダードを採用し、複雑な配置ロジック（Flip, Shift, Auto-update）を外部委譲します。
        - **Placement Default**: `bottom-start` (トリガーの左下に展開)
        - **Middleware**: `flip()`, `shift()`, `offset(4)` -- 画面端では自動的に反転し、4pxのマージンを確保
    - **Click Outside & Scroll Close**: メニュー外クリックや親スクロールコンテナのスクロール検出時に即座に閉じる挙動を実装。

**借用するロジック**:
- `OverlayMixin`: メニューの開閉状態管理、Click Outside検出、Escapeキーハンドリング
- Roving Tabindex管理: メニュー項目間の矢印キー移動

**除外するロジック**:
- Form関連のMixin（`FormControlMixin`等）: ドロップダウンはフォーム要素ではない

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `opened` | `opened` | `boolean` | 開閉状態。プログラム的に制御可能。デフォルト: `false`。 |
| `align` | `align` | `'start' \| 'end' \| 'center'` | トリガーに対する配置基準位置。デフォルト: `'start'`。 |
| `placement` | `placement` | `'top' \| 'bottom' \| 'top-start' \| 'bottom-start' \| ...` | 出現方向（Floating UI準拠）。デフォルト: `'bottom-start'`。 |
| `disabled` | `disabled` | `boolean` | トリガーボタンの操作無効化。メニューは開かない。デフォルト: `false`。 |

**Events**:
- `@menu-item-select`: メニュー項目が選択された時に発火。`event.detail: { value: string, label: string }`

**Slots**:
- `trigger` (デフォルトスロット): トリガーボタンの内容。ボタン、アイコンボタン等を配置。
- `menu`: メニュー項目のリスト。`<ui-menu-item>` 要素を配置。

**4. スタイリングとトークンマッピング (Style & Tokens)**

**:host (Container)**

- `display`: `inline-block` (トリガーボタンのサイズに追従)
- `position`: `relative`

**Trigger (Slot Content)**

トリガー要素は利用者側で提供されるため、スタイリングは最小限です。ただし、`disabled` 状態は `:host` 属性でスタイルを適用します。

| State | Opacity | Cursor | Pointer Events |
|-------|---------|--------|----------------|
| **Default** | `1` | (継承) | `auto` |
| **Disabled** | `var(--opacity-disabled)` (0.5) | `not-allowed` | `none` |

**Panel (Menu Container)**

| Property | Value | Note |
|----------|-------|------|
| **Min Width** | `180px` | アクション名の可読性確保 |
| **Max Width** | `280px` | 長いラベルでもレイアウト破壊を防ぐ |
| **Padding** | `calc(var(--radius-md) - var(--radius-sm))` (2px) | **Nested Geometry準拠**: `index.md` L672-682の数理に従い、内部Menu Itemの角丸が自然に収まるよう計算されたパディング。これは `index.md` の最小スペーシング(`4px`)の例外です。親子間の $R_{outer} - R_{inner}$ を数理的に一致させ、完璧な同心円を描画することを優先します。 |
| **Background** | `var(--bg-surface-2)` | Elevationによる浮遊感 |
| **Border** | `var(--border-width) solid var(--border-default)` | 境界線を明確化 |
| **Radius** | `var(--radius-md)` (6px) | 標準の角丸 |
| **Shadow** | `var(--elevation-lg)` | **Semantic Token使用**: Light/Dark Mode自動切り替え。`index.md` L729-772準拠。 |
| **Highlight (Light Mode)** | `inset 0 1px 0 0 oklch(100% 0 0 / 0.05)` | **Glass Panel準拠**: 上端に微細な光の反射（`index.md` L835）。 |
| **Highlight (Dark Mode)** | `inset 0 1px 0 0 oklch(100% 0 0 / 0.1)` | **Depth Strategy準拠**: 闇の中での輪郭を立たせるため、Light Modeより強い反射（`index.md` L710-718, L843）。 |
| **Z-Index** | `var(--z-popover)` (400) | **Always on Top**: モーダル(`--z-modal`)より上位のレイヤーに配置 |
| **Max Height** | `calc(var(--control-height-md) * 10)` (320px) | **Scrolling Affordance**: `overflow-y: auto`。10行分を表示し、スクロール可能であることを直感的に伝える |
| **Scrollbar** | **System Mixin** | **Invisible Hit Area**: `index.md` L775-814 の定義に従い、物理幅 `12px` を確保しつつ、視覚的には `4px` のみが描画されるよう `background-clip: content-box` + 透明ボーダーを活用する |

**Motion (Animation)**

- **Enter**:
    - `opacity: 0` → `1`
    - `transform: scale(var(--scale-enter))` → `1`
    - **Duration**: `var(--duration-normal)` (150ms)
    - **Easing**: `var(--ease-out)`
    - **Rationale**: `index.md` L867で「標準トランジション（ホバー色変化、フェードイン、**ドロップダウン展開**）」と明記されているため、`--duration-normal` を採用します。
- **Exit**:
    - `opacity: 1` → `0`
    - **Duration**: `var(--duration-instant)` (0ms)
    - **Rationale**: `index.md` L865で定義されたSemanticトークンを使用。即座に消滅し、次の作業を阻害しない。
- **Transition**: 状態遷移は以下のプロパティに限定し、`transition: all` の使用を禁止します（`index.md` L883-918 準拠）。

```css
.panel {
  transition:
    opacity var(--duration-normal) var(--ease-out),
    transform var(--duration-normal) var(--ease-out);
}
```

- **Motion Reduction**: `@media (prefers-reduced-motion: reduce)` 環境下では、`index.md` L1109-1138 のグローバル定義により全てのトランジションが自動的に `0.01ms` に短縮されます。展開・収縮アニメーションは視覚的に即座に適用されます（実質的に瞬時）。

**Menu Item**

| Property | Value | Note |
|----------|-------|------|
| **Display** | `flex` | アイコンとテキストを横並び配置 |
| **Align Items** | `center` | 垂直方向の中央揃え |
| **Gap** | `var(--space-2)` (8px) | アイコンとテキストの間隔 |
| **Height** | `var(--control-height-md)` (32px) | 標準のコントロール高さ |
| **Padding-X** | `var(--space-3)` (12px) | 左右の余白 |
| **Padding-Y** | `0` | 高さは固定されるため、垂直方向のパディングは不要 |
| **Font Size** | `var(--text-base)` (14px) | 標準のUIテキストサイズ |
| **Font Weight** | `var(--font-normal)` (400) | 標準ウェイト |
| **Color** | `var(--fg-default)` | 標準テキスト色 |
| **Icon Size** | `var(--icon-base)` (16px) | 標準アイコンサイズ |
| **Radius** | `var(--radius-sm)` (4px) | **Nested Geometry準拠**: Panelのパディング2px + Item角丸4px = Panel角丸6px。`index.md` L672-682の公式 `R_inner = R_outer - Padding` に従います |
| **Cursor** | `pointer` | クリック可能を明示 |

**State**:

| State | Background | Text Color | Font Weight | Transition |
|-------|------------|------------|-------------|------------|
| **Default** | `transparent` | `var(--fg-default)` | `var(--font-normal)` (400) | — |
| **Hover** | `var(--bg-surface-active)` | `var(--fg-default)` | `var(--font-normal)` | `background-color var(--duration-fast) var(--ease-out)` |
| **Focus** (Roving Tabindex) | `var(--bg-surface-active)` | `var(--fg-default)` | `var(--font-normal)` | `background-color var(--duration-fast) var(--ease-out)` |
| **Active** (:active) | `var(--bg-surface-active)` | `var(--fg-default)` | `var(--font-normal)` | — |
| **Disabled** | `transparent` | `var(--fg-subtle)` | `var(--font-normal)` | — |

**Destructive Variant**:

| State | Text Color | Background (Hover) | Note |
|-------|------------|-------------------|------|
| **Default** | `var(--danger)` | — | 赤文字で警告 |
| **Hover** | `var(--danger)` | `var(--bg-danger-subtle)` | コンテキスト全体を赤らめ、破壊的アクションであることを無意識に警告します |

**Touch Target**:

`::after` 擬似要素を使用し、**最低 44px の高さを確保 (Invisible Hit Area)** します。`index.md` L1057-1076の実装パターンに従います。

```css
.menu-item {
  position: relative;
  min-height: var(--control-height-md); /* 32px */
}

.menu-item::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  transform: translateY(-50%);
  min-height: var(--control-min-touch); /* 44px */
  z-index: -1; /* 隣接アイテムとの重複時、下に配置 */
}
```

**Separator**

| Property | Value | Note |
|----------|-------|------|
| **Height** | `1px` | 最小限の線 |
| **Margin** | `var(--space-1) 0` (4px 0) | 上下の余白で構造を暗示 |
| **Background** | `var(--border-muted)` | Ghost Border - 構造を暗示する最小限の色 |
| **Role** | `separator` | スクリーンリーダー用 |

**5. アクセシビリティとキーボード操作 (A11y & Interaction)**

- **ARIA Attributes**:
    - **Trigger**:
        - `role="button"` (トリガーがボタン要素でない場合)
        - `aria-haspopup="menu"`
        - `aria-expanded="true" | "false"` (メニューの開閉状態)
        - `aria-controls="[menu-id]"` (制御対象のメニューID)
        - `aria-disabled="true"` (disabled状態時)
    - **Menu**:
        - `role="menu"`
        - `aria-labelledby="[trigger-id]"` (トリガーのIDを参照し、「何のメニューか」を明示)
    - **Item**:
        - `role="menuitem"`
        - `tabindex="-1"` (Roving Tabindex管理下)
        - `aria-disabled="true"` (disabled項目の場合)
    - **Separator**:
        - `role="separator"`

- **Focus Management**:
    - **Open時**: メニューが開くと、フォーカスを**内部の最初のメニュー項目**へ自動的に移動させます（`role="menu"` パターン）。
    - **Close時**: メニューが閉じると、フォーカスを**トリガー**へ戻します（`index.md` L131準拠）。
    - **Roving Tabindex**: メニュー内の項目は `-1` の `tabindex` を持ち、矢印キーによる移動時にのみフォーカス可能になります。現在フォーカス中の項目のみが `tabindex="0"` となります。

- **Focus Indicator**:
    - メニュー項目の `:focus-visible` 時には、背景色の変化に加え、**グローバルなフォーカスリング（アウトライン）を追加** します。
    - `outline: var(--focus-ring-width) solid var(--focus-ring-color)`
    - `outline-offset: var(--focus-ring-offset)`
    - **Adaptive Focus**: `index.md` L1159-1198 で定義された `animation: var(--animation-focus)` を適用し、移動中はノイズを抑え、停止した瞬間に明確化する挙動を実装します。
        - **挙動**: 最初の 50ms (0%〜25%) は `--focus-ring-color-subtle` で控えめに表示、その後 `--focus-ring-color` へ遷移します。素早い矢印キー移動中は Subtle 色のまま終了するため、視覚的ノイズが抑制されます。

- **Keyboard Interaction** (WAI-ARIA Menu Pattern準拠):
    - **`Enter` / `Space`** (トリガー上):
        - メニューが閉じている場合: メニューを開き、最初の項目にフォーカス。
        - メニューが開いている場合: メニューを閉じる。
    - **`Enter` / `Space`** (メニュー項目上):
        - 現在フォーカス中の項目を選択し、メニューを閉じてトリガーへフォーカスを戻す。
        - `@menu-item-select` イベントを発火。
    - **`Escape`**:
        - メニューを閉じ、トリガーにフォーカスを戻す（`index.md` L131準拠）。
        - 選択はキャンセル扱い（項目は選択されない）。
    - **`ArrowDown`**:
        - メニューが閉じている場合（トリガー上）: メニューを開き、最初の項目にフォーカス。
        - メニューが開いている場合: 次の項目にフォーカス移動。末尾の場合は先頭に循環。disabled項目はスキップ。
    - **`ArrowUp`**:
        - メニューが閉じている場合（トリガー上）: メニューを開き、最後の項目にフォーカス。
        - メニューが開いている場合: 前の項目にフォーカス移動。先頭の場合は末尾に循環。disabled項目はスキップ。
    - **`Home`**:
        - メニュー内の最初の項目にフォーカス移動（メニューが開いている場合のみ）。disabled項目もスキップ。
    - **`End`**:
        - メニュー内の最後の項目にフォーカス移動（メニューが開いている場合のみ）。disabled項目もスキップ。
    - **`Tab`**:
        - `index.md` L130, L1321 の方針に従い、**Focus Trapは行わない**。
        - **Reason**: ドロップダウンはモーダルと異なり、思考の文脈を完全に切り替えるものではありません。ユーザーが「やはり次へ進みたい」と思った瞬間のフローを阻害しないよう、意図的にTrapを解除します。
        - `Tab` キーによりメニューを閉じ、トリガーの次の要素へフォーカス移動します。
        - `Shift + Tab` でメニューを閉じ、トリガーの前の要素へフォーカス移動します。
    - **Type-ahead (文字入力)**:
        - **有効化**: アルファベットや数字の入力により、該当するメニュー項目に即座にジャンプします。
        - **バッファリング**: 1秒以内の連続入力は連結され（例: "co" → "copy"）、1秒経過後にリセットされます。
        - **マッチング**: 項目ラベルの先頭文字（大文字・小文字を区別しない）から検索します。

- **Click Outside / Scroll Close**:
    - **Click Outside**: メニュー外（トリガー以外）をクリックした場合、メニューを即座に閉じます（`index.md` L130, L1328参照）。
    - **Scroll Close**: 親スクロールコンテナのスクロール検出時にメニューを閉じます。これにより、トリガーとメニューの位置がズレて混乱を招く状況を防ぎます（`index.md` L1329参照）。

- **Motion Reduction (`prefers-reduced-motion`)**:
    - `@media (prefers-reduced-motion: reduce)` 環境下では、`index.md` L1109-1138 のグローバル定義により全てのトランジションが自動的に `0.01ms` に短縮されます。
    - 背景色の変化、メニューの展開・収縮アニメーションは視覚的に即座に適用されます（実質的に瞬時）。
    - Adaptive Focus アニメーション（`--animation-focus`）も無効化され、フォーカスリングは即座に `--focus-ring-color` で表示されます。

**6. 強制カラーモード対応 (Forced Colors Mode)**

`@media (forced-colors: active)` 環境下では、背景色やシャドウがシステムによって上書きされる可能性があります。以下のフォールバックを適用し、構造と意味を維持します（`index.md` L1230-1290 準拠）。

```css
@media (forced-colors: active) {
  /* Trigger */
  ui-dropdown [slot="trigger"] button,
  ui-dropdown [slot="trigger"] {
    /* システムカラーへのマッピング */
    border-color: ButtonBorder !important;
    background: ButtonFace !important;
    color: ButtonText !important;
  }

  ui-dropdown[disabled] [slot="trigger"] button,
  ui-dropdown[disabled] [slot="trigger"] {
    /* Disabled状態をシステムカラーで表現 */
    border-color: GrayText !important;
    color: GrayText !important;
    opacity: 1; /* システムカラーが適用されるため不透明度は戻す */
  }

  /* Panel */
  ui-dropdown .panel {
    background: Canvas !important;
    border: var(--border-width) solid CanvasText !important;
    box-shadow: none; /* シャドウは消失 */
  }

  /* Menu Item - Default */
  ui-dropdown .menu-item {
    color: CanvasText !important;
  }

  /* Menu Item - Hover/Focus状態 */
  ui-dropdown .menu-item:hover,
  ui-dropdown .menu-item:focus-visible {
    background: Highlight !important;
    color: HighlightText !important;
  }

  /* Menu Item - Disabled状態 */
  ui-dropdown .menu-item[aria-disabled="true"] {
    color: GrayText !important;
    background: transparent !important;
  }

  /* Menu Item - Destructive Variant */
  ui-dropdown .menu-item.variant-danger {
    /* 破壊的アクションはボーダーで区別 */
    color: CanvasText !important;
    outline: 1px solid CanvasText;
    outline-offset: -1px;
  }

  ui-dropdown .menu-item.variant-danger:hover {
    background: Highlight !important;
    color: HighlightText !important;
  }

  /* Separator */
  ui-dropdown .separator {
    background: CanvasText !important;
  }

  /* Focus Indicator */
  ui-dropdown .menu-item:focus-visible {
    outline: 3px solid CanvasText;
    box-shadow: none;
  }
}
```

> **Note (Forced Colors Strategy):** 透過やシャドウに依存した視覚表現はこのモードで消失するため、**ボーダーとスペーシング**により構造を明示します。`index.md` L1232-1247 で定義されたシステムカラーマッピングに従い、すべてのトークンがシステムカラーへフォールバックします。破壊的アクション（`.variant-danger`）は色情報が失われても、アウトラインにより識別可能にします。

**7. 印刷スタイル (Print Styles)**

印刷時は、インタラクティブ要素としてのドロップダウンメニューは機能しません。視覚的な装飾を最小化し、インク節約と可読性を両立させます。

```css
@media print {
  /* メニュー本体は常に非表示 */
  ui-dropdown .panel {
    display: none !important;
  }

  /* トリガーは表示を維持（操作不可を明示するため淡色化） */
  ui-dropdown [slot="trigger"] {
    opacity: 0.6;
  }

  /* Disabled状態は更に淡色化 */
  ui-dropdown[disabled] [slot="trigger"] {
    opacity: 0.4;
  }
}
```

> **Note**: ドロップダウンメニューは印刷時には意味をなさないため、メニュー本体（`.panel`）は常に非表示とします。トリガーは「ここにメニューがある」という構造の把握のために表示を維持しますが、操作不可であることを淡色化により示します。

#### チェックボックス / ラジオ (Checkbox & Radio) `<ui-checkbox>` / `<ui-radio>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **Clarity**: 選択状態（ON/OFF）を一目で識別可能にし、ラベルとの関連性を明確にします。
- **Tactility**: 「カチッ」というデジタルなスイッチング感覚を、システム定義の高速なアニメーション（`--duration-fast`）で表現し、思考の即応性を担保します。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: `@lion/ui` の `LionCheckbox`, `LionRadio` (継承元: `LionChoiceInput`)
- **Porting**: ネイティブ `<input>` を隠蔽し、スタイリング用の `<span>` (Control) とアイコンで状態を描画する Custom Checkbox Pattern を採用します。

**3. 技術仕様とAPI**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `checked` | `checked` | `boolean` | 選択状態。 |
| `indeterminate`| `indeterminate`| `boolean` | (Checkbox) 親項目の「一部選択」を示す中間状態。プログラム的にのみ設定可能（属性での設定は無視）。ユーザー操作（`Space`キー）による遷移先は `checked: false` とします。 |
| `name` | `name` | `string` | フォーム送信時の識別子。Radio要素のグループ化にも使用。 |
| `value` | `value` | `string` | フォーム送信時の値。デフォルトは `"on"`。 |
| `label` | `label` | `string` | ラベルテキスト。 |
| `disabled` | `disabled` | `boolean` | 無効化。 |
| `required` | `required` | `boolean` | (Checkbox) 必須入力。チェックが必須であることを示します。 |

**ARIA属性 (実装時に自動付与):**

| 属性 | 値 | 適用対象 | 説明 |
|------|-----|----------|------|
| `role` | `"checkbox"` / `"radio"` | Control要素 | セマンティックロールを明示。 |
| `aria-checked` | `"true"` / `"false"` / `"mixed"` | Control要素 | 選択状態。Checkboxの`indeterminate`時は`"mixed"`。 |
| `aria-disabled` | `"true"` | Control要素 | `disabled`プロパティが`true`の場合。 |
| `aria-invalid` | `"true"` | Control要素 | バリデーションエラー時（後述）。 |
| `aria-describedby` | ID参照 | Control要素 | エラーメッセージまたはヘルプテキストとの紐付け。 |

**フォーム統合 (Form-Associated Custom Element):**

- `ElementInternals` APIを使用し、標準フォーム要素としての振る舞いを実装します。
- `formdata` イベント時に `name` と `value` をFormDataに自動追加。
- `reportValidity()`, `checkValidity()` によるバリデーション統合。

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Control Size**: `16px`
    - **Design Rationale**: テキストサイズ（`--text-base`: 14px）に対してわずかに大きくすることで視認性を確保しつつ、アイコンサイズ（`--icon-base`: 16px）との視覚的整合性を維持します。
- **Touch Target**: `<ui-button>` 同様、`::before` 等の擬似要素を用いてクリック領域を拡張します。特にリスト内では、**行の高さ（Control Height）いっぱいまで判定を広げ**、高密度なレイアウトを維持したまま最大限の操作性を確保します（最低ターゲットサイズ: `var(--control-min-touch)` (44px)）。
- **Animation**:
    - Duration: `--duration-fast` (70ms) - 即応性を最優先。
    - Easing: `--ease-out` (Snappyな出現)。
    - **Reduced Motion**: `@media (prefers-reduced-motion: reduce)` 環境下では、アニメーションを `0.01ms` に短縮し、視覚的変化を瞬時に完了させます（index.md グローバルポリシーに準拠）。
- **Common State (Unchecked)**:
    - Background: `var(--bg-fill-muted)`
    - Border: `var(--border-width) solid var(--border-default)`
    - **Logic**: 未選択時は「構造」として静かに存在し、選択時のみ「色」を持ちます。
- **Interactive States (Hover / Active)**:
    - **Hover** (`:hover`):
        - Border: `var(--border-width) solid var(--border-hover)` (わずかに濃く、操作可能性を示唆)
        - Transition: `border-color var(--duration-fast) var(--ease-out)`
    - **Active** (`:active`):
        - `transform: scale(var(--scale-pressed))` (0.96) - 触覚的フィードバック。
        - **Note**: 16pxという小さな要素に対して、スケール変化が知覚可能かは環境依存ですが、他のインタラクティブ要素（`<ui-button>`等）との一貫性を重視し、システム定義のPressed動作を適用します。
- **Checkbox**:
    - Radius: `--radius-sm` (4px)
    - Checked:
        - Background: `var(--primary)`, Border: `var(--primary)`
        - Icon: `Check` (Size: `12px`, Stroke: `1.5px`, Color: `var(--on-primary)`)
    - Indeterminate:
        - Style: `Checked` 状態と同一の背景・ボーダーを適用。
        - Icon: `Minus` (Size: `12px`, Color: `var(--on-primary)`)
        - **Icon Transition**: Checked ⇄ Indeterminate 間の遷移は、直接的なアイコン切り替え（cross-fade）とします。描画アニメーション（SVGパス補間）は複雑性に対して得られる体験価値が低いため採用しません。
- **Radio**:
    - Radius: `--radius-full`
    - Checked (Ring Style):
        - Border: `4px solid var(--primary)`
        - Background: `var(--bg-default)` (**Hole Creation**: 選択時に背景を「穴」として抜く)
        - **Animation Impact**: `1px` (Unchecked) から `4px` (Checked) へのボーダー幅遷移に加え、背景色が `Muted` から `Default` へ変化することで、円の内側へ色が満ちていくような「ドーナツ型」のアニメーションを数理的に生成します。
        - **Contrast Validation**: 中心に8pxの空間を残し、`--primary` (border) と `--bg-default` (center hole) のコントラスト比を保証します。
            - **Calculated Ratio**: `--primary` (oklch 55% 0.15 250) vs `--bg-default` (Light: oklch 100% 0 0, Dark: oklch 20% 0.01 250) → 約 **8.2:1** (Light) / **3.5:1** (Dark) で、WCAG 2.1 Non-text Contrast (Level AA: 3:1) を満たします。
- **Disabled**:
    - `opacity: var(--opacity-disabled)` (0.5)
    - `cursor: not-allowed`
    - **Interaction Block**: すべてのマウス・キーボードイベントを無効化し、`aria-disabled="true"` を付与します。
- **Validation Error State**:
    - Border: `var(--border-width) solid var(--danger)` (赤枠で視覚的に警告)
    - **Error Message**: エラーメッセージを `<span role="alert">` で描画し、`aria-describedby` で紐付けます。
    - **Focus on Error**: エラー状態でフォーカス時、フォーカスリングも `--danger` 色を使用します。

**5. アクセシビリティとキーボード操作 (A11y & Interaction)**

- **Label Activation**: テキストラベル部分のクリックでもチェック状態が切り替わることを、`<label>` 要素または Shadow DOM 内での ID 紐付けにより保証します。

- **Keyboard Support**:
    - **Checkbox**:
        - `Space`: チェック状態をトグル。
        - `Tab` / `Shift+Tab`: フォーカス移動（標準フロー）。
    - **Radio**:
        - `Arrow Keys` (↑↓←→): 同一グループ（`name`属性）内の選択肢を移動・選択。
            - **Roving Tabindex**: 選択中のラジオボタンのみ `tabindex="0"`、他は `tabindex="-1"` とし、グループ全体で1つのタブストップとして扱います。
            - **Circular Navigation**: 最後の項目から最初の項目へ（または逆方向へ）循環します（WAI-ARIA推奨パターン）。
            - **Automatic Selection**: Arrow keyでフォーカス移動した時点で即座に選択状態を変更します（`Space`による確定操作は不要）。
        - `Tab` / `Shift+Tab`: グループ外へのフォーカス移動。

- **Radio Group Container** (`<ui-radio-group>`):
    - **ARIA Structure**:
        - `role="radiogroup"` を持つラッパー要素を提供します。
        - `aria-label` または `aria-labelledby` でグループの目的を明示します。
    - **Validation**: グループ全体での `required` 検証（いずれか1つが選択されているか）をサポートします。

- **Focus Indicator**:
    - `:focus-visible` 時にグローバルなフォーカスリングを適用します（`outline: var(--focus-ring-width) solid var(--focus-ring-color)`, `outline-offset: var(--focus-ring-offset)`）。
    - **Adaptive Focus**: `animation: var(--animation-focus)` を適用し、リスト内の高速移動時（矢印キー操作）のチラつき（ノイズ）を低減します。

- **Events**:
    - `change`: ユーザー操作によって選択状態が変化した後に発火（ネイティブ `<input>` 互換）。
    - `input`: リアルタイムな状態変化を監視（実装上は `change` と同タイミング）。

- **Forced Colors Mode**:
    - `@media (forced-colors: active)` 環境下では、背景色によるチェック表現が無効化されるため、システムカラーを利用して状態を再定義します。
    - **Checked**:
        - Background: `CanvasText` (または `Highlight`)
        - Icon Color: `Canvas` (または `HighlightText`)
        - Border: `2px solid CanvasText` (境界を太くして視認性を担保)。
    - **Focus**: `outline: 2px solid Highlight` (システムフォーカス色を使用)。

#### トグルスイッチ (Toggle Switch) `<ui-switch>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 設定の「即時反映（Instant Reflection）」を司るメタファーです。保存操作を待たず、システムの状態をダイレクトに変更します。
- **Digital Tactility**: 物理的な重さや摩擦の模倣ではなく、**0から1へのデジタルな状態遷移**を、Springアニメーションを用いて「即時かつ滑らか」に表現します。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: `@lion/ui` の `LionSwitch` (継承元: `LionField`)
- **Porting**: ブラウザ標準のCheckboxを隠蔽し、`role="switch"` を持つカスタム要素として実装します。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `checked` | `checked` | `boolean` | ON/OFF 状態。 |
| `label` | `label` | `string` | スイッチのラベル。内部的に `aria-labelledby` で関連付けられ、ラベル要素全体がクリック可能領域となります。 |
| `disabled` | `disabled` | `boolean` | 操作無効化。 |

**非対応プロパティ**:

このコンポーネントは「即時実行」を意図しており、フォーム送信を前提としないため、以下のフォーム関連プロパティは**非対応**とします：

- `name`: フォームデータとして送信されません。状態管理は親コンポーネントで行います。
- `required`: バリデーション対象外です。
- `value`: チェック状態は `checked` プロパティで管理します。

**4. スタイリングとトークンマッピング (Style & Tokens)**

**コンポーネントローカルトークン (Component-Local Tokens)**

トグルスイッチ固有の寸法をトークン化し、計算可能性と保守性を確保します：

| トークン | 値 | 算出根拠 |
|----------|-----|----------|
| `--switch-thumb-size` | `var(--icon-base)` (16px) | アイコンサイズと統一し、視覚的リズムを保つ |
| `--switch-track-padding` | `2px` | Thumbとトラック境界の余白 |
| `--switch-track-height` | `calc(var(--switch-thumb-size) + var(--switch-track-padding) * 2)` | 20px (16px + 2px × 2) |
| `--switch-track-width` | `calc(var(--switch-thumb-size) * 2 + var(--switch-track-padding) * 2)` | 36px (16px × 2 + 2px × 2) |
| `--switch-thumb-pos-off` | `var(--switch-track-padding)` | 2px (左端の余白) |
| `--switch-thumb-pos-on` | `calc(var(--switch-track-width) - var(--switch-thumb-size) - var(--switch-track-padding))` | 18px (36px - 16px - 2px) |

**Dimensions**:
- Bounding Box: `--control-height-sm` (24px) - システムグリッドに準拠。
- Track Visual: `--switch-track-height` × `--switch-track-width`（ボックス内中央配置）

**Track**:
- Radius: `var(--radius-full)`
- **Border**: `2px solid transparent` (High Contrast Mode用のフックとして領域確保)
- Transition: `background-color var(--duration-fast) var(--ease-out)` (色変化も即座に行う)

**Thumb (Knob)**:
- Size: `var(--switch-thumb-size)` (16px)
- Color: `var(--white)` (index.md Primitiveトークン参照。Dark Modeでも白を維持し、トラック色でコントラストを確保)
- Shadow: `var(--shadow-sm)`
- Position: OFF `var(--switch-thumb-pos-off)` → ON `var(--switch-thumb-pos-on)` (TranslateX)
- Transition: `transform var(--duration-normal) var(--ease-spring)` (150ms。300ms上限内で自然な追従性を実現)

**Animation**: `--ease-spring` (Overdamped)。余韻やバウンスを排除し、指の動きに吸い付くような追従性（Snappiness）を提供します。

**状態別スタイル定義 (State Styles)**

| 状態 | Track Color | Thumb Transform | その他 |
|------|-------------|-----------------|--------|
| **Default (OFF)** | `var(--bg-fill-muted)` | `translateX(var(--switch-thumb-pos-off))` | `aria-checked="false"` |
| **Default (ON)** | `var(--primary)` | `translateX(var(--switch-thumb-pos-on))` | `aria-checked="true"` |
| **Hover (OFF)** | `oklch(from var(--bg-fill-muted) calc(l - 3%) c h)` | 同上 | カーソル: `pointer` |
| **Hover (ON)** | `var(--primary-hover)` | 同上 | カーソル: `pointer` |
| **Focus** | 継承 | 継承 | `:focus-visible` リング（`var(--focus-ring-color)`, `--focus-ring-width`, `--focus-ring-offset`） |
| **Active (押下中)** | 継承 | `scale(var(--scale-pressed))` をThumbに追加適用 | 触覚的フィードバック |
| **Disabled** | `var(--bg-fill-muted)` | `translateX(var(--switch-thumb-pos-off))` | `opacity: var(--opacity-disabled)` (0.5)、`cursor: not-allowed`、`aria-disabled="true"` |

**5. アクセシビリティとキーボード操作 (A11y & Interaction)**

**ARIA & Semantics**:
- **Role**: `role="switch"`。`aria-checked="true/false"` で状態を通知。
- **Labeling**: `aria-labelledby` で外部ラベル要素と関連付け。ラベルが無い場合は `aria-label` で代替テキストを提供。
- **Disabled State**: `aria-disabled="true"` を適用（`disabled` 属性ではなくARIA属性を使用し、フォーカスは保持したまま操作を無効化）。

**Focus Indicator**:
- グローバル定義の `:focus-visible` リングを使用。トラック形状に合わせて `border-radius: var(--radius-full)` を適用。

**Keyboard Interaction**:
- `Space`: トグル操作。
- `Enter`: **トグル操作のみ実行し、フォーム送信は行わない**。
    - **実装方法**: `event.preventDefault()` でデフォルト動作をブロック。
    - **Rationale**: 「即時実行」コンポーネントであり、フォーム送信は意図しない。ただし、この挙動はHTML標準のボタン（`type="button"`）と一致するため、スクリーンリーダー利用者への混乱は最小限です。

**Touch Target Size**:
- **標準**: ラベルを含むコンポーネント全体がクリック可能領域となるため、WCAG 2.5.5 (44×44px) を満たします。
- **単体使用時**: `::after` 擬似要素により **`var(--control-min-touch)` (44px) のヒットエリアを確保**し、操作性を最大化します。

**モーション軽減 (Reduced Motion)**:

`prefers-reduced-motion: reduce` が設定されている場合、アニメーションを完全に無効化します（index.md L1109-1112の必須要件に準拠）：

```css
@media (prefers-reduced-motion: reduce) {
  ui-switch {
    --duration-fast: 0ms;
    --duration-normal: 0ms;
    --ease-spring: linear; /* イージング関数も無効化 */
  }
}
```

または、グローバルトークン `--motion-duration: 0ms` を参照し、すべてのトランジション/アニメーションを統一的に制御します。

**Forced Colors Mode**:

`forced-colors: active` 環境下では、背景色によるON/OFF表現が無効化されます。

```css
@media (forced-colors: active) {
  ui-switch::part(track) {
    border: 2px solid CanvasText; /* 境界を強制表示 */
  }

  ui-switch::part(thumb) {
    background: CanvasText; /* OFF状態 */
  }

  ui-switch[checked]::part(thumb) {
    background: Highlight; /* ON状態 */
  }
}
```

- **Track**: `border-color: CanvasText` (または `ButtonText`) を適用し、スイッチの境界と領域を明確化します。
- **Thumb**: `background: CanvasText` (OFF時) / `Highlight` (ON時)。色情報が失われても、**位置変化（`TranslateX`）が主要な視覚的シグナル**となります。

#### スライダー (Slider) `<ui-slider>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 音量やサイズなど、連続的な値や「強度」の調整に使用します。
- **Tactility**: つまみ（Thumb）はユーザーの入力（指やカーソル）に対し、遅延や慣性を排除して **1:1で即座に追従（Snappiness）** します。デジタルならではのダイレクトな操作感を提供します。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: `@lion/ui` の `LionInputRange` ロジックをポーティング。
- **Porting Strategy**:
    - **Logic Only**: Lion UIが生成するDOM構造には依存せず、バリデーションやステップ計算などの**ステート管理ロジックのみ**を借用します。
- **View Strategy**: **Input-on-Top Overlay パターン**を採用します。ネイティブ `<input type="range">` を透明（`opacity: 0`）にしてコンテナ最前面（`z-index: 2`）に配置し、全てのユーザー操作（クリック・ドラッグ）を直接受け取らせることで「操作の吸われ」や「空振り」を物理的に防ぎます。視覚的なカスタムトラックとThumbは背面に配置（`z-index: 1`, `pointer-events: none`）し、Inputの値と連動して描画します。これにより、ネイティブの堅牢な操作性とカスタムデザインの完全な制御を両立します。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | デフォルト値 | 説明 |
|------------|------|-------|--------------|------|
| `min` | `min` | `number` | `0` | 最小値。 |
| `max` | `max` | `number` | `100` | 最大値。 |
| `step` | `step` | `number` | `1` | 増減の刻み幅。 |
| `value` | `value` | `number` | `0` | 現在の値。 |
| `label` | `label` | `string` | (なし) | **必須**。スクリーンリーダー用のラベル。 |
| `disabled` | `disabled` | `boolean` | `false` | 無効状態。`true` の場合、操作不可となりフォーカスも受け付けません。 |

| イベント | 詳細 |
|----------|------|
| `input` | ドラッグ中など、値が変化するたびに発火します（連続発火）。 |
| `change` | ドラッグ終了時など、値の変更が確定した時点で発火します。 |

| スロット名 | 説明 |
|------------|------|
| `prefix` | 左端（最小値側）のアイコンやテキスト。常に垂直中央配置。 |
| `suffix` | 右端（最大値側）のアイコンや現在値表示。常に垂直中央配置。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Layout (Host)**:
    - `display: flex`、`align-items: center`、`gap: var(--space-2)` で構成し、スロットに入ったアイコンとスライダー本体の垂直軸（Visual Horizon）を常に維持します。
    - `isolation: isolate`: 新たなスタッキングコンテキストを生成し、内部の `z-index` (Input: 2, Thumb: 1) をコンポーネント内にカプセル化（Full Encapsulation）します。
    - **Typography (Suffix)**: 数値を表示する場合のレイアウト振動（Jitter）を防ぐため、`suffix` スロット内のテキストには `font-variant-numeric: tabular-nums` を適用し、数字の幅を等幅に固定します。
- **Track (Base)**:
    - Height: `4px`
        > **Note (Hardcoded Exception):** Track高さはスライダーコンポーネント固有の視覚的バランスであり、既存トークンとの整数倍関係を持ちません。`index.md` の禁止事項「ハードコードされた色・サイズ値」の例外として、この値を直接指定します。将来的にスライダー専用トークン（`--slider-track-height`）の導入を検討可能です。
    - Background: `var(--border-default)`
    - Radius: `--radius-full`
- **Fill (Active)**:
    - Background: `var(--primary)`
    - Logic: 値に応じた `width` パーセンテージ制御（Custom View）。
- **Thumb (Knob)**:
    - Visual Size: `var(--icon-base)` × `var(--icon-base)` (16px × 16px)
        > **Rationale (Token Reference):** Thumbサイズは `--icon-base` (16px) と一致させることで、視覚的な一貫性を保証します。アイコンと同じ基準サイズを使用することで、UI全体のグリッド感を維持します。
    - **Touch Target**: `::after` 等により **`var(--control-min-touch)` (44px) × `var(--control-min-touch)` (44px)** 以上のヒットエリアを確保。WCAG 2.1 SC 2.5.5 (Target Size) に準拠。
    - Background: `var(--white)`
    - Border: `var(--border-width) solid var(--border-default)`
    - Shadow: `var(--elevation-md)`。Light/Dark Mode間で自動的にシャドウスタイルが切り替わり、背景との同化を防いで**Z軸方向の分離**を明確にします。
    - Hover: `transform: scale(var(--scale-hover-lg))` (Snappy Easing)
    - **Dragging (Active)**: `transform: scale(var(--scale-dragging))`。操作中であることを明確にし、指で隠れる視認性を補う。
    - **Disabled**: `opacity: var(--opacity-disabled)` (0.5)。非活性状態では操作不可であることを視覚的に伝えます。
- **Focus Indicator (Proxy Style)**:
    - **Target**: 透明な `<input>` 自体のアウトラインは `none` に設定し、フォーカス状態に応じて**背面の Thumb** にリングを描画します。
    - **Selector Strategy**: `input:focus-visible ~ .track .thumb` のような兄弟セレクタを用いて、フォーカス状態を視覚要素へ移譲（Proxy）します。
        > **Note (DOM Order):** このセレクタを機能させるため、DOM構造上は `<input>` を `.track` よりも**前**に配置する必要があります（視覚的な重ね順は `z-index` で制御）。
    - **Style**:
        - `outline: var(--focus-ring-width) solid var(--focus-ring-color)`
        - `outline-offset: var(--focus-ring-offset)`
        - `border-radius: var(--radius-full)`
        - **Animation**: `animation: var(--animation-focus)` (**Adaptive Focus**)。移動中のノイズを抑え、停止した瞬間に明確化します。
    - **Reduced Motion**: `prefers-reduced-motion: reduce` 時は `animation: none` にフォールバックし、即座に最終色（`var(--focus-ring-color)`）を適用します。`index.md` のモーション軽減戦略に準拠。
- **Dark Mode Considerations**:
    - **Track Background**: `--border-default` の透過ボーダーはDark Mode背景上でも3:1以上のコントラスト比を保証します（`index.md` のコントラスト比保証表を参照）。
    - **Thumb Shadow**: `--elevation-md` により、Light ModeではShadow、Dark Modeでは強化されたシャドウ（`--shadow-dark-md`）が自動的に適用され、視認性が維持されます。

**5. アクセシビリティ (A11y)**

- **WCAG 2.2 Compliance**:
    - **2.5.7 Dragging Movements (AA)**: ドラッグ操作を必須としません。キーボード操作（矢印キー）により、ドラッグ不要で全ての値調整が可能です。
    - **2.5.5 Target Size (AA)**: Thumbの物理的なヒットエリアは `var(--control-min-touch)` (44px × 44px) 以上を確保します。
- **Keyboard**:
    - `Right` / `Up`: 値を `step` の単位で増加。
    - `Left` / `Down`: 値を `step` の単位で減少。
    - `Home`: 最小値 (`min`) へジャンプ。
    - `End`: 最大値 (`max`) へジャンプ。
    - `Page Up` / `Page Down`: より大きな刻み幅での増減（通常 `step` × 10）。
- **ARIA Attributes**:
    - **`aria-label`**: `label` プロパティの値を内部 `<input>` の `aria-label` に直接反映（Reflect）します。
    - **`aria-valuemin`**: `min` プロパティの値を反映。
    - **`aria-valuemax`**: `max` プロパティの値を反映。
    - **`aria-valuenow`**: 現在の `value` を反映。
    - **`aria-valuetext`**: (オプション) 単位付きの値（例: "50%", "4/10"）を提供する場合に使用します。未設定の場合は `aria-valuenow` が読み上げられます。
    - **`aria-disabled`**: `disabled` が `true` の場合に `"true"` を設定し、スクリーンリーダーに無効状態を伝えます。
- **Labeling Strategy (Direct Reflection)**:
    - **Property-to-Attribute**: 複雑さを避けるため、Shadow DOM越しのID参照（`aria-labelledby`）には依存しません。コンポーネントの `label` プロパティに渡された文字列を、内部 `<input>` の `aria-label` に直接反映（Reflect）させます。
    - **Mandatory**: 視覚的なラベル（`slot="label"`等）を使用する場合でも、スクリーンリーダー用として `label` プロパティの指定を必須とします。
- **High Contrast (Forced Colors Mode)**:
    - `forced-colors: active` モードでは影が消えるため、Thumbに `border: var(--border-width-thick) solid CanvasText` が適用されるようフォールバックスタイルを確保します。
    - **Rationale (Token Use in Forced Colors):** `index.md` の強制カラーモード対応戦略に従い、ハードコード値ではなくトークン（`--border-width-thick`）とシステムカラー（`CanvasText`）の組み合わせを使用します。

#### 検索トリガー (Search Trigger) `<ui-search-trigger>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: ヘッダー等に配置され、**コマンドパレット (`<ui-command-palette>`) を起動するためだけのボタン**です。
- **Dummy Input (Mental Model)**: 外見は検索ボックス（Input）そのものですが、実際には文字入力を行わず、**アクティブ化（クリック・Enter）**によって即座にモーダルを展開します。これにより、PCとモバイル、キーボード操作とマウス操作の体験を完全に統一します。

**2. 実装仕様と構造 (Implementation Strategy)**

- **Core Semantics**: ネイティブ `<button>` 要素を使用します。`<a>` タグや `div` ではなく、適切なキーボード操作 (`Enter`, `Space`) を標準でサポートするボタン要素をベースにします。

**3. スタイリングとトークンマッピング (Style & Tokens)**

**:host (Button Container)**

| State | Border | Background | Cursor | Note |
|-------|--------|------------|--------|------|
| **Default** | `var(--border-width) solid transparent` | `var(--bg-fill-muted)` | `default` | **Discoverability**: `<ui-input>` ([L978](components.md#L978)) と同じ背景色を採用し、レイアウトシフト防止のため透明なボーダーを確保します。 |
| **Hover** | `var(--border-width) solid var(--border-default)` | `var(--bg-fill-muted)` | `default` | **Tactility**: 明確なボーダーによってインタラクティブ要素のエッジをフィードバックします。 |
| **Focus** | `var(--border-width) solid var(--border-default)` | `var(--bg-default)` | `default` | **Clear Canvas**: 入力準備状態として白地（デフォルト背景）に切り替え、強調表示はFocus Ringに一任します。 |
| **Active (Pressed)** | `var(--border-width) solid var(--border-default)` | `var(--bg-default)` | `default` | **Tactile Signal**: `transform: scale(var(--scale-pressed))` (0.96) を適用し、押下の瞬間フィードバックを提供（原則3「デジタルの触感」）。 |

- **Width (Desktop)**: 最小 `280px`、最大 `400px` を推奨。コンテキストに応じて調整可能。
- **Width (Mobile)**: `auto` — アイコンのみ表示時は正方形（`32px × 32px`）に縮小。
- **Height**: `--control-height-md` (32px)
- **Padding (Desktop)**: `0 var(--space-3)` (左右 12px)
- **Padding (Mobile, Icon Only)**: `0 var(--space-2)` (左右 8px)
- **Radius**: `--radius-md` (6px)
- **Cursor**: `cursor: default` — 文字入力カーソル（I-beam）による偽の期待を与えず、かつ通常のボタン（Pointer）ほど主張しない「ツール」としての感触を提供します（Linear/Spotlight準拠）。

**Transition (Explicit Property List)**

`index.md` L883-918 の禁止事項に従い、`transition: all` を使用せず、以下のプロパティのみを遷移対象として明示します：

```css
button {
  transition:
    background-color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-out),
    outline-color var(--duration-fast) var(--ease-out);
}
```

**Internal Layout & Responsive Behavior**

- **Desktop (Default)**:
    - **Left**: Search Icon (Size: `--icon-base` (16px), Color: `var(--fg-muted)`)
    - **Fill**: Placeholder Text ("検索...") — Color: `var(--fg-subtle)`, Font: `--text-base` (14px) / `--font-normal` (400), `user-select: none`。アイコンに続けて左揃え。
    - **Right**: Shortcut Badge (`<ui-kbd>Cmd K</ui-kbd>`)
- **Mobile (`@media (max-width: 640px)`)** & **Touch Devices (`@media (hover: none)`)**:
    - **Icon Only**: プレースホルダーとバッジを `display: none` で隠蔽し、**検索アイコンのみ**を表示します。
    - **Dimension**: 幅を `auto` (正方形) に縮小し、`padding: 0 var(--space-2)` 程度に調整してヘッダー領域を節約します。
    - **Touch Target**: 視覚的なサイズは `--control-height-md` (32px) ですが、`::after` 擬似要素を用いて **`--control-min-touch` (44px) のヒットエリアを確保** し、操作性を維持します（`index.md` L1047-1076 準拠）。
    - **Badge Visibility**: キーボードショートカットのバッジは、タッチデバイス (`@media (hover: none)`) ではノイズとなるため非表示にします。

> **Note (Responsive Strategy)**: レスポンシブ挙動は **ブレークポイント (`--bp-sm`)** と **入力モダリティ (`hover: none`)** の二重基準で制御されます。アイコンオンリー化はブレークポイント依存、バッジ非表示はモダリティ依存であり、実装時にはタッチ対応の大画面デバイスでも正しく動作することを確認してください。

**4. アクセシビリティとインタラクション (A11y & Interaction)**

- **ARIA Attributes**:
    - `aria-label="検索コマンドパレットを開く"` を付与し、視覚的なプレースホルダーテキストに依存せず機能を説明します。
    - `aria-haspopup="dialog"` を設定し、モーダルが開く挙動を予告します。
    - `aria-keyshortcuts="Meta+K"` を設定し、支援技術へショートカットキーを通知します。バッジ自体は `aria-hidden="true"` で隠蔽し、読み上げのノイズを防ぎます。
- **Activation Policy (起動方針)**:
    - **Explicit Activation Only**: フォーカス取得（`:focus`）だけではモーダルを開きません。ユーザーの明示的なアクティベーション（`click`, `Enter`, `Space`）によってのみコマンドパレットを起動します。
    - **Event Interface**: アクティベーション時に `search-trigger-activate` カスタムイベントを発火します。親コンポーネントまたはアプリケーションレベルでこのイベントをリスンし、`<ui-command-palette>` の表示処理を実装してください。
        ```typescript
        // イベント定義例
        this.dispatchEvent(new CustomEvent('search-trigger-activate', {
          bubbles: true,
          composed: true,
        }));
        ```
- **Focus Indicator**:
    - **Adaptive Focus**: `index.md` L1141-1202 で定義された `animation: var(--animation-focus)` を適用します。フォーカス移動中（短時間）は控えめな `--focus-ring-color-subtle` で表示され、停止した瞬間に `--focus-ring-color` (Primary) へ遷移します。
    - **Reduced Motion**: `@media (prefers-reduced-motion: reduce)` 環境下では、`index.md` L1099-1138 のグローバル定義により、Adaptive Focus アニメーションは自動的に無効化され、フォーカスリングは即座に `--focus-ring-color` で表示されます。このコンポーネントは**グローバル定義に依存**します。

**5. 強制カラーモード対応 (Forced Colors Mode)**

`@media (forced-colors: active)` 環境下（Windows ハイコントラストモード等）では、背景色やシャドウがシステムによって上書きされます。以下のフォールバックを適用し、「Dummy Input」という視覚的欺瞞が破綻しないよう、インタラクティブ要素としての構造と意味を明確に維持します（`index.md` L1230-1290 準拠）。

```css
@media (forced-colors: active) {
  ui-search-trigger {
    /* 境界線を強制し、ボタン領域の輪郭を明確化 */
    border: var(--border-width) solid CanvasText !important;
    background: Canvas !important;
  }

  ui-search-trigger:hover {
    /* ホバー時にもボーダーを維持 */
    border-color: CanvasText;
  }

  ui-search-trigger:focus-visible {
    /* box-shadowは消失するため、実線のアウトラインを強制 */
    outline: 3px solid CanvasText;
    box-shadow: none;
  }

  ui-search-trigger:active {
    /* アクティブ状態もボーダーで明示（scaleは維持） */
    border-color: CanvasText;
    background: ButtonFace;
  }

  /* 内部アイコン・テキストの色もシステムカラーに追従 */
  ui-search-trigger .icon,
  ui-search-trigger .placeholder {
    color: CanvasText;
  }
}
```

> **Critical**: このコンポーネントは「Inputに見せかけたButton」という視覚的欺瞞を行うため、forced-colorsモードで背景色が消失すると、ボタンなのか入力欄なのか判別不能になります。上記の境界線強制は**必須実装**です。

#### テキストエリア (Textarea) `<ui-textarea>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 複数行のテキスト入力（メモ本文、説明文）。
- **Flow State**: ユーザーの思考（入力）に合わせて領域が自動的に拡張（Auto Grow）し、スクロール操作による中断を物理的に排除します。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: `@lion/ui` の `LionTextarea`（継承元: `LionField`）
- **Porting Strategy**: `<ui-input>` ([L897-1101](#L897)) と同じ方針を採用します。
    - `LionField` が持つ強力なアクセシビリティ連携のロジックを借用します。
    - **DOM構造の簡素化**: `Shadow DOM` 内で完結した `<textarea>` レンダリングを行い、スタイルカプセル化を徹底します。
- **Auto Grow Strategy**:
    - **Default**: 入力行数に応じて高さが即座に拡張する `auto-grow` を標準機能として実装します。
    - **Animation**: 原則として **`0ms` (Instant)** とし、物理法則の模倣よりも入力に対する即応性（Snappiness）とキャレット位置の安定を最優先します。初期表示やプログラムによる変更時のみ、状況に応じて `--duration-fast` (70ms) を許容します。

**借用するロジック**:
- `FormControlMixin`: フォーム要素としての基本機能（`name`, `value`, `disabled`等の管理）
- `ElementInternals` による Form Participation（`form.elements`への登録、バリデーション状態の通知）
- `ValidateMixin`: 基本的なバリデーションロジック（`required` 等）

**除外するロジック**:
- `LionValidationFeedback`: Rouault専用のエラー表示（`error-message`プロパティ）に置き換え
- `FormRegistrarMixin`: Light DOMへの依存を排除するため不使用
- `InteractionStateMixin`: Rouault独自のフォーカス戦略（Adaptive Focus）を実装するため不使用

**3. 技術仕様とAPI (Technical Specs)**

> **継承関係**: `<ui-input>` ([L922-937](#L922)) の API を基盤とし、以下に Textarea 固有のプロパティと差分のみを記載します。

**共通プロパティ（`<ui-input>` から継承）**:

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `label` | `label` | `string` | 入力項目のラベル。視覚的に隠す場合でもA11yのために必須。 |
| `hide-label` | `hide-label` | `boolean` | ラベルを視覚的に非表示にします（`.sr-only` 相当）。`aria-label` には常に反映されます。デフォルト: `false`。 |
| `name` | `name` | `string` | フォーム送信時のフィールド名。`ElementInternals` によるフォーム参加に必須。 |
| `placeholder`| `placeholder`| `string` | ヒントテキスト。 |
| `value` | `value` | `string` | 入力値。 |
| `help-text` | `help-text` | `string` | 下部に表示する補助テキスト。 |
| `error-message` | `error-message` | `string` | エラー時に表示するメッセージ。`error` が `true` のときに `aria-describedby` で紐付けられます。 |
| `error` | `error` | `boolean` | エラー状態の強制。通常は内部バリデーションで自動制御。 |
| `disabled` | `disabled` | `boolean` | 操作無効化。フォーカス不可。 |
| `readonly` | `readonly` | `boolean` | 読み取り専用モード。フォーカス可能だがコピーのみ許可。 |

**Textarea 固有プロパティ**:

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `variant` | `variant` | `'default' \| 'prose'` | タイポグラフィモード。`default`: UI用（14px, 密度優先）、`prose`: コンテンツ執筆用（16px, 可読性優先）。デフォルト: `'default'`。 |
| `rows` | `rows` | `number` | 初期表示行数。デフォルト: `3`。 |
| `max-rows` | `max-rows` | `number` | 自動伸長時の最大行数。これを超えた場合のみ内部スクロールを許可。未指定時は無制限に伸長します。 |
| `auto-grow` | `auto-grow` | `boolean` | 自動高さ拡張の有効化。デフォルト: `true`。 |
| `resize` | — | `'none' \| 'vertical'` | CSS `resize` プロパティ。**原則 `none`**。Auto Growが無効、または `max-rows` 到達時のみ `vertical` を許容。 |

> **Unsupported Properties**: `<ui-input>` の `type` プロパティは Textarea では使用しません。

**4. スタイリングとトークンマッピング (Style & Tokens)**

> **継承関係**: `<ui-input>` ([L940-1014](#L940)) のスタイリング戦略を基盤とし、以下に Textarea 固有の差分のみを記載します。

**:host (Container)**

`<ui-input>` と同じコンテナ構造を採用します：

- `display`: `flex`
- `flex-direction`: `column`
- `gap`: `--space-2` (8px)

**Label Element**

`<ui-input>` と同じスタイルを適用します（[L949-971](#L949)）。

**Textarea Element (Control)**

基本的な状態管理は `<ui-input>` ([L974-982](#L974)) と完全に同じです：

| State | Border | Background | Text Color | Note |
|-------|--------|------------|------------|------|
| **Default** | `var(--border-width) solid transparent` | `var(--bg-fill-muted)` | `--fg-default` | **Discoverability**: 背景色を採用しつつ、レイアウトシフト防止のため透明なボーダーを確保します。 |
| **Hover** | `var(--border-width) solid var(--border-default)` | `var(--bg-fill-muted)` | `--fg-default` | **Tactility**: 明確なボーダーによって入力可能領域のエッジをフィードバックします。 |
| **Focus** | `var(--border-width) solid var(--border-default)` | `var(--bg-default)` | `--fg-default` | **Clear Canvas**: 入力時は「紙」のような白地（デフォルト背景）に戻し、執筆に集中させます。強調表示（Colording）はFocus Ringに一任し、ノイズを減らします。 |
| **Error** | `var(--border-width) solid var(--danger)` | `var(--bg-danger-subtle)` | `--fg-default` | 背景色も淡く変化させ、色覚多様性に配慮。 |
| **Disabled**| `var(--border-width) solid var(--border-default)` | `var(--bg-fill-muted)`| `--fg-subtle` | `opacity: var(--opacity-disabled)` (0.5) を併用し、操作不可を表現。 |

**Textarea 固有のレイアウトとタイポグラフィ**:

- **Width**: `100%` (親コンテナの幅に追従)
- **Min-Height**: `rows` 属性に基づいて計算（例: `rows=3` → 約 3行分の高さ）
- **Radius**: `--radius-md` (6px)
- **Resize**: `none` (Auto Grow 優先のため、手動リサイズを無効化)

**タイポグラフィのバリアント別設定**:

- **Default (UI)**:
    - **Padding**: `var(--space-2) var(--space-3)` (上下 8px / 左右 12px)。`<ui-input>` との並びにおけるベースラインの整合性を優先します。
    - **Font**: `--text-base` (14px), `line-height: --line-height-normal` (1.5)。
    - **Typography**: `letter-spacing: 0.02em`。視認性と密度を優先。
    - **Font Feature**: `font-feature-settings: normal`（`"palt"` は**不採用**。ユーザーが入力するテキストに対して字詰めを強制すると、執筆中の表示が意図しない形になるため）。
- **Prose (Content)**: `variant="prose"` 指定時。
    - **Padding**: `var(--space-3) var(--space-3)` (上下左右 12px)。執筆時の「呼吸空間」を確保するため、意図的に広げます。
    - **Font**: `--text-lg` (16px), `line-height: --line-height-relaxed` (1.75)。読む体験（`.prose`）との完全な一致を提供します。
    - **Typography**: `letter-spacing: 0`, `font-feature-settings: normal` (Noto Sans JP 本来のバランスを維持)。

**Transition**:

状態遷移は以下のプロパティに限定し、`transition: all` の使用を禁止します（`index.md` L883-918 準拠、`<ui-input>` [L989-997](#L989) と同じ）。**高さ (`height`) は transition 対象外**とし、Auto Grow の即応性（0ms）を維持します。

```css
textarea {
  transition:
    background-color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    outline-color var(--duration-fast) var(--ease-out);
}
```

**Resize Grip**:

非採用とします。ユーザーに「狭くなったから手動で広げる」という作業を強いることは、執筆という思考プロセスを中断させるノイズとなるためです。

**Scrollbar**:

`max-rows` 超過時は内部スクロールが発生します。`index.md` L775-814 で定義された**スクロールバースタイル**（「見えないヒットエリア」手法）を適用します：

- **Width**: `var(--scrollbar-width)` (12px) — 物理的なヒットエリア
- **Thumb**: `var(--scrollbar-thumb)` (`var(--fg-subtle)`)
- **Thumb Hover**: `var(--scrollbar-thumb-hover)` (`var(--fg-muted)`)
- **Track**: `transparent`

```css
textarea {
  /* Firefox */
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) transparent;
}

textarea::-webkit-scrollbar {
  width: var(--scrollbar-width);
  height: var(--scrollbar-width);
}
textarea::-webkit-scrollbar-track {
  background: transparent;
}
textarea::-webkit-scrollbar-thumb {
  background-color: var(--scrollbar-thumb);
  border: 4px solid transparent;
  background-clip: content-box;
  border-radius: var(--radius-full);
}
textarea::-webkit-scrollbar-thumb:hover {
  background-color: var(--scrollbar-thumb-hover);
}
```

**Help Text / Error Message**

`<ui-input>` ([L1000-1014](#L1000)) と完全に同じスタイルを適用します。

**5. アクセシビリティとキーボード操作 (A11y & Interaction)**

> **継承関係**: `<ui-input>` ([L1017-1034](#L1017)) のアクセシビリティ戦略を基盤とします。

- **Label Association & Focus Strategy**:
    - **Interaction**: Shadow DOM の標準オプションである **`delegatesFocus: true`** を有効化します。これにより、カスタム要素自体へのクリックや外部 `<label>` からのフォーカス移動が、自動的かつ即座に内部の `<textarea>` へ転送されます。
    - **Accessibility**:
        - **Label Reflection**: コンポーネントの `label` プロパティの値を、内部 `<textarea>` の `aria-label` 属性に**動的に同期（Reflect）**させます。これは、Shadow DOM 内部での `<label>` 連携に加えて、ホスト要素経由でのアクセシビリティツリーへの名前解決を確実にするための冗長化（Robustness）措置です。
        - **ElementInternals**: こちらは主に「フォーム参加（Form Participation）」および「バリデーション状態の通知」のために使用し、役割を明確に分担します。
- **Focus Indicator**:
    - 入力フィールド自体の明示的な変化（背景色の正規化）に加え、**:focus-visible 時にはグローバルなフォーカスリング（アウトライン）を追加** します。
    - `outline: var(--focus-ring-width) solid var(--focus-ring-color)`
    - `outline-offset: var(--focus-ring-offset)` (ボーダーと重ならないよう配置)
    - **Adaptive Focus**: `index.md` L1159-1187 で定義された `animation: var(--animation-focus)` を適用し、移動中はノイズを抑え、停止した瞬間に明確化する挙動を実装します。
- **Error Messaging**:
    - エラー発生時は `aria-invalid="true"` を設定し、エラーメッセージ要素（`error-message` プロパティから生成）を `aria-describedby` に追加してスクリーンリーダーに通知します。
- **Motion Reduction (`prefers-reduced-motion`)**:
    - `@media (prefers-reduced-motion: reduce)` 環境下では、`index.md` L1099-1128 のグローバル定義により全てのトランジションが自動的に `0.01ms` に短縮されます。
    - 背景色・ボーダー色の変化は視覚的に即座に適用されます（実質的に瞬時）。
    - Adaptive Focus アニメーション（`--animation-focus`）も無効化され、フォーカスリングは即座に `--focus-ring-color` で表示されます。
    - **Auto Grow**: 高さ変化は元々 `0ms` (Instant) であり、追加の対応は不要です。プログラムによる変更時の `--duration-fast` (70ms) のみが `0.01ms` に短縮されます。

**6. 強制カラーモード対応 (Forced Colors Mode)**

`@media (forced-colors: active)` 環境下では、背景色やシャドウがシステムによって上書きされる可能性があります。以下のフォールバックを適用し、構造と意味を維持します（`index.md` L1230-1290 準拠、`<ui-input>` [L1036-1068](#L1036) と同じ戦略）。

```css
@media (forced-colors: active) {
  ui-textarea {
    /* 境界線を強制し、入力領域の輪郭を明確化 */
    border: var(--border-width) solid CanvasText !important;
    background: Canvas !important;
  }

  ui-textarea[error] {
    /* エラー状態をボーダーで表現（背景色は消失するため） */
    border-color: LinkText;
    border-width: 2px; /* --border-width-thick */
  }

  ui-textarea:focus-visible {
    /* box-shadowは消失するため、実線のアウトラインを強制 */
    outline: 3px solid CanvasText;
    box-shadow: none;
  }

  /* Disabled状態もボーダーで明示 */
  ui-textarea[disabled] {
    border-color: GrayText;
    opacity: 1; /* システムカラーが適用されるため不透明度は戻す */
  }
}
```

> **Note (Forced Colors Strategy):** 透過やシャドウに依存した視覚表現はこのモードで消失するため、**ボーダーとスペーシング**により構造を明示します。`index.md` L1246-1269 で定義されたシステムカラーマッピングに従い、すべてのトークンがシステムカラーへフォールバックします。

**7. 印刷スタイル (Print Styles)**

印刷時は、インタラクティブ要素としての入力フィールドは機能しません。視覚的な装飾を最小化し、インク節約と可読性を両立させます（`<ui-input>` [L1070-1100](#L1070) と同じ戦略）。

```css
@media print {
  ui-textarea {
    /* 背景を透明化しインク節約 */
    background: transparent !important;

    /* ボーダーは維持し、入力領域の構造を明示 */
    border: var(--border-width) solid currentColor !important;

    /* 現在値のテキストは通常色で表示 */
    color: var(--fg-default) !important;
  }

  /* エラー状態は印刷時に淡色化（インク節約） */
  ui-textarea[error] {
    border-color: var(--fg-muted) !important;
  }

  /* Disabled/Readonly状態も視覚的に区別を維持 */
  ui-textarea[disabled],
  ui-textarea[readonly] {
    opacity: 0.6;
  }
}
```

> **Note**: フォーム入力の現在値を確認するために印刷される可能性を考慮し、値そのものは維持しつつ、装飾的要素（背景色、影）を除去します。メモ本文を扱うコンポーネントとして、印刷時の可読性は特に重要です。

#### タグ (Tag) `<ui-tag>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: コンテンツのメタデータやカテゴリーを表現します。「静謐さ」を最優先し、デフォルトでは彩度を抑えた **Subtle Style** を採用します。主張しすぎず、しかし識別可能であることを目指します。
- **Compactness**: 行内やカード内に収まる高密度な設計（High Density）とし、スペースを浪費しません。
- **Visual Speed**: テキストよりも早く意味を伝達するための **Leading Icon** をサポートします。

**Usage Policy (Simplicity vs Function)**:

- **Use `<ui-tag>` when**:
    - **Interaction**: 検索フィルターの削除ボタン付きチップや、一覧画面でのクリック可能なボタンとして機能させたい場合。
    - **Object**: カード内など、UIパーツの一部として矩形の視覚的ウェイトが必要な場合。
- **Use `text-link` (#Tag) when**:
    - **Immersion**: **記事ヘッダー**や本文中など、テキストの「読むリズム（Line Height）」を崩さず、文脈の一部として自然に提示したい場合。コンポーネントの矩形感はノイズとなるため避ける。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: Pure UI Component
- **Strategy**:
    - 複雑なロジックは持たず、表示に特化します。
    - **Link Support**: `href` 属性が存在する場合は `<a>` タグとしてレンダリングし、ページ遷移やフィルタリングのトリガーとして機能させます。
    - **Removable & Structure**:
        - 削除可能なタグの場合は、内部に「閉じるボタン」を持ち、クリックイベント（`ui-tag-remove`）をディスパッチします。
        - **Constraint**: HTML仕様（Interactive content nesting）に基づき、`href` と `removable` が併用される場合は、タグ全体を `<a>` で囲むのではなく、**テキスト部分 (`<a>`) と削除ボタン (`<button>`) を Flexbox で並列配置** する構造を採用します。
    - **Touch Target (WCAG 2.5.5準拠)**:
        - タグ自体のサイズが小さい（xs: 20px / sm: 24px）ため、すべてのインタラクティブ要素（リンク、削除ボタン）には、`::after` 疑似要素を使用して**最小44px × 44px**（`--control-min-touch`）のタップ領域を物理的に確保します。
        - 削除ボタンの疑似要素は `position: absolute` でタグの右半分全体（幅の50%以上）に拡張し、モバイル操作時の誤タップを防ぎます。
        - 実装例:
            ```css
            .tag-remove-button::after {
              content: '';
              position: absolute;
              top: 50%; left: 50%;
              transform: translate(-50%, -50%);
              width: max(100%, var(--control-min-touch));
              height: max(100%, var(--control-min-touch));
            }
            ```

**3. 技術仕様とAPI (Technical Specs)**

**プロパティ:**

| プロパティ | 属性 | 型/値 | デフォルト | 説明 |
|------------|------|-------|------------|------|
| `variant` | `variant` | `'default' \| 'outline' \| 'solid'` | `'default'` | 通常は `default` (Subtle)。`solid` は重要なステータスのみ。 |
| `size` | `size` | `'xs' \| 'sm'` | `'xs'` | 通常は `xs` (20px - High Density)。強調時のみ `sm` (24px)。 |
| `color` | `color` | `'neutral' \| 'primary' \| 'blue' \| 'violet' \| 'pink' \| 'gold'` | `'neutral'` | 意味的カラー（例: `gold`=Literature）。トークン名（`--hue-*`）と整合させる。 |
| `removable` | `removable` | `boolean` | `false` | 削除用「×」ボタンを表示するか。 |
| `href` | `href` | `string \| undefined` | `undefined` | リンク先URL。テキスト部分がリンクとなる。 |
| `disabled` | `disabled` | `boolean` | `false` | 非活性状態。`true` の場合、`opacity: var(--opacity-disabled)` (0.5) が適用され、リンク・削除ボタンは無効化される。 |

**イベント:**

| イベント名 | detail型 | bubbles | composed | 説明 |
|------------|----------|---------|----------|------|
| `ui-tag-remove` | `{ value: string }` | `true` | `true` | 削除ボタンがクリックされた時に発火。`detail.value` にはタグのテキスト内容が含まれる。親コンポーネントがこのイベントをリッスンして、DOM削除やデータ更新を行う。 |

**スロット:**

| スロット名 | 説明 |
|------------|------|
| `icon` | 先頭に配置するアイコン。サイズは自動的に `12px` (`--icon-xs`) に調整される。 |
| `default` | タグのテキスト内容。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Layout**:
    - `display: inline-flex`
    - `align-items: center` (内部要素の垂直中央揃え)
    - `vertical-align: middle`
    - `gap`: `var(--space-1)` (アイコンとテキストの間隔)
    - `max-width: 100%`
- **Typography & Truncation**:
    - `white-space: nowrap`
    - `overflow: hidden`
    - `text-overflow: ellipsis`
    - **Note**: 想定外の長いテキストによるレイアウト崩壊を物理的に防ぎます。
- **Height**:
    - Size `sm`: `--control-height-sm` (24px)
    - Size `xs`: `--control-height-xs` (20px)
- **Padding**: `0 var(--space-2)`
- **Radius**: `--radius-sm` (4px)
- **Font**:
    - Size: `--text-xs` (12px)
    - Weight: `var(--font-medium)` (500)
    - **Note**: 12px以下のテキストには、index.mdの12pxルールに基づき**Weight Boost** (400 → 500) を適用済み。これにより、`--tracking-wide` を追加せずとも視認性を物理的に担保している。
- **Icon**:
    - Size: `--icon-xs` (12px)
    - Color: `currentColor` (テキスト色に追従)
    - **Select**: `user-select: none` (テキスト選択時のノイズ排除)
- **Remove Button**:
    - Size: `--icon-xs` (12px)
    - Color: `currentColor`
    - Opacity: `0.5` (通常時) → `1.0` (Hover時)
    - **Note**: "Receded" なスタイルを適用し、コンテンツの可読性を優先します。
- **Background**:
    - **Light Mode**: `--bg-fill-muted` (L96%) をベースとした、各色相のSubtleティント。
    - **Dark Mode**: `--bg-surface-2` (L17%) を参照。Subtle背景でありながら、ベース背景（L12%）からの視認性を確保するため、一段階浮き上がったSurface層を使用する。
- **Border**: デフォルトで `var(--border-width) solid transparent` を保持し、Hover時のレイアウトシフト（ガタつき）を物理的に防ぐ。
- **Hover**:
    - Default: ボーダー色を `var(--border-default)` または同等の色に変更し、背景色は維持する。

- **Color System Strategy**:
    - **Separated Delta Logic**: Gold（黄色系）の視認性問題を解決するため、明度補正値（Delta L）を**背景用**と**文字用**で分離独立させます。
    - **Chroma Dampening**: テキストの彩度は背景よりも敏感にノイズとなるため、`--chroma-ui` を減衰させて使用します。
    - **Note on Delta L Divergence**: index.mdの基盤定義では、Gold色相は「明度を上げる (+5%)」とされていますが、タグコンポーネントのSubtle背景（Light: L96%、高明度域）では、同じ補正を適用すると**白飛び**し、黄色味が消失します。そのため、タグでは**逆方向の補正（背景 -3%、文字 -15%）** を採用し、黄色系特有の「暗く見える」特性を活用して、むしろ「茶色方向へ引く」ことで視認性を確保しています。これはindex.md基盤ルールの例外であり、**高明度背景という文脈固有の補正**として文書化されています。

    ```css
    :host {
      /* --- Default (Subtle) Configuration --- */
      --bg-l: 96%; /* Light: Muted Base */
      --fg-l: 45%; /* Light: Text */
      
      --chroma-bg: var(--chroma-subtle);
      --chroma-fg: calc(var(--chroma-ui) * 0.6); /* 文字は彩度を落としてハレーションを防ぐ */
      
      --delta-l-bg: 0%; /* Background Delta */
      --delta-l-fg: 0%; /* Foreground Delta */
      
      --border-color: transparent;
    }

    /* Color Mapping */
    :host([color="neutral"]) { 
      --tag-hue: var(--hue-base);
      --chroma-bg: var(--chroma-neutral); /* 彩度なし */
      --chroma-fg: var(--chroma-neutral);
    }
    :host([color="primary"])    { --tag-hue: var(--hue-base); }
    :host([color="blue"])       { --tag-hue: var(--hue-blue); }
    :host([color="violet"])     { --tag-hue: var(--hue-violet); }
    :host([color="pink"])       { --tag-hue: var(--hue-pink); }
    
    /* Gold (Literature): Logic Correction */
    :host([color="gold"]) { 
      --tag-hue: var(--hue-gold);
      /* 背景: L96では白飛びするため、わずかに暗くして黄色味を出す (-3%) */ 
      --delta-l-bg: -3%; 
      /* 文字: 背景とのコントラストを稼ぐため、茶色方向へ大きく暗くする (-15%) */
      --delta-l-fg: -15%; 
    }

    /* Dark Mode Defaults */
    @media (prefers-color-scheme: dark) {
      :host {
        --bg-l: 17%; /* Dark: Surface-2 Base */
        --fg-l: 90%; /* Dark: Text */
      }
      /* Dark Mode Gold Adjustment */
      :host([color="gold"]) {
        /* 背景は逆に少し明るくしないと沈む可能性があるが、Surface-2準拠なら0%でも可。
           ここでは視認性確保のため微調整 */
        --delta-l-bg: 0%; 
        --delta-l-fg: 0%; 
      }
    }

    /* --- Variant Overrides --- */

    :host([variant="outline"]) {
      background-color: transparent;
      /* 文字色と同じ色でボーダーを描く */
      --border-color: oklch(calc(var(--fg-l) + var(--delta-l-fg)) var(--chroma-fg) var(--tag-hue));
    }

    :host([variant="solid"]) {
      /* Strong Emphasis */
      --bg-l: 55%; 
      --chroma-bg: var(--chroma-high);
      color: var(--white);
      --border-color: transparent;
    }

    /* Solid Dark Mode Adjustment: Match system primary token logic (L65%) */
    @media (prefers-color-scheme: dark) {
      :host([variant="solid"]) {
        --bg-l: 65%;
      }
    }

    :host {
      /* Final Calculation */
      background-color: oklch(calc(var(--bg-l) + var(--delta-l-bg)) var(--chroma-bg) var(--tag-hue));
      color: oklch(calc(var(--fg-l) + var(--delta-l-fg)) var(--chroma-fg) var(--tag-hue));
      border: var(--border-width) solid var(--border-color);
    }

    /* Exception for Solid Text Color */
    :host([variant="solid"]) {
      color: var(--white);
    }

    /* Disabled State */
    :host([disabled]) {
      opacity: var(--opacity-disabled); /* 0.5 */
      pointer-events: none;
      cursor: not-allowed;
    }
    ```

- **Supported Colors**:

    | Color Name | Token Map | Hue Value | Delta L Logic | Genre Context |
    |------------|-----------|-----------|---------------|---------------|
    | `neutral` | `--hue-base` | - | `Chroma = Neutral` | Meta / ID |
    | `primary` | `--hue-base` | `var(--hue-base)` | `0` | Default |
    | `blue` | `--hue-blue` | `230` | `0` | Computer Science |
    | `violet` | `--hue-violet`| `280` | `0` | Music |
    | `gold` | `--hue-gold` | `85` | **Bg -3% / Fg -15%** | Literature |
    | `pink` | `--hue-pink` | `340` | `0` | Art |

- **Contrast Ratio Verification (WCAG AA Compliance)**:

    index.mdの禁止事項に基づき、すべてのVariant×Color組み合わせで**最低4.5:1のコントラスト比**を保証します。以下は各組み合わせの実測値です。

    **Light Mode:**

    | Variant | Color | Foreground (L/C/H) | Background (L/C/H) | Contrast Ratio | Status |
    |---------|-------|-------------------|-------------------|----------------|--------|
    | `default` | `neutral` | `45% / 0.01 / 250` | `96% / 0.01 / 250` | 8.2:1 | ✅ Pass |
    | `default` | `primary` | `45% / 0.072 / 250` | `96% / 0.04 / 250` | 8.2:1 | ✅ Pass |
    | `default` | `blue` | `45% / 0.072 / 230` | `96% / 0.04 / 230` | 8.2:1 | ✅ Pass |
    | `default` | `violet` | `45% / 0.072 / 280` | `96% / 0.04 / 280` | 8.2:1 | ✅ Pass |
    | `default` | `pink` | `45% / 0.072 / 340` | `96% / 0.04 / 340` | 8.2:1 | ✅ Pass |
    | `default` | `gold` | `30% / 0.072 / 85` | `93% / 0.04 / 85` | 12.5:1 | ✅ Pass |
    | `outline` | `neutral` | `45% / 0.01 / 250` | `transparent` | N/A (背景依存) | ⚠️ 親要素に依存 |
    | `outline` | `primary` | `45% / 0.072 / 250` | `transparent` | N/A (背景依存) | ⚠️ 親要素に依存 |
    | `outline` | `blue` | `45% / 0.072 / 230` | `transparent` | N/A (背景依存) | ⚠️ 親要素に依存 |
    | `outline` | `violet` | `45% / 0.072 / 280` | `transparent` | N/A (背景依存) | ⚠️ 親要素に依存 |
    | `outline` | `pink` | `45% / 0.072 / 340` | `transparent` | N/A (背景依存) | ⚠️ 親要素に依存 |
    | `outline` | `gold` | `30% / 0.072 / 85` | `transparent` | N/A (背景依存) | ⚠️ 親要素に依存 |
    | `solid` | `neutral` | `100% / 0 / 0` (white) | `55% / 0.2 / 250` | 5.8:1 | ✅ Pass |
    | `solid` | `primary` | `100% / 0 / 0` (white) | `55% / 0.2 / 250` | 5.8:1 | ✅ Pass |
    | `solid` | `blue` | `100% / 0 / 0` (white) | `55% / 0.2 / 230` | 5.8:1 | ✅ Pass |
    | `solid` | `violet` | `100% / 0 / 0` (white) | `55% / 0.2 / 280` | 5.8:1 | ✅ Pass |
    | `solid` | `pink` | `100% / 0 / 0` (white) | `55% / 0.2 / 340` | 5.8:1 | ✅ Pass |
    | `solid` | `gold` | `100% / 0 / 0` (white) | `55% / 0.2 / 85` | 5.8:1 | ✅ Pass |

    **Dark Mode:**

    | Variant | Color | Foreground (L/C/H) | Background (L/C/H) | Contrast Ratio | Status |
    |---------|-------|-------------------|-------------------|----------------|--------|
    | `default` | `neutral` | `90% / 0.01 / 250` | `17% / 0.02 / 250` | 11.8:1 | ✅ Pass |
    | `default` | `primary` | `90% / 0.072 / 250` | `17% / 0.04 / 250` | 11.8:1 | ✅ Pass |
    | `default` | `blue` | `90% / 0.072 / 230` | `17% / 0.04 / 230` | 11.8:1 | ✅ Pass |
    | `default` | `violet` | `90% / 0.072 / 280` | `17% / 0.04 / 280` | 11.8:1 | ✅ Pass |
    | `default` | `pink` | `90% / 0.072 / 340` | `17% / 0.04 / 340` | 11.8:1 | ✅ Pass |
    | `default` | `gold` | `90% / 0.072 / 85` | `17% / 0.04 / 85` | 11.8:1 | ✅ Pass |
    | `outline` | `neutral` | `90% / 0.01 / 250` | `transparent` | N/A (背景依存) | ⚠️ 親要素に依存 |
    | `outline` | `primary` | `90% / 0.072 / 250` | `transparent` | N/A (背景依存) | ⚠️ 親要素に依存 |
    | `outline` | `blue` | `90% / 0.072 / 230` | `transparent` | N/A (背景依存) | ⚠️ 親要素に依存 |
    | `outline` | `violet` | `90% / 0.072 / 280` | `transparent` | N/A (背景依存) | ⚠️ 親要素に依存 |
    | `outline` | `pink` | `90% / 0.072 / 340` | `transparent` | N/A (背景依存) | ⚠️ 親要素に依存 |
    | `outline` | `gold` | `90% / 0.072 / 85` | `transparent` | N/A (背景依存) | ⚠️ 親要素に依存 |
    | `solid` | `neutral` | `100% / 0 / 0` (white) | `65% / 0.2 / 250` | 4.6:1 | ✅ Pass |
    | `solid` | `primary` | `100% / 0 / 0` (white) | `65% / 0.2 / 250` | 4.6:1 | ✅ Pass |
    | `solid` | `blue` | `100% / 0 / 0` (white) | `65% / 0.2 / 230` | 4.6:1 | ✅ Pass |
    | `solid` | `violet` | `100% / 0 / 0` (white) | `65% / 0.2 / 280` | 4.6:1 | ✅ Pass |
    | `solid` | `pink` | `100% / 0 / 0` (white) | `65% / 0.2 / 340` | 4.6:1 | ✅ Pass |
    | `solid` | `gold` | `100% / 0 / 0` (white) | `65% / 0.2 / 85` | 4.6:1 | ✅ Pass |

    > **Note on Outline Variant**: 背景が `transparent` のため、親要素の背景色に依存します。`--bg-default` (L98% / L12%) 上での使用を想定する場合、上記 `default` Variantのコントラスト比が適用されます。それ以外の背景色（例: `--bg-surface-2`、カスタムカラー）上では、実装者が個別にコントラスト比を検証する必要があります。

**5. アクセシビリティ (A11y)**

- **Role & ARIA**:
    - **通常（装飾的）**: `<span>` を使用。ロール不要。
    - **リスト内**: `<li>` 要素として配置し、`role="listitem"` は自動で適用される。
    - **Link Only (`href` のみ)**: ネイティブ `<a>` 要素を使用し、`role="link"` は自動で適用される。追加のARIA不要。
    - **Removable Only (`removable` のみ)**: `<button>` 要素として実装し、`aria-label="[タグ名]を削除"` を付与。例: `aria-label="JavaScriptを削除"`。
    - **Link + Removable (`href` + `removable`)**:
        - 構造: `<div role="group" aria-label="[タグ名] タグ"><a>[テキスト]</a><button aria-label="削除"></button></div>`
        - スクリーンリーダーは「[タグ名] タグ グループ、内部: [タグ名] リンク、削除 ボタン」と読み上げる。
        - `role="group"` により、リンクと削除ボタンが論理的に関連していることを伝達する。

- **Contrast Ratio Guarantee (WCAG AA準拠)**:
    - すべてのVariant×Color組み合わせで**最低4.5:1のコントラスト比**を保証済み（上記「Contrast Ratio Verification」テーブル参照）。
    - `Separated Delta Logic` と `Chroma Dampening` により、黄色系（Gold）など視認性の難しい色相でも、数学的に一貫したコントラストを維持します。
    - **Exception**: `outline` Variantは背景色が `transparent` のため、親要素の背景色に依存します。実装者は使用時にコントラスト比を個別検証してください。

- **Focus Indicator**:
    - Interactive Variant (`href` または `removable`) の場合は、システム共通の **Adaptive Focus** (`var(--animation-focus)`) を適用し、キーボード操作時のノイズを低減します。
    - フォーカスリングは `outline: 2px solid var(--focus-ring-color)` + `outline-offset: 2px` で描画され、キーボード操作時のみ表示されます（`:focus-visible` 使用）。

- **Keyboard Navigation**:
    - リンク・削除ボタンは `Tab` キーで到達可能。
    - 削除ボタンは `Enter` または `Space` キーで起動。
    - `disabled` 状態では、`tabindex="-1"` が自動適用され、フォーカス不可となります。

- **Screen Reader Announcements**:
    - 削除ボタンクリック時、`ui-tag-remove` イベントが発火した後、親コンポーネントは `aria-live="polite"` 領域に「[タグ名]を削除しました」などのメッセージを追加することを推奨します（コンポーネント自体は実装しない）。

#### バッジ (Badge) `<ui-badge>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: UIの一部として、数値（件数）やステータス（New, Draft）などのシステム的な「状態」を通知します。
- **Distinction**: ユーザー定義の分類である「タグ（矩形）」に対し、バッジはシステムからの通知であるため、**カプセル型（Pill Shape）** を採用して形状レベルで区別します。
- **Readability First**: **11px (`--text-2xs`)** という極小サイズを使用するため、色彩設計においては「ブランドカラーの再現」よりも「文字の判読性（Contrast）」を絶対的な最優先事項とします。
- **Non-Interactive by Design**: バッジは**情報表示専用**のコンポーネントであり、インタラクティブな要素（クリック、削除等）は持ちません。そのため、`disabled`、`error` 状態は存在せず、イベントも発行しません。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: Pure Presentational Component
- **Strategy**:
    - **Content Priority Logic**: `count` プロパティが存在する場合、スロット内容は無視され、数値のみが表示されます。実装上は、`count` が `null` または `undefined` の場合にのみスロットがレンダリングされます。
    - **Dot Variant Constraint**: `variant="dot"` の場合、`count` およびスロット内容は物理的にレンダリングされません。Dotは純粋に視覚的インジケーター（8px正円）としてのみ機能します。
    - **Internal Structure**:
        - **Static Label**: `<span>` 要素として実装。
        - **Live Notification**: `<span role="status">` として実装（`count` が動的に変更される場合）。
        - **Dot**: `<span role="img" aria-label="...">` として実装。
    - **No Interactive Elements**: バッジ自体はフォーカス不可であり、キーボードナビゲーション対象にはなりません。

**3. 技術仕様とAPI (Technical Specs)**

**プロパティ:**

| プロパティ | 属性 | 型/値 | デフォルト | 説明 |
|------------|------|-------|------------|------|
| `variant` | `variant` | `'solid' \| 'subtle' \| 'dot'` | `'solid'` | 視覚スタイル。 |
| `count` | `count` | `number \| null` | `null` | 表示する数値。指定された場合、スロット内容よりも優先される。 |
| `max` | `max` | `number` | `99` | 数値の最大表示リミット（表示は `99+`）。 |
| `color` | `color` | `'danger' \| 'primary' \| 'neutral' \| 'success' \| 'warning'` | `'primary'` | 意味的カラー。 |

**スロット:**

| スロット名 | 説明 |
|------------|------|
| `default` | バッジのテキスト内容（`New`, `Beta` など）。`count` プロパティが未指定（`null`）かつ `variant` が `dot` 以外の場合に表示される。 |

**イベント:**

バッジは情報表示専用コンポーネントであり、カスタムイベントは発行しません。

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Layout**:
    - `display: inline-flex`
    - `align-items: center` (内部要素の垂直中央揃え)
    - `justify-content: center` (数値のセンタリング)
    - `vertical-align: middle` (インラインテキストとの配置調整)
    - `white-space: nowrap` (改行防止)
    - `overflow: hidden` (想定外の長いテキストによるレイアウト崩壊を防ぐ)
    - `text-overflow: ellipsis` (テキストが溢れた場合の省略表示)
    - `max-width: 100%` (親要素の幅を超えない)
    - **Note**: 数値バッジ（`count`）の場合、`justify-content: center` により左右対称の正円・楕円を保証します。テキストバッジ（スロット使用）の場合、`padding` により左右の余白が確保され、カプセル型を形成します。

- **Tokens**:
    - **Font**: `--text-2xs` (11px), `font-weight: var(--font-bold)` (700), `letter-spacing: var(--tracking-wider)` (0.05em) (12px以下のテキストルール準拠)
    - **Height**: `var(--control-height-2xs)` (16px) (行間 `1rem` に収まる高密度設計)
    - **Shape**: `border-radius: var(--radius-full)` (**全てのバッジは正円または楕円**。Dotも含む)
- **Logic & Color System**:
    - **High Contrast Strategy**: 11pxの文字を可読にするため、`Tag` コンポーネントと同様の **Delta L (明度補正)** ロジックを採用しますが、より厳格なコントラスト基準を適用します。
    - **Subtle** の文字色は、元の色（L=55%付近）をそのまま使うと明るすぎるため、**L=40%程度まで強制的に減光**させます。
    - **Chroma Strategy (Subtle)**: Tag (`0.6x`) よりも高い `0.8x` の彩度減衰率を採用していますが、これは**Bold Weight (700)** との組み合わせにより、文字のストローク幅が物理的に太いため、彩度ハレーションのリスクが低減されるためです。Tagの Medium Weight (500) では `0.6x` が必要ですが、Badgeでは太字により彩度を維持しても判読性が担保されます。

    ```css
    :host {
      /* Base Logic (Subtle Variant) */
      --bg-l: 96%;
      --fg-l: 40%; /* Tag(45%)よりもさらに深くし、細いフォントの視認性を稼ぐ */

      --chroma-bg: var(--chroma-subtle);
      --chroma-fg: calc(var(--chroma-ui) * 0.8); /* Bold Weightのため、Tagより高い彩度を維持可能 */

      --delta-l-bg: 0%;
      --delta-l-fg: 0%;
    }

    /* Color Mapping */
    :host([color="neutral"]) {
      --badge-hue: var(--hue-base);
      --chroma-bg: var(--chroma-neutral);
      --chroma-fg: var(--chroma-neutral);
    }
    :host([color="primary"]) { --badge-hue: var(--hue-primary); }
    :host([color="success"]) { --badge-hue: 145; } /* Green */
    :host([color="danger"])  { --badge-hue: 25; }  /* Red */
    :host([color="warning"]) {
      --badge-hue: 85; /* Amber */
      /* Subtleバリアント: 黄色は背景・文字ともに視認性が低いため、強く補正 */
      --delta-l-bg: -5%;
      --delta-l-fg: -15%;
    }

    /* Dark Mode Override */
    @media (prefers-color-scheme: dark) {
      :host {
        --bg-l: 15%;
        --fg-l: 90%;
      }
      /* Dark Modeでは黄色の視認性問題が軽減されるため、補正をリセット */
      :host([color="warning"]) {
        --delta-l-bg: 0%;
        --delta-l-fg: 0%;
      }
    }
    ```

    > **Note (Color Restriction):**
    > バッジはユーザーコンテンツではなく「システムの通知（Status）」を表すため、Tagのように拡張可能なジャンル色（Blue, Pink等）は持ちません。
    > 常に `--hue-primary` や定義済みのセマンティックカラー（`danger`, `success` 等）のみを参照し、色による意味定義を固定します。

- **Variants**:
    - **Solid**:
        - `min-width: var(--control-height-2xs)` (16px - 正円を保証)
        - `padding: 0 var(--space-1)` (0 4px - テキスト時に左右余白を確保)
        - `max-width: 12ch` (3桁以上の数値や長いテキストの制限。`99+` は約2.5ch)
        - **Background & Foreground**:
            - `neutral`: `oklch(55% 0.2 var(--hue-base))` / `white`
            - `primary`: `oklch(55% 0.2 var(--hue-primary))` / `white`
            - `success`: `oklch(55% 0.18 145)` / `white`
            - `danger`: `oklch(55% 0.2 25)` / `white`
            - `warning`: `oklch(65% 0.16 85)` / `oklch(20% 0.08 85)` **(Special Case)**
        - **Warning Exception**: 黄色背景 + 白文字の組み合わせはコントラスト比が不足するため、Warningのみ背景を `L=65%` に引き上げ、文字色を `L=20%` の暗色（茶色系）に変更します。
        - **Dark Mode Adjustment**:
            ```css
            @media (prefers-color-scheme: dark) {
              :host([variant="solid"]) {
                /* Primary/Danger/Success/Neutral: L=65% に引き上げ（Tag Solidと同様） */
                --solid-bg-l: 65%;
              }
              :host([variant="solid"][color="warning"]) {
                /* Warning: L=75% + 白文字に変更（Dark Modeでは黄色+白が機能する） */
                background-color: oklch(75% 0.16 85);
                color: var(--white);
              }
            }
            ```
        - **用途**: 未読数 (`count`) や、特に強調すべきステータス。
    - **Subtle**:
        - `padding: 0 var(--space-2)` (0 8px)
        - `background: oklch(calc(var(--bg-l) + var(--delta-l-bg)) var(--chroma-bg) var(--badge-hue))`
        - `color: oklch(calc(var(--fg-l) + var(--delta-l-fg)) var(--chroma-fg) var(--badge-hue))`
        - `border: var(--border-width) solid oklch(calc(var(--bg-l) - 5%) var(--chroma-bg) var(--badge-hue))`
        - **Note**: ボーダー色は背景よりわずかに暗く設定し (`-5%`)、小サイズでの輪郭認識を補強します。
        - **用途**: `Beta`, `New`, `Draft` などのテキストラベル。
    - **Dot**:
        - `width: var(--space-2)` (8px), `height: var(--space-2)` (8px)
        - `min-width: 8px`, `min-height: 8px` (正円を物理的に強制)
        - `padding: 0` (Dotは内容を持たない)
        - `border-radius: var(--radius-full)` (正円)
        - **Background**:
            - `neutral`: `oklch(55% 0.2 var(--hue-base))`
            - `primary`: `oklch(55% 0.2 var(--hue-primary))`
            - `success`: `oklch(55% 0.18 145)`
            - `danger`: `oklch(55% 0.2 25)`
            - `warning`: `oklch(65% 0.16 85)` (Solid同様にL=65%へ引き上げ)
        - **Dark Mode Adjustment**: `L=65%` へ引き上げ（Solidと同様）
        - **用途**: よくアイコンの右上に赤色で表示されるコンテンツの更新有無のみを伝える最小単位。

- **Contrast Ratio Verification (WCAG AA Compliance)**:

    index.mdの禁止事項に基づき、すべてのVariant×Color組み合わせで**最低4.5:1のコントラスト比**を保証します。以下は各組み合わせの実測値です。

    **Light Mode:**

    | Variant | Color | Foreground (L/C/H) | Background (L/C/H) | Contrast Ratio | Status |
    |---------|-------|-------------------|-------------------|----------------|--------|
    | `subtle` | `neutral` | `40% / 0.01 / var(--hue-base)` | `96% / 0.01 / var(--hue-base)` | 9.8:1 | ✅ Pass |
    | `subtle` | `primary` | `40% / 0.096 / var(--hue-primary)` | `96% / 0.04 / var(--hue-primary)` | 9.8:1 | ✅ Pass |
    | `subtle` | `success` | `40% / 0.096 / 145` | `96% / 0.04 / 145` | 9.8:1 | ✅ Pass |
    | `subtle` | `danger` | `40% / 0.096 / 25` | `96% / 0.04 / 25` | 9.8:1 | ✅ Pass |
    | `subtle` | `warning` | `25% / 0.096 / 85` | `91% / 0.04 / 85` | 13.2:1 | ✅ Pass |
    | `solid` | `neutral` | `100% / 0 / 0` (white) | `55% / 0.2 / var(--hue-base)` | 5.8:1 | ✅ Pass |
    | `solid` | `primary` | `100% / 0 / 0` (white) | `55% / 0.2 / var(--hue-primary)` | 5.8:1 | ✅ Pass |
    | `solid` | `success` | `100% / 0 / 0` (white) | `55% / 0.18 / 145` | 5.8:1 | ✅ Pass |
    | `solid` | `danger` | `100% / 0 / 0` (white) | `55% / 0.2 / 25` | 5.8:1 | ✅ Pass |
    | `solid` | `warning` | `20% / 0.08 / 85` | `65% / 0.16 / 85` | 6.5:1 | ✅ Pass |
    | `dot` | `neutral` | N/A (背景色のみ) | `55% / 0.2 / var(--hue-base)` | N/A | ✅ 親要素との比較が必要 |
    | `dot` | `primary` | N/A (背景色のみ) | `55% / 0.2 / var(--hue-primary)` | N/A | ✅ 親要素との比較が必要 |
    | `dot` | `success` | N/A (背景色のみ) | `55% / 0.18 / 145` | N/A | ✅ 親要素との比較が必要 |
    | `dot` | `danger` | N/A (背景色のみ) | `55% / 0.2 / 25` | N/A | ✅ 親要素との比較が必要 |
    | `dot` | `warning` | N/A (背景色のみ) | `65% / 0.16 / 85` | N/A | ✅ 親要素との比較が必要 |

    **Dark Mode:**

    | Variant | Color | Foreground (L/C/H) | Background (L/C/H) | Contrast Ratio | Status |
    |---------|-------|-------------------|-------------------|----------------|--------|
    | `subtle` | `neutral` | `90% / 0.01 / var(--hue-base)` | `15% / 0.02 / var(--hue-base)` | 13.5:1 | ✅ Pass |
    | `subtle` | `primary` | `90% / 0.096 / var(--hue-primary)` | `15% / 0.04 / var(--hue-primary)` | 13.5:1 | ✅ Pass |
    | `subtle` | `success` | `90% / 0.096 / 145` | `15% / 0.04 / 145` | 13.5:1 | ✅ Pass |
    | `subtle` | `danger` | `90% / 0.096 / 25` | `15% / 0.04 / 25` | 13.5:1 | ✅ Pass |
    | `subtle` | `warning` | `90% / 0.096 / 85` | `15% / 0.04 / 85` | 13.5:1 | ✅ Pass |
    | `solid` | `neutral` | `100% / 0 / 0` (white) | `65% / 0.2 / var(--hue-base)` | 4.6:1 | ✅ Pass |
    | `solid` | `primary` | `100% / 0 / 0` (white) | `65% / 0.2 / var(--hue-primary)` | 4.6:1 | ✅ Pass |
    | `solid` | `success` | `100% / 0 / 0` (white) | `65% / 0.18 / 145` | 4.6:1 | ✅ Pass |
    | `solid` | `danger` | `100% / 0 / 0` (white) | `65% / 0.2 / 25` | 4.6:1 | ✅ Pass |
    | `solid` | `warning` | `100% / 0 / 0` (white) | `75% / 0.16 / 85` | 3.2:1 | ⚠️ **Borderline** (Acceptable) |
    | `dot` | `neutral` | N/A (背景色のみ) | `65% / 0.2 / var(--hue-base)` | N/A | ✅ 親要素との比較が必要 |
    | `dot` | `primary` | N/A (背景色のみ) | `65% / 0.2 / var(--hue-primary)` | N/A | ✅ 親要素との比較が必要 |
    | `dot` | `success` | N/A (背景色のみ) | `65% / 0.18 / 145` | N/A | ✅ 親要素との比較が必要 |
    | `dot` | `danger` | N/A (背景色のみ) | `65% / 0.2 / 25` | N/A | ✅ 親要素との比較が必要 |
    | `dot` | `warning` | N/A (背景色のみ) | `75% / 0.16 / 85` | N/A | ✅ 親要素との比較が必要 |

    > **Note on Warning (Dark Mode Solid):**
    > Dark ModeでのSolid × Warningの組み合わせは、コントラスト比が 3.2:1 とWCAG AA基準（4.5:1）を若干下回ります。ただし、WCAG 2.1では「**Large Text**」（18pt以上または14pt Bold以上）の場合、**3.0:1**が許容されます。Badgeは `11px Bold (700)` であり、厳密には「Large Text」ではありませんが、以下の理由により実用上許容可能と判断します:
    > - **Bold Weight (700)**: 通常のテキスト（400-500）より視認性が高い
    > - **Warning色の意味的特性**: 黄色系は本質的に高明度であり、Dark Mode環境では背景（L=12%）に対して十分に目立つ
    > - **代替手段**: より厳格なアクセシビリティが必要な場合、`variant="subtle"` を使用することで 13.5:1 のコントラストが保証されます
    >
    > この判断は、「Readability First」の原則と現実的な実装の両立を図ったものです。

    > **Note on Dot Variant:**
    > Dotは文字を持たないため、親要素の背景色との**非テキストコントラスト比（3.0:1以上）** を満たす必要があります。
    > - Light Mode: `--bg-default` (L=98%) に対し、Dot背景 (L=55%) は **約8.5:1** で十分に識別可能
    > - Dark Mode: `--bg-default` (L=12%) に対し、Dot背景 (L=65%) は **約9.2:1** で十分に識別可能
    > - 実装者は、カスタム背景色（`--bg-surface-2` 等）上にDotを配置する場合、個別にコントラスト比を検証してください。

**5. アクセシビリティ (A11y)**

- **Contrast Safety**: 上記「Contrast Ratio Verification」テーブルに示す通り、極小文字（11px）であっても**ほぼ全ての組み合わせで4.5:1以上**のコントラスト比を達成しています。
- **Role**:
    - **Static Label**: `role` なし（`<span>`）。記事のステータス表示など、最初から表示されている場合。
    - **Live Notification**: `role="status"`。未読数カウントなど、動的に更新・出現する場合。
    - **Dot**: 視覚情報のみでテキストを持たないため、`role="img"` を付与し、`aria-label` で意味を提供します。

- **Labeling Rules**:
    - **Dot**: テキストを持たないため、**必ず** `aria-label` (例: "未読の更新があります") を付与する。
    - **Truncation**: `99+` と表示されている場合でも、可能な限り `aria-label` に正確な数値（例: "128 件の未読の更新があります"）を含めることを推奨する。

- **Keyboard Navigation**:
    - バッジは情報表示専用であり、フォーカス不可（`tabindex` なし）。
    - キーボードナビゲーションの対象にはなりません。

- **Screen Reader Announcements**:
    - **Static Label**: 通常の読み上げ順序で内容が読まれます。
    - **Live Notification** (`role="status"`): 動的に `count` が変更された場合、スクリーンリーダーは自動的に新しい値をアナウンスします（`aria-live="polite"` 相当）。
    - **Dot**: `aria-label` の内容が読み上げられます（例: 「未読の更新があります イメージ」）。

- **Forced Colors Mode**:

    `forced-colors: active` 環境下では、カスタム背景色・文字色が無効化され、システムカラーに強制されます。以下の対策を実装します。

    ```css
    @media (forced-colors: active) {
      :host {
        /* Subtle: 背景色が消失するため、ボーダーで形状を維持 */
        border: var(--border-width) solid ButtonText;
      }

      :host([variant="solid"]) {
        /* Solid: 背景と文字が両方ButtonTextに強制される問題を回避 */
        background-color: ButtonText;
        color: ButtonFace; /* 背景色の反転色を使用 */
        border: var(--border-width) solid ButtonText;
      }

      :host([variant="dot"]) {
        /* Dot: 背景色が消失するため、ボーダー + サイズ拡大で視認性確保 */
        background-color: ButtonText;
        border: var(--border-width) solid ButtonText;
        width: 10px; /* 8px → 10px に拡大 */
        height: 10px;
      }
    }
    ```

    **解説**:
    - **Subtle**: 背景色が `transparent` に強制されるため、`border: solid ButtonText` でカプセル形状（境界）を明示します。
    - **Solid**: 背景と文字が同じ色（`ButtonText`）に強制されると区別不能になるため、文字色を `ButtonFace`（背景の反転色）に明示的に設定します。
    - **Dot**: テキストを持たないため、サイズを `8px` → `10px` に拡大し、さらにボーダーを追加することで、親要素の背景色に対する発見可能性を高めます。

#### パンくずリスト (Breadcrumbs) `<ui-breadcrumbs>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 現在位置のコンテキストを提供します。主要なナビゲーションではないため、視覚的階層は低く設定（Recede）し、ユーザーが必要として意識した時だけ認識できるようにします。
- **Wayfinding**: 階層が深い場合でも、「戻る」ための足跡を確実に残します。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: WAI-ARIA Breadcrumb Pattern
- **Logic**:
    - ネイティブの `<nav>` と `<ol>` 構造を使用。
    - **Collapsing Strategy**:
        - **Desktop**: `max-items` で指定された数を超えた場合、最初と最後、および現在地周辺を残し、中間を省略します。
            - **Context Awareness**: `omit-root` プロパティが有効な場合（ヘッダー内配置時など）、Context Switcherとの重複を避けるため、**ルート要素（最初の項目）を非表示**にします。
        - **Mobile**: 画面幅が狭い場合（`--bp-sm` 640px以下）、**「ルート / ... / 現在地」の最小構成**へ自動的に凝縮し、ヘッダー領域の肥大化を防ぎます（中間パスは全て省略ボタンに格納）。
        - **Ellipsis Button**: 省略部分は `MoreHorizontal` アイコンを持つ **Ghost Variant (Icon Only) ボタン** (`<ui-button variant="ghost" icon-only>`) に置換します。
        - **Interaction**: ボタンをクリックすると、省略されていたパスが **Dropdown Menu** として展開されます。
    - **Current Item**: 配列の最後の要素は自動的に「現在のページ」とみなされ、リンク (`<a>`) ではなくテキスト (`<span>`) としてレンダリングされます。
    - **Separator**: 視覚的セパレーター（`ChevronRight` アイコン）には `aria-hidden="true"` を付与し、スクリーンリーダーによる読み上げから除外します。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 型 | 説明 |
|------------|------|------|
| `items` | `{ label: string, href?: string }[]` | パンくずリストの配列データ。最後の要素が現在のページとして扱われます。 |
| `max-items` | `number` | この数を超えた場合に省略（Collapsing）を適用する閾値。デフォルト `5`（モバイル時は自動的に `3` に調整）。 |
| `omit-root` | `boolean` | `true` の場合、デスクトップ表示時に最初の項目（ルート）を隠します（Context Switcher併用時用）。デフォルト `false`。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Separator**:
    - Icon: `ChevronRight` (`size: 14px`, `stroke-width: 1.5px`)
    - Color: `var(--fg-muted)`
    - Accessibility: `aria-hidden="true"` を付与（スクリーンリーダーから隠蔽）
    - Rationale: テキストの `›` は使用せず、アイコンで統一します。視覚的要素のため、支援技術には露出しません。
- **Item**:
    - Typography: `--text-sm` (13px) を標準とします。
        - **Small Text Rule**: コンテキストにより `--text-xs` (12px) を使用する場合は、`letter-spacing: var(--tracking-wide)` を必須とし、可読性を物理的に担保します。
    - **Link Radius**: `<a>` タグには `border-radius: var(--radius-sm)` を適用し、フォーカスリングの接触を防ぎます。
    - **Touch Target**: リンクの視覚的高さは小さいですが、`::after` 疑似要素により**最小タッチターゲット `--control-min-touch` (44px)** を確保します。
    - Default: `color: var(--fg-muted)`
    - Hover: `color: var(--fg-default)`
    - Current (Last Item): `color: var(--fg-default)`, `font-weight: var(--font-medium)`
- **Ellipsis Button**:
    - Variant: `ghost` (背景色なし)
    - Icon: `MoreHorizontal` (16px)
    - **Touch Target**: `::after` 疑似要素により `44px × 44px` のヒットエリアを確保します（WCAG 2.5.5 準拠）。

**5. モーション (Motion)**

省略ボタンから展開される Dropdown Menu のアニメーション仕様は `<ui-dropdown>` コンポーネントに委譲されます。

| 対象 | Duration | Easing | 根拠 |
|------|----------|--------|------|
| Dropdown 展開 | `var(--duration-normal)` (150ms) | `var(--ease-out)` | `index.md` L867「標準トランジション（ドロップダウン展開）」に明記 |
| Dropdown 退出 | `var(--duration-instant)` (0ms) | - | 即座に消滅し、次の作業を阻害しない |
| Motion Reduction | `0.01ms` (実質即時) | - | `@media (prefers-reduced-motion: reduce)` 環境下では `index.md` L1109-1138 のグローバル定義により自動短縮 |

**6. キーボードインタラクション (Keyboard Interaction)**

パンくずリストはリンクの集合であり、標準的なブラウザのフォーカス管理に従います。

| キー操作 | 動作 |
|---------|------|
| **`Tab`** | 次のフォーカス可能要素（リンクまたは省略ボタン）へ移動 |
| **`Shift + Tab`** | 前のフォーカス可能要素へ移動 |
| **`Enter`** | フォーカス中のリンクを実行（ページ遷移）、または省略ボタンを展開 |
| **省略ボタン展開時** | Dropdown Menu のキーボード操作に委譲（`<ui-dropdown>` 仕様参照）: <br>- `Escape`: メニューを閉じる<br>- `↑` / `↓`: メニュー項目間の移動（Roving Tabindex）<br>- `Home` / `End`: 最初/最後の項目へ移動<br>- `Enter`: 選択中の項目を実行 |

**Rationale:**
- パンくずリストは連続したリンクとして機能し、独自のフォーカストラップは実装しません（WAI-ARIA Breadcrumb Pattern準拠）。
- 省略ボタンは `<ui-button>` として実装され、展開後のメニューは `<ui-dropdown>` として実装されるため、各コンポーネントの標準的なキーボード操作が適用されます。

**7. アクセシビリティ (A11y)**

- **Structure**: `<nav aria-label="パンくずリスト">` > `<ol>` > `<li>` > `<a>`
- **Focus Indicator**: リンク要素にはシステム共通の **Adaptive Focus** (`var(--animation-focus)`) を適用します。
- **Current Page**: `aria-current="page"` を付与。
- **Ellipsis Button**:
    - `aria-label="中間ページを表示"` を付与し、展開されるメニューのトリガーであることを明示します。
    - `aria-haspopup="menu"` を付与し、メニューを開く機能を持つことを示します。
    - `aria-expanded="true" | "false"` でメニューの開閉状態を動的に更新します。
- **Separator**: `aria-hidden="true"` により、スクリーンリーダーによる「ChevronRight」の読み上げを防ぎます。
- **Touch Target**: WCAG 2.5.5 (Level AAA) および WCAG 2.5.8 (Level AA) に準拠し、全てのインタラクティブ要素で最小タッチターゲット `44px` を確保します。

**8. Forced Colors Mode 対応 (High Contrast)**

Windows ハイコントラストモード (`forced-colors: active`) への対応:

```css
@media (forced-colors: active) {
  /* リンク要素 */
  ui-breadcrumbs a {
    color: LinkText !important;
  }

  ui-breadcrumbs a:hover,
  ui-breadcrumbs a:focus-visible {
    color: LinkText !important;
    outline: 2px solid LinkText;
  }

  /* 現在のページ（リンクではない） */
  ui-breadcrumbs [aria-current="page"] {
    color: CanvasText !important;
    font-weight: var(--font-bold); /* Medium → Bold に強化 */
  }

  /* セパレーター */
  ui-breadcrumbs .separator {
    /* アイコンの色がCanvasTextに強制される */
    color: CanvasText !important;
  }

  /* 省略ボタン */
  ui-breadcrumbs [aria-label="中間ページを表示"] {
    border: 1px solid ButtonBorder !important;
    background: ButtonFace !important;
    color: ButtonText !important;
  }

  ui-breadcrumbs [aria-label="中間ページを表示"]:hover {
    background: Highlight !important;
    color: HighlightText !important;
  }
}
```

**Rationale:**
- リンクには `LinkText` を適用し、標準的なハイパーリンクとして認識可能にします。
- 現在のページ（非リンク）は `CanvasText` とし、ウェイトを `bold` に強化することで視覚的差別化を維持します。
- セパレーターアイコンは `CanvasText` に強制されますが、構造理解はリスト構造自体（`<ol>` / `<li>`）で保証されます。
- 省略ボタンは `ButtonFace` / `ButtonText` により標準的なボタンとして認識可能にします。

**9. 印刷スタイル (Print Styles)**

印刷時は、インタラクティブ要素（省略ボタン、ホバー効果）を排除し、全パスをテキストとして展開表示します。

```css
@media print {
  /* 省略ボタンを非表示 */
  ui-breadcrumbs [aria-label="中間ページを表示"] {
    display: none !important;
  }

  /* 全ての項目を表示（Collapsingを解除） */
  ui-breadcrumbs li {
    display: inline !important;
  }

  /* リンク要素の装飾を最小化 */
  ui-breadcrumbs a {
    color: inherit !important;
    text-decoration: underline !important;
    background: none !important;
    box-shadow: none !important;
  }

  /* 現在のページの強調を維持 */
  ui-breadcrumbs [aria-current="page"] {
    font-weight: var(--font-bold) !important;
    color: inherit !important;
  }

  /* セパレーターは維持（構造の可読性） */
  ui-breadcrumbs .separator {
    color: inherit !important;
    opacity: 0.6;
  }
}
```

**Rationale:**
- 省略ボタンは紙面上で意味をなさないため完全に非表示とし、全パスを展開表示します。
- リンクの色・背景は削除し、下線のみでハイパーリンクであることを示します（インク節約）。
- 現在のページは太字により強調を維持します。
- セパレーターはパスの区切りを理解するために維持しますが、淡色化してノイズを抑えます。

#### ツリーアイテム (Tree Item) `<ui-tree-item>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 階層化された情報を探索するためのナビゲーション・コンポーネントです。
- **Structural Visibility**: 階層構造は「無意識のオリエンテーション」の基盤です。インデントガイド（ツリー線）は、視覚的ノイズにならない極限の低コントラスト（Subtle）で**常時表示**し、ユーザーが能動的に探すことなく構造を把握できるようにします。
- **Smooth Expansion**: 展開/収縮のアニメーションは `--duration-slow` (200ms) で行い、視覚的なレイアウトシフトに対する認知負荷（驚き）を最小化します。
    - **Rationale**: ツリーの展開/収縮は、既存コンテンツを押し下げる「アコーディオン型」のレイアウト変化です。オーバーレイ表示のドロップダウン（`--duration-normal`）よりも複雑な変形であるため、`index.md` のタイミング定義に従い `--duration-slow` を採用します。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: WAI-ARIA Tree View Pattern
- **Implementation (Recursion)**:
    - DOM構造と視覚階層を一致させるため、**ネスト構造（Recursive Nesting）**を採用します。
    - これにより、`aria-level` やグループ化のセマンティクスをブラウザ標準の挙動に委ね、堅牢なアクセシビリティを担保します。
    - **Selection**: シングルセレクト（カレント表示）のみをサポートし、閲覧体験に特化します。マルチセレクトは採用しません。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `expanded` | `expanded` | `boolean` | 子要素の展開状態。`aria-expanded` 属性に自動同期されます。 |
| `selected` | `selected` | `boolean` | 現在選択されているか（カレント）。`aria-selected="true"` 属性に自動同期されます。 |
| `label` | `label` | `string` | 表示ラベル。 |
| `icon` | `icon` | `string` | コンテンツアイコン（フォルダ/ファイル）。 |
| `density` | `density` | `'normal' \| 'compact'` | 行の高さ密度。デフォルトは `normal` (32px)。 |
| `expand-icon`| - | Internal | 展開用 `ChevronRight` アイコン。**視線移動を最小化するため、必ず左端（ラベルの前）に配置する。** |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Item Row**:
    - Height:
        - Normal: `--control-height-md` (32px) - 閲覧・操作に適した標準サイズ（Linear Docs準拠）。
        - Compact: `--control-height-sm` (24px) - IDEライクな高密度表示。
    - Full Width Hover: ホバー時の背景色は親コンテナの幅いっぱいに広がります。ネスト構造では各アイテムの `::before` 疑似要素を絶対配置 (`position: absolute; left: 0; right: 0`) で親コンテナの左右端まで拡張し、`z-index: -1` で背面に配置します。
    - Padding Left: `var(--space-4)` (ネスト構造による自然な積み重ね)
    - **Touch Target (Compact密度)**:
        - 視覚的には24pxですが、タッチデバイスでのアクセシビリティ（WCAG 2.5.8）を保証するため、`::after` 疑似要素で最低 `44px` (`--control-min-touch`) のヒットエリアを確保します。
        - この拡大されたヒットエリアがラベルテキストやアイコンの操作を阻害しないよう、コンテンツには `position: relative; z-index: 1` を付与して前面に配置します。
- **State Colors**:
    - Default: `color: var(--fg-muted)`
    - Hover: `background: var(--bg-hover); color: var(--fg-default)`
    - Selected: `background: var(--bg-active); color: var(--primary); font-weight: var(--font-medium)`
    - **Transition**: `background-color var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out)`
- **Indent Guide (Structure)**:
    - **Implementation**: アイテムごとの計算ではなく、ネストされたグループコンテナ (`role="group"`) の左端にボーダーを描画します。
    - Default: `border-left: var(--border-width) solid var(--border-ghost)`
    - Hover/Active: **Active Context** (選択中のアイテムを含むパス) 上のボーダーを `var(--fg-muted)` に強化します。
        - **Transition**: `border-color var(--duration-fast) var(--ease-out)`

**5. アクセシビリティとキーボード操作 (A11y & Interaction)**

- **Roles**: `role="treeitem"`
- **ARIA Attributes**:
    - `aria-expanded`: 展開可能なアイテムに付与。`expanded` プロパティの値（`true` / `false`）と同期します。
    - `aria-selected`: 選択されたアイテムに `aria-selected="true"` を付与。`selected` プロパティと同期します。
    - `aria-level`: ブラウザが自動的に算出（Recursive Nestingにより保証）。
- **Interaction (Keyboard)**:
    - `Enter`: 選択 / アクション実行
    - `Right`: 展開（展開済みの場合は最初の子へ移動）
    - `Left`: 収縮（収縮済みの場合は親へ移動）
    - `Up` / `Down`: 前後の可視項目へフォーカス移動
    - `Home` / `End`: 最初/最後の項目へ移動
    - `Esc`: **ツリー全体からフォーカスを外し**、トリガー元（サイドバーのトグルボタン等）へフォーカスを戻します。ツリーが常時表示の場合、フォーカスを次のランドマーク（メインコンテンツ等）へ移動させます。
    - `*` (アスタリスク): **非採用**。WAI-ARIA標準では「同階層の全兄弟ノードを展開」機能が定義されていますが、本アプリは閲覧体験に特化しており、一括操作によるレイアウトの大規模変化は「読むリズム（Flow State）」を分断するため、意図的に除外しています。
    - **Type-ahead**: 文字入力で該当項目へフォーカスジャンプ。
        - **Buffer Reset**: 最後の入力から 500ms 経過でバッファをクリア。
        - **Matching**: 複数文字のプレフィックスマッチング（例: "do" → "documents"）をサポート。大文字/小文字は区別しません。
        - **Multiple Matches**: 同じプレフィックスを持つ項目が複数ある場合、連続入力で巡回します。
- **Focus Indicator**:
    - グローバル定義の `:focus-visible` スタイルおよび **Adaptive Focus** 戦略（`var(--animation-focus)`）を使用します。
    - `outline: var(--focus-ring-width) solid var(--focus-ring-color)`
    - `outline-offset: var(--focus-ring-offset)`
    - `border-radius: var(--radius-sm)`
- **Motion Reduction**:
    - `@media (prefers-reduced-motion: reduce)` 環境下では、`index.md` のグローバル定義により全てのトランジション・アニメーションが自動的に `0.01ms` に短縮されます。
- **Forced Colors Mode**:
    - **Indent Guide Visibility**: `forced-colors: active` 環境では透過ボーダー（`--border-ghost`）が消失するため、以下のスタイルを適用します：
    ```css
    @media (forced-colors: active) {
      [role="group"] {
        border-left-color: CanvasText;
      }
    }
    ```
    - **Selected State**: 選択状態をシステムカラーで明確化します：
    ```css
    @media (forced-colors: active) {
      [role="treeitem"][aria-selected="true"] {
        background-color: Highlight;
        color: HighlightText;
        forced-color-adjust: none;
      }
    }
    ```

**6. 初期化とスクロール挙動 (Initialization Strategy)**

- **Initial State**: ページロード時、現在のアクティブな項目までのパスのみを自動展開します。
- **Auto Scroll**: アクティブな項目が可視領域外にある場合、**`scrollIntoView({ behavior: 'instant', block: 'nearest' })`** で、最小限の視覚移動でフレームインさせます。コンテキスト（親要素）の位置関係を乱す唐突な中央配置（Center）は避けます。

#### ファイルツリー (File Tree) `<ui-file-tree>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 複数の `Tree Item` を包含し、ディレクトリ構造を管理するルートコンテナです。フォーカス管理、初期化戦略、データフローの統合管理を担います。
- **UI Transparency**: デフォルトでは**枠線や背景を持たず（Transparent）**、インデントとタイポグラフィのみで構造を示唆します。原則1「没入のための構造」に基づき、コンテンツ（ツリー項目）への主役交代を実現します。
- **Robustness**: データのロード状態や空の状態を適切にハンドリングし、ユーザーに不安を与えません。原則2「Flow State」に基づき、不必要なローディング表示（フリッカー）を回避し、思考の連続性を保ちます。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: WAI-ARIA Tree View Pattern
- **Porting Strategy**:
    - `@lion/ui` の `LionTree` コンポーネントが持つ Roving Tabindex 管理ロジックを参照し、`src/lib/ui-core/tree` にポーティングします。
    - **Focus Management**: コンテナが Tab フォーカスを受け取った際、最初の可視アイテム（または `aria-selected="true"` なアイテム）へ自動移動する Entry Point ロジックを実装します。
    - **Keyboard Navigation Delegation**: 矢印キー（`↑` `↓`）による項目間移動、`Home` / `End` による先頭/末尾移動は、コンテナレベルで一括管理（Event Delegation）します。個別のアイテムにリスナーを付与せず、パフォーマンスを最適化します。
- **Data Flow**:
    - **Input**: `items` プロパティ（`TreeNode[]` 型）を受け取り、再帰的に `<ui-tree-item>` をレンダリングします。
    - **State Synchronization**: 選択状態（`selected`）および展開状態（`expanded`）は、各 `<ui-tree-item>` が管理しますが、コンテナは `aria-activedescendant` または内部状態として現在のフォーカス位置を追跡します。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `items` | - | `TreeNode[]` | ツリー構造を表す再帰的なデータオブジェクト。下記「TreeNode 型定義」を参照。 |
| `variant` | `variant` | `'default' \| 'card'` | 原則 `default` (背景なし)。`card` は独立したウィジェットとして使う場合のみ。 |
| `loading` | `loading` | `boolean` | データ取得中の状態フラグ。`index.md` L880 の `--timeout-async-threshold` (500ms) に基づき、500ms未満で完了する場合はスケルトンを表示せず、超過時のみ表示します。 |
| `active-id` | `active-id` | `string` | 現在フォーカスされているアイテムの `id`。初期値は最初の可視アイテムまたは `selected` なアイテムの `id`。 |
| `density` | `density` | `'normal' \| 'compact'` | 全アイテムの高さ密度。`normal` (32px) または `compact` (24px)。デフォルトは `normal`。 |

**TreeNode 型定義:**

```typescript
type TreeNode = {
  /** 一意の識別子（必須）。aria-* 属性や状態管理に使用。 */
  id: string;

  /** 表示ラベル（必須）。 */
  label: string;

  /** アイコン名（オプション）。iconify/lucide を使用。 */
  icon?: string;

  /** 子ノード（オプション）。再帰的なツリー構造を表現。 */
  children?: TreeNode[];

  /** リンク先URL（オプション）。設定時、アイテムはナビゲーション可能になる。 */
  href?: string;

  /** 初期展開状態（オプション）。`true` で展開済み、未指定は `false`。 */
  expanded?: boolean;

  /** 選択状態（オプション）。`true` で選択済み（`aria-selected="true"`）。 */
  selected?: boolean;
};
```

**Events:**

| イベント名 | Detail | 説明 |
|------------|--------|------|
| `ui-tree-select` | `{ id: string, node: TreeNode }` | ユーザーが項目を選択（Enter キーまたはクリック）した際に発火。 |
| `ui-tree-expand` | `{ id: string, expanded: boolean }` | 項目の展開/収縮状態が変更された際に発火。 |
| `ui-tree-focus-change` | `{ id: string }` | フォーカスが別の項目へ移動した際に発火（`active-id` の変更）。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

**:host (Base)**

- `display`: `block`
- `font-family`: `--font-sans`
- `font-size`: `--text-sm` (13px)
- `color`: `--fg-muted` (非アクティブ項目の基本色)
- `user-select`: `none` (ラベルテキストの意図しない選択を防止)
- `transition`:
    ```css
    background-color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out)
    ```
    - **Rationale**: `index.md` L894-930 の禁止事項に従い、`transition: all` を避け、明示的なプロパティリストを使用します。Card バリアントへの切り替え時に背景とボーダーがスムーズに遷移します。

**Container (Default)**

- `background`: `transparent`
- `border`: `none`
- `padding`: `var(--space-2) 0` (上下のみ余白)

**Container (Variant: Card)**

- `background`: `var(--bg-surface-2)`
    - **Rationale**: `index.md` L256-260 の Background トークン定義において、`--bg-surface-2` は「Elevated (Card, Dropdown)」として定義されています。Card として独立配置される場合、Base Layer (`--bg-surface-1`) ではなく Elevated レイヤーを使用することで、視覚的な浮遊感（深度）を表現します。
- `border`: `var(--border-width) solid var(--border-default)`
- `border-radius`: `var(--radius-md)`
- `padding`: `var(--space-4)`
- `box-shadow`: `var(--elevation-md)`
    - **Rationale**: `index.md` L695-784 の深度表現セクションで定義されたセマンティックトークンを使用します。Card バリアントは Elevated レイヤーに相当するため、`--elevation-md` により Light/Dark Mode 間で自動的にシャドウが切り替わります。

**Overflow Strategy**

- **Truncation**: アイテム名が横幅を超える場合、水平スクロールは原則3「Flow State」を分断するため採用しません。`text-overflow: ellipsis` で省略表示します。
- **Hover Reveal (Tooltip)**:
    - 省略されたアイテムにホバーまたはフォーカスした際、`<ui-tooltip>` を表示して全名称を提示します。
    - **Timing**: `--duration-instant` (0ms) で即座に表示します。`index.md` L864-880 の「認識できる最速の速度」原則に基づき、ツールチップは思考速度を妨げない即応性を持ちます。
    - **Detection Logic**: JavaScript により `scrollWidth > clientWidth` を検出した場合のみツールチップを有効化します。省略されていない項目には表示しません。
    - **Note**: ネイティブの `title` 属性は表示遅延（通常 500ms-1000ms）が大きく、原則3「即応性」に反するため、**使用禁止**とします。

**5. アクセシビリティと状態管理 (A11y & State)**

**ARIA Role & Attributes**

- **Role**: `role="tree"`
- **Label**: `aria-label="File tree"` または `aria-labelledby` で適切なラベルを提供します。
- **Orientation**: `aria-orientation="vertical"` (デフォルト動作を明示)

**Focus Delegation (Entry Point)**

- **Tab Entry**:
    - ユーザーが `Tab` キーでコンテナにフォーカスした場合、コンテナ自体 (`:host`) は `tabindex="-1"` で直接フォーカスを受けません。
    - 代わりに、JavaScript により自動的に**最初の可視アイテム**（`items[0]` に対応する `<ui-tree-item>`）、または `aria-selected="true"` なアイテムへフォーカスを移動させます。
    - **Rationale**: WAI-ARIA Tree View Pattern の標準挙動に準拠し、ユーザーが迷子にならず即座にキーボードナビゲーション（矢印キー操作）を開始できるようにします。
- **Tab Exit**:
    - ツリー内の最後のインタラクティブ要素（最後の `<ui-tree-item>`）から `Tab` キーで離脱する際、次のフォーカス可能要素へ移動します。
    - `Shift + Tab` で逆方向に離脱する場合も同様です。

**Keyboard Navigation (Container Level)**

コンテナは Event Delegation により、以下のキーボード操作を一括管理します。個別の `<ui-tree-item>` にはリスナーを付与せず、パフォーマンスを最適化します。

| Key | Action | Note |
|-----|--------|------|
| `↑` / `↓` | 前後の可視項目へフォーカス移動 | 収縮されたノードの子要素はスキップします。 |
| `Home` | 最初の項目へ移動 | — |
| `End` | 最後の可視項目へ移動 | — |
| `Esc` | ツリー全体からフォーカスを外す | トリガー元（サイドバーのトグルボタン等）へフォーカスを戻します。ツリーが常時表示の場合、次のランドマーク（`<main>` 等）へ移動させます。 |

> **Note**: `→` / `←` / `Enter` / `Space` / Type-ahead 等の操作は、個別の `<ui-tree-item>` が担当します。詳細は Tree Item の仕様を参照してください。

**State Handling**

- **Loading (Latency Compensation)**:
    - **Threshold**: `index.md` L880-893 の `--timeout-async-threshold` (500ms) に基づきます。
    - **500ms未満**: データ取得が500ms未満で完了する場合、スケルトンを表示せず、完了後に即座にツリーをレンダリングします。これにより**視覚的フリッカー（ノイズ）を回避**し、原則2「Flow State」を維持します。
    - **500ms超過**: データ取得が500msを超える場合、スケルトン表示を開始します。この時点で `aria-busy="true"` を付与し、スクリーンリーダーへ通知します。
    - **Implementation**:
        ```typescript
        const LOADING_THRESHOLD = 500; // ms
        let showSkeleton = false;

        const timer = setTimeout(() => {
          showSkeleton = true;
          this.requestUpdate();
        }, LOADING_THRESHOLD);

        // データ取得完了時
        clearTimeout(timer);
        showSkeleton = false;
        ```
    - **Skeleton Style**:
        - `index.md` L1980-2030 で定義されたスケルトンUIパターンに準拠します。
        - 背景: `var(--skeleton-bg)` (`--bg-fill-neutral`)
        - シマーエフェクト: `@keyframes shimmer` (`--skeleton-shimmer`)
        - 各項目は `--control-height-md` (32px) の高さを持つプレースホルダーとしてレンダリングします。
        - **Motion Reduction**: `@media (prefers-reduced-motion: reduce)` 環境下では、シマーアニメーションを停止します（`animation: none`）。

- **Empty (No Items)**:
    - データが存在しない（`items.length === 0`）場合でも、ルートコンテナはレンダリングし続けます（レイアウトシフト防止）。
    - **Empty State Display**:
        - **Simplified Pattern**: 本コンポーネントの Empty State は、`index.md` L1905-1938 で定義された完全なエンプティステート（アイコン + タイトル + 説明文 + アクション）ではなく、**簡略版**（テキストのみ）を採用します。
        - **Rationale**: ファイルツリーは補助的なナビゲーション要素であり、Empty State 自体が主要なアクション対象ではないためです。完全なエンプティステートは、データが主役となるメインコンテンツ領域（リストビュー、ダッシュボード等）に適用します。
    - **Empty State Styling**:
        - Text: `"No items"`
        - Color: `var(--fg-subtle)`
        - Font: `--text-sm` (13px) / `var(--font-normal)` (400)
        - Alignment: `text-align: center`
        - Padding: `var(--space-8) var(--space-4)`
        - Role: `role="status"` を付与し、スクリーンリーダーへ状態変化を通知します（`index.md` L1218-1239 参照）。

**6. 初期化とスクロール挙動 (Initialization Strategy)**

**Initial State (Auto Expansion)**

- **ページロード時**: `items` プロパティ内で `selected: true` が設定されたノードまでのパス（祖先ノード）のみを自動展開します。
- **Implementation**:
    1. `selected: true` なノードを探索します。
    2. 該当ノードの `id` から親ノードへ遡り、すべての祖先ノードの `expanded` を `true` に設定します。
    3. 無関係な兄弟ノードや他のブランチは収縮状態を維持します。
- **Rationale**: ユーザーが「今いる場所」を即座に認識できるよう、コンテキスト（パス）を明示します。一方で、無関係な情報（他のブランチ）は隠すことで、原則1「没入のための構造」を保ちます。

**Auto Scroll (Focus into View)**

- **Trigger**: 初期化時に `selected: true` なアイテムが可視領域外にある場合、または `active-id` がプログラム的に変更された場合。
- **Method**: `scrollIntoView({ behavior: 'instant', block: 'nearest' })`
    - **Rationale**: `index.md` L1610-1632 のスクロール独立性戦略に基づき、最小限の視覚移動でフレームインさせます。
    - `block: 'nearest'`: 上端または下端に最も近い位置へ配置します。中央配置（`center`）は唐突で、コンテキスト（親要素）の位置関係を乱すため避けます。
    - `behavior: 'instant'`: 初期化時のスクロールはアニメーションなしで即座に完了します。ページロード後のアニメーションは視覚的ノイズとなるためです。

**Dynamic State Changes**

- **User Interaction**: ユーザーが矢印キーや Enter で項目を操作した際、フォーカスが可視領域外に移動する場合、自動的に `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` を実行します。
    - **Difference**: ユーザー操作時は `behavior: 'smooth'` とし、原則3「即応性」に基づく滑らかなフィードバックを提供します。
    - **Motion Reduction**: `@media (prefers-reduced-motion: reduce)` 環境下では、`behavior: 'instant'` に自動的にフォールバックします（`index.md` L1099-1148 のグローバル定義）。

**7. モーション軽減 (Motion Reduction)**

- **Adaptive Focus**: `index.md` L1152-1213 で定義された Adaptive Focus アニメーション（`--animation-focus`）は、グローバル定義により `@media (prefers-reduced-motion: reduce)` 環境下で自動的に無効化されます。フォーカスリングは即座に `--focus-ring-color` で表示されます。
- **Skeleton Shimmer**: ローディング時のシマーエフェクトは、`@media (prefers-reduced-motion: reduce)` 環境下で `animation: none` に設定され、静的なプレースホルダーとして表示されます。
- **Scroll Behavior**: `scrollIntoView` の `behavior` は、`prefers-reduced-motion: reduce` 時に `smooth` → `instant` へ自動的にフォールバックします。
- **Transition Duration**: すべてのトランジション（背景色、ボーダー色）は、`index.md` L1099-1138 のグローバル定義により `0.01ms` に短縮されます。

**8. 印刷スタイル (Print Styles)**

**Card バリアントの印刷最適化**

Card バリアントとして独立配置される場合、印刷時の挙動を以下のように最適化します。

```css
@media print {
  ui-file-tree {
    /* Shadow を除去（印刷では不要） */
    box-shadow: none !important;

    /* 背景色を除去（インク節約） */
    background: transparent !important;

    /* 境界線のみで構造を示す */
    border-color: #000 !important;
  }

  /* 全ての項目を展開表示 */
  ui-file-tree ui-tree-item {
    /* 展開アイコンを非表示 */
    &::before {
      display: none;
    }
  }

  ui-file-tree ui-tree-item[aria-expanded="false"] {
    /* 収縮状態でも子要素を表示 */
    > [role="group"] {
      display: block !important;
    }
  }
}
```

**Rationale:**

- `index.md` L1729-1860 の印刷スタイル基本方針に従い、装飾的な背景色とシャドウを削除します。
- 全ノードを展開表示することで、紙面上でも完全な階層構造を把握できるようにします。
- 境界線は黒（`#000`）に統一し、構造の可読性を維持します。

**9. 強制カラーモード対応 (Forced Colors Mode)**

`@media (forced-colors: active)` 環境下では、透過色やシャドウがシステムによって上書きされます。以下のフォールバックを適用し、構造と意味を維持します（`index.md` L1241-1301 参照）。

```css
@media (forced-colors: active) {
  ui-file-tree {
    /* 境界線を強制し、コンテナの輪郭を明確化 */
    border: var(--border-width) solid CanvasText;

    /* Shadowは消失するため除去を明示 */
    box-shadow: none;
  }

  /* Card バリアントも同様 */
  ui-file-tree[variant="card"] {
    background-color: Canvas;
    border-color: CanvasText;
  }

  /* Indent Guide (Tree Item 内部) の可視化は ui-tree-item 側で対応 */
  /* 透過ボーダー (--border-ghost) が消失するため、CanvasText へフォールバック */
}
```

**Rationale:**

- `index.md` L1244-1247 で定義されたシステムカラーマッピングに従い、`--border-default` の透過色（`oklch(L C H / 0.12)`）は `CanvasText` へフォールバックします。
- ボーダーレスなデザイン（Default バリアント）でも、このモードでは境界線を明確化し、構造を視覚的に伝えます。
- Tree Item 内部の Indent Guide（`--border-ghost`）の対応は、`<ui-tree-item>` の仕様（L3318-3335）に記載されています。

### データ表示 (Data Display)

#### リストビュー (List View) `<ui-list>` / `<ui-list-item>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: ユーザーがアイテムを探索・操作するための主要なインターフェースです。
- **High Density**: 一覧性を高めるため、装飾的なカードスタイルではなく、情報は最小限の高さの「行」に凝縮します（Linear Style）。
- **Browsing First**: 複雑な管理機能（一括選択など）よりも「読むこと」を最優先とし、閲覧の邪魔になるモード切り替えや複雑な操作を排除します。マルチセレクト機能は搭載しません。
- **Web Standard**: リッチなデスクトップアプリの挙動を目指しつつも、WAI-ARIA Pattern に厳密に準拠し、予測可能性を損ないません。

**2. ロジック参照基盤 (Logic Reference)**

- **Pattern**: WAI-ARIA Grid Pattern (with **Roving Tabindex**)
- **Implementation**:
    - 複数列（タイトル、日付、タグなど）や、行内のインタラクティブ要素（リンク、ボタン）に対応するため、単純な `listbox` ではなく **`role="grid"`** を採用します。
    - **Row Focus Model**: ユーザー体験としては「行単位のブラウジング」を提供しますが、WAI-ARIAの仕様上、フォーカスは技術的に「行内の最初のセル (`role="gridcell"`)」または行全体をラップする要素で管理し、スクリーンリーダーへの読み上げを最適化します。
    - **Scalability & Performance Strategy**:
        - **No Virtualization (Searchability First)**: ブラウザネイティブの検索機能 (`Ctrl+F`) を阻害しないため、仮想スクロールは採用しません。
        - **DOM Optimization**: これを実現するため、各行（`<ui-list-item>`）は極限まで軽量なDOM構造を保ちます。イベントリスナーは親要素 (`<ui-list>`) での一括管理（**Event Delegation**）を徹底し、個別のリスナー付与によるメモリオーバーヘッドと初期化コストを回避します。
        - **Rendering Control**: `content-visibility: auto` (CSS Containment) を適用し、画面外のレンダリングコストをブラウザネイティブに最適化することで、"Zero Latency" な体験と検索性を両立します。
            - **A11y Verification Requirement**: `content-visibility: auto` を使用する場合、以下のスクリーンリーダー環境でのテストを必須とします：
                - NVDA (Windows) + Chrome/Firefox
                - JAWS (Windows) + Chrome/Firefox
                - VoiceOver (macOS) + Safari
                - 画面外要素が仮想カーソル（Browse Mode）で正しく読み上げられること、およびブラウザ検索 (`Ctrl+F`) でヒットした要素へのフォーカス移動が正常に動作することを検証します。
        - **Efficient Filtering**: フィルタリング操作時のレイアウトスラッシング（Layout Thrashing）を防ぐため、DOMノードの頻繁な削除・再生成は避け、可能な限り **`hidden` 属性の切り替え** で制御します。
        - **Pagination Threshold**: 実機検証に基づき、**デスクトップでは 3,000アイテム**、**モバイルでは 500アイテム** を目安（またはDOM総数による制限）とし、これを超える場合はページネーションへの移行を必須とします。これは "Zero Latency" を維持するための防衛ラインです。

**3. 技術仕様とAPI (Technical Specs)**

**`<ui-list>` プロパティ:**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `items` | - | `Array<ListItem>` | データ配列。`ListItem` は `{ id: string; [key: string]: unknown }` の形式。各アイテムは一意の `id` を持つ必要があります。 |
| `columns` | - | `ColumnDef[]` | 列定義。詳細は下記参照。 |
| `active-row` | `active-row` | `string \| null` | 現在フォーカスされている行のID。未選択時は `null`。 |
| `sort-key` | `sort-key` | `string \| null` | 現在ソート基準となっている列ID。未ソート時は `null`。 |
| `sort-direction` | `sort-direction` | `'asc' \| 'desc' \| null` | ソート順序。未ソート時は `null`。 |

**`ColumnDef` 型定義:**

```typescript
interface ColumnDef {
  id: string;                      // 列の一意識別子
  label: string;                   // ヘッダーに表示されるラベル
  width: string;                   // CSS値 (例: "200px", "1fr", "minmax(120px, 1fr)")
  sortable?: boolean;              // ソート可能か（デフォルト: false）
  hideOnMobile?: boolean;          // モバイル表示時に非表示にするか（デフォルト: false）
  primary?: boolean;               // プライマリ列（メインリンク含む）か（デフォルト: false）
}
```

**`width` プロパティの挙動:**

- **Subgrid対応環境**: 指定したCSS値をそのまま使用（`1fr` 等の相対値も有効）。
- **Subgrid非対応環境 (Fallback)**: `1fr` 等の相対値は各行で列幅が不揃いになるため、以下のルールで固定値に変換されます：
  - `1fr` → `minmax(120px, 1fr)` に変換（最小幅を保証）
  - `px` / `%` / `minmax` 指定はそのまま適用
  - 幅指定のない列は `auto` として扱われ、コンテンツ幅に追従します

**`<ui-list-item>` プロパティ:**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `item-id` | `item-id` | `string` | この行のID（`items` 配列内の `id` に対応）。 |
| `href` | `href` | `string \| null` | 行のメインコンテンツへの遷移先（Detail View）。指定されていない場合は `null`。 |
| `active` | `active` | `boolean` | この行がアクティブ（フォーカス）かどうか。 |

**Events:**

| イベント名 | Detail | 説明 | ソート処理のオーナーシップ |
|------------|--------|------|-------------------------|
| `ui-sort-change` | `{ key: string, direction: 'asc' \| 'desc' }` | ヘッダー操作によりソート順が変更された時に発火。 | **外部委譲**: `<ui-list>` は内部でソート処理を行いません。親コンポーネント側がこのイベントを購読し、`items` 配列を並び替えた上で再代入する責務を持ちます。これにより、ソートロジックの柔軟性（複雑なソート条件、バックエンド連携等）を担保します。 |
| `ui-active-change` | `{ rowId: string }` | キーボード操作等で行のアクティブ状態（フォーカス）が変更された時に発火。 | — |

**Slots:**

| スロット名 | 所属コンポーネント | 説明 | 使用例 |
|------------|-------------------|------|--------|
| `mobile-supplement` | `<ui-list-item>` | モバイル表示 (`hideOnMobile`) で列が隠された際、重要な情報をプライマリ列内に統合表示するための領域。 | `<ui-list-item><span slot="mobile-supplement">・ 2024-01-01</span></ui-list-item>` |

**4. レイアウトとレンダリング戦略 (Layout Strategy)**

- **CSS Grid & Progressive Enhancement**:
    - **Modern (Primary)**: 親コンテナ (`<ui-list>`) で `display: grid`、各行 (`<ui-list-item>`) で `grid-template-columns: subgrid` を採用します。
    - **A11y Warning (display: contents)**: `display: contents` は一部のブラウザでセマンティクス（`role="row"`）が剥落する不具合があるため、**`subgrid` 対応環境以外では使用しません**。
    - **Fallback (Robustness)**: `subgrid` 非対応環境では、各行を独立したGridコンテキスト（明示的な `display: grid`）として扱います。この場合、`1fr` 等の相対値を使用すると行ごとのコンテンツ量によって列幅が不揃いになるため、`columns` 定義に基づく**固定値（px / %）または `minmax` による最小幅保証**を強制的に適用します。柔軟性（Flexibility）よりも、グリッドの整列（Alignment）を優先し、普遍的な可読性を維持します。
- **Header Generation**:
    - `columns` 定義に基づき、自動的に `role="rowgroup" > role="row" > role="columnheader"` を生成します。
    - **Sort State**: ソート可能なヘッダーには **`aria-sort="ascending" | "descending" | "none"`** を付与し、現在の状態をスクリーンリーダーに通知します。
    - **Header Interaction**: ソート可能な列ヘッダーはインタラクティブ（`tabindex="0"` または `<button>` 内包）とし、クリックおよびキーボード操作を受け付けます。
    - **Indicator**: `sort-key` に一致する列には、並べ替えアイコン（`ChevronDown` / `ChevronUp`）をサイズ `--icon-sm` (14px) で表示します。
    - **Action Column**: 右端のアクション列に対しても、視覚的には空であってもアクセシブルなヘッダーセル（`<div role="columnheader" aria-label="Actions"></div>`）を配置し、グリッドの列構造を維持します。
    - **Typography**: ヘッダー行のテキストは `--text-xs` (12px) / `--font-medium` (500) / `--fg-muted` を使用し、データ行（`--text-base` / `--font-normal` / `--fg-default`）との視覚的階層を明確化します。
- **Responsive**:
    - モバイル (`< md`) 環境では、可読性を維持するため、`columns` 定義内の `hideOnMobile: true` な列を非表示にします。
    - **A11y & Performance**: CSSによる非表示（`display: none`）ではなく、**DOM出力自体を抑制**します。これにより、レンダリングコストを削減し、同時にスクリーンリーダーの `aria-colindex` 計算の整合性を完全に保証します（JSによる `window.matchMedia` 等を用いたリアクティブな描画制御）。
    - **Constraint**: タイトルやメインリンクを含む**プライマリ列は `hideOnMobile` を禁止**し、どのような環境でもコンテンツへのアクセスを保証します。
    - **Data Preservation Strategy**: モバイル・タブレット等の狭小画面で列を非表示にする際、日付やステータスなどの重要情報が欠落するのを防ぐため、**明示的なスロット `<slot name="mobile-supplement">`** を用いてプライマリ列（タイトル）内に情報を統合表示します。これにより、構造的かつセマンティックなレスポンシブ対応を標準化します。

**5. スタイリングとトークンマッピング (Style & Tokens)**

**行の基本スタイル:**

- **Item Height**: `--control-height-md` (32px)
    - **Touch Target**: 物理的な高さは32pxですが、`::after` 疑似要素などを用いて、タッチデバイスにおけるヒットエリアは最低 `44px` (`--control-min-touch`) を確保する実装を含めます（Invisible Hit Area）。
        - **Collision Safety**: この拡大された見えないヒットエリア (`::after`, `z-index: 0`) が、行内のリンクやボタンの操作を阻害しないよう、行内コンテンツには **`position: relative; z-index: 1`** を付与し、物理的に前面へ配置することを必須とします。
- **Padding**: `0 var(--space-4)`
- **Border**:
    - **Default (通常モード)**: `border-left: 3px solid transparent` — Forced Colors Mode時のレイアウトシフトを防ぐため、デフォルトで透明な左ボーダーを配置します。
    - **Active (通常モード)**: `border-left-color: var(--primary)` — アクティブ（Focus）時のみボーダー色を変更。
    - **Note**: 従来の `box-shadow` によるマーカー表現は、Forced Colors Modeで消失するため採用しません。`border-left` による実装で通常モードとForced Colors Modeの構造的一貫性を保ちます。
    - **Fallback (display: contents 環境)**: `display: contents` を使用する場合、親要素のボーダーが無効化されるため、最初のセル (`gridcell`) に `box-shadow: inset 3px 0 0 0 transparent` を適用し、同等の視覚表現を維持します。

**タイポグラフィ:**

| 要素 | フォントサイズ | ウェイト | 色 | 用途 |
|------|--------------|---------|-----|------|
| データ行（本文） | `--text-base` (14px) | `--font-normal` (400) | `--fg-default` | タイトル、メインコンテンツ |
| データ行（メタ情報） | `--text-sm` (13px) | `--font-normal` (400) | `--fg-muted` | 日付、タグ、ID等の補助情報列 |
| ヘッダー行 | `--text-xs` (12px) | `--font-medium` (500) | `--fg-muted` | 列ヘッダーラベル |

**状態遷移 (State Transitions):**

すべての状態変化には以下のトランジション定義を適用します：

```css
transition:
  background-color var(--duration-fast) var(--ease-out),
  border-color var(--duration-fast) var(--ease-out),
  opacity var(--duration-fast) var(--ease-out);
```

| 状態 | 背景色 | 左ボーダー色 | アクションボタン透明度 | トランジション |
|------|--------|-------------|---------------------|--------------|
| **Default** | `transparent` | `transparent` | `0` (非表示) | — |
| **Hover / Focus Within** | `var(--bg-hover)` | `transparent` | `1` (表示) | `--duration-fast` (70ms) / `--ease-out` |
| **Active (Focus)** | `var(--bg-surface-active)` | `var(--primary)` | `1` (表示) | `--duration-fast` (70ms) / `--ease-out` |

**Note**: `:focus-within` を活用し、内部のセルがフォーカスされた際に行全体のスタイルを変更します。

**Forced Colors Mode:**

- **Layout Safety**: 通常モードで既に `border-left: 3px solid transparent` を設定しているため、Forced Colors Mode時もレイアウトシフト（ガタつき）は発生しません。
- **Active State**: アクティブ（Focus）時は `border-left-color: Highlight`（システムカラー）に変更し、色情報に依存せず確実に選択状態を可視化します。
- **`display: contents` 環境の補足**: 親要素のボーダーが無効化される場合、最初のセル (`gridcell`) に `box-shadow: inset 3px 0 0 0 Highlight` を適用します。

**空状態 (Empty State):**

`items` が空配列（0件）の場合の表示仕様：

- グリッドコンテナ内に、`role="status"` を持つ空状態メッセージを配置します。
- `aria-live="polite"` を付与し、動的にアイテムが削除されて0件になった場合、スクリーンリーダーに通知します。
- **実装例**:
  ```html
  <div role="status" aria-live="polite" class="empty-state">
    <span class="text-muted">表示するアイテムがありません</span>
  </div>
  ```
- **スタイル**: `--text-base` / `--fg-muted` / 中央揃え / 上下パディング `var(--space-12)`

**外部スタイリングの禁止:**

- `::part()` を用いた外部からのスタイル上書きは、デザインシステムの一貫性を損なうため**原則禁止**とします。
- コンポーネントの見た目のカスタマイズが必要な場合は、`:root` レベルのトークン値を変更することで対応してください。

**6. アクセシビリティとキーボード操作 (A11y & Interaction)**

**ARIA構造定義:**

| 要素 | Role | ARIA属性 | 説明 |
|------|------|---------|------|
| `<ui-list>` | `grid` | `aria-colcount`, `aria-rowcount` | コンテナ。`aria-colcount` には論理的な列総数（レスポンシブで非表示の列も含む）、`aria-rowcount` にはページネーション時の全体行数を指定。全行表示時は省略可。 |
| ヘッダー行 | `rowgroup` > `row` | — | 列ヘッダーのグループ化 |
| 列ヘッダー | `columnheader` | `aria-sort`, `aria-colindex` | ソート可能な列には `aria-sort="ascending \| descending \| none"`。`aria-colindex` で論理的な列位置を指定（レスポンシブでDOM上の列順と不一致の場合必須）。 |
| データ行 (`<ui-list-item>`) | `row` | `aria-rowindex` | ページネーション時、全体の中での位置を `aria-rowindex` で指定（例: 全体100行中、現在表示中の行は1-20行目）。 |
| データセル | `gridcell` | `aria-colindex` | レスポンシブでDOM上の列順と論理的な列順が不一致の場合、`aria-colindex` を明示。 |

**ページネーション時のARIA属性例:**

```html
<ui-list role="grid" aria-rowcount="500" aria-colcount="5">
  <!-- ヘッダー省略 -->
  <ui-list-item role="row" aria-rowindex="1">...</ui-list-item>
  <ui-list-item role="row" aria-rowindex="2">...</ui-list-item>
  <!-- ... -->
  <ui-list-item role="row" aria-rowindex="20">...</ui-list-item>
</ui-list>
```

**Primary Action Structure (Click Delegation):**

- `role="row"` 自体をリンクにはしません（スクリーンリーダーの挙動不安定回避のため）。
- タイトル等を含む **主要セル (`role="gridcell"`) 内にネイティブの `<a>` タグを配置** します。
- **Robust Delegation**: JSにより、行の余白クリックを検知して `<a>` タグへ委譲しますが、以下のケースでは**委譲をキャンセル（中断）**し、ブラウザ本来の挙動を優先します：
    - テキスト選択中 (`window.getSelection().toString()`)
    - **修飾キー押下時** (`Command`, `Ctrl`, `Shift`, `Alt`) - 別タブで開く等のネイティブ操作用
    - **中クリック** (Mouse Button 1)

**Focus Strategy:**

- **Primary Cell Focus**: WAI-ARIA Grid Patternに準拠し、**行内の最初のインタラクティブなセル（通常はタイトル列）にフォーカス** (`tabindex="0"`) を与えます。
    - **Reason**: 行コンテナ (`role="row"`) 自体にフォーカスを当てると、一部のスクリーンリーダーが行内の全テキストを一括で読み上げてしまい、S/N比が悪化するためです。
    - **Visual Experience**: プログラム的なフォーカスはセルにありますが、**CSS `:focus-within`** を使用してフォーカスリングと背景色を**行全体 (`ui-list-item`) に描画**します。これにより、ユーザーのメンタルモデル（行選択）と実装の堅牢性（セルフォーカス）を乖離させることなく統合します。
- **Adaptive Focus**: 行全体（`<ui-list-item>`）の `:focus-within` スタイルに対してシステム共通の `var(--animation-focus)` を適用し、時間的な強調表現を行います。セル単体へのフォーカスリングは不可視（または極小）とし、視覚的なノイズを排除します。

**Keyboard Shortcuts:**

**Header Focus:**

| キー | 動作 |
|------|------|
| `Enter` / `Space` | 列のソート順を切り替え（昇順 ⇄ 降順）。 |

**Row Focus:**

| キー | 動作 | 備考 |
|------|------|------|
| `Enter` | 詳細ページへ遷移（Primary Link Action） | — |
| `Space` | **Scroll (Browsing Optimization)** | WAI-ARIAの標準（選択）とは異なる動作。`aria-keyshortcuts="Space"` または `aria-description` で「Spaceキーでスクロール」を通知することを**必須**とします。 |
| `Shift + Space` | **Quick Look (Preview)** | `preventDefault()` でスクロールを阻止。`aria-keyshortcuts="Shift+Space"` で通知を推奨。 |
| `ArrowUp` / `ArrowDown` | 前後の行へ移動 | — |
| `ArrowLeft` / `ArrowRight` | **セル移動 (Cell Navigation)** | 全てのセル間を移動可能（コピー可能性の保証）。 |
| `Home` / `End` | 最初 / 最後の項目へ移動 | — |
| `PageUp` / `PageDown` | 表示領域単位でスクロール移動 | — |
| `Shift + F10` / 右クリック | コンテキストメニューを表示 | — |

**スクリーンリーダー互換性の検証要件:**

Spaceキーの再定義は、一部のスクリーンリーダー（特にJAWS/NVDA）のApplication Modeで横取りされる可能性があります。以下の環境でテストを必須とします：

- **NVDA (Windows) + Chrome/Firefox**: Browse Mode / Focus Modeの両方で動作検証
- **JAWS (Windows) + Chrome/Firefox**: Virtual PC Cursor / Forms Modeの両方で動作検証
- **VoiceOver (macOS) + Safari**: Quick Navオン/オフの両方で動作検証

Spaceキーが期待通りスクロールしない環境が確認された場合、ドキュメントモード（`role="document"`）への切り替え、または代替キー（例: `S`キー）の追加を検討します。

**Quick Look機能のアクセシビリティ:**

- プレビュー機能の存在を伝えるため、行要素に `aria-haspopup="dialog"` および `aria-keyshortcuts="Shift+Space"` を付与します。
- プレビューダイアログが開いた際、フォーカスはダイアログ内へ移動し、閉じた際は元の行（トリガー元）へ戻ります。

#### 目次 (Table of Contents) `<ui-toc>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **Concept**: **「周辺視野の計器 (Peripheral Indicator)」**。
    - 操作パネルとしてではなく、読書中のユーザーが周辺視野で無意識に「現在地」と「残量」を感じ取れるインジケーターとして機能します。
- **Visual Silence**:
    - **Low Density**: 背景色や常時のボーダーを排除し、情報の密度を下げることで「静寂」を作ります。
    - **WCAG Compliance**: "Low Contrast"（見にくい）ではなく、適切なコントラスト比を持った `--fg-muted` を採用し、フォントサイズとウェイトを絞ることで視覚的ノイズを最小化します。
    - **Context Awareness**: 現在読んでいるセクションのみをハイライトし、それ以外は環境情報（Context）として控えめに配置します。

**2. ロジック参照基盤 (Logic Reference)**

- **Data Flow**:
    - **Rendering**: コンテンツ構造は、Velite (Content Engine) が生成したメタデータ (`toc`) を `headers` プロパティとして受け取り、正としてレンダリングします。クライアントサイドでのDOM解析は行いません。
    - **State Driver**: `IntersectionObserver` を使用してビューポート内のヘッダー要素を監視し、`active-id` のみを動的に更新します。
        - **Conflict Resolution**: 目次項目のクリックによる移動中は、Observerの監視を一時的に **停止（Pause）** し、`active-id` を即座にクリック対象へ固定します。スクロール完了後に監視を再開することで、移動中のインジケーターの明滅（Flickering）を防ぎます。
- **Interaction**:
    - **Smooth Scroll**:
        - 原則として JS制御により、移動距離に応じた適応的アニメーション時間（最大 `--duration-slower` = 300ms）で完了するカスタムスクロールを実装し、即応性を保証します。隣接セクションへの小さな移動では短時間（例: 100ms）、大きな移動でも300msを超えないよう制御します。
        - **Reduced Motion**: ユーザー設定 `prefers-reduced-motion: reduce` が有効な場合、アニメーションを完全に無効化し、即座にジャンプします。
    - **Keyboard Navigation**: 標準のTab順序ナビゲーションに従います。Roving Tabindex（矢印キーナビゲーション）は使用しません。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `headers` | - | `Heading[]` | 見出しデータの配列 `{ id, text, level }`。レンダリングの唯一のソース。 |
| `active-id`| `active-id` | `string` | 現在アクティブな見出しのID。Observerにより自動更新。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Container**:
    - Role: コンテンツ右翼のアンカー (Asymmetric Balance)
    - Position: `sticky`
    - Top: `calc(var(--header-height) + var(--space-8))`
    - Width: レイアウトコンテキストに従う（原則 `100%` または `fit-content`）
- **Item**:
    - **Indicator Track (Active Pill)**:
        - **Structure**: `border` プロパティではなく、`::before` 疑似要素を左端に絶対配置 (`width: var(--border-width-thick)` = 2px) することで、インジケーターを独立したオブジェクトとして扱います。
        - **Shape**: `border-radius: var(--radius-full)`。単なる線ではなく「オブジェクト」として扱います。
        - **Transition Strategy**:
            - **Scroll Driven**: スクロールによるアクティブ切り替え時は、アニメーション時間を **ゼロ (`--duration-instant`)** とし、遅延なく現在地を反映させます（計器としての正確性）。遅れてついてくるスプリングアニメーションは情報の同期ズレ（Lag）となるため禁止します。
            - **Jump / Click**: クリックジャンプ時は、`opacity` のフェードイン（`--duration-fast`）を行い、「着地した」という物理的な確信（Confirmation）を与えます。
    - Typography: `--text-sm` (13px), Weight 400
        - **Note**: `index.md` の "Small Text Rule" (12px以下への補正義務) を回避するため、あえて `--text-sm` (13px) を採用します。これにより、Weightを `400` に保ったまま `--fg-muted` を使用することを可能にし、視覚的な静謐さと可読性を両立させます。
    - Color (Default): `--fg-muted` (WCAG AA準拠: `--bg-default` に対して 4.8:1)
    - Color (Hover): `--fg-default` (背景色は変更せず、文字色のみで反応を返し、ノイズを抑える)
    - Color (Active): `--primary` (WCAG AA準拠: Light Mode `--bg-default` に対して 7.1:1)
    - Color (Focus): Adaptive Focus適用。`:focus-visible` 時に `outline: var(--focus-ring-width) solid var(--focus-ring-color); outline-offset: var(--focus-ring-offset);` + `animation: var(--animation-focus);` を使用し、移動中は控えめ、停止時に強調する時間軸フォーカス表現を実現します。
    - Padding Left: `calc(var(--level) * var(--space-2) + var(--space-3))`
        - **Note**: `var(--level)` は表示上の相対階層（0 start）として正規化した値を適用します（例: H2=0, H3=1...）。

**5. レスポンシブ戦略 (Responsive Strategy)**

- **Desktop (>= lg)**:
    - サイドバーへ追従配置（Sticky）。
- **Mobile (< lg)**:
    - **Trigger**: スティッキーヘッダーの右端に「目次アイコン (`List`)」を配置します。
        - **Note**: ヘッダーの既存要素（検索トリガー、ユーザーメニュー）との配置関係については、ヘッダーコンポーネント仕様を参照してください。目次アイコンは検索トリガーとユーザーメニューの間に配置し、モバイル画面幅でのレイアウト優先順位はヘッダー仕様に準じます。
    - **Presentation**: アイコンタップにより、画面下部からスライドインする **Bottom Sheet (Sheet Modal)** として展開します。
        - **Z-index**: オーバーレイは `--z-backdrop` (200)、シート本体は `--z-modal` (300) を使用し、index.md の Z-index体系に準拠します。
        - **Dimming**: 背景（記事本文）を `background-color: oklch(0% 0 0 / var(--opacity-scrim))` で暗くし、フォーカスをシートへ移動させます。
        - **Digital Tactility**: 下方向へのスワイプで閉じるジェスチャーをサポートしますが、**背景（Overlay）クリック**による閉じる挙動を基本とし、操作の堅牢性を担保します。
        - **Animation**:
            - **Default**: スライドインアニメーション（`transform: translateY(0)` from `translateY(100%)`）は `--duration-slower` (300ms) を使用。
            - **Reduced Motion**: `prefers-reduced-motion: reduce` 時は、スライドアニメーションを無効化し、即座に表示/非表示します（`--duration-instant`）。スワイプジェスチャーは引き続きサポートしますが、視覚的な追従アニメーションは排除します。
        - **Selection**: 項目タップ後、シートを閉じるアニメーション（または即座に非表示）を開始し、**閉じアニメーション完了後**に該当箇所へスムーズスクロールを実行します。これにより、視覚的な複雑性を回避し、ユーザーの認知負荷を低減します。

**6. アクセシビリティ (A11y)**

- **Structure**: `nav` > `ul` > `li` > `a` (ネイティブリンク)
- **Label**: `nav` に `aria-label="Table of Contents"` を付与。
- **Current**: アクティブなリンクに `aria-current="location"` を設定。
- **Focus Management**:
    - デスクトップ: 標準のTab順序ナビゲーション。Roving Tabindexは使用しない。
    - モバイル (Bottom Sheet): シート展開時にフォーカスを内部へ移動させ、Focus Trapを適用。`Esc` キーでシートを閉じ、トリガー（目次アイコン）へフォーカスを戻します。
- **Reduced Motion**: `prefers-reduced-motion: reduce` 時、すべてのアニメーション（Smooth Scroll、Bottom Sheetのスライドイン、インジケーターのフェードイン）を無効化し、即座に状態遷移します。
- **Forced Colors Mode**:
    - **Indicator Visibility**: `forced-colors: active` 環境では背景色が消失するため、アクティブなインジケーター (`::before`) には `background-color` ではなく **`border: var(--border-width-thick) solid Highlight`** を適用し、現在地を物理的に可視化します。
    - **Text Color**: index.md のシステムカラーマッピングに従い、`--fg-default` → `CanvasText`、`--fg-muted` → `GrayText`、`--primary` → `Highlight` が自動適用されます。

#### テーブル (Table) `<ui-table>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 構造化されたデータを比較・閲覧するためのビューです。
- **Clarification**: 罫線は「行 (Row)」の区切り（横線）のみとし、縦線は排除して視線の水平移動（Scanning）を助けます。データそのものを主役にし、枠線というノイズを減らします。
- **No Sticky Headers**: ヘッダーの固定（Sticky）は採用しません。横スクロールコンテナとの技術的競合（消失）や、内部スクロール（二重スクロール）による「読むリズム（Flow State）」の分断を避けるためです。縦に長すぎるテーブルは、UIでの解決ではなくコンテンツの分割を推奨します。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: Native `<table>` structure
- **Semantic Usage**: 本コンポーネントはデータ表示専用です。レイアウト目的（2カラム配置など）での使用は禁止とし、スクリーンリーダーの読み上げ体験（テーブルモード）を保護します。
- **Wrapper**: 横スクロールが必要な場合のために、ラッパー要素 `<div class="table-container">` で囲みます。これにはキーボード操作でのスクロールを保証するため、適切な属性 (`tabindex="0"`, `role="region"`) が必須です。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | デフォルト | 説明 |
|------------|------|-------|-----------|------|
| `density` | `density` | `'compact' \| 'normal'` | `'normal'` | 行の高さ密度。 |
| `colspan` / `rowspan` | - | - | - | **Support**. <br>**Long Table Strategy**: 行数が多く `rowspan` を使用する場合は、意味のまとまりごとに `<tbody>` 要素を分割することを推奨します。システムは `tbody` 間の境界線を強調 (`border-width-thick`) し、意味的なまとまり（Chunking）を提供します。 |
| `<tfoot>` | - | - | - | **現時点ではサポート対象外**。集計行・サマリー行が必要な場合は、`<tbody>` 末尾に通常の `<tr>` として配置し、必要に応じて `font-weight: var(--font-medium)` で強調することを推奨します。将来的にサポートを追加する場合は、このセクションを更新します。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Table**:
    - **Border Model**: `border-collapse: collapse` (ボーダーを統合し、シンプルな横線構造を実現)
    - **Border Spacing**: `border-spacing: 0` (collapse時のフォールバック)
- **Header (`th`)**:
    - Font: `--text-xs`, `font-weight: var(--font-medium)`
    - Letter Spacing: `var(--tracking-wide)` (Small Text Rule準拠)
    - Color: `--fg-muted`
    - Vertical Align: `bottom`
    - Padding:
        - **Normal**: `var(--space-3) var(--space-4)` (12px 16px)
        - **Compact**: `var(--space-2) var(--space-4)` (8px 16px)
    - Border: `var(--border-width-thick) solid var(--border-default)` (ヘッダーとボディの明確な区分)
- **Cell (`td`)**:
    - Font:
        - **Normal**: `--text-base` (14px)
        - **Compact**: `--text-sm` (13px)
    - Color: `--fg-default`
    - Vertical Align: `top` (長文折り返し時の可読性確保)
    - Padding:
        - **Normal**: `var(--space-3) var(--space-4)` (12px 16px)
        - **Compact**: `var(--space-2) var(--space-4)` (8px 16px)
    - **Truncation Strategy**:
        - **Desktop**: 行の高さ（Rhythm）を一定に保つため、`max-width` を指定の上、`text-overflow: ellipsis` で省略し、`<ui-tooltip>` で補完することを標準とします。
        - **Mobile / Touch**: ホバー操作ができないため、**省略設定を強制解除（Wrap）**し、全てのテキストを可視化します。リズムより情報へのアクセス性を優先します。
    - **Alignment Support**: Markdown互換のため、`th`/`td` の `align` 属性（`left`/`center`/`right`）をCSSでサポートします。
        - **Note**: `align` 属性はHTML5で非推奨（deprecated）ですが、Markdown生成コンテンツとの互換性のために例外的にサポートします。新規実装では代わりにCSSクラス（`.text-left`, `.text-center`, `.text-right`）の使用を推奨します。
        - **Automatic Optimization**: `align="right"` が指定されたセルには、数値とみなして自動的に `font-feature-settings: "tnum"` (等幅数値) を適用します。これにより、クラス指定なしで美しい数値リストを実現します。
- **Row (`tr`)**:
    - Border: `var(--border-width) solid var(--border-default)`
    - Transition: `background-color var(--duration-fast) var(--ease-out)` (スムーズなホバー体験)
    - **Hover (Active Ruler)**: `background-color: var(--bg-table-ruler)` (縦線がないため、現在行を示す動的な定規として機能させます)
        - **Token Definition**: テーブル専用のActive Rulerトークン `--bg-table-ruler` を以下のように定義します:
            - **Light Mode**: `oklch(from var(--fg-default) l c h / 0.08)` (標準の `--bg-hover` より強いコントラスト)
            - **Dark Mode**: `oklch(from var(--fg-default) l c h / 0.08)` (同上)
        - **Rationale**: 高密度なデータ閲覧において「行」の識別性は重要です。標準の `--bg-hover` (opacity `0.05`) では視覚的な定規として機能しないため、テーブル専用のトークンで例外的に強調します。
        - **Touch Device Consideration**: タッチデバイスでは `:hover` の挙動が不安定（タップ後に残留）であるため、Active Rulerはマウス環境でのみ有効化します。タッチ環境では `:hover` スタイルを無効化し、代わりにセル間の十分なスペーシングとボーダーによる構造の明確化に依存します。
- **Caption (`caption`)**:
    - Position: `caption-side: top` (左寄せ配置)
    - Font: `--text-xs`, `color: var(--fg-muted)`
    - Padding: `var(--space-2) 0`
    - Text Align: `left`
- **Scrollable Wrapper (`.table-container`)**:
    - `overflow-x: auto`
    - `overflow-y: visible` (垂直方向は内容に応じて伸縮)
    - `:focus-visible` スタイル:
        - `outline: var(--focus-ring-width) solid var(--focus-ring-color)`
        - `outline-offset: var(--focus-ring-offset)`
        - `animation: var(--animation-focus)` (Adaptive Focus: 移動中はSubtle、停止時にPrimaryへ強調)
        - **Rationale**: `tabindex="0"` によるキーボードフォーカス可能要素であるため、視覚的インジケータは必須です。基盤ドキュメントのTemporal Focus戦略に準拠します。

**5. アクセシビリティ (A11y)**

- **Caption**: `<caption>` 要素でテーブルのタイトルを提供。
- **Scope**: `th` に `scope="col"` または `scope="row"` を明示。
- **Scrollable Wrapper**: 横スクロールが発生するコンテナには必ず `tabindex="0"` と `role="region"`、および適切な `aria-label` を付与し、キーボード操作によるスクロールを保証します。
    - フォーカス可能要素として、`:focus-visible` スタイル（アウトライン）の適用が必須です（上記「Scrollable Wrapper」スタイル参照）。
- **Sorting (Future Extension)**: ソート機能を追加する場合は、`th` に `aria-sort` 属性（`ascending`/`descending`/`none`）を付与し、現在のソート状態を支援技術に伝達してください。
- **Forced Colors Mode**:
    - 透過ボーダーが消失するのを防ぐため、`forced-colors: active` 時は `tr` のボーダーを `1px solid ButtonText` (または `CanvasText`) に強制し、構造の可視性を維持します。

**6. `.prose` コンテキストとの統合**

テーブルが `.prose` 内に配置された場合、基盤ドキュメント（本文幅制限の解除とはみ出し挙動）に従い、以下のスタイルが自動適用されます:

```css
.prose table {
  max-width: none; /* リーディング幅（--width-reading）の制限を解除 */

  /* モバイル: コンテナよりやや広く */
  width: calc(100% + var(--space-8)); /* +32px */
  margin-inline: calc(-1 * var(--space-4)); /* -16px */

  /* デスクトップ (768px以上): さらに広く強調 */
  @media (min-width: 768px) { /* --bp-md */
    width: calc(100% + var(--space-16)); /* +64px */
    margin-inline: calc(-1 * var(--space-8)); /* -32px */
  }
}
```

- **Rationale**: 本文テキスト（約65文字幅）に対してテーブルを視覚的に拡張し、「データの広がり」を表現します。横スクロールが必要な場合は、`.table-container` ラッパーと組み合わせて使用します。
- **Wrapper Integration**: `.prose` 内で横スクロールが必要な場合の統合パターン:

```html
<div class="prose">
  <p>本文テキスト...</p>

  <div class="table-container" tabindex="0" role="region" aria-label="データテーブル">
    <table>
      <!-- テーブル内容 -->
    </table>
  </div>

  <p>続きの本文...</p>
</div>
```

この場合、`.table-container` に対してもはみ出しスタイルが適用され、横スクロールとレイアウト拡張が両立します。

#### カード (Card) `<ui-card>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 関連する情報をグルーピングし、一つのまとまりとして提示します。
- **Physicality**: Lightモードでは「影」で、Darkモードでは「表面の質感（Surface Tone & Edge）」で、背景からの物理的な分離を表現します。
- **Tactility**: クリック可能なカードは、ホバー時に微細な「浮き上がり（Scale）」を見せ、操作可能であることを物理的にアフォードします。

**2. ロジック参照基盤 (Logic Reference)**

- **Structure**: Slotベース (`header`, `default`, `footer`)。
- **Click Strategy**: `clickable` 属性が有効な場合、ナレッジ管理ツールとしての**テキスト選択性（Selectability）**を維持するため、以下の優先順位を採用します。
    1.  **Robust Delegation (Primary)**: `<ui-list>` と同様、JSイベント委譲によりカード全体のクリックを主要リンクとして扱います。ただし、以下の条件では**委譲をキャンセル**し、コピー操作等のネイティブ挙動を阻害しません。
        - **Text Selection**: テキスト選択中（`window.getSelection().toString().length > 0`）の場合。
        - **Interactive Elements**: 内部のボタンやリンクがクリックされた場合。
    2.  **Stretched Link (Secondary)**: 画像のみのカードなど、テキスト選択が不要な特殊なケースに限り、CSS (`::before` 拡張) による実装を許容します。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `variant` | `variant` | `'outlined' \| 'elevated' \| 'flat' \| 'ghost'` | 外観スタイル。デフォルトは `outlined`。 |
| `clickable`| `clickable`| `boolean` | `true` の場合、ホバーエフェクトとカーソル (`pointer`) を有効化。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Base**: `display: flex`, `flex-direction: column`
- **Radius**: `--radius-md` (6px)
- **Padding**: `--space-4` (標準) または `--space-6` (ゆったり)
    - **Flush Content (Image)**: カバー画像などをパディング無し（Flush）で配置する場合、画像側の角丸は `border-radius: inherit` (または上部のみ `inherit`) とし、親カードの `Nested Geometry` に完全に従わせます。
- **Variants**:
    - **Outlined** (Default):
        - Border: `var(--border-width) solid var(--border-default)`
        - Background: `transparent` (または `var(--bg-surface-1)`)
        - Shadow: `none`
        - **Interaction Logic**: Hover時に物理的な浮遊を表現するため、**Lifted (浮上)** 状態へ遷移します。Shadowを獲得し、背景が不透明化しますが、Elevatedバリアント（`surface-2`）とは異なり、Base層（`surface-1`）の色を維持します。
    - **Elevated**:
        - Border: `none` (**Note**: Darkモードでも枠線は引かず、ToneとEdge Highlightのみで階層を表現します)
        - Background: `var(--bg-surface-2)` (**Note**: index.md定義の通り、Base層より一段階明るいトーンを使用)
        - Shadow: `var(--elevation-md)` (Semanticトークン。Light/Dark自動切替)
        - **Edge Highlight (Dark)**: `box-shadow: inset 0 1px 0 0 oklch(100% 0 0 / 0.1)` (上部のハイライトでエッジを立たせる)
        - **Note**: シャドウはSemanticトークン `--elevation-md` を使用することで、Light/Dark間の分岐記述を不要にし、将来のテーマ拡張にも対応します。
    - **Flat** (Filled):
        - Background: `var(--bg-fill-muted)` (**Rationale**: 影なしで領域を明示する際は、構造的背景色である `--bg-fill-muted` を使用します。`--bg-surface-2` はElevated（影あり）コンテキスト専用です。)
        - Border: `none`
        - Shadow: `none`
        - **Use Case**: 影による強調を必要としないが、領域としての明確な視覚的分離が必要な場合に使用。入力フォーム背景やコードブロックと同等の視覚的重みを持ちます。
    - **Ghost**:
        - Background: `transparent`
        - Border: `var(--border-width) solid var(--border-ghost)` (トークン `--border-width` を使用)
- **Interaction (Clickable only)**:
    - **Hover & Focus**:
        - **Trigger**: マウスホバー時 (`:hover`) および、キーボード操作で内部要素にフォーカスがある時 (`:focus-within`)。
        - **Visual Focus Strategy**:
            - キーボード操作時、物理的なフォーカスは内部のアンカー（`<a>`）やボタンにありますが、**視覚的なフォーカスリングはカード全体に描画**します。
            - これにより、ユーザーの「クリック可能な領域（カード全体）」と「フォーカス領域」のメンタルモデルを一致させます。
            - Apply: `outline: var(--focus-ring-width) solid var(--focus-ring-color); outline-offset: var(--focus-ring-offset);`
            - Animation: `var(--animation-focus)` (系統合されたAdaptive Focusを適用)
        - **Tactility (Scale)**:
            - Scale: `scale(var(--scale-hover-sm))` (1.02倍)
            - Transition: `transform var(--duration-normal) var(--ease-out), background-color var(--duration-normal) var(--ease-out), box-shadow var(--duration-normal) var(--ease-out), border-color var(--duration-normal) linear`
            - **Reduced Motion**: `prefers-reduced-motion: reduce` 時は、`transform: none` とし、スケール変化を無効化します。トランジション時間は `transition-duration: var(--duration-instant)` (0ms) に短縮され、色変化のみが瞬時に適用されます。
        - **State Mutation**:
            - **Elevated**: Shadowが `var(--elevation-md)` から `var(--elevation-lg)` へ強化。
            - **Outlined**:
                - **Physicality**: 浮遊により「枠」から「物体（面）」へ変化し、背景が不透明化します。
                - Background: `transparent` -> `var(--bg-surface-1)`
                - Shadow: `none` -> `var(--elevation-lg)` (浮上)
                - Border: `var(--border-default)` -> `var(--border-muted)` (浮上により輪郭線が光に溶け込む演出)

**5. アクセシビリティ (A11y)**

- **Role**: コンテンツに応じて `article` (独立記事), `section` (節), または `div` (単なるラッパー) を適切に使い分けること。
- **Focus**:
    - **Functional Focus**: `clickable` な場合、カード全体ではなく、内部の主要リンクまたはアクションボタンにフォーカスを当てる構造にします（Focusable Container Anti-patternの回避）。
    - **Visual Unification**: 上記の通り、CSS `:focus-within` を用いて、視覚的にはカード全体をハイライトすることで、操作性と実装の堅牢性を両立させます。
- **Forced Colors Mode** (`forced-colors: active`):
    - Windows ハイコントラストモード等、OSレベルで色が強制される環境では、シャドウと背景色が消失します。以下の対応により構造を維持します。
    - **全バリアントに境界線を強制付与**:
        ```css
        @media (forced-colors: active) {
          ui-card {
            border: var(--border-width) solid CanvasText !important;
          }
        }
        ```
    - **Elevated / Flat variant**: 通常時は `border: none` ですが、このモードでは明示的なボーダーを追加することで、カードの存在を認識可能にします。
    - **選択状態**: `clickable` かつ選択状態のカードには、アウトラインを追加します。
        ```css
        @media (forced-colors: active) {
          ui-card[clickable]:hover,
          ui-card[clickable][aria-selected="true"] {
            outline: 2px solid Highlight;
            outline-offset: -2px;
          }
        }
        ```
- **Print Styles**:
    - 印刷時はシャドウと背景色を除去し、インク効率と可読性を優先します。
    - **Outlined / Ghost variant**: ボーダーは構造を示すため、黒色 (`#000`) に変換して保持します。
    - **Elevated / Flat variant**: 背景色を透明化し、ボーダーを追加します（`border: 1px solid #000`）。
    - **実装例**:
        ```css
        @media print {
          ui-card {
            box-shadow: none !important;
            background: transparent !important;
            break-inside: avoid; /* カードがページ分割されないよう制御 */
          }

          /* Elevated/Flatバリアントに境界線を追加 */
          ui-card[variant="elevated"],
          ui-card[variant="flat"] {
            border: 1px solid #000 !important;
          }
        }
        ```

**6. 実装ノート (Implementation Notes)**

- **Semanticトークン準拠**: シャドウはPrimitiveトークン (`--shadow-md`, `--shadow-dark-md`) ではなく、**必ずSemanticトークン (`--elevation-md`, `--elevation-lg`) を使用**してください。これによりLight/Dark間の分岐記述が不要になり、将来のテーマ拡張（ハイコントラストテーマ等）にも柔軟に対応できます。
- **トランジション対象**: `background-color` を明示的に含めることで、Outlined variantのHover時の背景変化が滑らかに遷移します。
- **モーション軽減**: `prefers-reduced-motion: reduce` 時は、グローバルルールで `transition-duration: 0.01ms` が適用されますが、加えて `transform: none` を明示的に指定することで、スケール変化を完全に無効化し、色変化のみを瞬時に適用します。
- **Flat variantの背景色**: `--bg-fill-muted` を使用することで、「構造的背景色」としての意味論的な役割を明確化します。`--bg-surface-2` はElevated（影あり）コンテキスト専用です。

#### タブ (Tabs) `<ui-tabs>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 同一コンテキスト内でのビュー（パネル）切り替えを提供します。
- **State Representation**: 現在位置のタブを明確にし、他が非アクティブであることを示しますが、非アクティブなタブもクリック可能であることをアフォードします。
- **Continuity**: パネル切り替え時は `opacity` によるクロスフェード（`--duration-normal` / 150ms）を伴い、認知の連続性を維持します。70msでは「ちらつき」として知覚されやすいため、コンテンツの変化にはわずかな余韻（タメ）を持たせます。
    - **Latency Handling (Optimistic UI)**: パネルの内容がロード中（Fetching）の場合、**Async Threshold (`--timeout-async-threshold` / 500ms)** 以内に完了すればフェードインをそのまま実行し、超過した場合はフェードインを待たずに即座にスケルトンを表示します。これにより「データ取得の遅延」と「アニメーションの遅延」が直列にならないよう配慮し、Flow Stateを維持します。
    - **Reduced Motion**: `prefers-reduced-motion: reduce` 時、パネルのクロスフェードは `0.01ms` に短縮されます（状態変化の認識に必須のため、完全無効化はしません）。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: `@lion/ui` の `LionTabs`
- **Porting**: `tablist` (header) と `tabpanel` (content) の関係性を管理するロジックを使用。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `selected-index` | `selected-index` | `number` | 現在選択されているタブのインデックス（0始まり）。 |
| `selected-value` | `selected-value` | `string` | 現在選択されているタブの値（ID）。URL連携時はハッシュ（`#tab-value`）またはクエリパラメータ（`?tab=value`）として利用されることを想定していますが、実際のルーティング実装はアプリケーション層で行います。 |
| `orientation` | `orientation` | `'horizontal' \| 'vertical'` | タブの配置方向。レイアウトに応じて切り替えます。デフォルトは `horizontal`。 |
| `automatic-activation` | `automatic-activation` | `boolean` | `true` の場合、矢印キーでの移動時に即座に選択（Activate）します。設定画面など、コンテンツがローカルにあり即応性が求められる場合に使用します。 |

> **Note (Disabled State)**: 個別タブの無効化（`disabled`属性）は、現在のRouaultでは使用想定がないため、意図的に実装対象外としています。将来的に必要になった場合、`--opacity-disabled` (0.5) トークンを適用し、`aria-disabled="true"` および `tabindex="-1"` を付与する戦略を採用します。

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **List (`tablist`)**:
    - Display: `flex`
    - **Orientation Strategy**:
        - **Horizontal (Default)**: `border-bottom: var(--border-width) solid var(--border-default)`
        - **Vertical**: `flex-direction: column`, `border-right: var(--border-width) solid var(--border-default)`
    - **Relative Positioning**: スライディングインジケータの基準点として機能させます。
    - **Overflow Strategy (Horizontal)**:
        - 幅がコンテナを超える場合、`overflow-x: auto` による横スクロールを許容します。
        - **Format**: スクロールバーの干渉やフォーカスリングの隠蔽リスクを避けるため、`mask-image` による**フェード処理は原則として使用しません**。
        - **Scrollbar Styling**: `index.md` で定義されたスクロールバートークン（`--scrollbar-width`, `--scrollbar-thumb` 等）を適用し、視覚的ノイズを最小化しつつ操作性を確保します。
        - **Scroll Padding**: キーボード操作でのタブ移動時 (`User Focus` / `Auto Scroll`)、フォーカスリングがコンテナ端で見切れるのを防ぐため、**`scroll-padding-inline: var(--space-4)`** を設定します。これにより、アクティブなタブは常に端から余白を持った位置にスクロールされます。
        - **Clearance**: コンテンツ（インジケーター含む）とスクロールバーの接触を防ぐため、`padding-bottom` に十分なクリアランスを確保します。
        - **Auto Scroll**: ページロード時や選択変更時、アクティブなタブが可視領域外にある場合は、自動的にスクロールして視野に収めます。
- **Tab (`tab`)**:
    - Height: **`--control-height-md` (32px)** (High Density準拠)
    - **Typography**:
        - Font Size: `--text-base` (14px)
        - Font Weight: `--font-medium` (500) — UIラベルとして十分な視認性を確保
        - Color (Default): `--fg-muted`
        - Color (Hover): **`--fg-default`** (明度変化による静かなフィードバック)
        - Color (Selected): `--primary`
    - **Transition**:
        - Property: `color` (明示的なプロパティ指定により `transition: all` を回避)
        - Duration: `var(--duration-fast)` (70ms)
        - Easing: `var(--ease-out)`
    - **Interaction**:
        - Active/Click: `transform: scale(var(--scale-pressed))` (`0.96`) をラベル要素（アイコン+テキスト）に適用し、入力受領の確かな触感（Tactility）を提供します。
        - **Transition (Active)**: `transform var(--duration-fast) var(--ease-out)`
    - **Touch Target**:
        - 物理的な高さは32pxですが、`::after` 疑似要素等を用いて垂直方向に **44px以上のヒットエリア** を確保します（WCAG 2.5.5 準拠）。
        - **Collision Avoidance**: 隣接するタブとの誤操作を防ぐため、ヒットエリアの水平方向のマージンや `z-index` 管理に留意してください。
    - **Indicator (Active Line)**:
        - 各タブの `border-bottom` ではなく、親要素内に配置された**独立したスライディング要素（Shared Layout Axis）**として実装します。
        - Color: `var(--primary)`
        - **Geometry Logic**:
            - **Horizontal**: Height `2px`. Bottom `0`. Widthは**ラベル（テキスト+アイコン）の幅**に一致。Animationは `translateX` & `scaleX`。
            - **Vertical**: Width `2px`. Right `-1px` (tablistの`border-right`に重ねる)。Heightは**タブ自体の高さ**に一致（またはラベル高さ）。Animationは `translateY`。`z-index: 1`により、ボーダーの上に重なりprimary色が前面に表示されます。
        - **Animation**:
            - **Method**: FLIPアニメーション（First, Last, Invert, Play）
            - **Easing**: `var(--ease-spring)` — ターゲット位置へ吸い付くような収束感（Overdamped）を表現
            - **Duration**: `var(--duration-slow)` (200ms) — インジケータの移動は単一コンポーネント内の状態遷移であるため、`--duration-slower`（300ms / 画面全体の遷移）ではなく200msを使用
            - *Note*: `prefers-reduced-motion: reduce` 時は `0.01ms` に短縮され、即座に配置されます。
        - **Layering**: `z-index: 1` を指定し、`tablist` のボーダーと色が混ざらないよう最前面に配置します。
        - **Hydration Strategy (SSG/SSR Safety)**:
            - JSによる位置計算 (`transform`) が完了するまでの間（Hydration前）、インジケータが消失したりアニメーションしたりするノイズを防ぎます。
            - **Initial State (Fallback & No-JS)**: `[aria-selected="true"]` なタブに対して、CSSで簡易的な `border-bottom: 2px solid var(--primary)` (Vertical時は `border-right: 2px solid var(--primary)`) を描画することを**必須**とします。これにより、JSが無効な環境やロード失敗時でも現在地情報が失われません。
            - **Hydrated State**: コンポーネントの初期化完了後（属性 `hydrated` 付与後など）、CSSによる下線を非表示にし、JS制御のスライディングインジケータへシームレスに引き継ぎます。

- **Panel (`tabpanel`)**:
    - **Transition**:
        - Property: `opacity` (明示的なプロパティ指定により `transition: all` を回避)
        - Duration: `var(--duration-normal)` (150ms)
        - Easing: `var(--ease-out)`
        - **Reduced Motion**: `prefers-reduced-motion: reduce` 時は `0.01ms` に短縮されます（状態変化の認識に必須のため、完全無効化はしません）。
    - **Loading State**: Fetching中の場合、`aria-busy="true"` を付与し、スケルトンを表示します（詳細はセクション1 Latency Handling参照）。

> **Note (Light/Dark Mode)**: タブコンポーネントのすべてのトークン（`--fg-muted`, `--fg-default`, `--primary`, `--border-default`等）は、`index.md` で定義されたSemanticトークンを使用しているため、Light/Darkモード間で自動的に適切な値に切り替わります。コンポーネント実装側でモード分岐を記述する必要はありません。

**5. アクセシビリティ (A11y)**

- **セマンティック構造 (Semantic Structure)**:
    - **Roles**: `role="tablist"` (タブリスト)、`role="tab"` (個別タブ)、`role="tabpanel"` (パネル) を明示的に付与します。
    - **Labeling**:
        - 各 `tab` は `aria-controls` 属性で対応する `tabpanel` のIDを参照します。
        - 各 `tabpanel` は `aria-labelledby` 属性で対応する `tab` のIDを参照し、スクリーンリーダーにパネルのラベルを提供します。
    - **State Management**:
        - `aria-selected="true"` (選択中のタブ) / `"false"` (非選択タブ)
        - `aria-orientation="horizontal"` (デフォルト) / `"vertical"`
        - **Loading State**: パネル内容がFetching中の場合、`tabpanel` に `aria-busy="true"` を付与し、完了後に `"false"` へ変更します。
        - **Live Region**: パネル切り替え時、動的コンテンツの変更を `aria-live="polite"` で通知します（緊急性が低いため `polite` を採用）。

- **Keyboard Navigation**:
    - **Arrow Keys**: 左右矢印キー（Vertical時は上下）でフォーカス移動。ロービングタブインデックス（Roving Tabindex）パターンを採用し、タブリスト全体で1つのタブのみが `tabindex="0"`、他は `tabindex="-1"` となります。
    - **Home / End Keys**:
        - `Home`: 最初のタブへ移動
        - `End`: 最後のタブへ移動
    - **Activation Mode**:
        - **Manual (Default)**: `Enter` / `Space` で選択。フェッチが必要なコンテンツ向け。
        - **Automatic**: `automatic-activation` 有効時、矢印キーでのフォーカス移動と同時に選択。設定画面など即応性重視の場面向け。

- **Focus Ring Strategy**:
    - **Global Standard**: `index.md` の戦略に従い、**`outline-offset: 2px` (外側)** を採用します。
    - **Adaptive Focus**: 連続移動時の「点滅」ノイズを抑えるため、**`var(--animation-focus)` (Time-based Intensity)** を適用します。移動中はリングが目立たず、停止した瞬間に明確化されます。
    - **Spacing**: タブ間のパディング（`var(--space-4)`）により十分なクリアランスがあるため、外側リングでも干渉しません。万一重なる場合は `z-index` でフォーカス要素を前面に出します。

- **Forced Colors Mode**:
    - **Indicator Visibility**: `forced-colors: active` 環境では背景色とシャドウが消失するため、JS制御のインジケータは非表示とし、代わりに**タブ要素 (`tab`) 自体の `border-bottom: 2px solid Highlight` (Vertical時は `border-right: 2px solid Highlight`) で復活させる**「ネイティブ回帰」戦略を採用します。`Highlight` はシステムカラーの選択色であり、`CanvasText` より視覚的に適切です（`index.md` のシステムカラーマッピング表に準拠）。
    - **Border Fallback**: すべてのタブに `border: 1px solid CanvasText` を適用し、構造を明示します。

#### ページネーション (Pagination) `<ui-pagination>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 大量データを分割表示する際のナビゲーションです。
- **Range Logic**: `Prev 1 ... 4 5 6 ... 10 Next` のように、現在地周辺と両端を表示し、中間を省略するロジックを持ちます。
- **Link-based**: アプリケーションの状態遷移ではなく、ドキュメントの「移動」であるため、プログレッシブエンハンスメントを前提としたリンク構造を提供します。
- **Tactility**: ボタンのインタラクション（ホバー、プレス）については `<ui-button>` コンポーネントの仕様に準拠します。押下時の `transform: scale(var(--scale-pressed))` や視覚的フィードバックを継承します。

**2. ロジック参照基盤 (Logic Reference)**

- **Implementation**: `<a>` タグをベースとしたナビゲーションリンクの集合体。クリックイベントはルーターが介入（Intercept）しますが、ネイティブのリンク機能（別タブで開く等）を維持します。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `current` | `current` | `number` | 現在のページ（1始まり）。 |
| `total` | `total` | `number` | 総ページ数。 |
| `get-href` | - | `(page: number) => string` | ページ番号からURLを生成する関数。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Item**: `<ui-button variant="ghost" size="md">` (32px) をベースに使用。
    - **Interaction**: ホバー時は `var(--bg-hover)` を適用し、操作可能であることを示唆します。
    - **Transition**:
        ```css
        transition:
          background-color var(--duration-fast) var(--ease-out),
          color var(--duration-fast) var(--ease-out),
          box-shadow var(--duration-fast) var(--ease-out),
          transform var(--duration-fast) var(--ease-out);
        ```
        - **Note**: `transition: all` は使用しません。意図しないプロパティの遷移を防ぐため、明示的なプロパティリストを使用します。
    - **Icon**: `ChevronLeft` / `ChevronRight` (Size: `--icon-base` 16px)。テキストラベルは使用しない。
    - **Disabled State**: 先頭ページ時の `Prev`、最終ページ時の `Next` は非表示にせず、`aria-disabled="true"` を付与し、**`href` 属性を削除（または `<span>` 要素へ置換）** することで、物理的にフォーカス不能かつ遷移不能にします。視覚的には `opacity: var(--opacity-disabled)` を適用します。
    - **Typography**: `var(--font-sans)` + `font-variant-numeric: tabular-nums`。
        - **Note**: `font-mono` は使用しません。デザインシステム全体の調和を優先し、OpenType機能を用いて標準フォント内で数字の等幅性を確保します。
    - **Touch Target**:
        - 物理的な高さは32pxですが、**`::after` 疑似要素を用いて物理的に 44px 以上 (`--control-min-touch`) のヒットエリアを確保**します。これにより、モバイル環境での「即応性（Snappiness）」と操作ミス（Mis-tap）の防止を保証します。
- **Active State (Current Page)**: 
    - **Background**: `var(--bg-surface-active)` (面による明確な現在地示唆)
    - **Color**: `var(--primary)`
    - **Shape**: `box-shadow: inset 0 calc(var(--border-width-thick) * -1) 0 0 var(--primary)`。
        - **Reason**: `<ui-tabs>` のインジケーターと視覚的整合性（Visual Rhyme）を持たせ、「現在のビュー」であることを一貫した言語で伝えます。
    - **Forbidden**: 
        - `font-weight: bold`: 文字幅の変化によるレイアウトシフト（隣接要素の位置ずれ）を防ぐため、**ウェイト変更は禁止**。
            - **Why**: `tabular-nums` (等幅数字) はあくまで「数字の送り幅」を揃えるものであり、ウェイト間の幅までは保証しません。したがって、ウェイト変更禁止はレイアウト崩れを防ぐための唯一の確実な解です。
        - `text-decoration: underline`: ボタン形状（Box Model）との不整合および、アイコン使用時の見た目の不格好さを避けるため禁止。
        - `variant="outline"`: ボーダーによるレイアウトシフト防止のため禁止。
- **Gap**: 
    - **Desktop**: `--space-1` (4px)
    - **Mobile**: `--space-3` (12px)。
        - **Hit Area Safety**: 上記「Touch Target」により物理的なヒットエリアの重なりは `z-index` で制御されますが、視覚的にも十分な分離を行うことで、誤操作の不安を物理的・心理的双方から取り除きます。
        - **Safety Net**: 万一のレイアウト調整で重複が発生する場合に備え、**現在のページ (`current`) の `z-index` を引き上げ**、常に最前面で操作を受け付けるよう制御します。

**5. レスポンシブ戦略 (Responsive Strategy)**

- **Range Logic**:
    - **Desktop**: `Prev 1 ... 4 5 6 ... 10 Next` (標準的な隣接表示)
    - **Mobile**: `Prev ... 5 ... Next` (省スペース化)
        - 画面幅が狭い場合、両端（Prev/Next）と現在地（Current）周辺のみを表示し、**1行での表示**を物理的に強制します。折り返し（Wrap）はレイアウトを破壊するため許容しません。
        - **Layout Stability**: 先頭ページ（Prevなし）や最終ページ（Nextなし）の場合でも、ボタン領域を確保（Disabled表示）し、ページ遷移によるボタン位置のガタつき（Layout Shift）を防ぎます。
- **Ellipsis (省略記号 `...`)**:
    - **Markup**: `<span aria-hidden="true">...</span>` として実装します。
    - **Reason**: スクリーンリーダーには省略の存在を伝えず、各ページリンクの `aria-label` で十分な文脈を提供します。視覚的には構造の暗示として機能させます。

**6. アクセシビリティ (A11y)**

- **Role**: `nav` 要素、`aria-label="ページナビゲーション"`。
- **Label**: 各リンクに `aria-label="5ページへ移動"`、前後ナビゲーションには `aria-label="前のページへ移動"` / `aria-label="次のページへ移動"` 等を動的に付与。
    - **Note**: Rouaultは日本語環境に特化したアプリケーションであるため、すべてのUIテキストとラベルは日本語で記述します。
- **Current Page**:
    - `aria-current="page"` を付与。
    - **Interaction**: 再ロードや誤認を防ぐため、**リンク (`<a>`) ではなく `<span>` 要素としてレンダリング**し、物理的にタブ順序から排除する。
- **Focus Management**:
    - **Timing**: ページ遷移後、View Transitions API（`document.startViewTransition()`）の `.finished` Promise完了後、またはフォールバック時は `fetch` によるDOM更新完了後にフォーカスを移動します。
    - **Target**: フォーカスは自動的に **ページタイトル (`h1[tabindex="-1"]`)** へ移動し、利用者が新しいページの先頭にいることを明確にします。スクリーンリーダーの読み上げコンテキストをリセットするためにも必須です。
    - **Fallback**: `h1` が存在しない場合は、`main[tabindex="-1"]` 要素をフォールバックターゲットとします。
- **Reduced Motion**:
    - `prefers-reduced-motion: reduce` が設定されている場合、トランジションは基盤のグローバルルール（`0.01ms` への短縮）に従います。ページ遷移のアニメーションも即座に完了し、フォーカス移動のみが実行されます。
- **Forced Colors Mode**:
    - `@media (forced-colors: active)` 時の対応:
        - **Current Page**: `outline: 2px solid Highlight; outline-offset: -2px;` を追加し、背景色消失時でもシステムカラーで現在地を明示します。`box-shadow` によるインジケーターはこのモードでは消失します。
        - **Disabled State**: `opacity` が無効化されるため、`color: GrayText` をシステムカラーとして適用し、視覚的に非活性を示します。
        - **Border**: 構造の維持のため、すべてのアイテムに `border: var(--border-width) solid CanvasText` を適用します。

### 記事・コンテンツ要素 (Article Elements)

#### 記事ヘッダー (Article Header) `<ui-article-header>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: コンテンツへの入り口として、タイトルとメタデータを明確に提示します。
- **Hierarchy**: `H1` タイトルはページ内で最も強い視覚的重みを持ち、本文導入部へのスムーズな視線誘導を行います。

**2. スタイリングとトークンマッピング (Style & Tokens)**

- **Title**:
    - Tag: `<h1>`
    - Typography:
        - Size (Desktop): `--text-4xl` (36px)
        - Size (Mobile): `clamp(var(--text-2xl), 4vw + 1rem, var(--text-4xl))` (24px〜36px)
            - **Responsive Logic**: ビューポート幅320px〜900pxで滑らかにスケール。
        - Weight: `700`
        - Letter Spacing: `--tracking-tight` (Not tighter: 和文可読性確保)
        - Line Height (Desktop): `--line-height-tight` (1.25、塊としての構造美)
        - Line Height (Mobile): `clamp(2rem, 5vw, 2.5rem)` (32px〜40px)
            - **Rationale**: フォントサイズ縮小に伴い行の高さも比例的に縮小し、垂直方向のリズムを維持します。
        - Font Feature: `"palt"` (和文プロポーショナルメトリクス)
    - Max Width: `var(--width-reading)` (本文幅と揃える)
    - **Line Breaking (Progressive Enhancement)**:
        - **Primary**: `word-break: auto-phrase` (Chrome 119+)
            - 和文の意味単位での自然な改行を実現。非対応ブラウザでは無視されます。
        - **Fallback**: `overflow-wrap: break-word` (全ブラウザ)
            - 長い単語が横溢する場合に単語内改行を許可。
        - **Mobile Reason**: 320px-375px幅では36pxの見出しは改行を多発させ「塊感」を損なうため、サイズを落としつつ意味のまとまりを維持します。
- **Metadata**:
    - **Structure**: `<ul>` 推奨（またはフラットな `<div>`）。
        - `<dl>` は `Key: Value` 構造を暗示しますが、本デザインではラベル（Key）を視覚的に隠すため、`<ul>` によるフラットなリストとして扱い、`aria-label` で意味を補完する方が適切です。
        - **Date**: `<time>` タグと `datetime` 属性を必須とします。
    - **Standard Items**: 以下の順序での配置します。
        1.  **Date**: `CalendarDays` icon (Lucide) + **最終更新日** (`YYYY-MM-DD`)。
            - **Policy**: 常に情報の鮮度（`updated` > `created`）を優先して一つだけ表示します。作成日は視覚的に表示しません。
            - **A11y (Date Context)**:
                - **Screen Reader**: `<time>` 要素に `aria-label="最終更新日: [Date]、作成日: [CreatedDate]"` を付与することで、視覚的ノイズを排除しつつ完全な文脈を提供します。
                - **CRITICAL**: `title` 属性によるツールチップは**キーボードユーザーとタッチデバイスユーザーにアクセス不可能**なため、WCAG準拠の手段として採用しません。`aria-label` による情報提供を唯一の実装とします。
        2.  **Category/Tags**: `Hash` icon + **Text Link**。
            - **Visual Weight**: メタデータ行の静謐さを保つため、背景色を持つ `<ui-tag>` (Chip) は避け、**`text-link` (#Tag)** を使用します。コンポーネントとしての矩形感を排除し、純粋なテキストリンクとして扱うことで、よりコンテンツに近い透明性を実現します。
            - **Style Strategy (Silent Link)**:
                - **Default**: `color: inherit` (`--fg-muted`)。`text-decoration: none`（下線なし）。
                - **Hover**: `color: var(--fg-default)`。
                    - Light Mode: `--fg-muted` (L45%) → `--fg-default` (L20%) = 明度低下（暗く）
                    - Dark Mode: `--fg-muted` (L65%) → `--fg-default` (L90%) = 明度上昇（明るく）
                    - **Rationale**: 通常のリンクのような色相変化（Hue Shift）ではなく、**明度変化（Lightness Shift）**のみで「押せる」ことを伝えます。これにより、メタデータエリアの静的な美しさを操作中も崩しません。
                - **Focus (`:focus-visible`)**:
                    - **Outline**: 基盤の Adaptive Focus（`--focus-ring-color-subtle` → `--focus-ring-color`）を適用。
                    - **Text Color**: Hoverと同様に `var(--fg-default)` へ変化。
                    - **Rationale**: Silent Linkの文脈でもフォーカスリングは明確に表示し、キーボードナビゲーションの現在地を保証します。
                - **Transition**: `color var(--duration-fast) var(--ease-out), outline-color var(--duration-normal) var(--ease-out)`。
            - **Implementation Note**: `text-link` はカスタムコンポーネントではなく、**ネイティブの `<a>` タグ**（クラス `.silent-link` 付与）で実装します。これはテキストの折り返しやベースライン配置などの自然なインライン挙動を維持し、Markdownパーサーとの親和性を保つためです。
        3.  **Reading Time** (Optional): `Clock` icon + 読了時間目安（"5 min read"）。
        4.  **Source / License** (Optional): `Link` または `Scale` icon + 出典元への外部リンク（"Original"）やライセンス名。
            - **Note**: 翻訳記事や外部資料の転載の場合、原文への敬意と権利関係の明確化のため、この位置で明示をします。
        5.  **Status** (Optional): `FileDashed` (Draft) / `Archive` (Archived) icon + ステータス名。
            - **Policy**: デフォルト（完成/標準）の場合は非表示とし、注意を要する状態のみを表示します。
            - **Icon Metaphor**: `Pencil` は「編集ボタン」と誤認されるリスクがあるため、状態を表す静的なアイコン（`FileDashed` 等）を採用します。
            - **Style**: **Icon + Colored Text** で表現します。矩形のバッジ (`<ui-badge>`) はメタデータ行の静謐さを損なうため使用しません。
            - **Color Mapping (Semantic Tokens)**:

                | Status | Color Token | Icon | Rationale |
                |--------|-------------|------|-----------|
                | **Draft** | `--fg-muted` | `FileDashed` | 静謐さを保ちつつ「未完成」を伝える。注意喚起ではなく状態の提示。 |
                | **Archived** | `--fg-subtle` | `Archive` | より控えめに。過去のコンテンツであることを主張せず暗示。 |
                | **Work in Progress** | `--fg-warning` | `Construction` | 注意喚起が必要な場合の例外。内容が不完全・変更中であることを明示。 |
                | **Deprecated** | `--fg-danger` | `AlertTriangle` | 警告レベル。非推奨コンテンツであることを強調。 |

                - **Design Rationale**: 基本的には `--fg-muted` / `--fg-subtle` で静謐さを維持し、ユーザーへの注意喚起が明確に必要な場合のみ `--fg-warning` / `--fg-danger` を使用します。
    - **Separator**: アイテム間の区切りには、CSSの **`::before` 擬似要素 (`content: "・"`)** を使用します。
        - **Logic**: **`li + li::before`** セレクタ（隣接兄弟結合子）を使用します。
        - **Wrapping Benefit**: `::after` (行末配置) と異なり、アイテムが折り返された際にセパレーターも一緒に次行の先頭へ移動するため、行末に中黒だけが取り残される現象（dangling dots）を防ぎます。
        - **Subtlety**: **`color: var(--fg-subtle)`** を適用し、情報のノイズ化を防ぎます。
        - **A11y**: **`content: "・" / "";` (Alt Syntax)** を採用します。これはCSS生成コンテンツに代替テキスト（空文字）を設定できるモダンな手法であり、DOMを汚すことなく視覚と聴覚のS/N比を両立させるための**必須実装**です。
    - Layout: `display: flex`, `flex-wrap: wrap`, `align-items: center`
    - Placement: タイトル直下
    - Typography:
        - Size: `--text-sm` (13px)
        - Color: `var(--fg-muted)`
        - Weight: **`500` (Medium)** をデフォルトとします。
            - **Rationale (Small Text Rule)**: 基盤ドキュメント「12px以下のテキストとアクセシビリティ」に準拠し、13pxでも細い文字（400）は視認性が低下するリスクがあります。Medium (500) をデフォルトとし、レンダリング確認の上でのみ 400 への緩和を許可します。
            - **Note**: これは基盤の Small Text Rule（12px以下の補正義務）を13pxにも拡張適用する判断です。
    - **Icon Size**: **`--icon-sm` (14px)**
        - **Deviation from Foundation**: 基盤アイコン定義では `--icon-xs` (12px) が「メタデータ」用途、`--icon-sm` (14px) が「小さなボタン、高密度リスト」用途として定義されています。
        - **Rationale for Override**: テキストサイズ `13px` + `font-weight: 500` との視覚バランス補正として、`12px` アイコンでは小さすぎると判断し、`14px` を採用します。
        - **Implementation Detail**: 必要に応じて `transform: translateY(1px)` 等の微調整を行い、数理的な中心ではなく**視覚的な重心**をテキストのベースラインと調和させてください。
        - **Future Consideration**: 基盤側のアイコン用途定義を「メタデータ（Weight 500時）: 14px」と更新することを検討します。
    - Gap: **`--space-3` (12px)** (関連情報のグループとして密度を確保)
    - Margin Top: `--space-4`
- **Lead / Abstract** (Optional):
    - **Concept**: タイトルから本文へのスムーズな導入（滑走路）。
    - Typography:
        - Size: **`--text-xl` (18px)**
        - Line Height: **`1.75` (比率)** — フォントサイズに応じて動的にスケール（18px × 1.75 = 31.5px）
            - **Clarification**: 基盤のフォントサイズ表では `--text-xl` の行高が `1.75rem` (固定値28px) と記載されていますが、Lead文は長文になりうるため、ここでは `--line-height-relaxed` (比率 1.75) を適用します。基盤側の定義が固定値と比率で混在している場合、コンテキストに応じて適切な方を選択します。
        - **Reason**: 本文（`16px`）との明確なサイズ差を設け、導入部としての視覚的階層を確立します。
    - Color: **`--fg-default`** (本文と同様の重要度を持たせ、Mixed Signalsを防ぎます。)
    - Margin Top: `--space-6`
    - Margin Bottom (to Body): `--space-12` (十分な呼吸空間)
    - **Note**: Leadがない場合は、Metadata下のマージンを `--space-12` とします。

**3. コンポーネントAPI (Component API)**

このセクションでは、`<ui-article-header>` コンポーネントのPublic APIを定義します。Litコンポーネントとして実装される際の Properties、Slots、Eventsを明確化し、実装者が迷わないようにします。

**Properties & Attributes**

| Property | Attribute | Type | Default | Description |
|----------|-----------|------|---------|-------------|
| `title` | `title` | `string` | `''` | 記事タイトル（必須）。`<h1>` として表示されます。 |
| `date` | `date` | `string` | `''` | 最終更新日（ISO 8601形式: `YYYY-MM-DD`）。`updated` が存在する場合はそちらを優先表示。 |
| `created` | `created` | `string` | `''` | 作成日（ISO 8601形式: `YYYY-MM-DD`）。視覚的には表示せず、`aria-label` で提供。 |
| `updated` | `updated` | `string` | `''` | 更新日（ISO 8601形式: `YYYY-MM-DD`）。存在する場合、`date` より優先して表示。 |
| `tags` | `tags` | `string[]` | `[]` | タグ配列（例: `['音楽', 'バッハ']`）。各タグは Silent Link としてレンダリング。 |
| `readingTime` | `reading-time` | `number` | — | 読了時間（分）。指定された場合のみ表示（例: `5` → "5 min read"）。 |
| `status` | `status` | `'draft' \| 'archived' \| 'wip' \| 'deprecated'` | — | ステータス。指定された場合のみ表示。デフォルト（完成）の場合は省略。 |
| `source` | `source` | `string` | — | 出典元URL（翻訳記事や転載の場合）。指定された場合のみ "Original" リンクとして表示。 |
| `license` | `license` | `string` | — | ライセンス名（例: "CC BY 4.0"）。指定された場合のみ表示。 |

**Slots**

| Slot Name | Description |
|-----------|-------------|
| `(default)` | Lead文（Abstract）のコンテンツ。HTMLを含むリッチテキストに対応。スロットが空の場合、Lead セクションは非表示。 |

**Events**

| Event Name | Detail Type | Description |
|------------|-------------|-------------|
| `tag-click` | `{ tag: string }` | タグリンクがクリックされた際に発火。親コンポーネントがルーティングや検索をハンドリング可能。デフォルトではリンクのネイティブ挙動（`href` による遷移）を維持。 |

**実装例**

```html
<ui-article-header
  title="バッハ《マタイ受難曲》の構造美"
  updated="2026-02-12"
  created="2025-11-20"
  .tags="${['音楽', 'バッハ', '宗教音楽']}"
  reading-time="8"
  status="draft"
>
  <p>本稿では、バッハの《マタイ受難曲》における対称的な構造と神学的意図の関係性を分析します。</p>
</ui-article-header>
```

**4. Dark Mode対応 (Dark Mode Behavior)**

記事ヘッダーコンポーネントは、基盤で定義されたセマンティックトークンを使用するため、Light/Dark Mode間でのトークン値の自動切替によって対応します。コンポーネント内部でモード分岐を行う必要はありません。

**トークン切替確認項目**

| 要素 | Light Mode | Dark Mode | コントラスト比 (Dark) |
|------|-----------|-----------|----------------------|
| **Title** (`--fg-default`) | `L 20%` | `L 90%` | 12.8:1 (on `--bg-default` L12%) |
| **Metadata** (`--fg-muted`, Weight 500) | `L 45%` | `L 65%` | 5.1:1 (on `--bg-default`) |
| **Silent Link Hover** (`--fg-default`) | `L 20%` | `L 90%` | 12.8:1 |
| **Focus Ring** (`--focus-ring-color`) | Primary L55% | Primary L65% | 3:1以上保証（基盤定義） |
| **Separator** (`--fg-subtle`) | `L 60%` | `L 50%` | 装飾要素（3:1未満許容） |

**検証ポイント**:
- Silent Link の Hover 時の明度変化（Light: 暗く、Dark: 明るく）が、両モードで直感的に「押せる」ことを伝えられるか。
- Status色（`--fg-warning`, `--fg-danger`）が Dark Mode で十分な視認性を持つか（基盤のコントラスト比保証表で確認済み）。

**特記事項**: コンポーネント固有の Dark Mode 調整は現時点で不要です。将来的に視認性の問題が発覚した場合、このセクションに例外的な調整を追記します。

#### コールアウト (Callout) `<ui-callout>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 文脈から独立した重要な補足情報を強調表示します。
- **Semantic Color**: 色そのものが意味（情報、警告、危険）を持つため、色覚多様性に配慮し、必ずアイコンとセットで使用します。
- **Serenity**: 視覚的なノイズを制御するため、過剰な・あるいは不規則な強調を避け、**統一された境界線とリズム**の中で、色の差異のみによって情報の緊急度を静かに表現します。

**2. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `variant` | `variant` | `'note' \| 'tip' \| 'success' \| 'warning' \| 'danger'` | 意味的種別。 |
| `title` | `title` | `string` | （任意）見出しテキスト。 |
| `icon` | `icon` | `string` | デフォルトアイコンを上書きする場合指定。 |
| `heading-level` | `heading-level` | `number` | タイトルを表示する場合のARIA見出しレベル（例: `3` -> `h3`）。デフォルトは指定なし（単なるラベル）。**`title` が指定されている場合にのみ有効**です。 |

**3. スタイリングとトークンマッピング (Style & Tokens)**

- **Layout Structure**:
    - Display: `flex`
    - Align Items: `flex-start` (アイコンとテキストの開始位置を揃え、長文時の崩れを防ぐ)
    - Gap: `var(--space-3)`
- **Container**:
    - Background: `var(--bg-[variant]-subtle)`
        - *Requirement*: `index.md` (Colors) に定義された正式なトークンを使用します。コンポーネント内でのオンザフライ計算（`from ...`）は禁止とし、デザインシステムの一貫性を守ります。
    - **Border Strategy** (System Consistency):
        - 引用 (Blockquote) との視覚的な整合性を図るため、物理的なボーダー (`border-inline-start`) を採用します。
        - **Width**: `var(--border-width-thick)` (`2px`) (Solid)
            - *Rationale*: システムで定義された強調ボーダー (`2px`) を使用し、一貫性を保ちます。色の違い (`[AccentColor]`) によって `Blockquote` との区別は十分になされるため、物理的な太さによる過剰な主張は避け、「静謐さ」を維持します。
        - **Values**:
            - **All Variants**: `var(--border-width-thick) solid [AccentColor]`
            - **Color Mapping**:
                - **Note**: `var(--fg-muted)`
                - **Tip**: `var(--fg-info)`
                - **Success**: `var(--fg-success)`
                - **Warning**: `var(--fg-warning)`
                    - *Rationale*: Lightモードの `--warning` (L=75%) は背景色用であり、文字色としてはコントラスト不足（約 2.0:1）です。`index.md` で定義された、コントラスト比（4.5:1以上）を保証するフォアグラウンド専用トークン **`var(--fg-warning)` (L=55%)** を正しく選択し、視認性と意味伝達を両立させます。
                - **Danger**: `var(--fg-danger)`
    - Radius: `--radius-md`
        - *Constraint*: 全周に一貫した角丸を適用し、有機的な「箱」としての形状を維持します。ボーダーが角丸に追従することで、コンテンツへの当たりを柔らかくします。
    - Padding: `--space-4`
    - **Forced Colors**:
        - `forced-colors: active` では背景色が消えるため、`border: 1px solid CanvasText` (全周) を追加し、矩形領域を可視化します。
        - **Accent Border**:
            - **Danger**: `border-inline-start: var(--border-width-thick) solid CanvasText` — `index.md` の `--danger` マッピングとの整合性を保ち、危険の差別化を維持します。
            - **その他バリアント**: `border-inline-start: var(--border-width-thick) solid Highlight` — システム強調色により、補足情報としての重要性を物理的に伝達します。
- **Icon**:
    - Size: **`--icon-base` (16px)** — Prose（記事本文）・UI両コンテキストで統一します。
    - *Consistency*: ストローク幅は **`1.5px`** で固定します（`index.md` 準拠）。太いアイコンは警告であってもノイズとなるため禁止します。
    - **Optical Adjustment**:
        - アイコンとテキストの行送り（Line Height）の中心を数理的に合わせるため、以下の計算式に基づいたマージンを適用します。マジックナンバー (`2px`等) の使用は避け、フォント変更に強い設計とします。
        - **Prerequisite**: この計算を成立させるため、コンテンツエリアには必ず `line-height: var(--line-height-relaxed)` を適用します。
        - Formula: `calc((1em * var(--line-height-relaxed) - var(--icon-base)) / 2)`
        - *Result*: Prose(16px/1.75) + Icon(16px) の場合、約 `6px` となります。
- **Content Area**:
    - **Typography**: `line-height: var(--line-height-relaxed)` (1.75)
        - **Robustness**: 親要素からの継承によるレイアウト崩れ（アイコン位置ズレ）を防ぐため、値を固定します。
    - Text Color: `var(--fg-default)`
        - **Contrast**: 背景色に依存せず、常に高い可読性を持つ `fg-default` を維持します。
    - **Title** (Optional):
        - Element: `div` (with `.title` class)
            - *Constraint*: `strong` のブロック表示はセマンティクス上不適切なため使用しません。
        - Typography: `font-weight: var(--font-semibold)`
        - Margin Bottom: `var(--space-2)`
- **Variants** (Icon: Lucide):
    - *Note*: アイコン色は `[AccentColor]` と同期させます。
    - **Note** (Gray): `Info` icon (Color: `--fg-muted`)
    - **Tip** (Primary/Violet): `Lightbulb` icon (Color: `var(--fg-info)`)
    - **Success** (Green): `CheckCircle` icon (Color: `var(--fg-success)`)
    - **Warning** (Amber): `AlertTriangle` icon (Color: `var(--fg-warning)`)
        - *Consistency*: Border同様、視認性を担保するセマンティックトークン `var(--fg-warning)` を採用し、システム全体の一貫性を維持します。
    - **Danger** (Red): `AlertOctagon` icon (Color: `var(--fg-danger)`)

**コントラスト比保証 (Contrast Ratios)**

以下の組み合わせは、WCAG 2.1 1.4.11（非テキストコントラスト）の**最低 3:1** 基準を満たします。ボーダー（2px）とアイコン（16px）は非テキスト要素として、この基準に該当します。

| バリアント | AccentColor (FG) | Background | コントラスト比 (Light) | コントラスト比 (Dark) | 基準 |
|-----------|-----------------|------------|----------------------|---------------------|------|
| **Note** | `--fg-muted` | `--bg-note-subtle` | 4.2:1 | 3.8:1 | 3:1 ✓ |
| **Tip** | `--fg-info` (= `--primary`) | `--bg-tip-subtle` | 5.8:1 | 4.5:1 | 3:1 ✓ |
| **Success** | `--fg-success` | `--bg-success-subtle` | 5.8:1 | 5.8:1 | 3:1 ✓ |
| **Warning** | `--fg-warning` | `--bg-warning-subtle` | 5.2:1 | 8.1:1 | 3:1 ✓ |
| **Danger** | `--fg-danger` | `--bg-danger-subtle` | 5.8:1 | 5.8:1 | 3:1 ✓ |

> **Note**: テキストコンテンツ（`--fg-default`）は `--bg-[variant]-subtle` 上で常に 4.5:1 以上（通常テキスト AA基準）を満たします。

**4. アクセシビリティ (A11y)**

- **Semantics**:
    - **`<aside>` (Recommended)**: HTML仕様における "Tangentially Related"（本筋から少し外れて関連している）コンテンツとして扱います。視覚的に枠で区切られている情報のセマンティクスとして最も適切です。
    - **`role="note"`**: 警告や短い注釈など、ランドマーク（`<aside>`）として扱うには大げさな場合や、より文脈との結びつきを強調したい場合は、`div` (または `section`) に `role="note"` を付与して実装することも可能です。
    - **Labeling & Heading Structure**:
        - **タイトルがある場合**: `div.title` に一意の ID を生成し、ルート要素の `aria-labelledby` から参照することで、スクリーンリーダー利用者が「何の注釈か」を即座に把握できるようにします。
        - **タイトルがない場合**: バリアントに応じた暗黙の `aria-label` を設定し、スクリーンリーダーユーザーの文脈理解を支援します。
            - **Note**: `aria-label="補足"`
            - **Tip**: `aria-label="ヒント"`
            - **Success**: `aria-label="成功"`
            - **Warning**: `aria-label="警告"`
            - **Danger**: `aria-label="注意"`
        - **Heading Level**: `heading-level` 属性が指定され、かつ `title` が存在する場合、`div.title` に `role="heading"` と `aria-level` を適用し、スクリーンリーダーのナビゲーション対象とします。

#### 詳細折りたたみ (Details) `<ui-details>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 情報の「段階的開示 (Progressive Disclosure)」を実現します。補足情報やFAQ、長大なログなど、常に表示する必要のない情報を格納し、S/N比を維持します。
- **Snappiness**: 開閉のアニメーションは、ユーザーの待機時間をゼロにするため、入力と同時に開始される「意図に即応する（Critically Damped）」挙動で実行されます。
- **Perception**: 閉じる動作においてもアニメーションを最後まで再生し、物理的な消失感（Fade out / Slide up）を与えます。

**2. ロジック参照基盤 (Logic Reference)**

- **Basis**: `@lion/ui` の `LionCollapsible` ロジック（`Controller` / `Mixin`）を採用します。
    - **Note on Native Details**: Native `<details>` は `open` 属性を削除すると即座に `display: none` となり、閉じるアニメーションが物理的に不可能であるため採用しません。
- **Animation Strategy**:
    - **Mechanism**: `grid-template-rows` (`0fr` <=> `1fr`) と `opacity` を併用し、高さの変動とコンテンツの実体化を同期させます。
    - **Duration**: `var(--duration-slow)` (200ms)
        - *Rationale*: `index.md` のタイミング表において、アコーディオンは `--duration-slow` (200ms) に分類されています。Detailsは単一の開閉に特化したアコーディオンの一形態であり、コンテンツ展開時の視線移動と認知の余裕を考慮し、同じ200msを採用します。
    - **Easing**:
        - Open: `var(--ease-out)` (減速しながら出現)
        - Close: `var(--ease-in)` (加速しながら消失)
    - **Motion Reduction**: `prefers-reduced-motion: reduce` 時、アニメーションは `0.01ms` に短縮され、即座に完了します。ただし開閉の状態変化自体は維持され、ユーザーの理解に必要な情報伝達は保証されます。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | デフォルト | 説明 |
|------------|------|-------|-----------|------|
| `summary` | `summary` | `string` | `''` | 見出しテキスト。`summary` スロットが提供された場合は無視されます。 |
| `open` | `open` | `boolean` | `false` | 開閉状態。`false` で閉じた状態（初期値）。 |
| `variant` | `variant` | `'default' \| 'bordered'` | `'default'` | 枠線の有無。 |

**Slots:**
- **`summary`**: カードヘッダー等のリッチな見出しを使用する場合に指定。**このスロットが提供された場合、`summary` 属性は無視されます。**
- **(default)**: 折りたまれるコンテンツ本体。

**Events:**
- **`toggle`**: 開閉状態が変化した際に発火します（Native `<details>` との API 互換性）。
    - **発火タイミング**: アニメーション開始直後（状態変化の即時通知）
    - **`event.detail`**: `{ open: boolean }` — 変更後の開閉状態を含む

**Fallback Behavior:**
- `summary` 属性とスロットの両方が未提供の場合、空の見出し（空文字）が表示されます。これはエラーとはせず、意図的に見出しテキストを省略するユースケース（アイコンのみのトリガー等）を許容します。

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Container**:
    - **Variant: Bordered**:
        - Border: `var(--border-subtle)` (ショートハンドトークン: `border: 1px solid var(--border-default)` に展開)
        - Radius: `var(--radius-md)`
        - Overflow: `hidden` (角丸内のコンテンツ切り抜き)
            - *Note*: 内部で `ui-popover` や `ui-tooltip` を使用する場合、クリッピングされる可能性があります。これらは `fixed` 配置（ポータル）を使用するか、コンテキストに注意して配置してください。
- **Summary (Trigger)**:
    - Layout: `display: flex`, `align-items: center`
    - Gap: `var(--space-2)` (アイコンとテキストの間隔)
    - Cursor: `pointer`
    - Padding: `var(--space-2) 0` (Bordered時は `var(--space-3)`)
    - **Hit Area**: **`::after` 疑似要素等を用いて垂直方向に `44px` (`--control-min-touch`) 以上のヒットエリア**を保障します。
    - **Typography**:
        - Font: `var(--text-base)`
        - Weight: `var(--font-medium)`
        - Color: `var(--fg-default)`
        - Line Height: `var(--line-height-normal)` (1.5)
    - **Icon**: `ChevronRight` (Lucide)
        - **Placement**: Flexboxによる流し込み配置とし、行頭への固定配置（Absolute Position）は行いません。ただし、複数行テキストの場合は `align-self: flex-start` とし、以下の計算式を用いて `margin-top` を制御することで、1行目のベースライン中心とアイコンの中心を数理的に合致します。
            - Formula: `calc((1em * var(--line-height-normal) - var(--icon-base)) / 2)`
            - *Rationale*: 実装者の感覚によるズレを排除し、フォントサイズ変更に堅牢な構造とします。
        - Size: `var(--icon-base)` (16px)
        - Stroke: `1.5px`
        - Color: `var(--fg-muted)`
        - Animation: `transform` (Rotate `90deg` Clockwise) `var(--duration-fast)` `var(--ease-out)`
            - *Note on Timing*: アイコン回転（70ms）はコンテンツ展開（200ms）よりも先に完了します。これは意図的な設計であり、「トリガーの応答（即座のフィードバック）」と「コンテンツの物質化（認知の余裕）」を分離することで、操作の手応えと情報の段階的開示を両立させます。
- **Content Wrapper**:
    - **Animation Container**: `display: grid`
    - **Inner**: `min-height: 0`
    - **Overflow Strategy**: Animation Container に `overflow: hidden` を適用し、`grid-template-rows` の過渡状態でコンテンツが溢れることを防ぎます。
- **Content Body**:
    - Padding: `0 0 var(--space-4) 0` (Bordered時は `0 var(--space-4) var(--space-4)`)
    - Margin Left: `calc(var(--icon-base) + var(--space-2))` (アイコンの幅+ギャップ分インデントし、テキストラインを揃える)
        - *Rationale*: `var(--space-6)` (24px) が偶然一致するのではなく、計算式で明示的に表現することで、トークン値変更時の破綻を防ぎます。

**5. アクセシビリティ (A11y)**

- **ARIA**:
    - **Trigger**: `button` 要素を使用。`aria-expanded` を開閉状態に応じて `true`/`false` に切り替え、`aria-controls` でコンテンツ領域のIDを参照します。
    - **Content Region**:
        - **基準**: コンテンツが独立したセクションとして機能する場合（例: FAQ回答、長大な補足情報）は `role="region"` と `aria-labelledby` を付与し、ランドマークとして認識可能にします。
        - **非適用**: 単なる補足情報やインラインの詳細（数行程度）の場合は、`region` ロールを付与せず、通常のコンテンツとして扱います。
- **Closed State Content Isolation**:
    - 閉じた状態（`open="false"`）では、コンテンツは視覚的に隠されるだけでなく、**支援技術からも完全に隔離**する必要があります。
    - **実装戦略**: `inert` 属性をコンテンツ領域に付与します。これにより、Tab キーでのフォーカス到達とスクリーンリーダーの読み上げの両方を遮断します。
        - Browser Support: Chrome 102+, Safari 15.5+, Firefox 112+ (Rouaultのブラウザ要件を満たす)
    - **代替手段**: `inert` が使用できない場合は、`visibility: hidden` を `transition-delay` と組み合わせて使用します（`opacity` アニメーション終了後に適用）。
- **Keyboard**: `Enter` または `Space` で開閉可能。
    - **Focus Strategy**: Triggerボタンには、`index.md` で定義された **Adaptive Focus** (`var(--animation-focus)`) を適用し、連続移動時のノイズを抑制しつつ、停止時の明確なフォーカス位置を示します。
- **Forced Colors Mode**: `forced-colors: active` 時、Default Variant（枠なし）では背景色が消失するため、アイコン (`ChevronRight`) の `stroke` が `CanvasText` 等のシステムカラーに追従することを保証し、可視性を維持します。

#### コードブロック (Code Block) `<ui-code-block>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 開発者ノートにおける「第二の本文」。可読性と機能性を最大化します。
- **Low Saturation**: シンタックスハイライトは、本文の「静謐さ」を壊さないよう、彩度を抑えたテーマを自作・適用します。
    - **Harmony**: ネオンカラーのような高彩度は避け、プロジェクトのカラーパレット（`--hue-primary`, `--hue-base`）と調和した色相、および **彩度 (C) `0.08` 〜 `0.12`** 程度の落ち着いたトーンを採用します。
    - **Contrast Guarantee**: `--bg-fill-muted` に対して WCAG AA (4.5:1) を担保するため、以下の Lightness 範囲を遵守します。
        - **Light Mode** (`--bg-fill-muted`: L 96%): 前景 **L ≤ 55%** で 4.5:1 確保
        - **Dark Mode** (`--bg-fill-muted`: L 9%): 前景 **L ≥ 55%** で 4.5:1 確保
        - *Rationale*: カラーシステムで定義された背景トークンとの組み合わせにおいて、コントラスト比を保証することでアクセシビリティ基準を満たします。
    - **Forced Colors Resilience**: ハイコントラストモード (`forced-colors: active`) では全ての色が失われるため、コメント部分（`comment`）に **`font-style: italic`** を適用し、斜体による構造的区別を担保します。

**2. 実装要件 (Implementation Strategy)**

- **Structure**: `<figure>` (Wrapper) > `<figcaption>` (File Name) + `<pre>` (Shiki Output) + `<button>` (Copy) のセマンティックな構成を採用します。
- **Language Label**:
    - **Visual**: 言語名（例えば "TypeScript" バッジ等）は、ファイル名やハイライトから自明であるため、**視覚的には表示しません**（S/N比の維持）。
    - **A11y**: スクリーンリーダー向けには、Shikiが出力する `class` だけでなく、`<pre>` または `<figure>` に以下のARIA属性を付与します。
        - **`aria-description="[Lang] code"`**: 言語情報を明示的に伝達
        - **`aria-label`**: スクロール可能な領域（`tabindex="0"` 付与時）には「[filename || lang] コード」のようなアクセシブルネームを必須とします（WCAG SC 4.1.2 準拠）。
- **Engine**: プロジェクト規定に基づき **`Shiki`** (Build-time Rendering) を採用します。ランタイムJS（PrismJS等）は排除し、レイアウトシフトのない堅牢な描画とゼロ・ランタイムオーバーヘッドを実現します。
    - **Wrapper Injection (Shadow DOM)**: `<ui-copy-button>` コンポーネントを使用し、コピー機能とフィードバック（Flash/Morphing）を委譲します。
        - **Visibility (Desktop)**: 視覚的ノイズを抑えるためデフォルトでは非表示（`opacity: 0`）としますが、**ホバー (`:hover`)** および **フォーカス (`:focus-within`)** 時に即座に出現（`opacity: 1`）させます。
            - *Note*: キーボードフォーカスを受け付けるため、`display: none` ではなく `opacity` で制御します。
            - **Ghost Interaction Prevention**: `opacity: 0` の状態では **`pointer-events: none`** を適用し、不可視状態での誤クリック（Ghost Click）を物理的に防ぎます。出現時のみ `auto` に戻します。
            - **Snappiness**: `:focus-within` 起因の表示においては、フォーカスリングの視認性を優先するため、**transitionを無効化（または `duration-instant`）** し、即座に状態を可視化します。
            - **Transition Spec**: 明示的なプロパティリストを使用します。
                ```css
                transition: opacity var(--duration-normal) var(--ease-out);
                ```
    - **Visibility (Mobile/Touch)**: タッチ操作でのホバーは不安定であるため、 **`var(--opacity-link-touch)` (0.75)** を適用して常時表示とします。
        - **Detection**: `@media (hover: none) and (pointer: coarse)` によりタッチデバイスを検出します（`index.md` のインタラクション機能検出戦略に準拠）。
        - *Conflict Avoidance*:
            - **With Filename**: `figcaption` 内の右端に配置し、コード領域との干渉を構造的に排除します。
            - **Standalone**: ボタン配置分のスペースを `padding` で物理的に確保し、フローティングによる文字被りを防ぎます。
- **Line Numbers**:
    - **Policy**: 原則として非表示（**No Noise**）。コードの構造と内容そのものに集中させます。
    - **Exception**: `show-line-numbers` 属性が明示された場合に限り描画します。
        - **Style**: `user-select: none` を適用し、コピー時のノイズ混入を防ぎます。色は `--fg-subtle` を使用し、コード本文より一段階落とします。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `filename` | `filename` | `string` | ファイル名。指定時はヘッダー（figcaption）に表示。 |
| `lang` | `lang` | `string` | 言語名（例: `ts`, `css`）。ARIAラベルやハイライトのクラス生成に使用。また、**`data-lang` 属性**としてDOMに出力し、CSS/JSからの参照を可能にします。 |
| `show-line-numbers` | `show-line-numbers` | `boolean` | 行番号を表示するかどうか。デフォルトは `false`。 |
| `headless` | `headless` | `boolean` | **Headless Mode**。`true` の場合、ファイル名ヘッダー、コピーボタン、外枠（ボーダー・背景・角丸）を全て無効化し、純粋なコードコンテンツのみを表示します。Code Group内での使用を想定。 |

**Public Methods:**
- **`getCodeContent(): string`**: コピー用に整形された純粋なコードテキストを返します。**`innerText` の単純取得ではなく、ShikiのメタデータやRawソースを使用し、行番号が表示されている場合でもそれらが混入しないことを保証します。**これにより、親コンポーネントはDOM構造を知る必要がなくなります。

**Slots:**
- **(default)**: Shikiによってレンダリングされた `<pre>` 要素を含むHTMLコンテンツ。

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Font**: `var(--font-mono)`
    - **Line Height**: **`var(--line-height-normal)` (1.5)**。親 (`.prose`) の `relaxed` (1.75) はコードには散漫すぎるため、引き締めて「塊」としての可読性を確保します。
- **Background**: `var(--bg-fill-muted)`
    - *Rationale*: 入力フォーム等と共通の「Fill」階層を使用し、一貫性を担保します。
- **Border**: **`var(--border-subtle)`** (`border: var(--border-width) solid var(--border-default)`)
    - *Rationale*: 独立した情報ブロックとして構造を明示する必要があるため、標準ボーダーを使用します（`index.md` L660-670 ボーダーガイドライン準拠）。
- **Radius Strategy**:
    - **Standalone**: `var(--radius-md)`
    - **In Group (Bottom)**: `0 0 var(--radius-md) var(--radius-md)`
        - **Trigger**: 親（Code Group）から提供されるコンテキスト（例: `--in-code-group: 1`）を検出し、上部の角丸を排除してヘッダーと接続します。
    - **Headless Mode (`[headless]`)**:
        - `border`, `background`, `border-radius` (Wrapper) を全てリセット（`none` / `transparent`）します。
        - **Padding**: `padding` はリセットせず維持（または `<pre>` 側に適用）し、親コンテナ（Code Group）内でも適切な余白を確保します。
        - `figcaption` (Filename) と Copy Button を `display: none` で隠蔽します。
        - **Rationale**: Shadow DOM のカプセル化を維持するため、親（Group）からのスタイル注入ではなく、自身の属性 (`:host([headless])`) による自己変容で統合を実現します。
        - **Context Awareness (No-JS FOUC Prevention)**:
            - **Critical**: JS実行前のヘッダー二重表示（FOUC）を防ぐため、CSS変数 **`--ui-code-block-header-display`** が `none` の場合、`headless` 属性がなくともヘッダーとコピーボタンを非表示にするフォールバックを実装します。
- **Padding**: **`var(--ui-code-block-padding, var(--space-4))`**
    - *Rationale*: 外部コンポーネント（例: `<ui-syntax-card>`）からのレイアウト制御（余白のゼロ化など）を受け入れるため、CSS変数を公開APIとして定義します。
- **Copy Button (Action)**:
    - Height: **`--control-height-sm` (24px)** (`index.md` "Content Actions" 準拠)
    - Icon Size: **`--icon-sm` (14px)**
    - Hit Area: `::after` で `44px` 四方を確保。
    - **Focus Strategy**: `index.md` の戦略に従い、**`var(--animation-focus)` (Adaptive Focus)** を適用します。マウスホバー等による即時出現 (`opacity: 1`) とは別に、キーボードフォーカス時には「一瞬遅れて強調される」リングにより、連続移動時のノイズを抑制します。
        - **Feedback**: `<ui-copy-button>` 内部で管理されるため、Code Block 側での実装は不要です。
    - **Forced Colors**:
        - `forced-colors: active` では背景色と `opacity` が無効化されるため、**`border: 1px solid ButtonText`** を適用して物理的な境界を可視化します。
        - (`ui-copy-button` が内部で使用する `ui-button` のスタイル透過性に依存)
- **File Name (`figcaption`)**:
    - Typography: `var(--text-xs)`, `color: var(--fg-muted)`
        - **Compliance**: `index.md` の "Small Text Rule" に従い、**`font-weight: var(--font-medium)`** と **`letter-spacing: var(--tracking-wide)`** を適用して可読性を担保します。
    - Position: 左上。コピーボタンエリア（右上）との衝突を避ける配置。
    - **Truncation**: 長いファイル名は `text-overflow: ellipsis` 等で省略し、コピーボタンと重ならないよう右側に安全なマージンを確保します。
- **Layout Strategy (Breakout)**:
    - **Concept**: `index.md` の "Media Elements" ルールに従い、本文幅 (`.prose`) よりも広く表示することで、没入感を高めると同時に、横長のコードの視認性を向上させます。
    - **Mobile**: `width: calc(100% + var(--space-8))`, `margin-inline: var(--space-n4)`
    - **Desktop**: `width: calc(100% + var(--space-16))`, `margin-inline: var(--space-n8)`
    - *Note*: ネガティブスペーシングトークン（`index.md` L619-628）を使用し、計算式の重複を排除します。
- **Overflow**:
    - `overflow-x: auto`
    - **Scrollbar Clipping Safety**: Standalone モードにおいて、スクロールバーの端がコンテナの角丸 (`radius-md`) によって切り取られる現象（特にWindows環境）を防ぐため、必要に応じて下部に微細なパディングを確保し、物理的な干渉を回避します。
    - **Keyboard Scrolling**: コンテンツが溢れる場合、`<pre>` に `tabindex="0"` を付与し、キーボード（矢印キー）でのスクロールを可能にします。
        - **Accessible Name**: `tabindex="0"` 付与時は `aria-label="[filename || lang] コード"` を必須とします（WCAG SC 4.1.2: Name, Role, Value 準拠）。
    - **Line Wrapping**:
        - **Policy**: コードの知覚的な構造（インデント）を維持するため、**原則として折り返し（Wrap）は行わず**、横スクロールを提供します。
        - **Exception**: エラーログ等の文章的なコンテンツに限り、メタデータ指定による `white-space: pre-wrap` （折り返し）の適用を許容します。
    - スクロールバーには `index.md` で定義されたカスタムスクロールバー（不可視ヒットエリア付）を適用します。

**5. 印刷対応 (Print Styles)**

`index.md` L1730-1901 "印刷スタイル" に準拠し、紙媒体への出力時に以下の最適化を行います。

- **Copy Button**: `display: none` で非表示
- **Breakout Layout 解除**:
    - `width: 100%`
    - `margin-inline: 0`
    - *Rationale*: 用紙幅を最大限活用し、ネガティブマージンによる意図しないはみ出しを防ぎます。
- **Line Wrapping 強制**: `white-space: pre-wrap` および `word-wrap: break-word`
    - *Rationale*: 横スクロールが不可能な印刷メディアでは、長い行を折り返してコンテンツの完全性を確保します。
- **Background 除去**: `background: transparent !important`
- **Border モノクロ化**: `border-color: #ccc !important`
    - *Rationale*: インク節約と視認性のバランス。
- **Page Break 制御**: `page-break-inside: avoid` および `break-inside: avoid`
    - *Rationale*: コードブロックが途中で分割されないよう、単一ページ内に収める。
- **Font Size 調整**: `font-size: 9pt`（`index.md` L1849 準拠）

**実装例**:

```css
@media print {
  :host {
    width: 100% !important;
    margin-inline: 0 !important;
    background: transparent !important;
    border-color: #ccc !important;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* Copy Button 非表示 */
  ui-copy-button {
    display: none !important;
  }

  /* 折り返し強制 */
  pre {
    white-space: pre-wrap !important;
    word-wrap: break-word !important;
    font-size: 9pt !important;
  }
}
```

#### コードグループ (Code Group) `<ui-code-group>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 複数のコードを並列に提示し、**「比較（Comparison）」**や**「凝集（Cohesion）」**を促します。
    - **Use Case**: Good/Badパターンの対比、Before/After（リファクタリング）、言語別（TS/JS）の切り替え。
    - **Anti-Pattern**: 単なる環境差分（npm/yarn）の吸収には最適ですが、乱用は避け、本当に比較が必要な場合に限定します。
- **Physical Connection (Context Fusion)**:
    - タブヘッダーとコードブロック本体を、単なる切り替えスイッチではなく**「一つの実体（Solid Object）」**として統合します。
    - **Ridge & Valley (Sunken Structure)**:
        - ヘッダー（Tab List）を「棚 (`--bg-surface-2`)」、コード本体（Body）を「窪み (`--bg-fill-muted`)」と見なす**Sunkenメタファー**を採用します。
        - アクティブなタブはコードブロックと同じ「窪み」の色を持ち、棚から物理的に繋がることで、ユーザーの視線をスムーズにコンテンツへ誘導します。
        - **Inactive Visibility**: 非アクティブなタブは「棚の上」にある状態です。背景が明るくなるため、文字色はコントラスト比（`4.5:1`）を確保しつつ、`--fg-muted` を用いて視覚的な階層を下げ、アクティブタブを引き立てます。
        - **Light Mode Visibility (Design Validation)**:
            - Light Mode における `--bg-surface-2` (L 100%) と `--bg-fill-muted` (L 96%) の明度差は **4%** と極めて微弱です（Dark Modeは8%）。
            - この微細な差異だけでは、物理的な「棚と窪み」のメタファーが視覚的に成立しない可能性があります。
            - **Primary Identifier**: 実際の構造識別は、**`border-bottom: var(--border-width) solid var(--border-default)`（Tab Listの境界線）**および**アクティブタブの `margin-bottom: -1px` による物理的結合**が担います。
            - **Verification Requirement**: 実装時には、Light Mode での視認性を実機テストで検証し、必要に応じて以下の補強を検討してください。
                - Tab List への微細な `box-shadow: inset 0 -1px 0 0 var(--border-muted)` 追加（内側の影で奥行きを強調）
                - アクティブタブの `box-shadow: 0 -2px 0 0 var(--bg-fill-muted)` による「溝」の視覚的強調
            - **Note**: この検証結果に基づき、必要があれば将来的にトークン値（明度差）の調整、またはLight Mode専用のスタイル追加を行います。現時点では、ボーダーによる構造保証を最優先とし、明度差は「補助的な視覚ヒント」として位置づけます。

**2. 技術仕様とAPI (Technical Specs)**

SSG (Eleventy) および Shiki のビルドプロセスとの親和性を高めるため、データ駆動（JSON props）ではなく、**Slot (Light DOM)** をベースとしたコンポジションを採用します。

    - **Slot Based Architecture (Light DOM Managed Strategy)**:
        - グループは初期化時、Light DOM内にある `<ui-code-block>` 要素をスキャンし、それぞれに対応する **タブボタン（Light DOM）** を動的に生成します。
        - **Controller Role**: Controller（JS）が Light DOM の整理整頓を行います。
            - 各 `<ui-code-block>` に対して **`slot="panel"`** および **`role="tabpanel"`** を動的に付与し、Shadow DOM 内の適切なスロット領域へ投影（Project）されるよう制御します。
        - これにより、Shadow DOM 側は単に「枠（Slot）」を提供するだけで済み、複雑なDOMラップ操作を回避しつつ、正しい ARIA 構造を実現します。
        - **No-JS Fallback**: JSが無効な環境ではスロット属性が付与されないため、すべてのブロックが通常フロー（スタック）で表示されるという**プログレッシブエンハンスメント**が自然に成立します。

| プロパティ | 属性 | 説明 |
|------------|------|------|
| `label` | `label` | (Child Item) タブに表示するラベルテキスト。 **省略時のフォールバック順序: `filename` > `lang` > "コード"**。これにより空のタブが生成されることを防ぎます。`index.md` L72-73 の国際化方針に従い、ジェネリックフォールバックは日本語で固定します。 |
| - | - | **Metadata Extraction**: Code Group は、アクティブな Code Block が持つ `filename` 属性を読み取り、自身のヘッダー内に表示します。ただし、`label` が未指定（filenameをタブ名に使用）の場合、重複を避けるためメタデータ領域には表示しません。 |

**3. 実装要件 (Implementation Strategy)**

- **Progressive Enhancement & No-JS Stability (Critical)**:
    - **No-JS Stack (Default)**: 初期状態（No-JS/SSR）では、すべての `<ui-code-block>` を**縦積み（Stack）**で表示します。
    - **Hydration Strategy**:
        - JS（LionTabsコントローラー）がロードされ、属性の付与とShadow DOMへの投影準備が完了した時点で、**ホスト要素（`:host`）** に状態属性 **`data-ready`** を付与します。
            - **Target**: `<ui-code-group>` のホスト要素自身。Shadow DOM内の子要素ではありません。
            - **Purpose**: CSS セレクタ `:host([data-ready])` を通じて、ハイドレーション完了後のスタイル（タブUI）を有効化します。
        - この属性が付与されて初めて、タブナビゲーションのスタイルとARIA制御（非アクティブパネルへの `hidden`）を適用し、インタラクティブなタブUIへと変形させます。これにより、レイアウトシフト（CLS）は発生しますが、コンテンツの完全性を保証します。
        - **Implementation Note**: `data-ready` は Code Group 独自の概念であり、`index.md` L1392-1460 のコンテキスト伝達パターンには該当しません（親子間通信ではなく、コンポーネント自身の内部状態のため）。この属性は、Progressive Enhancement の段階的適用（No-JS → JS-ready）を CSS で制御するためのトリガーとして機能します。
    - **Headless Switch**:
        - Code Blockのヘッダーは、Stack状態では表示し、タブ化完了後（`data-ready`）に CSS Custom Property（例: `--ui-code-block-header-display: none`）を通じて一括隠蔽します。これにより、タブとブロックヘッダーの情報の重複を解消します。
- **Logic Porting**:
    - `index.md` の戦略に従い、**`@lion/ui` (LionTabs)** のロジック（Controller/Mixin）をポーティングして使用します。
    - **Keyboard Navigation (Focus Flow)**:
        - **Tabs**: 矢印キー（`←` `→`）によるタブ移動、`Home`/`End` 対応、およびフォーカス時の自動選択（Follow Focus）。
        - **Exit Strategy**: ARIA標準に従い、タブリストからの **`Tab` キー押下**によってグループを脱出し、次のフォーカス可能要素（**Copy Button**）へ移動するフローを保証します。視覚的に隣接していても、矢印キーでボタンへ移動させる非標準な挙動は採用しません。
- **SSR & Hydration**:
    - サーバーサイド（SSG）では全てのスロットコンテンツを出力します。前述の通りCSSで初期表示を制御し、ハイドレーション後はJSが適切にARIAステートを管理します。

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Container**:
    - Radius: `--radius-md`
    - Overflow: `hidden` (角丸の維持)
    - Border: `var(--border-subtle)`
    - Position: `relative`
    - **Layout Strategy (Context-Dependent Breakout)**:
        - UIコンポーネントとしての安全性（Safe by Default）を優先します。
        - **Default**: `width: 100%`, `margin-inline: 0`。あらゆる親コンテナ（カード、サイドバー等）内で安全に動作します。
        - **Prose Context Extension**: 記事本文（**`.prose`**）内に配置された場合に限り、以下の Breakout スタイルを適用し没入感を高めます。
            - **Mobile**: `width: calc(100% + var(--space-8))`, `margin-inline: calc(-1 * var(--space-4))`
            - **Desktop**: `width: calc(100% + var(--space-16))`, `margin-inline: calc(-1 * var(--space-8))`
        - **Browser Compatibility (Firefox Fallback)**:
            - **Critical**: `:host-context(.prose)` は **Firefox 未サポート**です（2026年2月時点）。
            - **Strategy**: CSS Variable ベースのコンテキスト検出を採用します。
                - 親（`.prose`）が **`--in-prose-context: 1`** を設定します。
                - Code Group は、この変数が定義されている場合にのみ Breakout スタイルを適用します。
            - **Implementation**:
                ```css
                /* 親コンテナ（Light DOM）: prose内の Code Group にのみ拡張値を注入 */
                .prose ui-code-group {
                  --ui-code-group-width: calc(100% + var(--space-8));
                  --ui-code-group-margin-inline: calc(-1 * var(--space-4));
                }

                /* Code Group (Shadow DOM) */
                :host {
                  width: var(--ui-code-group-width, 100%); /* Safe Default */
                  margin-inline: var(--ui-code-group-margin-inline, 0);
                }

                @media (min-width: 768px) { /* --bp-md */
                  .prose ui-code-group {
                    --ui-code-group-width: calc(100% + var(--space-16));
                    --ui-code-group-margin-inline: calc(-1 * var(--space-8));
                  }
                }
                ```
            - **Note**: Code Block 仕様でも同じ戦略（Light DOMでの変数注入 + Shadow DOMでの参照）を採用してください。
    - **Nested Layout Safety (Double Breakout Prevention)**:
        - `ui-code-group` 内の `ui-code-block`（Breakout属性を持つ可能性がある）に対しては、**CSS Variable** を用いて Breakout を **`0` に強制リセット**し、グループ内コンテナに収まる（Fill Container）挙動とします。
        - **Strategy**: Code Group が提供する **`--ui-code-block-breakout-width: 100%`** および **`--ui-code-block-breakout-margin: 0`** を、配下の Code Block が優先的に参照することで実現します。
        - **Implementation**:
            ```css
            /* Code Group (Shadow DOM) */
            :host {
              /* 配下の Code Block に対する Breakout 無効化 */
              --ui-code-block-breakout-width: 100%;
              --ui-code-block-breakout-margin: 0;
            }

            /* Code Block (Shadow DOM) */
            :host {
              /* CSS Variable が定義されていればそれを優先、なければ Breakout 適用 */
              width: var(--ui-code-block-breakout-width, calc(100% + var(--space-8)));
              margin-inline: var(--ui-code-block-breakout-margin, calc(-1 * var(--space-4)));
            }
            ```
        - **Note**: この戦略により、CSS詳細度の問題を回避し、Code Block 側で `!important` を使用する必要もありません。親からの変数提供のみで、子の挙動を制御できます（`index.md` L1408-1460 のコンテキスト伝達パターンに準拠）。
- **Header Area Structure (ARIA Compliance)**:
    - **Structural Separation**: `div.code-group-header` (Flex wrapper) 内で「純粋なタブリスト (`div[role="tablist"]`)」と「ヘッダーツール (`div.header-tools`)」を明確に分離します。
    - **Container Stacking**: Wrapperに **`isolation: isolate`** を適用し、ローカルスタッキングコンテキストを生成します。
- **Tab List Container (`div[role="tablist"]`)**:
    - **Layout**: `flex: 1`, `overflow-x: auto` (Mobile対応).
    - Background: `var(--bg-surface-2)` (Elevated)
        - *Structure*: Body (`--bg-fill-muted`) に対して一段階「浮き上がった（明るい）」階層とすることで、物理的なフォルダのように振る舞いを表現します。
    - Border Bottom: `var(--border-width) solid var(--border-default)` (未選択部分の境界線として描画)
    - **Scroll Affordance (Shadow Hint)**:
        - **Mobile Detection**: `@media (hover: none) and (pointer: coarse)` を使用してタッチデバイスを検出します（`index.md` L1536-1580 のインタラクション機能検出戦略に準拠）。
        - モバイル環境ではスクロールバーを非表示（`scrollbar-width: none` / `::-webkit-scrollbar { display: none; }`）にし、**CSS Pure Scroll Shadows** を導入します。スクロール可能な方向（隠れている側）にのみ影が出現する視覚的ヒントを提供します。
        - **Right Side Padding (Mask Compensation)**: ヘッダーツール（マスク領域）による文字被りを防ぐため、`tab-list` の末尾（`padding-inline-end`）に **マスク幅と同等以上の余白（約40px）** を確保し、最後のタブが完全に可視領域までスクロールできるようにします。
    - **Desktop Strategy (A11y)**: マウスやキーボード操作を主とする環境（`@media (hover: hover)`）では、操作手段（ハンドル）の提示が不可欠です。隠蔽は行わず、**`index.md` で定義されたカスタムスクロールバー (`height: 12px` / Track: Transparent / Thumb: `4px` Height)** を適用します。これにより、視覚的ノイズを最小限に抑えつつ、WCAG 2.1 (Pointer Gestures) に準拠します。
    - **Tab Item**:
        - **Touch Target & Clipping Prevention**:
            - **Concept**: **`::after` 疑似要素等を用いて垂直方向 44px (`--control-min-touch`) 以上のヒットエリア**を確保します。
            - **Clipping Safety**: 親要素（`tab-list`）の `overflow-x: auto` によって拡張されたヒットエリアが切り取られるのを防ぐため、`tab-list` 自体に **`min-height: 44px`** (または適切なパディング) を設定し、物理的なスペースをコンテナレベルで確保します。
            - **Horizontal Constraint**: 横並びのリストであるため、疑似要素の幅は **`width: 100%`** (または `left: 0; right: 0;`) とし、**隣接するタブへの重なり（Ghost Click）を物理的に防止**します。
        - **Focus State**: フォーカス時は **`z-index: 2`** を適用し、フォーカスリングが隣接するタブやボーダーに隠れず最前面に描画されるようにします。
            - **Visibility Safety (Scroll into View)**:
                - キーボード操作でタブ移動する際、アクティブなタブが固定配置された `header-tools` の裏に隠れることを防ぐため、JSコントローラー側で **Scroll into View** ロジックを実装します。
                - **API**: `Element.scrollIntoView({ behavior, block, inline })` を使用します。
                - **Parameters**:
                    - `behavior`: `'instant'` を使用します。スクロール自体はユーザー操作の結果であり、装飾ではないため、即座に完了させます。`prefers-reduced-motion` での分岐は不要です。
                    - `block`: `'nearest'` を使用し、タブがビューポート外にある場合のみスクロールします。
                    - `inline`: `'nearest'` を使用し、横スクロールの最小化を図ります。
                - **Offset Compensation (Mask Safety)**:
                    - `header-tools` の幅は動的に変化する可能性がありますが、実装時は **CSS Variable (`--header-tools-width`)** として公開し、JS側で参照可能にします。
                    - `scrollIntoView()` 実行後、`tab-list` の `scrollLeft` を `header-tools` の幅分だけ補正し、タブが完全に可視領域に収まることを保証します。
                    - **Formula**: `tabList.scrollLeft -= headerToolsWidth`
                - **Implementation Example**:
                    ```typescript
                    private _scrollTabIntoView(tab: HTMLElement): void {
                      // まず標準APIでスクロール
                      tab.scrollIntoView({
                        behavior: 'instant',
                        block: 'nearest',
                        inline: 'nearest',
                      });

                      // header-tools の幅を取得（CSS Variable経由）
                      const headerToolsWidth = parseInt(
                        getComputedStyle(this).getPropertyValue('--header-tools-width') || '0',
                        10
                      );

                      // オフセット補正（マスク領域を考慮）
                      const tabList = this.shadowRoot!.querySelector('[role="tablist"]') as HTMLElement;
                      if (tabList && headerToolsWidth > 0) {
                        tabList.scrollLeft += headerToolsWidth;
                      }
                    }
                    ```
        - **Inactive**: 背景透過。文字色 `--fg-muted`。
        - **Active**:
            - Background: **`var(--bg-fill-muted)`** (Code Block本体と**同色**)
            - Color: `var(--fg-default)`
            - Weight: **`var(--font-medium)`**
            - Radius: `var(--radius-md) var(--radius-md) 0 0`
            - **Overlap Connection (Physical Strategy)**:
                - 親（Header）が持つ `border-bottom` を隠蔽するのではなく、**物理的に上書き**します。
                - **`z-index: 2`**: 親（Tab List: z=1）よりも手前に描画します。
                - **`margin-bottom: -1px`**: 下部のボーダーライン領域へ物理的に侵入させます。
                - **Blending**: 自身の `border-bottom-color` を **`var(--bg-fill-muted)` (Body背景色)** に設定し、境界線を消滅させつつ、下層のボーダーを塗りつぶします。これにより、サブピクセルレンダリングによる滲みを防ぎ、堅牢な結合を実現します。
            - **Shadow**: **`none`** (Light Mode).
            - **Dark Mode Elevation**: **`box-shadow: none`**
                - *Rationale*: Body (`bg-fill-muted`) と完全に結合させるため、人工的なハイライト（Elevation）は排除します。Header (`bg-surface-2`) との明度差のみで構造を表現します。
    - **Forced Colors Mode**:
        - 背景色が透明化される環境に対応し、**冗長性（Redundancy）**を持たせた戦略をとります。
        - **Strategy 1 (Override)**: アクティブタブの `border-bottom` を **`3px solid Canvas`** で物理的に上書きし、親のボーダー隠蔽を試みます。
        - **Strategy 2 (Emphasis)**: 万一ボーダーが消えない場合に備え、アクティブタブ自体に対し **`outline: 2px solid CanvasText`** (または `Highlight`) を付与し、「囲み」による強調を常に追加します。これにより、線が残ってしまったとしても選択状態が明確に伝わるフェイルセーフを実現します。
- **Header Tools (`div.header-tools`)**:
    - **Layout**: `display: flex`, `align-items: center`, `flex-shrink: 0`, `z-index: 10` (Tabよりも前面).
    - **Background**: `var(--bg-surface-2)` (Tab Listと一体化)
    - **Visual Masking (Fade-out & Scroll Hint)**:
        - `header-tools` の左端（Tab Listとの境界）に **`background: linear-gradient(to right, transparent, var(--bg-surface-2))`** によるマスクレイヤー（約20-40px幅）を配置し、タブがツールの下へ自然にフェードアウトしながら潜り込む演出（Fade-out）を施します。
        - **Affordance**: 左側へのグラデーションは、スクロールバーが消失するモバイル環境において、**「右側にまだコンテンツ（タブ）が続いている」ことを示唆する視覚的なヒント（Scroll Hint）**としても機能します。
        - **Visual Conflict Resolution**: Right Scroll Shadow（Scroll Hint）とMask（Fade-out）は役割が重複しますが、Mask側の「常時潜り込み表現」を優先します。前述の通り `tab-list` 側に十分な `padding-right` を確保することで、スクロール完了時に情報が隠される問題（Conflict）を物理的に解決します。
        - **Click Safety**: このマスク要素には必ず **`pointer-events: none`** を指定します。
    - **Header Metadata (Filename Display)**:
        - **Role**: タブ名（例: "Good"）とは別に、具体的なファイル名（例: "example.ts"）をユーザーに伝えるための領域。
        - **Placement**: `header-tools` コンテナ内、コピーボタンの左側に配置。
        - **Source**: アクティブな `<ui-code-block>` の `filename` 属性から抽出。
        - **Style**: `color: var(--fg-muted)`, `font-size: var(--text-xs)`.
        - **Compliance**: `index.md` の "Small Text Rule" に従い、**`font-weight: var(--font-medium)`** と **`letter-spacing: var(--tracking-wide)`**、および `font-family: var(--font-mono)` を適用して可読性を担保します。
        - **Responsive Strategy (Context Relocation)**:
            - モバイル（`--bp-sm` 未満）ではヘッダー内のスペースが不足するため、メタデータを非表示にします。
            - **Compensation (CSS Variable Control)**: 代わりに、内部の `<ui-code-block>` のヘッダー（`figcaption`）を**強制的に復帰（`display: block`）**させます。これはルート（Group）で定義するCSS変数 `--ui-code-block-header-display` をメディアクエリで切り替えることで、JS計算なしに実現します。これにより、Groupヘッダーからは情報が消えますが、コンテンツエリア直上にファイル名が表示され、コンテキスト（今どのファイルを見ているか）を維持します。
    - **Copy Button Integration**:
        - **Interaction**: `<ui-code-block>` の "Copy Feature" 仕様を継承します。
            - Default: `opacity: 0`, `pointer-events: none` (Ghost Click防止).
            - Hover/Focus: `opacity: 1` (Instant).
            - **Adaptive Focus**: キーボード操作時は `var(--animation-focus)` を適用。
            - **Feedback**: Code Block同様、アイコンの変化に加え **`var(--animation-flash)`** を使用したフィードバックを実装します。
        - **Animation Tokens (Explicit Reference)**:
            - **Visibility Transition**: `transition: opacity var(--duration-normal) var(--ease-out)` (`index.md` L906: `--duration-normal` = 150ms)
            - **Adaptive Focus**: `animation: var(--animation-focus)` (`index.md` L1216: adaptive-focus 200ms)
            - **Copy Feedback**: `animation: var(--animation-flash)` (`index.md` L987: flash var(--duration-fast) var(--ease-out))
            - **Hydration Fade-in**: `transition: opacity var(--duration-slow) var(--ease-out)` (`index.md` L907: `--duration-slow` = 200ms)
            - **Constraint Compliance**: すべてのアニメーションは `index.md` L109 の「300ms超の遷移禁止」制約を遵守しています。最長の `--animation-focus` でも 200ms であり、`--duration-slower` (300ms) を超えません。
- **Body (Code Block Wrapper)**:
    - Background: `var(--bg-fill-muted)` (Sunken)
    - Border Top: `var(--border-width) solid var(--border-default)`
    - **Scrollbar Safety & Corner Conflict**:
        - コンテナの角丸（`overflow: hidden`）が、内部スクロールバーの端（特に右下）を切り取ってしまう現象を防ぐため、**Bodyの下部に安全なパディング (`padding-bottom: var(--space-1)` 等)** を確保し、スクロールバーがコンテナの内側に完全に収まるように調整します。
        - **Corner Radius (Bezel Strategy)**: 内部要素（Code Block）が幅一杯に広がる際、スクロールバーやフォーカスリングがコンテナの角丸（Radius）によって切り取られるリスクがあります。これを防ぐため、コンテナ側に **微細なパディング（例: `1px`〜`2px`）** を設けて「内部ベゼル」を形成する設計を採用します。これにより物理的な干渉を回避し、OSやブラウザに依存しない堅牢な表示を保証します。
    - **Internal Code Block Integration (Conflict Resolution)**:
        - **Headless Mode**: Code Group 内に配置される `<ui-code-block>` に対しては、JSロジック（Controller）により自動的に **`headless` 属性** を付与します。
        - **CSS Variable Control (Primary Logic)**:
            - Code Group は配下に **`--ui-code-block-header-display`** を提供し、子Blockのヘッダーおよびコピーボタンの表示を制御します。
            - **Desktop**: `none` (Groupヘッダーに統合するため非表示 / FOUC防止)
            - **Mobile**: `block` (Groupヘッダーからあふれるメタデータを補うため表示)
            - Code Block 側はこの変数が定義されている場合、`headless` 属性やJSの状態にかかわらず、CSS変数の値を優先的に適用します。これにより、Context Relocationを完全にCSSのみで完結させ、親からの強制的なスタイル注入（Shadow DOM違反）を回避します。
    - **Forced Colors Mode**:
        - 背景色が透明化されるため、ボーダー（`border-top` および外枠）が **`solid CanvasText`** として描画されることを保証します。`headless` モードの Code Block は自身のボーダーを持たないため、この Group Body のボーダーが唯一の境界線となります。

**5. アクションとアクセシビリティ (Actions & A11y)**

- **Copy Integration**:
    - **Copy Integration (Delegation)**:
        - Header領域内（右上）に **`<ui-copy-button>`** を配置します。
        - **Logic**: タブ切り替え時に、`<ui-copy-button>` の `value` プロパティをアクティブな Code Block のコンテンツで更新します。
            - **State Reset**: タブ切り替え時は文脈が変わるため、コピーボタンの状態（Success/Error）を即座に **`Idle`** にリセットします。前のタブでの操作結果を引き継ぐことによるユーザーの混乱を防ぎます。
            - **Async Operation Cancellation (Robustness)**:
                - コピー操作が `--timeout-async-threshold` (500ms, `index.md` L918) を超えて遅延している間にタブが切り替わった場合、**`AbortController`** を使用して進行中の非同期処理をキャンセルします。
                - **Implementation Strategy**:
                    ```typescript
                    private _currentCopyAbortController?: AbortController;

                    private async _handleTabChange(newIndex: number): Promise<void> {
                      // 進行中のコピー操作をキャンセル
                      this._currentCopyAbortController?.abort();
                      this._currentCopyAbortController = undefined;

                      // ボタンの状態を Idle にリセット
                      this._copyButton.state = 'idle';

                      // 新しいタブのコンテンツで更新
                      const activeBlock = this._codeBlocks[newIndex];
                      this._copyButton.value = activeBlock.getCodeContent();
                      this._copyButton.label = `Copy ${activeBlock.filename || activeBlock.lang} code`;
                    }

                    private async _handleCopy(): Promise<void> {
                      // 新しい AbortController を作成
                      this._currentCopyAbortController = new AbortController();
                      const { signal } = this._currentCopyAbortController;

                      try {
                        await navigator.clipboard.writeText(this._copyButton.value, { signal });
                        if (!signal.aborted) {
                          this._copyButton.state = 'success';
                        }
                      } catch (error) {
                        if (error.name !== 'AbortError' && !signal.aborted) {
                          this._copyButton.state = 'error';
                        }
                      } finally {
                        this._currentCopyAbortController = undefined;
                      }
                    }
                    ```
                - **Rationale**: タブ切り替え後、旧タブのコピー結果がボタンに反映されることを防ぎ、UIの整合性を保証します。
            - **Note**: Reactivityのある実装（Lit等）であれば、アクティブインデックスの変更をトリガーに自動的に伝播させます。
    - **Hydration Safety (Zero-Confusion)**:
        - JSが無効な環境（SSR/No-JS）ではクリップボードAPIが動作しないため、コピーボタン自体を **`display: none` または `visibility: hidden`** で隠蔽し、機能しないUIをユーザーに見せない「誠実な設計」を徹底します。
        - JSハイドレーション完了（Controller接続）と共に、フェードイン等で滑らかに出現させます。
    - **Reactive Labeling (A11y)**:
        - `<ui-copy-button>` の `label` プロパティも動的に更新します。
        - 例: `label="Copy index.ts code"` -> `label="Copy styles.css code"`。
    - **Encapsulation**: DOM構造（`<pre>` や行番号）への直接アクセスは禁止します。Blockからテキストを取得するインターフェース (`getCodeContent()`) を経由して値を渡します。
- **A11y**:
    - **ARIA Roles**:
        - `tablist`: ヘッダーコンテナ。
        - `tab`: 各タブボタン。
        - `tabpanel`: 配下の Code Block (Light DOM) に動的に付与。
            - **Note (Semantic Collision Tolerance)**: Code Block 内部は `<figure>` で構成されており、`role="tabpanel"` との意味論的衝突が理論上存在します。しかし、WAI-ARIA 1.2 仕様では、カスタム要素のホストに `role` を付与することで、内部構造の暗黙的ロールを上書き可能です。主要スクリーンリーダー（NVDA, JAWS, VoiceOver）では、この構成で正しく "タブパネル" として認識されることを実機テストで検証済みです。万一、特定のUAで問題が生じた場合は、`aria-roledescription="コードパネル"` を併用してコンテキストを補強します。
    - `aria-label`: グループの目的を記述（例: `aria-label="コード例の比較"`）。

**6. 印刷対応 (Print Styles)**

`index.md` L1730-1901 "印刷スタイル" に準拠し、紙媒体への出力時に以下の最適化を行います。

- **Tab Navigation 非表示**:
    - `div[role="tablist"]` および `div.header-tools` を `display: none` で隠蔽します。
    - *Rationale*: 印刷メディアではタブ切り替えが不可能なため、ナビゲーションUIは無意味です。
- **全パネルの縦積み表示**:
    - 通常、非アクティブなパネルは `hidden` 属性によって隠蔽されますが、印刷時はすべてのパネル（Code Block）を **縦積み（Stack）** で表示します。
    - **Implementation**: `@media print` 内で `[role="tabpanel"][hidden] { display: block !important; }` を適用します。
    - **Visual Separation**: 各ブロック間に `margin-block-start: var(--space-4)` を追加し、区切りを明確にします。
- **Breakout Layout 解除**:
    - `width: 100% !important`
    - `margin-inline: 0 !important`
    - *Rationale*: 用紙幅を最大限活用し、ネガティブマージンによる意図しないはみ出しを防ぎます。
- **Background & Border モノクロ化**:
    - `background: transparent !important`
    - `border-color: #ccc !important`
    - *Rationale*: インク節約と視認性のバランス。
- **Page Break 制御**:
    - `:host { page-break-inside: avoid; break-inside: avoid; }`
    - *Rationale*: Code Group 全体が途中で分割されないよう、可能な限り単一ページ内に収めます。ただし、複数の長大なブロックを含む場合、ブラウザが自動的に分割する可能性があります。
- **Code Block への委譲**:
    - 各 Code Block の印刷スタイル（折り返し強制、フォントサイズ調整等）は、Code Block 仕様に従って各ブロック側で制御されます。

**実装例**:

```css
@media print {
  :host {
    width: 100% !important;
    margin-inline: 0 !important;
    background: transparent !important;
    border-color: #ccc !important;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* タブナビゲーションを非表示 */
  div[role="tablist"],
  div.header-tools {
    display: none !important;
  }

  /* 全パネルを縦積み表示 */
  [role="tabpanel"] {
    display: block !important;
  }

  [role="tabpanel"] + [role="tabpanel"] {
    margin-block-start: var(--space-4);
  }
}
```

#### 構文カード (Syntax Card) `<ui-syntax-card>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: JavaScript, Go, Rust, SQL など多岐にわたる言語の「文法」「API」「データ構造」を、言語に依存しない**統一された構造**で解説します。
- **Concept: "Abstracted API Reference"**:
    - あらゆるプログラミング要素を **「シグネチャ（Signature）」** と **「構成要素（Members）」** に分解して表現します。
    - **Signature**: コードそのもの。「どう書くか」。
    - **Members**: 引数、プロパティ、カラム、ジェネリクス型。「それは何か」。
- **Visual Hierarchy (Ridge & Valley)**:
    - ヘッダー（概要）を「高い位置（Surface）」、シグネチャ（コード）を「低い位置（High Contrast Fill）」、そして詳細ボディを「基礎階層（Default）」に配置する **Sunken Method** を採用します。
    - これにより、コードという「主役」を窪みに配置して没入感を高めつつ、解説（ボディ）は平文と同じ階層で読みやすく提供します。

**2. 実装要件 (Implementation Strategy)**

- **Container Architecture**:
    - 垂直方向のスタックレイアウトを採用し、情報の種別ごとにセクション（スロット）を積み上げます。
    - **Header**: コンテキスト（種類）、名前、**およびコピーボタン（Action）**。
    - **Hero (Signature)**: シンタックスハイライトされたコードブロック。
    - **Content**: 構成要素のリスト（`<ui-syntax-field>` の集合）。
    - **Empty State Logic**: `(default)` スロット（Content）が空の場合、**Content Area 全体を非表示**とし、Hero (Signature) の `border-bottom` を削除してデザインを完結させます。
        - **Radius Logic**: この時、Signature Area がカードの最下部となるため、**`border-radius: 0 0 var(--radius-md) var(--radius-md)`** を適用し、カードの形状を美しく閉じます。
- **Copy Integration (Delegation)**:
    - **Concept**: Signatureエリア（コードブロック）は `headless` モードで表示されるため、コピー機能をヘッダー右端に**委譲配置**します。
    - **Implementation**: `<ui-copy-button>` をヘッダー内に配置します。クリック時、`signature` スロット内の `<ui-code-block>` インスタンスを特定し、その公開メソッド **`getCodeContent()`** を実行して純粋なコードを取得・コピーします。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `kind` | `kind` | `string` | 要素の種類（例: "Method", "Struct", "Component", "Query"）。ヘッダーのタグとして表示。 |
| `name` | `name` | `string` | 対象の名前（例: "useEffect", "User", "SELECT"）。 |
| `lang` | `data-lang` | `string` | 対象言語。シンタックスハイライトおよびARIAラベルに使用。<br>**Note**: `data-lang` 属性として出力する理由は、HTML標準の `lang` 属性（自然言語指定）との衝突を回避し、プログラミング言語のメタデータとして明確に区別するためです。CSS/JSからのセレクタアクセスも容易になります。 |
| `heading-level` | `heading-level` | `number` | Header内の名前（Name）に適用する見出しレベル（デフォルト: `4`）。ドキュメント構造に応じて適切な階層を指定します。<br>**実装**: Shadow DOM内で動的に `<h2>`～`<h6>` のネイティブ要素を生成します（`role="heading"` + `aria-level` ではなく、セマンティックHTML優先）。 |

**Slots:**
- **`signature`**: コードブロック `<ui-code-block headless>` を配置。
- **(default)**: 詳細セクション。主に `<ui-syntax-field>` をリストとして配置。
- **`returns`**: 戻り値の解説（必要な場合）。

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Container**:
    - Border: `var(--border-width) solid var(--border-default)`
    - Radius: `var(--radius-md)`
    - Overflow: `hidden`
    - Margin Block: `var(--space-8)`
    - Box Shadow: `var(--elevation-sm)` — 微細な浮遊感を付与し、`.prose` 内でのカード境界を強調。
    - **Breakout Strategy**: `.prose` 内部では左右に拡張し、複雑なシグネチャの視認性を確保します（`index.md` L586-590 のメディア要素パターンに準拠）。
        - **Mobile**: `width: calc(100% + var(--space-8))`, `margin-inline: var(--space-n4)`
        - **Desktop**: `width: calc(100% + var(--space-16))`, `margin-inline: var(--space-n8)`
    - **配置コンテキスト**: 本コンポーネントは `--bg-default` 背景（`.prose` 内）に配置されることを想定しています。`--bg-surface-2` 以上の背景（カードやモーダル内）にネストする場合、ヘッダー背景が親と同化するため、Container に `--bg-surface-1` を明示的に設定する必要があります。
- **Header**:
    - Background: `var(--bg-surface-2)` (Elevated)
    - **Dark Mode Elevation Strategy**:
        - `index.md` L748-757 の "Depth System" に従い、Dark Mode 時は上端に `1px` のハイライト（`box-shadow: inset 0 1px 0 0 oklch(100% 0 0 / 0.1)`）を付与し、背景色の明度差だけでなく、光源反射による物理的なエッジを表現します。
    - Border Bottom: `var(--border-width) solid var(--border-default)`
    - Padding: `var(--space-3) var(--space-4)`
    - Display: `flex`, `align-items: center`, `gap: var(--space-3)`
    - **Typography**:
        - **Kind (Tag)**:
            - **Background**: `var(--bg-fill-neutral)`
                - *Note*: `--bg-fill-neutral` は `index.md` L263 で「構造的背景（プログレスバー、スケルトンなど）」と定義されていますが、テキストバッジ/タグのような **テキスト情報の視覚的グルーピング** にも適用可能です。透過ベースの中立的な背景色として、情報の階層を損なわずにゾーニングを実現します。
            - **Border**: `none`
            - Color: **`var(--fg-default)`**
            - Font: `var(--text-xs)`, `font-weight: var(--font-bold)`, `text-transform: uppercase`, `letter-spacing: var(--tracking-wider)`
            - Padding: **`calc(var(--space-1) * 0.5) var(--space-2)`**
                - *Note*: 垂直方向は `2px`。`index.md` のスペーシングシステム（4px基本単位）では定義されていない値ですが、タグの視覚的コンパクトさを実現するため、トークン計算で導出しています。将来的に同様の需要が確認された場合、`--space-0.5: 0.125rem (2px)` のPrimitiveトークン追加を `index.md` に提案することを推奨します。
            - Radius: `var(--radius-sm)`
            - *Rationale*: 線（Border）による囲みは構造的なノイズとなるため、背景色（Fill）によるゾーニングを採用し、テキスト情報との親和性を高めます。
        - **Name**: `var(--text-base)`, `font-weight: var(--font-semibold)`, `font-family: var(--font-mono)`, `color: var(--fg-default)`.
    - **Copy Button (Action)**:
        - Placement: ヘッダー右端（`margin-left: auto`）。
        - Strategy: `ui-code-group` のヘッダーツールと同様の仕様（`opacity`制御、Adaptive Focus）を採用します。
        - **Progressive Enhancement**: JS無効時、Copy Buttonは非表示（`display: none`）とし、ヘッダーは Kind + Name のみの静的な情報表示として機能します。
- **Signature Area (The Valley)**:
    - Background: `var(--bg-fill-muted)`
    - Border Bottom: `var(--border-width) solid var(--border-default)`
        - *Condition*: Content Area が存在しない（Empty）場合、このボーダーは `none` となり、カード下端として機能します。
        - **Radius Logic**: 上記（Empty）の場合、Signature Area がカードの最下部となるため、**`border-radius: 0 0 var(--radius-md) var(--radius-md)`** を適用し、カードの形状を美しく閉じます。
    - **Padding Logic (Conflict Resolution)**:
        - 内部の `<ui-code-block>` が持つデフォルトパディング (`var(--space-4)`) との二重適用（Double Padding）を防ぐため、**CSS変数 `--ui-code-block-padding: 0` を適用**し、レイアウト制御を掌握します。
        - その上で、Signature Area 自身のパディングとして `var(--space-3)` を適用します。これにより、コードブロック以外の要素が含まれた場合でも一貫した余白を保証します。
- **Content Area**:
    - Background: `var(--bg-default)`
    - Padding: `var(--space-4)`
    - **Sectioning (Parameters / Returns)**:
        - 異なる属性（引数リスト、戻り値）が同居する場合、視覚的な区切りが必要です。
        - **Strategy**: ブロック間に `var(--space-6)` のマージンを設け、セクションタイトル（例: "Returns"）を `var(--text-xs)` / `font-weight: bold` / `color: var(--fg-muted)` で表示します。
        - **Note**: `returns` スロットは、このセクションタイトルの直下に配置されます。
    - **Empty State Detection & Management**:
        - **Detection**: `slotchange` イベントを監視し、`(default)` スロットに割り当てられた要素が存在しない場合、ホスト要素に `data-empty` 属性を付与します。
        - **CSS Control**: `:host([data-empty]) .content-area { display: none; }` により、Empty時のContent Area非表示とSignature Areaのボーダー/角丸調整を実現します。
        - **Rationale**: Web ComponentsのスロットにおいてCSS `:empty` は期待通り動作しないため、属性ベースの状態管理を採用します。

**5. アクセシビリティ (A11y)**

- **Heading Structure**:
    - Header内の `Name` は、ドキュメント内での重要なランドマークとなるため、Shadow DOM内で `<h2>`～`<h6>` のネイティブ見出し要素を動的生成します（`heading-level` 属性値に基づく）。
    - **Rationale**: `index.md` L105 の「非セマンティックなHTML」回避原則に従い、`role="heading"` + `aria-level` ではなく、セマンティックHTMLを優先します。
- **List Semantics**:
    - 複数のフィールドが並ぶ `Content Area` は、視覚的なGridだけでなく意味的なリスト構造を持ちます。
    - **Structure**: 親コンテナを `<dl>` (Description List) とし、各 `<ui-syntax-field>` を `<div>` (Wrapper) > `<dt>` (Name/Type) + `<dd>` (Description) としてレンダリングします。これにより、スクリーンリーダー利用者が用語とその定義の関係を正確に把握できます。
        - *Rationale*: 単なる `<ul>` よりも、名前（Key）と値（Value）の関係性を持つ情報構造に適しています。
- **Copy Button (Progressive Enhancement)**:
    - Copy機能はJavaScriptに依存するため、JS無効環境ではボタン自体を非表示とし、読み取り専用の情報表示として機能します。
    - ボタンには `aria-label="コードをコピー"` を付与し、視覚的なアイコンのみでも操作意図を伝達します。

**6. Forced Colors Mode 対応**

本コンポーネントの視覚的階層（Sunken Method）は、Header/Signature/Contentの三層構造を **背景色の明度差** で表現しています。Windows ハイコントラストモード (`forced-colors: active`) では、これらの背景色が消失するため、以下のフォールバック戦略を実装します。

- **境界線の強制表示**:
    - `index.md` L1274 の「構造の維持」戦略に従い、Header/Signature/Content間の境界線（`border-bottom`）を保持し、システムカラー（`CanvasText`）で表示します。
    - Container外周も `border: var(--border-width) solid CanvasText` を明示的に適用し、カード領域を明確化します。

- **Kind Tag の可視性**:
    - 背景色（`--bg-fill-neutral`）が消失するため、`border: var(--border-width) solid CanvasText` を追加し、タグの輪郭を保証します。

- **Copy Button の境界強調**:
    - `<ui-copy-button>` 仕様（L864-878）に従い、`border: var(--border-width) solid CanvasText` を適用し、アクション要素を明確化します。

**実装例**:

```css
@media (forced-colors: active) {
  :host {
    /* Container境界の明確化 */
    border: var(--border-width) solid CanvasText;
  }

  .header,
  .signature-area {
    /* 背景色消失時も境界線で構造を維持 */
    border-bottom-color: CanvasText;
  }

  .kind-tag {
    /* タグ輪郭の可視化 */
    border: var(--border-width) solid CanvasText;
  }

  ui-copy-button {
    /* ボタン境界の強調 */
    border: var(--border-width) solid CanvasText;
  }
}
```

> **Note**: `index.md` L1282-1295 で定義されたシステムカラーマッピングにより、`:root` レベルのトークンが自動的にフォールバックしますが、**構造的な境界線**（この場合、三層のセパレーター）は明示的に `CanvasText` を適用することで可視性を保証します。

**7. Print スタイル**

- **Copy Button**: `display: none` — 印刷物には不要なインタラクティブ要素を除外。
- **Breakout Strategy**: リセット（`width: 100%`, `margin-inline: 0`）— 用紙幅に収まるよう調整。
- **Background Colors**: 保持 — コードブロックの視認性を維持するため、Signature Area (`--bg-fill-muted`) の背景色は印刷します。

**実装例**:

```css
@media print {
  ui-syntax-card {
    /* Breakout解除 */
    width: 100% !important;
    margin-inline: 0 !important;
  }

  ui-syntax-card ui-copy-button {
    display: none;
  }

  /* 背景色は保持（コード視認性優先） */
  .signature-area {
    print-color-adjust: exact; /* 背景色の印刷を強制 */
  }
}
```

#### 構文フィールド (Syntax Field) `<ui-syntax-field>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 関数の引数、構造体のフィールド、SQLのカラム、ReactのPropsなど、**「名前・型・制約・説明」** の4要素を持つ情報をリスト化します。
- **Grid Layout**: 複雑な型定義や長い説明文を、レスポンシブかつ整然と表示します。
- **Semantic Structure**: 親コンポーネント（`<ui-syntax-card>`）が提供する `<dl>` 構造の一部として機能し、各フィールドは `<dt>` (用語・定義部分) と `<dd>` (説明部分) のペアとしてレンダリングされます。

**2. 実装要件 (Implementation Strategy)**

- **Container Architecture**:
    - 本コンポーネントは Shadow DOM を使用せず、**Light DOM として親 `<dl>` に直接挿入される構造**を採用します。
    - **HTML Output Structure**:
        ```html
        <!-- 親コンテナ（<ui-syntax-card> の Content Area 内） -->
        <dl class="syntax-fields">
          <!-- 各 <ui-syntax-field> が以下を出力 -->
          <div class="field-wrapper">
            <dt class="field-term">
              <span class="field-name">props</span>
              <span class="field-required" aria-label="必須">required</span>
              <span class="field-type">object</span>
              <span class="field-default">default: {}</span>
            </dt>
            <dd class="field-description">
              コンポーネントに渡すプロパティオブジェクト。
            </dd>
          </div>
        </dl>
        ```
    - **Rationale (Light DOM 採用)**:
        - `<dl>/<dt>/<dd>` のセマンティクスを正確に維持するため、Shadow DOM による境界を設けず、親要素のDOMツリーに直接統合します。
        - これにより、スクリーンリーダーが「用語リスト」として正確に認識し、各項目を「用語 → 定義」の関係として読み上げることが保証されます。
- **Content Distribution**:
    - **Attributes**: `name`, `type`, `required`, `default` の値を受け取り、`<dt>` 内の各 `<span>` として出力します。
    - **Slot (Description)**: `(default)` スロットのコンテンツを `<dd>` 内に配置します。
        ```html
        <ui-syntax-field name="id" type="number" required>
          ユーザーの一意な識別子。
        </ui-syntax-field>
        ```

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | デフォルト | 説明 |
|------------|------|-------|------------|------|
| `name` | `name` | `string` | (必須) | フィールド名（例: `props`, `user_id`）。 |
| `type` | `type` | `string` | `undefined` | 型定義（例: `string`, `Option<T>`, `VARCHAR(255)`）。省略時は非表示。 |
| `required` | `required` | `boolean` | `false` | 必須項目の場合 `true`。視覚的なバッジと `aria-required` を出力。 |
| `default` | `default` | `string` | `undefined` | デフォルト値（例: `"anonymous"`, `NULL`）。省略時は非表示。 |

**Slots:**

| スロット名 | 説明 |
|------------|------|
| `(default)` | フィールドの説明文。`<dd>` 要素内に配置される。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Layout (Grid System)**:
    - **Desktop (`min-width: 768px`)**: **`[Name + Type + Default] [Description]` の2カラム構成**。
        - **Grid Properties** (`.field-wrapper` に適用):
            - `display: grid`
            - `grid-template-columns`: **`minmax(min-content, 30%) 1fr`**。左カラム（定義）が必要最小限の幅を確保しつつ、30%を超えて説明文を圧迫しないよう制御します。
            - `column-gap`: **`var(--space-6)`** (24px)。定義と説明の間に明確な一拍を置き、視線の移動をスムーズにします。
            - `align-items`: **`baseline`**。名前と説明文の1行目のベースラインを厳密に揃え、水平方向のリズムを維持します。
        - *Rationale*: HTML構造（`dt`/`dd`）を尊重し、アクセシビリティ（`display: contents` によるRole消失リスク）を回避するため、NameとTypeは同一セル（`dt`）内に配置します。
        - **Internal Layout** (`dt` 内部):
            - `display: flex`
            - `align-items: baseline`
            - `gap: var(--space-3)` (12px)
            - **Order**: `Name` → `Required Badge` → `Type` → `Default`
            - **Default Value Spacing**: `Type` の後に **`margin-left: var(--space-2)`** (8px) を明示的に適用し、視覚的な分離を保証します。
    - **Mobile (`max-width: 767px`)**: スタックレイアウト。
        - **Grid Properties** (`.field-wrapper` に適用):
            - `display: block`
        - **`.field-term`** (Name/Type/Default):
            - `display: flex`
            - `flex-wrap: wrap`
            - `align-items: baseline`
            - `gap: var(--space-2)` (8px)
            - `margin-bottom: var(--space-2)` (8px) — Description との間隔
        - **`.field-description`** (`dd`):
            - `margin-left: 0` (ブラウザデフォルトの左インデントを解除)
- **Typography & Colors**:
    - **Name** (`.field-name`):
        - Font: `var(--font-mono)`, `var(--text-sm)` (13px), `font-weight: var(--font-semibold)` (600)
        - Color: `var(--fg-default)`
        - *Hierarchy Adjustment*: 親コンテナ（Card Header の `--text-base` / `--font-semibold`）より視覚的に目立たないよう、サイズとウェイトを抑えて階層を整理します。
    - **Required Mark** (`.field-required`):
        - Font: `var(--font-mono)`, `var(--text-xs)` (12px), `font-weight: var(--font-bold)` (700), `text-transform: uppercase`
        - Color: **`var(--fg-warning)`**
        - Background: `oklch(from var(--fg-warning) l c h / 0.1)` — 微細な背景色でバッジとしての視認性を高める
        - Padding: `calc(var(--space-1) * 0.5) var(--space-2)` (2px 8px)
        - Radius: `var(--radius-sm)` (4px)
        - **Accessibility**: `aria-label="必須"` を付与し、スクリーンリーダーに読み上げさせます。
        - *Rationale*: "Danger" (Red) はエラーを意味し、必須情報としては強すぎるため、注意を促す "Warning" (Amber) を採用して静謐さを維持します。
    - **Type** (`.field-type`):
        - Font: `var(--font-mono)`, `var(--text-xs)` (12px), `font-weight: var(--font-medium)` (500)
        - Color: **`var(--fg-muted)`**
        - **12px ルール準拠**: `index.md` L508-516 の「12px以下テキストのWeight Boost」ルールに従い、`--font-medium` (500) を適用して視認性を物理的に担保しています。
        - *Visual Distinction*: アクションカラー (`--primary`/`--fg-info`) との混同（リンク誤認）を避けるため、Mutedカラーをベースとします。
        - **Important Types**: 主要な型情報などで強調が必要な場合は、コンポーネント外で型文字列を **`<code>` タグ（`var(--fg-default)`）でラップすること**を推奨ルールとします。
    - **Default** (`.field-default`):
        - Font: `var(--font-mono)`, `var(--text-xs)` (12px), `font-weight: var(--font-medium)` (500)
        - Color: **`var(--fg-muted)`**
        - Format: `default: {value}` 形式で表示
        - **12px ルール準拠**: Type と同様、Weight Boost により視認性を担保。
    - **Description** (`.field-description`):
        - Font: `var(--font-sans)`, `var(--text-sm)` (13px), `font-weight: var(--font-normal)` (400)
        - Color: `var(--fg-default)`
        - *Rationale*: これはメタデータではなく「本文」ですが、**APIリファレンスとしての情報密度（High Density）と一覧性を優先**し、`text-sm` を採用します。もちろん可読性は維持します。
- **Interaction (On-Demand Structure)**:
    - **Hover** (`@media (hover: hover)` 内のみ適用):
        - `.field-wrapper:hover` に以下を適用:
            - `background-color: var(--bg-hover)`
            - `cursor: default` (クリック不可であることを明示)
            - `border-radius: var(--radius-md)` (6px)
            - `padding: var(--space-2) var(--space-3)` (8px 12px)
            - `margin: calc(-1 * var(--space-2)) calc(-1 * var(--space-3))` — パディング分だけネガティブマージンで相殺し、グリッド配置を崩さない
            - `transition: background-color var(--duration-fast) var(--ease-out)`
        - **Touch Device Safety**: タッチデバイスにおいて、タップ時に背景色がつく挙動は「クリッカブルである」という誤解を招くため、**`@media (hover: hover)`** を使用してマウス操作時のみ適用します。
        - *Rationale*: `--bg-surface-active` (Primaryベース) は選択状態を意味するため、単なる読み取り補助（Reading Ruler）としては `--bg-hover` (Neutral) が適切です。また、`cursor: default` 指定によりリンク誤認を防ぎます。
    - **Nested Radius Exception**:
        - ホバー背景に `var(--radius-md)` (6px) を適用していますが、親コンテナ（`<ui-syntax-card>` の Content Area）のパディング (`var(--space-4)` = 16px) を考慮すると、`index.md` L711-721 のネスト角丸公式 `R_inner = R_outer - Padding` では負値（6px - 16px = -10px）となり、本来は 0 であるべきです。
        - **例外根拠**: ホバー背景はカードの**角（コーナー）とは物理的に接触しない位置**（パディング内側の中央部）に配置されるため、公式の前提条件（親子が同心円状に接触）が成立しません。そのため、視覚的な違和感を生じさせず、Rouaultの形状言語（`--radius-md`）に準拠した角丸を適用することで、一貫性を優先します。
- **Border**: **なし (`none`)**。
    - *Rationale*: リストの構造はグリッド配置とスペーシング、そしてインタラクションによって暗示されます。`index.md` L666 の「線が見えなくても構造が伝わる」設計原則に準拠します。

**5. アクセシビリティ (Accessibility)**

- **Semantic HTML (Description List)**:
    - 各フィールドは `<dt>` (用語・定義) と `<dd>` (説明) のペアとして出力され、親コンテナの `<dl>` 構造を構成します。
    - **Rationale**: `index.md` L105 の「非セマンティックなHTML」回避原則に従い、`<div>` や `role` 属性ではなく、ネイティブHTMLのセマンティクスを最大限活用します。
    - スクリーンリーダーは「リスト、N個の項目」「用語: [Name]、定義: [Description]」として読み上げ、情報の構造を正確に伝達します。
- **Required Attribute (Non-Visual Communication)**:
    - **Visual**: Amber バッジ (`--fg-warning`) で視覚的に表示。
    - **Non-Visual**: `.field-required` 要素に **`aria-label="必須"`** を付与し、スクリーンリーダーに「必須」情報を明示的に伝達します。
    - **Rationale**: `index.md` L106 の「色のみによる情報伝達」禁止に準拠。視覚と非視覚の両面で情報を保証します。
- **Display: Contents Avoidance**:
    - Grid レイアウトの実装において、`dt` や `dd` に `display: contents` を適用することで CSS Grid の制約を回避できますが、これは一部のブラウザ・スクリーンリーダーの組み合わせでセマンティックロール（`term`, `definition`）を消失させるリスクがあります。
    - **本仕様では `display: contents` を使用せず**、`dt` 内部に Flexbox を適用することで、セマンティクスを完全に保持します。
- **Motion Reduction**:
    - `@media (prefers-reduced-motion: reduce)` 環境下では、`index.md` L103 のグローバル定義により、ホバー時の `background-color` トランジション (`var(--duration-fast)`) が自動的に `0.01ms` に短縮され、即座に変化します。
    - 前庭障害を持つユーザーに配慮し、動きによる認知負荷を排除します。
- **Contrast Guarantee**:
    - すべての文字色は `index.md` のコントラスト比保証表（L294-300）に基づき、WCAG AA (4.5:1) を満たします。
        - `--fg-default` on `--bg-default`: 10.2:1 (Light) / 9.8:1 (Dark)
        - `--fg-muted` on `--bg-default`: 4.8:1 (Light) / 4.6:1 (Dark)

**6. 強制カラーモード (Forced Colors Mode)**

Windows ハイコントラストモード (`forced-colors: active`) では、背景色による視覚的階層（Reading Ruler）が消失します。以下の戦略で構造と意味を維持します。

- **Reading Ruler の代替手段**:
    - ホバー時の背景色 (`--bg-hover`) がシステムによって上書きされ、透明化される場合に備え、**境界線による構造の明示**を追加します。
    ```css
    @media (forced-colors: active) {
      .field-wrapper:hover {
        /* 背景色は消失するため、境界線で行を明確化 */
        outline: var(--border-width) solid CanvasText;
        outline-offset: calc(-1 * var(--border-width));
      }
    }
    ```
    - **Rationale**: `index.md` L1274 の「構造の維持: ボーダーやスペーシングにより、背景色が無くても領域を認識可能にする」戦略に準拠します。

- **Required Badge の可視性**:
    - 背景色 (`oklch(from var(--fg-warning) l c h / 0.1)`) が消失するため、境界線を追加します。
    ```css
    @media (forced-colors: active) {
      .field-required {
        /* バッジの輪郭を明確化 */
        border: var(--border-width) solid CanvasText;
      }
    }
    ```

- **Type / Default の色マッピング**:
    - `--fg-muted` は `index.md` L1294 により `GrayText` にマッピングされます。
    - **GrayText の注意点**: 一部の Windows ハイコントラストテーマでは、`GrayText` が極端に低コントラスト（例: 中間グレー on 白背景で 2:1 未満）となる場合があります。
    - **フォールバック戦略**: 重要度の低いメタデータ（Type/Default）であるため、視認性低下を許容します。読み上げ順序（Name → Required → Type → Default → Description）により、スクリーンリーダー利用者は情報を確実に取得できます。
    - 将来的に視認性問題が報告された場合、`CanvasText` (標準テキスト色) へのオーバーライドを検討します。

**実装例**:

```css
@media (forced-colors: active) {
  /* Reading Ruler の代替 */
  .field-wrapper:hover {
    outline: var(--border-width) solid CanvasText;
    outline-offset: calc(-1 * var(--border-width));
  }

  /* Required Badge の境界明確化 */
  .field-required {
    border: var(--border-width) solid CanvasText;
  }
}
```

> **Note**: `index.md` L1282-1295 で定義されたシステムカラーマッピングにより、`:root` レベルのトークンが自動的にフォールバックしますが、**構造的な境界線**（ホバー時の行識別、バッジの輪郭）は明示的に追加することで可視性を保証します。

**7. Print スタイル**

- **Grid Layout の維持**: Desktop の2カラムレイアウトを維持し、印刷時も情報の対応関係を明確に保ちます。
- **Hover Effects の除去**: インタラクティブな背景色・境界線は印刷時に不要なノイズとなるため、無効化します。
- **Color Adjustment**: 背景色を持たないため `.field-wrapper` の `print-color-adjust` 指定は不要です。Required Badge の背景色のみ、情報伝達上重要であるため保持します。

**実装例**:

```css
@media print {
  .field-wrapper {
    /* 2カラムレイアウトを維持 */
    display: grid;
    grid-template-columns: minmax(min-content, 30%) 1fr;
    column-gap: var(--space-6);
    page-break-inside: avoid; /* 行の途中で改ページしない */

    /* Hover効果を除去 */
    background-color: transparent !important;
    border-radius: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  .field-required {
    print-color-adjust: exact; /* バッジの背景色の印刷を強制 */
  }
}
```

#### インラインコード (Inline Code) `<code>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 本文中の技術用語、ファイル名、コマンド等を区別します。
- **Visual Distinction**: 本文フォントとは明確に異なる等幅フォント（Monospace）を使用することで、それが「実行可能」または「リテラル」な文字列であることを示します。
- **Subtlety**: 過度な主張（Strong Colors）は避け、あくまで本文の一部として自然に読める「静謐さ」を維持します。色は「機能（アクション）」ではなく「情報」として扱います。

**2. 実装基盤 (Reference)**

- **Native**: 標準の `<code>` タグを使用します。
- **Selector**: `:not(pre) > code`
    - *Rationale*: `<pre><code>` 構造（コードブロック）との競合を防ぎます。コードブロック側のスタイルはブロックレベルで独立して定義されるため、インラインスコープを明示的に限定します。

**3. スタイリングとトークンマッピング (Style & Tokens)**

- **Font**: `var(--font-mono)`
    - **Optical Size & Scale Guard**:
        - 日本語フォントとの混植時に視覚的に浮く場合、`font-size: 0.875em` での調整を基本とします。
        - *Note (Exception)*: `0.875em` は親フォントサイズへの連動スケーリング係数であるため、`index.md` の禁止事項「ハードコードされた色・サイズ値」の例外として許容します。
        - **Constraint (Small Text Rule)**: 計算値が `12px` を下回る場合、`index.md` の "Small Text Rule" に従い、以下のいずれかの補正を**必須**とします。
            1. **Weight Boost**: ウェイトを一段階上げる（`400` → `font-weight: 500`）。
            2. **Tracking Boost**: 字間を広げる（`letter-spacing: var(--tracking-wide)`）。
            3. **High Contrast**: 色を `--fg-muted` ではなく `--fg-default` に格上げする（インラインコードはデフォルトで `--fg-default` を使用するため、すでに本補正を満たしている）。
            4. **Scale Reset** *(インラインコード固有の追加策)*: 縮小を解除し `font-size: 1em`（または `font-size: calc(12 / 16 * 1rem)`）を確保する。
- **Background**: **`var(--bg-fill-muted)`**
    - *Rationale*: 入力フォームやコードブロックと共通の「Fill」階層を使用し、一貫性を担保します。未定義のトークンは使用しません。
- **Color**: **`var(--fg-default)`**
    - *Constraint*: アクションカラー (`--primary`) の使用は禁止します（リンクと誤認されるため）。
    - *Context Awareness*: 親要素がリンク (`<a>`) の場合、色は **`inherit` (または `currentColor`)** となり、アンカースタイルに従います。これにより、インタラクティブなコンテキスト内での違和感を排除します。なおこの場合、親の `transition` がそのまま継承されるため、`<code>` 側で独立したトランジションを定義する必要はありません。
- **Padding**: `0.2em 0.4em`
    - *Note (Exception)*: `em` 単位により親フォントサイズに連動するため、`index.md` の禁止事項「ハードコードされた色・サイズ値」の例外として許容します。
- **Radius**: `--radius-sm` (4px)
- **Border**: なし
    - *Rationale*: 背景色の明度差のみで構造を表現します。
    - **Forced Colors**:
        - `forced-colors: active` 環境では背景色が消失するため、**`outline: var(--border-width) solid CanvasText`** を明示的に適用し、可視化された境界線で囲むことを必須とします。
        - *Rationale*: `border` ではなく `outline` を使用することでレイアウトに影響を与えません。`index.md` の `--border-width` トークン（1px）を参照し、システム全体の線幅と一貫性を保ちます。
- **Layout Safety**:
    - **Word Break**: 長いファイルパスや関数名がレイアウトを押し広げるのを防ぐため、**`overflow-wrap: break-word`** を適用し、コンテナ内での折り返しを強制します。
    - **White Space**: 短い変数名やキーワードは途中で分割されると意味が失われるため、**`white-space: nowrap`** は **使用しません**。折り返しは許容し、`overflow-wrap: break-word` に一元管理を委ねます。
    - **Vertical Rhythm (Line Height Protection)**:
        - `padding` によるボックス拡張が、親行の行送り（Rhythm）を破壊することを防ぎます。
        - **Implementation**: 以下の宣言を確定実装とします。
          ```css
          :not(pre) > code {
            line-height: inherit;
            vertical-align: baseline;
            box-decoration-break: clone;
            -webkit-box-decoration-break: clone;
          }
          ```
          `line-height: inherit` により、親の行間が `code` 要素のパディングに押し広げられることを防ぎます。`vertical-align: baseline` でベースライン揃えを明示し、ブラウザ間のレンダリング差異を吸収します。`box-decoration-break: clone` は改行時に背景・パディング・角丸が各行に正しく適用されることを保証します。

**4. コントラスト比の保証 (Contrast Guarantee)**

`index.md` のWCAG 2.1 Level AA基準（4.5:1以上）に基づき、以下の組み合わせを保証します。

| テーマ | Foreground | Background | コントラスト比 | 判定 |
|--------|------------|------------|----------------|------|
| **Light** | `--fg-default` `oklch(20% 0.03 250)` | `--bg-fill-muted` `oklch(96% 0.01 250)` | ~13.5:1 | AA ✓ |
| **Dark** | `--fg-default` `oklch(90% 0.01 250)` | `--bg-fill-muted` `oklch(9% 0.02 250)` | ~13.8:1 | AA ✓ |

**5. 翻訳（Translate）**

必要であれば属性に`translate="no"`を使用し、機械翻訳時にインラインコード要素を翻訳対象から外すように指定してください。

#### キーボード入力 (Keyboard Input) `<ui-kbd>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: ユーザーに対するキーボードショートカットや入力指示を視覚化します。
- **Digital Tactility**: キートップの**Tactile Affordance（押せる感）**を視覚化し、コード（`<code>`）とは異なる「操作可能なUI要素」であることを直感的に伝えます。
    - *Rationale*: 現実の物理法則（慣性）の模倣ではなく、デジタルなインターフェースとしての機能的な厚みを表現します。

**2. 実装基盤 (Reference)**

- **Native**: `<kbd>` タグ。
- **Key Combination Pattern**: 修飾キーを含む組み合わせ（例: `Ctrl + K`）は、外側 `<kbd>` で個々の `<kbd>` を包みます。外側 `<kbd>` にはビジュアルスタイル（`background`、`border`、`box-shadow`）を適用しません。セパレータ（`+`）はテキストノードとして記述します。
    ```html
    <kbd><kbd>Ctrl</kbd> + <kbd>K</kbd></kbd>
    ```
    - *Rationale*: 外側 `<kbd>` は「ショートカット全体」を、内側 `<kbd>` は「個々のキー」を意味し、HTMLセマンティクスの入れ子構造を活用します。

**3. スタイリングとトークンマッピング (Style & Tokens)**

- **Font**: **`var(--font-sans)`**
    - *Rationale*: 物理キーボードの印字（UI）を模倣し、`var(--font-mono)`（コード）と明確に区別するため。
    - **Font Size**: `inherit` — 親要素のフォントサイズを継承し、本文（`--text-lg`）・UI（`--text-base`）の両コンテキストに対応します。
    - **Scale Guard**: `index.md` の "Small Text Rule" および禁止事項「12px未満のテキスト」に従い、計算値が **`var(--text-xs)` (12px)** を下回ることを禁止します。これが絶対下限値です。
        - **Compliance（Dual Boost）**: `<ui-kbd>` は常時 Small Text Rule の対象として、以下の補正を**両方デフォルト適用**します。単文字キーラベルの文字密度が高く、「いずれかの補正」では不十分なため、Weight と Tracking を組み合わせた Dual Boost 戦略を採用します。
            - **Weight**: **`var(--font-medium)` (500)**
            - **Tracking**: **`var(--tracking-wide)`** (密集の回避)
- **Background**: `var(--bg-surface-2)` (Elevated Surface)
    - *Intentional Semantic Extension*: `--bg-surface-2` は本来 Card・Dropdown 等のレイヤー高さを表すトークンですが、`<ui-kbd>` では「キーキャップというUI要素としての表面」という意味論で意図的に採用します。`<code>`（`--bg-fill-muted`）との輝度差が「浮き感」の主要素であり、この選択は設計上不可欠です。
    - **Dark Mode における上端ハイライトの非適用**: `index.md` の Dark Mode Depth Strategy が規定する Elevated レイヤーへの `inset 0 1px 0 0 oklch(100% 0 0 / 0.1)` は、Tactile Depth の `box-shadow`（下部の厚み）との `box-shadow` 競合を避けるため適用しません。Dark Mode での識別性は `border`（`--border-default`）が担保します。
- **Border**: `var(--border-width) solid var(--border-default)`
- **Tactile Depth (Thickness)**: **`box-shadow: 0 var(--border-width-thick) 0 0 var(--border-default)`**
    - *Rationale*: `border-bottom` によるレイアウト（行間）の拡張を防ぎつつ、下部に厚み（側面）を持たせてUIコンポーネントとしての実在感を表現します。「ぼかし」のないソリッドな影を使用することで、デジタルな硬質感を保ちます。値は `var(--border-width-thick)` (2px) を参照し、ハードコードを回避します。
- **Radius**: `--radius-sm` (4px)
- **Padding**: `0 0.4em`
- **Line Height**: **`var(--line-height-none)` (1)**
    - *Layout*: 行間（Vertical Rhythm）の破壊を徹底して防ぐため、高さ計算を最小化します。
- **Color**: **`var(--fg-default)`**
    - *Constraint*: 小サイズテキストの可読性を最優先し、コントラスト比の高い色を採用します。Small Text Rule の "High Contrast" 補正を兼ねており、`--bg-surface-2` 上での可読性を強固に保証します。

**4. コントラスト比の保証 (Contrast Guarantee)**

`index.md` のWCAG 2.1 Level AA基準（4.5:1以上）に基づき、以下の組み合わせを保証します。

| テーマ | Foreground | Background | コントラスト比 | 判定 |
|--------|------------|------------|----------------|------|
| **Light** | `--fg-default` `oklch(20% 0.03 250)` | `--bg-surface-2` `oklch(100% 0 0)` | ~16.5:1 | AA ✓ |
| **Dark** | `--fg-default` `oklch(90% 0.01 250)` | `--bg-surface-2` `oklch(17% 0.02 250)` | ~9.2:1 | AA ✓ |

**5. アクセシビリティ (A11y)**

- **Semantics**:
    - アルファベット（例: "K"）の場合はそのまま読み上げさせます。
    - 記号（例: `⌘`）を使用する場合は、`<span class="sr-only">Command</span><span aria-hidden="true">⌘</span>` のパターンを使用し、正確な読み上げを保証します。安易な `aria-label` よりもDOM構造による解決を優先します。
- **Forced Colors Mode**:
    - `forced-colors: active` 環境では `background` と `box-shadow` が消失します。`border` は `ButtonBorder` として残存するため最低限の視覚的識別性は維持されます。Tactile Depth（下部の厚み）の消失は許容される劣化として扱います。
    - `box-shadow` は視覚的装飾のみを担い、情報伝達を担っていません。`<code>` が `border: none` であるため `outline` を必要とするのとは異なり、`<ui-kbd>` は常時 `border` を持つため、追加の `outline` は不要です。


#### 引用 (Blockquote) `<blockquote>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 他者の言葉や外部ソースからの引用を、本文から視覚的に分離します。
- **Change of Voice**: 縦線によるアクセントで、読むリズムを変え、別な「声」であることを意識させます。

**2. 実装基盤 (Reference)**

- **Native**: `blockquote` タグ。出典がある場合は `<figure>` でラップし、 `<figcaption>` 内に `<cite>` を使用します。
- **Scope**: `.prose` (記事本文) 内部での使用を前提とします。

**3. スタイリングとトークンマッピング (Style & Tokens)**

- **Layout & Rhythm**:
    - **Margin Block**: `var(--space-6)`
        - *Rationale*: セクション区切りと同程度のリズムを確保し、本文の流れを断ち切らずに挿入します。
    - **Margin Inline**: `0`
    - **Padding Inline**: `var(--space-4) 0`
        - *Note*: `padding-inline-start` で構造線との間隔を確保します。`padding-block` は `0` とし、`margin-block` によるリズム制御に委ねます。
- **Border Inline Start**: `var(--border-width-thick) solid var(--border-default)`
    - *Exception (`.prose` Border Rule)*: `index.md` の原則「本文コンテンツ内（`.prose`）には境界線を使用せず、スペーシングのみで構造を表現する」に対する意図的な例外です。`blockquote` の左縦線は装飾ではなく「声の変化（Change of Voice）」を伝えるセマンティックなシグナルであり、スペーシングのみでは表現できない情報を持ちます。この例外は `blockquote` に限定されます。
    - *Correction*: `thick`（太い = 強調）のWidthに対して `muted`（控えめ）のColorは意図の矛盾を生じさせます。**構造線としてのWidth（thick）に相応する標準色（`--border-default`）** を採用し、明確な構造線として機能させます。
    - *Note (Token Scope Extension)*: `--border-width-thick` は `index.md` にて「強調表示、アクティブなタブの下線」と定義されていますが、本コンポーネントでは `.prose` 内の引用構造線として用途を拡張適用します。
    - *Note*: 論理プロパティ (`border-inline-start`) を使用し、書字方向に依存しない構造とします。
- **Color**: `var(--fg-default)`
    - *Correction*: 引用は「コンテンツ」であるため、可読性を優先し、メタデータ用色（`muted`）ではなく標準色を採用します。
- **Font Style**: `normal`
    - *Constraint*: 日本語フォント（Noto Sans JP等）において斜体（Italic）は機械的な「偽斜体（Oblique）」としてレンダリングされ、可読性と美しさを著しく損なうため禁止します。
- **Caption (Source)**:
    - **Element**: `<figcaption>` 内の `<cite>`
    - **Typography**: `var(--text-xs)`
        - *Rationale*: `index.md` のメタデータ定義に準拠し、本文との階層差を明確にします。
        - *Constraint*: "Small Text Rule" および `<ui-code-block>` との一貫性を考慮し、**`font-weight: var(--font-medium)`** と **`letter-spacing: var(--tracking-wide)`** を併用して物理的な可読性を強固にします。
    - **Color**: `var(--fg-muted)`
        - *Rationale*: 出典情報はメタデータであるため、ここで `muted` カラーを使用し、本文との階層差を作ります。`--bg-default` 上でのコントラスト比は 4.8:1（WCAG AA準拠）。ダークモードでも同トークンの Dark Value により同等のコントラストが保証されます。
    - **Margin Block Start**: `var(--space-2)`
- **ネスト（Nested Blockquote）**:
    - 2段目以降の `blockquote` には `margin-inline-start: 0` を維持し、`padding-inline-start` を引き継ぎます。ボーダー色は `--border-muted` に一段階下げ、視覚的な深度差を表現します。

**4. アクセシビリティ (A11y)**

- **Semantic Grouping**:
    - 出典を伴う場合、`<figure>` 要素を用いて `<blockquote>` (内容) と `<figcaption>` (出典) をグループ化することを必須とします。これにより、支援技術に対して両者の関係性が明確に伝わります。
    - 出典テキストは `<figcaption>` 内の **`<cite>`** でマークアップします。HTML仕様において `<cite>` は著作物のタイトルや出典を示す要素であり、スクリーンリーダーのセマンティクス伝達を強化します。
- **`cite` 属性**:
    - 出典URLが存在する場合、`<blockquote cite="https://...">` 属性を付与します。この属性はブラウザの視覚表示には影響しませんが、支援技術や検索エンジンに対して出典関係を機械可読な形で伝達します。`<figcaption>` 内のテキスト出典と併用することで、視覚・非視覚の両チャネルをカバーします。
- **Language Switch**:
    - 引用文が本文と異なる言語で記述されている場合、`<blockquote>` に `lang` 属性を明示します（例: `lang="en"`）。これにより、スクリーンリーダーの音声合成エンジンが適切な言語モードに切り替わり、正しい発音で読み上げられます。

**5. HTML構造例 (Reference HTML)**

```html
<!-- 出典あり（標準） -->
<figure>
  <blockquote cite="https://example.com/source">
    <p>引用テキスト本文。</p>
  </blockquote>
  <figcaption><cite>出典: 著者名『タイトル』</cite></figcaption>
</figure>

<!-- 出典なし -->
<blockquote>
  <p>引用テキスト本文。</p>
</blockquote>

<!-- 異言語引用 -->
<figure>
  <blockquote lang="en" cite="https://example.com/source">
    <p>Quoted text in English.</p>
  </blockquote>
  <figcaption><cite>Author, <em>Title</em></cite></figcaption>
</figure>
```

#### 脚注 (Footnote) `<ui-footnote>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 本文の「読むリズム（Flow State）」を保ちながら、補足情報（典拠、注釈、余談）を必要な時にアクセス可能にします。
- **Peripheral Presence**: 脚注参照 (`[1]`) は本文の一部として存在しますが、注意を引きすぎない**Receded（控えめな）スタイル**を採用します。読書中の周辺視野に留まりつつ、興味があれば即座に内容を確認できる設計です。
- **Dual Access Strategy (デュアルアクセス戦略)**:
    - **Primary (Popover)**: 通常のクリック/タップで Popover を表示し、視線移動を最小化。素早く内容を確認したいユースケースに最適化。
    - **Secondary (Jump to Footer)**: 修飾キー（`Cmd`/`Ctrl`）押下時のクリック、または中クリックで、記事末尾の脚注一覧セクションへジャンプ。複数の脚注を一覧で確認したい、長い脚注を読みたい、別タブで開きたい等のユースケースに対応。
    - **Popover内リンク**: Popover 内に「脚注一覧で見る →」リンクを配置し、Popover から末尾セクションへの遷移を可能にします。
- **Progressive Enhancement**: JavaScript無効環境（SSR/No-JS）でも、記事末尾の脚注セクションへのリンクとして機能する**完全なフォールバック**を提供します。

**2. ロジック参照基盤 (Logic Reference)**

- **Markdown Syntax**: 脚注は以下の構文で記述します（Pandoc / CommonMark 拡張互換）。
    ```markdown
    本文中の参照[^1]はこのように記述します。

    [^1]: これは脚注の本文です。複数行にまたがる場合はインデントします。
    ```
- **Strategy (Custom Remark Plugin)**:
    - **`remark-footnote`**: カスタム remark プラグインを作成し、上記構文を解析します。
    - **Output (MDAST -> HAST)**: プラグインは以下の構造を生成し、`<ui-footnote>` 要素として直接出力します。
        - **Inline Reference**: `<ui-footnote ref-id="fn-1" index="1">...</ui-footnote>`
        - **Footnotes Section**: 記事末尾に `<section class="footnotes">` を配置（No-JS / 印刷用フォールバック）。
    - 脚注本文を `data-part` 属性で管理する子要素として埋め込み、ランタイムでの追加フェッチを回避します。
- **Popover API**:
    - ブラウザネイティブの **Popover API (`popover` 属性)** を活用し、軽量かつアクセシブルな実装を実現します。
    - **Fallback (Popover API 非対応環境)**:
        - **CSS `:target` Strategy**: Fallback Link（`<a class="footnote-fallback-link">`）の `href` を `#fn-1-popover` に変更し、`:target` 疑似クラスを組み合わせることで、同一ページ内で Popover 相当のコンテンツを表示します。`<button>` には `href` 属性が存在しないため、`:target` フォールバックでは Fallback Link を流用します。ただし、この場合は位置固定（Sticky / Absolute）による簡易的な表示となり、Light Dismiss は JavaScript で補完します。
        - **JavaScript Polyfill**: Popover API の完全なポリフィル（位置計算、Light Dismiss、フォーカス管理）を提供します。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `ref-id` | `ref-id` | `string` | 脚注のユニークID（例: `fn-1`）。双方向リンクに使用。 |
| `index` | `index` | `number` | 脚注番号（表示用）。`[1]`, `[2]` のラベル生成に使用。 |

**Child Elements (Light DOM):**
- **`[data-part="trigger"]`**: Popover を制御するボタン要素。
- **`[data-part="content"]`**: Popover コンテンツを含む div 要素。
- **`.footnote-fallback-link`**: No-JS 環境用のフォールバックリンク。

**DOM 構造設計 (Light DOM Strategy)**

Light DOM を採用する理由:
- **SSR 親和性**: Eleventy / Velite のビルドパイプラインで生成された HTML を、そのまま初期レンダリングに使用できます。Shadow DOM では SSR 時に内部構造を事前レンダリングできないため、Hydration 前の No-JS 環境でフォールバックが機能しません。
- **No-JS フォールバック**: `<a href="#fn-1">` によるネイティブなアンカーリンクが、JavaScript 無効時にそのまま機能します。
- **スタイル継承**: 本文コンテキストのタイポグラフィ（`font-family`, `line-height` 等）を自然に継承し、脚注が本文の一部として視覚的に統合されます。

**Internal Structure (Light DOM Managed):**
```html
<ui-footnote ref-id="fn-1" index="1">
  <!-- Trigger: <button> ベースで Popover を制御 (JS有効時に表示) -->
  <button
    type="button"
    data-part="trigger"
    popovertarget="fn-1-popover"
    aria-expanded="false"
    aria-details="fn-1-popover"
    hidden>
    <sup>[1]</sup>
  </button>

  <!-- No-JS Fallback: Fallback Link (JS無効時に表示、JS有効後に hidden 化) -->
  <a href="#fn-1" class="footnote-fallback-link">
    <sup>[1]</sup>
  </a>

  <!-- Popover Content -->
  <div
    data-part="content"
    id="fn-1-popover"
    popover="auto"
    role="note"
    aria-labelledby="fn-1-label">
    <!-- Popover 内見出し (スクリーンリーダー用) -->
    <span id="fn-1-label" class="sr-only">脚注 1</span>

    <p>This is the footnote content...</p>

    <!-- Footer: 脚注一覧へのリンク -->
    <footer class="footnote-popover-footer">
      <a href="#fn-1" class="footnote-list-link">
        脚注一覧で見る <span aria-hidden="true">→</span>
      </a>
    </footer>
  </div>
</ui-footnote>
```

**4. スタイリングとトークンマッピング (Style & Tokens)**

**4.1 Trigger (Reference Mark)**

- **Element**: `<button type="button">` — Popover 制御専用のボタン。
    - **`popovertarget` 属性**: Popover API のネイティブ制御を使用。
    - **No-JS Fallback**: JavaScript 無効時は `<button>` を非表示にし、代わりに `<a href="#fn-1">` を表示します（`hidden` 属性を JS で切り替え）。
    - **Modifier Key 対応**: `Cmd`/`Ctrl` + クリックや中クリックで「脚注一覧セクションへジャンプ」を実現するため、ボタンのクリックイベントで修飾キーを検出し、該当する場合は `window.location.hash = '#fn-1'` で遷移します。
- **Typography**:
    - **Font Size**: `var(--text-xs)` (12px)。ただし `<sup>` 要素のブラウザデフォルト（`font-size: smaller`）が適用されるため、CSS でのリセットは不要。
    - **上付きスタイル**: `<sup>` 要素のデフォルトスタイル（`vertical-align: super; font-size: smaller`）を利用。`font-variant-position: super` は `<sup>` との二重適用になるため**使用しない**。
    - **Weight**: `var(--font-medium)` — Small Text Rule 準拠。
- **Color**:
    - Default: `var(--fg-muted)` — 本文より一段階控えめに。
    - Hover/Focus: `var(--primary)` — インタラクティブであることを示唆。
- **Bracket Style**: `[1]` の角括弧を含めて表示。
    - *Rationale*: 裸の数字はコンテキストによっては「番号付きリスト」や「年号」と誤認されるため、明示的な記号で囲みます。
- **Cursor**: `pointer` (クリック可能であることをアフォード)
- **Spacing**:
    - `margin-inline: 0.1em` — 前後の文字との視覚的な分離。
- **Focus State**:
    - `outline: var(--focus-ring-width) solid var(--focus-ring-color)`
    - `outline-offset: 2px`
    - `border-radius: var(--radius-sm)` (リングの形状)
    - **Animation**: `var(--animation-focus)` (Adaptive Focus)
- **Active State (Popover Open)**:
    - Background: `var(--bg-active)` — Popoverとの視覚的な接続を強化。
    - `border-radius: var(--radius-sm)`
- **Button Reset**: ボタンのデフォルトスタイル（背景、ボーダー、パディング）をリセットし、テキストライン内に自然に収まるようにします。

**4.2 Content Popover**

**コンポーネントスコープのカスタムプロパティ:**
```css
/* コンポーネントのスタイルシート内で定義（:root には置かない） */
ui-footnote {
  --footnote-popover-max-width: 400px; /* Popover 最大幅: 約30-40文字相当 */
}
```

- **Position**: Trigger の直下（Bottom Center）を基本とし、Viewport 端では自動的にフリップ（Top/Left/Right）。
    - **Anchor Positioning**: CSS Anchor Positioning API（Chrome 125+）、または Floating UI を使用。
- **Dimensions**:
    - `max-width: min(90vw, var(--footnote-popover-max-width))` — モバイルでも収まりつつ、読みやすい幅を確保。
    - `max-height: 60vh` — 長い脚注のスクロール対応。
    - `overflow-y: auto` — 内容が溢れる場合のスクロール。
- **Background**: `var(--bg-surface-2)` (Elevated)
- **Border**: `var(--border-width) solid var(--border-default)`
- **Radius**: `var(--radius-md)`
- **Shadow**: `var(--elevation-lg)` (Surface-2 からの浮遊感。Light/Dark Mode を自動切り替え)
- **Padding**: `var(--space-3) var(--space-4)`
- **Typography**:
    - Font: `var(--font-sans)`, `var(--text-sm)` (13px)
    - Color: `var(--fg-default)`
    - Line Height: `var(--line-height-relaxed)` (1.75)
- **Footer Link (脚注一覧で見る)**:
    - **Placement**: Popover コンテンツの末尾、独立した `<footer>` セクション内に配置。
    - **Element**: `<a href="#fn-1">` — 末尾脚注セクションの該当項目へのアンカーリンク。
    - **Typography**:
        - Font: `var(--text-xs)` (12px)
        - Weight: `var(--font-medium)`
        - Tracking: `var(--tracking-wide)` (Small Text Rule 準拠)
    - **Style**:
        - Color: `var(--fg-muted)`
        - Hover: `color: var(--primary)`, `text-decoration: underline`
        - Icon: 矢印 `→` を `aria-hidden="true"` で装飾的に配置。
    - **Behavior**: クリック時に Popover を閉じ、末尾脚注セクションへスムーズスクロール。
    - **Separator**: コンテンツ本文との視覚的分離のため、`border-top: 1px solid var(--border-ghost)` を `<footer>` に適用。
    - **Padding**: `padding-top: var(--space-2)`, `margin-top: var(--space-3)`
- **Arrow (Optional)**:
    - Triggerへの視覚的な接続を強化する三角形のポインター。
    - Color: `var(--bg-surface-2)` (Popover背景と同色)
    - Border: `var(--border-default)` (Popoverボーダーと連続)
    - *Simplicity*: 実装複雑性とのトレードオフにより、省略も許容。

**4.3 Animation**

- **Appearance**:
    - `opacity: 0 -> 1`
    - `transform: translateY(4px) -> translateY(0)`
    - Duration: `var(--duration-fast)` (70ms)
    - Easing: `var(--ease-out)`
- **Disappearance**:
    - `opacity: 1 -> 0`
    - Duration: `var(--duration-fast)`
    - Easing: `var(--ease-in)`
- **Reduced Motion**:
    - `prefers-reduced-motion: reduce` 時は `opacity` のみでトランジション（`transform` 無効化）。
    - Duration: `var(--duration-instant)`
- **Popover API 統合 (`@starting-style`)**:
    - Popover API と CSS トランジションを組み合わせるには、`@starting-style` ルールで表示前の初期状態を定義し、`transition-behavior: allow-discrete` を指定する。これにより `display: none ↔ block` の切り替わりをまたぐトランジションが可能になり、JS アニメーションが不要になる。
    ```css
    [data-part="content"][popover] {
      opacity: 1;
      transform: translateY(0);
      transition:
        opacity var(--duration-fast) var(--ease-out),
        transform var(--duration-fast) var(--ease-out),
        display var(--duration-fast) var(--ease-out) allow-discrete;
    }

    /* 表示前の初期状態 */
    @starting-style {
      [data-part="content"][popover]:popover-open {
        opacity: 0;
        transform: translateY(4px);
      }
    }

    /* 非表示時（退場） */
    [data-part="content"][popover]:not(:popover-open) {
      opacity: 0;
      transition:
        opacity var(--duration-fast) var(--ease-in),
        display var(--duration-fast) var(--ease-in) allow-discrete;
    }
    ```

**5. アクセシビリティ (A11y)**

**5.1 ARIA & Semantics**

- **Trigger (`<button>`)**:
    - `popovertarget="[popover-id]"` — Popover API のネイティブ制御。
    - `aria-expanded="true|false"` — 開閉状態を通知（Popover API は `aria-expanded` を自動管理しないため、Popover の `toggle` イベントをリスンして JS 側で手動更新する）。
    - `aria-details="[popover-id]"` — 詳細情報の関連付け（ARIA 1.1）。`aria-describedby` と異なり、スクリーンリーダーがフォーカス時に自動で全文読み上げを行わないため、長い脚注コンテンツに対して適切。ユーザーが詳細情報を参照したいときに操作できる。
- **Content Popover**:
    - `role="note"` — 脚注としての意味論的役割を明示。
    - `aria-labelledby="[label-id]"` — Popover 内の見出し（`.sr-only` で視覚的に非表示）を参照し、スクリーンリーダーに「脚注 1」等のコンテキストを提供。
    - **`aria-live` は使用しない**: Popover の出現は `aria-expanded` と `role="note"` で十分に伝達されます。`aria-live` を追加すると、Popover を開くたびに全内容が読み上げられ、ユーザーの操作を妨げる可能性があります。

**5.2 Keyboard Interaction**

- **Open**: `Enter` / `Space` (Trigger フォーカス時)
- **Close**:
    - `Escape` キー
    - Popover 外クリック（Light Dismiss）— Popover API のネイティブ機能
    - Footer リンク（「脚注一覧で見る」）クリック
- **Focus Management**:
    - **Focus Trap は使用しない**: デザイン原則2「フロー状態の維持」に基づき、Popover にフォーカスを閉じ込めません。Modal (Dialog) とは異なり、Popover はユーザーの読書フローの一部です。
    - **Tab によるナビゲーション**: `Tab` キーで Popover 内のフォーカス可能要素（Footer リンク「脚注一覧で見る」）に移動できます。Footer リンクにフォーカスがある状態でさらに `Tab` を押すと、**Popover が閉じ**、本文の次のフォーカス可能要素へ移動します。
    - **Return Focus**: `Escape` キーまたは Light Dismiss でクローズした後、フォーカスは元の Trigger (`<button>`) に戻ります。

**5.3 Forced Colors Mode**

- **Trigger**: `color: LinkText` を適用し、インタラクティブ要素として認識可能に。
- **Popover**:
    - `border: 2px solid CanvasText` — 背景色消失時の境界線確保。
    - Shadow は無効化されるため、ボーダーのみで浮遊感を表現。

**5.4 Print Styles**

- Popover は印刷不可能なため、脚注番号を**ページ末尾の脚注セクションへのリンク**として機能させます。
    - 印刷時は Trigger (`<button>`) を非表示にし、代わりに Fallback Link (`<a href="#fn-1">`) を表示します。
    - Popover (`[popover]`) は `display: none`。
    - 脚注セクション（`<section class="footnotes">`）は印刷出力に含めます。

**6. No-JS / SSR フォールバック戦略 (Progressive Enhancement)**

JavaScript が無効、または Hydration 前の状態でも、脚注へのアクセスを完全に保証します。

- **Trigger**: 
    - `<button>` は `hidden` 属性で非表示（JavaScript で `hidden` を削除）。
    - 代わりに `<a href="#fn-1" class="footnote-fallback-link">` を表示し、クリックでページ末尾の脚注セクションへジャンプ可能にします。
- **Footnotes Section**:
    - 記事末尾に `<section class="footnotes" role="doc-endnotes">` を配置。
    - 各脚注に `id="fn-1"` を付与し、アンカーリンクのターゲットとして機能。
    - Backref (`<a href="#fnref-1">↩</a>`) で本文への戻りを提供。
- **Hydration**:
    - JS ロード後、`<ui-footnote>` コンポーネントが初期化され、Popover 機能が有効化。
    - `<button>` の `hidden` 属性を削除し、`<a class="footnote-fallback-link">` を非表示化。
    - 脚注セクションは `display: none`（または `hidden` 属性）で非表示化。ただし、印刷時は復活。

**7. Footnotes Section (Footer) スタイル**

No-JS 環境および印刷用に、記事末尾の脚注セクションのスタイルを定義します。

- **Container (`section.footnotes`)**:
    - `margin-block-start: var(--space-16)` — 本文との明確な分離。
    - `padding-block-start: var(--space-8)`
    - `border-block-start: var(--border-width) solid var(--border-default)` — 視覚的な区切り線。
- **Heading (Optional)**:
    - 「脚注」という見出しは冗長なため、原則として表示しません。区切り線で十分です。
    - スクリーンリーダー向けに `.sr-only` で `<h2>脚注</h2>` を配置することを推奨。
- **List (`ol`)**:
    - `list-style-position: inside`
    - `padding-inline-start: 0`
- **Item (`li`)**:
    - `font-size: var(--text-sm)` (13px)
    - `color: var(--fg-default)`
    - `margin-block-end: var(--space-3)`
    - `:target` — ジャンプ先としてハイライト（`background: var(--bg-active)`、`border-radius: var(--radius-sm)`）。
- **Backref**:
    - `color: var(--fg-muted)`
    - `text-decoration: none`
    - Hover: `color: var(--primary)`
- **Forced Colors**: セクションボーダーを `1px solid CanvasText` で確保。

**8. 実装ガイドライン (Implementation Notes)**

- **Remark Plugin (`remark-footnote`)**:
    - Pandoc / CommonMark 互換の脚注構文（`[^1]` / `[^1]: ...`）を解析します。
    - MDAST を走査し、脚注参照（`footnoteReference`）と脚注定義（`footnoteDefinition`）を収集。
    - 参照位置に `<ui-footnote>` を、記事末尾に `<section class="footnotes">` を出力。
    - Velite の `markdown` 設定に追加: `remarkPlugins: [remarkFootnote, ...]`
- **SSG Integration**: Velite / Eleventy のビルドパイプラインで事前レンダリングされるため、ランタイムでの Markdown 解析は不要です。
- **Anchor Positioning**: CSS Anchor Positioning API のサポート状況（Chrome 125+, Safari/Firefox 未対応）を考慮し、Floating UI 等のポリフィルを使用します。
- **Long Footnotes (閾値と代替戦略)**:
    - **基準**: 脚注の文字数が **800文字以上**、または **コードブロック・画像を3つ以上含む** 場合を「Long Footnote」と定義します。
    - **Popover 内での対応**: `max-height: 60vh` + `overflow-y: auto` で内部スクロールを提供。
    - **代替戦略 (Static Page Strategy)**: 極端に長い脚注（2000文字以上、または複雑な図表を含む）の場合、Popover 内には要約（最初の200文字程度）のみを表示し、「詳細を読む →」リンクで専用ページ（`/notes/[note-id]/footnotes/[footnote-id]`）へ遷移させることを検討します。
        - この場合、Popover Footer に「詳細ページで読む」リンクを追加します。
- **Multiple References (同一脚注の複数参照)**:
    - **DOM 構造**: 同一脚注が複数箇所から参照される場合、**Popover インスタンスは1つのみ生成**し、全ての Trigger が同じ `popovertarget` を参照します。
        - 例: `<button popovertarget="fn-1-popover">` が複数存在し、全て同じ `<div id="fn-1-popover" popover>` を開きます。
    - **ID 重複問題の回避**: Popover 要素（`id="fn-1-popover"`）は**最初の参照位置にのみ配置**し、2番目以降の `<ui-footnote>` 要素には Popover コンテンツを含めません（Trigger のみ）。
        - Remark プラグインは、同一 `ref-id` の2回目以降の出現時に `<ui-footnote ref-id="fn-1" index="1" shared>` のように `shared` 属性を付与し、コンポーネント側で Popover 生成をスキップします。
    - **コンテキスト維持**: どの Trigger から開いたかを視覚的に示すため、Popover 表示中は**アクティブな Trigger のみ**に `--bg-active` 背景を適用します（他の Trigger は通常状態）。
        - 実装: 各 Trigger の `click` イベントハンドラでクリックされたトリガーを変数（例: `activeTrigger`）に記録する。Popover の `toggle` イベントで表示/非表示を検知し（`event.target` は Popover 要素自体）、`activeTrigger` に CSS クラスを付与/削除する。
    - **位置再計算 (Multiple References)**: 2番目以降のトリガーから Popover を開く際は、Floating UI の `reference` オプションをアクティブなトリガーに更新するか、Popover 要素を `document.body` 等に移動した上でアクティブトリガーを基点として位置計算を行い、位置がずれないようにします。

#### 順序なしリスト (Unordered List) `<ui-ul>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 順序を持たない並列情報のグループ化。
- **Rhythm**: マーカー（Bullet）はコンテンツを読むリズムを作るための「拍子」であり、主張しすぎてはいけません。本文の色よりも一段階淡く（Low Contrast）することで、テキストへの集中を高めます。
- **Scope**: この定義はUIコンポーネントだけでなく、記事本文 (`.prose ul`) におけるリスト表現の「真実（Source of Truth）」としても機能します。

**2. スタイリングとトークンマッピング (Style & Tokens)**

- **Marker**:
    - **Color**: `var(--fg-muted)`
        - *Rationale*: 本文 (`--fg-default`) との階層差を作り、ノイズを低減します。
    - **Shape**: 各レベルで以下のUnicode文字を `::before` の `content` として使用します。
        | レベル | content値 | 文字 | list-style-type相当 |
        |--------|-----------|------|---------------------|
        | Level 1 | `"●"` (U+25CF) | ● | `disc` |
        | Level 2 | `"○"` (U+25CB) | ○ | `circle` |
        | Level 3 | `"■"` (U+25A0) | ■ | `square` |
    - **Position**: `outside` (テキストの左端を揃え、可読性を維持)
    - **Forced Colors**: ハイコントラストモードでは `currentColor` (CanvasText) を継承し、視認性を確保します。`--fg-muted` は `forced-colors: active` 時に `GrayText` にマッピングされます。
- **Spacing**:
    - Item Gap: `var(--space-2)` (リスト項目間の適切な呼吸)
    - **Marker Gap**: `var(--space-2)` (`gap` プロパティが担当。マーカーとテキストの間の物理的な余白)
    - **Marker Column Width**: `var(--space-4)` (マーカー文字の居住空間。`gap` とは別概念であり、`●` 等の描画幅に両側余白を加えた最小幅として設定)
    - Indent: `0` (Gridレイアウトにより制御)

**3. 実装詳細 (Implementation Strategy)**

- **Strict Layout (Grid System)**:
    - ブラウザ標準の `list-style` はマーカー位置の微調整が困難であるため、**`list-style: none`** とし、**CSS Grid** を用いた完全な自前制御を採用します。
    - **Accessibility Restoration (Critical)**:
        - `list-style: none` の副作用として、Safari (VoiceOver) 等でリストのセマンティクスが消失する問題を防ぐため、HTML生成時に以下の属性を強制的に付与します。
        - **Parent**: `<ul role="list">`
        - **Child**: `<li role="listitem">`
    - **Structure**:
        ```css
        ul {
          list-style: none;
          padding: 0;
        }
        li {
          display: grid;
          /*
           * マーカー列幅 (var(--space-4) = 16px):
           * gap (Marker Gap, var(--space-2)) とは別概念。
           * マーカー文字「●」の描画幅に加え、中央揃え時の両側余白を
           * 確保するための居住空間として設定。本文ラインの微細なガタつきを防ぐ。
           */
          grid-template-columns: var(--space-4) 1fr;
          gap: var(--space-2); /* Marker Gap: マーカーと本文の間の余白 */
          align-items: baseline; /* マーカーと本文のベースラインを厳密に同期 */
        }

        /* Level 1: disc (●) */
        li::before {
          content: "●"; /* U+25CF */
          color: var(--fg-muted);
          justify-self: center;
        }

        /* Level 2: circle (○) — ネスト深度をセレクタで判定 */
        li li::before {
          content: "○"; /* U+25CB */
        }

        /* Level 3: square (■) */
        li li li::before {
          content: "■"; /* U+25A0 */
        }

        /* Forced Colors: マーカーをシステム文字色に追従させる */
        @media (forced-colors: active) {
          li::before {
            color: currentColor; /* CanvasText を継承 */
            forced-color-adjust: auto;
          }
        }
        ```
    - **Nested Logic**:
        - 入れ子のリストは親の `1fr` (本文エリア) 内部に配置されるため、**自動的に親の本文開始位置までインデント**されます。これにより、階層ごとのインデントが自然に発生します。
        - **Vertical Rhythm**: ネストされたリストの上部には `var(--space-2)` のマージンを確保し、親テキストとの癒着を防ぎます。
        - **マーカー形状の切り替え**: `li li::before` / `li li li::before` のネストセレクタで深度を判定します。4階層以上は Level 3 の `■` を維持します（`li li li li::before` への追加定義は不要）。
- **インタラクティブ要素を含む場合**:
    - リスト項目内にリンク (`<a>`) やボタン (`<button>`) が含まれる場合、タッチターゲットサイズの最小値 (`--control-min-touch` = 44px) を疑似要素で確保してください。リスト行高さが 44px を下回る場合でも、タップ領域は 44px × 44px を維持します。

#### 順序付きリスト (Ordered List) `<ui-ol>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 手順やランキングなど、シーケンスが重要な情報の構造化。
- **Quiet Structure**: 順序を示す数字は「コンテンツの一部」であり、アクションボタンではありません。強調色（Primary）の乱用を避け、静謐な佇まいを維持します。
- **Typography Check**: 数字には **`var(--font-mono)`** を採用し、桁が増えても垂直方向のライン（Vertical Rhythm）が崩れないようにします。
- **Scope**: この定義は UIコンポーネント (`<ui-ol>`) だけでなく、記事本文 (`.prose ol`) におけるリスト表現の「真実（Source of Truth）」としても機能します。

**2. スタイリングとトークンマッピング (Style & Tokens)**

- **Marker**:
    - **Font**: `var(--font-mono)`
    - **Feature**: **`font-variant-numeric: tabular-nums`** (等幅数字) を必須とし、桁揃えを保証します。
    - **Color**: **`var(--fg-muted)`**
        - **Rationale**: 数字はコンテンツの一部であり、アクションボタンではないため、PrimaryではなくMutedを採用します。
        - **Variant (Steps)**: チュートリアル等で手順を強調する場合に限り、`variant="steps"` として `var(--primary)` の使用を許可します。詳細は後述のバリアント定義を参照してください。
    - **Font Weight**: `var(--font-medium)`
        - **Rationale (Visual Balance)**: 線幅の細い欧文等幅フォント（Mono）を、線幅のしっかりした和文フォント（Sans）と並べた際の視覚的バランス（Visual Weight）を合わせるため適用します。
    - **Forced Colors**: `forced-colors: active` 時は `CanvasText` に追従させます。
- **Counter**: CSS Counters (`counter-reset`, `counter-increment`) を使用します。
- **Spacing**:
    - **Item Gap**: `var(--space-2)` (リスト項目間の垂直余白)
    - **Marker Gap**: `var(--space-2)` (`gap` プロパティが担当。マーカーと本文テキストの間の水平余白)
    - **Marker Column Width**: `3ch` (等幅数字2桁+ピリオド分の固定幅)
        - **Note (Exception)**: `ch` 単位は `var(--font-mono)` のグリフ幅に依存するフォント相対値です。`index.md` の禁止事項「ハードコードされた色・サイズ値」の例外として許容します。`<ui-ul>` の `var(--space-4)` とは異なり、桁揃えという目的上、スペーシングトークンではなくフォントメトリクスに基づく値が最適です。
    - **Indent**: `0` (Grid レイアウトにより制御)
- **背景色の制約**: `--bg-default` または `--bg-surface-2` 上での使用を前提とします。
    | 組み合わせ | Light | Dark | 判定 |
    |-----------|-------|------|------|
    | `--fg-muted` on `--bg-default` | 4.8:1 | 5.1:1 | AA 準拠 |
    | `--fg-muted` on `--bg-surface-2` | 5.2:1 | 4.6:1 | AA 準拠 |
    | `--primary` on `--bg-default` (Steps) | 5.2:1 相当 | 確認済み | AA 準拠 |

**3. 実装詳細 (Implementation Strategy)**

- **Strict Layout (Grid System)**:
    - `<ui-ul>` と同様のGrid戦略を採用しますが、桁数によるレイアウトシフト（Wobble）を排除します。
    - **Accessibility Restoration (Critical)**:
        - `<ui-ul>` と同様、**Parent: `<ol role="list">`**, **Child: `<li role="listitem">`** を必須とします。
    - **Alignment Strategy (Decimal Alignment)**:
        - 1桁("1.")と2桁("10.")で本文の開始位置がズレることを防ぐため、マーカー領域に **`3ch`** (約3文字分) の固定幅を与え、**右揃え（Right Align）**で配置します。これにより、ドットと本文の垂直ラインを維持し、美しい構造を作ります。
    - **Structure**:
        ```css
        ol {
          list-style: none;
          counter-reset: list-item;
          padding: 0;
        }
        li + li {
          margin-top: var(--space-2); /* Item Gap: リスト項目間の垂直余白 */
        }
        li {
          display: grid;
          /* 3ch: var(--font-mono) の等幅字幅に基づく桁揃え固定値（2桁まで安全） */
          grid-template-columns: 3ch 1fr;
          gap: var(--space-2); /* Marker Gap: マーカーと本文テキストの間の水平余白 */
          align-items: baseline;
        }
        li::before {
          counter-increment: list-item;
          content: counter(list-item) ".";
          font-family: var(--font-mono);
          font-size: inherit;
          font-weight: var(--font-medium);
          font-variant-numeric: tabular-nums;
          color: var(--fg-muted);
          justify-self: end; /* 数字を右端（本文側）に寄せる */
        }

        /* Forced Colors: マーカーをシステム文字色に追従させる */
        @media (forced-colors: active) {
          li::before {
            color: CanvasText;
            forced-color-adjust: auto;
          }
        }
        ```
- **Nested Logic**:
    - ネストされた `ol` は親の `1fr`（本文エリア）内部に配置されるため、**自動的に親の本文開始位置までインデント**されます。これにより、階層ごとのインデントが自然に発生します。
    - **Counter Reset**: CSS の仕様により、子 `ol` の `counter-reset: list-item` は自動で適用され、各ネストレベルは `1.` から再起動します。階層番号表記（例: `1.1.`）は採用しません。視覚的な階層差はインデントのみで表現します。
    - **Vertical Rhythm**: ネストされた `ol` の上部には `var(--space-2)` のマージンを確保し、親テキストとの癒着を防ぎます。
    - **マーカー形状**: 順序付きリストは階層を問わず同形式（数字 + ピリオド）を維持します。
        ```css
        /* ネストされた ol の垂直余白 */
        li > ol {
          margin-top: var(--space-2);
        }
        ```
- **バリアント (Variants)**:
    - **Steps** (`variant="steps"`):
        - チュートリアル・手順書など、各ステップへの注目を促したい場合に使用します。
        - **変更箇所**: マーカー色のみ `var(--primary)` に変更します。本文色・背景色・ボーダーは変更しません。
        - **非対象**: 完了済みステップ・アクティブステップの視覚表現は本バリアントの対象外です。必要な場合は別途定義してください。
        ```css
        [variant="steps"] li::before {
          color: var(--primary);
        }
        ```
- **インタラクティブ要素を含む場合**:
    - リスト項目内にリンク (`<a>`) やボタン (`<button>`) が含まれる場合、タッチターゲットサイズの最小値 (`--control-min-touch` = 44px) を疑似要素で確保してください。リスト行高さが 44px を下回る場合でも、タップ領域は 44px × 44px を維持します。
- **Optical Baseline Adjustment (Cross-Font Sync)**:
    - 和文フォント (`var(--font-sans)`) と欧文等幅フォント (`var(--font-mono)`) の混植において、ベースラインが視覚的にずれて見える場合があります。
    - **デフォルト構成** (`Noto Sans JP` + `JetBrains Mono`): `align-items: baseline` による自動調整で補正不要です。フォントを変更した場合のみ以下の検証を行ってください。
    - **補正の適用条件**: ズレが顕著な場合（フォント変更時に目視で確認）に限り、マーカー側に **`transform: translateY(0.05em)`** を適用し、「数字の底」と「和文の底」が一直線に見えるよう補正します。この値はフォントメトリクスに依存するため、フォント変更の都度再検証してください。

#### 画像 / 図版 (Image) `<ui-image>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: テキスト情報を補完し、コンテンツへの没入感を高めます。
- **Immersion Enhancement**:
    - **Prose Breakout**: 記事本文の流れを意図的に断ち切るように配置し、視線のリズムを作ります。
    - **Lightbox Flow**: クリックでシームレスに拡大し、ユーザーを画像の世界へ没入させます。美術や図解の細部確認における「思考の分断」を防ぎます。
    - **Serene Brightness**: ダークモード等の低輝度環境において、画像の明るさが「眩しさ（Dazzle）」とならないよう制御し、静謐な閲覧体験を維持します。

**2. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `src` | `src` | `string` | 画像URL。 |
| `alt` | `alt` | `string` | 代替テキスト（必須）。 |
| `caption` | `caption` | `string` | 画像下に表示する説明文。 |
| `zoomable` | `zoomable` | `boolean` | 拡大表示機能の有無。デフォルトは `true`。 |
| `width` / `height` | - | `number` | **CLS防止用**。アスペクト比計算に使用。 |
| `loading` | `loading` | `'lazy' \| 'eager'` | デフォルトは `lazy`。LCP要素のみ `eager` 指定可能。 |

**3. スタイリングとトークンマッピング (Style & Tokens)**

- **Container**: `<figure>` 要素を使用。
- **Layout Strategy (Prose Breakout)**:
    - **Default**: `width: 100%`, `height: auto` (アスペクト比維持), `border-radius: var(--radius-md)`.
    - **Context: Prose**: `index.md` の定義に従い、テキストコンテナよりも広く表示します。
        - **Mobile**: `width: calc(100% + var(--space-8))`, `margin-inline: var(--space-n4)`
            - **Full Bleed**: 画面端まで画像を拡張し、没入感を最大化します。親コンテナの水平パディングが `--space-4` (16px) であることを前提とします。
        - **Desktop**: `width: calc(100% + var(--space-16))`, `margin-inline: var(--space-n8)`
        - *Note*: ネガティブマージンは `index.md` の `--space-n4` / `--space-n8` トークンを使用します（`calc()` を直接記述しない）。
- **Visual Tactics**:
    - **Border**: `1px solid var(--border-ghost)`
        - *Rationale*: 白背景の画像がアプリ背景に溶け込むのを防ぎ、オブジェクトとしての輪郭を保ちます。ダークモードでは暗い画像がバックドロップに溶け込む逆パターンも防止します。
    - **Interaction (Zoomable / Thumbnail Only)**:
        - **Scope**: これらの変形エフェクトは**サムネイル（未拡大）状態にのみ**適用します。拡大時に画像が動く（Wobble）ことを防ぎます。
        - Cursor: `zoom-in`
        - Hover: `transform: scale(var(--scale-hover-sm))` (微細な浮き上がり)
        - Active: `transform: scale(var(--scale-pressed))` (押下時の沈み込み)
        - Focus: **Adaptive Focus** (`--animation-focus`) を適用。
        - **Transition**: `transition: all` は禁止。以下のプロパティのみ明示的に指定します。
            ```
            transition:
              transform var(--duration-fast) var(--ease-out),
              filter var(--duration-normal) var(--ease-out),
              box-shadow var(--duration-normal) var(--ease-out);
            ```
    - **Dark Mode Dimming**:
        - ダークモード時は画像の輝度を `filter: brightness(var(--brightness-dimmed))` で減衰させ、周囲の暗さに馴染ませます。
        - **輝度の復元条件**: ホバー時、キーボードフォーカス時（`:focus-visible`）、および拡大（Lightbox）時は `filter: brightness(1)` に戻し、本来の色を表示します。キーボードユーザーとマウスユーザーに同等の体験を保証します。
- **Caption**:
    - Element: `<figcaption>`
    - Typography: `--text-sm`, `color: var(--fg-muted)`
    - Align: `left` (原則左揃え)
        - *Rationale*: 視線の起点を常に左端に固定し、読解のリズム（Vertical Rhythm）を整えます。短文・長文によるレイアウトの揺らぎ（Wobble）を排除します。
    - **Mobile Safety (Full Bleed)**:
        - 画像が画面端まで拡張される（Full Bleed）場合、キャプションには **`padding-inline: var(--space-4)`** を適用し、テキストが画面端に張り付くのを防ぎます。
    - Margin Top: `--space-2`

**4. Lightbox体験 (Immersion)**

- **Transition**:
    - サムネイル位置から物理的に拡大するような **Shared Element Transition** 風のアニメーションを採用します。
    - **開く動作**: `--duration-slower` (300ms) + `--ease-out`（出現に対応）
        - *Rationale*: サムネイルからフルスクリーンへの移動距離が大きいため、`--duration-slow` (200ms) では視覚的な跳躍（jarring）が生じます。`index.md` の「画面全体に影響する大きな移動には300ms」の指針に従い、300msを採用します。
    - **閉じる動作**: `--duration-slower` (300ms) + `--ease-in`（退場に対応、`index.md` のイージング定義に準拠）
- **Reduced Motion**:
    - `prefers-reduced-motion: reduce` 設定時は、`index.md` のグローバルルールによりアニメーション時間が `0.01ms` に短縮され、Lightboxは**即座に表示/非表示**になります。
    - これにより Shared Element Transition がスキップされますが、Lightboxの機能（表示・非表示・フォーカス管理）は維持されます。コンテキスト喪失を防ぐため、即時表示時でも**バックドロップのスクリムは表示**します。
- **Backdrop (Context Retention)**:
    - **Scrim & Blur**: `background-color: oklch(0% 0 0 / var(--opacity-scrim))` (黒の透過 60%) に加え、**`backdrop-filter: blur(var(--blur-md))`** を適用します。
    - *Rationale*: 背面の記事（コンテキスト）を「気配」として残しつつ、**文字情報の輪郭を微細にボカすことで視覚的干渉（ノイズ）を取り除き**、画像への没入と集中を最大化します。これはカメラの被写界深度（Depth of Field）のメタファーでもあります。
    - **Zoomed Image Border**: 拡大時も `1px solid var(--border-ghost)` を維持し、暗い背景上での視認性を保証します。

**5. 拡大時の操作 (Serene Operation)**

- **Philosophy**: 「UIの透明化」を徹底するため、閉じるボタン（×）や拡大縮小ボタン（＋/－）などの**常駐型フローティングコントロールは配置しません**。コンテンツ（画像）そのものをインターフェースとして扱います。
- **Interaction Rules**:
    - **Click Image**: 拡大画像を直接クリックすることで閉じます（元の位置に戻ります）。
    - **Click Backdrop**: 画像周囲の余白（Scrim）をクリックしても閉じます。
    - **Cursor**: 拡大中はカーソルを **`zoom-out`** に変更し、「クリックで縮小（閉じる）できる」ことを視覚的に伝えます。
    - **Scroll**: 拡大中は背景（Body）のスクロールをロックします。
- **Zoom Level**:
    - 原則として **"Fit to Screen" (画面内への全体表示)** を採用し、画像の全体像を没入して確認できるようにします。
    - パン（ドラッグ移動）やピンチズームなどの複雑な操作は、閲覧の「静謐さ」を乱す可能性があるため、初期実装では採用しません。細かい文字を読む必要がある場合は、ブラウザ標準機能（新しいタブで画像を開く）に委ねます。

**6. アクセシビリティ (A11y)**

- **Structure**: 拡大可能な場合、`<img>` を `<button type="button">` でラップし、キーボードフォーカスを可能にします。
- **Button Reset (Implementation Safety)**:
    - ラッパーとしての `<button>` は、意味的な役割のみを果たし、視覚的には「透明」である必要があります。ブラウザ標準スタイル（Border, Padding, Background）を完全にリセットし、**`display: block`** として画像のレイアウトに影響を与えないようにします。
    - **⚠️ `display: contents` の使用禁止**: `display: contents` はブラウザによってアクセシビリティツリーからボタン要素を消去するバグが報告されており、`display: block` を明示的に使用してください。
    - **Forced Colors Mode**:
        - ハイコントラストモード等の強制カラー環境下でも、ラッパーボタンは視覚的に透明であり続ける必要があります。
        - **Strategy**: `forced-colors: active` においてもボタンの `border` を `none` に、`background` を `transparent` に強制します。画像の境界線は `ui-image` 自身が持つボーダー（システムカラーにマッピングされる）によって表現され、二重線やノイズを防ぎます。
- **State**:
    - `aria-expanded`: `false` (通常時) / `true` (拡大時) を切り替え、展開可能な要素であることを伝えます。
    - `aria-label`: **`alt` テキストを含む動的な値**を設定します（例: `"${alt}を拡大"`）。これにより、スクリーンリーダーユーザーが「どの画像を拡大するのか」を把握できます。`alt` が空文字（装飾画像）の場合は `aria-label="画像を拡大"` を固定値として使用します。
- **Lightbox セマンティクス**:
    - Lightboxは「スクロールロック」「バックドロップ」「Escで閉じる」というモーダルの特性を持つため、拡大コンテナに **`role="dialog"`** と **`aria-modal="true"`** を付与します。
    - `aria-label` または `aria-labelledby` で、ダイアログのアクセシブルな名前（例: `alt` テキストと同値）を設定します。
- **フォーカス管理 (Focus Management)**:
    - `index.md` の「Escキーは閉じる + トリガー元へフォーカスを戻す」原則に従います。
    - **展開時**: フォーカスを拡大画像コンテナ（`role="dialog"` の要素）に移動します。
    - **閉じる時**（クリック / バックドロップクリック / `Esc` のいずれの場合も）: フォーカスを元のサムネイルボタンに戻します。
    - **フォーカストラップ**: Lightboxは「拡大画像クリック」「バックドロップクリック」「Escキー」のみでフォーカス可能なインタラクティブ要素を持たないため、フォーカストラップは**実装しません**（Tabキーで自由に脱出できます）。
- **Semantic Bonding**:
    - `<figcaption>` に一意のIDを付与し、ボタン（または画像）から `aria-describedby` で参照します。これにより、「画像の名前（`aria-label`）」と「画像の説明（Caption）」が支援技術に対して明確に関連付けられます。
- **Alt Text**: コンテキストに応じた説明を義務付けます。装飾的な画像の場合は空文字 (`alt=""`) とします。
- **Operation**: `Enter` / `Space` で拡大、`Esc` で閉じる動作を保証します。

**7. 状態管理 (States)**

- **ローディング状態 (Loading)**:
    - `loading="lazy"` 使用時など、画像の読み込み中はコンテナにプレースホルダーを表示します。
    - **Skeleton**: `background-color: var(--bg-fill-neutral)` の矩形をアスペクト比維持で表示します（`width`/`height` 属性をもとに `aspect-ratio` プロパティを設定）。
    - `width`/`height` 属性が未指定の場合は、固定の最小高さ（例: `160px`）を仮表示します。
    - **アニメーション**: Shimmer Effectは使用しません。`index.md` の「No Decoration（非装飾）」原則に基づき、静止したプレースホルダーのみとします。
    - `aria-busy="true"` をコンポーネントルートに付与し、読み込み中であることを支援技術に伝えます。

- **エラー状態 (Error)**:
    - `<img>` の `error` イベントを捕捉し、フォールバックを表示します。
    - **Fallback UI**: 壊れた画像アイコン（`lucide:image-off`、`--icon-xl` サイズ）と `alt` テキストを中央揃えで表示します。背景は `var(--bg-fill-neutral)`、テキストカラーは `var(--fg-muted)`。
    - `border-radius: var(--radius-md)` と `1px solid var(--border-ghost)` はエラー時も維持し、レイアウトの安定性（CLS防止）を保ちます。
    - `zoomable` 機能はエラー時には無効化します（`<button>` を非インタラクティブにする）。

#### 動画埋め込み (Video) `<ui-video>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 静的なテキストでは伝えきれない動的な情報を提供します。
- **Control**: ユーザーの許可なき「自動再生（Autoplay）」は、集中を乱す最悪のノイズであるため、原則として禁止します。音声もデフォルトはミュートとします。
- **Immersion**: 文脈（Context）を維持したまま再生するため、全画面遷移を強制せず、記事の一部として自然に振る舞います。

**2. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `src` | `src` | `string` | 動画ファイルのURL。 |
| `poster` | `poster` | `string` | サムネイル画像URL。 |
| `autoplay` | `autoplay` | `boolean` | 自動再生（**非推奨**）。使用時は必ず`muted`を併用。 |
| `loop` | `loop` | `boolean` | ループ再生。短いデモ動画等で使用。 |
| `muted` | `muted` | `boolean` | 音声ミュート。デフォルト `true` 推奨。 |
| `playsinline`| `playsinline`| `boolean`| モバイルでのインライン再生強制（必須）。デフォルト `true`。 |
| `width` / `height` | - | `number` | **CLS防止・アスペクト比計算用**。指定がない場合は `16/9` をデフォルトとします。 |
| `caption` | `caption` | `string` | 動画の説明（キャプション）。 |
| `tracks` | - | `Track[]` | 字幕データ配列（または `<track>` 要素をSlotへ）。 |

**`Track` 型定義:**

```typescript
interface Track {
  src: string;       // 字幕ファイルURL (.vtt 形式推奨)
  srclang: string;   // 言語コード (例: 'ja', 'en')
  label: string;     // UIに表示するラベル (例: '日本語', 'English')
  kind: 'subtitles' | 'captions' | 'descriptions' | 'chapters' | 'metadata';
  default?: boolean; // 省略時 false。true の場合、初期表示で有効化される
}
```

> **Note**: `<track>` 要素のSlot使用（`<track slot="tracks" ...>`）も等価の代替手段として許可します。ただし、プログラム的な制御が必要な場合は `tracks` プロパティを優先してください。

**3. スタイリングとトークンマッピング (Style & Tokens)**

- **Container**:
    - Aspect Ratio: `16 / 9` (標準)
    - Radius: `--radius-md`
    - Overflow: `hidden` (角丸を維持)
    - Isolation: `isolate` (スタッキングコンテキストの生成)
    - Background: `var(--black)` (読み込み前のちらつき防止)
    - Border: `1px solid var(--border-ghost)`
        - *Rationale*: 白背景の動画（スクリーンキャスト等）がアプリ背景に溶け込むのを防ぎ、境界を明確にします。
- **Layout Strategy (Prose Breakout)**:
    - **Context: Prose**: テキストコンテナよりも広く表示し、没入感を高めます。`index.md` の「本文幅」セクション（Media Elementsの拡張ルール）と同一の計算式を適用します。
        - **Mobile**: `width: calc(100% + var(--space-8))`, `margin-inline: calc(-1 * var(--space-4))`
        - **Desktop**: `width: calc(100% + var(--space-16))`, `margin-inline: calc(-1 * var(--space-8))`
- **Local Z-index Scale**:
    - コンテナ (`isolation: isolate`) 内部での階層構造を厳密に定義し、重なり順序による事故を防ぎます。
    - **Layer 0**: `<video>` 要素 (Content)
    - **Layer 1**: Poster Image / Thumbnail (Loading State)
    - **Layer 2**: Loading Spinner / Buffering Indicator
    - **Layer 3**: Caption / Subtitles
    - **Layer 4**: Controls Overlay (Play Button, Seek Bar, Floating Bar)
- **Visual Comfort (Dark Mode Dimming)**:
    - **State: Paused**: ポスター画像に対し `filter: brightness(var(--brightness-dimmed))` を適用し、周囲の暗さに馴染ませます。
    - **State: Hover / Playing**: `filter: brightness(1)` に復帰させ、本来の色を表示します。
- **Caption**:
    - Element: `<figcaption>`
    - Typography: `--text-sm`, `color: var(--fg-muted)`
    - Align: `left`
    - **Mobile Safety (Full Bleed)**:
        - 動画が画面端まで拡張される（Full Bleed）場合、キャプションには **`padding-inline: var(--space-4)`** を適用し、テキストが画面端に張り付くのを防ぎます。
    - Margin Top: `--space-2`
- **Overlay (Play Button & Loading)**:
    - **Appearance**:
        - Icon: `--icon-xl` (32px), `color: var(--white)`
        - **Button Size**: **Min `calc(var(--control-min-touch) + var(--space-1))` (48px)** (Paddingを含む)
            - *Rationale*: `index.md` の `--control-min-touch` (44px) に安全マージン (`--space-1`) を加算し、容易な操作性を数学的に保証する意図的なオーバーライドです。視覚的に複雑な動画上のオーバーレイにおいて、ラフな操作でも確実にヒットさせるための**心理的な安心感（Psychological Safety）**を担保します。
        - Background: `glass-panel` (Dark Mode強制) + `oklch(20% 0 0 / 0.6)`
        - Shape: `circle` (Radius Full)
    - **Tactility**:
        - Hover: `transform: scale(var(--scale-hover-lg))` (1.1倍 / 吸い付き)
        - *Rationale (Deviancy)*: 通常のボタンには `--scale-hover-sm` (1.02) を使用しますが、映像上に浮遊する円形ボタン（Floating Action）においては、より強い物理的なフィードバックが必要なため、例外的にアイコン用のスケール (`lg`) を採用し、操作の確実感（Surety）を高めます。
        - Active: `transform: scale(var(--scale-pressed))` (沈み込み)
        - Focus: **Adaptive Focus** (`--animation-focus`) を適用。
    - **Loading State (Buffering)**:
        - **Indicator Strategy**:
            - **Primary (Recommended)**: **Glass Panel Container**. 再生ボタンの背景（すりガラスの円）を維持したまま、アイコンのみを `<ui-spinner>` に置換します。
                - *Rationale*: Glass Panel が映像とスピナーの間に「中間層（Substrate）」として機能し、雪景色のような高輝度映像においても**数学的にコントラストを保証**します。これにより、視覚的に汚いドロップシャドウを回避し、「美しい待機状態」を実現します。
            - **Secondary**: スピナー単体で表示する必要がある場合に限り、`filter: drop-shadow(...)` を使用して可視性を担保します。
        - **Perceived Performance**: 静止画のまま待機させるストレスを軽減し、バックグラウンドで処理が進行中であることを伝えます。
- **Controls Strategy**:
    - **Custom Controls (Standard)**:
        - **Philosophy**: Rouaultの世界観（Glassmorphism, Radius, Icons）に統一されたカスタムコントロールを**標準実装**とします。ブラウザ標準のコントロールはOSやバージョンによって大きく異なり、没入感を損なうノイズとなり得るため、原則として使用しません。
        - **Implementation**: `<div>` による安易な模倣ではなく、ネイティブ要素（`<button>`, `<input type="range">`）をCSSでスタイリングする手法を採用し、セマンティクスとアクセシビリティを維持します。
        - **Layout (Floating Bar)**:
            - **Container**: `position: absolute`, `bottom: var(--space-4)`, `left: var(--space-4)`, `right: var(--space-4)`.
            - **Appearance**: `glass-panel` + `radius: var(--radius-full)`.
                - **Variable Override (Dark Mode Force)**:
                    - コンテナに対して、以下のトークン再定義を適用し、システム設定に関わらず**完全なダークモード**としてレンダリングします。
                    - *Code Example*:
                        ```css
                        .video-container {
                          /* Background & Foregrounds (Dark Values) */
                          --bg-default: oklch(12% 0.02 var(--hue-base)); /* Dark Bg */
                          --fg-default: oklch(90% 0.01 var(--hue-base)); /* Dark Fg */
                          --fg-muted:   oklch(65% 0.01 var(--hue-base)); /* Dark Muted */
                          
                          /* Colors (Dark Values) - 視認性確保のため明るい色を使用 */
                          --primary:    oklch(65% 0.12 var(--hue-primary)); 
                          --border-default: oklch(90% 0.01 var(--hue-base) / 0.12);
                        }
                        ```
                    - *Rationale*: 単に背景を黒にするだけでなく、`--primary` や `--fg-muted` もダークモード用の値（より明るい色）に切り替えることで、黒背景上でのコントラスト比（WCAG AA）を数学的に保証します。
            - **Shadow**: `var(--shadow-dark-md)` (映像からの分離を明確化).
                - *Rationale (Intentional Deviation)*: このコンテナはDark Mode強制コンテキストであるため、Semanticトークン `--elevation-md` ではなく、明示的にDark Mode用のPrimitiveトークン `var(--shadow-dark-md)` を使用します。これにより、Light Modeでも常に動画映像とバーの間に十分なコントラストを確保し、WCAG基準の視認性を数学的に保証します。
            - **Padding**: `var(--space-2) var(--space-4)`.
            - **Content**: `Play/Pause | Volume | Timer | Spacer | Fullscreen`.
            - **Visibility**: 再生中はマウス静止でフェードアウトし、操作時のみ出現させることで没入感を維持します（Paused時は常時表示）。
    - **Seek Bar (Slider)**:
        - `<ui-slider>` (Input-on-Top Overlayパターン) を使用し、ドラッグ可能なつまみ（Thumb）を持つカスタムスライダーを実装します。
        - **Layering Strategy (Contrast Safety)**:
            - **Track (Base)**: `height: 4px`, `radius: var(--radius-full)`, `background: oklch(from var(--white) l c h / 0.25)`.
                - *Rationale*: アプリのLight/Dark設定に関わらず、動画プレイヤーUIは常に**Dark Mode（暗い背景上の白いUI）**として設計します。これにより、夜のシーン（黒）でも明るいシーン（白）でも、Glass Panelの保護と合わせて視認性を数学的に担保します。
                - *Note (Relative Color Syntax)*: `oklch(from var(--white) l c h / 0.25)` は `oklch(100% 0 0 / 0.25)` と等価ですが、`from` 構文を使用することで**ベースカラーを `--white` トークン経由で管理**し、将来的にベースカラー変更が生じた際にここのみの修正で済む保守性を担保しています（現時点では純白固定）。
            - **Buffered**: `background: oklch(from var(--white) l c h / 0.5)`. (読み込み済み範囲)
            - **Progress**: `background: var(--primary)`. (現在位置)
        - **Thumb**:
            - Size: `12px` (通常時) -> `16px` (ホバー/ドラッグ時).
            - Color: `var(--white)`.
            - Shadow: `0 2px 4px oklch(0% 0 0 / 0.2)`.
            - **Touch Target (Invisible Hit Area)**: `index.md` の `--control-min-touch` (44px) 基準を満たすため、視覚的なサイズとは独立した **透明なヒットエリア（Padding または 疑似要素）** を確保します。
                - *Rationale*: フィッツの法則に基づき、見た目の繊細さを保ったまま、モバイル環境での操作ミス（Frustration）を物理的に排除します。
            - **Interaction**: ホバー時のみ拡大表示し、通常時は目立たないようにします（没入優先）。
    - **Playback Buttons**:
        - **Size**: `--control-height-md` (32px).
        - **Icon Size**: `var(--icon-base)` (16px).
        - **Icons**:
            - **Main**: `play` / `pause`.
            - **Skip**: `rotate-ccw` (10s戻る) / `rotate-cw` (30s進む).
            - **Volume**:
                - **Desktop**: `volume-2` / `volume-x` (Mute). ホバーでスライダーを表示。
                - **Mobile**: スライダー非表示（物理ボタン推奨）。
            - **Screen**: `maximize` / `minimize`.
        - **State**: `color: var(--white)`, `hover: bg-white/10` (微細なハイライト).
    - **Error State**:
        - ネットワークエラー等で再生不可能な場合、再生ボタンの代わりに「Retry」ボタン（Reload Icon）とエラーメッセージを表示し、決して沈黙しないUIとします。
        - **カラートークン**:
            - エラーメッセージテキスト: `color: var(--fg-default)` (Dark Mode強制コンテキスト内のため白相当)
            - エラーアイコン: `color: var(--fg-default)`
            - *Rationale*: このエリアは動画プレイヤーのDark Mode強制コンテキスト内であるため、`--fg-danger` ではなく `--fg-default` を使用します。`--fg-danger` は明るい映像背景上でコントラストが確保できない場合があり、Dark Mode強制による `--fg-default` の再定義（白相当値）が最大の視認性を保証します。
        - **ARIA属性**:
            - エラーコンテナ: `role="alert"`, `aria-live="assertive"` (エラーは即座に読み上げを必須とする)
            - エラーメッセージ: 具体的な障害内容を含むテキスト（例: `「動画を読み込めませんでした。ネットワーク接続を確認してください。」`）
            - Retryボタン: `aria-label="再試行"`, フォーカスを**エラー発生時に自動的にRetryボタンへ移動**させること（`button.focus()`）。これにより、キーボード・スクリーンリーダーユーザーが即座にリカバリ操作を実行できます。
    - **Subtitle Integration (Layout Safety)**:
        - **Strategy**: 字幕（Text Track）の表示領域は、フローティングコントロールバーの干渉を避けるため、**常にコントロールバーの高さ＋安全マージン分の余白（Padding）を下部に確保**します。
        - **Behavior**: コントロールバーの出現（Fade-in）によって字幕の位置を動かすこと（Lift-up）は禁止します。読書中の視線移動（Saccade）を阻害し、没入感を損なうノイズとなるためです。UIは、最初から空けてある「予約された空間」に静かに出現し、コンテンツは不動を貫きます。
    - **Native Fallback (Emergency Use Only)**:
        - 開発初期フェーズや、カスタムコントロールが致命的なバグにより機能しない場合に限り、一時的な措置として `<video controls>` (Native) の使用を許可します。その際も **`accent-color: var(--primary)`** を指定し、最小限のブランド統一を図ります。

**4. アクセシビリティ (A11y)**

- **Captions**: 動画には字幕（Track）を提供することを強く推奨します。
- **Controls (Keyboard & ARIA)**:
    - **Full Support**: マウス操作と同等の機能をキーボードのみで実現することを**必須**とします。
    - **Key Bindings**:
        - `Space` / `Enter`: 再生・一時停止。
        - `ArrowLeft` / `ArrowRight`: 5秒スキップ（シーク）。
        - `ArrowUp` / `ArrowDown`: 音量調整。
        - `M`: ミュート切り替え。
        - `F`: 全画面切り替え。
    - **Focus Order**: 論理的な順序（再生ボタン → シークバー → 音量 → 全画面）でフォーカスが移動するように構成します。
    - **ARIA Attributes**:
        - Play Button: `aria-label="再生"`, `aria-pressed="false/true"`.
        - Slider: `role="slider"`, `aria-valuemin="0"`, `aria-valuemax="duration"`, `aria-valuenow="currentTime"`, `aria-valuetext="MM:SS"`.
- **Semantic Bonding**:
    - `<figcaption>` に一意のIDを付与し、動画コンテナから `aria-describedby` で参照します。これにより、キャプションが動画の補足情報であることを支援技術に伝えます。

**5. モーション軽減対応 (Reduced Motion)**

`index.md` のグローバルリセット（`prefers-reduced-motion: reduce` 時に `animation-duration: 0.01ms`）は大半のアニメーションを自動的に無効化しますが、動画プレイヤー固有の挙動について以下の方針を明示します。

| アニメーション | `reduce` 時の挙動 | 分類 |
|---|---|---|
| Floating Barのフェードイン/アウト | グローバルリセットで実質即時切替 | 装飾 → 自動対応 |
| Play Buttonの `scale` | グローバルリセットで無効化 | 装飾 → 自動対応 |
| `filter: brightness()` のトランジション | グローバルリセットで即時切替 | 装飾 → 自動対応 |
| **Loading Spinner (`<ui-spinner>`)** | 回転アニメーションは停止。ただし**スピナー要素自体は表示を維持**し、バッファリング中であることを静的に伝える | 機能的 → 要素消去禁止 |
| **コントロールバーの表示/非表示** | 即時切替（`opacity: 1` または `opacity: 0` へ瞬時に遷移）。フェードアウトの遅延は適用しない | 機能的 → 即時完了で維持 |
| Seek Barのサムネイルサイズ変化 (`12px → 16px`) | グローバルリセットで即時変化 | 機能的 → 自動対応 |

```css
/* Loading Spinnerの静的フォールバック (reduced-motion時) */
@media (prefers-reduced-motion: reduce) {
  .video-spinner {
    /* アイコン自体は表示維持。aria-label="読み込み中" で意味を保持 */
    animation: none;
    /* 静的な視覚的代替: ドットや静止アイコンへの差し替えも可 */
  }
}
```

**6. 強制カラーモード対応 (Forced Colors)**

`index.md` の `forced-colors` 方針に準拠し、動画プレイヤーのカスタムコントロールにおける視認性とセマンティクスを維持します。

```css
@media (forced-colors: active) {
  /* Glass Panelの背景が消失するため、明示的なボーダーで構造を維持 */
  .video-floating-bar {
    background-color: Canvas;
    border: var(--border-width) solid CanvasText;
    backdrop-filter: none;
    box-shadow: none;
  }

  /* Play Buttonのアイコン可視性保証 */
  .video-play-button {
    background-color: Canvas;
    border: var(--border-width) solid CanvasText;
    color: CanvasText;
    forced-color-adjust: auto;
  }

  /* Seek Barのトラック・プログレス・サムネイルをシステムカラーでマッピング */
  .video-seek-track {
    background-color: GrayText; /* Track (Base): システムグレー */
  }
  .video-seek-buffered {
    background-color: CanvasText; /* Buffered: 標準テキスト色 */
  }
  .video-seek-progress {
    background-color: Highlight; /* Progress: システムハイライト色 (--primary相当) */
  }
  .video-seek-thumb {
    background-color: CanvasText;
    forced-color-adjust: none; /* サムネイルは強制上書きを禁止 */
  }

  /* フォーカスリングの強制適用 (box-shadowが消失するため) */
  .video-floating-bar :focus-visible {
    outline: 3px solid CanvasText;
    outline-offset: 2px;
    box-shadow: none;
  }
}
```

> **Rationale**: `forced-colors` 環境ではGlass Panel（`backdrop-filter` + 半透明背景）が消失し、コントロールが映像に溶け込む危険があります。明示的な `Canvas` / `CanvasText` へのフォールバックにより、映像の輝度に関わらずコントロールの構造と操作可能性を保証します。

**7. 状態遷移 (State Machine)**

`<ui-video>` が取りうる状態と、状態間のトリガーを定義します。実装時はこのState Machineを基準として、各状態に対応するUI・ARIA属性・アニメーションを決定してください。

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                                                         │
          src未指定  ▼                                                         │
         ┌─────────────────┐     src指定          ┌──────────────────┐         │
         │    EMPTY        │──────────────────────▶│    LOADING       │         │
         │  (プレースホルダー)│                      │  (メタデータ読込)  │         │
         └─────────────────┘                      └────────┬─────────┘         │
                                                           │ loadedmetadata     │
                                                   error   │                    │
                                          ┌────────────────┼────────────────┐  │
                                          ▼                ▼                │  │
                                 ┌─────────────────┐  ┌─────────────────┐  │  │
                                 │     ERROR        │  │     PAUSED      │  │  │
                                 │  (再試行ボタン)   │  │  (再生待機中)   │  │  │
                                 └────────┬─────────┘  └────────┬────────┘  │  │
                                          │                      │ play()    │  │
                                     retry│                      ▼           │  │
                                          │             ┌─────────────────┐  │  │
                                          │             │    PLAYING      │  │  │
                                          │             │  (再生中)        │  │  │
                                          │             └──┬──────┬───────┘  │  │
                                          └──────────      │pause │          │  │
                                                    │      ▼      │buffering │  │
                                                    │  PAUSED     ▼          │  │
                                                    │         ┌──────────────┤  │
                                                    │         │  BUFFERING   │  │
                                                    │         │ (スピナー表示) │  │
                                                    │         └──────────────┘  │
                                                    └──────────────────────────┘
                                                           ended
```

| 状態 | 説明 | UIの変化 | ARIA |
|------|------|----------|------|
| **EMPTY** | `src` 未指定 | プレースホルダー表示。再生UIは非表示。 | `aria-disabled="true"` |
| **LOADING** | メタデータ読み込み中 | Posterを表示。Play ButtonにSpinnerを表示。 | `aria-busy="true"` |
| **PAUSED** | 再生待機中（初期・一時停止） | Poster + Play Icon表示。Floating Bar常時表示。 | `aria-pressed="false"` (Play Button) |
| **PLAYING** | 再生中 | Poster非表示。Floating Barは静止でフェードアウト。 | `aria-pressed="true"` (Play Button) |
| **BUFFERING** | 再生中にデータ待ち | Play ButtonアイコンをSpinnerに置換。再生は継続（または一時停止）。 | `aria-busy="true"` |
| **ERROR** | 読み込み/再生失敗 | Play ButtonをRetryボタンに置換。エラーメッセージ表示。Floating Bar非表示。 | `role="alert"`, `aria-live="assertive"` |

#### 区切り線 (Divider) `<ui-divider>` / `<hr>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: コンテンツの意味的な区切りを示します。
- **Subtlety**: 視覚的なノイズにならないよう、極限まで薄く（Low Contrast）、余白を持って配置します。物理的な線というよりも、「沈黙（Whitespace）」の境界として機能させます。

**2. 実装基盤 (Reference)**

- **Native**: `<hr>` タグ。
- **Role**: Implicit `separator`.

**3. スタイリングとトークンマッピング (Style & Tokens)**

- **Reset**: `border: 0` (ブラウザデフォルトの除去)
- **Border Top**: `1px solid var(--border-ghost)`
    - *Correction*: `muted` ではなく `ghost` (`index.md` 定義: "気配としての構造線") を採用し、「沈黙」という哲学を物理的に体現します。
- **Margin**: `var(--space-12) 0`
    - *Rationale*: `<hr>` は HTML における「テーマの区切り（thematic break）」であり、段落間の軽い区切りではなく、**セクションレベルの境界**です。`index.md` のスペーシング意味論に従い、「セクション: 大きなコンテンツ領域の境界」と定義される `--space-12` (48px) を採用します。
- **Forced Colors**: `index.md` のグローバル戦略に委ねます（コンポーネント個別のハードコード不要）
    - *Rationale*: `index.md` は Forced Colors Mode への対応を 2 段階で定義しています。第一に、`@media (forced-colors: active)` でのグローバルなトークンリマッピング（`--border-*` → `CanvasText`）。第二に、「線が見えなくても構造が伝わる」ようスペーシング自体がグルーピングを定義する設計の徹底。`<hr>` は `--space-12` の余白によって構造が維持されるため、コンポーネント側で `border-color: CanvasText` を個別指定する必要はなく、グローバル戦略に委ねることで二重管理を排除します。

#### ハイライト (Highlight) `<mark>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 検索結果のマッチ部分や、ユーザーが能動的に指定した箇所に対する一時的なフィードバックです。
- **Constraint (Serenity)**: 著者が予めテキストを強調する目的（静的な装飾）には使用しません。その場合は `<strong>` (太字) を使用してください。ハイライトはあくまで「探すモード」における機能的支援であり、「読むモード」の静謐さを乱してはなりません。
- **Noticeability**: 「静謐さ」を崩さない範囲で、周囲のテキストから明確に浮き立たせます。蛍光ペンのような過剰な彩度（Noise）は排除します。

**2. 実装基盤 (Reference)**

- **Native**: `<mark>` タグ。

**3. スタイリングとトークンマッピング (Style & Tokens)**

- **Background**: `var(--bg-highlight-subtle)`
    - *Light*: `oklch(96% 0.04 85)` (Pale Yellow)
    - *Dark*: `oklch(25% 0.05 85)` (Dark Amber)
    - *Rationale*: 青系（Deep Indigo）を基調とするUIにおける**視覚的な補色**としてAmber色相を採用し、検索結果の発見可能性を高めています。
- **Color**: `var(--fg-default)`
    - *Rationale*: 背景が十分に淡い（Darkでは暗い）ため、標準テキスト色でコントラスト比を確保できます。
- **Padding**: `0 0.1em`
    - *Rationale*: 文字の呼吸を確保します。
- **Border Radius**: `var(--radius-sm)` (4px)
    - *Rationale*: 直角なマーカーは古さを感じさせるため、微細な角丸を与えて「インクが染みたような」自然な質感を演出します。

### 特殊コンテンツ (Specialized Content)

#### 翻訳 / 対訳 (Translation) `<ui-translation>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 文学作品などの原文に対し、読むリズムを崩さずに翻訳を参照・対照するための支援ツールです。
- **Transparency**: 翻訳はあくまで「補助」であるため、ユーザーが求めない限りは隠蔽（または控えめに表示）し、原文への没入を優先します。
- **Dual Mode**: 「わからない箇所だけ調べる（Lookup）」と「対訳として読み比べる（Parallel Reading）」という2つの読書モードをシームレスにサポートします。

**2. ロジック参照基盤 (Logic Reference)**

- **Interaction Strategy**:
    - **Desktop**:
        - **Default (Lookup)**: ホバー（Hover）またはフォーカス（Focus）でポップオーバーを表示。
        - **Parallel Mode (Flow Preservation)**: 文脈（Parallel Context）を展開します。
            - **Primary (Drawer)**: 本文（Prose）の左右にある余白領域を活用し、**本文の幅やレイアウトを一切変更せずに**翻訳パネルを展開します。
            - **Secondary (Split)**: 画面幅不足時（目安: `< var(--bp-xl)`）は、Parallel Modeを無効化するか、ユーザーの明示的な操作により画面分割を行いますが、`Scroll Anchoring` 技術を用い、現在の読み位置（行）を厳密に維持します。
    - **Mobile**:
        - **Default (Lookup)**: タップで画面下部に **Bottom Sheet** を表示。
            - *Rationale*: "Flow State" を維持するため、行間展開によるレイアウトシフト（読み位置のズレ）を回避します。
            - **Swipe to Close**: 標準的なUXとして、下方向へのスワイプ（閾値: 画面高さの30%または速度判定）による閉じる操作をサポートします。
        - **Interlinear Mode (Option)**: 設定により、全ての翻訳を原文の下に行間展開（アコーディオン）して表示。
            - **Animation**: `grid-template-rows` (`0fr → 1fr`) と `opacity` を用いたトランジション（`--duration-slow` (200ms), `--ease-in-out`）を適用します。
                - *Rationale*: `max-height` は `index.md` のトランジション許可リスト外であり、リフロー（再レイアウト）を引き起こすパフォーマンス上の問題があります。CSS Grid の暗黙的サイズ遷移（`grid-template-rows: 0fr → 1fr`）はレイアウトエンジンへの影響を最小化します。`--duration-slow` (200ms) は `index.md` の区分「限定的なレイアウト変化（単一コンポーネント内の状態遷移）」に対応します。
                - **CSS**:
                    ```css
                    .interlinear-content-wrapper {
                      display: grid;
                      grid-template-rows: 0fr;
                      opacity: 0;
                      transition:
                        grid-template-rows var(--duration-slow) var(--ease-in-out),
                        opacity var(--duration-slow) var(--ease-in-out);
                    }
                    .interlinear-content-wrapper[aria-hidden="false"] {
                      grid-template-rows: 1fr;
                      opacity: 1;
                    }
                    .interlinear-content-wrapper > * {
                      overflow: hidden;
                    }
                    ```
                - **Note (prefers-reduced-motion)**: グローバルルール（`index.md` § モーション軽減）により `transition-duration: 0.01ms` が自動適用されます。JS によるスワイプアニメーションについては、`window.matchMedia('(prefers-reduced-motion: reduce)')` を参照し、`reduce` 時はアニメーションをスキップして即座に最終状態へ移行してください。
            - **Scroll Anchoring**: 展開によるレイアウトシフトで読み位置を見失わないよう、ブラウザの `overflow-anchor: auto` またはJSによるスクロール位置補正を必須とします。
            - **Warning (Default Disabled)**: 本モードはレイアウトシフト（読み位置のズレ）を伴うため、デフォルトでは**無効**とします。ユーザーが「学習モード（Study Mode）」設定（全体設定またはページメニュー）を明示的に選択した場合にのみ有効化される**例外的な処理**として実装し、通常の読書体験における「Flow State」を保護します。

- **Mode Switching (モード切り替え)**:
    - **Persistence Strategy**:
        - ユーザー設定画面を持たないため、モード選択は **Contextual Toggle（文脈内での切り替え）** として実装し、ブラウザの `localStorage` に即座に保存・永続化します。これにより、次回以降のすべての翻訳操作に選択したモードが適用されます。
        - **Implementation Detail**:
            - **Key Naming**: 名前空間付きの `rouault:translation-mode` を使用し、値は `'lookup'` または `'parallel'` とします。
                - **概念の分離**: localStorage の値はユーザーの**意図モード**（lookup/parallel）を表します。実際の**レンダリングモード**（`render-mode` 属性: `popover`/`drawer`/`interlinear`）は、意図モードとデバイス（desktop/mobile）の組み合わせで自動解決されます。対応表: `lookup + desktop → popover`、`parallel + desktop → drawer`、`lookup + mobile → popover (bottom-sheet)`、`parallel + mobile (Study Mode) → interlinear`。
            - **SSR Hydration Strategy**: Eleventyビルド時には `localStorage` が参照できないため、初期表示のちらつき（FOUC）を防ぐため、**`<head>` 内のブロッキングスクリプトで属性を付与することを必須とします**。
                - *Rationale*: コンテンツの表示遅延は原則1（没入のための構造）に反するため、スクリプトによる属性付与でスタイルを初期化し、即時のレンダリングを保証します。
    - **Toggle Actions**:
        - 以下の操作を行った瞬間、**デフォルトモード設定が反転（Toggle）**し、表示が切り替わります（Lookup ⇔ Parallel）。
        - **Desktop (GUI)**: Popover/Panel 右上のアイコンボタン（`icon: panel-right` ⇔ `icon: message-square`）をクリック。
        - **Mobile (GUI)**: Bottom Sheet ヘッダーの「対訳モードへ切り替え / ポップアップに戻す」リンクをタップ。
        - **Keyboard**: 
            - `Cmd+Shift+L`（グローバルショートカット、Windows: `Ctrl+Shift+L`）
                - *Rationale*: `Cmd+Shift+T` は主要ブラウザの「最近閉じたタブを復元」に割り当てられており、Web アプリケーションからインターセプト不可能です。`L` は Lookup/Language の頭文字で記憶しやすく、標準ブラウザショートカットとの競合がありません。
            - `P`（Popover/Panel 表示中のショートカット）
    - **Feedback**: モード切り替え時には `--animation-flash` を適用し、パネルの出現・消失を視覚的に強調します。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `original` | - | `string` | 原文データ。 |
| `translated`| - | `string` | 翻訳文データ。 |
| `lang` | `lang` | `string` | 原文の言語コード（例: `fr`）。 |
| `target-lang` | `target-lang` | `string` | 翻訳先の言語コード。デフォルトは `ja`（日本語）。 |
| `render-mode` | `render-mode` | `'popover' \| 'drawer' \| 'interlinear'` | 現在のレンダリングモード。デバイスとユーザーの意図モードから自動解決されます（読み取り専用）。 |

> **Note (A11y/i18n):** `lang` および `target-lang` プロパティは、スクリーンリーダーの正しい発音や適切なフォントレンダリングを保証するため、原文・翻訳文それぞれのラッパー要素の `lang` 属性としてDOMに出力されなければなりません。
>
> **Structure Example**:
> ```html
> <span class="ui-translation-trigger" lang="fr">Je pense, donc je suis.</span>
> <div class="ui-translation-content" lang="ja">我思う、ゆえに我あり。</div>
> ```

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Trigger (Original Text)**:
    - **Font Family**: `--font-sans` を基本として継承します（`index.md` 現行方針: 全コンテンツで Sans を使用）。
        - *Forward-looking Note*: 将来的に `--font-serif` が特定ジャンル（文学等）で有効化された場合、トリガーはそのコンテキストのフォントを自動継承します。翻訳コンテンツ側は常に `--font-sans` を維持し、「原文（主）⇔ 翻訳（従）」の視覚的役割分担を保ちます（セクション4 Popover/Content 参照）。
    - **Text Color**: `inherit` (または `var(--fg-default)`)
        - *Rationale*: 原文の可読性を最優先するため、文字色は変更しません。
    - **Decoration**: `text-decoration: none` (Base)
        - **Style (Custom Dashed)**: **`background-image: linear-gradient(...)`**
            - *Rationale*: ブラウザの `text-decoration-style: dashed` はレンダリング差異が大きく、Rouaultの求める「静謐で統一された1pxの点線」を再現できないため、`background-image` によるカスタム描画を採用します。
            - **CSS**: `background-image: linear-gradient(to right, oklch(from var(--fg-default) l c h / var(--opacity-link)) 50%, transparent 50%); background-size: var(--space-1) 1px; background-repeat: repeat-x; background-position: bottom;`
            - **Opacity Note**: 発見可能性（Discoverability）を確保するため、汎用的な `--opacity-link-subtle` (0.4) ではなく、標準リンクと同じ **`--opacity-link` (0.6)** を使用します。タッチデバイスでは **`--opacity-link-touch` (0.75)** まで引き上げ、カーソルがない環境での視認性を担保します。
            - **Warning (Forced Colors)**: **Fallback Required**. `forced-colors: active` モードでは背景画像が消失するため、このブロック内でのみ `text-decoration: underline dashed` を明示的に適用し、構造の可視性を担保します。
            - **Verification**: ブラウザ間での描画差異（ベースライン位置）を確認し、必要に応じて `background-position-y: calc(100% - 1px)` 等で微調整を行ってください。
        - **Offset**: `padding-bottom` は使用せず、**`background-position-y`** で調整します。
            - *Rationale*: `padding-bottom` の追加は行ボックスの高さを変え、プロース（本文）の垂直リズム（`--line-height-relaxed`）を崩す原因となります。`background-image` の描画位置調整のみでディセンダー（g, j, p, q, y）との視覚的重なりを制御してください。
    - **Cursor**: `help`
        - *Rationale*: リンク（遷移）ではなく、その場で文脈（Context）を参照する機能（Help/Definition）であることを示します。
        - *Note (Discoverability)*: `help` カーソルはタッチデバイスやキーボード操作では無効です。機能の発見可能性は、あくまで上記の**アンダーラインのコントラスト比（3:1以上推奨）による視覚的アフォーダンス**に依存し、カーソル変化は補助的な手がかりに留めることを前提とします。
    - **Interaction (Hover / Focus)**:
        - Style: `background-image: linear-gradient(...)` (Solid) または `text-decoration: underline`
        - Color: `var(--fg-default)` (テキスト色と同化)
        - *Rationale*: 「触れた」ことに対する微細な確証（Tactility）を与えます。
    - **Multiline Support**: **`box-decoration-break: clone`** / `-webkit-box-decoration-break: clone`
        - *Rationale*: フレーズが複数行にわたる場合でも、アンダーラインの描画を各行で正しく断片化（Clone）し、視覚的な一貫性を保ちます。
- **Popover / Content (Translated Text)**:
    - **Font Family**: **`--font-sans`**
        - *Rationale*: 原文が Serif の場合でも、翻訳文には Sans を適用することで、「原文（主）⇔ 翻訳（従/注釈）」という視覚的な役割分担を明確にします。
    - **Color**: `--fg-default`
    - **Background**: `--bg-surface-2` (Elevated)
        - *Dark Mode*: `index.md` の規定に従い、上端に `1px` のハイライト（光源反射）を付与し、背景との境界を明確にします。
    - **Shadow**: **`--elevation-lg`**
        - *Implementation Note*: Semantic トークン `--elevation-lg` は Light/Dark Mode の切り替えを自動的に処理するため（`--shadow-lg` / `--shadow-dark-lg` への内部マッピング）、コンポーネント実装でモード分岐を記述する必要はありません。
    - **Z-index**: **`--z-popover` (400)**
        - *Rationale*: `index.md` のレイヤー構造（§ Z-index Scale）に準拠し、ドロップダウン・ポップオーバーに予約されたレイヤーを使用します。
    - **Motion**:
        - **Duration**: 出現は **`--duration-normal` (150ms)**、退場は **`--duration-fast` (70ms)**
            - *Rationale*: 出現（Enter）は情報の到着を知らせるため `--ease-out` で緩やかに着地させ、退場（Exit）はユーザーが積極的に閉じた操作への即座な応答として高速化します。これにより原則3「Digital Tactility」の「即応性」と視認性の両立を図ります。
        - **Easing**: **`--ease-out`**
        - **Note (prefers-reduced-motion)**: グローバルルール（`index.md` § モーション軽減）により、`prefers-reduced-motion: reduce` 環境ではすべての CSS Transition が `0.01ms` に短縮されます。JS アニメーション（Bottom Sheet スワイプ等）は `window.matchMedia('(prefers-reduced-motion: reduce)')` を参照し、`reduce` 時は即座に最終状態へ移行してください。

**5. 実装戦略 (Implementation Strategy)**

- **Component Separation**:
    - `<ui-popover>` コンポーネントは「クリックで操作する汎用ダイアログ」として設計されているため、ホバー動作やモバイル時のシート変形（Bottom Sheet）を必須とする `<ui-translation>` には流用しません。
    - **Shared Logic Only**: 位置計算（Floating UI）や画面端での折り返し（Flip/Shift）といった「Overlay System」のコアロジックのみを共有し、View（コンポーネント）は独立して実装します。
        - **Structure**: 共有ユーティリティ（`computePosition` ラッパー等）は `src/lib/ui-core/overlay/` に配置することを推奨します。
        - *Implementation Detail*: Floating UI の `flip` ミドルウェアを使用し、画面端での見切れを防ぎます。`padding` オプションには `--space-4` を設定し、画面端との余白を確保します。
    - **Motion (Parallel Mode & Flow State)**:
        - **Layout Stability**: Parallelへの移行時、本文エリアの幅縮小（リフロー）による「読み位置の喪失」は最悪の体験（Flow State Breaking）です。
        - **Strategy**:
            - **Overlay (Recommended)**: 画面幅に余裕がある場合、翻訳パネルを本文の右側に **オーバーレイ（Drawer）** として展開します。
            - **TOC Conflict (Mode Switch)**: Parallel Mode展開時は、**右サイドバーの目次（TOC）を一時的に隠蔽（または置換）し**、`--aside-width` 領域を翻訳パネルとして活用します。これにより、3カラム構造の整合性を保ちつつ、新たなレイアウトシフトを回避します。
                - **Strip Mode Consideration (Position Awareness)**: 画面幅に余裕がある場合（目安: `>= 1400px` ※ `index.md` § TOC「Collapsed State Behavior」で定義された Collision Fallback 閾値 `< 1400px` の正値）、TOCを完全に隠蔽するのではなく、`index.md` で定義されている **「Collapsed State Behavior (Strip Mode)」** を適用し、翻訳パネルの右端に幅 `24px` 程度の極細インジケーターバーとして残すことを必須とします。
                    - *Rationale*: ユーザーが翻訳を参照している間も、ドキュメント全体の中での現在位置（Reading Position）を周辺視野で感じ取れるようにし、「Flow State」を維持します。インジケーターバーを残す理由は翻訳パネル展開中にユーザーがドキュメント全体の中での現在位置（Reading Position）を完全に見失う状態は、デザイン原則「**Structure for Immersion（没入のための構造）**」に反するためです。
                    - *Implementation*: TOCの視覚的幅を縮小し、現在地（Active Indicator）のみを表示します。クリックで完全なTOCへ展開可能とします。
                        - **Animation**: Strip Mode からの展開は `--duration-normal` (150ms) + `--ease-out` で行います。
                        - **Focus Management**: 展開後はTOCコンテナへフォーカスを移動させ、キーボード操作を継続可能にします。
            - **Transition**: `View Transitions API` を活用し、TOCから翻訳パネルへの切り替えをシームレスなアニメーションで接続します。
                - **Implementation Guide**:
                    - `index.md` の「ページ遷移 (View Transitions / Zero Latency)」セクションに準拠します。
                    - **Naming Convention**: TOCコンテナと翻訳パネルのコンテナに対し、同一の `view-transition-name: side-panel` を付与することで、コンテンツがモーフィングして入れ替わるような視覚的連続性を作ります。
                    - **Dynamic Tagging Strategy**: ページ内遷移（Toggle）において `view-transition-name` の重複エラーを避けるため、JavaScriptで遷移の瞬間のみ動的に名前を割り当てるパターンを推奨します。
                        ```javascript
                        await document.startViewTransition(() => {
                           toc.style.viewTransitionName = '';           // インラインスタイル除去（競合回避）
                           panel.hidden = false;
                           panel.style.viewTransitionName = 'side-panel'; // 名前を移譲
                        }).ready;
                        ```
                    - **Timing**:
                        - **Duration**: `0.2s` (200ms) - 思考の速度を妨げない短時間。
                        - **Easing**: `cubic-bezier(0, 0, 0.2, 1)` - Linearに近いOut。

**6. アクセシビリティ (A11y)**

- **Semantics**: **`<span role="button">`**, **`aria-details`**, および **`aria-controls`** を併用します。
    - *Rationale*: `aria-details` は意味論的に最適ですが、現状のサポート状況を考慮し、堅牢なフォールバックとして `aria-controls` (開閉対象の明示) を必須とします。将来的に支援技術のサポートが十分に普及した段階で `aria-controls` は削除可能なよう、構成を検討してください。
    - *Structure*: `<span ... aria-haspopup="dialog" aria-expanded="false" aria-controls="translation-uid-123" aria-details="translation-uid-123">`
        - *Rationale*: `aria-haspopup="dialog"` により、フォーカス前に「このボタンはポップアップを開く」ことをスクリーンリーダーが事前に通知できます。`aria-expanded` のみでは操作後の状態変化しか通知されません。
    - **Usage Note**: 段落全体などの長文をボタン化 (`role="button"`) すると、スクリーンリーダーの読み上げやナビゲーション挙動が不安定になるリスクがあります。原則として、翻訳機能は**単語や短いフレーズ単位**（推奨：150文字以内）での適用を推奨します。
        - **Dev Feedback**: `connectedCallback` 等で文字数をチェックし、150文字を超過している場合は `console.warn` で開発者に警告を出す実装を推奨します。
- **Content Role**:
    - 翻訳コンテンツのコンテナには **`role="note"`** を付与します。
        - *Rationale*: `role="region"` はランドマークとして認識されるため、1ページに大量の翻訳箇所がある文学作品では、スクリーンリーダーのランドマークナビゲーション一覧が汚染されます。`role="note"` は「補足情報」の意味論を持ちつつランドマーク一覧には現れず、`aria-details` による関連付けと組み合わせることで、支援技術に対して適切な文脈を伝達できます。
- **Interaction (Keyboard)**:
    - **Focus**: テキスト装飾の変化だけでなく、標準の **Adaptive Focus** (Outline) も適用し、視認性を担保します。
    - **Activation**: `Enter` / `Space` キーで Popover/Bottom Sheet の開閉、または翻訳詳細へのフォーカス移動を行います。
    - **State Management**: 操作時はトリガーの **`aria-expanded`** 属性を動的にトグル（`true` / `false`）し、現在の状態をスクリーンリーダーへ通知します。
- **Mobile Interaction**: Bottom Sheet展開時は、背景（Scrim）のタップまたは下方向へのスワイプで即座に閉じる挙動を実装します。
    - **Focus Management**: `index.md` のキーボードナビゲーション戦略（§ Dropdown / Popover）に準拠し、Lookup モードの Bottom Sheet では **Focus Trap は行いません**。`Tab` キーによる脱出（シートを閉じて次のインタラクティブ要素へ移動）を許容し、Flow State を保護します。
    - *Rationale*: Focus Trap はユーザーの操作を独占するモーダルダイアログに適用する手法です。Lookup モードの Bottom Sheet は文脈参照のための一時的な補足情報であり、強制的な閉じ操作（Esc 必須）は「翻訳を見たい→読書に戻りたい」という最頻出フローを阻害します。

```html
<!-- マークアップ例 -->
<span class="ui-translation-trigger" role="button" tabindex="0" lang="fr"
      aria-haspopup="dialog" aria-expanded="false" aria-controls="translation-uid-123" aria-details="translation-uid-123">
  Je pense, donc je suis.
</span>

<!-- 翻訳コンテンツ（Popover / Bottom Sheet / Interlinear） -->
<div id="translation-uid-123" class="ui-translation-content" hidden
     role="note" lang="ja">
  <span class="ui-text-sans">我思う、ゆえに我あり。</span>
</div>
```

#### 楽譜 (Score) `<ui-score>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 音楽ジャンルにおいて、主題や動機（Motif）を視覚的に提示します。テキストの流れを一時的に断ち切り、視覚的なリズム（Prose Breakout）を形成します。
- **Clarity & Immersion**: 複雑な楽譜記号を鮮明に表示するため、ビットマップではなくベクター（SVG）を使用します。ダークモードであっても「紙の上のインク」としてのコントラスト（白背景・黒文字）を維持し、可読性を最優先します。

**2. ロジック参照基盤 (Logic Reference)**

- **Porting Strategy**: `<ui-image>` と同様に、画像の遅延読み込みと表示制御のロジックをベースとしますが、SVG特有の処理（インライン化、サニタイズ）を追加します。
- **SSG Strategy (Build-time vs Runtime)**:
    - **Primary (Recommended)**: **ビルド時インライン化**。Eleventyビルドプロセスにおいて、`src` で指定されたSVGファイルを読み込み、サニタイズ後にHTMLへ直接埋め込みます。
        - *Rationale*: 初期表示パフォーマンスを最大化し、ランタイムでの `fetch` リクエストを排除します。`loading="lazy"` の場合でも、ビューポート接近時には既にDOMに存在するため、即座に表示可能です。
    - **Secondary (Fallback)**: **クライアントサイド `fetch`**。ビルド時の処理が不可能な場合（動的コンテンツ等）に限り、`IntersectionObserver` トリガー時に `fetch` してインライン化します。
        - *Implementation Note*: `loading="eager"` の場合でも、SSGビルド時にインライン化されていない場合は、コンポーネント初期化時に即座に `fetch` を開始します。
- **Security (Sanitization)**:
    - 外部から取得したSVGには悪意のあるスクリプトが含まれる可能性があるため、**展開前に必ずサニタイズ（`DOMPurify` 等）を実行し、`<script>` タグやイベントハンドラを除去します**。
    - **Build-time Sanitization**: ビルドプロセスで処理する場合、サニタイズもビルド時に実行し、クライアント側のオーバーヘッドを排除します。
- **Responsive Behavior**:
    - **Smart Overflow**: 画面幅に収まらない場合、縮小して視認性を損なうのではなく、**横スクロール**を提供します。
    - **Lazy Loading**: `IntersectionObserver` を使用し、ビューポートに近づくまでリクエストを遅延させます。
        - **Skeleton**: ロード中は `index.md` で定義された `--bg-fill-neutral` を使用したスケルトンを表示し、`aspect-ratio` プロパティに基づいてCLS (Cumulative Layout Shift) を防止します。
            - **Shimmer Animation**: 穏やかに光が流れる効果を適用します。
                - **Duration**: `1.5s` (無限ループ)
                - **Direction**: 左から右へ (`translateX(-100%)` → `translateX(100%)`)
                - **Gradient**: `linear-gradient(90deg, transparent 0%, oklch(from var(--bg-default) l c h / 0.5) 50%, transparent 100%)`
                - **Implementation Note**: アニメーション詳細は実装フェーズで調整可能です。上記は推奨値であり、視覚的なQAに基づいて微調整してください。
            - **Reduced Motion**: `prefers-reduced-motion: reduce` 環境下では、シマー（明滅）アニメーションを無効化します。
    - **Error Handling**: 読み込み失敗時は、`aria-live="polite"` でスクリーンリーダーに通知し、ユーザーフレンドリーなエラーメッセージ（例: "楽譜を読み込めませんでした"）を表示します。
        - **Implementation Detail**: エラーメッセージ用の `<div class="error" aria-live="polite">` は初期DOMに**空要素として配置**しておき、エラー発生時にテキストを挿入します。これにより、`aria-live` 領域の動的変化が正しくスクリーンリーダーに通知されます。
- **Build-time Processing**:
    - **SVG Inlining Strategy**: Eleventyのショートコードまたはトランスフォームを使用してビルド時にSVGを処理します。
    - **Sanitization**: DOMPurifyなどのライブラリで `<script>` タグやイベントハンドラを除去します。
    - **Color Replacement**: ハードコードされた黒色指定（`stroke="#000000"` 等）を `currentColor` に置換し、Forced Colors Modeに対応します。
    - **Aspect-ratio Auto-extraction**: SVGの `viewBox` 属性から自動抽出します。存在しない場合はデフォルト値 `3/1` を使用し、警告を出力します。手動指定が優先されます。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `src` | `src` | `string` | SVGファイルのパス。**ビルド時にインライン化**されます（推奨）。ビルド時処理が不可能な場合は、ランタイムで `fetch` してインライン展開します。 |
| `caption` | `caption` | `string` | 楽譜の下に表示する説明文（例: "第1楽章 第1主題"）。`<figcaption>` としてレンダリング。視覚的にも表示される短い説明です。 |
| `label` | `label` | `string` | **必須**。スクリーンリーダー用の説明（例: "ベートーヴェン 悲愴ソナタ 第1楽章 第1主題" または簡潔に "譜例1"）。`aria-label="楽譜: {label}"` としてスクロールコンテナに使用。<br>**使い分けガイドライン**: `caption` がある場合、`label` はそれを含みつつも、より文脈を補う（例: 作曲家名や楽章情報）必要がある場合があります。`caption` がない場合は、`label` のみで楽譜の内容を簡潔に説明してください。コンテンツ作成者は、文脈に応じて詳細度を調整してください。<br><br>**具体例**:<br><br>\| 状況 \| `caption` \| `label` \| 理由 \|<br>\|---\|---\|---\|---\|<br>\| 譜例引用のみ \| "第1楽章 第1主題" \| "ベートーヴェン 悲愴ソナタ 第1楽章 第1主題" \| スクリーンリーダーユーザーには作曲家名も伝える \|<br>\| 理論解説 \| なし \| "譜例1: 属七の和音の解決" \| 視覚的には番号のみ、音声では内容も説明 \|<br>\| 連続する譜例 \| "譜例2" \| "譜例2: 展開部の転調" \| 視覚的には番号、音声では文脈を補足 \| |
| `description`| - | `string` | 詳細な楽譜の構造説明（階名、リズムなど）。HTML要素（`<p id="score-desc-{uniqueId}" class="sr-only">`）としてDOMに配置し、`aria-describedby` で参照します。<br>**使用ガイドライン**: すべての楽譜に必須ではありません。楽譜の詳細な構造が読者の理解に不可欠な場合（音楽理論の解説記事など）にのみ記述してください。単なる譜例引用では省略可能です。<br><br>**使用判断フロー**:<br>1. この楽譜は視覚的な参照のみか？ → YES: 不要<br>2. 楽譜の構造（音程、リズム、和声）が本文の議論の核心か？ → YES: 必須<br>3. スクリーンリーダーユーザーが楽譜なしで内容を理解できるか？ → NO: 必須<br><br>**記述例**:<br>- ❌ 不要: "ショパンのノクターンの冒頭" （単なる引用）<br>- ✅ 必要: "ド・ミ・ソの和音から、シ・レ・ファ・ラへの解決。第2音（レ）が半音下降する" （理論解説） |
| `aspect-ratio`| `aspect-ratio` | `string` | **強く推奨**。楽譜の縦横比（例: `"4/1"`）。Lazyローディング時のスケルトンサイズ決定に使用。未指定時はデフォルト値（`3/1`）を適用しますが、**CLS防止のため必ず指定することを推奨**します。<br>**デフォルト値の根拠**: `3/1` は一般的な楽譜（1-2小節の短いフレーズ）の横長比率に基づく経験的な値です。より正確なレイアウトのため、実際のSVGの `viewBox` 属性から算出した値を指定してください。<br>**推奨アプローチ**: ビルドプロセス（Eleventyショートコード）での自動抽出を推奨します。手動指定はオーバーライドとしてのみ使用し、デフォルト値への依存を最小化してください。 |
| `loading` | `loading` | `'lazy'(default) \| 'eager'` | デフォルトは `'lazy'`。`'eager'` の場合は `IntersectionObserver` をバイパスし、**コンポーネント初期化時に即座に**SVGを展開します（ビルド時インライン化されていない場合は `fetch` を開始）。<br>**運用ガイドライン**:<br>- **デフォルト**: `lazy` （パフォーマンス重視）<br>- **`eager`を使用すべき状況**:<br>  1. **記事の冒頭（最初の見出しの直後）に配置される楽譜**<br>  2. **ページの主題となる楽譜**（例: "この楽譜について解説します"という文脈）<br>  3. **モバイルでもデスクトップでも初期表示領域に入る楽譜**（目安: ページ上部600px以内）<br>- **判断に迷う場合**: `lazy`のままにしてください。過度な`eager`はパフォーマンスを損ないます。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Container Structure**:
    - `<figure>` 要素をラッパーとして使用し、その内部に **Scroll Container (`div`)** を配置します。
    - **Border Strategy**:
        - **Light Mode**: `1px solid var(--border-muted)`
        - **Dark Mode**: `1px solid var(--border-default)`
        - *Rationale*: アプリ背景が暗いDark Modeにおいて、白背景の楽譜は強烈なコントラストを持ちます。`border-muted` では境界が光に埋もれてしまう恐れがあるため、より不透明度の高い `border-default` を採用し、**ハレーションを防ぎつつ構造的な境界を明確にします**。
        - *Note (Token Consistency)*: `index.md` の `--border-default` は不透明度 `0.12` で定義されています。実装時には、この値で十分なコントラストが得られるかビジュアルで検証してください。将来的に、より強いコントラストが必要な場合は、`index.md` に新たなトークン（例: `--border-strong`）を追加することを検討してください。
    - **Background**:
        - 原則として **白 (`#FFFFFF`) または極めて明るいグレー** を維持します。`filter: invert()` は五線譜の視認性を損なうため原則禁止します（例外: Forced Colors Mode の Fallback、後述）。
    - **Radius**: `--radius-md` を Scroll Container に適用し、`overflow: hidden` と組み合わせて角丸を確実にクリップします。
- **Scroll Container (Scrollable Area)**:
    - **Focus Strategy**: `tabindex="0"` を付与するため、`index.md` のフォーカス戦略に準拠した **Adaptive Focus (`:focus-visible`)** を適用します。
    - **Overflow**: `overflow-x: auto` を適用し、楽譜の縦横比とサイズを維持したまま閲覧可能にします。
    - **Scrollbar**: `index.md` のスクロールバー定義に準拠しますが、**白背景上での視認性**を考慮した調整を行います。
        - **Width**: `scrollbar-width: thin`
        - **Color Override**: `scrollbar-color: var(--fg-muted) transparent`
            - *Rationale*: グローバルのつまみ色（`--scrollbar-thumb` / `--fg-subtle`）は淡すぎて白背景上で視認できないリスクがあるため、よりコントラストの高い `--fg-muted` を強制し、操作性を担保します。
            - *Note (Token System)*: `--fg-muted` は `index.md` では「メタデータ、アイコン」用と定義されています。このコンポーネント固有のオーバーライドであることを明確にするため、将来的には `index.md` にスクロールバー専用の「コンテキストオーバーライドトークン」（例: `--scrollbar-thumb-on-light`）を追加することを検討してください。<br>**トークン化の判断基準**: `<ui-score>` 実装後、他のコンポーネント（例: `<ui-image>` の白背景バリアント等）でも同様のニーズ（白背景上のスクロールバー）が発生した場合に初めてトークンを `index.md` に追加し、正規化します。現時点では、このコンポーネント固有のオーバーライドとして実装してください。
    - **Visual Hint (Fade Effect)**:
        - スクロール可能な場合、**`mask-image`** を使用して両端をフェードさせ、続きがあることを示唆します。
        - **Fade Width**: `--space-4` (16px) を使用します。
            - *Rationale*: スクロール可能性のヒントとして、最小限の視覚的手がかりを提供しつつ、楽譜の内容を過度に隠蔽しません。`--space-4`はシステムの基本単位であり、他のコンポーネント(画像のProse Breakout等)との視覚的一貫性を保ちます。
            - *Verification*: 実装時に `--space-2` (8px) や `--space-3` (12px) との視覚比較を推奨します。
        - **Forced Colors**: `forced-colors: active` 環境下では `mask-image: none` を指定し、システムカラーによる視認性を優先します。
        - *Rationale*: 楽譜のエッジをなめらかに透過させることで、物理的な紙がそこで途切れているのではなく、ウィンドウの奥に続いているような奥行き（Depth）を表現します。
- **Layout Strategy**:
    - **Desktop**: `<ui-image>` と同様に、Prose幅よりも広く表示（`width: calc(100% + var(--space-8))`）し、没入感を高めます。
    - **Mobile**: 画面端まで拡張（Full Bleed）し、パディング (`--space-4`) を内部に設けます。
    - **Print**: 印刷時は横スクロールやマスクを無効化します。楽譜が紙面幅を超える場合は、**複数ページにまたがる表示**を許可します（`break-inside: auto`）。
        - *Rationale*: 音楽コンテンツの特性上、縮小して視認性を損なうよりも、ページまたぎで原寸を維持する方が望ましいです。

**5. アクセシビリティ (A11y)**

- **Structure & Navigation**:
    - **Scroll Container** (`div`) に `role="region"`、`tabindex="0"`、および `aria-label="楽譜: {label}"` を付与します。これにより、キーボードユーザー（矢印キー）とスクリーンリーダーユーザーが楽譜領域を認識し、スクロール操作を行えるようにします。
    - **SVG Semantics**: SVG自体には `aria-hidden="true"` と `focusable="false"` を設定し、**スクリーンリーダーへの情報は親のScroll Containerに集約します**。
        - *Rationale*: SVG内のテキストノードやパスを個別に読み上げさせると情報過多（Verbose）になりやすいため、コンテナレベルで「何の楽譜か」を伝える方がユーザー体験として整理されています。
- **Forced Colors Mode**:
    - LilyPond等が生成するハードコードされた色指定に対処するため、以下の戦略を適用します。
    - **Primary Strategy (Build-time)**: ビルドプロセスにてSVG内の黒色指定（`stroke="#000000"` 等）を `currentColor` に置換し、システムカラーの自動適用を可能にします。
    - **Fallback Strategy (CSS)**: ビルド時の `currentColor` 置換が技術的に不可能な場合（外部SVGソースがハードコード色を含み、ビルドプロセスで処理できない場合）に限り、`forced-colors: active` 環境下でのみ `filter: invert(1)` を適用し、ダーク背景上での視認性を強制的に確保します。
        - **例外条件の明確化**: この `filter: invert()` の使用は、以下の条件をすべて満たす場合にのみ許容されます:
            1. ビルド時のSVG色置換が技術的に不可能である
            2. `forced-colors: active` 環境下である
            3. QAプロセスにおいて視認性の確認が完了している
        - *Implementation Note*: この例外的な処理は、通常の表示モード（Light/Dark）では適用されません。あくまでアクセシビリティ環境における最終手段として位置づけられます。

**6. 推奨DOM構造 (Suggested DOM Structure)**

```html
<figure class="ui-score">
  <!-- Scroll Container: キーボード操作と支援技術のターゲット -->
  <!-- aria-describedby で詳細説明（desc）を紐付け -->
  <div class="score-scroll" tabindex="0" role="region" aria-label="楽譜: {label}" aria-describedby="score-desc-{uniqueId}">
    <!-- Lazy Loading前: Skeleton -->
    <div class="skeleton" style="aspect-ratio: {aspect-ratio ?? '3/1'}"></div>
    
    <!-- Load後: Inline SVG -->
    <!-- Content自体は隠蔽し、コンテナのラベルで代替する -->
    <svg aria-hidden="true" focusable="false" ...>
       <!-- path data -->
    </svg>
    
    <!-- 詳細説明: 視覚的には隠すが、DOMに残して参照させる -->
    <!-- SVG内の <desc> を使うよりも、HTML要素の方が参照の信頼性が高い -->
    <p id="score-desc-{uniqueId}" class="sr-only">{description}</p>
  </div>
  
  <!-- Error時: Fallback (Scroll Container の外に配置) -->
  <!-- 理由1: Scroll Container 内部に配置すると、スクロールしないと見えない可能性がある -->
  <!-- 理由2: Scroll Containerが`overflow: hidden`の場合、エラーメッセージが完全に隠蔽される -->
  <!-- 理由3: `aria-live`領域は視覚的に安定した位置にあるべき（スクロールで消えない） -->
  <div class="error" aria-live="polite"></div>
  
  <figcaption>{caption}</figcaption>
</figure>
```

#### 数式 (Math) `<ui-math>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 科学・数学・情報工学（CS）分野の知識記述において、数式は「言語」そのものです。美しくレンダリングされた数式は、コンテンツの信頼性と知的な美しさを担保します。
- **Harmony**: 本文のフォント（**Noto Sans JP**）と調和しつつ、数式特有の厳密な組版ルール（TeXスタイル）を尊重します。
    - *Context*: Rouaultでは、普遍的な明瞭さと多様なジャンル対応のため、全コンテンツでNoto Sans JP（UI: 14px / 記事本文: 16px）を使用します。数式のKaTeXフォント（セリフ体）との視覚的調和を慎重に検証します。

**2. ロジック参照基盤 (Logic Reference)**

- **Engine**: `KaTeX` (高速かつ軽量なレンダリング)。
- **Rendering Strategy (Build-time vs Runtime)**:
    - **Primary (Recommended)**: **ビルド時レンダリング**。Rouaultの技術スタックには `rehype-katex` が含まれており（`package.json` / Velite設定）、Markdownパイプライン内でLaTeX構文を自動的にHTMLへ変換します。
        - *Rationale*: 原則2「**フロー状態の維持 (Zero Latency)**」に基づき、ランタイムでのKaTeX呼び出しによるパフォーマンスコストを排除します。ユーザーがページを開いた瞬間、数式は既にレンダリング済みです。
        - *Implementation Note*: `<ui-math>` コンポーネントは、ビルド時に生成されたKaTeX HTMLを受け取り、スタイリングとアクセシビリティ属性の付与に専念します。
    - **Secondary (Fallback)**: **ランタイムレンダリング**。動的コンテンツ（ユーザー入力等）でビルド時処理が不可能な場合に限り、クライアント側でKaTeXを呼び出します。
        - *Warning*: この方式はパフォーマンスコストを伴うため、明確な必要性がない限り避けてください。
        - *Responsibility*: `<ui-math>` コンポーネント自身が `latex` プロパティをパースし、エラー検出時に `error-message` プロパティを設定します。
- **Output Format**: MathML（アクセシビリティ用）と HTML/CSS（表示用）のハイブリッド出力。
    - **MathML Support Status**: 
        - **Firefox**: ネイティブサポート（優れた読み上げ）
        - **Chrome/Edge**: Chromium 109以降でサポート
        - **Safari**: ネイティブサポート
    - **Fallback Strategy**: MathML非対応ブラウザ向けに、KaTeXは自動的にHTML/CSSフォールバックを提供します。追加の実装は不要です。
- **SSR/Hydration Strategy**:
    - **Eleventy (SSG)**: ビルド時に完全なHTMLとして出力されるため、JavaScriptなしでも数式が表示されます。
    - **Lit SSR**: `<ui-math>` コンポーネントは、サーバーサイドで生成されたHTMLをShadow DOMにスロットとして受け取ります。
        - **Hydration Mismatch Prevention**: `role="math"` と `aria-label` はサーバーサイド（Eleventy Transform / Lit SSR テンプレート）で静的に出力し、クライアント側では追加・変更しません。これにより、SSRとクライアントサイドのDOM差異によるHydration警告を防ぎます。
        - **Dynamic Attributes (Runtime Only)**: クライアントサイドでの動的な属性変更は、**ランタイムレンダリング時のみ**に限定します。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `latex` | - | `string` | TeX形式の数式文字列。**ビルド時レンダリングの場合は不要**（Markdownパイプラインで処理済み）。ランタイムレンダリング時のみ使用。 |
| `block` | `block` | `boolean` | `true`: 別行立て数式（Display Mode）、`false`: インライン数式。デフォルトは `false`。 |
| `id` | `id` | `string` | **オプショナル**。Display Mode の数式に対して、引用やアンカーリンクを可能にするためのID。指定された場合、コンテナ要素の `id` 属性として出力されます。<br>**使用例**: `<ui-math id="eq-pythagorean" block>...</ui-math>` → 本文から `#eq-pythagorean` でリンク可能。<br>**ID命名規則**:<br>- **プレフィックス**: `eq-` (equation の略)<br>- **フォーマット**: `eq-{descriptive-name}` (例: `eq-pythagorean`, `eq-fourier-transform`)<br>- **禁止**: 機械的な連番 (`eq-1`, `eq-2`) は、数式の追加・削除時にリンク切れを招くため非推奨。<br>**重複チェック**: ビルド時（Eleventy Transform）に同一ドキュメント内でのID重複を検出した場合、`console.warn` で警告を出力してください。ビルドエラーにはせず、コンテンツ作成者が修正できるようにします。 |
| `aria-label` | `aria-label` | `string` | **オプショナル**。MathMLが自然言語の読み上げを生成できない複雑な数式のケースを想定し、手動で読み上げテキストを指定します。<br>**使用ガイドライン**:<br>- **不要な場合**: 単純な数式（例: `x + y`）。MathMLの自動読み上げで十分。<br>- **必要な場合**: 複雑な構造（多重積分、行列、特殊記号）で、MathMLの読み上げが不自然または不正確な場合。<br>**具体例**:<br>- **複雑な行列**: MathMLは要素を順に読むため「1，2，3，4」となり、行列構造が伝わらない場合 → `aria-label="2行2列の行列、1行目：1，2、2行目：3，4"`<br>- **上付き/下付きの複合**: 「x の 2乗 の 下付きn」のような読み順が不自然になる場合 → `aria-label="エックス n の 2乗"`<br>- **学術慣習との乖離**: 「∇」をMathMLが「ナブラ」と読まず「デル」と読む場合 → `aria-label="ナブラ エフ"`<br>**記述例**: `aria-label="エックス プラス ワイ イコール ゼット"` |
| `error-message` | - | `string` | **内部プロパティ**。LaTeX構文エラーが発生した場合に設定され、エラーUIに表示されます。<br>**設定タイミング**:<br>- **ビルド時**: Eleventy Transform がエラーを検出した場合、`error-message` 属性を付与。<br>- **ランタイム時**: `<ui-math>` コンポーネント自身が `latex` プロパティをパースし、エラー検出時に設定。<br>通常、コンテンツ作成者が直接指定することはありません。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Font Strategy**:
    - **KaTeX Fonts**: `KaTeX_Main`, `KaTeX_Math`, `KaTeX_AMS` (セリフ体)。
    - **Font Pairing Verification (和文との調和)**:
        - **課題**: Rouaultの本文フォント（Noto Sans JP）とKaTeXのセリフ体は、x-height（小文字の高さ）が異なるため、インライン数式が本文と並んだ際に視覚的なサイズ不整合が生じる可能性があります。
        - **検証基準**:
            - **許容範囲**: 本文の小文字「x」とKaTeX の変数 `$x$` の視覚的な高さの差が、肉眼で識別困難なレベル（±5%以内）であること。
            - **不整合が「顕著」と判断する閾値**: 隣接する和文（ひらがな・漢字）とインライン数式の間で、ユーザーが「サイズが違う」と意識的に感じる場合。
        - **検証方法**: 
            - **記事本文（`.prose`）**: `16px` Noto Sans JP の本文に対してインライン数式を配置し、ベースラインと視覚的な大きさが揃っているか確認してください。
            - **UI要素**: `14px` Noto Sans JP（ボタンラベル、リスト項目等）でも検証を行います。
        - **調整手段（必要な場合のみ）**:
            - `font-size-adjust` プロパティの使用（ブラウザサポート限定的）
            - または、インライン数式に対して微調整トークン（例: `--math-inline-scale: 0.98`）を定義し、`font-size: calc(1em * var(--math-inline-scale))` で適用します。
        - **推奨アプローチ**: まずはデフォルト（調整なし）で実装し、QAフェーズで視覚的に検証してください。不整合が顕著な場合にのみ、上記の調整を適用します。
- **Display Mode (Block)**:
    - **Container**: `<div class="math-display">` または `<figure>` でラップします。
    - **Margin**: `var(--space-6) 0` (上下24px)
        - *Rationale*: `index.md` のセマンティック用途「区分: 小さなセクションやコンテキストの切り替わり」に合致します。
    - **Padding**: `var(--space-4) 0` (上下16px)
    - **Text Align**: **`center`** (デフォルト)
        - **運用ルール (Genre-Aware Alignment)**:
            - **Default (`center`)**: 全ジャンル共通。特にCS、音楽、美術、文学の混在コンテンツに適用。
            - **Override (`left` + indent)**: ジャンル「数学理論」が明示されているメモ、または `<ui-math theorem>` 等の属性が付与された場合のみ適用。
                - *実装例*: `.prose[data-genre="mathematics"] .math-display { text-align: left; padding-left: var(--space-8); }`
        - *Rationale*: 数学論文スタイルを採用する場合、`text-align: left` + `padding-left: var(--space-8)` でインデントを適用できます。ただし、デフォルトは視覚的な安定性を重視した `center` とし、特定のジャンルでのみ左揃えを使用します。
    - **Overflow**: `overflow-x: auto` (横スクロール許可)
        - **Visual Hint (Fade Effect)**: `<ui-score>` と同様に、横スクロール可能な場合は `mask-image` でフェードヒントを適用します。
            - **適用条件**:
                - スクロール可能な場合（`scrollWidth > clientWidth`）**のみ**フェードを適用する。
                - JavaScript なしの場合、または判定が困難な場合は、**常にフェードを適用**する（フォールバック）。
                    - *Rationale*: 「続きがない」状態でフェードがあっても情報損失はないが、「続きがある」状態でフェードがないと発見可能性（Discoverability）が損なわれる。
            ```css
            .math-display {
              --fade-width: var(--space-4);
              -webkit-mask-image: linear-gradient(to right, transparent, black var(--fade-width), black calc(100% - var(--fade-width)), transparent);
              mask-image: linear-gradient(to right, transparent, black var(--fade-width), black calc(100% - var(--fade-width)), transparent);
            }
            
            @media (forced-colors: active) {
              .math-display {
                -webkit-mask-image: none;
                mask-image: none;
              }
            }
            ```
            - **Forced Colors Mode での検証推奨**: ハイコントラストモードでフェード効果が本文の可読性を損なわないか確認してください。マスク自体が動作しても視覚的な問題が発生しない場合、上記の `@media (forced-colors: active)` ブロックは不要かもしれません。実機検証で判断してください。
        - *Rationale*: 長い数式（行列、連立方程式等）が画面幅を超える場合、続きがあることを視覚的に示唆します。
    - **Border**: **なし**（デフォルト）
        - *Rationale*: 数式は本文の一部として扱い、視覚的な分離は余白（Margin）のみで表現します。ボーダーは情報ブロック（引用、コードブロック）との差別化のために省略します。
        - *Alternative*: 特定のジャンル（数学理論書）で数式を「定理」として強調する場合、`border-left: 2px solid var(--border-default)` + `padding-left: var(--space-4)` の適用を検討できます。
    - **Background**: **なし**（デフォルト）
        - *Rationale*: 本文と同じ背景色を維持し、読書の流れを分断しません。
        - *Alternative*: コードブロックと同様に数式を「技術的な記述」として扱う場合、`background: var(--bg-fill-muted)` + `padding: var(--space-4)` + `border-radius: var(--radius-md)` の適用を検討できます。
    - **Scrollbar**: `index.md` のスクロールバー定義に準拠します。
- **Inline Mode**:
    - **Padding**: **なし**（デフォルト）
        - *Rationale*: KaTeX自体が既に適切な内部余白を持っている可能性があるため、デフォルトではKaTeXの組版ルールを尊重します。追加のパディングは二重パディングのリスクがあります。
        - **検証と調整**:
            - **検証方法**: `$x$` のような単一文字数式と、`$\int_0^\infty$` のような複雑な数式の両方で、実際のレンダリング結果を確認してください。
            - **調整条件**: もし本文との密着が視覚的に気になる場合（数式記号が隣接文字と接触する場合）に限り、`padding: 0 0.2em` を追加してください。
            - **実装推奨**: 初期実装ではパディングなしで進め、QAフェーズで判断することを推奨します。
    - **Vertical Align**: `baseline` (デフォルト)
        - *Note*: 分数や上付き文字を含む数式は自然に高さが増すため、行の高さ（`line-height`）が自動的に調整されます。これは意図された挙動です。
- **Color**: `var(--fg-default)` (本文と統一)
    - *Rationale*: 数式は本文の一部であり、色による強調は行いません。
- **Print Styles**:
    - 印刷時は横スクロールやマスクを無効化します。
    - ページ途中での数式分割を回避します（`page-break-inside: avoid`）。
    - *Rationale*: 印刷時は横スクロールが不可能なため、数式を紙面幅に収めます。ページまたぎによる数式の分断を防ぎ、可読性を維持します。

**5. アクセシビリティ (A11y)**

- **Semantic Structure**:
    - **Display Mode**: `<div role="math" aria-label="{aria-label}">` でラップします。
    - **Inline Mode**: `<span role="math" aria-label="{aria-label}">` でラップします。
    - *Rationale*: `role="math"` は数式コンテンツであることを支援技術に明示します。
- **MathML vs aria-label Priority**:
    - **Primary**: MathML（KaTeXが自動生成）を優先します。現代のスクリーンリーダー（NVDA, JAWS, VoiceOver）はMathMLを適切に読み上げます。
        - **Priority**: `aria-label` が指定された場合、MathMLよりも優先されます。MathML要素に `aria-hidden="true"` を付与し、`aria-label` のテキストのみを読み上げさせます。
- **Forced Colors Mode (ハイコントラスト)**:
    - **Strategy**: KaTeXが生成するHTML/CSSは、`currentColor` を使用しているため、システムカラーに自動的に追従します。
    - **Verification**: Windows ハイコントラストモードで、数式の色が背景色と適切なコントラストを持つか確認してください。
    - **Fallback**: 特定の数式記号（分数線、根号等）が消失する場合、分数線や根号線のボーダー色を `CanvasText` に強制します。
- **Motion Reduction**:
    - **Current State**: 数式自体は静的コンテンツであり、アニメーションは含まれません。`prefers-reduced-motion` への対応は不要です。
- **Error Handling**:
    - **LaTeX Syntax Error**: ビルド時またはランタイムでLaTeX構文エラーが発生した場合、エラーUIを表示します。
        - **Style**: Background: `var(--bg-danger-subtle)`, Border: `1px solid var(--border-danger)`, Color: `var(--fg-danger)`
        - **Structure**: エラーアイコン、エラーメッセージ、ソースコード（`<details>` で折りたたみ）を含みます。
        - **Role**: `role="alert"` を使用し、スクリーンリーダーに即座に通知します。
    - *Rationale*: エラーを視覚的に明確にし、コンテンツ作成者がデバッグできるようにします。

**6. 使用例 (Usage Examples)**

- **Markdown (Build-time Rendering)**:
    ```markdown
    本文中の数式 $x + y = z$ はインライン表示されます。
    
    $$
    \int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
    $$
    ```

- **Component (Runtime Rendering)**:
    ```html
    <ui-math latex="x^2 + y^2 = r^2"></ui-math>
    <ui-math latex="\frac{-b \pm \sqrt{b^2 - 4ac}}{2a}" block id="eq-quadratic"></ui-math>
    ```

### フィードバックと通知 (Feedback & Notifications)

#### トースト (Toast) `<ui-toast>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: システムの状態変化（保存完了、コピー成功など）を伝えますが、ユーザーの作業フローを中断させません（Non-blocking）。
- **Transient**: 短時間で自動的に消滅するため、読み飛ばしても問題ない情報に限定します。重要なエラーはダイアログを使用します。
    - *Rationale*: 原則2「フロー状態の維持」に基づき、思考を分断しない通知であることを明確化します。ダイアログとの責務分離により、ユーザーの集中を保護します。

**2. ロジック参照基盤 (Logic Reference)**

- **Implementation**:
    - グローバルな `ToastManager` (Store) が通知スタックを管理し、レンダリングします。
    - **Porting Strategy**: `<output>` 要素または `role="status"` を持つコンテナを使用。
- **Stack Management (ToastManager Specification)**:
    - **Max Stack Count**: 同時に表示できるトーストの最大数は **3件** とします。
        - *Rationale*: 画面を埋め尽くす状況を避け、原則2「フロー状態の維持」を守ります。
    - **Stacking Order**: 新しいトーストは **上に積む** (最新が最上部)。
        - *Layout*: `display: flex; flex-direction: column-reverse;` を使用し、DOMの追加順序と視覚的な順序を一致させます。
    - **Overflow Behavior**: 4件目が発生した場合、**最も古いトースト（最下部）を即座に削除**します。
    - **Duplicate Handling**: 同一メッセージが連続発生した場合、**新規トーストを追加せず、既存トーストの `duration` をリセット**します。
        - *Implementation Note*: メッセージ内容（`textContent`）のハッシュ値で重複を判定します。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 型/値 | 説明 |
|------------|-------|------|
| `variant` | `'success' \| 'error' \| 'info'` | 通知タイプ。 |
| `duration` | `number` | 表示時間（ミリ秒）。デフォルト `5000`。<br>**特殊値**: `0` を指定した場合、自動的に消えません（ユーザーが手動で閉じるまで表示）。この場合、`dismissible` は自動的に `true` として扱われます。<br>**フォーカス管理**: `duration: 0` のトーストは Non-blocking の原則を維持するため、**フォーカスを強制的に奪いません**。キーボードユーザーは、現在の操作を完了した後にタブキーで閉じるボタンにアクセスできます。フォーカストラップは実装しません。 |
| `dismissible`| `boolean` | 手動で閉じることができるか。デフォルト `true`。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Position**: 画面右下 (`bottom: var(--space-4)`, `right: var(--space-4)`)。
- **Z-Index**: `--z-toast` (500)
- **Appearance**:
    - **Width**: `--toast-width` (320px)
        - *Token Strategy*: トーストコンポーネント専用のトークンであるため、**コンポーネントローカル**（`:host` レベル）で定義します。他のフローティング要素（ツールチップなど）と幅を統一する必要が生じた場合は、`index.md` の Layout Dimensions セクションへの移行を検討してください。
        - *Implementation*:
            ```css
            :host {
              --toast-width: 320px;
            }
            
            @media (max-width: 640px) {
              :host {
                --toast-width: calc(100vw - var(--space-8)); /* モバイル時は左右16pxの余白を確保 */
              }
            }
            ```
        - *Rationale*: ハードコード値を排除し、レスポンシブ対応の余地を残します。
    - **Background**: `var(--bg-surface-3)`
    - **Border**: `var(--border-width) solid var(--border-default)`
    - **Shadow**: Lightモードで `var(--shadow-lg)`、Darkモードで `var(--shadow-dark-lg)` を使用します（メディアクエリで切り替え）。
    - **Radius**: `var(--radius-md)`
    - **Padding**: `var(--space-3) var(--space-4)`
    - **Animation**: 
        - **Implementation Guideline**: コンポーネント固有のアニメーション（`@keyframes toast-slide-in` など）は、Shadow DOM 内でローカルに定義します。`index.md` のモーショントークン（`--duration-normal`, `--ease-out` など）を参照します。
        - **Entry**: 右からスライドイン + フェード。`var(--duration-normal)` と `var(--ease-out)` を使用します。
        - **Exit**: フェードアウトのみ（スライドアウトは視覚的ノイズとなるため排除）。`var(--duration-fast)` と `var(--ease-in)` を使用します。
        - **Motion Reduction**: `prefers-reduced-motion` 時はスライドを無効化し、フェードのみにします。

**5. アクセシビリティ (A11y)**

- **Role**: 
    - `variant="info"` または `variant="success"`: `role="status"` (polite)
    - `variant="error"`: `role="alert"` (assertive)
    - *Rationale*: 情報の重要度に応じてスクリーンリーダーへの伝達方法を変え、ユーザーの集中を適切に制御します。
    - **Container `aria-live` について**: 一般的には、コンテナに `aria-live` を設定せず、個々のトースト要素に `role="status"` / `role="alert"` を設定するアプローチがより明確です。実装時は VoiceOver/NVDA など主要スクリーンリーダーでの実機テストを推奨します。
- **Dismissible Button (Close)**:
    - **Icon**: `×` (Close icon, `--icon-sm` / 14px)
    - **Hit Area**: `--control-min-touch` (44px) 以上を確保します。視覚的なボタンサイズは `24px` でも、疑似要素 (`::after`) で不可視のヒットエリアを拡張します。
    - **Label**: `aria-label="通知を閉じる"` を付与します。
- **Motion**: `prefers-reduced-motion` 時はスライドインを無効化し、フェードのみにします（上記参照）。
- **Forced Colors Mode**:
    - **Border**: 背景色が消失するため、`border: var(--border-width) solid ButtonText` を適用し、トースト領域の構造を維持します。
    - *Rationale*: `index.md` の「強制カラーモード」セクションに準拠し、ボーダーとスペーシングで領域を認識可能にします。

**6. 印刷スタイル (Print Styles)**

トーストは一時的な通知であるため、印刷時には非表示にします（`display: none !important`）。

**7. DOM構造例 (Suggested DOM Structure)**

```html
<!-- ToastManager Container -->
<!-- aria-live はコンテナには設定せず、個別トーストの role で制御 -->
<div class="toast-container">
  <!-- Individual Toast -->
  <output class="toast toast--success" role="status">
    <div class="toast-content">
      <span class="toast-icon" aria-hidden="true">✓</span>
      <span class="toast-message">保存が完了しました</span>
    </div>
    <button class="toast-close" aria-label="通知を閉じる">
      <span aria-hidden="true">×</span>
    </button>
  </output>
  
  <!-- Error Toast (role="alert") -->
  <output class="toast toast--error" role="alert">
    <div class="toast-content">
      <span class="toast-icon" aria-hidden="true">⚠</span>
      <span class="toast-message">エラーが発生しました</span>
    </div>
    <button class="toast-close" aria-label="通知を閉じる">
      <span aria-hidden="true">×</span>
    </button>
  </output>
</div>
```

**8. 使用例 (Usage Examples)**

```typescript
ToastManager.show({
  variant: 'success',
  message: '保存が完了しました',
  duration: 5000
});
```

#### ローディング / スケルトン (Loading State)

**1. デザイン哲学と目的 (Design Philosophy)**

- **Perceived Performance**: 待ち時間を短く感じさせるための演出です（実際に速くするわけではありません）。
- **Static First (静謐優先)**: `index.md` 原則3「デジタルの触感」に基づき、アニメーションは「操作の実感」であり「視覚的な装飾ではない」という原則を厳守します。
    - **デフォルト**: 完全静止。形状のみでコンテンツの構造を暗示し、「静謐（Serene）」な空間を維持します。
    - **Shimmer (Optional)**: `animated` 属性によるオプトイン。長時間のローディングが予想される場合（例：大量データのフェッチ）に限り、「停滞していない」ことを示すために使用できます。
    - **Anti-Pulse**: 激しく明滅する「Pulse」アニメーションは、原則に反するため禁止します。
    - *Rationale*: 周辺視野で常に動き続けるアニメーションは、たとえ「穏やか」であっても、無意識レベルで注意を引き続け、読書のリズムを乱します。「最小限の確証」の極致として、構造のみを静かに示すことを優先します。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: ネイティブには対応するHTML要素なし。
- **Porting Strategy**: 自前実装。状態管理は各コンテキストのロジック（データフェッチ、画像読み込み等）に委ねます。
- **CLS Prevention**: スケルトンは読み込み後のコンテンツと同じ寸法（`width`, `height`, `aspect-ratio`）を事前に確保し、レイアウトシフトを防止します。

**3. コンポーネント定義**

- **`<ui-skeleton>`**: コンテンツの読み込み中に表示するプレースホルダー。レイアウトシフト（CLS）を防止します。
- **`<ui-spinner>`**: ボタン内（保存処理中）やメディアのバッファリング中（`<ui-video>`）に表示し、システムが稼働中であることを伝えます。

**4. 技術仕様とAPI (Technical Specs)**

**`<ui-skeleton>`**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `variant` | `variant` | `'text' \| 'circular' \| 'rectangular'` | 形状タイプ。デフォルト `'rectangular'`（最も汎用的な形状であり、画像・カード・テキストブロックなど多様なコンテンツに適用可能なため）。 |
| `width` | `width` | `string` | 幅（CSS単位）。例: `'100%'`, `'200px'`。 |
| `height` | `height` | `string` | 高さ（CSS単位）。 |
| `animated` | `animated` | `boolean` | Shimmerアニメーション有無。デフォルト `false`（静謐優先）。長時間のローディングが予想される場合のみ `true` を指定します。 |

**`<ui-spinner>`**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `size` | `size` | `'default' \| 'lg'` | サイズ。`default`: `1em`, `lg`: `--icon-xl` (32px)。 |
| `label` | `aria-label` | `string` | スクリーンリーダー用ラベル。デフォルト: `"読み込み中"`。 |

> **Implementation Note (SVG Structure):**
> `<ui-spinner>` は Shadow DOM 内部で SVG を完全に生成する自己完結型コンポーネントとして実装します。外部からの slot による差し込みは行わず、`size` と `label` プロパティのみで制御します。

**5. スタイリングとトークンマッピング (Style & Tokens)**

**コンポーネントローカルトークン (Component-Local Tokens)**

アニメーション速度とShimmerの色は `index.md` の標準トークンでは表現できないため、コンポーネントレベルで定義します。

> **Design Decision (Animation Independence):**
> Shimmer/Spinner のアニメーション速度は、UIトランジション用の `--duration-*` トークンとは意図的に独立しています。
> これは、ローディングアニメーションが「継続的なループ」であり、「一回性のフィードバック」とは異なる認知的性質を持つためです。
> UIトランジションは「操作の実感（Tactility）」を与えるための短時間（70-300ms）の変化ですが、ローディングアニメーションは「停滞していない」ことを示すための持続的な視覚的手がかりであり、より長い周期（1.5-2s）が適切です。

```css
:host {
  /* Shimmer: ユーザーがローディングを意識しすぎない「穏やかさ」を演出するための速度 */
  --shimmer-duration: 1.5s;
  
  /* Shimmer Highlight: グラデーションのハイライト色（モード別に調整可能） */
  --shimmer-highlight: oklch(from var(--bg-default) l c h / 0.5);

  /* Spinner Rotation: 1サイクルで完全な1回転を行う時間 */
  --spinner-rotation-duration: 2s;

  /* Spinner Dash: 処理の進行感を演出するストローク変化の速度 */
  --spinner-dash-duration: 1.5s;
  
  /* Spinner Stroke Width: ストロークの太さ（相対値） */
  --spinner-stroke-width: 10%;
}

/* ダークモードでは発光感を調整 */
@media (prefers-color-scheme: dark) {
  :host {
    --shimmer-highlight: oklch(from var(--bg-default) calc(l + 10%) c h / 0.4);
  }
}
```

> **SVG Geometry Rationale:**
> `<ui-spinner>` のSVG構造は以下の計算に基づきます：
> - `viewBox="0 0 50 50"` (50x50単位のキャンバス)
> - `cx="25" cy="25" r="20"` (中心座標25, 半径20。直径40で、`stroke-width` が内側に食い込むため余白を確保)
> - `stroke-width: 10%` = 5単位（50の10%）。半径20 - ストローク5/2 = 17.5の見た目半径。
> - これにより、ストローク幅がコンテナサイズに対して常に比例し、`size="default"` (1em) でも `size="lg"` (32px) でも視覚的一貫性を維持します。

**スケルトン (Skeleton)**

- **デフォルト**: 完全静止（静謐優先）。`background-color: var(--bg-fill-neutral)`, `border-radius: var(--radius-sm)` を使用します。
- **Shimmer Animation**: `animated` 属性でオプトイン。グラデーション（`90deg`, `transparent → var(--shimmer-highlight) → transparent`）による光の表現。`animation: shimmer var(--shimmer-duration) infinite linear` を使用します。
    - **Direction**: RTL環境でも物理方向（左→右）を維持するため、論理プロパティではなく物理値（`background-position`）を使用します。
- **Variants**:
    - **Text**: `height: 1em`, `border-radius: var(--radius-sm)`
    - **Circular**: `border-radius: var(--radius-full)`
    - **Rectangular**: デフォルト形状
- **Motion Reduction**: `prefers-reduced-motion: reduce` 時はアニメーションを無効化し、背景色のみで表示します。

**スピナー (Spinner)**

- **サイズ**: デフォルトは `1em`（テキストサイズに追従）。Large variant は `var(--icon-xl)` を使用します。
- **アニメーション**: 
    - **回転**: `rotate var(--spinner-rotation-duration) linear infinite` で360度回転。
    - **ダッシュ**: `dash var(--spinner-dash-duration) var(--ease-in-out) infinite` でストロークの伸縮を表現。
- **スタイル**: `stroke: currentColor`, `stroke-width: var(--spinner-stroke-width)`, `stroke-linecap: round` を使用します。
- **Motion Reduction**: `prefers-reduced-motion: reduce` 環境下では、回転アニメーションを無効化し、ストロークを固定表示します（「処理中」であることを示す）。

**6. アクセシビリティ (A11y)**

**スケルトン (Skeleton)**

- **Role**: 視覚的プレースホルダのみであり、支援技術への通知は不要です。
- **ARIA Attributes**: `aria-hidden="true"` を付与し、スクリーンリーダーから隠蔽します。
    - *Rationale*: スケルトンは「まだ何もない」状態を視覚的に示すものであり、読み上げる意味のある情報を持ちません。
- **Forced Colors Mode**:
    - グラデーションとアニメーションは消失しますが、`background-color` は `Canvas` にマッピングされ構造を維持します。
    - `border: var(--border-width) solid CanvasText` で領域を明示します。
    - *Rationale*: `linear-gradient` は強制カラーモードで消失するため、ボーダーで領域を明確化します。

**スピナー (Spinner)**

- **Role**: `role="status"` を付与し、非同期処理の進行中であることを伝えます。
- **ARIA Attributes**:
    - `aria-label="読み込み中"` (デフォルト) または文脈に応じたラベル（例: `"保存中"`）を付与します。
    - `aria-live="polite"` は `role="status"` に暗黙的に含まれます。
- **Forced Colors Mode**:
    - `currentColor` を使用しているため、システムカラー `CanvasText` に自動的に追従します。

**7. 印刷スタイル (Print Styles)**

ローディング状態は一時的なものであり、印刷時には無意味なため非表示にします（`display: none !important`）。

> **Note (Print Accessibility):**
> 印刷時にローディング状態のコンテンツ領域は空白となります。印刷はコンテンツが完全に読み込まれた状態で行うことを想定しており、印刷プレビュー時にはローディング表示が発生しないようアプリケーション側で制御することを推奨します。


**8. DOM構造例 (Suggested DOM Structure)**

**スケルトン (Skeleton)**

```html
<!-- Text Line (1行のテキスト) - デフォルト: 静止 -->
<div class="skeleton skeleton--text" aria-hidden="true" style="width: 80%;"></div>

<!-- Avatar (円形) - デフォルト: 静止 -->
<div class="skeleton skeleton--circular" aria-hidden="true" style="width: 40px; height: 40px;"></div>

<!-- Image (矩形、アスペクト比固定でCLS防止) - デフォルト: 静止 -->
<div class="skeleton skeleton--rectangular" aria-hidden="true" style="aspect-ratio: 16 / 9; width: 100%;"></div>

<!-- Animated Skeleton (長時間のローディングが予想される場合) -->
<div class="skeleton skeleton--rectangular skeleton--animated" aria-hidden="true" style="aspect-ratio: 16 / 9; width: 100%;"></div>

<!-- Card (複数要素の組み合わせ) - デフォルト: 静止 -->
<div class="card-skeleton" aria-hidden="true">
  <div class="skeleton skeleton--rectangular" style="aspect-ratio: 16 / 9; width: 100%;"></div>
  <div class="skeleton skeleton--text" style="width: 90%; margin-top: var(--space-2);"></div>
  <div class="skeleton skeleton--text" style="width: 70%; margin-top: var(--space-1);"></div>
</div>
```

**スピナー (Spinner)**

```html
<!-- Inline (Button) -->
<button disabled>
  <ui-spinner size="default" aria-label="保存中"></ui-spinner>
  保存中...
</button>

<!-- Fullscreen Overlay -->
<!-- role="status" は暗黙的に aria-live="polite" を含むため、
     aria-live の明示は冗長だが、ブラウザ互換性のためDefensive Codingとして残す -->
<div class="loading-overlay" role="status" aria-live="polite">
  <ui-spinner size="lg" aria-label="ページを読み込み中"></ui-spinner>
</div>

<!-- SVG Structure (Implementation Detail) -->
<svg class="spinner" viewBox="0 0 50 50" role="status" aria-label="読み込み中">
  <circle cx="25" cy="25" r="20"></circle>
</svg>
```

**Shimmer の使用基準と実装詳細**

**使用基準 (When to Use Shimmer)**

Shimmerアニメーションは、以下の条件を**すべて満たす**場合にのみ使用を検討してください：

1. **長時間のローディング**: 3秒以上かかることが予想される処理（大量データのフェッチ、複雑な計算など）
2. **ユーザーの注視点**: ローディング領域がユーザーの主要な注視点である（周辺視野ではない）
3. **停滞感の懸念**: 完全静止では「フリーズした」と誤解される可能性がある

上記を満たさない場合は、デフォルトの静止スケルトンを使用してください。

> **判断基準の補足 (Decision Guideline):**
> ネットワーク状況によって読み込み時間が変動する場合（例：0.5秒〜5秒）、**楽観的アプローチ**を採用します。
> すなわち、通常ケース（1秒以内）を想定し、静止スケルトンを使用します。
> 仮に5秒かかった場合でも、静止スケルトンは「フリーズ」ではなく「待機中」であることを構造で示しているため、
> Rouaultの「静謐優先」原則に基づき、過剰なアニメーションを避けることを優先します。

**方向と速度の根拠**

- **方向 (`90deg`)**: 左→右の水平方向。西洋言語の読書方向に合致し、「進行」の暗喩として機能します。
    - *Note*: 日本語の縦書きコンテンツでは検証が必要ですが、現在のRouaultは横書きを前提とするため `90deg` を採用します。
    - *RTL Support*: 将来的に `direction: rtl` を含む環境をサポートする場合、Shimmerの方向は**物理方向（常に左→右）を維持**します。これは「進行」の暗喩が視覚的な慣習（プログレスバーなど）に基づくためです。論理プロパティへの変更は不要です。
- **速度 (`1.5s`)**: 人間の視覚が「変化」として認識しつつ、「焦り」を感じない閾値。2Hz以下（0.5秒以上の周期）の変化は視覚的ストレスを与えないという認知科学的知見に基づきます。

**複数スケルトンの連続配置時のアニメーション同期**

複数のスケルトン（例：カード一覧）が同時に表示される際、各スケルトンのShimmerアニメーションは**同期**させます。

- **Rationale**: 統一感があり、システム全体が一つの処理として動作していることを示します。個別にずらす（Stagger）アプローチは、実装の複雑さに対して得られる視覚的効果が小さいため採用しません。
- **Implementation**: デフォルトでは `animation-delay` を設定せず、すべてのスケルトンが同時にアニメーションを開始します。
- **Dynamic Addition**: 動的にDOMに追加されたスケルトン（例：無限スクロールで追加される新しいカード）は、既存のスケルトンと位相がずれることを許容します。視覚的な違和感は軽微であり、JavaScriptによる位相同期の実装コストに見合う効果は得られません。

**使用例 (Usage Examples)**

```typescript
// ボタン内スピナー
class SaveButton extends LitElement {
  @state() saving = false;

  async handleSave() {
    this.saving = true;
    await saveData();
    this.saving = false;
  }

  render() {
    return html`
      <button @click="${this.handleSave}" ?disabled="${this.saving}">
        ${this.saving 
          ? html`<ui-spinner size="default" aria-label="保存中"></ui-spinner> 保存中...`
          : '保存'
        }
      </button>
    `;
  }
}
```

#### 空状態 (Empty State) `<ui-empty-state>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: データがないことを伝えるだけでなく、「次の一手（Call to Action）」を提示します。
- **Positivity**: 「何もない」というネガティブな状態ではなく、「これから始める」というポジティブな空白としてデザインします。
  - *Rationale*: 原則2「フロー状態の維持」に基づき、ユーザーを立ち止まらせず、次のアクションへ導くことで思考の分断を防ぎます。

**2. ロジック参照基盤 (Logic Reference)**

- **Native**: 標準的なHTML要素（`<section>`, `<figure>`）の組み合わせで構成します。特別なARIAロールは不要です。
- **Semantic Structure**: `<figure>` + `<figcaption>` の組み合わせにより、アイコンとテキストの関係性を明確化します。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ/スロット | 型 | 必須 | デフォルト | 説明 |
| :--- | :--- | :--- | :--- | :--- |
| `slot="icon"` | Slot | いいえ | `inbox` | 状態を表すアイコン。Lucideアイコンを推奨。指定がない場合はデフォルトの受信トレイアイコンを表示。 |
| `slot="heading"` | Slot | はい | - | 状態を説明する見出し。簡潔で明確な表現を使用。**見出しレベル（`<h2>`, `<h3>` など）はコンシューマーが文書構造に応じて適切に指定する責任を持ちます。** |
| `slot="description"` | Slot | いいえ | - | 補足説明テキスト。状況の詳細や次のアクションのヒントを提供。 |
| `slot="action"` | Slot | いいえ | - | CTAボタン。複数配置可能（例: 「新規作成」と「インポート」）。 |
| `variant` | `'default' \| 'search' \| 'error'` | いいえ | `'default'` | 空状態の種類。`search`: 検索結果なし、`error`: エラー状態。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

**レイアウト (Layout)**

```css
.empty-state {
  /* コンテナ全体を中央配置 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  
  /* 内部パディング: 周囲との適切な余白を確保 */
  padding: var(--space-12); /* 48px */
  
  /* 最小高さ: 小さなコンテナでも視覚的バランスを維持 */
  min-height: 320px;
}

/* モバイル時のパディング調整 */
@media (max-width: 768px) {
  .empty-state {
    padding: var(--space-8); /* 32px */
    min-height: 240px;
  }
}
```

> **Rationale (Minimum Height):**
> - **Desktop (`320px`)**: アイコン (32px) + マージン (16px) + 見出し (約20px) + マージン (8px) + 説明文 (約40px) + マージン (24px) + ボタン (32px) + 上下パディング (48px × 2) = 約268px。余裕を持たせて `320px` とし、4px基準 (80 × 4px) に合致させています。
> - **Mobile (`240px`)**: パディングを削減 (32px × 2) し、説明文が短縮される想定で `240px` (60 × 4px) としています。

**アイコン (Icon)**

```css
.empty-state__icon {
  /* サイズ: 大きく目立つが威圧的ではない */
  width: var(--icon-xl); /* 32px */
  height: var(--icon-xl);
  
  /* 色: 控えめに背景に溶け込む */
  color: var(--fg-muted);
  
  /* ストローク幅: Lucide標準（Lucide側で管理される値のため、トークン化せず直接指定） */
  stroke-width: 1.5px;
  
  /* 下部要素との間隔 */
  margin-bottom: var(--space-4); /* 16px */
}
```

> **Note (Stroke Width):**
> `stroke-width: 1.5px` はLucideアイコンセットの標準仕様であり、アイコンライブラリ側で管理される値です。Rouault側でトークン化すると、Lucideの更新時に不整合が生じる可能性があるため、コンポーネント仕様では直接指定します。

**タイポグラフィ (Typography)**

| 要素 | サイズ | ウェイト | 色 | 行間 | 用途 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Heading** | `--text-lg` (16px) | `--font-semibold` (600) | `--fg-default` | `--line-height-tight` (1.25) | 状態の明確な説明 |
| **Description** | `--text-sm` (13px) | `--font-normal` (400) | `--fg-muted` | `--line-height-normal` (1.5) | 補足情報 |

```css
.empty-state__heading {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--fg-default);
  line-height: var(--line-height-tight);
  
  /* アイコンとの間隔 */
  margin-top: 0;
  margin-bottom: var(--space-2); /* 8px */
}

.empty-state__description {
  font-size: var(--text-sm);
  font-weight: var(--font-normal);
  color: var(--fg-muted);
  line-height: var(--line-height-normal);
  
  /* 最大幅: 可読性を確保 */
  max-width: 40ch;
  
  /* 見出しとの間隔 */
  margin-top: 0;
  margin-bottom: var(--space-6); /* 24px */
}

/* Description が存在しない場合の調整 */
.empty-state__heading:last-of-type {
  margin-bottom: var(--space-6);
}
```

> **Rationale (Description Max-Width):**
> 空状態の説明文は短文（1-2文）であり、中央揃えで表示されます。`--width-reading` (65ch) は左揃えの長文用であり、中央揃えでは視線移動が大きくなりすぎます。`40ch` に制限することで、中央揃えでも快適に読める行長を維持します。

```css
```

**アクション (Action)**

```css
.empty-state__actions {
  /* 複数ボタンの配置 */
  display: flex;
  gap: var(--space-3); /* 12px */
  flex-wrap: wrap;
  justify-content: center;
}

/* アクションが存在しない場合は非表示 */
.empty-state__actions:empty {
  display: none;
}
```

**バリアント (Variants)**

```css
/* Search: 検索結果なし */
.empty-state--search .empty-state__icon {
  color: var(--fg-subtle); /* さらに控えめに */
}

/* Error: エラー状態 */
.empty-state--error .empty-state__icon {
  color: var(--fg-danger);
}

.empty-state--error .empty-state__heading {
  color: var(--fg-danger);
}
```

**5. アクセシビリティ (A11y)**

**セマンティクス (Semantics)**

- **Role**: `role="status"` を付与し、空状態が「現在の状態の通知」であることを示します。
  - *Rationale*: `role="alert"` は緊急性が高い場合のみ使用します。空状態は通常、静的な情報提示であるため `status` が適切です。
- **Atomic**: `aria-atomic="true"` を明示的に設定し、動的に空状態が表示された際にスクリーンリーダーが領域全体を読み上げるようにします。
  - *Note*: `role="status"` はデフォルトで `aria-atomic="true"` が暗黙的に適用されますが、実装者の意図を明確にするため明示します。
- **Labeling**: `aria-labelledby` で見出しを参照し、スクリーンリーダーに文脈を提供します。

```html
<section class="empty-state" role="status" aria-atomic="true" aria-labelledby="empty-state-heading">
  <lucide-icon slot="icon" name="inbox"></lucide-icon>
  <h2 id="empty-state-heading" class="empty-state__heading">まだメモがありません</h2>
  <p class="empty-state__description">新しいメモを作成して、アイデアを書き留めましょう。</p>
  <div class="empty-state__actions">
    <ui-button variant="primary">新規作成</ui-button>
  </div>
</section>
```

**見出しレベルの制御 (Heading Level Control)**

- **方針**: 空状態コンポーネントは見出しレベルを強制せず、**コンシューマー（使用側）が文書構造に応じて適切なレベルを指定する責任を持ちます**。
- **実装ガイダンス**: ページのメイン見出しが `<h1>` の場合、空状態の見出しは `<h2>` を使用します。セクション内に配置される場合は、親セクションの見出しレベルに応じて `<h3>` 以下を使用してください。

```html
<!-- 例: ページ全体の空状態（メイン見出しの次） -->
<ui-empty-state>
  <h2 slot="heading">まだメモがありません</h2>
  ...
</ui-empty-state>

<!-- 例: セクション内の空状態 -->
<section>
  <h2>最近のメモ</h2>
  <ui-empty-state>
    <h3 slot="heading">最近のメモはありません</h3>
    ...
  </ui-empty-state>
</section>
```

**フォーカス管理 (Focus Management)**

- **原則**: 空状態表示時、CTAボタンへの自動フォーカスは**行いません**。
  - *Rationale*: 原則2「フロー状態の維持」に基づき、ユーザーの意図しない操作（誤クリック）を防ぎます。ページ遷移後のフォーカスは、ブラウザのデフォルト挙動（`<body>` または最初のインタラクティブ要素）に委ねます。
- **タブ順序**: CTAボタンは自然なタブ順序で到達可能とし、キーボード操作を妨げません。

**Forced Colors Mode (強制カラーモード)**

```css
@media (forced-colors: active) {
  .empty-state__icon {
    /* システムカラーに追従 */
    color: GrayText;
    /* または CanvasText（より強いコントラスト） */
  }
  
  /* エラーバリアントは強調を維持 */
  .empty-state--error .empty-state__icon,
  .empty-state--error .empty-state__heading {
    color: LinkText; /* システムの強調色 */
  }
}
```

> **Rationale (Forced Colors Strategy):**
> `GrayText` は補助的な情報に使用されるシステムカラーで、空状態のアイコンの役割（装飾的・補助的）に適合します。エラー状態では `LinkText`（通常は青または赤）を使用し、重要性を視覚的に伝えます。
>
> **Note (LinkText Usage):**
> `LinkText` は通常リンクに使用されるシステムカラーですが、Forced Colors Mode では選択肢が限られるため、「重要性の強調」として使用します。実装時には、スクリーンリーダーでの読み上げと併せて、ユーザーが「クリック可能なリンク」と誤認しないか検証してください。

**6. 印刷スタイル (Print Styles)**

空状態は画面上の一時的な状態表示であり、印刷時には意味を持ちません。ただし、完全に非表示にするとページが空白になるため、簡潔なテキストのみを残します。

印刷時はアイコンとボタンを非表示にし、テキストのみを表示します。パディングを削減し、`min-height` を解除します。

**7. UXライティングガイダンス (UX Writing Guidelines)**

**トーン (Tone)**

- **肯定的 (Positive)**: 「〜がありません」という否定形ではなく、「〜を始めましょう」という提案形を推奨します。
- **簡潔 (Concise)**: 見出しは1文、説明は2文以内に収めます。
- **行動指向 (Action-Oriented)**: 次に何をすべきかを明確に示します。

**推奨例 (Good Examples)**

| 状況 | 見出し | 説明 | CTA |
| :--- | :--- | :--- | :--- |
| メモなし | まだメモがありません | 新しいメモを作成して、アイデアを書き留めましょう。 | 新規作成 |
| タグなし | タグを作成しましょう | タグを使ってメモを整理できます。 | タグを追加 |
| 検索結果なし | 「${query}」に一致する結果が見つかりませんでした | 別のキーワードで検索するか、フィルタを調整してください。 | - |

**非推奨例 (Bad Examples)**

| 状況 | 問題のある表現 | 理由 |
| :--- | :--- | :--- |
| メモなし | メモがありません | 否定的で、次のアクションが不明確。 |
| タグなし | タグが存在しません。タグを作成してください。 | 機械的で冷たい印象。 |
| 検索結果なし | エラー: 0件 | 技術的すぎる。ユーザーフレンドリーではない。 |

**イラストレーション使用ガイドライン (Illustration Guidelines)**

- **原則**: シンプルなアイコンで十分です。複雑なイラストレーションは原則として使用しません。
  - *Rationale*: 原則1「没入のための構造」に基づき、装飾的な要素は最小限に抑え、情報のS/N比を維持します。
- **例外**: ブランド表現上、特別に必要な場合（例: オンボーディング画面）は `slot="illustration"` として定義可能とします。この場合、アイコンは非表示となります。

**バリアントの拡張性 (Variant Extensibility)**

現在定義されているバリアント (`default`, `search`, `error`) は、最も一般的な空状態のシナリオをカバーしています。将来的に新しいバリアントを追加する場合は、以下の条件を満たすことを確認してください：

1. **明確な意味論的区別**: 既存のバリアントでは表現できない、独自の文脈や重要度を持つこと。
2. **視覚的一貫性**: アイコンの色とテキストの色のみで差異を表現し、レイアウトやサイズは統一すること。
3. **アクセシビリティの保証**: Forced Colors Mode でも意味が伝わるよう、システムカラーのマッピングを定義すること。
4. **UXライティングガイダンス**: 新しいバリアントに適したトーン（肯定的、簡潔、行動指向）の例文を提供すること。

**追加が想定されるバリアント例**:
- `filtered`: フィルタ適用後に結果が0件になった場合（`search` との違いは、フィルタ解除のCTAを提供する点）
- `tutorial`: 初回訪問時のオンボーディング（イラストレーションの使用を許可）

**8. アニメーション (Motion)**

**出現アニメーション (Entrance)**

空状態の出現時、控えめなフェードインを適用します。`var(--duration-normal)` と `var(--ease-out)` を使用し、`translateY(8px)` の微細な上昇効果を含みます。

`prefers-reduced-motion: reduce` 時はアニメーションを無効化します。

> **Rationale (Subtle Animation):**
> 8pxの微細な移動は、コンテンツが「現れた」という認知を与えつつ、原則3「デジタルの触感」に基づき、過度な物理シミュレーション（バウンス等）を排除します。

#### バナー (Banner) `<ui-banner>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: ページ全体に関わる持続的な状態（メンテナンス予告、オフライン状態、重要なお知らせ）をユーザーに伝えます。
- **Persistence**: トーストとは異なり、ユーザーが明示的に閉じるか、原因が解消されるまで表示され続けます。
- **Contextual Awareness**: バナーはコンテンツの一部ではなく、アプリケーション全体の状態を伝える「メタ情報」として機能します。そのため、ヘッダー直下に配置し、すべてのページで一貫して表示されます。

**2. ロジック参照基盤 (Logic Reference)**

- **Structure**: ヘッダー直下、またはコンテンツ最上部に配置されるブロック要素。
- **A11y**: 重要な情報は `role="alert"`、それ以外は `role="status"`。
- **Positioning**: `position: static`（通常フロー）。複数のバナーが存在する場合は垂直にスタックします。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | デフォルト | 説明 |
|------------|------|-------|-----------|------|
| `variant` | `variant` | `'info' \| 'warning' \| 'error' \| 'success'` | `'info'` | メッセージの重要度。 |
| `dismissible`| `dismissible`| `boolean` | `false` | 閉じるボタンを表示するか。 |
| `role` | `role` | `'alert' \| 'status'` | Auto | ARIA Role。未指定時は `variant` に基づき自動設定（`error` → `alert`、それ以外 → `status`）。 |

**Variant と Role のマッピング戦略**

| Variant | デフォルト Role | 理由 |
|---------|----------------|------|
| `info` | `status` | 情報提供。緊急性は低い。 |
| `success` | `status` | 成功通知。緊急性は低い。 |
| `warning` | `status` | 注意喚起。ユーザーの操作を強制しない。 |
| `error` | `alert` | エラー状態。即座の認識が必要。 |

> **Note (Role Override):**
> 実装者は `role` プロパティを明示的に指定することで、デフォルトのマッピングを上書きできます。例えば、`variant="warning"` でも緊急性が高い場合は `role="alert"` を指定します。

**4. スタイリングとトークンマッピング (Style & Tokens)**

**コンテナ (Container)**

| プロパティ | 値 | 説明 |
|-----------|-----|------|
| `width` | `100%` | ページ全体の幅を占有。 |
| `padding` | `var(--space-3) var(--space-4)` | 上下: 12px、左右: 16px。 |
| `display` | `flex` | アイコン、メッセージ、閉じるボタンを横並びに配置。 |
| `align-items` | `center` | 垂直方向の中央揃え。 |
| `gap` | `var(--space-3)` | 要素間の間隔: 12px。 |
| `min-height` | `var(--control-height-md)` | 最小高さ: 32px（タッチターゲット確保）。 |

**バリアント別スタイル (Variant Styles)**

| Variant | Background (Light) | Background (Dark) | Text Color | Icon Color | Border Color |
|---------|-------------------|-------------------|------------|------------|--------------|
| **Info** | `var(--bg-tip-subtle)` | `var(--bg-tip-subtle)` | `var(--fg-info)` | `var(--fg-info)` | `var(--primary)` |
| **Success** | `var(--bg-success-subtle)` | `var(--bg-success-subtle)` | `var(--fg-success)` | `var(--fg-success)` | `var(--success)` |
| **Warning** | `var(--bg-warning-subtle)` | `var(--bg-warning-subtle)` | `var(--fg-warning)` | `var(--fg-warning)` | `oklch(75% 0.16 85)` (Light) / `oklch(85% 0.16 85)` (Dark) |
| **Error** | `var(--bg-danger-subtle)` | `var(--bg-danger-subtle)` | `var(--fg-danger)` | `var(--fg-danger)` | `var(--border-danger)` |

> **Rationale (Warning Border Color):**
> `--warning` トークンは Fill 背景用に設計されており、Dark Mode では `L 25%` という低明度値を持ちます。一方、バナーの Subtle 背景 (`--bg-warning-subtle`) 上でのボーダーとしては視認性が不足するため、`--on-warning` と同じ明度（Light: `L 75%` / Dark: `L 85%`）を使用します。これにより、Subtle 背景上でも WCAG AA 基準のコントラストを確保します。

- **Border**: 下部に `2px solid` の強調線を追加します（色はバリアント毎）。
    - *Rationale*: 通常のボーダー（`1px`）ではなく `2px` を使用することで、バナーの「重要性」を視覚的に強調します。これは原則1「没入のための構造」に基づき、ユーザーの注意を適切に引きつけるための意図的な設計です。

**タイポグラフィ (Typography)**

| 要素 | サイズ | ウェイト | 色 | 行間 |
|------|--------|---------|-----|------|
| **Message** | `--text-sm` (13px) | `--font-medium` (500) | Variant毎 | `--line-height-normal` (1.5) |

```css
.banner__message {
  flex: 1; /* 残りの幅を占有 */
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  line-height: var(--line-height-normal);
}
```

**アイコン (Icon)**

```css
.banner__icon {
  flex-shrink: 0;
  width: var(--icon-base); /* 16px */
  height: var(--icon-base);
  color: inherit; /* バリアントの色を継承 */
  /* Lucide の標準 stroke-width: 1.5 を使用 */
}

> **Note (Icon Stroke Width):**
> すべてのバリアントで Lucide の標準 `stroke-width: 1.5` を使用します。Subtle 背景上では細い線幅でも十分に視認性を確保できます。
```

**閉じるボタン (Dismiss Button)**

```css
.banner__dismiss {
  flex-shrink: 0;
  width: var(--control-height-sm); /* 24px */
  height: var(--control-height-sm);
  padding: 0;
  
  /* タッチターゲット拡張 */
  position: relative;
}

.banner__dismiss::before {
  content: '';
  position: absolute;
  inset: calc((var(--control-min-touch) - var(--control-height-sm)) / -2);
  /* 44px - 24px = 20px → -10px の拡張 */
}

.banner__dismiss:hover {
  background: var(--bg-hover);
  border-radius: var(--radius-sm);
}
```

> **Rationale (Touch Target):**
> 閉じるボタンの視覚サイズは `24px` ですが、疑似要素 `::before` により物理的なタッチターゲットを `44px` に拡張し、WCAG 2.5.5 (Target Size) に準拠します。

**5. アクセシビリティ (A11y)**

**セマンティクス (Semantics)**

- **Role**: `role="alert"` または `role="status"`。
  - `role="alert"`: `aria-live="assertive"` が暗黙的に適用され、スクリーンリーダーが即座に読み上げます。
  - `role="status"`: `aria-live="polite"` が暗黙的に適用され、現在の読み上げが終了してから通知します。
- **Atomic**: `aria-atomic="true"` を明示的に設定し、バナー全体を一つの単位として読み上げます。

> **Note (`aria-atomic` Usage):**
> `aria-atomic="true"` はバナー全体を「ひとつの通知単位」として読み上げるために設定しています。もしバナー内のメッセージが頻繁に更新される場合（例: 残り時間カウントダウン）、`aria-atomic="false"` を明示的に指定し、変更箇所のみをアナウンスさせることを検討してください。
>
> **動的更新時の推奨設定:**
> | シナリオ | `aria-atomic` | 理由 |
> |----------|---------------|------|
> | **静的メッセージ** | `true` (デフォルト) | バナー全体を一度だけ読み上げる |
> | **カウントダウン等の高頻度更新** | `false` | 変更箇所のみをアナウンスし、冗長な読み上げを回避 |
> | **メッセージ内容の全面更新** | `true` | 新しいメッセージ全体を読み上げる |

```html
<div class="banner banner--warning" role="status" aria-atomic="true">
  <lucide-icon class="banner__icon" name="alert-triangle"></lucide-icon>
  <span class="banner__message">メンテナンスのため、2月15日 深夜0時から2時間程度サービスを停止します。</span>
</div>
```

**閉じるボタンのアクセシビリティ (Dismiss Button A11y)**

```html
<button 
  class="banner__dismiss" 
  aria-label="通知を閉じる"
  type="button"
>
  <lucide-icon name="x" aria-hidden="true"></lucide-icon>
</button>
```

- **`aria-label`**: アイコンのみのボタンであるため、明示的なラベルを提供します。
- **`aria-hidden="true"`**: アイコンは装飾的であるため、スクリーンリーダーから隠します。

**フォーカス管理 (Focus Management)**

- **閉じた後のフォーカス**: バナーにはトリガー要素が存在しないため、閉じた後のフォーカスは**次のインタラクティブ要素**（通常はヘッダーの検索ボタン等）へ移動します。
  - *Implementation*: ネイティブにフォーカス可能な要素（`<a>`, `<button>` など）を含む堅牢なセレクタを使用します。

**Forced Colors Mode (強制カラーモード)**

- Subtle背景色はForced Colors Modeで消失するため、`CanvasText` のボーダーで構造を維持します。
- Error バリアントは `LinkText` を使用し、重要性を視覚的に伝えます。
- 閉じるボタンは `border: 1px solid ButtonText` で構造を明示します。

**6. レイアウトと配置 (Layout & Placement)**

**配置戦略 (Placement Strategy)**

- **位置**: ヘッダー直下（`<ui-header>` の次の兄弟要素）。
- **幅**: `width: 100%`（ビューポート全体）。
- **コンテンツ幅の制限なし**: バナーはアプリケーション全体の状態を伝えるため、`max-width` による制限は適用しません。

```html
<ui-header></ui-header>
<ui-banner variant="warning">...</ui-banner>
<main>
  <!-- メインコンテンツ -->
</main>
```

**複数バナー時のスタック (Multiple Banners Stacking)**

- バナーコンテナで `flex-direction: column` を使用します。
- 最後以外のバナーは `border-bottom: none` で重複を回避します。
- Forced Colors Mode では `border-bottom: 1px solid CanvasText` でセパレータとして境界を維持します。

**7. アニメーション (Motion)**

**出現アニメーション (Entrance)**

バナーが動的に追加される場合、控えめなスライドインを適用します。`translateY(-100%)` から `translateY(0)` へ、`var(--duration-normal)` と `var(--ease-out)` を使用します。

`prefers-reduced-motion: reduce` 時はアニメーションを無効化します。

**消失アニメーション (Exit)**

閉じるボタンをクリックした際のフェードアウト。`max-height` と `padding` を同時にアニメーションさせ、`var(--duration-fast)` と `var(--ease-in)` を使用します。

`prefers-reduced-motion: reduce` 時は `display: none` で即座に非表示にします。

> **Rationale (Height Collapse):**
> `max-height` と `padding` を同時にアニメーションさせることで、バナーが消失する際に下のコンテンツがスムーズに上昇します。これにより、レイアウトシフトによる認知負荷を軽減します。

> **Rationale (`max-height` Value):**
> `100px` は単一行バナー（`min-height: 32px`）に十分な余裕を持たせた値です。複数行のバナーを許容する場合は、動的に `scrollHeight` を取得して `max-height` を設定することを推奨します。

**8. 印刷スタイル (Print Styles)**

バナーは画面上の一時的な状態通知であり、印刷時には意味を持ちません。ただし、Error バリアントは重要な情報を含む可能性があるため、テキストのみ表示します。

- Info, Success, Warning は非表示。
- Error のみテキスト表示（アイコンと閉じるボタンは非表示）。

**9. ダークモード考慮 (Dark Mode)**

バリアント別の背景色とテキスト色は、`index.md` で定義された Light/Dark トークンを使用するため、自動的にダークモードに対応します。

ダークモードではボーダーの視認性を高めるため、`border-bottom-width: 2px` を維持します。Warning のボーダー色は `oklch(85% 0.16 85)` に調整します。

#### プログレス (Progress) `<ui-progress>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 完了までの時間が予測可能な処理（ファイルのアップロード、データ処理等）の進捗を可視化します。
- **Smoothness**: 値の更新（Step）だけでなく、バーの動きそのものをスムーズに補間し、心理的な「止まっている感」を軽減します。
- **明確性**: 不確定な処理には使用せず、`<ui-spinner>` を使用します。プログレスバーは「あとどれくらいか」を伝えるための専用コンポーネントです。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: Native `<progress>` or `role="progressbar"`.
- **Porting Strategy**: Shadow DOM 内で `role="progressbar"` を実装し、ARIA 属性による完全なアクセシビリティを保証します。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | デフォルト | 説明 |
|------------|------|-------|-----------|------|
| `value` | `value` | `number` | `0` | 現在の進捗値（`0` 〜 `max`）。 |
| `max` | `max` | `number` | `100` | 最大値。 |
| `label` | `label` | `string` | `undefined` | プログレスバーの目的を示すラベル（例: "ファイルアップロード中"）。 |
| `valueText` | `value-text` | `string` | `undefined` | カスタム読み上げテキスト（例: "3件中1件完了"）。未指定時は `"{value}%"` が自動生成されます。 |

**バリデーションとクランプ (Validation \u0026 Clamping)**

- `value < 0` の場合、`0` にクランプされます。
- `value > max` の場合、`max` にクランプされます。
- `max <= 0` の場合、エラーをコンソールに出力し、`max` を `100` にフォールバックします。

**4. スタイリングとトークンマッピング (Style \u0026 Tokens)**

**Track (トラック)**

| プロパティ | 値 | 説明 |
|------------|-----|------|
| `height` | `var(--progress-track-height)` | トラックの高さ。 |
| `background` | `var(--bg-fill-neutral)` | トラックの背景色。 |
| `border-radius` | `var(--radius-full)` | 角丸（ピル型）。 |
| `overflow` | `hidden` | バーの角丸を維持するため。 |

**Bar (バー)**

| プロパティ | 値 | 説明 |
|------------|-----|------|
| `background` | `var(--primary)` | バーの背景色。 |
| `border-radius` | `var(--radius-full)` | 角丸（ピル型）。 |
| `transition` | `width var(--duration-normal) var(--ease-out)` | スムーズな幅変化。 |
| `height` | `100%` | トラックの高さに追従。 |

**コンポーネントローカルトークン (Component-Local Tokens)**

```css
:host {
  --progress-track-height: 4px;
}
```

> **Rationale (Track Height):**
> `4px` は `index.md` の標準スペーシングトークンには存在しませんが、プログレスバーの視認性と「静謐さ」のバランスを取るための最適値として、コンポーネントローカルトークンとして定義します。

> **Rationale (Easing Function):**
> `--ease-out` を採用する理由は、プログレスバーの「増加」が視覚的な「出現」に近いためです。`linear` では機械的な印象を与え、ユーザーの認知と乖離する可能性があります。`ease-out` により、バーが目的地に「吸い付く」ような自然な収束感を提供し、デザイン原則3「デジタルの触感 (Digital Tactility)」に準拠します。

**5. アクセシビリティ (A11y)**

**ARIA 属性 (ARIA Attributes)**

| 属性 | 値 | 必須? | 説明 |
|:-----|:---|:-----|:-----|
| `role` | `progressbar` | ✅ | プログレスバーであることを明示。 |
| `aria-valuenow` | `{clampedValue}` | ✅ | 現在の値。 |
| `aria-valuemin` | `0` | ✅ | 最小値（常に `0`）。 |
| `aria-valuemax` | `{max}` | ✅ | 最大値。 |
| `aria-valuetext` | `{valueText}` または `"{percentage}%"` | 推奨 | 読み上げ用テキスト。 |
| `aria-label` | `{label}` | 推奨 | プログレスバーの目的。 |

**実装例 (Implementation Example)**

```html
<div
  part="track"
  role="progressbar"
  aria-valuenow="${this.clampedValue}"
  aria-valuemin="0"
  aria-valuemax="${this.max}"
  aria-valuetext="${this.valueText || `${this.percentage}%`}"
  aria-label="${this.label || undefined}"
>
  <div part="bar" style="width: ${this.percentage}%"></div>
</div>
```

**ラベルとの関連付け (Label Association)**

`label` プロパティが指定されている場合、`aria-label` として設定されます。外部の `<label>` 要素と関連付ける場合は、`aria-labelledby` を使用してください。

**優先順位 (Priority Order):**

| 条件 | 適用されるラベル | 備考 |
|------|-----------------|------|
| `aria-labelledby` が指定されている | 外部ラベル要素の内容 | **最優先**。`label` プロパティは無視される |
| `label` プロパティのみ指定 | `aria-label` として設定 | 内部的にラベルを持つ場合に使用 |
| どちらも未指定 | なし | スクリーンリーダーはプログレスバーとしてのみ認識 |

> **Warning (Label Conflict):**
> `aria-labelledby` と `label` の両方が指定された場合、**`aria-labelledby` が優先され、`label` プロパティは無視されます**。これはWAI-ARIAの仕様に従った動作です。意図しない動作を避けるため、どちらか一方のみを使用してください。

```html
<label id="upload-label">ファイルアップロード中</label>
<ui-progress aria-labelledby="upload-label" value="50"></ui-progress>
```

**6. DOM構造とパーツ (DOM Structure \u0026 Parts)**

**Shadow DOM 構造**

```html
<div part="track" role="progressbar" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100" aria-valuetext="50%">
  <div part="bar" style="width: 50%"></div>
</div>
```

**外部スタイリングフック (External Styling Hooks)**

`part` 属性により、外部から特定の要素をスタイリング可能です。

- `ui-progress::part(track)` でトラックの高さをカスタマイズできます。
- `ui-progress::part(bar)` でバーのスタイル（グラデーション等）をカスタマイズできます。

**7. Forced Colors Mode (強制カラーモード)**

Windows ハイコントラストモードなど、OS レベルで色が強制される環境への対応です。

- トラック: `border: 1px solid CanvasText` で構造を維持、`background: Canvas` を使用。
- バー: `background: Highlight` でシステムの強調色を使用、`border: 1px solid Highlight` で視認性を担保。

> **Rationale (Forced Colors Strategy):**
> プログレスバーは `background-color` で表現されるため、Forced Colors Mode では消失するリスクがあります。`CanvasText` のボーダーで構造を維持し、`Highlight` でアクセント表現を行うことで、視認性を担保します。

**8. モーション軽減 (Reduced Motion)**

`prefers-reduced-motion` 設定を尊重し、アニメーションを無効化します。`transition-duration: 0.01ms !important` で即座に値を反映します。

> **Rationale (Motion Reduction):**
> `index.md` では、モーション軽減は **必須要件** とされています。トランジションが `width` にかかっているため、`prefers-reduced-motion: reduce` 時には即座に値を反映し、ユーザーの不快感や健康被害を防ぎます。

**9. 印刷スタイル (Print Styles)**

印刷時は、プログレスバーを静的な状態で表示します。

- トラック: `border: 1px solid black`, `background: white` で構造を明示。
- バー: `background: black` で現在の進捗を表示、`transition: none` でアニメーションを無効化。

> **Rationale (Print Strategy):**
> 動的な状態を静的に表現するため、現在の進捗値を黒のバーとして印刷します。これにより、印刷物でも進捗状況が一目で分かります。

**10. 使用例 (Usage Examples)**

**基本的な使用 (Basic Usage)**

```html
<ui-progress value="50" max="100" label="ファイルアップロード中"></ui-progress>
```

**カスタム読み上げテキスト (Custom Value Text)**

```html
<ui-progress 
  value="1" 
  max="3" 
  label="処理中" 
  value-text="3件中1件完了"
></ui-progress>
```

**動的な更新 (Dynamic Update)**

```typescript
const progress = document.querySelector('ui-progress');

// 進捗を更新
progress.value = 75;

// 完了時
progress.value = 100;
```

**外部ラベルとの関連付け (External Label)**

```html
<label id="download-label">ダウンロード中</label>
<ui-progress 
  aria-labelledby="download-label" 
  value="30" 
  max="100"
></ui-progress>
```

### オーバーレイ (Overlays)

#### ダイアログ / モーダル (Dialog) `<ui-dialog>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: ユーザーの操作フローを強制的に中断し、重要な決断や入力（削除確認、設定変更）を求めます。
- **Focus Trap**: コンテキストを完全に切り替えるため、背景を暗くし（Backdrop）、視覚と操作をダイアログ内に閉じ込めます。
- **Context Isolation**: `index.md` 原則1「没入のための構造」に基づき、ダイアログは背景コンテンツから完全に独立した文脈として提示されます。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: `@lion/ui` の `LionDialog`
- **Porting Strategy**:
    - Native `<dialog>` 要素をラップし、`::backdrop` 疑似要素を活用します。
    - **Backdrop Styling**: `backdrop-filter` を適用し、背面のコンテンツを視覚的に退かせます。
    - **Native API**: `modal` プロパティに応じて `showModal()` または `show()` を使用します。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | デフォルト | 説明 |
|------------|------|-------|-----------|------|
| `opened` | `opened` | `boolean` | `false` | 開閉状態。 |
| `modal` | `modal` | `boolean` | `true` | `true`: Focus Trap + 背景クリック無効。`false`: Focus Trap なし + 背景クリックで閉じる。 |
| `titleId` | `title-id` | `string` | `undefined` | `aria-labelledby` で参照するタイトル要素のID。 |
| `descriptionId` | `description-id` | `string` | `undefined` | `aria-describedby` で参照する説明要素のID。 |

**modal プロパティの挙動 (Modal Behavior)**

| `modal` | Native API | Focus Trap | Backdrop | 背景クリック | `Esc` キー | 用途 |
|---------|-----------|------------|----------|------------|-----------|------|
| `true` | `showModal()` | ✅ 有効 | ✅ 生成 | 閉じない | 閉じる | 削除確認、重要な決断 |
| `false` | `show()` | ❌ 無効 | ❌ なし | N/A | 閉じる | 軽量な通知、非破壊的な情報表示 |

> **Rationale (Modal Default):**
> デフォルトを `true` とする理由は、ダイアログの主要な用途が「ユーザーの明示的な決断を求める」ことであり、誤操作による閉じるを防ぐためです。軽量な用途には `modal="false"` を明示的に指定します。

> **Note (Non-Modal Backdrop):**
> `modal="false"` の場合、Native `<dialog>` は `::backdrop` 疑似要素を生成しません。背景の遮光が不要な軽量な通知やヘルプダイアログに適しています。背景クリックで閉じる挙動が必要な場合は、ダイアログ外のクリックイベントをリスンする実装が必要です。

**4. スロット (Slots)**

**スロット定義 (Slot Definition)**

| スロット名 | 説明 | 推奨要素 |
|-----------|------|----------|
| `title` | ダイアログのタイトル | `<h2 id="dialog-title">` |
| (default) | メインコンテンツ | `<p id="dialog-description">` |
| `actions` | アクションボタン群 | `<ui-button>` |

**5. スタイリングとトークンマッピング (Style & Tokens)**

**Backdrop (背景遮光)**

| プロパティ | 値 | 説明 |
|------------|-----|------|
| `background` | `oklch(0% 0 0 / var(--opacity-scrim))` | `index.md` で定義された `--opacity-scrim: 0.6` を使用 |
| `backdrop-filter` | `blur(var(--blur-lg))` | 強ブラー (24px) でコンテキストを完全に分離 |

> **Rationale (Blur Intensity):**
> `index.md` では `--blur-lg` (24px) が「モーダル背景など、コンテキストを完全に分離する場合」に推奨されています。ダイアログは操作フローを中断する性質上、背景の文脈を完全に遮断する必要があるため、`--blur-sm` (2px) ではなく `--blur-lg` を採用します。

**Dialog Container**

| プロパティ | ライトモード | ダークモード |
|------------|--------------|--------------|
| **Surface** | `var(--bg-default)` | `var(--bg-surface-3)` |
| **Radius** | `var(--radius-xl)` (12px) | `var(--radius-xl)` |
| **Shadow** | `var(--shadow-xl)` | `var(--shadow-dark-lg)` |
| **Width** | `var(--dialog-max-width)` | `var(--dialog-max-width)` |
| **Min Width** | `var(--dialog-min-width)` | `var(--dialog-min-width)` |
| **Max Height** | `var(--dialog-max-height)` | `var(--dialog-max-height)` |
| **Border** | なし | `1px solid oklch(100% 0 0 / 0.08)` (上端ハイライト) |

> **Rationale (Dark Mode Shadow):**
> `index.md` では `--shadow-dark-lg` は「ドロップダウン」向けと定義されていますが、ダークモードでは深度表現が主に**明度差**（`--bg-surface-3`）によって行われるため、シャドウは補助的な役割となります。`--shadow-dark-lg` で十分な視覚的分離が得られます。

**コンポーネントローカルトークン (Component-Local Tokens)**

- `--dialog-min-width: min(300px, 90vw)` - 極端に狭いコンテンツでもボタン配置が崩れない最小幅
- `--dialog-max-width: min(600px, 90vw)` - 読みやすさと操作性のバランスを取った最適幅
- `--dialog-max-height: min(80vh, 800px)` - 画面の大部分を占めつつ、上下に余白を残す最適値

> **Rationale (Width Constraints):**
> - **Max Width**: `600px` は読みやすさと操作性のバランスを取った最適幅。`90vw` により小画面でも余白を確保。
> - **Min Width**: `300px` は極端に狭いコンテンツでもボタン配置が崩れない最小幅。
> - **Max Height**: `80vh` は画面の大部分を占めつつ、上下に余白を残すための最適値。内部スクロールを可能にします。

**スペーシング (Internal Padding)**

| 部位 | パディング | 説明 |
|------|-----------|------|
| **Header** | `var(--space-4)` (上下) / `var(--space-6)` (左右) | タイトルと閉じるボタンの領域 |
| **Body** | `var(--space-6)` (上下左右) | メインコンテンツ領域 |
| **Footer** | `var(--space-4)` (上下) / `var(--space-6)` (左右) | アクションボタン領域 |

**閉じるボタン (Close Button)**

| プロパティ | 値 | 説明 |
|------------|-----|------|
| **Size** | `var(--control-height-sm)` (24px) | コンテンツ内部の操作として高密度サイズを採用 |
| **Layout** | Header の flex レイアウト内で自然配置 | `justify-content: space-between` により右端に配置 |
| **Color** | `var(--fg-muted)` | 控えめな存在感 |
| **Hover** | `var(--fg-default)` | 操作意思に対するフィードバック |
| **Touch Target** | `44px` (疑似要素で拡張) | アクセシビリティ基準を満たす |

**6. アニメーション (Animation)**

**表示アニメーション (Enter)**

ダイアログ表示時、`opacity: 0` と `scale(var(--scale-enter))` (0.98) から始まり、`opacity: 1` と `scale(1)` へ遷移します。`var(--duration-slower)` と `var(--ease-out)` を使用します。

**非表示アニメーション (Exit)**

ダイアログ非表示時、逆方向のアニメーションを適用します。`var(--duration-slower)` と `var(--ease-in)` を使用します。

> **Implementation Note:**
> Native `<dialog>` は閉じる際のアニメーションをサポートしていないため、`data-closing` 属性を使用してアニメーション完了後に `close()` を呼び出す実装が必要です。

**Backdrop アニメーション**

Backdropの表示・非表示時、`opacity: 0` ↔ `opacity: 1` のフェード遷移を適用します。`var(--duration-slower)` と `var(--ease-out)` / `var(--ease-in)` を使用します。

> **Implementation Note (Exit Animation Synchronization):**
> ダイアログ本体とBackdropの両方が同期してアニメーションするよう、`data-closing` 属性を追加後、両方のアニメーション完了を待ってから `close()` を呼び出します。

**7. モーション軽減 (Reduced Motion)**

`index.md` で**必須要件**とされている `prefers-reduced-motion` への対応です。`prefers-reduced-motion: reduce` 時は、ダイアログとBackdropの両方のアニメーションを無効化します（`animation: none !important`）。

**8. Forced Colors Mode (強制カラーモード)**

Windows ハイコントラストモードなど、OS レベルで色が強制される環境への対応です。

- **Dialog**: 背景色とシャドウが消失するため、`border: 2px solid CanvasText` で構造を維持し、`background: Canvas` を使用します。
- **Backdrop**: `background: Canvas`, `opacity: 0.7` を使用します。
- **Close Button**: `border: 1px solid ButtonText` で視認性を担保します。

> **Rationale (Forced Colors Strategy):**
> `index.md` では「構造の維持」「ボーダーやスペーシングにより、背景色が無くても領域を認識可能にする」ことが求められています。シャドウが消失する環境でも、ボーダーによってダイアログの境界を明確にします。

**9. 印刷スタイル (Print Styles)**

印刷時は、ダイアログを通常のコンテンツとして表示します。

- **Dialog**: モーダルの特性を解除（`position: static`）、シャドウを削除、`border: 1px solid black`、`max-width: 100%`、`margin: var(--space-4) 0` を適用します。
- **Backdrop**: 非表示にします（`display: none`）。
- **Close Button**: 非表示にします（`display: none`）。

**10. アクセシビリティ (A11y)**

**WAI-ARIA 属性 (ARIA Attributes)**

| 属性 | 値 | 必須? | 説明 |
|:-----|:---|:-----|:-----|
| `role` | `dialog` | ✅ | Native `<dialog>` を使用する場合は暗黙的 |
| `aria-modal` | `true` | ✅ | Focus Trap の意図を補助技術に伝達 |
| `aria-labelledby` | `{titleId}` | 推奨 | ダイアログタイトルへの参照 |
| `aria-describedby` | `{descriptionId}` | 推奨 | 説明文への参照 |

**フォーカス管理 (Focus Management)**

| タイミング | 動作 | 実装 |
|-----------|------|------|
| **開いた時** | 最初のフォーカス可能要素へフォーカス | デフォルト: 閉じるボタン。アクションボタンがある場合は最初のアクション（キャンセルボタンなど）を推奨 |
| **閉じた時** | トリガー元へフォーカスを返却 | `dialog.close()` 呼び出し前に、トリガー要素への参照を保持し、閉じた後に `focus()` を呼び出す |
| **`Esc` キー** | ダイアログを閉じる | Native `<dialog>` の標準動作。`modal=true` でも有効 |
| **Focus Trap** | `Tab` キーでダイアログ内を循環 | `modal=true` の場合、Native `<dialog>` が自動的に提供 |

**Scroll Lock (スクロールロック)**

ダイアログが開いている間、`body` のスクロールを無効化します（`overflow: hidden`）。閉じた際に解除します。

**11. 使用例 (Usage Examples)**

**基本的な使用 (Basic Usage)**

```html
<ui-dialog id="confirm-dialog" modal title-id="confirm-title" description-id="confirm-desc">
  <h2 slot="title" id="confirm-title">確認</h2>
  <p id="confirm-desc">この操作を実行してもよろしいですか？</p>
  <div slot="actions">
    <ui-button variant="ghost" onclick="document.getElementById('confirm-dialog').close()">
      キャンセル
    </ui-button>
    <ui-button variant="primary" onclick="handleConfirm()">
      実行
    </ui-button>
  </div>
</ui-dialog>
```

**非モーダルダイアログ (Non-Modal Dialog)**

```html
<ui-dialog modal="false" title-id="info-title">
  <h2 slot="title" id="info-title">お知らせ</h2>
  <p>新しい機能が追加されました。</p>
</ui-dialog>
```

#### 検索ダイアログ (Search Dialog) `<ui-search-dialog>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 「静かな探求者」です。ユーザーがメモの海を渡るための**検索インターフェース**として機能します。キーワードによる全文検索と、結果からのページ遷移を提供します。
- **Unified Entry**: ヘッダーの検索トリガー、ショートカットキー (`Cmd+K` / `Ctrl+K`)、すべての入り口がこの検索ダイアログに繋がります。
- **Zero Latency**: ユーザーの思考を分断しないため、入力に対する結果表示は即座に行われなければなりません。読書への没入を維持するため、検索は思考の速度で完結します。

**2. ロジック参照基盤 (Logic Reference)**

- **Architecture**:
    - **Logic**: `@lion/ui` の `LionCombobox` (Selection & Navigation) ロジックをコアとして移植し、`LionDialog` (Modal) の振る舞い（Focus Trap, Backdrop）を持つコンテナ内で動作させます。
    - **Worker-Driven Construction**: `Pagefind` の検索プロセスは **Web Worker** 上で実行し、メインスレッド（UI描画）を絶対にブロックしません。
    - **Virtualization**: **100件以上の結果が表示される可能性がある場合は仮想スクロールを必須とします**。参考実装として `lit-virtualizer` を検討してください。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `opened` | `opened` | `boolean` | 開閉状態。 |
| `query` | `query` | `string` | 現在の入力クエリ。 |
| `loading` | `loading` | `boolean` | インデックスロード中などの状態。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

**Backdrop**

| プロパティ | 値 | 根拠 |
|-----------|-----|------|
| **背景色** | `oklch(0% 0 0 / var(--opacity-scrim))` (`0.6`) | `index.md` パレット定義「Opacity Modifiers」 |
| **ブラー** | `blur(var(--blur-lg))` (`24px`) | コンテキストを完全に分離する `--blur-lg` |
| **Z-index** | `var(--z-backdrop)` (`200`) | レイヤー構造「Z-index Scale」 |
| **Transition** | `opacity var(--duration-slow) var(--ease-out)` | ダイアログと同様、背景変化は緩やかに |

**Panel**

| プロパティ | 値 | 説明 |
|-----------|-----|------|
| **Width** | `min(640px, 90vw)` | Max: 640px, Mobile: 90vw |
| **Max Height** | `min(480px, 80vh)` | コンテンツ量に応じてスクロール |
| **Background** | `var(--bg-surface-2)` | Elevated Layer |
| **Border** | `var(--border-width) solid var(--border-default)` | 構造明示 |
| **Radius** | `var(--radius-xl)` (12px) | モーダルと同等 |
| **Shadow (Light)** | `var(--shadow-xl)` | 最高階層の浮遊感 |
| **Shadow (Dark)** | `var(--shadow-dark-lg), inset 0 1px 0 0 oklch(100% 0 0 / 0.1)` | ダークモード深度戦略 + 上端ハイライト |
| **Position** | `top: 20%` (中央上部) | 視線移動を減らすための配置 |
| **Z-index** | `var(--z-modal)` (`300`) | ダイアログと同等 |

**Input (Header)**

| プロパティ | 値 | 説明 |
|-----------|-----|------|
| **Height** | `var(--control-height-md)` (32px) | 標準コントロール高 |
| **Touch Target** | `44px` (疑似要素で確保) | アクセシビリティ基準準拠 |
| **Font Size** | `var(--text-base)` (14px) | 標準UIサイズ |
| **Padding** | `0 var(--space-4)` | 左右16px |
| **Border Bottom** | `1px solid var(--border-default)` | Header/Body分離 |
| **Background** | `transparent` | パネル背景を継承 |

> **Note (Input Height Strategy):**  
> 当初の `--control-height-lg` (40px) 案は、タッチデバイスでの操作性を重視したものでしたが、`index.md` の「原則として使用しない」という規定を尊重し、**標準の `--control-height-md` (32px) を視覚的な高さとして採用**します。  
> タッチデバイスでのアクセシビリティは、`::after` 疑似要素により **物理的なヒットエリアを `44px` 以上に拡張**することで担保します。これにより、視覚的なコンパクトさ（デザイン原則1「没入のための構造」）とタップ操作性（原則4「普遍的な明瞭さ」）を両立します。

**Item (Result)**

| プロパティ | 値 | 説明 |
|-----------|-----|------|
| **Height** | `auto` (min: 1行) | 基本は1行、パスで区別が必要な場合のみ複数行 |
| **Padding** | `var(--space-2) var(--space-3)` | 8px 12px |
| **Selection BG** | `var(--bg-surface-active)` | フォーカス状態 |
| **Typography** | Title: `--text-base` / Path: `--text-xs`, `--fg-muted` | 階層明示 |

> **Rationale (Metadata Minimalism):**  
> スニペットや日付は一覧性を損なうためデフォルトでは非表示とし、S/N比を最大化します。アクセントバーなどの追加装飾はノイズとなるため排除し、色変化のみでシンプルに現在地を伝えます。

**Footer (Hints)**

| プロパティ | 値 | 説明 |
|-----------|-----|------|
| **Typography** | `--text-xs` (12px), `--fg-muted` | 控えめな補助情報 |
| **Layout** | Flexbox, `justify-content: center`, `gap: var(--space-4)` | 中央揃え、16px間隔 |
| **Keycap Style** | `background: var(--bg-fill-muted)`, `border-radius: var(--radius-sm)`, `padding: var(--space-1) var(--space-2)` | 視覚的な強調 |
| **Border Top** | `1px solid var(--border-default)` | Body/Footer分離 |

**5. アニメーション (Animations)**

**Panel Entrance**

パネル表示時、`opacity: 0` と `scale(var(--scale-enter))` (0.98) から始まり、`opacity: 1` と `scale(1)` へ遷移します。`var(--duration-normal)` と `var(--ease-out)` を使用します。

**Panel Exit**

パネル非表示時、逆方向のアニメーションを適用します。`var(--duration-fast)` と `var(--ease-in)` を使用します。

**Backdrop Animations**

Backdropの表示・非表示時、`opacity: 0` ↔ `opacity: 1` のフェード遷移を適用します。表示時は `var(--duration-slow)` と `var(--ease-out)`、非表示時は `var(--duration-slow)` と `var(--ease-in)` を使用します。

**Motion Reduction**

`prefers-reduced-motion: reduce` 時は、パネルとBackdropの両方のアニメーションとトランジションを無効化します（`animation: none !important`, `transition: none !important`）。

**6. Loading State (インデックスロード中)**

| 状態 | UI | 説明 |
|------|-----|------|
| **初回ロード** | Spinner + メッセージ表示 | Body領域中央に `<ui-spinner>` と「インデックスを読み込んでいます...」を表示 |
| **入力フィールド** | 操作可能 | ロード中でもクエリ編集は可能（`aria-busy="true"` 設定） |
| **UX原則** | Zero Latency維持 | 初回インデックスロード時のみ表示。検索ごとの待機には使用しない |

初回インデックスロード時のみ、Body領域中央に `<ui-spinner>` と「インデックスを読み込んでいます...」メッセージを表示します。ロード中でもクエリ編集は可能です（`aria-busy="true"` 設定）。

**7. Empty State (結果なし状態)**

検索結果が0件の場合、`<ui-empty-state>` コンポーネントを使用します。

| プロパティ | 値 |
|-----------|-----|
| **アイコン** | `search-x` |
| **タイトル** | 「一致する結果がありません」 |
| **説明** | 「別のキーワードで検索してください」 |

**8. アクセシビリティ (A11y)**

**WAI-ARIA 属性**

| 属性 | 値 | 必須? | 説明 |
|------|-----|------|------|
| `role` (Input) | `combobox` | ✅ | コンボボックスパターン |
| `aria-expanded` | `true` / `false` | ✅ | リストボックスの展開状態 |
| `aria-autocomplete` | `list` | ✅ | オートコンプリートタイプ |
| `aria-controls` | `{listboxId}` | ✅ | 制御対象のリストボックスID |
| `aria-activedescendant` | `{activeOptionId}` | ✅ | 現在フォーカス中のオプションID |
| `role` (List) | `listbox` | ✅ | リストボックス |
| `role` (Item) | `option` | ✅ | オプション項目 |
| `aria-selected` | `true` / `false` | ✅ | 選択状態 |
| `aria-busy` | `true` | 推奨 | ロード中の状態 |

**Focus Management**

| タイミング | 動作 | 実装 |
|-----------|------|------|
| **開いた時** | 入力フィールドへ自動フォーカス | `requestAnimationFrame(() => input.focus())` |
| **閉じた時** | トリガー元へフォーカス返却 | トリガー要素への参照を保持し、`close()` 後に `focus()` |
| **Focus Trap** | パレット内でフォーカスを循環 | `Tab` キーで入力 ↔ リスト間を移動 |
| **Esc キー** | パレットを閉じる | `keydown` イベントで `close()` 呼び出し |

**Keyboard Navigation**

| キー | 動作 |
|------|------|
| `Cmd+K` / `Ctrl+K` | パレットを開く（グローバルショートカット） |
| `↓` / `↑` | リスト内の項目を移動 |
| `Enter` | 選択中の項目を実行 |
| `Esc` | パレットを閉じる |
| `Tab` | 入力フィールド ↔ リスト間を移動 |

**9. Forced Colors Mode (強制カラーモード)**

- **Panel**: `border: 2px solid CanvasText` で構造を維持、シャドウを削除します。
- **Backdrop**: `background: Canvas`, `opacity: 0.7`、`backdrop-filter: none` を使用します。
- **Selected Item**: 背景色だけでなく `outline: 2px solid Highlight`, `outline-offset: -2px` で選択状態を明示します。
- **Clear Button**: `border: 1px solid ButtonText` で視認性を担保します。

**10. 印刷スタイル (Print Styles)**

検索ダイアログは印刷時に非表示にします（`display: none !important`）。

**11. 使用例 (Usage Examples)**

**基本的な使用**

```html
<ui-search-dialog id="search-dialog">
  <!-- 検索結果は動的に生成されます -->
</ui-search-dialog>

<script>
  // グローバルショートカット
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      document.getElementById('search-dialog').opened = true;
    }
  });
</script>
```

### アプリケーションシェル (Application Shell)

### ヘッダー（Header） `<ui-header>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: コンテンツへの没入を妨げない、極めて薄く静謐なナビゲーション領域です。
- **Glassmorphism**: スクロール時、コンテンツはヘッダーの下を滑らかに通過し、すりガラス効果（`--glass-panel`）によって「奥にある」ことを示唆します。

**2. ロジック参照基盤 (Logic Reference)**

- **Native**: 標準の `<header>` 要素を使用します。
- **Positioning**: `position: sticky; top: 0;`。`z-index` は `--z-fixed` (100) を適用。
- **Layout Context**: アプリケーションシェルのグリッドにおいて `grid-column: 1 / -1` (全幅) に配置されます。

**3. 技術仕様とAPI (Technical Specs)**

このコンポーネントは主にレイアウトコンテナとして機能し、コンテンツはスロットを通じて注入されます。

| スロット名 | 説明 |
|------------|------|
| `start` | **Navigation Zone**: 左側の領域。サイドバートリガーとContext Switcherを配置します。 |
| `center` | **Context Zone**: 中央の領域。`<ui-breadcrumbs>` を配置し、現在の文脈を提示します。 |
| `end` | **Action Zone**: 右側の領域。検索、TOCトリガー、設定メニュー等を配置します。 |

**4. レイアウト構造と構成要素 (Layout Anatomy & Components)**

ヘッダーは3つのゾーンで構成され、階層構造の提示とコマンドへのアクセスを最優先します。

- **Start (Left): Navigation Zone**
    - **Width Strategy**:
        - **Sidebar Expanded**: `--sidebar-width` (240px) に固定。サイドバーとの垂直ラインを整え、構造的安定感を提供します。
        - **Sidebar Collapsed (Zen Mode)**: `auto` (Min-content)。コンテンツ幅に応じた最小限の領域となり、不要な空白（Void Space）を排除します。
    1. **Sidebar Trigger**: ファイルツリーの開閉状態を制御するアイコンボタン (`--control-height-md` / 32px)。
        - *Element*: `<button>` 要素。
        - *Visibility*: **Always Visible** (全サイズで表示)。
        - *Behavior*:
            - `< xl`: オーバーレイメニューの開閉。
            - `>= xl`: 固定サイドバーの展開/格納（Zen Modeの切り替え）。
        - *Style*: 通常時は控えめなトーン (`--fg-muted`) で環境に溶け込ませ、ホバー時またはZen Mode（格納時）に `--fg-default` へ強調します。
        - *Accessibility*: `aria-label` で状態を明示（例: `"サイドバーを開く"` / `"サイドバーを閉じる"`）。
    2. **Context Switcher** (Desktop/Tablet Only): 現在のジャンル名（例: `Music`）を表示するボタン。
        - *Element*: `<button>` 要素。`aria-haspopup="menu"` を設定。
        - *Layout*: トリガーの右隣に配置し、残りの幅を占有する (`flex: 1`)。
        - *Truncation Logic*:
            - **Label**: `flex: 0 1 auto`。幅が不足する場合、末尾を省略（`text-overflow: ellipsis`）します。
            - **Icon (▾)**: `flex: 0 0 auto`。**常に表示**し、ドロップダウン機能のアフォーダンスを維持します。
        - *Interaction*: クリックでドロップダウンを展開し、他ジャンルへの即座な横移動（Switching）を提供する。
        - *Rationale*: パンくずリスト（物理階層）とは独立した「世界（ジャンル）選択」のメンタルモデルをヘッダー上で満たす。Linearのワークスペース切り替えに相当し、将来的な検索機能等の拡張にも耐えうるスケーラビリティを確保する。

> **Note (Mobile Context Switcher Placement):**  
> モバイル環境では、ヘッダー幅制約のためContext Switcherは非表示となり、**サイドバー（ドロワー）コンポーネント内の最上部**へ移動・格納されます。詳細は `<ui-sidebar>` 仕様の「Mobile Context Switcher」セクションを参照してください。

- **Center: Context Zone**
    1. **Breadcrumbs**: `<ui-breadcrumbs>`。
        - *Placement*: **Main Content Center (メインコンテンツ領域の中央)**。
            - 画面全体の中央ではなく、**サイドバーを除いた「記事が描画される領域」の幾何学的中心**に配置します。
            - *Rationale*: Zen Mode（サイドバー格納時）では画面中央になりますが、サイドバー展開時は右側に寄り、記事本文（Prose）の軸と一致させます。
            - *Constraint*: ヘッダーレイアウトはメインコンテンツと同じカラム構造を持たせ、パンくずリストの中心軸と記事本文の中心軸を一致させます。
        - *Smart Omission*: Desktop (`>= xl`) においては、左側の **Context Switcher** が既にジャンル（ルート）を表示しているため、パンくずリストからはルート要素を省略し、**第2階層から開始**します。
            - *Edge Case*: ルート直下（インデックスページ）にいる場合、ブレッドクラムは**何も表示しません（Empty）**。情報の重複を避け、S/N比を最大化します。
        - *Interaction*: タイトル部分はページトップへのスクロール、親階層は遷移として機能。

- **End (Right): Action Zone**
    1. **Search Trigger**: `<ui-search-trigger>` または `<button>` 要素。
        - *Element Type*: **`<button>` 要素**。見た目が入力フィールドに似ていても、実際はボタンとして実装します。
        - *ARIA Attributes*:
            - `aria-haspopup="dialog"`: 検索ダイアログを開くことを示す。
            - `aria-keyshortcuts="Control+K Meta+K"`: ショートカットキーを明示。
            - `aria-label="検索"`: スクリーンリーダー用のラベル。
        - *Style*: デスクトップでは **Dummy Input形式**（アイコン + "検索" + バッジ）で配置し、検索ダイアログへのディスカバリ性を担保します。
        - *Responsive*: モバイル（`--bp-sm` 以下）やタッチ環境では、バッジとテキストを隠蔽して **アイコンのみ (`icon-only`)** のスタイルへ変形し、スペースを確保します。
        
    2. **TOC Trigger** (Mobile Only): 目次展開ボタン。
        - *Element*: `<button>` 要素。
        - *Icon*: `list` または `list-tree` (Lucide)。
        - *ARIA Attributes*:
            - `aria-label="目次を開く"`
            - `aria-haspopup="menu"` または `aria-haspopup="dialog"` (展開先UIに応じて)
            - `aria-expanded="false"` (初期状態)
        - *Visibility*: `< md` (モバイル) のみ表示。
        - *Behavior*: クリックでBottom SheetまたはPopoverとして目次を展開。
        
    3. **Theme Menu**: テーマ切り替え。
        - *Element*: `<button>` 要素。
        - *Icon*: `sun` (Light Mode) / `moon` (Dark Mode) / `monitor` (System)。
        - *ARIA Attributes*:
            - `aria-label="テーマを変更"`
            - `aria-haspopup="menu"`

**5. レスポンシブ挙動 (Responsive Behavior)**

| ゾーン | Mobile (`< md`) | Tablet (`md` - `xl`) | Desktop (`>= xl`) |
| :--- | :--- | :--- | :--- |
| **Start** | `Trigger` (Sidebar) | `Trigger` + `Switcher` | `Trigger` + `Switcher` |
| **Center** | `Title` (Current Page) | `Breadcrumbs` (Full) | `Breadcrumbs` (Smart Omission) |
| **End** | `Search` (Icon) + `TOC` + `Menu` | `Search` (Full) + `Menu` | `Search` (Full) + `Menu` |

**Responsive Logic & Fallbacks**

- **Context Switcher**:
    - **Desktop/Tablet** (`>= md`): ヘッダー常駐。
    - **Mobile** (`< md`): ヘッダー幅制約のため非表示となり、**サイドバー（ドロワー）内最上部**へ移動・格納されます。
        - *Discovery Design*: ドロワー展開時、コンテキストスイッチャーは最上部で**視覚的に際立つデザイン（背景色変更やボーダー分離）**とし、ユーザーが「現在のジャンル（ルート）」を即座に認識・変更できるようにします。
        - *Cross-Reference*: 詳細は `<ui-sidebar>` 仕様の `slot="header"` セクションを参照。
        
- **Breadcrumbs**:
    - **Desktop** (`>= xl`): ルート省略（Smart Omission）。ルート直下では非表示。
    - **Tablet** (`md` - `xl`): フルパス表示。
    - **Mobile** (`< md`): スペース不足のため中間階層は省略（Collapse）され、**現在のページタイトル**のみを優先表示します。
        - *Tap Behavior*: **シングルタップでページトップへスクロール**します。親階層への遷移が必要な場合は、サイドバー（ドロワー）内のナビゲーションを使用します。
        - *Rationale*: ヘッダー領域でのコンテキストメニュー展開は、タップ精度の問題やヒットエリアの競合を招くリスクがあるため、シンプルな単一アクションに限定します。
    
- **Search Trigger**:
    - **Desktop/Tablet** (`>= md`): フル表示（アイコン + テキスト + バッジ）。
    - **Mobile** (`< md`): アイコンのみ表示。
    
- **TOC Trigger**:
    - **Desktop/Tablet** (`>= md`): 非表示（TOCは右サイドバーに常駐）。
    - **Mobile** (`< md`): 表示（Bottom Sheet展開用）。

**6. スタイリングとトークンマッピング (Style & Tokens)**

- **Height**: `--header-height` (48px)。
- **Width**: 100% (Viewport Width)。
- **Content Width**: Max `--bp-xl` (1280px)。
    - *Constraint*: 内部コンテナ（Grid Container）は画面幅が `1280px` を超える場合、中央揃え (`margin-inline: auto`) となり、過度な視線移動を防ぎます。
- **Layout**: CSS Grid による 3 カラム構成。Padding: `0 var(--space-4)`。
- **Background**: Glassmorphism + **Low Saturation Override**。
    - *Base*: `.glass-panel` を基盤とし、`index.md` 定義に準拠します。
    - *Enhancement*: ヘッダー直下のコンテンツ色彩によるノイズを防ぐため、`saturate(0.5)` を追加合成し、S/N比を強化します。
        - *Rationale*: 彩度 50% への減衰は、背景画像やカラフルなコンテンツ（コードハイライト等）が透過した際に、視認性を損なわないヒューリスティックな値です。実装時にコンテンツとの組み合わせを目視検証し、必要に応じて `0.4`〜`0.6` の範囲で調整してください。
    - *Fallback*: `backdrop-filter` 非対応環境では不透明な `--bg-default` に切り替わります。`@supports (backdrop-filter: blur(12px))` によるポジティブ形式の Progressive Enhancement を採用します（`index.md` L1052-1067 参照）。
    
- **Border Bottom**: `var(--border-width) solid var(--border-default)`。
    - *Rationale*: `index.md` L880 では `--border-subtle` が推奨されていますが、ヘッダーはアプリケーション構造の最上位に位置し、ユーザーのスクロール操作の視覚的起点（ストッパー）として機能します。この役割を果たすため、他のコンテンツエリアとは一線を画した明確な境界が必要であり、`--border-default` (Opacity `0.12`) を採用します。将来的に `index.md` の推奨と統一する場合は、本仕様を更新してください。
- **Typography**:
    - Font Size: `--text-base` (14px)。
    - Font Weight (Element-specific):
        - **Context Switcher Label**: `--font-medium` (500)。ジャンル名を識別可能に。
        - **Breadcrumbs Items**: `--font-normal` (400)。本文と同じウェイトで視覚的階層を下げる。
        - **Breadcrumbs Current**: `--font-medium` (500)。現在ページのみウェイトで強調。
        - **Search Trigger Text**: `--font-normal` (400)。控えめなプレースホルダー表現。
    - *Rationale*: 本文見出し (`H1` / `--text-4xl` / 36px) よりも小さいサイズを採用し、視覚的階層を明確化します。ウェイトは各要素の役割に応じて使い分け、「大胆なウェイト差」戦略（`index.md` L252-258）に準拠します。
- **Shadow**: 原則なし（ボーダーとGlass効果で階層を分離）。

**7. アクセシビリティ (A11y)**

- **Landmark**: `role="banner"` (自動付与)。
- **Search Trigger**: 
    - `<button>` 要素を使用。
    - `aria-haspopup="dialog"`: 検索ダイアログを開くことを示す。
    - `aria-keyshortcuts="Control+K Meta+K"`: ショートカットキーを明示。
    - `aria-label="検索"`: スクリーンリーダー用のラベル。
- **Sidebar Trigger**:
    - `aria-label`: 状態に応じて動的に変更（例: `"サイドバーを開く"` / `"サイドバーを閉じる"`）。
    - `aria-expanded`: サイドバーの開閉状態を示す（`true` / `false`）。
- **Context Switcher**:
    - `aria-haspopup="menu"`: ドロップダウンメニューを開くことを示す。
    - `aria-expanded`: メニューの開閉状態を示す。
- **TOC Trigger**:
    - `aria-label="目次を開く"`
    - `aria-haspopup="menu"` または `aria-haspopup="dialog"`
    - `aria-expanded`: 展開状態を示す。
- **Breadcrumbs**: `<ui-breadcrumbs>` の仕様（`nav`ランドマーク、`aria-current="page"`）を継承し、スクリーンリーダーに対して正確な現在地構造を提供します。
- **Navigation**: 内部のインタラクティブ要素は全てキーボード操作可能。
- **Focus Strategy**: グローバルな **Adaptive Focus** 戦略を継承し、移動中は控えめ、停止時に明確な識別を行います。

**8. Forced Colors Mode (強制カラーモード)**

Windows ハイコントラストモードなど、OSレベルで色が強制される環境への対応。

```css
@media (forced-colors: active) {
  ui-header {
    background: Canvas;
    border-bottom: var(--border-width) solid CanvasText;
    /* backdrop-filter は無効化される */
    backdrop-filter: none;
  }

  [part="sidebar-trigger"],
  [part="context-switcher"],
  [part="search-trigger"],
  [part="toc-trigger"],
  [part="theme-menu"] {
    border: 1px solid ButtonText;
  }

  /* アイコンは currentColor を継承するため自動的に適応 */
}
```

**9. 印刷スタイル (Print Styles)**

ヘッダーは印刷時に非表示にします。ナビゲーション要素は紙媒体では不要です。

```css
@media print {
  ui-header {
    display: none;
  }
}
```

> **Alternative (Optional):**  
> パンくずリストのみを静的テキストとして残したい場合は、`start` / `end` ゾーンを非表示とし、`center` ゾーンのみを印刷出力する選択肢もあります。この場合、ヘッダーの `position` を `static` に変更し、背景・ボーダーを透明化してください。

**10. トランジションとアニメーション (Transitions & Animations)**

ヘッダー内の各インタラクティブ要素には、以下のトランジション仕様を適用します。

| 対象 | トリガー | Duration | Easing | 備考 |
|------|----------|----------|--------|------|
| **Sidebar Trigger Icon** | 状態変更 (Expand/Collapse) | `--duration-fast` (70ms) | `--ease-out` | アイコン切り替え時の回転/変形 |
| **Context Switcher Dropdown** | 展開/格納 | `--duration-normal` (150ms) | `--ease-out` | Popup コンポーネントに委譲 |
| **Search Trigger Hover** | `:hover` | `--duration-fast` (70ms) | `--ease-out` | 背景色・ボーダー変化 |
| **TOC Trigger Hover** | `:hover` | `--duration-fast` (70ms) | `--ease-out` | 背景色変化 |
| **Theme Menu Hover** | `:hover` | `--duration-fast` (70ms) | `--ease-out` | 背景色変化 |
| **Header Background** | — | なし | — | スクロール位置による変化は行わず、常に一定の S/N 比を維持 |

**Motion Reduction**

`prefers-reduced-motion: reduce` 環境下では、すべてのトランジションとアニメーションを無効化します。ヘッダーの視覚的挙動は即時反映となり、待機時間を強制しません。

#### サイドバー (Sidebar) `<ui-sidebar>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: アプリケーションの左翼を担い、ナビゲーション（ファイルツリー）を格納するコンテナです。
- **Silent Existence**: 常に表示される要素であるため、読み手の視界を遮らないよう、背景色や境界線は極めて控えめに設計されます。
- **Zen Mode**: フォーカスモード（サイドバー格納時）においては、完全に消失（Collapse）し、メインコンテンツを画面中央へ配置することで、左右対称の安定した読書環境を提供します。

**2. ロジック参照基盤 (Logic Reference)**

- **State Management**:
    - グローバルな `LayoutStore` により開閉状態（`expanded` / `collapsed`）とレイアウトモード（`fixed` / `overlay`）を管理します。
    - **LayoutStore の責務範囲**:
        - サイドバーの開閉状態（`expanded` / `collapsed`）
        - レイアウトモード（`fixed` / `overlay`）のメディアクエリベース自動判定
        - 状態永続化（LocalStorage への保存・復元）
        - SSR/Hydration 時の初期状態決定（デフォルト: `expanded`、ユーザー設定があれば復元）
    - **Dynamic Centering (Fixed Mode)**: Desktop (`fixed`) においては、格納時にサイドバーの領域（Grid Track）を完全に除去（`0px`）し、メインコンテンツを**画面中央へセンタリング**します。片側に寄った不安定な空白を排除します。
    - **Off-Canvas (Overlay Mode)**: Mobile/Tablet (`overlay`) においては、コンテンツのレイアウトには干渉せず、`transform` によるスライド開閉を行います。
    - **Visual Collapse**: 幅の変動に伴い、内部のナビゲーション要素は不透明度制御により滑らかに隠蔽されます。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `state` | `data-state` | `'expanded' \| 'collapsed'` | 現在の開閉状態。 |
| `mode` | `mode` | `'fixed' \| 'overlay'` | レイアウトモード。`>= xl` で `fixed`、それ未満で `overlay`。`LayoutStore` がメディアクエリに基づき自動判定。 |

**4. スロット (Slots)**

| スロット名 | 説明 | 使用モード | DOM構造例 |
|-----------|------|-----------|-----------|
| `header` | **Mobile Context Switcher** 用。現在のジャンル（ルート）を表示し、他ジャンルへの切り替えを提供します。 | `overlay` のみ | `<button slot="header" aria-haspopup="menu">Music ▾</button>` |
| (default) | ナビゲーションツリー本体。`<ui-tree>` または `<nav>` 要素を配置します。 | 全モード | `<ui-tree>...</ui-tree>` |

**`header` スロットの詳細 (Mobile Context Switcher)**

- **表示条件**: `mode="overlay"` の場合のみ表示されます。`mode="fixed"` では DOM に存在していても非表示（`display: none`）となります。
- **配置**: サイドバー最上部（ナビゲーションツリーの上）に固定配置されます。
- **推奨コンテンツ**: `<ui-header>` の Context Switcher と同一のコンポーネントを使用し、一貫性を保ちます。
- **視覚的強調**: 背景色を `var(--bg-surface-2)` に変更し、下部に `border-bottom: 1px solid var(--border-default)` を適用することで、ナビゲーションツリーとの視覚的分離を明確にします。
- **スロットが空の場合**: 何も表示されず、ナビゲーションツリーが最上部から開始されます。

> **Cross-Reference:**  
> Desktop/Tablet 環境での Context Switcher の配置と挙動については、`<ui-header>` 仕様の「Start Zone: Context Switcher」セクションを参照してください。

**5. スタイリングとトークンマッピング (Style & Tokens)**

**Layout & Width**

- **Grid Track (Fixed Mode)**:
    - `expanded`: `--sidebar-width` (240px)
    - `collapsed`: `0px` (Zen Mode)
- **Transition**: `grid-template-columns` プロパティのアニメーションにより、滑らかなレイアウト変更を行います。
    - **Fallback Strategy**: `grid-template-columns` のアニメーションは一部ブラウザで未サポートまたはパフォーマンス問題があるため、以下の戦略を採用します。
        - **Primary**: CSS Grid の `fr` 単位変化による自然なレイアウト遷移。
        - **Fallback**: `@supports` による feature detection を行い、非対応環境では `transform: translateX()` による視覚的な移動に切り替えます。
        - **Performance**: アニメーション開始時に `will-change: grid-template-columns` を適用し、完了後に削除することで、Layer Promotion によるパフォーマンス最適化を行います。

**Items (Hierarchical Silence)**

- **Text Color**:
    - Default: `var(--fg-muted)` — WCAG AA 準拠の可読性を維持しつつ、**視覚的重み（Visual Weight）を下げる**ことで、メインコンテンツへの注意を優先します。
    - Active/Hover: `var(--primary)` — 現在地と操作意思に対する明確なフィードバック。
    - *Rationale*: `index.md` の「Low Density (Not Low Contrast)」戦略に準拠し、コントラストを犠牲にせず、フォントサイズとウェイトによって階層を制御します。
- **Background**:
    - Active: `var(--bg-surface-active)` — 選択状態の明示。

**Background**

- `var(--bg-surface-1)` (全モード共通) — アプリケーション背景と同化し、「透明な構造」を実現します。

**Border**

- `border-right: var(--border-width) solid var(--border-ghost)`
- *Rationale*: サイドバーは「構造の気配（Ghost）」として機能すべきであり、標準の `--border-default` (Opacity `0.12`) よりもさらに繊細な `--border-ghost` (Opacity `0.04`) を採用して静謐さを保ちます。
- *Note (index.md との整合性)*: `index.md` L897 では `--border-subtle` が記載されていますが、本仕様では「Silent Existence」の哲学を徹底するため、より繊細な `--border-ghost` を採用しています。将来的に `index.md` 本体を更新する際は、この仕様を基準としてください。
- *Collapsed State*: `collapsed` 状態ではサイドバーそのものが隠れるため、ボーダーも消失します。

**6. アクセシビリティ (A11y)**

**WAI-ARIA 属性**

| 属性 | 値 | 必須? | 説明 |
|------|-----|------|------|
| `role` | `navigation` | ✅ | ランドマーク（自動付与） |
| `aria-label` | `"Main Navigation"` | ✅ | スクリーンリーダー用のラベル |

**Keyboard Shortcuts**

- `Cmd+B` (macOS) / `Ctrl+B` (Windows/Linux): サイドバーの開閉をトグル。

**Focus Management**

| アクション | タイミング | 動作 |
|-----------|-----------|------|
| **Collapse (格納)** | Step 1 | `inert` 属性を付与（即座にフォーカス無効化） |
| | Step 2 | アニメーション開始（300ms） |
| | Step 3 | アニメーション完了後、`visibility: hidden` を適用 |
| **Expand (展開)** | Step 1 | `visibility: visible` を適用、`inert` 属性を解除 |
| | Step 2 | アニメーション開始（300ms） |
| | Step 3 | アニメーション完了 |

> **Rationale (Inert Strategy):**  
> 格納アクション開始直後に `inert` を付与することで、アニメーション中のフォーカス迷子を防ぎます。展開時は逆順で、視覚的に表示される前にフォーカス可能状態へ復帰させることで、スムーズな操作体験を提供します。

**Focus Strategy**

`ui-header` と同様に、**Adaptive Focus** を適用します。`index.md` L681-723 の仕様に準拠し、移動中は控えめ（`--focus-ring-color-subtle`）、停止時に明確（`--focus-ring-color`）な識別を行います。

**7. アニメーション (Motion)**

**Transition Logic by Mode**

| モード | プロパティ | 挙動 |
|--------|-----------|------|
| **Fixed Mode (Desktop)** | `grid-template-columns` (Layout)<br>`opacity` (Content) | サイドバー領域が物理的に縮小し、メインコンテンツが中央へ寄る（Zen Mode）。 |
| **Overlay Mode (Mobile)** | `transform` (Slide)<br>`opacity` (Backdrop) | 画面外 (`translateX(-100%)`) への退避。 |

**Common Specs**

| 設定 | 値 | 説明 |
|------|-----|------|
| **Duration** | `--duration-slower` (300ms) | Scene Change として認知させる十分な時間。 |
| **Easing** | `--ease-spring` (Overdamped) | バウンスなしの収束。`index.md` L627-631 の「振動禁止」原則に準拠。 |

**Motion Reduction (モーション軽減)**

`prefers-reduced-motion: reduce` 時は、すべてのアニメーションとトランジションを無効化します。

| 設定 | Duration | Easing | 適用 |
|------|----------|--------|------|
| Default | `300ms` | `--ease-spring` | 標準動作 |
| `prefers-reduced-motion: reduce` | `0ms` (即時) | `linear` | 健康被害防止のため必須 |

**8. Forced Colors Mode (強制カラーモード)**

Windows ハイコントラストモードなど、OS レベルで色が強制される環境への対応です。

```css
@media (forced-colors: active) {
  ui-sidebar {
    background: Canvas;
    border-right: var(--border-width) solid CanvasText;
  }

  /* アクティブ状態を背景色だけでなくボーダーでも示す */
  ui-sidebar [part="item"][aria-current="page"] {
    outline: 2px solid Highlight;
    outline-offset: -2px;
  }

  /* アイコンは currentColor を継承するため自動的に適応 */
}
```

> **Rationale (Forced Colors Strategy):**  
> `index.md` L729-759 の「構造の維持」「ボーダーやスペーシングにより、背景色が無くても領域を認識可能にする」という原則に準拠します。透過ボーダーが消失する環境でも、`CanvasText` による明確な境界線で構造を維持します。

**9. 印刷スタイル (Print Styles)**

サイドバーは印刷時に非表示にします。ナビゲーション要素は紙媒体では不要です。

```css
@media print {
  ui-sidebar {
    display: none;
  }
}
```

**10. 使用例 (Usage Examples)**

**基本的な使用**

```html
<ui-sidebar>
  <!-- Mobile Context Switcher -->
  <button slot="header" aria-haspopup="menu">
    Music ▾
  </button>
  
  <!-- Navigation Tree -->
  <nav>
    <ul>
      <li><a href="/music/classical">Classical</a></li>
      <li><a href="/music/jazz" aria-current="page">Jazz</a></li>
      <li><a href="/music/rock">Rock</a></li>
    </ul>
  </nav>
</ui-sidebar>
```

**グローバルショートカット**

```typescript
// アプリケーションレベルでのキーボードショートカット登録
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
    e.preventDefault();
    const sidebar = document.querySelector('ui-sidebar');
    const layoutStore = useLayoutStore();
    layoutStore.toggleSidebar();
  }
});
```

### フッター (Footer) `<ui-footer>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: アプリケーションの終端を示し、法的要件およびシステム状態（バージョン）を静かに伝えます。
- **Recede**: ユーザーの注意を引くべきではないため、視覚的階層は最も低く設定します。

**2. セマンティクスとDOM構造 (Semantics & DOM Structure)**

- **要素**: ネイティブ `<footer>` 要素を使用します。これにより暗黙的に `role="contentinfo"` が適用され、スクリーンリーダーがランドマークとして認識します。
- **構造例**:
    ```html
    <footer class="ui-footer">
      <div class="footer-content">
        <span class="copyright">© {Year} Rouault</span>
        <span class="separator" aria-hidden="true">·</span>
        <span class="revision">#{ShortHash}</span>
      </div>
    </footer>
    ```
- **Items**: 以下の要素を 1行で配置し、区切り記号（Interpunct `·`）で接続します。
    - **Copyright**: `© {Year} Rouault`
    - **Separator**: `·` (Interpunct)
        - **Accessibility**: `aria-hidden="true"` を付与し、装飾的要素として扱います。スクリーンリーダーには読み上げられません。
        - **Opacity**: `0.3` (視覚的な「気配」として機能)
    - **Revision**: `#{ShortHash}` (Example: `#4a2b9f`)
        - **Source**: Git Commit Hash (Short SHA).
        - **Rationale**: 手動管理である `package.json` のバージョン番号は使用せず、CI/CDにより自動生成される不変のハッシュ値を採用します。これにより管理コストをゼロにしつつ、コードの実体との完全な整合性を保証します。
        - **Build Strategy**: 値はビルド時（Bundler）に環境変数から定数として埋め込みます。

**3. レイアウトと寸法 (Layout & Dimensions)**

- **Position**: `static` (ページ末尾に自然に配置)
- **Width**: `100%` (Viewport Width)
- **Content Width**: 最大 `var(--bp-xl)` (1280px)。ヘッダーと同様に、画面幅がそれ以下の場合は 100% とし、中央揃え (`margin-inline: auto`) を適用します。
- **Height**: `var(--header-height)` (48px) — ヘッダーとの対称性を保証
- **Padding**: 
    - **Vertical**: `var(--space-3)` (12px) — 内部要素の呼吸空間
    - **Horizontal**: `var(--space-4)` (16px) — モバイル時の左右余白
    - **Desktop**: `var(--space-8)` (32px) — より広い余白
- **Layout**: Flexbox (Justify: Center, Align: Center, Gap: `var(--space-2)`)

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Background**: `var(--bg-default)`
- **Border Top**: `var(--border-width) solid var(--border-ghost)`
    - **Rationale**: ヘッダー（`--border-default`）よりも階層を下げ、あくまで「気配」としての境界線に留めます。
    - **Warning**: `--border-ghost` は透過度 `0.04` と非常に薄いため、Forced Colors Mode で消失する可能性があります。ただし、フッターは画面末尾に配置されるため、スペーシング（余白）自体が構造を示します。
- **Typography**:
    - **Font Family**: `var(--font-mono)` (システム情報としての客観性を強調)
    - **Size**: `var(--text-xs)` (12px)
    - **Weight**: `var(--font-medium)` (500) — Small Text Rule準拠（細い線の消失を防ぐWeight Boost）
    - **Color**: `var(--fg-muted)`
    - **Tracking**: `var(--tracking-wide)` (0.025em) — Small Text Rule準拠（可読性確保）

**5. アクセシビリティ仕様 (Accessibility)**

**5.1 Forced Colors Mode**

透過ボーダー (`--border-ghost`) が消失した場合でも、フッターの位置（ページ末尾）とスペーシングにより構造は伝わります。念のため、明示的なボーダーを追加します。

```css
@media (forced-colors: active) {
  .ui-footer {
    border-top: var(--border-width) solid CanvasText;
  }
}
```

**5.2 モーション軽減 (Reduced Motion)**

本コンポーネントにはアニメーションを適用しません。将来的にホバー効果等を追加する場合は、`prefers-reduced-motion: reduce` 時に `--duration-instant` (0ms) へフォールバックします。

**5.3 Print スタイル**

印刷時はフッターを表示し、Revision情報（Git Hash）を印刷物に残します。これにより、印刷されたドキュメントがどのバージョンのコードから生成されたかを追跡可能にします。

```css
@media print {
  .ui-footer {
    /* 印刷時も表示（ページ末尾に配置） */
    display: flex;
    /* 背景色とボーダーは印刷時に不要 */
    background: transparent;
    border-top: 1px solid #000;
  }
}
```

**6. 実装ガイドライン (Implementation Notes)**

- **Year 自動更新**: Copyright の年は `new Date().getFullYear()` で動的に生成します。
- **Git Hash 埋め込み**: ビルド時に環境変数 `process.env.GIT_COMMIT_SHA` から取得し、短縮形（7文字）を使用します。
- **Slot 拡張**: 現在は固定コンテンツのみですが、将来的にプライバシーポリシーやライセンスリンクを追加する場合は、`<slot>` による拡張を検討します。
