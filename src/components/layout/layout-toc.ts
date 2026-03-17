import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { attachStickyFooterBoundary } from '../../lib/layout/sticky-footer-boundary.js';
import {
  filterVisibleHeadings,
  findContentRoot,
  findHeadingElement,
  revealHeadingInTabs,
} from '../../lib/toc/filter-visible-headings.js';
import '../../lib/icons';
import '../ui/toc/toc';
import type { Heading, UiTocActiveChangeDetail } from '../ui/toc/toc';


const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toHeading = (value: unknown): Heading | null => {
  if (!isRecord(value)) {
    return null;
  }
  const id = typeof value['id'] === 'string' ? value['id'].trim() : '';
  const text = typeof value['text'] === 'string' ? value['text'].trim() : '';
  const level = typeof value['level'] === 'number' ? Math.trunc(value['level']) : Number.NaN;
  if (id.length === 0 || text.length === 0) {
    return null;
  }
  if (!Number.isFinite(level) || level < 2 || level > 6) {
    return null;
  }
  return { id, text, level };
};

@customElement('layout-toc')
export class LayoutToc extends LitElement {
  static override styles = css`
    :host {
      display: block;
      block-size: 100%;
      min-block-size: 0;
    }

    .desktop {
      block-size: 100%;
      min-block-size: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: var(--space-3, 12px) var(--space-2, 8px);
    }

    .mobile-bar {
      position: fixed;
      top: calc(var(--header-height) + var(--space-2, 8px));
      left: var(--space-3, 12px);
      right: var(--space-3, 12px);
      z-index: var(--z-popover, 400);
      display: grid;
      grid-template-columns: auto 1fr;
      gap: var(--space-2, 8px);
      align-items: center;
      border: var(--border-width, 1px) solid var(--border-default);
      border-radius: var(--radius-md, 8px);
      background: var(--bg-surface-1);
      box-shadow: var(--shadow-md);
      padding: var(--space-2, 8px);
    }

    .home-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      inline-size: 36px;
      block-size: 36px;
      border-radius: var(--radius-sm, 4px);
      color: var(--fg-default);
      text-decoration: none;
    }

    .mobile-summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2, 8px);
      min-inline-size: 0;
      border: none;
      background: transparent;
      color: var(--fg-default);
      padding: 0;
      cursor: pointer;
      font: inherit;
      text-align: left;
    }

    .mobile-title {
      min-inline-size: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: var(--text-sm, 13px);
      color: var(--fg-default);
    }

    .progress-ring {
      inline-size: 24px;
      block-size: 24px;
      flex-shrink: 0;
    }

    .progress-ring .track {
      fill: none;
      stroke: var(--border-default);
      stroke-width: 2;
    }

    .progress-ring .indicator {
      fill: none;
      stroke: var(--primary);
      stroke-width: 2;
      stroke-linecap: round;
      transform: rotate(-90deg);
      transform-origin: 50% 50%;
      transition: stroke-dashoffset var(--duration-fast, 70ms)
        var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    .mobile-panel {
      position: fixed;
      inset-inline: 0;
      top: calc(var(--header-height) + 56px);
      bottom: 0;
      z-index: var(--z-modal, 300);
      background: var(--bg-default);
      border-top: var(--border-width, 1px) solid var(--border-default);
      transform: translateY(100%);
      transition: transform var(--duration-normal, 150ms)
        var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1));
      padding: var(--space-2, 8px) var(--space-3, 12px) var(--space-6, 24px);
      overflow-y: auto;
    }

    .mobile-panel[data-open='true'] {
      transform: translateY(0);
    }

    .mobile-panel-header {
      display: flex;
      justify-content: flex-end;
      padding-bottom: var(--space-2, 8px);
    }

    .close-button {
      border: none;
      background: transparent;
      color: var(--fg-default);
      cursor: pointer;
      padding: var(--space-1, 4px);
      border-radius: var(--radius-sm, 4px);
    }

    @media (min-width: 640px) {
      .mobile-bar,
      .mobile-panel {
        display: none;
      }
    }

    @media (max-width: 639px) {
      .desktop {
        display: none;
      }
    }

    @media (forced-colors: active) {
      .mobile-bar,
      .mobile-panel {
        border-color: CanvasText;
      }
    }
  `;

