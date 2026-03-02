import { autoUpdate } from '@floating-ui/dom';
import { html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

const DOCUMENT_STYLE_ID = 'ui-footnote-document-styles';

const DOCUMENT_CSS = `
ui-footnote {
  --footnote-popover-max-width: 400px;
  display: inline;
  font-family: inherit;
  line-height: inherit;
}

ui-footnote [data-part='trigger'] {
  display: inline-flex;
  align-items: baseline;
  margin-inline: 0.1em;
  color: var(--fg-muted, oklch(48% 0.01 250));
  font-size: max(var(--text-xs, 12px), 12px);
  font-weight: var(--font-medium, 500);
  letter-spacing: var(--tracking-wide, 0.02em);
  line-height: var(--line-height-none, 1);
  text-decoration: none;
  cursor: pointer;
  border-radius: var(--radius-sm, 4px);
  transition:
    color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
    background-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
}

ui-footnote [data-part='trigger'] > sup {
  font-size: inherit;
  line-height: 1;
  vertical-align: super;
}

ui-footnote [data-part='trigger']:hover,
ui-footnote [data-part='trigger']:focus-visible {
  color: var(--primary, oklch(56% 0.16 252));
  text-decoration: underline;
}

ui-footnote [data-part='trigger']:focus-visible {
  outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 252));
  outline-offset: var(--focus-ring-offset, 2px);
  animation: var(--animation-focus);
}

ui-footnote [data-part='trigger'].is-active-trigger {
  background: var(--bg-active, oklch(95% 0.01 250));
}

ui-footnote [data-part='content'] {
  position: fixed;
  left: 0;
  top: 0;
  /* Popover の UA 既定中央寄せ (inset + margin:auto) を無効化する */
  right: auto;
  bottom: auto;
  margin: 0;
  z-index: var(--z-popover, 400);
  box-sizing: border-box;
  display: none;
  max-width: min(90vw, var(--footnote-popover-max-width));
  max-height: 60vh;
  overflow-y: auto;
  padding: var(--space-3, 12px) var(--space-4, 16px);
  background: var(--bg-surface-2, oklch(100% 0 0));
  border: var(--border-width, 1px) solid var(--border-default, oklch(86% 0.01 250));
  border-radius: var(--radius-md, 6px);
  box-shadow: var(--elevation-lg, 0 8px 24px oklch(0% 0 0 / 0.12));
  color: var(--fg-default, oklch(20% 0.01 250));
  font-family: var(--font-sans, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif);
  font-size: var(--text-sm, 13px);
  line-height: var(--line-height-relaxed, 1.75);
  opacity: 0;
  transform: translateY(4px);
  transition:
    opacity var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
    transform var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
    display var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9))
      allow-discrete;
}

ui-footnote [data-part='content'][popover]:popover-open {
  display: block;
  opacity: 1;
  transform: translateY(0);
}

@starting-style {
  ui-footnote [data-part='content'][popover]:popover-open {
    opacity: 0;
    transform: translateY(4px);
  }
}

ui-footnote [data-part='content'][popover]:not(:popover-open) {
  opacity: 0;
  transition:
    opacity var(--duration-fast, 70ms) var(--ease-in, cubic-bezier(0.55, 0, 1, 0.45)),
    display var(--duration-fast, 70ms) var(--ease-in, cubic-bezier(0.55, 0, 1, 0.45))
      allow-discrete;
}

ui-footnote .footnote-body > :first-child {
  margin-block-start: 0;
}

ui-footnote .footnote-body > :last-child {
  margin-block-end: 0;
}

ui-footnote .footnote-popover-footer {
  margin-block-start: var(--space-3, 12px);
  padding-block-start: var(--space-2, 8px);
  border-top: 1px solid var(--border-ghost, oklch(88% 0.01 250 / 0.5));
}

ui-footnote .footnote-list-link {
  color: var(--fg-muted, oklch(48% 0.01 250));
  font-size: var(--text-xs, 12px);
  font-weight: var(--font-medium, 500);
  letter-spacing: var(--tracking-wide, 0.02em);
  text-decoration: none;
}

ui-footnote .footnote-list-link:hover,
ui-footnote .footnote-list-link:focus-visible {
  color: var(--primary, oklch(56% 0.16 252));
  text-decoration: underline;
}

ui-footnote .sr-only,
section.footnotes .sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

section.footnotes {
  margin-block-start: var(--space-16, 64px);
  padding-block-start: var(--space-8, 32px);
  border-block-start: var(--border-width, 1px) solid var(--border-default, oklch(86% 0.01 250));
}

section.footnotes ol {
  list-style-position: inside;
  padding-inline-start: 0;
}

section.footnotes li {
  margin-block-end: var(--space-3, 12px);
  color: var(--fg-default, oklch(20% 0.01 250));
  font-size: var(--text-sm, 13px);
}

section.footnotes li:target {
  background: var(--bg-active, oklch(95% 0.01 250));
  border-radius: var(--radius-sm, 4px);
}

section.footnotes a[href^='#fnref-'] {
  color: var(--fg-muted, oklch(48% 0.01 250));
  text-decoration: none;
}

section.footnotes a[href^='#fnref-']:hover,
section.footnotes a[href^='#fnref-']:focus-visible {
  color: var(--primary, oklch(56% 0.16 252));
}

@media (prefers-reduced-motion: reduce) {
  ui-footnote [data-part='content'] {
    transform: none;
    transition-duration: var(--duration-instant, 0ms);
  }
}

@media (forced-colors: active) {
  ui-footnote [data-part='trigger'] {
    color: LinkText;
  }

  ui-footnote [data-part='content'] {
    border: 2px solid CanvasText;
    box-shadow: none;
  }

  section.footnotes {
    border-block-start: 1px solid CanvasText;
  }
}

@media print {
  ui-footnote [data-part='content'] {
    display: none !important;
  }
}
`;

type PopoverToggleState = 'open' | 'closed';
type PopoverToggleEvent = Event & { newState?: PopoverToggleState };
type PopoverElement = HTMLElement & {
  hidePopover?: () => void;
  showPopover?: () => void;
};

@customElement('ui-footnote')
export class Footnote extends LitElement {
  @property({ type: String, attribute: 'ref-id' })
  refId = '';

  @property({ type: Number })
  index = 1;

  @property({ type: Number, attribute: 'ref-instance' })
  refInstance = 1;

  @property({ type: Boolean, reflect: true })
  shared = false;

  private static readonly _activeTriggerByPopoverId = new Map<string, HTMLAnchorElement>();

  private _contentNodes: Node[] = [];
  private _didCaptureContent = false;
  private _floatingCleanup: (() => void) | null = null;
  private _observedPopover: PopoverElement | null = null;

  override connectedCallback(): void {
    this._captureInitialContentNodes();
    super.connectedCallback();
    this._injectDocumentStyles();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._detachPopoverListeners();
    this._teardownFloating();
    this._unregisterActiveTrigger();
    this._setTriggerState(this._getTriggerElement(), false, false);
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);

    if (changedProperties.has('refId') || changedProperties.has('index') || changedProperties.has('shared')) {
      this._detachPopoverListeners();
    }

    this._attachPopoverListeners();
  }

  private get _resolvedIndex(): number {
    const normalized = Math.trunc(this.index);
    return Number.isFinite(normalized) && normalized > 0 ? normalized : 1;
  }

  private get _resolvedRefInstance(): number {
    const normalized = Math.trunc(this.refInstance);
    return Number.isFinite(normalized) && normalized > 0 ? normalized : 1;
  }

  private get _resolvedRefId(): string {
    const explicit = this.refId.trim();
    const fallback = `fn-${String(this._resolvedIndex)}`;
    return (explicit === '' ? fallback : explicit).replace(/\s+/g, '-');
  }

  private get _resolvedTriggerId(): string {
    return `fnref-${String(this._resolvedIndex)}-${String(this._resolvedRefInstance)}`;
  }

  private get _resolvedPopoverId(): string {
    return `${this._resolvedRefId}-popover`;
  }

  private get _resolvedLabelId(): string {
    return `${this._resolvedRefId}-label`;
  }

  private get _supportsPopoverApi(): boolean {
    if (typeof HTMLElement === 'undefined') return false;
    return 'showPopover' in HTMLElement.prototype && 'hidePopover' in HTMLElement.prototype;
  }

  private _captureInitialContentNodes(): void {
    if (this._didCaptureContent) return;

    // SSR で埋め込まれた脚注本文を保持して、Light DOM 再描画時にも失わないようにする。
    const existingContent = this.querySelector<HTMLElement>('[data-part="content"]');
    const sourceNodes = existingContent ? Array.from(existingContent.childNodes) : Array.from(this.childNodes);

    const renderableNodes = sourceNodes.filter((node) => this._isRenderableContentNode(node));
    this._contentNodes = renderableNodes.map((node) => node.cloneNode(true));

    // CSR: キャプチャ済みの元ノードを除去し、Lit の Light DOM 描画との重複を防ぐ。
    // SSR の場合は existingContent（[data-part="content"]）が存在するため除去しない。
    if (!existingContent) {
      for (const node of renderableNodes) {
        node.remove();
      }
    }

    this._didCaptureContent = true;
  }

  private _isRenderableContentNode(node: Node): boolean {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent?.trim() ?? '') !== '';
    }

    if (!(node instanceof HTMLElement)) return true;

    const part = node.getAttribute('data-part');
    if (part === 'trigger' || part === 'content') return false;

    if (node.classList.contains('footnote-popover-footer')) return false;
    if (node.classList.contains('footnote-list-link')) return false;
    if (node.classList.contains('sr-only') && node.id === this._resolvedLabelId) return false;

    return true;
  }

  private _injectDocumentStyles(): void {
    if (typeof document === 'undefined') return;
    if (document.getElementById(DOCUMENT_STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = DOCUMENT_STYLE_ID;
    style.textContent = DOCUMENT_CSS;
    document.head.append(style);
  }

  private _getTriggerElement(): HTMLAnchorElement | null {
    return this.querySelector<HTMLAnchorElement>('[data-part="trigger"]');
  }

  private _getOwnPopoverElement(): PopoverElement | null {
    const popover = this.querySelector<HTMLElement>('[data-part="content"]');
    if (!popover) return null;
    if (popover.id !== this._resolvedPopoverId) return null;
    return popover as PopoverElement;
  }

  private _getPopoverElement(): PopoverElement | null {
    if (this.shared) {
      const popover = document.getElementById(this._resolvedPopoverId);
      return popover instanceof HTMLElement ? (popover as PopoverElement) : null;
    }

    return this._getOwnPopoverElement();
  }

  private _isPrimaryTriggerClick(event: MouseEvent): boolean {
    return (
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.shiftKey &&
      !event.defaultPrevented
    );
  }

  private _isPopoverOpen(popover: Element): boolean {
    try {
      return popover.matches(':popover-open');
    } catch {
      return false;
    }
  }

  private _showPopover(popover: PopoverElement): boolean {
    if (typeof popover.showPopover !== 'function') return false;

    try {
      popover.showPopover();
      return true;
    } catch {
      return false;
    }
  }

  private _hidePopover(popover: PopoverElement): boolean {
    if (typeof popover.hidePopover !== 'function') return false;

    try {
      popover.hidePopover();
      return true;
    } catch {
      return false;
    }
  }

  private _setTriggerState(trigger: HTMLAnchorElement | null, expanded: boolean, isActive: boolean): void {
    if (!trigger) return;
    trigger.setAttribute('aria-expanded', String(expanded));
    trigger.classList.toggle('is-active-trigger', isActive);
  }

  private _setFocusReturn(popover: HTMLElement, value: boolean): void {
    popover.dataset['returnFocus'] = value ? 'true' : 'false';
  }

  private _shouldReturnFocus(popover: HTMLElement): boolean {
    return popover.dataset['returnFocus'] !== 'false';
  }

  private _attachPopoverListeners(): void {
    const popover = this._getPopoverElement();
    if (!popover) return;
    this._attachPopoverListenersTo(popover);
  }

  private _attachPopoverListenersTo(popover: PopoverElement): void {
    if (this._observedPopover === popover) return;

    this._detachPopoverListeners();
    popover.addEventListener('toggle', this._onPopoverToggle as EventListener);
    popover.addEventListener('keydown', this._onPopoverKeyDown);
    this._observedPopover = popover;
  }

  private _detachPopoverListeners(): void {
    if (!this._observedPopover) return;

    this._observedPopover.removeEventListener('toggle', this._onPopoverToggle as EventListener);
    this._observedPopover.removeEventListener('keydown', this._onPopoverKeyDown);
    this._observedPopover = null;
  }

  private _registerActiveTrigger(popoverId: string, trigger: HTMLAnchorElement): void {
    const previous = Footnote._activeTriggerByPopoverId.get(popoverId);
    if (previous && previous !== trigger) {
      this._setTriggerState(previous, false, false);
    }
    Footnote._activeTriggerByPopoverId.set(popoverId, trigger);
  }

  private _unregisterActiveTrigger(): void {
    const trigger = this._getTriggerElement();
    if (!trigger) return;

    for (const [popoverId, activeTrigger] of Footnote._activeTriggerByPopoverId.entries()) {
      if (activeTrigger === trigger) {
        Footnote._activeTriggerByPopoverId.delete(popoverId);
      }
    }
  }

  private _startFloating(trigger: HTMLElement, popover: PopoverElement): void {
    this._teardownFloating();

    const GAP = 8;

    // Popover API の top layer 上では position: fixed の座標系とビューポートが一致するため、
    // getBoundingClientRect() の値をそのまま left / top に使用できる。
    // floating-ui の computePosition は含有ブロック補正を行うが、top layer ではその補正が
    // 不要なため、環境によっては位置がずれる。直接計算で回避する。
    const updatePosition = (): void => {
      const ref = trigger.getBoundingClientRect();
      const fw = popover.offsetWidth;
      const fh = popover.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // 配置: bottom（トリガー下端 + GAP）、上に反転判定
      let top = ref.bottom + GAP;
      if (top + fh > vh - GAP && ref.top - fh - GAP > GAP) {
        top = ref.top - fh - GAP;
      }

      // 水平: トリガー左端揃え → 画面内にクランプ
      let left = ref.left;
      if (left + fw > vw - GAP) left = vw - fw - GAP;
      if (left < GAP) left = GAP;

      popover.style.left = `${String(Math.round(left))}px`;
      popover.style.top = `${String(Math.round(top))}px`;
    };

    updatePosition();
    this._floatingCleanup = autoUpdate(trigger, popover, updatePosition);
  }

  private _teardownFloating(): void {
    if (!this._floatingCleanup) return;
    this._floatingCleanup();
    this._floatingCleanup = null;
  }

  private _resolveToggleState(event: Event, popover: Element): PopoverToggleState {
    const toggleEvent = event as PopoverToggleEvent;
    if (toggleEvent.newState === 'open' || toggleEvent.newState === 'closed') {
      return toggleEvent.newState;
    }
    return this._isPopoverOpen(popover) ? 'open' : 'closed';
  }

  private _onTriggerClick = (event: MouseEvent): void => {
    if (!this._isPrimaryTriggerClick(event)) return;
    if (!this._supportsPopoverApi) return;

    const trigger = event.currentTarget;
    if (!(trigger instanceof HTMLAnchorElement)) return;

    const popover = this._getPopoverElement();
    if (!popover) return;

    this._attachPopoverListenersTo(popover);
    event.preventDefault();

    this._registerActiveTrigger(popover.id, trigger);

    if (this._isPopoverOpen(popover)) {
      this._setFocusReturn(popover, true);
      this._hidePopover(popover);
      return;
    }

    this._setFocusReturn(popover, true);
    this._showPopover(popover);
    this._startFloating(trigger, popover);
  };

  private _onFooterLinkClick = (): void => {
    const popover = this._getPopoverElement();
    if (!popover) return;

    this._setFocusReturn(popover, false);
    this._hidePopover(popover);
  };

  private _onPopoverKeyDown = (event: KeyboardEvent): void => {
    const popover = event.currentTarget;
    if (!(popover instanceof HTMLElement)) return;
    if (!this._isPopoverOpen(popover)) return;

    if (event.key === 'Escape') {
      this._setFocusReturn(popover, true);
      if (this._hidePopover(popover as PopoverElement)) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    if (event.key !== 'Tab' || event.shiftKey) return;
    if (!(event.target instanceof Element)) return;
    if (!event.target.classList.contains('footnote-list-link')) return;

    this._setFocusReturn(popover, false);
    this._hidePopover(popover as PopoverElement);
  };

  private _onPopoverToggle = (event: Event): void => {
    const popover = event.currentTarget;
    if (!(popover instanceof HTMLElement)) return;

    const state = this._resolveToggleState(event, popover);
    const isOpen = state === 'open';
    const trigger = this._getTriggerElement();
    const activeTrigger = Footnote._activeTriggerByPopoverId.get(popover.id);
    const activeTriggerElement = trigger !== null && activeTrigger === trigger ? trigger : null;

    this._setTriggerState(
      trigger,
      isOpen && activeTriggerElement !== null,
      isOpen && activeTriggerElement !== null,
    );

    if (isOpen) {
      if (activeTriggerElement) {
        this._startFloating(activeTriggerElement, popover as PopoverElement);
      }
      return;
    }

    if (activeTriggerElement) {
      Footnote._activeTriggerByPopoverId.delete(popover.id);
      if (this._shouldReturnFocus(popover)) {
        activeTriggerElement.focus();
      }
    }

    this._teardownFloating();
  };

  private _renderBodyContent(): TemplateResult | typeof nothing {
    if (this._contentNodes.length === 0) return nothing;
    return html`${this._contentNodes}`;
  }

  override render(): TemplateResult {
    const refId = this._resolvedRefId;
    const index = this._resolvedIndex;
    const triggerId = this._resolvedTriggerId;
    const popoverId = this._resolvedPopoverId;
    const labelId = this._resolvedLabelId;

    return html`
      <a
        id="${triggerId}"
        data-part="trigger"
        href="#${refId}"
        role="doc-noteref"
        aria-controls="${popoverId}"
        aria-expanded="false"
        aria-details="${popoverId}"
        @click="${this._onTriggerClick}"
      >
        <sup>[${String(index)}]</sup>
      </a>
      ${this.shared
        ? nothing
        : html`
            <div
              id="${popoverId}"
              data-part="content"
              popover="auto"
              role="note"
              aria-labelledby="${labelId}"
              data-return-focus="true"
            >
              <span id="${labelId}" class="sr-only">脚注 ${String(index)}</span>
              <div class="footnote-body">${this._renderBodyContent()}</div>
              <footer class="footnote-popover-footer">
                <a href="#${refId}" class="footnote-list-link" @click="${this._onFooterLinkClick}">
                  脚注一覧で見る <span aria-hidden="true">→</span>
                </a>
              </footer>
            </div>
          `}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-footnote': Footnote;
  }
}
