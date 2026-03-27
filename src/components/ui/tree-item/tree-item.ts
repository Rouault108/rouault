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
 * @property {string} density - 行の高さ密度（normal: 32px, compact: 24px）
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
    }

    .item {
      position: relative;
      display: grid;
      grid-template-columns: 16px minmax(0, 1fr) auto;
      align-items: center;
      column-gap: var(--space-2, 8px);
      inline-size: 100%;
      min-inline-size: 0;
      box-sizing: border-box;
      padding-inline: var(--space-4, 16px);
      cursor: pointer;
      user-select: none;
      color: var(--fg-muted, oklch(48% 0 0));
      transition: color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    .item::before {
      content: '';
      position: absolute;
      inset-block: 0;
      left: calc(-1 * var(--space-4, 16px));
      right: calc(-1 * var(--space-4, 16px));
      background: transparent;
      z-index: 0;
      transition: background-color var(--duration-fast, 70ms)
        var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    .density-normal .item {
      min-block-size: var(--control-height-md, 32px);
    }

    .density-compact .item {
      min-block-size: var(--control-height-sm, 24px);
    }

    .item:hover::before {
      background: var(--bg-hover, oklch(0% 0 0 / 0.05));
    }

    .item:hover {
      color: var(--fg-default, oklch(20% 0 0));
    }

    :host([selected]) .item::before {
      background: var(
        --bg-surface-active,
        oklch(from var(--primary, oklch(60% 0.15 250)) l c h / 0.1)
      );
    }

    :host([selected]) .item {
      color: var(--primary, oklch(60% 0.15 250));
      font-weight: var(--font-medium, 500);
    }

    .item:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      border-radius: var(--focus-ring-radius, 4px);
      animation: var(--animation-focus);
    }

    .expand-icon,
    .content-icon,
    .label-cell,
    .end-cell {
      position: relative;
      z-index: 1;
      min-inline-size: 0;
    }

    .expand-icon,
    .content-icon {
      grid-column: auto;
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

    .expand-icon {
      grid-column: 1;
    }

    .item.has-content-icon {
      grid-template-columns: 16px 16px minmax(0, 1fr) auto;
    }

    .content-icon {
      grid-column: 2;
    }

    .expand-icon.hidden,
    .content-icon.hidden {
      visibility: hidden;
      pointer-events: none;
    }

    .content-icon.hidden {
      display: none;
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
      font-size: var(--text-base, 14px);
      line-height: var(--line-height-normal, 1.5);
      text-align: start;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .label-link {
      color: inherit;
      text-decoration: none;
      display: block;
      inline-size: 100%;
      min-inline-size: 0;
      text-align: inherit;
      line-height: inherit;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .end-cell {
      grid-column: 3;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .item.has-content-icon .end-cell {
      grid-column: 4;
    }

    .item > ui-icon {
      grid-column: 2;
      justify-self: start;
      align-self: center;
      display: block;
      inline-size: 16px;
      min-inline-size: 16px;
      max-inline-size: 16px;
      block-size: 16px;
      min-block-size: 16px;
      max-block-size: 16px;
      overflow: hidden;
      font-size: 16px;
      line-height: 1;
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
      border-left: var(--border-width, 1px) solid var(--border-ghost, oklch(0% 0 0 / 0.04));
      margin-left: var(--space-4, 16px);
      visibility: hidden;
      pointer-events: none;
      overflow: hidden;
      height: 0;
      opacity: 0;
      transition:
        height var(--duration-slow, 200ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        opacity var(--duration-slow, 200ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        border-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
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
        border-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        visibility 0s;
    }

    :host([selected]) .children,
    :host(:has([selected])) > .children {
      border-left-color: var(--fg-muted, oklch(48% 0 0));
    }

    .density-compact .item::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      transform: translateY(-50%);
      min-height: var(--control-min-touch, 24px);
      pointer-events: auto;
    }

    @media (prefers-reduced-motion: reduce) {
      .item,
      .item::before,
      .expand-glyph,
      .children {
        transition-duration: 0.01ms;
      }
    }

    @media (forced-colors: active) {
      .children {
        border-left-color: CanvasText;
      }

      :host([selected]) .item {
        background-color: Highlight;
        color: HighlightText;
        outline: var(--border-width-thick, 2px) solid CanvasText;
        outline-offset: -1px;
        forced-color-adjust: none;
      }

      :host([selected]) .item::before {
        background: Highlight;
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
    if (e.target === this) {
      this.focus();
    }
  };

  private _labelResizeObserver?: ResizeObserver;
  private _childrenTransitionCleanup: (() => void) | undefined;
  private _childrenAnimationFrame = 0;
  private _skipSyntheticAnchorClick = false;

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
    this.setAttribute('aria-level', String(this._computeAriaLevel()));

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
        this._handleSelect(false);
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

    this._handleSelect(false);

    if (!clickedAnchor) {
      this._triggerAnchorNavigation();
    }
  };

  private _handleExpandIconClick = (e: MouseEvent): void => {
    e.stopPropagation();
    this._toggleExpanded();
  };

  private _activateItem(): void {
    this._handleSelect(false);
    this._triggerAnchorNavigation();
  }

  private _handleSelect(_allowNavigate = false): void {
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
    const anchor = this.shadowRoot?.querySelector<HTMLAnchorElement>('.label-link');
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
    const classes = {
      [`density-${this.density}`]: true,
    };
    const childrenHidden = !this.hasChildren;

    return html`
      <div class=${classMap(classes)}>
        <div
          class=${classMap({
            item: true,
            'has-content-icon': showContentIcon,
          })}
          tabindex=${this.getAttribute('tabindex') ?? '0'}
          @click=${this._handleClick}
          @keydown=${this._handleKeyDown}
        >
          <div
            class=${classMap({
              'expand-icon': true,
              hidden: !this.hasChildren,
            })}
            @click=${this._handleExpandIconClick}
            aria-hidden="true"
          >
            <div class="expand-glyph">
              <ui-icon name="chevron-right"></ui-icon>
            </div>
          </div>

          <div
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
          </div>

          <div class="label-cell">
            <ui-tooltip
              class="label-tooltip"
              .text=${this.label}
              variant="subtle"
              placement="bottom-start"
              .disabled=${!this.isLabelTruncated}
            >
              <div class="label">
                ${this.href
                  ? html`<a class="label-link" href=${this.href}>${this.label}</a>`
                  : this.label}
              </div>
            </ui-tooltip>
          </div>

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
