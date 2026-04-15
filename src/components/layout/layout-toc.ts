import { css, html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { PropertyValues } from 'lit';
import { keyed } from 'lit/directives/keyed.js';
import { attachStickyFooterBoundary } from '../../layout/sticky-footer-boundary.js';
import {
  filterHeadingsByScopeSelections,
  filterVisibleHeadings,
  findContentRoot,
  readTocScopeSelectionMap,
  type TocCapabilities,
} from '../../toc/filter-visible-headings.js';
import { TocActiveTracker } from '../../toc/toc-active-tracker.js';
import { TocMobileSummaryController } from '../../toc/toc-mobile-summary-controller.js';
import { isHTMLElement } from '../../lib/dom.js';
import '../ui/toc/toc.js';
import type { Heading, UiTocActiveChangeDetail, UiTocHostState } from '../ui/toc/toc.js';

interface SyncableTocElement extends HTMLElement {
  headers: Heading[];
  activeId: string;
  refresh?: () => void;
  requestUpdate?: () => void;
  applyHostState?: (state: UiTocHostState) => void;
  updateComplete?: Promise<unknown>;
}

const hasSameHeadingIds = (left: readonly Heading[], right: readonly Heading[]): boolean =>
  left.length === right.length && left.every((heading, index) => heading.id === right[index]?.id);

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
      scrollbar-gutter: stable;
      scrollbar-width: thin;
      scrollbar-color: transparent transparent;
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
      scrollbar-gutter: stable;
      scrollbar-width: thin;
      scrollbar-color: transparent transparent;
    }

    .desktop:hover,
    .desktop:focus-within,
    .mobile-panel:hover,
    .mobile-panel:focus-within {
      scrollbar-color: var(--scrollbar-thumb, var(--fg-subtle, oklch(60% 0 0))) transparent;
    }

    .desktop::-webkit-scrollbar-track,
    .desktop::-webkit-scrollbar-corner,
    .mobile-panel::-webkit-scrollbar-track,
    .mobile-panel::-webkit-scrollbar-corner {
      background: transparent;
    }

    .desktop::-webkit-scrollbar-thumb,
    .mobile-panel::-webkit-scrollbar-thumb {
      background-color: transparent;
      border: 3px solid transparent;
      background-clip: content-box;
      border-radius: var(--radius-full, 999px);
    }

    .desktop:hover::-webkit-scrollbar-thumb,
    .desktop:focus-within::-webkit-scrollbar-thumb,
    .mobile-panel:hover::-webkit-scrollbar-thumb,
    .mobile-panel:focus-within::-webkit-scrollbar-thumb {
      background-color: var(--scrollbar-thumb, var(--fg-subtle, oklch(60% 0 0)));
    }

    .desktop:hover::-webkit-scrollbar-thumb:hover,
    .desktop:focus-within::-webkit-scrollbar-thumb:hover,
    .mobile-panel:hover::-webkit-scrollbar-thumb:hover,
    .mobile-panel:focus-within::-webkit-scrollbar-thumb:hover {
      background-color: var(--scrollbar-thumb-hover, var(--fg-muted, oklch(45% 0 0)));
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
  private _renderedTocSyncScheduled = false;
  private _renderedTocSyncRetryCount = 0;

  override disconnectedCallback(): void {
    this._disconnectControllers();
    this._detachStickyFooterBoundary?.();
    this._detachStickyFooterBoundary = null;
    super.disconnectedCallback();
  }

  protected override updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (
      changedProperties.has('_visibleHeadings') ||
      changedProperties.has('_activeId') ||
      changedProperties.has('_tocReady')
    ) {
      this._scheduleRenderedTocSync();
    }
  }

  protected override willUpdate(changedProperties: Map<string, unknown>): void {
    if (
      !this.hasUpdated ||
      changedProperties.has('sourceId') ||
      changedProperties.has('headingsJson') ||
      changedProperties.has('capabilitiesJson') ||
      changedProperties.has('contentRootId')
    ) {
      this._loadHeadingsFromSource();
    }
  }

  activateHydration(): Promise<void> | void {
    if (this._hydrationActivated) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    this._hydrationActivated = true;
    this._upgradeNestedShadowHosts();

    if (!this.hasUpdated) {
      return this.updateComplete.then(() => {
        if (!this.isConnected) {
          return;
        }

        this._finishHydrationActivation();
      });
    }

    this._finishHydrationActivation();
  }

  private _finishHydrationActivation(): void {
    this._loadHeadingsFromSource();

    const stickyTarget = isHTMLElement(this.parentElement) ? this.parentElement : this;
    this._detachStickyFooterBoundary = attachStickyFooterBoundary(stickyTarget, {
      minWidth: 640,
    });

    this._connectControllers();
    this._scheduleRenderedTocSync();
    this.requestUpdate();
  }

  private _upgradeNestedShadowHosts(): void {
    if (!(this.renderRoot instanceof ShadowRoot)) {
      return;
    }

    customElements.upgrade(this.renderRoot);
  }

  private _resolveVisibleHeadings(headings: Heading[] = this._allHeadings): Heading[] {
    const contentRoot = this._resolveContentRoot();
    const hasDynamicScopes = headings.some(
      (heading) => Array.isArray(heading.scopeSelections) && heading.scopeSelections.length > 0,
    );
    const scopedHeadings =
      contentRoot === null || !(this._capabilities.dynamicScopes || hasDynamicScopes)
        ? headings
        : filterHeadingsByScopeSelections(headings, readTocScopeSelectionMap(contentRoot));

    return contentRoot === null
      ? scopedHeadings
      : filterVisibleHeadings(contentRoot, scopedHeadings);
  }

  private _resolveContentRoot(): HTMLElement | null {
    return findContentRoot(this.contentRootId);
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

    const visibleHeadings = this._resolveVisibleHeadings(nextHeadings);

    if (!this._hydrationActivated || typeof window === 'undefined') {
      this._applyVisibleHeadings(visibleHeadings);
      return;
    }

    this._applyVisibleHeadings(visibleHeadings);
    if (this._tracker !== null) {
      this._tracker.setHeadings(nextHeadings);
      this._tracker.refresh();
    }
  }

  private _connectControllers(): void {
    this._disconnectControllers();

    if (!this._hydrationActivated || typeof window === 'undefined') {
      return;
    }

    const contentRoot = this._resolveContentRoot();
    const hasDynamicScopes = this._allHeadings.some(
      (heading) => Array.isArray(heading.scopeSelections) && heading.scopeSelections.length > 0,
    );
    this._tracker = new TocActiveTracker({
      contentRootId: contentRoot?.id ?? this.contentRootId,
      headings: this._allHeadings,
      capabilities: {
        ...this._capabilities,
        dynamicScopes: this._capabilities.dynamicScopes || hasDynamicScopes,
      },
      getActiveId: () => this._activeId,
      onVisibleHeadingsChange: (headings) => {
        this._applyVisibleHeadings(headings);
      },
      onActiveIdChange: (id) => {
        this._applyActiveId(id);
      },
    });
    this._tracker.start();

    queueMicrotask(() => {
      this._tracker?.refresh();
    });
    requestAnimationFrame(() => {
      this._tracker?.refresh();
    });

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
    this._scheduleRenderedTocSync();
  }

  private _applyActiveId(id: string): void {
    this._activeId = id;
    this._activeIndex = this._visibleHeadings.findIndex((heading) => heading.id === id);
    this._scheduleRenderedTocSync();
  }

  private _createTocHostState(headings: Heading[]): UiTocHostState {
    return {
      headers: headings,
      activeId: this._activeId,
    };
  }

  private _scheduleRenderedTocSync(): void {
    if (!this._hydrationActivated || typeof window === 'undefined') {
      return;
    }

    if (this._renderedTocSyncScheduled) {
      return;
    }

    this._renderedTocSyncScheduled = true;

    void (async () => {
      await this.updateComplete;
      await customElements.whenDefined('ui-toc');
      await Promise.resolve();
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          resolve();
        });
      });

      const tocs = this._collectSyncableTocs();
      await this._awaitSyncableTocsUpdateComplete(tocs);

      this._renderedTocSyncScheduled = false;
      this._syncRenderedTocProps();
    })();
  }

  private _collectSyncableTocs(): SyncableTocElement[] {
    const renderRoot = this.renderRoot;
    if (!(renderRoot instanceof ShadowRoot || renderRoot instanceof HTMLElement)) {
      return [];
    }

    const tocs = Array.from(renderRoot.querySelectorAll<SyncableTocElement>('ui-toc'));
    for (const toc of tocs) {
      try {
        customElements.upgrade(toc);
      } catch {
        // DSD subtree 全体ではなく対象要素だけを upgrade する。
      }
    }

    return tocs;
  }

  private async _awaitSyncableTocsUpdateComplete(
    tocs: readonly SyncableTocElement[],
  ): Promise<void> {
    await Promise.all(
      tocs.map(async (toc) => {
        try {
          await toc.updateComplete;
        } catch {
          // child 側の updateComplete 非対応や例外は retry 側で吸収する
        }
      }),
    );
  }

  private _hasRenderedActiveDom(toc: SyncableTocElement, expectedActiveId: string): boolean {
    if (expectedActiveId.length === 0) {
      return true;
    }

    const root = toc.shadowRoot;
    if (!(root instanceof ShadowRoot)) {
      return false;
    }

    const activeLink = root.querySelector<HTMLAnchorElement>('a.toc-link.is-active');
    if (!(activeLink instanceof HTMLAnchorElement)) {
      return false;
    }

    const label = activeLink.querySelector<HTMLElement>('.toc-link-label');
    return (label?.textContent.trim().length ?? 0) > 0;
  }

  private _syncRenderedTocProps(): void {
    if (!this._hydrationActivated) {
      return;
    }

    if (!this._tocReady || this._visibleHeadings.length === 0) {
      return;
    }

    if (typeof document === 'undefined') {
      return;
    }

    const resolvedHeadings = this._resolveVisibleHeadings(this._allHeadings);
    if (!hasSameHeadingIds(this._visibleHeadings, resolvedHeadings)) {
      this._applyVisibleHeadings(resolvedHeadings);
      return;
    }

    const state = this._createTocHostState(this._visibleHeadings);
    const tocs = this._collectSyncableTocs();

    if (tocs.length === 0) {
      if (this._renderedTocSyncRetryCount < 8) {
        this._renderedTocSyncRetryCount += 1;
        this._scheduleRenderedTocSync();
      }
      return;
    }

    let needsRetry = false;

    for (const toc of tocs) {
      if (typeof toc.applyHostState === 'function') {
        toc.applyHostState(state);
      } else {
        toc.headers = [...state.headers];
        toc.activeId = state.activeId;
        toc.setAttribute('active-id', state.activeId);
        toc.requestUpdate?.();
        toc.refresh?.();
        needsRetry = true;
        continue;
      }

      if (toc.activeId !== state.activeId || toc.getAttribute('active-id') !== state.activeId) {
        toc.activeId = state.activeId;
        toc.setAttribute('active-id', state.activeId);
        toc.requestUpdate?.();
        toc.refresh?.();
        needsRetry = true;
      }

      if (!this._hasRenderedActiveDom(toc, state.activeId)) {
        toc.requestUpdate?.();
        toc.refresh?.();
        needsRetry = true;
      }
    }

    if (needsRetry && this._renderedTocSyncRetryCount < 8) {
      this._renderedTocSyncRetryCount += 1;
      this._scheduleRenderedTocSync();
      return;
    }

    this._renderedTocSyncRetryCount = 0;
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
    const tocKey = this._visibleHeadings.map((heading) => heading.id).join('|');

    return html`
      <div class="desktop">
        ${keyed(
          `desktop:${tocKey}`,
          html`
            <ui-toc
              .headers=${this._visibleHeadings}
              .activeId=${this._activeId}
              @ui-toc-active-change=${this._onTocActiveChange}
            ></ui-toc>
          `,
        )}
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

      <div
        class="mobile-panel"
        data-open=${String(this._panelOpen)}
        aria-hidden=${String(!this._panelOpen)}
        ?inert=${!this._panelOpen}
      >
        <div class="mobile-panel-header">
          <button class="close-button" type="button" @click=${this._closeMobilePanel}>
            <ui-icon name="x"></ui-icon>
          </button>
        </div>
        ${keyed(
          `mobile:${tocKey}`,
          html`
            <ui-toc
              .headers=${this._visibleHeadings}
              .activeId=${this._activeId}
              @ui-toc-active-change=${this._onTocActiveChange}
            ></ui-toc>
          `,
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'layout-toc': LayoutToc;
  }
}

/**
 * hydration timing は scheduler / registry が決定する。
 * component 自身に timing 判定を持たせないため、外部からの起動入口だけを残す。
 */
export const activateLayoutToc = (element: HTMLElement): Promise<void> | void => {
  if (!(element instanceof LayoutToc)) {
    return;
  }

  return element.activateHydration();
};
