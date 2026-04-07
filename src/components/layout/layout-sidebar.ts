import { css, html, LitElement } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import '../ui/icon/icon.js';
import '../ui/sidebar/sidebar.js';
import type { TreeNode } from '../ui/file-tree/file-tree.js';
import type { UiSidebar, UiSidebarToggleDetail } from '../ui/sidebar/sidebar.js';
import type { IconName } from '../../../shared/icons/icons-catalog.js';
import { isIconName } from '../../../shared/icons/icons-catalog.js';
import { attachStickyFooterBoundary } from '../../layout/sticky-footer-boundary.js';
import { NOTE_SIDEBAR_FIXED_BREAKPOINT } from '../../layout/note-sidebar-breakpoint.js';
import {
  LAYOUT_SIDEBAR_STATE_CHANGE_EVENT,
  LAYOUT_SIDEBAR_TOGGLE_REQUEST_EVENT,
  LAYOUT_SIDEBAR_TREE_STATE_CHANGE_EVENT,
  type LayoutSidebarStateChangeDetail,
  type LayoutSidebarTreeStateChangeDetail,
} from './layout-sidebar.events.js';
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

    :host([presentation='overlay']) {
      block-size: 0;
    }

    ui-sidebar {
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

  @state()
  private _items: TreeNode[] = [];

  @state()
  private _state: 'expanded' | 'collapsed' = 'collapsed';

  @query('ui-sidebar')
  private _sidebarElement!: UiSidebar | null;

  private _storage: Storage | null = null;

  private _persistedExpandedIds = new Set<string>();

  private _detachStickyFooterBoundary: (() => void) | null = null;

  private _hydrationActivated = false;

  private _ssrRootReset = false;

  override connectedCallback(): void {
    super.connectedCallback();

    this._storage = this._resolveStorage();
    this._state = this._resolveInitialState();
    this._loadItemsFromSource();
    window.addEventListener(
      LAYOUT_SIDEBAR_TOGGLE_REQUEST_EVENT,
      this._onToggleRequest as EventListener,
    );

    if (!this.hasAttribute('data-hydration-trigger')) {
      this.activateHydration();
    }
  }

  protected override performUpdate(): void {
    this._resetSsrShadowRootIfNeeded();
    super.performUpdate();
  }

  override disconnectedCallback(): void {
    window.removeEventListener(
      LAYOUT_SIDEBAR_TOGGLE_REQUEST_EVENT,
      this._onToggleRequest as EventListener,
    );
    window.removeEventListener(
      LAYOUT_SIDEBAR_TREE_STATE_CHANGE_EVENT,
      this._onTreeStateSync as EventListener,
    );
    this._detachStickyFooterBoundary?.();
    this._detachStickyFooterBoundary = null;
    super.disconnectedCallback();
  }

  protected override willUpdate(changedProperties: Map<string, unknown>): void {
    if (
      !this.hasUpdated ||
      changedProperties.has('fixedBreakpoint') ||
      changedProperties.has('presentation')
    ) {
      this._state = this._resolveInitialState();
    }

    if (
      !this.hasUpdated ||
      changedProperties.has('sourceId') ||
      changedProperties.has('itemsJson') ||
      changedProperties.has('selectedId')
    ) {
      this._loadItemsFromSource();
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
    this._state = this._resolveInitialState();
    this._loadItemsFromSource();

    if (this.presentation !== 'overlay') {
      const stickyTarget = this.parentElement instanceof HTMLElement ? this.parentElement : this;
      this._detachStickyFooterBoundary = attachStickyFooterBoundary(stickyTarget, {
        minWidth: 640,
      });
    }

    this.requestUpdate();
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

  private _loadItemsFromSource(): void {
    this._persistedExpandedIds = new Set(
      readLayoutSidebarTreeState(this._storage, this.selectedId).expandedIds,
    );

    const inlineItems = this._parseItemsJson(this.itemsJson);
    if (inlineItems !== null) {
      this._items = inlineItems;
      return;
    }

    if (this.sourceId.length === 0) {
      this._items = [];
      return;
    }

    const source = document.getElementById(this.sourceId);
    if (!(source instanceof HTMLScriptElement)) {
      this._items = [];
      return;
    }

    try {
      const parsed: unknown = JSON.parse(source.textContent || '[]');
      if (!Array.isArray(parsed)) {
        this._items = [];
        return;
      }
      const items = parsed
        .map((item) => toTreeNode(item))
        .filter((item): item is TreeNode => item !== null);
      this._items = items;
    } catch {
      this._items = [];
    }
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

  private _resolveInitialState(): 'expanded' | 'collapsed' {
    if (this.presentation === 'fixed') {
      return 'expanded';
    }

    if (this.presentation === 'overlay') {
      return 'collapsed';
    }

    if (typeof window === 'undefined') {
      return this._state;
    }

    const mediaQuery = `(min-width: ${String(this.fixedBreakpoint)}px)`;

    return window.matchMedia(mediaQuery).matches ? 'expanded' : 'collapsed';
  }

  private _isOverlayMode(): boolean {
    if (this.presentation === 'overlay') {
      return true;
    }

    if (this.presentation === 'fixed') {
      return false;
    }

    return this._sidebarElement?.mode === 'overlay';
  }

  private _dispatchOverlayStateChange(detail: LayoutSidebarStateChangeDetail): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.dispatchEvent(
      new CustomEvent<LayoutSidebarStateChangeDetail>(LAYOUT_SIDEBAR_STATE_CHANGE_EVENT, {
        detail,
      }),
    );
  }

  private _dispatchTreeStateChange(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.dispatchEvent(
      new CustomEvent<LayoutSidebarTreeStateChangeDetail>(LAYOUT_SIDEBAR_TREE_STATE_CHANGE_EVENT, {
        detail: {
          selectedId: this.selectedId,
          expandedIds: normalizeExpandedIds(this._persistedExpandedIds),
        },
      }),
    );
  }

  private _onToggleRequest = (event: Event): void => {
    if (!(event instanceof CustomEvent)) {
      return;
    }

    if (!this._isOverlayMode()) {
      return;
    }

    const detail = isRecord(event.detail) ? event.detail : null;
    const trigger = detail?.['trigger'] instanceof HTMLElement ? detail['trigger'] : undefined;
    this._sidebarElement?.toggle(trigger);
  };

  private _onSidebarStateChange = (event: CustomEvent<LayoutSidebarStateChangeDetail>): void => {
    this._state = event.detail.state;

    if (!this._isOverlayMode()) {
      return;
    }

    this._dispatchOverlayStateChange(event.detail);
  };

  private _onSidebarToggle = (event: CustomEvent<UiSidebarToggleDetail>): void => {
    const { id, expanded } = event.detail;
    if (expanded) {
      this._persistedExpandedIds.add(id);
    } else {
      this._persistedExpandedIds.delete(id);
    }

    writeLayoutSidebarTreeState(
      this._storage,
      {
        expandedIds: [...this._persistedExpandedIds],
      },
      this.selectedId,
    );

    this._dispatchTreeStateChange();
  };

  private _onTreeStateSync = (event: Event): void => {
    if (!(event instanceof CustomEvent)) {
      return;
    }

    const detail = event.detail as LayoutSidebarTreeStateChangeDetail;
    if (detail.selectedId !== this.selectedId) {
      return;
    }

    if (sameExpandedIds(this._persistedExpandedIds, detail.expandedIds)) {
      return;
    }

    this._persistedExpandedIds = new Set(detail.expandedIds);
    this.requestUpdate();
  };

  private _onSidebarSelect = (): void => {
    if (this._isOverlayMode()) {
      this._sidebarElement?.collapse();
    }
  };

  override render() {
    const mergedExpandedIds = mergeLayoutSidebarTreeState(
      this._items,
      [...this._persistedExpandedIds],
      this.selectedId,
    );
    const explicitMode = this.presentation === 'auto' ? undefined : this.presentation;

    return html`
      <ui-sidebar
        id="layout-sidebar-panel"
        data-state=${this._state}
        mode=${ifDefined(explicitMode)}
        .state=${this._state}
        .items=${this._items}
        .selectedId=${this.selectedId}
        .expandedIds=${new Set(mergedExpandedIds)}
        .heading=${this.heading}
        .fixedBreakpoint=${this.fixedBreakpoint}
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
