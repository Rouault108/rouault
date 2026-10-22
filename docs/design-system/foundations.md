# Foundations

この文書はRouault Design Systemの設計語彙とtoken architectureの正本である。
実際のtoken値は実装ファイルを正本とし、この文書は値一覧ではなく層、責務、参照方針を定義する。

## 1. Status

- Type: Normative for Design System
- Source of truth: `src/assets/css/tokens.css`、Design System component styles、browser/SSR tests
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
- Component固有の色運用は`docs/contracts/`に置く。

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

## 9. CSS token参照の検証範囲

`test/ssr/css-token-references.test.ts`は`src/assets/css/**/*.css`の全宣言を既存のPostCSS / selector parserで読み、参照を公開token、局所変数、供給元を確認したruntime変数、fallbackに分類する。公開名は`tokens.css`の無条件`:root`定義から取得し、互換aliasも参照先をたどる通常の定義として検証する。aliasの新設や名前全体のallowlistで未定義を隠さない。

- 局所変数は同一ファイル内の同一selector、compoundへの条件追加、明記された祖先prefixからの継承だけを認める。条件付き定義は同じat-rule条件の参照に限定し、無関係なselector / ファイル / 状態の同名定義では合格させない。
- `var()`は文字列・コメント・括弧・カンマを区別する小さな値scannerで読む。fallbackは空値やliteralを許容し、nested fallback内の参照も検査する。使用されないfallback内の未定義参照、自己循環、相互循環も報告する。
- 供給元を確認したTOC depth、sticky boundary、video progressは`test/fixtures/css/runtime-token-suppliers.json`にsourceと参照箇所・件数を固定する。source内の供給文の存続を確認するが、全実行経路の到達性やDOM継承は証明しない。Shikiのinline色はCSS上の`inherit` fallbackとして扱い、生成値は既存のShiki SSR testが担当する。
- `test/fixtures/css/known-token-reference-findings.json`は、未定義および静的に未証明の既存参照をfile / selector / property / 参照名 / 種類 / 件数 / 理由で管理する。追加だけでなく削除・増加・別箇所への移動でもテストが失敗するため、変更時に個別に再確認する。自動更新するsnapshotではない。
- `--z-overlay`は未定義だがliteral fallbackがある既知残件であり、sidebarの二箇所を専用assertionで固定する。今回z-indexの値・順序・実装は変更しない。他の既存残件は`--focus-default`、`--fg-link`、`--radius-lg`、OS dark mediaにしか供給がないexplicit darkのshadow参照、DOM / functional selectorの継承未証明箇所であり、Copy button修正へ混ぜない。

これはCSS cascadeの完全な解決器ではない。stylesheetの読込・順序、specificity、`!important`、layerの優先順位、theme / mediaの排他性、全DOM構造、継承時の計算済み値、`initial` / `unset` / `@property`、値の型やcontrastは保証しない。`var()`のないliteral fallbackの意味的妥当性や、それが意図されたoverrideかtypoかも推論しない。selectorの`:is()` / `:where()`の包含推論やファイル間の局所変数継承は未証明として残す。escaped identifierなどscannerの未対応構文はunsupportedとして失敗させる。循環検出はfallbackと候補定義を保守的にたどるため、条件の排他性を証明して誤検出を取り除くことはしない。

Copy buttonは`--focus-ring-width` / `--focus-ring-color` / `--focus-ring-offset`を使う。実browserのlight / dark / system、token overrideで計算済みoutlineとkeyboard focusを検証し、production E2Eではforced colorsも確認する。本文`main#main-content`へのlogical focusは操作対象のfocus ringと別契約であり、この修正の対象にしない。
