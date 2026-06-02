# Navigation Shell Snapshot Architecture

この文書は architecture reference であり、Contract を再定義しない。

## Source of Truth

- NavigationEnvelope の正規 payload 契約は `docs/contracts/navigation-envelope.md`。
- NavigationEnvelope 詳細 schema は `docs/references/navigation-envelope-schema.md`。
- Sidebar state ownership は `docs/contracts/sidebar-state.md`。
- Note URL、directory-index、breadcrumb は `docs/contracts/note-navigation.md`。
- Router document boundary は `docs/contracts/router-document.md`。

## 概要

NavigationEnvelope schema v2 の `shell` は、route によって変わる app shell の durable state を client navigation で反映する snapshot である。本文 HTML だけを差し替えると、sidebar と static header の route 由来表示が SSR 初期表示とずれるため、document payload と同じ navigation envelope に `shell` を含める。

## 含まれる概念

- sidebar projection: selected node、structural expanded ids、server-first nav subtree。
- static header HTML: `header[data-layout-header]` の検証済み HTML。

## 境界

- Shell snapshot は component-local UI state を運ばない。
- Sidebar overlay open state は shell snapshot ではない。
- Hydration trigger は shell snapshot ではない。
- Note URL や breadcrumb の契約はこの文書で再定義しない。
