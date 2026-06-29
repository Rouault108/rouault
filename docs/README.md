# Rouault Documentation

`docs/contracts/`は機能契約の正本である。
`docs/design-system/`はDesign System契約の正本である。
`docs/references/`は詳細参照であり、Contractを上書きしない。
`docs/guides/`は使い方説明であり、Contractを上書きしない。
`docs/adr/`は設計判断の経緯であり、現在の挙動を再定義しない。
`docs/old/`と`docs/temporary/`は現行契約の正本ではない。

## 正本Contract

- `docs/contracts/router.md`
- `docs/contracts/url-policy.md`
- `docs/contracts/router-document.md`
- `docs/contracts/navigation-envelope.md`
- `docs/contracts/hydration.md`
- `docs/contracts/code-surfaces.md`
- `docs/contracts/sidebar-state.md`
- `docs/contracts/note-navigation.md`
- `docs/contracts/reading-chrome.md`
- `docs/contracts/static-header-contract.md`
- `docs/contracts/static-choice-menu.md`
- `docs/contracts/theme.md`
- `docs/contracts/permanent-url.md`
- `docs/contracts/search.md`
- `docs/contracts/markdown.md`
- `docs/contracts/home.md`
- `docs/contracts/corpus.md`
- `docs/contracts/content-config.md`
- `docs/contracts/testing-taxonomy.md`

## Design System Contract

- `docs/design-system/foundations.md`
- `docs/design-system/accessibility.md`
- `docs/design-system/patterns.md`
- `docs/design-system/pattern-reading-surface.md`
- `docs/design-system/pattern-reading-chrome.md`
- `docs/design-system/pattern-reading-block-intrusion.md`
- `docs/design-system/components/`

Design System patternはUIの見え方と配置判断を扱う。Router、search、hydration、note navigation、reading chromeの機能契約を上書きしない。

## Reference

- `docs/references/navigation-envelope-schema.md`
- `docs/references/search-data-model.md`
- `docs/references/search-ranking-and-diagnostics.md`
- `docs/references/markdown-authoring-syntax.md`
- `docs/references/markdown-output.md`
- `docs/references/compatibility.md`

## Guides

- `docs/guides/markdown-authoring.md`
- `docs/guides/note-authoring.md`
- `docs/guides/content-config.md`
- `docs/guides/corpus.md`
- `docs/guides/japanese-writing-style.md`
- `docs/guides/operations/`

## Architecture

- `docs/architecture/navigation-shell-snapshot.md`

## ADR

- `docs/adr/README.md`
- `docs/adr/code-surfaces-static-html-migration.md`
- `docs/adr/code-block-prose-contained-default.md`
- `docs/adr/article-header-source-link-classification.md`
- `docs/adr/markdown-static-table-row-hover-affordance.md`
- `docs/adr/markdown-table-authoring-extension.md`
- `docs/adr/markdown-parser-ownership-migration.md`
- `docs/adr/result-card-focus-visible-projection.md`
- `docs/adr/link-card-static-reference-surface.md`
- `docs/adr/reading-chrome-note-frame-outer-gutter.md`
- `docs/adr/corpus-current-selected-surface.md`
- `docs/adr/header-corpus-current-indicator.md`
- `docs/adr/header-menu-selected-surface-without-check.md`
- `docs/adr/header-control-active-transform-removal.md`
- `docs/adr/header-menu-chevron-open-state.md`
- `docs/adr/header-search-quiet-launcher.md`
- `docs/adr/image-preview-surface-trigger.md`
- `docs/adr/theme-contract-and-document-bootstrap.md`
- `docs/adr/search-page-static-choice-menu.md`
- `docs/adr/search-dialog-passive-scroll-active-descendant.md`
- `docs/adr/japanese-ascii-spacing-policy.md`
- `docs/adr/home-corpora-information-architecture.md`
- `docs/adr/corpus-index-row.md`
- `docs/adr/reading-surface-paragraph-flow-separation.md`
- `docs/adr/router-document-navigation-fallback-on-stale-fetch-artifacts.md`
- `docs/adr/`

ADRは設計判断の経緯であり、正本Contractを上書きしない。各ADRの現行正本は、対応する`docs/contracts/`配下のContractを参照する。

## Non-current Documents

- `docs/old/`
- `docs/temporary/`
