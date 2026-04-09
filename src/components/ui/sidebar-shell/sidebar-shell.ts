import { css, html, LitElement, type PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';

/** ナビゲーションランドマークのラベル */
const NAV_LABEL = 'メインナビゲーション';

/** フォーカス可能要素のセレクタ */
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Fixed/Overlay 切替の最小許容値 */
const MIN_BREAKPOINT = 320;

/** LocalStorage 永続化キー */
const STORAGE_KEY = 'rouault.sidebar.state';

export type SidebarState = 'expanded' | 'collapsed';
export type SidebarMode = 'fixed' | 'overlay';

export interface UiSidebarStateChangeDetail {
  state: SidebarState;
  mode: SidebarMode;
}

@customElement('ui-sidebar-shell')
export class UiSidebarShell extends LitElement {
  static override styles = css`
    :host {
      display: block;
      block-size: 100%;
      min-block-size: 0;
      overflow: visible;
      --ui-sidebar-scrim-opacity: var(--opacity-scrim, 0.6);
    }

    nav {
      box-sizing: border-box;
      block-size: 100%;
      overflow: hidden;
      background: var(--bg-surface-1, oklch(98% 0.01 250));
      border-right: var(--border-width, 1px) solid var(--border-ghost, oklch(20% 0 0 / 0.04));
      display: flex;
      flex-direction: column;
      opacity: 1;
      pointer-events: auto;
      transition: opacity var(--duration-normal, 150ms)
        var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1));
    }

    :host([mode='fixed']) nav {
      position: sticky;
      top: var(--header-height);
      inline-size: 100%;
      max-block-size: var(--layout-sticky-max-block-size, calc(100vh - var(--header-height)));
    }

    .sidebar-header,
    .sidebar-content {
      opacity: 1;
      transition: opacity var(--duration-normal, 150ms)
        var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1));
    }

    :host([data-state='collapsed']) nav,
    :host([data-state='collapsed']) .sidebar-header,
    :host([data-state='collapsed']) .sidebar-content {
      opacity: 0;
    }

    :host([data-state='collapsed']) nav {
      pointer-events: none;
    }

    :host([mode='overlay']) nav {
      position: fixed;
      inset-block-start: var(--header-height);
      inset-block-end: auto;
      inset-inline: 0;
      inline-size: 100vw;
      max-inline-size: 100vw;
      block-size: auto;
      max-block-size: min(
        var(--sidebar-overlay-max-block-size, calc(100dvh - var(--header-height))),
        72dvh
      );
      border-right: none;
      border-bottom: var(--border-width, 1px) solid var(--border-default, oklch(20% 0 0 / 0.12));
      box-shadow: var(--shadow-lg, 0 24px 48px oklch(0% 0 0 / 0.18));
      z-index: var(--z-modal, 300);
    }

    :host([mode='fixed']) .sidebar-header {
      display: none;
    }

    .sidebar-header {
      flex-shrink: 0;
      background: var(--bg-surface-2, oklch(100% 0 0));
      border-bottom: var(--border-width, 1px) solid var(--border-default, oklch(20% 0 0 / 0.12));
    }

    .sidebar-header:empty,
    .sidebar-header:not(:has(::slotted(*))) {
      display: none;
    }

    .sidebar-content {
      flex: 1 1 auto;
      overflow-y: auto;
      overflow-x: hidden;
      overscroll-behavior: contain;
      min-block-size: 0;
    }

    .scrim {
      position: fixed;
      inset: 0;
      background: oklch(0% 0 0 / var(--ui-sidebar-scrim-opacity));
      opacity: 0;
      pointer-events: none;
      transition: opacity var(--duration-normal, 150ms)
        var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1));
      z-index: var(--z-backdrop, 200);
    }

    :host([mode='overlay']) .scrim {
      inset-block-start: var(--header-height);
    }

    :host([mode='overlay'][data-state='expanded']) .scrim {
      opacity: 1;
      pointer-events: auto;
    }

    :host([mode='fixed']) .scrim {
      display: none;
    }

    @media (prefers-color-scheme: dark) {
      nav {
        border-color: var(--border-ghost, oklch(90% 0 0 / 0.04));
      }
    }

    @media (forced-colors: active) {
      nav {
        background: Canvas;
        border-right: var(--border-width, 1px) solid CanvasText;
      }

      ::slotted([aria-current='page']) {
        outline: 2px solid Highlight;
        outline-offset: -2px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      nav,
      .sidebar-content,
      .sidebar-header,
      .scrim {
        animation: none !important;
        transition: none !important;
      }
    }

    @media print {
      :host {
        display: none !important;
      }
    }
  `;

  @property({ reflect: true, attribute: 'data-state' })
  state: SidebarState = 'expanded';

  @property({ reflect: true })
  mode: SidebarMode = 'fixed';

  @property({ type: Number, reflect: true, attribute: 'fixed-breakpoint' })
  fixedBreakpoint = 1280;

  @property({ attribute: false })
  returnFocusTarget: HTMLElement | null = null;

  @query('nav')
  private _navElement!: HTMLElement;

  private _hasRendered = false;

  private _operation: Promise<void> = Promise.resolve();

  private _mediaQuery: MediaQueryList | null = null;

  private _usesAutoMode = false;

  override connectedCallback(): void {
    this._usesAutoMode = !this.hasAttribute('mode');
    super.connectedCallback();
    this._restoreState();
    this._initMediaQuery();
    this.activateHydration();
  }

  override disconnectedCallback(): void {
    this._destroyMediaQuery();
    super.disconnectedCallback();
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    if (!this._hasRendered) {
      this._hasRendered = true;
      this._syncVisibilityForCurrentState();
      return;
    }

    if (changedProperties.has('fixedBreakpoint')) {
      this._initMediaQuery();
    }

    if (changedProperties.has('mode') && !changedProperties.has('state')) {
      this._syncVisibilityForCurrentState();
    }

    if (changedProperties.has('state')) {
      const previousState = changedProperties.get('state');
      if (previousState === this.state) {
        return;
      }

      this._persistState();
      this._enqueue(async () => {
        if (this.state === 'expanded') {
          await this._expandSidebar();
          return;
        }

        await this._collapseSidebar();
      });
    }
  }

  activateHydration(): void {
    if (this.hasAttribute('defer-hydration')) {
      this.removeAttribute('defer-hydration');
    }

    this.requestUpdate();

    void this.updateComplete.then(() => {
      if (!this.isConnected) {
        return;
      }

      if (!(this._navElement instanceof HTMLElement)) {
        return;
      }

      this._syncVisibilityForCurrentState();
    });
  }

  expand(trigger?: HTMLElement): void {
    this._captureTrigger(trigger);
    if (this.state === 'expanded') {
      return;
    }
    this.state = 'expanded';
  }

  collapse(trigger?: HTMLElement): void {
    this._captureTrigger(trigger);
    if (this.state === 'collapsed') {
      return;
    }
    this.state = 'collapsed';
  }

  toggle(trigger?: HTMLElement): void {
    if (this.state === 'expanded') {
      this.collapse(trigger);
      return;
    }

    this.expand(trigger);
  }

  private _restoreState(): void {
    if (this.hasAttribute('data-state')) {
      return;
    }

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'expanded' || stored === 'collapsed') {
        this.state = stored;
      }
    } catch {
      // localStorage が使えない環境では永続化を無視する。
    }
  }

  private _persistState(): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, this.state);
    } catch {
      // localStorage が使えない環境では永続化を無視する。
    }
  }

  private _initMediaQuery(): void {
    this._destroyMediaQuery();

    if (!this._usesAutoMode) {
      return;
    }

    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    this._mediaQuery = window.matchMedia(this._buildMediaQuery());
    this._applyModeFromMediaQuery(this._mediaQuery.matches);
    this._mediaQuery.addEventListener('change', this._onMediaQueryChange);
  }

  private _destroyMediaQuery(): void {
    this._mediaQuery?.removeEventListener('change', this._onMediaQueryChange);
    this._mediaQuery = null;
  }

  private _buildMediaQuery(): string {
    const resolvedBreakpoint = this._resolveFixedBreakpoint(this.fixedBreakpoint);
    return `(min-width: ${String(resolvedBreakpoint)}px)`;
  }

  private _resolveFixedBreakpoint(value: number): number {
    if (!Number.isFinite(value)) {
      return 1280;
    }

    const normalized = Math.trunc(value);
    return normalized >= MIN_BREAKPOINT ? normalized : MIN_BREAKPOINT;
  }

  private _applyModeFromMediaQuery(matches: boolean): void {
    this.mode = matches ? 'fixed' : 'overlay';
  }

  private _syncVisibilityForCurrentState(): void {
    const nav = this._navElement;
    if (!(nav instanceof HTMLElement)) {
      return;
    }

    if (this.state === 'collapsed') {
      nav.inert = true;
      nav.style.visibility = 'hidden';
      return;
    }

    nav.inert = false;
    nav.style.visibility = 'visible';
  }

  private _enqueue(task: () => Promise<void>): void {
    this._operation = this._operation.then(task).catch((error: unknown) => {
      console.error('[ui-sidebar-shell] operation failed', error);
    });
  }

  private async _expandSidebar(): Promise<void> {
    const nav = this._navElement;

    nav.style.visibility = 'visible';
    nav.inert = false;

    await this._waitForAnimations(nav);

    if (this.mode === 'overlay') {
      this._focusFirstElement();
    }

    this._dispatchStateChange();
  }

  private async _collapseSidebar(): Promise<void> {
    const nav = this._navElement;

    nav.inert = true;
    await this._waitForAnimations(nav);
    nav.style.visibility = 'hidden';

    if (this.mode === 'overlay') {
      this._restoreTriggerFocus();
    }

    this._dispatchStateChange();
  }

  private async _waitForAnimations(element: Element): Promise<void> {
    if (this._prefersReducedMotion()) {
      return;
    }

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });

    const animations = element.getAnimations();
    if (animations.length === 0) {
      return;
    }

    await Promise.allSettled(animations.map((animation) => animation.finished));
  }

  private _captureTrigger(trigger?: HTMLElement): void {
    if (trigger instanceof HTMLElement) {
      this.returnFocusTarget = trigger;
      return;
    }

    if (this.returnFocusTarget instanceof HTMLElement && this.returnFocusTarget.isConnected) {
      return;
    }

    const active = this.ownerDocument.activeElement;
    this.returnFocusTarget = active instanceof HTMLElement ? active : null;
  }

  private _focusFirstElement(): void {
    const target = this._resolveInitialFocusTarget();
    if (!target) {
      return;
    }

    if (this._prefersReducedMotion()) {
      target.focus({ preventScroll: true });
      return;
    }

    requestAnimationFrame(() => {
      target.focus({ preventScroll: true });
    });
  }

  private _restoreTriggerFocus(): void {
    const target = this.returnFocusTarget;
    if (!target?.isConnected) {
      return;
    }

    target.focus({ preventScroll: true });
  }

  private _findFirstFocusable(elements: readonly Element[]): HTMLElement | null {
    for (const element of elements) {
      if (element instanceof HTMLElement && element.matches(FOCUSABLE_SELECTOR)) {
        return element;
      }
      const nested = element.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      if (nested) {
        return nested;
      }
    }
    return null;
  }

  private _resolveInitialFocusTarget(): HTMLElement | null {
    const headerSlot = this.shadowRoot?.querySelector<HTMLSlotElement>(
      '.sidebar-header slot[name="header"]',
    );
    const headerElements = headerSlot?.assignedElements({ flatten: true }) ?? [];
    const headerFocusable = this._findFirstFocusable(headerElements);
    if (headerFocusable) {
      return headerFocusable;
    }

    const defaultSlot = this.shadowRoot?.querySelector<HTMLSlotElement>(
      '.sidebar-content slot:not([name])',
    );
    const defaultElements = defaultSlot?.assignedElements({ flatten: true }) ?? [];
    return this._findFirstFocusable(defaultElements);
  }

  private _prefersReducedMotion(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  private _dispatchStateChange(): void {
    this.dispatchEvent(
      new CustomEvent<UiSidebarStateChangeDetail>('ui-sidebar-state-change', {
        bubbles: false,
        composed: false,
        detail: { state: this.state, mode: this.mode },
      }),
    );
  }

  private _onMediaQueryChange = (event: MediaQueryListEvent): void => {
    this._applyModeFromMediaQuery(event.matches);
  };

  private _onScrimClick = (): void => {
    this.collapse();
  };

  private _onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') {
      return;
    }
    if (this.mode !== 'overlay') {
      return;
    }
    if (this.state !== 'expanded') {
      return;
    }

    event.preventDefault();
    this.collapse();
  };

  override render() {
    return html`
      <nav aria-label=${NAV_LABEL} @keydown=${this._onKeydown}>
        <div class="sidebar-header">
          <slot name="header"></slot>
        </div>
        <div class="sidebar-content">
          <slot></slot>
        </div>
      </nav>
      <div class="scrim" aria-hidden="true" @click=${this._onScrimClick}></div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-sidebar-shell': UiSidebarShell;
  }
}
