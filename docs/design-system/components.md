## コンポーネント

### 基本要素 (Primitives)

#### リンク (Prose Link) `<a>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **Role**: コンテンツ（記事本文）内におけるハイパーリンク。
- **Scope**: `.prose` クラス配下のテキストリンクにのみ適用します。ナビゲーションやボタンとしてのリンク（UI Link）は対象外とします。
- **Dynamic Clarity**: 「読む」体験を阻害しないよう、デフォルトでは**本文色と同じテキスト色**を維持し、控えめな色付き下線のみで機能を示唆します。マウスオーバー時（Hover）に初めてテキスト自体が色付き、インタラクションの意思に対する明確なフィードバックを返します。

**2. 実装戦略 (Implementation Strategy)**

- **Selector**: `.prose a[href]:not([class])`
    - `href` 属性を持ち、クラスを持たない `<a>` タグのみを対象とし、意図しないスタイル汚染を防ぎます。
    - **Rationale**: `href` のないアンカー（ページ内ジャンプのターゲット等）を除外し、実際のリンクのみにスタイルを適用します。
- **SPA Routing**: ルーティング実装の詳細は `app-router` 仕様を参照してください。本セクションではスタイリング定義のみを扱います。

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

`oklch(from ...)` 構文（Relative Color Syntax）のブラウザサポート:

| ブラウザ | 最低バージョン | index.md 基準との差分 |
|----------|----------------|----------------------|
| Chrome | 119+ | 基準 (111+) より新しい |
| Safari | 16.4+ | **基準と一致** |
| Firefox | 128+ | 基準 (113+) より新しい |

非対応ブラウザでは `--primary` への直接フォールバックを実装します：

```css
.prose a {
  /* Fallback: Relative Color Syntax 非対応ブラウザ用 (Chrome <119, Firefox <128) */
  text-decoration-color: var(--primary);
  /* Modern: Relative Color Syntax 対応ブラウザ用 */
  text-decoration-color: var(--link-decoration-color);
}
```

**Touch (No Hover) 判定**

タッチデバイスではホバーによる発見可能性が得られないため、デフォルト状態から視覚的ヒントを強化します。

```css
@media (hover: none) {
  .prose a[href]:not([class]) {
    color: var(--primary);
    text-decoration-color: var(--link-decoration-color-touch);
  }
}
```

**バリアント (Variants)**

**Subtle** (`.link-subtle`)

メタデータ、日付、補助的なナビゲーション等で使用します。

| State | Text Color | Decoration | Note |
|-------|------------|------------|------|
| **Default** | `var(--fg-muted)` | `none` | 下線なし。テキスト色のみで控えめに存在を示唆。 |
| **Hover** | `var(--fg-default)` | `underline` | ホバー時に下線を表示し、リンクであることを明確化。 |
| **Focus-Visible** | `var(--fg-muted)` | `underline` | グローバルフォーカスリングを表示。 |
| **Visited** | `var(--fg-muted)` | `none` | Default状態と統合。 |

**禁止される背景**

| バリアント | 禁止背景 | コントラスト比 | 理由 |
|-----------|---------|---------------|------|
| `.link-subtle` | `--bg-fill-muted` | 3.8:1 | WCAG AA (4.5:1) 未達 |

> **使用可能な背景**: Subtleバリアントは `--bg-default` または `--bg-surface-2` 上でのみ使用してください。

**4. アクセシビリティ (Accessibility)**

- **Focus Indicator**:
    - グローバル定義の `:focus-visible` リングおよび **Adaptive Focus** 戦略を使用。
    - `outline: var(--focus-ring-width) solid var(--focus-ring-color)`
    - `outline-offset: var(--focus-ring-offset)`
    - `border-radius: var(--radius-sm)`
        - **Rationale**: テキストの `line-height` (1.75rem) に対して過大な角丸は視覚的ノイズとなるため、最小単位である `--radius-sm` (4px) を採用します。`index.md` のグローバル `:focus-visible` 定義では角丸が未指定のため、Prose Link固有の例外として適用します。
        - **TODO (index.md)**: グローバル `:focus-visible` 定義に `border-radius` の推奨値を追加することを検討してください。現状では各コンポーネントが個別に定義しており、一貫性が損なわれる可能性があります。
    - `animation: var(--animation-focus)`
- **Motion Reduction**:
    - `@media (prefers-reduced-motion: reduce)` 環境下では、`index.md` のグローバル定義により全てのトランジションが自動的に無効化されます（`0.01ms` に短縮）。
    - Adaptive Focusアニメーション（`--animation-focus`）も無効化され、フォーカスリングは即座に `--focus-ring-color` で表示されます。
- **Forced Colors Mode**:
    - `forced-colors: active` 環境下では、以下のスタイルを適用してシステム設定に完全に追従させます：
    ```css
    @media (forced-colors: active) {
      .prose a {
        color: LinkText;
        text-decoration-color: currentColor;
      }
      .prose a:visited {
        color: VisitedText;
      }
    }
    ```

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
    - **Primary**: `.ui-link` — 明示的にUIリンクとしてマークされた要素
    - **Contextual**: `.card:not(.prose) a`, `.sidebar:not(.prose) a` — 直接の子孫のみを対象
    - **Note**: `.prose` クラスを持つ要素の子孫リンクは、このスタイルの対象外とします。
- **SPA Routing**: Prose Linkと同様、ルーティング実装の詳細は `app-router` 仕様を参照してください。本セクションではスタイリング定義のみを扱います。
- **Interaction Pattern**:
    - **Neutral (Nav)**: 形（Weight）で機能を示唆し、色（Hover）で応答する。
    - **Action**: 色（Primary）で誘引し、装飾（Underline）で応答する。

**3. スタイリングとトークンマッピング (Style & Tokens)**

**Base Style**

- `cursor`: `pointer`
- `color`: `var(--fg-default)`
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
| **Nav** | ナビゲーション | `var(--fg-default)` | `var(--primary)` | `currentColor` | **Default**. サイドバーやカードタイトル。ノイズを抑え、ホバーで色付きます。下線色はテキスト色に追従。 |
| **Action**| アクション | `var(--primary)` | `var(--primary-hover)` | `currentColor` | 「編集」「作成」など、ユーザーに操作を促す強いリンク。下線色はテキスト色に追従。 |
| **Subtle**| メタデータ | `var(--fg-muted)` | `var(--fg-default)` | 後述 | 日付、タグなど。詳細は「Subtleバリアント詳細」表を参照。 |

**共通状態 (Common States)**

- **Hover**: `text-decoration: underline`. (※Actionバリアントは下線追加、Navは色変化+下線追加)
- **Active**: `transform: scale(var(--scale-pressed))` (0.96 - ボタンと同様のTactile Feedback)
    - **Rationale**: `opacity` による透過度変化ではなく、`transform` によるスケール変化を採用することで、背景色に依存しない明確な物理的フィードバックを提供します。
- **Focus-Visible**: グローバルフォーカスリング (`Adaptive Focus`) を表示し、移動中のノイズを低減します。
- **Visited**: `var(--fg-default)` (Default状態と統合)
    - **No Distraction**: Prose Linkと同様、個人メモの閲覧用途では「既読管理」より「UIの透明化」を優先します。

**Touch (No Hover) 判定**

タッチデバイスではホバーによる発見可能性が得られないため、デフォルト状態から視覚的ヒントを強化します。

```css
@media (hover: none) {
  /* Navバリアント: デフォルトで色付き */
  .ui-link,
  .card:not(.prose) a {
    color: var(--primary);
  }
  
  /* Subtleバリアント: 発見可能性を優先し、通常のfg-defaultに格上げ */
  .ui-link.link-subtle {
    color: var(--fg-default);
  }
}
```

**Subtleバリアント詳細**

| State | Text Color | Decoration | Note |
|-------|------------|------------|------|
| **Default** | `var(--fg-muted)` | `none` | 下線なし。テキスト色のみで控えめに存在を示唆。 |
| **Hover** | `var(--fg-default)` | `underline` | ホバー時に下線を表示し、リンクであることを明確化。 |
| **Focus-Visible** | `var(--fg-muted)` | `underline` | グローバルフォーカスリングを表示。 |
| **Visited** | `var(--fg-muted)` | `none` | Default状態と統合。 |

**禁止される背景**

| バリアント | 禁止背景 | コントラスト比 | 理由 |
|-----------|---------|---------------|------|
| `.link-subtle` | `--bg-fill-muted` | 3.8:1 | WCAG AA (4.5:1) 未達 |

> **使用可能な背景**: Subtleバリアントは `--bg-default` または `--bg-surface-2` 上でのみ使用してください。

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
- **Icon Links**:
    - アイコンのみのリンクの場合も、`color` の振る舞い（Default/Hover/Active）は各Variant定義に完全に準拠します。
    - ストローク幅は `index.md` の定義通り `1.5px` を維持します。
    - **Accessibility**: アイコンのみの場合は `aria-label` を必須とします。

**4. アクセシビリティ (Accessibility)**

- **Contrast Guarantee**:
    - 使用する全色は `index.md` のトークン定義により WCAG AA (4.5:1) を満たすよう計算されています。
    - Subtleバリアント使用時は、上記「禁止される背景」表を遵守してください。
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
    - `border-radius: var(--radius-sm)`
        - **Rationale**: UIリンクは短いラベルやアイコンで構成されることが多く、最小単位である `--radius-sm` (4px) を採用することで、フォーカスリングの形状を視覚的に整えます。
    - `animation: var(--animation-focus)`
    - `.card-link` にフォーカスが当たった場合、親カード (`.card`) に対してフォーカスリングを適用します。
    - `.card:has(.card-link:focus-visible)` セレクタを使用し、リンク単体ではなくカード全体を強調します。
- **Motion Reduction**:
    - `@media (prefers-reduced-motion: reduce)` 環境下では、`index.md` のグローバル定義により全てのトランジションが自動的に無効化されます（`0.01ms` に短縮）。
    - Adaptive Focusアニメーション（`--animation-focus`）も無効化され、フォーカスリングは即座に `--focus-ring-color` で表示されます。
- **Forced Colors Mode**:
    - `forced-colors: active` 環境下では、以下のスタイルを適用してシステム設定に完全に追従させます：
    ```css
    @media (forced-colors: active) {
      .ui-link,
      .card:not(.prose) a,
      .sidebar:not(.prose) a {
        color: LinkText;
        text-decoration-color: currentColor;
      }
      
      .ui-link:visited {
        color: VisitedText;
      }
      
      /* Actionバリアント: ボタンとして扱う */
      .ui-link.link-action {
        color: ButtonText;
        border: var(--border-width) solid ButtonText;
        padding: var(--space-1) var(--space-2);
      }
    }
    ```

**5. Print Styles**

印刷時には、UIリンクの役割に応じて適切な表示を行います。

```css
@media print {
  /* ナビゲーションリンク: 印刷時は非表示（ページ内でのみ意味を持つため） */
  .sidebar a,
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
  .card a {
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
| `label` | `label` | `string` | `"メインコンテンツへスキップ"` | 表示ラベル。**Rouaultは日本語固定のため、ハードコード可**（`index.md` L67-74: 多言語非対応方針）。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

**Default State (非表示)**

- **Position**: `fixed` (初期状態から固定配置。フォーカス時に `transform` のみ変化)
- **Visibility Strategy**: 
    - `transform: translateY(-100%)` で視覚外へ待避
    - `clip-path: inset(50%)` でスクリーンリーダー対応を確実化（`.sr-only` パターン）
    - `opacity: 0` で視覚的非表示
- **Note**: `visibility: hidden` や `display: none` は使用しません。これらはA11yツリーから要素を削除するため、スクリーンリーダーがリンクを認識できなくなります。

**Focus (`:focus`) State (表示)**

- **Position**: `fixed`. **Top Center** (`left: 50%; transform: translateX(-50%)`) に配置し、独立したシステム通知として扱います。
- **Visibility Restoration**:
    - `transform: translateX(-50%)` (中央配置)
    - `clip-path: none` (クリッピング解除)
    - `opacity: 1` (視覚的表示)
- **Z-Index**: `var(--z-max)` (**1000**). `index.md` の Z-Index Scale 定義 (L1476) に従い、システム最上位レイヤーに配置します。Toast (500), Modal (300) より上位です。
- **Focus Ring Override**:
    - `outline: none` (**Design Exception**)
    - **Rationale**: このコンポーネントは「出現すること自体」が強力なフォーカス状態を表すため、グローバルの `Adaptive Focus` リングと重複してノイズとならないよう無効化します。
    - **Forced Colors Support**: `forced-colors: active` 環境下では背景色が消失するため、`outline: 3px solid CanvasText` を強制的に適用し、視認性を保証します（`index.md` L1219-1279: 強制カラーモード戦略準拠）。
- **Appearance**:
    - Background: `var(--fg-default)` (反転色による最大コントラスト)
    - Color: `var(--bg-default)`
    - Font: `var(--font-sans)`, `var(--font-medium)` (500), `var(--text-sm)` (13px)
        - **Note (12px以下ルール適用外)**: `--text-sm` (13px) は `--text-xs` (12px) より大きいため、`index.md` L468-476 の「12px以下のテキスト補正ルール」は適用されません。
    - Border: `var(--border-width) solid var(--border-on-inverted)`
        - **Token Reference**: `index.md` で新規定義された `--border-on-inverted` トークンを使用。反転背景上の境界線として、計算式の直書きを避けます。
    - Padding: `var(--space-2) var(--space-4)` (8px 16px)
    - Radius: `var(--radius-full)` (ピル形状でナビゲーションであることを示唆)
    - Shadow (Light Mode): `var(--shadow-lg)`
    - Shadow (Dark Mode): `none`
        - **Rationale (Dark Mode Depth Strategy)**: `index.md` L699-717 の「Dark Mode Depth Strategy」に基づき、Darkモード下では「明るい背景色」を持つこのコンポーネントは「闇の中の発光体」として機能します。シャドウを削除することで、Muddy Shadows（泥のような濁った影）を回避し、**背景色自体のコントラスト**で浮遊感を表現します。
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

`index.md` L1219-1279 の戦略に従い、`forced-colors: active` 環境下では以下を適用します：

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
    - `Enter` / `Space`: ターゲット要素（`#main-content`）へジャンプし、フォーカスを移動します。
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

- **Target Element Configuration**: ターゲット要素（`<main id="main-content">` などメインコンテンツのラッパー要素）には `tabindex="-1"` を付与し、プログラム的なフォーカス移動を保証します。
    - **Note**: `tabindex="-1"` は、通常のタブ順序には含まれないが、JavaScriptやリンクからのフォーカス移動を受け入れ可能にする標準的な手法です。
    - **Critical**: これがないと、一部のブラウザでフォーカス移動が機能しません。

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
    - 基本設定: `variant="ghost"`, `icon-only="true"`, `size="sm"` (または継承)。
    - **Layout Stability**: アイコン切り替え時（`Copy` → `Check`）の微細な幅の変化によるガタつきを排除するため、コンテナの幅と高さは明示的に固定します。
    - **Focus Stability**: フォーカス状態は親コンテナであるボタン自体が保持します。内部アイコンの切り替え（DOM操作）が発生しても、フォーカスリングが途切れたり再描画されたりしない構造を維持します。
    - **Internal Feedback**: 内部に `role="status"` (`aria-live="polite"`) を持つ不可視要素 (`.sr-only`) を配置し、スクリーンリーダーへの通知をコンポーネント内で完結させます。
- **Logic**:
    - Clipboard API (`navigator.clipboard.writeText`) を使用。
    - **State Machine**:
        - `Idle`: 待機状態。
        - `Success` (Timer 2000ms): 成功。
        - `Error` (Timer 3000ms): 失敗。
        - **Note (Optimistic UI)**: 通常のクリップボード操作は一瞬で完了することが多いため、**`Copying`（ローディング）状態は原則として視覚化しません**（チラつき防止）。APIが応答しない等の異常な遅延（>500ms）が発生した場合のみ、Exceptionとしてローディングを表示します。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
| :--- | :--- | :--- | :--- |
| `value` | `value` | `string` | クリップボードに書き込むテキスト。 |
| `label` | `label` | `string` | **必須**。`aria-label` のベースとなるテキスト（例: "Copy code"）。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Micro-Interaction (Snappy Swap & Flash)**:
    - **Icon Swap**:
        - SVGパスの補間（Morphing）のような「物理的な変形」は行いません。
        - `--duration-fast` (70ms) / `--ease-out` (Snappy) での**瞬時の切り替え**と、システム標準よりわずかに深いスケール変化 (`scale(0.9)` → `1`) を組み合わせ、小さなアイコンでも確実な変化（Snappiness）を表現します。
        - *Rationale*: 通常ボタン (`--scale-pressed`: 0.96) よりも変化量を大きくすることで、小さな領域における視認性を補正します。
        - Success: `Copy` → `Check`
        - Error: `Copy` → `AlertTriangle`
    - **Flash Effect**:
        - `index.md` で定義された `--animation-flash` のタイミング・カーブを採用し、背景色を一瞬発光させてフェードアウトさせます。
        - **Implementation Note**: `--animation-flash` は `var(--bg-surface-active)` を参照するため、このコンポーネントのローカルスコープで変数を上書き (`--bg-surface-active: var(--bg-success-subtle)`) することで、標準キーフレームを流用しつつ色を制御します。
        - Success: `var(--bg-success-subtle)` (Green Tint)
        - Error: `var(--bg-danger-subtle)` (Red Tint)
- **Color State**:
    - **Idle**: `var(--fg-muted)`
    - **Success**: `var(--success)`
    - **Error**: `var(--danger)`
        - *Rationale*: アイコン色と背景フラッシュの色相を統一し、美的調和と状態伝達の明瞭さを両立します。
    - **Hit Area Requirement**:
        - 視覚的サイズは `size="sm"` (24px) ですが、`::after` 擬似要素を使用して必ず `--control-min-touch` (44px) 以上の物理ヒットエリアを確保してください。

**5. アクセシビリティ (A11y)**

- **Self-Contained Feedback**:
    - 外部のトースト通知システムには依存しません。
    - 状態変化時、内部の不可視領域 (`role="status"`) にテキスト（"Copied!", "Failed to copy"）を注入し、即座に読み上げさせます。これにより、視覚的変化に気付けないユーザーにも結果を保証します。
