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

`test/ssr/css-token-references.test.ts`は`src/assets/css/**/*.css`を既存のPostCSS / selector parserで読み、公開token、局所変数、供給元を確認したruntime変数、明示契約のある任意override、未解決参照を区別する。公開名は`tokens.css`の無条件`:root`定義から取得し、互換aliasも参照先をたどる通常の定義として検証する。aliasの新設や名前全体のallowlistで未定義を隠さない。

- 局所変数は同一ファイル内の同一selector、compoundへの条件追加、明記された祖先prefixからの継承だけを認める。条件付き定義は同じat-rule条件の参照に限定し、無関係なselector / ファイル / 状態の同名定義では合格させない。
- `var()`は文字列・コメント・括弧・カンマを区別する値scannerで読む。fallbackの存在だけでは正常扱いせず、未定義または未証明scopeとして検出する。nested fallbackも検査し、既知tokenの未使用fallback内のtypoや循環も隠さない。
- 意図的な任意overrideは`test/fixtures/css/intentional-token-overrides.json`に公開契約の根拠とfile / selector / property / 参照名 / at-rule条件 / 件数を固定する。FooterとTabsの文書化済み公開propertyだけを認め、空fallbackやliteral fallbackも明示契約なしには許可しない。契約があってもfallback内の未定義参照や循環は検査する。
- TOC depth、sticky boundary、video progressは`test/fixtures/css/runtime-token-suppliers.json`にsourceと参照箇所・条件・件数を固定する。source内の供給文の存続を確認するが、全実行経路の到達性やDOM継承は証明しない。Shikiのinline色は既存SSRが生成を検証するが、静的供給契約には入れず既知残件として分類する。
- `test/fixtures/css/known-token-reference-findings.json`は既存残件をfile / selector / property / 参照名 / at-rule条件 / 種類 / 件数 / 理由で管理する。異なるmediaへの移動や参照の増減も失敗するため、個別の再確認が必要となる。自動更新するsnapshotではない。
- 初期棚卸しの`--z-overlay`未定義2参照は、main `fa8d5e1a`までのsidebar stacking修正で解消された。現在は旧参照ゼロと、親の`--z-blocking-layer`がpublic / fallback `200`として解決することを確認する。stackingの値・順序は既存の`sidebar-overlay-css-contract.test.ts`が所有し、token参照検証から重複して規定しない。

循環判定は経路ごとに明示的なlight / dark / system属性条件と、単純なAND mediaに含まれる`prefers-color-scheme`、`forced-colors`、`prefers-reduced-motion`の排他的な値を照合する。排他的なlightとdarkを合成した偽の循環を除外する。明示themeとOS色設定は独立するため、light属性とOS darkの組合せは排除しない。`not` / `or` / カンマを含むmediaや任意のselector論理は推論せず、循環候補を保守的に残す。

これはCSS cascadeの完全な解決器ではない。stylesheetの読込・順序、specificity、`!important`、layerの優先順位、定義の上書き、全DOM構造、継承時の計算済み値、`initial` / `unset` / `@property`、値の型やcontrastは保証しない。literal fallbackの意味的妥当性や、それが意図されたoverrideかtypoかも自動では判定しない。selectorの`:is()` / `:where()`の包含推論やファイル間の局所変数継承は未証明として残す。escaped identifierなどscannerの未対応構文はunsupportedとして失敗させる。

初期棚卸しの57参照は、fallbackのない未定義17件（`--focus-default` 12、`--fg-link` 1、`--radius-lg` 4）と未証明scope 40件（明示darkのshadow供給条件4、code surfaceのfunctional selector 20、menu / leadのDOM継承16）である。厳格化時のfallback付き95参照を含めた初期baselineは144項目・152参照だった。main `fa8d5e1a`統合後は、旧`--z-overlay`の2座標（各1参照）だけをfinding多重集合の厳密差分で除き、142項目・150参照となった。現在のfallback付き残件は93参照（未定義77、scope未証明16）であり、その他の残件・理由・件数は不変である。新規findingのbaseline再生成による容認は行わない。供給未証明・未定義・生成inline色等の理由を個別に記録し、他機能のAPIやCSSを無断で修正せず追跡する。

Copy buttonは`--focus-ring-width` / `--focus-ring-color` / `--focus-ring-offset`を使う。実browserのlight / dark / system、token overrideで計算済みoutlineとkeyboard focusを検証する。production E2EはsystemとOS colorScheme light / darkを明示して両分岐を確認し、light / dark / forced colorsも維持する。コード単体・グループ・previewそれぞれでnative Tab移動によるfocusと計算済みringを確認する。本文`main#main-content`へのlogical focusは操作対象のfocus ringと別契約であり、この修正の対象にしない。
