import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { updateHashInCurrentUrl } from '../../lib/url-hash.js';
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
      min-block-size: 0;
    }

    .desktop {
      position: sticky;
      top: var(--header-height);
      max-block-size: calc(100vh - var(--header-height));
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

  @state()
  private _headings: Heading[] = [];

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

  override connectedCallback(): void {
    super.connectedCallback();
    this._loadHeadingsFromSource();

    if (typeof window === 'undefined') {
      return;
    }

    this._mobileMediaQuery = window.matchMedia('(max-width: 639px)');
    this._mobileMediaQuery.addEventListener('change', this._onMediaQueryChange);
    window.addEventListener('scroll', this._onWindowScroll, { passive: true });
    document.addEventListener('click', this._onDocumentClick);
    this._syncMobileBarVisibility();
  }

  override disconnectedCallback(): void {
    this._mobileMediaQuery?.removeEventListener('change', this._onMediaQueryChange);
    this._mobileMediaQuery = null;
    window.removeEventListener('scroll', this._onWindowScroll);
    document.removeEventListener('click', this._onDocumentClick);
    super.disconnectedCallback();
  }

  protected override willUpdate(changedProperties: Map<string, unknown>): void {
    if (
      !this.hasUpdated ||
      changedProperties.has('sourceId') ||
      changedProperties.has('headingsJson')
    ) {
      this._loadHeadingsFromSource();
    }
  }

  private _loadHeadingsFromSource(): void {
    const inlineHeadings = this._parseHeadingsJson(this.headingsJson);
    if (inlineHeadings !== null) {
      this._headings = inlineHeadings;
      this._activeTotal = inlineHeadings.length;
      this._activeId = this._resolveInitialActiveId(inlineHeadings);
      this._activeIndex = this._headings.findIndex((item) => item.id === this._activeId);
      return;
    }

    if (this.sourceId.length === 0) {
      this._headings = [];
      this._activeId = '';
      this._activeIndex = -1;
      this._activeTotal = 0;
      return;
    }

    const source = document.getElementById(this.sourceId);
    if (!(source instanceof HTMLScriptElement)) {
      this._headings = [];
      this._activeId = '';
      this._activeIndex = -1;
      this._activeTotal = 0;
      return;
    }

    try {
      const parsed: unknown = JSON.parse(source.textContent || '[]');
      if (!Array.isArray(parsed)) {
        this._headings = [];
        return;
      }

      this._headings = parsed
        .map((item) => toHeading(item))
        .filter((item): item is Heading => item !== null);
      this._activeTotal = this._headings.length;
      this._activeId = this._resolveInitialActiveId(this._headings);
      this._activeIndex = this._headings.findIndex((item) => item.id === this._activeId);
    } catch {
      this._headings = [];
      this._activeId = '';
      this._activeIndex = -1;
      this._activeTotal = 0;
    }
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

  private _onDocumentClick = (event: MouseEvent): void => {
    if (event.defaultPrevented || event.button !== 0) {
      return;
    }
    if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) {
      return;
    }

    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    if (target.closest('a, button, input, select, textarea, summary, [role="button"]')) {
      return;
    }

    const heading = target.closest<HTMLElement>('.prose :is(h2, h3, h4, h5, h6)[id]');
    if (!heading) {
      return;
    }

    this._setActiveHeading(heading.id);
    updateHashInCurrentUrl(heading.id, 'push');
  };

  private _toggleMobilePanel = (): void => {
    this._panelOpen = !this._panelOpen;
  };

  private _closeMobilePanel = (): void => {
    this._panelOpen = false;
  };

  private _setActiveHeading(id: string): void {
    const index = this._headings.findIndex((heading) => heading.id === id);
    if (index < 0) {
      return;
    }

    this._activeId = id;
    this._activeIndex = index;
    this._activeTotal = this._headings.length;
  }

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
    if (this._activeIndex >= 0 && this._activeIndex < this._headings.length) {
      return this._headings[this._activeIndex]?.text ?? '';
    }
    return this._headings[0]?.text ?? '';
  }

  override render() {
    if (this._headings.length === 0) {
      return nothing;
    }

    const circumference = 2 * Math.PI * 8;
    const dashOffset = this._getProgressOffset();
    const label = this._getCurrentHeadingLabel();

    return html`
      <div class="desktop">
        <ui-toc
          .headers=${this._headings}
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
          .headers=${this._headings}
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
