## コンポーネント

### 基本要素 (Primitives)

#### リンク (Link) `<a>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: テキストコンテキスト内におけるナビゲーションを提供します。「静謐さ」を保つため、デフォルト状態では**下線を淡く（Low Contrast）** 描画し、本文のリズムを乱さないようにします。
- **Dynamic Clarity**: ユーザーがインタラクトした瞬間（Hover/Focus）にのみ、下線のコントラストを最大化し、操作対象としての明確なアフォーダンスを提示します。

**2. 実装戦略 (Implementation Strategy)**

- **Method**: Global Style (CSS)
- **Strategy**:
    - ネイティブの `<a>` タグに対してグローバルスタイル（`main.css`）を適用します。これにより、MarkdownコンテンツとアプリケーションUIの間で一貫した体験を保証します。
    - **SPA Routing**: 個別のリンククリックイベントを処理するのではなく、ドキュメントルートに対する Global Event Delegation を使用してページ遷移をインターセプトし、Router API を呼び出します。

**3. スタイリングとトークンマッピング (Style & Tokens)**

**Base Style (a)**

- `cursor`: `pointer`
- `color`: `--color-primary`
- `text-decoration`: `underline`
- `text-underline-offset`: `3px` (文字のディセンダーとの重なりを防ぐ)
- `text-decoration-thickness`: `1px` (繊細さを維持)
- `transition`: `text-decoration-color var(--duration-normal) var(--ease-out), color var(--duration-normal) var(--ease-out)`

**状態別定義 (State definition)**

| State | Color | Decoration Color | Note |
|-------|-------|------------------|------|
| **Default** | `--color-primary` | `oklch(from var(--color-primary) l c h / 0.4)` | 下線不透明度 **40%**。視覚的ノイズの低減。 |
| **Hover** | `--color-primary-hover` | `--color-primary-hover` | 不透明度 **100%**。明確なフィードバック。 |
| **Focus-Visible** | `--color-primary` | `--color-primary` | グローバルフォーカスリングを表示。 |
| **Visited** | `--color-primary` | `oklch(from var(--color-primary) l c h / 0.4)` | **無効化**: 読書体験の均質化のため、既読色は適用しない。 |

**バリアント (Variants)**

必要に応じてクラスユーティリティで制御します。

- **Subtle** (`.link-subtle`): 本文色に近い色で、リンクであることをさらに目立たなくする場合に使用。

**4. アクセシビリティ (Accessibility)**

- **Focus Indicator**:
    - グローバル定義の `:focus-visible` リングを使用。
    - `outline: var(--focus-ring-width) solid var(--focus-ring-color)`
    - `outline-offset: var(--focus-ring-offset)` (行間 `line-height: 1.75` の範囲内に収め、干渉を防ぐ)
    - `border-radius: var(--radius-sm)` (リングの角を丸め、テキストフローへの親和性を高める)
- **Forced Colors Mode**:
    - `forced-colors: active` 環境下では、`text-decoration-color` の40%不透明度指定がシステムによって無視・上書きされることを許容し（`LinkText` カラーになる）、視認性を最優先します。

#### スキップリンク (Skip Link) `<ui-skip-link>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: キーボードユーザーやスクリーンリーダー利用者が、反復的なナビゲーション（ヘッダーやサイドバー）を飛び越え、メインコンテンツへ即座に到達するための特急レーンです。
- **Harmonious Appearance**: フォーカス時、コンテキスト（ロゴやパンくずリスト）を隠蔽してユーザーを混乱させないよう、独立した「ナビゲーションインジケータ」として中央上部にスライドインします。明確なシステムメッセージとしての外観を持ちます。

**2. 実装要件 (Implementation)**

- **Method**: ページの `<body>` 直下に配置される最初のインタラクティブ要素として実装します。
- **Performance**: ページ内リンクのジャンプによるフォーカスの移動を確実にするため、ターゲット要素（`#main-content` 等）には `tabindex="-1"` を付与し、プログラム的なフォーカス移動を保証します。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `target` | `href` | `string` | スキップ先のIDセレクタ（例: `#main-content`）。 |
| `label` | `label` | `string` | 表示ラベル。デフォルト: "メインコンテンツへスキップ"。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Default State**:
    - `transform: translateY(-100%)` 等を用いた視覚外への待避（A11yツリーには残す）。
    - `opacity: 0`
- **Focus (`:focus`) State**:
    - **Position**: `fixed`, `top: var(--space-4)`, `left: 50%`, `transform: translateX(-50%)`
    - **Z-Index**: `var(--z-skip-link)` (1000)
    - **Appearance**:
        - Background: `var(--color-foreground)` (反転色による最大コントラスト)
        - Color: `var(--color-background)`
        - Font: `var(--font-medium)`, `var(--text-sm)`
        - Border: `var(--border-width) solid var(--border-subtle)`
        - Padding: `var(--space-2) var(--space-4)`
        - Radius: `var(--radius-full)` (ピル形状でナビゲーションであることを示唆)
        - Shadow: `var(--shadow-lg)`
    - **Motion**:
        - `transition`: `transform var(--duration-fast) var(--ease-out), opacity var(--duration-fast) var(--ease-out)`
        - 出現時に「パッ」と点滅させず、高速なスライドインで視線を引きつける（Micro-interaction）。

**5. アクセシビリティ (A11y)**

- **First Tab Stop**: ページ読み込み後、最初の `Tab` キー押下で必ずこのリンクにフォーカスが当たる構造を維持します。

#### ボタン (Button) `<ui-button>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: アクションの優先度を視覚的な「重さ（Weight）」で制御します。「静謐さ」を保つため、画面内に **Primary（塗りつぶし）ボタンは原則1つのみ** とし、残りは Secondary または Ghost を使用することで視覚的ノイズを極限まで抑制します。
- **触感 (Tactility)**: 「押した」という物理的な変形（`translate`）は行わず、色と輝度の変化のみで即座に（Snappiness）応答します。これはツールが思考の延長にあることを示すためです。
- **コンパクト設計**: コンテンツ閲覧に特化したWebアプリケーションとして情報密度を重視し、タッチ操作を前提とした過度な余白を排除します。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: `@lion/ui` の `LionButton`
- **Porting Strategy**:
    - `LionButton` の堅牢なステート管理（Active/Focus）と、`click` イベントの正規化ロジックを参照し、`src/lib/ui-core/button` にポーティングします。
    - **Form Association**: 標準のWeb Components機能 (`static formAssociated = true`) と `ElementInternals` APIを使用し、`<form>` 内での Enter キー送信やバリデーション連携をネイティブ同様に動作させます。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 (Reflect) | 型/値 | 説明 |
|------------|----------------|-------|------|
| `variant` | `variant` | `'primary' \| 'secondary' \| 'outline' \| 'ghost' \| 'danger'` | 視覚的強度を決定するバリアント。 |
| `size` | `size` | `'sm' \| 'md' \| 'lg'` | ボタンのサイズ。デフォルトは `md` (32px)。 |
| `icon-only`| `icon-only` | `boolean` | アイコンのみのボタン。正方形（1:1）の形状を強制する。 |
| `loading` | `loading` | `boolean` | 処理中状態。ラベルを透明化し、中央にスピナーを表示する。操作はブロックされる。 |
| `disabled` | `disabled` | `boolean` | 不活性状態。スタイルは薄くなり、ポインターイベントを除去。 |
| `type` | `type` | `'button' \| 'submit' \| 'reset'` | フォーム内での挙動制御。デフォルトは `button`。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

**:host (Base)**
コンポーネントスタイルは全て `:root` トークンにマップされ、ハードコードを禁止します。

- `display`: `inline-flex`
- `align-items`: `center`
- `justify-content`: `center`
- `border-radius`: `--radius-md` (6px - コンパクトさを優先)
- `font-family`: `--font-sans`
- `font-weight`: `var(--font-medium)`（500）
- `transition`: `all var(--duration-fast) var(--ease-out)` (70ms - 即応性)

**サイズ定義 (Density Settings)**

| Size | Height | Padding-X | Icon-Only Width | Font Size | Icon Size |
|------|--------|-----------|-----------------|-----------|-----------|
| `sm` | `--control-height-sm` (24px) | `--space-2` (8px) | `var(--control-height-sm)` | `--text-xs` (12px) | `--icon-sm` (14px) |
| `md` | `--control-height-md` (32px) | `--space-3` (12px) | `var(--control-height-md)` | `--text-sm` (13px) | `--icon-base` (16px) |
| `lg` | `--control-height-lg` (40px) | `--space-4` (16px) | `var(--control-height-lg)` | `--text-base` (14px) | `--icon-md` (20px) |

> **Note**: 一般的なWebサイト（40px基準）よりも一段階小さい「高密度UI」を採用します。

**バリアント定義 (マッピング)**

