# Tabs-owned hash URL recovery

- Decision Record ID: D-TABS-OWNED-HASH-PRECEDES-CONFLICTING-TAB-QUERY-001
- Request ID: REQ-TABS-OWNED-HASH-URL-RECOVERY-001
- Status: Accepted
- Date: 2026-06-30
- R段階 / Aレベル: R3 / A0

## Context

`ui-tabs[url-sync]`を持つnoteで、URLの`?tab=`と`#hash`が別tabを指す場合がある。対象path自体は有効であるため、この不整合はRouterのroute presenceやNot Found判定ではなく、tabsのfeature-local URL stateとして回復する必要がある。

## Decision

decoded hashが当該`ui-tabs`の有効panel内targetへ解決できる場合、そのpanelに対応するtab valueを`?tab=`より優先して選択する。host-owned hashは`snapshot.panels[0..interactiveCount)`内のtargetに限定し、nested / 別`ui-tabs`配下targetは`target.closest('ui-tabs') === this`で除外する。

hash由来選択ではhashを維持したまま`?tab=`をactiveValueへ`replaceState`で正規化する。query由来選択では`strategy.readValue(currentUrl) !== activeValue`の場合だけ`replaceState`で正規化する。空または空白のみの`?tab=`、host外hash、unknown hash、malformed hashはsource=null相当または未解決hashとして扱い、この変更では`?tab=`を新規生成しない。

`strategy.readValue(currentUrl)`がnullではないが、現行`resolveSelectedIndex()`規則で無効な`?tab=`値は、有効activeValueへ回復し、無効値をURLへ残さない。

## R3 / A0 rationale

有効pathでerror envelopeへ落ちる可能性、TOC visible headingsとtabs選択の不一致、共有URLの破損を同時に扱うためR3として扱う。一方、変更範囲は`ui-tabs[url-sync]`の既存URL同期と関連テスト/docsに限定し、Router責務変更、TOC再設計、CSS変更、URL名前空間化を含めないためA0とする。

## Rejected options

- Routerで`?tab=`と`#hash`の矛盾をNot Foundやroute validationとして扱う案は棄却する。query/hashはroute presence判定の入力ではない。
- TOCが`?tab=`を正規化する案は棄却する。TOCはvisible headings/current stateの同期を担い、tabs URL stateを所有しない。
- nested tabsを正式対応する案は棄却する。本判断は誤検出防止guardに限定する。
- 重複`?tab=`の整理を同時に行う案は棄却する。URLSearchParams由来の副作用的なURL整形は今回のscope外である。

## Counter-hypotheses

- host外hashをtabs選択に使うと、ページ内の無関係な見出しで主tabが変わる可能性がある。
- panel containmentだけで判定すると、nested `ui-tabs`配下hashを外側tabsが誤って採用する可能性がある。
- query由来でwriteValue結果だけを理由に正規化すると、重複`?tab=`などscope外のURL整形を引き起こす可能性がある。

## Compatibility impact

host-owned hashを含む既存URLは、初期表示時に`?tab=<activeValue>#hash`へ`replaceState`で正規化される。履歴は増えない。source=nullの通常初期表示、host外hash、unknown hash、malformed hashでは`?tab=`を新規生成しない。

## Router contract impact

Routerのroute presence判定、Not Found、error envelope処理は変更しない。有効path上の`?tab=`と`#hash`の矛盾はfeature-local URL state ownerが回復する。

## TOC contract impact

TOCは`?tab=`正規化を所有しない。tabs回復後のselected stateとpanel visibilityを観測し、visible headings/current stateを同期する。

## Rollback

問題が出た場合は、まずhost-owned hash判定helperの誤検出範囲を確認する。緊急rollbackでは、`tabs-url-sync-controller.ts`のhash優先分岐、`tabs.ts`の`resolveTabValueForHash`、`tabs-dom.ts`のhelper、関連test/docs/ADRを同一コミットでrevertする。

## Acceptance

- A1: 有効path + 矛盾query/hashでNot Foundまたはerror envelopeへ遷移しない。
- A2: host-owned hashが有効panel内targetへ解決できる場合、hash側tabを選択する。
- A3: `?tab=rust#javascriptのhello-world`を`?tab=javascript#javascriptのhello-world`へ正規化する。
- A4: hash-only direct accessでもhost-owned hashなら対応tabを選択し、`?tab=<activeValue>`を補う。
- A5: host外hash、unknown hash、malformed hashではtabs選択を破壊せず、`?tab=`を新規生成しない。
- A6: 無効な非null query値は有効activeValueへ回復し、空白のみqueryはsource=null相当として扱う。
- A7: TOCのvisible headings/current stateは回復後のtab状態と一致する。
- A8: URL正規化は`pushState`ではなく`replaceState`で行う。
- A9: 通常のtabクリック、keyboard selection、manual/automatic activationを壊さない。
- A10: source=nullの通常初期表示では`?tab=`を追加しない。
- A11: query由来正規化は`strategy.readValue(currentUrl) !== activeValue`の場合に限る。
- A12: nested / 別`ui-tabs`配下hashは外側`ui-tabs`のhost-owned hashとして採用しない。

## Verification

- V1: `pnpm run typecheck`
- V2: `pnpm run test:browser -- test/browser/tabs-dom.browser.test.ts`
- V3: `pnpm run test:browser -- test/browser/tabs.browser.test.ts`
- V4: `pnpm run test:browser -- test/browser/primary-tab-url-state.browser.test.ts`
- V5: `pnpm run test:browser -- test/browser/toc-active-tracker.browser.test.ts`
- V6: `pnpm run test:e2e -- test/e2e/toc-tabs.spec.ts`