  @property({ type: String, attribute: 'source-id' })
  sourceId = '';

  @property({ type: String, attribute: 'home-href' })
  homeHref = '/';

  @property({ type: String, attribute: 'headings-json' })
  headingsJson = '';

  @property({ type: String, attribute: 'content-root-id' })
  contentRootId = '';

  @state()
  private _allHeadings: Heading[] = [];

  @state()
  private _visibleHeadings: Heading[] = [];

  @state()
  private _tocReady = true;

  @state()
  private _activeId = '';

  @state()
  private _activeIndex = -1;

  @state()
  private _activeTotal = 0;

  @state()
  private _showMobileBar = false;

  @state()
  private _panelOpen = false;

  private _mobileMediaQuery: MediaQueryList | null = null;

  private _detachStickyFooterBoundary: (() => void) | null = null;

  private _contentRoot: HTMLElement | null = null;

  private _panelStateObserver: MutationObserver | null = null;

  private _refreshVisibleHeadingsFrame: number | null = null;

  private _didWarnMissingContentRootId = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this._loadHeadingsFromSource();

    const stickyTarget = this.parentElement instanceof HTMLElement ? this.parentElement : this;
    this._detachStickyFooterBoundary = attachStickyFooterBoundary(stickyTarget);

    if (typeof window === 'undefined') {
      return;
    }

    this._mobileMediaQuery = window.matchMedia('(max-width: 639px)');
    this._mobileMediaQuery.addEventListener('change', this._onMediaQueryChange);
    window.addEventListener('scroll', this._onWindowScroll, { passive: true });
    window.addEventListener('hashchange', this._onHashChange);
    document.addEventListener('ui-tab-change', this._onTabChange as EventListener);

