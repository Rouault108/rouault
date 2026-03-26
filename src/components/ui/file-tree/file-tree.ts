import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../tree-item/tree-item';
import type { IconName } from '../../../icons/catalog.js';

export type TreeIcon = IconName;

export type TreeItemDensity = 'normal' | 'compact';
export type FileTreeVariant = 'default' | 'card';
export type FileTreeLoadingStrategy = 'retain' | 'replace';

interface TreeNodeBase {
  id: string;
  label: string;
  icon?: TreeIcon;
}

export interface BranchNode extends TreeNodeBase {
  kind: 'branch';
  children: readonly TreeNode[];
  href?: never;
}

export interface LeafNode extends TreeNodeBase {
  kind: 'leaf';
  href: string;
  children?: never;
}

export type TreeNode = BranchNode | LeafNode;

interface FlattenedTreeNode {
  node: TreeNode;
  depth: number;
}

interface IndexedTreeNode {
  node: TreeNode;
  parentId: string | null;
}

const DEFAULT_ARIA_LABEL = 'ファイルツリー';
const FILE_TREE_VARIANTS = new Set<FileTreeVariant>(['default', 'card']);
const FILE_TREE_DENSITIES = new Set<TreeItemDensity>(['normal', 'compact']);
const FILE_TREE_LOADING_STRATEGIES = new Set<FileTreeLoadingStrategy>(['retain', 'replace']);