- **Label Update**: 補助的に、ボタン自体の `aria-label` も動的に更新します。

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

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `label` | `label` | `string` | 入力項目のラベル。視覚的に隠す場合でもA11yのために必須。 |
| `placeholder`| `placeholder`| `string` | ヒントテキスト。 |
| `value` | `value` | `string` | 入力値。 |
| `help-text` | `help-text` | `string` | 下部に表示する補助テキスト。 |
| `error` | `error` | `boolean` | エラー状態の強制。通常は内部バリデーションで自動制御。 |
| `readonly` | `readonly` | `boolean` | 読み取り専用モード。コピーは可能。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

**:host (Container)**
ラベル、入力エリア、ヘルプテキストを含むコンテナ。

- `display`: `flex`
- `flex-direction`: `column`
- `gap`: `--space-2` (8px)

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
    - エラー発生時は `aria-invalid="true"` を設定し、エラーメッセージ要素を `aria-describedby` に追加してスクリーンリーダーに通知します。

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
    - **DOM**: トリガーとオーバーレイ（Portal）を分離し、Shadow DOM境界を越えたアクセシビリティ連携（ARIA reflection）を実装します。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `label` | `label` | `string` | 入力ラベル。 |
| `modelValue`| `model-value` | `any` | 選択された値。通常は親フォームの状態と同期。 |
| `placeholder`| `placeholder`| `string` | 未選択時に表示するテキスト。 |
| `disabled` | `disabled` | `boolean` | 操作無効化。 |
| `readonly` | `readonly` | `boolean` | 値の変更不可。リストボックスは開かない。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

**Trigger (Invoker)**
`<ui-input>` と共有のスタイル定義（Border, Background, Radius, Height）をベースとし、**Adaptive Focus**（移動中のノイズ低減）を適用します。
右端には `ChevronDown` アイコン（`--icon-base`）を配置し、ボタン等の他要素とアイコンサイズを統一して垂直方向のリズムを維持します。

**Listbox (Overlay)**

| Property | Value | Note |
|----------|-------|------|
| **Z-Index**| `var(--z-popover)` | **Always on Top**: モーダル(`--z-modal`)より上位のレイヤーに配置。 |
| **Background** | `var(--bg-surface-2)` | Elevationによる浮遊感。 |
| **Border** | `var(--border-width) solid var(--border-default)` | 境界線を明確化。 |
| **Shadow** | `--shadow-lg` | 浮遊感の強調。 |
| **Highlight** | `inset 0 1px 0 0 oklch(100% 0 0 / 0.1)` | **Dark Mode Context**: 闇の中での輪郭を立たせるため、上端に微細な光の反射を追加（Depth Strategy準拠）。 |
| **Radius** | `--radius-md` | トリガーと同じR値。 |
| **Max Height** | `calc(var(--control-height-md) * 7.5)` | **Scrolling Affordance**: `overflow-y: auto`。7.5行分を表示し、端数を見せることでスクロール可能であることを直感的に伝える。 |
| **Scrollbar** | **System Mixin** | **Invisible Hit Area**: `index.md` の定義に従い、物理幅 `12px` を確保しつつ、視覚的には `4px` のみが描画されるよう透明ボーダーを活用する。 |

**Motion (Animation)**

- **Enter**: `opacity: 0` → `1`, `transform: scale(var(--scale-enter))` → `1` (Duration: `--duration-fast`). ユーザーの手前から奥へではなく、UIレイヤーとして「浮き出る」感覚。
- **Exit**: `opacity: 1` → `0` (Duration: `0ms` - Instant). 即座に消滅し、次の作業を阻害しない。

**Option Item**

- **Layout**: 左側にチェックアイコン用の領域 (`--space-6`) を**常時確保**します。未選択時もスペースを維持することで、選択切り替え時のレイアウトシフト（テキスト位置のズレ）を物理的に排除します。
- **State**:
    - `:hover` / `.active`: `background: var(--bg-surface-active)`
    - `[selected]`:
        - `color: var(--primary)`
        - `font-weight: var(--font-medium)`
        - **Icon**: 左側に `Check` アイコンを表示。
        - **Forced Colors**: `forced-colors: active` 環境下では、`outline: 2px solid CanvasText` を表示し、色情報が失われても選択状態を識別可能にする。

**5. アクセシビリティとキーボード操作 (A11y & Interaction)**

- **Attributes**:
    - Trigger: `role="combobox"`, `aria-expanded`, `aria-controls="[list-id]"`, `aria-activedescendant`
    - List: `role="listbox"`
    - Option: `role="option"`, `aria-selected`
- **Interaction**:
    - `Escape` で閉じてトリガーにフォーカスを戻します。
    - `ArrowUp` / `ArrowDown`: 選択候補の移動（`aria-activedescendant` の更新）。

#### ドロップダウンメニュー (Dropdown Menu) `<ui-dropdown>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 値の入力ではなく、「アクション（操作）」や「ナビゲーション」の選択肢を提示するために使用します。
- **Ephemeral UI**: ユーザーが必要とした瞬間に「現れ」、用が済めば「消える」UIです。常時表示する情報量（ノイズ）を減らすための主要な手段です。

**2. 実装戦略 (Implementation Strategy)**

- **Logic Reference**: Ported from `@lion/ui` (`OverlayController`) - ライブラリには依存せず、ロジックのみをコピー・改修して使用します。
- **Dependencies**: **`@floating-ui/dom`**
    - **Floating UI**: 位置計算のデファクトスタンダードを採用し、複雑な配置ロジック（Flip, Shift, Auto-update）を外部委譲します。
    - **Click Outside**: メニュー外クリックやスクロールで即座に閉じる挙動を実装。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `opened` | `opened` | `boolean` | 開閉状態。 |
| `align` | `align` | `'start' \| 'end' \| 'center'` | トリガーに対する配置基準位置。 |
| `placement` | `placement` | `'top' \| 'bottom' \| ...` | 出現方向（Floating UI準拠）。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

**Panel (Container)**

- `min-width`: `180px` (アクション名の可読性確保)
- `padding`: `calc(var(--radius-md) - var(--radius-sm))` (**2px**)。
    - **Note (Micro Spacing)**: これは `index.md` の最小スペーシング(`4px`)の例外です。親子間の $R_{outer} - R_{inner}$ を数理的に一致させ、完璧な同心円を描画することを優先します。これを守ることで、ユーザーは境界線の存在を意識せず、コンテンツのみに集中できます。
- `background`: `var(--bg-surface-2)`
- `border`: `var(--border-width) solid var(--border-default)`
- `border-radius`: `--radius-md` (6px)
- `box-shadow`: `--shadow-lg`
- **Highlight (Dark Mode)**: `inset 0 1px 0 0 oklch(100% 0 0 / 0.1)` (Depth Strategy準拠。闇の中での輪郭を立たせます)
- **Z-Index**: `var(--z-popover)`
- **Animation**: `<ui-select>` と同様の **Snappy Entrance / Instant Exit** を適用。
- **Max Height**: `calc(var(--control-height-md) * 10)` (コンテンツ量に応じたスクロール)
- **Scrollbar**: **Invisible Hit Area Mixin** を適用。
    - **Collision Prevention**: スクロールバーの不可視領域がアイテムのクリックを阻害しないよう、`z-index` 管理または `pointer-events` の制御（Thumbのみ有効化）を徹底します。

**Menu Item**

- `display`: `flex`
- `align-items`: `center`
- `gap`: `--space-2` (アイコンとテキストの間隔)
- `padding`: `--space-1` `--space-3`
- **Icon Size**: `--icon-base` (16px)
- `border-radius`: `--radius-sm` (4px - 親コンテナとの数理的整合性)
- **Hover**: `background: var(--bg-surface-active)`
- **Touch Target**: `::after` 擬似要素を使用し、**最低 44px の高さを確保 (Invisible Hit Area)** します。隣接アイテムとの重複を避けるため、ネガティブマージンや `z-index` 制御を含めます。
- **Destructive**:
    - `.variant-danger` クラスで文字色を `--danger` に変更。
    - **Hover**: `background: var(--bg-danger-subtle)`。コンテキスト全体を赤らめ、破壊的アクションであることを無意識に警告します。

**Separator**

- `height`: `1px`
- `margin`: `--space-1` 0
- `background`: `var(--border-muted)` (Ghost Border - 構造を暗示する最小限の色)

**5. アクセシビリティとキーボード操作 (A11y & Interaction)**

- **Roles**:
    - Trigger: `aria-haspopup="menu"`, `aria-expanded`
    - Menu: `role="menu"`
    - Item: `role="menuitem"`
    - Separator: `role="separator"`
- **Focus Management**:
    - メニューオープン時、フォーカスを**内部**（最初の項目）へ移動させます（`role="menu"` パターン）。
    - `Tab`: メニューを閉じ、トリガーの次の要素へフォーカス移動 (**No Focus Trap**)。
        - **Reason**: ドロップダウンはモーダルと異なり、思考の文脈を完全に切り替えるものではありません。ユーザーが「やはり次へ進みたい」と思った瞬間のフローを阻害しないよう、意図的にTrapを解除します。
    - `Arrow Keys`: 循環移動 (Roving Tabindex)。

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
| `indeterminate`| `indeterminate`| `boolean` | (Checkbox) 親項目の「一部選択」を示す中間状態。 |
| `label` | `label` | `string` | ラベルテキスト。 |
| `disabled` | `disabled` | `boolean` | 無効化。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Control Size**: `16px` (Matches `--icon-base`)
    - **Note**: テキストサイズ（14px）に対してわずかに大きくすることで視認性を確保します。
- **Touch Target**: `<ui-button>` 同様、`::before` 等の擬似要素を用いてクリック領域を拡張します。特にリスト内では、**行の高さ（Control Height）いっぱいまで判定を広げ**、高密度なレイアウトを維持したまま最大限の操作性を確保します（最低ターゲットサイズ: `var(--control-min-touch)` (44px)）。
- **Animation**:
    - Duration: `--duration-fast` (70ms) - 即応性を最優先。
    - Easing: `--ease-out` (Snappyな出現)。
- **Common State (Unchecked)**:
    - Background: `var(--bg-fill-muted)`
    - Border: `var(--border-width) solid var(--border-default)`
    - **Logic**: 未選択時は「構造」として静かに存在し、選択時のみ「色」を持ちます。
- **Checkbox**:
    - Radius: `--radius-sm` (4px)
    - Checked: 
        - Background: `var(--primary)`, Border: `var(--primary)`
        - Icon: `Check` (Size: `12px`, Stroke: `1.5px`, Color: `var(--on-primary)`)
    - Indeterminate: 
        - Style: `Checked` 状態と同一の背景・ボーダーを適用。
        - Icon: `Minus` (Size: `12px`, Color: `var(--on-primary)`)
- **Radio**:
    - Radius: `--radius-full`
    - Checked (Ring Style): 
        - Border: `4px solid var(--primary)`
        - Background: `var(--bg-default)` (**Hole Creation**: 選択時に背景を「穴」として抜く)
        - **Animation Impact**: `1px` (Unchecked) から `4px` (Checked) へのボーダー幅遷移に加え、背景色が `Muted` から `Default` へ変化することで、円の内側へ色が満ちていくような「ドーナツ型」のアニメーションを数理的に生成します。
        - **Contrast**: 中心に8pxの空間（`--space-2`）を残し、背景色 (`--bg-default`) とのコントラストを保証します。
- **Disabled**:
    - `opacity: var(--opacity-disabled)`
    - `cursor: not-allowed`

**5. アクセシビリティとキーボード操作 (A11y & Interaction)**

- **Label Activation**: テキストラベル部分のクリックでもチェック状態が切り替わることを、`<label>` 要素または Shadow DOM 内での ID 紐付けにより保証します。
- **Keyboard Support**:
    - Checkbox: `Space` でトグル。
    - Radio: `Arrow Keys` (上下左右) で同一グループ（`name`属性）内の選択肢を移動・選択。
- **Focus Indicator**:
    - `:focus-visible` 時にグローバルなフォーカスリングを適用します。
    - **Adaptive Focus**: `animation: var(--animation-focus)` を適用し、リスト内の高速移動時（矢印キー操作）のチラつき（ノイズ）を低減します。
- **Forced Colors Mode**:
    - `forced-colors: active` 環境下では、背景色によるチェック表現が無効化されるため、システムカラーを利用して状態を再定義します。
    - **Checked**: `background: CanvasText` (または `Highlight`), アイコン色は `Canvas` (または `HighlightText`)。
    - **Border**: `2px solid CanvasText` (境界を太くして視認性を担保)。

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
| `label` | `label` | `string` | スイッチのラベル。クリックでトグル可能。 |
| `disabled` | `disabled` | `boolean` | 操作無効化。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Dimensions**:
    - Bounding Box: `--control-height-sm` (24px) - システムグリッドに準拠。
    - Track Visual: `height: 20px`, `width: 36px`（ボックス内中央配置）
- **Track**:
    - Radius: `--radius-full`
    - Color (OFF): `var(--bg-fill-muted)` (Disabled slot)
    - Color (ON): `var(--primary)`
    - **Border**: `2px solid transparent` (High Contrast Mode用のフックとして領域確保)
    - Transition: `background-color var(--duration-fast)` (色変化も即座に行う)
- **Thumb (Knob)**:
    - Size: `16×16px`
    - Color: `white`
    - Shadow: `--shadow-sm`
    - Position: OFF `2px` → ON `18px` (TranslateX)
- **Animation**: `--ease-spring` (Overdamped)。余韻やバウンスを排除し、指の動きに吸い付くような追従性（Snappiness）を提供します。

**5. アクセシビリティとキーボード操作 (A11y & Interaction)**

- **Role**: `role="switch"`。`aria-checked` で状態を通知。
- **Focus Indicator**:
    - グローバル定義の `:focus-visible` リングを使用。トラック形状に合わせて `border-radius: --radius-full` を適用。
- **Interaction**:
    - `Click`: **ラベルを含むコンポーネント全体**、または単体使用時は `::after` 擬似要素により **`--control-min-touch` (44px) のヒットエリアを確保**し、操作性を最大化します。
    - `Space`: トグル操作。
    - `Enter`: **フォーム送信をブロックし、トグルのみ実行**。このコンポーネントは「値の収集」ではなく「即時実行」を意図するため、意図しないページ遷移（Submit）を防ぎます。
- **Forced Colors Mode**:
    - `forced-colors: active` 環境下では、背景色によるON/OFF表現が無効化されます。
    - **Track**: `border-color: CanvasText` (または `ButtonText`) を適用し、スイッチの境界と領域を明確化します。
    - **Thumb**: `background: CanvasText` (ON時は `Highlight`)。色情報が失われても、位置変化（`TranslateX`）が主要な視覚的シグナルとなります。

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

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `min` | `min` | `number` | 最小値。 |
| `max` | `max` | `number` | 最大値。 |
| `step` | `step` | `number` | 増減の刻み幅。 |
| `value` | `value` | `number` | 現在の値。 |
| `label` | `label` | `string` | **必須**。スクリーンリーダー用のラベル。 |

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
    - Background: `var(--border-default)`
    - Radius: `--radius-full`
- **Fill (Active)**:
    - Background: `var(--primary)`
    - Logic: 値に応じた `width` パーセンテージ制御（Custom View）。
- **Thumb (Knob)**:
    - Visual Size: `16px` × `16px`
    - **Touch Target**: `::after` 等により **44px × 44px** 以上のヒットエリアを確保。
    - Background: `var(--white)`
    - Border: `var(--border-width) solid var(--border-default)`
    - Shadow: `var(--shadow-md)`。Light Modeにおける背景との同化を防ぎ、**Z軸方向の分離**を明確にしてアフォーダンスを確保します。
    - Hover: `transform: scale(var(--scale-hover-lg))` (Snappy Easing)
    - **Dragging (Active)**: `transform: scale(var(--scale-dragging))`。操作中であることを明確にし、指で隠れる視認性を補う。
- **Focus Indicator (Proxy Style)**:
    - **Target**: 透明な `<input>` 自体のアウトラインは `none` に設定し、フォーカス状態に応じて**背面の Thumb** にリングを描画します。
    - **Selector Strategy**: `input:focus-visible ~ .track .thumb` のような兄弟セレクタを用いて、フォーカス状態を視覚要素へ移譲（Proxy）します。
        > **Note (DOM Order):** このセレクタを機能させるため、DOM構造上は `<input>` を `.track` よりも**前**に配置する必要があります（視覚的な重ね順は `z-index` で制御）。
    - **Style**:
        - `outline: var(--focus-ring-width) solid var(--focus-ring-color)`
        - `outline-offset: var(--focus-ring-offset)`
        - `border-radius: var(--radius-full)`
        - **Animation**: `animation: var(--animation-focus)` (**Adaptive Focus**)。移動中のノイズを抑え、停止した瞬間に明確化します。

**5. アクセシビリティ (A11y)**

- **Keyboard**:
    - `Right` / `Up`: 値を増加。
    - `Left` / `Down`: 値を減少。
- **Labeling Strategy (Direct Reflection)**:
    - **Property-to-Attribute**: 複雑さを避けるため、Shadow DOM越しのID参照（`aria-labelledby`）には依存しません。コンポーネントの `label` プロパティに渡された文字列を、内部 `<input>` の `aria-label` に直接反映（Reflect）させます。
    - **Mandatory**: 視覚的なラベル（`slot="label"`等）を使用する場合でも、スクリーンリーダー用として `label` プロパティの指定を必須とします。
- **High Contrast**:
    - `forced-colors: active` モードでは影が消えるため、Thumbに `border: 2px solid CanvasText` が適用されるようフォールバックスタイルを確保します。

#### 検索トリガー (Search Trigger) `<ui-search-trigger>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: ヘッダー等に配置され、**コマンドパレット (`<ui-command-palette>`) を起動するためだけのボタン**です。
- **Dummy Input (Mental Model)**: 外見は検索ボックス（Input）そのものですが、実際には文字入力を行わず、**アクティブ化（クリック・Enter）**によって即座にモーダルを展開します。これにより、PCとモバイル、キーボード操作とマウス操作の体験を完全に統一します。

**2. 実装仕様と構造 (Implementation Strategy)**

