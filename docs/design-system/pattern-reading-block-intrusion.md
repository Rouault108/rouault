# Reading Block Intrusion Pattern

この文書は、本文の読書blockにUI補助要素を入れるかどうかを判断するDesign System patternである。
機能契約は`docs/contracts/reading-chrome.md`と各component / contract docsを正本とし、本書はintrusion判断だけを扱う。

## 1. Status

- Type: Normative for Design System patterns
- Source of truth: reading chrome contract、component docs、SSR / browser visual structure tests
- Applies to: note body周辺のtrigger、inline affordance、TOC / search / diagnosticsの補助表示
- Non-goals: Markdown authoring記法、router / search / note semanticsの再定義、component固有属性の網羅

## 2. Intrusion Levels

- `none`: 本文blockへ介入しない。既定はこの状態。
- `adjacent`: 本文外のchromeとして隣接表示する。TOC、header trigger、search triggerは原則この扱い。
- `inline-support`: 本文理解に直接必要な補助だけを本文内へ置く。
- `blocking`: 本文読書を覆う。Dialogやpanelなど、明示操作時だけ許容する。

## 3. Decision Rules

- 補助UIが本文の意味を変えるならDesign System patternではなくcontent / Markdown contractの検討対象にする。
- 読書中に常時見える補助UIは`adjacent`以内に抑える。
- `blocking`は明示操作、focus management、escape / close、focus returnが定義される場合に限る。
- Diagnosticsは読書本文へinlineで注入しない。

## 4. TOC And Search

- TOCは本文構造から導出されるnavigation chromeであり、本文blockのauthoring資産へ戻さない。
- Search dialogはreading surfaceへの到達補助であり、検索結果選択後のreturnはadapterが担う。
- Mobile TOC panelは`blocking`に近い一時surfaceだが、headerを覆わず、本文構造を置き換えない。

## 5. Acceptance Criteria

- 本文blockへ入れる必要があるUIと、隣接chromeで足りるUIが分離されている。
- 補助UIの都合でMarkdownやfrontmatterを汚染していない。
- Blocking surfaceには閉じ方とfocus returnがある。
- 本書が機能Contractを上書きしていない。