| Variant | Background | Border | Text Color | Hover Action |
|---------|------------|--------|------------|--------------|
| **Primary** | `--color-primary` | None | `--color-on-primary` | `oklch(from var(--color-primary) calc(l + 0.05) c h)` (明度増) |
| **Secondary** | `--bg-surface-2` | None | `--color-foreground` | `--bg-surface-3` |
| **Outline** | `transparent` | `--color-border` | `--color-foreground` | `border-color: var(--color-foreground-muted)` |
| **Ghost** | `transparent` | None | `--color-foreground-subtle` | `background: var(--color-background-subtle)` |
| **Danger** | `--color-danger-bg` | `--color-danger-border` | `--color-danger` | `background: var(--color-danger); color: white` |

**5. アクセシビリティとキーボード操作 (A11y & Interaction)**

- **Target Size (Touch)**:
    - 視覚的には `32px` ですが、タッチデバイスやポインティング精度が必要な環境のため、CSS疑似要素 (`::after`) を使用して **最低 44x44px のクリック領域** を確保します。
- **Element Internals**:
    - `ElementInternals` API を通じて、アクセシビリティツリーへの情報提供とフォーム参加を実現します。
- **Keyboard Support**:
    - `Enter` / `Space`: アクション実行（`click` イベント発火 / Form Submit）
- **Focus Indicator**:
    - グローバル定義の `:focus-visible` リングを使用。
    - `outline: var(--focus-ring-width) solid var(--focus-ring-color)`
    - `outline-offset: var(--focus-ring-offset)` (コンポーネントと分離することで視認性を確保)
- **Loading State**:
    - 視覚的にはラベルが消えスピナーが出るが、DOM上のテキストは保持する。
    - `aria-busy="true"` を付与し、支援技術に処理中であることを伝える。

#### フォーム入力 (Input) `<ui-input>` / `<ui-textarea>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 思考を妨げない「透明な」入力インターフェースを提供します。枠線や背景色は、入力待機時（Default）には存在感を消し、フォーカス時（Active）には明確なガイドとして機能します。
- **Contextual Feedback**: バリデーションエラーやヘルプテキストは、視線の移動を最小限に抑えるため、入力フィールドに近接して表示します。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: `@lion/ui` の `LionInput` / `LionTextarea` (継承元: `LionField`)
- **Porting Strategy**:
    - `LionField` が持つ強力なアクセシビリティ連携（LabelとInputのID紐付け、Description紐付け）のロジックを借用します。
    - **DOM構造の簡素化**: Lion UIのデフォルトDOM（Light DOMへの依存が高い構造）は採用せず、`Shadow DOM` 内で完結した `<input>` / `<textarea>` レンダリングを行い、スタイルカプセル化を徹底します。

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
- `gap`: `--space-1` (4px - ラベルと入力の近接性)

**Input Element (Control)**

| State | Border | Background | Text Color | Note |
|-------|--------|------------|------------|------|
| **Default** | `var(--border-width) solid var(--color-border)` | `var(--color-background)` | `--color-foreground` | 極めてシンプルに。 |
| **Hover** | `var(--border-width) solid var(--color-border-hover)` | `var(--color-background)` | `--color-foreground` | 境界線を少し濃くしてインタラクティブ性を示唆。 |
| **Focus** | `var(--border-width) solid var(--color-primary)` | `var(--color-background)` | `--color-foreground` | グローバル標準のフォーカスリングも併用（後述）。 |
| **Error** | `var(--border-width) solid var(--color-danger)` | `var(--color-danger-bg-subtle)` | `--color-foreground` | 背景色も淡く変化させ、色覚多様性に配慮。 |
| **Disabled**| `var(--border-width) solid var(--color-border-subtle)` | `var(--color-background-subtle)`| `--color-subtle` | 操作不可を明確化。 |

- **Width**: `100%` (親コンテナの幅に追従)
- **Height**: `--control-height-md` (32px)
- **Padding-X**: `--space-2` (8px)
- **Radius**: `--radius-md` (6px)
- **Font**: `--text-sm` (13px)

**5. アクセシビリティとキーボード操作 (A11y & Interaction)**

- **Label Association**:
    - Shadow DOM内の `<input>` に対し、外部またはスロット内のラベルが正しく `aria-labelledby` で紐づくことを保証します（`ElementInternals` または ID参照を使用）。
- **Focus Indicator**:
    - 入力フィールド自体の `border-color` 変化に加え、**:focus-visible 時にはグローバルなフォーカスリング（アウトライン）を追加** します。
    - `outline: var(--focus-ring-width) solid var(--focus-ring-color)`
    - `outline-offset: 1px` (ボーダーと重ならないよう配置)
- **Error Messaging**:
    - エラー発生時は `aria-invalid="true"` を設定し、エラーメッセージ要素を `aria-describedby` に追加してスクリーンリーダーに通知します。

#### セレクトボックス (Select) `<ui-select>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: ユーザーが既定の選択肢から「値を選ぶ」ためのコンポーネントです。
- **Consistency**: トリガー（閉じた状態）の見た目はテキスト入力(`<ui-input>`)と完全に一致させ、フォーム全体の一貫性を保ちます。
- **Native Polish**: 一般的なOSのドロップダウン挙動（選択肢のホバー、キーボード移動）を模倣しつつ、プラットフォームに依存しない洗練されたスタイルを提供します。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: `@lion/ui` の `LionSelectRich`
- **Porting Strategy**:
    - `LionListbox` のキーボードナビゲーションロジック（`ArrowUp`/`ArrowDown` での選択、`Home`/`End`、Type-ahead search）をポーティングします。
    - **DOM構造**: トリガー部分と、ポータル（Overlay）で描画されるリストボックス部分を明確に分離し、z-index 戦略と統合します。

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
`<ui-input>` と共有のスタイル定義（Border, Background, Radius, Height）を使用し、右端に `ChevronDown` アイコン（`--icon-md`）を配置します。

**Listbox (Overlay)**

| Property | Value | Note |
|----------|-------|------|
| **Z-Index**| `--z-dropdown` (200) | 他のUIの上に配置。 |
| **Background** | `var(--bg-surface-2)` | わずかに浮いた背景色（Elevation）。 |
| **Border** | `var(--border-width) solid var(--color-border-subtle)` | 境界線を明確化。 |
| **Shadow** | `--shadow-lg` | 浮遊感の強調。 |
| **Radius** | `--radius-md` | トリガーと同じR値。 |
| **Max Height** | `300px` | 長すぎる場合は内部スクロール（`overflow-y: auto`）。 |

**Option Item**

- **State**:
    - `:hover` / `.active`: `background: var(--surface-active)`
    - `[selected]`: `color: var(--color-primary); font-weight: var(--font-medium)`

**5. アクセシビリティとキーボード操作 (A11y & Interaction)**

- **Attributes**:
    - Trigger: `role="combobox"`, `aria-haspopup="listbox"`, `aria-expanded="true/false"`
    - List: `role="listbox"`
    - Option: `role="option"`, `aria-selected="true/false"`
- **Interaction**:
    - リストが開いている間はフォーカスをリストボックス内にトラップ、または管理します。
    - `Escape` で閉じてトリガーにフォーカスを戻します。

#### ドロップダウンメニュー (Dropdown Menu) `<ui-dropdown>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 値の入力ではなく、「アクション（操作）」や「ナビゲーション」の選択肢を提示するために使用します。
- **Ephemeral UI**: ユーザーが必要とした瞬間にのみ出現し、用が済めば即座に消える「儚い」UIです。常時表示する情報量（ノイズ）を減らすための主要な手段です。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: `@lion/ui` の `Overlay System` (`OverlayController` / `withDropdownConfig`)
- **Porting Strategy**:
    - **Popper.js / Floating UI**: 位置計算には信頼性の高いライブラリ（またはLionのポジショニングロジック）を使用し、画面端での折り返しや追従を保証します。
    - **Click Outside**: メニュー外をクリックした際に閉じる挙動を実装します。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `opened` | `opened` | `boolean` | 開閉状態。 |
| `align` | `align` | `'start' \| 'end' \| 'center'` | トリガーに対する配置基準位置。 |
| `preferred-position` | `preferred-position` | `'top' \| 'bottom' \| 'left' \| 'right'` | 出現方向の優先順位。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

**Panel (Container)**

- `min-width`: `180px` (アクション名の可読性確保)
- `padding`: `--space-1` (4px - 端まで選択範囲を広げない)
- `background`: `var(--bg-surface-2)`
- `border`: `var(--border-width) solid var(--color-border-subtle)`
- `border-radius`: `--radius-md`
- `box-shadow`: `--shadow-lg`

**Menu Item**

- `display`: `flex`
- `align-items`: `center`
- `gap`: `--space-2` (アイコンとテキストの間隔)
- `padding`: `--space-2` `--space-3`
- `border-radius`: `--radius-sm` (親コンテナの内側のR)
- **Hover**: `background: var(--surface-active)`
- **Destructive**: `.variant-danger` クラスで文字色を `--color-danger` に変更。

**5. アクセシビリティとキーボード操作 (A11y & Interaction)**

- **Roles**:
    - Trigger: `aria-haspopup="menu"`, `aria-expanded`
    - Menu: `role="menu"`
    - Item: `role="menuitem"`