- **Core Semantics**: ネイティブ `<button>` 要素を使用します。`<a>` タグや `div` ではなく、適切なキーボード操作 (`Enter`, `Space`) を標準でサポートするボタン要素をベースにします。
- **Visual Camouflage (Styling)**:
    - `<ui-input>` のスタイル定義（Border, Background, Radius）を完全に継承します。
    - **Height**: `--control-height-md` (32px)
    - **Cursor**: `cursor: default`。文字入力カーソル（I-beam）による偽の期待を与えず、かつ通常のボタン（Pointer）ほど主張しない「ツール」としての感触を提供します。
    - **State**:
        - **Hover**: ボーダー色を `var(--border-default)` に変更（`<ui-input>`準拠）。
        - **Focus**: **Adaptive Focus** (`var(--animation-focus)`) を適用。背景色を `--bg-default` (白) に変更し、「入力モード」への切り替わりを視覚的に表現します。
- **Internal Layout & Responsive Behavior**:
    - **Desktop (Default)**:
        - **Left**: Search Icon (Size: `--icon-base` (16px), Color: `var(--fg-muted)`)
        - **Fill**: Placeholder Text ("検索...") - `user-select: none`。アイコンに続けて左揃え。
        - **Right**: Shortcut Badge (`<ui-kbd>Cmd K</ui-kbd>`)
    - **Mobile (`--bp-sm` 以下) & Touch Devices**:
        - **Icon Only**: プレースホルダーとバッジを `display: none` で隠蔽し、**検索アイコンのみ**を表示します。
        - **Dimension**: 幅を `auto` (または正方形) に縮小し、`padding: 0 var(--space-2)` 程度に調整してヘッダー領域を節約します。
        - **Touch Target**: 視覚的なサイズは `--control-height-md` (32px) ですが、`::after` 擬似要素を用いて **`--control-min-touch` (44px) のヒットエリアを確保** し、操作性を維持します。
    - **Logic**: キーボードショートカットのバッジは、タッチデバイス (`@media (hover: none)`) ではノイズとなるため非表示にします。
- **Accessibility**:
    - `aria-label="検索コマンドパレットを開く"` を付与し、視覚的なプレースホルダーテキストに依存せず機能を説明します。
    - `aria-haspopup="dialog"` を設定し、モーダルが開く挙動を予告します。
    - `aria-keyshortcuts="Meta+K"` を設定し、支援技術へショートカットキーを通知します。バッジ自体は `aria-hidden="true"` で隠蔽し、読み上げのノイズを防ぎます。
    - **No Tab Trap**: フォーカス時にはあくまでリング表示に留め、ユーザーの能動的な操作によってのみモーダルを展開します。

#### テキストエリア (Textarea) `<ui-textarea>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 複数行のテキスト入力（メモ本文、説明文）。
- **Flow State**: ユーザーの思考（入力）に合わせて領域が自動的に拡張（Auto Grow）し、スクロール操作による中断を物理的に排除します。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: `@lion/ui` の `LionTextarea`
- **Auto Grow Strategy**:
    - **Default**: 入力行数に応じて高さが即座に拡張する `auto-grow` を標準機能として実装します。
    - **Animation**: 原則として **`0ms` (Instant)** とし、物理法則の模倣よりも入力に対する即応性（Snappiness）とキャレット位置の安定を最優先します。初期表示やプログラムによる変更時のみ、状況に応じて `--duration-fast` (70ms) を許容します。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `rows` | `rows` | `number` | 初期表示行数。デフォルト: `3`。 |
| `max-rows` | `max-rows` | `number` | 自動伸長時の最大行数。これを超えた場合のみ内部スクロールを許可。 |
| `resize` | `style` | `'none' \| 'vertical'` | **原則 `none`**。Auto Growが無効、または `max-rows` 到達時のみ `vertical` を許容。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Base Style**: `<ui-input>` に準拠。
    - **Background**: `var(--bg-fill-muted)` (入力エリアの質感を定義)
    - **Border**: `var(--border-default)` (非フォーカス時は目立たなくする)
    - **Placeholder**: `color: var(--fg-subtle)`
- **Layout & Typography Strategy**:
    - **Default (UI)**:
        - **Padding**: `var(--space-2) var(--space-3)` (上下 8px / 左右 12px)。`<ui-input>` との並びにおけるベースラインの整合性を優先します。
        - **Font**: `--text-base` (14px), `line-height: --line-height-normal`。
        - **Typography**: `letter-spacing: 0.02em`, `font-feature-settings: "palt"` (UIとしての視認性と密度を優先)。
    - **Prose (Content)**: `variant="prose"` 指定時。
        - **Padding**: `var(--space-3) var(--space-3)` (上下左右 12px)。執筆時の「呼吸空間」を確保するため、意図的に広げます。
        - **Font**: `--text-lg` (16px), `line-height: --line-height-relaxed`。読む体験（`.prose`）との完全な一致を提供します。
        - **Typography**: `letter-spacing: 0`, `font-feature-settings: normal` (Noto Sans JP 本来のバランスを維持)。
- **Resize Grip**: 非採用とします。ユーザーに「狭くなったから手動で広げる」という作業を強いることは、執筆という思考プロセスを中断させるノイズとなるためです。
- **Scrollbar**: `max-rows` 超過時は内部スクロールが発生します。
    - **System Mixin**: `index.md` で定義された **Invisible Hit Area Mixin** を適用します。
    - **Thumb**: `var(--fg-subtle)` (Hover: `var(--fg-muted)`)。
    - **Track**: `transparent`。

**5. アクセシビリティ (A11y)**

- **Focus Indicator**:
    - `<ui-input>` と共通の **Adaptive Focus** (`var(--animation-focus)`) を採用し、入力開始時の「構え」を静かに、かつ明確に伝えます。
- **Labeling**: **Label Reflection** 戦略を採用し、内部要素へ確実に名前を伝播させます。
- **Forced Colors Mode**:
    - `forced-colors: active` 環境下では、`border: 2px solid CanvasText` を適用し、入力領域の境界を明確化します。

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
        - 削除可能なタグの場合は、内部に「閉じるボタン」を持ち、クリックイベントをディスパッチします。
        - **Constraint**: HTML仕様（Interactive content nesting）に基づき、`href` と `removable` が併用される場合は、タグ全体を `<a>` で囲むのではなく、**テキスト部分 (`<a>`) と削除ボタン (`<button>`) を Flexbox で並列配置** する構造を採用します。
        - **Touch Target**: モバイル操作時は、削除ボタンのヒットエリアをタグの右半分全体に拡張するなどの不可視の補正を行い、誤操作を防ぎます。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `variant` | `variant` | `'default' \| 'outline' \| 'solid'` | 通常は `default` (Subtle)。`solid` は重要なステータスのみ。 |
| `size` | `size` | `'xs' \| 'sm'` | 通常は `xs` (20px - High Density)。強調時のみ `sm` (24px)。 |
| `color` | `color` | `'neutral' \| 'blue' \| 'gold' ...` | 意味的カラー（例: `gold`=Literature）。トークン名（`--hue-*`）と整合させる。 |
| `removable` | `removable` | `boolean` | 削除用「×」ボタンを表示するか。 |
| `href` | `href` | `string` | リンク先URL。テキスト部分がリンクとなる。 |

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
- **Font**: `--text-xs` (12px), `var(--font-medium)`
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
    - Default: `var(--bg-fill-muted)` (L96%) をベースとした、各色相のSubtleティント。
- **Border**: デフォルトで `var(--border-width) solid transparent` を保持し、Hover時のレイアウトシフト（ガタつき）を物理的に防ぐ。
- **Hover**:
    - Default: ボーダー色を `var(--border-default)` または同等の色に変更し、背景色は維持する。

- **Color System Strategy**:
    - **Separated Delta Logic**: Gold（黄色系）の視認性問題を解決するため、明度補正値（Delta L）を**背景用**と**文字用**で分離独立させます。
    - **Chroma Dampening**: テキストの彩度は背景よりも敏感にノイズとなるため、`--chroma-ui` を減衰させて使用します。

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

**5. アクセシビリティ (A11y)**

- **Role**:
    - 通常: `span` (装飾的) または `listitem` (リスト内)。
    - Interactive/Removable: `role="button"` (または `role="group"` 内の `link` + `button`)。
    - Link: `role="link"` (ネイティブ `<a>` を使用)。
- **Contrast**: 修正された `Delta L` ロジックと `Chroma` 減衰により、特に黄色系（Gold）や高彩度色でのテキストコントラスト（4.5:1以上）を数学的に保証します。
- **Focus Indicator**:
    - Interactive Variant (`href` または `removable`) の場合は、システム共通の **Adaptive Focus** (`var(--animation-focus)`) を適用し、キーボード操作時のノイズを低減します。

#### バッジ (Badge) `<ui-badge>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: UIの一部として、数値（件数）やステータス（New, Draft）などのシステム的な「状態」を通知します。
- **Distinction**: ユーザー定義の分類である「タグ（矩形）」に対し、バッジはシステムからの通知であるため、**カプセル型（Pill Shape）** を採用して形状レベルで区別します。
- **Readability First**: **11px (`--text-2xs`)** という極小サイズを使用するため、色彩設計においては「ブランドカラーの再現」よりも「文字の判読性（Contrast）」を絶対的な最優先事項とします。

**2. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `variant` | `variant` | `'solid' \| 'subtle' \| 'dot'` | 視覚スタイル。デフォルトは `solid`。 |
| `count` | `count` | `number` | 表示する数値。指定された場合、スロット内容よりも優先される。 |
| `max` | `max` | `number` | 数値の最大表示リミット。デフォルト `99` (表示は `99+`)。 |
| `color` | `color` | `'danger' \| 'primary' \| 'neutral' \| 'success' \| 'warning'` | 意味的カラー。 |

| スロット名 | 説明 |
|------------|------|
| `default` | バッジのテキスト内容（`New`, `Beta` など）。`count` プロパティが未指定の場合に表示される。 |

**3. スタイリングとトークンマッピング (Style & Tokens)**

- **Tokens**:
    - **Font**: `--text-2xs` (11px), `font-weight: var(--font-bold)`, `tracking: var(--tracking-wider)` (12px以下のテキストルール準拠)
    - **Height**: `var(--control-height-2xs)` (16px) (行間 `1rem` に収まる高密度設計)
    - **Shape**: `border-radius: var(--radius-full)` (**原則として全てのバッジは正円または楕円**)
- **Logic & Color System**:
    - **High Contrast Strategy**: 11pxの文字を可読にするため、`Tag` コンポーネントと同様の **Delta L (明度補正)** ロジックを採用しますが、より厳格なコントラスト基準を適用します。
    - **Subtle** の文字色は、元の色（L=55%付近）をそのまま使うと明るすぎるため、**L=40%程度まで強制的に減光**させます。

    ```css
    :host {
      /* Base Logic (Tag準拠) */
      --bg-l: 96%;
      --fg-l: 40%; /* Tag(45%)よりもさらに深くし、細いフォントの視認性を稼ぐ */
      
      --chroma-bg: var(--chroma-subtle);
      --chroma-fg: calc(var(--chroma-ui) * 0.8);
      
      --delta-l-bg: 0%;
      --delta-l-fg: 0%;
    }

    /* Color Mapping */
    :host([color="neutral"]) { --badge-hue: var(--hue-base); --chroma-bg: var(--chroma-neutral); --chroma-fg: var(--chroma-neutral); }
    :host([color="primary"]) { --badge-hue: var(--hue-primary); }
    :host([color="success"]) { --badge-hue: 145; } /* Green */
    :host([color="danger"])  { --badge-hue: 25; }  /* Red */
    :host([color="warning"]) { 
      --badge-hue: 85; /* Amber */
      /* 黄色は背景・文字ともに視認性が低いため、強く補正 */
      --delta-l-bg: -5%;
      --delta-l-fg: -15%;
    }

    /* Dark Mode Override */
    @media (prefers-color-scheme: dark) {
      :host {
        --bg-l: 15%;
        --fg-l: 90%;
      }
    }
    ```

    > **Note (Color Restriction):**
    > バッジはユーザーコンテンツではなく「システムの通知（Status）」を表すため、Tagのように拡張可能なジャンル色（Blue, Pink等）は持ちません。
    > 常に `--hue-primary` や定義済みのセマンティックカラー（`danger`, `success` 等）のみを参照し、色による意味定義を固定します。

- **Variants**:
    - **Solid**:
        - `min-width: var(--control-height-2xs)` (正円)
        - `padding: 0 var(--space-1)` (4px)
        - `background: var(--{color})`
        - `color: var(--white)`
        - **用途**: 未読数 (`count`) や、特に強調すべきステータス。
    - **Subtle**:
        - `padding: 0 var(--space-2)` (8px)
        - `background: oklch(calc(var(--bg-l) + var(--delta-l-bg)) var(--chroma-bg) var(--badge-hue))`
        - `color: oklch(calc(var(--fg-l) + var(--delta-l-fg)) var(--chroma-fg) var(--badge-hue))`
        - `border: var(--border-width) solid oklch(calc(var(--bg-l) - 5%) var(--chroma-bg) var(--badge-hue))`
        - **Note**: ボーダー色は背景よりわずかに暗く設定し (`-5%`)、小サイズでの輪郭認識を補強します。
        - **用途**: `Beta`, `New`, `Draft` などのテキストラベル。
    - **Dot**:
        - `width: var(--space-2)` (8px), `height: var(--space-2)`
        - `background: var(--{color})`
        - **用途**: よくアイコンの右上に赤色で表示されるコンテンツの更新有無のみを伝える最小単位。

**4. アクセシビリティ (A11y)**

- **Contrast Safety**: 上記の `L=40%` (Dark Mode: `L=90%`) 設定により、極小文字であっても背景とのコントラスト比 4.5:1 以上を数学的に保証します。
- **Role**:
    - **Static Label**: `role` なし（`<span>`）。記事のステータス表示など、最初から表示されている場合。
    - **Live Notification**: `role="status"`。未読数カウントなど、動的に更新・出現する場合。
    - **Dot**: 視覚情報のみでテキストを持たないため、`role="img"` を付与し、`aria-label` で意味を提供します。
- **Labeling Rules**:
    - **Dot**: テキストを持たないため、**必ず** `aria-label` (例: "未読の更新があります") を付与する。
    - **Truncation**: `99+` と表示されている場合でも、可能な限り `aria-label` に正確な数値（例: "128 件の未読の更新があります"）を含めることを推奨する。
- **Forced Colors Mode**:
    - `forced-colors: active` 環境下では背景色が消失するため、以下の対策を行います。
    - **Solid / Dot**: `background-color` が `ButtonText` (または `Highlight`) に強制されるため、視認性はシステムのコントラスト管理に委ねられます。
    - **Subtle**: 背景の淡色が消えるため、`border: 1px solid ButtonText` が適用されるようフォールバックを用意し、カプセル形状（境界）を明確化します。
    - **Dot**: 背景色が消えても認識できるよう、`border: 1px solid ButtonText` を強制するか、High Contrast モード時のみサイズをわずかに拡大 (`10px`) して発見可能性を高めます。

#### パンくずリスト (Breadcrumbs) `<ui-breadcrumbs>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 現在位置のコンテキストを提供します。主要なナビゲーションではないため、視覚的階層は低く設定（Recede）し、ユーザーが必要として意識した時だけ認識できるようにします。
- **Wayfinding**: 階層が深い場合でも、「戻る」ための足跡を確実に残します。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: WAI-ARIA Breadcrumb Pattern
- **Logic**:
    - ネイティブの `<nav>` と `<ol>` 構造を使用。
    - **Collapsing Strategy**:
        - **Desktop**: 項目数が5つを超える場合、最初と最後、および現在地周辺を残し、中間を省略します。
            - **Context Awareness**: `omit-root` プロパティが有効な場合（ヘッダー内配置時など）、Context Switcherとの重複を避けるため、**ルート要素（最初の項目）を非表示**にします。
        - **Mobile**: 画面幅が狭い場合（`--bp-sm`以下）、**「ルート / ... / 現在地」の最小構成**へ自動的に凝縮し、ヘッダー領域の肥大化を防ぎます（中間パスは全て省略ボタンに格納）。
        - **Ellipsis Button**: 省略部分は `MoreHorizontal` アイコンを持つ **Ghost Variant (Icon Only) ボタン** (`<ui-button variant="ghost" icon-only>`) に置換します。
        - **Interaction**: ボタンをクリックすると、省略されていたパスが **Dropdown Menu** として展開されます（Snappy Animation適用）。
    - **Current Item**: 配列の最後の要素は自動的に「現在のページ」とみなされ、リンク (`<a>`) ではなくテキスト (`<span>`) としてレンダリングされます。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 説明 |
|------------|------|
| `items` | `{ label: string, href?: string }[]` の配列データ。 |
| `max-items` | 表示する最大項目数。デフォルト `4`（モバイル時は自動調整）。 |
| `omit-root` | `boolean` | `true` の場合、デスクトップ表示時に最初の項目（ルート）を隠します（Context Switcher併用時用）。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Separator**: `ChevronRight` Icon (`size: 14px`)。`color: var(--fg-muted)`。テキストの `›` は使用せず、アイコンのストローク幅 `1.5px` で統一します。
- **Item**:
    - Typography: `--text-sm` (13px) を標準とします。
        - **Small Text Rule**: コンテキストにより `--text-xs` (12px) を使用する場合は、`letter-spacing: var(--tracking-wide)` を必須とし、可読性を物理的に担保します。
    - **Link Radius**: `<a>` タグには `border-radius: var(--radius-sm)` を適用し、フォーカスリングの接触を防ぎます。
    - Default: `color: var(--fg-muted)`
    - Hover: `color: var(--fg-default)`
    - Current (Last Item): `color: var(--fg-default)`, `font-weight: var(--font-medium)`

**5. アクセシビリティ (A11y)**

- **Structure**: `<nav aria-label="パンくずリスト">` > `<ol>` > `<li>` > `<a>`
- **Focus Indicator**: リンク要素にはシステム共通の **Adaptive Focus** (`var(--animation-focus)`) を適用します。
- **Current Page**: `aria-current="page"` を付与。
- **Ellipsis Button**: 省略ボタンには必ず `aria-label="中間ページを表示"` を付与し、展開されるメニューのトリガーであることを明示します。

