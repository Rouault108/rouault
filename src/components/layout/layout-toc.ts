import { css, html, LitElement, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
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
import { isHTMLElement } from '../../lib/dom.js';
import { layoutTocMobileController } from './layout-toc-mobile-controller.js';
import { layoutTocRuntimeStore, type LayoutTocRuntimeSnapshot } from './layout-toc-runtime-store.js';
import '../ui/icon/icon.js';
import '../ui/toc/toc.js';
import type { Heading, UiTocActiveChangeDetail } from '../ui/toc/toc.js';

const DEFAULT_LAYOUT_TOC_RUNTIME_ID = 'page-toc';

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
      mobilePanel: false,
    };
  }

  return {
    activeTracking: value['activeTracking'] === true,
    dynamicScopes: value['dynamicScopes'] === true,
    mobilePanel: value['mobilePanel'] === true,
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
      top: var(--header-height);
      bottom: 0;
      z-index: var(--z-non-modal-panel, var(--z-modal, 300));
      background: var(--bg-default);
      border-top: var(--border-width, 1px) solid var(--border-default);
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition:
        opacity var(--duration-normal, 150ms)
          var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1)),
        visibility 0s linear var(--duration-normal, 150ms);
      padding: var(--space-2, 8px) max(var(--space-3, 12px), env(safe-area-inset-right))
        var(--space-6, 24px) max(var(--space-3, 12px), env(safe-area-inset-left));
      overflow-y: auto;
      overscroll-behavior: contain;
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

    .mobile-panel[data-open='true'] {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
      transition-delay: 0s;
    }

    .mobile-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2, 8px);
      padding-bottom: var(--space-2, 8px);
    }

    .mobile-panel-title {
      font-size: var(--text-sm, 13px);
      color: var(--fg-muted);
    }

    .close-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      inline-size: 32px;
      block-size: 32px;
      border: none;
      background: transparent;
      color: var(--fg-default);
      cursor: pointer;
      padding: 0;
      border-radius: var(--radius-sm, 4px);
    }

    .close-button:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
    }

    @media (min-width: 640px) {
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
      .mobile-panel {
        border-color: CanvasText;
      }
    }
  `;

  @property({ type: String, attribute: 'source-id' })
  sourceId = '';

  @property({ type: String, attribute: 'toc-runtime-id' })
  tocRuntimeId = '';

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
    mobilePanel: false,
  };
  @state() private _activeId = '';
  @state() private _activeIndex = -1;
  @state() private _panelOpen = false;
  @state() private _tocReady = false;

  private _detachStickyFooterBoundary: (() => void) | null = null;
  private _tracker: TocActiveTracker | null = null;
  private _hydrationActivated = false;
  private _mobileControllerCleanup: (() => void) | null = null;
  private _panelDocumentListenersAttached = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this._connectMobileController();
  }

  override disconnectedCallback(): void {
    this._disconnectControllers();
    this._mobileControllerCleanup?.();
    this._mobileControllerCleanup = null;
    this._detachPanelDocumentListeners();
    this._detachStickyFooterBoundary?.();
    this._detachStickyFooterBoundary = null;
    super.disconnectedCallback();
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

    if (changedProperties.has('tocRuntimeId') || changedProperties.has('sourceId')) {
      this._connectMobileController();
      this._publishRuntimeSnapshot();
    }
  }

  protected override updated(changedProperties: PropertyValues): void {
    if (changedProperties.has('_panelOpen')) {
      if (this._panelOpen) {
        this._attachPanelDocumentListeners();
        return;
      }

      this._detachPanelDocumentListeners();
      const previousValue: unknown = changedProperties.get('_panelOpen');
      if (previousValue === true) {
        const returnFocusTarget = layoutTocMobileController.consumeReturnFocusTarget(
          this._getRuntimeId(),
        );
        returnFocusTarget?.focus();
      }
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

    this._connectTracker();
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
    this._applyVisibleHeadings(visibleHeadings);

    if (!this._hydrationActivated || typeof window === 'undefined') {
      return;
    }

    if (this._tracker !== null) {
      this._tracker.setHeadings(nextHeadings);
      this._tracker.refresh();
    }
  }

  private _connectTracker(): void {
    this._tracker?.destroy();
    this._tracker = null;

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
  }

  private _connectMobileController(): void {
    this._mobileControllerCleanup?.();
    this._mobileControllerCleanup = layoutTocMobileController.subscribe(
      this._getRuntimeId(),
      (snapshot) => {
        this._panelOpen = snapshot.panelOpen;
      },
    );
  }

  private _disconnectControllers(): void {
    this._tracker?.destroy();
    this._tracker = null;
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
    if (hash.length > 0 && headings.some((heading) => heading.id === hash)) {
      this._applyActiveId(hash);
    } else if (!headings.some((heading) => heading.id === this._activeId)) {
      this._applyActiveId(headings[0]?.id ?? '');
    } else {
      this._activeIndex = headings.findIndex((heading) => heading.id === this._activeId);
    }

    this._tocReady = true;
    this._publishRuntimeSnapshot();
  }

  private _applyActiveId(id: string): void {
    this._activeId = id;
    this._activeIndex = this._visibleHeadings.findIndex((heading) => heading.id === id);
    this._publishRuntimeSnapshot();
  }

  private _publishRuntimeSnapshot(): void {
    if (typeof window === 'undefined') {
      return;
    }

    layoutTocRuntimeStore.publish(this._getRuntimeId(), this._buildRuntimeSnapshot());
  }

  private _buildRuntimeSnapshot(): LayoutTocRuntimeSnapshot {
    return {
      ready: this._tocReady,
      hasVisibleHeadings: this._visibleHeadings.length > 0,
      currentLabel: this._getCurrentHeadingLabel(),
      activeId: this._activeId.length > 0 ? this._activeId : null,
    };
  }

  private _onTocActiveChange = (event: CustomEvent<UiTocActiveChangeDetail>): void => {
    this._applyActiveId(event.detail.id);

    if (event.detail.source === 'click') {
      layoutTocMobileController.close(this._getRuntimeId());
    }
  };

  private _closeMobilePanel = (): void => {
    layoutTocMobileController.close(this._getRuntimeId());
  };

  private _getCurrentHeadingLabel(): string | null {
    if (this._activeIndex >= 0 && this._activeIndex < this._visibleHeadings.length) {
      return this._visibleHeadings[this._activeIndex]?.text ?? null;
    }

    return this._visibleHeadings[0]?.text ?? null;
  }

  private _getRuntimeId(): string {
    const explicitRuntimeId = this.tocRuntimeId.trim();
    if (explicitRuntimeId.length > 0) {
      return explicitRuntimeId;
    }

    const sourceId = this.sourceId.trim();
    if (sourceId.length > 0) {
      return sourceId;
    }

    const contentRootId = this.contentRootId.trim();
    if (contentRootId.length > 0) {
      return contentRootId;
    }

    return DEFAULT_LAYOUT_TOC_RUNTIME_ID;
  }

  private _getPanelId(): string {
    return `layout-toc-panel-${this._getRuntimeId()}`;
  }

  private _attachPanelDocumentListeners(): void {
    if (this._panelDocumentListenersAttached || typeof document === 'undefined') {
      return;
    }

    document.addEventListener('keydown', this._handleDocumentKeydown);
    document.addEventListener('pointerdown', this._handleDocumentPointerDown, true);
    this._panelDocumentListenersAttached = true;
  }

  private _detachPanelDocumentListeners(): void {
    if (!this._panelDocumentListenersAttached || typeof document === 'undefined') {
      return;
    }

    document.removeEventListener('keydown', this._handleDocumentKeydown);
    document.removeEventListener('pointerdown', this._handleDocumentPointerDown, true);
    this._panelDocumentListenersAttached = false;
  }

  private _handleDocumentKeydown = (event: KeyboardEvent): void => {
    if (!this._panelOpen) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      layoutTocMobileController.close(this._getRuntimeId());
    }
  };

  private _handleDocumentPointerDown = (event: PointerEvent): void => {
    if (!this._panelOpen) {
      return;
    }

    const path = event.composedPath();
    const panel = this.shadowRoot?.querySelector<HTMLElement>('.mobile-panel');
    if (panel instanceof HTMLElement && path.includes(panel)) {
      return;
    }

    const panelId = this._getPanelId();
    if (
      path.some(
        (node) =>
          node instanceof HTMLElement && node.getAttribute('aria-controls') === panelId,
      )
    ) {
      return;
    }

    layoutTocMobileController.close(this._getRuntimeId());
  };

  override render() {
    if (!this._tocReady || this._visibleHeadings.length === 0) {
      return nothing;
    }

    const tocKey = this._visibleHeadings.map((heading) => heading.id).join('|');
    const currentLabel = this._getCurrentHeadingLabel() ?? '目次';
    const panelId = this._getPanelId();

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

      <div
        id=${panelId}
        class="mobile-panel"
        data-open=${String(this._panelOpen)}
        aria-hidden=${String(!this._panelOpen)}
        ?inert=${!this._panelOpen}
      >
        <div class="mobile-panel-header">
          <div class="mobile-panel-title">${currentLabel}</div>
          <button
            class="close-button"
            type="button"
            aria-label="目次を閉じる"
            @click=${this._closeMobilePanel}
          >
            <ui-icon name="x" aria-hidden="true"></ui-icon>
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
