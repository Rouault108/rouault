import { css, html, LitElement, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { map } from 'lit/directives/map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { buildHashHrefFromId } from '../../../router/url-hash.js';
import {
  normalizeTocDensityTier,
  type TocDensityTier,
} from '../../../toc/toc-density-tier.js';
import type { TocHeading } from '../../../toc/toc-headings.js';
import '../tooltip/tooltip';

export type Heading = TocHeading;

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

    :host([density-tier='compact']) {
      --toc-item-min-block-size: var(--toc-item-compact-min-block-size, 22px);
      --toc-item-padding-block: var(--toc-item-compact-padding-block, 2px);
      --toc-item-inactive-upper-max-lines: 1;
      --toc-item-active-max-lines: 2;
    }

    :host([density-tier='expanded']) {
      --toc-item-min-block-size: var(--toc-item-expanded-min-block-size, 28px);
      --toc-item-padding-block: var(--toc-item-expanded-padding-block, var(--space-2, 8px));
      --toc-item-inactive-upper-max-lines: 3;
      --toc-item-active-max-lines: 4;
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
      --_toc-active-surface-bleed-inline-start: var(--toc-item-surface-bleed-inline-start, 2px);

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
      font-weight: var(--toc-item-font-weight, var(--font-normal, 400));
      line-height: var(--toc-item-line-height, var(--line-height-normal, 1.5));
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
          var(--_toc-rail-gap) - var(--_toc-active-surface-bleed-inline-start)
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

    .toc-link:not(.is-active) .toc-link-label {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: var(--toc-item-inactive-upper-max-lines, 2);
      line-clamp: var(--toc-item-inactive-upper-max-lines, 2);
      white-space: normal;
    }

    .toc-link:not(.is-active):is(
        [data-heading-depth='2'],
        [data-heading-depth='3'],
        [data-heading-depth='4']
      )
      .toc-link-label {
      display: block;
      -webkit-line-clamp: unset;
      line-clamp: unset;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .toc-link.is-active .toc-link-label {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: var(--toc-item-active-max-lines, 3);
      line-clamp: var(--toc-item-active-max-lines, 3);
      overflow: hidden;
      white-space: normal;
      text-overflow: clip;
    }

    .toc-link:hover {
      color: var(--toc-item-fg-hover, var(--fg-default, oklch(20% 0 0)));
    }

    .toc-link:hover::after {
      background-color: var(--toc-item-hover-bg, transparent);
    }

    .toc-link:focus-visible::after {
      background-color: var(--toc-item-hover-bg, transparent);
    }

    .toc-link:focus-visible {
      color: var(--toc-item-fg-hover, var(--fg-default, oklch(20% 0 0)));
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      border-radius: var(--focus-ring-radius, var(--radius-sm, 4px));
      animation: var(--animation-focus, none);
    }

    .toc-link.is-active {
      color: var(--toc-item-fg-active, var(--fg-default, oklch(20% 0 0)));
      font-weight: var(
        --toc-item-font-weight-active,
        var(--toc-item-font-weight, var(--font-normal, 400))
      );
    }

    .toc-link.is-active::after {
      background-color: var(--toc-item-active-bg, transparent);
    }

    .toc-link::before {
      content: '';
      position: absolute;
      z-index: 1;
      box-sizing: border-box;
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
      inset-block: var(--_toc-active-inset-block);
      block-size: auto;
      transform: none;
      opacity: 1;
    }

    @media (prefers-reduced-motion: reduce) {
      .toc-link,
      .toc-link::before,
      .toc-link::after {
        transition-duration: 0.01ms;
      }

      .toc-link:focus-visible {
        animation: none;
      }
    }

    @media (forced-colors: active) {
      .toc-link {
        color: CanvasText;
      }

      .toc-link:hover,
      .toc-link:focus-visible {
        color: CanvasText;
      }

      .toc-link:focus-visible {
        outline-color: Highlight;
      }

      .toc-link::after,
      .toc-link:hover::after,
      .toc-link:focus-visible::after,
      .toc-link.is-active::after {
        background-color: transparent;
      }

      .toc-link.is-active {
        color: Highlight;
      }

      .toc-link.is-active::before {
        background-color: transparent;
        border: var(--border-width, 1px) solid Highlight;
      }
    }
  `;

  @property({ type: Array })
  headers: Heading[] = [];

  @property({ type: String, attribute: 'active-id', reflect: true })
  activeId = '';

  @property({ type: String, attribute: 'navigation-label' })
  navigationLabel = '目次';

  @property({ type: String, attribute: 'density-tier', reflect: true })
  densityTier: TocDensityTier = 'comfortable';

  @property({ type: Boolean, attribute: 'suppress-active-link-scroll' })
  suppressActiveLinkScroll = false;

  @state() private _activeIdSource: 'scroll' | 'click' = 'scroll';

  private _truncatedHeadingIds = new Set<string>();
  private _labelResizeObserver: ResizeObserver | null = null;
  private _truncationSyncFrame: number | null = null;
  private _postRenderFrame: number | null = null;
  private _pendingClickActiveId: string | null = null;
  private _renderedActiveRetryCount = 0;
  private readonly _maxRenderedActiveRetries = 2;

  override firstUpdated(): void {
    this._labelResizeObserver = new ResizeObserver(() => {
      this._scheduleTruncationSync();
    });
    this._schedulePostRenderWork({ resetRetryCount: true });
  }

  override disconnectedCallback(): void {
    if (this._truncationSyncFrame !== null) {
      cancelAnimationFrame(this._truncationSyncFrame);
      this._truncationSyncFrame = null;
    }

    if (this._postRenderFrame !== null) {
      cancelAnimationFrame(this._postRenderFrame);
      this._postRenderFrame = null;
    }

    this._labelResizeObserver?.disconnect();
    this._labelResizeObserver = null;
    super.disconnectedCallback();
  }

  protected override willUpdate(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has('densityTier')) {
      this.densityTier = normalizeTocDensityTier(this.densityTier);
    }
  }

  override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);

    if (!changedProperties.has('headers') && !changedProperties.has('activeId')) {
      return;
    }

    if (changedProperties.has('activeId')) {
      this._normalizeActiveIdSource();
    }

    this._schedulePostRenderWork({ resetRetryCount: true });
  }

  private _getQueryableRenderRoot(): ShadowRoot | null {
    return this.renderRoot instanceof ShadowRoot ? this.renderRoot : null;
  }

  private _normalizeActiveIdSource(): void {
    if (this._pendingClickActiveId === this.activeId) {
      this._pendingClickActiveId = null;
      return;
    }

    this._pendingClickActiveId = null;
    if (this._activeIdSource !== 'scroll') {
      this._activeIdSource = 'scroll';
    }
  }

  private _schedulePostRenderWork(options: { resetRetryCount?: boolean } = {}): void {
    if (options.resetRetryCount === true) {
      this._renderedActiveRetryCount = 0;
    }

    if (this._postRenderFrame !== null) {
      return;
    }

    this._postRenderFrame = requestAnimationFrame(() => {
      this._postRenderFrame = null;
      this._runPostRenderWork();
    });
  }

  private _runPostRenderWork(): void {
    this._observeLabels();
    this._scheduleTruncationSync();

    if (this._ensureRenderedActiveState()) {
      this._syncActiveLinkVisibility();
      this._renderedActiveRetryCount = 0;
      return;
    }

    if (this._reconcileRenderedActiveState() && this._ensureRenderedActiveState()) {
      this._syncActiveLinkVisibility();
      this._renderedActiveRetryCount = 0;
      return;
    }

    if (this._renderedActiveRetryCount >= this._maxRenderedActiveRetries) {
      this._syncActiveLinkVisibility();
      this._renderedActiveRetryCount = 0;
      return;
    }

    this._renderedActiveRetryCount += 1;
    this.requestUpdate();
    this._schedulePostRenderWork();
  }

  private _resolveRenderedHeadingId(link: HTMLAnchorElement): string {
    const linkHeadingId = link.dataset['headingId'];
    if (linkHeadingId !== undefined) {
      return linkHeadingId;
    }

    return link.querySelector<HTMLElement>('.toc-link-label')?.dataset['headingId'] ?? '';
  }

  private _ensureRenderedActiveState(): boolean {
    const root = this._getQueryableRenderRoot();
    if (!root) {
      return true;
    }

    const activeLink = root.querySelector<HTMLAnchorElement>('a.toc-link.is-active');
    if (this.activeId.length === 0) {
      return activeLink === null;
    }

    if (!(activeLink instanceof HTMLAnchorElement)) {
      return false;
    }

    const label = activeLink.querySelector<HTMLElement>('.toc-link-label');
    const renderedHeadingId = this._resolveRenderedHeadingId(activeLink);

    return renderedHeadingId === this.activeId && (label?.textContent.trim().length ?? 0) > 0;
  }

  private _reconcileRenderedActiveState(): boolean {
    const root = this._getQueryableRenderRoot();
    if (!root) {
      return false;
    }

    const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('a.toc-link'));
    if (links.length === 0) {
      return false;
    }

    let matched = false;

    for (const link of links) {
      const headingId = this._resolveRenderedHeadingId(link);
      const isActive = this.activeId.length > 0 && headingId === this.activeId;
      matched ||= isActive;

      link.classList.toggle('is-active', isActive);
      link.classList.toggle('is-scroll', isActive && this._activeIdSource === 'scroll');
      link.classList.toggle('is-click', isActive && this._activeIdSource === 'click');

      if (isActive) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }

      const tooltip = link.closest('ui-tooltip');
      if (tooltip instanceof HTMLElement) {
        const shouldDisableTooltip = !this._truncatedHeadingIds.has(headingId);
        tooltip.toggleAttribute('disabled', shouldDisableTooltip);
      }
    }

    /*
     * 根因:
     * - `layout-toc` 配下の nested SSR hydration では、親から渡る `activeId` の
     *   property / attribute 反映が先に観測されても、child shadow 内の
     *   `classMap` / `aria-current` 反映が同じ tick で取り切れない回がある
     * - 特に hash 直アクセスの初回表示で Firefox が取りこぼしやすい
     *
     * そのため、`ui-toc` 自身が ownership を持つ current DOM は、
     * 親からの declarative state 伝播だけに依存せず最終整合させる。
     */
    return matched || this.activeId.length === 0;
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
    const root = this._getQueryableRenderRoot();
    if (!observer || !root) {
      return;
    }

    observer.disconnect();
    const labels = root.querySelectorAll<HTMLElement>('.toc-link-label');
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
    const root = this._getQueryableRenderRoot();
    if (!root) {
      return;
    }

    const nextTruncatedIds = new Set<string>();
    const labels = root.querySelectorAll<HTMLElement>('.toc-link-label');

    for (const label of labels) {
      const headingId = label.dataset['headingId'];
      if (!headingId) {
        continue;
      }

      const isTruncated =
        label.scrollWidth - label.clientWidth > 1 || label.scrollHeight - label.clientHeight > 1;
      if (isTruncated) {
        nextTruncatedIds.add(headingId);
      }
    }

    if (this._areSetsEqual(this._truncatedHeadingIds, nextTruncatedIds)) {
      return;
    }

    this._truncatedHeadingIds = nextTruncatedIds;
    this.requestUpdate();
  }

  private _areSetsEqual(a: Set<string>, b: Set<string>): boolean {
    if (a.size !== b.size) {
      return false;
    }

    for (const value of a) {
      if (!b.has(value)) {
        return false;
      }
    }

    return true;
  }

  private _syncActiveLinkVisibility(): void {
    if (this.suppressActiveLinkScroll) {
      return;
    }

    const root = this._getQueryableRenderRoot();
    if (!root || !this._isAutoScrollContextVisible()) {
      return;
    }

    const activeLink = root.querySelector<HTMLAnchorElement>('a.toc-link.is-active');
    if (!activeLink || activeLink.getClientRects().length === 0) {
      return;
    }

    const scrollContainer = this._findScrollContainer(activeLink);
    if (!scrollContainer || scrollContainer.getClientRects().length === 0) {
      return;
    }

    if (
      !this._isElementActuallyVisible(activeLink) ||
      !this._isElementActuallyVisible(scrollContainer)
    ) {
      return;
    }

    if (!this._intersectsViewport(scrollContainer)) {
      return;
    }

    if (this._isFullyVisibleInContainer(activeLink, scrollContainer)) {
      return;
    }

    scrollContainer.scrollTo({
      top: this._resolveNextScrollTop(activeLink, scrollContainer),
      behavior: 'instant',
    });
  }

  private _isAutoScrollContextVisible(): boolean {
    if (!this.isConnected) {
      return false;
    }

    return this._isElementActuallyVisible(this) && this._intersectsViewport(this);
  }

  private _isElementActuallyVisible(element: HTMLElement): boolean {
    let current: HTMLElement | null = element;

    while (current) {
      if (current.hidden || current.hasAttribute('hidden') || current.hasAttribute('inert')) {
        return false;
      }

      if (current.getAttribute('aria-hidden') === 'true') {
        return false;
      }

      const style = getComputedStyle(current);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.visibility === 'collapse'
      ) {
        return false;
      }

      current = this._getComposedParentElement(current);
    }

    return true;
  }

  private _intersectsViewport(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return false;
    }

    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    return (
      rect.bottom > 0 && rect.right > 0 && rect.top < viewportHeight && rect.left < viewportWidth
    );
  }

  private _resolveNextScrollTop(element: HTMLElement, container: HTMLElement): number {
    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const currentScrollTop = container.scrollTop;

    if (elementRect.top < containerRect.top) {
      return currentScrollTop - (containerRect.top - elementRect.top);
    }

    if (elementRect.bottom > containerRect.bottom) {
      return currentScrollTop + (elementRect.bottom - containerRect.bottom);
    }

    return currentScrollTop;
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

  override render(): TemplateResult {
    if (this.headers.length === 0) {
      return html``;
    }

    return html`
      <nav aria-label=${this.navigationLabel}>
        <ul>
          ${map(this.headers, (heading) => {
            const isActive = heading.id === this.activeId;
            const normalizedLevel = this._normalizedLevel(heading);
            const isTruncated = this._truncatedHeadingIds.has(heading.id);

            return html`
              <li style=${styleMap({ '--level': String(normalizedLevel) })}>
                <ui-tooltip
                  class="toc-tooltip"
                  text=${heading.text}
                  variant="subtle"
                  placement="right-start"
                  data-heading-id=${heading.id}
                  ?disabled=${!isTruncated}
                >
                  <a
                    class=${classMap({
                      'toc-link': true,
                      'is-active': isActive,
                      'is-scroll': isActive && this._activeIdSource === 'scroll',
                      'is-click': isActive && this._activeIdSource === 'click',
                    })}
                    href=${buildHashHrefFromId(heading.id)}
                    data-toc-link
                    data-heading-id=${heading.id}
                    data-heading-level=${String(heading.level)}
                    data-heading-depth=${String(normalizedLevel)}
                    aria-current=${isActive ? 'location' : undefined}
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