#### ツリーアイテム (Tree Item) `<ui-tree-item>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 階層化された情報を探索するためのナビゲーション・コンポーネントです。
- **Structural Visibility**: 階層構造は「無意識のオリエンテーション」の基盤です。インデントガイド（ツリー線）は、視覚的ノイズにならない極限の低コントラスト（Subtle）で**常時表示**し、ユーザーが能動的に探すことなく構造を把握できるようにします。
- **Smooth Expansion**: 展開/収縮のアニメーションは標準速度（`--duration-normal`）で行い、視覚的なレイアウトシフトに対する認知負荷（驚き）を最小化します。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: WAI-ARIA Tree View Pattern
- **Implementation (Recursion)**:
    - DOM構造と視覚階層を一致させるため、**ネスト構造（Recursive Nesting）**を採用します。
    - これにより、`aria-level` やグループ化のセマンティクスをブラウザ標準の挙動に委ね、堅牢なアクセシビリティを担保します。
    - **Selection**: シングルセレクト（カレント表示）のみをサポートし、閲覧体験に特化します。マルチセレクトは採用しません。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `expanded` | `expanded` | `boolean` | 子要素の展開状態。 |
| `selected` | `selected` | `boolean` | 現在選択されているか（カレント）。 |
| `label` | `label` | `string` | 表示ラベル。 |
| `icon` | `icon` | `string` | コンテンツアイコン（フォルダ/ファイル）。 |
| `density` | `density` | `'normal' \| 'compact'` | 行の高さ密度。デフォルトは `normal` (32px)。 |
| `expand-icon`| - | Internal | 展開用 `ChevronRight` アイコン。**視線移動を最小化するため、必ず左端（ラベルの前）に配置する。** |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Item Row**:
    - Height:
        - Normal: `--control-height-md` (32px) - 閲覧・操作に適した標準サイズ（Linear Docs準拠）。
        - Compact: `--control-height-sm` (24px) - IDEライクな高密度表示。
    - Full Width Hover: ホバー時の背景色は親コンテナの幅いっぱいに広がる。
    - Padding Left: `var(--space-4)` (ネスト構造による自然な積み重ね)
- **State Colors**:
    - Default: `color: var(--fg-muted)`
    - Hover: `background: var(--bg-active); color: var(--fg-default)`
    - Selected: `background: var(--bg-active); color: var(--primary); font-weight: var(--font-medium)`
- **Indent Guide (Structure)**:
    - **Implementation**: アイテムごとの計算ではなく、ネストされたグループコンテナ (`role="group"`) の左端にボーダーを描画します。
    - Default: `border-left: var(--border-width) solid var(--border-ghost)`
    - Hover/Active: **Active Context** (選択中のアイテムを含むパス) 上のボーダーを `var(--fg-muted)` に強化します。

**5. アクセシビリティとキーボード操作 (A11y & Interaction)**

- **Roles**: `role="treeitem"`
- **Interaction (Keyboard)**:
    - `Enter`: 選択 / アクション実行
    - `Right`: 展開（展開済みの場合は最初の子へ移動）
    - `Left`: 収縮（収縮済みの場合は親へ移動）
    - `Up` / `Down`: 前後の可視項目へフォーカス移動
    - `Home` / `End`: 最初/最後の項目へ移動
    - **Type-ahead**: 文字入力で該当項目へフォーカスジャンプ

**6. 初期化とスクロール挙動 (Initialization Strategy)**

- **Initial State**: ページロード時、現在のアクティブな項目までのパスのみを自動展開します。
- **Auto Scroll**: アクティブな項目が可視領域外にある場合、**`scrollIntoView({ behavior: 'instant', block: 'nearest' })`** で、最小限の視覚移動でフレームインさせます。コンテキスト（親要素）の位置関係を乱す唐突な中央配置（Center）は避けます。

#### ファイルツリー (File Tree) `<ui-file-tree>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 複数の `Tree Item` を包含し、ディレクトリ構造を管理するルートコンテナです。
- **UI Transparency**: デフォルトでは**枠線や背景を持たず（Transparent）**、インデントとタイポグラフィのみで構造を示唆します。
- **Robustness**: データのロード状態や空の状態を適切にハンドリングし、ユーザーに不安を与えません。

**2. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `items` | - | `TreeNode[]` | ツリー構造を表す再帰的なデータオブジェクト。 |
| `variant` | `variant` | `'default' \| 'card'` | 原則 `default` (背景なし)。`card` は独立したウィジェットとして使う場合のみ。 |
| `loading` | `loading` | `boolean` | データ取得中のスケルトン表示（遅延補償用）。 |

**3. スタイリングとトークンマッピング (Style & Tokens)**

- **Container (Default)**:
    - Background: `transparent`
    - Border: `none`
    - Padding: `var(--space-2) 0`
- **Overflow Strategy**:
    - **Truncation**: アイテム名が横幅を超える場合、水平スクロールは思考を分断するため採用しません。`text-overflow: ellipsis` で省略表示します。
    - **Hover Reveal**: 省略されたアイテムにホバーまたはフォーカスした際、**即座に（Snappyに） `<ui-tooltip>` を表示**して全名称を提示します。ネイティブの `title` 属性は表示遅延が大きくデザイン制御もできないため、**使用禁止**とし、必ずこのカスタム実装を用います。
- **Container (Variant: Card)**:
    - Background: `var(--bg-surface-1)`
    - Border: `var(--border-width) solid var(--border-default)`
    - Radius: `--radius-md`

**4. アクセシビリティと状態管理 (A11y & State)**

- **Role**: `role="tree"`
- **Focus Delegation (Entry Point)**:
    - コンテナ自体がフォーカスされた場合、自動的に**最初の可視アイテム**（または `aria-selected="true"` なアイテム）へフォーカスを移動させます。
    - ユーザーが `Tab` キーでツリーエリアに到達した際、迷子にならず即座にキーボードナビゲーション（矢印キー操作）を開始できるようにします。
- **State Handling**:
    - **Loading (Latency Compensation)**: SSG環境では原則としてデータは即座にレンダリングされるため、**スケルトン表示によるフリッカー（視覚ノイズ）を回避**します。ネットワーク遅延等で明示的な待機が発生する場合のみ `aria-busy="true"` を付与し、スクリーンリーダーへ通知します。
    - **Empty**: データが存在しない（空配列）場合でも、ルートコンテナはレンダリングし続けます（レイアウトシフト防止）。必要に応じて控えめなメッセージ（"No items"）を表示します。

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
        - **Efficient Filtering**: フィルタリング操作時のレイアウトスラッシング（Layout Thrashing）を防ぐため、DOMノードの頻繁な削除・再生成は避け、可能な限り **`hidden` 属性の切り替え** で制御します。
        - **Pagination Threshold**: 実機検証に基づき、**デスクトップでは 3,000アイテム**、**モバイルでは 500アイテム** を目安（またはDOM総数による制限）とし、これを超える場合はページネーションへの移行を必須とします。これは "Zero Latency" を維持するための防衛ラインです。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `items` | - | `Array` | データ配列。 |
| `columns` | - | `ColumnDef[]` | 列定義。`{ id, label, width, sortable, hideOnMobile?: boolean, primary?: boolean }` |
| `active-row` | `active-row` | `string` | 現在フォーカスされている行のID。 |
| `sort-key` | `sort-key` | `string` | 現在ソート基準となっている列ID。 |
| `sort-direction` | `sort-direction` | `'asc' \| 'desc'` | ソート順序。 |
| `href` | `href` | `string` | 行のメインコンテンツへの遷移先（Detail View）。 |

**Events**:

| イベント名 | Detail | 説明 |
|------------|--------|------|
| `ui-sort-change` | `{ key: string, direction: 'asc' \| 'desc' }` | ヘッダー操作によりソート順が変更された時に発火。 |
| `ui-active-change` | `{ rowId: string }` | キーボード操作等で行のアクティブ状態（フォーカス）が変更された時に発火。 |

**Slots**:

| スロット名 | 説明 |
|------------|------|
| `mobile-supplement` | モバイル表示 (`hideOnMobile`) で列が隠された際、重要な情報をプライマリ列内に統合表示するための領域。 |

**4. レイアウトとレンダリング戦略 (Layout Strategy)**

- **CSS Grid & Progressive Enhancement**:
    - **Modern (Primary)**: 親コンテナ (`<ui-list>`) で `display: grid`、各行 (`<ui-list-item>`) で `grid-template-columns: subgrid` を採用します。
    - **A11y Warning (display: contents)**: `display: contents` は一部のブラウザでセマンティクス（`role="row"`）が剥落する不具合があるため、**`subgrid` 対応環境以外では使用しません**。
    - **Fallback (Robustness)**: `subgrid` 非対応環境では、各行を独立したGridコンテキスト（明示的な `display: grid`）として扱います。この場合、`1fr` 等の相対値を使用すると行ごとのコンテンツ量によって列幅が不揃いになるため、`columns` 定義に基づく**固定値（px / %）または `minmax` による最小幅保証**を強制的に適用します。柔軟性（Flexibility）よりも、グリッドの整列（Alignment）を優先し、普遍的な可読性を維持します。
- **Header Generation**:
    - `columns` 定義に基づき、自動的に `role="rowgroup" > role="row" > role="columnheader"` を生成します。
    - **Sort State**: ソート可能なヘッダーには **`aria-sort="ascending" | "descending" | "none"`** を付与し、現在の状態をスクリーンリーダーに通知します。
    - **Header Interaction**: ソート可能な列ヘッダーはインタラクティブ（`tabindex="0"` または `<button>` 内包）とし、クリックおよびキーボード操作を受け付けます。
    - **Indicator**: `sort-key` に一致する列には、並べ替えアイコン（`ChevronDown` / `ChevronUp`）を表示します。
    - **Action Column**: 右端のアクション列に対しても、視覚的には空であってもアクセシブルなヘッダーセル（`<div role="columnheader" aria-label="Actions"></div>`）を配置し、グリッドの列構造を維持します。
- **Responsive**:
    - モバイル (`< md`) 環境では、可読性を維持するため、`columns` 定義内の `hideOnMobile: true` な列を非表示にします。
    - **A11y & Performance**: CSSによる非表示（`display: none`）ではなく、**DOM出力自体を抑制**します。これにより、レンダリングコストを削減し、同時にスクリーンリーダーの `aria-colindex` 計算の整合性を完全に保証します（JSによる `window.matchMedia` 等を用いたリアクティブな描画制御）。
    - **Constraint**: タイトルやメインリンクを含む**プライマリ列は `hideOnMobile` を禁止**し、どのような環境でもコンテンツへのアクセスを保証します。
    - **Data Preservation Strategy**: モバイル・タブレット等の狭小画面で列を非表示にする際、日付やステータスなどの重要情報が欠落するのを防ぐため、**明示的なスロット `<slot name="mobile-supplement">`** を用いてプライマリ列（タイトル）内に情報を統合表示します。これにより、構造的かつセマンティックなレスポンシブ対応を標準化します。

**5. スタイリングとトークンマッピング (Style & Tokens)**

- **Item Height**: `--control-height-md` (32px)
    - **Touch Target**: 物理的な高さは32pxですが、`::after` 疑似要素などを用いて、タッチデバイスにおけるヒットエリアは最低 `44px` (`--control-min-touch`) を確保する実装を含めます（Invisible Hit Area）。
        - **Collision Safety**: この拡大された見えないヒットエリア (`::after`, `z-index: 0`) が、行内のリンクやボタンの操作を阻害しないよう、行内コンテンツには **`position: relative; z-index: 1`** を付与し、物理的に前面へ配置することを必須とします。
- **Padding**: `0 var(--space-4)`
- **Border**:
    - Default: `none` (**UI Transparency**: デフォルトで罫線は引かず、コンテンツを分離しません)
- **State Colors**:
    - Default: `background: transparent`
    - **Hover / Focus Within**: `background: var(--bg-hover)`。
        - 状態変化時に右端のアクションボタンを表示 (`opacity: 1`)。
    - **Active (Focus)**: `background: var(--bg-surface-active)`。
        - 左端にアクセントマーカーを表示: `box-shadow: inset var(--border-width-thick) 0 0 var(--primary)`
        - **Note**: CSS `:focus-within` を活用し、内部のセルがフォーカスされた際に行全体のスタイルを変更します。
- **Forced Colors Mode**:
    - **Layout Safety**: `forced-colors: active` 時のレイアウトシフト（ガタつき）を物理的に防ぐため、**全ての行にデフォルトで `border-left: 3px solid transparent` を設定**します。
    - **Active State**: その上で、アクティブ（Focus）時のみこのボーダー色を `Highlight`（システムカラー）に変更することで、色情報に依存せず確実に選択状態を可視化します。
    - **Note**: `display: contents` を使用するケースでは親要素のボーダーが無効化されるため、このスタイルは最初のセル (`gridcell`) または `::before` 疑似要素に対して適用します。

**6. アクセシビリティとキーボード操作 (A11y & Interaction)**

- **Roles**: `role="grid"` (Container) > `role="row"` (Item) > `role="gridcell"` (Cell)
- **Primary Action Structure (Click Delegation)**:
    - `role="row"` 自体をリンクにはしません（スクリーンリーダーの挙動不安定回避のため）。
    - タイトル等を含む **主要セル (`role="gridcell"`) 内にネイティブの `<a>` タグを配置** します。
    - **Robust Delegation**: JSにより、行の余白クリックを検知して `<a>` タグへ委譲しますが、以下のケースでは**委譲をキャンセル（中断）**し、ブラウザ本来の挙動を優先します：
        - テキスト選択中 (`window.getSelection().toString()`)
        - **修飾キー押下時** (`Command`, `Ctrl`, `Shift`, `Alt`) - 別タブで開く等のネイティブ操作用
        - **中クリック** (Mouse Button 1)
- **Focus Strategy**: 
    - **Primary Cell Focus**: WAI-ARIA Grid Patternに準拠し、**行内の最初のインタラクティブなセル（通常はタイトル列）にフォーカス** (`tabindex="0"`) を与えます。
        - **Reason**: 行コンテナ (`role="row"`) 自体にフォーカスを当てると、一部のスクリーンリーダーが行内の全テキストを一括で読み上げてしまい、S/N比が悪化するためです。
        - **Visual Experience**: プログラム的なフォーカスはセルにありますが、**CSS `:focus-within`** を使用してフォーカスリングと背景色を**行全体 (`ui-list-item`) に描画**します。これにより、ユーザーのメンタルモデル（行選択）と実装の堅牢性（セルフォーカス）を乖離させることなく統合します。
    - **Adaptive Focus**: 行全体（`<ui-list-item>`）の `:focus-within` スタイルに対してシステム共通の `var(--animation-focus)` を適用し、時間的な強調表現を行います。セル単体へのフォーカスリングは不可視（または極小）とし、視覚的なノイズを排除します。
- **Keyboard Shortcuts**:
    - **Header Focus**:
        - `Enter` / `Space`: 列のソート順を切り替え（昇順 ⇄ 降順）。
    - **Row Focus**:
        - `Enter`: 詳細ページへ遷移（Primary Link Action）
        - `Space`: **Scroll (Browsing Optimization)**。WAI-ARIAの標準（選択）とは異なりますが、本アプリには「行単位の選択」機能が存在しないため、ブラウザネイティブのページスクロール動作を優先します。
            - **No Selection**: 誤認を防ぐため、チェックボックスや選択を示唆するアイコンは一切配置しません。
            - **A11y Requirement**: このUIが「アプリケーション」ではなく「ドキュメント」に近い閲覧体験を提供するため、**aria-description** または **aria-keyshortcuts** を用いて「Spaceでスクロール」できる旨をユーザーへ通知することを**必須要件 (Mandatory)** とします。
        - `Shift + Space`: **Quick Look (Preview)**。macOS Finderライクなプレビュー操作を提供します。実装時は **`preventDefault()` でスクロールを阻止** します。
        - `ArrowUp` / `ArrowDown`: 前後の行へ移動
        - `ArrowLeft` / `ArrowRight`: **セル移動 (Cell Navigation)**。WAI-ARIA標準に準拠し、インタラクティブ要素だけでなく全てのセル間を移動可能にします。これにより、キーボードユーザーが任意のテキスト情報（ID、日付など）にアクセスし、クリップボードにコピーすることを保証します（Universal Clarity）。
    - `Home` / `End`: 最初 / 最後の項目へ移動
    - `PageUp` / `PageDown`: 表示領域単位でスクロール移動
    - `Shift + F10` / `Right Click`: コンテキストメニューを表示
    - **Note**: 学習コストと標準準拠のバランスを考慮し、Quick Lookはモディファイアキー（`Shift`）との組み合わせに割り当てます。

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
        - 原則として JS制御により、移動距離に関わらず一定時間（`--duration-slower` 以内）で完了するカスタムスクロールを実装し、即応性を保証します。
        - **Reduced Motion**: ユーザー設定 `prefers-reduced-motion: reduce` が有効な場合、アニメーションを完全に無効化し、即座にジャンプします。

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
        - **Structure**: `border` プロパティではなく、`::before` 疑似要素を左端に絶対配置 (`width: 2px`) することで、インジケーターを独立したオブジェクトとして扱います。
        - **Shape**: `border-radius: var(--radius-full)`。単なる線ではなく「オブジェクト」として扱います。
        - **Transition Strategy**: 
            - **Scroll Driven**: スクロールによるアクティブ切り替え時は、アニメーション時間を **ゼロ (`--duration-instant`)** とし、遅延なく現在地を反映させます（計器としての正確性）。遅れてついてくるスプリングアニメーションは情報の同期ズレ（Lag）となるため禁止します。
            - **Jump / Click**: クリックジャンプ時は、`opacity` と `scaleY` を用いた微細なフェードイン（`--duration-fast`）を行い、「着地した」という物理的な確信（Confirmation）を与えます。
    - Typography: `--text-sm` (13px), Weight 400
        - **Note**: `index.md` の "Small Text Rule" (12px以下への補正義務) を回避するため、あえて `--text-sm` (13px) を採用します。これにより、Weightを `400` に保ったまま `--fg-muted` を使用することを可能にし、視覚的な静謐さと可読性を両立させます。
    - Color (Default): `--fg-muted` (WCAG AA準拠)
    - Color (Hover): `--fg-default` (背景色は変更せず、文字色のみで反応を返し、ノイズを抑える)
    - Color (Active): `--primary` ("今ここを読んでいる"という確信)
    - Padding Left: `calc(var(--level) * var(--space-2) + var(--space-3))`
        - **Note**: `var(--level)` は表示上の相対階層（0 start）として正規化した値を適用します（例: H2=0, H3=1...）。

**5. レスポンシブ戦略 (Responsive Strategy)**

- **Desktop (>= lg)**:
    - サイドバーへ追従配置（Sticky）。
