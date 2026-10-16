# Design System実装追従監査（2026-10-16）

この文書は監査時点の照合記録であり、Design Systemや機能Contractを上書きしない。判定基準は`AGENTS.md`の実装 > テスト > docsの優先順位とする。

## 対象と判定の読み方

- 開始時の`main` / `origin/main` / local HEAD: `7314a2500cb5b1f4a9b44c1598cec50eba9744f3`。`git fetch origin main`で最新を確認し、開始時のindex・working tree・untrackedはclean。
- 対象は[目録](../README.md)のDesign System正本7件すべて。前文、Status、各節の箇条書き・通常文・表、Acceptanceを照合した。表のIDは監査内の対応点であり、条項数は文書間で粒度が異なる。
- 根拠はrepository相対path。キー表を使う行も対応する実装・契約・テストを特定できる。テストpathは契約の所在を示し、各行をそのテストだけで完全保証するという意味ではない。
- 再開時の検証ブランチは`verify/design-system-full-audit-20261016`、HEADは`0734b6d7d2fc1a854513d839286c6598d732ea0c`。localとremoteの一致、mainが`7314a250`のままであること、作業ツリーがcleanであることを確認した。
- **文書整合**: 現行実装・契約・テストとの文書上の整合を確認。全ページのWCAG適合や知覚品質を認定する分類ではない。
- **文書修正**: 記述・適用範囲・参照所在を文書だけで補正。前回を含む本監査全体の累積分類であり、今回だけの変更数ではない。実装上の課題の解消とは区別する。
- **実装残件**: 下記IMP-01〜IMP-03のいずれかに対応する未完了事項。同じ課題が複数の条項に関係しても、独立した課題として重複計上しない。
- **条件付き設計規範**: UI・contentの選択や将来変更時に適用する判断規則。文書追従漏れや、現在の実装欠落、ユーザーの回答待ちを意味しない。
- **今回対象外**: デザイン自体の良し悪し、実画面・実機・支援技術での評価、個別内容の品質。今回の文書追従の残件に含めない。既存アクセシビリティ要求は維持し、適合済みとも認定しない。
- 旧集計の302行・手動判断30件は照合の対応行であり、不具合数や全件ユーザー判断待ちの数ではなかった。最新方針に合わせて分類を改め、対象を整理した現在の集計を以下に示す。改訂で除いた条項のIDは再利用しない。

| 分類 | 対応行数 | 読み方 |
| --- | ---: | --- |
| 文書整合 | 243 | 文書上の整合確認 |
| 文書修正 | 19 | 文書だけの補正を反映 |
| 実装残件 | 5 | 複数行をIMP-01〜IMP-03の3件に集約 |
| 条件付き設計規範 | 21 | 適用時の規範。現在の回答待ちではない |
| 今回対象外 | 13 | 評価範囲外。文書追従の残件ではない |
| 合計 | 301 | 照合対応行数であり不具合数ではない |

- 実装、CSS、依存、CI設定、コンテンツ資産は変更しない。`docs/adr/`は歴史的判断として扱い改変しない。既存の対象外変更はなかった。

| 正本文書 | 対応一覧 | 文書の処置 |
| --- | --- | --- |
| [foundations.md](../design-system/foundations.md) | F-00〜F-27 | 変更不要。4層token、実装値、snug=1.35、theme/motion/shellの証拠を保持。 |
| [accessibility.md](../design-system/accessibility.md) | A-00〜A-39（欠番A-29）、A-NEW、A-FOCUS | logical main focusと操作focus、component要件の適用条件、自動検証と手動QAの関係を明確化。 |
| [patterns.md](../design-system/patterns.md) | P-001〜P-108 | 変更不要。リンク種別・metadata・カード・corpus row・状態・overlay・URLを全照合。実装残件は下記3件に集約。 |
| [pattern-reading-surface.md](../design-system/pattern-reading-surface.md) | RS-001〜RS-040 | 汎用flowと見出し/区切りの専用余白を区別し、特定Changeの作業指示を継続規範に更新。 |
| [pattern-reading-chrome.md](../design-system/pattern-reading-chrome.md) | RC-0〜RC-7.4、RC-NEW | native TOC link、具体的契約参照、memo共通範囲、scrollbar gutter、接続中triggerへのfocus returnを追従。 |
| [pattern-reading-block-intrusion.md](../design-system/pattern-reading-block-intrusion.md) | RBI-0〜RBI-5.4 | memo共通範囲と実在する契約への具体参照を補完。intrusion判断自体は変更不要。 |
| [callout.md](../design-system/callout.md) | Callout一覧の全行 | 変更不要。5 kind、静的surface、左線、互換alias/hooks、forced-colorsを照合。 |

## 確定した差異と関連範囲

