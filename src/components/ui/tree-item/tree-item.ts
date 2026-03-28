import { css, html, LitElement } from 'lit';
import type { PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import '../tooltip/tooltip';
import type { IconName } from '../../../icons/catalog.js';
import '../icon/icon.js';

type TreeItemDensity = 'normal' | 'compact';

/**
 * ツリーアイテム (Tree Item) コンポーネント
 *
 * 階層化された情報を探索するためのナビゲーション・コンポーネントです。
 * ネスト構造（Recursive Nesting）により、DOM構造と視覚階層を一致させ、
 * 堅牢なアクセシビリティを担保します。
 *
 * @slot children - 子ツリーアイテム（ネスト構造）
 * @slot icon - カスタムアイコン（icon プロパティの代わりに使用可能）
 *
 * @property {boolean} expanded - 子要素の展開状態
 * @property {boolean} selected - 現在選択されているか（カレント）
 * @property {string} label - 表示ラベル
 * @property {string} icon - コンテンツアイコン（例: "folder", "file"）
 * @property {string} density - 行の高さ密度（normal: 36px, compact: 24px）
 *
 * @fires expanded-change - 展開状態が変化した時
 * @fires selected-change - 選択状態が変化した時
 */
@customElement('ui-tree-item')
export class TreeItem extends LitElement {
  static override styles = css`
    :host {
      display: block;
      position: relative;
      min-inline-size: 0;
      --tree-item-content-gap: 4px;
      --tree-item-selected-bg: var(--bg-surface-active);
      --tree-item-selected-indicator-color: var(--primary, oklch(55% 0.2 250));
      --tree-item-selected-indicator-width: var(--border-width-thick, 2px);
      --tree-item-selection-start-gap: 2px;
      --tree-item-selection-start: calc(
        var(--tree-item-depth, 1) * var(--tree-indent-step, 16px)
      );
    }

    .item-row {
      position: relative;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: stretch;
      column-gap: var(--space-2, 8px);
      inline-size: 100%;
      min-inline-size: 0;
      box-sizing: border-box;
      padding-inline: var(--space-4, 16px);
      cursor: default;
      user-select: none;
    }

    .density-normal .item-row {
      min-block-size: 36px;
    }

    .density-compact .item-row {
      min-block-size: var(--control-height-sm, 24px);
    }

    .density-normal .item {
      min-block-size: 36px;
    }

    .density-compact .item {
      min-block-size: var(--control-height-sm, 24px);
    }

    .item {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      align-items: center;
      column-gap: var(--tree-item-content-gap, 4px);
      inline-size: 100%;
      min-inline-size: 0;
      box-sizing: border-box;
      padding: 0;
      border: 0;
      background: transparent;
      cursor: pointer;
      color: var(--fg-default, oklch(20% 0 0));
      font: inherit;
      font-size: 15px;
      font-weight: var(--font-normal, 400);
      text-align: start;
      text-decoration: none;
      appearance: none;
      -webkit-appearance: none;
      transition: color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    .item::before {
      content: '';
      position: absolute;
      inset-block: 0;
      inset-inline-start: var(--tree-item-selection-start);
      inset-inline-end: 0;
      background: transparent;
      transition: background-color var(--duration-fast, 70ms)
        var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    .item::after {
      content: none;
    }

    .item:hover::before {
      background: var(--bg-hover, oklch(from var(--fg-default) l c h / 0.05));
    }

    .item.is-branch:hover::before {
      background: oklch(from var(--fg-default) l c h / 0.03);
    }

    .item.is-page:hover::before {
      background: var(--bg-hover, oklch(from var(--fg-default) l c h / 0.05));
    }

    .item.has-content-icon {
      grid-template-columns: auto 16px minmax(0, 1fr);
    }

    .item.is-branch {
      color: var(--fg-muted, oklch(45% 0 0));
      font-weight: var(--font-normal, 400);
    }

    .item.is-page {
      color: var(--fg-default, oklch(20% 0 0));
      font-weight: var(--font-normal, 400);
      --tree-item-selection-start: calc(
        (var(--tree-item-active-slot-index, 0) * var(--tree-indent-step, 16px))
        + (var(--tree-indent-step, 16px) / 2)
        + (var(--tree-item-selected-indicator-width, 2px) / 2)
        + var(--tree-item-selection-start-gap, 0px)
      );
    }

    .item.is-page:hover {
      color: var(--fg-default, oklch(20% 0 0));
    }

    :host([selected]) .item {
      color: var(--fg-default, oklch(20% 0 0));
      font-weight: var(--font-medium, 500);
    }

    :host([selected]) .item::before {
      inset-block: var(--space-1, 4px);
      background: var(--tree-item-selected-bg, var(--bg-fill-muted, oklch(20% 0 0 / 0.045)));
      border-radius: var(--radius-sm, 4px);
    }

    :host([selected]) .item:hover::before {
      inset-block: var(--space-1, 4px);
      background: var(--tree-item-selected-bg, var(--bg-fill-muted, oklch(20% 0 0 / 0.045)));
      border-radius: var(--radius-sm, 4px);
    }

    :host([selected]) .leading-slot.is-indicator-host .current-slot-indicator {
      opacity: 1;
    }

    :host([ancestor-selected]) {
      --tree-item-guide-color: var(--border-muted, oklch(20% 0 0 / 0.08));
      --tree-item-guide-opacity: 0.56;
    }

    .leading {
      position: relative;
      display: flex;
      align-self: stretch;
      flex: 0 0 auto;
      min-inline-size: 0;
    }

    .leading-rails {
      position: relative;
      display: flex;
      align-self: stretch;
      inline-size: calc(
        var(--tree-item-leading-slot-count, 1) * var(--tree-indent-step, 16px)
      );
      min-inline-size: calc(
        var(--tree-item-leading-slot-count, 1) * var(--tree-indent-step, 16px)
      );
      flex: 0 0 calc(
        var(--tree-item-leading-slot-count, 1) * var(--tree-indent-step, 16px)
      );
    }

    .leading-slot {
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

    .leading-slot.is-current {
      color: var(--fg-muted, oklch(45% 0 0));
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
      inset-block: var(--space-1, 4px);
      inset-inline-start: 50%;
      inline-size: var(--tree-item-selected-indicator-width, 2px);
      border-radius: var(--radius-full, 9999px);
      background: var(
        --tree-item-selected-indicator-color,
        var(--primary, oklch(55% 0.2 250))
      );
      transform: translateX(-50%);
      opacity: 0;
      transition:
        background-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        opacity var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    :host([selected]) .leading-slot.is-current {
      color: var(--fg-default, oklch(20% 0 0));
      font-weight: var(--font-medium, 500);
    }

    :host([ancestor-selected]) .item.is-branch .leading-slot.is-current {
      color: var(--fg-default, oklch(20% 0 0));
    }

    .expand-icon,
    .content-icon {
      position: relative;
      z-index: 1;
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

    .label-cell,
    .end-cell {
      position: relative;
      z-index: 1;
      min-inline-size: 0;
    }

    .content-icon {
      grid-column: 2;
    }

    .item:not(.has-content-icon) .label-cell {
      grid-column: 2;
    }

    .item.has-content-icon .label-cell {
      grid-column: 3;
    }

    .content-icon.hidden {
      display: none;
    }

    .expand-icon.hidden {
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

    .label-cell {
      grid-column: 2;
      display: flex;
      align-items: center;
      inline-size: 100%;
      min-inline-size: 0;
      justify-self: stretch;
    }

    .item.has-content-icon .label-cell {
      grid-column: 3;
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
      .item::before,
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

      :host([selected]) .item::before {
        background: Highlight;
      }

      :host([selected]) .leading-slot.is-indicator-host .current-slot-indicator {
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

  @state()
  private hasChildren = false;

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
    const slot = this.shadowRoot?.querySelector('slot[name="icon"]') as HTMLSlotElement | null;
    this.hasCustomIcon = (slot?.assignedElements({ flatten: true }).length ?? 0) > 0;
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
  private _skipSyntheticAnchorClick = false;
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
    this.addEventListener('focus', this._hostFocusHandler);
  }

  override firstUpdated(): void {
    this._iconSlotChangeHandler();
    this._slotChangeHandler();

    const label = this.shadowRoot?.querySelector<HTMLElement>('.label');
    if (label) {
      this._labelResizeObserver = new ResizeObserver(() => {
        this._syncLabelTruncation();
      });
      this._labelResizeObserver.observe(label);
    }

    this._syncChildrenHeightImmediately();
  }

  override disconnectedCallback(): void {
    this.removeEventListener('focus', this._hostFocusHandler);
    this._labelResizeObserver?.disconnect();
    this._childrenTransitionCleanup?.();
    cancelAnimationFrame(this._childrenAnimationFrame);
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

    requestAnimationFrame(() => {
      this._syncLabelTruncation();
    });

    if (changedProperties.has('expanded')) {
      this._syncChildrenHeight();
    }
  }

  private _handleKeyDown = (e: KeyboardEvent): void => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        this._activateItem();
        break;

      case ' ':
        e.preventDefault();
        this._handleSelect();
        break;

      case 'ArrowRight':
        e.preventDefault();
        if (this.hasChildren && !this.expanded) {
          this._toggleExpanded();
        } else {
          this.dispatchEvent(
            new CustomEvent('tree-item-arrow-right', {
              bubbles: true,
              composed: true,
            }),
          );
        }
        break;

      case 'ArrowLeft':
        e.preventDefault();
        if (this.hasChildren && this.expanded) {
          this._toggleExpanded();
        } else {
          this.dispatchEvent(
            new CustomEvent('tree-item-arrow-left', {
              bubbles: true,
              composed: true,
            }),
          );
        }
        break;
    }
  };

  private _handleClick = (e: MouseEvent): void => {
    const clickedAnchor = this._isAnchorEvent(e);
    if (clickedAnchor && this._skipSyntheticAnchorClick) {
      return;
    }

    if (this.hasChildren) {
      this._toggleExpanded();
      return;
    }

    this._handleSelect();

    if (!clickedAnchor) {
      this._triggerAnchorNavigation();
    }
  };

  private _activateItem(): void {
    this._handleSelect();
    this._triggerAnchorNavigation();
  }

  private _handleSelect(): void {
    this.selected = true;
    this.dispatchEvent(
      new CustomEvent('selected-change', {
        detail: { selected: this.selected },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _triggerAnchorNavigation(): void {
    const anchor = this.shadowRoot?.querySelector<HTMLAnchorElement>('a.item');
    if (!anchor || !this.href) {
      return;
    }

    this._skipSyntheticAnchorClick = true;
    anchor.click();
    queueMicrotask(() => {
      this._skipSyntheticAnchorClick = false;
    });
  }

  private _isAnchorEvent(event: Event): boolean {
    return event.composedPath().some((target) => target instanceof HTMLAnchorElement);
  }

  private _toggleExpanded(): void {
    if (!this.hasChildren) return;

    this.expanded = !this.expanded;
    this.dispatchEvent(
      new CustomEvent('expanded-change', {
        detail: { expanded: this.expanded },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _getChildrenContainer(): HTMLElement | null {
    return this.shadowRoot?.querySelector<HTMLElement>('.children') ?? null;
  }

  private _syncHasChildren(): void {
    const nextHasChildren = Array.from(this.children).some(
      (child) => child.getAttribute('slot') === 'children',
    );

    if (this.hasChildren !== nextHasChildren) {
      this.hasChildren = nextHasChildren;
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
    const leadingSlotCount = isBranch
      ? Math.max(resolvedDepth, 1)
      : Math.max(resolvedDepth - 1, 1);
    const currentSlotIndex = Math.max(leadingSlotCount - 1, 0);
    const rowStyle = [
      `--tree-item-depth: ${resolvedDepth.toString()};`,
      `--tree-item-leading-slot-count: ${leadingSlotCount.toString()};`,
      `--tree-item-active-slot-index: ${currentSlotIndex.toString()};`,
    ].join(' ');
    const tabIndex = this.getAttribute('tabindex') ?? '0';
    const childrenHidden = !this.hasChildren;

    const leadingSlots = Array.from({ length: leadingSlotCount }, (_, index) => {
      const isCurrentSlot = index === currentSlotIndex;
      const shouldRenderGuideLine = !isCurrentSlot || !isBranch;

      return html`
        <span
          class=${classMap({
            'leading-slot': true,
            'is-rail': !isCurrentSlot,
            'is-current': isCurrentSlot,
            'is-indicator-host': !isBranch && isCurrentSlot,
          })}
          aria-hidden="true"
        >
          ${shouldRenderGuideLine ? html`<span class="guide-line" aria-hidden="true"></span>` : null}

          ${isCurrentSlot && isBranch
            ? html`
                <span class="current-slot-line"></span>
                <span class="expand-icon">
                  <span class="expand-glyph">
                    <ui-icon name="chevron-right"></ui-icon>
                  </span>
                </span>
              `
            : null}

          ${isCurrentSlot && !isBranch ? html`<span class="current-slot-indicator"></span>` : null}
        </span>
      `;
    });

    const controlContent = html`
      <span class="leading">
        <span class="leading-rails">
          ${leadingSlots}
        </span>
      </span>

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
          <slot
            class="children-slot"
            name="children"
            @slotchange=${this._slotChangeHandler}
          ></slot>
        </div>
      </div>
    `;
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