- **Mobile (< lg)**:
    - **Trigger**: スティッキーヘッダーの右端に「目次アイコン (`List`)」を配置します。
    - **Presentation**: アイコンタップにより、画面下部からスライドインする **Bottom Sheet (Sheet Modal)** として展開します。
        - **Dimming**: 背景（記事本文）は `--z-overlay` で暗くし、フォーカスをシートへ移動させます。
        - **Digital Tactility**: 下方向へのスワイプで閉じるジェスチャーをサポートしますが、**背景（Overlay）クリック**による閉じる挙動を基本とし、操作の堅牢性を担保します。
        - **Selection**: 項目タップ後、シートは即座に閉じ、該当箇所へスムーズスクロールします。

**6. アクセシビリティ (A11y)**

- **Structure**: `nav` > `ul` > `li` > `a` (ネイティブリンク)
- **Label**: `nav` に `aria-label="Table of Contents"` を付与。
- **Current**: アクティブなリンクに `aria-current="location"` を設定。
- **Forced Colors Mode**:
    - **Indicator Visibility**: `forced-colors: active` 環境では背景色が消失するため、アクティブなインジケーター (`::before`) には `background-color` ではなく **`border: 2px solid Highlight`** (または `CanvasText`) を適用し、現在地を物理的に可視化します。

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

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `density` | `density` | `'compact' \| 'normal'` | 行の高さ密度。 |
| `colspan` / `rowspan` | - | - | **Support**. <br>**Long Table Strategy**: 行数が多く `rowspan` を使用する場合は、意味のまとまりごとに `<tbody>` 要素を分割することを推奨します。システムは `tbody` 間の境界線を強調 (`border-width-thick`) し、意味的なまとまり（Chunking）を提供します。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Header (`th`)**:
    - Font: `--text-xs`, `font-weight: var(--font-medium)`
    - Letter Spacing: `var(--tracking-wide)` (Small Text Rule準拠)
    - Color: `--fg-muted`
    - Vertical Align: `bottom`
    - Border: `var(--border-width-thick) solid var(--border-default)` (ヘッダーとボディの明確な区分)
- **Cell (`td`)**:
    - Font:
        - **Normal**: `--text-base` (14px) / `padding: 12px 16px`
        - **Compact**: `--text-sm` (13px) / `padding: 8px 16px`
    - Color: `--fg-default`
    - Font Feature: `"tnum"` (数値の等幅表示)
    - Vertical Align: `top` (長文折り返し時の可読性確保)
        - **Truncation Strategy**:
            - **Desktop**: 行の高さ（Rhythm）を一定に保つため、`max-width` を指定の上、`text-overflow: ellipsis` で省略し、`<ui-tooltip>` で補完することを標準とします。
            - **Mobile / Touch**: ホバー操作ができないため、**省略設定を強制解除（Wrap）**し、全てのテキストを可視化します。リズムより情報へのアクセス性を優先します。
    - **Alignment Support**: Markdown互換のため、`th`/`td` の `align` 属性（`left`/`center`/`right`）をCSSでサポートします。
        - **Automatic Optimization**: `align="right"` が指定されたセルには、数値とみなして自動的に `"tnum"` (等幅数値) を適用します。これにより、クラス指定なしで美しい数値リストを実現します。
- **Row (`tr`)**:
    - Border: `var(--border-width) solid var(--border-default)`
    - **Hover (Active Ruler)**: `background-color: var(--bg-hover)` (縦線がないため、現在行を示す動的な定規として機能させます)
        - **Note**: 高密度なデータ閲覧において「行」の識別性は重要です。標準の `--bg-hover` が薄すぎて Active Ruler として機能しない場合は、例外的にコントラストを高めた色（例: opacity `0.08`）への調整を許容します。
- **Caption (`caption`)**:
    - Position: `caption-side: top` (左寄せ配置)
    - Font: `--text-xs`, `color: var(--fg-muted)`
    - Padding: `--space-2` 0
    - Text Align: `left`
- **Density Variants (Padding)**:
    - **Normal**: `padding: var(--space-3) var(--space-4)` (12px 16px)
    - **Compact**: `padding: var(--space-2) var(--space-4)` (8px 16px)

**5. アクセシビリティ (A11y)**

- **Caption**: `<caption>` 要素でテーブルのタイトルを提供。
- **Scope**: `th` に `scope="col"` または `scope="row"` を明示。
- **Scrollable Wrapper**: 横スクロールが発生するコンテナには必ず `tabindex="0"` と `role="region"`、および適切な `aria-label` を付与し、キーボード操作によるスクロールを保証します。
- **Forced Colors Mode**:
    - 透過ボーダーが消失するのを防ぐため、`forced-colors: active` 時は `tr` のボーダーを `1px solid ButtonText` (または `CanvasText`) に強制し、構造の可視性を維持します。

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
        - **Interaction Logic**: Hover時に物理的な浮遊を表現するため、**Lifted (浮上)** 状態へ遷移します。Shadowを獲得し、背景が不透明化しますが、Elevatedバリアント（`surface-2`）とは異なり、Base層（`surface-1`）の色を維持します。
    - **Elevated**:
        - Border: `none` (**Note**: Darkモードでも枠線は引かず、ToneとEdge Highlightのみで階層を表現します)
        - Background: `var(--bg-surface-2)` (**Note**: index.md定義の通り、Base層より一段階明るいトーンを使用)
        - Shadow: `var(--shadow-md)` (Light) / `var(--shadow-dark-md)` (Dark)
        - **Edge Highlight (Dark)**: `box-shadow: inset 0 1px 0 0 oklch(100% 0 0 / 0.1)` (上部のハイライトでエッジを立たせる)
    - **Flat** (Filled):
        - Background: `var(--bg-surface-2)`
        - Border: `none`
        - Shadow: `none`
        - **Use Case**: 影による強調を必要としないが、領域としての明確な視覚的分離が必要な場合に使用。
    - **Ghost**:
        - Background: `transparent`
        - Border: `1px solid var(--border-ghost)`
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
            - Transition: `transform var(--duration-normal) var(--ease-out), box-shadow var(--duration-normal) var(--ease-out), border-color var(--duration-normal) linear`
        - **State Mutation**:
            - **Elevated**: Shadowが `var(--shadow-md)` から `var(--shadow-lg)` へ強化。
            - **Outlined**: 
                - **Physicality**: 浮遊により「枠」から「物体（面）」へ変化し、背景が不透明化します。
                - Background: `transparent` -> `var(--bg-surface-1)`
                - Shadow: `none` -> `var(--shadow-lg)` (浮上)
                - Border: `var(--border-default)` -> `var(--border-muted)` (浮上により輪郭線が光に溶け込む演出)

**5. アクセシビリティ (A11y)**

- **Role**: コンテンツに応じて `article` (独立記事), `section` (節), または `div` (単なるラッパー) を適切に使い分けること。
- **Focus**: 
    - **Functional Focus**: `clickable` な場合、カード全体ではなく、内部の主要リンクまたはアクションボタンにフォーカスを当てる構造にします（Focusable Container Anti-patternの回避）。
    - **Visual Unification**: 上記の通り、CSS `:focus-within` を用いて、視覚的にはカード全体をハイライトすることで、操作性と実装の堅牢性を両立させます。

#### タブ (Tabs) `<ui-tabs>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 同一コンテキスト内でのビュー（パネル）切り替えを提供します。
- **State Representation**: 現在位置のタブを明確にし、他が非アクティブであることを示しますが、非アクティブなタブもクリック可能であることをアフォードします。
- **Continuity**: パネル切り替え時は `opacity` によるクロスフェード（`--duration-normal` / 150ms）を伴い、認知の連続性を維持します。70msでは「ちらつき」として知覚されやすいため、コンテンツの変化にはわずかな余韻（タメ）を持たせます。
    - **Latency Handling**: ただし、パネルの内容がロード中（Fetching）の場合は、フェードインを待たずに即座にスケルトンを表示し、「データ取得の遅延」と「アニメーションの遅延」が直列にならないよう配慮します。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: `@lion/ui` の `LionTabs`
- **Porting**: `tablist` (header) と `tabpanel` (content) の関係性を管理するロジックを使用。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `selected-index` | `selected-index` | `number` | 現在選択されているタブのインデックス。 |
| `selected-value` | `selected-value` | `string` | 現在選択されているタブの値（ID）。URL連携用。 |
| `orientation` | `orientation` | `'horizontal' \| 'vertical'` | タブの配置方向。レイアウトに応じて切り替えます。デフォルトは `horizontal`。 |
| `automatic-activation` | `automatic-activation` | `boolean` | `true` の場合、矢印キーでの移動時に即座に選択（Activate）します。設定画面など、コンテンツがローカルにあり即応性が求められる場合に使用します。 |

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
        - **Scroll Padding**: キーボード操作でのタブ移動時 (`User Focus` / `Auto Scroll`)、フォーカスリングがコンテナ端で見切れるのを防ぐため、**`scroll-padding-inline: var(--space-4)`** を設定します。これにより、アクティブなタブは常に端から余白を持った位置にスクロールされます。
        - **Clearance**: コンテンツ（インジケーター含む）とスクロールバーの接触を防ぐため、`padding-bottom` に十分なクリアランスを確保します。
        - **Auto Scroll**: ページロード時や選択変更時、アクティブなタブが可視領域外にある場合は、自動的にスクロールして視野に収めます。
- **Tab (`tab`)**:
    - Height: **`--control-height-md` (32px)** (High Density準拠)
    - Color (Default): `--fg-muted`
    - Color (Hover): **`--fg-default`** (明度変化による静かなフィードバック)
    - Color (Selected): `--primary`
    - **Interaction**:
        - Active/Click: `transform: scale(var(--scale-pressed))` (`0.96`) をラベル要素（アイコン+テキスト）に適用し、入力受領の確かな触感（Tactility）を提供します。
    - **Touch Target**:
        - 物理的な高さは32pxですが、`::after` 疑似要素等を用いて垂直方向に **44px以上のヒットエリア** を確保します。
        - **Collision Avoidance**: 隣接するタブとの誤操作を防ぐため、ヒットエリアの水平方向のマージンや `z-index` 管理に留意してください。
    - **Indicator (Active Line)**:
        - 各タブの `border-bottom` ではなく、親要素内に配置された**独立したスライディング要素（Shared Layout Axis）**として実装します。
        - Color: `var(--primary)`
        - **Geometry Logic**:
            - **Horizontal**: Height `2px`. Bottom `0`. Widthは**ラベル（テキスト+アイコン）の幅**に一致。Animationは `translateX` & `scaleX`。
            - **Vertical**: Width `2px`. Right `-1px` (ボーダーに重ねる). Heightは**タブ自体の高さ**に一致（またはラベル高さ）。Animationは `translateY`。
        - Animation: **FLIPアニメーション**。**`var(--ease-spring)`** を採用し、ターゲット位置へ吸い付くような物理的な収束感を表現します。
            - *Note*: `prefers-reduced-motion` 時はアニメーションを無効化し、即座に配置します。
        - **Layering**: `z-index: 1` を指定し、`tablist` のボーダーと色が混ざらないよう最前面に配置します。
        - **Hydration Strategy (SSG/SSR Safety)**:
            - JSによる位置計算 (`transform`) が完了するまでの間（Hydration前）、インジケータが消失したりアニメーションしたりするノイズを防ぎます。
            - **Initial State (Fallback & No-JS)**: `[aria-selected="true"]` なタブに対して、CSSで簡易的な `border-bottom` (Vertical時は `border-right` または `border-left`) を描画することを**必須**とします。これにより、JSが無効な環境やロード失敗時でも現在地情報が失われません。
            - **Hydrated State**: コンポーネントの初期化完了後（属性 `hydrated` 付与後など）、CSSによる下線を非表示にし、JS制御のスライディングインジケータへシームレスに引き継ぎます。

**5. アクセシビリティ (A11y)**

- **Keyboard**: 左右矢印キー（Vertical時は上下）でフォーカス移動。
    - **Activation Mode**:
        - **Manual (Default)**: `Enter` / `Space` で選択。フェッチが必要なコンテンツ向け。
        - **Automatic**: `automatic-activation` 有効時、矢印キーでのフォーカス移動と同時に選択。設定画面など即応性重視の場面向け。
    - **Focus Ring Strategy**:
        - **Global Standard**: `index.md` の戦略に従い、**`outline-offset: 2px` (外側)** を採用します。
        - **Adaptive Focus**: 連続移動時の「点滅」ノイズを抑えるため、**`var(--animation-focus)` (Time-based Intensity)** を適用します。移動中はリングが目立たず、停止した瞬間に明確化されます。
        - **Spacing**: タブ間のパディング（`var(--space-4)`）により十分なクリアランスがあるため、外側リングでも干渉しません。万一重なる場合は `z-index` でフォーカス要素を前面に出します。
- **ARIA**: `aria-controls`, `aria-selected`, `aria-orientation` の自動管理。
- **Forced Colors Mode**:
    - **Indicator Visibility**: `forced-colors: active` 環境では背景色が消失するため、JS制御のインジケータは非表示とし、代わりに**タブ要素 (`tab`) 自体の `border-bottom` (Vertical時は `border-right`) を `2px solid Highlight` (または `CanvasText`) で復活させる**「ネイティブ回帰」戦略を採用し、より堅牢な可視化を行います。

#### ページネーション (Pagination) `<ui-pagination>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 大量データを分割表示する際のナビゲーションです。
- **Range Logic**: `Prev 1 ... 4 5 6 ... 10 Next` のように、現在地周辺と両端を表示し、中間を省略するロジックを持ちます。
- **Link-based**: アプリケーションの状態遷移ではなく、ドキュメントの「移動」であるため、プログレッシブエンハンスメントを前提としたリンク構造を提供します。

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

**6. アクセシビリティ (A11y)**

- **Role**: `nav` 要素、`aria-label="Pagination"`。
- **Label**: 各リンクに `aria-label="Go to page 5"`、前後ナビゲーションには `aria-label="Go to previous page"` 等を動的に付与。
- **Current Page**: 
    - `aria-current="page"` を付与。
    - **Interaction**: 再ロードや誤認を防ぐため、**リンク (`<a>`) ではなく `<span>` 要素としてレンダリング**し、物理的にタブ順序から排除する。
- **Focus Management**: 
    - ページ遷移後、フォーカスは自動的に **ページタイトル (`h1`)** へ移動し、利用者が新しいページの先頭にいることを明確にします。スクリーンリーダーの読み上げコンテキストをリセットするためにも必須です。

### 記事・コンテンツ要素 (Article Elements)

#### 記事ヘッダー (Article Header) `<ui-article-header>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: コンテンツへの入り口として、タイトルとメタデータを明確に提示します。
- **Hierarchy**: `H1` タイトルはページ内で最も強い視覚的重みを持ち、本文導入部へのスムーズな視線誘導を行います。

**2. スタイリングとトークンマッピング (Style & Tokens)**

- **Title**:
    - Tag: `<h1>`
    - Typography: 
        - Size: `--text-4xl`
        - Weight: `700`
        - Letter Spacing: `--tracking-tight` (Not tighter: 和文可読性確保)
        - Line Height: `--line-height-tight` (塊としての構造美)
        - Font Feature: `"palt"` (和文プロポーショナルメトリクス)
    - Max Width: `var(--width-reading)` (本文幅と揃える)
    - Mobile: `clamp()` 関数等を使用し、**`--text-2xl` (24px)** 程度までスムーズに縮小させます。
        - **Line Height**: フォントサイズ縮小に伴い、行の高さも **`2rem`** 程度へ適切に縮小させ、垂直方向のリズムを維持してください。
        - **Reason**: モバイル端末（特に320px-375px幅）において、30pxは改行を多発させ構造の「塊感」を損なうため、可読性を優先してサイズを落とします。
        - **Line Breaking**: 和文の不自然な改行を防ぐため、`word-break: auto-phrase` (または `Budoux` 等の分かち書き処理) の導入を検討し、物理的なサイズ縮小だけでなく「意味のまとまり」での改行を優先します。
