import type { Heading } from '../ui/toc/toc.js';
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
} from '../../toc/toc-headings.js';
import { readTocJsonSourceScriptHeadings } from '../../toc/toc-json-source-script.js';
import type { HydrationActivationResult } from '../../../shared/hydration/hydration-activation.js';
import {
  syncTocActiveLinks,
  syncTocHeadingVisibility,
} from '../../toc/toc-desktop-nav-sync.js';
import { resolveTocRuntimeId } from '../../toc/toc-source-id-resolution.js';
import {
  findTocSourceScript,
  resolveTocSourceLookupRoot,
} from '../../toc/toc-source-lookup-root.js';
import { TocActiveTracker } from '../../toc/toc-active-tracker.js';
import { resolveTocDensityTier } from '../../toc/toc-density-tier.js';
import { TocHydrationSessionController } from '../../toc/toc-hydration-session.js';
import { TocNavigationController } from '../../toc/toc-navigation-controller.js';
import { syncLayoutTocControllersForSession } from '../../toc/sync-layout-toc-controllers.js';
import { decodeHashFragment } from '../../router/url-hash.js';
import { layoutTocMobileController } from './layout-toc-mobile-controller.js';
import { layoutTocRuntimeStore, type LayoutTocRuntimeSnapshot } from './layout-toc-runtime-store.js';

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

const readLocationHash = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }

  return decodeHashFragment(window.location.hash) ?? '';
};

const removeIdsFromTree = (root: ParentNode): void => {
  const elements = 'querySelectorAll' in root ? Array.from(root.querySelectorAll<HTMLElement>('[id]')) : [];
  for (const element of elements) {
    element.removeAttribute('id');
  }
};

export class LayoutTocController extends HTMLElement {
  private _hydrationActivated = false;
  private _tracker: TocActiveTracker | null = null;
  private _mobileCleanup: (() => void) | null = null;
  private _navigationController: TocNavigationController | null = null;
  private _panelRoot: HTMLElement | null = null;
  private _panelNav: HTMLElement | null = null;
  private _panelOpen = false;
  private _documentListenersAttached = false;
  private _desktopNavClickAttached = false;
  private readonly _hydrationSessionController = new TocHydrationSessionController();
  private _ready = false;
  private _activeId = '';
  private _allHeadings: Heading[] = [];
  private _visibleHeadings: Heading[] = [];
  private _capabilities: TocCapabilities = {
    activeTracking: false,
    dynamicScopes: false,
    mobilePanel: false,
  };

  get sourceId(): string {
    return this.getAttribute('source-id')?.trim() ?? '';
  }

  get tocRuntimeId(): string {
    return this.getAttribute('toc-runtime-id')?.trim() ?? '';
  }

  get tocOwnerId(): string {
    return this.getAttribute('toc-owner-id')?.trim() ?? '';
  }

  get contentRootId(): string {
    return this.getAttribute('content-root-id')?.trim() ?? '';
  }

  get capabilitiesJson(): string {
    return this.getAttribute('capabilities-json') ?? '';
  }

  disconnectedCallback(): void {
    this._mobileCleanup?.();
    this._mobileCleanup = null;
    this._navigationController?.destroy();
    this._navigationController = null;
    this._tracker?.destroy();
    this._tracker = null;
    const disposedSession = this._hydrationSessionController.dispose();
    if (disposedSession !== null) {
      layoutTocRuntimeStore.publish(disposedSession.runtimeId, {
        ready: false,
        hasVisibleHeadings: false,
        activeId: null,
        hydrationState: disposedSession.state,
      });
    }
    this._detachPanelDocumentListeners();
    this._removeMobilePanel();
  }

  activateHydration(): HydrationActivationResult {
    if (this._hydrationActivated || typeof window === 'undefined') {
      return { status: 'skipped', reason: 'already-activated' };
    }

    const source = this._readSourceScript();
    if (source === null) {
      return { status: 'skipped', reason: 'missing-source' };
    }

    this._hydrationActivated = true;
    this._hydrationSessionController.start({
      runtimeId: this.tocRuntimeId,
      ownerId: this.tocOwnerId,
      sourceId: this.sourceId,
      contentRootId: this.contentRootId,
    });
    this._allHeadings = readTocJsonSourceScriptHeadings(source);
    this._capabilities = normalizeTocCapabilities(parseJsonValue(this.capabilitiesJson));

    this._connectMobileController();
    this._attachDesktopNavClickListener();
    this._ensureMobilePanel();
    this._applyVisibleHeadings(this._resolveVisibleHeadings(this._allHeadings));
    this._connectTracker();
    this._hydrationSessionController.markHydrated();
    this._publishRuntimeSnapshot();
    return { status: 'activated' };
  }

  private _readSourceScript(): HTMLScriptElement | null {
    if (typeof document === 'undefined') {
      return null;
    }

    return findTocSourceScript(resolveTocSourceLookupRoot(this), this.sourceId);
  }

