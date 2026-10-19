import { readContentContext } from '../../navigation/content-navigation-context.js';
import { findContentRoot } from '../../toc/filter-visible-headings.js';
import { normalizeTocCapabilities } from '../../toc/toc-headings.js';
import type { HydrationActivationResult } from '../../../shared/hydration/hydration-activation.js';
import { resolveTocRuntimeId } from '../../toc/toc-source-id-resolution.js';
import {
  getTocSourceSession,
  disposeTocSourceSession,
  type TocSourceSession,
} from '../../toc/toc-source-session.js';
import { TocHydrationSessionController } from '../../toc/toc-hydration-session.js';
import { TocNavigationController } from '../../toc/toc-navigation-controller.js';
import { syncLayoutTocControllersForSession } from '../../toc/sync-layout-toc-controllers.js';
import { focusWithoutScroll } from '../../lib/focus-without-scroll.js';
import { layoutTocMobileController } from './layout-toc-mobile-controller.js';
import {
  layoutTocRuntimeStore,
  type LayoutTocRuntimeSnapshot,
} from './layout-toc-runtime-store.js';

const DEFAULT_LAYOUT_TOC_RUNTIME_ID = 'page-toc';

export interface LayoutTocActivationOptions {
  readonly isCurrent?: () => boolean;
  readonly validatePanel?: (panel: HTMLElement) => void;
}

const parseJsonValue = (value: string): unknown => {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
};

const removeIdsFromTree = (root: ParentNode): void => {
  const elements =
    'querySelectorAll' in root ? Array.from(root.querySelectorAll<HTMLElement>('[id]')) : [];
  for (const element of elements) {
    element.removeAttribute('id');
  }
};

