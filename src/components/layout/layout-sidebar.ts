import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { SidebarShellProjection } from '../../../shared/navigation/shell-projection.js';
import { attachStickyFooterBoundary } from '../../layout/sticky-footer-boundary.js';
import { NOTE_SIDEBAR_FIXED_BREAKPOINT } from '../../layout/note-sidebar-breakpoint.js';
import {
  DEFAULT_LAYOUT_SIDEBAR_ID,
  layoutSidebarController,
  type LayoutSidebarControllerSnapshot,
  type LayoutSidebarPresentation,
} from './layout-sidebar-controller.js';
import {
  readLayoutSidebarTreeState,
  writeLayoutSidebarTreeState,
} from './layout-sidebar-tree-state.js';
import {
  findLayoutSidebarNav,
  LayoutSidebarNavInteractionController,
  syncLayoutSidebarNav,
} from './layout-sidebar-nav.js';
import { ensureLayoutSidebarOverlayLayer } from './layout-sidebar-overlay-layer.js';
import './layout-sidebar-surface.js';
import type { LayoutSidebarSurface } from './layout-sidebar-surface.js';

const normalizeExpandedIds = (expandedIds: Iterable<string>): string[] =>
  [...new Set(expandedIds)].sort((left, right) => left.localeCompare(right));

const sameExpandedIds = (left: Iterable<string>, right: Iterable<string>): boolean => {
  const normalizedLeft = normalizeExpandedIds(left);
  const normalizedRight = normalizeExpandedIds(right);

  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  return normalizedLeft.every((value, index) => value === normalizedRight[index]);
};

const DEFAULT_SIDEBAR_SNAPSHOT: LayoutSidebarControllerSnapshot = {
  mode: 'overlay',
  state: 'collapsed',
  returnFocusTarget: null,
};

@customElement('layout-sidebar')
export class LayoutSidebar extends LitElement {
  static override styles = css`
    :host {
      display: block;
      block-size: 100%;
      min-block-size: 0;
      overflow: visible;
    }

    slot {
      display: contents;
    }
  `;

  @property({ type: String, attribute: 'state-scope-id' })
  stateScopeId = '';

  @property({ type: String, attribute: 'selected-id' })
  selectedId: string | null = null;

  @property({ type: String, attribute: 'initial-expanded-ids' })
  initialExpandedIdsJson = '[]';

  @property({ type: String, attribute: 'topology-revision' })
  topologyRevision: string | null = null;

  @property({ type: String })
  heading = '';

  @property({ type: Number, attribute: 'fixed-breakpoint' })
  fixedBreakpoint = NOTE_SIDEBAR_FIXED_BREAKPOINT;

  @property({ type: String, reflect: true })
  presentation: LayoutSidebarPresentation = 'auto';

  @property({ type: String, attribute: 'sidebar-id' })
  sidebarId = DEFAULT_LAYOUT_SIDEBAR_ID;

  @state()
  private _navMarkup = '';

  @state()
  private _sidebarSnapshot: LayoutSidebarControllerSnapshot = DEFAULT_SIDEBAR_SNAPSHOT;

  @state()
  private _expandedIds = new Set<string>();

  @state()
  private _hasStoredExpandedState = false;

  private _activeId: string | null = null;
  private _storage: Storage | null = null;
  private _detachStickyFooterBoundary: (() => void) | null = null;
  private _storeCleanup: (() => void) | null = null;
  private _bootstrappedMarkup = false;
  private _surface: LayoutSidebarSurface | null = null;
  private _surfaceSyncRequest = 0;

  private _navInteraction = new LayoutSidebarNavInteractionController({
    onToggle: (id, expanded) => {
      this._handleNavToggle(id, expanded);
    },
    onSelect: (id) => {
      this._handleNavSelect(id);
    },
    onActiveChange: (id) => {
      this._setActiveId(id);
    },
  });