- **Focus Management**:
    - メニューが開いた時、最初の項目（または前回選択した項目）にフォーカスを移動します。
    - `Tab` キーはメニューを閉じ、トリガーの次の要素へフォーカスを移動させます（Roving Tabindex パターン）。
    - `ArrowUp` / `ArrowDown`: 項目間の循環移動。

#### チェックボックス / ラジオ (Checkbox & Radio) `<ui-checkbox>` / `<ui-radio>`

**1. デザイン哲学 (Design Philosophy)**

- **Clarity**: 選択状態（ON/OFF）を一目で識別可能にし、ラベルとの関連性を明確にします。
- **Tactility**: 「カチッ」というデジタルなスイッチング感覚を、短いアニメーションで表現します。

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

**4. スタイリング (Style)**

- **Control Size**: `16px` (text-smに合わせる)
- **Checkbox**:
    - Radius: `--radius-sm` (4px)
    - Checked: `background: var(--color-primary)`, `icon: Check (white)`
- **Radio**:
    - Radius: `--radius-full`
    - Checked: `border: var(--dot-size) solid var(--color-primary)` (Dot表現、--dot-sizeはローカル変数で5pxを表す)

**5. アクセシビリティとキーボード操作 (A11y & Interaction)**

- **Label Activation**: テキストラベル部分のクリックでもチェック状態が切り替わることを、`<label>` 要素または Shadow DOM 内での ID 紐付けにより保証します。
- **Keyboard Support**:
    - Checkbox: `Space` でトグル。
    - Radio: `Arrow Keys` (上下左右) で同一グループ（`name`属性）内の選択肢を移動・選択。
- **Focus Indicator**: グローバルなフォーカスリング (`:focus-visible`) を適用します。

#### トグルスイッチ (Toggle Switch) `<ui-switch>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 設定の「即時反映」を表すメタファーです。保存ボタンを必要としない、システムの状態変更に使用します。
- **Tactility**: ON/OFF の切り替え時にスライドと色の変化を伴うアニメーションを行い、操作の実感（Snappiness）を提供します。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: `@lion/ui` の `LionSwitch` (継承元: `LionField`)
- **Porting**: ブラウザ標準のCheckboxを隠蔽し、`role="switch"` を持つカスタム要素として実装します。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `checked` | `checked` | `boolean` | ON/OFF 状態。 |
| `label` | `label` | `string` | スイッチのラベル。 |
| `disabled` | `disabled` | `boolean` | 操作無効化。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Track (Base)**:
    - Size: `width: 36px`, `height: 20px`
    - Radius: `--radius-full` (999px)
    - Color (OFF): `var(--bg-surface-3)`
    - Color (ON): `var(--color-primary)`
    - Transition: `background-color var(--duration-fast)`
- **Thumb (Knob)**:
    - Size: `16px` × `16px`
    - Color: `white`
    - Shadow: `--shadow-sm`
    - Position (OFF): `translate(2px, 2px)`
    - Position (ON): `translate(18px, 2px)`
- **Animation**: `--ease-spring` (Overdamped) を使用し、物理的なスイッチの挙動を模倣しすぎず、小気味よく動作させます。

**5. アクセシビリティとキーボード操作 (A11y & Interaction)**

- **Role**: `role="switch"` を使用し、`aria-checked` で状態を通知します。
- **Keyboard**:
    - `Space`: トグル操作。
    - `Enter`: （フォーム内であっても）サブミットせず、トグルのみを行うのが一般的。

#### スライダー (Slider) `<ui-slider>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 音量やサイズなど、連続的な値や「強度」の調整に使用します。正確な数値入力よりも、直感的な「多寡」の操作を優先します。
- **Tactility**: つまみ（Thumb）の操作に対し、滑らかかつ即座に追従することで、物理的な操作感（Analog Feel）を提供します。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: `@lion/ui` の `LionInputRange` または Native `<input type="range">`
- **Porting**: ブラウザごとのスタイルの差異（特にWebkitとFirefox）を吸収し、統一された外観を提供するためのラッパー、およびトラックの「塗り（Fill）」の計算ロジックを実装します。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `min` | `min` | `number` | 最小値。 |
| `max` | `max` | `number` | 最大値。 |
| `step` | `step` | `number` | 増減の刻み幅。 |
| `value` | `value` | `number` | 現在の値。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Track (Base)**:
    - Height: `4px`
    - Background: `var(--color-border-subtle)`
    - Radius: `--radius-full`
- **Fill (Active)**:
    - Background: `var(--color-primary)`
    - Logic: `background-size` と `linear-gradient` を動的に組み合わせて、左側（完了部分）のみを着色します。
- **Thumb (Knob)**:
    - Size: `16px` × `16px`
    - Background: `white`
    - Border: `var(--border-width) solid var(--color-border)`
    - Shadow: `--shadow-sm`
    - Hover: 拡大 (`transform: scale(1.1)`) し、操作可能であることを強く示唆。

**5. アクセシビリティ (A11y)**

- **Keyboard**:
    - `Right` / `Up`: 値を増加。
    - `Left` / `Down`: 値を減少。
- **Labeling**: スライダーが何を調整するものか、`aria-label` または `label` 要素で確実に伝えます。

#### 検索ボックス (Search Box) `<ui-search>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: コンテンツ探索の起点となる重要な入力フィールドです。
- **Affordance**: 虫眼鏡アイコンを常時表示し、単なるテキスト入力ではなく「探す」ための機能であることを強く示唆します。

**2. ロジック参照基盤 (Logic Reference)**

- **Base**: `<ui-input>` の拡張バリアントとして実装しますが、`type="search"` 特有のブラウザ標準の装飾（×ボタンなど）は `appearance: none` で無効化し、自前で制御します。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `value` | `value` | `string` | 検索クエリ。 |
| `placeholder`| `placeholder`| `string` | デフォルト: "Search..." |
| `loading` | `loading` | `boolean` | 検索実行中のスピナー表示。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Container**:
    - Height: `--control-height-md` (32px) または `lg` (40px)
    - Icon (Left): `Search` icon (`color: var(--color-foreground-muted)`)
- **Action (Right)**:
    - **Clear Button**: 入力値がある場合のみ出現する「×」アイコンボタン。クリックで値をクリアしフォーカスを維持。
    - **Shortcut Hint**: フォーカスされていない時、右端に `⌘K` (Mac) / `Ctrl+K` (Win) のバッジを表示。
        - Style: `border: 1px solid var(--color-border-subtle)`, `radius: --radius-sm`, `font-size: --text-2xs`.

**5. アクセシビリティ (A11y)**

- **Role**: `role="searchbox"` (または `input type="search"`).
- **Labeling**: 視覚的なラベルがない場合が多いため、`aria-label="Search content"` 等の付与を必須とします。

#### テキストエリア (Textarea) `<ui-textarea>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 複数行のテキスト入力（メモ本文、説明文）。
- **Flexibility**: ユーザーの入力量に合わせて快適な領域を提供しますが、レイアウトを破壊しないよう制御します。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: `@lion/ui` の `LionTextarea`
- **Auto Grow**: コンテンツ量に応じて高さが自動的に伸びる機能（Auto Grow）を標準でサポートすることを検討します（UX向上）。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `rows` | `rows` | `number` | 初期表示行数。デフォルト: `3`。 |
| `max-rows` | `max-rows` | `number` | 自動伸長時の最大行数。これを超えるとスクロールバーが出現。 |
| `resize` | `style` | `'none' \| 'vertical'` | リサイズ許可方向。水平リサイズは禁止。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Base Style**: `<ui-input>` と共通のボーダー、背景、フォーカスリングを使用。
- **Typography**: `--text-base`, `line-height: --line-height-normal`.
- **Min Height**: `80px` (または `calc(var(--line-height-normal) * 3 + padding)`).
- **Scroll**: 長文入力時は `overflow-y: auto`。スクロールバーは細く目立たないスタイル（Custom Scrollbar）を適用。

**5. アクセシビリティ (A11y)**

- **Labeling**: `<ui-input>` 同様、`LionField` のロジックにより `label` 要素と ID 連携を行います。

#### タグ (Tag) `<ui-tag>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: コンテンツのメタデータやカテゴリーを表現します。「静謐さ」を最優先し、デフォルトでは彩度を抑えた **Subtle Style** を採用します。主張しすぎず、しかし識別可能であることを目指します。
- **Compactness**: 行内やカード内に収まる高密度な設計（High Density）とし、スペースを浪費しません。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: Pure UI Component
- **Strategy**:
    - 複雑なロジックは持たず、表示に特化します。削除可能なタグ（Removable）の場合は、内部に「閉じるボタン」を持ち、クリックイベントをディスパッチします。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `variant` | `variant` | `'default' \| 'outline' \| 'solid'` | 通常は `default` (Subtle)。`solid` は重要なステータスのみ。 |
| `size` | `size` | `'sm' \| 'md'` | `sm`: 20px, `md`: 24px (標準) |
| `color` | `color` | `'gray' \| 'blue' \| 'amber' ...` | 意味的カラー。OKLCH補正されたパレットを使用。 |
| `removable` | `removable` | `boolean` | 削除用「×」ボタンを表示するか。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Height**: `--control-height-sm` (24px)
- **Padding**: `0 var(--space-2)`
- **Radius**: `--radius-md` (6px - ボタンと統一)
- **Font**: `--text-xs` (12px), `var(--font-medium)`
- **Background**:
    - Default: `var(--bg-surface-2)` (または各色相のSubtle背景)
