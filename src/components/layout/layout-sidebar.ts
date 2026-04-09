import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../ui/icon/icon.js';
import '../ui/sidebar/sidebar.js';
import type { TreeNode } from '../ui/file-tree/file-tree.js';
import type { UiSidebarToggleDetail } from '../ui/sidebar/sidebar.js';
import type {
  SidebarMode,
  SidebarState,
  UiSidebarStateChangeDetail,
} from '../ui/sidebar-shell/sidebar-shell.js';
import type { IconName } from '../../../shared/icons/icons-catalog.js';
import { isIconName } from '../../../shared/icons/icons-catalog.js';
import { attachStickyFooterBoundary } from '../../layout/sticky-footer-boundary.js';
import { NOTE_SIDEBAR_FIXED_BREAKPOINT } from '../../layout/note-sidebar-breakpoint.js';
import {
  DEFAULT_LAYOUT_SIDEBAR_ID,
  layoutSidebarController,
} from './layout-sidebar-controller.js';
import {
  collectLayoutSidebarSelectedAncestorIds,
  readLayoutSidebarTreeState,
  writeLayoutSidebarTreeState,
} from './layout-sidebar-tree-state.js';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

type BranchTreeNode = Extract<TreeNode, { kind: 'branch' }>;
type LeafTreeNode = Extract<TreeNode, { kind: 'leaf' }>;
type TreeIcon = IconName;
type SidebarPresentation = 'auto' | 'fixed' | 'overlay';

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

const toOptionalTreeIcon = (value: unknown): TreeIcon | undefined => {
  const normalized = toOptionalString(value);
  if (normalized === undefined) {
    return undefined;
  }

  if (normalized.startsWith('lucide:')) {
    console.warn(
      `[layout-sidebar] Invalid icon name "${normalized}". Do not use the "lucide:" prefix. Use a bare icon name.`,
    );
    return undefined;
  }

  if (!isIconName(normalized)) {
    console.warn(`[layout-sidebar] Unknown icon name: ${normalized}`);
    return undefined;
  }

  return normalized;
};