  applyShellProjection(snapshot: SidebarShellProjection | null): void {
    if (!snapshot?.present) {
      this._applyAbsentShellProjection();
      return;
    }

    // server nav subtree を唯一正本として差し替え、開閉状態の継続だけを localStorage へ委ねる。
    this.stateScopeId = snapshot.stateScopeId;
    this.selectedId = snapshot.selectedId;
    this.initialExpandedIdsJson = JSON.stringify(snapshot.initialExpandedIds);
    this.topologyRevision = snapshot.topologyRevision;
    this.heading = this._normalizeHeading(snapshot.heading);
    this.fixedBreakpoint = snapshot.fixedBreakpoint;
    this.sidebarId = snapshot.sidebarId;
    this.presentation = snapshot.presentation;
    this.hidden = !snapshot.present;
    this.setAttribute('state-scope-id', snapshot.stateScopeId);

    if (snapshot.selectedId === null) {
      this.removeAttribute('selected-id');
    } else {
      this.setAttribute('selected-id', snapshot.selectedId);
    }

    this.setAttribute('initial-expanded-ids', JSON.stringify(snapshot.initialExpandedIds));

    if (snapshot.topologyRevision === null) {
      this.removeAttribute('topology-revision');
    } else {
      this.setAttribute('topology-revision', snapshot.topologyRevision);
    }

    if (snapshot.heading === null) {
      this.removeAttribute('heading');
    } else {
      this.setAttribute('heading', snapshot.heading);
    }
    this.setAttribute('fixed-breakpoint', String(snapshot.fixedBreakpoint));
    this.setAttribute('sidebar-id', snapshot.sidebarId);
    this.setAttribute('presentation', snapshot.presentation);
    this._navMarkup = snapshot.navHtml?.trim() ?? '';
    this._activeId = null;

    this._syncSurfaceMount();
    this._syncSurfaceProps();
    void this._syncSurfaceTree();
  }

  private _applyAbsentShellProjection(): void {
    this.hidden = true;

    this.removeAttribute('state-scope-id');
    this.removeAttribute('selected-id');
    this.removeAttribute('initial-expanded-ids');
    this.removeAttribute('topology-revision');
    this.removeAttribute('heading');
    this.removeAttribute('fixed-breakpoint');

    this.stateScopeId = '';
    this.selectedId = null;
    this.initialExpandedIdsJson = '[]';
    this.topologyRevision = null;
    this.heading = '';
    this.fixedBreakpoint = NOTE_SIDEBAR_FIXED_BREAKPOINT;
    this.presentation = 'auto';
    this._navMarkup = '';
    this._activeId = null;

    // absent projection は stale な SSR/projection light DOM も投影状態として破棄する。
    this.innerHTML = '';

    layoutSidebarController.close(this._resolveSidebarId());
    this._syncSurfaceMount();
    this._syncSurfaceProps();
    void this._syncSurfaceTree();
  }

  readShellProjection(): SidebarShellProjection {
    return {
      present: !this.hidden,
      sidebarId: this._resolveSidebarId(),
      stateScopeId: this._resolveStateScopeId(),
      selectedId: this.selectedId,
      initialExpandedIds: this._parseInitialExpandedIds(this.initialExpandedIdsJson),
      topologyRevision: this.topologyRevision,
      navHtml: this._readServerNavMarkup(),
      heading: this._readHeadingProjection(),
      fixedBreakpoint: this.fixedBreakpoint,
      presentation: this.presentation,
    };
  }

  override connectedCallback(): void {
    if (!this._bootstrappedMarkup) {
      this._navMarkup = this.innerHTML.trim();
      this._bootstrappedMarkup = true;

      // pre-hydration raw DOM leakage を防ぐため、SSR light DOM を先に除去してから
      // boot marker を外す。順序が逆だと marker 解除から再描画までの race が残る。
      this.innerHTML = '';
      this.removeAttribute('data-sidebar-boot-state');
    }

    super.connectedCallback();

    this._storage = this._resolveStorage();
    this._restoreExpandedIds();
    this._initializePresentationStore();
    this._connectPresentationStore();
    this._reflectModeAttribute();
    this._syncStickyFooterBoundary();
    this._ensureSurface();
    this._syncSurfaceMount();
    this._syncSurfaceProps();
    void this._syncSurfaceTree();
  }

  override disconnectedCallback(): void {
    this._navInteraction.disconnect();
    this._storeCleanup?.();
    this._storeCleanup = null;
    this._detachStickyFooterBoundary?.();
    this._detachStickyFooterBoundary = null;
    this._removeSurface();
    super.disconnectedCallback();
  }

  protected override willUpdate(changedProperties: Map<string, unknown>): void {
    if (
      !this.hasUpdated ||
      changedProperties.has('sidebarId') ||
      changedProperties.has('stateScopeId')
    ) {
      this._restoreExpandedIds();
    }
  }