- **Hover**:
    - Default: 内側に **1pxのボーダー** (`var(--border-width)`) が出現し、輪郭を強調。背景色は変更せず「浮き上がり」を抑制する。

**5. アクセシビリティ (A11y)**

- **Interactive**: `removable` または `clickable` な場合、`role="button"` を付与し、フォーカス可能にします。
- **Contrast**: テキスト色は背景色に対して十分なコントラスト（4.5:1以上）を確保する自動計算されたトークンを使用します。

#### バッジ (Badge) `<ui-badge>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: UIの一部として、数値（件数）やステータス（New, Draft）などの「状態」を補足します。タグが「分類」を表すのに対し、バッジはよりシステム的な「通知」の意味合いを持ちます。
- **Urgency**: 視覚的なサイズは最小限ですが、色や形状（円形）によってユーザーの注意を引きます。

**2. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `variant` | `variant` | `'count' \| 'dot' \| 'status'` | 形状と役割。 |
| `count` | `count` | `number` | 表示する数値。一定以上は `99+` 等に省略。 |
| `color` | `color` | `'danger' \| 'primary' \| 'neutral'` | 意味的カラー。 |

**3. スタイリングとトークンマッピング (Style & Tokens)**

- **Base**:
    - Font: `--text-2xs` (10px or 11px), `font-weight: var(--font-bold)`
    - Height: `16px` (極小)
    - Padding: `0 4px` (数字の場合)
- **Variants**:
    - **Count**: `radius: --radius-full`, `min-width: 16px` (正円またはカプセル型)。
    - **Dot**: `width: 8px`, `height: 8px`, テキストなし。更新があることを示す。
    - **Status**: テキストを含むバッジ。`radius: --radius-sm`。

**4. アクセシビリティ (A11y)**

- **Labeling**: DOM上は単なる数字であっても、`aria-label="5 unread items"` のように文脈を含めたラベルを提供します。


#### パンくずリスト (Breadcrumbs) `<ui-breadcrumbs>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 現在位置のコンテキストを提供します。主要なナビゲーションではないため、視覚的階層は低く設定（Recede）し、ユーザーが必要として意識した時だけ認識できるようにします。
- **Wayfinding**: 階層が深い場合でも、「戻る」ための足跡を確実に残します。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: WAI-ARIA Breadcrumb Pattern
- **Logic**:
    - ネイティブの `<nav>` と `<ol>` 構造を使用。
    - **Collapsing Strategy**: 項目数が5つを超える場合、最初と最後、および現在地周辺を残し、中間を省略します。
        - **Ellipsis Button**: 省略部分は `MoreHorizontal` アイコンを持つ **Ghost Variant (Icon Only) ボタン** (`<ui-button variant="ghost" icon-only>`) に置換します。
        - **Interaction**: ボタンをクリックすると、省略されていたパスが **Dropdown Menu** として展開され、深い階層へのダイレクトアクセスを提供します（単なる展開ではなく、ナビゲーションのショートカットとして機能させます）。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 説明 |
|------------|------|
| `items` | `{ label: string, href: string }[]` の配列データ。 |
| `max-items` | 表示する最大項目数。デフォルト `4`。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Separator**: `›` (Chevron)。`color: var(--color-foreground-muted)`。
- **Item**:
    - Default: `color: var(--color-foreground-subtle)`
    - Hover: `color: var(--color-foreground)`
    - Current (Last Item): `color: var(--color-foreground)`, `font-weight: var(--font-medium)`

**5. アクセシビリティ (A11y)**

- **Structure**: `<nav aria-label="Breadcrumb">` > `<ol>` > `<li>` > `<a>`
- **Current Page**: 現在のページ（最後の項目）には `aria-current="page"` を付与し、リンクは無効化（またはリンクなし）にします。

#### ツリーアイテム (Tree Item) `<ui-tree-item>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 階層化された情報を探索するためのナビゲーション・コンポーネントです。
- **Dynamic Clarity**: 常時表示されるツリー線（ガイドライン）は視覚的ノイズとなるため排除します。代わりに、**マウスホバー時のみインデントガイドを表示** することで、必要な瞬間にだけ構造を可視化します。
- **Snappiness**: 展開/収縮のアニメーションは極めて高速（`--duration-fast`）に行い、思考を中断させません。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: WAI-ARIA Tree View Pattern
- **Implementation**:
    - 再帰的構造ではなく、フラットなDOM構造（Virtual/Flat List）を基本とし、`aria-level` で階層を表現するアプローチも検討しますが、小規模ならネスト構造でも可とします。
    - **Selection**: シングルセレクト、マルチセレクトのロジック。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `expanded` | `expanded` | `boolean` | 子要素の展開状態。 |
| `selected` | `selected` | `boolean` | 現在選択されているか（カレント）。 |
| `level` | `level` | `number` | 階層の深さ（インデント計算用）。 |
| `label` | `label` | `string` | 表示ラベル。 |
| `icon` | `icon` | `string` | コンテンツアイコン（フォルダ/ファイル）。 |
| `expand-icon`| - | Internal | 展開用 `ChevronRight` アイコン。**視線移動を最小化するため、必ず左端（ラベルの前）に配置する。** |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Item Row**:
    - Height: `--control-height-sm` (24px) 〜 `md` (32px)
    - Full Width Hover: ホバー時の背景色は親コンテナの幅いっぱいに広がる。
    - Padding Left: `calc(var(--level) * var(--space-4))`
- **State Colors**:
    - Default: `color: var(--color-foreground-subtle)`
    - Hover: `background: var(--bg-surface-active); color: var(--color-foreground)`
    - Selected: `background: var(--bg-surface-active); color: var(--color-primary); font-weight: var(--font-medium)`
- **Indent Guide (Dynamic Logic)**:
    - `:host(:hover) .indent-guide` で `opacity: 1` に変化。
    - Guide Position: `calc(var(--level) * var(--space-4) - var(--space-2))`

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
- **Auto Scroll**: アクティブな項目が可視領域外にある場合、`scrollIntoView({ behavior: 'instant', block: 'center' })` (アニメーションなし) で即座にスクロール位置を調整します。ロード時の不要な視覚移動（ノイズ）を排除するためです。

#### ファイルツリー (File Tree) `<ui-file-tree>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 複数の `Tree Item` を包含し、プロジェクトやディレクトリの構造全体を表現するためのコンテナです。
- **Containment**: 構造体としての境界を明確にしますが、中身のコンテンツ（Tree Item）が主役であるため、枠線や背景は控えめに設定します。

**2. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `items` | - | `TreeNode[]` | ツリー構造を表す再帰的なデータオブジェクト。 |

**3. スタイリングとトークンマッピング (Style & Tokens)**

- **Container**:
    - Border: `var(--border-width) solid var(--color-border-subtle)`
    - Radius: `--radius-md`
    - Background: `var(--bg-surface-1)` (ベースレイヤーより一段階上、または透過)
    - Padding: `--space-2` 0
- **Overflow**:
    - コンテンツが横幅を超える場合、コンテナ内での横スクロールを許可するか、省略記号を使用するかを選択可能にします（デフォルトはスクロール推奨）。

**4. アクセシビリティ (A11y)**

- **Role**: `role="tree"` をルート要素に付与します。
- **Labeling**: `aria-label` で「Project Files」などツリーの内容を説明します。

### データ表示 (Data Display)

#### リストビュー (List View) `<ui-list>` / `<ui-list-item>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: ユーザーがアイテムを探索・操作するための主要なインターフェースです。
- **High Density**: 一覧性を高めるため、装飾的なカードスタイルではなく、情報は最小限の高さの「行」に凝縮します（Linear Style）。
- **Keyboard First**: キーボードのみで高速に閲覧・操作できることを前提とします。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: `@lion/ui` の `LionListbox` (Navigation pattern)
- **Porting Strategy**:
    - **Virtualization**: 将来的な大量データに対応するため、可能であれば仮想スクロール（Virtualizer）の使用を考慮したDOM構造とスタイルを採用します。
    - **Active Item**: 「フォーカス（現在の操作対象）」と「選択（Selection）」を区別します。矢印キーでアクティブ行を移動し、Space/Enterで選択します。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `items` | - | `Array` | データ配列。 |
| `selected` | `selected` | `boolean` | 現在選択されているか。 |
| `href` | `href` | `string` | クリック時の遷移先（`<a>`として機能）。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Item Height**: `--control-height-lg` (40px)
- **Padding**: `0 var(--space-4)`
- **Border**:
    - Default: `border-bottom: 1px solid var(--color-border-subtle)` (区切り線のみ)
    - Last Child: `border-bottom: none`
- **State Colors**:
    - Default: `background: transparent`
    - Hover: `background: var(--color-background-subtle)`。右端にアクションボタンが出現。
    - Active (Keyboard Focus): `background: var(--surface-active)`。左端に `swictchAccent` カラーのボーダーを表示（`box-shadow: inset 3px 0 0 var(--color-primary)`）。

