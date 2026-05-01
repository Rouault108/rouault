# Foundations

この文書は Rouault Design System の設計語彙と token architecture の正本である。
実際の token 値は実装ファイルを正本とし、この文書は値一覧ではなく層、責務、参照方針を定義する。

## 1. Status

- Type: Normative for Design System
- Source of truth: `src/components/styles/tokens.css`、Design System component styles、browser/SSR tests
- Applies to: color、typography、motion、spacing、shell constants、theme variants
- Non-goals: token 全値一覧、component 固有契約、機能 Contract

## 2. Token Architecture

Rouault の token は 4 層で扱う。

- Primitive: raw scale。component は原則として直接参照しない。
- Semantic: foreground、surface、border、focus、danger など UI 意味を持つ token。
- Pattern: overlay、control、reading surface など横断 pattern のための token。
- Application Shell Constants: header、sidebar、content width、breakpoint、z-index など shell 構造の定数。

Component は、まず Semantic または Pattern token を参照する。Primitive token の直接参照は、新しい semantic token を定義すべきかを確認した上で行う。

## 3. Color

- 読書体験を優先し、本文領域では強い色面、過剰な影、装飾的な contrast を避ける。
- Light / dark theme は同じ semantic role を保つ。
- Forced colors mode では色そのものではなく、境界、状態、focus の可視性を優先する。
- Component 固有の色運用は `docs/design-system/components/**` に置く。

## 4. Typography

- 本文 typography と UI typography を分離する。
- Reading typography は長文の可読性、行長、行間、見出し階層を優先する。
- UI typography は scan しやすい密度、状態表示、control label の明瞭性を優先する。
- 実際の font family、scale、line-height token 値は実装を正本とする。ただし compact UI の行高契約として `--line-height-snug` は `1.35` を指す。

## 5. Motion

- Motion は状態理解を助ける場合に限る。
- Reduced motion では移動量、視覚的連続性、時間差演出を抑える。
- Content reading を妨げる常時 animation を導入してはならない。

## 6. Accessibility

- Accessibility 要求事項の正本は `docs/design-system/accessibility.md`。
- Foundation は focus token、contrast token、forced-colors 方針など設計語彙だけを持つ。
- Component 文書は横断 accessibility 要求を上書きせず、component 固有差分だけを定義する。

## 7. Application Shell Constants

- Header height、sidebar width、content width、breakpoint、z-index は Application Shell Constants として扱う。
- Shell constants は layout shell の構造に関わるため、component 固有の見た目値として増やしてはならない。
- Sidebar state ownership は `docs/contracts/sidebar-state.md` を正本とする。

## 8. Acceptance Criteria

- Foundation が token 値一覧ではなく設計語彙の正本になっている。
- Component が参照すべき token 層が明確である。
- Accessibility、Patterns、Component 文書との責務境界が分離されている。
