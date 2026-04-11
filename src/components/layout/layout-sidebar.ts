import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../ui/icon/icon.js';
import '../ui/sidebar/sidebar.js';
import type { TreeNode } from '../ui/file-tree/file-tree.js';
import type {
  UiSidebarRequestCloseEventDetail,
  UiSidebarToggleDetail,
} from '../ui/sidebar/sidebar.js';
import type { IconName } from '../../../shared/icons/icons-catalog.js';
import { isIconName } from '../../../shared/icons/icons-catalog.js';
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
  mergeLayoutSidebarTreeState,
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
const DEFAULT_SIDEBAR_SNAPSHOT: LayoutSidebarControllerSnapshot = {
  mode: 'overlay',
  state: 'collapsed',
  returnFocusTarget: null,
};

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

    ui-sidebar {
      display: block;
      block-size: 100%;
      min-block-size: 0;
    }
  `;

  @property({ type: String, attribute: 'state-scope-id' })
  stateScopeId = '';

  @property({ type: String, attribute: 'selected-id' })
  selectedId: string | null = null;

  @property({ type: String, attribute: 'items-json' })
  itemsJson = '';

  @property({ type: String })
  heading = 'ナビゲーション';

  @property({ type: Number, attribute: 'fixed-breakpoint' })
  fixedBreakpoint = NOTE_SIDEBAR_FIXED_BREAKPOINT;

  @property({ type: String, reflect: true })
  presentation: LayoutSidebarPresentation = 'auto';

  @property({ type: String, attribute: 'sidebar-id' })
  sidebarId = DEFAULT_LAYOUT_SIDEBAR_ID;

  @state()
  private _items: TreeNode[] = [];

  @state()
  private _sidebarSnapshot: LayoutSidebarControllerSnapshot = DEFAULT_SIDEBAR_SNAPSHOT;

  @state()
  private _persistedExpandedIds = new Set<string>();

  private _storage: Storage | null = null;

  private _detachStickyFooterBoundary: (() => void) | null = null;
  private _storeCleanup: (() => void) | null = null;

  applyShellProjection(snapshot: SidebarShellProjection | null): void {
    if (snapshot === null) {
      return;
    }

    // router は route 由来の tree / selectedId / presentation だけを更新し、
    // 開閉状態や expanded state の継続は controller と localStorage に委ねる。
    this.stateScopeId = snapshot.stateScopeId;
    this.selectedId = snapshot.selectedId;
    this.itemsJson = snapshot.itemsJson;
    this.heading = snapshot.heading;
    this.fixedBreakpoint = snapshot.fixedBreakpoint;
    this.sidebarId = snapshot.sidebarId;
    this.presentation = snapshot.presentation;
  }

  readShellProjection(): SidebarShellProjection {
    return {
      present: !this.hidden,
      sidebarId: this._resolveSidebarId(),
      stateScopeId: this._resolveStateScopeId(),
      selectedId: this.selectedId,
      heading: this.heading,
      fixedBreakpoint: this.fixedBreakpoint,
      itemsJson: this.itemsJson,
      presentation: this.presentation,
    };
  }

  override connectedCallback(): void {
    super.connectedCallback();

    this._storage = this._resolveStorage();
    this._reloadItemsFromItemsJson();
    this._restorePersistedExpandedIds();
    this._initializePresentationStore();
    this._connectPresentationStore();
    this._reflectModeAttribute();
    this._syncStickyFooterBoundary();
  }

  override disconnectedCallback(): void {
    this._storeCleanup?.();
    this._storeCleanup = null;
    this._detachStickyFooterBoundary?.();
    this._detachStickyFooterBoundary = null;
    super.disconnectedCallback();
  }

  protected override willUpdate(changedProperties: Map<string, unknown>): void {
    if (!this.hasUpdated || changedProperties.has('itemsJson')) {
      this._reloadItemsFromItemsJson();
    }

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

  private _reloadItemsFromItemsJson(): void {
    this._items = this._parseItemsJson(this.itemsJson);
  }

  private _restorePersistedExpandedIds(): void {
    const persistedState = readLayoutSidebarTreeState(this._storage, {
      sidebarId: this._resolveSidebarId(),
      stateScopeId: this._resolveStateScopeId(),
    });
    const nextExpandedIds = new Set(persistedState?.expandedIds ?? []);
    this._setPersistedExpandedIds(nextExpandedIds);
  }

  private _parseItemsJson(value: string): TreeNode[] {
    const normalized = value.trim();
    if (normalized.length === 0) {
      return [];
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

  private _onSidebarRequestClose = (
    _event: CustomEvent<UiSidebarRequestCloseEventDetail>,
  ): void => {
    layoutSidebarController.close(this._resolveSidebarId());
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
      {
        sidebarId: this._resolveSidebarId(),
        stateScopeId: this._resolveStateScopeId(),
      },
    );
  };

  private _onSidebarSelect = (): void => {
    if (this._sidebarSnapshot.mode !== 'overlay') {
      return;
    }

    layoutSidebarController.close(this._resolveSidebarId());
  };

  override render() {
    return html`
      <ui-sidebar
        id="layout-sidebar-panel"
        data-state=${this._sidebarSnapshot.state}
        mode=${this._sidebarSnapshot.mode}
        .state=${this._sidebarSnapshot.state}
        .mode=${this._sidebarSnapshot.mode}
        .items=${this._items}
        .selectedId=${this.selectedId}
        .expandedIds=${new Set(
          mergeLayoutSidebarTreeState(
            this._items,
            normalizeExpandedIds(this._persistedExpandedIds),
            this.selectedId,
          ),
        )}
        .heading=${this.heading}
        .returnFocusTarget=${this._sidebarSnapshot.returnFocusTarget}
        @ui-sidebar-request-close=${this._onSidebarRequestClose}
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