**5. アクセシビリティとキーボード操作 (A11y & Interaction)**

- **Roles**: `role="list"`, `role="listitem"` (または `grid`/`row` for multi-column)
- **Keyboard Shortcuts**:
    - `Enter`: 詳細ページへ遷移
    - `Space`: プレビューパネルを開く (Side View)
    - `ArrowUp` / `ArrowDown`: 前後の項目へ移動
    - `Right Click`: コンテキストメニューを表示

#### 目次 (Table of Contents) `<ui-toc>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 長文コンテンツの構造を可視化し、ランダムアクセスを可能にします。
- **Context Awareness**: 現在読んでいるセクションをリアルタイムで追従（Highlight）し、ユーザーの「現在地」を常に明示します。
- **Unobtrusive**: 本文を読む邪魔にならないよう、視覚的な重みは極限まで下げ（Low Contrast）、サイドバーに静かに配置します。アクティブな項目のみが色を持ちます。

**2. ロジック参照基盤 (Logic Reference)**

- **Strategy**:
    - `IntersectionObserver` を使用して、ビューポート内の `h1`〜`h3` 要素を監視し、最も適切なアクティブヘッダーを特定します。
    - **Throttling**: スクロールイベントの過度な発火を避け、パフォーマンスを維持します。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `headers` | - | `Heading[]` | 見出しデータの配列 `{ id, text, level }`。 |
| `active-id`| `active-id` | `string` | 現在アクティブな見出しのID。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Container**: `position: sticky`, `top: 100px`, `width: 200px`
- **Item**:
    - Typography: `--text-xs` (12px)
    - Color (Default): `--color-foreground-muted`
    - Color (Active): `--color-primary`
    - Border Left: `2px solid transparent` (Active時は `var(--color-primary)`)
    - Padding Left: `calc(var(--level) * var(--space-2))` (階層インデント)

**5. アクセシビリティ (A11y)**

- **Role**: `nav` 要素を使用し、`aria-label="Table of Contents"` を付与。
- **Current**: アクティブなリンクに `aria-current="true"` を設定。

#### テーブル (Table) `<ui-table>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 構造化されたデータを比較・閲覧するためのビューです。
- **Clarification**: 罫線は「行 (Row)」の区切り（横線）のみとし、縦線は排除して視線の水平移動（Scanning）を助けます。データそのものを主役にし、枠線というノイズを減らします。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: Native `<table>` structure
- **Wrapper**: 横スクロールが必要な場合のために、ラッパー要素 `<div class="table-container">` で囲みます。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `density` | `density` | `'compact' \| 'normal'` | 行の高さ密度。 |
| `striped` | `striped` | `boolean` | 縞模様（ゼブラストライプ）を適用するか。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Header (`th`)**:
    - Font: `--text-xs`, `font-weight: var(--font-medium)`
    - Color: `--color-foreground-muted`
    - Border: `2px solid var(--color-border)` (ヘッダーとボディの明確な区分)
- **Cell (`td`)**:
    - Padding: `--space-3` `--space-4`
    - Vertical Align: `top` (長文折り返し時の可読性確保)
- **Row (`tr`)**:
    - Border: `var(--border-width) solid var(--color-border-subtle)`

**5. アクセシビリティ (A11y)**

- **Caption**: `<caption>` 要素でテーブルのタイトルを提供。
- **Scope**: `th` に `scope="col"` または `scope="row"` を明示。

#### カード (Card) `<ui-card>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 関連する情報をグルーピングし、一つのまとまりとして提示します。
- **Containment**: 境界線または背景色によって領域を定義しますが、過度な装飾（強い影など）は避け、コンテンツをフラットに整理します。

**2. ロジック参照基盤 (Logic Reference)**

- **Structure**: Slotベースのコンポーネント。`<slot name="header">`, `<slot>`, `<slot name="footer">` を持ちます。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `variant` | `variant` | `'outlined' \| 'elevated' \| 'flat'` | 外観スタイル。デフォルトは `outlined`。 |
| `clickable`| `clickable`| `boolean` | カード全体をクリック可能にするか。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Base**: `display: flex`, `flex-direction: column`
- **Radius**: `--radius-md` (8px)
- **Padding**: `--space-4` または `--space-6`
- **Variants**:
    - **Outlined**: `border: var(--border-width) solid var(--color-border-subtle)`
    - **Elevated**: `background: var(--bg-surface-1)`, `box-shadow: var(--shadow-sm)`

**5. アクセシビリティ (A11y)**

- **Role**: 独立した記事なら `article`、セクションなら `section`。単純なラッパーなら `div`。

#### タブ (Tabs) `<ui-tabs>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 同一コンテキスト内でのビュー（パネル）切り替えを提供します。
- **Orientation**: 現在位置のタブを明確にし、他が非アクティブであることを示しますが、非アクティブなタブもクリック可能であることをアフォードします。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: `@lion/ui` の `LionTabs`
- **Porting**: `tablist` (header) と `tabpanel` (content) の関係性を管理するロジックを使用。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `selected-index` | `selected-index` | `number` | 現在選択されているタブのインデックス。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **List (`tablist`)**: `display: flex`, `border-bottom: var(--border-width) solid var(--color-border-subtle)`
- **Tab (`tab`)**:
    - Height: `--control-height-lg` (40px)
    - Color (Default): `--color-foreground-muted`
    - Color (Selected): `--color-primary`
    - Indicator: Selected時に下部に `2px` のボーダー（`var(--color-primary)`）を表示。
    - Animation: 切り替え時にインジケータがスライドするアニメーション（`layout-projection`）を追加検討。

**5. アクセシビリティ (A11y)**

- **Keyboard**: 左右矢印キーでフォーカス移動。`Enter` / `Space` で選択（Manual Activation）。
- **ARIA**: `aria-controls`, `aria-selected` の自動管理。

#### ページネーション (Pagination) `<ui-pagination>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 大量データを分割表示する際のナビゲーションです。
- **Range Logic**: `Prev 1 ... 4 5 6 ... 10 Next` のように、現在地周辺と両端を表示し、中間を省略するロジックを持ちます。

**2. ロジック参照基盤 (Logic Reference)**

- **Implementation**: ステートレスコンポーネントとして実装し、ページ変更イベントを発火します。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `current` | `current` | `number` | 現在のページ（1始まり）。 |
| `total` | `total` | `number` | 総ページ数。 |
| `count` | `count` | `number` | 総アイテム数（オプション表示用）。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Item**: `<ui-button variant="ghost" size="sm">` をベースに使用。
- **Active**: 現在のページは `variant="outline"` または `font-weight: bold` で区別。
- **Gap**: `--space-1`

**5. アクセシビリティ (A11y)**

- **Role**: `nav` 要素、`aria-label="Pagination"`。
- **Label**: 各ボタンに `aria-label="Go to page 5"` 等を付与。
- **Current**: 現在のページに `aria-current="page"`。

### 記事・コンテンツ要素 (Article Elements)

#### 記事ヘッダー (Article Header) `<ui-article-header>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: コンテンツへの入り口として、タイトルとメタデータを明確に提示します。
- **Hierarchy**: `H1` タイトルはページ内で最も強い視覚的重みを持ち、本文導入部へのスムーズな視線誘導を行います。

**2. スタイリングとトークンマッピング (Style & Tokens)**

- **Title**:
    - Tag: `<h1>`
    - Typography: `--text-4xl`, `font-weight: 700`, `letter-spacing: --tracking-tighter`
- **Metadata**:
    - Placement: タイトル直下
    - Typography: `--text-sm`, `color: var(--color-foreground-muted)`
    - Gap: `--space-4` (メタデータ内), `--space-12` (本文との余白)

#### コールアウト (Callout) `<ui-callout>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 文脈から独立した重要な補足情報を強調表示します。
- **Semantic Color**: 色そのものが意味（情報、警告、危険）を持つため、色覚多様性に配慮し、必ずアイコンとセットで使用します。

**2. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `variant` | `variant` | `'note' \| 'tip' \| 'warning' \| 'danger'` | 意味的種別。 |
| `icon` | `icon` | `string` | デフォルトアイコンを上書きする場合指定。 |

**3. スタイリングとトークンマッピング (Style & Tokens)**

- **Container**:
    - Background: `oklch(from [BaseColor] l c h / 0.05)` (極めて薄い背景)
    - Border Left: `3px solid [BaseColor]` (アクセントライン)
    - Radius: `--radius-md`
    - Padding: `--space-4`
- **Variants**:
    - **Note** (Gray): `Info` icon (i)
    - **Tip** (Primary/Violet): `Lightbulb` icon
    - **Warning** (Amber): `AlertTriangle` icon
    - **Danger** (Red): `AlertOctagon` icon

**4. アクセシビリティ (A11y)**

- **Role**: `role="note"` または `role="region" aria-label="[Type]"`。

