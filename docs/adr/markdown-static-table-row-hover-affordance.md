# Markdown Static Table Row Hover Affordance Decision Record

## Status

- Type: R3 Decision Record
- Date: 2026-06-22
- Decision ID: D-TABLE-HOVER-001
- Contract source of truth: `docs/contracts/markdown.md`
- Scope: Markdown由来のstatic table surfaceのrow hover affordance

この文書はdecision recordです。現在のcontractを再定義する正本ではありません。現行contractの正本は`docs/contracts/markdown.md`です。DOM詳細参照は`docs/references/markdown-output.md`です。

`docs/adr/README.md`はADRディレクトリの性格説明であり網羅リストではないため、このADR追加では更新しません。

## Context

- Markdown由来の表は`div[data-table-root="true"][role="region"][tabindex="0"] > table`へ正規化される。
- `data-table-root`は横スクロール可能な静的表rootであり、行クリック、行選択、行navigationを提供しない。
- 移行前実装の`src/components/ui/table/table.ts`には、Active Rulerとして`@media (hover: hover) and (pointer: fine)`環境で`ui-table tbody tr:hover`に背景を付与する実装が存在した。
- 移行前Storybookの`src/components/ui/table/table.stories.ts`には、Active Rulerの確認項目が存在した。
- これは現行契約の正本ではなく、静的HTML移行前の設計経緯を示すhistorical evidenceとして扱う。
- 現行`table.css`とSSR CSS契約テストは、row hover背景を静的表の契約として固定している。
- しかし、通常表の行全体がhoverで面反応すると、クリック可能性、選択状態、現在行表示と誤認されやすい。

## Decision

Markdown static tableでは、`tr:hover`によるrow-level背景変更を標準契約に含めない。

`data-table-root`はscrollable static table rootを示す属性であり、row action、row selection、row navigation、interactive data grid、row hover affordanceを意味しない。

セル内のlink / buttonなど、実際の操作要素のhover / focusは維持する。

## Alternatives considered

### Keep row hover with weaker color

棄却。Reading Rulerとしての意図は理解できるが、通常表の非操作性を曖昧にする。

### Add `data-table-kind="static"`

棄却。現行の`data-table-root`自体がMarkdown由来の静的表rootを示しており、属性追加は契約を二重化する。

### Delete `--bg-table-ruler`

棄却。`code-preview`でも参照されており、今回の範囲を超える。

### Introduce interactive row table at the same time

棄却。クリック可能な表・一覧は別Requestとして、専用のlist / card / interactive surfaceで設計する。

## Counter-hypothesis review

### H1: Row hover should remain because it improves row tracking

Rejected. It improves row tracking, but Markdown static tables do not provide row action, row selection, or row navigation. A full-row hover surface can be misread as an interactive affordance.

### H2: Removing only `cursor: pointer` is enough

Rejected. The current implementation already has no pointer cursor, but full-row background response itself still implies selection/current-row state.

### H3: A weaker hover color is sufficient

Rejected. The issue is not only contrast strength but also whether a noninteractive Markdown table should react as a row-level surface.

## Consequences

- Markdown通常表は、マウス移動に対して静的な読解対象として振る舞う。
- 行追跡補助としてのhover rulerは失われる。
- 非interactive surfaceとinteractive surfaceの境界が明確になる。
- セル内リンクやボタンなど、実際の操作要素のhover / focusは維持される。
- Markdown tableのDOM構造、横スクロール、focus-visible、caption / aria-label、coarse pointer、forced-colors契約は維持される。

## Rollback

`table.css`のrow hover ruleとSSR CSS契約テストの期待値を戻すことでrollback可能。
