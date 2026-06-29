# Syntax Field Static Hover Affordance

## Status

Accepted

## Decision ID

`D-SYNTAX-FIELD-NONINTERACTIVE-HOVER-001`

## Context

Syntax Cardは、Markdown由来の構文・引数・戻り値などを静的に説明する読書surfaceである。  
その中の`syntax-field`は、パラメータ名、必須表示、型、default、説明文を持つ静的説明行であり、row action、row selection、row navigationを提供しない。

現行CSSでは`.syntax-field:hover`により、非interactiveなfield row全体の背景、border-radius、transitionが変化する。  
この反応は、クリック、展開、選択、詳細表示などの操作可能性を示すものとして誤読される余地がある。

Rouaultでは、静的な読書空間において、非操作要素が不要にsurface反応することを避ける。  
実操作のあるcopy action表示とは分離して、非interactive field row自体はhover affordanceを持たないものとする。

## Decision

`syntax-field`は非interactiveな静的説明行として扱う。

そのため、次を標準契約から外す。

- `.syntax-field:hover`によるrow-level背景変更
- `.syntax-field:hover`によるrow-level border-radius変更
- `.syntax-field:hover`によるrow-level transition

一方で、次は維持する。

- `.syntax-card:hover .syntax-card__copy-action`
- `.syntax-card:focus-within .syntax-card__copy-action`
- coarse pointer環境でのcopy action表示
- `syntax-field`の`dl > dt + dd`構造
- `syntax-field`の静的な余白、grid、型、default、必須badgeの表示

## Consequences

非interactive rowが操作可能に見える誤アフォーダンスを抑制できる。  
Syntax Cardは、hover反応ではなく静的な構造、余白、ラベル、型、説明文で読ませるsurfaceになる。

copy actionは実操作のあるbuttonに結び付くため、card hover/focus-withinによる表示を維持する。  
したがって、field row hover削除はcopy actionのdiscoverabilityを削除するものではない。

## Rejected options

### Keep the existing hover

行追跡性は上がるが、非interactive rowを操作可能なsurfaceとして見せるため棄却する。

### Weaken the hover color

色を弱めても、非interactive rowがhoverで反応するという構造は残る。  
問題は色の強さだけではなく、静的説明行がinteractiveに見える点であるため棄却する。

### Only avoid `cursor: pointer`

現行でも`cursor: pointer`は使っていない。  
それでも背景反応自体がrow action、row selection、current rowのように見えるため不十分である。

### Treat the hover as a reading ruler

Syntax Cardの情報量では、行追跡補助は静的な余白、罫線、grid、typographic hierarchyで足りる。  
読書surfaceとしての静けさを優先するため棄却する。

## Counter-hypothesis

`.syntax-field:hover`を削除すると、密度の高いSyntax Cardで現在読んでいる行を追跡しにくくなる可能性がある。

## Response to counter-hypothesis

Syntax Cardのfield rowは、API referenceの巨大なdata gridではなく、本文中の静的説明surfaceである。  
行追跡性は、hover rulerではなく、静的な余白、grid、term/descriptionの階層、型・default・requiredの表示で担保する方がRouaultの読書UIに合う。

## Rollback

次を戻す。

- `src/assets/css/syntax.css`の`.syntax-field:hover` rule
- `test/ssr/static-css-contracts.test.ts`の`.syntax-field:hover`不在契約
- `docs/contracts/markdown.md`の非interactive row契約追記
- `docs/references/markdown-output.md`の非操作性追記
- このADRと`docs/README.md`のADR登録
