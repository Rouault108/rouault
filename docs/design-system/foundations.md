# Foundations

この文書はRouault Design Systemの設計語彙とtoken architectureの正本である。
実際のtoken値は実装ファイルを正本とし、この文書は値一覧ではなく層、責務、参照方針を定義する。

## 1. Status

- Type: Normative for Design System
- Source of truth: `src/components/styles/tokens.css`、Design System component styles、browser/SSR tests
- Applies to: color、typography、motion、spacing、shell constants、theme variants
- Non-goals: token全値一覧、component固有契約、機能Contract

## 2. Token Architecture

Rouaultのtokenは4層で扱う。

- Primitive: raw scale。componentは原則として直接参照しない。
- Semantic: foreground、surface、border、focus、dangerなどUI意味を持つtoken。
- Pattern: overlay、control、reading surfaceなど横断patternのためのtoken。
- Application Shell Constants: header、sidebar、content width、breakpoint、z-indexなどshell構造の定数。

Componentは、まずSemanticまたはPattern tokenを参照する。Primitive tokenの直接参照は、新しいsemantic tokenを定義すべきかを確認した上で行う。

## 3. Color

- 読書体験を優先し、本文領域では強い色面、過剰な影、装飾的なcontrastを避ける。
- Light / dark themeは同じsemantic roleを保つ。
- Forced colors modeでは色そのものではなく、境界、状態、focusの可視性を優先する。
- Component固有の色運用は`docs/design-system/components/**`に置く。

## 4. Typography

- 本文typographyとUI typographyを分離する。
- Reading typographyは長文の可読性、行長、行間、見出し階層を優先する。
- UI typographyはscanしやすい密度、状態表示、control labelの明瞭性を優先する。
- 実際のfont family、scale、line-height token値は実装を正本とする。ただしcompact UIの行高契約として`--line-height-snug`は`1.35`を指す。

## 5. Motion

- Motionは状態理解を助ける場合に限る。
- Reduced motionでは移動量、視覚的連続性、時間差演出を抑える。
- Content readingを妨げる常時animationを導入してはならない。

## 6. Accessibility

- Accessibility要求事項の正本は`docs/design-system/accessibility.md`。
- Foundationはfocus token、contrast token、forced-colors方針など設計語彙だけを持つ。
- Component文書は横断accessibility要求を上書きせず、component固有差分だけを定義する。

## 7. Application Shell Constants

- Header height、sidebar width、content width、breakpoint、z-indexはApplication Shell Constantsとして扱う。
- Shell constantsはlayout shellの構造に関わるため、component固有の見た目値として増やしてはならない。
- Sidebar state ownershipは`docs/contracts/sidebar-state.md`を正本とする。

## 8. Acceptance Criteria

- Foundationがtoken値一覧ではなく設計語彙の正本になっている。
- Componentが参照すべきtoken層が明確である。
- Accessibility、Patterns、Component文書との責務境界が分離されている。
