# Reading Chrome Pattern

この文書は Design System pattern としての reading chrome を定義する。
機能契約は `docs/contracts/reading-chrome.md`、router / search / hydration の意味論は各 `docs/contracts/**` を正本とし、本書は見え方と配置判断だけを扱う。

## 1. Status

- Type: Normative for Design System patterns
- Source of truth: `docs/contracts/reading-chrome.md`、TOC component docs、browser / ssr / e2e tests
- Applies to: note header trigger、desktop TOC、mobile TOC panel、search return affordance、diagnostic surfaces
- Non-goals: URL state、NavigationEnvelope schema、search ranking、hydration trigger の再定義

## 2. Reading Surface Priority

- Reading chrome は本文の理解を補助する場合だけ視覚的に前へ出す。
- 本文の rhythm を壊す固定 bar、過剰な shadow、強い色面を導入しない。
- Desktop TOC は補助 navigation として扱い、本文より高い階層に見せない。
- ただし、章題・節題の意味が把握できないほど圧縮してはならない。
- Mobile trigger は読書面の入口であり、TOC 内容の owner ではない。

## 3. Trigger And Panel Pattern

- Header trigger は短い label または icon-only へ縮退してよいが、button としての名前・役割・状態は維持する。
- Panel は header 直下から開き、header を覆わない。
- Panel 内の current state は active item の left rail と `aria-current="location"` で示す。
- Close 後の focus return は trigger へ戻す。

## 4. Density Pattern

- TOC density は `compact`、`comfortable`、`expanded` の読書密度で扱う。
- Density は見出し量と階層の読みやすさを調整する視覚入力であり、URL、active id、heading identity を変えない。
- `compact` は長い TOC の scanning を優先し、`expanded` は短い TOC の tap / focus 余白を優先する。
- `compact` は余白を詰める density であり、見出し情報を過剰に欠落させる契約ではない。
- 右 TOC は補助 navigation だが、現在地と章題を実用上把握できるだけの情報量を保持する。
- Desktop TOC、static-first mobile panel clone、Lit `ui-toc` は同じ label wrapping contract に従う。
- Mobile panel は DOM contract hook `[data-layout-toc-mobile-panel]` と CSS styling hook `.layout-toc-mobile-panel` を分離する。

## 5. Diagnostics Pattern

- Diagnostics は開発・検証面の観測材料であり、読書中の UI 文言として常時表示しない。
- Owner candidate や source 欠落の問題を、読者向けの曖昧な空状態へ変換しない。
- Fail-closed の場合も no-JS baseline の本文と static TOC を優先する。

## 6. Acceptance Criteria

- Reading chrome が本文の主従関係を壊していない。
- Trigger、panel、desktop TOC、search return affordance の owner が混同されていない。
- Density tier が視覚密度以外の意味論を持たない。
- 本書が router / search / hydration の機能契約を上書きしていない。
