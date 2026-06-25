# Reading Chrome Pattern

この文書はDesign System patternとしてのreading chromeを定義する。
機能契約は`docs/contracts/reading-chrome.md`、router / search / hydrationの意味論は各`docs/contracts/**`を正本とし、本書は見え方と配置判断だけを扱う。

## 1. Status

- Type: Normative for Design System patterns
- Source of truth: `docs/contracts/reading-chrome.md`、TOC component docs、browser / ssr / e2e tests
- Applies to: note header trigger、fixed note sidebar surface、desktop note frame outer gutter、desktop TOC、mobile TOC panel、search return affordance、diagnostic surfaces
- Non-goals: URL state、NavigationEnvelope schema、search ranking、hydration triggerの再定義、sidebar tree状態管理、navigation意味論

## 2. Reading Surface Priority

- Reading chromeは本文の理解を補助する場合だけ視覚的に前へ出す。
- 本文のrhythmを壊す固定bar、過剰なshadow、強い色面を導入しない。
- Desktop TOCは補助navigationとして扱い、本文より高い階層に見せない。
- ただし、章題・節題の意味が把握できないほど圧縮してはならない。
- Mobile triggerは読書面の入口であり、TOC内容のownerではない。

## 3. Frame Outer Gutter Pattern

- Reading chromeはviewport edgeに貼り付く管理画面風surfaceではなく、読書を補助する控えめなframeとして扱う。
- Fixed note sidebar surfaceとdesktop TOCの外側余白は、本文を挟む左右の補助chromeとして同じ設計原理で扱う。
- Outer gutterはframe全体の最小値契約であり、wide viewportでは中央寄せにより実際の余白が最小値より大きくなってよい。
- Sidebar item padding、TOC item padding、active rail、TOC indentはそれぞれの役割に合わせて最適化してよいが、outer gutterの代替として扱わない。
- Sidebar treeの状態管理やnavigation意味論は機能契約側の責務であり、このpatternは視覚的な余白とintrusion判断だけを扱う。

## 4. Trigger And Panel Pattern

- Header triggerは短いlabelまたはicon-onlyへ縮退してよいが、buttonとしての名前・役割・状態は維持する。
- Panelはheader直下から開き、headerを覆わない。
- Panel内のcurrent stateはactive itemのleft railと`aria-current="location"`で示す。
- Close後のfocus returnはtriggerへ戻す。

## 5. Density Pattern

- TOC densityは`compact`、`comfortable`、`expanded`の読書密度で扱う。
- Densityは見出し量と階層の読みやすさを調整する視覚入力であり、URL、active id、heading identityを変えない。
- `compact`は長いTOCのscanningを優先し、`expanded`は短いTOCのtap / focus余白を優先する。
- `compact`は余白を詰めるdensityであり、見出し情報を過剰に欠落させる契約ではない。
- 右TOCは補助navigationだが、現在地と章題を実用上把握できるだけの情報量を保持する。
- Desktop TOC、static-first mobile panel clone、Lit `ui-toc`は同じlabel wrapping contractに従う。
- Mobile panelはDOM contract hook `[data-layout-toc-mobile-panel]`とCSS styling hook `.layout-toc-mobile-panel`を分離する。

## 6. Diagnostics Pattern

- Diagnosticsは開発・検証面の観測材料であり、読書中のUI文言として常時表示しない。
- Owner candidateやsource欠落の問題を、読者向けの曖昧な空状態へ変換しない。
- Fail-closedの場合もno-JS baselineの本文とstatic TOCを優先する。

## 7. Acceptance Criteria

- Reading chromeが本文の主従関係を壊していない。
- Trigger、panel、desktop TOC、search return affordanceのownerが混同されていない。
- Density tierが視覚密度以外の意味論を持たない。
- 本書がrouter / search / hydrationの機能契約を上書きしていない。
