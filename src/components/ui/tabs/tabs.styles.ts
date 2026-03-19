import { css } from 'lit';

export const tabsStyles = css`
  :host {
    display: block;
    --_ui-tabs-inline-bleed: max(0px, var(--ui-tabs-inline-bleed, 0px));
  }

  .root {
    display: flex;
    flex-direction: column;
  }

  .root.orient-vertical {
    flex-direction: row;
    align-items: flex-start;
  }

  .tablist-container {
    position: relative;
    flex-shrink: 0;
    margin-inline: calc(-1 * var(--_ui-tabs-inline-bleed));
  }

  .tablist-container::after {
    content: '';
    position: absolute;
    inset-inline: 0;
    bottom: calc(-0.5 * var(--border-width-thick, 2px));
    border-bottom: var(--border-width, 1px) solid var(--border-default, oklch(90% 0 0 / 0.12));
    pointer-events: none;
  }

  [role='tablist'] {
    --_ui-tabs-focus-clearance: calc(var(--focus-ring-width, 2px) + var(--focus-ring-offset, 2px));

    display: flex;
    position: relative;
    overflow-x: auto;

    padding-block-start: var(--_ui-tabs-focus-clearance);
    margin-block-start: calc(-1 * var(--_ui-tabs-focus-clearance));

    padding-block-end: var(--_ui-tabs-focus-clearance);
    margin-block-end: calc(
      -1 * (var(--_ui-tabs-focus-clearance) + (0.5 * var(--border-width-thick, 2px)))
    );

    padding-inline: var(--_ui-tabs-focus-clearance);

    scroll-padding-inline: calc(var(--space-4, 16px) + var(--_ui-tabs-focus-clearance));

    scrollbar-width: var(--scrollbar-width, thin);
    scrollbar-color: var(--scrollbar-thumb, oklch(70% 0 0 / 0.3)) transparent;
  }

  .orient-vertical [role='tablist'] {
    flex-direction: column;
    border-bottom: none;
    border-right: var(--border-width, 1px) solid var(--border-default, oklch(90% 0 0 / 0.12));
    overflow-x: visible;
    overflow-y: auto;
    padding-bottom: calc(var(--focus-ring-width, 2px) + var(--focus-ring-offset, 2px));
    padding-right: calc(var(--border-width-thick, 2px) + var(--space-1, 4px));
  }

  .orient-vertical .tablist-container {
    margin-inline: 0;
  }

  .orient-vertical .tablist-container::after {
    content: none;
  }

  ::slotted([slot='tab']) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-1, 4px);

    height: var(--control-height-md, 32px);
    box-sizing: content-box;
    padding-block: max(
      0px,
      calc((var(--control-min-touch, 24px) - var(--control-height-md, 32px)) / 2)
    );
    padding-inline: var(--space-3, 12px);
    flex-shrink: 0;
    white-space: nowrap;

    font-size: var(--text-base, 14px);
    font-weight: var(--font-medium, 500);
    font-family: var(--font-sans);

    color: var(--fg-subtle, oklch(48% 0 0));

    background: none;
    border: none;
    cursor: pointer;
    user-select: none;
    text-decoration: none;
    -webkit-tap-highlight-color: transparent;

    position: relative;

    transition:
      color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
      transform var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
  }

  ::slotted([slot='tab']:active) {
    transform: scale(var(--scale-pressed, 0.96));
  }

  ::slotted([slot='tab']:hover) {
    color: var(--fg-default, oklch(20% 0 0));
  }

  ::slotted([slot='tab'][aria-selected='true']) {
    color: var(--primary, oklch(60% 0.15 250));
  }

  ::slotted([slot='tab']:focus-visible) {
    outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
    outline-offset: var(--focus-ring-offset, 2px);
    animation: var(--animation-focus);
    border-radius: var(--radius-sm, 3px);
    z-index: 2;
  }

  ::slotted([slot='tab'][aria-selected='true']) {
    border-bottom: var(--border-width-thick, 2px) solid var(--primary, oklch(60% 0.15 250));
  }

  :host([orientation='vertical']) ::slotted([slot='tab'][aria-selected='true']) {
    border-bottom: none;
    border-right: var(--border-width-thick, 2px) solid var(--primary, oklch(60% 0.15 250));
  }

  :host([hydrated]) ::slotted([slot='tab'][aria-selected='true']) {
    border-bottom: none;
    border-right: none;
  }

  .indicator {
    position: absolute;
    bottom: 0;
    height: var(--border-width-thick, 2px);
    background: var(--primary, oklch(60% 0.15 250));
    pointer-events: none;
    z-index: 1;
    transform-origin: left center;

    transition:
      left var(--duration-slow, 200ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
      width var(--duration-slow, 200ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
  }

  .orient-vertical .indicator {
    right: calc(-1 * var(--border-width, 1px));
    left: auto !important;
    bottom: auto;
    width: var(--border-width-thick, 2px) !important;
    height: auto;
    transform-origin: center top;

    transition:
      top var(--duration-slow, 200ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
      height var(--duration-slow, 200ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
  }

  .panels {
    display: grid;
    flex: 1;
    min-width: 0;
    margin-block-start: var(--ui-tabs-panel-gap, var(--prose-flow-space, var(--space-4, 16px)));
  }

  .orient-vertical .panels {
    margin-block-start: 0;
    margin-inline-start: var(--ui-tabs-panel-gap, var(--prose-flow-space, var(--space-4, 16px)));
  }

  ::slotted([slot='panel']) {
    grid-area: 1 / 1;
    display: block;
    opacity: 0;
    transition: opacity var(--duration-normal, 150ms)
      var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
  }

  ::slotted([slot='panel'][hidden]) {
    display: none !important;
  }

  ::slotted([slot='panel'][data-panel-active]) {
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    .indicator {
      transition-duration: 0.01ms !important;
    }

    ::slotted([slot='panel']) {
      transition-duration: 0.01ms !important;
    }

    ::slotted([slot='tab']) {
      transition-duration: 0.01ms !important;
    }
  }

  @media (forced-colors: active) {
    .indicator {
      display: none;
    }

    ::slotted([slot='tab']) {
      border: var(--border-width, 1px) solid CanvasText;
    }

    ::slotted([slot='tab'][aria-selected='true']) {
      border-bottom: var(--border-width-thick, 2px) solid Highlight !important;
      color: Highlight;
    }

    :host([orientation='vertical']) ::slotted([slot='tab'][aria-selected='true']) {
      border-bottom: var(--border-width, 1px) solid CanvasText !important;
      border-right: var(--border-width-thick, 2px) solid Highlight !important;
    }
  }
`;
