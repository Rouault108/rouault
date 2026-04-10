import { css, html, LitElement } from 'lit';
import type { PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import '../tooltip/tooltip';
import type { IconName } from '../../../../shared/icons/icons-catalog.js';
import '../icon/icon.js';

type TreeItemDensity = 'normal' | 'compact';

@customElement('ui-tree-item')
export class TreeItem extends LitElement {
  static override styles = css`
    :host {
      display: block;
      position: relative;
      min-inline-size: 0;
      --tree-item-content-gap: 4px;

      --tree-item-row-inline-padding: var(--sidebar-item-row-inline-padding, var(--space-4, 16px));
      --tree-item-row-column-gap: var(--sidebar-item-row-column-gap, var(--space-2, 8px));

      --tree-item-selected-bg: var(
        --sidebar-item-active-bg,
        oklch(from var(--primary) l c h / 0.05)
      );
      --tree-item-selected-indicator-color: var(
        --nav-item-indicator-color,
        var(--primary, oklch(55% 0.2 250))
      );
      --tree-item-selected-indicator-width: var(
        --nav-item-indicator-width,
        var(--border-width-thick, 2px)
      );
      --tree-item-selected-indicator-radius: var(
        --nav-item-indicator-radius,
        var(--radius-full, 9999px)
      );

      --tree-item-active-surface-inset-block: var(
        --sidebar-item-active-surface-inset-block,
        var(--space-1, 4px)
      );
      --tree-item-current-indicator-inset-block: var(
        --sidebar-item-current-indicator-inset-block,
        5px
      );

      --tree-item-guide-color: var(--sidebar-item-guide-color, var(--border-muted));
      --tree-item-guide-opacity: var(--sidebar-item-guide-opacity, 0.42);
      --tree-item-current-slot-gap-half: var(--sidebar-item-current-slot-gap-half, 10px);
    }

    :host([ancestor-selected]) {
      --tree-item-guide-color: var(
        --sidebar-item-guide-color-active-context,
        var(--border-default)
      );
      --tree-item-guide-opacity: var(--sidebar-item-guide-opacity-active-context, 0.56);
    }

    .item-row {
      position: relative;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: stretch;
      column-gap: var(--tree-item-row-column-gap);
      inline-size: 100%;
      min-inline-size: 0;
      box-sizing: border-box;
      padding-inline: var(--tree-item-row-inline-padding);
      cursor: default;
      user-select: none;
    }

    .density-normal .item-row,
    .density-normal .item {
      min-block-size: var(--sidebar-item-row-min-block-size-normal, 36px);
    }

    .density-compact .item-row,
    .density-compact .item {
      min-block-size: var(
        --sidebar-item-row-min-block-size-compact,
        var(--control-height-sm, 24px)
      );
    }

    .item {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      align-items: stretch;
      column-gap: 0;
      inline-size: 100%;
      min-inline-size: 0;
      box-sizing: border-box;
      padding: 0;
      border: 0;
      background: transparent;
      cursor: pointer;
      color: var(--sidebar-item-fg-branch, var(--fg-muted, oklch(45% 0 0)));
      font: inherit;
      font-size: var(--sidebar-item-font-size, var(--text-base, 14px));
      font-weight: var(--sidebar-item-font-weight, 400);
      line-height: var(--sidebar-item-line-height, 1.5);
      text-align: start;
      text-decoration: none;
      appearance: none;
      -webkit-appearance: none;
      transition: color var(--nav-item-transition-duration, var(--duration-fast, 70ms))
        var(--nav-item-transition-easing, var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)));
    }

    .item.is-branch {
      color: var(--sidebar-item-fg-branch, var(--fg-muted, oklch(45% 0 0)));
      font-weight: var(--sidebar-item-font-weight, 400);
    }

    .item.is-page {
      color: var(--sidebar-item-fg-page, var(--fg-muted, oklch(45% 0 0)));
      font-weight: var(--sidebar-item-font-weight, 400);
    }

    .item.is-branch:hover,
    .item.is-page:hover {
      color: var(--sidebar-item-fg-hover, var(--fg-default, oklch(20% 0 0)));
    }

    :host([selected]) .item {
      color: var(--sidebar-item-fg-active, var(--fg-default, oklch(20% 0 0)));
      font-weight: var(--sidebar-item-font-weight-active, var(--font-medium, 500));
    }

    .ancestor-rails {
      position: relative;
      display: flex;
      align-self: stretch;
      inline-size: calc(var(--tree-item-ancestor-rail-count, 0) * var(--tree-indent-step, 16px));
      min-inline-size: calc(var(--tree-item-ancestor-rail-count, 0) * var(--tree-indent-step, 16px));
      flex: 0 0 calc(var(--tree-item-ancestor-rail-count, 0) * var(--tree-indent-step, 16px));
    }

    .ancestor-rail {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      inline-size: var(--tree-indent-step, 16px);
      min-inline-size: var(--tree-indent-step, 16px);
      block-size: 100%;
      min-block-size: 100%;
      flex: 0 0 var(--tree-indent-step, 16px);
      box-sizing: border-box;
    }

    .surface {
      position: relative;
      display: grid;
      grid-template-columns: var(--tree-indent-step, 16px) minmax(0, 1fr);
      align-items: center;
      inline-size: 100%;
      min-inline-size: 0;
      block-size: 100%;
      min-block-size: 100%;
      box-sizing: border-box;
    }

    .item.has-content-icon .surface {
      grid-template-columns: var(--tree-indent-step, 16px) 16px minmax(0, 1fr);
    }

    .surface::before {
      content: '';
      position: absolute;
      inset-block: 0;
      inset-inline: 0;
      background: transparent;
      pointer-events: none;
      transition: background-color var(--nav-item-transition-duration, var(--duration-fast, 70ms))
        var(--nav-item-transition-easing, var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)));
    }

    .item.is-branch:hover .surface::before {
      background: var(--sidebar-item-branch-hover-bg, oklch(from var(--fg-default) l c h / 0.022));
    }

    .item.is-page:hover .surface::before {
      background: var(
        --sidebar-item-hover-bg,
        var(--bg-hover, oklch(from var(--fg-default) l c h / 0.05))
      );
    }

    :host([selected]) .surface::before,
    :host([selected]) .item:hover .surface::before {
      inset-block: var(--tree-item-active-surface-inset-block);
      background: var(--tree-item-selected-bg);
      border-radius: var(--sidebar-item-active-radius, var(--radius-sm, 4px));
    }

    .current-slot,
    .content-icon,
    .label-cell {
      position: relative;
      z-index: 1;
      min-inline-size: 0;
    }

    .current-slot {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      inline-size: var(--tree-indent-step, 16px);
      min-inline-size: var(--tree-indent-step, 16px);
      block-size: 100%;
      min-block-size: 100%;
      flex: 0 0 var(--tree-indent-step, 16px);
      box-sizing: border-box;
      grid-column: 1;
    }

    .current-slot.is-branch {
      color: var(--sidebar-item-fg-branch, var(--fg-muted, oklch(45% 0 0)));
    }

    :host([selected]) .current-slot.is-branch {
      color: var(--sidebar-item-fg-active, var(--fg-default, oklch(20% 0 0)));
      font-weight: var(--sidebar-item-font-weight-active, var(--font-medium, 500));
    }

    .guide-line {
      position: absolute;
      inset-block: 0;
      inline-size: 1px;
      background: var(--tree-item-guide-color);
      opacity: var(--tree-item-guide-opacity);
      inset-inline-start: 50%;
      transform: translateX(-50%);
    }

    .current-slot-line {
      position: absolute;
      inset-block: 0;
      inline-size: 1px;
      inset-inline-start: 50%;
      transform: translateX(-50%);
      pointer-events: none;
    }

    .current-slot-line::before,
    .current-slot-line::after {
      content: '';
      position: absolute;
      inset-inline-start: 0;
      inline-size: 100%;
      background: var(--tree-item-guide-color);
      opacity: var(--tree-item-guide-opacity);
    }

    .current-slot-line::before {
      inset-block-start: 0;
      block-size: calc(50% - var(--tree-item-current-slot-gap-half, 10px));
    }

    .current-slot-line::after {
      inset-block-end: 0;
      block-size: calc(50% - var(--tree-item-current-slot-gap-half, 10px));
    }

    .current-slot-indicator {
      position: absolute;
      inset-block: var(--tree-item-current-indicator-inset-block);
      inset-inline-start: 50%;
      inline-size: var(--tree-item-selected-indicator-width, 2px);
      border-radius: var(--tree-item-selected-indicator-radius, var(--radius-full, 9999px));
      background: var(--tree-item-selected-indicator-color, var(--primary, oklch(55% 0.2 250)));
      transform: translateX(-50%);
      opacity: 0;
      transition:
        background-color var(--nav-item-transition-duration, var(--duration-fast, 70ms))
          var(--nav-item-transition-easing, var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9))),
        opacity var(--nav-item-transition-duration, var(--duration-fast, 70ms))
          var(--nav-item-transition-easing, var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)));
    }

    :host([selected]) .current-slot.is-leaf .current-slot-indicator {
      opacity: 1;
    }

    .expand-icon,
    .content-icon {
      inline-size: 16px;
      min-inline-size: 16px;
      max-inline-size: 16px;
      block-size: 16px;
      display: flex;
      flex: 0 0 16px;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .expand-glyph {
      display: flex;
      align-items: center;
      justify-content: center;
      inline-size: 16px;
      block-size: 16px;
      transform: rotate(0deg);
      transform-origin: center;
      transition: transform var(--duration-slow, 200ms)
        var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    :host([expanded]) .expand-glyph {
      transform: rotate(90deg);
    }

    .item:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      border-radius: var(--focus-ring-radius, 4px);
      animation: var(--animation-focus);
    }

    .content-icon {
      grid-column: 2;
    }

    .content-icon.hidden {
      display: none;
    }

    .expand-glyph > ui-icon,
    .content-icon > ui-icon {
      display: block;
      inline-size: 16px;
      min-inline-size: 16px;
      max-inline-size: 16px;
      block-size: 16px;
      min-block-size: 16px;
      max-block-size: 16px;
      flex: 0 0 16px;
      font-size: 16px;
      line-height: 1;
    }

    .content-icon-slot::slotted(*) {
      display: block;
      inline-size: 16px;
      min-inline-size: 16px;
      max-inline-size: 16px;
      block-size: 16px;
      min-block-size: 16px;
      max-block-size: 16px;
      flex: 0 0 16px;
      overflow: hidden;
    }

    .item:not(.has-content-icon) .label-cell {
      grid-column: 2;
    }

    .item.has-content-icon .label-cell {
      grid-column: 3;
    }

    .label-cell {
      display: flex;
      align-items: center;
      inline-size: 100%;
      min-inline-size: 0;
      justify-self: stretch;
    }

    .label-tooltip {
      display: block;
      inline-size: 100%;
      min-inline-size: 0;
    }

    .label {
      display: block;
      inline-size: 100%;
      min-inline-size: 0;
      font-size: 15px;
      line-height: var(--line-height-normal, 1.5);
      text-align: start;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .end-cell {
      position: relative;
      z-index: 1;
      min-inline-size: 0;
      grid-column: 2;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .end-slot {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-inline-size: 0;
    }

    .children {
      position: relative;
      display: block;
      min-inline-size: 0;
      margin-left: 0;
      visibility: hidden;
      pointer-events: none;
      overflow: hidden;
      height: 0;
      opacity: 0;
      transition:
        height var(--duration-slow, 200ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        opacity var(--duration-slow, 200ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        visibility 0s linear var(--duration-slow, 200ms);
    }

    .children-slot {
      display: block;
      min-inline-size: 0;
    }

    .children-slot::slotted(ui-tree-item) {
      display: block;
      min-inline-size: 0;
    }

    :host([expanded]) .children {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
      transition:
        height var(--duration-slow, 200ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        opacity var(--duration-slow, 200ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        visibility 0s;
    }

    @media (prefers-reduced-motion: reduce) {
      .item,
      .surface::before,
      .current-slot-line,
      .current-slot-indicator,
      .expand-glyph,
      .children {
        transition-duration: 0.01ms;
      }
    }

    @media (forced-colors: active) {
      .guide-line,
      .current-slot-line::before,
      .current-slot-line::after {
        background: CanvasText;
        opacity: 1;
      }

      :host([selected]) .item {
        color: HighlightText;
        forced-color-adjust: none;
        outline: var(--border-width-thick, 2px) solid CanvasText;
        outline-offset: -1px;
      }

      :host([selected]) .surface::before {
        background: Highlight;
      }

      :host([selected]) .current-slot.is-leaf .current-slot-indicator {
        background: CanvasText;
        opacity: 1;
      }
    }

    @media print {
      :host([print-mode]) .expand-icon {
        display: none;
      }

      :host([print-mode]) .children {
        height: auto !important;
        opacity: 1 !important;
        overflow: visible !important;
      }
    }
  `;

  @property({ type: Boolean, reflect: true })
  expanded = false;

  @property({ type: Boolean, reflect: true })
  selected = false;

  @property({ type: Boolean, reflect: true, attribute: 'ancestor-selected' })
  ancestorSelected = false;

  @property({ type: Number, reflect: true })
  depth = 0;

  @property({ type: String, reflect: true })
  label = '';

  @property({ type: String, reflect: true })
  icon?: IconName;

  @property({ type: String, reflect: true })
  href?: string;

  @property({ type: String, reflect: true })
  density: TreeItemDensity = 'normal';

  @property({ type: Boolean, reflect: true, attribute: 'print-mode' })
  printMode = false;

  @property({ type: Boolean, reflect: true, attribute: 'has-children' })
  hasChildren = false;

  @state()
  private hasCustomIcon = false;

  @state()
  private isLabelTruncated = false;

  private readonly _slotChangeHandler = () => {
    this._syncHasChildren();
    void this.updateComplete.then(() => {
      this._syncChildrenHeightImmediately();
    });
  };

  private readonly _iconSlotChangeHandler = () => {
    this._syncHasCustomIcon();
  };

  private readonly _hostFocusHandler = (e: FocusEvent) => {
    if (e.target !== this || this._forwardingFocus) {
      return;
    }

    const control = this.shadowRoot?.querySelector<HTMLElement>('.item');
    if (!control) {
      return;
    }

    if (this.shadowRoot?.activeElement === control) {
      return;
    }

    this._forwardingFocus = true;
    control.focus();
    queueMicrotask(() => {
      this._forwardingFocus = false;
    });
  };

  private _labelResizeObserver?: ResizeObserver;
  private _childrenTransitionCleanup: (() => void) | undefined;
  private _childrenAnimationFrame = 0;
  private _labelSyncAnimationFrame = 0;
  private _forwardingFocus = false;

  private _computeAriaLevel(): number {
    let level = 1;
    let parent = this.parentElement;

    while (parent) {
      if (parent.tagName.toLowerCase() === 'ui-tree-item') {
        level += 1;
      }
      parent = parent.parentElement;
    }

    return level;
  }

  private _getResolvedDepth(): number {
    if (this.depth > 0) {
      return this.depth;
    }

    return this._computeAriaLevel();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (name === 'tabindex' && oldValue !== newValue) {
      this.requestUpdate();
    }
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'treeitem');
    this._syncHasChildren();
    this._syncHasCustomIcon();
    this.addEventListener('focus', this._hostFocusHandler);
  }

  override firstUpdated(): void {
    this._iconSlotChangeHandler();
    this._slotChangeHandler();

    const label = this.shadowRoot?.querySelector<HTMLElement>('.label');
    if (label) {
      this._labelResizeObserver = new ResizeObserver(() => {
        this._scheduleLabelTruncationSync();
      });
      this._labelResizeObserver.observe(label);
    }

    this._syncChildrenHeightImmediately();
    this._scheduleLabelTruncationSync();
  }

  override disconnectedCallback(): void {
    this.removeEventListener('focus', this._hostFocusHandler);
    this._labelResizeObserver?.disconnect();
    this._childrenTransitionCleanup?.();
    cancelAnimationFrame(this._childrenAnimationFrame);
    cancelAnimationFrame(this._labelSyncAnimationFrame);
    super.disconnectedCallback();
  }

  override updated(changedProperties: PropertyValues<this>): void {
    if (this.hasChildren) {
      this.setAttribute('aria-expanded', String(this.expanded));
    } else {
      this.removeAttribute('aria-expanded');
    }

    this.setAttribute('aria-selected', String(this.selected));
    this.setAttribute('aria-level', String(this._getResolvedDepth()));

    if (
      changedProperties.has('label') ||
      changedProperties.has('icon') ||
      changedProperties.has('selected') ||
      changedProperties.has('density') ||
      changedProperties.has('expanded') ||
      changedProperties.has('hasChildren')
    ) {
      this._scheduleLabelTruncationSync();
    }

    if (changedProperties.has('expanded')) {
      this._syncChildrenHeight();
    }
  }

  private _handleKeyDown = (e: KeyboardEvent): void => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        this._requestPrimaryAction();
        break;

      case ' ':
        e.preventDefault();
        this._requestPrimaryAction();
        break;

      case 'ArrowRight':
        e.preventDefault();
        if (this.hasChildren && !this.expanded) {
          this._requestExpanded(true);
        } else {
          this._requestFocusFirstChild();
        }
        break;

      case 'ArrowLeft':
        e.preventDefault();
        if (this.hasChildren && this.expanded) {
          this._requestExpanded(false);
        } else {
          this._requestFocusParent();
        }
        break;
    }
  };

  private _handleClick = (e: MouseEvent): void => {
    if (this.hasChildren && this._isExpandControlEvent(e)) {
      this._requestExpanded(!this.expanded);
      return;
    }

    this._requestPrimaryAction();
  };

  private _requestPrimaryAction(): void {
    const detail = this.href
      ? { hasChildren: this.hasChildren, href: this.href }
      : { hasChildren: this.hasChildren };

    this.dispatchEvent(
      new CustomEvent<{ hasChildren: boolean; href?: string }>('tree-item-primary-action-request', {
        detail,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _requestExpanded(expanded: boolean): void {
    this.dispatchEvent(
      new CustomEvent<{ expanded: boolean }>('tree-item-expanded-request', {
        detail: { expanded },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _requestFocusFirstChild(): void {
    this.dispatchEvent(
      new CustomEvent('tree-item-focus-first-child-request', {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _requestFocusParent(): void {
    this.dispatchEvent(
      new CustomEvent('tree-item-focus-parent-request', {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _isExpandControlEvent(event: Event): boolean {
    return event.composedPath().some((target) => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }

      return target.classList.contains('expand-icon') || target.classList.contains('expand-glyph');
    });
  }

  private _getChildrenContainer(): HTMLElement | null {
    return this.shadowRoot?.querySelector<HTMLElement>('.children') ?? null;
  }

  private _syncHasChildren(): void {
    const hasExplicitChildren = this.hasAttribute('has-children');
    const nextHasChildren =
      hasExplicitChildren ||
      Array.from(this.children).some((child) => child.getAttribute('slot') === 'children');

    if (this.hasChildren !== nextHasChildren) {
      this.hasChildren = nextHasChildren;
    }
  }

  private _syncHasCustomIcon(): void {
    const slot = this.shadowRoot?.querySelector('slot[name="icon"]') as HTMLSlotElement | null;
    const nextHasCustomIcon =
      (slot?.assignedElements({ flatten: true }).length ?? 0) > 0 ||
      this.querySelector('[slot="icon"]') !== null;

    if (this.hasCustomIcon !== nextHasCustomIcon) {
      this.hasCustomIcon = nextHasCustomIcon;
      this._scheduleLabelTruncationSync();
    }
  }

  private _syncChildrenHeightImmediately(): void {
    const container = this._getChildrenContainer();
    if (!container) return;

    container.style.height = this.expanded ? 'auto' : '0px';
  }

  private _syncChildrenHeight(): void {
    const container = this._getChildrenContainer();
    if (!container) return;

    this._childrenTransitionCleanup?.();
    cancelAnimationFrame(this._childrenAnimationFrame);

    if (this.printMode || this._prefersReducedMotion()) {
      container.style.height = this.expanded ? 'auto' : '0px';
      return;
    }

    if (this.expanded) {
      const targetHeight = container.scrollHeight;
      if (targetHeight === 0) {
        container.style.height = 'auto';
        return;
      }

      this._animateChildrenExpand(container);
      return;
    }

    this._animateChildrenCollapse(container);
  }

  private _animateChildrenExpand(container: HTMLElement): void {
    container.style.height = '0px';

    const targetHeight = container.scrollHeight;
    if (targetHeight === 0) {
      container.style.height = 'auto';
      return;
    }

    this._childrenAnimationFrame = requestAnimationFrame(() => {
      container.style.height = `${targetHeight.toString()}px`;
    });

    const handleTransitionEnd = (event: TransitionEvent): void => {
      if (event.target !== container || event.propertyName !== 'height') return;
      container.style.height = 'auto';
      container.removeEventListener('transitionend', handleTransitionEnd);
      this._childrenTransitionCleanup = undefined;
    };

    container.addEventListener('transitionend', handleTransitionEnd);
    this._childrenTransitionCleanup = () => {
      container.removeEventListener('transitionend', handleTransitionEnd);
      this._childrenTransitionCleanup = undefined;
    };
  }

  private _animateChildrenCollapse(container: HTMLElement): void {
    const currentHeight = container.scrollHeight;
    container.style.height = `${currentHeight.toString()}px`;
    void container.offsetHeight;

    this._childrenAnimationFrame = requestAnimationFrame(() => {
      container.style.height = '0px';
    });
  }

  private _prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  override focus(options?: FocusOptions): void {
    this.shadowRoot?.querySelector<HTMLElement>('.item')?.focus(options);
  }

  override render() {
    const showContentIcon = Boolean(this.icon) || this.hasCustomIcon;
    const isBranch = this.hasChildren;
    const isLinkLeaf = !isBranch && Boolean(this.href);
    const resolvedDepth = this._getResolvedDepth();

    const classes = {
      [`density-${this.density}`]: true,
    };

    const controlClasses = {
      item: true,
      'has-children': isBranch,
      'has-content-icon': showContentIcon,
      'is-branch': isBranch,
      'is-page': !isBranch,
    };

    const rowClasses = {
      'item-row': true,
      'is-branch': isBranch,
      'is-page': !isBranch,
    };

    const ancestorRailCount = isBranch
      ? Math.max(resolvedDepth - 1, 0)
      : Math.max(resolvedDepth - 2, 0);

    const rowStyle = [
      `--tree-item-depth: ${resolvedDepth.toString()};`,
      `--tree-item-ancestor-rail-count: ${ancestorRailCount.toString()};`,
    ].join(' ');

    const tabIndex = this.getAttribute('tabindex') ?? '0';
    const childrenHidden = !this.hasChildren;

    const ancestorRails = Array.from({ length: ancestorRailCount }, () => {
      return html`
        <span class="ancestor-rail" aria-hidden="true">
          <span class="guide-line"></span>
        </span>
      `;
    });

    const currentSlot = isBranch
      ? html`
          <span class="current-slot is-branch" aria-hidden="true">
            <span class="current-slot-line"></span>
            <span class="expand-icon">
              <span class="expand-glyph">
                <ui-icon name="chevron-right"></ui-icon>
              </span>
            </span>
          </span>
        `
      : html`
          <span class="current-slot is-leaf" aria-hidden="true">
            <span class="guide-line"></span>
            <span class="current-slot-indicator"></span>
          </span>
        `;

    const controlContent = html`
      <span class="ancestor-rails" aria-hidden="true">${ancestorRails}</span>

      <span class="surface">
        ${currentSlot}

        <span
          class=${classMap({
            'content-icon': true,
            hidden: !showContentIcon,
          })}
          aria-hidden="true"
        >
          ${this.icon
            ? html`<ui-icon name=${this.icon}></ui-icon>`
            : html`<slot
                class="content-icon-slot"
                name="icon"
                @slotchange=${this._iconSlotChangeHandler}
              ></slot>`}
        </span>

        <span class="label-cell">
          <ui-tooltip
            class="label-tooltip"
            .text=${this.label}
            variant="subtle"
            placement="bottom-start"
            .disabled=${!this.isLabelTruncated}
          >
            <span class="label">${this.label}</span>
          </ui-tooltip>
        </span>
      </span>
    `;

    return html`
      <div class=${classMap(classes)}>
        <div class=${classMap(rowClasses)} style=${rowStyle}>
          ${isLinkLeaf
            ? html`
                <a
                  class=${classMap(controlClasses)}
                  tabindex=${tabIndex}
                  href=${ifDefined(this.href)}
                  aria-current=${ifDefined(this.selected ? 'page' : undefined)}
                  @click=${this._handleClick}
                  @keydown=${this._handleKeyDown}
                >
                  ${controlContent}
                </a>
              `
            : html`
                <button
                  class=${classMap(controlClasses)}
                  type="button"
                  tabindex=${tabIndex}
                  aria-expanded=${ifDefined(this.hasChildren ? String(this.expanded) : undefined)}
                  @click=${this._handleClick}
                  @keydown=${this._handleKeyDown}
                >
                  ${controlContent}
                </button>
              `}

          <div class="end-cell" aria-hidden="true">
            <slot class="end-slot" name="end"></slot>
          </div>
        </div>

        <div
          class="children"
          role=${ifDefined(this.hasChildren ? 'group' : undefined)}
          aria-hidden=${String(childrenHidden || !this.expanded)}
          ?inert=${childrenHidden || !this.expanded}
          ?hidden=${childrenHidden}
        >
          <slot class="children-slot" name="children" @slotchange=${this._slotChangeHandler}></slot>
        </div>
      </div>
    `;
  }

  private _scheduleLabelTruncationSync(): void {
    cancelAnimationFrame(this._labelSyncAnimationFrame);

    this._labelSyncAnimationFrame = requestAnimationFrame(() => {
      this._labelSyncAnimationFrame = 0;

      if (!this.isConnected) {
        return;
      }

      this._syncLabelTruncation();
    });
  }

  private _syncLabelTruncation(): void {
    const label = this.shadowRoot?.querySelector<HTMLElement>('.label');
    if (!label) return;
    this.isLabelTruncated = label.scrollWidth > label.clientWidth;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-tree-item': TreeItem;
  }
}
