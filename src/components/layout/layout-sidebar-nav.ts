import type { TreeNode } from '../../../shared/navigation/tree-node.js';

const NAV_SELECTOR = 'nav[data-sidebar-nav]';
const ITEM_SELECTOR = 'li[data-node-id]';
const TYPEAHEAD_RESET_MS = 1000;

interface LayoutSidebarNavItem {
  id: string;
  kind: 'branch' | 'leaf';
  label: string;
  row: HTMLLIElement;
  control: HTMLButtonElement | HTMLAnchorElement;
  parentId: string | null;
}

export interface LayoutSidebarNavSyncOptions {
  selectedId: string | null;
  expandedIds: ReadonlySet<string>;
  activeId: string | null;
}

export interface LayoutSidebarNavInteractionCallbacks {
  onToggle(id: string, expanded: boolean): void;
  onSelect(id: string): void;
  onActiveChange(id: string | null): void;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const renderDisclosureIcon = (): string =>
  [
    '<span data-sidebar-nav-disclosure aria-hidden="true">',
    '<svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">',
    '<path d="M6 3.5L10.5 8L6 12.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></path>',
    '</svg>',
    '</span>',
  ].join('');

const getItemId = (item: Element): string =>
  item.getAttribute('data-node-id')?.trim() ?? '';

const getItemKind = (item: Element): 'branch' | 'leaf' =>
  item.getAttribute('data-node-kind') === 'branch' ? 'branch' : 'leaf';

const getBranchGroup = (item: Element): HTMLUListElement | null =>
  item.querySelector(':scope > ul');

const getItemControl = (item: Element): HTMLButtonElement | HTMLAnchorElement | null => {
  const control = item.querySelector(':scope > button, :scope > a');
  if (control instanceof HTMLButtonElement || control instanceof HTMLAnchorElement) {
    return control;
  }

  return null;
};

const getParentItem = (item: Element): HTMLLIElement | null => {
  const parentList = item.parentElement;
  if (!(parentList instanceof HTMLUListElement)) {
    return null;
  }

  const parentItem = parentList.closest<HTMLLIElement>(ITEM_SELECTOR);
  return parentItem instanceof HTMLLIElement ? parentItem : null;
};

const getItemLabel = (item: Element): string => {
  const explicitLabel = item.querySelector(
    ':scope > button > [data-sidebar-nav-label], :scope > a > [data-sidebar-nav-label]',
  );

  if (explicitLabel instanceof HTMLElement) {
    return explicitLabel.textContent.trim();
  }

  return getItemControl(item)?.textContent.trim() ?? item.textContent.trim();
};

const isBranchVisible = (item: Element): boolean => {
  let current: Element | null = item;

  while (current) {
    if (current instanceof HTMLUListElement && current.hidden) {
      return false;
    }

    if (current.matches(NAV_SELECTOR)) {
      return true;
    }

    current = current.parentElement;
  }

  return true;
};

const toVisibleItems = (nav: HTMLElement): LayoutSidebarNavItem[] =>
  Array.from(nav.querySelectorAll<HTMLLIElement>(ITEM_SELECTOR))
    .filter((row) => isBranchVisible(row))
    .map((row) => {
      const control = getItemControl(row);
      if (!(control instanceof HTMLButtonElement || control instanceof HTMLAnchorElement)) {
        return null;
      }

      const parentItem = getParentItem(row);

      return {
        id: getItemId(row),
        kind: getItemKind(row),
        label: getItemLabel(row),
        row,
        control,
        parentId: parentItem ? getItemId(parentItem) : null,
      } satisfies LayoutSidebarNavItem;
    })
    .filter((item): item is LayoutSidebarNavItem => item !== null && item.id.length > 0);

const findVisibleItem = (nav: HTMLElement, id: string | null): LayoutSidebarNavItem | null => {
  if (typeof id !== 'string' || id.trim().length === 0) {
    return null;
  }

  return toVisibleItems(nav).find((item) => item.id === id) ?? null;
};

const resolveNextActiveId = (
  nav: HTMLElement,
  selectedId: string | null,
  requestedActiveId: string | null,
): string | null => {
  const visibleItems = toVisibleItems(nav);
  if (visibleItems.length === 0) {
    return null;
  }

  const normalizedRequested = requestedActiveId?.trim() ?? null;
  if (normalizedRequested) {
    const activeItem = visibleItems.find((item) => item.id === normalizedRequested);
    if (activeItem) {
      return activeItem.id;
    }
  }

  const normalizedSelected = selectedId?.trim() ?? null;
  if (normalizedSelected) {
    const selectedItem = visibleItems.find((item) => item.id === normalizedSelected);
    if (selectedItem) {
      return selectedItem.id;
    }
  }

  return visibleItems[0]?.id ?? null;
};

const setActiveControl = (nav: HTMLElement, activeId: string | null): void => {
  for (const row of nav.querySelectorAll<HTMLLIElement>(ITEM_SELECTOR)) {
    const control = getItemControl(row);
    if (!(control instanceof HTMLButtonElement || control instanceof HTMLAnchorElement)) {
      continue;
    }

    control.tabIndex = getItemId(row) === activeId ? 0 : -1;
  }
};

const renderFallbackRows = (
  nodes: readonly TreeNode[],
  options: {
    selectedId: string | null;
    expandedIds: ReadonlySet<string>;
    depth: number;
  },
): string => {
  return nodes
    .map((node) => {
      const baseAttributes = [
        `data-node-id="${escapeHtml(node.id)}"`,
        `data-node-kind="${node.kind}"`,
        `data-node-depth="${String(options.depth)}"`,
      ].join(' ');

      if (node.kind === 'leaf') {
        const currentAttribute = node.id === options.selectedId ? ' aria-current="page"' : '';
        return `<li ${baseAttributes}><a href="${escapeHtml(node.href)}"${currentAttribute}>${escapeHtml(node.label)}</a></li>`;
      }

      const expanded = options.expandedIds.has(node.id);
      const groupId = `sidebar-group-${node.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

      return [
        `<li ${baseAttributes}>`,
        `<button type="button" aria-expanded="${expanded ? 'true' : 'false'}" aria-controls="${escapeHtml(groupId)}">`,
        `<span data-sidebar-nav-label>${escapeHtml(node.label)}</span>`,
        renderDisclosureIcon(),
        `</button>`,
        `<ul id="${escapeHtml(groupId)}"${expanded ? '' : ' hidden'}>${renderFallbackRows(node.children, {
          ...options,
          depth: options.depth + 1,
        })}</ul>`,
        `</li>`,
      ].join('');
    })
    .join('');
};

export const renderLayoutSidebarFallbackNav = (
  nodes: readonly TreeNode[],
  options: {
    ariaLabel?: string;
    selectedId: string | null;
    expandedIds: ReadonlySet<string>;
    topologyRevision?: string | null;
  },
): string => {
  const ariaLabel = options.ariaLabel?.trim() ?? 'ノートナビゲーション';
  const revision = options.topologyRevision?.trim() ?? 'compat:items-json';
  return `<nav data-sidebar-nav aria-label="${escapeHtml(ariaLabel)}" data-topology-revision="${escapeHtml(revision)}"><ul>${renderFallbackRows(nodes, {
    selectedId: options.selectedId,
    expandedIds: options.expandedIds,
    depth: 0,
  })}</ul></nav>`;
};

export const findLayoutSidebarNav = (root: ParentNode): HTMLElement | null => {
  const nav = root.querySelector(NAV_SELECTOR);
  return nav instanceof HTMLElement ? nav : null;
};

export const syncLayoutSidebarNav = (
  nav: HTMLElement,
  options: LayoutSidebarNavSyncOptions,
): string | null => {
  const normalizedExpanded = options.expandedIds;

  for (const row of nav.querySelectorAll<HTMLLIElement>(ITEM_SELECTOR)) {
    const id = getItemId(row);
    const kind = getItemKind(row);
    const control = getItemControl(row);

    if (kind === 'leaf') {
      if (control instanceof HTMLAnchorElement) {
        if (id === options.selectedId) {
          control.setAttribute('aria-current', 'page');
        } else {
          control.removeAttribute('aria-current');
        }
      }
      continue;
    }

    const expanded = normalizedExpanded.has(id);
    if (control instanceof HTMLButtonElement) {
      control.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    }

    const group = getBranchGroup(row);
    if (group instanceof HTMLUListElement) {
      group.hidden = !expanded;
    }
  }

  const nextActiveId = resolveNextActiveId(nav, options.selectedId, options.activeId);
  setActiveControl(nav, nextActiveId);
  return nextActiveId;
};

export class LayoutSidebarNavInteractionController {
  private readonly _callbacks: LayoutSidebarNavInteractionCallbacks;

  private _nav: HTMLElement | null = null;
  private _typeaheadBuffer = '';
  private _typeaheadTimer: number | null = null;

  constructor(host: HTMLElement, callbacks: LayoutSidebarNavInteractionCallbacks) {
    void host;
    this._callbacks = callbacks;
  }

  connect(nav: HTMLElement | null): void {
    if (this._nav === nav) {
      return;
    }

    this.disconnect();
    this._nav = nav;

    if (!(nav instanceof HTMLElement)) {
      return;
    }

    nav.addEventListener('click', this._onClick);
    nav.addEventListener('keydown', this._onKeydown);
    nav.addEventListener('focusin', this._onFocusIn);
  }

  disconnect(): void {
    if (this._nav instanceof HTMLElement) {
      this._nav.removeEventListener('click', this._onClick);
      this._nav.removeEventListener('keydown', this._onKeydown);
      this._nav.removeEventListener('focusin', this._onFocusIn);
    }

    this._nav = null;
    this._clearTypeahead();
  }

  focusItem(id: string | null): void {
    const nav = this._nav;
    const item = nav ? findVisibleItem(nav, id) : null;
    item?.control.focus({ preventScroll: true });
  }

  private _onClick = (event: Event): void => {
    const nav = this._nav;
    if (!(nav instanceof HTMLElement)) {
      return;
    }

    const target = event.target instanceof Element ? event.target : null;
    const control = target?.closest('button, a');
    if (!(control instanceof HTMLButtonElement || control instanceof HTMLAnchorElement)) {
      return;
    }

    const row = control.closest<HTMLLIElement>(ITEM_SELECTOR);
    if (!(row instanceof HTMLLIElement)) {
      return;
    }

    const id = getItemId(row);
    if (id.length === 0) {
      return;
    }

    if (control instanceof HTMLButtonElement) {
      event.preventDefault();
      const expanded = control.getAttribute('aria-expanded') !== 'true';
      this._callbacks.onToggle(id, expanded);
      return;
    }

    this._callbacks.onSelect(id);
  };

  private _onFocusIn = (event: FocusEvent): void => {
    const target = event.target instanceof Element ? event.target : null;
    const row = target?.closest<HTMLLIElement>(ITEM_SELECTOR);
    if (!(row instanceof HTMLLIElement)) {
      return;
    }

    const id = getItemId(row);
    this._callbacks.onActiveChange(id.length > 0 ? id : null);
  };

  private _onKeydown = (event: KeyboardEvent): void => {
    const nav = this._nav;
    if (!(nav instanceof HTMLElement)) {
      return;
    }

    const target = event.target instanceof Element ? event.target : null;
    const row = target?.closest<HTMLLIElement>(ITEM_SELECTOR);
    if (!(row instanceof HTMLLIElement)) {
      return;
    }

    const visibleItems = toVisibleItems(nav);
    const currentId = getItemId(row);
    const currentIndex = visibleItems.findIndex((item) => item.id === currentId);
    const currentItem = currentIndex >= 0 ? visibleItems[currentIndex] : null;
    if (!currentItem) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this._focusByIndex(visibleItems, currentIndex + 1 >= visibleItems.length ? 0 : currentIndex + 1);
        return;

      case 'ArrowUp':
        event.preventDefault();
        this._focusByIndex(visibleItems, currentIndex - 1 < 0 ? visibleItems.length - 1 : currentIndex - 1);
        return;

      case 'Home':
        event.preventDefault();
        this._focusByIndex(visibleItems, 0);
        return;

      case 'End':
        event.preventDefault();
        this._focusByIndex(visibleItems, visibleItems.length - 1);
        return;

      case 'ArrowRight':
        event.preventDefault();
        this._handleArrowRight(visibleItems, currentItem);
        return;

      case 'ArrowLeft':
        event.preventDefault();
        this._handleArrowLeft(currentItem);
        return;

      case 'Enter':
        if (currentItem.control instanceof HTMLButtonElement) {
          event.preventDefault();
          currentItem.control.click();
        }
        return;

      case ' ':
        event.preventDefault();
        currentItem.control.click();
        return;

      default:
        if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
          this._handleTypeahead(visibleItems, currentIndex, event.key);
        }
    }
  };

  private _handleArrowRight(
    visibleItems: readonly LayoutSidebarNavItem[],
    currentItem: LayoutSidebarNavItem,
  ): void {
    if (currentItem.kind === 'leaf') {
      return;
    }

    const expanded = currentItem.control.getAttribute('aria-expanded') === 'true';
    if (!expanded) {
      this._callbacks.onToggle(currentItem.id, true);
      return;
    }

    const child = visibleItems.find((item) => item.parentId === currentItem.id);
    child?.control.focus({ preventScroll: true });
  }

  private _handleArrowLeft(currentItem: LayoutSidebarNavItem): void {
    if (currentItem.kind === 'branch') {
      const expanded = currentItem.control.getAttribute('aria-expanded') === 'true';
      if (expanded) {
        this._callbacks.onToggle(currentItem.id, false);
        return;
      }
    }

    if (currentItem.parentId) {
      this.focusItem(currentItem.parentId);
    }
  }

  private _handleTypeahead(
    visibleItems: readonly LayoutSidebarNavItem[],
    currentIndex: number,
    key: string,
  ): void {
    this._typeaheadBuffer += key.toLowerCase();
    this._resetTypeaheadTimer();

    const candidates = [...visibleItems.slice(currentIndex + 1), ...visibleItems.slice(0, currentIndex + 1)];
    const match = candidates.find((item) =>
      item.label.toLowerCase().startsWith(this._typeaheadBuffer),
    );

    match?.control.focus({ preventScroll: true });
  }

  private _focusByIndex(items: readonly LayoutSidebarNavItem[], index: number): void {
    items[index]?.control.focus({ preventScroll: true });
  }

  private _resetTypeaheadTimer(): void {
    this._clearTypeahead();
    this._typeaheadTimer = window.setTimeout(() => {
      this._typeaheadBuffer = '';
      this._typeaheadTimer = null;
    }, TYPEAHEAD_RESET_MS);
  }

  private _clearTypeahead(): void {
    this._typeaheadBuffer = '';
    if (this._typeaheadTimer !== null) {
      window.clearTimeout(this._typeaheadTimer);
      this._typeaheadTimer = null;
    }
  }
}