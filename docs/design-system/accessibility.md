# アクセシビリティ

この文書はRouault UI全体に適用するアクセシビリティ要求事項の正本である。
Guide、ADR、component文書はこの文書を上書きしてはならない。

## 1. Status

- Type: Normative for Design System
- Source of truth: Design System component implementation、a11y tests、manual QA
- Applies to: semantic HTML、keyboard、focus、contrast、target size、reduced motion、forced colors、notifications
- Non-goals: 個別componentの全属性一覧、test taxonomyの再定義

## 2. Baseline

- WCAG 2.1 Level AAを最低基準とする。
- WCAG 2.2のtarget size、focus appearanceなど実装可能な項目は積極的に採用する。
- Semantic HTMLを優先し、ARIAはsemantic HTMLを補う場合に限る。
- no-JS baselineとstatic-firstの情報構造を弱めてはならない。

## 3. Requirements

### Semantics

- Landmark、heading、list、form、button、linkのnative semanticsを優先する。
- Interactive elementは名前、役割、状態を支援技術へ露出する。
- 見た目だけで情報構造を表してはならない。

### Keyboard

- すべての操作可能要素はkeyboardで到達・操作できる。
- Focus orderはDOM orderと読書順序から予測できる。
- Escape、Arrow、Enter、Spaceなどのkey handlingはcomponent patternに従う。

### Focus

- Focus visibleを消してはならない。
- Focus ringはforced colorsとdark modeで視認できる。
- Dialog / popover / overlayはfocus returnを定義する。

### Target Size

- 主要controlは最低24×24px、推奨44×44pxのpointer targetを持つ。
- 高密度UIでも隣接controlの誤操作を誘発しないspacingを確保する。

| Token                 | Value |
| --------------------- | ----- |
| `--control-min-touch` | 24px  |

```text
| `--control-min-touch` | 24px |
```

### Contrast and Color

- 色だけに状態識別を依存してはならない。
- Text、icon、focus、border stateはtheme variantsで必要なcontrastを満たす。

### Motion

- `prefers-reduced-motion`を尊重する。
- 常時animation、強い視差、読書を妨げる遷移を避ける。

### Live Region and Async State

- Navigation、toast、validation、loadingは必要な場合にだけ通知する。
- Announcementはrouter coreではなくpost-commit / UI adapterの責務とする。

### Forced Colors

- Native color keywordsとoutline/border を活用し、状態が失われないようにする。
- Background imageやbox-shadowだけに境界を依存してはならない。

## 4. Component Requirements

- Dialog / Modal: focus trap、initial focus、escape close、return focusを定義する。
- Dropdown / Popover: trigger relationship、keyboard navigation、outside closeを定義する。
- Tabs: selected tabとpanel relationshipを露出する。
- Toast / Banner: 必要な通知だけをlive regionへ送る。
- Form Controls: label、description、error stateを関連付ける。
- Icon Button: accessible nameを必ず持つ。
- Loading / Skeleton: busy stateとno-JS fallbackを考慮する。

Component固有の詳細は`docs/design-system/components/**`に置く。

## 5. Verification

- 検証レイヤの一般分類は`docs/contracts/testing-taxonomy.md`に従う。
- 自動検証だけでなく、keyboard、screen reader、forced colors、reduced motion、zoomの手動確認を行う。
- Storybookはdocs / smokeの補助であり、contract test harnessではない。

## 6. Forbidden

- Accessibility要求事項をGuide、ADR、Oldへ降格してはならない。
- 横断要求をcomponent文書だけに分散させてはならない。
- Component文書がこの文書の要求を弱めてはならない。
