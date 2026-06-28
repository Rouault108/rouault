# Reading Surface Flow Pattern

この文書は、Rouaultの読書面における本文flow余白を定義するDesign System patternである。
Markdown出力の構造契約は`docs/contracts/markdown.md`と`docs/references/markdown-output.md`を正本とし、本書は`.prose` / `.about-prose`上の読書面余白だけを扱う。

## 1. Status

- Type: Normative for Design System patterns
- Source of truth: Design System CSS tokens、SSR CSS contract tests
- Applies to: `.prose`、`.about-prose`、`ui-tabs` panel内の読書本文flow
- Non-goals: Markdown parser / transformerの変更、About専用表示調整、router / URL / hydration / search / TOCの再定義

## 2. Flow Tokens

- `--reading-flow-space`は段落以外も含む読書block遷移の既定余白である。
- `--reading-paragraph-space`は連続する段落同士、つまり`p + p`専用の余白である。
- `--reading-flow-space`は後方互換性のため削除、rename、値変更をしない。
- `--reading-body-size`、`--reading-body-line-height`、`--reading-measure`は本文スケール契約であり、段落間余白の調整理由で変更しない。

## 3. Paragraph Flow

`.prose` / `.about-prose`直下の`p + p`は`--reading-paragraph-space`を使う。
短文段落が続く場合でも、段落間の休止を保ちながら、表、図、コード、引用、callout、リストなどのblock遷移よりは控えめに見せる。

同じ契約は`ui-tabs` panel内の直下`p + p`にも適用する。
tabsは読書面内の一時的な表示容器であり、panel内の連続段落だけが別密度になるべきではない。

## 4. Block Flow

段落以外の読書block遷移、または段落から表、図、コード、引用、callout、リストなどへ移る余白は`--reading-flow-space`を維持する。
段落間余白を詰めるために、汎用flow ruleの対象を狭めたり、非段落blockの余白を減らしたりしない。

## 5. Ownership Boundaries

- このpatternはDesign System CSSが所有する。
- Aboutページだけに限定したselectorやcontent側のworkaroundは使わない。
- Markdown authoring guideは書き方の補足であり、本patternを上書きしない。
- JSで段落の行数を測定して余白を変えない。

## 6. Acceptance Criteria

- `.prose` / `.about-prose`直下の`p + p`が`--reading-paragraph-space`を使う。
- `ui-tabs` panel内の直下`p + p`も`--reading-paragraph-space`を使う。
- 非段落block遷移は`--reading-flow-space`を維持する。
- About専用hack、Markdown parser変更、runtime測定を導入していない。
