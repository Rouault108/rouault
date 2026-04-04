import { css, html, LitElement, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { map } from 'lit/directives/map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { updateHashInCurrentUrl } from '../../../router/url-hash.js';
import '../tooltip/tooltip';

export interface Heading {
  id: string;
  text: string;
  level: number;
  scopeSelections?: {
    scopeId: string;
    value: string;
  }[];
}

export interface UiTocActiveChangeDetail {
  id: string;
  source: 'scroll' | 'click';
  index: number;
  total: number;
}

@customElement('ui-toc')
export class Toc extends LitElement {
  static override styles = css`
    :host {
      display: block;
      min-inline-size: 0;
    }

    nav {
      display: block;
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    li {
      min-inline-size: 0;
    }

    .toc-tooltip {
      display: block;
      inline-size: 100%;
      min-inline-size: 0;
    }

    .toc-link {
      --_toc-indicator-width: var(
        --toc-item-indicator-width,
        var(--nav-item-indicator-width, var(--border-width-thick, 2px))
      );
      --_toc-indicator-radius: var(
        --toc-item-indicator-radius,
        var(--nav-item-indicator-radius, var(--radius-full, 9999px))
      );
      --_toc-rail-offset-inline: var(--toc-item-rail-offset-inline, var(--space-2, 8px));
      --_toc-rail-gap: var(--toc-item-rail-gap, var(--space-2, 8px));
      --_toc-indent-step: var(--toc-item-indent-step, var(--space-2, 8px));
      --_toc-level-offset: calc(var(--level, 0) * var(--_toc-indent-step));
      --_toc-padding-inline-end: var(--toc-item-padding-inline-end, var(--space-2, 8px));
      --_toc-active-inset-block: var(--toc-item-active-inset-block, 2px);

      position: relative;
      isolation: isolate;
      display: flex;
      align-items: center;
      min-block-size: var(--toc-item-min-block-size, var(--control-height-sm, 24px));
      padding-block: var(
        --toc-item-padding-block,
        var(--nav-item-padding-block, var(--space-1, 4px))
      );
      padding-inline-start: calc(
        var(--_toc-rail-offset-inline) + var(--_toc-level-offset) + var(--_toc-indicator-width) +
          var(--_toc-rail-gap)
      );
      padding-inline-end: var(--_toc-padding-inline-end);
      font-size: var(--toc-item-font-size, var(--text-sm, 13px));
      font-weight: var(--toc-item-font-weight, 400);
      line-height: var(--toc-item-line-height, 1.5);
      color: var(--toc-item-fg, var(--fg-muted, oklch(48% 0 0)));
      text-decoration: none;
      background-color: transparent;
      transition: color var(--nav-item-transition-duration, var(--duration-fast, 70ms))
        var(--nav-item-transition-easing, var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)));
    }

    .toc-link::after {
      content: '';
      position: absolute;
      z-index: 0;
      inset-block: var(--_toc-active-inset-block);
      inset-inline-start: calc(
        var(--_toc-rail-offset-inline) + var(--_toc-level-offset) + var(--_toc-indicator-width) +
          var(--_toc-rail-gap) - 2px
      );
      inset-inline-end: 0;
      border-radius: var(--toc-item-active-radius, var(--radius-sm, 4px));
      background-color: transparent;
      pointer-events: none;
      transition: background-color var(--nav-item-transition-duration, var(--duration-fast, 70ms))
        var(--nav-item-transition-easing, var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)));
    }

    .toc-link-label {
      position: relative;
      z-index: 1;
      display: block;
      flex: 1 1 auto;
      min-inline-size: 0;
      overflow: hidden;
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .toc-link:not(.is-active)[data-heading-level='3'] .toc-link-label {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
    }

    .toc-link:not(.is-active):is(
        [data-heading-level='4'],
        [data-heading-level='5'],
        [data-heading-level='6']
      )
      .toc-link-label {
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .toc-link.is-active .toc-link-label {
      display: block;
      overflow: visible;
      -webkit-line-clamp: unset;
      line-clamp: unset;
      white-space: normal;
      text-overflow: clip;
    }

    .toc-link:hover {
      color: var(--toc-item-fg-hover, var(--fg-default, oklch(20% 0 0)));
    }

    .toc-link:hover::after {
      background-color: var(--toc-item-hover-bg, transparent);
    }

    .toc-link:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      border-radius: var(--focus-ring-radius, 4px);
      animation: var(--animation-focus, none);
    }

    .toc-link.is-active {
      color: var(--toc-item-fg-active, var(--fg-default, oklch(20% 0 0)));
      font-weight: var(--toc-item-font-weight-active, var(--toc-item-font-weight, 400));
    }

    .toc-link.is-active::after {
      background-color: var(--toc-item-active-bg, transparent);
    }

    .toc-link::before {
      content: '';
      position: absolute;
      z-index: 1;
      inset-inline-start: calc(var(--_toc-rail-offset-inline) + var(--_toc-level-offset));
      inset-block-start: 50%;
      inline-size: var(--_toc-indicator-width);
      block-size: var(--toc-item-indicator-block-size, 0.9em);
      transform: translateY(-50%);
      border-radius: var(--_toc-indicator-radius);
      background-color: var(
        --toc-item-indicator-color,
        var(--nav-item-indicator-color, var(--primary, oklch(55% 0.2 250)))
      );
      opacity: 0;
      pointer-events: none;
      transition: opacity var(--nav-item-transition-duration, var(--duration-fast, 70ms))
        var(--nav-item-transition-easing, var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)));
    }

    .toc-link.is-active::before {
      opacity: 1;
    }

    @media (prefers-reduced-motion: reduce) {
      .toc-link {
        transition-duration: 0.01ms;
      }
    }

    @media (forced-colors: active) {
      .toc-link {
        color: GrayText;
      }

      .toc-link:hover {
        color: CanvasText;
      }

      .toc-link.is-active {
        color: Highlight;
      }

      .toc-link.is-active::before {
        background-color: transparent;
        border: var(--border-width-thick, 2px) solid Highlight;
      }
    }
  `;

  @property({ type: Array })
  headers: Heading[] = [];

  @property({ type: String, attribute: 'active-id', reflect: true })
  activeId = '';

  @state() private _activeIdSource: 'scroll' | 'click' = 'scroll';

  private _truncatedHeadingIds = new Set<string>();
  private _labelResizeObserver: ResizeObserver | null = null;
  private _truncationSyncFrame: number | null = null;
  private _ssrRootReset = false;

  protected override performUpdate(): void {
    this._resetSsrShadowRootIfNeeded();
    super.performUpdate();
  }

  override firstUpdated(): void {
    this._labelResizeObserver = new ResizeObserver(() => {
      this._scheduleTruncationSync();
    });
    this._observeLabels();
    this._scheduleTruncationSync();
  }

  private _resetSsrShadowRootIfNeeded(): void {
    if (this._ssrRootReset || !this.hasAttribute('defer-hydration')) {
      return;
    }

    if (this.renderRoot.childNodes.length === 0) {
      this.removeAttribute('defer-hydration');
      this._ssrRootReset = true;
      return;
    }

    // SSR された ui-toc は hydration 中に見出し数が変わると iterable の差分適用が壊れる。
    // 初回 client update 前にいったん shadow root を空に戻し、以後は通常 render に切り替える。
    this.renderRoot.replaceChildren();
    this.removeAttribute('defer-hydration');
    this._ssrRootReset = true;
  }

  override disconnectedCallback(): void {
    if (this._truncationSyncFrame !== null) {
      cancelAnimationFrame(this._truncationSyncFrame);
      this._truncationSyncFrame = null;
    }

    this._labelResizeObserver?.disconnect();
    this._labelResizeObserver = null;
    super.disconnectedCallback();
  }

  override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);

    if (changedProperties.has('headers') || changedProperties.has('activeId')) {
      this._observeLabels();
      this._scheduleTruncationSync();
      this._syncActiveLinkVisibility();
    }
  }

  refresh(): void {
    this._observeLabels();
    this._scheduleTruncationSync();
    this._syncActiveLinkVisibility();
  }

  private get _minLevel(): number {
    if (this.headers.length === 0) {
      return 1;
    }

    return Math.min(...this.headers.map((heading) => heading.level));
  }

  private _normalizedLevel(heading: Heading): number {
    return heading.level - this._minLevel;
  }

  private _observeLabels(): void {
    const observer = this._labelResizeObserver;
    if (!observer) {
      return;
    }

    observer.disconnect();
    const labels = this.renderRoot.querySelectorAll<HTMLElement>('.toc-link-label');
    for (const label of labels) {
      observer.observe(label);
    }
  }

  private _scheduleTruncationSync(): void {
    if (this._truncationSyncFrame !== null) {
      return;
    }

    this._truncationSyncFrame = requestAnimationFrame(() => {
      this._truncationSyncFrame = null;
      this._syncTruncationState();
    });
  }

  private _syncTruncationState(): void {
    const nextTruncatedIds = new Set<string>();
    const labels = this.renderRoot.querySelectorAll<HTMLElement>('.toc-link-label');

    for (const label of labels) {
      const headingId = label.dataset['headingId'];
      if (!headingId || headingId === this.activeId) {
        continue;
      }

      const isTruncated =
        label.scrollWidth - label.clientWidth > 1 || label.scrollHeight - label.clientHeight > 1;
      if (isTruncated) {
        nextTruncatedIds.add(headingId);
      }
    }

    this._truncatedHeadingIds = nextTruncatedIds;
    this.requestUpdate();
  }

  private _syncActiveLinkVisibility(): void {
    const activeLink = this.renderRoot.querySelector<HTMLAnchorElement>('a.toc-link.is-active');
    if (!activeLink || activeLink.getClientRects().length === 0) {
      return;
    }

    const scrollContainer = this._findScrollContainer(activeLink);
    if (!scrollContainer || scrollContainer.getClientRects().length === 0) {
      return;
    }

    if (this._isFullyVisibleInContainer(activeLink, scrollContainer)) {
      return;
    }

    activeLink.scrollIntoView({
      behavior: 'instant',
      block: 'nearest',
      inline: 'nearest',
    });
  }

  private _findScrollContainer(start: HTMLElement): HTMLElement | null {
    let current = start;

    for (;;) {
      const parent = this._getComposedParentElement(current);
      if (!parent) {
        return null;
      }

      const style = getComputedStyle(parent);
      const overflowY = style.overflowY || style.overflow;
      const isScrollable = ['auto', 'scroll', 'overlay'].includes(overflowY);
      if (isScrollable && parent.scrollHeight > parent.clientHeight) {
        return parent;
      }

      current = parent;
    }
  }

  private _getComposedParentElement(element: HTMLElement): HTMLElement | null {
    if (element.parentElement instanceof HTMLElement) {
      return element.parentElement;
    }

    const root = element.getRootNode();
    if (root instanceof ShadowRoot && root.host instanceof HTMLElement) {
      return root.host;
    }

    return null;
  }

  private _isFullyVisibleInContainer(element: HTMLElement, container: HTMLElement): boolean {
    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const tolerance = 1;

    return (
      elementRect.top >= containerRect.top - tolerance &&
      elementRect.bottom <= containerRect.bottom + tolerance
    );
  }

  private _emitActiveChange(source: 'scroll' | 'click', id: string): void {
    const index = this.headers.findIndex((heading) => heading.id === id);
    this.dispatchEvent(
      new CustomEvent<UiTocActiveChangeDetail>('ui-toc-active-change', {
        bubbles: true,
        composed: true,
        detail: {
          id,
          source,
          index,
          total: this.headers.length,
        },
      }),
    );
  }

  private async _handleLinkClick(event: Event, headingId: string): Promise<void> {
    event.preventDefault();

    this._activeIdSource = 'click';
    this.activeId = headingId;
    this._emitActiveChange('click', headingId);

    const target = document.getElementById(headingId);
    if (!target) {
      return;
    }

    updateHashInCurrentUrl(headingId, 'push');
    await this._smoothScrollTo(target);
  }

  private _smoothScrollTo(target: HTMLElement): Promise<void> {
    return new Promise<void>((resolve) => {
      const headerHeightRaw = getComputedStyle(document.documentElement)
        .getPropertyValue('--header-height')
        .trim();
      const headerHeight = headerHeightRaw ? parseFloat(headerHeightRaw) : 0;
      const extraPadding = 32;
      const targetTop = target.getBoundingClientRect().top + window.scrollY;
      const targetY = Math.max(0, targetTop - headerHeight - extraPadding);

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        window.scrollTo(0, targetY);
        resolve();
        return;
      }

      const startY = window.scrollY;
      const distance = Math.abs(targetY - startY);
      if (distance < 1) {
        resolve();
        return;
      }

      const maxDuration = 300;
      const duration = Math.min(maxDuration, distance * 0.5);
      const startTime = performance.now();

      const animate = (currentTime: number): void => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        window.scrollTo(0, startY + (targetY - startY) * eased);

        if (progress < 1) {
          requestAnimationFrame(animate);
          return;
        }

        resolve();
      };

      requestAnimationFrame(animate);
    });
  }

  override render(): TemplateResult {
    if (this.headers.length === 0) {
      return html``;
    }

    return html`
      <nav aria-label="Table of Contents">
        <ul>
          ${map(this.headers, (heading) => {
            const isActive = heading.id === this.activeId;
            const normalizedLevel = this._normalizedLevel(heading);

            return html`
              <li style=${styleMap({ '--level': String(normalizedLevel) })}>
                <ui-tooltip
                  class="toc-tooltip"
                  text=${heading.text}
                  variant="subtle"
                  placement="right-start"
                  data-heading-id=${heading.id}
                  ?disabled=${isActive || !this._truncatedHeadingIds.has(heading.id)}
                >
                  <a
                    class=${classMap({
                      'toc-link': true,
                      'is-active': isActive,
                      'is-scroll': isActive && this._activeIdSource === 'scroll',
                      'is-click': isActive && this._activeIdSource === 'click',
                    })}
                    href=${`#${heading.id}`}
                    data-heading-level=${String(heading.level)}
                    aria-current=${isActive ? 'location' : undefined}
                    @click=${(event: Event) => void this._handleLinkClick(event, heading.id)}
                  >
                    <span class="toc-link-label" data-heading-id=${heading.id}
                      >${heading.text}</span
                    >
                  </a>
                </ui-tooltip>
              </li>
            `;
          })}
        </ul>
      </nav>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-toc': Toc;
  }
}
