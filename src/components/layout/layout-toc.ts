import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { attachStickyFooterBoundary } from '../../layout/sticky-footer-boundary.js';
import { type TocCapabilities } from '../../toc/filter-visible-headings.js';
import { TocActiveTracker } from '../../toc/toc-active-tracker.js';
import { TocMobileSummaryController } from '../../toc/toc-mobile-summary-controller.js';
import '../ui/toc/toc.js';
import type { Heading, UiTocActiveChangeDetail } from '../ui/toc/toc.js';

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

  const scopeSelections = Array.isArray(value['scopeSelections'])
    ? value['scopeSelections']
        .map((selection) => {
          if (!isRecord(selection)) {
            return null;
          }
          const scopeId =
            typeof selection['scopeId'] === 'string' ? selection['scopeId'].trim() : '';
          const selectedValue =
            typeof selection['value'] === 'string' ? selection['value'].trim() : '';
          if (scopeId.length === 0 || selectedValue.length === 0) {
            return null;
          }
          return { scopeId, value: selectedValue };
        })
        .filter((selection): selection is { scopeId: string; value: string } => selection !== null)
    : [];

  return {
    id,
    text,
    level,
    ...(scopeSelections.length > 0 ? { scopeSelections } : {}),
  };
};

const parseJsonArray = (value: string): unknown[] | null => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(normalized);
    return Array.isArray(parsed) ? (parsed as unknown[]) : [];
  } catch {
    return [];
  }
};

const parseJsonValue = (value: string): unknown => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }

  try {
    return JSON.parse(normalized) as unknown;
  } catch {
    return null;
  }
};

const normalizeCapabilities = (value: unknown): TocCapabilities => {
  if (!isRecord(value)) {
    return {
      activeTracking: false,
      dynamicScopes: false,
      mobileSummary: false,
    };
  }

  return {
    activeTracking: value['activeTracking'] === true,
    dynamicScopes: value['dynamicScopes'] === true,
    mobileSummary: value['mobileSummary'] === true,
  };
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

  @property({ type: String, attribute: 'capabilities-json' })
  capabilitiesJson = '';

  @property({ type: String, attribute: 'content-root-id' })
  contentRootId = '';

  @state() private _allHeadings: Heading[] = [];
  @state() private _visibleHeadings: Heading[] = [];
  @state() private _capabilities: TocCapabilities = {
    activeTracking: false,
    dynamicScopes: false,
    mobileSummary: false,
  };
  @state() private _activeId = '';
  @state() private _activeIndex = -1;
  @state() private _activeTotal = 0;
  @state() private _showMobileBar = false;
  @state() private _panelOpen = false;
  @state() private _tocReady = true;

  private _detachStickyFooterBoundary: (() => void) | null = null;
  private _tracker: TocActiveTracker | null = null;
  private _mobileController: TocMobileSummaryController | null = null;
  private _hydrationActivated = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this._loadHeadingsFromSource();
    if (!this.hasAttribute('data-hydration-trigger')) {
      this.activateHydration();
    }
  }

  override disconnectedCallback(): void {
    this._disconnectControllers();
    this._detachStickyFooterBoundary?.();
    this._detachStickyFooterBoundary = null;
    super.disconnectedCallback();
  }

  protected override willUpdate(changedProperties: Map<string, unknown>): void {
    if (
      !this.hasUpdated ||
      changedProperties.has('sourceId') ||
      changedProperties.has('headingsJson') ||
      changedProperties.has('capabilitiesJson')
    ) {
      this._loadHeadingsFromSource();
    }
  }

  activateHydration(): void {
    if (this._hydrationActivated) {
      return;
    }

    this._hydrationActivated = true;
    const stickyTarget = this.parentElement instanceof HTMLElement ? this.parentElement : this;
    this._detachStickyFooterBoundary = attachStickyFooterBoundary(stickyTarget);
    this._connectControllers();
  }

  private _loadHeadingsFromSource(): void {
    const inlineHeadings = parseJsonArray(this.headingsJson);

    let nextHeadings: Heading[] = [];
    if (inlineHeadings !== null) {
      nextHeadings = inlineHeadings
        .map((item) => toHeading(item))
        .filter((item): item is Heading => item !== null);
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

    this._capabilities = normalizeCapabilities(parseJsonValue(this.capabilitiesJson));

    if (!this._hydrationActivated || typeof window === 'undefined') {
      this._applyVisibleHeadings(nextHeadings);
      return;
    }

    this._connectControllers();
  }

  private _connectControllers(): void {
    this._disconnectControllers();

    if (typeof window === 'undefined') {
      this._applyVisibleHeadings(this._allHeadings);
      return;
    }

    this._tocReady = false;

    this._tracker = new TocActiveTracker({
      contentRootId: this.contentRootId,
      headings: this._allHeadings,
      capabilities: this._capabilities,
      getActiveId: () => this._activeId,
      onVisibleHeadingsChange: (headings) => {
        this._applyVisibleHeadings(headings);
      },
      onActiveIdChange: (id) => {
        this._applyActiveId(id);
      },
    });
    this._tracker.start();

    this._mobileController = new TocMobileSummaryController({
      enabled: this._capabilities.mobileSummary,
      onVisibilityChange: (visible) => {
        this._showMobileBar = visible;
        if (!visible) {
          this._panelOpen = false;
        }
      },
    });
    this._mobileController.start();
  }

  private _disconnectControllers(): void {
    this._tracker?.destroy();
    this._tracker = null;
    this._mobileController?.destroy();
    this._mobileController = null;
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
    this._activeTotal = headings.length;

    const hash = this._readLocationHash();
    if (hash.length > 0 && headings.some((heading) => heading.id === hash)) {
      this._applyActiveId(hash);
    } else if (!headings.some((heading) => heading.id === this._activeId)) {
      this._applyActiveId(headings[0]?.id ?? '');
    } else {
      this._activeIndex = headings.findIndex((heading) => heading.id === this._activeId);
    }

    this._tocReady = true;
  }

  private _applyActiveId(id: string): void {
    this._activeId = id;
    this._activeIndex = this._visibleHeadings.findIndex((heading) => heading.id === id);
  }

  private _onTocActiveChange = (event: CustomEvent<UiTocActiveChangeDetail>): void => {
    this._applyActiveId(event.detail.id);
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
                <ui-icon name="house"></ui-icon>
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
            <ui-icon name="x"></ui-icon>
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
