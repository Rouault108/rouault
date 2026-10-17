# Reading Surface Flow Pattern

この文書は、Rouaultの読書面における本文flow余白と、CSSによる和欧間・和数字間の表示上のアキを定義するDesign System patternである。
Markdown出力の構造契約は`docs/contracts/markdown.md`と`docs/references/markdown-output.md`を正本とし、本書は`.prose` / `.about-prose`上の読書面余白と、`text-autospace`によるJapanese/ASCII visual spacingの継承制御を扱う。

## 1. Status

- Type: Normative for Design System patterns
- Source of truth: Design System CSS tokens、SSR CSS contract tests
- Applies to: `.prose`、`.about-prose`、`[data-tabs-root]` panel内の読書本文flowと、読書面のJapanese/ASCII visual spacingの継承制御
- Non-goals: Markdown parser / transformerの変更、About専用表示調整、router / URL / hydration / search / TOCの再定義

## 2. Flow Tokens

- `--reading-flow-space`は汎用flow ruleが列挙する段落・リスト・表・図・コード・引用・calloutなどの読書block遷移の既定余白である。見出しや区切りなどの専用余白は含めない。
- `--reading-paragraph-space`は連続する段落同士、つまり`p + p`専用の余白である。
- `--reading-flow-space`は後方互換性のため削除、rename、値変更をしない。
- `--reading-body-size`、`--reading-body-line-height`、`--reading-measure`は本文スケール契約であり、段落間余白の調整理由で変更しない。

## 3. Paragraph Flow

`.prose` / `.about-prose`直下の`p + p`は`--reading-paragraph-space`を使う。
短文段落が続く場合でも、段落間の休止を保ちながら、表、図、コード、引用、callout、リストなどのblock遷移よりは控えめに見せる。

同じ契約は`[data-tabs-root]` panel内の直下`p + p`にも適用する。
tabsは読書面内の一時的な表示容器であり、panel内の連続段落だけが別密度になるべきではない。

## 4. Block Flow

汎用flow ruleが列挙するblockへの遷移は、直下の`p + p`を除き`--reading-flow-space`を維持する。対象selectorは`src/assets/css/main.css`と`src/assets/css/stateful-note-bridges.css`を正本とする。
見出し`h2`〜`h6`への遷移は`--reading-h2-space`〜`--reading-h6-space`、`hr`は専用の余白を持つ。段落・block間余白の区別を、これらの専用ruleへ一般化しない。
段落間余白を詰めるために、汎用flow ruleの対象を狭めたり、非段落blockの余白を減らしたりしない。

## 5. Ownership Boundaries

- このpatternはDesign System CSSが所有する。
- Aboutページだけに限定したselectorやcontent側のworkaroundは使わない。
- Markdown authoring guideは書き方の補足であり、本patternを上書きしない。
- JSで段落の行数を測定して余白を変えない。

## 6. Japanese/ASCII Visual Spacing

読書面では、対応ブラウザーに限り、表示上の和欧間・和数字間アキをCSSの`text-autospace`で扱う。
これは本文データ、Markdown出力、DOM構造、search index、hydration markerを変更しないvisual contractである。

- `body`は`text-autospace: no-autospace`で固定する。
- `.prose` / `.about-prose`だけを`text-autospace: ideograph-alpha ideograph-numeric`へopt-inする。
- 読書面配下の`[data-tabs-root]` hostは表示容器として`no-autospace`へ戻す。
- 読書面配下の`[data-tabs-root] > [data-tab-panel]`だけを読書本文として再opt-inする。
- この`[data-tabs-root]`契約はflow余白契約の拡張ではなく、autospace継承制御だけの追加契約である。
- `code`、`pre`、`kbd`、`samp`、`.katex`、`[data-math]`、`pre[data-code-block]`、`[data-code-block-root]`、`section[data-code-group]`、`[data-score]`は記号的表示として`no-autospace`へ戻す。
- `[data-translation-overlay]`と`.translation-static`の表示テキストは、読書面内の本文補助要素としてautospace継承を許容する。

translation trigger / fallback / overlayに過剰な字間変化がないことを視覚確認する。
個別scopeの追加が必要な場合は、translationの機能契約とautospace継承への影響を確認し、変更範囲を明示して扱う。

未対応ブラウザーでは現状表示を許容し、autospace効果が見えないことをfailure扱いにしない。

## 7. Acceptance Criteria

- `.prose` / `.about-prose`直下の`p + p`が`--reading-paragraph-space`を使う。
- `[data-tabs-root]` panel内の直下`p + p`も`--reading-paragraph-space`を使う。
- 汎用flow ruleのblock遷移は`--reading-flow-space`を維持し、見出し・区切りの専用余白を変更しない。
- About専用hack、Markdown parser変更、runtime測定を導入していない。
- Japanese/ASCII visual spacingは読書面CSSの継承制御だけで扱い、Markdown / DOM / search / hydrationを変更しない。