1. TOC triggerの「buttonとして」は実際の`a[href]`、[Static Header契約](../contracts/static-header-contract.md#toc-trigger)と不一致。native linkとJS panel triggerの二重契約へ修正。
2. 関連機能契約の固定`#static-toc`表記も実装と異なっていた。`shared/toc/layout-toc-static-root-id.ts`がtrim済みruntime IDから`layout-toc-${tocRuntimeId}`を投影し、headerとTOCが共有する。Static Header契約の5箇所を実際のroot fragmentに訂正。`test/ssr/toc-html.test.ts`、`test/e2e/header-no-js.spec.ts`が対応関係を固定する。
3. Reading chrome / intrusionのnoteのみの適用記述と曖昧なcomponent docs参照を、note / memo共通projectionと現行TOC/header/search契約へ追従。`build/projections/reading-page-projection.ts`、`memo-page-projection.ts`、`test/ssr/memo-reading.test.ts`。
4. 汎用flow余白を全非段落blockへ一般化していた箇所を限定。見出しh2〜h6とhrは専用余白。`main.css`、`stateful-note-bridges.css`、`test/ssr/reading-surface-flow-css-contract.test.ts`。
5. Accessibilityのlogical main focus例外は`main.css`の意図コメントと`test/e2e/not-found-page.spec.ts`に明示されていた。操作対象へのfocus要求を維持して区別を記載。手動QAを自動合否から除外しないようVerificationを明確化。
6. Chromeの位置安定性は[Reading Chrome契約](../contracts/reading-chrome.md)のViewport Scrollbar Gutterと`test/ssr/static-css-contracts.test.ts`に既存の規定がある。root gutter / body scroll lockの責務をpatternにも補完。実装は変更しない。

## 未完了の実装課題（3件）

今回は課題の整理のみを行い、実装・CSSは変更しない。条件付き設計規範や対象外の品質評価をこの一覧に追加しない。

| ID / 課題 | 対応条項 | 根拠と未完了の内容 |
| --- | --- | --- |
| IMP-01 / Copy buttonの未定義focus token | A-12/A-13/A-19、Callout Visual 8 | `src/assets/css/static-copy-button.css:27`は未定義`--focus-ring`をoutline shorthandへ使用し、`tokens.css`が定義するのは`--focus-ring-color`。既存の代表syntax-card DOM＋source CSSのChromium smokeでbutton/祖先ともoutline・box-shadowがnone。未定義参照の解消は実装残件であり、今回修正しない。全画面の品質評価を別の残件として追加しない。 |
| IMP-02 / Sidebar overlayの未定義z-index token | P-091 | `src/assets/css/layout-sidebar.css`は未定義`var(--z-overlay, 100)`を使用し、`tokens.css`は`--z-blocking-layer`等を提供。fallbackがあるため直ちに表示不具合とは断定しないが、共有語彙への適合を実装課題として残す。 |
| IMP-03 / Permanent URL未実装 | P-098/P-099/P-101 | 現行repositoryにはarchive生成・保存・配信・専用UIの経路がなく、Permanent URLは未実装。契約文書の存在、archive routeの除外処理、一般copy UI、media用R2公開は実装済みの証拠にならない。外部実装済みとする証拠もない。規範を撤回せず、新規実装や旧計画の復活は行わない。 |

### Permanent URLの実装状態と履歴根拠

- `128ecb7acf19faca5d0dc484d6e24a89e78efdb4`の親commitのREADMEには「フェーズ7: パーマリンクシステム」があり、全7タスクの状態欄は空欄だった。これは未完了の計画であり、提供済み機能の一覧ではない。同commitで計画がREADMEから削除された。
- `8ff0b92522d39306834a66077f55081c3b448981`は文書再編として`docs/contracts/permanent-url.md`を新設したcommit。契約の新設を機能実装の証拠にしない。
- 現行treeの`src/`、`shared/`、`build/`、`scripts/`、`test/`と、`eleventy.config.ts`、`velite.config.ts`、`package.json`、`wrangler.jsonc`、`.github/workflows/ci-cd.yml`を再照合した。`src/components/app/navigation/primary-tab-url-state.ts`の`/archives/`は通常noteのtab state scopeからの除外だけであり、archiveの生成・route・配信ではない。テストのarchive URL fixtureも提供経路ではない。
- Buildは`src/notes.11ty.ts`等のページ投影、`build/navigation/internal-document-routes.ts`と`build/navigation/static-document-routes.ts`のroute集合、`scripts/run-build-process.ts`のbuild段階を確認。archive snapshot/hash生成や`permalinks.json`の生成はない。`wrangler.jsonc`はPagesの`dist`出力を設定し、archive用Worker handlerやbindingを定義しない。
- CIのR2公開をarchiveと混同しない。`scripts/upload-r2-media.ts`と`shared/media/`の契約はmedia公開を所有し、Permanent URL archiveの保存・配信を提供しない。外部実装の存在を示す接続設定・artifact・実行結果は得られていない。
- [Note Metadata契約§8](../contracts/note-metadata.md#8-known-inconsistency)の`updated_at` / `updated`は、hash対象除外と現行metadata名をどう対応させるかという設計上の整理である。実装済みhash処理の不具合や追加の独立した実装残件とは扱わない。`docs/contracts/permanent-url.md`のhash対象・正規化・生成規則は今回変更しない。

### 条件付き規範と今回対象外

本文に置くUIの必要性、kindの選び方、視覚確認後にだけ許容するpaddingなどは条件付き設計規範である。現在のUIや個別contentの良否を全件判断する作業は今回行わず、文書追従の完了条件に追加しない。実画面・実機、AT、zoom、全surfaceのcontrast/target size、translation字間、段落の休止、chromeの視覚的主従の評価も今回対象外である。要求そのものは各正本に維持する。

Copy smokeの再現条件: `src/assets/css/main.css`の相対`@import`を再帰展開してChromiumへ読み込み、次の代表fixtureにkeyboard Tabでfocusする（実生成page E2Eではない）。

```html
<section class="syntax-card">
  <header class="syntax-card__header">
    <span class="syntax-card__name">Example</span>
    <span class="static-copy-control">
      <button class="static-copy-button syntax-card__copy-action" data-copy-enhanced="true">Copy</button>
    </span>
  </header>
</section>
```

`getComputedStyle(button)`の結果は`outlineStyle: "none"`、`boxShadow: "none"`、`getPropertyValue('--focus-ring'): ""`、`button.matches(':focus-visible'): true`。祖先もoutline/box-shadowなし。standalone code surfaceの親focus-within表示まで一律に不可視とは判断しない。

## 前回検証と参照追跡

- ローカルSSR: `pnpm run test:ssr --run`、83 files / 605 tests passed。tokensの文書文字列契約、static-first docs、TOC/header、reading flow、callout、metadata/card/corpus等を含む。
- 関連Node: `pnpm exec vitest run --project node test/node/remark-rouault-directives.test.ts test/node/native-note-output.test.ts test/node/native-tabs-output.test.ts test/node/testing-taxonomy-contract.test.ts`、4 files / 125 tests passed。
- Node全体再検証: `pnpm run test:node --run`、136 files / 1243 tests passed / 1 skipped。skipは合格に含めない。
- 初回CIで新監査文書の日本語ASCII境界スペース370箇所が既存表記規約testに抵触したため、既存detectorに従い空白だけを補正。独立デルタレビューで条項・根拠・コード・リンク・表構造の不変を確認し、上記Node全体で再検証した。
- 文書修正後の関連SSR再検証: tokens / static-first-docs / TOC HTML / static-header parse5 / reading flowの5 files / 54 tests passed。
- 関連Browser: `ROUAULT_BROWSER_TEST_BROWSERS=chromium pnpm exec vitest run --project='browser-*' test/browser/layout-header-toc-bridge.browser.test.ts test/browser/layout-toc-controller.browser.test.ts test/browser/layout-toc-static-nav.browser.test.ts test/browser/static-copy-button-enhancer.browser.test.ts test/browser/tabs.browser.test.ts`、5 files / 41 tests passed。
- 先行したBrowser全体実行はChromium 61 files / 567 testsが通過した一方、Firefox接続timeoutでexit 1。全体実行は不合格であり、未実行Firefoxを合格に数えない。CIの全browser検証と区別する。
- 目録・7正本・変更したHeader契約・本監査の10文書で、当時の具体path 500箇所とrelative link 28箇所の存在を確認。`git diff --check`も成功。
- 独立レビューは正本7件とdiff・根拠の再照合を実施。重大な新規矛盾はなく、監査内の3件のcross-reference訂正と新規条項の配置改善を反映。未解決の実装3件は独立にも再確認した。
- 専用検証ブランチへのcommit/push後、既存`ci-cd`の`workflow_dispatch`を使用する。`scripts/ci/classify_changes.py`はdispatch時にfull runを選ぶため、docs-onlyのskippedで済ませない。deployはmainへのpush条件なので実行対象外。CIのrun URL・終端結果はcommitの外部検証証跡として最終報告へ添付する。
- 7文書と目録の具体的参照先を追跡。`src/not-found/not-found-page.ts`と`src/components/not-found/not-found-page.ts`は両方現存し用途が異なる。削除済みpathと誤認しない。曖昧なTOC/component docs参照は現行Contractの具体pathへ変更。ADRの現行仕様への書換えは行わない。

## 再開後の検証

- `pnpm run test:node --run`: 136 files / 1243 tests passed / 1 skipped。skipは合格件数に含めない。
- `pnpm exec vitest run --project ssr test/ssr/tokens-css-contract.test.ts test/ssr/static-first-doc-contracts.test.ts`: 2 files / 14 tests passed。
- 独立デルタレビューで、履歴根拠と未実装判定、5分類の再集計、hash規範とアクセシビリティ要求の維持、品質評価を今回残件から外す整理を確認。重大な矛盾・範囲逸脱なし。指摘された旧表現を今回対象外またはIMP-01へ統一した。
- 11文書の具体path 507箇所とrelative link 29箇所の存在、対応行と表構造、`git diff --check`を確認。既存CIの終端結果とrun URLは、当該commitの外部検証証跡として最終報告に添付する。

## Foundations / Accessibility根拠キー

- F1: `src/assets/css/tokens.css`（primitive/semantic/reading/nav recipes/shell dimensions、root light/dark/system、forced-colors、reduced-motion）。`test/ssr/tokens-css-contract.test.ts`はsnug=1.35、touch=24pxの文書一致とtheme/recipe/forced-colorsを固定。
- F2: `src/assets/css/main.css`（reset/prose/reading typography、global focus、main logical focus）、`src/assets/css/stateful-note-bridges.css`（tabs panel reading flow）、`src/assets/css/about-shell.css`。`test/ssr/reading-surface-flow-css-contract.test.ts`、`test/ssr/static-css-contracts.test.ts`。
- F3: `src/assets/css/layout-header.css`、`src/assets/css/layout-sidebar.css`、`src/assets/css/layout-toc.css`、`src/assets/css/router-shell.css`、`src/assets/css/note-shell.css`。`test/ssr/static-css-contracts.test.ts`、`test/ssr/header-theme-quiet-contract.test.ts`、`test/ssr/layout-toc-css-contract.test.ts`、`test/e2e/note-frame-balance.spec.ts`、`test/e2e/header-layout-contract.spec.ts`。
- F4: `docs/contracts/theme.md`、`src/theme/theme-manager.ts`、`src/theme/theme-document-bootstrap.ts`、`test/browser/theme-manager.browser.test.ts`、`test/browser/theme-document-bootstrap.browser.test.ts`、`test/ssr/tag-theme-token-contract.test.ts`。
- A1: `docs/contracts/static-first-and-no-js.md`、`src/layouts/BaseLayout.11ty.ts`、`src/layouts/layout-header-html.ts`、`src/layouts/search-page-html.ts`、`src/client/post-hydrate/search-page-enhancer.ts`、`test/ssr/base-layout.test.ts`、`test/e2e/header-no-js.spec.ts`、`test/e2e/native-note-baseline.spec.ts`、`test/e2e/search-cutover.spec.ts`、`test/e2e/translation-no-js.spec.ts`。
- A2: `src/client/post-hydrate/static-header-menu-controller.ts`、`src/client/post-hydrate/search-dialog-dom-controller.ts`、`src/client/post-hydrate/native-dialog-helpers.ts`、`src/components/layout/layout-toc-mobile-controller.ts`、`src/components/layout/layout-sidebar-controller.ts`。`test/e2e/header-interaction.spec.ts`、`test/e2e/header-layout-contract.spec.ts`、`test/browser/search-dialog-lifecycle.browser.test.ts`、`test/browser/ui-dropdown/dropdown-command.browser.test.ts`、`test/browser/layout-sidebar-enhancer.browser.test.ts`。
- A3: `src/client/post-hydrate/tabs-enhancer.ts`、`src/components/ui/tabs/tabs-dom.ts`、`src/assets/css/tabs.css`。`test/browser/tabs.browser.test.ts`（selected/controls/labelledby、manual/automatic keyboard）、`test/node/native-tabs-output.test.ts`（native baseline）、`test/e2e/toc-tabs.spec.ts`。
- A4: `src/components/app/controllers/router-document-host-post-render-controller.ts`、`src/components/app/router-document-host.ts`、`src/router/focus-manager.ts`、`docs/contracts/router.md`、`docs/contracts/router-document.md`、`docs/contracts/reading-position.md`、`test/e2e/history-scroll-restoration.spec.ts`、`test/e2e/skip-link.spec.ts`、`test/e2e/not-found-page.spec.ts`。
- A5: `src/layouts/search-dialog-html.ts`、`src/layouts/search-page-html.ts`、`src/client/post-hydrate/search-dialog-dom-controller.ts`、`src/client/post-hydrate/search-page-controller.ts`、`src/layouts/empty-state-html.ts`、`docs/contracts/static-empty-state.md`。`test/browser/search-dialog-status.browser.test.ts`、`test/browser/search-page-tag-state.browser.test.ts`、`test/node/empty-state-html.test.ts`、`test/ssr/search-dialog-static-contract.test.ts`。
- A6: `src/assets/css/video.css`、`src/client/post-hydrate/video-controller.ts`、`src/assets/css/code-surfaces.css`、`docs/contracts/code-surfaces.md`、`test/browser/video.browser.test.ts`、`test/e2e/native-note-baseline.spec.ts`、`test/e2e/code-surface-contrast.spec.ts`、`test/e2e/code-line-state-accessibility.spec.ts`。
- A7: `shared/static-copy-button-html.ts`、`src/client/post-hydrate/static-copy-button-enhancer.ts`、`src/assets/css/static-copy-button.css`、`build/rehype/rouault-components.ts`。`test/node/static-copy-button-html.test.ts`、`test/browser/static-copy-button-enhancer.browser.test.ts`、`test/ssr/static-css-contracts.test.ts`。
- A8: `docs/contracts/testing-taxonomy.md`、`package.json`、`vitest.config.ts`、`playwright.config.ts`、`tools/ui-check/README.md`。既存自動テストはmanual AT/zoomの実施記録の代替ではない。

## Foundations全条項

| ID / 節 | 条項 | 判定 | 根拠・確認範囲 |
| --- | --- | --- | --- |
| F-00 / 冒頭 | 設計語彙/token architectureの正本、具体値は実装正本 | 文書整合 | F1のfile headerも当文書へ参照。token一覧の重複管理なし。snugだけ明示契約（F-15）。 |
| F-01 / 1 | Normative / Source of truth | 文書整合 | F1–F3。tokensとstyle/testが実装事実の所在。 |
| F-02 / 1 | Applies color/type/motion/spacing/shell/theme、component固有・機能契約は非対象 | 文書整合 | F1全領域を定義し、F4がtheme機能を別所有。 |
| F-03 / 2 | tokenを4層で扱う | 文書整合 | F1にPrimitive/Semantic/Shared Navigation Grammar/TOC・Sidebar Recipe/Layout Dimensionsを確認。物理ファイル分割を要求しない分類。 |
| F-04 / 2 | Primitive raw scale、原則component直接参照せず | 条件付き設計規範 | F1のchroma/space/text scale。F3等はsemantic/recipeを中心に使いつつspace等を直接参照。例外禁止ではなく設計時原則なので既存参照を違反と断定しない。 適用時の規範として保持し、現時点の判断待ち課題には数えない。 |
| F-05 / 2 | Semantic foreground/surface/border/focus/danger | 文書整合 | F1にfg/bg/border/focus-ring/danger群。F3・A6から参照。 |
| F-06 / 2 | Pattern overlay/control/reading surface | 文書整合 | F1のcontrol-*、reading-*、nav/toc/sidebar recipes。F2/F3が参照。overlayにはcomponent-private recipeもあり、本節はtoken命名を全列挙する契約ではない。 |
| F-07 / 2 | Application Shell Constants | 文書整合 | F1のheader-height/sidebar-width/note-shell/content/page-shell/bp/z群、F3。 |
| F-08 / 2 | Componentはsemantic/patternを優先、primitive参照はsemantic化検討 | 条件付き設計規範 | F1–F3が責務を分離。『検討したか』という開発判断履歴そのものは実装から証明できないが、現行設計原則として矛盾なし。 適用時の規範として保持し、現時点の判断待ち課題には数えない。 |
| F-09 / 3 | 本文で強い色面/影/装飾contrastを避ける | 条件付き設計規範 | F2 prose、F3 quiet chrome、F1 low-salience recipes。視覚的な静けさの最終評価は今回対象外。 適用時の規範として保持し、現時点の判断待ち課題には数えない。 |
| F-10 / 3 | Light/darkの同一semantic role | 文書整合 | F1 root override、F4、`tokens-css-contract`のtheme経路固定。 |
| F-11 / 3 | Forced-colorsは境界/状態/focusを優先 | 文書整合 | F1 Canvas/CanvasText/Highlight+outline、F3のforced-color border/focus。IMP-01の実装残件とA-19/A-25の今回対象外を区別する。 |
| F-12 / 3 | Component固有色運用はcontracts | 文書整合 | `docs/contracts/theme.md`、`docs/contracts/code-surfaces.md`、`docs/contracts/static-header-contract.md`とF3/A6。 |
| F-13 / 4 | 本文とUI typography分離 | 文書整合 | F1 reading-*がtext-*へ投影、F2 prose、F3 UI recipe。 |
| F-14 / 4 | Reading長文可読性/行長/行間/見出し階層 | 条件付き設計規範 | F1 reading-measure/body/h2–h6、F2とreading-surface-flow test。個別内容の自然言語の可読性評価は今回対象外。 適用時の規範として保持し、現時点の判断待ち課題には数えない。 |
| F-15 / 4 | UI scan/状態/control label、実値は実装、snug=1.35 | 文書整合 | F1 text/font/line-height UI recipes。`tokens-css-contract.test.ts`がsnugと文書を直接検証。 |
| F-16 / 5 | Motionは状態理解を助ける場合に限る | 条件付き設計規範 | F1 adaptive-focus/flash、F3/A6状態遷移。意図の全ケース証明ではなく現行原則との矛盾なし。 適用時の規範として保持し、現時点の判断待ち課題には数えない。 |
| F-17 / 5 | Reduced motionで移動/連続性/時間差を抑える | 文書整合 | F1 global duration/iteration強制抑制、F2 scroll、F3/A6固有reduce規則。`button-state-css-contract.test.ts`もcontrol transition noneを固定。 |
| F-18 / 5 | 読書を妨げる常時animationを導入しない | 条件付き設計規範 | F1には未使用shimmer keyframesが残るが存在だけはanimation起動ではない。`static-css-contracts`はremoved skeleton CSS不在を固定。reading contentに常時演出を追加する規定なし。映像等の体感評価は今回対象外。 適用時の規範として保持し、現時点の判断待ち課題には数えない。 |
| F-19 / 6 | a11y正本はaccessibility.md | 文書整合 | A8 taxonomyも同文書をa11y ownerとして指定。 |
| F-20 / 6 | Foundationはfocus/contrast/forced-colors語彙のみ | 文書整合 | F1 token、F3/component実装が挙動、A2/A4がfocus ownership。 |
| F-21 / 6 | Componentは横断a11yを上書きしない | 文書整合 | Design System callout.mdは内側native control focusを維持し、feature contractsが詳細を定義。実装問題は規範緩和で解消しない（A-13）。 |
| F-22 / 7 | header/sidebar/content/breakpoint/zはshell constants | 文書整合 | F1/F3、`static-css-contracts`のmedia boundary/frame/header ownership。 |
| F-23 / 7 | shell constantsをcomponent固有見た目として増やさない | 条件付き設計規範 | F1 shell dimensionsとF3がshell ownerに閉じる。これは設計規則であり過去の全変更意図の証明ではない。 適用時の規範として保持し、現時点の判断待ち課題には数えない。 |
| F-24 / 7 | Sidebar state ownerはsidebar-state.md | 文書整合 | `docs/contracts/sidebar-state.md`、`src/components/layout/layout-sidebar-controller.ts`、`src/components/layout/layout-sidebar-tree-state.ts`、`test/node/layout-sidebar-controller.test.ts`、`test/node/layout-sidebar-tree-state.test.ts`。 |
| F-25 / 8 | 値一覧でなく語彙正本 | 文書整合 | F-00・F-15。既知のsnug契約1値を除きscale表を複製しない。 |
| F-26 / 8 | 参照token層が明確 | 文書整合 | F-03–F-08とF1実装分類。 |
| F-27 / 8 | A11y/Patterns/Componentと責務分離 | 文書整合 | F-19–F-21、patterns.md、各feature contracts。Foundationsの文書変更は不要。 |

## Accessibility全条項

| ID / 節 | 条項 | 判定 | 根拠・確認範囲 |
| --- | --- | --- | --- |
| A-00 / 冒頭・1 | 横断正本、Guide/ADR/componentが上書きしない、Normative/source/applies/non-goals | 文書整合 | A8、F1。Sourceにmanual QAが明記され、全属性・test taxonomyを再定義しない。 |
| A-01 / 2 | WCAG2.1 AA最低基準 | 今回対象外 | AGENTS.mdと一致する規範。A1–A8は部分的証拠のみ。screen reader/zoom/全surfaceのWCAG適合監査は今回未実施で、適合済みと断言しない。 この評価は今回対象外であり、文書追従の残件には含めない。 |
| A-02 / 2 | WCAG2.2 target/focusを可能な範囲で採用 | 条件付き設計規範 | F1 touch24px、F3 focus target幾何、A6 computed contrast。全達成宣言ではなく採用方針。 適用時の規範として保持し、現時点の判断待ち課題には数えない。 |
| A-03 / 2 | Semantic HTML優先、ARIAは補足 | 文書整合 | A1 header a/details/summary、search native form/input/button、A3 native baseline、A6 video native fallback。 |
| A-04 / 2 | no-JS/static-first情報構造維持 | 文書整合 | A1の契約とno-JS各E2E。JS全文検索parityは求めない。 |
| A-05 / 2 | capability成立前/初期化不能は視覚/focus/AT露出を揃え、anchor/SSR保持 | 文書整合 | A1 search hidden controls/SSR navigation、copy hidden+disabled baseline(A7)、`test/e2e/search-cutover.spec.ts`、`test/browser/search-dialog-lifecycle.browser.test.ts`のunavailable anchor既定遷移。 |
| A-06 / 3 Semantics | landmark/heading/list/form/button/link native優先 | 文書整合 | A1 BaseLayout canonical main/skip link/header、A5 searchフォーム、A3 tabs native baseline。`base-layout.test.ts`、`native-tabs-output.test.ts`。 |
| A-07 / 3 Semantics | 名前・役割・状態をATへ露出 | 文書整合 | A2 name/expanded/controls、A3 selected/labelledby、A5 combobox/busy/status、A6 pressed/range。実機ATでの読み上げ品質評価は今回対象外（A-01/A-35）。 |
| A-08 / 3 Semantics | 見た目だけで情報構造を表さない | 文書整合 | A1 native landmarks/headings、A3 relations、A6 code stateのmark/ins/del semantic wrapper。`code-line-state-accessibility.spec.ts`はSSR/no-JS表面を検証しmanual ATを代替しない。 |
| A-09 / 3 Keyboard | 全操作要素をkeyboardで到達・操作 | 今回対象外 | A2/A3/A6で代表契約がテスト化済み。任意全surface・全browser保証は未確認。`skip-link.spec.ts`等のWebKit Tab関連skipは明示的な対象外であり合格には数えない。 この評価は今回対象外であり、文書追従の残件には含めない。 |
| A-10 / 3 Keyboard | DOM/read orderから予測可能なfocus順序 | 文書整合 | A1 skip/canonical main、A2 menus、A3 roving tabs、A6 video DOM/視覚順のbrowser+E2E。完全な全ページ順序検査ではない。 |
| A-11 / 3 Keyboard | Esc/Arrow/Enter/Spaceはcomponent pattern | 文書整合 | A2 header/menu/dropdownのkey handling、A3 tabs manual/automatic、A6 video。`dropdown-command.browser.test.ts`はHome/End/Arrow/typeahead/Escape/Enter/Spaceを検証。 |
| A-12 / 3 Focus | Focus visibleを消さない | 文書修正 | 修正済み: F2 main.css:491–503は非操作要素main#main-contentのlogical focus ringを意図的に除去。A4 `not-found-page.spec.ts:144–146`がnone/0/noneを固定。操作可能要素の可視focus維持とcanonical mainの論理到達先の区別を本文に追記した。さらにA-13のcopy実装問題を規範緩和で隠さない。 |
| A-13 / 3 Focus | Ringがforced-colors/darkで視認 | 実装残件 | F1/F3/A6に配慮と代表tests。ただしA7 `static-copy-button.css:27`の`outline: 2px solid var(--focus-ring)`は未定義token参照（rootは`--focus-ring-color`）。source全CSSのChromium computed smokeでsyntax-card copy自身/祖先のoutline/box-shadowがnone。実装修正は範囲外。後述再現・出力あり。 |
| A-14 / 3 Focus | dialog/popover/overlayはfocus returnを定義 | 文書整合 | A2 native helpers/controller+tests。`translation-overlay-enhancer.ts`と`test/browser/translation.browser.test.ts`はEscape時のみreturn、outside pointerはclick先focusを奪わないことを固定。すべてのcloseで無条件returnする要求ではない。 |
| A-15 / 3 Target | 最低24×24・推奨44×44 | 今回対象外 | F1値/文書一致はtokens-css-contractで保証。F3 header、TOC min size、A6 video、A7 copy32px。全主要controlの実測/zoom/coarse pointer・例外判断は未実施。44を既定最低値とは扱わない。 この評価は今回対象外であり、文書追従の残件には含めない。 |
| A-16 / 3 Target | 高密度でも誤操作を避けるspacing | 今回対象外 | F1/F3 gap/padding、TOC compact24pxなどの根拠はあり、実機pointer/zoomでの全surface手動確認は未実施。 この評価は今回対象外であり、文書追従の残件には含めない。 |
| A-17 / 3 Target | `--control-min-touch`=24px | 文書整合 | F1 `tokens-css-contract.test.ts`が定義と文書table文字列を直接assert。 |
| A-18 / 3 Contrast | 色だけで状態識別しない | 文書整合 | A2 expanded/current/pressed、A3 selected semantics、A6 code state wrappers＋marker surface、F1 forced outline。全状態の視覚非色識別はmanual範囲が残る。 |
| A-19 / 3 Contrast | Text/icon/focus/border必要contrastをthemeで満たす | 今回対象外 | A6 video light/dark4.5以上、code contrast、F1 accessible control colors、F3 header focus computed tests。全surface/全色の網羅測定は未実施。A-13に実装差異もあり適合宣言しない。 この評価は今回対象外であり、文書追従の残件には含めない。 |
| A-20 / 3 Motion | reduced-motion尊重 | 文書整合 | F1 global rules、F2 scroll、F3 header/sidebar、A6 video、`button-state-css-contract.test.ts`。 |
| A-21 / 3 Motion | 常時animation/強視差/読書阻害を避ける | 文書整合 | F-16–F-18。media content自体のユーザー体感評価はmanual。 |
| A-22 / 3 Live | nav/validation/loadingなどの状態は必要時のみ通知 | 文書修正 | A4のfull commit announcement、A5のconditional loading/status、A6のvideo liveに対応する個別通知の要件。既存の通知要求を維持し、専用UIの実装を推定しない。 |
| A-23 / 3 Live | announcementはcoreでなくpost-commit/UI adapter | 文書整合 | A4 post-render controllerがsetAnnouncementを呼ぶ。router.ts coreはpostCommit.runを呼ぶだけ。`src/router/router-announcer.ts`は現行callsiteが見つからないため実働根拠として採用しない。 |
| A-24 / 3 Forced | native keywords/outline/borderで状態維持 | 文書整合 | F1 CanvasText/Highlight、F3 header/TOC/sidebar、A6 code/video forced rules、tokens/static CSS tests。copy tokenはIMP-01に集約し、実画面の視認評価は今回対象外。 |
| A-25 / 3 Forced | bg-image/box-shadowだけに境界依存しない | 今回対象外 | F1 forced outline、F3 border、A6 forced code rule等。全surfaceの実観察なし。copy focus token問題もあり横断達成の断定不可。 この評価は今回対象外であり、文書追従の残件には含めない。 |
| A-26 / 4 Dialog | trap/initial/Escape/return定義 | 文書整合 | A2 native dialog showModalとsearch初期input、cancel/close pipeline、capture/restoreTriggerFocus。`search-dialog-lifecycle.browser.test.ts`、`header-interaction.spec.ts`。custom trap再実装は要求していない。 |
| A-27 / 4 Dropdown | trigger関係/key/outside close定義 | 文書整合 | A2 static header、`src/components/ui/overlay/internal/anchored-overlay-controller.ts`、dropdown-command tests、`test/e2e/search-page.spec.ts`。 |
| A-28 / 4 Tabs | selected/panel関係露出 | 文書整合 | A3 browser testsがaria-selected/aria-controls/aria-labelledbyを直接確認。 |
| A-30 / 4 Form | label/description/error関連付け | 文書整合 | A5 search native labels、tag checkbox description/status、combobox instructions/busy。専用validation error formを実装済みとは主張しない。全AT読み上げはA-35。 |
| A-31 / 4 Icon Button | 必須accessible name | 文書整合 | A2/A5 search/close、`image-lightbox-enhancer.ts`close aria-label、A6 video、A7 copy label。対応testsはA2/A5/A6/A7。全ビルド出力内全buttonの機械走査は未実施。 |
| A-32 / 4 Loading/Skeleton | busy/no-JS考慮 | 条件付き設計規範 | A1/A5 loading/busy/no-JS、A6 video busy。専用skeletonは撤去済み（`test/ssr/static-css-contracts.test.ts:842`はremoved skeleton utility CSS不在をassert）。存在を要求する文ではないが導入時要件という適用範囲注記が有用。 適用時の規範として保持し、現時点の判断待ち課題には数えない。 |
| A-33 / 4 | component詳細はcontracts | 文書整合 | static-header/search/toc/tabs/video/static-empty-state/static-checkbox/code-surfaces等の契約へ分離。 |
| A-34 / 5 | 分類はtesting taxonomy | 文書整合 | A8がSSR構造/computed browser/E2E/no-JS/manualの境界を定義。 |
| A-35 / 5 | 自動に加えkeyboard/AT/forced/reduced/zoom手動 | 今回対象外 | A8。今回は新たなreal AT/zoom手動確認を実施していない。A6 code-surfaces契約のNarrator+Edge/VoiceOver+Safariも自動snapshotで代替不可。 この評価は今回対象外であり、文書追従の残件には含めない。 |
| A-36 / 5 | UI Check観察用、合否はSSR/browser/E2E | 文書修正 | 前条と併読し、自動検証の担当レイヤとしては整合。『合否はSSR/browser/E2Eで』だけだとmanual除外に読めるため『自動検証はSSR/browser/E2E。手動QAと合わせて判定』へ修正済み。UI Check screenshotだけで合格にしない。 |
| A-37 / 6 | 要求をGuide/ADR/Oldに降格しない | 文書整合 | 現行README目録と本書、A8がnormative ownerを維持。履歴ADRは変更不要。 |
| A-38 / 6 | 横断要求をcomponentだけへ分散しない | 文書整合 | 本書が横断semantics/keyboard/focus/contrast/motion等を保持、A2/A3/A5/A6は差分詳細。 |
| A-39 / 6 | componentが要求を弱めない | 文書整合 | 規範として維持。A-13の実装問題は文書を緩めて正当化しない。 |


| ID / 節 | 条項 | 判定 | 根拠・確認範囲 |
| --- | --- | --- | --- |
| A-FOCUS / 3 | logical main focusは操作focusと区別し、ring非表示の例外をbutton/linkへ広げない | 文書修正 | F2の明示コメント、A4 not-found-page.spec.tsのoutline none/0px検査。WCAG適合済み認定ではない。 |
| A-NEW / 4 | Component要件は該当surface実装時の横断要求であり導入済み一覧ではない | 文書修正 | A5/A8、撤去済みskeletonの不在を固定するstatic CSS test。該当surfaceに適用する横断要件として維持する。 |

## Patterns / Reading Surface根拠セット

| 根拠ID | 対応する具体的な実装・契約・テスト |
| --- | --- |
| P-E0 | `docs/contracts/router.md`, `docs/contracts/search.md`, `docs/contracts/note-navigation.md`, `docs/contracts/reading-chrome.md`, `docs/design-system/pattern-reading-chrome.md`, `docs/design-system/pattern-reading-block-intrusion.md`, `docs/design-system/pattern-reading-surface.md`; `shared/url/rouault-url-policy.ts`; `test/node/rouault-url-policy.test.ts`。宣言・委譲先の実在とowner分離を照合。 |
| P-E1 | `docs/contracts/tabs.md`, `docs/contracts/code-surfaces.md`; `build/rehype/native-tabs.ts`, `build/rehype/static-code-groups.ts`, `src/client/post-hydrate/tabs-enhancer.ts`, `src/client/post-hydrate/code-group-enhancer.ts`, `src/assets/css/tabs.css`, `src/assets/css/code-surfaces.css`; `test/node/native-tabs-output.test.ts`, `test/ssr/rehype-static-code-groups.test.ts`, `test/browser/tabs.browser.test.ts`, `test/browser/code-group-enhancer.browser.test.ts`, `test/ssr/static-css-contracts.test.ts`。ADRは判断履歴として参照し現行契約に書換えない。 |
| P-E2 | `src/assets/css/link-primitives.css`, `src/assets/css/result-card.css`, `src/assets/css/link-card.css`; `docs/contracts/sidebar-state.md`, `docs/contracts/router.md`; `test/ssr/prose-link-css-contract.test.ts`, `test/ssr/result-card-css-contract.test.ts`, `test/ssr/link-card-css-contract.test.ts`, `test/browser/layout-sidebar-nav-contract.browser.test.ts`, `test/browser/router-link-interceptor.browser.test.ts`。 |
| P-E3 | `src/assets/css/link-primitives.css:154`, `src/not-found/not-found-page.ts`, `src/components/not-found/not-found-page.ts`, `src/layouts/article-header-source-link.ts`, `src/assets/css/article-header.css`; `test/ssr/metadata-link-css-contract.test.ts`, `test/ssr/article-header-css-contract.test.ts`。限定selector、visited 2 properties、.65 relative color、touch/forced-colors、surface隔離。 |
| P-E4 | `src/layouts/search-page-html.ts:242`, `src/layouts/corpus-page-html.ts`, `src/client/post-hydrate/search-page-controller.ts`, `src/assets/css/result-card.css`, `src/assets/css/link-card.css`; `docs/contracts/markdown.md`; `test/ssr/search-page-static-contract.test.ts`, `test/ssr/corpora-template.test.ts`, `test/ssr/result-card-css-contract.test.ts`, `test/ssr/link-card-css-contract.test.ts`, `test/browser/router-link-interceptor.browser.test.ts`。native anchor、CSS hover/focus source、:has fallbackを照合。 |
| P-E5 | `src/layouts/corpora-overview-html.ts`, `src/assets/css/page-corpora.css:48`; `test/ssr/corpora-index-template.test.ts`, `test/ssr/static-css-contracts.test.ts:3417`, `test/e2e/static-pages.spec.ts`。root/item border、.30 underline、titleだけhover、row focus。inline paddingの視覚的必要性は未確認。 |
| P-E6 | `src/client/post-hydrate/tabs-enhancer.ts`, `src/assets/css/tabs.css`, `src/assets/css/link-primitives.css`; `test/browser/tabs-model.browser.test.ts`, `test/browser/tabs-dom.browser.test.ts`, `test/browser/layout-sidebar-nav-contract.browser.test.ts`。widget selectionとfocus indexの分離、aria-current、:active/:focus-visibleを照合。 |
| P-E7 | `src/client/post-hydrate/search-dialog-dom-controller.ts`, `src/client/post-hydrate/native-dialog-helpers.ts`, `src/components/layout/layout-sidebar-controller.ts`, `src/assets/css/tokens.css:598`, `src/assets/css/layout-sidebar.css:325`; `docs/design-system/accessibility.md`; `test/browser/search-dialog-lifecycle.browser.test.ts`, `test/browser/layout-sidebar-enhancer.browser.test.ts`, `test/browser/layout-sidebar-overlay-layer.browser.test.ts`。close/focus/Escapeは根拠あり。sidebarの未定義--z-overlay使用は未解決。 |
| P-E8 | `src/components/ui/tabs/tabs-url-sync-controller.ts`, `src/components/ui/tabs/tabs-url-sync-strategy.ts`, `src/client/post-hydrate/search-page-controller.ts`, `shared/navigation/normalize-note-navigation-url.ts`; `docs/contracts/tabs.md`, `docs/contracts/search.md`, `docs/contracts/note-navigation.md`, `docs/contracts/router-document.md`; `test/browser/search-page-url-state.browser.test.ts`, `test/browser/primary-tab-url-state.browser.test.ts`, `test/node/note-navigation-path.test.ts`, `test/node/note-navigation-model.test.ts`, `test/node/primary-tab-navigation-policy.test.ts`。 |
| P-E9 | `docs/contracts/permanent-url.md`と本監査「Permanent URLの実装状態と履歴根拠」。未完了の旧計画と文書再編を区別し、現行tree/build/route/wrangler/CIを照合して未実装と確認。`src/components/app/navigation/primary-tab-url-state.ts`と`test/node/primary-tab-navigation-policy.test.ts`はarchive除外の証拠。一般copyの`shared/static-copy-button-html.ts`、`src/client/post-hydrate/static-copy-button-enhancer.ts`、`test/browser/static-copy-button-enhancer.browser.test.ts`は通知の参考でありPermanent URL UIの実装証拠ではない。 |
| P-E10 | `src/layouts/layout-header-html.ts`, `src/client/post-hydrate/layout-header-toc-bridge.ts`, `src/assets/css/layout-header.css`, `src/client/hydration/scheduler.ts`, `src/client/hydration/registry.ts`; `docs/contracts/reading-chrome.md`; `test/browser/layout-header-toc-bridge.browser.test.ts`, `test/e2e/header-static-contract.spec.ts`, `test/ssr/layout-toc-css-contract.test.ts`, `test/ssr/static-css-contracts.test.ts`。 |
| RS-E0 | `docs/contracts/markdown.md`, `docs/references/markdown-output.md`; `src/assets/css/tokens.css:379`, `src/assets/css/main.css:363`, `src/assets/css/stateful-note-bridges.css:29`; `test/ssr/reading-surface-flow-css-contract.test.ts`。CSS限定ownerと共通surfaceを照合。 |
| RS-E1 | `src/assets/css/tokens.css:379`, `src/assets/css/main.css:363`, `src/assets/css/stateful-note-bridges.css:29`; `test/ssr/reading-surface-flow-css-contract.test.ts:172`。flow=space-4、paragraph=space-3、p+p後段override。h2〜h6は専用--reading-hN-space、hrも専用余白。 |
| RS-E2 | `src/assets/css/main.css:209`, `src/assets/css/translation.css`; `test/ssr/reading-surface-flow-css-contract.test.ts:252`。supports内限定、body/prose opt-in、nested tabsの継承、記号要素/子孫除外、translation resetなし。 |
| RS-E3 | `src/assets/css/main.css:209`, `src/assets/css/translation.css`, `tools/ui-check/fixtures/retained-surfaces.ts`, `tools/ui-check/playwright/screenshot.spec.ts`; `test/browser/translation.browser.test.ts`, `test/e2e/translation-no-js.spec.ts`。実際の字間/休止の主観的品質はソース・構造testだけで合格にせず、対応browserでの視覚確認を残す。 |

### patterns.md逐条一覧

| ID | 原文の条項（修正後） | 判定 | 根拠・補足 |
| --- | --- | --- | --- |
| P-001 | 冒頭: この文書はDesign Systemの横断UI patternを定義する正本である。 | 文書整合 | P-E0。 |
| P-002 | 冒頭: URL、routing、search、note identity、Permanent URLの意味論は機能Contractを正本とし、本書はUI patternとしての扱いだけを説明する。 | 文書整合 | P-E0。 |
| P-003 | 冒頭: Reading chromeの機能契約は`docs/contracts/reading-chrome.md`を正本とし、詳細patternは`docs/design-system/pattern-reading-chrome.md`と`docs/design-system/pattern-reading-block-intrusion.md`に分離する。 | 文書整合 | P-E0。 |
| P-004 | 冒頭: 読書面の段落間余白とblock間余白の分離は`docs/design-system/pattern-reading-surface.md`を正本とする。 | 文書整合 | P-E0。 |
| P-005 | 1. Status: Type: Normative for Design System patterns | 文書整合 | P-E0。 |
| P-006 | 1. Status: Source of truth: Design System components、layout patterns、browser/e2e tests | 文書整合 | P-E0。 |
| P-007 | 1. Status: Applies to: link classification、selected/current/active/focused、overlay、URL-aware UI controls、Permanent URL UI | 文書整合 | P-E0。 |
| P-008 | 1. Status: Non-goals: router/search/note/permanent URLの機能契約再定義、component固有の全属性定義 | 文書整合 | P-E0。 |
| P-009 | 1.1 Pattern Index: Reading surface flow: `docs/design-system/pattern-reading-surface.md` | 文書整合 | P-E0。 |
| P-010 | 1.1 Pattern Index: Reading chrome: `docs/design-system/pattern-reading-chrome.md` | 文書整合 | P-E0。 |
| P-011 | 1.1 Pattern Index: Reading block intrusion: `docs/design-system/pattern-reading-block-intrusion.md` | 文書整合 | P-E0。 |
| P-012 | 1.1 Pattern Index: Reading surface flowは本文のCSS余白patternだけを所有する。 | 文書整合 | P-E0。 |
| P-013 | 1.1 Pattern Index: Markdown parser / transformer、About本文データ、router、URL、ARIA、hydration、search、TOCの契約を変更しない。 | 文書整合 | P-E0。 |
| P-014 | 1.1 Pattern Index / Content Tabs / Embedded Code Tabs Boundary: Content Tabsの正本は`docs/contracts/tabs.md`であり、最終HTMLは`section[data-tabs-root]`、操作は`tabs-enhancer`が所有する。 | 文書整合 | P-E1。 |
| P-015 | 1.1 Pattern Index / Content Tabs / Embedded Code Tabs Boundary: `ui-tabs`は内部中間HASTの表現であり、`build/rehype/native-tabs.ts`でnative HTMLへ変換する。 | 文書整合 | P-E1。 |
| P-016 | 1.1 Pattern Index / Content Tabs / Embedded Code Tabs Boundary: 用途は本文構造、説明コンテンツ、主セクション切替である。 | 文書整合 | P-E1。 |
| P-017 | 1.1 Pattern Index / Content Tabs / Embedded Code Tabs Boundary: Embedded Code Tabsの正本は`docs/contracts/code-surfaces.md`であり、実装は`section[data-code-group]`と`code-group-enhancer`である。 | 文書整合 | P-E1。 |
| P-018 | 1.1 Pattern Index / Content Tabs / Embedded Code Tabs Boundary: 用途はcode surface内部の局所切替である。 | 文書整合 | P-E1。 |
| P-019 | 1.1 Pattern Index / Content Tabs / Embedded Code Tabs Boundary: 両者はselected、hover、focus-visible、forced-colorsの識別性を維持する。 | 文書整合 | P-E1。 |
| P-020 | 1.1 Pattern Index / Content Tabs / Embedded Code Tabs Boundary: ただし、同一componentでも同一visual variantでもない。 | 文書整合 | P-E1。 |
| P-021 | 1.1 Pattern Index / Content Tabs / Embedded Code Tabs Boundary: 詳細なcode group surface仕様は本書では再定義せず、`docs/contracts/code-surfaces.md`と対応ADRを参照する。 | 文書整合 | P-E1。 |
| P-022 | 2. Link Classification: Text Linkは本文・説明文中の遷移を表す。 | 文書整合 | P-E2。 |
| P-023 | 2. Link Classification: Control Linkはbutton-likeな操作導線として扱う。 | 文書整合 | P-E2。 |
| P-024 | 2. Link Classification: Block Linkはcardやresult item全体の遷移導線として扱う。 | 文書整合 | P-E2。 |
| P-025 | 2. Link Classification: Sidebar専用linkは`docs/contracts/sidebar-state.md`とcomponent文書の境界に従う。 | 文書整合 | P-E2。 |
| P-026 | 2. Link Classification: RouterのURL正規化は`docs/contracts/router.md`を正本とし、本書では再定義しない。 | 文書整合 | P-E2。 |
| P-027 | 2. Link Classification / Metadata Muted Text Link: `.link-text.link-text--muted[href][data-link-surface='metadata']`に一致するlinkは、metadata面の補助導線variantである。 | 文書整合 | P-E3。 |
| P-028 | 2. Link Classification / Metadata Muted Text Link: CTA、Control Link、Block Link、prose本文リンクではなく、prose本文リンクの代替として使わない。 | 文書整合 | P-E3。 |
| P-029 | 2. Link Classification / Metadata Muted Text Link: このvariantはトップページ専用ではない。 | 文書整合 | P-E3。 |
| P-030 | 2. Link Classification / Metadata Muted Text Link: 同じclass / surfaceの組み合わせを持つ`src/not-found/not-found-page.ts`内のhome-style markupにも、CSS selector上は同じ変更が適用される。 | 文書整合 | P-E3。 |
| P-031 | 2. Link Classification / Metadata Muted Text Link: 通常時・visited時は控えめな`fg-muted`相当の文字色を維持する。 | 文書整合 | P-E3。 |
| P-032 | 2. Link Classification / Metadata Muted Text Link: 下線はbase ruleで常時残し、リンク識別を色だけに依存させない。 | 文書整合 | P-E3。 |
| P-033 | 2. Link Classification / Metadata Muted Text Link: ただし、通常時・visited時の下線色は文字色より弱くする。 | 文書整合 | P-E3。 |
| P-034 | 2. Link Classification / Metadata Muted Text Link: `:visited`ruleは既読差分として`color`と`text-decoration-color`だけを所有し、下線形状はbase ruleへ委ねる。 | 文書整合 | P-E3。 |
| P-035 | 2. Link Classification / Metadata Muted Text Link: hover / focus-visibleでは文字色と下線色を`fg-default`相当に一段上げ、focus-visibleのfocus ringは弱めない。 | 文書整合 | P-E3。 |
| P-036 | 2. Link Classification / Metadata Muted Text Link: touch環境でもprimary色へ昇格しない。 | 文書整合 | P-E3。 |
| P-037 | 2. Link Classification / Metadata Muted Text Link: metadata面では、発見可能性は常時下線で担保し、色による一次導線化を避ける。 | 文書整合 | P-E3。 |
| P-038 | 2. Link Classification / Metadata Muted Text Link: forced-colorsでは弱い下線より視認性を優先し、下線色はsystem colorへ合流させる。 | 文書整合 | P-E3。 |
| P-039 | 2. Link Classification / Metadata Muted Text Link: このvariantは`data-link-surface="metadata"`を持つlink全体へ適用されるわけではない。 | 文書整合 | P-E3。 |
| P-040 | 2. Link Classification / Metadata Muted Text Link: article header source linkなど、独自classと独自CSSで視覚外観を所有するmetadata surface linkとは別分類である。 | 文書整合 | P-E3。 |
| P-041 | 2. Link Classification / Metadata Muted Text Link: また、`src/components/not-found/not-found-page.ts`の正規404 fallback control linkとは別surfaceであり、今回のvariant変更対象ではない。 | 文書整合 | P-E3。 |
| P-042 | 2. Link Classification / Metadata Muted Text Link: 今回の下線サリエンス採用値は、Relative Color Syntax対応環境（`@supports (color: oklch(from white l c h / 0.65))`）では`oklch(from var(--fg-muted) l c h / 0.65)`である。 | 文書整合 | P-E3。 |
| P-043 | 2. Link Classification / Metadata Muted Text Link: 非対応環境では既存の`var(--fg-subtle, var(--fg-muted))`をfallbackとして使う。 | 文書整合 | P-E3。 |
| P-044 | 2. Link Classification / Metadata Muted Text Link: 実装は`src/assets/css/link-primitives.css`を参照する。 | 文書整合 | P-E3。 |
| P-045 | 2. Link Classification / Metadata Muted Text Link: 将来値を変更する場合は、CSS、CSS contract test、必要に応じて本節を同時に更新する。 | 条件付き設計規範 | P-E3。 適用時の規範として保持し、現時点の判断待ち課題には数えない。 |
| P-046 | 2. Link Classification / Metadata Muted Text Link: `text-underline-offset`などの下線メトリクスはDesign System側で調整可能な実装値であり、Home Contractは具体値を所有しない。 | 文書整合 | P-E3。 |
| P-047 | 2. Link Classification / Metadata Muted Text Link: CSS内での物理的なrule順序は、読みやすさのための配置方針に留める。 | 文書整合 | P-E3。 |
| P-048 | 2. Link Classification / Metadata Muted Text Link: 契約としてはselector限定、primary系token非使用、`:visited`の所有property制限、surface隔離を重視する。 | 文書整合 | P-E3。 |
| P-049 | 2. Link Classification / Block Link Surface: Block Linkは、遷移先を持つ面全体をnative `<a>`として表すpatternである。 | 文書整合 | P-E4。 |
| P-050 | 2. Link Classification / Block Link Surface: `result-card`では`article.result-card > a.result-link`を正規構造とし、カード全面のリンク面を`a.result-link`が所有する。 | 文書整合 | P-E4。 |
| P-051 | 2. Link Classification / Block Link Surface: JSによるcard click delegationは使わない。 | 文書整合 | P-E4。 |
| P-052 | 2. Link Classification / Block Link Surface: Ctrl / Meta / Shift click、右クリック、コンテキストメニュー、focusは`<a>`のブラウザ標準動作に委ねる。 | 文書整合 | P-E4。 |
| P-053 | 2. Link Classification / Block Link Surface: card外形のhover / focus表示はCSS patternの責務であり、リンクの意味論を上書きしない。 | 文書整合 | P-E4。 |
| P-054 | 2. Link Classification / result-card hover surface: result-cardのhoverは、カードを物理的に浮上させる状態ではない。 | 文書整合 | P-E4。 |
| P-055 | 2. Link Classification / result-card hover surface: 現行result-cardでは、elevation shadowやtransformを使わず、`--bg-hover`を`--bg-surface-2`へ重ねた背景の微差で操作可能性を示す。 | 文書整合 | P-E4。 |
| P-056 | 2. Link Classification / result-card hover surface: hover時に境界線を`--border-muted`へ弱めない。 | 文書整合 | P-E4。 |
| P-057 | 2. Link Classification / result-card hover surface: Markdown link-cardも本文内のstatic reference surfaceとして、hover affordanceにelevation shadowやtransformによる物理的浮上を使わない。 | 文書整合 | P-E4。 |
| P-058 | 2. Link Classification / result-card hover surface: ただし、result-cardとMarkdown link-cardは同一componentではなく、それぞれのCSSとMarkdown契約で扱う。 | 文書整合 | P-E4。 |
| P-059 | 2. Link Classification / result-card hover surface: この方針はresult-cardとMarkdown link-cardのhover surfaceに限定し、`card-link.css`、`syntax.css`へ一般化しない。 | 文書整合 | P-E4。 |
| P-060 | 2. Link Classification / Block link focus-visible projection: result-cardは、一覧・検索結果で使うblock link surfaceであり、`article.result-card > a.result-link`を正規構造とする。 | 文書整合 | P-E4。 |
| P-061 | 2. Link Classification / Block link focus-visible projection: Markdown link-cardは、本文内参照として使うblock link surfaceであり、`.link-card > .link-card__link`のnative anchorを正規の操作面とする。 | 文書整合 | P-E4。 |
| P-062 | 2. Link Classification / Block link focus-visible projection: result-cardとMarkdown link-cardは別componentであり、それぞれ`result-card.css`と`link-card.css`でfocus表示を所有する。 | 文書整合 | P-E4。 |
| P-063 | 2. Link Classification / Block link focus-visible projection: この契約は`card-link.css` / `syntax.css`へ一般化しない。 | 文書整合 | P-E4。 |
| P-064 | 2. Link Classification / Block link focus-visible projection: `card-link.css`のfocus contractを変更済みとみなしてはならない。 | 文書整合 | P-E4。 |
| P-065 | 2. Link Classification / Block link focus-visible projection: Block Link Surfaceのfocus表示では、ポインター click由来の`:focus-within`と、キーボード由来の`:focus-visible`を混同しない。 | 文書整合 | P-E4。 |
| P-066 | 2. Link Classification / Block link focus-visible projection: カード外形へfocus ringを投影する場合は、native anchorの`:focus-visible`をsource of truthとする。 | 文書整合 | P-E4。 |
| P-067 | 2. Link Classification / Block link focus-visible projection: result-cardでは`.result-link:focus-visible`、Markdown link-cardでは`.link-card__link:focus-visible`を正本とする。 | 文書整合 | P-E4。 |
| P-068 | 2. Link Classification / Block link focus-visible projection: `:has()`対応環境では、親surfaceへ外周focus ringを投影する。 | 文書整合 | P-E4。 |
| P-069 | 2. Link Classification / Block link focus-visible projection: result-cardでは`.result-card:has(> .result-link:focus-visible)`、Markdown link-cardでは`.link-card:has(> .link-card__link:focus-visible)`が投影先である。 | 文書整合 | P-E4。 |
| P-070 | 2. Link Classification / Block link focus-visible projection: `:has()`非対応環境では、native anchorのfallback outlineを残し、キーボードfocus visibleを不可視にしない。 | 文書整合 | P-E4。 |
| P-071 | 2. Link Classification / Corpus Index Row: Corpus Index Rowは、`/corpora/`overviewで公開コーパスを静かに列挙するための索引行patternであり、Block Link Surfaceとは別分類である。 | 文書整合 | P-E5。 |
| P-072 | 2. Link Classification / Corpus Index Row: 行全体はnative `<a>`だが、カード面ではない。 | 文書整合 | P-E5。 |
| P-073 | 2. Link Classification / Corpus Index Row: titleは主ラベルであり、通常時からごく弱い中立色下線を持つ。 | 文書整合 | P-E5。 |
| P-074 | 2. Link Classification / Corpus Index Row: 通常時のtitle下線は、Relative Color Syntax対応環境（`@supports (color: oklch(from white l c h / 0.3))`）では`fg-muted`由来の0.30 alpha相当に抑える。 | 文書整合 | P-E5。 |
| P-075 | 2. Link Classification / Corpus Index Row: 非対応環境では既存の`var(--fg-subtle, var(--fg-muted))`をfallbackとして使う。 | 文書整合 | P-E5。 |
| P-076 | 2. Link Classification / Corpus Index Row: 実装は`src/assets/css/page-corpora.css`を参照する。 | 文書整合 | P-E5。 |
| P-077 | 2. Link Classification / Corpus Index Row: thicknessは`0.04em`、underline offsetは`0.2em`を基準にする。 | 文書整合 | P-E5。 |
| P-078 | 2. Link Classification / Corpus Index Row: hoverはtitle装飾の軽微な強調に限定する。 | 文書整合 | P-E5。 |
| P-079 | 2. Link Classification / Corpus Index Row: Corpus Index Rowのroot listは先頭borderを持たない。 | 文書整合 | P-E5。 |
| P-080 | 2. Link Classification / Corpus Index Row: section説明文から最初のrowへ自然に流し、row間の分離は各itemのend borderで担う。 | 文書整合 | P-E5。 |
| P-081 | 2. Link Classification / Corpus Index Row: row全体のbackground hover、shadow、transform、elevationは禁止する。 | 文書整合 | P-E5。 |
| P-082 | 2. Link Classification / Corpus Index Row: `focus-visible`はrow linkに明確に出す。 | 文書整合 | P-E5。 |
| P-083 | 2. Link Classification / Corpus Index Row: `padding-inline`は必須仕様ではない。 | 文書整合 | P-E5。 |
| P-084 | 2. Link Classification / Corpus Index Row: 視覚確認でfocus outlineが窮屈、またはタップ領域が不足すると判断した場合だけ、focus/touch安定化のための最小inline paddingを許容する。 | 条件付き設計規範 | P-E5。現行inline paddingなし。必要性の視覚判断は未実施。 適用時の規範として保持し、現時点の判断待ち課題には数えない。 |
| P-085 | 3. Selected / Current / Active / Focused: `selected`はwidget内の選択状態を表す。 | 文書整合 | P-E6。 |
| P-086 | 3. Selected / Current / Active / Focused: `current`は現在位置または現在routeとの対応を表す。 | 文書整合 | P-E6。 |
| P-087 | 3. Selected / Current / Active / Focused: `active`は押下中または一時的な操作状態を表す。 | 文書整合 | P-E6。 |
| P-088 | 3. Selected / Current / Active / Focused: `focused`はfocusを受けている状態を表す。 | 文書整合 | P-E6。 |
| P-089 | 3. Selected / Current / Active / Focused: これらを視覚都合で混同してはならない。 | 文書整合 | P-E6。 |
| P-090 | 4. Overlay Pattern: Overlayは閉じ方、focus return、background interaction、escape behaviorを先に定義する。 | 文書整合 | P-E7。 |
| P-091 | 4. Overlay Pattern: Dialog、search dialog、popover、sidebar overlayは同じz-index語彙を共有するが、component固有動作はcomponent文書へ置く。 | 実装残件 | P-E7。sidebarだけ未定義--z-overlay,100を使用。規範を弱めず実装側判断へ残す。 |
| P-092 | 4. Overlay Pattern: Accessibility要求事項は`docs/design-system/accessibility.md`を正本とする。 | 文書整合 | P-E7。 |
| P-093 | 5. URL-aware UI: URL同期はsource of truthを1つにする。 | 文書整合 | P-E8。 |
| P-094 | 5. URL-aware UI: TabsなどのUI stateをURLに出す場合、共有可能で再構成可能な状態だけに限る。 | 文書整合 | P-E8。 |
| P-095 | 5. URL-aware UI: Search pageのURL stateは`docs/contracts/search.md`を正本とする。 | 文書整合 | P-E8。 |
| P-096 | 5. URL-aware UI: Note page navigation URL、permalink、directory-index、breadcrumbは`docs/contracts/note-navigation.md`を正本とする。 | 文書整合 | P-E8。 |
| P-097 | 5. URL-aware UI: Router document boundaryは`docs/contracts/router-document.md`を正本とする。 | 文書整合 | P-E8。 |
| P-098 | 6. Permanent URL UI: Permanent URLの意味論、`/archives/{hash}`、hash生成規則、版保証は`docs/contracts/permanent-url.md`を正本とする。 | 実装残件 | P-E9 / IMP-03。Permanent URLは現行repositoryで未実装。規範は維持し、提供済みとして扱わない。 |
| P-099 | 6. Permanent URL UI: 本書はPermanent URLをUI上で提示、コピー、最新版案内するpatternだけを扱う。 | 実装残件 | P-E9 / IMP-03。Permanent URLは現行repositoryで未実装。規範は維持し、提供済みとして扱わない。 |
| P-100 | 6. Permanent URL UI: Copy UIは成功・失敗状態を支援技術へ通知できるようにする。 | 条件付き設計規範 | P-E9。Permanent URL UIを実装する場合の通知要件。一般copyのstatus/live regionは参考であり、専用UIの実装済み判定には使わない。 適用時の規範として保持し、現時点の判断待ち課題には数えない。 |
| P-101 | 6. Permanent URL UI: `/archives/{hash}`を通常note page navigation URLとして見せてはならない。 | 実装残件 | P-E9 / IMP-03。Permanent URLは現行repositoryで未実装。規範は維持し、提供済みとして扱わない。 |
| P-102 | 7. Acceptance Criteria: Patternsがcomponent固有契約を過剰に再定義していない。 | 文書整合 | P-E0 / P-E1 / P-E2 / P-E7 / P-E8 / P-E9。正本への委譲を確認。機能実装自体の残件はIMP-01〜IMP-03へ集約する。 |
| P-103 | 7. Acceptance Criteria: Accessibility要求事項を上書きしていない。 | 文書整合 | P-E0 / P-E1 / P-E2 / P-E7 / P-E8 / P-E9。正本への委譲を確認。機能実装自体の残件はIMP-01〜IMP-03へ集約する。 |
| P-104 | 7. Acceptance Criteria: Router / search / note-navigation / permanent-urlの契約を上書きしていない。 | 文書整合 | P-E0 / P-E1 / P-E2 / P-E7 / P-E8 / P-E9。正本への委譲を確認。機能実装自体の残件はIMP-01〜IMP-03へ集約する。 |
| P-105 | 8. Reading Chrome Reservation: Reading chromeのTOC triggerは、本文より強い視覚要素にしない。 | 条件付き設計規範 | P-E10。 適用時の規範として保持し、現時点の判断待ち課題には数えない。 |
| P-106 | 8. Reading Chrome Reservation: 予約状態とinteractive状態は分離し、未確定のTOC ownerを操作可能UIとして見せない。 | 文書整合 | P-E10。 |
| P-107 | 8. Reading Chrome Reservation: Hydration markerはbuild-time / runtimeの接続点を示す属性であり、見た目のvariantとして扱わない。 | 文書整合 | P-E10。 |
| P-108 | 8. Reading Chrome Reservation: Reading chromeの配置・密度・侵入度は専用pattern文書を参照し、本書では機能Contractを再定義しない。 | 文書整合 | P-E10。 |

### pattern-reading-surface.md逐条一覧

| ID | 原文の条項（修正後） | 判定 | 根拠・補足 |
| --- | --- | --- | --- |
| RS-001 | 冒頭: この文書は、Rouaultの読書面における本文flow余白を定義するDesign System patternである。 | 文書整合 | RS-E0。 |
| RS-002 | 冒頭: Markdown出力の構造契約は`docs/contracts/markdown.md`と`docs/references/markdown-output.md`を正本とし、本書は`.prose` / `.about-prose`上の読書面余白だけを扱う。 | 文書整合 | RS-E0。 |
| RS-003 | 1. Status: Type: Normative for Design System patterns | 文書整合 | RS-E0。 |
| RS-004 | 1. Status: Source of truth: Design System CSS tokens、SSR CSS contract tests | 文書整合 | RS-E0。 |
| RS-005 | 1. Status: Applies to: `.prose`、`.about-prose`、`[data-tabs-root]` panel内の読書本文flow | 文書整合 | RS-E0。 |
| RS-006 | 1. Status: Non-goals: Markdown parser / transformerの変更、About専用表示調整、router / URL / hydration / search / TOCの再定義 | 文書整合 | RS-E0。 |
| RS-007 | 2. Flow Tokens: `--reading-flow-space`は汎用flow ruleが列挙する段落・リスト・表・図・コード・引用・calloutなどの読書block遷移の既定余白である。見出しや区切りなどの専用余白は含めない。 | 文書修正 | RS-E1。汎用flow対象と専用余白の範囲を明示。 |
| RS-008 | 2. Flow Tokens: `--reading-paragraph-space`は連続する段落同士、つまり`p + p`専用の余白である。 | 文書整合 | RS-E1。 |
| RS-009 | 2. Flow Tokens: `--reading-flow-space`は後方互換性のため削除、rename、値変更をしない。 | 文書整合 | RS-E1。 |
| RS-010 | 2. Flow Tokens: `--reading-body-size`、`--reading-body-line-height`、`--reading-measure`は本文スケール契約であり、段落間余白の調整理由で変更しない。 | 文書整合 | RS-E1。 |
| RS-011 | 3. Paragraph Flow: `.prose` / `.about-prose`直下の`p + p`は`--reading-paragraph-space`を使う。 | 文書整合 | RS-E1。 |
| RS-012 | 3. Paragraph Flow: 短文段落が続く場合でも、段落間の休止を保ちながら、表、図、コード、引用、callout、リストなどのblock遷移よりは控えめに見せる。 | 今回対象外 | RS-E1。tokenでblockより控えめな余白を確認。休止の主観的品質は未確認。 この評価は今回対象外であり、文書追従の残件には含めない。 |
| RS-013 | 3. Paragraph Flow: 同じ契約は`[data-tabs-root]` panel内の直下`p + p`にも適用する。 | 文書整合 | RS-E1。 |
| RS-014 | 3. Paragraph Flow: tabsは読書面内の一時的な表示容器であり、panel内の連続段落だけが別密度になるべきではない。 | 文書整合 | RS-E1。 |
| RS-015 | 4. Block Flow: 汎用flow ruleが列挙するblockへの遷移は、直下の`p + p`を除き`--reading-flow-space`を維持する。 | 文書修正 | RS-E1。heading/hr専用ruleを含む過大な一般化を解消。 |
| RS-016 | 4. Block Flow: 対象selectorは`src/assets/css/main.css`と`src/assets/css/stateful-note-bridges.css`を正本とする。 | 文書修正 | RS-E1。heading/hr専用ruleを含む過大な一般化を解消。 |
| RS-017 | 4. Block Flow: 見出し`h2`〜`h6`への遷移は`--reading-h2-space`〜`--reading-h6-space`、`hr`は専用の余白を持つ。 | 文書修正 | RS-E1。heading/hr専用ruleを含む過大な一般化を解消。 |
| RS-018 | 4. Block Flow: 段落・block間余白の区別を、これらの専用ruleへ一般化しない。 | 文書修正 | RS-E1。heading/hr専用ruleを含む過大な一般化を解消。 |
| RS-019 | 4. Block Flow: 段落間余白を詰めるために、汎用flow ruleの対象を狭めたり、非段落blockの余白を減らしたりしない。 | 文書整合 | RS-E1。 |
| RS-020 | 5. Ownership Boundaries: このpatternはDesign System CSSが所有する。 | 文書整合 | RS-E0。 |
| RS-021 | 5. Ownership Boundaries: Aboutページだけに限定したselectorやcontent側のworkaroundは使わない。 | 文書整合 | RS-E0。 |
| RS-022 | 5. Ownership Boundaries: Markdown authoring guideは書き方の補足であり、本patternを上書きしない。 | 文書整合 | RS-E0。 |
| RS-023 | 5. Ownership Boundaries: JSで段落の行数を測定して余白を変えない。 | 文書整合 | RS-E0。 |
| RS-024 | 6. Japanese/ASCII Visual Spacing: 読書面では、対応ブラウザーに限り、表示上の和欧間・和数字間アキをCSSの`text-autospace`で扱う。 | 文書整合 | RS-E2。 |
| RS-025 | 6. Japanese/ASCII Visual Spacing: これは本文データ、Markdown出力、DOM構造、search index、hydration markerを変更しないvisual contractである。 | 文書整合 | RS-E2。 |
| RS-026 | 6. Japanese/ASCII Visual Spacing: `body`は`text-autospace: no-autospace`で固定する。 | 文書整合 | RS-E2。 |
| RS-027 | 6. Japanese/ASCII Visual Spacing: `.prose` / `.about-prose`だけを`text-autospace: ideograph-alpha ideograph-numeric`へopt-inする。 | 文書整合 | RS-E2。 |
| RS-028 | 6. Japanese/ASCII Visual Spacing: 読書面配下の`[data-tabs-root]` hostは表示容器として`no-autospace`へ戻す。 | 文書整合 | RS-E2。 |
| RS-029 | 6. Japanese/ASCII Visual Spacing: 読書面配下の`[data-tabs-root] > [data-tab-panel]`だけを読書本文として再opt-inする。 | 文書整合 | RS-E2。 |
| RS-030 | 6. Japanese/ASCII Visual Spacing: この`[data-tabs-root]`契約はflow余白契約の拡張ではなく、autospace継承制御だけの追加契約である。 | 文書整合 | RS-E2。 |
| RS-031 | 6. Japanese/ASCII Visual Spacing: `code`、`pre`、`kbd`、`samp`、`.katex`、`[data-math]`、`pre[data-code-block]`、`[data-code-block-root]`、`section[data-code-group]`、`[data-score]`は記号的表示として`no-autospace`へ戻す。 | 文書整合 | RS-E2。 |
| RS-032 | 6. Japanese/ASCII Visual Spacing: `[data-translation-overlay]`と`.translation-static`の表示テキストは、読書面内の本文補助要素としてautospace継承を許容する。 | 文書整合 | RS-E2。 |
| RS-033 | 6. Japanese/ASCII Visual Spacing: translation trigger / fallback / overlayに過剰な字間変化がないことを視覚確認する。 | 今回対象外 | RS-E3。特定Changeの完了指示は修正済み。実際のtranslation字間視覚確認は未実施。 この評価は今回対象外であり、文書追従の残件には含めない。 |
| RS-034 | 6. Japanese/ASCII Visual Spacing: 個別scopeの追加が必要な場合は、translationの機能契約とautospace継承への影響を確認し、変更範囲を明示して扱う。 | 文書修正 | RS-E2。Change Planへの一時的指示を、機能契約/継承影響と変更範囲の継続的判断規範へ更新。 |
| RS-035 | 6. Japanese/ASCII Visual Spacing: 未対応ブラウザーでは現状表示を許容し、autospace効果が見えないことをfailure扱いにしない。 | 文書整合 | RS-E2。 |
| RS-036 | 7. Acceptance Criteria: `.prose` / `.about-prose`直下の`p + p`が`--reading-paragraph-space`を使う。 | 文書整合 | RS-E1 / RS-E2。 |
| RS-037 | 7. Acceptance Criteria: `[data-tabs-root]` panel内の直下`p + p`も`--reading-paragraph-space`を使う。 | 文書整合 | RS-E1 / RS-E2。 |
| RS-038 | 7. Acceptance Criteria: 汎用flow ruleのblock遷移は`--reading-flow-space`を維持し、見出し・区切りの専用余白を変更しない。 | 文書修正 | RS-E1 / RS-E2。専用余白を変更しないことを明示。 |
| RS-039 | 7. Acceptance Criteria: About専用hack、Markdown parser変更、runtime測定を導入していない。 | 文書整合 | RS-E1 / RS-E2。 |
| RS-040 | 7. Acceptance Criteria: Japanese/ASCII visual spacingは読書面CSSの継承制御だけで扱い、Markdown / DOM / search / hydrationを変更しない。 | 文書整合 | RS-E1 / RS-E2。 |

逐条一覧件数: patterns **108件**、reading-surface **40件**。通常文の各「。」終端と箇条書き1項目を最小coverage単位とする（1つの箇条書き中の列挙は同条項内に全て明記）。


## 根拠略号（すべてリポジトリ相対パス）

- C: `docs/contracts/reading-chrome.md`（ownership、geometry、density、diagnostics、shared reading projection）、H: `docs/contracts/static-header-contract.md`（TOC Trigger、responsive visibility）、T: `docs/contracts/toc.md`（mobile UX、current、wrapping、hydration）、S: `docs/contracts/search.md`。
- V: `src/assets/css/layout-toc.css`、VS: `src/assets/css/layout-sidebar.css`、VT: `src/assets/css/tokens.css`、VN: `src/assets/css/note-shell.css`、VR: `src/assets/css/router-shell.css`、VH: `src/assets/css/layout-header.css`。
- I: `src/components/layout/layout-toc-controller.ts`、IM: `src/components/layout/layout-toc-mobile-controller.ts`、IB: `src/client/post-hydrate/layout-header-toc-bridge.ts`、IH: `src/layouts/layout-header-html.ts`、ID: `src/toc/toc-density-tier.ts`。
- Q: `test/ssr/layout-toc-css-contract.test.ts`（rail/current、focus、wrapping、density、forced-colors）、QT: `test/ssr/tokens-css-contract.test.ts`（sidebar surface、light/dark paths、gutter）、QS: `test/ssr/static-css-contracts.test.ts`（viewport gutter、note frame geometry、header contracts）、QM: `test/ssr/mobile-toc-css-contract.test.ts`、QH: `test/ssr/toc-html.test.ts`。
- B: `test/browser/layout-toc-controller.browser.test.ts`（current同期、stale state削除、panel close/focus return）、BB: `test/browser/layout-header-toc-bridge.browser.test.ts`（reserved/ready/validation generations、aria state）、BV: `test/browser/layout-toc-static-nav.browser.test.ts`（CSS browser contract）。
- E: `test/e2e/toc-active-scroll.spec.ts`、EH: `test/e2e/header-layout-contract.spec.ts`、EN: `test/e2e/header-no-js.spec.ts`。
- PN: `build/projections/reading-page-projection.ts`、PM: `build/projections/memo-page-projection.ts`、TM: `test/ssr/memo-reading.test.ts`（shared TOC/header with absent sidebar）。
- NS: `src/search/navigation.ts`、BS: `src/search/bootstrap.ts`、SN: `test/browser/search-navigation.browser.test.ts`、SB: `test/browser/search-bootstrap.browser.test.ts`、SI: `test/node/search-dialog-import-boundary.test.ts`。
- DG: `src/toc/diagnostics/toc-diagnostics.ts`、DS: `src/toc/toc-controller-sync-diagnostics.ts`、OV: `build/navigation/validate-toc-owner-candidates.ts`。

## pattern-reading-chrome.md（修正前39 bullet + 前文、追加条項RC-NEW）

| 条項 | 原文の要旨 | 判定 | 対応するファイル／テスト／根拠・処置 |
| --- | --- | --- | --- |
| RC-0 | patternは見え方と配置のみ、機能契約を正本にする | 文書整合 | C §2/7。router/search/hydration 自体を本書は定義していない。H/T への明示リンクをRC-1.2と前文に補完済み。 |
| RC-1.1 | Normative DS pattern | 文書整合 | `docs/README.md`のDS正本分類、C §7。 |
| RC-1.2 | 正本reading-chrome、TOC component docs、各test | 文書修正 | 「TOC component docs」は現在の正式所在が不明瞭。Tがcontrollerの現行契約。Hがtriggerの二重契約正本。修正: `docs/contracts/toc.md` / `docs/contracts/static-header-contract.md`を明示済み。 |
| RC-1.3 | applies note trigger/sidebar/frame、TOC、search return、diagnostics | 文書修正 | PN/PM/TM はnoteとmemoの共通TOC/header を実装。scopeのnote-only表記はshared reading chromeを網羅していない。修正: note / memo共通trigger/TOC とnote専用sidebar/frame を明記済み。 |
| RC-1.4 | URL/schema/ranking/hydration/tree/navigation は対象外 | 文書整合 | C §2/4、NS/BS/SI。機能境界に踏み込む規定なし。 |
| RC-2.1 | 本文理解を補助する場合だけ前へ出す | 条件付き設計規範 | V/VS/VH は控えめなtoken surfaceとfixed/sticky chrome、Q/QT/QS は構造を検証する。本文に対する視覚主従の良否はscreenshot/人手評価が必要（不一致と断定しない）。 適用時の規範として保持し、現時点の判断待ち課題には数えない。 |
| RC-2.2 | rhythmを壊すfixed bar / 過剰shadow / 強い色面を導入しない | 条件付き設計規範 | T §2.6は旧summary bar禁止。Vのmobile panelは明示操作時のみ、VNのTOCはsticky。Q/QS は構造を固定。過剰かどうかは視覚評価。 適用時の規範として保持し、現時点の判断待ち課題には数えない。 |
| RC-2.3 | sidebar/TOC currentはleft railを共有 | 文書整合 | V `__link::before`、VS `[aria-current='page']::after`、VT `--nav-item-indicator-*`、Qのrail/current とQT。 |
| RC-2.4 | primary blueは広面積背景よりrail/focus 中心 | 文書整合 | VT `--toc-item-active-bg` alpha .028、sidebar alpha .045/.075、VS/V のprimary rail、focus token、Q/QT。forced-colorsはHighlightに置換（色指定は通常色の指針）。 |
| RC-2.5 | focus outlineはcurrentと独立 | 文書整合 | V `:focus-visible` outlineとcurrent pseudo rail、VS focus outline、Q focus/background responsibilities。 |
| RC-2.6 | sidebar current surfaceはglobal active surfaceに直結しない | 文書整合 | VT専用`--sidebar-item-active-bg-alpha` / `--sidebar-item-active-bg`、VS使用箇所、QT専用低salience recipeを固定。fallback `--bg-surface-active`はtoken不在時のみ。 |
| RC-2.7 | desktop TOCは本文より控えめな補助nav | 条件付き設計規範 | Tのsemantic nav、QH landmark ownership、V muted text/small typography、VN narrow track。相対的視覚階層の良否は人手評価。 適用時の規範として保持し、現時点の判断待ち課題には数えない。 |
| RC-2.8 | 章題/節題を認識できない圧縮をしない | 条件付き設計規範 | Vのwrapping/clamp とQ長見出し契約、BV browser geometryが構造上の裏付け。実本文で意味を把握できるかは人手評価。 適用時の規範として保持し、現時点の判断待ち課題には数えない。 |
| RC-2.9 | mobile triggerは入口、内容ownerでない | 文書整合 | IH href/label only、I desktop nav clone、IB runtime snapshot/IM open state、BB/B。 |
| RC-2.1.1 | sidebarは構造navigationでTOCより強い | 文書整合 | VT sidebar active .045(light)/.075(dark) > TOC .028、QT専用surface、V/VS。知覚上の強さはRC-2.1/2.7 の今回対象外評価。 |
| RC-2.1.2 | TOCはrail主、active surface従 | 文書整合 | V current rail+subtle after、VT TOC recipe、Q rail/surface grammar。 |
| RC-2.1.3 | rail語彙は共通、背景濃度は同一にしない | 文書整合 | VT sidebar .045/.075 とTOC .028、Q/QT。 |
| RC-3.1 | edgeに貼る管理画面風でなく控えめframe | 条件付き設計規範 | VRのdesktop note frame width/minimum gutterとQS note frame contractはedge非接触を保証。「管理画面風」の知覚判断は手動。 適用時の規範として保持し、現時点の判断待ち課題には数えない。 |
| RC-3.2 | fixed sidebarとdesktop TOC外余白は同じ原理 | 文書整合 | C desktop geometry、VR共通note frameのwidth/gutter、QS 810行以降。sidebarとTOCを別paddingで代用しない。 |
| RC-3.3 | outer gutterは最小値、wideの中央寄せで拡大可 | 文書整合 | VT `--note-frame-outer-gutter`、VR width calc/max width/margin、QS 810行以降、QT geometry token。 |
| RC-3.4 | item padding/rail/indent は別責務 | 文書整合 | V/VS item tokenとVR frame tokenは別selector、Q/QS/QT。 |
| RC-3.5 | tree/navigation は機能契約、patternは余白/intrusion | 文書整合 | C/H/T、`docs/contracts/sidebar-state.md`、VS/VR visual vs sidebar controller/state の分離。 |
| RC-4.1 | triggerは短ラベル/icon-only、buttonの名前役割状態維持 | 文書修正 | **確定不一致**。IH `renderTocTrigger`はhref付きa。H TOC Triggerは「button化しない」、No-JS fragmentとJS panel二重契約。EN fallback href/static controls、BB ready/expanded/label、EH <640 visibility。修正: 固定label「目次」/icon-only、native link role、accessible name、fallback href、runtime-ready panel state/controls を維持すると修正済み。 |
| RC-4.2 | panelはheader直下、headerを覆わない | 文書整合 | V panel `top: var(--header-height)`、T §2.6、B body直下生成、EH geometryとQM CSS boundary。 |
| RC-4.3 | panel currentはleft railとaria-current=location | 文書整合 | I clone + sync、`src/toc/toc-desktop-nav-sync.ts`、V current rules、B current DOM/mobile navとQ rail。 |
| RC-4.4 | close focus returnはtrigger | 文書修正 | IM returnFocusTarget、I `_connectMobileController` consumes connected target → focusWithoutScroll、B 560行以降link close/focus return。target removed/disposed はreturnしない。  接続中triggerへのreturnと切断/破棄の例外を文書へ補完済み。 |
| RC-5.1 | compact/comfortable/expanded | 文書整合 | ID union/normalization/resolve、I/V data-density recipe、Q density、B 137行以降。 |
| RC-5.2 | 見出し量と階層のvisual input、URL/id 不変 | 文書整合 | ID headings length/depth only、I `_syncDensityTier` attribute only、Q/B density vs current。 |
| RC-5.3 | compact長TOC、expanded短TOCの余白 | 文書整合 | ID >=12件or depth>=3 compact、<=4件and depth<=1 expanded、V min-height24/30/padding3/8、Q。 |
| RC-5.4 | compactは余白縮小、情報過剰欠落ではない | 文書整合 | V inactive2/active3 line vs expanded3/4、Q depth-independent wrapping。意味判読性はRC-2.8の今回対象外評価。 |
| RC-5.5 | 右TOCは補助だが現在地と章題を把握できる | 今回対象外 | Q clamp/current + E current trackingは構造保証。内容の実用的認識は人手視覚確認。 この評価は今回対象外であり、文書追従の残件には含めない。 |
| RC-5.6 | desktopとstatic-first mobile cloneは共通wrapping | 文書整合 | I cloneNode desktop、V shared `.layout-toc__link-label`、Q/QM/BV 同recipe。static-only fixtureのmobile static navも同class (QH)。 |
| RC-5.7 | DOM hookとCSS hookを分ける | 文書整合 | `src/toc/toc-mobile-panel-dom-css-contract.ts`、I両hook、QM exact selectors。 |
| RC-6.1 | diagnosticsは開発検証面、常時読書文言にしない | 文書整合 | DG/DS はstructured issues/snapshots、I/IB はreader textに変換しない。B diagnostic snapshotケース、OV validation。 |
| RC-6.2 | owner/source 欠落を曖昧な空状態へ変換しない | 文書整合 | OV fail validation、DG/DS issue reasons、I source lookup/hydration session、BB invalid/validated activation boundary。reader empty messageのfallback実装なし。 |
| RC-6.3 | fail-closedでも本文/static TOCを優先 | 文書整合 | SSR nav正本 (`src/layouts/toc-html.ts`)、IH fallback href、IB ready=false非interactive、QH/EN/BB。No-JS mobile baselineの最終読解性はCI e2eと区別し、実画面の目視評価は今回対象外。 |
| RC-7.1 | chromeが本文の主従を壊さない | 今回対象外 | RC-2.1/2.7/2.8 と同じ。Q/QS/B/E は機械的契約を保証し、読書全体の知覚評価は保証しない。 この評価は今回対象外であり、文書追従の残件には含めない。 |
| RC-7.2 | trigger/panel/desktop/search returnのowner分離 | 文書整合 | IH/IB/IM/I とBS→NS、SI/SN/SB、C ownership。 |
| RC-7.3 | densityは視覚密度以外の意味論なし | 文書整合 | ID/V/I に限定、Q/B。URL/heading id/search rankingの書換えなし。 |
| RC-7.4 | router/search/hydration 機能契約を上書きしない | 文書整合 | C/T/S、SI/BB のboundary。RC-4.1のbutton誤記はHを上書きするため修正済みとして別途記録。 |

補完済み: Cの`Viewport Scrollbar Gutter`は`src/assets/css/main.css`の`html { scrollbar-gutter: stable }`、dialog CSSのbody lock ownership、QS 757行以降で明示固定されている。patternのplacement原理へ位置安定性を1条追加した。既存文の直接的矛盾ではなく網羅性補完である。

| 条項 | 要旨 | 判定 | 根拠・処置 |
| --- | --- | --- | --- |
| RC-NEW / 3 | Modal scroll lock前後の位置安定とroot gutter / body lock責務分離 | 文書修正 | C Viewport Scrollbar Gutter、`src/assets/css/main.css`、QS 757行以降の既存契約をpatternへ補完。 |

## pattern-reading-block-intrusion.md（19 bullet + 前文）

| 条項 | 原文の要旨 | 判定 | 対応するファイル／テスト／根拠・処置 |
| --- | --- | --- | --- |
| RBI-0 | 本文UIのintrusion判断のみ | 文書整合 | C ownership/non-goals と一致。具体的component behaviorは本書で上書きしていない。 |
| RBI-1.1 | Normative pattern | 文書整合 | `docs/README.md` DS正本分類、C §7。 |
| RBI-1.2 | reading contract/component/test 正本 | 文書修正 | C/T/H/S に対応。具体的な参照へ直すならC/H/T をinline linkとして追記済み（直接不一致なし）。 |
| RBI-1.3 | note body周辺trigger/inline/TOC/search/diagnostics | 文書修正 | PN/PM/TM はmemoにもreading chromeを適用。網羅性のため`note / memo body`へscope表記を補完済み。 |
| RBI-1.4 | Markdown/router/search/note semanticsと属性全列挙は対象外 | 文書整合 | C、S、Tおよび本書残りの規定。 |
| RBI-2.1 | noneが既定 | 文書整合 | reading proseはVNと本文renderが所有、IH/I/検索dialogは本文外。追加UIの判断原則として実装矛盾なし。 |
| RBI-2.2 | adjacent: TOC/header/search triggerは本文外 | 文書整合 | IH header、VN desktop aside track、I panel body直下、`src/layouts/search-dialog-html.ts`、QH/B/QS。 |
| RBI-2.3 | inline-supportは本文理解に必要な補助のみ | 条件付き設計規範 | 許容性を決める設計判断原則であり必要性の一般的自動判定はない。`pattern-reading-surface.md`/各Markdown contractに委譲。実装不一致は発見せず。 適用時の規範として保持し、現時点の判断待ち課題には数えない。 |
| RBI-2.4 | blockingはdialog/panel の明示操作のみ | 文書整合 | IB trigger toggle、I close/escape/outside handling、検索controller open-request; B/BB と`test/browser/search-dialog-lifecycle.browser.test.ts`。 |
| RBI-3.1 | 本文意味変更ならcontent/Markdown 契約へ | 文書整合 | C non-goals、本文変換はbuild/content・build/rehype、UI state I/IB は本文意味を書換えない。 |
| RBI-3.2 | 常時補助UIはadjacent以内 | 文書整合 | IH/VN 常設chrome、I panelはhidden/inert baseline、検索dialog closed baseline。B/QH とsearch lifecycle。 |
| RBI-3.3 | blockingはexplicit/focus/escape/close/return 定義必須 | 文書整合 | I/IM close button/document Escape/return target、検索DOM controllerとenhancer close pipeline、Bとsearch lifecycle close-request/focus-return テスト。TOCはnon-modal surfaceでfocus trapを要求していない。 |
| RBI-3.4 | diagnosticsを本文へinline注入しない | 文書整合 | DG/DS/OV structured issues; B diagnostics snapshot。I/IB に本文inline diagnostic outputなし。 |
| RBI-4.1 | TOCは本文から導出、authoringへ逆流しない | 文書整合 | `build/content/extract-toc-from-html.ts` → PN → `src/layouts/toc-html.ts` → I、`test/node/extract-toc-from-html.test.ts`/QH。 |
| RBI-4.2 | search到達補助、選択後returnはadapter | 文書整合 | BS selection → `dispatchSearchReturnToReading` → NS manifest validation/navigation、SI/SB 370行以降/SN 79行以降。 |
| RBI-4.3 | mobile panelは一時surface、header非被覆、本文非置換 | 文書整合 | V top header-height、I desktop cloneをbody append（本文を置換しない）、B/QM、T mobile UX。 |
| RBI-5.1 | 本文内必要UIとadjacentを区別 | 条件付き設計規範 | RBI-2.3同様、各新UIの必要性判断は人手。現行header/TOC/search の配置はIH/I/VN とB/QH で整合。 適用時の規範として保持し、現時点の判断待ち課題には数えない。 |
| RBI-5.2 | UI都合でMarkdown/frontmatter を汚染しない | 文書整合 | PN/ID は表示密度とTOC projectionを導出、runtime cloneはI、`test/node/extract-toc-from-html.test.ts`/TM/QH。追加authoring fieldを要求しない。 |
| RBI-5.3 | blocking surfaceはclose/focus returnを持つ | 文書整合 | I/IM と検索close pipeline、B 560行以降/search lifecycle 174行以降。 |
| RBI-5.4 | 機能契約を上書きしない | 文書整合 | C/H/T/S。本文外配置と判断条件だけでcurrent state/URL/owner の新規仕様なし。 |






## callout.md

正本: [callout.md](../design-system/callout.md)。変更不要。DOMの正本は [Markdown契約](../contracts/markdown.md) と [出力参照](markdown-output.md#callout)。本書の短い注記という用途規範を、parserの長さ制限があるという保証へ読み替えない。

| 条項 | 判定 | 実装・契約とテストによる根拠 |
| --- | --- | --- |
| 導入: 短い注記surface、UI通知・操作カード・長い情報の器ではない、本文へ戻れる軽さ | 文書整合 | `src/assets/css/callout.css`は静的な読書面scopeの左線surface。`build/rehype/rouault-components.ts::toStaticCallout`は`aside`を生成しhydrationしない。`test/ssr/callout-css-contract.test.ts`と`test/ssr/rehype-rouault-components.test.ts`。用途は執筆時の判断規範であり短さの機械的保証ではない。 |
| Responsibility 1: calloutは短い補足・ヒント・注意・警告 | 文書整合 | `build/remark/directives/payload/normalize-surface-payload.ts`の5 kindと`toStaticCallout`。`test/node/remark-rouault-directives.test.ts`、`test/ssr/rehype-rouault-components.test.ts`。 |
| Responsibility 2: info-boxは構造化情報surface | 文書整合 | `src/assets/css/info-box.css`と`toStaticInfoBox`のheader/body分離。`test/ssr/rehype-rouault-components.test.ts`、`test/ssr/note-content-contracts.test.ts`。 |
| Responsibility 3: detailsは展開して読む補足 | 文書整合 | `src/assets/css/details-block.css`、`build/rehype/rouault-components.ts`のnative details/summary。`test/ssr/details-block-contract.test.ts`、`test/ssr/rehype-rouault-components.test.ts`。 |
| Responsibility 4: translationは原文・訳文の対応surface | 文書整合 | [Translation契約](../contracts/translation.md)、`src/assets/css/translation.css`と`build/rehype/native-translation.ts`。`test/node/native-note-output.test.ts`。 |
| Responsibility末尾: 長い表・複数section・操作UIはinfo-boxまたは本文へ分ける | 条件付き設計規範 | 構造の選択に関する執筆規範。`build/remark/directives/grammar/structural-rules.ts`はsection数や文字数を判定しない。個別contentの適切さは本監査の実装照合から保証しない。 適用時の規範として保持し、現時点の判断待ち課題には数えない。 |
| Kind Roles note: 中立・最弱・semantic colorを主面に使わない | 文書整合 | `callout.css`はdefault/noteを同じ`--bg-note-subtle`の70%混色、muted左線にする。`test/ssr/callout-css-contract.test.ts`がneutral proxyを固定。 |
| Kind Roles tip: 助言・弱から中・青い面を控えめにする | 文書整合 | `callout.css`は`--bg-info-subtle` / `--border-info-subtle`。同CSS testのnote/tip/danger proxy。意味はauthorのkind選択規範。 |
| Kind Roles success: 検証済み短注記・中 | 文書整合 | `callout.css`はsuccess背景50%混色、左線幅はdefault。同CSS testのdefault/note/success proxy。検証済みかは執筆者が判断。 |
| Kind Roles warning: 制約・中から強・可視heading推奨 | 文書整合 | `callout.css` warning token、`toStaticCallout`はheading時`aria-labelledby`、headingなしはkind fallbackの`aria-label`。`test/ssr/rehype-rouault-components.test.ts`。headingは必須でなく推奨と整合。 |
| Kind Roles danger: 危険・最強・heading推奨・左線識別 | 文書整合 | `callout.css` danger専用2倍左線、`toStaticCallout`のheading/label。`test/ssr/callout-css-contract.test.ts`、`test/ssr/rehype-rouault-components.test.ts`。 |
| Visual 1: rootは本文に従属する軽いsurface | 今回対象外 | `callout.css`の余白・色・左線とCSS testが構造proxyを固定する。本文との視覚的主従、実データの長さ、themeごとの見え方は目視が必要。 この評価は今回対象外であり、文書追従の残件には含めない。 |
| Visual 2: default/noteは背景抑制・左線・余白 | 文書整合 | `callout.css` root/default/note、同CSS testのroot layoutとneutral background。 |
| Visual 3: tipはinfo subtle優先 | 文書整合 | `callout.css` tip rule、同CSS testでinfo tokenと過剰なtip token非使用を検査。 |
| Visual 4: successは緑面を強くしすぎない | 文書整合 | `callout.css` success 50%混色、同CSS testで無混色success面でないことを固定。最終知覚はVisual 1の今回対象外評価。 |
| Visual 5: warning/dangerは背景だけに意味を依存しない | 文書整合 | `toStaticCallout`がnameとiconを出力、`callout.css`左線・headingを保持。`test/ssr/rehype-rouault-components.test.ts`、`test/ssr/callout-css-contract.test.ts`。 |
| Visual 6: kind別左線幅強化はdangerだけ | 文書整合 | `callout.css` danger rule、同CSS testが他4 kindにwidth overrideなしを検査。 |
| Visual 7: rootへhover/active/focus/transition/animation/shadowを付けない | 文書整合 | `callout.css`に該当宣言なし。同CSS testのroot操作surface化禁止。 |
| Visual 8: 内部native link/buttonのfocus-visibleを維持 | 今回対象外 | 同CSS testはoutline/box-shadow抑制がないことを検査し、`src/assets/css/main.css`がglobal focus-visibleを提供。ただし内部要素の全組合せ・支援技術の実測は未実施。横断的なcopy buttonの既知問題はIMP-01を参照。 この評価は今回対象外であり、文書追従の残件には含めない。 |
| Visual 9: forced-colorsはborder/左線/text/icon識別 | 文書整合 | `callout.css` forced-colorsのCanvas/CanvasText・外周border・danger左線、`tokens.css` system color。`test/ssr/callout-css-contract.test.ts` forced-colors scope/danger識別検査。実機の最終識別性評価は今回対象外。 |
| Compatibility 1: --callout-accent-color aliasを維持 | 文書整合 | `callout.css` rootがprivate accentからalias設定、iconがalias参照。同CSS testの互換accent alias。 |
| Compatibility 2: 新しい公開overrideとせず内部変数は --_callout-* | 文書整合 | `callout.css`がprivate背景/左線/accent/widthを所有。同CSS testのscope検査。新たなoverride interfaceは本書に追加していない。 |
| Compatibility 3: .callout-iconと[data-callout-icon-svg]をscope付きで維持 | 文書整合 | `toStaticCallout` / `createInlineIcon`が両hook生成、`callout.css`読書面・tabs panel scope。同CSS testが4 selectorを固定。 |