#### 詳細折りたたみ (Details) `<ui-details>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 情報の「段階的開示 (Progressive Disclosure)」を実現します。補足情報やFAQ、長大なログなど、常に表示する必要のない情報を格納し、S/N比を維持します。
- **Snappiness**: 開閉のアニメーションは、ユーザーの待機時間をゼロにするため、極めて高速（`--duration-fast`）かつスムーズに実行されます。

**2. ロジック参照基盤 (Logic Reference)**

- **Native**: `<details>` と `<summary>` 要素をベースにします。
- **Animation Strategy**:
    - CSS Grid (`grid-template-rows: 0fr` -> `1fr`) または `height` プロパティのアニメーションを使用し、コンテンツ量に応じた自然な開閉を実現します。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `summary` | `summary` | `string` | 見出しテキスト。 |
| `open` | `open` | `boolean` | 開閉状態。 |
| `variant` | `variant` | `'default' \| 'bordered'` | 枠線の有無。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Summary (Trigger)**:
    - Cursor: `pointer`
    - List Style: `none` (デフォルトの三角マーカーを削除)
    - Icon: `ChevronRight` (回転アニメーション付き: Open時 `90deg`)
    - Typography: `font-weight: var(--font-medium)`
    - Padding: `var(--space-2) 0`
- **Content**:
    - Padding: `var(--space-2) 0 var(--space-4)`
    - Margin Left: `var(--space-6)` (アイコン分インデント)

**5. アクセシビリティ (A11y)**

- **Keyboard**: `Enter` または `Space` で開閉可能。
- **ARIA**: ネイティブ要素を使用するため、自動的に `aria-expanded` 等が管理されます。

#### コードブロック (Code Block) `<ui-code-block>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 開発者ノートにおける「第二の本文」。可読性と機能性を最大化します。
- **Low Saturation**: シンタックスハイライトは、本文の「静謐さ」を壊さないよう、彩度を抑えたテーマを採用します。ネオンカラーのような高コントラスト配色は避けます。

**2. 実装要件 (Implementation)**

- **Library**: `PrismJS` または `Shiki` (Build time highlighting preferred via `rehype-prism-plus` etc.)
- **Copy Feature**: 右上にコピーボタンを配置。ホバー時のみ出現し、クリック時に「Copied!」のツールチップを即座に表示（Snappiness）。
- **File Name**: オプションで左上にファイル名を表示。

**3. スタイリングとトークンマッピング (Style & Tokens)**

- **Font**: `--font-mono`
- **Background**:
    - Light: `oklch(97% 0.01 var(--hue-base))`
    - Dark: `oklch(14% 0.02 var(--hue-base))`
    - ※ 本文背景とわずかに分離（Contrast）させる。
- **Radius**: `--radius-md`
- **Padding**: `--space-4`

#### コードグループ (Code Group) `<ui-code-group>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 複数の関連するコード（例: `npm`, `yarn`, `pnpm` のインストールコマンド）をタブ切り替えで提示します。
- **Integration**: コンテンツの断片化を防ぐため、タブヘッダーとコードブロック本体を視覚的に一体化（Merge）させ、一つのコンポーネントとして認知させます。

**2. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `items` | - | `{ label: string, code: string, lang: string }[]` | タブとコードの内容。 |

**3. スタイリングとトークンマッピング (Style & Tokens)**

- **Header (Tab List)**:
    - Background: `var(--bg-surface-2)`
    - Border Bottom: なし（コードブロックとの境界を消すため）
    - Radius: `--radius-md` `--radius-md` 0 0 (上部のみ丸める)
    - Item: `<ui-tabs>` のスタイルを流用するが、よりコンパクトに調整。
- **Body (Code Block)**:
    - `<ui-code-block>` を内包。
    - Radius: 0 0 `--radius-md` `--radius-md` (下部のみ丸める)
    - Margin Top: `0` (ヘッダーと直結)

**4. アクセシビリティ (A11y)**

- **Structure**: タブインターフェースとしての標準的なARIA属性（`tablist`, `tab`, `tabpanel`）を適用します。


#### インラインコード (Inline Code) `<code>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 本文中の技術用語、ファイル名、コマンド等を区別します。
- **Visual Distinction**: 本文フォントとは明確に異なる等幅フォント（Monospace）を使用することで、それが「実行可能」または「リテラル」な文字列であることを示します。

**2. 実装基盤 (Reference)**

- **Native**: 標準の `<code>` タグを使用します。

**3. スタイリングとトークンマッピング (Style & Tokens)**

- **Font**: `var(--font-mono)`
- **Background**: `var(--color-background-subtle)`
- **Color**: `var(--color-primary)` (またはコンテキストに応じたアクセント色)
- **Padding**: `0.2em 0.4em`
- **Radius**: `--radius-sm` (4px)
- **Border**: なし（背景色で区分するため）

#### キーボード入力 (Keyboard Input) `<ui-kbd>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: ユーザーに対するキーボードショートカットや入力指示を視覚化します。
- **Tactility**: キートップの物理的な形状（立体感）を模倣し、画面上のテキストではなく「押すべき物理キー」であることを直感的に伝えます。

**2. 実装基盤 (Reference)**

- **Native**: `<kbd>` タグ。

**3. スタイリングとトークンマッピング (Style & Tokens)**

- **Font**: `var(--font-sans)` (文字の視認性優先) または `var(--font-mono)`。
- **Background**: `var(--bg-surface-2)`
- **Border**: `1px solid var(--color-border)`
- **Border Bottom**: `2px solid var(--color-border)` (厚みの表現)
- **Radius**: `--radius-sm` (4px)
- **Padding**: `0.1em 0.3em`
- **Size**: 本文よりわずかに小さく (`0.9em`) 設定。

**4. アクセシビリティ (A11y)**

- **Semantics**: スクリーンリーダーによっては単なるテキストとして読み上げられるため、必要に応じて `aria-label` で補足します（例: `aria-label="Control plus K"`）。


#### 引用 (Blockquote) `<blockquote>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 他者の言葉や外部ソースからの引用を、本文から視覚的に分離します。
- **Change of Voice**: 縦線によるアクセントで、読むリズムを変え、別な「声」であることを意識させます。

**2. 実装基盤 (Reference)**

- **Native**: `<blockquote>` タグ。必要に応じて `<figure>` と `<figcaption>` (出典) でラップします。

**3. スタイリングとトークンマッピング (Style & Tokens)**

- **Border Left**: `4px solid var(--color-border-thick)`
- **Padding**: `var(--space-4)` (左側の余白)
- **Color**: `var(--color-foreground-muted)`
- **Font Style**: `italic`

#### 順序なしリスト (Unordered List) `<ui-ul>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 順序を持たない並列情報のグループ化。
- **Rhythm**: マーカー（Bullet）はコンテンツを読むリズムを作るための「拍子」であり、主張しすぎてはいけません。本文の色よりも一段階淡く（Low Contrast）することで、テキストへの集中を高めます。

**2. スタイリングとトークンマッピング (Style & Tokens)**

- **Marker**:
    - Color: `var(--color-foreground-muted)`
    - Shape: `disc` (Level 1), `circle` (Level 2), `square` (Level 3)
    - Position: `outside` (テキストの左端を揃えるため)
- **Spacing**:
    - Item Gap: `var(--space-2)` (リスト項目間の適切な呼吸)
    - Indent: `1.5em` (または `var(--space-6)`)

#### 順序付きリスト (Ordered List) `<ui-ol>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 手順やランキングなど、シーケンスが重要な情報の構造化。
- **Typography Check**: 数字（マーカー）には等幅フォント（Monospace）または表組用数字（Tabular Nums）を採用し、桁が増えても垂直方向のラインが崩れないようにします。

**2. スタイリングとトークンマッピング (Style & Tokens)**

- **Marker**:
    - Font: `var(--font-mono)`
    - Color: `var(--color-primary)` (順序の重要性を強調) または `var(--color-foreground-muted)`
    - Font Weight: `var(--font-medium)`
- **Counter**: CSS Counters (`counter-reset`, `counter-increment`) を使用し、ネストされたリストで `1.`, `1.1.`, `1.1.1.` といった法的スタイルへの切り替えも可能にします（バリアントとして）。

#### 画像 / 図版 (Image) `<ui-image>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: テキスト情報を補完し、コンテンツへの没入感を高めます。
- **Immersion**: クリックで拡大（Lightbox表示）する機能を提供し、細部まで確認したいユーザーの要求に応えます。美術ジャンル等では特に重要です。

**2. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `src` | `src` | `string` | 画像URL。 |
| `alt` | `alt` | `string` | 代替テキスト（必須）。 |
| `caption` | `caption` | `string` | 画像下に表示する説明文。 |
| `zoomable` | `zoomable` | `boolean` | 拡大表示機能の有無。 |
| `width` / `height` | - | `number` | レイアウトシフト（CLS）防止のための寸法指定。 |

**3. スタイリングとトークンマッピング (Style & Tokens)**

- **Container**: `<figure>` 要素を使用。
- **Image**:
    - Radius: `--radius-md`
    - Display: `block`
    - Max Width: `100%`
- **Caption**:
    - Element: `<figcaption>`
    - Typography: `--text-sm`, `color: var(--color-foreground-muted)`, `text-align: center`
    - Margin Top: `--space-2`