    this._syncMobileBarVisibility();
    this._scheduleVisibleHeadingsRefresh();
  }

  override disconnectedCallback(): void {
    this._mobileMediaQuery?.removeEventListener('change', this._onMediaQueryChange);
    this._mobileMediaQuery = null;

    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', this._onWindowScroll);
      window.removeEventListener('hashchange', this._onHashChange);
      document.removeEventListener('ui-tab-change', this._onTabChange as EventListener);

      if (this._refreshVisibleHeadingsFrame !== null) {
        window.cancelAnimationFrame(this._refreshVisibleHeadingsFrame);
        this._refreshVisibleHeadingsFrame = null;
      }
    }

    this._detachPanelStateObserver();
    this._detachStickyFooterBoundary?.();
    this._detachStickyFooterBoundary = null;

    super.disconnectedCallback();
  }

  protected override willUpdate(changedProperties: Map<string, unknown>): void {
    if (
      !this.hasUpdated ||
      changedProperties.has('sourceId') ||
      changedProperties.has('headingsJson') ||
      changedProperties.has('contentRootId')
    ) {
      this._loadHeadingsFromSource();
    }
  }

  private _warnMissingContentRootIdInDev(): void {
    if (this._didWarnMissingContentRootId) {
      return;
    }

    if (this.contentRootId.trim().length > 0) {
      return;
    }

    const isDevelopment =
      typeof location !== 'undefined' &&
      (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

    if (!isDevelopment) {
      return;
    }

    this._didWarnMissingContentRootId = true;
    console.warn(
      '[layout-toc] content-root-id が未指定です。静的ページでは任意ですが、タブや折りたたみなど可視範囲が動的に変わるページでは指定してください。',
      this,
    );
  }

  private _loadHeadingsFromSource(): void {
    const inlineHeadings = this._parseHeadingsJson(this.headingsJson);

    let nextHeadings: Heading[] = [];

    if (inlineHeadings !== null) {
      nextHeadings = inlineHeadings;
    } else if (this.sourceId.length > 0 && typeof document !== 'undefined') {
      const source = document.getElementById(this.sourceId);
      if (source instanceof HTMLScriptElement) {
        try {
          const parsed: unknown = JSON.parse(source.textContent || '[]');
          if (Array.isArray(parsed)) {
            nextHeadings = parsed
              .map((item) => toHeading(item))
              .filter((item): item is Heading => item !== null);
          }
        } catch {
          nextHeadings = [];
        }
      }
    }

    this._allHeadings = nextHeadings;

  if (typeof window === 'undefined' || this.contentRootId.trim().length === 0) {
    this._warnMissingContentRootIdInDev();
    this._applyVisibleHeadings(nextHeadings);
    return;
  }

    this._tocReady = false;
    this._scheduleVisibleHeadingsRefresh();
  }

  private _parseHeadingsJson(value: string): Heading[] | null {
    const normalized = value.trim();
    if (normalized.length === 0) {
      return null;
    }

    try {
      const parsed: unknown = JSON.parse(normalized);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .map((item) => toHeading(item))
        .filter((item): item is Heading => item !== null);
    } catch {
      return [];
    }
  }

  private _resolveInitialActiveId(headings: Heading[]): string {
    if (headings.length === 0) {
      return '';
    }

    if (typeof window === 'undefined') {
      return headings[0]?.id ?? '';
    }

    const rawHash = window.location.hash.replace(/^#/, '').trim();
    const hash = (() => {
      if (rawHash.length === 0) {
        return '';
      }
      try {
        return decodeURIComponent(rawHash).trim();
      } catch {
        return rawHash;
      }
    })();

    if (hash.length === 0) {
      return headings[0]?.id ?? '';
    }

    return headings.find((item) => item.id === hash)?.id ?? headings[0]?.id ?? '';
  }

  private _readLocationHash(): string {
    if (typeof window === 'undefined') {
      return '';
    }

    const rawHash = window.location.hash.replace(/^#/, '').trim();
    if (rawHash.length === 0) {
      return '';
    }

    try {
      return decodeURIComponent(rawHash).trim();
    } catch {
      return rawHash;
    }
  }

  private _applyVisibleHeadings(headings: Heading[]): void {
    this._visibleHeadings = headings;

    const hash = this._readLocationHash();
    const activeId = (() => {
      if (headings.length === 0) {
        return '';
      }
      if (hash.length > 0 && headings.some((item) => item.id === hash)) {
        return hash;
      }
      if (this._activeId.length > 0 && headings.some((item) => item.id === this._activeId)) {
        return this._activeId;
      }
      return this._resolveInitialActiveId(headings);
    })();

    this._activeId = activeId;
    this._activeIndex = headings.findIndex((item) => item.id === activeId);
    this._activeTotal = headings.length;
    this._tocReady = true;
  }

  private _scheduleVisibleHeadingsRefresh(): void {
    if (typeof window === 'undefined') {
      this._applyVisibleHeadings(this._allHeadings);
      return;
    }

    if (this._refreshVisibleHeadingsFrame !== null) {
      window.cancelAnimationFrame(this._refreshVisibleHeadingsFrame);
    }

    this._refreshVisibleHeadingsFrame = window.requestAnimationFrame(() => {
      this._refreshVisibleHeadingsFrame = null;
      void this._refreshVisibleHeadings();
    });
  }

  private async _refreshVisibleHeadings(): Promise<void> {
    if (typeof window === 'undefined') {
      this._applyVisibleHeadings(this._allHeadings);
      return;
    }

    await customElements.whenDefined('ui-tabs');

    const contentRoot = findContentRoot(this.contentRootId);
    this._contentRoot = contentRoot;

    this._detachPanelStateObserver();

    if (!(contentRoot instanceof HTMLElement)) {
      this._applyVisibleHeadings(this._allHeadings);
      return;
    }

    this._attachPanelStateObserver(contentRoot);

    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => { resolve() });
    });

    const hash = this._readLocationHash();
    if (hash.length > 0) {
      const target = findHeadingElement(contentRoot, hash);
      if (target) {
        revealHeadingInTabs(contentRoot, target);
      }
    }

    const visibleHeadings = filterVisibleHeadings(contentRoot, this._allHeadings);
    this._applyVisibleHeadings(visibleHeadings);
  }

  private _attachPanelStateObserver(contentRoot: HTMLElement): void {
    this._panelStateObserver = new MutationObserver((records) => {
      const shouldRefresh = records.some((record) => contentRoot.contains(record.target));
      if (shouldRefresh) {
        this._scheduleVisibleHeadingsRefresh();
      }
    });

    this._panelStateObserver.observe(contentRoot, {
      subtree: true,
      attributes: true,
      attributeFilter: ['hidden', 'aria-hidden', 'data-panel-active'],
    });
  }

  private _detachPanelStateObserver(): void {
    this._panelStateObserver?.disconnect();
    this._panelStateObserver = null;
  }

  private _isEventFromContentRoot(event: Event): boolean {
    const contentRoot = this._contentRoot ?? findContentRoot(this.contentRootId);
    if (!(contentRoot instanceof HTMLElement)) {
      return false;
    }

    const target = event.target;
    return target instanceof Node && contentRoot.contains(target);
  }

  private _onTabChange = (event: Event): void => {
    if (this._isEventFromContentRoot(event)) {
      this._scheduleVisibleHeadingsRefresh();
    }
  };

  private _onHashChange = (): void => {
    this._scheduleVisibleHeadingsRefresh();
  };

  private _onMediaQueryChange = (): void => {
    this._syncMobileBarVisibility();
    if (!(this._mobileMediaQuery?.matches ?? false)) {
      this._panelOpen = false;
    }
  };

  private _onWindowScroll = (): void => {
    this._syncMobileBarVisibility();
  };

  private _syncMobileBarVisibility(): void {
    const isMobile = this._mobileMediaQuery?.matches ?? false;
    if (!isMobile) {
      this._showMobileBar = false;
      return;
    }

    const headerHeight = this._readHeaderHeight();
    this._showMobileBar = window.scrollY > headerHeight;
  }

  private _readHeaderHeight(): number {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--header-height')
      .trim();
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : 48;
  }

  private _onTocActiveChange = (event: CustomEvent<UiTocActiveChangeDetail>): void => {
    this._activeId = event.detail.id;
    this._activeIndex = event.detail.index;
    this._activeTotal = event.detail.total;

    if (event.detail.source === 'click') {
      this._panelOpen = false;
    }
  };

  private _toggleMobilePanel = (): void => {
    this._panelOpen = !this._panelOpen;
  };

  private _closeMobilePanel = (): void => {
    this._panelOpen = false;
  };

  private _getProgressOffset(): number {
    const radius = 8;
    const circumference = 2 * Math.PI * radius;
    if (this._activeTotal <= 0 || this._activeIndex < 0) {
      return circumference;
    }
    const ratio = (this._activeIndex + 1) / this._activeTotal;
    return circumference * (1 - ratio);
  }

  private _getCurrentHeadingLabel(): string {
    if (this._activeIndex >= 0 && this._activeIndex < this._visibleHeadings.length) {
      return this._visibleHeadings[this._activeIndex]?.text ?? '';
    }
    return this._visibleHeadings[0]?.text ?? '';
  }

  override render() {
    if (!this._tocReady || this._visibleHeadings.length === 0) {
      return nothing;
    }

    const circumference = 2 * Math.PI * 8;
    const dashOffset = this._getProgressOffset();
    const label = this._getCurrentHeadingLabel();

    return html`
      <div class="desktop">
        <ui-toc
          .headers=${this._visibleHeadings}
          .activeId=${this._activeId}
          @ui-toc-active-change=${this._onTocActiveChange}
        ></ui-toc>
      </div>

      ${this._showMobileBar
        ? html`
            <div class="mobile-bar">
              <a class="home-link" href=${this.homeHref} aria-label="ホームへ移動">
                <iconify-icon icon="lucide:house"></iconify-icon>
              </a>
              <button
                class="mobile-summary"
                type="button"
                aria-expanded=${String(this._panelOpen)}
                aria-label="目次を開閉"
                @click=${this._toggleMobilePanel}
              >
                <span class="mobile-title">${label}</span>
                <svg class="progress-ring" viewBox="0 0 20 20" aria-hidden="true">
                  <circle class="track" cx="10" cy="10" r="8"></circle>
                  <circle
                    class="indicator"
                    cx="10"
                    cy="10"
                    r="8"
                    style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${dashOffset};"
                  ></circle>
                </svg>
              </button>
            </div>
          `
        : nothing}

      <div class="mobile-panel" data-open=${String(this._panelOpen)}>
        <div class="mobile-panel-header">
          <button class="close-button" type="button" @click=${this._closeMobilePanel}>
            <iconify-icon icon="lucide:x"></iconify-icon>
          </button>
        </div>
        <ui-toc
          .headers=${this._visibleHeadings}
          .activeId=${this._activeId}
          @ui-toc-active-change=${this._onTocActiveChange}
        ></ui-toc>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'layout-toc': LayoutToc;
  }
}
