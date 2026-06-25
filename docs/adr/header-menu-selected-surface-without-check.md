# Header Menu Selected Surface Without Check Decision Record

## Status

- Decision Record ID: ADR-HEADER-MENU-SELECTED-SURFACE-WITHOUT-CHECK-001
- Request ID: REQ-HEADER-MENU-QUIET-SELECTED-SURFACE-001
- Decision ID: DEC-HEADER-MENU-QUIET-SELECTED-SURFACE-001
- Gate ID: GATE-HEADER-MENU-CHECK-REMOVAL-001
- Acceptance ID: ACC-HEADER-MENU-QUIET-001..022
- Verification ID: VER-HEADER-MENU-QUIET-001..006
- R段階 / Aレベル: R3 / A0
- Status: Accepted
- Date: 2026-06-25
- Contract source of truth: `docs/contracts/static-header-contract.md`

この文書はDecision Recordである。現行contractの正本は`docs/contracts/static-header-contract.md`である。

## Decision

ヘッダー内ドロップダウンでは、ヘッダー内で当該triggerが表示される状態において現在値の主表示をtriggerへ集約し、展開メニュー内ではチェックマークを使わない。展開メニュー内の現在項目は、`aria-current` / `aria-pressed`、低ノイズなselected surface、控えめなsemiboldで補助的に示す。

Compact表示ではTheme trigger textが省略される場合がある。この場合も、trigger icon / `aria-label`同期と、menu内のselected補助表示により現在Themeを確認できる状態を維持する。

Corpus current itemは`aria-current="page"`を状態正本とする。Corpusでは左indicator slot、placeholder indicator、check indicatorを廃止し、label主導layoutにする。Corpus itemのlink直下element child数や具体display方式は契約化しない。`.corpus-menu-item__label`は1行ellipsisの正本であり、狭幅でも縮められるよう`min-inline-size: 0`相当の縮小可能性を要求する。

Theme selected itemは`aria-pressed="true"`をaccessibility source of truthとし、`data-selected="true"`はstyling / sync hookに限定する。Theme optionは選択中でも`sun`、`moon`、`monitor`の項目固有iconを維持し、`check`へ置換しない。

現行の`details` / `summary`、Corpus panelの`nav aria-label="コーパス"`、Theme panelの`role="group" aria-label="テーマ"`、trigger id / panel id / `aria-controls`対応は維持する。`role="menu"`、`role="menuitem"`、`role="menuitemradio"`、`aria-selected`、roving tabindexへは移行しない。

## Reasons

チェックマークを廃止する理由は、ヘッダーtriggerが現在値の主表示を担う状態で、展開メニュー内に記号的な現在表示を重ねると読書補助UIとしてのノイズが増えるためである。現在項目の補助表示は必要だが、背景と文字ウェイトで足りる。

Corpusで左indicator slotを廃止する理由は、non-current itemにも空slotが残り、ラベル開始位置と視覚重心を不自然にするためである。Corpus itemのDOM契約を過剰固定しない理由は、将来の静かな補助要素追加を妨げないためである。ただしlabel ellipsisは読書導線の破綻に直結するため、`.corpus-menu-item__label`の1行ellipsisと縮小可能性は契約にする。

Themeで項目固有iconを維持する理由は、`sun`、`moon`、`monitor`が選択肢の意味を担っているためである。選択中だけ`check`へ置換すると、選択肢種別と選択状態の役割が混ざる。

`aria-current` / `aria-pressed`を状態正本として維持する理由は、視覚表現を静かにしてもprogrammatic stateを失わないためである。`data-selected`はTheme chrome同期とstylingのhookであり、アクセシビリティ意味論の正本にはしない。

## Rejected Alternatives

- チェックマークを右端へ移す案。記号量が残り、triggerとの二重表示が続くため採用しない。
- チェックマークを左に残す案。Corpusの空slotとThemeのicon役割混同が残るため採用しない。
- メニュー内selected/current補助表示を完全削除する案。compact表示で状態確認が弱くなるため採用しない。
- `role="menu"`系へ移行する案。今回の主題はvisual / DOM contract整理であり、keyboard operation contract再設計ではないため採用しない。

## Counter-hypotheses Review

チェックマークは非色覚依存の冗長手段として有用という反対仮説は退ける。Triggerが主表示を担い、menu内ではsemiboldとselected surfaceを併用し、programmatic stateも維持するためである。

Compact表示ではtrigger textが隠れるためcheck廃止は危険という反対仮説は退ける。Theme triggerのicon / `aria-label`同期とmenu内selected補助表示を維持するためである。

Native menu conventionから外れるという反対仮説は退ける。RouaultのheaderはOS menuではなく、読書補助のstatic disclosureである。

Theme selected iconをcheckにしないと状態が分かりにくいという反対仮説は退ける。選択状態は`aria-pressed`、`data-selected`、selected surface、semiboldで示し、項目固有iconは選択肢の意味を担う。

## Contract Impact

- `src/layouts/layout-header-html.ts`はCorpus indicatorを出力せず、Theme optionに常に項目固有iconを出力する。
- `src/client/post-hydrate/layout-header-enhancer.ts`と`src/theme/theme-chrome-bootstrap.ts`はselected itemを`check`へpatchしない。
- `src/theme/theme-ui-options.ts`のheader chrome bootstrap icon集合はTheme option iconのunique集合と一致する。
- `src/assets/css/layout-header.css`はCorpus current itemとTheme selected itemへ低ノイズなselected surface + semiboldを定義し、focus-visible outlineを主表示として維持する。
- `docs/contracts/static-header-contract.md`はCorpus indicator契約を削除し、Theme selected icon維持とforced-colors方針を明記する。
- `docs/adr/header-corpus-current-indicator.md`はSupersededとして保持する。

## Delete / Breaking Change Gate

削除対象は`.corpus-menu-item__indicator`、`.corpus-menu-item__indicator--placeholder`、Corpus current item内check icon、Corpus itemのindicator column、Theme selected itemのcheck icon置換、Theme chrome bootstrap内のcheck同期依存である。

Gate条件として、`aria-current="page"`、`aria-pressed`、Themeの`data-selected` hook、`data-header-menu-item`、`data-header-menu-text`、Corpus link、Theme button、Corpus `nav aria-label="コーパス"`、Theme `role="group" aria-label="テーマ"`、`details` / `summary`、trigger id / panel id / `aria-controls`対応、Theme persistence、Theme preference値集合、Theme storage key、root theme attributesは維持する。

## Rollback

Rollbackする場合は、HTML projection、CSS、post-hydrate enhancer、theme chrome bootstrap、theme option icon registry、static header contract、ADR、SSR / CSS / E2E / node testsを一括で戻す。ただし、`aria-current="page"`、`aria-pressed`、Theme persistence、Corpus routing、Theme trigger current label / icon同期、Theme trigger compact時`aria-label`、static header基本構造は維持する。

## Reading Experience

この変更は、Header menu内の記号量を減らし、Corpusの右重心とThemeのicon役割混同を解消する。現在項目の補助表示は残すため、静かな読書体験と操作確認の両方を保つ。
