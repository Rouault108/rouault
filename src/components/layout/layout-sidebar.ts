import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import '../ui/sidebar-shell/sidebar-shell.js';
import type { UiSidebarRequestCloseDetail } from '../ui/sidebar-shell/sidebar-shell.js';
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

    ui-sidebar-shell {
      display: block;
      block-size: 100%;
      min-block-size: 0;
    }

    .sidebar-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2, 8px);
      min-block-size: var(--control-height-lg, 40px);
      padding: var(--space-2, 8px) var(--space-4, 16px);
      border-bottom: var(--border-width, 1px) solid var(--border-default, oklch(20% 0 0 / 0.12));
      background: var(--bg-surface-2, oklch(100% 0 0));
    }

    .heading {
      margin: 0;
      font-family: var(--font-sans);
      font-size: var(--text-sm, 13px);
      font-weight: var(--font-medium, 500);
      letter-spacing: 0.01em;
      color: var(--fg-muted, oklch(42% 0 0));
    }
  `;

  @property({ type: String, attribute: 'state-scope-id' })
  stateScopeId = '';

  @property({ type: String, attribute: 'selected-id' })
  selectedId: string | null = null;

  @property({ type: String, attribute: 'structural-expanded-ids' })
  structuralExpandedIdsJson = '[]';

  @property({ type: String, attribute: 'topology-revision' })
  topologyRevision: string | null = null;

  @property({ type: String })
  heading = 'ナビゲーション';

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
  private _persistedExpandedIds = new Set<string>();

  private _activeId: string | null = null;
  private _storage: Storage | null = null;
  private _detachStickyFooterBoundary: (() => void) | null = null;
  private _storeCleanup: (() => void) | null = null;
  private _bootstrappedMarkup = false;
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

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  applyShellProjection(snapshot: SidebarShellProjection | null): void {
    if (snapshot === null) {
      return;
    }

    // server nav subtree を唯一正本として差し替え、開閉状態の継続だけを localStorage へ委ねる。
    this.stateScopeId = snapshot.stateScopeId;
    this.selectedId = snapshot.selectedId;
    this.structuralExpandedIdsJson = JSON.stringify(snapshot.structuralExpandedIds);
    this.topologyRevision = snapshot.topologyRevision;
    this.heading = snapshot.heading;
    this.fixedBreakpoint = snapshot.fixedBreakpoint;
    this.sidebarId = snapshot.sidebarId;
    this.presentation = snapshot.presentation;
    this.setAttribute('state-scope-id', snapshot.stateScopeId);

    if (snapshot.selectedId === null) {
      this.removeAttribute('selected-id');
    } else {
      this.setAttribute('selected-id', snapshot.selectedId);
    }

    this.setAttribute('structural-expanded-ids', JSON.stringify(snapshot.structuralExpandedIds));

    if (snapshot.topologyRevision === null) {
      this.removeAttribute('topology-revision');
    } else {
      this.setAttribute('topology-revision', snapshot.topologyRevision);
    }

    this.setAttribute('heading', snapshot.heading);
    this.setAttribute('fixed-breakpoint', String(snapshot.fixedBreakpoint));
    this.setAttribute('sidebar-id', snapshot.sidebarId);
    this.setAttribute('presentation', snapshot.presentation);
    this._navMarkup = snapshot.navHtml?.trim() ?? '';
    this._activeId = null;
  }

  readShellProjection(): SidebarShellProjection {
    return {
      present: !this.hidden,
      sidebarId: this._resolveSidebarId(),
      stateScopeId: this._resolveStateScopeId(),
      selectedId: this.selectedId,
      structuralExpandedIds: this._parseStructuralExpandedIds(this.structuralExpandedIdsJson),
      topologyRevision: this.topologyRevision,
      navHtml: this._readServerNavMarkup(),
      heading: this.heading,
      fixedBreakpoint: this.fixedBreakpoint,
      presentation: this.presentation,
    };
  }

  override connectedCallback(): void {
    if (!this._bootstrappedMarkup) {
      this._navMarkup = this.innerHTML.trim();
      this._bootstrappedMarkup = true;
      this.innerHTML = '';
    }

    super.connectedCallback();

    this._storage = this._resolveStorage();
    this._restorePersistedExpandedIds();
    this._initializePresentationStore();
    this._connectPresentationStore();
    this._reflectModeAttribute();
    this._syncStickyFooterBoundary();
  }

  override disconnectedCallback(): void {
    this._navInteraction.disconnect();
    this._storeCleanup?.();
    this._storeCleanup = null;
    this._detachStickyFooterBoundary?.();
    this._detachStickyFooterBoundary = null;
    super.disconnectedCallback();
  }

  protected override willUpdate(changedProperties: Map<string, unknown>): void {
    if (
      !this.hasUpdated ||
      changedProperties.has('sidebarId') ||
      changedProperties.has('stateScopeId')
    ) {
      this._restorePersistedExpandedIds();
    }
  }

  protected override updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has('presentation') || changedProperties.has('fixedBreakpoint')) {
      this._initializePresentationStore();
    }

    if (changedProperties.has('sidebarId')) {
      const previousSidebarId = changedProperties.get('sidebarId');
      this._storeCleanup?.();
      this._storeCleanup = null;
      if (typeof previousSidebarId === 'string') {
        layoutSidebarController.reset(previousSidebarId);
      }
      this._initializePresentationStore();
      this._connectPresentationStore();
    }

    if (changedProperties.has('_sidebarSnapshot')) {
      this._reflectModeAttribute();
      this._syncStickyFooterBoundary();
    }

    this._connectNavInteraction();
    this._syncRenderedNav();
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
    const nav = findLayoutSidebarNav(this);
    if (nav instanceof HTMLElement) {
      return nav.outerHTML;
    }

    const markup = this._navMarkup.trim();
    return markup.length > 0 ? markup : null;
  }

  private _parseStructuralExpandedIds(value: string): string[] {
    const normalized = value.trim();
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

  private _restorePersistedExpandedIds(): void {
    const persistedState = readLayoutSidebarTreeState(this._storage, {
      sidebarId: this._resolveSidebarId(),
      stateScopeId: this._resolveStateScopeId(),
    });
    const nextExpandedIds = new Set(persistedState?.expandedIds ?? []);
    this._setPersistedExpandedIds(nextExpandedIds);
  }

  private _resolveStateScopeId(): string {
    const normalized = this.stateScopeId.trim();
    return normalized.length > 0 ? normalized : 'global';
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

  private _setPersistedExpandedIds(expandedIds: Iterable<string>): void {
    const nextExpandedIds = new Set(normalizeExpandedIds(expandedIds));

    if (sameExpandedIds(this._persistedExpandedIds, nextExpandedIds)) {
      return;
    }

    this._persistedExpandedIds = nextExpandedIds;
  }

  private _setActiveId(id: string | null): void {
    const normalized = id?.trim() ?? null;
    if (this._activeId === normalized) {
      return;
    }

    this._activeId = normalized;
  }

  private _getMergedExpandedIds(): Set<string> {
    return new Set([
      ...this._parseStructuralExpandedIds(this.structuralExpandedIdsJson),
      ...normalizeExpandedIds(this._persistedExpandedIds),
    ]);
  }

  private _connectNavInteraction(): void {
    this._navInteraction.connect(findLayoutSidebarNav(this));
  }

  private _syncRenderedNav(): void {
    const nav = findLayoutSidebarNav(this);
    if (!(nav instanceof HTMLElement)) {
      return;
    }

    const nextActiveId = syncLayoutSidebarNav(nav, {
      selectedId: this.selectedId,
      expandedIds: this._getMergedExpandedIds(),
      activeId: this._activeId,
    });

    this._setActiveId(nextActiveId);
  }

  private _handleNavToggle(id: string, expanded: boolean): void {
    const nextExpandedIds = new Set(this._persistedExpandedIds);

    if (expanded) {
      nextExpandedIds.add(id);
    } else {
      nextExpandedIds.delete(id);
    }

    this._setPersistedExpandedIds(nextExpandedIds);

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

  private _onSidebarRequestClose = (_event: CustomEvent<UiSidebarRequestCloseDetail>): void => {
    layoutSidebarController.close(this._resolveSidebarId());
  };

  override render() {
    const normalizedHeading = this.heading.trim();

    return html`
      <ui-sidebar-shell
        data-state=${this._sidebarSnapshot.state}
        mode=${this._sidebarSnapshot.mode}
        .state=${this._sidebarSnapshot.state}
        .mode=${this._sidebarSnapshot.mode}
        .returnFocusTarget=${this._sidebarSnapshot.returnFocusTarget}
        @ui-sidebar-request-close=${this._onSidebarRequestClose}
      >
        <div class="sidebar-head" slot="header">
          <h2 class="heading">${normalizedHeading}</h2>
        </div>
        ${unsafeHTML(this._navMarkup)}
      </ui-sidebar-shell>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'layout-sidebar': LayoutSidebar;
  }
}