export class LayoutTocController extends HTMLElement {
  private _sourceSession: TocSourceSession | null = null;
  private _sourceCleanup: (() => void) | null = null;
  private _surfaceCleanup: (() => void) | null = null;
  private _mobileCleanup: (() => void) | null = null;
  private _navigationController: TocNavigationController | null = null;
  private _panelRoot: HTMLElement | null = null;
  private _panelNav: HTMLElement | null = null;
  private _panelOpen = false;
  private _documentListenersAttached = false;
  private _desktopNav: HTMLElement | null = null;
  private readonly _hydrationSessionController = new TocHydrationSessionController();
  private _ready = false;
  private _initializing = false;
  private _presentationGeneration = 0;
  private _presentationOwnerCheck: (() => boolean) | null = null;

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
    this._presentationGeneration += 1;
    this._cleanupPresentation();
    disposeTocSourceSession(this);
    this._sourceSession = null;
    const disposedSession = this._hydrationSessionController.dispose();
    if (disposedSession !== null) {
      layoutTocRuntimeStore.publish(disposedSession.runtimeId, {
        ready: false,
        hasVisibleHeadings: false,
        activeId: null,
        hydrationState: disposedSession.state,
      });
    }
  }

  activateHydration(options: LayoutTocActivationOptions = {}): HydrationActivationResult {
    if (typeof window === 'undefined' || !this.isConnected) {
      return { status: 'skipped', reason: 'element-disconnected' };
    }
    if (this._initializing) return { status: 'aborted' };
    if (this.hasAttribute('data-toc-trigger-reserved') && options.validatePanel === undefined) {
      return { status: 'deferred', reason: 'toc-trigger' };
    }
    // shellの再検証ではpresentationだけ作り直し、sourceの追跡・hold・初期予約を維持する。
    this._initializing = true;
    if (this._ready) this._cleanupPresentation();
    const sourceSession = getTocSourceSession(this);
    if (sourceSession === null) {
      this._initializing = false;
      return { status: 'skipped', reason: 'missing-source' };
    }
    const generation = ++this._presentationGeneration;
    const binding = sourceSession.binding;
    const context = readContentContext();
    const epoch = context?.root === binding.root ? context.contentEpoch : null;
    const runtimeId = this.tocRuntimeId;
    const ownerId = this.tocOwnerId;
    // sourceの破損でも表示層を終了できるよう、DOM所有権だけのleaseを別に保持する。
    this._presentationOwnerCheck = (): boolean => {
      const currentContext = readContentContext();
      return (
        this.isConnected &&
        binding.root.isConnected &&
        binding.toc.isConnected &&
        binding.root.contains(binding.toc) &&
        binding.toc.contains(this) &&
        binding.root.contains(binding.contentRoot) &&
        this.tocRuntimeId === runtimeId &&
        this.tocOwnerId === ownerId &&
        (options.isCurrent?.() ?? true) &&
        (epoch === null ||
          (currentContext?.root === binding.root && currentContext.contentEpoch === epoch))
      );
    };
    const isCurrent = (): boolean =>
      this.isConnected &&
      this._presentationGeneration === generation &&
      this._sourceSession === sourceSession &&
      sourceSession.isCurrent() &&
      (options.isCurrent?.() ?? true);
    this._sourceSession = sourceSession;
    this._initializing = true;
    this._hydrationSessionController.start({
      runtimeId: this.tocRuntimeId,
      ownerId: this.tocOwnerId,
      sourceId: this.sourceId,
      contentRootId: this.contentRootId,
    });
    let completed = false;
    try {
      // 追跡の起動と初期予約はsource側の一度限りの責務で、presentation再試行では戻さない。
      sourceSession.activate();
      if (!isCurrent()) return { status: 'aborted' };
      this._ensureMobilePanel();
      if (!isCurrent()) return { status: 'aborted' };
      if (this._panelRoot !== null) options.validatePanel?.(this._panelRoot);
      if (!isCurrent()) return { status: 'aborted' };
      this._navigationController = new TocNavigationController(this);
      this._attachDesktopNavClickListener();
      this._panelNav?.addEventListener('click', this._handleNavClick);
      if (this._panelNav !== null && this._panelRoot !== null) {
        const cleanup = sourceSession.attachSurface({ nav: this._panelNav, root: this._panelRoot });
        if (!isCurrent()) {
          cleanup();
          return { status: 'aborted' };
        }
        this._surfaceCleanup = cleanup;
      }
      const sourceCleanup = sourceSession.subscribe(() => {
        if (isCurrent()) this._publishRuntimeSnapshot();
      });
      if (!isCurrent()) {
        sourceCleanup();
        return { status: 'aborted' };
      }
      this._sourceCleanup = sourceCleanup;
      this._connectMobileController(isCurrent);
      if (!isCurrent()) return { status: 'aborted' };
      const refreshed = sourceSession.refresh();
      if (!isCurrent() || refreshed !== 'accepted' || sourceSession.snapshot === null)
        return { status: 'aborted' };
      this._hydrationSessionController.markHydrated();
      this._ready = true;
      this._initializing = false;
      this._syncMobilePanelState();
      if (this._panelOpen) this._attachPanelDocumentListeners();
      this._publishRuntimeSnapshot();
      if (!isCurrent()) return { status: 'aborted' };
      completed = true;
      return {
        status: 'activated',
        cleanup: () => {
          if (this._presentationGeneration === generation) {
            this._presentationGeneration += 1;
            this._cleanupPresentation();
          }
        },
      };
    } finally {
      if (this._presentationGeneration === generation) {
        this._initializing = false;
        if (!completed || !isCurrent()) this._cleanupPresentation();
      }
    }
  }

  private _resolveContentRoot(): HTMLElement | null {
    return findContentRoot(this.contentRootId);
  }

  private _connectMobileController(isCurrent: () => boolean): void {
    const cleanup = layoutTocMobileController.subscribe(this._getRuntimeId(), (snapshot) => {
      if (!isCurrent()) return;
      const previousOpen = this._panelOpen;
      this._panelOpen = snapshot.panelOpen;
      // 検証前のopen通知は記録のみ行い、未検証panelを開かない。
      if (!this._ready) return;
      this._syncMobilePanelState();
      if (this._panelOpen) this._attachPanelDocumentListeners();
      else {
        this._detachPanelDocumentListeners();
        if (previousOpen) {
          const target = layoutTocMobileController.consumeReturnFocusTarget(this._getRuntimeId());
          if (target instanceof HTMLElement) focusWithoutScroll(target);
        }
      }
    });
    if (isCurrent()) this._mobileCleanup = cleanup;
    else cleanup();
  }

  private _ensureMobilePanel(): void {
    const capabilities = normalizeTocCapabilities(parseJsonValue(this.capabilitiesJson));
    if (!capabilities.mobilePanel) return;
    const panel = document.createElement('div');
    panel.id = this._getPanelId();
    panel.className = 'layout-toc-mobile-panel';
    panel.setAttribute('data-layout-toc-mobile-panel', '');
    panel.setAttribute('aria-hidden', 'true');
    panel.setAttribute('hidden', '');
    panel.setAttribute('inert', '');
    panel.setAttribute('data-hydration-state', 'hydrating');
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
      desktopNav === null
        ? document.createElement('nav')
        : (desktopNav.cloneNode(true) as HTMLElement);
    mobileNav.classList.add('layout-toc--mobile');
    mobileNav.removeAttribute('data-layout-toc-nav');
    mobileNav.setAttribute('aria-label', '目次');
    mobileNav.setAttribute('data-layout-toc-mobile-nav', '');
    removeIdsFromTree(mobileNav);
    panel.append(header, mobileNav);
    this._panelRoot = panel;
    this._panelNav = mobileNav;
    document.body.append(panel);
  }

  private _attachDesktopNavClickListener(): void {
    const nav = this._resolveDesktopNav();
    nav?.addEventListener('click', this._handleNavClick);
    this._desktopNav = nav;
  }

  private _cleanupPresentation(): void {
    const wasReady = this._ready;
    const generation = this._presentationGeneration;
    const cleanups = [this._sourceCleanup, this._surfaceCleanup, this._mobileCleanup];
    const navigation = this._navigationController;
    const desktopNav = this._desktopNav;
    const panel = this._panelRoot;
    const panelNav = this._panelNav;
    this._sourceCleanup = this._surfaceCleanup = this._mobileCleanup = null;
    this._navigationController = null;
    this._desktopNav = this._panelRoot = this._panelNav = null;
    this._ready = false;
    this._detachPanelDocumentListeners();
    const operations = [
      ...cleanups,
      () => navigation?.destroy(),
      () => desktopNav?.removeEventListener('click', this._handleNavClick),
      () => panelNav?.removeEventListener('click', this._handleNavClick),
      () => panel?.remove(),
    ];
    for (const operation of operations) {
      try {
        operation?.();
      } catch {
        // 一つの解除失敗で残りの自分の資源を残さない。
      }
    }
    if (wasReady && this._presentationGeneration === generation && this.isConnected) {
      this._publishRuntimeSnapshot(true);
    }
  }

  private _syncMobilePanelState(): void {
    const panel = this._panelRoot;
    if (!(panel instanceof HTMLElement)) {
      return;
    }

    if (this._ready && this._panelOpen) {
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
    const activeId = this._sourceSession?.snapshot?.activeId ?? '';
    return {
      ready: this._ready,
      hasVisibleHeadings: (this._sourceSession?.snapshot?.visibleHeadings.length ?? 0) > 0,
      activeId: activeId.length > 0 ? activeId : null,
      ...(hydrationState === undefined ? {} : { hydrationState }),
    };
  }

  private _publishRuntimeSnapshot(presentationChange = false): void {
    if (
      typeof window === 'undefined' ||
      (this._initializing && !presentationChange) ||
      (presentationChange ? !this._presentationOwnerCheck?.() : !this._sourceSession?.isCurrent())
    ) {
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
    if (!(event instanceof MouseEvent) || this._sourceSession === null) {
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
      tracker: this._sourceSession.tracker,
      getActiveId: () => this._sourceSession?.snapshot?.activeId ?? '',
      applyActiveId: (id) => {
        this._sourceSession?.applyActiveId(id);
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
        (node) => node instanceof HTMLElement && node.getAttribute('aria-controls') === panelId,
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

export const activateLayoutTocController = (
  element: HTMLElement,
  options?: LayoutTocActivationOptions,
): HydrationActivationResult => {
  if (!(element instanceof LayoutTocController)) {
    return { status: 'skipped', reason: 'invalid-element' };
  }

  return element.activateHydration(options);
};
