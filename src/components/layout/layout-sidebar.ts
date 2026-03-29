import { css, html, LitElement } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import '../ui/icon/icon';
import '../ui/sidebar/sidebar';
import type { TreeNode } from '../ui/file-tree/file-tree';
import type { UiSidebar, UiSidebarToggleDetail } from '../ui/sidebar/sidebar';
import type { UiSidebarStateChangeDetail } from '../ui/sidebar-shell/sidebar-shell';
import type { IconName } from '../../icons/catalog.js';
import { isIconName } from '../../icons/catalog.js';
import { attachStickyFooterBoundary } from '../../lib/layout/sticky-footer-boundary.js';
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
      block-size: 100%;
      min-block-size: 0;
    }

    .floating-toggle {
      position: fixed;
      left: var(--space-4, 16px);
      bottom: var(--space-4, 16px);
      z-index: var(--z-popover, 400);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      inline-size: 48px;
      block-size: 48px;
      border: var(--border-width, 1px) solid var(--border-default);
      border-radius: var(--radius-full, 9999px);
      background: var(--bg-surface-2);
      color: var(--fg-default);
      box-shadow: var(--shadow-md);
      cursor: pointer;
    }

    .floating-toggle ui-icon {
      font-size: 18px;
    }

    @media (min-width: 768px) {
      .floating-toggle {
        display: none;
      }
    }

    @media (forced-colors: active) {
      .floating-toggle {
        border-color: CanvasText;
        background: Canvas;
        color: CanvasText;
      }
    }

    @media print {
      .floating-toggle {
        display: none !important;
      }
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
  fixedBreakpoint = 768;

  @state()
  private _items: TreeNode[] = [];

  @state()
  private _state: 'expanded' | 'collapsed' = 'collapsed';

  @query('ui-sidebar')
  private _sidebarElement!: UiSidebar | null;

  private _storage: Storage | null = null;

  private _persistedExpandedIds = new Set<string>();

  private _detachStickyFooterBoundary: (() => void) | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this._storage = this._resolveStorage();
    this._state = this._resolveInitialState();
    this._loadItemsFromSource();
    window.addEventListener(
      'layout-sidebar-toggle-request',
      this._onToggleRequest as EventListener,
    );
    const stickyTarget = this.parentElement instanceof HTMLElement ? this.parentElement : this;
    this._detachStickyFooterBoundary = attachStickyFooterBoundary(stickyTarget);
  }

  override disconnectedCallback(): void {
    window.removeEventListener(
      'layout-sidebar-toggle-request',
      this._onToggleRequest as EventListener,
    );
    this._detachStickyFooterBoundary?.();
    this._detachStickyFooterBoundary = null;
    super.disconnectedCallback();
  }

  protected override willUpdate(changedProperties: Map<string, unknown>): void {
    if (!this.hasUpdated || changedProperties.has('fixedBreakpoint')) {
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
    if (typeof window === 'undefined') {
      return this._state;
    }

    const mediaQuery = `(min-width: ${String(this.fixedBreakpoint)}px)`;

    return window.matchMedia(mediaQuery).matches ? 'expanded' : 'collapsed';
  }

  private _onToggleButtonClick = (event: Event): void => {
    const trigger = event.currentTarget;
    this._sidebarElement?.toggle(trigger instanceof HTMLElement ? trigger : undefined);
  };

  private _onToggleRequest = (event: Event): void => {
    if (!(event instanceof CustomEvent)) {
      return;
    }
    const detail: unknown = event.detail;
    const trigger =
      isRecord(detail) && detail['trigger'] instanceof HTMLElement ? detail['trigger'] : undefined;
    this._sidebarElement?.toggle(trigger);
  };

  private _onSidebarStateChange = (event: CustomEvent<UiSidebarStateChangeDetail>): void => {
    this._state = event.detail.state;
  };

  private _onSidebarToggle = (event: CustomEvent<UiSidebarToggleDetail>): void => {
    const { id, expanded } = event.detail;
    if (expanded) {
      this._persistedExpandedIds.add(id);
    } else {
      this._persistedExpandedIds.delete(id);
    }

    writeLayoutSidebarTreeState(this._storage, {
      expandedIds: [...this._persistedExpandedIds],
    }, this.selectedId);
  };

  private _onSidebarSelect = (): void => {
    if (this._sidebarElement?.mode === 'overlay') {
      this._sidebarElement.collapse();
    }
  };

  override render() {
    const isExpanded = this._state === 'expanded';
    const mergedExpandedIds = mergeLayoutSidebarTreeState(
      this._items,
      [...this._persistedExpandedIds],
      this.selectedId,
    );

    return html`
      <ui-sidebar
        id="layout-sidebar-panel"
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

      <button
        class="floating-toggle"
        type="button"
        aria-controls="layout-sidebar-panel"
        aria-expanded=${String(isExpanded)}
        aria-label="サイドバーを開閉"
        @click=${this._onToggleButtonClick}
      >
        <ui-icon name="panel-left"></ui-icon>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'layout-sidebar': LayoutSidebar;
  }
}
