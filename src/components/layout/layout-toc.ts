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
import {
  hasDynamicTocScopeSelections,
  normalizeTocCapabilities,
  parseTocHeadingsJson,
} from '../../toc/toc-headings.js';
import { readTocJsonSourceScriptHeadings } from '../../toc/toc-json-source-script.js';
import { resolveTocRuntimeId } from '../../toc/toc-source-id-resolution.js';
import {
  findTocSourceScript,
  resolveTocSourceLookupRoot,
} from '../../toc/toc-source-lookup-root.js';
import { TocActiveTracker } from '../../toc/toc-active-tracker.js';
import { TocNavigationController } from '../../toc/toc-navigation-controller.js';
import { TocHydrationSessionController } from '../../toc/toc-hydration-session.js';
import { syncLayoutTocControllersForSession } from '../../toc/sync-layout-toc-controllers.js';
import { resolveTocDensityTier, type TocDensityTier } from '../../toc/toc-density-tier.js';
import { TOC_MOBILE_PANEL_SELECTOR } from '../../toc/toc-mobile-panel-dom-css-contract.js';
import { decodeHashFragment } from '../../router/url-hash.js';
import { isHTMLElement } from '../../lib/dom.js';
import { layoutTocMobileController } from './layout-toc-mobile-controller.js';
import {
  layoutTocRuntimeStore,
  type LayoutTocRuntimeSnapshot,
} from './layout-toc-runtime-store.js';
import '../ui/icon/icon.js';
import '../ui/toc/toc.js';
import type { Heading } from '../ui/toc/toc.js';

