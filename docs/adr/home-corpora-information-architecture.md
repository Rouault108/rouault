# Home and Corpora Information Architecture

Type: Decision Record
Date: 2026-06-25
Status: Accepted
ADR ID: ADR-HOME-CORPORA-IA-001
Request ID: R-HOME-CORPORA-IA-001
Decision ID: D-HOME-CORPORA-IA-001
Gate ID: G-HOME-CORPORA-IA-001
Change IDs: CH-HOME-CORPORA-IA-001, CH-HOME-CORPORA-IA-002, CH-HOME-CORPORA-IA-003, CH-HOME-CORPORA-IA-004
Acceptance IDs: AC-HOME-CORPORA-IA-001, AC-HOME-CORPORA-IA-002, AC-HOME-CORPORA-IA-003, AC-HOME-CORPORA-IA-004
Verification IDs: V-HOME-CORPORA-IA-001, V-HOME-CORPORA-IA-002, V-HOME-CORPORA-IA-003, V-HOME-CORPORA-IA-004, V-HOME-CORPORA-IA-005, V-HOME-CORPORA-IA-006
R stage: R3
A level: A0
Scope: home page and corpora overview information architecture
Contract source of truth: docs/contracts/home.md, docs/contracts/corpus.md, docs/contracts/static-empty-state.md

## Note

This document is a decision record. It is not the contract source of truth. The current contracts are defined by `docs/contracts/home.md`, `docs/contracts/corpus.md`, and `docs/contracts/static-empty-state.md`.

## Context

トップページ`/`とCorporaトップ`/corpora/`の双方が、公開ノートへの入口として近い役割を持っていた。

トップページはRouaultの導入と新着一覧を持つ。一方でCorporaトップは`Corpora / Overview`、`すべてのノート`、`コーパスから辿る`、`最近更新したノート`を同居させていた。さらにCorpora overview projectionはhome projectionから`recentNotes`を取得しており、UI層とデータ層の両方で責務が混在していた。

## Evidence

- `src/index.11ty.ts`はトップページheroと新着一覧を描画していた。
- `src/layouts/corpora-overview-html.ts`はCorporaトップでコーパス一覧と最近更新ノート一覧を同時に描画していた。
- `build/projections/corpora-overview-projection.ts`は`buildHomePageProjection()`に依存し、`recentNotes`を取得していた。
- `/corpora/`は全ノート全件一覧ではなく、コーパス一覧と最近更新ノートの一部表示で構成されていた。

## Decision

トップページ`/`は「Rouaultの導入＋最近の更新」を担う。

Corporaトップ`/corpora/`は「コーパスから辿る索引」を担う。

`/corpora/`は全ノート全件一覧ではない。`/corpora/`は最近更新ノート一覧を所有しない。

## Rejected Options

### Keep `/corpora/` as "すべてのノート"

棄却する。現行の`/corpora/`は全ノート全件一覧ではなく、ページ名として約束が強すぎる。

### Keep recent notes on `/corpora/`

棄却する。トップページの最近更新表示と競合し、Corporaトップの主語がぶれる。

### Redesign header corpus switcher in this change

棄却する。header corpus switcherは別の契約、E2E、アクセシビリティ意味に影響するため、今回の変更から外す。

### Add `/notes/` or `/archive/`

棄却する。全ノート索引が必要な場合は別Requestとして設計する。

## Deferred Options

- header corpus switcherの再設計。
- `/notes/`、`/archive/`、`/all-notes/`などの全ノート索引新設。
- 検索ページの責務再整理。

## Counter-hypothesis

Corporaトップにも最近更新ノートを残した方が、読み始める導線が増えて便利である。

## Rebuttal

最近更新から読む導線はトップページが担う。Corporaトップは構造から読むページとして単純化した方が、ページ間の責務が明確になり、長期保守性も高い。

## Contract Impact

`docs/contracts/home.md`を追加し、トップページ`/`がRouaultの導入と最近の更新を担うことを明記する。

`/corpora/`はコーパス索引であり、全ノート一覧ではないことを`docs/contracts/corpus.md`へ明記する。

`/corpora/`から最近更新ノートsectionを削除する。`#recent-notes-title`は公式URL契約ではないため、代替anchorは設けない。

`docs/contracts/static-empty-state.md`からCorporaトップの最近更新ノート用empty state例を削除する。

## Consequences

- トップページとCorporaトップの責務が分離される。
- Corpora overview projectionがhome projectionに依存しなくなる。
- `/corpora/`はより静かなコーパス索引になる。
- 最近更新ノートをCorporaトップから直接読む導線はなくなる。
- 最近更新ノートへの導線はトップページへ集約される。

## Rollback

問題が出た場合は、`recentNotes` projection、`renderRecentNotes()`、Corporaトップの最近更新sectionを戻す。ただし、その場合はトップページとCorporaトップの責務重複も復活する。
