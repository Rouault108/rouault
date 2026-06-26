# ADR-CORPUS-INDEX-ROW-001: Render corpora overview as quiet index rows

## Status

Accepted

## Request

Request ID: R-CORPUS-INDEX-ROW-001

`/corpora/`overviewの公開コーパス一覧を、カード型入口ではなく、長期的な目録・索引UIとして再設計する。

## R stage / A level

R stage: R3
A level: A0

R3理由:

* `/corpora/`overviewのUI契約を変更する。
* `article.result-card > a.result-link`を`/corpora/`overviewから外す。
* `data-link-surface="card"`を`data-link-surface="navigation"`へ変更する。
* `h2.result-title`を廃止し、list/link semanticsへ移行する。
* DOM構造、CSS selector契約、アクセシブルネーム、Design System、Corpus Contract、SSR/E2Eテストに影響する。

A0理由:

* private/restricted Evidenceは扱わない。
* SHA-256保全、redaction、CI証跡保全は不要である。
* 通常のdiff、テスト、手動確認で十分である。

## Decision

Decision ID: D-CORPUS-INDEX-ROW-001

`/corpora/`overviewの公開コーパス一覧は、`result-card`ではなく、専用の`corpus index row`として描画する。

採用仕様:

* 一覧rootは`ol.corpora-overview__corpus-index`とする。
* 各項目は`li.corpora-overview__corpus-item`配下に単一の`a.corpus-index-row[data-corpus-index-row]`を持つ。
* 行全体をnative`<a>`にし、JS click delegationは使わない。
* `data-link-kind="internal-document"`を維持する。
* `data-link-surface="navigation"`を使う。
* `result-card`、`result-link`、`result-title`、`result-path`、`result-meta`は`/corpora/`overviewでは使わない。
* titleは`span.corpus-index-row__title`とし、リンクの主ラベルにする。
* pathは`span.corpus-index-row__path`とし、補助説明にする。
* metaは`span.corpus-index-row__meta`とし、補助説明にする。
* `aria-labelledby`でtitle idを参照する。
* `aria-describedby`でpath idとmeta idを参照する。
* titleは通常時からごく弱い中立色下線を持ち、hoverで装飾色を`currentColor`へ強める。
* row全体のbackground hover、shadow、transform、elevationは使わない。
* `focus-visible`はrow linkに明確なoutlineを出す。
* forced-colorsではfocus outlineに`Highlight`を使う。

## Rationale

`/corpora/`overviewは、商品カードやCTA群ではなく、公開ノートをコーパス単位で辿るための索引である。

現行の`result-card`はBlock Link Surfaceとして成立しているが、長期的な`/corpora/`overviewの目録性に対しては面の主張がやや強い。公開コーパス一覧を静かな索引UIへ寄せるため、`result-card`を弱めるのではなく、`/corpora/`overview専用の`corpus index row`を新設する。

大きなカード面を維持したままtitleだけリンクにすると、カード全体が押せるというユーザー期待に反する。一方、行全体をnative`<a>`にすれば、クリック期待を満たしつつ、カード面の視覚ノイズを避けられる。

titleを主ラベル、path/metaを補助説明に分けることで、リンクのアクセシブルネームも整理できる。

## Rejected alternatives

### Alternative A: Keep current result-card

短期的には安全だが、長期方針としては棄却する。

理由:

* `/corpora/`overviewの索引性を十分に表現しない。
* `result-card`はBlock Link Surfaceとして妥当だが、公開コーパス一覧の目録性にはやや強い。
* `result-card`一般は維持しつつ、`/corpora/`overview専用の索引行を新設するほうが責務が明確である。

### Alternative B: Keep large card shape but make only title clickable

棄却する。

理由:

* カードに見えるのにカード全体が押せない。
* 視覚的アフォーダンスと実操作範囲がずれる。
* ユーザーが懸念した期待違反を残す。

### Alternative C: Keep corpus title as heading

今回は棄却する。

理由:

* `/corpora/`overviewは文書章立てではなく、遷移先一覧・索引である。
* 各corpus名をheading treeへ露出させるより、`ol/li/a`のlist/link semanticsを正本にする。
* corpus数が増えた場合も、リンク一覧・リスト構造として辿れるほうが索引UIとして自然である。

### Alternative D: Add data-link-surface="index"

今回は棄却する。

理由:

* link surface列挙値の追加は、`shared/link/link-surface.ts`、validator、docs、テストに波及する。
* 今回の目的は`/corpora/`overviewの索引行化であり、link surface体系の拡張ではない。
* 既存値では`navigation`が最も近い。

## Contract impact

Affected contracts:

