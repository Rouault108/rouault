# Full Lit Removal

## Status

Decision accepted by the human-approved `rouault-full-lit-removal-migration-plan-v14-final-approved.md`. 実装の完了適合性判定は別途行う。

## Decision

note UIのdurable document DOMはbuild-timeでsemantic static HTMLとして生成する。runtime JavaScriptはplain enhancer/controllerとしてinteractionとephemeral operational stateを所有する。Tabs、Translation、Code Preview、Preview Sandbox、Videoと親内部controlsのLit custom element、Lit SSR、note DSD、Lit client hydrate supportを撤去する。非Lit shell custom elementは維持する。

HydrationSchedulerを唯一の初回起動ownerとする。routerの文書commit/rollback、URL ownership、searchのMiniSearch/Suzume Worker normal pathとCatalog failure fallbackを維持する。native final DOMを既存search projectionへ適合させる。

Tabs labelはnon-interactiveに限定する。既存directive validatorがMarkdown link等をbuild-time errorとしてrejectし、text/emphasis/strong/inline codeを保持する。native lowererは防御的assertionだけを持ち、silent textification、抽出、分離、自動修復を行わない。

## Supersession

- [Translation disclosure fallback](translation-light-dom-disclosure-fallback.md)のhostとfallback→button/dialog置換を、同一details/summaryのcanonical DOMへ変更する。
- [Tabs owned hash recovery](tabs-owned-hash-url-recovery.md)のURL優先順位とhistory semanticsを維持し、host/panel認識schemaをnative data selectorへ移す。
- [Preview visible by default](preview-sandbox-visible-by-default.md)の既定visibleとcapability policyを維持し、起動ownerをschedulerへ集約する。
- [Preview content root/stage layout](preview-sandbox-content-root-and-stage-layout.md)のiframe内security/layout境界は維持する。外側Lit hostはnative rootへ移行する。

過去ADRの本文は当時の判断Evidenceとして保持する。旧custom element API、slot/part、Lit lifecycleを現行公開契約として扱わない。未実装のTabs二相event/detail.source、Videoの新しいpublic API/role/naming等を本移行で実装しない。

## Current Contracts

- [Tabs](../contracts/tabs.md)
- [Translation](../contracts/translation.md)
- [Code Preview](../contracts/code-preview.md)
- [Preview Sandbox](../contracts/preview-sandbox.md)
- [Video](../contracts/video.md)
- [Native note controls](../contracts/note-controls.md)
- [Hydration](../contracts/hydration.md)
- [Markdown](../contracts/markdown.md)

compatibility shim、old/new parallel runtime、新規author raw HTML、content migration、search foundation変更は採用しない。