const DEFAULT_LAYOUT_TOC_RUNTIME_ID = 'page-toc';

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
        opacity var(--duration-normal, 150ms) var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1)),
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
      scrollbar-color: var(--scrollbar-thumb, var(--fg-control-affordance, oklch(60% 0 0)))
        transparent;
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
      background-color: var(--scrollbar-thumb, var(--fg-control-affordance, oklch(60% 0 0)));
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
      justify-content: flex-end;
      min-block-size: 32px;
      margin-block-end: var(--space-1, 4px);
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
  @state() private _panelOpen = false;
  @state() private _tocReady = false;
  @state() private _densityTier: TocDensityTier = 'comfortable';

  private _detachStickyFooterBoundary: (() => void) | null = null;
  private _tracker: TocActiveTracker | null = null;
  private _navigationController: TocNavigationController | null = null;
  private _hydrationActivated = false;
  private readonly _hydrationSessionController = new TocHydrationSessionController();
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
    const disposedSession = this._hydrationSessionController.dispose();
    if (disposedSession !== null) {
      layoutTocRuntimeStore.publish(disposedSession.ownerId, {
        ready: false,
        hasVisibleHeadings: false,
        activeId: null,
        hydrationState: disposedSession.state,
      });
    }
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
    this._hydrationSessionController.start({
      ownerId: this.tocRuntimeId,
      sourceId: this.sourceId,
      contentRootId: this.contentRootId,
    });
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
    this._hydrationSessionController.markHydrated();
    this._publishRuntimeSnapshot();
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
    const hasDynamicScopes = hasDynamicTocScopeSelections(headings);
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
    const inlineHeadings = parseTocHeadingsJson(this.headingsJson);

    let nextHeadings: Heading[] = [];
    if (inlineHeadings !== null) {
      nextHeadings = [...inlineHeadings];
    } else if (this.sourceId.length > 0 && typeof document !== 'undefined') {
      const source = findTocSourceScript(resolveTocSourceLookupRoot(this), this.sourceId);
      nextHeadings = source === null ? [] : readTocJsonSourceScriptHeadings(source);
    }

    this._allHeadings = nextHeadings;
    this._capabilities = normalizeTocCapabilities(parseJsonValue(this.capabilitiesJson));

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
    const hasDynamicScopes = hasDynamicTocScopeSelections(this._allHeadings);
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
    this._navigationController?.destroy();
    this._navigationController = null;
    this._tracker?.destroy();
    this._tracker = null;
  }

  private _readLocationHash(): string {
    if (typeof window === 'undefined') {
      return '';
    }

    return decodeHashFragment(window.location.hash) ?? '';
  }

  private _applyVisibleHeadings(headings: Heading[]): void {
    this._visibleHeadings = headings;
    this._densityTier = resolveTocDensityTier(headings);

    const hash = this._readLocationHash();
    if (hash.length > 0 && headings.some((heading) => heading.id === hash)) {
      this._applyActiveId(hash);
    } else if (!headings.some((heading) => heading.id === this._activeId)) {
      this._applyActiveId(headings[0]?.id ?? '');
    }

    this._tocReady = true;
    this._publishRuntimeSnapshot();
  }

  private _applyActiveId(id: string): void {
    this._activeId = id;
    this._publishRuntimeSnapshot();
  }

  private _publishRuntimeSnapshot(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const snapshot = this._buildRuntimeSnapshot();
    const session = this._hydrationSessionController.current;
    if (session !== null) {
      syncLayoutTocControllersForSession(session, snapshot);
      return;
    }

    layoutTocRuntimeStore.publish(this._getRuntimeId(), snapshot);
  }

  private _buildRuntimeSnapshot(): LayoutTocRuntimeSnapshot {
    const hydrationState = this._hydrationSessionController.current?.state;
    return {
      ready: this._tocReady,
      hasVisibleHeadings: this._visibleHeadings.length > 0,
      activeId: this._activeId.length > 0 ? this._activeId : null,
      ...(hydrationState === undefined ? {} : { hydrationState }),
    };
  }

  private _closeMobilePanel = (): void => {
    layoutTocMobileController.close(this._getRuntimeId());
  };

  private _handleTocClick = (event: Event): void => {
    if (!(event instanceof MouseEvent) || this._tracker === null) {
      return;
    }

    const contentRoot = this._resolveContentRoot();
    if (contentRoot === null) {
      return;
    }

    this._navigationController ??= new TocNavigationController();
    const result = this._navigationController.handleTocLinkClick(event, {
      tocRuntimeId: this._getRuntimeId(),
      contentRoot,
      tracker: this._tracker,
      getActiveId: () => this._activeId,
      applyActiveId: (id) => {
        this._applyActiveId(id);
      },
    });

    const panel = this.shadowRoot?.querySelector<HTMLElement>(TOC_MOBILE_PANEL_SELECTOR);
    if (result.owned && panel instanceof HTMLElement && panel.contains(result.link)) {
      layoutTocMobileController.close(this._getRuntimeId());
    }
  };

  private _getRuntimeId(): string {
    return resolveTocRuntimeId(
      this.tocRuntimeId,
      this.sourceId,
      this.contentRootId,
      DEFAULT_LAYOUT_TOC_RUNTIME_ID,
    );
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
    const panel = this.shadowRoot?.querySelector<HTMLElement>(TOC_MOBILE_PANEL_SELECTOR);
    if (panel instanceof HTMLElement && path.includes(panel)) {
      return;
    }

    const panelId = this._getPanelId();
    if (
      path.some(
        (node) => node instanceof HTMLElement && node.getAttribute('aria-controls') === panelId,
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
    const panelId = this._getPanelId();
    const hydrationState = this._hydrationSessionController.current?.state ?? 'unhydrated';

    return html`
      <div class="desktop">
        ${keyed(
          `desktop:${tocKey}`,
          html`
            <ui-toc
              .headers=${this._visibleHeadings}
              .activeId=${this._activeId}
              .densityTier=${this._densityTier}
              @click=${this._handleTocClick}
            ></ui-toc>
          `,
        )}
      </div>

      <div
        id=${panelId}
        class="mobile-panel"
        data-layout-toc-mobile-panel
        data-density-tier=${this._densityTier}
        data-hydration-state=${hydrationState}
        data-open=${String(this._panelOpen)}
        aria-hidden=${String(!this._panelOpen)}
        ?inert=${!this._panelOpen}
        @click=${this._handleTocClick}
      >
        <div class="mobile-panel-header">
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
              .densityTier=${this._densityTier}
              @click=${this._handleTocClick}
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