- **Metadata**:
    - **Structure**: `<ul>` 推奨（またはフラットな `<div>`）。
        - `<dl>` は `Key: Value` 構造を暗示しますが、本デザインではラベル（Key）を視覚的に隠すため、`<ul>` によるフラットなリストとして扱い、`aria-label` で意味を補完する方が適切です。
        - **Date**: `<time>` タグと `datetime` 属性を必須とします。
    - **Standard Items**: 以下の順序での配置します。
        1.  **Date**: `CalendarDays` icon (Lucide) + **最終更新日** (`YYYY-MM-DD`)。
            - **Policy**: 常に情報の鮮度（`updated` > `created`）を優先して一つだけ表示します。作成日は `<time>` タグの `title`属性（またはツールチップ）に格納し、視覚的ノイズを排除します。
            - **A11y**: スクリーンリーダー利用者への文脈提供のため、`<time>` 要素に `aria-label="最終更新日: [Date]"` を付与するか、`.sr-only` で補助テキストを併置することを必須とします。
        2.  **Category/Tags**: `Hash` icon + **Text Link**。
            - **Visual Weight**: メタデータ行の静謐さを保つため、背景色を持つ `<ui-tag>` (Chip) は避け、**`text-link` (#Tag)** を使用します。コンポーネントとしての矩形感を排除し、純粋なテキストリンクとして扱うことで、よりコンテンツに近い透明性を実現します。
            - **Style Strategy (Silent Link)**:
                - **Default**: `color: inherit` (`--fg-muted`)。下線は引かず、本文と同じ色で静かに配置します。
                - **Hover/Focus**: `color: var(--fg-default)` (または `var(--primary)`)。
                    - 通常のリンクのような色相変化（Hue Shift）ではなく、**明度変化（Lightness Shift）**のみで「押せる」ことを伝えます。これにより、メタデータエリアの静的な美しさを操作中も崩しません。
                - **Transition**: `color var(--duration-fast) var(--ease-out)`。
            - **Implementation Note**: `text-link` はカスタムコンポーネントではなく、**ネイティブの `<a>` タグ**（必要に応じてクラス付与）で実装します。これはテキストの折り返しやベースライン配置などの自然なインライン挙動を維持し、Markdownパーサーとの親和性を保つためです。
        3.  **Reading Time** (Optional): `Clock` icon + 読了時間目安（"5 min read"）。
        4.  **Source / License** (Optional): `Link` または `Scale` icon + 出典元への外部リンク（"Original"）やライセンス名。
            - **Note**: 翻訳記事や外部資料の転載の場合、原文への敬意と権利関係の明確化のため、この位置で明示をします。
        5.  **Status** (Optional): `FileDashed` (Draft) / `Archive` (Archived) icon + ステータス名。
            - **Policy**: デフォルト（完成/標準）の場合は非表示とし、注意を要する状態のみを表示します。
            - **Icon Metaphor**: `Pencil` は「編集ボタン」と誤認されるリスクがあるため、状態を表す静的なアイコン（`FileDashed` 等）を採用します。
            - **Style**: **Icon + Colored Text** で表現します。矩形のバッジ (`<ui-badge>`) はメタデータ行の静謐さを損なうため使用しません。
                - **Color**: 原則として **`--fg-muted`** (または静かなカスタム色) を使用し、ノイズを抑えます。注意喚起が必要な場合のみ `--warning` 等を使用しますが、その際も彩度や輝度を調整し、ヘッダーの静寂を乱さないよう配慮します。
    - **Separator**: アイテム間の区切りには、CSSの **`::before` 擬似要素 (`content: "・"`)** を使用します。
        - **Logic**: **`li + li::before`** セレクタ（隣接兄弟結合子）を使用します。
        - **Wrapping Benefit**: `::after` (行末配置) と異なり、アイテムが折り返された際にセパレーターも一緒に次行の先頭へ移動するため、行末に中黒だけが取り残される現象（dangling dots）を防ぎます。
        - **Subtlety**: **`color: var(--fg-subtle)`** を適用し、情報のノイズ化を防ぎます。
        - **A11y**: **`content: "・" / "";` (Alt Syntax)** を採用します。これはCSS生成コンテンツに代替テキスト（空文字）を設定できるモダンな手法であり、DOMを汚すことなく視覚と聴覚のS/N比を両立させるための**必須実装**です。
    - Layout: `display: flex`, `flex-wrap: wrap`, `align-items: center`
    - Placement: タイトル直下
    - Typography: `--text-sm` (13px), `color: var(--fg-muted)`
        - **A11y Check**: 13pxの細い文字はコントラスト不足になりがちです。レンダリング結果を確認し、視認性が低い場合は `font-weight: 500` への格上げを検討してください。
    - **Icon Size**: **`--icon-sm` (14px)**
        - **Optical Adjustment**: テキストサイズ `13px` に対する視覚バランス補正として、標準(`12px`)ではなく `14px` を採用します。
        - **Implementation Detail**: 必要に応じて `transform: translateY(1px)` 等の微調整を行い、数理的な中心ではなく**視覚的な重心**をテキストのベースラインと調和させてください。
    - Gap: **`--space-3` (12px)** (関連情報のグループとして密度を確保)
    - Margin Top: `--space-4`
- **Lead / Abstract** (Optional):
    - **Concept**: タイトルから本文へのスムーズな導入（滑走路）。
    - Typography: **`--text-xl` (18px)**, `line-height: var(--line-height-relaxed)`
        - **Reason**: 本文（`16px`）との明確なサイズ差を設け、導入部としての視覚的階層を確立します。
    - Color: **`--fg-default`** (本文と同様の重要度を持たせ、Mixed Signalsを防ぎます。)
    - Margin Top: `--space-6`
    - Margin Bottom (to Body): `--space-12` (十分な呼吸空間)
    - **Note**: Leadがない場合は、Metadata下のマージンを `--space-12` とします。

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
| `heading-level` | `heading-level` | `number` | タイトルを表示する場合のARIA見出しレベル（例: `3` -> `h3`）。デフォルトは指定なし（単なるラベル）。 |

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
                    - *Rationale*: Lightモードの `--warning` (L=75%) は背景色用であり、文字色としてはコントラスト不足 (`1.6:1`) です。`index.md` で定義された、コントラスト比（4.5:1以上）を保証するフォアグラウンド専用トークン **`var(--fg-warning)` (L=55%)** を正しく選択し、視認性と意味伝達を両立させます。
                - **Danger**: `var(--fg-danger)`
    - Radius: `--radius-md`
        - *Constraint*: 全周に一貫した角丸を適用し、有機的な「箱」としての形状を維持します。ボーダーが角丸に追従することで、コンテンツへの当たりを柔らかくします。
    - Padding: `--space-4`
    - **Forced Colors**:
        - `forced-colors: active` では背景色が消えるため、`border: 1px solid CanvasText` (全周) を追加し、矩形領域を可視化します。
        - **Accent Border**: 左側のアクセントボーダーは `border-inline-start: var(--border-width-thick) solid Highlight` として太さと色（システム強調色）を維持・強制し、種別ごとの重要性を物理的に伝達します。
- **Icon**:
    - Size: 
        - **Prose Context (Default)**: **`--icon-base` (16px)** — 記事本文のフォントサイズ（16px）との調和を優先。
        - **UI Context**: `--icon-base` (16px) — 狭いスペースやUI部品としての利用時。
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

**4. アクセシビリティ (A11y)**

- **Semantics**:
    - **`<aside>` (Recommended)**: HTML仕様における "Tangentially Related"（本筋から少し外れて関連している）コンテンツとして扱います。視覚的に枠で区切られている情報のセマンティクスとして最も適切です。
    - **`role="note"`**: 警告や短い注釈など、ランドマーク（`<aside>`）として扱うには大げさな場合や、より文脈との結びつきを強調したい場合は、`div` (または `section`) に `role="note"` を付与して実装することも可能です。
    - **Labeling & Heading Structure**:
        - タイトルがある場合は `div.title` に一意の ID を生成し、ルート要素の `aria-labelledby` から参照することで、スクリーンリーダー利用者が「何の注釈か」を即座に把握できるようにします。
        - **Heading Level**: `heading-level` 属性が指定された場合、`div.title` に `role="heading"` と `aria-level` を適用し、スクリーンリーダーのナビゲーション対象とします。

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
    - **Duration**: `var(--duration-normal)` (150ms)
        - *Rationale*: コンテンツ展開は視線移動を伴うため、マイクロインタラクション（70ms）よりも認知の余裕を持たせ、滑らかな「物質化」を表現します。
    - **Easing**:
        - Open: `var(--ease-out)` (減速しながら出現)
        - Close: `var(--ease-in)` (加速しながら消失)

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `summary` | `summary` | `string` | 見出しテキスト（デフォルトSlot使用時は無視）。 |
| `open` | `open` | `boolean` | 開閉状態。 |
| `variant` | `variant` | `'default' \| 'bordered'` | 枠線の有無。 |

**Slots:**
- **`summary`**: カードヘッダー等のリッチな見出しを使用する場合に指定。**このスロットが提供された場合、`summary` 属性は無視されます。**
- **(default)**: 折りたまれるコンテンツ本体。

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Container**:
    - **Variant: Bordered**:
        - Border: `1px solid var(--border-subtle)`
        - Radius: `--radius-md`
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
- **Content Wrapper**:
    - **Animation Container**: `display: grid`
    - **Inner**: `min-height: 0`
- **Content Body**:
    - Padding: `0 0 var(--space-4) 0` (Bordered時は `0 var(--space-4) var(--space-4)`)
    - Margin Left: `var(--space-6)` (アイコンの幅+ギャップ分インデントし、テキストラインを揃える)

**5. アクセシビリティ (A11y)**

- **ARIA**:
    - Trigger: `button` 要素を使用。`aria-expanded`, `aria-controls` を適切に設定。
    - Content: `region` ロール（必要に応じて）。
- **Keyboard**: `Enter` または `Space` で開閉可能。
    - **Focus Strategy**: Triggerボタンには、`index.md` で定義された **Adaptive Focus** (`var(--animation-focus)`) を適用し、連続移動時のノイズを抑制しつつ、停止時の明確なフォーカス位置を示します。
- **Forced Colors Mode**: `forced-colors: active` 時、Default Variant（枠なし）では背景色が消失するため、アイコン (`ChevronRight`) の `stroke` が `CanvasText` 等のシステムカラーに追従することを保証し、可視性を維持します。

#### コードブロック (Code Block) `<ui-code-block>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 開発者ノートにおける「第二の本文」。可読性と機能性を最大化します。
- **Low Saturation**: シンタックスハイライトは、本文の「静謐さ」を壊さないよう、彩度を抑えたテーマを自作・適用します。
    - **Harmony**: ネオンカラーのような高彩度は避け、プロジェクトのカラーパレット（`--hue-primary`, `--hue-base`）と調和した色相、および **彩度 (C) `0.08` 〜 `0.12`** 程度の落ち着いたトーンを採用します。
    - **Forced Colors Resilience**: ハイコントラストモード (`forced-colors: active`) では全ての色が失われるため、コメント部分（`comment`）に **`font-style: italic`** を適用し、斜体による構造的区別を担保します。

**2. 実装要件 (Implementation Strategy)**

- **Structure**: `<figure>` (Wrapper) > `<figcaption>` (File Name) + `<pre>` (Shiki Output) + `<button>` (Copy) のセマンティックな構成を採用します。
- **Language Label**:
    - **Visual**: 言語名（例えば "TypeScript" バッジ等）は、ファイル名やハイライトから自明であるため、**視覚的には表示しません**（S/N比の維持）。
    - **A11y**: スクリーンリーダー向けには、Shikiが出力する `class` だけでなく、`<pre>` または `<figure>` に **`aria-description="[Lang] code"`** を付与し、視覚的に隠された言語情報を明示的に伝達することを必須とします。
- **Engine**: プロジェクト規定に基づき **`Shiki`** (Build-time Rendering) を採用します。ランタイムJS（PrismJS等）は排除し、レイアウトシフトのない堅牢な描画とゼロ・ランタイムオーバーヘッドを実現します。
    - **Wrapper Injection (Shadow DOM)**: `<ui-copy-button>` コンポーネントを使用し、コピー機能とフィードバック（Flash/Morphing）を委譲します。
        - **Visibility (Desktop)**: 視覚的ノイズを抑えるためデフォルトでは非表示（`opacity: 0`）としますが、**ホバー (`:hover`)** および **フォーカス (`:focus-within`)** 時に即座に出現（`opacity: 1`）させます。
            - *Note*: キーボードフォーカスを受け付けるため、`display: none` ではなく `opacity` で制御します。
            - **Ghost Interaction Prevention**: `opacity: 0` の状態では **`pointer-events: none`** を適用し、不可視状態での誤クリック（Ghost Click）を物理的に防ぎます。出現時のみ `auto` に戻します。
            - **Snappiness**: `:focus-within` 起因の表示においては、フォーカスリングの視認性を優先するため、**transitionを無効化（または `duration-instant`）** し、即座に状態を可視化します。
    - **Visibility (Mobile/Touch)**: タッチ操作でのホバーは不安定であるため、 **`var(--opacity-link-touch)` (0.75)** を適用して常時表示とします。
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
    - **Mobile**: `width: calc(100% + var(--space-8))`, `margin-inline: calc(-1 * var(--space-4))`
    - **Desktop**: `width: calc(100% + var(--space-16))`, `margin-inline: calc(-1 * var(--space-8))`
- **Overflow**:
    - `overflow-x: auto`
    - **Scrollbar Clipping Safety**: Standalone モードにおいて、スクロールバーの端がコンテナの角丸 (`radius-md`) によって切り取られる現象（特にWindows環境）を防ぐため、必要に応じて下部に微細なパディングを確保し、物理的な干渉を回避します。
    - **Keyboard Scrolling**: コンテンツが溢れる場合、`<pre>` に `tabindex="0"` を付与し、キーボード（矢印キー）でのスクロールを可能にします。
    - **Line Wrapping**:
        - **Policy**: コードの知覚的な構造（インデント）を維持するため、**原則として折り返し（Wrap）は行わず**、横スクロールを提供します。
        - **Exception**: エラーログ等の文章的なコンテンツに限り、メタデータ指定による `white-space: pre-wrap` （折り返し）の適用を許容します。
    - スクロールバーには `index.md` で定義されたカスタムスクロールバー（不可視ヒットエリア付）を適用します。

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
| `label` | `label` | (Child Item) タブに表示するラベルテキスト。 **省略時のフォールバック順序: `filename` > `lang` > "Code"**。これにより空のタブが生成されることを防ぎます。 |
| - | - | **Metadata Extraction**: Code Group は、アクティブな Code Block が持つ `filename` 属性を読み取り、自身のヘッダー内に表示します。ただし、`label` が未指定（filenameをタブ名に使用）の場合、重複を避けるためメタデータ領域には表示しません。 |

**3. 実装要件 (Implementation Strategy)**

- **Progressive Enhancement & No-JS Stability (Critical)**:
    - **No-JS Stack (Default)**: 初期状態（No-JS/SSR）では、すべての `<ui-code-block>` を**縦積み（Stack）**で表示します。
    - **Hydration Strategy**:
        - JS（LionTabsコントローラー）がロードされ、属性の付与とShadow DOMへの投影準備が完了した時点で、コンテナに状態属性（例: `data-ready`）を付与します。
        - この属性が付与されて初めて、タブナビゲーションのスタイルとARIA制御（非アクティブパネルへの `hidden`）を適用し、インタラクティブなタブUIへと変形させます。これにより、レイアウトシフト（CLS）は発生しますが、コンテンツの完全性を保証します。
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
    - Border: `var(--border-width) solid var(--border-default)`
    - Position: `relative`
    - **Layout Strategy (Context-Dependent Breakout)**:
        - UIコンポーネントとしての安全性（Safe by Default）を優先します。
        - **Default**: `width: 100%`, `margin-inline: 0`。あらゆる親コンテナ（カード、サイドバー等）内で安全に動作します。
        - **Prose Context Extension**: 記事本文（**`.prose`**）の直下に配置された（`:host-context(.prose)`）場合に限り、以下の Breakout スタイルを適用し没入感を高めます。
            - **Mobile**: `width: calc(100% + var(--space-8))`, `margin-inline: calc(-1 * var(--space-4))`
            - **Desktop**: `width: calc(100% + var(--space-16))`, `margin-inline: calc(-1 * var(--space-8))`
    - **Nested Layout Safety (Double Breakout Prevention)**:
        - `ui-code-group` 内の `ui-code-block`（Breakout属性を持つ可能性がある）に対しては、CSSセレクタを用いて Breakout を **`auto` / `0` に強制リセット**し、グループ内コンテナに収まる（Fill Container）挙動とします。
- **Header Area Structure (ARIA Compliance)**:
    - **Structural Separation**: `div.code-group-header` (Flex wrapper) 内で「純粋なタブリスト (`div[role="tablist"]`)」と「ヘッダーツール (`div.header-tools`)」を明確に分離します。
    - **Container Stacking**: Wrapperに **`isolation: isolate`** を適用し、ローカルスタッキングコンテキストを生成します。
- **Tab List Container (`div[role="tablist"]`)**:
    - **Layout**: `flex: 1`, `overflow-x: auto` (Mobile対応).
    - Background: `var(--bg-surface-2)` (Elevated)
        - *Structure*: Body (`--bg-fill-muted`) に対して一段階「浮き上がった（明るい）」階層とすることで、物理的なフォルダのように振る舞いを表現します。
    - Border Bottom: `1px solid var(--border-default)` (未選択部分の境界線として描画)
    - **Scroll Affordance (Shadow Hint)**:
        - モバイル等でスクロールバーを非表示（`width: none`）にする場合、**CSS Pure Scroll Shadows** を導入し、スクロール可能な方向（隠れている側）にのみ影が出現する視覚的ヒントを提供します。
        - **Right Side Padding (Mask Compensation)**: ヘッダーツール（マスク領域）による文字被りを防ぐため、`tab-list` の末尾（`padding-right`）に **マスク幅と同等以上の余白（約40px）** を確保し、最後のタブが完全に可視領域までスクロールできるようにします。
    - **Desktop Strategy (A11y)**: マウスやキーボード操作を主とする環境では、操作手段（ハンドル）の提示が不可欠です。隠蔽は行わず、**`index.md` で定義されたカスタムスクロールバー (`height: 12px` / Track: Transparent / Thumb: `4px` Height)** を適用します。これにより、視覚的ノイズを最小限に抑えつつ、WCAG 2.1 (Pointer Gestures) に準拠します。
    - **Tab Item**:
        - **Touch Target & Clipping Prevention**:
            - **Concept**: **`::after` 疑似要素等を用いて垂直方向 44px (`--control-min-touch`) 以上のヒットエリア**を確保します。
            - **Clipping Safety**: 親要素（`tab-list`）の `overflow-x: auto` によって拡張されたヒットエリアが切り取られるのを防ぐため、`tab-list` 自体に **`min-height: 44px`** (または適切なパディング) を設定し、物理的なスペースをコンテナレベルで確保します。
            - **Horizontal Constraint**: 横並びのリストであるため、疑似要素の幅は **`width: 100%`** (または `left: 0; right: 0;`) とし、**隣接するタブへの重なり（Ghost Click）を物理的に防止**します。
        - **Focus State**: フォーカス時は **`z-index: 2`** を適用し、フォーカスリングが隣接するタブやボーダーに隠れず最前面に描画されるようにします。
            - **Visibility Safety**: キーボード操作でタブ移動する際、アクティブなタブが固定配置された `header-tools` の裏に隠れることを防ぐため、JSコントローラー側で **Scroll into View** ロジック（ツール領域を考慮したオフセット付き）を実装し、フォーカスリングが常に可視領域にあることを保証します。
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
- **Body (Code Block Wrapper)**:
    - Background: `var(--bg-fill-muted)` (Sunken)
    - Border Top: `1px solid var(--border-default)`
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
    - `aria-label`: グループの目的を記述。

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
| `lang` | `data-lang` | `string` | 対象言語。シンタックスハイライトおよびARIAラベルに使用。 |
| `heading-level` | `heading-level` | `number` | Header内の名前（Name）に適用する見出しレベル（デフォルト: `4`）。ドキュメント構造に応じて適切な階層を指定します。 |

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
    - **Breakout Strategy**: .prose 内部では左右に拡張し、複雑なシグネチャの視認性を確保します。
        - **Mobile**: `width: calc(100% + var(--space-8))`, `margin-inline: calc(-1 * var(--space-4))`
        - **Desktop**: `width: calc(100% + var(--space-16))`, `margin-inline: calc(-1 * var(--space-8))`
- **Header**:
    - Background: `var(--bg-surface-2)` (Elevated)
    - **Dark Mode Elevation Strategy**:
        - `index.md` の "Depth System" に従い、Dark Mode 時は上端に `1px` のハイライト（`box-shadow: inset 0 1px 0 0 ...`）を付与し、背景色の明度差だけでなく、光源反射による物理的なエッジを表現します。
    - Border Bottom: `1px solid var(--border-default)`
    - Padding: `var(--space-3) var(--space-4)`
    - Display: `flex`, `align-items: center`, `gap: var(--space-3)`
    - **Typography**:
        - **Kind (Tag)**:
            - **Background**: `var(--bg-fill-neutral)`
            - **Border**: `none`
            - Color: **`var(--fg-default)`**
            - Font: `var(--text-xs)`, `font-weight: var(--font-bold)`, `text-transform: uppercase`, `letter-spacing: var(--tracking-wider)`
            - Padding: **`calc(var(--space-1) * 0.5) var(--space-2)`**
                - *Rationale*: 垂直方向は `2px`。トークン `space-1` (4px) の半値を計算で導出し、マジックナンバーを排除します。
            - Radius: `var(--radius-sm)`
            - *Rationale*: 線（Border）による囲みは構造的なノイズとなるため、背景色（Fill）によるゾーニングを採用し、テキスト情報との親和性を高めます。
        - **Name**: `var(--text-base)`, `font-weight: var(--font-semibold)`, `font-family: var(--font-mono)`, `color: var(--fg-default)`.
    - **Copy Button (Action)**:
        - Placement: ヘッダー右端（`margin-left: auto`）。
        - Strategy: `ui-code-group` のヘッダーツールと同様の仕様（`opacity`制御、Adaptive Focus）を採用します。
- **Signature Area (The Valley)**:
    - Background: `var(--bg-fill-muted)`
    - Border Bottom: `1px solid var(--border-default)`
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
    - **Empty State**: 子要素が存在しない場合、このエリア (`dl`) 自体を非表示 (`display: none`) にします。

**5. アクセシビリティ (A11y)**

- **Heading Structure**:
    - Header内の `Name` は、ドキュメント内での重要なランドマークとなるため、`role="heading"` と適切な `aria-level` (`heading-level` 属性値) を付与し、ナビゲーション可能にします。
- **List Semantics**:
    - 複数のフィールドが並ぶ `Content Area` は、視覚的なGridだけでなく意味的なリスト構造を持ちます。
    - **Structure**: 親コンテナを `<dl>` (Description List) とし、各 `<ui-syntax-field>` を `<div>` (Wrapper) > `<dt>` (Name/Type) + `<dd>` (Description) としてレンダリングします。これにより、スクリーンリーダー利用者が用語とその定義の関係を正確に把握できます。
        - *Rationale*: 単なる `<ul>` よりも、名前（Key）と値（Value）の関係性を持つ情報構造に適しています。

#### 構文フィールド (Syntax Field) `<ui-syntax-field>`

**1. デザイン哲学と目的**

- **役割**: 関数の引数、構造体のフィールド、SQLのカラム、ReactのPropsなど、**「名前・型・制約・説明」** の4要素を持つ情報をリスト化します。
- **Grid Layout**: 複雑な型定義や長い説明文を、レスポンシブかつ整然と表示します。

**2. 技術仕様とAPI**

| プロパティ | 属性 | 説明 |
|------------|------|------|
| `name` | `name` | フィールド名（例: `props`、`user_id`）。 |
| `type` | `type` | 型定義（例: `string`, `Option<T>`, `VARCHAR(255)`）。 |
| `required` | `required` | 必須項目の場合 `true`。 |
| `default` | `default` | デフォルト値（例: `"anonymous"`, `NULL`）。 |

**3. スタイリング (Grid System)**

- **Layout**: CSS Grid
    - **Desktop**: **`[Name + Type + Default] [Description]` の2カラム構成**。
        - **Grid Properties**:
            - `grid-template-columns`: **`minmax(min-content, 30%) 1fr`**。左カラム（定義）が必要最小限の幅を確保しつつ、30%を超えて説明文を圧迫しないよう制御します。
            - `column-gap`: **`var(--space-6)`**。定義と説明の間に明確な一拍を置き、視線の移動をスムーズにします。
            - `align-items`: **`baseline`**。名前と説明文の1行目のベースラインを厳密に揃え、水平方向のリズムを維持します。
        - *Rationale*: HTML構造（`dt`/`dd`）を尊重し、アクセシビリティ（`display: contents` によるRole消失リスク）を回避するため、NameとTypeは同一セル（`dt`）内に配置します。
        - **Internal Layout**: `dt` 内部は `display: flex`, `align-items: baseline`, `gap: var(--space-3)` とします。
            - **Order**: `Name` -> `Type` -> `Default`.
            - **Default Value**: `Type` と視覚的に区別するため、`Type` の後に `var(--space-2)` のマージン、または **`color: var(--fg-subtle)`** で配置します。
    - **Mobile**: `Name` と `Type` を1行目、`Description` を2行目に配置するスタックレイアウト。
- **Typography & Colors**:
    - **Name**: `var(--font-mono)`, **`var(--text-sm)`**, **`font-weight: var(--font-semibold)`**, `color: var(--fg-default)`.
        - *Hierarchy Adjustment*: 親コンテナ（Card Header）より視覚的に目立たないよう、サイズとウェイトを抑えて階層を整理します。
    - **Required Mark**: 名前の直後（Typeの前）に `required` バッジを **`var(--fg-warning)`** で表示。
        - *Rationale*: "Danger" (Red) はエラーを意味し、必須情報としては強すぎるため、注意を促す "Warning" (Amber) を採用して静謐さを維持します。
    - **Type**: `var(--font-mono)`, `var(--text-xs)`, `font-weight: var(--font-medium)`, **`color: var(--fg-muted)`**.
        - *Visual Distinction*: アクションカラー (`--primary`/`--fg-info`) との混同（リンク誤認）を避けるため、Mutedカラーをベースとします。
        - **Important Types**: 主要な型情報などで強調が必要な場合は、ここでのテキスト表示ではなく、**`<code>` タグ（`var(--fg-default)`）でラップすること**を推奨ルールとします。
    - **Default**: `var(--font-mono)`, `var(--text-xs)`, `font-weight: var(--font-medium)`, `color: var(--fg-muted)`. (`default: value` 形式で表示)
    - **Description**: `var(--font-sans)`, `var(--text-sm)`, `color: var(--fg-default)`.
        - *Rationale*: これはメタデータではなく「本文」ですが、**APIリファレンスとしての情報密度（High Density）と一覧性を優先**し、`text-sm` を採用します。もちろん可読性は維持します。
- **Interaction (On-Demand Structure)**:
    - **Hover**: 行全体 (`:host`) にマウスホバーした際、**`background-color: var(--bg-hover)`** を適用し、各項目の境界をインタラクティブに可視化します。
        - **Cursor**: **`default`** (クリック不可であることを明示)。
        - **Touch Device Safety**: タッチデバイスにおいて、タップ時に背景色がつく挙動は「クリッカブルである」という誤解を招くため、**`@media (hover: hover)`** を使用してマウス操作時のみ適用します。
        - *Rationale*: `surface-active` (Primaryベース) は選択状態を意味するため、単なる読み取り補助（Reading Ruler）としては `bg-hover` (Neutral) が適切です。また、カーソル指定によりリンク誤認を防ぎます。
    - **Radius**: ホバー時の背景に **`var(--radius-md)`** を適用し、Rouaultの形状言語に即した「面」として表示します。
    - **Padding**: 上下左右に `var(--space-2) var(--space-3)` を確保し、背景色が表示された際の窮屈さを排除します。
- **Border**: **なし (`none`)**。
    - *Rationale*: リストの構造はグリッド配置とスペーシング、そしてインタラクションによって暗示されます。

#### インラインコード (Inline Code) `<code>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 本文中の技術用語、ファイル名、コマンド等を区別します。
- **Visual Distinction**: 本文フォントとは明確に異なる等幅フォント（Monospace）を使用することで、それが「実行可能」または「リテラル」な文字列であることを示します。
- **Subtlety**: 過度な主張（Strong Colors）は避け、あくまで本文の一部として自然に読める「静謐さ」を維持します。色は「機能（アクション）」ではなく「情報」として扱います。

**2. 実装基盤 (Reference)**

- **Native**: 標準の `<code>` タグを使用します。

**3. スタイリングとトークンマッピング (Style & Tokens)**

- **Font**: `var(--font-mono)`
    - **Optical Size & Scale Guard**:
        - 日本語フォントとの混植時に視覚的に浮く場合、`0.875em` での調整を基本とします。
        - **Constraint (Small Text Rule)**: 計算値が `12px` を下回る場合、`index.md` の "Small Text Rule" に従い、以下のいずれかの補正を必須とします。
            1. **Scale Reset**: 縮小を解除し `1em` (または `12px`) を確保する。
            2. **Weight Boost**: サイズ維持が難しい場合、**`font-weight: 500`** に太らせて視認性を物理的に補う。
- **Background**: **`var(--bg-fill-muted)`**
    - *Rationale*: 入力フォームやコードブロックと共通の「Fill」階層を使用し、一貫性を担保します。未定義のトークンは使用しません。
- **Color**: **`var(--fg-default)`**
    - *Constraint*: アクションカラー (`--primary`) の使用は禁止します（リンクと誤認されるため）。
    - *Context Awareness*: 親要素がリンク (`<a>`) の場合、色は **`inherit` (または `currentColor`)** となり、アンカースタイルに従います。これにより、インタラクティブなコンテキスト内での違和感を排除します。
- **Padding**: `0.2em 0.4em`
- **Radius**: `--radius-sm` (4px)
- **Border**: なし
    - *Rationale*: 背景色の明度差のみで構造を表現します。
    - **Forced Colors**:
        - `forced-colors: active` 環境では背景色が消失するため、**`outline: 1px solid CanvasText`** を明示的に適用し、可視化された境界線で囲むことを必須とします。
- **Layout Safety**:
    - **Word Break**: 長いファイルパスや関数名がレイアウトを押し広げるのを防ぐため、**`overflow-wrap: break-word`** を適用し、コンテナ内での折り返しを強制します。
    - **Vertical Rhythm (Line Height Protection)**:
        - `padding` によるボックス拡張が、親行の行送り（Rhythm）を破壊することを防ぎます。
        - **Implementation**: マージン相殺や `vertical-align: baseline` の調整、あるいは `line-height: inherit` を駆使し、あくまで「行の中に収まる」レンダリングを徹底します。

#### キーボード入力 (Keyboard Input) `<ui-kbd>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: ユーザーに対するキーボードショートカットや入力指示を視覚化します。
- **Digital Tactility**: キートップの**Tactile Affordance（押せる感）**を視覚化し、コード（`<code>`）とは異なる「操作可能なUI要素」であることを直感的に伝えます。
    - *Rationale*: 現実の物理法則（慣性）の模倣ではなく、デジタルなインターフェースとしての機能的な厚みを表現します。

**2. 実装基盤 (Reference)**

- **Native**: `<kbd>` タグ。

**3. スタイリングとトークンマッピング (Style & Tokens)**

- **Font**: **`var(--font-sans)`**
    - *Rationale*: 物理キーボードの印字（UI）を模倣し、`var(--font-mono)`（コード）と明確に区別するため。
    - **Scale Guard**: `index.md` の "Small Text Rule" に従い、計算値が **`var(--text-2xs)` (11px)** を下回る場合はそれを下限値（Lower Bound）とします。
        - **Compliance**: さらに以下の補正を適用して視認性を物理的に補います。
            - **Weight**: **`var(--font-medium)` (500)**
            - **Tracking**: **`var(--tracking-wide)`** (密集の回避)
- **Background**: `var(--bg-surface-2)` (Elevated Surface)
- **Border**: `var(--border-width) solid var(--border-default)`
- **Tactile Depth (Thickness)**: **`box-shadow: 0 2px 0 0 var(--border-default)`**
    - *Rationale*: `border-bottom` によるレイアウト（行間）の拡張を防ぎつつ、下部に厚み（側面）を持たせてUIコンポーネントとしての実在感を表現します。「ぼかし」のないソリッドな影を使用することで、デジタルな硬質感を保ちます。
- **Radius**: `--radius-sm` (4px)
- **Padding**: `0 0.4em`
- **Line Height**: **`var(--line-height-none)` (1)**
    - *Layout*: 行間（Vertical Rhythm）の破壊を徹底して防ぐため、高さ計算を最小化します。
- **Color**: **`var(--fg-default)`**
    - *Constraint*: 小サイズテキストの可読性を最優先し、コントラスト比の高い色を採用します。

**4. アクセシビリティ (A11y)**

- **Semantics**:
    - アルファベット（例: "K"）の場合はそのまま読み上げさせます。
    - 記号（例: `⌘`）を使用する場合は、`<span class="sr-only">Command</span><span aria-hidden="true">⌘</span>` のパターンを使用し、正確な読み上げを保証します。安易な `aria-label` よりもDOM構造による解決を優先します。


#### 引用 (Blockquote) `<blockquote>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 他者の言葉や外部ソースからの引用を、本文から視覚的に分離します。
- **Change of Voice**: 縦線によるアクセントで、読むリズムを変え、別な「声」であることを意識させます。

**2. 実装基盤 (Reference)**

- **Native**: `blockquote` タグ。出典がある場合は `<figure>` でラップし、 `<figcaption>` を使用します。
- **Scope**: `.prose` (記事本文) 内部での使用を前提とします。

**3. スタイリングとトークンマッピング (Style & Tokens)**

- **Layout & Rhythm**:
    - **Margin Block**: `var(--space-6)`
        - *Rationale*: セクション区切りと同程度のリズムを確保し、本文の流れを断ち切らずに挿入します。
    - **Margin Inline**: `0`
    - **Padding Inline Start**: `var(--space-4)`
- **Border Inline Start**: `var(--border-width-thick) solid var(--border-default)`
    - *Correction*: `muted` (Ghost) と `thick` (Emphasis) の矛盾を解消するため、標準色 (`--border-default`) を採用し、明確な構造線として機能させます。
    - *Note*: 論理プロパティ (`border-inline-start`) を使用し、書字方向に依存しない構造とします。
- **Color**: `var(--fg-default)`
    - *Correction*: 引用は「コンテンツ」であるため、可読性を優先し、メタデータ用色（`muted`）ではなく標準色を採用します。
- **Font Style**: `normal`
    - *Constraint*: 日本語フォント（Noto Sans JP等）において斜体（Italic）は機械的な「偽斜体（Oblique）」としてレンダリングされ、可読性と美しさを著しく損なうため禁止します。
- **Caption (Source)**:
    - **Element**: `<figcaption>`
    - **Typography**: `var(--text-xs)`
        - *Rationale*: `index.md` のメタデータ定義に準拠し、本文との階層差を明確にします。
        - *Constraint*: "Small Text Rule" および `<ui-code-block>` との一貫性を考慮し、**`font-weight: var(--font-medium)`** と **`letter-spacing: var(--tracking-wide)`** を併用して物理的な可読性を強固にします。
    - **Color**: `var(--fg-muted)`
        - *Rationale*: 出典情報はメタデータであるため、ここで `muted` カラーを使用し、本文との階層差を作ります。
    - **Margin Block Start**: `var(--space-2)`

**4. アクセシビリティ (A11y)**

- **Semantic Grouping**:
    - 出典を伴う場合、`<figure>` 要素を用いて `<blockquote>` (内容) と `<figcaption>` (出典) をグループ化することを必須とします。これにより、支援技術に対して両者の関係性が明確に伝わります。
- **Language Switch**:
    - 引用文が本文と異なる言語で記述されている場合、`<blockquote>` に `lang` 属性を明示します（例: `lang="en"`）。これにより、スクリーンリーダーの音声合成エンジンが適切な言語モードに切り替わり、正しい発音で読み上げられます。

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
    - 脚注本文を Light DOM のスロットとして埋め込み、ランタイムでの追加フェッチを回避します。
- **Popover API**:
    - ブラウザネイティブの **Popover API (`popover` 属性)** を活用し、軽量かつアクセシブルな実装を実現します。
    - **Fallback (Popover API 非対応環境)**:
        - **CSS `:target` Strategy**: Trigger の `href="#fn-1-popover"` と `:target` 疑似クラスを組み合わせ、同一ページ内で Popover 相当のコンテンツを表示します。ただし、この場合は位置固定（Sticky / Absolute）による簡易的な表示となり、Light Dismiss は JavaScript で補完します。
        - **JavaScript Polyfill**: Popover API の完全なポリフィル（位置計算、Light Dismiss、フォーカス管理）を提供します。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `ref-id` | `ref-id` | `string` | 脚注のユニークID（例: `fn-1`）。双方向リンクに使用。 |
| `index` | `index` | `number` | 脚注番号（表示用）。`[1]`, `[2]` のラベル生成に使用。 |

**Slots:**
- **(default)**: 脚注の本文コンテンツ（Markdown変換後のHTML）。

**DOM 構造設計 (Light DOM Strategy)**

Light DOM を採用する理由:
- **SSR 親和性**: Eleventy / Velite のビルドパイプラインで生成された HTML を、そのまま初期レンダリングに使用できます。Shadow DOM では SSR 時に内部構造を事前レンダリングできないため、Hydration 前の No-JS 環境でフォールバックが機能しません。
- **No-JS フォールバック**: `<a href="#fn-1">` によるネイティブなアンカーリンクが、JavaScript 無効時にそのまま機能します。
- **スタイル継承**: 本文コンテキストのタイポグラフィ（`font-family`, `line-height` 等）を自然に継承し、脚注が本文の一部として視覚的に統合されます。

**Internal Structure (Light DOM Managed):**
```html
<ui-footnote ref-id="fn-1" index="1">
  <!-- Trigger: <button> ベースで Popover を制御 -->
  <button 
    type="button"
    slot="trigger" 
    popovertarget="fn-1-popover"
    aria-expanded="false"
    aria-describedby="fn-1-popover">
    <sup>[1]</sup>
  </button>
  
  <!-- No-JS Fallback: Hidden Link (JS無効時に表示) -->
  <a href="#fn-1" class="footnote-fallback-link" hidden>
    <sup>[1]</sup>
  </a>
  
  <!-- Popover Content -->
  <div 
    slot="content" 
    id="fn-1-popover" 
    popover="auto"
    role="note"
    aria-labelledby="fn-1-label">
    <!-- Optional: Popover 内見出し (スクリーンリーダー用) -->
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
    - **Font Size**: `var(--text-xs)` (12px)
    - **Font Feature**: `font-variant-position: super` (OpenType `sups`)
        - *Fallback*: OpenType 非対応フォントでは `vertical-align: super` + `font-size: 0.75em` で代替。
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

**トークン定義:**
```css
:root {
  /* Popover 最大幅: 読みやすさを考慮した幅（約30-40文字相当） */
  --footnote-popover-max-width: 400px;
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
- **Shadow**: `var(--shadow-lg)` (Surface-2 からの浮遊感)
    - **Dark Mode**: `var(--shadow-dark-lg)`
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

**5. アクセシビリティ (A11y)**

**5.1 ARIA & Semantics**

- **Trigger (`<button>`)**:
    - `popovertarget="[popover-id]"` — Popover API のネイティブ制御。
    - `aria-expanded="true|false"` — 開閉状態を通知（Popover API が自動管理）。
    - `aria-describedby="[popover-id]"` — Popover コンテンツとの関連付け。ただし、Popover が非表示時でも参照先が DOM に存在するため、スクリーンリーダーは内容を読み上げ可能です（`hidden` 属性や `display: none` ではなく、`popover` 属性による非表示のため）。
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
    - **Focus Trap 発動条件**: Popover 内に**複数のフォーカス可能要素**（リンク、ボタン等）が存在する場合のみ、Focus Trap を有効化します。
        - **本仕様の場合**: Footer リンク（「脚注一覧で見る」）が常に存在するため、**Focus Trap は常に有効**です。
        - **例外**: 将来的に Footer リンクを省略可能にする場合、フォーカス可能要素が 0 個の Popover では Focus Trap を無効化します。
    - **Trap 実装**: `Tab` キーでのフォーカス移動を Popover 内に閉じ込め、最後の要素から先頭へループします。`Shift + Tab` で逆方向にループ。
    - **Return Focus**: Popover クローズ後、フォーカスは元の Trigger (`<button>`) に戻ります。

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
    - `counter-reset: footnote-counter`
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
        - 実装: Popover の `toggle` イベントで、`event.target` (Trigger) を特定し、CSS クラスを動的に付与/削除します。

#### 順序なしリスト (Unordered List) `<ui-ul>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 順序を持たない並列情報のグループ化。
- **Rhythm**: マーカー（Bullet）はコンテンツを読むリズムを作るための「拍子」であり、主張しすぎてはいけません。本文の色よりも一段階淡く（Low Contrast）することで、テキストへの集中を高めます。
- **Scope**: この定義はUIコンポーネントだけでなく、記事本文 (`.prose ul`) におけるリスト表現の「真実（Source of Truth）」としても機能します。

**2. スタイリングとトークンマッピング (Style & Tokens)**

- **Marker**:
    - **Color**: `var(--fg-muted)`
        - *Rationale*: 本文 (`--fg-default`) との階層差を作り、ノイズを低減します。
    - **Shape**: `disc` (Level 1), `circle` (Level 2), `square` (Level 3)
    - **Position**: `outside` (テキストの左端を揃え、可読性を維持)
    - **Forced Colors**: ハイコントラストモードでは `currentColor` (CanvasText) を継承し、視認性を確保します。
- **Spacing**:
    - Item Gap: `var(--space-2)` (リスト項目間の適切な呼吸)
    - **Marker Gap**: `var(--space-2)` (マーカーとテキストの間の物理的な余白)
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
          /* マーカー幅を固定または最小確保し、本文ラインの微細なガタつきを防ぐ */
          grid-template-columns: var(--space-4) 1fr;
          gap: var(--space-2);
          align-items: baseline; /* マーカーと本文のベースラインを厳密に同期 */
        }
        li::before {
          content: "●"; /* レベルに応じて形状変化 */
          color: var(--fg-muted);
          justify-self: center; /* マーカーを中央揃え */
          /* ... */
        }
        ```
    - **Nested Logic**:
        - 入れ子のリストは親の `1fr` (本文エリア) 内部に配置されるため、**自動的に親の本文開始位置までインデント**されます。これにより、階層ごとのインデントが自然に発生します。
        - **Vertical Rhythm**: ネストされたリストの上部には `var(--space-2)` のマージンを確保し、親テキストとの癒着を防ぎます。

#### 順序付きリスト (Ordered List) `<ui-ol>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 手順やランキングなど、シーケンスが重要な情報の構造化。
- **Quiet Structure**: 順序を示す数字は「コンテンツの一部」であり、アクションボタンではありません。強調色（Primary）の乱用を避け、静謐な佇まいを維持します。
- **Typography Check**: 数字には **`var(--font-mono)`** を採用し、桁が増えても垂直方向のライン（Vertical Rhythm）が崩れないようにします。

**2. スタイリングとトークンマッピング (Style & Tokens)**

- **Marker**:
    - **Font**: `var(--font-mono)`
    - **Feature**: **`font-variant-numeric: tabular-nums`** (等幅数字) を必須とし、桁揃えを保証します。
    - **Color**: **`var(--fg-muted)`**
        - **Rationale**: 数字はコンテンツの一部であり、アクションボタンではないため、PrimaryではなくMutedを採用します。
        - **Variant (Steps)**: チュートリアル等で手順を強調する場合に限り、`variant="steps"` として `var(--primary)` の使用を許可します。
    - **Font Weight**: `var(--font-medium)`
        - **Rationale (Visual Balance)**: 線幅の細い欧文等幅フォント（Mono）を、線幅のしっかりした和文フォント（Sans）と並べた際の視覚的バランス（Visual Weight）を合わせるため適用します。
    - **Forced Colors**: `forced-colors: active` 時は `CanvasText` に追従させます。
- **Counter**: CSS Counters (`counter-reset`, `counter-increment`) を使用します。

**3. 実装詳細 (Implementation Strategy)**

- **Strict Layout (Grid System)**:
    - `<ui-ul>` と同様のGrid戦略を採用しますが、桁数によるレイアウトシフト（Wobble）を排除します。
    - **Accessibility Restoration (Critical)**:
        - `<ui-ul>` と同様、**Parent: `<ol role="list">`**, **Child: `<li role="listitem">`** を必須とします。
    - **Alignment Strategy (Decimal Alignment)**:
        - 1桁("1.")と2桁("10.")で本文の開始位置がズレることを防ぐため、マーカー領域に **`min-width: 3ch`** (約3文字分) の固定幅を与え、**右揃え（Right Align）**で配置します。これにより、ドットと本文の垂直ラインを維持し、美しい構造を作ります。
    - **Structure**:
        ```css
        ol {
          list-style: none;
          counter-reset: list-item;
          padding: 0;
        }
        li {
          display: grid;
          /* 3chの固定幅（2桁まで安全）を確保し、本文位置を固定する */
          grid-template-columns: 3ch 1fr;
          gap: var(--space-2);
          align-items: baseline;
        }
        li::before {
          counter-increment: list-item;
          content: counter(list-item) ".";
          font-family: var(--font-mono);
          justify-self: end; /* 数字を右端（本文側）に寄せる */
          /* ... */
        }
        ```
- **Optical Baseline Adjustment (Cross-Font Sync)**:
    - 和文フォント (`var(--font-sans)`) と欧文等幅フォント (`var(--font-mono)`) の混植において、ベースラインが視覚的にずれて見える場合があります。
    - **Strategy**: 基本的に `align-items: baseline` による自動調整を信頼します。ズレが顕著な組み合わせ（フォント変更時など）に限り、マーカー側に微細な **`transform: translateY()`** (例: `0.05em`) を適用し、「数字の底」と「和文の底」が一直線に見えるよう補正を行うことを許容します。

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
        - **Mobile**: `width: calc(100% + var(--space-8))`, `margin-inline: calc(-1 * var(--space-4))`
            - **Full Bleed**: 画面端まで画像を拡張し、没入感を最大化します。
        - **Desktop**: `width: calc(100% + var(--space-16))`, `margin-inline: calc(-1 * var(--space-8))`
- **Visual Tactics**:
    - **Border**: `1px solid var(--border-ghost)`
        - *Rationale*: 白背景の画像がアプリ背景に溶け込むのを防ぎ、オブジェクトとしての輪郭を保ちます。
    - **Interaction (Zoomable / Thumbnail Only)**:
        - **Scope**: これらの変形エフェクトは**サムネイル（未拡大）状態にのみ**適用します。拡大時に画像が動く（Wobble）ことを防ぎます。
        - Cursor: `zoom-in`
        - Hover: `transform: scale(var(--scale-hover-sm))` (微細な浮き上がり)
        - Active: `transform: scale(var(--scale-pressed))` (押下時の沈み込み)
        - Focus: **Adaptive Focus** (`--animation-focus`) を適用。
    - **Dark Mode Dimming**:
        - ダークモード時は画像の輝度を `filter: brightness(var(--brightness-dimmed))` で減衰させ、周囲の暗さに馴染ませます。
        - ホバー時および拡大（Lightbox）時は `filter: brightness(1)` に戻し、本来の色を表示します。
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
    - サムネイル位置から物理的に拡大するような **Shared Element Transition** 風のアニメーションを採用します (`--duration-slower` + `--ease-out`)。
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
    - ラッパーとしての `<button>` は、意味的な役割のみを果たし、視覚的には「透明」である必要があります。ブラウザ標準スタイル（Border, Padding, Background）を完全にリセットし、`display: block` (または `contents`) として画像のレイアウトに影響を与えないようにします。
    - **Forced Colors Mode**:
        - ハイコントラストモード等の強制カラー環境下でも、ラッパーボタンは視覚的に透明であり続ける必要があります。
        - **Strategy**: `forced-colors: active` においてもボタンの `border` を `none` に、`background` を `transparent` に強制します。画像の境界線は `ui-image` 自身が持つボーダー（システムカラーにマッピングされる）によって表現され、二重線やノイズを防ぎます。
- **State**:
    - `aria-expanded`: `false` (通常時) / `true` (拡大時) を切り替え、展開可能な要素であることを伝えます。
    - `aria-label`: "画像を拡大" (Zoom image) 等のラベルを付与します。
- **Semantic Bonding**:
    - `<figcaption>` に一意のIDを付与し、ボタン（または画像）から `aria-describedby` で参照します。これにより、「画像の名前（Alt）」と「画像の説明（Caption）」が支援技術に対して明確に関連付けられます。
- **Alt Text**: コンテキストに応じた説明を義務付けます。装飾的な画像の場合は空文字 (`alt=""`) とします。
- **Operation**: `Enter` / `Space` で拡大、`Esc` で閉じる動作を保証します。

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
    - **Context: Prose**: テキストコンテナよりも広く表示し、没入感を高めます。
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
            - **Shadow**: `var(--shadow-md)` (映像からの分離を明確化).
            - **Padding**: `var(--space-2) var(--space-4)`.
            - **Content**: `Play/Pause | Volume | Timer | Spacer | Fullscreen`.
            - **Visibility**: 再生中はマウス静止でフェードアウトし、操作時のみ出現させることで没入感を維持します（Paused時は常時表示）。
    - **Seek Bar (Slider)**:
        - `<ui-slider>` (Input-on-Top Overlayパターン) を使用し、ドラッグ可能なつまみ（Thumb）を持つカスタムスライダーを実装します。
        - **Layering Strategy (Contrast Safety)**:
            - **Track (Base)**: `height: 4px`, `radius: var(--radius-full)`, `background: oklch(from var(--white) l c h / 0.25)`.
                - *Rationale*: アプリのLight/Dark設定に関わらず、動画プレイヤーUIは常に**Dark Mode（暗い背景上の白いUI）**として設計します。これにより、夜のシーン（黒）でも明るいシーン（白）でも、Glass Panelの保護と合わせて視認性を数学的に担保します。
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
- **Margin**: `var(--space-6) 0`
    - *Rationale*: 上下に `space-6` (24px) を配置します。物理的な総高は `49px` (24px + 1px Border + 24px) となり、`index.md` が規定する「セクション区切り (`--space-12` = 48px)」から数学的に `1px` 超過しますが、非対称なマージンによる実装の複雑化を避け、**「実装の保守性（Maintainability）」**を優先し、合理的な誤差として許容します。
- **Forced Colors**: `border-color: CanvasText`
    - *Rationale*: 透過色はハイコントラストモードで消失するリスクがあるため、明示的な不透明色（システムカラー）で構造を維持します。

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
            - **Animation**: `max-height` と `opacity` を用いた滑らかなトランジション（`300ms`, `--ease-in-out`）を適用します。
            - **Scroll Anchoring**: 展開によるレイアウトシフトで読み位置を見失わないよう、ブラウザの `overflow-anchor: auto` またはJSによるスクロール位置補正を必須とします。
            - **Warning (Default Disabled)**: 本モードはレイアウトシフト（読み位置のズレ）を伴うため、デフォルトでは**無効**とします。ユーザーが「学習モード（Study Mode）」設定（全体設定またはページメニュー）を明示的に選択した場合にのみ有効化される**例外的な処理**として実装し、通常の読書体験における「Flow State」を保護します。

- **Mode Switching (モード切り替え)**:
    - **Persistence Strategy**:
        - ユーザー設定画面を持たないため、モード選択は **Contextual Toggle（文脈内での切り替え）** として実装し、ブラウザの `localStorage` に即座に保存・永続化します。これにより、次回以降のすべての翻訳操作に選択したモードが適用されます。
        - **Implementation Detail**:
            - **Key Naming**: 名前空間付きの `rouault:translation-mode` を使用し、値は `'lookup'` または `'parallel'` とします。
            - **SSR Hydration Strategy**: Eleventyビルド時には `localStorage` が参照できないため、初期表示のちらつき（FOUC）を防ぐため、**`<head>` 内のブロッキングスクリプトで属性を付与することを必須とします**。
                - *Rationale*: コンテンツの表示遅延は原則1（没入のための構造）に反するため、スクリプトによる属性付与でスタイルを初期化し、即時のレンダリングを保証します。
    - **Toggle Actions**:
        - 以下の操作を行った瞬間、**デフォルトモード設定が反転（Toggle）**し、表示が切り替わります（Lookup ⇔ Parallel）。
        - **Desktop (GUI)**: Popover/Panel 右上のアイコンボタン（`icon: panel-right` ⇔ `icon: message-square`）をクリック。
        - **Mobile (GUI)**: Bottom Sheet ヘッダーの「対訳モードへ切り替え / ポップアップに戻す」リンクをタップ。
        - **Keyboard**: 
            - `Cmd+Shift+T`（グローバルショートカット）
            - `P`（Popover/Panel 表示中のショートカット）
    - **Feedback**: モード切り替え時には `--animation-flash` を適用し、パネルの出現・消失を視覚的に強調します。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `original` | - | `string` | 原文データ。 |
| `translated`| - | `string` | 翻訳文データ。 |
| `lang` | `lang` | `string` | 原文の言語コード（例: `fr`）。 |
| `target-lang` | `target-lang` | `string` | 翻訳先の言語コード。デフォルトは `ja`（日本語）。 |
| `mode` | `mode` | `'popover' \| 'parallel' \| 'interlinear'` | 表示モード（コンテキストにより自動制御）。 |

> **Note (A11y/i18n):** `lang` および `target-lang` プロパティは、スクリーンリーダーの正しい発音や適切なフォントレンダリングを保証するため、原文・翻訳文それぞれのラッパー要素の `lang` 属性としてDOMに出力されなければなりません。
>
> **Structure Example**:
> ```html
> <span class="ui-translation-trigger" lang="fr">Je pense, donc je suis.</span>
> <div class="ui-translation-content" lang="ja">我思う、ゆえに我あり。</div>
> ```

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Trigger (Original Text)**:
    - **Font Family**: 文脈により `--font-serif` (Prose) または `--font-sans` (UI/Tech) を継承。
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
    - **Shadow**: **`--shadow-lg`**
        - *Implementation Note*: `index.md` の設計に従い、Light/Darkでのトークン切り替えはメディアクエリまたは `:host-context` 内でのCSS変数再定義により行います。
    - **Motion**:
        - **Duration**: **`--duration-fast` (70ms)** または **`--duration-normal` (150ms)**
        - **Easing**: **`--ease-out`**
        - *Rationale*: ユーザーの思考速度に同期した、即応性のある展開を実現します。

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
                - **Strip Mode Consideration (Position Awareness)**: 画面幅に余裕がある場合（目安: `>= 1420px` ※ `var(--bp-xl)` + TOC最小幅 `140px`）、TOCを完全に隠蔽するのではなく、`index.md` で定義されている **「Collapsed State Behavior (Strip Mode)」** を適用し、翻訳パネルの右端に幅 `24px` 程度の極細インジケーターバーとして残すことを必須とします。
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
                           toc.style.viewTransitionName = 'none';      // 競合回避
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
    - *Structure*: `<span ... aria-expanded="false" aria-controls="translation-uid-123" aria-details="translation-uid-123">`
    - **Usage Note**: 段落全体などの長文をボタン化 (`role="button"`) すると、スクリーンリーダーの読み上げやナビゲーション挙動が不安定になるリスクがあります。原則として、翻訳機能は**単語や短いフレーズ単位**（推奨：150文字以内）での適用を推奨します。
        - **Dev Feedback**: `connectedCallback` 等で文字数をチェックし、150文字を超過している場合は `console.warn` で開発者に警告を出す実装を推奨します。
- **Content Role**:
    - 翻訳コンテンツのコンテナ（Popover内）には **`role="region"`** と **`aria-label="翻訳"`** (または `Translation`) を付与し、ランドマークとして認識可能にします。
- **Interaction (Keyboard)**:
    - **Focus**: テキスト装飾の変化だけでなく、標準の **Adaptive Focus** (Outline) も適用し、視認性を担保します。
    - **Activation**: `Enter` / `Space` キーで Popover/Bottom Sheet の開閉、または翻訳詳細へのフォーカス移動を行います。
    - **State Management**: 操作時はトリガーの **`aria-expanded`** 属性を動的にトグル（`true` / `false`）し、現在の状態をスクリーンリーダーへ通知します。
- **Mobile Interaction**: Bottom Sheet展開時はフォーカスをシート内にトラップし、背景（Scrim）のタップまたは下方向へのスワイプで即座に閉じる挙動を実装します。

```html
<!-- マークアップ例 -->
<span class="ui-translation-trigger" role="button" tabindex="0" lang="fr"
      aria-expanded="false" aria-controls="translation-uid-123" aria-details="translation-uid-123">
  Je pense, donc je suis.
</span>

<!-- 翻訳コンテンツ（Popover / Bottom Sheet / Interlinear） -->
<div id="translation-uid-123" class="ui-translation-content" hidden
     role="region" aria-label="翻訳" lang="ja">
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