  protected override updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has('presentation') || changedProperties.has('fixedBreakpoint')) {
      this._initializePresentationStore();
    }

    if (changedProperties.has('sidebarId')) {
      this._storeCleanup?.();
      this._storeCleanup = null;
      this._initializePresentationStore();
      this._connectPresentationStore();
    }

    if (changedProperties.has('selectedId')) {
      this._activeId = null;
    }

    if (changedProperties.has('_sidebarSnapshot')) {
      this._reflectModeAttribute();
      this._syncStickyFooterBoundary();
    }

    this._ensureSurface();
    this._syncSurfaceMount();
    this._syncSurfaceProps();
    void this._syncSurfaceTree();
  }

  expand(trigger?: HTMLElement): void {
    if (this._sidebarSnapshot.mode !== 'overlay') {
      return;
    }
    layoutSidebarController.open(this._resolveSidebarId(), trigger);
  }

  collapse(): void {
    if (this._sidebarSnapshot.mode !== 'overlay') {
      return;
    }
    layoutSidebarController.close(this._resolveSidebarId());
  }

  toggle(trigger?: HTMLElement): void {
    if (this._sidebarSnapshot.mode !== 'overlay') {
      return;
    }
    layoutSidebarController.toggle(this._resolveSidebarId(), trigger);
  }

  private _initializePresentationStore(): void {
    layoutSidebarController.initialize(this._resolveSidebarId(), {
      presentation: this.presentation,
      fixedBreakpoint: this.fixedBreakpoint,
      storage: this._storage,
    });
  }

  private _resolveSidebarId(): string {
    const normalized = this.sidebarId.trim();
    return normalized.length > 0 ? normalized : DEFAULT_LAYOUT_SIDEBAR_ID;
  }

  private _connectPresentationStore(): void {
    this._storeCleanup?.();
    this._storeCleanup = layoutSidebarController.subscribe(this._resolveSidebarId(), (snapshot) => {
      if (
        this._sidebarSnapshot.mode === snapshot.mode &&
        this._sidebarSnapshot.state === snapshot.state &&
        this._sidebarSnapshot.returnFocusTarget === snapshot.returnFocusTarget
      ) {
        return;
      }

      this._sidebarSnapshot = snapshot;
    });
  }

  private _reflectModeAttribute(): void {
    this.setAttribute('data-mode', this._sidebarSnapshot.mode);
  }

  private _syncStickyFooterBoundary(): void {
    this._detachStickyFooterBoundary?.();
    this._detachStickyFooterBoundary = null;

    if (typeof window === 'undefined' || this._sidebarSnapshot.mode !== 'fixed') {
      return;
    }

    const stickyTarget = this.parentElement instanceof HTMLElement ? this.parentElement : this;
    this._detachStickyFooterBoundary = attachStickyFooterBoundary(stickyTarget, {
      minWidth: 640,
    });
  }

  private _readServerNavMarkup(): string | null {
    const nav =
      (this._surface ? findLayoutSidebarNav(this._surface) : null) ?? findLayoutSidebarNav(this);

    if (nav instanceof HTMLElement) {
      return nav.outerHTML;
    }

    const markup = this._navMarkup.trim();
    return markup.length > 0 ? markup : null;
  }

  private _parseInitialExpandedIds(value: string | null | undefined): string[] {
    const normalized = value?.trim() ?? '';
    if (normalized.length === 0) {
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(normalized);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter((item): item is string => typeof item === 'string');
    } catch {
      return [];
    }
  }

  private _restoreExpandedIds(): void {
    const initialExpandedIds = this._parseInitialExpandedIds(this.initialExpandedIdsJson);
    const persistedState = readLayoutSidebarTreeState(this._storage, {
      sidebarId: this._resolveSidebarId(),
      stateScopeId: this._resolveStateScopeId(),
    });

    if (persistedState !== null) {
      this._hasStoredExpandedState = true;
      // 初期表示では server projection が要求する可視祖先を保ち、以後の閉じ操作は runtime state 側で優先する。
      this._setExpandedIds([...persistedState.expandedIds, ...initialExpandedIds]);
      return;
    }

    this._hasStoredExpandedState = false;
    this._setExpandedIds(initialExpandedIds);
  }

  private _resolveStateScopeId(): string {
    const normalized = this.stateScopeId.trim();
    return normalized.length > 0 ? normalized : 'global';
  }

  private _normalizeHeading(value: string | null | undefined): string {
    const normalized = value?.trim() ?? '';
    return normalized.length > 0 ? normalized : '';
  }

  private _readHeadingProjection(): string | null {
    const normalized = this._normalizeHeading(this.heading);
    return normalized.length > 0 ? normalized : null;
  }

  private _resolveStorage(): Storage | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }

  private _setExpandedIds(expandedIds: Iterable<string>): void {
    const nextExpandedIds = new Set(normalizeExpandedIds(expandedIds));

    if (sameExpandedIds(this._expandedIds, nextExpandedIds)) {
      return;
    }

    this._expandedIds = nextExpandedIds;
  }

  private _setActiveId(id: string | null): void {
    const normalized = id?.trim() ?? null;
    if (this._activeId === normalized) {
      return;
    }

    this._activeId = normalized;
  }

  private _collectAvailableBranchIds(nav: HTMLElement): Set<string> {
    return new Set(
      Array.from(nav.querySelectorAll<HTMLLIElement>('li[data-node-kind="branch"][data-node-id]'))
        .map((row) => row.getAttribute('data-node-id')?.trim() ?? '')
        .filter((id) => id.length > 0),
    );
  }

  private _pruneExpandedIds(nav: HTMLElement): void {
    const availableBranchIds = this._collectAvailableBranchIds(nav);
    const nextExpandedIds = normalizeExpandedIds(this._expandedIds).filter((id) =>
      availableBranchIds.has(id),
    );

    if (sameExpandedIds(this._expandedIds, nextExpandedIds)) {
      return;
    }

    this._setExpandedIds(nextExpandedIds);

    if (!this._hasStoredExpandedState) {
      return;
    }

    writeLayoutSidebarTreeState(
      this._storage,
      {
        expandedIds: nextExpandedIds,
      },
      {
        sidebarId: this._resolveSidebarId(),
        stateScopeId: this._resolveStateScopeId(),
      },
    );
  }

  private _connectNavInteraction(): void {
    const nav = this._surface ? findLayoutSidebarNav(this._surface) : findLayoutSidebarNav(this);
    this._navInteraction.connect(nav);
  }

  private _syncRenderedNav(): void {
    const nav = this._surface ? findLayoutSidebarNav(this._surface) : findLayoutSidebarNav(this);
    if (!(nav instanceof HTMLElement)) {
      return;
    }

    this._pruneExpandedIds(nav);

    const nextActiveId = syncLayoutSidebarNav(nav, {
      selectedId: this.selectedId,
      expandedIds: this._expandedIds,
      activeId: this._activeId,
    });

    this._setActiveId(nextActiveId);
  }

  private _handleNavToggle(id: string, expanded: boolean): void {
    const nextExpandedIds = new Set(this._expandedIds);

    if (expanded) {
      nextExpandedIds.add(id);
    } else {
      nextExpandedIds.delete(id);
    }

    this._setExpandedIds(nextExpandedIds);
    this._hasStoredExpandedState = true;

    writeLayoutSidebarTreeState(
      this._storage,
      {
        expandedIds: normalizeExpandedIds(nextExpandedIds),
      },
      {
        sidebarId: this._resolveSidebarId(),
        stateScopeId: this._resolveStateScopeId(),
      },
    );

    this.requestUpdate();
  }

  private _handleNavSelect(id: string): void {
    this._setActiveId(id);

    if (this._sidebarSnapshot.mode !== 'overlay') {
      return;
    }

    layoutSidebarController.close(this._resolveSidebarId());
  }

  private _ensureSurface(): LayoutSidebarSurface {
    if (this._surface) {
      return this._surface;
    }

    const surface = this.ownerDocument.createElement('layout-sidebar-surface');

    surface.addEventListener(
      'layout-sidebar-surface-request-close',
      this._onSurfaceRequestClose as EventListener,
    );

    this._surface = surface;
    return surface;
  }

  private _removeSurface(): void {
    if (!this._surface) {
      return;
    }

    this._surface.removeEventListener(
      'layout-sidebar-surface-request-close',
      this._onSurfaceRequestClose as EventListener,
    );
    this._surface.remove();
    this._surface = null;
  }

  private _resolveSurfaceMountTarget(): HTMLElement {
    if (this.hidden || this._sidebarSnapshot.mode !== 'overlay') {
      return this;
    }

    return ensureLayoutSidebarOverlayLayer(this.ownerDocument);
  }

  private _syncSurfaceMount(): void {
    const surface = this._ensureSurface();
    const mountTarget = this._resolveSurfaceMountTarget();

    if (surface.parentElement !== mountTarget) {
      mountTarget.append(surface);
    }
  }

  private _syncSurfaceProps(): void {
    const surface = this._surface;
    if (!surface) {
      return;
    }

    surface.heading = this._normalizeHeading(this.heading);
    surface.navMarkup = this._navMarkup;
    surface.state = this._sidebarSnapshot.state;
    surface.mode = this._sidebarSnapshot.mode;
    surface.returnFocusTarget = this._sidebarSnapshot.returnFocusTarget;
    surface.hidden = this.hidden;
  }

  private async _syncSurfaceTree(): Promise<void> {
    const requestId = ++this._surfaceSyncRequest;
    const surface = this._surface;

    if (!surface) {
      return;
    }

    await surface.updateComplete;

    if (requestId !== this._surfaceSyncRequest || surface !== this._surface) {
      return;
    }

    this._connectNavInteraction();
    this._syncRenderedNav();
  }

  private _onSurfaceRequestClose = (): void => {
    layoutSidebarController.close(this._resolveSidebarId());
  };

  protected override render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'layout-sidebar': LayoutSidebar;
  }
}
