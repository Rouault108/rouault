import { css, unsafeCSS } from 'lit';
import { HIGHLIGHT_RULE_TEMPLATE } from '../highlight/highlight.js';
import { SEARCH_DIALOG_HIGHLIGHT_SELECTOR } from './search-dialog.constants.js';

export const searchDialogStyles = css`
  :host {
    display: block;
    --ui-search-dialog-max-width: min(600px, 92vw);
    --ui-search-dialog-max-height: min(340px, 60vh);
    --ui-search-dialog-position-top: 14%;
    --ui-search-dialog-body-min-height: clamp(170px, 26vh, 230px);
    --ui-search-dialog-backdrop: oklch(from var(--black) l c h / var(--opacity-scrim));
    --ui-search-dialog-edge-highlight: color-mix(in oklch, var(--white) 8%, transparent);
  }

  [hidden] {
    display: none !important;
  }

  .dialog {
    box-sizing: border-box;
    margin: var(--ui-search-dialog-position-top) auto 0;
    padding: 0;
    border: var(--border-width) solid var(--border-default);
    border-radius: var(--radius-xl);
    border-top-color: var(--ui-search-dialog-edge-highlight);
    inline-size: var(--ui-search-dialog-max-width);
    max-inline-size: var(--ui-search-dialog-max-width);
    max-block-size: var(--ui-search-dialog-max-height);
    overflow: hidden;
    background: var(--bg-surface-3);
    color: var(--fg-default);
    box-shadow: var(--elevation-xl);
    animation: search-dialog-enter var(--duration-normal) var(--ease-out) forwards;
    grid-template-rows: auto minmax(0, 1fr) auto;
    z-index: var(--z-modal);
  }

  .dialog[open] {
    display: grid;
  }

  .dialog::backdrop {
    background: var(--ui-search-dialog-backdrop);
    backdrop-filter: blur(var(--blur-lg));
    animation: search-backdrop-enter var(--duration-normal) var(--ease-out) forwards;
    z-index: var(--z-backdrop);
  }

  .dialog[data-closing] {
    animation: search-dialog-exit var(--duration-normal) var(--ease-in) forwards;
  }

  .dialog[data-closing]::backdrop {
    animation: search-backdrop-exit var(--duration-normal) var(--ease-in) forwards;
  }

  .sr-only {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--space-2, 8px);
    border-bottom: var(--border-width) solid var(--border-default);
    padding: var(--space-2, 8px) var(--space-3, 12px);
  }

  .search-field {
    --ui-search-field-height: 44px;
    --ui-search-field-radius: var(--radius-md);
    --ui-search-field-bg: var(--bg-fill-muted);
    --ui-search-field-font-size: var(--text-xl, 18px);
    --ui-search-field-icon-color: var(--fg-muted);
  }

  .close-button {
    inline-size: 44px;
    block-size: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--fg-muted);
    opacity: 0.72;
    cursor: pointer;
    padding: 0;
    transition:
      opacity var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1)),
      color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1)),
      background-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1));
  }

  .close-button:hover {
    opacity: 1;
    color: var(--fg-default);
    background: var(--bg-hover);
  }

  .close-button:focus-visible {
    opacity: 1;
    color: var(--fg-default);
    background: var(--bg-hover);
    outline: var(--focus-ring-width) solid var(--focus-ring-color);
    outline-offset: var(--focus-ring-offset);
    animation: var(--animation-focus, none);
  }

  .close-button ui-icon {
    inline-size: var(--icon-base, 16px);
    block-size: var(--icon-base, 16px);
    font-size: var(--icon-base, 16px);
  }

  .body {
    min-block-size: var(--ui-search-dialog-body-min-height);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .loading-state {
    flex: 1 1 auto;
    min-block-size: 0;
    display: grid;
    place-items: center;
    align-content: center;
    gap: var(--space-3, 12px);
    padding: var(--space-6, 24px);
    color: var(--fg-muted);
    text-align: center;
  }

  .loading-state p {
    margin: 0;
    font-size: var(--text-sm, 13px);
    color: inherit;
  }

  .status-copy {
    display: grid;
    gap: var(--space-2, 8px);
  }

  .status-heading {
    margin: 0;
    font-size: var(--text-lg, 16px);
    font-weight: var(--font-semibold, 600);
    color: var(--fg-default);
    line-height: var(--line-height-tight, 1.25);
  }

  .empty-state {
    --ui-search-dialog-empty-state-padding-inline: clamp(
      var(--space-5, 20px),
      4vw,
      var(--space-7, 28px)
    );
    --ui-search-dialog-empty-state-padding-block-start: clamp(
      var(--space-5, 20px),
      4vw,
      var(--space-7, 28px)
    );
    flex: 1 1 auto;
    min-block-size: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding-inline: var(--ui-search-dialog-empty-state-padding-inline);
    padding-block-start: var(--ui-search-dialog-empty-state-padding-block-start);
    padding-block-end: calc(var(--ui-search-dialog-empty-state-padding-block-start) * 0.7);
    text-align: center;
  }

  .error-state {
    flex: 1 1 auto;
    min-block-size: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding-inline: var(--space-6, 24px);
    padding-block: var(--space-6, 24px);
    text-align: center;
  }

  .empty-state-content {
    display: grid;
    justify-items: center;
    gap: var(--space-3, 12px);
    inline-size: min(100%, 22rem);
  }

  .empty-state-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: 40px;
    block-size: 40px;
    color: var(--fg-subtle);
  }

  .empty-state-icon ui-icon {
    inline-size: 40px;
    block-size: 40px;
    font-size: 40px;
  }

  .empty-state-heading {
    margin: 0;
    color: var(--fg-default);
    font-size: var(--text-lg, 16px);
    font-weight: var(--font-semibold, 600);
    line-height: var(--line-height-tight, 1.25);
    letter-spacing: 0.01em;
  }

  .empty-state-description {
    margin: 0;
    max-inline-size: 34ch;
    color: var(--fg-muted);
    font-size: var(--text-sm, 13px);
    line-height: 1.5;
  }

  .result-list {
    flex: 1 1 auto;
    list-style: none;
    margin: 0;
    padding: var(--space-2, 8px);
    overflow-y: auto;
    min-block-size: 0;
  }

  .result-item {
    display: grid;
    gap: calc(var(--space-1, 4px) / 2);
    padding: var(--space-2, 8px) var(--space-3, 12px);
    border-radius: var(--radius-sm);
    cursor: pointer;
  }

  .result-item[aria-selected='true'] {
    background: var(--bg-surface-active);
  }

  .result-item:focus-visible {
    outline: var(--focus-ring-width) solid var(--focus-ring-color);
    outline-offset: -1px;
  }

  .item-title {
    font-size: var(--text-base, 14px);
    color: var(--fg-default);
    line-height: 1.4;
    word-break: break-word;
  }

  .item-path {
    font-size: var(--text-xs, 12px);
    color: var(--fg-muted);
    line-height: 1.4;
    word-break: break-all;
  }

  ${unsafeCSS(HIGHLIGHT_RULE_TEMPLATE(SEARCH_DIALOG_HIGHLIGHT_SELECTOR))}

  .virtual-spacer {
    block-size: 0;
  }

  .footer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-3, 12px);
    flex-wrap: wrap;
    border-top: var(--border-width) solid var(--border-default);
    padding: var(--space-2, 8px) var(--space-3, 12px);
    font-size: var(--text-xs, 12px);
    color: var(--fg-muted);
  }

  .footer span {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1, 4px);
  }

  .footer kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-inline-size: 1em;
    padding: 0;
    border-radius: 0;
    background: transparent;
    color: inherit;
    font-size: inherit;
    font-family: inherit;
    line-height: 1;
  }

  @keyframes search-dialog-enter {
    from {
      opacity: 0;
      transform: scale(var(--scale-enter, 0.97));
    }

    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes search-dialog-exit {
    from {
      opacity: 1;
      transform: scale(1);
    }

    to {
      opacity: 0;
      transform: scale(var(--scale-enter, 0.97));
    }
  }

  @keyframes search-backdrop-enter {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  @keyframes search-backdrop-exit {
    from {
      opacity: 1;
    }

    to {
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .dialog,
    .dialog[data-closing],
    .dialog::backdrop,
    .dialog[data-closing]::backdrop {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1;
    }
  }

  @media (forced-colors: active) {
    .dialog {
      background: Canvas;
      border: var(--border-width-thick) solid CanvasText;
      box-shadow: none;
    }

    .dialog::backdrop {
      background: Canvas;
      opacity: 0.7;
      backdrop-filter: none;
    }

    .result-item[aria-selected='true'] {
      outline: var(--border-width-thick) solid Highlight;
      outline-offset: calc(-1 * var(--border-width-thick));
    }

    .close-button {
      border: var(--border-width) solid ButtonText;
      color: ButtonText;
    }
  }

  @media print {
    .dialog,
    .dialog::backdrop {
      display: none !important;
    }
  }
`;