**4. アクセシビリティ (A11y)**

- **Alt Text**: 文脈に即した適切な代替テキストを義務付けます。
- **Button**: 拡大可能な場合、画像全体をボタンとして機能させるか、拡大ボタンを付与し、キーボード操作で拡大できるようにします。

#### 動画埋め込み (Video) `<ui-video>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 静的なテキストでは伝えきれない動的な情報を提供します。
- **Control**: ユーザーの許可なき「自動再生（Autoplay）」は、集中を乱す最悪のノイズであるため、原則として禁止します。音声もデフォルトはミュートとします。

**2. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `src` | `src` | `string` | 動画ファイルのURL、またはYouTube等のEmbed URL。 |
| `poster` | `poster` | `string` | サムネイル画像URL。 |
| `autoplay` | `autoplay` | `boolean` | 自動再生（**非推奨**）。使用時は必ず`muted`を併用。 |
| `caption` | `caption` | `string` | 動画の説明（キャプション）。 |

**3. スタイリングとトークンマッピング (Style & Tokens)**

- **Container**:
    - Aspect Ratio: `16 / 9` (標準)
    - Radius: `--radius-md`
    - Overflow: `hidden` (角丸を維持)
    - Background: `black` (読み込み前のちらつき防止)
- **Overlay**: 再生前はカスタムの再生ボタン（Play Icon）を中央に配置し、クリックを誘発します。
- **Wrapper**: `<figure>` を使用し、`<figcaption>` でキャプションを表示します。

**4. アクセシビリティ (A11y)**

- **Captions**: 動画には字幕（Track）を提供することを強く推奨します。
- **Controls**: キーボードのみで再生・停止・音量調整が可能なプレイヤーUIを提供します（ネイティブまたはカスタム）。


#### 区切り線 (Divider) `<ui-divider>` / `<hr>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: コンテンツの意味的な区切りを示します。
- **Subtlety**: 視覚的なノイズにならないよう、可能な限り薄く（Low Contrast）、余白を持って配置します。

**2. 実装基盤 (Reference)**

- **Native**: `<hr>` タグ。
- **Role**: `role="separator"`.

**3. スタイリングとトークンマッピング (Style & Tokens)**

- **Border**: None
- **Border Top**: `var(--border-width) solid var(--color-border-subtle)`
- **Margin**: `var(--space-8) 0` (上下に十分な呼吸空間)

#### ハイライト (Highlight) `<mark>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 検索結果のマッチ部分や、ユーザーが強調した箇所を目立たせます。
- **Noticeability**: 周囲のテキストから明確に浮き立たせますが、可読性を損なわない配色を選びます。

**2. 実装基盤 (Reference)**

- **Native**: `<mark>` タグ。

**3. スタイリングとトークンマッピング (Style & Tokens)**

- **Background**: `var(--color-highlight-bg)` (通常は黄色系 `oklch(95% 0.15 85)`)
- **Color**: `var(--color-highlight-text)` (コントラスト確保)
- **Padding**: `0 0.1em`

### 特殊コンテンツ (Specialized Content)

#### 翻訳 / 対訳 (Translation) `<ui-translation>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 文学作品などの原文に対し、読むリズムを崩さずに翻訳を参照するための支援ツールです。
- **Transparency**: 翻訳はあくまで「補助」であるため、ユーザーが求めない限りは隠蔽（または控えめに表示）し、原文への没入を優先します。

**2. ロジック参照基盤 (Logic Reference)**

- **Interaction**:
    - **Desktop**: ホバー（Hover）またはフォーカスでポップオーバーを表示。
    - **Mobile**: タップでインターリニア（行間）表示を展開、または設定により常時表示。
- **Engine**: コンテンツパイプライン（Markdownパーサー）により、原文と翻訳文のペア構造を生成します。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `original` | - | `string` | 原文データ。 |
| `translated`| - | `string` | 翻訳文データ。 |
| `lang` | `lang` | `string` | 原文の言語コード（例: `fr`）。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Trigger (Original Text)**:
    - Decoration: `text-decoration: underline` style `dotted` color `var(--color-border-subtle)` (翻訳が存在することのヒント)
    - Cursor: `help` または `pointer`
- **Popover (Translation)**:
    - `<ui-popover>` のスタイルを継承。
    - Font: `--font-sans` (原文がSerifの場合、区別のためSansを使用)
    - Color: `--color-foreground`

**5. アクセシビリティ (A11y)**

- **Description**: トリガー部分に `aria-describedby` を付与し、翻訳文（Popover ID）と紐付けます。

#### 楽譜 (Score) `<ui-score>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 音楽ジャンルにおいて、主題や動機（Motif）を視覚的に提示します。
- **Clarity**: 複雑な楽譜記号を鮮明に表示するため、ビットマップではなくベクター（SVG）を使用します。

**2. ロジック参照基盤 (Logic Reference)**

- **Engine**: LilyPondによって生成されたSVGを表示します。
- **Responsive**: 画面幅に応じてSVGのサイズを調整しますが、楽譜の縦横比は厳格に維持します。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `src` | `src` | `string` | SVGファイルのパス。 |
| `title` | `title` | `string` | 楽譜のタイトル（アクセシビリティ用、キャプション用）。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Container**:
    - Background: 楽譜の視認性を保証するため、ダークモードであっても **白背景（または極めて明るいグレー）** を確保し、`filter: invert()` は行いません（五線譜の視認性維持のため）。
        - *Option*: ダークモード専用の配色（白線・黒背景）で生成されたSVGがある場合はそれを使用。
    - Padding: `--space-4`
    - Radius: `--radius-md`
    - Overflow: モバイル等で横幅が足りない場合、横スクロールを許可します。

**5. アクセシビリティ (A11y)**

- **Metadata**: SVG内部に `<title>` と `<desc>` タグが含まれていることを確認し、スクリーンリーダーが楽譜の内容（階名や構造）を読み上げられるようにします。

#### 数式 (Math) `<ui-math>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 科学・数学・情報工学（CS）分野の知識記述において、数式は「言語」そのものです。美しくレンダリングされた数式は、コンテンツの信頼性と知的な美しさを担保します。
- **Harmony**: 本文のフォント（Noto Sans JP / Inter）と調和しつつ、数式特有の厳密な組版ルール（TeXスタイル）を尊重します。

**2. ロジック参照基盤 (Logic Reference)**

- **Engine**: `KaTeX` (高速かつ軽量なレンダリング)。
- **Output**: MathML（アクセシビリティ用）と HTML/CSS（表示用）をハイブリッドで出力します。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `latex` | - | `string` | TeX形式の数式文字列。 |
| `block` | `block` | `boolean` | `true`: 別行立て数式（Display Mode）、`false`: インライン数式。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Font**: `KaTeX_Main`, `KaTeX_Math` (セリフ体)。
- **Display Mode (Block)**:
    - Margin: `var(--space-6) 0`
    - Overflow: `auto` (横スクロール許可)
    - Text Align: `center` (または設定により `left` + インデント)
    - Padding: `var(--space-4) 0`
- **Inline Mode**:
    - Padding: `0 0.2em`
- **Color**: `var(--color-foreground)` (本文と統一)

**5. アクセシビリティ (A11y)**

- **Screen Readers**: `MathML` を内包、または `aria-label` に数式の自然言語読み上げ（Speech）を含めることで、視覚障害者が数式の内容を理解できるようにします。


### フィードバックと通知 (Feedback & Notifications)

#### トースト (Toast) `<ui-toast>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: システムの状態変化（保存完了、コピー成功など）を伝えますが、ユーザーの作業フローを中断させません（Non-blocking）。
- **Transient**: 短時間で自動的に消滅するため、読み飛ばしても問題ない情報に限定します。重要なエラーはダイアログを使用します。

**2. ロジック参照基盤 (Logic Reference)**

- **Implementation**:
    - グローバルな `ToastManager` (Store) が通知スタックを管理し、レンダリングします。
    - **Porting Strategy**: `<output>` 要素または `role="status"` を持つコンテナを使用。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 型/値 | 説明 |
|------------|-------|------|
| `variant` | `'success' \| 'error' \| 'info'` | 通知タイプ。 |
| `duration` | `number` | 表示時間（ミリ秒）。デフォルト `5000`。 |
| `dismissible`| `boolean` | 手動で閉じることができるか。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Position**: 画面右下 (`bottom: var(--space-4)`, `right: var(--space-4)`)。
- **Z-Index**: `--z-toast` (500)
- **Appearance**:
    - Width: `320px`
    - Background: `var(--bg-surface-3)`
    - Border: `var(--border-width) solid var(--color-border)`
    - Shadow: `--shadow-lg`
    - Animation: 右からスライドイン (`--slide-in-right`)。

**5. アクセシビリティ (A11y)**

- **Role**: `role="status"` (polite) または `role="alert"` (assertive - エラー時)。
- **Motion**: `prefers-reduced-motion` 時はスライドインを無効化し、フェードのみにします。

#### ローディング / スケルトン (Loading State)

**1. デザイン哲学と目的 (Design Philosophy)**