* `/corpora/`overview rendering contract
* Corpus Contract
* Design System pattern contract
* SSR corpora index template contract
* page-corpora.css selector ownership contract
* Accessibility semantics for corpus overview items

Unaffected contracts:

* URL/routing
* CorporaOverviewData
* CorporaOverviewCorpusItem
* corpus projection
* corpus page note list
* search result cards
* result-card general pattern
* client runtime/hydration/custom events

## Delete / Breaking Change Gate

Gate ID: G-CORPUS-INDEX-ROW-001

Gate required: yes

Reason:

* `/corpora/`overviewのDOM/CSS契約から`article.result-card`、`data-result-card`、`a.result-link`、`data-link-surface="card"`、`.result-path`、`.result-title`、`.result-meta`、`.corpora-overview__corpus-grid`を外す。
* heading semanticsを`h2.result-title`からlist/link semanticsへ変更する。
* `aria-labelledby`/`aria-describedby`によってアクセシブルネームと説明を再定義する。

Gate decision: pass

理由:

* URL/routingは変更しない。
* data modelは変更しない。
* projectionは変更しない。
* client runtime、hydration、custom eventは変更しない。
* native`<a>`の標準挙動を維持する。
* 外部URL、永続データ形式、公開APIの変更ではない。
* 変更対象は`/corpora/`overviewの内部DOM/CSS契約に限定される。
* 変更後も行全体はクリック可能であり、操作期待を損なわない。

## Accessibility

`corpus index row`はheading itemではなく、list item内のnavigation linkとして扱う。

* `aria-labelledby`はtitle idのみを参照する。
* `aria-describedby`はpath idとmeta idを参照する。
* リンクの主名はcorpus labelである。
* path/metaは補助説明である。
* `focus-visible`はrow linkに明確に表示する。
* forced-colorsではfocus outlineに`Highlight`を使う。

## Acceptance

* AC-CORPUS-INDEX-ROW-001: `/corpora/`overviewの公開コーパス一覧が`result-card`ではなく`corpus index row`として描画される。
* AC-CORPUS-INDEX-ROW-002: 各rowは単一のnative`<a>`であり、行全体がクリック可能である。
* AC-CORPUS-INDEX-ROW-003: 各rowは`data-link-kind="internal-document"`と`data-link-surface="navigation"`を持つ。
* AC-CORPUS-INDEX-ROW-004: リンクの主名はコーパス名であり、path/metaは`aria-describedby`による補助説明として扱われる。
* AC-CORPUS-INDEX-ROW-005: titleは常時ごく弱い中立色リンク装飾を持ち、hoverで軽微に強調される。
* AC-CORPUS-INDEX-ROW-006: row全体のbackground hover、shadow、transform、elevationは使われない。
* AC-CORPUS-INDEX-ROW-007: keyboard focusでは`focus-visible`が明確に表示され、forced-colorsでも不可視にならない。
* AC-CORPUS-INDEX-ROW-008: `result-card.css`、search result、corpus page note list、home feedには影響しない。
* AC-CORPUS-INDEX-ROW-009: ADR、Corpus Contract、Design System、SSR test、CSS contract、E2Eが同じ仕様を指している。

## Verification

* V-CORPUS-INDEX-ROW-001: `pnpm run test:ssr -- test/ssr/corpora-index-template.test.ts`
* V-CORPUS-INDEX-ROW-002: `pnpm run test:ssr -- test/ssr/static-css-contracts.test.ts`
* V-CORPUS-INDEX-ROW-003: `pnpm run test:e2e -- test/e2e/static-pages.spec.ts`
* V-CORPUS-INDEX-ROW-004: `pnpm run build`
* V-CORPUS-INDEX-ROW-005: manual UI check for `/corpora/`
* V-CORPUS-INDEX-ROW-006: diff review for out-of-scope files
* V-CORPUS-INDEX-ROW-007: documentation consistency review

## Rollback

問題が発生した場合は、`/corpora/`overviewのmarkupを現行`result-card`構造へ戻し、`page-corpora.css`の`corpus-index-row`関連selectorを削除し、Corpus Contract、Design System、ADR、テストを現行`result-card`契約へ戻す。

実装だけ戻して文書を残すと契約不一致になるため、ADRはsuperseded扱いにするか、ロールバック理由を追記する。

## Out of scope

* `result-card`一般の再設計
* 検索結果カードの再設計
* コーパス内ノート一覧の再設計
* home feedのカード/リンク設計変更
* `data-link-surface`の新規値追加
* URL/routing変更
* projection/data model変更
* hydration追加
* JS click delegation追加
* 公開コーパスの並び順変更
* empty state文言変更
