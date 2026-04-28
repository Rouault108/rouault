import type { Heading } from '../ui/toc/toc.js';
import {
  filterHeadingsByScopeSelections,
  filterVisibleHeadings,
  findContentRoot,
  readTocScopeSelectionMap,
  type TocCapabilities,
} from '../../toc/filter-visible-headings.js';
import { TocActiveTracker } from '../../toc/toc-active-tracker.js';
import { TocNavigationController } from '../../toc/toc-navigation-controller.js';
import { decodeHashFragment } from '../../router/url-hash.js';
import { layoutTocMobileController } from './layout-toc-mobile-controller.js';
import { layoutTocRuntimeStore, type LayoutTocRuntimeSnapshot } from './layout-toc-runtime-store.js';

const DEFAULT_LAYOUT_TOC_RUNTIME_ID = 'page-toc';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toHeading = (value: unknown): Heading | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value['id'] === 'string' ? value['id'] : '';
  const text = typeof value['text'] === 'string' ? value['text'].trim() : '';
  const level = typeof value['level'] === 'number' ? Math.trunc(value['level']) : Number.NaN;
  if (id.length === 0 || text.length === 0 || !Number.isFinite(level) || level < 2 || level > 6) {
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
    this._detachPanelDocumentListeners();
    this._removeMobilePanel();
  }

  activateHydration(): void {
    if (this._hydrationActivated || typeof window === 'undefined') {
      return;
    }

    this._hydrationActivated = true;
    this._allHeadings = this._readHeadingsFromSource();
    this._capabilities = normalizeCapabilities(parseJsonValue(this.capabilitiesJson));

    this._connectMobileController();
    this._ensureMobilePanel();
    this._applyVisibleHeadings(this._resolveVisibleHeadings(this._allHeadings));
    this._connectTracker();
  }

  private _readHeadingsFromSource(): Heading[] {
    if (typeof document === 'undefined') {
      return [];
    }

    const source = document.getElementById(this.sourceId);
    if (!(source instanceof HTMLScriptElement)) {
      return [];
    }

    try {
      const parsed = JSON.parse(source.textContent || '[]') as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.map((item) => toHeading(item)).filter((item): item is Heading => item !== null);
    } catch {
      return [];
    }
  }

  private _resolveVisibleHeadings(headings: Heading[]): Heading[] {
    const contentRoot = this._resolveContentRoot();
    const hasDynamicScopes = headings.some(
      (heading) => Array.isArray(heading.scopeSelections) && heading.scopeSelections.length > 0,
    );
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

    const hasDynamicScopes = this._allHeadings.some(
      (heading) => Array.isArray(heading.scopeSelections) && heading.scopeSelections.length > 0,
    );

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

    this._syncHeadingVisibility(this._resolveDesktopNav(), visibleIds);
    this._syncHeadingVisibility(this._panelNav, visibleIds);

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
    if (!(nav instanceof HTMLElement)) {
      return;
    }

    const items = nav.querySelectorAll<HTMLElement>('.layout-toc__item[data-heading-id]');
    for (const item of items) {
      const headingId = item.getAttribute('data-heading-id') ?? '';
      const visible = headingId.length > 0 && visibleIds.has(headingId);
      item.hidden = !visible;
      item.setAttribute('aria-hidden', visible ? 'false' : 'true');
    }
  }

  private _syncActiveLinks(nav: HTMLElement | null): void {
    if (!(nav instanceof HTMLElement)) {
      return;
    }

    const links = nav.querySelectorAll<HTMLAnchorElement>('[data-toc-link][data-heading-id]');
    for (const link of links) {
      const headingId = link.getAttribute('data-heading-id') ?? '';
      const active = headingId.length > 0 && headingId === this._activeId;
      if (active) {
        link.setAttribute('aria-current', 'location');
        link.setAttribute('data-active', 'true');
        link.classList.add('is-active');
      } else {
        link.removeAttribute('aria-current');
        link.removeAttribute('data-active');
        link.classList.remove('is-active');
      }
    }
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
    panel.setAttribute('aria-hidden', 'true');
    panel.setAttribute('hidden', '');
    panel.setAttribute('inert', '');

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

    const desktopNavElement = this._resolveDesktopNav();
    desktopNavElement?.addEventListener('click', this._handleNavClick);

    this._panelRoot = panel;
    this._panelNav = mobileNav;
    this._syncHeadingVisibility(this._panelNav, new Set(this._visibleHeadings.map((heading) => heading.id)));
    this._syncActiveLinks(this._panelNav);
  }

  private _removeMobilePanel(): void {
    this._resolveDesktopNav()?.removeEventListener('click', this._handleNavClick);
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
    return {
      ready: this._ready,
      hasVisibleHeadings: this._visibleHeadings.length > 0,
      activeId: this._activeId.length > 0 ? this._activeId : null,
    };
  }

  private _publishRuntimeSnapshot(): void {
    if (typeof window === 'undefined') {
      return;
    }

    layoutTocRuntimeStore.publish(this._getRuntimeId(), this._buildRuntimeSnapshot());
  }

  private _resolveDesktopNav(): HTMLElement | null {
    const root = this.closest<HTMLElement>('[data-layout-toc-root]');
    return root?.querySelector<HTMLElement>('[data-layout-toc-nav]') ?? null;
  }

  private _getRuntimeId(): string {
    if (this.tocRuntimeId.length > 0) {
      return this.tocRuntimeId;
    }

    if (this.sourceId.length > 0) {
      return this.sourceId;
    }

    if (this.contentRootId.length > 0) {
      return this.contentRootId;
    }

    return DEFAULT_LAYOUT_TOC_RUNTIME_ID;
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
      applyActiveId: (id) => this._applyActiveId(id),
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

export const activateLayoutTocController = (element: HTMLElement): void => {
  if (!(element instanceof LayoutTocController)) {
    return;
  }

  element.activateHydration();
};
