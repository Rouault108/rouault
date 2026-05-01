# アクセシビリティ

この文書は Rouault UI 全体に適用するアクセシビリティ要求事項の正本である。
Guide、ADR、component 文書はこの文書を上書きしてはならない。

## 1. Status

- Type: Normative for Design System
- Source of truth: Design System component implementation、a11y tests、manual QA
- Applies to: semantic HTML、keyboard、focus、contrast、target size、reduced motion、forced colors、notifications
- Non-goals: 個別 component の全属性一覧、test taxonomy の再定義

## 2. Baseline

- WCAG 2.1 Level AA を最低基準とする。
- WCAG 2.2 の target size、focus appearance など実装可能な項目は積極的に採用する。
- Semantic HTML を優先し、ARIA は semantic HTML を補う場合に限る。
- no-JS baseline と static-first の情報構造を弱めてはならない。

## 3. Requirements

### Semantics

- Landmark、heading、list、form、button、link の native semantics を優先する。
- Interactive element は名前、役割、状態を支援技術へ露出する。
- 見た目だけで情報構造を表してはならない。

### Keyboard

- すべての操作可能要素は keyboard で到達・操作できる。
- Focus order は DOM order と読書順序から予測できる。
- Escape、Arrow、Enter、Space などの key handling は component pattern に従う。

### Focus

- Focus visible を消してはならない。
- Focus ring は forced colors と dark mode で視認できる。
- Dialog / popover / overlay は focus return を定義する。

### Target Size

- 主要 control は最低 24×24px、推奨 44×44px の pointer target を持つ。
- 高密度 UI でも隣接 control の誤操作を誘発しない spacing を確保する。

| Token                 | Value |
| --------------------- | ----- |
| `--control-min-touch` | 24px  |

```text
| `--control-min-touch` | 24px |
```

### Contrast and Color

- 色だけに状態識別を依存してはならない。
- Text、icon、focus、border state は theme variants で必要な contrast を満たす。

### Motion

- `prefers-reduced-motion` を尊重する。
- 常時 animation、強い視差、読書を妨げる遷移を避ける。

### Live Region and Async State

- Navigation、toast、validation、loading は必要な場合にだけ通知する。
- Announcement は router core ではなく post-commit / UI adapter の責務とする。

### Forced Colors

- Native color keywords と outline/border を活用し、状態が失われないようにする。
- Background image や box-shadow だけに境界を依存してはならない。

## 4. Component Requirements

- Dialog / Modal: focus trap、initial focus、escape close、return focus を定義する。
- Dropdown / Popover: trigger relationship、keyboard navigation、outside close を定義する。
- Tabs: selected tab と panel relationship を露出する。
- Toast / Banner: 必要な通知だけを live region へ送る。
- Form Controls: label、description、error state を関連付ける。
- Icon Button: accessible name を必ず持つ。
- Loading / Skeleton: busy state と no-JS fallback を考慮する。

Component 固有の詳細は `docs/design-system/components/**` に置く。

## 5. Verification

- 検証レイヤの一般分類は `docs/contracts/testing-taxonomy.md` に従う。
- 自動検証だけでなく、keyboard、screen reader、forced colors、reduced motion、zoom の手動確認を行う。
- Storybook は docs / smoke の補助であり、contract test harness ではない。

## 6. Forbidden

- Accessibility 要求事項を Guide、ADR、Old へ降格してはならない。
- 横断要求を component 文書だけに分散させてはならない。
- Component 文書がこの文書の要求を弱めてはならない。