  private _resolveVisibleHeadings(headings: Heading[]): Heading[] {
    const contentRoot = this._resolveContentRoot();
    const hasDynamicScopes = hasDynamicTocScopeSelections(headings);
    const scopedHeadings =
      contentRoot === null || !(this._capabilities.dynamicScopes || hasDynamicScopes)
        ? headings
        : filterHeadingsByScopeSelections(headings, readTocScopeSelectionMap(contentRoot));

    return contentRoot === null ? scopedHeadings : filterVisibleHeadings(contentRoot, scopedHeadings);
  }

  private _resolveContentRoot(): HTMLElement | null {
    return findContentRoot(this.contentRootId);
  }

  private _connectTracker(): void {
    this._tracker?.destroy();

    const hasDynamicScopes = hasDynamicTocScopeSelections(this._allHeadings);

    this._tracker = new TocActiveTracker({
      contentRootId: this.contentRootId,
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

  private _applyVisibleHeadings(headings: Heading[]): void {
    this._visibleHeadings = headings;
    const visibleIds = new Set(headings.map((heading) => heading.id));
    const densityTier = resolveTocDensityTier(headings);

    this._syncHeadingVisibility(this._resolveDesktopNav(), visibleIds);
    this._syncHeadingVisibility(this._panelNav, visibleIds);
    this._syncDensityTier(this._resolveDesktopNav(), densityTier);
    this._syncDensityTier(this._panelNav, densityTier);
    this.closest<HTMLElement>('[data-layout-toc-root]')?.setAttribute(
      'data-density-tier',
      densityTier,
    );
    this._panelRoot?.setAttribute('data-density-tier', densityTier);

    const hash = readLocationHash();
    if (hash.length > 0 && visibleIds.has(hash)) {
      this._applyActiveId(hash);
    } else if (!visibleIds.has(this._activeId)) {
      this._applyActiveId(headings[0]?.id ?? '');
    } else {
      this._syncActiveDom();
    }

    this._ready = true;
    this._publishRuntimeSnapshot();
  }

  private _applyActiveId(id: string): void {
    this._activeId = id;
    this._syncActiveDom();
    this._publishRuntimeSnapshot();
  }

  private _syncActiveDom(): void {
    this._syncActiveLinks(this._resolveDesktopNav());
    this._syncActiveLinks(this._panelNav);
  }

  private _syncHeadingVisibility(nav: HTMLElement | null, visibleIds: ReadonlySet<string>): void {
    syncTocHeadingVisibility(nav, visibleIds);
  }

  private _syncDensityTier(nav: HTMLElement | null, densityTier: string): void {
    nav?.setAttribute('data-density-tier', densityTier);
  }

  private _syncActiveLinks(nav: HTMLElement | null): void {
    syncTocActiveLinks({
      nav,
      ownerId: this._getRuntimeId(),
      activeHeadingId: this._activeId.length > 0 ? this._activeId : null,
      visibleHeadingIds: new Set(this._visibleHeadings.map((heading) => heading.id)),
    });
  }

  private _connectMobileController(): void {
    this._mobileCleanup?.();
    this._mobileCleanup = layoutTocMobileController.subscribe(this._getRuntimeId(), (snapshot) => {
      const previousOpen = this._panelOpen;
      this._panelOpen = snapshot.panelOpen;
      this._syncMobilePanelState();

      if (this._panelOpen) {
        this._attachPanelDocumentListeners();
      } else {
        this._detachPanelDocumentListeners();
        if (previousOpen) {
          const returnFocusTarget = layoutTocMobileController.consumeReturnFocusTarget(
            this._getRuntimeId(),
          );
          returnFocusTarget?.focus();
        }
      }
    });
  }

  private _ensureMobilePanel(): void {
    if (!this._capabilities.mobilePanel || typeof document === 'undefined') {
      return;
    }

    const panel = document.createElement('div');
    panel.id = this._getPanelId();
    panel.className = 'layout-toc-mobile-panel';
    panel.setAttribute('data-density-tier', resolveTocDensityTier(this._visibleHeadings));
    panel.setAttribute('aria-hidden', 'true');
    panel.setAttribute('hidden', '');
    panel.setAttribute('inert', '');
    panel.setAttribute(
      'data-hydration-state',
      this._hydrationSessionController.current?.state ?? 'unhydrated',
    );

    const header = document.createElement('div');
    header.className = 'layout-toc-mobile-panel__header';

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'layout-toc-mobile-panel__close';
    closeButton.setAttribute('aria-label', '目次を閉じる');
    closeButton.textContent = '閉じる';
    closeButton.addEventListener('click', this._handleCloseClick);
    header.append(closeButton);

    const desktopNav = this._resolveDesktopNav();
    const mobileNav =
      desktopNav instanceof HTMLElement
        ? (desktopNav.cloneNode(true) as HTMLElement)
        : document.createElement('nav');

    mobileNav.classList.add('layout-toc--mobile');
    mobileNav.removeAttribute('data-layout-toc-nav');
    mobileNav.setAttribute('aria-label', 'モバイル目次');
    mobileNav.setAttribute('data-layout-toc-mobile-nav', '');
    removeIdsFromTree(mobileNav);
    mobileNav.addEventListener('click', this._handleNavClick);

    panel.append(header, mobileNav);
    document.body.append(panel);

    this._panelRoot = panel;
    this._panelNav = mobileNav;
    this._syncHeadingVisibility(this._panelNav, new Set(this._visibleHeadings.map((heading) => heading.id)));
    this._syncActiveLinks(this._panelNav);
  }

  private _attachDesktopNavClickListener(): void {
    if (this._desktopNavClickAttached) {
      return;
    }

    const desktopNavElement = this._resolveDesktopNav();
    if (!(desktopNavElement instanceof HTMLElement)) {
      return;
    }

    desktopNavElement.addEventListener('click', this._handleNavClick);
    this._desktopNavClickAttached = true;
  }

  private _removeMobilePanel(): void {
    if (this._desktopNavClickAttached) {
      this._resolveDesktopNav()?.removeEventListener('click', this._handleNavClick);
      this._desktopNavClickAttached = false;
    }
    this._panelNav?.removeEventListener('click', this._handleNavClick);
    this._panelRoot?.remove();
    this._panelRoot = null;
    this._panelNav = null;
  }

  private _syncMobilePanelState(): void {
    const panel = this._panelRoot;
    if (!(panel instanceof HTMLElement)) {
      return;
    }

    if (this._panelOpen) {
      panel.setAttribute(
        'data-hydration-state',
        this._hydrationSessionController.current?.state ?? 'unhydrated',
      );
      panel.removeAttribute('hidden');
      panel.removeAttribute('inert');
      panel.setAttribute('aria-hidden', 'false');
      return;
    }

    panel.setAttribute('hidden', '');
    panel.setAttribute('inert', '');
    panel.setAttribute('aria-hidden', 'true');
  }

  private _buildRuntimeSnapshot(): LayoutTocRuntimeSnapshot {
    const hydrationState = this._hydrationSessionController.current?.state;
    return {
      ready: this._ready,
      hasVisibleHeadings: this._visibleHeadings.length > 0,
      activeId: this._activeId.length > 0 ? this._activeId : null,
      ...(hydrationState === undefined ? {} : { hydrationState }),
    };
  }

  private _publishRuntimeSnapshot(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this._panelRoot?.setAttribute(
      'data-hydration-state',
      this._hydrationSessionController.current?.state ?? 'unhydrated',
    );

    const snapshot = this._buildRuntimeSnapshot();
    const session = this._hydrationSessionController.current;
    if (session !== null) {
      syncLayoutTocControllersForSession(session, snapshot);
      return;
    }

    layoutTocRuntimeStore.publish(this._getRuntimeId(), snapshot);
  }

  private _resolveDesktopNav(): HTMLElement | null {
    const root = this.closest<HTMLElement>('[data-layout-toc-root]');
    return root?.querySelector<HTMLElement>('[data-layout-toc-nav]') ?? null;
  }

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
    if (this._documentListenersAttached || typeof document === 'undefined') {
      return;
    }

    document.addEventListener('keydown', this._handleDocumentKeydown);
    document.addEventListener('pointerdown', this._handleDocumentPointerDown, true);
    this._documentListenersAttached = true;
  }

  private _detachPanelDocumentListeners(): void {
    if (!this._documentListenersAttached || typeof document === 'undefined') {
      return;
    }

    document.removeEventListener('keydown', this._handleDocumentKeydown);
    document.removeEventListener('pointerdown', this._handleDocumentPointerDown, true);
    this._documentListenersAttached = false;
  }

  private _handleCloseClick = (): void => {
    layoutTocMobileController.close(this._getRuntimeId());
  };

  private _handleNavClick = (event: Event): void => {
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

    if (result.owned && this._panelNav?.contains(result.link)) {
      layoutTocMobileController.close(this._getRuntimeId());
    }
  };

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

    const panel = this._panelRoot;
    if (!(panel instanceof HTMLElement)) {
      return;
    }

    const path = event.composedPath();
    if (path.includes(panel)) {
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
}

declare global {
  interface HTMLElementTagNameMap {
    'layout-toc-controller': LayoutTocController;
  }
}

if (!customElements.get('layout-toc-controller')) {
  customElements.define('layout-toc-controller', LayoutTocController);
}

export const activateLayoutTocController = (element: HTMLElement): HydrationActivationResult => {
  if (!(element instanceof LayoutTocController)) {
    return { status: 'skipped', reason: 'invalid-element' };
  }

  return element.activateHydration();
};
