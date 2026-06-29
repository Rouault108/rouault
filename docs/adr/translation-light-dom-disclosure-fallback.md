# Translation Light DOM Disclosure Fallback

## Status

Accepted.

## Context

`ui-translation` is a Light DOM component, but its SSR target was previously treated as Declarative Shadow DOM. That broke the reading baseline because translation overlay content is note content, not private component chrome.

## Decision

- `ui-translation` remains a note SSR target, but is rendered as a Light DOM passthrough target.
- `::translation-overlay` emits a Light DOM host with native `details/summary` fallback before hydration.
- The fallback carries the same plain-text `original` / `translated` pair as the host attributes.
- Hydration replaces fallback DOM with the existing Light DOM button/dialog overlay and preserves inherited open state.
- Initial inherited open is reconciled through the existing `translation-toggle` event after orchestrator startup and first update completion.
- Focus handoff from fallback summary to hydrated trigger is implemented because it is local, stable, and does not change the public event contract.

## Rejected

- Shadow DOM canonicalization is rejected because translation is reading content and must have a semantic no-JS baseline.
- Restoring Markdown `open` for `translation-overlay` is rejected. Host `[open]` remains component API / Storybook / direct HTML compatibility only.
- Broad `DOCUMENT_CSS` consolidation is out of scope for Phase 1.

## Consequences

JS-disabled users can open the fallback summary and read the translation. Hydrated users keep the existing popover/drawer behavior, Escape and outside-pointer close, focus return, `translation-toggle`, and one-open-translation-at-a-time orchestration.