- **Perceived Performance**: 待ち時間を短く感じさせるための演出です（実際に速くするわけではありません）。
- **Anti-Pulse**: 視界の隅で激しく明滅する「Pulse」アニメーションは、ユーザーにストレス（焦り）を与えるため禁止します。代わりに、穏やかに光が流れる「Shimmer」を採用し、停滞感を払拭します。

**2. コンポーネント定義**

- **`<ui-skeleton>`**: コンテンツの読み込み中に表示するプレースホルダー。
- **`<ui-spinner>`**: ボタン内や処理中のフィードバック。

**3. スタイリングとトークンマッピング (Style & Tokens)**

```css
/* スケルトンシマーアニメーション */
.skeleton {
  background-color: var(--color-background-subtle);
  border-radius: var(--radius-sm);
  background-image: linear-gradient(
    90deg,
    transparent 0%,
    oklch(from var(--color-background) l c h / 0.5) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite linear;
}
```

#### 空状態 (Empty State) `<ui-empty-state>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: データがないことを伝えるだけでなく、「次の一手（Call to Action）」を提示します。
- **Positivity**: 「何もない」というネガティブな状態ではなく、「これから始める」というポジティブな空白としてデザインします。

**2. スタイリング (Style)**

- **Layout**: 中央揃え、垂直配置。
- **Icon**: `--icon-xl` (32px), `color: var(--color-foreground-muted)`。
- **Text**: `Heading` + `Description` + `Button` (Create New etc.)。

#### バナー (Banner) `<ui-banner>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: ページ全体に関わる持続的な状態（メンテナンス予告、オフライン状態、重要なお知らせ）をユーザーに伝えます。
- **Persistence**: トーストとは異なり、ユーザーが明示的に閉じるか、原因が解消されるまで表示され続けます。

**2. ロジック参照基盤 (Logic Reference)**

- **Structure**: ヘッダー直下、またはコンテンツ最上部に配置されるブロック要素。
- **A11y**: 重要な情報は `role="alert"`、それ以外は `role="status"`。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `variant` | `variant` | `'info' \| 'warning' \| 'error' \| 'success'` | メッセージの重要度。 |
| `dismissible`| `dismissible`| `boolean` | 閉じるボタンを表示するか。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Background**: バリアントごとの背景色（`var(--color-info-bg)` 等）。
- **Border**: 下部に `1px` のボーダー。
- **Padding**: `--space-3`
- **Text**: `--text-sm`, `font-weight: var(--font-medium)`

#### プログレス (Progress) `<ui-progress>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: 完了までの時間が予測可能な処理（ファイルのアップロード等）の進捗を可視化します。
- **Smoothness**: 値の更新（Step）だけでなく、バーの動きそのものをスムーズに補間し、心理的な「止まっている感」を軽減します。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: Native `<progress>` or `role="progressbar"`.

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `value` | `value` | `number` | 現在の進捗（0-100）。 |
| `max` | `max` | `number` | 最大値。デフォルト100。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Track**:
    - Height: `4px`
    - Background: `var(--color-background-subtle)`
- **Bar**:
    - Background: `var(--color-primary)`
    - Transition: `width var(--duration-normal) linear`

### オーバーレイ (Overlays)

#### ダイアログ / モーダル (Dialog) `<ui-dialog>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: ユーザーの操作フローを強制的に中断し、重要な決断や入力（削除確認、設定変更）を求めます。
- **Focus Trap**: コンテキストを完全に切り替えるため、背景を暗くし（Backdrop）、視覚と操作をダイアログ内に閉じ込めます。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: `@lion/ui` の `LionDialog`
- **Porting Strategy**:
    - Native `<dialog>` 要素をラップし、`::backdrop` 疑似要素を活用します。
    - **Backdrop Styling**: `backdrop-filter: blur(2px)` を適用し、背面のコンテンツを「ボケた背景」として退かさせます。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `opened` | `opened` | `boolean` | 開閉状態。 |
| `modal` | `modal` | `boolean` | `true` の場合、背景クリックで閉じない（明示的なアクションが必要）。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

| 部位 | ライトモード | ダークモード |
|------|--------------|------------|
| **Backdrop** | `rgba(0, 0, 0, 0.2)` | `rgba(0, 0, 0, 0.5)` |
| **Surface** | `var(--color-background)` | `var(--bg-surface-3)` |
| **Radius** | `--radius-xl` (12px) | `--radius-xl` |
| **Shadow** | `--shadow-xl` | `--shadow-dark-lg` |
| **Width** | `min(600px, 90vw)` | コンテンツに応じる |

**5. アクセシビリティ (A11y)**

- **Focus Trap**: ダイアログが開いている間、フォーカスが外に出ないように制限します（Lion UI標準機能）。
- **Scroll Lock**: `body` のスクロールを無効化します。

#### コマンドパレット (Command Palette) `<ui-command-palette>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: パワーユーザー向けの「中枢神経」です。マウスを使わず、思考の速度でアプリケーションを操作するためのインターフェースです。
- **Search Logic**: 曖昧検索（Fuzzy Search）をサポートし、正確なスペルを覚えていなくても目的の機能に到達できるようにします。

**2. 技術仕様とAPI**

- **Trigger**: `Cmd+K` (Mac) / `Ctrl+K` (Win)
- **Z-Index**: `--z-modal` より高い `600`。

#### ポップオーバー / ツールチップ (Popover / Tooltip) `<ui-popover>` / `<ui-tooltip>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **Role Separation**:
    - **Tooltip**: UI要素に対する「説明（Label/Description）」を提供します。マウスホバーやフォーカスで自動的に出現する、純粋なテキスト情報です。
    - **Popover**: トリガーに関連する「アクション」や「リッチコンテンツ」を展開します。クリックで出現し、インタラクティブな要素（ボタン、フォーム）を含むことができます。
- **Contrast**: ツールチップは背景色を反転（黒背景に白文字）させ、UI層の上に浮いていることを明確にします。

**2. ロジック参照基盤 (Logic Reference)**

- **Reference**: `@lion/ui` の `Overlay System` (`LionTooltip`, `LionPopover` は `LionOverlay` を継承)。
- **Positioning**: Floating UI (formerly Popper.js) ロジックを使用し、画面端での衝突回避（Flip）、追従（Shift）を自動制御します。

**3. 技術仕様とAPI (Technical Specs)**

| プロパティ | 属性 | 型/値 | 説明 |
|------------|------|-------|------|
| `opened` | `opened` | `boolean` | 開閉状態。 |
| `content` | - | `string` | (Tooltip) 表示テキスト。 |
| `position` | `position` | `'top'\|'bottom'\|'left'\|'right'` | 優先表示位置。 |

**4. スタイリングとトークンマッピング (Style & Tokens)**

- **Tooltip**:
    - Background: `var(--color-inverse-bg)` (通常は黒)
    - Color: `var(--color-inverse-text)` (白)
    - Font: `--text-xs`, `font-weight: 500`
    - Padding: `--space-1` `--space-2`
    - Radius: `--radius-sm`
    - Z-Index: `--z-tooltip` (最上位)
- **Popover**:
    - Background: `var(--bg-surface-2)`
    - Border: `var(--border-width) solid var(--color-border-subtle)`
    - Radius: `--radius-md`
    - Shadow: `--shadow-lg`
    - Padding: `--space-4`

**5. アクセシビリティ (A11y)**

- **Tooltip**: トリガー要素に `aria-describedby` または `aria-labelledby` でコンテンツを紐付けます。
- **Popover**: `aria-haspopup="dialog"`, `aria-expanded` で制御。フォーカス管理（Trapまたは管理）が必要。

#### ポップオーバー / ツールチップ (Popover / Tooltip) `<ui-popover>` / `<ui-tooltip>`

**1. デザイン哲学**

- **Tooltip**: マウスホバー/フォーカス時に補足情報（ラベル）を表示。黒背景・白文字（High Contrast）で即座に認知させます。
- **Popover**: クリックで展開するリッチなコンテンツ（設定、フィルター）。白背景・影付き。

**2. ロジック参照**

- **Reference**: `@lion/ui` (`LionTooltip`, `LionPopover` inherited from `LionOverlay`).
- **Positioning**: トリガーに追従し、画面外にはみ出さないよう自動調整（Floating UI）。

**3. スタイリング**

- **Tooltip**: `font-size: --text-xs`, `padding: --space-1 --space-2`, `radius: --radius-sm`.
- **Popover**: `min-width: 200px`, `padding: --space-4`, `radius: --radius-md`, `shadow: --shadow-lg`.

### フッター (Footer) `<ui-footer>`

**1. デザイン哲学と目的 (Design Philosophy)**

- **役割**: アプリケーションの終端を示し、著作権情報等の法的要件を満たすための最小限の領域です。
- **Recede**: ユーザーの注意を引くべきではないため、視覚的階層は最も低く設定します。

**2. スタイリングとトークンマッピング (Style & Tokens)**

- **Height**: `48px`
- **Layout**: Flexbox Center
- **Typography**: `--text-xs`, `color: var(--color-foreground-muted)`
- **Content**: Copyright, Version number fallback.

---