# Reading Block Intrusion Pattern

この文書は、本文の読書 block に UI 補助要素を入れるかどうかを判断する Design System pattern である。
機能契約は `docs/contracts/reading-chrome.md` と各 component / contract docs を正本とし、本書は intrusion 判断だけを扱う。

## 1. Status

- Type: Normative for Design System patterns
- Source of truth: reading chrome contract、component docs、SSR / browser visual structure tests
- Applies to: note body 周辺の trigger、inline affordance、TOC / search / diagnostics の補助表示
- Non-goals: Markdown authoring 記法、router / search / note semantics の再定義、component 固有属性の網羅

## 2. Intrusion Levels

- `none`: 本文 block へ介入しない。既定はこの状態。
- `adjacent`: 本文外の chrome として隣接表示する。TOC、header trigger、search trigger は原則この扱い。
- `inline-support`: 本文理解に直接必要な補助だけを本文内へ置く。
- `blocking`: 本文読書を覆う。Dialog や panel など、明示操作時だけ許容する。

## 3. Decision Rules

- 補助 UI が本文の意味を変えるなら Design System pattern ではなく content / Markdown contract の検討対象にする。
- 読書中に常時見える補助 UI は `adjacent` 以内に抑える。
- `blocking` は明示操作、focus management、escape / close、focus return が定義される場合に限る。
- Diagnostics は読書本文へ inline で注入しない。

## 4. TOC And Search

- TOC は本文構造から導出される navigation chrome であり、本文 block の authoring 資産へ戻さない。
- Search dialog は reading surface への到達補助であり、検索結果選択後の return は adapter が担う。
- Mobile TOC panel は `blocking` に近い一時 surface だが、header を覆わず、本文構造を置き換えない。

## 5. Acceptance Criteria

- 本文 block へ入れる必要がある UI と、隣接 chrome で足りる UI が分離されている。
- 補助 UI の都合で Markdown や frontmatter を汚染していない。
- Blocking surface には閉じ方と focus return がある。
- 本書が機能 Contract を上書きしていない。