const toTreeNode = (value: unknown): TreeNode | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = toOptionalString(value['id']);
  const label = toOptionalString(value['label']);
  if (!id || !label) {
    return null;
  }

  const childrenValue = value['children'];
  const children: TreeNode[] = Array.isArray(childrenValue)
    ? childrenValue
        .map((item: unknown) => toTreeNode(item))
        .filter((item): item is TreeNode => item !== null)
    : [];
  const icon = toOptionalTreeIcon(value['icon']);
  const href = toOptionalString(value['href']);

  if (children.length > 0 && href) {
    return null;
  }

  if (children.length > 0) {
    const node: BranchTreeNode = {
      kind: 'branch',
      id,
      label,
      children,
    };
    if (icon !== undefined) {
      node.icon = icon;
    }
    return node;
  }

  if (!href) {
    return null;
  }

  const node: LeafTreeNode = {
    kind: 'leaf',
    id,
    label,
    href,
  };
  if (icon !== undefined) {
    node.icon = icon;
  }
  return node;
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

    :host([presentation='overlay']),
    :host([data-mode='overlay']) {
      inline-size: 0;
      min-inline-size: 0;
      block-size: 0;
      min-block-size: 0;
    }

    ui-sidebar {
      display: block;
      block-size: 100%;
      min-block-size: 0;
    }
  `;

  @property({ type: String, attribute: 'source-id' })
  sourceId = '';

  @property({ type: String, attribute: 'selected-id' })
  selectedId: string | null = null;

  @property({ type: String, attribute: 'items-json' })
  itemsJson = '';

  @property({ type: String })
  heading = 'ナビゲーション';

  @property({ type: Number, attribute: 'fixed-breakpoint' })
  fixedBreakpoint = NOTE_SIDEBAR_FIXED_BREAKPOINT;

  @property({ type: String, reflect: true })
  presentation: SidebarPresentation = 'auto';

  @property({ type: String, attribute: 'sidebar-id' })
  sidebarId = DEFAULT_LAYOUT_SIDEBAR_ID;

  @state()
  private _items: TreeNode[] = [];

  @state()
  private _mode: SidebarMode = 'overlay';

  @state()
  private _state: SidebarState = 'collapsed';

  @state()
  private _persistedExpandedIds = new Set<string>();

  @state()
  private _returnFocusTarget: HTMLElement | null = null;

  private _storage: Storage | null = null;

  private _detachStickyFooterBoundary: (() => void) | null = null;

  private _hydrationActivated = false;

  private _ssrRootReset = false;

  private _mediaQuery: MediaQueryList | null = null;

  private _controllerCleanup: (() => void) | null = null;

  override connectedCallback(): void {
    super.connectedCallback();

    this._storage = this._resolveStorage();
    this._loadItemsFromSource();
    this._initPresentationController();
    this._registerController();
    this._reflectModeAttribute();
    this._reportController();

    if (!this.hasAttribute('data-hydration-trigger')) {
      this.activateHydration();
    }
  }

  protected override performUpdate(): void {
    this._resetSsrShadowRootIfNeeded();
    super.performUpdate();
  }

  override disconnectedCallback(): void {
    this._destroyMediaQuery();
    this._controllerCleanup?.();
    this._controllerCleanup = null;
    this._detachStickyFooterBoundary?.();
    this._detachStickyFooterBoundary = null;
    super.disconnectedCallback();
  }

  protected override willUpdate(changedProperties: Map<string, unknown>): void {
    if (
      !this.hasUpdated ||
      changedProperties.has('sourceId') ||
      changedProperties.has('itemsJson') ||
      changedProperties.has('selectedId')
    ) {
      this._loadItemsFromSource();
    }
  }

  protected override updated(changedProperties: Map<string, unknown>): void {
    if (changedProperties.has('presentation') || changedProperties.has('fixedBreakpoint')) {
      this._initPresentationController();
    }

    if (changedProperties.has('sidebarId')) {
      this._registerController();
      this._applyMode(this._mode);
    }

    if (changedProperties.has('_mode')) {
      this._reflectModeAttribute();
      this._syncStickyFooterBoundary();
    }

    if (changedProperties.has('_mode') || changedProperties.has('_state') || changedProperties.has('sidebarId')) {
      this._reportController();
    }
  }

  activateHydration(): void {
    if (this._hydrationActivated) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    this._hydrationActivated = true;
    this._upgradeNestedShadowHosts();
    this._storage = this._resolveStorage();
    this._loadItemsFromSource();
    this._syncStickyFooterBoundary();
    this.requestUpdate();
  }

  expand(trigger?: HTMLElement): void {
    if (this._mode !== 'overlay') {
      return;
    }

    if (trigger instanceof HTMLElement) {
      this._returnFocusTarget = trigger;
    }

    if (this._state === 'expanded') {
      return;
    }

    this._state = 'expanded';
    this._reportController();
  }

  collapse(): void {
    if (this._mode !== 'overlay') {
      return;
    }

    if (this._state === 'collapsed') {
      return;
    }

    this._state = 'collapsed';
    this._reportController();
  }

  toggle(trigger?: HTMLElement): void {
    if (this._mode !== 'overlay') {
      return;
    }

    if (this._state === 'expanded') {
      this.collapse();
      return;
    }

    this.expand(trigger);
  }

  private _upgradeNestedShadowHosts(): void {
    if (!(this.renderRoot instanceof ShadowRoot)) {
      return;
    }

    customElements.upgrade(this.renderRoot);
  }

  private _resetSsrShadowRootIfNeeded(): void {
    if (this._ssrRootReset || !this.hasAttribute('defer-hydration')) {
      return;
    }

    if (this.renderRoot.childNodes.length === 0) {
      this.removeAttribute('defer-hydration');
      this._ssrRootReset = true;
      return;
    }

    // SSR 済み layout-sidebar は hydration 中に tree の構造差分が崩れやすいため、
    // 初回 client update 前に shadow root を空へ戻してから再描画する。
    this.renderRoot.replaceChildren();
    this.removeAttribute('defer-hydration');
    this._ssrRootReset = true;
  }

  private _registerController(): void {
    this._controllerCleanup?.();
    this._controllerCleanup = null;

    this._controllerCleanup = layoutSidebarController.register(this._resolveSidebarId(), {
      applyOverlayState: (state, options) => {
        if (this._mode !== 'overlay') {
          return;
        }

        if (options?.trigger instanceof HTMLElement) {
          this._returnFocusTarget = options.trigger;
        }

        if (this._state !== state) {
          this._state = state;
        }
      },
    });
  }

  private _reportController(): void {
    layoutSidebarController.report(this._resolveSidebarId(), {
      mode: this._mode,
      state: this._state,
    });
  }

  private _resolveSidebarId(): string {
    const normalized = this.sidebarId.trim();
    return normalized.length > 0 ? normalized : DEFAULT_LAYOUT_SIDEBAR_ID;
  }

  private _initPresentationController(): void {
    this._destroyMediaQuery();

    if (this.presentation === 'fixed') {
      this._applyMode('fixed');
      return;
    }

    if (this.presentation === 'overlay') {
      this._applyMode('overlay');
      return;
    }

    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      this._applyMode('overlay');
      return;
    }

    this._mediaQuery = window.matchMedia(`(min-width: ${String(this.fixedBreakpoint)}px)`);
    this._applyMode(this._mediaQuery.matches ? 'fixed' : 'overlay');
    this._mediaQuery.addEventListener('change', this._onMediaQueryChange);
  }

  private _destroyMediaQuery(): void {
    this._mediaQuery?.removeEventListener('change', this._onMediaQueryChange);
    this._mediaQuery = null;
  }

  private _applyMode(nextMode: SidebarMode): void {
    const nextState: SidebarState =
      nextMode === 'fixed'
        ? 'expanded'
        : layoutSidebarController.getOverlayState(this._resolveSidebarId());

    const modeChanged = this._mode !== nextMode;
    const stateChanged = this._state !== nextState;

    if (!modeChanged && !stateChanged) {
      this._reflectModeAttribute();
      return;
    }

    this._mode = nextMode;
    this._state = nextState;
    this._reflectModeAttribute();
  }

  private _reflectModeAttribute(): void {
    this.setAttribute('data-mode', this._mode);
  }

  private _syncStickyFooterBoundary(): void {
    this._detachStickyFooterBoundary?.();
    this._detachStickyFooterBoundary = null;

    if (!this._hydrationActivated || this._mode !== 'fixed') {
      return;
    }

    const stickyTarget = this.parentElement instanceof HTMLElement ? this.parentElement : this;
    this._detachStickyFooterBoundary = attachStickyFooterBoundary(stickyTarget, {
      minWidth: 640,
    });
  }

  private _onMediaQueryChange = (event: MediaQueryListEvent): void => {
    this._applyMode(event.matches ? 'fixed' : 'overlay');
  };

  private _loadItemsFromSource(): void {
    const inlineItems = this._parseItemsJson(this.itemsJson);
    if (inlineItems !== null) {
      this._applyItems(inlineItems);
      return;
    }

    if (this.sourceId.length === 0) {
      this._applyItems([]);
      return;
    }

    const source = document.getElementById(this.sourceId);
    if (!(source instanceof HTMLScriptElement)) {
      this._applyItems([]);
      return;
    }

    try {
      const parsed: unknown = JSON.parse(source.textContent || '[]');
      if (!Array.isArray(parsed)) {
        this._applyItems([]);
        return;
      }
      const items = parsed
        .map((item) => toTreeNode(item))
        .filter((item): item is TreeNode => item !== null);
      this._applyItems(items);
    } catch {
      this._applyItems([]);
    }
  }

  private _applyItems(items: TreeNode[]): void {
    this._items = items;

    const persistedState = readLayoutSidebarTreeState(this._storage, this.selectedId);
    const nextExpandedIds = new Set(persistedState?.expandedIds ?? []);

    if (persistedState === null) {
      for (const id of collectLayoutSidebarSelectedAncestorIds(items, this.selectedId)) {
        nextExpandedIds.add(id);
      }
    }

    this._setPersistedExpandedIds(nextExpandedIds);
  }

  private _parseItemsJson(value: string): TreeNode[] | null {
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
        .map((item) => toTreeNode(item))
        .filter((item): item is TreeNode => item !== null);
    } catch {
      return [];
    }
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

  private _onSidebarStateChange = (event: CustomEvent<UiSidebarStateChangeDetail>): void => {
    this._state = event.detail.state;
    this._mode = event.detail.mode;
  };

  private _onSidebarToggle = (event: CustomEvent<UiSidebarToggleDetail>): void => {
    const { id, expanded } = event.detail;
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
      this.selectedId,
    );
  };

  private _onSidebarSelect = (): void => {
    if (this._mode !== 'overlay') {
      return;
    }

    this._state = 'collapsed';
    this._reportController();
  };

  override render() {
    return html`
      <ui-sidebar
        id="layout-sidebar-panel"
        data-state=${this._state}
        mode=${this._mode}
        .state=${this._state}
        .mode=${this._mode}
        .items=${this._items}
        .selectedId=${this.selectedId}
        .expandedIds=${new Set(this._persistedExpandedIds)}
        .heading=${this.heading}
        .fixedBreakpoint=${this.fixedBreakpoint}
        .returnFocusTarget=${this._returnFocusTarget}
        @ui-sidebar-state-change=${this._onSidebarStateChange}
        @ui-sidebar-toggle=${this._onSidebarToggle}
        @ui-sidebar-select=${this._onSidebarSelect}
      ></ui-sidebar>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'layout-sidebar': LayoutSidebar;
  }
}