const selectedIdConverter = {
  fromAttribute(value: string | null): string | null {
    if (value === null) {
      return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  },
};

const isBranchNode = (node: TreeNode): node is BranchNode => node.kind === 'branch';
const isLeafNode = (node: TreeNode): node is LeafNode => node.kind === 'leaf';

const cloneSet = (value: ReadonlySet<string>): Set<string> => new Set(value);

const setsAreEqual = (first: ReadonlySet<string>, second: ReadonlySet<string>): boolean => {
  if (first.size !== second.size) {
    return false;
  }

  for (const value of first) {
    if (!second.has(value)) {
      return false;
    }
  }

  return true;
};

const toValidEnum = <T extends string>(
  value: T,
  validValues: ReadonlySet<T>,
  fallback: T,
  propertyName: string,
): T => {
  if (validValues.has(value)) {
    return value;
  }

  console.warn(
    `[ui-file-tree] "${propertyName}" には ${[...validValues].join(', ')} のみ指定できます: ${value}`,
  );
  return fallback;
};

const toBranchIds = (value: ReadonlySet<string>, index: ReadonlyMap<string, IndexedTreeNode>): Set<string> => {
  const result = new Set<string>();

  for (const id of value) {
    const indexedNode = index.get(id);
    if (!indexedNode) {
      continue;
    }

    if (!isBranchNode(indexedNode.node)) {
      console.warn(`[ui-file-tree] branch ではない id は expanded 集合に含められません: ${id}`);
      continue;
    }

    result.add(id);
  }

  return result;
};

const collectAncestorBranchIds = (
  selectedId: string | null,
  index: ReadonlyMap<string, IndexedTreeNode>,
): Set<string> => {
  const result = new Set<string>();
  if (selectedId === null) {
    return result;
  }

  let currentParentId = index.get(selectedId)?.parentId ?? null;
  while (currentParentId !== null) {
    const indexedNode = index.get(currentParentId);
    if (!indexedNode || !isBranchNode(indexedNode.node)) {
      break;
    }

    result.add(currentParentId);
    currentParentId = indexedNode.parentId;
  }

  return result;
};

const flattenVisibleNodes = (
  nodes: readonly TreeNode[],
  expandedIds: ReadonlySet<string>,
  depth = 0,
): FlattenedTreeNode[] => {
  const result: FlattenedTreeNode[] = [];

  for (const node of nodes) {
    result.push({ node, depth });

    if (isBranchNode(node) && expandedIds.has(node.id)) {
      result.push(...flattenVisibleNodes(node.children, expandedIds, depth + 1));
    }
  }

  return result;
};

const buildNodeIndex = (
  nodes: readonly TreeNode[],
  parentId: string | null = null,
  index = new Map<string, IndexedTreeNode>(),
): Map<string, IndexedTreeNode> => {
  for (const node of nodes) {
    if (index.has(node.id)) {
      console.warn(`[ui-file-tree] id が重複しています: ${node.id}`);
      continue;
    }

    index.set(node.id, { node, parentId });

    if (isBranchNode(node)) {
      buildNodeIndex(node.children, node.id, index);
    }
  }

  return index;
};

const validateNodes = (nodes: readonly TreeNode[]): void => {
  const validate = (node: TreeNode): void => {
    if (node.id.trim().length === 0) {
      console.warn('[ui-file-tree] 空文字の id は使用できません');
    }

    if (node.label.trim().length === 0) {
      console.warn(`[ui-file-tree] 空文字の label は使用できません: ${node.id}`);
    }

    if (isBranchNode(node)) {
      if (node.children.length === 0) {
        console.warn(`[ui-file-tree] branch は 1 件以上の children を持つ必要があります: ${node.id}`);
      }

      for (const child of node.children) {
        validate(child);
      }
      return;
    }

    if (node.href.trim().length === 0) {
      console.warn(`[ui-file-tree] leaf は href を持つ必要があります: ${node.id}`);
    }
  };

  for (const node of nodes) {
    validate(node);
  }
};

@customElement('ui-file-tree')
export class FileTree extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: var(--font-sans);
      font-size: var(--text-sm, 13px);
      color: var(--fg-muted, oklch(48% 0 0));
      user-select: none;
    }

    .container {
      background: transparent;
      border: none;
      padding: var(--space-2, 8px) 0;
      transition:
        background-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        border-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    :host([variant='card']) .container {
      background: var(--bg-surface-2, oklch(98% 0 0));
      border: var(--border-width, 1px) solid var(--border-default, oklch(0% 0 0 / 0.12));
      border-radius: var(--radius-md, 6px);
      padding: var(--space-4, 16px);
      box-shadow: var(--elevation-md, 0 2px 4px oklch(0% 0 0 / 0.08));
    }

    @media (prefers-color-scheme: dark) {
      :host([variant='card']) .container {
        box-shadow:
          var(--elevation-md, 0 2px 4px oklch(0% 0 0 / 0.3)),
          inset 0 1px 0 0 oklch(100% 0 0 / 0.1);
      }
    }

    .empty-state {
      text-align: center;
      color: var(--fg-subtle, oklch(62% 0 0));
      font-size: var(--text-sm, 13px);
      font-weight: var(--font-normal, 400);
      padding: var(--space-8, 32px) var(--space-4, 16px);
    }

    .skeleton {
      display: flex;
      flex-direction: column;
      gap: var(--space-2, 8px);
      padding: var(--space-2, 8px) 0;
    }

    .skeleton-item {
      height: var(--control-height-md, 32px);
      background: var(--skeleton-bg, var(--bg-fill-neutral, oklch(0% 0 0 / 0.05)));
      border-radius: var(--radius-sm, 4px);
      animation: shimmer 1.5s infinite;
    }

    @keyframes shimmer {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .container {
        transition-duration: 0.01ms;
      }

      .skeleton-item {
        animation: none;
      }
    }

    @media (forced-colors: active) {
      :host([variant='card']) .container {
        background-color: Canvas;
        border-color: CanvasText;
        box-shadow: none;
      }
    }

    @media print {
      :host {
        display: none !important;
      }

      :host([printable]) {
        display: block !important;
      }

      :host([printable]) .container {
        box-shadow: none !important;
        background: transparent !important;
        border-color: #000 !important;
      }
    }
  `;

  @property({ attribute: false })
  items: readonly TreeNode[] = [];

  @property({ attribute: 'selected-id', converter: selectedIdConverter })
  selectedId: string | null = null;

  @property({ attribute: false })
  expandedIds?: ReadonlySet<string>;

  @property({ attribute: false })
  defaultExpandedIds: ReadonlySet<string> = new Set();

  @property({ type: String, reflect: true })
  variant: FileTreeVariant = 'default';

  @property({ type: String, reflect: true })
  density: TreeItemDensity = 'normal';

  @property({ type: Boolean, reflect: true })
  loading = false;

  @property({ type: String, reflect: true, attribute: 'loading-strategy' })
  loadingStrategy: FileTreeLoadingStrategy = 'retain';

  @property({ type: Boolean, reflect: true })
  printable = false;

  @state()
  private _activeId: string | null = null;

  @state()
  private _uncontrolledExpandedIds = new Set<string>();

  @state()
  private _flattenedNodes: FlattenedTreeNode[] = [];

  private _nodeIndex = new Map<string, IndexedTreeNode>();
  private _typeAheadBuffer = '';
  private _typeAheadTimer: number | null = null;
  private _didScrollSelectedIntoView = false;
  private _lastExternalFocusTarget: HTMLElement | null = null;
  private _printExpanding = false;

  get activeId(): string | null {
    return this._activeId;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'tree');
    this.setAttribute('aria-orientation', 'vertical');

    if (!this.hasAttribute('aria-label') && !this.hasAttribute('aria-labelledby')) {
      this.setAttribute('aria-label', DEFAULT_ARIA_LABEL);
    }

    this.addEventListener('focusin', this._handleFocusIn as EventListener);
    window.addEventListener('beforeprint', this._handleBeforePrint);
    window.addEventListener('afterprint', this._handleAfterPrint);
  }

  override disconnectedCallback(): void {
    this._clearTypeAheadTimer();
    this.removeEventListener('focusin', this._handleFocusIn as EventListener);
    window.removeEventListener('beforeprint', this._handleBeforePrint);
    window.removeEventListener('afterprint', this._handleAfterPrint);
    super.disconnectedCallback();
  }

  override willUpdate(changedProperties: PropertyValues<this>): void {
    const nextVariant = toValidEnum(this.variant, FILE_TREE_VARIANTS, 'default', 'variant');
    if (nextVariant !== this.variant) {
      this.variant = nextVariant;
    }

    const nextDensity = toValidEnum(this.density, FILE_TREE_DENSITIES, 'normal', 'density');
    if (nextDensity !== this.density) {
      this.density = nextDensity;
    }

    const nextLoadingStrategy = toValidEnum(
      this.loadingStrategy,
      FILE_TREE_LOADING_STRATEGIES,
      'retain',
      'loadingStrategy',
    );
    if (nextLoadingStrategy !== this.loadingStrategy) {
      this.loadingStrategy = nextLoadingStrategy;
    }

    if (
      changedProperties.has('items') ||
      changedProperties.has('selectedId') ||
      changedProperties.has('expandedIds') ||
      changedProperties.has('defaultExpandedIds')
    ) {
      validateNodes(this.items);
      this._nodeIndex = buildNodeIndex(this.items);
      this._syncUncontrolledExpandedIds(changedProperties);
      this._flattenedNodes = flattenVisibleNodes(this.items, this._effectiveExpandedIds);
      this._syncActiveId();
      this._didScrollSelectedIntoView = false;
    }
  }

  override updated(changedProperties: PropertyValues<this>): void {
    this.setAttribute('aria-busy', String(this.loading));

    if (
      !this.loading &&
      !this._didScrollSelectedIntoView &&
      (changedProperties.has('items') || changedProperties.has('selectedId'))
    ) {
      this._scrollSelectedIntoView();
      this._didScrollSelectedIntoView = true;
    }
  }

  override focus(options?: FocusOptions): void {
    const targetId = this._activeId ?? this._selectedLeafId ?? this._flattenedNodes[0]?.node.id ?? null;
    if (targetId === null) {
      return;
    }

    this._focusItem(targetId, options);
  }

  focusSelected(): void {
    const targetId = this._selectedLeafId ?? this._flattenedNodes[0]?.node.id ?? null;
    if (targetId === null) {
      return;
    }

    this._setActiveId(targetId, false);
    this._focusItem(targetId);
    this._scrollItemIntoView(targetId);
  }

  focusFirst(): void {
    const targetId = this._flattenedNodes[0]?.node.id ?? null;
    if (targetId === null) {
      return;
    }

    this._setActiveId(targetId, false);
    this._focusItem(targetId);
    this._scrollItemIntoView(targetId);
  }

  private get _isControlledExpanded(): boolean {
    return this.expandedIds !== undefined;
  }

  private get _selectedLeafId(): string | null {
    if (this.selectedId === null) {
      return null;
    }

    const indexedNode = this._nodeIndex.get(this.selectedId);
    if (!indexedNode || !isLeafNode(indexedNode.node)) {
      return null;
    }

    return indexedNode.node.id;
  }

  private get _baseExpandedIds(): ReadonlySet<string> {
    if (this._isControlledExpanded) {
      return toBranchIds(this.expandedIds ?? new Set(), this._nodeIndex);
    }

    return toBranchIds(this._uncontrolledExpandedIds, this._nodeIndex);
  }

  private get _effectiveExpandedIds(): ReadonlySet<string> {
    const result = cloneSet(this._baseExpandedIds);

    for (const id of collectAncestorBranchIds(this._selectedLeafId, this._nodeIndex)) {
      result.add(id);
    }

    if (this._printExpanding) {
      for (const [id, indexedNode] of this._nodeIndex) {
        if (isBranchNode(indexedNode.node)) {
          result.add(id);
        }
      }
    }

    return result;
  }

  private _syncUncontrolledExpandedIds(changedProperties: PropertyValues<this>): void {
    if (this._isControlledExpanded) {
      return;
    }

    if (!this.hasUpdated || changedProperties.has('defaultExpandedIds') || changedProperties.has('items')) {
      const nextExpandedIds = toBranchIds(this.defaultExpandedIds, this._nodeIndex);
      if (!setsAreEqual(this._uncontrolledExpandedIds, nextExpandedIds)) {
        this._uncontrolledExpandedIds = nextExpandedIds;
      }
    }
  }

  private _syncActiveId(): void {
    const activeId = this._activeId;
    if (activeId !== null && this._flattenedNodes.some((item) => item.node.id === activeId)) {
      return;
    }

    this._activeId = this._selectedLeafId ?? this._flattenedNodes[0]?.node.id ?? null;
  }

  private _setActiveId(id: string, emitEvent: boolean): void {
    if (this._activeId === id) {
      return;
    }

    this._activeId = id;
    if (!emitEvent) {
      return;
    }

    this.dispatchEvent(
      new CustomEvent<{ id: string }>('ui-tree-active-change', {
        detail: { id },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _handleFocusIn = (event: FocusEvent): void => {
    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof HTMLElement && !this.contains(relatedTarget)) {
      this._lastExternalFocusTarget = relatedTarget;
    }
  };

  private _handleBeforePrint = (): void => {
    if (!this.printable) {
      return;
    }

    this._printExpanding = true;
    this._flattenedNodes = flattenVisibleNodes(this.items, this._effectiveExpandedIds);
  };

  private _handleAfterPrint = (): void => {
    if (!this._printExpanding) {
      return;
    }

    this._printExpanding = false;
    this._flattenedNodes = flattenVisibleNodes(this.items, this._effectiveExpandedIds);
  };

  private _handleKeyDown = (event: KeyboardEvent): void => {
    if (this._flattenedNodes.length === 0 || this._activeId === null) {
      return;
    }

    const currentIndex = this._flattenedNodes.findIndex((item) => item.node.id === this._activeId);
    if (currentIndex === -1) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this._moveFocusByIndex(currentIndex + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this._moveFocusByIndex(currentIndex - 1);
        break;
      case 'Home':
        event.preventDefault();
        this._moveFocusByIndex(0);
        break;
      case 'End':
        event.preventDefault();
        this._moveFocusByIndex(this._flattenedNodes.length - 1);
        break;
      case 'Escape':
        event.preventDefault();
        this._restoreExternalFocus();
        break;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          this._handleTypeAhead(event.key);
        }
        break;
    }
  };

  private _moveFocusByIndex(targetIndex: number): void {
    if (targetIndex < 0 || targetIndex >= this._flattenedNodes.length) {
      return;
    }

    const target = this._flattenedNodes[targetIndex];
    if (!target) {
      return;
    }

    this._setActiveId(target.node.id, true);
    this._focusItem(target.node.id);
    this._scrollItemIntoView(target.node.id);
  }

  private _handleTypeAhead(key: string): void {
    this._typeAheadBuffer += key.toLowerCase();

    this._clearTypeAheadTimer();
    this._typeAheadTimer = window.setTimeout(() => {
      this._typeAheadBuffer = '';
    }, 500);

    const currentIndex = this._flattenedNodes.findIndex((item) => item.node.id === this._activeId);
    const searchStartIndex = currentIndex + 1;

    for (let offset = 0; offset < this._flattenedNodes.length; offset += 1) {
      const index = (searchStartIndex + offset) % this._flattenedNodes.length;
      const candidate = this._flattenedNodes[index]?.node;
      if (!candidate) {
        continue;
      }

      if (candidate.label.toLowerCase().startsWith(this._typeAheadBuffer)) {
        this._moveFocusByIndex(index);
        return;
      }
    }
  }

  private _clearTypeAheadTimer(): void {
    if (this._typeAheadTimer === null) {
      return;
    }

    window.clearTimeout(this._typeAheadTimer);
    this._typeAheadTimer = null;
  }

  private _handleLeafSelect(event: CustomEvent, node: LeafNode): void {
    event.stopPropagation();

    this._setActiveId(node.id, true);

    const requestEvent = new CustomEvent<{ id: string }>('ui-tree-request-select', {
      detail: { id: node.id },
      bubbles: true,
      composed: true,
      cancelable: true,
    });

    if (!this.dispatchEvent(requestEvent)) {
      return;
    }

    this.dispatchEvent(
      new CustomEvent<{ id: string }>('ui-tree-select', {
        detail: { id: node.id },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _handleBranchToggle(event: CustomEvent<{ expanded: boolean }>, node: BranchNode): void {
    event.stopPropagation();

    const expanded = event.detail.expanded;
    const requestEvent = new CustomEvent<{ id: string; expanded: boolean }>(
      'ui-tree-request-toggle',
      {
        detail: { id: node.id, expanded },
        bubbles: true,
        composed: true,
        cancelable: true,
      },
    );

    if (!this.dispatchEvent(requestEvent)) {
      return;
    }

    if (!this._isControlledExpanded) {
      const nextExpandedIds = cloneSet(this._uncontrolledExpandedIds);
      if (expanded) {
        nextExpandedIds.add(node.id);
      } else {
        nextExpandedIds.delete(node.id);
      }
      this._uncontrolledExpandedIds = nextExpandedIds;
      this._flattenedNodes = flattenVisibleNodes(this.items, this._effectiveExpandedIds);
      this._syncActiveId();
    }

    this.dispatchEvent(
      new CustomEvent<{ id: string; expanded: boolean }>('ui-tree-toggle', {
        detail: { id: node.id, expanded },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _handleArrowRight = (event: CustomEvent): void => {
    event.stopPropagation();
    if (this._activeId === null) {
      return;
    }

    const currentIndex = this._flattenedNodes.findIndex((item) => item.node.id === this._activeId);
    if (currentIndex === -1) {
      return;
    }

    const currentItem = this._flattenedNodes[currentIndex];
    if (!currentItem || !isBranchNode(currentItem.node)) {
      return;
    }

    if (!this._effectiveExpandedIds.has(currentItem.node.id)) {
      return;
    }

    this._moveFocusByIndex(currentIndex + 1);
  }

  private _handleArrowLeft = (event: CustomEvent): void => {
    event.stopPropagation();
    if (this._activeId === null) {
      return;
    }

    const currentIndex = this._flattenedNodes.findIndex((item) => item.node.id === this._activeId);
    if (currentIndex === -1) {
      return;
    }

    const currentItem = this._flattenedNodes[currentIndex];
    if (!currentItem) {
      return;
    }

    for (let index = currentIndex - 1; index >= 0; index -= 1) {
      const parentItem = this._flattenedNodes[index];
      if (parentItem && parentItem.depth < currentItem.depth) {
        this._moveFocusByIndex(index);
        return;
      }
    }
  }

  private _focusItem(nodeId: string, options?: FocusOptions): void {
    const treeItem = this.shadowRoot?.querySelector<HTMLElement>(`ui-tree-item[data-id="${nodeId}"]`);
    treeItem?.focus(options);
  }

  private _scrollSelectedIntoView(): void {
    const selectedId = this._selectedLeafId;
    if (selectedId === null) {
      return;
    }

    this._scrollItemIntoView(selectedId, 'instant');
  }

  private _scrollItemIntoView(nodeId: string, behavior?: ScrollBehavior): void {
    const treeItem = this.shadowRoot?.querySelector<HTMLElement>(`ui-tree-item[data-id="${nodeId}"]`);
    if (!(treeItem instanceof HTMLElement)) {
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const resolvedBehavior = behavior ?? (prefersReducedMotion ? 'instant' : 'smooth');
    this._scrollElementWithinContainer(treeItem, resolvedBehavior);
  }

  private _scrollElementWithinContainer(element: HTMLElement, behavior: ScrollBehavior): void {
    const container = this._findScrollContainer(element);
    if (!container) {
      return;
    }

    if (element.getClientRects().length === 0 || container.getClientRects().length === 0) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    let nextScrollTop = container.scrollTop;
    if (elementRect.top < containerRect.top) {
      nextScrollTop -= Math.ceil(containerRect.top - elementRect.top);
    } else if (elementRect.bottom > containerRect.bottom) {
      nextScrollTop += Math.ceil(elementRect.bottom - containerRect.bottom);
    }

    if (nextScrollTop === container.scrollTop) {
      return;
    }

    container.scrollTo({
      top: nextScrollTop,
      behavior,
    });
  }

  private _findScrollContainer(start: HTMLElement): HTMLElement | null {
    let current: HTMLElement | null = start;

    for (;;) {
      const parent = this._getComposedParentElement(current);
      if (!parent) {
        return null;
      }

      const style = getComputedStyle(parent);
      const overflowY = style.overflowY || style.overflow;
      const isScrollable = ['auto', 'scroll', 'overlay'].includes(overflowY);
      if (isScrollable && parent.scrollHeight > parent.clientHeight) {
        return parent;
      }

      current = parent;
    }
  }

  private _getComposedParentElement(element: HTMLElement): HTMLElement | null {
    if (element.parentElement instanceof HTMLElement) {
      return element.parentElement;
    }

    const root = element.getRootNode();
    if (root instanceof ShadowRoot && root.host instanceof HTMLElement) {
      return root.host;
    }

    return null;
  }

  private _restoreExternalFocus(): void {
    if (this._lastExternalFocusTarget?.isConnected) {
      this._lastExternalFocusTarget.focus();
      return;
    }

    const activeElement = this.shadowRoot?.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  }

  private _renderTreeItems(nodes: readonly TreeNode[]): TemplateResult[] {
    return nodes.map((node) => {
      const isExpanded = isBranchNode(node) ? this._effectiveExpandedIds.has(node.id) : false;
      const isSelected = this._selectedLeafId === node.id;
      const tabindex = this._activeId === node.id ? 0 : -1;

      return html`
        <ui-tree-item
          data-id=${node.id}
          .label=${node.label}
          .icon=${node.icon ?? ''}
          .href=${isLeafNode(node) ? node.href : ''}
          ?expanded=${isExpanded}
          ?selected=${isSelected}
          ?print-mode=${this.printable && this._printExpanding}
          .tabIndex=${tabindex}
          .density=${this.density}
          @selected-change=${(event: CustomEvent) => {
            if (isLeafNode(node)) {
              this._handleLeafSelect(event, node);
            }
          }}
          @expanded-change=${(event: CustomEvent<{ expanded: boolean }>) => {
            if (isBranchNode(node)) {
              this._handleBranchToggle(event, node);
            }
          }}
          @tree-item-arrow-right=${this._handleArrowRight}
          @tree-item-arrow-left=${this._handleArrowLeft}
        >
          ${isBranchNode(node)
            ? html`<div slot="children">${this._renderTreeItems(node.children)}</div>`
            : nothing}
        </ui-tree-item>
      `;
    });
  }

  private _renderSkeleton(): TemplateResult {
    return html`
      <div class="skeleton" aria-hidden="true">
        ${Array.from({ length: 5 }, () => html`<div class="skeleton-item"></div>`)}
      </div>
    `;
  }

  private _renderEmptyState(): TemplateResult {
    return html`<div class="empty-state" role="status">項目がありません</div>`;
  }

  override render(): TemplateResult {
    const showSkeleton = this.loading && this.loadingStrategy === 'replace';
    const showEmpty = !this.loading && this.items.length === 0;

    return html`
      <div class="container" @keydown=${this._handleKeyDown}>
        ${showSkeleton
          ? this._renderSkeleton()
          : showEmpty
            ? this._renderEmptyState()
            : this._renderTreeItems(this.items)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-file-tree': FileTree;
  }
}
