# Rouault Patterns

この文書は Design System の横断 UI pattern を定義する正本である。
URL、routing、search、note identity、Permanent URL の意味論は機能 Contract を正本とし、本書は UI pattern としての扱いだけを説明する。

## 1. Status

- Type: Normative for Design System patterns
- Source of truth: Design System components、layout patterns、browser/e2e tests
- Applies to: link classification、selected/current/active/focused、overlay、URL-aware UI controls、Permanent URL UI
- Non-goals: router/search/note/permanent URL の機能契約再定義、component 固有の全属性定義

## 2. Link Classification

- Text Link は本文・説明文中の遷移を表す。
- Control Link は button-like な操作導線として扱う。
- Block Link は card や result item 全体の遷移導線として扱う。
- Sidebar 専用 link は `docs/contracts/sidebar-state.md` と component 文書の境界に従う。
- Router の URL 正規化は `docs/contracts/router.md` を正本とし、本書では再定義しない。

## 3. Selected / Current / Active / Focused

- `selected` は widget 内の選択状態を表す。
- `current` は現在位置または現在 route との対応を表す。
- `active` は押下中または一時的な操作状態を表す。
- `focused` は focus を受けている状態を表す。
- これらを視覚都合で混同してはならない。

## 4. Overlay Pattern

- Overlay は閉じ方、focus return、background interaction、escape behavior を先に定義する。
- Dialog、search dialog、popover、sidebar overlay は同じ z-index 語彙を共有するが、component 固有動作は component 文書へ置く。
- Accessibility 要求事項は `docs/design-system/accessibility.md` を正本とする。

## 5. URL-aware UI

- URL 同期は source of truth を 1 つにする。
- Tabs などの UI state を URL に出す場合、共有可能で再構成可能な状態だけに限る。
- Search page の URL state は `docs/contracts/search.md` を正本とする。
- Note page navigation URL、permalink、directory-index、breadcrumb は `docs/contracts/note-navigation.md` を正本とする。
- Router document boundary は `docs/contracts/router-document.md` を正本とする。

## 6. Permanent URL UI

- Permanent URL の意味論、`/archives/{hash}`、hash 生成規則、版保証は `docs/contracts/permanent-url.md` を正本とする。
- 本書は Permanent URL を UI 上で提示、コピー、最新版案内する pattern だけを扱う。
- Copy UI は成功・失敗状態を支援技術へ通知できるようにする。
- `/archives/{hash}` を通常 note page navigation URL として見せてはならない。

## 7. Acceptance Criteria

- Patterns が component 固有契約を過剰に再定義していない。
- Accessibility 要求事項を上書きしていない。
- Router / search / note-navigation / permanent-url の契約を上書きしていない。

## 8. Reading Chrome Reservation

- Reading chrome の TOC trigger は、本文より強い視覚要素にしない。
- 予約状態と interactive 状態は分離し、未確定の TOC owner を操作可能 UI として見せない。
- Hydration marker は build-time / runtime の接続点を示す属性であり、見た目の variant として扱わない。
